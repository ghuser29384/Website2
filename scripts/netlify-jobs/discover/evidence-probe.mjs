import assert from 'node:assert/strict';import {createDiscoverFixture} from './fixture.mjs';import {startFixtureServer} from '../fixture-server.mjs';
// Explicit synthetic fixture: empty notes expose generated baseline-confidence text.
export async function runOffsetEvidenceSearch({origin}) {
 const target=new URL(origin);assert.equal(target.protocol,'http:');assert.equal(target.hostname,'127.0.0.1');const results=[];
 for(const includeRelated of [false,true]){
  const base=createDiscoverFixture({count:100,includeRelated});
  const fixture={async handle(req){const response=await base.handle(req);if(new URL(req.url).pathname!=='/rest/v1/offers')return response;const rows=await response.json();return Response.json(rows.map(row=>({...row,notes:''})),{status:response.status,headers:response.headers});}};
  const server=await startFixtureServer(fixture,{port:15433});
  try{const response=await fetch(new URL('/api/discover/search',target),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'moderate',normalizedQuery:'moderate',domain:'offers',offerKind:'individual',sort:'newest',page:1}),redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);const data=await response.json();assert.equal(data.ok,true);assert.equal(data.sourceStatus.offers,'live');assert.equal(data.clarification,null);assert.equal(data.total,includeRelated?33:0);assert.equal(data.items.length,data.total);results.push({includeRelated,total:data.total});}finally{await server.close();}
 }
 return {results,hostedMeasurement:false,provesFreeFit:false};
}
