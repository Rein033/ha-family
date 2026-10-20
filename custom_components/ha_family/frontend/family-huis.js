/* HA Family — kamers (HA-Family-Cards).
 *
 *   type: custom:family-kamers-card     per kamer de lampen, airco/thermostaat, ventilatoren, rolluiken, stopcontacten en speakers
 *     compact: true                     kort: per kamer één rij met ronde knoppen (startscherm, muurscherm)
 *     kamer: <ruimte-id>                alleen deze kamer
 *
 * Kamers zijn de ruimtes van Home Assistant; instellen in Gezin beheren → Huis. Tikken = aan/uit. */
import { CSS, esc, ikLid } from './family-ui.js?v=0.11.2';

const TEKST = {
  nl: { kamers: 'Huis', aan: 'Aan', uit: 'Uit', open: 'Open', dicht: 'Dicht', speelt: 'Speelt', alleUit: 'Alles uit', geen: 'Nog geen kamers met apparaten.',
    instellen: 'Kamers instellen', nuBinnen: 'nu', modus: { off: 'Uit', heat: 'Verwarmen', cool: 'Koelen', heat_cool: 'Automatisch', auto: 'Automatisch', dry: 'Drogen', fan_only: 'Ventileren' },
    lampenAan: '{x} aan', zonder: 'Zonder kamer', overig: 'Overig', aanpassen: 'Aanpassen', geenKamer: '— geen kamer —', offline: 'offline', instelling: 'instelling', verberg: 'Niet op het dashboard', toon: 'Op het dashboard', zekerUit: '{x} echt uitzetten?', bewerkUitleg: 'Met het oogje bepaal je wat op het dashboard staat (voor iedereen). Kies bij een apparaat een kamer om het te verplaatsen.', meer: 'Meer instellingen', aanUit: 'Aan/uit', stand: 'Stand', ventilator: 'Ventilator', voorkeur: 'Voorkeur', zwenken: 'Zwenken',
    helderheid: 'Helderheid', licht: 'Licht', kleur: 'Kleur', volume: 'Volume', snelheidLbl: 'Snelheid', klaar: 'Klaar',
    snelheid: { auto: 'Auto', low: 'Laag', medium: 'Middel', mid: 'Middel', middle: 'Middel', high: 'Hoog', silent: 'Stil', quiet: 'Stil', turbo: 'Turbo', strong: 'Sterk', mute: 'Stil' },
    presets: { none: 'Geen', eco: 'Eco', comfort: 'Comfort', away: 'Weg', home: 'Thuis', sleep: 'Slapen', boost: 'Boost', activity: 'Actief', on: 'Aan', off: 'Uit', vertical: 'Verticaal', horizontal: 'Horizontaal', both: 'Beide' },
    kleurtemp: { 2700: '🕯️ Warm', 4000: '☀️ Neutraal', 6000: '❄️ Koel' }, slot: 'Dit mag je bekijken, maar niet bedienen.' },
  en: { kamers: 'Home', aan: 'On', uit: 'Off', open: 'Open', dicht: 'Closed', speelt: 'Playing', alleUit: 'All off', geen: 'No rooms with devices yet.',
    instellen: 'Set up rooms', nuBinnen: 'now', modus: { off: 'Off', heat: 'Heating', cool: 'Cooling', heat_cool: 'Auto', auto: 'Auto', dry: 'Dry', fan_only: 'Fan' },
    lampenAan: '{x} on', zonder: 'No room', overig: 'Other', aanpassen: 'Edit', geenKamer: '— no room —', offline: 'offline', instelling: 'setting', verberg: 'Not on the dashboard', toon: 'On the dashboard', zekerUit: 'Really turn off {x}?', bewerkUitleg: 'Use the eye to choose what is on the dashboard (for everyone). Pick a room for a device to move it.', meer: 'More settings', aanUit: 'On/off', stand: 'Mode', ventilator: 'Fan', voorkeur: 'Preset', zwenken: 'Swing',
    helderheid: 'Brightness', licht: 'Light', kleur: 'Colour', volume: 'Volume', snelheidLbl: 'Speed', klaar: 'Done',
    snelheid: { auto: 'Auto', low: 'Low', medium: 'Medium', mid: 'Medium', middle: 'Medium', high: 'High', silent: 'Silent', quiet: 'Quiet', turbo: 'Turbo', strong: 'Strong', mute: 'Silent' },
    presets: { none: 'None', eco: 'Eco', comfort: 'Comfort', away: 'Away', home: 'Home', sleep: 'Sleep', boost: 'Boost', activity: 'Activity', on: 'On', off: 'Off', vertical: 'Vertical', horizontal: 'Horizontal', both: 'Both' },
    kleurtemp: { 2700: '🕯️ Warm', 4000: '☀️ Neutral', 6000: '❄️ Cool' }, slot: 'You can see this, but not control it.' },
};
const ICOON = { light: ['mdi:lightbulb-outline', 'mdi:lightbulb'], climate: ['mdi:air-conditioner', 'mdi:air-conditioner'], fan: ['mdi:fan-off', 'mdi:fan'],
  cover: ['mdi:window-shutter', 'mdi:window-shutter-open'], switch: ['mdi:power-socket-eu', 'mdi:power-socket-eu'], media_player: ['mdi:speaker-off', 'mdi:speaker'] };
const MODUS_ICOON = { off: '⏻', heat: '🔥', cool: '❄️', heat_cool: '🔄', auto: '🔄', dry: '💧', fan_only: '🌀' };
const KLEUREN = ['255,180,107', '255,0,0', '255,120,0', '255,214,0', '0,200,83', '0,176,255', '41,98,255', '170,0,255', '255,64,129'];
const isAan = (s) => !!s && ['on', 'open', 'opening', 'playing', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'].includes(s.state);
const taalVan = (h) => (((h && (h.config && h.config.language || h.locale && h.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');

const STIJL = `
  ha-card { padding: 16px; }
  .kop { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .kop .titel { font-size: 1.25rem; font-weight: 600; flex: 1; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; align-items: start; }
  .kamer { background: var(--secondary-background-color); border-radius: 20px; padding: 12px; }
  .kamer h3 { margin: 2px 4px 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
  .kamer h3 ha-icon { color: var(--primary-color); }
  .kamer h3 .t { margin-left: auto; font-weight: 500; color: var(--secondary-text-color); font-size: .95rem; }
  .kamer h3 .alles { border: 0; background: none; font: inherit; font-size: .8rem; color: var(--primary-color); cursor: pointer; padding: 4px 6px; border-radius: 8px; }
  .tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
  .tegel { border: 0; font: inherit; color: var(--primary-text-color); text-align: left; cursor: pointer; background: var(--card-background-color);
    border-radius: 16px; padding: 10px 12px; display: grid; gap: 4px; min-height: 76px; align-content: start; position: relative; overflow: hidden; }
  .tegel ha-icon { --mdc-icon-size: 26px; color: var(--secondary-text-color); }
  .tegel b { font-weight: 600; font-size: .92rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .tegel small { color: var(--secondary-text-color); }
  .tegel.aan { background: color-mix(in srgb, var(--k, #ffb300) 22%, var(--card-background-color)); }
  .tegel.aan ha-icon { color: var(--k, #ffb300); }
  .tegel.breed { grid-column: span 2; }
  .tegel input[type=range] { width: 100%; accent-color: var(--k, #ffb300); margin: 2px 0 0; }
  .klimaat { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .klimaat .doel { font-size: 1.5rem; font-weight: 600; min-width: 3.2em; text-align: center; }
  .rond { border: 0; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; font: inherit; font-size: 1.2rem;
    background: var(--secondary-background-color); color: var(--primary-text-color); flex: none; }
  .rond.aan { background: var(--k, var(--primary-color)); color: #fff; }
  .rond ha-icon, .tegel.aan .rond ha-icon { --mdc-icon-size: 20px; color: inherit; }
  .knoppen3 { display: flex; gap: 6px; margin-top: 4px; }
  /* compact */
  .rij { display: grid; gap: 6px; padding: 8px 0; border-top: 1px solid var(--divider-color); }
  .rij:first-of-type { border-top: 0; }
  .rij .nm { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .rij .nm ha-icon { color: var(--primary-color); --mdc-icon-size: 22px; flex: none; }
  .rij .nm span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rij .nm small { color: var(--secondary-text-color); font-weight: 500; }
  .rij .apps { display: flex; gap: 6px; flex-wrap: wrap; }
  .pil { border: 0; cursor: pointer; font: inherit; font-size: .85rem; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px 6px 8px;
    border-radius: 999px; background: var(--secondary-background-color); color: var(--primary-text-color); max-width: 100%; }
  .pil ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex: none; }
  .pil span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 11em; }
  .pil small { color: var(--secondary-text-color); }
  .pil.aan { background: color-mix(in srgb, var(--k) 22%, var(--card-background-color)); font-weight: 600; }
  .pil.aan ha-icon { color: var(--k); }
  .rij .rond { width: 42px; height: 42px; }
  .rij .rond.lbl { width: auto; padding: 0 12px; border-radius: 21px; font-size: .9rem; font-weight: 600; gap: 4px; display: inline-flex; }
  .tegel .meer { position: absolute; top: 4px; right: 4px; border: 0; background: none; color: var(--secondary-text-color); font-size: 1.1rem; line-height: 1;
    width: 30px; height: 30px; border-radius: 50%; cursor: pointer; }
  .tegel .meer:hover { background: var(--secondary-background-color); }
  .achter { position: fixed; inset: 0; z-index: 30; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: 16px; }
  .paneel { background: var(--card-background-color); color: var(--primary-text-color); border-radius: 26px; padding: 20px; width: min(420px, 100%);
    max-height: calc(100vh - 32px); overflow: auto; box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
  .pkop { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .pkop b { flex: 1; font-size: 1.15rem; }
  .pkop ha-icon { color: var(--primary-color); }
  .pgroot { display: flex; align-items: center; justify-content: center; gap: 18px; margin: 10px 0 6px; }
  .rond.groot { width: 52px; height: 52px; font-size: 1.6rem; }
  .ptemp { font-size: 2.6rem; font-weight: 600; display: grid; justify-items: center; min-width: 3.4em; }
  .ptemp small { font-size: .85rem; font-weight: 400; color: var(--secondary-text-color); }
  .plbl { color: var(--secondary-text-color); font-size: .85rem; margin: 14px 0 6px; }
  .pchips { display: flex; flex-wrap: wrap; gap: 6px; }
  .pchips .chip { border: 0; font: inherit; font-size: .88rem; padding: 7px 13px; border-radius: 999px; background: var(--secondary-background-color); color: var(--primary-text-color); cursor: pointer; }
  .pchips .chip.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); font-weight: 600; }
  .kleurbol { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--card-background-color); box-shadow: 0 0 0 1px var(--divider-color); cursor: pointer; }
  .paneel input[type=range] { width: 100%; accent-color: var(--primary-color); }
  .pvoet { display: flex; justify-content: flex-end; margin-top: 18px; }
  .groei { flex: 1; min-width: 0; }
  .b-kamer h3 { margin: 12px 0 4px; font-size: 1rem; display: flex; align-items: center; gap: 8px; }
  .b-kamer h3 ha-icon { color: var(--primary-color); --mdc-icon-size: 20px; }
  .b-rij { display: flex; align-items: center; gap: 10px; padding: 5px 0 5px 28px; border-bottom: 1px solid var(--divider-color); }
  .b-rij ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 20px; }
  .b-rij.uit > span, .b-rij.uit > ha-icon { opacity: .45; }
  .b-rij small { color: var(--secondary-text-color); }
  .b-sel { font: inherit; font-size: .85rem; padding: 5px 8px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); max-width: 42%; }
  .slot { opacity: .5; cursor: not-allowed !important; }
  .slot input[type=range] { pointer-events: none; }
  .leeg { color: var(--secondary-text-color); text-align: center; padding: 8px 0; display: grid; gap: 8px; justify-items: center; }
  .naar { border: 0; background: none; color: var(--primary-color); font: inherit; cursor: pointer; padding: 0; }
  :host([muur]) ha-card { border-radius: 24px; padding: 14px 18px; }
  :host([muur]) .kop .titel { font-size: 1.25rem; }
  :host([muur]) .kop { margin-bottom: 2px; }
  /* muurscherm: grote aanraakknoppen, twee of drie naast elkaar per kamer */
  :host([muur]) .rij { padding: 8px 0; gap: 8px; }
  :host([muur]) .rij .nm { font-size: 1.05rem; }
  :host([muur]) .rij .apps { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  :host([muur]) .pil { min-height: 58px; border-radius: 16px; padding: 8px 12px; font-size: .95rem; display: grid;
    grid-template-columns: 30px 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center; text-align: left; }
  :host([muur]) .pil ha-icon { --mdc-icon-size: 28px; grid-row: 1 / span 2; }
  :host([muur]) .pil span { max-width: none; white-space: normal; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  :host([muur]) .pil small, :host([muur]) .pil b { grid-column: 2; font-size: .8rem; }
  :host([muur]) .pil small.st { display: block; color: var(--secondary-text-color); }
  :host([muur]) .pil.aan small.st { color: inherit; opacity: .8; }
  :host([muur]) .pil:active { transform: scale(.97); }
  .pil small.st { display: none; }
`;

export class FamilyKamersCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; if (config.muur) this.setAttribute('muur', ''); }
  getCardSize() { return this._config && this._config.compact ? 4 : 8; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return x === undefined ? v : String(v).replace('{x}', x); }

  set hass(hass) {
    const oud = this._hass;
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this.shadowRoot.addEventListener('change', (e) => this._wijzig(e));
      // lang drukken (of rechtermuisknop) op een lamp: het paneel met helderheid en kleur
      const start = (e) => { const b = e.target.closest && e.target.closest('[data-a=schakel]'); if (!b) return;
        clearTimeout(this._lang); this._lang = setTimeout(() => { this._langGedaan = true; this._paneel = b.dataset.e; this._teken(); }, 550); };
      const stop = () => clearTimeout(this._lang);
      this.shadowRoot.addEventListener('pointerdown', start); this.shadowRoot.addEventListener('pointerup', stop); this.shadowRoot.addEventListener('pointerleave', stop, true);
      this.shadowRoot.addEventListener('contextmenu', (e) => { const b = e.target.closest && e.target.closest('[data-a=schakel]'); if (b) { e.preventDefault(); this._paneel = b.dataset.e; this._teken(); } });
    }
    // kamers of apparaten veranderd in HA (ruimtes, entiteitenregister) → opnieuw ophalen
    if (!oud || hass.areas !== oud.areas || hass.entities !== oud.entities || hass.devices !== oud.devices) { this._laad(); return; }
    const sleutel = this._sleutelVan(hass);
    if (sleutel !== this._sleutel) this._teken();
  }
  _sleutelVan(h) { return (this._d ? this._d.apparaten : []).map((a) => { const s = h.states[a.entity]; return s ? s.last_updated : ''; }).join() + (this._d ? this._d.kamers.map((k) => k.temperatuur && h.states[k.temperatuur] ? h.states[k.temperatuur].state : '').join() : ''); }
  async _laad() {
    clearTimeout(this._laadT);
    this._laadT = setTimeout(async () => {          // registers komen vaak in rijtjes binnen
      try { this._d = await this._hass.callWS({ type: 'ha_family/huis' }); this._fout = null; } catch (e) { this._fout = e.message; }
      this._teken();
    }, this._d ? 400 : 0);
  }

  _mag() {
    // per gezinslid instelbaar (Gezin beheren): welke apparaten iemand ziet en mag bedienen; de muur en beheerders zonder lid zien alles
    if (this._config && this._config.muur) return null;
    const ik = ikLid(this._hass);
    return ik && ik.apparaten && ik.apparaten.beperkt ? ik.apparaten : null;
  }
  _stand(entity, kamer) {
    // per kamer ingesteld, met uitzonderingen per apparaat: '' verborgen, 'z' zien, 'b' bedienen (null = alles mag)
    const mag = this._mag();
    if (!mag) return 'b';
    const u = mag.uitzonderingen || {};
    if (entity in u) return u[entity];
    return (mag.kamers || {})[kamer] || '';
  }
  _kamers() {
    const d = this._d, h = this._hass;
    const per = d.kamers.filter((k) => !k.verborgen && (!this._config.kamer || k.kamer === this._config.kamer))
      .map((k) => ({ ...k, apps: d.apparaten.filter((a) => a.kamer === k.kamer && a.tonen && this._stand(a.entity, a.kamer) && h.states[a.entity] && !['unavailable', 'unknown'].includes(h.states[a.entity].state)) }))
      .filter((k) => k.apps.length);
    // apparaten zonder kamer (bijv. een stekker die nog nergens hoort): in 'Overig', zodat niets verdwijnt
    if (!this._config.kamer) {
      const los = d.apparaten.filter((a) => !a.kamer && a.kan && a.tonen && this._stand(a.entity, '') && h.states[a.entity] && !['unavailable', 'unknown'].includes(h.states[a.entity].state));
      if (los.length) per.push({ kamer: '', naam: this.t('overig'), icoon: 'mdi:dots-grid', apps: los });
    }
    return per;
  }
  _beheerder() { return !!(this._hass.user && this._hass.user.is_admin) && !(this._config && this._config.muur); }
  _bewerkHtml() {
    // ✏️ Aanpassen: alle apparaten, ook verborgen en offline; oogje = op het dashboard of niet; zonder kamer: kamer kiezen
    const d = this._d, h = this._hass, DICO = { light: 'mdi:lightbulb', climate: 'mdi:air-conditioner', fan: 'mdi:fan', cover: 'mdi:window-shutter', switch: 'mdi:power-socket-eu', media_player: 'mdi:speaker' };
    const kamers = [...d.kamers.filter((k) => !k.verborgen), { kamer: '', naam: this.t('overig'), icoon: 'mdi:dots-grid' }];
    const opties = (k) => `<option value="">${esc(this.t('geenKamer'))}</option>${d.kamers.map((x) => `<option value="${x.kamer}" ${x.kamer === k ? 'selected' : ''}>${esc(x.naam)}</option>`).join('')}`;
    return `<p class="sub" style="margin:0 0 8px">${esc(this.t('bewerkUitleg'))}</p>${kamers.map((k) => {
      const apps = d.apparaten.filter((a) => (a.kamer || '') === k.kamer && a.kan && (!a.bijzaak || a.tonen));
      if (!apps.length) return '';
      return `<div class="b-kamer"><h3><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon>${esc(k.naam)}</h3>${apps.map((a) => {
        const st = h.states[a.entity], weg = !st || ['unavailable', 'unknown'].includes(st.state);
        return `<div class="b-rij ${a.tonen ? '' : 'uit'}"><ha-icon icon="${DICO[a.domein]}"></ha-icon><span class="groei">${esc(a.naam)}${weg ? ` <small>· ${esc(this.t('offline'))}</small>` : ''}${a.bijzaak ? ` <small>· ${esc(this.t('instelling'))}</small>` : ''}</span>
          <select class="b-sel" data-a="b-kamer" data-e="${esc(a.entity)}">${opties(a.kamer)}</select>
          <button class="rond ${a.tonen ? 'aan' : ''}" style="--k:var(--primary-color)" data-a="b-tonen" data-e="${esc(a.entity)}" data-t="${a.tonen ? '' : '1'}" title="${esc(a.tonen ? this.t('verberg') : this.t('toon'))}"><ha-icon icon="${a.tonen ? 'mdi:eye' : 'mdi:eye-off'}"></ha-icon></button></div>`;
      }).join('')}</div>`;
    }).join('')}`;
  }
  _kort(naam, kamer) {
    // 'Verwarming Slaapkamer Rafi' in Slaapkamer Rafi → 'Verwarming'; 'air conditioner Air Conditioner' → 'Air conditioner'; 'Kast Socket 1' → 'Kast'
    const weg = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let n = naam.replace(new RegExp(`\\s*${weg(kamer)}\\s*[-:]?\\s*`, 'ig'), ' ').replace(/\s+socket\s*\d*\s*$/i, '').trim();
    const gezien = new Set();
    n = n.split(/\s+/).filter((w) => { const k = w.toLowerCase(); if (gezien.has(k)) return false; gezien.add(k); return true; }).join(' ');
    if (!/[\p{L}\p{N}]/u.test(n)) return naam;
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  _temp(k) { const s = k.temperatuur && this._hass.states[k.temperatuur]; return s && !isNaN(parseFloat(s.state)) ? `${Math.round(parseFloat(s.state) * 10) / 10}°` : ''; }

  _teken() {
    if (!this.shadowRoot) return;
    this._sleutel = this._sleutelVan(this._hass);
    const c = this._config || {};
    let binnen;
    if (this._fout) binnen = `<div class="leeg">${esc(this._fout)}</div>`;
    else if (!this._d) binnen = '<div class="leeg">…</div>';
    else {
      const kamers = this._kamers();
      if (!kamers.length) {
        if (c.compact) { this.style.display = 'none'; return; }          // op het startscherm/muur niets tonen als er niets is
        binnen = `<div class="leeg">${esc(this.t('geen'))}${this._hass.user && this._hass.user.is_admin ? `<button class="naar" data-a="instellen">${esc(this.t('instellen'))} →</button>` : ''}</div>`;
      } else binnen = c.compact ? kamers.map((k) => this._rij(k)).join('') : `<div class="raster">${kamers.map((k) => this._kamer(k)).join('')}</div>`;
    }
    this.style.display = '';
    const knop = this._beheerder() && this._d ? `<button class="fam-knop ${this._bewerk ? '' : 'rand'} klein" data-a="bewerkmodus" style="min-height:32px">${this._bewerk ? '✓ ' + esc(this.t('klaar')) : '✏️ ' + esc(this.t('aanpassen'))}</button>` : '';
    const titel = c.titel === false ? (knop ? `<div class="kop"><div class="titel"></div>${knop}</div>` : '') : `<div class="kop"><div class="titel">🏠 ${esc(c.titel || this.t('kamers'))}</div>${knop}</div>`;
    if (this._bewerk && this._d) binnen = this._bewerkHtml();
    // focus van een schuifje bewaren: anders springt hij weg terwijl je sleept
    if (this.shadowRoot.activeElement && this.shadowRoot.activeElement.type === 'range') return;
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${titel}${binnen}</ha-card>${this._paneel && this._hass.states[this._paneel] ? this._paneelHtml(this._paneel) : ''}`;
    if (this._mag()) {
      const kamerVan = Object.fromEntries((this._d ? this._d.apparaten : []).map((a) => [a.entity, a.kamer]));
      this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => { if (this._stand(el.dataset.e, kamerVan[el.dataset.e]) !== 'b') { el.classList.add('slot'); el.title = this.t('slot'); } });
    }
  }

  _kamer(k) {
    const h = this._hass, lampenAan = k.apps.filter((a) => (a.domein === 'light' || a.domein === 'switch') && isAan(h.states[a.entity]));
    return `<div class="kamer"><h3><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon>${esc(k.naam)}
        ${lampenAan.length > 1 ? `<button class="alles" data-a="alles-uit" data-k="${k.kamer}">${esc(this.t('alleUit'))}</button>` : ''}<span class="t">${esc(this._temp(k))}</span></h3>
      <div class="tegels">${k.apps.map((a) => this._tegel(a, k)).join('')}</div></div>`;
  }
  _tegel(a, k) {
    const s = this._hass.states[a.entity], aan = isAan(s), naam = esc(this._kort(a.naam, k.naam)), ic = ICOON[a.domein][aan ? 1 : 0], at = s.attributes;
    const icoon = `<ha-icon icon="${esc(at.icon || ic)}"></ha-icon><button class="meer" data-a="open" data-e="${a.entity}" title="${esc(this.t('meer'))}">⋯</button>`;
    if (a.domein === 'climate') {
      const doel = at.temperature ?? at.target_temp_high ?? null, k2 = s.state === 'cool' ? '#039be5' : s.state === 'heat' ? '#f4511e' : 'var(--primary-color)';
      return `<div class="tegel breed ${aan ? 'aan' : ''}" style="--k:${k2};cursor:default">${icoon}<b>${naam}</b>
        <small>${esc(this.t('modus')[s.state] || s.state)}${at.current_temperature != null ? ` · ${esc(this.t('nuBinnen'))} ${at.current_temperature}°` : ''}</small>
        <div class="klimaat"><button class="rond ${aan ? 'aan' : ''}" data-a="klimaat-aan" data-e="${a.entity}"><ha-icon icon="mdi:power"></ha-icon></button>
          ${doel != null ? `<button class="rond" data-a="temp" data-e="${a.entity}" data-n="-1">−</button><span class="doel">${doel}°</span><button class="rond" data-a="temp" data-e="${a.entity}" data-n="1">+</button>` : ''}</div></div>`;
    }
    if (a.domein === 'cover') {
      const pos = at.current_position;
      return `<div class="tegel ${aan ? 'aan' : ''}" style="--k:#7e57c2;cursor:default">${icoon}<b>${naam}</b><small>${esc(aan ? this.t('open') : this.t('dicht'))}${pos != null ? ` · ${pos}%` : ''}</small>
        <div class="knoppen3"><button class="rond" data-a="cover" data-s="open_cover" data-e="${a.entity}"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button class="rond" data-a="cover" data-s="stop_cover" data-e="${a.entity}"><ha-icon icon="mdi:stop"></ha-icon></button>
          <button class="rond" data-a="cover" data-s="close_cover" data-e="${a.entity}"><ha-icon icon="mdi:arrow-down"></ha-icon></button></div></div>`;
    }
    const dimbaar = a.domein === 'light' && (at.supported_color_modes || []).some((m) => m !== 'onoff');
    const pct = at.brightness != null ? Math.round(at.brightness / 2.55) : null;
    const kleur = a.domein === 'light' ? (at.rgb_color ? `rgb(${at.rgb_color.join(',')})` : '#ffb300') : a.domein === 'fan' ? '#26a69a' : a.domein === 'media_player' ? '#5c6bc0' : '#43a047';
    const status = s.state === 'unavailable' ? '—' : a.domein === 'media_player' ? (s.state === 'playing' ? (at.media_title || this.t('speelt')) : this.t(aan ? 'aan' : 'uit'))
      : aan ? `${this.t('aan')}${pct != null ? ` · ${pct}%` : ''}` : this.t('uit');
    return `<div class="tegel ${aan ? 'aan' : ''}" role="button" tabindex="0" style="--k:${kleur}" data-a="schakel" data-e="${a.entity}">${icoon}<b>${naam}</b><small>${esc(status)}</small>
      ${dimbaar && aan ? `<input type="range" min="1" max="100" value="${pct || 100}" data-a="dim" data-e="${a.entity}"/>` : ''}</div>`;
  }
  /* ── bedieningspaneel per categorie (tik op airco/rolluik/speaker/ventilator, of ⋯, of lang drukken op een lamp) ── */
  _paneelHtml(id) {
    const h = this._hass, s = h.states[id], at = s.attributes, dom = id.split('.')[0], aan = isAan(s), T = this.t.bind(this);
    const kop = `<div class="pkop"><ha-icon icon="${esc(at.icon || ICOON[dom][aan ? 1 : 0])}"></ha-icon><b>${esc(at.friendly_name || id)}</b>
      <button class="rond ${aan ? 'aan' : ''}" style="--k:var(--primary-color)" data-a="${dom === 'climate' ? 'klimaat-aan' : dom === 'cover' ? 'cover-wissel' : 'schakel'}" data-e="${id}" title="${esc(T('aanUit'))}"><ha-icon icon="mdi:power"></ha-icon></button></div>`;
    const chips = (lijst, act, huidig, label = (x) => x) => `<div class="pchips">${lijst.map((x) => `<button class="chip ${x === huidig ? 'aan' : ''}" data-a="${act}" data-e="${id}" data-v="${esc(x)}">${esc(label(x))}</button>`).join('')}</div>`;
    let b = '';
    if (dom === 'climate') {
      const doel = at.temperature ?? at.target_temp_high;
      b = `<div class="pgroot">${doel != null ? `<button class="rond groot" data-a="temp" data-e="${id}" data-n="-1">−</button><span class="ptemp">${doel}°<small>${at.current_temperature != null ? `${esc(T('nuBinnen'))} ${at.current_temperature}°` : ''}</small></span><button class="rond groot" data-a="temp" data-e="${id}" data-n="1">+</button>`
          : `<span class="ptemp">${at.current_temperature != null ? at.current_temperature + '°' : ''}</span>`}</div>
        <div class="plbl">${esc(T('stand'))}</div>${chips(at.hvac_modes || [], 'hvac', s.state, (m) => `${MODUS_ICOON[m] || ''} ${T('modus')[m] || m}`)}
        ${(at.fan_modes || []).length ? `<div class="plbl">${esc(T('ventilator'))}</div>${chips(at.fan_modes, 'fanmode', at.fan_mode, (m) => T('snelheid')[m] || m)}` : ''}
        ${(at.preset_modes || []).length ? `<div class="plbl">${esc(T('voorkeur'))}</div>${chips(at.preset_modes, 'preset', at.preset_mode, (m) => T('presets')[m] || m)}` : ''}
        ${(at.swing_modes || []).length ? `<div class="plbl">${esc(T('zwenken'))}</div>${chips(at.swing_modes, 'swing', at.swing_mode, (m) => T('presets')[m] || m)}` : ''}`;
    } else if (dom === 'light') {
      const modi = at.supported_color_modes || [], pct = at.brightness != null ? Math.round(at.brightness / 2.55) : 0;
      b = `${modi.some((m) => m !== 'onoff') ? `<div class="plbl">${esc(T('helderheid'))} ${aan ? pct + '%' : ''}</div><input type="range" min="1" max="100" value="${pct || 100}" data-a="dim" data-e="${id}"/>` : ''}
        ${modi.includes('color_temp') ? `<div class="plbl">${esc(T('licht'))}</div>${chips(['2700', '4000', '6000'], 'ct', String(at.color_temp_kelvin && (at.color_temp_kelvin < 3300 ? 2700 : at.color_temp_kelvin < 5000 ? 4000 : 6000)), (k) => T('kleurtemp')[k])}` : ''}
        ${modi.some((m) => ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(m)) ? `<div class="plbl">${esc(T('kleur'))}</div><div class="pchips">${KLEUREN.map((c) => `<button class="kleurbol" style="background:rgb(${c})" data-a="rgb" data-e="${id}" data-v="${c}"></button>`).join('')}</div>` : ''}`;
    } else if (dom === 'cover') {
      b = `<div class="pgroot"><button class="rond groot" data-a="cover" data-s="open_cover" data-e="${id}"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
          <button class="rond groot" data-a="cover" data-s="stop_cover" data-e="${id}"><ha-icon icon="mdi:stop"></ha-icon></button>
          <button class="rond groot" data-a="cover" data-s="close_cover" data-e="${id}"><ha-icon icon="mdi:arrow-down"></ha-icon></button></div>
        ${at.current_position != null ? `<div class="plbl">${esc(T('stand'))} ${at.current_position}%</div><input type="range" min="0" max="100" value="${at.current_position}" data-a="pos" data-e="${id}"/>` : ''}`;
    } else if (dom === 'media_player') {
      b = `${at.media_title ? `<div class="sub" style="margin:4px 0 10px">${esc(at.media_title)}${at.media_artist ? ` · ${esc(at.media_artist)}` : ''}</div>` : ''}
        <div class="pgroot"><button class="rond groot" data-a="mp" data-s="media_previous_track" data-e="${id}"><ha-icon icon="mdi:skip-previous"></ha-icon></button>
          <button class="rond groot aan" style="--k:var(--primary-color)" data-a="mp" data-s="media_play_pause" data-e="${id}"><ha-icon icon="${s.state === 'playing' ? 'mdi:pause' : 'mdi:play'}"></ha-icon></button>
          <button class="rond groot" data-a="mp" data-s="media_next_track" data-e="${id}"><ha-icon icon="mdi:skip-next"></ha-icon></button></div>
        ${at.volume_level != null ? `<div class="plbl">${esc(T('volume'))} ${Math.round(at.volume_level * 100)}%</div><input type="range" min="0" max="100" value="${Math.round(at.volume_level * 100)}" data-a="vol" data-e="${id}"/>` : ''}`;
    } else if (dom === 'fan') {
      b = `${at.percentage != null ? `<div class="plbl">${esc(T('snelheidLbl'))} ${at.percentage}%</div><input type="range" min="0" max="100" step="${at.percentage_step || 1}" value="${at.percentage}" data-a="pct" data-e="${id}"/>` : ''}
        ${(at.preset_modes || []).length ? `<div class="plbl">${esc(T('voorkeur'))}</div>${chips(at.preset_modes, 'fanpreset', at.preset_mode, (m) => T('presets')[m] || m)}` : ''}`;
    }
    return `<div class="achter" data-a="sluit"><div class="paneel">${kop}${b}<div class="pvoet"><button class="fam-knop rand" data-a="sluit">${esc(T('klaar'))}</button></div></div></div>`;
  }

  _rij(k) {
    // compact: kamernaam met temperatuur, daaronder knoppen mét naam (wat is wat), aan = gekleurd
    const h = this._hass;
    return `<div class="rij"><div class="nm"><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon><span>${esc(k.naam)}</span><small>${esc(this._temp(k))}</small></div>
      <div class="apps">${k.apps.map((a) => {
        const s = h.states[a.entity], aan = isAan(s), naam = this._kort(a.naam, k.naam), at = s.attributes;
        if (a.domein === 'climate') {
          const doel = at.temperature ?? at.target_temp_high;
          return `<button class="pil ${aan ? 'aan' : ''}" style="--k:${s.state === 'heat' ? '#f4511e' : '#039be5'}" data-a="open" data-e="${a.entity}" title="${esc(a.naam)}">
            <ha-icon icon="mdi:air-conditioner"></ha-icon><span>${esc(naam)}</span>${aan && doel != null ? `<b>${doel}°</b>` : `<small>${esc(this.t('uit'))}</small>`}</button>`;
        }
        const kleur = a.domein === 'light' ? (at.rgb_color ? `rgb(${at.rgb_color.join(',')})` : '#ffb300') : a.domein === 'cover' ? '#7e57c2' : a.domein === 'fan' ? '#26a69a' : a.domein === 'media_player' ? '#5c6bc0' : '#43a047';
        const actie = ['cover', 'media_player', 'fan'].includes(a.domein) ? 'open' : 'schakel';
        return `<button class="pil ${aan ? 'aan' : ''}" style="--k:${kleur}" data-a="${actie}" data-e="${a.entity}" title="${esc(a.naam)}">
          <ha-icon icon="${esc(at.icon || ICOON[a.domein][aan ? 1 : 0])}"></ha-icon><span>${esc(naam)}</span><small class="st">${esc(this.t(aan ? 'aan' : 'uit'))}</small></button>`;
      }).join('')}</div></div>`;
  }

  async _dienst(domein, dienst, data) {
    try { await this._hass.callService(domein, dienst, data); }
    catch (e) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: e.message }, bubbles: true, composed: true })); }
  }
  async _klik(e) {
    if (e.target.type === 'range') return;            // het schuifje zelf, niet de tegel eronder
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    if (this._langGedaan) { this._langGedaan = false; return; }   // was lang drukken: niet ook nog schakelen
    if (b.classList.contains('slot')) return this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: `🔒 ${this.t('slot')}` }, bubbles: true, composed: true }));
    const a = b.dataset.a, id = b.dataset.e, h = this._hass, s = id && h.states[id];
    if (a === 'bewerkmodus') { this._bewerk = !this._bewerk; return this._teken(); }
    if (a === 'b-tonen') {
      try { await h.callWS({ type: 'ha_family/apparaat/tonen', entity: id, tonen: !!b.dataset.t }); this._d = await h.callWS({ type: 'ha_family/huis' }); this._teken(); }
      catch (er) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: er.message }, bubbles: true, composed: true })); }
      return;
    }
    if (a === 'sluit') { if (e.target === b || b.tagName === 'BUTTON') { this._paneel = null; this._teken(); } return; }
    if (a === 'open') { this._paneel = id; return this._teken(); }
    if (a === 'hvac') return this._dienst('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: b.dataset.v });
    if (a === 'fanmode') return this._dienst('climate', 'set_fan_mode', { entity_id: id, fan_mode: b.dataset.v });
    if (a === 'preset') return this._dienst('climate', 'set_preset_mode', { entity_id: id, preset_mode: b.dataset.v });
    if (a === 'swing') return this._dienst('climate', 'set_swing_mode', { entity_id: id, swing_mode: b.dataset.v });
    if (a === 'ct') return this._dienst('light', 'turn_on', { entity_id: id, color_temp_kelvin: Number(b.dataset.v) });
    if (a === 'rgb') return this._dienst('light', 'turn_on', { entity_id: id, rgb_color: b.dataset.v.split(',').map(Number) });
    if (a === 'mp') return this._dienst('media_player', b.dataset.s, { entity_id: id });
    if (a === 'fanpreset') return this._dienst('fan', 'set_preset_mode', { entity_id: id, preset_mode: b.dataset.v });
    if (a === 'instellen') { history.pushState(null, '', '/gezin-beheer'); window.dispatchEvent(new CustomEvent('location-changed')); return; }
    if (a === 'schakel') {
      const dom = id.split('.')[0];
      // de koelkast of vriezer niet per ongeluk uitzetten
      if (isAan(s) && /koel|vries|freezer|fridge/i.test(s.attributes.friendly_name || id) && !confirm(this.t('zekerUit').replace('{x}', s.attributes.friendly_name || id))) return;
      if (dom === 'media_player') return this._dienst('media_player', s.state === 'playing' ? 'media_pause' : s.state === 'off' ? 'turn_on' : 'media_play', { entity_id: id });
      return this._dienst(dom === 'switch' || dom === 'fan' || dom === 'light' ? dom : 'homeassistant', 'toggle', { entity_id: id });
    }
    if (a === 'alles-uit') {
      const ids = this._d.apparaten.filter((x) => x.kamer === b.dataset.k && (x.domein === 'light' || x.domein === 'switch') && isAan(h.states[x.entity])).map((x) => x.entity);
      return this._dienst('homeassistant', 'turn_off', { entity_id: ids });
    }
    if (a === 'cover') return this._dienst('cover', b.dataset.s, { entity_id: id });
    if (a === 'cover-wissel') return this._dienst('cover', isAan(s) ? 'close_cover' : 'open_cover', { entity_id: id });
    if (a === 'klimaat-aan') {
      if (s.state !== 'off') return this._dienst('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: 'off' });
      const modi = s.attributes.hvac_modes || [], terug = ['heat_cool', 'auto', 'cool', 'heat'].find((m) => modi.includes(m)) || modi.find((m) => m !== 'off');
      return this._dienst('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: terug });
    }
    if (a === 'temp') {
      const at = s.attributes, stap = at.target_temp_step || (h.config.unit_system.temperature === '°F' ? 1 : 0.5), n = Number(b.dataset.n) * stap;
      if (at.temperature != null) {
        const doel = Math.min(at.max_temp ?? 35, Math.max(at.min_temp ?? 7, Math.round((at.temperature + n) * 10) / 10));
        return this._dienst('climate', 'set_temperature', { entity_id: id, temperature: doel });
      }
      if (at.target_temp_high != null) return this._dienst('climate', 'set_temperature', { entity_id: id, target_temp_low: at.target_temp_low + n, target_temp_high: at.target_temp_high + n });
    }
  }
  async _wijzig(e) {
    if (e.target.dataset.a === 'b-kamer') {
      try { await this._hass.callWS({ type: 'ha_family/kamer/apparaat', entity: e.target.dataset.e, kamer: e.target.value || null }); this._d = await this._hass.callWS({ type: 'ha_family/huis' }); this._teken(); }
      catch (er) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: er.message }, bubbles: true, composed: true })); }
      return;
    }
    if (e.target.classList.contains('slot')) return;
    const id = e.target.dataset.e, v = Number(e.target.value);
    if (e.target.dataset.a === 'pos') { e.target.blur(); return this._dienst('cover', 'set_cover_position', { entity_id: id, position: v }).then(() => this._teken()); }
    if (e.target.dataset.a === 'vol') { e.target.blur(); return this._dienst('media_player', 'volume_set', { entity_id: id, volume_level: v / 100 }).then(() => this._teken()); }
    if (e.target.dataset.a === 'pct') { e.target.blur(); return this._dienst('fan', 'set_percentage', { entity_id: id, percentage: v }).then(() => this._teken()); }
    if (e.target.dataset.a === 'dim') e.target.blur(), this._dienst('light', 'turn_on', { entity_id: e.target.dataset.e, brightness_pct: Number(e.target.value) }).then(() => this._teken());
  }
}

export const HUIS_KAARTEN = [
  ['family-kamers-card', FamilyKamersCard, 'HA Family: kamers', 'Lampen, airco en meer, per kamer. Tikken is aan/uit.'],
];
