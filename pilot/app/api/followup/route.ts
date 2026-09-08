import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { evaluateAll } from '@/src/domain/followup';
import type { Incident } from '@/src/domain/types';

export const runtime = 'nodejs';

/**
 * POST /api/followup — scheduled follow-up (cron) for real Supabase mode.
 * Protected by FOLLOWUP_CRON_SECRET. Uses the service-role key ONLY here, on
 * the server. In local mode the client provider runs the same pure function.
 */
export async function POST(req: Request) {
  const secret = process.env.FOLLOWUP_CRON_SECRET;
  const given = req.headers.get('x-cron-secret') || '';
  // constant-time compare so the secret can't be probed byte by byte
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: 'Ikke autorisert' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return NextResponse.json({ ok: false, reason: 'Supabase ikke konfigurert' }, { status: 503 });

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, service, { auth: { persistSession: false } });
  const { data, error } = await sb.from('incidents').select('*').in('status', ['open', 'acknowledged', 'in_progress']).not('due_at', 'is', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []) as Array<Record<string, unknown>>;
  const incidents: Incident[] = rows.map((x) => ({ id: x.id as string, status: x.status as Incident['status'], dueAt: x.due_at as string, ownerRole: x.owner_role as Incident['ownerRole'] } as Incident));
  let promoted = 0;
  for (const r of evaluateAll(incidents, new Date())) {
    if (!r.changed) continue;
    await sb.from('incidents').update({ status: 'needs_attention', updated_at: new Date().toISOString() }).eq('id', r.incident.id);
    for (const e of r.events) await sb.from('incident_events').insert({ incident_id: e.incidentId, event_type: e.eventType, payload: e.payload });
    promoted += 1;
  }
  return NextResponse.json({ ok: true, promoted });
}
