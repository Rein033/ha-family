"""Muurscherm: een tablet aan de muur met klok, weer, de gezinsagenda, klusjes en boodschappen.

De tablet logt in met een eigen account ('muur'), dat alleen vanuit het thuisnetwerk kan inloggen. Voor dat account is het
muurscherm het startscherm en is de zijbalk leeg. Op de tablet mag je klusjes van de kinderen afvinken (zoals het kind zelf,
dus met goedkeuring als dat nodig is) en boodschappen en taken toevoegen; beheren kan er niet."""
from __future__ import annotations

import re
from typing import Any

from homeassistant.auth.const import GROUP_ID_USER
from homeassistant.auth.providers import homeassistant as auth_ha

from .gezin import FamilyFout, Gezin

STANDAARD = {"nacht": {"aan": True, "van": "22:30", "tot": "06:30"}, "weer": None, "zijbalk_weg": True,
             "blokken": {"agenda": True, "eten": True, "klusjes": True, "kamers": True, "boodschappen": True, "thuis": True}}


def instellingen(gezin: Gezin) -> dict[str, Any]:
    m = gezin.data.setdefault("muur", {})
    for k, v in STANDAARD.items():
        m.setdefault(k, v if not isinstance(v, dict) else dict(v))
    return m


def is_muur(gezin: Gezin, user_id: str | None) -> bool:
    return bool(user_id) and instellingen(gezin).get("user_id") == user_id


async def aanmaken(gezin: Gezin, gebruikersnaam: str, wachtwoord: str) -> dict[str, Any]:
    m = instellingen(gezin)
    if m.get("user_id") and await gezin.hass.auth.async_get_user(m["user_id"]):
        raise FamilyFout("Er is al een muurscherm-account.")
    gebruikersnaam = gebruikersnaam.strip().lower()
    if not re.fullmatch(r"[a-z0-9._-]{2,30}", gebruikersnaam):
        raise FamilyFout("Een gebruikersnaam mag alleen kleine letters, cijfers, punt, streepje en liggend streepje hebben.")
    if len(wachtwoord) < 6:
        raise FamilyFout("Kies een wachtwoord van minstens 6 tekens.")
    try:
        provider = auth_ha.async_get_provider(gezin.hass)
    except RuntimeError as ex:
        raise FamilyFout("Inloggen met gebruikersnaam en wachtwoord staat uit in deze Home Assistant.") from ex
    try:
        await provider.async_add_auth(gebruikersnaam, wachtwoord)
    except auth_ha.InvalidUser as ex:
        raise FamilyFout(f"De gebruikersnaam '{gebruikersnaam}' bestaat al. Kies een andere.") from ex
    # alleen lokaal: dit account kan niet van buitenaf inloggen
    user = await gezin.hass.auth.async_create_user("Muurscherm", group_ids=[GROUP_ID_USER], local_only=True)
    cred = await provider.async_get_or_create_credentials({"username": gebruikersnaam})
    await gezin.hass.auth.async_link_user(user, cred)
    m.update(user_id=user.id, gebruikersnaam=gebruikersnaam)
    gezin.opslaan()
    from . import weergave

    await weergave.muur_toepassen(gezin)
    return m


async def verwijderen(gezin: Gezin) -> None:
    m = instellingen(gezin)
    uid = m.pop("user_id", None)
    naam = m.pop("gebruikersnaam", None)
    if uid and (user := await gezin.hass.auth.async_get_user(uid)):
        if naam:
            try:
                await auth_ha.async_get_provider(gezin.hass).async_remove_auth(naam)
            except auth_ha.InvalidUser:
                pass
        await gezin.hass.auth.async_remove_user(user)
    gezin.opslaan()


async def wachtwoord(gezin: Gezin, nieuw: str) -> None:
    m = instellingen(gezin)
    if not m.get("gebruikersnaam"):
        raise FamilyFout("Er is nog geen muurscherm-account.")
    if len(nieuw) < 6:
        raise FamilyFout("Kies een wachtwoord van minstens 6 tekens.")
    await auth_ha.async_get_provider(gezin.hass).async_change_password(m["gebruikersnaam"], nieuw)


def bijwerken(gezin: Gezin, data: dict[str, Any]) -> dict[str, Any]:
    m = instellingen(gezin)
    if "nacht" in data:
        n = data["nacht"] or {}
        for k in ("van", "tot"):
            if not re.fullmatch(r"\d{2}:\d{2}", str(n.get(k) or "")):
                raise FamilyFout("Kies een tijd voor de nachtstand.")
        m["nacht"] = {"aan": bool(n.get("aan")), "van": n["van"], "tot": n["tot"]}
    if "weer" in data:
        w = data["weer"] or None
        if w and not w.startswith("weather."):
            raise FamilyFout("Kies een weerbericht.")
        m["weer"] = w
    if "blokken" in data:
        m["blokken"] = {k: bool((data["blokken"] or {}).get(k, True)) for k in STANDAARD["blokken"]}
    if "zijbalk_weg" in data:
        m["zijbalk_weg"] = bool(data["zijbalk_weg"])
    gezin.opslaan()
    return m


def openbaar(gezin: Gezin) -> dict[str, Any]:
    m = instellingen(gezin)
    return {k: m[k] for k in ("nacht", "weer", "blokken", "zijbalk_weg")} | {"heeft_account": bool(m.get("user_id")),
                                                                                "gebruikersnaam": m.get("gebruikersnaam")}
