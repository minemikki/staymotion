// Starts an order before payment so the customer can upload photos right on
// the order page. Saves the order (status "avventer") and returns a short-lived
// upload token bound to the order ref. Payment (checkout) reuses the same ref,
// so the pre-uploaded photos stay attached to the paid order.

import { resolvePackage } from '../lib/packages.js';
import { saveOrder, deadlineFor, newRef } from '../lib/orders.js';
import { signOrder } from '../lib/token.js';

export default async function handler(req, res) {
  try {
    const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const p = resolvePackage(src.pkg, src.express, src.both);
    if (!p) return res.status(400).json({ error: 'Ukjent pakke' });
    if (!src.navn || !src.email) return res.status(400).json({ error: 'Mangler navn eller e-post' });

    const fmt = p.both ? '9:16 + 16:9' : (src.fmt || '9:16');
    const created = Date.now();
    const ref = newRef();

    await saveOrder({
      id: ref,
      navn: String(src.navn).slice(0, 120),
      email: String(src.email).slice(0, 160),
      melding: String(src.melding || '').slice(0, 600),
      pkg: p.id,
      pakke: p.label,
      format: fmt,
      express: p.express,
      both: p.both,
      amountKr: p.amountKr,
      created,
      deadline: deadlineFor(p.id, p.express, created),
      status: 'avventer',
    });

    const token = signOrder({
      orderId: ref, pkg: p.id,
      navn: String(src.navn).slice(0, 120), email: String(src.email).slice(0, 160),
      exp: created + 1000 * 60 * 60 * 24 * 2, // 2 days to pay + upload
    });

    res.json({ ok: true, ref, token });
  } catch (e) {
    console.error('[order-init]', e);
    res.status(500).json({ error: 'Kunne ikke starte bestilling' });
  }
}
