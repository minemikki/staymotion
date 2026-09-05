// Token-gated download for the customer's own final video. Verifies the signed
// order token, then 302-redirects to the stored Blob URL. Only ever serves the
// final delivery for THIS order — no storage browsing, no other orders.
//   GET /api/order-download?ref=<id>&t=<token>&which=master|preview
import { verifyOrder } from '../lib/token.js';
import { getOrderView } from '../lib/orders.js';

export default async function handler(req, res) {
  try {
    const { ref, t, which } = req.query || {};
    if (!ref || !t) return res.status(400).json({ error: 'mangler ref/token' });
    const data = verifyOrder(t);
    if (!data || data.orderId !== ref) return res.status(403).json({ error: 'ugyldig lenke' });
    const o = await getOrderView(ref);
    if (!o.final || !o.final.approved) return res.status(404).json({ error: 'ingen levert video' });
    const target = which === 'preview' ? o.final.preview : o.final.master;
    if (!target || !target.url) return res.status(404).json({ error: 'fil mangler' });
    const loc = (which === 'preview') ? target.url : (target.dlUrl || target.url);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', loc);
    return res.status(302).end();
  } catch (e) {
    console.error('[order-download]', e);
    return res.status(500).json({ error: 'Kunne ikke hente filen' });
  }
}
