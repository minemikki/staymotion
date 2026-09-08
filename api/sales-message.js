// Personal message generator. Admin-gated.
//   POST /api/sales-message { leadId?, type?, observation?, offer?, ctx? }
// Returns one message (if type given) or all message types. Pulls context from
// the lead + sales config so the sender identity and offer lines are consistent.

import { generateMessage, generateAll } from '../lib/messages.js';
import { listLeads } from '../lib/leads.js';
import { getConfig } from '../lib/sales-store.js';
import { PACKAGES, VAT } from '../lib/packages.js';

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
  const vatSuffix = vat ? ' ' + vat : '';
  const deposit = Math.round(p.fromKr * p.depositPct / 100);
  return {
    priceLine: p.fromKr.toLocaleString('nb-NO') + ' NOK' + vatSuffix,
    depositLine: p.depositPct < 100
      ? 'Oppstart: ' + deposit.toLocaleString('nb-NO') + ' NOK (' + p.depositPct + ' %). Resten ved levering.'
      : 'Betales ved oppstart.',
  };
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Bruk POST' });
  try {
    const b = req.body || {};
    const config = await getConfig();
    let lead = null;
    if (b.leadId) {
      const leads = await listLeads();
      lead = leads.find((l) => l.id === b.leadId) || null;
    }
    const offer = b.offer || (lead && lead.offer) || '';
    const pl = priceLines(offer, config.vatMode);
    const ctx = Object.assign({
      company: (lead && lead.company) || '',
      contact: (lead && (lead.contact || lead.contactName)) || '',
      observation: b.observation || (lead && lead.topOpportunity) || '',
      senderName: config.senderName,
      studioName: config.studioName,
      contactEmail: config.contactEmail,
      contactPhone: config.contactPhone,
      offer,
      bookingUrl: b.bookingUrl || '',
    }, pl, b.ctx || {});

    if (b.type) {
      const msg = generateMessage(b.type, ctx);
      if (!msg) return res.status(400).json({ error: 'Ukjent meldingstype' });
      return res.json({ ok: true, message: msg });
    }
    res.json({ ok: true, messages: generateAll(ctx) });
  } catch (e) {
    console.error('[sales-message]', e);
    res.status(500).json({ error: 'Kunne ikke generere melding' });
  }
}
