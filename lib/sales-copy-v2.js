function clean(s=''){return String(s||'').replace(/\s+/g,' ').trim()}
function firstName(s=''){return clean(s).split(' ')[0]||''}
function signature(){return ['Med vennlig hilsen','Michael Byberg','StayMotion','michael@staymotion.no','www.staymotion.no'].join('\n')}

function profile(industry=''){
  const s=clean(industry).toLowerCase();
  if(/fris|salong|barber/.test(s)) return {kind:'salong',action:'booking'};
  if(/tann|klinikk|kiro|fysio|behandling/.test(s)) return {kind:'klinikk',action:'timebestilling'};
  if(/bil|verksted|auto|dekk/.test(s)) return {kind:'bil',action:'timebestilling eller kontakt'};
  if(/bygg|entrepren|murer|tak|rehab|rør|vvs|elekt|automasjon/.test(s)) return {kind:'handverk',action:'befaring eller kontakt'};
  if(/renhold|vask|kantine/.test(s)) return {kind:'renhold',action:'forespørsel eller tilbud'};
  if(/restaurant|cafe|kafé|bar|mat/.test(s)) return {kind:'servering',action:'booking eller besøk'};
  return {kind:'generisk',action:'kontakt'};
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
  } else if(p.kind==='servering'){
    if(hasProof) parts.push('løfte frem maten, stemningen og det som gjør stedet verdt et besøk');
    if(hasCta) parts.push('gjøre booking eller praktisk informasjon enklere å finne');
    if(hasLocal&&loc) parts.push('gjøre koblingen til '+loc+' tydeligere');
  } else {
    if(hasProof) parts.push('løfte frem det som bygger tillit og skiller dere ut');
    if(hasCta) parts.push('gjøre veien til '+p.action+' mer direkte');
    if(hasLocal&&loc) parts.push('gjøre den lokale relevansen for '+loc+' tydeligere');
  }

  if(!parts.length) return 'Jeg tror nettsiden kan presentere tilbudet tydeligere og gjøre veien til '+p.action+' enklere.';
  return 'Jeg ville særlig '+joinNatural(parts)+'.';
}

function commercialImpact(p){
  if(p.kind==='salong') return 'Når det blir enklere å se behandlingene og resultatene, forstå hva dere tilbyr og finne booking, er det færre som faller av underveis. Det øker sjansen for at folk som allerede finner dere via Google, sosiale medier eller anbefalinger faktisk booker time.';
  if(p.kind==='klinikk') return 'Når behandlingene er enkle å forstå, det som bygger trygghet kommer tydelig frem og veien til timebestilling er kort, er det færre potensielle pasienter som faller av før de tar kontakt.';
  if(p.kind==='handverk') return 'Når en potensiell kunde raskt ser hva dere gjør, kvaliteten på tidligere arbeid og hvordan de ber om befaring eller tilbud, blir terskelen for å ta kontakt lavere. Det kan gjøre mer av trafikken dere allerede har om til relevante henvendelser.';
  if(p.kind==='bil') return 'Når det er lett å finne riktig tjeneste, se hvorfor man kan stole på verkstedet og komme videre til booking eller kontakt, er det mindre friksjon fra behov til timebestilling.';
  if(p.kind==='renhold') return 'Når kunder raskt forstår hvilke tjenester dere tilbyr, hvor dere jobber og hvordan de ber om pris, er det mindre sjanse for at de forsvinner videre til neste leverandør.';
  if(p.kind==='servering') return 'Når det er lett å få lyst til å besøke stedet og samtidig finne meny, praktisk informasjon og booking, blir veien fra nysgjerrighet til faktisk besøk kortere.';
  return 'Når tilbudet er lettere å forstå, tilliten bygges raskere og neste steg er tydelig, er det færre besøkende som faller av før de tar kontakt.';
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
  const impact=commercialImpact(p);
  const subject='En idé til '+company;

  const intro='Jeg tok en titt på nettsiden til '+company+'.'+(positive?' '+positive:'');
  const value='Et mer moderne og ryddig visuelt uttrykk kan gi et sterkere førsteinntrykk, men det viktigste er hva siden gjør for kunden. '+impact;
  const who='Jeg driver StayMotion og jobber med nettsider for lokale bedrifter.';
  const cta='Hvis du vil, kan jeg sende over 3 konkrete ting jeg ville endret – og gjerne vise visuelt hvordan jeg ser for meg at siden kunne sett ut. Helt uforpliktende.';

  const body=[hello,'',intro,'',gap,'',value,'',who,'',cta,'',signature()].join('\n');
  const follow1=[hello,'','Ville bare følge opp denne.','','Grunnen til at jeg tok kontakt er at jeg ser noen konkrete grep som kan gjøre nettsiden til '+company+' enklere å bruke og bedre til å få besøkende videre til '+p.action+'.','','Jeg kan gjerne sende de tre forslagene kort og konkret, helt uforpliktende.','',signature()].join('\n');
  const follow2=[hello,'','Siste lille oppfølging fra meg.','','Jeg lar denne ligge etter dette, men sender gjerne over forslagene hvis du er nysgjerrig på hva jeg ville endret på nettsiden til '+company+'.','',signature()].join('\n');
  return {subject,body,followup1:{subject:'Re: '+subject,body:follow1},followup2:{subject:'Re: '+subject,body:follow2},copyVersion:6,generatedAt:Date.now()};
}
