'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalyzeResult } from '../ai/contract';
import type { CaptureSource } from '../domain/types';
import type { DataProvider } from '../data/provider';
import type { Session } from '../session/session';
import { analyzeText } from '../lib/analyze-client';
import { speechSupported, startSpeech, type SpeechHandle } from '../lib/speech';
import { Signal, type SignalState } from './Signal';

/**
 * SignalCapture — the interactive «Meld fra» organism on Employee Today.
 *
 * Press-and-hold records while held; a short tap toggles recording on/off. Speech comes from the
 * browser's SpeechRecognition (as before), the live level from Web Audio when the browser allows
 * it (otherwise a gentle synthetic breath), and the transcript goes to /api/analyze. Nothing is
 * saved here: the result is handed to the Capture sheet where the employee confirms or corrects.
 *
 * If the microphone is refused or unsupported, the typed fallback appears inline — the rest of the
 * page keeps working.
 */
type Phase = 'idle' | 'pressed' | 'listening' | 'analyzing' | 'error';
export type SignalOutcome = 'sent' | 'critical' | null;

const HOLD_MS = 350;           // shorter than this = tap (toggle), longer = hold-to-talk
const LEVEL_SMOOTHING = 0.25;  // low-pass on the RMS so the organism breathes instead of jittering

const COPY: Record<SignalState, { title: string; sub: string }> = {
  idle: { title: 'Meld fra', sub: 'Hold inne og fortell' },
  pressed: { title: 'Tar opp …', sub: 'Slipp for å stoppe' },
  listening: { title: 'StayMotion lytter', sub: 'Trykk for å stoppe' },
  analyzing: { title: 'Finner det som må følges opp', sub: 'Én ytring kan bli flere saker' },
  confirm: { title: 'Sjekk forslaget', sub: 'Du bekrefter før noe lagres' },
  sent: { title: 'Sendt', sub: 'Lederen får beskjed' },
  critical: { title: 'Sendt som kritisk', sub: 'Skiftleder varsles nå' },
  error: { title: 'Ingen mikrofon', sub: 'Skriv i stedet' },
};

export function SignalCapture({ session, db, outcome, onAnalyzed, onBusy }: {
  session: Session; db: DataProvider;
  /** Set by the page after registration so the organism can show the result. */
  outcome: SignalOutcome;
  onAnalyzed(result: AnalyzeResult, transcript: string, source: CaptureSource): void;
  onBusy?(busy: boolean): void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [finalText, setFinalText] = useState(''); const [interim, setInterim] = useState('');
  const [typing, setTyping] = useState(false); const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const sigRef = useRef<HTMLSpanElement>(null);
  const speech = useRef<SpeechHandle | null>(null);
  const pressedAt = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const reduce = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setPhaseSafe = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  // ---- live level → CSS variable (no React work per frame) ----
  const setLevel = (v: number) => { sigRef.current?.style.setProperty('--level', v.toFixed(3)); };
  const stopMeter = useCallback(() => {
    const a = audio.current; audio.current = null;
    if (!a) { setLevel(0); return; }
    cancelAnimationFrame(a.raf);
    a.stream.getTracks().forEach((t) => t.stop());
    void a.ctx.close().catch(() => undefined);
    setLevel(0);
  }, []);
  const startMeter = useCallback(async () => {
    if (reduce) return; // static organism under reduced motion
    let level = 0;
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!Ctx || !navigator.mediaDevices?.getUserMedia) throw new Error('no audio');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
        const rms = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
        level += (rms - level) * LEVEL_SMOOTHING; setLevel(level);
        if (audio.current) audio.current.raf = requestAnimationFrame(tick);
      };
      audio.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    } catch {
      // No meter available (permission, iOS quirks, headless): breathe gently instead.
      const t0 = performance.now();
      const fake = () => { if (phaseRef.current !== 'listening' && phaseRef.current !== 'pressed') return; setLevel(0.18 + 0.12 * Math.sin((performance.now() - t0) / 420)); requestAnimationFrame(fake); };
      requestAnimationFrame(fake);
    }
  }, [reduce]);

  // ---- analyze ----
  const analyze = useCallback(async (text: string, source: CaptureSource) => {
    setPhaseSafe('analyzing'); onBusy?.(true); setNote('');
    try {
      const result = await analyzeText(session, db, text, false);
      setPhaseSafe('idle'); setFinalText(''); setInterim(''); setTyped(''); setTyping(false);
      onAnalyzed(result, result.transcript || text, source);
    } catch (e) {
      setPhaseSafe('idle'); setNote((e as Error).message || 'Tolkningen feilet. Prøv igjen.');
    } finally { onBusy?.(false); }
  }, [session, db, onAnalyzed, onBusy]);

  // ---- speech ----
  const stopListening = useCallback(() => { const h = speech.current; speech.current = null; h?.stop(); stopMeter(); }, [stopMeter]);
  const startListening = useCallback(() => {
    if (speech.current) return;
    setNote(''); setFinalText(''); setInterim('');
    if (!speechSupported()) { setPhaseSafe('error'); setTyping(true); return; }
    let latestFinal = ''; let latestInterim = ''; let failed = false;
    speech.current = startSpeech({
      onStart: () => { if (phaseRef.current === 'pressed') return; setPhaseSafe('listening'); },
      onResult: (f, i) => { latestFinal = f; latestInterim = i; setFinalText(f); setInterim(i); },
      onEnd: () => {
        if (failed) return; // browsers fire onend after onerror — the error state must stay
        speech.current = null; stopMeter();
        const text = (latestFinal || latestInterim).trim();
        if (text) void analyze(text, 'voice');
        else { setPhaseSafe('idle'); setNote('Jeg hørte ikke nok. Prøv igjen litt nærmere telefonen, eller skriv i stedet.'); }
      },
      onError: (code) => {
        failed = true; speech.current = null; stopMeter();
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') { setPhaseSafe('error'); setTyping(true); }
        else { setPhaseSafe('idle'); setNote('Talegjenkjenningen stoppet. Trykk for å starte på nytt.'); }
      },
    });
    if (!speech.current) { setPhaseSafe('error'); setTyping(true); return; }
    void startMeter();
  }, [analyze, startMeter, stopMeter]);

  useEffect(() => () => { speech.current?.stop(); speech.current = null; stopMeter(); }, [stopMeter]);

  // ---- pointer: hold-to-talk or tap-to-toggle ----
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (outcome || phaseRef.current === 'analyzing') return;
    if (phaseRef.current === 'listening' || phaseRef.current === 'pressed') { stopListening(); return; }
    pressedAt.current = performance.now();
    setPhaseSafe('pressed');
    startListening();
  };
  const onUp = () => {
    if (phaseRef.current !== 'pressed' && phaseRef.current !== 'listening') return;
    const held = performance.now() - pressedAt.current;
    if (phaseRef.current === 'pressed') {
      // a short tap keeps listening until the next tap; a real hold stops on release
      if (held < HOLD_MS) setPhaseSafe('listening'); else stopListening();
    }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (phaseRef.current === 'listening' || phaseRef.current === 'pressed') stopListening(); else if (phaseRef.current === 'idle') { setPhaseSafe('pressed'); startListening(); setTimeout(() => { if (phaseRef.current === 'pressed') setPhaseSafe('listening'); }, HOLD_MS); }
  };

  const state: SignalState = outcome ?? phase;
  const copy = COPY[state];
  const live = phase === 'listening' || phase === 'pressed' ? (finalText || interim ? `${finalText}${interim ? ` ${interim}` : ''}` : '') : '';
  const stepIndex = state === 'sent' || state === 'critical' ? 2 : state === 'analyzing' ? 1 : state === 'listening' || state === 'pressed' ? 0 : -1;

  return (
    <section className="signal-stage" aria-label="Meld fra til StayMotion">
      <button
        type="button"
        className={`sigbtn sigbtn-${state}`}
        onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}
        onKeyDown={onKey} onContextMenu={(e) => e.preventDefault()}
        aria-pressed={phase === 'listening' || phase === 'pressed'}
        aria-label={state === 'listening' || state === 'pressed' ? 'Stopp opptak' : 'Meld fra — hold inne og fortell'}
        disabled={phase === 'analyzing' || !!outcome}
        data-testid="open-voice"
        data-state={state}
      >
        <Signal ref={sigRef} state={state} size="lg" title={copy.title} subtitle={copy.sub} />
      </button>

      <div className="sig-status" role="status" aria-live="polite">
        {state === 'listening' || state === 'pressed' ? <span className="sig-caption"><i aria-hidden />Opptak pågår</span>
          : state === 'analyzing' ? <span className="sig-caption">StayMotion tolker det du sa</span>
          : state === 'sent' || state === 'critical' ? <span className="sig-caption ok">Registrert og videresendt</span>
          : state === 'error' ? <span className="sig-caption muted">Skriv under, så tolker StayMotion teksten.</span>
          : note ? <span className="sig-caption warn">{note}</span>
          : <span className="sig-caption muted">Trykk for å starte. Hold inne for å snakke kort.</span>}
      </div>

      {live !== '' && <div className="live sig-live" data-testid="live">{finalText}{interim ? <span className="interim"> {interim}</span> : null}</div>}
      {(state === 'listening' || state === 'pressed') && live === '' && <div className="live sig-live empty" data-testid="live">Det du sier vises her …</div>}

      <ol className="sig-dots" aria-label="Steg">
        {['Lytter', 'Finner saker', 'Sendt'].map((label, i) => <li key={label} className={i === stepIndex ? 'on' : i < stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}><i aria-hidden />{label}</li>)}
      </ol>

      {(typing || phase === 'error') ? (
        <div className={'sig-typed' + (phase === 'error' ? ' error' : '')}>
          {phase === 'error' && <p className="small">Vi fikk ikke tilgang til mikrofonen. Du kan fortsatt melde fra ved å skrive.</p>}
          <textarea className="input" rows={3} placeholder="Skriv hva som har skjedd …" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (typed.trim()) void analyze(typed.trim(), 'typed'); } }} data-testid="signal-type-input" aria-label="Skriv hva som har skjedd" />
          <div className="row">
            <button className="linkbtn" type="button" onClick={() => { setTyping(false); if (phase === 'error') setPhaseSafe('idle'); }}>Skjul</button>
            <button className="btn sm primary" type="button" disabled={!typed.trim() || phase === 'analyzing'} onClick={() => void analyze(typed.trim(), 'typed')} data-testid="signal-type-go">Tolk</button>
          </div>
        </div>
      ) : (
        <button className="linkbtn sig-typetoggle" type="button" onClick={() => setTyping(true)} disabled={phase === 'analyzing' || !!outcome} data-testid="signal-type-toggle">Skriv i stedet</button>
      )}
    </section>
  );
}
