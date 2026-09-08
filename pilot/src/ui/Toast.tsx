'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m); setOn(true);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setOn(false), 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className={'toast' + (on ? ' on' : '')} role="status" aria-live="polite">{msg}</div>
    </Ctx.Provider>
  );
}
