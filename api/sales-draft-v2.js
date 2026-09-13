// Admin-gated personalized draft generation from stored verified research.
// POST { leadId, sender? }

import { listLeads, saveLead } from '../lib/leads.js';
import { getConfig } from '../lib/sales-store.js';
import { buildSalesDraft } from '../lib/sales-copy-v2.js';

function authed(req){
  const key=process.env.ADMIN_KEY;
  if(!key) return false;
  const given=(req.query&&req.query.key)||req.headers['x-admin-key'];
  return given===key;
}

export default async function handler(req,res){
  if(!authed(req)) return res.status(401).json({error:'Ikke autorisert'});
  if(req.method!=='POST') return res.status(405).json({error:'Bruk POST'});
  try{
    const b=req.body||{};
    if(!b.leadId) return res.status(400).json({error:'Mangler leadId'});
    const leads=await listLeads();
    const lead=leads.find(l=>l.id===b.leadId);
    if(!lead) return res.status(404).json({error:'Fant ikke lead'});
    if(!lead.researchV2 || !lead.researchV2.ok) return res.status(400).json({error:'Kjør V2-research først'});
    const cfg=await getConfig();
    const sender={
      name:(b.sender&&b.sender.name)||'Michael Byberg',
      email:(b.sender&&b.sender.email)||cfg.contactEmail||'michael@staymotion.no',
      web:(b.sender&&b.sender.web)||'www.staymotion.no',
    };
    const draft=buildSalesDraft(lead,lead.researchV2,sender);
    lead.salesDraftV2=draft;
    lead.stage=lead.stage==='undersokt'||lead.stage==='ny'?'klar':lead.stage;
    await saveLead(lead);
    return res.json({ok:true,draft,lead});
  }catch(e){
    console.error('[sales-draft-v2]',e);
    return res.status(500).json({error:'Kunne ikke lage utkast'});
  }
}
