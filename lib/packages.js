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
  launch:    { id: 'launch',    name: 'StayMotion Launch',    fromKr: 7900,  depositPct: 50, deliver: 'ca. 7–14 dager' },
  growth:    { id: 'growth',    name: 'StayMotion Growth',    fromKr: 12900, depositPct: 50, deliver: 'ca. 2–3 uker' },
  signature: { id: 'signature', name: 'StayMotion Signature', fromKr: 19900, depositPct: 40, deliver: 'ca. 3–5 uker' },
  care:      { id: 'care',      name: 'StayMotion Care',      fromKr: 1490,  depositPct: 100, deliver: 'løpende', monthly: true },
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
      : base.name + ' — depositum ' + base.depositPct + ' %',
    deliver: base.deliver,
    monthly: !!base.monthly,
  };
}
