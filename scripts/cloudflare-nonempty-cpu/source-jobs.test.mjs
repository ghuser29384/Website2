import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFixture } from './nonempty-fixture.mjs';
import { installSourceLoader } from './source-loader.mjs';

const root = process.env.CF_APP_ROOT;
assert.ok(root && root.startsWith('/'));
const fixture = createFixture();
installSourceLoader(root, fixture);
const routes = {};
for (const name of ['email', 'trade-reminders', 'background-networking', 'conditional-redirects', 'saved-searches', 'delegates', 'recommendation-training']) routes[name] = await import(pathToFileURL(resolve(root, 'src/app/api/jobs', name, 'route.ts')));
async function run(name) {
  const response = await routes[name].GET(new Request('https://synthetic.invalid/api/jobs/' + name, { headers: { authorization: 'Bearer synthetic-scheduler-secret-only', 'x-vercel-cron-schedule': '30 12 * * *' } }));
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify({ body, violations: fixture.violations }));
  assert.deepEqual(fixture.violations, []);
  return body;
}

test('one safe email preserves delivery idempotency key and lease completion', async () => {
  fixture.reset({ scenario: 'email' }); const r = await run('email');
  assert.equal(r.sent, 1); assert.equal(fixture.state.provider.size, 1); assert.deepEqual([...fixture.state.emails.values()], ['sent']);
});
test('full existing 25-email batch makes 51 external operations before simultaneous background work', async () => {
  fixture.reset({ scenario: 'email', count: 25 }); const r = await run('email');
  assert.equal(r.sent, 25); assert.equal(fixture.events.length, 51); assert.equal(fixture.state.provider.size, 25);
});
test('unsafe queued email is suppressed without contacting its provider', async () => {
  fixture.reset({ scenario: 'email', unsafe: true }); const r = await run('email');
  assert.equal(r.suppressed, 1); assert.equal(fixture.state.provider.size, 0); assert.deepEqual([...fixture.state.emails.values()], ['suppressed']);
});
test('provider error returns the email to its existing retry path', async () => {
  fixture.reset({ scenario: 'email', providerFailure: true }); const r = await run('email');
  assert.equal(r.retrying, 1); assert.equal(r.sent, 0); assert.deepEqual([...fixture.state.emails.values()], ['queued']);
});
test('completion failure after provider acceptance preserves retry accounting', async () => {
  fixture.reset({ scenario: 'email', completionFailure: true }); const r = await run('email');
  assert.equal(r.retrying, 1); assert.equal(r.sent, 0); assert.equal(fixture.state.provider.size, 1);
});
test('overdue agreement updates state, notifies both parties and deduplicates repeated work', async () => {
  fixture.reset({ scenario: 'trade' }); const r = await run('trade-reminders');
  assert.equal(r.agreementsMarkedDue, 1); assert.equal(r.notificationsCreated, 2); assert.equal(r.emailsQueued, 2);
  const again = await run('trade-reminders'); assert.equal(again.notificationsCreated, 0); assert.equal(again.emailsQueued, 0); assert.equal(fixture.state.queued.length, 2);
});
test('ten overdue agreements use 52 database operations without reducing the existing 200-item batch', async () => {
  fixture.reset({ scenario: 'trade', count: 10 }); const r = await run('trade-reminders');
  assert.equal(r.emailsQueued, 20); assert.equal(fixture.events.length, 52);
});
test('nonempty background digest honors opt-out and same-day deduplication', async () => {
  fixture.reset({ scenario: 'background' }); const r = await run('background-networking');
  assert.equal(r.digestEmailsQueued, 1); assert.equal(r.expiredSourceConnections, 1); assert.equal(r.rawPrivateTextProcessed, false); assert.equal(r.autonomousOutreachSent, false);
  const again = await run('background-networking'); assert.equal(again.digestEmailsQueued, 0); assert.equal(fixture.state.queued.length, 1);
});
test('conditional redirects preserve arbitration failure isolation and expired-creator cancellation without payment calls', async () => {
  fixture.reset({ scenario: 'conditional' }); const r = await run('conditional-redirects');
  assert.deepEqual(r.outcomes.map(o => o.status), ['winner_selected', 'arbitration_failed', 'cancelled_after_creator_recovery']);
  assert.equal(fixture.state.writes.length, 3);
});
test('due saved search without an owner profile advances its scan without disclosure', async () => {
  fixture.reset({ scenario: 'saved' }); await run('saved-searches');
  assert.equal(fixture.state.writes.length, 1); assert.equal(fixture.state.writes[0].table, 'saved_searches');
});
test('active delegate with missing prerequisites records risks and its run time', async () => {
  fixture.reset({ scenario: 'delegate' }); const r = await run('delegates');
  assert.equal(r.delegatesProcessed, 1); assert.equal(r.riskSignalsCreated, 2); assert.equal(r.helperRunsCreated, 0); assert.equal(fixture.state.writes.length, 3);
});
test('nonempty training records outcomes/model/slot; duplicate dispatch skips retraining', async () => {
  fixture.reset({ scenario: 'training', count: 8 }); const r = await run('recommendation-training');
  assert.equal(r.outcomeCount, 8); assert.equal(r.skipped, false); assert.equal(fixture.state.slotDone, true);
  assert.ok(fixture.state.writes.some(w => w.table === 'recommendation_outcomes'));
  const writeCount = fixture.state.writes.length; const duplicate = await run('recommendation-training');
  assert.equal(duplicate.skipped, true); assert.equal(fixture.state.writes.length, writeCount);
});
test('unknown fixture operations and wrong credentials fail closed', () => {
  fixture.reset(); assert.equal(fixture.handle('GET', '/rest/v1/private_unknown', {}).status, 500); assert.equal(fixture.violations.length, 1);
});

test('1000 synthetic training exposures retain cold-start activation safeguards', async () => {
  fixture.reset({ scenario: 'training', count: 1000 }); const r = await run('recommendation-training');
  assert.equal(r.outcomeCount, 1000); assert.equal(r.status, 'cold_start'); assert.equal(fixture.state.slotDone, true);
  const model = fixture.state.writes.find(w => w.table === 'recommendation_model_versions');
  assert.equal(model.body.sample_count, 1000);
});
