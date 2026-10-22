import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {adaptPublicHandler} from '../rlhf/adapter.mjs';
const root=new URL('../',import.meta.url);
const fixture=new URL('../cloudflare-compatibility-20261019/',root);
const baseline=JSON.parse(await readFile(new URL('rlhf-baseline-results.json',fixture)));
const source=await readFile(new URL('source/rlhf/index.mjs',fixture));
assert.equal(createHash('sha1').update(source).digest('hex'),baseline.sourceSha1);
const bundle=await readFile(new URL('source/rlhf/bundle.b64',fixture),'utf8');
assert.equal(createHash('sha256').update(Buffer.from(bundle.trim(),'base64')).digest('hex'),baseline.bundleSha256);
let fetches=0;
globalThis.fetch=async url=>{assert.equal(String(url),source.toString().match(/const BUNDLE_URL = "([^"]+)"/)[1]);fetches++;return new Response(bundle);};
const {default:original}=await import(new URL('source/rlhf/index.mjs',fixture));
const serve=adaptPublicHandler(original);
for(const c of baseline.cases){
 const r=await serve(new Request('https://example.invalid'+c.path,{method:c.method}));
 assert.equal(r.status,c.status,c.path);
 assert.deepEqual(Object.fromEntries(r.headers),c.headers,c.path);
 const bytes=Buffer.from(await r.arrayBuffer());
 assert.equal(bytes.length,c.bytes,c.path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256,c.path);
}
assert.equal(fetches,1);
// Fresh module: failed bundle fetch must return 503, then retry rather than cache failure.
const {default:retryHandler}=await import(new URL('source/rlhf/index.mjs?retry',fixture));
let attempts=0;
globalThis.fetch=async()=>{attempts++;return attempts===1?new Response('',{status:503}):new Response(bundle);};
const quiet=console.error;console.error=()=>{};
try{assert.equal((await adaptPublicHandler(retryHandler)(new Request('https://example.invalid/'))).status,503);}finally{console.error=quiet;}
assert.equal((await adaptPublicHandler(retryHandler)(new Request('https://example.invalid/'))).status,200);
assert.equal(attempts,2);
globalThis.fetch=async()=>{throw Error('Network disabled');};
const proxySource=await readFile(new URL((process.env.CANDIDATE==='legacy'?'moraltrade-legacy':'moraltrade')+'/proxy.ts',root),'utf8');
const nextSource=await readFile(new URL((process.env.CANDIDATE==='legacy'?'moraltrade-legacy':'moraltrade')+'/next.config.ts',root),'utf8');
let routing=0;
function compile(source,env,extra={}){
 const js=stripTypeScriptTypes(source).replace(/^import[\s\S]*?;\n/gm,'').replace(/export default nextConfig;/,'globalThis.nextConfig=nextConfig;').replace(/export /g,'');
 return vm.createContext({process:{env},...extra,js});
}
function response(kind,url,options={}){return {kind,url:url?.toString(),...options,headers:new Headers(options.headers),cookies:{values:[],set(value){this.values.push(value);}}};}
for(const netlify of ['true','false']){
 const context=compile(proxySource,{NETLIFY:netlify},{WALKTHROUGH_SEEN_COOKIE_NAME:'seen',userAgent:r=>({isBot:r.bot}),getDiscoverBrowseHref:()=>null,isPostgresUuid:s=>s==='valid',NextResponse:{next:()=>response('next'),rewrite:(u,o)=>response('rewrite',u,o),redirect:u=>response('redirect',u)}});
 vm.runInContext(context.js,context);
 const cfg=compile(nextSource,{NETLIFY:netlify});vm.runInContext(cfg.js,cfg);
 const rewrites=(await cfg.nextConfig.rewrites()).beforeFiles;
 assert.equal(rewrites.length,netlify==='true'?1:4);routing++;
 assert.equal(rewrites[0].destination,'/api/live-now-a1');routing++;
 for(const [path,dest] of [['/feed','/moral-trade-live.html'],['/discover','/moral-trade-discover.html'],['/walkthrough','/moral-trade-production.html']]){
  for(const method of ['GET','HEAD'])for(const prefetch of [true,false])for(const bot of [true,false])for(const seen of [true,false]){
   const u=new URL('https://example.invalid'+path+'?keep=a%26b');u.clone=()=>new URL(u);
   const req={url:u.href,nextUrl:u,method,bot,cookies:{has:()=>seen},headers:new Headers(prefetch?{purpose:'prefetch'}:{})};
   const res=context.proxy(req);
   assert.equal(res.kind,netlify==='true'?'rewrite':'next');
   if(netlify==='true'){assert.equal(new URL(res.url).pathname,dest);assert.equal(new URL(res.url).search,u.search);}
   const cookie=path==='/walkthrough'&&method==='GET'&&!prefetch&&!bot&&!seen;
   assert.equal(res.cookies.values.length,cookie?1:0);
   if(cookie){assert.equal(res.headers.get('cache-control'),'private, no-store');assert.equal(res.cookies.values[0].httpOnly,true);assert.equal(res.cookies.values[0].secure,true);}
   routing++;
  }
 }
}
const result={status:'PASS_LOCAL_ADAPTER_CONTRACTS_ONLY',rlhfBaselineCases:baseline.cases.length,rlhfFailureRecoveryCases:2,routingChecks:routing,externalRequests:0,netlifyBuild:false,normativityRuntime:false,hostedAcceptance:false};
await writeFile(new URL('local-results.json',root),JSON.stringify(result,null,2)+'\n');console.log(result);
