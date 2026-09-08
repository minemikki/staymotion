'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/src/ui/Shell';
import { useToast } from '@/src/ui/Toast';
import { getProvider } from '@/src/data';
import { createBrowserSupabase } from '@/src/data/supabase-provider';
import type { DataProvider } from '@/src/data/provider';
import type { Department, Membership, Profile, Role } from '@/src/domain/types';
import { roleLabel } from '@/src/domain/followup';
import { actorOf, type Session } from '@/src/session/session';

type TeamMembership = Membership & { invitedName?: string; invitedEmail?: string };
type Form = { name: string; email: string; role: Role; departmentId: string };

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function rolesFor(role: Role): Role[] {
  if (role === 'owner' || role === 'hq' || role === 'regional_manager') return ['employee', 'shift_lead', 'location_manager'];
  if (role === 'location_manager') return ['employee', 'shift_lead'];
  return ['employee'];
}

export default function TeamPage() {
  return <Shell view="manager">{(s) => <Team session={s} />}</Shell>;
}

function Team({ session }: { session: Session }) {
  const toast = useToast();
  const actor = useMemo(() => actorOf(session), [session]);
  const [db, setDb] = useState<DataProvider | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ name: '', email: '', role: 'employee', departmentId: '' });

  const load = useCallback(async (p: DataProvider) => {
    const [pp, baseMemberships, dd] = await Promise.all([
      p.listProfiles(session.organizationId),
      p.listMemberships(session.organizationId) as Promise<TeamMembership[]>,
      session.locationId ? p.listDepartments(session.locationId) : Promise.resolve([] as Department[]),
    ]);

    let mm = baseMemberships;
    // The shared provider intentionally keeps the core Membership shape small.
    // Team also needs pending-invite metadata so managers can see who has actually signed in.
    if (p.mode === 'supabase') {
      const sb = createBrowserSupabase();
      const { data } = await sb
        .from('memberships')
        .select('id, invited_name, invited_email')
        .eq('organization_id', session.organizationId);
      const inviteById = new Map((data || []).map((r) => [r.id, r]));
      mm = baseMemberships.map((m) => {
        const raw = inviteById.get(m.id);
        return {
          ...m,
          invitedName: raw?.invited_name || m.invitedName,
          invitedEmail: raw?.invited_email || m.invitedEmail,
        };
      });
    }

    setProfiles(pp);
    setMemberships(mm);
    setDepartments(dd);
  }, [session.organizationId, session.locationId]);

  useEffect(() => {
    getProvider().then(async (p) => { setDb(p); await load(p); });
  }, [load]);

  const visible = memberships
    .filter((m) => m.active && (!session.locationId || !m.locationId || m.locationId === session.locationId))
    .sort((a, b) => {
      const rank: Record<Role, number> = { owner: 0, hq: 1, regional_manager: 2, location_manager: 3, shift_lead: 4, employee: 5 };
      return rank[a.role] - rank[b.role];
    });

  const profileFor = (m: TeamMembership) => profiles.find((p) => p.id === m.userId);
  const displayName = (m: TeamMembership) => profileFor(m)?.fullName || m.invitedName || m.invitedEmail || 'Invitert bruker';
  const displayEmail = (m: TeamMembership) => profileFor(m)?.email || m.invitedEmail;

  async function sendInviteEmail(email: string) {
    if (!session.locationId) throw new Error('Mangler lokasjon');
    const sb = createBrowserSupabase();
    const { data, error } = await sb.functions.invoke('invite-user', {
      body: {
        email,
        locationId: session.locationId,
        redirectTo: `${location.origin}/`,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as { ok?: boolean; alreadyRegistered?: boolean };
  }

  async function add() {
    if (!db || !session.locationId || busy) return;
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (name.length < 2) { toast('Skriv inn navnet på personen.'); return; }
    if (db.mode === 'supabase' && !emailOk(email)) { toast('Skriv inn en gyldig e-post.'); return; }

    setBusy(true);
    try {
      await db.addEmployee(actor, {
        name,
        email: email || undefined,
        role: form.role,
        locationId: session.locationId,
        departmentId: form.departmentId || undefined,
        language: 'nb',
      });
      setForm({ name: '', email: '', role: 'employee', departmentId: '' });

      if (db.mode === 'supabase' && email) {
        try {
          await sendInviteEmail(email);
          toast('Personen er lagt til. Invitasjon er sendt på e-post.');
        } catch (e) {
          const msg = (e as Error).message || '';
          toast(/rate limit/i.test(msg)
            ? 'Personen er lagt til, men e-postleverandøren har midlertidig rate limit. Du kan sende invitasjonen på nytt senere.'
            : 'Personen er lagt til, men invitasjonsmailen kunne ikke sendes. Du kan prøve på nytt fra teamlisten.');
        }
      } else {
        toast('Personen er lagt til.');
      }

      await load(db);
    } catch (e) {
      const msg = (e as Error).message;
      toast(msg.includes('already invited') ? 'Denne e-posten er allerede invitert til lokasjonen.' : msg);
    } finally {
      setBusy(false);
    }
  }

  async function resend(m: TeamMembership) {
    if (!db || db.mode !== 'supabase' || !m.invitedEmail || sending) return;
    setSending(m.id);
    try {
      await sendInviteEmail(m.invitedEmail);
      toast('Ny invitasjon er sendt.');
      await load(db);
    } catch (e) {
      const msg = (e as Error).message || '';
      toast(/rate limit/i.test(msg) ? 'For mange e-poster på kort tid. Prøv igjen litt senere.' : msg || 'Kunne ikke sende invitasjonen.');
    } finally {
      setSending(null);
    }
  }

  const allowedRoles = rolesFor(session.role);

  return (
    <div className="wrapW rise">
      <div className="eyebrow">Team · {session.locationName || session.organizationName}</div>
      <h1 className="h1">Riktige folk. Riktig tilgang.</h1>
      <p className="lead">Legg ansatte til én gang. StayMotion bruker rollen og lokasjonen til å vise bare det de faktisk trenger.</p>

      <div className="sect">
        <div className="sect-h"><h2>Legg til person</h2><span className="small">{session.locationName || 'Første lokasjon'}</span></div>
        {!session.locationId ? (
          <div className="warn-note">Denne brukeren mangler en aktiv lokasjon. Fullfør lokasjonsoppsettet før du legger til folk.</div>
        ) : (
          <div className="card pad" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
              <label className="field"><span>Navn</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="f.eks. Nora Hansen" data-testid="team-name" /></label>
              <label className="field"><span>E-post {db?.mode === 'local' ? <span className="hint">(valgfritt i demo)</span> : null}</span><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nora@bedrift.no" data-testid="team-email" /></label>
              <label className="field"><span>Rolle</span><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} data-testid="team-role">{allowedRoles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select></label>
              <label className="field"><span>Avdeling <span className="hint">(valgfritt)</span></span><select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Hele lokasjonen</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            </div>
            <div className="row">
              <div className="small" style={{ maxWidth: 560 }}>
                {db?.mode === 'supabase'
                  ? 'Personen får en personlig StayMotion-invitasjon på e-post. Rollen blir koblet til akkurat denne lokasjonen.'
                  : 'Lokal modus oppretter en testperson med en gang.'}
              </div>
              <button className="btn primary" type="button" disabled={busy || !form.name.trim() || (db?.mode === 'supabase' && !emailOk(form.email))} onClick={() => void add()} data-testid="team-add">{busy ? 'Legger til …' : 'Legg til og inviter'}</button>
            </div>
          </div>
        )}
      </div>

      <div className="sect">
        <div className="sect-h"><h2>Teamet</h2><span className="small">{visible.length} aktive / inviterte</span></div>
        <div className="card">
          {visible.length === 0 ? <div className="empty"><b>Ingen personer her ennå.</b>Legg til den første personen over.</div> : visible.map((m) => {
            const pending = !!m.invitedEmail || !m.userId;
            const email = displayEmail(m);
            return (
              <div className="row" key={m.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--line,#E7E2D8)' }}>
                <div style={{ minWidth: 0 }}>
                  <b>{displayName(m)}</b>
                  <div className="small">{roleLabel(m.role)}{email ? ` · ${email}` : ''}</div>
                </div>
                <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                  <span className={'pill ' + (pending ? 'warn' : 'ok')}>{pending ? 'Venter på innlogging' : 'Aktiv'}</span>
                  {pending && db?.mode === 'supabase' && m.invitedEmail && (
                    <button className="btn sm ghost" type="button" disabled={sending === m.id} onClick={() => void resend(m)}>{sending === m.id ? 'Sender …' : 'Send på nytt'}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sect dark" style={{ padding: 24 }}>
        <div className="eyebrow">Tilgangsprinsipp</div>
        <h3 style={{ fontSize: 20, marginTop: 8 }}>Ingen felles bedriftsbruker.</h3>
        <p style={{ color: '#A6BBB0', marginTop: 7, lineHeight: 1.6 }}>Hver person har sin egen identitet. Det gjør at oppgaver, avvik, bekreftelser og audit-spor kan knyttes til riktig person uten at ansatte får mer tilgang enn rollen krever.</p>
      </div>
    </div>
  );
}
