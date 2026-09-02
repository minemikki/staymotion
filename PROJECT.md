# StayMotion — Prosjektbrief

> Skrevet 2. sep 2026. Sammen med `staymotion.html` er dette alt som trengs for
> å ta over prosjektet.

---

## ⚠️ Avvik mellom denne briefen og den leverte HTML-en (les først)

Den faktiske `staymotion.html` i dette repoet er en litt nyere iterasjon enn
seksjon 3–6 under beskriver. Der de er uenige, **er koden fasit.** Konkret:

- **Ingen `img/`-mappe.** Alle «poster»-bilder og hero-fallback er rene
  CSS-gradienter — ingen still-bildefiler trengs.
- **Videoer (5 navn, hver som `.mp4` + `.webm`):** `hero`, `eiendom`, `hytte`,
  `hotell`, `restaurant`. `hero` gjenbruker hytte-klippet. Kilder:
  - `hytte` / `hero` ← Higgsfield-gen `2671d958` (16:9, fjordhytte push-in)
  - `eiendom`        ← `f9557510` (9:16, leilighet Stavanger dolly)
  - `hotell`         ← `e099b4e3` (16:9, hotell push mot vindu)
  - `restaurant`     ← `22c34e69` (9:16, restaurant push-in)
- **Fonter i koden:** Cormorant Garamond (display) + Jost (UI), ikke Instrument.
  (Seksjon 5 under nevner Instrument — koden vant.)
- **Favicon/OG er lagt til:** `favicon.svg` (monogram på obsidian), `favicon.ico`,
  `apple-touch-icon.png`, `og.jpg`, med OG/Twitter-meta i `<head>`.
- **Serveres på `/`** via rewrite i `netlify.toml` / `vercel.json`.

---

## 0. TL;DR — hva som skal gjøres først

1. Opprett repo `staymotion` (samme oppsett som SiamConnect). ✅
2. Legg inn `staymotion.html` (én selvstendig fil, logo base64 inline). ✅
3. Legg media i `video/` (og evt. `img/`). *(video/ — se avvik over)*
4. Bytt CDN-lenker → lokale stier. *(HTML-en bruker allerede lokale stier)*
5. Koble repoet til auto-deploy (Netlify eller Vercel).
6. Koble på domenet `staymotion.no`.
7. Ikke bygg backend, CRM eller SoMe ennå. Se seksjon 8.

## 1. Hva StayMotion er

- **Produkt:** gjør en kundes eksisterende bilder om til korte, cinematiske
  markedsføringsvideoer med AI-video (Higgsfield). Ingen ny filming.
- **Tagline:** «Cinematiske videoer som selger.»
- **Marked:** Norge først, deretter Norden.
- **Målgruppe (beachhead):** hytte-/Airbnb-utleiere og management-selskaper i
  Stavanger / Ryfylke / Preikestolen-området. Deretter eiendom, hotell, restaurant.
- **Forretningsmodell:** kunden sender 6–15 bilder → vi velger de beste → hvert
  bilde blir ett cinematisk shot → settes sammen til én reel (15–40 sek, 9:16 + 16:9).
- **Kjerneløfte:** «Vi forfalsker ingenting.» Rom, møbler, proporsjoner og utsikt
  bevares nøyaktig. AI gir liv, finner ikke opp en falsk eiendom. Etikk +
  salgsvinkel + innafor markedsførings-/eiendomsmeglingsregler.
- **Kontakt:** hello@staymotion.no · **Eier:** Michael (Stavanger).

## 2. Oppdraget

Siden er ferdig designet med ekte demo-innhold. Gjenstår: gjøre den
produksjonsklar og selv-oppdaterende — repo + auto-deploy, media lokalt,
domene + https, favicon + OG.

## 5. Design-DNA — IKKE ødelegg dette

Premium nordisk filmstudio + luksus-hospitality, ikke en «AI/SaaS landingsside».
Behold identiteten; forbedre, ikke bygg om.

- **Palett** (CSS-variabler i `:root`): obsidian, elfenben, sand, gull (sparsomt
  som aksent), slate. Gull aldri overalt.
- **Visuell rytme:** mørk cinematisk hero → varm elfenben-redaksjonell → stort
  før/etter → mørkt utvalgt arbeid → lys prosess/tjenester → mørk avslutning.
  Bakgrunnen glir mykt mellom mørk og lys ved scroll (JS bytter tema per seksjon).
- **Regler:** ingen kort/rammer/tynne skillelinjer der det kan unngås — struktur
  bæres av rom, skala og farge. Ett gjennomgående grep: film-ramme (tynne linjer
  topp/bunn). Bevegelse subtil og bevisst. Én handling på hele siden: «Få et
  gratis eksempel» (mailto til hello@staymotion.no). Ingen skjema/dashboards/innlogging.

## 7. Teknisk som MÅ bevares (ikke regresser)

- **Reveal/anim-systemet:** innhold er synlig som standard; skjul/animasjon
  aktiveres kun når `<html>` får klassen `anim` (satt av et lite inline-script),
  og et sikkerhets-script avslører alt uansett etter innlasting. Hindrer «bare
  tekst vises, video/bilder usynlige» hvis hoved-JS feiler. Ikke gå tilbake til
  å skjule innhold bak scroll-JS uten fallback.
- `prefers-reduced-motion` respekteres (all animasjon av).
- **Mobil-først:** ingen horisontal overflow, touch-mål ≥ 44px.
- **Video:** `muted playsinline loop`, lazy (hover på desktop / i view på mobil),
  poster satt så stillbildet alltid vises.
- **CTA-er:** alle `mailto:hello@staymotion.no` med ferdig emnefelt. Behold ÉN handling.
- Alt i én fil. Greit å splitte CSS/JS senere, men ikke nødvendig.

## 8. Forretnings-guardrails — hold kursen

- **Konseptet er ikke unikt.** Foto→AI-video for eiendom finnes allerede. Kanten
  er IKKE nyhet — den er: lokal, norsk, done-for-you, null læringskurve, spisset
  mot hytte/hospitality. Selg «jeg gjør det ferdig for deg, lokalt».
- **Demoene er porten.** Alt står og faller på om videoene ser premium ut (ikke
  «AI-rare»). Subtile bevegelser (slow push-in, lett parallax) morpher nesten
  aldri; orbit/reveal gjør det. Hold det subtilt.
- **Ikke overbygg.** Ingen CRM/backend/SoMe-strategi/abonnementer før første
  betalende kunde. Statisk side + e-post er nok nå.
- **Realistisk inntekt (solo):** 0 er vanligst de første ukene; 10–25k/mnd deltid
  hvis det funker; 30–60k/mnd med management-/agency-retainere; ~60–90k/mnd er
  solo-taket før pris må heves eller ansettelse.
- **Suksess = fullføre og sende outreach jevnt i 60+ dager**, ikke bytte idé.
- **Outreach (når live):** personlig e-post til navngitt person hos
  hytte-/Airbnb-management i Stavanger-området → lenke til siden → tilbud om
  gratis 5–10 sek preview (kun til de som svarer). 15–20 leads/dag. Sikt mot
  månedsavtaler med management-selskaper (én avtale = mange videoer).

## Priser (holdes diskré — arbeid selger før pris)

1 reel fra 1 990 kr · 3 reels 3 490 kr · månedlig fra 4 990 kr/mnd · agency fra
9 990 kr/mnd. Introtilbud for de første kundene fra 990 kr.

## 9. Neste steg etter live

1. Hent ett ekte kundeobjekt til en demo (bytt ut ett DEMO-kort, fjern merket).
2. Skriv outreach-maler + enkel lead-liste (Google Sheet holder).
3. Send de første 15–20 → følg opp → close første betalende kunde.
4. Mål #1: første fremmede betalende kunde. Ikke jag 50 000 kr med en gang.
