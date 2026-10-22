import test from 'node:test';import assert from 'node:assert/strict';import {rpcSql} from './rpc-sql.mjs';
const args={p_worker_token:'20000000-0000-4000-8000-000000000001',p_email_id:'20000000-0000-4000-8000-000000000002',p_limit:25};
test('claim preserves complete batch and argument order',()=>assert.match(rpcSql('claim_email_outbox_v2',args),/000001'::uuid,25\) e;/));
test('completion preserves independent statement and provider text',()=>{const sql=rpcSql('complete_email_outbox_v2',{...args,p_provider_message_id:"provider's-id"});assert.match(sql,/000002'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'provider''s-id'\);$/);assert.ok(!sql.includes('begin;'));});
test('retry and suppression use distinct original arguments',()=>{assert.ok(rpcSql('retry_email_outbox_v2',{...args,p_error:'failed'}).endsWith(",'failed');"));assert.ok(rpcSql('suppress_email_outbox_v2',{...args,p_reason:'unsafe'}).endsWith(",'unsafe');"));});
test('unexpected RPC, SQL injection, smaller batches and missing values fail closed',()=>{
 for(const name of ['arbitrary','toString','complete_email_outbox_v2; drop table x'])assert.throws(()=>rpcSql(name,args));
 assert.throws(()=>rpcSql('claim_email_outbox_v2',{...args,p_limit:1}));
 assert.throws(()=>rpcSql('claim_email_outbox_v2',{...args,p_worker_token:"';select 1;--"}));
 assert.throws(()=>rpcSql('retry_email_outbox_v2',args));
 assert.throws(()=>rpcSql('retry_email_outbox_v2',{...args,p_error:'\0'}));
});
