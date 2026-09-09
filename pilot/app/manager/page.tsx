'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/src/ui/Shell';
import { useToast } from '@/src/ui/Toast';
import { Signal } from '@/src/ui/Signal';
import { CaseSheet } from '@/src/ui/CaseSheet';
import { Icon, categoryIcon } from '@/src/ui/icons';
import { getProvider } from '@/src/data';
import type { DataProvider } from '@/src/data/provider';
import type { AuditEvent, Incident, Profile, Task } from '@/src/domain/types';
import { CATEGORY_LABEL } from '@/src/ai/rules-adapter';
import { recurrence, roleLabel } from '@/src/domain/followup';
import { actorOf, type Session } from '@/src/session/session';
import { deadlineText, needsManager, prioritizeIncidents } from '@/src/domain/incident-presentation';

export default function ManagerPage() {
  return <Shell view="manager">{(s) => <Manager session={s} />}</Shell>;
}

const fmtT = (iso: string) => new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
/** Natural Norwegian relative time: "akkurat nå", "for 12 min siden", "for 3 t siden". */
const ago = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'akkurat nå' : `for ${m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} t` : `${Math.round(m / 1440)} d`} siden`; };
const severityLabel: Record<Incident['severity'], string> = { critical: 'Kritisk', high: 'Høy', medium: 'Middels', low: 'Lav' };

/** Recommended next step derived from what is actually registered — never invented. */
function nextStep(i: Incident, now: number): string {
  if (i.severity === 'critical' && i.status === 'open') return `Ta den nå: ${i.suggestedAction.toLowerCase()}.`;
  if (i.dueAt && Date.parse(i.dueAt) <= now) return 'Fristen er passert. Avklar hvem som eier saken, eller merk den som løst.';
  if (i.status === 'needs_attention') return 'Saken ble løftet automatisk. Bekreft at noen følger den opp.';
  if (i.status === 'open') return `${i.suggestedAction} — trykk «Jeg tar den» når du har sett saken.`;
  return `${roleLabel(i.ownerRole)} følger opp. Merk som løst når det er ordnet.`;
}

function Manager({ session }: { session: Session }) {
  const toast = useToast();
  const welcome = useSearchParams().get('welcome') === '1';
  const [db, setDb] = useState<DataProvider | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [openCase, setOpenCase] = useState<Incident | null>(null);
  const actor = useMemo(() => actorOf(session), [session]);

  const load = useCallback(async (p: DataProvider) => {
    try {
      await p.runFollowUp(actor); // local: deterministic evaluation; supabase: no-op (cron)
      const [i, t, a, pp] = await Promise.all([
        p.listIncidents(actor, { organizationId: session.organizationId, locationId: session.locationId }),
        session.locationId ? p.listTasks(actor, session.locationId) : Promise.resolve([] as Task[]),
        p.listAudit(actor, session.organizationId, 40), p.listProfiles(session.organizationId),
      ]);
      setIncidents(i); setTasks(t); setAudit(a); setPeople(pp);
      setError('');
    } catch { setError('Siste status kunne ikke hentes. Informasjonen kan være utdatert.'); }
    finally { setLoading(false); }
  }, [actor, session]);

  useEffect(() => { getProvider().then(async (p) => { setDb(p); await load(p); }).catch(() => { setError('Kunne ikke koble til. Last siden på nytt.'); setLoading(false); }); }, [load]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(id); }, []);

  // In real mode, an employee report should appear here without a manual refresh.
  // Realtime is only an invalidation signal; the authoritative rows are re-read
  // through the RLS-backed provider after each event.
  useEffect(() => {
    if (!db?.subscribeIncidentChanges) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = db.subscribeIncidentChanges(
      actor,
      { organizationId: session.organizationId, locationId: session.locationId },
      () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void load(db); }, 80); },
    );
    return () => { if (timer) clearTimeout(timer); stop(); };
  }, [db, actor, session.organizationId, session.locationId, load]);

  const name = (id?: string) => people.find((p) => p.id === id)?.fullName || 'Ukjent';
  const initials = (id?: string) => name(id).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const reduce = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function act(kind: 'ack' | 'resolve' | 'assign', inc: Incident) {
    if (!db || busy) return;
    setBusy(inc.id);
    try {
      if (kind === 'ack') await db.acknowledgeIncident(actor, inc.id);
      if (kind === 'resolve') await db.resolveIncident(actor, inc.id, note[inc.id]);
      if (kind === 'assign') await db.assignIncident(actor, inc.id, inc.ownerRole === 'shift_lead' ? 'location_manager' : 'shift_lead');
      toast(kind === 'resolve' ? 'Løst. Den som meldte får beskjed.' : kind === 'ack' ? 'Du har den. Teamet ser at den er sett.' : `Sendt videre til ${inc.ownerRole === 'shift_lead' ? 'daglig leder' : 'skiftleder'}.`);
      // micro-feedback: let the card slide out before the list re-sorts
      if (kind !== 'assign' && !reduce) { setLeaving(inc.id); await new Promise((r) => setTimeout(r, 260)); }
      await load(db);
    } catch (e) { toast((e as Error).message); } finally { setBusy(null); setLeaving(null); }
  }

  const open = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
  const needs = prioritizeIncidents(open.filter((i) => needsManager(i, now)), now);
  const watching = open.filter((i) => !needs.includes(i));
  const resolvedToday = incidents.filter((i) => i.resolvedAt && Date.now() - new Date(i.resolvedAt).getTime() < 86400_000);
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const completion = tasks.length ? doneTasks / tasks.length : 1;
  const critical = open.filter((i) => i.severity === 'critical').length;
  const score = Math.max(0, Math.min(100, Math.round(100 - open.length * 4 - critical * 8 - open.filter((i) => i.status === 'needs_attention').length * 6 - (1 - completion) * 20)));
  const rec = recurrence(incidents).filter((r) => r.count >= 2);
  const auto = audit.filter((a) => !a.actorId || a.action === 'needs_attention' || a.entityType === 'task').slice(0, 5);
  const first = session.fullName.split(' ')[0];

  const Owner = ({ i }: { i: Incident }) => (
    <span className="owner">{i.acknowledgedBy ? <><span className="av" aria-hidden>{initials(i.acknowledgedBy)}</span>{name(i.acknowledgedBy)}</> : <>{roleLabel(i.ownerRole)} · ikke tatt ennå</>}</span>
  );

  return (
    <div className="wrapW rise mgr">
      <div className="eyebrow">Leder · {session.locationName || session.organizationName}</div>
      <h1 className="h1">{welcome ? `Velkommen, ${first}.` : `Hei, ${first}.`}</h1>
      <p className="lead">{welcome ? 'Bedriften er satt opp. Første vakt har rutinene sine, og alt som meldes inn lander her.' : 'Her er det som trenger deg nå. Resten følger StayMotion med på.'}</p>
      {error && <div className="load-error" role="alert">{error} <button className="linkbtn" onClick={() => db ? void load(db) : window.location.reload()}>Prøv igjen</button></div>}

      <div className="calm" data-testid="calm">
        <div>
          <Signal state={loading ? 'analyzing' : critical > 0 ? 'critical' : needs.length ? 'confirm' : 'sent'} size="sm" />
          <div className="eyebrow">Nå</div>
          <h2>{loading ? 'Henter driftsstatus …' : needs.length === 0 ? (open.length ? 'Ingen nye saker venter.' : 'Ingen åpne saker.') : needs.length === 1 ? 'Én sak trenger deg.' : `${needs.length} saker trenger deg.`}</h2>
          <p>{resolvedToday.length ? `${resolvedToday.length} sak${resolvedToday.length > 1 ? 'er' : ''} løst siste døgn. ` : ''}{tasks.length ? `${doneTasks} av ${tasks.length} rutiner gjort i dag.` : 'Ingen rutiner lagt opp for i dag.'}</p>
        </div>
        <div className="ring" style={{ ['--v' as string]: score }} role="img" aria-label={`Veiledende driftsindikator ${score} av 100`}><b>{loading ? '—' : score}</b><small>indikator</small></div>
      </div>
      <div className="ops-metrics" aria-label="Driftsoversikt">
        <div className="m-now"><span>Trenger deg</span><strong>{loading ? '—' : needs.length}</strong><small>Sortert etter hastegrad</small></div>
        <div className="m-watch"><span>Følges opp</span><strong>{loading ? '—' : watching.length}</strong><small>Sett, noen eier saken</small></div>
        <div className="m-done"><span>Løst siste døgn</span><strong>{loading ? '—' : resolvedToday.length}</strong><small>Ferdigbehandlet</small></div>
      </div>

      <div className={`mgr-grid${!loading && needs.length === 0 && watching.length > 0 ? ' watch-first' : ''}`}>
      <div className="mgr-main">
      <section className="sect" id="na" aria-labelledby="h-needs">
        <div className="sect-h"><h2 id="h-needs">Dette trenger deg</h2><span className="small">{needs.length ? `${needs.length} sak${needs.length > 1 ? 'er' : ''}` : 'Ingenting akkurat nå'}</span></div>
        {loading ? <div className="empty" role="status">Henter saker …</div> : needs.length === 0 ? <div className="empty mgr-empty"><b>Ingenting venter på deg.</b>{watching.length ? 'Alle åpne saker har en eier og følges opp.' : 'Nye saker fra ansatte vises her i sanntid.'}</div> : (
          <div className="need" data-testid="needs">
            {needs.map((i) => {
              const overdue = !!(i.dueAt && Date.parse(i.dueAt) <= now);
              return (
                <article className={'need-i' + (i.severity === 'critical' ? ' critical' : '') + (leaving === i.id ? ' leaving' : '')} key={i.id} data-testid="need-item" aria-busy={busy === i.id}>
                  <div className={'ic ' + (i.severity === 'critical' ? 'bad' : overdue ? 'warn' : 'info')} aria-hidden><Icon name={categoryIcon(i.category)} /></div>
                  <div>
                    <button className="case-open" type="button" onClick={() => setOpenCase(i)} data-testid="open-case"><strong>{i.equipment ? `${i.equipment} · ` : ''}{i.title}</strong></button>
                    <p>Meldt av {name(i.reportedBy)} {ago(i.createdAt)}{session.locationName ? ` · ${session.locationName}` : ''}{i.measurement?.raw ? ` · ${i.measurement.raw}` : ''} · eier: <Owner i={i} /></p>
                    {i.transcript && <div className="said">«{i.transcript}»</div>}
                    <div className="meta">
                      <span className={'pill ' + (i.severity === 'critical' ? 'bad' : i.severity === 'high' ? 'warn' : '')}>{severityLabel[i.severity]}</span>
                      <span className={'type ' + i.category}>{CATEGORY_LABEL[i.category]}</span>
                      <span className={'pill ' + (overdue ? 'warn' : '')}>{deadlineText(i, now)}</span>
                      {i.status === 'needs_attention' && <span className="pill warn">Løftet automatisk</span>}
                      {i.status === 'acknowledged' && <span className="pill info">Sett</span>}
                      {i.requiresConfirmation && <span className="pill ok">Bekreftet av melder</span>}
                      {i.attachments.length > 0 && <span className="pill">Bilde vedlagt</span>}
                    </div>
                    <div className="next-step"><b>Anbefalt:</b><span>{nextStep(i, now)}</span></div>
                    <fieldset className="acts action-group" disabled={busy !== null}>
                      {i.status === 'open' || i.status === 'needs_attention' ? <button className="btn sm primary" type="button" onClick={() => act('ack', i)} data-testid="ack">Jeg tar den</button> : null}
                      <button className="btn sm soft" type="button" onClick={() => act('assign', i)}>Send videre</button>
                      <button className={'btn sm ' + (i.status === 'open' || i.status === 'needs_attention' ? 'mintline' : 'mint')} type="button" onClick={() => act('resolve', i)} data-testid="resolve">Merk som løst</button>
                    </fieldset>
                    <div className="notebox"><input className="input" placeholder="Kort notat (valgfritt) …" value={note[i.id] || ''} onChange={(e) => setNote({ ...note, [i.id]: e.target.value })} aria-label="Notat" maxLength={500} /></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      </div>
      <div className="mgr-side">
      <section className="sect" id="folges-opp" aria-labelledby="h-watch">
        <div className="sect-h"><h2 id="h-watch">Følges opp</h2><span className="small">{watching.length ? `${watching.length} sak${watching.length > 1 ? 'er' : ''}` : 'Ingen'}</span></div>
        {watching.length === 0 ? <div className="empty"><b>Ingen saker under oppfølging.</b>Saker du har tatt eller sendt videre vises her til de er løst.</div> : (
          <div className="need">{watching.map((i) => (
            <article className={'need-i' + (leaving === i.id ? ' leaving' : '')} key={i.id} aria-busy={busy === i.id}>
              <div className="ic ok" aria-hidden><Icon name={categoryIcon(i.category)} /></div>
              <div>
                <button className="case-open" type="button" onClick={() => setOpenCase(i)} data-testid="open-case"><strong>{i.equipment ? `${i.equipment} · ` : ''}{i.title}</strong></button>
                <p>Eier: <Owner i={i} /> · {roleLabel(i.ownerRole)} følger opp{i.dueAt ? ` · frist ${fmtT(i.dueAt)}` : ''}</p>
                <div className="meta"><span className={'type ' + i.category}>{CATEGORY_LABEL[i.category]}</span><span className="pill">{severityLabel[i.severity]}</span><span className="pill">{deadlineText(i, now)}</span></div>
                <fieldset className="acts action-group" disabled={busy !== null}>
                  <button className="btn sm mint" type="button" onClick={() => act('resolve', i)}>Merk som løst</button>
                  <button className="btn sm soft" type="button" onClick={() => act('assign', i)}>Send videre</button>
                </fieldset>
              </div>
            </article>
          ))}</div>
        )}
      </section>

      <section className="sect" id="lost" aria-labelledby="h-done">
        <div className="sect-h"><h2 id="h-done">Løst siste døgn</h2><span className="small">{resolvedToday.length || 'Ingen ennå'}</span></div>
        {resolvedToday.length === 0 ? <div className="empty"><b>Ingenting løst siste døgn.</b>Løste saker havner her, med hvem som løste dem.</div> : (
          <div className="card" style={{ padding: '4px 18px' }}>
            {resolvedToday.slice(0, 6).map((i) => <div className="row" key={i.id} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}><div><b>{i.equipment ? `${i.equipment} · ` : ''}{i.title}</b><div className="small">Løst av {name(i.resolvedBy)} · {fmtT(i.resolvedAt!)}{i.notes?.length ? ` · «${i.notes[i.notes.length - 1].text}»` : ''}</div></div><span className="pill ok">Løst</span></div>)}
          </div>
        )}
      </section>

      </div>
      </div>

      <section className="sect" id="innsikt" aria-labelledby="h-insight">
        <div className="sect-h"><h2 id="h-insight">Innsikt</h2><span className="small">fra dagens registreringer</span></div>
        <div className="auto">
          <div className="card">
            <div className="eyebrow">StayMotion fulgte opp</div>
            <div className="big">{auto.length + resolvedToday.length}</div>
            <ul className="autolist">
              {resolvedToday.slice(0, 2).map((i) => <li key={i.id}>Løst: {i.title} <span>{fmtT(i.resolvedAt!)}</span></li>)}
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
          <div className="insight-card" style={{ marginTop: 12 }} data-testid="pattern">
            <span className="pill info"><span className="dot" aria-hidden />Mønster</span>
            <h3>{rec[0].label} · {rec[0].count} ganger på 30 dager</h3>
            <p>Gjentatte avvik på samme enhet er som regel billigere å løse med service enn med matsvinn.</p>
            <div className="rec"><b>Anbefalt:</b><span>Bestill et servicebesøk på enheten, og bekreft neste temperaturavlesning i appen.</span></div>
          </div>
        )}
      </section>

      {openCase && db && (
        <CaseSheet
          session={session}
          db={db}
          incident={openCase}
          people={people}
          onClose={() => setOpenCase(null)}
          onChanged={() => void load(db)}
        />
      )}
    </div>
  );
}
