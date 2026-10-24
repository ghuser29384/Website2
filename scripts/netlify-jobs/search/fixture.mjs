// Synthetic data only. Never deploy this fixture or point it at a real database.
export function createSearchFixture({count=400,delayMs=0}={}){
 if(!Number.isInteger(count)||count<0||count>2000||!Number.isInteger(delayMs)||delayMs<0||delayMs>1000)throw Error('Invalid fixture bounds');
 const rows=Array.from({length:count},(_,i)=>({id:`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,owner_id:`30000000-0000-4000-8000-${String(i%20+1).padStart(12,'0')}`,owner_alias:`Synthetic participant ${i%20}`,mode:['pledge','offset','payment'][i%3],offered_cause:i%2?'Animal welfare':'Global health',requested_cause:'Climate',compromise_cause:'Education',offer_action:'Volunteer review',request_action:`Review a proposal for $${10+i%20}`,verification:i%2?'Provide a dated public receipt and independent review':'',duration:'By 2027-11-01',notes:`Synthetic additional terms ${i}; no real participants.`,discount_note:'Synthetic bounded terms',trust_level:i%5,created_at:`2026-10-${String(i%20+1).padStart(2,'0')}T00:00:00Z`,updated_at:'2026-10-24T00:00:00Z',status:'open',offer_impact:10,min_counterparty_impact:2,payment_interval_value:1,payment_interval_unit:'month'}));
 let requests=0;
 return {count,requests:()=>requests,async handle(request){
  const url=new URL(request.url);if(!['127.0.0.1','localhost'].includes(url.hostname))throw Error('Fixture requires loopback');
  if(request.method!=='GET')throw Error('Read-only fixture');if(++requests>200)throw Error('Request cap');
  if(url.pathname==='/auth/v1/user')return Response.json({message:'Synthetic signed-out session'},{status:401});
  const table=url.pathname.replace('/rest/v1/','');if(!['offers','donation_offset_offers'].includes(table))throw Error(`Unexpected fixture path: ${url.pathname}`);
  if(delayMs)await new Promise(r=>setTimeout(r,delayMs));
  let data=table==='offers'?rows:[];const p=url.searchParams;
  for(const[k,v]of p){
   if(['select','order','offset','limit'].includes(k))continue;
   if(!['status','mode','id','offer_id'].includes(k))throw Error('Unsupported filter');
   if(v.startsWith('eq.'))data=data.filter(row=>String(row[k])===v.slice(3));
   else if(v.startsWith('in.(')&&v.endsWith(')'))data=data.filter(row=>v.slice(4,-1).split(',').includes(String(row[k])));
   else throw Error('Unsupported filter operator');
  }
  if(p.has('order'))data=[...data].sort((a,b)=>{for(const term of p.get('order').split(',')){const[k,d]=term.split('.');if(!['created_at','id'].includes(k)||!['asc','desc'].includes(d))throw Error('Unsupported order');const diff=String(a[k]).localeCompare(String(b[k]));if(diff)return d==='desc'?-diff:diff;}return 0;});
  const total=data.length,offset=Number(p.get('offset')??0),limit=Number(p.get('limit')??total);
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<0||limit>2000)throw Error('Invalid range');
  data=data.slice(offset,offset+limit);const select=p.get('select')??'*';
  if(select!=='*')data=data.map(row=>Object.fromEntries(select.split(',').map(k=>{if(!Object.hasOwn(row,k))throw Error('Unknown selected column');return[k,row[k]];})));
  return Response.json(data,{headers:{'content-range':`${offset}-${offset+Math.max(0,data.length-1)}/${total}`}});
 }};
}
