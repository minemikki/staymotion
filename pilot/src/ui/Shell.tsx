'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { allowedViews, homeFor, isLocalMode, type Session } from '../session/session';
import { resolveSessionState, signOutRuntime } from '../session/runtime';
import { roleLabel } from '../domain/followup';
import { ToastProvider } from './Toast';

/**
 * Application shell: sidebar (desktop) / top bar + tab bar (mobile).
 * Views are gated by role. Employees get a single view and no tab bar.
 * In Supabase mode the shell resolves the authenticated user + membership from
 * RLS-backed RPCs; sessionStorage is never treated as authentication.
 */
export function Shell({ children, view }: { children: (s: Session) => React.ReactNode; view: 'employee' | 'manager' | 'hq' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const state = await resolveSessionState();
        if (!alive) return;
        if (!state.session) {
          router.replace(state.authenticated ? '/onboarding' : '/signin');
          return;
        }
        if (!allowedViews(state.session.role).includes(view)) {
          router.replace(homeFor(state.session.role));
          return;
        }
        setSession(state.session);
      } catch {
        if (alive) router.replace('/signin');
      }
    })();
    return () => { alive = false; };
  }, [router, view]);

  if (!session) return <div className="auth"><div className="small">Laster …</div></div>;

  const views = allowedViews(session.role);
  const label = { employee: 'Min dag', manager: 'Oversikt', hq: 'Kjede / HQ' } as const;
  const href = { employee: '/employee', manager: '/manager', hq: '/hq' } as const;
  const canManage = session.role !== 'employee';
  const navigation = [
    ...views.map((v) => ({ key: v, href: href[v], label: label[v] })),
    ...(canManage ? [{ key: 'handover', href: '/handover', label: 'Vaktbytte' }] : []),
    ...(canManage ? [{ key: 'team', href: '/team', label: 'Team' }] : []),
  ];
  const where = session.locationName ? `${session.organizationName} · ${session.locationName}` : session.organizationName;
  const single = navigation.length === 1;

  const signOut = async () => {
    await signOutRuntime();
    router.replace('/signin');
  };

  return (
    <ToastProvider>
      <header className="topbar">
        <Link className="brand" href={homeFor(session.role)}><span className="mark" aria-hidden /> StayMotion</Link>
        <div className="where">{where}</div>
      </header>
      <div className="shell">
        <aside className="side" aria-label="Meny">
          <Link className="brand" href={homeFor(session.role)}><span className="mark" aria-hidden />StayMotion</Link>
          <div className="ctx">Arbeidsområde</div>
          <div className="sloc"><small>{session.locationName ? 'Lokasjon' : 'Organisasjon'}</small><strong>{where}</strong></div>
          <nav>
            {navigation.map((item) => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
          </nav>
          <div className="me">
            <b>{session.fullName}</b>{roleLabel(session.role)}
            <div><button type="button" onClick={() => void signOut()}>Logg ut</button></div>
          </div>
        </aside>
        <main className={'main' + (single ? ' single' : '')}>{children(session)}</main>
      </div>
      {!single && (
        <nav className="tabbar" aria-label="Visninger">
          {navigation.map((item) => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
        </nav>
      )}
      {isLocalMode() && <div className="devmode" aria-hidden>lokal modus</div>}
    </ToastProvider>
  );
}
