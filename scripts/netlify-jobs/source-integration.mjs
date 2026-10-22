// Exercises the runtime probe locally, not the Netlify adapter or supabase-js SDK.
import {registerHooks,stripTypeScriptTypes} from 'node:module';import {readFileSync,existsSync,writeFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';
import {startSyntheticPostgres} from './postgres.mjs';import {startFixtureServer} from './fixture-server.mjs';import {providerRouting} from './provider-routing.mjs';import {FIXTURE_TOKEN} from './http-fixture.mjs';import {runJobCases} from './runtime-probe.mjs';
const root=new URL('../../',import.meta.url),src=new URL('src/',root).href;
Object.assign(process.env,{CRON_SECRET:'synthetic-cron-secret',RESEND_API_KEY:FIXTURE_TOKEN,EMAIL_FROM:'test@synthetic.invalid',NEXT_PUBLIC_SITE_URL:'https://synthetic.invalid'});
globalThis.fetch=providerRouting(globalThis.fetch.bind(globalThis),'http://127.0.0.1:15433');
registerHooks({resolve(s,c,next){
 if(s==='next/server')return {url:'synthetic:next',shortCircuit:true};
 if(s==='server-only')return {url:'synthetic:empty',shortCircuit:true};
 let u;if(s.startsWith('@/'))u=new URL(s.slice(2),src).href;else if(s.startsWith('.')&&c.parentURL?.startsWith(src))u=new URL(s,c.parentURL).href;
 if(u){if(u.replace(/\.ts$/,'').endsWith('/lib/supabase/server'))return {url:'synthetic:db',shortCircuit:true};if(existsSync(fileURLToPath(u)+'.ts'))u+='.ts';return {url:u,shortCircuit:true};}return next(s,c);
},load(u,c,next){
 const stubs={'synthetic:next':'export const NextResponse=Response;','synthetic:empty':'export {};','synthetic:db':`export const createServiceClient=()=>({rpc:async(name,args)=>{const r=await fetch('http://127.0.0.1:15433/rest/v1/rpc/'+name,{method:'POST',headers:{authorization:'Bearer ${FIXTURE_TOKEN}'},body:JSON.stringify(args)});const value=await r.json();return r.ok?{data:value,error:null}:{data:null,error:value};}});`};
 if(u in stubs)return {format:'module',source:stubs[u],shortCircuit:true};if(u.startsWith(src)&&u.endsWith('.ts'))return {format:'module',source:stripTypeScriptTypes(readFileSync(new URL(u),'utf8'),{mode:'transform'}),shortCircuit:true};return next(u,c);
}});
const route=await import(new URL('src/app/api/jobs/email/route.ts',root));
const pg=startSyntheticPostgres(process.argv[2],fileURLToPath(root));let server;
try{
 server=await startFixtureServer({handle:r=>route[r.method](r)});
 const result=await runJobCases({origin:server.origin,pg});
 result.runtime='source handler with Next/SDK stubs, real HTTP and SQL';
 writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.cases.length,netlifyRuntime:false,durations:result.cases.map(c=>({name:c.name,ms:Math.round(c.elapsedMs)}))}));
}finally{if(server)await server.close();pg.stop();console.log(JSON.stringify({clusterRetained:pg.root,stopped:true}));}
