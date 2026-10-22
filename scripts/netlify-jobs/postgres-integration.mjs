import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {startSyntheticPostgres,seedEmails} from './postgres.mjs';import {createFixture,FIXTURE_TOKEN} from './http-fixture.mjs';import {startFixtureServer} from './fixture-server.mjs';
const pg=startSyntheticPostgres(process.argv[2],fileURLToPath(new URL('../../',import.meta.url)));let server;
try{
 seedEmails(pg);server=await startFixtureServer(createFixture({executeSql:sql=>pg.query(sql,'service_role')}));
 const call=async(name,args)=>{const r=await fetch(server.origin+'/rest/v1/rpc/'+name,{method:'POST',headers:{authorization:`Bearer ${FIXTURE_TOKEN}`},body:JSON.stringify(args)});assert.equal(r.status,200);return r.json();};
 const token='20000000-0000-4000-8000-000000000100';
 const rows=await call('claim_email_outbox_v2',{p_worker_token:token,p_limit:25});assert.equal(rows.length,25);
 assert.equal(await call('complete_email_outbox_v2',{p_email_id:rows[0].id,p_worker_token:token,p_provider_message_id:'synthetic-message'}),true);
 assert.equal(pg.query("select count(*) from public.email_outbox where status='sent' and body='[private invitation link removed after delivery]';"),'1');
 assert.equal(await call('retry_email_outbox_v2',{p_email_id:rows[1].id,p_worker_token:token,p_error:'synthetic failure'}),'retry');
 assert.equal(await call('suppress_email_outbox_v2',{p_email_id:rows[2].id,p_worker_token:token,p_reason:'synthetic suppression'}),true);
 assert.equal(await call('complete_email_outbox_v2',{p_email_id:rows[3].id,p_worker_token:'20000000-0000-4000-8000-000000000101',p_provider_message_id:'synthetic-stale'}),false);
 console.log(JSON.stringify({passed:5,transport:'loopback HTTP plus real PostgreSQL',hosted:false}));
}finally{if(server)await server.close();pg.stop();console.log(JSON.stringify({clusterRetained:pg.root,stopped:true}));}
