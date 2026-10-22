import {readFile} from 'node:fs/promises';
const native=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.href==='https://raw.githubusercontent.com/ghuser29384/RL-for-Conceptual-Reasoning/2176df9ae5264b3e38ad8f8d049caf53d8a4a38f/ops/release-bundles/metaphilosophy-public-editorial-a0273b4.tgz.b64')return new Response(await readFile(process.env.NETLIFY_FIXTURE_ROOT+'/harness/cloudflare-compatibility-20261019/source/rlhf/bundle.b64','utf8'));
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('External runtime fetch blocked');
 return native(input,init);
};
