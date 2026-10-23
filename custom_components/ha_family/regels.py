"""Automatisch aan en uit: simpele regels zonder Home Assistant-automatiseringen te hoeven snappen.

Een regel is: wanneer (een tijd, of bij zonsondergang/zonsopkomst met wat minuten ervoor of erna), op welke dagen, en
welke apparaten aan of uit (een lamp eventueel gedimd). HA Family voert de regels zelf uit, elke minuut; de echte
automatiseringen van Home Assistant blijven onaangeroerd. Ouders en beheerders maken de regels."""
from __future__ import annotations

import datetime as dt
import logging
import re
import secrets
from typing import Any

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.sun import get_astral_event_date
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)
SOORTEN = ("tijd", "zonsondergang", "zonsopkomst")
DOMEINEN = ("light", "switch", "fan", "climate", "cover", "media_player")
ASTRAL = {"zonsondergang": "sunset", "zonsopkomst": "sunrise"}


def _id() -> str:
    return secrets.token_hex(4)


class Regels:
    def __init__(self, gezin) -> None:
        self.gezin = gezin
        self.hass = gezin.hass
        gezin.data.setdefault("regels", [])

    @property
    def lijst(self) -> list[dict[str, Any]]:
        return self.gezin.data["regels"]

    # ── wanneer ──
    def tijdstip(self, r: dict[str, Any], dag: dt.date) -> dt.datetime | None:
        """Het moment op deze dag (lokale tijd), of None als de regel die dag niet hoort te gaan."""
        if dag.weekday() not in r["dagen"]:
            return None
        w = r["wanneer"]
        if w["soort"] == "tijd":
            u, m = (int(x) for x in w["tijd"].split(":"))
            return dt_util.as_local(dt.datetime.combine(dag, dt.time(u, m), tzinfo=dt_util.get_default_time_zone()))
        moment = get_astral_event_date(self.hass, ASTRAL[w["soort"]], dag)
        if moment is None:                                 # poolnacht of middernachtzon: niet op deze dag
            return None
        return dt_util.as_local(moment).replace(second=0, microsecond=0) + dt.timedelta(minutes=w.get("offset", 0))

    def volgende(self, r: dict[str, Any], nu: dt.datetime | None = None) -> str | None:
        nu = nu or dt_util.now()
        for i in range(8):
            t = self.tijdstip(r, nu.date() + dt.timedelta(days=i))
            if t and t > nu:
                return t.isoformat()
        return None

    # ── bewaren ──
    def _schoon(self, data: dict[str, Any]) -> dict[str, Any]:
        w = data.get("wanneer") or {}
        soort = w.get("soort")
        if soort not in SOORTEN:
            raise FamilyFout("Kies wanneer het moet gebeuren.")
        wanneer: dict[str, Any] = {"soort": soort}
        if soort == "tijd":
            if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", str(w.get("tijd") or "")):
                raise FamilyFout("Kies een tijd.")
            wanneer["tijd"] = w["tijd"]
        else:
            wanneer["offset"] = max(-180, min(180, int(w.get("offset") or 0)))
        dagen = sorted({int(d) for d in data.get("dagen") or [] if 0 <= int(d) <= 6})
        if not dagen:
            raise FamilyFout("Kies op welke dagen.")
        wat = []
        for x in data.get("wat") or []:
            e = str(x.get("entity") or "")
            if e.split(".")[0] not in DOMEINEN or self.hass.states.get(e) is None:
                continue
            actie = "aan" if x.get("actie") == "aan" else "uit"
            item: dict[str, Any] = {"entity": e, "actie": actie}
            if actie == "aan" and e.startswith("light.") and x.get("helderheid"):
                item["helderheid"] = max(1, min(100, int(x["helderheid"])))
            wat.append(item)
        if not wat:
            raise FamilyFout("Kies minstens één apparaat.")
        return {"wanneer": wanneer, "dagen": dagen, "wat": wat[:30]}

    def bewaren(self, data: dict[str, Any], regel_id: str | None, door: str | None) -> dict[str, Any]:
        schoon = self._schoon(data)
        if regel_id:
            r = self._zoek(regel_id)
            r.update(schoon)
        else:
            r = {"id": _id(), "aan": True, "door": door, "laatst": None, **schoon}
            self.lijst.append(r)
        self.gezin.opslaan()
        return r

    def _zoek(self, regel_id: str) -> dict[str, Any]:
        r = next((x for x in self.lijst if x["id"] == regel_id), None)
        if r is None:
            raise FamilyFout("Deze regel bestaat niet (meer).")
        return r

    def aan_uit(self, regel_id: str, aan: bool) -> dict[str, Any]:
        r = self._zoek(regel_id)
        r["aan"] = aan
        self.gezin.opslaan()
        return r

    def weg(self, regel_id: str) -> None:
        self.gezin.data["regels"] = [x for x in self.lijst if x["id"] != regel_id]
        self.gezin.opslaan()

    # ── uitvoeren ──
    async def doen(self, r: dict[str, Any]) -> int:
        n = 0
        for x in r["wat"]:
            e, dom = x["entity"], x["entity"].split(".")[0]
            if self.hass.states.get(e) is None:
                continue
            aan = x["actie"] == "aan"
            if dom == "light" and aan:
                dienst, data = ("light", "turn_on"), {"entity_id": e, **({"brightness_pct": x["helderheid"]} if x.get("helderheid") else {})}
            elif dom == "cover":
                dienst, data = ("cover", "open_cover" if aan else "close_cover"), {"entity_id": e}
            else:
                dienst, data = (dom, "turn_on" if aan else "turn_off"), {"entity_id": e}
            try:
                await self.hass.services.async_call(*dienst, data, blocking=True)
                n += 1
            except (HomeAssistantError, ValueError) as ex:
                _LOGGER.warning("Regel %s: %s lukte niet: %s", r["id"], e, ex)
        return n

    async def elke_minuut(self, nu: dt.datetime) -> int:
        """Alle regels waarvan het moment nu is (op de minuut); elke regel hooguit één keer per moment."""
        n = 0
        sleutel = nu.strftime("%Y-%m-%d %H:%M")
        for r in list(self.lijst):
            if not r.get("aan") or r.get("laatst") == sleutel:
                continue
            t = self.tijdstip(r, nu.date())
            if t and t.strftime("%Y-%m-%d %H:%M") == sleutel:
                r["laatst"] = sleutel
                self.gezin.opslaan()
                n += await self.doen(r)
        return n

    def overzicht(self) -> list[dict[str, Any]]:
        uit = []
        for r in self.lijst:
            uit.append({**r, "volgende": self.volgende(r) if r.get("aan") else None,
                        "namen": {x["entity"]: (self.hass.states.get(x["entity"]).name if self.hass.states.get(x["entity"]) else x["entity"]) for x in r["wat"]}})
        return uit
