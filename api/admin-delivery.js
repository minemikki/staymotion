// Internal delivery checklist. Admin-gated with the same ADMIN_KEY as the rest
// of the sales/admin area. Reads and writes the EXISTING order store — the
// checklist lives inside orders/<id>/order.json under project.delivery, so
// there is no second database and no parallel project system.
//
//   GET  /api/admin-delivery?key=...             → every won/paid project (compact)
//   GET  /api/admin-delivery?key=...&id=SM-XXXX  → one project, full checklist
//   POST { orderId, op:'item',   itemKey, status?, note?, doc? }
//   POST { orderId, op:'facts',  facts:{…} }
//   POST { orderId, op:'report' }                → generate + store the handover report
//
// Never stores passwords or secrets; lib/delivery.js enforces that.

import { listOrders } from '../lib/orders.js';
import { isReelOrder } from '../lib/packages.js';
import { loadOrder } from '../lib/project.js';
import { getConfig } from '../lib/sales-store.js';
import { summarise, setItem, setFacts, generateReport, PHASES, FACT_SECTIONS, STATUS_LABEL } from '../lib/delivery.js';

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

// A project worth showing on the delivery board: a WEBDESIGN order that is
// paid or already moved into the web-project workflow. Orders from the old
// video business have no delivery checklist to run and only add noise here.
// Abandoned checkout attempts stay out too.
function isProject(o) {
  if (isReelOrder(o)) return false;
  return !!o.paid || !!o.project || o.status === 'ubehandlet' || o.status === 'under_arbeid' || o.status === 'behandlet';
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    if (req.method === 'GET') {
      const id = req.query && req.query.id;
      if (id) {
        const order = await loadOrder(id);
        if (!order) return res.status(404).json({ error: 'Fant ikke prosjektet' });
        return res.json({ ok: true, project: summarise(order), spec: { phases: PHASES, facts: FACT_SECTIONS, statusLabel: STATUS_LABEL } });
      }
      const orders = (await listOrders()).filter(isProject);
      const projects = orders.map((o) => {
        const s = summarise(o);
        // compact row — the board doesn't need every item
        return {
          orderId: s.orderId, company: s.company, email: s.email,
          pkg: s.pkg, pkgName: s.pkgName, paid: s.paid, stage: s.stage,
          pct: s.pct, done: s.done, total: s.total,
          launchReady: s.launchReady, blockerCount: s.hardBlockers.length,
          remaining: s.blockers.length - s.hardBlockers.length,
          waitingCount: s.waitingOnCustomer.length,
          currentPhase: s.currentPhase, liveUrl: s.liveUrl,
          updatedAt: s.updatedAt, created: o.created || 0,
        };
      });
      projects.sort((a, b) => (b.created || 0) - (a.created || 0));
      return res.json({ ok: true, projects, spec: { phases: PHASES, facts: FACT_SECTIONS, statusLabel: STATUS_LABEL } });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Bruk GET eller POST' });

    const b = req.body || {};
    if (!b.orderId) return res.status(400).json({ error: 'Mangler orderId' });

    if (b.op === 'item') {
      if (!b.itemKey) return res.status(400).json({ error: 'Mangler itemKey' });
      const patch = {};
      if (b.status !== undefined) patch.status = b.status;
      if (b.note !== undefined) patch.note = b.note;
      if (b.doc !== undefined) patch.doc = b.doc;
      const project = await setItem(b.orderId, b.itemKey, patch);
      return res.json({ ok: true, project });
    }

    if (b.op === 'facts') {
      const project = await setFacts(b.orderId, b.facts || {});
      return res.json({ ok: true, project });
    }

    if (b.op === 'report') {
      const config = await getConfig().catch(() => ({}));
      const r = await generateReport(b.orderId, config);
      return res.json({ ok: true, report: r.text, at: r.at, project: r.summary });
    }

    return res.status(400).json({ error: 'Ukjent operasjon' });
  } catch (e) {
    console.error('[admin-delivery]', e);
    res.status(400).json({ error: e.message || 'Leveransefeil' });
  }
}
