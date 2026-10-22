// Diagnostic only: retain fetch semantics, log no URL path/query, headers or body.
const original=globalThis.fetch;
globalThis.fetch=async function(input,init){
 try{return await original(input,init);}
 catch(error){
  let hostname='invalid-url';
  try{hostname=new URL(typeof input==='string'||input instanceof URL?input:input.url).hostname;}catch{}
  const code=String(error?.cause?.code||error?.code||'UNKNOWN').replace(/[^A-Z0-9_]/g,'').slice(0,50);
  console.error(JSON.stringify({diagnostic:'failed-fetch',hostname,code}));
  throw error;
 }
};
