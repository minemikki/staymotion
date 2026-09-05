// Ingest a Higgsfield (or any) generation straight into a StayMotion order:
// server pulls the remote file, stores a master + web preview + poster in Blob,
// and records it on the order. This is THE standard path — no manual download.
//
//   POST /api/ingest-generation
//   auth: ?key=<ADMIN_KEY> or x-admin-key, OR Authorization: Bearer <MCP_TOKEN>
//   body: { orderId, url, shotId?, shotLabel?, take?, model? }

import { ingestGeneration } from '../lib/production.js';

export const config = { maxDuration: 300 };

function authed(req) {
  const adminKey = process.env.ADMIN_KEY;
  const mcp = process.env.MCP_TOKEN;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  if (adminKey && given === adminKey) return true;
  const auth = req.headers['authorization'] || '';
  if (mcp && auth === 'Bearer ' + mcp) return true;
  return false;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    if (!b.orderId || !b.url) return res.status(400).json({ error: 'mangler orderId/url' });
    const r = await ingestGeneration({
      orderId: b.orderId, url: b.url,
      shotId: b.shotId, shotLabel: b.shotLabel, take: b.take, model: b.model,
    });
    res.json({ ok: true, ...r });
  } catch (e) {
    console.error('[ingest-generation]', e);
    res.status(500).json({ error: e.message || 'Ingest feilet' });
  }
}
