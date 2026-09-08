# Night build report — `claude/night-build-fable-ux`

Overnight pass on the StayMotion hospitality operations demo (`app.html`).
Nothing merged. All work is on this branch only.

## What changed

**Structure (was one 58-line file with everything inline)**
- `app.html` — markup only, three role views + capture sheet.
- `app.css` — design system: colour tokens, type scale (12.5–38 px, nothing under 12.5), spacing scale (4–56), radii, three shadow levels, motion timings, focus/pressed/disabled states, safe-area variables.
- `app.js` — behaviour: roles, tasks, manager decisions, HQ "Spør StayMotion", capture sheet.
- `capture-parse.js` — the deterministic report parser, separated and shaped like a future API contract (`parseReport(text, ctx) → { source, transcript, issues[] }`). Clearly labelled as demo rules, not a model. The UI shows a small "demo · regler" tag next to the proposals so nobody mistakes it for production AI.
- `tests/demo-acceptance.cjs` — the acceptance script used tonight (Playwright, mocked SpeechRecognition, real file attach).

**Employee home**
- Answers only "hva nå / er alt ok / hvordan rapportere": shift context, state card ("Du er klar" → "Nesten klar" → "Alt er gjort"), two tasks with 44 px checkboxes, hero `Fortell StayMotion`, secondary `Ta bilde`, handover from Mia.
- Warm off-white surfaces, dark cards only for brand moments. Readable in bright light.

**Capture (the hero experience)**
- Bottom sheet on mobile with drag handle, sticky header, scrolling body (`overscroll-behavior: contain`), sticky footer with safe-area padding. Centered dialog on desktop.
- States: idle → listening (pulsing orb, level bars, live words with interim text greyed) → "StayMotion forstod" with editable transcript → proposals → success.
- One sentence → multiple issues. `Det lekker vann fra fryseboksen og den står på 1 grad.` yields **Vedlikehold / Vannlekkasje oppdaget / Fryseboks / Varsle vedlikehold** and **Temperaturavvik / Temperatur må kontrolleres / Fryseboks / 1 °C / Varsle skiftleder**, exactly the proven iPhone result.
- Each proposal can be edited inline (Hva, utstyr, måling, oppfølging), removed, or registered individually. `Registrer begge` registers the rest.
- Compliance-critical items (temperature, HMS) require an explicit checkbox ("Jeg bekrefter at målingen er lest av på enheten") before registration is enabled.
- Uncertain equipment gets a small "◔ sjekk" marker; nothing else shouts confidence.
- Success keeps context: photo stays (compact), summary rows per registered issue with time, "StayMotion følger opp videre" note, `Ny rapport` / `Ferdig`.
- Typed fallback ("Skriv i stedet") when the microphone is denied or SpeechRecognition is unavailable. The MediaRecorder fallback is kept.

**Photo + voice**
- Photo is attached first, then the user speaks. The photo, transcript and proposals coexist. An amber note states plainly that image analysis is not connected in the demo. "Send bare bildet" produces a single, clearly low-confidence observation rather than a fabricated finding.

**Manager home**
- One calm state card with health ring, "Dette trenger deg" with two decisions that can be taken (buttons → handled state), "Fulgte opp automatisk" list, morning brief, one pattern card with a small sparkline. No dashboard wall.

**Chain / HQ**
- Compact location list with Bergen as the visible outlier, one insight with evidence rows, `Spør StayMotion` with example chips and keyword-matched answers (risk, training, maintenance, cooling, deliveries), three cross-location patterns.

**Mobile chrome / safe areas**
- Sticky top bar with `padding-top: env(safe-area-inset-top)`, so nothing sits under the notch.
- Role switcher and sheet footer use `env(safe-area-inset-bottom)`; sheet height uses `100dvh`.
- Main content padding accounts for the role switcher, so no bottom collision.

**Accessibility**
- 44 px targets, `aria-pressed` on the orb and task checks, `aria-live` on state and answer, Escape closes the sheet, focus returns to the opener, `prefers-reduced-motion` disables all animation and transitions, colour is never the only signal (types carry text labels).

## What was tested

Automated with Playwright (Chromium, iPhone 13 UA, 390×844 and 375×667, plus 1440×900). Speech was mocked by injecting a `SpeechRecognition` stand-in that streams interim then final results, so the real recognition code path ran end to end. Camera used a real file via the hidden input.

| # | Acceptance test | Result |
|---|---|---|
| 1 | Switch to Ansatt, complete a task | Pass (count 2 → 1, state copy updates) |
| 2 | Open `Fortell StayMotion` | Pass |
| 3 | Simple issue → transcript appears | Pass |
| 4–5 | Two-part sentence → two separate issues | Pass (Vedlikehold + Temperaturavvik) |
| 6 | Edit / remove / confirm safely | Pass (edit saved, remove leaves 1, individual register, confirm gated by checkbox) |
| 7 | Camera flow attaches a photo | Pass |
| 8 | Photo coexists with spoken context | Pass (photo + 2 issues, photo in summary) |
| 9 | Manager and HQ at mobile and desktop | Pass (screenshots reviewed) |
| 10 | No content under top chrome, no bottom collision | Pass (role switcher bottom 832 px on 844 viewport, no horizontal overflow) |
| 11 | Long result on small iPhone scrolls | Pass (5 issues, body scrolls inside sheet, footer stays visible) |
| 12 | No console errors | Pass in app code. The only console entries were blocked Google Fonts requests inside the sandbox. |
| 13 | Netlify/Vercel build | No build step; static files only. `vercel.json` `cleanUrls` serves `/app`. Not deployed from the sandbox. |

Extra: typed fallback parses correctly; reduced-motion mode loads and works.

Not tested tonight: real iPhone Safari with a live microphone. The speech code path is unchanged in structure from the version Michael verified, but the sheet layout is new and should be checked on the device once.

## Known limitations

- Parsing is rule-based Norwegian. It handles leak, temperature (with number words and "minus"), broken equipment, deliveries/stock, hygiene, safety, and a generic fallback. It will misread sentences outside those patterns.
- No image analysis. The UI says so.
- Nothing is persisted. Registering an issue updates the UI only.
- Manager and HQ data are static demo content with plausible but invented Sabi Sushi numbers. They are marked as a demo in the product story and should not be shown as real customer data.
- Fonts load from Google Fonts. Offline, the system fallback stack is used.

## Next 5 highest-value tasks

1. Real-device pass on iPhone Safari with live microphone, in a bright kitchen. Check orb size, sheet height with the URL bar expanded, and haptic on register.
2. Wire `parseReport` to a server endpoint that returns the same `issues[]` shape (cheap classification model), keep the local rules as offline fallback. Show `StayMotion AI` instead of `demo · regler` when the endpoint responds.
3. Persist registrations to Supabase `incidents` + `ai_actions` (schema already exists) so the manager view updates from what the employee just registered.
4. Photo understanding: send image + transcript to a vision-capable model and pre-fill equipment/measure; keep the "demo-assistert" honesty pattern until it is reliable.
5. Shift handover capture: 20–30 s of voice → structured handover, reusing the same sheet and proposal cards.

## Decisions that need Michael's approval

- **Confirmation checkbox on temperature/HMS items.** It adds one tap but gives compliance traceability. Keep, or make it a setting per organisation?
- **Employee greeting persona.** Employee view now greets "Jonas" (kjøkkenmedarbeider); manager is "Emma"; HQ is "Henrik". Fine for demo, or should it read the real signed-in user only?
- **Role switcher as a fixed pill.** It is a demo affordance and stays visible on all views. For customer demos it works; for a pilot it should become a proper per-user role.
- **Fonts.** Manrope + DM Sans from Google Fonts. Self-hosting them would remove the external request and the sandbox console noise.
- `tests/demo-acceptance.cjs` depends on `playwright-core` at run time (`npm i -D playwright-core`). Not added to `package.json` to keep the deploy lean. Say if you want it as a dev dependency.
