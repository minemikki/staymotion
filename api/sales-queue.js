// Approval queue for first-contact + follow-up sequences. Admin-gated.
//
//   GET  /api/sales-queue?key=...                 → all sequences + pending count
//   POST { op:'create', leadId, observation?, offer? }
//        → builds a first-contact + 3-day + 7-day sequence in status 'pending'
//   POST { op:'approve', leadId }                 → approve → schedules steps
//   POST { op:'reject',  leadId }                 → delete the sequence
//   POST { op:'edit', leadId, stepId, subject?, body? }
//
// The first contact must be previewed + approved by Michael. Once approved,
// lawful follow-ups can auto-send later (stopped instantly on reply/opt-out).

import { listLeads } from '../lib/leads.js';
import { generateMessage } from '../lib/messages.js';
import { getConfig, getSequence, saveSequence, deleteSequence, listSequences, isSuppressed } from '../lib/sales-store.js';
import { classifyAddress, canAutosend, unsubscribeFooter } from '../lib/sales-guard.js';
import { PACKAGES, VAT } from '../lib/packages.js';

const DAY = 86400000;

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

function priceLines(offer, vatMode) {
  const p = PACKAGES[offer];
  if (!p) return {};
  const vat = VAT.label(vatMode);
  const deposit = Math.round(p.fromKr * p.depositPct / 100);
  return {
    priceLine: p.fromKr.toLocaleString('nb-NO') + ' NOK' + (vat ? ' ' + vat : ''),
    depositLine: p.depositPct < 100
      ? 'Oppstartbetaling: ' + deposit.toLocaleString('nb-NO') + ' NOK (' + p.depositPct + ' %). Resten ved levering.'
      : 'Betales ved oppstart.',
  };
}

async function buildSequence(lead, config, opts) {
  const email = (lead.email || '').trim().toLowerCase();
  const cls = classifyAddress(email);
  const suppressed = email ? await isSuppressed(email) : false;
  const decision = canAutosend(email, {
    existingCustomer: !!lead.existingCustomer, consent: !!lead.consent, suppressed,
  });
  const offer = opts.offer || lead.offer || '';
  const pl = priceLines(offer, config.vatMode);
  const ctx = {
    company: lead.company || '', contact: lead.contact || lead.contactName || '',
    observation: opts.observation || lead.topOpportunity || '',
    senderName: config.senderName, studioName: config.studioName,
    contactEmail: config.contactEmail, contactPhone: config.contactPhone,
    offer, priceLine: pl.priceLine, depositLine: pl.depositLine,
  };
  const plan = [
    { id: 'email1', type: 'email1', offsetDays: 0 },
    { id: 'followup3', type: 'followup3', offsetDays: 3 },
    { id: 'followup7', type: 'followup7', offsetDays: 7 },
  ];
  const steps = plan.map((s) => {
    const m = generateMessage(s.type, ctx);
    return {
      id: s.id, label: m.label, subject: m.subject, body: m.body,
      offsetDays: s.offsetDays, sendAt: null, status: 'planned',
      sentAt: null, dryRun: null,
    };
  });
  return {
    leadId: lead.id, company: lead.company || '', email,
    addressType: cls.type, autosendEligible: decision.allowed,
    channel: decision.channel, decisionReason: decision.reason,
    suggestion: decision.suggestion || '', suppressed,
    status: 'pending', createdAt: Date.now(), approvedAt: null,
    stoppedReason: '', offer, steps,
  };
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'GET') {
      const all = await listSequences();
      // Hide rejected sequences (marked, not deleted — avoids Blob list() lag
      // showing a just-removed sequence as still present/approved).
      const seqs = all.filter((s) => s.status !== 'rejected');
      seqs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const pending = seqs.filter((s) => s.status === 'pending').length;
      return res.json({ sequences: seqs, pending });
    }

    const b = req.body || {};
    const op = b.op;
    if (!b.leadId && op !== 'run') return res.status(400).json({ error: 'Mangler leadId' });

    if (op === 'create') {
      const config = await getConfig();
      const leads = await listLeads();
      const lead = leads.find((l) => l.id === b.leadId);
      if (!lead) return res.status(404).json({ error: 'Fant ikke lead' });
      if (!lead.email) return res.status(400).json({ error: 'Lead mangler e-postadresse' });
      const seq = await buildSequence(lead, config, { observation: b.observation, offer: b.offer });
      await saveSequence(seq);
      return res.json({ ok: true, sequence: seq });
    }

    if (op === 'approve') {
      const seq = await getSequence(b.leadId);
      if (!seq) return res.status(404).json({ error: 'Fant ikke sekvens' });
      seq.status = 'approved';
      seq.approvedAt = Date.now();
      seq.steps.forEach((s) => { if (s.status === 'planned') s.sendAt = seq.approvedAt + s.offsetDays * DAY; });
      await saveSequence(seq);
      return res.json({ ok: true, sequence: seq });
    }

    if (op === 'reject') {
      // Mark rejected (strongly-consistent overwrite) instead of deleting, so it
      // disappears immediately instead of lingering via Blob list() lag.
      const seq = await getSequence(b.leadId);
      if (seq) { seq.status = 'rejected'; seq.rejectedAt = Date.now(); await saveSequence(seq); }
      return res.json({ ok: true });
    }

    if (op === 'edit') {
      const seq = await getSequence(b.leadId);
      if (!seq) return res.status(404).json({ error: 'Fant ikke sekvens' });
      const step = seq.steps.find((s) => s.id === b.stepId);
      if (!step) return res.status(404).json({ error: 'Fant ikke steg' });
      if (typeof b.subject === 'string') step.subject = b.subject.slice(0, 200);
      if (typeof b.body === 'string') step.body = b.body.slice(0, 4000);
      await saveSequence(seq);
      return res.json({ ok: true, sequence: seq });
    }

    res.status(400).json({ error: 'Ukjent operasjon' });
  } catch (e) {
    console.error('[sales-queue]', e);
    res.status(500).json({ error: 'Kø-feil' });
  }
}
