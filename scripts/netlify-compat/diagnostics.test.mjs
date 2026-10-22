import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redactDiagnostic,emulatorDiagnostic} from './diagnostics.mjs';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
test('redacts URL paths, query and userinfo',()=>{const r=redactDiagnostic('https://user:pass@example.org/secret?code=abc');assert.equal(r,'https://example.org/[path omitted]');});
test('redacts bearer and token fields',()=>{const r=redactDiagnostic('Bearer abc token=def password=xyz sbp_123abc');for(const secret of ['abc','def','xyz','123abc'])assert.ok(!r.includes(secret));});
test('retains useful plain build error',()=>assert.equal(redactDiagnostic('Unknown option --test'), 'Unknown option --test'));
test('bounds emulator output and preserves exit metadata',async()=>{const d=await mkdtemp(tmpdir()+'/netlify-diagnostic-');await writeFile(d+'/log','x'.repeat(9000)+'\nerror');const r=await emulatorDiagnostic(d+'/log',1,null);assert.equal(r.output.length,6000);assert.equal(r.exitCode,1);assert.ok(r.output.endsWith('error'));});
test('missing log is explicit',async()=>assert.equal((await emulatorDiagnostic('/nonexistent-netlify-log',null,'SIGTERM')).output,'Emulator log unavailable'));
test('fetch observer rethrows the original error without leaking query',()=>{
 const hook=new URL('./fetch-diagnostic.mjs',import.meta.url).href;
 const r=spawnSync(process.execPath,['--input-type=module','-e',`const e=new Error('test');e.cause={code:'ENETUNREACH'};globalThis.fetch=async()=>{throw e};await import(${JSON.stringify(hook)});try{await fetch('https://example.invalid/private?token=secret')}catch(x){if(x!==e)process.exit(2)}`],{encoding:'utf8'});
 assert.equal(r.status,0);const log=JSON.parse(r.stderr);assert.equal(log.hostname,'example.invalid');assert.equal(log.code,'ENETUNREACH');assert.ok(!r.stderr.includes('secret'));assert.ok(!r.stderr.includes('private'));
});
