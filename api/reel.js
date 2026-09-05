// Server-side reel merger. Vercel has full network access (unlike the agent
// sandbox), so it can fetch the clips and stitch them into ONE MP4.
// The merged file is stored in Vercel Blob (a serverless function can't return
// a multi-MB body — the 4.5MB response cap crashes it) and we redirect to the
// Blob downloadUrl so the browser saves it.
//
//   /api/reel                          -> merge the built-in test clips
//   /api/reel?clips=<url1>,<url2>,...  -> merge these clips in order
//   /api/reel?json=1                   -> return {url,downloadUrl} instead of redirecting
//
// NOTE: clips must ALWAYS be re-encoded. Stream-copy concat produces a file
// that only decodes the first clip when the sources differ in codec settings
// (e.g. Veo vs Seedance) — it looks like a corrupt/frozen video.

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { put } from '@vercel/blob';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';

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

    // Always re-encode: normalise every clip to 1080x1920 / 30fps, then concat.
    const out = join(dir, 'reel.mp4');
    const args = [];
    files.forEach((f) => { args.push('-i', f); });
    let filter = '';
    files.forEach((_, i) => {
      filter += '[' + i + ':v]scale=1080:1920:force_original_aspect_ratio=decrease,'
        + 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p,'
        + 'settb=AVTB,setpts=PTS-STARTPTS[v' + i + '];';
    });
    files.forEach((_, i) => { filter += '[v' + i + ']'; });
    filter += 'concat=n=' + files.length + ':v=1:a=0[out]';
    args.push('-filter_complex', filter, '-map', '[out]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-an', '-y', out);
    await runFfmpeg(args);

    const data = await readFile(out);
    const saved = await put('reels/staymotion-reel-' + Date.now() + '.mp4', data, {
      access: 'public', contentType: 'video/mp4', addRandomSuffix: false,
    });

    const dl = saved.downloadUrl || saved.url;
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    // ?email=1 (or ?email=<addr>) — send the finished reel to the inbox as an
    // attachment, so there's no download dance. Resend caps attachments ~40MB.
    if (q.email) {
      const to = (typeof q.email === 'string' && q.email.includes('@'))
        ? q.email
        : (process.env.OWNER_EMAIL || 'michael@staymotion.no');
      const tooBig = data.length > 38 * 1024 * 1024;
      await sendEmail({
        to,
        subject: 'Din StayMotion-reel er klar',
        html: renderEmail({
          kicker: 'Ferdig reel',
          heading: 'Reelen er satt sammen',
          html: emailP(files.length + ' klipp satt sammen til én video ('
            + (data.length / 1048576).toFixed(1) + ' MB).')
            + emailP(tooBig
              ? 'Fila var for stor til å legge ved e-post, så bruk knappen for å laste den ned.'
              : 'Fila ligger vedlagt denne e-posten. Du kan også bruke knappen under.'),
          ctaText: 'Åpne reelen', ctaUrl: dl,
        }),
        attachments: tooBig ? [] : [{ filename: 'staymotion-reel.mp4', content: data.toString('base64') }],
      });
      return res.status(200).json({ ok: true, sentTo: to, klipp: files.length, bytes: data.length, attached: !tooBig, url: saved.url, downloadUrl: dl });
    }

    if (q.json) return res.status(200).json({ ok: true, klipp: files.length, bytes: data.length, url: saved.url, downloadUrl: dl });
    res.setHeader('Location', dl);
    return res.status(302).end();
  } catch (e) {
    console.error('[reel]', e);
    return res.status(500).json({ error: 'Kunne ikke lage reelen: ' + e.message });
  } finally {
    if (dir) { try { await rm(dir, { recursive: true, force: true }); } catch (e) {} }
  }
}
