"""Maakt strings.json, translations/en.json en translations/nl.json uit één bron (python3 scripts/gen_strings.py)."""
import json
from pathlib import Path

DOEL = Path(__file__).resolve().parent.parent / "custom_components" / "ha_family"


def taal(t):
    k = (lambda en, nl: nl) if t == "nl" else (lambda en, nl: en)
    velden = {"naam": k("Name of your household", "Naam van jullie huishouden"), "type": k("What are you?", "Wat zijn jullie?"),
              "dashboard": k("Family app: dashboard in the sidebar, simple home screen and sidebar per family member",
                             "Gezinsapp: dashboard in de zijbalk, eenvoudig startscherm en zijbalk per gezinslid"),
              "startscherm": k("Family dashboard as home screen for everyone (also new users and wall tablets)",
                               "Gezinsdashboard als startscherm voor iedereen (ook nieuwe gebruikers en een tablet aan de muur)")}
    return {
        "config": {
            "step": {"user": {"title": "HA Family",
                              "description": k("Home Assistant for the whole family. After this step, open **Family settings** in the sidebar "
                                               "to add your family members and connect their phones.",
                                               "Home Assistant voor het hele gezin. Open na deze stap **Gezin beheren** in de zijbalk om "
                                               "gezinsleden toe te voegen en hun telefoons te koppelen."),
                              "data": velden}},
            "abort": {"single_instance_allowed": k("HA Family is already set up.", "HA Family is al ingesteld.")},
        },
        "options": {"step": {"init": {"title": "HA Family", "data": velden}}},
        "selector": {"soort": {"options": {"gezin": k("A family (parents and children)", "Een gezin (ouders en kinderen)"),
                                           "huishouden": k("A household (housemates)", "Een huishouden (huisgenoten)")}}},
        "entity": {"sensor": {"gezin": {"name": k("Family", "Gezin")}}},
    }


def schrijf(pad, data):
    pad.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    schrijf(DOEL / "strings.json", taal("en"))
    schrijf(DOEL / "translations" / "en.json", taal("en"))
    schrijf(DOEL / "translations" / "nl.json", taal("nl"))
