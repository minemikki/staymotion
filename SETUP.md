# StayMotion — booking & betaling (oppsett)

Dette er hele betalings- og opplastingssystemet: kunden velger pakke →
betaler med **Vipps eller kort (Stripe)** → laster opp bildene → du får e-post
med bildene. Det er bygget som statiske sider + **Vercel-funksjoner** (`/api`).

> **Ingenting trekker ekte penger før du legger inn nøkler og bytter til
> «live»-modus.** Test alt i testmodus først.

Systemet ligger på grenen **`claude/booking-system`** (egen preview på Vercel),
så den vanlige siden (`staymotion.no`) er urørt til du har testet.

---

## 1. Kontoer du må opprette

| Tjeneste | Hva | Lenke |
|---|---|---|
| **Stripe** | Kortbetaling | dashboard.stripe.com |
| **Vipps Bedrift** | Vipps ePayment (krever org.nr) | portal.vippsmobilepay.com |
| **Resend** | Sender e-postvarsler | resend.com |
| **Vercel Blob** | Lagrer opplastede bilder | Vercel → Storage → Blob → Create |

---

## 2. Miljøvariabler (Vercel → Project → Settings → Environment Variables)

**Legg dem ALDRI i koden/GitHub.** Kun her.

| Variabel | Hvor du finner den |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → din endpoint (`whsec_…`) |
| `VIPPS_BASE` | `https://apitest.vipps.no` (test) → `https://api.vipps.no` (live) |
| `VIPPS_CLIENT_ID` | Vipps portal → Utvikler → API-nøkler |
| `VIPPS_CLIENT_SECRET` | samme sted |
| `VIPPS_SUBSCRIPTION_KEY` | Vipps portal → «Ocp-Apim-Subscription-Key» |
| `VIPPS_MSN` | Merchant Serial Number (6 sifre) |
| `RESEND_API_KEY` | Resend → API Keys (`re_…`) |
| `MAIL_FROM` | f.eks. `StayMotion <hello@staymotion.no>` (domenet må verifiseres i Resend), ev. `onboarding@resend.dev` for test |
| `OWNER_EMAIL` | din e-post som skal få bestillinger + bilder |
| `ORDER_SECRET` | en lang tilfeldig streng (lag én: `openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | settes automatisk når du oppretter Vercel Blob (ellers Storage → Blob → `.env`) |

Etter at variablene er lagt inn: **Redeploy**.

---

## 3. Stripe

1. Test-modus (toggle øverst i Stripe). Kopiér **`sk_test_…`** → `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → **Add endpoint**:
   - URL: `https://<din-preview-url>/api/stripe-webhook`
   - Event: `checkout.session.completed`
   - Kopiér **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
3. Test-kort: `4242 4242 4242 4242`, hvilken som helst framtidig dato + CVC.
4. Når alt funker: bytt til **live**-nøkler (`sk_live_…` + ny webhook-secret).

## 4. Vipps

1. Start i **test** (`VIPPS_BASE=https://apitest.vipps.no`) med testnøklene fra portalen.
2. Test hele flyten (bruk Vipps sin testapp/testbruker).
3. Når du er klar: bytt `VIPPS_BASE` til `https://api.vipps.no` og legg inn **prod**-nøklene.

## 5. Resend (e-post)

1. Lag API-nøkkel → `RESEND_API_KEY`.
2. For test kan `MAIL_FROM=onboarding@resend.dev` brukes.
3. For proff avsender: legg til domenet `staymotion.no` i Resend, sett DNS-postene de gir deg, og bruk `hello@staymotion.no`.

## 6. Vercel Blob

Storage → Blob → **Create store**. `BLOB_READ_WRITE_TOKEN` legges inn automatisk.

---

## 7. Testsjekkliste

- [ ] Åpne preview-URL → `/#priser` → «Bestill Signatur»
- [ ] `/bestill.html` viser riktig pakke + pris (og Express +50 %)
- [ ] «Betal med kort» → Stripe test-kort → havner på `/takk.html` «Betalt»
- [ ] Last opp 2–3 bilder → «Takk, vi er i gang»
- [ ] Du får e-post: (1) ny bestilling, (2) bilder lastet opp
- [ ] Samme test med Vipps

## 8. Gå live

- [ ] Bytt Stripe + Vipps til live-nøkler, `VIPPS_BASE` til prod
- [ ] Verifiser domene i Resend, sett `MAIL_FROM=hello@staymotion.no`
- [ ] Fyll inn **org.nr** i `personvern.html`
- [ ] Merge `claude/booking-system` → produksjonsgrenen
- [ ] Ta en ekte liten testbestilling og refunder den

---

## Merk (GDPR)
Du lagrer kunders bilder = personopplysninger. `personvern.html` dekker det –
husk å fylle inn org.nr og hold slettefristen (90 dager) du lover der.

## Pakker / priser
Endres ett sted: `lib/packages.js` (backend) + `bestill.html` (visning).
Hold dem like.
