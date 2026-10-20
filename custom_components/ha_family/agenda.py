"""Gezinsagenda: alle afspraken van het gezin op één plek, in de kleur van wie het betreft.

Bronnen:
- eigen afspraken van HA Family (met 'voor wie' en herhaling), ook zichtbaar als agenda-entiteit;
- agenda's per gezinslid (een bestaande agenda in HA, of een link die HA Family via Remote Calendar toevoegt);
- gezamenlijke agenda's (school, vakanties);
- verjaardagen (geboortedatum van gezinsleden en een eigen lijst);
- afval: zelf ingevuld schema (soort, eerste ophaaldag, elke X weken) of een agenda/link van de gemeente.

Alles wordt hier samengevoegd tot één lijst die de agendakaart in één keer ophaalt."""
from __future__ import annotations

import calendar as kalender
import datetime as dt
import logging
import re
import secrets
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .gezin import FamilyFout, Gezin

_LOGGER = logging.getLogger(__name__)

HERHALING = ["", "week", "2weken", "maand", "jaar"]
AFVAL = {
    "gft": {"naam": "GFT", "icoon": "🟢", "kleur": "#43a047", "woorden": ["gft", "groente", "groen", "bio", "tuin"]},
    "pmd": {"naam": "PMD", "icoon": "🟠", "kleur": "#fb8c00", "woorden": ["pmd", "plastic", "pbd", "drankkarton", "verpakking"]},
    "papier": {"naam": "Papier", "icoon": "🔵", "kleur": "#1e88e5", "woorden": ["papier", "karton", "oud papier"]},
    "rest": {"naam": "Restafval", "icoon": "⚫", "kleur": "#616161", "woorden": ["rest", "grijs", "huisvuil", "zwart"]},
    "glas": {"naam": "Glas", "icoon": "🟣", "kleur": "#00897b", "woorden": ["glas"]},
    "textiel": {"naam": "Textiel", "icoon": "👕", "kleur": "#8d6e63", "woorden": ["textiel", "kleding"]},
    "kerstboom": {"naam": "Kerstbomen", "icoon": "🎄", "kleur": "#2e7d32", "woorden": ["kerstboom", "kerstbomen"]},
}


def afval_soort(titel: str) -> str | None:
    t = titel.lower()
    for k, a in AFVAL.items():
        if any(w in t for w in a["woorden"]):
            return k
    return None


def _bedrijven() -> dict[str, dict[str, str]]:
    from .afvalbedrijf import BEDRIJVEN

    return {k: {"naam": v["naam"], "gemeenten": v["gemeenten"]} for k, v in BEDRIJVEN.items()}


def _datum(s: str) -> dt.date:
    return dt.date.fromisoformat(s[:10])


def _volgende_jaardatum(maand_dag: str, jaar: int) -> dt.date:
    m, d = (int(x) for x in maand_dag.split("-"))
    try:
        return dt.date(jaar, m, d)
    except ValueError:                                        # 29 februari in een gewoon jaar
        return dt.date(jaar, 3, 1)


def _plus_maanden(d: dt.date, n: int) -> dt.date:
    m = d.month - 1 + n
    j, m = d.year + m // 12, m % 12 + 1
    return dt.date(j, m, min(d.day, kalender.monthrange(j, m)[1]))


def _herhalingen(start: dt.date, herhaal: str, van: dt.date, tot: dt.date, tot_einde: dt.date | None = None):
    """Alle startdatums van een (herhalende) afspraak die in [van, tot) vallen."""
    if not herhaal:
        if van <= start < tot:
            yield start
        return
    i, d = 0, start
    while d < tot and i < 2000:
        if d >= van and (not tot_einde or d <= tot_einde):
            yield d
        i += 1
        if herhaal == "week":
            d = start + dt.timedelta(weeks=i)
        elif herhaal == "2weken":
            d = start + dt.timedelta(weeks=2 * i)
        elif herhaal == "maand":
            d = _plus_maanden(start, i)
        else:
            d = _volgende_jaardatum(start.strftime("%m-%d"), start.year + i)


class Agenda:
    """Agenda van één gezin. Gegevens staan in gezin.data (afspraken, verjaardagen, afval, agendas_extra, week_titels)."""

    def __init__(self, gezin: Gezin) -> None:
        self.gezin = gezin
        self.hass: HomeAssistant = gezin.hass
        d = gezin.data
        d.setdefault("afspraken", [])
        d.setdefault("verjaardagen", [])
        d.setdefault("agendas_extra", [])
        d.setdefault("week_titels", {})
        d.setdefault("afval", {"schema": [], "agenda": None, "herinnering": {"aan": True, "tijd": "19:00", "leden": []}})
        d.setdefault("verjaardag_melding", {"aan": True, "tijd": "08:00"})

    # ── eigen afspraken ──
    def afspraak(self, data: dict[str, Any], door: str | None = None) -> dict[str, Any]:
        titel = (data.get("titel") or "").strip()[:120]
        if not titel:
            raise FamilyFout("Geef de afspraak een naam.")
        start = str(data.get("start") or "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?", start):
            raise FamilyFout("Kies een datum.")
        hele_dag = len(start) == 10
        eind = str(data.get("eind") or "")
        if eind and (not re.fullmatch(r"\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?", eind) or eind < start or len(eind) != len(start)):
            raise FamilyFout("De eindtijd ligt voor de begintijd.")
        herhaal = data.get("herhaal") or ""
        if herhaal not in HERHALING:
            raise FamilyFout("Onbekende herhaling.")
        leden = {l["id"] for l in self.gezin.leden}
        wie = [w for w in data.get("wie") or [] if w in leden]
        afspraak = {"id": data.get("id") or secrets.token_hex(5), "titel": titel, "start": start, "eind": eind or None, "hele_dag": hele_dag,
                    "wie": wie, "herhaal": herhaal, "plek": (data.get("plek") or "").strip()[:120], "notitie": (data.get("notitie") or "").strip()[:1000],
                    "door": door}
        lijst = self.gezin.data["afspraken"]
        oud = next((a for a in lijst if a["id"] == afspraak["id"]), None)
        if oud:
            afspraak["door"] = oud.get("door")
            lijst[lijst.index(oud)] = afspraak
        else:
            lijst.append(afspraak)
        self.gezin.opslaan()
        return afspraak

    def afspraak_weg(self, afspraak_id: str) -> None:
        voor = len(self.gezin.data["afspraken"])
        self.gezin.data["afspraken"] = [a for a in self.gezin.data["afspraken"] if a["id"] != afspraak_id]
        if len(self.gezin.data["afspraken"]) == voor:
            raise FamilyFout("Deze afspraak bestaat niet (meer).")
        self.gezin.opslaan()

    def eigen_events(self, van: dt.date, tot: dt.date) -> list[dict[str, Any]]:
        uit = []
        for a in self.gezin.data["afspraken"]:
            start = _datum(a["start"])
            duur = (_datum(a["eind"]) - start) if a.get("eind") else dt.timedelta(0)
            for d in _herhalingen(start, a.get("herhaal") or "", van - duur, tot):
                s = d.isoformat() + a["start"][10:]
                e = (d + duur).isoformat() + a["eind"][10:] if a.get("eind") else None
                uit.append({"id": f"{a['id']}|{d.isoformat()}", "afspraak": a["id"], "titel": a["titel"], "start": s, "eind": e, "hele_dag": a["hele_dag"],
                            "wie": a["wie"], "soort": "afspraak", "plek": a.get("plek") or "", "notitie": a.get("notitie") or "",
                            "herhaal": a.get("herhaal") or "", "reeks_start": a["start"], "reeks_eind": a.get("eind"), "bewerkbaar": True})
        return uit

    # ── verjaardagen ──
    def verjaardag(self, naam: str, datum: str, verjaardag_id: str | None = None) -> dict[str, Any]:
        naam = naam.strip()[:60]
        if not naam:
            raise FamilyFout("Vul een naam in.")
        if not re.fullmatch(r"(\d{4}-)?\d{2}-\d{2}", datum):
            raise FamilyFout("Kies een datum.")
        v = {"id": verjaardag_id or secrets.token_hex(5), "naam": naam, "datum": datum}
        lijst = self.gezin.data["verjaardagen"]
        lijst[:] = [x for x in lijst if x["id"] != v["id"]] + [v]
        self.gezin.opslaan()
        return v

    def verjaardag_weg(self, verjaardag_id: str) -> None:
        self.gezin.data["verjaardagen"] = [x for x in self.gezin.data["verjaardagen"] if x["id"] != verjaardag_id]
        self.gezin.opslaan()

    def verjaardagen(self) -> list[dict[str, Any]]:
        """Iedereen met een verjaardag: gezinsleden (geboortedatum) en de eigen lijst."""
        uit = [{"id": f"lid-{l['id']}", "naam": l["naam"], "datum": l["geboortedatum"], "lid": l["id"]}
               for l in self.gezin.leden if l.get("geboortedatum")]
        return uit + [{**v, "lid": None} for v in self.gezin.data["verjaardagen"]]

    def verjaardag_events(self, van: dt.date, tot: dt.date) -> list[dict[str, Any]]:
        uit = []
        for v in self.verjaardagen():
            md = v["datum"][-5:]
            for jaar in range(van.year, tot.year + 1):
                d = _volgende_jaardatum(md, jaar)
                if van <= d < tot:
                    leeftijd = jaar - int(v["datum"][:4]) if len(v["datum"]) == 10 else None
                    titel = f"🎂 {v['naam']}" + (f" wordt {leeftijd}" if leeftijd and leeftijd > 0 else " is jarig")
                    uit.append({"id": f"jarig-{v['id']}-{jaar}", "titel": titel, "start": d.isoformat(), "eind": None, "hele_dag": True,
                                "wie": [v["lid"]] if v["lid"] else [], "soort": "verjaardag", "icoon": "🎂", "bewerkbaar": False,
                                "naam": v["naam"], "leeftijd": leeftijd})
        return uit

    # ── afval ──
    def afval_instellen(self, schema: list[dict[str, Any]] | None = None, agenda: str | None = None, herinnering: dict[str, Any] | None = None) -> None:
        a = self.gezin.data["afval"]
        if schema is not None:
            goed = []
            for s in schema:
                if s.get("soort") not in AFVAL:
                    raise FamilyFout("Onbekende afvalsoort.")
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(s.get("start") or "")):
                    raise FamilyFout(f"Kies de volgende ophaaldag voor {AFVAL[s['soort']]['naam']}.")
                weken = int(s.get("weken") or 2)
                if not 1 <= weken <= 52:
                    raise FamilyFout("Kies elke 1 tot 52 weken.")
                goed.append({"soort": s["soort"], "start": s["start"], "weken": weken})
            a["schema"] = goed
        if agenda is not None:
            a["agenda"] = agenda or None
        if herinnering is not None:
            leden = {l["id"] for l in self.gezin.leden}
            tijd = str(herinnering.get("tijd") or "19:00")
            if not re.fullmatch(r"\d{2}:\d{2}", tijd):
                raise FamilyFout("Kies een tijd.")
            a["herinnering"] = {"aan": bool(herinnering.get("aan")), "tijd": tijd, "leden": [x for x in herinnering.get("leden") or [] if x in leden]}
        self.gezin.opslaan()

    def afval_schema_events(self, van: dt.date, tot: dt.date) -> list[dict[str, Any]]:
        uit = []
        for s in self.gezin.data["afval"]["schema"]:
            a = AFVAL[s["soort"]]
            start = _datum(s["start"])
            stap = dt.timedelta(weeks=s["weken"])
            # ook terug in de tijd doorrekenen, zodat een ophaaldag in het verleden nog klopt
            n = (van - start).days // stap.days if van > start else 0
            d = start + n * stap
            while d < tot:
                if d >= van:
                    uit.append({"id": f"afval-{s['soort']}-{d.isoformat()}", "titel": f"{a['icoon']} {a['naam']}", "start": d.isoformat(), "eind": None,
                                "hele_dag": True, "wie": [], "soort": "afval", "afval": s["soort"], "icoon": a["icoon"], "kleur": a["kleur"], "bewerkbaar": False})
                d += stap
        from . import afvalbedrijf
        uit += afvalbedrijf.events(self.gezin, van, tot)        # rechtstreeks van het afvalbedrijf (bijv. ROVA)
        return sorted(uit, key=lambda e: e["start"])

    # ── agenda's koppelen ──
    def lid_agendas(self, lid_id: str, agendas: list[str]) -> None:
        lid = self.gezin.lid(lid_id)
        lid["agendas"] = [a for a in agendas if a.startswith("calendar.")]
        self.gezin.opslaan()

    def extra_agendas(self, agendas: list[str]) -> None:
        self.gezin.data["agendas_extra"] = [a for a in agendas if a.startswith("calendar.")]
        self.gezin.opslaan()

    async def link_toevoegen(self, naam: str, url: str) -> str:
        """Een agenda-link (iCal/webcal) toevoegen via HA's eigen integratie Remote Calendar; geeft de agenda-entiteit terug."""
        naam, url = naam.strip()[:60], url.strip()
        if not naam:
            raise FamilyFout("Geef de agenda een naam.")
        if not re.match(r"^(https?|webcal)://", url):
            raise FamilyFout("Plak de hele link, die begint met https:// of webcal://.")
        url = re.sub(r"^webcal://", "https://", url)
        for e in self.hass.config_entries.async_entries("remote_calendar"):
            if e.data.get("url") == url:
                return self._entiteit_van(e.entry_id) or ""
        try:
            r = await self.hass.config_entries.flow.async_init("remote_calendar", context={"source": "user"},
                                                                 data={"calendar_name": naam, "url": url, "verify_ssl": True})
        except Exception as ex:  # noqa: BLE001
            raise FamilyFout(f"Deze link kon niet worden toegevoegd: {ex}") from ex
        if r.get("type") != "create_entry":
            fout = (r.get("errors") or {}).get("base", "")
            uitleg = {"cannot_connect": "De link werkt niet (geen verbinding).", "forbidden": "De link is niet openbaar.",
                      "invalid_ics_file": "Achter deze link zit geen agenda."}.get(fout, "Deze link kon niet worden toegevoegd.")
            raise FamilyFout(uitleg)
        await self.hass.async_block_till_done()
        ent = self._entiteit_van(r["result"].entry_id)
        if not ent:
            raise FamilyFout("De agenda is toegevoegd, maar nog niet klaar. Probeer het zo nog eens.")
        return ent

    def _entiteit_van(self, entry_id: str) -> str | None:
        return next((e.entity_id for e in er.async_entries_for_config_entry(er.async_get(self.hass), entry_id) if e.domain == "calendar"), None)

    def beschikbare_agendas(self) -> list[dict[str, Any]]:
        eigen = {e.entity_id for e in er.async_entries_for_config_entry(er.async_get(self.hass), self.gezin.entry.entry_id)}
        return [{"entity": s.entity_id, "naam": s.name} for s in self.hass.states.async_all("calendar") if s.entity_id not in eigen]

    # ── alles samen ──
    async def events(self, van: dt.date, tot: dt.date) -> list[dict[str, Any]]:
        uit = self.eigen_events(van, tot) + self.verjaardag_events(van, tot) + self.afval_schema_events(van, tot)
        bronnen: dict[str, dict[str, Any]] = {}
        for l in self.gezin.leden:
            for a in l.get("agendas") or []:
                bronnen.setdefault(a, {"wie": [], "soort": "agenda"})["wie"].append(l["id"])
        for a in self.gezin.data["agendas_extra"]:
            bronnen.setdefault(a, {"wie": [], "soort": "agenda"})
        if self.gezin.data["afval"].get("agenda"):
            bronnen[self.gezin.data["afval"]["agenda"]] = {"wie": [], "soort": "afval"}
        bronnen = {k: v for k, v in bronnen.items() if self.hass.states.get(k)}
        if bronnen:
            tz = dt_util.get_default_time_zone()
            try:
                antw = await self.hass.services.async_call(
                    "calendar", "get_events", {"start_date_time": dt.datetime.combine(van, dt.time(), tz), "end_date_time": dt.datetime.combine(tot, dt.time(), tz)},
                    target={"entity_id": list(bronnen)}, blocking=True, return_response=True)
            except Exception as ex:  # noqa: BLE001 - één kapotte agenda mag de rest niet tegenhouden
                _LOGGER.warning("Agenda's ophalen mislukt: %s", ex)
                antw = {}
            for ent, res in (antw or {}).items():
                b = bronnen.get(ent)
                if not b:
                    continue
                for i, e in enumerate(res.get("events", [])):
                    start, eind = str(e["start"]), str(e["end"])
                    hele_dag = len(start) == 10
                    if hele_dag:                                 # einddatum van een hele dag is exclusief
                        eind_d = _datum(eind) - dt.timedelta(days=1)
                        eind = eind_d.isoformat() if eind_d > _datum(start) else None
                    item = {"id": f"{ent}|{i}|{start}", "titel": e.get("summary") or "", "start": start, "eind": eind, "hele_dag": hele_dag,
                            "wie": b["wie"], "soort": b["soort"], "plek": e.get("location") or "", "notitie": e.get("description") or "",
                            "bron": ent, "bewerkbaar": False}
                    if b["soort"] == "afval":
                        s = afval_soort(item["titel"])
                        if s:
                            item.update(afval=s, icoon=AFVAL[s]["icoon"], kleur=AFVAL[s]["kleur"])
                    uit.append(item)
        return sorted(uit, key=lambda e: (e["start"][:10], not e["hele_dag"], e["start"]))

    def week_titel(self, week: str, titel: str) -> None:
        if not re.fullmatch(r"\d{4}-W\d{2}", week):
            raise FamilyFout("Ongeldige week.")
        titel = titel.strip()[:60]
        if titel:
            self.gezin.data["week_titels"][week] = titel
        else:
            self.gezin.data["week_titels"].pop(week, None)
        self.gezin.opslaan()

    def instellingen(self) -> dict[str, Any]:
        d = self.gezin.data
        return {"leden": [{"id": l["id"], "agendas": l.get("agendas") or [], "geboortedatum": l.get("geboortedatum")} for l in self.gezin.leden],
                "extra": d["agendas_extra"], "verjaardagen": d["verjaardagen"], "afval": d["afval"], "verjaardag_melding": d["verjaardag_melding"],
                "beschikbaar": self.beschikbare_agendas(), "afvalbedrijven": _bedrijven(), "afvalsoorten": {k: {x: a[x] for x in ("naam", "icoon", "kleur")} for k, a in AFVAL.items()}}
