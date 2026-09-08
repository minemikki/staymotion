// Read / edit the suppression (opt-out) list. Admin-gated.
//   GET  /api/sales-suppression?key=...           → { list }
//   POST { op:'add', email, reason }               → suppress
//   POST { op:'remove', email }                    → un-suppress
import { getSuppression, suppress, unsuppress } from '../lib/sales-store.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.op === 'add') { await suppress(b.email, b.reason || 'manual'); return res.json({ ok: true }); }
      if (b.op === 'remove') { await unsuppress(b.email); return res.json({ ok: true }); }
      return res.status(400).json({ error: 'Ukjent operasjon' });
    }
    const list = await getSuppression();
    res.json({ list });
  } catch (e) {
    console.error('[sales-suppression]', e);
    res.status(500).json({ error: 'Kunne ikke lese reservasjonsliste' });
  }
}
