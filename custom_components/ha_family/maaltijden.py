"""Maaltijdplanner: recepten, het weekmenu (met wie er kookt) en ingrediënten naar de boodschappenlijst.

Een recept kun je zelf maken, uit het startpakket halen of van een website importeren (de meeste receptensites zetten het
recept als 'schema.org/Recipe' in de pagina). Het weekmenu is per dag: een recept of vrije tekst, en wie er kookt."""
from __future__ import annotations

import datetime as dt
import html
import json
import logging
import random
import re
import secrets
import time
from typing import Any

from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout, Gezin

_LOGGER = logging.getLogger(__name__)
LABELS = ["snel", "vega", "vis", "kinderen", "feest", "budget", "oven", "soep"]

STARTPAKKET = [
    ("🍝", "Spaghetti bolognese", ["500 g gehakt", "1 ui", "2 tenen knoflook", "1 blik tomatenblokjes", "1 blikje tomatenpuree", "400 g spaghetti", "geraspte kaas"], ["kinderen"]),
    ("🥞", "Pannenkoeken", ["500 g pannenkoekmix", "1 l melk", "2 eieren", "boter", "stroop", "poedersuiker"], ["kinderen", "snel"]),
    ("🍛", "Nasi goreng", ["400 g rijst", "300 g kipfilet", "1 zakje nasi-mix", "1 ui", "200 g prei", "4 eieren", "kroepoek", "satésaus"], []),
    ("🥬", "Boerenkoolstamppot met rookworst", ["1 kg aardappelen", "500 g boerenkool", "1 rookworst", "100 g spekjes", "melk", "boter", "mosterd"], []),
    ("🌮", "Taco's", ["8 tacoschelpen", "500 g gehakt", "1 zakje tacokruiden", "1 krop ijsbergsla", "2 tomaten", "geraspte kaas", "zure room", "salsa"], ["kinderen", "snel"]),
    ("🍕", "Zelfgemaakte pizza", ["2 pizzabodems", "tomatensaus", "2 bollen mozzarella", "100 g salami", "1 paprika", "champignons", "oregano"], ["kinderen", "oven"]),
    ("🍗", "Kip met rijst en broccoli", ["400 g kipfilet", "300 g rijst", "500 g broccoli", "sojasaus", "1 ui", "2 tenen knoflook"], ["snel"]),
    ("🧀", "Macaroni met ham en kaas", ["400 g macaroni", "200 g hamblokjes", "1 ui", "1 blik tomatenblokjes", "geraspte kaas", "1 paprika"], ["kinderen", "oven"]),
    ("🍲", "Tomatensoep met broodjes", ["1 l tomatensoep", "250 g soepballetjes", "6 afbakbroodjes", "boter", "kaas"], ["soep", "snel", "budget"]),
    ("🌯", "Wraps met kip", ["8 wraps", "400 g kipfilet", "1 zakje wrapkruiden", "1 komkommer", "2 tomaten", "1 krop sla", "geraspte kaas", "knoflooksaus"], ["snel", "kinderen"]),
]


def _nieuw_id() -> str:
    return secrets.token_hex(5)


def boodschap_van(ingredient: str) -> str:
    """'500 g gehakt' → 'gehakt', '2 tenen knoflook' → 'knoflook': hoeveelheden weg voor de boodschappenlijst."""
    t = ingredient.strip()
    t = re.sub(r"^\s*[\d.,/½¼¾⅓]+\s*(-\s*[\d.,]+\s*)?", "", t)
    t = re.sub(r"^(g|gr|gram|kg|kilo|ml|cl|dl|l|liter|el|tl|eetlepels?|theelepels?|stuks?|st|zakjes?|blikjes?|blikken|blik|potjes?|pot|bosjes?|bos|"
               r"tenen|teen|plakjes?|plakken|bollen|bol|kopjes?|snufje|scheutje|takjes?|handje|krop|pakjes?|pak|bakjes?|bakje|rollen|rol)\b\.?\s+", "", t,
               flags=re.IGNORECASE)
    t = re.sub(r"\s*\(.*?\)", "", t)
    t = t.split(",")[0].strip()
    return t[:1].lower() + t[1:] if t else ingredient.strip()


class Maaltijden:
    def __init__(self, gezin: Gezin) -> None:
        self.gezin = gezin
        self.hass = gezin.hass
        d = gezin.data
        d.setdefault("recepten", [])
        d.setdefault("menu", {})
        d.setdefault("eten_instellingen", {"herinnering": {"aan": True, "tijd": "16:00"}})

    # ── recepten ──
    def recept(self, data: dict[str, Any], door: str | None = None) -> dict[str, Any]:
        naam = (data.get("naam") or "").strip()[:80]
        if not naam:
            raise FamilyFout("Hoe heet het gerecht?")
        ingr = data.get("ingredienten") or []
        if isinstance(ingr, str):
            ingr = ingr.splitlines()
        ingr = [i.strip()[:120] for i in ingr if i.strip()][:60]
        personen = int(data.get("personen") or 4)
        if not 1 <= personen <= 50:
            raise FamilyFout("Voor hoeveel personen?")
        link = (data.get("link") or "").strip()[:500]
        if link and not re.match(r"^https?://", link):
            raise FamilyFout("Een link begint met https://.")
        lijst = self.gezin.data["recepten"]
        oud = next((r for r in lijst if r["id"] == data.get("id")), None) if data.get("id") else None
        r = oud or {"id": _nieuw_id(), "door": door, "gemaakt": time.time()}
        r.update(naam=naam, emoji=(data.get("emoji") or "🍽️")[:4], ingredienten=ingr, personen=personen,
                 bereiding=(data.get("bereiding") or "").strip()[:5000], link=link or None,
                 labels=[x for x in data.get("labels") or [] if x in LABELS], favoriet=bool(data.get("favoriet", r.get("favoriet", False))),
                 afbeelding=(data.get("afbeelding") or r.get("afbeelding") or None))
        if not oud:
            lijst.append(r)
        self.gezin.opslaan()
        return r

    def recept_weg(self, recept_id: str) -> None:
        self._recept(recept_id)
        self.gezin.data["recepten"] = [r for r in self.gezin.data["recepten"] if r["id"] != recept_id]
        for dag in self.gezin.data["menu"].values():
            if dag.get("recept") == recept_id:
                dag["recept"] = None
        self.gezin.opslaan()

    def startpakket(self) -> int:
        """De bekende gezinsgerechten toevoegen (wat er al is, niet nog een keer)."""
        bestaand = {r["naam"].lower() for r in self.gezin.data["recepten"]}
        n = 0
        for emoji, naam, ingr, labels in STARTPAKKET:
            if naam.lower() not in bestaand:
                self.recept({"naam": naam, "emoji": emoji, "ingredienten": ingr, "personen": 4, "labels": labels})
                n += 1
        return n

    def _recept(self, recept_id: str) -> dict[str, Any]:
        for r in self.gezin.data["recepten"]:
            if r["id"] == recept_id:
                return r
        raise FamilyFout("Dit recept bestaat niet (meer).")

    # ── weekmenu ──
    def plan(self, datum: str, recept: str | None = None, tekst: str | None = None, kok: str | None = None, notitie: str | None = None) -> dict[str, Any]:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", datum or ""):
            raise FamilyFout("Kies een dag.")
        if recept:
            self._recept(recept)
        if kok and not any(l["id"] == kok for l in self.gezin.leden):
            raise FamilyFout("Onbekend gezinslid.")
        tekst = (tekst or "").strip()[:80] or None
        if not recept and not tekst:
            self.gezin.data["menu"].pop(datum, None)
            self.gezin.opslaan()
            return {}
        dag = {"recept": recept or None, "tekst": None if recept else tekst, "kok": kok or None, "notitie": (notitie or "").strip()[:200] or None}
        self.gezin.data["menu"][datum] = dag
        self._opruimen()
        self.gezin.opslaan()
        return dag

    def menu(self, van: dt.date, dagen: int = 7) -> list[dict[str, Any]]:
        uit = []
        for i in range(dagen):
            d = (van + dt.timedelta(days=i)).isoformat()
            m = self.gezin.data["menu"].get(d) or {}
            r = next((x for x in self.gezin.data["recepten"] if x["id"] == m.get("recept")), None) if m.get("recept") else None
            uit.append({"datum": d, "recept": r["id"] if r else None, "naam": r["naam"] if r else m.get("tekst"), "emoji": r["emoji"] if r else ("🍽️" if m.get("tekst") else None),
                        "kok": m.get("kok"), "notitie": m.get("notitie")})
        return uit

    def vandaag(self) -> dict[str, Any]:
        return self.menu(dt_util.now().date(), 1)[0]

    def suggestie(self, label: str | None = None) -> dict[str, Any] | None:
        """Een recept dat de afgelopen twee weken niet op het menu stond (favorieten vaker)."""
        recent = {m.get("recept") for d, m in self.gezin.data["menu"].items() if d >= (dt_util.now().date() - dt.timedelta(days=14)).isoformat()}
        pot = [r for r in self.gezin.data["recepten"] if r["id"] not in recent and (not label or label in r.get("labels", []))]
        if not pot:
            pot = [r for r in self.gezin.data["recepten"] if not label or label in r.get("labels", [])]
        if not pot:
            return None
        return random.choice(pot + [r for r in pot if r.get("favoriet")])

    # ── naar de boodschappen ──
    def naar_boodschappen(self, recept: str | None = None, van: str | None = None, dagen: int = 1, door: str | None = None) -> dict[str, Any]:
        """Ingrediënten van één recept, of van alle recepten in het menu vanaf 'van' (dagen lang), op de boodschappenlijst."""
        ids: list[str] = []
        if recept:
            ids = [self._recept(recept)["id"]]
        elif van:
            start = dt.date.fromisoformat(van)
            ids = [m["recept"] for m in self.menu(start, max(1, min(dagen, 31))) if m["recept"]]
        if not ids:
            raise FamilyFout("Er staan nog geen recepten op het menu.")
        dingen = []
        for i in ids:
            dingen += [boodschap_van(x) for x in self._recept(i)["ingredienten"]]
        uniek = list(dict.fromkeys(x for x in dingen if x))
        nieuw = self.gezin.taken.boodschap(", ".join(u.replace(",", " ") for u in uniek), door)
        return {"nieuw": [b["titel"] for b in nieuw], "al": len(uniek) - len(nieuw)}

    def _opruimen(self) -> None:
        grens = (dt_util.now().date() - dt.timedelta(days=60)).isoformat()
        for d in [d for d in self.gezin.data["menu"] if d < grens]:
            self.gezin.data["menu"].pop(d)

    # ── importeren van een website ──
    async def importeren(self, url: str, door: str | None = None) -> dict[str, Any]:
        url = url.strip()
        if not re.match(r"^https?://", url):
            raise FamilyFout("Plak de hele link, die begint met https://.")
        try:
            sessie = async_get_clientsession(self.hass)
            async with sessie.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0 (HA Family receptimport)", "Accept-Language": "nl,en"}) as r:
                if r.status != 200:
                    raise FamilyFout(f"De website gaf geen pagina terug (fout {r.status}).")
                tekst = await r.text(errors="replace")
        except FamilyFout:
            raise
        except Exception as ex:  # noqa: BLE001
            raise FamilyFout(f"De website is niet bereikbaar: {ex}") from ex
        data = lees_recept(tekst)
        if not data:
            raise FamilyFout("Op deze pagina staat geen recept dat HA Family kan lezen. Neem het over met + Recept.")
        data["link"] = url
        return self.recept(data, door)


def _als_lijst(x: Any) -> list[Any]:
    return x if isinstance(x, list) else [x] if x else []


def _tekst(x: Any) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(x)))).strip()


def lees_recept(pagina: str) -> dict[str, Any] | None:
    """Het schema.org/Recipe uit de JSON-LD van een pagina halen."""
    for blok in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', pagina, flags=re.S | re.I):
        try:
            data = json.loads(blok.strip())
        except ValueError:
            continue
        kandidaten = []
        for item in _als_lijst(data):
            if isinstance(item, dict):
                kandidaten += [item] + [x for x in _als_lijst(item.get("@graph")) if isinstance(x, dict)]
        for k in kandidaten:
            soort = _als_lijst(k.get("@type"))
            if "Recipe" not in soort:
                continue
            stappen = []
            for s in _als_lijst(k.get("recipeInstructions")):
                if isinstance(s, dict):
                    if s.get("@type") == "HowToSection":
                        stappen += [_tekst(x.get("text", "")) for x in _als_lijst(s.get("itemListElement")) if isinstance(x, dict)]
                    else:
                        stappen.append(_tekst(s.get("text", "")))
                else:
                    stappen.append(_tekst(s))
            personen = re.search(r"\d+", " ".join(str(x) for x in _als_lijst(k.get("recipeYield")))) if k.get("recipeYield") else None
            afb = _als_lijst(k.get("image"))
            afb = afb[0] if afb else None
            if isinstance(afb, dict):
                afb = afb.get("url")
            return {"naam": _tekst(k.get("name", ""))[:80], "ingredienten": [_tekst(i) for i in _als_lijst(k.get("recipeIngredient"))],
                    "bereiding": "\n".join(f"{n}. {s}" for n, s in enumerate([s for s in stappen if s], 1)),
                    "personen": int(personen.group()) if personen and 0 < int(personen.group()) <= 50 else 4, "emoji": "🍽️",
                    "afbeelding": afb if isinstance(afb, str) and afb.startswith("http") else None}
    return None
