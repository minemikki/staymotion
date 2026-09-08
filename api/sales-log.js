// Read the send/error/block log. Admin-gated. GET /api/sales-log?key=...
import { getLog } from '../lib/sales-store.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const log = await getLog();
    res.json({ entries: log.entries || [] });
  } catch (e) {
    console.error('[sales-log]', e);
    res.status(500).json({ error: 'Kunne ikke lese logg' });
  }
}
