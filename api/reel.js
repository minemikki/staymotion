// Server-side reel merger. Vercel has full network access (unlike the agent
// sandbox), so it can fetch the Higgsfield clips and stitch them into ONE MP4.
// The merged file is stored in Vercel Blob (Vercel functions can't return a
// multi-MB body — the 4.5MB response cap crashes them) and we redirect the
// browser to that public URL to download.
//
//   /api/reel                          → merge the built-in test clips
//   /api/reel?clips=<url1>,<url2>,...   → merge these clips in order
//   /api/reel?json=1                   → return {url} instead of redirecting

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { put } from '@vercel/blob';

export const config = { maxDuration: 300 };

const TEST_CLIPS = [
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_002700_232dfefd-2b3d-4466-aba5-d9b2f02cd0fa.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_001200_c0461909-f991-484d-a56c-1012fe37fbd1.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_003718_6b0a2bee-0973-41e5-8b19-be8a90bd57ff.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_002716_cf62b575-0a32-4a1c-ad8c-94f7dc155b15.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_002725_bb205579-539f-4d7d-a79b-c4224c32686c.mp4',
];

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); if (err.length > 20000) err = err.slice(-20000); });
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code + ': ' + err.slice(-1500))));
  });
}

export default async function handler(req, res) {
  const q = req.query || {};
  const clips = q.clips ? String(q.clips).split(',').map((s) => s.trim()).filter(Boolean) : TEST_CLIPS;
  if (!clips.length) return res.status(400).json({ error: 'ingen klipp' });
  if (!ffmpegPath) return res.status(500).json({ error: 'ffmpeg mangler paa serveren' });

  let dir;
  try {
    try { await chmod(ffmpegPath, 0o755); } catch (e) {}
    dir = await mkdtemp(join(tmpdir(), 'reel-'));

    const files = [];
    for (let i = 0; i < clips.length; i++) {
      const r = await fetch(clips[i]);
      if (!r.ok) throw new Error('kunne ikke hente klipp ' + (i + 1) + ' (HTTP ' + r.status + ')');
      const f = join(dir, 'in' + i + '.mp4');
      await writeFile(f, Buffer.from(await r.arrayBuffer()));
      files.push(f);
    }

    const out = join(dir, 'reel.mp4');
    // Fast path: stream-copy concat (no re-encode) — keeps native 1080p, instant.
    const listPath = join(dir, 'list.txt');
    await writeFile(listPath, files.map((f) => "file '" + f + "'").join('\n'));
    try {
      await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', '-y', out]);
    } catch (copyErr) {
      // Fallback: re-encode + normalise to 1080x1920 (handles mixed codecs/sizes).
      const args = [];
      files.forEach((f) => { args.push('-i', f); });
      let filter = '';
      files.forEach((_, i) => { filter += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}];`; });
      files.forEach((_, i) => { filter += `[v${i}]`; });
      filter += `concat=n=${files.length}:v=1:a=0[out]`;
      args.push('-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', out);
      await runFfmpeg(args);
    }

    const data = await readFile(out);
    const saved = await put('reels/staymotion-reel-' + Date.now() + '.mp4', data, {
      access: 'public', contentType: 'video/mp4', addRandomSuffix: false,
    });

    if (q.json) return res.status(200).json({ ok: true, url: saved.url, bytes: data.length });
    res.setHeader('Location', saved.url);
    return res.status(302).end();
  } catch (e) {
    console.error('[reel]', e);
    return res.status(500).json({ error: 'Kunne ikke lage reelen: ' + e.message });
  } finally {
    if (dir) { try { await rm(dir, { recursive: true, force: true }); } catch (e) {} }
  }
}
