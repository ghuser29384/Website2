import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {boundedRequest} from './bounded-request.mjs';

export async function runHostedTest(origin,cases,fetchImpl=fetch){
 const url=new URL(origin);
 if(!/^[a-f0-9]{24}--moraltrade-rlhf-compat-20261021\.netlify\.app$/.test(url.hostname)||url.hash||url.port)throw Error('Expected approved immutable draft deployment URL');
 if(cases.length!==94)throw Error('Expected unchanged 94-case baseline');
 const request=boundedRequest(origin,fetchImpl);const failures=[];let passed=0,attempted=0;
 for(const [index,c] of cases.entries()){
  attempted++;let r,body;
  try{r=await request(c);body=Buffer.from(await r.arrayBuffer());}
  catch{return {status:'STOP',attempted,passed,failures,reason:'request-or-budget-error'};}
  const mismatches=[];
  if(r.status!==c.status)mismatches.push('status');
  for(const [k,v] of Object.entries(c.headers))if(r.headers.get(k)!==v)mismatches.push('header:'+k);
  if(createHash('sha256').update(body).digest('hex')!==c.sha256)mismatches.push('body-sha256');
  if(mismatches.length)failures.push({index,method:c.method,path:c.path,mismatches});else passed++;
 }
 return {status:failures.length?'FAIL':'PASS',attempted,passed,failures};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [origin,baseline]=process.argv.slice(2);
 const data=JSON.parse(await readFile(baseline,'utf8'));
 const result=await runHostedTest(origin,data.cases);
 console.log(JSON.stringify(result));process.exitCode=result.status==='PASS'?0:1;
}
