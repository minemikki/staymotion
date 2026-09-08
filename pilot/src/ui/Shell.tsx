'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { allowedViews, clearSession, getSession, homeFor, isLocalMode, type Session } from '../session/session';
import { roleLabel } from '../domain/followup';
import { ToastProvider } from './Toast';

/**
 * Application shell: sidebar (desktop) / top bar + tab bar (mobile).
 * Views are gated by role. Employees get a single view and no tab bar.
 */
export function Shell({ children, view }: { children: (s: Session) => React.ReactNode; view: 'employee' | 'manager' | 'hq' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/signin'); return; }
    if (!allowedViews(s.role).includes(view)) { router.replace(homeFor(s.role)); return; }
    setSession(s);
  }, [router, view]);

  if (!session) return <div className="auth"><div className="small">Laster …</div></div>;

  const views = allowedViews(session.role);
  const label = { employee: 'Min dag', manager: 'Oversikt', hq: 'Kjede / HQ' } as const;
  const href = { employee: '/employee', manager: '/manager', hq: '/hq' } as const;
  const where = session.locationName ? `${session.organizationName} · ${session.locationName}` : session.organizationName;
  const single = views.length === 1;
  const signOut = () => { clearSession(); router.replace('/signin'); };

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
            {views.map((v) => <Link key={v} href={href[v]} aria-current={pathname === href[v] ? 'page' : undefined}>{label[v]}</Link>)}
          </nav>
          <div className="me">
            <b>{session.fullName}</b>{roleLabel(session.role)}
            <div><button type="button" onClick={signOut}>Logg ut</button></div>
          </div>
        </aside>
        <main className={'main' + (single ? ' single' : '')}>{children(session)}</main>
      </div>
      {!single && (
        <nav className="tabbar" aria-label="Visninger">
          {views.map((v) => <Link key={v} href={href[v]} aria-current={pathname === href[v] ? 'page' : undefined}>{label[v]}</Link>)}
        </nav>
      )}
      {isLocalMode() && <div className="devmode" aria-hidden>lokal modus</div>}
    </ToastProvider>
  );
}
