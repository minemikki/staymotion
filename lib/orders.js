// Order store built on Vercel Blob. Each order lives under
//   orders/<id>/order.json     — metadata (name, email, package, status …)
//   orders/<id>/<filename>     — the customer's uploaded photos
// No separate database needed; the admin dashboard reads straight from Blob.

import { put, list, del } from '@vercel/blob';

const PREFIX = 'orders/';

// Short, clean, human-friendly order reference, e.g. "SM-K7P2QX".
// Alphabet excludes ambiguous chars (0/O/1/I) for easy reading/typing.
export function newRef() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return 'SM-' + s;
}

// Delivery window per package (hours). Express halves it.
const HOURS = { bilder: 24, enkelt: 48, signatur: 48 };

export function deadlineFor(pkg, express, created) {
  const base = HOURS[pkg] || 48;
  const h = express ? Math.round(base / 2) : base;
  return created + h * 3600 * 1000;
}

export async function saveOrder(order) {
  await put(PREFIX + order.id + '/order.json', JSON.stringify(order), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0, // never let the CDN serve a stale order.json
  });
  return order;
}

// Always read order.json fresh. Vercel Blob serves public URLs through a CDN
// that can hand back a stale copy right after an overwrite, so we bust the
// cache with a unique query param and disable the fetch cache. Without this,
// a status change or a new message wouldn't show until the CDN caught up.
async function fetchJson(url) {
  try {
    const bust = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
    const r = await fetch(bust, { cache: 'no-store' });
    return await r.json();
  } catch (e) { return null; }
}

// Group every blob under orders/ into one record per order id.
export async function listOrders() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const map = {};
  for (const b of blobs) {
    const rest = b.pathname.slice(PREFIX.length);
    const id = rest.split('/')[0];
    if (!id) continue;
    if (!map[id]) map[id] = { id, metaBlob: null, photos: [] };
    if (b.pathname.endsWith('/order.json')) map[id].metaBlob = b;
    else map[id].photos.push({ url: b.url, name: rest.split('/').slice(1).join('/'), size: b.size, uploadedAt: b.uploadedAt ? new Date(b.uploadedAt).getTime() : null });
  }
  const orders = [];
  for (const id in map) {
    const m = map[id];
    let order = { id, status: 'ubehandlet' };
    if (m.metaBlob) { const j = await fetchJson(m.metaBlob.url); if (j) order = j; }
    order.photos = m.photos;
    order.photoCount = m.photos.length;
    orders.push(order);
  }
  orders.sort((a, b) => (b.created || 0) - (a.created || 0));
  return orders;
}

// Full view of one order for the customer portal: metadata + customer photos +
// finished deliverables (files the owner uploaded under delivery/).
export async function getOrderView(id) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  let order = { id, status: 'ubehandlet' };
  const photos = [], deliverables = [];
  const head = PREFIX + id + '/';
  for (const b of blobs) {
    if (b.pathname.endsWith('/order.json')) { const j = await fetchJson(b.url); if (j) order = j; continue; }
    const rest = b.pathname.slice(head.length);
    if (rest.startsWith('delivery/')) deliverables.push({ url: b.url, name: rest.slice('delivery/'.length), size: b.size });
    else photos.push({ url: b.url, name: rest, size: b.size, uploadedAt: b.uploadedAt ? new Date(b.uploadedAt).getTime() : null });
  }
  order.photos = photos;
  order.photoCount = photos.length;
  order.deliverables = deliverables;
  return order;
}

// Append a customer note / extra request to the order (customer → us).
export async function addNote(id, text) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.notes = Array.isArray(order.notes) ? order.notes : [];
  order.notes.push({ at: Date.now(), text: String(text).slice(0, 1000) });
  await saveOrder(order);
  return order;
}

// Append a reply from us to the customer (us → customer). Shown on the
// customer's "Min side" and emailed as a notification.
export async function addReply(id, text) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.replies = Array.isArray(order.replies) ? order.replies : [];
  order.replies.push({ at: Date.now(), text: String(text).slice(0, 2000) });
  await saveOrder(order);
  return order;
}

// How many photos are already uploaded for an order (excludes order.json).
export async function countPhotos(id) {
  try {
    const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
    const head = PREFIX + id + '/';
    return blobs.filter((b) => !b.pathname.endsWith('/order.json') && !b.pathname.slice(head.length).startsWith('delivery/')).length;
  } catch (e) { return 0; }
}

// Flag (or unflag) an order as "send to Claude for video production".
export async function setVideoRequest(id, on) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.videoRequested = !!on;
  order.videoRequestedAt = on ? Date.now() : null;
  await saveOrder(order);
  return order;
}

// Store a finished video under the order's delivery/ folder so the customer
// sees it on Min side. Fetches the file from fileUrl (e.g. a Higgsfield URL)
// and clears the video request.
export async function attachDelivery(id, fileUrl, name) {
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error('Kunne ikke hente filen (' + resp.status + ')');
  const buf = Buffer.from(await resp.arrayBuffer());
  const safe = (name || 'staymotion-video.mp4').replace(/[^\w.\-]+/g, '_');
  const saved = await put(PREFIX + id + '/delivery/' + safe, buf, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: resp.headers.get('content-type') || 'video/mp4',
  });
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (meta) { const o = await fetchJson(meta.url); if (o) { o.videoRequested = false; await saveOrder(o); } }
  return saved.url;
}

// Permanently delete an order and everything under it (order.json, photos,
// any delivery files). Used by the admin to clean up test/abandoned orders.
export async function deleteOrder(id) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const urls = blobs.map((b) => b.url);
  if (urls.length) await del(urls);
  return { deleted: urls.length };
}

export async function setStatus(id, status) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.status = status;
  await saveOrder(order);
  return order;
}

// Mark an order as genuinely paid (Stripe confirmed). Records a durable
// paid flag + timestamp so the order counts as a real order forever, even
// if its workflow status changes later. Also moves it into the work queue
// ('ubehandlet') and records the amount actually charged.
export async function markPaid(id, amountKr) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.paid = true;
  if (!order.paidAt) order.paidAt = Date.now();
  if (amountKr != null) order.amountKr = amountKr;
  // Only advance an untouched/awaiting order into the work queue; never
  // clobber a status the owner has already set (e.g. 'behandlet').
  if (!order.status || order.status === 'avventer') order.status = 'ubehandlet';
  await saveOrder(order);
  return order;
}
