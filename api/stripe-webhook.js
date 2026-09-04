// Stripe webhook — the reliable "payment happened" signal.
// On a completed checkout we email the owner (new order) and the customer
// (link to upload their photos). Configure the endpoint + signing secret in
// the Stripe dashboard and set STRIPE_WEBHOOK_SECRET.

import Stripe from 'stripe';
import { sendEmail } from '../lib/email.js';

// Stripe needs the raw request body to verify the signature.
export const config = { api: { bodyParser: false } };

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const buf = await rawBody(req);
    event = stripe.webhooks.constructEvent(
      buf,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error('[stripe-webhook] signature', e.message);
    return res.status(400).send('Webhook Error: ' + e.message);
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const email = s.customer_details?.email;
    const origin = `https://${req.headers.host}`;
    const owner = process.env.OWNER_EMAIL || 'hello@staymotion.no';

    await sendEmail({
      to: owner,
      subject: 'Ny bestilling — StayMotion',
      html: `<h2>Ny betalt bestilling</h2>
        <p>Pakke: <b>${s.metadata?.pkg || '?'}</b>${s.metadata?.express === 'true' ? ' + Express' : ''}${s.metadata?.both === 'true' ? ' + begge formater' : ''}<br>
        Format: ${s.metadata?.format || '9:16'}<br>
        Kunde: ${email || 'ukjent'}<br>
        Beløp: ${(s.amount_total / 100).toLocaleString('no-NO')} kr</p>
        <p>Kunden får en lenke til å laste opp bildene. Du varsles på nytt når bildene er lastet opp.</p>`,
    });

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Takk for bestillingen — last opp bildene dine',
        html: `<h2>Takk for bestillingen!</h2>
          <p>Siste steg: last opp bildene du vil vi skal jobbe med.</p>
          <p><a href="${origin}/takk.html?provider=stripe&session_id=${s.id}">Last opp bildene her</a></p>
          <p>— StayMotion</p>`,
      });
    }
  }

  res.json({ received: true });
}
