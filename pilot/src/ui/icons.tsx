import type { IncidentCategory } from '../domain/types';

/**
 * Small operational glyphs shared by the employee timeline, the Capture proposal cards and the
 * manager cards. Stroke icons on 24×24, coloured by the surrounding semantic token.
 */
const P: Record<string, React.ReactNode> = {
  temperature: <><path d="M10 4a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0Z" /><path d="M12 9v6" /></>,
  hygiene: <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" /><path d="M5 17l.7 1.8L7.5 19.5 5.7 20.2 5 22l-.7-1.8L2.5 19.5l1.8-.7Z" /></>,
  supply: <><path d="M3 8l9-4 9 4-9 4-9-4Z" /><path d="M3 8v8l9 4 9-4V8M12 12v8" /></>,
  maintenance: <><path d="M14.7 6.3a4 4 0 0 0 4.9 4.9L21 12.6 12.6 21l-1.4-1.4 8.4-8.4-1.4-1.4-8.4 8.4L8.4 16.8 3 22" /><path d="M14.7 6.3 9.4 1l-1 4-4 1 5.3 5.3" /></>,
  safety: <><path d="M12 3l8 3v6c0 4.6-3.2 7.9-8 9-4.8-1.1-8-4.4-8-9V6l8-3Z" /><path d="M12 8v5M12 16v.5" /></>,
  routine: <><path d="M9 11l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="4" /></>,
  food: <><path d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18" /><path d="M17 3c-2 2-2 6-2 8h4c0-2 0-6-2-8ZM17 11v10" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  observation: <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  other: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M15 5l3 3M12 8l3 3" /></>,
};

export type OpsIcon = keyof typeof P;

export function Icon({ name, size = 18, className }: { name: OpsIcon | string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[name] ?? P.other}
    </svg>
  );
}

/** Icon for an incident category (ProposedIssue / Incident). */
export const categoryIcon = (c: IncidentCategory | string): OpsIcon =>
  (c in P ? (c as OpsIcon) : 'other');

/** Icon for a routine task, derived from its automation key — never invented. */
export function taskIcon(automationKey?: string): OpsIcon {
  switch (automationKey) {
    case 'temp_check': return 'temperature';
    case 'allergen_check': return 'food';
    case 'hygiene_round': return 'hygiene';
    case 'delivery_check': case 'bar_stock': return 'supply';
    case 'equipment_report': return 'maintenance';
    case 'open_routine': case 'close_routine': return 'key';
    default: return 'routine';
  }
}
