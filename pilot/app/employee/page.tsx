'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/src/ui/Shell';
import { Capture, type CaptureInitial } from '@/src/ui/Capture';
import { SignalCapture, type SignalOutcome } from '@/src/ui/SignalCapture';
import { useToast } from '@/src/ui/Toast';
import { getProvider } from '@/src/data';
import type { DataProvider } from '@/src/data/provider';
import type { Incident, Task } from '@/src/domain/types';
import type { AnalyzeResult } from '@/src/ai/contract';
import type { CaptureSource } from '@/src/domain/types';
import { CATEGORY_LABEL } from '@/src/ai/rules-adapter';
import { actorOf, type Session } from '@/src/session/session';
import { incidentStatus } from '@/src/domain/incident-presentation';
import { Icon, categoryIcon, taskIcon } from '@/src/ui/icons';

const PIN = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>;
const STATUS_LABEL = { 1: 'Sendt', 2: 'Sett av leder', 3: 'Løst' } as const;

function greeting() { const h = new Date().getHours(); return h < 10 ? 'God morgen' : h < 17 ? 'Hei' : 'God kveld'; }
/** Where a report is on its way: Sendt → Sett av leder → Løst. */
function stepOf(status: Incident['status']): 1 | 2 | 3 { return status === 'resolved' || status === 'closed' ? 3 : status === 'open' ? 1 : 2; }

export default function EmployeePage() {
  return <Shell view="employee">{(s) => <Employee session={s} />}</Shell>;
}

function Employee({ session }: { session: Session }) {
  const toast = useToast();
  const router = useRouter();
  const [db, setDb] = useState<DataProvider | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Incident[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [capture, setCapture] = useState<null | 'voice' | 'camera'>(null);
  const [initial, setInitial] = useState<CaptureInitial | undefined>(undefined);
  const [outcome, setOutcome] = useState<SignalOutcome>(null);
  const [pending, setPending] = useState(0); // proposals waiting in the Capture sheet — drives the Signal's «found» state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const statusRef = useRef<Record<string, Incident['status']>>({});
  const actor = useMemo(() => actorOf(session), [session]); // stable per session, so load/effects don't loop

  const load = useCallback(async (p: DataProvider, announce = false) => {
    if (!session.locationId) return;
    try {
      const [t, i] = await Promise.all([
        p.listTasks(actor, session.locationId),
        p.listIncidents(actor, { organizationId: session.organizationId, locationId: session.locationId }),
      ]);
      const nextMine = i.filter((x) => x.reportedBy === session.userId).slice(0, 5);
      if (announce) {
        for (const inc of nextMine) {
          const before = statusRef.current[inc.id];
          if (!before || before === inc.status) continue;
          if (inc.status === 'acknowledged') toast(`Lederen har sett «${inc.title}».`);
          else if (inc.status === 'resolved') toast(`«${inc.title}» er løst.`);
          else if (inc.status === 'needs_attention') toast(`«${inc.title}» følges opp videre.`);
        }
      }
      statusRef.current = Object.fromEntries(nextMine.map((x) => [x.id, x.status]));
      setTasks(t);
      setMine(nextMine);
      setError('');
    } catch {
      setError('Kunne ikke hente siste status. Prøv igjen.');
    } finally { setLoading(false); }
  }, [actor, session, toast]);

  useEffect(() => { getProvider().then(async (p) => { setDb(p); await load(p); }).catch(() => { setError('Kunne ikke koble til. Last siden på nytt.'); setLoading(false); }); }, [load]);

  // "Meld" in the tab bar deep-links here with ?meld=1 → bring the Signal into view and focus it.
  useEffect(() => {
    if (!db) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('meld') === '1') {
      router.replace('/employee');
      const el = document.querySelector<HTMLButtonElement>('[data-testid="open-voice"]');
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true });
    }
  }, [db, router]);

  // The Signal produced a proposal → open the confirmation panel. Nothing is stored until the employee confirms.
  // Let the Signal show what it found for a beat before the confirmation sheet slides over it.
  const onAnalyzed = useCallback((result: AnalyzeResult, transcript: string, source: CaptureSource) => {
    setInitial({ analysis: result, transcript, source });
    setPending(result.issues.length);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => setCapture('voice'), reduce ? 0 : 700);
  }, []);
  const showOutcome = useCallback((created: Incident[]) => {
    const o: SignalOutcome = created.some((i) => i.severity === 'critical') ? 'critical' : 'sent';
    setOutcome(o); setTimeout(() => setOutcome(null), 6000);
  }, []);

  // Employee gets the same live loop as the manager: when a leader acknowledges or
  // resolves one of their reports, realtime is only used as an invalidation signal;
  // the row is re-read through RLS before the UI changes.
  useEffect(() => {
    if (!db?.subscribeIncidentChanges || !session.locationId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = db.subscribeIncidentChanges(
      actor,
      { organizationId: session.organizationId, locationId: session.locationId },
      () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void load(db, true); }, 80); },
    );
    return () => { if (timer) clearTimeout(timer); stop(); };
  }, [db, actor, session.organizationId, session.locationId, load]);

  async function toggle(t: Task) {
    if (!db || pendingTask) return;
    setPendingTask(t.id);
    try {
      const updated = t.status === 'done' ? await db.reopenTask(actor, t.id) : await db.completeTask(actor, t.id);
      setTasks((arr) => arr.map((x) => (x.id === t.id ? updated : x)));
      if (updated.status === 'done') toast(t.automationKey === 'temp_check' ? 'Logget i temperaturkontroll' : 'Merket som gjort');
    } catch { toast('Oppgaven ble ikke lagret. Prøv igjen.'); }
    finally { setPendingTask(null); }
  }

  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'skipped');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const left = openTasks.length;
  const visible = showAll ? tasks : [...openTasks.slice(0, 3), ...doneTasks.slice(0, Math.max(0, 3 - openTasks.length))];
  const pct = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
  const first = session.fullName.split(' ')[0];
  const stateTitle = loading ? 'Henter dagen din …' : !tasks.length ? 'Ingen rutiner lagt opp.' : left === 0 ? 'Alt er gjort.' : left === 1 ? 'Én ting igjen.' : `${left} ting igjen.`;
  const stateSub = loading ? 'Et øyeblikk.' : !tasks.length ? 'Du kan fortsatt melde fra om noe.' : left === 0 ? 'Fin vakt. StayMotion sier fra hvis noe dukker opp.' : 'Ta én ting om gangen.';
  const openReports = mine.filter((i) => stepOf(i.status) < 3).length;
  const criticalOpen = mine.some((i) => i.severity === 'critical' && stepOf(i.status) < 3);
  const attention = mine.filter((i) => i.status === 'needs_attention').length;
  const allOk = left === 0 && !criticalOpen && attention === 0;
  const heroTone = loading ? '' : criticalOpen || attention ? 'warn' : allOk ? 'ok' : 'warn';
  const heroTitle = loading ? 'Henter dagen din …'
    : criticalOpen ? 'Én kritisk sak følges opp'
    : attention ? `${attention === 1 ? 'Én rapport' : `${attention} rapporter`} venter på oppfølging`
    : left ? `${left === 1 ? 'Én ting' : `${left} ting`} før du er i mål`
    : openReports ? `${openReports === 1 ? 'Én rapport' : `${openReports} rapporter`} er underveis`
    : 'Alt under kontroll';
  const heroMeta = loading ? 'Et øyeblikk.' : [
    tasks.length ? `${doneTasks.length} av ${tasks.length} rutiner gjort` : 'Ingen rutiner lagt opp i dag',
    openReports ? `${openReports} rapport${openReports > 1 ? 'er' : ''} underveis` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="rise emp">
      <section className="hero-card" aria-label="Status for vakten">
        <div className="hero-top">
          <span className="chip live inv" title="Oppdateres live"><span className="dot" aria-hidden />{PIN}{session.locationName || session.organizationName}</span>
          <span className="hero-date">{new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <h1 className="h1">{greeting()}, {first}.</h1>
        <div className="hero-status">
          <span className={'hero-dot ' + heroTone} aria-hidden />
          <b>{heroTitle}</b>
          <span className="hero-meta">{heroMeta}</span>
        </div>
      </section>

      <div className="emp-grid">
      <div className="emp-left">
      {db && <SignalCapture session={session} db={db} outcome={outcome} foundCount={pending} onAnalyzed={onAnalyzed} onResume={() => setCapture('voice')} onDiscard={() => { setPending(0); setInitial(undefined); }} onCamera={() => { setInitial(undefined); setPending(0); setCapture('camera'); }} />}

      {error && <div className="load-error" role="alert">{error} <button className="linkbtn" onClick={() => db ? void load(db) : window.location.reload()}>Prøv igjen</button></div>}
      </div>
      <div className="emp-right">

      <section className="flow sect" id="oppgaver" aria-label="Dagens flyt">
        <div className="flow-h" aria-live="polite" data-testid="state">
          <div><h2>{stateTitle}</h2><p>{stateSub}</p></div>
          <div className="num"><span data-testid="task-count">{left}</span><small>igjen</small></div>
        </div>
        {tasks.length > 0 && <div className={'progress-bar' + (pct === 100 ? ' all' : '')} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${doneTasks.length} av ${tasks.length} gjort`}><i style={{ width: `${pct}%` }} /></div>}

        {!loading && tasks.length === 0 ? (
          <div className="empty" style={{ marginTop: 14 }}><b>Ingen oppgaver i dag.</b>Lederen din har ikke lagt opp rutiner ennå. Du kan fortsatt melde fra om noe.</div>
        ) : (
          <div className="timeline" data-testid="tasks">
            {visible.map((t, idx) => {
              const done = t.status === 'done';
              const current = !done && openTasks[0]?.id === t.id;
              return (
                <div key={t.id} className={'tl-item' + (done ? ' done' : current ? ' current' : '')} data-testid="task" data-index={idx}>
                  <button className="check" type="button" disabled={pendingTask !== null} aria-busy={pendingTask === t.id} onClick={() => toggle(t)} aria-pressed={done} aria-label={`Merk «${t.title}» som ${done ? 'ikke gjort' : 'gjort'}`}>{pendingTask === t.id ? '…' : done ? '✓' : ''}</button>
                  <div className="tl-card">
                    <span className={'tl-ico ico-' + taskIcon(t.automationKey)} aria-hidden><Icon name={taskIcon(t.automationKey)} /></span>
                    <div><strong>{t.title}</strong><span className="sub">{[t.description, t.estimatedMinutes ? `ca. ${t.estimatedMinutes} min` : null].filter(Boolean).join(' · ')}</span></div>
                    <span className="tl-when">{done ? 'Gjort' : current ? 'Nå' : 'Neste'}</span>
                  </div>
                </div>
              );
            })}
            {tasks.length > visible.length && <button className="linkbtn" type="button" onClick={() => setShowAll(true)}>Vis alle ({tasks.length})</button>}
          </div>
        )}
      </section>

      </div>
      </div>

      <section className="mine sect" id="rapporter" aria-label="Mine rapporter">
        <div className="sect-h"><h2>Mine rapporter</h2><span className="small">{mine.length ? 'oppdateres live' : ''}</span></div>
        {mine.length === 0 ? (
          <div className="empty"><b>Ingen rapporter ennå.</b>Det du melder fra om havner her, med status hele veien til det er løst.</div>
        ) : (
          <div className="reps" data-testid="mine">
            {mine.map((i) => {
              const st = stepOf(i.status);
              return (
                <article className={`rep rep-s${st}` + (i.severity === 'critical' && st < 3 ? ' critical' : '')} key={i.id}>
                  <div className="rep-h">
                    <span className={'rep-ico ico-' + i.category} aria-hidden><Icon name={categoryIcon(i.category)} /></span>
                    <div><b>{i.title}</b><div className="small">{i.equipment}{i.measurement?.raw ? ` · ${i.measurement.raw}` : ''} · {CATEGORY_LABEL[i.category]}</div></div>
                    <span className={'pill ' + (st === 3 ? 'ok' : i.status === 'needs_attention' ? 'warn' : 'info')}>{incidentStatus(i.status)}</span>
                  </div>
                  <ol className="stepper" aria-label="Status">
                    {([1, 2, 3] as const).map((n) => <li key={n} className={'step' + (st >= n ? ' on' : '') + (n === 3 ? ' final' : '')} aria-current={st === n ? 'step' : undefined}><i />{STATUS_LABEL[n]}</li>)}
                  </ol>
                </article>
              );
            })}
          </div>
        )}
      </section>


      {capture && db && <Capture session={session} db={db} mode={capture} initial={capture === 'voice' ? initial : undefined} onClose={() => { setCapture(null); void load(db); }} onRegistered={(created) => { setPending(0); setInitial(undefined); showOutcome(created); void load(db); }} />}
    </div>
  );
}
