# StayMotion Sales Engine V2

Branch: `gpt/sales-engine-v2`

## Mål

Gjør 10–30 kalde leads per dag til kvalitetssikrede, personlige outreach-sekvenser uten at Michael må skrive hver e-post for hånd.

Flyt:

1. Legg inn eller importer leads.
2. Kjør offentlig nettsideresearch i batch.
3. Systemet lagrer kun målbare/verifiserbare signaler fra nettstedet.
4. Lead får HOT/WARM/COLD-score.
5. V2 lager individuell første e-post + to oppfølginger.
6. Michael kan redigere, kopiere eller legge sekvensen i godkjenningskø.
7. Godkjent sekvens kan sendes gjennom eksisterende Resend-motor.
8. Reply/bounce/complaint/avmelding stopper videre sekvens gjennom eksisterende event/suppression-logikk.

## Nye filer

- `salg-v2.html` — nytt command center.
- `lib/sales-research-v2.js` — crawler noen få offentlige sider og lager evidence-based opportunities.
- `lib/sales-copy-v2.js` — personlig norsk salgstekst basert på lagret research.
- `api/sales-research-v2.js` — research + lagring på lead.
- `api/sales-draft-v2.js` — genererer og lagrer salgsutkast.
- `api/sales-cron.js` — sikkert scheduler-entrypoint som delegerer til eksisterende guarded sender.

## Endrede filer

- `api/sales-queue.js` — støtter V2-utkast, tre-stegs sekvens og godkjenning av hele sekvensen.
- `lib/sales-guard.js` — rettet konservativ adresseklassifisering: navngitte jobb-adresser blokkeres fra automatisk kald utsending uten dokumentert samtykke/eksisterende kundeforhold. Generelle firmaposter kan fortsatt kvalifisere.

## Research-prinsipp

V2 finner ikke på Google-data, omsetning, anmeldelser, rangering eller kundetall. Den automatiske crawleren leser kun offentlig HTML fra nettstedet og kan blant annet bekrefte:

- title/meta/H1
- lokalitetsord i nettstedet
- kontaktskjema/telefonlenker
- prosjekt-/referanseinnhold
- omtale-/review-signaler på nettstedet
- CTA/befaring/booking-signaler
- JSON-LD/schema
- viewport/mobilgrunnlag
- plattformindikasjon
- et lite utvalg interne tjenester/prosjekt/kontakt-sider

Ekstern research som Google Business Profile, omsetning og konkurrentsammenligning må fortsatt legges inn som verifiserte manuelle notater eller via en fremtidig datakilde. Det er med vilje: systemet skal heller være litt mindre «smart» enn å sende en feil påstand til en kunde.

## Utsending

Eksisterende guarded sender er beholdt. Live sending krever fortsatt:

- `ADMIN_KEY`
- `RESEND_API_KEY`
- `MAIL_FROM`
- `OWNER_EMAIL`
- `ORDER_SECRET`
- `SALES_LIVE=1`
- `domainVerified=true` i sales config
- `dryRun=false`

Anbefalt i oppstart: 10–15 per dag. Når bounce/reply-rate ser bra ut kan dagsgrensen settes til 20–30 fra V2-panelet.

## Automatisk scheduler

`/api/sales-cron` kan trigges av Vercel Cron eller annen betrodd scheduler. Sett `CRON_SECRET`. Endpointet krever `Authorization: Bearer <CRON_SECRET>` og kaller eksisterende `/api/sales-send` med `run-due`, så alle guardrails sjekkes på nytt ved faktisk utsending.

Cron er ikke lagt inn i `vercel.json` ennå, fordi frekvens bør velges ut fra Vercel-plan og ønsket spredning. Produksjon skal ikke aktiveres før senderdomene og dry-run er verifisert.

## UI

Åpne `/salg-v2.html` på branch/preview deployment. Samme `ADMIN_KEY` som dagens `/salg.html`.

V2 har:

- lead-søk/filter
- CSV-import
- legg til lead
- velg topp 30
- batch research + mail
- HOT/WARM/COLD
- research evidence
- personlig e-postutkast
- redigering/kopiering
- godkjenningskø
- autosend-eligibility per adresse
- godkjenn/avvis/stopp sekvens
- dagsgrense 15/20/30
- arbeidstid
- dry-run/pause/domain status
- manuell `run-due`

## Ikke gjort med vilje

- Ingen merge til produksjon.
- Ingen live sending aktivert.
- Ingen DNS/Vercel-env endret.
- Ingen automatisk Google Business Profile scraping.
- Ingen OpenAI/Anthropic API-avhengighet.
- Ingen automatisk utfylling av kontaktskjema.

Neste trinn etter preview-test er å koble Resend-oppsett, sette cron-frekvens og eventuelt legge til en ekstern research-provider for offentlig Google-/bedriftsdata.
