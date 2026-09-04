// "Min side" login: customer enters their reference code + the email they
// ordered with. Case-insensitive on both, so it's forgiving to type. If both
// match, we mint a signed portal token and hand back the portal URL.

import { signOrder } from '../lib/token.js';
import { listOrders } from '../lib/orders.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    const ref = String(b.ref || '').trim().toLowerCase();
    const email = String(b.email || '').trim().toLowerCase();
    if (!ref || !email) return res.status(400).json({ error: 'Fyll inn referansekode og e-post.' });

    // Find the order by ref, case-insensitively (old refs were lowercase,
    // new ones uppercase — accept either).
    let orders = [];
    try { orders = await listOrders(); } catch (e) { orders = []; }
    const o = orders.find((x) => String(x.id || '').toLowerCase() === ref);

    if (!o) {
      return res.status(404).json({ error: 'Fant ingen bestilling med den koden. Sjekk at den er skrevet riktig.' });
    }
    const orderEmail = String(o.email || '').trim().toLowerCase();
    if (!orderEmail || orderEmail !== email) {
      return res.status(403).json({ error: 'E-posten stemmer ikke med bestillingen. Bruk e-posten du bestilte med.' });
    }

    const token = signOrder({ orderId: o.id, email: orderEmail, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
    res.json({ ok: true, url: `/ordre.html?ref=${encodeURIComponent(o.id)}&t=${encodeURIComponent(token)}` });
  } catch (e) {
    console.error('[order-access]', e);
    res.status(500).json({ error: 'Noe gikk galt. Prøv igjen.' });
  }
}
