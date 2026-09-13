// Admin CRM API. Protected by ADMIN_KEY (same as admin-orders).
//   GET  /api/admin-leads?key=...              → list all leads
//   POST /api/admin-leads { lead }             → create/update a lead
//   POST /api/admin-leads { op:'delete', id }  → delete a lead
//   POST /api/admin-leads { op:'fresh-start', confirm:'SLETT_ALLE_GAMLE_LEADS' }
//        → one-time purge of CRM leads + outreach sequences. Suppression/sendlog are preserved.

import { listLeads, saveLead, deleteLead } from '../lib/leads.js';
import { list, del, put } from '@vercel/blob';

const RESET_MARKER = 'sales/reset/fresh-start-2026-09-13.json';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    out.push(...(page.blobs || []));
    cursor = page.cursor || undefined;
  } while (cursor);
  return out;
}

async function resetAlreadyDone() {
  const { blobs } = await list({ prefix: RESET_MARKER, limit: 1 });
  return blobs.some((b) => b.pathname === RESET_MARKER);
}

async function freshStart() {
  if (await resetAlreadyDone()) {
    return { ok: true, alreadyDone: true, leadsDeleted: 0, sequencesDeleted: 0 };
  }

  const [leadBlobs, seqBlobs] = await Promise.all([
    listAll('leads/'),
    listAll('sales/seq/'),
  ]);

  const leadUrls = leadBlobs.filter((b) => b.pathname.endsWith('.json')).map((b) => b.url);
  const seqUrls = seqBlobs.filter((b) => b.pathname.endsWith('.json')).map((b) => b.url);

  if (leadUrls.length) await del(leadUrls);
  if (seqUrls.length) await del(seqUrls);

  const result = {
    ok: true,
    alreadyDone: false,
    leadsDeleted: leadUrls.length,
    sequencesDeleted: seqUrls.length,
    completedAt: Date.now(),
  };

  await put(RESET_MARKER, JSON.stringify(result), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: 0,
  });

  return result;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.op === 'fresh-start') {
        if (body.confirm !== 'SLETT_ALLE_GAMLE_LEADS') {
          return res.status(400).json({ error: 'Mangler korrekt bekreftelse' });
        }
        return res.json(await freshStart());
      }
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
    res.status(500).json({ error: 'Kunne ikke hente eller oppdatere leads' });
  }
}
