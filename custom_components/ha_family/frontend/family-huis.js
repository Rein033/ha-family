/* HA Family — kamers (HA-Family-Cards).
 *
 *   type: custom:family-kamers-card     per kamer de lampen, airco/thermostaat, ventilatoren, rolluiken, stopcontacten en speakers
 *     compact: true                     kort: per kamer één rij met ronde knoppen (startscherm, muurscherm)
 *     kamer: <ruimte-id>                alleen deze kamer
 *
 * Kamers zijn de ruimtes van Home Assistant; instellen in Gezin beheren → Huis. Tikken = aan/uit. */
import { CSS, esc, ikLid } from './family-ui.js?v=0.8.0';

const TEKST = {
  nl: { kamers: 'Huis', aan: 'Aan', uit: 'Uit', open: 'Open', dicht: 'Dicht', speelt: 'Speelt', alleUit: 'Alles uit', geen: 'Nog geen kamers met apparaten.',
    instellen: 'Kamers instellen', nuBinnen: 'nu', modus: { off: 'Uit', heat: 'Verwarmen', cool: 'Koelen', heat_cool: 'Automatisch', auto: 'Automatisch', dry: 'Drogen', fan_only: 'Ventileren' },
    lampenAan: '{x} aan', zonder: 'Zonder kamer', slot: 'Dit mag je bekijken, maar niet bedienen.' },
  en: { kamers: 'Home', aan: 'On', uit: 'Off', open: 'Open', dicht: 'Closed', speelt: 'Playing', alleUit: 'All off', geen: 'No rooms with devices yet.',
    instellen: 'Set up rooms', nuBinnen: 'now', modus: { off: 'Off', heat: 'Heating', cool: 'Cooling', heat_cool: 'Auto', auto: 'Auto', dry: 'Dry', fan_only: 'Fan' },
    lampenAan: '{x} on', zonder: 'No room', slot: 'You can see this, but not control it.' },
};
const ICOON = { light: ['mdi:lightbulb-outline', 'mdi:lightbulb'], climate: ['mdi:air-conditioner', 'mdi:air-conditioner'], fan: ['mdi:fan-off', 'mdi:fan'],
  cover: ['mdi:window-shutter', 'mdi:window-shutter-open'], switch: ['mdi:power-socket-eu', 'mdi:power-socket-eu'], media_player: ['mdi:speaker-off', 'mdi:speaker'] };
const isAan = (s) => !!s && ['on', 'open', 'opening', 'playing', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'].includes(s.state);
const taalVan = (h) => (((h && h.locale && h.locale.language) || 'en').startsWith('nl') ? 'nl' : 'en');

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
  .slot { opacity: .5; cursor: not-allowed !important; }
  .slot input[type=range] { pointer-events: none; }
  .leeg { color: var(--secondary-text-color); text-align: center; padding: 8px 0; display: grid; gap: 8px; justify-items: center; }
  .naar { border: 0; background: none; color: var(--primary-color); font: inherit; cursor: pointer; padding: 0; }
  :host([muur]) ha-card { border-radius: 24px; padding: 14px 18px; }
  :host([muur]) .kop .titel { font-size: 1.25rem; }
  :host([muur]) .kop { margin-bottom: 2px; }
  :host([muur]) .rij { padding: 5px 0; }
  :host([muur]) .pil { font-size: .8rem; padding: 5px 10px 5px 7px; }
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
  _kamers() {
    const d = this._d, h = this._hass, mag = this._mag();
    const per = d.kamers.filter((k) => !k.verborgen && (!this._config.kamer || k.kamer === this._config.kamer))
      .map((k) => ({ ...k, apps: d.apparaten.filter((a) => a.kamer === k.kamer && a.tonen && (!mag || mag.zien.includes(a.entity)) && h.states[a.entity] && !['unavailable', 'unknown'].includes(h.states[a.entity].state)) }))
      .filter((k) => k.apps.length);
    return per;
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
    const titel = c.titel === false ? '' : `<div class="kop"><div class="titel">🏠 ${esc(c.titel || this.t('kamers'))}</div></div>`;
    // focus van een schuifje bewaren: anders springt hij weg terwijl je sleept
    if (this.shadowRoot.activeElement && this.shadowRoot.activeElement.type === 'range') return;
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${titel}${binnen}</ha-card>`;
    const mag = this._mag();
    if (mag) this.shadowRoot.querySelectorAll('[data-e]').forEach((el) => { if (!mag.bedienen.includes(el.dataset.e)) { el.classList.add('slot'); el.title = this.t('slot'); } });
  }

  _kamer(k) {
    const h = this._hass, lampenAan = k.apps.filter((a) => (a.domein === 'light' || a.domein === 'switch') && isAan(h.states[a.entity]));
    return `<div class="kamer"><h3><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon>${esc(k.naam)}
        ${lampenAan.length > 1 ? `<button class="alles" data-a="alles-uit" data-k="${k.kamer}">${esc(this.t('alleUit'))}</button>` : ''}<span class="t">${esc(this._temp(k))}</span></h3>
      <div class="tegels">${k.apps.map((a) => this._tegel(a, k)).join('')}</div></div>`;
  }
  _tegel(a, k) {
    const s = this._hass.states[a.entity], aan = isAan(s), naam = esc(this._kort(a.naam, k.naam)), ic = ICOON[a.domein][aan ? 1 : 0], at = s.attributes;
    const icoon = `<ha-icon icon="${esc(at.icon || ic)}"></ha-icon>`;
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
  _rij(k) {
    // compact: kamernaam met temperatuur, daaronder knoppen mét naam (wat is wat), aan = gekleurd
    const h = this._hass;
    return `<div class="rij"><div class="nm"><ha-icon icon="${esc(k.icoon || 'mdi:home')}"></ha-icon><span>${esc(k.naam)}</span><small>${esc(this._temp(k))}</small></div>
      <div class="apps">${k.apps.map((a) => {
        const s = h.states[a.entity], aan = isAan(s), naam = this._kort(a.naam, k.naam), at = s.attributes;
        if (a.domein === 'climate') {
          const doel = at.temperature ?? at.target_temp_high;
          return `<button class="pil ${aan ? 'aan' : ''}" style="--k:${s.state === 'heat' ? '#f4511e' : '#039be5'}" data-a="klimaat-aan" data-e="${a.entity}" title="${esc(a.naam)}">
            <ha-icon icon="mdi:air-conditioner"></ha-icon><span>${esc(naam)}</span>${aan && doel != null ? `<b>${doel}°</b>` : `<small>${esc(this.t('uit'))}</small>`}</button>`;
        }
        const kleur = a.domein === 'light' ? (at.rgb_color ? `rgb(${at.rgb_color.join(',')})` : '#ffb300') : a.domein === 'cover' ? '#7e57c2' : a.domein === 'fan' ? '#26a69a' : a.domein === 'media_player' ? '#5c6bc0' : '#43a047';
        return `<button class="pil ${aan ? 'aan' : ''}" style="--k:${kleur}" data-a="${a.domein === 'cover' ? 'cover-wissel' : 'schakel'}" data-e="${a.entity}" title="${esc(a.naam)}">
          <ha-icon icon="${esc(at.icon || ICOON[a.domein][aan ? 1 : 0])}"></ha-icon><span>${esc(naam)}</span></button>`;
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
    if (b.classList.contains('slot')) return this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: `🔒 ${this.t('slot')}` }, bubbles: true, composed: true }));
    const a = b.dataset.a, id = b.dataset.e, h = this._hass, s = id && h.states[id];
    if (a === 'instellen') { history.pushState(null, '', '/gezin-beheer'); window.dispatchEvent(new CustomEvent('location-changed')); return; }
    if (a === 'schakel') {
      const dom = id.split('.')[0];
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
  _wijzig(e) {
    if (e.target.classList.contains('slot')) return;
    if (e.target.dataset.a === 'dim') e.target.blur(), this._dienst('light', 'turn_on', { entity_id: e.target.dataset.e, brightness_pct: Number(e.target.value) }).then(() => this._teken());
  }
}

export const HUIS_KAARTEN = [
  ['family-kamers-card', FamilyKamersCard, 'HA Family: kamers', 'Lampen, airco en meer, per kamer. Tikken is aan/uit.'],
];
