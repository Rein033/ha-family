"""Kamers en apparaten (HA-Family-Integrations).

Een kamer is gewoon een ruimte (area) van Home Assistant, dus wat je hier aanmaakt zie je ook in de rest van HA, in
spraakassistenten en in automatiseringen. HA Family laat alleen de apparaten zien die je zelf bedient: lampen,
klimaat (airco, thermostaat), ventilatoren, rolluiken/gordijnen, stopcontacten en mediaspelers.

Een apparaat staat in een kamer via zichzelf (entiteit) of via het fysieke apparaat (device) waar het bij hoort. We
zetten de kamer op de entiteit; bij 'geen kamer' halen we hem ook van het apparaat af, anders blijft hij erin staan.
Welke kamers verborgen zijn en in welke volgorde ze staan, bewaren we in de gezinsopslag."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er

from .gezin import FamilyFout

DOMEINEN = ["light", "climate", "fan", "cover", "switch", "media_player"]
ICONEN = ["mdi:sofa", "mdi:silverware-fork-knife", "mdi:bed", "mdi:bed-king", "mdi:teddy-bear", "mdi:shower", "mdi:toilet", "mdi:desk",
          "mdi:washing-machine", "mdi:stairs", "mdi:door", "mdi:garage", "mdi:flower", "mdi:home-roof", "mdi:television", "mdi:baby-carriage",
          "mdi:gamepad-variant", "mdi:dumbbell", "mdi:tools", "mdi:home"]


class Huis:
    def __init__(self, gezin) -> None:
        self.gezin = gezin
        self.hass: HomeAssistant = gezin.hass
        gezin.data.setdefault("huis", {"verborgen": [], "volgorde": []})

    @property
    def _inst(self) -> dict[str, Any]:
        return self.gezin.data["huis"]

    def _kamer_van(self, ent: er.RegistryEntry | None, devreg: dr.DeviceRegistry) -> tuple[str | None, bool]:
        """(kamer, via_apparaat)"""
        if ent is None:
            return None, False
        if ent.area_id:
            return ent.area_id, False
        dev = devreg.async_get(ent.device_id) if ent.device_id else None
        return (dev.area_id, True) if dev and dev.area_id else (None, False)

    def overzicht(self) -> dict[str, Any]:
        areas, entreg, devreg = ar.async_get(self.hass), er.async_get(self.hass), dr.async_get(self.hass)
        volgorde = self._inst["volgorde"]
        kamers = sorted(areas.async_list_areas(), key=lambda a: (volgorde.index(a.id) if a.id in volgorde else len(volgorde), a.name.lower()))
        apparaten = []
        for st in self.hass.states.async_all(DOMEINEN):
            ent = entreg.async_get(st.entity_id)
            if ent and (ent.hidden_by or ent.disabled_by or ent.entity_category):
                continue                                    # instellingen-schakelaars en verborgen dingen niet
            kamer, via = self._kamer_van(ent, devreg)
            apparaten.append({"entity": st.entity_id, "naam": st.name, "domein": st.domain, "kamer": kamer, "via_apparaat": via,
                              "kan": ent is not None})       # zonder unieke id kan HA er geen kamer aan geven
        apparaten.sort(key=lambda x: (DOMEINEN.index(x["domein"]), x["naam"].lower()))
        # temperatuur per kamer: wat in de kamer is ingesteld, anders de eerste temperatuursensor die erin staat
        temp: dict[str, str] = {}
        for st in self.hass.states.async_all("sensor"):
            if st.attributes.get("device_class") == "temperature":
                k, _ = self._kamer_van(entreg.async_get(st.entity_id), devreg)
                if k:
                    temp.setdefault(k, st.entity_id)
        return {"kamers": [{"kamer": a.id, "naam": a.name, "icoon": a.icon, "verborgen": a.id in self._inst["verborgen"],
                            "temperatuur": getattr(a, "temperature_entity_id", None) or temp.get(a.id)} for a in kamers],
                "apparaten": apparaten, "iconen": ICONEN}

    def kamer(self, kamer_id: str | None, naam: str, icoon: str | None) -> dict[str, Any]:
        naam = (naam or "").strip()
        if not naam:
            raise FamilyFout("Geef de kamer een naam.")
        areas = ar.async_get(self.hass)
        bestaand = areas.async_get_area_by_name(naam)
        try:
            if kamer_id:
                if bestaand and bestaand.id != kamer_id:
                    raise FamilyFout(f"Er is al een kamer die '{naam}' heet.")
                a = areas.async_update(kamer_id, name=naam, icon=icoon)
            else:
                if bestaand:
                    raise FamilyFout(f"Er is al een kamer die '{naam}' heet.")
                a = areas.async_create(naam, icon=icoon)
                self._inst["volgorde"].append(a.id)
                self.gezin.opslaan()
        except (KeyError, ValueError) as ex:
            raise FamilyFout(str(ex)) from ex
        return {"kamer": a.id, "naam": a.name, "icoon": a.icon}

    def kamer_weg(self, kamer_id: str) -> None:
        areas = ar.async_get(self.hass)
        if not areas.async_get_area(kamer_id):
            raise FamilyFout("Die kamer bestaat niet meer.")
        areas.async_delete(kamer_id)                        # HA haalt de kamer zelf van alle apparaten af
        self._inst["verborgen"] = [k for k in self._inst["verborgen"] if k != kamer_id]
        self._inst["volgorde"] = [k for k in self._inst["volgorde"] if k != kamer_id]
        self.gezin.opslaan()

    def apparaat(self, entity_id: str, kamer_id: str | None) -> None:
        if kamer_id and not ar.async_get(self.hass).async_get_area(kamer_id):
            raise FamilyFout("Die kamer bestaat niet meer.")
        entreg, devreg = er.async_get(self.hass), dr.async_get(self.hass)
        ent = entreg.async_get(entity_id)
        if ent is None:
            raise FamilyFout("Dit apparaat kan geen kamer krijgen: het heeft geen vaste ID in Home Assistant.")
        entreg.async_update_entity(entity_id, area_id=kamer_id)
        if kamer_id is None and ent.device_id:              # anders blijft hij via het apparaat in de kamer staan
            dev = devreg.async_get(ent.device_id)
            if dev and dev.area_id:
                devreg.async_update_device(dev.id, area_id=None)

    def instellingen(self, verborgen: list[str] | None = None, volgorde: list[str] | None = None) -> None:
        if verborgen is not None:
            self._inst["verborgen"] = list(dict.fromkeys(verborgen))
        if volgorde is not None:
            self._inst["volgorde"] = list(dict.fromkeys(volgorde))
        self.gezin.opslaan()
