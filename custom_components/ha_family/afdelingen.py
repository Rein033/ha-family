"""Afdelingen in de supermarkt (op volgorde van de looproute) en het raden van de afdeling bij een boodschap."""
from __future__ import annotations

import re

# volgorde = looproute in de winkel
AFDELINGEN = {
    'groente': '🥦 Groente & fruit',
    'brood': '🍞 Brood & ontbijt',
    'zuivel': '🧀 Zuivel & eieren',
    'vlees': '🥩 Vlees, vis & vega',
    'droog': '🍝 Pasta, rijst & conserven',
    'snoep': '🍫 Koek, snoep & chips',
    'diepvries': '🧊 Diepvries',
    'drinken': '🥤 Drinken',
    'huishouden': '🧽 Huishouden',
    'verzorging': '🧴 Verzorging',
    'overig': '📦 Overig',
}

_WOORDEN = {
    "groente": "appel peer banaan sinaasappel citroen limoen druif aardbei framboos bes meloen ananas mango kiwi avocado tomaat komkommer paprika ui knoflook wortel prei broccoli bloemkool spinazie sla rucola courgette aubergine champignon paddenstoel aardappel krieltje gember peterselie basilicum koriander bieslook munt kruiden groente fruit sperzieboon boon mais spruit kool andijvie selderij radijs lente-ui",
    "brood": "brood broodje stokbrood croissant beschuit cracker knäckebrood wrap tortilla pita muesli cornflakes havermout granola ontbijt pindakaas hagelslag jam honing nutella",
    "zuivel": "melk yoghurt kwark vla boter roomboter kaas geitenkaas mozzarella feta parmezaan room slagroom creme fraiche ei eieren karnemelk",
    "vlees": "kip kipfilet gehakt worst rookworst spek bacon ham salami biefstuk varken rund vis zalm tonijn garnaal kabeljauw tofu tempeh vega burger shoarma",
    "droog": "pasta spaghetti penne macaroni lasagne rijst noedel couscous bulgur meel bloem suiker zout peper olie olijfolie azijn saus pesto tomatenpuree passata soep bouillon kruiden blik bonen kikkererwten linzen mayo ketchup mosterd sambal sojasaus curry",
    "snoep": "chips koek koekje snoep chocola chocolade drop nootjes noten popcorn taart cake",
    "diepvries": "diepvries ijs pizza friet patat spinazie-diepvries",
    "drinken": "water cola sap fris thee koffie bier wijn limonade ranja energy",
    "huishouden": "wc-papier toiletpapier keukenrol afwasmiddel vaatwas wasmiddel wasverzachter allesreiniger spons vuilniszak zak batterij folie aluminiumfolie bakpapier lucifer kaars",
    "verzorging": "shampoo conditioner zeep douchegel deodorant deo tandpasta tandenborstel scheer maandverband tampon crème creme pleister paracetamol lenzen",
}
WOORD_AFDELING = {w: k for k, ws in _WOORDEN.items() for w in ws.split()}


def raad_afdeling(tekst: str) -> str:
    """Afdeling in de winkel bij een boodschap: op woord, meervoud of als deel van een samenstelling."""
    for w in re.findall(r"[a-zà-ÿ-]+", tekst.lower()):
        stam = w[:-2] if w.endswith(("en", "ën")) else w
        # tomaten → tomaat, uien → ui: klinker weer verdubbelen
        lang = stam[:-1] + stam[-2] + stam[-1] if len(stam) >= 3 and stam[-2] in "aeou" and stam[-1] not in "aeiou" and stam[-3] not in "aeiou" else stam
        for kandidaat in (w, w.rstrip("s"), stam, lang, w[:-1] if w.endswith("e") else w):
            if kandidaat in WOORD_AFDELING:
                return WOORD_AFDELING[kandidaat]
        # samenstellingen: het laatste deel telt ("boterhamworst" is worst, "tomatensoep" is soep)
        delen = [(w.rfind(k) + len(k), len(k), afd) for k, afd in WOORD_AFDELING.items() if len(k) >= 4 and k in w]
        if delen:
            return max(delen)[2]
    return "overig"
