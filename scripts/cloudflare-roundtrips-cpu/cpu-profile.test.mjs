import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { Session } from 'node:inspector';
import vm from 'node:vm';
import { connectProfiler, selectInspectorTarget } from './cpu-profile.mjs';

const identity = '10000000-0000-4000-8000-000000000001';
const target = { id: 'random-proxy-id', title: 'Cloudflare Worker', type: 'node', description: 'workers', webSocketDebuggerUrl: 'ws://127.0.0.1:9229/ws' };
const profile = { nodes: [{ id: 1, callFrame: { functionName: 'syntheticWork' } }], samples: [1], timeDeltas: [1000], startTime: 0, endTime: 1000 };
const workerContext = { id: 7319, name: 'Worker', origin: '' };
function mock({ correctIdentity = true, malformed = false, commandError = false, noResponse = false, contexts = [workerContext], buffered = false, clearContexts = false, destroyContext = false, errorMethod, error = { code: -32601, message: 'Method not found' } } = {}) {
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
      if (noResponse) return;
      const result = command.method === 'Runtime.evaluate' ? { result: { type: 'boolean', value: correctIdentity } } : command.method === 'Profiler.stop' ? { profile } : {};
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
        assert.equal(error.message, `Inspector command ${errorMethod} rejected (code -32000; protocol details redacted)`); return true;
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
