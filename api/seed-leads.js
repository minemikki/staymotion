// Lead seeder. Visit /api/seed-leads?key=<ADMIN_KEY> to write the 50 starter
// leads (with a human, professional pitch in the notes) into the CRM.
// Re-running is safe: new leads are created, and the PITCH is refreshed on
// existing seed leads whose notes are still the original pitch (starts with
// "Emne:"). Your own edits (email, stage, custom notes, follow-up dates) are
// always preserved.

import { listLeads, saveLead } from '../lib/leads.js';

const LEADS = [
  // ---------------- HYTTER / UNIK OVERNATTING ----------------
  { id:'seed-bolder', company:'The Bolder ved Lysefjorden', segment:'hytte', location:'Lysefjorden', website:'thebolder.no', leadScore:92, channel:'email',
    notes:`Emne: The Bolder + en liten idé

Hei! Jeg må bare si det: The Bolder er noe av det vakreste jeg har sett langs Lysefjorden. Jeg hjelper steder som deres med å få enda mer ut av bildene de allerede har, ved å gjøre dem om til korte videoer folk faktisk stopper på i feeden. Kan jeg lage en liten gratis prøve av ett av bildene deres, så ser dere selv hvordan det blir? Helt uforpliktende. Mvh Michael, StayMotion` },
  { id:'seed-fjordforest', company:'Fjord & Forest Gøysa Gard', segment:'hytte', location:'Lysefjorden', website:'', leadScore:88, channel:'email',
    notes:`Emne: En idé til hyttene deres

Hei! De små hyttene deres mot Lysefjorden har jeg blitt litt forelska i. Jeg jobber med å gjøre bilder folk allerede har om til korte videoer som selger stemningen bedre enn et stillbilde klarer. Har dere lyst til at jeg lager en gratis liten prøve av ett av bildene deres? Da ser dere det før dere bestemmer noe. Mvh Michael, StayMotion` },
  { id:'seed-basecamp', company:'Preikestolen BaseCamp', segment:'hytte', location:'Jørpeland', website:'preikestolenbasecamp.com', leadScore:88, channel:'email',
    notes:`Emne: En tanke før neste sesong

Hei! Dere tar imot folk fra hele verden på vei til Preikestolen, og jeg tenkte med en gang at innholdet deres fortjener å treffe like hardt som naturen rundt. Jeg lager korte videoer av bilder dere allerede har, som funker godt til booking og sosiale medier. Skal jeg lage en gratis smakebit, så ser dere hva jeg mener? Mvh Michael, StayMotion` },
  { id:'seed-skapet', company:'Skåpet Forsand', segment:'hytte', location:'Forsand', website:'', leadScore:82, channel:'email',
    notes:`Emne: En idé til hyttene i Forsand

Hei! Hyttene deres i Forsand er akkurat den typen sted som ser magisk ut i bevegelse. Jeg hjelper overnattingssteder med å gjøre bildene sine om til korte videoer, uten at noen må ut og filme. Kan jeg lage en gratis prøve av ett av bildene deres? Bare for at dere skal se det selv. Mvh Michael, StayMotion` },
  { id:'seed-husetvedhavet', company:'Huset ved Havet', segment:'hytte', location:'Jæren', website:'husetvedhavet.no', leadScore:84, channel:'email',
    notes:`Emne: Så stedet deres på Jæren

Hei! Beliggenheten deres rett ved havet på Jæren stoppet meg helt opp. Sånne steder fortjener en kort video som fanger bølgene og lyset, ikke bare stillbilder. Jeg lager det ut av bilder dere allerede har. Skal jeg lage en liten gratis prøve, så ser dere hvordan det tar seg ut? Mvh Michael, StayMotion` },
  { id:'seed-ryvarden', company:'Ryvarden Kulturfyr', segment:'hytte', location:'Haugalandet', website:'', leadScore:80, channel:'email',
    notes:`Emne: Fyret deres

Hei! Å få overnatte i et gammelt fyr er en sånn opplevelse folk drømmer om, og det kommer virkelig til sin rett i video. Jeg lager korte filmer av bilder dere allerede har. Kunne dere tenke dere en gratis liten prøve av ett av bildene deres? Ingen forpliktelser. Mvh Michael, StayMotion` },
  { id:'seed-sirdalhh', company:'Sirdal Holiday Homes', segment:'hytte', location:'Sirdal', website:'sirdalholidayhomes.no', leadScore:80, channel:'email',
    notes:`Emne: En idé til hyttene i Sirdal

Hei! Dere har mange fine hytter i Sirdal, og sikkert et helt arkiv med bilder. Jeg hjelper utleiere med å gjøre de bildene om til korte videoer som fyller flere ledige uker, uten filmedager. Skal jeg lage en gratis prøve av en av hyttene, så ser dere resultatet? Mvh Michael, StayMotion` },
  { id:'seed-sageneset', company:'Sageneset Feriesenter', segment:'hytte', location:'Sirdal', website:'sageneset.no', leadScore:78, channel:'email',
    notes:`Emne: En idé før bookingsesongen

Hei! Feriesenteret deres i Sirdal har mye fint å vise fram. En kort video skiller dere ut når folk skroller etter hytte. Jeg lager det ut av bildene dere allerede har. Har dere lyst på en gratis prøve, så ser dere selv? Mvh Michael, StayMotion` },
  { id:'seed-kleppa', company:'Kleppa Gård & Glamping', segment:'hytte', location:'Hjelmeland', website:'', leadScore:84, channel:'email',
    notes:`Emne: Glamping-domene deres

Hei! Domene deres ved stranda i Hjelmeland ser helt magiske ut. Jeg hjelper glamping- og hyttesteder med å gjøre bildene sine om til korte videoer folk stopper på. Skal jeg lage en gratis liten prøve av ett av bildene deres? Bare for at dere skal se det selv. Mvh Michael, StayMotion` },
  { id:'seed-norglamp', company:'NorGlamp Randøy', segment:'hytte', location:'Randøy', website:'', leadScore:84, channel:'email',
    notes:`Emne: Konseptet deres på Randøy

Hei! Domer, kokonger og hobbit-hus på Randøy er noe av det kuleste jeg har sett, og sånt fortjener video. Jeg lager korte filmer av bilder dere allerede har. Kan jeg lage en gratis prøve, så ser dere hvordan det blir? Helt uforpliktende. Mvh Michael, StayMotion` },
  { id:'seed-tveita', company:'Tveita Adventure', segment:'hytte', location:'Suldal', website:'', leadScore:80, channel:'email',
    notes:`Emne: Utsikten deres i Suldal

Hei! Domene deres med panoramautsikt over Ryfylke er nydelige. En kort video gjør noe helt annet med folk som vurderer et opphold enn et stillbilde gjør. Jeg lager det ut av bildene dere har. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-akrafjorden', company:'Åkrafjorden Glamping', segment:'hytte', location:'Åkrafjorden', website:'', leadScore:82, channel:'email',
    notes:`Emne: Domene på fjellhylla

Hei! Domene deres på hylla over Åkrafjorden er rene drømmebildene. Jeg hjelper steder som dere med å gjøre bildene om til korte videoer, uten ny filming. Kan jeg lage en gratis prøve av ett av bildene deres? Mvh Michael, StayMotion` },
  { id:'seed-sirdalfjellgard', company:'Sirdal Fjellgård', segment:'hytte', location:'Sirdal', website:'sirdal-fjellgard.no', leadScore:78, channel:'email',
    notes:`Emne: Ecolodgene deres

Hei! Ecolodgene deres i Sirdal har en helt egen stemning. Jeg lager korte videoer av bilder folk allerede har, som fanger nettopp den stemningen. Har dere lyst på en gratis liten prøve, så ser dere det selv? Mvh Michael, StayMotion` },
  { id:'seed-amoy', company:'Amoy Fjordferie', segment:'hytte', location:'Karmøy', website:'', leadScore:74, channel:'email',
    notes:`Emne: Fjordferien deres

Hei! Stedet deres ser ut som ro og sjø på sitt beste. En kort video som fanger lyset og vannet treffer folk som drømmer om en ferie akkurat der. Jeg lager det ut av bilder dere allerede har. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },

  // ---------------- HOTELLER ----------------
  { id:'seed-eilertsmith', company:'Eilert Smith Hotel', segment:'hotell', location:'Stavanger', website:'eilertsmith.no', leadScore:90, channel:'email',
    notes:`Emne: En liten idé til Eilert Smith

Hei! Eilert Smith er et av de fineste stedene å bo i Stavanger, og det gamle funkishuset er jo laget for å filmes. Jeg hjelper hoteller med å gjøre bildene sine om til korte videoer til booking og sosiale medier, uten en hel filmproduksjon. Kan jeg lage en gratis prøve av ett av rommene deres, så ser dere kvaliteten? Mvh Michael, StayMotion` },
  { id:'seed-verkshotellet', company:'Verkshotellet Jørpeland', segment:'hotell', location:'Jørpeland', website:'', leadScore:80, channel:'email',
    notes:`Emne: En idé til Verkshotellet

Hei! Verkshotellet har en stil helt for seg selv, og som port til Preikestolen booker folk mye på førsteinntrykk. En kort video av rommene selger det inntrykket bedre enn bilder alene. Jeg lager det ut av bildene dere har. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-hotelljaeren', company:'Hotell Jæren', segment:'hotell', location:'Bryne', website:'', leadScore:74, channel:'email',
    notes:`Emne: En tanke til hotellet

Hei! Jæren har et lys og en ro som er verdt å vise fram i bevegelse. Jeg lager korte videoer av bilder dere allerede har, som får folk til å ville bo hos dere. Har dere lyst på en gratis liten prøve? Mvh Michael, StayMotion` },
  { id:'seed-ryfylkefjord', company:'Ryfylke Fjordhotell', segment:'hotell', location:'Sauda', website:'', leadScore:78, channel:'email',
    notes:`Emne: Utsikten deres i Sauda

Hei! Fjordutsikten deres i Sauda er et salgsargument helt av seg selv, og den blir enda sterkere i bevegelse. Jeg lager korte videoer av bildene dere har. Skal jeg lage en gratis prøve, så ser dere det? Mvh Michael, StayMotion` },
  { id:'seed-alvegarden', company:'Alvegården Gjestehus', segment:'hotell', location:'Haugesund', website:'', leadScore:72, channel:'email',
    notes:`Emne: En liten idé til gjestehuset

Hei! Gjestehuset deres har en sjarm som fortjener mer enn stillbilder. Jeg lager korte videoer av bilder dere allerede har, uten ny filming. Kunne dere tenke dere en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-sirdalhoyfjell', company:'Sirdal Høyfjellshotell', segment:'hotell', location:'Sirdal', website:'', leadScore:72, channel:'email',
    notes:`Emne: Høyfjellshotellet i bevegelse

Hei! Beliggenheten deres på Sirdalsfjellet er noe folk drar langt for. En kort video fanger den følelsen bedre enn et bilde. Jeg lager det ut av bildene dere har. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-grandegersund', company:'Grand Hotel Egersund', segment:'hotell', location:'Egersund', website:'', leadScore:74, channel:'email',
    notes:`Emne: En idé til Grand Hotel

Hei! Grand Hotel Egersund har en fin, egen karakter, og både rommene og restauranten hadde tatt seg godt ut i video. Jeg lager det ut av bilder dere allerede har. Har dere lyst på en gratis liten prøve? Mvh Michael, StayMotion` },
  { id:'seed-strandgaten', company:'Strandgaten Gjestgiveri', segment:'hotell', location:'Haugesund', website:'gjestgiveri.net', leadScore:70, channel:'email',
    notes:`Emne: Herskapshuset deres i Haugesund

Hei! Det gamle herskapshuset deres midt i Haugesund har masse karakter. Jeg lager korte videoer av bilder dere allerede har, som fanger nettopp den stemningen. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-skeisvang', company:'Skeisvang Gjestgiveri', segment:'hotell', location:'Haugesund', website:'', leadScore:68, channel:'email',
    notes:`Emne: En liten idé til Skeisvang

Hei! Gjestgiveriet deres virker som et sånt koselig sted folk husker. Jeg hjelper overnattingssteder med å vise fram stemningen sin i korte videoer, laget av bilder de allerede har. Kunne dere tenke dere en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-banken', company:'Banken Hotel Haugesund', segment:'hotell', location:'Haugesund', website:'', leadScore:70, channel:'email',
    notes:`Emne: En idé til Banken Hotel

Hei! Banken Hotel har en stil som fortjener å vises fram i bevegelse. En kort video av rommene og stemningen selger sterkere enn stillbilder. Jeg lager det ut av bildene dere har. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },

  // ---------------- UTLEIEFORVALTNING ----------------
  { id:'seed-cohost', company:'Cohost', segment:'property', location:'Stavanger', website:'cohost.no', leadScore:86, channel:'email',
    notes:`Emne: En idé til enhetene deres

Hei! Dere forvalter mange Airbnb-enheter i Stavanger og tar allerede bilder. Det som virkelig får en enhet til å skille seg ut i søket nå, er en kort video. Jeg lager sånne av bildene som allerede finnes, per enhet, uten filmedager, og dere kan gjerne tilby det videre til eierne. Skal jeg lage en gratis prøve av én enhet, så ser dere hvordan det funker? Mvh Michael, StayMotion` },
  { id:'seed-norgesbnb', company:'Norgesbnb', segment:'property', location:'Norge', website:'norgesbnb.no', leadScore:76, channel:'email',
    notes:`Emne: Video for porteføljen deres

Hei! Dere forvalter utleieboliger over hele landet, og video øker bookinger, men filmedager skalerer dårlig. Jeg lager korte videoer av bildene som allerede finnes, per bolig, raskt. Skal jeg lage en gratis prøve, så ser dere resultatet? Mvh Michael, StayMotion` },

  // ---------------- EIENDOMSMEGLERE ----------------
  { id:'seed-privatmegleren', company:'PrivatMegleren Stavanger', segment:'megler', location:'Stavanger', website:'', leadScore:78, channel:'email',
    notes:`Emne: En idé til boligannonsene

Hei [navn]! Boligene dere legger ut har fine bilder, men de står stille, akkurat som alle andres. En kort video av boligen, laget av bildene som allerede er tatt, skiller annonsen ut på Finn og gjør seg godt i verdivurderingen. Kan jeg lage en gratis prøve av en av dine aktive boliger? Mvh Michael, StayMotion` },
  { id:'seed-verdi', company:'Verdi Eiendomsmegling', segment:'megler', location:'Stavanger', website:'', leadScore:78, channel:'email',
    notes:`Emne: Video til bolig og fritid

Hei [navn]! Dere selger både bolig og fritidseiendom, og begge deler treffer sterkere i bevegelse. Jeg lager en kort video av bildene som allerede er tatt, ingen ny fotografering. Har du lyst på en gratis prøve av en aktiv annonse? Mvh Michael, StayMotion` },
  { id:'seed-aktiv', company:'Aktiv Stavanger', segment:'megler', location:'Stavanger', website:'', leadScore:72, channel:'email',
    notes:`Emne: En liten idé

Hei [navn]! En kort video av en bolig, laget av bildene som allerede finnes, gjør seg utrolig godt på Finn og sosiale medier, og gir et fortrinn når dere kjemper om oppdrag. Kan jeg lage en gratis prøve av en av dine boliger? Mvh Michael, StayMotion` },
  { id:'seed-krogsveen', company:'Krogsveen Stavanger', segment:'megler', location:'Stavanger', website:'krogsveen.no', leadScore:70, channel:'email',
    notes:`Emne: En idé som selger boligen raskere

Hei [navn]! Bildene deres er gode, og en kort video løfter dem ett hakk til, uten ny fotografering. Skal jeg lage en gratis prøve av en aktiv bolig, så ser du hvordan det blir? Mvh Michael, StayMotion` },
  { id:'seed-proaktiv', company:'Proaktiv Eiendomsmegling', segment:'megler', location:'Stavanger', website:'', leadScore:68, channel:'email',
    notes:`Emne: Boligvideo, raskt og rimelig

Hei [navn]! Jeg lager korte boligvideoer av bildene som allerede er tatt, ferdig på et par dager. Kan jeg lage en gratis prøve av en av dine boliger, så ser du kvaliteten selv? Mvh Michael, StayMotion` },
  { id:'seed-dnbsandnes', company:'DNB Eiendom Sandnes', segment:'megler', location:'Sandnes', website:'dnbeiendom.no', leadScore:66, channel:'email',
    notes:`Emne: En idé til boligannonsene

Hei [navn]! Boligene dere legger ut fortjener å skille seg ut. En kort video av boligen, laget av bildene som allerede er tatt, gjør nettopp det på Finn og Instagram. Kan jeg lage en gratis prøve av en av dine boliger? Mvh Michael, StayMotion` },

  // ---------------- RESTAURANTER ----------------
  { id:'seed-bellies', company:'Bellies', segment:'restaurant', location:'Stavanger', website:'', leadScore:70, channel:'email',
    notes:`Emne: Maten deres

Hei! Måten dere løfter grønnsaker på er noe helt eget, og det hadde sett fantastisk ut i bevegelse. Jeg gjør matbilder om til korte videoer som får folk til å ville booke bord. Skal jeg lage en gratis prøve av en av rettene deres? Mvh Michael, StayMotion` },
  { id:'seed-matmagasinet', company:'Matmagasinet', segment:'restaurant', location:'Stavanger', website:'', leadScore:66, channel:'email',
    notes:`Emne: Maten i bevegelse

Hei! Maten deres ser utrolig bra ut på bilder, men den står helt stille på Instagram. Jeg lager korte videoer av bildene dere har, som gjør folk sultne nok til å booke bord. Har dere lyst på en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-fishcow', company:'Fish & Cow', segment:'restaurant', location:'Stavanger', website:'', leadScore:66, channel:'email',
    notes:`Emne: Stemningen hos dere

Hei! Stemningen og maten hos dere er akkurat det folk deler videre. Jeg gjør bildene dere allerede har om til korte videoer, uten ny fotografering. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-gaffelkaraffel', company:'Gaffel & Karaffel', segment:'restaurant', location:'Stavanger', website:'', leadScore:64, channel:'email',
    notes:`Emne: Rettene og vinbaren

Hei! Rettene og vinbaren deres ser lekre ut på bilder, og enda bedre i bevegelse. Jeg lager korte videoer av bildene dere har. Kunne dere tenke dere en gratis prøve av en rett? Mvh Michael, StayMotion` },
  { id:'seed-heldigvis', company:'Heldigvis Restaurant & Bar', segment:'restaurant', location:'Bryne', website:'', leadScore:66, channel:'email',
    notes:`Emne: Maten deres på Bryne

Hei! Maten hos dere på Bryne ser virkelig innbydende ut. Jeg gjør matbilder om til korte videoer som får folk til å ville stikke innom. Skal jeg lage en gratis prøve av en rett? Mvh Michael, StayMotion` },
  { id:'seed-fira', company:'Fira', segment:'restaurant', location:'Sandnes', website:'', leadScore:66, channel:'email',
    notes:`Emne: Konseptet deres

Hei! Hjemmerestaurant-konseptet deres i Sandnes er personlig og fint, akkurat sånt som funker i video. Jeg lager korte videoer av bildene dere har, som fanger stemningen. Har dere lyst på en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-tispiseri', company:'Ti Spiseri', segment:'restaurant', location:'Sandnes', website:'', leadScore:64, channel:'email',
    notes:`Emne: Maten i bevegelse

Hei! Rettene deres ser flotte ut på bilder, og enda bedre i bevegelse. Jeg lager korte videoer av bildene dere har, ingen ny fotografering. Skal jeg lage en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-eigra', company:'Eigra Kjøkken & Bar', segment:'restaurant', location:'Egersund', website:'', leadScore:64, channel:'email',
    notes:`Emne: En idé til Eigra

Hei! Kjøkkenet og baren deres i Egersund ser lekre ut. Jeg gjør bildene dere har om til korte videoer som får folk til å ville komme innom. Kunne dere tenke dere en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-106ost', company:'106 grader Øst', segment:'restaurant', location:'Sandnes', website:'', leadScore:62, channel:'email',
    notes:`Emne: Street food i bevegelse

Hei! Den vietnamesiske street fooden deres er jo skapt for video. Jeg lager korte videoer av bildene dere har. Skal jeg lage en gratis prøve, så ser dere hvordan det slår ut? Mvh Michael, StayMotion` },
  { id:'seed-hereford', company:'Hereford & Friends Steakhouse', segment:'restaurant', location:'Sandnes', website:'', leadScore:62, channel:'email',
    notes:`Emne: Maten i bevegelse

Hei! En god biff ser rett og slett fantastisk ut i bevegelse. Jeg lager korte videoer av bildene dere allerede har, ingen ny fotografering. Har dere lyst på en gratis prøve? Mvh Michael, StayMotion` },

  // ---------------- PARTNERE (fotograf / byrå) ----------------
  { id:'seed-kristinetofte', company:'Kristine Tofte Foto', segment:'partner', location:'Stavanger', website:'kristinetofte.com', leadScore:85, channel:'partner',
    notes:`Emne: En idé til deg (uten at du filmer)

Hei Kristine! Arkitektur- og interiørbildene dine er virkelig fine. Får du noen gang kunder som spør etter video? Jeg lager korte videoer av bilder som allerede er tatt, ferdig på et par dager, og du kan gjerne selge det under ditt eget navn og tjene på det. Jeg leverer i bakgrunnen. Skal jeg lage en gratis prøve av ett av bildene dine, så ser du kvaliteten? Mvh Michael, StayMotion` },
  { id:'seed-firmafotografen', company:'Firmafotografen', segment:'partner', location:'Stavanger', website:'firmafotografen.no', leadScore:78, channel:'partner',
    notes:`Emne: Video som en del av pakkene deres

Hei! Dere leverer eiendoms- og interiørfoto. Kunne dere tenke dere å tilby video også, uten å dra på filmproduksjon? Jeg lager det av bildene dere allerede tar, på et par dager, gjerne under deres navn. Skal jeg lage en gratis prøve av ett av bildene deres? Mvh Michael, StayMotion` },
  { id:'seed-breel', company:'b reel social', segment:'partner', location:'Stavanger', website:'breelsocial.no', leadScore:74, channel:'partner',
    notes:`Emne: Et video-ledd dere kan tilby

Hei! Dere driver innhold og sosiale medier for bedrifter. Når en kunde trenger en gjennomført video uten en hel produksjon, kan jeg lage det for dere, av bildene som finnes, raskt og under deres navn. Skal jeg lage en gratis prøve dere kan vise fram? Mvh Michael, StayMotion` },
  { id:'seed-facefirst', company:'Facefirst', segment:'partner', location:'Stavanger', website:'facefirst.no', leadScore:70, channel:'partner',
    notes:`Emne: En enkel video-tjeneste dere kan tilby

Hei! Jeg lager korte videoer av bilder kundene allerede har, raskt og under deres navn. Det er et greit ekstra ledd i tilbudet deres med fin margin. Har dere lyst på en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-viral', company:'Viral', segment:'partner', location:'Stavanger', website:'viral.no', leadScore:68, channel:'partner',
    notes:`Emne: Et samarbeid om video

Hei! Dere lager innhold som treffer. Jeg kan være video-leddet når kundene trenger en gjennomført snutt uten filmedag, under deres navn og ferdig raskt. Skal jeg lage en gratis prøve dere kan vise en kunde? Mvh Michael, StayMotion` },
  { id:'seed-zebra', company:'Zebra Media', segment:'partner', location:'Stavanger', website:'zebramedia.no', leadScore:66, channel:'partner',
    notes:`Emne: Video-produksjon dere kan tilby

Hei! Jeg lager korte videoer av bilder som allerede finnes, et raskt supplement dere kan tilby kundene uten å filme selv. Har dere lyst på en gratis prøve? Mvh Michael, StayMotion` },
  { id:'seed-leversenfoto', company:'Leversenfoto', segment:'partner', location:'Sandnes', website:'', leadScore:72, channel:'partner',
    notes:`Emne: En idé til deg (uten at du filmer)

Hei! Så at du driver med foto i Sandnes-området. Får du noen gang spørsmål om video? Jeg lager korte videoer av bilder som allerede er tatt, ferdig på et par dager, gjerne under ditt navn. Skal jeg lage en gratis prøve av ett av bildene dine? Mvh Michael, StayMotion` },
  { id:'seed-nordsjovegen', company:'Nordsjøvegen', segment:'partner', location:'Rogaland/Vestland', website:'nordsjovegen.no', leadScore:66, channel:'partner',
    notes:`Emne: Et mulig samarbeid langs Nordsjøvegen

Hei! Dere samler mange flotte overnattings- og opplevelsessteder langs Nordsjøvegen. Jeg lager korte videoer av bilder som allerede finnes, og det kunne vært et fint tilbud til medlemmene deres. Verdt en kjapp prat? Mvh Michael, StayMotion` },
];

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

// A note still holds the original pitch (safe to refresh) if it starts with "Emne:".
function isSeedPitch(notes) {
  return typeof notes === 'string' && notes.trim().slice(0, 5) === 'Emne:';
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const existing = await listLeads();
    const byId = {};
    existing.forEach((l) => { byId[l.id] = l; });
    let created = 0, refreshed = 0, kept = 0;

    for (const base of LEADS) {
      const cur = byId[base.id];
      if (!cur) {
        await saveLead(Object.assign({ stage: 'sourced', nextAction: 'Send første e-post' }, base));
        created++;
        continue;
      }
      // Refresh the pitch only if the note is still the original seed pitch.
      if (isSeedPitch(cur.notes)) {
        const merged = Object.assign({}, cur, {
          company: base.company, segment: base.segment, location: base.location,
          website: cur.website || base.website, channel: cur.channel || base.channel,
          notes: base.notes,
        });
        await saveLead(merged);
        refreshed++;
      } else {
        kept++;
      }
    }
    res.json({ ok: true, created, refreshed, kept, total: LEADS.length,
      message: `La inn ${created} nye, oppdaterte meldingen på ${refreshed}, beholdt ${kept} med egne notater. Åpne admin → Leads.` });
  } catch (e) {
    console.error('[seed-leads]', e);
    res.status(500).json({ error: 'Kunne ikke legge inn leads' });
  }
}
