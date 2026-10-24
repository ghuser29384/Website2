import {dispatchScheduledEmail} from './scheduler.mjs';
// Candidate only. Platform schedule restrictions remain authoritative; never derive
// destination, project or credentials from the incoming scheduler payload.
export function createEmailScheduledHandler(options) {
 return async request => {
  const reader=request.body?.getReader();
  if(!reader)throw Error('Missing scheduled payload');
  const chunks=[];let size=0;
  try {
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512)throw Error('Oversized scheduled payload');chunks.push(value);}
  } finally {await reader.cancel();reader.releaseLock();}
  const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!payload||typeof payload.next_run!=='string')throw Error('Missing scheduled identity');
  // Preserve next_run verbatim across retries. Signing validates exact daily UTC slot.
  await dispatchScheduledEmail({...options,nextRun:payload.next_run});
  return new Response(null,{status:204});
 };
}
