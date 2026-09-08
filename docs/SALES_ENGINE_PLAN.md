# StayMotion Sales Engine — kartlegging, plan og 17-dagers gjennomføring

> Bygget på branch `claude/webdesign-sales-engine-r9znl2` (base: `claude/chat-session-a5k003`).
> Mål: Michael skal få inn **16 000 NOK** i oppstartsbetaling innen **25. september 2026**.
> Dette dokumentet er både kartleggingen (del 1), implementeringsplanen (del 2) og
> den konkrete 17-dagers salgsplanen (del 3).

---

## Del 1 — Kartlegging av eksisterende webdesign-app

Repoet er allerede pivotert fra video-studio til **premium webdesign-studio**
(se `docs/PIVOT_PLAN.md`). Kartlegging av det som finnes fra før:

| Område | Status i dag | Beslutning |
|---|---|---|
| **Hosting / stack** | Statisk HTML + Vercel serverless (`api/*.js`, ESM), ingen byggesteg | **Beholdt.** Alt nytt følger samme mønster. |
| **Lagring** | Vercel Blob. `orders/` (prosjekter), `leads/` (CRM) via `lib/leads.js` | **Beholdt + utvidet.** Salgsdata legges under nytt prefiks `sales/`. |
| **Leads CRM** | `lib/leads.js` + `api/admin-leads.js` + `api/seed-leads.js` (50 video-seed-leads), rendret i `admin.html` → fanen «Leads» | **Beholdt.** Utvidet med nye felter (nettsidekvalitet, mobilproblem, forbedring, prioritet, kontaktstatus, oppfølging, tilbud, betalt). Seed-leadsene er video-tekst → egne webdesign-seed lagt til separat (`api/sales-seed.js`, demo-flagget). |
| **Kundeportal** | `minside.html` / `ordre.html` + signerte tokens (`lib/token.js`) | **Ikke rørt.** |
| **Adminpanel** | `admin.html` (prosjektflyt, ordre, leads) — stort, modent | **Ikke rørt** (unngår regresjon). Salgssystemet ligger i egen adminbeskyttet side `salg.html`. |
| **Ordre / betaling** | Stripe Checkout + PaymentIntent + webhook (`api/checkout.js`, `api/stripe-*`), Vipps (test). Depositum-modell. | **Gjenbrukt.** Tilbud lager betalingslenke til eksisterende `api/checkout.js`. Ingen ny betalingsflyt, ingen faktura. |
| **E-post** | Resend via `lib/email.js` (HTTP, ingen SDK). `api/send-lead-email.js` sender enkel outreach. | **Gjenbrukt + hardnet.** Ny provider-basert, guardet sender med dry-run, suppression, samtykkeregler, dagsgrense, arbeidstid, kill switch, logg. |
| **Pakker / priser** | `lib/packages.js`: Launch 7 900 / Growth 12 900 / Signature 19 900 / Care 1 490/mnd | **Beholdt + utvidet.** Lagt til **Website Sprint 16 000** (50 % oppstart) og **Landing Page Sprint 7 900** (100 % oppstart). MVA konfigurerbar (skjult til status er verifisert). |
| **Offentlig side** | `index.html` (webdesign-posisjonert), `start.html` (7-stegs intake) | **Beholdt.** Ny konverteringsside `sprint.html` (Website Sprint + Landing Page Sprint + gratis nettsidesjekk) ved siden av dagens tjenester. Lenket fra intake, ikke destruktivt. |
| **Vercel-config** | `vercel.json`, `netlify.toml`, `cleanUrls` | **Ikke rørt** for produksjon. Nye funksjoner arver default. |

**Grenser respektert:** `pilot/`, SaaS-branch `gpt/phase3-live-supabase`, Vercel `staymotion-ops`,
Supabase-prosjektene og produksjonsinnstillinger for Vercel `staymotion` er ikke rørt. Ingen
service-role-nøkler i klientkode. Alle hemmeligheter kun i miljøvariabler.

---

## Del 2 — Hva som er bygget (implementeringsplan)

Alt ligger som et sammenhengende, adminbeskyttet **salgsområde** på `/salg.html`, med egne
serverless-funksjoner og et eget lib-lag. Ingenting av det eksisterende er brutt.

### Datalag
- **`lib/sales-store.js`** — Blob-lager under `sales/`: målkonfig (`sales/config.json`),
  suppression-liste (`sales/suppression.json`), sendelogg (`sales/sendlog.json`),
  feillogg, og outreach-sekvenser per lead (`sales/seq/<leadId>.json`). Ingen ekstra persondata.
- **`lib/sales-guard.js`** — all lovlig-utsending-logikk: e-postklassifisering (generell
  bedriftsadresse vs. personlig), samtykkegrunnlag, dedup, dagsgrense, norsk arbeidstid,
  kill switch / pause, suppression-sjekk, unsubscribe-token.
- **`lib/audit.js`** — kort, ærlig nettsideanalyse. Skiller **målt** (HTTP-status, HTTPS,
  responstid, viewport/mobil-meta, tittel/beskrivelse-lengde) fra **AI-vurdering** (skjønn).
  Dikter aldri opp tall — måling som mangler markeres «ikke målt».
- **`lib/messages.js`** — norsk meldingsgenerator for de 8 meldingstypene, basert på
  én konkret observasjon Michael skriver inn. Korte, menneskelige, én handling, tydelig avsender.

### API (alle admin-gated med `ADMIN_KEY`, POST-validering, rate-limit der det trengs)
- `api/sales-config.js` — GET/POST målkonfig + innstillinger (MVA, dagsgrense, dry-run, kill switch).
- `api/sales-metrics.js` — regner resultatmål fra ekte leads + sendelogg.
- `api/sales-audit.js` — kjører nettsideanalyse for en lead (måler offentlig side, uten innlogging).
- `api/sales-message.js` — genererer meldingsutkast for en lead.
- `api/sales-queue.js` — godkjenningskø: list/approve/reject første kontakt + planlagte oppfølginger.
- `api/sales-send.js` — den guardede senderen (dry-run som standard, krever eksplisitt aktivering).
- `api/sales-event.js` — registrerer svar / bounce / klage / avmelding → stopper sekvens + suppression.
- `api/sales-today.js` — «I dag»-arbeidsliste.
- `api/sales-seed.js` — legger inn webdesign-demo-leads (tydelig `demo:true`, separat fra ekte).
- `api/unsubscribe.js` — **offentlig** avmeldingsside (token-basert, ingen innlogging) → suppression.

### UI
- **`salg.html`** — adminbeskyttet salgsområde: Resultatmål · Leads (utvidet CRM) · Nettsideanalyse ·
  Meldingsgenerator · Godkjenningskø · Utsending & sikkerhet · I dag · Tilbud. Tom-/feil-/loading-/
  success-states, mobil + desktop.
- **`sprint.html`** — offentlig konverteringsside (Website Sprint + Landing Page Sprint + gratis
  nettsidesjekk). Premium norsk studio-følelse. Ingen påstander om kunder/resultater vi ikke har.

### Sikkerhet & lovlighet (bygget inn)
- Starter i **dry-run**. Ekte utsending krever `SALES_LIVE=1` **og** at avsenderdomene + SPF/DKIM/DMARC
  er bekreftet i innstillinger. Kill switch og pauseknapp stopper alt umiddelbart.
- Autosend kun til generelle bedriftsadresser (`post@`, `hei@`, `kontakt@`, `booking@`, m.fl.),
  eksisterende kunder, eller dokumentert samtykke. Personlige adresser blokkeres og systemet
  foreslår telefon / kontaktskjema.
- Suppression-liste, stopp ved svar/bounce/klage/avmelding, dedup, dagsgrense 10–15,
  kun norsk arbeidstid, sendelogg + feillogg, ingen åpningssporing, ingen auto-utfylling av skjema.
- Hver e-post: korrekt avsender, StayMotion-identitet, ekte kontaktinfo, tydelig gratis reservasjon,
  fungerende avmeldingslenke.

---

## Del 3 — 17-dagers gjennomføringsplan (8.–25. september 2026)

Arbeidsdager = man–fre. Kjerne hver arbeidsdag: **10–15 kvalitetssikrede generelle bedrifts-e-poster**,
manuelle kontaktskjemaer der adressen er personlig, telefonoppgaver, korte nettsideanalyser,
raske tilbud og oppfølging. Alt måles i `/salg.html`. Fokus: **oppstartsbetaling før fristen.**

| Dag | Dato | Fokus | Konkret mål |
|---|---|---|---|
| 1 | Man 8/9 | **Oppsett** | Verifiser avsenderdomene + SPF/DKIM/DMARC (se Del 4). Legg inn 20 ekte leads (håndverk/klinikk/restaurant i Stavanger). Kjør analyse på topp 10. |
| 2 | Tir 9/9 | **Første bølge** | Godkjenn + send 12 første e-poster til generelle bedriftsadresser. 5 manuelle kontaktskjema. Analyse på 10 nye. |
| 3 | Ons 10/9 | Volum | 12–15 e-poster. 5 kontaktskjema. 3 telefoner til de beste (varme) leadsene. |
| 4 | Tor 11/9 | Volum + oppfølging | 12–15 nye. Oppfølging (dag-3) på bølge fra dag 1. Book første samtaler. |
| 5 | Fre 12/9 | Samtaler + tilbud | Hold 15-min samtaler. Send **første 1–2 tilbud** (Website Sprint 16 000 / Landing 7 900). |
| — | Lør–søn 13–14/9 | Pause utsending | Kun manuell oppfølging på svar. Ingen autosend i helg. |
| 6 | Man 15/9 | Push mot betaling | Følg opp sendte tilbud. Send oppstarts-betalingslenke. **Mål: 1. oppstartsbetaling (8 000).** |
| 7 | Tir 16/9 | Volum + oppfølging | 12–15 nye e-poster. Dag-7-oppfølging på bølge fra dag 1. Flere analyser. |
| 8 | Ons 17/9 | Samtaler | Book + hold samtaler. Send 2–3 nye tilbud. |
| 9 | Tor 18/9 | Push mot betaling | Betalingspåminnelser. **Mål: 2. oppstartsbetaling (8 000) → 16 000 nådd.** |
| 10 | Fre 19/9 | Sikre / buffer | Lukk det som er nær. Ekstra tilbud som buffer hvis en betaling glapp. |
| — | Lør–søn 20–21/9 | Pause | Kun svar-oppfølging. |
| 11 | Man 22/9 | Buffer-push | Følg opp alle åpne tilbud hardt. Nye samtaler ved behov. |
| 12 | Tir 23/9 | Buffer-push | Send betalingslenker på nytt til dem som «skal betale». |
| 13 | Ons 24/9 | Siste push | Ring alle med sendt tilbud som ikke har betalt. |
| 14 | Tor 25/9 | **Frist** | Sikre siste oppstartsbetaling. Rapporter faktisk mottatt vs. 16 000. |

**Prioriteringsregel hele veien:** bruk tid på aktiviteter som kan gi *innbetaling før 25/9*
(varme svar → samtale → tilbud → oppstartsbetaling) foran kald prospektering. Kald prospektering
holder pipeline i gang for tiden etter fristen.

---

## Del 4 — Hva Michael må gjøre (miljøvariabler / DNS / eksterne handlinger)

Se den avsluttende rapporten i sesjonen for eksakt neste-dag-liste. Kort:

1. **DNS (Resend):** verifiser avsenderdomenet `staymotion.no` i Resend og legg inn SPF, DKIM og
   DMARC. Uten dette havner e-post i spam eller avvises. Systemet blokkerer live-sending til
   domenet er markert verifisert i innstillinger.
2. **Miljøvariabler i Vercel (`staymotion`-prosjektet):**
   - `ADMIN_KEY` (finnes) — beskytter `/salg.html` og alle `sales-*`-endepunkter.
   - `RESEND_API_KEY`, `MAIL_FROM` (f.eks. `StayMotion <hei@staymotion.no>`), `OWNER_EMAIL` (finnes).
   - `ORDER_SECRET` (finnes) — brukes også til å signere avmeldings-token.
   - `SALES_LIVE=1` — **settes først når DNS er verifisert.** Uten den er systemet i dry-run.
   - `STRIPE_SECRET_KEY` m.fl. (finnes) — for betalingslenker på tilbud.
3. **MVA-status:** bekreft om StayMotion er MVA-registrert. Til det er avklart vises verken
   «inkl.» eller «eks. mva.» (konfigurerbart i innstillinger).
4. **Ingen** merge til produksjon eller endring av produksjonsinnstillinger uten eksplisitt beskjed.
