// Stripe webhook — the reliable "payment happened" signal for both flows:
//   checkout.session.completed  → card button (hosted Checkout)
//   payment_intent.succeeded    → Apple Pay / Google Pay express button
// On payment we mark the order received, email the owner the full details, and
// email the customer a link to upload their photos.

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

async function fulfil(req, { ref, email, navn, amountKr, uploadUrl }) {
  const owner = process.env.OWNER_EMAIL || 'hello@staymotion.no';
  const origin = `https://${req.headers.host}`;

  let order = null;
  try { order = await setStatus(ref, 'ubehandlet'); } catch (e) { console.error('[stripe-webhook] setStatus', e.message); }

  const frist = order?.deadline ? new Date(order.deadline).toLocaleString('no-NO') : '—';
  await sendEmail({
    to: owner,
    subject: `Ny betalt bestilling — ${navn || email || 'kunde'}`,
    html: `<h2>Ny betalt bestilling</h2>
      <p><b>${navn || 'Ukjent navn'}</b> — ${email || 'ukjent e-post'}<br>
      Pakke: <b>${order?.pakke || '?'}</b><br>
      Format: ${order?.format || '9:16'}<br>
      Beløp: ${(amountKr != null ? amountKr : (order?.amountKr || 0)).toLocaleString('no-NO')} kr<br>
      Frist: ${frist}<br>
      Ref: ${ref}</p>
      ${order?.melding ? `<p><b>Melding fra kunde:</b><br>${String(order.melding).replace(/</g, '&lt;')}</p>` : ''}
      <p>Alt samles i <a href="${origin}/admin.html">admin-panelet</a>.</p>`,
  });

  if (email) {
    await sendEmail({
      to: email,
      subject: 'Takk for bestillingen — last opp bildene dine',
      html: `<h2>Takk for bestillingen${navn ? ', ' + navn.split(' ')[0] : ''}!</h2>
        <p>Har du ikke lastet opp bildene ennå, kan du gjøre det her:</p>
        <p><a href="${uploadUrl}">Last opp bildene</a></p>
        <p>— StayMotion</p>`,
    });
  }
}

export default async function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const buf = await rawBody(req);
    event = stripe.webhooks.constructEvent(buf, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('[stripe-webhook] signature', e.message);
    return res.status(400).send('Webhook Error: ' + e.message);
  }

  const origin = `https://${req.headers.host}`;
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      const ref = s.client_reference_id || s.metadata?.ref || s.id;
      await fulfil(req, {
        ref,
        email: s.customer_details?.email || s.metadata?.email,
        navn: s.metadata?.navn || '',
        amountKr: s.amount_total != null ? s.amount_total / 100 : null,
        uploadUrl: `${origin}/takk.html?provider=stripe&ref=${ref}&session_id=${s.id}`,
      });
    } else if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      // Only the on-page express flow; Checkout's own PI is handled above.
      if (pi.metadata?.src === 'express') {
        const ref = pi.metadata?.ref || pi.id;
        await fulfil(req, {
          ref,
          email: pi.receipt_email || pi.metadata?.email,
          navn: pi.metadata?.navn || '',
          amountKr: (pi.amount_received != null ? pi.amount_received : pi.amount) / 100,
          uploadUrl: `${origin}/takk.html?provider=stripe&ref=${ref}&payment_intent=${pi.id}`,
        });
      }
    }
  } catch (e) {
    console.error('[stripe-webhook] fulfil', e);
  }

  res.json({ received: true });
}
