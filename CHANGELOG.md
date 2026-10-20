# Changelog

## 0.11.2 — grote knoppen op het muurscherm

- Muurscherm: lampen, stekkers en de rest per kamer als grote aanraakknoppen (naam, aan/uit en een groot icoon), twee of
  drie naast elkaar. Het startscherm houdt de compacte knoppen.

## 0.11.1 — de taal van het huishouden

- HA Family (kaarten, muurscherm, beheer) volgt nu de taal van Home Assistant zelf, niet die van de browser of het profiel.
  Een tablet met een Engelse browser toont het muurscherm dus gewoon in het Nederlands.

## 0.11.0 — kamers aanpassen op het dashboard

- **✏️ Aanpassen** op de kamers-kaart (beheerders): per apparaat met het oogje op of van het dashboard, en apparaten
  zonder kamer meteen in een kamer zetten. Werkt ook in het automatische gezinsdashboard.
- Apparaten zonder kamer (bijvoorbeeld een losse stekker) staan nu onder **Overig** in plaats van weg te vallen.
- Een koelkast of vriezer uitzetten vraagt eerst om bevestiging.

## 0.10.0 — het gezinsdashboard aanpassen

- **Dashboard bewerken** (✏️) heeft nu een editor: tabbladen aan/uit, kaarten op Thuis, titel en agenda-weergave. Het blijft
  zichzelf bijwerken: we bewaren wat je verbergt, dus nieuwe onderdelen komen er vanzelf bij. Experts: `extra` en `extra_tabs`.
- **Sjabloon**: het gezinsdashboard omzetten naar een gewoon dashboard dat je vrij bewerkt; later **Nieuwe onderdelen
  toevoegen** (alleen wat echt nieuw is), **Terug naar automatisch** en **Vorige versie terugzetten** (laatste 5 kopieën).

## 0.9.0 — bediening per soort apparaat, rechten per kamer

- **Bedieningspaneel per soort**: airco/thermostaat (temperatuur, stand, ventilator, zwenken, voorkeur), rolluik (op/stop/
  neer, positie), speaker (afspelen, volgende, volume), ventilator (snelheid), lamp (lang drukken: helderheid, warm/koel,
  kleur). Op het startscherm, het muurscherm en via ⋯ op het tabblad Huis.
- **Rechten per kamer** (Verborgen/Zien/Bedienen) met uitzonderingen per apparaat, en *Zelfde als* een ander gezinslid.
  Instellingen uit 0.8.0 worden vanzelf omgezet.

## 0.8.0 — meer AI, bekijk als, apparaten per kind

- **AI** (met AI Task, anders zonder): dagoverzicht in *Vandaag*, weekmenu bedenken, recept bedenken, klusjes-ideeën per kind.
- **Bekijk als**: als beheerder HA Family zien zoals een gezinslid het ziet (alleen kijken).
- **Lampen en apparaten per persoon**: per apparaat verborgen, zien (met slotje) of bedienen.
- HACS staat niet meer in de Expert-zijbalk (wel in Admin).
- Opgelost: bij echte Hue-ruimtes stonden de losse lampen en dubbele zones er toch bij (Hue geeft de lampen als set).

## 0.7.0 — Admin, persoonlijk dashboard en afval van ROVA

- **Expert** heeft nu een rustige zijbalk: gezin, persoonlijk dashboard, Gezin beheren, **Admin** en HACS. In Admin staat al
  het andere (automatiseringen, apparaten, instellingen, dashboards, plugins, add-ons en de AI), met zoeken.
- Nieuwe weergave **Zoals het was** (Home Assistant zonder aanpassingen); bestaande accounts beginnen daarop.
- **Persoonlijk dashboard** per gezinslid: nieuw maken of een bestaand dashboard koppelen; alleen in de eigen zijbalk.
- **Afvalkalender van je afvalbedrijf**: postcode en huisnummer, de rest gaat vanzelf. Eerst: ROVA.
- Kamerknoppen (startscherm en muurscherm) hebben nu een naam; namen worden korter (kamernaam, dubbele woorden en
  "Socket 1" eraf).
- Cadeaus: tip waar de cadeau-ideeën (met AI) staan.

## 0.6.1 — visuele editor (voor experts)

- Alle kaarten hebben een **visuele editor** in de dashboard-editor (weerbericht, agenda-weergave en aantal weken, klusjes
  van wie, compact, kamer en titel). Alleen voor wie op de weergave *Expert* staat; anderen krijgen uitleg.
- Kaarten staan met een beschrijving in *Kaart toevoegen*.

## 0.6.0 — cadeaus en verlanglijstjes

- **Over een gezinslid** (Gezin beheren → Bewerken): geboortedatum, geslacht en interesses.
- **Verlanglijstjes** (tabblad *🎁 Cadeaus*): wensen met prijs, link en notitie; ouders helpen kinderen; *Sturen naar…*
  stuurt het lijstje als melding naar gekozen gezinsleden.
- **Stiekem afvinken**: *Ik koop dit*; anderen zien dat het gekocht wordt, de eigenaar niet.
- **Cadeau-ideeën** op leeftijd, geslacht, interesses, budget en gelegenheid, via de AI van Home Assistant (*AI Task*) als
  die gekoppeld is, anders uit een eigen ideeënlijst; ideeën bewaren (alleen voor jezelf).
- **Herinnering** twee weken voor een verjaardag, met wat er nog op het verlanglijstje staat.

## 0.5.1 — kamers in een bestaand huis

- Lampgroepen (zoals Hue-ruimtes): de groep staat in de kamer, de losse lampen erin niet; twee groepen met dezelfde lampen
  maar één keer.
- Schakelaars die bij een ander apparaat horen (kinderslot en slaapstand van de airco, screensaver van een tablet) staan
  niet meer los in de kamer; apparaten die offline zijn ook niet. Met het oogje in *Gezin beheren → Huis* kies je zelf.
- **Kamers samenvoegen** (bij *wijzigen*): alles uit de ene kamer, ook sensoren, gaat naar de andere.
- Bestaande personen met een account houden bij het toevoegen hun eigen Home Assistant (weergave *expert*); een
  eenvoudiger weergave kies je zelf bij *Bewerken*.
- Hernoemen van een kamer laat het icoon staan.

## 0.5.0 — maaltijdplanner en kamers

- **Weekmenu** (tabblad *🍝 Eten*): per dag een recept of eigen tekst, wie er kookt, *🎲 Verrassing*, week vooruit/terug.
- **Recepten**: zelf maken (emoji, ingrediënten, bereiding, labels, favoriet), startpakket met tien gezinsgerechten, of
  importeren via de link van een receptensite (schema.org/Recipe).
- **Ingrediënten naar de boodschappen**: per gerecht of de hele week, zonder hoeveelheden en zonder dubbele, op looproute.
- **Vanavond eten we** op het startscherm en op het muurscherm; sensor *Eten vandaag*; herinnering voor de kok.
- **Kamers** (tabblad *🏠 Huis*, rechts op het muurscherm en op het startscherm): lampen (met helderheid), airco/thermostaat
  (aan/uit en temperatuur), ventilatoren, rolluiken, stopcontacten en speakers per kamer; *Alles uit*.
- **Gezin beheren → Huis**: kamers aanmaken (naam en icoon, of snel toevoegen), apparaten aanvinken en in één keer in een
  kamer zetten, hernoemen, verbergen en verwijderen. Kamers zijn de ruimtes van Home Assistant.
- Muurscherm: onderdelen *Eten* en *Kamers* aan/uit te zetten.

## 0.4.0 — nieuw startscherm en het muurscherm

- **Muurscherm** voor een tablet aan de muur (`/gezin-muur`): klok, datum, weer met de komende dagen, afval, de agenda van
  vandaag/morgen/deze week, klusjes per kind (aanraken = gedaan), wie er thuis is en de boodschappen (afvinken en toevoegen).
  Nachtstand met een gedimde, verschuivende klok; scherm blijft aan waar mogelijk; liggend en staand.
- **Gezin beheren → Muurscherm**: maakt een account *muur* dat alleen thuis kan inloggen, met QR-code en stappen voor de
  tablet; nachtstand, weerbericht en onderdelen instellen. Op de tablet verdwijnt de zijbalk en is het muurscherm het
  startscherm. Vanaf de muur mag je klusjes afvinken en boodschappen toevoegen, niet beheren.
- **Nieuw startscherm** (Thuis) in drie kolommen: groet met het weer, klusjes, vandaag, boodschappen en *Mijn taken*.
- Kaarten *taken* en *boodschappen* hebben een compacte vorm (`compact: true`) met snel toevoegen.
- HA Family verwijderen haalt ook het muuraccount weg.

## 0.3.0 — klusjes, taken en boodschappen

- **Klusjes met punten**: elke dag, werkdagen, weekend, eigen dagen of één keer; voor wie; voorbeelden met één klik.
  Kinderen vinken af op grote tegels (met feestje); de ouder krijgt bij *goedkeuren* een melding met de knoppen
  **Goedkeuren** / **Nog niet**.
- **Beloningen**: punten inwisselen (met goedkeuring), voortgang per beloning; extra punten geven of afhalen.
- **Avondherinnering** voor wie nog klusjes open heeft.
- **Taken**: gezinstaken met *voor wie* en deadline (ook als to-do-lijst *Taken* in HA).
- **Boodschappen** op looproute, met komma's meer tegelijk, afdeling aanpassen (ook als to-do-lijst *Boodschappen*).
- Nieuwe kaarten: *klusjes*, *taken*, *boodschappen*; tabbladen *Taken* en *Boodschappen* in het gezinsdashboard; de klusjes
  van een kind staan op zijn startscherm.
- Sensor *Punten* per gezinslid (ook voor nieuwe gezinsleden).
- **Gezin beheren**: tabblad *Klusjes* (klusjes, beloningen, punten, herinnering) en *Geef … een eigen account* voor wie
  eerst zonder account is toegevoegd.
- Opgelost: na *Erop* of *+* verscheen een nieuw item pas als je ergens anders klikte.

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
