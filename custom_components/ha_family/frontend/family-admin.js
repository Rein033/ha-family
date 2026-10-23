/* HA Family — Admin (HA-Family-Management): voor experts al het andere van Home Assistant op één plek.
 *
 * Wie op de weergave 'Expert' staat, houdt een rustige zijbalk (Familie, Gezin beheren, Admin). Hier staat de rest:
 * Home Assistant zelf (automatiseringen, apparaten, instellingen …), je eigen dashboards, HACS en alle andere plugins
 * en add-ons, en de AI. Alles wordt uit de echte zijbalk van HA gehaald, dus wat je later installeert komt er vanzelf bij. */
import { CSS, esc } from './family-ui.js?v=0.13.2';

const NL = {
  titel: 'Admin', zoek: 'Zoeken…', ha: 'Home Assistant', dashboards: 'Mijn dashboards', plugins: 'Plugins, HACS en add-ons', ai: 'AI',
  geenPlugins: 'Nog geen plugins of add-ons.', geenAi: 'Nog geen AI gekoppeld. Koppel bijvoorbeeld Ollama, OpenAI of Google bij Apparaten & diensten.',
  aiCadeaus: 'Cadeau-ideeën (Cadeaus)', aiAssist: 'Assist en spraak', gezin: 'HA Family',
  uitleg: 'Alles wat niet in je zijbalk staat. Wat je later installeert (bijvoorbeeld via HACS), komt hier vanzelf bij.',
};
const EN = {
  titel: 'Admin', zoek: 'Search…', ha: 'Home Assistant', dashboards: 'My dashboards', plugins: 'Plugins, HACS and add-ons', ai: 'AI',
  geenPlugins: 'No plugins or add-ons yet.', geenAi: 'No AI connected yet. Connect e.g. Ollama, OpenAI or Google under Devices & services.',
  aiCadeaus: 'Gift ideas (Gifts)', aiAssist: 'Assist and voice', gezin: 'HA Family',
  uitleg: 'Everything that is not in your sidebar. Things you install later (e.g. via HACS) show up here automatically.',
};
// [pad, icoon, nl, en]
const HA_LINKS = [
  ['/config/automation/dashboard', 'mdi:robot', 'Automatiseringen', 'Automations'],
  ['/config/script/dashboard', 'mdi:script-text', 'Scripts', 'Scripts'],
  ['/config/scene/dashboard', 'mdi:palette', 'Scènes', 'Scenes'],
  ['/config/blueprint/dashboard', 'mdi:paper-cut-vertical', 'Blueprints', 'Blueprints'],
  ['/config/integrations/dashboard', 'mdi:devices', 'Apparaten & diensten', 'Devices & services'],
  ['/config/entities', 'mdi:shape', 'Entiteiten', 'Entities'],
  ['/config/helpers', 'mdi:tools', 'Helpers', 'Helpers'],
  ['/config/areas/dashboard', 'mdi:sofa', 'Ruimtes', 'Areas'],
  ['/config/person', 'mdi:account-multiple', 'Personen en gebruikers', 'People and users'],
  ['/config/lovelace/dashboards', 'mdi:view-dashboard', 'Dashboards beheren', 'Manage dashboards'],
  ['/config/voice-assistants/assistants', 'mdi:microphone-message', 'Spraakassistenten', 'Voice assistants'],
  ['/config/system', 'mdi:cog-box', 'Systeem', 'System'],
  ['/config/backup', 'mdi:backup-restore', "Back-ups", 'Backups'],
  ['/config/logs', 'mdi:math-log', 'Logboeken van het systeem', 'System logs'],
  ['/config/repairs', 'mdi:bandage', 'Reparaties', 'Repairs'],
  ['/config/dashboard', 'mdi:cog', 'Alle instellingen', 'All settings'],
  ['/developer-tools/state', 'mdi:hammer', 'Ontwikkelaarshulpmiddelen', 'Developer tools'],
];
const INGEBOUWD_ICOON = { energy: 'mdi:lightning-bolt', history: 'mdi:chart-box', logbook: 'mdi:format-list-bulleted-type', map: 'mdi:tooltip-account',
  'media-browser': 'mdi:play-box-multiple', calendar: 'mdi:calendar', todo: 'mdi:clipboard-list', light: 'mdi:lamps', climate: 'mdi:home-thermometer',
  security: 'mdi:security', maintenance: 'mdi:wrench', home: 'mdi:home', lovelace: 'mdi:view-dashboard', 'developer-tools': 'mdi:hammer', hacs: 'mdi:hammer-wrench' };
const EIGEN = new Set(['gezin', 'gezin-beheer', 'gezin-admin', 'gezin-muur', 'config', 'profile', 'notfound', 'developer-tools', '_my_redirect']);

const STIJL = `
  :host { display: block; background: var(--primary-background-color); min-height: 100vh; }
  .balk { display: flex; align-items: center; gap: 8px; height: var(--header-height, 56px); padding: 0 12px; box-sizing: border-box;
    background: var(--app-header-background-color, var(--primary-color)); color: var(--app-header-text-color, #fff); position: sticky; top: 0; z-index: 2; }
  .balk h1 { font-size: 1.25rem; font-weight: 400; margin: 0 0 0 4px; flex: 1; }
  .balk input { font: inherit; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--divider-color); width: min(280px, 45vw);
    background: var(--card-background-color); color: var(--primary-text-color); }
  .menu { border: 0; background: none; color: inherit; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; }
  .inhoud { max-width: 1200px; margin: 0 auto; padding: 16px; }
  .uitleg { color: var(--secondary-text-color); margin: 4px 4px 16px; }
  h2 { font-size: 1.05rem; margin: 22px 4px 10px; color: var(--secondary-text-color); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
  a.tegel { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; background: var(--card-background-color); color: var(--primary-text-color);
    text-decoration: none; box-shadow: var(--ha-card-box-shadow, none); border: 1px solid var(--divider-color); min-height: 30px; }
  a.tegel:hover { border-color: var(--primary-color); }
  a.tegel ha-icon { color: var(--primary-color); flex: none; }
  a.tegel span { line-height: 1.25; }
  a.tegel small { display: block; color: var(--secondary-text-color); font-size: .8rem; }
  .leeg { color: var(--secondary-text-color); padding: 4px; }
  [hidden] { display: none !important; }
`;

class HaFamilyAdmin extends HTMLElement {
  set hass(h) { const eerste = !this._hass; this._hass = h; if (eerste || h.panels !== this._panels || this._aiSleutel() !== this._ai) this._teken(); }
  set narrow(n) { this._narrow = n; }
  set panel(p) { this._panel = p; }
  get t() { return ((this._hass.config && this._hass.config.language || this._hass.locale && this._hass.locale.language) || 'en').startsWith('nl') ? NL : EN; }
  _aiSleutel() { return Object.keys(this._hass.states).filter((e) => e.startsWith('ai_task.') || (e.startsWith('conversation.') && e !== 'conversation.home_assistant')).join(); }

  _naam(p) {
    if (p.url_path === 'lovelace' && !p.title) return (this._hass.localize && this._hass.localize('panel.states')) || 'Overzicht';
    const vertaald = p.title && this._hass.localize && this._hass.localize(`panel.${p.title}`);
    return vertaald || p.title || p.url_path;
  }
  _tegel(pad, icoon, naam, sub) {
    return `<a class="tegel" href="${esc(pad)}" data-zoek="${esc((naam + ' ' + (sub || '')).toLowerCase())}"><ha-icon icon="${esc(icoon)}"></ha-icon><span>${esc(naam)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></a>`;
  }
  _teken() {
    const h = this._hass, t = this.t, nl = t === NL;
    this._panels = h.panels; this._ai = this._aiSleutel();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => {
        if (e.target.closest('.menu')) this.dispatchEvent(new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }));
        const a = e.target.closest('a.tegel');
        if (a && !e.ctrlKey && !e.metaKey && a.getAttribute('href').startsWith('/')) {
          e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); window.dispatchEvent(new CustomEvent('location-changed'));
        }
      });
      this.shadowRoot.addEventListener('input', (e) => { if (e.target.id === 'zoek') this._filter(e.target.value); });
    }
    const panels = Object.values(h.panels || {}).filter((p) => p.url_path && !EIGEN.has(p.url_path));
    const ingebouwd = panels.filter((p) => INGEBOUWD_ICOON[p.url_path] && !['hacs', 'lovelace'].includes(p.url_path));
    const dashboards = panels.filter((p) => p.component_name === 'lovelace' && !ingebouwd.includes(p));
    const plugins = panels.filter((p) => !dashboards.includes(p) && !ingebouwd.includes(p));
    const aiEnt = Object.values(h.states).filter((s) => s.entity_id.startsWith('ai_task.') || (s.entity_id.startsWith('conversation.') && s.entity_id !== 'conversation.home_assistant'));
    const zoekWaarde = this.shadowRoot.getElementById('zoek') ? this.shadowRoot.getElementById('zoek').value : '';
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style>
      <div class="balk"><button class="menu" title="Menu"><ha-icon icon="mdi:menu"></ha-icon></button><h1>${esc(t.titel)}</h1>
        <input id="zoek" placeholder="${esc(t.zoek)}" value="${esc(zoekWaarde)}" autocomplete="off"/></div>
      <div class="inhoud"><p class="uitleg">${esc(t.uitleg)}</p>
        <h2>${esc(t.ha)}</h2><div class="raster">
          ${HA_LINKS.map(([pad, ic, n, e]) => this._tegel(pad, ic, nl ? n : e)).join('')}
          ${ingebouwd.map((p) => this._tegel(`/${p.url_path}`, p.icon || INGEBOUWD_ICOON[p.url_path], this._naam(p))).join('')}</div>
        <h2>${esc(t.dashboards)}</h2><div class="raster">${dashboards.map((p) => this._tegel(`/${p.url_path}`, p.icon || 'mdi:view-dashboard', this._naam(p))).join('')}</div>
        <h2>${esc(t.plugins)}</h2><div class="raster">${plugins.length ? plugins.map((p) => this._tegel(`/${p.url_path}`, p.icon || INGEBOUWD_ICOON[p.url_path] || 'mdi:puzzle', this._naam(p))).join('') : `<div class="leeg">${esc(t.geenPlugins)}</div>`}</div>
        <h2>✨ ${esc(t.ai)}</h2><div class="raster">
          ${aiEnt.length ? aiEnt.map((s) => this._tegel('/config/integrations/dashboard', 'mdi:creation', s.attributes.friendly_name || s.entity_id, s.entity_id.startsWith('ai_task.') ? 'AI Task' : 'Assist')).join('')
            + this._tegel('/gezin/cadeaus', 'mdi:gift', t.aiCadeaus) + this._tegel('/config/voice-assistants/assistants', 'mdi:microphone-message', t.aiAssist)
            : `<div class="leeg">${esc(t.geenAi)}</div>`}</div>
      </div>`;
    if (zoekWaarde) { this._filter(zoekWaarde); const z = this.shadowRoot.getElementById('zoek'); z.focus(); z.setSelectionRange(z.value.length, z.value.length); }
  }
  _filter(w) {
    const q = w.trim().toLowerCase();
    this.shadowRoot.querySelectorAll('a.tegel').forEach((a) => { a.hidden = !!q && !a.dataset.zoek.includes(q); });
    this.shadowRoot.querySelectorAll('.raster').forEach((r) => {
      const h2 = r.previousElementSibling;
      const zichtbaar = [...r.querySelectorAll('a.tegel')].some((a) => !a.hidden) || (!q && r.querySelector('.leeg'));
      r.hidden = !zichtbaar; if (h2 && h2.tagName === 'H2') h2.hidden = !zichtbaar;
    });
  }
}

if (!customElements.get('ha-family-admin')) customElements.define('ha-family-admin', HaFamilyAdmin);
