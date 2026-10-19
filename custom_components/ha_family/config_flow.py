"""Instellen in twee klikken: naam van het huishouden en of het een gezin of een huishouden is.
De rest (gezinsleden, telefoons, lampen) gaat via het paneel 'Gezin beheren'."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_DASHBOARD, CONF_NAAM, CONF_STARTSCHERM, CONF_TYPE, DOMAIN, TYPE_GEZIN, TYPE_HUISHOUDEN


def _schema(standaard: dict[str, Any]) -> vol.Schema:
    return vol.Schema({
        vol.Required(CONF_NAAM, default=standaard.get(CONF_NAAM, "Ons gezin")): selector.TextSelector(),
        vol.Required(CONF_TYPE, default=standaard.get(CONF_TYPE, TYPE_GEZIN)): selector.SelectSelector(
            selector.SelectSelectorConfig(options=[TYPE_GEZIN, TYPE_HUISHOUDEN], translation_key="soort", mode=selector.SelectSelectorMode.LIST)),
        vol.Optional(CONF_DASHBOARD, default=standaard.get(CONF_DASHBOARD, True)): selector.BooleanSelector(),
        vol.Optional(CONF_STARTSCHERM, default=standaard.get(CONF_STARTSCHERM, True)): selector.BooleanSelector(),
    })


class FamilyConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            naam = user_input[CONF_NAAM].strip()[:40] or "Ons gezin"
            return self.async_create_entry(title=naam, data={**user_input, CONF_NAAM: naam})
        return self.async_show_form(step_id="user", data_schema=_schema({}))

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return FamilyOptionsFlow()


class FamilyOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data={**user_input, CONF_NAAM: user_input[CONF_NAAM].strip()[:40] or "Ons gezin"})
        return self.async_show_form(step_id="init", data_schema=_schema(dict(self.config_entry.options or self.config_entry.data)))
