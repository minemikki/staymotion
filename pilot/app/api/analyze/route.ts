import { NextResponse } from 'next/server';
import { analyzeReport, LIMITS } from '@/src/ai/router';
import type { AnalyzeInput } from '@/src/ai/contract';

export const runtime = 'nodejs';

/**
 * POST /api/analyze  { text, hasPhoto?, context? }
 * Server-side only. No provider keys reach the client. Text is capped, and the
 * response carries usage metadata for cost tracking. Tenant context in the body
 * is treated as *hints* for the adapter, never as authorization.
 */
export async function POST(req: Request) {
  let body: AnalyzeInput;
  try { body = (await req.json()) as AnalyzeInput; } catch { return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 }); }
  const text = typeof body.text === 'string' ? body.text : '';
  if (text.length > LIMITS.maxTextChars) return NextResponse.json({ error: `Teksten er for lang (maks ${LIMITS.maxTextChars} tegn)` }, { status: 413 });
  if (!text.trim() && !body.hasPhoto) return NextResponse.json({ error: 'Ingenting å tolke' }, { status: 400 });
  const { result, usage } = await analyzeReport({ text, hasPhoto: !!body.hasPhoto, context: body.context });
  return NextResponse.json({ result, usage }, { headers: { 'Cache-Control': 'no-store' } });
}
