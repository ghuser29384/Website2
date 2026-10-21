import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { installSourceLoader } from './source-loader.mjs';

// Only an explicitly created, disposable Unix-socket cluster is accepted. Never a URL.
const root = process.env.CF_APP_ROOT;
const pgRoot = process.env.CF_TEST_PG_ROOT;
const psql = process.env.CF_TEST_PSQL;
assert.ok(root?.startsWith('/'));
assert.match(pgRoot ?? '', /^\/(?:private\/)?tmp\/mt-roundtrip-pg-[a-zA-Z0-9-]+$/);
assert.ok(psql?.startsWith('/') && psql.endsWith('/psql'));
const args = ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', pgRoot + '/socket', '-p', '15439', '-U', 'postgres', '-d', 'postgres'];
const env = { PATH: '/usr/bin:/bin', LC_ALL: 'C' };
const quote = value => value == null ? 'NULL' : "'" + String(value).replaceAll("'", "''") + "'";
function sql(source, role = 'postgres') {
  assert.ok(['postgres', 'service_role', 'anon', 'authenticated'].includes(role));
  const r = spawnSync(psql, args, { env, encoding: 'utf8', input: `set role ${role}; set timezone='UTC'; set statement_timeout=15000;\n${source}`, maxBuffer: 2 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || 'Synthetic SQL failed');
  return r.stdout.trim();
}
const cluster = JSON.parse(sql("select json_build_object('dir',current_setting('data_directory'),'tcp',current_setting('listen_addresses'));"));
assert.equal(cluster.dir, pgRoot + '/data'); assert.equal(cluster.tcp, '');
assert.equal(sql("select count(*) from pg_tables where schemaname='public';"), '0', 'Test requires a new empty cluster');

const schema = readFileSync(resolve(root, 'supabase/schema.sql'), 'utf8');
const tradeMigration = readFileSync(resolve(root, 'supabase/migrations/20260716080505_core_trade_loop.sql'), 'utf8');
const deliveryMigration = readFileSync(resolve(root, 'supabase/migrations/20260722223000_harden_trade_invitations.sql'), 'utf8');
const outboxDdl = schema.match(/create table if not exists public\.email_outbox \([\s\S]*?\n\);/)[0];
const notificationDdl = tradeMigration.match(/create table if not exists public\.trade_notifications \([\s\S]*?\n\);/)[0];
const idempotencyDdl = deliveryMigration.slice(deliveryMigration.indexOf('create or replace function public.ensure_email_outbox_idempotency()'), deliveryMigration.indexOf('create or replace function moral_trade_private.lock_pair'));
sql(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create table public.profiles(id uuid primary key, email text);
create table public.agreements(id uuid primary key, proposer_id uuid references public.profiles, responder_id uuid references public.profiles, evidence_due_at date, lifecycle_status text not null check(lifecycle_status in ('active','evidence_due','completed')), updated_at timestamptz);
${outboxDdl}
${notificationDdl}
alter table public.email_outbox add column dedupe_key text, add column idempotency_key text, add column available_at timestamptz default now();
create unique index on public.email_outbox(idempotency_key) where idempotency_key is not null;
${idempotencyDdl}
create table public.test_failures(kind text primary key);
create function public.test_fail_write() returns trigger language plpgsql as $$ begin
  if exists(select 1 from public.test_failures where kind=TG_TABLE_NAME) then
    if TG_TABLE_NAME='agreements' or (to_jsonb(new)->>'user_id')='10000000-0000-4000-8000-000000000001' or (to_jsonb(new)->>'profile_id')='10000000-0000-4000-8000-000000000001' then
      raise exception 'Synthetic per-item constraint failure' using errcode='23514';
    end if;
  end if;
  return new;
end; $$;
create trigger test_fail before update on public.agreements for each row execute function public.test_fail_write();
create trigger test_fail before insert on public.trade_notifications for each row execute function public.test_fail_write();
create trigger test_fail before insert on public.email_outbox for each row execute function public.test_fail_write();
alter table public.agreements enable row level security;
alter table public.trade_notifications enable row level security;
alter table public.email_outbox enable row level security;
grant usage on schema public to service_role, anon, authenticated;
grant select,insert,update on all tables in schema public to service_role;
`);
sql(readFileSync(new URL('./reminder-batch.sql', import.meta.url), 'utf8'));

const FIXED = '2026-10-21T12:00:00.000Z', RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super(FIXED); } static now() { return new RealDate(FIXED).valueOf(); } };
const A = '10000000-0000-4000-8000-000000000001', B = '10000000-0000-4000-8000-000000000002';
const id = n => `20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let operations = 0, lastBatch, options = {};
function reset(next = {}) {
  operations = 0; lastBatch = undefined; options = next;
  sql(`truncate public.test_failures, public.email_outbox, public.trade_notifications, public.agreements, public.profiles;
insert into public.profiles values (${quote(A)},${quote(next.missingEmail ? ' ' : 'a@synthetic.invalid')}),(${quote(B)},'b@synthetic.invalid');
${Array.from({length: next.count ?? 1}, (_, i) => `insert into public.agreements values (${quote(id(i+1))},${quote(A)},${quote(B)},${quote(next.due ?? '2026-10-20')},${quote(next.status ?? 'active')},null);`).join('\n')}
${next.failure ? `insert into public.test_failures values (${quote(next.failure)});` : ''}`);
}
function selectJson(query) { return JSON.parse(sql(query, 'service_role')); }
const fixture = { violations: [], handle(method, path, _headers, body) {
  operations++;
  const u = new URL(path, 'http://127.0.0.1'), table = u.pathname.slice('/rest/v1/'.length), q = u.searchParams;
  try {
    let result;
    if (table === 'rpc/apply_trade_reminder_batch_v1' && method === 'POST') {
      lastBatch = body;
      if (options.batchError) return { status: 500, body: { message: 'Synthetic RPC transport unavailable' } };
      result = selectJson(`select public.apply_trade_reminder_batch_v1(${quote(JSON.stringify(body.p_reminders))}::jsonb,${quote(body.p_updated_at)}::timestamptz);`);
    } else if (method === 'GET' && table === 'agreements') {
      assert.equal(q.get('limit'), '200'); assert.equal(q.get('lifecycle_status'), 'in.(active,evidence_due)');
      if (options.readError) return { status: 500, body: { message: 'Synthetic read unavailable' } };
      result = selectJson(`select coalesce(jsonb_agg(to_jsonb(a)), '[]') from (select id,proposer_id,responder_id,evidence_due_at,lifecycle_status from public.agreements where lifecycle_status in ('active','evidence_due') and evidence_due_at is not null and evidence_due_at <= ${quote(q.get('evidence_due_at').slice(4))}::date order by evidence_due_at limit 200) a;`);
    } else if (method === 'GET' && table === 'profiles') {
      if (options.profileError) return { status: 500, body: { message: 'Synthetic profile read unavailable' } };
      result = selectJson('select coalesce(jsonb_agg(to_jsonb(p)),\'[]\') from (select id,email from public.profiles) p;');
    } else if (method === 'PATCH' && table === 'agreements') {
      assert.equal(q.get('lifecycle_status'),'eq.active');
      sql(`update public.agreements set lifecycle_status=${quote(body.lifecycle_status)}, updated_at=${quote(body.updated_at)} where id=${quote(q.get('id').slice(3))}::uuid and lifecycle_status='active';`, 'service_role'); result = null;
    } else if (method === 'POST' && ['trade_notifications','email_outbox'].includes(table)) {
      const keys = table === 'trade_notifications' ? ['user_id','notification_type','title','body','href','dedupe_key'] : ['profile_id','recipient_email','subject','body','status','provider'];
      assert.deepEqual(Object.keys(body).sort(), [...keys].sort());
      const query = `insert into public.${table}(${keys.join(',')}) values (${keys.map(k => quote(body[k])).join(',')})`;
      result = table === 'trade_notifications' ? selectJson(`with n as (${query} returning id) select to_jsonb(n) from n;`) : (sql(query + ';','service_role'), null);
    } else throw new Error('Unexpected synthetic operation');
    return { status: 200, body: result };
  } catch (error) { return { status: 500, body: { message: error.message } }; }
} };
installSourceLoader(root, fixture);
const changed = await import(pathToFileURL(resolve(root,'src/app/api/jobs/trade-reminders/route.ts')));
const base = process.env.CF_BASELINE_REMINDER
  ? { status: 0, stdout: readFileSync(process.env.CF_BASELINE_REMINDER, 'utf8') }
  : spawnSync('git', ['show','a4adf0cbb7029a6316a34478bd27dffad22cbca4:src/app/api/jobs/trade-reminders/route.ts'], { cwd:root,encoding:'utf8' });
assert.equal(base.status,0);
const original = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(base.stdout,{mode:'transform'})).toString('base64'));
async function invoke(route, authorized = true) {
  const r = await route.GET(new Request('https://synthetic.invalid/api/jobs/trade-reminders', { headers: authorized ? { authorization:'Bearer synthetic-scheduler-secret-only' } : {} }));
  return { status:r.status, body:await r.json() };
}
function snapshot() {
  return JSON.parse(sql(`select json_build_object(
    'agreements',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from (select id,lifecycle_status from public.agreements) a),
    'notifications',(select coalesce(jsonb_agg(to_jsonb(n) order by dedupe_key),'[]') from (select user_id,notification_type,title,body,href,dedupe_key from public.trade_notifications) n),
    'emails',(select coalesce(jsonb_agg(to_jsonb(e) order by profile_id,body),'[]') from (select profile_id,recipient_email,subject,body,status,provider,attempt_count from public.email_outbox) e),
    'validEmailKeys',(select count(*) from public.email_outbox where idempotency_key='email-outbox:'||id::text));`));
}
async function parity(opts, repeats=1) {
  const results=[];
  for (const route of [original,changed]) { reset(opts); const responses=[]; for(let i=0;i<repeats;i++) responses.push(await invoke(route)); results.push({responses,state:snapshot(),operations}); }
  assert.deepEqual(results[1].responses,results[0].responses); assert.deepEqual(results[1].state,results[0].state); return results;
}
test('ten overdue agreements retain all effects with 52 -> 3 calls', async()=> { const r=await parity({count:10}); assert.equal(r[0].operations,52); assert.equal(r[1].operations,3); assert.equal(r[1].state.emails.length,20); });
test('full 200-agreement batch retains 400 reminders with 1002 -> 3 calls', async()=> { const r=await parity({count:200}); assert.equal(r[0].operations,1002); assert.equal(r[1].operations,3); assert.equal(r[1].state.emails.length,400); });
test('future due date, blank recipient and missing profile read retain existing outcomes', async()=> { for(const opts of [{due:'2026-10-24'},{missingEmail:true},{profileError:true}]) await parity(opts); });
test('empty, out-of-window and completed agreements do no writes', async()=> { for(const opts of [{count:0},{due:'2026-10-25'},{status:'completed'}]) {const r=await parity(opts); assert.equal(r[1].operations,1);} });
test('update failure still notifies; notification failure suppresses only its email; queue failure retains notification', async()=> { for(const failure of ['agreements','trade_notifications','email_outbox']) await parity({failure}); });
test('duplicate runs retain dedupe, including an earlier failed email insert', async()=> { await parity({},2); await parity({failure:'email_outbox'},2); });
test('read error and unauthorized requests do no writes', async()=> { await parity({readError:true}); reset(); const r=await invoke(changed,false); assert.equal(r.status,401); assert.equal(operations,0); });
test('RPC failure returns 500 without replaying legacy mutations', async()=> {reset({batchError:true}); const r=await invoke(changed); assert.equal(r.status,500); assert.equal(operations,3); assert.equal(snapshot().notifications.length,0);});
test('only service role can execute; invoker function has no extra data privileges', ()=> {
  const fn='public.apply_trade_reminder_batch_v1(jsonb,timestamp with time zone)';
  for(const role of ['anon','authenticated']) {
    assert.equal(sql(`select has_function_privilege(${quote(role)},${quote(fn)},'EXECUTE');`),'f');
    assert.throws(()=>sql(`select public.apply_trade_reminder_batch_v1('[]','2026-10-21');`,role));
  }
  assert.equal(sql(`select prosecdef from pg_proc where oid=${quote(fn)}::regprocedure;`),'f');
  assert.equal(sql(`select has_function_privilege('service_role',${quote(fn)},'EXECUTE');`),'t');
});
test('invalid/oversized inputs fail without partial writes', ()=> {
  reset(); const large=Array.from({length:201},()=>({}));
  for(const data of [null,{},large,[{recipients:[]}]]) assert.throws(()=>sql(`select public.apply_trade_reminder_batch_v1(${quote(JSON.stringify(data))}::jsonb,'2026-10-21');`,'service_role'));
  assert.equal(snapshot().notifications.length,0);
});
test('overlapping batches use the real unique constraint to queue each notification once', async()=> {
  reset({count:10}); await invoke(changed); const batch=lastBatch; reset({count:10});
  const source=`set role service_role; set statement_timeout=15000; select public.apply_trade_reminder_batch_v1(${quote(JSON.stringify(batch.p_reminders))}::jsonb,${quote(batch.p_updated_at)});`;
  const call=()=>new Promise((resolve,reject)=>{const p=spawn(psql,args,{env,stdio:['pipe','pipe','pipe']}); let out='',err='';p.stdout.on('data',c=>out+=c);p.stderr.on('data',c=>err+=c);p.on('error',reject);p.on('close',code=>code===0?resolve(JSON.parse(out)):reject(new Error(err)));p.stdin.end(source);});
  const r=await Promise.all([call(),call()]); assert.equal(r.reduce((n,x)=>n+x.notificationsCreated,0),20); assert.equal(r.reduce((n,x)=>n+x.emailsQueued,0),20); assert.equal(snapshot().emails.length,20);
});
