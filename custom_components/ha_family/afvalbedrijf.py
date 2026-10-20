"""Afvalkalender rechtstreeks van het afvalbedrijf: postcode en huisnummer invullen, klaar.

Per bedrijf een functie die de komende ophaaldagen ophaalt als [{"datum": "YYYY-MM-DD", "soort": <AFVAL-sleutel>, "titel": ...}].
De dagen worden in de gezinsopslag bewaard en twee keer per dag ververst, zodat de agenda ook werkt als de site even plat ligt.
Nieuwe bedrijven: een functie toevoegen aan BEDRIJVEN."""
from __future__ import annotations

import datetime as dt
import logging
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)

ROVA_SOORT = {"GFT": "gft", "PMD": "pmd", "PAP": "papier", "RST": "rest", "REST": "rest", "GLS": "glas", "TXT": "textiel", "KERST": "kerstboom"}


async def _rova(hass: HomeAssistant, postcode: str, huisnummer: str, toevoeging: str) -> list[dict[str, Any]]:
    """ROVA (Amersfoort, Zwolle, Utrechtse Heuvelrug, …): open API van rova.nl."""
    from .agenda import afval_soort

    url = "https://www.rova.nl/api/waste-calendar/upcoming"
    params = {"postalcode": postcode, "houseNumber": huisnummer, "addition": toevoeging, "take": 60}
    sessie = async_get_clientsession(hass)
    async with sessie.get(url, params=params, headers={"Accept": "application/json", "User-Agent": "HA-Family"}, timeout=20) as r:
        if r.status != 200:
            raise FamilyFout(f"ROVA gaf geen antwoord (fout {r.status}). Probeer het later nog eens.")
        data = await r.json(content_type=None)
    uit = []
    for x in data or []:
        w = x.get("wasteType") or {}
        titel = w.get("title") or w.get("code") or "Afval"
        uit.append({"datum": str(x.get("date", ""))[:10], "soort": ROVA_SOORT.get(str(w.get("code", "")).upper()) or afval_soort(titel), "titel": titel})
    return [u for u in uit if re.fullmatch(r"\d{4}-\d{2}-\d{2}", u["datum"])]


BEDRIJVEN: dict[str, dict[str, Any]] = {
    "rova": {"naam": "ROVA", "gemeenten": "Amersfoort, Zwolle, Utrechtse Heuvelrug, Leusden, Soest en meer", "ophalen": _rova},
}


def _postcode(p: str) -> str:
    p = re.sub(r"\s+", "", (p or "").upper())
    if not re.fullmatch(r"\d{4}[A-Z]{2}", p):
        raise FamilyFout("Vul een postcode in zoals 1234 AB.")
    return p


async def instellen(gezin, bedrijf: str | None, postcode: str = "", huisnummer: str = "", toevoeging: str = "") -> dict[str, Any] | None:
    a = gezin.data["afval"]
    if not bedrijf:
        a["bedrijf"] = None
        gezin.opslaan()
        return None
    if bedrijf not in BEDRIJVEN:
        raise FamilyFout("Dit afvalbedrijf kennen we (nog) niet.")
    pc, nr = _postcode(postcode), str(huisnummer or "").strip()
    if not re.fullmatch(r"\d{1,5}", nr):
        raise FamilyFout("Vul een huisnummer in (alleen het getal; een toevoeging apart).")
    dagen = await BEDRIJVEN[bedrijf]["ophalen"](gezin.hass, pc, nr, (toevoeging or "").strip().upper())
    if not dagen:
        raise FamilyFout(f"{BEDRIJVEN[bedrijf]['naam']} kent geen ophaaldagen voor {pc} {nr}. Klopt het adres, en haalt {BEDRIJVEN[bedrijf]['naam']} hier op?")
    a["bedrijf"] = {"bedrijf": bedrijf, "postcode": pc, "huisnummer": nr, "toevoeging": (toevoeging or "").strip().upper(), "dagen": dagen,
                    "bijgewerkt": dt_util.now().isoformat()}
    gezin.opslaan()
    return a["bedrijf"]


async def verversen(gezin) -> None:
    b = gezin.data["afval"].get("bedrijf")
    if not b:
        return
    try:
        dagen = await BEDRIJVEN[b["bedrijf"]]["ophalen"](gezin.hass, b["postcode"], b["huisnummer"], b.get("toevoeging", ""))
    except Exception as ex:  # noqa: BLE001 - bij een storing houden we de oude dagen
        _LOGGER.warning("Afvalkalender verversen mislukt, de oude dagen blijven staan: %s", ex)
        return
    if dagen:
        b.update(dagen=dagen, bijgewerkt=dt_util.now().isoformat())
        gezin.opslaan()


def events(gezin, van: dt.date, tot: dt.date) -> list[dict[str, Any]]:
    from .agenda import AFVAL

    b = gezin.data["afval"].get("bedrijf")
    uit = []
    for d in (b or {}).get("dagen", []):
        if van.isoformat() <= d["datum"] < tot.isoformat():
            a = AFVAL.get(d["soort"] or "") or {"naam": d["titel"], "icoon": "🗑️", "kleur": "#757575"}
            uit.append({"id": f"afval-{d['soort'] or 'x'}-{d['datum']}", "titel": f"{a['icoon']} {d['titel'] if not d['soort'] else a['naam']}", "start": d["datum"],
                        "eind": None, "hele_dag": True, "wie": [], "soort": "afval", "afval": d["soort"], "icoon": a["icoon"], "kleur": a["kleur"], "bewerkbaar": False})
    return uit
