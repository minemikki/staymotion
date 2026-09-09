'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataProvider } from '../data/provider';
import type { Incident, IncidentEvent, IncidentNote, Profile, Role } from '../domain/types';
import { CATEGORY_LABEL } from '../ai/rules-adapter';
import { roleLabel } from '../domain/followup';
import { actorOf, allowedViews, type Session } from '../session/session';
import { deadlineText, incidentStatus, isFinished } from '../domain/incident-presentation';
import { Icon, categoryIcon } from './icons';
import { useToast } from './Toast';

const X = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>;
const CHAT = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>;
const severityLabel: Record<Incident['severity'], string> = { critical: 'Kritisk', high: 'Høy', medium: 'Middels', low: 'Lav' };

const dateTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} ${time}`;
};

/** One entry on the case timeline. A note carries its own text; everything else is an action on the spine. */
type Entry =
  | { kind: 'note'; id: string; at: string; author: string; text: string }
  | { kind: 'event'; id: string; at: string; label: string; who?: string; system?: boolean };

/**
 * Builds the human-readable case history from the raw event log and the note list.
 * Both are chronological; each `note_added` event is paired with the next unconsumed note
 * so a comment shows its real text and author, never a duplicate.
 */
function buildTimeline(events: IncidentEvent[], notes: IncidentNote[], name: (id?: string) => string): Entry[] {
  const sortedNotes = [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let notePtr = 0;
  const out: Entry[] = [];
  for (const e of [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const who = e.actorId ? name(e.actorId) : undefined;
    switch (e.eventType) {
      case 'created':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Meldt inn', who });
        break;
      case 'confirmation_accepted':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Bekreftet av melder', who });
        break;
      case 'ai_suggestion_edited':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Detaljer justert før innsending', who });
        break;
      case 'acknowledged':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Tatt av leder', who });
        break;
      case 'assigned': {
        const to = e.payload?.to as string | undefined;
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: to ? `Sendt videre til ${roleLabel(to as Role)}` : 'Sendt videre', who });
        break;
      }
      case 'needs_attention':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Løftet automatisk – frist passert', system: true });
        break;
      case 'follow_up_sent':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Oppfølging varslet', system: true });
        break;
      case 'resolved':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Løst', who });
        break;
      case 'reopened':
        out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'Åpnet igjen', who });
        break;
      case 'note_added': {
        const note = sortedNotes[notePtr++];
        if (note) out.push({ kind: 'note', id: e.id, at: note.createdAt, author: name(note.authorId), text: note.text });
        else out.push({ kind: 'event', id: e.id, at: e.createdAt, label: 'La til et notat', who });
        break;
      }
      default:
        break;
    }
  }
  // Any notes without a matching event (defensive) still show.
  for (; notePtr < sortedNotes.length; notePtr++) {
    const n = sortedNotes[notePtr];
    out.push({ kind: 'note', id: n.id, at: n.createdAt, author: name(n.authorId), text: n.text });
  }
  return out;
}

/**
 * Saksbilde — the shared view of a single case. Opened from any incident card (manager) or from
 * «Mine rapporter» (the reporter). Everyone at the location sees the full timeline; managers also
 * get the actions (ta / send videre / løs) and can add notes. Reads and writes go through the same
 * RLS-backed provider used everywhere else — this component adds no new data access.
 */
export function CaseSheet({ session, db, incident: initial, people, onClose, onChanged }: {
  session: Session;
  db: DataProvider;
  incident: Incident;
  people: Profile[];
  onClose(): void;
  onChanged?(): void;
}) {
  const toast = useToast();
  const actor = useMemo(() => actorOf(session), [session]);
  const [incident, setIncident] = useState<Incident>(initial);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const manages = allowedViews(session.role).includes('manager');
  const name = useCallback((id?: string) => people.find((p) => p.id === id)?.fullName || (id ? 'Ukjent' : 'StayMotion'), [people]);

  const refresh = useCallback(async () => {
    try {
      const [list, ev] = await Promise.all([
        db.listIncidents(actor, { organizationId: session.organizationId, locationId: incident.locationId }),
        db.listIncidentEvents(actor, incident.id),
      ]);
      const fresh = list.find((i) => i.id === incident.id);
      if (fresh) setIncident(fresh);
      setEvents(ev);
    } catch { /* keep the last good view; the parent surfaces load errors */ }
  }, [db, actor, session.organizationId, incident.locationId, incident.id]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(id); }, []);

  // Live: if anyone acts on this case elsewhere, the thread updates in place.
  useEffect(() => {
    if (!db.subscribeIncidentChanges) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = db.subscribeIncidentChanges(actor, { organizationId: session.organizationId, locationId: incident.locationId }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void refresh(); }, 100);
    });
    return () => { if (timer) clearTimeout(timer); stop(); };
  }, [db, actor, session.organizationId, incident.locationId, refresh]);

  // A11y: focus the dialog, trap Tab inside it, restore focus on close, close on Escape.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || []).filter((el) => el.offsetParent !== null || el === document.activeElement);
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [onClose]);

  async function act(kind: 'ack' | 'assign' | 'resolve') {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === 'ack') await db.acknowledgeIncident(actor, incident.id);
      if (kind === 'assign') await db.assignIncident(actor, incident.id, incident.ownerRole === 'shift_lead' ? 'location_manager' : 'shift_lead');
      if (kind === 'resolve') await db.resolveIncident(actor, incident.id, noteText.trim() || undefined);
      if (kind === 'resolve') setNoteText('');
      toast(kind === 'resolve' ? 'Løst. Den som meldte får beskjed.' : kind === 'ack' ? 'Du har den. Teamet ser at den er sett.' : `Sendt videre til ${incident.ownerRole === 'shift_lead' ? 'daglig leder' : 'skiftleder'}.`);
      await refresh();
      onChanged?.();
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(null); }
  }

  async function addNote() {
    const text = noteText.trim();
    if (!text || busy) return;
    setBusy('note');
    try {
      await db.addIncidentNote(actor, incident.id, text);
      setNoteText('');
      await refresh();
      onChanged?.();
      // keep the newest entry in view
      requestAnimationFrame(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; });
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(null); }
  }

  const timeline = buildTimeline(events, incident.notes || [], name);
  const finished = isFinished(incident);
  const st = incident.status;
  const statusTone = finished ? 'ok' : st === 'needs_attention' ? 'warn' : st === 'acknowledged' ? 'info' : incident.severity === 'critical' ? 'bad' : 'info';
  const owner = incident.acknowledgedBy ? name(incident.acknowledgedBy) : `${roleLabel(incident.ownerRole)} · ikke tatt ennå`;

  return (
    <div className="sheetback" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="caseTitle" data-testid="case-sheet" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet case-sheet">
        <div className={'sheet-h' + (incident.severity === 'critical' && !finished ? ' dark-h' : '')}>
          <div>
            <span className="step">{CATEGORY_LABEL[incident.category]}{incident.equipment ? ` · ${incident.equipment}` : ''}</span>
            <h2 id="caseTitle">{incident.title}</h2>
          </div>
          <button className="iconbtn" type="button" onClick={onClose} aria-label="Lukk saksbilde">{X}</button>
        </div>

        <div className="sheet-b" ref={bodyRef} data-testid="case-body">
          <div className="case-meta">
            <span className={'pill ' + statusTone}>{incidentStatus(st)}</span>
            <span className={'pill ' + (incident.severity === 'critical' ? 'bad' : incident.severity === 'high' ? 'warn' : '')}>{severityLabel[incident.severity]}</span>
            {incident.measurement?.raw && <span className="pill">{incident.measurement.raw}</span>}
            {!finished && <span className={'pill ' + (incident.dueAt && Date.parse(incident.dueAt) <= now ? 'warn' : '')}>{deadlineText(incident, now)}</span>}
            {incident.attachments?.length > 0 && <span className="pill">Bilde vedlagt</span>}
          </div>

          <div className="case-owner">
            <span className="ic" aria-hidden><Icon name={categoryIcon(incident.category)} /></span>
            <div>
              <b>Eier: {owner}</b>
              <span className="small">Meldt av {name(incident.reportedBy)} · {roleLabel(incident.ownerRole)} følger opp</span>
            </div>
          </div>

          {incident.transcript && <div className="said case-said">«{incident.transcript}»</div>}
          {!finished && incident.suggestedAction && (
            <div className="next-step case-next"><b>Anbefalt:</b><span>{incident.suggestedAction}</span></div>
          )}

          <div className="case-tl-h">Hendelseslogg</div>
          <ol className="case-tl" data-testid="case-timeline">
            {timeline.map((e) => e.kind === 'note' ? (
              <li className="ctl note" key={e.id}>
                <span className="ctl-dot note" aria-hidden>{CHAT}</span>
                <div className="ctl-body">
                  <div className="ctl-note">{e.text}</div>
                  <span className="ctl-when">{e.author} · {dateTime(e.at)}</span>
                </div>
              </li>
            ) : (
              <li className={'ctl' + (e.system ? ' system' : '')} key={e.id}>
                <span className="ctl-dot" aria-hidden />
                <div className="ctl-body">
                  <b>{e.label}</b>
                  <span className="ctl-when">{e.who ? `${e.who} · ` : e.system ? 'StayMotion · ' : ''}{dateTime(e.at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {manages ? (
          <div className="sheet-f case-f">
            <label className="case-note-field">
              <span className="vh">Nytt notat</span>
              <input
                className="input"
                type="text"
                placeholder="Skriv et notat til saken …"
                value={noteText}
                maxLength={500}
                disabled={busy !== null}
                data-testid="case-note"
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addNote(); } }}
              />
              <button className="btn sm soft" type="button" disabled={busy !== null || !noteText.trim()} onClick={() => void addNote()} data-testid="case-note-send">Legg til</button>
            </label>
            {!finished && (
              <div className="acts action-group case-acts">
                {(st === 'open' || st === 'needs_attention') && <button className="btn sm primary" type="button" disabled={busy !== null} onClick={() => void act('ack')} data-testid="case-ack">Jeg tar den</button>}
                <button className="btn sm soft" type="button" disabled={busy !== null} onClick={() => void act('assign')} data-testid="case-assign">Send videre</button>
                <button className={'btn sm ' + (st === 'open' || st === 'needs_attention' ? 'mintline' : 'mint')} type="button" disabled={busy !== null} onClick={() => void act('resolve')} data-testid="case-resolve">Merk som løst</button>
              </div>
            )}
          </div>
        ) : (
          <div className="sheet-f case-f case-f-read">
            <p className="small">{finished ? 'Saken er løst. Du ser hele forløpet her.' : 'Lederen din følger opp saken. Du får beskjed når statusen endrer seg.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
