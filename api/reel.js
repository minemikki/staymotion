// Reel merger endpoint. Stitches clips into ONE 1080x1920 mp4 (24fps) on the
// server (Vercel has full network access), stores it in Vercel Blob, and:
//   /api/reel?clips=<u1>,<u2>          -> 302 to the merged file
//   /api/reel?clips=...&json=1         -> {url,downloadUrl,klipp,bytes}
//   /api/reel?clips=...&email=1        -> email the reel to OWNER_EMAIL
//   /api/reel?clips=...&ref=<id>&final=1&key=<ADMIN_KEY>
//        -> stitch AND attach as the order's FINAL (QC) so it lands in admin
// Defaults to a built-in test set when no clips are given.

import { stitchToBlob } from '../lib/reel.js';
import { buildFinal } from '../lib/production.js';
import { sendEmail, renderEmail, emailP } from '../lib/email.js';

export const config = { maxDuration: 300 };

const TEST_CLIPS = [
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_002700_232dfefd-2b3d-4466-aba5-d9b2f02cd0fa.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_001200_c0461909-f991-484d-a56c-1012fe37fbd1.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_003718_6b0a2bee-0973-41e5-8b19-be8a90bd57ff.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_002716_cf62b575-0a32-4a1c-ad8c-94f7dc155b15.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_3ICpxT3JiovisWSJepI8nxeHJvJ/hf_20260905_002725_bb205579-539f-4d7d-a79b-c4224c32686c.mp4',
];

export default async function handler(req, res) {
  const q = req.query || {};
  const clips = q.clips ? String(q.clips).split(',').map((s) => s.trim()).filter(Boolean) : TEST_CLIPS;
  if (!clips.length) return res.status(400).json({ error: 'ingen klipp' });
  try {
    const saved = await stitchToBlob(clips, { fps: q.fps });
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    // Attach straight into an order as its final (QC), gated by ADMIN_KEY.
    if (q.ref && q.final) {
      const adminKey = process.env.ADMIN_KEY;
      const given = q.key || req.headers['x-admin-key'];
      if (!adminKey || given !== adminKey) return res.status(401).json({ error: 'Ikke autorisert (mangler key)' });
      const r = await buildFinal({ orderId: q.ref, url: saved.url, name: 'staymotion_' + q.ref + '_reel.mp4' });
      return res.status(200).json({ ok: true, attachedTo: q.ref, version: r.version, status: 'qc', ...saved });
    }

    if (q.email) {
      const to = (typeof q.email === 'string' && q.email.includes('@')) ? q.email : (process.env.OWNER_EMAIL || 'michael@staymotion.no');
      const tooBig = saved.bytes > 38 * 1024 * 1024;
      let attachment = null;
      if (!tooBig) { const r = await fetch(saved.url); attachment = Buffer.from(await r.arrayBuffer()).toString('base64'); }
      await sendEmail({
        to, subject: 'Din StayMotion-reel er klar',
        html: renderEmail({ kicker: 'Ferdig reel', heading: 'Reelen er satt sammen',
          html: emailP(saved.klipp + ' klipp satt sammen til én video (' + (saved.bytes / 1048576).toFixed(1) + ' MB).')
            + emailP(tooBig ? 'Fila var for stor for e-post — bruk knappen for å laste ned.' : 'Fila ligger vedlagt. Du kan også bruke knappen under.'),
          ctaText: 'Åpne reelen', ctaUrl: saved.downloadUrl }),
        attachments: attachment ? [{ filename: 'staymotion-reel.mp4', content: attachment }] : [],
      });
      return res.status(200).json({ ok: true, sentTo: to, attached: !tooBig, ...saved });
    }

    if (q.json) return res.status(200).json({ ok: true, ...saved });
    res.setHeader('Location', saved.downloadUrl);
    return res.status(302).end();
  } catch (e) {
    console.error('[reel]', e);
    return res.status(500).json({ error: 'Kunne ikke lage reelen: ' + e.message });
  }
}
