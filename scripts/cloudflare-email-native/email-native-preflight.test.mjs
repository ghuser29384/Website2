import assert from 'node:assert/strict';
import test from 'node:test';
import { createNativeFixture, countNativeQueries } from './email-native-fixture.mjs';
import { PROVIDER_KEY } from './nonempty-fixture.mjs';
const body = { from: 'test@synthetic.invalid', to: 'recipient@synthetic.invalid', subject: 'Moral Trade: test update', text: 'A private update is waiting in your dashboard.' };
const headers = n => ({ authorization: `Bearer ${PROVIDER_KEY}`, 'idempotency-key': `synthetic-email-${n}` });
function fixture() {
  const rows = [], resets = [];
  const f = createNativeFixture({ reset: name => { rows.length = 0; resets.push(name); }, snapshot: () => rows });
  f.reset('full'); return { f, rows, resets };
}
test('native fixture preserves provider message and idempotency semantics', () => {
  const { f } = fixture();
  assert.equal(f.handle('POST', '/synthetic-provider/emails', headers(1), body).status, 200);
  assert.equal(f.provider.size, 1); assert.deepEqual(f.violations, []);
});
test('native fixture rejects a second send before its predecessor is committed', () => {
  const { f } = fixture();
  f.handle('POST', '/synthetic-provider/emails', headers(1), body);
  assert.equal(f.handle('POST', '/synthetic-provider/emails', headers(2), body).status, 500);
  assert.equal(f.provider.size, 1); assert.match(f.violations[0], /already be committed/);
});
test('native fixture requires redaction as well as the receipt before the next send', () => {
  const { f, rows } = fixture(); f.handle('POST', '/synthetic-provider/emails', headers(1), body);
  rows.push({ status: 'sent', body: 'not redacted' });
  assert.equal(f.handle('POST', '/synthetic-provider/emails', headers(2), body).status, 500);
  assert.match(f.violations[0], /already be redacted/);
});
test('native fixture permits subsequent delivery once the committed receipt is redacted', () => {
  const { f, rows } = fixture(); f.handle('POST', '/synthetic-provider/emails', headers(1), body);
  rows.push({ status: 'sent', body: '[private invitation link removed after delivery]' });
  assert.equal(f.handle('POST', '/synthetic-provider/emails', headers(2), body).status, 200);
  assert.equal(f.provider.size, 2); assert.deepEqual(f.violations, []);
});
test('native fixture rejects silent REST fallback', () => {
  const { f } = fixture();
  assert.equal(f.handle('POST', '/rest/v1/rpc/claim_email_outbox_v2', {}, {}).status, 500);
  assert.match(f.violations[0], /must not fall back/);
});
test('native fixture resets scenario state and preserves failure responses', () => {
  const { f, resets } = fixture(); f.handle('POST', '/synthetic-provider/emails', headers(1), body);
  f.reset('provider-error'); assert.equal(f.provider.size, 0); assert.equal(f.events.length, 0);
  assert.equal(f.handle('POST', '/synthetic-provider/emails', headers(1), body).status, 500);
  assert.deepEqual(resets, ['full', 'provider-error']); assert.deepEqual(f.violations, []);
});
test('query counter counts native executions once without parameters or unrelated admin reads', () => {
  const log = `LOG: execute <unnamed>: SELECT * FROM public.claim_email_outbox_v2($1::uuid, $2::integer)
DETAIL: parameters: $1 = 'synthetic-only'
LOG: execute <unnamed>: SELECT public.complete_email_outbox_v2($1::uuid, $2::uuid, $3::text) AS value
LOG: statement: select status from public.email_outbox;
LOG: execute <unnamed>: SELECT public.retry_email_outbox_v2($1::uuid, $2::uuid, $3::text) AS value
LOG: statement: SELECT public.suppress_email_outbox_v2('a','b','c') AS value`;
  assert.equal(countNativeQueries(log), 4);
});
