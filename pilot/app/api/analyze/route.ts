import { NextResponse } from 'next/server';
import { analyzeReport, LIMITS } from '@/src/ai/router';
import type { AnalyzeInput } from '@/src/ai/contract';
import { authenticatedClient, realModeEnabled } from '@/src/server/supabase';

export const runtime = 'nodejs';

type Quota = {
  allowed: boolean;
  reason?: 'no_membership' | 'rate_limit' | 'daily_budget' | string;
  requestId?: string;
  organizationId?: string;
  locationId?: string | null;
  userId?: string;
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
  dailyBudgetNok?: number;
  spentTodayNok?: number;
};

type SessionContext = {
  userId: string;
  organizationId: string;
  locationId?: string | null;
  departmentId?: string | null;
};

// Local/demo mode still gets a lightweight abuse guard. Real mode uses the
// atomic Postgres quota in migration 0003, which is the actual cost boundary.
const localBuckets = new Map<string, { started: number; count: number }>();
function localAllowed(req: Request): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const windowMs = 10 * 60_000;
  const limit = 60;
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local').split(',')[0].trim();
  const b = localBuckets.get(ip);
  if (!b || now - b.started >= windowMs) {
    localBuckets.set(ip, { started: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((windowMs - (now - b.started)) / 1000)) };
  b.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - b.count), retryAfter: 0 };
}

function maxEstimatedRequestCostNok(): number {
  const raw = Number(process.env.AI_EXTRACTION_MAX_COST_NOK_PER_REQUEST || (process.env.AI_EXTRACTION_KEY ? '0.25' : '0'));
  return Number.isFinite(raw) ? Math.max(0, Math.min(raw, 50)) : 0;
}

/**
 * POST /api/analyze { text, hasPhoto?, context? }
 *
 * Local/demo mode:
 *  - no auth, no paid provider, simple per-IP abuse guard
 *
 * Real Supabase mode:
 *  - Bearer token is mandatory
 *  - auth user is verified server-side
 *  - organization/location/user context is derived from RLS-backed RPCs
 *  - quota is consumed atomically before analysis
 *  - usage is written server-side after analysis
 *
 * Client-supplied tenant ids are never trusted for authorization or billing.
 */
export async function POST(req: Request) {
  let body: AnalyzeInput;
  try {
    body = (await req.json()) as AnalyzeInput;
  } catch {
    return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (text.length > LIMITS.maxTextChars) {
    return NextResponse.json({ error: `Teksten er for lang (maks ${LIMITS.maxTextChars} tegn)` }, { status: 413 });
  }
  if (!text.trim() && !body.hasPhoto) return NextResponse.json({ error: 'Ingenting å tolke' }, { status: 400 });

  if (!realModeEnabled()) {
    const gate = localAllowed(req);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'For mange forespørsler akkurat nå. Prøv igjen om litt.' },
        { status: 429, headers: { 'Retry-After': String(gate.retryAfter), 'Cache-Control': 'no-store' } },
      );
    }
    const { result, usage } = await analyzeReport({ text, hasPhoto: !!body.hasPhoto, context: body.context });
    return NextResponse.json(
      { result, usage },
      { headers: { 'Cache-Control': 'no-store', 'X-RateLimit-Remaining': String(gate.remaining) } },
    );
  }

  const auth = await authenticatedClient(req);
  if (!auth) return NextResponse.json({ error: 'Logg inn på nytt for å fortsette.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  // Close the "invited after signup" gap before deriving membership context.
  await auth.sb.rpc('claim_pending_invitations');
  const { data: sessionData, error: sessionError } = await auth.sb.rpc('get_my_session_context');
  if (sessionError) return NextResponse.json({ error: 'Kunne ikke kontrollere tilgangen din.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (!sessionData) return NextResponse.json({ error: 'Du er ikke lagt til i en bedrift ennå.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const ctx = sessionData as SessionContext;

  const modality = body.hasPhoto ? 'image+text' : 'text';
  const { data: quotaData, error: quotaError } = await auth.sb.rpc('consume_ai_quota', {
    p_action_type: 'extract_issues',
    p_input_chars: text.length,
    p_input_modality: modality,
    p_estimated_cost_nok: maxEstimatedRequestCostNok(),
  });
  if (quotaError) {
    return NextResponse.json({ error: 'Kostnadsgrensen kunne ikke kontrolleres. Analysen ble ikke startet.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const quota = quotaData as Quota;
  if (!quota.allowed) {
    const retry = quota.retryAfterSeconds ? String(quota.retryAfterSeconds) : undefined;
    const message = quota.reason === 'daily_budget'
      ? 'Dagens AI-grense for bedriften er nådd. Ingen ekstra kostnad blir påløpt.'
      : quota.reason === 'no_membership'
        ? 'Du er ikke lagt til i en bedrift ennå.'
        : 'For mange analyser på kort tid. Prøv igjen om litt.';
    return NextResponse.json(
      { error: message, reason: quota.reason },
      { status: quota.reason === 'no_membership' ? 403 : 429, headers: { ...(retry ? { 'Retry-After': retry } : {}), 'Cache-Control': 'no-store' } },
    );
  }

  const derivedContext = {
    organizationId: ctx.organizationId,
    locationId: ctx.locationId || undefined,
    departmentId: ctx.departmentId || undefined,
    userId: auth.user.id,
  };
  const { result, usage } = await analyzeReport({ text, hasPhoto: !!body.hasPhoto, context: derivedContext });

  // Record from the server so a client cannot forge another tenant's usage or
  // suppress metering. A failed finalization is logged, but the already-safe
  // analysis result is still returned to avoid making the employee repeat it.
  if (quota.requestId) {
    const { error: finalizeError } = await auth.sb.rpc('finalize_ai_request', {
      p_request_id: quota.requestId,
      p_provider: usage.provider,
      p_model: usage.model,
      p_latency_ms: usage.latencyMs,
      p_input_tokens: usage.units?.inputTokens ?? 0,
      p_output_tokens: usage.units?.outputTokens ?? 0,
      p_estimated_cost_nok: usage.estimatedCostNok ?? maxEstimatedRequestCostNok(),
      p_fallback_used: usage.fallbackUsed,
      p_output_summary: { issueCount: result.issues.length, warnings: result.warnings || [] },
    });
    if (finalizeError) console.error('StayMotion AI usage finalization failed', finalizeError.message);
  }

  return NextResponse.json(
    { result, usage },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-RateLimit-Remaining': String(quota.remaining ?? 0),
      },
    },
  );
}
