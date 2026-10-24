import assert from 'node:assert/strict';
export async function verifyHandoff({request,sql}) {
 const id='normativity-audit:2026-10-27T08:00:00.000Z';
 const count=async()=>(await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n;
 const before=await count();
 const invoke=()=>request('/.netlify/functions/scheduled-background',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({next_run:'2026-10-27T08:00:00Z'})});
 const result=await invoke();assert(result.ok,'scheduled handoff status '+result.status);await result.arrayBuffer();
 let state;
 for(let i=0;i<30;i++){state=(await sql(`SELECT finished_at,prepared,checkpoint_ids,original_payload FROM synthetic_audit_dispatch.batch WHERE dispatch_id='${id}'`))[0];if(state?.finished_at)break;await new Promise(resolve=>setTimeout(resolve,500));}
 assert(state?.finished_at,'scheduled handoff did not durably finish');assert.equal(state.prepared,true);assert.equal(state.checkpoint_ids.length,5);assert.equal(state.original_payload.nextRun,'2026-10-27T08:00:00.000Z');assert.equal(await count(),before+5);
 const replay=await invoke();assert(replay.ok);await replay.arrayBuffer();assert.equal(await count(),before+5);
 return {status:'PASS_COMPILED_SCHEDULE_TO_BACKGROUND',proofs:5,originalIdentityRetained:true,hostedScheduleVerified:false};
}
