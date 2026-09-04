// Minimal email sender via Resend's HTTP API (no dependency needed).
// If RESEND_API_KEY is missing we log instead of throwing, so the payment
// flow never breaks just because email isn't configured yet.

// Bulletproof, branded HTML email layout. Table-based + inline styles + a
// text wordmark (no image dependency) + a bgcolor button that survives Gmail
// dark mode. Pass heading, inner html (paragraphs), and an optional CTA.
// Light, stable premium layout — survives Gmail/Apple Mail dark-mode without
// the muddy colour inversion a dark design suffers from.
export function renderEmail({ heading, html, ctaText, ctaUrl, preheader, badge, kicker, refLabel, refValue }) {
  const P = 'font-family:Arial,Helvetica,sans-serif;';
  const TEAL = '#0E7C8B';
  const badgeHtml = badge
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>
         <td width="58" height="58" align="center" valign="middle" style="width:58px;height:58px;border:2px solid ${TEAL};border-radius:50%;font-size:26px;color:${TEAL};background:#EAF6F8">&#10003;</td>
       </tr></table>`
    : '';
  const kickerHtml = kicker
    ? `<div style="${P}font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${TEAL};font-weight:bold;margin:0 0 12px">${kicker}</div>`
    : '';
  const refHtml = (refLabel && refValue)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px"><tr>
         <td style="background:#F6F2EA;background-color:#F6F2EA;border:1px solid #E4DCC9;border-radius:10px;padding:16px 20px">
           <div style="${P}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9A8F7A;margin:0 0 7px">${refLabel}</div>
           <div style="${P}font-size:19px;font-weight:bold;letter-spacing:.5px;color:#14181C;word-break:break-all">${refValue}</div>
         </td></tr></table>`
    : '';
  const button = ctaText && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px"><tr>
         <td align="center" bgcolor="#14181C" style="border-radius:6px">
           <a href="${ctaUrl}" style="${P}display:inline-block;padding:15px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px">${ctaText} &rarr;</a>
         </td></tr></table>`
    : '';
  return `<div style="margin:0;padding:0;background:#FFFFFF;background-color:#FFFFFF">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;background-color:#FFFFFF">
      <tr><td align="center" style="padding:34px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%">
          <tr><td align="center" style="padding:4px 0 22px">
            <span style="${P}font-size:15px;letter-spacing:6px;font-weight:bold;color:#14181C">STAYMOTION</span>
          </td></tr>
          <tr><td style="background:#FFFFFF;background-color:#FFFFFF;border:1px solid #E6E0D5;border-radius:14px;padding:36px 32px 32px">
            ${badgeHtml}
            ${kickerHtml}
            <h1 style="${P}margin:0 0 16px;font-size:27px;line-height:1.15;color:#14181C;font-weight:bold">${heading}</h1>
            ${html}
            ${refHtml}
            ${button}
          </td></tr>
          <tr><td align="center" style="${P}padding:22px 12px 0;font-size:12px;line-height:1.6;color:#9A968E">
            StayMotion · <a href="https://staymotion.no" style="color:${TEAL};text-decoration:none">staymotion.no</a><br>
            Cinematiske videoer fra bildene du allerede har.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}
const PP = 'font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;';
export function emailP(text) { return `<p style="${PP}margin:0 0 14px">${text}</p>`; }

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
