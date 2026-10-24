import {resultCountDiagnostic} from './result-count.mjs';
import assert from 'node:assert/strict';
import {createSearchFixture} from './fixture.mjs';
import {startFixtureServer} from '../fixture-server.mjs';
export async function runSearchCases({origin,candidate}){
 const target=new URL(origin);assert.equal(target.protocol,'http:');assert.equal(target.hostname,'127.0.0.1');
 assert.ok(['canonical','legacy'].includes(candidate));
 const cases=[];let bytes=0,requests=0;
 if(candidate==='canonical'){const route=new URL('/offers?view=live&smart=1&search=volunter&sort=best_match',target);const response=await fetch(route,{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(response.status,307);const location=new URL(response.headers.get('location'),target);assert.equal(location.origin,target.origin);assert.equal(location.pathname,'/discover');assert.equal(location.searchParams.get('q'),'volunter');assert.equal(location.searchParams.get('sort'),'best-fit');await response.body?.cancel();}
 for(const count of [400,2000]){
  const fixture=createSearchFixture({count});const server=await startFixtureServer(fixture,{port:15433});
  try{
   for(const query of ['volunter','unmatchedxyz'])for(const sort of ['best_match','lowest_cost'])for(let repetition=0;repetition<2;repetition++){
    assert.ok(++requests<=16);const url=new URL('/offers',target);url.search=new URLSearchParams({view:'live',render:'server',smart:'1',search:query,sort}).toString();
    const before=fixture.requests(),started=performance.now();const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,'Search route status');const reader=response.body.getReader(),parts=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;bytes+=value.length;assert.ok(size<=8*1024*1024&&bytes<=128*1024*1024,'Response byte budget');parts.push(value);}}finally{await reader.cancel();reader.releaseLock();}
    const html=Buffer.concat(parts).toString('utf8');assert.ok(!html.includes('The live directory could not be loaded'),'Directory error');
    const expected=query==='volunter'?count:0;const countCheck=resultCountDiagnostic(html,expected,candidate);assert.ok(countCheck.matches,'Missing expected result count: '+JSON.stringify(countCheck));
    if(expected)assert.ok(html.includes('Synthetic participant'),'Fixture data missing');
    assert.ok(fixture.requests()>before,'No actual fixture request; cannot measure data path');
    cases.push({count,queryCase:query==='volunter'?'typo-match':'no-match',sort,repetition,elapsedMs:performance.now()-started,responseBytes:size,fixtureRequests:fixture.requests()-before,expectedMatches:expected});
   }
  }finally{await server.close();}
 }
 return {cases,requests,responseBytes:bytes,hostedMeasurement:false,provesFreeFit:false,scope:'explicit server-rendered route with signed-out synthetic offers; Discover redirect verified but client execution not measured; no real database or user distribution'};
}
