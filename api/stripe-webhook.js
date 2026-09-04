// Stripe webhook — the reliable "payment happened" signal for both flows:
//   checkout.session.completed  → card button (hosted Checkout)
//   payment_intent.succeeded    → Apple Pay / Google Pay express button
// On payment we mark the order received, email the owner the full details, and
// email the customer a link to upload their photos.

import Stripe from 'stripe';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';
import { setStatus } from '../lib/orders.js';
import { signOrder } from '../lib/token.js';

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
    html: renderEmail({
      heading: 'Ny betalt bestilling 🎉',
      html:
        emailP(`<b style="color:#EEF3F6">${navn || 'Ukjent navn'}</b> — ${email || 'ukjent e-post'}`) +
        emailP(`Pakke: <b style="color:#EEF3F6">${order?.pakke || '?'}</b><br>Format: ${order?.format || '9:16'}<br>Beløp: <b style="color:#EEF3F6">${(amountKr != null ? amountKr : (order?.amountKr || 0)).toLocaleString('no-NO')} kr</b><br>Frist: ${frist}<br>Ref: <b style="color:#E8D3A6">${String(ref).toUpperCase()}</b>`) +
        (order?.melding ? emailP(`<b style="color:#EEF3F6">Melding fra kunde:</b><br>${String(order.melding).replace(/</g, '&lt;')}`) : ''),
      ctaText: 'Åpne admin-panelet',
      ctaUrl: `${origin}/admin.html`,
    }),
  });

  if (email) {
    let portalUrl = uploadUrl;
    try {
      const token = signOrder({ orderId: ref, navn, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
      portalUrl = `${origin}/ordre.html?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(token)}`;
    } catch (e) { console.error('[stripe-webhook] token', e.message); }

    const EP = 'font-family:Arial,Helvetica,sans-serif;';
    const dO = { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    const bestilt = order?.created ? new Date(order.created).toLocaleString('no-NO', dO) : '—';
    const ferdig = order?.deadline ? new Date(order.deadline).toLocaleString('no-NO', dO) : '—';
    const belop = (amountKr != null ? amountKr : (order?.amountKr || 0)).toLocaleString('no-NO');
    const row = (l, v) => `<tr>
        <td style="${EP}font-size:13px;color:#9A8F7A;padding:7px 0;vertical-align:top">${l}</td>
        <td style="${EP}font-size:14px;color:#14181C;font-weight:600;padding:7px 0;text-align:right;vertical-align:top">${v}</td></tr>`;
    const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px"><tr>
        <td style="background:#F6F2EA;background-color:#F6F2EA;border:1px solid #E4DCC9;border-radius:10px;padding:10px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row('Bestilling', order?.pakke || '—')}
            ${row('Format', order?.format || '9:16')}
            ${row('Referanse', `<span style="letter-spacing:.5px">${String(ref).toUpperCase()}</span>`)}
            ${row('Bestilt', bestilt)}
            ${row('Ferdig innen', `<span style="color:#0E7C8B">${ferdig}</span>`)}
            ${row('Betalt', belop + ' kr')}
          </table>
        </td></tr></table>`;

    await sendEmail({
      to: email,
      subject: 'Takk for bestillingen hos StayMotion 🎬',
      html: renderEmail({
        preheader: 'Vi har mottatt bestillingen din og setter i gang.',
        badge: true,
        kicker: 'Betalt',
        heading: `Takk for bestillingen${navn ? ', ' + navn.split(' ')[0] : ''}!`,
        html:
          emailP('Vi har mottatt betalingen og bildene dine. Nå setter vi i gang — du hører fra oss når resultatet er klart.') +
          summary,
        ctaText: 'Følg bestillingen din',
        ctaUrl: portalUrl,
      }),
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
