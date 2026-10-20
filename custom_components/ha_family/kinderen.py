"""Kinderen: ochtend- en avondroutines om af te vinken, en zakgeld.

- Routines: per kind een rijtje stappen voor de ochtend en de avond (bed opmaken, tanden poetsen, …). Alles af? Dan krijgen
  de ouders een seintje, en als je dat wilt punten (dezelfde punten als bij de klusjes, dus in te wisselen voor beloningen).
- Zakgeld: een vast bedrag op een vaste dag van de week, automatisch bijgeschreven. Ouders boeken erbij of eraf;
  een kind mag zelf bijhouden wat het uitgaf. Het saldo is gewoon de optelsom, dus het klopt altijd."""
from __future__ import annotations

import datetime as dt
import logging
import secrets
from typing import Any

from homeassistant.util import dt as dt_util

from .gezin import FamilyFout

_LOGGER = logging.getLogger(__name__)
DELEN = ("ochtend", "avond")
STANDAARD = {
    "ochtend": [("🛏️", "Bed opmaken"), ("👕", "Aankleden"), ("🥣", "Ontbijten"), ("🦷", "Tanden poetsen"), ("🎒", "Tas inpakken")],
    "avond": [("🧸", "Speelgoed opruimen"), ("🚿", "Douchen"), ("🩳", "Pyjama aan"), ("🦷", "Tanden poetsen"), ("📖", "Lezen")],
}
DAGNAMEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
ZAKGELD_TIJD = "07:00"


def _id() -> str:
    return secrets.token_hex(4)


def geld(b: float) -> str:
    return f"€ {b:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


class Kinderen:
    def __init__(self, gezin) -> None:
        self.gezin = gezin
        d = gezin.data
        d.setdefault("routines", {})
        d.setdefault("routine_af", {})
        d.setdefault("zakgeld", {})

    def kinderen(self) -> list[dict[str, Any]]:
        return [l for l in self.gezin.leden if l["rol"] == "kind"]

    def _kind(self, lid_id: str) -> dict[str, Any]:
        l = self.gezin.lid(lid_id)
        if l["rol"] != "kind":
            raise FamilyFout("Routines en zakgeld zijn er voor de kinderen.")
        return l

    async def _mag(self, lid_id: str, user_id: str | None, ook_muur: bool = False) -> bool:
        """Geeft True als het een ouder is; een kind mag alleen bij zichzelf (anders een fout)."""
        if await self.gezin.taken.is_ouder(user_id):
            return True
        from .muur import is_muur

        if ook_muur and is_muur(self.gezin, user_id):
            return False
        ik = self.gezin.lid_van_user(user_id)
        if not ik or ik["id"] != lid_id:
            raise FamilyFout("Dit mag je alleen bij jezelf doen.")
        return False

    # ── routines ──
    def routine(self, lid_id: str) -> dict[str, Any]:
        r = self.gezin.data["routines"].get(lid_id)
        if r is None:
            return {deel: [{"id": f"{deel[0]}{n}", "emoji": e, "titel": t} for n, (e, t) in enumerate(STANDAARD[deel])] for deel in DELEN} | {"punten": 0, "standaard": True}
        return r

    def routine_instellen(self, lid_id: str, deel: str, stappen: list[dict[str, Any]], punten: int | None) -> dict[str, Any]:
        self._kind(lid_id)
        if deel not in DELEN:
            raise FamilyFout("Kies ochtend of avond.")
        r = {k: v for k, v in self.routine(lid_id).items() if k != "standaard"}
        schoon = []
        for s in stappen[:15]:
            titel = str(s.get("titel") or "").strip()[:60]
            if titel:
                schoon.append({"id": str(s.get("id") or _id())[:12], "emoji": str(s.get("emoji") or "⭐")[:4], "titel": titel})
        r[deel] = schoon
        if punten is not None:
            r["punten"] = max(0, min(20, int(punten)))
        self.gezin.data["routines"][lid_id] = r
        self.gezin.opslaan()
        return r

    def _af(self, datum: str, lid_id: str, deel: str) -> list[str]:
        return self.gezin.data["routine_af"].get(datum, {}).get(lid_id, {}).get(deel, [])

    async def stap_af(self, lid_id: str, deel: str, stap_id: str, af: bool, user_id: str | None) -> dict[str, Any]:
        kind = self._kind(lid_id)
        await self._mag(lid_id, user_id, ook_muur=True)
        r = self.routine(lid_id)
        if deel not in DELEN or not any(s["id"] == stap_id for s in r[deel]):
            raise FamilyFout("Deze stap bestaat niet (meer).")
        datum = dt_util.now().date().isoformat()
        lijst = self.gezin.data["routine_af"].setdefault(datum, {}).setdefault(lid_id, {}).setdefault(deel, [])
        was_klaar = all(s["id"] in lijst for s in r[deel])
        if af and stap_id not in lijst:
            lijst.append(stap_id)
        elif not af and stap_id in lijst:
            lijst.remove(stap_id)
        klaar = all(s["id"] in lijst for s in r[deel])
        ref = f"routine:{datum}:{lid_id}:{deel}"
        taken = self.gezin.taken
        if klaar and not was_klaar:
            if r.get("punten"):
                taken._punten_erbij(lid_id, r["punten"], f"{'☀️ Ochtend' if deel == 'ochtend' else '🌙 Avond'}routine af", ref)  # noqa: SLF001
            naam = kind["naam"].split(" ")[0]
            for l in self.gezin.leden:
                if l["rol"] in ("ouder", "huisgenoot"):
                    await taken._melding(l, f"{'☀️' if deel == 'ochtend' else '🌙'} {naam} is klaar",  # noqa: SLF001
                                         f"{naam} heeft de {deel}routine helemaal af" + (f" (+{r['punten']} punten)" if r.get("punten") else "") + " 🎉")
        elif was_klaar and not klaar:
            taken._punten_weg(ref)  # noqa: SLF001
        for d in [d for d in self.gezin.data["routine_af"] if d < (dt_util.now().date() - dt.timedelta(days=30)).isoformat()]:
            self.gezin.data["routine_af"].pop(d)
        self.gezin.opslaan()
        return {"af": lijst, "klaar": klaar}

    # ── zakgeld ──
    def _zakgeld(self, lid_id: str) -> dict[str, Any]:
        return self.gezin.data["zakgeld"].setdefault(lid_id, {"aan": False, "bedrag": 0.0, "dag": 5, "laatst": None, "boekingen": []})

    def saldo(self, lid_id: str) -> float:
        return round(sum(b["bedrag"] for b in self.gezin.data["zakgeld"].get(lid_id, {}).get("boekingen", [])), 2)

    def zakgeld_instellen(self, lid_id: str, aan: bool, bedrag: float, dag: int) -> dict[str, Any]:
        self._kind(lid_id)
        if not 0 <= bedrag <= 1000 or not 0 <= dag <= 6:
            raise FamilyFout("Kies een bedrag en een dag.")
        z = self._zakgeld(lid_id)
        z.update(aan=aan, bedrag=round(float(bedrag), 2), dag=int(dag))
        if aan and not z.get("laatst"):
            z["laatst"] = dt_util.now().date().isoformat() if dt_util.now().weekday() == dag else None
        self.gezin.opslaan()
        return z

    async def boeking(self, lid_id: str, bedrag: float, tekst: str, user_id: str | None) -> dict[str, Any]:
        self._kind(lid_id)
        ouder = await self._mag(lid_id, user_id)
        bedrag = round(float(bedrag), 2)
        if not bedrag or abs(bedrag) > 1000:
            raise FamilyFout("Vul een bedrag in.")
        if not ouder and bedrag > 0:
            raise FamilyFout("Geld erbij zetten doet een ouder; jij kunt bijhouden wat je uitgaf.")
        if bedrag < 0 and self.saldo(lid_id) + bedrag < -0.001 and not ouder:
            raise FamilyFout(f"Zoveel heb je niet: je hebt nog {geld(self.saldo(lid_id))}.")
        ik = self.gezin.lid_van_user(user_id)
        b = {"id": _id(), "datum": dt_util.now().isoformat(), "bedrag": bedrag, "tekst": (tekst or "").strip()[:80] or ("Erbij" if bedrag > 0 else "Uitgegeven"),
             "door": ik["id"] if ik else None}
        z = self._zakgeld(lid_id)
        z["boekingen"].append(b)
        z["boekingen"] = z["boekingen"][-500:]
        self.gezin.opslaan()
        return b

    async def uitbetalen(self, nu: dt.datetime) -> int:
        """Elke ochtend: wie vandaag zakgeld krijgt, krijgt het (één keer per dag)."""
        n = 0
        vandaag = nu.date().isoformat()
        for kind in self.kinderen():
            z = self.gezin.data["zakgeld"].get(kind["id"])
            if not z or not z.get("aan") or not z.get("bedrag") or z.get("dag") != nu.weekday() or z.get("laatst") == vandaag:
                continue
            z["laatst"] = vandaag
            z["boekingen"].append({"id": _id(), "datum": nu.isoformat(), "bedrag": z["bedrag"], "tekst": "💰 Zakgeld", "door": None})
            self.gezin.opslaan()
            n += 1
            await self.gezin.taken._melding(kind, "💰 Je zakgeld is er!", f"Er is {geld(z['bedrag'])} bijgekomen. Je hebt nu {geld(self.saldo(kind['id']))}.")  # noqa: SLF001
        return n

    # ── voor de kaarten ──
    async def overzicht(self, user_id: str | None) -> dict[str, Any]:
        from .muur import is_muur

        ouder = await self.gezin.taken.is_ouder(user_id)
        muur = is_muur(self.gezin, user_id)
        ik = self.gezin.lid_van_user(user_id)
        datum = dt_util.now().date().isoformat()
        uit = []
        for k in self.kinderen():
            eigen = ik and ik["id"] == k["id"]
            if not (ouder or muur or eigen):
                continue
            r = self.routine(k["id"])
            item = {"lid": k["id"], "naam": k["naam"], "routine": r, "af": {d: self._af(datum, k["id"], d) for d in DELEN}}
            if ouder or eigen:                               # geld zie je niet op de muur
                z = self.gezin.data["zakgeld"].get(k["id"]) or {"aan": False, "bedrag": 0.0, "dag": 5, "boekingen": []}
                item["zakgeld"] = {"aan": z["aan"], "bedrag": z["bedrag"], "dag": z["dag"], "saldo": self.saldo(k["id"]),
                                   "boekingen": list(reversed(z["boekingen"][-30:]))}
            uit.append(item)
        return {"ouder": ouder, "ik": ik["id"] if ik else None, "kinderen": uit, "dagen": DAGNAMEN, "nu": "ochtend" if dt_util.now().hour < 13 else "avond"}
