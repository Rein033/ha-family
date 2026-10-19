"""Sensor 'Gezin': hoeveel leden, en wie (naam, rol, kleur, emoji, persoon). Daar halen de kaarten en het dashboard het gezin uit."""
from __future__ import annotations

import datetime as dt
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from . import FamilyEntry
from .const import DOMAIN
from .gezin import Gezin


async def async_setup_entry(hass: HomeAssistant, entry: FamilyEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities([GezinSensor(entry.runtime_data), VolgendeAfval(entry.runtime_data)])


class GezinSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "gezin"
    _attr_icon = "mdi:home-heart"
    _attr_native_unit_of_measurement = "leden"

    def __init__(self, gezin: Gezin) -> None:
        self.gezin = gezin
        self._attr_unique_id = f"{gezin.entry.entry_id}_gezin"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, gezin.entry.entry_id)}, name=gezin.naam,
                                            entry_type=DeviceEntryType.SERVICE, manufacturer="HA Family")

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.gezin.add_listener(self.async_write_ha_state))

    @property
    def native_value(self) -> int:
        return len(self.gezin.leden)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        o = self.gezin.openbaar()
        return {"ha_family": "gezin", "huishouden": o["naam"], "soort": o["type"], "leden": o["leden"]}


class VolgendeAfval(SensorEntity):
    """Wat er als eerstvolgende wordt opgehaald (bv. 'GFT'), met datum en hoeveel dagen nog. Handig voor een tegel."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "volgende_afval"
    _attr_icon = "mdi:trash-can-outline"

    def __init__(self, gezin: Gezin) -> None:
        self.gezin = gezin
        self._attr_unique_id = f"{gezin.entry.entry_id}_volgende_afval"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, gezin.entry.entry_id)}, name=gezin.naam,
                                            entry_type=DeviceEntryType.SERVICE, manufacturer="HA Family")
        self._attr_native_value = None
        self._attr_extra_state_attributes = {"ha_family": "volgende_afval"}

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.gezin.add_listener(lambda: self.hass.async_create_task(self._bijwerken())))
        self.async_on_remove(async_track_time_interval(self.hass, self._bijwerken, dt.timedelta(minutes=30)))
        await self._bijwerken()

    async def _bijwerken(self, *_: object) -> None:
        vandaag = dt_util.now().date()
        lijst = [e for e in await self.gezin.agenda.events(vandaag, vandaag + dt.timedelta(days=60)) if e["soort"] == "afval"]
        if lijst:
            datum = lijst[0]["start"][:10]
            zelfde = [e for e in lijst if e["start"][:10] == datum]
            dagen = (dt.date.fromisoformat(datum) - vandaag).days
            self._attr_native_value = " + ".join(e["titel"].split(" ", 1)[-1] for e in zelfde)
            self._attr_extra_state_attributes = {"ha_family": "volgende_afval", "datum": datum, "dagen": dagen,
                                                 "iconen": "".join(e.get("icoon") or "" for e in zelfde),
                                                 "wanneer": "vandaag" if dagen == 0 else "morgen" if dagen == 1 else f"over {dagen} dagen"}
        else:
            self._attr_native_value = None
            self._attr_extra_state_attributes = {"ha_family": "volgende_afval"}
        self.async_write_ha_state()
