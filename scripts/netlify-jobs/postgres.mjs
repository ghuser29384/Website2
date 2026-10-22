import {mkdtempSync,mkdirSync,appendFileSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {syntheticSchema} from './schema.mjs';
export function startSyntheticPostgres(bin,app){
 const root=realpathSync(mkdtempSync('/tmp/nt-email-'));mkdirSync(join(root,'socket'),{mode:0o700});
 const env={PATH:'/usr/bin:/bin',LC_ALL:'C'};
 const exec=(name,args,input)=>execFileSync(join(bin,name),args,{env,input,encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
 exec('initdb',['-n','-D',join(root,'data'),'-U','postgres','--auth-local=trust','--auth-host=reject','--no-locale']);
 appendFileSync(join(root,'data/postgresql.conf'),`\nlisten_addresses = ''\nport = 15440\nunix_socket_directories = '${root}/socket'\nunix_socket_permissions = 0700\n`);
 exec('pg_ctl',['-D',join(root,'data'),'-l',join(root,'server.log'),'-w','start']);
 let stopped=false;
 const stop=()=>{if(!stopped){exec('pg_ctl',['-D',join(root,'data'),'-m','fast','-w','stop']);stopped=true;}};
 const query=(sql,role='postgres')=>{assert.ok(['postgres','service_role'].includes(role));return exec('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-h',join(root,'socket'),'-p','15440','-U','postgres','-d','postgres'],`set role ${role};set statement_timeout=10000;${sql}`).trim();};
 try{
  const identity=JSON.parse(query("select json_build_object('dir',current_setting('data_directory'),'tcp',current_setting('listen_addresses'));"));
  assert.equal(identity.dir,join(root,'data'));assert.equal(identity.tcp,'');
  assert.equal(query("select count(*) from pg_tables where schemaname='public';"),'0');
  query(syntheticSchema(app));
 }catch(e){stop();throw e;}
 return {root,query,stop};
}
export function seedEmails(pg,attempt=0){
 assert.ok([0,4].includes(attempt));
 pg.query(`truncate public.email_outbox,public.trade_invitations;
 insert into public.trade_invitations values ('20000000-0000-4000-8000-000000000099','sent',now()+interval '1 day');
 ${Array.from({length:25},(_,i)=>`insert into public.email_outbox(id,recipient_email,subject,body,provider,attempt_count,idempotency_key,source_kind,source_id) values ('20000000-0000-4000-8000-${String(i+1).padStart(12,'0')}','recipient@synthetic.invalid','Moral Trade: test update','A private update is waiting in your dashboard.','core_trade_reminder',${attempt},'synthetic-${i}','trade_invitation','20000000-0000-4000-8000-000000000099');`).join('\n')}`);
}
