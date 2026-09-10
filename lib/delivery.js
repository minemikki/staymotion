// Internal delivery checklist for web projects.
//
// Built ON TOP of the existing order store — no new database, no parallel
// system. Everything lives inside the order we already have:
//
//   orders/<id>/order.json → order.project.delivery = {
//     items:  { [itemKey]: { status, note, doc, at } },
//     facts:  { orgnr, contact, domain, registrar, … }   the compact intake record
//     report: { at, text }                               last generated handover
//     updatedAt
//   }
//
// `order.project` is the same object lib/project.js maintains (stage, urls,
// notes), so the delivery checklist and the project workflow stay in one place.
//
// SECURITY: never store passwords or secrets here. We record WHO owns an
// account, WHETHER access was granted and WHERE the service is administered —
// never the credentials themselves. The `facts` whitelist below enforces that.

import { saveOrder } from './orders.js';
import { loadOrder } from './project.js';
import { PACKAGES, fullName, MOMENTUM_INCLUDES, DELIVERY_PROMISE, GOOGLE_PROFILE, DOMAIN_TERMS, OWNERSHIP_TERMS } from './packages.js';

// ---- statuses --------------------------------------------------------------
// Deliberately four. 'blocked' and 'waiting' are the two that carry meaning:
// blocked = we cannot proceed; waiting = the ball is in the customer's court.
export const STATUSES = ['todo', 'waiting', 'blocked', 'done'];
export const STATUS_LABEL = {
  todo: 'Ikke startet',
  waiting: 'Venter på kunde',
  blocked: 'Blokkert',
  done: 'Ferdig',
};

export function isStatus(v) { return STATUSES.includes(v); }

// ---- the checklist spec ----------------------------------------------------
// Four phases, max five main points each. `details` are the sub-points that
// stay folded away until asked for. `blocker: true` means an unfinished item
// blocks launch (see launchBlockers below).
export const PHASES = [
  {
    key: 'oppstart',
    title: 'Oppstart',
    blurb: 'Avtale, tilganger og råmateriale på plass før vi bygger.',
    items: [
      { key: 'avtale', title: 'Pakke, pris, omfang, avtale og oppstartbetaling',
        hint: 'Oppstartbetaling må være mottatt før vi starter byggingen.' },
      { key: 'kontakt', title: 'Kontaktperson, godkjenner og ønsket lanseringsdato',
        hint: 'Én person må kunne godkjenne design og tekst.' },
      { key: 'domene_kart', title: 'Domene, registrar, hosting og eksisterende e-post kartlagt',
        hint: 'Viktigst: brukes domenet til bedrifts-e-post i dag? Da må DNS endres varsomt.' },
      { key: 'google_kart', title: 'Google-bedriftsprofil, eierskap, tilgang og verifiseringsstatus',
        hint: 'Noter hvem som eier profilen. Kunden gjennomfører selv eventuell verifisering.' },
      { key: 'materiale', title: 'Logo, bilder, tekstgrunnlag og bedriftsinformasjon mottatt',
        hint: 'Femdagersfristen starter først når dette er mottatt.' },
    ],
  },
  {
    key: 'bygg',
    title: 'Design og bygg',
    blurb: 'Siden bygges, testes og kvalitetssikres.',
    items: [
      { key: 'sider', title: 'Sider, navigasjon, innhold og CTA er ferdige' },
      { key: 'respons', title: 'Mobil, desktop og grunnleggende tilgjengelighet er kontrollert' },
      { key: 'skjema', title: 'Kontaktskjema, booking og standardintegrasjoner fungerer' },
      { key: 'seo', title: 'SEO-grunnmuren er gjennomført',
        details: [
          'Sidetitler og metabeskrivelser',
          'Riktig overskriftsstruktur',
          'Alt-tekst',
          'Sitemap og robots',
          'Canonical',
          'Favicon og delingsbilde',
          'Lokal bedriftsinformasjon',
          'Search Console',
        ] },
      { key: 'rettigheter', title: 'Personvern, bilder, lenker, tekst og bruksrettigheter er kontrollert' },
    ],
  },
  {
    key: 'forlansering',
    title: 'Før lansering',
    blurb: 'Det siste som må stemme før vi rører DNS.',
    items: [
      { key: 'godkjent', title: 'Kunden har godkjent design, tekst og revisjoner', blocker: true,
        hint: 'Skriftlig godkjenning fra den avtalte godkjenneren.' },
      { key: 'backup', title: 'Gammel nettside er sikkerhetskopiert og redirects er vurdert' },
      { key: 'dns', title: 'Domene, DNS, SSL og eksisterende e-postposter er kontrollert', blocker: true,
        hint: 'MX- og TXT-poster må overleve DNS-endringen, ellers mister kunden e-posten sin.' },
      { key: 'maaling', title: 'Search Console, enkel analyse og Google-bedriftsprofil er koblet' },
      { key: 'slutttest', title: 'Skjema, e-post, lenker, 404-side, mobil og ytelse er sluttestet', blocker: true },
    ],
  },
  {
    key: 'overlevering',
    title: 'Overlevering',
    blurb: 'Kunden får eierskap, opplæring og dokumentasjon.',
    items: [
      { key: 'sluttbetaling', title: 'Sluttbetaling er mottatt', blocker: true },
      { key: 'eierskap', title: 'Kunden har eierskap og nødvendige tilganger',
        hint: 'Registrer hvem som eier kontoen og at tilgang er gitt — aldri passord.' },
      { key: 'opplaering', title: 'Opplæring og overleveringsinformasjon er sendt' },
      { key: 'avtale_videre', title: 'Videre-avtale eller 14 dagers feilrettingsperiode er registrert' },
      { key: 'rapport', title: 'Sluttrapport og sikkerhetskopi er lagret' },
    ],
  },
];

// Extra launch blockers that are not tied to a single checklist item.
const EXTRA_BLOCKERS = [
  { key: 'domene_uklart', title: 'Domeneeierskapet er uklart',
    test: (f) => !String(f.domainOwner || '').trim(),
    fix: 'Fyll inn domeneeier under Oppstart-fakta.' },
  { key: 'epost_risiko', title: 'DNS-endringen kan ødelegge eksisterende bedrifts-e-post',
    test: (f, items) => f.domainHasEmail === 'ja' && (items.dns || {}).status !== 'done',
    fix: 'Kontroller MX-/TXT-poster og huk av «Domene, DNS, SSL og eksisterende e-postposter».' },
];

// Flat item lookup: key → { ...item, phaseKey, phaseTitle }
export const ITEM_INDEX = (() => {
  const idx = {};
  for (const ph of PHASES) for (const it of ph.items) idx[it.key] = { ...it, phaseKey: ph.key, phaseTitle: ph.title };
  return idx;
})();

// ---- the compact intake record --------------------------------------------
// Whitelist of fact fields, grouped into short sections (never one giant form).
// NOTE: no password/secret field exists here, and unknown keys are dropped.
export const FACT_SECTIONS = [
  {
    key: 'bedrift', title: 'Bedrift',
    fields: [
      { key: 'company', label: 'Bedriftsnavn' },
      { key: 'orgnr', label: 'Organisasjonsnummer' },
      { key: 'address', label: 'Adresse' },
      { key: 'hours', label: 'Åpningstider', long: true },
      { key: 'social', label: 'Sosiale medier', long: true },
    ],
  },
  {
    key: 'kontakt', title: 'Kontakt',
    fields: [
      { key: 'contact', label: 'Kontaktperson' },
      { key: 'phone', label: 'Telefon' },
      { key: 'email', label: 'E-post' },
      { key: 'approver', label: 'Hvem godkjenner' },
      { key: 'launchWish', label: 'Ønsket lanseringsdato' },
    ],
  },
  {
    key: 'domene', title: 'Domene og e-post',
    fields: [
      { key: 'currentSite', label: 'Eksisterende nettside' },
      { key: 'domain', label: 'Domene' },
      { key: 'domainOwner', label: 'Hvem eier domenet' },
      { key: 'registrar', label: 'Registrar' },
      { key: 'domainHasEmail', label: 'Brukes domenet til bedrifts-e-post?', choices: ['', 'ja', 'nei', 'usikker'] },
    ],
  },
  {
    key: 'google', title: 'Google-bedriftsprofil',
    fields: [
      { key: 'gbpStatus', label: 'Profilstatus', choices: ['', 'finnes ikke', 'finnes — ikke verifisert', 'finnes — verifisert'] },
      { key: 'gbpOwner', label: 'Eierkonto (e-post, ikke passord)' },
      { key: 'gbpAccess', label: 'Har vi fått tilgang?', choices: ['', 'ja', 'nei', 'venter'] },
    ],
  },
  {
    key: 'omfang', title: 'Omfang',
    fields: [
      { key: 'pages', label: 'Sider som skal bygges', long: true },
      { key: 'mainService', label: 'Viktigste tjeneste eller produkt' },
      { key: 'goal', label: 'Hovedmål og CTA', long: true },
      { key: 'booking', label: 'Booking- og skjemaønske', long: true },
      { key: 'assets', label: 'Logo, bilder og rettigheter', long: true },
    ],
  },
  {
    key: 'avtale', title: 'Pakke og betaling',
    fields: [
      { key: 'pkg', label: 'Pakke' },
      { key: 'priceKr', label: 'Pris (kr)' },
      { key: 'payment', label: 'Betalingsstatus' },
      { key: 'deadline', label: 'Frist' },
    ],
  },
];

const FACT_KEYS = new Set(FACT_SECTIONS.flatMap((s) => s.fields.map((f) => f.key)));

// Anything that smells like a credential is refused outright — defence in depth
// on top of the whitelist, so a future field can't quietly become a password box.
const SECRET_RE = /passord|password|passwd|secret|api[-_ ]?key|token|pin[-_ ]?kode|kortnummer/i;

// ---- reading / normalising -------------------------------------------------

export function emptyDelivery() {
  return { items: {}, facts: {}, report: null, updatedAt: 0 };
}

export function getDelivery(order) {
  const p = (order && order.project) || {};
  const d = p.delivery && typeof p.delivery === 'object' ? p.delivery : {};
  return {
    items: d.items && typeof d.items === 'object' ? d.items : {},
    facts: d.facts && typeof d.facts === 'object' ? d.facts : {},
    report: d.report || null,
    updatedAt: d.updatedAt || 0,
  };
}

// Progress + readiness for one project.
export function summarise(order) {
  const d = getDelivery(order);
  const phases = PHASES.map((ph) => {
    const items = ph.items.map((it) => {
      const st = d.items[it.key] || {};
      return {
        key: it.key, title: it.title, hint: it.hint || '', details: it.details || [],
        blocker: !!it.blocker,
        status: isStatus(st.status) ? st.status : 'todo',
        note: st.note || '', doc: st.doc || '', at: st.at || 0,
      };
    });
    const done = items.filter((i) => i.status === 'done').length;
    return {
      key: ph.key, title: ph.title, blurb: ph.blurb, items,
      done, total: items.length,
      complete: done === items.length,
      blocked: items.some((i) => i.status === 'blocked'),
      waiting: items.some((i) => i.status === 'waiting'),
    };
  });
  const all = phases.flatMap((p) => p.items);
  const done = all.filter((i) => i.status === 'done').length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;

  // What stands between us and launch, in plain Norwegian.
  //
  // `hard` separates a real problem from work that simply remains. A brand-new
  // project has plenty of unfinished launch-critical items, but nothing is
  // actually wrong — showing those as "blockers" would make the board shout at
  // Michael on day one. Hard = explicitly blocked, waiting on the customer, or
  // a risk derived from the facts (unclear domain owner, e-mail-carrying DNS).
  const blockers = [];
  for (const it of all) {
    if (it.status === 'blocked') {
      blockers.push({ key: it.key, title: it.title, why: it.note || 'Markert som blokkert.', hard: true });
    } else if (it.blocker && it.status !== 'done') {
      blockers.push({
        key: it.key, title: it.title,
        why: it.status === 'waiting' ? 'Venter på kunde.' : 'Ikke fullført ennå.',
        hard: it.status === 'waiting',
      });
    }
  }
  for (const b of EXTRA_BLOCKERS) {
    try { if (b.test(d.facts, d.items)) blockers.push({ key: b.key, title: b.title, why: b.fix, hard: true }); }
    catch (e) { /* a malformed fact must never break the view */ }
  }

  // The current phase is the first one that isn't finished.
  const currentPhase = (phases.find((p) => !p.complete) || phases[phases.length - 1]).key;

  return {
    orderId: order.id,
    company: d.facts.company || order.kunde || order.navn || order.company || '',
    email: order.email || d.facts.email || '',
    pkg: order.pkg || '',
    pkgName: order.pkg && PACKAGES[order.pkg] ? fullName(order.pkg) : (order.pakke || ''),
    stage: (order.project && order.project.stage) || '',
    liveUrl: (order.project && order.project.liveUrl) || '',
    stagingUrl: (order.project && order.project.stagingUrl) || '',
    paid: !!order.paid,
    phases, done, total: all.length, pct,
    currentPhase,
    blockers,
    hardBlockers: blockers.filter((b) => b.hard),
    // Safe to send and publish only when nothing is outstanding at all.
    launchReady: blockers.length === 0,
    waitingOnCustomer: all.filter((i) => i.status === 'waiting').map((i) => i.title),
    facts: d.facts,
    report: d.report,
    updatedAt: d.updatedAt,
  };
}

// ---- writing ---------------------------------------------------------------

function touch(order) {
  const p = order.project && typeof order.project === 'object' ? order.project : {};
  const d = p.delivery && typeof p.delivery === 'object' ? p.delivery : emptyDelivery();
  d.items = d.items && typeof d.items === 'object' ? d.items : {};
  d.facts = d.facts && typeof d.facts === 'object' ? d.facts : {};
  d.updatedAt = Date.now();
  p.delivery = d;
  p.updatedAt = Date.now();
  order.project = p;
  return d;
}

// Set one checklist item's status / note / doc link.
export async function setItem(orderId, itemKey, patch = {}) {
  if (!ITEM_INDEX[itemKey]) throw new Error('Ukjent sjekklistepunkt');
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Fant ikke prosjektet');
  const d = touch(order);
  const cur = d.items[itemKey] && typeof d.items[itemKey] === 'object' ? d.items[itemKey] : {};
  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) throw new Error('Ukjent status');
    cur.status = patch.status;
  }
  if (patch.note !== undefined) {
    const note = String(patch.note || '').slice(0, 600);
    if (SECRET_RE.test(note)) throw new Error('Notatet ser ut til å inneholde et passord eller en hemmelighet — det lagres ikke her.');
    cur.note = note;
  }
  if (patch.doc !== undefined) {
    let u = String(patch.doc || '').trim().slice(0, 500);
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    cur.doc = u;
  }
  cur.at = Date.now();
  d.items[itemKey] = cur;
  await saveOrder(order);
  return summarise(order);
}

// Patch the compact intake record. Unknown keys are dropped; credential-looking
// values are refused.
export async function setFacts(orderId, facts = {}) {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Fant ikke prosjektet');
  const d = touch(order);
  for (const k of Object.keys(facts)) {
    if (!FACT_KEYS.has(k)) continue;                 // whitelist only
    if (SECRET_RE.test(k)) continue;
    const v = String(facts[k] == null ? '' : facts[k]).slice(0, 600);
    if (SECRET_RE.test(v)) throw new Error('Feltet «' + k + '» ser ut til å inneholde et passord — vi lagrer aldri passord. Noter hvem som eier kontoen i stedet.');
    if (v) d.facts[k] = v; else delete d.facts[k];
  }
  await saveOrder(order);
  return summarise(order);
}

// ---- handover report -------------------------------------------------------
// A short summary Michael can paste to the customer. Built from what is
// actually recorded — it never claims something the checklist has not marked
// done, and it never promises a Google ranking.
export function buildReport(order, config = {}) {
  const s = summarise(order);
  const f = s.facts;
  const L = [];
  const done = (k) => (s.phases.flatMap((p) => p.items).find((i) => i.key === k) || {}).status === 'done';

  L.push('LEVERANSERAPPORT — ' + (s.company || s.orderId));
  L.push('Prosjekt: ' + String(s.orderId).toUpperCase() + '  ·  ' + new Date().toLocaleDateString('nb-NO'));
  L.push('');

  L.push('LEVERT');
  if (s.pkgName) L.push('Pakke: ' + s.pkgName + (f.priceKr ? ' — ' + f.priceKr + ' kr' : ''));
  if (f.pages) L.push('Sider: ' + f.pages);
  if (s.pkg === 'sprint') { MOMENTUM_INCLUDES.forEach((x) => L.push('· ' + x)); }
  else { s.phases.flatMap((p) => p.items).filter((i) => i.status === 'done').forEach((i) => L.push('· ' + i.title)); }
  L.push('');

  L.push('DOMENE OG PUBLISERING');
  L.push('Domene: ' + (f.domain || 'ikke registrert i sjekklisten'));
  L.push('Domeneeier: ' + (f.domainOwner || 'ikke registrert'));
  if (f.registrar) L.push('Registrar: ' + f.registrar);
  L.push('Status: ' + (s.liveUrl ? 'publisert på ' + s.liveUrl : (done('dns') ? 'DNS kontrollert — ikke publisert ennå' : 'ikke publisert ennå')));
  if (f.domainHasEmail === 'ja') L.push('Merk: domenet brukes til bedrifts-e-post. E-postpostene er kontrollert ved DNS-endring.');
  L.push('');

  L.push('INTEGRASJONER');
  if (done('skjema')) L.push('· Kontaktskjema/booking satt opp og testet');
  if (done('maaling')) L.push('· Search Console og enkel besøksmåling koblet');
  if (f.booking) L.push('· ' + f.booking);
  if (!done('skjema') && !done('maaling') && !f.booking) L.push('· Ingen integrasjoner registrert som ferdige.');
  L.push('');

  L.push('GOOGLE-BEDRIFTSPROFIL');
  if (done('google_kart') || f.gbpStatus) {
    L.push('Status: ' + (f.gbpStatus || 'kartlagt'));
    GOOGLE_PROFILE.does.forEach((x) => L.push('· ' + x));
    L.push(GOOGLE_PROFILE.customer);
    L.push('Vi lover ikke en bestemt plassering i søk eller et bestemt antall kunder.');
  } else {
    L.push('Ikke satt opp i dette prosjektet.');
  }
  L.push('');

  L.push('HVA DU EIER');
  L.push(OWNERSHIP_TERMS);
  L.push(DOMAIN_TERMS);
  if (f.gbpOwner) L.push('Google-bedriftsprofilen eies av: ' + f.gbpOwner);
  L.push('');

  L.push('OPPFØLGING');
  L.push(done('avtale_videre')
    ? 'Videre-avtale eller 14 dagers feilrettingsperiode er registrert.'
    : '14 dagers feilretting etter lansering.');
  L.push('');

  L.push('SPØRSMÅL?');
  L.push('Kontakt ' + (config.senderName || 'Michael') + ' — ' + (config.contactEmail || 'michael@staymotion.no')
    + (config.contactPhone ? ' · ' + config.contactPhone : ''));

  if (!s.launchReady) {
    L.push('');
    L.push('— INTERN MERKNAD (fjern før sending) —');
    L.push('Prosjektet er ikke markert leveringsklart. Åpne punkter:');
    s.blockers.forEach((b) => L.push('· ' + b.title + ' — ' + b.why));
  }
  return L.join('\n');
}

// Generate + persist the report on the order.
export async function generateReport(orderId, config = {}) {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Fant ikke prosjektet');
  const text = buildReport(order, config);
  const d = touch(order);
  d.report = { at: Date.now(), text };
  await saveOrder(order);
  return { text, at: d.report.at, summary: summarise(order) };
}

export { DELIVERY_PROMISE };
