'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeFor } from '@/src/session/session';
import { resolveSessionState } from '@/src/session/runtime';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const state = await resolveSessionState();
        if (!alive) return;
        if (state.session) router.replace(homeFor(state.session.role));
        else if (state.authenticated) router.replace('/onboarding');
        else router.replace('/signin');
      } catch {
        if (alive) router.replace('/signin');
      }
    })();
    return () => { alive = false; };
  }, [router]);

  return <div className="auth"><div className="small">Laster …</div></div>;
}
