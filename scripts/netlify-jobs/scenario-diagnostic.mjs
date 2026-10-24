// Emit only fixed phase labels and numeric synthetic counters, never response/error data.
export async function scenarioStep(phase,run,counts,emit){
 const allowed=['job-response','job-body','repeat-response','repeat-body'];
 if(!allowed.includes(phase))throw Error('Unknown diagnostic phase');
 const start=performance.now();
 const report=status=>{const c=counts();emit({phase,status,elapsedMs:Math.round(performance.now()-start),requests:Number.isSafeInteger(c.requests)?c.requests:null,accepted:Number.isSafeInteger(c.accepted)?c.accepted:null});};
 report('started');
 try{const result=await run();report('completed');return result;}
 catch(error){report('failed');throw error;}
}
