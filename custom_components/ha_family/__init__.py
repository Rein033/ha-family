"""HA Family: Home Assistant voor het hele gezin (of huishouden), zonder dat je een geek hoeft te zijn.

Eén pakket met vier delen:
- Integrations: het gezin en straks per functie de gegevens (gezin.py, sensor.py);
- Management: het beheerpaneel 'Gezin beheren' met wizards (websocket.py + frontend/family-beheer.js);
- Cards: kaarten in één ontwerp (frontend/family-cards.js);
- Dashboard: het dashboard dat zichzelf opbouwt (strategie in frontend/family-cards.js)."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from . import herinnering, weergave, websocket
from .agenda import Agenda
from .taken import Taken, volg_meldingknoppen
from .const import BEHEER_COMPONENT, BEHEER_URL, CARDS_JS, CONF_DASHBOARD, CONF_STARTSCHERM, DASHBOARD_URL, DOMAIN, FRONTEND_URL, PLATFORMS
from .gezin import Gezin

_LOGGER = logging.getLogger(__name__)
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type FamilyEntry = ConfigEntry[Gezin]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    websocket.async_registreer(hass)
    return True


async def _frontend(hass: HomeAssistant) -> str | None:
    """Bestanden één keer per HA-start serveren; kaarten op elke pagina laden. Geeft de versie terug (voor de cache)."""
    if hass.http is None or "frontend" not in hass.config.components:
        return None
    versie = (await async_get_integration(hass, DOMAIN)).version
    if not hass.data.get(f"{DOMAIN}_frontend"):
        hass.data[f"{DOMAIN}_frontend"] = True
        await hass.http.async_register_static_paths([StaticPathConfig(FRONTEND_URL, str(Path(__file__).parent / "frontend"), True)])
        add_extra_js_url(hass, f"{FRONTEND_URL}/{CARDS_JS}?v={versie}")
    return versie


async def _beheer(hass: HomeAssistant, versie: str | None, aan: bool) -> None:
    """Paneel 'Gezin beheren' in de zijbalk, alleen voor beheerders."""
    if not aan:
        frontend.async_remove_panel(hass, BEHEER_URL, warn_if_unknown=False)
        return
    if versie is None or BEHEER_URL in hass.data.get(frontend.DATA_PANELS, {}):
        return
    from homeassistant.components import panel_custom

    await panel_custom.async_register_panel(hass, frontend_url_path=BEHEER_URL, webcomponent_name=BEHEER_COMPONENT,
                                            sidebar_title="Gezin beheren", sidebar_icon="mdi:account-cog",
                                            module_url=f"{FRONTEND_URL}/family-beheer.js?v={versie}", require_admin=True,
                                            config_panel_domain=DOMAIN)


async def _dashboard(hass: HomeAssistant, titel: str, aan: bool) -> None:
    """Dashboard in de zijbalk dat zichzelf opbouwt (strategie custom:ha-family). Met 'Overnemen' pas je het daarna zelf aan.
    Gebruikt de opslag van Lovelace zelf; lukt het niet (andere HA-versie), dan draait de rest gewoon door."""
    try:
        from homeassistant.components.lovelace.const import LOVELACE_DATA, ConfigNotFound
        from homeassistant.components.lovelace.dashboard import LovelaceStorage
    except ImportError:
        _LOGGER.warning("Dashboard kon niet automatisch worden toegevoegd (onbekende HA-versie)")
        return
    lovelace = hass.data.get(LOVELACE_DATA)
    if lovelace is None:
        return
    bestaand = lovelace.dashboards.get(DASHBOARD_URL)
    if not aan:
        if getattr(bestaand, "_ha_family", False):
            frontend.async_remove_panel(hass, DASHBOARD_URL, warn_if_unknown=False)
            lovelace.dashboards.pop(DASHBOARD_URL, None)
        return
    if bestaand is not None and not getattr(bestaand, "_ha_family", False):
        return                                   # de gebruiker heeft zelf al een dashboard op dit adres
    try:
        if bestaand is None:
            dash = LovelaceStorage(hass, {"id": DOMAIN, "url_path": DASHBOARD_URL, "title": titel, "icon": "mdi:home-heart",
                                          "show_in_sidebar": True, "require_admin": False, "mode": "storage"})
            dash._ha_family = True  # noqa: SLF001
            try:
                await dash.async_load(False)
            except ConfigNotFound:
                await dash.async_save({"strategy": {"type": "custom:ha-family"}})
            lovelace.dashboards[DASHBOARD_URL] = dash
        frontend.async_register_built_in_panel(hass, "lovelace", frontend_url_path=DASHBOARD_URL, sidebar_title=titel,
                                               sidebar_icon="mdi:home-heart", require_admin=False, config={"mode": "storage"},
                                               update=bestaand is not None)
    except Exception:  # noqa: BLE001
        _LOGGER.exception("Dashboard kon niet automatisch worden toegevoegd")


async def async_setup_entry(hass: HomeAssistant, entry: FamilyEntry) -> bool:
    gezin = Gezin(hass, entry)
    await gezin.async_load()
    gezin.agenda = Agenda(gezin)
    gezin.taken = Taken(gezin)
    entry.runtime_data = gezin
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(herinnering.start(hass, gezin.agenda))
    entry.async_on_unload(volg_meldingknoppen(hass, gezin.taken))
    versie = await _frontend(hass)
    await _beheer(hass, versie, True)
    opties = entry.options or entry.data
    await _dashboard(hass, gezin.naam, opties.get(CONF_DASHBOARD, True))
    # Van HA een gezinsapp maken: startscherm en zijbalk per gezinslid, en het gezin als startscherm voor iedereen
    if opties.get(CONF_DASHBOARD, True):
        await weergave.systeem_startscherm(gezin, opties.get(CONF_STARTSCHERM, True))
        await weergave.alles_toepassen(gezin)
        entry.async_on_unload(weergave.volg_panelen(hass, gezin))
    else:
        await weergave.systeem_startscherm(gezin, False)
        await weergave.terugzetten(gezin)
    entry.async_on_unload(entry.add_update_listener(_opnieuw))
    return True


async def _opnieuw(hass: HomeAssistant, entry: FamilyEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: FamilyEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        await entry.runtime_data.async_flush()
        await _beheer(hass, None, False)
        await _dashboard(hass, "", False)
    return ok


async def async_remove_entry(hass: HomeAssistant, entry: FamilyEntry) -> None:
    """Integratie verwijderd: startschermen en zijbalken terug zoals ze waren, en de gezinsgegevens weg.
    Personen en gebruikers blijven bestaan."""
    from homeassistant.helpers.storage import Store

    from .const import STORAGE_VERSION
    from .gezin import Gezin

    gezin = Gezin(hass, entry)
    await gezin.async_load()
    await weergave.terugzetten(gezin)
    await weergave.systeem_startscherm(gezin, False)
    await Store(hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}").async_remove()
