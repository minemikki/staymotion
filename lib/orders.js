// Order store built on Vercel Blob. Each order lives under
//   orders/<id>/order.json     — metadata (name, email, package, status …)
//   orders/<id>/<filename>     — the customer's uploaded photos
// No separate database needed; the admin dashboard reads straight from Blob.

import { put, list } from '@vercel/blob';

const PREFIX = 'orders/';

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
  });
  return order;
}

async function fetchJson(url) {
  try { const r = await fetch(url); return await r.json(); } catch (e) { return null; }
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
    else map[id].photos.push({ url: b.url, name: rest.split('/').slice(1).join('/'), size: b.size });
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
    else photos.push({ url: b.url, name: rest, size: b.size });
  }
  order.photos = photos;
  order.photoCount = photos.length;
  order.deliverables = deliverables;
  return order;
}

// Append a customer note / extra request to the order.
export async function addNote(id, text) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 10 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.notes = Array.isArray(order.notes) ? order.notes : [];
  order.notes.push({ at: Date.now(), text: String(text).slice(0, 1000) });
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

export async function setStatus(id, status) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 10 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const order = await fetchJson(meta.url);
  if (!order) return null;
  order.status = status;
  await saveOrder(order);
  return order;
}
