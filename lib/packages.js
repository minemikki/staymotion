// Shared package catalogue (prices in NOK). Single source of truth for
// checkout amounts so Stripe and Vipps always agree.

export const PACKAGES = {
  bilder:   { id: 'bilder',   name: 'Cinematiske bilder',        amountKr: 990,  deliver: 'ca. 24 timer' },
  enkelt:   { id: 'enkelt',   name: 'Enkelt — 1 cinematisk reel', amountKr: 1990, deliver: 'ca. 48 timer' },
  signatur: { id: 'signatur', name: 'Signatur — 3 reels',         amountKr: 3490, deliver: 'ca. 48 timer' },
};

// Månedlig / Byrå are handled as a conversation (mailto), not one-time checkout.

export function resolvePackage(pkg, express) {
  const base = PACKAGES[pkg];
  if (!base) return null;
  const isExpress = express === true || express === '1' || express === 'true';
  const amountKr = Math.round(base.amountKr * (isExpress ? 1.5 : 1));
  return {
    id: base.id,
    name: base.name,
    express: isExpress,
    amountKr,
    amountMinor: amountKr * 100, // øre — Stripe & Vipps both use minor units for NOK
    label: base.name + (isExpress ? ' + Express' : ''),
    deliver: isExpress ? 'halvert leveringstid' : base.deliver,
  };
}
