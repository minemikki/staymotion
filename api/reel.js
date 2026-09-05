// Server-side reel merger. Vercel has full network access (unlike the agent
// sandbox), so it can fetch the Higgsfield clips and stitch them with ffmpeg
// into ONE downloadable MP4. Open in a browser to download the merged reel.
//
//   /api/reel?clips=<url1>,<url2>,...        (comma-separated clip URLs, in order)
//   /api/reel                                 (falls back to the test clips below)
//
// Silent clips (no audio) are normalised to 1080x1920, 30fps and concatenated
// with hard cuts. Add music/transitions afterwards if wanted.

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export const config = { maxDuration: 300 };

// Michael's 10B apartment reel (default test set).
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
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code + '\n' + err.slice(-2000))));
  });
}

export default async function handler(req, res) {
  const q = req.query || {};
  const clips = q.clips ? String(q.clips).split(',').map((s) => s.trim()).filter(Boolean) : TEST_CLIPS;
  if (!clips.length) return res.status(400).json({ error: 'ingen klipp' });

  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), 'reel-'));
    // download each clip
    const inputs = [];
    for (let i = 0; i < clips.length; i++) {
      const r = await fetch(clips[i]);
      if (!r.ok) throw new Error('kunne ikke hente klipp ' + (i + 1) + ' (HTTP ' + r.status + ')');
      const buf = Buffer.from(await r.arrayBuffer());
      const f = join(dir, 'in' + i + '.mp4');
      await writeFile(f, buf);
      inputs.push(f);
    }

    // build a concat filter: normalise every clip to 1080x1920/30fps, then concat
    const args = [];
    inputs.forEach((f) => { args.push('-i', f); });
    let filter = '';
    inputs.forEach((_, i) => {
      filter += `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}];`;
    });
    inputs.forEach((_, i) => { filter += `[v${i}]`; });
    filter += `concat=n=${inputs.length}:v=1:a=0[out]`;
    const out = join(dir, 'reel.mp4');
    args.push('-filter_complex', filter, '-map', '[out]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-y', out);

    await runFfmpeg(args);
    const data = await readFile(out);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="staymotion-reel.mp4"');
    res.setHeader('Content-Length', String(data.length));
    res.status(200).end(data);
  } catch (e) {
    console.error('[reel]', e);
    res.status(500).json({ error: 'Kunne ikke lage reelen: ' + e.message });
  } finally {
    if (dir) { try { await rm(dir, { recursive: true, force: true }); } catch (e) {} }
  }
}
