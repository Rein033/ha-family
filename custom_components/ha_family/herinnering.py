"""Herinneringen van de gezinsagenda: de avond voor het afval ophalen, en 's ochtends wie er jarig is.

Elke minuut kijken we of het tijd is; per dag gaat elke herinnering hooguit één keer de deur uit."""
from __future__ import annotations

import datetime as dt
import logging

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .agenda import Agenda
from .taken import herinnering as taken_herinnering
from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)


async def _naar(agenda: Agenda, leden_ids: list[str] | None, titel: str, tekst: str, behalve: str | None = None) -> int:
    """Melding naar de gekozen gezinsleden (leeg: iedereen met een telefoon). Geeft het aantal verstuurde meldingen."""
    g = agenda.gezin
    n = 0
    for lid in g.leden:
        if (leden_ids and lid["id"] not in leden_ids) or lid["id"] == behalve:
            continue
        try:
            if await g.melding(lid, titel, tekst):
                n += 1
        except FamilyFout as ex:
            _LOGGER.warning("Herinnering naar %s mislukt: %s", lid["naam"], ex)
    return n


async def afval_herinnering(agenda: Agenda, nu: dt.datetime) -> int:
    morgen = nu.date() + dt.timedelta(days=1)
    soorten = [e for e in await agenda.events(morgen, morgen + dt.timedelta(days=1)) if e["soort"] == "afval"]
    if not soorten:
        return 0
    wat = " en ".join(e["titel"] for e in soorten)
    h = agenda.gezin.data["afval"]["herinnering"]
    return await _naar(agenda, h.get("leden"), "🗑️ Morgen afval", f"Morgen: {wat}. Zet de container vanavond aan de straat.")


async def verjaardag_herinnering(agenda: Agenda, nu: dt.datetime) -> int:
    n = 0
    for e in agenda.verjaardag_events(nu.date(), nu.date() + dt.timedelta(days=1)):
        jarige = e["wie"][0] if e["wie"] else None
        leeftijd = f" ({e['leeftijd']})" if e.get("leeftijd") else ""
        n += await _naar(agenda, None, "🎂 Jarig", f"Vandaag is {e['naam']} jarig{leeftijd}! 🎉", behalve=jarige)
        if jarige:
            lid = agenda.gezin.lid(jarige)
            try:
                if await agenda.gezin.melding(lid, "🎉 Gefeliciteerd!", f"Hoera, {lid['naam']}! Een hele fijne verjaardag van het hele gezin 🎂"):
                    n += 1
            except FamilyFout:
                pass
    return n


@callback
def start(hass: HomeAssistant, agenda: Agenda) -> CALLBACK_TYPE:
    async def _elke_minuut(_: dt.datetime) -> None:
        nu = dt_util.now()
        klok, vandaag = nu.strftime("%H:%M"), nu.date().isoformat()
        verstuurd = agenda.gezin.data.setdefault("herinneringen_verstuurd", {})
        a = agenda.gezin.data["afval"]["herinnering"]
        if a.get("aan") and klok == a.get("tijd") and verstuurd.get("afval") != vandaag:
            verstuurd["afval"] = vandaag
            agenda.gezin.opslaan()
            await afval_herinnering(agenda, nu)
        k = agenda.gezin.data.get("klusjes_instellingen", {}).get("herinnering", {})
        if k.get("aan") and klok == k.get("tijd") and verstuurd.get("klusjes") != vandaag:
            verstuurd["klusjes"] = vandaag
            agenda.gezin.opslaan()
            await taken_herinnering(agenda.gezin.taken, nu)
        v = agenda.gezin.data["verjaardag_melding"]
        if v.get("aan") and klok == v.get("tijd") and verstuurd.get("verjaardag") != vandaag:
            verstuurd["verjaardag"] = vandaag
            agenda.gezin.opslaan()
            await verjaardag_herinnering(agenda, nu)

    return async_track_time_change(hass, _elke_minuut, second=0)
