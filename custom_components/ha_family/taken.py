"""Taken, boodschappen en klusjes met punten.

- Taken: gezinstaken met 'voor wie' en een deadline (ook als HA-to-do-lijst).
- Boodschappen: op volgorde van de looproute in de winkel; 'melk, brood' wordt twee dingen.
- Klusjes: terugkerende klusjes (elke dag, bepaalde dagen of één keer) met punten. Moet een ouder goedkeuren, dan
  krijgt die een melding met knoppen. Punten wissel je in voor beloningen (ook met goedkeuring).

Alles staat in gezin.data; wie iets doet, halen we uit de HA-gebruiker."""
from __future__ import annotations

import datetime as dt
import logging
import re
import secrets
import time
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .afdelingen import AFDELINGEN, raad_afdeling
from .gezin import FamilyFout, Gezin

_LOGGER = logging.getLogger(__name__)
ACTIE = "HA_FAMILY"          # voorvoegsel van de knoppen in meldingen
DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"]
VOORBEELDEN = [
    ("🍽️", "Tafel dekken", 2), ("🧽", "Tafel afruimen", 2), ("🍴", "Vaatwasser uitruimen", 3), ("🧸", "Kamer opruimen", 3),
    ("🛏️", "Bed opmaken", 1), ("🦷", "Tanden poetsen", 1), ("📚", "Huiswerk maken", 3), ("🐕", "Hond uitlaten", 3),
    ("🐈", "Kat eten geven", 1), ("🌱", "Planten water geven", 1), ("🗑️", "Vuilnis buiten zetten", 2), ("👕", "Was opvouwen", 3),
    ("🧹", "Stofzuigen", 4), ("🚿", "Badkamer schoonmaken", 5), ("🛒", "Boodschappen helpen", 2), ("🎒", "Tas inpakken", 1),
]


def _nieuw_id() -> str:
    return secrets.token_hex(5)


class Taken:
    def __init__(self, gezin: Gezin) -> None:
        self.gezin = gezin
        self.hass: HomeAssistant = gezin.hass
        d = gezin.data
        for k in ("taken", "boodschappen", "klusjes", "punten", "beloningen"):
            d.setdefault(k, [])
        d.setdefault("klusjes_gedaan", {})
        d.setdefault("klusjes_instellingen", {"herinnering": {"aan": True, "tijd": "18:00"}})

    # ── wie mag wat ──
    def lid_van(self, user_id: str | None) -> dict[str, Any] | None:
        return self.gezin.lid_van_user(user_id)

    async def is_ouder(self, user_id: str | None) -> bool:
        """Ouders en beheerders mogen klusjes goedkeuren en instellen."""
        lid = self.lid_van(user_id)
        if lid and lid["rol"] in ("ouder", "huisgenoot"):
            return True
        user = user_id and await self.hass.auth.async_get_user(user_id)
        return bool(user and user.is_admin)

    def _leden_ids(self, ids: list[str] | None) -> list[str]:
        bekend = {l["id"] for l in self.gezin.leden}
        return [i for i in ids or [] if i in bekend]

    # ── taken ──
    def taak(self, data: dict[str, Any], door: str | None) -> dict[str, Any]:
        titel = (data.get("titel") or "").strip()[:200]
        if not titel:
            raise FamilyFout("Wat moet er gebeuren?")
        deadline = data.get("deadline") or None
        if deadline and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", deadline):
            raise FamilyFout("Kies een datum.")
        lijst = self.gezin.data["taken"]
        oud = next((t for t in lijst if t["id"] == data.get("id")), None) if data.get("id") else None
        t = oud or {"id": _nieuw_id(), "klaar": False, "door": door, "gemaakt": time.time()}
        t.update(titel=titel, wie=self._leden_ids(data.get("wie")), deadline=deadline, notitie=(data.get("notitie") or "").strip()[:1000])
        if not oud:
            lijst.append(t)
        self.gezin.opslaan()
        return t

    def taak_klaar(self, taak_id: str, klaar: bool, door: str | None) -> dict[str, Any]:
        t = self._zoek("taken", taak_id)
        t.update(klaar=klaar, klaar_door=door if klaar else None, klaar_op=time.time() if klaar else None)
        self.gezin.opslaan()
        return t

    def taak_weg(self, taak_id: str) -> None:
        self._zoek("taken", taak_id)
        self.gezin.data["taken"] = [t for t in self.gezin.data["taken"] if t["id"] != taak_id]
        self.gezin.opslaan()

    def taken_opruimen(self) -> int:
        voor = len(self.gezin.data["taken"])
        self.gezin.data["taken"] = [t for t in self.gezin.data["taken"] if not t["klaar"]]
        self.gezin.opslaan()
        return voor - len(self.gezin.data["taken"])

    # ── boodschappen ──
    def boodschap(self, tekst: str, door: str | None) -> list[dict[str, Any]]:
        """Eén of meer boodschappen (komma's), met de afdeling erbij; wat al op de lijst staat, niet nog een keer."""
        lijst = self.gezin.data["boodschappen"]
        bestaand = {b["titel"].lower() for b in lijst if not b["klaar"]}
        nieuw = []
        for deel in (x.strip() for x in tekst.split(",")):
            if not deel or deel.lower() in bestaand:
                continue
            b = {"id": _nieuw_id(), "titel": deel[:120], "afdeling": raad_afdeling(deel), "klaar": False, "door": door, "tijd": time.time()}
            lijst.append(b)
            bestaand.add(deel.lower())
            nieuw.append(b)
        self.gezin.opslaan()
        return nieuw

    def boodschap_bij(self, boodschap_id: str, klaar: bool | None = None, afdeling: str | None = None, titel: str | None = None) -> dict[str, Any]:
        b = self._zoek("boodschappen", boodschap_id)
        if klaar is not None:
            b["klaar"] = klaar
        if afdeling is not None:
            if afdeling not in AFDELINGEN:
                raise FamilyFout("Onbekende afdeling.")
            b["afdeling"] = afdeling
        if titel:
            b["titel"] = titel.strip()[:120]
        self.gezin.opslaan()
        return b

    def boodschap_weg(self, boodschap_id: str | None = None, alles_gekocht: bool = False) -> None:
        lijst = self.gezin.data["boodschappen"]
        self.gezin.data["boodschappen"] = [b for b in lijst if not (b["klaar"] if alles_gekocht else b["id"] == boodschap_id)]
        self.gezin.opslaan()

    def boodschappen(self) -> list[dict[str, Any]]:
        volgorde = {k: i for i, k in enumerate(AFDELINGEN)}
        return sorted(self.gezin.data["boodschappen"], key=lambda b: (b["klaar"], volgorde.get(b["afdeling"], 99), b["tijd"]))

    # ── klusjes ──
    def klusje(self, data: dict[str, Any]) -> dict[str, Any]:
        titel = (data.get("titel") or "").strip()[:80]
        if not titel:
            raise FamilyFout("Geef het klusje een naam.")
        punten = int(data.get("punten") or 0)
        if not 0 <= punten <= 1000:
            raise FamilyFout("Kies 0 tot 1000 punten.")
        wie = self._leden_ids(data.get("wie"))
        if not wie:
            raise FamilyFout("Voor wie is dit klusje?")
        dagen = sorted({int(x) for x in data.get("dagen") or [] if 0 <= int(x) <= 6})
        datum = data.get("datum") or None
        if not dagen and not (datum and re.fullmatch(r"\d{4}-\d{2}-\d{2}", datum)):
            raise FamilyFout("Kies op welke dagen, of een datum voor één keer.")
        lijst = self.gezin.data["klusjes"]
        oud = next((k for k in lijst if k["id"] == data.get("id")), None) if data.get("id") else None
        k = oud or {"id": _nieuw_id(), "gemaakt": time.time()}
        k.update(titel=titel, emoji=(data.get("emoji") or "⭐")[:4], punten=punten, wie=wie, dagen=dagen,
                 datum=None if dagen else datum, goedkeuren=bool(data.get("goedkeuren")), actief=data.get("actief", True) is not False)
        if not oud:
            lijst.append(k)
        self.gezin.opslaan()
        return k

    def klusje_weg(self, klusje_id: str) -> None:
        self._zoek("klusjes", klusje_id)
        self.gezin.data["klusjes"] = [k for k in self.gezin.data["klusjes"] if k["id"] != klusje_id]
        self.gezin.opslaan()

    def _op_dag(self, k: dict[str, Any], datum: dt.date) -> bool:
        if not k.get("actief", True):
            return False
        return datum.weekday() in k["dagen"] if k["dagen"] else k.get("datum") == datum.isoformat()

    def klusjes_vandaag(self, datum: dt.date | None = None) -> list[dict[str, Any]]:
        """Per gezinslid de klusjes van die dag met hun status (open, wacht, ok)."""
        datum = datum or dt_util.now().date()
        gedaan = self.gezin.data["klusjes_gedaan"].get(datum.isoformat(), {})
        uit = []
        for k in self.gezin.data["klusjes"]:
            if not self._op_dag(k, datum):
                continue
            for lid in k["wie"]:
                s = gedaan.get(k["id"], {}).get(lid)
                uit.append({"klusje": k["id"], "lid": lid, "titel": k["titel"], "emoji": k["emoji"], "punten": k["punten"],
                            "goedkeuren": k["goedkeuren"], "status": s["status"] if s else "open", "datum": datum.isoformat()})
        return uit

    async def klusje_gedaan(self, klusje_id: str, lid_id: str, datum: str, door_user: str | None, gedaan: bool = True) -> dict[str, Any]:
        k = self._zoek("klusjes", klusje_id)
        if lid_id not in k["wie"]:
            raise FamilyFout("Dit klusje is niet voor dit gezinslid.")
        d = dt.date.fromisoformat(datum)
        if d > dt_util.now().date():
            raise FamilyFout("Dit klusje is nog niet aan de beurt.")
        if not self._op_dag(k, d):
            raise FamilyFout("Dit klusje staat niet op die dag.")
        ik = self.lid_van(door_user)
        ouder = await self.is_ouder(door_user)
        from .muur import is_muur

        if not ouder and not is_muur(self.gezin, door_user) and (not ik or ik["id"] != lid_id):
            raise FamilyFout("Je kunt alleen je eigen klusjes afvinken.")
        dag = self.gezin.data["klusjes_gedaan"].setdefault(datum, {}).setdefault(klusje_id, {})
        if not gedaan:
            oud = dag.pop(lid_id, None)
            if oud and oud["status"] == "ok" and not ouder and oud.get("goedgekeurd"):
                dag[lid_id] = oud
                raise FamilyFout("Dit is al goedgekeurd door een ouder.")
            self._punten_weg(f"klusje:{datum}:{klusje_id}:{lid_id}")
            self.gezin.opslaan()
            return {"status": "open"}
        if lid_id in dag:
            return dag[lid_id]
        wacht = k["goedkeuren"] and not ouder
        dag[lid_id] = {"status": "wacht" if wacht else "ok", "tijd": time.time(), "door": ik["id"] if ik else None, "goedgekeurd": not wacht and ouder}
        if not wacht and k["punten"]:
            self._punten_erbij(lid_id, k["punten"], f"{k['emoji']} {k['titel']}", f"klusje:{datum}:{klusje_id}:{lid_id}")
        self._opruimen()
        self.gezin.opslaan()
        if wacht:
            lid = self.gezin.lid(lid_id)
            await self._naar_ouders(f"{k['emoji']} {lid['naam']} is klaar", f"{lid['naam']} heeft '{k['titel']}' gedaan. Goedkeuren?",
                                    f"{ACTIE}|klusje|{datum}|{klusje_id}|{lid_id}")
        return dag[lid_id]

    async def goedkeuren(self, klusje_id: str, lid_id: str, datum: str, ok: bool, door_user: str | None) -> None:
        if not await self.is_ouder(door_user):
            raise FamilyFout("Alleen een ouder kan goedkeuren.")
        k = self._zoek("klusjes", klusje_id)
        dag = self.gezin.data["klusjes_gedaan"].get(datum, {}).get(klusje_id, {})
        s = dag.get(lid_id)
        if not s or s["status"] != "wacht":
            return
        lid = self.gezin.lid(lid_id)
        if ok:
            s.update(status="ok", goedgekeurd=True)
            if k["punten"]:
                self._punten_erbij(lid_id, k["punten"], f"{k['emoji']} {k['titel']}", f"klusje:{datum}:{klusje_id}:{lid_id}")
            await self._melding(lid, "⭐ Goedgekeurd!", f"'{k['titel']}' is goedgekeurd" + (f": +{k['punten']} punten" if k["punten"] else "") + " 🎉")
        else:
            dag.pop(lid_id, None)
            await self._melding(lid, f"{k['emoji']} Nog niet helemaal", f"'{k['titel']}' is nog niet goedgekeurd. Probeer het nog eens!")
        self.gezin.opslaan()

    # ── punten en beloningen ──
    def _punten_erbij(self, lid_id: str, punten: int, reden: str, ref: str | None = None, status: str = "ok") -> dict[str, Any]:
        p = {"id": _nieuw_id(), "lid": lid_id, "punten": punten, "reden": reden[:120], "tijd": time.time(), "status": status, "ref": ref}
        self.gezin.data["punten"].append(p)
        return p

    def _punten_weg(self, ref: str) -> None:
        self.gezin.data["punten"] = [p for p in self.gezin.data["punten"] if p.get("ref") != ref]

    def saldo(self, lid_id: str) -> int:
        return sum(p["punten"] for p in self.gezin.data["punten"] if p["lid"] == lid_id and p["status"] == "ok")

    def beschikbaar(self, lid_id: str) -> int:
        """Saldo min wat al is aangevraagd (nog niet goedgekeurd)."""
        return self.saldo(lid_id) + sum(p["punten"] for p in self.gezin.data["punten"] if p["lid"] == lid_id and p["status"] == "wacht" and p["punten"] < 0)

    async def punten_geven(self, lid_id: str, punten: int, reden: str, door_user: str | None) -> dict[str, Any]:
        if not await self.is_ouder(door_user):
            raise FamilyFout("Alleen een ouder kan punten geven.")
        if not punten or abs(punten) > 1000:
            raise FamilyFout("Kies een aantal punten.")
        self.gezin.lid(lid_id)
        p = self._punten_erbij(lid_id, punten, reden.strip() or ("Bonus" if punten > 0 else "Correctie"))
        self.gezin.opslaan()
        return p

    def beloning(self, data: dict[str, Any]) -> dict[str, Any]:
        titel = (data.get("titel") or "").strip()[:80]
        punten = int(data.get("punten") or 0)
        if not titel or punten <= 0:
            raise FamilyFout("Geef de beloning een naam en een aantal punten.")
        lijst = self.gezin.data["beloningen"]
        oud = next((b for b in lijst if b["id"] == data.get("id")), None) if data.get("id") else None
        b = oud or {"id": _nieuw_id()}
        b.update(titel=titel, emoji=(data.get("emoji") or "🎁")[:4], punten=punten)
        if not oud:
            lijst.append(b)
        self.gezin.opslaan()
        return b

    def beloning_weg(self, beloning_id: str) -> None:
        self.gezin.data["beloningen"] = [b for b in self.gezin.data["beloningen"] if b["id"] != beloning_id]
        self.gezin.opslaan()

    async def inwisselen(self, beloning_id: str, lid_id: str, door_user: str | None) -> dict[str, Any]:
        b = self._zoek("beloningen", beloning_id)
        ik, ouder = self.lid_van(door_user), await self.is_ouder(door_user)
        from .muur import is_muur

        if not ouder and not is_muur(self.gezin, door_user) and (not ik or ik["id"] != lid_id):
            raise FamilyFout("Je kunt alleen je eigen punten inwisselen.")
        if self.beschikbaar(lid_id) < b["punten"]:
            raise FamilyFout(f"Nog niet genoeg punten: je hebt er {self.beschikbaar(lid_id)}, nodig zijn {b['punten']}.")
        lid = self.gezin.lid(lid_id)
        p = self._punten_erbij(lid_id, -b["punten"], f"{b['emoji']} {b['titel']}", f"beloning:{b['id']}", status="ok" if ouder else "wacht")
        self.gezin.opslaan()
        if not ouder:
            await self._naar_ouders(f"{b['emoji']} {lid['naam']} wil een beloning", f"{lid['naam']} wil '{b['titel']}' inwisselen voor {b['punten']} punten.",
                                    f"{ACTIE}|beloning|{p['id']}")
        return p

    async def beloning_goedkeuren(self, punten_id: str, ok: bool, door_user: str | None) -> None:
        if not await self.is_ouder(door_user):
            raise FamilyFout("Alleen een ouder kan goedkeuren.")
        p = next((x for x in self.gezin.data["punten"] if x["id"] == punten_id and x["status"] == "wacht"), None)
        if not p:
            return
        lid = self.gezin.lid(p["lid"])
        if ok:
            p["status"] = "ok"
            await self._melding(lid, "🎁 Beloning!", f"Je mag '{p['reden']}' inwisselen. Veel plezier! 🎉")
        else:
            self.gezin.data["punten"].remove(p)
            await self._melding(lid, "🎁 Beloning", f"'{p['reden']}' kan nu even niet. Je punten heb je nog.")
        self.gezin.opslaan()

    def wacht_op_ouder(self) -> list[dict[str, Any]]:
        """Alles wat een ouder nog moet goedkeuren (klusjes en beloningen)."""
        uit = []
        for datum, klusjes in self.gezin.data["klusjes_gedaan"].items():
            for kid, leden in klusjes.items():
                k = next((x for x in self.gezin.data["klusjes"] if x["id"] == kid), None)
                for lid, s in leden.items():
                    if k and s["status"] == "wacht":
                        uit.append({"soort": "klusje", "klusje": kid, "lid": lid, "datum": datum, "titel": k["titel"], "emoji": k["emoji"], "punten": k["punten"]})
        for p in self.gezin.data["punten"]:
            if p["status"] == "wacht":
                uit.append({"soort": "beloning", "punten_id": p["id"], "lid": p["lid"], "titel": p["reden"], "punten": -p["punten"]})
        return uit

    def overzicht(self, datum: dt.date | None = None) -> dict[str, Any]:
        """Alles voor de klusjeskaart in één keer."""
        leden = {l["id"]: {"saldo": self.saldo(l["id"]), "beschikbaar": self.beschikbaar(l["id"])} for l in self.gezin.leden}
        return {"vandaag": self.klusjes_vandaag(datum), "leden": leden, "beloningen": self.gezin.data["beloningen"],
                "wacht": self.wacht_op_ouder(), "geschiedenis": sorted(self.gezin.data["punten"], key=lambda p: -p["tijd"])[:40]}

    # ── hulpjes ──
    def _zoek(self, soort: str, item_id: str) -> dict[str, Any]:
        for x in self.gezin.data[soort]:
            if x["id"] == item_id:
                return x
        raise FamilyFout("Dit bestaat niet (meer).")

    def _opruimen(self) -> None:
        """Afgevinkte klusjes ouder dan 60 dagen weg (de punten blijven)."""
        grens = (dt_util.now().date() - dt.timedelta(days=60)).isoformat()
        for d in [d for d in self.gezin.data["klusjes_gedaan"] if d < grens]:
            self.gezin.data["klusjes_gedaan"].pop(d)

    async def _melding(self, lid: dict[str, Any], titel: str, tekst: str, **extra: Any) -> bool:
        try:
            return await self.gezin.melding(lid, titel, tekst, **extra)
        except FamilyFout as ex:
            _LOGGER.warning("Melding naar %s mislukt: %s", lid["naam"], ex)
            return False

    async def _naar_ouders(self, titel: str, tekst: str, actie: str) -> None:
        knoppen = {"actions": [{"action": f"{actie}|ok", "title": "✅ Goedkeuren"}, {"action": f"{actie}|nee", "title": "Nog niet"}]}
        for lid in self.gezin.leden:
            if lid["rol"] in ("ouder", "huisgenoot") or await self.gezin.is_beheerder(lid):
                await self._melding(lid, titel, tekst, **knoppen)


@callback
def volg_meldingknoppen(hass: HomeAssistant, taken: Taken):
    """Knoppen in meldingen ('Goedkeuren' / 'Nog niet') afhandelen; de gebruiker komt uit de context van de app."""
    async def _knop(event: Event) -> None:
        actie = str(event.data.get("action") or "")
        if not actie.startswith(f"{ACTIE}|"):
            return
        delen = actie.split("|")
        user = event.context.user_id
        try:
            if delen[1] == "klusje" and len(delen) == 6:
                await taken.goedkeuren(delen[3], delen[4], delen[2], delen[5] == "ok", user)
            elif delen[1] == "beloning" and len(delen) == 4:
                await taken.beloning_goedkeuren(delen[2], delen[3] == "ok", user)
        except FamilyFout as ex:
            _LOGGER.warning("Knop in melding: %s", ex)

    return hass.bus.async_listen("mobile_app_notification_action", _knop)


async def herinnering(taken: Taken, nu: dt.datetime) -> int:
    """'s Avonds: wie nog klusjes open heeft, krijgt een seintje."""
    open_per_lid: dict[str, list[str]] = {}
    for k in taken.klusjes_vandaag(nu.date()):
        if k["status"] == "open":
            open_per_lid.setdefault(k["lid"], []).append(f"{k['emoji']} {k['titel']}")
    n = 0
    for lid_id, lijst in open_per_lid.items():
        lid = taken.gezin.lid(lid_id)
        if await taken._melding(lid, "⭐ Nog even je klusjes", f"Nog te doen: {', '.join(lijst)}"):  # noqa: SLF001
            n += 1
    return n
