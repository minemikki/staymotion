# StayMotion — overnight build brief for Claude / Fable 5.1

You are working on branch `claude/night-build-fable-ux` only.

## Mission
Turn the current StayMotion prototype into a dramatically more premium, psychologically light, mobile-first hospitality operations product demo without breaking the working voice/photo flows.

Use Fable 5.1 as the primary UX/UI/design reasoning model when available. Use a stronger coding model only when needed for implementation/refactoring/debugging. Do not redesign for novelty; optimize for calm, clarity, speed, trust, and “this feels expensive”.

StayMotion is not a prettier checklist app. It should feel like an intelligent operating layer that removes work from employees and managers.

Core promise: **Driften som passer på seg selv.**

Read `STAYMOTION_PRODUCT_SPEC.md` before changing product direction.

## Current proof that must keep working
The current mobile demo already supports:
- real browser speech-to-text on iPhone/Safari where supported
- live words while speaking
- parsing a spoken operational report into type / equipment / measurement / follow-up
- camera/photo capture from iPhone
- employee / manager / chain-HQ views
- a working demo preview through Netlify/Vercel
- confirmed iPhone behavior where one natural spoken sentence is split into two proposed operational issues

Fresh iPhone proof from Michael:
`Det lekker vann fra fryseboksen på kjøkkenet og den står på 1 grad.`

The current prototype correctly produced:
1. `Vannlekkasje oppdaget` → `Vedlikehold` → `Fryseboks` → `Varsle vedlikehold`
2. `Temperatur må kontrolleres` → `Temperaturavvik` → `Fryseboks` → `1 °C` → `Varsle skiftleder`

This exact capability is now a proven product moment. Preserve it and make it feel dramatically better rather than replacing it with a weaker abstraction.

Do not regress these flows.

## Fresh iPhone UX observations from real testing
The latest screenshots reveal several concrete issues to fix during the overnight pass:
- top content/modal headings can sit too close to or partially under mobile browser chrome
- the floating StayMotion header can visually collide with content near the top of the viewport
- bottom role switcher sits close to browser controls and needs safer bottom spacing / safe-area handling
- long capture results need comfortable scroll behavior without feeling like a giant form
- after a successful registration, success feedback should remain visible without hiding important context
- the two-issue result is functionally strong but should feel more elegant, compact and consumer-grade
- preserve readability in bright kitchen environments; do not make the employee flow overly dark

Primary device target tonight: iPhone Safari / in-app browser-sized viewport around 390×844 CSS px, including dynamic browser chrome and safe areas.

## UX doctrine
The employee should need almost no training.
The manager should feel less stressed after opening the product.
The chain owner should see exceptions and patterns, not raw activity.

Avoid:
- generic SaaS card grids
- purple AI gradients
- emoji enterprise UI
- tiny dense text
- “AI everywhere” copy
- excessive charts
- fake metrics that look like analytics theater
- cluttered nav
- dark-on-dark low contrast on employee screens

Prefer:
- warm premium off-white operational surfaces
- deep forest / charcoal brand surfaces
- restrained mint for intelligence / success
- red only for real critical states
- large spacing and strong hierarchy
- subtle motion and tactile feedback
- calm copy in Norwegian
- large touch targets suitable for kitchens / shared tablets / phones
- readable interfaces under bright light

## Build targets for tonight

### 1. Redesign the employee experience first
Make it feel closer to a premium consumer product than enterprise software.

Employee Home should answer only:
- What do I need to do now?
- Is everything okay?
- How do I report something fast?

Keep the page extremely light.

Expected elements:
- greeting + location/shift context
- “Du er klar” / “2 ting før åpning” state
- 1–3 immediate tasks max above the fold
- hero voice action: `Fortell StayMotion`
- secondary camera action
- small handover summary
- bottom/mobile navigation only if it materially improves usability

### 2. Make Capture the hero experience
The voice/photo flow is the product’s first wow moment.

Polish the modal/sheet:
- beautiful recording state
- live transcription
- clear “StayMotion forstod …” transition
- editable transcript
- high-confidence extracted fields
- visible confidence/uncertainty only when useful
- explicit confirmation before compliance-critical registration
- great success state
- robust vertical scrolling on small iPhones
- top and bottom spacing that remains correct under browser chrome and safe areas

### 3. Support one speech report → multiple operational issues
Example:
`Det lekker vann fra fryseboksen, og den står på 1 grad.`

The UI should split this into two proposed items:
1. `Vedlikehold` — leak from freezer — notify maintenance
2. `Temperaturavvik` — freezer at 1 °C — notify shift leader / cooling routine

Use deterministic local parsing for the demo if needed, but structure the code so a future AI endpoint can return an array of extracted incidents.

Important: Do not pretend the current local parser is a production AI model. Keep demo behavior clear internally.

Allow:
- edit each proposed issue
- remove an incorrect issue
- confirm all
- confirm individually if that is cleaner

### 4. Voice + photo together
After a photo is selected, allow the user to also speak about it.
Example:
`Den lekker her, og displayet viser 1 grad.`

The combined report UI should show:
- attached image
- spoken transcript
- extracted proposed issues

Do not claim actual computer vision if no real model endpoint exists. In the prototype, label or implement it as demo-assisted behavior rather than silently faking model inference.

### 5. Manager Home redesign
Manager home should answer: `Hva trenger faktisk meg?`

Show:
- one calm overall state
- only exceptions that need a decision
- what StayMotion handled automatically
- morning / shift brief
- recurring patterns surfaced naturally

Avoid the feeling of a monitoring dashboard.

### 6. Chain / HQ redesign
HQ should answer: `Hvor er risikoen, og hva endrer seg?`

Show:
- compact multi-location health overview
- clear outlier location
- one strong insight with evidence
- `Spør StayMotion` input
- examples of pattern detection across locations

No dashboard wall of charts.

### 7. Design polish
Create a cohesive design system in the current prototype:
- spacing scale
- type hierarchy
- radii
- shadows
- states
- buttons
- cards/sheets
- motion timings
- focus/pressed/disabled states

Mobile Safari is the primary test target. Desktop should still look premium.

### 8. Accessibility / usability sanity
- touch targets around 44px+ where feasible
- readable contrast
- labels are understandable without icons
- no critical meaning communicated only by color
- respect `prefers-reduced-motion`
- safe-area spacing on iPhone
- account for dynamic browser chrome rather than assuming a fixed visual viewport

### 9. Code quality
The current prototype can remain static HTML/CSS/JS tonight; do not force a framework migration just to look sophisticated.

However:
- separate parsing logic cleanly
- avoid duplicated handlers
- preserve working speech flow
- preserve camera flow
- keep the branch deployable
- add comments only where they materially help

Do not introduce external paid dependencies.

## Non-goals tonight
Do not spend the night building:
- full Supabase auth
- production AI billing
- payment system
- exhaustive IK-mat/HMS compliance library
- sensor integrations
- full chat
- generic feature bloat

The goal is a **killer product experience / sales demo**, not broad backend completeness.

## Product language
Norwegian first. Prefer natural operational Norwegian over translated SaaS jargon.

Good examples:
- `Fortell StayMotion`
- `Dette trenger deg`
- `Fulgte opp automatisk`
- `Fra kveldsvakten`
- `Jeg fant to ting i rapporten din`
- `Registrer begge`
- `StayMotion følger opp videre`

Avoid overexplaining AI.

## Acceptance tests before stopping
1. On mobile, switch to `Ansatt` and complete at least one task.
2. Open `Fortell StayMotion`.
3. Say a simple issue and confirm the transcript appears.
4. Say: `Det lekker vann fra fryseboksen og den står på 1 grad.`
5. Verify the UI proposes **two separate issues**.
6. Verify both can be edited/removed/confirmed safely.
7. Open camera flow and attach a photo.
8. Verify the photo can coexist with spoken context in the report flow.
9. Check Manager and Kjede/HQ views at mobile and desktop widths.
10. Verify no top content is hidden under mobile browser chrome and no bottom action/role switcher collides with browser controls.
11. Test a long capture result on a small iPhone viewport and ensure scrolling is smooth and obvious.
12. Ensure no console errors in normal flows.
13. Ensure Netlify/Vercel preview still builds.

## Finish protocol
Work autonomously through the above rather than stopping after one cosmetic pass.

Before finishing:
- run a final UX consistency pass
- fix obvious mobile overflow / safe-area issues
- commit all completed work to `claude/night-build-fable-ux`
- create/update `NIGHT_BUILD_REPORT.md` with:
  - what changed
  - what was tested
  - known limitations
  - next 5 highest-value tasks
  - any decisions that need Michael’s approval

Do NOT merge to production/main.
Do NOT delete the existing working branch/history.
Do NOT change the product into a generic webdesign site again.
