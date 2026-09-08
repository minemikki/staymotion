// Sales-engine data store on Vercel Blob, under the `sales/` prefix.
// Kept deliberately separate from orders/ and leads/ so the sales system never
// touches existing customer, order or payment data.
//
//   sales/config.json          — goal + settings (single doc)
//   sales/suppression.json     — opt-out / bounce / complaint list (single doc)
//   sales/sendlog.json         — append-only send + error log (single doc, capped)
//   sales/seq/<leadId>.json    — the approved outreach sequence for one lead
//
// No extra personal data is stored — only what the CRM already holds plus the
// minimum needed for legal, auditable sending (address, timestamp, status).

import { put, list, del } from '@vercel/blob';

const PREFIX = 'sales/';

// ---- generic helpers -------------------------------------------------------

async function fetchJson(url) {
  try {
    const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
    const r = await fetch(bust, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function readDoc(path, fallback) {
  const { blobs } = await list({ prefix: path, limit: 1 });
  const b = blobs.find((x) => x.pathname === path) || null;
  if (!b) return fallback;
  const j = await fetchJson(b.url);
  return j == null ? fallback : j;
}

async function writeDoc(path, data) {
  await put(path, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return data;
}

// ---- config / settings -----------------------------------------------------

export const DEFAULT_CONFIG = {
  // Result goal
  goalKr: 16000,
  deadline: '2026-09-25',
  // Sending safety — starts fully locked down.
  dryRun: true,             // never actually send while true
  killSwitch: false,        // hard stop for all sending
  paused: false,            // soft pause (manual)
  dailyCap: 12,             // 10–15 recommended; quality over volume
  domainVerified: false,    // SPF/DKIM/DMARC confirmed in Resend → set true
  // Norwegian working hours window (local Europe/Oslo), 24h clock.
  workStartHour: 9,
  workEndHour: 16,
  workDays: [1, 2, 3, 4, 5], // Mon–Fri
  // VAT display: 'unknown' | 'incl' | 'excl' | 'exempt'. Unknown → hide the line.
  vatMode: 'unknown',
  // Sender identity shown to recipients (from is set by MAIL_FROM env).
  senderName: 'Michael',
  studioName: 'StayMotion',
  contactPhone: '',
  contactEmail: 'hei@staymotion.no',
  updated: 0,
};

export async function getConfig() {
  const c = await readDoc(PREFIX + 'config.json', null);
  return Object.assign({}, DEFAULT_CONFIG, c || {});
}

export async function saveConfig(patch) {
  const cur = await getConfig();
  const next = Object.assign({}, cur, patch || {}, { updated: Date.now() });
  return writeDoc(PREFIX + 'config.json', next);
}

// ---- suppression list ------------------------------------------------------
// Map of normalised email → { reason, at }. reason: unsubscribe|bounce|complaint|manual|reply

export async function getSuppression() {
  return readDoc(PREFIX + 'suppression.json', {});
}

export async function isSuppressed(email) {
  if (!email) return false;
  const s = await getSuppression();
  return !!s[String(email).trim().toLowerCase()];
}

export async function suppress(email, reason) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  const s = await getSuppression();
  if (!s[e]) s[e] = { reason: reason || 'manual', at: Date.now() };
  await writeDoc(PREFIX + 'suppression.json', s);
  return s[e];
}

export async function unsuppress(email) {
  const e = String(email || '').trim().toLowerCase();
  const s = await getSuppression();
  if (s[e]) { delete s[e]; await writeDoc(PREFIX + 'suppression.json', s); }
  return true;
}

// ---- send / error log (append-only, capped) --------------------------------

const LOG_CAP = 2000;

export async function getLog() {
  return readDoc(PREFIX + 'sendlog.json', { entries: [] });
}

export async function appendLog(entry) {
  const log = await getLog();
  log.entries = log.entries || [];
  log.entries.unshift(Object.assign({ at: Date.now() }, entry));
  if (log.entries.length > LOG_CAP) log.entries = log.entries.slice(0, LOG_CAP);
  await writeDoc(PREFIX + 'sendlog.json', log);
  return entry;
}

// Count real (non dry-run) sends whose timestamp falls on the given local day.
export function countSendsOnDay(log, dayStartMs, dayEndMs) {
  const es = (log && log.entries) || [];
  return es.filter((e) => e.kind === 'send' && !e.dryRun && e.at >= dayStartMs && e.at < dayEndMs).length;
}

// ---- per-lead outreach sequence --------------------------------------------
// A sequence is an ordered list of planned steps with send/skip status.

export async function getSequence(leadId) {
  return readDoc(PREFIX + 'seq/' + leadId + '.json', null);
}

export async function saveSequence(seq) {
  if (!seq || !seq.leadId) throw new Error('sequence needs leadId');
  seq.updated = Date.now();
  return writeDoc(PREFIX + 'seq/' + seq.leadId + '.json', seq);
}

export async function listSequences() {
  const { blobs } = await list({ prefix: PREFIX + 'seq/', limit: 1000 });
  const out = [];
  for (const b of blobs) {
    if (!b.pathname.endsWith('.json')) continue;
    const j = await fetchJson(b.url);
    if (j) out.push(j);
  }
  return out;
}

export async function deleteSequence(leadId) {
  const path = PREFIX + 'seq/' + leadId + '.json';
  const { blobs } = await list({ prefix: path, limit: 1 });
  const b = blobs.find((x) => x.pathname === path) || blobs[0];
  if (b) await del(b.url);
  return true;
}
