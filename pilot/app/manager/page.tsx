'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/src/ui/Shell';
import { useToast } from '@/src/ui/Toast';
import { getProvider } from '@/src/data';
import type { DataProvider } from '@/src/data/provider';
import type { AuditEvent, Incident, Profile, Task } from '@/src/domain/types';
import { CATEGORY_LABEL } from '@/src/ai/rules-adapter';
import { recurrence, roleLabel } from '@/src/domain/followup';
import { actorOf, type Session } from '@/src/session/session';

export default function ManagerPage() {
  return <Shell view="manager">{(s) => <Manager session={s} />}</Shell>;
}

const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
/** Natural Norwegian relative time: "akkurat nå", "for 12 min siden", "for 3 t siden". */
const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'akkurat nå' : `for ${m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} t` : `${Math.round(m / 1440)} d`} siden`; };

function Manager({ session }: { session: Session }) {
  const toast = useToast();
  const welcome = useSearchParams().get('welcome') === '1';
  const [db, setDb] = useState<DataProvider | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});
  const actor = useMemo(() => actorOf(session), [session]); // stable per session, so load/effects don't loop

  const load = useCallback(async (p: DataProvider) => {
    await p.runFollowUp(actor); // local: deterministic evaluation; supabase: no-op (cron)
    const [i, t, a, pp] = await Promise.all([
      p.listIncidents(actor, { organizationId: session.organizationId, locationId: session.locationId }),
      session.locationId ? p.listTasks(actor, session.locationId) : Promise.resolve([] as Task[]),
      p.listAudit(actor, session.organizationId, 40), p.listProfiles(session.organizationId),
    ]);
    setIncidents(i); setTasks(t); setAudit(a); setPeople(pp);
  }, [actor, session]);
  useEffect(() => { getProvider().then(async (p) => { setDb(p); await load(p); }); }, [load]);

  const name = (id?: string) => people.find((p) => p.id === id)?.fullName || 'Ukjent';
  async function act(kind: 'ack' | 'resolve' | 'assign', inc: Incident) {
    if (!db) return;
    try {
      if (kind === 'ack') await db.acknowledgeIncident(actor, inc.id);
      if (kind === 'resolve') await db.resolveIncident(actor, inc.id, note[inc.id]);
      if (kind === 'assign') await db.assignIncident(actor, inc.id, inc.ownerRole === 'shift_lead' ? 'location_manager' : 'shift_lead');
      toast(kind === 'resolve' ? 'Løst. StayMotion gir beskjed til den som meldte.' : kind === 'ack' ? 'Sett. Skiftleder ser at du har det.' : 'Oppfølging flyttet.');
      await load(db);
    } catch (e) { toast((e as Error).message); }
  }

  const open = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
  const needs = open.filter((i) => i.status === 'needs_attention' || i.severity === 'critical' || i.status === 'open');
  const watching = open.filter((i) => !needs.includes(i));
  const resolvedToday = incidents.filter((i) => i.resolvedAt && Date.now() - new Date(i.resolvedAt).getTime() < 86400_000);
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const completion = tasks.length ? doneTasks / tasks.length : 1;
  const critical = open.filter((i) => i.severity === 'critical').length;
  const score = Math.max(0, Math.min(100, Math.round(100 - open.length * 4 - critical * 8 - open.filter((i) => i.status === 'needs_attention').length * 6 - (1 - completion) * 20)));
  const rec = recurrence(incidents).filter((r) => r.count >= 2);
  const auto = audit.filter((a) => !a.actorId || a.action === 'needs_attention' || a.entityType === 'task').slice(0, 5);
  const first = session.fullName.split(' ')[0];

  return (
    <div className="wrapW rise">
      <div className="eyebrow">Leder · {session.locationName || session.organizationName}</div>
      <h1 className="h1">{welcome ? `Velkommen, ${first}.` : `Hei, ${first}.`}</h1>
      <p className="lead">{welcome ? 'Bedriften er satt opp. Første vakt har rutinene sine, og alt som meldes inn lander her.' : 'Det meste går av seg selv. Her er det som faktisk trenger deg.'}</p>

      <div className="dark calm" data-testid="calm">
        <div>
          <h2>{needs.length === 0 ? (open.length ? 'Alt er under kontroll.' : 'Driften er rolig.') : needs.length === 1 ? 'Én sak trenger deg.' : `${needs.length} saker trenger deg.`}</h2>
          <p>{resolvedToday.length ? `${resolvedToday.length} sak${resolvedToday.length > 1 ? 'er' : ''} løst siste døgn. ` : ''}{tasks.length ? `${doneTasks} av ${tasks.length} rutiner gjort i dag.` : 'Ingen rutiner lagt opp for i dag.'}</p>
        </div>
        <div className="ring" style={{ ['--v' as string]: score }} role="img" aria-label={`Driftshelse ${score} av 100`}><b>{score}</b><small>driftshelse</small></div>
      </div>

      <div className="sect">
        <div className="sect-h"><h2>Dette trenger deg</h2><span className="small">{needs.length ? `${needs.length} sak${needs.length > 1 ? 'er' : ''}` : 'Ingenting akkurat nå'}</span></div>
        {needs.length === 0 ? <div className="empty"><b>Ingenting venter på deg.</b>Nye saker fra ansatte dukker opp her med det samme.</div> : (
          <div className="need" data-testid="needs">
            {needs.map((i) => (
              <div className="need-i" key={i.id} data-testid="need-item">
                <div className={'ic ' + (i.severity === 'critical' ? 'bad' : 'warn')} aria-hidden>{i.severity === 'critical' ? '!' : '↻'}</div>
                <div>
                  <strong>{i.equipment ? `${i.equipment} · ` : ''}{i.title}</strong>
                  <p>Meldt av {name(i.reportedBy)} {ago(i.createdAt)}{i.measurement?.raw ? ` · ${i.measurement.raw}` : ''} · foreslått: {i.suggestedAction} ({roleLabel(i.ownerRole)})</p>
                  {i.transcript && <div className="said">«{i.transcript}»</div>}
                  <div className="meta">
                    <span className={'type ' + i.category}>{CATEGORY_LABEL[i.category]}</span>
                    {i.status === 'needs_attention' && <span className="pill warn">Over frist · følges opp</span>}
                    {i.status === 'acknowledged' && <span className="pill">Sett</span>}
                    {i.requiresConfirmation && <span className="pill ok">Bekreftet av melder</span>}
                    {i.attachments.length > 0 && <span className="pill">Bilde vedlagt</span>}
                  </div>
                  <div className="acts">
                    {i.status === 'open' || i.status === 'needs_attention' ? <button className="btn sm ghost" type="button" onClick={() => act('ack', i)} data-testid="ack">Jeg tar den</button> : null}
                    <button className="btn sm primary" type="button" onClick={() => act('resolve', i)} data-testid="resolve">Merk som løst</button>
                    <button className="btn sm soft" type="button" onClick={() => act('assign', i)}>Flytt til {i.ownerRole === 'shift_lead' ? 'daglig leder' : 'skiftleder'}</button>
                  </div>
                  <div className="notebox"><input className="input" placeholder="Kort notat (valgfritt) …" value={note[i.id] || ''} onChange={(e) => setNote({ ...note, [i.id]: e.target.value })} aria-label="Notat" maxLength={500} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {watching.length > 0 && (
        <div className="sect">
          <div className="sect-h"><h2>Følges opp</h2><span className="small">{watching.length}</span></div>
          <div className="need">{watching.map((i) => (
            <div className="need-i" key={i.id}><div className="ic ok" aria-hidden>✓</div><div><strong>{i.equipment ? `${i.equipment} · ` : ''}{i.title}</strong><p>Sett av {name(i.acknowledgedBy)} · {roleLabel(i.ownerRole)} følger opp{i.dueAt ? ` · frist ${fmtT(i.dueAt)}` : ''}</p><div className="acts"><button className="btn sm primary" type="button" onClick={() => act('resolve', i)}>Merk som løst</button></div></div></div>
          ))}</div>
        </div>
      )}

      <div className="sect auto">
        <div className="card">
          <div className="eyebrow">Fulgte opp automatisk</div>
          <div className="big">{auto.length + resolvedToday.length}</div>
          <ul className="autolist">
            {resolvedToday.slice(0, 2).map((i) => <li key={i.id}>Varslet melder om at «{i.title}» er løst <span>{fmtT(i.resolvedAt!)}</span></li>)}
            {auto.map((a) => <li key={a.id}>{a.action === 'needs_attention' ? 'Løftet en sak som gikk over frist' : a.entityType === 'task' ? `Bekreftet rutine: ${tasks.find((t) => t.id === a.entityId)?.title || 'oppgave'}` : a.action} <span>{fmtT(a.createdAt)}</span></li>)}
            {!auto.length && !resolvedToday.length && <li>Ingenting ennå i dag <span /></li>}
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow">Vaktbrief</div>
          <p style={{ marginTop: 12, lineHeight: 1.65 }}>
            {tasks.length ? `${doneTasks} av ${tasks.length} rutiner er gjort. ` : ''}
            {open.length ? `${open.length} åpen${open.length > 1 ? 'e saker' : ' sak'}${critical ? `, ${critical} kritisk` : ''}. ` : 'Ingen åpne saker. '}
            {rec.length ? `Mønster: ${rec[0].label} har skjedd ${rec[0].count} ganger siste 30 dager.` : 'Ingen gjentakende mønstre siste 30 dager.'}
          </p>
          <p className="small" style={{ marginTop: 12 }}>Skrevet av StayMotion fra dagens registreringer.</p>
        </div>
      </div>

      {rec.length > 0 && (
        <div className="sect dark" style={{ padding: 24 }} data-testid="pattern">
          <div className="pill dim"><span className="dot" />Mønster</div>
          <h3 style={{ fontSize: 20, marginTop: 10 }}>{rec[0].label} · {rec[0].count} ganger på 30 dager</h3>
          <p style={{ color: '#A6BBB0', marginTop: 6, fontSize: 14 }}>Gjentatte avvik på samme enhet er som regel billigere å løse med service enn med matsvinn. StayMotion foreslår et servicebesøk.</p>
        </div>
      )}
    </div>
  );
}
