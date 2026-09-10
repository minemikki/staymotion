// GIMI — innholdet på konseptsiden, norsk og engelsk.
//
// KILDER OG ÆRLIGHET:
// Alt faktainnhold her stammer fra offentlig publisert omtale av GIMI
// (Stavanger Aftenblad, RA Stavanger, restaurantomtaler) eller fra deres
// egen publiserte meny. Vi dikter ikke opp sitater fra Fredrik eller Daniel,
// og vi finner ikke på cocktailnavn — baren beskrives etter programmet sitt
// (fermentering, sylting, krydder), ikke med oppdiktede produkter.
// Hermetikken i samme bygg er i Michelin-guiden; GIMI er det ikke, og
// ingenting på siden skal kunne mistolkes i den retningen.

const meny = [
  {
    gruppe: { no: 'Forretter', en: 'Starters' },
    retter: [
      {
        n: { no: 'Kyllingleverterrine', en: 'Chicken liver terrine' },
        b: { no: 'Brioche og marmelade', en: 'Brioche and marmalade' },
        a: { no: 'Melk · hvete · sulfitt · egg', en: 'Milk · wheat · sulphites · egg' },
        pris: 185,
        tags: ['lett', 'dele'],
      },
      {
        n: { no: 'Oksetartar', en: 'Beef tartare' },
        b: { no: 'Potetrøsti, eggekrem og wrångebäck', en: 'Potato rösti, egg cream and wrångebäck' },
        a: { no: 'Melk · egg · fisk · sennep', en: 'Milk · egg · fish · mustard' },
        pris: 245,
        tags: ['dele', 'lett'],
      },
      {
        n: { no: 'Kamskjell', en: 'Scallops' },
        b: { no: 'Reddik, fingerlime og blåskjell', en: 'Radish, finger lime and mussels' },
        a: { no: 'Bløtdyr · sulfitt', en: 'Molluscs · sulphites' },
        pris: 385,
        tags: ['lett'],
      },
    ],
  },
  {
    gruppe: { no: 'Fra grillen', en: 'From the fire' },
    retter: [
      {
        n: { no: 'Dagens fisk', en: 'Fish of the day' },
        b: { no: 'Tomat og erter', en: 'Tomato and peas' },
        a: { no: 'Melk · fisk · sulfitt', en: 'Milk · fish · sulphites' },
        pris: 395,
        tags: ['grill'],
      },
      {
        n: { no: 'Tørrmodnet svinecarré', en: 'Dry-aged pork loin' },
        b: { no: 'Squash, sennep og peppersaus', en: 'Courgette, mustard and pepper sauce' },
        a: { no: 'Melk · sulfitt · lupin · sennep', en: 'Milk · sulphites · lupin · mustard' },
        pris: 420,
        tags: ['grill', 'dele'],
      },
    ],
  },
  {
    gruppe: { no: 'Dessert', en: 'Dessert' },
    retter: [
      {
        n: { no: 'Rørte bær', en: 'Stirred berries' },
        b: { no: 'Kremostis og karamellisert sjokolade', en: 'Cream cheese ice cream and caramelised chocolate' },
        a: { no: 'Melk', en: 'Milk' },
        pris: 155,
        tags: ['lett', 'dele'],
      },
    ],
  },
];

// Dokumenterte retter fra grillen (omtalt i anmeldelse) som vi ikke har
// publisert pris på. De brukes som fortelling og som forslag i "Gi meg noe",
// aldri som prisede linjer på menyen.
const fraIlden = [
  {
    n: { no: 'Negima', en: 'Negima' },
    b: {
      no: 'Kyllingspyd med glasur og ordentlig grillsmak. Purren er like god som kyllingen.',
      en: 'Chicken skewer with a glaze and real char off the grill. The leek is as good as the chicken.',
    },
    tags: ['grill', 'dele'],
  },
  {
    n: { no: 'Margbein', en: 'Bone marrow' },
    b: {
      no: 'Grillet sitron, ansjos og surdeig fra Molin\u00e5 nede i byen.',
      en: 'Grilled lemon, anchovy and sourdough from Molin\u00e5 down in town.',
    },
    tags: ['grill', 'dele'],
  },
  {
    n: { no: 'Uer', en: 'Ocean perch' },
    b: {
      no: 'Sauce vierge \u2014 lys, urterik og syrlig der den skal v\u00e6re det.',
      en: 'Sauce vierge \u2014 bright, herby and sharp exactly where it should be.',
    },
    tags: ['grill'],
  },
];

// "Noe i glasset" beskriver barprogrammet, og finner ikke opp cocktailnavn.
// Baren bygger på fermentering, sylting og krydder — det er dokumentert.
// Hva den enkelte drinken heter, er GIMI sitt å fylle inn.
const glasset = [
  {
    n: { no: 'Noe syrlig', en: 'Something sharp' },
    b: {
      no: 'Fermentert, friskt og litt uventet. Bartenderen setter den sammen etter hva du liker.',
      en: 'Fermented, fresh and a little unexpected. The bar builds it around what you like.',
    },
  },
  {
    n: { no: 'Noe med røyk i', en: 'Something smoky' },
    b: {
      no: 'Krydder, sylting og litt av den samme ilden som står på kjøkkenet.',
      en: 'Spice, pickling and a little of the same fire that runs the kitchen.',
    },
  },
  {
    n: { no: 'En klassiker, satt riktig', en: 'A classic, done properly' },
    b: {
      no: 'Ingen omskriving. Bare riktig is, riktig mål og riktig glass.',
      en: 'No reinvention. Just the right ice, the right measure and the right glass.',
    },
  },
  {
    n: { no: 'Noe alkoholfritt', en: 'Something alcohol-free' },
    b: {
      no: 'Laget med like mye omtanke som resten av kartet. Ikke en plan B.',
      en: 'Made with the same care as everything else on the list. Not a plan B.',
    },
  },
];

const t = {
  no: {
    lang: 'no',
    conceptBar: 'Uforpliktende konsept laget av StayMotion',
    conceptNote: 'Illustrative bilder · ikke offisiell nettside',
    navMeny: 'Meny',
    navIlden: 'Ilden',
    navOss: 'Om oss',
    navBaren: 'Baren',
    navBesok: 'Besøk',
    menuOpen: 'Åpne meny',
    skip: 'Hopp til innhold',

    heroEyebrow: 'Restaurant & cocktailbar · Eiganes, Stavanger',
    heroTitleA: 'Gi meg',
    heroTitleB: 'noe.',
    heroLead: 'Noe lite. Noe stort. Eller bare noe skikkelig godt.',
    heroBody: 'To brødre, ett åpent kjøkken og en grill som står på hele kvelden. Litt bistro, litt avslappet fine dining — og en cocktailbar som gjerne lar kvelden vare.',
    heroBook: 'Book bord',
    heroMenuLink: 'Se menyen',
    heroCaptionA: 'Kjøkkenet velger',
    heroCaptionB: 'Du nyter.',

    tickerA: 'Litt bistro',
    tickerB: 'Litt fine dining',
    tickerC: 'Alltid noe godt',

    giIndex: '01 / Gi meg noe',
    giKicker: 'Navnet vårt er en bestilling',
    giTitle: 'Så si det, da.',
    giBody: 'GIMI er «gi mi». Trykk på det du er i humør til, så foreslår vi noe fra menyen.',
    giLett: 'Noe lett',
    giGrill: 'Noe fra grillen',
    giGlass: 'Noe i glasset',
    giDele: 'Noe å dele',
    giAgain: 'Gi meg noe annet',
    giBook: 'Book bord',
    giHint: 'Velg noe over, så finner vi noe til deg.',
    giPrefix: 'Da foreslår vi',

    ildIndex: '02 / Ilden',
    ildKicker: 'Alt begynner i ilden',
    ildTitle: 'Nesten alt innom grillen.',
    ildBody: 'Grillen står midt i det åpne kjøkkenet, og nesten alt vi serverer har vært innom den. Ild gir mat noe man ikke får til på andre måter — røyk, skorpe, en dybde som ikke kan jukses fram.',
    ildBody2: 'Sitt ved disken hvis du vil se det skje.',
    ildF1: 'Åpent kjøkken',
    ildF1b: 'Ingenting skjer bak lukkede dører',
    ildF2: 'Levende ild',
    ildF2b: 'Kull og glør, hele kvelden',
    ildF3: 'Delingsretter',
    ildF3b: 'Bestill flere, del alt',
    ildLabel: 'Rett fra glørne',
    ildRetterTitle: 'Noe av det som kommer fra ilden',

    ossIndex: '03 / Om oss',
    ossKicker: 'Fredrik og Daniel',
    ossTitle: 'To brødre<br>som dro hjem.',
    ossBody: 'Fredrik og Daniel van Opdorp lærte faget på Hot Shop i Oslo. Så sa de opp, flyttet hjem til Stavanger, og åpnet stedet de selv hadde lyst til å gå på.',
    ossBody2: 'GIMI er ikke satt sammen på et møterom. Det er to brødre, ett kjøkken og en ganske tydelig idé om hvordan en kveld bør være.',
    ossQuote: 'Vi gleder oss til å komme tilbake hit.',
    ossQuoteBy: 'Stavanger Aftenblad, i sin anmeldelse av GIMI',

    romIndex: '04 / Rommet',
    romKicker: 'Det gamle hermetikklaboratoriet',
    romTitle: 'Tredve plasser.<br><em>Én av dem er best.</em>',
    romBody: 'Vi holder til i det gamle hermetikklaboratoriet på Eiganes, i samme bygg som Matmagasinet. Lyst, enkelt og lite — tredve plasser i alt.',
    romBody2: 'Disken mot det åpne kjøkkenet er den beste plassen i huset. Der ser du alt som skjer, og du kommer garantert i snakk med noen. Si ifra når du bestiller — de plassene går fort.',
    romLabel: 'Disken mot kjøkkenet',
    romStat1: '30',
    romStat1b: 'plasser i hele lokalet',
    romStat2: '200–500',
    romStat2b: 'kroner per rett',
    romStat3: '4',
    romStat3b: 'kvelder i uka',
    naboTitle: 'Vi holder ikke p\u00e5 alene.',
    naboBody: 'Bygget deles med Matmagasinet og Hermetikken. Vinen f\u00e5r hjelp fra Chris ved siden av, br\u00f8det kommer fra Molin\u00e5 nede i byen. Det er en fordel \u00e5 ha naboer som kan faget sitt.',

    menyIndex: '05 / Menyen',
    menyKicker: 'Akkurat nå',
    menyTitle: 'À la carte',
    menyBody: 'Menyen følger sesongen, råvarene og det kjøkkenet har lyst til å servere. Her er et utvalg fra dagens meny.',
    menyFoot: 'Vi tilrettelegger for allergier og vegetar, men dessverre ikke vegansk — gi gjerne beskjed ved bordbestilling.',
    menyFoot2: 'Prisene er oppgitt i NOK',

    barIndex: '06 / Baren',
    barKicker: 'Før, under eller etter',
    barTitle: 'Baren lar kvelden finne sin egen rytme.',
    barBody: 'Klassikere satt riktig, og egne drinker bygget på fermentering, sylting og krydder — samme kjøkken, samme tankegang. De alkoholfrie er laget med like mye omtanke, ikke som en ettertanke.',
    barBody2: 'Vinkartet er satt opp med god hjelp fra Chris på Matmagasinet ved siden av — som gjør at det er atskillig bedre enn et sted på tredve plasser har noen som helst grunn til å ha.',
    barH1: 'Ons–tors',
    barH1b: '17.00–24.00',
    barH2: 'Fre–lør',
    barH2b: '17.00–01.00',
    barLabel: 'Noe i glasset',

    lunsjIndex: '07 / Lørdagslunsj',
    lunsjKicker: 'Lørdager 12.00–15.00',
    lunsjTitle: 'Lunsj uten hastverk.',
    lunsjBody: 'Samme kjøkken, roligere tempo. Kom innom for noe lite før dagen tar deg videre — eller bli sittende til den gjør det.',
    lunsjCta: 'Book lørdagslunsj',

    selskapIndex: '08 / Selskap',
    selskapKicker: 'Hele lokalet',
    selskapTitle: 'Tredve plasser<br><em>kan bli deres alene.</em>',
    selskapBody: 'Bursdager, firmamiddag, julebord — eller en kveld uten spesiell grunn. Vi tar hele huset: tredve rundt samme bord, én meny satt sammen for dere, og baren deres for kvelden.',
    selskapCta: 'Snakk med oss om selskap',
    selskapNote: 'Fortell oss hvor mange dere er og når, så tar vi det derfra.',

    faqIndex: '09 / Spørsmål',
    faqTitle: 'Det vi får oftest.',
    faq: [
      ['Må jeg bestille bord?',
       'Vi har tredve plasser i alt, så det korte svaret er ja — særlig fredag og lørdag. Er du to og fleksibel, kan det hende det finnes plass i baren.'],
      ['Hva koster en middag hos dere?',
       'Rettene ligger stort sett mellom 200 og 500 kroner. Du bestemmer selv om det blir en rask én-retters eller en kveld som varer.'],
      ['Kan jeg komme bare for en drink?',
       'Ja. Baren er åpen fra 17 alle kveldene vi har åpent, og du trenger ikke spise for å sitte i den.'],
      ['Hva er egentlig disken?',
       'Plassene som vender rett mot det åpne kjøkkenet. Du ser maten bli laget, og du havner som regel i en samtale med den som lager den. Si ifra når du bestiller.'],
      ['Tilrettelegger dere for allergier?',
       'Ja, vi tilrettelegger for allergier og vegetar, men dessverre ikke vegansk. Gi beskjed når du bestiller bord, så ordner vi det.'],
      ['Kan vi leie hele lokalet?',
       'Ja. Tredve personer får plass når vi tar huset for oss selv. Ta kontakt med hvor mange dere er og hvilken dato, så setter vi opp et forslag.'],
    ],

    besokIndex: '10 / Besøk',
    besokKicker: 'Midt ved Ledaalparken',
    stemning: 'H\u00f8yt under taket, god stemning og musikk som faktisk h\u00f8res. Dette er ikke et sted der folk hvisker.',
    besokTitle: 'Kom som du er.<br><em>Bli lenger enn planlagt.</em>',
    besokAdr: 'Adresse',
    besokVei: 'Finn veien',
    besokRest: 'Restaurant',
    besokDager: 'Onsdag–lørdag',
    besokTid: '17.00–24.00',
    besokLunsj: 'Lørdagslunsj',
    besokLunsjTid: '12.00–15.00',
    besokKontakt: 'Kontakt',

    footTag: 'Restaurant og cocktailbar i det gamle hermetikklaboratoriet.',
    footConcept: 'Uforpliktende visuelt konsept utviklet av StayMotion. Illustrative bilder.',

    statusOpen: 'Åpent nå',
    statusOpenUntil: 'kjøkkenet til',
    statusBarUntil: 'baren til',
    statusOpensToday: 'Åpner i dag',
    statusOpensAt: 'Åpner',
    statusClosed: 'Stengt i dag',
    statusLunch: 'Lørdagslunsj nå',
    dager: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
  },

  en: {
    lang: 'en',
    conceptBar: 'Non-binding concept by StayMotion',
    conceptNote: 'Illustrative images · not the official website',
    navMeny: 'Menu',
    navIlden: 'The fire',
    navOss: 'About',
    navBaren: 'The bar',
    navBesok: 'Visit',
    menuOpen: 'Open menu',
    skip: 'Skip to content',

    heroEyebrow: 'Restaurant & cocktail bar · Eiganes, Stavanger',
    heroTitleA: 'Give me',
    heroTitleB: 'something.',
    heroLead: 'Something small. Something big. Or just something really good.',
    heroBody: 'Two brothers, one open kitchen and a grill that runs all evening. Part bistro, part relaxed fine dining — and a cocktail bar happy to let the night run long.',
    heroBook: 'Book a table',
    heroMenuLink: 'See the menu',
    heroCaptionA: 'The kitchen decides',
    heroCaptionB: 'You enjoy.',

    tickerA: 'Part bistro',
    tickerB: 'Part fine dining',
    tickerC: 'Always something good',

    giIndex: '01 / Give me something',
    giKicker: 'Our name is an order',
    giTitle: 'So go on, ask.',
    giBody: 'GIMI means «give me». Tap whatever you are in the mood for, and we will suggest something from the menu.',
    giLett: 'Something light',
    giGrill: 'Something from the fire',
    giGlass: 'Something in a glass',
    giDele: 'Something to share',
    giAgain: 'Give me something else',
    giBook: 'Book a table',
    giHint: 'Pick something above and we will find you something.',
    giPrefix: 'Then we suggest',

    ildIndex: '02 / The fire',
    ildKicker: 'It all starts in the fire',
    ildTitle: 'Almost everything meets the grill.',
    ildBody: 'The grill sits in the middle of the open kitchen, and almost everything we serve has been over it. Fire gives food something you cannot get any other way — smoke, crust, a depth that cannot be faked.',
    ildBody2: 'Sit at the counter if you want to watch it happen.',
    ildF1: 'Open kitchen',
    ildF1b: 'Nothing happens behind closed doors',
    ildF2: 'Live fire',
    ildF2b: 'Charcoal and embers, all evening',
    ildF3: 'Made for sharing',
    ildF3b: 'Order several, share everything',
    ildLabel: 'Straight off the embers',
    ildRetterTitle: 'Some of what comes off the fire',

    ossIndex: '03 / About',
    ossKicker: 'Fredrik and Daniel',
    ossTitle: 'Two brothers<br>who came home.',
    ossBody: 'Fredrik and Daniel van Opdorp learned the trade at Hot Shop in Oslo. Then they handed in their notice, moved home to Stavanger, and opened the place they wanted to eat at themselves.',
    ossBody2: 'GIMI was not assembled in a meeting room. It is two brothers, one kitchen and a fairly clear idea of how an evening ought to go.',
    ossQuote: 'We are already looking forward to coming back.',
    ossQuoteBy: 'Stavanger Aftenblad, in its review of GIMI',

    romIndex: '04 / The room',
    romKicker: 'The old canning laboratory',
    romTitle: 'Thirty seats.<br><em>One of them is the best.</em>',
    romBody: 'We are in the old canning laboratory at Eiganes, in the same building as Matmagasinet. Bright, plain and small — thirty seats in all.',
    romBody2: 'The counter facing the open kitchen is the best seat in the house. You see everything happen, and you will almost certainly end up talking to someone. Ask for it when you book — those seats go quickly.',
    romLabel: 'The counter facing the kitchen',
    romStat1: '30',
    romStat1b: 'seats in the whole room',
    romStat2: '200–500',
    romStat2b: 'kroner per dish',
    romStat3: '4',
    romStat3b: 'evenings a week',
    naboTitle: 'We are not doing this alone.',
    naboBody: 'We share the building with Matmagasinet and Hermetikken. The wine gets help from Chris next door, the bread comes from Molin\u00e5 down in town. It helps to have neighbours who know their trade.',

    menyIndex: '05 / The menu',
    menyKicker: 'Right now',
    menyTitle: 'À la carte',
    menyBody: 'The menu follows the season, the produce and whatever the kitchen feels like cooking. Here is a selection from today.',
    menyFoot: 'We accommodate allergies and vegetarians, though sadly not vegan — just let us know when you book.',
    menyFoot2: 'Prices in NOK',

    barIndex: '06 / The bar',
    barKicker: 'Before, during or after',
    barTitle: 'The bar lets the evening find its own rhythm.',
    barBody: 'Classics done properly, and our own drinks built on fermentation, pickling and spice — same kitchen, same thinking. The alcohol-free ones are made with just as much care, not as an afterthought.',
    barBody2: 'The wine list is put together with a good deal of help from Chris at Matmagasinet next door — which makes it considerably better than a thirty-seat room has any business having.',
    barH1: 'Wed–Thu',
    barH1b: '17.00–24.00',
    barH2: 'Fri–Sat',
    barH2b: '17.00–01.00',
    barLabel: 'Something in a glass',

    lunsjIndex: '07 / Saturday lunch',
    lunsjKicker: 'Saturdays 12.00–15.00',
    lunsjTitle: 'Lunch without the hurry.',
    lunsjBody: 'Same kitchen, slower pace. Come by for something small before the day takes you onward — or stay until it does.',
    lunsjCta: 'Book Saturday lunch',

    selskapIndex: '08 / Private hire',
    selskapKicker: 'The whole room',
    selskapTitle: 'Thirty seats<br><em>can be yours alone.</em>',
    selskapBody: 'Birthdays, company dinners, Christmas parties — or an evening with no particular reason. We hand over the whole house: thirty around one table, a menu built for you, and the bar for the night.',
    selskapCta: 'Talk to us about private hire',
    selskapNote: 'Tell us how many you are and when, and we will take it from there.',

    faqIndex: '09 / Questions',
    faqTitle: 'What we get asked most.',
    faq: [
      ['Do I need to book?',
       'We have thirty seats in total, so the short answer is yes — especially on Friday and Saturday. If there are two of you and you are flexible, there may be room at the bar.'],
      ['What does dinner cost?',
       'Dishes mostly sit between 200 and 500 kroner. You decide whether it becomes a quick one-course meal or an evening that lasts.'],
      ['Can I come just for a drink?',
       'Yes. The bar opens at 17.00 every evening we are open, and you do not have to eat to sit in it.'],
      ['What exactly is the counter?',
       'The seats facing straight into the open kitchen. You watch the food being made, and you usually end up in conversation with whoever is making it. Ask for it when you book.'],
      ['Do you accommodate allergies?',
       'Yes, we accommodate allergies and vegetarians, though sadly not vegan. Tell us when you book and we will sort it.'],
      ['Can we hire the whole place?',
       'Yes. Thirty people fit when we give the house over. Get in touch with your numbers and a date, and we will put a proposal together.'],
    ],

    besokIndex: '10 / Visit',
    besokKicker: 'By Ledaalparken',
    stemning: 'Loud enough, in high spirits, with music you can actually hear. This is not a room where people whisper.',
    besokTitle: 'Come as you are.<br><em>Stay longer than planned.</em>',
    besokAdr: 'Address',
    besokVei: 'Get directions',
    besokRest: 'Restaurant',
    besokDager: 'Wednesday–Saturday',
    besokTid: '17.00–24.00',
    besokLunsj: 'Saturday lunch',
    besokLunsjTid: '12.00–15.00',
    besokKontakt: 'Contact',

    footTag: 'Restaurant and cocktail bar in the old canning laboratory.',
    footConcept: 'Non-binding visual concept developed by StayMotion. Illustrative images.',

    statusOpen: 'Open now',
    statusOpenUntil: 'kitchen until',
    statusBarUntil: 'bar until',
    statusOpensToday: 'Opens today',
    statusOpensAt: 'Opens',
    statusClosed: 'Closed today',
    statusLunch: 'Saturday lunch now',
    dager: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
};

const fakta = {
  adresse: 'Niels Juels gate 50',
  postnr: '4008 Stavanger',
  tlf: '51 52 20 00',
  tlfIntl: '+4751522000',
  epost: 'post@gimi.no',
  instagram: 'https://www.instagram.com/gimirestaurantogbar/',
  booking: 'https://book.easytable.com/book/?id=0c967&lang=auto',
  kart: 'https://www.google.com/maps/place/Niels+Juels+gate+50,+4008+Stavanger',
  // Onsdag(3) til lørdag(6). Kjøkken 17-24, bar til 01 fre/lør. Lunsj lørdag 12-15.
  apent: {
    3: { fra: 17, til: 24, bar: 24 },
    4: { fra: 17, til: 24, bar: 24 },
    5: { fra: 17, til: 24, bar: 25 },
    6: { fra: 17, til: 24, bar: 25, lunsj: [12, 15] },
  },
};

module.exports = { t, meny, glasset, fraIlden, fakta };
