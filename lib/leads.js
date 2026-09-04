// CRM lead store on Vercel Blob. One JSON doc per lead under leads/<id>.json.
// Mirrors the orders store; the admin dashboard reads/writes it via
// /api/admin-leads. No photos, just structured CRM data.

import { put, list, del } from '@vercel/blob';

const PREFIX = 'leads/';

export async function saveLead(lead) {
  if (!lead.id) lead.id = 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  if (!lead.created) lead.created = Date.now();
  lead.updated = Date.now();
  await put(PREFIX + lead.id + '.json', JSON.stringify(lead), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return lead;
}

async function fetchJson(url) {
  try { const r = await fetch(url); return await r.json(); } catch (e) { return null; }
}

export async function listLeads() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const out = [];
  for (const b of blobs) {
    if (!b.pathname.endsWith('.json')) continue;
    const j = await fetchJson(b.url);
    if (j) out.push(j);
  }
  out.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  return out;
}

export async function deleteLead(id) {
  const { blobs } = await list({ prefix: PREFIX + id + '.json', limit: 1 });
  const b = blobs.find((x) => x.pathname === PREFIX + id + '.json') || blobs[0];
  if (b) await del(b.url);
  return true;
}
