import bundle from './bundle-data.mjs';
const allowed='https://raw.githubusercontent.com/ghuser29384/RL-for-Conceptual-Reasoning/2176df9ae5264b3e38ad8f8d049caf53d8a4a38f/ops/release-bundles/metaphilosophy-public-editorial-a0273b4.tgz.b64';
export const fixtureFetch=async(input)=>{
 const url=String(typeof input==='string'||input instanceof URL?input:input.url);
 if(url!==allowed)throw Error('External fetch blocked in synthetic test');
 return new Response(bundle);
};
