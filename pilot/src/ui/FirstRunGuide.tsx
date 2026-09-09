'use client';

import Link from 'next/link';

/**
 * «Kom i gang» — the first-run guide on the manager home. It appears only while a brand-new
 * organization is still empty (no case has ever been reported), turns the blank first screen into
 * three concrete steps to value, and retires itself the moment the operative loop is live. Every
 * step reflects real state — nothing is faked or pre-ticked beyond what the org actually has.
 */
export interface FirstRunStep {
  key: string;
  title: string;
  body: string;
  done: boolean;
  href: string;
  cta: string;
}

export function FirstRunGuide({ steps, onDismiss }: { steps: FirstRunStep[]; onDismiss(): void }) {
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <section className="kom" aria-label="Kom i gang" data-testid="first-run">
      <div className="kom-head">
        <div>
          <div className="eyebrow">Kom i gang</div>
          <h2>Tre korte steg til at driften passer på seg selv.</h2>
        </div>
        <button className="linkbtn kom-skip" type="button" onClick={onDismiss} data-testid="first-run-dismiss">Skjul veiviseren</button>
      </div>
      <div className="kom-progress" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length} aria-label={`${doneCount} av ${steps.length} steg gjort`}>
        <i style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="kom-steps">
        {steps.map((s, i) => {
          const current = !s.done && s === next;
          return (
            <li key={s.key} className={'kom-step' + (s.done ? ' done' : current ? ' current' : '')} data-testid="first-run-step" data-done={s.done ? '1' : '0'}>
              <span className="kom-mark" aria-hidden>{s.done ? '✓' : i + 1}</span>
              <div className="kom-body">
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
              {s.done
                ? <span className="pill ok kom-state">Klart</span>
                : <Link className={'btn sm ' + (current ? 'primary' : 'soft')} href={s.href} data-testid={`first-run-cta-${s.key}`}>{s.cta}</Link>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
