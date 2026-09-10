// Innhold per bransje. Bevisst ulikt: Google straffer tynne kopisider, og
// en restauratør og en byggmester har ikke det samme problemet.
module.exports = [
{
  fil: 'nettside-restaurant.html',
  slug: 'nettside-restaurant',
  bransje: 'restaurant',
  tittel: 'Nettside til restaurant og kafé i Stavanger · StayMotion',
  beskrivelse: 'Nettside for restauranter og kafeer i Stavanger og Rogaland. Meny som leses på mobil, bordbestilling uten telefon, og åpningstider som stemmer. Fast pris fra 7 900 kr.',
  h1: ['Nettside til restaurant', 'som fyller bordene.'],
  etikett: 'Restaurant og kafé',
  ingress: 'Gjesten bestemmer seg på mobilen, ofte samme kveld. Finner de ikke menyen på ti sekunder, går de videre til nabogata.',
  problem: {
    tittel: 'Det som stopper gjesten i dag',
    punkter: [
      ['Menyen ligger som PDF', 'Den åpnes i en egen leser, zoomes inn og ut, og halve tabellen er usynlig på telefon. De fleste gir opp før de har lest hovedrettene.'],
      ['Ingen vei til å bestille bord', 'Telefonen tar bestillinger på dagtid. Gjesten som planlegger fredagen klokka elleve på kvelden finner ingen vei inn.'],
      ['Åpningstider som ikke stemmer', 'Står det ett sted på nettsiden og noe annet i Google, tror gjesten på Google — eller lar være å komme.'],
      ['Ingen bilder av lokalet', 'Folk vil vite hva slags kveld de går til. Mat uten rom forteller bare halve historien.']
    ]
  },
  losning: {
    tittel: 'Slik bygger vi den',
    punkter: [
      ['Menyen som ekte tekst', 'Ikke PDF. Retter og beskrivelser som leses like godt på telefon som på skjerm, og som du kan endre når sesongen skifter.'],
      ['Bordbestilling i siden', 'Vi kobler bookingsystemet du allerede bruker, eller setter opp et skjema. Gjesten booker uten å ringe.'],
      ['Åpningstider ett sted', 'Tidene settes opp både på siden og i Google-bedriftsprofilen, så de sier det samme.'],
      ['Bildene får plass', 'Maten, rommet og kvelden. Vi beskjærer og optimaliserer så siden fortsatt er rask.'],
      ['Kart og klikk-for-å-ringe', 'Adressen åpner kartappen. Nummeret ringer med ett trykk.']
    ]
  },
  faq: [
    ['Kan dere legge inn menyen vår?', 'Ja. Send den som den er — PDF, bilde eller et dokument — så skriver vi den inn som ekte tekst på siden. Du kan endre den selv etterpå, eller vi gjør det for deg.'],
    ['Vi bruker allerede et bookingsystem. Funker det?', 'Som regel ja. De fleste norske bookingsystemer kan legges rett inn i siden, så gjesten aldri forlater den. Fortell hvilket dere bruker, så sjekker vi.'],
    ['Hva koster en nettside til restaurant?', 'Momentum, som er en komplett nettside med meny, bilder, kart og skjema, koster 16 000 kr fast. Trenger dere bare én sterk side, koster Første trekk 7 900 kr.'],
    ['Hvor fort kan den være oppe?', 'Første komplette utkast innen fem virkedager etter at vi har fått bilder, meny og oppstartbetaling.']
  ]
},
{
  fil: 'nettside-handverker.html',
  slug: 'nettside-handverker',
  bransje: 'bygg',
  tittel: 'Nettside til håndverker og byggefirma i Rogaland · StayMotion',
  beskrivelse: 'Nettside for håndverkere, byggefirma og entreprenører i Stavanger og Rogaland. Vis arbeidet, dekk området ditt, og gjør det enkelt å be om tilbud. Fast pris fra 7 900 kr.',
  h1: ['Nettside til håndverker', 'som gir tilbudsforespørsler.'],
  etikett: 'Håndverk og bygg',
  ingress: 'Kunden har allerede bestemt seg for å pusse opp. Spørsmålet er bare hvem som får jobben — og de sjekker tre firmaer på telefonen før de ringer ett.',
  problem: {
    tittel: 'Det som gjør at de ringer naboen',
    punkter: [
      ['Ingen bilder av arbeidet', 'Du har hundrevis av bilder på telefonen. Ligger de ikke på nettsiden, må kunden ta ditt ord for at du er god.'],
      ['Uklart hvor dere jobber', 'Kunden i Sandnes vet ikke om dere kjører dit. Står det ikke, antar de nei.'],
      ['Tilbud bare på telefon', 'Mange orker ikke ringe et ukjent firma. Uten et skjema mister du dem som heller skriver.'],
      ['Godkjenninger som ikke vises', 'Har dere sentral godkjenning, mesterbrev eller ansvarsrett, er det det tryggeste dere kan vise. Det er ofte gjemt bort.']
    ]
  },
  losning: {
    tittel: 'Slik bygger vi den',
    punkter: [
      ['Før og etter, med bilder', 'Prosjektene dine blir bevis. Vi setter dem opp så de leses raskt, med hva som ble gjort.'],
      ['Området dere dekker', 'Tydelig hvilke kommuner dere kjører til, så kunden slipper å lure.'],
      ['Tilbudsskjema som fanger opp det som trengs', 'Type jobb, adresse, bilder fra kunden og ønsket tidspunkt — så du kan svare uten en runde med spørsmål.'],
      ['Godkjenninger fram i lyset', 'Sentral godkjenning, mesterbrev, forsikring og fagbrev vises der kunden ser dem.'],
      ['Klikk-for-å-ringe', 'For dem som heller tar telefonen når de først er overbevist.']
    ]
  },
  faq: [
    ['Vi har bare bilder på telefonen. Holder det?', 'Ja. Mobilbilder fungerer godt til før og etter — det er ofte mer troverdig enn stockbilder. Vi hjelper med utvalget og beskjærer dem.'],
    ['Kan skjemaet ta imot bilder fra kunden?', 'Ja. Det gjør ofte tilbudet raskere å gi, fordi du ser jobben før du drar ut.'],
    ['Hva koster en nettside til håndverkerfirma?', 'Momentum koster 16 000 kr fast og gir forside pluss inntil fire undersider, for eksempel én per tjeneste. Første trekk, én sterk side med tilbudsskjema, koster 7 900 kr.'],
    ['Kan dere vise sentral godkjenning?', 'Ja. Send dokumentasjonen dere har, så legger vi den inn. Vi finner ikke på godkjenninger dere ikke har.']
  ]
},
{
  fil: 'nettside-klinikk.html',
  slug: 'nettside-klinikk',
  bransje: 'klinikk',
  tittel: 'Nettside til klinikk, frisør og salong i Stavanger · StayMotion',
  beskrivelse: 'Nettside for klinikker, frisører og salonger i Stavanger og Rogaland. Behandlinger og priser tydelig fram, og timebestilling ett trykk unna. Fast pris fra 7 900 kr.',
  h1: ['Nettside til klinikk', 'med timebestilling som virker.'],
  etikett: 'Klinikk, frisør og skjønnhet',
  ingress: 'Den som leter etter en behandling vil vite tre ting: hva det er, hva det koster, og når du har ledig. Svarer siden på alle tre, booker de.',
  problem: {
    tittel: 'Det som gjør at de ikke booker',
    punkter: [
      ['Booking gjemt nederst', 'Knappen ligger i bunnen av en lang side. De fleste rekker aldri dit.'],
      ['Priser som ikke står', 'Uten pris må kunden ringe for å spørre. Mange lar heller være og prøver et sted som er åpent om prisen.'],
      ['Behandlinger beskrevet i fagspråk', 'Kunden vet ikke alltid hva behandlingen heter — de vet hva de vil bli kvitt.'],
      ['Ingen ansikter', 'Folk vil vite hvem som skal ta på dem. Et bilde og et navn gjør mer enn to avsnitt om filosofi.']
    ]
  },
  losning: {
    tittel: 'Slik bygger vi den',
    punkter: [
      ['Booking øverst, og gjennom hele siden', 'Knappen følger med når kunden blar, så avstanden til en time aldri er mer enn ett trykk.'],
      ['Behandlinger med pris og varighet', 'Beskrevet slik kunden ville sagt det, med fagbegrepet ved siden av.'],
      ['Deres eget bookingsystem inn i siden', 'Bruker dere allerede et system, kobler vi det. Ellers setter vi opp et skjema.'],
      ['Hvem som jobber der', 'Navn, bilde og hva den enkelte er god på.'],
      ['Rolige, tydelige sider', 'Ingen støy. Kunden skal føle at dette er et sted som har orden på ting.']
    ]
  },
  faq: [
    ['Må vi vise priser?', 'Nei, men det pleier å lønne seg. Kunder som ikke finner prisen, går ofte videre i stedet for å ringe. Vil dere heller ha «fra»-priser, gjør vi det.'],
    ['Kan dere koble bookingsystemet vårt?', 'De fleste vanlige systemene kan legges rett inn i siden. Fortell hvilket dere bruker, så sjekker vi før vi starter.'],
    ['Kan vi vise før- og etterbilder?', 'Ja, hvis dere har samtykke fra kunden det gjelder. Vi legger ikke ut bilder av behandlingsresultater uten det.'],
    ['Hva koster en nettside til klinikk eller salong?', 'Momentum koster 16 000 kr fast, med forside og inntil fire undersider — for eksempel én per behandlingsområde. Første trekk koster 7 900 kr.']
  ]
},
{
  fil: 'nettside-overnatting.html',
  slug: 'nettside-overnatting',
  bransje: 'eiendom',
  tittel: 'Nettside til overnatting og utleie i Rogaland · StayMotion',
  beskrivelse: 'Nettside for hytter, gjestehus og opplevelser i Rogaland. Ta imot bestillinger direkte i stedet for å betale provisjon til portalene. Fast pris fra 7 900 kr.',
  h1: ['Nettside til overnatting', 'med booking direkte til deg.'],
  etikett: 'Overnatting og opplevelser',
  ingress: 'Portalene skaffer deg gjester, men tar en andel av hver eneste natt. En egen side som tar imot bestillinger direkte, beholder du hele beløpet av.',
  problem: {
    tittel: 'Det som koster deg penger i dag',
    punkter: [
      ['All booking går gjennom portalene', 'Hver bestilling koster deg provisjon. Gjester som ville booket direkte, finner ingen vei til å gjøre det.'],
      ['Ingen egen side å sende folk til', 'Deler du stedet på Instagram eller i en annonse, må du sende folk til en portal — som viser dem konkurrentene dine ved siden av.'],
      ['Bilder som ikke gjør stedet rettferdighet', 'Portalene tvinger bildene inn i sine egne rammer. På din egen side bestemmer du hvordan stedet vises.'],
      ['Gjesten vet ikke hva som er ledig', 'Uten en kalender må de sende en melding og vente. Mange gidder ikke.']
    ]
  },
  losning: {
    tittel: 'Slik bygger vi den',
    punkter: [
      ['Bestilling direkte på siden', 'Kalender eller forespørselsskjema, koblet til systemet du bruker. Gjesten booker hos deg.'],
      ['Stedet vist som det er', 'Store bilder, i din rekkefølge, uten portalens rammer rundt.'],
      ['Priser og sesong tydelig', 'Hva det koster når, og hva som er inkludert.'],
      ['En adresse å sende folk til', 'Én lenke som fungerer i annonser, på Instagram og i e-post.'],
      ['Kart og praktisk info', 'Veibeskrivelse, innsjekk, husregler og det gjesten spør om uansett.']
    ]
  },
  faq: [
    ['Må vi slutte med portalene?', 'Nei. De fleste bruker begge deler: portalene fyller hullene, mens egen side tar imot dem som allerede har bestemt seg. Da slipper du provisjon på de bestillingene.'],
    ['Kan siden vise ledige datoer?', 'Ja, hvis dere bruker et system med kalender vi kan koble til. Ellers setter vi opp en forespørsel med ønsket dato.'],
    ['Vi har bare mobilbilder av stedet. Går det?', 'Ofte ja. Vi ser gjennom det dere har og sier ærlig ifra hvis noe bør tas på nytt — og hva som skal til.'],
    ['Hva koster en nettside til utleie?', 'Første trekk, én side med bilder, priser og forespørselsskjema, koster 7 900 kr. Momentum med flere sider og kalender koster 16 000 kr.']
  ]
}
];
