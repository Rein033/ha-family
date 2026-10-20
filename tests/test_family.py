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
    # expert: eigen zijmenu met Admin, de rest staat verborgen (en in het Admin-paneel)
    g.lid_bijwerken(lid["id"], weergave="expert")
    await g.weergave_zetten(lid)
    assert store.data["sidebar"]["panelOrder"][0] == "gezin"
    assert "calendar" in store.data["sidebar"]["hiddenPanels"] and "gezin-admin" not in store.data["sidebar"]["hiddenPanels"]
    # zoals het was: terug naar hoe het was
    g.lid_bijwerken(lid["id"], weergave="origineel")
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


async def test_agenda_afspraken_en_herhaling(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    noor = await g.lid_toevoegen("Noor", "ouder")
    emma = await g.lid_toevoegen("Emma", "kind")
    a = g.agenda.afspraak({"titel": "Zwemles", "start": "2030-01-07T16:00", "eind": "2030-01-07T17:00", "wie": [emma["id"], "onbekend"], "herhaal": "week"}, noor["id"])
    assert a["wie"] == [emma["id"]] and a["hele_dag"] is False
    import datetime as dt
    ev = g.agenda.eigen_events(dt.date(2030, 1, 1), dt.date(2030, 2, 1))
    assert [e["start"] for e in ev] == ["2030-01-07T16:00", "2030-01-14T16:00", "2030-01-21T16:00", "2030-01-28T16:00"]
    with pytest.raises(FamilyFout):
        g.agenda.afspraak({"titel": "", "start": "2030-01-07"})
    with pytest.raises(FamilyFout):
        g.agenda.afspraak({"titel": "Raar", "start": "2030-01-07T16:00", "eind": "2030-01-07T15:00"})
    # ook zichtbaar als agenda-entiteit
    await hass.async_block_till_done()
    r = await hass.services.async_call("calendar", "get_events", {"start_date_time": "2030-01-01 00:00:00", "end_date_time": "2030-01-15 00:00:00"},
                                       target={"entity_id": "calendar.familie_jansen_gezinsagenda"}, blocking=True, return_response=True)
    evs = r["calendar.familie_jansen_gezinsagenda"]["events"]
    assert len(evs) == 2 and "Emma" in evs[0]["description"]
    g.agenda.afspraak_weg(a["id"])
    assert g.agenda.eigen_events(dt.date(2030, 1, 1), dt.date(2030, 2, 1)) == []


async def test_verjaardagen(hass: HomeAssistant, gezin) -> None:
    import datetime as dt
    g = gezin.runtime_data
    emma = await g.lid_toevoegen("Emma", "kind")
    g.lid_bijwerken(emma["id"], geboortedatum="2018-03-14")
    g.agenda.verjaardag("Opa", "1951-07-02")
    g.agenda.verjaardag("Buurman", "11-30")                 # zonder jaar
    ev = {e["naam"]: e for e in g.agenda.verjaardag_events(dt.date(2030, 1, 1), dt.date(2031, 1, 1))}
    assert ev["Emma"]["titel"] == "🎂 Emma wordt 12" and ev["Emma"]["wie"] == [emma["id"]]
    assert ev["Opa"]["leeftijd"] == 79
    assert ev["Buurman"]["titel"] == "🎂 Buurman is jarig"
    with pytest.raises(FamilyFout):
        g.lid_bijwerken(emma["id"], geboortedatum="14-03-2018")


async def test_afval_schema_sensor_en_herinnering(hass: HomeAssistant, gezin) -> None:
    import datetime as dt
    from homeassistant.util import dt as dt_util
    from custom_components.ha_family import herinnering

    g = gezin.runtime_data
    vandaag = dt_util.now().date()
    g.agenda.afval_instellen(schema=[{"soort": "gft", "start": (vandaag - dt.timedelta(days=13)).isoformat(), "weken": 2},
                                     {"soort": "papier", "start": (vandaag + dt.timedelta(days=5)).isoformat(), "weken": 4}])
    ev = g.agenda.afval_schema_events(vandaag, vandaag + dt.timedelta(days=29))
    assert [(e["afval"], e["start"]) for e in ev][:2] == [("gft", (vandaag + dt.timedelta(days=1)).isoformat()), ("papier", (vandaag + dt.timedelta(days=5)).isoformat())]
    await hass.async_block_till_done()
    s = hass.states.get("sensor.familie_jansen_volgende_afval")
    assert s.state == "GFT" and s.attributes["wanneer"] == "morgen"
    # herinnering: melding naar wie een telefoon heeft
    noor = await g.lid_toevoegen("Noor", "ouder", inloggen=True, gebruikersnaam="noor", wachtwoord="maan-tulp-vos-42")
    meldingen = []
    hass.services.async_register("notify", "mobile_app_iphone_van_noor", lambda call: meldingen.append(call.data))
    MockConfigEntry(domain="mobile_app", data={"user_id": g.user_id(noor), "device_name": "iPhone van Noor"}).add_to_hass(hass)
    assert await herinnering.afval_herinnering(g.agenda, dt_util.now()) == 1
    assert "GFT" in meldingen[0]["message"]
    with pytest.raises(FamilyFout):
        g.agenda.afval_instellen(schema=[{"soort": "kernafval", "start": "2030-01-01"}])


async def test_agenda_samengevoegd_met_kleur_per_lid(hass: HomeAssistant, gezin) -> None:
    import datetime as dt
    g = gezin.runtime_data
    emma = await g.lid_toevoegen("Emma", "kind")
    g.lid_bijwerken(emma["id"], geboortedatum="2018-03-14")
    noor = await g.lid_toevoegen("Noor", "ouder")
    # de verjaardagenagenda als 'eigen agenda' van Noor gebruiken: dan krijgen die afspraken Noors kleur
    g.agenda.lid_agendas(noor["id"], ["calendar.familie_jansen_verjaardagen"])
    await hass.async_block_till_done()
    ev = await g.agenda.events(dt.date(2030, 3, 1), dt.date(2030, 4, 1))
    van_noor = [e for e in ev if e["soort"] == "agenda"]
    assert van_noor and van_noor[0]["wie"] == [noor["id"]] and van_noor[0]["bron"] == "calendar.familie_jansen_verjaardagen"
    assert any(e["soort"] == "verjaardag" for e in ev)


async def test_websocket_bewerken_en_agenda(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    """Velden heten 'lid'/'afspraak', niet 'id': dat is in het websocket-protocol het nummer van het bericht."""
    ws = await hass_ws_client(hass)
    n = iter(range(1, 100))

    async def stuur(**m):
        await ws.send_json({"id": next(n), **m})
        r = await ws.receive_json()
        assert r["success"], r
        return r["result"]

    lid = await stuur(type="ha_family/lid/toevoegen", naam="Emma", rol="kind")
    bij = await stuur(type="ha_family/lid/bijwerken", lid=lid["id"], geboortedatum="2018-03-14", emoji="🦄")
    assert bij["geboortedatum"] == "2018-03-14" and bij["emoji"] == "🦄"
    a = await stuur(type="ha_family/agenda/afspraak", titel="Zwemles", start="2030-01-07T16:00", wie=[lid["id"]], herhaal="week")
    a2 = await stuur(type="ha_family/agenda/afspraak", afspraak=a["id"], titel="Zwemles (diploma A)", start="2030-01-07T16:00", wie=[lid["id"]])
    assert a2["id"] == a["id"] and a2["herhaal"] == ""
    ev = await stuur(type="ha_family/agenda", van="2030-01-01", tot="2030-02-01")
    assert [e["titel"] for e in ev["events"] if e["soort"] == "afspraak"] == ["Zwemles (diploma A)"]
    await stuur(type="ha_family/agenda/afspraak_weg", afspraak=a["id"])
    v = await stuur(type="ha_family/agenda/verjaardag", naam="Opa", datum="1951-07-02")
    await stuur(type="ha_family/agenda/verjaardag_weg", verjaardag=v["id"])
    await stuur(type="ha_family/lid/verwijderen", lid=lid["id"])
    assert (await stuur(type="ha_family/gezin"))["leden"] == []


async def _kind(hass: HomeAssistant, g, naam="Emma"):
    """Gezinslid 'kind' met een eigen (gewone) gebruiker en een websocket-token."""
    lid = await g.lid_toevoegen(naam, "kind", inloggen=True, gebruikersnaam=naam.lower(), wachtwoord="maan-tulp-vos-42")
    user = await hass.auth.async_get_user(g.user_id(lid))
    refresh = await hass.auth.async_create_refresh_token(user, "https://example.com/")
    return lid, user, hass.auth.async_create_access_token(refresh)


async def test_klusjes_goedkeuren_en_punten(hass: HomeAssistant, gezin, hass_admin_user) -> None:
    from homeassistant.core import Context
    from homeassistant.util import dt as dt_util

    g = gezin.runtime_data
    emma, emma_user, _ = await _kind(hass, g)
    vandaag = dt_util.now().date()
    k = g.taken.klusje({"titel": "Tafel dekken", "emoji": "🍽️", "punten": 3, "wie": [emma["id"]], "dagen": list(range(7)), "goedkeuren": True})
    lijst = g.taken.klusjes_vandaag()
    assert [(x["titel"], x["status"]) for x in lijst] == [("Tafel dekken", "open")]
    # Emma vinkt af: wacht op goedkeuring, nog geen punten
    s = await g.taken.klusje_gedaan(k["id"], emma["id"], vandaag.isoformat(), emma_user.id)
    assert s["status"] == "wacht" and g.taken.saldo(emma["id"]) == 0
    assert g.taken.wacht_op_ouder()[0]["titel"] == "Tafel dekken"
    # ouder keurt goed via de knop in de melding (event van de app, met de gebruiker van de ouder)
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"HA_FAMILY|klusje|{vandaag.isoformat()}|{k['id']}|{emma['id']}|ok"},
                        context=Context(user_id=hass_admin_user.id))
    await hass.async_block_till_done()
    assert g.taken.saldo(emma["id"]) == 3 and g.taken.wacht_op_ouder() == []
    # nog een keer afvinken telt niet dubbel
    await g.taken.klusje_gedaan(k["id"], emma["id"], vandaag.isoformat(), emma_user.id)
    assert g.taken.saldo(emma["id"]) == 3
    # beloning: te weinig, dan genoeg
    b = g.taken.beloning({"titel": "Film kiezen", "emoji": "🎬", "punten": 5})
    with pytest.raises(FamilyFout):
        await g.taken.inwisselen(b["id"], emma["id"], emma_user.id)
    await g.taken.punten_geven(emma["id"], 4, "Goed geholpen", hass_admin_user.id)
    p = await g.taken.inwisselen(b["id"], emma["id"], emma_user.id)
    assert p["status"] == "wacht" and g.taken.saldo(emma["id"]) == 7 and g.taken.beschikbaar(emma["id"]) == 2
    await g.taken.beloning_goedkeuren(p["id"], True, hass_admin_user.id)
    assert g.taken.saldo(emma["id"]) == 2
    # een kind kan geen punten geven of goedkeuren
    with pytest.raises(FamilyFout):
        await g.taken.punten_geven(emma["id"], 100, "", emma_user.id)


async def test_kind_mag_geen_klusjes_maken(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    g = gezin.runtime_data
    emma, _, token = await _kind(hass, g)
    ws = await hass_ws_client(hass, token)
    await ws.send_json({"id": 1, "type": "ha_family/klusje", "titel": "Snoep halen", "punten": 100, "wie": [emma["id"]], "dagen": [0]})
    r = await ws.receive_json()
    assert not r["success"] and "ouder" in r["error"]["message"]
    await ws.send_json({"id": 2, "type": "ha_family/klusjes"})
    r = await ws.receive_json()
    assert r["success"] and r["result"]["ik"] == emma["id"] and r["result"]["ouder"] is False


async def test_boodschappen_en_taken_als_todo(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    noor = await g.lid_toevoegen("Noor", "ouder")
    await hass.async_block_till_done()
    await hass.services.async_call("todo", "add_item", {"item": "wc-papier, tomaten, melk"}, target={"entity_id": "todo.familie_jansen_boodschappen"}, blocking=True)
    await hass.services.async_call("todo", "add_item", {"item": "melk"}, target={"entity_id": "todo.familie_jansen_boodschappen"}, blocking=True)
    r = await hass.services.async_call("todo", "get_items", {}, target={"entity_id": "todo.familie_jansen_boodschappen"}, blocking=True, return_response=True)
    assert [i["summary"] for i in r["todo.familie_jansen_boodschappen"]["items"]] == ["tomaten", "melk", "wc-papier"]
    g.taken.taak({"titel": "Paspoort verlengen", "wie": [noor["id"]], "deadline": "2030-02-01"}, None)
    await hass.async_block_till_done()
    r = await hass.services.async_call("todo", "get_items", {}, target={"entity_id": "todo.familie_jansen_taken"}, blocking=True, return_response=True)
    item = r["todo.familie_jansen_taken"]["items"][0]
    assert item["summary"] == "Paspoort verlengen" and item["description"] == "Voor: Noor" and item["due"] == "2030-02-01"
    await hass.services.async_call("todo", "update_item", {"item": "Paspoort verlengen", "status": "completed"}, target={"entity_id": "todo.familie_jansen_taken"}, blocking=True)
    t = g.data["taken"][0]
    assert t["klaar"] and t["wie"] == [noor["id"]]          # 'voor wie' blijft bewaard


async def test_puntensensor_ook_voor_nieuw_lid(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    await g.lid_toevoegen("Daan", "kind")
    await hass.async_block_till_done()
    s = hass.states.get("sensor.familie_jansen_punten_daan")
    assert s is not None and s.state == "0"


async def test_account_later_aanmaken(hass: HomeAssistant, gezin) -> None:
    g = gezin.runtime_data
    emma = await g.lid_toevoegen("Emma", "kind")
    assert g.user_id(emma) is None
    await g.account_aanmaken(emma["id"], "emma", "maan-tulp-vos-42")
    uid = g.user_id(emma)
    assert uid and (await hass.auth.async_get_user(uid)).name == "Emma"
    assert await g.gebruikersnaam(emma) == "emma"
    with pytest.raises(FamilyFout):
        await g.account_aanmaken(emma["id"], "emma2", "maan-tulp-vos-42")


async def test_muurscherm_account_en_rechten(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    from homeassistant.util import dt as dt_util

    from custom_components.ha_family import muur

    g = gezin.runtime_data
    emma = await g.lid_toevoegen("Emma", "kind")
    m = await muur.aanmaken(g, "muur", "maan-tulp-vos-42")
    user = await hass.auth.async_get_user(m["user_id"])
    assert user.local_only and not user.is_admin and user.name == "Muurscherm"
    store = await async_user_store(hass, user.id)
    assert store.data["core"]["default_panel"] == "gezin-muur"
    with pytest.raises(FamilyFout):
        await muur.aanmaken(g, "muur2", "maan-tulp-vos-42")
    # klusje voor Emma afvinken vanaf de muur: als het kind zelf, dus met goedkeuring
    k = g.taken.klusje({"titel": "Tafel dekken", "punten": 2, "wie": [emma["id"]], "dagen": list(range(7)), "goedkeuren": True})
    s = await g.taken.klusje_gedaan(k["id"], emma["id"], dt_util.now().date().isoformat(), user.id)
    assert s["status"] == "wacht" and g.taken.saldo(emma["id"]) == 0
    # de muur mag niets beheren
    refresh = await hass.auth.async_create_refresh_token(user, "https://example.com/")
    ws = await hass_ws_client(hass, hass.auth.async_create_access_token(refresh))
    await ws.send_json({"id": 1, "type": "ha_family/klusje", "titel": "Snoep", "punten": 99, "wie": [emma["id"]], "dagen": [0]})
    assert not (await ws.receive_json())["success"]
    await ws.send_json({"id": 2, "type": "ha_family/muur"})
    r = await ws.receive_json()
    assert r["result"]["ben_muur"] is True and r["result"]["heeft_account"] is True
    await ws.send_json({"id": 3, "type": "ha_family/boodschap", "tekst": "melk"})
    assert (await ws.receive_json())["success"]                  # boodschappen toevoegen mag wel
    # instellingen
    muur.bijwerken(g, {"nacht": {"aan": True, "van": "23:00", "tot": "07:00"}, "blokken": {"agenda": False}})
    assert muur.openbaar(g)["nacht"]["van"] == "23:00" and muur.openbaar(g)["blokken"]["agenda"] is False
    with pytest.raises(FamilyFout):
        muur.bijwerken(g, {"nacht": {"aan": True, "van": "laat", "tot": "07:00"}})
    await muur.verwijderen(g)
    assert await hass.auth.async_get_user(user.id) is None


async def test_maaltijden(hass: HomeAssistant, gezin) -> None:
    import datetime as dt

    from homeassistant.util import dt as dt_util

    from custom_components.ha_family.maaltijden import boodschap_van, lees_recept

    g = gezin.runtime_data
    m = g.maaltijden
    assert m.startpakket() == 10 and m.startpakket() == 0          # niet dubbel
    spag = next(r for r in g.data["recepten"] if r["naam"] == "Spaghetti bolognese")
    noor = await g.lid_toevoegen("Noor", "ouder")
    vandaag = dt_util.now().date()
    m.plan(vandaag.isoformat(), recept=spag["id"], kok=noor["id"])
    m.plan((vandaag + dt.timedelta(days=1)).isoformat(), tekst="Restjes")
    menu = m.menu(vandaag, 3)
    assert [x["naam"] for x in menu] == ["Spaghetti bolognese", "Restjes", None] and menu[0]["kok"] == noor["id"]
    await hass.async_block_till_done()
    s = hass.states.get("sensor.familie_jansen_eten_vandaag")
    assert s.state == "Spaghetti bolognese" and s.attributes["kok"] == "Noor" and s.attributes["morgen"] == "Restjes"
    # ingrediënten zonder hoeveelheden naar de boodschappen, niet dubbel
    r = m.naar_boodschappen(van=vandaag.isoformat(), dagen=7)
    assert "gehakt" in r["nieuw"] and "spaghetti" in r["nieuw"] and "knoflook" in r["nieuw"]
    assert m.naar_boodschappen(recept=spag["id"])["nieuw"] == []
    gehakt = next(b for b in g.data["boodschappen"] if b["titel"] == "gehakt")
    assert gehakt["afdeling"] == "vlees"
    assert boodschap_van("2 tenen knoflook") == "knoflook" and boodschap_van("1 blik tomatenblokjes") == "tomatenblokjes"
    assert boodschap_van("250 ml slagroom (koud)") == "slagroom"
    # leegmaken
    m.plan((vandaag + dt.timedelta(days=1)).isoformat())
    assert m.menu(vandaag, 2)[1]["naam"] is None
    # suggestie: niet wat er net op stond
    assert m.suggestie()["id"] != spag["id"] or len(g.data["recepten"]) == 1
    # importeren uit JSON-LD
    pagina = """<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},
      {"@type":"Recipe","name":"Shakshuka","recipeYield":"2 personen","recipeIngredient":["4 eieren","1 blik tomaten","1 ui"],
       "recipeInstructions":[{"@type":"HowToStep","text":"Fruit de ui."},{"@type":"HowToStep","text":"Voeg tomaten en eieren toe."}],
       "image":{"url":"https://example.com/s.jpg"}}]}</script></html>"""
    rec = lees_recept(pagina)
    assert rec["naam"] == "Shakshuka" and rec["personen"] == 2 and rec["ingredienten"][0] == "4 eieren"
    assert rec["bereiding"].startswith("1. Fruit de ui.") and rec["afbeelding"] == "https://example.com/s.jpg"
    assert lees_recept("<html>geen recept</html>") is None
    m.recept_weg(spag["id"])
    assert m.vandaag()["naam"] is None


async def test_kamers_en_apparaten(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

    entreg, devreg = er.async_get(hass), dr.async_get(hass)
    bron = MockConfigEntry(domain="test")
    bron.add_to_hass(hass)
    dev = devreg.async_get_or_create(config_entry_id=bron.entry_id, identifiers={("test", "lamp")}, name="Lamp")
    lamp = entreg.async_get_or_create("light", "test", "lamp1", device_id=dev.id, suggested_object_id="plafond")
    hass.states.async_set(lamp.entity_id, "off", {"friendly_name": "Plafondlamp"})
    hass.states.async_set("light.zonder_id", "on", {"friendly_name": "Losse lamp"})
    cfg = entreg.async_get_or_create("switch", "test", "cfg", entity_category=er.EntityCategory.CONFIG)
    hass.states.async_set(cfg.entity_id, "on")

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ha_family/kamer", "naam": "Woonkamer", "icoon": "mdi:sofa"})
    k = (await client.receive_json())["result"]["kamer"]
    await client.send_json_auto_id({"type": "ha_family/kamer", "naam": "woonkamer"})
    assert (await client.receive_json())["error"]["code"] == "ha_family_fout"       # dubbele naam

    # apparaat zit via zijn device al in een andere kamer; verplaatsen gaat via de entiteit
    keuken = ar.async_get(hass).async_create("Keuken")
    devreg.async_update_device(dev.id, area_id=keuken.id)
    o = gezin.runtime_data.huis.overzicht()
    rij = next(a for a in o["apparaten"] if a["entity"] == lamp.entity_id)
    assert rij["kamer"] == keuken.id and rij["via_apparaat"]
    assert not next(a for a in o["apparaten"] if a["entity"] == "light.zonder_id")["kan"]
    assert cfg.entity_id not in {a["entity"] for a in o["apparaten"]}

    await client.send_json_auto_id({"type": "ha_family/kamer/apparaat", "entity": lamp.entity_id, "kamer": k})
    assert (await client.receive_json())["success"]
    assert entreg.async_get(lamp.entity_id).area_id == k
    await client.send_json_auto_id({"type": "ha_family/kamer/apparaat", "entity": lamp.entity_id, "kamer": None})
    assert (await client.receive_json())["success"]
    assert next(a for a in gezin.runtime_data.huis.overzicht()["apparaten"] if a["entity"] == lamp.entity_id)["kamer"] is None

    await client.send_json_auto_id({"type": "ha_family/huis/instellingen", "verborgen": [keuken.id]})
    assert (await client.receive_json())["success"]
    assert next(x for x in gezin.runtime_data.huis.overzicht()["kamers"] if x["kamer"] == keuken.id)["verborgen"]
    await client.send_json_auto_id({"type": "ha_family/kamer/weg", "kamer": k})
    assert (await client.receive_json())["success"]
    assert ar.async_get(hass).async_get_area(k) is None


async def test_schakelaars_van_airco_zijn_bijzaak(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    from homeassistant.helpers import device_registry as dr, entity_registry as er

    entreg, devreg = er.async_get(hass), dr.async_get(hass)
    bron = MockConfigEntry(domain="test")
    bron.add_to_hass(hass)
    dev = devreg.async_get_or_create(config_entry_id=bron.entry_id, identifiers={("test", "airco")}, name="Airco")
    ac = entreg.async_get_or_create("climate", "test", "ac", device_id=dev.id, suggested_object_id="airco")
    slot = entreg.async_get_or_create("switch", "test", "slot", device_id=dev.id, suggested_object_id="airco_kinderslot")
    los = entreg.async_get_or_create("switch", "test", "stekker", suggested_object_id="kerstboom")
    for e in (ac, slot, los):
        hass.states.async_set(e.entity_id, "off")
    huis = gezin.runtime_data.huis
    rij = {a["entity"]: a for a in huis.overzicht()["apparaten"]}
    assert rij[slot.entity_id]["bijzaak"] and not rij[slot.entity_id]["tonen"]
    assert rij[ac.entity_id]["tonen"] and rij[los.entity_id]["tonen"]

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ha_family/apparaat/tonen", "entity": slot.entity_id, "tonen": True})
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "ha_family/apparaat/tonen", "entity": los.entity_id, "tonen": False})
    assert (await client.receive_json())["success"]
    rij = {a["entity"]: a for a in huis.overzicht()["apparaten"]}
    assert rij[slot.entity_id]["tonen"] and not rij[los.entity_id]["tonen"]


async def test_bestaande_persoon_met_account_houdt_zijn_ha(hass: HomeAssistant, gezin, hass_ws_client, hass_admin_user) -> None:
    from homeassistant.components import person

    await person.async_create_person(hass, "Papa", user_id=hass_admin_user.id)
    await hass.async_block_till_done()
    store = await async_user_store(hass, hass_admin_user.id)
    voor = dict(store.data or {})
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ha_family/lid/persoon", "person": "person.papa", "rol": "ouder"})
    r = await client.receive_json()
    assert r["success"], r
    assert r["result"]["weergave"] == "origineel"
    assert (store.data or {}).get("sidebar") == voor.get("sidebar")


async def test_lampgroepen_en_samenvoegen(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

    entreg, devreg, areas = er.async_get(hass), dr.async_get(hass), ar.async_get(hass)
    bron = MockConfigEntry(domain="test")
    bron.add_to_hass(hass)
    keuken, kitchen = areas.async_create("Keuken"), areas.async_create("Kitchen")
    l1 = entreg.async_get_or_create("light", "test", "l1", suggested_object_id="bol_1")
    g1 = entreg.async_get_or_create("light", "test", "g1", suggested_object_id="keuken_2")
    g2 = entreg.async_get_or_create("light", "test", "g2", suggested_object_id="kitchen")
    entreg.async_update_entity(g1.entity_id, area_id=keuken.id)
    for e in (l1,):
        hass.states.async_set(e.entity_id, "on")
    for g in (g1, g2):                                   # echte Hue geeft een set of tuple, geen lijst
        hass.states.async_set(g.entity_id, "on", {"entity_id": {l1.entity_id} if g is g1 else (l1.entity_id,), "is_hue_group": True})
    sensor = entreg.async_get_or_create("sensor", "test", "temp", suggested_object_id="keuken_temp")
    entreg.async_update_entity(sensor.entity_id, area_id=kitchen.id)
    dev = devreg.async_get_or_create(config_entry_id=bron.entry_id, identifiers={("test", "k")}, name="Koelkast")
    devreg.async_update_device(dev.id, area_id=kitchen.id)

    rij = {a["entity"]: a for a in gezin.runtime_data.huis.overzicht()["apparaten"]}
    assert rij[g1.entity_id]["tonen"]                       # de groep met een kamer
    assert not rij[g2.entity_id]["tonen"]                   # dezelfde lampen nog een keer
    assert not rij[l1.entity_id]["tonen"]                   # lamp die in een groep zit

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ha_family/kamer/samenvoegen", "van": kitchen.id, "naar": keuken.id})
    r = await client.receive_json()
    assert r["success"] and r["result"]["verplaatst"] == 2
    assert entreg.async_get(sensor.entity_id).area_id == keuken.id
    assert devreg.async_get(dev.id).area_id == keuken.id
    assert areas.async_get_area(kitchen.id) is None

    await client.send_json_auto_id({"type": "ha_family/kamer", "kamer": keuken.id, "naam": "Keuken!"})
    assert (await client.receive_json())["success"]
    areas.async_update(keuken.id, icon="mdi:stove")
    await client.send_json_auto_id({"type": "ha_family/kamer", "kamer": keuken.id, "naam": "Keuken"})
    assert (await client.receive_json())["success"]
    assert areas.async_get_area(keuken.id).icon == "mdi:stove"   # hernoemen laat het icoon staan


async def test_verlanglijstjes_en_stiekem_kopen(hass: HomeAssistant, gezin, hass_ws_client, hass_admin_user, hass_owner_user) -> None:
    from homeassistant.components import person

    g = gezin.runtime_data
    await person.async_create_person(hass, "Ouder", user_id=hass_owner_user.id)
    await person.async_create_person(hass, "Romy", user_id=hass_admin_user.id)
    await hass.async_block_till_done()
    ouder = g.persoon_toevoegen("person.ouder", "ouder")
    romy = g.persoon_toevoegen("person.romy", "kind")
    g.lid_bijwerken(romy["id"], geboortedatum="2012-06-01", geslacht="vrouw", interesses=["paarden", "tekenen", "paarden"])
    assert g.lid(romy["id"])["interesses"] == ["paarden", "tekenen"]

    romy_ws = await hass_ws_client(hass)                 # hass_admin_user = Romy
    await romy_ws.send_json_auto_id({"type": "ha_family/wens", "titel": "Rijlaarzen", "prijs": "49,95", "link": "https://example.com/laarzen"})
    w = (await romy_ws.receive_json())["result"]
    assert w["lid"] == romy["id"] and w["prijs"] == 49.95
    await romy_ws.send_json_auto_id({"type": "ha_family/wens", "titel": "x", "link": "javascript:alert(1)"})
    assert (await romy_ws.receive_json())["error"]["code"] == "ha_family_fout"
    await romy_ws.send_json_auto_id({"type": "ha_family/wens/kopen", "wens": w["id"], "gekocht": True})
    assert (await romy_ws.receive_json())["error"]["code"] == "ha_family_fout"      # eigen wens niet afvinken

    # de ouder koopt het stiekem; Romy ziet daar niets van
    g.cadeaus.kopen(w["id"], ouder["id"], True)
    await romy_ws.send_json_auto_id({"type": "ha_family/cadeaus"})
    o = (await romy_ws.receive_json())["result"]
    assert "gekocht" not in o["lijsten"][romy["id"]][0] and "gekocht_door" not in o["lijsten"][romy["id"]][0]
    ouder_zicht = g.cadeaus.overzicht(ouder)["lijsten"][romy["id"]][0]
    assert ouder_zicht["gekocht"] and ouder_zicht["door_mij"]

    # ideeën zonder AI: uit de eigen lijst, passend bij interesse en budget
    r = await g.cadeaus.ideeen(romy["id"], 40, "verjaardag", None)
    assert r["bron"] == "lijst" and r["ideeen"] and all((i["prijs"] or 0) <= 40 for i in r["ideeen"])
    assert any("paarden" in i["waarom"] or "tekenen" in i["waarom"] for i in r["ideeen"])


async def test_cadeau_ideeen_via_ai_task(hass: HomeAssistant, gezin) -> None:
    from homeassistant.core import SupportsResponse

    g = gezin.runtime_data
    hass.states.async_set("ai_task.ollama", "unknown")
    gevraagd = {}

    async def generate(call):
        gevraagd.update(call.data)
        return {"conversation_id": "x", "data": 'Hier: [{"emoji": "🐴", "titel": "Dagje manege", "waarom": "Ze houdt van paarden", "prijs": "45"}]'}

    hass.services.async_register("ai_task", "generate_data", generate, supports_response=SupportsResponse.ONLY)
    hass.states.async_set("person.romy", "home", {"friendly_name": "Romy"})
    romy = g.persoon_toevoegen("person.romy", "kind")
    g.lid_bijwerken(romy["id"], geboortedatum="2014-03-03", interesses=["paarden"])
    r = await g.cadeaus.ideeen(romy["id"], 50, "verjaardag", None)
    assert r["bron"] == "ai" and r["ideeen"][0]["titel"] == "Dagje manege" and r["ideeen"][0]["prijs"] == 45
    assert gevraagd["entity_id"] == "ai_task.ollama" and "paarden" in gevraagd["instructions"]


async def test_verlanglijst_herinnering_twee_weken_vooraf(hass: HomeAssistant, gezin) -> None:
    import datetime as dt
    from custom_components.ha_family.cadeaus import verlanglijst_herinnering

    g = gezin.runtime_data
    hass.states.async_set("person.romy", "home", {"friendly_name": "Romy"})
    hass.states.async_set("person.rein", "home", {"friendly_name": "Rein"})
    romy = g.persoon_toevoegen("person.romy", "kind")
    rein = g.persoon_toevoegen("person.rein", "ouder")
    nu = dt.datetime(2026, 10, 20, 9, 0)
    g.lid_bijwerken(romy["id"], geboortedatum="2013-11-03")
    g.cadeaus.wens(romy["id"], {"titel": "Tekenset"})
    verstuurd = []

    async def nep(lid, titel, tekst, **extra):
        verstuurd.append((lid["naam"], tekst))
        return True
    g.melding = nep
    assert await verlanglijst_herinnering(g, nu) == 1
    assert verstuurd[0][0] == "Rein" and "Tekenset" in verstuurd[0][1]
    assert await verlanglijst_herinnering(g, nu + dt.timedelta(days=1)) == 0      # alleen precies twee weken vooraf


async def test_afvalkalender_van_rova(hass: HomeAssistant, gezin, hass_ws_client, aioclient_mock) -> None:
    import datetime as dt

    aioclient_mock.get("https://www.rova.nl/api/waste-calendar/upcoming", json=[
        {"date": "2026-10-22T00:00:00Z", "wasteType": {"code": "GFT", "title": "Gft"}},
        {"date": "2026-11-13T00:00:00Z", "wasteType": {"code": "PAP", "title": "Oud papier en karton"}},
        {"date": "2026-11-20T00:00:00Z", "wasteType": {"code": "XYZ", "title": "Grofvuil"}}])
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ha_family/agenda/afval", "bedrijf": {"bedrijf": "rova", "postcode": "3812 kt", "huisnummer": 17}})
    r = await client.receive_json()
    assert r["success"], r
    assert r["result"]["dagen"] == 3 and r["result"]["eerste"]["soort"] == "gft"
    g = gezin.runtime_data
    assert g.data["afval"]["bedrijf"]["postcode"] == "3812KT"
    ev = g.agenda.afval_schema_events(dt.date(2026, 10, 1), dt.date(2026, 12, 1))
    assert [e["afval"] for e in ev] == ["gft", "papier", None] and ev[2]["titel"] == "🗑️ Grofvuil"
    await client.send_json_auto_id({"type": "ha_family/agenda/afval", "bedrijf": {"bedrijf": "rova", "postcode": "abc", "huisnummer": "17"}})
    assert (await client.receive_json())["error"]["code"] == "ha_family_fout"


async def test_persoonlijk_dashboard(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    from homeassistant.components.frontend import DATA_PANELS

    assert await async_setup_component(hass, "lovelace", {})
    g = gezin.runtime_data
    rein = await g.lid_toevoegen("Rein Test", "ouder", inloggen=True, gebruikersnaam="rein", wachtwoord="maan-tulp-vos-42")
    noor = await g.lid_toevoegen("Noor", "ouder", inloggen=True, gebruikersnaam="noor", wachtwoord="maan-tulp-vos-42")
    g.lid_bijwerken(rein["id"], weergave="expert")
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ha_family/lid/dashboard", "lid": rein["id"], "actie": "maak"})
    r = await client.receive_json()
    assert r["success"], r
    url = r["result"]["dashboard"]
    assert url == "gezin-rein" and url in hass.data[DATA_PANELS]
    rs = (await async_user_store(hass, g.user_id(rein))).data["sidebar"]
    ns = (await async_user_store(hass, g.user_id(noor))).data["sidebar"]
    assert rs["panelOrder"][:2] == ["gezin", "gezin-rein"] and "gezin-rein" not in rs["hiddenPanels"]
    assert "gezin-rein" in ns["hiddenPanels"]                 # Noor ziet het dashboard van Rein niet in haar zijbalk
    await client.send_json_auto_id({"type": "ha_family/lid/dashboard", "lid": rein["id"], "actie": "los"})
    assert (await client.receive_json())["success"]
    assert url not in hass.data[DATA_PANELS] and g.lid(rein["id"])["dashboard"] is None


async def test_apparaten_per_kind(hass: HomeAssistant, gezin, hass_ws_client) -> None:
    g = gezin.runtime_data
    hass.states.async_set("person.romy", "home", {"friendly_name": "Romy"})
    romy = g.persoon_toevoegen("person.romy", "kind")
    client = await hass_ws_client(hass)
    # per kamer, met een uitzondering per apparaat
    await client.send_json_auto_id({"type": "ha_family/lid/bijwerken", "lid": romy["id"], "apparaten": {
        "beperkt": True, "kamers": {"slaapkamer_romy": "b", "woonkamer": "z"}, "uitzonderingen": {"light.tv": "", "x": "b"}}})
    assert (await client.receive_json())["success"]
    a = g.lid(romy["id"])["apparaten"]
    assert a == {"beperkt": True, "kamers": {"slaapkamer_romy": "b", "woonkamer": "z"}, "uitzonderingen": {"light.tv": ""}}
    assert next(l for l in g.openbaar()["leden"] if l["id"] == romy["id"])["apparaten"]["kamers"]["slaapkamer_romy"] == "b"
    # oude vorm (lijsten) wordt omgezet
    g.lid_bijwerken(romy["id"], apparaten={"beperkt": True, "zien": ["light.a", "light.b"], "bedienen": ["light.a", "light.c"]})
    assert g.lid(romy["id"])["apparaten"]["uitzonderingen"] == {"light.a": "b", "light.b": "z"}
    g.lid_bijwerken(romy["id"], apparaten={"beperkt": False})
    assert next(l for l in g.openbaar()["leden"] if l["id"] == romy["id"])["apparaten"] is None


async def test_ai_functies_met_en_zonder_ai(hass: HomeAssistant, gezin) -> None:
    import datetime as dt
    from homeassistant.core import SupportsResponse
    from custom_components.ha_family import ai

    g = gezin.runtime_data
    g.maaltijden.startpakket()
    van = dt.date(2026, 11, 2)
    # zonder AI: lege dagen worden gevuld uit de eigen recepten
    r = await ai.weekmenu(g, van, 3, None)
    assert r["bron"] == "lijst" and len(r["gepland"]) == 3
    d = await ai.dagoverzicht(g)
    assert d["bron"] == "lijst" and d["tekst"]
    hass.states.async_set("person.romy", "home", {"friendly_name": "Romy"})
    romy = g.persoon_toevoegen("person.romy", "kind")
    k = await ai.klusjes(g, romy["id"])
    assert k["bron"] == "lijst" and k["ideeen"]

    # met AI
    hass.states.async_set("ai_task.test", "unknown")
    pasta = g.data["recepten"][0]["id"]
    antwoorden = {
        "weekmenu": f'[{{"datum": "2026-11-05", "recept": "{pasta}"}}, {{"datum": "2026-11-06", "recept": "bestaat-niet"}}]',
        "recept": '{"naam": "Kip teriyaki", "emoji": "🍗", "personen": 4, "ingredienten": ["400 g kipfilet", "300 g rijst"], "bereiding": ["Kook de rijst", "Bak de kip"], "labels": ["snel", "onzin"]}',
        "dagoverzicht": "Goedemorgen! Vandaag een rustige dag 🌤️",
        "klusjes": '[{"emoji": "🧺", "titel": "Sokken sorteren", "punten": 2}]',
    }

    async def gen(call):
        return {"data": antwoorden[call.data["task_name"]]}
    hass.services.async_register("ai_task", "generate_data", gen, supports_response=SupportsResponse.ONLY)
    r = await ai.weekmenu(g, dt.date(2026, 11, 5), 2, "liefst vega")
    assert r["bron"] == "ai" and r["gepland"] == ["2026-11-05", "2026-11-06"]       # onbekend recept → gewone suggestie
    assert g.maaltijden.menu(dt.date(2026, 11, 5), 1)[0]["recept"] == pasta
    rec = await ai.recept(g, "iets snels met kip", None)
    assert rec["naam"] == "Kip teriyaki" and rec["labels"] == ["snel"] and "Bak de kip" in rec["bereiding"]
    d = await ai.dagoverzicht(g, opnieuw=True)
    assert d["bron"] == "ai" and "rustige dag" in d["tekst"]
    assert (await ai.klusjes(g, romy["id"]))["ideeen"][0]["titel"] == "Sokken sorteren"


async def test_oude_apparaten_worden_omgezet(hass: HomeAssistant, local_auth, hass_owner_user, hass_storage) -> None:
    from custom_components.ha_family.gezin import Gezin

    entry = MockConfigEntry(domain=DOMAIN, title="Familie", data={"naam": "Familie", "type": "gezin"})
    entry.add_to_hass(hass)
    hass_storage[f"ha_family.{entry.entry_id}"] = {"version": 1, "minor_version": 1, "key": f"ha_family.{entry.entry_id}", "data": {"leden": [
        {"id": "r1", "naam": "Rafi", "rol": "kind", "person": "person.rafi", "apparaten": {"beperkt": True, "zien": ["light.a", "light.b"], "bedienen": ["light.a"]}}]}}
    g = Gezin(hass, entry)
    await g.async_load()
    assert g.lid("r1")["apparaten"] == {"beperkt": True, "kamers": {}, "uitzonderingen": {"light.a": "b", "light.b": "z"}}
