// Synthetic Linux runner only: aggregate the owned emulator process group.
// Not per-function billing; detached processes outside this group are excluded.
import {readdir,readFile} from 'node:fs/promises';
export function parseStat(text){
 const end=text.lastIndexOf(')');if(end<0)throw Error('Invalid proc stat');
 const fields=text.slice(end+2).trim().split(/\s+/);
 const group=Number(fields[2]);
 const ticks=[11,12,13,14].reduce((sum,i)=>sum+Number(fields[i]),0);
 if(!Number.isInteger(group)||!Number.isFinite(ticks)||ticks<0)throw Error('Invalid CPU counters');
 return {group,ticks};
}
export async function snapshotGroup(group){
 if(!Number.isInteger(group)||group<=0)throw Error('Owned process group required');
 let ticks=0,processes=0;
 for(const pid of await readdir('/proc')){
  if(!/^\d+$/.test(pid))continue;
  try{const stat=parseStat(await readFile(`/proc/${pid}/stat`,'utf8'));if(stat.group===group){ticks+=stat.ticks;processes++;}}
  catch(error){if(!['ENOENT','ESRCH'].includes(error.code))throw error;}
 }
 if(!processes)throw Error('Emulator process group missing');
 return {ticks,processes};
}
export function cpuDelta(before,after,hz){
 if(!Number.isFinite(hz)||hz<=0)throw Error('Invalid clock ticks');
 const ticks=after.ticks-before.ticks;
 if(ticks<0)throw Error('CPU accounting decreased; measurement invalid');
 return {processGroupCpuMs:ticks*1000/hz,clockTicksPerSecond:hz,processesBefore:before.processes,processesAfter:after.processes,scope:'owned emulator process group, including reaped child CPU; excludes detached groups; not hosted billing'};
}
