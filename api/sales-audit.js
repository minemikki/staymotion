// Website analysis for a lead's public site. Admin-gated.
//   POST /api/sales-audit { url, leadId? }
// Measures the public page (single GET) and returns measured facts + an
// assessment. If leadId is given, the summary/opportunity is written back onto
// the lead (websiteQuality, mobileIssue, topOpportunity) so the CRM stays real.
//
// Simple per-instance rate limit so the endpoint can't be used to hammer sites.

import { auditSite } from '../lib/audit.js';
import { listLeads, saveLead } from '../lib/leads.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

const hits = [];
function rateLimited(max = 20, windowMs = 60000) {
  const now = Date.now();
  while (hits.length && now - hits[0] > windowMs) hits.shift();
  if (hits.length >= max) return true;
  hits.push(now);
  return false;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Bruk POST' });
  if (rateLimited()) return res.status(429).json({ error: 'For mange forespørsler — vent litt.' });
  try {
    const { url, leadId } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Mangler nettadresse' });

    const result = await auditSite(url);

    // Persist the honest summary back onto the lead, if asked.
    if (leadId) {
      try {
        const leads = await listLeads();
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
          const a = result.assessment || {};
          lead.websiteQuality = a.score != null ? a.score + '/100' : 'Ikke målt';
          const mob = (a.points || []).find((p) => p.area === 'Mobilopplevelse');
          lead.mobileIssue = mob && mob.verdict !== 'god' ? mob.note : (mob ? 'OK' : 'Ukjent');
          lead.topOpportunity = (a.opportunities && a.opportunities[0]) ? a.opportunities[0].note : (a.summary || '');
          lead.auditAt = Date.now();
          await saveLead(lead);
        }
      } catch (e) { console.error('[sales-audit] lead write', e.message); }
    }

    res.json({ ok: true, audit: result });
  } catch (e) {
    console.error('[sales-audit]', e);
    res.status(500).json({ error: 'Kunne ikke analysere nettsiden' });
  }
}
