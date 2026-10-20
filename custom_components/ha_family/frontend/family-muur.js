/* HA Family — muurscherm (HA-Family-Dashboard): een tablet aan de muur.
 *
 * Volledig scherm zonder balken: links klok, datum, weer en afval; midden de agenda van vandaag en morgen voor het hele
 * gezin; rechts de klusjes per kind, de kamers en wie er thuis is; onderaan de boodschappen. 's Nachts alleen een gedimde klok.
 * Op de tablet zelf (het account 'muur') verdwijnt de zijbalk en blijft het scherm aan waar de browser dat toestaat. */
import { CSS, avatar, esc, leden, locatie, taal } from './family-ui.js?v=0.10.0';
import { FamilyKamersCard } from './family-huis.js?v=0.10.0';

if (!customElements.get('family-kamers-card')) customElements.define('family-kamers-card', FamilyKamersCard);

const T = {
  nl: { vandaag: 'Vandaag', morgen: 'Morgen', dezeWeek: 'Verder deze week', niks: 'Niks gepland', klusjes: 'Klusjes', thuis: 'Thuis', weg: 'Weg',
    boodschappen: 'Boodschappen', erop: 'Erop', watNodig: 'Wat moet er gehaald worden?', leeg: 'Niks nodig 🎉', afvalMorgen: 'Morgen aan de straat',
    afvalVandaag: 'Vandaag wordt opgehaald', jarig: 'is jarig', wordt: 'wordt', heleDag: 'hele dag', alles: 'Alles af! 🎉', nietIngesteld: 'HA Family is nog niet ingesteld.',
    vanavond: 'Vanavond eten we', kookt: 'kookt', watEten: 'Nog niet bedacht', kamers: 'Kamers', tikWakker: 'Tik om wakker te maken', wacht: 'wacht', geenKlusjes: 'Vandaag geen klusjes', nog: 'nog' },
  en: { vandaag: 'Today', morgen: 'Tomorrow', dezeWeek: 'Later this week', niks: 'Nothing planned', klusjes: 'Chores', thuis: 'Home', weg: 'Away',
    boodschappen: 'Groceries', erop: 'Add', watNodig: 'What do we need?', leeg: 'Nothing needed 🎉', afvalMorgen: 'Put out tomorrow',
    afvalVandaag: 'Collected today', jarig: 'has a birthday', wordt: 'turns', heleDag: 'all day', alles: 'All done! 🎉', nietIngesteld: 'HA Family is not set up yet.',
    vanavond: 'Tonight', kookt: 'cooks', watEten: 'Not decided yet', kamers: 'Rooms', tikWakker: 'Tap to wake', wacht: 'waiting', geenKlusjes: 'No chores today', nog: 'more' },
};
const WEER = { 'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️', lightning: '🌩️', 'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️',
  rainy: '🌦️', snowy: '❄️', 'snowy-rainy': '🌨️', sunny: '☀️', windy: '💨', 'windy-variant': '💨', exceptional: '⚠️' };
const pad = (n) => String(n).padStart(2, '0');
const isoDag = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const opDag = (ev, dag) => ev.filter((e) => e.start.slice(0, 10) <= dag && dag <= (e.eind || e.start).slice(0, 10));
const inNacht = (n) => {
  if (!n || !n.aan) return false;
  const nu = new Date(), m = nu.getHours() * 60 + nu.getMinutes();
  const [vh, vm] = n.van.split(':').map(Number), [th, tm] = n.tot.split(':').map(Number);
  const van = vh * 60 + vm, tot = th * 60 + tm;
  return van < tot ? m >= van && m < tot : m >= van || m < tot;
};

class HaFamilyMuur extends HTMLElement {
  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (eerste) { this._bouw(); this._laadAlles(); }
    const k = this.shadowRoot.querySelector('.r-kamers');
    if (k) { if (!k._config) k.setConfig({ compact: true, muur: true, titel: this.t('kamers') }); k.hass = hass; }
    if (eerste) return;
    const sleutel = Object.values(hass.states).filter((s) => s.attributes.ha_family).map((s) => s.last_updated).join()
      + leden(hass).map((l) => (hass.states[l.person] || {}).state).join();
    if (sleutel !== this._sleutel) { this._sleutel = sleutel; this._laadSnel(); }
  }
  get hass() { return this._hass; }
  set narrow(n) { this._narrow = n; }
  t(k) { return T[taal(this._hass)][k] ?? T.en[k] ?? k; }
  get lang() { return this._hass.locale?.language || undefined; }

  connectedCallback() {
    this._klokTik = setInterval(() => this._klok(), 1000);
    this._lang = setInterval(() => this._laadAlles(), 300000);
    this._zicht = () => { if (!document.hidden) { this._wakker(); this._laadAlles(); } };
    document.addEventListener('visibilitychange', this._zicht);
  }
  disconnectedCallback() {
    clearInterval(this._klokTik); clearInterval(this._lang);
    document.removeEventListener('visibilitychange', this._zicht);
    if (this._lock) this._lock.release().catch(() => {});
  }

  _bouw() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><div class="muur"><div class="links"></div><div class="midden"></div><div class="rechts"><div class="r-klusjes"></div><family-kamers-card class="r-kamers"></family-kamers-card><div class="r-thuis"></div></div><div class="onder"></div></div>
      <div class="nacht" hidden><div class="nklok"></div><div class="ndatum"></div><small></small></div>`;
    this.shadowRoot.addEventListener('click', (e) => this._klik(e));
    this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'nieuw') this._klik({ target: this.shadowRoot.querySelector('[data-a=erop]') }); });
    this.shadowRoot.querySelector('.nacht').addEventListener('click', () => { this._wakkerTot = Date.now() + 120000; this._klok(); });
    this._wakker();
  }

  async _wakker() {
    try { if ('wakeLock' in navigator && !document.hidden) this._lock = await navigator.wakeLock.request('screen'); } catch (e) { /* niet ondersteund */ }
  }

  async _laadAlles() {
    const h = this._hass;
    try { this._m = await h.callWS({ type: 'ha_family/muur' }); } catch (e) { this._fout = e.message; return this._teken(); }
    if (this._m.ben_muur && this._m.zijbalk_weg && !this._gedockt) {
      this._gedockt = true;
      this.dispatchEvent(new CustomEvent('hass-dock-sidebar', { detail: { dock: 'always_hidden' }, bubbles: true, composed: true }));
    }
    const weer = this._m.weer || (Object.keys(h.states).find((e) => e.startsWith('weather.')) || null);
    this._weerId = weer;
    if (weer && (!this._fcT || Date.now() - this._fcT > 1800000)) {
      try {
        const r = await h.callWS({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type: 'daily' }, target: { entity_id: weer }, return_response: true });
        this._fc = (r.response[weer] || {}).forecast || []; this._fcT = Date.now();
      } catch (e) { this._fc = []; }
    }
    await this._laadSnel();
  }
  async _laadSnel() {
    const h = this._hass, nu = new Date(); nu.setHours(0, 0, 0, 0);
    try {
      const [a, k, e] = await Promise.all([h.callWS({ type: 'ha_family/agenda', van: isoDag(nu), tot: isoDag(plus(nu, 8)) }), h.callWS({ type: 'ha_family/taken' }),
        h.callWS({ type: 'ha_family/eten', van: isoDag(nu), dagen: 2 }).catch(() => null)]);
      this._ev = a.events; this._k = k; this._eten = e; this._fout = null;
    } catch (e) { this._fout = e.message; }
    const i = this.shadowRoot.getElementById('nieuw');
    if (i && this.shadowRoot.activeElement === i) return;          // niet storen terwijl iemand typt
    this._teken();
  }

  _klok() {
    const r = this.shadowRoot, nu = new Date();
    const tijd = nu.toLocaleTimeString(this.lang, { hour: '2-digit', minute: '2-digit' });
    const datum = nu.toLocaleDateString(this.lang, { weekday: 'long', day: 'numeric', month: 'long' });
    r.querySelectorAll('.klok').forEach((x) => { x.textContent = tijd; });
    const nacht = this._m && inNacht(this._m.nacht) && !(this._wakkerTot && Date.now() < this._wakkerTot);
    const n = r.querySelector('.nacht');
    if (n.hidden === nacht) n.hidden = !nacht;
    if (nacht) {
      n.querySelector('.nklok').textContent = tijd; n.querySelector('.ndatum').textContent = datum; n.querySelector('small').textContent = this.t('tikWakker');
      // klok langzaam laten verschuiven tegen inbranden
      n.style.setProperty('--dx', `${(nu.getMinutes() % 10) * 4 - 20}px`); n.style.setProperty('--dy', `${(nu.getHours() % 6) * 6 - 15}px`);
    }
    if (this._dag !== isoDag(nu)) { const eerste = !this._dag; this._dag = isoDag(nu); if (!eerste) this._laadAlles(); }
  }

  _teken() {
    const r = this.shadowRoot, h = this._hass;
    if (!r) return;
    if (this._fout && !this._ev) { r.querySelector('.midden').innerHTML = `<div class="blok">${esc(this._fout)}</div>`; return; }
    if (!this._m || !this._ev || !this._k) return;
    const b = this._m.blokken, lmap = Object.fromEntries(leden(h).map((l) => [l.id, l]));
    const vandaag = isoDag(new Date()), morgen = isoDag(plus(new Date(), 1));
    r.querySelector('.links').innerHTML = this._links(vandaag, morgen) + (b.eten !== false ? this._etenBlok(lmap) : '');
    r.querySelector('.midden').innerHTML = b.agenda ? this._agenda(lmap, vandaag, morgen) : '';
    r.querySelector('.r-klusjes').innerHTML = b.klusjes ? this._klusjes(lmap) : '';
    const kamers = r.querySelector('.r-kamers');
    kamers.hidden = b.kamers === false;
    r.querySelector('.r-thuis').innerHTML = b.thuis ? this._thuis(!kamers.hidden && kamers.style.display !== 'none') : '';
    r.querySelector('.onder').innerHTML = b.boodschappen ? this._boodschappen() : '';
    r.querySelector('.muur').classList.toggle('zonder-midden', !b.agenda);
    this._klok();
  }

  _links(vandaag, morgen) {
    const h = this._hass, w = this._weerId && h.states[this._weerId];
    const ev = this._ev;
    const afvalV = opDag(ev, vandaag).filter((e) => e.soort === 'afval'), afvalM = opDag(ev, morgen).filter((e) => e.soort === 'afval');
    const jarig = opDag(ev, vandaag).filter((e) => e.soort === 'verjaardag');
    const fc = (this._fc || []).slice(0, 4);
    const eenheid = w ? w.attributes.temperature_unit || '°' : '';
    return `<div class="klok"></div><div class="datum">${esc(new Date().toLocaleDateString(this.lang, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      ${w ? `<div class="blok weer"><div class="nu"><span class="wi">${WEER[w.state] || '🌡️'}</span><span class="temp">${Math.round(w.attributes.temperature)}${esc(eenheid.replace('°C', '°').replace('°F', '°'))}</span>
          ${fc[0] ? `<span class="minmax">${Math.round(fc[0].temperature)}° / ${Math.round(fc[0].templow ?? fc[0].temperature)}°</span>` : ''}</div>
        ${fc.length > 1 ? `<div class="fc">${fc.slice(1).map((f) => `<div><small>${esc(new Date(f.datetime).toLocaleDateString(this.lang, { weekday: 'short' }))}</small><span>${WEER[f.condition] || ''}</span><b>${Math.round(f.temperature)}°</b></div>`).join('')}</div>` : ''}</div>` : ''}
      ${jarig.map((e) => `<div class="blok feest">🎂 <b>${esc(e.naam)}</b> ${e.leeftijd ? `${esc(this.t('wordt'))} ${e.leeftijd}!` : esc(this.t('jarig'))}</div>`).join('')}
      ${afvalV.length || afvalM.length ? `<div class="blok afval"><small>🗑️ ${esc(afvalV.length ? this.t('afvalVandaag') : this.t('afvalMorgen'))}</small>
        <div class="afv">${(afvalV.length ? afvalV : afvalM).map((e) => `<span style="--k:${esc(e.kleur || '#43a047')}">${esc(e.titel)}</span>`).join('')}</div></div>` : ''}`;
  }

  _etenBlok(lmap) {
    if (!this._eten) return '';
    const [v, m] = this._eten.menu, kok = v.kok && lmap[v.kok];
    return `<div class="blok eten"><small>🍽️ ${esc(this.t('vanavond'))}</small>
      <div class="gerecht"><span class="em">${esc(v.emoji || '🤔')}</span><b class="${v.naam ? '' : 'niks'}">${esc(v.naam || this.t('watEten'))}</b></div>
      ${kok ? `<div class="kok">${avatar(kok, { grootte: 26 })}<span>${esc(kok.naam)} ${esc(this.t('kookt'))}</span></div>` : ''}
      ${m && m.naam ? `<div class="mrg">${esc(this.t('morgen'))}: ${esc(m.emoji || '')} ${esc(m.naam)}</div>` : ''}</div>`;
  }

  _rij(e, lmap) {
    const kl = e.kleur || ((e.wie || []).map((w) => lmap[w] && lmap[w].kleur).find(Boolean)) || 'var(--primary-color)';
    const tijd = e.hele_dag ? '' : new Date(e.start).toLocaleTimeString(this.lang, { hour: '2-digit', minute: '2-digit' });
    return `<div class="ev"><span class="streep" style="background:${esc(kl)}"></span><span class="tijd">${esc(tijd)}</span><span class="wat">${esc(e.titel)}${e.plek ? `<small>📍 ${esc(e.plek)}</small>` : ''}</span>
      <span class="avs">${(e.wie || []).filter((w) => lmap[w]).map((w) => avatar(lmap[w], { grootte: 30 })).join('')}</span></div>`;
  }
  _agenda(lmap, vandaag, morgen) {
    const ev = this._ev.filter((e) => e.soort !== 'afval');
    const v = opDag(ev, vandaag), m = opDag(ev, morgen);
    const later = ev.filter((e) => e.start.slice(0, 10) > morgen).slice(0, 10);
    const lijst = (l) => (l.length ? l.map((e) => this._rij(e, lmap)).join('') : `<div class="niks">${esc(this.t('niks'))}</div>`);
    return `<div class="blok"><h2>${esc(this.t('vandaag'))}</h2>${lijst(v)}</div>
      <div class="blok"><h2>${esc(this.t('morgen'))}</h2>${lijst(m)}</div>
      ${later.length ? `<div class="blok klein"><h2>${esc(this.t('dezeWeek'))}</h2>${later.map((e) => `<div class="ev kort"><span class="dag">${esc(new Date(e.start.slice(0, 10) + 'T00:00:00').toLocaleDateString(this.lang, { weekday: 'short', day: 'numeric' }))}</span>
        <span class="wat">${esc(e.titel)}</span><span class="avs">${(e.wie || []).filter((w) => lmap[w]).map((w) => avatar(lmap[w], { grootte: 22 })).join('')}</span></div>`).join('')}</div>` : ''}`;
  }
  _klusjes(lmap) {
    const k = this._k, per = leden(this._hass).map((l) => [l, k.vandaag.filter((x) => x.lid === l.id)]).filter(([, x]) => x.length);
    if (!per.length) return k.klusjes.length ? `<div class="blok klein"><h2>⭐ ${esc(this.t('klusjes'))}</h2><div class="niks">${esc(this.t('geenKlusjes'))}</div></div>` : '';
    return `<div class="blok"><h2>⭐ ${esc(this.t('klusjes'))}</h2>${per.map(([l, x]) => { const open = x.filter((y) => y.status === 'open').length;
      return `<div class="kind"><div class="kkop">${avatar(l, { grootte: 40 })}<b>${esc(l.naam)}</b><span class="ster">⭐ ${(k.leden[l.id] || {}).saldo || 0}</span></div>
        <div class="tegels">${x.map((y) => `<button class="tegel ${y.status}" data-a="klusje" data-k="${y.klusje}" data-l="${y.lid}" data-d="${y.datum}" data-s="${y.status}" data-t="${esc(y.titel)}">
          <span class="em">${esc(y.emoji)}</span><span class="nm">${esc(y.titel)}</span></button>`).join('')}</div>
        ${open ? '' : `<div class="alles">${esc(this.t('alles'))}</div>`}</div>`; }).join('')}</div>`;
  }
  _thuis(klein) {
    const h = this._hass;
    return `<div class="blok klein"><div class="thuis ${klein ? 'smal' : ''}">${leden(h).map((l) => { const w = locatie(h, l.person);
      return `<div class="pers ${w.bekend && !w.thuis ? 'weg' : ''}">${avatar(l, { grootte: klein ? 36 : 52, stip: w.bekend ? w.thuis : null })}<span>${esc(l.naam)}</span>${w.bekend ? `<small>${esc(w.tekst)}</small>` : ''}</div>`; }).join('')}</div></div>`;
  }
  _boodschappen() {
    const lijst = this._k.boodschappen.filter((b) => !b.klaar);
    return `<div class="blok bs"><h2>🛒 ${esc(this.t('boodschappen'))} <small>${lijst.length || ''}</small></h2>
      <div class="chips">${lijst.length ? lijst.slice(0, 18).map((b) => `<button class="chip" data-a="koop" data-b="${b.id}">${esc(b.titel)}</button>`).join('') + (lijst.length > 18 ? `<span class="chip meer">+${lijst.length - 18}</span>` : '')
        : `<span class="niks">${esc(this.t('leeg'))}</span>`}</div>
      <div class="invoer"><input id="nieuw" placeholder="${esc(this.t('watNodig'))}" maxlength="200" autocomplete="off"/><button class="fam-knop" data-a="erop">${esc(this.t('erop'))}</button></div></div>`;
  }

  async _klik(e) {
    const b = e.target && e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, h = this._hass;
    const doe = async (type, data) => { try { await h.callWS({ type, ...data }); } catch (er) { this._melding(er.message); } await this._laadSnel(); };
    if (a === 'klusje') {
      const gedaan = b.dataset.s === 'open';
      if (!gedaan && !confirm(`"${b.dataset.t}"?`)) return;
      if (gedaan) this._feest();
      return doe('ha_family/klusje/gedaan', { klusje: b.dataset.k, lid: b.dataset.l, datum: b.dataset.d, gedaan });
    }
    if (a === 'koop') { b.classList.add('weg'); return doe('ha_family/boodschap/bij', { boodschap: b.dataset.b, klaar: true }); }
    if (a === 'erop') {
      const i = this.shadowRoot.getElementById('nieuw'), tekst = i.value.trim(); if (!tekst) return;
      i.value = ''; i.blur();
      return doe('ha_family/boodschap', { tekst });
    }
  }
  _feest() {
    const f = document.createElement('div'); f.className = 'feestje'; f.textContent = ['🎉', '⭐', '🌟', '🥳', '👏'][Math.floor(Math.random() * 5)];
    this.shadowRoot.append(f); setTimeout(() => f.remove(), 1300);
  }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
}

const STIJL = `
  :host { display: block; height: 100vh; overflow: hidden; background: var(--primary-background-color); color: var(--primary-text-color); user-select: none; }
  .muur { height: 100vh; box-sizing: border-box; padding: 20px; display: grid; gap: 16px;
    grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.35fr) minmax(280px, 1.1fr); grid-template-rows: 1fr auto;
    grid-template-areas: 'links midden rechts' 'onder onder onder'; }
  .muur.zonder-midden { grid-template-columns: 1fr 1.4fr; grid-template-areas: 'links rechts' 'onder onder'; }
  .links { grid-area: links; } .midden { grid-area: midden; } .rechts { grid-area: rechts; } .onder { grid-area: onder; }
  .links, .midden, .rechts { display: flex; flex-direction: column; gap: 14px; min-height: 0; overflow: auto; scrollbar-width: none; }
  .midden > .blok:last-child { flex: 1; }                /* de agenda vult de kolom */
  .r-klusjes, .r-thuis { display: contents; }
  .r-kamers[hidden] { display: none !important; }
  .r-thuis > .blok { margin-top: auto; }                 /* wie is er thuis: onderaan */
  .links > .blok:last-child { margin-bottom: 0; }
  .blok { background: var(--card-background-color); border-radius: 24px; padding: 16px 18px; box-shadow: var(--ha-card-box-shadow, none);
    border: 1px solid var(--ha-card-border-color, var(--divider-color)); }
  .blok h2 { margin: 0 0 8px; font-size: 1.25rem; display: flex; align-items: baseline; gap: 8px; }
  .eten small { color: var(--secondary-text-color); }
  .eten .gerecht { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
  .eten .em { font-size: 2.4rem; }
  .eten b { font-size: 1.3rem; line-height: 1.2; }
  .eten b.niks { color: var(--secondary-text-color); font-weight: 500; font-size: 1.05rem; }
  .eten .kok { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: var(--secondary-text-color); }
  .eten .mrg { margin-top: 6px; color: var(--secondary-text-color); font-size: .9rem; }
  .blok h2 small { color: var(--secondary-text-color); font-size: .9rem; font-weight: 500; }
  .klok { font-size: clamp(4rem, 9vw, 7.5rem); font-weight: 300; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; margin-top: 6px; }
  .datum { font-size: 1.4rem; color: var(--secondary-text-color); margin-bottom: 4px; }
  .datum::first-letter { text-transform: uppercase; }
  .weer .nu { display: flex; align-items: center; gap: 12px; }
  .wi { font-size: 3.4rem; line-height: 1; }
  .temp { font-size: 3rem; font-weight: 300; }
  .minmax { color: var(--secondary-text-color); font-size: 1.1rem; margin-left: auto; }
  .fc { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; text-align: center; }
  .fc div { display: grid; gap: 2px; padding: 6px; border-radius: 14px; background: var(--secondary-background-color); }
  .fc small { color: var(--secondary-text-color); text-transform: capitalize; }
  .fc span { font-size: 1.5rem; }
  .feest { font-size: 1.3rem; background: color-mix(in srgb, #e91e63 12%, var(--card-background-color)); }
  .afval small { color: var(--secondary-text-color); font-size: 1rem; }
  .afv { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .afv span { font-size: 1.3rem; font-weight: 600; padding: 6px 14px; border-radius: 999px; background: color-mix(in srgb, var(--k) 16%, transparent); }
  .ev { display: flex; align-items: center; gap: 12px; padding: 9px 0; font-size: 1.15rem; }
  .ev + .ev { border-top: 1px solid var(--divider-color); }
  .ev .streep { width: 6px; align-self: stretch; border-radius: 6px; flex: none; }
  .ev .tijd { min-width: 3.4em; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .ev .wat { flex: 1; min-width: 0; }
  .ev .wat small { display: block; color: var(--secondary-text-color); font-size: .85rem; }
  .ev.kort { font-size: 1rem; padding: 6px 0; }
  .ev .dag { min-width: 4.4em; color: var(--secondary-text-color); text-transform: capitalize; }
  .avs { display: inline-flex; }
  .avs .fam-avatar + .fam-avatar { margin-left: -8px; }
  .niks { color: var(--secondary-text-color); font-size: 1.05rem; padding: 6px 0; }
  .klein h2 { font-size: 1.05rem; }
  .kind + .kind { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--divider-color); }
  .kkop { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 1.15rem; }
  .kkop b { flex: 1; }
  .ster { font-weight: 700; padding: 4px 12px; border-radius: 999px; background: color-mix(in srgb, #ffb300 22%, transparent); }
  .tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
  .tegel { border: 0; cursor: pointer; font: inherit; color: var(--primary-text-color); border-radius: 18px; padding: 10px 6px; display: grid; justify-items: center; gap: 4px;
    background: var(--secondary-background-color); position: relative; }
  .tegel:active { transform: scale(.95); }
  .tegel .em { font-size: 2.1rem; line-height: 1; }
  .tegel .nm { font-size: .85rem; font-weight: 600; line-height: 1.15; text-align: center; }
  .tegel.ok { background: color-mix(in srgb, var(--success-color, #43a047) 20%, transparent); }
  .tegel.ok::after { content: '✓'; position: absolute; top: 6px; right: 10px; font-weight: 800; color: var(--success-color, #2e7d32); }
  .tegel.wacht { background: color-mix(in srgb, #ffb300 18%, transparent); }
  .alles { margin-top: 6px; color: var(--success-color, #2e7d32); font-weight: 600; }
  .thuis { display: flex; flex-wrap: wrap; gap: 14px; justify-content: space-around; }
  .thuis.smal { gap: 6px 12px; }
  .blok:has(> .thuis.smal) { padding: 10px 18px; }
  .thuis.smal .pers { flex-direction: row; display: flex; align-items: center; gap: 6px; }
  .thuis.smal .pers small { display: none; }
  .pers { display: grid; justify-items: center; gap: 2px; font-weight: 600; }
  .pers small { color: var(--secondary-text-color); font-weight: 400; }
  .pers.weg .fam-avatar { opacity: .5; }
  .bs { display: grid; grid-template-columns: auto 1fr minmax(260px, 34%); gap: 14px; align-items: center; }
  .bs h2 { margin: 0; white-space: nowrap; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { border: 0; font: inherit; font-size: 1.05rem; padding: 8px 14px; border-radius: 999px; background: var(--secondary-background-color); color: var(--primary-text-color); cursor: pointer; }
  .chip.weg { opacity: .3; text-decoration: line-through; }
  .chip.meer { cursor: default; color: var(--secondary-text-color); }
  .invoer { display: flex; gap: 8px; }
  .invoer input { flex: 1; min-width: 0; font: inherit; font-size: 1.05rem; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--divider-color);
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .nacht { position: fixed; inset: 0; z-index: 50; background: #000; color: #fff; display: grid; place-content: center; text-align: center; cursor: pointer; }
  .nacht[hidden] { display: none; }
  .nklok, .ndatum, .nacht small { transform: translate(var(--dx, 0), var(--dy, 0)); }
  .nklok { font-size: 9rem; font-weight: 200; opacity: .45; font-variant-numeric: tabular-nums; }
  .ndatum { font-size: 1.5rem; opacity: .3; }
  .ndatum::first-letter { text-transform: uppercase; }
  .nacht small { opacity: .18; margin-top: 18px; }
  .feestje { position: fixed; inset: 0; display: grid; place-items: center; z-index: 40; pointer-events: none; font-size: 9rem; animation: feest 1.2s ease-out forwards; }
  @keyframes feest { 0% { transform: scale(.3); opacity: 0; } 30% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
  @media (max-width: 900px) and (min-width: 600px) {   /* staande tablet: klok en klusjes naast elkaar, agenda eronder */
    :host, .muur { height: auto; min-height: 100vh; overflow: visible; }
    .muur, .muur.zonder-midden { grid-template-columns: 1fr 1fr; grid-template-rows: auto; grid-template-areas: 'links rechts' 'midden midden' 'onder onder'; }
    .bs { grid-template-columns: 1fr; }
    .klok { font-size: 5.5rem; }
  }
  @media (max-width: 599px) {   /* telefoon: onder elkaar */
    :host, .muur { height: auto; overflow: visible; }
    .muur, .muur.zonder-midden { grid-template-columns: 1fr; grid-template-areas: 'links' 'midden' 'rechts' 'onder'; grid-template-rows: auto; }
    .bs { grid-template-columns: 1fr; }
  }
`;

if (!customElements.get('ha-family-muur')) customElements.define('ha-family-muur', HaFamilyMuur);
