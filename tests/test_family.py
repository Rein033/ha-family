"""Tests voor HA Family: instellen, gezinsleden (met account), telefoons, weergave en terugzetten."""
from __future__ import annotations

import pytest

from homeassistant.components.frontend.storage import async_setup_frontend_storage, async_system_store, async_user_store
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ha_family.const import DOMAIN
from custom_components.ha_family.gezin import FamilyFout, wachtwoord_voorstel


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


@pytest.fixture
async def gezin(hass: HomeAssistant, local_auth, hass_owner_user):
    hass.config.language = "nl"
    assert await async_setup_component(hass, "person", {})
    await async_setup_frontend_storage(hass)
    entry = MockConfigEntry(domain=DOMAIN, title="Familie Jansen", data={"naam": "Familie Jansen", "type": "gezin", "dashboard": True, "startscherm": True})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "person", {})
    r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert r["type"] is FlowResultType.FORM
    r = await hass.config_entries.flow.async_configure(r["flow_id"], {"naam": " Familie Jansen ", "type": "huishouden", "dashboard": False, "startscherm": False})
    assert r["type"] is FlowResultType.CREATE_ENTRY
    assert r["title"] == "Familie Jansen"
    assert r["data"]["type"] == "huishouden"


async def test_lid_met_account(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    lid = await g.lid_toevoegen("Noor", "ouder", inloggen=True, gebruikersnaam="noor", wachtwoord="maan-tulp-vos-42")
    await hass.async_block_till_done()
    assert lid["person"] == "person.noor"
    uid = g.user_id(lid)
    user = await hass.auth.async_get_user(uid)
    assert user.name == "Noor" and not user.is_admin
    assert await g.gebruikersnaam(lid) == "noor"
    # zelfde naam of gebruikersnaam nog eens: nette fout
    with pytest.raises(FamilyFout):
        await g.lid_toevoegen("Noor", "ouder")
    with pytest.raises(FamilyFout):
        await g.lid_toevoegen("Noor2", "ouder", inloggen=True, gebruikersnaam="noor", wachtwoord="geheim123")
    # sensor
    s = hass.states.get("sensor.familie_jansen_gezin")
    assert s.state == "1" and s.attributes["leden"][0]["naam"] == "Noor"


async def test_kind_zonder_account_en_bestaande_persoon(hass: HomeAssistant, gezin, hass_admin_user) -> None:
    g = gezin.runtime_data
    emma = await g.lid_toevoegen("Emma", "kind")
    assert g.user_id(emma) is None
    from homeassistant.components.person import async_create_person

    await async_create_person(hass, "Sam", user_id=hass_admin_user.id)
    await hass.async_block_till_done()
    assert [p["person"] for p in g.losse_personen()] == ["person.sam"]
    sam = g.persoon_toevoegen("person.sam", "ouder")
    assert g.losse_personen() == []
    assert len({emma["kleur"], sam["kleur"]}) == 2            # ieder een eigen kleur


async def test_weergave_en_terugzetten(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    lid = await g.lid_toevoegen("Noor", "ouder", inloggen=True, gebruikersnaam="noor", wachtwoord="maan-tulp-vos-42")
    uid = g.user_id(lid)
    store = await async_user_store(hass, uid)
    await store.async_set_item("core", {"default_panel": "lovelace", "iets": 1})
    await g.weergave_zetten(lid)
    assert lid["weergave"] == "normaal"
    assert store.data["core"] == {"default_panel": "gezin", "iets": 1}
    assert store.data["sidebar"]["panelOrder"][0] == "gezin"
    # expert: terug naar hoe het was
    g.lid_bijwerken(lid["id"], weergave="expert")
    await g.weergave_zetten(lid)
    assert store.data["core"] == {"default_panel": "lovelace", "iets": 1}
    # systeemstartscherm staat aan, en gaat terug bij verwijderen
    assert (await async_system_store(hass)).data["core"]["default_panel"] == "gezin"
    g.lid_bijwerken(lid["id"], weergave="eenvoudig")
    await g.weergave_zetten(lid)
    assert store.data["core"]["default_panel"] == "gezin"
    await hass.config_entries.async_remove(gezin.entry_id)
    await hass.async_block_till_done()
    assert store.data["core"] == {"default_panel": "lovelace", "iets": 1}
    assert "default_panel" not in (await async_system_store(hass)).data.get("core", {})


async def test_telefoon_gevonden(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    lid = await g.lid_toevoegen("Noor", "ouder", inloggen=True, gebruikersnaam="noor", wachtwoord="maan-tulp-vos-42")
    MockConfigEntry(domain="mobile_app", title="iPhone van Noor", data={"user_id": g.user_id(lid), "device_name": "iPhone van Noor"}).add_to_hass(hass)
    tel = g.telefoons(lid)
    assert tel[0]["notify"] == "mobile_app_iphone_van_noor"
    status = await g.status()
    assert status["leden"][0]["telefoons"][0]["naam"] == "iPhone van Noor"


async def test_websocket_alleen_beheerder(hass: HomeAssistant, gezin, hass_ws_client, hass_read_only_access_token) -> None:
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "ha_family/lid/toevoegen", "naam": "Daan", "rol": "kind"})
    r = await ws.receive_json()
    assert r["success"], r
    await ws.send_json({"id": 2, "type": "ha_family/gezin"})
    r = await ws.receive_json()
    assert r["result"]["leden"][0]["naam"] == "Daan"
    ws2 = await hass_ws_client(hass, hass_read_only_access_token)
    await ws2.send_json({"id": 1, "type": "ha_family/lid/toevoegen", "naam": "Mia", "rol": "kind"})
    r = await ws2.receive_json()
    assert not r["success"] and r["error"]["code"] == "unauthorized"


def test_wachtwoord_voorstel() -> None:
    w = wachtwoord_voorstel()
    assert w.count("-") == 3 and len(w) >= 10
