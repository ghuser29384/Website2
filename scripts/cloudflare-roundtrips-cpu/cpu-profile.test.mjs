import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import vm from 'node:vm';
import { connectProfiler, selectInspectorTarget, summarizeProfile, describeProfilerFailure } from './cpu-profile.mjs';

const identity = '10000000-0000-4000-8000-000000000001';
const target = { id: 'random-proxy-id', title: 'Cloudflare Worker', type: 'node', description: 'workers', webSocketDebuggerUrl: 'ws://127.0.0.1:9229/ws' };
const profile = { nodes: [{ id: 1, callFrame: { functionName: 'syntheticWork' } }], samples: [1], timeDeltas: [1000], startTime: 0, endTime: 1000 };
const workerContext = { id: 7319, name: 'Worker', origin: '' };
function mock({ correctIdentity = true, malformed = false, commandError = false, noResponse = false, contexts = [workerContext], buffered = false, clearContexts = false, destroyContext = false, errorMethod, error = { code: -32601, message: 'Method not found' }, failureMethod, failureKind, stopProfile = profile } = {}) {
  const sent = []; let closed = false;
  class Socket extends EventTarget {
    constructor(url, options) {
      super(); assert.equal(url, target.webSocketDebuggerUrl); assert.deepEqual(options, { headers: { Origin: 'http://127.0.0.1:9229' } });
      queueMicrotask(() => { this.dispatchEvent(new Event('open')); if (buffered) this.reportContexts(); });
    }
    message(value) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) })); }
    reportContexts() {
      for (const context of contexts) this.message({ method: 'Runtime.executionContextCreated', params: { context } });
      if (clearContexts) this.message({ method: 'Runtime.executionContextsCleared', params: {} });
      if (destroyContext) this.message({ method: 'Runtime.executionContextDestroyed', params: { executionContextId: workerContext.id } });
    }
    send(raw) {
      const command = JSON.parse(raw); sent.push(command);
      if (command.method === failureMethod) {
        if (failureKind === 'send-failed') throw new Error('private-send-error-not-for-logs');
        if (failureKind === 'timeout') return;
        queueMicrotask(() => {
          if (failureKind === 'connection-closed') this.close();
          else if (failureKind === 'connection-error') this.dispatchEvent(new Event('error'));
          else if (failureKind === 'malformed-reply') this.dispatchEvent(new MessageEvent('message', { data: 'private-malformed-payload' }));
        });
        return;
      }
      if (noResponse) return;
      const result = command.method === 'Runtime.evaluate' ? { result: { type: 'boolean', value: correctIdentity } } : command.method === 'Profiler.stop' ? { profile: stopProfile } : {};
      queueMicrotask(() => {
        if (malformed) { this.dispatchEvent(new MessageEvent('message', { data: 'not json' })); return; }
        if (commandError || command.method === errorMethod) { this.message({ id: command.id, error }); return; }
        if (command.method === 'Runtime.enable' && !buffered) this.reportContexts();
        // Match workerd/V8: context-less evaluation fails even when one Worker exists.
        if (command.method === 'Runtime.evaluate' && command.params.contextId !== workerContext.id) {
          this.message({ id: command.id, error: { code: -32000, message: 'Cannot find default execution context' } }); return;
        }
        this.message({ id: command.id, result });
      });
    }
    close() { if (!closed) { closed = true; this.dispatchEvent(new Event('close')); } }
  }
  return { sent, get closed() { return closed; }, options: { timeoutMs: 30, WebSocketImpl: Socket, fetchImpl: async (url, options) => { assert.equal(url, 'http://127.0.0.1:9229/json/list'); assert.equal(options.redirect, 'error'); return Response.json([target]); } } };
}
test('matches the pinned Wrangler proxy without relying on application-name metadata', () => {
  assert.equal(selectInspectorTarget([target]), target.webSocketDebuggerUrl);
  assert.throws(() => selectInspectorTarget([]));
  assert.throws(() => selectInspectorTarget([target, target]));
});
test('rejects remote, authenticated, ambiguous and unexpected inspector endpoints', () => {
  for (const url of ['wss://example.invalid/ws', 'ws://127.0.0.1:9230/ws', 'ws://user:pass@127.0.0.1:9229/ws', 'ws://127.0.0.1:9229/other', 'ws://127.0.0.1:9229/ws?q=1']) {
    assert.throws(() => selectInspectorTarget([{ ...target, webSocketDebuggerUrl: url }]));
  }
  assert.throws(() => selectInspectorTarget([{ ...target, description: 'other worker' }]));
});
test('verifies the per-run marker before starting CPU profiling and closes cleanly', async () => {
  const m = mock(); const profiler = await connectProfiler(identity, m.options);
  assert.equal(m.sent[0].method, 'Runtime.enable');
  assert.equal(m.sent[1].method, 'Runtime.evaluate');
  assert.equal(m.sent[1].params.contextId, workerContext.id);
  assert.equal(m.sent[1].params.expression, `globalThis.__moralTradeCpuProfileIdentity === ${JSON.stringify(identity)}`);
  await profiler.start(); const result = await profiler.stop(); profiler.close();
  assert.equal(result.sampleCount, 1); assert.equal(result.provesFreeCpuFit, false); assert.equal(m.closed, true);
});
test('wrong Worker identity cannot enable the profiler', async () => {
  const m = mock({ correctIdentity: false }); await assert.rejects(connectProfiler(identity, m.options));
  assert.deepEqual(m.sent.map(c => c.method), ['Runtime.enable', 'Runtime.evaluate']); assert.equal(m.closed, true);
});
test('accepts buffered context events and repeated reports of the same context', async () => {
  const m = mock({ buffered: true, contexts: [workerContext, workerContext, { id: 42, name: 'Other' }] });
  const profiler = await connectProfiler(identity, m.options); profiler.close();
  assert.equal(m.sent[1].params.contextId, workerContext.id); assert.equal(m.closed, true);
});
test('missing, ambiguous, invalid, cleared and destroyed contexts fail before evaluation', async () => {
  for (const options of [{ contexts: [] }, { contexts: [workerContext, { ...workerContext, id: 7320 }] }, { contexts: [{ ...workerContext, id: '7319' }] }, { clearContexts: true }, { destroyContext: true }]) {
    const m = mock(options); await assert.rejects(connectProfiler(identity, m.options), /Expected one reported Worker execution context/);
    assert.deepEqual(m.sent.map(c => c.method), ['Runtime.enable']); assert.equal(m.closed, true);
  }
});
test('command failures identify the method and code without exposing arbitrary protocol fields', async () => {
  for (const errorMethod of ['Runtime.enable', 'Runtime.evaluate', 'Profiler.enable', 'Profiler.setSamplingInterval', 'Profiler.start', 'Profiler.stop']) {
    const m = mock({ errorMethod, error: { code: -32000, message: 'private-value-not-for-logs', data: 'private-data-not-for-logs' } });
    let profiler;
    try {
      await assert.rejects(async () => {
        profiler = await connectProfiler(identity, m.options); await profiler.start(); await profiler.stop();
      }, error => {
        assert.equal(error.message, `Inspector command ${errorMethod} rejected (code -32000; protocol details redacted)`);
        assert.deepEqual(describeProfilerFailure(error), { stage: 'command', method: errorMethod, kind: 'rejected', protocolCode: -32000, reason: 'protocol details redacted' });
        assert.doesNotMatch(JSON.stringify(describeProfilerFailure(error)), /private-/); return true;
      });
    } finally { profiler?.close(); }
    assert.equal(m.closed, true);
  }
  const m = mock({ errorMethod: 'Runtime.evaluate', error: { code: -32000, message: 'Cannot find default execution context' } });
  await assert.rejects(connectProfiler(identity, m.options), /Runtime.evaluate rejected \(code -32000; Cannot find default execution context\)/);
});
test('real local V8 dispatch verifies a named synthetic context and returns a CPU profile', async () => {
  const context = vm.createContext({ __moralTradeCpuProfileIdentity: identity }, { name: 'Worker' });
  const session = new Session(); let disconnected = false;
  class LocalInspectorSocket extends EventTarget {
    constructor() {
      super(); session.connect();
      session.on('inspectorNotification', message => this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) })));
      queueMicrotask(() => this.dispatchEvent(new Event('open')));
    }
    send(raw) {
      const { id, method, params } = JSON.parse(raw);
      session.post(method, params, (error, result) => this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(error ? { id, error: { code: error.code, message: error.message } } : { id, result }) })));
    }
    close() { if (!disconnected) { disconnected = true; session.disconnect(); this.dispatchEvent(new Event('close')); } }
  }
  const profiler = await connectProfiler(identity, { WebSocketImpl: LocalInspectorSocket, fetchImpl: async () => Response.json([target]) });
  try {
    await profiler.start();
    vm.runInContext('function syntheticWork() { let sum = 0; for (let i = 0; i < 1000000; i++) sum += Math.sqrt(i); return sum; } syntheticWork()', context);
    const result = await profiler.stop(); assert.ok(result.sampleCount > 0); assert.equal(result.provesFreeCpuFit, false);
  } finally { profiler.close(); }
  assert.equal(disconnected, true);
});
test('malformed, unsupported and timed-out CDP replies fail and close the socket', async () => {
  for (const options of [{ malformed: true }, { commandError: true }, { noResponse: true }]) {
    const m = mock(options); await assert.rejects(connectProfiler(identity, m.options)); assert.equal(m.closed, true);
  }
});
test('start and stop diagnostics distinguish timeout, closed/error connections, malformed replies and send failure', async () => {
  for (const method of ['Profiler.start', 'Profiler.stop']) {
    for (const kind of ['timeout', 'connection-closed', 'connection-error', 'malformed-reply', 'send-failed']) {
      const m = mock({ failureMethod: method, failureKind: kind });
      const profiler = await connectProfiler(identity, m.options);
      try {
        await assert.rejects(async () => { await profiler.start(); await profiler.stop(); }, error => {
          assert.deepEqual(describeProfilerFailure(error), { stage: 'command', method, kind });
          assert.doesNotMatch(JSON.stringify(describeProfilerFailure(error)), /private-/); return true;
        });
      } finally { profiler.close(); }
      assert.equal(m.closed, true);
      assert.equal(m.sent.filter(c => c.method === method).length, 1, 'No profiler retry');
    }
  }
});
test('invalid profiles retain the exact failed check without exposing raw profile values', async () => {
  const cases = [
    [null, 'nodes-array'],
    [{ ...profile, samples: null }, 'sample-arrays'],
    [{ ...profile, timeDeltas: [] }, 'sample-delta-length'],
    [{ ...profile, endTime: -1 }, 'time-order'],
    [{ ...profile, samples: [999] }, 'sample-node-present', 0],
    [{ ...profile, timeDeltas: ['private-profile-value'] }, 'finite-time-delta', 0],
    [{ ...profile, timeDeltas: [-1] }, 'nonnegative-time-delta', 0],
    [{ ...profile, nodes: [{ id: 1 }] }, 'unexpected-shape'],
  ];
  for (const [stopProfile, check, sampleIndex] of cases) {
    const m = mock({ stopProfile }); const profiler = await connectProfiler(identity, m.options);
    try {
      await profiler.start();
      await assert.rejects(profiler.stop(), error => {
        assert.deepEqual(describeProfilerFailure(error), { stage: 'profile-validation', kind: 'invalid-profile', check, ...(sampleIndex === undefined ? {} : { sampleIndex }) });
        assert.doesNotMatch(JSON.stringify(describeProfilerFailure(error)), /private-|"nodes":|"samples":|"timeDeltas":/); return true;
      });
    } finally { profiler.close(); }
    assert.equal(m.closed, true);
  }
  for (const delta of [NaN, Infinity, -Infinity]) {
    assert.throws(() => summarizeProfile({ ...profile, timeDeltas: [delta] }), error => {
      assert.equal(describeProfilerFailure(error).check, 'finite-time-delta'); return true;
    });
  }
  assert.deepEqual(summarizeProfile(profile), {
    method: 'local DevTools sample intervals; not Cloudflare billed CPU', profileWindowMs: 1,
    sampledActiveIntervalMs: 1, sampledIdleIntervalMs: 0, sampledUnattributedIntervalMs: 0,
    sampleCount: 1, topSampledFunctions: [{ name: 'syntheticWork', sampledIntervalMs: 1 }], provesFreeCpuFit: false,
  });
});
test('unknown errors and forged metadata are redacted without reading their properties', () => {
  const error = new Error('private-message'); error.cause = 'private-cause'; error.diagnostic = { kind: 'private-forgery' };
  const hostile = new Proxy({}, { get() { throw new Error('Must not read arbitrary error properties'); } });
  for (const value of [error, hostile, 'private-thrown-string', null, undefined]) {
    assert.deepEqual(describeProfilerFailure(value), { stage: 'unknown', kind: 'unexpected-error' });
  }
  assert.throws(() => summarizeProfile({ ...profile, timeDeltas: [-1] }), error => {
    const first = describeProfilerFailure(error); first.kind = 'private-mutation';
    assert.equal(describeProfilerFailure(error).kind, 'invalid-profile'); return true;
  });
});

// Execute the probe's actual check/catch and final gates, without launching a Worker
// or importing its setup code. All injected operations below are synthetic/local.
const probeSource = readFileSync(new URL('./nonempty-runtime-probe.mjs', import.meta.url), 'utf8');
const checkStart = probeSource.indexOf('async function check(');
const checkEnd = probeSource.indexOf('\ntry {', checkStart);
assert.ok(checkStart >= 0 && checkEnd > checkStart);
const gateLines = probeSource.split('\n').filter(line => line.includes('CPU profiler must connect in this repair test') || line.includes('Every case requires a CPU profile'));
assert.equal(gateLines.length, 2);
function probeHarness(profiler) {
  let resets = 0;
  const result = { status: 'FAIL', profilerStatus: 'CONNECTED', measurements: [], passedCases: [] };
  const fixture = { reset() { resets++; }, violations: [], events: [] };
  const context = vm.createContext({ profiler, result, fixture, assert, performance, describeProfilerFailure });
  fixture.violations = vm.runInContext('[]', context); // Same realm as the probe's strict comparison.
  const check = vm.runInContext(probeSource.slice(checkStart, checkEnd) + '\ncheck', context);
  return { result, context, check, get resets() { return resets; }, gates: () => vm.runInContext(gateLines.join('\n'), context) };
}
test('probe retains sixth-case validation failure, continues behavior checks once and keeps required-profile gates failing', async () => {
  let starts = 0, stops = 0, closes = 0, behaviors = 0;
  const h = probeHarness({
    async start() { starts++; },
    async stop() { stops++; return summarizeProfile(stops === 6 ? { ...profile, timeDeltas: [-1] } : profile); },
    close() { closes++; },
  });
  for (let i = 0; i < 21; i++) await h.check(`synthetic case ${i + 1}`, { scenario: 'synthetic', count: 25 }, async () => { behaviors++; });
  assert.deepEqual(JSON.parse(JSON.stringify(h.result.profilerFailure)), { phase: 'stop', caseNumber: 6, stage: 'profile-validation', kind: 'invalid-profile', check: 'nonnegative-time-delta', sampleIndex: 0 });
  assert.equal(h.result.profilerStatus, 'PARTIAL_OR_UNAVAILABLE'); assert.equal(h.result.status, 'FAIL');
  assert.equal(h.result.measurements.filter(m => m.cpuProfile).length, 5);
  assert.equal(h.result.measurements.length, 21); assert.equal(h.result.passedCases.length, 21);
  assert.equal(behaviors, 21); assert.equal(h.resets, 21); assert.equal(starts, 6); assert.equal(stops, 6); assert.equal(closes, 1);
  assert.equal(h.context.profiler, null); assert.throws(h.gates, /CPU profiler must connect/);
  h.result.profilerStatus = 'CONNECTED'; assert.throws(h.gates, /Every case requires a CPU profile/);
});
test('probe records start failures safely without retrying or skipping behavior checks', async () => {
  let starts = 0, stops = 0, closes = 0, behaviors = 0;
  const h = probeHarness({ async start() { starts++; throw new Error('private-start-error'); }, async stop() { stops++; }, close() { closes++; } });
  for (let i = 0; i < 2; i++) await h.check('synthetic case', { scenario: 'synthetic' }, async () => { behaviors++; });
  assert.deepEqual(JSON.parse(JSON.stringify(h.result.profilerFailure)), { phase: 'start', caseNumber: 1, stage: 'unknown', kind: 'unexpected-error' });
  assert.equal(h.result.profilerStatus, 'UNAVAILABLE'); assert.equal(starts, 1); assert.equal(stops, 0); assert.equal(closes, 1);
  assert.equal(behaviors, 2); assert.equal(h.result.measurements.length, 2); assert.throws(h.gates);
});
test('successful probe cases retain their profiles and pass the same required-profile gates', async () => {
  const h = probeHarness({ async start() {}, async stop() { return summarizeProfile(profile); }, close() { assert.fail('No premature close'); } });
  await h.check('synthetic case', { scenario: 'synthetic', count: 200 }, async () => {});
  assert.equal(h.result.profilerStatus, 'CONNECTED'); assert.equal(h.result.profilerFailure, undefined);
  assert.deepEqual(h.result.measurements[0].cpuProfile, summarizeProfile(profile));
  assert.equal(h.result.measurements[0].count, 200); assert.doesNotThrow(h.gates);
});
test('native Node WebSocket sends the loopback Origin required by Wrangler', async () => {
  const seen = [], server = http.createServer();
  server.on('upgrade', (request, socket) => {
    seen.push({ origin: request.headers.origin, userAgent: request.headers['user-agent'] });
    // End at the handshake: existing unit tests cover CDP; this checks actual wire headers.
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    class LocalSocket extends WebSocket {
      constructor(url, options) {
        assert.equal(url, target.webSocketDebuggerUrl);
        super(`ws://127.0.0.1:${server.address().port}/ws`, options);
      }
    }
    await assert.rejects(connectProfiler(identity, {
      timeoutMs: 3000, WebSocketImpl: LocalSocket,
      fetchImpl: async () => Response.json([target]),
    }), /Inspector connection failed/);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].origin, 'http://127.0.0.1:9229');
    assert.equal(seen[0].userAgent, 'node');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
