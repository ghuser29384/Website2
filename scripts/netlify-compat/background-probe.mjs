import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {createDispatch} from './candidate/normativity/audit-dispatch.mjs';
export async function verifyBackground({request,sql,raw,authority,secret,jwtSecret}) {
 raw(`INSERT INTO "AuditCheckpoint"(id,"fromSequence","toSequence","treeSize","rootHash","createdAt") SELECT 'synthetic_background_'||n,1,100+n,100+n,repeat('a',64),'2026-01-01'::timestamp+n*interval '1 second' FROM generate_series(1,10)n;`);
 const signed=createDispatch('2026-10-25T08:00:00Z',secret),id='normativity-audit:2026-10-25T08:00:00.000Z';
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const jwtBody=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'synthetic_background_user',handle:'synthetic_background_user',role:'user',exp:Math.floor(Date.now()/1000)+600});
 const jwt=jwtBody+'.'+createHmac('sha256',jwtSecret).update(jwtBody).digest('base64url');
 const written=await request('/api/commitments/pledges/signatures',{method:'POST',headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},body:JSON.stringify({version:'synthetic-v1',statementHash:'synthetic-background-event',consentPayload:{synthetic:true}})});
 assert.equal(written.status,201);await written.arrayBuffer();
 const newest=(await sql('SELECT max(sequence)::text AS sequence FROM "AuditEvent"'))[0].sequence;
 assert.equal((await sql(`SELECT count(*)::int AS n FROM "AuditCheckpoint" WHERE "toSequence"=${newest}`))[0].n,0);
 raw(`SELECT synthetic_audit_dispatch.register('${id}','${signed.body}'::jsonb,5)`);
 const state=async()=>(await sql(`SELECT finished_at FROM synthetic_audit_dispatch.batch WHERE dispatch_id='${id}'`))[0];
 const invoke=()=>request('/.netlify/functions/timestamp-background',{method:'POST',headers:{'content-type':'application/json','x-audit-signature':signed.signature},body:signed.body});
 authority.setDelay(6100);const calls=authority.calls,start=performance.now();
 const accepted=await invoke();assert.equal(accepted.status,202);await accepted.arrayBuffer();
 let finished=false;
 for(let i=0;i<90;i++){if((await state()).finished_at){finished=true;break;}await new Promise(resolve=>setTimeout(resolve,1000));}
 assert(finished,'background batch did not durably finish within 90 seconds');
 const durationMs=Math.round(performance.now()-start);
 assert.equal((await sql(`SELECT count(*)::int AS n FROM "AuditCheckpoint" WHERE "toSequence"=${newest}`))[0].n,1);
 assert.equal(authority.calls-calls,5);
 const rows=await sql(`SELECT "checkpointId","verifiedAt",octet_length("timestampTokenDer") AS bytes FROM "AuditTimestamp" WHERE "checkpointId" LIKE 'synthetic_background_%'`);
 assert.equal(rows.length,5);assert(rows.every(row=>row.verifiedAt&&row.bytes>100));assert(!rows.some(row=>row.checkpointId==='synthetic_background_6'));
 const repeat=await invoke();assert.equal(repeat.status,202);await repeat.arrayBuffer();
 await new Promise(resolve=>setTimeout(resolve,1000));assert.equal(authority.calls-calls,5);
 authority.setDelay(0);
 return {status:'PASS_COMPILED_LOCAL_BACKGROUND',proofs:5,originalCheckpointCreated:true,pendingDispatchPrepared:true,durationMs,providerDelayMs:6100,duplicateImmediateProviderCalls:0,hostedCompletionVerified:false,delayedReplayVerified:false};
}
