// Project intake — the premium 7-step "Start prosjekt" flow posts here.
// Saves the prospect as a lead in the CRM (Vercel Blob via lib/leads.js),
// emails the owner the full brief, and sends the prospect a confirmation.
//   POST /api/project-intake { need, business, url, goal, budget, launch,
//                              name, company, email, phone, notes, hp, src }

import { saveLead } from '../lib/leads.js';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';

const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const esc = (t) => String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// Budget range → suggested package + rough value for the pipeline.
function suggest(budget) {
  if (/40k\+/.test(budget)) return { pkg: 'Skreddersydd', value: 40000 };
  if (/20–40/.test(budget)) return { pkg: 'Signatur', value: 19900 };
  if (/10–20/.test(budget)) return { pkg: 'Momentum', value: 16000 };
  return { pkg: 'Første trekk', value: 7900 };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    // Honeypot: bots fill the hidden field; humans never see it.
    if (b.hp) return res.json({ ok: true });

    const email = s(b.email, 160).toLowerCase();
    const name = s(b.name, 120);
    const company = s(b.company, 160);
    if (!name || !company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Mangler navn, bedrift eller gyldig e-post' });
    }
    const lead = {
      source: 'intake',
      stage: 'kvalifisert',           // arrived via the site → already qualified themselves
      company, contact: name, email,
      phone: s(b.phone, 40),
      website: s(b.url, 300),
      niche: s(b.business, 80),
      need: s(b.need, 80),
      goal: s(b.goal, 80),
      budget: s(b.budget, 40),
      launch: s(b.launch, 60),
      notes: s(b.notes, 2000),
      src: s(b.src, 300),
      nextAction: 'Svar på henvendelse',
      nextActionDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    };
    const sug = suggest(lead.budget);
    lead.proposedPackage = sug.pkg;
    lead.value = sug.value;
    await saveLead(lead);

    const owner = process.env.OWNER_EMAIL || 'michael@staymotion.no';
    const origin = `https://${req.headers.host}`;
    const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#71808A;font-size:13px;white-space:nowrap">${k}</td><td style="padding:6px 0;color:#111820;font-size:14px;font-weight:600">${esc(v || '—')}</td></tr>`;

    // 1) Owner: the full brief
    const ownerMail = await sendEmail({
      to: owner,
      subject: `Ny prosjekthenvendelse — ${company} (${lead.budget || 'budsjett ikke satt'})`,
      html: renderEmail({
        kicker: 'Ny henvendelse',
        heading: `${company} vil starte et prosjekt`,
        html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 14px">`
          + row('Kontakt', `${name} · ${email}${lead.phone ? ' · ' + lead.phone : ''}`)
          + row('Behov', lead.need) + row('Bedrift', lead.niche) + row('Nettside', lead.website)
          + row('Mål', lead.goal) + row('Budsjett', lead.budget) + row('Lansering', lead.launch)
          + row('Foreslått pakke', `${sug.pkg} (~${sug.value.toLocaleString('nb-NO')} kr)`)
          + `</table>`
          + (lead.notes ? emailP(`<b style="color:#111820">Notat:</b><br>${esc(lead.notes)}`) : ''),
        ctaText: 'Åpne i admin', ctaUrl: `${origin}/admin.html`,
      }),
    });

    // 2) Prospect: calm, premium confirmation
    const first = name.split(' ')[0];
    const customerMail = await sendEmail({
      to: email,
      subject: 'Vi har mottatt prosjektet ditt — StayMotion',
      html: renderEmail({
        kicker: 'Mottatt',
        heading: `Takk, ${first}.`,
        html: emailP(`Vi har fått henvendelsen om ${esc(company)} og går gjennom den nå${lead.website ? ' — inkludert nettsiden dere har i dag' : ''}.`)
          + emailP('Du hører fra oss med et tydelig neste steg, som regel innen én virkedag. Ingen binding, ingen press.')
          + emailP('Har du noe å legge til i mellomtiden, svarer du bare på denne e-posten.'),
        refLabel: 'Ditt behov', refValue: `${lead.need || 'Nettside'} · ${lead.budget || 'budsjett åpent'}`,
      }),
    });

    // Record whether the two mails actually left the building. sendEmail never
    // throws, so without this a silent Resend failure looks exactly like a
    // successful send — the prospect gets a thank-you page and nothing else.
    // Written back onto the lead so the failure is visible in the sales panel.
    lead.mailConfirmOk = customerMail ? !!customerMail.ok : false;
    lead.mailOwnerOk = ownerMail ? !!ownerMail.ok : false;
    const mailErr = (customerMail && customerMail.error) || (ownerMail && ownerMail.error) || '';
    if (mailErr) lead.mailError = String(mailErr).slice(0, 300);
    try { await saveLead(lead); } catch (e) { console.error('[project-intake] mail-status', e.message); }

    res.json({ ok: true, id: lead.id });
  } catch (e) {
    console.error('[project-intake]', e);
    res.status(500).json({ error: 'Kunne ikke sende henvendelsen' });
  }
}
