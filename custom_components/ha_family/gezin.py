"""Het huishouden: wie hoort erbij, met rol, kleur en emoji, en alles wat het beheer voor je regelt.

Een gezinslid is altijd een HA-persoon. Mag iemand inloggen, dan maakt HA Family er ook een HA-gebruiker met
gebruikersnaam en wachtwoord bij en koppelt die aan de persoon. Telefoons vinden we via de mobile_app-koppelingen
(daar staat de gebruiker in), zodat meldingen vanzelf naar de juiste telefoon gaan."""
from __future__ import annotations

import logging
import re
import secrets
from collections.abc import Callable
from typing import Any

from homeassistant.auth.const import GROUP_ID_ADMIN, GROUP_ID_USER
from homeassistant.auth.providers import homeassistant as auth_ha
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store
from homeassistant.util import slugify

from . import weergave as wg
from .const import ALLE_ROLLEN, CONF_NAAM, CONF_TYPE, DOMAIN, EMOJI, KLEUREN, STORAGE_VERSION, TYPE_GEZIN
from .weergave import WEERGAVEN

_LOGGER = logging.getLogger(__name__)
WOORDEN = ["appel", "beer", "boot", "duin", "eend", "fiets", "gras", "haven", "ijs", "jas", "kaas", "lamp", "maan", "nest",
           "oven", "pad", "regen", "ster", "tulp", "uil", "vos", "wolk", "zon", "zee", "bos", "kip", "molen", "tent"]


class FamilyFout(HomeAssistantError):
    """Fout die we in het beheerpaneel letterlijk laten zien."""


def wachtwoord_voorstel() -> str:
    """Een wachtwoord dat je kunt voorlezen: drie woorden en twee cijfers, bv. 'maan-tulp-vos-42'."""
    return "-".join(secrets.choice(WOORDEN) for _ in range(3)) + f"-{secrets.randbelow(90) + 10}"


class Gezin:
    """Gegevens en beheer van één huishouden (één config entry)."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}")
        self.data: dict[str, Any] = {"leden": []}
        self._listeners: list[Callable[[], None]] = []

    # ── opslag ──
    async def async_load(self) -> None:
        self.data = {"leden": [], **(await self.store.async_load() or {})}
        for lid in self.data["leden"]:                  # 0.8.0 bewaarde apparaten als lijsten (zien/bedienen): omzetten
            a = lid.get("apparaten")
            if a and "uitzonderingen" not in a:
                zien = list(a.get("zien") or [])
                uitz = {e: "z" for e in zien}
                uitz.update({e: "b" for e in a.get("bedienen") or [] if e in zien})
                lid["apparaten"] = {"beperkt": bool(a.get("beperkt")), "kamers": {}, "uitzonderingen": uitz}

    @callback
    def opslaan(self) -> None:
        self.store.async_delay_save(lambda: self.data, 1)
        for cb in list(self._listeners):
            cb()

    async def async_flush(self) -> None:
        """Meteen wegschrijven (bij uitladen), zodat niets van de vertraagde opslag verloren gaat."""
        await self.store.async_save(self.data)

    @callback
    def add_listener(self, cb: Callable[[], None]) -> CALLBACK_TYPE:
        self._listeners.append(cb)
        return lambda: self._listeners.remove(cb)

    # ── huishouden ──
    @property
    def naam(self) -> str:
        return (self.entry.options or self.entry.data).get(CONF_NAAM) or "Ons gezin"

    @property
    def type(self) -> str:
        return (self.entry.options or self.entry.data).get(CONF_TYPE) or TYPE_GEZIN

    @property
    def leden(self) -> list[dict[str, Any]]:
        return self.data["leden"]

    def lid(self, lid_id: str) -> dict[str, Any]:
        for l in self.leden:
            if l["id"] == lid_id:
                return l
        raise FamilyFout("Dit gezinslid bestaat niet (meer).")

    def lid_van_user(self, user_id: str | None) -> dict[str, Any] | None:
        return next((l for l in self.leden if user_id and self.user_id(l) == user_id), None)

    def user_id(self, lid: dict[str, Any]) -> str | None:
        s = self.hass.states.get(lid["person"])
        return s.attributes.get("user_id") if s else None

    def _vrije_kleur(self) -> str:
        bezet = {l.get("kleur") for l in self.leden}
        return next((k for k in KLEUREN if k not in bezet), KLEUREN[len(self.leden) % len(KLEUREN)])

    def _vrije_emoji(self) -> str:
        bezet = {l.get("emoji") for l in self.leden}
        return next((e for e in EMOJI if e not in bezet), EMOJI[len(self.leden) % len(EMOJI)])

    # ── personen en gebruikers ──
    def _persoon_items(self) -> list[dict[str, Any]]:
        return list(self.hass.data["person"][1].async_items())

    def _persoon_entity(self, item_id: str) -> str | None:
        return er.async_get(self.hass).async_get_entity_id("person", "person", item_id)

    def losse_personen(self) -> list[dict[str, Any]]:
        """Personen in HA die (nog) geen gezinslid zijn, om met één klik toe te voegen."""
        leden = {l["person"] for l in self.leden}
        uit = []
        for p in self._persoon_items():
            eid = self._persoon_entity(p["id"])
            if eid and eid not in leden:
                uit.append({"person": eid, "naam": p["name"], "user_id": p.get("user_id")})
        return uit

    async def lid_toevoegen(self, naam: str, rol: str, kleur: str | None = None, emoji: str | None = None,
                            inloggen: bool = False, gebruikersnaam: str | None = None, wachtwoord: str | None = None,
                            beheerder: bool = False) -> dict[str, Any]:
        """Nieuw gezinslid: persoon, en als iemand mag inloggen ook een gebruiker met wachtwoord."""
        naam = naam.strip()[:40]
        if not naam:
            raise FamilyFout("Vul een naam in.")
        if rol not in ALLE_ROLLEN:
            raise FamilyFout("Onbekende rol.")
        if any(p["name"].lower() == naam.lower() for p in self._persoon_items()):
            raise FamilyFout(f"Er is al een persoon '{naam}' in Home Assistant. Voeg die toe bij 'Al in Home Assistant'.")
        user_id = await self._maak_gebruiker(naam, gebruikersnaam, wachtwoord, beheerder) if inloggen else None
        from homeassistant.components.person import async_create_person

        await async_create_person(self.hass, naam, user_id=user_id)
        item = next(p for p in self._persoon_items() if p["name"] == naam and p.get("user_id") == user_id)
        person = self._persoon_entity(item["id"])
        return self._nieuw_lid(person, naam, rol, kleur, emoji)

    def persoon_toevoegen(self, person: str, rol: str, kleur: str | None = None, emoji: str | None = None) -> dict[str, Any]:
        """Een persoon die al in HA bestaat, gezinslid maken."""
        if rol not in ALLE_ROLLEN:
            raise FamilyFout("Onbekende rol.")
        if any(l["person"] == person for l in self.leden):
            raise FamilyFout("Deze persoon is al gezinslid.")
        s = self.hass.states.get(person)
        if s is None:
            raise FamilyFout("Deze persoon bestaat niet.")
        return self._nieuw_lid(person, s.name, rol, kleur, emoji)

    def _nieuw_lid(self, person: str, naam: str, rol: str, kleur: str | None, emoji: str | None) -> dict[str, Any]:
        lid = {"id": secrets.token_hex(5), "person": person, "naam": naam, "rol": rol, "kleur": kleur or self._vrije_kleur(),
               "emoji": emoji or self._vrije_emoji(), "lamp": None, "notify": None, "weergave": None}
        self.leden.append(lid)
        self.opslaan()
        return lid

    def lid_bijwerken(self, lid_id: str, **velden: Any) -> dict[str, Any]:
        lid = self.lid(lid_id)
        if "geboortedatum" in velden:
            g = velden.pop("geboortedatum") or None
            if g and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", g):
                raise FamilyFout("Kies een geboortedatum.")
            lid["geboortedatum"] = g
        if "geslacht" in velden:
            v = velden.pop("geslacht") or None
            if v and v not in ("man", "vrouw", "anders"):
                raise FamilyFout("Onbekend geslacht.")
            lid["geslacht"] = v
        if "apparaten" in velden:
            # welke apparaten iemand ziet en mag bedienen (kamers-kaart): per kamer, met uitzonderingen per apparaat.
            # stand: "" = verborgen, "z" = zien, "b" = bedienen. beperkt=False is alles.
            a = velden.pop("apparaten") or {}
            kamers = {str(k): v for k, v in (a.get("kamers") or {}).items() if v in ("", "z", "b")}
            uitz = {str(e): v for e, v in (a.get("uitzonderingen") or {}).items() if "." in str(e) and v in ("", "z", "b")}
            for e in a.get("zien") or []:                    # oude vorm: lijsten met entiteiten
                uitz.setdefault(e, "z")
            for e in a.get("bedienen") or []:
                if e in (a.get("zien") or []):
                    uitz[e] = "b"
            lid["apparaten"] = {"beperkt": bool(a.get("beperkt")), "kamers": kamers, "uitzonderingen": dict(list(uitz.items())[:1000])}
        if "kamers" in velden:                           # 'mijn kamers': de knoppen op het eigen tabblad (None = raden op naam)
            k = velden.pop("kamers")
            lid["kamers"] = None if k is None else [str(x) for x in dict.fromkeys(k)][:20]
        if "interesses" in velden:
            lid["interesses"] = list(dict.fromkeys(str(i).strip()[:30] for i in (velden.pop("interesses") or []) if str(i).strip()))[:15]
        for k in ("naam", "rol", "kleur", "emoji", "lamp", "notify", "weergave"):
            if k in velden:
                v = velden[k]
                if k == "rol" and v not in ALLE_ROLLEN:
                    raise FamilyFout("Onbekende rol.")
                if k == "weergave" and v not in WEERGAVEN:
                    raise FamilyFout("Onbekende weergave.")
                if k == "naam":
                    v = (v or "").strip()[:40] or lid["naam"]
                lid[k] = (v or None) if k in ("lamp", "notify") else v
        self.opslaan()
        return lid

    async def weergave_zetten(self, lid: dict[str, Any]) -> None:
        """Weergave bepalen (standaard op rol en beheerrecht) en toepassen op startscherm en zijbalk."""
        if not lid.get("weergave"):
            lid["weergave"] = wg.standaard(lid["rol"], await self.is_beheerder(lid))
            self.opslaan()
        await wg.toepassen(self, lid)

    async def lid_verwijderen(self, lid_id: str, ook_account: bool = False) -> None:
        """Uit het gezin halen; met ook_account ook de persoon en de HA-gebruiker weg (niet bij de eigenaar)."""
        lid = self.lid(lid_id)
        uid = self.user_id(lid)
        if uid and not ook_account:
            await wg.terugzetten(self, uid)          # weer gewone Home Assistant voor deze gebruiker
        if ook_account:
            uid = self.user_id(lid)
            if uid:
                user = await self.hass.auth.async_get_user(uid)
                if user and user.is_owner:
                    raise FamilyFout("De eigenaar van Home Assistant kun je niet verwijderen.")
                if user:
                    provider = auth_ha.async_get_provider(self.hass)
                    for c in user.credentials:
                        if c.auth_provider_type == "homeassistant":
                            try:
                                await provider.async_remove_auth(c.data["username"])
                            except auth_ha.InvalidUser:
                                pass
                    await self.hass.auth.async_remove_user(user)
            coll = self.hass.data["person"][1]
            for p in coll.async_items():
                if self._persoon_entity(p["id"]) == lid["person"]:
                    await coll.async_delete_item(p["id"])
        self.leden.remove(lid)
        self.opslaan()

    async def _maak_gebruiker(self, naam: str, gebruikersnaam: str | None, wachtwoord: str | None, beheerder: bool) -> str:
        """HA-gebruiker met gebruikersnaam en wachtwoord; geeft het user_id."""
        gebruikersnaam = (gebruikersnaam or slugify(naam).replace("_", "")).strip().lower()
        if not re.fullmatch(r"[a-z0-9._-]{2,30}", gebruikersnaam or ""):
            raise FamilyFout("Een gebruikersnaam mag alleen kleine letters, cijfers, punt, streepje en liggend streepje hebben.")
        if not wachtwoord or len(wachtwoord) < 6:
            raise FamilyFout("Kies een wachtwoord van minstens 6 tekens.")
        try:
            provider = auth_ha.async_get_provider(self.hass)
        except RuntimeError as ex:
            raise FamilyFout("Inloggen met gebruikersnaam en wachtwoord staat uit in deze Home Assistant.") from ex
        try:
            await provider.async_add_auth(gebruikersnaam, wachtwoord)
        except auth_ha.InvalidUser as ex:
            raise FamilyFout(f"De gebruikersnaam '{gebruikersnaam}' bestaat al. Kies een andere.") from ex
        user = await self.hass.auth.async_create_user(naam, group_ids=[GROUP_ID_ADMIN if beheerder else GROUP_ID_USER])
        cred = await provider.async_get_or_create_credentials({"username": gebruikersnaam})
        await self.hass.auth.async_link_user(user, cred)
        return user.id

    async def account_aanmaken(self, lid_id: str, gebruikersnaam: str | None, wachtwoord: str, beheerder: bool = False) -> dict[str, Any]:
        """Een gezinslid zonder account (bv. een kind dat nu een telefoon heeft) alsnog laten inloggen."""
        lid = self.lid(lid_id)
        if self.user_id(lid):
            raise FamilyFout(f"{lid['naam']} heeft al een account.")
        uid = await self._maak_gebruiker(lid["naam"], gebruikersnaam, wachtwoord, beheerder)
        coll = self.hass.data["person"][1]
        item = next((p for p in coll.async_items() if self._persoon_entity(p["id"]) == lid["person"]), None)
        if item is None:
            raise FamilyFout("De persoon van dit gezinslid bestaat niet meer.")
        await coll.async_update_item(item["id"], {"user_id": uid})
        await self.hass.async_block_till_done()
        return lid

    async def wachtwoord_wijzigen(self, lid_id: str, wachtwoord: str) -> None:
        if len(wachtwoord) < 6:
            raise FamilyFout("Kies een wachtwoord van minstens 6 tekens.")
        uid = self.user_id(self.lid(lid_id))
        user = uid and await self.hass.auth.async_get_user(uid)
        cred = user and next((c for c in user.credentials if c.auth_provider_type == "homeassistant"), None)
        if not cred:
            raise FamilyFout("Dit gezinslid kan niet inloggen.")
        await auth_ha.async_get_provider(self.hass).async_change_password(cred.data["username"], wachtwoord)

    async def gebruikersnaam(self, lid: dict[str, Any]) -> str | None:
        uid = self.user_id(lid)
        user = uid and await self.hass.auth.async_get_user(uid)
        cred = user and next((c for c in user.credentials if c.auth_provider_type == "homeassistant"), None)
        return cred.data["username"] if cred else None

    async def is_beheerder(self, lid: dict[str, Any]) -> bool:
        uid = self.user_id(lid)
        user = uid and await self.hass.auth.async_get_user(uid)
        return bool(user and user.is_admin)

    # ── telefoons en meldingen ──
    def telefoons(self, lid: dict[str, Any]) -> list[dict[str, Any]]:
        """Telefoons (Companion-app) die met de gebruiker van dit lid zijn ingelogd."""
        uid = self.user_id(lid)
        if not uid:
            return []
        uit = []
        for e in self.hass.config_entries.async_entries("mobile_app"):
            if e.data.get("user_id") == uid:
                naam = e.data.get("device_name") or e.title
                svc = f"mobile_app_{slugify(naam)}"
                uit.append({"naam": naam, "notify": svc, "werkt": self.hass.services.has_service("notify", svc),
                            "model": e.data.get("model"), "os": e.data.get("os_name")})
        return uit

    def notify_dienst(self, lid: dict[str, Any]) -> str | None:
        """Ingestelde meldingsdienst, anders de eerste telefoon van dit lid."""
        if lid.get("notify"):
            return lid["notify"].removeprefix("notify.")
        tel = self.telefoons(lid)
        return tel[0]["notify"] if tel else None

    async def melding(self, lid: dict[str, Any], titel: str, tekst: str, **extra: Any) -> bool:
        svc = self.notify_dienst(lid)
        if not svc or not self.hass.services.has_service("notify", svc):
            return False
        data: dict[str, Any] = {"title": titel, "message": tekst}
        if extra:
            data["data"] = extra
        try:
            await self.hass.services.async_call("notify", svc, data, blocking=True)
        except HomeAssistantError as ex:
            raise FamilyFout(f"De melding kon niet worden verstuurd: {ex}") from ex
        return True

    # ── voor de kaarten en het beheer ──
    def openbaar(self) -> dict[str, Any]:
        """Wat iedereen mag zien (sensor en kaarten)."""
        return {"naam": self.naam, "type": self.type, "leden": [
            {"id": l["id"], "naam": l["naam"], "rol": l["rol"], "kleur": l["kleur"], "emoji": l["emoji"], "person": l["person"],
             "user_id": self.user_id(l), "verjaardag": (l.get("geboortedatum") or "")[5:] or None,
             "expert": l.get("weergave") in ("expert", "origineel"),
             "apparaten": l["apparaten"] if (l.get("apparaten") or {}).get("beperkt") else None, "kamers": l.get("kamers")} for l in self.leden]}

    async def status(self) -> dict[str, Any]:
        """Alles voor het beheerpaneel, met per lid een gezondheidscheck."""
        leden = []
        for l in self.leden:
            s = self.hass.states.get(l["person"])
            tel = self.telefoons(l)
            notify = self.notify_dienst(l)
            lamp = l.get("lamp")
            punten = []
            if s is None:
                punten.append({"ernst": "fout", "tekst": "De persoon bestaat niet meer in Home Assistant."})
            if self.user_id(l) and not tel:
                punten.append({"ernst": "let_op", "tekst": "Nog geen telefoon gekoppeld: meldingen komen nergens aan."})
            elif tel and notify and not self.hass.services.has_service("notify", notify):
                punten.append({"ernst": "fout", "tekst": "De meldingsdienst werkt niet. Open de app op de telefoon."})
            if lamp and self.hass.states.get(lamp) is None:
                punten.append({"ernst": "let_op", "tekst": "De gekozen lamp bestaat niet meer."})
            leden.append({**l, "weergave": l.get("weergave") or wg.standaard(l["rol"], await self.is_beheerder(l)), "user_id": self.user_id(l), "gebruikersnaam": await self.gebruikersnaam(l), "beheerder": await self.is_beheerder(l),
                          "kan_inloggen": bool(self.user_id(l)), "telefoons": tel, "notify_actief": notify,
                          "locatie": s.state if s else None, "foto": s.attributes.get("entity_picture") if s else None, "punten": punten})
        from .persoonlijk import beschikbaar

        return {"naam": self.naam, "type": self.type, "leden": leden, "losse_personen": self.losse_personen(), "dashboards": beschikbaar(self.hass)}
