// Stripe Checkout — creates a hosted card-payment session and redirects to it.
// Usage (GET link or POST form): /api/checkout?pkg=signatur&express=1&email=...
// The order is recorded up front (status "avventer") so name / message /
// package are saved even before payment confirms.

import Stripe from 'stripe';
import { resolvePackage } from '../lib/packages.js';
import { saveOrder, deadlineFor } from '../lib/orders.js';

export default async function handler(req, res) {
  try {
    const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const p = resolvePackage(src.pkg, src.express, src.both);
    if (!p) return res.status(400).json({ error: 'Ukjent pakke' });
    const fmt = p.both ? '9:16 + 16:9' : (src.fmt || '9:16');

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
    const created = Date.now();
    const ref = `sm-${p.id}-${created}-${Math.random().toString(36).slice(2, 8)}`;

    // Record the order before redirecting to payment.
    try {
      await saveOrder({
        id: ref,
        navn: String(src.navn || '').slice(0, 120),
        email: String(src.email || '').slice(0, 160),
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
    } catch (e) { console.error('[checkout] saveOrder', e.message); }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: src.email || undefined,
      client_reference_id: ref,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'nok',
          unit_amount: p.amountMinor,
          product_data: { name: 'StayMotion — ' + p.label },
        },
      }],
      metadata: {
        ref, pkg: p.id, express: String(p.express), both: String(p.both),
        format: fmt, navn: String(src.navn || '').slice(0, 120),
      },
      success_url: `${origin}/takk.html?provider=stripe&ref=${ref}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bestill.html?pkg=${p.id}`,
    });

    res.writeHead(303, { Location: session.url });
    res.end();
  } catch (e) {
    console.error('[checkout]', e);
    res.status(500).json({ error: 'Kunne ikke starte betaling' });
  }
}
