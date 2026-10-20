"""Weergave per gezinslid: van Home Assistant een gezinsapp maken, zonder HA zelf te veranderen.

HA bewaart per gebruiker op de server welk scherm het startscherm is (frontend-gebruikersdata 'core' → default_panel) en
welke items in de zijbalk staan ('sidebar' → hiddenPanels/panelOrder). HA Family zet die per gezinslid:

- eenvoudig: alleen het gezinsdashboard (kinderen, gasten)
- normaal: gezin plus kalender, takenlijsten en kaart
- beheerder: gezin, 'Gezin beheren' en instellingen
- expert: gezin, 'Gezin beheren' en 'Admin'; in Admin al het andere (automatiseringen, dashboards, HACS en plugins)
- origineel: Home Assistant zoals het was

Wat er eerst stond, bewaren we, zodat 'origineel' of het verwijderen van HA Family alles terugzet. Komen er later nieuwe
items in de zijbalk (bv. via HACS), dan verbergen we die ook (event panels_updated)."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback

from .const import ADMIN_URL, BEHEER_URL, DASHBOARD_URL, MUUR_URL

_LOGGER = logging.getLogger(__name__)

WEERGAVEN = ["eenvoudig", "normaal", "beheerder", "expert", "origineel"]
ZICHTBAAR = {
    "eenvoudig": [DASHBOARD_URL],
    "normaal": [DASHBOARD_URL, "calendar", "todo", "map"],
    "beheerder": [DASHBOARD_URL, BEHEER_URL, "config"],
    "expert": [DASHBOARD_URL, BEHEER_URL, ADMIN_URL, "hacs"],
}
# Deze staan niet in de lijst van panelen of kunnen niet weg; nooit aanraken
NOOIT = {"profile", "notfound", "developer-tools-legacy"}


def standaard(rol: str, beheerder: bool) -> str:
    if beheerder:
        return "beheerder"
    return "eenvoudig" if rol in ("kind", "gast") else "normaal"


def _panelen(hass: HomeAssistant) -> list[str]:
    from homeassistant.components.frontend import DATA_PANELS

    return [p for p in hass.data.get(DATA_PANELS, {}) if p and p not in NOOIT]


async def _user_store(hass: HomeAssistant, user_id: str):
    from homeassistant.components.frontend.storage import async_user_store

    return await async_user_store(hass, user_id)


async def toepassen(gezin, lid: dict[str, Any]) -> None:
    """Startscherm en zijbalk van dit gezinslid zetten volgens zijn weergave."""
    hass: HomeAssistant = gezin.hass
    uid = gezin.user_id(lid)
    if not uid:
        return
    w = lid.get("weergave") or "normaal"
    store = await _user_store(hass, uid)
    data = store.data or {}
    origineel = gezin.data.setdefault("origineel", {})
    if w == "origineel":
        if uid in origineel:                      # terug naar hoe het was
            o = origineel.pop(uid)
            await store.async_set_item("core", o.get("core"))
            await store.async_set_item("sidebar", o.get("sidebar"))
            gezin.opslaan()
        return
    if uid not in origineel:
        origineel[uid] = {"core": data.get("core"), "sidebar": data.get("sidebar")}
        gezin.opslaan()
    lijst = list(ZICHTBAAR[w])
    if lid.get("dashboard"):                       # persoonlijk dashboard: direct onder het gezin
        lijst.insert(1, lid["dashboard"])
    zichtbaar = [p for p in lijst if p in _panelen(hass) or p == DASHBOARD_URL]
    verborgen = [p for p in _panelen(hass) if p not in zichtbaar]
    core = {**(data.get("core") or {}), "default_panel": DASHBOARD_URL}
    sidebar = {**(data.get("sidebar") or {}), "panelOrder": zichtbaar, "hiddenPanels": verborgen}
    if data.get("core") != core:
        await store.async_set_item("core", core)
    if data.get("sidebar") != sidebar:
        await store.async_set_item("sidebar", sidebar)


async def muur_toepassen(gezin) -> None:
    """Het muurscherm-account: het muurscherm als startscherm, verder niets in de zijbalk."""
    uid = (gezin.data.get("muur") or {}).get("user_id")
    if not uid:
        return
    store = await _user_store(gezin.hass, uid)
    data = store.data or {}
    core = {**(data.get("core") or {}), "default_panel": MUUR_URL}
    sidebar = {**(data.get("sidebar") or {}), "panelOrder": [MUUR_URL], "hiddenPanels": [p for p in _panelen(gezin.hass) if p != MUUR_URL]}
    if data.get("core") != core:
        await store.async_set_item("core", core)
    if data.get("sidebar") != sidebar:
        await store.async_set_item("sidebar", sidebar)


async def alles_toepassen(gezin) -> None:
    try:
        await muur_toepassen(gezin)
    except Exception:  # noqa: BLE001
        _LOGGER.exception("Weergave voor het muurscherm zetten mislukt")
    for lid in gezin.leden:
        try:
            await toepassen(gezin, lid)
        except Exception:  # noqa: BLE001 - één gebruiker mag de rest niet tegenhouden
            _LOGGER.exception("Weergave voor %s zetten mislukt", lid.get("naam"))


async def terugzetten(gezin, user_id: str | None = None) -> None:
    """Alles (of één gebruiker) terug naar hoe het was voor HA Family."""
    origineel = gezin.data.get("origineel", {})
    for uid in [user_id] if user_id else list(origineel):
        if uid not in origineel:
            continue
        o = origineel.pop(uid)
        try:
            store = await _user_store(gezin.hass, uid)
            await store.async_set_item("core", o.get("core"))
            await store.async_set_item("sidebar", o.get("sidebar"))
        except Exception:  # noqa: BLE001
            _LOGGER.exception("Weergave terugzetten mislukt")
    gezin.opslaan()


async def systeem_startscherm(gezin, aan: bool) -> None:
    """Gezinsdashboard als startscherm voor iedereen die zelf niets koos (ook nieuwe gebruikers en de keukentablet)."""
    from homeassistant.components.frontend.storage import async_system_store

    store = await async_system_store(gezin.hass)
    core = dict(store.data.get("core") or {}) if getattr(store, "data", None) else {}
    origineel = gezin.data.setdefault("origineel_systeem", {"bewaard": False})
    if aan:
        if not origineel.get("bewaard"):
            origineel.update(bewaard=True, default_panel=core.get("default_panel"))
            gezin.opslaan()
        if core.get("default_panel") != DASHBOARD_URL:
            await store.async_set_item("core", {**core, "default_panel": DASHBOARD_URL})
    elif origineel.get("bewaard"):
        oud = origineel.get("default_panel")
        nieuw = {k: v for k, v in core.items() if k != "default_panel"}
        if oud:
            nieuw["default_panel"] = oud
        await store.async_set_item("core", nieuw)
        gezin.data["origineel_systeem"] = {"bewaard": False}
        gezin.opslaan()


@callback
def volg_panelen(hass: HomeAssistant, gezin):
    """Nieuwe zijbalkitems (bv. na een HACS-installatie) meteen ook verbergen bij wie niet 'origineel' heeft."""
    async def _opnieuw(event: Event) -> None:
        await alles_toepassen(gezin)

    return hass.bus.async_listen("panels_updated", _opnieuw)
