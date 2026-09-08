import type { AnalyzeResult } from '../ai/contract';
import type { AIUsage } from '../domain/types';
import type { DataProvider } from '../data/provider';
import type { Session } from '../session/session';
import { apiAuthHeaders } from '../session/runtime';

/**
 * One client for the protected /api/analyze route, shared by the Signal capture on the
 * employee home and by the Capture sheet (camera / typed flows). Analysis always happens on
 * the server; the browser only sends text + context.
 */
export async function analyzeText(session: Session, db: DataProvider, text: string, hasPhoto: boolean): Promise<AnalyzeResult> {
  const auth = await apiAuthHeaders(session.mode);
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({ text, hasPhoto, context: { organizationId: session.organizationId, locationId: session.locationId, departmentId: session.departmentId, userId: session.userId } }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Tolkningen feilet');
  const { result, usage } = (await res.json()) as { result: AnalyzeResult; usage: AIUsage };
  // Real-mode usage is recorded server-side after quota enforcement. Local mode keeps its own
  // usage history for the demo and unit tests.
  if (db.mode === 'local') void db.recordAIUsage(usage);
  return result;
}
