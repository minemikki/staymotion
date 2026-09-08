'use client';
import { useRouter } from 'next/navigation';
import { Shell } from '@/src/ui/Shell';
import { roleLabel } from '@/src/domain/followup';
import { signOutRuntime } from '@/src/session/runtime';
import type { Session } from '@/src/session/session';

/** "Meg": who am I signed in as, where, and how to sign out. Nothing more — no scores, no rankings. */
export default function MePage() {
  return <Shell view="employee">{(s) => <Me session={s} />}</Shell>;
}

function Me({ session }: { session: Session }) {
  const router = useRouter();
  const initials = session.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="wrapN rise emp">
      <div className="page-head">
      <div className="eyebrow">Meg</div>
      <h1 className="h1">{session.fullName}</h1>
      <p className="lead">Det du gjør i StayMotion knyttes til deg, så lederen alltid vet hvem som har sett og gjort hva.</p>
      </div>

      <div className="card me-card" style={{ marginTop: 24 }}>
        <span className="av" aria-hidden>{initials}</span>
        <div><b style={{ display: 'block', fontSize: 'var(--fs-4)' }}>{session.fullName}</b><span className="small">{roleLabel(session.role)} · {session.locationName || session.organizationName}</span></div>
      </div>

      <div className="card me-list">
        <div className="row"><span>Bedrift</span><b>{session.organizationName}</b></div>
        {session.locationName && <div className="row"><span>Lokasjon</span><b>{session.locationName}</b></div>}
        <div className="row"><span>Rolle</span><b>{roleLabel(session.role)}</b></div>
        <div className="row"><span>Innlogging</span><b>{session.mode === 'supabase' ? 'E-post (engangskode)' : 'Demo-persona'}</b></div>
      </div>

      <div className="sect">
        <button className="btn ghost block" type="button" onClick={async () => { await signOutRuntime(); router.replace('/signin'); }}>Logg ut</button>
      </div>
    </div>
  );
}
