// Background-executor prototype only. Create BEFORE the claim request.
// 9-minute ceiling leaves a minute before the unchanged 10-minute row lease.
export function createExecutionDeadline(milliseconds = 540000, transport: typeof fetch = fetch) {
 if(!Number.isFinite(milliseconds)||milliseconds<=0||milliseconds>540000) throw new Error('Invalid execution budget');
 const controller=new AbortController();
 const expires=performance.now()+milliseconds;
 const expire=()=>controller.abort(new DOMException('Execution deadline exceeded','TimeoutError'));
 const timer=setTimeout(expire,milliseconds);
 const check=()=>{if(performance.now()>=expires)expire();controller.signal.throwIfAborted();};
 return {
  signal:controller.signal,
  check,
  async fetch(input: Parameters<typeof fetch>[0], init: RequestInit = {}) {
   check();
   const caller=init.signal ?? (input instanceof Request ? input.signal : undefined);
   const signal=caller?AbortSignal.any([controller.signal,caller]):controller.signal;
   signal.throwIfAborted();
   return transport(input,{...init,signal});
  },
  close(){clearTimeout(timer);controller.abort(new DOMException('Execution closed','AbortError'));},
 };
}
