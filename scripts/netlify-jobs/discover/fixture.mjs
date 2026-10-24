import {relatedRows} from './related-rows.mjs';
// Local synthetic diagnostic, not a deployment artifact or full parity fixture.
import {createSearchFixture} from '../search/fixture.mjs';
export function createDiscoverFixture({count=400,includeRelated=false}={}) {
 const base=createSearchFixture({count}); const calls={};
 const owner=i=>`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
 const offer=i=>`20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;
 const time='2026-10-24T00:00:00Z';
 const tables={
  public_profile_cards_v1:Array.from({length:Math.min(20,count)},(_,i)=>({id:owner(i),username:`synthetic-${i}`,display_name:`Synthetic participant ${i}`,avatar_url:null,account_kind:'individual',accepts_group_invitations:false,public_invitation_mentions_enabled:false,organization_approval_count:0,bio:'Synthetic test profile',follower_count:0,following_count:0,karma:0,comment_count:1,rating_avg:null,rating_count:0,offer_count:Math.floor(count/20)+(i<count%20?1:0),created_at:time,public_location_granularity:'hidden',city:null,region:null,country:null})),
  offer_recommendations:Array.from({length:count},(_,i)=>({id:`recommendation-${i}`,recommender_id:owner((i+1)%20),source_offer_id:null,recommended_offer_id:offer(i),created_at:time})),
  offer_comments:Array.from({length:count},(_,i)=>({id:`comment-${i}`,offer_id:offer(i),author_id:owner(i%20),parent_id:null,depth:0,body:'Synthetic comment',created_at:time,updated_at:time})),
  wish_profile_previews:Array.from({length:Math.min(20,count)},(_,i)=>({profile_id:owner(i),participant_kind:'individual',collective_name:'',causes:['Education'],public_preview:'Synthetic broad preview',location_city:null,location_region:null,openness_to_payment:false,openness_to_pledges:true,background_search_enabled:false,privacy_stage:'broad',updated_at:time})),
  profile_verification_badges:Array.from({length:Math.min(20,count)},(_,i)=>({id:`badge-${i}`,profile_id:owner(i),badge_type:'completion_reviewed',status:i%2?'revoked':'verified',evidence_summary:'Synthetic review only',source:'synthetic',reviewed_by:null,reviewed_at:time,expires_at:null,created_at:time,updated_at:time})),donation_offset_pools:[],registered_charities:[],performance_bonds:[],
 };
 if(includeRelated)Object.assign(tables,relatedRows(count));
 return {counts:()=>({...calls}),incompleteCoverage:['nonempty offsets/pools/charities/bonds','Co-Funds RPC','signed-in state'],async handle(request){
  const u=new URL(request.url);
  if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||request.method!=='GET')throw Error('Synthetic read-only loopback required');
  const key=u.pathname;calls[key]=(calls[key]??0)+1;if(Object.values(calls).reduce((a,b)=>a+b,0)>250)throw Error('Request budget');
  if(['/rest/v1/offers','/auth/v1/user'].includes(key)||(!includeRelated&&key==='/rest/v1/donation_offset_offers'))return base.handle(request);
  if(!key.startsWith('/rest/v1/'))throw Error('Unrecognized fixture path');
  const name=key.slice('/rest/v1/'.length);if(!Object.hasOwn(tables,name))throw Error('Unrecognized fixture table');
  let rows=tables[name];
  for(const[k,v]of u.searchParams){
   if(k==='select'){if(v!=='*')throw Error('Unrecognized projection');continue;}
   if(!['id','profile_id','offer_id','recommended_offer_id','status'].includes(k))throw Error('Unrecognized filter');
   if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));
   else if(v.startsWith('in.(')&&v.endsWith(')')){const values=v.slice(4,-1).split(',');rows=rows.filter(r=>values.includes(String(r[k])));}
   else throw Error('Unrecognized operator');
  }
  return Response.json(rows);
 }};
}
