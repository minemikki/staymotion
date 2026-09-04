// Admin CRM API. Protected by ADMIN_KEY (same as admin-orders).
//   GET  /api/admin-leads?key=...              → list all leads
//   POST /api/admin-leads { lead }             → create/update a lead
//   POST /api/admin-leads { op:'delete', id }  → delete a lead

import { listLeads, saveLead, deleteLead } from '../lib/leads.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.op === 'delete') {
        if (!body.id) return res.status(400).json({ error: 'mangler id' });
        await deleteLead(body.id);
        return res.json({ ok: true });
      }
      if (!body.lead) return res.status(400).json({ error: 'mangler lead' });
      const saved = await saveLead(body.lead);
      return res.json({ ok: true, lead: saved });
    }
    const leads = await listLeads();
    res.json({ leads });
  } catch (e) {
    console.error('[admin-leads]', e);
    res.status(500).json({ error: 'Kunne ikke hente leads' });
  }
}
