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
from .taken import VOORBEELDEN
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
    if not lid and not connection.user.is_admin:
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
                                  vol.Optional("schema"): [dict], vol.Optional("agenda"): vol.Any(None, cv.string), vol.Optional("herinnering"): dict})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_afval(hass, connection, msg):
    _gezin(hass).agenda.afval_instellen(msg.get("schema"), msg.get("agenda") if "agenda" in msg else None, msg.get("herinnering"))
    return {}


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
