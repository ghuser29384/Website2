import assert from 'node:assert/strict';
import { createServer } from 'node:http';

export const SYNTHETIC_SERVICE_KEY = 'synthetic-service-key-for-offline-test-only';
const reads = new Set(['saved_searches', 'wish_profile_previews', 'personal_delegates', 'profile_syntheses', 'wish_profiles', 'agreements', 'background_opportunity_briefs', 'conditional_redirect_offers']);
const expirations = new Set(['source_connections', 'background_source_summaries', 'background_profile_signals', 'background_grant_receipts', 'background_opportunity_briefs']);

// Empty-data contract fixture, not a database or an RLS emulator.
// Every unlisted path, method, credential and body fails the test.
export function createSyntheticApi() {
  const events = [], violations = [];
  let failSavedSearch = false;
  function handle(method, path, headers, body = null) {
    try {
      assert.equal(headers.authorization, `Bearer ${SYNTHETIC_SERVICE_KEY}`);
      assert.equal(headers.apikey, SYNTHETIC_SERVICE_KEY);
      const url = new URL(path, 'http://127.0.0.1:15433');
      const table = url.pathname.replace('/rest/v1/', '');
      assert.ok(url.pathname.startsWith('/rest/v1/'));
      if (method === 'GET' && reads.has(table)) {
        events.push({ method, path: url.pathname });
        if (failSavedSearch && table === 'saved_searches') return { status: 500, body: { message: 'synthetic database unavailable', code: 'SYNTHETIC' } };
        return { status: 200, body: [] };
      }
      if (method === 'PATCH' && expirations.has(table)) {
        assert.equal(body.status ?? body.access_status, 'expired');
        assert.ok([...url.searchParams.keys()].some(key => /expires_at$/.test(key)));
        events.push({ method, path: url.pathname });
        return { status: 200, body: [], headers: { 'content-range': '*/0' } };
      }
      if (method === 'POST' && table === 'rpc/claim_email_outbox_v2') {
        assert.equal(body.p_limit, 25); assert.equal(typeof body.p_worker_token, 'string');
        events.push({ method, path: url.pathname }); return { status: 200, body: [] };
      }
      if (method === 'POST' && table === 'rpc/claim_recommendation_training_slot') {
        assert.equal(body.p_project_id, 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7');
        assert.match(body.p_scheduled_for, /^\d{4}-\d{2}-\d{2}T12:30:00.000Z$/);
        assert.ok(body.p_slot_key.endsWith(body.p_scheduled_for.slice(0, 10) + ':12:30Z'));
        assert.equal(body.p_deployment_id, null);
        events.push({ method, path: url.pathname, slot: body.p_slot_key });
        return { status: 200, body: { claimed: false, status: 'succeeded', slotKey: body.p_slot_key, attemptCount: 1 } };
      }
      throw new Error('Unexpected fixture operation');
    } catch {
      violations.push('Unexpected synthetic request');
      return { status: 500, body: { message: 'Fixture rejected unexpected request', code: 'SYNTHETIC_REJECTED' } };
    }
  }
  return { events, violations, handle, setFailure(value) { failSavedSearch = value; } };
}

export async function startSyntheticApi() {
  const fixture = createSyntheticApi();
  const server = createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) { raw += chunk; assert.ok(raw.length < 65536); }
      const result = fixture.handle(req.method, req.url, req.headers, raw ? JSON.parse(raw) : null);
      res.writeHead(result.status, { 'content-type': 'application/json', ...result.headers });
      res.end(JSON.stringify(result.body));
    } catch {
      fixture.violations.push('Malformed synthetic request'); res.writeHead(500); res.end('{}');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(15433, '127.0.0.1', resolve); });
  return { ...fixture, async close() { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } };
}
