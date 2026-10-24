import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
export async function verifyScheduler({request,sql,jwtSecret}) {
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'synthetic_schedule',handle:'synthetic_schedule',role:'user',exp:Math.floor(Date.now()/1000)+600});
 const token=body+'.'+createHmac('sha256',jwtSecret).update(body).digest('base64url');
 const before=(await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n;
 const write=await request('/api/commitments/pledges/signatures',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({version:'synthetic-v1',statementHash:'synthetic-scheduler-hash',consentPayload:{synthetic:true}})});
 assert.equal(write.status,201);await write.arrayBuffer();
 const started=performance.now();
 const response=await request('/.netlify/functions/scheduled-audit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({next_run:'2026-10-25T08:00:00Z'})});
 assert(response.ok,'scheduled local invocation failed: '+response.status);await response.arrayBuffer();
 assert.equal((await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n,before+1);
 return {status:'PASS_PACKAGED_LOCAL_SCHEDULED_HANDLER',durationMs:Math.round(performance.now()-started),actualHostedScheduleVerified:false,slowProviderFitVerified:false};
}
