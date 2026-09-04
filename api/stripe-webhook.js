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

    const F = "font-family:'Inter Tight',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;";
    const dO = { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    const bestilt = order?.created ? new Date(order.created).toLocaleString('no-NO', dO) : '—';
    const ferdig = order?.deadline ? new Date(order.deadline).toLocaleString('no-NO', dO) : '—';
    const belop = (amountKr != null ? amountKr : (order?.amountKr || 0)).toLocaleString('no-NO');
    const isVid = /9:16|16:9/.test(order?.format || '');
    const irow = (icon, label, value, sub, accent) => `<tr>
        <td width="42" valign="top" style="padding:13px 0"><img src="${origin}/img/${icon}.png" width="24" height="24" alt="" style="display:block;border:0"></td>
        <td valign="middle" style="${F}padding:13px 0;font-size:14px;color:#71808A">${label}</td>
        <td valign="middle" align="right" style="padding:13px 0">
          <div style="${F}font-size:15px;font-weight:600;color:${accent ? '#1597A8' : '#111820'}">${value}</div>
          ${sub ? `<div style="${F}font-size:12px;color:#8C99A2;margin-top:3px">${sub}</div>` : ''}
        </td></tr>`;
    const srow = (l, v) => `<tr>
        <td></td>
        <td style="${F}padding:5px 0;font-size:12px;color:#8C99A2">${l}</td>
        <td align="right" style="${F}padding:5px 0;font-size:12px;color:#8C99A2">${v}</td></tr>`;
    const box = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 4px"><tr>
        <td style="background:#F3F7F9;background-color:#F3F7F9;border:1px solid #DCE5E9;border-radius:14px;padding:14px 24px 18px">
          <div style="${F}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9AA6AE;padding:8px 0 4px">Bestillingsdetaljer</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${irow('ic-order', 'Bestilling', order?.pakke || '—')}
            ${irow('ic-format', 'Format', order?.format || '9:16', isVid ? 'Perfekt for TikTok, Instagram og Facebook' : '')}
            ${irow('ic-time', 'Ferdig innen', ferdig, 'Vi gir deg beskjed så snart videoen er klar.', true)}
            ${irow('ic-pay', 'Betalt', belop + ' kr')}
            <tr><td colspan="3" style="padding:6px 0"><div style="border-top:1px solid #DCE5E9;font-size:0;line-height:0">&nbsp;</div></td></tr>
            ${srow('Bestilt', bestilt)}
            ${srow('Referanse', String(ref).toUpperCase())}
          </table>
        </td></tr></table>`;

    const html = `<div style="margin:0;padding:0;background:#F7F9FB;background-color:#F7F9FB">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0">Vi har mottatt bildene og betalingen din. Nå starter produksjonen.</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F9FB;background-color:#F7F9FB">
        <tr><td align="center" style="padding:40px 16px">
          <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px;max-width:100%">
            <tr><td align="center" style="padding:2px 0 4px">
              <img src="${origin}/img/logo-mono.png" width="30" height="23" alt="StayMotion" style="vertical-align:middle;border:0;margin-right:9px">
              <span style="${F}font-size:15px;letter-spacing:5px;font-weight:700;color:#111820;vertical-align:middle">STAYMOTION</span>
            </td></tr>
            <tr><td align="center" style="${F}padding:0 0 26px;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:#9AA6AE">Cinematiske videoer fra bildene du allerede har</td></tr>
            <tr><td style="background:#FFFFFF;background-color:#FFFFFF;border:1px solid #E6ECEF;border-radius:16px;padding:38px 38px 34px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr>
                <td width="46" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;border-radius:50%;background:#EAF4F6;color:#1597A8;font-size:19px">&#10003;</td></tr></table></td>
                <td valign="middle" style="${F}font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#1597A8;font-weight:bold;padding-left:12px">Betalt</td>
              </tr></table>
              <h1 style="${F}margin:0 0 14px;font-size:27px;line-height:1.18;color:#111820;font-weight:700;letter-spacing:-.01em">Takk for bestillingen${navn ? ', ' + navn.split(' ')[0] : ''}!</h1>
              <p style="${F}margin:0;font-size:15.5px;line-height:1.6;color:#71808A">Vi har mottatt bildene og betalingen din.<br>Nå starter vi produksjonen — du hører fra oss når resultatet er klart.</p>
              ${box}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 6px"><tr>
                <td align="center" bgcolor="#101820" style="border-radius:9px">
                  <a href="${portalUrl}" style="${F}display:inline-block;padding:16px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px">Følg bestillingen din &rarr;</a>
                </td></tr></table>
              <p style="${F}margin:22px 0 0;font-size:13.5px;line-height:1.6;color:#71808A">Har du spørsmål?<br>Send oss en melding på <a href="mailto:${owner}" style="color:#1597A8;text-decoration:none">${owner}</a></p>
            </td></tr>
            <tr><td style="padding:24px 8px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="top" style="${F}font-size:12px;line-height:1.7;color:#71808A">
                  <b style="color:#111820">StayMotion</b> · <a href="https://staymotion.no" style="color:#1597A8;text-decoration:none">staymotion.no</a><br>
                  Cinematiske videoer fra bildene du allerede har.
                </td>
                <td valign="top" align="right" style="${F}font-size:12px;color:#71808A">
                  <a href="https://instagram.com/staymotion.no" style="color:#71808A;text-decoration:none">Instagram</a> ·
                  <a href="https://www.tiktok.com/@staymotion2" style="color:#71808A;text-decoration:none">TikTok</a>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`;

    await sendEmail({ to: email, subject: 'Takk for bestillingen hos StayMotion 🎬', html });
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
