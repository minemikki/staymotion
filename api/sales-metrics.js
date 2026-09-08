// Result-goal metrics, computed from REAL registered data (leads + send log).
// Admin-gated. GET /api/sales-metrics?key=...
//
// Pipeline stages (canonical order):
//   ny → undersokt → klar → kontaktet → svar → mote → tilbud → vunnet | tapt

import { listLeads } from '../lib/leads.js';
import { getConfig, getLog, countSendsOnDay } from '../lib/sales-store.js';

export const STAGES = ['ny', 'undersokt', 'klar', 'kontaktet', 'svar', 'mote', 'tilbud', 'vunnet', 'tapt'];
const ORDER = { ny: 0, undersokt: 1, klar: 2, kontaktet: 3, svar: 4, mote: 5, tilbud: 6, vunnet: 7, tapt: 7 };

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// Oslo-local start/end of "today" in ms.
function osloDayBounds(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = fmt.format(now); // YYYY-MM-DD
  // Oslo is UTC+1/+2; approximate day bounds via the date string parsed as local.
  const start = new Date(ymd + 'T00:00:00+02:00').getTime();
  return { start, end: start + 86400000 };
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const [leads, config, log] = await Promise.all([listLeads(), getConfig(), getLog()]);
    // Only count real (non-demo) leads toward the goal.
    const real = leads.filter((l) => !l.demo);

    const stageAtLeast = (l, s) => (ORDER[l.stage] ?? -1) >= ORDER[s] && l.stage !== 'tapt';
    const contacted = real.filter((l) => stageAtLeast(l, 'kontaktet')).length;
    const replies = real.filter((l) => stageAtLeast(l, 'svar')).length;
    const booked = real.filter((l) => stageAtLeast(l, 'mote')).length;
    const proposals = real.filter((l) => stageAtLeast(l, 'tilbud') || l.offer).length;
    const won = real.filter((l) => l.stage === 'vunnet');
    const lost = real.filter((l) => l.stage === 'tapt').length;

    const agreedValue = won.reduce((a, l) => a + num(l.agreedPriceKr || l.value), 0);
    const receivedKr = real.reduce((a, l) => a + num(l.startPaidKr), 0);

    const now = new Date();
    const deadline = new Date((config.deadline || '2026-09-25') + 'T23:59:59+02:00');
    const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86400000));

    const { start, end } = osloDayBounds(now);
    const sentToday = countSendsOnDay(log, start, end);

    res.json({
      goal: {
        goalKr: config.goalKr, deadline: config.deadline, daysLeft,
        receivedKr, progressPct: config.goalKr ? Math.min(100, Math.round((receivedKr / config.goalKr) * 100)) : 0,
        remainingKr: Math.max(0, config.goalKr - receivedKr),
      },
      funnel: {
        totalLeads: real.length, contacted, replies, booked, proposals,
        won: won.length, lost, agreedValue,
      },
      sending: { sentToday, dailyCap: config.dailyCap },
      wonLeads: won.map((l) => ({ id: l.id, company: l.company, agreedPriceKr: num(l.agreedPriceKr || l.value), startPaidKr: num(l.startPaidKr) })),
    });
  } catch (e) {
    console.error('[sales-metrics]', e);
    res.status(500).json({ error: 'Kunne ikke regne ut måltall' });
  }
}
