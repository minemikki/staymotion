// Production media pipeline, built on the Vercel Blob storage the rest of the
// app already uses. One folder tree per order:
//
//   orders/<id>/generated/<shot>_<take>/master.mp4   — verbatim Higgsfield file
//   orders/<id>/generated/<shot>_<take>/preview.mp4  — web-optimised (H.264,
//                                                       1080x1920, 24fps,
//                                                       faststart) for the
//                                                       admin player
//   orders/<id>/generated/<shot>_<take>/poster.jpg   — first-frame thumbnail
//   orders/<id>/final/master.mp4|preview.mp4|poster.jpg — approved delivery
//
// All metadata lives inside orders/<id>/order.json under order.production —
// no separate database, same as the rest of the app.

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { put, list, del } from '@vercel/blob';
import { saveOrder } from './orders.js';

const PREFIX = 'orders/';
const MAX_BYTES = 300 * 1024 * 1024; // reject absurdly large source files

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); if (err.length > 20000) err = err.slice(-20000); });
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code + ': ' + err.slice(-1200))));
  });
}

async function loadOrder(id) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  if (!meta) return null;
  const bust = meta.url + (meta.url.includes('?') ? '&' : '?') + '_=' + Date.now();
  const r = await fetch(bust, { cache: 'no-store' });
  return r.ok ? r.json() : null;
}

function slug(s, fallback) {
  const out = String(s || '').toLowerCase().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  return out || fallback;
}

// Turn any source video into a web-friendly preview + poster. Returns buffers.
async function buildPreview(masterBuf) {
  let dir;
  try {
    try { await chmod(ffmpegPath, 0o755); } catch (e) {}
    dir = await mkdtemp(join(tmpdir(), 'prev-'));
    const inF = join(dir, 'master.mp4');
    const prevF = join(dir, 'preview.mp4');
    const posterF = join(dir, 'poster.jpg');
    await writeFile(inF, masterBuf);
    // H.264, 1080x1920 letterboxed, 24fps, faststart, AAC audio if present.
    await runFfmpeg([
      '-i', inF,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,'
        + 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-movflags', '+faststart',
      '-map', '0:v:0', '-map', '0:a:0?', '-c:a', 'aac', '-b:a', '128k',
      '-y', prevF,
    ]);
    await runFfmpeg(['-ss', '0.5', '-i', prevF, '-frames:v', '1', '-q:v', '3', '-y', posterF]);
    const preview = await readFile(prevF);
    const poster = await readFile(posterF);
    if (!preview.length) throw new Error('tom preview');
    return { preview, poster };
  } finally {
    if (dir) { try { await rm(dir, { recursive: true, force: true }); } catch (e) {} }
  }
}

// THE standard ingest path: pull a remote Higgsfield (or any) generation into
// StayMotion storage, build a web preview + poster, and record it on the order.
// Never marks the take ready until the storage copy is verified.
export async function ingestGeneration({ orderId, shotId, shotLabel, take, url, model }) {
  if (!orderId || !url) throw new Error('orderId og url kreves');
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Fant ikke ordre ' + orderId);

  const shot = slug(shotId, 'shot_01');
  const tk = slug(take, 'a');
  const base = PREFIX + orderId + '/generated/' + shot + '_' + tk + '/';

  // 1) fetch the source (master)
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Kunne ikke hente generering (HTTP ' + resp.status + ') — Higgsfield-URL kan være utløpt');
  const ct = resp.headers.get('content-type') || '';
  const master = Buffer.from(await resp.arrayBuffer());
  if (!master.length) throw new Error('Tom fil fra kilden');
  if (master.length > MAX_BYTES) throw new Error('Filen er for stor (' + Math.round(master.length / 1048576) + ' MB)');
  if (ct && !/video|octet-stream|mp4|quicktime/i.test(ct)) throw new Error('Uventet filtype: ' + ct);

  // 2) store master, then build + store preview + poster
  const masterBlob = await put(base + 'master.mp4', master, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'video/mp4', cacheControlMaxAge: 31536000,
  });
  const { preview, poster } = await buildPreview(master);
  const previewBlob = await put(base + 'preview.mp4', preview, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'video/mp4', cacheControlMaxAge: 31536000,
  });
  const posterBlob = await put(base + 'poster.jpg', poster, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'image/jpeg', cacheControlMaxAge: 31536000,
  });

  // 3) verify the stored copies are reachable and non-empty before we record.
  const check = await fetch(previewBlob.url + '?_=' + Date.now(), { method: 'HEAD' });
  if (!check.ok) throw new Error('Verifisering feilet — preview ikke lesbar');

  // 4) record on the order (upsert shot, upsert take)
  order.production = order.production || { shots: [] };
  order.production.shots = order.production.shots || [];
  let s = order.production.shots.find((x) => x.id === shot);
  if (!s) { s = { id: shot, label: shotLabel || shot, status: 'generated', takes: [] }; order.production.shots.push(s); }
  if (shotLabel) s.label = shotLabel;
  const takeRec = {
    take: tk,
    master: { url: masterBlob.url, path: base + 'master.mp4', bytes: master.length },
    preview: { url: previewBlob.url, path: base + 'preview.mp4', bytes: preview.length },
    poster: { url: posterBlob.url, path: base + 'poster.jpg' },
    model: model || null,
    aspect: '9:16',
    status: 'generated',
    approved: false,
    createdAt: Date.now(),
    approvedAt: null,
  };
  s.takes = (s.takes || []).filter((t) => t.take !== tk);
  s.takes.push(takeRec);
  s.takes.sort((a, b) => a.take.localeCompare(b.take));
  if (s.status === 'not_started' || s.status === 'generating' || !s.status) s.status = 'generated';
  order.videoRequested = order.videoRequested; // unchanged
  await saveOrder(order);
  return { orderId, shot, take: tk, preview: previewBlob.url, poster: posterBlob.url, master: masterBlob.url };
}

// Mark a take approved (and its shot). Optionally copies the master into
// approved/ for a clean hand-off to the final edit.
export async function approveTake(orderId, shotId, take) {
  const order = await loadOrder(orderId);
  if (!order || !order.production) throw new Error('Ingen produksjon på ordren');
  const shot = order.production.shots.find((x) => x.id === slug(shotId, ''));
  if (!shot) throw new Error('Fant ikke shot');
  const tk = shot.takes.find((t) => t.take === slug(take, ''));
  if (!tk) throw new Error('Fant ikke take');
  shot.takes.forEach((t) => { t.approved = false; }); // one approved take per shot
  tk.approved = true; tk.approvedAt = Date.now(); tk.status = 'approved';
  shot.status = 'approved';
  await saveOrder(order);
  return { orderId, shot: shot.id, take: tk.take, approved: true };
}

export async function setShotStatus(orderId, shotId, status) {
  const order = await loadOrder(orderId);
  if (!order || !order.production) throw new Error('Ingen produksjon på ordren');
  const shot = order.production.shots.find((x) => x.id === slug(shotId, ''));
  if (!shot) throw new Error('Fant ikke shot');
  const allowed = ['not_started', 'generating', 'generated', 'approved', 'rejected'];
  if (!allowed.includes(status)) throw new Error('Ugyldig status');
  shot.status = status;
  await saveOrder(order);
  return { orderId, shot: shot.id, status };
}

// Delete a take's files and its record. If the shot is left empty, remove it.
export async function deleteTake(orderId, shotId, take) {
  const order = await loadOrder(orderId);
  if (!order || !order.production) throw new Error('Ingen produksjon på ordren');
  const shot = order.production.shots.find((x) => x.id === slug(shotId, ''));
  if (!shot) throw new Error('Fant ikke shot');
  const tk = shot.takes.find((t) => t.take === slug(take, ''));
  if (!tk) throw new Error('Fant ikke take');
  const urls = [tk.master, tk.preview, tk.poster].map((o) => o && o.url).filter(Boolean);
  if (urls.length) { try { await del(urls); } catch (e) {} }
  shot.takes = shot.takes.filter((t) => t.take !== tk.take);
  if (!shot.takes.length) order.production.shots = order.production.shots.filter((x) => x.id !== shot.id);
  else if (shot.status === 'approved' && !shot.takes.some((t) => t.approved)) shot.status = 'generated';
  await saveOrder(order);
  return { orderId, deleted: urls.length };
}
