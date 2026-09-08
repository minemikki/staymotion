// "I dag" — a realistic daily work list, prioritised toward revenue before the
// deadline. Admin-gated. GET /api/sales-today?key=...
//
// Buckets (in priority order — money-closest first):
//   payments   — proposals sent, awaiting start payment (chase these first)
//   proposals  — calls booked / replied, ready to send a proposal
//   calls      — replied leads to call/book
//   followups  — sequences with a follow-up step due today
//   approvals  — sequences pending Michael's approval
//   forms      — leads whose address is personal → send via contact form/phone
//   research   — new leads to research + audit

import { listLeads } from '../lib/leads.js';
import { listSequences, getConfig } from '../lib/sales-store.js';
import { classifyAddress } from '../lib/sales-guard.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

const ORDER = { ny: 0, undersokt: 1, klar: 2, kontaktet: 3, svar: 4, mote: 5, tilbud: 6, vunnet: 7, tapt: 7 };

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const [leads, seqs, config] = await Promise.all([listLeads(), listSequences(), getConfig()]);
    const real = leads.filter((l) => !l.demo);
    const byId = {}; real.forEach((l) => { byId[l.id] = l; });
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const lite = (l) => ({ id: l.id, company: l.company, email: l.email, phone: l.phone, stage: l.stage, website: l.website, nextAction: l.nextAction });

    const payments = real.filter((l) => l.offer && l.stage !== 'vunnet' && l.stage !== 'tapt' && !(Number(l.startPaidKr) > 0) && (ORDER[l.stage] ?? 0) >= 6).map(lite);
    const proposals = real.filter((l) => !l.offer && ((ORDER[l.stage] ?? 0) >= 4) && l.stage !== 'tilbud' && l.stage !== 'vunnet' && l.stage !== 'tapt').map(lite);
    const calls = real.filter((l) => l.stage === 'svar').map(lite);

    // follow-up steps due today from approved sequences
    const followups = [];
    for (const s of seqs) {
      if (s.status !== 'approved') continue;
      for (const step of s.steps) {
        if (step.status === 'planned' && step.sendAt != null && step.sendAt <= now && step.id !== 'email1') {
          followups.push({ leadId: s.leadId, company: s.company, step: step.id, label: step.label });
        }
      }
    }
    const approvals = seqs.filter((s) => s.status === 'pending').map((s) => ({ leadId: s.leadId, company: s.company, email: s.email, addressType: s.addressType }));

    // personal-address leads that must be reached by form/phone (not autosend)
    const forms = real.filter((l) => {
      if (!l.email) return false;
      if (l.stage !== 'klar' && l.stage !== 'undersokt') return false;
      return classifyAddress(l.email).type === 'personal';
    }).map(lite);

    const research = real.filter((l) => l.stage === 'ny' || (!l.websiteQuality && (l.stage === 'ny' || l.stage === 'undersokt'))).map(lite);

    const deadline = new Date((config.deadline || '2026-09-25') + 'T23:59:59+02:00');
    const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86400000));

    res.json({
      date: today, daysLeft,
      buckets: { payments, proposals, calls, followups, approvals, forms, research },
      counts: {
        payments: payments.length, proposals: proposals.length, calls: calls.length,
        followups: followups.length, approvals: approvals.length, forms: forms.length, research: research.length,
      },
    });
  } catch (e) {
    console.error('[sales-today]', e);
    res.status(500).json({ error: 'Kunne ikke bygge dagens liste' });
  }
}
