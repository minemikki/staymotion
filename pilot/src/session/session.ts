'use client';
import type { Role } from '../domain/types';
import type { Actor } from '../data/provider';
import { resolveMode } from '../data';

/**
 * Session shell.
 *  - local mode: a demo persona selected on /signin, stored in sessionStorage.
 *    It is NOT authentication and is namespaced so it can never be read as a
 *    Supabase session. In supabase mode this module is bypassed and the
 *    Supabase auth session + memberships table decide the actor.
 */
export interface Session {
  mode: 'local' | 'supabase';
  userId: string;
  fullName: string;
  role: Role;
  organizationId: string;
  organizationName: string;
  locationId?: string;
  locationName?: string;
  departmentId?: string;
}

const KEY = 'staymotion.pilot.demo-session.v1';

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try { const raw = sessionStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Session) : null; } catch { return null; }
}
export function setSession(s: Session) { sessionStorage.setItem(KEY, JSON.stringify(s)); }
export function clearSession() { sessionStorage.removeItem(KEY); }

export function actorOf(s: Session): Actor { return { userId: s.userId, organizationId: s.organizationId, locationId: s.locationId, role: s.role }; }

export function homeFor(role: Role): string {
  if (role === 'owner' || role === 'hq' || role === 'regional_manager') return '/hq';
  if (role === 'location_manager' || role === 'shift_lead') return '/manager';
  return '/employee';
}

/** Views a role may open. Employees never see manager/HQ; managers may open the employee view for their location. */
export function allowedViews(role: Role): Array<'employee' | 'manager' | 'hq'> {
  if (role === 'owner' || role === 'hq' || role === 'regional_manager') return ['hq', 'manager', 'employee'];
  if (role === 'location_manager' || role === 'shift_lead') return ['manager', 'employee'];
  return ['employee'];
}

export const isLocalMode = () => resolveMode() === 'local';
