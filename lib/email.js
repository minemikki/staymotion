// Minimal email sender via Resend's HTTP API (no dependency needed).
// If RESEND_API_KEY is missing we log instead of throwing, so the payment
// flow never breaks just because email isn't configured yet.

// Bulletproof, branded HTML email layout. Table-based + inline styles + a
// text wordmark (no image dependency) + a bgcolor button that survives Gmail
// dark mode. Pass heading, inner html (paragraphs), and an optional CTA.
// Light, stable premium layout — survives Gmail/Apple Mail dark-mode without
// the muddy colour inversion a dark design suffers from.
export function renderEmail({ heading, html, ctaText, ctaUrl, preheader, badge, kicker, refLabel, refValue }) {
  const P = "font-family:'Inter Tight',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;";
  const ACCENT = '#1597A8';
  const badgeHtml = badge
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>
         <td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;border:1.5px solid ${ACCENT};border-radius:50%;font-size:23px;color:${ACCENT};background:#EAF4F6">&#10003;</td>
       </tr></table>`
    : '';
  const kickerHtml = kicker
    ? `<div style="${P}font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${ACCENT};font-weight:bold;margin:0 0 14px">${kicker}</div>`
    : '';
  const refHtml = (refLabel && refValue)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px"><tr>
         <td style="background:#F3F7F9;background-color:#F3F7F9;border:1px solid #DCE5E9;border-radius:12px;padding:16px 20px">
           <div style="${P}font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#71808A;margin:0 0 6px">${refLabel}</div>
           <div style="${P}font-size:18px;font-weight:600;letter-spacing:.5px;color:#111820;word-break:break-all">${refValue}</div>
         </td></tr></table>`
    : '';
  const button = ctaText && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px"><tr>
         <td align="center" bgcolor="#101820" style="border-radius:8px">
           <a href="${ctaUrl}" style="${P}display:inline-block;padding:15px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${ctaText} &rarr;</a>
         </td></tr></table>`
    : '';
  return `<div style="margin:0;padding:0;background:#F7F9FB;background-color:#F7F9FB">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F9FB;background-color:#F7F9FB">
      <tr><td align="center" style="padding:40px 16px">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px;max-width:100%">
          <tr><td align="center" style="padding:2px 0 26px">
            <span style="${P}font-size:23px;letter-spacing:4px;font-weight:800;color:#0C1116">STAYMOTION</span>
          </td></tr>
          <tr><td style="background:#FFFFFF;background-color:#FFFFFF;border:1px solid #E6ECEF;border-radius:16px;padding:40px 38px 36px">
            ${badgeHtml}
            ${kickerHtml}
            <h1 style="${P}margin:0 0 14px;font-size:26px;line-height:1.2;color:#111820;font-weight:700;letter-spacing:-.01em">${heading}</h1>
            ${html}
            ${refHtml}
            ${button}
          </td></tr>
          <tr><td align="center" style="${P}padding:26px 12px 0;font-size:12px;line-height:1.7;color:#71808A">
            StayMotion · <a href="https://staymotion.no" style="color:${ACCENT};text-decoration:none">staymotion.no</a><br>
            Cinematiske videoer fra bildene du allerede har.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}
const PP = "font-family:'Inter Tight',Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.65;color:#71808A;";
export function emailP(text) { return `<p style="${PP}margin:0 0 14px">${text}</p>`; }

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'StayMotion <onboarding@resend.dev>';
  if (!key) {
    console.warn('[email] RESEND_API_KEY missing — skipping:', subject);
    return;
  }
  // Wrap in a light-forced document so Apple Mail / Gmail dark mode can't
  // invert the design into muddy colours (a recurring issue on mobile).
  const wrapped = '<!DOCTYPE html><html lang="no"><head>'
    + '<meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="light">'
    + '<meta name="supported-color-schemes" content="light">'
    + '</head><body style="margin:0;padding:0;background:#F7F9FB;background-color:#F7F9FB">'
    + html + '</body></html>';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html: wrapped,
        reply_to: process.env.OWNER_EMAIL || 'michael@staymotion.no' }),
    });
    if (!r.ok) console.error('[email] Resend error', r.status, await r.text());
  } catch (e) {
    console.error('[email] send failed', e);
  }
}
