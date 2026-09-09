'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/src/ui/Shell';
import { CaseSheet } from '@/src/ui/CaseSheet';
import { useToast } from '@/src/ui/Toast';
import { getProvider } from '@/src/data';
import type { DataProvider } from '@/src/data/provider';
import type { Incident, Profile, Task } from '@/src/domain/types';
import { CATEGORY_LABEL } from '@/src/ai/rules-adapter';
import { actorOf, type Session } from '@/src/session/session';

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '';

export default function HandoverPage() {
  return <Shell view="manager">{(s) => <Handover session={s} />}</Shell>;
}

function Handover({ session }: { session: Session }) {
  const toast = useToast();
  const actor = useMemo(() => actorOf(session), [session]);
  const [db, setDb] = useState<DataProvider | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [openCase, setOpenCase] = useState<Incident | null>(null);
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const load = useCallback(async (p: DataProvider) => {
    const [ii, tt, pp] = await Promise.all([
      p.listIncidents(actor, { organizationId: session.organizationId, locationId: session.locationId }),
      session.locationId ? p.listTasks(actor, session.locationId) : Promise.resolve([] as Task[]),
      p.listProfiles(session.organizationId),
    ]);
    setIncidents(ii);
    setTasks(tt);
    setPeople(pp);
    setUpdatedAt(new Date());
  }, [actor, session.organizationId, session.locationId]);

  useEffect(() => { getProvider().then(async (p) => { setDb(p); await load(p); }); }, [load]);

  useEffect(() => {
    if (!db?.subscribeIncidentChanges) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = db.subscribeIncidentChanges(actor, { organizationId: session.organizationId, locationId: session.locationId }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void load(db); }, 100);
    });
    return () => { if (timer) clearTimeout(timer); stop(); };
  }, [db, actor, session.organizationId, session.locationId, load]);

  const name = (id?: string) => people.find((p) => p.id === id)?.fullName || 'Ukjent';
  const since = Date.now() - 12 * 60 * 60 * 1000;
  const open = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
  const critical = open.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const resolved = incidents.filter((i) => i.resolvedAt && new Date(i.resolvedAt).getTime() >= since).slice(0, 8);
  const unfinished = tasks.filter((t) => t.status !== 'done' && t.status !== 'skipped');
  const done = tasks.filter((t) => t.status === 'done');

  const briefLines = [
    `Vaktbytte – ${session.locationName || session.organizationName}`,
    `Oppdatert ${updatedAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}`,
    '',
    open.length ? `${open.length} åpne saker (${critical.length} høy/kritisk).` : 'Ingen åpne saker.',
    unfinished.length ? `${unfinished.length} rutiner står igjen.` : 'Alle registrerte rutiner er ferdige.',
    ...open.slice(0, 6).map((i) => `• ${i.title}${i.equipment ? ` – ${i.equipment}` : ''} · ${CATEGORY_LABEL[i.category]} · ${i.status === 'acknowledged' ? 'sett av leder' : 'åpen'}`),
    ...resolved.slice(0, 4).map((i) => `✓ Løst: ${i.title} ${i.resolvedAt ? `(${fmt(i.resolvedAt)})` : ''}`),
  ];

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(briefLines.join('\n'));
      toast('Vaktbrief kopiert.');
    } catch {
      toast('Kunne ikke kopiere automatisk.');
    }
  }

  return (
    <div className="wrapW rise">
      <div className="page-head">
      <div className="eyebrow">Vaktbytte · {session.locationName || session.organizationName}</div>
      <h1 className="h1">Neste skift får det de trenger.</h1>
      <p className="lead">StayMotion samler åpne saker, ferdige hendelser og rutiner fra dagens registreringer. Ingen trenger å skrive samme status på nytt.</p>
      </div>

      <div className="dark calm">
        <div>
          <h2>{critical.length ? `${critical.length} viktige ${critical.length === 1 ? 'sak' : 'saker'} må videre.` : open.length ? `${open.length} ${open.length === 1 ? 'sak følger' : 'saker følger'} neste skift.` : 'Rolig overlevering.'}</h2>
          <p>{unfinished.length ? `${unfinished.length} rutiner står igjen. ` : 'Alle registrerte rutiner er ferdige. '}{resolved.length ? `${resolved.length} saker er løst siste 12 timer.` : 'Ingen saker løst siste 12 timer.'}</p>
        </div>
        <button className="btn soft" type="button" onClick={() => void copyBrief()}>Kopier vaktbrief</button>
      </div>

      <div className="sect">
        <div className="sect-h"><h2>Må tas med videre</h2><span className="small">{open.length ? `${open.length} åpne` : 'Ingen åpne'}</span></div>
        {open.length === 0 ? <div className="empty"><b>Ingenting å overlevere.</b>Neste skift starter uten åpne registrerte saker.</div> : (
          <div className="need">
            {open.map((i) => (
              <div className="need-i" key={i.id}>
                <div className={'ic ' + (i.severity === 'critical' ? 'bad' : 'warn')} aria-hidden>{i.severity === 'critical' ? '!' : '↻'}</div>
                <div>
                  <button className="case-open" type="button" onClick={() => setOpenCase(i)} data-testid="open-case"><strong>{i.equipment ? `${i.equipment} · ` : ''}{i.title}</strong></button>
                  <p>{CATEGORY_LABEL[i.category]} · meldt av {name(i.reportedBy)} · {i.status === 'acknowledged' ? `sett av ${name(i.acknowledgedBy)}` : 'venter på leder'}{i.dueAt ? ` · frist ${fmt(i.dueAt)}` : ''}</p>
                  {i.transcript && <div className="said">«{i.transcript}»</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sect auto">
        <div className="card pad">
          <div className="sect-h"><h2>Rutiner</h2><span className="small">{done.length}/{tasks.length} ferdig</span></div>
          {unfinished.length ? unfinished.slice(0, 8).map((t) => <div className="row" key={t.id}><div><b>{t.title}</b><div className="small">{t.description || 'Rutine'}{t.dueAt ? ` · frist ${fmt(t.dueAt)}` : ''}</div></div><span className="pill warn">Står igjen</span></div>) : <div className="empty"><b>Alt registrert er gjort.</b>Ingen åpne rutiner å sende videre.</div>}
        </div>

        <div className="card pad">
          <div className="sect-h"><h2>Løst denne vakten</h2><span className="small">siste 12 t</span></div>
          {resolved.length ? resolved.map((i) => <div className="row" key={i.id}><div><b>{i.title}</b><div className="small">{name(i.resolvedBy)} · {fmt(i.resolvedAt)}</div></div><span className="pill ok">Løst</span></div>) : <div className="empty"><b>Ingen løste saker ennå.</b>Her vises det som ble lukket før neste skift.</div>}
        </div>
      </div>

      <div className="sect dark" style={{ padding: 24 }}>
        <div className="eyebrow">Automatisk overlevering</div>
        <h3 style={{ fontSize: 20, marginTop: 8 }}>Oppdatert {updatedAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</h3>
        <p style={{ color: '#A6BBB0', marginTop: 7, lineHeight: 1.6 }}>Denne briefen er bygget direkte fra oppgaver og hendelser i StayMotion. Den legger ikke til fakta som ikke er registrert.</p>
      </div>

      {openCase && db && (
        <CaseSheet session={session} db={db} incident={openCase} people={people} onClose={() => setOpenCase(null)} onChanged={() => void load(db)} />
      )}
    </div>
  );
}
