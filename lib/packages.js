// Shared package catalogue (prices in NOK). Single source of truth for
// checkout amounts so Stripe and Vipps always agree.

export const PACKAGES = {
  bilder:   { id: 'bilder',   name: 'Cinematiske bilder',        amountKr: 990,  deliver: 'ca. 24 timer' },
  enkelt:   { id: 'enkelt',   name: 'Enkelt — 1 cinematisk reel', amountKr: 1990, deliver: 'ca. 48 timer' },
  signatur: { id: 'signatur', name: 'Signatur — 3 reels',         amountKr: 3490, deliver: 'ca. 48 timer' },
};

// Månedlig / Byrå are handled as a conversation (mailto), not one-time checkout.

// Both video formats (9:16 + 16:9) is an add-on upsell (a second render).
export const BOTH_FORMATS_KR = 690;
const VIDEO_PKGS = { enkelt: 1, signatur: 1 };

function truthy(v){ return v === true || v === '1' || v === 'true'; }

export function resolvePackage(pkg, express, both) {
  const base = PACKAGES[pkg];
  if (!base) return null;
  const isExpress = truthy(express);
  const wantsBoth = truthy(both) && !!VIDEO_PKGS[pkg];
  const amountKr = Math.round(base.amountKr * (isExpress ? 1.5 : 1)) + (wantsBoth ? BOTH_FORMATS_KR : 0);
  return {
    id: base.id,
    name: base.name,
    express: isExpress,
    both: wantsBoth,
    amountKr,
    amountMinor: amountKr * 100, // øre — Stripe & Vipps both use minor units for NOK
    label: base.name + (wantsBoth ? ' + begge formater' : '') + (isExpress ? ' + Express' : ''),
    deliver: isExpress ? 'halvert leveringstid' : base.deliver,
  };
}
