import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=await readFile(new URL('./candidate/normativity/api.ts.template',import.meta.url),'utf8');
function load(){
 const routes=[],uses=[],calls=[];
 const app={set:()=>{},all:(path,handler)=>routes.push({path,handler}),use:fn=>uses.push(fn)};
 const publicConfig=()=>{},audit=()=>{};
 const context=vm.createContext({express:()=>app,serverless:a=>a,createApp:()=>((req,res,next)=>calls.push({req,res,next})),publicConfig,audit});
 vm.runInContext(stripTypeScriptTypes(source).replace(/^import .*;\n/gm,'').replace('export const handler','const handler'),context);
 assert.equal(uses.length,1);assert.equal(routes.length,2);
 return {routes,calls,dispatch:uses[0],publicConfig,audit};
}
test('preserves both standalone handlers',()=>{
 const a=load();assert.equal(a.routes[0].path,'/api/public-config');assert.equal(a.routes[0].handler,a.publicConfig);assert.equal(a.routes[1].path,'/api/cron/commitment-audit');assert.equal(a.routes[1].handler,a.audit);
});
for(const path of ['/api/commitments','/api/commitments/','/api/commitments/health','/api/commitments/nested/action']){
 test('preserves full existing URL and request: '+path,()=>{
  const a=load(),req={path,url:path+'?x=1',method:'POST',body:{synthetic:true}},res={};let nextCalls=0;const next=()=>nextCalls++;
  a.dispatch(req,res,next);assert.equal(a.calls.length,1);assert.equal(a.calls[0].req,req);assert.equal(a.calls[0].res,res);assert.equal(a.calls[0].next,next);assert.equal(req.url,path+'?x=1');assert.equal(nextCalls,0);
 });
}
for(const path of ['/api/wre','/api/wre-ai','/api/commitments-other','/api/cron/other','/api/admin','/other']){
 test('does not expose unrelated Express routes: '+path,()=>{const a=load();let n=0;a.dispatch({path},{},()=>n++);assert.equal(a.calls.length,0);assert.equal(n,1);});
}
