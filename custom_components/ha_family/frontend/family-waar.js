/* HA Family — waar is iedereen (HA-Family-Cards).
 *
 *   type: custom:family-waar-card            wie is waar, "ik kom eraan" en een seintje als iemand thuiskomt
 *   type: custom:family-waar-card
 *   compact: true                            alleen "ik kom eraan", wie er onderweg is en de seintjes (voor Thuis)
 *
 * Plaatsen komen uit Home Assistant (Thuis, Weg of een zone, bijv. via Life360 of de app). Nooit coördinaten. */
import { CSS, alsAntwoord, avatar, esc, leden } from './family-ui.js?v=0.13.1';

const TEKST = {
  nl: { titel: 'Waar is iedereen', kom: 'Ik kom eraan', over: 'Over hoeveel minuten ben je thuis?', bericht: 'Berichtje erbij (mag leeg)', sturen: 'Laat het weten',
    annuleren: 'Annuleren', ben: 'Ik ben er', onderweg: 'onderweg', rond: 'rond {x}', nogMin: 'nog {x} min', telaat: 'had er al moeten zijn', thuis: 'Thuis', weg: 'Weg',
    onbekend: 'Onbekend', sinds: 'sinds {x}', seintje: 'Seintje als {x} thuiskomt', seintjes: 'Seintje bij thuiskomst', gemeld: '🚗 Doorgegeven aan {x}',
    niemandGemeld: 'Doorgegeven (er kreeg nog niemand een melding)', aanGezet: '🔔 Je krijgt een seintje als {x} thuis is', uitGezet: 'Geen seintje meer voor {x}',
    geenLid: 'Je bent (nog) geen gezinslid.', jij: 'jij', personen: 'gezinsleden', naar: 'Wie moet het weten?', iedereenThuis: 'Wie thuis is' },
  en: { titel: 'Where is everyone', kom: "I'm on my way", over: 'In how many minutes will you be home?', bericht: 'Add a message (optional)', sturen: 'Let them know',
    annuleren: 'Cancel', ben: "I'm here", onderweg: 'on the way', rond: 'around {x}', nogMin: '{x} min to go', telaat: 'should be home by now', thuis: 'Home', weg: 'Away',
    onbekend: 'Unknown', sinds: 'since {x}', seintje: 'Alert when {x} gets home', seintjes: 'Alert when home', gemeld: '🚗 Sent to {x}',
    niemandGemeld: 'Saved (nobody got a notification yet)', aanGezet: "🔔 You'll get an alert when {x} is home", uitGezet: 'No more alerts for {x}',
    geenLid: "You're not a family member (yet).", jij: 'you', personen: 'people', naar: 'Who should know?', iedereenThuis: 'Whoever is home' },
};
const taalVan = (h) => (((h && (h.config && h.config.language || h.locale && h.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');
const MINUTEN = [5, 10, 15, 20, 30, 45, 60, 90];

const STIJL = `
  ha-card { padding: 16px; }
  .kop { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .kop .titel { font-size: 1.2rem; font-weight: 600; flex: 1; }
  .leden { display: grid; gap: 8px; }
  .lid { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 16px; background: var(--secondary-background-color); }
  .lid .tk { flex: 1; min-width: 0; }
  .lid b { display: block; }
  .lid small { color: var(--secondary-text-color); }
  .lid small.thuis { color: var(--success-color, #2e7d32); font-weight: 600; }
  .ow { display: inline-flex; align-items: center; gap: 4px; margin-top: 3px; font-size: .85rem; padding: 2px 10px; border-radius: 999px;
    background: color-mix(in srgb, var(--k) 16%, transparent); color: var(--primary-text-color); }
  .ow.laat { background: color-mix(in srgb, var(--warning-color, #ffa600) 20%, transparent); }
  .bel { border: 0; background: none; cursor: pointer; width: 44px; height: 44px; border-radius: 50%; font-size: 1.25rem; opacity: .35; flex: none; }
  .bel.aan { opacity: 1; background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
  .acties { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
  .chip { border: 0; font: inherit; font-weight: 600; min-width: 56px; min-height: 44px; padding: 0 14px; border-radius: 999px; cursor: pointer;
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .chip.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .veld { width: 100%; box-sizing: border-box; font: inherit; padding: 12px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--card-background-color); color: var(--primary-text-color); }
  .sub { color: var(--secondary-text-color); font-size: .9rem; }
  .vak { background: var(--secondary-background-color); border-radius: 18px; padding: 14px; margin-bottom: 10px; }
  .rij { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; flex-wrap: wrap; }
  .ontv { display: flex; flex-wrap: wrap; gap: 6px; }
  .ontv button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 2px; padding: 6px; border-radius: 14px; opacity: .45; }
  .ontv button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 14%, transparent); }
  details summary { cursor: pointer; color: var(--secondary-text-color); font-size: .9rem; padding: 6px 2px; }
`;

class FamilyWaarCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return this._config && this._config.compact ? 2 : 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return x === undefined ? v : String(v).replaceAll('{x}', x); }

  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    const sleutel = leden(hass).map((l) => { const s = hass.states[l.person]; return s ? s.state + s.last_changed : ''; }).join();
    if (eerste) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this._klok = setInterval(() => { if (this.isConnected && !this._form) this._teken(); }, 60000);
    }
    if (eerste || sleutel !== this._sleutel) { this._sleutel = sleutel; this._laad(); }
  }
  disconnectedCallback() { /* klok blijft: HA hangt kaarten vaak opnieuw op dezelfde plek */ }
  async _laad() {
    try { this._d = alsAntwoord(this._hass, await this._hass.callWS({ type: 'ha_family/waar' })); this._fout = null; } catch (e) { this._fout = e.message; }
    if (!this._form) this._teken();
  }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  _tijd(iso) { return new Date(iso).toLocaleTimeString(this._hass.locale?.language || undefined, { hour: '2-digit', minute: '2-digit' }); }
  _sinds(iso) {
    const d = new Date(iso), nu = new Date();
    if (d.toDateString() === nu.toDateString()) return this.t('sinds', this._tijd(iso));
    return this.t('sinds', d.toLocaleDateString(this._hass.locale?.language || undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
  }
  _plek(x) { return x.plek === null ? this.t('onbekend') : x.plek === 'thuis' ? this.t('thuis') : x.plek === 'weg' ? this.t('weg') : x.plek; }
  _onderweg(o, kleur) {
    if (!o) return '';
    const min = Math.round((new Date(o.tot) - new Date()) / 60000);
    return `<span class="ow ${min < -5 ? 'laat' : ''}" style="--k:${esc(kleur)}">🚗 ${esc(min >= 1 ? this.t('nogMin', min) : min < -5 ? this.t('telaat') : this.t('onderweg'))} · ${esc(this.t('rond', this._tijd(o.tot)))}</span>
      ${o.bericht ? `<div class="sub">💬 ${esc(o.bericht)}</div>` : ''}`;
  }

  _teken() {
    if (!this.shadowRoot) return;
    const d = this._d, compact = !!this._config.compact;
    let binnen = '';
    if (this._fout) binnen = `<div class="sub">${esc(this._fout)}</div>`;
    else if (!d) binnen = '<div class="sub">…</div>';
    else binnen = this._inhoud(compact);
    if (compact && d && !binnen) { this.shadowRoot.innerHTML = ''; this.style.display = 'none'; return; }
    this.style.display = '';
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${compact ? '' : `<div class="kop"><span class="titel">📍 ${esc(this.t('titel'))}</span></div>`}${binnen}</ha-card>`;
  }

  _inhoud(compact) {
    const d = this._d, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const ik = d.leden.find((x) => x.lid === d.ik);
    if (this._form) return this._formulier();
    const knop = ik ? (ik.onderweg
      ? `<button class="fam-knop zacht" data-a="ben">🏠 ${esc(this.t('ben'))}</button>`
      : ik.thuis === true && compact ? '' : `<button class="fam-knop" data-a="kom">🚗 ${esc(this.t('kom'))}</button>`) : '';
    const rij = (x) => {
      const l = lmap[x.lid] || { naam: '?', kleur: '#7c4dff' }, zelf = x.lid === d.ik;
      return `<div class="lid">${avatar(l, { grootte: 44, stip: x.thuis === null ? null : x.thuis })}<span class="tk"><b>${esc(l.naam.split(' ')[0])}${zelf ? ` <small>(${esc(this.t('jij'))})</small>` : ''}</b>
        <small class="${x.thuis ? 'thuis' : ''}">${esc(this._plek(x))}${x.sinds ? ` · ${esc(this._sinds(x.sinds))}` : ''}</small>${this._onderweg(x.onderweg, l.kleur)}</span>
        ${!zelf && d.ik ? `<button class="bel ${x.ik_volg ? 'aan' : ''}" data-a="volg" data-l="${x.lid}" data-aan="${x.ik_volg ? '' : '1'}" title="${esc(this.t('seintje', l.naam.split(' ')[0]))}">🔔</button>` : ''}</div>`;
    };
    if (compact) {
      const ow = d.leden.filter((x) => x.onderweg);
      const seintjes = d.ik ? `<details><summary>🔔 ${esc(this.t('seintjes'))}</summary><div class="leden">${d.leden.filter((x) => x.lid !== d.ik).map(rij).join('')}</div></details>` : '';
      if (!knop && !ow.length && !seintjes) return '';
      return `${knop ? `<div class="acties">${knop}</div>` : ''}${ow.length ? `<div class="leden" style="margin-bottom:8px">${ow.map(rij).join('')}</div>` : ''}${seintjes}`;
    }
    return `${knop ? `<div class="acties">${knop}</div>` : ''}<div class="leden">${d.leden.map(rij).join('')}</div>`;
  }

  _formulier() {
    const f = this._form, d = this._d, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const anderen = d.leden.filter((x) => x.lid !== d.ik && lmap[x.lid]);
    return `<div class="vak"><b>🚗 ${esc(this.t('over'))}</b>
      <div class="chips">${MINUTEN.map((m) => `<button class="chip ${f.minuten === m ? 'aan' : ''}" data-a="min" data-v="${m}">${m}</button>`).join('')}</div>
      <input class="veld" id="bericht" maxlength="120" placeholder="${esc(this.t('bericht'))}" value="${esc(f.bericht || '')}"/>
      <div class="sub" style="margin:10px 0 4px">${esc(this.t('naar'))} <small>(${esc(f.naar.length ? '' : this.t('iedereenThuis'))})</small></div>
      <div class="ontv">${anderen.map((x) => { const l = lmap[x.lid]; return `<button class="${f.naar.includes(x.lid) ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="naar" data-l="${x.lid}">${avatar(l, { grootte: 40 })}<small>${esc(l.naam.split(' ')[0])}</small></button>`; }).join('')}</div>
      <div class="rij"><button class="fam-knop rand" data-a="annuleer">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="stuur">📤 ${esc(this.t('sturen'))}</button></div></div>`;
  }

  async _klik(e) {
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const bewaarBericht = () => { const v = this.shadowRoot.getElementById('bericht'); if (v && this._form) this._form.bericht = v.value; };
    if (a === 'kom') { this._form = { minuten: 15, bericht: '', naar: [] }; return this._teken(); }
    if (a === 'annuleer') { this._form = null; return this._teken(); }
    if (a === 'min') { bewaarBericht(); this._form.minuten = Number(b.dataset.v); return this._teken(); }
    if (a === 'naar') { bewaarBericht(); const n = this._form.naar, l = b.dataset.l; this._form.naar = n.includes(l) ? n.filter((x) => x !== l) : [...n, l]; return this._teken(); }
    if (a === 'stuur') {
      bewaarBericht();
      const f = this._form;
      try {
        const r = await this._hass.callWS({ type: 'ha_family/waar/onderweg', minuten: f.minuten, bericht: f.bericht || null, ...(f.naar.length ? { naar: f.naar } : {}) });
        this._melding(r.gemeld ? this.t('gemeld', f.naar.length ? f.naar.map((i) => lmap[i].naam.split(' ')[0]).join(', ') : `${r.gemeld} ${this.t('personen')}`) : this.t('niemandGemeld'));
        this._form = null;
      } catch (er) { this._melding(er.message); }
      return this._laad();
    }
    if (a === 'ben') { try { await this._hass.callWS({ type: 'ha_family/waar/thuis' }); } catch (er) { this._melding(er.message); } return this._laad(); }
    if (a === 'volg') {
      const aan = !!b.dataset.aan, naam = (lmap[b.dataset.l] || { naam: '' }).naam.split(' ')[0];
      try { await this._hass.callWS({ type: 'ha_family/waar/volgen', lid: b.dataset.l, aan }); this._melding(this.t(aan ? 'aanGezet' : 'uitGezet', naam)); } catch (er) { this._melding(er.message); }
      return this._laad();
    }
  }
}

export const WAAR_KAARTEN = [
  ['family-waar-card', FamilyWaarCard, 'HA Family: waar is iedereen', 'Wie is waar, "ik kom eraan" en een seintje als iemand thuiskomt.'],
];
