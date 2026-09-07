// Admin actions on a web project. Protected by ADMIN_KEY.
//   POST /api/admin-project
//     { orderId, action:'update', stage?, stagingUrl?, liveUrl?, notes?, checklist? }
//     { orderId, action:'review' }   → stage review + email the customer the preview
//     { orderId, action:'launch' }   → stage lansert + email the customer the live site

import { updateProject, sendForReview, launchProject } from '../lib/project.js';

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
    if (!b.orderId || !b.action) return res.status(400).json({ error: 'mangler orderId/action' });
    let r;
    if (b.action === 'update') {
      const o = await updateProject(b.orderId, { stage: b.stage, stagingUrl: b.stagingUrl, liveUrl: b.liveUrl, notes: b.notes, checklist: b.checklist });
      r = { project: o.project, status: o.status };
    }
    else if (b.action === 'review') r = await sendForReview(b.orderId, req.headers.host);
    else if (b.action === 'launch') r = await launchProject(b.orderId, req.headers.host);
    else return res.status(400).json({ error: 'ukjent action' });
    res.json({ ok: true, ...r });
  } catch (e) {
    console.error('[admin-project]', e);
    res.status(500).json({ error: e.message || 'Handling feilet' });
  }
}
