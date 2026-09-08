# StayMotion — active Claude instructions

You are now working on **Phase 2: pilot foundation**.

Work only on branch:

`claude/pilot-build-v1`

The previous overnight UX pass is complete and preserved on `claude/night-build-fable-ux`.

## Required reading order

1. `STAYMOTION_PRODUCT_SPEC.md`
2. `NIGHT_BUILD_REPORT.md`
3. `CLAUDE_PILOT_MEGA_PROMPT.md`
4. current `app.html`, `app.css`, `app.js`, `capture-parse.js`
5. `supabase/migrations/0001_core.sql`

Then execute `CLAUDE_PILOT_MEGA_PROMPT.md` autonomously from top to bottom.

Use **Fable 5.1** for UX/UI/product-design critique whenever it is actually available, and the strongest coding/reasoning model available for implementation, architecture, Supabase, TypeScript, testing, and security review.

Do not stop after scaffolding. Continue through the full work order and acceptance criteria in the mega prompt.

If credentials are missing, build the safe local/demo adapter and keep going. Do not fabricate credentials and do not ask Michael for ordinary implementation decisions.

Preserve the proven static demo and the working iPhone speech/camera/multi-issue behavior.

Do not merge anything to production or another branch.

Finish by committing all Phase 2 work to `claude/pilot-build-v1` and creating `PILOT_BUILD_REPORT.md` with final status.
