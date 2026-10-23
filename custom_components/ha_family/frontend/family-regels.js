/* HA Family — automatisch aan en uit (HA-Family-Cards).
 *
 *   type: custom:family-regels-card    regels als "Elke werkdag om 07:00 → Keukenlamp aan", stap voor stap met grote knoppen
 *
 * Geen klok om in te typen: de tijd zet je met grote + en − knoppen of een veelgebruikte tijd; dagen, kamers en apparaten
 * zijn tegels. HA Family voert de regels zelf uit; de automatiseringen van Home Assistant blijven onaangeroerd. */
import { CSS, esc } from './family-ui.js?v=0.13.2';

const TEKST = {
  nl: { titel: 'Automatisch aan en uit', uitleg: 'Laat lampen en apparaten vanzelf aan- of uitgaan, op een tijd of als het donker wordt.',
    nieuw: 'Nieuwe regel', geen: 'Nog geen regels. Begin met een voorbeeld of maak er zelf een:', alleenOuders: 'Alleen ouders kunnen regels maken.',
    stap: 'Stap {x} van 4', wanneer: 'Wanneer?', opTijd: 'Op een tijd', donker: 'Als het donker wordt', licht: 'Als het licht wordt',
    precies: 'Precies dan', ervoor: '{x} min ervoor', erna: '{x} min erna', uur: 'uur', minuten: 'minuten', vaak: 'Vaak gebruikt',
    dagen: 'Welke dagen?', elkeDag: 'Elke dag', werkdagen: 'Werkdagen', weekend: 'Weekend', welke: 'Welke lampen en apparaten?', kies: 'Tik op wat mee moet doen',
    watDoen: 'Aan of uit?', aan: 'Aan', uit: 'Uit', fel: 'Hoe fel?', vorige: 'Vorige', volgende: 'Volgende', bewaren: 'Bewaren', annuleren: 'Annuleren',
    controle: 'Zo wordt het:', volgendeKeer: 'Volgende keer: {x}', uitgezet: 'Staat uit', proberen: 'Nu uitproberen', geprobeerd: 'Gedaan ✓',
    zekerWeg: 'Deze regel weghalen?', bewaard: 'Bewaard ✓', vandaag: 'vandaag', morgen: 'morgen', om: 'om', gekozen: '{x} gekozen',
    zin: { elke: 'Elke dag', werk: 'Elke werkdag', weekend: 'In het weekend', op: 'Op' }, zon: { zonsondergang: 'als het donker wordt', zonsopkomst: 'als het licht wordt' },
    gaat: { aan: 'aan', uit: 'uit' }, voorbeelden: 'Voorbeelden', vb1: '🌇 Buitenlamp aan als het donker wordt', vb2: '🌙 Om 23:00 alles uit', vb3: '☀️ Werkdagen 07:00 keuken aan' },
  en: { titel: 'Automatically on and off', uitleg: 'Let lights and devices switch on or off by themselves, at a time or when it gets dark.',
    nieuw: 'New rule', geen: 'No rules yet. Start with an example or make your own:', alleenOuders: 'Only parents can make rules.',
    stap: 'Step {x} of 4', wanneer: 'When?', opTijd: 'At a time', donker: 'When it gets dark', licht: 'When it gets light',
    precies: 'Exactly then', ervoor: '{x} min before', erna: '{x} min after', uur: 'hours', minuten: 'minutes', vaak: 'Often used',
    dagen: 'Which days?', elkeDag: 'Every day', werkdagen: 'Weekdays', weekend: 'Weekend', welke: 'Which lights and devices?', kies: 'Tap what should take part',
    watDoen: 'On or off?', aan: 'On', uit: 'Off', fel: 'How bright?', vorige: 'Back', volgende: 'Next', bewaren: 'Save', annuleren: 'Cancel',
    controle: 'This is it:', volgendeKeer: 'Next time: {x}', uitgezet: 'Switched off', proberen: 'Try it now', geprobeerd: 'Done ✓',
    zekerWeg: 'Remove this rule?', bewaard: 'Saved ✓', vandaag: 'today', morgen: 'tomorrow', om: 'at', gekozen: '{x} selected',
    zin: { elke: 'Every day', werk: 'Every weekday', weekend: 'At the weekend', op: 'On' }, zon: { zonsondergang: 'when it gets dark', zonsopkomst: 'when it gets light' },
    gaat: { aan: 'on', uit: 'off' }, voorbeelden: 'Examples', vb1: '🌇 Outdoor light on when dark', vb2: '🌙 Everything off at 23:00', vb3: '☀️ Weekdays 07:00 kitchen on' },
};
const DAG_KORT = { nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'], en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] };
const DAG_LANG = { nl: ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] };
const VAAK = ['06:30', '07:00', '08:00', '17:00', '18:00', '21:00', '22:00', '23:00'];
const ICOON = { light: 'mdi:lightbulb', switch: 'mdi:power-socket-eu', fan: 'mdi:fan', climate: 'mdi:air-conditioner', cover: 'mdi:window-shutter', media_player: 'mdi:speaker' };
const taalVan = (h) => (((h && (h.config && h.config.language || h.locale && h.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');
const twee = (n) => String(n).padStart(2, '0');

const STIJL = `
  ha-card { padding: 18px; }
  h2 { margin: 0; font-size: 1.4rem; } .sub { color: var(--secondary-text-color); }
  .kop { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; } .kop .tk { flex: 1; min-width: 200px; }
  .groot { border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 1.1rem; min-height: 60px; padding: 0 24px; border-radius: 30px;
    display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .groot.zacht { background: color-mix(in srgb, var(--primary-color) 14%, transparent); color: var(--primary-color); }
  .groot.rand { background: none; color: var(--primary-text-color); box-shadow: inset 0 0 0 2px var(--divider-color); }
  .groot:disabled { opacity: .4; cursor: default; }
  .regel { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 22px; background: var(--secondary-background-color); margin-bottom: 10px; }
  .regel .em { font-size: 2.2rem; } .regel .tk { flex: 1; min-width: 0; } .regel b { font-size: 1.15rem; display: block; }
  .regel.uit { opacity: .55; }
  .schakel { width: 64px; height: 36px; border-radius: 18px; border: 0; cursor: pointer; background: var(--disabled-text-color, #bbb); position: relative; flex: none; }
  .schakel::after { content: ''; position: absolute; top: 4px; left: 4px; width: 28px; height: 28px; border-radius: 50%; background: #fff; transition: left .15s; }
  .schakel.aan { background: var(--success-color, #43a047); } .schakel.aan::after { left: 32px; }
  .x { border: 0; background: none; cursor: pointer; width: 48px; height: 48px; border-radius: 50%; font-size: 1.3rem; }
  .x:hover { background: var(--card-background-color); }
  .wiz { background: var(--secondary-background-color); border-radius: 26px; padding: 18px; }
  .wiz h3 { font-size: 1.5rem; margin: 4px 0 14px; }
  .keuzes { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
  .keuze { border: 0; cursor: pointer; font: inherit; color: var(--primary-text-color); background: var(--card-background-color); border-radius: 22px; padding: 18px;
    display: grid; justify-items: center; gap: 8px; min-height: 120px; box-shadow: inset 0 0 0 2px var(--divider-color); font-size: 1.1rem; font-weight: 600; text-align: center; }
  .keuze .em { font-size: 2.6rem; line-height: 1; } .keuze ha-icon { --mdc-icon-size: 40px; color: var(--secondary-text-color); }
  .keuze.aan { box-shadow: inset 0 0 0 4px var(--primary-color); background: color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color)); }
  .keuze.aan ha-icon { color: var(--primary-color); }
  .keuze small { font-weight: 400; color: var(--secondary-text-color); font-size: .85rem; }
  .klok { display: flex; align-items: center; justify-content: center; gap: 18px; margin: 18px 0; }
  .klok .kol { display: grid; justify-items: center; gap: 8px; } .klok .kol small { color: var(--secondary-text-color); }
  .klok .getal { font-size: 4.2rem; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 1.4em; text-align: center; line-height: 1; }
  .klok .dp { font-size: 3.6rem; font-weight: 700; }
  .pijl { border: 0; cursor: pointer; width: 76px; height: 60px; border-radius: 20px; font-size: 1.8rem; background: var(--card-background-color); color: var(--primary-text-color);
    box-shadow: inset 0 0 0 2px var(--divider-color); }
  .pijl:active, .keuze:active, .groot:active { transform: scale(.96); }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 8px 0; }
  .chip { border: 0; cursor: pointer; font: inherit; font-weight: 600; font-size: 1.05rem; min-height: 52px; padding: 0 20px; border-radius: 26px;
    background: var(--card-background-color); color: var(--primary-text-color); box-shadow: inset 0 0 0 2px var(--divider-color); }
  .chip.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); box-shadow: none; }
  .dagen { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 14px 0; }
  .dagen .chip { padding: 0; min-height: 64px; font-size: 1.15rem; }
  .kamers { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 10px; }
  .kamers .chip { white-space: nowrap; }
  .nav { display: flex; gap: 12px; justify-content: space-between; margin-top: 20px; flex-wrap: wrap; }
  .zin { font-size: 1.35rem; font-weight: 600; padding: 16px; border-radius: 20px; background: var(--card-background-color); margin: 10px 0; line-height: 1.4; }
  .wat { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 18px; background: var(--card-background-color); margin-top: 8px; flex-wrap: wrap; }
  .wat b { flex: 1; min-width: 140px; font-size: 1.05rem; } .wat ha-icon { --mdc-icon-size: 30px; color: var(--primary-color); }
  .stap { color: var(--secondary-text-color); font-weight: 600; }
  .vb { display: grid; gap: 10px; margin-top: 10px; }
  @media (max-width: 600px) { .klok .getal { font-size: 3.2rem; } .pijl { width: 64px; height: 54px; } .keuzes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dagen .chip { min-height: 52px; font-size: 1rem; } .wat b { flex-basis: 100%; } }
`;

class FamilyRegelsCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return typeof v === 'string' && x !== undefined ? v.replaceAll('{x}', x) : v; }
  get _taal() { return taalVan(this._hass); }

  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (eerste) { this.attachShadow({ mode: 'open' }); this.shadowRoot.addEventListener('click', (e) => this._klik(e)); this._laad(); }
  }
  async _laad() {
    try {
      const [r, h] = await Promise.all([this._hass.callWS({ type: 'ha_family/regels' }), this._huis || this._hass.callWS({ type: 'ha_family/huis' })]);
      this._d = r; this._huis = h; this._fout = null;
    } catch (e) { this._fout = e.message; }
    this._teken();
  }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  async _ws(type, data, ok) {
    try { const r = await this._hass.callWS({ type, ...data }); if (ok) this._melding(ok); await this._laad(); return r ?? true; } catch (e) { this._melding(e.message); return null; }
  }

  /* ── zinnen ── */
  _dagenZin(dagen) {
    const z = this.t('zin'), d = [...dagen].sort().join();
    if (d === '0,1,2,3,4,5,6') return z.elke;
    if (d === '0,1,2,3,4') return z.werk;
    if (d === '5,6') return z.weekend;
    const namen = dagen.map((x) => DAG_LANG[this._taal][x]);
    return `${z.op} ${namen.length > 1 ? namen.slice(0, -1).join(', ') + (this._taal === 'nl' ? ' en ' : ' and ') + namen.at(-1) : namen[0]}`;
  }
  _wanneerZin(w) {
    if (w.soort === 'tijd') return `${this.t('om')} ${w.tijd}`;
    const o = w.offset || 0;
    return `${this.t('zon')[w.soort]}${o ? ` (${o < 0 ? this.t('ervoor', -o) : this.t('erna', o)})` : ''}`;
  }
  _naam(e) { const a = this._huis && this._huis.apparaten.find((x) => x.entity === e); const s = this._hass.states[e]; return ((a && a.naam) || (s && s.attributes.friendly_name) || e).replace(/\s+socket\s*\d+$/i, ''); }
  _watZin(wat) {
    const per = { aan: [], uit: [] };
    wat.forEach((x) => per[x.actie].push(this._naam(x.entity) + (x.helderheid && x.helderheid < 100 ? ` (${x.helderheid}%)` : '')));
    return ['aan', 'uit'].filter((k) => per[k].length).map((k) => `${per[k].join(', ')} → ${this.t('gaat')[k]}`).join(' · ');
  }
  _wanneerTekst(iso) {
    const d = new Date(iso), nu = new Date(), morgen = new Date(); morgen.setDate(nu.getDate() + 1);
    const dag = d.toDateString() === nu.toDateString() ? this.t('vandaag') : d.toDateString() === morgen.toDateString() ? this.t('morgen') : DAG_LANG[this._taal][(d.getDay() + 6) % 7];
    return `${dag} ${twee(d.getHours())}:${twee(d.getMinutes())}`;
  }

  _teken() {
    if (!this.shadowRoot) return;
    let binnen;
    if (this._fout) binnen = `<div class="sub">${esc(this._fout)}</div>`;
    else if (!this._d) binnen = '<div class="sub">…</div>';
    else if (this._w) binnen = this._wizard();
    else binnen = this._lijst();
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${binnen}</ha-card>`;
  }

  _lijst() {
    const d = this._d;
    const kop = `<div class="kop"><div class="tk"><h2>⏰ ${esc(this.t('titel'))}</h2><div class="sub">${esc(this.t('uitleg'))}</div></div>
      ${d.mag ? `<button class="groot" data-a="nieuw">＋ ${esc(this.t('nieuw'))}</button>` : ''}</div>`;
    if (!d.regels.length) {
      return `${kop}${d.mag ? `<p class="sub">${esc(this.t('geen'))}</p><div class="vb">
        <button class="groot zacht" data-a="vb" data-v="1">${esc(this.t('vb1'))}</button><button class="groot zacht" data-a="vb" data-v="2">${esc(this.t('vb2'))}</button>
        <button class="groot zacht" data-a="vb" data-v="3">${esc(this.t('vb3'))}</button></div>` : `<p class="sub">${esc(this.t('alleenOuders'))}</p>`}`;
    }
    return kop + d.regels.map((r) => `<div class="regel ${r.aan ? '' : 'uit'}"><span class="em">${r.wanneer.soort === 'tijd' ? '🕖' : r.wanneer.soort === 'zonsondergang' ? '🌇' : '🌅'}</span>
      <span class="tk"><b>${esc(this._dagenZin(r.dagen))} ${esc(this._wanneerZin(r.wanneer))}</b><span>${esc(this._watZin(r.wat))}</span>
        <div class="sub">${r.aan ? (r.volgende ? esc(this.t('volgendeKeer', this._wanneerTekst(r.volgende))) : '') : esc(this.t('uitgezet'))}</div></span>
      ${d.mag ? `<button class="schakel ${r.aan ? 'aan' : ''}" data-a="aan" data-r="${r.id}" data-v="${r.aan ? '' : '1'}" aria-label="aan/uit"></button>
        <button class="x" data-a="bewerk" data-r="${r.id}" title="✏️">✏️</button><button class="x" data-a="weg" data-r="${r.id}" title="🗑️">🗑️</button>` : ''}</div>`).join('');
  }

  /* ── stap voor stap ── */
  _wizard() {
    const w = this._w, s = w.stap;
    let inhoud = '', verder = true;
    if (s === 1) {
      const k = (soort, em, tekst) => `<button class="keuze ${w.wanneer.soort === soort ? 'aan' : ''}" data-a="soort" data-v="${soort}"><span class="em">${em}</span>${esc(tekst)}</button>`;
      inhoud = `<h3>${esc(this.t('wanneer'))}</h3><div class="keuzes">${k('tijd', '🕖', this.t('opTijd'))}${k('zonsondergang', '🌇', this.t('donker'))}${k('zonsopkomst', '🌅', this.t('licht'))}</div>`;
      if (w.wanneer.soort === 'tijd') {
        const [u, m] = w.wanneer.tijd.split(':');
        inhoud += `<div class="klok"><div class="kol"><button class="pijl" data-a="tijd" data-v="60">▲</button><span class="getal">${u}</span><button class="pijl" data-a="tijd" data-v="-60">▼</button><small>${esc(this.t('uur'))}</small></div>
          <span class="dp">:</span><div class="kol"><button class="pijl" data-a="tijd" data-v="5">▲</button><span class="getal">${m}</span><button class="pijl" data-a="tijd" data-v="-5">▼</button><small>${esc(this.t('minuten'))}</small></div></div>
          <div class="sub" style="text-align:center">${esc(this.t('vaak'))}</div><div class="chips">${VAAK.map((x) => `<button class="chip ${w.wanneer.tijd === x ? 'aan' : ''}" data-a="vaak" data-v="${x}">${x}</button>`).join('')}</div>`;
      } else {
        const o = w.wanneer.offset || 0;
        inhoud += `<div class="chips" style="margin-top:18px">${[-60, -30, -15, 0, 15, 30, 60].map((x) => `<button class="chip ${o === x ? 'aan' : ''}" data-a="offset" data-v="${x}">${esc(x === 0 ? this.t('precies') : x < 0 ? this.t('ervoor', -x) : this.t('erna', x))}</button>`).join('')}</div>`;
      }
    } else if (s === 2) {
      const sel = new Set(w.dagen), snel = (v, tekst, d) => `<button class="chip ${[...sel].sort().join() === d.join() ? 'aan' : ''}" data-a="snel" data-v="${d.join()}">${esc(tekst)}</button>`;
      inhoud = `<h3>${esc(this.t('dagen'))}</h3><div class="chips">${snel(0, this.t('elkeDag'), [0, 1, 2, 3, 4, 5, 6])}${snel(1, this.t('werkdagen'), [0, 1, 2, 3, 4])}${snel(2, this.t('weekend'), [5, 6])}</div>
        <div class="dagen">${DAG_KORT[this._taal].map((n, i) => `<button class="chip ${sel.has(i) ? 'aan' : ''}" data-a="dag" data-v="${i}">${n}</button>`).join('')}</div>`;
      verder = sel.size > 0;
    } else if (s === 3) {
      const h = this._huis, kamers = h.kamers.filter((k) => this._apps(k.kamer).length);
      if (!w.kamer && kamers.length) w.kamer = kamers[0].kamer;
      const apps = this._apps(w.kamer), gekozen = new Set(w.wat.map((x) => x.entity));
      inhoud = `<h3>${esc(this.t('welke'))}</h3><div class="sub" style="margin-bottom:10px">${esc(this.t('kies'))}${gekozen.size ? ` · <b>${esc(this.t('gekozen', gekozen.size))}</b>` : ''}</div>
        <div class="kamers">${kamers.map((k) => { const n = this._apps(k.kamer).filter((a) => gekozen.has(a.entity)).length;
          return `<button class="chip ${w.kamer === k.kamer ? 'aan' : ''}" data-a="kamer" data-v="${esc(k.kamer)}">${esc(k.naam)}${n ? ` (${n})` : ''}</button>`; }).join('')}</div>
        <div class="keuzes">${apps.map((a) => `<button class="keuze ${gekozen.has(a.entity) ? 'aan' : ''}" data-a="app" data-v="${esc(a.entity)}"><ha-icon icon="${ICOON[a.domein] || 'mdi:power'}"></ha-icon>${esc(this._naam(a.entity))}</button>`).join('')}</div>`;
      verder = gekozen.size > 0;
    } else {
      inhoud = `<h3>${esc(this.t('watDoen'))}</h3>${w.wat.map((x, i) => `<div class="wat"><ha-icon icon="${ICOON[x.entity.split('.')[0]] || 'mdi:power'}"></ha-icon><b>${esc(this._naam(x.entity))}</b>
          <button class="chip ${x.actie === 'aan' ? 'aan' : ''}" data-a="actie" data-i="${i}" data-v="aan">${esc(this.t('aan'))}</button><button class="chip ${x.actie === 'uit' ? 'aan' : ''}" data-a="actie" data-i="${i}" data-v="uit">${esc(this.t('uit'))}</button>
          ${x.actie === 'aan' && x.entity.startsWith('light.') ? [100, 50, 20].map((p) => `<button class="chip ${(x.helderheid || 100) === p ? 'aan' : ''}" data-a="fel" data-i="${i}" data-v="${p}">${p}%</button>`).join('') : ''}</div>`).join('')}
        <div class="sub" style="margin-top:18px">${esc(this.t('controle'))}</div>
        <div class="zin">${esc(this._dagenZin(w.dagen))} ${esc(this._wanneerZin(w.wanneer))}:<br>${esc(this._watZin(w.wat))}</div>`;
    }
    return `<div class="wiz"><div class="stap">${esc(this.t('stap', s))}</div>${inhoud}
      <div class="nav"><button class="groot rand" data-a="${s === 1 ? 'annuleer' : 'vorige'}">${esc(s === 1 ? this.t('annuleren') : '← ' + this.t('vorige'))}</button>
        ${s < 4 ? `<button class="groot" data-a="volgende" ${verder ? '' : 'disabled'}>${esc(this.t('volgende'))} →</button>` : `<button class="groot" data-a="bewaar">✓ ${esc(this.t('bewaren'))}</button>`}</div></div>`;
  }
  _apps(kamer) {
    return this._huis.apparaten.filter((a) => a.kamer === kamer && a.kan && a.tonen && !a.bijzaak && ICOON[a.domein] && this._hass.states[a.entity]);
  }

  async _klik(e) {
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const a = b.dataset.a, w = this._w, v = b.dataset.v;
    const nieuw = (extra = {}) => ({ stap: 1, regel: null, wanneer: { soort: 'tijd', tijd: '07:00', offset: 0 }, dagen: [0, 1, 2, 3, 4, 5, 6], wat: [], kamer: null, ...extra });
    if (a === 'nieuw') { this._w = nieuw(); return this._teken(); }
    if (a === 'vb') {
      this._w = v === '1' ? nieuw({ wanneer: { soort: 'zonsondergang', offset: 0, tijd: '07:00' } }) : v === '2' ? nieuw({ wanneer: { soort: 'tijd', tijd: '23:00', offset: 0 } })
        : nieuw({ dagen: [0, 1, 2, 3, 4] });
      this._w.standaardActie = v === '2' ? 'uit' : 'aan';
      return this._teken();
    }
    if (a === 'bewerk') {
      const r = this._d.regels.find((x) => x.id === b.dataset.r);
      this._w = nieuw({ regel: r.id, wanneer: { tijd: '07:00', offset: 0, ...r.wanneer }, dagen: [...r.dagen], wat: r.wat.map((x) => ({ ...x })) });
      return this._teken();
    }
    if (a === 'weg') { if (confirm(this.t('zekerWeg'))) await this._ws('ha_family/regel/weg', { regel: b.dataset.r }); return; }
    if (a === 'aan') return this._ws('ha_family/regel/aan', { regel: b.dataset.r, aan: !!v });
    if (!w) return;
    if (a === 'annuleer') { this._w = null; return this._teken(); }
    if (a === 'vorige') { w.stap -= 1; return this._teken(); }
    if (a === 'volgende') { w.stap += 1; if (w.stap === 4) w.wat.forEach((x) => { if (!x.actie) x.actie = w.standaardActie || 'aan'; }); this.scrollIntoView({ block: 'start', behavior: 'smooth' }); return this._teken(); }
    if (a === 'soort') { w.wanneer.soort = v; return this._teken(); }
    if (a === 'tijd') {
      const [u, m] = w.wanneer.tijd.split(':').map(Number), totaal = ((u * 60 + m + Number(v)) % 1440 + 1440) % 1440;
      w.wanneer.tijd = `${twee(Math.floor(totaal / 60))}:${twee(Math.floor((totaal % 60) / 5) * 5)}`; return this._teken();
    }
    if (a === 'vaak') { w.wanneer.tijd = v; return this._teken(); }
    if (a === 'offset') { w.wanneer.offset = Number(v); return this._teken(); }
    if (a === 'snel') { w.dagen = v.split(',').map(Number); return this._teken(); }
    if (a === 'dag') { const d = Number(v); w.dagen = w.dagen.includes(d) ? w.dagen.filter((x) => x !== d) : [...w.dagen, d].sort(); return this._teken(); }
    if (a === 'kamer') { w.kamer = v; return this._teken(); }
    if (a === 'app') { w.wat = w.wat.some((x) => x.entity === v) ? w.wat.filter((x) => x.entity !== v) : [...w.wat, { entity: v, actie: null }]; return this._teken(); }
    if (a === 'actie') { w.wat[Number(b.dataset.i)].actie = v; return this._teken(); }
    if (a === 'fel') { w.wat[Number(b.dataset.i)].helderheid = Number(v); return this._teken(); }
    if (a === 'bewaar') {
      const r = await this._ws('ha_family/regel', { ...(w.regel ? { regel: w.regel } : {}), wanneer: w.wanneer, dagen: w.dagen, wat: w.wat.map(({ entity, actie, helderheid }) => ({ entity, actie: actie || 'aan', ...(helderheid ? { helderheid } : {}) })) }, this.t('bewaard'));
      if (r) { this._w = null; this._teken(); }
    }
  }
}

export const REGEL_KAARTEN = [
  ['family-regels-card', FamilyRegelsCard, 'HA Family: automatisch aan en uit', 'Lampen en apparaten vanzelf aan of uit, op een tijd of als het donker wordt. Stap voor stap, zonder klok in te typen.'],
];
