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
                ws_wachtwoord, ws_test_melding, ws_voorstel, ws_huishouden):
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
    vol.Required("id"): cv.string,
    vol.Optional("naam"): cv.string,
    vol.Optional("rol"): vol.In(ALLE_ROLLEN),
    vol.Optional("kleur"): cv.string,
    vol.Optional("emoji"): cv.string,
    vol.Optional("lamp"): vol.Any(None, cv.string),
    vol.Optional("notify"): vol.Any(None, cv.string),
    vol.Optional("weergave"): vol.In(WEERGAVEN),
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_bijwerken(hass, connection, msg):
    g = _gezin(hass)
    velden = {k: v for k, v in msg.items() if k not in ("type", "id")}
    lid = g.lid_bijwerken(msg["id"], **velden)
    if "weergave" in velden or "rol" in velden:
        await g.weergave_zetten(lid)
    return lid


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/verwijderen",
    vol.Required("id"): cv.string,
    vol.Optional("ook_account", default=False): bool,
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_lid_verwijderen(hass, connection, msg):
    g = _gezin(hass)
    if msg["ook_account"] and g.user_id(g.lid(msg["id"])) == connection.user.id:
        raise FamilyFout("Je kunt je eigen account hier niet verwijderen.")
    await g.lid_verwijderen(msg["id"], msg["ook_account"])
    return {}


@websocket_api.websocket_command({
    vol.Required("type"): "ha_family/lid/wachtwoord",
    vol.Required("id"): cv.string,
    vol.Required("wachtwoord"): cv.string,
})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_wachtwoord(hass, connection, msg):
    await _gezin(hass).wachtwoord_wijzigen(msg["id"], msg["wachtwoord"])
    return {}


@websocket_api.websocket_command({vol.Required("type"): "ha_family/lid/test_melding", vol.Required("id"): cv.string})
@websocket_api.require_admin
@websocket_api.async_response
@_antwoord
async def ws_test_melding(hass, connection, msg):
    g = _gezin(hass)
    lid = g.lid(msg["id"])
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
