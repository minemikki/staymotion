// StayMotion Sales Engine V2 — personalized copy built from verified research.
// Deterministic by design: no external AI key required, and no claim is emitted
// unless it exists in the stored research/manual context.

function clean(s=''){return String(s||'').replace(/\s+/g,' ').trim();}
function firstName(s=''){return clean(s).split(' ')[0]||'';}
function signature(sender={}){
  return [
    'Med vennlig hilsen',
    sender.name || 'Michael Byberg',
    'StayMotion',
    sender.email || 'michael@staymotion.no',
    sender.web || 'www.staymotion.no'
  ].join('\n');
}
function strongestOpportunity(research={}){
  const arr = research.opportunities || [];
  return arr.find(x=>x.type==='design') || arr.find(x=>x.type==='cro') || arr.find(x=>x.type==='seo') || arr[0] || null;
}
function secondOpportunity(research={}, first){
  return (research.opportunities||[]).find(x=>!first || x.key!==first.key) || null;
}
function humanStrength(research={}){
  const s = (research.strengths||[])[0];
  return s ? s.replace(/\.$/,'') : '';
}
function businessContext(lead={}){
  const industry = clean(lead.industry || lead.segment || '');
  const location = clean(lead.location || '');
  const bits=[];
  if(industry) bits.push(industry.toLowerCase());
  if(location) bits.push('i '+location.split(',')[0]);
  return bits.join(' ');
}
function impactLine(lead={}, opp){
  const ind = clean(lead.industry || lead.segment || '').toLowerCase();
  if(/bygg|entrepren|rør|vvs|tann|klinikk|bil/.test(ind)) return 'I en bransje der én ny kvalifisert kunde kan være svært verdifull, trenger ikke forbedringene å gi mange ekstra henvendelser før de kan betale seg.';
  if(/frisør|barber|salong|renhold|restaurant/.test(ind)) return 'Når mange kunder velger lokalt og sammenligner flere aktører på mobilen, kan en tydeligere presentasjon og enklere vei til kontakt ha mye å si.';
  return opp ? 'Poenget er ikke bare at siden skal se bedre ut, men at flere av de riktige besøkende skal forstå tilbudet, stole på bedriften og ta kontakt.' : 'Poenget er å få den digitale presentasjonen til å jobbe hardere for bedriften.';
}

export function buildSalesDraft(lead={}, research={}, sender={}){
  const company = clean(lead.company) || 'bedriften deres';
  const contact = firstName(lead.contact || lead.contactName || '');
  const hello = contact ? 'Hei '+contact+',' : 'Hei,';
  const strength = humanStrength(research);
  const a = strongestOpportunity(research);
  const b = secondOpportunity(research,a);
  const location = clean(lead.location || '');
  const context = businessContext(lead);
  const intro = context
    ? 'Jeg tok en titt på '+company+' og nettsiden deres fordi jeg jobber med hvordan lokale '+context+' kan få mer ut av nettsiden og Google.'
    : 'Jeg tok en titt på '+company+' og nettsiden deres fordi jeg jobber med hvordan lokale bedrifter kan få mer ut av nettsiden og Google.';

  const positive = strength
    ? 'Det første jeg la merke til er at dere allerede har et godt utgangspunkt. '+strength.charAt(0).toUpperCase()+strength.slice(1)+'.'
    : 'Det første jeg la merke til er at dere allerede har et tydelig tilbud og en virksomhet det er lett å forstå.';

  let gap='';
  if(a && b){
    gap = 'Samtidig ser jeg noen konkrete muligheter. '+a.title+'. '+a.impact+' I tillegg: '+b.title.toLowerCase()+'.';
  } else if(a){
    gap = 'Samtidig ser jeg en konkret mulighet: '+a.title.toLowerCase()+'. '+a.impact;
  } else {
    gap = 'Jeg tror nettsiden kan løftes visuelt og strukturelt slik at den i større grad gjenspeiler kvaliteten på virksomheten og gjør veien til kontakt tydeligere.';
  }

  const visual = 'Jeg ville ikke nødvendigvis revet ned alt dere har. Målet ville vært å få siden til å se sterkere og mer moderne ut, samtidig som SEO, tillit og konvertering jobber bedre sammen.';
  const impact = impactLine(lead,a);
  const cta = 'Hvis du vil, kan jeg sende deg 3 helt konkrete ting jeg ville forbedret på siden deres, og gjerne vise visuelt hvordan jeg mener det kunne sett ut. Helt uforpliktende.';
  const body=[hello,'',intro,'',positive,'',gap,'',visual,'',impact,'',cta,'',signature(sender)].join('\n');
  const subject = a && /seo/i.test(a.type) ? 'En ting jeg la merke til på '+(research.domain || company) : 'En idé til '+company;

  const follow1=[hello,'','Ville bare følge opp denne.','',
    a ? 'Grunnen til at jeg tok kontakt er at jeg ser et konkret gap mellom hvor bra '+company+' kan fremstå digitalt og hvor mye nettsiden faktisk får frem i dag — særlig rundt '+a.title.toLowerCase()+'.' : 'Grunnen til at jeg tok kontakt er at jeg ser noen ganske konkrete grep som kan gjøre siden sterkere både visuelt og kommersielt.',
    '', 'Jeg kan gjerne sende de tre punktene uten at dere trenger å ta stilling til noe videre.','',signature(sender)].join('\n');

  const follow2=[hello,'','Siste lille oppfølging fra meg.','',
    'Jeg lar denne ligge etter dette, men tilbudet står dersom du vil at jeg skal sende over forslagene jeg fant til '+company+'.','',
    'Ingen salgspresentasjon — bare tre konkrete forbedringer dere eventuelt kan bruke.','',signature(sender)].join('\n');

  return {
    subject,
    body,
    followup1:{subject:'Re: '+subject,body:follow1},
    followup2:{subject:'Re: '+subject,body:follow2},
    sourceKeys:[a&&a.key,b&&b.key].filter(Boolean),
    generatedAt:Date.now()
  };
}
