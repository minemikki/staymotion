'use client';
import { forwardRef } from 'react';

/**
 * StayMotion Signal — the visual signature for «Meld fra».
 *
 * Not a microphone icon and not a ball: a living sound organism built from translucent SVG
 * ribbons (cobalt body, sky ring, coral signal thread) around a cobalt core. Pure SVG + CSS,
 * no runtime dependencies. Motion lives in CSS so React never re-renders per frame; the live
 * audio level is fed through the `--level` custom property on the root element (see
 * SignalCapture), which the ribbons and the wave read directly.
 *
 * States (semantic colours from globals.css):
 *   idle       calm breathing, cobalt
 *   pressed    grows slightly, rings move outward
 *   listening  ribbons + wave react to `--level`, coral thread active
 *   analyzing  the organism splits into two threads — one utterance can become several issues
 *   confirm    steady, used as a small indicator while the proposal panel is open
 *   sent       gathers into a mint confirmation with a check
 *   critical   coral/red core, slow pulse, never blinks — only for a real critical incident
 *   error      desaturated and still — microphone unavailable
 */
export type SignalState = 'idle' | 'pressed' | 'listening' | 'analyzing' | 'confirm' | 'sent' | 'critical' | 'error';
export type SignalSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SignalProps {
  state: SignalState;
  size?: SignalSize;
  /** 0–1 audio level. Only needed for static renders; SignalCapture drives it via the CSS variable. */
  level?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const Signal = forwardRef<HTMLSpanElement, SignalProps>(function Signal({ state, size = 'lg', level, title, subtitle, className = '' }, ref) {
  const style = level === undefined ? undefined : ({ ['--level' as string]: String(Math.max(0, Math.min(1, level))) } as React.CSSProperties);
  return (
    <span ref={ref} className={`sig sig-${state} sig-${size} ${className}`.trim()} style={style} data-state={state} aria-hidden>
      <svg className="sig-svg" viewBox="0 0 400 400" focusable="false">
        <defs>
          <radialGradient id="sigCore" cx="34%" cy="30%" r="80%">
            <stop offset="0" stopColor="#6E93FF" /><stop offset=".48" stopColor="#2457F5" /><stop offset="1" stopColor="#1436A8" />
          </radialGradient>
          <radialGradient id="sigCoreMint" cx="34%" cy="30%" r="80%">
            <stop offset="0" stopColor="#8DF0C8" /><stop offset=".5" stopColor="#22C48A" /><stop offset="1" stopColor="#0E7A55" />
          </radialGradient>
          <radialGradient id="sigCoreCritical" cx="34%" cy="30%" r="80%">
            <stop offset="0" stopColor="#FF9C8A" /><stop offset=".5" stopColor="#E8553A" /><stop offset="1" stopColor="#A3251F" />
          </radialGradient>
          <linearGradient id="sigRibbonA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A9C4FF" stopOpacity=".85" /><stop offset="1" stopColor="#3D6BFF" stopOpacity=".38" />
          </linearGradient>
          <linearGradient id="sigRibbonB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFC6B3" stopOpacity=".85" /><stop offset="1" stopColor="#FF7A5C" stopOpacity=".32" />
          </linearGradient>
          <linearGradient id="sigRibbonC" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5" /><stop offset="1" stopColor="#9DBBFF" stopOpacity=".05" />
          </linearGradient>
          <linearGradient id="sigRibbonD" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFD3C4" stopOpacity=".55" /><stop offset="1" stopColor="#FF6B4A" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id="sigWave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><stop offset=".35" stopColor="#FFFFFF" stopOpacity=".95" /><stop offset=".65" stopColor="#FFB79F" stopOpacity=".95" /><stop offset="1" stopColor="#FF6B4A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sigGloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".7" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <filter id="sigSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" /></filter>
          <filter id="sigHalo" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="18" /></filter>
        </defs>

        {/* ambient halo */}
        <circle className="sig-halo" cx="200" cy="200" r="150" filter="url(#sigHalo)" />

        {/* rings that travel outward when pressed / listening */}
        <g className="sig-rings">
          <circle className="sig-ring r1" cx="200" cy="200" r="152" />
          <circle className="sig-ring r2" cx="200" cy="200" r="174" />
          <circle className="sig-ring r3" cx="200" cy="200" r="194" />
        </g>

        {/* the orbiting signal dot */}
        <g className="sig-orbit"><circle cx="200" cy="24" r="6" /></g>

        {/* translucent petals behind the core — the body of the organism */}
        <g className="sig-ribbons">
          <g className="rb-wrap rb-wrap-a"><path className="rb rb-a" filter="url(#sigSoft)" d="M200 66C296 66 334 104 334 200C334 296 296 334 200 334C104 334 66 296 66 200C66 104 104 66 200 66Z" /></g>
          <g className="rb-wrap rb-wrap-b"><path className="rb rb-b" filter="url(#sigSoft)" d="M200 84C286 84 320 118 320 200C320 282 286 316 200 316C114 316 80 282 80 200C80 118 114 84 200 84Z" /></g>
          {/* analyzing: the thread that connects the two halves while they separate */}
          <path className="sig-thread" d="M120 200C150 160 250 240 280 200" />
        </g>

        {/* core */}
        <circle className="sig-core" cx="200" cy="200" r="102" fill="url(#sigCore)" />
        <circle className="sig-core sig-core-mint" cx="200" cy="200" r="102" fill="url(#sigCoreMint)" />
        <circle className="sig-core sig-core-critical" cx="200" cy="200" r="102" fill="url(#sigCoreCritical)" />
        <circle className="sig-rim" cx="200" cy="200" r="101" />
        <ellipse className="sig-gloss" cx="172" cy="140" rx="50" ry="24" fill="url(#sigGloss)" />

        {/* glass petals in front of the core — light passes through them */}
        <g className="sig-ribbons sig-ribbons-front">
          <g className="rb-wrap rb-wrap-c"><path className="rb rb-c" d="M200 92C280 92 308 120 308 200C308 280 280 308 200 308C120 308 92 280 92 200C92 120 120 92 200 92Z" /></g>
          <g className="rb-wrap rb-wrap-d"><path className="rb rb-d" d="M118 206C112 134 168 92 240 92C304 92 324 148 286 200C246 254 200 310 134 308C92 306 122 258 118 206Z" /></g>
        </g>

        {/* live wave — reads --level, drawn across the core */}
        <g className="sig-wave-wrap"><path className="sig-wave" d="M40 200C60 200 66 150 88 150S112 250 136 250S160 150 184 150S208 250 232 250S256 150 280 150S304 250 328 250S344 200 360 200" /></g>

        {/* sent check */}
        <path className="sig-check" d="M166 160l22 22 44-48" />
      </svg>
      {(title || subtitle) && (
        <span className="sig-text">
          {title && <b>{title}</b>}
          {subtitle && <small>{subtitle}</small>}
        </span>
      )}
    </span>
  );
});
