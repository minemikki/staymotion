// Shared StayMotion MCP core (Model Context Protocol over HTTP, JSON-RPC 2.0).
// Two thin endpoints call serveMcp() with the token they extracted:
//   /api/mcp            → token from Authorization header or ?key=
//   /api/mcp/<token>    → token from the URL path (so it rides on EVERY request,
//                         incl. Claude's connection check → never a 401)

import { listOrders, getOrderView, setStatus, addReply, attachDelivery } from './orders.js';
import { signOrder } from './token.js';
import { sendEmail, renderEmail, emailP } from './email.js';

const PROTOCOL_VERSION = '2024-11-05';
const paid = (o) => !!(o.paid || o.paidAt);
const summary = (o) => ({
  ref: o.id,
  navn: o.navn || o.kunde || '',
  email: o.email || '',
  pakke: o.pakke || o.pkg || '',
  format: o.format || '',
  express: !!o.express,
  status: o.status || 'ubehandlet',
  betalt: paid(o),
  antallBilder: o.photoCount != null ? o.photoCount : (o.photos ? o.photos.length : 0),
  bestilt: o.created || null,
  frist: o.deadline || null,
  melding: o.melding || '',
  sendtTilClaude: !!o.videoRequested,           // Michael trykket "Send til Claude"
  levert: !!(o.deliverables && o.deliverables.length),
});

const TOOLS = [
  {
    name: 'list_new_orders',
    description: 'Nye betalte bestillinger som venter på en video (betalt og ikke merket Ferdig), nyeste først. Bruk denne for å se hva som skal produseres.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_orders',
    description: 'List bestillinger. Valgfritt filter på status: ubehandlet, under_arbeid, behandlet, eller "paabegynt" (ubetalte).',
    inputSchema: {
      type: 'object',
      properties: { status: { type: 'string', description: 'ubehandlet | under_arbeid | behandlet | paabegynt' } },
      additionalProperties: false,
    },
  },
  {
    name: 'get_order',
    description: 'Full info om én bestilling inkl. DIREKTE bilde-URLer (til å hente inn i videoproduksjon), kundens melding og hele samtalen.',
    inputSchema: {
      type: 'object',
      properties: { ref: { type: 'string', description: 'Ordre-referanse, f.eks. SM-XXXXXX' } },
      required: ['ref'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_status',
    description: 'Sett status kunden ser på Min side: ubehandlet (i kø), under_arbeid, eller behandlet (ferdig).',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string' },
        status: { type: 'string', enum: ['ubehandlet', 'under_arbeid', 'behandlet'] },
      },
      required: ['ref', 'status'],
      additionalProperties: false,
    },
  },
  {
    name: 'reply_to_customer',
    description: 'Send en melding til kunden. Vises på Min side og sendes som e-postvarsel med lenke.',
    inputSchema: {
      type: 'object',
      properties: { ref: { type: 'string' }, text: { type: 'string' } },
      required: ['ref', 'text'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_video_requests',
    description: 'Bestillinger Michael har trykket "Send til Claude" på og som IKKE er levert ennå. Dette er køen med videoer som skal produseres nå.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'attach_video',
    description: 'Lever en ferdig video til en bestilling: henter filen fra url (f.eks. en Higgsfield-video-URL), lagrer den på kundens Min side, fjerner "Send til Claude"-flagget og setter status Ferdig.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string' },
        url: { type: 'string', description: 'Direkte URL til den ferdige videoen' },
        filename: { type: 'string', description: 'Valgfritt filnavn, f.eks. staymotion-reel.mp4' },
      },
      required: ['ref', 'url'],
      additionalProperties: false,
    },
  },
];

async function findOrder(ref) {
  const want = String(ref || '').trim().toLowerCase();
  const orders = await listOrders();
  return orders.find((o) => String(o.id || '').toLowerCase() === want) || null;
}

async function runTool(name, args, host) {
  args = args || {};
  if (name === 'list_new_orders') {
    const orders = await listOrders();
    const list = orders.filter((o) => paid(o) && (o.status || 'ubehandlet') !== 'behandlet')
      .sort((a, b) => (b.created || 0) - (a.created || 0)).map(summary);
    return { antall: list.length, bestillinger: list };
  }
  if (name === 'list_orders') {
    const orders = await listOrders();
    let list;
    if (args.status === 'paabegynt') list = orders.filter((o) => !paid(o));
    else if (args.status) list = orders.filter((o) => paid(o) && (o.status || 'ubehandlet') === args.status);
    else list = orders.filter(paid);
    return { antall: list.length, bestillinger: list.map(summary) };
  }
  if (name === 'get_order') {
    const found = await findOrder(args.ref);
    if (!found) return { error: 'Fant ingen bestilling med ref ' + args.ref };
    const o = await getOrderView(found.id);
    return {
      ...summary({ ...o, id: found.id }),
      bildeUrler: (o.photos || []).map((p) => p.url),
      leveranser: (o.deliverables || []).map((d) => ({ navn: d.name, url: d.url })),
      samtale: []
        .concat((o.replies || []).map((m) => ({ fra: 'oss', tekst: m.text, tid: m.at })))
        .concat((o.notes || []).map((m) => ({ fra: 'kunde', tekst: m.text, tid: m.at })))
        .sort((a, b) => (a.tid || 0) - (b.tid || 0)),
    };
  }
  if (name === 'set_status') {
    const found = await findOrder(args.ref);
    if (!found) return { error: 'Fant ingen bestilling med ref ' + args.ref };
    const o = await setStatus(found.id, args.status);
    return { ok: true, ref: found.id, status: o ? o.status : args.status };
  }
  if (name === 'reply_to_customer') {
    const text = String(args.text || '').trim();
    if (!text) return { error: 'Tom melding' };
    const found = await findOrder(args.ref);
    if (!found) return { error: 'Fant ingen bestilling med ref ' + args.ref };
    const order = await addReply(found.id, text);
    if (!order) return { error: 'Kunne ikke lagre meldingen' };
    let emailed = false;
    const email = String(order.email || '').trim();
    if (email) {
      try {
        const origin = `https://${host}`;
        let portalUrl = `${origin}/minside.html`;
        try {
          const tok = signOrder({ orderId: found.id, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 90 });
          portalUrl = `${origin}/ordre.html?ref=${encodeURIComponent(found.id)}&t=${encodeURIComponent(tok)}`;
        } catch (e) {}
        const first = (order.navn || '').split(' ')[0];
        await sendEmail({
          to: email,
          subject: 'Ny melding om bestillingen din — StayMotion',
          html: renderEmail({
            kicker: 'Ny melding',
            heading: first ? `Hei ${first}!` : 'Du har en ny melding',
            html: emailP('Vi har lagt igjen en melding om bestillingen din:') +
              emailP(`<b style="color:#111820">${text.replace(/</g, '&lt;')}</b>`) +
              emailP('Åpne «Min side» for å svare oss eller følge bestillingen.'),
            ctaText: 'Åpne Min side',
            ctaUrl: portalUrl,
            refLabel: 'Referanse',
            refValue: String(found.id).toUpperCase(),
          }),
        });
        emailed = true;
      } catch (e) {}
    }
    return { ok: true, ref: found.id, emailSendt: emailed };
  }
  if (name === 'list_video_requests') {
    const orders = await listOrders();
    const list = orders.filter((o) => o.videoRequested && !(o.deliverables && o.deliverables.length))
      .sort((a, b) => (a.videoRequestedAt || 0) - (b.videoRequestedAt || 0));
    // enrich with photo URLs so production can start immediately
    const full = [];
    for (const o of list) {
      const v = await getOrderView(o.id);
      full.push({ ...summary({ ...v, id: o.id }), bildeUrler: (v.photos || []).map((p) => p.url) });
    }
    return { antall: full.length, koe: full };
  }
  if (name === 'attach_video') {
    const found = await findOrder(args.ref);
    if (!found) return { error: 'Fant ingen bestilling med ref ' + args.ref };
    if (!args.url) return { error: 'Mangler url til videoen' };
    try {
      const deliveredUrl = await attachDelivery(found.id, args.url, args.filename);
      await setStatus(found.id, 'behandlet');
      return { ok: true, ref: found.id, levertUrl: deliveredUrl, status: 'behandlet' };
    } catch (e) {
      return { error: 'Kunne ikke lagre videoen: ' + e.message };
    }
  }
  return { error: 'Ukjent verktøy: ' + name };
}

const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

// providedToken = whatever the calling endpoint extracted (path / header / query).
export async function serveMcp(req, res, providedToken) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = process.env.MCP_TOKEN;
  if (!token) return res.status(503).json({ error: 'MCP ikke konfigurert (mangler MCP_TOKEN)' });
  if (String(providedToken || '') !== token) return res.status(401).json({ error: 'Ikke autorisert' });

  if (req.method === 'GET') return res.status(405).json({ error: 'Bruk POST (JSON-RPC)' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const msgs = Array.isArray(body) ? body : [body];
  const out = [];

  for (const m of msgs) {
    if (!m || m.jsonrpc !== '2.0') continue;
    const id = m.id;
    const isNotification = id === undefined || id === null;
    try {
      if (m.method === 'initialize') {
        out.push(rpcResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'staymotion', version: '1.0.0' },
        }));
      } else if (m.method === 'ping') {
        out.push(rpcResult(id, {}));
      } else if (m.method && m.method.startsWith('notifications/')) {
        // notification: no response
      } else if (m.method === 'tools/list') {
        out.push(rpcResult(id, { tools: TOOLS }));
      } else if (m.method === 'tools/call') {
        const name = m.params && m.params.name;
        const args = (m.params && m.params.arguments) || {};
        const result = await runTool(name, args, req.headers.host);
        out.push(rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }));
      } else if (!isNotification) {
        out.push(rpcError(id, -32601, 'Method not found: ' + m.method));
      }
    } catch (e) {
      console.error('[mcp]', m.method, e);
      if (!isNotification) out.push(rpcError(id, -32603, 'Internal error: ' + e.message));
    }
  }

  if (!out.length) return res.status(202).end();
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(Array.isArray(body) ? out : out[0]);
}
