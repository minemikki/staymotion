// Shared offer catalogue (introductory starting prices in NOK; larger projects are quoted). Single source of truth for the
// website, the intake flow and any payment links, so Stripe and Vipps agree.
//
// Web projects are sold intake → proposal → deposit. When a package is paid
// through checkout, the amount charged is the DEPOSIT (not the full price):
//   Launch    50 % up front, 50 % before launch
//   Growth    50 % up front, 50 % before launch
//   Signature 40 % start, 30 % at design approval, 30 % before launch
// Care is billed monthly and never through one-time checkout.

export const PACKAGES = {
  // Sept 2026 sprint offers — the current lead offers for the 17-day sales push.
  // Website Sprint charges a 50 % deposit (8 000) up front; Landing Page Sprint
  // is paid in full (7 900) at start.
  sprint:    { id: 'sprint',    name: 'StayMotion Website Sprint',       fromKr: 16000, depositPct: 50,  deliver: 'ca. 5 virkedager etter innhold' },
  landing:   { id: 'landing',   name: 'StayMotion Landing Page Sprint',  fromKr: 7900,  depositPct: 100, deliver: 'ca. 3 virkedager' },
  // Established studio ladder (kept — larger projects are quoted individually).
  launch:    { id: 'launch',    name: 'StayMotion Launch',    fromKr: 7900,  depositPct: 50, deliver: 'ca. 7–14 dager' },
  growth:    { id: 'growth',    name: 'StayMotion Growth',    fromKr: 12900, depositPct: 50, deliver: 'ca. 2–3 uker' },
  signature: { id: 'signature', name: 'StayMotion Signature', fromKr: 19900, depositPct: 40, deliver: 'ca. 3–5 uker' },
  care:      { id: 'care',      name: 'StayMotion Care',      fromKr: 1490,  depositPct: 100, deliver: 'løpende', monthly: true },
};

// VAT display. Never show "inkl./eks. mva." until the business's VAT status is
// verified. Configurable — the sales area writes the real mode into the store
// once Michael confirms it. Default 'unknown' → no VAT line is shown anywhere.
export const VAT = {
  DEFAULT_MODE: 'unknown', // 'unknown' | 'incl' | 'excl' | 'exempt'
  label(mode) {
    switch (mode) {
      case 'incl': return 'inkl. mva.';
      case 'excl': return 'eks. mva.';
      case 'exempt': return 'mva-fritatt';
      default: return ''; // unknown → show nothing
    }
  },
};

// Kept for backwards compatibility with older callers; no longer used.
export const BOTH_FORMATS_KR = 0;

function truthy(v) { return v === true || v === '1' || v === 'true'; }

// Resolve a package for payment. `express` and `both` are accepted for
// compatibility with existing checkout callers but have no effect on price.
export function resolvePackage(pkg, express, both) {
  const base = PACKAGES[pkg];
  if (!base) return null;
  const deposit = Math.round(base.fromKr * base.depositPct / 100);
  return {
    id: base.id,
    name: base.name,
    express: truthy(express),
    both: false,
    fromKr: base.fromKr,
    depositPct: base.depositPct,
    amountKr: deposit,                 // what checkout actually charges
    amountMinor: deposit * 100,        // øre — Stripe & Vipps use minor units
    label: base.monthly
      ? base.name + ' — første måned'
      : (base.depositPct >= 100
          ? base.name + ' — full betaling ved oppstart'
          : base.name + ' — depositum ' + base.depositPct + ' %'),
    deliver: base.deliver,
    monthly: !!base.monthly,
  };
}
