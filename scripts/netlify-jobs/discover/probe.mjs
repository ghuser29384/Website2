import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createDiscoverFixture} from './fixture.mjs';
import {startFixtureServer} from '../fixture-server.mjs';
// Initial individual-only baseline; deliberately does not claim complete Discover parity.
export async function runDiscoverBaseline({origin}){
 const base=new URL(origin);assert.equal(base.protocol,'http:');assert.equal(base.hostname,'127.0.0.1');
 const results=[];
 for(const includeRelated of [false,true])for(const count of [100,400]){
  const fixture=createDiscoverFixture({count,includeRelated}),server=await startFixtureServer(fixture,{port:15433});
  try{
   const pageIds=[];
   for(const page of [1,2]){
    const before=fixture.counts(),started=performance.now();
    const response=await fetch(new URL('/api/discover/search',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'',domain:'offers',offerKind:'individual',sort:'newest',page}),redirect:'manual',signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200);assert.match(response.headers.get('cache-control')??'',/no-store/);
    const reader=response.body.getReader();let bytes=0;const chunks=[];
    try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.length;assert.ok(bytes<=2*1024*1024);chunks.push(r.value);}}finally{await reader.cancel();reader.releaseLock();}
    const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(data.ok,true);assert.equal(data.sourceStatus.offers,'live');assert.equal(data.sources.individualOffers,'live');assert.equal(data.sources.coFunds,'not_requested');assert.equal(data.total,count);assert.equal(data.page,page);assert.equal(data.pageSize,50);assert.equal(data.items.length,50);assert.equal(data.hasMore,page*50<count);
    const ids=data.items.map(x=>x.id);assert.equal(new Set(ids).size,50);pageIds.push(ids);
    const after=fixture.counts(),calls=Object.fromEntries(Object.entries(after).map(([k,v])=>[k,v-(before[k]??0)]));assert.ok(calls['/rest/v1/offers']>0);
    const stable={...data};delete stable.checkedAt;const resultDigest=createHash('sha256').update(JSON.stringify(stable)).digest('hex');
    results.push({count,page,includeRelated,resultDigest,elapsedMs:performance.now()-started,responseBytes:bytes,requestCounts:calls,total:data.total});
   }
   assert.equal(new Set(pageIds.flat()).size,100,'Pages overlap');
  }finally{await server.close();}
 }
 return {results,hostedMeasurement:false,provesFreeFit:false,coverage:'individual signed-out browse and pagination; nonempty profiles/comments/recommendations plus optional linked offset/pool/charity/bond and preview/badge fixtures; Co-Fund, auth, filtering and rendered-client cases pending'};
}
