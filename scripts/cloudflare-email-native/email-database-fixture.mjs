import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
export const app=process.env.CF_APP_ROOT;
export const pgRoot=process.env.EMAIL_NATIVE_PG_ROOT;
export const localEnv={PATH:'/usr/bin:/bin',LC_ALL:'C'};
assert.ok(app?.startsWith('/private/tmp/') || app?.startsWith('/home/runner/') || app?.startsWith('/tmp/'));
assert.match(pgRoot??'',/^\/(?:private\/)?tmp\/mt-email-native-[a-zA-Z0-9-]+$/);
const psql=process.env.CF_EMAIL_PSQL;
assert.ok(['/usr/lib/postgresql/16/bin/psql','/Applications/Postgres.app/Contents/Versions/17/bin/psql'].includes(psql));
export const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const q=v=>v==null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
export function sql(source,role='postgres') {
  assert.ok(['postgres','mt_email_job'].includes(role));
  const r=spawnSync(psql,['-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-h',pgRoot+'/socket','-p','15442','-U',role,'-d','postgres'],{env:localEnv,input:source,encoding:'utf8',maxBuffer:2*1024*1024});
  if(r.status!==0) {const m=/ERROR:\s+([0-9A-Z]{5}):\s+([^\n]+)/.exec(r.stderr);throw Object.assign(new Error(m?.[2]??r.stderr),{code:m?.[1]});}
  return r.stdout.trim();
}
export function verifyDatabase() {
  const values=JSON.parse(sql("select json_build_array(current_setting('data_directory'),current_setting('listen_addresses'));"));
  assert.equal(values[0],pgRoot+'/data');assert.ok(['','127.0.0.1'].includes(values[1]));
}
export const statements={
  claim_email_outbox_v2:['SELECT * FROM public.claim_email_outbox_v2($1::uuid, $2::integer)',['p_worker_token','p_limit']],
  complete_email_outbox_v2:['SELECT public.complete_email_outbox_v2($1::uuid, $2::uuid, $3::text) AS value',['p_email_id','p_worker_token','p_provider_message_id']],
  retry_email_outbox_v2:['SELECT public.retry_email_outbox_v2($1::uuid, $2::uuid, $3::text) AS value',['p_email_id','p_worker_token','p_error']],
  suppress_email_outbox_v2:['SELECT public.suppress_email_outbox_v2($1::uuid, $2::uuid, $3::text) AS value',['p_email_id','p_worker_token','p_reason']],
};
export function install() {
assert.equal(sql("select count(*) from pg_tables where schemaname='public';"),'0');
const migration=readFileSync(app+'/supabase/migrations/20260722223000_harden_trade_invitations.sql','utf8');
const schema=readFileSync(app+'/supabase/schema.sql','utf8');
const functions=['moral_trade_private.invitation_status_is_usable',...Object.keys(statements).map(x=>'public.'+x)].map(name=>{
  const start=migration.indexOf('create or replace function '+name+'('),end=migration.indexOf('\n$$;',start);assert.ok(start>=0&&end>start);return migration.slice(start,end+4);
});
sql(`create role mt_email_job login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create schema moral_trade_private; create table public.profiles(id uuid primary key);
create table public.trade_invitations(id uuid primary key,status text,expires_at timestamptz);
${schema.match(/create table if not exists public\.email_outbox \([\s\S]*?\n\);/)[0]}
alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check check(status in ('queued','processing','retry','sent','failed','suppressed'));
alter table public.email_outbox add column available_at timestamptz default now(), add column locked_at timestamptz, add column lock_token uuid, add column idempotency_key text, add column provider_message_id text, add column suppressed_at timestamptz;
${functions.join('\n')}
revoke all on function public.claim_email_outbox_v2(uuid,integer),public.complete_email_outbox_v2(uuid,uuid,text),public.retry_email_outbox_v2(uuid,uuid,text),public.suppress_email_outbox_v2(uuid,uuid,text) from public;
grant execute on function public.claim_email_outbox_v2(uuid,integer),public.complete_email_outbox_v2(uuid,uuid,text),public.retry_email_outbox_v2(uuid,uuid,text),public.suppress_email_outbox_v2(uuid,uuid,text) to mt_email_job;
alter table public.email_outbox enable row level security;
create table public.test_options(completion_error boolean);
create function public.test_fail_completion() returns trigger language plpgsql as $$ begin
if new.id='${id(3)}' and new.status='sent' and exists(select 1 from public.test_options where completion_error) then raise exception 'Synthetic completion failure' using errcode='23514'; end if; return new; end; $$;
create trigger test_fail before update on public.email_outbox for each row execute function public.test_fail_completion();`);
assert.throws(()=>sql('select * from public.email_outbox;','mt_email_job'),/permission denied/);
assert.throws(()=>sql("update public.email_outbox set status='sent';",'mt_email_job'),/permission denied/);
assert.equal(sql("select rolbypassrls or rolsuper or rolcreaterole from pg_roles where rolname='mt_email_job';"),'f');
}
export function reset(name) {
  const count=name==='empty'?0:name==='overfull'?30:25;
  const attempt=['crash-fifth','last-attempt-error'].includes(name)?4:0;
  sql(`truncate public.email_outbox,public.trade_invitations,public.test_options;
insert into public.test_options values (${name==='completion-error'});
insert into public.trade_invitations values (${q(id(99))},'sent',now()+interval '${name==='expired-invitation'?'-1':'1'} day');
${Array.from({length:count},(_,i)=>`insert into public.email_outbox(id,recipient_email,subject,body,provider,attempt_count,idempotency_key,source_kind,source_id,created_at) values (${q(id(i+1))},'recipient@synthetic.invalid','Moral Trade: test update',${q(name==='unsafe'||(name==='mixed'&&i===1)?'Exact wish: synthetic confidential text':'A private update is waiting in your dashboard.')},'core_trade_reminder',${attempt},'synthetic-email-${i+1}','trade_invitation',${q(id(99))},now()+interval '${i} milliseconds');`).join('\n')}`);
}
export function snapshot() {return JSON.parse(sql(`select coalesce(json_agg(r),'[]') from (select id,status,attempt_count,provider,provider_message_id,last_error,body,round(extract(epoch from (available_at-now()))/60) as delay_minutes,(lock_token is not null) as leased from public.email_outbox order by id) r;`));}
