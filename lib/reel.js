// Reusable reel stitcher. Fetches clips, normalises each to 1080x1920 / FPS
// with a stable timebase, concatenates, and uploads the result to Vercel Blob.
// Used by /api/reel and the MCP build_reel tool.
//
// AI clips render at 24fps; forcing 30 duplicates frames -> judder. Clips must
// ALWAYS be re-encoded — stream-copy concat only decodes the first clip when
// sources differ in codec settings.

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { put } from '@vercel/blob';

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); if (err.length > 20000) err = err.slice(-20000); });
    p.on('error', reject);
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code + ': ' + err.slice(-1500))));
  });
}

// Stitch clips -> one 1080x1920 mp4 buffer.
export async function stitchClips(clips, opts = {}) {
  const fps = Math.min(60, Math.max(12, parseInt(opts.fps, 10) || 24));
  if (!ffmpegPath) throw new Error('ffmpeg mangler paa serveren');
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
    const args = [];
    files.forEach((f) => { args.push('-i', f); });
    let filter = '';
    files.forEach((_, i) => {
      filter += '[' + i + ':v]scale=1080:1920:force_original_aspect_ratio=decrease,'
        + 'pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=' + fps + ',format=yuv420p,'
        + 'settb=AVTB,setpts=PTS-STARTPTS[v' + i + '];';
    });
    files.forEach((_, i) => { filter += '[v' + i + ']'; });
    filter += 'concat=n=' + files.length + ':v=1:a=0[out]';
    args.push('-filter_complex', filter, '-map', '[out]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-an', '-y', out);
    await runFfmpeg(args);
    return await readFile(out);
  } finally {
    if (dir) { try { await rm(dir, { recursive: true, force: true }); } catch (e) {} }
  }
}

// Stitch + upload to Blob, returning the URLs.
export async function stitchToBlob(clips, opts = {}) {
  const data = await stitchClips(clips, opts);
  const saved = await put('reels/staymotion-reel-' + Date.now() + '.mp4', data, {
    access: 'public', contentType: 'video/mp4', addRandomSuffix: false,
  });
  return { url: saved.url, downloadUrl: saved.downloadUrl || saved.url, bytes: data.length, klipp: clips.length };
}
