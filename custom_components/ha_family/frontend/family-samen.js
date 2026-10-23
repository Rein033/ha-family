/* HA Family — samen, voor stellen (HA-Family-Cards; uit Ons hokje).
 *
 *   type: custom:family-samen-card    stemming van vandaag, een knuffel sturen en de date-pot
 *
 * Alleen de twee van het stel zien dit (ook een beheerder niet, en ook niet met 'Bekijk als'). */
import { CSS, alsLid, avatar, esc, leden } from './family-ui.js?v=0.13.1';

const TEKST = {
  nl: { titel: 'Samen', sinds: 'samen sinds {x}', jaar: '{x} jaar', kies: 'Kies je partner', kiesUitleg: 'Samen is voor stellen: jullie stemming, knuffels en een date-pot. Alleen jullie twee zien het.',
    datum: 'Samen sinds (mag leeg)', maak: 'Samen beginnen', geenKandidaat: 'Samen is voor stellen in het gezin.', prive: '🔒 Samen is privé: dit zie je alleen als jezelf.',
    stemming: 'Hoe gaat het?', jouw: 'Jij', deel: 'Delen', zin: 'Een zinnetje (mag leeg)', nogNiet: 'Nog niets gedeeld vandaag.', knuffel: 'Stuur iets liefs',
    knuffelSoort: { knuffel: 'Knuffel', kus: 'Kus', denk: 'Ik denk aan je', trots: 'Trots op je', sterkte: 'Sterkte' }, verstuurd: '{x} verstuurd 💌', nietBezorgd: 'Bewaard, maar {x} heeft geen telefoon gekoppeld',
    laatste: 'Laatst van {x}: {y}', pot: '🫙 Date-pot', idee: 'Idee voor samen…', erin: 'Erin', trek: '🎲 Trek een idee', getrokken: 'Getrokken:', gedaan: 'Gedaan',
    welGedaan: 'Al gedaan ({x})', leeg: 'De pot is nog leeg.', ai: '✨ Ideeën', bezig: 'Even denken…', erbij: '+ In de pot', stoppen: 'Samen stoppen',
    stoppenZeker: 'Samen stoppen? De date-pot en stemmingen gaan weg.', vandaag: 'vandaag' },
  en: { titel: 'Together', sinds: 'together since {x}', jaar: '{x} years', kies: 'Choose your partner', kiesUitleg: 'Together is for couples: your mood, hugs and a date jar. Only the two of you can see it.',
    datum: 'Together since (optional)', maak: 'Start together', geenKandidaat: 'Together is for couples in the family.', prive: '🔒 Together is private: you only see it as yourself.',
    stemming: 'How are you?', jouw: 'You', deel: 'Share', zin: 'A short line (optional)', nogNiet: 'Nothing shared today.', knuffel: 'Send something sweet',
    knuffelSoort: { knuffel: 'Hug', kus: 'Kiss', denk: 'Thinking of you', trots: 'Proud of you', sterkte: 'Hang in there' }, verstuurd: '{x} sent 💌', nietBezorgd: 'Saved, but {x} has no phone linked',
    laatste: 'Last from {x}: {y}', pot: '🫙 Date jar', idee: 'Idea for the two of you…', erin: 'Add', trek: '🎲 Draw an idea', getrokken: 'Drawn:', gedaan: 'Done',
    welGedaan: 'Done already ({x})', leeg: 'The jar is still empty.', ai: '✨ Ideas', bezig: 'Thinking…', erbij: '+ Into the jar', stoppen: 'Stop together',
    stoppenZeker: 'Stop together? The date jar and moods will be removed.', vandaag: 'today' },
};
const taalVan = (h) => (((h && (h.config && h.config.language || h.locale && h.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');

const STIJL = `
  ha-card { padding: 16px; }
  .kop { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .kop .tk { flex: 1; } .kop b { font-size: 1.3rem; display: block; }
  .duo { display: flex; } .duo .fam-avatar + .fam-avatar { margin-left: -14px; }
  .raster { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 800px) { .raster { grid-template-columns: 1fr; } }
  .vak { background: var(--secondary-background-color); border-radius: 20px; padding: 14px; }
  .vak h3 { margin: 0 0 10px; font-size: 1.05rem; }
  .st { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .st .p { background: var(--card-background-color); border-radius: 16px; padding: 10px; text-align: center; }
  .st .groot { font-size: 2.6rem; line-height: 1.2; }
  .sub { color: var(--secondary-text-color); font-size: .88rem; }
  .emo { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .emo button { border: 0; background: var(--card-background-color); border-radius: 14px; font-size: 1.5rem; width: 48px; height: 48px; cursor: pointer; }
  .emo button.aan { box-shadow: inset 0 0 0 2px var(--primary-color); background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color)); }
  .kn { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
  .kn button { border: 0; cursor: pointer; font: inherit; color: var(--primary-text-color); background: var(--card-background-color); border-radius: 18px; padding: 12px 6px; display: grid; justify-items: center; gap: 4px; }
  .kn button span { font-size: 2rem; } .kn button small { font-size: .78rem; }
  .kn button:active { transform: scale(.95); }
  .veld { box-sizing: border-box; font: inherit; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
  .rij { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; } .rij .veld { flex: 1; min-width: 140px; }
  .idee { display: flex; align-items: center; gap: 8px; padding: 8px 4px; border-bottom: 1px solid var(--divider-color); }
  .idee:last-child { border-bottom: 0; } .idee .em { font-size: 1.4rem; width: 1.6em; text-align: center; } .idee span.tk { flex: 1; min-width: 0; }
  .idee.gedaan .tk { text-decoration: line-through; opacity: .6; }
  .x { border: 0; background: none; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; color: var(--secondary-text-color); font-size: 1rem; }
  .trek { margin: 10px 0; padding: 14px; border-radius: 18px; text-align: center; background: color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color)); }
  .trek .em { font-size: 2.4rem; display: block; }
  .kandidaten { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
  .kandidaten button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 4px; padding: 8px; border-radius: 16px; opacity: .5; }
  .kandidaten button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 15%, transparent); }
  details summary { cursor: pointer; color: var(--secondary-text-color); font-size: .9rem; margin-top: 8px; }
  .leeg { color: var(--secondary-text-color); padding: 8px 0; }
`;

class FamilySamenCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x, y) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return typeof v === 'string' ? v.replaceAll('{x}', x ?? '').replaceAll('{y}', y ?? '') : v; }

  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (eerste) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'idee') this._klik({ target: this.shadowRoot.querySelector('[data-a=erin]') }); });
      this._laad();
      this._klok = setInterval(() => { if (this.isConnected && !this._typt()) this._laad(); }, 90000);
    }
  }
  _typt() { const a = this.shadowRoot && this.shadowRoot.activeElement; return a && ['INPUT', 'TEXTAREA'].includes(a.tagName); }
  async _laad() {
    if (alsLid(this._hass)) { this._d = { prive: true }; return this._teken(); }
    try { this._d = await this._hass.callWS({ type: 'ha_family/samen' }); this._fout = null; } catch (e) { this._fout = e.message; }
    this._teken();
  }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  async _ws(type, data, ok) {
    try { const r = await this._hass.callWS({ type, ...data }); if (ok) this._melding(typeof ok === 'function' ? ok(r) : ok); await this._laad(); return r ?? true; }
    catch (e) { this._melding(e.message); return null; }
  }
  _datum(iso, opties) { return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(this._hass.locale?.language || undefined, opties || { day: 'numeric', month: 'long', year: 'numeric' }); }
  _tijd(iso) {
    const d = new Date(iso), vandaag = d.toDateString() === new Date().toDateString();
    return (vandaag ? '' : this._datum(iso, { weekday: 'short', day: 'numeric', month: 'short' }) + ' ') + d.toLocaleTimeString(this._hass.locale?.language || undefined, { hour: '2-digit', minute: '2-digit' });
  }

  _teken() {
    if (!this.shadowRoot) return;
    const d = this._d;
    let binnen;
    if (this._fout) binnen = `<div class="leeg">${esc(this._fout)}</div>`;
    else if (!d) binnen = '<div class="leeg">…</div>';
    else if (d.prive) binnen = `<div class="leeg">${esc(this.t('prive'))}</div>`;
    else if (!d.stel) binnen = this._kiezen();
    else binnen = this._inhoud();
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${binnen}</ha-card>`;
  }

  _kiezen() {
    const d = this._d, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    if (!d.kandidaten.length) return `<div class="leeg">❤️ ${esc(this.t('geenKandidaat'))}</div>`;
    return `<div style="font-size:1.3rem;font-weight:600">❤️ ${esc(this.t('kies'))}</div><p class="sub">${esc(this.t('kiesUitleg'))}</p>
      <div class="kandidaten">${d.kandidaten.map((k) => { const l = lmap[k.lid] || { naam: k.naam, kleur: '#e91e63' };
        return `<button class="${this._partner === k.lid ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="partner" data-l="${k.lid}">${avatar(l, { grootte: 52 })}<b>${esc(k.naam.split(' ')[0])}</b></button>`; }).join('')}</div>
      <div class="rij"><span class="sub">${esc(this.t('datum'))}</span><input class="veld" type="date" id="sinds" style="flex:0 1 200px"/></div>
      <div class="rij"><button class="fam-knop" data-a="maak" ${this._partner ? '' : 'disabled'}>❤️ ${esc(this.t('maak'))}</button></div>`;
  }

  _inhoud() {
    const d = this._d, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const ik = lmap[d.ik] || { naam: '?' }, p = lmap[d.partner] || { naam: '?' }, pn = p.naam.split(' ')[0];
    let sinds = '';
    if (d.stel.sinds) {
      const jaren = Math.floor((new Date() - new Date(d.stel.sinds + 'T00:00:00')) / (365.25 * 864e5));
      sinds = `${this.t('sinds', this._datum(d.stel.sinds))}${jaren >= 1 ? ` · ${this.t('jaar', jaren)}` : ''}`;
    }
    const kop = `<div class="kop"><span class="duo">${avatar(ik, { grootte: 52 })}${avatar(p, { grootte: 52 })}</span><span class="tk"><b>❤️ ${esc(ik.naam.split(' ')[0])} & ${esc(pn)}</b>
      <span class="sub">${esc(sinds)}</span></span></div>`;
    const sp = d.stemming[d.partner], sm = d.stemming[d.ik], kies = this._emoji || (sm && sm.tijd.slice(0, 10) === new Date().toISOString().slice(0, 10) ? sm.emoji : null);
    const stemming = `<div class="vak"><h3>💬 ${esc(this.t('stemming'))}</h3><div class="st">
        <div class="p"><div class="sub">${esc(pn)}</div>${sp ? `<div class="groot">${esc(sp.emoji)}</div>${sp.tekst ? `<div>${esc(sp.tekst)}</div>` : ''}<div class="sub">${esc(this._tijd(sp.tijd))}</div>` : `<div class="sub" style="padding:18px 0">${esc(this.t('nogNiet'))}</div>`}</div>
        <div class="p"><div class="sub">${esc(this.t('jouw'))}</div>${sm ? `<div class="groot">${esc(sm.emoji)}</div>${sm.tekst ? `<div>${esc(sm.tekst)}</div>` : ''}<div class="sub">${esc(this._tijd(sm.tijd))}</div>` : `<div class="sub" style="padding:18px 0">${esc(this.t('nogNiet'))}</div>`}</div></div>
      <div class="emo">${d.stemmingen.map((e) => `<button class="${kies === e ? 'aan' : ''}" data-a="emoji" data-v="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      <div class="rij"><input class="veld" id="zin" maxlength="140" placeholder="${esc(this.t('zin'))}"/><button class="fam-knop" data-a="deel" ${kies ? '' : 'disabled'}>${esc(this.t('deel'))}</button></div></div>`;
    const soorten = this.t('knuffelSoort');
    const lk = d.laatste_knuffel;
    const knuffels = `<div class="vak"><h3>💌 ${esc(this.t('knuffel'))}</h3><div class="kn">${Object.entries(d.knuffel_soorten).map(([k, e]) => `<button data-a="knuffel" data-v="${k}"><span>${esc(e)}</span><small>${esc(soorten[k] || k)}</small></button>`).join('')}</div>
      ${lk ? `<p class="sub" style="margin:10px 0 0">${esc(this.t('laatste', pn, `${d.knuffel_soorten[lk.soort] || ''} ${this._tijd(lk.tijd)}`))}</p>` : ''}</div>`;
    const open_ = d.datepot.filter((i) => !i.gedaan), klaar = d.datepot.filter((i) => i.gedaan);
    const rijIdee = (i) => `<div class="idee ${i.gedaan ? 'gedaan' : ''}"><span class="em">${esc(i.emoji)}</span><span class="tk">${esc(i.titel)}${i.gedaan ? ` <small class="sub">${esc(this._datum(i.gedaan, { day: 'numeric', month: 'short' }))}</small>` : ''}</span>
      <button class="x" data-a="gedaan" data-i="${i.id}" data-v="${i.gedaan ? '' : '1'}" title="${esc(this.t('gedaan'))}">${i.gedaan ? '↩️' : '✅'}</button><button class="x" data-a="idee-weg" data-i="${i.id}">🗑️</button></div>`;
    const g = this._getrokken && d.datepot.find((i) => i.id === this._getrokken && !i.gedaan);
    const pot = `<div class="vak" style="grid-column:1/-1"><h3>${esc(this.t('pot'))}</h3>
      <div class="rij" style="margin-top:0"><input class="veld" id="idee" maxlength="100" placeholder="${esc(this.t('idee'))}"/><button class="fam-knop" data-a="erin">${esc(this.t('erin'))}</button>
        <button class="fam-knop zacht" data-a="ai" ${this._denkt ? 'disabled' : ''}>${esc(this._denkt ? this.t('bezig') : this.t('ai'))}</button></div>
      ${this._voorstel ? `<div style="margin-top:8px">${this._voorstel.map((v, n) => `<div class="idee"><span class="em">${esc(v.emoji)}</span><span class="tk">${esc(v.titel)}</span><button class="fam-knop zacht" data-a="voorstel" data-n="${n}" style="min-height:36px">${esc(this.t('erbij'))}</button></div>`).join('')}</div>` : ''}
      ${open_.length ? `<div class="rij"><button class="fam-knop" data-a="trek">${esc(this.t('trek'))}</button></div>` : ''}
      ${g ? `<div class="trek"><div class="sub">${esc(this.t('getrokken'))}</div><span class="em">${esc(g.emoji)}</span><b>${esc(g.titel)}</b></div>` : ''}
      ${open_.length ? open_.map(rijIdee).join('') : `<div class="leeg">${esc(this.t('leeg'))}</div>`}
      ${klaar.length ? `<details><summary>${esc(this.t('welGedaan', klaar.length))}</summary>${klaar.map(rijIdee).join('')}</details>` : ''}
      <div class="rij" style="justify-content:flex-end;margin-top:14px"><button class="fam-knop rand" data-a="stoppen" style="min-height:34px">${esc(this.t('stoppen'))}</button></div></div>`;
    return `${kop}<div class="raster">${stemming}${knuffels}${pot}</div>`;
  }

  async _klik(e) {
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const a = b.dataset.a, q = (id) => this.shadowRoot.getElementById(id), d = this._d;
    const pn = d && d.partner ? ((leden(this._hass).find((l) => l.id === d.partner) || { naam: '' }).naam.split(' ')[0]) : '';
    if (a === 'partner') { this._partner = b.dataset.l; return this._teken(); }
    if (a === 'maak') return this._ws('ha_family/samen/stel', { partner: this._partner, sinds: (q('sinds') && q('sinds').value) || null });
    if (a === 'emoji') { const zin = q('zin') && q('zin').value; this._emoji = b.dataset.v; this._teken(); if (zin) q('zin').value = zin; return; }
    if (a === 'deel') { const r = await this._ws('ha_family/samen/stemming', { emoji: this._emoji || d.stemming[d.ik].emoji, tekst: q('zin').value || null }); if (r) this._emoji = null; return; }
    if (a === 'knuffel') {
      const naam = (this.t('knuffelSoort')[b.dataset.v] || '');
      return this._ws('ha_family/samen/knuffel', { soort: b.dataset.v }, (r) => (r.bezorgd ? this.t('verstuurd', naam) : this.t('nietBezorgd', pn)));
    }
    if (a === 'erin') { const v = q('idee').value.trim(); if (!v) return q('idee').focus(); if (await this._ws('ha_family/samen/idee', { titel: v })) setTimeout(() => { const i = q('idee'); if (i) i.focus(); }, 0); return; }
    if (a === 'ai') {
      this._denkt = true; this._teken();
      try { this._voorstel = (await this._hass.callWS({ type: 'ha_family/samen/ai' })).ideeen; } catch (er) { this._melding(er.message); }
      this._denkt = false; return this._teken();
    }
    if (a === 'voorstel') {
      const v = this._voorstel[Number(b.dataset.n)];
      if (await this._ws('ha_family/samen/idee', { titel: v.titel, emoji: v.emoji })) { this._voorstel = this._voorstel.filter((x) => x !== v); if (!this._voorstel.length) this._voorstel = null; this._teken(); }
      return;
    }
    if (a === 'trek') { const r = await this._ws('ha_family/samen/trekken', {}); if (r) { this._getrokken = r.id; this._teken(); } return; }
    if (a === 'gedaan') return this._ws('ha_family/samen/idee/gedaan', { idee: b.dataset.i, gedaan: !!b.dataset.v });
    if (a === 'idee-weg') return this._ws('ha_family/samen/idee/weg', { idee: b.dataset.i });
    if (a === 'stoppen') { if (confirm(this.t('stoppenZeker'))) await this._ws('ha_family/samen/stel/weg', {}); }
  }
}

export const SAMEN_KAARTEN = [
  ['family-samen-card', FamilySamenCard, 'HA Family: samen', 'Voor stellen: stemming, knuffels en een date-pot (alleen voor jullie twee).'],
];
