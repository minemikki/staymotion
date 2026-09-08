import { describe, expect, it } from 'vitest';
import type { Incident } from '../../src/domain/types';
import { deadlineText, incidentStatus, needsManager, prioritizeIncidents } from '../../src/domain/incident-presentation';

const now = Date.parse('2026-09-08T12:00:00Z');
const incident = (fields: Partial<Incident>): Incident => ({
  id: 'test', status: 'open', severity: 'medium', createdAt: '2026-09-08T10:00:00Z', ...fields,
} as Incident);

describe('operational presentation', () => {
  it('never presents a closed report as newly sent', () => {
    expect(incidentStatus('closed')).toBe('Avsluttet');
    expect(incidentStatus('acknowledged')).toBe('Sett av leder');
    expect(incidentStatus('in_progress')).toBe('Under arbeid');
  });
  it('brings acknowledged overdue incidents back to manager attention', () => {
    expect(needsManager(incident({ status: 'acknowledged', dueAt: '2026-09-08T11:59:00Z' }), now)).toBe(true);
    expect(needsManager(incident({ status: 'acknowledged', dueAt: '2026-09-08T13:00:00Z' }), now)).toBe(false);
  });
  it('does not reopen resolved or closed incidents even if overdue and critical', () => {
    for (const status of ['resolved', 'closed'] as const) {
      expect(needsManager(incident({ status, severity: 'critical', dueAt: '2026-09-08T10:00:00Z' }), now)).toBe(false);
    }
  });
  it('sorts critical before overdue, escalated, high and normal without mutating input', () => {
    const items = [incident({id:'normal'}), incident({id:'high',severity:'high'}), incident({id:'escalated',status:'needs_attention'}), incident({id:'late',dueAt:'2026-09-08T11:00:00Z'}), incident({id:'critical',severity:'critical'})];
    expect(prioritizeIncidents(items, now).map(i => i.id)).toEqual(['critical','late','escalated','high','normal']);
    expect(items[0].id).toBe('normal');
  });
  it('labels actual deadlines, including missing and invalid ones', () => {
    expect(deadlineText(incident({}), now)).toBe('Ingen frist satt');
    expect(deadlineText(incident({dueAt:'invalid'}), now)).toBe('Ingen frist satt');
    expect(deadlineText(incident({dueAt:'2026-09-08T12:00:00Z'}), now)).toBe('Frist passert');
    expect(deadlineText(incident({dueAt:'2026-09-08T12:10:00Z'}), now)).toBe('Frist om 10 min');
  });
});
