import type { IncidentCategory, IncidentSeverity, Role } from '../domain/types';

/**
 * Server-side AI contract. The client never talks to a model provider; it
 * calls /api/analyze which routes to an adapter. Today the only adapter is the
 * deterministic rules engine (clearly labelled). The shape is stable so a
 * cheap extraction model can be dropped in without UI changes.
 */
export interface AnalyzeInput {
  text: string;
  hasPhoto?: boolean;
  context?: { organizationId?: string; locationId?: string; departmentId?: string; department?: string; userId?: string };
}

export interface ProposedIssue {
  clientKey: string;
  category: IncidentCategory;
  title: string;
  equipment: string;
  department?: string;
  measurement?: { value?: number; unit?: string; raw?: string };
  severity: IncidentSeverity;
  requiresConfirmation: boolean;
  suggestedOwnerRole: Role;
  suggestedAction: string;
  confidence: 'high' | 'medium' | 'low';
  evidence?: string;
}

export interface AnalyzeResult {
  source: 'local-rules' | 'ai-endpoint';
  provider: string;
  model: string;
  transcript: string;
  issues: ProposedIssue[];
  warnings?: string[];
  usage: { latencyMs: number; inputTokens?: number; outputTokens?: number; estimatedCostNok?: number; fallbackUsed: boolean };
}

export interface AnalyzeAdapter {
  name: string;
  model: string;
  analyze(input: AnalyzeInput): Promise<Omit<AnalyzeResult, 'usage' | 'provider' | 'model'>>;
}
