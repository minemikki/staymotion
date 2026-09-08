import { describe, expect, it } from 'vitest';
import { dueAtFor, evaluateFollowUp, recurrence } from '../../src/domain/followup';
import type { Incident } from '../../src/domain/types';

const base = (over: Partial<Incident>): Incident => ({
  id: 'i1', organizationId: 'o', locationId: 'l', reportedBy: 'u', title: 't', category: 'temperature', severity: 'critical', status: 'open', source: 'voice',
  requiresConfirmation: true, confirmedByReporter: true, attachments: [], ownerRole: 'shift_lead', suggestedAction: 'x', notes: [],
  createdAt: '2026-09-08T08:00:00.000Z', updatedAt: '2026-09-08T08:00:00.000Z', dueAt: dueAtFor('2026-09-08T08:00:00.000Z', 'critical'), ...over,
});

describe('follow-up engine', () => {
  it('critical incidents are due after one hour', () => {
    expect(dueAtFor('2026-09-08T08:00:00.000Z', 'critical')).toBe('2026-09-08T09:00:00.000Z');
    expect(dueAtFor('2026-09-08T08:00:00.000Z', 'medium')).toBe('2026-09-09T08:00:00.000Z');
  });
  it('does nothing before due', () => {
    const r = evaluateFollowUp(base({}), new Date('2026-09-08T08:30:00.000Z'));
    expect(r.changed).toBe(false); expect(r.incident.status).toBe('open');
  });
  it('promotes to needs_attention past due and logs two events', () => {
    const r = evaluateFollowUp(base({}), new Date('2026-09-08T09:01:00.000Z'));
    expect(r.changed).toBe(true); expect(r.incident.status).toBe('needs_attention');
    expect(r.events.map((e) => e.eventType)).toEqual(['needs_attention', 'follow_up_sent']);
  });
  it('leaves resolved incidents alone', () => {
    const r = evaluateFollowUp(base({ status: 'resolved' }), new Date('2030-01-01'));
    expect(r.changed).toBe(false);
  });
  it('detects recurrence on same equipment + category', () => {
    const now = new Date().toISOString();
    const rec = recurrence([base({ id: 'a', equipment: 'Fryser 2', createdAt: now }), base({ id: 'b', equipment: 'Fryser 2', createdAt: now }), base({ id: 'c', equipment: 'Kjøleskap', createdAt: now })]);
    expect(rec[0]).toMatchObject({ count: 2, label: 'Fryser 2 · Temperaturavvik' });
  });
});
