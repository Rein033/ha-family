"""Waar is iedereen: wie is thuis, wie is waar (de zones van HA, bijv. via Life360 of de Companion-app), "ik kom eraan" en
een seintje als iemand thuiskomt.

- Ik kom eraan: je zegt over hoeveel minuten je er bent; wie thuis is (of iedereen) krijgt een melding. Kom je thuis, dan
  verdwijnt het vanzelf.
- Thuiskomst: per gezinslid kies je of je een seintje wilt als die thuiskomt (bijv. als je kind uit school thuis is).

We tonen alleen de plaats zoals HA die kent (Thuis, Weg of de naam van een zone), nooit coördinaten."""
from __future__ import annotations

import datetime as dt
import logging
from typing import Any

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import CALLBACK_TYPE, Event, callback
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)
ONBEKEND = ("unknown", "unavailable", "")


class Waar:
    def __init__(self, gezin) -> None:
        self.gezin = gezin
        self.hass = gezin.hass
        w = gezin.data.setdefault("waar", {})
        w.setdefault("onderweg", {})
        w.setdefault("volgen", {})          # doel-lid → [volger-lid, …]

    @property
    def _d(self) -> dict[str, Any]:
        return self.gezin.data["waar"]

    def _plek(self, person: str) -> dict[str, Any]:
        s = self.hass.states.get(person)
        if s is None or s.state in ONBEKEND:
            return {"plek": None, "thuis": None, "sinds": None}
        if s.state == "home":
            naam = "thuis"
        elif s.state == "not_home":
            naam = "weg"
        else:
            z = next((z for z in self.hass.states.async_all("zone") if z.object_id == s.state or z.name == s.state), None)
            naam = z.name if z else s.state.replace("_", " ")
        return {"plek": naam, "thuis": s.state == "home", "sinds": s.last_changed.isoformat()}

    def _onderweg(self, lid_id: str) -> dict[str, Any] | None:
        o = self._d["onderweg"].get(lid_id)
        if not o:
            return None
        if dt.datetime.fromisoformat(o["tot"]) + dt.timedelta(hours=1) < dt_util.now():   # ruim te laat: vergeten uit te zetten
            self._d["onderweg"].pop(lid_id, None)
            self.gezin.opslaan()
            return None
        return o

    def overzicht(self, ik: dict[str, Any] | None) -> dict[str, Any]:
        uit = []
        for l in self.gezin.leden:
            if l["rol"] == "gast":
                continue
            uit.append({"lid": l["id"], **self._plek(l["person"]), "onderweg": self._onderweg(l["id"]),
                        "ik_volg": bool(ik and ik["id"] in self._d["volgen"].get(l["id"], [])),
                        "volgers": len(self._d["volgen"].get(l["id"], []))})
        return {"ik": ik["id"] if ik else None, "leden": uit}

    async def ik_kom_eraan(self, lid: dict[str, Any], minuten: int, bericht: str | None, naar: list[str] | None) -> dict[str, Any]:
        if not 1 <= minuten <= 600:
            raise FamilyFout("Kies over hoeveel minuten je er bent.")
        nu = dt_util.now()
        tot = nu + dt.timedelta(minutes=minuten)
        o = {"tot": tot.isoformat(), "sinds": nu.isoformat(), "bericht": (bericht or "").strip()[:120] or None}
        self._d["onderweg"][lid["id"]] = o
        self.gezin.opslaan()
        naam = lid["naam"].split(" ")[0]
        tekst = f"{naam} is over ongeveer {minuten} minuten thuis (rond {tot.strftime('%H:%M')})." + (f" {o['bericht']}" if o["bericht"] else "")
        ontvangers = [l for l in self.gezin.leden if l["id"] != lid["id"] and l["rol"] != "gast"
                      and ((l["id"] in naar) if naar else self._plek(l["person"])["thuis"] is not False)]
        n = 0
        for l in ontvangers:
            try:
                n += int(await self.gezin.melding(l, f"🚗 {naam} komt eraan", tekst))
            except FamilyFout as ex:
                _LOGGER.warning("Ik kom eraan naar %s mislukt: %s", l["naam"], ex)
        return {**o, "gemeld": n}

    def gestopt(self, lid_id: str) -> None:
        if self._d["onderweg"].pop(lid_id, None):
            self.gezin.opslaan()

    def volgen(self, volger: dict[str, Any], doel_id: str, aan: bool) -> None:
        self.gezin.lid(doel_id)
        if doel_id == volger["id"]:
            raise FamilyFout("Je kunt jezelf niet volgen.")
        lijst = self._d["volgen"].setdefault(doel_id, [])
        if aan and volger["id"] not in lijst:
            lijst.append(volger["id"])
        elif not aan and volger["id"] in lijst:
            lijst.remove(volger["id"])
        self.gezin.opslaan()

    async def _thuisgekomen(self, lid: dict[str, Any]) -> None:
        was_onderweg = self._d["onderweg"].pop(lid["id"], None)
        if was_onderweg:
            self.gezin.opslaan()
        naam = lid["naam"].split(" ")[0]
        for vid in self._d["volgen"].get(lid["id"], []):
            try:
                await self.gezin.melding(self.gezin.lid(vid), f"🏠 {naam} is thuis", f"{naam} is net thuisgekomen.")
            except FamilyFout as ex:
                _LOGGER.warning("Thuiskomst-melding mislukt: %s", ex)

    @callback
    def start(self) -> CALLBACK_TYPE:
        @callback
        def _verandering(event: Event) -> None:
            eid = event.data["entity_id"]
            if not eid.startswith("person."):
                return
            oud, nieuw = event.data.get("old_state"), event.data.get("new_state")
            if not nieuw or nieuw.state != "home" or not oud or oud.state in ("home", *ONBEKEND):
                return
            lid = next((l for l in self.gezin.leden if l["person"] == eid), None)
            if lid:
                self.hass.async_create_task(self._thuisgekomen(lid))

        return self.hass.bus.async_listen(EVENT_STATE_CHANGED, _verandering)
