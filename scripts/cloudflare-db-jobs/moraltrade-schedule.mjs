import { buildVercelProjectConfig, CANONICAL_MORAL_TRADE_PROJECT_ID, DUPLICATE_WEBSITE2_PROJECT_ID } from './moraltrade-source-schedules.mjs';

// Candidate dispatcher plan only; not wired into or deployed with OpenNext.
// One trigger replaces seven registrations without changing their due times.
export const DISPATCH_CRON = '0,15,30 * * * *';
export function dueJobs(scheduledTime, projectId = CANONICAL_MORAL_TRADE_PROJECT_ID) {
  if (![CANONICAL_MORAL_TRADE_PROJECT_ID, DUPLICATE_WEBSITE2_PROJECT_ID].includes(projectId)) throw new Error('Unknown project');
  if (!Number.isSafeInteger(scheduledTime) || scheduledTime < 0) throw new Error('Invalid scheduled time');
  const date = new Date(scheduledTime);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid scheduled time');
  return buildVercelProjectConfig({ projectId }).crons.filter(({ schedule }) => {
    const match = /^(\d+) (\d+|\*) \* \* \*$/.exec(schedule);
    if (!match || Number(match[1]) > 59 || (match[2] !== '*' && Number(match[2]) > 23)) throw new Error('Schedule changed; review required');
    return date.getUTCMinutes() === Number(match[1]) && (match[2] === '*' || date.getUTCHours() === Number(match[2]));
  }).map(({ path }) => path);
}

export async function dispatchJobs(controller, env, invoke, projectId) {
  if (controller.cron !== DISPATCH_CRON) throw new Error('Unknown dispatcher schedule');
  const paths = dueJobs(controller.scheduledTime, projectId);
  if (!paths.length) return;
  if (!env.CRON_SECRET) throw new Error('CRON_SECRET is required');
  // invoke must be the in-process app handler, never a configured remote URL.
  // No automatic retries: preserve each job's own leases/idempotency policy.
  const outcomes = await Promise.allSettled(paths.map(async path => {
    const response = await invoke(new Request(`https://scheduler.invalid${path}`, {
      method: 'GET', headers: { authorization: `Bearer ${env.CRON_SECRET}` }, redirect: 'manual',
    }));
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Scheduled handler returned ${response.status}`);
  }));
  if (outcomes.some(item => item.status === 'rejected')) throw new Error('One or more scheduled jobs failed');
}
