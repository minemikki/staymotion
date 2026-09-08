# StayMotion

**Driften som passer på seg selv.**

StayMotion bygges som et norsk operations-system for hotell, restaurant og servering. Målet er ikke å lage enda et dashboard med sjekklister. StayMotion skal redusere lederarbeid ved å forstå hendelser, følge opp ansvarlige, eskalere unntak og finne mønstre på tvers av lokasjoner.

## Produktretning

- Norsk først
- Flere lokasjoner fra dag én
- Én organisasjon → regioner → lokasjoner → avdelinger → ansatte
- Ansattopplevelse: ekstremt enkel og rask
- Lederopplevelse: rolig, unntaksbasert og handlingsorientert
- Kjede/HQ: mønstre, risiko, sammenligning og automatisk oppfølging
- Tale og kamera brukes som primære innkanaler for raske rapporter
- AI brukes der den fjerner arbeid, ikke som pynt

## Nåværende prototype

| Fil | Rolle |
|---|---|
| `index.html` | Ny StayMotion-forside og produktposisjonering |
| `app.html` | Interaktiv produktdemo med Ansatt, Leder og Kjede/HQ |

## Kjerneflyt

`Ansatt rapporterer → StayMotion forstår → riktig ansvarlig varsles → systemet følger opp → bare uløste unntak eskaleres → mønstre oppdages på tvers av lokasjoner`

## Neste tekniske fase

Prototype skal erstattes/utvides med en ekte applikasjonsarkitektur:

- web: Next.js + TypeScript
- mobil: Expo / React Native
- backend: Supabase (Postgres, Auth, Storage, Realtime, RLS)
- AI: server-side modell-router for tekst, tale, bilde og analyse
- audit trail og rollebaserte rettigheter fra starten

## Viktig

Det gamle webdesign-studioet ligger fortsatt i repo-historikken og enkelte gamle filer ligger foreløpig igjen på denne utviklingsbranchen. De slettes først når den nye StayMotion-retningen er verifisert og klar til å overta produksjon.
