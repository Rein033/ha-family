/* HA Family — maaltijdplanner (HA-Family-Cards).
 *
 *   type: custom:family-eten-card        het weekmenu: per dag een gerecht en wie er kookt (compact: true = 'Vanavond eten we')
 *   type: custom:family-recepten-card    recepten: zoeken, bekijken, inplannen, op de boodschappenlijst, importeren van een website */
import { CSS, avatar, esc, leden } from './family-ui.js?v=0.7.0';

const TEKST = {
  nl: {
    eten: 'Eten', week: 'Week', vandaag: 'Vandaag', morgen: 'Morgen', vanavond: 'Vanavond', watEten: 'Wat eten we?', weekLijst: 'Week op de lijst',
    kies: 'Kies een gerecht', zoek: 'Zoeken…', verrassing: 'Verrassing', anders: 'Of typ zelf iets', andersVb: 'bijv. Restjes, Uit eten, Friet',
    kok: 'Wie kookt er?', opslaan: 'Opslaan', annuleren: 'Annuleren', leeg: 'Leegmaken', opLijst: 'Ingrediënten op de lijst',
    opLijstKlaar: '🛒 {x} op de lijst gezet', alOpLijst: 'Alles stond al op de lijst', recepten: 'Recepten', nieuw: 'Recept', website: 'Van een website',
    geenRecepten: 'Nog geen recepten.', startpakket: 'Begin met 10 bekende gezinsgerechten', personen: 'personen', ingredienten: 'Ingrediënten',
    bereiding: 'Bereiding', link: 'Recept op de website', inplannen: 'Inplannen', bewerken: 'Bewerken', verwijderen: 'Verwijderen',
    zeker: 'Recept "{x}" verwijderen?', naam: 'Naam van het gerecht', ingrUitleg: 'Ingrediënten, één per regel (bijv. 500 g gehakt)',
    bereidingUitleg: 'Bereiding (mag leeg)', linkUitleg: 'Link (mag leeg)', labels: 'Labels', importeren: 'Importeren', plakLink: 'Plak de link van het recept',
    importUitleg: 'Werkt met de meeste receptensites, zoals Allerhande, 24Kitchen, Leukerecepten en Jumbo.', bezig: 'Bezig…', ingepland: 'Ingepland',
    favoriet: 'Favoriet', allesBekijken: 'Weekmenu', herinnering: 'Herinnering sturen om', pakketKlaar: '🍝 {x} recepten toegevoegd', herinneringUitleg: 'De kok krijgt een berichtje; staat er niets, dan krijgen de ouders een idee.', nogNiks: 'Nog niks gepland',
    lbl: { snel: '⚡ Snel', vega: '🥕 Vega', vis: '🐟 Vis', kinderen: '🧒 Kinderen', feest: '🎉 Feest', budget: '💶 Budget', oven: '🔥 Oven', soep: '🍲 Soep' },
  },
  en: {
    eten: 'Meals', week: 'Week', vandaag: 'Today', morgen: 'Tomorrow', vanavond: 'Tonight', watEten: "What's for dinner?", weekLijst: 'Week to groceries',
    kies: 'Choose a dish', zoek: 'Search…', verrassing: 'Surprise', anders: 'Or type something', andersVb: 'e.g. Leftovers, Eating out',
    kok: "Who's cooking?", opslaan: 'Save', annuleren: 'Cancel', leeg: 'Clear', opLijst: 'Ingredients to groceries',
    opLijstKlaar: '🛒 {x} added', alOpLijst: 'Everything was already on the list', recepten: 'Recipes', nieuw: 'Recipe', website: 'From a website',
    geenRecepten: 'No recipes yet.', startpakket: 'Start with 10 family favourites', personen: 'people', ingredienten: 'Ingredients',
    bereiding: 'Method', link: 'Recipe on the website', inplannen: 'Plan', bewerken: 'Edit', verwijderen: 'Delete',
    zeker: 'Delete recipe "{x}"?', naam: 'Name of the dish', ingrUitleg: 'Ingredients, one per line (e.g. 500 g minced meat)',
    bereidingUitleg: 'Method (optional)', linkUitleg: 'Link (optional)', labels: 'Labels', importeren: 'Import', plakLink: 'Paste the link of the recipe',
    importUitleg: 'Works with most recipe websites.', bezig: 'Working…', ingepland: 'Planned',
    favoriet: 'Favourite', allesBekijken: 'Meal plan', herinnering: 'Send a reminder at', pakketKlaar: '🍝 {x} recipes added', herinneringUitleg: 'The cook gets a message; if nothing is planned, the parents get an idea.', nogNiks: 'Nothing planned yet',
    lbl: { snel: '⚡ Quick', vega: '🥕 Veggie', vis: '🐟 Fish', kinderen: '🧒 Kids', feest: '🎉 Party', budget: '💶 Budget', oven: '🔥 Oven', soep: '🍲 Soup' },
  },
};
const taalVan = (hass) => (((hass && hass.locale && hass.locale.language) || 'en').startsWith('nl') ? 'nl' : 'en');
const pad = (n) => String(n).padStart(2, '0');
const isoDag = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const maandag = (d) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
const EMOJI = ['🍝', '🍛', '🍕', '🌮', '🥞', '🍲', '🥗', '🍗', '🍖', '🐟', '🍔', '🍟', '🥬', '🧀', '🌯', '🍜', '🍣', '🥘', '🍳', '🍽️'];

const STIJL = `
  ha-card { padding: 16px; }
  .kop { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .kop .titel { font-size: 1.25rem; font-weight: 600; flex: 1; }
  .x { border: 0; background: none; color: var(--primary-text-color); cursor: pointer; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; }
  .x:hover { background: var(--secondary-background-color); }
  .dag { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 14px; cursor: pointer; border: 0; background: none; width: 100%;
    font: inherit; color: inherit; text-align: left; }
  .dag:hover { background: var(--secondary-background-color); }
  .dag + .dag { border-top: 1px solid var(--divider-color); border-radius: 0; }
  .dag .dl { width: 5.2em; color: var(--secondary-text-color); font-size: .9rem; }
  .dag.nu .dl { color: var(--primary-color); font-weight: 600; }
  .dag .em { font-size: 1.6rem; width: 1.6em; text-align: center; }
  .dag .wat { flex: 1; min-width: 0; font-size: 1.05rem; }
  .dag .wat.leeg { color: var(--secondary-text-color); font-size: .95rem; }
  .vanavond { display: flex; align-items: center; gap: 14px; }
  .vanavond .em { font-size: 3rem; }
  .vanavond b { font-size: 1.35rem; display: block; }
  .sub { color: var(--secondary-text-color); font-size: .9rem; }
  .naar { border: 0; background: none; color: var(--primary-color); font: inherit; cursor: pointer; padding: 4px 0; margin-top: 8px; }
  .zoek { width: 100%; box-sizing: border-box; font: inherit; font-size: 1rem; padding: 10px 13px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { border: 0; font: inherit; font-size: .85rem; padding: 5px 11px; border-radius: 999px; background: var(--secondary-background-color); color: var(--primary-text-color); cursor: pointer; }
  .chip.aan { background: color-mix(in srgb, var(--primary-color) 18%, transparent); color: var(--primary-color); font-weight: 600; }
  .raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .rk { border: 0; cursor: pointer; font: inherit; color: inherit; border-radius: 18px; overflow: hidden; background: var(--secondary-background-color); text-align: left;
    display: grid; grid-template-rows: 96px auto; position: relative; }
  .rk .beeld { display: grid; place-items: center; font-size: 3rem; background: color-mix(in srgb, var(--primary-color) 8%, transparent); background-size: cover; background-position: center; }
  .rk .nm { padding: 8px 10px 10px; font-weight: 600; line-height: 1.2; }
  .rk .ster { position: absolute; top: 6px; right: 8px; }
  .lijst .rij { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 12px; cursor: pointer; border: 0; background: none; width: 100%; font: inherit; color: inherit; text-align: left; }
  .lijst .rij:hover, .lijst .rij.aan { background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
  .lijst { max-height: 300px; overflow: auto; margin-top: 6px; }
  .achter { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: 16px; }
  .dlg { background: var(--card-background-color); color: var(--primary-text-color); border-radius: 24px; padding: 22px; width: min(560px, 100%);
    max-height: calc(100vh - 32px); overflow: auto; box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
  .dlg h2 { margin: 0 0 6px; font-size: 1.35rem; }
  .lbl { display: block; font-weight: 600; margin: 14px 0 6px; }
  .veld { width: 100%; box-sizing: border-box; font: inherit; font-size: 1rem; padding: 11px 13px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  textarea.veld { resize: vertical; }
  .rijk { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .knoppen { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 18px; }
  .knoppen .links { margin-right: auto; }
  .wie { display: flex; flex-wrap: wrap; gap: 8px; }
  .wie button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 4px; padding: 6px; border-radius: 14px; opacity: .45; }
  .wie button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 14%, transparent); }
  .wie small { font-size: .8rem; }
  .emojis { display: flex; flex-wrap: wrap; gap: 2px; }
  .emojis button { border: 0; background: none; font-size: 1.5rem; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; }
  .emojis button.aan { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .foto { width: 100%; max-height: 220px; object-fit: cover; border-radius: 16px; margin-bottom: 10px; }
  .ingr { margin: 4px 0 0; padding-left: 20px; }
  .ingr li { padding: 2px 0; }
  .bereiding { white-space: pre-wrap; line-height: 1.5; }
  .fout { color: var(--error-color); margin-top: 10px; }
  .leegte { color: var(--secondary-text-color); padding: 10px 0; text-align: center; display: grid; gap: 10px; justify-items: center; }
`;

class EtenBasis extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return x === undefined ? v : String(v).replaceAll('{x}', x); }
  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this.shadowRoot.addEventListener('input', (e) => this._invoer && this._invoer(e));
      window.addEventListener('ha-family-eten', (e) => { if (e.detail !== this && this.isConnected) this._laad(); });   // de andere eten-kaart veranderde iets
    }
    const s = Object.values(hass.states).find((x) => x.attributes.ha_family === 'eten');
    const sleutel = (s ? s.last_updated : '') + JSON.stringify(leden(hass).map((l) => l.id));
    if (sleutel !== this._sleutel) { this._sleutel = sleutel; this._laad(); }
  }
  async _laad() {
    const van = this._van || isoDag(new Date());
    try { this._d = await this._hass.callWS({ type: 'ha_family/eten', van, dagen: 7 }); this._fout = null; } catch (e) { this._fout = e.message; }
    if (!this._dlg) this._teken();
  }
  async _ws(type, data, melding) {
    try { const r = await this._hass.callWS({ type, ...data }); this._gewijzigd(); if (melding) this._melding(typeof melding === 'function' ? melding(r) : melding); await this._laad(); return r ?? true; }
    catch (e) { this._melding(e.message); return null; }
  }
  _gewijzigd() { window.dispatchEvent(new CustomEvent('ha-family-eten', { detail: this })); }
  _melding(message) { if (message) this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  _lmap() { return Object.fromEntries(leden(this._hass).map((l) => [l.id, l])); }
  _naar(pad) { history.pushState(null, '', pad); window.dispatchEvent(new CustomEvent('location-changed')); }
  _schil(binnen) {
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card>${this._fout ? `<div class="leegte">${esc(this._fout)}</div>` : binnen}</ha-card>${this._dlg ? this._dialoog() : ''}`;
  }
  _boodschappenMelding(r) { return r.nieuw.length ? this.t('opLijstKlaar', r.nieuw.join(', ')) : this.t('alOpLijst'); }

  /* ── gedeelde dialogen: gerecht kiezen voor een dag, recept bekijken/bewerken/importeren ── */
  _dialoog() {
    const d = this._dlg, h = this._hass, rec = (this._d && this._d.recepten) || [];
    const dagNaam = (s) => new Date(s + 'T00:00:00').toLocaleDateString(h.locale?.language, { weekday: 'long', day: 'numeric', month: 'long' });
    if (d.soort === 'plan') {
      const lijst = rec.filter((r) => (!d.zoek || r.naam.toLowerCase().includes(d.zoek.toLowerCase())) && (!d.label || (r.labels || []).includes(d.label)))
        .sort((a, b) => (b.favoriet - a.favoriet) || a.naam.localeCompare(b.naam));
      return `<div class="achter" data-sluit="1"><div class="dlg"><h2 style="text-transform:capitalize">${esc(dagNaam(d.datum))}</h2>
        <div class="rijk"><input class="zoek" id="zoek" placeholder="${esc(this.t('zoek'))}" value="${esc(d.zoek || '')}" style="flex:1"/>
          <button class="fam-knop zacht" data-a="verrassing">🎲 ${esc(this.t('verrassing'))}</button></div>
        <div class="chips">${(this._d.labels || []).map((l) => `<button class="chip ${d.label === l ? 'aan' : ''}" data-a="label" data-l="${l}">${esc(this.t('lbl')[l] || l)}</button>`).join('')}</div>
        <div class="lijst">${lijst.map((r) => `<button class="rij ${d.recept === r.id ? 'aan' : ''}" data-a="kies" data-r="${r.id}"><span style="font-size:1.5rem">${esc(r.emoji)}</span>
          <span style="flex:1">${esc(r.naam)}</span>${r.favoriet ? '⭐' : ''}</button>`).join('') || `<div class="sub">${esc(this.t('geenRecepten'))}</div>`}</div>
        <label class="lbl">${esc(this.t('anders'))}</label><input class="veld" id="tekst" placeholder="${esc(this.t('andersVb'))}" value="${esc(d.tekst || '')}" maxlength="80"/>
        <label class="lbl">${esc(this.t('kok'))}</label><div class="wie">${leden(h).map((l) => `<button class="${d.kok === l.id ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="kok" data-l="${l.id}">${avatar(l, { grootte: 38 })}<small>${esc(l.naam)}</small></button>`).join('')}</div>
        <div class="knoppen">${d.heeft ? `<button class="fam-knop gevaar links" data-a="leeg">${esc(this.t('leeg'))}</button>` : ''}
          ${d.recept ? `<button class="fam-knop zacht" data-a="dag-lijst">🛒 ${esc(this.t('opLijst'))}</button>` : ''}
          <button class="fam-knop rand" data-sluit="1">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="plan-opslaan">${esc(this.t('opslaan'))}</button></div></div></div>`;
    }
    if (d.soort === 'recept') {
      const r = rec.find((x) => x.id === d.recept);
      if (!r) return '';
      return `<div class="achter" data-sluit="1"><div class="dlg">${r.afbeelding ? `<img class="foto" src="${esc(r.afbeelding)}" alt="" referrerpolicy="no-referrer"/>` : ''}
        <h2>${esc(r.emoji)} ${esc(r.naam)}</h2><div class="sub">${r.personen} ${esc(this.t('personen'))}${(r.labels || []).length ? ' · ' + r.labels.map((l) => esc(this.t('lbl')[l] || l)).join(' ') : ''}</div>
        <div class="lbl">${esc(this.t('ingredienten'))}</div><ul class="ingr">${r.ingredienten.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        ${r.bereiding ? `<div class="lbl">${esc(this.t('bereiding'))}</div><div class="bereiding">${esc(r.bereiding)}</div>` : ''}
        ${r.link ? `<p><a href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">🔗 ${esc(this.t('link'))}</a></p>` : ''}
        <div class="rijk" style="margin-top:14px"><input class="veld" type="date" id="plan-datum" value="${esc(isoDag(new Date()))}" style="width:auto"/>
          <button class="fam-knop zacht" data-a="recept-plan">📅 ${esc(this.t('inplannen'))}</button></div>
        <div class="knoppen"><button class="fam-knop gevaar links" data-a="recept-weg">${esc(this.t('verwijderen'))}</button>
          <button class="fam-knop rand" data-a="favoriet">${r.favoriet ? '⭐' : '☆'} ${esc(this.t('favoriet'))}</button>
          <button class="fam-knop rand" data-a="bewerk">✏️ ${esc(this.t('bewerken'))}</button>
          <button class="fam-knop" data-a="recept-lijst">🛒 ${esc(this.t('opLijst'))}</button></div></div></div>`;
    }
    if (d.soort === 'bewerk') {
      return `<div class="achter" data-sluit="1"><div class="dlg"><h2>${esc(d.recept ? this.t('bewerken') : this.t('nieuw'))}</h2>
        <div class="emojis">${EMOJI.map((e) => `<button class="${d.emoji === e ? 'aan' : ''}" data-a="emoji" data-e="${e}">${e}</button>`).join('')}</div>
        <label class="lbl">${esc(this.t('naam'))}</label><input class="veld" id="r-naam" value="${esc(d.naam)}" maxlength="80"/>
        <div class="rijk"><label class="lbl">${esc(this.t('personen'))}</label><input class="veld" id="r-personen" type="number" min="1" max="50" value="${d.personen}" style="width:90px;margin-top:14px"/></div>
        <label class="lbl">${esc(this.t('ingrUitleg'))}</label><textarea class="veld" id="r-ingr" rows="6">${esc(d.ingredienten)}</textarea>
        <label class="lbl">${esc(this.t('bereidingUitleg'))}</label><textarea class="veld" id="r-bereiding" rows="4">${esc(d.bereiding)}</textarea>
        <label class="lbl">${esc(this.t('linkUitleg'))}</label><input class="veld" id="r-link" value="${esc(d.link || '')}"/>
        <label class="lbl">${esc(this.t('labels'))}</label><div class="chips">${(this._d.labels || []).map((l) => `<button class="chip ${d.labels.includes(l) ? 'aan' : ''}" data-a="r-label" data-l="${l}">${esc(this.t('lbl')[l] || l)}</button>`).join('')}</div>
        ${d.fout ? `<div class="fout">${esc(d.fout)}</div>` : ''}
        <div class="knoppen"><button class="fam-knop rand" data-sluit="1">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="r-opslaan">${esc(this.t('opslaan'))}</button></div></div></div>`;
    }
    if (d.soort === 'import') {
      return `<div class="achter" data-sluit="1"><div class="dlg"><h2>🔗 ${esc(this.t('website'))}</h2><p class="sub">${esc(this.t('importUitleg'))}</p>
        <label class="lbl">${esc(this.t('plakLink'))}</label><input class="veld" id="i-url" placeholder="https://…" value="${esc(d.url || '')}"/>
        ${d.fout ? `<div class="fout">${esc(d.fout)}</div>` : ''}
        <div class="knoppen"><button class="fam-knop rand" data-sluit="1">${esc(this.t('annuleren'))}</button>
          <button class="fam-knop" data-a="i-go" ${d.bezig ? 'disabled' : ''}>${esc(d.bezig ? this.t('bezig') : this.t('importeren'))}</button></div></div></div>`;
    }
    return '';
  }
  _lees() {
    const d = this._dlg, r = this.shadowRoot, w = (id) => r.getElementById(id);
    if (!d) return;
    if (d.soort === 'plan') { if (w('tekst')) d.tekst = w('tekst').value; if (w('zoek')) d.zoek = w('zoek').value; }
    if (d.soort === 'bewerk') {
      d.naam = w('r-naam').value; d.personen = Number(w('r-personen').value) || 4; d.ingredienten = w('r-ingr').value;
      d.bereiding = w('r-bereiding').value; d.link = w('r-link').value;
    }
    if (d.soort === 'import' && w('i-url')) d.url = w('i-url').value;
  }
  _her() { this._lees(); this._teken(); }
  _invoer(e) {
    if (e.target.id === 'zoek' && this._dlg) {   // zoeken zonder het veld kwijt te raken
      this._dlg.zoek = e.target.value; const pos = e.target.selectionStart; this._teken();
      const z = this.shadowRoot.getElementById('zoek'); if (z) { z.focus(); z.setSelectionRange(pos, pos); }
    }
  }
  _bewerk(r) {
    this._dlg = r ? { soort: 'bewerk', recept: r.id, emoji: r.emoji, naam: r.naam, personen: r.personen, ingredienten: r.ingredienten.join('\n'), bereiding: r.bereiding || '',
      link: r.link || '', labels: [...(r.labels || [])], favoriet: r.favoriet } : { soort: 'bewerk', emoji: '🍽️', naam: '', personen: 4, ingredienten: '', bereiding: '', link: '', labels: [] };
    this._teken();
  }
  async _gedeeld(a, b) {
    const d = this._dlg;
    if (a === 'label' && d) { d.label = d.label === b.dataset.l ? null : b.dataset.l; return this._her(); }
    if (a === 'kies' && d) { d.recept = d.recept === b.dataset.r ? null : b.dataset.r; d.tekst = ''; return this._her(); }
    if (a === 'kok' && d) { d.kok = d.kok === b.dataset.l ? null : b.dataset.l; return this._her(); }
    if (a === 'verrassing' && d) {
      const r = await this._hass.callWS({ type: 'ha_family/eten/suggestie', ...(d.label ? { label: d.label } : {}) }).catch(() => ({}));
      if (r.recept) { d.recept = r.recept.id; d.tekst = ''; }
      return this._her();
    }
    if (a === 'plan-opslaan') {
      this._lees();
      const ok = await this._ws('ha_family/eten/plan', { datum: d.datum, recept: d.recept || null, tekst: d.recept ? null : d.tekst || null, kok: d.kok || null });
      if (ok) { this._dlg = null; this._teken(); }
      return;
    }
    if (a === 'leeg') { if (await this._ws('ha_family/eten/plan', { datum: d.datum })) { this._dlg = null; this._teken(); } return; }
    if (a === 'dag-lijst' && d.recept) return this._ws('ha_family/eten/boodschappen', { recept: d.recept }, (r) => this._boodschappenMelding(r));
    if (a === 'recept-lijst') return this._ws('ha_family/eten/boodschappen', { recept: d.recept }, (r) => this._boodschappenMelding(r));
    if (a === 'recept-plan') {
      const datum = this.shadowRoot.getElementById('plan-datum').value;
      if (await this._ws('ha_family/eten/plan', { datum, recept: d.recept }, this.t('ingepland'))) { this._dlg = null; this._teken(); }
      return;
    }
    if (a === 'recept-weg') {
      const r = this._d.recepten.find((x) => x.id === d.recept);
      if (confirm(this.t('zeker', r.naam)) && await this._ws('ha_family/recept/weg', { recept: d.recept })) { this._dlg = null; this._teken(); }
      return;
    }
    if (a === 'favoriet') {
      const r = this._d.recepten.find((x) => x.id === d.recept);
      await this._ws('ha_family/recept', { recept: r.id, naam: r.naam, emoji: r.emoji, ingredienten: r.ingredienten, personen: r.personen, bereiding: r.bereiding || '',
        link: r.link || null, labels: r.labels || [], favoriet: !r.favoriet });
      return this._teken();
    }
    if (a === 'bewerk') return this._bewerk(this._d.recepten.find((x) => x.id === d.recept));
    if (a === 'emoji' && d) { d.emoji = b.dataset.e; return this._her(); }
    if (a === 'r-label' && d) { this._lees(); d.labels = d.labels.includes(b.dataset.l) ? d.labels.filter((x) => x !== b.dataset.l) : [...d.labels, b.dataset.l]; return this._teken(); }
    if (a === 'r-opslaan') {
      this._lees();
      try {
        const r = await this._hass.callWS({ type: 'ha_family/recept', ...(d.recept ? { recept: d.recept } : {}), naam: d.naam, emoji: d.emoji, personen: d.personen,
          ingredienten: d.ingredienten, bereiding: d.bereiding, link: d.link || null, labels: d.labels, ...(d.favoriet !== undefined ? { favoriet: !!d.favoriet } : {}) });
        this._dlg = { soort: 'recept', recept: r.id }; this._gewijzigd(); await this._laad(); this._teken();
      } catch (er) { d.fout = er.message; this._teken(); }
      return;
    }
    if (a === 'i-go') {
      this._lees(); d.bezig = true; d.fout = null; this._teken();
      try { const r = await this._hass.callWS({ type: 'ha_family/recept/import', url: d.url }); this._dlg = { soort: 'recept', recept: r.id }; this._gewijzigd(); await this._laad(); this._teken(); }
      catch (er) { d.bezig = false; d.fout = er.message; this._teken(); }
    }
  }
  async _klik(e) {
    const s = e.target.closest && e.target.closest('[data-sluit]');
    if (s && (s.tagName === 'BUTTON' || e.target === s)) { this._dlg = null; return this._teken(); }
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    if (await this._eigen(b.dataset.a, b) === false) return this._gedeeld(b.dataset.a, b);
  }
}

/* ── 🍝 Weekmenu ── */
class FamilyEtenCard extends EtenBasis {
  _teken() {
    const d = this._d, h = this._hass;
    if (!d) return this._schil('<div class="leegte">…</div>');
    const lmap = this._lmap(), vandaag = isoDag(new Date());
    if (this._config.compact) {
      const [v, m] = d.menu;
      return this._schil(`<div class="kop"><div class="titel">🍽️ ${esc(this.t('vanavond'))}</div></div>
        <button class="dag" data-a="dag" data-d="${v.datum}" style="padding:4px 0"><span class="vanavond"><span class="em">${esc(v.emoji || '🤔')}</span>
          <span><b>${esc(v.naam || this.t('watEten'))}</b>${v.kok && lmap[v.kok] ? `<span class="sub">👩‍🍳 ${esc(lmap[v.kok].naam)}</span>` : ''}</span></span></button>
        ${m ? `<div class="sub" style="margin-top:8px">${esc(this.t('morgen'))}: ${m.naam ? `${esc(m.emoji || '')} ${esc(m.naam)}` : esc(this.t('nogNiks'))}</div>` : ''}
        <button class="naar" data-a="naar">${esc(this.t('allesBekijken'))} →</button>`);
    }
    const start = new Date((this._van || isoDag(maandag(new Date()))) + 'T00:00:00');
    const weeknr = (() => { const t = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate() + 3)); const j = t.getUTCFullYear(); return Math.ceil(((t - Date.UTC(j, 0, 1)) / 864e5 + 1) / 7); })();
    this._schil(`<div class="kop"><div class="titel">🍝 ${esc(this.t('eten'))}</div>
        <button class="x" data-a="stap" data-n="-7">‹</button><span class="sub">${esc(this.t('week'))} ${weeknr}</span><button class="x" data-a="stap" data-n="7">›</button>
        <button class="fam-knop zacht" data-a="week-lijst">🛒 ${esc(this.t('weekLijst'))}</button></div>
      ${d.menu.map((m) => { const dag = new Date(m.datum + 'T00:00:00');
        const dl = m.datum === vandaag ? this.t('vandaag') : dag.toLocaleDateString(h.locale?.language, { weekday: 'short', day: 'numeric' });
        return `<button class="dag ${m.datum === vandaag ? 'nu' : ''}" data-a="dag" data-d="${m.datum}"><span class="dl">${esc(dl)}</span><span class="em">${esc(m.emoji || '')}</span>
          <span class="wat ${m.naam ? '' : 'leeg'}">${esc(m.naam || '+ ' + this.t('watEten'))}</span>${m.kok && lmap[m.kok] ? avatar(lmap[m.kok], { grootte: 30 }) : ''}</button>`; }).join('')}
      ${h.user && h.user.is_admin ? (() => { const hi = (d.instellingen && d.instellingen.herinnering) || { aan: false, tijd: '16:00' };
        return `<div class="rijk sub" style="margin-top:12px" title="${esc(this.t('herinneringUitleg'))}"><label class="rijk"><input type="checkbox" id="h-aan" ${hi.aan ? 'checked' : ''}/> ⏰ ${esc(this.t('herinnering'))}</label>
          <input class="veld" type="time" id="h-tijd" value="${esc(hi.tijd)}" style="width:auto;padding:4px 8px"/></div>`; })() : ''}`);
  }
  _invoer(e) {
    if (e.target.id === 'h-aan' || e.target.id === 'h-tijd') {
      const r = this.shadowRoot;
      this._hass.callWS({ type: 'ha_family/eten/instellingen', aan: r.getElementById('h-aan').checked, tijd: r.getElementById('h-tijd').value || '16:00' })
        .then(() => { this._d.instellingen = { herinnering: { aan: r.getElementById('h-aan').checked, tijd: r.getElementById('h-tijd').value } }; })
        .catch((er) => this._melding(er.message));
      return;
    }
    super._invoer(e);
  }
  async _eigen(a, b) {
    if (a === 'naar') { this._naar('/gezin/eten'); return true; }
    if (a === 'stap') {
      const s = new Date((this._van || isoDag(maandag(new Date()))) + 'T00:00:00'); s.setDate(s.getDate() + Number(b.dataset.n));
      this._van = isoDag(s); await this._laad(); return true;
    }
    if (a === 'week-lijst') { await this._ws('ha_family/eten/boodschappen', { van: this._van || isoDag(maandag(new Date())), dagen: 7 }, (r) => this._boodschappenMelding(r)); return true; }
    if (a === 'dag') {
      const m = this._d.menu.find((x) => x.datum === b.dataset.d);
      const ik = this._d.ik;
      this._dlg = { soort: 'plan', datum: b.dataset.d, recept: m ? m.recept : null, tekst: m && !m.recept ? m.naam || '' : '', kok: m && m.kok ? m.kok : ik, heeft: !!(m && m.naam) };
      this._teken(); return true;
    }
    return false;
  }
  async _laad() {
    if (!this._van && !this._config.compact) this._van = isoDag(maandag(new Date()));
    return super._laad();
  }
}

/* ── 📖 Recepten ── */
class FamilyReceptenCard extends EtenBasis {
  _teken() {
    const d = this._d;
    if (!d) return this._schil('<div class="leegte">…</div>');
    const zoek = (this._zoek || '').toLowerCase();
    const lijst = d.recepten.filter((r) => (!zoek || r.naam.toLowerCase().includes(zoek) || r.ingredienten.some((i) => i.toLowerCase().includes(zoek))) && (!this._label || (r.labels || []).includes(this._label)))
      .sort((a, b) => (b.favoriet - a.favoriet) || a.naam.localeCompare(b.naam));
    this._schil(`<div class="kop"><div class="titel">📖 ${esc(this.t('recepten'))} <span class="sub">${d.recepten.length}</span></div>
        <button class="fam-knop rand" data-a="import">🔗 ${esc(this.t('website'))}</button><button class="fam-knop" data-a="nieuw">+ ${esc(this.t('nieuw'))}</button></div>
      ${d.recepten.length ? `<input class="zoek" id="lzoek" placeholder="${esc(this.t('zoek'))}" value="${esc(this._zoek || '')}"/>
        <div class="chips">${d.labels.map((l) => `<button class="chip ${this._label === l ? 'aan' : ''}" data-a="lfilter" data-l="${l}">${esc(this.t('lbl')[l] || l)}</button>`).join('')}</div>
        <div class="raster">${lijst.map((r) => `<button class="rk" data-a="open" data-r="${r.id}"><span class="beeld" ${r.afbeelding ? `style="background-image:url('${esc(r.afbeelding)}')"` : ''}>${r.afbeelding ? '' : esc(r.emoji)}</span>
          <span class="nm">${esc(r.naam)}</span>${r.favoriet ? '<span class="ster">⭐</span>' : ''}</button>`).join('')}</div>`
        : `<div class="leegte">${esc(this.t('geenRecepten'))}<button class="fam-knop" data-a="startpakket">🍝 ${esc(this.t('startpakket'))}</button></div>`}`);
  }
  _invoer(e) {
    if (e.target.id === 'lzoek') { this._zoek = e.target.value; const p = e.target.selectionStart; this._teken(); const z = this.shadowRoot.getElementById('lzoek'); if (z) { z.focus(); z.setSelectionRange(p, p); } return; }
    super._invoer(e);
  }
  async _eigen(a, b) {
    if (a === 'open') { this._dlg = { soort: 'recept', recept: b.dataset.r }; this._teken(); return true; }
    if (a === 'nieuw') { this._bewerk(null); return true; }
    if (a === 'import') { this._dlg = { soort: 'import', url: '' }; this._teken(); return true; }
    if (a === 'lfilter') { this._label = this._label === b.dataset.l ? null : b.dataset.l; this._teken(); return true; }
    if (a === 'startpakket') { await this._ws('ha_family/recept/startpakket', {}, (r) => this.t('pakketKlaar', r.toegevoegd)); return true; }
    return false;
  }
}

export const ETEN_KAARTEN = [
  ['family-eten-card', FamilyEtenCard, 'HA Family: weekmenu', 'Wat eten we deze week, en wie kookt er?'],
  ['family-recepten-card', FamilyReceptenCard, 'HA Family: recepten', 'Recepten bekijken, inplannen en op de boodschappenlijst zetten.'],
];
