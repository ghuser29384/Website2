// Uses only tooling already installed on the disposable runner. No install/deploy/network.
import {createRequire} from 'node:module';import {readFile,writeFile,lstat} from 'node:fs/promises';import {join,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
export async function buildMeasurementEntry(staged,tools){
 const requireTools=createRequire(join(resolve(tools),'package.json'));
 const {build}=await import(requireTools.resolve('esbuild'));
 const outfile=join(staged,'synthetic-search.mjs');
 for(const file of [outfile,join(staged,'synthetic-search.json')]){try{await lstat(file);throw Error('Measurement output already exists');}catch(e){if(e.code!=='ENOENT')throw e;}}
 const result=await build({entryPoints:[fileURLToPath(new URL('./entry.mjs',import.meta.url))],outfile,bundle:true,platform:'node',format:'esm',banner:{js:'import { createRequire as syntheticCreateRequire } from "node:module"; const require = syntheticCreateRequire(import.meta.url);'},target:'node22',metafile:true,alias:{'@netlify/blobs/server':requireTools.resolve('@netlify/blobs/server')},logLevel:'silent'});
 const source=await readFile(outfile,'utf8');
 if(!source.includes('compiled-entry.mjs')||!source.includes('synthetic-local-cache-only'))throw Error('Incomplete measurement entry');
 await writeFile(join(staged,'synthetic-search.json'),JSON.stringify({version:1,config:{nodeBundler:'none',includedFiles:['**']}}),{flag:'wx',mode:0o600});
 return {entryBytes:Buffer.byteLength(source),bundledInputs:Object.keys(result.metafile.inputs).length,hostedMeasurement:false};
}
