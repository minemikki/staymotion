import type { Incident, IncidentEvent, IncidentSeverity, Role } from './types';

/**
 * Automatic follow-up — first thin slice.
 * Pure functions, no UI, no I/O: safe to run in a server cron later.
 */

/** Hours until an unresolved incident is promoted to needs_attention. */
export const DUE_HOURS: Record<IncidentSeverity, number> = { critical: 1, high: 4, medium: 24, low: 72 };

export function ownerRoleFor(category: Incident['category'], severity: IncidentSeverity): Role {
  if (severity === 'critical') return 'shift_lead';
  if (category === 'maintenance') return 'location_manager';
  if (category === 'supply') return 'location_manager';
  if (category === 'temperature' || category === 'hygiene' || category === 'safety') return 'shift_lead';
  return 'shift_lead';
}

export function dueAtFor(createdAtIso: string, severity: IncidentSeverity): string {
  return new Date(new Date(createdAtIso).getTime() + DUE_HOURS[severity] * 3600_000).toISOString();
}

export interface FollowUpResult {
  incident: Incident;
  events: Omit<IncidentEvent, 'id' | 'createdAt'>[];
  changed: boolean;
}

/**
 * Evaluate one incident at time `now`. Deterministic:
 *  - open/acknowledged past due  → needs_attention (+ event)
 *  - resolved/closed             → untouched
 */
export function evaluateFollowUp(incident: Incident, now: Date): FollowUpResult {
  const events: FollowUpResult['events'] = [];
  if (incident.status === 'resolved' || incident.status === 'closed' || incident.status === 'needs_attention') {
    return { incident, events, changed: false };
  }
  if (incident.dueAt && new Date(incident.dueAt).getTime() <= now.getTime()) {
    const promoted: Incident = { ...incident, status: 'needs_attention', updatedAt: now.toISOString() };
    events.push({ incidentId: incident.id, eventType: 'needs_attention', payload: { reason: 'past_due', dueAt: incident.dueAt, previousStatus: incident.status } });
    events.push({ incidentId: incident.id, eventType: 'follow_up_sent', payload: { to: incident.ownerRole, channel: 'in_app' } });
    return { incident: promoted, events, changed: true };
  }
  return { incident, events, changed: false };
}

export function evaluateAll(incidents: Incident[], now: Date): FollowUpResult[] {
  return incidents.map((i) => evaluateFollowUp(i, now));
}

/** Simple recurrence: same equipment + category within `days`. */
export function recurrence(incidents: Incident[], days = 30): { key: string; count: number; label: string }[] {
  const cutoff = Date.now() - days * 86400_000;
  const map = new Map<string, { count: number; label: string }>();
  for (const i of incidents) {
    if (new Date(i.createdAt).getTime() < cutoff) continue;
    const key = `${i.category}:${(i.equipment || 'ukjent').toLowerCase()}`;
    const cur = map.get(key) || { count: 0, label: `${i.equipment || 'Ukjent'} · ${categoryLabel(i.category)}` };
    cur.count += 1; map.set(key, cur);
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v })).filter((x) => x.count >= 2).sort((a, b) => b.count - a.count);
}

export function categoryLabel(c: Incident['category']): string {
  return ({ maintenance: 'Vedlikehold', temperature: 'Temperaturavvik', supply: 'Leveranse', hygiene: 'Renhold', safety: 'HMS', observation: 'Observasjon', other: 'Driftsavvik' } as const)[c];
}

export function roleLabel(r: Role): string {
  return ({ owner: 'Eier', hq: 'HQ', regional_manager: 'Regionsjef', location_manager: 'Daglig leder', shift_lead: 'Skiftleder', employee: 'Ansatt' } as const)[r];
}
