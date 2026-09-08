'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { allowedViews, homeFor, isLocalMode, type Session } from '../session/session';
import { resolveSessionState, signOutRuntime } from '../session/runtime';
import { roleLabel } from '../domain/followup';
import { ToastProvider } from './Toast';

type NavKey = 'today' | 'report' | 'tasks' | 'reports' | 'me' | 'now' | 'watch' | 'team' | 'handover' | 'insight' | 'chain' | 'risk' | 'patterns' | 'locations' | 'ask' | 'manager' | 'employee';
type NavItem = { key: NavKey; href: string; label: string; short?: string; icon: string; report?: boolean };

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    today: <><path d="M4 10 12 3l8 7v10H4Z" /><path d="M9 20v-7h6v7" /></>,
    report: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    tasks: <><path d="M9 11l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="4" /></>,
    reports: <><path d="M6 3h9l5 5v13H6z" /><path d="M14 3v6h6M9 13h6M9 17h6" /></>,
    me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    now: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    watch: <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    team: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
    handover: <><path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4" /></>,
    insight: <><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" /><path d="M5 18l.9 2.1L8 21l-2.1.9L5 24" transform="translate(0 -4)" /></>,
    chain: <><path d="M4 21V7h7v14M11 21V3h9v18M2 21h20" /></>,
    risk: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 10v5M12 18v.5" /></>,
    patterns: <><path d="M3 17l5-6 4 4 6-8 3 4" /></>,
    locations: <><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
    ask: <><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /><path d="M9.5 10a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01" /></>,
    manager: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    employee: <><path d="M4 10 12 3l8 7v10H4Z" /><path d="M9 20v-7h6v7" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

/**
 * Navigation per role (spec §6). Sections inside one page are addressed with hashes so
 * the tabs stay honest: they point at real content, not at empty routes.
 */
function navigationFor(session: Session): { primary: NavItem[]; secondary: NavItem[] } {
  const views = allowedViews(session.role);
  if (session.role === 'employee') {
    return {
      primary: [
        { key: 'today', href: '/employee', label: 'I dag', icon: 'today' },
        { key: 'report', href: '/employee?meld=1', label: 'Meld', icon: 'report', report: true },
        { key: 'tasks', href: '/employee#oppgaver', label: 'Oppgaver', icon: 'tasks' },
        { key: 'reports', href: '/employee#rapporter', label: 'Rapporter', icon: 'reports' },
        { key: 'me', href: '/employee/meg', label: 'Meg', icon: 'me' },
      ],
      secondary: [],
    };
  }
  if (views.includes('hq')) {
    return {
      primary: [
        { key: 'chain', href: '/hq', label: 'Kjede', icon: 'chain' },
        { key: 'risk', href: '/hq#risiko', label: 'Risiko', icon: 'risk' },
        { key: 'patterns', href: '/hq#monstre', label: 'Mønstre', icon: 'patterns' },
        { key: 'locations', href: '/hq#lokasjoner', label: 'Lokasjoner', icon: 'locations' },
        { key: 'ask', href: '/hq#spor', label: 'Spør StayMotion', short: 'Spør', icon: 'ask' },
      ],
      secondary: [
        { key: 'manager', href: '/manager', label: 'Oversikt', icon: 'manager' },
        { key: 'team', href: '/team', label: 'Team', icon: 'team' },
        { key: 'handover', href: '/handover', label: 'Vaktbytte', icon: 'handover' },
        { key: 'employee', href: '/employee', label: 'Min dag', icon: 'employee' },
      ],
    };
  }
  return {
    primary: [
      { key: 'now', href: '/manager', label: 'Nå', icon: 'now' },
      { key: 'watch', href: '/manager#folges-opp', label: 'Følges opp', short: 'Følges', icon: 'watch' },
      { key: 'team', href: '/team', label: 'Team', icon: 'team' },
      { key: 'handover', href: '/handover', label: 'Vaktbytte', short: 'Vakt', icon: 'handover' },
      { key: 'insight', href: '/manager#innsikt', label: 'Innsikt', icon: 'insight' },
    ],
    secondary: [{ key: 'employee', href: '/employee', label: 'Min dag', icon: 'employee' }],
  };
}

function useHash() {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return hash;
}

/**
 * Application shell: narrow light sidebar (desktop) / top bar + tab bar (mobile).
 * Views are gated by role. In Supabase mode the shell resolves the authenticated user +
 * membership from RLS-backed RPCs; sessionStorage is never treated as authentication.
 */
export function Shell({ children, view }: { children: (s: Session) => React.ReactNode; view: 'employee' | 'manager' | 'hq' }) {
  const router = useRouter();
  const pathname = usePathname();
  const hash = useHash();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const state = await resolveSessionState();
        if (!alive) return;
        if (!state.session) { router.replace(state.authenticated ? '/onboarding' : '/signin'); return; }
        if (!allowedViews(state.session.role).includes(view)) { router.replace(homeFor(state.session.role)); return; }
        setSession(state.session);
      } catch { if (alive) router.replace('/signin'); }
    })();
    return () => { alive = false; };
  }, [router, view]);

  if (!session) return <div className="auth"><div className="small">Laster …</div></div>;

  const { primary, secondary } = navigationFor(session);
  const isCurrent = (item: NavItem) => {
    if (item.report) return false;
    const [path, itemHash] = item.href.split('#');
    if (path !== pathname) return false;
    if (itemHash) return hash === `#${itemHash}`;
    // the base item owns the page unless a sibling hash is active
    return !primary.some((o) => o !== item && o.href.startsWith(`${pathname}#`) && hash === o.href.slice(pathname.length));
  };
  const where = session.locationName ? `${session.organizationName} · ${session.locationName}` : session.organizationName;
  const initials = session.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const signOut = async () => { await signOutRuntime(); router.replace('/signin'); };

  return (
    <ToastProvider>
      <a className="skip-link" href="#workspace">Hopp til innhold</a>
      <header className="topbar">
        <Link className="brand" href={homeFor(session.role)}><span className="mark" aria-hidden /> StayMotion</Link>
        <div className="where">{where}</div>
        <button className="mobile-signout" type="button" onClick={() => void signOut()}>Logg ut</button>
      </header>
      <div className="shell">
        <aside className="side" aria-label="Meny">
          <Link className="brand" href={homeFor(session.role)}><span className="mark" aria-hidden />StayMotion</Link>
          <div className="ctx">Arbeidsområde</div>
          <div className="sloc"><div><small>{session.locationName ? 'Lokasjon' : 'Organisasjon'}</small><strong>{where}</strong></div></div>
          <nav aria-label="Hovedmeny">
            {primary.map((item) => <Link key={item.key} href={item.href} className={item.report ? 'nav-report' : undefined} aria-current={isCurrent(item) ? 'page' : undefined}><NavIcon name={item.icon} /><span>{item.label}</span></Link>)}
          </nav>
          {secondary.length > 0 && (<>
            <div className="ctx">Mer</div>
            <nav aria-label="Flere visninger">
              {secondary.map((item) => <Link key={item.key} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}><NavIcon name={item.icon} /><span>{item.label}</span></Link>)}
            </nav>
          </>)}
          <div className="me">
            <span className="av" aria-hidden>{initials}</span>
            <div><b>{session.fullName}</b>{roleLabel(session.role)}<div><button type="button" onClick={() => void signOut()}>Logg ut</button></div></div>
          </div>
        </aside>
        <main id="workspace" tabIndex={-1} className="main">{children(session)}</main>
      </div>
      <nav className="tabbar" aria-label="Visninger">
        {primary.map((item) => <Link key={item.key} href={item.href} className={item.report ? 'nav-report' : undefined} aria-current={isCurrent(item) ? 'page' : undefined}><NavIcon name={item.icon} /><span>{item.short || item.label}</span></Link>)}
      </nav>
      {isLocalMode() && <div className="devmode" aria-hidden>lokal modus</div>}
    </ToastProvider>
  );
}
