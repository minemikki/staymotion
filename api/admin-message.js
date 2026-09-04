// Admin sends a message to the customer. Protected by ADMIN_KEY.
//   POST /api/admin-message  { id, text }
// Appends the reply to the order (shown on the customer's "Min side") and
// emails the customer a notification with a link straight to their portal.

import { addReply, listOrders } from '../lib/orders.js';
import { signOrder } from '../lib/token.js';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const id = b.id;
    const text = String(b.text || '').trim();
    if (!id || !text) return res.status(400).json({ error: 'mangler id/tekst' });

    const order = await addReply(id, text);
    if (!order) return res.status(404).json({ error: 'fant ikke bestillingen' });

    const email = String(order.email || '').trim();
    const origin = `https://${req.headers.host}`;

    // Email the customer a notification (not the raw message thread alone —
    // a clear "you have a new message, open Min side" nudge with a link).
    if (email) {
      let portalUrl = `${origin}/minside.html`;
      try {
        const token = signOrder({ orderId: id, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
        portalUrl = `${origin}/ordre.html?ref=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
      } catch (e) { console.error('[admin-message] token', e.message); }

      const first = (order.navn || '').split(' ')[0];
      try {
        await sendEmail({
          to: email,
          subject: 'Ny melding om bestillingen din — StayMotion',
          html: renderEmail({
            kicker: 'Ny melding',
            heading: first ? `Hei ${first}!` : 'Du har en ny melding',
            preheader: 'Vi har sendt deg en melding om bestillingen din.',
            html:
              emailP('Vi har lagt igjen en melding om bestillingen din:') +
              `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px"><tr>
                 <td style="background:#F3F7F9;background-color:#F3F7F9;border:1px solid #DCE5E9;border-radius:12px;border-left:3px solid #1597A8;padding:16px 18px">
                   <div style="font-family:'Inter Tight',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#111820;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</div>
                 </td></tr></table>` +
              emailP('Åpne «Min side» for å svare oss eller følge bestillingen.'),
            ctaText: 'Åpne Min side',
            ctaUrl: portalUrl,
            refLabel: 'Referanse',
            refValue: String(id).toUpperCase(),
          }),
        });
      } catch (e) { console.error('[admin-message] email', e.message); }
    }

    res.json({ ok: true, order });
  } catch (e) {
    console.error('[admin-message]', e);
    res.status(500).json({ error: 'Kunne ikke sende meldingen' });
  }
}
