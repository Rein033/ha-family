"""Persoonlijk dashboard per gezinslid (HA-Family-Dashboard).

Een gezinslid krijgt een eigen dashboard: nieuw (HA Family maakt het, in Lovelace-opslag, gewoon te bewerken) of een
bestaand dashboard dat je koppelt (bijvoorbeeld het dashboard met je 3D-printers). In de zijbalk van dat gezinslid staat
het bovenaan; bij de anderen is het verborgen. Let op: Home Assistant kent geen dashboards per gebruiker, dus wie het
adres weet, kan het openen; verbergen is netheid, geen beveiliging."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.util import slugify

from .const import DOMAIN
from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)
ICOON = "mdi:account-star"


def _lovelace(hass: HomeAssistant):
    from homeassistant.components.lovelace.const import LOVELACE_DATA

    return hass.data.get(LOVELACE_DATA)


def beschikbaar(hass: HomeAssistant) -> list[dict[str, str]]:
    """Bestaande dashboards die je kunt koppelen (niet die van HA Family zelf)."""
    uit = []
    for p in hass.data.get(frontend.DATA_PANELS, {}).values():
        if p.component_name == "lovelace" and p.frontend_url_path and not p.frontend_url_path.startswith("gezin") and p.frontend_url_path != "map":
            uit.append({"url_path": p.frontend_url_path, "titel": p.sidebar_title or p.frontend_url_path})
    return sorted(uit, key=lambda x: x["titel"].lower())


async def _registreer(hass: HomeAssistant, lid: dict[str, Any], start: dict[str, Any] | None = None) -> None:
    from homeassistant.components.lovelace.const import ConfigNotFound
    from homeassistant.components.lovelace.dashboard import LovelaceStorage

    lovelace = _lovelace(hass)
    if lovelace is None:
        raise FamilyFout("Dashboards zijn (nog) niet beschikbaar in Home Assistant.")
    url, titel = lid["dashboard"], lid["naam"].split(" ")[0]
    dash = lovelace.dashboards.get(url)
    if dash is None:
        dash = LovelaceStorage(hass, {"id": f"{DOMAIN}_{lid['id']}", "url_path": url, "title": titel, "icon": ICOON,
                                      "show_in_sidebar": True, "require_admin": False, "mode": "storage"})
        dash._ha_family = True  # noqa: SLF001
        try:
            await dash.async_load(False)
        except ConfigNotFound:
            await dash.async_save(start or {"title": titel, "views": [{"title": titel, "path": "mijn", "type": "sections", "max_columns": 3, "sections": [
                {"type": "grid", "cards": [{"type": "markdown", "content": f"## 👋 Dit is het dashboard van {titel}\nKlik rechtsboven op ✏️ om je eigen kaarten toe te voegen."}]}]}]})
        lovelace.dashboards[url] = dash
    frontend.async_register_built_in_panel(hass, "lovelace", frontend_url_path=url, sidebar_title=titel, sidebar_icon=ICOON,
                                           require_admin=False, config={"mode": "storage"}, update=url in hass.data.get(frontend.DATA_PANELS, {}))


async def start(gezin) -> None:
    """Bij het opstarten: de dashboards die HA Family zelf maakte weer in de zijbalk."""
    for lid in gezin.leden:
        if lid.get("dashboard") and lid.get("dashboard_eigen"):
            try:
                await _registreer(gezin.hass, lid)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Persoonlijk dashboard van %s kon niet worden geladen", lid["naam"])


def stop(gezin) -> None:
    lovelace = _lovelace(gezin.hass)
    for lid in gezin.leden:
        if lid.get("dashboard") and lid.get("dashboard_eigen"):
            frontend.async_remove_panel(gezin.hass, lid["dashboard"], warn_if_unknown=False)
            if lovelace is not None:
                lovelace.dashboards.pop(lid["dashboard"], None)   # de inhoud blijft bewaard in de opslag


async def maken(gezin, lid: dict[str, Any], start_config: dict[str, Any] | None = None) -> dict[str, Any]:
    if lid.get("dashboard") and lid.get("dashboard_eigen"):
        return lid
    url = f"gezin-{slugify(lid['naam'].split(' ')[0]).replace('_', '-')}"
    bezet = {l.get("dashboard") for l in gezin.leden if l is not lid}
    n = 2
    basis = url
    while url in bezet or (url in gezin.hass.data.get(frontend.DATA_PANELS, {}) and not lid.get("dashboard") == url):
        url, n = f"{basis}-{n}", n + 1
    lid.update(dashboard=url, dashboard_eigen=True)
    await _registreer(gezin.hass, lid, start_config)
    gezin.opslaan()
    return lid


def koppelen(gezin, lid: dict[str, Any], url_path: str) -> dict[str, Any]:
    if url_path not in {d["url_path"] for d in beschikbaar(gezin.hass)}:
        raise FamilyFout("Dat dashboard bestaat niet (meer).")
    _los(gezin, lid)
    lid.update(dashboard=url_path, dashboard_eigen=False)
    gezin.opslaan()
    return lid


def _los(gezin, lid: dict[str, Any]) -> None:
    if lid.get("dashboard") and lid.get("dashboard_eigen"):
        frontend.async_remove_panel(gezin.hass, lid["dashboard"], warn_if_unknown=False)
        lovelace = _lovelace(gezin.hass)
        if lovelace is not None:
            lovelace.dashboards.pop(lid["dashboard"], None)


def loskoppelen(gezin, lid: dict[str, Any]) -> dict[str, Any]:
    _los(gezin, lid)
    lid.update(dashboard=None, dashboard_eigen=False)
    gezin.opslaan()
    return lid
