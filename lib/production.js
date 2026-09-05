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
    master: { url: masterBlob.url, dlUrl: masterBlob.downloadUrl || masterBlob.url, path: base + 'master.mp4', bytes: master.length },
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

// ---------------------------------------------------------------------------
// FINAL DELIVERY
// ---------------------------------------------------------------------------

const REVISIONS_INCLUDED = { bilder: 0, enkelt: 1, signatur: 2 };
function pkgKey(order) {
  const p = String(order.pkg || order.pakke || '').toLowerCase();
  if (p.indexOf('signatur') >= 0) return 'signatur';
  if (p.indexOf('bilder') >= 0) return 'bilder';
  return 'enkelt';
}
function revisionsIncluded(order) {
  if (typeof order.revisionsIncluded === 'number') return order.revisionsIncluded;
  return REVISIONS_INCLUDED[pkgKey(order)] != null ? REVISIONS_INCLUDED[pkgKey(order)] : 1;
}
function logEvent(order, type, text) {
  order.activity = Array.isArray(order.activity) ? order.activity : [];
  order.activity.push({ at: Date.now(), type, text: text || '' });
  if (order.activity.length > 200) order.activity = order.activity.slice(-200);
}

// Probe duration + resolution by running ffmpeg -i and parsing stderr.
// (ffmpeg-static ships ffmpeg only — no ffprobe — but -i prints stream info.)
function probeMeta(file) {
  return new Promise((resolve) => {
    const p = spawn(ffmpegPath, ['-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', () => resolve({}));
    p.on('close', () => {
      const meta = {};
      const dur = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (dur) meta.durationSec = (+dur[1]) * 3600 + (+dur[2]) * 60 + parseFloat(dur[3]);
      const res = err.match(/,\s*(\d{2,5})x(\d{2,5})/);
      if (res) { meta.width = +res[1]; meta.height = +res[2]; }
      resolve(meta);
    });
  });
}

// Build (or replace) the final delivery video for an order. Stores a versioned
// master + web preview + poster, probes metadata, and parks it in QC awaiting
// admin approval — the customer sees nothing until approveDelivery() runs.
export async function buildFinal({ orderId, url, name }) {
  if (!orderId || !url) throw new Error('orderId og url kreves');
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Fant ikke ordre ' + orderId);

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Kunne ikke hente final (HTTP ' + resp.status + ')');
  const ct = resp.headers.get('content-type') || '';
  const master = Buffer.from(await resp.arrayBuffer());
  if (!master.length) throw new Error('Tom fil');
  if (master.length > MAX_BYTES) throw new Error('Filen er for stor (' + Math.round(master.length / 1048576) + ' MB)');
  if (ct && !/video|octet-stream|mp4|quicktime/i.test(ct)) throw new Error('Uventet filtype: ' + ct);

  // archive any previous final so revisions keep history
  order.finalHistory = Array.isArray(order.finalHistory) ? order.finalHistory : [];
  if (order.final) order.finalHistory.push(order.final);
  const version = (order.final && order.final.version ? order.final.version : order.finalHistory.length) + 1;
  const base = PREFIX + orderId + '/final/v' + version + '/';

  const masterBlob = await put(base + 'final_master.mp4', master, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'video/mp4', cacheControlMaxAge: 31536000,
  });
  const { preview, poster } = await buildPreview(master);
  const previewBlob = await put(base + 'final_preview.mp4', preview, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'video/mp4', cacheControlMaxAge: 31536000,
  });
  const posterBlob = await put(base + 'final_poster.jpg', poster, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'image/jpeg', cacheControlMaxAge: 31536000,
  });
  const check = await fetch(previewBlob.url + '?_=' + Date.now(), { method: 'HEAD' });
  if (!check.ok) throw new Error('Verifisering feilet — final preview ikke lesbar');

  let meta = {};
  try {
    let dir2 = await mkdtemp(join(tmpdir(), 'probe-'));
    const mf = join(dir2, 'm.mp4'); await writeFile(mf, master);
    meta = await probeMeta(mf);
    await rm(dir2, { recursive: true, force: true });
  } catch (e) {}

  order.final = {
    version,
    status: 'qc',                 // awaiting admin approval
    approved: false,
    name: (name || 'staymotion_' + orderId + '_final_v' + version + '.mp4').replace(/[^\w.\-]+/g, '_'),
    master: { url: masterBlob.url, dlUrl: masterBlob.downloadUrl || masterBlob.url, path: base + 'final_master.mp4', bytes: master.length },
    preview: { url: previewBlob.url, path: base + 'final_preview.mp4', bytes: preview.length },
    poster: { url: posterBlob.url, path: base + 'final_poster.jpg' },
    durationSec: meta.durationSec || null,
    width: meta.width || null,
    height: meta.height || null,
    format: order.format || '9:16',
    createdAt: Date.now(),
    approvedAt: null,
    deliveredAt: null,
  };
  if (typeof order.revisionsIncluded !== 'number') order.revisionsIncluded = revisionsIncluded(order);
  logEvent(order, 'final_uploaded', 'Final v' + version + ' lastet opp (QC)');
  await saveOrder(order);
  return { orderId, version, status: 'qc', previewUrl: previewBlob.url, posterUrl: posterBlob.url };
}

// Admin approves the final → order is delivered and the customer can see it.
export async function approveDelivery(orderId, host) {
  const order = await loadOrder(orderId);
  if (!order || !order.final) throw new Error('Ingen final å godkjenne');
  order.final.approved = true;
  order.final.status = 'delivered';
  order.final.approvedAt = Date.now();
  order.final.deliveredAt = Date.now();
  order.status = 'behandlet';          // customer stepper → Ferdig
  order.videoRequested = false;
  if (typeof order.revisionsIncluded !== 'number') order.revisionsIncluded = revisionsIncluded(order);
  logEvent(order, 'delivered', 'Levering godkjent (v' + order.final.version + ')');
  await saveOrder(order);

  // notify the customer — link to the portal, never a huge attachment
  const email = String(order.email || '').trim();
  if (email) {
    try {
      const { signOrder } = await import('./token.js');
      const { sendEmail, renderEmail, emailP } = await import('./email.js');
      const origin = 'https://' + (host || 'staymotion.no');
      let portal = origin + '/minside.html';
      try {
        const tok = signOrder({ orderId, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
        portal = origin + '/ordre.html?ref=' + encodeURIComponent(orderId) + '&t=' + encodeURIComponent(tok);
      } catch (e) {}
      const first = String(order.navn || order.kunde || '').split(' ')[0];
      await sendEmail({
        to: email,
        subject: 'Videoen din er klar 🎬',
        html: renderEmail({
          kicker: 'Levering',
          heading: first ? ('Hei ' + first + ' — videoen din er klar!') : 'Videoen din er klar!',
          html: emailP('Den ferdige cinematiske videoen din ligger nå på Min side.')
            + emailP('Trykk under for å se den og laste den ned i full kvalitet.'),
          ctaText: 'Se og last ned videoen', ctaUrl: portal,
          refLabel: 'Referanse', refValue: String(orderId).toUpperCase(),
        }),
      });
    } catch (e) { console.error('[approveDelivery] email', e.message); }
  }
  return { orderId, status: 'delivered', version: order.final.version };
}

// Customer requests a change on the delivered video.
export async function requestRevision({ orderId, text, host }) {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Fant ikke ordre');
  const msg = String(text || '').trim().slice(0, 2000);
  if (!msg) throw new Error('Tom endringsforespørsel');
  order.revisions = Array.isArray(order.revisions) ? order.revisions : [];
  order.revisions.push({ at: Date.now(), text: msg, handled: false });
  if (order.final) order.final.status = 'revision_requested';
  order.status = 'under_arbeid';       // back into production for the customer
  logEvent(order, 'revision_requested', msg);
  await saveOrder(order);

  const owner = process.env.OWNER_EMAIL || 'michael@staymotion.no';
  try {
    const { sendEmail, renderEmail, emailP } = await import('./email.js');
    const origin = 'https://' + (host || 'staymotion.no');
    await sendEmail({
      to: owner,
      subject: 'Endringsforespørsel — ' + (order.navn || order.kunde || orderId),
      html: renderEmail({
        heading: 'Kunden ba om en endring ✏️',
        html: emailP('<b>' + (order.navn || 'Kunde') + '</b> (ref <b>' + String(orderId).toUpperCase() + '</b>) skrev:')
          + emailP('«' + msg.replace(/</g, '&lt;') + '»'),
        ctaText: 'Åpne admin', ctaUrl: origin + '/admin.html',
      }),
    });
  } catch (e) { console.error('[requestRevision] email', e.message); }
  return { orderId, status: 'revision_requested' };
}
