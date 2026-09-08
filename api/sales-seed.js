// Webdesign DEMO leads for the sales engine. Every lead is flagged demo:true so
// it is EXCLUDED from the real result-goal metrics and clearly separated from
// real prospects. Admin-gated.
//   GET  /api/sales-seed?key=...          → insert/refresh demo leads
//   POST { op:'clear' }                    → remove all demo leads
//
// These are illustrative examples of the CRM shape for the webdesign offer.
// Addresses are generic role addresses so autosend-classification can be
// demonstrated safely. Real prospecting happens on non-demo leads.

import { listLeads, saveLead, deleteLead } from '../lib/leads.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

// segment: handverker | klinikk | restaurant | eiendom | renhold | annet
const DEMO = [
  { id: 'demo-web-1', demo: true, company: '(DEMO) Rogaland Rør & Varme', segment: 'handverker', location: 'Stavanger',
    website: 'example-ror.no', email: 'post@example-ror.no', phone: '', stage: 'klar', priorityScore: 88,
    websiteQuality: 'Ikke målt', mobileIssue: 'Antatt svak', topOpportunity: 'Uklar tjenesteside + ingen tydelig CTA',
    estValue: 16000, offer: '', nextAction: 'Kjør nettsidesjekk + send første e-post', nextActionDate: '2026-09-09',
    notes: 'Demo-eksempel: håndverker der én ny jobb dekker nettsideprisen.' },
  { id: 'demo-web-2', demo: true, company: '(DEMO) Klinikk Sola Tannhelse', segment: 'klinikk', location: 'Sola',
    website: 'example-tann.no', email: 'kontakt@example-tann.no', phone: '', stage: 'undersokt', priorityScore: 82,
    websiteQuality: 'Ikke målt', mobileIssue: 'Antatt svak', topOpportunity: 'Vanskelig å booke time på mobil',
    estValue: 16000, offer: '', nextAction: 'Kjør nettsidesjekk', nextActionDate: '2026-09-09',
    notes: 'Demo-eksempel: klinikk med gammel side.' },
  { id: 'demo-web-3', demo: true, company: '(DEMO) Frisør Nord Stavanger', segment: 'klinikk', location: 'Stavanger',
    website: 'example-frisor.no', email: 'hei@example-frisor.no', phone: '', stage: 'ny', priorityScore: 70,
    websiteQuality: 'Ikke målt', mobileIssue: 'Ukjent', topOpportunity: '', estValue: 7900, offer: '',
    nextAction: 'Undersøk + vurder Landing Page Sprint', nextActionDate: '2026-09-09',
    notes: 'Demo-eksempel: skjønnhet, mindre budsjett → landingsside.' },
  { id: 'demo-web-4', demo: true, company: '(DEMO) Restaurant Havnegata', segment: 'restaurant', location: 'Stavanger',
    website: 'example-havn.no', email: 'booking@example-havn.no', phone: '', stage: 'kontaktet', priorityScore: 76,
    websiteQuality: 'Ikke målt', mobileIssue: 'Antatt svak', topOpportunity: 'Meny og bordbestilling gjemt bort',
    estValue: 16000, offer: '', nextAction: 'Oppfølging dag 3', nextActionDate: '2026-09-11',
    notes: 'Demo-eksempel: restaurant, kontaktet.' },
  { id: 'demo-web-5', demo: true, company: '(DEMO) Preikestolen Hytteutleie', segment: 'eiendom', location: 'Jørpeland',
    website: 'example-hytte.no', email: 'post@example-hytte.no', phone: '', stage: 'svar', priorityScore: 90,
    websiteQuality: 'Ikke målt', mobileIssue: 'Antatt svak', topOpportunity: 'Ingen tydelig bookinghandling',
    estValue: 16000, offer: '', nextAction: 'Book 15-min samtale', nextActionDate: '2026-09-10',
    notes: 'Demo-eksempel: hytteutleie som har svart — varm.' },
  { id: 'demo-web-6', demo: true, company: '(DEMO) Vestland Renhold AS', segment: 'renhold', location: 'Sandnes',
    website: '', email: 'firmapost@example-renhold.no', phone: '', stage: 'ny', priorityScore: 64,
    websiteQuality: 'Ingen nettside', mobileIssue: '—', topOpportunity: 'Har ingen nettside i det hele tatt',
    estValue: 7900, offer: '', nextAction: 'Undersøk', nextActionDate: '2026-09-09',
    notes: 'Demo-eksempel: mangler nettside helt.' },
  { id: 'demo-web-7', demo: true, company: '(DEMO) Jæren Elektro', segment: 'handverker', location: 'Bryne',
    website: 'example-elektro.no', email: 'ola.nordmann@example-elektro.no', phone: '51 00 00 00', stage: 'undersokt', priorityScore: 72,
    websiteQuality: 'Ikke målt', mobileIssue: 'Ukjent', topOpportunity: '', estValue: 16000, offer: '',
    nextAction: 'Personlig adresse → ring eller bruk kontaktskjema', nextActionDate: '2026-09-09',
    notes: 'Demo-eksempel: KUN personlig adresse funnet → autosend blokkeres, manuell kanal.' },
  { id: 'demo-web-8', demo: true, company: '(DEMO) Fjord Eiendomsmegling', segment: 'eiendom', location: 'Stavanger',
    website: 'example-megler.no', email: 'post@example-megler.no', phone: '', stage: 'tilbud', priorityScore: 85,
    websiteQuality: '62/100', mobileIssue: 'OK', topOpportunity: 'Treg forside, svak lokal SEO',
    estValue: 16000, offer: 'sprint', agreedPriceKr: 16000, startPaidKr: 0,
    nextAction: 'Følg opp tilbud + send betalingslenke', nextActionDate: '2026-09-15',
    notes: 'Demo-eksempel: tilbud sendt, venter oppstartsbetaling.' },
];

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const existing = await listLeads();
    if (req.method === 'POST' && (req.body || {}).op === 'clear') {
      let removed = 0;
      for (const l of existing) if (l.demo) { await deleteLead(l.id); removed++; }
      return res.json({ ok: true, removed });
    }
    const byId = {}; existing.forEach((l) => { byId[l.id] = l; });
    let created = 0, kept = 0;
    for (const d of DEMO) {
      if (byId[d.id]) { kept++; continue; }
      await saveLead(Object.assign({ source: 'demo' }, d));
      created++;
    }
    res.json({ ok: true, created, kept, total: DEMO.length,
      message: 'La inn ' + created + ' demo-leads (' + kept + ' fantes fra før). Demo teller IKKE mot 16 000-målet.' });
  } catch (e) {
    console.error('[sales-seed]', e);
    res.status(500).json({ error: 'Kunne ikke legge inn demo-leads' });
  }
}
