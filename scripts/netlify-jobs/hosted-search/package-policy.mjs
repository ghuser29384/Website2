// Validate the final CLI-generated function manifest, not source intent.
export function validateSearchManifest(manifest){
 if(manifest?.version!==1||!Array.isArray(manifest.functions)||manifest.functions.length!==1)throw Error('Exactly one synthetic function required');
 const f=manifest.functions[0];
 if(f.name!=='synthetic-search'||f.runtime!=='js'||f.buildData?.runtimeAPIVersion!==2||f.schedule||f.name.endsWith('-background'))throw Error('Unexpected function capability');
 if(!Array.isArray(f.routes)||f.routes.length!==1)throw Error('Exactly one route required');
 const route=f.routes[0];
 if(route.pattern!=='/offers'||route.methods?.length!==1||route.methods[0]!=='GET'||typeof route.expression!=='string')throw Error('Only GET offers route allowed');
 const regex=new RegExp(route.expression);
 if(!regex.test('/offers')||['/offers/123','/api/jobs/email','/api/auth/callback','/','/.netlify/functions/email-background'].some(p=>regex.test(p)))throw Error('Unexpected route coverage');
 if(f.excludedRoutes?.length)throw Error('Unexpected exclusions');
 return {name:f.name,route:'/offers',method:'GET',scheduled:false};
}
export function validateArchivePaths(paths){
 if(!Array.isArray(paths)||!paths.length||paths.length>50000)throw Error('Invalid file inventory');
 const seen=new Set();
 for(const path of paths){
  if(typeof path!=='string'||path.startsWith('/')||path.includes('\\')||path.split('/').some(p=>p==='..'||p==='')||seen.has(path))throw Error('Unsafe archive path');
  seen.add(path);
  if(path.split('/').some(p=>/^\.env(?:\.|$)/.test(p)||['.git','private-tmp','.aws'].includes(p))||/\.(pem|key|p12|pfx|sql|dump|sparseimage|dmg)$/i.test(path))throw Error('Private material cannot be packaged');
 }
 return {files:seen.size};
}
