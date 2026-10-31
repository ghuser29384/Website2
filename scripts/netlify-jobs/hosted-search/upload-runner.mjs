// Entry point for the separately approved single hosted run. Not invoked by diagnostics.
import assert from 'node:assert/strict';import {readFile,writeFile,lstat} from 'node:fs/promises';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {makeNetlifyApi} from './upload-api.mjs';import {uploadVerifiedDraft} from './upload-executor.mjs';
import {UploadValidationError} from './upload-plan.mjs';
let phase='entry';
export async function main(env=process.env){
 assert.equal(env.NETLIFY_HOSTED_TEST_APPROVAL,'one-disposable-search-draft');
 assert.equal(env.GITHUB_REPOSITORY,'ghuser29384/Website2');assert.equal(env.GITHUB_REF,'refs/heads/build/netlify-hosted-search-20261025');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
 assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.ok(env.RUNNER_TEMP?.startsWith('/'));
 const root=join(env.RUNNER_TEMP,'netlify-compat-legacy');
 phase='read-build-report';
 const report=JSON.parse(await readFile(join(root,'jobs-result.json'),'utf8'));assert.equal(report.status,'SYNTHETIC_BUILT_RUNTIME_PASS');
 phase='read-package';
 const manifest=JSON.parse(await readFile(join(root,'packaged-synthetic-search/manifest.json'),'utf8'));
 const archivePath=join(root,'packaged-synthetic-search/synthetic-search.zip');const info=await lstat(archivePath);assert.ok(info.isFile()&&!info.isSymbolicLink()&&info.size>0&&info.size<50*1024*1024);
 const output=join(env.RUNNER_TEMP,'netlify-hosted-search-deployment.json');
 try{await lstat(output);throw Error('A previous deployment attempt is already recorded');}catch(e){if(e.code!=='ENOENT')throw e;}
 phase='prepare-api';
 const archive=await readFile(archivePath);const api=makeNetlifyApi(env.NETLIFY_AUTH_TOKEN,fetch,event=>console.log(JSON.stringify({uploadDiagnostic:event})));
 phase='validate-and-upload';
 const result=await uploadVerifiedDraft({approval:env.NETLIFY_HOSTED_TEST_APPROVAL,manifest,archive,evidence:report.hostedTransportEvidence,api,wait:delay,onCreated:r=>writeFile(output,JSON.stringify({...r,status:'created-not-yet-verified',sourceSha:env.GITHUB_SHA})+'\n',{flag:'wx',mode:0o600})});
 await writeFile(output,JSON.stringify({...result,status:'ready',sourceSha:env.GITHUB_SHA})+'\n',{mode:0o600});console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(error=>{console.error(JSON.stringify({uploadStoppedAt:phase,validation:error instanceof UploadValidationError?error.code:'unclassified'}));console.error('STOP: Hosted draft operation not verified; no automatic retry. Inspect the recorded deployment and dashboard.');process.exitCode=1;});}
