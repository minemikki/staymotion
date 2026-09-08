// The guarded sender. Admin-gated. Every path re-checks the guardrails; there
// is no way to bypass them from the browser.
//
//   POST { op:'preview', leadId, stepId }   → compose the exact email (no send)
//   POST { op:'send', leadId, stepId }       → send ONE step now (guarded)
//   POST { op:'run-due' }                    → process all due steps (guarded)
//
// Guardrails enforced here: dry-run, kill switch, pause, SALES_LIVE env,
// domain-verified flag, suppression, address eligibility, Norwegian working
// hours, daily cap, dedup (a step sends at most once), stop-on-reply/opt-out
// (a stopped sequence is skipped), send + error logging.

import { listSequences, getSequence, saveSequence, getConfig, getLog, appendLog, countSendsOnDay, isSuppressed } from '../lib/sales-store.js';
import { canAutosend, globalSendBlockers, isWithinWorkingHours, unsubscribeFooter } from '../lib/sales-guard.js';
import { listLeads, saveLead } from '../lib/leads.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

function osloDayBounds(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const start = new Date(ymd + 'T00:00:00+02:00').getTime();
  return { start, end: start + 86400000 };
}

// Compose the full outgoing text (message + required unsubscribe footer).
function compose(step, email, origin) {
  const foot = unsubscribeFooter(email, origin);
  let text = String(step.body || '').trim();
  if (!text.includes(foot.url)) text += foot.text;
  return { subject: step.subject, text, unsubUrl: foot.url };
}

async function realSend({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: 'RESEND_API_KEY mangler.' };
  const from = process.env.MAIL_FROM || 'StayMotion <hei@staymotion.no>';
  const replyTo = process.env.OWNER_EMAIL || '';
  const payload = { from, to: [to], subject, text };
  if (replyTo) payload.reply_to = replyTo;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await r.text();
    if (!r.ok) return { sent: false, error: 'Resend (' + r.status + '): ' + body.slice(0, 300) };
    return { sent: true, providerId: (() => { try { return JSON.parse(body).id; } catch { return null; } })() };
  } catch (e) {
    return { sent: false, error: String(e.message || e) };
  }
}

// Try to send/advance a single step. Returns a structured outcome, never throws.
async function processStep(seq, step, config, origin, sentTodayRef) {
  const email = seq.email;
  // 1. sequence-level stop
  if (seq.status === 'stopped') return { status: 'stopped', reason: seq.stoppedReason || 'Sekvens stoppet.' };
  if (step.status !== 'planned') return { status: step.status, reason: 'Steget er allerede ' + step.status + '.' };

  // 2. suppression + eligibility (re-checked at send time)
  const suppressed = await isSuppressed(email);
  const decision = canAutosend(email, { existingCustomer: !!seq.existingCustomer, consent: !!seq.consent, suppressed });
  if (!decision.allowed) {
    step.status = 'blocked';
    await appendLog({ kind: 'block', leadId: seq.leadId, email, step: step.id, reason: decision.reason });
    return { status: 'blocked', reason: decision.reason, suggestion: decision.suggestion };
  }

  // 3. global blockers (dry-run / kill switch / pause / live env / domain)
  const g = globalSendBlockers(config);
  if (g.blocked) {
    return { status: 'would-send', reason: g.reasons.join(' '), preview: compose(step, email, origin) };
  }

  // 4. working hours
  if (!isWithinWorkingHours(config)) {
    return { status: 'outside-hours', reason: 'Utenfor norsk arbeidstid.' };
  }

  // 5. daily cap
  if (sentTodayRef.count >= config.dailyCap) {
    return { status: 'cap-reached', reason: 'Dagsgrense (' + config.dailyCap + ') nådd.' };
  }

  // 6. send for real
  const msg = compose(step, email, origin);
  const r = await realSend({ to: email, subject: msg.subject, text: msg.text });
  if (!r.sent) {
    await appendLog({ kind: 'error', leadId: seq.leadId, email, step: step.id, error: r.error });
    return { status: 'error', reason: r.error };
  }
  step.status = 'sent';
  step.sentAt = Date.now();
  step.dryRun = false;
  step.providerId = r.providerId || null;
  sentTodayRef.count += 1;
  await appendLog({ kind: 'send', leadId: seq.leadId, email, step: step.id, subject: msg.subject, dryRun: false });
  return { status: 'sent', at: step.sentAt };
}

// Advance the lead's stage to at least 'kontaktet' after a first send.
async function markContacted(leadId) {
  try {
    const leads = await listLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      const order = { ny: 0, undersokt: 1, klar: 2, kontaktet: 3, svar: 4, mote: 5, tilbud: 6, vunnet: 7, tapt: 7 };
      if ((order[lead.stage] ?? 0) < 3) { lead.stage = 'kontaktet'; lead.lastContactAt = Date.now(); await saveLead(lead); }
    }
  } catch (e) { console.error('[sales-send] markContacted', e.message); }
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Bruk POST' });
  try {
    const b = req.body || {};
    const config = await getConfig();
    const origin = 'https://' + (req.headers.host || 'staymotion.no');
    const log = await getLog();
    const { start, end } = osloDayBounds();
    const sentTodayRef = { count: countSendsOnDay(log, start, end) };

    if (b.op === 'preview') {
      const seq = await getSequence(b.leadId);
      if (!seq) return res.status(404).json({ error: 'Fant ikke sekvens' });
      const step = seq.steps.find((s) => s.id === b.stepId);
      if (!step) return res.status(404).json({ error: 'Fant ikke steg' });
      return res.json({ ok: true, preview: compose(step, seq.email, origin), sendState: globalSendBlockers(config) });
    }

    if (b.op === 'send') {
      const seq = await getSequence(b.leadId);
      if (!seq) return res.status(404).json({ error: 'Fant ikke sekvens' });
      const step = seq.steps.find((s) => s.id === b.stepId);
      if (!step) return res.status(404).json({ error: 'Fant ikke steg' });
      const out = await processStep(seq, step, config, origin, sentTodayRef);
      await saveSequence(seq);
      if (out.status === 'sent' && step.id === 'email1') await markContacted(seq.leadId);
      return res.json({ ok: out.status === 'sent', result: out, sentToday: sentTodayRef.count, dailyCap: config.dailyCap });
    }

    if (b.op === 'run-due') {
      const seqs = await listSequences();
      const now = Date.now();
      const results = [];
      for (const seq of seqs) {
        if (seq.status !== 'approved') continue;
        for (const step of seq.steps) {
          if (step.status !== 'planned') continue;
          if (step.sendAt == null || step.sendAt > now) continue;
          const out = await processStep(seq, step, config, origin, sentTodayRef);
          results.push({ leadId: seq.leadId, company: seq.company, step: step.id, ...out });
          if (out.status === 'sent' && step.id === 'email1') await markContacted(seq.leadId);
          if (out.status === 'cap-reached') break;
        }
        await saveSequence(seq);
        if (sentTodayRef.count >= config.dailyCap) break;
      }
      return res.json({ ok: true, results, sentToday: sentTodayRef.count, dailyCap: config.dailyCap, sendState: globalSendBlockers(config) });
    }

    res.status(400).json({ error: 'Ukjent operasjon' });
  } catch (e) {
    console.error('[sales-send]', e);
    res.status(500).json({ error: 'Send-feil' });
  }
}
