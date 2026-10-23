/* HA Family — gezinsagenda (HA-Family-Cards).
 *
 *   type: custom:family-agenda-card    maand (blokken met puntjes) of weken (weekplanner met weektitels); ieder kiest zelf
 *   type: custom:family-vandaag-card   vandaag, afval van morgen en wie er binnenkort jarig is
 *
 * Alle afspraken komen samengevoegd uit HA Family (ha_family/agenda): eigen afspraken, agenda's per gezinslid,
 * gezamenlijke agenda's, verjaardagen en afval. De kleur is die van wie het betreft. */
import { CSS, avatar, esc, ikLid, leden } from './family-ui.js?v=0.13.1';

const TEKST = {
  nl: {
    agenda: 'Agenda', vandaag: 'Vandaag', morgen: 'Morgen', maand: 'Maand', weken: 'Weken', week: 'Week', afspraak: 'Afspraak',
    weekTitel: 'Titel (bijv. Herfstvakantie)', heleDag: 'hele dag', niks: 'Niks gepland.', iedereen: 'Hele gezin',
    verjaardagen: 'Verjaardagen', afval: 'Afval', wat: 'Wat?', watVb: 'bijv. Zwemles', datum: 'Datum', tot: 'Tot en met', van: 'Van', totTijd: 'Tot',
    voorWie: 'Voor wie?', herhalen: 'Herhalen', plek: 'Waar? (mag leeg)', notitie: 'Notitie (mag leeg)', opslaan: 'Opslaan', annuleren: 'Annuleren',
    verwijderen: 'Verwijderen', zeker: 'Deze afspraak verwijderen?', zekerReeks: 'Deze herhalende afspraak verwijderen? Alle keren verdwijnen.',
    reeks: 'Dit is een herhalende afspraak: je past alle keren aan.', sluiten: 'Sluiten', bewerken: 'Bewerken',
    herhaal: { '': 'Niet', week: 'Elke week', '2weken': 'Om de week', maand: 'Elke maand', jaar: 'Elk jaar' },
    uitAgenda: 'Uit de agenda', binnenkort: 'Binnenkort', opnieuw: 'Opnieuw maken', jarigBinnenkort: 'Binnenkort jarig', afvalMorgen: 'Morgen aan de straat', afvalVandaag: 'Vandaag wordt opgehaald',
    gepland: 'Vandaag', bezig: 'nu', dagen: 'dagen', over: 'over', wordt: 'wordt', isJarig: 'jarig', eind: 'eind',
  },
  en: {
    agenda: 'Calendar', vandaag: 'Today', morgen: 'Tomorrow', maand: 'Month', weken: 'Weeks', week: 'Week', afspraak: 'Event',
    weekTitel: 'Title (e.g. Autumn holiday)', heleDag: 'all day', niks: 'Nothing planned.', iedereen: 'Whole family',
    verjaardagen: 'Birthdays', afval: 'Waste', wat: 'What?', watVb: 'e.g. Swimming lesson', datum: 'Date', tot: 'Until', van: 'From', totTijd: 'To',
    voorWie: 'For whom?', herhalen: 'Repeat', plek: 'Where? (optional)', notitie: 'Note (optional)', opslaan: 'Save', annuleren: 'Cancel',
    verwijderen: 'Delete', zeker: 'Delete this event?', zekerReeks: 'Delete this repeating event? All occurrences disappear.',
    reeks: 'This is a repeating event: you change all occurrences.', sluiten: 'Close', bewerken: 'Edit',
    herhaal: { '': 'Never', week: 'Every week', '2weken': 'Every other week', maand: 'Every month', jaar: 'Every year' },
    uitAgenda: 'From calendar', binnenkort: 'Coming up', opnieuw: 'Make again', jarigBinnenkort: 'Birthdays coming up', afvalMorgen: 'Put out tomorrow', afvalVandaag: 'Collected today',
    gepland: 'Today', bezig: 'now', dagen: 'days', over: 'in', wordt: 'turns', isJarig: 'birthday', eind: 'end',
  },
};
const taalVan = (hass) => (((hass && (hass.config && hass.config.language || hass.locale && hass.locale.language)) || 'en').startsWith('nl') ? 'nl' : 'en');
const tt = (hass, k) => TEKST[taalVan(hass)][k] ?? TEKST.en[k] ?? k;
const lang = (hass) => (hass && (hass.config && hass.config.language || hass.locale && hass.locale.language)) || undefined;
const pad = (n) => String(n).padStart(2, '0');
const isoDag = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const maandag = (d) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
const plusDagen = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const jaar = t.getUTCFullYear();
  return [jaar, Math.ceil(((t - Date.UTC(jaar, 0, 1)) / 864e5 + 1) / 7)];
};
const opDag = (events, dag) => events.filter((e) => {
  const s = e.start.slice(0, 10), eind = (e.eind || e.start).slice(0, 10);
  return s <= dag && dag <= eind;
});
const tijd = (hass, e) => (e.hele_dag ? tt(hass, 'heleDag') : new Date(e.start).toLocaleTimeString(lang(hass), { hour: '2-digit', minute: '2-digit' }));
const kleurenVan = (e, lmap) => {
  if (e.kleur) return [e.kleur];
  const k = (e.wie || []).map((w) => lmap[w] && lmap[w].kleur).filter(Boolean);
  return k.length ? k : [e.soort === 'verjaardag' ? '#e91e63' : 'var(--primary-color)'];
};

const AGENDA_CSS = `
  ha-card { padding: 16px; }
  .balk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: space-between; }
  .nav { display: flex; align-items: center; gap: 4px; }
  .nav b { min-width: 9.5em; text-align: center; font-size: 1.1rem; }
  .nav b::first-letter, .dagkop::first-letter { text-transform: uppercase; }
  .x { border: 0; background: none; color: var(--primary-text-color); cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; }
  .x:hover { background: var(--secondary-background-color); }
  .seg { display: inline-flex; border-radius: 22px; box-shadow: inset 0 0 0 1px var(--divider-color); overflow: hidden; }
  .seg button { border: 0; background: none; color: var(--primary-text-color); font: inherit; padding: 0 16px; min-height: 40px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
  .seg button.aan { background: color-mix(in srgb, var(--primary-color) 14%, transparent); color: var(--primary-color); font-weight: 600; }
  .seg ha-icon, .fam-knop ha-icon { --mdc-icon-size: 18px; }
  .legenda { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 4px; }
  .leg { border: 0; cursor: pointer; font: inherit; font-size: .85rem; display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px 3px 3px;
    border-radius: 999px; background: color-mix(in srgb, var(--k) 14%, transparent); color: var(--primary-text-color); }
  .leg.uit { opacity: .4; filter: grayscale(1); }
  .leg.ico { padding: 3px 12px; }
  .raster { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 8px; }
  .wd { text-align: center; font-size: .72rem; text-transform: uppercase; color: var(--secondary-text-color); padding: 4px 0; }
  .cel { border: 0; font: inherit; color: var(--primary-text-color); background: var(--secondary-background-color); border-radius: 12px; min-height: 64px;
    padding: 6px 2px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
  .cel.ander { opacity: .4; }
  .cel.nu { box-shadow: inset 0 0 0 2px var(--primary-color); font-weight: 700; }
  .cel.kies { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .stippen { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; align-items: center; min-height: 14px; font-size: .7rem; line-height: 1; }
  .stippen i { width: 8px; height: 8px; border-radius: 50%; display: block; }
  .cel.kies .stippen i { box-shadow: 0 0 0 1.5px var(--text-primary-color, #fff); }
  .dagkop { font-weight: 600; margin: 14px 0 4px; }
  .dagkop.nu { color: var(--primary-color); }
  .item { display: flex; gap: 10px; align-items: center; padding: 8px 6px; border-radius: 12px; cursor: pointer; border: 0; background: none; font: inherit;
    color: inherit; width: 100%; text-align: left; }
  .item:hover { background: var(--secondary-background-color); }
  .item .streep { width: 4px; align-self: stretch; border-radius: 4px; flex: none; }
  .item .tijd { min-width: 4.6em; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; font-size: .9rem; }
  .item .wat { flex: 1; min-width: 0; }
  .item .sub { color: var(--secondary-text-color); font-size: .82rem; }
  .avs { display: inline-flex; }
  .avs .fam-avatar + .fam-avatar { margin-left: -6px; }
  .leeg { color: var(--secondary-text-color); padding: 8px 6px; }
  .week { border-radius: 16px; box-shadow: inset 0 0 0 1px var(--divider-color); overflow: hidden; }
  .week + .week { margin-top: 12px; }
  .wkop { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--secondary-background-color); }
  .wkop b { white-space: nowrap; }
  .wkop input { flex: 1; min-width: 0; border: 0; background: none; font: inherit; color: var(--primary-text-color); padding: 4px 0; outline: none; }
  .wkop input::placeholder { color: var(--secondary-text-color); }
  .drij { display: grid; grid-template-columns: 6em 1fr auto; gap: 8px; align-items: center; padding: 8px 14px; min-height: 28px; border-top: 1px solid var(--divider-color); }
  .drij.nu { background: color-mix(in srgb, var(--primary-color) 7%, transparent); }
  .drij.nu .dl { color: var(--primary-color); font-weight: 600; }
  .dl { color: var(--secondary-text-color); font-size: .92rem; }
  .pillen { display: flex; flex-wrap: wrap; gap: 6px; }
  .pil { border: 0; cursor: pointer; font: inherit; border-radius: 999px; padding: 2px 10px 2px 3px; font-size: .84rem; display: inline-flex; align-items: center; gap: 6px;
    max-width: 100%; color: var(--primary-text-color); background: color-mix(in srgb, var(--k) 16%, transparent); }
  .pil.zonder { padding-left: 10px; }
  .pil span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .plus { visibility: hidden; }
  .drij:hover .plus, .drij:focus-within .plus { visibility: visible; }
  @media (hover: none) { .plus { visibility: visible; opacity: .5; } }
  .achter { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: 16px; }
  .dlg { background: var(--card-background-color); color: var(--primary-text-color); border-radius: 24px; padding: 22px; width: min(520px, 100%);
    max-height: calc(100vh - 32px); overflow: auto; box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
  .dlg h2 { margin: 0 0 8px; font-size: 1.3rem; }
  .lbl { display: block; font-weight: 600; margin: 14px 0 6px; }
  .veld { width: 100%; box-sizing: border-box; font: inherit; font-size: 1rem; padding: 11px 13px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .twee { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .wie { display: flex; flex-wrap: wrap; gap: 8px; }
  .wie button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 4px; padding: 6px; border-radius: 14px; opacity: .45; }
  .wie button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 14%, transparent); }
  .wie small { font-size: .8rem; }
  .vink { display: flex; gap: 10px; align-items: center; margin-top: 12px; cursor: pointer; }
  .vink input { width: 20px; height: 20px; }
  .knoppen { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 18px; }
  .knoppen .links { margin-right: auto; }
  .info { display: grid; gap: 6px; margin-top: 8px; }
  .fout { color: var(--error-color); margin-top: 10px; }
`;

class FamilyAgendaCard extends HTMLElement {
  setConfig(config) { this._config = { weken: 6, ...config }; }
  getCardSize() { return 10; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  connectedCallback() {
    this._klok = setInterval(() => this._laad(true), 300000);
    this._zicht = () => { if (!document.hidden) this._laad(true); };
    document.addEventListener('visibilitychange', this._zicht);
  }
  disconnectedCallback() { clearInterval(this._klok); document.removeEventListener('visibilitychange', this._zicht); }
  set hass(hass) {
    this._hass = hass;
    const sleutel = JSON.stringify(leden(hass));
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this.shadowRoot.addEventListener('change', (e) => this._wijzig(e));
      this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-week]')) e.target.blur(); });
      this._verborgen = new Set();
    }
    if (sleutel !== this._ledenSleutel) { this._ledenSleutel = sleutel; this._laad(true); }
  }
  t(k) { return tt(this._hass, k); }
  get _weergaveSleutel() { return 'ha-family-agenda:' + ((this._hass && this._hass.user && this._hass.user.id) || '-'); }
  get weergave() { try { return localStorage.getItem(this._weergaveSleutel) || this._config.weergave || 'maand'; } catch (e) { return this._config.weergave || 'maand'; } }
  set weergave(w) { try { localStorage.setItem(this._weergaveSleutel, w); } catch (e) { /* privémodus */ } }
  get _magSchrijven() { return !!(ikLid(this._hass) || (this._hass.user && this._hass.user.is_admin)); }

  _bereik() {
    const nu = new Date(); nu.setHours(0, 0, 0, 0);
    if (this.weergave === 'weken') {
      const start = plusDagen(maandag(nu), 7 * (this._stap || 0));
      return [start, plusDagen(start, 7 * this._config.weken)];
    }
    const eerste = new Date(nu.getFullYear(), nu.getMonth() + (this._stap || 0), 1);
    const start = maandag(eerste);
    return [start, plusDagen(start, 42)];
  }
  async _laad(forceer) {
    if (!this._hass) return;
    const [van, tot] = this._bereik(), sleutel = isoDag(van) + isoDag(tot);
    if (!forceer && sleutel === this._geladen) { this._teken(); return; }
    this._geladen = sleutel;
    try {
      const r = await this._hass.callWS({ type: 'ha_family/agenda', van: isoDag(van), tot: isoDag(tot) });
      if (sleutel !== this._geladen) return;
      this._events = r.events; this._titels = r.week_titels || {}; this._fout = null;
    } catch (e) { this._fout = e.message; }
    this._teken();
  }
  _zichtbaar() {
    return (this._events || []).filter((e) => {
      if (e.soort === 'afval') return !this._verborgen.has('afval');
      if (e.soort === 'verjaardag' && !(e.wie || []).length) return !this._verborgen.has('verjaardag');
      return !(e.wie || []).length || e.wie.some((w) => !this._verborgen.has(w));
    });
  }
  _lmap() { return Object.fromEntries(leden(this._hass).map((l) => [l.id, l])); }
  _avatars(e, grootte = 22) {
    const lmap = this._lmap();
    return (e.wie || []).filter((w) => lmap[w]).map((w) => avatar(lmap[w], { grootte })).join('');
  }

  _teken() {
    const h = this._hass, r = this.shadowRoot;
    if (!r) return;
    const w = this.weergave, lijst = leden(h);
    const [start] = this._bereik();
    let titel;
    if (w === 'maand') {
      const m = plusDagen(start, 10);
      titel = new Date(m.getFullYear(), m.getMonth(), 1).toLocaleDateString(lang(h), { month: 'long', year: 'numeric' });
    } else {
      const [j, w1] = isoWeek(start), [, w2] = isoWeek(plusDagen(start, 7 * (this._config.weken - 1)));
      titel = `${this.t('week')} ${w1}–${w2} · ${j}`;
    }
    // een weektitel waarin iemand typt niet overschrijven
    const bezig = r.activeElement && r.activeElement.dataset && r.activeElement.dataset.week;
    r.innerHTML = `<style>${CSS}${AGENDA_CSS}</style><ha-card>
      <div class="balk"><div class="nav"><button class="x" data-stap="-1" title="‹"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b>${esc(titel)}</b>
          <button class="x" data-stap="1" title="›"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
          <button class="fam-knop rand" data-stap="0" style="min-height:36px;padding:0 14px">${esc(this.t('vandaag'))}</button></div>
        <div class="nav"><div class="seg"><button data-w="maand" class="${w === 'maand' ? 'aan' : ''}"><ha-icon icon="mdi:calendar-month"></ha-icon>${esc(this.t('maand'))}</button>
          <button data-w="weken" class="${w === 'weken' ? 'aan' : ''}"><ha-icon icon="mdi:view-agenda-outline"></ha-icon>${esc(this.t('weken'))}</button></div>
          ${this._magSchrijven ? `<button class="fam-knop" data-nieuw="${isoDag(new Date())}"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('afspraak'))}</button>` : ''}</div></div>
      <div class="legenda">${lijst.map((l) => `<button class="leg ${this._verborgen.has(l.id) ? 'uit' : ''}" style="--k:${esc(l.kleur)}" data-filter="${l.id}">${avatar(l, { grootte: 24 })}${esc(l.naam)}</button>`).join('')}
        <button class="leg ico ${this._verborgen.has('verjaardag') ? 'uit' : ''}" style="--k:#e91e63" data-filter="verjaardag">🎂 ${esc(this.t('verjaardagen'))}</button>
        <button class="leg ico ${this._verborgen.has('afval') ? 'uit' : ''}" style="--k:#43a047" data-filter="afval">🗑️ ${esc(this.t('afval'))}</button></div>
      ${this._fout ? `<div class="fout">${esc(this._fout)}</div>` : ''}
      <div class="lijf">${w === 'maand' ? this._maand(start) : this._weken(start)}</div></ha-card>${this._dlg ? this._dialoog() : ''}`;
    if (bezig) { const i = r.querySelector(`[data-week="${bezig}"]`); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }

  _maand(start) {
    const h = this._hass, ev = this._zichtbaar(), lmap = this._lmap(), vandaag = isoDag(new Date());
    const m = plusDagen(start, 10).getMonth();
    const dagen = [...Array(42)].map((_, i) => plusDagen(start, i));
    const zichtbaar = dagen[35].getMonth() !== m ? dagen.slice(0, 35) : dagen;
    const kies = this._kies || vandaag;
    const wd = [...Array(7)].map((_, i) => plusDagen(start, i).toLocaleDateString(lang(h), { weekday: 'short' }));
    const cel = (d) => {
      const s = isoDag(d), op = opDag(ev, s);
      const kleuren = [...new Set(op.filter((e) => e.soort !== 'afval' && e.soort !== 'verjaardag').flatMap((e) => kleurenVan(e, lmap)))].slice(0, 4);
      const ico = [...new Set(op.filter((e) => e.soort === 'afval' || e.soort === 'verjaardag').map((e) => e.icoon || '🎂'))].slice(0, 2).join('');
      return `<button class="cel ${d.getMonth() !== m ? 'ander' : ''} ${s === vandaag ? 'nu' : ''} ${s === kies ? 'kies' : ''}" data-dag="${s}">${d.getDate()}
        <span class="stippen">${kleuren.map((k) => `<i style="background:${esc(k)}"></i>`).join('')}${ico}</span></button>`;
    };
    const dkop = new Date(kies + 'T00:00:00').toLocaleDateString(lang(h), { weekday: 'long', day: 'numeric', month: 'long' });
    return `<div class="raster">${wd.map((x) => `<div class="wd">${esc(x)}</div>`).join('')}${zichtbaar.map(cel).join('')}</div>
      <div class="dagkop ${kies === vandaag ? 'nu' : ''}">${esc(dkop)}</div>${this._lijst(opDag(ev, kies), kies)}`;
  }

  _lijst(op, dag) {
    const lmap = this._lmap();
    if (!op.length) return `<div class="leeg">${esc(this.t('niks'))}${this._magSchrijven ? ` <button class="fam-knop zacht" data-nieuw="${dag}" style="min-height:34px;margin-left:8px"><ha-icon icon="mdi:plus"></ha-icon>${esc(this.t('afspraak'))}</button>` : ''}</div>`;
    return op.map((e) => `<button class="item" data-ev="${esc(e.id)}"><span class="streep" style="background:${esc(kleurenVan(e, lmap)[0])}"></span>
      <span class="tijd">${esc(tijd(this._hass, e))}</span><span class="wat">${esc(e.titel)}${e.plek ? `<br/><span class="sub">📍 ${esc(e.plek)}</span>` : ''}</span>
      <span class="avs">${this._avatars(e, 26)}</span></button>`).join('');
  }

  _weken(start) {
    const h = this._hass, ev = this._zichtbaar(), lmap = this._lmap(), vandaag = isoDag(new Date());
    return [...Array(this._config.weken)].map((_, i) => {
      const ma = plusDagen(start, 7 * i), [jaar, nr] = isoWeek(ma), sleutel = `${jaar}-W${pad(nr)}`;
      const rijen = [...Array(7)].map((__, j) => {
        const d = plusDagen(ma, j), s = isoDag(d), op = opDag(ev, s);
        const dl = d.toLocaleDateString(lang(h), { weekday: 'short' }).replace('.', '');
        return `<div class="drij ${s === vandaag ? 'nu' : ''}"><span class="dl">${esc(dl.charAt(0).toUpperCase() + dl.slice(1))} ${d.getDate()} ${esc(d.toLocaleDateString(lang(h), { month: 'short' }).replace('.', ''))}</span>
          <span class="pillen">${op.map((e) => { const av = this._avatars(e, 20);
            return `<button class="pil ${av ? '' : 'zonder'}" style="--k:${esc(kleurenVan(e, lmap)[0])}" data-ev="${esc(e.id)}" title="${esc(e.titel)}">${av}<span>${e.hele_dag ? '' : esc(tijd(h, e)) + ' '}${esc(e.titel)}</span></button>`; }).join('')}</span>
          ${this._magSchrijven ? `<button class="x plus" data-nieuw="${s}" title="+"><ha-icon icon="mdi:plus"></ha-icon></button>` : '<span></span>'}</div>`;
      }).join('');
      return `<div class="week"><div class="wkop"><b>${esc(this.t('week'))} ${nr}</b>
        <input data-week="${sleutel}" value="${esc((this._titels || {})[sleutel] || '')}" placeholder="${esc(this.t('weekTitel'))}" maxlength="60" ${this._magSchrijven ? '' : 'readonly'}/></div>${rijen}</div>`;
    }).join('');
  }

  /* ── dialogen ── */
  _dialoog() {
    const d = this._dlg, h = this._hass;
    if (d.soort === 'info') {
      const e = d.e, lmap = this._lmap();
      const wie = (e.wie || []).filter((w) => lmap[w]).map((w) => `${avatar(lmap[w], { grootte: 26 })} ${esc(lmap[w].naam)}`).join(' &nbsp; ');
      const bron = e.bron && h.states[e.bron] ? h.states[e.bron].attributes.friendly_name : '';
      const wanneer = new Date(e.start.slice(0, 10) + 'T00:00:00').toLocaleDateString(lang(h), { weekday: 'long', day: 'numeric', month: 'long' });
      return `<div class="achter" data-sluit="1"><div class="dlg"><h2>${esc(e.titel)}</h2><div class="info">
        <div>📅 ${esc(wanneer)} · ${esc(tijd(h, e))}${e.eind && !e.hele_dag ? ` – ${esc(new Date(e.eind).toLocaleTimeString(lang(h), { hour: '2-digit', minute: '2-digit' }))}` : ''}</div>
        ${wie ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${wie}</div>` : ''}
        ${e.plek ? `<div>📍 ${esc(e.plek)}</div>` : ''}${e.notitie ? `<div class="fam-sub" style="white-space:pre-wrap">${esc(e.notitie)}</div>` : ''}
        ${bron ? `<div class="fam-sub">${esc(this.t('uitAgenda'))}: ${esc(bron)}</div>` : ''}</div>
        <div class="knoppen"><button class="fam-knop" data-sluit="1">${esc(this.t('sluiten'))}</button></div></div></div>`;
    }
    const lijst = leden(h);
    return `<div class="achter" data-sluit="1"><div class="dlg"><h2>${esc(d.id ? this.t('bewerken') : this.t('afspraak'))}</h2>
      ${d.herhaal && d.id ? `<div class="fam-chip let_op">${esc(this.t('reeks'))}</div>` : ''}
      <label class="lbl">${esc(this.t('wat'))}</label><input class="veld" id="titel" value="${esc(d.titel)}" placeholder="${esc(this.t('watVb'))}" maxlength="120"/>
      <label class="lbl">${esc(this.t('datum'))}</label><input class="veld" type="date" id="datum" value="${esc(d.datum)}"/>
      <label class="vink"><input type="checkbox" id="hele_dag" ${d.hele_dag ? 'checked' : ''}/> ${esc(this.t('heleDag'))}</label>
      ${d.hele_dag ? `<label class="lbl">${esc(this.t('tot'))}</label><input class="veld" type="date" id="eind_datum" value="${esc(d.eind_datum || '')}" min="${esc(d.datum)}"/>`
        : `<div class="twee"><div><label class="lbl">${esc(this.t('van'))}</label><input class="veld" type="time" id="van" value="${esc(d.van)}"/></div>
          <div><label class="lbl">${esc(this.t('totTijd'))}</label><input class="veld" type="time" id="tot" value="${esc(d.tot)}"/></div></div>`}
      <label class="lbl">${esc(this.t('voorWie'))}</label><div class="wie">${lijst.map((l) => `<button class="${d.wie.includes(l.id) ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-wie="${l.id}">${avatar(l, { grootte: 40 })}<small>${esc(l.naam)}</small></button>`).join('')}</div>
      <label class="lbl">${esc(this.t('herhalen'))}</label><select class="veld" id="herhaal">${Object.entries(this.t('herhaal')).map(([k, n]) => `<option value="${k}" ${d.herhaal === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <label class="lbl">${esc(this.t('plek'))}</label><input class="veld" id="plek" value="${esc(d.plek)}" maxlength="120"/>
      <label class="lbl">${esc(this.t('notitie'))}</label><textarea class="veld" id="notitie" rows="2" maxlength="1000">${esc(d.notitie)}</textarea>
      ${d.fout ? `<div class="fout">${esc(d.fout)}</div>` : ''}
      <div class="knoppen">${d.id ? `<button class="fam-knop gevaar links" data-weg="1">${esc(this.t('verwijderen'))}</button>` : ''}
        <button class="fam-knop rand" data-sluit="1">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-opslaan="1">${esc(this.t('opslaan'))}</button></div></div></div>`;
  }
  _formUitlezen() {
    const r = this.shadowRoot, d = this._dlg, w = (id) => r.getElementById(id);
    if (!d || d.soort !== 'afspraak') return;
    for (const k of ['titel', 'plek', 'notitie', 'herhaal']) if (w(k)) d[k] = w(k).value;
    if (w('datum')) d.datum = w('datum').value;
    if (w('eind_datum')) d.eind_datum = w('eind_datum').value;
    if (w('van')) d.van = w('van').value;
    if (w('tot')) d.tot = w('tot').value;
  }
  _nieuw(dag) {
    const ik = ikLid(this._hass);
    this._dlg = { soort: 'afspraak', titel: '', datum: dag, hele_dag: false, van: '09:00', tot: '10:00', eind_datum: '', wie: ik ? [ik.id] : [], herhaal: '', plek: '', notitie: '' };
    this._teken();
    setTimeout(() => { const i = this.shadowRoot.getElementById('titel'); if (i) i.focus(); }, 0);
  }
  _open(e) {
    if (!e.bewerkbaar) { this._dlg = { soort: 'info', e }; this._teken(); return; }
    // herhalende afspraak: we bewerken de hele reeks, dus vanaf de eerste datum
    const s = e.herhaal ? e.reeks_start : e.start, eind = e.herhaal ? (e.reeks_eind || '') : (e.eind || '');
    this._dlg = { soort: 'afspraak', id: e.afspraak, titel: e.titel, datum: s.slice(0, 10), hele_dag: e.hele_dag, van: e.hele_dag ? '09:00' : s.slice(11, 16),
      tot: e.hele_dag ? '10:00' : (eind.slice(11, 16) || ''), eind_datum: e.hele_dag && eind ? eind.slice(0, 10) : '', wie: [...(e.wie || [])], herhaal: e.herhaal || '',
      plek: e.plek || '', notitie: e.notitie || '', reeksStart: s.slice(0, 10) };
    this._teken();
  }
  async _opslaan() {
    this._formUitlezen();
    const d = this._dlg;
    let start, eind = null;
    if (d.hele_dag) { start = d.datum; eind = d.eind_datum && d.eind_datum > d.datum ? d.eind_datum : null; }
    else { start = `${d.datum}T${d.van || '09:00'}`; eind = d.tot ? `${d.datum}T${d.tot}` : null; }
    try {
      await this._hass.callWS({ type: 'ha_family/agenda/afspraak', ...(d.id ? { afspraak: d.id } : {}), titel: d.titel, start, eind, wie: d.wie, herhaal: d.herhaal, plek: d.plek, notitie: d.notitie });
      this._dlg = null; await this._laad(true);
    } catch (e) { d.fout = e.message; this._teken(); }
  }

  async _klik(e) {
    const b = (s) => e.target.closest(s);
    const sluit = b('[data-sluit]');
    if (sluit && (sluit.tagName === 'BUTTON' || e.target === sluit)) { this._dlg = null; return this._teken(); }   // knop, of klik op de achtergrond
    if (b('[data-stap]')) { const s = b('[data-stap]').dataset.stap; this._stap = s === '0' ? 0 : (this._stap || 0) + Number(s); if (s === '0') this._kies = isoDag(new Date()); return this._laad(); }
    if (b('[data-w]')) { const w = b('[data-w]').dataset.w; if (w !== this.weergave) { this.weergave = w; this._stap = 0; this._laad(); } return; }
    if (b('[data-filter]')) { const f = b('[data-filter]').dataset.filter; this._verborgen.has(f) ? this._verborgen.delete(f) : this._verborgen.add(f); return this._teken(); }
    if (b('[data-dag]')) { this._kies = b('[data-dag]').dataset.dag; return this._teken(); }
    if (b('[data-nieuw]')) return this._nieuw(b('[data-nieuw]').dataset.nieuw);
    if (b('[data-ev]')) { const ev = (this._events || []).find((x) => x.id === b('[data-ev]').dataset.ev); if (ev) this._open(ev); return; }
    if (b('[data-wie]') && this._dlg) {
      this._formUitlezen();
      const id = b('[data-wie]').dataset.wie, w = this._dlg.wie;
      this._dlg.wie = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
      return this._teken();
    }
    if (b('[data-opslaan]')) return this._opslaan();
    if (b('[data-weg]') && this._dlg) {
      if (!confirm(this.t(this._dlg.herhaal ? 'zekerReeks' : 'zeker'))) return;
      try { await this._hass.callWS({ type: 'ha_family/agenda/afspraak_weg', afspraak: this._dlg.id }); this._dlg = null; await this._laad(true); }
      catch (er) { this._dlg.fout = er.message; this._teken(); }
    }
  }
  _wijzig(e) {
    if (e.target.id === 'hele_dag' && this._dlg) { this._formUitlezen(); this._dlg.hele_dag = e.target.checked; return this._teken(); }
    const i = e.target.closest('[data-week]');
    if (i) {
      this._titels = { ...(this._titels || {}), [i.dataset.week]: i.value };
      this._hass.callWS({ type: 'ha_family/agenda/week_titel', week: i.dataset.week, titel: i.value })
        .catch((er) => this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: er.message }, bubbles: true, composed: true })));
    }
  }
}

/* ── Vandaag ── */
class FamilyVandaagCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  connectedCallback() { this._klok = setInterval(() => this._laad(), 300000); }
  disconnectedCallback() { clearInterval(this._klok); }
  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const dag = isoDag(new Date());
    if (eerste) this.shadowRoot.addEventListener('click', (e) => { if (e.target.closest('[data-a=opnieuw]')) this._opnieuw(); });
    if (eerste || dag !== this._dag) { this._dag = dag; this._laad(); }
  }
  t(k) { return tt(this._hass, k); }
  async _laad() {
    const nu = new Date(); nu.setHours(0, 0, 0, 0);
    try { this._events = (await this._hass.callWS({ type: 'ha_family/agenda', van: isoDag(nu), tot: isoDag(plusDagen(nu, 15)) })).events; this._fout = null; }
    catch (e) { this._fout = e.message; this._events = []; }
    this._teken();
    // ✨ dagoverzicht: één keer per dag gemaakt (met AI als die er is), daarna uit de opslag
    if (this._config.overzicht !== false) {
      try { this._overzicht = await this._hass.callWS({ type: 'ha_family/dagoverzicht' }); this._teken(); } catch (e) { /* zonder overzicht */ }
    }
  }
  async _opnieuw() {
    this._overzicht = { ...(this._overzicht || {}), bezig: true }; this._teken();
    try { this._overzicht = await this._hass.callWS({ type: 'ha_family/dagoverzicht', opnieuw: true }); } catch (e) { this._overzicht = null; }
    this._teken();
  }
  _teken() {
    const h = this._hass, ev = this._events || [], vandaag = isoDag(new Date()), morgen = isoDag(plusDagen(new Date(), 1));
    const lmap = Object.fromEntries(leden(h).map((l) => [l.id, l]));
    const nu = opDag(ev, vandaag).filter((e) => e.soort !== 'afval' && e.soort !== 'verjaardag');
    const afvalV = opDag(ev, vandaag).filter((e) => e.soort === 'afval'), afvalM = opDag(ev, morgen).filter((e) => e.soort === 'afval');
    const jarig = ev.filter((e) => e.soort === 'verjaardag');
    const dagen = (s) => Math.round((new Date(s + 'T00:00:00') - new Date(vandaag + 'T00:00:00')) / 864e5);
    const av = (e) => (e.wie || []).filter((w) => lmap[w]).map((w) => avatar(lmap[w], { grootte: 26 })).join('');
    this.shadowRoot.innerHTML = `<style>${CSS}${AGENDA_CSS}
      .kop { font-size: 1.25rem; font-weight: 600; margin-bottom: 4px; }
      .blok { margin-top: 14px; padding: 12px 14px; border-radius: 16px; background: var(--secondary-background-color); display: grid; gap: 4px; }
      .blok b { font-size: .95rem; }
      .overzicht { margin: 6px 0 10px; padding: 12px 14px; border-radius: 16px; line-height: 1.45; position: relative; padding-right: 36px;
        background: color-mix(in srgb, var(--primary-color) 10%, transparent); }
      .opnieuw { position: absolute; top: 6px; right: 6px; border: 0; background: none; cursor: pointer; font-size: 1rem; color: var(--secondary-text-color); width: 28px; height: 28px; border-radius: 50%; }</style><ha-card>
      <div class="kop">📅 ${esc(this.t('vandaag'))}</div>
      ${this._overzicht && this._overzicht.tekst ? `<div class="overzicht">${this._overzicht.bron === 'ai' ? '✨ ' : '☀️ '}${esc(this._overzicht.bezig ? '…' : this._overzicht.tekst)}
        ${h.user && h.user.is_admin && this._overzicht.ai ? `<button class="opnieuw" data-a="opnieuw" title="${esc(this.t('opnieuw'))}">↻</button>` : ''}</div>` : ''}
      ${this._fout ? `<div class="fout">${esc(this._fout)}</div>` : ''}
      ${nu.length ? nu.map((e) => `<div class="item"><span class="streep" style="background:${esc(kleurenVan(e, lmap)[0])}"></span><span class="tijd">${esc(tijd(h, e))}</span>
          <span class="wat">${esc(e.titel)}${e.plek ? `<br/><span class="sub">📍 ${esc(e.plek)}</span>` : ''}</span><span class="avs">${av(e)}</span></div>`).join('')
        : `<div class="leeg">${esc(this.t('niks'))}</div>`}
      ${afvalV.length || afvalM.length ? `<div class="blok"><b>🗑️ ${esc(afvalV.length ? this.t('afvalVandaag') : this.t('afvalMorgen'))}</b><span>${(afvalV.length ? afvalV : afvalM).map((e) => esc(e.titel)).join(' · ')}</span></div>` : ''}
      ${jarig.length ? `<div class="blok"><b>🎂 ${esc(this.t(jarig.some((e) => e.jaardag && e.jaardag !== 'verjaardag') ? 'binnenkort' : 'jarigBinnenkort'))}</b>${jarig.slice(0, 4).map((e) => { const n = dagen(e.start.slice(0, 10));
          return `<span>${e.jaardag && e.jaardag !== 'verjaardag' ? `${esc(e.icoon)} ${esc(e.tekst)}` : `${esc(e.naam)}${e.leeftijd ? ` ${esc(this.t('wordt'))} ${e.leeftijd}` : ''}`} · <span class="fam-sub">${n === 0 ? esc(this.t('vandaag')) + ' 🎉' : n === 1 ? esc(this.t('morgen')) : `${esc(this.t('over'))} ${n} ${esc(this.t('dagen'))}`}</span></span>`; }).join('')}</div>` : ''}
    </ha-card>`;
  }
}

export const AGENDA_KAARTEN = [
  ['family-agenda-card', FamilyAgendaCard, 'HA Family: agenda', 'Gezinsagenda: maand met puntjes of weekplanner, in de kleur van ieder gezinslid.'],
  ['family-vandaag-card', FamilyVandaagCard, 'HA Family: vandaag', 'Afspraken van vandaag, afval van morgen en wie er binnenkort jarig is.'],
];
