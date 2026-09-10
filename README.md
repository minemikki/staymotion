# StayMotion

Premium webdesign og digitale opplevelser for norske bedrifter som har vokst ut av det ordinære.
**Nettsider som ser dyre ut — og faktisk selger.**

## Stack
Statisk HTML/CSS/vanilla JS på Vercel · serverless API i `api/` (ESM) · Vercel Blob (`leads/`, `orders/`) ·
Stripe + Vipps (depositum) · Resend (e-post) · signerte portal-tokens.

## Sider
| Fil | Rolle |
|---|---|
| `index.html` | Forsiden — posisjonering, arbeid (konsept), tjenester, prosess, priser, ROI, FAQ |
| `start.html` | 7-stegs prosjekt-intake → `api/project-intake.js` → Leads CRM + e-post |
| `minside.html` / `ordre.html` | Kundeportal (prosjektstatus, filer, meldinger, leveranse) |
| `takk.html` | Bekreftelse etter depositum |
| `admin.html` | Flyttet — sender til `salg.html` |
| `salg.html` | **Salgssystem** (adminbeskyttet): resultatmål, CRM, nettsideanalyse, meldingsgenerator, godkjenningskø, lovlig utsending, «I dag», tilbud |
| `sprint.html` | Offentlig konverteringsside: Website Sprint + Landing Page Sprint + gratis nettsidesjekk (`/sprint`) |
| `bestill.html` | Redirect til `start.html` (gammel lenke) |

## Salgssystem (`/salg.html`)
Adminbeskyttet salgsmotor bygget på eksisterende stack (Blob-prefiks `sales/`). Se `docs/SALES_ENGINE_PLAN.md`
for kartlegging, arkitektur og 17-dagers plan. Endepunkter: `api/sales-*.js` (alle `ADMIN_KEY`-gated) +
offentlig `api/unsubscribe.js`. Lovlig utsending: starter i **dry-run**, krever `SALES_LIVE=1` + bekreftet
avsenderdomene før ekte e-post sendes. Suppression-liste, stopp ved svar/bounce/klage/avmelding, dagsgrense,
norsk arbeidstid, kill switch, sendelogg. Sprint-pakker + MVA-visning ligger i `lib/packages.js`.

## Tilbud (`lib/packages.js`)
Første trekk 7 900 · Momentum 16 000 · Signatur fra 19 900 · Videre fra 1 490/mnd (større prosjekter får eget tilbud).
Checkout belaster **depositum** (Momentum 50 %, Signatur 40 %). Første trekk betales i sin helhet ved oppstart. Videre faktureres månedlig.

## Miljøvariabler (Vercel)
`ADMIN_KEY`, `ORDER_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL`, `STRIPE_SECRET_KEY`,
`STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `VIPPS_*`.
`SALES_LIVE` — settes til `1` **kun etter** at avsenderdomene + SPF/DKIM/DMARC er verifisert i Resend;
uten den er salgssystemet i dry-run og sender ingen ekte e-post.

Se `docs/PIVOT_PLAN.md` for hvorfor arkitekturen ser ut som den gjør.

StayMotion selger webdesign. Den tidligere videotjenesten er avviklet og fjernet fra
kodebasen. Gamle ordrer fra den ligger fortsatt i `orders/`-lageret og filtreres bort
via `REEL_PACKAGE_IDS` i `lib/packages.js` — uten det dukker de opp som webprosjekter.
