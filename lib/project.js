// Web-project workflow on top of the order store.
//
//   order.project = {
//     stage:       'strategi' | 'design' | 'bygg' | 'review' | 'lansert',
//     stagingUrl:  preview the customer can review,
//     liveUrl:     the launched site,
//     checklist:   { [key]: true }   admin launch checklist,
//     notes:       internal notes (never shown to the customer),
//     updatedAt, launchedAt
//   }
//
// The legacy `status` field (ubehandlet / under_arbeid / behandlet) is kept in
// sync so older screens and the customer portal keep working.

import { list } from '@vercel/blob';
import { saveOrder } from './orders.js';

const PREFIX = 'orders/';
export const STAGES = ['strategi', 'design', 'bygg', 'review', 'lansert'];
const STATUS_FOR = { strategi: 'ubehandlet', design: 'under_arbeid', bygg: 'under_arbeid', review: 'under_arbeid', lansert: 'behandlet' };

async function fetchJson(url) {
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
    return await r.json();
  } catch (e) { return null; }
}

export async function loadOrder(id) {
  const { blobs } = await list({ prefix: PREFIX + id + '/', limit: 1000 });
  const meta = blobs.find((b) => b.pathname.endsWith('/order.json'));
  return meta ? fetchJson(meta.url) : null;
}

function logEvent(order, type, text) {
  order.activity = Array.isArray(order.activity) ? order.activity : [];
  order.activity.push({ at: Date.now(), type, text: text || '' });
  if (order.activity.length > 200) order.activity = order.activity.slice(-200);
}

const cleanUrl = (u) => {
  let s = String(u || '').trim().slice(0, 500);
  if (s && !/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s;
};

// Patch any subset of the project fields.
export async function updateProject(id, patch) {
  const order = await loadOrder(id);
  if (!order) throw new Error('Fant ikke prosjektet');
  const p = order.project && typeof order.project === 'object' ? order.project : {};
  if (patch.stage !== undefined) {
    if (!STAGES.includes(patch.stage)) throw new Error('Ukjent fase');
    if (p.stage !== patch.stage) logEvent(order, 'stage', 'Fase: ' + patch.stage);
    p.stage = patch.stage;
    order.status = STATUS_FOR[patch.stage];
    // Moving the project forward resolves any open change request.
    if (patch.stage !== 'review' && Array.isArray(order.revisions)) order.revisions.forEach((r) => { r.handled = true; });
  }
  if (patch.stagingUrl !== undefined) p.stagingUrl = cleanUrl(patch.stagingUrl);
  if (patch.liveUrl !== undefined) p.liveUrl = cleanUrl(patch.liveUrl);
  if (patch.notes !== undefined) p.notes = String(patch.notes || '').slice(0, 4000);
  if (patch.checklist && typeof patch.checklist === 'object') {
    p.checklist = p.checklist && typeof p.checklist === 'object' ? p.checklist : {};
    for (const k of Object.keys(patch.checklist)) {
      if (patch.checklist[k]) p.checklist[String(k).slice(0, 40)] = true; else delete p.checklist[k];
    }
  }
  p.updatedAt = Date.now();
  order.project = p;
  await saveOrder(order);
  return order;
}

// Mark the project launched: stage → lansert, status → behandlet, and tell
// the customer where their new site lives.
export async function launchProject(id, host) {
  const order = await loadOrder(id);
  if (!order) throw new Error('Fant ikke prosjektet');
  const p = order.project && typeof order.project === 'object' ? order.project : {};
  const live = cleanUrl(p.liveUrl);
  if (!live) throw new Error('Legg inn live-URL før lansering');
  p.liveUrl = live;
  p.stage = 'lansert';
  p.launchedAt = Date.now();
  p.updatedAt = Date.now();
  order.project = p;
  order.status = 'behandlet';
  if (Array.isArray(order.revisions)) order.revisions.forEach((r) => { r.handled = true; });
  logEvent(order, 'launched', 'Lansert: ' + live);
  await saveOrder(order);

  const email = String(order.email || '').trim();
  if (email) {
    try {
      const { signOrder } = await import('./token.js');
      const { sendEmail, renderEmail, emailP } = await import('./email.js');
      const origin = 'https://' + (host || 'staymotion.no');
      let portal = origin + '/minside.html';
      try {
        const tok = signOrder({ orderId: id, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
        portal = origin + '/ordre.html?ref=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(tok);
      } catch (e) {}
      const first = String(order.navn || order.kunde || '').split(' ')[0];
      await sendEmail({
        to: email,
        subject: 'Nettsiden din er lansert 🚀',
        html: renderEmail({
          kicker: 'Lansering',
          heading: first ? ('Gratulerer, ' + first + ' — nettsiden din er live.') : 'Nettsiden din er live.',
          html: emailP('Den nye nettsiden er publisert og klar for kundene dine.')
            + emailP('Vi følger med den første tiden og justerer om noe trenger finpuss. Ønsker du løpende oppdateringer, analyse og forbedringer, spør oss om StayMotion Care.')
            + emailP('Prosjektportalen din finner du <a href="' + portal + '" style="color:#1597A8">her</a>.'),
          ctaText: 'Åpne nettsiden', ctaUrl: live,
          refLabel: 'Prosjekt', refValue: String(id).toUpperCase(),
        }),
      });
    } catch (e) { console.error('[launchProject] email', e.message); }
  }
  return { orderId: id, stage: 'lansert', liveUrl: live };
}

// Tell the customer a preview is ready for review (stage → review).
export async function sendForReview(id, host) {
  const order = await loadOrder(id);
  if (!order) throw new Error('Fant ikke prosjektet');
  const p = order.project && typeof order.project === 'object' ? order.project : {};
  const staging = cleanUrl(p.stagingUrl);
  if (!staging) throw new Error('Legg inn forhåndsvisnings-URL først');
  p.stagingUrl = staging;
  p.stage = 'review';
  p.reviewSentAt = Date.now();
  p.updatedAt = Date.now();
  order.project = p;
  order.status = 'under_arbeid';
  if (Array.isArray(order.revisions)) order.revisions.forEach((r) => { r.handled = true; });
  logEvent(order, 'review', 'Sendt til gjennomgang: ' + staging);
  await saveOrder(order);

  const email = String(order.email || '').trim();
  if (email) {
    try {
      const { signOrder } = await import('./token.js');
      const { sendEmail, renderEmail, emailP } = await import('./email.js');
      const origin = 'https://' + (host || 'staymotion.no');
      let portal = origin + '/minside.html';
      try {
        const tok = signOrder({ orderId: id, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
        portal = origin + '/ordre.html?ref=' + encodeURIComponent(id) + '&t=' + encodeURIComponent(tok);
      } catch (e) {}
      const first = String(order.navn || order.kunde || '').split(' ')[0];
      await sendEmail({
        to: email,
        subject: 'Nettsiden din er klar for gjennomgang',
        html: renderEmail({
          kicker: 'Gjennomgang',
          heading: first ? ('Hei ' + first + ' — ta en titt på utkastet.') : 'Ta en titt på utkastet.',
          html: emailP('Et utkast av nettsiden din er klart. Se gjennom på mobil og desktop, og gi oss tilbakemelding i prosjektportalen.')
            + emailP('Når du er fornøyd, gjør vi siste finpuss og lanserer.'),
          ctaText: 'Se utkastet', ctaUrl: portal,
          refLabel: 'Prosjekt', refValue: String(id).toUpperCase(),
        }),
      });
    } catch (e) { console.error('[sendForReview] email', e.message); }
  }
  return { orderId: id, stage: 'review', stagingUrl: staging };
}
