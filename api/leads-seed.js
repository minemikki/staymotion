// One-time insert of the three prospects that have a concept out and are
// waiting for a reply. Concept URLs are the ones actually sent to them.
// Admin-gated, idempotent (fixed ids), and it never overwrites a lead you
// have since edited — it only fills in what is still blank.
//
//   GET /api/leads-seed?key=...        → insert the three
//   GET /api/leads-seed?key=...&force  → overwrite them back to these values
//
// Only details confirmed from the businesses' own pages are filled in.
// Contact fields left empty are ones we have not verified — fill them in
// yourself rather than guessing.

import { listLeads, saveLead } from '../lib/leads.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

const FOLLOW_UP = '2026-09-16';

const SEED = [
  {
    id: 'lead-lepere',
    company: 'Le Père Brasserie',
    segment: 'restaurant',
    location: 'Stavanger',
    website: 'lepere.no',
    email: 'kontakt@lepere.no',
    phone: '972 53 559',
    stage: 'tilbud',
    offer: 'sprint',
    conceptUrl: 'https://lapere.netlify.app/',
    priorityScore: 90,
    estValue: 16000,
    nextAction: 'Følg opp hvis ingen svar',
    nextActionDate: FOLLOW_UP,
    notes: 'Konsept sendt, venter på svar. Vinklet på sterkere førsteinntrykk på mobil og enklere vei til meny, åpningstider og reservasjon. Fransk brasserie ved Breiavatnet, Kongsgata 45A. Kjøkkensjef Hugo Lecreff.',
  },
  {
    id: 'lead-gimi',
    company: 'GIMI',
    segment: 'restaurant',
    location: 'Stavanger',
    website: '',
    email: '',
    phone: '',
    stage: 'tilbud',
    offer: 'sprint',
    conceptUrl: 'https://gimistvg.netlify.app/',
    priorityScore: 90,
    estValue: 16000,
    nextAction: 'Følg opp hvis ingen svar',
    nextActionDate: FOLLOW_UP,
    notes: 'Konsept sendt, venter på svar. Vinklet på historien deres: brødrene Fredrik og Daniel van Opdorp fra Hot Shop, levende ild, det gamle hermetikklaboratoriet. Konseptet har ekte meny, «gi meg noe»-funksjon og NO/EN. Fyll inn e-post og telefon.',
  },
  {
    id: 'lead-247-trening',
    company: '24/7 Treningssenter Mariero',
    segment: 'annet',
    location: 'Mariero, Stavanger',
    website: '',
    email: '',
    phone: '',
    stage: 'tilbud',
    offer: '',
    conceptUrl: 'https://treningmariero.netlify.app/',
    priorityScore: 85,
    estValue: 16000,
    nextAction: 'Følg opp hvis ingen svar',
    nextActionDate: FOLLOW_UP,
    notes: 'Konsept sendt, venter på svar. Vinklet på tydeligere vei fra besøk til medlemskap, og kobling mot eksisterende booking- og medlemssystem. Fyll inn e-post og telefon.',
  },
];

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const force = req.query && 'force' in req.query;
    const existing = await listLeads();
    const byId = new Map(existing.map((l) => [l.id, l]));
    const result = [];
    for (const seed of SEED) {
      const prev = byId.get(seed.id);
      if (prev && !force) {
        // Keep whatever you have typed in; only add fields that are still blank.
        const merged = { ...seed, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== '' && v != null)) };
        await saveLead(merged);
        result.push({ id: seed.id, company: seed.company, action: 'oppdatert' });
      } else {
        await saveLead({ ...seed });
        result.push({ id: seed.id, company: seed.company, action: prev ? 'overskrevet' : 'lagt inn' });
      }
    }
    res.json({ ok: true, leads: result });
  } catch (e) {
    console.error('[leads-seed]', e);
    res.status(500).json({ error: 'Kunne ikke legge inn leads' });
  }
}
