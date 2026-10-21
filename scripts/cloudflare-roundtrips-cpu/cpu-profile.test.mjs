import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { connectProfiler, selectInspectorTarget } from './cpu-profile.mjs';

const identity = '10000000-0000-4000-8000-000000000001';
const target = { id: 'random-proxy-id', title: 'Cloudflare Worker', type: 'node', description: 'workers', webSocketDebuggerUrl: 'ws://127.0.0.1:9229/ws' };
const profile = { nodes: [{ id: 1, callFrame: { functionName: 'syntheticWork' } }], samples: [1], timeDeltas: [1000], startTime: 0, endTime: 1000 };
function mock({ correctIdentity = true, malformed = false, commandError = false, noResponse = false } = {}) {
  const sent = []; let closed = false;
  class Socket extends EventTarget {
    constructor(url, options) { super(); assert.equal(url, target.webSocketDebuggerUrl); assert.deepEqual(options, { headers: { Origin: 'http://127.0.0.1:9229' } }); queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
    send(raw) {
      const command = JSON.parse(raw); sent.push(command);
      if (noResponse) return;
      const result = command.method === 'Runtime.evaluate' ? { result: { type: 'boolean', value: correctIdentity } } : command.method === 'Profiler.stop' ? { profile } : {};
      queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: malformed ? 'not json' : JSON.stringify(commandError ? { id: command.id, error: {} } : { id: command.id, result }) })));
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
  assert.equal(m.sent[0].method, 'Runtime.evaluate');
  assert.equal(m.sent[0].params.expression, `globalThis.__moralTradeCpuProfileIdentity === ${JSON.stringify(identity)}`);
  await profiler.start(); const result = await profiler.stop(); profiler.close();
  assert.equal(result.sampleCount, 1); assert.equal(result.provesFreeCpuFit, false); assert.equal(m.closed, true);
});
test('wrong Worker identity cannot enable the profiler', async () => {
  const m = mock({ correctIdentity: false }); await assert.rejects(connectProfiler(identity, m.options));
  assert.deepEqual(m.sent.map(c => c.method), ['Runtime.evaluate']); assert.equal(m.closed, true);
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
