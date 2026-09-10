// Legal-sending guardrails for the StayMotion sales engine.
// Pure logic (no I/O) so it is easy to reason about and test. The API layer
// combines these decisions with the store (suppression, log, config).
//
// Norwegian B2B outreach rule of thumb honoured here:
//  - Automatic sending is only allowed to GENERAL business addresses
//    (post@, hei@, kontakt@, booking@ …), to existing customers, or to
//    contacts with documented consent.
//  - Personal addresses (navn@firma.no, private Gmail/Outlook) are blocked for
//    autosend; the system suggests phone / general contact form instead.

import crypto from 'node:crypto';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Generic mailbox local-parts that are role/company addresses, not a person.
const GENERAL_LOCALPARTS = new Set([
  'post', 'hei', 'hallo', 'kontakt', 'kontor', 'booking', 'bestilling',
  'info', 'firmapost', 'salg', 'salgs', 'resepsjon', 'resepsjonen',
  'mail', 'epost', 'e-post', 'hello', 'hei-der', 'oss', 'kundeservice',
  'support', 'service', 'admin', 'noreply', 'no-reply',
]);

// Free/consumer mail providers → treated as personal, never autosend.
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'live.no', 'msn.com', 'yahoo.com', 'yahoo.no', 'icloud.com', 'me.com',
  'online.no', 'start.no', 'getmail.no', 'lyse.net', 'broadpark.no',
  'proton.me', 'protonmail.com', 'hotmail.no', 'outlook.no',
]);

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Classify an address into an autosend eligibility decision (before consent).
//   returns { type: 'general'|'personal'|'invalid', reason, autosendEligible }
export function classifyAddress(email) {
  const e = normalizeEmail(email);
  if (!isValidEmail(e)) {
    return { type: 'invalid', reason: 'Ugyldig e-postadresse.', autosendEligible: false };
  }
  const [local, domain] = e.split('@');
  if (PERSONAL_DOMAINS.has(domain)) {
    return {
      type: 'personal',
      reason: 'Privat e-postleverandør (' + domain + ') — regnes som personlig.',
      autosendEligible: false,
    };
  }
  const localBase = local.replace(/[._-]?\d+$/, ''); // strip trailing digits
  if (GENERAL_LOCALPARTS.has(local) || GENERAL_LOCALPARTS.has(localBase)) {
    return {
      type: 'general',
      reason: 'Generell bedriftsadresse (' + local + '@).',
      autosendEligible: true,
    };
  }
  // Named person at a company domain (navn@firma.no) — treated as a B2B business
  // address (many small firms use fornavn@firma.no). Autosend-eligible; still
  // covered by opt-out/suppression + the unsubscribe footer. Only real personal
  // providers (gmail/hotmail/…) above stay blocked.
  return {
    type: 'business',
    reason: 'Bedriftsadresse (' + local + '@' + domain + ').',
    autosendEligible: true,
  };
}

// Full autosend decision, given the address + lead flags + config + suppression.
//   ctx = { existingCustomer, consent (bool), suppressed (bool) }
// returns { allowed, channel: 'email'|'blocked', reason, suggestion? }
export function canAutosend(email, ctx = {}) {
  const cls = classifyAddress(email);
  if (cls.type === 'invalid') {
    return { allowed: false, channel: 'blocked', reason: cls.reason };
  }
  if (ctx.suppressed) {
    return { allowed: false, channel: 'blocked', reason: 'Adressen står på reservasjonslisten (avmeldt/bounce/klage).' };
  }
  // Consent or existing customer overrides the personal-address block.
  if (ctx.consent || ctx.existingCustomer) {
    return {
      allowed: true, channel: 'email',
      reason: ctx.existingCustomer ? 'Eksisterende kunde.' : 'Dokumentert samtykke.',
    };
  }
  if (cls.autosendEligible) {
    return { allowed: true, channel: 'email', reason: cls.reason };
  }
  return {
    allowed: false, channel: 'blocked', reason: cls.reason,
    suggestion: 'Bruk telefon eller bedriftens kontaktskjema i stedet (manuell kanal).',
  };
}

// Is the given instant inside the configured Norwegian working-hours window?
// Uses Europe/Oslo local time regardless of server timezone.
export function isWithinWorkingHours(config, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo', weekday: 'short', hour: '2-digit', hour12: false,
  }).formatToParts(now);
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const wdStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = parseInt(hourStr, 10) % 24;
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const wd = wdMap[wdStr] ?? 1;
  const days = config.workDays || [1, 2, 3, 4, 5];
  if (!days.includes(wd)) return false;
  return hour >= config.workStartHour && hour < config.workEndHour;
}

// Reasons sending is globally blocked right now (independent of a single address).
// returns { blocked: bool, reasons: string[], liveEnabled: bool }
export function globalSendBlockers(config, env = process.env) {
  const reasons = [];
  const liveEnabled = env.SALES_LIVE === '1' || env.SALES_LIVE === 'true';
  if (config.killSwitch) reasons.push('Kill switch er på.');
  if (config.paused) reasons.push('Utsending er satt på pause.');
  if (config.dryRun) reasons.push('Systemet er i dry-run (ingen ekte e-post sendes).');
  if (!liveEnabled) reasons.push('SALES_LIVE er ikke satt i miljøvariabler.');
  if (!config.domainVerified) reasons.push('Avsenderdomene / SPF/DKIM/DMARC er ikke bekreftet.');
  return { blocked: reasons.length > 0, reasons, liveEnabled };
}

// Deterministic unsubscribe token: HMAC(email) with ORDER_SECRET.
export function unsubToken(email, secret = process.env.ORDER_SECRET || '') {
  const e = normalizeEmail(email);
  if (!secret) return '';
  const sig = crypto.createHmac('sha256', secret).update('unsub:' + e).digest('base64url');
  return sig.slice(0, 24);
}

export function verifyUnsubToken(email, token, secret = process.env.ORDER_SECRET || '') {
  const expect = unsubToken(email, secret);
  if (!expect || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(expect);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Build the required unsubscribe line + link for an outgoing email.
export function unsubscribeFooter(email, origin) {
  const t = unsubToken(email);
  const url = origin + '/api/unsubscribe?e=' + encodeURIComponent(normalizeEmail(email)) + '&t=' + t;
  return {
    url,
    text: '\n\n—\nHvis dette ikke er aktuelt, si bare ifra, så hører du ikke fra meg igjen. '
      + 'Du kan også reservere deg her: ' + url,
  };
}
