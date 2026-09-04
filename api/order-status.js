// Verifies a Stripe Checkout session server-side and, if paid, marks the order
// received and returns a signed upload token the browser can use to upload
// photos. Keyed on our own order ref (client_reference_id) so photos land in
// the same folder the admin dashboard reads.

import Stripe from 'stripe';
import { signOrder } from '../lib/token.js';
import { markPaid, countPhotos } from '../lib/orders.js';

export default async function handler(req, res) {
  try {
    const sid = (req.query || {}).session_id;
    if (!sid) return res.status(400).json({ error: 'mangler session_id' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const s = await stripe.checkout.sessions.retrieve(sid);

    if (s.payment_status !== 'paid') return res.json({ paid: false });

    const ref = s.client_reference_id || s.metadata?.ref || s.id;
    const email = s.customer_details?.email || s.metadata?.email || '';
    const navn = s.metadata?.navn || '';

    // Durably mark paid (idempotent; the webhook does this too). This is the
    // safety net: even if the webhook is delayed or fails, landing on the
    // success page confirms payment so the order can never strand as a cart.
    try { await markPaid(ref, s.amount_total != null ? s.amount_total / 100 : null); } catch (e) { console.error('[order-status] markPaid', e.message); }

    const token = signOrder({
      orderId: ref,
      pkg: s.metadata?.pkg || '',
      navn,
      email,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 90, // 90 days (portal + upload window)
    });

    let photoCount = 0;
    try { photoCount = await countPhotos(ref); } catch (e) {}

    res.json({ paid: true, token, pkg: s.metadata?.pkg || '', ref, photoCount });
  } catch (e) {
    console.error('[order-status]', e);
    res.status(500).json({ error: 'Kunne ikke bekrefte betaling' });
  }
}
