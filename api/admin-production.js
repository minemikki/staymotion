// Admin actions on an order's production media. Protected by ADMIN_KEY.
//   POST /api/admin-production
//     { orderId, action:'approve',  shotId, take }
//     { orderId, action:'delete',   shotId, take }
//     { orderId, action:'status',   shotId, status }

import { approveTake, deleteTake, setShotStatus } from '../lib/production.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    if (!b.orderId || !b.action) return res.status(400).json({ error: 'mangler orderId/action' });
    let r;
    if (b.action === 'approve') r = await approveTake(b.orderId, b.shotId, b.take);
    else if (b.action === 'delete') r = await deleteTake(b.orderId, b.shotId, b.take);
    else if (b.action === 'status') r = await setShotStatus(b.orderId, b.shotId, b.status);
    else return res.status(400).json({ error: 'ukjent action' });
    res.json({ ok: true, ...r });
  } catch (e) {
    console.error('[admin-production]', e);
    res.status(500).json({ error: e.message || 'Handling feilet' });
  }
}
