// Checks a Vipps payment; if authorized it captures the amount and returns a
// signed upload token. Called by takk.html after the Vipps redirect.

import { signOrder } from '../../lib/token.js';
import { sendEmail } from '../../lib/email.js';
import { vippsAccessToken, vippsHeaders, vippsBase } from '../../lib/vipps.js';

export default async function handler(req, res) {
  try {
    const ref = (req.query || {}).ref;
    if (!ref) return res.status(400).json({ error: 'mangler ref' });

    const token = await vippsAccessToken();
    const r = await fetch(`${vippsBase()}/epayment/v1/payments/${ref}`, {
      headers: vippsHeaders(token),
    });
    if (!r.ok) return res.status(502).json({ error: await r.text() });
    const d = await r.json();

    // States: CREATED, AUTHORIZED, TERMINATED, ABORTED, EXPIRED
    if (d.state !== 'AUTHORIZED') return res.json({ paid: false, state: d.state });

    // Capture the reserved amount.
    await fetch(`${vippsBase()}/epayment/v1/payments/${ref}/capture`, {
      method: 'POST',
      headers: vippsHeaders(token, 'cap-' + ref),
      body: JSON.stringify({ modificationAmount: { currency: 'NOK', value: d.amount.value } }),
    });

    const pkg = ref.split('-')[1] || '';
    const owner = process.env.OWNER_EMAIL || 'hello@staymotion.no';
    await sendEmail({
      to: owner,
      subject: 'Ny bestilling (Vipps) — StayMotion',
      html: `<h2>Ny betalt bestilling (Vipps)</h2>
        <p>Pakke: <b>${pkg}</b><br>Ref: ${ref}<br>Beløp: ${(d.amount.value / 100).toLocaleString('no-NO')} kr</p>`,
    });

    const orderToken = signOrder({
      orderId: ref,
      pkg,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ paid: true, token: orderToken, pkg });
  } catch (e) {
    console.error('[vipps/status]', e);
    res.status(500).json({ error: 'Kunne ikke bekrefte Vipps-betaling' });
  }
}
