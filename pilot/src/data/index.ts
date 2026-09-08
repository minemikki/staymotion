'use client';
import type { DataProvider } from './provider';
import { LocalProvider, MemoryStorage } from './local-provider';

/**
 * Provider selection. Exactly one switch:
 *   NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY present → Supabase
 *   otherwise                                                        → Local (browser storage)
 * NEXT_PUBLIC_STAYMOTION_MODE=local forces local even if env exists (useful in tests).
 */
export type DataMode = 'local' | 'supabase';

export function resolveMode(): DataMode {
  if (process.env.NEXT_PUBLIC_STAYMOTION_MODE === 'local') return 'local';
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'supabase' : 'local';
}

let cached: DataProvider | null = null;

export async function getProvider(): Promise<DataProvider> {
  if (cached) return cached;
  if (resolveMode() === 'supabase') {
    const [{ createBrowserSupabase }, { RealSupabaseProvider }] = await Promise.all([
      import('./supabase-provider'),
      import('./real-supabase-provider'),
    ]);
    cached = new RealSupabaseProvider(createBrowserSupabase());
  } else {
    const storage = typeof window !== 'undefined' ? window.localStorage : new MemoryStorage();
    cached = new LocalProvider(storage);
  }
  return cached;
}

export function resetLocalProvider() {
  if (cached && cached.mode === 'local') (cached as LocalProvider).reset();
}
