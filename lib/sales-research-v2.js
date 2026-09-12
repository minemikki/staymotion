// StayMotion Sales Engine V2 — public-site research engine.
// No AI dependency and no invented claims. It crawls a small set of public pages,
// extracts verifiable facts, and turns only those facts into sales opportunities.

const UA = 'StayMotion-Research/2.0 (+https://staymotion.no)';
const MAX_HTML = 1_500_000;

function clean(s = '') {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
function first(re, html) { const m = String(html || '').match(re); return m ? clean(m[1] || '') : ''; }
function all(re, html, limit = 20) {
  const out = []; let m; const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(String(html || ''))) && out.length < limit) { const v = clean(m[1] || ''); if (v && !out.includes(v)) out.push(v); }
  return out;
}
function normUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u).toString(); } catch { return ''; }
}
function sameHost(base, href) {
  try { return new URL(href, base).hostname.replace(/^www\./, '') === new URL(base).hostname.replace(/^www\./, ''); } catch { return false; }
}
function absolutize(base, href) { try { return new URL(href, base).toString(); } catch { return ''; } }
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }

async function fetchPage(url, timeoutMs = 9000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs); const start = Date.now();
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' } });
    const type = r.headers.get('content-type') || '';
    if (!type.includes('text/html') && !type.includes('xhtml')) return { ok: false, url: r.url || url, status: r.status, error: 'Ikke HTML' };
    const text = (await r.text()).slice(0, MAX_HTML);
    return { ok: r.ok, url: r.url || url, status: r.status, ms: Date.now() - start, html: text };
  } catch (e) {
    return { ok: false, url, status: null, error: e && e.name === 'AbortError' ? 'Timeout' : String(e && e.message || e) };
  } finally { clearTimeout(t); }
}

function pageFacts(page) {
  const html = page.html || '';
  const title = first(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
  const metaTag = (html.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [])[0] || '';
  const meta = first(/content=["']([\s\S]*?)["']/i, metaTag);
  const h1 = all(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, html, 5);
  const h2 = all(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, html, 12);
  const links = [];
  const lr = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
  while ((m = lr.exec(html)) && links.length < 250) {
    const href = absolutize(page.url, m[1]); if (!href) continue;
    const text = clean(m[2]); links.push({ href, text });
  }
  const visible = clean(html).slice(0, 80_000);
  const low = visible.toLowerCase();
  const imageCount = (html.match(/<img\b/gi) || []).length;
  const formCount = (html.match(/<form\b/gi) || []).length;
  const telCount = (html.match(/href=["']tel:/gi) || []).length;
  const mailCount = (html.match(/href=["']mailto:/gi) || []).length;
  const schema = /application\/ld\+json/i.test(html);
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const canonical = first(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i, html);
  const ogImage = first(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i, html);
  const platform = /wp-content|wordpress/i.test(html) ? 'WordPress'
    : /wixstatic|wix\.com/i.test(html) ? 'Wix'
    : /squarespace/i.test(html) ? 'Squarespace'
    : /webflow/i.test(html) ? 'Webflow'
    : /shopify/i.test(html) ? 'Shopify' : 'Ukjent';
  const terms = {
    projects: /prosjekt|referans|case|arbeider|portefølje/.test(low),
    reviews: /anmeld|omtale|kunde(?:ne)? sier|trustpilot|google review/.test(low),
    booking: /bestill|book|booking|befaring|timebestilling|få tilbud|be om tilbud/.test(low),
    services: /tjenester|services|vi tilbyr|våre tjenester/.test(low),
    locations: /stavanger|sandnes|sola|jæren|rogaland|randaberg|bryne/.test(low),
  };
  return { title, meta, h1, h2, links, visible, imageCount, formCount, telCount, mailCount, schema, viewport, canonical, ogImage, platform, terms };
}

function chooseInternal(base, facts) {
  const scored = [];
  const seen = new Set();
  for (const l of facts.links || []) {
    if (!sameHost(base, l.href)) continue;
    const u = new URL(l.href); u.hash = '';
    const href = u.toString(); if (seen.has(href) || href === base) continue; seen.add(href);
    const s = (l.text + ' ' + u.pathname).toLowerCase();
    let score = 0;
    if (/tjenest|service|behandling|produkt/.test(s)) score += 7;
    if (/prosjekt|referans|case|portfolio|arbeid/.test(s)) score += 6;
    if (/kontakt|contact/.test(s)) score += 5;
    if (/om-oss|om oss|about/.test(s)) score += 3;
    if (/pris|price/.test(s)) score += 2;
    if (/blogg|nyhet/.test(s)) score -= 2;
    scored.push({ href, score, text: l.text });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 4);
}

function pushUnique(arr, item) {
  if (!item || !item.key || arr.some(x => x.key === item.key)) return;
  arr.push(item);
}

function derive(baseFacts, pages, manual = {}) {
  const opp = []; const strengths = [];
  const titleLow = (baseFacts.title || '').toLowerCase();
  const h1 = baseFacts.h1[0] || '';
  const body = pages.map(p => p.facts.visible || '').join(' ').toLowerCase();
  const location = String(manual.location || '').trim();
  const locationToken = location.split(',')[0].trim().toLowerCase();

  if (baseFacts.title && baseFacts.meta) strengths.push('Har både sidetittel og meta-beskrivelse på forsiden.');
  if (baseFacts.terms.projects || body.match(/prosjekt|referans|case|portefølje/)) strengths.push('Har prosjekt-/referanseinnhold som kan brukes som salgsbevis.');
  if (baseFacts.formCount || baseFacts.telCount) strengths.push('Har en synlig kontaktvei på forsiden.');
  if (baseFacts.schema) strengths.push('Har strukturert data (JSON-LD) i kildekoden.');
  if (baseFacts.terms.locations) strengths.push('Nevner lokale markedsområder på nettsiden.');

  if (!baseFacts.title) pushUnique(opp, { key:'title-missing', type:'seo', confidence:'høy', title:'Mangler sidetittel', evidence:'Ingen <title> funnet på forsiden.', impact:'Google og potensielle kunder får et svakere søkeresultat.', action:'Lag en tydelig tittel med tjeneste, merkevare og relevant sted.' });
  else if (locationToken && !titleLow.includes(locationToken)) pushUnique(opp, { key:'title-location', type:'seo', confidence:'middels', title:'Lokasjon er ikke synlig i forsidetittelen', evidence:'Tittel: «'+baseFacts.title+'». Oppgitt lokasjon: '+location+'.', impact:'Kan gjøre søkeresultatet mindre relevant for lokale søk med kjøpsintensjon.', action:'Test en mer lokal title/meta-struktur uten å overoptimalisere.' });
  if (!baseFacts.meta) pushUnique(opp, { key:'meta-missing', type:'seo', confidence:'høy', title:'Mangler meta-beskrivelse', evidence:'Ingen meta description funnet på forsiden.', impact:'Bedriften mister kontroll over budskapet som ofte vises i Google.', action:'Skriv en konkret beskrivelse med tilbud, område og ønsket handling.' });
  if (!h1) pushUnique(opp, { key:'h1-missing', type:'seo', confidence:'høy', title:'Mangler tydelig H1', evidence:'Ingen H1 funnet på forsiden.', impact:'Både bruker og søkemotor får svakere signal om hva siden faktisk handler om.', action:'Gi forsiden én tydelig hovedoverskrift som sier hva bedriften gjør og for hvem.' });
  if (!baseFacts.terms.projects && !/prosjekt|referans|case|portefølje/.test(body)) pushUnique(opp, { key:'projects', type:'cro', confidence:'middels', title:'Lite synlig prosjekt-/referansebevis', evidence:'Ingen tydelige prosjekt- eller referansesignaler funnet på de analyserte sidene.', impact:'Nye kunder får mindre dokumentasjon før de bestemmer seg for å ta kontakt.', action:'Løft frem ekte prosjekter, før/etter eller relevante caser nær CTA-ene.' });
  if (!baseFacts.terms.reviews && !/anmeld|omtale|kunde.{0,20}sier/.test(body)) pushUnique(opp, { key:'reviews', type:'trust', confidence:'middels', title:'Kundeomtaler er lite synlige', evidence:'Fant ingen tydelig omtale-/review-seksjon på de analyserte sidene.', impact:'Sosialt bevis mangler akkurat når en ny kunde vurderer risiko.', action:'Vis utvalgte ekte anmeldelser eller testimonials ved tjenester og kontaktpunkt.' });
  if (!baseFacts.terms.booking && !baseFacts.formCount) pushUnique(opp, { key:'cta', type:'cro', confidence:'høy', title:'Svak primær konverteringsvei', evidence:'Fant verken skjema eller tydelig booking/befaring/tilbuds-CTA på forsiden.', impact:'Besøkende må selv finne ut hva neste steg er.', action:'Bygg én tydelig hoved-CTA og gjenta den strategisk gjennom siden.' });
  if (!baseFacts.schema) pushUnique(opp, { key:'schema', type:'seo', confidence:'høy', title:'Ingen JSON-LD funnet', evidence:'Ingen application/ld+json funnet på forsiden.', impact:'Søkemotorer får mindre eksplisitt strukturert informasjon om virksomheten.', action:'Legg inn korrekt LocalBusiness/Organization og relevante schema-typer.' });
  if (!baseFacts.viewport) pushUnique(opp, { key:'viewport', type:'ux', confidence:'høy', title:'Mangler viewport-tag', evidence:'Ingen viewport-meta funnet.', impact:'Mobilopplevelsen kan bli feil eller uforutsigbar.', action:'Rett mobilgrunnlaget før andre CRO-tiltak.' });
  if ((baseFacts.imageCount || 0) < 3 && /bygg|frisør|barber|klinikk|restaurant|renhold|bil/.test(String(manual.industry||'').toLowerCase())) pushUnique(opp, { key:'visual-proof', type:'design', confidence:'middels', title:'Lite visuelt bevis på forsiden', evidence:'Forsiden inneholder '+baseFacts.imageCount+' bilde(r).', impact:'I en visuell/lokal tjenestebransje kan dette gjøre bedriften mindre konkret og mindre premium.', action:'Bruk ekte arbeid, mennesker og resultater som visuelt salgsbevis.' });

  const extra = manual.notes ? String(manual.notes).trim() : '';
  return { strengths: strengths.slice(0,4), opportunities: opp.slice(0,7), manualNote: extra };
}

function leadScore(research, manual = {}) {
  const opp = research.opportunities || [];
  let need = Math.min(10, 3 + opp.length * 0.9);
  const high = opp.filter(x => x.confidence === 'høy').length;
  need = Math.min(10, need + high * 0.25);
  const value = Number(manual.valueScore || 0) || (/bygg|tann|klinikk|rør|vvs|bil|entrepren/.test(String(manual.industry||'').toLowerCase()) ? 8 : 6);
  const reach = Number(manual.reachScore || 0) || 6;
  const fit = Math.min(10, 5 + opp.filter(x => ['seo','cro','design','trust'].includes(x.type)).length * 0.6);
  const total = Math.round(((need*0.35 + value*0.3 + fit*0.25 + reach*0.1) * 10)) / 10;
  return { need: Math.round(need*10)/10, value, fit: Math.round(fit*10)/10, reach, total, label: total >= 7.5 ? 'HOT' : total >= 6 ? 'WARM' : 'COLD' };
}

export async function researchWebsite(rawUrl, manual = {}) {
  const startUrl = normUrl(rawUrl);
  if (!startUrl) return { ok:false, error:'Ugyldig nettadresse' };
  const home = await fetchPage(startUrl);
  if (!home.ok || !home.html) return { ok:false, error:home.error || ('HTTP '+home.status), pages:[home], researchedAt:Date.now() };
  const homeFacts = pageFacts(home);
  const picks = chooseInternal(home.url, homeFacts);
  const pages = [{ url:home.url, status:home.status, ms:home.ms, facts:homeFacts }];
  for (const pick of picks) {
    const p = await fetchPage(pick.href, 7000);
    if (p.ok && p.html) pages.push({ url:p.url, status:p.status, ms:p.ms, facts:pageFacts(p) });
  }
  const derived = derive(homeFacts, pages, manual);
  const score = leadScore(derived, manual);
  return {
    ok:true,
    domain:hostOf(home.url),
    homepage:home.url,
    platform:homeFacts.platform,
    researchedAt:Date.now(),
    pages:pages.map(p => ({ url:p.url, status:p.status, ms:p.ms, title:p.facts.title, h1:p.facts.h1, h2:p.facts.h2.slice(0,6), imageCount:p.facts.imageCount, formCount:p.facts.formCount, schema:p.facts.schema })),
    measured:{ title:homeFacts.title, meta:homeFacts.meta, h1:homeFacts.h1, imageCount:homeFacts.imageCount, formCount:homeFacts.formCount, phoneLinks:homeFacts.telCount, emailLinks:homeFacts.mailCount, schema:homeFacts.schema, viewport:homeFacts.viewport, canonical:homeFacts.canonical, platform:homeFacts.platform },
    strengths:derived.strengths,
    opportunities:derived.opportunities,
    manualNote:derived.manualNote,
    score,
    disclaimer:'Automatisk research bygger kun på offentlig HTML fra et lite utvalg sider. Google-profil, omsetning, anmeldelser og rangering må legges inn/verifiseres separat før de brukes i salgstekst.'
  };
}
