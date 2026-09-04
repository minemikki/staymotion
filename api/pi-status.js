// Verifies a PaymentIntent (Apple Pay / Google Pay express flow) after the
// return redirect and, if paid, marks the order received and returns a signed
// upload token so the customer can add photos.

import Stripe from 'stripe';
import { signOrder } from '../lib/token.js';
import { setStatus } from '../lib/orders.js';

export default async function handler(req, res) {
  try {
    const pi = (req.query || {}).pi;
    if (!pi) return res.status(400).json({ error: 'mangler pi' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const p = await stripe.paymentIntents.retrieve(pi);
    if (p.status !== 'succeeded') return res.json({ paid: false });

    const ref = p.metadata?.ref || pi;
    const email = p.receipt_email || p.metadata?.email || '';
    const navn = p.metadata?.navn || '';

    try { await setStatus(ref, 'ubehandlet'); } catch (e) { console.error('[pi-status] setStatus', e.message); }

    const token = signOrder({
      orderId: ref, pkg: p.metadata?.pkg || '', navn, email,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    res.json({ paid: true, token, ref, pkg: p.metadata?.pkg || '' });
  } catch (e) {
    console.error('[pi-status]', e);
    res.status(500).json({ error: 'Kunne ikke bekrefte betaling' });
  }
}
