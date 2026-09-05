// Customer requests a change on the delivered video. Token-gated; notifies the
// owner and moves the order back into production.
//   POST /api/order-revision  { ref, t, text }
import { verifyOrder } from '../lib/token.js';
import { requestRevision } from '../lib/production.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const { ref, t } = b;
    if (!ref || !t) return res.status(400).json({ error: 'mangler ref/token' });
    const data = verifyOrder(t);
    if (!data || data.orderId !== ref) return res.status(403).json({ error: 'ugyldig lenke' });
    const r = await requestRevision({ orderId: ref, text: b.text, host: req.headers.host });
    res.json({ ok: true, ...r });
  } catch (e) {
    console.error('[order-revision]', e);
    res.status(500).json({ error: e.message || 'Kunne ikke sende forespørselen' });
  }
}
