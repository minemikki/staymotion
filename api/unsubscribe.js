// PUBLIC unsubscribe endpoint (no auth) — the working opt-out every outreach
// email links to. Verifies an HMAC token so the link can't be forged into
// suppressing arbitrary addresses, then adds the address to the suppression
// list and stops any running sequence. Returns a small, friendly HTML page.
//   GET /api/unsubscribe?e=<email>&t=<token>

import { suppress, getSequence, saveSequence } from '../lib/sales-store.js';
import { verifyUnsubToken, normalizeEmail } from '../lib/sales-guard.js';
import { listLeads } from '../lib/leads.js';

function page(title, msg) {
  return `<!DOCTYPE html><html lang="no"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — StayMotion</title>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#0c1116;color:#e9eef2;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;background:#141b22;border:1px solid #223;border-radius:16px;padding:36px 32px;text-align:center}
h1{font-size:22px;margin:0 0 12px}p{color:#9fb0bd;line-height:1.6;margin:0 0 8px}a{color:#1597A8}
.mark{letter-spacing:4px;font-weight:800;font-size:14px;color:#8aa;margin-bottom:20px}</style></head>
<body><div class="card"><div class="mark">STAYMOTION</div><h1>${title}</h1><p>${msg}</p>
<p style="margin-top:18px"><a href="https://staymotion.no">staymotion.no</a></p></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const email = normalizeEmail((req.query && req.query.e) || '');
    const token = (req.query && req.query.t) || '';
    if (!email || !verifyUnsubToken(email, token)) {
      res.statusCode = 400;
      return res.end(page('Ugyldig lenke', 'Denne avmeldingslenken er ikke gyldig. Svar gjerne direkte på e-posten, så fjerner vi deg manuelt.'));
    }
    await suppress(email, 'unsubscribe');
    // Stop any running sequence for this address.
    try {
      const leads = await listLeads();
      const lead = leads.find((l) => (l.email || '').toLowerCase() === email);
      if (lead) {
        const seq = await getSequence(lead.id);
        if (seq && seq.status !== 'stopped') {
          seq.status = 'stopped';
          seq.stoppedReason = 'Avmeldt av mottaker.';
          seq.steps.forEach((s) => { if (s.status === 'planned') s.status = 'skipped'; });
          await saveSequence(seq);
        }
      }
    } catch (e) { console.error('[unsubscribe] stop seq', e.message); }

    res.statusCode = 200;
    res.end(page('Du er meldt av', 'Vi har notert reservasjonen din og sender deg ikke flere henvendelser. Beklager forstyrrelsen — og lykke til videre.'));
  } catch (e) {
    console.error('[unsubscribe]', e);
    res.statusCode = 500;
    res.end(page('Noe gikk galt', 'Prøv igjen senere, eller svar på e-posten så fjerner vi deg manuelt.'));
  }
}
