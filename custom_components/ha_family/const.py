"""Constanten van HA Family."""
from __future__ import annotations

DOMAIN = "ha_family"
PLATFORMS = ["calendar", "sensor", "todo"]
STORAGE_VERSION = 1

CONF_NAAM = "naam"
CONF_TYPE = "type"
CONF_DASHBOARD = "dashboard"
CONF_STARTSCHERM = "startscherm"

TYPE_GEZIN = "gezin"
TYPE_HUISHOUDEN = "huishouden"

# Rollen: ouders beheren, kinderen krijgen een eenvoudiger weergave; in een huishouden is iedereen huisgenoot.
ROLLEN = {
    TYPE_GEZIN: ["ouder", "kind"],
    TYPE_HUISHOUDEN: ["huisgenoot"],
}
ALLE_ROLLEN = ["ouder", "kind", "huisgenoot", "gast"]

# Kleuren die goed leesbaar zijn in licht en donker; een nieuw lid krijgt de eerste die nog vrij is.
KLEUREN = ["#7c4dff", "#e91e63", "#00a6a6", "#ff8f00", "#43a047", "#1e88e5", "#8d6e63", "#f4511e", "#5e35b1", "#00897b"]
EMOJI = ["🦊", "🐻", "🐼", "🦁", "🐯", "🐨", "🐸", "🦉", "🐙", "🦄", "🐝", "🐬", "🌻", "⭐", "🚀", "🎸"]

DASHBOARD_URL = "gezin"
BEHEER_URL = "gezin-beheer"
FRONTEND_URL = "/ha_family"
CARDS_JS = "family-cards.js"
BEHEER_COMPONENT = "ha-family-beheer"
