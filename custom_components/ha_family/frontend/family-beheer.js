/* HA Family — beheerpaneel 'Gezin beheren' (HA-Family-Management).
 * Alles wat je anders in de instellingen van Home Assistant moet zoeken, in gewone taal en met wizards:
 * gezinsleden toevoegen (persoon + account in één keer), telefoons koppelen met een QR-code, meldingen testen,
 * lampen kiezen en per persoon kiezen hoe eenvoudig Home Assistant eruitziet. */
import qrcode from './lib/qrcode.mjs';
import { CSS, avatar, esc, locatie, taal, weergevenAls } from './family-ui.js?v=0.9.0';

const KLEUREN = ['#7c4dff', '#e91e63', '#00a6a6', '#ff8f00', '#43a047', '#1e88e5', '#8d6e63', '#f4511e', '#5e35b1', '#00897b'];
const EMOJI = ['🦊', '🐻', '🐼', '🦁', '🐯', '🐨', '🐸', '🦉', '🐙', '🦄', '🐝', '🐬', '🌻', '⭐', '🚀', '🎸', '⚽', '🎨', '🌈', '🍀'];
const APP_IOS = 'https://apps.apple.com/app/home-assistant/id1099568401';
const APP_ANDROID = 'https://play.google.com/store/apps/details?id=io.homeassistant.companion.android';

const T = {
  nl: {
    titel: 'Gezin beheren', leden: 'Gezinsleden', toevoegen: 'Gezinslid toevoegen', welkom: 'Welkom bij HA Family!',
    welkomTekst: 'Begin met het toevoegen van de mensen in jullie huis. Iedereen krijgt een eigen kleur en emoji, en wie een telefoon heeft, kan meldingen krijgen.',
    alInHa: 'Al in Home Assistant', alInHaTekst: 'Deze personen bestaan al. Voeg ze met één klik toe; wie een account heeft, houdt Home Assistant zoals het was (kies later een eenvoudiger weergave bij Bewerken):', als: 'als',
    rollen: { ouder: 'Ouder', kind: 'Kind', huisgenoot: 'Huisgenoot', gast: 'Gast' },
    rolUitleg: { ouder: 'Beheert mee, ziet alles van het gezin', kind: 'Eenvoudige weergave, eigen klusjes en agenda', huisgenoot: 'Deelt taken, boodschappen en agenda', gast: 'Logeert of past op, ziet alleen het belangrijkste' },
    gezin: 'Gezin', huishouden: 'Huishouden', wijzig: 'Wijzigen', opslaan: 'Opslaan', annuleren: 'Annuleren', volgende: 'Volgende', terug: 'Terug', klaar: 'Klaar',
    naam: 'Naam', naamVb: 'bijv. Emma', welkeRol: 'Wie is het?', emoji: 'Emoji', kleur: 'Kleur',
    telefoonVraag: 'Heeft {x} een eigen telefoon of tablet?', jaAccount: 'Ja, met een eigen account', jaUitleg: 'Krijgt meldingen en ziet zijn eigen dingen.',
    neeAccount: 'Nee, nu nog niet', neeUitleg: 'Bijvoorbeeld jonge kinderen. Kan later altijd nog.',
    gebruikersnaam: 'Gebruikersnaam', wachtwoord: 'Wachtwoord', nieuwWw: 'Ander wachtwoord', beheerder: 'Mag alles beheren (beheerder)',
    beheerderUitleg: 'Alleen voor wie ook gezinsleden, apparaten en instellingen mag aanpassen.',
    toegevoegd: '{x} is toegevoegd! 🎉', bewaar: 'Bewaar deze inloggegevens, je hebt ze nodig op de telefoon:', nuKoppelen: 'Telefoon nu koppelen', later: 'Later',
    koppelen: 'Telefoon koppelen', koppelenVan: 'Telefoon van {x} koppelen',
    stap1: 'Installeer de app', stap1t: 'Scan met de camera van de telefoon, of zoek "Home Assistant" in de App Store of Google Play.',
    stap2: 'Open de app en verbind met jullie huis', stap2t: 'Kies het gevonden huis, of tik op "Handmatig invoeren" en scan of typ dit adres:',
    stap3: 'Log in', stap3t: 'Gebruik deze gegevens:', wwVergeten: 'Wachtwoord vergeten? Stel hieronder een nieuw in.',
    stap4: 'Sta meldingen en locatie toe', stap4t: 'Zo krijgt {x} meldingen, en ziet het gezin of {x} thuis is.',
    wachten: 'Wachten tot de app is ingelogd…', gekoppeld: '{x} is gekoppeld!', testMelding: 'Stuur testmelding', testVerstuurd: 'Testmelding verstuurd 📱',
    geenAccount: '{x} heeft nog geen account. Geef {x} eerst een account bij "Bewerken".',
    bewerken: 'Bewerken', weergave: 'Hoe ziet Home Assistant eruit voor {x}?',
    weergaven: { eenvoudig: ['Eenvoudig', 'Alleen het gezinsdashboard. Ideaal voor kinderen en gasten.'],
      normaal: ['Normaal', 'Het gezin, plus agenda, takenlijsten en kaart.'],
      beheerder: ['Beheerder', 'Het gezin, Gezin beheren en de instellingen.'],
      expert: ['Expert', 'Gezin, Gezin beheren en Admin. In Admin staat al het andere: automatiseringen, dashboards, HACS en plugins.'],
      origineel: ['Zoals het was', 'Home Assistant zonder aanpassingen, met alles in de zijbalk.'] },
    lamp: 'Lamp van {x}', lampUitleg: 'Voor knuffels en welterusten (later).', meldingen: 'Meldingen naar', automatisch: 'Automatisch (eerste telefoon)',
    nieuwWachtwoord: 'Nieuw wachtwoord instellen', wwGewijzigd: 'Wachtwoord gewijzigd', verwijderen: 'Uit het gezin halen', verwijderenAccount: 'Ook account verwijderen',
    zeker: '{x} uit het gezin halen? Het account en de telefoon blijven gewoon werken.', zekerAccount: '{x} én het account helemaal verwijderen? Dit kan niet ongedaan worden.',
    account: 'Account', geenLogin: 'Geen eigen account', telefoon: 'Telefoon', geenTelefoon: 'Nog geen telefoon', lampKort: 'Lamp', geenLamp: 'Geen lamp',
    allesGoed: 'Alles werkt', kanInloggen: 'Inloggen als {x}', jij: 'jij', adresOnbekend: 'Stel eerst het adres van je Home Assistant in (Instellingen → Systeem → Netwerk).',
    huishoudenNaam: 'Naam van jullie huishouden',
    accountMaken: 'Geef {x} een eigen account', accountKnop: 'Account maken en telefoon koppelen',
    tabLeden: 'Gezinsleden', tabAgenda: 'Agenda', tabKlusjes: 'Klusjes', tabMuur: 'Muurscherm', tabHuis: 'Huis',
    huKamers: 'Kamers', huUitleg: 'Kamers zijn de ruimtes van Home Assistant: wat je hier maakt, zie je overal terug. Verborgen kamers staan niet op het dashboard en het muurscherm.',
    huNaam: 'Naam van de kamer', huNieuw: 'Nieuwe kamer', huToevoegen: 'Kamer toevoegen', huApparaten: 'Apparaten',
    huApparatenUitleg: 'Vink apparaten aan en zet ze in één keer in een kamer, of kies per apparaat. Met het oogje haal je iets van het dashboard; apparaten die offline zijn, staan er vanzelf niet op.', huZonder: 'Nog geen kamer', huGeenKamer: '— geen kamer —',
    huGekozen: 'gekozen', huZetIn: 'Zet in', huZeker: 'Kamer "{x}" verwijderen? De apparaten blijven gewoon bestaan, ze hebben dan geen kamer meer.',
    huVerbergen: 'Verbergen', huTonen: 'Tonen', huKanNiet: 'Dit apparaat kan geen kamer krijgen (geen vaste ID).', huVia: 'via het apparaat',
    huGeen: 'Geen lampen, klimaat of andere apparaten gevonden.', huAlles: 'Alles', huApp: 'apparaten', huApp1: 'apparaat', huVerplaatst: 'Verplaatst', huLeeg: 'Nog geen kamers. Begin met bijvoorbeeld Woonkamer, Keuken en Slaapkamer.',
    huSnel: 'Snel toevoegen', huSamen: 'Samenvoegen met', huSamenKnop: 'Samenvoegen', huSamenZeker: 'Alles uit "{x}" naar "{y}" verplaatsen (ook sensoren) en "{x}" verwijderen?', huBijzaak: 'instelling, verborgen', huOffline: 'offline', huLos: 'apparaten kunnen geen kamer krijgen (geen vaste ID in Home Assistant)', huDomein: { light: '💡 Lampen', climate: '❄️ Klimaat', fan: '🌀 Ventilatoren', cover: '🪟 Rolluiken', switch: '🔌 Stopcontacten', media_player: '🔊 Speakers' },
    huVoorbeelden: ['Woonkamer', 'Keuken', 'Slaapkamer', 'Kinderkamer', 'Badkamer', 'Hal', 'Zolder', 'Tuin'],
    muTitel: 'Een tablet aan de muur', muUitleg: 'Een groot scherm voor iedereen: klok, weer, de agenda van vandaag en morgen, de klusjes van de kinderen en de boodschappen. \'s Nachts alleen een gedimde klok.',
    muInstellen: 'Muurscherm instellen', muAccountUitleg: 'De tablet krijgt een eigen account dat alleen thuis kan inloggen. Kinderen kunnen er hun klusjes afvinken; beheren kan er niet.',
    muStap1: 'Open dit adres op de tablet', muStap1t: 'In de browser, de Home Assistant-app of een kiosk-app (zoals Fully Kiosk Browser):',
    muStap2: 'Log in met het muuraccount', muStap2t: 'Vink "Ingelogd blijven" aan.', muStap3: 'Zet de tablet vast aan de lader',
    muStap3t: 'Zet in de instellingen van de tablet "scherm uit" op nooit (of gebruik een kiosk-app). Het muurscherm houdt het scherm zelf ook wakker waar dat kan.',
    muBekijk: 'Bekijk het muurscherm', muInst: 'Instellingen', muNacht: 'Nachtstand: alleen een gedimde klok', muVan: 'van', muTot: 'tot', muWeer: 'Weerbericht',
    muWeerAuto: 'Automatisch (eerste)', muBlokken: 'Wat staat erop?', muBlok: { agenda: '📅 Agenda', eten: '🍽️ Eten', klusjes: '⭐ Klusjes', kamers: '🏠 Kamers', boodschappen: '🛒 Boodschappen', thuis: '🏠 Wie is er thuis' },
    muZijbalk: 'Zijbalk verbergen op de tablet', muAccount: 'Account', muVerwijder: 'Muuraccount verwijderen', muZeker: 'Het muuraccount verwijderen? De tablet wordt uitgelogd.',
    klKlusjes: 'Klusjes', klUitleg: 'Klusjes staan elke dag (of op de gekozen dagen) klaar. Afvinken geeft punten.', klNieuw: 'Klusje',
    klVoorbeelden: 'Voorbeelden: tik om toe te voegen', klGeen: 'Nog geen klusjes. Begin met een voorbeeld hieronder.', klMaak: 'Klusje maken', klBewerk: 'Klusje bewerken',
    klWat: 'Wat moet er gebeuren?', klPunten: 'Punten', klWie: 'Voor wie?', klWanneer: 'Wanneer?', klElkeDag: 'Elke dag', klWerkdagen: 'Werkdagen',
    klWeekend: 'Weekend', klEenKeer: 'Eén keer', klDatum: 'Datum', klGoedkeuren: 'Een ouder moet het goedkeuren', klGoedkeurenUitleg: 'Je krijgt een melding met "Goedkeuren" erin.',
    klZeker: 'Klusje "{x}" verwijderen?', dagenKort: ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'], klUit: 'staat uit',
    blBeloningen: 'Beloningen', blUitleg: 'Waar kunnen punten voor worden ingewisseld? Bij inwisselen krijg je een melding om goed te keuren.',
    blTitel: 'Beloning', blTitelVb: 'bijv. Film kiezen', blPunten: 'punten', blVb: [['🎬', 'Film kiezen', 20], ['🍦', 'IJsje', 15], ['📱', '30 min extra schermtijd', 25], ['🍕', 'Pizza kiezen', 40], ['🎢', 'Uitje', 100]],
    ptPunten: 'Punten', ptUitleg: 'Extra punten geven (of afhalen), bijvoorbeeld voor goed helpen.', ptAnders: 'Anders…', ptHoeveel: 'Hoeveel punten? (min = afhalen)', ptReden: 'Waarvoor?',
    ptRecent: 'Laatst', hrHerinnering: 'Herinnering', hrUitleg: "'s Avonds een seintje aan wie nog klusjes open heeft.", hrAan: 'Herinnering om',
    agendasLeden: "Agenda's per gezinslid", agendasUitleg: 'Afspraken uit deze agenda\'s komen in de gezinsagenda, in de kleur van die persoon.',
    gezamenlijk: "Gezamenlijke agenda's", gezamenlijkUitleg: 'Bijvoorbeeld school, sport of vakanties: in de kleur van het gezin.',
    agendaKoppelen: 'Agenda koppelen', geenAgendas: 'Nog geen agenda gekoppeld', agendaVan: 'Agenda koppelen voor {x}', hetGezin: 'het hele gezin',
    bestaand: 'Een agenda die al in Home Assistant staat', kies: 'Kies een agenda…', koppel: 'Koppelen', ofLink: 'Of plak een agenda-link',
    linkNaam: 'Naam', linkNaamVb: 'bijv. Werk Noor', linkUrl: 'Link (iCal)', linkToevoegen: 'Link toevoegen', bezigLink: 'Agenda ophalen…',
    waarLink: 'Waar vind ik die link?', linkGoogle: 'Google Agenda (op de computer): Instellingen → kies je agenda → "Geheim adres in iCal-indeling".',
    linkIcloud: 'iCloud (iPhone): Agenda-app → Agenda\'s → ⓘ bij je agenda → zet "Openbare agenda" aan → Deel link.',
    linkOutlook: 'Outlook.com: Instellingen → Agenda → Gedeelde agenda\'s → Een agenda publiceren → ICS-link.',
    verjaardagen: 'Verjaardagen', verjaardagenUitleg: 'Verjaardagen staan in de agenda en \'s ochtends krijgt iedereen een seintje.',
    geboortedatum: 'Geboortedatum', klAi: 'Ideeën voor…', klAiMet: 'Bedacht door de AI, passend bij leeftijd en interesses. Tik om toe te voegen.', klAiZonder: 'Uit de voorbeelden (koppel een AI voor ideeën op maat). Tik om toe te voegen.', apTitel: 'Lampen en apparaten van {x}', apAlles: 'Alles', apAllesUitleg: '{x} ziet en bedient alle lampen en apparaten in het gezinsdashboard.',
    apKiezen: 'Zelf kiezen', apKiezenUitleg: 'Jij kiest per apparaat wat {x} ziet en wat {x} mag aan- en uitzetten.', apLegenda: 'Verborgen: staat er niet. Zien: alleen kijken (met slotje). Bedienen: aan/uit en instellen.',
    apLegendaKamer: 'Kies per kamer: Verborgen, Zien (met slotje) of Bedienen. Dat geldt voor alles in de kamer, ook wat er later bijkomt. Alleen als één apparaat anders moet, zet je dat bij "Per apparaat".',
    apUitz: 'Per apparaat ({x})', apAnders: 'anders', apZoalsKamer: 'Zoals kamer', apZelfdeAls: 'Zelfde als:', apGekopieerd: 'Overgenomen van {x}, vergeet niet op te slaan',
    apVerborgen: 'Verborgen', apZien: 'Zien', apBedienen: 'Bedienen', apAllesBedienen: 'Alles bedienen', apNiets: 'Niets', bekijkAls: 'Bekijk als', bekijkAlsUitleg: 'Zie HA Family zoals dit gezinslid het ziet (alleen kijken).', pdTitel: 'Persoonlijk dashboard', pdUitleg: 'Een eigen dashboard dat alleen in de zijbalk van {x} staat, bijvoorbeeld met 3D-printers of hobbykaarten.', pdEigen: 'Dashboard van {x}', pdOpen: 'Openen', pdLos: 'Loskoppelen', pdMaak: 'Nieuw dashboard', pdOf: 'of', pdKies: 'Bestaand dashboard…', pdKoppel: 'Koppelen', overLid: 'Over {x}', overLidUitleg: 'Voor verjaardagen en passende cadeau-ideeën.', geslacht: 'Geslacht', geslachten: { man: 'Man / jongen', vrouw: 'Vrouw / meisje', anders: 'Anders' }, interesses: 'Interesses en hobby\'s', interesseEigen: 'Zelf iets toevoegen, bijv. skateboarden', extraJarigen: 'Opa, oma, vrienden…', naamJarige: 'Naam', jaarOnbekend: 'Jaar onbekend', toevoegenKort: 'Toevoegen',
    meldingOm: 'Melding om', aan: 'Aan',
    afvalTitel: 'Afvalkalender', afvalUitleg: 'De avond voor het ophalen krijgt het gezin een seintje.',
    afvalBedrijf: 'Mijn afvalbedrijf', afvalBedrijfUitleg: 'Postcode en huisnummer, de rest gaat vanzelf.', afvalBedrijfKies: 'Afvalbedrijf',
    postcode: 'Postcode', huisnummer: 'Huisnummer', toevoeging: 'Toevoeging', afvalBedrijfGemeenten: 'Haalt op in: {x}.', afvalGevonden: '🚛 Gevonden: {x}',
    afvalZelf: 'Zelf invullen', afvalZelfUitleg: 'Per soort de volgende ophaaldag en hoe vaak.',
    afvalLink: 'Link van de gemeente', afvalLinkUitleg: 'Zoek op de site van je gemeente of afvalinzamelaar naar "afvalkalender in je agenda" of "iCal".',
    afvalBestaand: 'Bestaande agenda', afvalBestaandUitleg: 'Bijvoorbeeld van een afval-integratie die je al hebt.',
    volgendeKeer: 'Volgende ophaaldag', elke: 'elke', weken: 'weken', week1: 'week', herinneringAan: 'Herinnering de avond ervoor', om: 'om',
    naarWie: 'Naar wie? (niemand gekozen: iedereen met een telefoon)', bewaren: 'Bewaren', bewaard: 'Bewaard ✓', afvalNu: 'Nu: {x}', geenAfval: 'Nog niet ingesteld',
  },
  en: {
    titel: 'Family settings', leden: 'Family members', toevoegen: 'Add family member', welkom: 'Welcome to HA Family!',
    welkomTekst: 'Start by adding the people in your home. Everyone gets their own colour and emoji, and whoever has a phone can get notifications.',
    alInHa: 'Already in Home Assistant', alInHaTekst: 'These people already exist. Add them with one click; anyone with an account keeps Home Assistant as it was (pick a simpler view later under Edit):', als: 'as',
    rollen: { ouder: 'Parent', kind: 'Child', huisgenoot: 'Housemate', gast: 'Guest' },
    rolUitleg: { ouder: 'Helps manage, sees everything', kind: 'Simple view, own chores and calendar', huisgenoot: 'Shares tasks, groceries and calendar', gast: 'Staying over or babysitting, sees the essentials' },
    gezin: 'Family', huishouden: 'Household', wijzig: 'Change', opslaan: 'Save', annuleren: 'Cancel', volgende: 'Next', terug: 'Back', klaar: 'Done',
    naam: 'Name', naamVb: 'e.g. Emma', welkeRol: 'Who is it?', emoji: 'Emoji', kleur: 'Colour',
    telefoonVraag: 'Does {x} have their own phone or tablet?', jaAccount: 'Yes, with their own account', jaUitleg: 'Gets notifications and sees their own things.',
    neeAccount: 'Not yet', neeUitleg: 'For example young children. You can always add it later.',
    gebruikersnaam: 'Username', wachtwoord: 'Password', nieuwWw: 'Other password', beheerder: 'Can manage everything (administrator)',
    beheerderUitleg: 'Only for someone who may also change family members, devices and settings.',
    toegevoegd: '{x} has been added! 🎉', bewaar: 'Keep these login details, you need them on the phone:', nuKoppelen: 'Connect phone now', later: 'Later',
    koppelen: 'Connect phone', koppelenVan: "Connect {x}'s phone",
    stap1: 'Install the app', stap1t: 'Scan with the phone camera, or search for "Home Assistant" in the App Store or Google Play.',
    stap2: 'Open the app and connect to your home', stap2t: 'Pick the home it finds, or tap "Enter address manually" and scan or type this address:',
    stap3: 'Log in', stap3t: 'Use these details:', wwVergeten: 'Forgot the password? Set a new one below.',
    stap4: 'Allow notifications and location', stap4t: 'So {x} gets notifications, and the family can see whether {x} is home.',
    wachten: 'Waiting for the app to log in…', gekoppeld: '{x} is connected!', testMelding: 'Send test notification', testVerstuurd: 'Test notification sent 📱',
    geenAccount: '{x} has no account yet. Give {x} an account under "Edit" first.',
    bewerken: 'Edit', weergave: 'What does Home Assistant look like for {x}?',
    weergaven: { eenvoudig: ['Simple', 'Only the family dashboard. Ideal for children and guests.'],
      normaal: ['Normal', 'The family, plus calendar, to-do lists and map.'],
      beheerder: ['Manager', 'The family, Family settings and the settings.'],
      expert: ['Expert', 'Family, Family settings and Admin. Admin holds everything else: automations, dashboards, HACS and plugins.'],
      origineel: ['As it was', 'Home Assistant unchanged, with everything in the sidebar.'] },
    lamp: "{x}'s lamp", lampUitleg: 'For hugs and good night (later).', meldingen: 'Notifications to', automatisch: 'Automatic (first phone)',
    nieuwWachtwoord: 'Set new password', wwGewijzigd: 'Password changed', verwijderen: 'Remove from family', verwijderenAccount: 'Also delete account',
    zeker: 'Remove {x} from the family? The account and phone keep working.', zekerAccount: 'Delete {x} and the account completely? This cannot be undone.',
    account: 'Account', geenLogin: 'No own account', telefoon: 'Phone', geenTelefoon: 'No phone yet', lampKort: 'Lamp', geenLamp: 'No lamp',
    allesGoed: 'Everything works', kanInloggen: 'Logs in as {x}', jij: 'you', adresOnbekend: 'Set the address of your Home Assistant first (Settings → System → Network).',
    huishoudenNaam: 'Name of your household',
    accountMaken: 'Give {x} their own account', accountKnop: 'Create account and connect phone',
    tabLeden: 'Family members', tabAgenda: 'Calendar', tabKlusjes: 'Chores', tabMuur: 'Wall screen', tabHuis: 'Home',
    huKamers: 'Rooms', huUitleg: 'Rooms are Home Assistant areas: what you create here shows up everywhere. Hidden rooms are not shown on the dashboard and the wall screen.',
    huNaam: 'Name of the room', huNieuw: 'New room', huToevoegen: 'Add room', huApparaten: 'Devices',
    huApparatenUitleg: 'Tick devices and put them in a room at once, or choose per device. The eye removes something from the dashboard; offline devices are left out automatically.', huZonder: 'No room yet', huGeenKamer: '— no room —',
    huGekozen: 'selected', huZetIn: 'Move to', huZeker: 'Delete room "{x}"? The devices stay, they just have no room anymore.',
    huVerbergen: 'Hide', huTonen: 'Show', huKanNiet: 'This device cannot get a room (no unique ID).', huVia: 'via the device',
    huGeen: 'No lights, climate or other devices found.', huAlles: 'All', huApp: 'devices', huApp1: 'device', huVerplaatst: 'Moved', huLeeg: 'No rooms yet. Start with, for example, Living room, Kitchen and Bedroom.',
    huSnel: 'Quick add', huSamen: 'Merge into', huSamenKnop: 'Merge', huSamenZeker: 'Move everything from "{x}" to "{y}" (sensors too) and delete "{x}"?', huBijzaak: 'setting, hidden', huOffline: 'offline', huLos: 'devices cannot get a room (no unique ID in Home Assistant)', huDomein: { light: '💡 Lights', climate: '❄️ Climate', fan: '🌀 Fans', cover: '🪟 Covers', switch: '🔌 Plugs', media_player: '🔊 Speakers' },
    huVoorbeelden: ['Living room', 'Kitchen', 'Bedroom', 'Kids room', 'Bathroom', 'Hallway', 'Attic', 'Garden'],
    muTitel: 'A tablet on the wall', muUitleg: "A big screen for everyone: clock, weather, today's and tomorrow's calendar, the children's chores and the groceries. At night only a dimmed clock.",
    muInstellen: 'Set up the wall screen', muAccountUitleg: 'The tablet gets its own account that can only log in at home. Children can tick off their chores there; it cannot manage anything.',
    muStap1: 'Open this address on the tablet', muStap1t: 'In the browser, the Home Assistant app or a kiosk app (such as Fully Kiosk Browser):',
    muStap2: 'Log in with the wall account', muStap2t: 'Tick "Keep me logged in".', muStap3: 'Keep the tablet on its charger',
    muStap3t: 'Set "screen timeout" to never in the tablet settings (or use a kiosk app). The wall screen also keeps the screen awake where possible.',
    muBekijk: 'View the wall screen', muInst: 'Settings', muNacht: 'Night mode: only a dimmed clock', muVan: 'from', muTot: 'to', muWeer: 'Weather',
    muWeerAuto: 'Automatic (first)', muBlokken: 'What is on it?', muBlok: { agenda: '📅 Calendar', eten: '🍽️ Dinner', klusjes: '⭐ Chores', kamers: '🏠 Rooms', boodschappen: '🛒 Groceries', thuis: "🏠 Who's home" },
    muZijbalk: 'Hide the sidebar on the tablet', muAccount: 'Account', muVerwijder: 'Delete wall account', muZeker: 'Delete the wall account? The tablet will be logged out.',
    klKlusjes: 'Chores', klUitleg: 'Chores are ready every day (or on the chosen days). Ticking them off earns points.', klNieuw: 'Chore',
    klVoorbeelden: 'Examples: tap to add', klGeen: 'No chores yet. Start with an example below.', klMaak: 'New chore', klBewerk: 'Edit chore',
    klWat: 'What needs doing?', klPunten: 'Points', klWie: 'For whom?', klWanneer: 'When?', klElkeDag: 'Every day', klWerkdagen: 'Weekdays',
    klWeekend: 'Weekend', klEenKeer: 'Once', klDatum: 'Date', klGoedkeuren: 'A parent has to approve', klGoedkeurenUitleg: 'You get a notification with "Approve" in it.',
    klZeker: 'Delete chore "{x}"?', dagenKort: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], klUit: 'is off',
    blBeloningen: 'Rewards', blUitleg: 'What can points be exchanged for? You get a notification to approve.',
    blTitel: 'Reward', blTitelVb: 'e.g. Pick the movie', blPunten: 'points', blVb: [['🎬', 'Pick the movie', 20], ['🍦', 'Ice cream', 15], ['📱', '30 min extra screen time', 25], ['🍕', 'Choose the pizza', 40], ['🎢', 'Day out', 100]],
    ptPunten: 'Points', ptUitleg: 'Give (or take away) extra points, for example for helping out.', ptAnders: 'Other…', ptHoeveel: 'How many points? (minus = take away)', ptReden: 'What for?',
    ptRecent: 'Recent', hrHerinnering: 'Reminder', hrUitleg: 'In the evening a note to whoever still has chores open.', hrAan: 'Reminder at',
    agendasLeden: 'Calendars per family member', agendasUitleg: "Events from these calendars appear in the family calendar, in that person's colour.",
    gezamenlijk: 'Shared calendars', gezamenlijkUitleg: 'For example school, sports or holidays: in the family colour.',
    agendaKoppelen: 'Connect calendar', geenAgendas: 'No calendar connected yet', agendaVan: 'Connect a calendar for {x}', hetGezin: 'the whole family',
    bestaand: 'A calendar already in Home Assistant', kies: 'Choose a calendar…', koppel: 'Connect', ofLink: 'Or paste a calendar link',
    linkNaam: 'Name', linkNaamVb: "e.g. Noor's work", linkUrl: 'Link (iCal)', linkToevoegen: 'Add link', bezigLink: 'Fetching calendar…',
    waarLink: 'Where do I find that link?', linkGoogle: 'Google Calendar (on a computer): Settings → your calendar → "Secret address in iCal format".',
    linkIcloud: 'iCloud (iPhone): Calendar app → Calendars → ⓘ next to your calendar → turn on "Public Calendar" → Share Link.',
    linkOutlook: 'Outlook.com: Settings → Calendar → Shared calendars → Publish a calendar → ICS link.',
    verjaardagen: 'Birthdays', verjaardagenUitleg: 'Birthdays appear in the calendar and everyone gets a note in the morning.',
    geboortedatum: 'Date of birth', klAi: 'Ideas for…', klAiMet: 'Made up by the AI, fitting age and interests. Tap to add.', klAiZonder: 'From the examples (connect an AI for tailored ideas). Tap to add.', apTitel: "{x}'s lights and devices", apAlles: 'Everything', apAllesUitleg: '{x} sees and controls all lights and devices on the family dashboard.',
    apKiezen: 'Choose', apKiezenUitleg: 'You choose per device what {x} sees and may switch.', apLegenda: 'Hidden: not shown. See: view only (with a lock). Control: on/off and settings.',
    apLegendaKamer: 'Choose per room: Hidden, See (with a lock) or Control. It applies to everything in the room, also devices added later. Only if one device should differ, set it under "Per device".',
    apUitz: 'Per device ({x})', apAnders: 'different', apZoalsKamer: 'Like room', apZelfdeAls: 'Same as:', apGekopieerd: 'Copied from {x}, remember to save',
    apVerborgen: 'Hidden', apZien: 'See', apBedienen: 'Control', apAllesBedienen: 'Control all', apNiets: 'None', bekijkAls: 'View as', bekijkAlsUitleg: 'See HA Family the way this family member sees it (view only).', pdTitel: 'Personal dashboard', pdUitleg: 'A dashboard of their own that only shows in the sidebar of {x}, e.g. with 3D printers or hobby cards.', pdEigen: "{x}'s dashboard", pdOpen: 'Open', pdLos: 'Unlink', pdMaak: 'New dashboard', pdOf: 'or', pdKies: 'Existing dashboard…', pdKoppel: 'Link', overLid: 'About {x}', overLidUitleg: 'For birthdays and fitting gift ideas.', geslacht: 'Gender', geslachten: { man: 'Male / boy', vrouw: 'Female / girl', anders: 'Other' }, interesses: 'Interests and hobbies', interesseEigen: 'Add your own, e.g. skateboarding', extraJarigen: 'Grandparents, friends…', naamJarige: 'Name', jaarOnbekend: 'Year unknown', toevoegenKort: 'Add',
    meldingOm: 'Notification at', aan: 'On',
    afvalTitel: 'Waste collection', afvalUitleg: 'The evening before collection the family gets a note.',
    afvalBedrijf: 'My waste company', afvalBedrijfUitleg: 'Postcode and house number, the rest is automatic.', afvalBedrijfKies: 'Waste company',
    postcode: 'Postcode', huisnummer: 'House number', toevoeging: 'Addition', afvalBedrijfGemeenten: 'Collects in: {x}.', afvalGevonden: '🚛 Found: {x}',
    afvalZelf: 'Enter it yourself', afvalZelfUitleg: 'Per type the next collection day and how often.',
    afvalLink: 'Link from your municipality', afvalLinkUitleg: 'Look on the website of your municipality or waste company for "calendar subscription" or "iCal".',
    afvalBestaand: 'Existing calendar', afvalBestaandUitleg: 'For example from a waste integration you already have.',
    volgendeKeer: 'Next collection', elke: 'every', weken: 'weeks', week1: 'week', herinneringAan: 'Reminder the evening before', om: 'at',
    naarWie: 'To whom? (nobody chosen: everyone with a phone)', bewaren: 'Save', bewaard: 'Saved ✓', afvalNu: 'Now: {x}', geenAfval: 'Not set up yet',
  },
};

const qrSvg = (tekst) => { const q = qrcode(0, 'M'); q.addData(tekst); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); };
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

class HaFamilyBeheer extends HTMLElement {
  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (this._menu) { this._menu.hass = hass; }
    this._forms && this._forms.forEach((f) => { f.hass = hass; });
    if (eerste) { this._bouw(); this._laad(); }
  }
  get hass() { return this._hass; }
  set narrow(n) { this._narrow = n; if (this._menu) this._menu.narrow = n; }
  t(k, x) { const v = T[taal(this._hass)][k] ?? T.en[k] ?? k; return typeof v === 'string' && x !== undefined ? v.replaceAll('{x}', x) : v; }
  connectedCallback() { this._klok = setInterval(() => this._laad(), this._dlg && this._dlg.soort === 'koppel' ? 3000 : 15000); }
  disconnectedCallback() { clearInterval(this._klok); clearInterval(this._snel); }

  _bouw() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style>
      <div class="balk"><span class="menu"></span><div class="titel">${esc(this.t('titel'))}</div>
        <div class="tabs"><button data-a="tab" data-tab="leden" class="aan">👨‍👩‍👧 ${esc(this.t('tabLeden'))}</button><button data-a="tab" data-tab="agenda">📅 ${esc(this.t('tabAgenda'))}</button><button data-a="tab" data-tab="klusjes">⭐ ${esc(this.t('tabKlusjes'))}</button><button data-a="tab" data-tab="huis">🏠 ${esc(this.t('tabHuis'))}</button><button data-a="tab" data-tab="muur">📺 ${esc(this.t('tabMuur'))}</button></div></div>
      <div class="inhoud"><div class="laden">…</div></div><div class="dlg-plek"></div>`;
    this._menu = document.createElement('ha-menu-button');
    this._menu.hass = this._hass;
    this._menu.narrow = this._narrow;
    this.shadowRoot.querySelector('.menu').append(this._menu);
    this.shadowRoot.addEventListener('click', (e) => this._klik(e));
    this.shadowRoot.addEventListener('input', (e) => this._invoer(e));
    this.shadowRoot.addEventListener('change', (e) => this._agendaWijzig(e));
    this._forms = [];
  }

  async _ws(type, data = {}) { return this._hass.callWS({ type, ...data }); }
  async _laad() {
    try {
      this._s = await this._ws('ha_family/status'); this._fout = null;
      if (this._tab === 'agenda' && !this._typt()) this._ag = await this._ws('ha_family/agenda/instellingen');
      if (this._tab === 'klusjes' && !this._typt()) this._kl = await this._ws('ha_family/taken');
      if (this._tab === 'huis' && !this._typt()) this._hu = await this._ws('ha_family/huis');
      if (this._tab === 'muur' && !this._typt()) {
        this._mu = await this._ws('ha_family/muur');
        if (!this._mu.heeft_account && !this._muWw) this._muWw = (await this._ws('ha_family/voorstel')).wachtwoord;
      }
    } catch (e) { this._fout = e.message; }
    if (this._tab !== 'leden' && this._tab && this._typt()) return;            // niet hertekenen terwijl iemand in de agenda-instellingen typt
    this._teken();
    if (this._dlg) this._tekenDlg();
  }
  _typt() { const a = this.shadowRoot && this.shadowRoot.activeElement; return !!a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName); }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  async _doe(type, data, ok) {
    try { const r = await this._ws(type, data); if (ok) this._melding(ok); await this._laad(); return r ?? true; } catch (e) { this._melding(e.message); return null; }
  }

  /* ── Overzicht ── */
  _teken() {
    const s = this._s, h = this._hass, el = this.shadowRoot.querySelector('.inhoud');
    if (!s) { el.innerHTML = `<div class="kaart fout">${esc(this._fout || '…')}</div>`; return; }
    this.shadowRoot.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('aan', b.dataset.tab === (this._tab || 'leden')));
    if (this._tab === 'agenda') { el.innerHTML = this._agendaTab(); return; }
    if (this._tab === 'klusjes') { el.innerHTML = this._klusjesTab(); return; }
    if (this._tab === 'muur') { el.innerHTML = this._muurTab(); return; }
    if (this._tab === 'huis') { el.innerHTML = this._huisTab(); return; }
    const soort = s.type === 'huishouden' ? this.t('huishouden') : this.t('gezin');
    const losse = s.losse_personen.length ? `<div class="kaart zacht"><b>${esc(this.t('alInHa'))}</b><p class="fam-sub">${esc(this.t('alInHaTekst'))}</p>
      <div class="losse">${s.losse_personen.map((p) => `<div class="los"><span class="los-naam">${esc(p.naam)}</span>
        ${(s.type === 'huishouden' ? ['huisgenoot', 'gast'] : ['ouder', 'kind']).map((r) => `<button class="fam-knop zacht klein" data-a="los" data-person="${esc(p.person)}" data-rol="${r}">+ ${esc(this.t('als'))} ${esc(this.t('rollen')[r].toLowerCase())}</button>`).join('')}</div>`).join('')}</div></div>` : '';
    el.innerHTML = `
      <div class="kaart huis">
        ${this._huisBewerk ? `<div class="huisform"><label>${esc(this.t('huishoudenNaam'))}<input class="veld" id="huisnaam" value="${esc(s.naam)}" maxlength="40"/></label>
            <div class="keuzes">${['gezin', 'huishouden'].map((k) => `<button class="keuze ${s.type === k ? 'aan' : ''}" data-a="soort" data-k="${k}">${k === 'gezin' ? '👨‍👩‍👧‍👦' : '🏠'} ${esc(this.t(k))}</button>`).join('')}</div>
            <div class="rij"><button class="fam-knop" data-a="huis-opslaan">${esc(this.t('opslaan'))}</button><button class="fam-knop rand" data-a="huis-annuleer">${esc(this.t('annuleren'))}</button></div></div>`
        : `<div class="huiskop"><div><div class="huisnaam">${esc(s.naam)}</div><div class="fam-sub">${esc(soort)} · ${s.leden.length} ${esc(this.t('leden').toLowerCase())}</div></div>
            <button class="fam-knop rand klein" data-a="huis-bewerk"><ha-icon icon="mdi:pencil"></ha-icon>${esc(this.t('wijzig'))}</button></div>`}
      </div>
      ${!s.leden.length ? `<div class="kaart welkom"><div class="groot">👋</div><h2>${esc(this.t('welkom'))}</h2><p class="fam-sub">${esc(this.t('welkomTekst'))}</p>
          <button class="fam-knop" data-a="toevoegen"><ha-icon icon="mdi:account-plus"></ha-icon>${esc(this.t('toevoegen'))}</button></div>` : ''}
      ${losse}
      ${s.leden.length ? `<div class="kop2"><h2>${esc(this.t('leden'))}</h2><button class="fam-knop" data-a="toevoegen"><ha-icon icon="mdi:account-plus"></ha-icon>${esc(this.t('toevoegen'))}</button></div>
        <div class="leden">${s.leden.map((l) => this._lidKaart(l)).join('')}</div>` : ''}`;
  }

  _lidKaart(l) {
    const h = this._hass, w = locatie(h, l.person), tel = l.telefoons[0];
    const lamp = l.lamp && h.states[l.lamp];
    const punten = l.punten.length ? l.punten.map((p) => `<div class="fam-chip ${p.ernst}"><ha-icon icon="${p.ernst === 'fout' ? 'mdi:alert-circle' : 'mdi:alert'}"></ha-icon>${esc(p.tekst)}</div>`).join('')
      : `<div class="fam-chip goed"><ha-icon icon="mdi:check-circle"></ha-icon>${esc(this.t('allesGoed'))}</div>`;
    const wg = this.t('weergaven')[l.weergave] || ['', ''];
    return `<div class="kaart lid" style="--fam-k:${esc(l.kleur)}">
      <div class="lidkop">${avatar(l, { grootte: 72, stip: w.bekend ? w.thuis : null })}
        <div class="lidnaam"><b>${esc(l.naam)}${l.id === this._s.ik ? ` <span class="fam-sub">(${esc(this.t('jij'))})</span>` : ''}</b>
          <span class="fam-sub">${esc(this.t('rollen')[l.rol] || l.rol)}${w.bekend ? ` · ${esc(w.tekst)}` : ''}</span></div></div>
      <div class="regels">
        <div><ha-icon icon="mdi:account"></ha-icon>${l.kan_inloggen ? esc(this.t('kanInloggen', l.gebruikersnaam || '…')) : `<span class="fam-sub">${esc(this.t('geenLogin'))}</span>`}</div>
        <div><ha-icon icon="mdi:cellphone"></ha-icon>${tel ? esc(tel.naam) + (l.telefoons.length > 1 ? ` +${l.telefoons.length - 1}` : '') : `<span class="fam-sub">${esc(this.t('geenTelefoon'))}</span>`}</div>
        <div><ha-icon icon="mdi:monitor-dashboard"></ha-icon>${esc(wg[0])}</div>
        <div><ha-icon icon="mdi:lightbulb"></ha-icon>${lamp ? esc(lamp.attributes.friendly_name || l.lamp) : `<span class="fam-sub">${esc(this.t('geenLamp'))}</span>`}</div>
      </div>
      <div class="punten">${punten}</div>
      <div class="rij">
        ${l.kan_inloggen && !tel ? `<button class="fam-knop" data-a="koppel" data-id="${l.id}"><ha-icon icon="mdi:qrcode"></ha-icon>${esc(this.t('koppelen'))}</button>` : ''}
        ${tel ? `<button class="fam-knop zacht" data-a="test" data-id="${l.id}"><ha-icon icon="mdi:bell-ring"></ha-icon>${esc(this.t('testMelding'))}</button>` : ''}
        <button class="fam-knop rand" data-a="bewerk" data-id="${l.id}"><ha-icon icon="mdi:pencil"></ha-icon>${esc(this.t('bewerken'))}</button>
        ${l.user_id !== (this._hass.user || {}).id ? `<button class="fam-knop rand" data-a="bekijk-als" data-id="${l.id}" title="${esc(this.t('bekijkAlsUitleg'))}"><ha-icon icon="mdi:eye"></ha-icon>${esc(this.t('bekijkAls'))}</button>` : ''}
      </div></div>`;
  }


  /* ── Agenda-tab ── */
  _agendaTab() {
    const a = this._ag, s = this._s, h = this._hass;
    if (!a) return '<div class="kaart">…</div>';
    const naam = (e) => (h.states[e] ? h.states[e].attributes.friendly_name : e);
    const chips = (lijst, voor) => lijst.length ? lijst.map((e) => `<span class="fam-chip">📅 ${esc(naam(e))}<button class="chipx" data-a="agenda-los" data-voor="${voor}" data-entity="${esc(e)}">✕</button></span>`).join('')
      : `<span class="fam-sub">${esc(this.t('geenAgendas'))}</span>`;
    const leden = s.leden.map((l) => { const al = (a.leden.find((x) => x.id === l.id) || {}).agendas || [];
      return `<div class="arij">${avatar(l, { grootte: 40 })}<b class="anaam">${esc(l.naam)}</b><div class="achips">${chips(al, l.id)}</div>
        <button class="fam-knop zacht klein" data-a="agenda-koppel" data-voor="${l.id}"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('agendaKoppelen'))}</button></div>`; }).join('');
    const af = a.afval, soorten = a.afvalsoorten;
    if (!this._afv) this._afv = { modus: af.bedrijf ? 'bedrijf' : af.agenda ? (h.states[af.agenda] && (h.states[af.agenda].attributes.friendly_name || '').toLowerCase().includes('afval') ? 'link' : 'bestaand') : 'zelf',
      schema: Object.fromEntries(af.schema.map((x) => [x.soort, { ...x }])), agenda: af.agenda || '', herinnering: { ...af.herinnering, leden: [...(af.herinnering.leden || [])] }, link: '', url: '', bedrijf: { bedrijf: 'rova', postcode: '', huisnummer: '', toevoeging: '', ...(af.bedrijf || {}) } };
    const v = this._afv;
    const afvalNu = af.bedrijf ? `${(a.afvalbedrijven[af.bedrijf.bedrijf] || {}).naam || af.bedrijf.bedrijf} · ${af.bedrijf.postcode} ${af.bedrijf.huisnummer}${af.bedrijf.toevoeging || ''}` : af.agenda ? naam(af.agenda) : af.schema.length ? af.schema.map((x) => soorten[x.soort].icoon + ' ' + soorten[x.soort].naam).join(', ') : this.t('geenAfval');
    const wekenOpties = (w) => [1, 2, 3, 4, 6, 8, 13, 26].map((n) => `<option value="${n}" ${Number(w) === n ? 'selected' : ''}>${n} ${esc(n === 1 ? this.t('week1') : this.t('weken'))}</option>`).join('');
    const beschikbaar = a.beschikbaar;
    return `
      <div class="kaart"><h2>📅 ${esc(this.t('agendasLeden'))}</h2><p class="fam-sub">${esc(this.t('agendasUitleg'))}</p>${leden}
        <div class="arij"><span class="fam-avatar" style="--k:var(--primary-color);width:40px;height:40px;font-size:20px">🏠</span><b class="anaam">${esc(this.t('gezamenlijk'))}</b>
          <div class="achips">${chips(a.extra, 'gezin')}</div><button class="fam-knop zacht klein" data-a="agenda-koppel" data-voor="gezin"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('agendaKoppelen'))}</button></div>
        <p class="fam-sub">${esc(this.t('gezamenlijkUitleg'))}</p></div>

      <div class="kaart"><h2>🎂 ${esc(this.t('verjaardagen'))}</h2><p class="fam-sub">${esc(this.t('verjaardagenUitleg'))}</p>
        ${s.leden.map((l) => `<div class="arij">${avatar(l, { grootte: 40 })}<b class="anaam">${esc(l.naam)}</b>
          <label class="klein-lbl">${esc(this.t('geboortedatum'))}<input class="veld smal" type="date" data-a="geboorte" data-id="${l.id}" value="${esc((a.leden.find((x) => x.id === l.id) || {}).geboortedatum || '')}"/></label></div>`).join('')}
        <h3>${esc(this.t('extraJarigen'))}</h3>
        ${a.verjaardagen.map((j) => `<div class="arij"><span class="fam-avatar" style="--k:#e91e63;width:40px;height:40px;font-size:20px">🎂</span><b class="anaam">${esc(j.naam)}</b>
          <span class="fam-sub">${esc(j.datum.length === 10 ? new Date(j.datum + 'T00:00:00').toLocaleDateString(h.locale?.language, { day: 'numeric', month: 'long', year: 'numeric' }) : new Date('2000-' + j.datum + 'T00:00:00').toLocaleDateString(h.locale?.language, { day: 'numeric', month: 'long' }))}</span>
          <button class="fam-knop gevaar klein" data-a="jarig-weg" data-id="${j.id}">✕</button></div>`).join('')}
        <div class="rij"><input class="veld groei" id="jarig-naam" placeholder="${esc(this.t('naamJarige'))}" maxlength="60"/><input class="veld smal" type="date" id="jarig-datum"/>
          <label class="vink kort"><input type="checkbox" id="jarig-geenjaar"/> ${esc(this.t('jaarOnbekend'))}</label>
          <button class="fam-knop" data-a="jarig-toevoegen"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('toevoegenKort'))}</button></div>
        <div class="rij"><label class="vink kort"><input type="checkbox" data-a="jarig-melding" ${a.verjaardag_melding.aan ? 'checked' : ''}/> ${esc(this.t('meldingOm'))}</label>
          <input class="veld smal" type="time" data-a="jarig-tijd" value="${esc(a.verjaardag_melding.tijd)}"/></div></div>

      <div class="kaart"><h2>🗑️ ${esc(this.t('afvalTitel'))}</h2><p class="fam-sub">${esc(this.t('afvalUitleg'))} · <b>${esc(this.t('afvalNu', afvalNu))}</b></p>
        <div class="keuzes">${[['bedrijf', '🚛'], ['zelf', '✍️'], ['link', '🔗'], ['bestaand', '📅']].map(([k, i]) => `<button class="keuze ${v.modus === k ? 'aan' : ''}" data-a="afval-modus" data-v="${k}"><span class="ki">${i}</span><b>${esc(this.t({ bedrijf: 'afvalBedrijf', zelf: 'afvalZelf', link: 'afvalLink', bestaand: 'afvalBestaand' }[k]))}</b><small>${esc(this.t({ bedrijf: 'afvalBedrijfUitleg', zelf: 'afvalZelfUitleg', link: 'afvalLinkUitleg', bestaand: 'afvalBestaandUitleg' }[k]))}</small></button>`).join('')}</div>
        ${v.modus === 'bedrijf' ? `<div class="rij" style="align-items:end">
            <label class="klein-lbl">${esc(this.t('afvalBedrijfKies'))}<select class="veld smal" id="ab-bedrijf">${Object.entries(a.afvalbedrijven).map(([k, x]) => `<option value="${k}" ${v.bedrijf.bedrijf === k ? 'selected' : ''}>${esc(x.naam)}</option>`).join('')}</select></label>
            <label class="klein-lbl">${esc(this.t('postcode'))}<input class="veld smal" id="ab-postcode" value="${esc(v.bedrijf.postcode)}" placeholder="1234 AB" maxlength="7" style="width:110px"/></label>
            <label class="klein-lbl">${esc(this.t('huisnummer'))}<input class="veld smal" id="ab-nr" value="${esc(v.bedrijf.huisnummer)}" inputmode="numeric" maxlength="5" style="width:80px"/></label>
            <label class="klein-lbl">${esc(this.t('toevoeging'))}<input class="veld smal" id="ab-toev" value="${esc(v.bedrijf.toevoeging)}" maxlength="6" style="width:70px"/></label></div>
          <p class="fam-sub">${esc(this.t('afvalBedrijfGemeenten', (a.afvalbedrijven[v.bedrijf.bedrijf] || {}).gemeenten || ''))}</p>`
        : v.modus === 'zelf' ? `<div class="afval">${Object.entries(soorten).map(([k, x]) => { const r = v.schema[k];
            return `<div class="arij"><label class="vink kort"><input type="checkbox" data-a="afval-soort" data-soort="${k}" ${r ? 'checked' : ''}/> <span class="aico">${x.icoon}</span> <b>${esc(x.naam)}</b></label>
              ${r ? `<label class="klein-lbl">${esc(this.t('volgendeKeer'))}<input class="veld smal" type="date" data-a="afval-start" data-soort="${k}" value="${esc(r.start || '')}"/></label>
                <label class="klein-lbl">${esc(this.t('elke'))}<select class="veld smal" data-a="afval-weken" data-soort="${k}">${wekenOpties(r.weken || 2)}</select></label>` : ''}</div>`; }).join('')}</div>`
        : v.modus === 'link' ? `<div class="rij"><input class="veld groei" id="afval-url" placeholder="https://… .ics" value="${esc(v.url)}"/></div>`
        : `<select class="veld" id="afval-agenda"><option value="">${esc(this.t('kies'))}</option>${beschikbaar.map((b) => `<option value="${esc(b.entity)}" ${v.agenda === b.entity ? 'selected' : ''}>${esc(b.naam)}</option>`).join('')}</select>`}
        <div class="rij" style="margin-top:14px"><label class="vink kort"><input type="checkbox" data-a="afval-herinnering" ${v.herinnering.aan ? 'checked' : ''}/> ${esc(this.t('herinneringAan'))} ${esc(this.t('om'))}</label>
          <input class="veld smal" type="time" data-a="afval-tijd" value="${esc(v.herinnering.tijd)}"/></div>
        <p class="fam-sub">${esc(this.t('naarWie'))}</p>
        <div class="wie">${s.leden.map((l) => `<button class="${v.herinnering.leden.includes(l.id) ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="afval-wie" data-id="${l.id}">${avatar(l, { grootte: 36 })}<small>${esc(l.naam)}</small></button>`).join('')}</div>
        <div class="rij eind"><button class="fam-knop" data-a="afval-bewaar" ${v.bezig ? 'disabled' : ''}>${esc(v.bezig ? this.t('bezigLink') : this.t('bewaren'))}</button></div></div>`;
  }

  _dlgAgenda(d) {
    const s = this._s, a = this._ag, l = s.leden.find((x) => x.id === d.voor);
    const al = d.voor === 'gezin' ? a.extra : ((a.leden.find((x) => x.id === d.voor) || {}).agendas || []);
    const vrij = a.beschikbaar.filter((b) => !al.includes(b.entity));
    return `<h2>${esc(this.t('agendaVan', l ? l.naam : this.t('hetGezin')))}</h2>
      <label class="lbl">${esc(this.t('bestaand'))}</label>
      <div class="rij"><select class="veld groei" id="agenda-kies"><option value="">${esc(this.t('kies'))}</option>${vrij.map((b) => `<option value="${esc(b.entity)}">${esc(b.naam)}</option>`).join('')}</select>
        <button class="fam-knop" data-a="agenda-kies">${esc(this.t('koppel'))}</button></div>
      <label class="lbl">${esc(this.t('ofLink'))}</label>
      <input class="veld" id="agenda-naam" placeholder="${esc(this.t('linkNaamVb'))}" value="${esc(d.naam || (l ? l.naam : ''))}" maxlength="60"/>
      <input class="veld" id="agenda-url" placeholder="https://… / webcal://…" value="${esc(d.url || '')}" style="margin-top:8px"/>
      <details class="uitleg"><summary>${esc(this.t('waarLink'))}</summary><ul><li>${esc(this.t('linkGoogle'))}</li><li>${esc(this.t('linkIcloud'))}</li><li>${esc(this.t('linkOutlook'))}</li></ul></details>
      ${d.fout ? `<div class="fam-chip fout">${esc(d.fout)}</div>` : ''}
      <div class="rij eind"><button class="fam-knop rand" data-a="sluit">${esc(this.t('annuleren'))}</button>
        <button class="fam-knop" data-a="agenda-link" ${d.bezig ? 'disabled' : ''}>${esc(d.bezig ? this.t('bezigLink') : this.t('linkToevoegen'))}</button></div>`;
  }

  async _agendaZet(voor, lijst) {
    if (voor === 'gezin') return this._doe('ha_family/agenda/extra', { agendas: lijst });
    return this._doe('ha_family/agenda/lid_agendas', { lid: voor, agendas: lijst });
  }
  _huidigeAgendas(voor) {
    const a = this._ag;
    return voor === 'gezin' ? [...a.extra] : [...((a.leden.find((x) => x.id === voor) || {}).agendas || [])];
  }

  async _agendaKlik(a, b) {
    const v = this._afv;
    if (a === 'tab') { this._tab = b.dataset.tab; this._ag = null; this._afv = null; this._kl = null; this._mu = null; this._teken(); return this._laad(); }
    if (a === 'agenda-koppel') return this._open({ soort: 'agenda', voor: b.dataset.voor });
    if (a === 'agenda-los') return this._agendaZet(b.dataset.voor, this._huidigeAgendas(b.dataset.voor).filter((x) => x !== b.dataset.entity));
    if (a === 'agenda-kies') {
      const e = this.shadowRoot.getElementById('agenda-kies').value; if (!e) return;
      if (await this._agendaZet(this._dlg.voor, [...this._huidigeAgendas(this._dlg.voor), e])) this._sluit();
      return;
    }
    if (a === 'agenda-link') {
      const d = this._dlg; d.naam = this.shadowRoot.getElementById('agenda-naam').value; d.url = this.shadowRoot.getElementById('agenda-url').value;
      d.bezig = true; d.fout = null; this._herteken();
      try {
        const r = await this._ws('ha_family/agenda/link', { naam: d.naam, url: d.url });
        await this._ws(d.voor === 'gezin' ? 'ha_family/agenda/extra' : 'ha_family/agenda/lid_agendas', d.voor === 'gezin' ? { agendas: [...this._huidigeAgendas('gezin'), r.entity] } : { lid: d.voor, agendas: [...this._huidigeAgendas(d.voor), r.entity] });
        this._sluit(); await this._laad();
      } catch (er) { d.fout = er.message; d.bezig = false; this._herteken(); }
      return;
    }
    if (a === 'jarig-weg') return this._doe('ha_family/agenda/verjaardag_weg', { verjaardag: b.dataset.id });
    if (a === 'jarig-toevoegen') {
      const naam = this.shadowRoot.getElementById('jarig-naam').value, datum = this.shadowRoot.getElementById('jarig-datum').value;
      const geenJaar = this.shadowRoot.getElementById('jarig-geenjaar').checked;
      if (!naam || !datum) return;
      return this._doe('ha_family/agenda/verjaardag', { naam, datum: geenJaar ? datum.slice(5) : datum });
    }
    if (a === 'afval-modus') { v.modus = b.dataset.v; return this._teken(); }
    if (a === 'afval-wie') { const id = b.dataset.id; v.herinnering.leden = v.herinnering.leden.includes(id) ? v.herinnering.leden.filter((x) => x !== id) : [...v.herinnering.leden, id]; return this._teken(); }
    if (a === 'afval-bewaar') {
      const data = { herinnering: v.herinnering };
      try {
        const q = (id) => this.shadowRoot.getElementById(id);
        if (v.modus === 'bedrijf') {
          v.bedrijf = { bedrijf: q('ab-bedrijf').value, postcode: q('ab-postcode').value, huisnummer: q('ab-nr').value, toevoeging: q('ab-toev').value };
          data.bedrijf = v.bedrijf; data.schema = []; data.agenda = ''; v.bezig = true; this._teken();
        } else data.bedrijf = null;
        if (v.modus === 'zelf') { data.schema = Object.values(v.schema); data.agenda = ''; }
        else if (v.modus === 'bestaand') { data.agenda = this.shadowRoot.getElementById('afval-agenda').value; data.schema = []; }
        else {
          v.url = this.shadowRoot.getElementById('afval-url').value; v.bezig = true; this._teken();
          data.agenda = (await this._ws('ha_family/agenda/link', { naam: taal(this._hass) === 'nl' ? 'Afvalkalender' : 'Waste calendar', url: v.url })).entity; data.schema = [];
        }
        const r = await this._ws('ha_family/agenda/afval', data);
        v.bezig = false; this._afv = null;
        this._melding(r && r.eerste ? this.t('afvalGevonden', `${r.dagen} · ${new Date(r.eerste.datum + 'T00:00:00').toLocaleDateString(this._hass.locale?.language, { weekday: 'long', day: 'numeric', month: 'long' })}: ${r.eerste.titel}`) : this.t('bewaard'));
        await this._laad();
      } catch (er) { v.bezig = false; this._melding(er.message); this._teken(); }
    }
  }

  async _agendaWijzig(e) {
    const a = e.target.dataset.a, v = this._afv;
    if (!a) return;
    if (a.startsWith('mu-inst')) return this._muurOpslaan();
    if (a === 'hu-zet') return this._doe('ha_family/kamer/apparaat', { entity: e.target.dataset.e, kamer: e.target.value || null }, this.t('huVerplaatst'));
    if (a === 'hu-vink') { const z = this._huSel; e.target.checked ? z.add(e.target.dataset.e) : z.delete(e.target.dataset.e); return this._teken(); }
    if (a === 'hu-allemaal') { this._hu.apparaten.filter((x) => x.kan && (x.kamer || '') === e.target.dataset.k).forEach((x) => (e.target.checked ? this._huSel.add(x.entity) : this._huSel.delete(x.entity))); return this._teken(); }
    if (a === 'kl-herinnering' || a === 'kl-tijd') {
      const r = this.shadowRoot;
      return this._doe('ha_family/klusjes/instellingen', { aan: r.querySelector('[data-a=kl-herinnering]').checked, tijd: r.querySelector('[data-a=kl-tijd]').value || '18:00' }, this.t('bewaard'));
    }
    if (a === 'kl-dlg-datum' && this._dlg) { this._dlg.datum = e.target.value; return; }
    if (a === 'geboorte') return this._doe('ha_family/lid/bijwerken', { lid: e.target.dataset.id, geboortedatum: e.target.value || null }, this.t('bewaard'));
    if (a === 'jarig-melding' || a === 'jarig-tijd') {
      const r = this.shadowRoot;
      return this._doe('ha_family/agenda/verjaardag_melding', { aan: r.querySelector('[data-a=jarig-melding]').checked, tijd: r.querySelector('[data-a=jarig-tijd]').value || '08:00' }, this.t('bewaard'));
    }
    if (!v) return;
    const k = e.target.dataset.soort;
    if (a === 'afval-soort') { if (e.target.checked) v.schema[k] = { soort: k, start: '', weken: 2 }; else delete v.schema[k]; return this._teken(); }
    if (a === 'afval-start') v.schema[k].start = e.target.value;
    if (a === 'afval-weken') v.schema[k].weken = Number(e.target.value);
    if (a === 'afval-herinnering') v.herinnering.aan = e.target.checked;
    if (a === 'afval-tijd') v.herinnering.tijd = e.target.value;
  }



  /* ── Muurscherm-tab ── */
  _muurTab() {
    const m = this._mu, h = this._hass;
    if (!m) return '<div class="kaart">…</div>';
    const adres = (this._s.adres.intern || this._s.adres.extern || location.origin) + '/gezin-muur';
    const stap = (n, titel, tekst, extra = '') => `<div class="stap"><span class="nr">${n}</span><div><b>${esc(titel)}</b><p class="fam-sub">${esc(tekst)}</p>${extra}</div></div>`;
    const kop = `<div class="kaart welkom" style="text-align:left;justify-items:start"><div class="groot">📺</div><h2>${esc(this.t('muTitel'))}</h2><p class="fam-sub">${esc(this.t('muUitleg'))}</p>
      <button class="fam-knop rand" data-a="mu-bekijk"><ha-icon icon="mdi:monitor-dashboard"></ha-icon>${esc(this.t('muBekijk'))}</button></div>`;
    if (!m.heeft_account) {
      return `${kop}<div class="kaart"><h2>${esc(this.t('muInstellen'))}</h2><p class="fam-sub">${esc(this.t('muAccountUitleg'))}</p>
        <div class="gegevens"><div><small>${esc(this.t('gebruikersnaam'))}</small><input class="veld" id="mu-gb" value="muur" autocapitalize="off"/></div>
          <div><small>${esc(this.t('wachtwoord'))}</small><input class="veld mono" id="mu-ww" value="${esc(this._muWw || '')}"/></div></div>
        <div class="rij eind"><button class="fam-knop" data-a="mu-maak"><ha-icon icon="mdi:tablet"></ha-icon>${esc(this.t('muInstellen'))}</button></div></div>`;
    }
    const b = m.blokken;
    return `${kop}
      <div class="kaart"><h2>📲 ${esc(this.t('muInstellen'))}</h2>
        ${stap(1, this.t('muStap1'), this.t('muStap1t'), `<div class="qrs"><span class="qr">${qrSvg(adres)}</span><b class="mono adres">${esc(adres)}</b></div>`)}
        ${stap(2, this.t('muStap2'), this.t('muStap2t'), `<div class="gegevens"><div><small>${esc(this.t('gebruikersnaam'))}</small><b class="mono">${esc(m.gebruikersnaam || '')}</b></div>
          <div><small>${esc(this.t('wachtwoord'))}</small>${this._muWwNieuw ? `<b class="mono">${esc(this._muWwNieuw)}</b>` : `<button class="fam-knop rand klein" data-a="mu-ww">${esc(this.t('nieuwWachtwoord'))}</button>`}</div></div>`)}
        ${stap(3, this.t('muStap3'), this.t('muStap3t'))}</div>
      <div class="kaart"><h2>⚙️ ${esc(this.t('muInst'))}</h2>
        <div class="rij"><label class="vink kort"><input type="checkbox" data-a="mu-inst-nacht" ${m.nacht.aan ? 'checked' : ''}/> ${esc(this.t('muNacht'))}</label></div>
        <div class="rij"><span class="fam-sub">${esc(this.t('muVan'))}</span><input class="veld smal" type="time" data-a="mu-inst-van" value="${esc(m.nacht.van)}"/>
          <span class="fam-sub">${esc(this.t('muTot'))}</span><input class="veld smal" type="time" data-a="mu-inst-tot" value="${esc(m.nacht.tot)}"/></div>
        <label class="lbl">${esc(this.t('muWeer'))}</label>
        <select class="veld" data-a="mu-inst-weer"><option value="">${esc(this.t('muWeerAuto'))}</option>${m.weerberichten.map((w) => `<option value="${esc(w.entity)}" ${m.weer === w.entity ? 'selected' : ''}>${esc(w.naam)}</option>`).join('')}</select>
        <label class="lbl">${esc(this.t('muBlokken'))}</label>
        <div class="rij">${Object.entries(this.t('muBlok')).map(([k, n]) => `<label class="vink kort"><input type="checkbox" data-a="mu-inst-blok" data-k="${k}" ${b[k] ? 'checked' : ''}/> ${esc(n)}</label>`).join('')}</div>
        <div class="rij"><label class="vink kort"><input type="checkbox" data-a="mu-inst-zijbalk" ${m.zijbalk_weg ? 'checked' : ''}/> ${esc(this.t('muZijbalk'))}</label></div>
        <hr/><div class="rij"><button class="fam-knop gevaar klein" data-a="mu-weg">${esc(this.t('muVerwijder'))}</button></div></div>`;
  }
  async _muurOpslaan() {
    const r = this.shadowRoot, q = (s) => r.querySelector(s);
    const blokken = {};
    r.querySelectorAll('[data-a=mu-inst-blok]').forEach((x) => { blokken[x.dataset.k] = x.checked; });
    try {
      this._mu = { ...this._mu, ...(await this._ws('ha_family/muur/bijwerken', { nacht: { aan: q('[data-a=mu-inst-nacht]').checked, van: q('[data-a=mu-inst-van]').value || '22:30', tot: q('[data-a=mu-inst-tot]').value || '06:30' },
        weer: q('[data-a=mu-inst-weer]').value || null, blokken, zijbalk_weg: q('[data-a=mu-inst-zijbalk]').checked })) };
      this._melding(this.t('bewaard'));
    } catch (e) { this._melding(e.message); }
  }
  /* ── 🏠 Huis: kamers en apparaten ── */
  _huisTab() {
    const h = this._hu;
    if (!h) return '<div class="kaart">…</div>';
    const sel = this._huSel || (this._huSel = new Set()), filter = this._huFilter || null;
    const nu = this._huNieuw || (this._huNieuw = { naam: '', icoon: 'mdi:sofa' });
    const aantal = (k) => h.apparaten.filter((a) => a.kamer === k).length;
    const iconen = (gekozen, act) => `<div class="hu-iconen">${h.iconen.map((i) => `<button class="${gekozen === i ? 'aan' : ''}" data-a="${act}" data-i="${i}" title="${esc(i.slice(4))}"><ha-icon icon="${i}"></ha-icon></button>`).join('')}</div>`;
    const kamerRij = (k) => {
      if (this._huBewerk === k.kamer) {
        const b = this._huB;
        return `<div class="hu-kamer bewerk"><input class="veld" id="hu-b-naam" value="${esc(b.naam)}" maxlength="50"/>${iconen(b.icoon, 'hu-b-icoon')}
          <div class="rij"><span class="fam-sub">${esc(this.t('huSamen'))}</span><select class="veld smal" id="hu-samen"><option value="">—</option>${h.kamers.filter((x) => x.kamer !== k.kamer).map((x) => `<option value="${x.kamer}">${esc(x.naam)}</option>`).join('')}</select>
            <button class="fam-knop rand klein" data-a="hu-samen">${esc(this.t('huSamenKnop'))}</button></div>
          <div class="rij eind"><button class="fam-knop rand klein" data-a="hu-annuleer">${esc(this.t('annuleren'))}</button><button class="fam-knop klein" data-a="hu-opslaan">${esc(this.t('opslaan'))}</button></div></div>`;
      }
      return `<div class="hu-kamer ${k.verborgen ? 'uit' : ''}"><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon><b class="groei">${esc(k.naam)}</b>
        <span class="fam-sub">${aantal(k.kamer)} ${esc(this.t(aantal(k.kamer) === 1 ? 'huApp1' : 'huApp'))}</span>
        <button class="hu-x" data-a="hu-verberg" data-k="${k.kamer}" title="${esc(k.verborgen ? this.t('huTonen') : this.t('huVerbergen'))}"><ha-icon icon="${k.verborgen ? 'mdi:eye-off' : 'mdi:eye'}"></ha-icon></button>
        <button class="hu-x" data-a="hu-bewerk" data-k="${k.kamer}"><ha-icon icon="mdi:pencil"></ha-icon></button>
        <button class="hu-x" data-a="hu-weg" data-k="${k.kamer}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`;
    };
    const bestaand = new Set(h.kamers.map((k) => k.naam.toLowerCase()));
    const snel = this.t('huVoorbeelden').filter((n) => !bestaand.has(n.toLowerCase()));
    const opties = (k) => `<option value="">${esc(this.t('huGeenKamer'))}</option>${h.kamers.map((x) => `<option value="${x.kamer}" ${x.kamer === k ? 'selected' : ''}>${esc(x.naam)}</option>`).join('')}`;
    const DICO = { light: 'mdi:lightbulb', climate: 'mdi:air-conditioner', fan: 'mdi:fan', cover: 'mdi:window-shutter', switch: 'mdi:power-socket-eu', media_player: 'mdi:speaker' };
    const zicht = h.apparaten.filter((a) => !filter || a.domein === filter);
    const groep = (k, titel, ico) => {
      const alles = zicht.filter((a) => (a.kamer || '') === k), lijst = alles.filter((a) => a.kan), los = alles.filter((a) => !a.kan);
      if (!alles.length) return '';
      const kunnen = lijst.filter((a) => a.kan), alle = kunnen.length && kunnen.every((a) => sel.has(a.entity));
      return `<div class="hu-groep ${k ? '' : 'zonder'}"><h3><label class="vink kort"><input type="checkbox" data-a="hu-allemaal" data-k="${k}" ${alle ? 'checked' : ''}/></label>
          <ha-icon icon="${ico}"></ha-icon> ${esc(titel)} <span class="fam-sub">${alles.length}</span></h3>
        ${[...lijst, ...los].map((a, i) => `${i === lijst.length && los.length ? `<details class="hu-los"><summary class="fam-sub">${los.length} ${esc(this.t('huLos'))}</summary>` : ''}<div class="hu-app ${a.tonen ? '' : 'uit'}"><input type="checkbox" data-a="hu-vink" data-e="${esc(a.entity)}" ${sel.has(a.entity) ? 'checked' : ''} ${a.kan ? '' : 'disabled'}/>
          <ha-icon icon="${DICO[a.domein]}" class="${(this._hass.states[a.entity] || {}).state === 'on' ? 'aan' : ''}"></ha-icon>
          <span class="groei">${esc(a.naam)}${a.via_apparaat ? ` <small class="fam-sub">· ${esc(this.t('huVia'))}</small>` : ''}${a.bijzaak ? ` <small class="fam-sub">· ${esc(this.t('huBijzaak'))}</small>` : ''}${['unavailable', 'unknown'].includes((this._hass.states[a.entity] || {}).state) ? ` <small class="fam-sub">· ${esc(this.t('huOffline'))}</small>` : ''}</span>
          <button class="hu-x" data-a="hu-tonen" data-e="${esc(a.entity)}" data-t="${a.tonen ? '' : '1'}" title="${esc(a.tonen ? this.t('huVerbergen') : this.t('huTonen'))}"><ha-icon icon="${a.tonen ? 'mdi:eye' : 'mdi:eye-off'}"></ha-icon></button>
          <select class="veld smal" data-a="hu-zet" data-e="${esc(a.entity)}" ${a.kan ? '' : 'disabled'}>${opties(a.kamer)}</select></div>`).join('')}${los.length ? '</details>' : ''}</div>`;
    };
    const domeinen = [...new Set(h.apparaten.map((a) => a.domein))];
    return `<div class="kaart"><h2>🏠 ${esc(this.t('huKamers'))}</h2><p class="fam-sub">${esc(this.t('huUitleg'))}</p>
        ${h.kamers.length ? h.kamers.map(kamerRij).join('') : `<p>${esc(this.t('huLeeg'))}</p>`}
        <hr/><b>${esc(this.t('huNieuw'))}</b>
        <div class="rij" style="margin-top:8px"><input class="veld groei" id="hu-naam" placeholder="${esc(this.t('huNaam'))}" value="${esc(nu.naam)}" maxlength="50"/>
          <button class="fam-knop" data-a="hu-maak">+ ${esc(this.t('huToevoegen'))}</button></div>
        ${iconen(nu.icoon, 'hu-icoon')}
        ${snel.length ? `<div class="vb" style="margin-top:10px"><span class="fam-sub">${esc(this.t('huSnel'))}:</span>${snel.map((n) => `<button class="fam-chip vbk" data-a="hu-snel" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''}</div>
      <div class="kaart"><h2>💡 ${esc(this.t('huApparaten'))}</h2><p class="fam-sub">${esc(this.t('huApparatenUitleg'))}</p>
        ${h.apparaten.length ? `<div class="vb"><button class="fam-chip vbk ${filter ? '' : 'aan'}" data-a="hu-filter" data-d="">${esc(this.t('huAlles'))}</button>
          ${domeinen.map((d) => `<button class="fam-chip vbk ${filter === d ? 'aan' : ''}" data-a="hu-filter" data-d="${d}">${esc(this.t('huDomein')[d] || d)}</button>`).join('')}</div>
        ${sel.size ? `<div class="hu-balk"><b>${sel.size} ${esc(this.t('huGekozen'))}</b><span>${esc(this.t('huZetIn'))}</span>
          <select class="veld smal" id="hu-bulk">${opties(null)}</select><button class="fam-knop klein" data-a="hu-bulk">OK</button><button class="hu-x" data-a="hu-wis"><ha-icon icon="mdi:close"></ha-icon></button></div>` : ''}
        ${groep('', this.t('huZonder'), 'mdi:help-circle-outline')}${h.kamers.map((k) => groep(k.kamer, k.naam, k.icoon || 'mdi:home')).join('')}` : `<p>${esc(this.t('huGeen'))}</p>`}</div>`;
  }
  async _huisKlik(a, b) {
    const h = this._hu, q = (id) => this.shadowRoot.getElementById(id);
    if (a === 'hu-icoon') { this._huNieuw = { naam: q('hu-naam').value, icoon: b.dataset.i }; return this._teken(); }
    if (a === 'hu-snel') { if (await this._doe('ha_family/kamer', { naam: b.dataset.n, icoon: ICOON_VOOR[b.dataset.n] || 'mdi:home' })) this._melding(`🏠 ${b.dataset.n}`); return; }
    if (a === 'hu-maak') {
      const naam = q('hu-naam').value.trim(); if (!naam) return q('hu-naam').focus();
      if (await this._doe('ha_family/kamer', { naam, icoon: this._huNieuw.icoon })) { this._huNieuw = null; this._teken(); }
      return;
    }
    if (a === 'hu-bewerk') { const k = h.kamers.find((x) => x.kamer === b.dataset.k); this._huBewerk = k.kamer; this._huB = { naam: k.naam, icoon: k.icoon || 'mdi:home' }; return this._teken(); }
    if (a === 'hu-b-icoon') { this._huB = { naam: q('hu-b-naam').value, icoon: b.dataset.i }; return this._teken(); }
    if (a === 'hu-samen') {
      const naar = q('hu-samen').value, van = h.kamers.find((x) => x.kamer === this._huBewerk), doel = h.kamers.find((x) => x.kamer === naar);
      if (!naar || !confirm(this.t('huSamenZeker').replace('{x}', van.naam).replace('{y}', doel.naam))) return;
      if (await this._doe('ha_family/kamer/samenvoegen', { van: van.kamer, naar }, `${van.naam} → ${doel.naam}`)) { this._huBewerk = null; this._teken(); }
      return;
    }
    if (a === 'hu-annuleer') { this._huBewerk = null; return this._teken(); }
    if (a === 'hu-opslaan') {
      if (await this._doe('ha_family/kamer', { kamer: this._huBewerk, naam: q('hu-b-naam').value, icoon: this._huB.icoon }, this.t('bewaard'))) { this._huBewerk = null; this._teken(); }
      return;
    }
    if (a === 'hu-weg') {
      const k = h.kamers.find((x) => x.kamer === b.dataset.k);
      if (confirm(this.t('huZeker').replace('{x}', k.naam))) await this._doe('ha_family/kamer/weg', { kamer: k.kamer });
      return;
    }
    if (a === 'hu-verberg') {
      const v = h.kamers.filter((x) => x.verborgen).map((x) => x.kamer), k = b.dataset.k;
      return this._doe('ha_family/huis/instellingen', { verborgen: v.includes(k) ? v.filter((x) => x !== k) : [...v, k] });
    }
    if (a === 'hu-tonen') return this._doe('ha_family/apparaat/tonen', { entity: b.dataset.e, tonen: !!b.dataset.t });
    if (a === 'hu-filter') { this._huFilter = b.dataset.d || null; return this._teken(); }
    if (a === 'hu-wis') { this._huSel.clear(); return this._teken(); }
    if (a === 'hu-bulk') {
      const kamer = q('hu-bulk').value || null, lijst = [...this._huSel];
      try { for (const entity of lijst) await this._ws('ha_family/kamer/apparaat', { entity, kamer }); this._melding(`${this.t('huVerplaatst')}: ${lijst.length}`); }
      catch (e) { this._melding(e.message); }
      this._huSel.clear(); await this._laad();
    }
  }

  async _muurKlik(a, b) {
    if (a === 'mu-bekijk') { history.pushState(null, '', '/gezin-muur'); window.dispatchEvent(new CustomEvent('location-changed')); return; }
    if (a === 'mu-maak') {
      const gb = this.shadowRoot.getElementById('mu-gb').value, ww = this.shadowRoot.getElementById('mu-ww').value;
      try { await this._ws('ha_family/muur/aanmaken', { gebruikersnaam: gb, wachtwoord: ww }); this._muWwNieuw = ww; await this._laad(); }
      catch (e) { this._melding(e.message); }
      return;
    }
    if (a === 'mu-ww') {
      const ww = (await this._ws('ha_family/voorstel')).wachtwoord;
      const nieuw = prompt(this.t('nieuwWachtwoord'), ww); if (!nieuw) return;
      if (await this._doe('ha_family/muur/wachtwoord', { wachtwoord: nieuw }, this.t('wwGewijzigd'))) { this._muWwNieuw = nieuw; this._teken(); }
      return;
    }
    if (a === 'mu-weg') { if (confirm(this.t('muZeker'))) { this._muWwNieuw = null; await this._doe('ha_family/muur/verwijderen', {}); } }
  }

  /* ── Klusjes-tab ── */
  _wanneerTekst(k) {
    const d = this.t('dagenKort');
    if (!k.dagen.length) return k.datum ? new Date(k.datum + 'T00:00:00').toLocaleDateString(this._hass.locale?.language, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    if (k.dagen.length === 7) return this.t('klElkeDag');
    if (k.dagen.join() === '0,1,2,3,4') return this.t('klWerkdagen');
    if (k.dagen.join() === '5,6') return this.t('klWeekend');
    return k.dagen.map((i) => d[i]).join(', ');
  }
  _klusjesTab() {
    const k = this._kl, s = this._s, h = this._hass;
    if (!k) return '<div class="kaart">…</div>';
    const lmap = Object.fromEntries(s.leden.map((l) => [l.id, l]));
    const avs = (ids) => ids.filter((i) => lmap[i]).map((i) => avatar(lmap[i], { grootte: 26 })).join('');
    const bestaand = new Set(k.klusjes.map((x) => x.titel.toLowerCase()));
    const geschiedenis = (k.geschiedenis || []).filter((p) => lmap[p.lid]).slice(0, 8);
    return `
      <div class="kaart"><div class="kop2"><h2>⭐ ${esc(this.t('klKlusjes'))}</h2><button class="fam-knop" data-a="kl-nieuw"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('klNieuw'))}</button></div>
        <p class="fam-sub">${esc(this.t('klUitleg'))}</p>
        ${k.klusjes.length ? k.klusjes.map((x) => `<div class="arij"><span class="kl-em">${esc(x.emoji)}</span><span class="anaam groei"><b>${esc(x.titel)}</b><br/>
            <span class="fam-sub">${x.punten ? `+${x.punten} ⭐ · ` : ''}${esc(this._wanneerTekst(x))}${x.goedkeuren ? ' · ✋' : ''}${x.actief === false ? ` · ${esc(this.t('klUit'))}` : ''}</span></span>
            <span class="avs">${avs(x.wie)}</span>
            <button class="fam-knop rand klein" data-a="kl-bewerk" data-k="${x.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>
            <button class="fam-knop gevaar klein" data-a="kl-weg" data-k="${x.id}" data-t="${esc(x.titel)}">✕</button></div>`).join('')
          : `<p>${esc(this.t('klGeen'))}</p>`}
        <h3>${esc(this.t('klVoorbeelden'))}</h3>
        <div class="vb">${k.voorbeelden.filter((v) => !bestaand.has(v.titel.toLowerCase())).map((v) => `<button class="fam-chip vbk" data-a="kl-voorbeeld" data-e="${esc(v.emoji)}" data-t="${esc(v.titel)}" data-p="${v.punten}">${esc(v.emoji)} ${esc(v.titel)} · ${v.punten} ⭐</button>`).join('')}</div>
        ${this._s.leden.some((l) => l.rol === 'kind') ? `<h3>✨ ${esc(this.t('klAi'))}</h3><div class="vb">${this._s.leden.filter((l) => l.rol === 'kind').map((l) =>
          `<button class="fam-chip vbk ${this._klAi && this._klAi.lid === l.id ? 'aan' : ''}" data-a="kl-ai" data-id="${l.id}">${esc(this._klAi && this._klAi.lid === l.id && this._klAi.bezig ? '…' : l.emoji + ' ' + l.naam.split(' ')[0])}</button>`).join('')}</div>
          ${this._klAi && this._klAi.ideeen ? `<p class="fam-sub" style="margin:6px 0">${esc(this.t(this._klAi.bron === 'ai' ? 'klAiMet' : 'klAiZonder'))}</p><div class="vb">${this._klAi.ideeen.map((v) =>
            `<button class="fam-chip vbk" data-a="kl-voorbeeld" data-e="${esc(v.emoji)}" data-t="${esc(v.titel)}" data-p="${v.punten}">${esc(v.emoji)} ${esc(v.titel)} · ${v.punten} ⭐</button>`).join('')}</div>` : ''}` : ''}</div>

      <div class="kaart"><h2>🎁 ${esc(this.t('blBeloningen'))}</h2><p class="fam-sub">${esc(this.t('blUitleg'))}</p>
        ${k.beloningen.map((b) => `<div class="arij"><span class="kl-em">${esc(b.emoji)}</span><b class="anaam groei">${esc(b.titel)}</b><span class="fam-chip">${b.punten} ⭐</span>
          <button class="fam-knop gevaar klein" data-a="kl-bl-weg" data-b="${b.id}">✕</button></div>`).join('')}
        <div class="rij"><input class="veld smal" id="bl-emoji" value="🎁" maxlength="4" style="width:64px;text-align:center"/><input class="veld groei" id="bl-titel" placeholder="${esc(this.t('blTitelVb'))}" maxlength="80"/>
          <input class="veld smal" id="bl-punten" type="number" min="1" max="10000" value="20" style="width:90px"/><span class="fam-sub">${esc(this.t('blPunten'))}</span>
          <button class="fam-knop" data-a="kl-bl-toevoegen"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('toevoegenKort'))}</button></div>
        ${`<div class="vb" style="margin-top:10px">${this.t('blVb').filter(([, t]) => !k.beloningen.some((x) => x.titel.toLowerCase() === t.toLowerCase())).map(([e, t, p]) => `<button class="fam-chip vbk" data-a="kl-bl-vb" data-e="${e}" data-t="${esc(t)}" data-p="${p}">${e} ${esc(t)} · ${p} ⭐</button>`).join('')}</div>`}</div>

      <div class="kaart"><h2>💯 ${esc(this.t('ptPunten'))}</h2><p class="fam-sub">${esc(this.t('ptUitleg'))}</p>
        ${s.leden.map((l) => `<div class="arij">${avatar(l, { grootte: 40 })}<b class="anaam groei">${esc(l.naam)}</b><span class="fam-chip">⭐ ${(k.leden[l.id] || {}).saldo || 0}</span>
          ${[1, 5, -1].map((n) => `<button class="fam-knop ${n > 0 ? 'zacht' : 'rand'} klein" data-a="kl-pt" data-l="${l.id}" data-n="${n}">${n > 0 ? '+' : '−'}${Math.abs(n)}</button>`).join('')}
          <button class="fam-knop rand klein" data-a="kl-pt-anders" data-l="${l.id}">${esc(this.t('ptAnders'))}</button></div>`).join('')}
        ${geschiedenis.length ? `<h3>${esc(this.t('ptRecent'))}</h3>${geschiedenis.map((p) => `<div class="arij">${avatar(lmap[p.lid], { grootte: 26 })}<span class="groei">${esc(p.reden)}</span>
          <span class="fam-sub">${new Date(p.tijd * 1000).toLocaleString(h.locale?.language, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          <b style="color:${p.punten > 0 ? 'var(--success-color,#2e7d32)' : 'var(--error-color)'}">${p.punten > 0 ? '+' : ''}${p.punten}${p.status === 'wacht' ? ' ⏳' : ''}</b></div>`).join('')}` : ''}</div>

      <div class="kaart"><h2>⏰ ${esc(this.t('hrHerinnering'))}</h2><p class="fam-sub">${esc(this.t('hrUitleg'))}</p>
        <div class="rij"><label class="vink kort"><input type="checkbox" data-a="kl-herinnering" ${k.instellingen.herinnering.aan ? 'checked' : ''}/> ${esc(this.t('hrAan'))}</label>
          <input class="veld smal" type="time" data-a="kl-tijd" value="${esc(k.instellingen.herinnering.tijd)}"/></div></div>`;
  }

  _dlgKlusje(d) {
    const s = this._s, dagen = this.t('dagenKort');
    const EM = ['⭐', '🍽️', '🧽', '🍴', '🧸', '🛏️', '🦷', '📚', '🐕', '🐈', '🌱', '🗑️', '👕', '🧹', '🚿', '🛒', '🎒', '🚲', '🎹', '🏃'];
    const preset = (n, lijst) => `<button class="keuze klein-k ${!d.eenmalig && d.dagen.join() === lijst.join() ? 'aan' : ''}" data-a="kl-dlg-dagen" data-v="${lijst.join()}">${esc(n)}</button>`;
    return `<h2>${esc(d.klusje ? this.t('klBewerk') : this.t('klMaak'))}</h2>
      <div class="voorbeeld"><span class="kl-groot">${esc(d.emoji)}</span></div>
      <div class="emoji">${EM.map((e) => `<button class="${d.emoji === e ? 'aan' : ''}" data-a="kl-dlg-emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <label class="lbl">${esc(this.t('klWat'))}</label><input class="veld" id="kl-titel" value="${esc(d.titel)}" maxlength="80"/>
      <label class="lbl">${esc(this.t('klPunten'))}</label>
      <div class="rij"><button class="fam-knop rand klein" data-a="kl-dlg-pt" data-n="-1">−</button><b class="ptn">${d.punten} ⭐</b><button class="fam-knop rand klein" data-a="kl-dlg-pt" data-n="1">+</button></div>
      <label class="lbl">${esc(this.t('klWie'))}</label>
      <div class="wie">${s.leden.map((l) => `<button class="${d.wie.includes(l.id) ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="kl-dlg-wie" data-l="${l.id}">${avatar(l, { grootte: 40 })}<small>${esc(l.naam)}</small></button>`).join('')}</div>
      <label class="lbl">${esc(this.t('klWanneer'))}</label>
      <div class="keuzes vier">${preset(this.t('klElkeDag'), [0, 1, 2, 3, 4, 5, 6])}${preset(this.t('klWerkdagen'), [0, 1, 2, 3, 4])}${preset(this.t('klWeekend'), [5, 6])}
        <button class="keuze klein-k ${d.eenmalig ? 'aan' : ''}" data-a="kl-dlg-eenmalig">${esc(this.t('klEenKeer'))}</button></div>
      ${d.eenmalig ? `<input class="veld" type="date" data-a="kl-dlg-datum" value="${esc(d.datum || '')}" style="margin-top:8px"/>`
        : `<div class="dagen">${dagen.map((n, i) => `<button class="${d.dagen.includes(i) ? 'aan' : ''}" data-a="kl-dlg-dag" data-v="${i}">${esc(n)}</button>`).join('')}</div>`}
      <label class="vink"><input type="checkbox" id="kl-goedkeuren" ${d.goedkeuren ? 'checked' : ''}/> <span><b>${esc(this.t('klGoedkeuren'))}</b><br/><small class="fam-sub">${esc(this.t('klGoedkeurenUitleg'))}</small></span></label>
      ${d.fout ? `<div class="fam-chip fout">${esc(d.fout)}</div>` : ''}
      <div class="rij eind"><button class="fam-knop rand" data-a="sluit">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="kl-dlg-opslaan">${esc(this.t('opslaan'))}</button></div>`;
  }

  _klDlgLees() {
    const d = this._dlg, r = this.shadowRoot;
    if (!d || d.soort !== 'klusje') return;
    if (r.getElementById('kl-titel')) d.titel = r.getElementById('kl-titel').value;
    if (r.getElementById('kl-goedkeuren')) d.goedkeuren = r.getElementById('kl-goedkeuren').checked;
  }

  async _klusjesKlik(a, b) {
    const k = this._kl, d = this._dlg;
    const kinderen = this._s.leden.filter((l) => l.rol === 'kind').map((l) => l.id);
    const nieuw = (extra = {}) => this._open({ soort: 'klusje', emoji: '⭐', titel: '', punten: 2, wie: kinderen.length ? kinderen : this._s.leden.map((l) => l.id),
      dagen: [0, 1, 2, 3, 4, 5, 6], eenmalig: false, datum: '', goedkeuren: false, ...extra });
    if (a === 'kl-nieuw') return nieuw();
    if (a === 'kl-ai') {
      this._klAi = { lid: b.dataset.id, bezig: true }; this._teken();
      try { this._klAi = { lid: b.dataset.id, ...(await this._ws('ha_family/klusjes/ai', { lid: b.dataset.id })) }; } catch (er) { this._klAi = null; this._melding(er.message); }
      return this._teken();
    }
    if (a === 'kl-voorbeeld') return nieuw({ emoji: b.dataset.e, titel: b.dataset.t, punten: Number(b.dataset.p) });
    if (a === 'kl-bewerk') {
      const x = k.klusjes.find((y) => y.id === b.dataset.k);
      return this._open({ soort: 'klusje', klusje: x.id, emoji: x.emoji, titel: x.titel, punten: x.punten, wie: [...x.wie], dagen: [...x.dagen],
        eenmalig: !x.dagen.length, datum: x.datum || '', goedkeuren: x.goedkeuren });
    }
    if (a === 'kl-weg') { if (confirm(this.t('klZeker', b.dataset.t))) await this._doe('ha_family/klusje/weg', { klusje: b.dataset.k }); return; }
    if (a.startsWith('kl-dlg-') && d) {
      this._klDlgLees();
      if (a === 'kl-dlg-emoji') d.emoji = b.dataset.v;
      if (a === 'kl-dlg-pt') d.punten = Math.max(0, Math.min(1000, d.punten + Number(b.dataset.n)));
      if (a === 'kl-dlg-wie') { const id = b.dataset.l; d.wie = d.wie.includes(id) ? d.wie.filter((x) => x !== id) : [...d.wie, id]; }
      if (a === 'kl-dlg-dagen') { d.eenmalig = false; d.dagen = b.dataset.v.split(',').map(Number); }
      if (a === 'kl-dlg-dag') { const i = Number(b.dataset.v); d.dagen = d.dagen.includes(i) ? d.dagen.filter((x) => x !== i) : [...d.dagen, i].sort(); }
      if (a === 'kl-dlg-eenmalig') d.eenmalig = true;
      if (a === 'kl-dlg-opslaan') {
        try {
          await this._ws('ha_family/klusje', { ...(d.klusje ? { klusje: d.klusje } : {}), titel: d.titel, emoji: d.emoji, punten: d.punten, wie: d.wie,
            dagen: d.eenmalig ? [] : d.dagen, datum: d.eenmalig ? d.datum : null, goedkeuren: d.goedkeuren });
          this._sluit(); await this._laad(); return;
        } catch (er) { d.fout = er.message; }
      }
      return this._herteken();
    }
    if (a === 'kl-bl-toevoegen' || a === 'kl-bl-vb') {
      const r = this.shadowRoot;
      const data = a === 'kl-bl-vb' ? { emoji: b.dataset.e, titel: b.dataset.t, punten: Number(b.dataset.p) }
        : { emoji: r.getElementById('bl-emoji').value || '🎁', titel: r.getElementById('bl-titel').value, punten: Number(r.getElementById('bl-punten').value) };
      return this._doe('ha_family/beloning', data);
    }
    if (a === 'kl-bl-weg') return this._doe('ha_family/beloning/weg', { beloning: b.dataset.b });
    if (a === 'kl-pt') return this._doe('ha_family/punten', { lid: b.dataset.l, punten: Number(b.dataset.n), reden: '' }, '⭐');
    if (a === 'kl-pt-anders') {
      const n = Number(prompt(this.t('ptHoeveel'), '10')); if (!n) return;
      const reden = prompt(this.t('ptReden'), '') || '';
      return this._doe('ha_family/punten', { lid: b.dataset.l, punten: n, reden }, '⭐');
    }
  }

  /* ── Dialogen ── */
  _open(dlg) { this._dlg = dlg; this._forms = []; this._tekenDlg(); this._snelheid(); }
  _sluit() { this._dlg = null; this.shadowRoot.querySelector('.dlg-plek').innerHTML = ''; this._forms = []; this._snelheid(); }
  _snelheid() {
    clearInterval(this._snel);
    if (this._dlg && this._dlg.soort === 'koppel') this._snel = setInterval(() => this._laad(), 3000);
  }
  _tekenDlg() {
    const d = this._dlg, plek = this.shadowRoot.querySelector('.dlg-plek');
    if (!d) return;
    // velden waarin iemand typt niet weggooien: alleen de koppel-dialoog ververst vanzelf
    if (d.soort !== 'koppel' && plek.innerHTML && !d.opnieuw) return;
    d.opnieuw = false;
    const inhoud = d.soort === 'nieuw' ? this._dlgNieuw(d) : d.soort === 'koppel' ? this._dlgKoppel(d) : d.soort === 'agenda' ? this._dlgAgenda(d)
      : d.soort === 'klusje' ? this._dlgKlusje(d) : this._dlgBewerk(d);
    plek.innerHTML = `<div class="achter" data-a="sluit-achter"><div class="dlg" role="dialog">${inhoud}</div></div>`;
    if (d.soort === 'bewerk') this._lampForm(d);
  }
  _herteken() { if (this._dlg) { this._dlg.opnieuw = true; this._tekenDlg(); } }

  _kiezers(d) {
    return `<label class="lbl">${esc(this.t('emoji'))}</label><div class="emoji">${EMOJI.map((e) => `<button class="${d.emoji === e ? 'aan' : ''}" data-a="emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <label class="lbl">${esc(this.t('kleur'))}</label><div class="kleuren">${KLEUREN.map((k) => `<button class="${d.kleur === k ? 'aan' : ''}" style="--k:${k}" data-a="kleur" data-v="${k}"></button>`).join('')}</div>`;
  }
  _rollen(d) {
    const lijst = this._s.type === 'huishouden' ? ['huisgenoot', 'gast'] : ['ouder', 'kind', 'gast'];
    const icoon = { ouder: '🧑', kind: '🧒', huisgenoot: '🏠', gast: '👋' };
    return `<div class="keuzes">${lijst.map((r) => `<button class="keuze ${d.rol === r ? 'aan' : ''}" data-a="rol" data-v="${r}"><span class="ki">${icoon[r]}</span><b>${esc(this.t('rollen')[r])}</b><small>${esc(this.t('rolUitleg')[r])}</small></button>`).join('')}</div>`;
  }

  _dlgNieuw(d) {
    const voorbeeld = { naam: d.naam || '?', emoji: d.emoji, kleur: d.kleur };
    if (d.stap === 1) {
      return `<h2>${esc(this.t('toevoegen'))}</h2>
        <div class="voorbeeld">${avatar(voorbeeld, { grootte: 72 })}</div>
        <label class="lbl">${esc(this.t('naam'))}</label><input class="veld" id="naam" value="${esc(d.naam)}" placeholder="${esc(this.t('naamVb'))}" maxlength="40" autofocus/>
        <label class="lbl">${esc(this.t('welkeRol'))}</label>${this._rollen(d)}${this._kiezers(d)}
        ${d.fout ? `<div class="fam-chip fout">${esc(d.fout)}</div>` : ''}
        <div class="rij eind"><button class="fam-knop rand" data-a="sluit">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="nieuw-volgende" ${d.naam && d.rol ? '' : 'disabled'}>${esc(this.t('volgende'))}</button></div>`;
    }
    if (d.stap === 2) {
      return `<h2>${esc(this.t('telefoonVraag', d.naam))}</h2>
        <div class="keuzes twee">
          <button class="keuze ${d.inloggen ? 'aan' : ''}" data-a="inloggen" data-v="1"><span class="ki">📱</span><b>${esc(this.t('jaAccount'))}</b><small>${esc(this.t('jaUitleg'))}</small></button>
          <button class="keuze ${d.inloggen === false ? 'aan' : ''}" data-a="inloggen" data-v="0"><span class="ki">🧸</span><b>${esc(this.t('neeAccount'))}</b><small>${esc(this.t('neeUitleg'))}</small></button></div>
        ${d.inloggen ? `<label class="lbl">${esc(this.t('gebruikersnaam'))}</label><input class="veld" id="gebruikersnaam" value="${esc(d.gebruikersnaam)}" autocapitalize="off" maxlength="30"/>
          <label class="lbl">${esc(this.t('wachtwoord'))}</label><div class="rij"><input class="veld groei mono" id="wachtwoord" value="${esc(d.wachtwoord)}" maxlength="64"/>
            <button class="fam-knop rand klein" data-a="nieuw-ww"><ha-icon icon="mdi:refresh"></ha-icon>${esc(this.t('nieuwWw'))}</button></div>
          <label class="vink"><input type="checkbox" id="beheerder" ${d.beheerder ? 'checked' : ''}/> <span><b>${esc(this.t('beheerder'))}</b><br/><small class="fam-sub">${esc(this.t('beheerderUitleg'))}</small></span></label>` : ''}
        ${d.fout ? `<div class="fam-chip fout">${esc(d.fout)}</div>` : ''}
        <div class="rij eind"><button class="fam-knop rand" data-a="nieuw-terug">${esc(this.t('terug'))}</button>
          <button class="fam-knop" data-a="nieuw-maak" ${d.inloggen === undefined || d.bezig ? 'disabled' : ''}>${esc(this.t('toevoegen'))}</button></div>`;
    }
    return `<div class="voorbeeld">${avatar(voorbeeld, { grootte: 96 })}</div><h2 class="midden">${esc(this.t('toegevoegd', d.naam))}</h2>
      ${d.inloggen ? `<p class="fam-sub midden">${esc(this.t('bewaar'))}</p><div class="gegevens"><div><small>${esc(this.t('gebruikersnaam'))}</small><b class="mono">${esc(d.gebruikersnaam)}</b></div>
        <div><small>${esc(this.t('wachtwoord'))}</small><b class="mono">${esc(d.wachtwoord)}</b></div></div>` : ''}
      <div class="rij eind"><button class="fam-knop rand" data-a="sluit">${esc(d.inloggen ? this.t('later') : this.t('klaar'))}</button>
        ${d.inloggen ? `<button class="fam-knop" data-a="koppel" data-id="${d.id}"><ha-icon icon="mdi:qrcode"></ha-icon>${esc(this.t('nuKoppelen'))}</button>` : ''}</div>`;
  }

  _dlgKoppel(d) {
    const l = this._s.leden.find((x) => x.id === d.id);
    if (!l) return '';
    if (!l.kan_inloggen) return `<h2>${esc(this.t('koppelenVan', l.naam))}</h2><p>${esc(this.t('geenAccount', l.naam))}</p><div class="rij eind"><button class="fam-knop" data-a="sluit">${esc(this.t('klaar'))}</button></div>`;
    const adres = this._s.adres.extern || this._s.adres.intern || location.origin;
    const tel = l.telefoons[0];
    const stap = (n, titel, tekst, extra = '') => `<div class="stap"><span class="nr">${n}</span><div><b>${esc(titel)}</b><p class="fam-sub">${esc(tekst)}</p>${extra}</div></div>`;
    return `<h2>${esc(this.t('koppelenVan', l.naam))}</h2>
      ${stap(1, this.t('stap1'), this.t('stap1t'), `<div class="qrs"><a href="${APP_IOS}" target="_blank" rel="noopener"><span class="qr">${qrSvg(APP_IOS)}</span><small>iPhone</small></a>
        <a href="${APP_ANDROID}" target="_blank" rel="noopener"><span class="qr">${qrSvg(APP_ANDROID)}</span><small>Android</small></a></div>`)}
      ${stap(2, this.t('stap2'), this.t('stap2t'), `<div class="qrs"><span class="qr">${qrSvg(adres)}</span><b class="mono adres">${esc(adres)}</b></div>`)}
      ${stap(3, this.t('stap3'), this.t('stap3t'), `<div class="gegevens"><div><small>${esc(this.t('gebruikersnaam'))}</small><b class="mono">${esc(l.gebruikersnaam || '')}</b></div>
        ${d.wachtwoord ? `<div><small>${esc(this.t('wachtwoord'))}</small><b class="mono">${esc(d.wachtwoord)}</b></div>` : `<div><small>${esc(this.t('wachtwoord'))}</small><button class="fam-knop rand klein" data-a="koppel-ww" data-id="${l.id}">${esc(this.t('nieuwWachtwoord'))}</button></div>`}</div>`)}
      ${stap(4, this.t('stap4'), this.t('stap4t', l.naam))}
      <div class="status ${tel ? 'klaar' : ''}">${tel ? `<ha-icon icon="mdi:check-circle"></ha-icon><b>${esc(this.t('gekoppeld', tel.naam))}</b>
          <button class="fam-knop zacht" data-a="test" data-id="${l.id}"><ha-icon icon="mdi:bell-ring"></ha-icon>${esc(this.t('testMelding'))}</button>`
        : `<span class="spinner"></span>${esc(this.t('wachten'))}`}</div>
      <div class="rij eind"><button class="fam-knop" data-a="sluit">${esc(this.t('klaar'))}</button></div>`;
  }

  _apparatenKeuze(d, l) {
    // per kamer Verborgen/Zien/Bedienen; per apparaat alleen als het anders moet; of alles overnemen van iemand anders
    const ap = d.apparaten, naam = l.naam.split(' ')[0], h = this._huisApp;
    ap.kamers = ap.kamers || {}; ap.uitzonderingen = ap.uitzonderingen || {};
    const kop = `<div class="kaart zacht" style="margin-top:16px"><b>💡 ${esc(this.t('apTitel', naam))}</b>
      <div class="keuzes twee" style="margin-top:8px">${[[false, 'apAlles'], [true, 'apKiezen']].map(([v, k]) => `<button class="keuze ${!!ap.beperkt === v ? 'aan' : ''}" data-a="ap-beperkt" data-v="${v ? 1 : ''}"><b>${esc(this.t(k))}</b><small>${esc(this.t(k + 'Uitleg', naam))}</small></button>`).join('')}</div>`;
    if (!ap.beperkt) return kop + '</div>';
    if (!h) return kop + '<p class="fam-sub">…</p></div>';
    const anderen = this._s.leden.filter((x) => x.id !== l.id && x.apparaten && x.apparaten.beperkt);
    const seg = (act, data, huidig, opties) => `<span class="ap-seg">${opties.map(([v, t]) => `<button class="${huidig === v ? 'aan' : ''}" data-a="${act}" ${data} data-v="${v}">${esc(this.t(t))}</button>`).join('')}</span>`;
    const kamers = h.kamers.filter((k) => !k.verborgen).map((k) => ({ ...k, apps: h.apparaten.filter((a) => a.kamer === k.kamer && a.tonen) })).filter((k) => k.apps.length);
    return kop + `<p class="fam-sub" style="margin:8px 0 0">${esc(this.t('apLegendaKamer'))}</p>
      ${anderen.length ? `<div class="rij" style="margin-top:6px"><span class="fam-sub">${esc(this.t('apZelfdeAls'))}</span>${anderen.map((x) => `<button class="fam-chip vbk" data-a="ap-kopie" data-id="${x.id}">${esc(x.emoji)} ${esc(x.naam.split(' ')[0])}</button>`).join('')}</div>` : ''}
      ${kamers.map((k) => { const ks = ap.kamers[k.kamer] || '', uitz = k.apps.filter((a) => a.entity in ap.uitzonderingen).length;
        return `<div class="ap-kamer"><div class="ap-krij"><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon><b class="groei">${esc(k.naam)}</b>
          ${seg('ap-kamerstand', `data-k="${k.kamer}"`, ks, [['', 'apVerborgen'], ['z', 'apZien'], ['b', 'apBedienen']])}</div>
          <details ${uitz ? 'open' : ''}><summary class="fam-sub">${esc(this.t('apUitz', k.apps.length))}${uitz ? ` · ${uitz} ${esc(this.t('apAnders'))}` : ''}</summary>
          ${k.apps.map((a) => `<div class="ap-rij"><span class="groei">${esc(a.naam)}</span>${seg('ap-zet', `data-e="${esc(a.entity)}"`, a.entity in ap.uitzonderingen ? ap.uitzonderingen[a.entity] : 'kamer',
            [['kamer', 'apZoalsKamer'], ['', 'apVerborgen'], ['z', 'apZien'], ['b', 'apBedienen']])}</div>`).join('')}</details></div>`; }).join('')}</div>`;
  }
  _apZet(d, e, v) {
    const u = d.apparaten.uitzonderingen = d.apparaten.uitzonderingen || {};
    if (v === 'kamer') delete u[e]; else u[e] = v;
  }
  _leesOver(d) { const g = this.shadowRoot.getElementById('geboorte'); if (g) d.geboortedatum = g.value; }
  _dlgBewerk(d) {
    const l = this._s.leden.find((x) => x.id === d.id);
    if (!l) return '';
    const wg = this.t('weergaven');
    return `<h2>${esc(l.naam)}</h2>
      <div class="voorbeeld">${avatar({ ...l, emoji: d.emoji, kleur: d.kleur }, { grootte: 72 })}</div>
      <label class="lbl">${esc(this.t('naam'))}</label><input class="veld" id="naam" value="${esc(d.naam)}" maxlength="40"/>
      <label class="lbl">${esc(this.t('welkeRol'))}</label>${this._rollen(d)}${this._kiezers(d)}
      <div class="kaart zacht" style="margin-top:16px"><b>🎁 ${esc(this.t('overLid', l.naam))}</b><p class="fam-sub" style="margin:4px 0 0">${esc(this.t('overLidUitleg'))}</p>
        <div class="rij" style="align-items:end"><label class="klein-lbl">${esc(this.t('geboortedatum'))}<input class="veld smal" type="date" id="geboorte" value="${esc(d.geboortedatum)}"/></label>
          <div class="klein-lbl">${esc(this.t('geslacht'))}<div class="vb">${Object.entries(this.t('geslachten')).map(([k, n]) => `<button class="fam-chip vbk ${d.geslacht === k ? 'aan' : ''}" data-a="geslacht" data-v="${k}">${esc(n)}</button>`).join('')}</div></div></div>
        <label class="lbl">${esc(this.t('interesses'))}</label>
        <div class="vb">${[...new Set([...INTERESSES, ...d.interesses])].map((i) => `<button class="fam-chip vbk ${d.interesses.includes(i) ? 'aan' : ''}" data-a="interesse" data-v="${esc(i)}">${esc(i)}</button>`).join('')}</div>
        <div class="rij" style="margin-top:8px"><input class="veld groei" id="interesse-eigen" placeholder="${esc(this.t('interesseEigen'))}" maxlength="30"/><button class="fam-knop rand klein" data-a="interesse-plus">+</button></div></div>
      ${l.kan_inloggen ? `<label class="lbl">${esc(this.t('weergave', l.naam))}</label>
        <div class="keuzes vier">${Object.entries(wg).map(([k, [n, u]]) => `<button class="keuze ${d.weergave === k ? 'aan' : ''}" data-a="weergave" data-v="${k}"><b>${esc(n)}</b><small>${esc(u)}</small></button>`).join('')}</div>` : ''}
      ${l.kan_inloggen ? '' : d.account ? `<div class="kaart zacht" style="margin-top:16px"><b>📱 ${esc(this.t('accountMaken', l.naam))}</b>
          <label class="lbl">${esc(this.t('gebruikersnaam'))}</label><input class="veld" id="acc-gebruikersnaam" value="${esc(d.account.gebruikersnaam)}" autocapitalize="off" maxlength="30"/>
          <label class="lbl">${esc(this.t('wachtwoord'))}</label><input class="veld mono" id="acc-wachtwoord" value="${esc(d.account.wachtwoord)}" maxlength="64"/>
          <div class="rij eind"><button class="fam-knop" data-a="account-maak">${esc(this.t('accountKnop'))}</button></div></div>`
        : `<div class="rij" style="margin-top:16px"><button class="fam-knop zacht" data-a="account-start"><ha-icon icon="mdi:cellphone-plus"></ha-icon>${esc(this.t('accountMaken', l.naam))}</button></div>`}
      <div class="kaart zacht" style="margin-top:16px"><b>📌 ${esc(this.t('pdTitel'))}</b><p class="fam-sub" style="margin:4px 0 8px">${esc(this.t('pdUitleg', l.naam.split(' ')[0]))}</p>
        ${l.dashboard ? `<div class="rij"><ha-icon icon="mdi:account-star"></ha-icon><b class="groei">${esc(l.dashboard_eigen ? this.t('pdEigen', l.naam.split(' ')[0]) : ((this._s.dashboards.find((x) => x.url_path === l.dashboard) || {}).titel || l.dashboard))}</b>
            <a class="fam-knop rand klein" href="/${esc(l.dashboard)}" data-a="pd-open">${esc(this.t('pdOpen'))}</a><button class="fam-knop gevaar klein" data-a="pd-los" data-id="${l.id}">${esc(this.t('pdLos'))}</button></div>`
          : `<div class="rij"><button class="fam-knop zacht" data-a="pd-maak" data-id="${l.id}"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('pdMaak'))}</button>
            ${this._s.dashboards.length ? `<span class="fam-sub">${esc(this.t('pdOf'))}</span><select class="veld smal" id="pd-kies"><option value="">${esc(this.t('pdKies'))}</option>${this._s.dashboards.map((x) => `<option value="${esc(x.url_path)}">${esc(x.titel)}</option>`).join('')}</select>
            <button class="fam-knop rand klein" data-a="pd-koppel" data-id="${l.id}">${esc(this.t('pdKoppel'))}</button>` : ''}</div>`}</div>
      ${this._apparatenKeuze(d, l)}
      <label class="lbl">${esc(this.t('lamp', l.naam))}</label><small class="fam-sub">${esc(this.t('lampUitleg'))}</small><div class="lampform"></div>
      ${l.telefoons.length ? `<label class="lbl">${esc(this.t('meldingen'))}</label><select class="veld" id="notify"><option value="">${esc(this.t('automatisch'))}</option>
        ${l.telefoons.map((t) => `<option value="${esc(t.notify)}" ${l.notify === t.notify ? 'selected' : ''}>${esc(t.naam)}</option>`).join('')}</select>` : ''}
      ${d.fout ? `<div class="fam-chip fout">${esc(d.fout)}</div>` : ''}
      <div class="rij eind"><button class="fam-knop rand" data-a="sluit">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="bewerk-opslaan">${esc(this.t('opslaan'))}</button></div>
      <hr/>
      <div class="rij">${l.kan_inloggen ? `<button class="fam-knop rand klein" data-a="koppel-ww" data-id="${l.id}"><ha-icon icon="mdi:key"></ha-icon>${esc(this.t('nieuwWachtwoord'))}</button>` : ''}
        <button class="fam-knop gevaar klein" data-a="verwijder" data-id="${l.id}">${esc(this.t('verwijderen'))}</button>
        ${l.id !== this._s.ik ? `<button class="fam-knop gevaar klein" data-a="verwijder-account" data-id="${l.id}">${esc(this.t('verwijderenAccount'))}</button>` : ''}</div>`;
  }

  _lampForm(d) {
    const plek = this.shadowRoot.querySelector('.lampform');
    if (!plek) return;
    const f = document.createElement('ha-form');
    f.hass = this._hass;
    f.schema = [{ name: 'lamp', selector: { entity: { domain: 'light' } } }];
    f.data = { lamp: d.lamp || undefined };
    f.computeLabel = () => '';
    f.addEventListener('value-changed', (e) => { d.lamp = e.detail.value.lamp || null; });
    plek.append(f);
    this._forms.push(f);
  }

  _invoer(e) {
    const d = this._dlg, id = e.target.id;
    if (!d || !id) return;
    if (id === 'naam') {
      d.naam = e.target.value;
      if (d.soort === 'nieuw' && !d.gebruikersnaamZelf) d.gebruikersnaam = slug(d.naam);
      const v = this.shadowRoot.querySelector('.voorbeeld .fam-avatar');
      if (v && !d.emoji) v.textContent = (d.naam || '?').charAt(0);
      const knop = this.shadowRoot.querySelector('[data-a=nieuw-volgende]');
      if (knop) knop.disabled = !(d.naam && d.rol);
    }
    if (id === 'gebruikersnaam') { d.gebruikersnaam = e.target.value; d.gebruikersnaamZelf = true; }
    if (id === 'wachtwoord') d.wachtwoord = e.target.value;
    if (id === 'beheerder') d.beheerder = e.target.checked;
    if (id === 'notify') d.notify = e.target.value;
  }

  async _klik(e) {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, d = this._dlg, s = this._s;
    if (a.startsWith('mu-')) {
      if (b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
      return this._muurKlik(a, b);
    }
    if (a.startsWith('hu-')) {
      if (b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
      return this._huisKlik(a, b);
    }
    if (a.startsWith('kl-')) {
      if (b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
      return this._klusjesKlik(a, b);
    }
    if (a === 'tab' || a.startsWith('agenda-') || a.startsWith('jarig-') || a.startsWith('afval-')) {
      if (b.tagName === 'INPUT' || b.tagName === 'SELECT') return;              // die gaan via 'change'
      return this._agendaKlik(a, b);
    }
    if (a === 'sluit-achter' && e.target !== b) return;           // alleen klikken op de achtergrond zelf
    if (a === 'sluit' || a === 'sluit-achter') return this._sluit();
    if (a === 'huis-bewerk') { this._huisBewerk = { soort: s.type }; return this._teken(); }
    if (a === 'huis-annuleer') { this._huisBewerk = null; return this._teken(); }
    if (a === 'soort') { this._huisBewerk.soort = b.dataset.k; this.shadowRoot.querySelectorAll('[data-a=soort]').forEach((x) => x.classList.toggle('aan', x === b)); return; }
    if (a === 'huis-opslaan') {
      const naam = this.shadowRoot.getElementById('huisnaam').value, soort = this._huisBewerk.soort || s.type;
      this._huisBewerk = null;
      return this._doe('ha_family/huishouden', { naam, soort });
    }
    if (a === 'los') return this._doe('ha_family/lid/persoon', { person: b.dataset.person, rol: b.dataset.rol });
    if (a === 'toevoegen') return this._open({ soort: 'nieuw', stap: 1, naam: '', rol: s.type === 'huishouden' ? 'huisgenoot' : null, emoji: EMOJI.find((x) => !s.leden.some((l) => l.emoji === x)), kleur: KLEUREN.find((x) => !s.leden.some((l) => l.kleur === x)) });
    if (a === 'emoji' && d) { d.emoji = b.dataset.v; return this._herteken(); }
    if (a === 'kleur' && d) { d.kleur = b.dataset.v; return this._herteken(); }
    if (a === 'rol' && d) { d.rol = b.dataset.v; return this._herteken(); }
    if (a === 'weergave' && d) { d.weergave = b.dataset.v; return this._herteken(); }
    if (a === 'ap-beperkt' && d) { this._leesOver(d); d.apparaten.beperkt = !!b.dataset.v; return this._herteken(); }
    if (a === 'ap-zet' && d) { this._leesOver(d); this._apZet(d, b.dataset.e, b.dataset.v); return this._herteken(); }
    if (a === 'ap-kamerstand' && d) { this._leesOver(d); d.apparaten.kamers = { ...(d.apparaten.kamers || {}), [b.dataset.k]: b.dataset.v }; return this._herteken(); }
    if (a === 'ap-kopie' && d) {
      this._leesOver(d); const x = this._s.leden.find((y) => y.id === b.dataset.id).apparaten;
      d.apparaten = { beperkt: true, kamers: { ...(x.kamers || {}) }, uitzonderingen: { ...(x.uitzonderingen || {}) } };
      this._melding(this.t('apGekopieerd', this._s.leden.find((y) => y.id === b.dataset.id).naam.split(' ')[0])); return this._herteken();
    }
    if (a === 'geslacht' && d) { this._leesOver(d); d.geslacht = d.geslacht === b.dataset.v ? null : b.dataset.v; return this._herteken(); }
    if (a === 'interesse' && d) { this._leesOver(d); const v = b.dataset.v; d.interesses = d.interesses.includes(v) ? d.interesses.filter((x) => x !== v) : [...d.interesses, v]; return this._herteken(); }
    if (a === 'interesse-plus' && d) {
      this._leesOver(d); const v = (this.shadowRoot.getElementById('interesse-eigen').value || '').trim().toLowerCase();
      if (v && !d.interesses.includes(v)) d.interesses = [...d.interesses, ...v.split(',').map((x) => x.trim()).filter(Boolean)];
      return this._herteken();
    }
    if (a === 'nieuw-volgende') {
      if (!d.wachtwoord) d.wachtwoord = (await this._ws('ha_family/voorstel')).wachtwoord;
      if (!d.gebruikersnaam) d.gebruikersnaam = slug(d.naam);
      d.stap = 2; d.fout = null; if (d.inloggen === undefined && d.rol !== 'kind') d.inloggen = true;
      return this._herteken();
    }
    if (a === 'nieuw-terug') { d.stap = 1; return this._herteken(); }
    if (a === 'inloggen') { d.inloggen = b.dataset.v === '1'; return this._herteken(); }
    if (a === 'nieuw-ww') { d.wachtwoord = (await this._ws('ha_family/voorstel')).wachtwoord; return this._herteken(); }
    if (a === 'nieuw-maak') {
      d.bezig = true; this._herteken();
      try {
        const lid = await this._ws('ha_family/lid/toevoegen', { naam: d.naam, rol: d.rol, emoji: d.emoji, kleur: d.kleur, inloggen: !!d.inloggen,
          ...(d.inloggen ? { gebruikersnaam: d.gebruikersnaam, wachtwoord: d.wachtwoord, beheerder: !!d.beheerder } : {}) });
        d.id = lid.id; d.stap = 3; d.fout = null;
        await this._laad();
      } catch (er) { d.fout = er.message; }
      d.bezig = false;
      return this._herteken();
    }
    if (a === 'koppel') {
      const ww = d && d.soort === 'nieuw' && d.inloggen ? d.wachtwoord : null;
      return this._open({ soort: 'koppel', id: b.dataset.id, wachtwoord: ww });
    }
    if (a === 'koppel-ww') {
      const ww = (await this._ws('ha_family/voorstel')).wachtwoord;
      const nieuw = prompt(this.t('nieuwWachtwoord'), ww);
      if (!nieuw) return;
      if (await this._doe('ha_family/lid/wachtwoord', { lid: b.dataset.id, wachtwoord: nieuw }, this.t('wwGewijzigd'))) {
        if (d && d.soort === 'koppel') { d.wachtwoord = nieuw; this._herteken(); }
      }
      return;
    }
    if (a === 'test') return this._doe('ha_family/lid/test_melding', { lid: b.dataset.id }, this.t('testVerstuurd'));
    if (a === 'bewerk') {
      const l = s.leden.find((x) => x.id === b.dataset.id);
      return this._open({ soort: 'bewerk', id: l.id, naam: l.naam, rol: l.rol, emoji: l.emoji, kleur: l.kleur, weergave: l.weergave, lamp: l.lamp, notify: l.notify || '',
        geboortedatum: l.geboortedatum || '', geslacht: l.geslacht || null, interesses: [...(l.interesses || [])],
        apparaten: { beperkt: false, zien: [], bedienen: [], ...(l.apparaten || {}) } }), this._ws('ha_family/huis').then((h) => { this._huisApp = h; if (this._dlg && this._dlg.soort === 'bewerk') this._herteken(); });
    }
    if (a === 'account-start') { d.account = { gebruikersnaam: slug(d.naam), wachtwoord: (await this._ws('ha_family/voorstel')).wachtwoord }; return this._herteken(); }
    if (a === 'account-maak') {
      const gb = this.shadowRoot.getElementById('acc-gebruikersnaam').value, ww = this.shadowRoot.getElementById('acc-wachtwoord').value;
      try {
        await this._ws('ha_family/lid/account', { lid: d.id, gebruikersnaam: gb, wachtwoord: ww });
        await this._laad();
        return this._open({ soort: 'koppel', id: d.id, wachtwoord: ww });           // meteen door naar telefoon koppelen
      } catch (er) { d.fout = er.message; return this._herteken(); }
    }
    if (a === 'bekijk-als') return weergevenAls(b.dataset.id);
    if (a === 'pd-maak' || a === 'pd-los' || a === 'pd-koppel') {
      const url_path = a === 'pd-koppel' ? this.shadowRoot.getElementById('pd-kies').value : undefined;
      if (a === 'pd-koppel' && !url_path) return;
      if (await this._doe('ha_family/lid/dashboard', { lid: b.dataset.id, actie: { 'pd-maak': 'maak', 'pd-los': 'los', 'pd-koppel': 'koppel' }[a], ...(url_path ? { url_path } : {}) }, this.t('bewaard'))) this._herteken();
      return;
    }
    if (a === 'pd-open') { e.preventDefault && e.preventDefault(); history.pushState(null, '', b.getAttribute('href')); window.dispatchEvent(new CustomEvent('location-changed')); return; }
    if (a === 'bewerk-opslaan') {
      const l = s.leden.find((x) => x.id === d.id);
      this._leesOver(d);
      const data = { lid: d.id, naam: d.naam, rol: d.rol, emoji: d.emoji, kleur: d.kleur, lamp: d.lamp || null, notify: d.notify || null,
        geboortedatum: d.geboortedatum || null, geslacht: d.geslacht || null, interesses: d.interesses, apparaten: d.apparaten };
      if (l.kan_inloggen) data.weergave = d.weergave;
      if (await this._doe('ha_family/lid/bijwerken', data)) this._sluit();
      return;
    }
    if (a === 'verwijder' || a === 'verwijder-account') {
      const l = s.leden.find((x) => x.id === b.dataset.id);
      if (!confirm(this.t(a === 'verwijder' ? 'zeker' : 'zekerAccount', l.naam))) return;
      if (await this._doe('ha_family/lid/verwijderen', { lid: l.id, ook_account: a === 'verwijder-account' })) this._sluit();
    }
  }
}

const STIJL = `
  :host { display: block; background: var(--primary-background-color); min-height: 100vh; color: var(--primary-text-color); }
  .balk { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; height: var(--header-height, 56px); padding: 0 12px;
    background: var(--app-header-background-color, var(--primary-background-color)); color: var(--app-header-text-color, var(--primary-text-color));
    border-bottom: var(--app-header-border-bottom, 1px solid var(--divider-color)); }
  .titel { font-size: 1.25rem; font-weight: 500; }
  .inhoud { max-width: 1040px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
  .kaart { background: var(--card-background-color); border-radius: var(--ha-card-border-radius, 20px); padding: 20px;
    box-shadow: var(--ha-card-box-shadow, none); border: 1px solid var(--ha-card-border-color, var(--divider-color)); }
  .kaart.zacht { background: color-mix(in srgb, var(--primary-color) 6%, var(--card-background-color)); }
  .kaart.fout { color: var(--error-color); }
  h2 { margin: 0 0 8px; font-size: 1.3rem; }
  .kop2 { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .kop2 h2 { margin: 0; }
  .huiskop { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .huisnaam { font-size: 1.6rem; font-weight: 600; }
  .welkom { text-align: center; display: grid; justify-items: center; gap: 8px; padding: 32px 20px; }
  .welkom p { max-width: 520px; margin: 0 0 8px; }
  .groot { font-size: 3rem; }
  .leden { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .lid { display: grid; gap: 14px; align-content: start; }
  .lidkop { display: flex; align-items: center; gap: 14px; }
  .lidnaam { display: grid; gap: 2px; font-size: 1.15rem; }
  .lidnaam .fam-sub { font-size: .9rem; }
  .regels { display: grid; gap: 6px; font-size: .92rem; }
  .regels div { display: flex; align-items: center; gap: 10px; }
  .regels ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
  .punten { display: flex; flex-wrap: wrap; gap: 6px; }
  .rij { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .rij.eind { justify-content: flex-end; margin-top: 16px; }
  .fam-knop.klein { min-height: 36px; padding: 0 14px; font-size: .9rem; }
  .losse { display: grid; gap: 8px; margin-top: 8px; }
  .los { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .los-naam { font-weight: 600; min-width: 120px; }
  .achter { position: fixed; inset: 0; z-index: 10; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: 16px; overflow: auto; }
  .dlg { background: var(--card-background-color); border-radius: 24px; padding: 24px; width: min(560px, 100%); max-height: calc(100vh - 32px); overflow: auto;
    box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
  .dlg h2.midden, .midden { text-align: center; }
  .voorbeeld { display: grid; justify-items: center; margin: 4px 0 8px; }
  .lbl { display: block; font-weight: 600; margin: 16px 0 6px; }
  .veld { width: 100%; box-sizing: border-box; font: inherit; font-size: 1rem; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .veld:focus { outline: 2px solid var(--primary-color); outline-offset: -1px; }
  .groei { flex: 1; width: auto; min-width: 160px; }
  .mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .keuzes { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  .keuzes.twee { grid-template-columns: 1fr 1fr; margin-top: 8px; }
  .keuze { border: 1px solid var(--divider-color); background: none; color: inherit; font: inherit; cursor: pointer; text-align: left; border-radius: 16px;
    padding: 12px 14px; display: grid; gap: 2px; }
  .keuze small { color: var(--secondary-text-color); font-size: .82rem; line-height: 1.3; }
  .keuze .ki { font-size: 1.6rem; }
  .keuze.aan { border-color: var(--primary-color); box-shadow: inset 0 0 0 1px var(--primary-color); background: color-mix(in srgb, var(--primary-color) 8%, transparent); }
  .emoji { display: flex; flex-wrap: wrap; gap: 4px; }
  .emoji button { border: 0; background: none; font-size: 1.6rem; width: 44px; height: 44px; border-radius: 12px; cursor: pointer; }
  .emoji button.aan { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .kleuren { display: flex; flex-wrap: wrap; gap: 10px; }
  .kleuren button { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--k); cursor: pointer; }
  .kleuren button.aan { box-shadow: 0 0 0 3px var(--card-background-color), 0 0 0 5px var(--k); }
  .vink { display: flex; gap: 10px; align-items: flex-start; margin-top: 16px; cursor: pointer; }
  .vink input { width: 20px; height: 20px; margin-top: 2px; }
  .gegevens { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .gegevens div { background: var(--secondary-background-color); border-radius: 12px; padding: 10px 14px; display: grid; gap: 2px; }
  .gegevens small { color: var(--secondary-text-color); }
  .gegevens b { font-size: 1.1rem; word-break: break-all; }
  .stap { display: grid; grid-template-columns: 36px 1fr; gap: 12px; margin-top: 16px; }
  .stap .nr { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .stap p { margin: 2px 0 8px; }
  .qrs { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .qrs a { display: grid; justify-items: center; gap: 4px; color: inherit; text-decoration: none; }
  .qr { display: block; width: 120px; height: 120px; background: #fff; border-radius: 12px; padding: 4px; box-sizing: border-box; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .adres { font-size: 1rem; word-break: break-all; }
  .status { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 20px; padding: 14px 16px; border-radius: 16px; background: var(--secondary-background-color); }
  .status.klaar { background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent); }
  .status.klaar ha-icon { color: var(--success-color, #43a047); }
  .spinner { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--divider-color); border-top-color: var(--primary-color); animation: draai 1s linear infinite; }
  @keyframes draai { to { transform: rotate(360deg); } }
  hr { border: 0; border-top: 1px solid var(--divider-color); margin: 20px 0 12px; }
  .huisform { display: grid; gap: 12px; }
  .huisform label { display: grid; gap: 6px; font-weight: 600; }
  .tabs { margin-left: auto; display: flex; gap: 4px; }
  .tabs button { border: 0; background: none; color: inherit; font: inherit; font-weight: 500; padding: 0 14px; height: 40px; border-radius: 20px; cursor: pointer; }
  .tabs button.aan { background: color-mix(in srgb, var(--primary-color) 14%, transparent); color: var(--primary-color); }
  .arij { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px solid var(--divider-color); }
  .arij:last-of-type { border-bottom: 0; }
  .anaam { min-width: 90px; }
  .achips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
  .chipx { border: 0; background: none; color: inherit; cursor: pointer; padding: 0 0 0 4px; font-size: .9rem; }
  .klein-lbl { display: grid; gap: 4px; font-size: .82rem; color: var(--secondary-text-color); }
  .veld.smal { width: auto; padding: 8px 10px; }
  .vink.kort { margin-top: 0; align-items: center; }
  .aico { font-size: 1.2rem; }
  h3 { margin: 18px 0 4px; font-size: 1rem; }
  .uitleg { margin-top: 10px; color: var(--secondary-text-color); font-size: .9rem; }
  .uitleg summary { cursor: pointer; color: var(--primary-color); }
  .wie { display: flex; flex-wrap: wrap; gap: 8px; }
  .wie button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 4px; padding: 6px; border-radius: 14px; opacity: .45; }
  .wie button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 14%, transparent); }
  .wie small { font-size: .8rem; }
  .kl-em { font-size: 1.8rem; width: 40px; text-align: center; }
  .kl-groot { font-size: 3.5rem; }
  .groei { flex: 1; min-width: 0; }
  .vb { display: flex; flex-wrap: wrap; gap: 6px; }
  .vbk { border: 0; cursor: pointer; font: inherit; }
  .vbk:hover { background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
  .ptn { font-size: 1.3rem; min-width: 70px; text-align: center; }
  .keuze.klein-k { padding: 10px 12px; text-align: center; }
  .dagen { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .dagen button { border: 0; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; font: inherit; font-weight: 600; background: var(--secondary-background-color); color: var(--primary-text-color); }
  .dagen button.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .hu-kamer { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--divider-color); }
  .hu-kamer.uit { opacity: .5; }
  .hu-kamer.bewerk { display: grid; gap: 8px; }
  .hu-kamer > ha-icon { color: var(--primary-color); }
  .hu-x { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; }
  .hu-x:hover { background: var(--secondary-background-color); color: var(--primary-text-color); }
  .hu-iconen { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .hu-iconen button { border: 0; background: var(--secondary-background-color); color: var(--primary-text-color); width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: grid; place-items: center; }
  .hu-iconen button.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .hu-groep { margin-top: 14px; }
  .hu-groep.zonder { background: color-mix(in srgb, var(--warning-color, #ffa600) 10%, transparent); border-radius: 16px; padding: 4px 12px 8px; }
  .hu-groep h3 { display: flex; align-items: center; gap: 8px; }
  .hu-app { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--divider-color); }
  .hu-app:last-child { border-bottom: 0; }
  .hu-app input[type=checkbox], .hu-groep h3 input { width: 20px; height: 20px; accent-color: var(--primary-color); }
  .hu-app ha-icon { color: var(--secondary-text-color); }
  .hu-app ha-icon.aan { color: var(--state-light-active-color, #ffb300); }
  .hu-app select { max-width: 45%; }
  .hu-app.uit > span, .hu-app.uit > ha-icon { opacity: .45; }
  .ap-kamer { margin-top: 8px; border-top: 1px solid var(--divider-color); padding-top: 6px; }
  .ap-kamer summary { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 0; }
  .ap-kamer summary ha-icon { color: var(--primary-color); --mdc-icon-size: 20px; }
  .ap-krij { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
  .ap-krij ha-icon { color: var(--primary-color); --mdc-icon-size: 20px; }
  .ap-kamer details summary { cursor: pointer; padding: 0 0 4px 28px; font-size: .85rem; }
  .ap-rij { display: flex; align-items: center; gap: 8px; padding: 4px 0 4px 28px; font-size: .92rem; }
  .ap-seg { display: inline-flex; border-radius: 999px; overflow: hidden; border: 1px solid var(--divider-color); flex: none; }
  .ap-seg button { border: 0; background: none; font: inherit; font-size: .8rem; padding: 5px 10px; cursor: pointer; color: var(--primary-text-color); }
  .ap-seg button.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .hu-los summary { cursor: pointer; padding: 8px 0; }
  .hu-los .hu-app { opacity: .6; }
  .hu-balk { position: sticky; top: 8px; z-index: 2; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; padding: 10px 14px; border-radius: 16px;
    background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color)); }
  .vbk.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  @media (max-width: 600px) { .gegevens, .keuzes.twee { grid-template-columns: 1fr; } .inhoud { padding: 12px; } .tabs button { padding: 0 10px; } }
`;

const INTERESSES = ['voetbal', 'sport', 'gamen', 'lezen', 'muziek', 'tekenen', 'knutselen', 'koken', 'bakken', 'tuinieren', 'techniek', 'lego', 'dieren',
  'paarden', 'dansen', 'mode', 'make-up', 'film', 'series', 'reizen', 'fotografie', 'puzzels', 'spelletjes', 'buiten', 'fietsen', 'wellness', 'koffie', 'wijn', '3D-printen', "auto's"];
const ICOON_VOOR = { Woonkamer: 'mdi:sofa', 'Living room': 'mdi:sofa', Keuken: 'mdi:silverware-fork-knife', Kitchen: 'mdi:silverware-fork-knife', Slaapkamer: 'mdi:bed-king',
  Bedroom: 'mdi:bed-king', Kinderkamer: 'mdi:teddy-bear', 'Kids room': 'mdi:teddy-bear', Badkamer: 'mdi:shower', Bathroom: 'mdi:shower', Hal: 'mdi:door', Hallway: 'mdi:door',
  Zolder: 'mdi:home-roof', Attic: 'mdi:home-roof', Tuin: 'mdi:flower', Garden: 'mdi:flower' };

if (!customElements.get('ha-family-beheer')) customElements.define('ha-family-beheer', HaFamilyBeheer);
