// Shared offer catalogue (starting prices in NOK; larger projects are quoted).
// Single source of truth for the website, the intake flow, proposals, the
// delivery checklist and any payment links, so Stripe and Vipps agree.
//
// NAMING: every package has a short StayMotion `name` plus a plain-language
// `tagline`. The name must never stand alone in customer-facing surfaces —
// always render name + tagline (see `fullName()`), e.g.
//
//     MOMENTUM
//     Komplett nettside
//     16 000 kr
//
// IDS ARE FROZEN. `sprint`, `landing`, `launch`, `growth`, `signature` and
// `care` are written into existing orders, Stripe metadata and old marketing
// URLs. Renaming happens on the display layer only; ids never change.
//
// Web projects are sold intake → proposal → deposit. When a package is paid
// through checkout, the amount charged is the DEPOSIT (not the full price):
//   Momentum   50 % up front, 50 % before launch
//   Signatur   40 % start, 30 % at design approval, 30 % before launch
// Første trekk is paid in full at start. Videre is billed monthly and never
// through one-time checkout.

export const PACKAGES = {
  // ---- the four packages a customer may see -------------------------------
  landing: {
    id: 'landing', name: 'Første trekk', tagline: 'Landingsside',
    fromKr: 7900, depositPct: 100, fromPrice: false,
    deliver: 'ca. 3 virkedager etter mottatt innhold',
  },
  sprint: {
    id: 'sprint', name: 'Momentum', tagline: 'Komplett nettside',
    fromKr: 16000, depositPct: 50, fromPrice: false, featured: true,
    deliver: 'første komplette utkast innen 5 virkedager',
  },
  signature: {
    id: 'signature', name: 'Signatur', tagline: 'Større, skreddersydd nettopplevelse',
    fromKr: 19900, depositPct: 40, fromPrice: true,
    deliver: 'ca. 3–5 uker',
  },
  care: {
    id: 'care', name: 'Videre', tagline: 'Drift, endringer og oppfølging',
    fromKr: 1490, depositPct: 100, fromPrice: true, monthly: true,
    deliver: 'løpende',
  },

  // ---- legacy ids: hidden from marketing, kept so existing orders, old
  // links and historical receipts keep resolving. `supersededBy` lets the
  // intake flow steer a stale link onto its current equivalent.
  launch: {
    id: 'launch', name: 'Oppstart', tagline: 'Mindre nettside',
    fromKr: 7900, depositPct: 50, deliver: 'ca. 7–14 dager',
    legacy: true, supersededBy: 'landing',
  },
  growth: {
    id: 'growth', name: 'Vekst', tagline: 'Nettside med flere sider',
    fromKr: 12900, depositPct: 50, deliver: 'ca. 2–3 uker',
    legacy: true, supersededBy: 'sprint',
  },
};

// The only packages marketing surfaces may render, in the order they appear.
export const PUBLIC_PACKAGE_IDS = ['landing', 'sprint', 'signature', 'care'];

// Package ids from the discontinued video service (cinematic reels for
// property listings). That service is closed and is not sold again. StayMotion
// is a webdesign business; the catalogue above is the whole offer.
//
// The ids survive here for one reason only: old orders in the blob store still
// carry them, and they share that store with the web orders. Without this list
// they resurface as webdesign projects in the sales panel and on the delivery
// board. Matching an order against it removes it from every internal surface.
//
// Deliberately a deny-list, not an allow-list: a real web order with a blank
// or unexpected `pkg` must never silently disappear from the panel.
export const REEL_PACKAGE_IDS = ['bilder', 'enkelt', 'signatur'];

export function isReelOrder(order) {
  if (!order) return false;
  if (order.project) return false;            // moved into the web workflow
  return REEL_PACKAGE_IDS.indexOf(order.pkg) !== -1;
}

// Name + tagline, never the bare name. Used in Stripe line items, proposals,
// receipts and the admin.
export function fullName(pkg) {
  const p = typeof pkg === 'string' ? PACKAGES[pkg] : pkg;
  if (!p) return '';
  return p.tagline ? p.name + ' (' + p.tagline.toLowerCase() + ')' : p.name;
}

// Resolve a stale/legacy package id onto the package we sell today.
export function currentId(pkg) {
  const p = PACKAGES[pkg];
  if (!p) return null;
  return p.supersededBy || p.id;
}

// ---- what Momentum actually includes ---------------------------------------
// Single source of truth for the pricing page, proposals and the delivery
// report, so we never promise something the checklist does not cover.
export const MOMENTUM_INCLUDES = [
  'Forside og inntil fire undersider',
  'Skreddersydd design innen avtalt retning',
  'Mobiltilpasset og responsiv nettside',
  'Tekstbearbeiding basert på ditt råmateriale',
  'Kontaktskjema eller én standard bookingintegrasjon',
  'Kart, åpningstider og klikk-for-å-ringe',
  'Teknisk SEO-grunnmur',
  'Tilkobling av eksisterende domene, eller hjelp til å registrere nytt',
  'Hosting- og publiseringsoppsett',
  'Oppsett eller forbedring av én Google-bedriftsprofil',
  'Hastighets- og kvalitetssjekk',
  'Grunnleggende tilgjengelighet',
  'Testet skjema med spam-beskyttelse',
  'Search Console og enkel besøksmåling',
  'To revisjonsrunder',
  'Kort overlevering',
  '14 dagers feilretting etter lansering',
];

// Delivery-time wording. Deliberately about the FIRST DRAFT, not the launch —
// feedback, domain moves and Google verification are outside our control.
export const DELIVERY_PROMISE =
  'Første komplette utkast innen fem virkedager etter at vi har mottatt innhold, '
  + 'nødvendige tilganger og oppstartbetaling.';

// What we do — and explicitly do not promise — on Google Business Profile.
export const GOOGLE_PROFILE = {
  does: [
    'Oppretter eller forbedrer én profil',
    'Kontrollerer kategori, beskrivelse, kontaktinformasjon og åpningstider',
    'Kobler nettside, booking eller meny',
    'Legger inn tjenester og bilder du leverer',
    'Hjelper med anmeldelseslenke eller QR-kode',
  ],
  customer: 'Du beholder eierskapet og gjennomfører eventuell Google-verifisering.',
  // Never promise any of these — kept here so copy reviews have one checklist.
  neverPromise: [
    'Førsteplass på Google', 'En bestemt rangering', 'Et bestemt antall kunder',
    'At Google godkjenner profilen', 'At alle anmeldelser kan fjernes',
  ],
};

export const DOMAIN_TERMS =
  'Vi kobler eksisterende domene eller hjelper dere å registrere et nytt. '
  + 'Hosting og publisering settes opp. Årlige domene- og tredjepartskostnader kommer i tillegg.';

export const OWNERSHIP_TERMS =
  'Kunden eier det skreddersydde designet, koden og innholdet etter fullført betaling. '
  + 'Tredjepartstjenester, fonter og lisensierte bilder følger sine egne vilkår.';

// Standard integrations included; anything else is quoted separately.
export const INTEGRATIONS = {
  included: [
    'Kontaktskjema', 'Google Maps', 'Kalender eller eksisterende bookingsystem',
    'Enkel analyse', 'Sosiale medier',
  ],
  quotedSeparately:
    'Spesialutviklet CRM, innlogging, nettbutikk, avansert booking, API-integrasjoner '
    + 'og automasjoner prises separat.',
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
// `rest` = true charges the REMAINING balance (fromKr − deposit) instead of the
// deposit — used for the "sluttbetaling" link sent when the site is delivered.
export function resolvePackage(pkg, express, both, rest) {
  const base = PACKAGES[pkg];
  if (!base) return null;
  const deposit = Math.round(base.fromKr * base.depositPct / 100);
  const balance = base.fromKr - deposit;          // remaining after the deposit
  const isRest = truthy(rest);
  if (isRest && balance <= 0) return null;         // nothing left to pay (100 % packages)
  const amountKr = isRest ? balance : deposit;
  const display = fullName(base);
  return {
    id: base.id,
    name: base.name,
    tagline: base.tagline || '',
    display,                            // "Momentum (komplett nettside)"
    express: truthy(express),
    both: false,
    rest: isRest,
    fromKr: base.fromKr,
    depositPct: base.depositPct,
    amountKr: amountKr,                 // what checkout actually charges
    amountMinor: amountKr * 100,        // øre — Stripe & Vipps use minor units
    label: base.monthly
      ? display + ' — første måned'
      : isRest
          ? display + ' — sluttbetaling'
          : (base.depositPct >= 100
              ? display + ' — full betaling ved oppstart'
              : display + ' — oppstartbetaling ' + base.depositPct + ' %'),
    deliver: base.deliver,
    monthly: !!base.monthly,
    legacy: !!base.legacy,
  };
}
