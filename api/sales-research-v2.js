// Admin-gated deep public website research for one CRM lead.
// POST { leadId, website?, industry?, location?, notes?, valueScore?, reachScore? }

import { listLeads, saveLead } from '../lib/leads.js';
import { researchWebsite } from '../lib/sales-research-v2.js';

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
    const website=b.website||lead.website||lead.url||'';
    if(!website) return res.status(400).json({error:'Lead mangler nettside'});

    const manual={
      industry:b.industry||lead.industry||lead.segment||'',
      location:b.location||lead.location||'',
      notes:b.notes!=null?b.notes:(lead.researchNotes||''),
      valueScore:b.valueScore||lead.valueScore||0,
      reachScore:b.reachScore||lead.reachScore||0,
    };
    const research=await researchWebsite(website,manual);
    if(!research.ok) return res.status(422).json({error:research.error||'Kunne ikke analysere nettsiden',research});

    lead.website=website;
    lead.industry=manual.industry||lead.industry||'';
    lead.location=manual.location||lead.location||'';
    lead.researchNotes=manual.notes||'';
    lead.researchV2=research;
    lead.priority=research.score?.label||lead.priority||'';
    lead.priorityScore=Math.round((research.score?.total||0)*10);
    lead.stage=lead.stage==='ny'||!lead.stage?'undersokt':lead.stage;
    await saveLead(lead);

    return res.json({ok:true,lead,research});
  }catch(e){
    console.error('[sales-research-v2]',e);
    return res.status(500).json({error:'Research feilet'});
  }
}
