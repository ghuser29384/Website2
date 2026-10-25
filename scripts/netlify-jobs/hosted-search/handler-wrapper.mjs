// Disposable measurement wrapper only; never imported by production application code.
import {validateSyntheticRequest} from './request-gate.mjs';
export function createMeasurementHandler(initialize){
 let ready;
 return async function measurementHandler(request,context){
  let count;
  try{count=validateSyntheticRequest(request);}catch{return new Response('Synthetic route rejected',{status:404,headers:{'cache-control':'private, no-store'}});}
  // Initializer must install the closed synthetic transport before importing the compiled handler.
  // Keep a rejected initialization rejected: never fall back to a live transport.
  ready??=Promise.resolve().then(initialize);
  const runtime=await ready;
  if(typeof runtime?.handler!=='function'||typeof runtime?.transport?.runResponse!=='function')throw Error('Invalid synthetic runtime');
  return runtime.transport.runResponse(count,()=>runtime.handler(request,context));
 };
}
