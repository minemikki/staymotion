# StayMotion — Signature Flythrough (LÅST oppskrift)

> Den "hemmelige nøkkelen": **to bilder i Kling samtidig** — start-frame + slutt-frame.
> Da tvinges kameraet til én kontrollert, jevn bevegelse *mellom to rom*. Begge
> endene er låst til ekte bilder, så resultatet ser filmet ut — ikke animert.
> Klippene kjedes sammen (rom N slutter der rom N+1 starter) til én sømløs reel.

## Kjerneprinsipp
- Modell: **kling3_0** (start_image + end_image). Alternativ for interiør: seedance_2_0.
- Ett klipp = én overgang mellom to nabobilder. Aldri mer enn én bevegelse per klipp.
- Kamera holder seg **innenfor** det som faktisk finnes i bildene. Aldri generer rom,
  terrasse, basseng e.l. som ikke finnes på kundens bilder (sannhet 100 %).
- Lyd av. 9:16. Jevn, stabil kamerabevegelse.

## Rekkefølge (vår versjon: ute → inn → gjennom → ut igjen)
Ute → inngang/stue → kjøkken → spisestue/trapp → kjøkken nært → tilbake stue →
overdekket uteplass → bakhage → aerial. Tilpass antall etter hvor mange rom
kunden faktisk har sendt.

## Overgangs-prompt (mal — bytt kun siste setning per klipp)
```
In one smooth motion, seamlessly blend the start frame to the end frame.
Make the camera stable and make the transition smooth. <KAMERABEVEGELSE>.
```

### Kamerabevegelser per segment
1. Ute → inngang: *moves straight toward the entrance, passes naturally into the home.*
2. Inn → kjøkken: *moves in, gradually showcasing the kitchen.*
3. → spise/trapp: *glides toward the dining area, toward the window wall and floating staircase.*
4. → kjøkken sentrert: *moves right, shifting away from the staircase, centering the kitchen.*
5. → kjøkkenøy: *moves forward toward the island, revealing countertop, cabinetry, cooking area.*
6. → stue: *moves backward from the kitchen, opening into the living room.*
7. → uteplass: *moves backward through the living area into the covered outdoor patio.*
8. → bakhage: *moves backward from the patio, opening into the backyard / rear exterior.*
9. → aerial: *moves upward into a high aerial drone view, revealing the full property.*

## Bildesett (kun for DEMO/showreel — når vi ikke har ekte 10-roms sett)
For en modell-bolig lages 10 stills med **referanse-kjeding** for konsistens:
Bilde 1 (fasade, ingen ref) → Bilde 2 bruker Bilde 1 som ref → osv.
Hver prompt: photorealistic, 9:16, ultra-realistic luxury real estate photography,
bright daylight, no people/text/logo/watermark. Negative: distorted/warped
architecture, CGI look, clutter, people, text, logo, watermark.
> VIKTIG: dette er en **markedsføringsdemo (modell-bolig)**, ikke en ekte annonse.
> For ekte kunder brukes ALLTID kundens egne bilder som start/slutt-frames.

## Stitch
Alle klipp → én reel via `/api/reel?clips=<url1>,<url2>,...` (re-encoder til
1080x1920 / 24fps, faststart). 24fps unngår hakking. Deretter `deliver_final`
(MCP) → FINAL LEVERING i admin → GODKJENN LEVERING.
