/* HA Family — klusjes, taken en boodschappen (HA-Family-Cards).
 *
 *   type: custom:family-klusjes-card       kind: eigen klusjes als grote tegels, sterren en beloningen;
 *                                          ouder: 'wacht op jou' en de klusjes van iedereen   (lid: <id> = altijd die persoon)
 *   type: custom:family-taken-card         gezinstaken met 'voor wie' en een deadline
 *   type: custom:family-boodschappen-card  boodschappen op volgorde van de looproute
 *
 * Alles komt uit ha_family/taken; de kaarten verversen zodra een van de lijsten of puntensensoren verandert. */
import { CSS, alsAntwoord, avatar, esc, leden } from './family-ui.js?v=0.12.2';

const TEKST = {
  nl: {
    klusjes: 'Klusjes', jouwKlusjes: 'Klusjes van {x}', vandaag: 'vandaag', punten: 'punten', alles: 'Alles af! 🎉', nog: 'Nog {x} te doen',
    wacht: 'Wacht op goedkeuring', geenKlusjes: 'Vandaag geen klusjes.', beloningen: 'Beloningen', inwisselen: 'Inwisselen', aangevraagd: 'Aangevraagd ⏳',
    nogNodig: 'nog {x}', zekerInwisselen: '"{x}" inwisselen?', wachtOpJou: 'Wacht op jou', goedkeuren: 'Goedkeuren', nietGoed: 'Nog niet',
    instellen: 'Klusjes instellen', geenKlusjesOuder: 'Er zijn nog geen klusjes. Maak ze aan bij Gezin beheren → Klusjes.', ongedaan: '"{x}" weer open zetten?',
    taken: 'Taken', nieuweTaak: 'Nieuwe taak…', voorWie: 'Voor wie?', klaar: 'Klaar', opruimen: 'Afgevinkte taken weghalen', geenTaken: 'Niks te doen! 🎉',
    teLaat: 'te laat', vandaagKort: 'vandaag', morgen: 'morgen', zeker: '"{x}" verwijderen?',
    boodschappen: 'Boodschappen', watNodig: 'Wat moet er gehaald worden? (komma = meer)', erop: 'Erop', gekochtWeg: 'Gekochte dingen weghalen',
    leeg: 'Het lijstje is leeg. 🛒', stondErAl: 'Stond er al op', erbij: '{x} erop gezet', afdeling: 'Afdeling',
    mijnTaken: 'Mijn taken', alle: 'Alles bekijken', tikGekocht: 'Tik op wat je gekocht hebt',
  },
  en: {
    klusjes: 'Chores', jouwKlusjes: "{x}'s chores", vandaag: 'today', punten: 'points', alles: 'All done! 🎉', nog: '{x} to go',
    wacht: 'Waiting for approval', geenKlusjes: 'No chores today.', beloningen: 'Rewards', inwisselen: 'Redeem', aangevraagd: 'Requested ⏳',
    nogNodig: '{x} to go', zekerInwisselen: 'Redeem "{x}"?', wachtOpJou: 'Waiting for you', goedkeuren: 'Approve', nietGoed: 'Not yet',
    instellen: 'Set up chores', geenKlusjesOuder: 'No chores yet. Create them in Family settings → Chores.', ongedaan: 'Mark "{x}" as not done?',
    taken: 'Tasks', nieuweTaak: 'New task…', voorWie: 'For whom?', klaar: 'Done', opruimen: 'Remove completed tasks', geenTaken: 'Nothing to do! 🎉',
    teLaat: 'overdue', vandaagKort: 'today', morgen: 'tomorrow', zeker: 'Delete "{x}"?',
    boodschappen: 'Groceries', watNodig: 'What do we need? (comma = more)', erop: 'Add', gekochtWeg: 'Remove bought items',
    leeg: 'The list is empty. 🛒', stondErAl: 'Already on the list', erbij: '{x} added', afdeling: 'Aisle',
    mijnTaken: 'My tasks', alle: 'See all', tikGekocht: 'Tap what you bought',
  },
};
const taalVan = (hass) => (((hass && (hass.config && hass.config.language || hass.locale && hass.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');

const STIJL = `
  ha-card { padding: 16px; }
  .kop { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .kop .titel { font-size: 1.25rem; font-weight: 600; flex: 1; }
  .sterren { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 1.1rem; padding: 6px 14px; border-radius: 999px;
    background: color-mix(in srgb, #ffb300 22%, transparent); color: var(--primary-text-color); }
  .sub { color: var(--secondary-text-color); font-size: .9rem; }
  .tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
  .tegel { border: 0; cursor: pointer; font: inherit; color: var(--primary-text-color); border-radius: 20px; padding: 16px 10px 12px; display: grid; justify-items: center;
    gap: 6px; background: var(--secondary-background-color); position: relative; transition: transform .12s; text-align: center; }
  .tegel:active { transform: scale(.95); }
  .tegel .em { font-size: 2.6rem; line-height: 1; }
  .tegel .nm { font-weight: 600; line-height: 1.2; }
  .tegel .pt { font-size: .85rem; color: var(--secondary-text-color); }
  .tegel.ok { background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent); }
  .tegel.ok::after { content: '✓'; position: absolute; top: 8px; right: 12px; font-weight: 800; color: var(--success-color, #2e7d32); font-size: 1.2rem; }
  .tegel.wacht { background: color-mix(in srgb, #ffb300 16%, transparent); }
  .tegel.wacht .pt { color: #b26a00; }
  .klein .tegels { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
  .klein .tegel { padding: 10px 6px 8px; border-radius: 16px; }
  .klein .tegel .em { font-size: 1.8rem; }
  .klein .tegel .nm { font-size: .82rem; font-weight: 500; }
  .sec { margin: 18px 0 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .rij { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
  .rij + .rij { border-top: 1px solid var(--divider-color); }
  .rij .wat { flex: 1; min-width: 0; }
  .lid { margin-top: 14px; }
  .lidkop { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .lidkop b { flex: 1; }
  .beloning { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 12px; align-items: center; padding: 10px 12px; border-radius: 16px; background: var(--secondary-background-color); }
  .beloning + .beloning { margin-top: 8px; }
  .beloning .em { font-size: 1.8rem; grid-row: span 2; }
  .balk { grid-column: 2; height: 8px; border-radius: 99px; background: var(--divider-color); overflow: hidden; }
  .balk i { display: block; height: 100%; background: #ffb300; border-radius: 99px; }
  .feest { position: fixed; inset: 0; display: grid; place-items: center; z-index: 30; pointer-events: none; font-size: 7rem; animation: feest 1.2s ease-out forwards; }
  @keyframes feest { 0% { transform: scale(.3); opacity: 0; } 30% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
  .invoer { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .veld { flex: 1 1 200px; min-width: 0; box-sizing: border-box; font: inherit; font-size: 1rem; padding: 11px 13px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .veld.smal { flex: 0 0 auto; }
  .wie { display: flex; gap: 4px; flex-wrap: wrap; }
  .wie button { border: 0; background: none; padding: 2px; border-radius: 50%; cursor: pointer; opacity: .35; }
  .wie button.aan { opacity: 1; }
  .ck { width: 28px; height: 28px; flex: none; border-radius: 50%; border: 2px solid var(--secondary-text-color); background: none; cursor: pointer; display: grid; place-items: center;
    color: var(--text-primary-color, #fff); font-size: 15px; padding: 0; }
  .klaar .ck { background: var(--primary-color); border-color: var(--primary-color); }
  .klaar .ck::after { content: '✓'; }
  .klaar .tt { text-decoration: line-through; color: var(--secondary-text-color); }
  .x { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer; width: 36px; height: 36px; border-radius: 50%; font-size: 1rem; flex: none; }
  .x:hover { background: var(--secondary-background-color); }
  .dl { font-size: .8rem; padding: 2px 8px; border-radius: 999px; background: var(--secondary-background-color); color: var(--secondary-text-color); white-space: nowrap; }
  .dl.laat { background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent); color: var(--error-color, #db4437); }
  .avs { display: inline-flex; }
  .avs .fam-avatar + .fam-avatar { margin-left: -6px; }
  .afd { margin: 16px 0 2px; font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: var(--secondary-text-color); }
  details summary { cursor: pointer; color: var(--secondary-text-color); margin-top: 14px; }
  .leeg { color: var(--secondary-text-color); padding: 12px 0; text-align: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip { border: 0; font: inherit; padding: 6px 12px; border-radius: 999px; background: var(--secondary-background-color); color: var(--primary-text-color); cursor: pointer; }
  .chip:hover { background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
  .naar { border: 0; background: none; color: var(--primary-color); font: inherit; cursor: pointer; padding: 4px 0; margin-top: 8px; }
  .afdkeus { font: inherit; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
`;

/** Basis: haalt ha_family/taken op en ververst als een lijst of puntensensor van HA Family verandert. */
class TakenBasis extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return x === undefined ? v : v.replaceAll('{x}', x); }
  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this.shadowRoot.addEventListener('change', (e) => this._wijzig && this._wijzig(e));
      this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.enter) { e.preventDefault(); this._klik({ target: this.shadowRoot.querySelector(`[data-a="${e.target.dataset.enter}"]`) }); } });
    }
    const sleutel = Object.values(hass.states).filter((s) => ['taken', 'boodschappen', 'punten', 'gezin'].includes(s.attributes.ha_family))
      .map((s) => s.last_updated).join();
    if (sleutel !== this._sleutel) { this._sleutel = sleutel; this._laad(); }
  }
  async _laad(eigen) {
    try { this._d = alsAntwoord(this._hass, await this._hass.callWS({ type: 'ha_family/taken' })); this._fout = null; } catch (e) { this._fout = e.message; }
    if (eigen || !this._typt()) {
      // na een eigen actie altijd opnieuw tekenen, en de cursor terug in het veld waar je stond
      const focus = this.shadowRoot.activeElement && this.shadowRoot.activeElement.id;
      this._teken();
      if (focus) { const el = this.shadowRoot.getElementById(focus); if (el) el.focus(); }
    }
  }
  _typt() { const a = this.shadowRoot && this.shadowRoot.activeElement; return !!a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName); }
  async _ws(type, data, melding) {
    try { const r = await this._hass.callWS({ type, ...data }); if (melding) this._melding(typeof melding === 'function' ? melding(r) : melding); await this._laad(true); return r ?? true; }
    catch (e) { this._melding(e.message); return null; }
  }
  _melding(message) { if (message) this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  _lmap() { return Object.fromEntries(leden(this._hass).map((l) => [l.id, l])); }
  _naar(pad) { history.pushState(null, '', pad); window.dispatchEvent(new CustomEvent('location-changed')); }
  _schil(binnen) { this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${this._fout ? `<div class="leeg">${esc(this._fout)}</div>` : binnen}</ha-card>`; }
}

/* ── ⭐ Klusjes ── */
class FamilyKlusjesCard extends TakenBasis {
  _teken() {
    const d = this._d;
    if (!d) return this._schil('<div class="leeg">…</div>');
    const lmap = this._lmap();
    const lidId = this._config.lid || (d.ik && lmap[d.ik] && lmap[d.ik].rol === 'kind' ? d.ik : null);
    this._schil(lidId ? this._kind(lmap[lidId]) : this._ouder(lmap));
    if (this._feest) { const f = document.createElement('div'); f.className = 'feest'; f.textContent = this._feest; this.shadowRoot.append(f); this._feest = null; }
  }
  _tegel(k) {
    const label = k.status === 'wacht' ? this.t('wacht') : k.punten ? `+${k.punten} ⭐` : '';
    return `<button class="tegel ${k.status}" data-a="klusje" data-k="${k.klusje}" data-l="${k.lid}" data-d="${k.datum}" data-s="${k.status}" data-t="${esc(k.titel)}">
      <span class="em">${esc(k.emoji)}</span><span class="nm">${esc(k.titel)}</span>${label ? `<span class="pt">${esc(label)}</span>` : ''}</button>`;
  }
  _kind(lid) {
    if (!lid) return `<div class="leeg">…</div>`;
    const d = this._d, mijn = d.vandaag.filter((k) => k.lid === lid.id), open = mijn.filter((k) => k.status === 'open').length;
    const s = d.leden[lid.id] || { saldo: 0, beschikbaar: 0 };
    const wachtB = d.wacht.filter((w) => w.soort === 'beloning' && w.lid === lid.id).map((w) => w.titel);
    const bel = d.beloningen.map((b) => {
      const kan = s.beschikbaar >= b.punten, pct = Math.min(100, Math.round((s.beschikbaar / b.punten) * 100));
      const bezig = wachtB.includes(`${b.emoji} ${b.titel}`);
      return `<div class="beloning"><span class="em">${esc(b.emoji)}</span><span><b>${esc(b.titel)}</b> <span class="sub">· ${b.punten} ⭐</span></span>
        ${bezig ? `<span class="sub">${esc(this.t('aangevraagd'))}</span>` : kan ? `<button class="fam-knop" data-a="inwisselen" data-b="${b.id}" data-l="${lid.id}" data-t="${esc(b.titel)}">${esc(this.t('inwisselen'))}</button>`
          : `<span class="sub">${esc(this.t('nogNodig', b.punten - s.beschikbaar))}</span>`}
        <span class="balk"><i style="width:${pct}%"></i></span></div>`;
    }).join('');
    return `<div class="kop">${avatar(lid, { grootte: 48 })}<div class="titel">${esc(this.t('jouwKlusjes', lid.naam))}<div class="sub">${mijn.length ? esc(open ? this.t('nog', open) : this.t('alles')) : esc(this.t('geenKlusjes'))}</div></div>
        <span class="sterren">⭐ ${s.saldo}</span></div>
      ${mijn.length ? `<div class="tegels">${mijn.map((k) => this._tegel(k)).join('')}</div>` : ''}
      ${d.beloningen.length ? `<div class="sec">🎁 ${esc(this.t('beloningen'))}</div>${bel}` : ''}`;
  }
  _ouder(lmap) {
    const d = this._d;
    const wacht = d.wacht.filter((w) => lmap[w.lid]);
    const perLid = leden(this._hass).map((l) => [l, d.vandaag.filter((k) => k.lid === l.id)]).filter(([, k]) => k.length);
    return `<div class="kop"><div class="titel">⭐ ${esc(this.t('klusjes'))} <span class="sub">${esc(this.t('vandaag'))}</span></div></div>
      ${wacht.length ? `<div class="sec">⏳ ${esc(this.t('wachtOpJou'))}</div>${wacht.map((w) => `<div class="rij">${avatar(lmap[w.lid], { grootte: 32 })}
          <span class="wat">${w.soort === 'klusje' ? esc(w.emoji) + ' ' : ''}${esc(w.titel)} <span class="sub">· ${w.soort === 'klusje' ? '+' : '−'}${w.punten} ⭐</span></span>
          ${d.ouder ? `<button class="fam-knop" data-a="ok" data-w='${esc(JSON.stringify(w))}'>${esc(this.t('goedkeuren'))}</button><button class="fam-knop rand" data-a="nee" data-w='${esc(JSON.stringify(w))}'>${esc(this.t('nietGoed'))}</button>` : ''}</div>`).join('')}` : ''}
      ${perLid.length ? perLid.map(([l, k]) => `<div class="lid klein"><div class="lidkop">${avatar(l, { grootte: 32 })}<b>${esc(l.naam)}</b><span class="sterren">⭐ ${(d.leden[l.id] || {}).saldo || 0}</span></div>
          <div class="tegels">${k.map((x) => this._tegel(x)).join('')}</div></div>`).join('')
        : `<div class="leeg">${esc(d.klusjes.length ? this.t('geenKlusjes') : this.t('geenKlusjesOuder'))}</div>`}`;
  }
  async _klik(e) {
    const b = e.target && e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'klusje') {
      const gedaan = b.dataset.s === 'open';
      if (!gedaan && !confirm(this.t('ongedaan', b.dataset.t))) return;
      if (gedaan) this._feest = ['🎉', '⭐', '🌟', '🥳', '👏'][Math.floor(Math.random() * 5)];
      return this._ws('ha_family/klusje/gedaan', { klusje: b.dataset.k, lid: b.dataset.l, datum: b.dataset.d, gedaan });
    }
    if (a === 'inwisselen') { if (confirm(this.t('zekerInwisselen', b.dataset.t))) return this._ws('ha_family/beloning/inwisselen', { beloning: b.dataset.b, lid: b.dataset.l }, '🎁'); return; }
    if (a === 'ok' || a === 'nee') {
      const w = JSON.parse(b.dataset.w), ok = a === 'ok';
      if (w.soort === 'klusje') return this._ws('ha_family/klusje/goedkeuren', { klusje: w.klusje, lid: w.lid, datum: w.datum, ok });
      return this._ws('ha_family/beloning/goedkeuren', { punten_id: w.punten_id, ok });
    }
  }
}

/* ── ✅ Taken ── */
class FamilyTakenCard extends TakenBasis {
  _teken() {
    const d = this._d;
    if (!d) return this._schil('<div class="leeg">…</div>');
    if (this._config.compact) return this._compact();
    const lmap = this._lmap(), l = leden(this._hass);
    if (!this._wie) this._wie = d.ik ? [d.ik] : [];
    const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
    const dl = (s) => {
      if (!s) return '';
      const n = Math.round((new Date(s + 'T00:00:00') - vandaag) / 864e5);
      const tekst = n < 0 ? this.t('teLaat') : n === 0 ? this.t('vandaagKort') : n === 1 ? this.t('morgen')
        : new Date(s + 'T00:00:00').toLocaleDateString((this._hass.config?.language || this._hass.locale?.language), { weekday: 'short', day: 'numeric', month: 'short' });
      return `<span class="dl ${n < 0 ? 'laat' : ''}">📅 ${esc(tekst)}</span>`;
    };
    const rij = (t) => `<div class="rij ${t.klaar ? 'klaar' : ''}"><button class="ck" data-a="klaar" data-t="${t.id}" data-k="${t.klaar ? 1 : 0}"></button>
      <span class="wat tt">${esc(t.titel)}</span>${t.klaar ? '' : dl(t.deadline)}<span class="avs">${(t.wie || []).filter((w) => lmap[w]).map((w) => avatar(lmap[w], { grootte: 26 })).join('')}</span>
      <button class="x" data-a="weg" data-t="${t.id}" data-n="${esc(t.titel)}">✕</button></div>`;
    const open = d.taken.filter((t) => !t.klaar).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.gemaakt - b.gemaakt);
    const klaar = d.taken.filter((t) => t.klaar).sort((a, b) => (b.klaar_op || 0) - (a.klaar_op || 0));
    this._schil(`<div class="kop"><div class="titel">✅ ${esc(this.t('taken'))}</div><span class="sub">${open.length}</span></div>
      <div class="invoer"><input class="veld" id="nieuw" placeholder="${esc(this.t('nieuweTaak'))}" maxlength="200" data-enter="toevoegen"/>
        <input class="veld smal" type="date" id="deadline"/><button class="fam-knop" data-a="toevoegen">+</button></div>
      <div class="invoer" style="margin-top:8px"><span class="sub">${esc(this.t('voorWie'))}</span><span class="wie">${l.map((x) => `<button class="${this._wie.includes(x.id) ? 'aan' : ''}" data-a="wie" data-l="${x.id}" title="${esc(x.naam)}">${avatar(x, { grootte: 30 })}</button>`).join('')}</span></div>
      <div style="margin-top:8px">${open.map(rij).join('') || `<div class="leeg">${esc(this.t('geenTaken'))}</div>`}</div>
      ${klaar.length ? `<details ${this._open ? 'open' : ''}><summary>${esc(this.t('klaar'))} (${klaar.length})</summary>${klaar.slice(0, 30).map(rij).join('')}
        <div class="invoer" style="margin-top:8px"><button class="fam-knop rand" data-a="opruimen">${esc(this.t('opruimen'))}</button></div></details>` : ''}`);
    const det = this.shadowRoot.querySelector('details');
    if (det) det.addEventListener('toggle', () => { this._open = det.open; });
  }
  _compact() {
    const d = this._d, lmap = this._lmap(), ik = d.ik;
    const mijn = d.taken.filter((t) => !t.klaar && (!ik || !(t.wie || []).length || t.wie.includes(ik)))
      .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 6);
    if (!this._wie) this._wie = ik ? [ik] : [];
    this._schil(`<div class="kop"><div class="titel">📝 ${esc(ik ? this.t('mijnTaken') : this.t('taken'))}</div><span class="sub">${mijn.length || ''}</span></div>
      <div class="invoer"><input class="veld" id="nieuw" placeholder="${esc(this.t('nieuweTaak'))}" maxlength="200" data-enter="toevoegen"/><button class="fam-knop" data-a="toevoegen">+</button></div>
      <div style="margin-top:6px">${mijn.map((t) => `<div class="rij"><button class="ck" data-a="klaar" data-t="${t.id}" data-k="0"></button><span class="wat tt">${esc(t.titel)}</span>
        <span class="avs">${(t.wie || []).filter((w) => lmap[w] && w !== ik).map((w) => avatar(lmap[w], { grootte: 24 })).join('')}</span></div>`).join('') || `<div class="leeg">${esc(this.t('geenTaken'))}</div>`}</div>
      <button class="naar" data-a="naar">${esc(this.t('alle'))} →</button>`);
  }
  async _klik(e) {
    const b = e.target && e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, r = this.shadowRoot;
    if (a === 'naar') return this._naar('/gezin/taken');
    if (a === 'wie') { const id = b.dataset.l; this._wie = this._wie.includes(id) ? this._wie.filter((x) => x !== id) : [...this._wie, id]; b.classList.toggle('aan'); return; }
    if (a === 'toevoegen') {
      const titel = r.getElementById('nieuw').value.trim(); if (!titel) return;
      const deadline = r.getElementById('deadline') ? r.getElementById('deadline').value || null : null;
      r.getElementById('nieuw').value = '';
      await this._ws('ha_family/taak', { titel, wie: this._wie, deadline });
      const i = this.shadowRoot.getElementById('nieuw'); if (i) i.focus();
      return;
    }
    if (a === 'klaar') return this._ws('ha_family/taak/klaar', { taak: b.dataset.t, klaar: b.dataset.k !== '1' });
    if (a === 'weg') { if (confirm(this.t('zeker', b.dataset.n))) this._ws('ha_family/taak/weg', { taak: b.dataset.t }); return; }
    if (a === 'opruimen') return this._ws('ha_family/taken/opruimen', {});
  }
}

/* ── 🛒 Boodschappen ── */
class FamilyBoodschappenCard extends TakenBasis {
  _teken() {
    const d = this._d;
    if (!d) return this._schil('<div class="leeg">…</div>');
    if (this._config.compact) {
      const open = d.boodschappen.filter((b) => !b.klaar);
      return this._schil(`<div class="kop"><div class="titel">🛒 ${esc(this.t('boodschappen'))}</div><span class="sub">${open.length || ''}</span></div>
        <div class="invoer"><input class="veld" id="nieuw" placeholder="${esc(this.t('watNodig'))}" maxlength="400" data-enter="toevoegen"/><button class="fam-knop" data-a="toevoegen">${esc(this.t('erop'))}</button></div>
        ${open.length ? `<div class="chips">${open.slice(0, 16).map((b) => `<button class="chip" data-a="koop" data-b="${b.id}" data-k="0">${esc(b.titel)}</button>`).join('')}${open.length > 16 ? `<span class="chip">+${open.length - 16}</span>` : ''}</div>
          <div class="sub" style="margin-top:6px">${esc(this.t('tikGekocht'))}</div>` : `<div class="leeg">${esc(this.t('leeg'))}</div>`}
        <button class="naar" data-a="naar">${esc(this.t('alle'))} →</button>`);
    }
    const lijst = d.boodschappen, open = lijst.filter((b) => !b.klaar);
    const groepen = Object.entries(d.afdelingen).map(([k, naam]) => [k, naam, lijst.filter((b) => b.afdeling === k)]).filter((g) => g[2].length);
    this._schil(`<div class="kop"><div class="titel">🛒 ${esc(this.t('boodschappen'))}</div><span class="sub">${open.length || ''}</span></div>
      <div class="invoer"><input class="veld" id="nieuw" placeholder="${esc(this.t('watNodig'))}" maxlength="400" data-enter="toevoegen"/>
        <button class="fam-knop" data-a="toevoegen">${esc(this.t('erop'))}</button></div>
      ${groepen.map(([k, naam, items]) => `<div class="afd">${esc(naam)}</div>${items.map((b) => `<div class="rij ${b.klaar ? 'klaar' : ''}">
          <button class="ck" data-a="koop" data-b="${b.id}" data-k="${b.klaar ? 1 : 0}"></button>
          <span class="wat tt">${esc(b.titel)}</span>
          ${this._afdeling === b.id ? `<select class="afdkeus" data-b="${b.id}">${Object.entries(d.afdelingen).map(([ak, an]) => `<option value="${ak}" ${ak === b.afdeling ? 'selected' : ''}>${esc(an)}</option>`).join('')}</select>`
            : `<button class="x" data-a="afd" data-b="${b.id}" title="${esc(this.t('afdeling'))}">🏷️</button>`}
          <button class="x" data-a="weg" data-b="${b.id}">✕</button></div>`).join('')}`).join('') || `<div class="leeg">${esc(this.t('leeg'))}</div>`}
      ${lijst.some((b) => b.klaar) ? `<div class="invoer" style="margin-top:12px"><button class="fam-knop rand" data-a="gekocht">${esc(this.t('gekochtWeg'))}</button></div>` : ''}`);
  }
  async _klik(e) {
    const b = e.target && e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'toevoegen') {
      const i = this.shadowRoot.getElementById('nieuw'), tekst = i.value.trim(); if (!tekst) return;
      i.value = '';
      await this._ws('ha_family/boodschap', { tekst }, (r) => (r.nieuw.length ? `🛒 ${this.t('erbij', r.nieuw.map((x) => x.titel).join(', '))}` : this.t('stondErAl')));
      const n = this.shadowRoot.getElementById('nieuw'); if (n) n.focus();
      return;
    }
    if (a === 'koop') return this._ws('ha_family/boodschap/bij', { boodschap: b.dataset.b, klaar: b.dataset.k !== '1' });
    if (a === 'weg') return this._ws('ha_family/boodschap/weg', { boodschap: b.dataset.b });
    if (a === 'gekocht') return this._ws('ha_family/boodschap/weg', { alles_gekocht: true });
    if (a === 'afd') { this._afdeling = b.dataset.b; return this._teken(); }
    if (a === 'naar') return this._naar('/gezin/boodschappen');
  }
  _wijzig(e) {
    if (e.target.classList.contains('afdkeus')) { this._afdeling = null; this._ws('ha_family/boodschap/bij', { boodschap: e.target.dataset.b, afdeling: e.target.value }); }
  }
}

export const TAKEN_KAARTEN = [
  ['family-klusjes-card', FamilyKlusjesCard, 'HA Family: klusjes', 'Klusjes met punten: grote tegels voor kinderen, goedkeuren voor ouders, beloningen.'],
  ['family-taken-card', FamilyTakenCard, 'HA Family: taken', 'Gezinstaken met voor wie en een deadline.'],
  ['family-boodschappen-card', FamilyBoodschappenCard, 'HA Family: boodschappen', 'Boodschappen op volgorde van de looproute in de winkel.'],
];
