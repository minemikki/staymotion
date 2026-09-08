/**
 * Thin wrapper around the browser SpeechRecognition API (Safari/Chrome).
 * Free, on-device/vendor transcription — the first choice before any paid
 * transcription. Falls back to "unavailable" so the UI can offer typing.
 */
export interface SpeechHandle { stop(): void }
export interface SpeechCallbacks {
  onStart(): void;
  onResult(finalText: string, interimText: string): void;
  onEnd(): void;
  onError(code: string): void;
}

type SRCtor = new () => {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start(): void; stop(): void;
};

export function speechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startSpeech(cb: SpeechCallbacks, lang = 'nb-NO'): SpeechHandle | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = lang; rec.continuous = true; rec.interimResults = true;
  let finalText = '';
  let stopped = false;
  rec.onstart = () => cb.onStart();
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += (finalText ? ' ' : '') + r[0].transcript.trim(); else interim += r[0].transcript;
    }
    cb.onResult(finalText, interim);
  };
  rec.onerror = (e) => { if (e.error !== 'aborted') cb.onError(e.error); };
  rec.onend = () => { if (!stopped) cb.onEnd(); };
  try { rec.start(); } catch { return null; }
  return { stop() { stopped = true; try { rec.stop(); } catch { /* noop */ } cb.onEnd(); } };
}
