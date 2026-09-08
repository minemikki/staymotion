// Records outreach events that must stop sending. Admin-gated.
//   POST { op:'reply'|'bounce'|'complaint'|'stop', leadId?, email? }
// - reply     → stop the sequence, advance lead to 'svar' (do NOT suppress; a
//               reply is engagement, Michael takes over manually)
// - bounce    → stop + suppress (bad address)
// - complaint → stop + suppress (spam complaint)
// - stop      → manual stop + suppress
//
// Public unsubscribe is handled separately by /api/unsubscribe (no auth).

import { getSequence, saveSequence, suppress } from '../lib/sales-store.js';
import { listLeads, saveLead } from '../lib/leads.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

async function stopSequence(leadId, reason) {
  if (!leadId) return;
  const seq = await getSequence(leadId);
  if (seq && seq.status !== 'stopped') {
    seq.status = 'stopped';
    seq.stoppedReason = reason;
    seq.steps.forEach((s) => { if (s.status === 'planned') s.status = 'skipped'; });
    await saveSequence(seq);
  }
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Bruk POST' });
  try {
    const b = req.body || {};
    const op = b.op;
    const email = (b.email || '').trim().toLowerCase();
    let leadId = b.leadId;

    // Resolve leadId from email if only email given.
    if (!leadId && email) {
      const leads = await listLeads();
      const l = leads.find((x) => (x.email || '').toLowerCase() === email);
      if (l) leadId = l.id;
    }

    if (op === 'reply') {
      await stopSequence(leadId, 'Kunden svarte — overtatt manuelt.');
      if (leadId) {
        const leads = await listLeads();
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
          const order = { ny: 0, undersokt: 1, klar: 2, kontaktet: 3, svar: 4, mote: 5, tilbud: 6, vunnet: 7, tapt: 7 };
          if ((order[lead.stage] ?? 0) < 4) lead.stage = 'svar';
          lead.repliedAt = Date.now();
          await saveLead(lead);
        }
      }
      return res.json({ ok: true, stopped: true, suppressed: false });
    }

    if (op === 'bounce' || op === 'complaint' || op === 'stop') {
      const reasonMap = { bounce: 'Bounce.', complaint: 'Spamklage.', stop: 'Manuelt stopp.' };
      await stopSequence(leadId, reasonMap[op]);
      if (email) await suppress(email, op === 'stop' ? 'manual' : op);
      return res.json({ ok: true, stopped: true, suppressed: !!email });
    }

    res.status(400).json({ error: 'Ukjent hendelse' });
  } catch (e) {
    console.error('[sales-event]', e);
    res.status(500).json({ error: 'Kunne ikke registrere hendelse' });
  }
}
