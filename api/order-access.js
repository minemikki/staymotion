// "Min side" login: customer enters their reference code + the email they
// ordered with. If both match, we mint a signed portal token and hand back the
// portal URL. Generic errors so we never reveal whether a ref exists.

import { signOrder } from '../lib/token.js';
import { getOrderView } from '../lib/orders.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const ref = String(b.ref || '').trim().toUpperCase();
    const email = String(b.email || '').trim().toLowerCase();
    if (!ref || !email) return res.status(400).json({ error: 'Fyll inn referansekode og e-post.' });

    const o = await getOrderView(ref);
    const orderEmail = String(o?.email || '').trim().toLowerCase();
    if (!orderEmail || orderEmail !== email) {
      return res.status(403).json({ error: 'Fant ingen bestilling med den koden og e-posten. Sjekk at begge er riktige.' });
    }

    const token = signOrder({ orderId: ref, email: orderEmail, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
    res.json({ ok: true, url: `/ordre.html?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(token)}` });
  } catch (e) {
    console.error('[order-access]', e);
    res.status(500).json({ error: 'Noe gikk galt. Prøv igjen.' });
  }
}
