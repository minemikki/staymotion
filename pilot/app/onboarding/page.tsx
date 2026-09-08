'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getProvider } from '@/src/data';
import { BUSINESS_TYPE_LABEL, DEFAULT_DEPARTMENTS, ROUTINE_TEMPLATES } from '@/src/domain/templates';
import type { BusinessType, Role } from '@/src/domain/types';
import { roleLabel } from '@/src/domain/followup';
import { setSession } from '@/src/session/session';

/**
 * First-run onboarding — five screens, every one pre-filled so "Neste" five times
 * produces a working restaurant. Skippable where safe.
 */
const STEPS = ['Bedrift', 'Lokasjon', 'Avdelinger', 'Rutiner', 'Folk'] as const;
type Emp = { name: string; role: Role; department?: string };

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [type, setType] = useState<BusinessType>('restaurant');
  const [locName, setLocName] = useState('');
  const [city, setCity] = useState('');
  const [deps, setDeps] = useState<string[]>(DEFAULT_DEPARTMENTS.restaurant);
  const [newDep, setNewDep] = useState('');
  const [tpl, setTpl] = useState<string[]>(ROUTINE_TEMPLATES.filter((t) => t.defaultOn).map((t) => t.key));
  const [emps, setEmps] = useState<Emp[]>([]);
  const [emp, setEmp] = useState<Emp>({ name: '', role: 'employee' });

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length >= 2 && ownerName.trim().length >= 2;
    if (step === 1) return locName.trim().length >= 2;
    if (step === 2) return deps.length >= 1;
    return true;
  }, [step, name, ownerName, locName, deps]);

  function chooseType(t: BusinessType) { setType(t); setDeps(DEFAULT_DEPARTMENTS[t]); }
  function toggle<T>(arr: T[], v: T) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

  async function finish() {
    setBusy(true); setErr('');
    try {
      const db = await getProvider();
      const res = await db.createOrganization({ name, businessType: type, location: { name: locName, city }, departments: deps, ownerName, employees: emps.filter((e) => e.name.trim()), templateKeys: tpl });
      setSession({ mode: db.mode, userId: res.owner.id, fullName: res.owner.fullName, role: 'owner', organizationId: res.organization.id, organizationName: res.organization.name, locationId: res.location.id, locationName: res.location.name });
      router.push('/manager?welcome=1');
    } catch (x) { setErr((x as Error).message || 'Noe gikk galt'); setBusy(false); }
  }

  return (
    <div className="auth" style={{ alignItems: 'start' }}>
      <div className="box ob rise" style={{ width: 'min(560px,100%)' }}>
        <div className="brand"><span className="mark" aria-hidden /> StayMotion</div>
        <div className="progress" aria-label={`Steg ${step + 1} av ${STEPS.length}`}>{STEPS.map((s, i) => <i key={s} className={i <= step ? 'on' : ''} />)}</div>
        <div className="eyebrow">Steg {step + 1} av {STEPS.length} · {STEPS[step]}</div>

        {step === 0 && (<>
          <h1 className="h1">Hva heter bedriften?</h1>
          <p className="lead">Vi setter opp en rolig start. Alt kan endres senere.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
            <label className="field"><span>Bedriftsnavn</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. Sabi Sushi" data-testid="org-name" /></label>
            <label className="field"><span>Ditt navn</span><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Du er eier / daglig leder" data-testid="owner-name" /></label>
            <div className="field"><span>Type sted</span>
              <div className="choices">
                {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((t) => (
                  <button key={t} type="button" className="choice" aria-pressed={type === t} onClick={() => chooseType(t)}><b>{BUSINESS_TYPE_LABEL[t]}</b><span>{t === 'restaurant' ? 'Kjøkken, sal og bar' : t === 'cafe' ? 'Disk og kjøkken' : t === 'bar' ? 'Bar og lager' : 'Resepsjon og housekeeping'}</span></button>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {step === 1 && (<>
          <h1 className="h1">Første lokasjon</h1>
          <p className="lead">Har du flere steder, legger du dem til etterpå.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
            <label className="field"><span>Navn på stedet</span><input className="input" autoFocus value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="f.eks. Stavanger sentrum" data-testid="loc-name" /></label>
            <label className="field"><span>By <span className="hint">(valgfritt)</span></span><input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Stavanger" /></label>
          </div>
        </>)}

        {step === 2 && (<>
          <h1 className="h1">Hvilke avdelinger har dere?</h1>
          <p className="lead">Vi har foreslått det vanlige for {BUSINESS_TYPE_LABEL[type].toLowerCase()}. Ta bort eller legg til.</p>
          <div className="choices" style={{ marginTop: 20 }}>
            {[...new Set([...DEFAULT_DEPARTMENTS[type], ...deps])].map((d) => (
              <button key={d} type="button" className="choice" aria-pressed={deps.includes(d)} onClick={() => setDeps(toggle(deps, d))}><b>{d}</b></button>
            ))}
          </div>
          <div className="emp-row"><input className="input" placeholder="Ny avdeling" value={newDep} onChange={(e) => setNewDep(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newDep.trim()) { e.preventDefault(); setDeps([...deps, newDep.trim()]); setNewDep(''); } }} /><button type="button" className="btn ghost" disabled={!newDep.trim()} onClick={() => { setDeps([...deps, newDep.trim()]); setNewDep(''); }}>Legg til</button></div>
        </>)}

        {step === 3 && (<>
          <h1 className="h1">Rutiner å starte med</h1>
          <p className="lead">Operasjonelle startrutiner — ikke en juridisk sjekkliste. Du justerer dem selv.</p>
          <div style={{ display: 'grid', gap: 8, marginTop: 20 }}>
            {ROUTINE_TEMPLATES.map((t) => (
              <label key={t.key} className="checkrow"><input type="checkbox" checked={tpl.includes(t.key)} onChange={() => setTpl(toggle(tpl, t.key))} /><span><b>{t.title}</b><span>{t.description}</span></span></label>
            ))}
          </div>
        </>)}

        {step === 4 && (<>
          <h1 className="h1">Legg til noen folk</h1>
          <p className="lead">Valgfritt nå. De får ingen e-post ennå — dette er for at vaktene skal ha riktige navn.</p>
          <div className="emp-row" style={{ marginTop: 20 }}>
            <input className="input" placeholder="Navn" value={emp.name} onChange={(e) => setEmp({ ...emp, name: e.target.value })} data-testid="emp-name" />
            <select className="input" value={emp.role} onChange={(e) => setEmp({ ...emp, role: e.target.value as Role })} aria-label="Rolle">
              {(['employee', 'shift_lead', 'location_manager'] as Role[]).map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
            <select className="input" value={emp.department || ''} onChange={(e) => setEmp({ ...emp, department: e.target.value || undefined })} aria-label="Avdeling">
              <option value="">Avdeling (valgfritt)</option>{deps.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button type="button" className="btn ghost" disabled={!emp.name.trim()} onClick={() => { setEmps([...emps, emp]); setEmp({ name: '', role: 'employee' }); }} data-testid="emp-add">Legg til</button>
          </div>
          {emps.length > 0 && <div className="emp-list">{emps.map((e, i) => <div key={i}><span><b>{e.name}</b> · {roleLabel(e.role)}{e.department ? ` · ${e.department}` : ''}</span><button type="button" className="linkbtn" onClick={() => setEmps(emps.filter((_, j) => j !== i))}>Fjern</button></div>)}</div>}
        </>)}

        {err && <div className="warn-note" style={{ marginTop: 16 }}>{err}</div>}
        <div className="ob-nav">
          {step > 0 ? <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>Tilbake</button> : <a className="btn ghost" href="/signin">Avbryt</a>}
          {step < STEPS.length - 1
            ? <button type="button" className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)} data-testid="ob-next">Neste</button>
            : <button type="button" className="btn primary" disabled={busy} onClick={finish} data-testid="ob-finish">{busy ? 'Setter opp …' : emps.length ? 'Fullfør' : 'Fullfør uten å legge til folk'}</button>}
        </div>
      </div>
    </div>
  );
}
