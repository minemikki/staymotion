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
  if(!human) return {text:'',topic:''};

  if(/prosjekt|referanse/i.test(human)){
    if(p.kind==='salong') return {text:'Dere har allerede innhold som viser frem arbeidet deres og som kan få en tydeligere rolle på siden.',topic:'proof'};
    if(p.kind==='handverk') return {text:'Dere har allerede innhold fra utførte jobber som er verdifullt å vise frem.',topic:'proof'};
    if(p.kind==='bil') return {text:'Dere har allerede innhold som kan brukes til å vise erfaring og arbeid dere har gjort.',topic:'proof'};
    return {text:'Dere har allerede innhold som bygger tillit og som kan få en tydeligere rolle på siden.',topic:'proof'};
  }

  if(/omtale|anmeld/i.test(human)) return {text:'Dere har allerede kundeomtaler som bygger tillit.',topic:'reviews'};
  if(/kontaktvei|kontakt/i.test(human)) return {text:'Det er allerede lett å finne kontaktinformasjonen deres.',topic:'contact'};
  return {text:'',topic:''};
}

function joinNatural(parts=[]){
  if(parts.length===0) return '';
  if(parts.length===1) return parts[0];
  if(parts.length===2) return parts[0]+' og '+parts[1];
  return parts.slice(0,-1).join(', ')+' og '+parts[parts.length-1];
}

function opportunityText(research={},p,location='',coveredTopic=''){
  const ops=research.opportunities||[];
  const keys=new Set(ops.map(x=>String(x.key||'')));
  const types=new Set(ops.map(x=>String(x.type||'')));
  const loc=clean(location).split('/')[0].split(',')[0].trim();
  const hasLocal=keys.has('local-title')||keys.has('title')||keys.has('meta')||types.has('seo');
  const hasProof=keys.has('projects')||keys.has('reviews')||types.has('trust');
  const hasCta=keys.has('cta')||types.has('cro');
  const parts=[];

  if(p.kind==='salong'){
    if(hasProof&&coveredTopic!=='proof') parts.push('løfte frem behandlinger og resultater tydeligere');
    if(hasCta) parts.push('gjøre booking enklere å få øye på');
    if(hasLocal&&loc&&parts.length<2) parts.push('styrke koblingen til '+loc+' i lokale søk');
    if(!parts.length&&coveredTopic==='proof') parts.push('knytte resultatene tydeligere til behandlingene og gjøre tilbudet enklere å forstå');
  } else if(p.kind==='klinikk'){
    if(hasProof&&coveredTopic!=='proof') parts.push('løfte frem behandlinger, fagkompetanse og det som bygger trygghet');
    if(hasCta) parts.push('gjøre veien til timebestilling kortere');
    if(hasLocal&&loc&&parts.length<2) parts.push('gjøre den lokale relevansen for '+loc+' tydeligere');
    if(!parts.length&&coveredTopic==='proof') parts.push('knytte det som bygger tillit tydeligere til behandlingene dere tilbyr');
  } else if(p.kind==='handverk'){
    if(hasProof&&coveredTopic!=='proof') parts.push('gi tidligere arbeid en større rolle');
    if(hasCta) parts.push('gjøre veien til befaring eller tilbud kortere');
    if(hasLocal&&loc&&parts.length<2) parts.push('gjøre tjenestene og områdene dere jobber i tydeligere');
    if(!parts.length&&coveredTopic==='proof') parts.push('knytte tidligere arbeid tydeligere til hva dere kan hjelpe kunden med');
  } else if(p.kind==='bil'){
    if(hasProof&&coveredTopic!=='proof') parts.push('vise tjenester, erfaring og arbeid dere har gjort tydeligere');
    if(hasCta) parts.push('gjøre veien til timebestilling eller kontakt kortere');
    if(hasLocal&&loc&&parts.length<2) parts.push('gjøre den lokale relevansen rundt '+loc+' tydeligere');
    if(!parts.length&&coveredTopic==='proof') parts.push('knytte tidligere arbeid tydeligere til tjenestene dere tilbyr');
  } else if(p.kind==='renhold'){
    if(hasProof&&coveredTopic!=='proof') parts.push('vise tydeligere hvorfor kunder bør velge dere');
    if(hasCta) parts.push('gjøre veien til prisforespørsel kortere');
    if(hasLocal&&loc&&parts.length<2) parts.push('vise områdene dere dekker tydeligere');
    if(!parts.length&&coveredTopic==='proof') parts.push('gjøre det enklere å forstå hva som skiller dere fra andre leverandører');
  } else if(p.kind==='servering'){
    if(hasProof&&coveredTopic!=='proof') parts.push('løfte frem maten, stemningen og det som gjør stedet verdt et besøk');
    if(hasCta) parts.push('gjøre booking og praktisk informasjon enklere å finne');
    if(hasLocal&&loc&&parts.length<2) parts.push('gjøre koblingen til '+loc+' tydeligere');
    if(!parts.length&&coveredTopic==='proof') parts.push('gi det som gjør stedet spesielt en tydeligere rolle på siden');
  } else {
    if(hasProof&&coveredTopic!=='proof') parts.push('løfte frem det som bygger tillit og skiller dere ut');
    if(hasCta) parts.push('gjøre veien til '+p.action+' kortere');
    if(hasLocal&&loc&&parts.length<2) parts.push('gjøre den lokale relevansen for '+loc+' tydeligere');
    if(!parts.length&&coveredTopic==='proof') parts.push('knytte det som bygger tillit tydeligere til det dere tilbyr');
  }

  if(!parts.length) return 'Jeg tror nettsiden kan presentere tilbudet tydeligere og gjøre neste steg enklere for kunden.';
  return 'Jeg ville særlig '+joinNatural(parts)+'.';
}

function commercialImpact(p){
  if(p.kind==='salong') return 'Sammen med et mer moderne visuelt uttrykk kan det gi et sterkere førsteinntrykk og gjøre det enklere for nye kunder å forstå tilbudet, få tillit til salongen og faktisk booke time.';
  if(p.kind==='klinikk') return 'Sammen med et rolig og moderne visuelt uttrykk kan det gjøre det lettere for nye pasienter å forstå tilbudet og føle seg trygge nok til å bestille time.';
  if(p.kind==='handverk') return 'Sammen med et mer moderne visuelt uttrykk kan det gi et sterkere førsteinntrykk og gjøre det enklere for nye kunder å forstå kvaliteten på arbeidet deres og føle seg trygge nok til å ta kontakt.';
  if(p.kind==='bil') return 'Sammen med et mer moderne og ryddig uttrykk kan det gjøre det enklere for nye kunder å forstå tjenestene, få tillit til verkstedet og gå videre til timebestilling eller kontakt.';
  if(p.kind==='renhold') return 'Sammen med et mer moderne og ryddig uttrykk kan det gjøre det enklere for nye kunder å forstå hva dere tilbyr, få tillit til bedriften og be om pris eller tilbud.';
  if(p.kind==='servering') return 'Sammen med et sterkere visuelt uttrykk kan det gjøre det lettere å få lyst til å besøke stedet og samtidig finne det man trenger for å booke eller komme innom.';
  return 'Sammen med et mer moderne og ryddig visuelt uttrykk kan det gi et sterkere førsteinntrykk og gjøre det enklere for nye kunder å forstå tilbudet og føle seg trygge nok til å ta kontakt.';
}

export function buildSalesDraft(lead={},research={}){
  const company=clean(lead.company)||'bedriften deres';
  const contact=firstName(lead.contact||'');
  const hello=contact?'Hei '+contact+',':'Hei,';
  const industry=clean(lead.industry||lead.segment||'');
  const location=clean(lead.location||'');
  const p=profile(industry);
  const positive=verifiedPositive(research,p);
  const gap=opportunityText(research,p,location,positive.topic);
  const impact=commercialImpact(p);
  const subject='En idé til '+company;

  const intro='Jeg tok en titt på nettsiden til '+company+'.'+(positive.text?' '+positive.text:'');
  const who='Jeg driver StayMotion og jobber med nettsider for lokale bedrifter.';
  const cta='Hvis du vil, kan jeg sende over 3 konkrete ting jeg ville endret – og gjerne vise visuelt hvordan jeg ser for meg at siden kunne sett ut. Helt uforpliktende.';

  const body=[hello,'',intro,'',gap,'',impact,'',who,'',cta,'',signature()].join('\n');
  const follow1=[hello,'','Ville bare følge opp denne.','','Jeg tror det er noen ganske enkle grep som kan gjøre nettsiden til '+company+' tydeligere og mer overbevisende for nye kunder.','','Jeg kan gjerne sende de tre forslagene kort og konkret, helt uforpliktende.','',signature()].join('\n');
  const follow2=[hello,'','Siste lille oppfølging fra meg.','','Jeg lar denne ligge etter dette, men sender gjerne over forslagene hvis du er nysgjerrig på hva jeg ville endret på nettsiden til '+company+'.','',signature()].join('\n');
  return {subject,body,followup1:{subject:'Re: '+subject,body:follow1},followup2:{subject:'Re: '+subject,body:follow2},copyVersion:7,generatedAt:Date.now()};
}
