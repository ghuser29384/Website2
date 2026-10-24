import assert from 'node:assert/strict';
export async function verifyTimestamps({request,sql,authority,trust,cronSecret}) {
 const passed=[];
 const count=async()=>(await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n;
 const audit=()=>request('/api/cron/commitment-audit',{headers:{authorization:'Bearer '+cronSecret}});
 assert.equal(await count(),0);
 for(const mode of ['corrupt','unavailable']){
  authority.setMode(mode);const response=await audit();assert.equal(response.status,500);await response.arrayBuffer();assert.equal(await count(),0);passed.push(mode+' proof persists nothing');
 }
 authority.setMode('valid');await trust(false);
 const rejected=await audit();assert.equal(rejected.status,500);await rejected.arrayBuffer();assert.equal(await count(),0);passed.push('untrusted certificate persists nothing');
 await trust(true);const accepted=await audit();assert.equal(accepted.status,200);assert.equal((await accepted.json()).timestampResult.timestamped,2);
 const rows=await sql('SELECT "verifiedAt", octet_length("timestampTokenDer")::int AS bytes FROM "AuditTimestamp"');
 assert.equal(rows.length,2);assert(rows.every(x=>x.verifiedAt&&x.bytes>100));passed.push('two verified proofs persist after recovery');
 const calls=authority.calls;const repeat=await audit();assert.equal(repeat.status,200);assert.equal((await repeat.json()).timestampResult.timestamped,0);assert.equal(await count(),2);assert.equal(authority.calls,calls);passed.push('repeat does not request or persist duplicate proofs');
 return {status:'PASS_PACKAGED_SYNTHETIC_TIMESTAMP',passed,hostedProviderVerified:false};
}
