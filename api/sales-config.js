// Sales-engine config + settings. Admin-gated by ADMIN_KEY.
//   GET  /api/sales-config?key=...     → { config, env }
//   POST /api/sales-config { patch }    → save allowed settings, returns config
//
// Only a whitelist of fields can be written. SALES_LIVE lives in env, not here,
// so the UI can show its state but never flip real sending from the browser.

import { getConfig, saveConfig } from '../lib/sales-store.js';
import { globalSendBlockers } from '../lib/sales-guard.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

const ALLOWED = [
  'goalKr', 'deadline', 'dryRun', 'killSwitch', 'paused', 'dailyCap',
  'domainVerified', 'workStartHour', 'workEndHour', 'workDays', 'vatMode',
  'senderName', 'studioName', 'contactPhone', 'contactEmail',
];

function sanitize(patch) {
  const out = {};
  for (const k of ALLOWED) {
    if (!(k in patch)) continue;
    let v = patch[k];
    if (['dryRun', 'killSwitch', 'paused', 'domainVerified'].includes(k)) v = !!v;
    else if (['goalKr', 'dailyCap', 'workStartHour', 'workEndHour'].includes(k)) v = Math.max(0, parseInt(v, 10) || 0);
    else if (k === 'workDays' && Array.isArray(v)) v = v.map((n) => parseInt(n, 10)).filter((n) => n >= 0 && n <= 6);
    else if (k === 'vatMode') v = ['unknown', 'incl', 'excl', 'exempt'].includes(v) ? v : 'unknown';
    else if (typeof v === 'string') v = v.slice(0, 200);
    out[k] = v;
  }
  if (out.dailyCap != null) out.dailyCap = Math.min(out.dailyCap, 50); // hard ceiling
  return out;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'POST') {
      const patch = sanitize((req.body && req.body.patch) || req.body || {});
      const config = await saveConfig(patch);
      const g = globalSendBlockers(config);
      return res.json({ ok: true, config, sendState: g });
    }
    const config = await getConfig();
    const g = globalSendBlockers(config);
    res.json({ config, sendState: g });
  } catch (e) {
    console.error('[sales-config]', e);
    res.status(500).json({ error: 'Kunne ikke lese/lagre innstillinger' });
  }
}
