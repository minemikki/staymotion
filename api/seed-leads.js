// One-time lead seeder. Visit /api/seed-leads?key=<ADMIN_KEY> once and the 30
// starter leads (with a human-sounding pitch in the notes) are written into the
// CRM. Idempotent + safe: leads that already exist (by id) are skipped, so it
// never overwrites edits you've made.

import { listLeads, saveLead } from '../lib/leads.js';

const LEADS = [
  { id:'seed-bolder', company:'The Bolder ved Lysefjorden', segment:'hytte', location:'Lysefjorden', website:'thebolder.no', leadScore:92, channel:'email',
    notes:`Emne: Rask idé til The Bolder

Hei! Jeg kom over The Bolder her om dagen, og lodgene som ligger rett over Lysefjorden er helt rå. La merke til at dere har utrolig fine bilder, men nesten ingen video. Jeg driver StayMotion, et lite studio i Stavanger som lager korte, filmatiske videoer ut av bilder man allerede har (ingen ny filming). Har lyst til å lage en liten gratis snutt av ett av bildene deres, så ser dere selv hvordan det blir. Bare send meg et bilde dere liker, så har dere det tilbake i løpet av et døgn. Michael, staymotion.no` },
  { id:'seed-fjordforest', company:'Fjord & Forest Gøysa Gard', segment:'hytte', location:'Lysefjorden', website:'', leadScore:88, channel:'email',
    notes:`Emne: En liten idé til hyttene deres

Hei! De små hyttene deres med de store vinduene mot Lysefjorden er nydelige. Så at dere har fine bilder, men lite video. Jeg lager korte filmatiske videoer ut av bilder man allerede har, uten at noen må reise ut og filme. Kan lage en gratis snutt av ett av bildene deres hvis dere vil se hvordan det ser ut. Send meg gjerne et bilde dere er stolt av. Michael, staymotion.no` },
  { id:'seed-basecamp', company:'Preikestolen BaseCamp', segment:'hytte', location:'Jørpeland', website:'preikestolenbasecamp.com', leadScore:88, channel:'email',
    notes:`Emne: Video før turen til Preikestolen

Hei! Dere er jo utgangspunktet for tusenvis av Preikestolen-turer, men jeg ser at videoinnholdet ikke helt matcher naturen rundt dere ennå. Jeg lager korte filmatiske videoer ut av bilder dere allerede har, uten ny filming. Kan lage en gratis snutt av ett av bildene deres så dere ser hva jeg mener. Vil dere prøve? Michael, staymotion.no` },
  { id:'seed-skapet', company:'Skåpet Forsand', segment:'hytte', location:'Forsand', website:'', leadScore:82, channel:'email',
    notes:`Emne: Idé til hyttene i Forsand

Hei! Hyttene i Forsand er noe for seg selv, akkurat den typen sted som ser fantastisk ut i video. Jeg lager korte filmatiske klipp ut av bilder dere allerede har, ferdig på et par dager. Har lyst til å lage en gratis prøve av ett av bildene deres. Vil dere se? Michael, staymotion.no` },
  { id:'seed-husetvedhavet', company:'Huset ved Havet', segment:'hytte', location:'Jæren', website:'husetvedhavet.no', leadScore:84, channel:'email',
    notes:`Emne: Havet og huset i bevegelse

Hei! Beliggenheten deres rett ved havet på Jæren er helt rå. Bildene er fine, men en kort video som fanger bølgene og lyset gjør noe helt annet med folk som vurderer et opphold. Jeg lager sånt ut av bilder dere allerede har, ingen ny filming. Kan lage en gratis snutt hvis dere vil. Send meg et bilde dere liker. Michael, staymotion.no` },
  { id:'seed-ryvarden', company:'Ryvarden Kulturfyr', segment:'hytte', location:'Haugalandet', website:'', leadScore:80, channel:'email',
    notes:`Emne: Fyret fortjener video

Hei! Å få overnatte i det gamle fyrvokterhuset er en ganske spesiell greie, og det hadde sett utrolig bra ut i video. Jeg lager korte filmatiske klipp ut av bilder dere allerede har. Vil dere ha en gratis prøve av ett av bildene deres? Michael, staymotion.no` },
  { id:'seed-sirdalhh', company:'Sirdal Holiday Homes', segment:'hytte', location:'Sirdal', website:'sirdalholidayhomes.no', leadScore:80, channel:'email',
    notes:`Emne: Video til hyttene i Sirdal

Hei! Dere leier ut mange fine hytter i Sirdal og har sikkert et helt arkiv med bilder. Jeg gjør sånne bilder om til korte filmatiske videoer som funker bra for booking og Instagram, uten at noen må ut og filme. Kan lage en gratis prøve av en av hyttene. Vil dere se? Michael, staymotion.no` },
  { id:'seed-sageneset', company:'Sageneset Feriesenter', segment:'hytte', location:'Sirdal', website:'sageneset.no', leadScore:78, channel:'email',
    notes:`Emne: Idé før bookingsesongen

Hei! Feriesenteret deres i Sirdal har mange fine hytter. Korte videoer skiller dere godt ut i bookingsesongen, og jeg lager dem ut av bildene dere allerede har. Vil dere ha en gratis prøve? Michael, staymotion.no` },

  { id:'seed-eilertsmith', company:'Eilert Smith Hotel', segment:'hotell', location:'Stavanger', website:'eilertsmith.no', leadScore:90, channel:'email',
    notes:`Emne: Liten idé til Eilert Smith

Hei! Eilert Smith er et av de fineste stedene å bo i Stavanger, det gamle funkishuset og rommene er jo laget for film. Så at bildene står helt stille i dag. Jeg lager korte filmatiske videoer ut av bilder dere allerede har, uten ny filming, som funker fint til booking og sosiale medier. Kan lage en gratis snutt av ett av bildene deres. Vil dere se? Michael, staymotion.no` },
  { id:'seed-verkshotellet', company:'Verkshotellet Jørpeland', segment:'hotell', location:'Jørpeland', website:'', leadScore:80, channel:'email',
    notes:`Emne: Video til Verkshotellet

Hei! Verkshotellet har en veldig egen stil, og som port til Preikestolen booker jo folk mye på inntrykk. En kort video av rommene og stemningen selger bedre enn bilder alene. Jeg lager det ut av bildene dere har. Vil dere ha en gratis prøve? Michael, staymotion.no` },
  { id:'seed-hotelljaeren', company:'Hotell Jæren', segment:'hotell', location:'Bryne', website:'', leadScore:74, channel:'email',
    notes:`Emne: Idé til hotellet

Hei! Jæren har en helt egen ro og et fint lys, perfekt for en kort video som får folk til å ville bo hos dere. Jeg lager sånt ut av bilder dere allerede har. Vil dere se en gratis prøve? Michael, staymotion.no` },
  { id:'seed-ryfylkefjord', company:'Ryfylke Fjordhotell', segment:'hotell', location:'Sauda', website:'', leadScore:78, channel:'email',
    notes:`Emne: Fjordutsikten i video

Hei! Utsikten deres i Sauda er et salgsargument i seg selv, og den blir enda bedre i bevegelse. Jeg lager korte filmatiske klipp ut av bildene dere har. Vil dere ha en gratis prøve? Michael, staymotion.no` },
  { id:'seed-alvegarden', company:'Alvegården Gjestehus', segment:'hotell', location:'Haugesund', website:'', leadScore:72, channel:'email',
    notes:`Emne: Liten idé til gjestehuset

Hei! Gjestehuset deres har en sjarm som fortjener mer enn stillbilder. Jeg lager korte filmatiske videoer ut av bilder dere allerede har, uten ny filming. Vil dere se en gratis prøve? Michael, staymotion.no` },

  { id:'seed-cohost', company:'Cohost', segment:'property', location:'Stavanger', website:'cohost.no', leadScore:86, channel:'email',
    notes:`Emne: Video til enhetene deres

Hei! Dere forvalter jo mange Airbnb-enheter i Stavanger og tar allerede bilder. En ting som får enhetene til å skille seg ut i søket er korte videoer, og jeg lager dem ut av bildene som allerede finnes, per enhet, uten filmedager. Kan levere til hele porteføljen, og dere kan tilby det videre til eierne. Vil dere ha en gratis prøve av én enhet? Michael, staymotion.no` },
  { id:'seed-norgesbnb', company:'Norgesbnb', segment:'property', location:'Norge', website:'norgesbnb.no', leadScore:76, channel:'email',
    notes:`Emne: Video for porteføljen

Hei! Dere forvalter utleieboliger over hele landet. Video øker bookinger, men filmedager skalerer dårlig. Jeg lager korte klipp ut av bildene som allerede finnes, per bolig, raskt. Vil dere se en gratis prøve? Michael, staymotion.no` },

  { id:'seed-privatmegleren', company:'PrivatMegleren Stavanger', segment:'megler', location:'Stavanger', website:'', leadScore:78, channel:'email',
    notes:`Emne: Idé til boligannonsene

Hei [navn]! Boligene dere legger ut har fine bilder, men de står stille som alle andres. En kort filmatisk video av boligen, laget ut av bildene som allerede er tatt, skiller annonsen ut på Finn og Instagram og gjør seg godt i verdivurderingen. Kan lage en gratis prøve av en av boligene dine. Vil du se? Michael, staymotion.no` },
  { id:'seed-verdi', company:'Verdi Eiendomsmegling', segment:'megler', location:'Stavanger', website:'', leadScore:78, channel:'email',
    notes:`Emne: Video til bolig og fritid

Hei [navn]! Dere selger både bolig og fritidseiendom, og begge deler selger bedre i bevegelse. Jeg lager en kort video ut av bildene som allerede er tatt, ingen ny fotografering. Vil du ha en gratis prøve av en aktiv annonse? Michael, staymotion.no` },
  { id:'seed-aktiv', company:'Aktiv Stavanger', segment:'megler', location:'Stavanger', website:'', leadScore:72, channel:'email',
    notes:`Emne: Rask idé

Hei [navn]! En kort filmatisk video av en bolig, laget ut av bildene som allerede finnes, funker veldig bra på Finn og sosiale medier, og gir et fortrinn i kampen om oppdrag. Kan lage en gratis prøve av en av boligene dine. Vil du se? Michael, staymotion.no` },
  { id:'seed-krogsveen', company:'Krogsveen Stavanger', segment:'megler', location:'Stavanger', website:'krogsveen.no', leadScore:70, channel:'email',
    notes:`Emne: En video som selger raskere

Hei [navn]! Bildene deres er gode, og en kort video tar dem ett steg videre uten ny fotografering. Kan lage en gratis prøve av en aktiv bolig hvis du vil se hvordan det blir. Michael, staymotion.no` },
  { id:'seed-proaktiv', company:'Proaktiv Eiendomsmegling', segment:'megler', location:'Stavanger', website:'', leadScore:68, channel:'email',
    notes:`Emne: Boligvideo, rask og rimelig

Hei [navn]! Jeg lager korte filmatiske boligvideoer ut av bildene som allerede er tatt, ferdig på et par dager. Kan lage en gratis prøve av en av boligene dine. Vil du se? Michael, staymotion.no` },

  { id:'seed-bellies', company:'Bellies', segment:'restaurant', location:'Stavanger', website:'', leadScore:70, channel:'email',
    notes:`Emne: Maten deres i bevegelse

Hei! Måten dere setter grønnsakene i sentrum på er nydelig, og det hadde sett fantastisk ut i video. Jeg gjør matbilder om til korte filmatiske klipp som får folk til å ville booke bord, uten ny fotografering. Vil dere ha en gratis prøve av en av rettene? Michael, staymotion.no` },
  { id:'seed-matmagasinet', company:'Matmagasinet', segment:'restaurant', location:'Stavanger', website:'', leadScore:66, channel:'email',
    notes:`Emne: Maten i bevegelse

Hei! Maten deres ser utrolig bra ut på bilder, men står helt stille på Instagram. Jeg lager korte filmatiske klipp ut av bildene dere har. Vil dere ha en gratis prøve? Michael, staymotion.no` },
  { id:'seed-fishcow', company:'Fish & Cow', segment:'restaurant', location:'Stavanger', website:'', leadScore:66, channel:'email',
    notes:`Emne: Stemning i bevegelse

Hei! Stemningen og maten hos dere er jo laget for reels. Jeg gjør bildene dere allerede har om til korte filmatiske klipp, ingen ny fotografering. Vil dere ha en gratis prøve? Michael, staymotion.no` },
  { id:'seed-gaffelkaraffel', company:'Gaffel & Karaffel', segment:'restaurant', location:'Stavanger', website:'', leadScore:64, channel:'email',
    notes:`Emne: Tapas og vin i bevegelse

Hei! Rettene og vinbaren deres ser flotte ut på bilder, og enda bedre i bevegelse. Jeg lager korte filmatiske klipp ut av bildene dere har. Vil dere ha en gratis prøve av en rett? Michael, staymotion.no` },

  { id:'seed-kristinetofte', company:'Kristine Tofte Foto', segment:'partner', location:'Stavanger', website:'kristinetofte.com', leadScore:85, channel:'partner',
    notes:`Emne: Et videotilbud til kundene dine

Hei Kristine! Arkitektur- og interiørbildene dine er nydelige. Får du noen gang spørsmål om video? Jeg lager korte filmatiske videoer ut av bilder som allerede er tatt, ferdig på et par dager. Du kan tilby det til kundene dine som en ekstra ting, tjene litt på det, og jeg leverer i bakgrunnen (gjerne under ditt navn). Kan lage en gratis prøve av ett av bildene dine hvis du vil se kvaliteten. Michael, staymotion.no` },
  { id:'seed-firmafotografen', company:'Firmafotografen', segment:'partner', location:'Stavanger', website:'firmafotografen.no', leadScore:78, channel:'partner',
    notes:`Emne: Legg til video i pakkene

Hei! Dere leverer eiendoms- og interiørfoto. Vil dere kunne tilby video også, uten å dra på filmproduksjon? Jeg lager det ut av bildene dere allerede tar, på et par dager, gjerne under deres navn. Kan lage en gratis prøve av ett av bildene deres. Vil dere se? Michael, staymotion.no` },
  { id:'seed-breel', company:'b reel social', segment:'partner', location:'Stavanger', website:'breelsocial.no', leadScore:74, channel:'partner',
    notes:`Emne: Video-leddet dere kan tilby

Hei! Dere driver innhold og sosiale medier for bedrifter. Når en kunde trenger en filmatisk video uten en hel produksjon, kan jeg lage det for dere, ut av bildene som finnes, på et par dager, under deres navn. Vil dere ha en gratis prøve å vise en kunde? Michael, staymotion.no` },
  { id:'seed-facefirst', company:'Facefirst', segment:'partner', location:'Stavanger', website:'facefirst.no', leadScore:70, channel:'partner',
    notes:`Emne: En enkel video-tjeneste dere kan tilby

Hei! Jeg lager korte filmatiske videoer ut av bilder kundene allerede har, raskt og under deres navn. Grei ekstra ting å ha i tilbudet med litt margin. Vil dere se en gratis prøve? Michael, staymotion.no` },
  { id:'seed-viral', company:'Viral', segment:'partner', location:'Stavanger', website:'viral.no', leadScore:68, channel:'partner',
    notes:`Emne: Video som samarbeid

Hei! Dere lager innhold som treffer. Jeg kan være video-leddet når kundene trenger en filmatisk snutt uten filmedag, under deres navn, ferdig raskt. Vil dere ha en gratis prøve å vise en kunde? Michael, staymotion.no` },
  { id:'seed-zebra', company:'Zebra Media', segment:'partner', location:'Stavanger', website:'zebramedia.no', leadScore:66, channel:'partner',
    notes:`Emne: Video-produksjon dere kan tilby

Hei! Jeg lager korte filmatiske videoer ut av bilder som allerede finnes, et raskt supplement dere kan tilby kundene uten å filme selv. Vil dere ha en gratis prøve? Michael, staymotion.no` },
];

function authed(req) {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = (req.query && req.query.key) || req.headers['x-admin-key'];
  return given === key;
}

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'Ikke autorisert' });
  try {
    const existing = await listLeads();
    const ids = existing.map((l) => l.id);
    let created = 0, skipped = 0;
    for (const base of LEADS) {
      if (ids.indexOf(base.id) >= 0) { skipped++; continue; }
      await saveLead(Object.assign({ stage: 'sourced', nextAction: 'Send første e-post' }, base));
      created++;
    }
    res.json({ ok: true, created, skipped, total: LEADS.length,
      message: `La inn ${created} nye leads (hoppet over ${skipped} som allerede fantes). Åpne admin → Leads.` });
  } catch (e) {
    console.error('[seed-leads]', e);
    res.status(500).json({ error: 'Kunne ikke legge inn leads' });
  }
}
