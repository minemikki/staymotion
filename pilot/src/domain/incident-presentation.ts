import type { Incident } from './types';

export function incidentStatus(status: Incident['status']): string {
  const labels: Record<Incident['status'], string> = {
    open: 'Sendt', acknowledged: 'Sett av leder', in_progress: 'Under arbeid',
    needs_attention: 'Følges opp', resolved: 'Løst', closed: 'Avsluttet',
  };
  return labels[status];
}

export function isFinished(i: Incident): boolean {
  return i.status === 'resolved' || i.status === 'closed';
}

export function needsManager(i: Incident, now: number): boolean {
  return !isFinished(i) && (i.status === 'open' || i.status === 'needs_attention'
    || i.severity === 'critical' || !!(i.dueAt && Date.parse(i.dueAt) <= now));
}

/** Stable, explicit priority: critical, overdue, escalated, high severity, oldest. */
export function prioritizeIncidents(incidents: Incident[], now: number): Incident[] {
  const rank = (i: Incident) => i.severity === 'critical' ? 0
    : i.dueAt && Date.parse(i.dueAt) <= now ? 1
    : i.status === 'needs_attention' ? 2 : i.severity === 'high' ? 3 : 4;
  return [...incidents].sort((a, b) => rank(a) - rank(b)
    || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function deadlineText(i: Incident, now: number): string {
  if (!i.dueAt) return 'Ingen frist satt';
  const remaining = Date.parse(i.dueAt) - now;
  if (!Number.isFinite(remaining)) return 'Ingen frist satt';
  if (remaining <= 0) return 'Frist passert';
  const minutes = Math.ceil(remaining / 60000);
  if (minutes < 60) return `Frist om ${minutes} min`;
  if (minutes < 1440) return `Frist om ${Math.ceil(minutes / 60)} t`;
  return `Frist ${new Date(i.dueAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`;
}
