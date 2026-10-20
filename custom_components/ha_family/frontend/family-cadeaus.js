/* HA Family — cadeaus (HA-Family-Cards).
 *
 *   type: custom:family-cadeaus-card    verlanglijstjes van het hele gezin, stiekem afvinken wat je koopt, en cadeau-ideeën
 *
 * Bovenaan kies je wie: jezelf (je eigen lijstje maken en naar anderen sturen) of iemand anders (zijn lijstje bekijken,
 * afvinken wat jij koopt, en ideeën laten bedenken — met de AI van Home Assistant als die er is). */
import { CSS, avatar, esc, leden } from './family-ui.js?v=0.7.0';

const TEKST = {
  nl: {
    cadeaus: 'Cadeaus', ik: 'jij', jarigOver: 'jarig over {x} dagen', jarigMorgen: 'morgen jarig! 🎂', jarigVandaag: 'vandaag jarig! 🎉', jaar: '{x} jaar',
    mijnLijst: 'Mijn verlanglijstje', lijstVan: 'Verlanglijstje van {x}', leeg: 'Nog niks op het lijstje.', leegAnder: '{x} heeft nog niks op het lijstje gezet.',
    wens: 'Wat wens je?', prijs: '€', link: 'Link (mag leeg)', notitie: 'Maat, kleur, … (mag leeg)', erop: 'Erop', bewaren: 'Bewaren', annuleren: 'Annuleren',
    sturen: 'Sturen naar…', sturenNaar: 'Naar wie stuur je het lijstje?', verstuurd: '📤 Verstuurd naar {x}', ikKoop: 'Ik koop dit', koopt: '{x} koopt dit',
    jijKoopt: 'Jij koopt dit ✓', geheim: '🤫 {x} ziet niet wat er gekocht wordt.', ideeen: 'Cadeau-ideeën voor {x}', bedenk: 'Bedenk ideeën', bezig: 'Even denken…',
    budget: 'Budget', geenBudget: 'Maakt niet uit', gelegenheid: 'Waarvoor?', gel: { verjaardag: 'Verjaardag', sinterklaas: 'Sinterklaas', kerst: 'Kerst', zomaar: 'Zomaar' },
    extra: 'Nog iets? (bijv. "houdt van blauw", "heeft al een PlayStation")', bewaarIdee: 'Bewaren', mijnIdeeen: 'Mijn bewaarde ideeën voor {x}',
    ai: '✨ met AI', geenAi: 'Tip: koppel een AI in Home Assistant (bijv. Ollama) voor slimmere ideeën.', interesses: 'Mijn interesses',
    interessesVan: 'Interesses van {x}', geenInteresses: 'Nog geen interesses: dan worden de ideeën algemener.', bewerkInteresses: 'Aanpassen', klaar: 'Klaar',
    zeker: '"{x}" van het lijstje halen?', geenGezinslid: 'Je bent (nog) geen gezinslid, dus je hebt geen eigen lijstje.', wijzig: 'Wijzigen', weg: 'Weg',
    bewaard: 'Bewaard ✓', helpen: 'Je helpt mee met dit lijstje.', tipIdeeen: 'Cadeau-ideeën voor iemand anders? Tik bovenaan op die persoon.',
  },
  en: {
    cadeaus: 'Gifts', ik: 'you', jarigOver: 'birthday in {x} days', jarigMorgen: 'birthday tomorrow! 🎂', jarigVandaag: 'birthday today! 🎉', jaar: '{x} years',
    mijnLijst: 'My wish list', lijstVan: "{x}'s wish list", leeg: 'Nothing on the list yet.', leegAnder: '{x} has not added anything yet.',
    wens: 'What do you wish for?', prijs: '€', link: 'Link (optional)', notitie: 'Size, colour, … (optional)', erop: 'Add', bewaren: 'Save', annuleren: 'Cancel',
    sturen: 'Send to…', sturenNaar: 'Who do you send the list to?', verstuurd: '📤 Sent to {x}', ikKoop: "I'll buy this", koopt: '{x} is buying this',
    jijKoopt: "You're buying this ✓", geheim: "🤫 {x} can't see what is being bought.", ideeen: 'Gift ideas for {x}', bedenk: 'Get ideas', bezig: 'Thinking…',
    budget: 'Budget', geenBudget: "Doesn't matter", gelegenheid: 'Occasion', gel: { verjaardag: 'Birthday', sinterklaas: 'Sinterklaas', kerst: 'Christmas', zomaar: 'Just because' },
    extra: 'Anything else? (e.g. "loves blue", "already has a PlayStation")', bewaarIdee: 'Save', mijnIdeeen: 'My saved ideas for {x}',
    ai: '✨ with AI', geenAi: 'Tip: connect an AI in Home Assistant (e.g. Ollama) for smarter ideas.', interesses: 'My interests',
    interessesVan: "{x}'s interests", geenInteresses: 'No interests yet: ideas will be more general.', bewerkInteresses: 'Edit', klaar: 'Done',
    zeker: 'Remove "{x}" from the list?', geenGezinslid: "You're not a family member (yet), so you have no list of your own.", wijzig: 'Edit', weg: 'Remove',
    bewaard: 'Saved ✓', helpen: "You're helping with this list.", tipIdeeen: 'Gift ideas for someone else? Tap that person at the top.',
  },
};
const taalVan = (h) => (((h && h.locale && h.locale.language) || 'en').startsWith('nl') ? 'nl' : 'en');
const BUDGETTEN = [null, 10, 25, 50, 100, 250];
const geld = (p) => (p == null ? '' : `€ ${Number(p).toLocaleString('nl-NL', { minimumFractionDigits: p % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);

const STIJL = `
  ha-card { padding: 16px; }
  .wie { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
  .wie button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 2px; padding: 8px 10px;
    border-radius: 18px; min-width: 84px; opacity: .6; }
  .wie button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 15%, transparent); }
  .wie b { font-size: .9rem; } .wie small { font-size: .72rem; color: var(--secondary-text-color); white-space: nowrap; }
  .wie small.jarig { color: var(--k); font-weight: 600; }
  .twee { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-top: 10px; }
  @media (max-width: 860px) { .twee { grid-template-columns: 1fr; } }
  .vak { background: var(--secondary-background-color); border-radius: 20px; padding: 14px; }
  .vak h3 { margin: 0 0 8px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .vak h3 .knop-r { margin-left: auto; }
  .sub { color: var(--secondary-text-color); font-size: .88rem; }
  .w { display: flex; align-items: center; gap: 10px; padding: 9px 4px; border-bottom: 1px solid var(--divider-color); }
  .w:last-child { border-bottom: 0; }
  .w .em { font-size: 1.5rem; width: 1.6em; text-align: center; }
  .w .tk { flex: 1; min-width: 0; }
  .w .tk b { display: block; overflow-wrap: anywhere; }
  .w .tk a { color: var(--primary-color); font-size: .85rem; }
  .w.gekocht .tk b { text-decoration: line-through; opacity: .55; }
  .w .p { font-weight: 600; white-space: nowrap; }
  .x { border: 0; background: none; color: var(--secondary-text-color); cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 1rem; }
  .x:hover { background: var(--card-background-color); }
  .koop { display: inline-flex; align-items: center; gap: 6px; border: 0; cursor: pointer; font: inherit; font-size: .82rem; padding: 6px 10px; border-radius: 999px;
    background: var(--card-background-color); color: var(--primary-text-color); white-space: nowrap; }
  .koop.mij { background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent); color: var(--success-color, #2e7d32); font-weight: 600; }
  .koop[disabled] { opacity: .6; cursor: default; }
  .form { display: grid; grid-template-columns: 1fr 90px; gap: 8px; margin-top: 10px; }
  .form .breed { grid-column: 1 / -1; }
  .veld { width: 100%; box-sizing: border-box; font: inherit; font-size: .95rem; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--divider-color);
    background: var(--card-background-color); color: var(--primary-text-color); }
  .rij { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { border: 0; font: inherit; font-size: .82rem; padding: 5px 11px; border-radius: 999px; background: var(--card-background-color); color: var(--primary-text-color); cursor: pointer; }
  .chip.aan { background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .idee { display: flex; gap: 10px; align-items: center; padding: 10px; border-radius: 14px; background: var(--card-background-color); margin-top: 8px; }
  .idee .em { font-size: 1.6rem; }
  .idee .tk { flex: 1; min-width: 0; } .idee .tk small { display: block; color: var(--secondary-text-color); }
  .badge { font-size: .75rem; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--primary-color) 15%, transparent); color: var(--primary-color); font-weight: 600; }
  .leeg { color: var(--secondary-text-color); padding: 10px 0; }
  .achter { position: fixed; inset: 0; z-index: 20; background: rgba(0, 0, 0, .45); display: grid; place-items: center; padding: 16px; }
  .dlg { background: var(--card-background-color); color: var(--primary-text-color); border-radius: 24px; padding: 22px; width: min(460px, 100%); box-shadow: 0 24px 60px rgba(0, 0, 0, .35); }
  .dlg h2 { margin: 0 0 12px; font-size: 1.25rem; }
  .ontv { display: flex; flex-wrap: wrap; gap: 8px; }
  .ontv button { border: 0; background: none; cursor: pointer; font: inherit; color: inherit; display: grid; justify-items: center; gap: 4px; padding: 6px; border-radius: 14px; opacity: .45; }
  .ontv button.aan { opacity: 1; background: color-mix(in srgb, var(--k) 14%, transparent); }
  .knoppen { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }
`;

class FamilyCadeausCard extends HTMLElement {
  setConfig(config) { this._config = { ...config }; }
  getCardSize() { return 10; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }
  t(k, x) { const v = TEKST[taalVan(this._hass)][k] ?? TEKST.en[k] ?? k; return x === undefined ? v : String(v).replaceAll('{x}', x); }

  set hass(hass) {
    const eerste = !this._hass;
    this._hass = hass;
    if (eerste) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.addEventListener('click', (e) => this._klik(e));
      this.shadowRoot.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'w-titel') this._klik({ target: this.shadowRoot.querySelector('[data-a=erop]') }); });
      this._kies = new URLSearchParams(location.search).get('lid');
      this._laad();
    }
  }
  async _laad() {
    try { this._d = await this._hass.callWS({ type: 'ha_family/cadeaus' }); this._fout = null; } catch (e) { this._fout = e.message; }
    if (!this._kies || !this._d.leden.some((l) => l.lid === this._kies)) this._kies = this._d && (this._d.ik || (this._d.leden[0] || {}).lid);
    this._teken();
  }
  _melding(message) { this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true })); }
  async _ws(type, data, ok) {
    try { const r = await this._hass.callWS({ type, ...data }); if (ok) this._melding(typeof ok === 'function' ? ok(r) : ok); await this._laad(); return r ?? true; }
    catch (e) { this._melding(e.message); return null; }
  }
  _typt() { const a = this.shadowRoot.activeElement; return a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName); }

  _teken() {
    if (!this.shadowRoot) return;
    const d = this._d;
    let binnen;
    if (this._fout) binnen = `<div class="leeg">${esc(this._fout)}</div>`;
    else if (!d) binnen = '<div class="leeg">…</div>';
    else binnen = this._inhoud();
    this.shadowRoot.innerHTML = `<style>${CSS}${STIJL}</style><ha-card><div class="fam-titel" style="font-size:1.3rem;font-weight:600;margin-bottom:8px">🎁 ${esc(this.t('cadeaus'))}</div>${binnen}</ha-card>${this._dlg ? this._dialoog() : ''}`;
  }

  _inhoud() {
    const d = this._d, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const wie = d.leden.map((x) => {
      const l = lmap[x.lid] || { naam: x.naam, kleur: '#7c4dff', emoji: '🙂' };
      const jarig = x.over === 0 ? this.t('jarigVandaag') : x.over === 1 ? this.t('jarigMorgen') : x.over != null && x.over <= 30 ? this.t('jarigOver', x.over) : '';
      return `<button class="${x.lid === this._kies ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="kies" data-l="${x.lid}">${avatar(l, { grootte: 46 })}
        <b>${esc(x.naam.split(' ')[0])}${x.lid === d.ik ? ` <small>(${esc(this.t('ik'))})</small>` : ''}</b><small class="${jarig ? 'jarig' : ''}">${esc(jarig || (x.wensen ? `🎁 ${x.wensen}` : ''))}</small></button>`;
    }).join('');
    const p = d.leden.find((x) => x.lid === this._kies);
    if (!p) return `<div class="wie">${wie}</div><div class="leeg">${esc(this.t('geenGezinslid'))}</div>`;
    const zelf = p.lid === d.ik, naam = p.naam.split(' ')[0];
    const mag = zelf || this._magHelpen(p);
    const lijst = d.lijsten[p.lid] || [];
    const info = [p.leeftijd != null ? this.t('jaar', p.leeftijd) : null, p.verjaardag ? new Date(p.verjaardag + 'T00:00:00').toLocaleDateString(this._hass.locale?.language, { day: 'numeric', month: 'long' }) : null].filter(Boolean).join(' · ');
    const wensen = lijst.length ? lijst.map((w) => this._wensRij(w, zelf, mag)).join('') : `<div class="leeg">${esc(zelf ? this.t('leeg') : this.t('leegAnder', naam))}</div>`;
    const links = `<div class="vak"><h3>${esc(zelf ? this.t('mijnLijst') : this.t('lijstVan', naam))} <span class="sub">${esc(info)}</span>
        ${mag && lijst.length ? `<button class="fam-knop zacht knop-r" data-a="sturen">📤 ${esc(this.t('sturen'))}</button>` : ''}</h3>
      ${!zelf && mag ? `<div class="sub">${esc(this.t('helpen'))}</div>` : ''}
      ${wensen}
      ${mag ? this._wensForm() : ''}
      ${!zelf ? `<p class="sub" style="margin:10px 0 0">${esc(this.t('geheim', naam))}</p>` : ''}
      ${this._interesses(p, zelf || mag, naam)}
      ${zelf ? `<p class="sub" style="margin:14px 0 0">💡 ${esc(this.t('tipIdeeen'))}${this._d.ai ? ` <span class="badge">${esc(this.t('ai'))}</span>` : ''}</p>` : ''}</div>`;
    const rechts = zelf ? '' : this._ideeenVak(p, naam);
    return `<div class="wie">${wie}</div><div class="twee" style="${zelf ? 'grid-template-columns:1fr' : ''}">${links}${rechts}</div>`;
  }
  _magHelpen(p) {
    const ik = this._d.leden.find((x) => x.lid === this._d.ik), lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    const rolIk = ik && lmap[ik.lid] ? lmap[ik.lid].rol : null, rolDoel = lmap[p.lid] ? lmap[p.lid].rol : null;
    return (rolIk === 'ouder' || (this._hass.user && this._hass.user.is_admin)) && rolDoel === 'kind';
  }
  _wensRij(w, zelf, mag) {
    const prijs = w.prijs != null ? `<span class="p">${esc(geld(w.prijs))}</span>` : '';
    const link = w.link ? `<a href="${esc(w.link)}" target="_blank" rel="noopener noreferrer">🔗 ${esc(new URL(w.link).hostname.replace(/^www\./, ''))}</a>` : '';
    let rechts = '';
    if (!zelf) {
      if (w.door_mij) rechts = `<button class="koop mij" data-a="koop" data-w="${w.id}" data-g="">${esc(this.t('jijKoopt'))}</button>`;
      else if (w.gekocht) rechts = `<button class="koop" disabled>🛍️ ${esc(this.t('koopt', w.gekocht_door || '…'))}</button>`;
      else rechts = `<button class="koop" data-a="koop" data-w="${w.id}" data-g="1">🛍️ ${esc(this.t('ikKoop'))}</button>`;
    }
    const beheer = mag ? `<button class="x" data-a="wijzig" data-w="${w.id}" title="${esc(this.t('wijzig'))}">✏️</button><button class="x" data-a="weg" data-w="${w.id}" title="${esc(this.t('weg'))}">🗑️</button>` : '';
    if (this._bewerk === w.id) return this._wensForm(w);
    return `<div class="w ${!zelf && w.gekocht ? 'gekocht' : ''}"><span class="em">${esc(w.emoji || '🎁')}</span><span class="tk"><b>${esc(w.titel)}</b>
      ${w.notitie ? `<span class="sub">${esc(w.notitie)}</span> ` : ''}${link}</span>${prijs}${rechts}${beheer}</div>`;
  }
  _wensForm(w) {
    const v = w || {};
    return `<div class="form" data-form="${w ? w.id : 'nieuw'}"><input class="veld" id="w-titel" placeholder="${esc(this.t('wens'))}" value="${esc(v.titel || '')}" maxlength="120"/>
      <input class="veld" id="w-prijs" placeholder="${esc(this.t('prijs'))}" inputmode="decimal" value="${v.prijs != null ? esc(String(v.prijs).replace('.', ',')) : ''}"/>
      <input class="veld breed" id="w-link" placeholder="${esc(this.t('link'))}" value="${esc(v.link || '')}"/>
      <input class="veld breed" id="w-notitie" placeholder="${esc(this.t('notitie'))}" value="${esc(v.notitie || '')}" maxlength="500"/>
      <div class="rij breed" style="justify-content:flex-end;margin:0">${w ? `<button class="fam-knop rand" data-a="annuleer">${esc(this.t('annuleren'))}</button>` : ''}
        <button class="fam-knop" data-a="erop">${esc(w ? this.t('bewaren') : '+ ' + this.t('erop'))}</button></div></div>`;
  }
  _interesses(p, mag, naam) {
    const alle = [...new Set([...(this._d.interesses || []), ...p.interesses])];
    if (this._intBewerk === p.lid) {
      return `<h3 style="margin-top:16px">🎯 ${esc(p.lid === this._d.ik ? this.t('interesses') : this.t('interessesVan', naam))}
          <button class="fam-knop knop-r" data-a="int-klaar">${esc(this.t('klaar'))}</button></h3>
        <div class="chips">${alle.map((i) => `<button class="chip ${p.interesses.includes(i) ? 'aan' : ''}" data-a="int" data-v="${esc(i)}">${esc(i)}</button>`).join('')}</div>`;
    }
    return `<h3 style="margin-top:16px">🎯 ${esc(p.lid === this._d.ik ? this.t('interesses') : this.t('interessesVan', naam))}
        ${mag ? `<button class="fam-knop rand knop-r" data-a="int-bewerk" style="min-height:32px">${esc(this.t('bewerkInteresses'))}</button>` : ''}</h3>
      ${p.interesses.length ? `<div class="chips">${p.interesses.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>` : `<div class="sub">${esc(this.t('geenInteresses'))}</div>`}`;
  }
  _ideeenVak(p, naam) {
    const f = this._f || (this._f = { budget: 50, gelegenheid: p.over != null && p.over <= 60 ? 'verjaardag' : 'zomaar' });
    const res = this._ideeen && this._ideeen.voor === p.lid ? this._ideeen : null;
    const bewaard = (this._d.ideeen || []).filter((i) => i.voor === p.lid);
    return `<div class="vak"><h3>💡 ${esc(this.t('ideeen', naam))} ${this._d.ai ? `<span class="badge">${esc(this.t('ai'))}</span>` : ''}</h3>
      <div class="sub">${esc(this.t('budget'))}</div>
      <div class="chips" style="margin:4px 0 8px">${BUDGETTEN.map((b) => `<button class="chip ${f.budget === b ? 'aan' : ''}" data-a="budget" data-v="${b ?? ''}">${esc(b ? `≤ €${b}` : this.t('geenBudget'))}</button>`).join('')}</div>
      <div class="sub">${esc(this.t('gelegenheid'))}</div>
      <div class="chips" style="margin:4px 0 8px">${this._d.gelegenheden.map((g) => `<button class="chip ${f.gelegenheid === g ? 'aan' : ''}" data-a="gel" data-v="${g}">${esc(this.t('gel')[g] || g)}</button>`).join('')}</div>
      ${this._d.ai ? `<input class="veld" id="i-extra" placeholder="${esc(this.t('extra'))}" value="${esc(f.extra || '')}" maxlength="300"/>` : ''}
      <div class="rij"><button class="fam-knop" data-a="bedenk" ${this._denkt ? 'disabled' : ''}>${esc(this._denkt ? this.t('bezig') : '✨ ' + this.t('bedenk'))}</button></div>
      ${!this._d.ai ? `<p class="sub" style="margin:8px 0 0">${esc(this.t('geenAi'))}</p>` : ''}
      ${res ? res.ideeen.map((i, n) => `<div class="idee"><span class="em">${esc(i.emoji || '🎁')}</span><span class="tk"><b>${esc(i.titel)}</b><small>${esc(i.waarom || '')}</small></span>
        ${i.prijs ? `<span class="p">${esc(geld(i.prijs))}</span>` : ''}<button class="fam-knop zacht" data-a="bewaar" data-n="${n}">⭐ ${esc(this.t('bewaarIdee'))}</button></div>`).join('') : ''}
      ${bewaard.length ? `<h3 style="margin-top:16px">⭐ ${esc(this.t('mijnIdeeen', naam))}</h3>${bewaard.map((i) => `<div class="w"><span class="em">${esc(i.emoji)}</span><span class="tk"><b>${esc(i.titel)}</b></span>
          ${i.prijs != null ? `<span class="p">${esc(geld(i.prijs))}</span>` : ''}<button class="x" data-a="idee-weg" data-i="${i.id}">🗑️</button></div>`).join('')}` : ''}</div>`;
  }
  _dialoog() {
    const d = this._dlg, lmap = Object.fromEntries(leden(this._hass).map((l) => [l.id, l]));
    return `<div class="achter" data-sluit="1"><div class="dlg"><h2>📤 ${esc(this.t('sturenNaar'))}</h2>
      <div class="ontv">${leden(this._hass).filter((l) => l.id !== d.lid).map((l) => `<button class="${d.naar.includes(l.id) ? 'aan' : ''}" style="--k:${esc(l.kleur)}" data-a="ontv" data-l="${l.id}">${avatar(l, { grootte: 44 })}<small>${esc(l.naam.split(' ')[0])}</small></button>`).join('')}</div>
      <div class="knoppen"><button class="fam-knop rand" data-sluit="1">${esc(this.t('annuleren'))}</button><button class="fam-knop" data-a="verstuur" ${d.naar.length ? '' : 'disabled'}>📤 ${esc(this.t('sturen').replace('…', ''))}</button></div></div></div>`;
  }

  async _klik(e) {
    const r = this.shadowRoot, q = (id) => r.getElementById(id);
    const s = e.target.closest && e.target.closest('[data-sluit]');
    if (s && (s.tagName === 'BUTTON' || e.target === s)) { this._dlg = null; return this._teken(); }
    const b = e.target.closest && e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a, d = this._d, p = d && d.leden.find((x) => x.lid === this._kies);
    if (a === 'kies') { this._kies = b.dataset.l; this._bewerk = null; this._intBewerk = null; this._f = null; this._ideeen = null; return this._teken(); }
    if (a === 'erop') {
      const titel = q('w-titel').value.trim();
      if (!titel) return q('w-titel').focus();
      const data = { titel, prijs: q('w-prijs').value || null, link: q('w-link').value || null, notitie: q('w-notitie').value || null, ...(this._kies !== d.ik ? { lid: this._kies } : {}) };
      if (this._bewerk) data.wens = this._bewerk;
      if (await this._ws('ha_family/wens', data)) { this._bewerk = null; this._teken(); setTimeout(() => { const t = this.shadowRoot.getElementById('w-titel'); if (t && !this._bewerk) t.focus(); }, 0); }
      return;
    }
    if (a === 'wijzig') { this._bewerk = b.dataset.w; return this._teken(); }
    if (a === 'annuleer') { this._bewerk = null; return this._teken(); }
    if (a === 'weg') {
      const w = d.lijsten[this._kies].find((x) => x.id === b.dataset.w);
      if (confirm(this.t('zeker', w.titel))) await this._ws('ha_family/wens/weg', { wens: w.id });
      return;
    }
    if (a === 'koop') return this._ws('ha_family/wens/kopen', { wens: b.dataset.w, gekocht: !!b.dataset.g });
    if (a === 'sturen') { this._dlg = { lid: this._kies, naar: [] }; return this._teken(); }
    if (a === 'ontv') { const n = this._dlg.naar, l = b.dataset.l; this._dlg.naar = n.includes(l) ? n.filter((x) => x !== l) : [...n, l]; return this._teken(); }
    if (a === 'verstuur') {
      const namen = this._dlg.naar.map((id) => (leden(this._hass).find((l) => l.id === id) || {}).naam).join(', ');
      if (await this._ws('ha_family/wensen/sturen', { naar: this._dlg.naar, ...(this._dlg.lid !== d.ik ? { lid: this._dlg.lid } : {}) }, this.t('verstuurd', namen))) { this._dlg = null; this._teken(); }
      return;
    }
    if (a === 'int-bewerk') { this._intBewerk = p.lid; return this._teken(); }
    if (a === 'int-klaar') { this._intBewerk = null; return this._teken(); }
    if (a === 'int') {
      const v = b.dataset.v, nieuw = p.interesses.includes(v) ? p.interesses.filter((x) => x !== v) : [...p.interesses, v];
      p.interesses = nieuw; this._teken();
      try { await this._hass.callWS({ type: 'ha_family/lid/profiel', ...(p.lid !== d.ik ? { lid: p.lid } : {}), interesses: nieuw }); } catch (er) { this._melding(er.message); await this._laad(); }
      return;
    }
    if (a === 'budget') { this._f.budget = b.dataset.v ? Number(b.dataset.v) : null; return this._teken(); }
    if (a === 'gel') { this._f.gelegenheid = b.dataset.v; return this._teken(); }
    if (a === 'bedenk') {
      if (q('i-extra')) this._f.extra = q('i-extra').value;
      this._denkt = true; this._teken();
      try { this._ideeen = { voor: p.lid, ...(await this._hass.callWS({ type: 'ha_family/cadeau/ideeen', lid: p.lid, budget: this._f.budget, gelegenheid: this._f.gelegenheid, extra: this._f.extra || null })) }; }
      catch (er) { this._melding(er.message); }
      this._denkt = false; return this._teken();
    }
    if (a === 'bewaar') {
      const i = this._ideeen.ideeen[Number(b.dataset.n)];
      return this._ws('ha_family/cadeau/idee', { lid: p.lid, titel: i.titel, emoji: i.emoji || '🎁', prijs: i.prijs ?? null }, this.t('bewaard'));
    }
    if (a === 'idee-weg') return this._ws('ha_family/cadeau/idee/weg', { idee: b.dataset.i });
  }
}

export const CADEAU_KAARTEN = [
  ['family-cadeaus-card', FamilyCadeausCard, 'HA Family: cadeaus', 'Verlanglijstjes, stiekem afvinken wat je koopt, en cadeau-ideeën.'],
];
