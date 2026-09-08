'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalyzeResult, ProposedIssue } from '../ai/contract';
import type { AttachmentMeta, CaptureSource, Incident } from '../domain/types';
import { CATEGORY_LABEL } from '../ai/rules-adapter';
import { prepareImage } from '../lib/image';
import { speechSupported, startSpeech, type SpeechHandle } from '../lib/speech';
import type { DataProvider, RegisterIncidentInput } from '../data/provider';
import type { Session } from '../session/session';
import { actorOf } from '../session/session';
import { useToast } from './Toast';
import { Signal, type SignalState } from './Signal';
import { analyzeText } from '../lib/analyze-client';

/**
 * StayMotion Capture — the proven voice/photo → proposed issues flow, ported to React.
 * Analysis happens on the protected server route (/api/analyze). Registration goes
 * through the DataProvider. In real mode an attached photo is uploaded to the
 * tenant-scoped private bucket before the incident row is created.
 */
type Stage = 'record' | 'review' | 'done';
type Local = ProposedIssue & { confirmed: boolean; checked: boolean; editing: boolean; edited: Set<string>; at?: string };
type PhotoState = { meta: AttachmentMeta; blob: Blob; previewUrl: string };

const X = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>;

export type CaptureInitial = { analysis: AnalyzeResult; transcript: string; source: CaptureSource };

export function Capture({ session, db, mode, initial, onClose, onRegistered }: { session: Session; db: DataProvider; mode: 'voice' | 'camera'; /** Open straight in the confirmation stage with a result produced elsewhere (the Signal on Employee Today). */ initial?: CaptureInitial; onClose(): void; onRegistered(incidents: Incident[]): void }) {
  const toast = useToast();
  const [stage, setStage] = useState<Stage>(initial ? 'review' : 'record');
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState(''); const [interim, setInterim] = useState('');
  const [status, setStatus] = useState(mode === 'camera' ? 'Legg ved et bilde først' : 'Trykk for å starte');
  const [hint, setHint] = useState(mode === 'camera' ? 'Etterpå kan du fortelle hva du ser.' : 'Snakk naturlig. Du trenger ikke fylle ut et skjema.');
  const [typing, setTyping] = useState(initial?.source === 'typed'); const [typed, setTyped] = useState('');
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(initial?.analysis ?? null);
  const [issues, setIssues] = useState<Local[]>(() => initial ? initial.analysis.issues.map((p) => ({ ...p, confirmed: false, checked: false, editing: false, edited: new Set<string>() })) : []);
  const [transcript, setTranscript] = useState(initial?.transcript ?? ''); const [editingTranscript, setEditingTranscript] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState<Incident[]>([]);
  const speech = useRef<SpeechHandle | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const uploadedPhoto = useRef<AttachmentMeta | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closed = useRef(false);
  const reduce = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    closed.current = false;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || [])
        .filter(el => el.getClientRects().length > 0);
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      closed.current = true;
      speech.current?.stop(); speech.current = null;
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, []);
  useEffect(() => { if (mode !== 'camera') return; const id = setTimeout(() => fileRef.current?.click(), 60); return () => clearTimeout(id); }, [mode]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); });
  const scrollTop = () => { if (bodyRef.current) bodyRef.current.scrollTop = 0; };

  function releasePhoto() {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    uploadedPhoto.current = null;
    setPhoto(null);
  }
  function close() { if (busy) return; closed.current = true; speech.current?.stop(); speech.current = null; if (photo) URL.revokeObjectURL(photo.previewUrl); onClose(); }

  // ---- speech ----
  function startListening() {
    if (listening) return;
    setFinalText(''); setInterim('');
    if (!speechSupported()) { setStatus('Talegjenkjenning støttes ikke her'); setHint('Skriv hva som har skjedd i stedet.'); setTyping(true); return; }
    let latestFinal = ''; let latestInterim = '';
    speech.current = startSpeech({
      onStart: () => { setListening(true); setStatus('Lytter …'); setHint('Trykk igjen når du er ferdig.'); },
      onResult: (f, i) => { latestFinal = f; latestInterim = i; setFinalText(f); setInterim(i); },
      onEnd: () => { if (closed.current) return; setListening(false); const text = (latestFinal || latestInterim).trim(); if (text) void analyze(text); else { setStatus('Jeg hørte ikke nok'); setHint('Prøv igjen og snakk litt nærmere telefonen, eller skriv i stedet.'); } },
      onError: (code) => { setListening(false); if (code === 'not-allowed' || code === 'service-not-allowed') { setStatus('Mikrofonen er ikke tillatt'); setHint('Gi tilgang i nettleseren, eller skriv i stedet.'); setTyping(true); } else { setStatus('Prøv igjen'); setHint('Talegjenkjenningen stoppet. Trykk for å starte på nytt.'); } },
    });
    if (!speech.current) { setStatus('Kunne ikke starte mikrofonen'); setHint('Skriv hva som har skjedd i stedet.'); setTyping(true); }
  }
  function stopListening() { const h = speech.current; speech.current = null; h?.stop(); }

  // ---- analyze (server) ----
  const analyze = useCallback(async (text: string) => {
    setBusy(true);
    try {
      const result = await analyzeText(session, db, text, !!photo);
      setAnalysis(result); setTranscript(result.transcript);
      setIssues(result.issues.map((p) => ({ ...p, confirmed: false, checked: false, editing: false, edited: new Set() })));
      setStage('review'); setEditingTranscript(false); scrollTop();
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  }, [photo, session, db, toast]);

  // ---- photo ----
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try {
      const { meta, blob, previewUrl } = await prepareImage(f);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      uploadedPhoto.current = null;
      setPhoto({ meta, blob, previewUrl });
      setStatus('Bildet er lagt ved'); setHint('Trykk og fortell hva som er galt — f.eks. «Den lekker her, og displayet viser 1 grad».');
      scrollTop();
    } catch (x) { toast((x as Error).message); }
  }
  function removePhoto() { releasePhoto(); if (stage === 'record') { setStatus('Trykk for å starte'); setHint('Snakk naturlig. Du trenger ikke fylle ut et skjema.'); } }

  // ---- proposals ----
  const upd = (key: string, fn: (x: Local) => Local) => setIssues((arr) => arr.map((x) => (x.clientKey === key ? fn(x) : x)));
  function saveEdit(key: string, values: Partial<Pick<ProposedIssue, 'title' | 'equipment' | 'suggestedAction'>> & { measure?: string }) {
    upd(key, (x) => {
      const edited = new Set(x.edited);
      const next: Local = { ...x, editing: false };
      if (values.title !== undefined && values.title !== x.title) { next.title = values.title; edited.add('title'); }
      if (values.equipment !== undefined && values.equipment !== x.equipment) { next.equipment = values.equipment; edited.add('equipment'); }
      if (values.suggestedAction !== undefined && values.suggestedAction !== x.suggestedAction) { next.suggestedAction = values.suggestedAction; edited.add('suggestedAction'); }
      if (values.measure !== undefined && values.measure !== (x.measurement?.raw || '')) { next.measurement = values.measure ? { raw: values.measure, value: parseFloat(values.measure.replace(',', '.')) || undefined, unit: /°/.test(values.measure) ? '°C' : x.measurement?.unit } : undefined; edited.add('measurement'); }
      next.edited = edited; return next;
    });
    toast('Endringen er lagret');
  }
  function remove(key: string) { setIssues((arr) => arr.filter((x) => x.clientKey !== key)); toast('Forslaget er fjernet'); }

  const source: CaptureSource = photo ? (typing ? 'photo+typed' : 'photo+voice') : (initial?.source ?? (typing ? 'typed' : 'voice'));
  async function register(keys: string[]) {
    const targets = issues.filter((x) => keys.includes(x.clientKey) && !x.confirmed);
    if (!targets.length) return;
    setBusy(true);
    try {
      const actor = actorOf(session);
      let attachments: AttachmentMeta[] = [];
      if (photo) {
        if (!uploadedPhoto.current) {
          uploadedPhoto.current = db.uploadAttachment
            ? await db.uploadAttachment(actor, { meta: photo.meta, blob: photo.blob })
            : photo.meta;
        }
        attachments = [uploadedPhoto.current];
      }
      const inputs: RegisterIncidentInput[] = targets.map((x) => ({
        proposal: { clientKey: x.clientKey, category: x.category, title: x.title, equipment: x.equipment, department: x.department, measurement: x.measurement, severity: x.severity, requiresConfirmation: x.requiresConfirmation, suggestedOwnerRole: x.suggestedOwnerRole, suggestedAction: x.suggestedAction, confidence: x.confidence, evidence: x.evidence },
        transcript, source, attachments, confirmedByReporter: x.checked, editedFields: [...x.edited], departmentId: session.departmentId,
      }));
      const created = await db.registerIncidents(actor, inputs);
      const hh = new Date(); const at = `${String(hh.getHours()).padStart(2, '0')}:${String(hh.getMinutes()).padStart(2, '0')}`;
      setIssues((arr) => arr.map((x) => (keys.includes(x.clientKey) ? { ...x, confirmed: true, at } : x)));
      setRegistered((r) => [...r, ...created]);
      const left = issues.filter((x) => !keys.includes(x.clientKey) && !x.confirmed).length;
      if (left) toast(`Registrert. ${left} igjen å sjekke.`);
      else { setStage('done'); scrollTop(); if (navigator.vibrate && !reduce) { try { navigator.vibrate(12); } catch { /* noop */ } } onRegistered([...registered, ...created]); }
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  }

  function retake() { setStage('record'); setIssues([]); setAnalysis(null); setFinalText(''); setInterim(''); setStatus('Trykk for å starte'); setHint('Snakk naturlig. Du trenger ikke fylle ut et skjema.'); scrollTop(); }
  function reanalyze() { const t = (transcriptRef.current?.textContent || '').trim(); setEditingTranscript(false); if (t) void analyze(t); }

  const sigState: SignalState = busy ? 'analyzing' : listening ? 'listening' : 'idle';
  const open = issues.filter((x) => !x.confirmed);
  const needChk = open.some((x) => x.requiresConfirmation && !x.checked);
  const n = issues.length;
  const stepLabel = stage === 'done' ? 'Ferdig' : photo ? 'Bilde + tale' : mode === 'camera' ? 'Rapporter med bilde' : initial ? 'Meld fra' : 'Fortell StayMotion';
  const title = stage === 'done' ? 'Takk, det er registrert' : stage === 'review' ? 'Sjekk før du registrerer' : photo ? 'Fortell hva du ser' : mode === 'camera' ? 'Ta eller velg et bilde' : 'Hva har skjedd?';

  return (
    <div className="sheetback" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sheetTitle" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={'sheet' + (stage === 'done' ? ' done' : '')}>
        <div className="sheet-h">
          <div><span className="step">{stepLabel}</span><h2 id="sheetTitle">{title}</h2></div>
          <button className="iconbtn" type="button" disabled={busy} onClick={close} aria-label="Lukk">{X}</button>
        </div>
        <div className="sheet-b" ref={bodyRef} data-testid="sheet-body">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} data-testid="camera-input" />
          {photo && (
            <div className="photo" data-testid="photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimizable remote image */}
              <img src={photo.previewUrl} alt="Vedlagt bilde" />
              <span className="pill tag">Bilde lagt ved</span>
              {stage !== 'done' && <button className="iconbtn rm" type="button" onClick={removePhoto} aria-label="Fjern bilde">{X}</button>}
            </div>
          )}
          {photo && stage !== 'done' && <div className="photonote"><span aria-hidden>◐</span><span><b>{session.mode === 'local' ? 'Demo:' : 'Merk:'}</b> bildeanalyse er ikke koblet på ennå. Bildet {session.mode === 'supabase' ? 'lagres privat med saken' : 'legges ved saken'} — fortell hva du ser, så tolker StayMotion ordene dine.</span></div>}

          {stage === 'record' && (
            <div className="rec">
              <button className="sigbtn sigbtn-sheet" type="button" onClick={() => (listening ? stopListening() : startListening())} aria-pressed={listening} aria-label={listening ? 'Stopp opptak' : 'Start opptak'} data-testid="orb" disabled={busy}><Signal state={sigState} size="sm" /></button>
              <strong>{busy ? 'Tolker …' : status}</strong>
              <p>{hint}</p>
              <div className={'live' + (!finalText && !interim ? ' empty' : '')} aria-live="polite" data-testid="live">
                {finalText || interim ? <>{finalText}{interim ? <span className="interim"> {interim}</span> : null}</> : listening ? 'Lytter …' : 'Det du sier vises her …'}
              </div>
              {typing && (
                <div className="typeinstead">
                  <textarea className="input" rows={3} placeholder="Skriv hva som har skjedd …" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (typed.trim()) void analyze(typed.trim()); } }} data-testid="type-input" />
                  <div className="row"><span className="small">Brukes når mikrofon ikke er tilgjengelig.</span><button className="btn sm primary" type="button" disabled={!typed.trim() || busy} onClick={() => void analyze(typed.trim())} data-testid="type-go">Tolk</button></div>
                </div>
              )}
              <button className="linkbtn" type="button" onClick={() => setTyping((t) => !t)} data-testid="toggle-type">{typing ? 'Skjul tekstfelt' : 'Skriv i stedet'}</button>
            </div>
          )}

          {stage === 'review' && analysis && (
            <div>
              {transcript && (<>
                <div className="understood"><Signal state="confirm" size="xs" />StayMotion forstod</div>
                <div className="transcript" ref={transcriptRef} contentEditable={editingTranscript} suppressContentEditableWarning role="textbox" aria-label="Det du sa" data-testid="transcript" onKeyDown={(e) => { if (e.key === 'Enter' && editingTranscript) { e.preventDefault(); reanalyze(); } }}>{transcript}</div>
                <div className="tools">
                  <button className="linkbtn" type="button" onClick={() => (editingTranscript ? reanalyze() : (setEditingTranscript(true), setTimeout(() => transcriptRef.current?.focus(), 30)))}>{editingTranscript ? 'Tolk på nytt' : 'Rediger teksten'}</button>
                  <button className="linkbtn" type="button" onClick={retake}>Snakk igjen</button>
                </div>
              </>)}
              <div className="found">
                <strong data-testid="found">{n === 0 ? 'Ingen saker igjen' : n === 1 ? 'Jeg fant én ting' : `Jeg fant ${n === 2 ? 'to' : n} ting`}</strong>
                <span className="demo" title={analysis.source === 'local-rules' ? 'Lokal regelbasert tolkning' : analysis.model}>{analysis.source === 'local-rules' ? 'demo · regler' : 'StayMotion AI'}</span>
              </div>
              {analysis.warnings?.map((w, i) => <div key={i} className="warn-note">{w}</div>)}
              {n === 0 && <div className="empty">Ingen forslag. <button className="linkbtn" type="button" onClick={retake}>Snakk igjen</button></div>}
              <div className="issues">
                {issues.map((x, i) => <IssueCard key={x.clientKey} x={x} i={i} many={n > 1} onEdit={() => upd(x.clientKey, (y) => ({ ...y, editing: true }))} onSave={(v) => saveEdit(x.clientKey, v)} onRemove={() => remove(x.clientKey)} onCheck={(c) => upd(x.clientKey, (y) => ({ ...y, checked: c }))} onOne={() => void register([x.clientKey])} />)}
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="success" data-testid="success">
              <Signal state="sent" size="md" />
              <h3>{registered.length > 1 ? (registered.length === 2 ? 'Begge er registrert.' : `${registered.length} saker er registrert.`) : 'Registrert.'}</h3>
              <p>{registered.length > 1 ? 'Hver sak er sendt til riktig oppfølging. Du trenger ikke gjøre mer.' : 'Saken er sendt til riktig oppfølging. Du trenger ikke gjøre mer.'}</p>
              <div className="summary">
                {registered.map((r) => <div className="sumrow" key={r.id}><span className={'type ' + r.category}>{CATEGORY_LABEL[r.category]}</span><div><b>{r.title}</b><div className="small">{r.equipment}{r.measurement?.raw ? ` · ${r.measurement.raw}` : ''} → {r.suggestedAction}</div></div><span className="at">{new Date(r.createdAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span></div>)}
                {photo && <div className="sumrow"><span className="type">Bilde</span><div><b>Bilde lagt ved</b><div className="small">Følger saken til den som skal fikse det</div></div><span className="at" /></div>}
              </div>
              <div className="next"><b>StayMotion følger opp videre.</b> Skiftleder får beskjed nå, og lederen din ser saken i oversikten sin. Du får en kort bekreftelse når det er løst.</div>
            </div>
          )}
        </div>
        <div className="sheet-f">
          {stage === 'record' && photo && <button className="btn ghost" type="button" onClick={() => void analyze('')} disabled={busy}>Send bare bildet</button>}
          {stage === 'review' && (<>
            {needChk && open.length > 0 && <div className="fnote">Bekreft {open.filter((x) => x.requiresConfirmation && !x.checked).length === 1 ? 'målingen' : 'målingene'} i {issues.filter((x) => x.requiresConfirmation && !x.checked).map((x) => `sak ${issues.indexOf(x) + 1}`).join(' og ')} før du registrerer.</div>}
            <button className="btn ghost" type="button" onClick={close}>Avbryt</button>
            <button className="btn primary" type="button" disabled={busy || needChk || !open.length} onClick={() => void register(open.map((x) => x.clientKey))} data-testid="confirm-all">{open.length > 1 ? `Registrer ${open.length === 2 && n === 2 ? 'begge' : `alle ${open.length}`}` : 'Registrer'}</button>
          </>)}
          {stage === 'done' && (<>
            <button className="btn ghost" type="button" onClick={() => { setRegistered([]); setTyped(''); releasePhoto(); retake(); }}>Ny rapport</button>
            <button className="btn primary" type="button" onClick={close} data-testid="done">Ferdig</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

function IssueCard({ x, i, many, onEdit, onSave, onRemove, onCheck, onOne }: { x: Local; i: number; many: boolean; onEdit(): void; onSave(v: { title?: string; equipment?: string; suggestedAction?: string; measure?: string }): void; onRemove(): void; onCheck(c: boolean): void; onOne(): void }) {
  const [t, setT] = useState(x.title); const [eq, setEq] = useState(x.equipment); const [me, setMe] = useState(x.measurement?.raw || ''); const [ac, setAc] = useState(x.suggestedAction);
  const unsure = x.confidence !== 'high' ? <span className="unsure" title="Usikker tolkning">◔ sjekk</span> : null;
  const save = () => onSave({ title: t, equipment: eq, suggestedAction: ac, measure: me });
  return (
    <article className={'issue' + (x.confirmed ? ' confirmed' : '')} data-testid="issue">
      <div className="top"><span className="n" aria-hidden>{i + 1}</span><div className="ttl">
        {x.editing ? <div className="fld"><label>Hva</label><input value={t} onChange={(e) => setT(e.target.value)} aria-label="Hva" onKeyDown={(e) => e.key === 'Enter' && save()} /></div> : <strong>{x.title}</strong>}
        <div className={'type ' + x.category}><span className="dot" aria-hidden />{CATEGORY_LABEL[x.category]}</div>
      </div></div>
      <div className="fields">
        <div className="fld"><label>Utstyr / område</label>{x.editing ? <input value={eq} onChange={(e) => setEq(e.target.value)} aria-label="Utstyr / område" data-testid="edit-equipment" /> : <b>{x.equipment}{unsure}</b>}</div>
        <div className="fld"><label>Måling</label>{x.editing ? <input value={me} onChange={(e) => setMe(e.target.value)} aria-label="Måling" /> : <b>{x.measurement?.raw || '—'}</b>}</div>
        <div className="fld wide"><label>Oppfølging</label>{x.editing ? <input value={ac} onChange={(e) => setAc(e.target.value)} aria-label="Oppfølging" /> : <b>{x.suggestedAction}</b>}</div>
      </div>
      {x.requiresConfirmation && !x.confirmed && (
        <label className="confirmrow"><input type="checkbox" checked={x.checked} onChange={(e) => onCheck(e.target.checked)} data-testid="confirm-check" /> {x.category === 'temperature' ? 'Jeg bekrefter at målingen er lest av på enheten' : 'Jeg bekrefter at dette er riktig'}</label>
      )}
      {x.confirmed ? <div className="donestrip">✓ Registrert · {x.suggestedAction}</div> : (
        <div className="acts">
          {x.editing ? <button className="btn sm primary" type="button" onClick={save} data-testid="save-edit">Lagre</button> : <button className="btn sm soft" type="button" onClick={onEdit} data-testid="edit">Endre</button>}
          <button className="btn sm danger" type="button" onClick={onRemove} data-testid="remove">Fjern</button>
          <span className="spacer" />
          {many && <button className="btn sm ghost" type="button" disabled={x.requiresConfirmation && !x.checked} onClick={onOne} data-testid="register-one">Registrer denne</button>}
        </div>
      )}
    </article>
  );
}
