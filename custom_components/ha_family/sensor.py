"""Sensor 'Gezin': hoeveel leden, en wie (naam, rol, kleur, emoji, persoon). Daar halen de kaarten en het dashboard het gezin uit."""
from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import FamilyEntry
from .const import DOMAIN
from .gezin import Gezin


async def async_setup_entry(hass: HomeAssistant, entry: FamilyEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    async_add_entities([GezinSensor(entry.runtime_data)])


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
