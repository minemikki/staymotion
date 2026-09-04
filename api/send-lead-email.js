// Sends a single outreach email straight from the CRM, admin-gated.
// Plain text (looks personal, not a template), From your StayMotion sender,
// Reply-To your own inbox so replies land with you. A soft opt-out line is
// appended automatically (required for B2B marketing) if not already present.

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Bruk POST' });
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !EMAIL_RE.test(String(to))) return res.status(400).json({ error: 'Ugyldig eller manglende mottaker-e-post' });
    if (!subject || !body) return res.status(400).json({ error: 'Mangler emne eller tekst' });

    const key = process.env.RESEND_API_KEY;
    if (!key) return res.status(400).json({ error: 'RESEND_API_KEY er ikke satt i Vercel — kan ikke sende ennå.' });

    const from = process.env.MAIL_FROM || 'StayMotion <hello@staymotion.no>';
    const replyTo = process.env.OWNER_EMAIL || '';

    let text = String(body).trim();
    if (!/ikke aktuelt|hører du ikke fra meg|si (bare )?ifra/i.test(text)) {
      text += '\n\nHvis dette ikke er aktuelt, si bare ifra, så hører du ikke fra meg igjen.';
    }

    const payload = { from, to: [String(to)], subject: String(subject), text };
    if (replyTo && EMAIL_RE.test(replyTo)) payload.reply_to = replyTo;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const txt = await r.text();
    if (!r.ok) {
      console.error('[send-lead-email]', r.status, txt);
      // Bubble up Resend's reason (e.g. domain not verified) so it's fixable.
      return res.status(502).json({ error: 'Resend (' + r.status + '): ' + txt.slice(0, 400) });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[send-lead-email]', e);
    res.status(500).json({ error: 'Kunne ikke sende e-post' });
  }
}
