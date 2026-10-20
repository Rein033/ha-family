# HA Family

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![Validate](https://github.com/Rein033/ha-family/actions/workflows/validate.yml/badge.svg)](https://github.com/Rein033/ha-family/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/v/release/Rein033/ha-family)](https://github.com/Rein033/ha-family/releases)

**Home Assistant voor het hele gezin, zonder dat je een geek hoeft te zijn.**

Installeer HA Family en Home Assistant wordt een gezinsapp. Iedereen opent meteen het gezinsdashboard, ziet alleen wat bij
hem past, en gezinsleden toevoegen of een telefoon koppelen gaat met een wizard in plaats van met instellingen, YAML en
entiteiten. Ook voor huishoudens met huisgenoten.

| Startscherm van Noor (normaal) | Gezin beheren |
|---|---|
| ![Startscherm](docs/images/13-noor-normaal.png) | ![Gezin beheren](docs/images/09-overzicht.png) |

## Wat gebeurt er als je het installeert

1. Er komt een **gezinsdashboard** in de zijbalk, met de naam van jullie gezin. Dat wordt ook het **startscherm** voor
   iedereen (ook nieuwe gebruikers en een tablet aan de muur).
2. Er komt een paneel **Gezin beheren**, alleen voor beheerders. Daar voeg je gezinsleden toe en koppel je telefoons.
3. Per gezinslid kies je hoe Home Assistant eruitziet. HA Family zet daarvoor het startscherm en de zijbalk van die persoon:

   | Weergave | Zijbalk | Voor |
   |---|---|---|
   | **Eenvoudig** | alleen het gezin | kinderen, gasten |
   | **Normaal** | gezin, agenda, takenlijsten, kaart | ouders en huisgenoten |
   | **Beheerder** | gezin, Gezin beheren, instellingen | wie beheert |
   | **Expert** | Home Assistant zoals het was | wie alles wil zien |

   Komen er later nieuwe dingen in de zijbalk (bijvoorbeeld via HACS), dan verbergt HA Family die ook bij wie niet
   *expert* is.

HA Family verandert Home Assistant zelf niet: het gebruikt de instellingen die Home Assistant per gebruiker bewaart. Kies
**Expert** of verwijder HA Family, en alles staat weer zoals het was. Updates van Home Assistant blijven gewoon werken.

## Installeren

1. HACS → ⋮ → **Custom repositories** → `https://github.com/Rein033/ha-family`, type **Integration**.
2. Zoek **HA Family** → **Download** → herstart Home Assistant.
3. **Instellingen → Apparaten & diensten → Integratie toevoegen → HA Family**: de naam van jullie gezin, en of jullie een
   gezin of een huishouden zijn.
4. Open **Gezin beheren** in de zijbalk.

## Gezin beheren

**Gezinslid toevoegen.** Naam, wie het is (ouder, kind, gast of huisgenoot), een emoji en een kleur. Daarna: heeft diegene
een eigen telefoon of tablet? Dan maakt HA Family in één keer de persoon én een account, met een wachtwoord dat je kunt
voorlezen (zoals `maan-tulp-vos-42`). Jonge kinderen kunnen ook zonder account.

| Wie is het? | Eigen telefoon? |
|---|---|
| ![Wie](docs/images/04-wizard-wie.png) | ![Account](docs/images/05-wizard-account.png) |

**Telefoon koppelen.** Vier stappen met QR-codes: de app installeren, verbinden met jullie huis, inloggen en meldingen
toestaan. Zodra de app is ingelogd, verschijnt er vanzelf een vinkje; meldingen gaan daarna automatisch naar die telefoon.
Met **Stuur testmelding** controleer je of het werkt.

![Telefoon koppelen](docs/images/07-koppelen-wachten.png)

**Gezondheidscheck.** Bij elk gezinslid zie je of alles werkt: account, telefoon, weergave en lamp. Is er iets mis (geen
telefoon, de app werkt niet meer, een lamp die er niet meer is), dan staat dat er in gewone taal bij, met een knop om het op
te lossen.

**Al in Home Assistant?** Bestaan er al personen, dan voeg je die met één klik toe als ouder, kind of huisgenoot.

**Bewerken.** Naam, rol, emoji, kleur, weergave, lamp, naar welke telefoon de meldingen gaan, een nieuw wachtwoord, of uit
het gezin halen (eventueel met het account).

![Bewerken](docs/images/11-bewerken-weergave.png)

## Gezinsagenda

Alle afspraken van het gezin op één plek, in de kleur van wie het betreft. Ieder kiest zelf hoe de agenda eruitziet
(Home Assistant onthoudt het per persoon):

- **Maand**: een blokkenkalender met een gekleurd puntje per gezinslid, 🟢🟠🔵 voor afval en 🎂 voor verjaardagen. Tik op
  een dag voor de afspraken.
- **Weken**: een weekplanner. Elke week kan een titel krijgen (zoals *Herfstvakantie*), per dag staan de afspraken als
  labels met de avatar van wie het betreft.

| Maand | Weken | Telefoon |
|---|---|---|
| ![Maand](docs/images/24-agenda-maand.png) | ![Weken](docs/images/26-agenda-weken.png) | ![Telefoon](docs/images/30-mobiel-weken.png) |

**Afspraak maken.** Met **+ Afspraak** (of de **+** achter een dag): wat, wanneer, de hele dag of van–tot, **voor wie**
(tik op de avatars), herhalen (elke week, om de week, elke maand, elk jaar), waar en een notitie. Tik op een afspraak om hem
te bewerken of te verwijderen. Afspraken uit gekoppelde agenda's kun je bekijken.

![Afspraak bewerken](docs/images/27-afspraak-bewerken.png)

**Wat er allemaal in komt** (in te stellen bij **Gezin beheren → Agenda**):

- **Agenda's per gezinslid**: een agenda die al in Home Assistant staat, of een link (Google Agenda, iCloud, Outlook). Die
  afspraken krijgen de kleur van dat gezinslid. Waar je de link vindt, staat er gewoon bij.
- **Gezamenlijke agenda's**: school, sport, vakanties of feestdagen, in de kleur van het gezin.
- **Verjaardagen**: de geboortedatum van gezinsleden en een lijst met opa, oma en vrienden (jaar mag onbekend zijn). In de
  agenda staat *🎂 Emma wordt 8*, en 's ochtends krijgt iedereen een seintje (de jarige krijgt een felicitatie).
- **Afvalkalender**: zelf invullen (per soort de volgende ophaaldag en elke hoeveel weken), een link van de gemeente, of een
  agenda die je al hebt. De avond ervoor krijgt het gezin *"Morgen: 🟢 GFT. Zet de container vanavond aan de straat."*

![Agenda instellen](docs/images/22-beheer-agenda.png)

Op het tabblad **Thuis** staat een **Vandaag**-kaart: de afspraken van vandaag, welk afval er morgen aan de straat moet en
wie er binnenkort jarig is.

![Thuis](docs/images/28-thuis.png)

In Home Assistant zelf komen er drie agenda's bij (**Gezinsagenda**, **Verjaardagen**, **Afval**) en een sensor **Volgende
afval**, voor automatiseringen, Assist en de gewone agenda van Home Assistant.

## Klusjes, taken en boodschappen

**Klusjes met punten.** Een ouder maakt klusjes aan in **Gezin beheren → Klusjes** (of kiest een voorbeeld, zoals
*🍽️ Tafel dekken*): hoeveel punten, voor wie, en wanneer (elke dag, werkdagen, weekend, bepaalde dagen of één keer).
Een kind ziet zijn klusjes van vandaag als grote tegels op het startscherm. Tik erop en het is gedaan, met een feestje en
sterren.

- **Goedkeuren**: zet je bij een klusje *Een ouder moet het goedkeuren* aan, dan krijgen de ouders een melding met de knoppen
  **Goedkeuren** en **Nog niet**, direct op de telefoon. In het dashboard staat het onder *Wacht op jou*.
- **Beloningen**: zoals *🍦 IJsje = 15 sterren* of *🎬 Film kiezen = 20*. Het kind ziet hoe ver het nog is; heeft het genoeg,
  dan vraagt het de beloning aan en keurt een ouder goed.
- **Extra punten**: geef (of haal af) met één tik, bijvoorbeeld voor goed helpen.
- **Herinnering**: 's avonds een seintje aan wie nog klusjes open heeft.

| Kind (telefoon) | Ouder: wacht op jou | Na goedkeuren |
|---|---|---|
| ![Kind](docs/images/45-emma-voor.png) | ![Ouder](docs/images/47-ouder-wacht.png) | ![Goedgekeurd](docs/images/48-emma-goedgekeurd.png) |

![Klusjes instellen](docs/images/43-klusjes-ingesteld.png)

**Taken.** Gezinstaken met *voor wie* (tik op de avatars) en een deadline. Te laat staat in het rood. Ook een gewone
to-do-lijst in Home Assistant, dus ook te gebruiken met Assist: *"Zet fietsband plakken op Taken"*.

**Boodschappen.** Typ wat er nodig is; met komma's zet je meer dingen tegelijk op de lijst (`melk, brood, tomaten`). De lijst
sorteert zichzelf op de looproute in de winkel: groente & fruit, brood, zuivel, vlees, pasta & rijst, snoep, diepvries,
drinken, huishouden, verzorging. Staat iets bij de verkeerde afdeling, tik dan op 🏷️. Ook met Assist: *"Zet melk op de
boodschappenlijst"*.

![Boodschappen](docs/images/44-boodschappen.png)

**Een account voor later.** Krijgt een kind (of iemand anders zonder account) een eigen telefoon? Open het gezinslid in
**Gezin beheren → Bewerken** en kies **Geef … een eigen account**; je gaat meteen door naar telefoon koppelen.

## Kaarten

```yaml
type: custom:family-gezin-card     # groet, datum en wie er thuis is
type: custom:family-vandaag-card   # vandaag, afval van morgen, binnenkort jarig
type: custom:family-agenda-card    # de gezinsagenda
type: custom:family-klusjes-card   # klusjes: kind ziet de eigen tegels, ouder ziet iedereen (lid: <id> = altijd die persoon)
type: custom:family-taken-card     # gezinstaken
type: custom:family-boodschappen-card
weergave: maand                    # standaard voor wie nog niets koos: maand of weken
weken: 6                           # aantal weken in de weekplanner
```

Het hele dashboard: `strategy: { type: custom:ha-family }`. Wil je het zelf aanpassen: open het dashboard → ✏️ → **Overnemen**.

## Wat komt er

HA Family groeit functie voor functie. Elke functie krijgt een plek in het dashboard, eigen kaarten en, waar nodig, een
wizard in Gezin beheren.

- [x] **Fundament:** gezin, beheer, telefoons koppelen, weergave per gezinslid, gezinsdashboard
- [x] **Gezinsagenda:** een kleur per persoon, maand of weekplanner, verjaardagen, afvalkalender
- [x] **Taken en klusjes:** klusjes met punten voor kinderen, boodschappenlijst op looproute
- [ ] **Maaltijdplanner:** weekmenu, recepten, ingrediënten naar de boodschappen
- [ ] **Waar is iedereen:** "ik kom eraan", melding bij thuiskomst
- [ ] **Kinderen:** ochtend- en avondroutines, beloningen, zakgeld
- [ ] **Samen:** voor stellen (stemming, knuffels, date-pot; uit [Ons hokje](https://github.com/Rein033/ha-ons-hokje))
- [ ] **Systeem:** back-ups en updates in gewone taal, gezinsthema

## Hoe het in elkaar zit

Eén HACS-pakket met vier delen:

| Deel | Waar | Wat |
|---|---|---|
| HA-Family-Integrations | `custom_components/ha_family/*.py` | het gezin en de gegevens per functie, als gewone HA-entiteiten |
| HA-Family-Management | `websocket.py`, `weergave.py`, `frontend/family-beheer.js` | het beheerpaneel en de weergave per gezinslid |
| HA-Family-Cards | `frontend/family-cards.js`, `frontend/family-ui.js` | kaarten in één ontwerp |
| HA-Family-Dashboard | strategie `custom:ha-family` in `frontend/family-cards.js` | het dashboard dat zichzelf opbouwt |

## Privacy

Alles blijft op jullie eigen Home Assistant. Iedereen met een account ziet het gezin (namen, kleuren, wie er thuis is).
Alleen beheerders kunnen gezinsleden, accounts en telefoons beheren.

## Ontwikkelen

```bash
uv venv --python 3.13 .venv && VIRTUAL_ENV=.venv uv pip install pytest-homeassistant-custom-component
.venv/bin/python -m pytest
python3 scripts/gen_strings.py   # strings.json en vertalingen (nl/en)
```

Bij een nieuwe versie: `version` in `manifest.json`, `VERSIE` in `family-ui.js` en de `?v=` in de imports gelijk houden
(de CI controleert dat).
