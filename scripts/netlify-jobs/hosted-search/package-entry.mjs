import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Offline packaging only; uses dependencies already installed with pinned Netlify CLI.
import {createRequire} from 'node:module';import {readFile,writeFile,lstat,mkdir} from 'node:fs/promises';import {join,resolve,dirname,relative} from 'node:path';import assert from 'node:assert/strict';
import {validateSearchManifest} from './package-policy.mjs';
export async function packageMeasurementEntry(staged,tools,destination,inventory){
 const requireTools=createRequire(join(resolve(tools),'package.json'));
 const {zipFunctions}=await import(requireTools.resolve('@netlify/zip-it-and-ship-it'));
 try{await lstat(destination);throw Error('Package destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(destination);
 const manifestPath=join(destination,'manifest.json');
 const results=await zipFunctions(dirname(staged),destination,{archiveFormat:'zip',manifest:manifestPath,basePath:staged,config:{'*':{nodeVersion:'22',nodeBundler:'none',includedFiles:['**']}},parallelLimit:1});
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 // Only bounded non-sensitive metadata is printed, never archive contents or environment.
 console.log(JSON.stringify({stage:'synthetic-package-manifest',functions:manifest.functions?.map(f=>({name:f.name,runtime:f.runtime,api:f.buildData?.runtimeAPIVersion,routes:f.routes,schedule:f.schedule}))}));
 validateSearchManifest(manifest);
 assert.equal(results.length,1);assert.equal(results[0].name,'synthetic-search');
 const archive=results[0].path;assert.equal(dirname(resolve(archive)),resolve(destination));
 const stat=await lstat(archive);assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<50*1024*1024,'Bounded real archive');
 const entryData=await readFile(join(staged,'synthetic-search.mjs'));
 const expected=[...inventory,{path:'synthetic-search.mjs',sha256:createHash('sha256').update(entryData).digest('hex')}];
 const inventoryPath=join(destination,'expected-runtime.json');
 await writeFile(inventoryPath,JSON.stringify(expected),{flag:'wx',mode:0o600});
 const extracted=join(destination,'verified-runtime');
 const integrity=JSON.parse(execFileSync('python3',['-B',fileURLToPath(new URL('./archive-check.py',import.meta.url)),archive,inventoryPath,extracted],{encoding:'utf8',timeout:90000,maxBuffer:65536}));
 assert.equal(integrity.integrityVerified,true);
 const archiveSha256=createHash('sha256').update(await readFile(archive)).digest('hex');
 const extractedEntry=relative(dirname(destination),join(extracted,integrity.runtimeRoot,'synthetic-search.mjs'));
 return {archiveSha256,extractedEntry,functions:1,archiveBytes:stat.size,manifestVerified:true,integrity,hostedMeasurement:false};
}
