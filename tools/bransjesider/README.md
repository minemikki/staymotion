# Bransjesider

Genererer de fire SEO-landingssidene i rota:

    node tools/bransjesider/build.cjs

- `content.cjs` — tekst per bransje. Bevisst ulikt innhold; Google straffer
  tynne kopisider, så maks overlapp mellom to sider ligger på ca. 42 %.
- `visuals.cjs` — telefonmockup (ren HTML/CSS, ingen bildefil) og hvilket
  stemningsbilde siden bruker. Bedriftsnavnene er de samme oppdiktede navnene
  som står på bransjekortene på forsiden.
- `style.cjs` — CSS for mockupen og fotostripa. Arver farger og typografi fra
  forsiden.
- `shell.json` — header, footer, script og stil hentet ut av `index.html`.
  Må hentes ut på nytt hvis forsidens header eller footer endres, ellers
  bygges sidene med et utdatert skall.

Bildene ligger i `img/bransje/`. De er AI-genererte stemningsbilder, ikke
kundebilder, og er merket som illustrasjon i bildeteksten på hver side.
