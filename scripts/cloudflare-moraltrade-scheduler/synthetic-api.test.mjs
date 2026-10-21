import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyntheticApi, SYNTHETIC_SERVICE_KEY } from './synthetic-api.mjs';
const auth = { authorization: `Bearer ${SYNTHETIC_SERVICE_KEY}`, apikey: SYNTHETIC_SERVICE_KEY };
test('fixture rejects credentials, unknown writes and unknown provider routes', () => {
  const f = createSyntheticApi();
  assert.equal(f.handle('GET', '/rest/v1/agreements', {}).status, 500);
  assert.equal(f.handle('POST', '/rest/v1/agreements', auth, {}).status, 500);
  assert.equal(f.handle('POST', '/emails', auth, {}).status, 500);
  assert.equal(f.violations.length, 3); assert.equal(f.events.length, 0);
});
test('fixture provides explicit empty reads and validates expiry write contracts', () => {
  const f = createSyntheticApi();
  assert.deepEqual(f.handle('GET', '/rest/v1/agreements?select=id', auth).body, []);
  assert.equal(f.handle('PATCH', '/rest/v1/source_connections?retention_expires_at=lte.2026', auth, { access_status: 'expired' }).status, 200);
  assert.equal(f.handle('PATCH', '/rest/v1/source_connections', auth, { access_status: 'connected' }).status, 500);
});
test('fixture records duplicate training claims without executing model work', () => {
  const f = createSyntheticApi();
  const args = { p_project_id: 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7', p_scheduled_for: '2026-10-20T12:30:00.000Z', p_slot_key: 'synthetic:2026-10-20:12:30Z', p_deployment_id: null };
  for (let n = 0; n < 2; n++) assert.equal(f.handle('POST', '/rest/v1/rpc/claim_recommendation_training_slot', auth, args).body.claimed, false);
  assert.equal(f.events[0].slot, f.events[1].slot); assert.equal(f.violations.length, 0);
});
test('fixture can fail one database read without preventing independent operations', () => {
  const f = createSyntheticApi(); f.setFailure(true);
  assert.equal(f.handle('GET', '/rest/v1/saved_searches', auth).status, 500);
  assert.equal(f.handle('GET', '/rest/v1/background_opportunity_briefs', auth).status, 200);
});
