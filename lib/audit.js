// Honest website analysis for a lead's PUBLIC website.
// Two clearly separated layers:
//   1. MEASURED   — objective facts from a single public HTTP GET (status,
//                   HTTPS, response time, viewport/mobile meta, title/description,
//                   presence of a contact path). Never invented.
//   2. ASSESSMENT — plain-language opinion derived only from the measured
//                   facts. Marked as "vurdering", never presented as measured.
//
// If a measurement can't be taken (fetch failed, timeout), it is reported as
// "ikke målt" — we do not guess numbers.

function textInclude(html, re) { return re.test(html); }

// Extract <title> and meta description length without a DOM.
function metaBits(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [])[0] || '';
  const descContent = (desc.match(/content=["']([\s\S]*?)["']/i) || [])[1] || '';
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasTel = /href=["']tel:/i.test(html);
  const hasMailto = /href=["']mailto:/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  const hasMaps = /google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(html);
  return {
    title: title.trim(), titleLen: title.trim().length,
    descLen: descContent.trim().length,
    viewport, hasTel, hasMailto, hasForm, hasMaps,
  };
}

// Run the measured layer. Returns { ok, measured, error }.
export async function measureSite(rawUrl, { timeoutMs = 8000 } = {}) {
  let url = String(rawUrl || '').trim();
  if (!url) return { ok: false, error: 'Ingen nettadresse oppgitt.' };
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const measured = {
    url, https: null, status: null, responseMs: null, redirected: null,
    finalUrl: null, viewport: null, title: '', titleLen: null, descLen: null,
    hasContact: null, hasPhone: null, hasForm: null, hasMaps: null,
    bytes: null, fetchedAt: Date.now(),
  };

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const r = await fetch(url, {
      redirect: 'follow', signal: ctrl.signal,
      headers: { 'User-Agent': 'StayMotion-SiteCheck/1.0 (+https://staymotion.no)' },
    });
    measured.responseMs = Date.now() - started;
    measured.status = r.status;
    measured.finalUrl = r.url;
    measured.https = (r.url || url).startsWith('https://');
    measured.redirected = r.redirected;
    const html = await r.text();
    measured.bytes = html.length;
    const m = metaBits(html);
    measured.viewport = m.viewport;
    measured.title = m.title.slice(0, 200);
    measured.titleLen = m.titleLen;
    measured.descLen = m.descLen;
    measured.hasPhone = m.hasTel;
    measured.hasForm = m.hasForm;
    measured.hasContact = m.hasForm || m.hasMailto || m.hasTel;
    measured.hasMaps = m.hasMaps;
    return { ok: true, measured };
  } catch (e) {
    measured.error = e.name === 'AbortError' ? 'Tidsavbrudd (nettsiden svarte ikke i tide).' : String(e.message || e);
    return { ok: false, measured, error: measured.error };
  } finally {
    clearTimeout(to);
  }
}

// Build the assessment layer strictly from measured facts.
export function assess(measured) {
  if (!measured) return { score: null, points: [], summary: 'Ikke målt ennå.' };
  const points = []; // { area, verdict: 'god'|'svak'|'mangler'|'ukjent', note }
  const add = (area, verdict, note) => points.push({ area, verdict, note });

  // Mobile / viewport
  if (measured.viewport === true) add('Mobilopplevelse', 'god', 'Har viewport-tag (mobiltilpasset oppsett mulig).');
  else if (measured.viewport === false) add('Mobilopplevelse', 'svak', 'Mangler viewport-tag — ofte tegn på at siden ikke er mobiltilpasset.');
  else add('Mobilopplevelse', 'ukjent', 'Ikke målt.');

  // HTTPS / trust
  if (measured.https === true) add('Sikkerhet (HTTPS)', 'god', 'Serveres over HTTPS.');
  else if (measured.https === false) add('Sikkerhet (HTTPS)', 'svak', 'Ikke HTTPS — svekker tillit og Google-rangering.');
  else add('Sikkerhet (HTTPS)', 'ukjent', 'Ikke målt.');

  // Speed (measured response time only — not a full Lighthouse score)
  if (measured.responseMs != null) {
    if (measured.responseMs < 800) add('Hastighet (svartid)', 'god', 'Svarte på ' + measured.responseMs + ' ms.');
    else if (measured.responseMs < 2500) add('Hastighet (svartid)', 'svak', 'Svarte på ' + measured.responseMs + ' ms — kan oppleves tregt.');
    else add('Hastighet (svartid)', 'svak', 'Svarte på ' + measured.responseMs + ' ms — tregt.');
  } else add('Hastighet (svartid)', 'ukjent', 'Ikke målt.');

  // First impression proxy: title + description
  if (measured.titleLen != null) {
    if (measured.titleLen === 0) add('Førsteinntrykk (tittel)', 'mangler', 'Ingen sidetittel funnet.');
    else if (measured.titleLen < 15 || measured.titleLen > 65) add('Førsteinntrykk (tittel)', 'svak', 'Sidetittel er ' + measured.titleLen + ' tegn — bør være ca. 15–65.');
    else add('Førsteinntrykk (tittel)', 'god', 'Sidetittel har god lengde (' + measured.titleLen + ' tegn).');
  }
  if (measured.descLen != null) {
    if (measured.descLen === 0) add('Tydelighet i tilbudet (beskrivelse)', 'mangler', 'Mangler meta-beskrivelse — uklart hva siden tilbyr i søk.');
    else if (measured.descLen < 50) add('Tydelighet i tilbudet (beskrivelse)', 'svak', 'Kort meta-beskrivelse (' + measured.descLen + ' tegn).');
    else add('Tydelighet i tilbudet (beskrivelse)', 'god', 'Har meta-beskrivelse (' + measured.descLen + ' tegn).');
  }

  // Contact options
  if (measured.hasContact === true) {
    const bits = [];
    if (measured.hasForm) bits.push('skjema');
    if (measured.hasPhone) bits.push('telefon');
    add('Kontaktmuligheter', 'god', 'Fant ' + (bits.join(' + ') || 'kontaktlenke') + '.');
  } else if (measured.hasContact === false) {
    add('Kontaktmuligheter', 'mangler', 'Fant ingen tydelig kontaktmulighet (skjema/telefon/e-post) på forsiden.');
  } else add('Kontaktmuligheter', 'ukjent', 'Ikke målt.');

  // Local trust (maps)
  if (measured.hasMaps === true) add('Lokal tillit', 'god', 'Lenker til Google Maps / kart.');
  else if (measured.hasMaps === false) add('Lokal tillit', 'svak', 'Fant ikke kart/lokasjon på forsiden — svakere lokal tillit.');

  // Reachability
  if (measured.status != null && measured.status >= 400) {
    add('Tilgjengelighet', 'svak', 'Siden svarte med HTTP ' + measured.status + '.');
  }

  // Rough 0–100 score from weighted verdicts (assessment only, clearly labelled).
  const weight = { god: 1, svak: 0.4, mangler: 0, ukjent: null };
  const scored = points.filter((p) => weight[p.verdict] != null);
  const score = scored.length
    ? Math.round((scored.reduce((a, p) => a + weight[p.verdict], 0) / scored.length) * 100)
    : null;

  const weak = points.filter((p) => p.verdict === 'svak' || p.verdict === 'mangler');
  const summary = weak.length
    ? 'Tydeligste forbedringsmuligheter: ' + weak.slice(0, 3).map((p) => p.area.toLowerCase()).join(', ') + '.'
    : 'Nettsiden har et godt teknisk grunnlag.';

  return { score, points, summary, opportunities: weak.map((p) => ({ area: p.area, note: p.note })) };
}

// Full audit: measure + assess. Never throws — returns a structured result.
export async function auditSite(url, opts) {
  const m = await measureSite(url, opts);
  const measured = m.measured || null;
  const assessment = m.ok ? assess(measured) : { score: null, points: [], summary: m.error || 'Kunne ikke måle siden.' };
  return {
    ok: m.ok,
    url: measured ? measured.url : url,
    measured,
    assessment,
    error: m.ok ? null : m.error,
    disclaimer: 'Målte punkter er hentet automatisk fra én offentlig sidehenting. '
      + 'Vurderinger er skjønn basert på de målte punktene, ikke garanterte feil.',
  };
}
