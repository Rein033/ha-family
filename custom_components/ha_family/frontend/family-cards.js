/* HA Family — kaarten (HA-Family-Cards) en het dashboard dat zichzelf opbouwt (HA-Family-Dashboard).
 *
 *   type: custom:family-gezin-card         groet, datum en wie er thuis is (tik op iemand voor details)
 *   strategy: { type: custom:ha-family }   het gezinsdashboard (staat na installatie in de zijbalk)
 *
 * Elke nieuwe functie (agenda, taken, boodschappen, …) komt hier als eigen kaart bij en krijgt een plek in de strategie. */
import { CSS, VERSIE, avatar, esc, gezinState, groet, ikLid, leden, locatie, registreer, t, taal } from './family-ui.js?v=0.5.0';
import { AGENDA_KAARTEN } from './family-agenda.js?v=0.5.0';
import { TAKEN_KAARTEN } from './family-taken.js?v=0.5.0';
import { ETEN_KAARTEN } from './family-eten.js?v=0.5.0';
import { HUIS_KAARTEN } from './family-huis.js?v=0.5.0';

const WEER = { 'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️', lightning: '🌩️', 'lightning-rainy': '⛈️', partlycloudy: '⛅', pouring: '🌧️',
  rainy: '🌦️', snowy: '❄️', 'snowy-rainy': '🌨️', sunny: '☀️', windy: '💨', 'windy-variant': '💨', exceptional: '⚠️' };

class FamilyGezinCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  set hass(hass) {
    this._hass = hass;
    const l = leden(hass);
    const w = Object.values(hass.states).find((s) => s.entity_id.startsWith('weather.'));
    const sleutel = taal(hass) + new Date().getHours() + JSON.stringify(l) + l.map((x) => (hass.states[x.person] || {}).state).join() + (w ? w.last_updated : '');
    if (sleutel === this._sleutel) return;
    this._sleutel = sleutel;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => {
        const b = e.target.closest('[data-person]');
        if (b) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: b.dataset.person }, bubbles: true, composed: true }));
        const n = e.target.closest('[data-naar]');
        if (n) { history.pushState(null, '', n.dataset.naar); window.dispatchEvent(new CustomEvent('location-changed')); }
      });
    }
    this._teken();
  }
  _teken() {
    const h = this._hass, l = leden(h), ik = ikLid(h), g = gezinState(h);
    const weerId = this._config.weer || Object.keys(h.states).find((e) => e.startsWith('weather.'));
    const weer = weerId && h.states[weerId] && !['unknown', 'unavailable'].includes(h.states[weerId].state) ? h.states[weerId] : null;
    const nu = new Date();
    const datum = nu.toLocaleDateString(h.locale?.language || undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    // alleen tellen wie we kunnen volgen (met een telefoon); weten we van niemand iets, dan zeggen we niets
    const bekend = l.filter((x) => locatie(h, x.person).bekend), thuis = bekend.filter((x) => locatie(h, x.person).thuis).length;
    const samen = !bekend.length ? '' : thuis === bekend.length ? t(h, 'iedereenThuis') : thuis === 0 ? t(h, 'niemandThuis') : `${thuis}/${bekend.length} ${t(h, 'zijnThuis')}`;
    this.shadowRoot.innerHTML = `<style>${CSS}
      ha-card { padding: 20px; border-radius: var(--ha-card-border-radius, var(--fam-radius)); }
      .kop { display: flex; align-items: center; gap: 16px; }
      .groei { flex: 1; min-width: 0; }
      .weer { border: 0; background: none; padding: 0; margin-top: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer; font: inherit;
        color: var(--secondary-text-color); text-align: left; }
      .weer .wi { font-size: 1.3rem; line-height: 1; }
      .weer b { color: var(--primary-text-color); font-size: 1.05rem; }
      .groet { font-size: 1.6rem; font-weight: 600; line-height: 1.2; }
      .datum { color: var(--secondary-text-color); margin-top: 2px; }
      .datum::first-letter { text-transform: uppercase; }
      .wie { display: flex; justify-content: space-between; align-items: baseline; margin: 20px 0 10px; gap: 8px; }
      .wie b { font-size: 1rem; }
      .leden { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 12px; }
      .lid { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 6px; padding: 8px 4px; border-radius: 16px; }
      .lid:hover { background: var(--secondary-background-color); }
      .naam { font-weight: 600; }
      .waar { font-size: .85rem; color: var(--secondary-text-color); }
      .waar.thuis { color: var(--success-color, #2e7d32); }
      .leeg { text-align: center; padding: 12px 0; display: grid; gap: 12px; justify-items: center; }
    </style><ha-card>
      <div class="kop">${ik ? avatar(ik, { grootte: 64 }) : ''}<div class="groei"><div class="groet">${esc(groet(h))}${ik ? `, ${esc(ik.naam)}` : ''} 👋</div><div class="datum">${esc(datum)}</div>
        ${weer ? `<button class="weer" data-person="${esc(weer.entity_id)}"><span class="wi">${WEER[weer.state] || '🌡️'}</span><b>${Math.round(weer.attributes.temperature)}°</b><span>${esc(h.formatEntityState ? h.formatEntityState(weer) : weer.state)}</span></button>` : ''}</div></div>
      ${!g ? `<div class="leeg fam-sub">${esc(t(h, 'nietIngesteld'))}</div>`
        : !l.length ? `<div class="leeg"><span class="fam-sub">${esc(t(h, 'geenLeden'))}</span>${h.user && h.user.is_admin ? `<button class="fam-knop" data-naar="/gezin-beheer"><ha-icon icon="mdi:account-plus"></ha-icon>${esc(t(h, 'naarBeheer'))}</button>` : ''}</div>`
        : `<div class="wie"><b>${esc(t(h, 'wieThuis'))}</b><span class="fam-sub">${esc(samen)}</span></div>
           <div class="leden">${l.map((x) => { const w = locatie(h, x.person);
             return `<button class="lid" data-person="${esc(x.person)}">${avatar(x, { grootte: 64, stip: w.bekend ? w.thuis : null })}
               <span class="naam">${esc(x.naam)}</span>${w.bekend ? `<span class="waar ${w.thuis ? 'thuis' : ''}">${esc(w.tekst)}</span>` : ''}</button>`; }).join('')}</div>`}
    </ha-card>`;
  }
}

/* ── Dashboard-strategie: custom:ha-family ── */
class FamilyStrategie extends HTMLElement {
  static async generate(config, hass) {
    const g = gezinState(hass), nl = taal(hass) === 'nl';
    const titel = g ? g.attributes.huishouden : 'HA Family';
    const afval = Object.values(hass.states).find((s) => s.attributes.ha_family === 'volgende_afval');
    return {
      title: titel,
      views: [
        { title: nl ? '🏠 Thuis' : '🏠 Home', path: 'thuis', type: 'sections', max_columns: 3,
          sections: [
            { type: 'grid', cards: [{ type: 'custom:family-gezin-card' }, { type: 'custom:family-klusjes-card' }] },
            { type: 'grid', cards: [{ type: 'custom:family-vandaag-card' }, { type: 'custom:family-eten-card', compact: true }, { type: 'custom:family-boodschappen-card', compact: true }] },
            { type: 'grid', cards: [{ type: 'custom:family-kamers-card', compact: true }, { type: 'custom:family-taken-card', compact: true },
              ...(afval && afval.state !== 'unknown' ? [{ type: 'tile', entity: afval.entity_id, name: nl ? 'Volgende afval' : 'Next waste collection' }] : [])] },
          ] },
        { title: nl ? '📅 Agenda' : '📅 Calendar', path: 'agenda', type: 'panel', cards: [{ type: 'custom:family-agenda-card' }] },
        { title: nl ? '✅ Taken' : '✅ Tasks', path: 'taken', type: 'sections', max_columns: 2,
          sections: [{ type: 'grid', cards: [{ type: 'custom:family-klusjes-card' }] }, { type: 'grid', cards: [{ type: 'custom:family-taken-card' }] }] },
        { title: nl ? '🍝 Eten' : '🍝 Meals', path: 'eten', type: 'sections', max_columns: 2,
          sections: [{ type: 'grid', cards: [{ type: 'custom:family-eten-card' }] }, { type: 'grid', cards: [{ type: 'custom:family-recepten-card' }] }] },
        { title: nl ? '🏠 Huis' : '🏠 Home', path: 'huis', type: 'panel', cards: [{ type: 'custom:family-kamers-card' }] },
        { title: nl ? '🛒 Boodschappen' : '🛒 Groceries', path: 'boodschappen', type: 'sections', max_columns: 1,
          sections: [{ type: 'grid', cards: [{ type: 'custom:family-boodschappen-card' }] }] },
      ],
    };
  }
}

const KAARTEN = [['family-gezin-card', FamilyGezinCard, 'HA Family: gezin', 'Groet, datum en wie er thuis is.'], ...AGENDA_KAARTEN, ...TAKEN_KAARTEN, ...ETEN_KAARTEN, ...HUIS_KAARTEN];
registreer([['ll-strategy-dashboard-ha-family', FamilyStrategie], ...KAARTEN.map(([n, c]) => [n, c])]);
window.customCards = window.customCards || [];
KAARTEN.forEach(([type, , name, description]) => { if (!window.customCards.some((c) => c.type === type)) window.customCards.push({ type, name, description }); });
console.info(`%c HA FAMILY %c ${VERSIE} `, 'background:#7c4dff;color:#fff;font-weight:700', 'background:#333;color:#fff');
