function clean(s=''){return String(s||'').replace(/\s+/g,' ').trim()}
function firstName(s=''){return clean(s).split(' ')[0]||''}
function signature(){return ['Med vennlig hilsen','Michael Byberg','StayMotion','michael@staymotion.no','www.staymotion.no'].join('\n')}

function profile(industry=''){
  const s=clean(industry).toLowerCase();
  if(/fris|salong|barber/.test(s)) return {kind:'salong',action:'booking',value:'få flere av de riktige kundene til å booke time'};
  if(/tann|klinikk|kiro|fysio|behandling/.test(s)) return {kind:'klinikk',action:'timebestilling',value:'gjøre det enklere for nye pasienter å velge dere og bestille time'};
  if(/bil|verksted|auto|dekk/.test(s)) return {kind:'bil',action:'timebestilling eller kontakt',value:'gjøre det enklere for bileiere å velge dere og ta kontakt'};
  if(/bygg|entrepren|murer|tak|rehab|rør|vvs|elekt|automasjon/.test(s)) return {kind:'handverk',action:'befaring eller kontakt',value:'gjøre det enklere for potensielle kunder å se kvaliteten og be om tilbud'};
  if(/renhold|vask|kantine/.test(s)) return {kind:'renhold',action:'forespørsel eller tilbud',value:'gjøre det enklere for nye kunder å forstå tilbudet og be om pris'};
  if(/restaurant|cafe|kafé|bar|mat/.test(s)) return {kind:'servering',action:'booking eller besøk',value:'gjøre flere besøkende nysgjerrige nok til å booke eller komme innom'};
  return {kind:'generisk',action:'kontakt',value:'gjøre det enklere for de riktige kundene å forstå tilbudet og ta kontakt'};
}

function verifiedPositive(research={},p){
  const strengths=research.strengths||[];
  const human=strengths.find(x=>!/json-ld|strukturert data|sidetittel|meta|kildekod|schema|h1/i.test(String(x)));
  if(!human) return '';
  if(/prosjekt|referanse/i.test(human)) return p.kind==='salong'?'Dere har innhold som kan brukes til å vise frem resultater og stil.':'Dere har prosjekt-/referanseinnhold som kan brukes tydeligere som salgsbevis.';
  if(/kontaktvei|kontakt/i.test(human)) return 'Det er allerede enkelt å finne en vei videre til kontakt.';
  if(/omtale|anmeld/i.test(human)) return 'Dere har tillitsbevis som kan brukes enda tydeligere på siden.';
  return '';
}

function joinNatural(parts=[]){
  if(parts.length===0) return '';
  if(parts.length===1) return parts[0];
  if(parts.length===2) return parts[0]+' og '+parts[1];
  return parts.slice(0,-1).join(', ')+' og '+parts[parts.length-1];
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
    if(hasProof) parts.push('løfte frem behandlinger, resultater og selve salongopplevelsen tydeligere');
    if(hasCta) parts.push('gjøre booking mer synlig');
    if(hasLocal&&loc) parts.push('styrke koblingen til '+loc+' i lokale søk');
  } else if(p.kind==='klinikk'){
    if(hasProof) parts.push('løfte frem behandlinger, fagkompetanse og det som bygger trygghet');
    if(hasCta) parts.push('gjøre veien til timebestilling mer direkte');
    if(hasLocal&&loc) parts.push('gjøre den lokale relevansen for '+loc+' tydeligere');
  } else if(p.kind==='handverk'){
    if(hasProof) parts.push('gi prosjekter, referanser og kvalitetsbevis en større rolle');
    if(hasCta) parts.push('gjøre veien til befaring eller tilbud mer direkte');
    if(hasLocal&&loc) parts.push('gjøre tjenestene og områdene rundt '+loc+' tydeligere');
  } else if(p.kind==='bil'){
    if(hasProof) parts.push('vise kompetanse, tjenester og tillitsbevis tydeligere');
    if(hasCta) parts.push('gjøre veien til timebestilling mer direkte');
    if(hasLocal&&loc) parts.push('gjøre den lokale relevansen rundt '+loc+' tydeligere');
  } else if(p.kind==='renhold'){
    if(hasProof) parts.push('forklare tydeligere hvorfor kunder bør velge dere');
    if(hasCta) parts.push('gjøre veien til prisforespørsel kortere');
    if(hasLocal&&loc) parts.push('vise områdene dere dekker tydeligere');
  } else {
    if(hasProof) parts.push('løfte frem det som bygger tillit og skiller dere ut');
    if(hasCta) parts.push('gjøre veien til '+p.action+' mer direkte');
    if(hasLocal&&loc) parts.push('gjøre den lokale relevansen for '+loc+' tydeligere');
  }

  if(!parts.length) return 'Jeg tror nettsiden kan presentere tilbudet tydeligere og gjøre veien til '+p.action+' enklere.';
  return 'Jeg ville særlig '+joinNatural(parts)+'.';
}

export function buildSalesDraft(lead={},research={}){
  const company=clean(lead.company)||'bedriften deres';
  const contact=firstName(lead.contact||'');
  const hello=contact?'Hei '+contact+',':'Hei,';
  const industry=clean(lead.industry||lead.segment||'');
  const location=clean(lead.location||'');
  const p=profile(industry);
  const positive=verifiedPositive(research,p);
  const gap=opportunityText(research,p,location);
  const subject='En idé til '+company;

  const intro='Jeg tok en titt på nettsiden til '+company+'.'+(positive?' '+positive:'');
  const visual='Et mer moderne og ryddig visuelt uttrykk, sammen med disse grepene, kan gi et sterkere førsteinntrykk og gjøre '+p.action+' enklere å få øye på.';
  const business='Målet er ikke bare at siden skal se bedre ut, men å '+p.value+'.';
  const who='Jeg driver StayMotion og jobber med nettsider som skal gjøre det enklere for lokale bedrifter å bli valgt og få flere relevante henvendelser.';
  const cta='Hvis du vil, kan jeg sende over 3 konkrete ting jeg ville endret – og gjerne vise visuelt hvordan jeg ser for meg at siden kunne sett ut. Helt uforpliktende.';

  const body=[hello,'',intro,'',gap,'',visual+' '+business,'',who,'',cta,'',signature()].join('\n');
  const follow1=[hello,'','Ville bare følge opp denne.','','Jeg tok kontakt fordi jeg ser noen konkrete grep som kan gjøre nettsiden til '+company+' sterkere både visuelt og kommersielt.','','Jeg kan gjerne sende de tre forslagene kort og konkret, helt uforpliktende.','',signature()].join('\n');
  const follow2=[hello,'','Siste lille oppfølging fra meg.','','Jeg lar denne ligge etter dette, men sender gjerne over forslagene hvis du er nysgjerrig på hva jeg ville endret på nettsiden til '+company+'.','',signature()].join('\n');
  return {subject,body,followup1:{subject:'Re: '+subject,body:follow1},followup2:{subject:'Re: '+subject,body:follow2},copyVersion:5,generatedAt:Date.now()};
}
