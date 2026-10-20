"""Websocket-API voor het beheerpaneel (HA-Family-Management) en de kaarten.

Lezen van het gezin mag iedereen die is ingelogd; alles wat iets verandert, alleen een beheerder van Home Assistant."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.network import NoURLAvailableError, get_url

from .const import ALLE_ROLLEN, DOMAIN
from .afdelingen import AFDELINGEN
from .agenda import AFVAL
from .maaltijden import LABELS
from .taken import VOORBEELDEN
from . import afvalbedrijf, ai, muur
from .gezin import FamilyFout, Gezin, wachtwoord_voorstel
from .weergave import WEERGAVEN


def _gezin(hass: HomeAssistant) -> Gezin:
    for entry in hass.config_entries.async_loaded_entries(DOMAIN):
        return entry.runtime_data
    raise FamilyFout("HA Family is nog niet ingesteld.")


def _antwoord(fn):
    """Fouten uit het gezinsmodel als nette melding terug naar het paneel."""
    async def wrap(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
        try:
            connection.send_result(msg["id"], await fn(hass, connection, msg))
        except FamilyFout as ex:
            connection.send_error(msg["id"], "ha_family_fout", str(ex))
    return wrap


@callback
def async_registreer(hass: HomeAssistant) -> None:
    for cmd in (ws_gezin, ws_status, ws_lid_toevoegen, ws_persoon_toevoegen, ws_lid_bijwerken, ws_lid_verwijderen,
                ws_wachtwoord, ws_test_melding, ws_voorstel, ws_huishouden, ws_account,
                ws_muur, ws_muur_aanmaken, ws_muur_bijwerken, ws_muur_verwijderen, ws_muur_wachtwoord,
                ws_eten, ws_recept, ws_recept_weg, ws_recept_import, ws_startpakket, ws_plan, ws_eten_boodschappen, ws_suggestie, ws_eten_instellingen,
                ws_huis, ws_kamer, ws_kamer_weg, ws_kamer_apparaat, ws_huis_instellingen, ws_apparaat_tonen, ws_kamer_samenvoegen,
                ws_ai_week, ws_ai_recept, ws_dagoverzicht, ws_ai_klusjes, ws_lid_dashboard, ws_cadeaus, ws_profiel, ws_wens, ws_wens_weg, ws_wens_kopen, ws_wensen_sturen, ws_cadeau_ideeen, ws_idee_bewaren, ws_idee_weg,
                ws_agenda, ws_afspraak, ws_afspraak_weg, ws_week_titel, ws_agenda_instellingen, ws_lid_agendas, ws_extra_agendas,
                ws_agenda_link, ws_verjaardag, ws_verjaardag_weg, ws_afval, ws_verjaardag_melding,
                ws_taken, ws_taak, ws_taak_klaar, ws_taak_weg, ws_taken_opruimen,
                ws_boodschap, ws_boodschap_bij, ws_boodschap_weg,
                ws_klusjes, ws_klusje, ws_klusje_weg, ws_klusje_gedaan, ws_goedkeuren, ws_punten_geven,
                ws_beloning, ws_beloning_weg, ws_inwisselen, ws_beloning_goedkeuren, ws_klusjes_instellingen):
        websocket_api.async_register_command(hass, cmd)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/gezin"})
@websocket_api.async_response
@_antwoord
async def ws_gezin(hass, connection, msg):
    g = _gezin(hass)
    ik = g.lid_van_user(connection.user.id)
    return {**g.openbaar(), "ik": ik["id"] if ik else None}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/status"})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_status(hass, connection, msg):
    g = _gezin(hass)
    adres = {}
    for soort, kwargs in (("extern", {"allow_internal": False, "prefer_external": True}), ("intern", {"allow_external": False})):
        try:
            adres[soort] = get_url(hass, **kwargs)
        except NoURLAvailableError:
            adres[soort] = None
    return {**await g.status(), "adres": adres, "ik": (g.lid_van_user(connection.user.id) or {}).get("id")}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/voorstel"})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_voorstel(hass, connection, msg):
    """Een voorleesbaar wachtwoord voor een nieuw gezinslid."""
    return {"wachtwoord": wachtwoord_voorstel()}


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/toevoegen",
    vol.Required("naam"): cv.string,
    vol.Required("rol"): vol.In(ALLE_ROLLEN),
    vol.Optional("kleur"): cv.string,
    vol.Optional("emoji"): cv.string,
    vol.Optional("inloggen", default=False): bool,
    vol.Optional("gebruikersnaam"): cv.string,
    vol.Optional("wachtwoord"): cv.string,
    vol.Optional("beheerder", default=False): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_toevoegen(hass, connection, msg):
    g = _gezin(hass)
    lid = await g.lid_toevoegen(msg["naam"], msg["rol"], msg.get("kleur"), msg.get("emoji"), msg["inloggen"],
                                msg.get("gebruikersnaam"), msg.get("wachtwoord"), msg["beheerder"])
    await g.weergave_zetten(lid)
    return lid


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/persoon",
    vol.Required("person"): cv.entity_domain("person"),
    vol.Required("rol"): vol.In(ALLE_ROLLEN),
    vol.Optional("kleur"): cv.string,
    vol.Optional("emoji"): cv.string,
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_persoon_toevoegen(hass, connection, msg):
    g = _gezin(hass)
    lid = g.persoon_toevoegen(msg["person"], msg["rol"], msg.get("kleur"), msg.get("emoji"))
    if g.user_id(lid):
        # wie al een account had, houdt zijn Home Assistant zoals hij het kent; een eenvoudiger weergave kies je zelf
        lid = g.lid_bijwerken(lid["id"], weergave="origineel")
    await g.weergave_zetten(lid)
    return lid


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/bijwerken",
    vol.Required("lid"): cv.string,
    vol.Optional("naam"): cv.string,
    vol.Optional("rol"): vol.In(ALLE_ROLLEN),
    vol.Optional("kleur"): cv.string,
    vol.Optional("emoji"): cv.string,
    vol.Optional("lamp"): vol.Any(None, cv.string),
    vol.Optional("notify"): vol.Any(None, cv.string),
    vol.Optional("weergave"): vol.In(WEERGAVEN),
    vol.Optional("geboortedatum"): vol.Any(None, cv.string),
    vol.Optional("geslacht"): vol.Any(None, cv.string),
    vol.Optional("interesses"): [cv.string],
    vol.Optional("apparaten"): {vol.Required("beperkt"): bool, vol.Optional("kamers"): {cv.string: vol.In(["", "z", "b"])},
                                 vol.Optional("uitzonderingen"): {cv.string: vol.In(["", "z", "b"])},
                                 vol.Optional("zien"): [cv.string], vol.Optional("bedienen"): [cv.string]},
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_bijwerken(hass, connection, msg):
    g = _gezin(hass)
    velden = {k: v for k, v in msg.items() if k not in ("type", "id", "lid")}
    lid = g.lid_bijwerken(msg["lid"], **velden)
    if "weergave" in velden or "rol" in velden:
        await g.weergave_zetten(lid)
    return lid


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/verwijderen",
    vol.Required("lid"): cv.string,
    vol.Optional("ook_account", default=False): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_verwijderen(hass, connection, msg):
    g = _gezin(hass)
    if msg["ook_account"] and g.user_id(g.lid(msg["lid"])) == connection.user.id:
        raise FamilyFout("Je kunt je eigen account hier niet verwijderen.")
    await g.lid_verwijderen(msg["lid"], msg["ook_account"])
    return {}


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/wachtwoord",
    vol.Required("lid"): cv.string,
    vol.Required("wachtwoord"): cv.string,
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_wachtwoord(hass, connection, msg):
    await _gezin(hass).wachtwoord_wijzigen(msg["lid"], msg["wachtwoord"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/lid/test_melding", vol.Required("lid"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_test_melding(hass, connection, msg):
    g = _gezin(hass)
    lid = g.lid(msg["lid"])
    if not await g.melding(lid, f"{lid['emoji']} Hoi {lid['naam']}!", "Dit is een testmelding van HA Family. Meldingen werken 🎉"):
        raise FamilyFout(f"Er is nog geen werkende telefoon voor {lid['naam']}. Koppel eerst de app.")
    return {}


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/huishouden",
    vol.Required("naam"): cv.string,
    vol.Required("soort"): vol.In(["gezin", "huishouden"]),
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_huishouden(hass, connection, msg):
    g = _gezin(hass)
    hass.config_entries.async_update_entry(g.entry, title=msg["naam"].strip()[:40] or g.naam,
                                           options={**(g.entry.options or g.entry.data), "naam": msg["naam"].strip()[:40], "type": msg["soort"]})
    return {}


# ── Gezinsagenda ──
def _magschrijven(g: Gezin, connection) -> str | None:
    """Afspraken maken mag ieder gezinslid en elke beheerder; geeft het lid-id van wie het doet."""
    lid = g.lid_van_user(connection.user.id)
    if not lid and not connection.user.is_admin and not muur.is_muur(g, connection.user.id):
        raise FamilyFout("Alleen gezinsleden kunnen de agenda aanpassen.")
    return lid["id"] if lid else None


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda", vol.Required("van"): cv.date, vol.Required("tot"): cv.date})
@websocket_api.async_response
@_antwoord
async def ws_agenda(hass, connection, msg):
    g = _gezin(hass)
    if (msg["tot"] - msg["van"]).days > 120:
        raise FamilyFout("Vraag hooguit 120 dagen tegelijk op.")
    return {"events": await g.agenda.events(msg["van"], msg["tot"]), "week_titels": g.data["week_titels"],
            "afvalsoorten": {k: {x: a[x] for x in ("naam", "icoon", "kleur")} for k, a in AFVAL.items()}}


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/agenda/afspraak",
    vol.Optional("afspraak"): cv.string,
    vol.Required("titel"): cv.string,
    vol.Required("start"): cv.string,
    vol.Optional("eind"): vol.Any(None, cv.string),
    vol.Optional("wie", default=[]): [cv.string],
    vol.Optional("herhaal", default=""): vol.Any("", "week", "2weken", "maand", "jaar"),
    vol.Optional("plek", default=""): cv.string,
    vol.Optional("notitie", default=""): cv.string,
})
@websocket_api.async_response
@_antwoord
async def ws_afspraak(hass, connection, msg):
    g = _gezin(hass)
    door = _magschrijven(g, connection)
    data = {k: v for k, v in msg.items() if k not in ("type", "id", "afspraak")}
    if msg.get("afspraak"):
        data["id"] = msg["afspraak"]
    return g.agenda.afspraak(data, door)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/afspraak_weg", vol.Required("afspraak"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_afspraak_weg(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    g.agenda.afspraak_weg(msg["afspraak"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/week_titel", vol.Required("week"): cv.string, vol.Optional("titel", default=""): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_week_titel(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    g.agenda.week_titel(msg["week"], msg["titel"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/instellingen"})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_agenda_instellingen(hass, connection, msg):
    return _gezin(hass).agenda.instellingen()


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/lid_agendas", vol.Required("lid"): cv.string, vol.Required("agendas"): [cv.string]})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_agendas(hass, connection, msg):
    _gezin(hass).agenda.lid_agendas(msg["lid"], msg["agendas"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/extra", vol.Required("agendas"): [cv.string]})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_extra_agendas(hass, connection, msg):
    _gezin(hass).agenda.extra_agendas(msg["agendas"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/link", vol.Required("naam"): cv.string, vol.Required("url"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_agenda_link(hass, connection, msg):
    return {"entity": await _gezin(hass).agenda.link_toevoegen(msg["naam"], msg["url"])}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/verjaardag", vol.Optional("verjaardag"): cv.string,
                                  vol.Required("naam"): cv.string, vol.Required("datum"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_verjaardag(hass, connection, msg):
    return _gezin(hass).agenda.verjaardag(msg["naam"], msg["datum"], msg.get("verjaardag"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/verjaardag_weg", vol.Required("verjaardag"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_verjaardag_weg(hass, connection, msg):
    _gezin(hass).agenda.verjaardag_weg(msg["verjaardag"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/afval",
                                  vol.Optional("schema"): [dict], vol.Optional("agenda"): vol.Any(None, cv.string), vol.Optional("herinnering"): dict,
                                  vol.Optional("bedrijf"): vol.Any(None, {vol.Required("bedrijf"): cv.string, vol.Required("postcode"): cv.string,
                                                                         vol.Required("huisnummer"): vol.Coerce(str), vol.Optional("toevoeging", default=""): cv.string})})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_afval(hass, connection, msg):
    g = _gezin(hass)
    if "bedrijf" in msg:                                     # eerst het adres controleren, dan pas de rest veranderen
        b = msg["bedrijf"]
        await afvalbedrijf.instellen(g, b and b["bedrijf"], **({k: b[k] for k in ("postcode", "huisnummer", "toevoeging")} if b else {}))
    g.agenda.afval_instellen(msg.get("schema"), msg.get("agenda") if "agenda" in msg else None, msg.get("herinnering"))
    b = g.data["afval"].get("bedrijf")
    return {"dagen": len(b["dagen"]) if b else 0, "eerste": b["dagen"][0] if b and b["dagen"] else None}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/agenda/verjaardag_melding", vol.Required("aan"): bool, vol.Required("tijd"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_verjaardag_melding(hass, connection, msg):
    g = _gezin(hass)
    g.data["verjaardag_melding"] = {"aan": msg["aan"], "tijd": msg["tijd"]}
    g.opslaan()
    return {}


# ── Taken, boodschappen en klusjes ──
async def _ouder(g: Gezin, connection) -> None:
    if not await g.taken.is_ouder(connection.user.id):
        raise FamilyFout("Alleen een ouder kan dit aanpassen.")


@websocket_api.websocket_command({vol.Required("type"): "ha_family/taken"})
@websocket_api.async_response
@_antwoord
async def ws_taken(hass, connection, msg):
    g = _gezin(hass)
    t = g.taken
    ik = g.lid_van_user(connection.user.id)
    return {"taken": g.data["taken"], "boodschappen": t.boodschappen(), "afdelingen": AFDELINGEN, "klusjes": g.data["klusjes"],
            **t.overzicht(), "ik": ik["id"] if ik else None, "ouder": await t.is_ouder(connection.user.id),
            "voorbeelden": [{"emoji": e, "titel": n, "punten": p} for e, n, p in VOORBEELDEN],
            "instellingen": g.data["klusjes_instellingen"]}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/taak", vol.Optional("taak"): cv.string, vol.Required("titel"): cv.string,
                                  vol.Optional("wie", default=[]): [cv.string], vol.Optional("deadline"): vol.Any(None, cv.string),
                                  vol.Optional("notitie", default=""): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_taak(hass, connection, msg):
    g = _gezin(hass)
    door = _magschrijven(g, connection)
    return g.taken.taak({"id": msg.get("taak"), "titel": msg["titel"], "wie": msg["wie"], "deadline": msg.get("deadline"), "notitie": msg["notitie"]}, door)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/taak/klaar", vol.Required("taak"): cv.string, vol.Required("klaar"): bool})
@websocket_api.async_response
@_antwoord
async def ws_taak_klaar(hass, connection, msg):
    g = _gezin(hass)
    return g.taken.taak_klaar(msg["taak"], msg["klaar"], _magschrijven(g, connection))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/taak/weg", vol.Required("taak"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_taak_weg(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    g.taken.taak_weg(msg["taak"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/taken/opruimen"})
@websocket_api.async_response
@_antwoord
async def ws_taken_opruimen(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    return {"weg": g.taken.taken_opruimen()}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/boodschap", vol.Required("tekst"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_boodschap(hass, connection, msg):
    g = _gezin(hass)
    return {"nieuw": g.taken.boodschap(msg["tekst"], _magschrijven(g, connection))}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/boodschap/bij", vol.Required("boodschap"): cv.string, vol.Optional("klaar"): bool,
                                  vol.Optional("afdeling"): cv.string, vol.Optional("titel"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_boodschap_bij(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    return g.taken.boodschap_bij(msg["boodschap"], msg.get("klaar"), msg.get("afdeling"), msg.get("titel"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/boodschap/weg", vol.Optional("boodschap"): cv.string,
                                  vol.Optional("alles_gekocht", default=False): bool})
@websocket_api.async_response
@_antwoord
async def ws_boodschap_weg(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    g.taken.boodschap_weg(msg.get("boodschap"), msg["alles_gekocht"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusjes", vol.Optional("datum"): cv.date})
@websocket_api.async_response
@_antwoord
async def ws_klusjes(hass, connection, msg):
    g = _gezin(hass)
    ik = g.lid_van_user(connection.user.id)
    return {**g.taken.overzicht(msg.get("datum")), "ik": ik["id"] if ik else None, "ouder": await g.taken.is_ouder(connection.user.id)}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusje", vol.Optional("klusje"): cv.string, vol.Required("titel"): cv.string,
                                  vol.Optional("emoji", default="⭐"): cv.string, vol.Optional("punten", default=0): vol.Coerce(int),
                                  vol.Required("wie"): [cv.string], vol.Optional("dagen", default=[]): [vol.Coerce(int)],
                                  vol.Optional("datum"): vol.Any(None, cv.string), vol.Optional("goedkeuren", default=False): bool,
                                  vol.Optional("actief", default=True): bool})
@websocket_api.async_response
@_antwoord
async def ws_klusje(hass, connection, msg):
    g = _gezin(hass)
    await _ouder(g, connection)
    data = {k: v for k, v in msg.items() if k not in ("type", "id", "klusje")}
    data["id"] = msg.get("klusje")
    return g.taken.klusje(data)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusje/weg", vol.Required("klusje"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_klusje_weg(hass, connection, msg):
    g = _gezin(hass)
    await _ouder(g, connection)
    g.taken.klusje_weg(msg["klusje"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusje/gedaan", vol.Required("klusje"): cv.string, vol.Required("lid"): cv.string,
                                  vol.Required("datum"): cv.string, vol.Optional("gedaan", default=True): bool})
@websocket_api.async_response
@_antwoord
async def ws_klusje_gedaan(hass, connection, msg):
    return await _gezin(hass).taken.klusje_gedaan(msg["klusje"], msg["lid"], msg["datum"], connection.user.id, msg["gedaan"])


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusje/goedkeuren", vol.Required("klusje"): cv.string, vol.Required("lid"): cv.string,
                                  vol.Required("datum"): cv.string, vol.Required("ok"): bool})
@websocket_api.async_response
@_antwoord
async def ws_goedkeuren(hass, connection, msg):
    await _gezin(hass).taken.goedkeuren(msg["klusje"], msg["lid"], msg["datum"], msg["ok"], connection.user.id)
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/punten", vol.Required("lid"): cv.string, vol.Required("punten"): vol.Coerce(int),
                                  vol.Optional("reden", default=""): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_punten_geven(hass, connection, msg):
    return await _gezin(hass).taken.punten_geven(msg["lid"], msg["punten"], msg["reden"], connection.user.id)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/beloning", vol.Optional("beloning"): cv.string, vol.Required("titel"): cv.string,
                                  vol.Optional("emoji", default="🎁"): cv.string, vol.Required("punten"): vol.Coerce(int)})
@websocket_api.async_response
@_antwoord
async def ws_beloning(hass, connection, msg):
    g = _gezin(hass)
    await _ouder(g, connection)
    return g.taken.beloning({"id": msg.get("beloning"), "titel": msg["titel"], "emoji": msg["emoji"], "punten": msg["punten"]})


@websocket_api.websocket_command({vol.Required("type"): "ha_family/beloning/weg", vol.Required("beloning"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_beloning_weg(hass, connection, msg):
    g = _gezin(hass)
    await _ouder(g, connection)
    g.taken.beloning_weg(msg["beloning"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/beloning/inwisselen", vol.Required("beloning"): cv.string, vol.Required("lid"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_inwisselen(hass, connection, msg):
    return await _gezin(hass).taken.inwisselen(msg["beloning"], msg["lid"], connection.user.id)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/beloning/goedkeuren", vol.Required("punten_id"): cv.string, vol.Required("ok"): bool})
@websocket_api.async_response
@_antwoord
async def ws_beloning_goedkeuren(hass, connection, msg):
    await _gezin(hass).taken.beloning_goedkeuren(msg["punten_id"], msg["ok"], connection.user.id)
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusjes/instellingen", vol.Required("aan"): bool, vol.Required("tijd"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_klusjes_instellingen(hass, connection, msg):
    g = _gezin(hass)
    await _ouder(g, connection)
    g.data["klusjes_instellingen"] = {"herinnering": {"aan": msg["aan"], "tijd": msg["tijd"]}}
    g.opslaan()
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/lid/account", vol.Required("lid"): cv.string, vol.Optional("gebruikersnaam"): cv.string,
                                  vol.Required("wachtwoord"): cv.string, vol.Optional("beheerder", default=False): bool})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_account(hass, connection, msg):
    g = _gezin(hass)
    lid = await g.account_aanmaken(msg["lid"], msg.get("gebruikersnaam"), msg["wachtwoord"], msg["beheerder"])
    await g.weergave_zetten(lid)
    return lid


# ── Muurscherm ──
@websocket_api.websocket_command({vol.Required("type"): "ha_family/muur"})
@websocket_api.async_response
@_antwoord
async def ws_muur(hass, connection, msg):
    g = _gezin(hass)
    return {**muur.openbaar(g), "ben_muur": muur.is_muur(g, connection.user.id),
            "weerberichten": [{"entity": s.entity_id, "naam": s.name} for s in hass.states.async_all("weather")]}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/muur/aanmaken", vol.Required("gebruikersnaam"): cv.string, vol.Required("wachtwoord"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_muur_aanmaken(hass, connection, msg):
    g = _gezin(hass)
    await muur.aanmaken(g, msg["gebruikersnaam"], msg["wachtwoord"])
    return muur.openbaar(g)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/muur/bijwerken", vol.Optional("nacht"): dict, vol.Optional("weer"): vol.Any(None, cv.string),
                                  vol.Optional("blokken"): dict, vol.Optional("zijbalk_weg"): bool})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_muur_bijwerken(hass, connection, msg):
    g = _gezin(hass)
    muur.bijwerken(g, {k: v for k, v in msg.items() if k not in ("type", "id")})
    return muur.openbaar(g)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/muur/verwijderen"})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_muur_verwijderen(hass, connection, msg):
    await muur.verwijderen(_gezin(hass))
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/muur/wachtwoord", vol.Required("wachtwoord"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_muur_wachtwoord(hass, connection, msg):
    await muur.wachtwoord(_gezin(hass), msg["wachtwoord"])
    return {}


# ── Maaltijdplanner ──
@websocket_api.websocket_command({vol.Required("type"): "ha_family/eten", vol.Optional("van"): cv.date, vol.Optional("dagen", default=7): vol.All(int, vol.Range(min=1, max=31))})
@websocket_api.async_response
@_antwoord
async def ws_eten(hass, connection, msg):
    g = _gezin(hass)
    from homeassistant.util import dt as dt_util

    ik = g.lid_van_user(connection.user.id)
    return {"menu": g.maaltijden.menu(msg.get("van") or dt_util.now().date(), msg["dagen"]), "recepten": g.data["recepten"], "labels": LABELS,
            "instellingen": g.data["eten_instellingen"], "ik": ik["id"] if ik else None, "ai": bool(ai.ai_entity(hass))}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/recept", vol.Optional("recept"): cv.string, vol.Required("naam"): cv.string,
                                  vol.Optional("emoji"): cv.string, vol.Optional("ingredienten", default=[]): vol.Any([cv.string], cv.string),
                                  vol.Optional("personen", default=4): vol.Coerce(int), vol.Optional("bereiding", default=""): cv.string,
                                  vol.Optional("link"): vol.Any(None, cv.string), vol.Optional("labels", default=[]): [cv.string], vol.Optional("favoriet"): bool})
@websocket_api.async_response
@_antwoord
async def ws_recept(hass, connection, msg):
    g = _gezin(hass)
    door = _magschrijven(g, connection)
    data = {k: v for k, v in msg.items() if k not in ("type", "id", "recept")}
    data["id"] = msg.get("recept")
    return g.maaltijden.recept(data, door)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/recept/weg", vol.Required("recept"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_recept_weg(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    g.maaltijden.recept_weg(msg["recept"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/recept/import", vol.Required("url"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_recept_import(hass, connection, msg):
    g = _gezin(hass)
    return await g.maaltijden.importeren(msg["url"], _magschrijven(g, connection))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/recept/startpakket"})
@websocket_api.async_response
@_antwoord
async def ws_startpakket(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    return {"toegevoegd": g.maaltijden.startpakket()}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/eten/plan", vol.Required("datum"): cv.string, vol.Optional("recept"): vol.Any(None, cv.string),
                                  vol.Optional("tekst"): vol.Any(None, cv.string), vol.Optional("kok"): vol.Any(None, cv.string),
                                  vol.Optional("notitie"): vol.Any(None, cv.string)})
@websocket_api.async_response
@_antwoord
async def ws_plan(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    return g.maaltijden.plan(msg["datum"], msg.get("recept"), msg.get("tekst"), msg.get("kok"), msg.get("notitie"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/eten/boodschappen", vol.Optional("recept"): cv.string, vol.Optional("van"): cv.string,
                                  vol.Optional("dagen", default=1): vol.All(int, vol.Range(min=1, max=31))})
@websocket_api.async_response
@_antwoord
async def ws_eten_boodschappen(hass, connection, msg):
    g = _gezin(hass)
    return g.maaltijden.naar_boodschappen(msg.get("recept"), msg.get("van"), msg["dagen"], _magschrijven(g, connection))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/eten/suggestie", vol.Optional("label"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_suggestie(hass, connection, msg):
    return {"recept": _gezin(hass).maaltijden.suggestie(msg.get("label"))}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/eten/instellingen", vol.Required("aan"): bool, vol.Required("tijd"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_eten_instellingen(hass, connection, msg):
    g = _gezin(hass)
    _magschrijven(g, connection)
    g.data["eten_instellingen"] = {"herinnering": {"aan": msg["aan"], "tijd": msg["tijd"]}}
    g.opslaan()
    return {}


# ── 🏠 Kamers en apparaten ──

@websocket_api.websocket_command({vol.Required("type"): "ha_family/huis"})
@websocket_api.async_response
@_antwoord
async def ws_huis(hass, connection, msg):
    return _gezin(hass).huis.overzicht()


@websocket_api.websocket_command({vol.Required("type"): "ha_family/kamer", vol.Optional("kamer"): cv.string, vol.Required("naam"): cv.string,
                                  vol.Optional("icoon"): vol.Any(None, cv.string)})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_kamer(hass, connection, msg):
    return _gezin(hass).huis.kamer(msg.get("kamer"), msg["naam"], msg.get("icoon"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/kamer/weg", vol.Required("kamer"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_kamer_weg(hass, connection, msg):
    _gezin(hass).huis.kamer_weg(msg["kamer"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/kamer/apparaat", vol.Required("entity"): cv.entity_id,
                                  vol.Required("kamer"): vol.Any(None, cv.string)})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_kamer_apparaat(hass, connection, msg):
    _gezin(hass).huis.apparaat(msg["entity"], msg["kamer"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/huis/instellingen", vol.Optional("verborgen"): [cv.string],
                                  vol.Optional("volgorde"): [cv.string]})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_huis_instellingen(hass, connection, msg):
    _gezin(hass).huis.instellingen(msg.get("verborgen"), msg.get("volgorde"))
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/apparaat/tonen", vol.Required("entity"): cv.entity_id, vol.Required("tonen"): bool})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_apparaat_tonen(hass, connection, msg):
    _gezin(hass).huis.tonen(msg["entity"], msg["tonen"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/kamer/samenvoegen", vol.Required("van"): cv.string, vol.Required("naar"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_kamer_samenvoegen(hass, connection, msg):
    return {"verplaatst": _gezin(hass).huis.samenvoegen(msg["van"], msg["naar"])}


# ── 🎁 Cadeaus en verlanglijstjes ──

def _ik(g: Gezin, connection) -> dict[str, Any]:
    ik = g.lid_van_user(connection.user.id)
    if not ik:
        raise FamilyFout("Alleen gezinsleden hebben een verlanglijstje.")
    return ik


async def _mag_lijst(g: Gezin, connection, eigenaar: str) -> dict[str, Any] | None:
    ik = g.lid_van_user(connection.user.id)
    g.lid(eigenaar)                                          # bestaat het?
    if not await g.cadeaus.mag_lijst_bewerken(ik, eigenaar, connection.user.is_admin):
        raise FamilyFout("Dit lijstje mag je niet aanpassen.")
    return ik


@websocket_api.websocket_command({vol.Required("type"): "ha_family/cadeaus"})
@websocket_api.async_response
@_antwoord
async def ws_cadeaus(hass, connection, msg):
    g = _gezin(hass)
    return g.cadeaus.overzicht(g.lid_van_user(connection.user.id))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/lid/profiel", vol.Optional("lid"): cv.string,
                                  vol.Optional("geboortedatum"): vol.Any(None, cv.string), vol.Optional("geslacht"): vol.Any(None, cv.string),
                                  vol.Optional("interesses"): [cv.string]})
@websocket_api.async_response
@_antwoord
async def ws_profiel(hass, connection, msg):
    """Je eigen verjaardag, geslacht en interesses (ouders ook die van een kind)."""
    g = _gezin(hass)
    lid = msg.get("lid") or _ik(g, connection)["id"]
    await _mag_lijst(g, connection, lid)
    velden = {k: msg[k] for k in ("geboortedatum", "geslacht", "interesses") if k in msg}
    return g.lid_bijwerken(lid, **velden)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/wens", vol.Optional("wens"): cv.string, vol.Optional("lid"): cv.string,
                                  vol.Required("titel"): cv.string, vol.Optional("link"): vol.Any(None, cv.string),
                                  vol.Optional("prijs"): vol.Any(None, cv.string, vol.Coerce(float)), vol.Optional("notitie"): vol.Any(None, cv.string),
                                  vol.Optional("emoji"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_wens(hass, connection, msg):
    g = _gezin(hass)
    eigenaar = msg.get("lid") or _ik(g, connection)["id"]
    await _mag_lijst(g, connection, eigenaar)
    return g.cadeaus.wens(eigenaar, msg, msg.get("wens"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/wens/weg", vol.Required("wens"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_wens_weg(hass, connection, msg):
    g = _gezin(hass)
    w = g.cadeaus._wens(msg["wens"])
    await _mag_lijst(g, connection, w["lid"])
    g.cadeaus.wens_weg(msg["wens"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/wens/kopen", vol.Required("wens"): cv.string, vol.Required("gekocht"): bool})
@websocket_api.async_response
@_antwoord
async def ws_wens_kopen(hass, connection, msg):
    g = _gezin(hass)
    g.cadeaus.kopen(msg["wens"], _ik(g, connection)["id"], msg["gekocht"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/wensen/sturen", vol.Optional("lid"): cv.string, vol.Required("naar"): [cv.string]})
@websocket_api.async_response
@_antwoord
async def ws_wensen_sturen(hass, connection, msg):
    g = _gezin(hass)
    eigenaar = msg.get("lid") or _ik(g, connection)["id"]
    ik = await _mag_lijst(g, connection, eigenaar)
    return {"verstuurd": await g.cadeaus.sturen(eigenaar, msg["naar"], ik)}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/cadeau/ideeen", vol.Required("lid"): cv.string,
                                  vol.Optional("budget"): vol.Any(None, vol.Coerce(float)), vol.Optional("gelegenheid"): vol.Any(None, cv.string),
                                  vol.Optional("extra"): vol.Any(None, cv.string)})
@websocket_api.async_response
@_antwoord
async def ws_cadeau_ideeen(hass, connection, msg):
    g = _gezin(hass)
    _ik(g, connection)
    return await g.cadeaus.ideeen(msg["lid"], msg.get("budget"), msg.get("gelegenheid"), msg.get("extra"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/cadeau/idee", vol.Required("lid"): cv.string, vol.Required("titel"): cv.string,
                                  vol.Optional("emoji"): cv.string, vol.Optional("prijs"): vol.Any(None, cv.string, vol.Coerce(float))})
@websocket_api.async_response
@_antwoord
async def ws_idee_bewaren(hass, connection, msg):
    g = _gezin(hass)
    g.lid(msg["lid"])
    return g.cadeaus.idee_bewaren(_ik(g, connection)["id"], msg["lid"], msg)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/cadeau/idee/weg", vol.Required("idee"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_idee_weg(hass, connection, msg):
    g = _gezin(hass)
    g.cadeaus.idee_weg(_ik(g, connection)["id"], msg["idee"])
    return {}


# ── 📌 Persoonlijk dashboard ──

@websocket_api.websocket_command({vol.Required("type"): "ha_family/lid/dashboard", vol.Required("lid"): cv.string,
                                  vol.Required("actie"): vol.In(["maak", "koppel", "los"]), vol.Optional("url_path"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_dashboard(hass, connection, msg):
    from . import persoonlijk
    from .weergave import alles_toepassen

    g = _gezin(hass)
    lid = g.lid(msg["lid"])
    if msg["actie"] == "maak":
        await persoonlijk.maken(g, lid)
    elif msg["actie"] == "koppel":
        persoonlijk.koppelen(g, lid, msg.get("url_path") or "")
    else:
        persoonlijk.loskoppelen(g, lid)
    await alles_toepassen(g)                                # bij hem bovenaan, bij de anderen weg
    return {"dashboard": lid.get("dashboard"), "eigen": lid.get("dashboard_eigen", False)}


# ── ✨ AI ──

@websocket_api.websocket_command({vol.Required("type"): "ha_family/eten/ai_week", vol.Optional("van"): cv.date, vol.Optional("dagen", default=7): vol.All(int, vol.Range(min=1, max=14)),
                                  vol.Optional("wens"): vol.Any(None, cv.string)})
@websocket_api.async_response
@_antwoord
async def ws_ai_week(hass, connection, msg):
    from homeassistant.util import dt as dt_util

    g = _gezin(hass)
    _magschrijven(g, connection)
    return await ai.weekmenu(g, msg.get("van") or dt_util.now().date(), msg["dagen"], msg.get("wens"))


@websocket_api.websocket_command({vol.Required("type"): "ha_family/recept/ai", vol.Required("vraag"): cv.string})
@websocket_api.async_response
@_antwoord
async def ws_ai_recept(hass, connection, msg):
    g = _gezin(hass)
    door = _magschrijven(g, connection)
    if len(msg["vraag"].strip()) < 3:
        raise FamilyFout("Waar heb je zin in? Bijvoorbeeld: iets snels met kip en rijst.")
    return await ai.recept(g, msg["vraag"], door)


@websocket_api.websocket_command({vol.Required("type"): "ha_family/dagoverzicht", vol.Optional("opnieuw", default=False): bool})
@websocket_api.async_response
@_antwoord
async def ws_dagoverzicht(hass, connection, msg):
    g = _gezin(hass)
    return {**await ai.dagoverzicht(g, msg["opnieuw"] and connection.user.is_admin), "ai": bool(ai.ai_entity(hass))}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/klusjes/ai", vol.Required("lid"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_ai_klusjes(hass, connection, msg):
    return await ai.klusjes(_gezin(hass), msg["lid"])
