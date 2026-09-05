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
      // Only expose the final once it's approved & delivered. Never expose
      // internal generated shots or admin files.
      final: (o.final && o.final.approved) ? {
        version: o.final.version,
        poster: o.final.poster && o.final.poster.url || null,
        preview: o.final.preview && o.final.preview.url || null,
        durationSec: o.final.durationSec || null,
        width: o.final.width || null,
        height: o.final.height || null,
        deliveredAt: o.final.deliveredAt || null,
      } : null,
      revisionsRemaining: Math.max(0, (typeof o.revisionsIncluded === 'number' ? o.revisionsIncluded : 1) - ((o.revisions || []).length)),
      revisionPending: !!(o.revisions || []).some((r) => !r.handled),
    });
  } catch (e) {
    console.error('[order-view]', e);
    res.status(500).json({ error: 'Kunne ikke hente bestillingen' });
  }
}
