// StayMotion Sales Engine V2 approval queue. Admin-gated.
// Every cold sequence must be generated, previewed and approved before it can send.
// V2 can schedule two follow-ups after approval; reply/bounce/opt-out events stop it.

import { listLeads } from '../lib/leads.js';
import { generateMessage } from '../lib/messages.js';
import { getConfig, getSequence, saveSequence, listSequences, isSuppressed } from '../lib/sales-store.js';
import { classifyAddress, canAutosend } from '../lib/sales-guard.js';
import { PACKAGES, VAT } from '../lib/packages.js';

const DAY=86400000;
function authed(req){const key=process.env.ADMIN_KEY;if(!key)return false;const given=(req.query&&req.query.key)||req.headers['x-admin-key'];return given===key;}
function priceLines(offer,vatMode){const p=PACKAGES[offer];if(!p)return{};const vat=VAT.label(vatMode);const deposit=Math.round(p.fromKr*p.depositPct/100);return{priceLine:p.fromKr.toLocaleString('nb-NO')+' NOK'+(vat?' '+vat:''),depositLine:p.depositPct<100?'Oppstartbetaling: '+deposit.toLocaleString('nb-NO')+' NOK ('+p.depositPct+' %). Resten ved levering.':'Betales ved oppstart.'};}

function fromDraft(draft){
  if(!draft||!draft.subject||!draft.body)return null;
  const steps=[{id:'email1',label:'Første e-post',subject:draft.subject,body:draft.body,offsetDays:0}];
  if(draft.followup1&&draft.followup1.body)steps.push({id:'followup1',label:'Oppfølging 1',subject:draft.followup1.subject||('Re: '+draft.subject),body:draft.followup1.body,offsetDays:4});
  if(draft.followup2&&draft.followup2.body)steps.push({id:'followup2',label:'Oppfølging 2',subject:draft.followup2.subject||('Re: '+draft.subject),body:draft.followup2.body,offsetDays:9});
  return steps;
}

async function buildSequence(lead,config,opts={}){
  const email=(lead.email||'').trim().toLowerCase();
  const cls=classifyAddress(email);
  const suppressed=email?await isSuppressed(email):false;
  const existingCustomer=!!lead.existingCustomer;
  const consent=!!lead.consent;
  const decision=canAutosend(email,{existingCustomer,consent,suppressed});
  const offer=opts.offer||lead.offer||'';
  const pl=priceLines(offer,config.vatMode);
  let baseSteps=null;
  if(opts.useV2!==false) baseSteps=fromDraft(opts.draft||lead.salesDraftV2);
  if(!baseSteps){
    const ctx={company:lead.company||'',contact:lead.contact||lead.contactName||'',observation:opts.observation||lead.observation||lead.topOpportunity||'',angle:opts.angle||lead.angle||'',conceptUrl:opts.conceptUrl||lead.conceptUrl||'',senderName:config.senderName,studioName:config.studioName,contactEmail:config.contactEmail,contactPhone:config.contactPhone,offer,priceLine:pl.priceLine,depositLine:pl.depositLine,deliver:(PACKAGES[offer]||{}).deliver||''};
    const m=generateMessage('email1',ctx);
    baseSteps=[{id:'email1',label:m.label,subject:m.subject,body:m.body,offsetDays:0}];
  }
  const steps=baseSteps.map(s=>({id:s.id,label:s.label,subject:String(s.subject||'').slice(0,200),body:String(s.body||'').slice(0,6000),offsetDays:Number(s.offsetDays)||0,sendAt:null,status:'planned',sentAt:null,dryRun:null}));
  return {leadId:lead.id,company:lead.company||'',email,addressType:cls.type,autosendEligible:decision.allowed,channel:decision.channel,decisionReason:decision.reason,suggestion:decision.suggestion||'',suppressed,existingCustomer,consent,status:'pending',createdAt:Date.now(),approvedAt:null,stoppedReason:'',offer,source:'v2',steps};
}

export default async function handler(req,res){
  if(!authed(req))return res.status(401).json({error:'Ikke autorisert'});
  try{
    if(req.method==='GET'){
      const all=await listSequences();
      const seqs=all.filter(s=>s.status!=='rejected').sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      return res.json({sequences:seqs,pending:seqs.filter(s=>s.status==='pending').length,approved:seqs.filter(s=>s.status==='approved').length});
    }
    if(req.method!=='POST')return res.status(405).json({error:'Bruk POST'});
    const b=req.body||{};const op=b.op;
    if(!b.leadId&&op!=='run')return res.status(400).json({error:'Mangler leadId'});

    if(op==='create'){
      const config=await getConfig();const leads=await listLeads();const lead=leads.find(l=>l.id===b.leadId);
      if(!lead)return res.status(404).json({error:'Fant ikke lead'});
      if(!lead.email)return res.status(400).json({error:'Lead mangler e-postadresse'});
      const draft=b.subject&&b.body?{subject:b.subject,body:b.body,followup1:b.followup1,followup2:b.followup2}:(b.draft||null);
      const seq=await buildSequence(lead,config,{observation:b.observation,offer:b.offer,angle:b.angle,conceptUrl:b.conceptUrl,useV2:b.useV2!==false,draft});
      await saveSequence(seq);return res.json({ok:true,sequence:seq});
    }

    if(op==='approve'){
      const seq=await getSequence(b.leadId);if(!seq)return res.status(404).json({error:'Fant ikke sekvens'});
      seq.status='approved';seq.approvedAt=Date.now();
      seq.steps.forEach(s=>{if(s.status==='planned')s.sendAt=seq.approvedAt+s.offsetDays*DAY;});
      await saveSequence(seq);return res.json({ok:true,sequence:seq});
    }
    if(op==='reject'){
      const seq=await getSequence(b.leadId);if(seq){seq.status='rejected';seq.rejectedAt=Date.now();await saveSequence(seq);}return res.json({ok:true});
    }
    if(op==='stop'){
      const seq=await getSequence(b.leadId);if(!seq)return res.status(404).json({error:'Fant ikke sekvens'});
      seq.status='stopped';seq.stoppedReason=b.reason||'Stoppet manuelt.';seq.stoppedAt=Date.now();await saveSequence(seq);return res.json({ok:true,sequence:seq});
    }
    if(op==='mark-sent'){
      const seq=await getSequence(b.leadId);if(!seq)return res.status(404).json({error:'Fant ikke sekvens'});const step=seq.steps.find(s=>s.id===b.stepId);if(!step)return res.status(404).json({error:'Fant ikke steg'});
      step.status='sent';step.sentAt=Date.now();step.sentManually=true;await saveSequence(seq);return res.json({ok:true,sequence:seq});
    }
    if(op==='edit'){
      const seq=await getSequence(b.leadId);if(!seq)return res.status(404).json({error:'Fant ikke sekvens'});const step=seq.steps.find(s=>s.id===b.stepId);if(!step)return res.status(404).json({error:'Fant ikke steg'});
      if(typeof b.subject==='string')step.subject=b.subject.slice(0,200);if(typeof b.body==='string')step.body=b.body.slice(0,6000);await saveSequence(seq);return res.json({ok:true,sequence:seq});
    }
    return res.status(400).json({error:'Ukjent operasjon'});
  }catch(e){console.error('[sales-queue]',e);return res.status(500).json({error:'Kø-feil'});}
}
