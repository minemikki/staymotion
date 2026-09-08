import { describe, expect, it } from 'vitest';
import { LocalProvider, MemoryStorage } from '../../src/data/local-provider';
import type { Actor } from '../../src/data/provider';
import { analyzeWithRules } from '../../src/ai/rules-adapter';

const jonas: Actor = { userId: 'usr_jonas', organizationId: 'org_demo', locationId: 'loc_stv', role: 'employee' };
const emma: Actor = { userId: 'usr_emma', organizationId: 'org_demo', locationId: 'loc_stv', role: 'location_manager' };
const henrik: Actor = { userId: 'usr_henrik', organizationId: 'org_demo', role: 'owner' };

describe('LocalProvider — employee → incident → manager loop', () => {
  it('seeds a demo tenant and persists across instances sharing storage', async () => {
    const st = new MemoryStorage();
    const a = new LocalProvider(st);
    const t = await a.listTasks(jonas, 'loc_stv');
    expect(t.length).toBeGreaterThan(0);
    await a.completeTask(jonas, t[0].id);
    const b = new LocalProvider(st); // "refresh"
    expect((await b.listTasks(jonas, 'loc_stv')).find((x) => x.id === t[0].id)?.status).toBe('done');
  });

  it('registers two issues from one sentence and the manager sees them', async () => {
    const db = new LocalProvider(new MemoryStorage());
    const r = analyzeWithRules({ text: 'Det lekker vann fra fryseboksen og den står på 1 grad.' });
    const created = await db.registerIncidents(jonas, r.issues.map((p) => ({ proposal: p, transcript: 'Det lekker vann fra fryseboksen og den står på 1 grad.', source: 'voice', attachments: [], confirmedByReporter: true })));
    expect(created).toHaveLength(2);
    expect(created[1].requiresConfirmation).toBe(true);
    const seen = await db.listIncidents(emma, { organizationId: 'org_demo', locationId: 'loc_stv' });
    expect(seen.map((i) => i.id)).toEqual(expect.arrayContaining(created.map((c) => c.id)));
    const ev = await db.listIncidentEvents(emma, created[1].id);
    expect(ev.map((e) => e.eventType)).toEqual(['created', 'confirmation_accepted']);
  });

  it('refuses compliance-critical registration without confirmation', async () => {
    const db = new LocalProvider(new MemoryStorage());
    const r = analyzeWithRules({ text: 'Kjøleskapet står på 9 grader' });
    await expect(db.registerIncidents(jonas, [{ proposal: r.issues[0], transcript: 'x', source: 'typed', attachments: [], confirmedByReporter: false }])).rejects.toThrow(/bekreftelse/);
  });

  it('employees only see their own incidents; managers see the location; other locations are hidden', async () => {
    const db = new LocalProvider(new MemoryStorage());
    const mine = await db.listIncidents(jonas, { organizationId: 'org_demo', locationId: 'loc_stv' });
    expect(mine.every((i) => i.reportedBy === 'usr_jonas')).toBe(true);
    const mgr = await db.listIncidents(emma, { organizationId: 'org_demo' });
    expect(mgr.every((i) => i.locationId === 'loc_stv')).toBe(true);
    const hq = await db.listIncidents(henrik, { organizationId: 'org_demo' });
    expect(new Set(hq.map((i) => i.locationId)).size).toBe(2);
    await expect(db.listTasks(jonas, 'loc_brg')).rejects.toThrow(/tilgang/);
  });

  it('manager actions persist and are audited; employees cannot resolve', async () => {
    const db = new LocalProvider(new MemoryStorage());
    const [inc] = await db.registerIncidents(jonas, [{ proposal: analyzeWithRules({ text: 'Oppvaskmaskinen virker ikke' }).issues[0], transcript: 'x', source: 'typed', attachments: [], confirmedByReporter: false }]);
    await expect(db.resolveIncident(jonas, inc.id)).rejects.toThrow(/lederrolle/);
    await db.acknowledgeIncident(emma, inc.id);
    const res = await db.resolveIncident(emma, inc.id, 'Tekniker fikset pumpen');
    expect(res.status).toBe('resolved'); expect(res.notes[0].text).toBe('Tekniker fikset pumpen');
    const audit = await db.listAudit(emma, 'org_demo');
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(['created', 'acknowledged', 'resolved']));
  });

  it('follow-up promotes overdue incidents deterministically', async () => {
    const db = new LocalProvider(new MemoryStorage());
    const [inc] = await db.registerIncidents(jonas, [{ proposal: analyzeWithRules({ text: 'Fryseren står på 1 grad' }).issues[0], transcript: 'x', source: 'voice', attachments: [], confirmedByReporter: true }]);
    await db.runFollowUp(emma, new Date()); // seeded demo data may already contain overdue Bergen incidents
    const fresh = (await db.listIncidents(emma, { organizationId: 'org_demo' })).find((i) => i.id === inc.id)!;
    expect(fresh.status).toBe('open');
    const later = new Date(Date.now() + 2 * 3600_000);
    expect((await db.runFollowUp(emma, later)).promoted).toBeGreaterThanOrEqual(1);
    const after = (await db.listIncidents(emma, { organizationId: 'org_demo' })).find((i) => i.id === inc.id)!;
    expect(after.status).toBe('needs_attention');
  });

  it('onboarding creates an organization with location, departments, tasks and audit', async () => {
    const db = new LocalProvider(new MemoryStorage(), { seed: false });
    const res = await db.createOrganization({ name: 'Bryggen Café', businessType: 'cafe', location: { name: 'Bergen sentrum' }, departments: ['Disk', 'Kjøkken'], ownerName: 'Kari', employees: [{ name: 'Ola', role: 'employee', department: 'Disk' }], templateKeys: ['open_routine', 'temp_check', 'equipment_report'] });
    const owner: Actor = { userId: res.owner.id, organizationId: res.organization.id, locationId: res.location.id, role: 'owner' };
    expect((await db.listDepartments(res.location.id)).map((d) => d.name)).toEqual(['Disk', 'Kjøkken']);
    expect((await db.listTasks(owner, res.location.id)).map((t) => t.automationKey)).toEqual(['open_routine', 'temp_check']);
    expect((await db.listMemberships(res.organization.id)).length).toBe(2);
    expect((await db.locationHealth(owner, res.organization.id))[0].name).toBe('Bergen sentrum');
  });
});
