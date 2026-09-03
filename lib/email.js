// Minimal email sender via Resend's HTTP API (no dependency needed).
// If RESEND_API_KEY is missing we log instead of throwing, so the payment
// flow never breaks just because email isn't configured yet.

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'StayMotion <onboarding@resend.dev>';
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing — skipping:', subject);
    return;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html }),
    });
    if (!r.ok) console.error('[email] Resend error', r.status, await r.text());
  } catch (e) {
    console.error('[email] send failed', e);
  }
}
