// Compiled synthetic source only; no runtime values or environment are inspected.
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import {resolve,sep} from 'node:path';import {createHash} from 'node:crypto';
export function sourceExcerpt(source,line,column){
 if(!Number.isInteger(line)||line<0||!Number.isInteger(column)||column<0)throw Error('Invalid source location');
 const lines=source.split('\n');if(line>=lines.length||column>lines[line].length)throw Error('Source location outside file');
 return lines[line].slice(Math.max(0,column-80),column+720);
}
export async function mapProfileLocations(profiles,app){
 const root=await realpath(resolve(app,'.next/server'));const cache=new Map(),locations=new Map();
 for(const profile of profiles)for(const frame of profile.top){
  if(!frame.url.startsWith('file:')||!frame.url.includes('/.next/server/')||!frame.url.endsWith('.js'))continue;
  const path=await realpath(fileURLToPath(frame.url));if(!path.startsWith(root+sep))throw Error('Profile source outside compiled root');
  const key=JSON.stringify([path,frame.line,frame.column]);
  const existing=locations.get(key);if(existing){existing.sampleSelfUs+=frame.selfUs;continue;}
  if(!cache.has(path)){const size=(await stat(path)).size;if(size>5*1024*1024)throw Error('Compiled source byte cap');cache.set(path,await readFile(path,'utf8'));}
  const source=cache.get(path);
  locations.set(key,{file:path.slice(root.length+1),line:frame.line,column:frame.column,functionName:frame.functionName,sampleSelfUs:frame.selfUs,sourceSha256:createHash('sha256').update(source).digest('hex'),excerpt:sourceExcerpt(source,frame.line,frame.column)});
 }
 return [...locations.values()].sort((a,b)=>b.sampleSelfUs-a.sampleSelfUs).slice(0,12);
}
