"""Cadeaus: verlanglijstjes per gezinslid en cadeau-ideeën (HA-Family-Integrations).

- Iedereen maakt zijn eigen verlanglijstje (ouders ook dat van een kind) en kan het naar andere gezinsleden sturen.
- Anderen vinken stiekem af wat ze kopen: de eigenaar ziet nooit wát er gekocht is of door wie.
- Cadeau-ideeën voor iemand op basis van leeftijd, geslacht, interesses, budget en het verlanglijstje. Is er in Home
  Assistant een AI gekoppeld (AI Task, bijv. Ollama, OpenAI of Google), dan bedenkt die ze; anders een eigen ideeënlijst.
- Twee weken voor een verjaardag krijgen de anderen een seintje met het verlanglijstje."""
from __future__ import annotations

import datetime as dt
import json
import logging
import re
import secrets
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)

GESLACHTEN = ["man", "vrouw", "anders"]
GELEGENHEDEN = ["verjaardag", "sinterklaas", "kerst", "zomaar"]
INTERESSES = ["voetbal", "sport", "gamen", "lezen", "muziek", "tekenen", "knutselen", "koken", "bakken", "tuinieren", "techniek", "lego",
              "dieren", "paarden", "dansen", "mode", "make-up", "film", "series", "reizen", "fotografie", "puzzels", "spelletjes", "buiten",
              "fietsen", "wellness", "koffie", "wijn", "3D-printen", "auto's"]

# (emoji, titel, prijs, min_leeftijd, max_leeftijd, labels) — de terugvallijst zonder AI
IDEEEN: list[tuple[str, str, int, int, int, tuple[str, ...]]] = [
    ("⚽", "Een nieuwe voetbal van de club", 25, 4, 99, ("voetbal", "sport", "buiten")),
    ("🥅", "Voetbaldoeltjes voor in de tuin", 35, 4, 14, ("voetbal", "buiten")),
    ("👕", "Shirt van de favoriete club", 70, 6, 99, ("voetbal", "sport")),
    ("🎟️", "Kaartjes voor een wedstrijd, samen", 60, 8, 99, ("voetbal", "sport")),
    ("🎮", "Een game die op het lijstje van vrienden staat", 50, 8, 99, ("gamen",)),
    ("🎧", "Een goede gaming-headset", 60, 10, 99, ("gamen", "muziek")),
    ("💳", "Tegoed voor de game-winkel", 25, 10, 99, ("gamen",)),
    ("📚", "Het nieuwste deel van een favoriete boekenserie", 20, 6, 99, ("lezen",)),
    ("🔦", "Leeslampje voor in bed", 15, 5, 99, ("lezen",)),
    ("🎫", "Boekenbon", 20, 8, 99, ("lezen",)),
    ("🎵", "Concertkaartjes", 70, 12, 99, ("muziek",)),
    ("🔊", "Kleine bluetooth-speaker", 40, 8, 99, ("muziek",)),
    ("🎸", "Muziekles (proefles)", 30, 6, 99, ("muziek",)),
    ("🖍️", "Mooie set kleurpotloden of stiften", 25, 4, 99, ("tekenen", "knutselen")),
    ("📓", "Schetsboek met goede tekenpennen", 20, 8, 99, ("tekenen",)),
    ("✂️", "Knutseldoos met van alles", 25, 4, 12, ("knutselen",)),
    ("🍳", "Kookboek van een favoriete chef", 25, 12, 99, ("koken",)),
    ("🔪", "Een goed koksmes", 60, 18, 99, ("koken",)),
    ("🧁", "Bakset met vormpjes en een receptenboek", 25, 6, 99, ("bakken",)),
    ("🌱", "Kweekset voor kruiden of tomaten", 20, 6, 99, ("tuinieren",)),
    ("🧤", "Goede tuinhandschoenen en een plantenschepje", 25, 12, 99, ("tuinieren",)),
    ("🤖", "Bouw-en-programmeer-robot", 60, 8, 16, ("techniek", "lego")),
    ("🧱", "LEGO-set uit de favoriete serie", 50, 5, 99, ("lego",)),
    ("🐾", "Iets leuks voor het huisdier", 20, 4, 99, ("dieren",)),
    ("🐴", "Paardrijles of een dagje manege", 45, 6, 99, ("paarden", "dieren")),
    ("💃", "Danslessen (proefles)", 30, 6, 99, ("dansen",)),
    ("👟", "Nieuwe sneakers", 80, 10, 99, ("mode",)),
    ("💄", "Make-upsetje van een favoriet merk", 30, 12, 99, ("make-up", "mode")),
    ("🍿", "Bioscoopbon met popcorn", 25, 6, 99, ("film", "series")),
    ("📺", "Een maand streaming", 15, 12, 99, ("series", "film")),
    ("🗺️", "Reisgids voor de droombestemming", 25, 14, 99, ("reizen",)),
    ("📷", "Instant-camera met filmpjes", 80, 8, 99, ("fotografie",)),
    ("🧩", "Puzzel van 1000 stukjes", 20, 10, 99, ("puzzels",)),
    ("🎲", "Gezelschapsspel voor het hele gezin", 30, 6, 99, ("spelletjes",)),
    ("⛺", "Een nachtje kamperen samen", 50, 6, 99, ("buiten", "reizen")),
    ("🚲", "Fietsaccessoires (lampjes, bel, tas)", 30, 6, 99, ("fietsen",)),
    ("🧖", "Dagje sauna of wellness", 60, 18, 99, ("wellness",)),
    ("☕", "Lekkere koffiebonen en een mooie mok", 25, 18, 99, ("koffie",)),
    ("🍷", "Een goede fles wijn met een wijngids", 35, 18, 99, ("wijn",)),
    ("🖨️", "Een paar rollen bijzonder filament", 40, 12, 99, ("3D-printen", "techniek")),
    ("🚗", "Auto-onderhoudsset of een dagje karten", 40, 16, 99, ("auto's",)),
    # algemeen, voor iedereen
    ("🎁", "Een dagje samen uit, naar keuze", 50, 4, 99, ()),
    ("💌", "Een zelfgemaakte bon: ik doe een week jouw klusje", 0, 4, 99, ()),
    ("🧸", "Een zachte knuffel", 20, 0, 6, ()),
    ("🛝", "Buitenspeelgoed (stoepkrijt, bellenblaas)", 15, 2, 9, ()),
    ("🧦", "Gekke sokken in hun lievelingskleur", 10, 6, 99, ()),
    ("🖼️", "Fotoboek met mooie gezinsfoto's", 35, 12, 99, ()),
    ("🌹", "Bloemen en een lieve kaart", 20, 18, 99, ()),
]


def leeftijd(geboortedatum: str | None, op: dt.date | None = None) -> int | None:
    if not geboortedatum:
        return None
    try:
        g = dt.date.fromisoformat(geboortedatum)
    except ValueError:
        return None
    op = op or dt_util.now().date()
    return op.year - g.year - ((op.month, op.day) < (g.month, g.day))


def volgende_verjaardag(geboortedatum: str | None, vandaag: dt.date | None = None) -> dt.date | None:
    if not geboortedatum:
        return None
    vandaag = vandaag or dt_util.now().date()
    g = dt.date.fromisoformat(geboortedatum)
    for jaar in (vandaag.year, vandaag.year + 1):
        try:
            d = g.replace(year=jaar)
        except ValueError:                                 # 29 februari
            d = dt.date(jaar, 3, 1)
        if d >= vandaag:
            return d
    return None


def _prijs(x: Any) -> float | None:
    if x in (None, ""):
        return None
    try:
        p = float(str(x).replace("€", "").replace(",", ".").strip())
    except ValueError as ex:
        raise FamilyFout("De prijs is geen bedrag.") from ex
    if p < 0 or p > 100000:
        raise FamilyFout("De prijs is geen bedrag.")
    return round(p, 2)


class Cadeaus:
    def __init__(self, gezin) -> None:
        self.gezin = gezin
        self.hass: HomeAssistant = gezin.hass
        gezin.data.setdefault("wensen", [])
        gezin.data.setdefault("cadeau_ideeen", {})        # {van_lid: [{id, voor, titel, prijs, emoji}]} — alleen voor jezelf

    # ── rechten ──
    async def mag_lijst_bewerken(self, ik: dict | None, eigenaar: str, is_admin: bool) -> bool:
        if ik and ik["id"] == eigenaar:
            return True
        doel = self.gezin.lid(eigenaar)
        ouder = (ik and ik["rol"] == "ouder") or is_admin
        return bool(ouder and doel["rol"] in ("kind",))      # ouders helpen kinderen met hun lijstje

    # ── verlanglijstjes ──
    def lijst(self, eigenaar: str, voor: str | None) -> list[dict[str, Any]]:
        """De wensen van 'eigenaar', zoals 'voor' ze mag zien: de eigenaar ziet niet wat er gekocht is."""
        uit = []
        for w in sorted((w for w in self.gezin.data["wensen"] if w["lid"] == eigenaar), key=lambda w: w["gemaakt"]):
            x = {k: w.get(k) for k in ("id", "lid", "titel", "link", "prijs", "notitie", "emoji", "gemaakt")}
            if voor != eigenaar:
                door = w.get("gekocht_door")
                x["gekocht"] = bool(door)
                x["door_mij"] = bool(door and door == voor)
                x["gekocht_door"] = self.gezin.lid(door)["naam"] if door and any(l["id"] == door for l in self.gezin.leden) else None
            uit.append(x)
        return uit

    def wens(self, eigenaar: str, data: dict[str, Any], wens_id: str | None = None) -> dict[str, Any]:
        titel = (data.get("titel") or "").strip()
        if not titel:
            raise FamilyFout("Wat wens je? Vul iets in.")
        link = (data.get("link") or "").strip() or None
        if link and not re.match(r"^https?://", link):
            raise FamilyFout("De link moet met http:// of https:// beginnen.")
        velden = {"titel": titel[:120], "link": link, "prijs": _prijs(data.get("prijs")), "notitie": (data.get("notitie") or "").strip()[:500],
                  "emoji": (data.get("emoji") or "🎁")[:4]}
        if wens_id:
            w = self._wens(wens_id)
            if w["lid"] != eigenaar:
                raise FamilyFout("Dit staat niet op dit lijstje.")
            w.update(velden)
        else:
            if sum(1 for x in self.gezin.data["wensen"] if x["lid"] == eigenaar) >= 100:
                raise FamilyFout("Het lijstje is vol (100 wensen).")
            w = {"id": secrets.token_hex(5), "lid": eigenaar, "gemaakt": dt_util.now().isoformat(), "gekocht_door": None, **velden}
            self.gezin.data["wensen"].append(w)
        self.gezin.opslaan()
        return w

    def _wens(self, wens_id: str) -> dict[str, Any]:
        w = next((w for w in self.gezin.data["wensen"] if w["id"] == wens_id), None)
        if not w:
            raise FamilyFout("Die wens bestaat niet meer.")
        return w

    def wens_weg(self, wens_id: str) -> dict[str, Any]:
        w = self._wens(wens_id)
        self.gezin.data["wensen"].remove(w)
        self.gezin.opslaan()
        return w

    def kopen(self, wens_id: str, koper: str, gekocht: bool) -> None:
        w = self._wens(wens_id)
        if w["lid"] == koper:
            raise FamilyFout("Je eigen wensen kun je niet afvinken, dat zou de verrassing verpesten 😉")
        if gekocht:
            if w.get("gekocht_door") and w["gekocht_door"] != koper:
                raise FamilyFout("Iemand anders koopt dit al.")
            w["gekocht_door"] = koper
        elif w.get("gekocht_door") == koper:
            w["gekocht_door"] = None
        self.gezin.opslaan()

    async def sturen(self, eigenaar: str, naar: list[str], door: dict | None) -> int:
        e = self.gezin.lid(eigenaar)
        wensen = [w for w in self.gezin.data["wensen"] if w["lid"] == eigenaar]
        if not wensen:
            raise FamilyFout("Het lijstje is nog leeg.")
        voorbeeld = ", ".join(w["titel"] for w in wensen[:3]) + (" …" if len(wensen) > 3 else "")
        van = door["naam"] if door else e["naam"]
        titel = f"🎁 Verlanglijstje van {e['naam']}"
        tekst = (f"{van} stuurt je het verlanglijstje van {e['naam']} ({len(wensen)}): {voorbeeld}" if door and door["id"] != eigenaar
                 else f"{e['naam']} stuurt je zijn/haar verlanglijstje ({len(wensen)}): {voorbeeld}")
        n = 0
        for lid_id in naar:
            if lid_id == eigenaar:
                continue
            lid = self.gezin.lid(lid_id)
            try:
                if await self.gezin.melding(lid, titel, tekst, url=f"/gezin/cadeaus?lid={eigenaar}", clickAction=f"/gezin/cadeaus?lid={eigenaar}"):
                    n += 1
            except FamilyFout as ex:
                _LOGGER.warning("Verlanglijstje naar %s mislukt: %s", lid["naam"], ex)
        if not n:
            raise FamilyFout("Niemand kon een melding krijgen: koppel eerst een telefoon bij die gezinsleden.")
        return n

    # ── ideeën ──
    def ai_entity(self) -> str | None:
        st = sorted(self.hass.states.async_all("ai_task"), key=lambda s: s.entity_id)
        return st[0].entity_id if st else None

    async def ideeen(self, voor: str, budget: float | None, gelegenheid: str | None, extra: str | None) -> dict[str, Any]:
        lid = self.gezin.lid(voor)
        jaar = leeftijd(lid.get("geboortedatum"))
        al = [w["titel"] for w in self.gezin.data["wensen"] if w["lid"] == voor]
        ai = self.ai_entity()
        if ai:
            try:
                return {"bron": "ai", "ideeen": await self._ai(ai, lid, jaar, budget, gelegenheid, extra, al)}
            except (HomeAssistantError, ValueError, KeyError, TypeError) as ex:
                _LOGGER.warning("Cadeau-ideeën via AI mislukt, terug naar de eigen lijst: %s", ex)
        return {"bron": "lijst", "ideeen": self._lijst(lid, jaar, budget)}

    def _lijst(self, lid: dict, jaar: int | None, budget: float | None) -> list[dict[str, Any]]:
        interesses = {i.lower() for i in lid.get("interesses") or []}
        jaar = jaar if jaar is not None else 30
        pot = [i for i in IDEEEN if i[3] <= jaar <= i[4] and (budget is None or i[2] <= budget)]
        raak = [i for i in pot if interesses & set(i[5])]
        rest = [i for i in pot if not i[5]]
        secrets.SystemRandom().shuffle(raak)
        secrets.SystemRandom().shuffle(rest)
        gekozen = (raak[:6] + rest)[:8]
        return [{"emoji": e, "titel": t, "prijs": p or None,
                 "waarom": ("Past bij: " + ", ".join(sorted(interesses & set(lab)))) if interesses & set(lab) else "Altijd leuk"} for e, t, p, _, _, lab in gekozen]

    async def _ai(self, entity: str, lid: dict, jaar: int | None, budget: float | None, gelegenheid: str | None, extra: str | None,
                  al: list[str]) -> list[dict[str, Any]]:
        geslacht = {"man": "man/jongen", "vrouw": "vrouw/meisje"}.get(lid.get("geslacht") or "", "")
        regels = [f"Bedenk 8 concrete, originele cadeau-ideeën voor {lid['naam']}."]
        if jaar is not None:
            regels.append(f"Leeftijd: {jaar} jaar.")
        if geslacht:
            regels.append(f"Geslacht: {geslacht}.")
        if lid.get("interesses"):
            regels.append("Interesses: " + ", ".join(lid["interesses"]) + ".")
        if gelegenheid:
            regels.append(f"Gelegenheid: {gelegenheid}.")
        if budget:
            regels.append(f"Budget: maximaal €{budget:.0f} per cadeau.")
        if al:
            regels.append("Staat al op het verlanglijstje (niet herhalen, wel in die geest): " + "; ".join(al[:15]) + ".")
        if extra:
            regels.append(f"Extra: {extra[:300]}")
        regels.append("Het gezin woont in Nederland; denk aan wat hier te koop is. Antwoord in het Nederlands, alleen met JSON: "
                      'een lijst van objecten met "emoji", "titel" (kort), "waarom" (één zin) en "prijs" (getal in euro).')
        r = await self.hass.services.async_call("ai_task", "generate_data", {"task_name": "cadeau-ideeën", "entity_id": entity,
                                                "instructions": "\n".join(regels)}, blocking=True, return_response=True)
        data = r["data"] if isinstance(r, dict) else r
        if isinstance(data, str):
            m = re.search(r"\[.*\]", data, re.S)
            data = json.loads(m.group(0) if m else data)
        if isinstance(data, dict):
            data = next((v for v in data.values() if isinstance(v, list)), [])
        uit = []
        for i in data[:10]:
            if isinstance(i, dict) and i.get("titel"):
                try:
                    p = float(str(i.get("prijs") or "").replace("€", "").replace(",", ".")) if i.get("prijs") not in (None, "") else None
                except ValueError:
                    p = None
                uit.append({"emoji": str(i.get("emoji") or "🎁")[:4], "titel": str(i["titel"])[:120], "waarom": str(i.get("waarom") or "")[:200],
                            "prijs": round(p) if p else None})
        if not uit:
            raise ValueError("geen ideeën in het antwoord")
        return uit

    def idee_bewaren(self, van: str, voor: str, data: dict[str, Any]) -> dict[str, Any]:
        lijst = self.gezin.data["cadeau_ideeen"].setdefault(van, [])
        i = {"id": secrets.token_hex(5), "voor": voor, "titel": (data.get("titel") or "").strip()[:120], "emoji": (data.get("emoji") or "🎁")[:4],
             "prijs": _prijs(data.get("prijs"))}
        if not i["titel"]:
            raise FamilyFout("Een idee heeft een titel nodig.")
        lijst.append(i)
        self.gezin.opslaan()
        return i

    def idee_weg(self, van: str, idee_id: str) -> None:
        lijst = self.gezin.data["cadeau_ideeen"].get(van, [])
        self.gezin.data["cadeau_ideeen"][van] = [i for i in lijst if i["id"] != idee_id]
        self.gezin.opslaan()

    def overzicht(self, ik: dict | None) -> dict[str, Any]:
        vandaag = dt_util.now().date()
        leden = []
        for l in self.gezin.leden:
            v = volgende_verjaardag(l.get("geboortedatum"), vandaag)
            leden.append({"lid": l["id"], "naam": l["naam"], "leeftijd": leeftijd(l.get("geboortedatum")), "geslacht": l.get("geslacht"),
                          "interesses": l.get("interesses") or [], "verjaardag": v.isoformat() if v else None,
                          "over": (v - vandaag).days if v else None, "wensen": sum(1 for w in self.gezin.data["wensen"] if w["lid"] == l["id"])})
        ik_id = ik["id"] if ik else None
        return {"ik": ik_id, "leden": leden, "lijsten": {l["id"]: self.lijst(l["id"], ik_id) for l in self.gezin.leden},
                "ideeen": self.gezin.data["cadeau_ideeen"].get(ik_id, []) if ik_id else [], "ai": bool(self.ai_entity()),
                "gelegenheden": GELEGENHEDEN, "interesses": INTERESSES}


async def verlanglijst_herinnering(gezin, nu: dt.datetime) -> int:
    """Twee weken voor iemands verjaardag: de anderen krijgen een seintje, met het verlanglijstje."""
    n = 0
    doel = nu.date() + dt.timedelta(days=14)
    for jarige in gezin.leden:
        if volgende_verjaardag(jarige.get("geboortedatum"), nu.date()) != doel:
            continue
        wensen = [w for w in gezin.data["wensen"] if w["lid"] == jarige["id"] and not w.get("gekocht_door")]
        tekst = (f"{jarige['naam']} is over twee weken jarig 🎂. Op het verlanglijstje staat nog: " + ", ".join(w["titel"] for w in wensen[:4])
                 + (" …" if len(wensen) > 4 else "") if wensen else f"{jarige['naam']} is over twee weken jarig 🎂. Er staat nog niets op het verlanglijstje; kijk bij Cadeaus voor ideeën.")
        for lid in gezin.leden:
            if lid["id"] == jarige["id"]:
                continue
            try:
                if await gezin.melding(lid, "🎁 Bijna jarig", tekst, url=f"/gezin/cadeaus?lid={jarige['id']}", clickAction=f"/gezin/cadeaus?lid={jarige['id']}"):
                    n += 1
            except FamilyFout:
                pass
    return n
