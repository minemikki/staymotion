// Quick contact — a short "skriv en melding" form for people who don't want
// the full 7-step intake. Saves the message as a lead (so it shows up in the
// sales panel like every other inquiry) and emails the owner directly, so a
// visitor's message always lands in the inbox instead of just opening their
// mail client.
//   POST /api/contact { name, email, message, hp }

import { saveLead } from '../lib/leads.js';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';

const s = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const esc = (t) => String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body || {};
    // Honeypot: bots fill the hidden field; humans never see it.
    if (b.hp) return res.json({ ok: true });

    const email = s(b.email, 160).toLowerCase();
    const name = s(b.name, 120);
    const message = s(b.message, 2000);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
      return res.status(400).json({ error: 'Mangler gyldig e-post eller melding' });
    }

    const lead = {
      source: 'contact',
      stage: 'klar',
      contact: name || email,
      company: name || 'Ukjent',
      email,
      notes: message,
      segment: 'annet',
      priorityScore: 95,
      nextAction: 'Svar på henvendelse',
      nextActionDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    };
    await saveLead(lead);

    const owner = process.env.OWNER_EMAIL || 'michael@staymotion.no';
    const origin = `https://${req.headers.host}`;
    const ownerMail = await sendEmail({
      to: owner,
      subject: `Ny melding${name ? ' — ' + name : ''}`,
      html: renderEmail({
        kicker: 'Ny henvendelse',
        heading: name ? `${name} skrev til deg` : 'Noen skrev til deg',
        html: emailP(`<b style="color:#111820">Fra:</b> ${esc(name || 'ikke oppgitt')} · ${esc(email)}`)
          + emailP(esc(message).replace(/\n/g, '<br>')),
        ctaText: 'Åpne i salgspanelet', ctaUrl: `${origin}/salg.html?v=leads`,
      }),
    });
    lead.mailOwnerOk = ownerMail ? !!ownerMail.ok : false;
    if (ownerMail && ownerMail.error) lead.mailError = String(ownerMail.error).slice(0, 300);
    try { await saveLead(lead); } catch (e) { console.error('[contact] mail-status', e.message); }

    res.json({ ok: true });
  } catch (e) {
    console.error('[contact]', e);
    res.status(500).json({ error: 'Kunne ikke sende meldingen' });
  }
}
