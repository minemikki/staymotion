// Verifies a Stripe Checkout session server-side and, if paid, returns a
// signed upload token the browser can use to upload photos.

import Stripe from 'stripe';
import { signOrder } from '../lib/token.js';

export default async function handler(req, res) {
  try {
    const sid = (req.query || {}).session_id;
    if (!sid) return res.status(400).json({ error: 'mangler session_id' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const s = await stripe.checkout.sessions.retrieve(sid);

    if (s.payment_status !== 'paid') return res.json({ paid: false });

    const token = signOrder({
      orderId: s.id,
      pkg: s.metadata?.pkg || '',
      email: s.customer_details?.email || '',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.json({ paid: true, token, pkg: s.metadata?.pkg || '' });
  } catch (e) {
    console.error('[order-status]', e);
    res.status(500).json({ error: 'Kunne ikke bekrefte betaling' });
  }
}
