import assert from 'node:assert/strict';
import { createServer } from 'node:http';

export const SERVICE_KEY = 'synthetic-service-key-for-offline-test-only';
export const PROVIDER_KEY = 'synthetic-provider-key-no-valid-access';
export const PROFILE = '10000000-0000-4000-8000-000000000001';
const PEER = '10000000-0000-4000-8000-000000000002';
const uuid = n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const expiryTables = new Set(['source_connections', 'background_source_summaries', 'background_profile_signals', 'background_grant_receipts', 'background_opportunity_briefs']);
const trainingReads = new Set(['recommendation_exposures', 'recommendation_interactions', 'interests', 'agreements', 'trade_threads', 'trade_evidence_items', 'trade_completion_confirmations', 'trade_reports', 'recommendation_outcome_feedback', 'agreement_ratings', 'offers']);
const trainingWrites = new Set(['recommendation_training_runs', 'recommendation_outcomes', 'recommendation_graph_edges', 'recommendation_model_versions', 'recommendation_user_factors', 'recommendation_opportunity_factors', 'recommendation_counterparty_priors', 'recommendation_guardrail_snapshots']);
const ok = (body = null, headers = {}) => ({ status: 200, body, headers });
const fail = message => ({ status: 500, body: { message, code: 'SYNTHETIC' } });

// Deliberately bounded contract fixture. It is not Postgres, PostgREST or an RLS emulator.
export function createFixture(initial = {}) {
  const events = [], violations = [];
  let options, state;
  function reset(next = {}) {
    options = { scenario: 'email', count: 1, unsafe: false, providerFailure: false, completionFailure: false, ...next };
    assert.ok(['email', 'trade', 'background', 'conditional', 'saved', 'delegate', 'training'].includes(options.scenario));
    assert.ok(Number.isInteger(options.count) && options.count >= 1 && options.count <= 1000);
    events.length = 0; violations.length = 0;
    state = { claimed: false, token: null, emails: new Map(), provider: new Map(), notifications: new Set(), queued: [], agreements: new Map(), digests: new Set(), writes: [], slot: null, slotDone: false };
  }
  reset(initial);
  function handle(method, path, headers = {}, body = null) {
    try {
      const u = new URL(path, 'http://127.0.0.1:15433');
      assert.equal(u.origin, 'http://127.0.0.1:15433');
      events.push({ method, path: u.pathname });
      if (u.pathname === '/synthetic-provider/emails') {
        assert.equal(method, 'POST'); assert.equal(options.scenario, 'email');
        assert.equal(headers.authorization, `Bearer ${PROVIDER_KEY}`);
        assert.equal(body.from, 'test@synthetic.invalid'); assert.equal(body.to, 'recipient@synthetic.invalid');
        assert.equal(body.subject, 'Moral Trade: test update');
        assert.equal(body.text, 'A private update is waiting in your dashboard.');
        const key = headers['idempotency-key']; assert.match(key, /^synthetic-email-\d+$/);
        if (options.providerFailure) return fail('Synthetic provider unavailable');
        if (!state.provider.has(key)) state.provider.set(key, `synthetic-message-${state.provider.size + 1}`);
        return ok({ id: state.provider.get(key) });
      }
      assert.equal(headers.authorization, `Bearer ${SERVICE_KEY}`); assert.equal(headers.apikey, SERVICE_KEY);
      assert.ok(u.pathname.startsWith('/rest/v1/'));
      const table = u.pathname.slice('/rest/v1/'.length), q = u.searchParams;
      if (table.startsWith('rpc/')) {
        assert.equal(method, 'POST');
        const rpc = table.slice(4);
        if (options.scenario === 'email') {
          if (rpc === 'claim_email_outbox_v2') {
            assert.equal(body.p_limit, 25); assert.match(body.p_worker_token, /^[0-9a-f-]{36}$/);
            state.token = body.p_worker_token;
            if (state.claimed) return ok([]);
            state.claimed = true;
            return ok(Array.from({ length: Math.min(options.count, 25) }, (_, i) => {
              const row = { id: uuid(i + 1), recipient_email: 'recipient@synthetic.invalid', subject: 'Moral Trade: test update', body: options.unsafe ? 'Exact wish: synthetic confidential text' : 'A private update is waiting in your dashboard.', provider: 'core_trade_reminder', attempt_count: 1, idempotency_key: `synthetic-email-${i}` };
              state.emails.set(row.id, 'leased'); return row;
            }));
          }
          assert.equal(body.p_worker_token, state.token); assert.equal(state.emails.get(body.p_email_id), 'leased');
          if (rpc === 'complete_email_outbox_v2') {
            assert.ok([...state.provider.values()].includes(body.p_provider_message_id));
            if (options.completionFailure) return fail('Synthetic completion unavailable');
            state.emails.set(body.p_email_id, 'sent'); return ok(true);
          }
          if (rpc === 'retry_email_outbox_v2') { assert.ok(body.p_error); state.emails.set(body.p_email_id, 'queued'); return ok('queued'); }
          if (rpc === 'suppress_email_outbox_v2') { assert.ok(body.p_reason); state.emails.set(body.p_email_id, 'suppressed'); return ok(true); }
        }
        if (options.scenario === 'conditional' && rpc === 'arbitrate_conditional_redirect_offer') {
          assert.ok([uuid(1), uuid(2)].includes(body.p_offer_id));
          return body.p_offer_id === uuid(2) ? fail('Synthetic arbitration failure') : ok(uuid(9));
        }
        if (options.scenario === 'training') {
          assert.equal(body.p_project_id, 'prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7');
          if (rpc === 'claim_recommendation_training_slot') {
            const duplicate = state.slot !== null;
            if (duplicate) assert.equal(body.p_slot_key, state.slot);
            state.slot = body.p_slot_key;
            return ok({ claimed: !duplicate, slotKey: state.slot, status: duplicate && state.slotDone ? 'succeeded' : 'claimed', attemptCount: 1 });
          }
          assert.equal(body.p_slot_key, state.slot);
          if (rpc === 'complete_recommendation_training_slot') { assert.ok(body.p_model_id && body.p_run_id); state.slotDone = true; return ok(true); }
          if (rpc === 'fail_recommendation_training_slot') { state.writes.push({ table: rpc, body }); return ok(true); }
        }
        throw new Error('Unexpected RPC');
      }
      if (options.scenario === 'email' || options.scenario === 'trade' || options.scenario === 'saved') {
        // Hourly background job may share this scheduled invocation; its queues are empty.
        if (method === 'PATCH' && expiryTables.has(table)) { assert.equal(body.status ?? body.access_status, 'expired'); return ok([], { 'content-range': '*/0' }); }
        if (method === 'GET' && table === 'background_opportunity_briefs') return ok([]);
      }
      if (options.scenario === 'trade') {
        if (method === 'GET' && table === 'agreements') {
          assert.equal(q.get('limit'), '200'); assert.equal(q.get('lifecycle_status'), 'in.(active,evidence_due)');
          const due = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          return ok(Array.from({ length: options.count }, (_, i) => ({ id: uuid(i + 1), proposer_id: PROFILE, responder_id: PEER, evidence_due_at: due, lifecycle_status: state.agreements.get(uuid(i + 1)) ?? 'active' })));
        }
        if (method === 'GET' && table === 'profiles') return ok([PROFILE, PEER].map(id => ({ id, email: 'recipient@synthetic.invalid' })));
        if (method === 'PATCH' && table === 'agreements') { assert.equal(q.get('lifecycle_status'), 'eq.active'); assert.equal(body.lifecycle_status, 'evidence_due'); state.agreements.set(q.get('id').slice(3), body.lifecycle_status); return ok(null); }
        if (method === 'POST' && table === 'trade_notifications') {
          assert.equal(body.notification_type, 'evidence_overdue'); assert.ok([PROFILE, PEER].includes(body.user_id));
          assert.match(body.dedupe_key, /^evidence_due:/);
          if (state.notifications.has(body.dedupe_key)) return ok(null);
          state.notifications.add(body.dedupe_key); return ok({ id: uuid(500 + state.notifications.size) });
        }
        if (method === 'POST' && table === 'email_outbox') {
          assert.equal(body.provider, 'core_trade_reminder'); assert.equal(body.recipient_email, 'recipient@synthetic.invalid');
          assert.ok(body.body.includes('https://synthetic.invalid/trade-agreements/')); state.queued.push(body); return ok(null);
        }
      }
      if (options.scenario === 'background') {
        if (method === 'PATCH' && expiryTables.has(table) && (body.status ?? body.access_status) === 'expired') return ok([], { 'content-range': '*/1' });
        if (method === 'GET' && table === 'background_opportunity_briefs') return ok([{ id: uuid(1), profile_id: PROFILE }, { id: uuid(2), profile_id: PEER }]);
        if (method === 'GET' && table === 'profiles') return ok([PROFILE, PEER].map(id => ({ id, email: 'recipient@synthetic.invalid' })));
        if (method === 'GET' && table === 'wish_profiles') return ok([PROFILE, PEER].map(profile_id => ({ profile_id, notification_email_enabled: profile_id === PROFILE })));
        if (method === 'GET' && table === 'background_notification_preferences') return ok([PROFILE, PEER].map(profile_id => ({ profile_id, enabled: true, digest_cadence: 'daily', last_digest_at: null })));
        if (method === 'POST' && table === 'email_outbox') {
          assert.equal(q.get('on_conflict'), 'source_kind,source_id'); assert.equal(body.length, 1); assert.equal(body[0].profile_id, PROFILE);
          assert.equal(body[0].source_kind, 'background_opportunity_digest');
          assert.ok(body[0].body.includes('https://synthetic.invalid/dashboard'));
          const key = body[0].source_id; if (state.digests.has(key)) return ok([]);
          state.digests.add(key); state.queued.push(...body); return ok([{ id: uuid(3), profile_id: PROFILE }]);
        }
        if (method === 'PATCH' && table === 'background_opportunity_briefs') { assert.equal(body.delivery_state, 'delivered'); state.writes.push({ table, body }); return ok(null); }
        if (method === 'PATCH' && table === 'background_notification_preferences') { assert.ok(body.last_digest_at); state.writes.push({ table, body }); return ok(null); }
      }
      if (options.scenario === 'conditional') {
        if (method === 'GET' && table === 'conditional_redirect_offers') {
          assert.equal(q.get('limit'), '25');
          if (q.get('status') === 'in.(open,arbitrating)') return ok([{ id: uuid(1) }, { id: uuid(2) }]);
          if (q.get('status') === 'eq.creator_recovery') return ok([{ id: uuid(3), creator_mandate_id: uuid(4) }]);
          assert.ok(['eq.matcher_recovery', 'in.(matched_settling,fallback_settling)'].includes(q.get('status'))); return ok([]);
        }
        if (method === 'PATCH' && ['conditional_redirect_offers', 'conditional_redirect_candidates', 'conditional_payment_mandates'].includes(table)) { assert.equal(body.status, 'cancelled'); state.writes.push({ table, body }); return ok(null); }
      }
      if (options.scenario === 'saved') {
        if (method === 'GET' && table === 'saved_searches') return ok([{ id: uuid(1), profile_id: PROFILE, cadence: 'daily', last_scanned_at: null }]);
        if (method === 'GET' && ['wish_profiles', 'profile_syntheses', 'wish_profile_previews'].includes(table)) return ok([]);
        if (method === 'PATCH' && table === 'saved_searches') { assert.equal(q.get('id'), `eq.${uuid(1)}`); assert.ok(body.last_scanned_at); state.writes.push({ table, body }); return ok(null); }
      }
      if (options.scenario === 'delegate') {
        if (method === 'GET' && table === 'personal_delegates') return ok([{ profile_id: PROFILE, status: 'active', operating_mode: 'review', last_run_at: null, search_scope: 'cohort_only' }]);
        if (method === 'GET' && ['helper_strategies', 'wish_profiles', 'profile_syntheses', 'wish_profile_previews', 'privacy_grants', 'network_invites', 'match_introduction_plans', 'match_introduction_tasks', 'privacy_access_requests'].includes(table)) return ok([]);
        if (method === 'POST' && table === 'risk_signals') { assert.equal(body.profile_id, PROFILE); assert.ok(['no_helper_strategy', 'missing_profile_synthesis'].includes(body.signal_type)); state.writes.push({ table, body }); return ok(null); }
        if (method === 'PATCH' && table === 'personal_delegates') { assert.equal(q.get('profile_id'), `eq.${PROFILE}`); assert.ok(body.last_run_at); state.writes.push({ table, body }); return ok(null); }
      }
      if (options.scenario === 'training') {
        if (method === 'GET' && trainingReads.has(table)) {
          if (table !== 'recommendation_exposures') return ok([]);
          return ok(Array.from({ length: options.count }, (_, i) => ({ id: uuid(i + 1), profile_id: PROFILE, opportunity_type: 'offer', opportunity_id: uuid(2000 + i % 8), owner_id: PEER, match_class: 'adjacent', was_shown: true, feature_snapshot: {}, assignment_arm: 'treatment', joint_propensity: 0.5, occurred_at: new Date(Date.now() - 86400000 * 30).toISOString() })));
        }
        if (['POST', 'PATCH'].includes(method) && trainingWrites.has(table)) {
          if (table === 'recommendation_model_versions') { assert.equal(method, 'POST'); assert.equal(body.status, 'cold_start'); assert.equal(body.sample_count, options.count); }
          state.writes.push({ table, body }); return ok(null);
        }
      }
      throw new Error('Unexpected operation');
    } catch (error) {
      violations.push({ method, path: new URL(path, 'http://127.0.0.1:15433').pathname, reason: error.message });
      return fail('Fixture rejected unexpected operation');
    }
  }
  return { events, violations, handle, reset, get state() { return state; } };
}

export async function startFixture() {
  const fixture = createFixture();
  const server = createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) { raw += chunk; assert.ok(raw.length <= 4 * 1024 * 1024); }
      const result = fixture.handle(req.method, req.url, req.headers, raw ? JSON.parse(raw) : null);
      res.writeHead(result.status, { 'content-type': 'application/json', ...result.headers });
      res.end(JSON.stringify(result.body));
    } catch { fixture.violations.push({ reason: 'Malformed synthetic request' }); res.writeHead(500); res.end('{}'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(15433, '127.0.0.1', resolve); });
  fixture.close = async () => { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); };
  return fixture;
}
