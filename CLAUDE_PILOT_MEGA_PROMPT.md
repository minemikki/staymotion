# StayMotion — Phase 2 Pilot Build Mega Prompt

You are continuing StayMotion after a successful overnight UX pass.

Work **only** on branch `claude/pilot-build-v1`.
Do not merge to production, `main`, the old default branch, `staymotion/operations-v1`, or `claude/night-build-fable-ux`.

## 0. Your role and model routing

Use **Fable 5.1** as the primary UX/UI/product-design critic whenever it is available in this environment. Use the strongest coding/reasoning model available for architecture, TypeScript, Supabase, tests, refactors, debugging, and security-sensitive implementation.

Do not use Fable merely to make things prettier. Ask it to challenge hierarchy, interaction cost, cognitive load, trust, mobile ergonomics, onboarding friction, empty states, and whether each screen feels like a premium consumer product rather than enterprise software.

If Fable 5.1 is not actually available, do not pretend it was used. Continue with the strongest available design/reasoning model and state the fallback in the final build report.

You are allowed to work autonomously for a long session. Do not stop after one cosmetic improvement. Do not ask Michael questions unless a genuinely non-recoverable secret/credential or external decision blocks progress. If credentials are absent, build a safe demo/local adapter and keep going.

## 1. Read before changing code

Read completely:
1. `STAYMOTION_PRODUCT_SPEC.md`
2. `NIGHT_BUILD_REPORT.md`
3. current `app.html`, `app.css`, `app.js`, `capture-parse.js`
4. `supabase/migrations/0001_core.sql`
5. this file

Understand the current product before writing code.

## 2. Product thesis — never lose this

StayMotion is **not** a prettier checklist app.

Core promise:

> **Driften som passer på seg selv.**

The product should remove reminding, chasing, checking, retyping, handover administration, and low-value operational coordination from hospitality managers.

Primary first market:
- restaurant chains
- cafés / bars with multiple locations
- hospitality groups with roughly 3–20 locations first

The employee should feel: **“I just say what happened and move on.”**
The manager should feel: **“I only see what actually needs me.”**
HQ should feel: **“I can see where risk is forming before it becomes a bigger problem.”**

## 3. What already works — protect it

The previous build proved these flows and they must not regress:
- real browser speech-to-text on iPhone/Safari where supported
- live transcript while speaking
- typed fallback
- camera/file capture
- one natural sentence → multiple proposed operational issues
- example: `Det lekker vann fra fryseboksen og den står på 1 grad.` → leak + temperature as two issues
- edit/remove/register proposed issues
- compliance confirmation on temperature/HMS
- photo + spoken context in the same capture flow
- Manager and Chain/HQ views
- mobile safe areas / dynamic viewport handling
- acceptance tests using Playwright

Treat the current Capture UX as a proven product moment. Improve architecture around it; do not replace it with a worse generic form.

## 4. Decisions already made — do not ask again

1. **Temperature/HMS confirmation:** keep explicit confirmation for compliance-critical items. Architect it so it can become organization-configurable later.
2. **Demo personas:** demo can use Jonas/Emma/Henrik or similar. Real pilot UI must derive the name/role from the signed-in user/session.
3. **Role switcher:** keep only in demo mode. Real pilot users should see only views permitted by membership/role.
4. **Fonts:** Google Fonts may remain for now with robust system fallbacks. Do not spend the night self-hosting fonts.
5. **Playwright:** add it as a dev dependency in the new pilot workspace/app where appropriate. Keep production bundle clean.
6. **Pricing:** do not build artificial per-seat restrictions. Product direction is per-location pricing with many/unlimited employees; cost controls belong in backend usage guardrails, not employee friction.

## 5. Mission for Phase 2

Turn the killer demo into the **first credible pilot product foundation** without destroying the working demo.

By the end of the session, we want a product that can be shown as more than a prototype:
- a real application shell exists
- organization/location/user/role concepts are real in code
- registrations can persist through a repository/data layer
- employee report → manager visibility is connected
- onboarding exists in a usable first form
- the design system remains premium and psychologically light
- the app can run without paid AI credentials using a clearly labelled local/demo adapter
- the architecture makes it straightforward to connect real Supabase + AI later

Do not attempt to finish every feature in the company roadmap tonight.

## 6. Architecture strategy

### Preserve the proven static demo
Do **not** delete `app.html`, `app.css`, `app.js`, or `capture-parse.js`.
They are a working sales demo and fallback reference.

### Create a real pilot app in an isolated workspace
Prefer a structure like:

`pilot/`
- Next.js (App Router)
- TypeScript
- React
- minimal dependencies
- CSS/design tokens derived from the proven StayMotion design system

If the repository structure makes another isolated directory clearly safer, choose it and document why.

Do not rewrite the entire root repo just to make it fashionable.
Do not break the existing Vercel static preview.

### Backend target
Supabase:
- Postgres
- Auth
- Storage
- Realtime where useful
- RLS

The migration already exists. Review it critically before relying on it.

### Missing-credentials rule
If Supabase credentials are not present:
- do not stop
- do not fabricate credentials
- implement a clean provider/repository abstraction
- run the pilot in `demo/local` mode with deterministic seeded data and persistence via an appropriate local adapter
- provide `.env.example`
- make switching to real Supabase explicit and small

The UI must clearly distinguish real persistence vs demo/local mode internally; user-facing copy should remain elegant.

## 7. Data model and tenancy

Keep the hierarchy:

`Organization → Region → Location → Department → Employee`

Core roles:
- owner / HQ
- regional manager
- location manager
- shift leader
- employee

Review `0001_core.sql` for:
- tenant isolation
- membership scoping
- role permissions
- auditability
- whether incidents/tasks can be safely queried by employee/location/HQ

Do not weaken RLS simply to make development easier.
Never use service-role credentials in browser code.
Never expose model-provider keys to clients.

If schema changes are needed, create a new migration rather than silently editing historical migration intent unless there is a compelling reason. Document any migration decision.

## 8. Pilot flows to build

### A. Sign-in / session shell
Build a polished, minimal sign-in experience appropriate for hospitality staff.

For real Supabase mode:
- support a simple email-based login path or equivalent Supabase auth flow
- maintain secure session handling

For demo/local mode:
- provide a clearly isolated demo sign-in / persona selector that does not pretend to be real auth

Do not force employees through enterprise-style complexity.

### B. Organization onboarding
Create a first-run onboarding flow for an owner/admin.

Goal: a customer should not start from an empty enterprise database screen.

Recommended sequence:
1. Bedriftsnavn
2. First location
3. Type of business: restaurant / café / bar / hotel (restaurant-first content)
4. Departments relevant to the location
5. Invite/add a few employees OR skip for now
6. Choose starter routines/templates
7. Finish → manager home

UX principles:
- 5 minutes or less
- progress is obvious but not bureaucratic
- allow skip where safe
- no huge forms
- sensible defaults
- Norwegian copy

Create starter template data for a restaurant pilot, e.g.:
- opening routine
- closing routine
- temperature check
- cleaning/hygiene check
- delivery discrepancy
- equipment/maintenance report

Do not claim these templates satisfy every legal/compliance requirement. They are operational starters, not legal certification.

### C. Employee home — real data
Rebuild/port the proven employee experience inside the pilot app.

It should answer only:
- what do I need to do now?
- is everything okay?
- how do I report something quickly?

Show max 1–3 immediate items above the fold.
Use real repository/provider data rather than hard-coded DOM strings.

Completing a task should persist via the data layer and update state immediately.

### D. Capture — preserve wow, improve contract
Port the Capture flow into reusable React/TypeScript components.

Keep:
- live speech where browser supports it
- typed fallback
- photo attachment
- one report → multiple issues
- edit/remove/confirm
- compliance confirmation
- success state

Create an interface such as:

`analyzeReport(input) -> { source, transcript, issues[], warnings?, usage? }`

Where each issue has stable typed fields, e.g.:
- id/client key
- category/type
- title
- equipment/asset
- location/department context
- measurement
- unit
- severity
- requires_confirmation
- suggested_owner_role
- suggested_action
- confidence/uncertainty only if useful

The current deterministic `capture-parse.js` becomes the demo/local adapter or is ported into it.

Do not claim it is production AI.

### E. Persistence — employee → manager loop
This is the most important functional milestone after Capture.

When an employee registers issue(s):
- create incident record(s) through the repository/provider layer
- capture who reported it
- location + department
- timestamp
- original transcript
- attachment metadata where available
- extracted fields
- confirmation status where required
- source (`voice`, `typed`, `photo+voice`, etc.)
- audit event

Then Manager Home must read from the same data source.

A manager should be able to see the newly registered incident without editing static demo data.

In demo/local mode, this can be same-browser persistence, but the architecture must mirror future backend calls.

### F. Manager Home — exception-first
Port the night-build manager design into real data/state.

Question: **Hva trenger faktisk meg?**

Prioritize:
- unresolved critical/repeated incidents
- decisions needing manager confirmation
- overdue tasks/follow-ups
- what StayMotion already handled
- compact morning/shift brief

Avoid:
- dashboard wall
- vanity analytics
- 20 cards

Actions should work:
- acknowledge
- assign/route where supported
- resolve/close where appropriate
- add short note

Persist actions through data provider and audit them.

### G. Automatic follow-up engine — first thin slice
Do not build a huge workflow engine tonight.
Build a narrow, testable first version.

Example behavior:
- new incident gets owner role + due time
- if unresolved past due, status becomes `needs_attention`
- manager sees it promoted
- a follow-up event is logged

In local/demo mode, simulate time/follow-up deterministically.
In real mode, design it so a scheduled server job/cron can later perform the check.

Keep logic server-friendly and separate from UI.

### H. HQ / Chain — real aggregation shape
Port the HQ experience to provider-driven data.

Need:
- location health summary
- visible outlier
- incident recurrence counts
- training/task gap placeholder only if data exists
- one evidence-backed operational insight

If data is too thin, show honest empty states. Do not invent analytics theater in the real pilot view.

Keep the richer static sales-demo content in the original demo if useful.

### I. Onboarding employees
Build the data model/UI for adding staff with:
- name
- email optional depending on chosen auth path
- role
- location
- department
- preferred language placeholder

Do not build expensive SMS infrastructure tonight.

Prepare for future shared-tablet login, but do not implement insecure PIN auth casually. If you prototype it, label it demo-only and document production security requirements.

## 9. AI architecture — cost-aware from day one

Michael explicitly cares about keeping operating costs low.

Build a small server-side AI abstraction, even if it only uses local rules tonight.

Design for routing:
- cheap model: extraction/classification/translation
- speech transcription service where needed
- vision only when image is actually attached and analysis is requested
- stronger model only for cross-location reasoning or ambiguous cases

Never call an expensive model behind every click.

Create a simple usage metadata shape/logging concept:
- provider/model
- action type
- input modality
- latency
- token/audio/image units if known
- estimated cost if known
- fallback used

This can land in `ai_actions` later.

Implement hard safety assumptions:
- rate-limit-friendly endpoint design
- file size limits
- image compression plan/documentation
- short voice clips by default
- no always-listening microphone
- no provider key in client

Do not implement fake billing numbers.

## 10. Photo handling

For pilot architecture:
- validate file type/size
- preview locally
- create abstraction for upload/storage
- in demo mode use object URL/local metadata
- in Supabase mode prepare Storage upload path scoped by organization/location/user

Do not silently perform fake vision.

If no real vision model is configured, retain the honest note from the night build.

## 11. Audit and trust

Every meaningful operational mutation should be designed to emit an audit event:
- task completed/reopened
- incident created
- incident edited
- confirmation accepted
- assignment changed
- incident resolved
- AI suggestion accepted/changed/removed where practical

The app should distinguish:
- what employee said
- what StayMotion suggested
- what employee/manager confirmed

This is important for compliance and trust.

## 12. UX direction — Fable 5.1 must review this continuously

The pilot must retain the brand character:
- warm premium off-white operational surfaces
- deep forest/charcoal brand moments
- restrained mint for success/intelligence
- amber for caution
- red only for genuine critical states
- large whitespace
- obvious hierarchy
- comfortable under bright kitchen lighting
- large touch targets
- not visually noisy

Employee UI should feel closer to a premium consumer product than enterprise software.
Manager UI should feel calm and capable, not like surveillance.
HQ should feel concise and intelligent, not a BI dashboard.

No:
- purple AI gradients
- generic shadcn-looking dashboard by default
- 12 equal cards
- excessive pills/badges
- icon-only critical controls
- tiny table-heavy layouts on mobile
- fake futurism
- giant AI sparkle branding

Use Fable to run at least three explicit design reviews during the build:
1. onboarding + employee
2. capture + success
3. manager + HQ

After each review, implement meaningful improvements, not just write comments.

## 13. Mobile and shared-device ergonomics

Primary target: iPhone Safari around 390×844 plus smaller 375×667.
Also support manager desktop around 1440×900.

Requirements:
- safe-area top/bottom
- dynamic viewport units
- no action hidden behind Safari chrome
- capture sheet scrolls internally
- sticky CTA remains reachable
- 44px+ touch targets where practical
- no horizontal overflow
- keyboard opening does not destroy layout
- camera/speech failure states recover cleanly

Consider shared tablet use in component sizing and session UX, but do not compromise phone experience.

## 14. Demo mode vs pilot mode

We need both concepts without confusion.

### Existing static demo
Keep it intact as the high-impact sales demo.

### New pilot app
Should have a controlled demo/local mode when no backend env exists.
Use a small internal indicator only where useful for developers/testers.
Do not cover the UI in “mock” labels.

Static invented Sabi Sushi metrics must not be presented as real customer data in the real pilot mode.

## 15. Testing requirements

Set up real test commands for the pilot workspace.

At minimum:
- TypeScript check
- lint if configured
- parser/analyzer unit tests
- repository/provider tests where feasible
- Playwright critical path

Critical Playwright flows:
1. demo/local sign-in
2. admin onboarding creates organization + location
3. add employee or use seeded employee
4. employee sees assigned task
5. complete task → persists after refresh in local mode
6. open Capture
7. typed report creates one issue
8. two-part report creates two issues
9. remove/edit one proposal
10. compliance item requires confirmation
11. register issues
12. switch/sign in as manager
13. manager sees the incident(s) created by employee
14. manager acknowledges/resolves one
15. refresh → state remains
16. HQ view aggregates location state
17. photo + voice/typed context remains attached in capture flow
18. mobile 390×844 no overflow
19. mobile 375×667 capture sheet usable
20. desktop 1440×900 manager/HQ usable
21. no console errors in normal flow
22. reduced-motion mode works

If real speech cannot be tested in CI, mock SpeechRecognition as before while keeping the real browser code path.

## 16. Security sanity review

Before finishing, perform a focused security review:
- client/server boundary
- Supabase anon vs service-role usage
- RLS assumptions
- tenant IDs never trusted solely from client input
- upload path scoping
- XSS from transcript/user-entered notes
- unsafe HTML rendering
- role escalation
- demo mode cannot accidentally become production auth

Write findings/fixes in the report.

## 17. Performance / cost sanity

Do not bloat the app.
- avoid huge UI libraries unless clearly justified
- lazy-load heavy capture/photo dependencies where useful
- compress images before upload plan
- no background polling every few seconds
- use realtime only where it gives real value
- no AI call on page load unless necessary

Document expected cost drivers, not invented exact costs.

## 18. What NOT to build tonight

Do not spend the session on:
- payment/Stripe/Vipps
- full chat product
- full LMS/training platform
- every IK-mat/HMS template
- full legal compliance certification
- sensor integrations
- payroll
- scheduling system replacement
- advanced BI charts
- native Expo app
- marketing automation
- enterprise SSO
- complex notification provider integration

Leave clean extension points instead.

## 19. Definition of done

The session is successful if:

1. The proven sales demo still works.
2. A separate real pilot app foundation exists.
3. It runs without external credentials in demo/local mode.
4. Organization/location/role/user concepts exist in typed code.
5. Onboarding can create a first organization/location in local mode.
6. Employee tasks come from a data provider, not hard-coded markup.
7. Capture is ported and still supports multi-issue extraction.
8. Registered issues persist through the data layer.
9. Manager sees what employee created.
10. Manager actions persist and audit.
11. HQ reads aggregated provider data.
12. Supabase integration path is prepared without leaking secrets.
13. AI adapter is cost-aware and server-oriented.
14. Tests cover the employee → incident → manager loop.
15. Mobile UX remains premium and stable.
16. No production branch was merged or destroyed.

## 20. Autonomous work order

Use this order unless repository reality strongly justifies another:

1. Audit current repo + migration
2. Fable design review #1: onboarding/employee architecture
3. Scaffold isolated pilot app
4. Design tokens/components
5. data-provider interfaces + local/demo persistence
6. auth/session/demo persona shell
7. onboarding
8. employee tasks/home
9. port Capture + parser contract
10. incident persistence
11. manager exception view from same data
12. first follow-up logic
13. HQ aggregation
14. Fable design review #2: Capture
15. mobile polish
16. Supabase adapter + env docs
17. AI adapter + cost/usage metadata
18. audit event coverage
19. tests
20. Fable design review #3: manager/HQ/full consistency
21. security review
22. final test run
23. final report

Do not stop after scaffolding.

## 21. If blocked

If a credential is missing:
- implement local adapter
- document exact env vars needed
- continue everything else

If a dependency fails:
- choose the smallest stable alternative
- document it
- continue

If a design decision is ambiguous:
- favor lower cognitive load, fewer taps, clearer trust boundaries, and restaurant-first practicality
- note the decision in the report
- continue

Do not wake Michael for ordinary implementation choices.

## 22. Finish protocol

Before finishing:
- run all available checks/tests
- inspect mobile screenshots at 390×844 and 375×667
- inspect desktop at 1440×900
- verify the old static demo still loads
- verify no production merge occurred
- commit all work to `claude/pilot-build-v1`

Create `PILOT_BUILD_REPORT.md` containing:
- executive summary
- architecture created
- files/modules added
- UX/design decisions from Fable
- what works end-to-end
- what uses local/demo adapters
- what needs credentials
- tests run + results
- security review findings
- cost/performance considerations
- known limitations
- exact next 7 highest-value tasks
- decisions Michael must make, only if truly necessary
- preview/local run instructions

End the report with a simple status:
- `READY FOR MICHAEL TEST`
- `PARTIALLY READY — <reason>`
- or `BLOCKED — <reason>`

Do **not** merge.
Do **not** delete the proven demo.
Do **not** turn StayMotion into a generic dashboard.
Build the first credible pilot foundation while keeping the product emotionally simple.
