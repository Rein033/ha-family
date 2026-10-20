"""AI in HA Family: via Home Assistants eigen AI Task (Ollama, OpenAI, Google …), met altijd een terugval zonder AI.

- weekmenu: lege dagen vullen met recepten uit de eigen verzameling (afwisselend, favorieten vaker)
- recept: een compleet recept uit een korte vraag ("iets snels met kip en rijst")
- dagoverzicht: 's ochtends in een paar zinnen wat er vandaag is (agenda, afval, eten, klusjes, weer, jarigen)
- klusjes: ideeën die passen bij de leeftijd van een kind"""
from __future__ import annotations

import datetime as dt
import json
import logging
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)


def ai_entity(hass: HomeAssistant) -> str | None:
    st = sorted(hass.states.async_all("ai_task"), key=lambda s: s.entity_id)
    return st[0].entity_id if st else None


async def vraag(hass: HomeAssistant, taak: str, instructies: str) -> Any:
    """Vraag de AI iets; geeft tekst of (als het JSON is) de JSON terug. Gooit FamilyFout als er geen AI is of het mislukt."""
    ent = ai_entity(hass)
    if not ent:
        raise FamilyFout("Er is nog geen AI gekoppeld in Home Assistant (bijvoorbeeld Ollama, OpenAI of Google).")
    try:
        r = await hass.services.async_call("ai_task", "generate_data", {"task_name": taak, "entity_id": ent, "instructions": instructies},
                                           blocking=True, return_response=True)
    except HomeAssistantError as ex:
        raise FamilyFout(f"De AI gaf geen antwoord: {ex}") from ex
    return r["data"] if isinstance(r, dict) else r


def _json(antwoord: Any, soort: type) -> Any:
    if isinstance(antwoord, soort):
        return antwoord
    tekst = str(antwoord)
    m = re.search(r"\[.*\]" if soort is list else r"\{.*\}", tekst, re.S)
    if not m:
        raise ValueError("geen JSON in het antwoord")
    return json.loads(m.group(0))


# ── 🍝 weekmenu ──
async def weekmenu(gezin, van: dt.date, dagen: int, wens: str | None) -> dict[str, Any]:
    m = gezin.maaltijden
    menu = m.menu(van, dagen)
    leeg = [d["datum"] for d in menu if not d["naam"]]
    recepten = gezin.data["recepten"]
    if not leeg:
        return {"bron": "geen", "gepland": []}
    if not recepten:
        raise FamilyFout("Er zijn nog geen recepten. Begin met het startpakket of zet er zelf een paar in.")
    keuze: dict[str, str] = {}
    bron = "lijst"
    if ai_entity(gezin.hass):
        try:
            lijst = "\n".join(f"- {r['id']}: {r['naam']} ({', '.join(r.get('labels') or []) or '-'}{', favoriet' if r.get('favoriet') else ''})" for r in recepten[:80])
            al = "; ".join(f"{d['datum']}: {d['naam']}" for d in menu if d["naam"]) or "niets"
            antwoord = await vraag(gezin.hass, "weekmenu", (
                f"Maak een afwisselend avondeten-menu voor een Nederlands gezin voor deze dagen: {', '.join(leeg)}.\n"
                f"Kies ALLEEN uit deze recepten (id: naam (labels)):\n{lijst}\n"
                f"Al gepland: {al}. Niet twee dagen achter elkaar hetzelfde soort gerecht; favorieten mogen vaker; doordeweeks liefst snel.\n"
                + (f"Wens van het gezin: {wens[:300]}\n" if wens else "")
                + 'Antwoord alleen met JSON: een lijst van objecten {"datum": "YYYY-MM-DD", "recept": "<id>"}.'))
            ids = {r["id"] for r in recepten}
            for x in _json(antwoord, list):
                if isinstance(x, dict) and x.get("datum") in leeg and x.get("recept") in ids:
                    keuze[x["datum"]] = x["recept"]
            bron = "ai" if keuze else "lijst"
        except (FamilyFout, ValueError, TypeError, json.JSONDecodeError) as ex:
            _LOGGER.warning("Weekmenu via AI mislukt, terug naar de eigen keuze: %s", ex)
    gebruikt = set(keuze.values())
    for d in leeg:                                         # wat de AI niet invulde: de gewone suggestie
        if d not in keuze:
            for _ in range(5):
                s = m.suggestie()
                if s and (s["id"] not in gebruikt or len(recepten) <= len(gebruikt)):
                    break
            if s:
                keuze[d] = s["id"]
                gebruikt.add(s["id"])
    for d, r in keuze.items():
        m.plan(d, recept=r)
    return {"bron": bron, "gepland": sorted(keuze)}


# ── 📖 recept bedenken ──
async def recept(gezin, wens: str, door: str | None) -> dict[str, Any]:
    from .maaltijden import LABELS

    antwoord = await vraag(gezin.hass, "recept", (
        f"Bedenk een recept voor het avondeten van een Nederlands gezin. Vraag: {wens[:400]}\n"
        "Gebruik ingrediënten die in een Nederlandse supermarkt liggen, met hoeveelheden (bijv. '400 g kipfilet').\n"
        f"Kies labels uit: {', '.join(LABELS)}.\n"
        'Antwoord alleen met JSON: {"naam": "...", "emoji": "één emoji", "personen": 4, "ingredienten": ["..."], '
        '"bereiding": "stappen, elk op een nieuwe regel", "labels": ["..."]}.'))
    try:
        r = _json(antwoord, dict)
    except (ValueError, json.JSONDecodeError) as ex:
        raise FamilyFout("De AI gaf geen bruikbaar recept. Probeer het nog eens, of anders verwoord.") from ex
    if isinstance(r.get("bereiding"), list):
        r["bereiding"] = "\n".join(str(x) for x in r["bereiding"])
    return gezin.maaltijden.recept({k: r.get(k) for k in ("naam", "emoji", "personen", "ingredienten", "bereiding", "labels")}, door)


# ── ☀️ dagoverzicht ──
async def _feiten(gezin, dag: dt.date) -> dict[str, Any]:
    ev = await gezin.agenda.events(dag, dag + dt.timedelta(days=2))
    lmap = {l["id"]: l["naam"].split(" ")[0] for l in gezin.leden}
    vandaag = [e for e in ev if e["start"][:10] == dag.isoformat()]
    morgen = (dag + dt.timedelta(days=1)).isoformat()
    weer = next(iter(gezin.hass.states.async_all("weather")), None)
    eten = gezin.maaltijden.vandaag()
    klusjes = [k for k in gezin.taken.klusjes_vandaag(dag) if k.get("status") == "open"] if hasattr(gezin.taken, "klusjes_vandaag") else []
    return {
        "datum": dag.strftime("%A %-d %B"),
        "afspraken": [f"{e['start'][11:16] or 'hele dag'} {e['titel']}" + (f" ({', '.join(lmap.get(w, '') for w in e.get('wie') or [])})" if e.get("wie") else "")
                      for e in vandaag if e["soort"] not in ("afval", "verjaardag")],
        "jarig": [e["titel"] for e in vandaag if e["soort"] == "verjaardag"],
        "afval_vandaag": [e["titel"] for e in vandaag if e["soort"] == "afval"],
        "afval_morgen": [e["titel"] for e in ev if e["soort"] == "afval" and e["start"][:10] == morgen],
        "eten": eten["naam"], "kok": lmap.get(eten.get("kok") or "", None),
        "klusjes_open": len(klusjes),
        "weer": f"{weer.state}, {weer.attributes.get('temperature')}°" if weer else None,
    }


def _zonder_ai(f: dict[str, Any]) -> str:
    delen = []
    delen.append(f"Vandaag {len(f['afspraken'])} afspraak{'en' if len(f['afspraken']) != 1 else ''}" + (f": {f['afspraken'][0]}" + (" en meer" if len(f["afspraken"]) > 1 else "") if f["afspraken"] else "") + ".")
    if f["jarig"]:
        delen.append(f"🎂 {', '.join(f['jarig'])}!")
    if f["afval_morgen"]:
        delen.append(f"Vanavond de container aan de straat: {', '.join(f['afval_morgen'])}.")
    delen.append(f"Eten: {f['eten']}" + (f", {f['kok']} kookt." if f["kok"] else ".") if f["eten"] else "Nog niks gepland voor het eten.")
    if f["klusjes_open"]:
        delen.append(f"Nog {f['klusjes_open']} klusje{'s' if f['klusjes_open'] != 1 else ''} te doen.")
    return " ".join(delen)


async def dagoverzicht(gezin, opnieuw: bool = False) -> dict[str, Any]:
    nu = dt_util.now()
    dag = nu.date()
    bewaard = gezin.data.get("dagoverzicht") or {}
    if not opnieuw and bewaard.get("datum") == dag.isoformat() and bewaard.get("tekst"):
        return bewaard
    f = await _feiten(gezin, dag)
    tekst, bron = _zonder_ai(f), "lijst"
    if ai_entity(gezin.hass):
        try:
            t = await vraag(gezin.hass, "dagoverzicht", (
                "Schrijf voor het gezin een kort, vrolijk dagoverzicht in het Nederlands: 2 tot 4 zinnen, met hooguit 2 emoji, "
                "zonder opsommingstekens en zonder dingen te verzinnen die hieronder niet staan. Spreek het gezin aan met 'jullie'.\n"
                f"Gegevens: {json.dumps(f, ensure_ascii=False)}"))
            t = str(t).strip().strip('"')
            if 10 < len(t) < 700:
                tekst, bron = t, "ai"
        except FamilyFout as ex:
            _LOGGER.warning("Dagoverzicht via AI mislukt: %s", ex)
    gezin.data["dagoverzicht"] = {"datum": dag.isoformat(), "tekst": tekst, "bron": bron, "gemaakt": nu.isoformat()}
    gezin.opslaan()
    return gezin.data["dagoverzicht"]


# ── ⭐ klusjes-ideeën ──
async def klusjes(gezin, lid_id: str) -> dict[str, Any]:
    from .cadeaus import leeftijd
    from .taken import VOORBEELDEN

    lid = gezin.lid(lid_id)
    jaar = leeftijd(lid.get("geboortedatum"))
    bestaand = [k["titel"] for k in gezin.data.get("klusjes", [])]
    if ai_entity(gezin.hass):
        try:
            antwoord = await vraag(gezin.hass, "klusjes", (
                f"Bedenk 8 klusjes in huis voor {lid['naam'].split(' ')[0]}" + (f", {jaar} jaar" if jaar is not None else "")
                + (", met interesses: " + ", ".join(lid.get("interesses") or []) if lid.get("interesses") else "")
                + ". Passend bij de leeftijd, veilig, en leuk om te doen. Niet deze, die bestaan al: " + ("; ".join(bestaand[:30]) or "geen") + ".\n"
                'Punten: 1 (heel klein) tot 5 (groot). Antwoord alleen met JSON: een lijst van {"emoji": "...", "titel": "kort", "punten": 2}.'))
            uit = [{"emoji": str(x.get("emoji") or "⭐")[:4], "titel": str(x["titel"])[:60], "punten": max(1, min(10, int(x.get("punten") or 2)))}
                   for x in _json(antwoord, list) if isinstance(x, dict) and x.get("titel")]
            if uit:
                return {"bron": "ai", "ideeen": uit[:10]}
        except (FamilyFout, ValueError, TypeError, json.JSONDecodeError) as ex:
            _LOGGER.warning("Klusjes via AI mislukt, terug naar de voorbeelden: %s", ex)
    klein = jaar is not None and jaar < 8
    return {"bron": "lijst", "ideeen": [{"emoji": e, "titel": t, "punten": p} for e, t, p in VOORBEELDEN
                                         if t not in bestaand and (not klein or p <= 3)][:10]}
