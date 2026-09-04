// Customer posts an extra request / note (or signals they uploaded more photos)
// from the order portal. Token-gated; notifies the owner by email.

import { verifyOrder } from '../lib/token.js';
import { addNote } from '../lib/orders.js';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const ref = b.ref, t = b.t, note = (b.note || '').trim();
    if (!ref || !t || !note) return res.status(400).json({ error: 'mangler felt' });

    const data = verifyOrder(t);
    if (!data || data.orderId !== ref) return res.status(403).json({ error: 'ugyldig lenke' });

    const order = await addNote(ref, note);
    if (!order) return res.status(404).json({ error: 'fant ikke bestillingen' });

    const owner = process.env.OWNER_EMAIL || 'hello@staymotion.no';
    const origin = `https://${req.headers.host}`;
    try {
      await sendEmail({
        to: owner,
        subject: `Ny melding fra kunde — ${order.navn || order.kunde || ref}`,
        html: renderEmail({
          heading: 'Ny melding fra kunde 💬',
          html:
            emailP(`<b style="color:#EEF3F6">${order.navn || order.kunde || 'Kunde'}</b> (ref <b style="color:#E8D3A6">${String(ref).toUpperCase()}</b>) skrev:`) +
            emailP(`<span style="color:#EEF3F6">«${note.replace(/</g, '&lt;')}»</span>`),
          ctaText: 'Åpne admin-panelet',
          ctaUrl: `${origin}/admin.html`,
        }),
      });
    } catch (e) { console.error('[order-note] email', e.message); }

    res.json({ ok: true });
  } catch (e) {
    console.error('[order-note]', e);
    res.status(500).json({ error: 'Kunne ikke sende meldingen' });
  }
}
