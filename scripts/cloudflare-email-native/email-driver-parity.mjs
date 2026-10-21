import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { registerHooks, stripTypeScriptTypes, createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { app, pgRoot, localEnv, id, q, sql, statements, install, reset, snapshot, verifyDatabase } from './email-database-fixture.mjs';
import { installSourceLoader } from './source-loader.mjs';
const {Client}=createRequire(app+'/package.json')('pg');
const script=fileURLToPath(import.meta.url), folder=fileURLToPath(new URL('.',import.meta.url));
verifyDatabase();

if(process.argv[2]==='child') {
  const [mode,name,ledger]=process.argv.slice(3); assert.ok(['baseline','native'].includes(mode)); assert.ok(ledger.startsWith(folder));
  let providers=0,db=0,connections=0,closes=0;
  const nativeClients=[];
  function beforeQuery(text,values) {
    db++;
    if(name==='claim-error' && text.includes('claim_')) throw Object.assign(new Error('Synthetic claim failure'),{code:'P0001'});
    if(name==='stale-lease' && text.includes('complete_') && values[0]===id(3)) sql(`update public.email_outbox set lock_token=${q(id(999))} where id=${q(id(3))};`);
  }
  globalThis.__emailPgFactory=()=>{
    connections++;const c=new Client({host:pgRoot+'/socket',port:15442,user:'mt_email_job',database:'postgres',application_name:'synthetic-email-parity',connectionTimeoutMillis:5000});const query=c.query.bind(c),end=c.end.bind(c);
    c.query=async(text,values)=>{beforeQuery(text,values);return query(text,values);};
    c.end=async()=>{closes++;await end();c.testClosed=true;};nativeClients.push(c);return c;
  };
  registerHooks({resolve(specifier,context,next){
    if(specifier==='pg') return {url:'synthetic:pg',shortCircuit:true};
    if(specifier==='@opennextjs/cloudflare') return {url:'synthetic:cf-context',shortCircuit:true};
    return next(specifier,context);
  },load(url,context,next){
    const source={
      'synthetic:pg':'export class Client { constructor(options) { if(options.connectionString!=="synthetic-only-binding") throw new Error("Unexpected database destination"); return globalThis.__emailPgFactory(); } }',
      'synthetic:cf-context':'export function getCloudflareContext(){ return {env:{EMAIL_OUTBOX_DB:{connectionString:"synthetic-only-binding"}}}; }',
    }[url];
    return source?{format:'module',source,shortCircuit:true}:next(url,context);
  }});
  const fixture={handle(method,path,headers,body){
    assert.equal(method,'POST');
    if(path==='/synthetic-provider/emails') {
      providers++;
      if(name.startsWith('crash-') && providers===11) process.exit(86);
      const key=headers['idempotency-key'];assert.match(key,/^synthetic-email-\d+$/);assert.equal(body.to,'recipient@synthetic.invalid');
      if(['full','crash-first','crash-fifth'].includes(name) && providers>1) assert.equal(sql(`select status from public.email_outbox where id=${q(id(providers-1))};`),'sent','Previous delivery must already be committed');
      if(['provider-error','last-attempt-error'].includes(name) && key==='synthetic-email-3') return {status:500,body:{message:'Synthetic provider failure'}};
      appendFileSync(ledger,key+'\n',{mode:0o600});return {status:200,body:{id:'provider-'+key}};
    }
    assert.equal(mode,'baseline','Native route must make no database HTTP calls');
    const operation=new URL(path,'https://synthetic.invalid').pathname.slice('/rest/v1/rpc/'.length), entry=statements[operation];assert.ok(entry);
    const values=entry[1].map(key=>body[key]);
    try {
      beforeQuery(entry[0],values);
      const text=entry[0].replace(/\$(\d+)/g,(_,i)=>q(values[Number(i)-1]));
      const rows=JSON.parse(sql(`WITH r AS MATERIALIZED (${text}) SELECT coalesce(json_agg(r),'[]') FROM r;`,'mt_email_job'));
      return {status:200,body:operation==='claim_email_outbox_v2'?rows:rows[0]?.value??null};
    } catch(error){return {status:500,body:{message:error.message}};}
  }};
  installSourceLoader(app,fixture);
  process.env.EMAIL_OUTBOX_TRANSPORT=mode==='native'?'hyperdrive':'rest';
  if(name==='missing-provider') delete process.env.RESEND_API_KEY;
  let route;
  if(mode==='native') route=await import(pathToFileURL(app+'/src/app/api/jobs/email/route.ts'));
  else {
    const source=readFileSync(new URL('./baseline-email-route.ts',import.meta.url),'utf8');
    route=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'));
  }
  const response=await route[name==='post'?'POST':'GET'](new Request('https://synthetic.invalid/api/jobs/email',{method:name==='post'?'POST':'GET',headers:name==='unauthorized'?{}:{authorization:'Bearer synthetic-scheduler-secret-only'}}));
  const body=await response.json();
  assert.ok(nativeClients.every(c=>c.testClosed===true),'All native connections closed');
  console.log(JSON.stringify({status:response.status,body,providers,db,connections,closes}));process.exit(0);
}

install();
const results=[];
for(const name of ['full','empty','post','overfull','mixed','unsafe','provider-error','completion-error','stale-lease','last-attempt-error','claim-error','expired-invitation','missing-provider','unauthorized','crash-first','crash-fifth']) {
  const cases=[];
  for(const mode of ['baseline','native']) {
    reset(name);
    const ledger=folder+pgRoot.split('/').pop()+'-'+name+'-'+mode+'.synthetic.txt'; assert.equal(existsSync(ledger),false,'Do not overwrite previous evidence');
    const child=spawnSync(process.execPath,[script,'child',mode,name,ledger],{env:{...localEnv,EMAIL_NATIVE_PG_ROOT:pgRoot,CF_APP_ROOT:app,CF_EMAIL_PSQL:process.env.CF_EMAIL_PSQL},encoding:'utf8',timeout:30000});
    assert.equal(child.status,name.startsWith('crash-')?86:0,child.stderr);
    const execution=child.stdout?JSON.parse(child.stdout):null;
    const accepted=existsSync(ledger)?readFileSync(ledger,'utf8').trim().split('\n'):[];
    const state=snapshot();
    if(name.startsWith('crash-')) {assert.equal(accepted.length,10);assert.equal(state.filter(e=>e.status==='sent').length,10);}
    let reclaimed=[];
    if(name.startsWith('crash-')) {
      sql("update public.email_outbox set locked_at=now()-interval '11 minutes' where status='processing';");
      reclaimed=JSON.parse(sql(`select coalesce(json_agg(e.idempotency_key),'[]') from public.claim_email_outbox_v2(${q(id(999))},25) e;`,'mt_email_job'));
      assert.equal(reclaimed.filter(k=>accepted.includes(k)).length,0);
      assert.equal(reclaimed.length,name==='crash-first'?15:0);
    }
    if(name==='full') {assert.equal(execution.body.sent,25);assert.equal(execution.db,26);assert.equal(execution.providers,25);if(mode==='native') assert.equal(execution.connections,1);}
    if(name==='overfull') {assert.equal(execution.body.claimed,25);assert.equal(state.filter(e=>e.status==='queued').length,5);}
    cases.push({mode,execution,accepted,state,reclaimed});
  }
  assert.deepEqual(cases[1].execution?.body,cases[0].execution?.body,name+' response');
  assert.equal(cases[1].execution?.status,cases[0].execution?.status,name+' status');
  assert.deepEqual(cases[1].state,cases[0].state,name+' persisted state');
  assert.deepEqual(cases[1].accepted,cases[0].accepted,name+' deliveries');
  assert.deepEqual(cases[1].reclaimed,cases[0].reclaimed,name+' reclaim');
  results.push({name,parity:true,...(cases[1].execution??{}),sent:cases[1].state.filter(e=>e.status==='sent').length,accepted:cases[1].accepted.length,reclaimed:cases[1].reclaimed.length});
}
writeFileSync(new URL('./database-result.json',import.meta.url),JSON.stringify({verdict:'PASS_REAL_PG_DRIVER_PARITY_NOT_HOSTED_FREE_ACCEPTANCE',scenarios:results.length,restrictedRoleChecks:3,pgDriver:'pg 8.23.1 on Node; hosted Hyperdrive not exercised',results},null,2)+'\n');
console.log(JSON.stringify({scenarios:results.length,restrictedRoleChecks:3,verdict:'PASS_REAL_PG_DRIVER_PARITY_NOT_HOSTED_FREE_ACCEPTANCE'}));
