# Changelog

## 0.2.0 — de gezinsagenda

- **Agendakaart** met twee weergaven, per persoon te kiezen: **maand** (blokken met een gekleurd puntje per gezinslid) en
  **weken** (weekplanner met weektitels en labels met avatars). Filter per gezinslid, verjaardagen en afval.
- **Afspraak maken** vanaf de kaart: voor wie, hele dag of van–tot, herhalen (week, om de week, maand, jaar), waar en notitie.
  Bewerken en verwijderen.
- **Agenda's koppelen** per gezinslid of voor het hele gezin: een bestaande agenda of een link (Google, iCloud, Outlook);
  HA Family voegt de link toe via Home Assistants eigen *Remote Calendar*.
- **Verjaardagen**: geboortedatum per gezinslid en een eigen lijst; ochtendmelding en felicitatie.
- **Afvalkalender**: zelf invullen, link van de gemeente of bestaande agenda; herinnering de avond ervoor.
- **Vandaag-kaart** op het tabblad Thuis, en een tabblad **Agenda** in het gezinsdashboard.
- Nieuwe entiteiten: agenda's *Gezinsagenda*, *Verjaardagen* en *Afval*, sensor *Volgende afval*.
- Gezin beheren heeft nu de tabbladen *Gezinsleden* en *Agenda*.
- Opgelost: bewerken, verwijderen, testmelding en wachtwoord in Gezin beheren werkten niet (het veld `id` botste met het
  websocket-protocol; de velden heten nu `lid`, `afspraak` en `verjaardag`).

## 0.1.0 — het fundament

- **Gezin of huishouden** instellen in twee klikken.
- **Gezin beheren** (paneel in de zijbalk, alleen voor beheerders):
  - gezinslid toevoegen met een wizard: naam, rol (ouder, kind, huisgenoot, gast), emoji en kleur, en of iemand een eigen
    telefoon heeft. HA Family maakt de persoon én het account (met een voorleesbaar wachtwoord) in één keer;
  - personen die al in Home Assistant bestaan met één klik toevoegen;
  - telefoon koppelen met QR-codes, met een live vinkje zodra de app is ingelogd; testmelding;
  - gezondheidscheck per gezinslid; lamp en meldingen kiezen; wachtwoord opnieuw instellen; verwijderen.
- **Weergave per gezinslid** (eenvoudig, normaal, beheerder, expert): HA Family zet het startscherm en de zijbalk zodat Home
  Assistant voelt als een gezinsapp. Expert, of HA Family verwijderen, zet alles terug zoals het was.
- **Gezinsdashboard** in de zijbalk dat zichzelf opbouwt, ook als startscherm voor iedereen.
- **Gezinskaart**: groet, datum en wie er thuis is.
- Nederlands en Engels.
