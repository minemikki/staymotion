import type {
  AIUsage, AttachmentMeta, AuditEvent, BusinessType, Department, Incident, IncidentEvent, IncidentNote, Location, LocationHealth,
  Membership, Organization, Profile, Role, Task,
} from '../domain/types';
import type { ProposedIssue } from '../ai/contract';
import type { CaptureSource } from '../domain/types';

/**
 * Data provider contract. Two implementations:
 *  - LocalProvider    (browser storage, seeded, deterministic) — demo/local mode
 *  - SupabaseProvider (anon key + RLS) — real pilot mode
 * The UI only ever talks to this interface.
 */

export interface Actor { userId: string; organizationId: string; locationId?: string; role: Role }

export interface CreateOrganizationInput {
  name: string;
  businessType: BusinessType;
  location: { name: string; city?: string };
  departments: string[];
  ownerName: string;
  ownerEmail?: string;
  employees: { name: string; role: Role; department?: string; email?: string; language?: string }[];
  templateKeys: string[];
}

export interface RegisterIncidentInput {
  proposal: ProposedIssue;
  transcript: string;
  source: CaptureSource;
  attachments: AttachmentMeta[];
  confirmedByReporter: boolean;
  /** what the employee changed vs. the suggestion (for audit) */
  editedFields?: string[];
  departmentId?: string;
}

export interface DataProvider {
  readonly mode: 'local' | 'supabase';

  // bootstrap / tenancy
  listOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | null>;
  createOrganization(input: CreateOrganizationInput): Promise<{ organization: Organization; location: Location; owner: Profile; membership: Membership }>;
  listLocations(organizationId: string): Promise<Location[]>;
  listDepartments(locationId: string): Promise<Department[]>;
  listProfiles(organizationId: string): Promise<Profile[]>;
  listMemberships(organizationId: string): Promise<Membership[]>;
  addEmployee(actor: Actor, input: { name: string; role: Role; locationId: string; departmentId?: string; email?: string; language?: string }): Promise<{ profile: Profile; membership: Membership }>;

  // tasks
  listTasks(actor: Actor, locationId: string): Promise<Task[]>;
  completeTask(actor: Actor, taskId: string): Promise<Task>;
  reopenTask(actor: Actor, taskId: string): Promise<Task>;

  // incidents
  listIncidents(actor: Actor, scope: { organizationId: string; locationId?: string }): Promise<Incident[]>;
  registerIncidents(actor: Actor, inputs: RegisterIncidentInput[]): Promise<Incident[]>;
  acknowledgeIncident(actor: Actor, id: string): Promise<Incident>;
  resolveIncident(actor: Actor, id: string, note?: string): Promise<Incident>;
  assignIncident(actor: Actor, id: string, ownerRole: Role): Promise<Incident>;
  addIncidentNote(actor: Actor, id: string, text: string): Promise<IncidentNote>;
  listIncidentEvents(actor: Actor, incidentId: string): Promise<IncidentEvent[]>;

  /** Real mode uploads before incident insert. Local mode can omit this method. */
  uploadAttachment?(actor: Actor, attachment: { meta: AttachmentMeta; blob: Blob }): Promise<AttachmentMeta>;

  /** Optional realtime invalidation. Returns an unsubscribe callback. */
  subscribeIncidentChanges?(actor: Actor, scope: { organizationId: string; locationId?: string }, onChange: () => void): () => void;

  // follow-up (server cron later; local = deterministic, called on load)
  runFollowUp(actor: Actor, now?: Date): Promise<{ promoted: number }>;

  // aggregation
  locationHealth(actor: Actor, organizationId: string): Promise<LocationHealth[]>;

  // audit + usage
  listAudit(actor: Actor, organizationId: string, limit?: number): Promise<AuditEvent[]>;
  recordAIUsage(usage: AIUsage): Promise<void>;
}
