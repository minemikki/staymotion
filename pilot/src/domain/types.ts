/**
 * StayMotion pilot — domain types.
 * Mirrors supabase/migrations/0001_core.sql + 0002_pilot_foundation.sql so the
 * local/demo provider and the Supabase provider speak the same language.
 *
 * Hierarchy: Organization → Region → Location → Department → Employee
 */

export type Role = 'owner' | 'hq' | 'regional_manager' | 'location_manager' | 'shift_lead' | 'employee';

export const MANAGER_ROLES: Role[] = ['owner', 'hq', 'regional_manager', 'location_manager', 'shift_lead'];
export const HQ_ROLES: Role[] = ['owner', 'hq', 'regional_manager'];

export type BusinessType = 'restaurant' | 'cafe' | 'bar' | 'hotel';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  createdAt: string;
  /** Organisation-level settings. Confirmation requirements live here so they can become configurable. */
  settings: {
    requireConfirmationFor: IncidentCategory[];
    locale: 'nb';
  };
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  city?: string;
  regionKey?: string;
  timezone: string;
  active: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  locationId: string;
  name: string;
}

export interface Profile {
  id: string;
  fullName: string;
  email?: string;
  preferredLanguage: string; // 'nb' | 'en' | 'pl' | ... placeholder
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  locationId?: string; // null → all locations (owner/hq/regional)
  departmentId?: string;
  regionKey?: string;
  active: boolean;
}

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'skipped';

export interface Task {
  id: string;
  organizationId: string;
  locationId: string;
  departmentId?: string;
  title: string;
  description?: string;
  dueAt?: string;
  status: TaskStatus;
  assignedTo?: string;
  assignedRole?: Role;
  automationKey?: string; // routine template key that generated it
  estimatedMinutes?: number;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type IncidentCategory = 'maintenance' | 'temperature' | 'supply' | 'hygiene' | 'safety' | 'observation' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'in_progress' | 'needs_attention' | 'resolved' | 'closed';
export type CaptureSource = 'voice' | 'typed' | 'photo' | 'photo+voice' | 'photo+typed' | 'manual';

export interface Measurement {
  value?: number;
  unit?: string; // '°C', 'stk', ...
  raw?: string;
}

export interface AttachmentMeta {
  id: string;
  kind: 'image';
  name: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  /** Local object URL (demo) or storage path (Supabase). Never a data: URL in persisted state. */
  storagePath?: string;
  previewUrl?: string;
}

export interface Incident {
  id: string;
  organizationId: string;
  locationId: string;
  departmentId?: string;
  reportedBy: string;
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: CaptureSource;
  equipment?: string;
  measurement?: Measurement;
  transcript?: string; // what the employee said (verbatim)
  aiExtraction?: Record<string, unknown>; // what StayMotion suggested (verbatim proposal)
  requiresConfirmation: boolean;
  confirmedByReporter: boolean; // explicit compliance confirmation at registration
  attachments: AttachmentMeta[];
  ownerRole: Role; // who follows up
  suggestedAction: string;
  dueAt?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes: IncidentNote[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentNote {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export type IncidentEventType =
  | 'created' | 'acknowledged' | 'assigned' | 'note_added' | 'resolved' | 'reopened'
  | 'needs_attention' | 'follow_up_sent' | 'confirmation_accepted' | 'ai_suggestion_edited' | 'ai_suggestion_removed';

export interface IncidentEvent {
  id: string;
  incidentId: string;
  actorId?: string; // undefined → system
  eventType: IncidentEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type AuditEntity = 'task' | 'incident' | 'organization' | 'location' | 'membership' | 'ai_action' | 'session';

export interface AuditEvent {
  id: string;
  organizationId: string;
  locationId?: string;
  actorId?: string;
  entityType: AuditEntity;
  entityId?: string;
  action: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

/** Usage record for every AI call. Lands in ai_actions later. */
export interface AIUsage {
  id: string;
  organizationId?: string;
  locationId?: string;
  requestedBy?: string;
  actionType: 'extract_issues' | 'transcribe' | 'vision' | 'aggregate';
  provider: string; // 'local-rules' | 'anthropic' | ...
  model: string;
  inputModality: 'text' | 'audio' | 'image' | 'image+text';
  latencyMs: number;
  units?: { inputTokens?: number; outputTokens?: number; audioSeconds?: number; images?: number };
  estimatedCostNok?: number; // only when actually known
  fallbackUsed: boolean;
  createdAt: string;
}

export interface RoutineTemplate {
  key: string;
  title: string;
  description: string;
  cadence: 'daily_open' | 'daily_close' | 'daily' | 'weekly' | 'on_demand';
  department: string;
  estimatedMinutes: number;
  category: IncidentCategory | 'routine';
  defaultOn: boolean;
}

export interface LocationHealth {
  locationId: string;
  name: string;
  score: number; // 0–100, computed, not invented
  openIncidents: number;
  needsAttention: number;
  criticalIncidents: number;
  taskCompletion: number; // 0–1
  recurring: { key: string; count: number; label: string }[];
}
