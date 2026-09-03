// Stripe Checkout — creates a hosted payment session and redirects to it.
// Usage (GET link or POST form): /api/checkout?pkg=signatur&express=1&email=...

import Stripe from 'stripe';
import { resolvePackage } from '../lib/packages.js';

export default async function handler(req, res) {
  try {
    const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const p = resolvePackage(src.pkg, src.express);
    if (!p) return res.status(400).json({ error: 'Ukjent pakke' });

    // Graceful fallback: no Stripe key yet → let the customer order by email
    // instead of showing a broken checkout.
    if (!process.env.STRIPE_SECRET_KEY) {
      const mail = 'mailto:hello@staymotion.no?subject=' +
        encodeURIComponent('Bestilling: ' + p.label) +
        '&body=' + encodeURIComponent('Hei! Jeg vil bestille ' + p.label + ' (' + p.amountKr + ' kr).');
      res.writeHead(303, { Location: mail });
      return res.end();
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: src.email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'nok',
          unit_amount: p.amountMinor,
          product_data: { name: 'StayMotion — ' + p.label },
        },
      }],
      metadata: { pkg: p.id, express: String(p.express) },
      success_url: `${origin}/takk.html?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bestill.html?pkg=${p.id}`,
    });

    res.writeHead(303, { Location: session.url });
    res.end();
  } catch (e) {
    console.error('[checkout]', e);
    res.status(500).json({ error: 'Kunne ikke starte betaling' });
  }
}
