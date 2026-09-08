# StayMotion Pilot (`pilot/`)

Isolated Next.js (App Router, TypeScript) pilot of StayMotion — *Driften som passer på seg selv*.
The proven static demo in the repository root (`app.html`, `app.js`, `capture-parse.js`) is untouched; this app
re-implements the same voice/photo → proposed issues flow on top of a real data layer so a first customer can use it.

## Run it

```bash
cd pilot
npm install
npm run dev            # http://localhost:3000 — local/demo mode, no credentials needed
```

Without Supabase env vars the app runs in **local mode**: a seeded demo tenant (Sabi Sushi, two locations) is stored in
the browser's `localStorage`, and sign-in is a persona picker (explicitly not authentication).

### Real pilot mode (Supabase)

1. Apply `../supabase/migrations/0001_core.sql` and `0002_pilot_foundation.sql` to a Supabase project.
2. Copy `.env.example` → `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vercel: set
   them in the project's environment variables — never commit them).
3. Sign-in becomes email one-time-code (Supabase Auth). Names and roles come from `memberships`, enforced by RLS.
4. Optional server-only vars: `SUPABASE_SERVICE_ROLE_KEY` + `FOLLOWUP_CRON_SECRET` for the `/api/followup` cron,
   `AI_EXTRACTION_KEY` for a future model-backed analyzer (the rules adapter is used until then).

## Scripts

| command | what |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next.js ESLint config (core-web-vitals + typescript) |
| `npm run test` | Vitest unit tests (rules adapter, follow-up engine, local provider) |
| `npm run test:e2e` | Playwright critical flows at 390×844, 375×667 and 1440×900 (starts `next start` itself) |
| `npm run check` | typecheck + unit tests + production build |

Playwright note: the mobile projects emulate iPhone viewports in Chromium so they run in any CI. Real Safari behaviour
(speech recognition, camera, safe areas) is verified manually on device.

## Where things live

```
app/                 routes: /signin /onboarding /employee /manager /hq, /api/analyze, /api/followup
src/domain/          types, routine templates, follow-up engine (pure functions)
src/ai/              analyzeReport contract, rules adapter (demo), cost-aware router
src/data/            DataProvider interface, LocalProvider (demo), SupabaseProvider (anon key + RLS)
src/session/         demo persona session + role → allowed views
src/lib/             speech (browser SpeechRecognition), image validation/compression
src/ui/              Shell, Capture (the hero flow), Toast
tests/unit, tests/e2e
```
