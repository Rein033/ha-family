/* HA Family — het gezinsdashboard als sjabloon (HA-Family-Dashboard).
 *
 * Automatisch: het dashboard bouwt zichzelf (strategie) en krijgt nieuwe functies vanzelf, maar kaarten pas je niet los aan.
 * Sjabloon: HA Family zet het dashboard één keer neer als gewoon dashboard; daarna bewerk je elke kaart, verplaats je ze
 * en zet je er eigen kaarten bij. Na een update voegt 'Nieuwe onderdelen toevoegen' alleen toe wat er nog niet is
 * (tabbladen, kaarten); wat jij veranderde blijft staan. Terug naar automatisch kan altijd (met een kopie). */
import { FamilyStrategie } from './family-cards.js?v=0.13.2';
import { VERSIE } from './family-ui.js?v=0.13.2';

export const URL = 'gezin';

export async function huidig(hass) {
  return hass.callWS({ type: 'lovelace/config', url_path: URL });
}

export function soort(config) {
  return config && config.strategy ? 'automatisch' : 'sjabloon';
}

async function bewaar(hass, config) {
  await hass.callWS({ type: 'lovelace/config/save', url_path: URL, config });
}

async function kopie(hass, config) {
  // de vorige versie bewaren, zodat je terug kunt
  try { await hass.callWS({ type: 'ha_family/dashboard/kopie', config }); } catch (e) { /* oudere backend: geen kopie */ }
}

/** Automatisch → sjabloon: wat de strategie nu maakt, wordt een gewoon dashboard. */
export async function naarSjabloon(hass) {
  const nu = await huidig(hass);
  const opties = (nu && nu.strategy) || { type: 'custom:ha-family' };
  const config = await FamilyStrategie.generate(opties, hass);
  await kopie(hass, nu);
  await bewaar(hass, { ...config, ha_family: { sjabloon: VERSIE, opties, bekend: bekendVan(config) } });
  return config.views.length;
}

// Wat het sjabloon al kende: tabbladen (path) en HA Family-kaarten per tabblad. Alleen wat daar niet in staat is écht nieuw;
// iets wat jij zelf weghaalde, komt dus niet terug.
const bekendVan = (config) => ({ tabs: config.views.map((v) => v.path), kaarten: Object.fromEntries(config.views.map((v) => [v.path, [...kaartTypes(v)]])) });

const kaartTypes = (v) => {
  const uit = new Set();
  const zoek = (x) => { if (Array.isArray(x)) x.forEach(zoek); else if (x && typeof x === 'object') { if (typeof x.type === 'string' && x.type.startsWith('custom:family-')) uit.add(x.type); Object.values(x).forEach(zoek); } };
  zoek(v);
  return uit;
};

/** Sjabloon aanvullen: nieuwe tabbladen en kaarten uit deze versie erbij; niets weghalen of veranderen. */
export async function aanvullen(hass) {
  const nu = await huidig(hass);
  if (soort(nu) !== 'sjabloon') return { tabs: 0, kaarten: 0 };
  const opties = (nu.ha_family && nu.ha_family.opties) || { type: 'custom:ha-family' };
  const nieuw = await FamilyStrategie.generate(opties, hass);
  const views = [...(nu.views || [])];
  const bekend = (nu.ha_family && nu.ha_family.bekend) || bekendVan(nu);
  let tabs = 0, kaarten = 0;
  for (const v of nieuw.views) {
    if (!bekend.tabs.includes(v.path)) { if (!views.some((x) => x.path === v.path)) { views.push(v); tabs++; } continue; }
    const bestaand = views.find((x) => x.path === v.path);
    if (!bestaand) continue;                               // zelf weggehaald: zo laten
    // kaarten die in deze versie nieuw zijn op dit tabblad: in een eigen blok erbij
    const al = new Set([...(bekend.kaarten[v.path] || []), ...kaartTypes(bestaand)]), erbij = [];
    for (const c of [...(v.cards || []), ...(v.sections || []).flatMap((s) => s.cards || [])]) {
      if (c.type && c.type.startsWith('custom:family-') && !al.has(c.type)) { erbij.push(c); al.add(c.type); }
    }
    if (!erbij.length) continue;
    kaarten += erbij.length;
    if (bestaand.type === 'sections') bestaand.sections = [...(bestaand.sections || []), { type: 'grid', cards: erbij }];
    else bestaand.cards = [...(bestaand.cards || []), ...erbij];
  }
  const nieuwBekend = bekendVan(nieuw);
  nieuwBekend.tabs = [...new Set([...bekend.tabs, ...nieuwBekend.tabs])];
  for (const [k, v] of Object.entries(bekend.kaarten)) nieuwBekend.kaarten[k] = [...new Set([...v, ...(nieuwBekend.kaarten[k] || [])])];
  if (tabs || kaarten) await kopie(hass, nu);
  await bewaar(hass, { ...nu, views, ha_family: { ...(nu.ha_family || {}), sjabloon: VERSIE, bekend: nieuwBekend } });
  return { tabs, kaarten };
}

/** Terug naar automatisch (het sjabloon gaat als kopie de opslag in). */
export async function naarAutomatisch(hass) {
  const nu = await huidig(hass);
  await kopie(hass, nu);
  const opties = (nu && nu.ha_family && nu.ha_family.opties) || { type: 'custom:ha-family' };
  await bewaar(hass, { strategy: { ...opties, type: 'custom:ha-family' } });
}

export async function kopieTerug(hass) {
  const r = await hass.callWS({ type: 'ha_family/dashboard/kopie' });
  if (!r || !r.config) throw new Error('Er is geen eerdere versie bewaard.');
  await bewaar(hass, r.config);
}
