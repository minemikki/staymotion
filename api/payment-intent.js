// Creates a PaymentIntent for the on-page Apple Pay / Google Pay express
// button. Records the order (status "avventer"), reusing the ref from
// order-init when photos were already uploaded, so everything stays attached.

import Stripe from 'stripe';
import { resolvePackage } from '../lib/packages.js';
import { saveOrder, deadlineFor, newRef } from '../lib/orders.js';

export default async function handler(req, res) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Betaling ikke konfigurert' });
    const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const p = resolvePackage(src.pkg, src.express, src.both);
    if (!p) return res.status(400).json({ error: 'Ukjent pakke' });

    const fmt = p.both ? '9:16 + 16:9' : (src.fmt || '9:16');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const created = Date.now();
    const ref = (typeof src.ref === 'string' && /^SM-[A-Z0-9]{6}$/i.test(src.ref))
      ? src.ref
      : newRef();

    try {
      await saveOrder({
        id: ref,
        navn: String(src.navn || '').slice(0, 120),
        email: String(src.email || '').slice(0, 160),
        melding: String(src.melding || '').slice(0, 600),
        pkg: p.id, pakke: p.label, format: fmt,
        express: p.express, both: p.both, amountKr: p.amountKr,
        created, deadline: deadlineFor(p.id, p.express, created),
        status: 'avventer',
      });
    } catch (e) { console.error('[payment-intent] saveOrder', e.message); }

    const pi = await stripe.paymentIntents.create({
      amount: p.amountMinor,
      currency: 'nok',
      automatic_payment_methods: { enabled: true },
      receipt_email: src.email || undefined,
      description: 'StayMotion — ' + p.label,
      metadata: {
        ref, pkg: p.id, navn: String(src.navn || '').slice(0, 120),
        email: String(src.email || '').slice(0, 160),
        format: fmt, both: String(p.both), express: String(p.express), src: 'express',
      },
    });

    res.json({ clientSecret: pi.client_secret, ref });
  } catch (e) {
    console.error('[payment-intent]', e);
    res.status(500).json({ error: 'Kunne ikke starte betaling' });
  }
}
