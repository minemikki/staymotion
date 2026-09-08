'use client';

import { resolveMode } from '../data';
import { createBrowserSupabase } from '../data/supabase-provider';
import { clearSession, getSession, type Session } from './session';

export interface SessionState {
  authenticated: boolean;
  session: Session | null;
}

type SessionContext = {
  userId: string;
  fullName: string;
  role: Session['role'];
  organizationId: string;
  organizationName: string;
  locationId?: string | null;
  locationName?: string | null;
  departmentId?: string | null;
};

/** Resolve the current app session in both local/demo and real Supabase mode. */
export async function resolveSessionState(): Promise<SessionState> {
  if (resolveMode() === 'local') {
    const s = getSession();
    return { authenticated: !!s, session: s };
  }

  const sb = createBrowserSupabase();
  const { data: authData, error: authError } = await sb.auth.getSession();
  if (authError || !authData.session?.user) return { authenticated: false, session: null };

  // An invitation may have been created after this auth user already existed.
  // Claiming on every bootstrap is idempotent and closes that gap. A missing
  // migration is surfaced by the following context RPC rather than crashing here.
  await sb.rpc('claim_pending_invitations');

  const { data, error } = await sb.rpc('get_my_session_context');
  if (error) throw new Error(error.message);
  if (!data) return { authenticated: true, session: null };

  const c = data as SessionContext;
  return {
    authenticated: true,
    session: {
      mode: 'supabase',
      userId: c.userId,
      fullName: c.fullName || authData.session.user.email || 'Bruker',
      role: c.role,
      organizationId: c.organizationId,
      organizationName: c.organizationName,
      locationId: c.locationId || undefined,
      locationName: c.locationName || undefined,
      departmentId: c.departmentId || undefined,
    },
  };
}

/** Authorization header for protected StayMotion route handlers. */
export async function apiAuthHeaders(mode: Session['mode']): Promise<Record<string, string>> {
  if (mode === 'local') return {};
  const sb = createBrowserSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Økten din er utløpt. Logg inn på nytt.');
  return { Authorization: `Bearer ${token}` };
}

export async function signOutRuntime(): Promise<void> {
  if (resolveMode() === 'supabase') {
    const sb = createBrowserSupabase();
    await sb.auth.signOut();
  }
  clearSession();
}
