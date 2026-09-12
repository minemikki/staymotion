// Legal-sending guardrails for the StayMotion sales engine.
// Pure logic (no I/O) so it is easy to reason about and test.
//
// Conservative Norwegian B2B outreach policy used by V2:
//  - Automatic cold sending is allowed only to GENERAL business mailboxes
//    (post@, hei@, kontakt@, booking@ …), existing customers, or contacts with
//    documented consent.
//  - Named/person-addressed mailboxes (fornavn@firma.no) and private providers
//    are blocked from autosend unless consent/existing-customer status exists.
//  - Blocked addresses can still be handled manually by phone/contact form.

import crypto from 'node:crypto';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERAL_LOCALPARTS = new Set([
  'post','hei','hallo','kontakt','kontor','booking','bestilling','info','firmapost',
  'salg','salgs','resepsjon','resepsjonen','mail','epost','e-post','hello','hei-der',
  'oss','kundeservice','support','service','admin'
]);
const PERSONAL_DOMAINS = new Set([
  'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','live.no','msn.com',
  'yahoo.com','yahoo.no','icloud.com','me.com','online.no','start.no','getmail.no',
  'lyse.net','broadpark.no','proton.me','protonmail.com','hotmail.no','outlook.no'
]);

export function isValidEmail(email){return EMAIL_RE.test(String(email||'').trim());}
export function normalizeEmail(email){return String(email||'').trim().toLowerCase();}

export function classifyAddress(email){
  const e=normalizeEmail(email);
  if(!isValidEmail(e)) return {type:'invalid',reason:'Ugyldig e-postadresse.',autosendEligible:false};
  const [local,domain]=e.split('@');
  if(PERSONAL_DOMAINS.has(domain)) return {type:'personal',reason:'Privat e-postleverandør ('+domain+') — behandles som personlig adresse.',autosendEligible:false};
  const localBase=local.replace(/[._-]?\d+$/,'');
  if(GENERAL_LOCALPARTS.has(local)||GENERAL_LOCALPARTS.has(localBase)){
    return {type:'general',reason:'Generell bedriftsadresse ('+local+'@).',autosendEligible:true};
  }
  return {
    type:'named-business',
    reason:'Navngitt/individuell jobb-adresse ('+local+'@'+domain+'). Krever dokumentert grunnlag før automatisk utsending.',
    autosendEligible:false
  };
}

export function canAutosend(email,ctx={}){
  const cls=classifyAddress(email);
  if(cls.type==='invalid') return {allowed:false,channel:'blocked',reason:cls.reason};
  if(ctx.suppressed) return {allowed:false,channel:'blocked',reason:'Adressen står på reservasjonslisten (avmeldt/bounce/klage).'};
  if(ctx.consent||ctx.existingCustomer){
    return {allowed:true,channel:'email',reason:ctx.existingCustomer?'Eksisterende kunde.':'Dokumentert samtykke.'};
  }
  if(cls.autosendEligible) return {allowed:true,channel:'email',reason:cls.reason};
  return {allowed:false,channel:'blocked',reason:cls.reason,suggestion:'Bruk generell firmapost, telefon eller kontaktskjema. Ikke autosend til denne adressen uten dokumentert grunnlag.'};
}

export function isWithinWorkingHours(config,now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',weekday:'short',hour:'2-digit',hour12:false}).formatToParts(now);
  const hourStr=parts.find(p=>p.type==='hour')?.value??'00';
  const wdStr=parts.find(p=>p.type==='weekday')?.value??'Mon';
  const hour=parseInt(hourStr,10)%24;
  const wdMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
  const wd=wdMap[wdStr]??1;
  const days=config.workDays||[1,2,3,4,5];
  return days.includes(wd)&&hour>=config.workStartHour&&hour<config.workEndHour;
}

export function globalSendBlockers(config,env=process.env){
  const reasons=[];
  const liveEnabled=env.SALES_LIVE==='1'||env.SALES_LIVE==='true';
  if(config.killSwitch) reasons.push('Kill switch er på.');
  if(config.paused) reasons.push('Utsending er satt på pause.');
  if(config.dryRun) reasons.push('Systemet er i dry-run (ingen ekte e-post sendes).');
  if(!liveEnabled) reasons.push('SALES_LIVE er ikke satt i miljøvariabler.');
  if(!config.domainVerified) reasons.push('Avsenderdomene / SPF/DKIM/DMARC er ikke bekreftet.');
  return {blocked:reasons.length>0,reasons,liveEnabled};
}

export function unsubToken(email,secret=process.env.ORDER_SECRET||''){
  const e=normalizeEmail(email); if(!secret)return '';
  const sig=crypto.createHmac('sha256',secret).update('unsub:'+e).digest('base64url');
  return sig.slice(0,24);
}
export function verifyUnsubToken(email,token,secret=process.env.ORDER_SECRET||''){
  const expect=unsubToken(email,secret); if(!expect||!token)return false;
  const a=Buffer.from(String(token)); const b=Buffer.from(expect);
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function unsubscribeFooter(email,origin){
  const t=unsubToken(email);
  const url=origin+'/api/unsubscribe?e='+encodeURIComponent(normalizeEmail(email))+'&t='+t;
  return {url,text:'\n\n—\nHvis dette ikke er aktuelt, si bare ifra, så hører du ikke fra meg igjen. Du kan også reservere deg her: '+url};
}
