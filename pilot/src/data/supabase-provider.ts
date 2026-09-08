import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Actor, CreateOrganizationInput, DataProvider, RegisterIncidentInput } from './provider';
import type { AIUsage, AuditEvent, Department, Incident, IncidentEvent, IncidentNote, Location, LocationHealth, Membership, Organization, Profile, Role, Task } from '../domain/types';
import { dueAtFor, ownerRoleFor, recurrence } from '../domain/followup';

/**
 * Supabase provider — real pilot mode.
 *
 * Security posture:
 *  - Browser uses ONLY the anon key. Tenant isolation is enforced by RLS
 *    (0001_core.sql + 0002_pilot_foundation.sql). The client never sends a
 *    trusted tenant id; `organization_id`/`location_id` are checked by policies
 *    and, for creation, by the `create_organization_with_owner` RPC.
 *  - Service-role key is never imported here. Server-only work (cron follow-up)
 *    lives in a route handler / edge function that reads SUPABASE_SERVICE_ROLE_KEY
 *    from server env.
 *  - Storage uploads are scoped `org/<orgId>/loc/<locId>/<userId>/<file>`.
 *
 * Mapping snake_case ↔ camelCase is done here so the UI stays identical to local mode.
 */

export function hasSupabaseEnv(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase-miljøvariabler mangler (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  return createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
}

type Row = Record<string, unknown>;
const r = (row: Row) => row as Record<string, string | number | boolean | null | undefined>;

const mapOrg = (x: Row): Organization => ({ id: r(x).id as string, name: r(x).name as string, slug: r(x).slug as string, businessType: ((x.business_type as Organization['businessType']) || 'restaurant'), createdAt: r(x).created_at as string, settings: (x.settings as Organization['settings']) || { requireConfirmationFor: ['temperature', 'safety'], locale: 'nb' } });
const mapLoc = (x: Row): Location => ({ id: r(x).id as string, organizationId: r(x).organization_id as string, name: r(x).name as string, city: (r(x).city as string) || undefined, timezone: r(x).timezone as string, active: !!r(x).active, createdAt: r(x).created_at as string });
const mapDep = (x: Row): Department => ({ id: r(x).id as string, locationId: r(x).location_id as string, name: r(x).name as string });
const mapProfile = (x: Row): Profile => ({ id: r(x).id as string, fullName: (r(x).full_name as string) || '', email: (r(x).email as string) || undefined, preferredLanguage: (r(x).preferred_language as string) || 'nb', createdAt: r(x).created_at as string });
const mapMem = (x: Row): Membership => ({ id: r(x).id as string, organizationId: r(x).organization_id as string, userId: r(x).user_id as string, role: r(x).role as Role, locationId: (r(x).location_id as string) || undefined, departmentId: (r(x).department_id as string) || undefined, regionKey: (r(x).region_key as string) || undefined, active: !!r(x).active });
const mapTask = (x: Row): Task => ({ id: r(x).id as string, organizationId: r(x).organization_id as string, locationId: r(x).location_id as string, departmentId: (r(x).department_id as string) || undefined, title: r(x).title as string, description: (r(x).description as string) || undefined, dueAt: (r(x).due_at as string) || undefined, status: r(x).status as Task['status'], assignedTo: (r(x).assigned_to as string) || undefined, assignedRole: (r(x).assigned_role as Role) || undefined, automationKey: (r(x).automation_key as string) || undefined, estimatedMinutes: (r(x).estimated_minutes as number) || undefined, completedAt: (r(x).completed_at as string) || undefined, completedBy: (r(x).completed_by as string) || undefined, createdAt: r(x).created_at as string, updatedAt: r(x).updated_at as string });
const mapInc = (x: Row): Incident => ({
  id: r(x).id as string, organizationId: r(x).organization_id as string, locationId: r(x).location_id as string, departmentId: (r(x).department_id as string) || undefined,
  reportedBy: (r(x).reported_by as string) || '', title: r(x).title as string, category: (r(x).category as Incident['category']) || 'other',
  severity: r(x).severity as Incident['severity'], status: r(x).status as Incident['status'], source: (r(x).source as Incident['source']) || 'manual',
  equipment: (r(x).equipment as string) || undefined, measurement: (x.measurement as Incident['measurement']) || undefined, transcript: (r(x).transcript as string) || undefined,
  aiExtraction: (x.ai_extraction as Record<string, unknown>) || undefined, requiresConfirmation: !!r(x).requires_human_confirmation, confirmedByReporter: !!r(x).confirmed_by_reporter,
  attachments: (x.attachments as Incident['attachments']) || [], ownerRole: (r(x).owner_role as Role) || 'shift_lead', suggestedAction: (r(x).suggested_action as string) || '',
  dueAt: (r(x).due_at as string) || undefined, acknowledgedBy: (r(x).acknowledged_by as string) || undefined, acknowledgedAt: (r(x).acknowledged_at as string) || undefined,
  resolvedBy: (r(x).resolved_by as string) || undefined, resolvedAt: (r(x).resolved_at as string) || undefined, notes: (x.notes as IncidentNote[]) || [],
  createdAt: r(x).created_at as string, updatedAt: r(x).updated_at as string,
});

export class SupabaseProvider implements DataProvider {
  readonly mode = 'supabase' as const;
  constructor(private sb: SupabaseClient) {}
  private async one<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (x: Row) => T): Promise<T> {
    const { data, error } = await q; if (error) throw new Error(error.message); return map(data as Row);
  }
  private async many<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>, map: (x: Row) => T): Promise<T[]> {
    const { data, error } = await q; if (error) throw new Error(error.message); return ((data as Row[]) || []).map(map);
  }
  private async audit(actor: Partial<Actor> & { organizationId: string }, e: { entityType: string; entityId?: string; locationId?: string; action: string; before?: unknown; after?: unknown }) {
    await this.sb.from('audit_events').insert({ organization_id: actor.organizationId, location_id: e.locationId ?? null, actor_id: actor.userId ?? null, entity_type: e.entityType, entity_id: e.entityId ?? null, action: e.action, before_data: e.before ?? null, after_data: e.after ?? null });
  }
  private async event(incidentId: string, eventType: string, payload: Record<string, unknown>, actorId?: string) {
    await this.sb.from('incident_events').insert({ incident_id: incidentId, actor_id: actorId ?? null, event_type: eventType, payload });
  }

  async listOrganizations() { return this.many(this.sb.from('organizations').select('*'), mapOrg); }
  async getOrganization(id: string) { const { data } = await this.sb.from('organizations').select('*').eq('id', id).maybeSingle(); return data ? mapOrg(data as Row) : null; }
  async createOrganization(input: CreateOrganizationInput) {
    // Single RPC (security definer, see 0002) so the org, first location, departments,
    // owner membership and starter tasks are created atomically for auth.uid().
    const { data, error } = await this.sb.rpc('create_organization_with_owner', {
      p_name: input.name, p_business_type: input.businessType, p_location_name: input.location.name, p_city: input.location.city ?? null,
      p_departments: input.departments, p_template_keys: input.templateKeys, p_employees: input.employees,
    });
    if (error) throw new Error(error.message);
    const d = data as { organization: Row; location: Row; owner: Row; membership: Row };
    return { organization: mapOrg(d.organization), location: mapLoc(d.location), owner: mapProfile(d.owner), membership: mapMem(d.membership) };
  }
  async listLocations(organizationId: string) { return this.many(this.sb.from('locations').select('*').eq('organization_id', organizationId).order('name'), mapLoc); }
  async listDepartments(locationId: string) { return this.many(this.sb.from('departments').select('*').eq('location_id', locationId).order('name'), mapDep); }
  async listProfiles(organizationId: string) { return this.many(this.sb.from('profiles').select('*, memberships!inner(organization_id)').eq('memberships.organization_id', organizationId), mapProfile); }
  async listMemberships(organizationId: string) { return this.many(this.sb.from('memberships').select('*').eq('organization_id', organizationId), mapMem); }
  async addEmployee(actor: Actor, input: { name: string; role: Role; locationId: string; departmentId?: string; email?: string; language?: string }) {
    // Invites without an auth user are "pending" memberships (0002: memberships.invited_name/email, user_id nullable).
    const { data, error } = await this.sb.rpc('invite_member', { p_organization_id: actor.organizationId, p_location_id: input.locationId, p_department_id: input.departmentId ?? null, p_role: input.role, p_name: input.name, p_email: input.email ?? null, p_language: input.language ?? 'nb' });
    if (error) throw new Error(error.message);
    const d = data as { profile: Row; membership: Row };
    return { profile: mapProfile(d.profile), membership: mapMem(d.membership) };
  }

  async listTasks(actor: Actor, locationId: string) { return this.many(this.sb.from('tasks').select('*').eq('location_id', locationId).order('due_at'), mapTask); }
  async completeTask(actor: Actor, taskId: string) {
    const t = await this.one(this.sb.from('tasks').update({ status: 'done', completed_at: new Date().toISOString(), completed_by: actor.userId, updated_at: new Date().toISOString() }).eq('id', taskId).select('*').single(), mapTask);
    await this.audit(actor, { entityType: 'task', entityId: t.id, locationId: t.locationId, action: 'completed', after: { status: 'done' } }); return t;
  }
  async reopenTask(actor: Actor, taskId: string) {
    const t = await this.one(this.sb.from('tasks').update({ status: 'open', completed_at: null, completed_by: null, updated_at: new Date().toISOString() }).eq('id', taskId).select('*').single(), mapTask);
    await this.audit(actor, { entityType: 'task', entityId: t.id, locationId: t.locationId, action: 'reopened' }); return t;
  }

  async listIncidents(actor: Actor, scope: { organizationId: string; locationId?: string }) {
    let q = this.sb.from('incidents').select('*').eq('organization_id', scope.organizationId).order('created_at', { ascending: false });
    if (scope.locationId) q = q.eq('location_id', scope.locationId);
    return this.many(q, mapInc); // RLS narrows further (employees: own reports via 0002 policy)
  }
  async registerIncidents(actor: Actor, inputs: RegisterIncidentInput[]) {
    if (!actor.locationId) throw new Error('Mangler lokasjon');
    const out: Incident[] = [];
    for (const inp of inputs) {
      const p = inp.proposal; const t = new Date().toISOString();
      if (p.requiresConfirmation && !inp.confirmedByReporter) throw new Error('Saken krever bekreftelse før registrering');
      const row = {
        organization_id: actor.organizationId, location_id: actor.locationId, department_id: inp.departmentId ?? null, reported_by: actor.userId,
        title: p.title, category: p.category, severity: p.severity, status: 'open', source: inp.source, equipment: p.equipment,
        measurement: p.measurement ?? {}, transcript: inp.transcript || null, ai_extraction: p, requires_human_confirmation: p.requiresConfirmation,
        confirmed_by_reporter: !!inp.confirmedByReporter, attachments: inp.attachments.map((a) => ({ ...a, previewUrl: undefined })),
        owner_role: p.suggestedOwnerRole || ownerRoleFor(p.category, p.severity), suggested_action: p.suggestedAction, due_at: dueAtFor(t, p.severity),
      };
      const inc = await this.one(this.sb.from('incidents').insert(row).select('*').single(), mapInc);
      await this.event(inc.id, 'created', { source: inp.source, ownerRole: inc.ownerRole, dueAt: inc.dueAt }, actor.userId);
      if (inp.editedFields?.length) await this.event(inc.id, 'ai_suggestion_edited', { fields: inp.editedFields }, actor.userId);
      if (p.requiresConfirmation) await this.event(inc.id, 'confirmation_accepted', { by: actor.userId }, actor.userId);
      await this.audit(actor, { entityType: 'incident', entityId: inc.id, locationId: inc.locationId, action: 'created', after: { title: inc.title, category: inc.category, severity: inc.severity } });
      out.push(inc);
    }
    return out;
  }
  async acknowledgeIncident(actor: Actor, id: string) {
    const t = new Date().toISOString();
    const inc = await this.one(this.sb.from('incidents').update({ status: 'acknowledged', acknowledged_by: actor.userId, acknowledged_at: t, updated_at: t }).eq('id', id).select('*').single(), mapInc);
    await this.event(id, 'acknowledged', {}, actor.userId); await this.audit(actor, { entityType: 'incident', entityId: id, locationId: inc.locationId, action: 'acknowledged' }); return inc;
  }
  async resolveIncident(actor: Actor, id: string, note?: string) {
    const t = new Date().toISOString();
    if (note?.trim()) await this.addIncidentNote(actor, id, note);
    const inc = await this.one(this.sb.from('incidents').update({ status: 'resolved', resolved_by: actor.userId, resolved_at: t, updated_at: t }).eq('id', id).select('*').single(), mapInc);
    await this.event(id, 'resolved', {}, actor.userId); await this.audit(actor, { entityType: 'incident', entityId: id, locationId: inc.locationId, action: 'resolved' }); return inc;
  }
  async assignIncident(actor: Actor, id: string, ownerRole: Role) {
    const inc = await this.one(this.sb.from('incidents').update({ owner_role: ownerRole, updated_at: new Date().toISOString() }).eq('id', id).select('*').single(), mapInc);
    await this.event(id, 'assigned', { to: ownerRole }, actor.userId); await this.audit(actor, { entityType: 'incident', entityId: id, locationId: inc.locationId, action: 'assigned', after: { ownerRole } }); return inc;
  }
  async addIncidentNote(actor: Actor, id: string, text: string) {
    const n: IncidentNote = { id: `note_${Date.now().toString(36)}`, authorId: actor.userId, text: text.trim().slice(0, 500), createdAt: new Date().toISOString() };
    const { data, error } = await this.sb.rpc('append_incident_note', { p_incident_id: id, p_note: n }); if (error) throw new Error(error.message); void data;
    await this.event(id, 'note_added', { length: n.text.length }, actor.userId); return n;
  }
  async listIncidentEvents(actor: Actor, incidentId: string) {
    return this.many(this.sb.from('incident_events').select('*').eq('incident_id', incidentId).order('created_at'), (x) => ({ id: r(x).id as string, incidentId: r(x).incident_id as string, actorId: (r(x).actor_id as string) || undefined, eventType: r(x).event_type as IncidentEvent['eventType'], payload: (x.payload as Record<string, unknown>) || {}, createdAt: r(x).created_at as string }));
  }
  async runFollowUp() {
    // In real mode the follow-up evaluation runs server-side (route handler / cron with service role).
    // The client never promotes incidents itself; it just reads the result.
    return { promoted: 0 };
  }
  async locationHealth(actor: Actor, organizationId: string): Promise<LocationHealth[]> {
    const [locs, incs, tasks] = await Promise.all([this.listLocations(organizationId), this.listIncidents(actor, { organizationId }), this.many(this.sb.from('tasks').select('*').eq('organization_id', organizationId), mapTask)]);
    return locs.map((l) => {
      const inc = incs.filter((i) => i.locationId === l.id); const open = inc.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
      const ts = tasks.filter((t) => t.locationId === l.id); const completion = ts.length ? ts.filter((t) => t.status === 'done').length / ts.length : 1;
      const critical = open.filter((i) => i.severity === 'critical').length; const attention = open.filter((i) => i.status === 'needs_attention').length;
      const score = Math.max(0, Math.min(100, Math.round(100 - open.length * 4 - critical * 8 - attention * 6 - (1 - completion) * 20)));
      return { locationId: l.id, name: l.name, score, openIncidents: open.length, needsAttention: attention, criticalIncidents: critical, taskCompletion: completion, recurring: recurrence(inc) };
    }).sort((a, b) => a.score - b.score);
  }
  async listAudit(actor: Actor, organizationId: string, limit = 50) {
    return this.many(this.sb.from('audit_events').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(limit), (x) => ({ id: String(r(x).id), organizationId: r(x).organization_id as string, locationId: (r(x).location_id as string) || undefined, actorId: (r(x).actor_id as string) || undefined, entityType: r(x).entity_type as AuditEvent['entityType'], entityId: (r(x).entity_id as string) || undefined, action: r(x).action as string, before: x.before_data, after: x.after_data, createdAt: r(x).created_at as string }));
  }
  async recordAIUsage(usage: AIUsage) {
    await this.sb.from('ai_actions').insert({ organization_id: usage.organizationId ?? null, location_id: usage.locationId ?? null, requested_by: usage.requestedBy ?? null, action_type: usage.actionType, model_route: `${usage.provider}/${usage.model}`, input_summary: { modality: usage.inputModality, units: usage.units }, output_summary: { latencyMs: usage.latencyMs, fallbackUsed: usage.fallbackUsed }, status: 'executed', cost_estimate_nok: usage.estimatedCostNok ?? null });
  }
}
