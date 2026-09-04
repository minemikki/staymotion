// Admin API for the order dashboard. Protected by ADMIN_KEY.
//   GET  /api/admin-orders?key=...            → list all orders
//   POST /api/admin-orders  { id, status }    → update an order's status
// (key sent as ?key= or x-admin-key header)

import { listOrders, setStatus, markPaid } from '../lib/orders.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false; // no key configured → locked
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.id) return res.status(400).json({ error: 'mangler id' });
      // Manually confirm a payment (webhook miss / recovery).
      if (body.paid) {
        const updated = await markPaid(body.id, body.amountKr != null ? body.amountKr : null);
        return res.json({ ok: true, order: updated });
      }
      if (!body.status) return res.status(400).json({ error: 'mangler status' });
      const updated = await setStatus(body.id, body.status);
      return res.json({ ok: true, order: updated });
    }
    const orders = await listOrders();
    res.json({ orders });
  } catch (e) {
    console.error('[admin-orders]', e);
    res.status(500).json({ error: 'Kunne ikke hente bestillinger' });
  }
}
