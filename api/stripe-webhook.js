// Stripe webhook — the reliable "payment happened" signal.
// On a completed checkout we mark the order received, email the owner the full
// order details, and email the customer a link to upload their photos.
// Configure the endpoint + signing secret in the Stripe dashboard and set
// STRIPE_WEBHOOK_SECRET.

import Stripe from 'stripe';
import { sendEmail } from '../lib/email.js';
import { setStatus } from '../lib/orders.js';

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
    const email = s.customer_details?.email || s.metadata?.email;
    const navn = s.metadata?.navn || '';
    const ref = s.client_reference_id || s.metadata?.ref || s.id;
    const origin = `https://${req.headers.host}`;
    const owner = process.env.OWNER_EMAIL || 'hello@staymotion.no';

    // Mark received and pull the full stored order (name, message, deadline …).
    let order = null;
    try { order = await setStatus(ref, 'ubehandlet'); } catch (e) { console.error('[stripe-webhook] setStatus', e.message); }

    const frist = order?.deadline ? new Date(order.deadline).toLocaleString('no-NO') : '—';
    await sendEmail({
      to: owner,
      subject: `Ny betalt bestilling — ${navn || email || 'kunde'}`,
      html: `<h2>Ny betalt bestilling</h2>
        <p><b>${navn || 'Ukjent navn'}</b> — ${email || 'ukjent e-post'}<br>
        Pakke: <b>${order?.pakke || s.metadata?.pkg || '?'}</b><br>
        Format: ${order?.format || s.metadata?.format || '9:16'}<br>
        Beløp: ${(s.amount_total / 100).toLocaleString('no-NO')} kr<br>
        Frist: ${frist}<br>
        Ref: ${ref}</p>
        ${order?.melding ? `<p><b>Melding fra kunde:</b><br>${String(order.melding).replace(/</g, '&lt;')}</p>` : ''}
        <p>Kunden laster opp bildene sine nå. Alt samles i <a href="${origin}/admin.html">admin-panelet</a>.</p>`,
    });

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Takk for bestillingen — last opp bildene dine',
        html: `<h2>Takk for bestillingen${navn ? ', ' + navn.split(' ')[0] : ''}!</h2>
          <p>Siste steg: last opp bildene du vil vi skal jobbe med.</p>
          <p><a href="${origin}/takk.html?provider=stripe&ref=${ref}&session_id=${s.id}">Last opp bildene her</a></p>
          <p>— StayMotion</p>`,
      });
    }
  }

  res.json({ received: true });
}
