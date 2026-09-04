// Recovery jobs — DORMANT by default. Sends one gentle nudge to:
//   1) abandoned checkouts: order status "avventer", has email, >2h old
//   2) abandoned uploads:  order paid (ubehandlet) with 0 photos, >6h old
// Safe: does nothing unless RECOVERY_ENABLED=1, admin-gated, and each order
// is nudged at most once (flags stored on the order). No Vercel cron is wired,
// so it only runs when you open the URL yourself (or wire a schedule later).

import { listOrders, saveOrder } from '../lib/orders.js';
import { sendEmail } from '../lib/email.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key || !!req.headers['x-vercel-cron'];
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  if (process.env.RECOVERY_ENABLED !== '1') {
    return res.json({ skipped: 'disabled', hint: 'Sett RECOVERY_ENABLED=1 i Vercel for å aktivere.' });
  }
  const dry = (req.query && (req.query.dry === '1'));
  const origin = `https://${req.headers.host}`;
  const now = Date.now();
  const H = 3600 * 1000;
  let checkout = 0, upload = 0;

  try {
    const orders = await listOrders();
    for (const o of orders) {
      if (!o.email) continue;

      // 1) Abandoned checkout
      if (o.status === 'avventer' && !o.recoveryNudged && o.created && (now - o.created) > 2 * H) {
        if (!dry) {
          const link = `${origin}/bestill.html?pkg=${encodeURIComponent(o.pkg || '')}${o.express ? '&express=1' : ''}`;
          await sendEmail({
            to: o.email,
            subject: 'Du var nesten i mål med bestillingen',
            html: `<p>Hei${o.navn ? ' ' + o.navn.split(' ')[0] : ''}!</p>
              <p>Jeg så at du var nesten ferdig med å bestille <b>${o.pakke || 'en video'}</b> hos StayMotion, men at betalingen ikke gikk helt gjennom.</p>
              <p>Vil du fullføre? Det tar et halvt minutt: <a href="${link}">Fullfør bestillingen her</a>.</p>
              <p>Er det noe du lurer på, bare svar på denne e-posten.</p>
              <p>Michael, StayMotion</p>`,
          });
          o.recoveryNudged = true;
          await saveOrder(o);
        }
        checkout++;
      }

      // 2) Abandoned upload (paid, no photos)
      if (o.status === 'ubehandlet' && (o.photoCount === 0 || !o.photoCount) && !o.uploadNudged && o.created && (now - o.created) > 6 * H) {
        if (!dry) {
          await sendEmail({
            to: o.email,
            subject: 'Vi er klare — vi mangler bare bildene dine',
            html: `<p>Hei${o.navn ? ' ' + o.navn.split(' ')[0] : ''}!</p>
              <p>Takk for bestillingen din på <b>${o.pakke || 'video'}</b>. Vi er klare til å sette i gang så snart vi har bildene dine.</p>
              <p>Fant du ikke opplastingslenken? Svar på denne e-posten med bildene, så ordner vi resten.</p>
              <p>Michael, StayMotion</p>`,
          });
          o.uploadNudged = true;
          await saveOrder(o);
        }
        upload++;
      }
    }
    res.json({ ok: true, dry, checkoutNudged: checkout, uploadNudged: upload });
  } catch (e) {
    console.error('[recover]', e);
    res.status(500).json({ error: 'Recovery-jobb feilet' });
  }
}
