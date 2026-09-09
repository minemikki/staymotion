# StayMotion — Pilot Build Report (Phase 2)

Branch: `claude/pilot-build-v1` · Date: 2026-09-08 · Not merged.

## Executive summary

The pilot is a new, isolated Next.js + TypeScript app in `pilot/` that turns the proven demo into something a first
customer can actually use: real data persistence behind a `DataProvider` abstraction, a 5-minute onboarding that creates
an organization, a Capture flow ported to React on top of a server-side `analyzeReport` contract, incident persistence
with confirmation and audit trail, an exception-first manager home with acknowledge/resolve/assign/note, a thin
follow-up engine, and an honest HQ view. It runs end-to-end today in **local/demo mode** without any credentials, and the
same UI runs against Supabase (anon key + RLS) when the two public env vars are present in Vercel.

The proven static demo (`app.html`, `app.css`, `app.js`, `capture-parse.js`) and the night-build report are untouched.
The root Vercel/Netlify static deploy is unaffected: `pilot/` has its own `package.json` and must be deployed as its own
Vercel project (root directory `pilot`).

Models: Fable 5.1 was used for the three UX/product reviews and their fixes; implementation and debugging used the
strongest coding model available in the session. No fallback was needed.

## Architecture created

```
Browser (React, anon key only)                       Server (Next.js route handlers)
┌──────────────────────────────┐                     ┌───────────────────────────────────┐
│ Shell (role → allowed views) │  POST /api/analyze  │ analyzeReport router               │
│ Capture ── speech / photo ───┼────────────────────►│  └ rulesAdapter (demo, local-rules)│
│   └ proposals → register     │                     │  └ future ai-endpoint adapter      │
│ DataProvider                 │                     │ GET/POST /api/followup (cron)      │
│  ├ LocalProvider (localStorage, seeded demo)        │  └ FOLLOWUP_CRON_SECRET + service  │
│  └ SupabaseProvider (anon + RLS, RPCs)              │    role, server-only               │
└──────────────────────────────┘                     └───────────────────────────────────┘
```

- **Domain** (`src/domain`): Organization/Location/Department/Profile/Membership/Task/Incident/IncidentEvent/AuditEvent/
  AIUsage/RoutineTemplate types; routine templates; follow-up engine as pure functions.
- **AI contract** (`src/ai/contract.ts`): `AnalyzeInput → AnalyzeResult { source, provider, model, issues[], warnings,
  usage }`. The rules adapter is the TypeScript port of the proven parser and is labelled `local-rules` everywhere
  (UI shows "demo · regler"). A model-backed adapter plugs into `pickAdapter` without UI changes.
- **Data** (`src/data`): one interface, two providers. Mode resolves from env: Supabase iff
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, overridable with `NEXT_PUBLIC_STAYMOTION_MODE=local`.
- **Session** (`src/session`): demo persona in `sessionStorage` (local mode) or Supabase Auth session; `allowedViews(role)`
  gates routes client-side, RLS enforces server-side in real mode.
- **Follow-up**: `evaluateFollowUp` promotes open incidents past `dueAt` (critical 1h, high 4h, medium 24h, low 72h) to
  `needs_attention` and appends `needs_attention` + `follow_up_sent` events. Local mode runs it on page load; real mode
  runs it from a server cron hitting `/api/followup`.
- **Database**: `supabase/migrations/0002_pilot_foundation.sql` adds columns, tightened RLS, RPCs
  (`create_organization_with_owner`, `invite_member`, `append_incident_note`), an auth trigger that attaches pending
  invitations by email, and a tenant-scoped `incident-photos` storage bucket. `0001_core.sql` is not edited.

## Files / modules added

| area | files |
| --- | --- |
| app config | `pilot/package.json`, `tsconfig.json`, `next.config.ts` (security headers, camera/mic permissions policy), `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `.env.example`, `.gitignore`, `README.md` |
| routes | `app/layout.tsx`, `app/page.tsx`, `app/signin/page.tsx`, `app/onboarding/page.tsx`, `app/employee/page.tsx`, `app/manager/page.tsx`, `app/hq/page.tsx`, `app/api/analyze/route.ts`, `app/api/followup/route.ts`, `app/globals.css` |
| domain | `src/domain/types.ts`, `templates.ts`, `followup.ts` |
| ai | `src/ai/contract.ts`, `rules-adapter.ts`, `router.ts` |
| data | `src/data/provider.ts`, `local-provider.ts`, `supabase-provider.ts`, `index.ts` |
| session / lib / ui | `src/session/session.ts`, `src/lib/speech.ts`, `src/lib/image.ts`, `src/ui/Shell.tsx`, `Capture.tsx`, `Toast.tsx` |
| tests | `tests/unit/rules-adapter.test.ts`, `followup.test.ts`, `local-provider.test.ts`, `tests/e2e/pilot.spec.ts` |
| database | `supabase/migrations/0002_pilot_foundation.sql` |

About 3 200 lines of TypeScript/CSS/SQL, no paid dependencies.

## UX / design decisions (Fable reviews)

**Review 1 — onboarding + employee home.** Seven planned onboarding steps collapsed to five pre-filled screens
(Bedrift, Lokasjon, Avdelinger, Rutiner, Folk); owner name moved to step 1 so the welcome screen is personal; employees
can be skipped ("Fullfør uten å legge til folk"). Employee home is capped at three visible tasks, one dark state card
("Du er klar. Bare to ting før åpning."), one hero voice action and one secondary camera action; "Dine rapporter" only
appears once the employee has reported something.

**Review 2 — capture + success.** Kept the proven two-issue split and the numbered cards. Fixed: when "Registrer begge"
is disabled because a temperature reading is unconfirmed, the footer now says *why* ("Bekreft målingen i sak 2 før du
registrerer") instead of a silent grey button. Photo flow labels itself honestly as demo-assisted ("bildeanalyse er ikke
koblet på ennå"). Success state shows each registered issue with its follow-up target and a calm "StayMotion følger opp
videre" note; "Ny rapport" keeps the employee in flow.

**Review 3 — manager + HQ + consistency.** Manager: "Meldt av Jonas Berg for nå siden" became natural Norwegian
("akkurat nå" / "for 12 min siden"). The empty state ("Ingenting venter på deg.") is deliberately honest rather than
padded with seeded noise. HQ headline no longer reads like a scorecard verdict ("0 av 2 lokasjoner er sunne") and now
names the exception ("Stavanger skiller seg ut." / "Alt er i rute på tvers av lokasjonene."). The health score formula is
disclosed under the list so it never reads as analytics theatre. Verified at 390×844, 375×667 and 1440×900: no horizontal
overflow, sheet footer reachable on the small iPhone, sidebar navigation on desktop.

## What works end-to-end (local mode)

1. Persona sign-in → role-correct home (employee / manager / HQ), role gating on direct URLs.
2. Onboarding creates org + location + departments + starter tasks + pending employee memberships + audit event; owner
   lands on `/manager?welcome=1`; the new org appears on the sign-in screen.
3. Employee completes/reopens tasks; state persists across reload.
4. Capture: live speech (browser SpeechRecognition, nb-NO) or typed fallback → `/api/analyze` → proposals; the proven
   sentence yields two issues (Vedlikehold + Temperaturavvik 1 °C); edit, remove, confirm, register all or one.
5. Compliance-critical issues (temperature, safety) cannot be registered without the explicit checkbox; the provider
   enforces this too, not just the UI.
6. Photo → validated/compressed client-side → attached to the report → coexists with spoken/typed context.
7. Manager sees new incidents immediately, acknowledges/resolves/assigns/adds notes; all persisted and audited.
8. Follow-up promotes overdue incidents to `needs_attention` deterministically; manager sees "Fulgte opp automatisk".
9. HQ aggregates per-location health from real registrations, highlights the outlier with evidence, and "Spør StayMotion"
   answers only from stored data.

## What uses local/demo adapters

- `LocalProvider` (localStorage) is the default data store. Demo tenant: Sabi Sushi (Stavanger + Bergen).
- Persona sign-in is a picker, not authentication, and only exists in local mode.
- `rulesAdapter` is deterministic keyword/number parsing, labelled `local-rules` / "demo · regler" in the UI and in usage
  metadata. It is not a model and is never described as one.
- Photo "analysis" does not exist; the UI says so and uses the photo only as an attachment / equipment fallback.
- Follow-up runs on page load in local mode (server cron in real mode).

## What needs credentials (all set in Vercel, never in the repo)

| var | where | purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | switches to real mode: email OTP sign-in, RLS-scoped data |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | `/api/followup` cron |
| `FOLLOWUP_CRON_SECRET` | server only | authenticates the cron caller (constant-time compare) |
| `AI_EXTRACTION_KEY`, `AI_EXTRACTION_MODEL` | server only | future model-backed analyzer; unused today |

Also needed for real mode: apply both migrations and enable Email OTP in Supabase Auth.

## Tests run + results

| suite | result |
| --- | --- |
| `tsc --noEmit` | clean |
| `next lint` (core-web-vitals + typescript) | no warnings or errors |
| `next build` | success, 11 routes, first-load JS 101–119 kB |
| Vitest | 19/19 passed (rules adapter 7, follow-up 5, local provider 7) |
| Playwright, 22 flows × 3 projects | 59 passed, 7 skipped (viewport-specific tests on other projects), 0 failed, ~75 s |

Playwright covers the 22 critical flows from the brief, with a mocked `SpeechRecognition`, a real file attachment,
console/page-error assertions on every test, and `prefers-reduced-motion`. Mobile projects run in Chromium with iPhone
emulation because WebKit is not installed in the sandbox; real Safari must still be checked by hand (see limitations).

Bugs found and fixed by the tests: (1) a render/effect loop in all three home pages caused by rebuilding the actor object
every render (fixed with `useMemo`); (2) Google Fonts hanging page load in the sandbox (blocked in tests only).

## Security review findings

Reviewed: client/server boundary, anon vs service role, RLS, tenant scoping, upload scoping, XSS, role escalation, demo
vs production auth.

- **OK — no service-role key in browser code.** Only `app/api/followup/route.ts` reads `SUPABASE_SERVICE_ROLE_KEY`; the
  Supabase provider is built with the anon key and relies on RLS. No model-provider key exists client-side; the analyzer
  is server-only.
- **OK — tenant scoping.** RLS in 0002: employees read only incidents they reported; managers read their location;
  inserts require `reported_by = auth.uid()`; updates are manager-only; audit/events are append-only; storage paths are
  `org/<org>/loc/<loc>/<user>/…` with policies checking org membership and the user segment. The local provider mirrors
  these guards so demo behaviour matches (unit-tested).
- **OK — no HTML injection.** Transcripts and notes render as React text; no `dangerouslySetInnerHTML`/`innerHTML`.
  The editable transcript uses `contentEditable` but is read back as `textContent`.
- **OK — role escalation.** `invite_member` refuses granting owner/hq unless the caller is owner/hq. Onboarding RPC binds
  the owner to `auth.uid()`. Client-side view gating is convenience only; RLS is the boundary.
- **Fixed — cron secret comparison** now uses `timingSafeEqual`.
- **Finding (medium, real mode)** `/api/analyze` is unauthenticated and unmetered. It is stateless and cheap today
  (rules only), but before a paid model adapter is enabled it needs the Supabase session token + per-org rate limiting.
  Input size caps exist (2 000 chars, 6 MB image metadata only).
- **Finding (low)** the `context` block sent to `/api/analyze` (org/location/user ids) is taken from the client for
  usage attribution only. When AI usage becomes billable, derive it from the session server-side.
- **Finding (low, by design)** demo persona sign-in is not auth. It is only rendered in local mode; in Supabase mode the
  sign-in page shows email OTP only. Keep `NEXT_PUBLIC_STAYMOTION_MODE` unset in production.
- **Note** `attach_pending_memberships` trusts the invited email; acceptable for an invite-by-manager pilot, but a
  pilot admin should know a typo'd invite email can attach the wrong signer-up.

## Cost / performance

- Zero external paid calls: speech is the browser's own recognizer, parsing is local rules, images are downscaled to
  ≤1600 px JPEG on-device before upload. The router records `AIUsage` (provider, model, chars, ms) for every analysis so
  costs are visible the day a model adapter is switched on.
- Limits: 2 000 chars per report, 30 s audio, 6 MB image, one analysis per submit; no background polling.
- Bundle: 101 kB shared first-load JS, employee page 119 kB. Static prerender for all pages; only the two API routes are
  dynamic.

## Known limitations

- Real Safari not exercised by automated tests (speech, camera, safe-area chrome). The night-build proof on iPhone still
  stands for the static demo; the pilot's Capture uses the same browser APIs but needs Michael's device pass.
- Supabase provider has been type-checked against the migration but not run against a live project (no credentials in
  the sandbox). Expect small mapping fixes on first real run.
- `runFollowUp` in real mode depends on a cron hitting `/api/followup`; no cron is configured yet.
- Photo upload to Storage is prepared (path scheme + policies) but the browser provider currently stores attachment
  metadata; the actual `storage.upload` call is the first thing to wire in real mode.
- Notifications ("Skiftleder får beskjed nå") are in-app only; no SMS/e-mail/push.
- Health score is a simple disclosed heuristic; treat it as a conversation starter, not a KPI.
- ESLint is on but `no-img-element` is disabled for the local blob preview by design.

## Next 7 highest-value tasks

1. Create the Supabase project, apply both migrations, set the two public env vars in Vercel, and run the 22 flows in
   real mode; fix mapping issues.
2. Wire `storage.upload` for incident photos in `SupabaseProvider.registerIncidents` and a signed-URL viewer for managers.
3. Add a Vercel cron (every 15 min) for `/api/followup` with `FOLLOWUP_CRON_SECRET`.
4. Michael's on-device pass on iPhone Safari: speech, camera, safe areas, the two-issue sentence, small-viewport scroll.
5. Real notification to the owner role (e-mail via existing Resend setup) on `needs_attention` and on critical incidents.
6. Authenticate and rate-limit `/api/analyze` with the Supabase session before enabling any model-backed adapter.
7. Employee "Dine rapporter" detail: show status changes and the manager's resolution note back to the reporter.

## Decisions for Michael

None blocking. One worth a yes/no: the HQ health score is shown to managers too (67 for Stavanger). Keep it visible to
location managers, or show it only at HQ level?

## Run instructions

```bash
cd pilot
npm install
npm run dev                       # local/demo mode at http://localhost:3000
npm run check                     # typecheck + unit tests + build
npm run test:e2e                  # Playwright (builds nothing; run `npm run build` first)
```

Preview deploy: create a separate Vercel project pointing at this repo with **Root Directory = `pilot`**, framework
Next.js, no env vars for demo mode. The root static site keeps deploying exactly as before.

---

**READY FOR MICHAEL TEST** (local/demo mode; real Supabase mode needs the env vars in Vercel and a first live run).

---

## Phase 3 continuation — Saksbilde (shared case view) · branch `gpt/phase3-live-supabase`

Not merged. Adds the one piece the operative chain was missing: a **shared, live case view** so a
reporter and a manager can follow a single case end-to-end without calling or scrolling through chat.

### Why this phase
The chain (report → take → forward → resolve), realtime on all three roles, handover, team and
onboarding were already built and working. But `listIncidentEvents` and `addIncidentNote` existed in
both providers and in RLS with **no UI** — the employee saw only a 3-step bar and the manager's note
only rode along with «resolve». That is exactly the product principle *«Ansatt og leder kan følge
status uten å ringe eller lete i meldinger»*, half-built.

### What was built
- `src/ui/CaseSheet.tsx` — one reusable, accessible dialog (focus trap, Escape, restored focus,
  no horizontal overflow, mobile-first). Opened from any incident card (manager, handover) and from
  «Mine rapporter» (the reporter).
  - Full case header (status, severity, measurement, deadline, owner, reporter, transcript, recommended action).
  - **Hendelseslogg**: the real timeline built from `incident_events` + notes — meldt inn → bekreftet →
    tatt av leder → notat → sendt videre → løst — with actor names and timestamps in Norwegian.
  - Manager footer: the actions (Jeg tar den / Send videre / Merk som løst) **and a first-class note
    composer** (`addIncidentNote`). Reporter footer: read-only, sees the whole thread live.
  - Live: subscribes to incident changes and re-reads through the RLS-backed provider.
- Wired into `app/manager/page.tsx`, `app/employee/page.tsx`, `app/handover/page.tsx`
  (clickable case titles / report cards; new test-ids `open-case`, `open-report`, `case-sheet`,
  `case-timeline`, `case-note`, `case-note-send`, `case-ack`, `case-assign`, `case-resolve`).
- CSS appended to `app/globals.css` (case sheet, timeline spine, note bubbles) — same token system,
  no design-system change.
- 2 new e2e tests (manager thread: note → take → resolve grows the timeline each step; reporter opens
  their own case read-only and sees the manager note).

### Honest status
- **Done and tested:** the whole feature in local/demo mode. Typecheck ✓, lint ✓, 26 unit tests ✓,
  production build ✓ (14/14). Playwright **80 passed / 7 skipped** run per project serially
  (desktop 26, iphone-13 27, iphone-se 27). Visual QA at 390 and 1440; no horizontal overflow; actions
  reachable above the mobile tab bar. *(Running all three projects at once with parallel workers
  overloads this sandbox and produces false timeouts — run one `--project` at a time, `--workers=1`.)*
- **Built, depends on environment:** real Supabase mode. Reads (`incident_events`) are already allowed
  for anyone at the location by existing RLS, and notes go through the `append_incident_note` RPC — so
  **no migration or RLS change was needed**. Not yet exercised against a live Supabase project (needs
  the env vars in Vercel and a first live run), same caveat as the rest of the pilot.
- **Deliberately not built now:** employee/reporter *comments* (would require relaxing the manager-only
  guard on notes + a matching RLS migration), assigning a case to a *named person* (today it toggles
  role owner), and model-backed AI extraction (the deterministic rules adapter stays, clearly labelled).
- **Recommended next phase:** two-way case thread (let the reporter comment) with the RLS migration
  that enables it, then assignment to a specific teammate — both build directly on this case view.

**Constraints honoured:** no change to Supabase/auth/RLS/realtime/data model; all existing test-ids and
flows preserved; no fake data or simulated AI in the production path; marketing site and other projects
untouched; not merged and no PR.
