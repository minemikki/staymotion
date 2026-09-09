'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProvider, resolveMode } from '@/src/data';
import type { Location, Membership, Organization, Profile } from '@/src/domain/types';
import { roleLabel } from '@/src/domain/followup';
import { homeFor, setSession } from '@/src/session/session';

/**
 * Sign-in.
 *  - supabase mode: email OTP / magic link (Supabase Auth). Memberships decide the role afterwards.
 *  - local mode: a persona picker. This is explicitly NOT authentication; it selects a seeded
 *    or self-created person so the pilot can be walked through end to end.
 */
export default function SignIn() {
  const mode = resolveMode();
  return mode === 'supabase' ? <EmailSignIn /> : <PersonaSignIn />;
}

function friendlyAuthError(x: unknown, fallback: string) {
  const raw = (x as Error)?.message || fallback;
  if (/rate limit/i.test(raw)) return 'Det er sendt mange e-poster på kort tid. Vent litt før du prøver igjen.';
  if (/database error saving new user/i.test(raw)) return 'Vi klarte ikke å opprette brukeren akkurat nå. Prøv igjen om et øyeblikk.';
  if (/token.*expired|otp.*expired|expired.*token/i.test(raw)) return 'Koden er utløpt. Be om en ny kode.';
  if (/invalid.*token|token.*invalid|otp.*invalid/i.test(raw)) return 'Koden stemmer ikke. Sjekk e-posten og prøv igjen.';
  return raw;
}

function EmailSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const id = window.setTimeout(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function sendCode() {
    setErr('');
    setBusy(true);
    try {
      const { createBrowserSupabase } = await import('@/src/data/supabase-provider');
      const sb = createBrowserSupabase();
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${location.origin}/` },
      });
      if (error) throw error;
      setSent(true);
      setCooldown(60);
    } catch (x) {
      setErr(friendlyAuthError(x, 'Kunne ikke sende innlogging'));
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { createBrowserSupabase } = await import('@/src/data/supabase-provider');
      const sb = createBrowserSupabase();
      const { error } = await sb.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      });
      if (error) throw error;
      router.replace('/');
      router.refresh();
    } catch (x) {
      setErr(friendlyAuthError(x, 'Ugyldig eller utløpt kode'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth"><div className="box rise">
      <div className="brand"><span className="mark" aria-hidden /> StayMotion</div>
      <div className="eyebrow">Logg inn</div>
      <h1 className="h1">{sent ? 'Skriv inn engangskoden.' : 'Skriv inn e-posten din.'}</h1>
      <p className="lead">{sent ? `Vi sendte en kode til ${email}.` : 'Du får en engangskode eller innloggingslenke på e-post. Ingen passord å huske.'}</p>

      {sent ? (
        <form onSubmit={verify} style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          <label className="field">
            <span className="sr">Engangskode</span>
            <input
              className="input"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Engangskode"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              autoFocus
            />
          </label>
          {err && <div className="warn-note">{err}</div>}
          <button className="btn primary block" type="submit" disabled={busy || !code.trim()}>{busy ? 'Logger inn…' : 'Logg inn'}</button>
          <button className="btn soft block" type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown > 0 ? `Send ny kode om ${cooldown}s` : 'Send ny kode'}</button>
          <button className="btn ghost block" type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setErr(''); setCooldown(0); }}>Bruk en annen e-post</button>
          <p className="small" style={{ marginTop: 2 }}>Har e-posten en innloggingslenke i stedet, kan du fortsatt bruke den.</p>
        </form>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          <label className="field"><span className="sr">E-post</span><input className="input" type="email" required autoComplete="email" placeholder="navn@bedrift.no" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {err && <div className="warn-note">{err}</div>}
          <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Sender…' : 'Send engangskode'}</button>
        </form>
      )}
    </div></div>
  );
}

function PersonaSignIn() {
  const router = useRouter();
  const [rows, setRows] = useState<{ org: Organization; loc?: Location; p: Profile; m: Membership }[]>([]);
  useEffect(() => {
    (async () => {
      const db = await getProvider();
      const orgs = await db.listOrganizations();
      const out: typeof rows = [];
      for (const org of orgs) {
        const [profiles, mems, locs] = await Promise.all([db.listProfiles(org.id), db.listMemberships(org.id), db.listLocations(org.id)]);
        for (const m of mems) {
          const p = profiles.find((x) => x.id === m.userId); if (!p) continue;
          out.push({ org, loc: locs.find((l) => l.id === m.locationId) || locs[0], p, m });
        }
      }
      setRows(out);
    })();
  }, []);
  function pick(r: typeof rows[number]) {
    setSession({ mode: 'local', userId: r.p.id, fullName: r.p.fullName, role: r.m.role, organizationId: r.org.id, organizationName: r.org.name, locationId: r.loc?.id, locationName: r.loc?.name, departmentId: r.m.departmentId });
    router.push(homeFor(r.m.role));
  }
  const byOrg = rows.reduce<Record<string, typeof rows>>((acc, r) => { (acc[r.org.id] ||= []).push(r); return acc; }, {});
  return (
    <div className="auth"><div className="box rise">
      <div className="brand"><span className="mark" aria-hidden /> StayMotion</div>
      <div className="eyebrow">Pilot · lokal modus</div>
      <h1 className="h1">Hvem er du i dag?</h1>
      <p className="lead">Velg deg selv, eller sett opp en ny bedrift. Dette er en testinnlogging uten passord.</p>
      {Object.values(byOrg).map((list) => (
        <div key={list[0].org.id} style={{ marginTop: 24 }}>
          <div className="small" style={{ fontWeight: 700 }}>{list[0].org.name}</div>
          <div className="personas">
            {list.map((r) => (
              <button key={r.m.id} className="persona" type="button" onClick={() => pick(r)} data-testid={`persona-${r.m.role}`}>
                <span className="av" aria-hidden>{r.p.fullName.slice(0, 1)}</span>
                <span><b>{r.p.fullName}</b><span>{roleLabel(r.m.role)}{r.loc ? ` · ${r.loc.name}` : ''}</span></span>
                <span className="go" aria-hidden>→</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 28 }}>
        <Link className="btn ghost block" href="/onboarding" data-testid="start-onboarding">Sett opp ny bedrift</Link>
      </div>
    </div></div>
  );
}
