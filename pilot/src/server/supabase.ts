import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

/** Server-only Supabase helpers. Never import this module from a client component. */
export function realModeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_STAYMOTION_MODE === 'local') return false;
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase-miljøvariabler mangler');
  return { url, anon };
}

export function createUserServerSupabase(accessToken: string): SupabaseClient {
  const { url, anon } = env();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function bearerToken(req: Request): string | null {
  const raw = req.headers.get('authorization') || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export async function authenticatedClient(req: Request): Promise<{ sb: SupabaseClient; user: User; token: string } | null> {
  if (!realModeEnabled()) return null;
  const token = bearerToken(req);
  if (!token) return null;
  const sb = createUserServerSupabase(token);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { sb, user: data.user, token };
}
