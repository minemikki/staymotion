# StayMotion

Cinematiske videoer som selger. Vi gjør eksisterende bilder om til korte,
cinematiske markedsføringsvideoer med AI-video — for eiendom, hytte/Airbnb,
hotell og restaurant. Ingen ny filming.

**Live:** https://staymotion.no · **Kontakt:** hello@staymotion.no

---

## Hva dette repoet er

Én selvstendig statisk side. Ingen backend, ingen build-steg.

```
staymotion/
├── staymotion.html      # hele siden (logo bakt inn som base64), serveres på "/"
├── favicon.svg          # monogram på obsidian (vektor, alle moderne nettlesere)
├── favicon.ico          # rasterfallback for eldre nettlesere
├── apple-touch-icon.png # iOS home-screen ikon (180×180)
├── og.jpg               # delebilde for sosiale medier / iMessage (1200×630)
├── video/               # de cinematiske demo-klippene (.mp4 + .webm)
│   ├── hero.mp4/.webm        (= hytte-klippet, brukt i hero)
│   ├── hytte.mp4/.webm       16:9  – Fjordhytte, Ryfylke
│   ├── eiendom.mp4/.webm     9:16  – Leilighet, Stavanger
│   ├── hotell.mp4/.webm      16:9  – Boutique-hotell, Bergen
│   └── restaurant.mp4/.webm  9:16  – Restaurant, Sandnes
├── netlify.toml         # deploy-config for Netlify
└── vercel.json          # deploy-config for Vercel
```

Videoene er AI-genererte konsept-demoer (merket **DEMO** i UI-en) laget med
Higgsfield. De er ikke ekte eiendommer — behold DEMO-merket til de byttes med
ekte kundevideoer.

## Deploy (auto)

Ren statisk side — ingen build-kommando, publish-mappe = repo-roten.

**Netlify:** New site → Import from Git → velg `minemikki/staymotion` → Deploy.
`netlify.toml` sørger for at siden serveres på `/` (rewrite til `staymotion.html`).

**Vercel:** New Project → Import `minemikki/staymotion` → Deploy.
`vercel.json` gjør det samme.

Etter første deploy bygger siden seg selv på nytt ved hver `git push`.

## Domene (staymotion.no)

1. Legg til `staymotion.no` som custom domain i Netlify/Vercel.
2. Pek DNS hos domeneleverandøren dit hosten oppgir (A/ALIAS for apex +
   CNAME for `www`, eller flytt nameservere til Netlify/Vercel).
3. La hosten utstede gratis HTTPS-sertifikat (Let's Encrypt) automatisk.

## Bytte ut / legge til video

Filnavnene er faste (se `video/` over). For å bytte et demo-klipp med en ekte
kundevideo: legg den nye `.mp4` (+ gjerne `.webm`) med samme filnavn i `video/`,
og fjern `DEMO`-merket i `staymotion.html` for det aktuelle kortet. Anbefalt
komprimering:

```bash
ffmpeg -i inn.mp4 -an -c:v libx264 -crf 27 -preset slow -movflags +faststart video/navn.mp4
ffmpeg -i inn.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 video/navn.webm
```

(Alle klippene er uten lyd — siden spiller dem `muted`.)

## Design

Se `PROJECT.md` for full prosjektbrief, design-DNA og forretnings-guardrails.
Kort: premium nordisk filmstudio-uttrykk. Ikke bygg om identiteten — forbedre.
