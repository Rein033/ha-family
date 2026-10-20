"""Samen: voor stellen in het gezin (uit Ons hokje). Alleen de twee van het stel zien dit, ook een beheerder niet.

- Stemming: hoe voel je je vandaag (emoji en een zinnetje); je partner ziet het.
- Knuffel: met één tik een knuffel, kus of "ik denk aan je" naar je partner.
- Date-pot: ideeën voor samen verzamelen en er eentje trekken als je niet weet wat te doen (met AI-ideeën als die er is)."""
from __future__ import annotations

import json
import logging
import random
import secrets
from typing import Any

from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)
KNUFFELS = {"knuffel": ("🤗", "stuurt je een knuffel"), "kus": ("😘", "stuurt je een kus"), "denk": ("💭", "denkt aan je"),
            "trots": ("🌟", "is trots op je"), "sterkte": ("💪", "wenst je sterkte")}
STEMMINGEN = ["😄", "🙂", "😐", "😴", "😔", "😤", "🤒", "🥰"]
DATE_IDEEEN = [
    ("🍝", "Samen een nieuw recept koken"), ("🎬", "Filmavond met popcorn op de bank"), ("🚲", "Fietstocht met een picknick"),
    ("☕", "Ontbijt op bed"), ("🎲", "Spelletjesavond met z'n tweeën"), ("🌅", "Zonsondergang kijken"), ("🏛️", "Een museum bezoeken"),
    ("🍷", "Wijn- of bierproeverij thuis"), ("🌲", "Boswandeling en daarna warme chocolademelk"), ("🎤", "Karaoke in de woonkamer"),
    ("📸", "Oude foto's samen terugkijken"), ("🧺", "Markt of rommelmarkt afstruinen"), ("🍕", "Pizza's maken met eigen beleg"),
    ("⭐", "Sterren kijken met een deken"), ("💆", "Wellness-avond thuis"), ("🎨", "Samen iets schilderen of knutselen"),
]


def _id() -> str:
    return secrets.token_hex(4)


class Samen:
    def __init__(self, gezin) -> None:
        self.gezin = gezin
        s = gezin.data.setdefault("samen", {})
        for k in ("stellen",):
            s.setdefault(k, [])
        for k in ("stemming", "datepot", "knuffels"):
            s.setdefault(k, {})

    @property
    def _d(self) -> dict[str, Any]:
        return self.gezin.data["samen"]

    def stel_van(self, lid_id: str | None) -> dict[str, Any] | None:
        return next((s for s in self._d["stellen"] if lid_id in s["leden"]), None)

    def partner_van(self, lid_id: str) -> str | None:
        s = self.stel_van(lid_id)
        return next((x for x in s["leden"] if x != lid_id), None) if s else None

    def _ik(self, user_id: str | None) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        ik = self.gezin.lid_van_user(user_id)
        if not ik:
            raise FamilyFout("Je bent (nog) geen gezinslid.")
        stel = self.stel_van(ik["id"])
        if not stel:
            raise FamilyFout("Je hebt nog geen partner gekozen.")
        return ik, stel, self.gezin.lid(next(x for x in stel["leden"] if x != ik["id"]))

    def stel_maken(self, user_id: str | None, partner_id: str, sinds: str | None) -> dict[str, Any]:
        ik = self.gezin.lid_van_user(user_id)
        if not ik:
            raise FamilyFout("Je bent (nog) geen gezinslid.")
        p = self.gezin.lid(partner_id)
        if p["id"] == ik["id"] or "kind" in (ik["rol"], p["rol"]) or "gast" in (ik["rol"], p["rol"]):
            raise FamilyFout("Kies een volwassen gezinslid als partner.")
        if self.stel_van(ik["id"]) or self.stel_van(p["id"]):
            raise FamilyFout("Een van jullie heeft al een partner in HA Family.")
        stel = {"id": _id(), "leden": [ik["id"], p["id"]], "sinds": (sinds or None)}
        self._d["stellen"].append(stel)
        self.gezin.opslaan()
        return stel

    def stel_weg(self, user_id: str | None) -> None:
        _, stel, _ = self._ik(user_id)
        self._d["stellen"].remove(stel)
        for k in ("datepot", "knuffels"):
            self._d[k].pop(stel["id"], None)
        for lid in stel["leden"]:
            self._d["stemming"].pop(lid, None)
        self.gezin.opslaan()

    def overzicht(self, user_id: str | None) -> dict[str, Any]:
        from .ai import ai_entity

        ik = self.gezin.lid_van_user(user_id)
        stel = self.stel_van(ik["id"]) if ik else None
        if not ik or not stel:
            kan = [{"lid": l["id"], "naam": l["naam"]} for l in self.gezin.leden
                   if ik and l["id"] != ik["id"] and l["rol"] in ("ouder", "huisgenoot") and not self.stel_van(l["id"])]
            return {"ik": ik["id"] if ik else None, "stel": None, "kandidaten": kan if ik and ik["rol"] not in ("kind", "gast") else []}
        partner = next(x for x in stel["leden"] if x != ik["id"])
        vandaag = dt_util.now().date().isoformat()
        kn = self._d["knuffels"].get(stel["id"], [])
        return {"ik": ik["id"], "partner": partner, "stel": stel, "stemming": {x: self._d["stemming"].get(x) for x in stel["leden"]},
                "knuffels_vandaag": {x: sum(1 for k in kn if k["van"] == x and k["tijd"][:10] == vandaag) for x in stel["leden"]},
                "laatste_knuffel": next((k for k in reversed(kn) if k["van"] == partner), None),
                "datepot": self._d["datepot"].get(stel["id"], []), "stemmingen": STEMMINGEN, "knuffel_soorten": {k: v[0] for k, v in KNUFFELS.items()},
                "ai": bool(ai_entity(self.gezin.hass))}

    async def _naar(self, partner: dict[str, Any], titel: str, tekst: str) -> bool:
        try:
            return await self.gezin.melding(partner, titel, tekst)
        except FamilyFout as ex:
            _LOGGER.warning("Samen-melding mislukt: %s", ex)
            return False

    async def stemming(self, user_id: str | None, emoji: str, tekst: str | None) -> dict[str, Any]:
        ik, _, partner = self._ik(user_id)
        s = {"emoji": str(emoji)[:4] or "🙂", "tekst": (tekst or "").strip()[:140] or None, "tijd": dt_util.now().isoformat()}
        self._d["stemming"][ik["id"]] = s
        self.gezin.opslaan()
        naam = ik["naam"].split(" ")[0]
        await self._naar(partner, f"{s['emoji']} {naam}", s["tekst"] or f"{naam} voelt zich vandaag {s['emoji']}")
        return s

    async def knuffel(self, user_id: str | None, soort: str) -> bool:
        if soort not in KNUFFELS:
            raise FamilyFout("Onbekende knuffel.")
        ik, stel, partner = self._ik(user_id)
        lijst = self._d["knuffels"].setdefault(stel["id"], [])
        lijst.append({"van": ik["id"], "soort": soort, "tijd": dt_util.now().isoformat()})
        self._d["knuffels"][stel["id"]] = lijst[-100:]
        self.gezin.opslaan()
        e, zin = KNUFFELS[soort]
        naam = ik["naam"].split(" ")[0]
        return await self._naar(partner, f"{e} {naam}", f"{naam} {zin} {e}")

    def idee(self, user_id: str | None, titel: str, emoji: str | None) -> dict[str, Any]:
        ik, stel, _ = self._ik(user_id)
        titel = (titel or "").strip()[:100]
        if not titel:
            raise FamilyFout("Wat willen jullie samen doen?")
        pot = self._d["datepot"].setdefault(stel["id"], [])
        if any(i["titel"].lower() == titel.lower() and not i.get("gedaan") for i in pot):
            raise FamilyFout("Dit idee zit al in de pot.")
        i = {"id": _id(), "titel": titel, "emoji": (emoji or "💡")[:4], "door": ik["id"], "gedaan": None, "getrokken": None}
        pot.append(i)
        self._d["datepot"][stel["id"]] = pot[-200:]
        self.gezin.opslaan()
        return i

    def _idee(self, user_id: str | None, idee_id: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        _, stel, _ = self._ik(user_id)
        pot = self._d["datepot"].get(stel["id"], [])
        i = next((x for x in pot if x["id"] == idee_id), None)
        if not i:
            raise FamilyFout("Dit idee zit niet (meer) in de pot.")
        return pot, i

    def idee_weg(self, user_id: str | None, idee_id: str) -> None:
        pot, i = self._idee(user_id, idee_id)
        pot.remove(i)
        self.gezin.opslaan()

    def idee_gedaan(self, user_id: str | None, idee_id: str, gedaan: bool) -> dict[str, Any]:
        _, i = self._idee(user_id, idee_id)
        i["gedaan"] = dt_util.now().date().isoformat() if gedaan else None
        self.gezin.opslaan()
        return i

    async def trekken(self, user_id: str | None) -> dict[str, Any]:
        ik, stel, partner = self._ik(user_id)
        open_ = [i for i in self._d["datepot"].get(stel["id"], []) if not i.get("gedaan")]
        if not open_:
            raise FamilyFout("De date-pot is leeg. Stop er eerst een paar ideeën in.")
        i = random.choice(open_)
        i["getrokken"] = dt_util.now().isoformat()
        self.gezin.opslaan()
        naam = ik["naam"].split(" ")[0]
        await self._naar(partner, "🎲 Uit de date-pot", f"{naam} trok: {i['emoji']} {i['titel']}")
        return i

    async def ai_ideeen(self, user_id: str | None, wens: str | None) -> dict[str, Any]:
        from .ai import _json, ai_entity, vraag

        _, stel, _ = self._ik(user_id)
        al = [i["titel"] for i in self._d["datepot"].get(stel["id"], [])]
        if ai_entity(self.gezin.hass):
            try:
                antwoord = await vraag(self.gezin.hass, "date-ideeen", (
                    "Bedenk 6 leuke date-ideeën voor een stel in Nederland (met kinderen thuis, dus ook dingen voor in huis of dichtbij). "
                    + (f"Wens: {wens[:200]}. " if wens else "") + "Niet deze, die hebben ze al: " + ("; ".join(al[:30]) or "geen") + ".\n"
                    'Antwoord alleen met JSON: een lijst van {"emoji": "één emoji", "titel": "kort, max 8 woorden"}.'))
                uit = [{"emoji": str(x.get("emoji") or "💡")[:4], "titel": str(x["titel"])[:100]} for x in _json(antwoord, list) if isinstance(x, dict) and x.get("titel")]
                if uit:
                    return {"bron": "ai", "ideeen": uit[:8]}
            except (FamilyFout, ValueError, TypeError, json.JSONDecodeError) as ex:
                _LOGGER.warning("Date-ideeën via AI mislukt: %s", ex)
        rest = [{"emoji": e, "titel": t} for e, t in DATE_IDEEEN if t not in al]
        random.shuffle(rest)
        return {"bron": "lijst", "ideeen": rest[:6]}
