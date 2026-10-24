// Prepared acceptance driver. No network runs merely by importing this file.
// request/sql/restart must be injected by the isolated synthetic Netlify harness.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
export async function verifyPersistence({request,sql,restart,jwtSecret,signingSecret,cronSecret}) {
 const passed=[];
 const check=async(name,fn)=>{await fn();passed.push(name);};
 const token=(id,role='user')=>{const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:id,handle:id,role,exp:Math.floor(Date.now()/1000)+600});return body+'.'+createHmac('sha256',jwtSecret).update(body).digest('base64url');};
 const auth=(id,role)=>({authorization:'Bearer '+token(id,role)});
 const counts=async()=>(await sql('SELECT (SELECT count(*)::int FROM "User") AS users, (SELECT count(*)::int FROM "PledgeSignature") AS pledges, (SELECT count(*)::int FROM "AuditEvent") AS events'))[0];
 const pledge=id=>request('/api/commitments/pledges/signatures',{method:'POST',headers:{...auth(id),'content-type':'application/json'},body:JSON.stringify({version:'synthetic-v1',statementHash:'synthetic-statement-hash',consentPayload:{fixture:true,value:[1,null,'test']}})});
 const audit=async()=>{const response=await request('/api/cron/commitment-audit',{headers:{authorization:'Bearer '+cronSecret}});assert.equal(response.status,200);return response.json();};
 assert.deepEqual(await counts(),{users:0,pledges:0,events:0});
  await check('unauthenticated write is rejected and persists nothing', async () => {
    assert.equal((await request('/api/commitments/pledges/signatures', { method: 'POST' })).status, 401);
    assert.deepEqual(await counts(), { users: 0, pledges: 0, events: 0 });
  });
  let firstPledge;
  await check('real authenticated transaction persists user, pledge, JSON and signed audit event', async () => {
    const response = await pledge('synthetic_a'); assert.equal(response.status, 201);
    const body = await response.json(); firstPledge = body.pledge.id;
    assert.equal(typeof body.auditEvent.sequence, 'string');
    assert.deepEqual(await counts(), { users: 1, pledges: 1, events: 1 });
    const row = (await sql('SELECT "consentPayload", "signatureJws" FROM "PledgeSignature" WHERE id=$1', [firstPledge]))[0];
    assert.deepEqual(row.consentPayload, { fixture: true, value: [1, null, 'test'] });
    for (const signed of [row.signatureJws, body.auditEvent.jws]) {
      const parts = signed.split('.'); assert.equal(parts.length, 3);
      assert.equal(parts[2], createHmac('sha256', signingSecret).update(parts[0]+'.'+parts[1]).digest('base64url'));
    }
  });
  await check('database failure late in transaction rolls back all earlier writes', async () => {
    await sql(`CREATE FUNCTION synthetic_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.payload->>'userId' = 'synthetic_rollback' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER synthetic_rollback_check BEFORE INSERT ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION synthetic_reject_audit();`);
    assert.equal((await pledge('synthetic_rollback')).status, 500);
    assert.deepEqual(await counts(), { users: 1, pledges: 1, events: 1 });
    assert.equal((await sql('SELECT count(*)::int AS n FROM "User" WHERE id=$1', ['synthetic_rollback']))[0].n, 0);
  });
  await check('concurrent authenticated requests retain separate data and connections', async () => {
    const responses = await Promise.all([pledge('synthetic_b'), pledge('synthetic_c')]);
    for (const response of responses) { assert.equal(response.status, 201); await response.arrayBuffer(); }
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 3 });
  });
  await check('authenticated HTTP audit checkpoint persists and a repeat does not duplicate it', async () => {
    await audit(); await audit();
    const checkpoints = await sql('SELECT * FROM "AuditCheckpoint"');
    assert.equal(checkpoints.length, 1); assert.equal(checkpoints[0].treeSize, 3);
    assert.equal((await sql('SELECT count(*)::int AS n FROM "AuditTimestamp"'))[0].n, 0);
    const response = await request('/api/cron/commitment-audit', { headers: { authorization: 'Bearer ' + cronSecret } });
    assert.equal(response.status, 200); assert.equal(typeof (await response.json()).checkpoint.toSequence, 'string');
  });
  await check('another participant cannot read the persisted private audit object', async () => {
    assert.equal((await request(`/api/commitments/audit/pledge_signature/${firstPledge}`, { headers: auth('synthetic_b') })).status, 404);
    const response = await request(`/api/commitments/audit/pledge_signature/${firstPledge}`, { headers: auth('synthetic_a') });
    assert.equal(response.status, 200); assert.equal((await response.json()).events.length, 1);
  });
  await check('restart of both database and packaged Netlify server preserves data and read access', async () => {
    await restart();
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 3 });
    const response = await request('/api/commitments/admin/health', { headers: auth('synthetic_admin', 'admin') });
    assert.equal(response.status, 200); assert.equal((await response.json()).health.latestCheckpoint.treeSize, 3);
  });
  await check('an additional write creates a linked checkpoint and retains the pledge upsert contract', async () => {
    const response = await pledge('synthetic_a'); assert.equal(response.status, 201); await response.arrayBuffer();
    assert.deepEqual(await counts(), { users: 3, pledges: 3, events: 4 }); await audit();
    const rows = await sql('SELECT * FROM "AuditCheckpoint" ORDER BY "toSequence"');
    assert.equal(rows.length, 2); assert.equal(rows[1].priorCheckpointId, rows[0].id); assert.equal(rows[1].treeSize, 4);
  });
 return {passed,status:'PASS_SYNTHETIC_DATABASE_HTTP_ONLY',scheduleVerified:false,timestampAuthorityVerified:false};
}
