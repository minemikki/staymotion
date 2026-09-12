// Scheduler entry point for StayMotion Sales Engine V2.
// Intended for Vercel Cron (or another trusted scheduler). It delegates to the
// existing guarded sender, so dry-run, kill switch, working hours, daily cap,
// suppression and address rules are all re-checked at send time.
//
// Security: set CRON_SECRET. Vercel Cron can send Authorization: Bearer <secret>.

export default async function handler(req,res){
  const secret=process.env.CRON_SECRET||'';
  const auth=req.headers.authorization||'';
  if(!secret||auth!=='Bearer '+secret) return res.status(401).json({error:'Ikke autorisert'});
  try{
    const host=req.headers.host||'staymotion.no';
    const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
    const r=await fetch(proto+'://'+host+'/api/sales-send',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':process.env.ADMIN_KEY||''},body:JSON.stringify({op:'run-due'})});
    const text=await r.text();
    let data={};try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}
    return res.status(r.ok?200:r.status).json({ok:r.ok,delegated:true,result:data});
  }catch(e){
    console.error('[sales-cron]',e);
    return res.status(500).json({error:'Cron-kjøring feilet'});
  }
}
