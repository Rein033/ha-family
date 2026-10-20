/* HA Family — gedeeld ontwerp voor de kaarten, het dashboard en het beheerpaneel.
 * Groot, rustig en duidelijk: grote tikvlakken, ronde vormen, een eigen kleur en emoji per gezinslid.
 * Volgt het thema van Home Assistant (licht en donker) via de gewone thema-variabelen. */

export const VERSIE = '0.4.0';

const TEKST = {
  nl: {
    goedemorgen: 'Goedemorgen', goedemiddag: 'Goedemiddag', goedenavond: 'Goedenavond', goedenacht: 'Goedenacht',
    thuis: 'Thuis', weg: 'Weg', onbekend: 'Onbekend', wieThuis: 'Wie is er thuis?', iedereenThuis: 'Iedereen is thuis',
    niemandThuis: 'Niemand is thuis', zijnThuis: 'thuis',
    rollen: { ouder: 'Ouder', kind: 'Kind', huisgenoot: 'Huisgenoot', gast: 'Gast' },
    geenLeden: 'Er zijn nog geen gezinsleden.', naarBeheer: 'Gezinsleden toevoegen',
    nietIngesteld: 'HA Family is nog niet ingesteld. Voeg de integratie toe via Instellingen → Apparaten & diensten.',
  },
  en: {
    goedemorgen: 'Good morning', goedemiddag: 'Good afternoon', goedenavond: 'Good evening', goedenacht: 'Good night',
    thuis: 'Home', weg: 'Away', onbekend: 'Unknown', wieThuis: "Who's home?", iedereenThuis: 'Everyone is home',
    niemandThuis: 'Nobody is home', zijnThuis: 'home',
    rollen: { ouder: 'Parent', kind: 'Child', huisgenoot: 'Housemate', gast: 'Guest' },
    geenLeden: 'No family members yet.', naarBeheer: 'Add family members',
    nietIngesteld: 'HA Family is not set up yet. Add the integration in Settings → Devices & services.',
  },
};

export const taal = (hass) => (((hass && hass.locale && hass.locale.language) || 'en').startsWith('nl') ? 'nl' : 'en');
export const t = (hass, k) => TEKST[taal(hass)][k] ?? TEKST.en[k] ?? k;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** De sensor 'Gezin' (attribuut ha_family: gezin) met de leden. */
export const gezinState = (hass) => Object.values(hass.states).find((s) => s.attributes.ha_family === 'gezin');
export const leden = (hass) => (gezinState(hass) || { attributes: { leden: [] } }).attributes.leden || [];
export const ikLid = (hass) => leden(hass).find((l) => hass.user && l.user_id === hass.user.id);

export function groet(hass) {
  const u = new Date().getHours();
  return t(hass, u < 6 ? 'goedenacht' : u < 12 ? 'goedemorgen' : u < 18 ? 'goedemiddag' : 'goedenavond');
}

/** Waar is iemand: Thuis, Weg of de naam van een zone. */
export function locatie(hass, person) {
  const s = hass.states[person];
  if (!s || ['unknown', 'unavailable'].includes(s.state)) return { tekst: t(hass, 'onbekend'), thuis: false, bekend: false };
  if (s.state === 'home') return { tekst: t(hass, 'thuis'), thuis: true, bekend: true };
  if (s.state === 'not_home') return { tekst: t(hass, 'weg'), thuis: false, bekend: true };
  const zone = Object.values(hass.states).find((z) => z.entity_id.startsWith('zone.') && z.attributes.friendly_name && z.entity_id.endsWith('.' + s.state));
  return { tekst: zone ? zone.attributes.friendly_name : s.state.replace(/_/g, ' '), thuis: false, bekend: true };
}

/** Avatar: emoji op een cirkel in de eigen kleur, met een stip als iemand thuis is. */
export function avatar(lid, { grootte = 56, stip = null, foto = null } = {}) {
  const k = lid.kleur || '#7c4dff';
  const binnen = foto ? `<img src="${esc(foto)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>` : esc(lid.emoji || (lid.naam || '?').charAt(0));
  return `<span class="fam-avatar" style="--k:${k};width:${grootte}px;height:${grootte}px;font-size:${Math.round(grootte * 0.52)}px">${binnen}${
    stip === null ? '' : `<i class="fam-stip ${stip ? 'aan' : ''}"></i>`}</span>`;
}

export const CSS = `
  :host { --fam-radius: 20px; --fam-k: var(--primary-color); display: block; }
  .fam-avatar { position: relative; display: inline-grid; place-items: center; flex: none; border-radius: 50%; line-height: 1;
    background: color-mix(in srgb, var(--k) 22%, var(--card-background-color, #fff)); box-shadow: inset 0 0 0 3px var(--k); }
  .fam-stip { position: absolute; right: 2%; bottom: 2%; width: 26%; height: 26%; border-radius: 50%; background: var(--disabled-text-color, #999);
    box-shadow: 0 0 0 3px var(--card-background-color, #fff); }
  .fam-stip.aan { background: var(--success-color, #43a047); }
  .fam-knop { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; cursor: pointer; font: inherit; font-weight: 600;
    min-height: 44px; padding: 0 20px; border-radius: 22px; background: var(--fam-k); color: var(--text-primary-color, #fff); text-decoration: none; }
  .fam-knop.zacht { background: color-mix(in srgb, var(--fam-k) 14%, transparent); color: var(--fam-k); }
  .fam-knop.rand { background: none; color: var(--primary-text-color); box-shadow: inset 0 0 0 1px var(--divider-color); }
  .fam-knop.gevaar { background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent); color: var(--error-color, #db4437); }
  .fam-knop:disabled { opacity: .5; cursor: default; }
  .fam-knop ha-icon { --mdc-icon-size: 20px; }
  .fam-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: .85rem;
    background: var(--secondary-background-color); color: var(--primary-text-color); }
  .fam-chip ha-icon { --mdc-icon-size: 16px; }
  .fam-chip.goed { background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent); color: var(--success-color, #2e7d32); }
  .fam-chip.let_op { background: color-mix(in srgb, var(--warning-color, #ffa600) 16%, transparent); color: var(--warning-color, #b26a00); }
  .fam-chip.fout { background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent); color: var(--error-color, #db4437); }
  .fam-sub { color: var(--secondary-text-color); }
`;

/** Elementen opnieuw registreren in het register dat HA op dat moment gebruikt (HA kan het vervangen na vroege modules). */
export function registreer(lijst) {
  const doe = () => {
    const reg = window.customElements;
    lijst.forEach(([n, c]) => { if (!reg.get(n)) reg.define(n, class extends c {}); });
    return !!reg.get('ha-card');
  };
  if (!doe()) {
    let n = 0;
    const klok = setInterval(() => { if (doe() || ++n > 240) clearInterval(klok); }, 250);
  }
}
