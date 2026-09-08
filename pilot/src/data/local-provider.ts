import type { Actor, CreateOrganizationInput, DataProvider, RegisterIncidentInput } from './provider';
import type {
  AIUsage, AuditEvent, Department, Incident, IncidentEvent, IncidentNote, Location, LocationHealth, Membership,
  Organization, Profile, Role, Task,
} from '../domain/types';
import { HQ_ROLES } from '../domain/types';
import { ROUTINE_TEMPLATES } from '../domain/templates';
import { dueAtFor, evaluateAll, ownerRoleFor, recurrence } from '../domain/followup';

/**
 * Local/demo provider. Persists a single JSON document in localStorage (browser)
 * or an in-memory map (tests/server). Deterministic seed. Mirrors the calls the
 * Supabase provider makes so the UI is identical in both modes.
 *
 * Tenancy is enforced here too (not only by RLS) so demo mode never trains bad
 * habits: every query is scoped by actor.organizationId and location access.
 */

interface Store {
  version: 1;
  organizations: Organization[];
  locations: Location[];
  departments: Department[];
  profiles: Profile[];
  memberships: Membership[];
  tasks: Task[];
  incidents: Incident[];
  incidentEvents: IncidentEvent[];
  audit: AuditEvent[];
  aiUsage: AIUsage[];
}

const KEY = 'staymotion.pilot.local.v1';

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

const nowIso = () => new Date().toISOString();
let idc = 0;
export const newId = (p: string) => `${p}_${Date.now().toString(36)}${(++idc).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function empty(): Store {
  return { version: 1, organizations: [], locations: [], departments: [], profiles: [], memberships: [], tasks: [], incidents: [], incidentEvents: [], audit: [], aiUsage: [] };
}

/** Demo tenant so the pilot never opens on an empty database. */
export function seedDemo(store: Store, now = new Date()): Store {
  const created = new Date(now.getTime() - 3 * 86400_000).toISOString();
  const org: Organization = { id: 'org_demo', name: 'Sabi Sushi', slug: 'sabi-sushi', businessType: 'restaurant', createdAt: created, settings: { requireConfirmationFor: ['temperature', 'safety'], locale: 'nb' } };
  const loc: Location = { id: 'loc_stv', organizationId: org.id, name: 'Stavanger', city: 'Stavanger', timezone: 'Europe/Oslo', active: true, createdAt: created };
  const loc2: Location = { id: 'loc_brg', organizationId: org.id, name: 'Bergen', city: 'Bergen', timezone: 'Europe/Oslo', active: true, createdAt: created };
  const deps: Department[] = [
    { id: 'dep_stv_k', locationId: loc.id, name: 'Kjøkken' }, { id: 'dep_stv_s', locationId: loc.id, name: 'Sal' }, { id: 'dep_stv_b', locationId: loc.id, name: 'Bar' },
    { id: 'dep_brg_k', locationId: loc2.id, name: 'Kjøkken' }, { id: 'dep_brg_s', locationId: loc2.id, name: 'Sal' },
  ];
  const profiles: Profile[] = [
    { id: 'usr_jonas', fullName: 'Jonas Berg', preferredLanguage: 'nb', createdAt: created },
    { id: 'usr_emma', fullName: 'Emma Solheim', preferredLanguage: 'nb', createdAt: created },
    { id: 'usr_henrik', fullName: 'Henrik Dahl', preferredLanguage: 'nb', createdAt: created },
    { id: 'usr_mia', fullName: 'Mia Nguyen', preferredLanguage: 'nb', createdAt: created },
  ];
  const memberships: Membership[] = [
    { id: 'mem_1', organizationId: org.id, userId: 'usr_jonas', role: 'employee', locationId: loc.id, departmentId: 'dep_stv_k', active: true },
    { id: 'mem_2', organizationId: org.id, userId: 'usr_emma', role: 'location_manager', locationId: loc.id, active: true },
    { id: 'mem_3', organizationId: org.id, userId: 'usr_henrik', role: 'owner', active: true },
    { id: 'mem_4', organizationId: org.id, userId: 'usr_mia', role: 'shift_lead', locationId: loc.id, departmentId: 'dep_stv_k', active: true },
  ];
  const today = new Date(now); today.setHours(9, 30, 0, 0);
  const tasks: Task[] = [
    { id: 'task_temp', organizationId: org.id, locationId: loc.id, departmentId: 'dep_stv_k', title: 'Sjekk kjøletemperatur', description: 'Logges i temperaturkontroll', dueAt: today.toISOString(), status: 'open', assignedTo: 'usr_jonas', automationKey: 'temp_check', estimatedMinutes: 2, createdAt: created, updatedAt: created },
    { id: 'task_allergen', organizationId: org.id, locationId: loc.id, departmentId: 'dep_stv_k', title: 'Kontroller allergenlisten', description: 'Før åpning', dueAt: today.toISOString(), status: 'open', assignedTo: 'usr_jonas', automationKey: 'allergen_check', estimatedMinutes: 1, createdAt: created, updatedAt: created },
    { id: 'task_open', organizationId: org.id, locationId: loc.id, departmentId: 'dep_stv_s', title: 'Åpningsrutine sal', dueAt: today.toISOString(), status: 'done', assignedTo: 'usr_mia', automationKey: 'open_routine', estimatedMinutes: 10, completedAt: created, completedBy: 'usr_mia', createdAt: created, updatedAt: created },
  ];
  // A couple of historic incidents so recurrence has something honest to show
  const d = (days: number, h = 3) => new Date(now.getTime() - days * 86400_000 + h * 3600_000).toISOString();
  const inc = (id: string, locId: string, days: number, status: Incident['status'], resolved: boolean): Incident => ({
    id, organizationId: org.id, locationId: locId, departmentId: locId === loc.id ? 'dep_stv_k' : 'dep_brg_k', reportedBy: 'usr_mia', title: 'Temperatur må kontrolleres', category: 'temperature', severity: 'critical', status, source: 'voice', equipment: 'Fryser 2', measurement: { value: -12, unit: '°C', raw: '-12 °C' }, transcript: 'Fryser to viser minus tolv igjen.', requiresConfirmation: true, confirmedByReporter: true, attachments: [], ownerRole: 'shift_lead', suggestedAction: 'Varsle skiftleder', dueAt: dueAtFor(d(days), 'critical'), resolvedBy: resolved ? 'usr_emma' : undefined, resolvedAt: resolved ? d(days, 6) : undefined, notes: [], createdAt: d(days), updatedAt: d(days, resolved ? 6 : 3),
  });
  const incidents: Incident[] = [
    inc('inc_h1', loc.id, 12, 'resolved', true), inc('inc_h2', loc.id, 5, 'resolved', true),
    inc('inc_b1', loc2.id, 9, 'resolved', true), inc('inc_b2', loc2.id, 2, 'open', false),
    { id: 'inc_sup', organizationId: org.id, locationId: loc.id, departmentId: 'dep_stv_k', reportedBy: 'usr_mia', title: 'Leveranse mangler', category: 'supply', severity: 'medium', status: 'acknowledged', source: 'typed', equipment: '2 kasser', transcript: 'Leverandøren manglet to kasser cola.', requiresConfirmation: false, confirmedByReporter: false, attachments: [], ownerRole: 'location_manager', suggestedAction: 'Varsle innkjøp', dueAt: dueAtFor(d(1, 20), 'medium'), acknowledgedBy: 'usr_emma', acknowledgedAt: d(1, 21), notes: [], createdAt: d(1, 20), updatedAt: d(1, 21) },
  ];
  store.organizations.push(org); store.locations.push(loc, loc2); store.departments.push(...deps); store.profiles.push(...profiles); store.memberships.push(...memberships); store.tasks.push(...tasks); store.incidents.push(...incidents);
  return store;
}

export class LocalProvider implements DataProvider {
  readonly mode = 'local' as const;
  private store: Store;
  constructor(private storage: StorageLike, opts: { seed?: boolean } = { seed: true }) {
    const raw = storage.getItem(KEY);
    if (raw) {
      try { this.store = JSON.parse(raw) as Store; } catch { this.store = empty(); }
    } else {
      this.store = opts.seed === false ? empty() : seedDemo(empty());
      this.save();
    }
  }
  private save() { this.storage.setItem(KEY, JSON.stringify(this.store)); }
  reset() { this.storage.removeItem(KEY); this.store = seedDemo(empty()); this.save(); }

  // ---- tenancy guards (mirror RLS) ----
  private membership(actor: Actor): Membership {
    const m = this.store.memberships.find((x) => x.userId === actor.userId && x.organizationId === actor.organizationId && x.active);
    if (!m) throw new Error('Ingen aktiv tilgang til organisasjonen');
    return m;
  }
  private canAccessLocation(actor: Actor, locationId: string): boolean {
    const m = this.membership(actor);
    const loc = this.store.locations.find((l) => l.id === locationId);
    if (!loc || loc.organizationId !== actor.organizationId) return false;
    return HQ_ROLES.includes(m.role) || !m.locationId || m.locationId === locationId;
  }
  private assertLocation(actor: Actor, locationId: string) { if (!this.canAccessLocation(actor, locationId)) throw new Error('Ingen tilgang til lokasjonen'); }
  private assertManager(actor: Actor, locationId: string) {
    this.assertLocation(actor, locationId);
    const m = this.membership(actor);
    if (m.role === 'employee') throw new Error('Krever lederrolle');
  }
  private audit(actor: Partial<Actor> & { organizationId: string }, e: Omit<AuditEvent, 'id' | 'createdAt' | 'organizationId' | 'actorId'>) {
    this.store.audit.push({ id: newId('aud'), createdAt: nowIso(), organizationId: actor.organizationId, actorId: actor.userId, ...e });
  }
  private event(incidentId: string, eventType: IncidentEvent['eventType'], payload: Record<string, unknown>, actorId?: string) {
    this.store.incidentEvents.push({ id: newId('evt'), incidentId, actorId, eventType, payload, createdAt: nowIso() });
  }

  // ---- tenancy ----
  async listOrganizations() { return [...this.store.organizations]; }
  async getOrganization(id: string) { return this.store.organizations.find((o) => o.id === id) || null; }
  async createOrganization(input: CreateOrganizationInput) {
    const t = nowIso();
    const slug = input.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'org';
    const organization: Organization = { id: newId('org'), name: input.name.trim(), slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`, businessType: input.businessType, createdAt: t, settings: { requireConfirmationFor: ['temperature', 'safety'], locale: 'nb' } };
    const location: Location = { id: newId('loc'), organizationId: organization.id, name: input.location.name.trim(), city: input.location.city?.trim() || undefined, timezone: 'Europe/Oslo', active: true, createdAt: t };
    const departments: Department[] = input.departments.filter(Boolean).map((n) => ({ id: newId('dep'), locationId: location.id, name: n.trim() }));
    const owner: Profile = { id: newId('usr'), fullName: input.ownerName.trim() || 'Eier', email: input.ownerEmail?.trim() || undefined, preferredLanguage: 'nb', createdAt: t };
    const membership: Membership = { id: newId('mem'), organizationId: organization.id, userId: owner.id, role: 'owner', active: true };
    this.store.organizations.push(organization); this.store.locations.push(location); this.store.departments.push(...departments); this.store.profiles.push(owner); this.store.memberships.push(membership);
    for (const e of input.employees) {
      if (!e.name.trim()) continue;
      const p: Profile = { id: newId('usr'), fullName: e.name.trim(), email: e.email?.trim() || undefined, preferredLanguage: e.language || 'nb', createdAt: t };
      const dep = departments.find((d) => d.name === e.department);
      this.store.profiles.push(p);
      this.store.memberships.push({ id: newId('mem'), organizationId: organization.id, userId: p.id, role: e.role, locationId: location.id, departmentId: dep?.id, active: true });
    }
    // starter routines → today's tasks (assigned by role, not person, so the first employee sees them)
    const due = new Date(); due.setHours(10, 0, 0, 0);
    for (const key of input.templateKeys) {
      const tpl = ROUTINE_TEMPLATES.find((x) => x.key === key); if (!tpl || tpl.cadence === 'on_demand' || tpl.cadence === 'weekly') continue;
      const dep = departments.find((d) => d.name === tpl.department) || departments[0];
      this.store.tasks.push({ id: newId('task'), organizationId: organization.id, locationId: location.id, departmentId: dep?.id, title: tpl.title, description: tpl.description, dueAt: due.toISOString(), status: 'open', assignedRole: 'employee', automationKey: tpl.key, estimatedMinutes: tpl.estimatedMinutes, createdAt: t, updatedAt: t });
    }
    this.audit({ organizationId: organization.id, userId: owner.id }, { entityType: 'organization', entityId: organization.id, action: 'created', after: { name: organization.name, businessType: organization.businessType, location: location.name, departments: departments.map((d) => d.name), templates: input.templateKeys } });
    this.save();
    return { organization, location, owner, membership };
  }
  async listLocations(organizationId: string) { return this.store.locations.filter((l) => l.organizationId === organizationId); }
  async listDepartments(locationId: string) { return this.store.departments.filter((d) => d.locationId === locationId); }
  async listProfiles(organizationId: string) { const ids = new Set(this.store.memberships.filter((m) => m.organizationId === organizationId).map((m) => m.userId)); return this.store.profiles.filter((p) => ids.has(p.id)); }
  async listMemberships(organizationId: string) { return this.store.memberships.filter((m) => m.organizationId === organizationId); }
  async addEmployee(actor: Actor, input: { name: string; role: Role; locationId: string; departmentId?: string; email?: string; language?: string }) {
    this.assertManager(actor, input.locationId);
    const t = nowIso();
    const profile: Profile = { id: newId('usr'), fullName: input.name.trim(), email: input.email?.trim() || undefined, preferredLanguage: input.language || 'nb', createdAt: t };
    const membership: Membership = { id: newId('mem'), organizationId: actor.organizationId, userId: profile.id, role: input.role, locationId: input.locationId, departmentId: input.departmentId, active: true };
    this.store.profiles.push(profile); this.store.memberships.push(membership);
    this.audit(actor, { entityType: 'membership', entityId: membership.id, locationId: input.locationId, action: 'created', after: { name: profile.fullName, role: input.role } });
    this.save();
    return { profile, membership };
  }

  // ---- tasks ----
  async listTasks(actor: Actor, locationId: string) {
    this.assertLocation(actor, locationId);
    const m = this.membership(actor);
    return this.store.tasks.filter((t) => t.locationId === locationId && (m.role !== 'employee' || !t.assignedTo || t.assignedTo === actor.userId || t.assignedRole === 'employee'))
      .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''));
  }
  async completeTask(actor: Actor, taskId: string) {
    const t = this.store.tasks.find((x) => x.id === taskId); if (!t) throw new Error('Fant ikke oppgaven');
    this.assertLocation(actor, t.locationId);
    const before = { status: t.status };
    t.status = 'done'; t.completedAt = nowIso(); t.completedBy = actor.userId; t.updatedAt = t.completedAt;
    this.audit(actor, { entityType: 'task', entityId: t.id, locationId: t.locationId, action: 'completed', before, after: { status: t.status } });
    this.save(); return { ...t };
  }
  async reopenTask(actor: Actor, taskId: string) {
    const t = this.store.tasks.find((x) => x.id === taskId); if (!t) throw new Error('Fant ikke oppgaven');
    this.assertLocation(actor, t.locationId);
    t.status = 'open'; t.completedAt = undefined; t.completedBy = undefined; t.updatedAt = nowIso();
    this.audit(actor, { entityType: 'task', entityId: t.id, locationId: t.locationId, action: 'reopened' });
    this.save(); return { ...t };
  }

  // ---- incidents ----
  async listIncidents(actor: Actor, scope: { organizationId: string; locationId?: string }) {
    if (scope.organizationId !== actor.organizationId) throw new Error('Feil organisasjon');
    const m = this.membership(actor);
    return this.store.incidents
      .filter((i) => i.organizationId === scope.organizationId)
      .filter((i) => (scope.locationId ? i.locationId === scope.locationId : true))
      .filter((i) => this.canAccessLocation(actor, i.locationId))
      .filter((i) => m.role !== 'employee' || i.reportedBy === actor.userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async registerIncidents(actor: Actor, inputs: RegisterIncidentInput[]) {
    const locationId = actor.locationId; if (!locationId) throw new Error('Mangler lokasjon');
    this.assertLocation(actor, locationId);
    const org = this.store.organizations.find((o) => o.id === actor.organizationId)!;
    const out: Incident[] = [];
    for (const inp of inputs) {
      const p = inp.proposal; const t = nowIso();
      const requires = p.requiresConfirmation || org.settings.requireConfirmationFor.includes(p.category);
      if (requires && !inp.confirmedByReporter) throw new Error('Saken krever bekreftelse før registrering');
      const dep = inp.departmentId || this.store.departments.find((d) => d.locationId === locationId && d.name === p.department)?.id || this.membership(actor).departmentId;
      const incident: Incident = {
        id: newId('inc'), organizationId: actor.organizationId, locationId, departmentId: dep, reportedBy: actor.userId,
        title: p.title, category: p.category, severity: p.severity, status: 'open', source: inp.source,
        equipment: p.equipment, measurement: p.measurement, transcript: inp.transcript || undefined,
        aiExtraction: { ...p }, requiresConfirmation: requires, confirmedByReporter: !!inp.confirmedByReporter,
        attachments: inp.attachments.map((a) => ({ ...a, previewUrl: undefined })), // never persist blob: URLs
        ownerRole: p.suggestedOwnerRole || ownerRoleFor(p.category, p.severity), suggestedAction: p.suggestedAction,
        dueAt: dueAtFor(t, p.severity), notes: [], createdAt: t, updatedAt: t,
      };
      this.store.incidents.push(incident);
      this.event(incident.id, 'created', { source: inp.source, ownerRole: incident.ownerRole, dueAt: incident.dueAt }, actor.userId);
      if (inp.editedFields?.length) this.event(incident.id, 'ai_suggestion_edited', { fields: inp.editedFields }, actor.userId);
      if (requires) this.event(incident.id, 'confirmation_accepted', { by: actor.userId }, actor.userId);
      this.audit(actor, { entityType: 'incident', entityId: incident.id, locationId, action: 'created', after: { title: incident.title, category: incident.category, severity: incident.severity, source: incident.source } });
      out.push(incident);
    }
    this.save(); return out;
  }
  private inc(actor: Actor, id: string) {
    const i = this.store.incidents.find((x) => x.id === id); if (!i) throw new Error('Fant ikke saken');
    this.assertManager(actor, i.locationId); return i;
  }
  async acknowledgeIncident(actor: Actor, id: string) {
    const i = this.inc(actor, id); const before = i.status; const t = nowIso();
    i.status = 'acknowledged'; i.acknowledgedBy = actor.userId; i.acknowledgedAt = t; i.updatedAt = t;
    this.event(id, 'acknowledged', { previousStatus: before }, actor.userId);
    this.audit(actor, { entityType: 'incident', entityId: id, locationId: i.locationId, action: 'acknowledged', before: { status: before }, after: { status: i.status } });
    this.save(); return { ...i };
  }
  async resolveIncident(actor: Actor, id: string, note?: string) {
    const i = this.inc(actor, id); const before = i.status; const t = nowIso();
    if (note?.trim()) { i.notes.push({ id: newId('note'), authorId: actor.userId, text: note.trim().slice(0, 500), createdAt: t }); this.event(id, 'note_added', { length: note.trim().length }, actor.userId); }
    i.status = 'resolved'; i.resolvedBy = actor.userId; i.resolvedAt = t; i.updatedAt = t;
    this.event(id, 'resolved', { previousStatus: before }, actor.userId);
    this.audit(actor, { entityType: 'incident', entityId: id, locationId: i.locationId, action: 'resolved', before: { status: before }, after: { status: i.status } });
    this.save(); return { ...i };
  }
  async assignIncident(actor: Actor, id: string, ownerRole: Role) {
    const i = this.inc(actor, id); const before = i.ownerRole; i.ownerRole = ownerRole; i.updatedAt = nowIso();
    this.event(id, 'assigned', { from: before, to: ownerRole }, actor.userId);
    this.audit(actor, { entityType: 'incident', entityId: id, locationId: i.locationId, action: 'assigned', before: { ownerRole: before }, after: { ownerRole } });
    this.save(); return { ...i };
  }
  async addIncidentNote(actor: Actor, id: string, text: string) {
    const i = this.inc(actor, id); const n: IncidentNote = { id: newId('note'), authorId: actor.userId, text: text.trim().slice(0, 500), createdAt: nowIso() };
    i.notes.push(n); i.updatedAt = n.createdAt; this.event(id, 'note_added', { length: n.text.length }, actor.userId);
    this.audit(actor, { entityType: 'incident', entityId: id, locationId: i.locationId, action: 'note_added' });
    this.save(); return n;
  }
  async listIncidentEvents(actor: Actor, incidentId: string) {
    const i = this.store.incidents.find((x) => x.id === incidentId); if (!i) return [];
    this.assertLocation(actor, i.locationId);
    return this.store.incidentEvents.filter((e) => e.incidentId === incidentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // ---- follow-up ----
  async runFollowUp(actor: Actor, now = new Date()) {
    const mine = this.store.incidents.filter((i) => i.organizationId === actor.organizationId);
    let promoted = 0;
    for (const r of evaluateAll(mine, now)) {
      if (!r.changed) continue;
      Object.assign(mine.find((i) => i.id === r.incident.id)!, r.incident);
      for (const e of r.events) this.event(e.incidentId, e.eventType, e.payload);
      this.audit({ organizationId: actor.organizationId }, { entityType: 'incident', entityId: r.incident.id, locationId: r.incident.locationId, action: 'needs_attention' });
      promoted += 1;
    }
    if (promoted) this.save();
    return { promoted };
  }

  // ---- aggregation ----
  async locationHealth(actor: Actor, organizationId: string): Promise<LocationHealth[]> {
    if (organizationId !== actor.organizationId) throw new Error('Feil organisasjon');
    const locs = this.store.locations.filter((l) => l.organizationId === organizationId && this.canAccessLocation(actor, l.id));
    return locs.map((l) => {
      const inc = this.store.incidents.filter((i) => i.locationId === l.id);
      const open = inc.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
      const tasks = this.store.tasks.filter((t) => t.locationId === l.id);
      const done = tasks.filter((t) => t.status === 'done').length;
      const completion = tasks.length ? done / tasks.length : 1;
      const critical = open.filter((i) => i.severity === 'critical').length;
      const attention = open.filter((i) => i.status === 'needs_attention').length;
      // Transparent score: start at 100, subtract for open/critical/attention, add for completion.
      const score = Math.max(0, Math.min(100, Math.round(100 - open.length * 4 - critical * 8 - attention * 6 - (1 - completion) * 20)));
      return { locationId: l.id, name: l.name, score, openIncidents: open.length, needsAttention: attention, criticalIncidents: critical, taskCompletion: completion, recurring: recurrence(inc) };
    }).sort((a, b) => a.score - b.score);
  }

  // ---- audit + usage ----
  async listAudit(actor: Actor, organizationId: string, limit = 50) {
    if (organizationId !== actor.organizationId) throw new Error('Feil organisasjon');
    return this.store.audit.filter((a) => a.organizationId === organizationId).slice(-limit).reverse();
  }
  async recordAIUsage(usage: AIUsage) { this.store.aiUsage.push(usage); if (this.store.aiUsage.length > 500) this.store.aiUsage = this.store.aiUsage.slice(-500); this.save(); }

  /** test helper */
  _dump() { return JSON.parse(JSON.stringify(this.store)) as Store; }
}
