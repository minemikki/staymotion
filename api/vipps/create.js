// Vipps ePayment — creates a payment and redirects the customer to Vipps.
// The package id is encoded into the reference (sm-<pkg>-<ts>-<rand>) so we
// can resolve it on return without a database.

import { resolvePackage } from '../../lib/packages.js';
import { vippsAccessToken, vippsHeaders, vippsBase } from '../../lib/vipps.js';

export default async function handler(req, res) {
  try {
    const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const p = resolvePackage(src.pkg, src.express);
    if (!p) return res.status(400).json({ error: 'Ukjent pakke' });

    // Graceful fallback: Vipps not configured yet → order by email.
    if (!process.env.VIPPS_CLIENT_ID || !process.env.VIPPS_SUBSCRIPTION_KEY || !process.env.VIPPS_MSN) {
      const mail = 'mailto:hello@staymotion.no?subject=' +
        encodeURIComponent('Bestilling: ' + p.label) +
        '&body=' + encodeURIComponent('Hei! Jeg vil bestille ' + p.label + ' (' + p.amountKr + ' kr).');
      res.writeHead(303, { Location: mail });
      return res.end();
    }

    const token = await vippsAccessToken();
    const origin = `https://${req.headers.host}`;
    const reference = `sm-${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const r = await fetch(`${vippsBase()}/epayment/v1/payments`, {
      method: 'POST',
      headers: vippsHeaders(token, reference),
      body: JSON.stringify({
        amount: { currency: 'NOK', value: p.amountMinor },
        paymentMethod: { type: 'WALLET' },
        reference,
        returnUrl: `${origin}/takk.html?provider=vipps&ref=${reference}`,
        userFlow: 'WEB_REDIRECT',
        paymentDescription: 'StayMotion — ' + p.label,
      }),
    });

    if (!r.ok) {
      console.error('[vipps/create]', await r.text());
      return res.status(502).json({ error: 'Vipps kunne ikke starte betaling' });
    }
    const data = await r.json();
    res.writeHead(303, { Location: data.redirectUrl });
    res.end();
  } catch (e) {
    console.error('[vipps/create]', e);
    res.status(500).json({ error: 'Vipps-feil' });
  }
}
