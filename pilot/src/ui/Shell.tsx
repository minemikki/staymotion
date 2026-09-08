'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { allowedViews, homeFor, isLocalMode, type Session } from '../session/session';
import { resolveSessionState, signOutRuntime } from '../session/runtime';
import { roleLabel } from '../domain/followup';
import { ToastProvider } from './Toast';

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    employee: <><path d="M4 10 12 3l8 7v10H4Z" /><path d="M9 20v-7h6v7" /></>,
    manager: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    hq: <><path d="M4 21V7h7v14M11 21V3h9v18M2 21h20M7 10v1m0 3v1m8-8h1m-1 4h1m-1 4h1" /></>,
    handover: <><path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4" /></>,
    team: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

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
      <a className="skip-link" href="#workspace">Hopp til innhold</a>
      <header className="topbar">
        <Link className="brand" href={homeFor(session.role)}><span className="mark" aria-hidden /> StayMotion</Link>
        <button className="mobile-signout" type="button" onClick={() => void signOut()}>Logg ut</button>
      </header>
      <div className="shell">
        <aside className="side" aria-label="Meny">
          <Link className="brand" href={homeFor(session.role)}><span className="mark" aria-hidden />StayMotion</Link>
          <div className="ctx">Arbeidsområde</div>
          <div className="sloc"><small>{session.locationName ? 'Lokasjon' : 'Organisasjon'}</small><strong>{where}</strong></div>
          <nav>
            {navigation.map((item) => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}><NavIcon name={item.key} /><span>{item.label}</span></Link>)}
          </nav>
          <div className="me">
            <b>{session.fullName}</b>{roleLabel(session.role)}
            <div><button type="button" onClick={() => void signOut()}>Logg ut</button></div>
          </div>
        </aside>
        <main id="workspace" tabIndex={-1} className={'main' + (single ? ' single' : '')}>{children(session)}</main>
      </div>
      {!single && (
        <nav className="tabbar" aria-label="Visninger">
          {navigation.map((item) => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}><NavIcon name={item.key} /><span>{item.key === 'hq' ? 'Kjede' : item.label}</span></Link>)}
        </nav>
      )}
      {isLocalMode() && <div className="devmode" aria-hidden>lokal modus</div>}
    </ToastProvider>
  );
}
