# Skills i dette repoet

Prosjekt-skills legges i `.claude/skills/<navn>/SKILL.md`. De lastes ved
oppstart av en ny Claude Code-sesjon i dette repoet — ikke midt i en sesjon.

## frontend-design

- Kilde: `anthropics/skills`, mappen `skills/frontend-design`
- Kilde-commit: `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`
- Lisens: Apache License 2.0 (`LICENSE.txt` ligger ved siden av `SKILL.md`)

Brukes til nettsidekonsepter og designarbeid: den presser fram et tydelig,
bevisst visuelt uttrykk i stedet for standardmaler.

## webapp-testing

- Kilde: `anthropics/skills`, mappen `skills/webapp-testing`
- Kilde-commit: `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`
- Lisens: Apache License 2.0 (`LICENSE.txt` ligger ved siden av `SKILL.md`)

Strukturert Playwright-verktøykasse for å teste lokale nettsider: skjermbilder,
konsoll-/nettverkslogger og UI-verifisering. Erstatter de ad-hoc-skriptene som
ellers måtte skrives på nytt for hver QA-runde.

## Vurdert og valgt bort

- `canvas-design` — lager statisk PNG/PDF-kunst, ikke nettsider.
- `web-artifacts-builder` — for React/Tailwind-artifacts på claude.ai, feil
  plattform for en Vercel-basert statisk side.
- `theme-factory` — ferdige forhåndssatte temaer/fonter; går imot poenget med
  frontend-design (unngå malbaserte snarveier).
- `brand-guidelines` — Anthropics egne merkevarefarger, irrelevant for
  kundearbeid.

Ved oppdatering: hent mappen på nytt fra `anthropics/skills` og oppdater
kilde-commiten over, slik at det er sporbart hvilken versjon som ligger her.
