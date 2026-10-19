"""Agenda-entiteiten van HA Family: Gezinsagenda (eigen afspraken), Verjaardagen en Afval.

Zo staat alles ook in de Agenda van Home Assistant zelf, en kun je het gebruiken in automatiseringen en met Assist."""
from __future__ import annotations

import datetime as dt
import re
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEntityFeature, CalendarEvent
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from . import FamilyEntry
from .agenda import Agenda
from .const import DOMAIN

RRULE = {"WEEKLY": "week", "MONTHLY": "maand", "YEARLY": "jaar"}


async def async_setup_entry(hass: HomeAssistant, entry: FamilyEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    a = entry.runtime_data.agenda
    async_add_entities([GezinsAgenda(a, "agenda"), VerjaardagAgenda(a, "verjaardagen"), AfvalAgenda(a, "afval")])


def _tijd(s: str | None, hele_dag: bool) -> dt.date | dt.datetime | None:
    if not s:
        return None
    if hele_dag or len(s) == 10:
        return dt.date.fromisoformat(s[:10])
    d = dt.datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=dt_util.get_default_time_zone())


def _naar_event(e: dict[str, Any], wie: str = "") -> CalendarEvent:
    start = _tijd(e["start"], e["hele_dag"])
    eind = _tijd(e.get("eind"), e["hele_dag"])
    if e["hele_dag"]:
        eind = (eind or start) + dt.timedelta(days=1)
    else:
        eind = eind or start + dt.timedelta(hours=1)
    beschrijving = "\n".join(x for x in (wie, e.get("notitie") or "") if x) or None
    return CalendarEvent(start=start, end=eind, summary=e["titel"], uid=e.get("afspraak") or e["id"], location=e.get("plek") or None,
                         description=beschrijving)


class _Basis(CalendarEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, agenda: Agenda, sleutel: str) -> None:
        self.agenda = agenda
        g = agenda.gezin
        self._attr_unique_id = f"{g.entry.entry_id}_{sleutel}"
        self._attr_translation_key = sleutel
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, g.entry.entry_id)}, name=g.naam, entry_type=DeviceEntryType.SERVICE, manufacturer="HA Family")

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.agenda.gezin.add_listener(self.async_write_ha_state))

    def _lijst(self, van: dt.date, tot: dt.date) -> list[dict[str, Any]]:
        raise NotImplementedError

    def _wie(self, e: dict[str, Any]) -> str:
        namen = [l["naam"] for l in self.agenda.gezin.leden if l["id"] in e.get("wie", [])]
        return ("Voor: " + ", ".join(namen)) if namen else ""

    @property
    def event(self) -> CalendarEvent | None:
        nu = dt_util.now()
        for e in self._lijst(nu.date(), nu.date() + dt.timedelta(days=400)):
            ev = _naar_event(e, self._wie(e))
            if ev.end_datetime_local >= nu:
                return ev
        return None

    async def async_get_events(self, hass: HomeAssistant, start_date: dt.datetime, end_date: dt.datetime) -> list[CalendarEvent]:
        van = dt_util.as_local(start_date).date() - dt.timedelta(days=1)
        tot = dt_util.as_local(end_date).date() + dt.timedelta(days=1)
        return [_naar_event(e, self._wie(e)) for e in self._lijst(van, tot)]


class GezinsAgenda(_Basis):
    """Afspraken die je in HA Family maakt. Maak je er een in de agenda van HA, dan is die voor het hele gezin."""

    _attr_icon = "mdi:calendar-heart"
    _attr_supported_features = CalendarEntityFeature.CREATE_EVENT | CalendarEntityFeature.DELETE_EVENT | CalendarEntityFeature.UPDATE_EVENT

    def _lijst(self, van, tot):
        return self.agenda.eigen_events(van, tot)

    def _uit_ha(self, kw: dict[str, Any], afspraak_id: str | None = None) -> dict[str, Any]:
        s, e = kw["dtstart"], kw.get("dtend")
        if isinstance(s, dt.datetime):
            start, eind = dt_util.as_local(s).strftime("%Y-%m-%dT%H:%M"), dt_util.as_local(e).strftime("%Y-%m-%dT%H:%M") if e else None
        else:
            start = s.isoformat()
            eind = (e - dt.timedelta(days=1)).isoformat() if e and (e - s).days > 1 else None
        freq = re.search(r"FREQ=(\w+)", kw.get("rrule") or "")
        interval = re.search(r"INTERVAL=(\d+)", kw.get("rrule") or "")
        herhaal = RRULE.get(freq.group(1), "") if freq else ""
        if herhaal == "week" and interval and interval.group(1) == "2":
            herhaal = "2weken"
        return {"id": afspraak_id, "titel": kw.get("summary"), "start": start, "eind": eind, "herhaal": herhaal,
                "plek": kw.get("location"), "notitie": kw.get("description"), "wie": []}

    async def async_create_event(self, **kwargs: Any) -> None:
        lid = self.agenda.gezin.lid_van_user(self._context.user_id if self._context else None)
        self.agenda.afspraak(self._uit_ha(kwargs), lid["id"] if lid else None)

    async def async_update_event(self, uid: str, event: dict[str, Any], recurrence_id: str | None = None, recurrence_range: str | None = None) -> None:
        oud = next((a for a in self.agenda.gezin.data["afspraken"] if a["id"] == uid), None)
        nieuw = self._uit_ha(event, uid)
        if oud:
            nieuw["wie"] = oud["wie"]
        self.agenda.afspraak(nieuw)

    async def async_delete_event(self, uid: str, recurrence_id: str | None = None, recurrence_range: str | None = None) -> None:
        self.agenda.afspraak_weg(uid)


class VerjaardagAgenda(_Basis):
    _attr_icon = "mdi:cake-variant"

    def _lijst(self, van, tot):
        return self.agenda.verjaardag_events(van, tot)


class AfvalAgenda(_Basis):
    """Het zelf ingevulde afvalschema. Een afvalagenda van de gemeente blijft een eigen agenda (via een link)."""

    _attr_icon = "mdi:trash-can-outline"

    def _lijst(self, van, tot):
        return self.agenda.afval_schema_events(van, tot)
