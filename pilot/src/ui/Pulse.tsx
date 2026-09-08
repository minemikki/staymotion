'use client';
import type { ButtonHTMLAttributes } from 'react';

/**
 * StayMotion Pulse — the signature surface for "Meld fra".
 * Pure CSS/SVG state machine (no runtime deps): idle · listening · analyzing · confirm · sent · critical.
 * Colours are semantic: cobalt (ready) → coral (listening) → violet (StayMotion is thinking)
 * → cobalt (confirm) → mint (sent) · red only for critical.
 */
export type PulseState = 'idle' | 'listening' | 'analyzing' | 'confirm' | 'sent' | 'critical';
export type PulseSize = 'sm' | 'md' | 'lg' | 'xl';

const MIC = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l5 5L20 7" /></svg>;
const SHIELD = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l8 3v6c0 4.6-3.2 7.9-8 9-4.8-1.1-8-4.4-8-9V6l8-3Z" /><path d="M9 12l2 2 4-4" /></svg>;
const ALERT = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M12 5v8" /><circle cx="12" cy="17.5" r="1.2" fill="currentColor" stroke="none" /></svg>;

export function Pulse({ state = 'idle', size = 'lg', className = '' }: { state?: PulseState; size?: PulseSize; className?: string }) {
  const glyph = state === 'listening' ? <span className="pulse-bars"><i /><i /><i /><i /><i /></span>
    : state === 'analyzing' ? <span className="pulse-orbit" />
    : state === 'sent' ? CHECK
    : state === 'confirm' ? SHIELD
    : state === 'critical' ? ALERT
    : MIC;
  return (
    <span className={`pulse pulse-${state} ${size} ${className}`.trim()} aria-hidden data-state={state}>
      <span className="pulse-halo" />
      <span className="pulse-ring r1" /><span className="pulse-ring r2" /><span className="pulse-ring r3" />
      <span className="pulse-core" />
      <span className="pulse-glyph">{glyph}</span>
    </span>
  );
}

/** Pulse as a large tappable control. Keeps focus/aria semantics of a real button. */
export function PulseButton({ state = 'idle', size = 'lg', className = '', ...rest }: { state?: PulseState; size?: PulseSize } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`pulsebtn ${className}`.trim()} {...rest}>
      <Pulse state={state} size={size} />
    </button>
  );
}
