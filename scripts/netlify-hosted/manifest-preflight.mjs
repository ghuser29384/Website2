import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function validateManifest(m){
 if(m.version!==1||!Array.isArray(m.functions)||m.functions.length!==1)throw Error('Expected one function in version1 manifest');
 const f=m.functions[0];
 if(f.name!=='public'||f.runtime!=='js'||f.buildData?.runtimeAPIVersion!==2)throw Error('Unexpected function or runtime metadata');
 if(!Array.isArray(f.routes)||f.routes.length!==1||f.routes[0].pattern!=='/*'||typeof f.routes[0].expression!=='string')throw Error('Missing catch-all route');
 if(f.schedule||f.excludedRoutes?.length||f.routes[0].methods?.length)throw Error('Unexpected scheduled or restricted route');
 const regex=new RegExp(f.routes[0].expression);
 for(const path of ['/','/research','/src/site-entry.mjs','/not-a-real-file'])if(!regex.test(path))throw Error('Catch-all expression excludes required path');
 return {name:f.name,runtime:f.runtime,runtimeAPIVersion:f.buildData.runtimeAPIVersion,routes:f.routes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){console.log(JSON.stringify(validateManifest(JSON.parse(await readFile(process.argv[2],'utf8')))));}
