// Checks a Vipps payment; if authorized it captures the amount and returns a
// signed upload token. Called by takk.html after the Vipps redirect.

import { signOrder } from '../../lib/token.js';
import { sendEmail } from '../../lib/email.js';
import { vippsAccessToken, vippsHeaders, vippsBase } from '../../lib/vipps.js';
import { setStatus } from '../../lib/orders.js';

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
    const owner = process.env.OWNER_EMAIL || 'michael@staymotion.no';

    // Mark the order paid & unprocessed, and pull its details for the email.
    let order = null;
    try { order = await setStatus(ref, 'ubehandlet'); } catch (e) { console.error('[vipps/status] setStatus', e.message); }

    const deadline = order?.deadline ? new Date(order.deadline).toLocaleString('no-NO') : '—';
    await sendEmail({
      to: owner,
      subject: `Ny betalt bestilling — ${order?.navn || pkg}`,
      html: `<h2>Ny betalt bestilling (Vipps)</h2>
        <p><b>${order?.navn || 'Ukjent'}</b> — ${order?.email || ''}<br>
        Pakke: <b>${order?.pakke || pkg}</b><br>
        Format: ${order?.format || '9:16'}<br>
        Beløp: ${(d.amount.value / 100).toLocaleString('no-NO')} kr<br>
        Frist: ${deadline}<br>
        Ref: ${ref}</p>
        ${order?.melding ? `<p><b>Melding fra kunde:</b><br>${String(order.melding).replace(/</g, '&lt;')}</p>` : ''}
        <p>Kunden laster opp bildene nå. Se alle bestillinger i <a href="https://${req.headers.host}/admin.html">admin-panelet</a>.</p>`,
    });

    const orderToken = signOrder({
      orderId: ref,
      pkg,
      navn: order?.navn || '',
      email: order?.email || '',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ paid: true, token: orderToken, pkg, ref });
  } catch (e) {
    console.error('[vipps/status]', e);
    res.status(500).json({ error: 'Kunne ikke bekrefte Vipps-betaling' });
  }
}
