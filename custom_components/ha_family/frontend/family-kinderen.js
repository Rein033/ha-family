/* HA Family — kinderen: routines en zakgeld (HA-Family-Cards).
 *
 *   type: custom:family-kinderen-card        ochtend- en avondroutine om af te vinken, en zakgeld (ouders: alle kinderen)
 *   type: custom:family-kinderen-card
 *   mijn: true                               alleen van wie kijkt (voor het eigen tabblad; verdwijnt bij volwassenen)
 *
 * Kinderen vinken met grote knoppen af (ook op de muur). Ouders passen de stappen aan en regelen het zakgeld. */
import { CSS, alsAntwoord, avatar, esc, leden } from './family-ui.js?v=0.13.0';

const TEKST = {
  nl: { titel: 'Kinderen', ochtend: '☀️ Ochtend', avond: '🌙 Avond', klaar: 'Helemaal klaar! 🎉', van: '{x} van {y}', punten: '+{x} punten als alles af is',
    aanpassen: 'Aanpassen', bewaren: 'Bewaren', annuleren: 'Annuleren', stap: 'Nieuwe stap', erbij: '+ Stap', puntenVraag: 'Punten als alles af is', weg: 'Weg',
    zakgeld: '💰 Zakgeld', saldo: 'Je hebt', saldoVan: '{x} heeft', elke: 'Elke {x} {y}', geenZakgeld: 'Nog geen vast zakgeld.', instellen: 'Instellen',
    bij: '+ Erbij', af: '− Eraf', uitgegeven: 'Ik gaf uit', bedrag: 'Bedrag', waarvoor: 'Waarvoor? (bijv. snoep, cadeautje)', aan: 'Vast zakgeld',
    dag: 'Op', geenKinderen: 'Er zijn (nog) geen kinderen in het gezin.', geschiedenis: 'Laatste boekingen', standaard: 'Voorbeeld: pas het aan zoals het bij jullie gaat.' },
  en: { titel: 'Kids', ochtend: '☀️ Morning', avond: '🌙 Evening', klaar: 'All done! 🎉', van: '{x} of {y}', punten: '+{x} points when everything is done',
    aanpassen: 'Edit', bewaren: 'Save', annuleren: 'Cancel', stap: 'New step', erbij: '+ Step', puntenVraag: 'Points when everything is done', weg: 'Remove',
    zakgeld: '💰 Pocket money', saldo: 'You have', saldoVan: '{x} has', elke: 'Every {x} {y}', geenZakgeld: 'No regular pocket money yet.', instellen: 'Set up',
    bij: '+ Add', af: '− Take off', uitgegeven: 'I spent', bedrag: 'Amount', waarvoor: 'What for? (e.g. sweets, a present)', aan: 'Regular pocket money',
    dag: 'On', geenKinderen: 'There are no kids in the family (yet).', geschiedenis: 'Latest entries', standaard: 'Example: change it to fit your family.' },
};
const taalVan = (h) => (((h && (h.config && h.config.language || h.locale && h.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');
const DAGEN_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const geld = (b) => `€ ${Number(b || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getal = (s) => Number(String(s || '').replace(',', '.').replace(/[^\d.-]/g, ''));

const STIJL = `
  ha-card { padding: 16px; }
  .wie { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 10px; }
  .wie button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 2px; padding: 8px 12px; border-radius: 18px; opacity: .55; }
  .wie button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 15%, transparent); }
  .twee { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
  @media (max-width: 800px) { .twee { grid-template-columns: 1fr; } }
  :host([smal]) .twee { grid-template-columns: 1fr; }
  .vak { background: var(--secondary-background-color); border-radius: 20px; padding: 14px; }
  .vak h3 { margin: 0 0 10px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .vak h3 .r { margin-left: auto; }
  .delen { display: flex; gap: 6px; margin-bottom: 10px; }
  .delen button { border: 0; font: inherit; font-weight: 600; flex: 1; min-height: 44px; border-radius: 999px; cursor: pointer; background: var(--card-background-color); color: var(--primary-text-color); }
  .delen button.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .stappen { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .stap { border: 0; cursor: pointer; font: inherit; color: var(--primary-text-color); background: var(--card-background-color); border-radius: 20px; padding: 14px 8px;
    display: grid; justify-items: center; gap: 6px; min-height: 108px; position: relative; box-shadow: inset 0 0 0 2px var(--divider-color); }
  .stap .em { font-size: 2.3rem; line-height: 1; }
  .stap b { font-size: .95rem; text-align: center; }
  .stap.af { background: color-mix(in srgb, var(--success-color, #43a047) 18%, var(--card-background-color)); box-shadow: inset 0 0 0 2px var(--success-color, #43a047); }
  .stap.af::after { content: '✓'; position: absolute; top: 8px; right: 12px; font-weight: 800; color: var(--success-color, #2e7d32); font-size: 1.2rem; }
  .balk { height: 10px; border-radius: 999px; background: var(--card-background-color); overflow: hidden; margin: 12px 0 4px; }
  .balk i { display: block; height: 100%; background: var(--success-color, #43a047); transition: width .3s; }
  .sub { color: var(--secondary-text-color); font-size: .88rem; }
  .klaar { text-align: center; font-size: 1.2rem; font-weight: 700; color: var(--success-color, #2e7d32); margin-top: 8px; }
  .saldo { font-size: 2.2rem; font-weight: 800; margin: 2px 0 4px; }
  .rij { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
  .veld { box-sizing: border-box; font: inherit; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
  .veld.em { width: 3.4em; text-align: center; } .veld.groei { flex: 1; min-width: 120px; } .veld.kort { width: 6.5em; }
  .boek { display: flex; gap: 8px; padding: 7px 2px; border-bottom: 1px solid var(--divider-color); font-size: .92rem; }
  .boek:last-child { border-bottom: 0; } .boek span { flex: 1; min-width: 0; } .boek b.min { color: var(--error-color, #db4437); } .boek b.plus { color: var(--success-color, #2e7d32); }
  .x { border: 0; background: none; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; color: var(--secondary-text-color); }
  .leeg { color: var(--secondary-text-color); padding: 8px 0; }
`;

class FamilyKinderenCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x, y) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return String(v).replaceAll('{x}', x ?? '').replaceAll('{y}', y ?? ''); }

  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (eerste) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this._laad();
      this._klok = setInterval(() => { if (this.isConnected && !this._bewerk && !this._typt()) this._laad(); }, 120000);
    }
  }
  _typt() { const a = this.shadowRoot && this.shadowRoot.activeElement; return a && ['INPUT', 'SELECT'].includes(a.tagName); }
  async _laad() {
    try { this._d = alsAntwoord(this._hass, await this._hass.callWS({ type: 'ha_family/kinderen' })); this._fout = null; } catch (e) { this._fout = e.message; }
    const d = this._d;
    if (d) {
      if (this._config.mijn) d.kinderen = d.kinderen.filter((k) => k.lid === d.ik);
      if (this._config.muur) d.kinderen = d.kinderen.filter((k) => !k.routine.standaard);   // op de muur alleen routines die ouders echt instelden
      if (!this._kies || !d.kinderen.some((k) => k.lid === this._kies)) this._kies = (d.kinderen.find((k) => k.lid === d.ik) || d.kinderen[0] || {}).lid;
      if (!this._deel) this._deel = d.nu;
    }
    this._teken();
  }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  async _ws(type, data) {
    try { const r = await this._hass.callWS({ type, ...data }); await this._laad(); return r ?? true; } catch (e) { this._melding(e.message); return null; }
  }

  _teken() {
    if (!this.shadowRoot) return;
    const d = this._d;
    if (d && !d.kinderen.length && (this._config.mijn || this._config.muur)) { this.shadowRoot.innerHTML = ''; this.style.display = 'none'; return; }
    this.style.display = '';
    this.toggleAttribute('smal', !!(this._config.mijn || this._config.muur));
    let binnen;
    if (this._fout) binnen = `<div class="leeg">${esc(this._fout)}</div>`;
    else if (!d) binnen = '<div class="leeg">…</div>';
    else if (!d.kinderen.length) binnen = `<div class="leeg">${esc(this.t('geenKinderen'))}</div>`;
    else binnen = this._inhoud();
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${this._config.mijn ? '' : `<div style="font-size:1.3rem;font-weight:600;margin-bottom:8px">${this._config.muur ? esc(this.t(this._deel || 'ochtend')) : '🧒 ' + esc(this.t('titel'))}</div>`}${binnen}</ha-card>`;
  }

  _inhoud() {
    const d = this._d, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const k = d.kinderen.find((x) => x.lid === this._kies);
    const wie = d.kinderen.length > 1 ? `<div class="wie">${d.kinderen.map((x) => { const l = lmap[x.lid] || { naam: x.naam, kleur: '#7c4dff' };
      return `<button class="${x.lid === this._kies ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="kies" data-l="${x.lid}">${avatar(l, { grootte: 44 })}<b>${esc(x.naam.split(' ')[0])}</b></button>`; }).join('')}</div>` : '';
    return `${wie}<div class="twee">${this._routine(k)}${k.zakgeld ? this._zakgeld(k) : ''}</div>`;
  }

  _routine(k) {
    const d = this._d, deel = this._deel, r = k.routine, stappen = r[deel] || [], af = k.af[deel] || [];
    const delen = `<div class="delen">${['ochtend', 'avond'].map((x) => `<button class="${x === deel ? 'aan' : ''}" data-a="deel" data-v="${x}">${esc(this.t(x))}</button>`).join('')}</div>`;
    if (this._bewerk) {
      const b = this._bewerk;
      return `<div class="vak"><h3>${esc(this.t(deel))} · ${esc(this.t('aanpassen'))}</h3>
        ${b.stappen.map((s, n) => `<div class="rij" style="margin-top:6px"><input class="veld em" data-n="${n}" data-v="emoji" value="${esc(s.emoji)}" maxlength="4"/>
          <input class="veld groei" data-n="${n}" data-v="titel" value="${esc(s.titel)}" maxlength="60"/><button class="x" data-a="stap-weg" data-n="${n}" title="${esc(this.t('weg'))}">🗑️</button></div>`).join('')}
        <div class="rij"><button class="fam-knop zacht" data-a="stap-bij">${esc(this.t('erbij'))}</button></div>
        <div class="rij"><span class="sub">${esc(this.t('puntenVraag'))}</span><input class="veld kort" id="r-punten" type="number" min="0" max="20" value="${b.punten}"/></div>
        <div class="rij" style="justify-content:flex-end"><button class="fam-knop rand" data-a="bewerk-stop">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="bewerk-ok">${esc(this.t('bewaren'))}</button></div></div>`;
    }
    const klaar = stappen.length && stappen.every((s) => af.includes(s.id));
    const pct = stappen.length ? Math.round(100 * stappen.filter((s) => af.includes(s.id)).length / stappen.length) : 0;
    return `<div class="vak"><h3>${esc(k.naam.split(' ')[0])}${d.ouder ? `<button class="fam-knop rand r" data-a="bewerk" style="min-height:34px">✏️ ${esc(this.t('aanpassen'))}</button>` : ''}</h3>${delen}
      <div class="stappen">${stappen.map((s) => `<button class="stap ${af.includes(s.id) ? 'af' : ''}" data-a="af" data-s="${esc(s.id)}" data-af="${af.includes(s.id) ? '' : '1'}"><span class="em">${esc(s.emoji)}</span><b>${esc(s.titel)}</b></button>`).join('')}</div>
      <div class="balk"><i style="width:${pct}%"></i></div>
      <div class="sub">${esc(this.t('van', stappen.filter((s) => af.includes(s.id)).length, stappen.length))}${r.punten ? ` · ⭐ ${esc(this.t('punten', r.punten))}` : ''}</div>
      ${klaar ? `<div class="klaar">${esc(this.t('klaar'))}</div>` : ''}${r.standaard && d.ouder ? `<p class="sub">💡 ${esc(this.t('standaard'))}</p>` : ''}</div>`;
  }

  _zakgeld(k) {
    const d = this._d, z = k.zakgeld, zelf = k.lid === d.ik, nl = taalVan(this._hass) === 'nl';
    const dag = (nl ? d.dagen : DAGEN_EN)[z.dag];
    const f = this._geld;
    let form = '';
    if (f && f.soort === 'instellen') {
      form = `<div class="rij"><label><input type="checkbox" id="z-aan" ${f.aan ? 'checked' : ''}/> ${esc(this.t('aan'))}</label></div>
        <div class="rij"><input class="veld kort" id="z-bedrag" inputmode="decimal" value="${esc(String(f.bedrag).replace('.', ','))}"/>
          <span class="sub">${esc(this.t('dag'))}</span><select class="veld" id="z-dag">${(nl ? d.dagen : DAGEN_EN).map((n, i) => `<option value="${i}" ${i === f.dag ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="rij" style="justify-content:flex-end"><button class="fam-knop rand" data-a="geld-stop">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="geld-instellen">${esc(this.t('bewaren'))}</button></div>`;
    } else if (f) {
      form = `<div class="rij"><input class="veld kort" id="z-bedrag" inputmode="decimal" placeholder="${esc(this.t('bedrag'))}"/><input class="veld groei" id="z-tekst" maxlength="80" placeholder="${esc(this.t('waarvoor'))}"/></div>
        <div class="rij" style="justify-content:flex-end"><button class="fam-knop rand" data-a="geld-stop">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="geld-boek">${esc(this.t('bewaren'))}</button></div>`;
    }
    return `<div class="vak"><h3>${esc(this.t('zakgeld'))}${d.ouder && !f ? `<button class="fam-knop rand r" data-a="geld-open" data-s="instellen" style="min-height:34px">⚙️ ${esc(this.t('instellen'))}</button>` : ''}</h3>
      <div class="sub">${esc(zelf ? this.t('saldo') : this.t('saldoVan', k.naam.split(' ')[0]))}</div><div class="saldo">${esc(geld(z.saldo))}</div>
      <div class="sub">${z.aan && z.bedrag ? esc(this.t('elke', dag, geld(z.bedrag))) : esc(this.t('geenZakgeld'))}</div>
      ${!f ? `<div class="rij">${d.ouder ? `<button class="fam-knop zacht" data-a="geld-open" data-s="bij">${esc(this.t('bij'))}</button><button class="fam-knop zacht" data-a="geld-open" data-s="af">${esc(this.t('af'))}</button>`
        : `<button class="fam-knop zacht" data-a="geld-open" data-s="af">🛍️ ${esc(this.t('uitgegeven'))}</button>`}</div>` : form}
      ${z.boekingen.length ? `<div class="sub" style="margin-top:12px">${esc(this.t('geschiedenis'))}</div>${z.boekingen.slice(0, 8).map((b) => `<div class="boek"><span>${esc(b.tekst)} <small class="sub">${esc(new Date(b.datum).toLocaleDateString(this._hass.locale?.language || undefined, { day: 'numeric', month: 'short' }))}</small></span><b class="${b.bedrag < 0 ? 'min' : 'plus'}">${b.bedrag > 0 ? '+' : ''}${esc(geld(b.bedrag))}</b></div>`).join('')}` : ''}</div>`;
  }

  _leesBewerk() {
    if (!this._bewerk) return;
    this.shadowRoot.querySelectorAll('[data-n][data-v]').forEach((i) => { this._bewerk.stappen[Number(i.dataset.n)][i.dataset.v] = i.value; });
    const p = this.shadowRoot.getElementById('r-punten'); if (p) this._bewerk.punten = Number(p.value) || 0;
  }

  async _klik(e) {
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, q = (id) => this.shadowRoot.getElementById(id), k = this._d && this._d.kinderen.find((x) => x.lid === this._kies);
    if (a === 'kies') { this._kies = b.dataset.l; this._bewerk = null; this._geld = null; return this._teken(); }
    if (a === 'deel') { this._leesBewerk(); this._deel = b.dataset.v; if (this._bewerk) this._bewerk = { stappen: (k.routine[this._deel] || []).map((s) => ({ ...s })), punten: k.routine.punten || 0 }; return this._teken(); }
    if (a === 'af') {
      const af = !!b.dataset.af, lijst = k.af[this._deel];
      k.af[this._deel] = af ? [...lijst, b.dataset.s] : lijst.filter((x) => x !== b.dataset.s);    // meteen tonen, daarna de server
      this._teken();
      return this._ws('ha_family/routine/af', { lid: k.lid, deel: this._deel, stap: b.dataset.s, af });
    }
    if (a === 'bewerk') { this._bewerk = { stappen: (k.routine[this._deel] || []).map((s) => ({ ...s })), punten: k.routine.punten || 0 }; return this._teken(); }
    if (a === 'bewerk-stop') { this._bewerk = null; return this._teken(); }
    if (a === 'stap-bij') { this._leesBewerk(); this._bewerk.stappen.push({ emoji: '⭐', titel: '' }); this._teken(); const v = this.shadowRoot.querySelectorAll('[data-v=titel]'); if (v.length) v[v.length - 1].focus(); return; }
    if (a === 'stap-weg') { this._leesBewerk(); this._bewerk.stappen.splice(Number(b.dataset.n), 1); return this._teken(); }
    if (a === 'bewerk-ok') {
      this._leesBewerk();
      const r = await this._ws('ha_family/routine', { lid: k.lid, deel: this._deel, stappen: this._bewerk.stappen.filter((s) => s.titel.trim()), punten: this._bewerk.punten });
      if (r) { this._bewerk = null; this._teken(); }
      return;
    }
    if (a === 'geld-open') { this._geld = b.dataset.s === 'instellen' ? { soort: 'instellen', aan: k.zakgeld.aan || !k.zakgeld.bedrag, bedrag: k.zakgeld.bedrag || 2.5, dag: k.zakgeld.dag } : { soort: b.dataset.s }; this._teken(); const i = q('z-bedrag'); if (i) i.focus(); return; }
    if (a === 'geld-stop') { this._geld = null; return this._teken(); }
    if (a === 'geld-instellen') {
      if (await this._ws('ha_family/zakgeld', { lid: k.lid, aan: q('z-aan').checked, bedrag: getal(q('z-bedrag').value) || 0, dag: Number(q('z-dag').value) })) { this._geld = null; this._teken(); }
      return;
    }
    if (a === 'geld-boek') {
      const bedrag = Math.abs(getal(q('z-bedrag').value));
      if (!bedrag) return q('z-bedrag').focus();
      if (await this._ws('ha_family/zakgeld/boeking', { lid: k.lid, bedrag: this._geld.soort === 'bij' ? bedrag : -bedrag, tekst: q('z-tekst').value })) { this._geld = null; this._teken(); }
    }
  }
}

export const KINDER_KAARTEN = [
  ['family-kinderen-card', FamilyKinderenCard, 'HA Family: kinderen', 'Ochtend- en avondroutines om af te vinken, en zakgeld.'],
];
