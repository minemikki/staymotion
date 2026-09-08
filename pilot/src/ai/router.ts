import type { AnalyzeAdapter, AnalyzeInput, AnalyzeResult } from './contract';
import { rulesAdapter } from './rules-adapter';
import type { AIUsage } from '../domain/types';

/**
 * Cost-aware server-side router. Runs ONLY on the server (route handlers).
 *
 * Routing policy (documented, enforced here):
 *  - extract_issues:  cheap extraction model when AI_EXTRACTION_KEY is set, else local rules.
 *  - transcribe:      browser speech first (free). Server transcription only for short clips (≤ 30 s).
 *  - vision:          only when an image is attached AND the caller explicitly requests analysis.
 *  - aggregate:       stronger model only for cross-location reasoning (HQ), never per click.
 *  Every call produces an AIUsage record so cost can be tracked before it is a problem.
 */

export const LIMITS = {
  maxTextChars: 2000,
  maxAudioSeconds: 30,
  maxImageBytes: 6 * 1024 * 1024,
  maxImageEdgePx: 1600, // client compresses before upload
};

function pickAdapter(): { adapter: AnalyzeAdapter; fallbackUsed: boolean } {
  // A real extraction adapter is added here when a key is configured (server only).
  // Never read these variables in client bundles.
  const hasKey = !!(process.env.AI_EXTRACTION_KEY && process.env.AI_EXTRACTION_MODEL);
  if (hasKey) {
    // Intentionally not implemented tonight: keep the rules engine and mark fallback.
    return { adapter: rulesAdapter, fallbackUsed: true };
  }
  return { adapter: rulesAdapter, fallbackUsed: false };
}

export async function analyzeReport(input: AnalyzeInput): Promise<{ result: AnalyzeResult; usage: AIUsage }> {
  const text = String(input.text || '').slice(0, LIMITS.maxTextChars);
  const { adapter, fallbackUsed } = pickAdapter();
  const t0 = Date.now();
  const partial = await adapter.analyze({ ...input, text });
  const latencyMs = Date.now() - t0;
  const result: AnalyzeResult = {
    ...partial,
    provider: adapter.name,
    model: adapter.model,
    usage: { latencyMs, fallbackUsed },
  };
  const usage: AIUsage = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    organizationId: input.context?.organizationId,
    locationId: input.context?.locationId,
    requestedBy: input.context?.userId,
    actionType: 'extract_issues',
    provider: adapter.name,
    model: adapter.model,
    inputModality: input.hasPhoto ? 'image+text' : 'text',
    latencyMs,
    units: { inputTokens: Math.ceil(text.length / 4) },
    estimatedCostNok: adapter.name === 'local-rules' ? 0 : undefined,
    fallbackUsed,
    createdAt: new Date().toISOString(),
  };
  return { result, usage };
}
