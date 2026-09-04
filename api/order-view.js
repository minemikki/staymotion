// Customer portal data. Requires a valid signed token whose orderId matches
// the requested ref, so only the customer with the emailed link can see it.

import { verifyOrder } from '../lib/token.js';
import { getOrderView } from '../lib/orders.js';

export default async function handler(req, res) {
  try {
    const { ref, t } = req.query || {};
    if (!ref || !t) return res.status(400).json({ error: 'mangler ref eller token' });

    const data = verifyOrder(t);
    if (!data || data.orderId !== ref) return res.status(403).json({ error: 'ugyldig lenke' });

    const o = await getOrderView(ref);
    res.json({
      ok: true,
      ref,
      navn: o.navn || o.kunde || '',
      pkg: o.pakke || o.pkg || '',
      format: o.format || '',
      status: o.status || 'ubehandlet',
      created: o.created || null,
      deadline: o.deadline || null,
      melding: o.melding || '',
      notes: Array.isArray(o.notes) ? o.notes : [],
      replies: Array.isArray(o.replies) ? o.replies : [],
      photos: o.photos || [],
      deliverables: o.deliverables || [],
    });
  } catch (e) {
    console.error('[order-view]', e);
    res.status(500).json({ error: 'Kunne ikke hente bestillingen' });
  }
}
