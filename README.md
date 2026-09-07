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
| `admin.html` | Dashboard: salgspipeline (Leads), prosjekter, pipeline-tavle |
| `bestill.html` | Redirect til `start.html` (gammel lenke) |

## Tilbud (`lib/packages.js`)
Launch fra 7 900 · Growth fra 12 900 · Signature fra 19 900 · Care fra 1 490/mnd (introduksjonspriser; større prosjekter får eget tilbud).
Checkout belaster **depositum** (50 % / 40 %). Care faktureres månedlig.

## Miljøvariabler (Vercel)
`ADMIN_KEY`, `ORDER_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL`, `STRIPE_SECRET_KEY`,
`STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `VIPPS_*`, `MCP_TOKEN`.

Se `docs/PIVOT_PLAN.md` for revisjonen fra video-selskap til webdesign-studio, og hva som er beholdt.
