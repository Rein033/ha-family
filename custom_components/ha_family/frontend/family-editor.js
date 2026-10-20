/* HA Family — visuele editor voor de kaarten (alleen voor experts).
 *
 * Eén editor voor alle kaarten: per kaart een lijstje instellingen, getekend met Home Assistants eigen formulier
 * (ha-form). Alleen wie in HA Family op 'Expert' staat (of een beheerder die geen gezinslid is) ziet de instellingen;
 * de rest krijgt uitleg. Gewone gezinsleden hoeven de kaarten niet aan te passen: het gezinsdashboard bouwt zichzelf. */
import { esc, leden } from './family-ui.js?v=0.10.0';

const nl = (h) => ((h && h.locale && h.locale.language) || 'en').startsWith('nl');
const L = {
  weer: ['Weerbericht', 'Weather'], weergave: ['Standaardweergave', 'Default view'], weken: ['Aantal weken in de weekplanner', 'Weeks in the planner'],
  lid: ['Altijd de klusjes van', 'Always show chores of'], compact: ['Compact (kort, voor het startscherm)', 'Compact (short, for the home screen)'],
  kamer: ['Alleen deze kamer', 'Only this room'], titel: ['Titel', 'Title'],
};
const KEUZE = {
  maand: ['Maand (blokken met puntjes)', 'Month (blocks with dots)'], weken: ['Weken (weekplanner)', 'Weeks (planner)'],
};

// Per kaart: de instellingen (ha-form-schema) en een startconfig voor 'Kaart toevoegen'
export const INSTELLINGEN = {
  'family-gezin-card': { schema: () => [{ name: 'weer', selector: { entity: { domain: 'weather' } } }] },
  'family-agenda-card': {
    schema: (h) => [{ name: 'weergave', selector: { select: { mode: 'list', options: Object.entries(KEUZE).map(([value, t]) => ({ value, label: t[nl(h) ? 0 : 1] })) } } },
      { name: 'weken', selector: { number: { min: 1, max: 12, mode: 'slider' } } }],
    standaard: { weergave: 'maand', weken: 6 },
  },
  'family-vandaag-card': { schema: () => [] },
  'family-klusjes-card': {
    schema: (h) => [{ name: 'lid', selector: { select: { mode: 'dropdown', options: [{ value: '', label: nl(h) ? 'Wie kijkt (automatisch)' : 'Whoever is looking (automatic)' },
      ...leden(h).filter((l) => l.rol === 'kind').map((l) => ({ value: l.id, label: l.naam }))] } } }],
  },
  'family-taken-card': { schema: () => [{ name: 'compact', selector: { boolean: {} } }] },
  'family-boodschappen-card': { schema: () => [{ name: 'compact', selector: { boolean: {} } }] },
  'family-eten-card': { schema: () => [{ name: 'compact', selector: { boolean: {} } }] },
  'family-recepten-card': { schema: () => [] },
  'family-kamers-card': {
    schema: () => [{ name: 'compact', selector: { boolean: {} } }, { name: 'kamer', selector: { area: {} } }, { name: 'titel', selector: { text: {} } }],
  },
  'family-cadeaus-card': { schema: () => [] },
};

async function laadHaForm() {
  if (customElements.get('ha-form')) return;
  // ha-form wordt pas geladen als HA een eigen editor nodig heeft: dat laten we hier gebeuren
  try {
    const helpers = await window.loadCardHelpers();
    const c = await helpers.createCardElement({ type: 'entities', entities: [] });
    if (c.constructor.getConfigElement) await c.constructor.getConfigElement();
  } catch (e) { /* dan toch zonder */ }
}

export class FamilyKaartEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._teken(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; else this._teken(); }
  get _kaart() { return (this._config && this._config.type || '').replace('custom:', ''); }
  _expert() {
    const h = this._hass, ik = leden(h).find((l) => h.user && l.user_id === h.user.id);
    return ik ? !!ik.expert : !!(h.user && h.user.is_admin);     // beheerder die geen gezinslid is: mag
  }
  async _teken() {
    if (!this._hass || !this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const h = this._hass, n = nl(h);
    const stijl = `<style>.uitleg { padding: 12px 16px; border-radius: 12px; background: var(--secondary-background-color); line-height: 1.5; }
      .uitleg b { display: block; margin-bottom: 4px; }</style>`;
    if (!this._expert()) {
      this._form = null;
      this.shadowRoot.innerHTML = `${stijl}<div class="uitleg"><b>🔒 ${esc(n ? 'Alleen voor experts' : 'Experts only')}</b>${esc(n
        ? 'De instellingen van HA Family-kaarten zijn er voor wie in Gezin beheren op de weergave "Expert" staat. Het gezinsdashboard regelt zichzelf, je hoeft hier niets te doen.'
        : 'HA Family card settings are for people on the "Expert" view in Family management. The family dashboard takes care of itself; nothing to do here.')}</div>`;
      return;
    }
    const def = INSTELLINGEN[this._kaart];
    const schema = def ? def.schema(h) : [];
    if (!schema.length) {
      this._form = null;
      this.shadowRoot.innerHTML = `${stijl}<div class="uitleg">${esc(n ? 'Deze kaart heeft geen instellingen: hij werkt vanzelf.' : 'This card has no settings: it just works.')}</div>`;
      return;
    }
    await laadHaForm();
    if (!this._form) {
      this.shadowRoot.innerHTML = stijl;
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => (L[s.name] || [s.name, s.name])[n ? 0 : 1];
      this._form.addEventListener('value-changed', (e) => {
        const nieuw = { ...this._config, ...e.detail.value };
        Object.keys(nieuw).forEach((k) => { if (nieuw[k] === '' || nieuw[k] === undefined || nieuw[k] === null || nieuw[k] === false) delete nieuw[k]; });
        nieuw.type = this._config.type;
        this._config = nieuw;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: nieuw }, bubbles: true, composed: true }));
      });
      this.shadowRoot.appendChild(this._form);
    }
    this._form.hass = h;
    this._form.schema = schema;
    this._form.data = { ...(def.standaard || {}), ...this._config };
  }
}

/** Geeft elke kaartklasse een visuele editor en een startconfig ('Kaart toevoegen'). */
export function metEditor(kaarten) {
  kaarten.forEach(([type, klasse]) => {
    klasse.getConfigElement = () => document.createElement('family-kaart-editor');
    klasse.getStubConfig = () => ({});
    if (!INSTELLINGEN[type]) INSTELLINGEN[type] = { schema: () => [] };
  });
  return kaarten;
}


/* ── Editor voor het hele gezinsdashboard (✏️ → Dashboard bewerken) ── */
const TAB_NAMEN = { thuis: ['🏠 Thuis', '🏠 Home'], agenda: ['📅 Agenda', '📅 Calendar'], taken: ['✅ Taken', '✅ Tasks'], eten: ['🍝 Eten', '🍝 Meals'],
  huis: ['🏠 Huis', '🏠 House'], cadeaus: ['🎁 Cadeaus', '🎁 Gifts'], boodschappen: ['🛒 Boodschappen', '🛒 Groceries'] };
const THUIS_NAMEN = { gezin: ['Gezin en wie er thuis is', 'Family and who is home'], klusjes: ['Klusjes', 'Chores'], vandaag: ['Vandaag (met dagoverzicht)', 'Today (with day overview)'],
  eten: ['Vanavond eten we', "Tonight's dinner"], boodschappen: ['Boodschappen', 'Groceries'], kamers: ['Kamers (lampen, airco)', 'Rooms (lights, AC)'],
  taken: ['Mijn taken', 'My tasks'], afval: ['Volgende afval', 'Next waste collection'] };
const SL = { titel: ['Titel (leeg = naam van het gezin)', 'Title (empty = family name)'], tabs: ['Tabbladen', 'Tabs'], thuis: ['Kaarten op Thuis', 'Cards on Home'],
  agenda_weergave: ['Agenda: standaardweergave', 'Calendar: default view'] };

export class FamilyStrategieEditor extends FamilyKaartEditor {
  get _kaart() { return '__strategie'; }
  async _teken() {
    if (!this._hass || !this._config) return;
    const h = this._hass, n = nl(h);
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const stijl = `<style>.uitleg { padding: 12px 16px; border-radius: 12px; background: var(--secondary-background-color); line-height: 1.5; margin-bottom: 12px; }
      .uitleg b { display: block; margin-bottom: 4px; } code { font-size: .85em; }
      .sjabloon { border: 0; border-radius: 999px; padding: 8px 16px; font: inherit; font-weight: 600; cursor: pointer; background: var(--primary-color); color: var(--text-primary-color, #fff); }</style>`;
    if (!this._expert()) {
      this._form = null;
      this.shadowRoot.innerHTML = `${stijl}<div class="uitleg"><b>🔒 ${esc(n ? 'Alleen voor experts' : 'Experts only')}</b>${esc(n
        ? 'Het gezinsdashboard aanpassen kan voor wie in Gezin beheren op de weergave "Expert" staat.' : 'Changing the family dashboard is for people on the "Expert" view.')}</div>`;
      return;
    }
    await laadHaForm();
    if (!this._form) {
      this.shadowRoot.innerHTML = `${stijl}<div class="uitleg"><b>✨ ${esc(n ? 'Dit dashboard blijft zichzelf bijwerken' : 'This dashboard keeps updating itself')}</b>${esc(n
        ? 'Kies wat je ziet. Nieuwe functies van HA Family komen er vanzelf bij. Eigen kaarten of tabbladen? Open de code-editor en voeg toe:'
        : 'Choose what you see. New HA Family features are added automatically. Own cards or tabs? Open the code editor and add:')}
        <br/><code>extra: { thuis: [ {type: …} ] }</code> ${esc(n ? 'of' : 'or')} <code>extra_tabs: [ {title: …, cards: […]} ]</code></div>
        <div class="uitleg"><b>📋 ${esc(n ? 'Liever elke kaart zelf aanpassen?' : 'Rather edit every card yourself?')}</b>${esc(n
          ? 'Zet het dashboard om naar een sjabloon: een gewoon dashboard waarin je alles vrij bewerkt. Nieuwe functies voeg je later toe in Gezin beheren.'
          : 'Turn it into a template: a normal dashboard you edit freely. Add new features later in Family management.')}
          <div style="margin-top:8px"><button class="sjabloon">📋 ${esc(n ? 'Omzetten naar sjabloon' : 'Turn into template')}</button></div></div>`;
      this.shadowRoot.querySelector('.sjabloon').addEventListener('click', async (e) => {
        if (!confirm(n ? 'Het gezinsdashboard wordt een gewoon dashboard dat je vrij kunt bewerken. Doorgaan?' : 'The family dashboard becomes a normal dashboard you can freely edit. Continue?')) return;
        e.target.disabled = true;
        try { const m = await import('./family-sjabloon.js?v=0.10.0'); await m.naarSjabloon(h); location.reload(); }
        catch (er) { e.target.disabled = false; alert(er.message); }
      });
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => (SL[s.name] || [s.name, s.name])[n ? 0 : 1];
      this._form.addEventListener('value-changed', (e) => {
        const v = e.detail.value, nieuw = { ...this._config, titel: v.titel, agenda_weergave: v.agenda_weergave };
        // wat uit staat bewaren, niet wat aan staat: dan komt iets nieuws uit een volgende versie er vanzelf bij
        nieuw.tabs_uit = Object.keys(TAB_NAMEN).filter((t) => !(v.tabs || []).includes(t));
        nieuw.thuis_uit = Object.keys(THUIS_NAMEN).filter((t) => !(v.thuis || []).includes(t));
        ['titel', 'agenda_weergave', 'tabs_uit', 'thuis_uit'].forEach((k) => { if (!nieuw[k] || (Array.isArray(nieuw[k]) && !nieuw[k].length)) delete nieuw[k]; });
        this._config = nieuw;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: nieuw }, bubbles: true, composed: true }));
      });
      this.shadowRoot.appendChild(this._form);
    }
    const opties = (namen) => Object.entries(namen).map(([value, t]) => ({ value, label: t[n ? 0 : 1] }));
    this._form.hass = h;
    this._form.schema = [
      { name: 'titel', selector: { text: {} } },
      { name: 'tabs', selector: { select: { multiple: true, mode: 'list', options: opties(TAB_NAMEN) } } },
      { name: 'thuis', selector: { select: { multiple: true, mode: 'list', options: opties(THUIS_NAMEN) } } },
      { name: 'agenda_weergave', selector: { select: { mode: 'dropdown', options: [{ value: '', label: n ? 'Wat ieder zelf kiest' : 'Each person chooses' },
        { value: 'maand', label: n ? 'Maand' : 'Month' }, { value: 'weken', label: n ? 'Weken' : 'Weeks' }] } } },
    ];
    const c = this._config;
    this._form.data = { titel: c.titel || '', agenda_weergave: c.agenda_weergave || '',
      tabs: Object.keys(TAB_NAMEN).filter((t) => !(c.tabs_uit || []).includes(t)), thuis: Object.keys(THUIS_NAMEN).filter((t) => !(c.thuis_uit || []).includes(t)) };
  }
}
