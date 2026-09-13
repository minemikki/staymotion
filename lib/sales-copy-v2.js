function clean(s=''){return String(s||'').replace(/\s+/g,' ').trim()}
function firstName(s=''){return clean(s).split(' ')[0]||''}
function signature(){return ['Med vennlig hilsen','Michael Byberg','StayMotion','michael@staymotion.no','www.staymotion.no'].join('\n')}

function profile(industry=''){
  const s=clean(industry).toLowerCase();
  if(/fris|salong|barber/.test(s)) return {kind:'salong',label:'salongen',proof:'behandlingene, resultatene og uttrykket deres',action:'booking',value:'flere av de riktige kundene til å booke time'};
  if(/tann|klinikk|kiro|fysio|behandling/.test(s)) return {kind:'klinikk',label:'klinikken',proof:'behandlingene, fagkompetansen og tryggheten dere tilbyr',action:'timebestilling',value:'gjøre det enklere for nye pasienter å velge dere og bestille time'};
  if(/bil|verksted|auto|dekk/.test(s)) return {kind:'bil',label:'verkstedet',proof:'tjenestene, kompetansen og tilliten rundt verkstedet',action:'timebestilling eller kontakt',value:'gjøre det enklere for bileiere å velge dere og ta kontakt'};
  if(/bygg|entrepren|murer|tak|rehab|rør|vvs|elekt|automasjon/.test(s)) return {kind:'handverk',label:'bedriften',proof:'prosjektene, tjenestene og kvaliteten på arbeidet deres',action:'befaring eller kontakt',value:'gjøre det enklere for potensielle kunder å forstå kvaliteten og be om tilbud'};
  if(/renhold|vask|kantine/.test(s)) return {kind:'renhold',label:'bedriften',proof:'tjenestene, områdene dere dekker og hvorfor kunder bør velge dere',action:'forespørsel eller tilbud',value:'gjøre det enklere for nye kunder å forstå tilbudet og be om pris'};
  if(/restaurant|cafe|kafé|bar|mat/.test(s)) return {kind:'servering',label:'stedet',proof:'maten, atmosfæren og opplevelsen dere tilbyr',action:'booking eller besøk',value:'gjøre flere besøkende nysgjerrige nok til å booke eller komme innom'};
  return {kind:'generisk',label:'bedriften',proof:'tilbudet, kvaliteten og det som skiller dere ut',action:'kontakt',value:'gjøre det enklere for de riktige kundene å forstå tilbudet og ta kontakt'};
}

function safeStrength(research={},p){
  const strengths=research.strengths||[];
  const human=strengths.find(x=>!/json-ld|strukturert data|sidetittel|meta|kildekod/i.test(String(x)));
  if(human){
    if(/prosjekt|referanse/i.test(human)) return p.kind==='salong'?'Dere har allerede innhold som kan brukes til å vise frem resultater og stil.':'Dere har allerede innhold som kan brukes som troverdig bevis på kvaliteten deres.';
    if(/kontaktvei|kontakt/i.test(human)) return 'Dere har allerede en tydelig vei videre for folk som vil komme i kontakt.';
  }
  if(p.kind==='salong') return 'Dere har allerede en tydelig profil og et godt utgangspunkt visuelt.';
  if(p.kind==='klinikk') return 'Dere har allerede et tydelig faglig tilbud og et godt utgangspunkt for å bygge tillit.';
  if(p.kind==='bil') return 'Dere har allerede et tydelig tjenestetilbud og et godt utgangspunkt for å bygge tillit.';
  if(p.kind==='handverk') return 'Dere har allerede et godt utgangspunkt og mye som kan brukes til å vise kvaliteten på arbeidet deres.';
  if(p.kind==='renhold') return 'Dere har allerede et tydelig tjenestetilbud og et godt utgangspunkt.';
  return 'Dere har allerede et godt utgangspunkt og et tydelig tilbud.';
}

function opportunityText(research={},p,location=''){
  const ops=research.opportunities||[];
  const keys=new Set(ops.map(x=>String(x.key||'')));
  const types=new Set(ops.map(x=>String(x.type||'')));
  const loc=clean(location).split('/')[0].split(',')[0].trim();
  const hasLocal=keys.has('local-title')||keys.has('title')||keys.has('meta')||types.has('seo');
  const hasProof=keys.has('projects')||keys.has('reviews')||types.has('trust');
  const hasCta=keys.has('cta')||types.has('cro');

  const parts=[];
  if(p.kind==='salong'){
    if(hasProof) parts.push('resultater, behandlinger og det visuelle uttrykket kan løftes tydeligere frem');
    if(hasCta) parts.push('veien fra førsteinntrykk til booking kan bli enda enklere');
    if(hasLocal&&loc) parts.push('koblingen til '+loc+' kan gjøres tydeligere for lokale søk');
  } else if(p.kind==='klinikk'){
    if(hasProof) parts.push('behandlinger, fagkompetanse og tillitsbevis kan komme tydeligere frem');
    if(hasCta) parts.push('veien til timebestilling eller kontakt kan bli mer direkte');
    if(hasLocal&&loc) parts.push('den lokale relevansen for '+loc+' kan kommuniseres tydeligere');
  } else if(p.kind==='handverk'){
    if(hasProof) parts.push('prosjekter, referanser og kvalitetsbevis kan få en større rolle');
    if(hasCta) parts.push('veien til befaring eller tilbud kan bli mer direkte');
    if(hasLocal&&loc) parts.push('tjenestene og områdene dere dekker rundt '+loc+' kan gjøres tydeligere');
  } else if(p.kind==='bil'){
    if(hasProof) parts.push('kompetanse, tjenester og tillitsbevis kan vises tydeligere');
    if(hasCta) parts.push('veien til timebestilling eller kontakt kan bli enklere');
    if(hasLocal&&loc) parts.push('den lokale relevansen rundt '+loc+' kan bli tydeligere');
  } else if(p.kind==='renhold'){
    if(hasProof) parts.push('tjenestene og hvorfor kunder bør velge dere kan komme tydeligere frem');
    if(hasCta) parts.push('veien til prisforespørsel kan bli mer direkte');
    if(hasLocal&&loc) parts.push('områdene dere dekker kan kommuniseres tydeligere');
  } else {
    if(hasProof) parts.push('det som bygger tillit og skiller dere ut kan løftes tydeligere frem');
    if(hasCta) parts.push('veien til '+p.action+' kan bli mer direkte');
    if(hasLocal&&loc) parts.push('den lokale relevansen for '+loc+' kan bli tydeligere');
  }

  if(!parts.length) return 'Jeg tror nettsiden kan løftes visuelt og strukturelt slik at den i større grad gjenspeiler kvaliteten i '+p.proof+' og gjør veien til '+p.action+' tydeligere.';
  const first=parts[0], second=parts[1], third=parts[2];
  let text='Det jeg tror kan løftes mest, er hvordan nettsiden presenterer '+p.proof+'. Konkret ser jeg at '+first;
  if(second) text+=', samtidig som '+second;
  text+='.';
  if(third) text+=' I tillegg tror jeg '+third+'.';
  return text;
}

function locationLine(location=''){
  const loc=clean(location).split('/')[0].split(',')[0].trim();
  return loc?(' i '+loc):'';
}

export function buildSalesDraft(lead={},research={}){
  const company=clean(lead.company)||'bedriften deres';
  const contact=firstName(lead.contact||'');
  const hello=contact?'Hei '+contact+',':'Hei,';
  const industry=clean(lead.industry||lead.segment||'');
  const location=clean(lead.location||'');
  const p=profile(industry);
  const positive=safeStrength(research,p);
  const gap=opportunityText(research,p,location);
  const subject='En idé til '+company;
  const local=locationLine(location);

  const intro='Jeg tok en titt på nettsiden til '+company+'. '+positive;
  const visual='Jeg tror også et mer gjennomført visuelt uttrykk kan gjøre at nettsiden i større grad matcher kvaliteten man forventer av '+p.label+local+'.';
  const business='Målet er ikke bare at siden skal se bedre ut, men å '+p.value+'.';
  const who='Jeg driver StayMotion og jobber med nettsider som skal gjøre det enklere for lokale bedrifter å bli valgt og få flere relevante henvendelser.';
  const cta='Hvis du vil, kan jeg sende over 3 konkrete ting jeg ville endret – og gjerne vise visuelt hvordan jeg ser for meg at siden kunne sett ut. Helt uforpliktende.';

  const body=[hello,'',intro,'',gap,'',visual,'',business,'',who,'',cta,'',signature()].join('\n');
  const follow1=[hello,'','Ville bare følge opp denne.','','Jeg tok kontakt fordi jeg ser noen konkrete grep som kan gjøre nettsiden til '+company+' sterkere både visuelt og kommersielt.','','Jeg kan gjerne sende de tre forslagene kort og konkret, helt uforpliktende.','',signature()].join('\n');
  const follow2=[hello,'','Siste lille oppfølging fra meg.','','Jeg lar denne ligge etter dette, men sender gjerne over forslagene hvis du er nysgjerrig på hva jeg ville endret på nettsiden til '+company+'.','',signature()].join('\n');
  return {subject,body,followup1:{subject:'Re: '+subject,body:follow1},followup2:{subject:'Re: '+subject,body:follow2},copyVersion:3,generatedAt:Date.now()};
}
