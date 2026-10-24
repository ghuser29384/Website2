import assert from 'node:assert/strict';
import {createDispatch} from './candidate/normativity/audit-dispatch.mjs';
export async function verifySkip({request,sql,raw,secret,authority}) {
 const signed=createDispatch('2026-10-26T08:00:00Z',secret),id='normativity-audit:2026-10-26T08:00:00.000Z';
 raw(`SELECT synthetic_audit_dispatch.register('${id}','${signed.body}'::jsonb,5)`);
 const count=async()=>(await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n;
 const before=await count(),calls=authority.calls;
 const response=await request('/.netlify/functions/timestamp-background',{method:'POST',headers:{'x-audit-signature':signed.signature},body:signed.body});assert.equal(response.status,202);await response.arrayBuffer();
 let state;
 for(let i=0;i<20;i++){state=(await sql(`SELECT finished_at,outcome FROM synthetic_audit_dispatch.batch WHERE dispatch_id='${id}'`))[0];if(state.finished_at)break;await new Promise(resolve=>setTimeout(resolve,500));}
 assert(state.finished_at,'skip not durably recorded');assert.equal(state.outcome.timestamped,0);assert.equal(state.outcome.skipped,'TSA_URL is not configured.');assert.equal(await count(),before);assert.equal(authority.calls,calls);
 return {status:'PASS_COMPILED_NO_PROVIDER_SKIP',providerCalls:0,proofWrites:0};
}
