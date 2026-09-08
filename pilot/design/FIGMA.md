# StayMotion i Figma

Fil: **StayMotion — Design System & Product**
`https://www.figma.com/design/lqc8D1fhqI0lH6QvHSfXeE` (team «Michael Byberg's team», plan `team::1333412885092576324`)

Alt i filen er generert fra koden i `pilot/` via Figma MCP (`use_figma`). Kilden er `app/globals.css`
og komponentene i `src/ui/`. Når koden endres, oppdateres Figma fra koden, ikke omvendt, med mindre en
designendring er gjort bevisst i Figma og deretter implementert tilbake.

## Struktur

Starter-planen tillater tre sider, så de sju områdene ligger som seksjoner:

| Side | Seksjoner |
| --- | --- |
| StayMotion Design System | Button, Pill, Chip / Location, Pulse, Task Row, Report Row (+ variabler og stiler) |
| Employee · Manager · HQ | Employee (ferdig), Manager (påbegynt), HQ |
| Capture Flow · Mobile · Motion States | Capture Flow, Mobile, Motion States |

## Variabler (98) og stiler

| Samling | Innhold | Kilde i CSS |
| --- | --- | --- |
| Primitives (35, skjult) | `neutral/*`, `cobalt/*`, `coral/*`, `mint/*`, `violet/*`, `sun/*`, `red/*` | `:root` hex-verdier |
| Color (35, semantisk) | `bg/*`, `text/*`, `border/*`, `action/*` (kobolt), `report/*` (korall), `success/*` (mint), `insight/*` (fiolett), `deadline/*` (gul), `critical/*` (rød) | alias til primitives, kodesyntaks `var(--…)` |
| Layout (17) | `spacing/1–9`, `radius/1–5`, `size/topbar`, `size/tabbar`, `size/tap-target` | `--s-*`, `--r-*`, `--topbar`, `--tabbar`, `--tap` |
| Typography (11) | `font-size/0–8`, `font-family/display`, `font-family/body` | `--fs-*`, `--display`, `--body` |

Effektstiler: `Shadow/1 · card`, `Shadow/2 · raised`, `Shadow/3 · floating`, `Shadow/action (cobalt)`,
`Shadow/report (coral)` = `--sh-1…3`, `--sh-cobalt`, `--sh-coral`.

Tekststiler: `Display/Hero`, `Heading/XL–S`, `Numeric/XL`, `Body/L–S`, `Label/L–S`, `Eyebrow`
(Manrope ExtraBold/Bold for display, DM Sans Regular/Bold for body og labels).

Alle semantiske variabler har scopes og WEB-kodesyntaks satt til den ekte CSS-variabelen, så Dev Mode
viser `var(--cobalt)` og ikke en hex.

## Komponenter ↔ kode

| Figma-komponent | Varianter / egenskaper | Kode |
| --- | --- | --- |
| Button | Style = Primary / Report / Ghost / Soft × Size = M / S · `Label` | `.btn`, `.btn.coral`, `.btn.ghost`, `.btn.soft`, `.btn.sm` i `app/globals.css` |
| Pill | Tone = Neutral / Ok / Warn / Bad / Info / Ai · `Label` | `.pill`, `.pill.ok/.warn/.bad/.info/.ai` |
| Chip / Location | `Label` | `.chip.live` (`app/employee/page.tsx`) |
| Pulse | State = Idle / Listening / Analyzing / Confirm / Sent / Critical | `src/ui/Pulse.tsx`, `.pulse-*` |
| Task Row | State = Current / Next / Done · `Title`, `Sub` | `.tl-item`, `.tl-card` (`app/employee/page.tsx`) |
| Report Row | Step = Sendt / Sett / Løst · `Title`, `Sub` | `.rep`, `.stepper` (`app/employee/page.tsx`) |

Skjermen «Employee / I dag — iPhone 13 (390 × full scroll)» er satt sammen av instanser av disse
komponentene pluss rapportkortet, toppbaren og tab-baren, med samme tekst som appen viser i lokal modus.

Code Connect (kobling fra Figma-komponent til kildefil i Dev Mode) krever Organization-plan og er
ikke satt opp. Tabellen over er den manuelle koblingen inntil videre.

## Plangrenser som stoppet arbeidet

- Starter-planen gir 20 MCP-kall per måned. De er brukt opp på fundament, komponenter og Employee-skjermen.
- Starter-planen gir maks 3 sider. Derfor seksjoner i stedet for sju sider.
- Code Connect krever Organization.

Professional med Full-sete gir 200 kall per dag og ubegrenset antall sider. Da kan seksjonene løftes til
egne sider og resten bygges ferdig.

## Gjenoppta

Tilstandsfilen med alle node-ID-er ligger i Claude-øktens scratchpad (`design-system-state.json`).
Neste steg i rekkefølge:

1. Sjekk om «Dette trenger deg» ble delvis opprettet under Manager-innholdet (node `16:77`) og fjern
   halvbygde rester.
2. Manager: to saker, «Følges opp», «Innsikt», tab bar.
3. HQ-seksjon på samme side.
4. Capture Flow: Record, Listening, Review (to saker), Success.
5. Mobile: 375×667-varianter av Employee og Capture Review.
6. Motion States: Pulse ×6 med tidsregler (trykk 140 ms, tilstand 300 ms, spring `cubic-bezier(.34,1.4,.64,1)`).
7. Design System-siden: fargeprøver, typespesimen, spacing/radius/skygger.
8. Designforbedringer gjort i Figma implementeres tilbake i `pilot/` og verifiseres med typecheck,
   tester, produksjonsbygg og skjermbilder.
