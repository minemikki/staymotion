// One-time lead seeder. Visit /api/seed-leads?key=<ADMIN_KEY> once and the 30
// starter leads (with their pitch in the notes) are written into the CRM.
// Idempotent + safe: leads that already exist (by id) are skipped, so it never
// overwrites edits you've made. Re-running only fills in missing ones.

import { listLeads, saveLead } from '../lib/leads.js';

const LEADS = [
  { id:'seed-bolder', company:'The Bolder ved Lysefjorden', segment:'hytte', location:'Lysefjorden', website:'thebolder.no', leadScore:92, channel:'email',
    notes:`Emne: De arkitekttegnede lodgene fortjener bevegelse

Hei! The Bolder er noe av det vakreste langs Lysefjorden – lodgene som svever over fjorden er rene postkort. Dere har fantastiske stillbilder, men lite video som lar folk føle utsikten i bevegelse. Vi lager cinematiske videoer fra bildene dere allerede har – uten ny filming. Vil dere ha et kort, gratis eksempel fra ett av bildene deres? – Michael, staymotion.no` },
  { id:'seed-fjordforest', company:'Fjord & Forest Gøysa Gard', segment:'hytte', location:'Lysefjorden', website:'', leadScore:88, channel:'email',
    notes:`Emne: Mini-hyttene med den store utsikten – i bevegelse

Hei! De små hyttene med de store vinduene mot Lysefjorden er en drøm. En kort video som viser lyset og fjorden i bevegelse er det som får folk til å booke. Vi lager det fra bildene dere allerede har, uten ny filming. Gratis eksempel fra ett av bildene deres? – Michael, staymotion.no` },
  { id:'seed-basecamp', company:'Preikestolen BaseCamp', segment:'hytte', location:'Jørpeland', website:'preikestolenbasecamp.com', leadScore:88, channel:'email',
    notes:`Emne: Video som selger overnattingen før turen til Preikestolen

Hei! Dere er startpunktet for tusenvis av Preikestolen-turer hvert år. Vi gjør bildene dere har (hytter, stemning, fjell) om til korte cinematiske klipp for Instagram og booking – uten ny filming. Vil dere ha et gratis eksempel fra ett av bildene deres? – Michael, staymotion.no` },
  { id:'seed-skapet', company:'Skåpet Forsand', segment:'hytte', location:'Forsand', website:'', leadScore:82, channel:'email',
    notes:`Emne: De prisbelønte turhyttene i bevegelse

Hei! De arkitekttegnede hyttene i Forsand er unike – nøyaktig den typen sted som skinner i video. Vi lager cinematiske klipp fra bildene dere allerede har, uten ny filming, klart på et par dager. Vil dere se et gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-husetvedhavet', company:'Huset ved Havet', segment:'hytte', location:'Jæren', website:'husetvedhavet.no', leadScore:84, channel:'email',
    notes:`Emne: Havet, lyset og huset – i bevegelse

Hei! Beliggenheten rett ved havet på Jæren er rå. En kort video som fanger bølgene, lyset og roen selger et opphold. Vi lager det fra bildene dere allerede har, uten ny filming. Gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-ryvarden', company:'Ryvarden Kulturfyr', segment:'hytte', location:'Haugalandet', website:'', leadScore:80, channel:'email',
    notes:`Emne: Fyret som fortjener en filmatisk video

Hei! Å overnatte i det gamle fyrvokterhuset er en helt spesiell opplevelse – og det roper etter cinematisk video. Vi lager det fra bildene dere allerede har, uten ny filming. Gratis eksempel fra ett av bildene deres? – Michael, staymotion.no` },
  { id:'seed-sirdalhh', company:'Sirdal Holiday Homes', segment:'hytte', location:'Sirdal', website:'sirdalholidayhomes.no', leadScore:80, channel:'email',
    notes:`Emne: Cinematisk video til hyttene deres – uten ny filming

Hei! Dere leier ut flotte hytter i Sirdal og har sikkert et helt arkiv med gode bilder. Vi gjør dem om til korte cinematiske videoer som fyller flere uker – uten at noen reiser ut og filmer. Gratis eksempel fra én av hyttene? – Michael, staymotion.no` },
  { id:'seed-sageneset', company:'Sageneset Feriesenter', segment:'hytte', location:'Sirdal', website:'sageneset.no', leadScore:78, channel:'email',
    notes:`Emne: Fyll flere uker med cinematisk video av hyttene

Hei! Feriesenteret i Sirdal har mange fine hytter – perfekt for korte reels som skiller dere ut i bookingsesongen. Vi lager dem fra bildene dere allerede har. Gratis eksempel? – Michael, staymotion.no` },

  { id:'seed-eilertsmith', company:'Eilert Smith Hotel', segment:'hotell', location:'Stavanger', website:'eilertsmith.no', leadScore:90, channel:'email',
    notes:`Emne: Boutique-hotellet fortjener boutique-video

Hei! Eilert Smith er et av de fineste boutique-hotellene i Stavanger – funkishuset og romdesignen er laget for film. I dag står bildene stille. Vi lager korte cinematiske videoer fra bildene dere allerede har – uten ny filming – til booking og sosiale medier. Gratis eksempel fra ett av bildene deres? – Michael, staymotion.no` },
  { id:'seed-verkshotellet', company:'Verkshotellet Jørpeland', segment:'hotell', location:'Jørpeland', website:'', leadScore:80, channel:'email',
    notes:`Emne: Video som viser hotellet i bevegelse

Hei! Verkshotellet har en fin, egen karakter – og som port til Preikestolen booker gjester på inntrykk. En kort cinematisk video av rommene og stemningen selger bedre enn stillbilder. Vi lager det fra bildene dere har. Gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-hotelljaeren', company:'Hotell Jæren', segment:'hotell', location:'Bryne', website:'', leadScore:74, channel:'email',
    notes:`Emne: Kort video som løfter bookingene

Hei! Jæren har en helt egen ro og lys – perfekt for en kort cinematisk video som får folk til å ville bo hos dere. Vi lager den fra bildene dere allerede har, uten ny filming. Gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-ryfylkefjord', company:'Ryfylke Fjordhotell', segment:'hotell', location:'Sauda', website:'', leadScore:78, channel:'email',
    notes:`Emne: Fjorden i bevegelse selger rom

Hei! Fjordutsikten i Sauda er et salgsargument i seg selv – men den kommer virkelig til live i video. Vi lager korte cinematiske klipp fra bildene dere har. Gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-alvegarden', company:'Alvegården Gjestehus', segment:'hotell', location:'Haugesund', website:'', leadScore:72, channel:'email',
    notes:`Emne: Video som gir gjestehuset et løft

Hei! Gjestehuset deres har sjarm som fortjener mer enn stillbilder. Vi lager korte cinematiske videoer fra bildene dere allerede har, uten ny filming. Gratis eksempel? – Michael, staymotion.no` },

  { id:'seed-cohost', company:'Cohost', segment:'property', location:'Stavanger', website:'cohost.no', leadScore:86, channel:'email',
    notes:`Emne: Video til hele porteføljen – uten filmedag

Hei! Dere forvalter mange Airbnb-enheter i Stavanger og tar allerede bilder. Neste steg: korte cinematiske videoer, per enhet, uten en eneste filmedag. Vi kan levere til hele porteføljen, og dere kan tilby det videre til eierne. Gratis eksempel fra én enhet? – Michael, staymotion.no` },
  { id:'seed-norgesbnb', company:'Norgesbnb', segment:'property', location:'Norge', website:'norgesbnb.no', leadScore:76, channel:'email',
    notes:`Emne: Cinematisk video for utleie-porteføljen

Hei! Dere forvalter utleieboliger over hele landet. Video øker bookinger, men filmedager skalerer ikke. Vi lager korte cinematiske klipp fra bildene som allerede finnes – per bolig, raskt, uten ny filming. Gratis eksempel? – Michael, staymotion.no` },

  { id:'seed-privatmegleren', company:'PrivatMegleren Stavanger', segment:'megler', location:'Stavanger', website:'', leadScore:78, channel:'email',
    notes:`Emne: En cinematisk video per bolig – uten ny fotografering

Hei [navn]! Boligene dere legger ut har flotte bilder – men de står stille, som alle andres. En kort cinematisk video (laget fra bildene som allerede er tatt) skiller annonsen ut på Finn og Instagram, og imponerer i verdivurderingen. Vil du at jeg lager en gratis smakebit av en av dine aktive boliger? – Michael, staymotion.no` },
  { id:'seed-verdi', company:'Verdi Eiendomsmegling', segment:'megler', location:'Stavanger', website:'', leadScore:78, channel:'email',
    notes:`Emne: Video til bolig- og fritidsannonsene

Hei [navn]! Dere selger både bolig og fritidseiendom – begge deler selger bedre i bevegelse. Vi lager en cinematisk video fra bildene som allerede er tatt, ingen ny fotografering. Gratis smakebit av en aktiv annonse? – Michael, staymotion.no` },
  { id:'seed-aktiv', company:'Aktiv Stavanger', segment:'megler', location:'Stavanger', website:'', leadScore:72, channel:'email',
    notes:`Emne: Skil annonsene ut med cinematisk video

Hei [navn]! Rask idé: en kort cinematisk video av en bolig, laget fra bildene som allerede finnes – perfekt for Finn og sosiale medier, og et fortrinn i kampen om oppdrag. Gratis eksempel av en av dine boliger? – Michael, staymotion.no` },
  { id:'seed-krogsveen', company:'Krogsveen Stavanger', segment:'megler', location:'Stavanger', website:'krogsveen.no', leadScore:70, channel:'email',
    notes:`Emne: En video som selger boligen raskere

Hei [navn]! Bildene deres er gode – en kort cinematisk video tar dem ett steg videre, uten ny fotografering. Vil du at jeg lager en gratis smakebit av en aktiv bolig? – Michael, staymotion.no` },
  { id:'seed-proaktiv', company:'Proaktiv Eiendomsmegling', segment:'megler', location:'Stavanger', website:'', leadScore:68, channel:'email',
    notes:`Emne: Cinematisk boligvideo – rask og rimelig

Hei [navn]! Vi lager en kort cinematisk video av en bolig fra bildene som allerede er tatt – ferdig på et par dager, fra 1 990 kr. Gratis eksempel av en av dine boliger? – Michael, staymotion.no` },

  { id:'seed-bellies', company:'Bellies', segment:'restaurant', location:'Stavanger', website:'', leadScore:70, channel:'email',
    notes:`Emne: Grønnsakene deres i bevegelse

Hei! Måten dere setter grønnsaker i sentrum på er nydelig – og det fortjener video. Vi gjør matbildene deres om til korte cinematiske klipp (bevegelse, lys, stemning) som får folk til å ville booke bord. Ingen ny fotografering. Gratis eksempel av en rett? – Michael, staymotion.no` },
  { id:'seed-matmagasinet', company:'Matmagasinet', segment:'restaurant', location:'Stavanger', website:'', leadScore:66, channel:'email',
    notes:`Emne: Maten deres, i bevegelse

Hei! Maten ser fantastisk ut på bildene – men den står helt stille på Instagram. Vi lager korte cinematiske klipp fra bildene dere har, som får folk til å ville booke bord. Gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-fishcow', company:'Fish & Cow', segment:'restaurant', location:'Stavanger', website:'', leadScore:66, channel:'email',
    notes:`Emne: Brasserie-stemning i bevegelse

Hei! Stemningen og maten hos dere er laget for reels. Vi gjør bildene dere allerede har om til korte cinematiske klipp – ingen ny fotografering. Gratis eksempel? – Michael, staymotion.no` },
  { id:'seed-gaffelkaraffel', company:'Gaffel & Karaffel', segment:'restaurant', location:'Stavanger', website:'', leadScore:64, channel:'email',
    notes:`Emne: Tapas og vin – i bevegelse

Hei! Rettene og vinbaren deres ser flotte ut i bilder – enda bedre i bevegelse. Vi lager korte cinematiske klipp fra bildene dere har. Gratis eksempel av en rett? – Michael, staymotion.no` },

  { id:'seed-kristinetofte', company:'Kristine Tofte Foto', segment:'partner', location:'Stavanger', website:'kristinetofte.com', leadScore:85, channel:'partner',
    notes:`Emne: Et videotilbud til kundene dine (uten at du filmer)

Hei Kristine! Arkitektur- og interiørbildene dine er nydelige. Får du noen gang spørsmål om video? Vi lager cinematiske videoer fra bildene du allerede har tatt – ferdig på 48 timer. Du kan tilby det som en ekstra linje, tjene margin, og vi leverer i bakgrunnen (gjerne under ditt navn). Gratis prøve fra ett av bildene dine? – Michael, staymotion.no` },
  { id:'seed-firmafotografen', company:'Firmafotografen', segment:'partner', location:'Stavanger', website:'firmafotografen.no', leadScore:78, channel:'partner',
    notes:`Emne: Legg til video i pakkene dine – vi produserer

Hei! Dere leverer eiendoms- og interiørfoto. Vil dere kunne tilby cinematisk video også, uten å dra på filmproduksjon? Vi lager det fra bildene dere allerede tar, på 48 timer, gjerne white-label. Gratis prøve fra ett av bildene deres? – Michael, staymotion.no` },
  { id:'seed-breel', company:'b reel social', segment:'partner', location:'Stavanger', website:'breelsocial.no', leadScore:74, channel:'partner',
    notes:`Emne: Cinematisk video-produksjon til kundene deres

Hei! Dere driver innhold og sosiale medier for bedrifter. Når en kunde trenger cinematisk video uten en hel filmproduksjon, kan vi levere det for dere – fra bildene som finnes, på 48 timer, white-label. Gratis prøve å vise en kunde? – Michael, staymotion.no` },
  { id:'seed-facefirst', company:'Facefirst', segment:'partner', location:'Stavanger', website:'facefirst.no', leadScore:70, channel:'partner',
    notes:`Emne: Video-leddet dere kan tilby uten å filme

Hei! Vi lager cinematiske videoer fra bilder kundene allerede har – raskt og white-label. Et enkelt ekstra ledd i tilbudet deres med god margin. Gratis prøve? – Michael, staymotion.no` },
  { id:'seed-viral', company:'Viral', segment:'partner', location:'Stavanger', website:'viral.no', leadScore:68, channel:'partner',
    notes:`Emne: Cinematisk video som partner

Hei! Dere lager innhold som treffer – vi kan være cinematisk video-leddet når kundene trenger det, uten filmedag. White-label, 48 timer. Gratis prøve å vise en kunde? – Michael, staymotion.no` },
  { id:'seed-zebra', company:'Zebra Media', segment:'partner', location:'Stavanger', website:'zebramedia.no', leadScore:66, channel:'partner',
    notes:`Emne: Video-produksjon på 48 timer, white-label

Hei! Vi lager cinematiske videoer fra eksisterende bilder – et raskt supplement dere kan tilby kundene deres uten å filme selv. Gratis prøve? – Michael, staymotion.no` },
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
