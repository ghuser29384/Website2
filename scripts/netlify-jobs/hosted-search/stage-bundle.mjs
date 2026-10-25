// Local preparation only. No deployment, installation, deletion, or network access.
import {lstat,readdir,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateArchivePaths} from './package-policy.mjs';
const entry='___netlify-server-handler.mjs',manifest='___netlify-server-handler.json';
export async function stageBundle(source,destination){
 source=resolve(source);destination=resolve(destination);
 const sourceStat=await lstat(source);if(!sourceStat.isDirectory()||sourceStat.isSymbolicLink())throw Error('Real generated directory required');
 if(destination===source||destination.startsWith(source+'/'))throw Error('Separate new staging directory required');
 // Refuse existing output; never overwrite user or prior run files.
 try{await lstat(destination);throw Error('Staging destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 const records=[];let bytes=0;
 async function visit(dir,prefix=''){
  for(const name of (await readdir(dir)).sort()){
   const relative=prefix?prefix+'/'+name:name,path=join(dir,name),stat=await lstat(path);
   try{validateArchivePaths([relative]);}catch(error){throw Error(String(error.message)+'; generated relative path='+JSON.stringify(relative.slice(0,300)));}
   if(stat.isSymbolicLink())throw Error('Symlink in generated bundle');
   if(stat.isDirectory())await visit(path,relative);
   else if(stat.isFile()){
    if(records.length>=50000||(bytes+=stat.size)>250*1024*1024)throw Error('Staging size cap');
    const data=await readFile(path);
    // Fixed private-key/token signatures only; never print matching content.
    if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsbp_[A-Za-z0-9]{20,}|\bsk_live_[A-Za-z0-9]{20,}/.test(data.toString('utf8')))throw Error('Potential credential in generated bundle');
    records.push({path:relative,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),data});
   }else throw Error('Unsupported filesystem entry');
  }
 }
 await visit(source);
 const original=records.find(f=>f.path===entry),metadata=records.find(f=>f.path===manifest);
 if(!original||!metadata)throw Error('Generated entry and manifest required');
 const parsed=JSON.parse(metadata.data);
 if(parsed.version!==1||parsed.config?.nodeBundler!=='none'||parsed.config?.schedule)throw Error('Unexpected generated manifest');
 // A private staging copy retains imports at their existing relative locations.
 // Original exported handler is renamed; wrapper is supplied in a later validated step.
 await mkdir(destination,{recursive:false});
 const inventory=[];
 for(const record of records){
  if(record.path===manifest)continue;
  const path=record.path===entry?'compiled-entry.mjs':record.path;
  const target=join(destination,path);await mkdir(resolve(target,'..'),{recursive:true});
  await writeFile(target,record.data,{flag:'wx',mode:0o600});
  inventory.push({path,bytes:record.bytes,sha256:record.sha256});
 }
 return {sourceFiles:records.length,stagedFiles:inventory.length,bytes,inventory,deployable:false};
}
