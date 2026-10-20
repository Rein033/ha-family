"""Taken en Boodschappen als echte to-do-lijsten van Home Assistant (to-do-kaart, Assist, de app)."""
from __future__ import annotations

import datetime as dt
from typing import Any

from homeassistant.components.todo import TodoItem, TodoItemStatus, TodoListEntity, TodoListEntityFeature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import FamilyEntry
from .afdelingen import AFDELINGEN
from .const import DOMAIN
from .taken import Taken


async def async_setup_entry(hass: HomeAssistant, entry: FamilyEntry, async_add_entities: AddConfigEntryEntitiesCallback) -> None:
    t = entry.runtime_data.taken
    async_add_entities([TakenLijst(t, "taken"), BoodschappenLijst(t, "boodschappen")])


def _status(klaar: bool) -> TodoItemStatus:
    return TodoItemStatus.COMPLETED if klaar else TodoItemStatus.NEEDS_ACTION


class _Basis(TodoListEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, taken: Taken, sleutel: str) -> None:
        self.taken = taken
        g = taken.gezin
        self._attr_unique_id = f"{g.entry.entry_id}_{sleutel}"
        self._attr_translation_key = sleutel
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, g.entry.entry_id)}, name=g.naam, entry_type=DeviceEntryType.SERVICE, manufacturer="HA Family")

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.taken.gezin.add_listener(self.async_write_ha_state))

    def _door(self) -> str | None:
        lid = self.taken.lid_van(self._context.user_id if self._context else None)
        return lid["id"] if lid else None


class TakenLijst(_Basis):
    _attr_icon = "mdi:checkbox-marked-circle-outline"
    _attr_supported_features = (TodoListEntityFeature.CREATE_TODO_ITEM | TodoListEntityFeature.UPDATE_TODO_ITEM | TodoListEntityFeature.DELETE_TODO_ITEM
                                | TodoListEntityFeature.SET_DUE_DATE_ON_ITEM | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"ha_family": "taken"}

    @property
    def todo_items(self) -> list[TodoItem]:
        namen = {l["id"]: l["naam"] for l in self.taken.gezin.leden}
        uit = []
        for t in self.taken.gezin.data["taken"]:
            wie = ", ".join(namen[w] for w in t.get("wie", []) if w in namen)
            beschrijving = "\n".join(x for x in ((f"Voor: {wie}" if wie else ""), t.get("notitie") or "") if x) or None
            uit.append(TodoItem(uid=t["id"], summary=t["titel"], status=_status(t["klaar"]), description=beschrijving,
                                due=dt.date.fromisoformat(t["deadline"]) if t.get("deadline") else None))
        return uit

    @staticmethod
    def _datum(due: Any) -> str | None:
        if isinstance(due, dt.datetime):
            due = due.date()
        return due.isoformat() if isinstance(due, dt.date) else None

    async def async_create_todo_item(self, item: TodoItem) -> None:
        self.taken.taak({"titel": item.summary, "deadline": self._datum(item.due), "notitie": item.description or ""}, self._door())

    async def async_update_todo_item(self, item: TodoItem) -> None:
        oud = self.taken._zoek("taken", item.uid)  # noqa: SLF001
        notitie = item.description or ""
        if notitie.startswith("Voor: "):                    # die regel maken we zelf; niet als notitie bewaren
            notitie = notitie.split("\n", 1)[1] if "\n" in notitie else ""
        self.taken.taak({"id": item.uid, "titel": item.summary, "deadline": self._datum(item.due), "notitie": notitie, "wie": oud.get("wie")}, None)
        klaar = item.status == TodoItemStatus.COMPLETED
        if klaar != oud["klaar"]:
            self.taken.taak_klaar(item.uid, klaar, self._door())

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        for u in uids:
            self.taken.taak_weg(u)


class BoodschappenLijst(_Basis):
    """Op volgorde van de looproute; de afdeling staat in de beschrijving. Een komma maakt er meer dingen van."""

    _attr_icon = "mdi:cart-outline"
    _attr_supported_features = (TodoListEntityFeature.CREATE_TODO_ITEM | TodoListEntityFeature.UPDATE_TODO_ITEM | TodoListEntityFeature.DELETE_TODO_ITEM
                                | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"ha_family": "boodschappen"}

    @property
    def todo_items(self) -> list[TodoItem]:
        return [TodoItem(uid=b["id"], summary=b["titel"], status=_status(b["klaar"]), description=AFDELINGEN.get(b["afdeling"], ""))
                for b in self.taken.boodschappen()]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        self.taken.boodschap(item.summary, self._door())

    async def async_update_todo_item(self, item: TodoItem) -> None:
        b = self.taken._zoek("boodschappen", item.uid)  # noqa: SLF001
        afdeling = None
        if item.description and item.description != AFDELINGEN.get(b["afdeling"]):
            w = item.description.lower()
            afdeling = next((k for k, l in AFDELINGEN.items() if k in w or w in l.lower()), None)
        self.taken.boodschap_bij(item.uid, klaar=item.status == TodoItemStatus.COMPLETED, afdeling=afdeling, titel=item.summary)

    async def async_delete_todo_items(self, uids: list[str]) -> None:
        for u in uids:
            self.taken.boodschap_weg(u)
