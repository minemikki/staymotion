'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/src/ui/Shell';
import { Capture } from '@/src/ui/Capture';
import { useToast } from '@/src/ui/Toast';
import { getProvider } from '@/src/data';
import type { DataProvider } from '@/src/data/provider';
import type { Incident, Task } from '@/src/domain/types';
import { CATEGORY_LABEL } from '@/src/ai/rules-adapter';
import { actorOf, type Session } from '@/src/session/session';

const MIC = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
const CAM = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;

function greeting() { const h = new Date().getHours(); return h < 10 ? 'God morgen' : h < 17 ? 'Hei' : 'God kveld'; }

export default function EmployeePage() {
  return <Shell view="employee">{(s) => <Employee session={s} />}</Shell>;
}

function Employee({ session }: { session: Session }) {
  const toast = useToast();
  const [db, setDb] = useState<DataProvider | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Incident[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [capture, setCapture] = useState<null | 'voice' | 'camera'>(null);
  const actor = useMemo(() => actorOf(session), [session]); // stable per session, so load/effects don't loop

  const load = useCallback(async (p: DataProvider) => {
    if (!session.locationId) return;
    const [t, i] = await Promise.all([p.listTasks(actor, session.locationId), p.listIncidents(actor, { organizationId: session.organizationId, locationId: session.locationId })]);
    setTasks(t); setMine(i.filter((x) => x.reportedBy === session.userId).slice(0, 5));
  }, [actor, session]);
  useEffect(() => { getProvider().then(async (p) => { setDb(p); await load(p); }); }, [load]);

  async function toggle(t: Task) {
    if (!db) return;
    const updated = t.status === 'done' ? await db.reopenTask(actor, t.id) : await db.completeTask(actor, t.id);
    setTasks((arr) => arr.map((x) => (x.id === t.id ? updated : x)));
    if (updated.status === 'done') toast(t.automationKey === 'temp_check' ? 'Logget i temperaturkontroll' : 'Merket som gjort');
  }

  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'skipped');
  const left = openTasks.length;
  const visible = showAll ? tasks : [...openTasks.slice(0, 3), ...tasks.filter((t) => t.status === 'done').slice(0, Math.max(0, 3 - openTasks.length))];
  const first = session.fullName.split(' ')[0];
  const stateTitle = left === 0 ? 'Alt er gjort.' : left === 1 ? 'Nesten klar.' : 'Du er klar.';
  const stateSub = left === 0 ? 'Ha en fin vakt. StayMotion sier fra hvis noe dukker opp.' : left === 1 ? 'Én ting igjen før åpning.' : `Bare ${left === 2 ? 'to' : left} ting før åpning.`;

  return (
    <div className="wrapN rise">
      <div className="eyebrow">{session.locationName || session.organizationName}{session.departmentId ? '' : ''} · i dag</div>
      <h1 className="h1">{greeting()}, {first}.</h1>

      <div className="dark state" aria-live="polite" data-testid="state">
        <div><h2>{stateTitle}</h2><p>{stateSub}</p></div>
        <div className="num"><span data-testid="task-count">{left}</span><small>igjen</small></div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}><b>Ingen oppgaver i dag.</b>Lederen din har ikke lagt opp rutiner ennå. Du kan fortsatt fortelle StayMotion om noe.</div>
      ) : (
        <div className="tasks" data-testid="tasks">
          {visible.map((t) => (
            <div key={t.id} className={'task' + (t.status === 'done' ? ' done' : '')} data-testid="task">
              <button className="check" type="button" onClick={() => toggle(t)} aria-pressed={t.status === 'done'} aria-label={`Merk «${t.title}» som ${t.status === 'done' ? 'ikke gjort' : 'gjort'}`}>{t.status === 'done' ? '✓' : ''}</button>
              <div><strong>{t.title}</strong><span className="sub">{[t.description, t.estimatedMinutes ? `ca. ${t.estimatedMinutes} min` : null].filter(Boolean).join(' · ')}</span></div>
              <span className="when">{t.status === 'done' ? 'Gjort' : 'Nå'}</span>
            </div>
          ))}
          {tasks.length > visible.length && <button className="linkbtn" type="button" onClick={() => setShowAll(true)}>Vis alle ({tasks.length})</button>}
        </div>
      )}

      <div className="capture">
        <button className="voicebtn" type="button" onClick={() => setCapture('voice')} data-testid="open-voice">
          <span className="orbmini" aria-hidden>{MIC}</span>
          <span><strong>Fortell StayMotion</strong><span>Snakk naturlig. Vi gjør resten.</span></span>
          <span className="arrow" aria-hidden>→</span>
        </button>
        <button className="camerabtn" type="button" onClick={() => setCapture('camera')} data-testid="open-camera">
          <span className="ic" aria-hidden>{CAM}</span>
          <span><b>Ta bilde</b><span>Legg ved et bilde og fortell hva du ser</span></span>
        </button>
      </div>

      {mine.length > 0 && (
        <div className="card pad mine" data-testid="mine">
          <div className="sect-h" style={{ marginBottom: 4 }}><h2>Dine rapporter</h2><span className="small">i dag</span></div>
          {mine.map((i) => (
            <div className="row" key={i.id}>
              <div><b>{i.title}</b><div className="small">{i.equipment}{i.measurement?.raw ? ` · ${i.measurement.raw}` : ''} · {CATEGORY_LABEL[i.category]}</div></div>
              <span className={'pill ' + (i.status === 'resolved' ? 'ok' : i.status === 'needs_attention' ? 'warn' : '')}>{i.status === 'resolved' ? 'Løst' : i.status === 'acknowledged' ? 'Sett av leder' : i.status === 'needs_attention' ? 'Følges opp' : 'Sendt'}</span>
            </div>
          ))}
        </div>
      )}

      {capture && db && <Capture session={session} db={db} mode={capture} onClose={() => { setCapture(null); void load(db); }} onRegistered={() => void load(db)} />}
    </div>
  );
}
