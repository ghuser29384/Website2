import assert from 'node:assert/strict';
import test from 'node:test';
import { dueJobs, dispatchJobs, DISPATCH_CRON } from './moraltrade-schedule.mjs';
import { DUPLICATE_WEBSITE2_PROJECT_ID } from './moraltrade-source-schedules.mjs';
const names = ['saved-searches', 'delegates', 'email', 'trade-reminders', 'background-networking', 'conditional-redirects', 'recommendation-training'];
test('every minute over a UTC week matches all seven existing schedules', () => {
  const totals = Object.fromEntries(names.map(n => [n, 0]));
  for (let minute = 0; minute < 7 * 1440; minute++) {
    const h = Math.floor(minute / 60) % 24, m = minute % 60;
    const expected = [];
    if (h === 9 && m === 0) expected.push('saved-searches');
    if (h === 9 && m === 30) expected.push('delegates');
    if (h === 10 && m === 0) expected.push('email');
    if (h === 11 && m === 0) expected.push('trade-reminders');
    if (m === 0) expected.push('background-networking');
    if (m === 15) expected.push('conditional-redirects');
    if (h === 12 && m === 30) expected.push('recommendation-training');
    const actual = dueJobs(Date.UTC(2026, 9, 19) + minute * 60000);
    assert.deepEqual(actual, expected.map(n => `/api/jobs/${n}`));
    for (const n of expected) totals[n]++;
    if (actual.length) assert.ok([0, 15, 30].includes(m));
  }
  assert.equal(Object.values(totals).reduce((a,b) => a+b, 0), 371);
});
test('duplicate Website2 never gains the canonical training job', () => {
  assert.deepEqual(dueJobs(Date.UTC(2026, 9, 20, 12, 30), DUPLICATE_WEBSITE2_PROJECT_ID), []);
});
test('scheduled timestamp controls dispatch even if execution is delayed', async () => {
  const calls = [];
  await dispatchJobs({ cron: DISPATCH_CRON, scheduledTime: Date.UTC(2026,9,20,9,0) }, { CRON_SECRET: 'synthetic' }, async request => {
    assert.equal(request.method, 'GET'); assert.equal(request.headers.get('authorization'), 'Bearer synthetic');
    assert.equal(new URL(request.url).search, ''); calls.push(new URL(request.url).pathname); return new Response('{}');
  });
  assert.deepEqual(calls.sort(), ['/api/jobs/background-networking', '/api/jobs/saved-searches']);
});
test('one failed job cannot suppress other jobs due at the same minute', async () => {
  const calls = [];
  await assert.rejects(dispatchJobs({ cron: DISPATCH_CRON, scheduledTime: Date.UTC(2026,9,20,9,0) }, { CRON_SECRET: 'synthetic' }, async request => {
    calls.push(request.url); return new Response('', { status: calls.length === 1 ? 500 : 200 });
  }));
  assert.equal(calls.length, 2);
});
test('empty schedule slot opens no handler or database connection', async () => {
  await dispatchJobs({ cron: DISPATCH_CRON, scheduledTime: Date.UTC(2026,9,20,4,30) }, {}, () => assert.fail('unexpected call'));
});
test('missing credentials, wrong trigger and unknown project fail closed', async () => {
  const invoke = () => assert.fail('unexpected call');
  await assert.rejects(dispatchJobs({ cron: DISPATCH_CRON, scheduledTime: Date.UTC(2026,9,20,9,0) }, {}, invoke));
  await assert.rejects(dispatchJobs({ cron: '* * * * *', scheduledTime: 0 }, {}, invoke));
  assert.throws(() => dueJobs(0, 'unknown'));
  for (const time of [NaN, Infinity, -1, '2026-01-01']) assert.throws(() => dueJobs(time));
});
