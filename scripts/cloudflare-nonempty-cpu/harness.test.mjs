import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeProfile } from './cpu-profile.mjs';
import { makeOfflineFetch } from './offline-provider.mjs';
import { createFixture, SERVICE_KEY, PROVIDER_KEY } from './nonempty-fixture.mjs';

test('test-only transport preserves email body and idempotency header but cannot contact live services', async () => {
  const seen = [], fakeFetch = makeOfflineFetch(async r => { seen.push(r); return Response.json({ id: 'synthetic' }); });
  await fakeFetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer synthetic', 'idempotency-key': 'synthetic-1' }, body: '{"synthetic":true}' });
  assert.equal(seen[0].url, 'http://127.0.0.1:15433/synthetic-provider/emails'); assert.equal(await seen[0].text(), '{"synthetic":true}');
  assert.equal(seen[0].headers.get('idempotency-key'), 'synthetic-1');
  for (const url of ['https://api.stripe.com/v1/charges', 'https://jnpoxvalyjtdghnperyu.supabase.co/rest/v1/offers', 'https://api.resend.com/emails?unexpected=1', 'http://localhost:15433/rest/v1/a', 'http://127.0.0.1:15433/unknown']) await assert.rejects(fakeFetch(url));
  assert.equal(seen.length, 1);
});
test('loopback database requests preserve their destination', async () => {
  const fakeFetch = makeOfflineFetch(async r => Response.json({ url: r.url }));
  assert.equal((await (await fakeFetch('http://127.0.0.1:15433/rest/v1/agreements')).json()).url, 'http://127.0.0.1:15433/rest/v1/agreements');
});
test('CPU summaries separate active, idle and unattributed samples without claiming billed CPU', () => {
  const p = { nodes: ['(idle)', '(program)', 'job', '(garbage collector)'].map((functionName, i) => ({ id: i + 1, callFrame: { functionName } })), samples: [1, 2, 3, 4], timeDeltas: [10000, 2000, 3000, 1000], startTime: 0, endTime: 16000 };
  const s = summarizeProfile(p); assert.equal(s.sampledActiveIntervalMs, 4); assert.equal(s.sampledIdleIntervalMs, 10); assert.equal(s.sampledUnattributedIntervalMs, 2); assert.equal(s.provesFreeCpuFit, false);
  assert.throws(() => summarizeProfile({ ...p, samples: [] }));
});
test('provider mock deduplicates a repeated idempotency key', () => {
  const f = createFixture(); const h = { authorization: `Bearer ${PROVIDER_KEY}`, 'idempotency-key': 'synthetic-email-0' };
  const body = { from: 'test@synthetic.invalid', to: 'recipient@synthetic.invalid', subject: 'Moral Trade: test update', text: 'A private update is waiting in your dashboard.' };
  assert.deepEqual(f.handle('POST', '/synthetic-provider/emails', h, body), f.handle('POST', '/synthetic-provider/emails', h, body)); assert.equal(f.state.provider.size, 1);
});
test('lease completion with the wrong worker is rejected by the contract fixture', () => {
  const f = createFixture(), h = { authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY };
  const claim = f.handle('POST', '/rest/v1/rpc/claim_email_outbox_v2', h, { p_limit: 25, p_worker_token: '10000000-0000-4000-8000-000000000001' });
  assert.equal(claim.status, 200);
  assert.equal(f.handle('POST', '/rest/v1/rpc/complete_email_outbox_v2', h, { p_email_id: claim.body[0].id, p_worker_token: 'wrong', p_provider_message_id: 'none' }).status, 500);
});
