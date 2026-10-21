import assert from 'node:assert/strict';

// CDP sampling finds local hotspots. This is neither billed CPU nor a Free-plan acceptance gate.
export function summarizeProfile(profile) {
  assert.ok(profile && Array.isArray(profile.nodes));
  assert.ok(Array.isArray(profile.samples) && Array.isArray(profile.timeDeltas));
  assert.equal(profile.samples.length, profile.timeDeltas.length);
  assert.ok(profile.endTime >= profile.startTime);
  const nodes = new Map(profile.nodes.map(n => [n.id, n]));
  const counts = new Map(); let idle = 0, program = 0, active = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const node = nodes.get(profile.samples[i]); assert.ok(node);
    const delta = profile.timeDeltas[i]; assert.ok(Number.isFinite(delta) && delta >= 0);
    const name = node.callFrame.functionName || '(anonymous)';
    if (name === '(idle)') idle += delta;
    else if (['(program)', '(root)'].includes(name)) program += delta;
    else { active += delta; counts.set(name, (counts.get(name) ?? 0) + delta); }
  }
  return {
    method: 'local DevTools sample intervals; not Cloudflare billed CPU',
    profileWindowMs: (profile.endTime - profile.startTime) / 1000,
    sampledActiveIntervalMs: active / 1000, sampledIdleIntervalMs: idle / 1000, sampledUnattributedIntervalMs: program / 1000,
    sampleCount: profile.samples.length,
    topSampledFunctions: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, us]) => ({ name, sampledIntervalMs: us / 1000 })),
    provesFreeCpuFit: false,
  };
}

// Wrangler 4.151.2 exposes one proxy target with this generic title, not the app name.
// Verify both that endpoint shape and a per-run marker read from our test-only Worker.
export function selectInspectorTarget(targets) {
  assert.ok(Array.isArray(targets));
  assert.equal(targets.length, 1, "Expected one isolated Wrangler inspector target");
  const target = targets[0];
  assert.equal(target.title, "Cloudflare Worker");
  assert.equal(target.type, "node");
  assert.equal(target.description, "workers");
  const url = new URL(target.webSocketDebuggerUrl);
  assert.equal(url.protocol, "ws:");
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.equal(url.port, "9229");
  assert.equal(url.pathname, "/ws");
  assert.equal(url.username + url.password + url.search + url.hash, "");
  return url.href;
}

export async function connectProfiler(expectedIdentity, { fetchImpl = fetch, WebSocketImpl = WebSocket, timeoutMs = 5000 } = {}) {
  assert.match(expectedIdentity, /^[0-9a-f-]{36}$/);
  const response = await fetchImpl("http://127.0.0.1:9229/json/list", { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
  assert.equal(response.ok, true);
  const url = selectInspectorTarget(await response.json());
  const ws = new WebSocketImpl(url, { headers: { Origin: "http://127.0.0.1:9229" } }); let seq = 0; const pending = new Map();
  const rejectPending = () => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error("Inspector connection closed")); } pending.clear(); };
  const close = () => { rejectPending(); ws.close(); };
  ws.addEventListener("close", rejectPending); ws.addEventListener("error", rejectPending);
  ws.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(event.data); } catch { close(); return; }
    const p = pending.get(message.id); if (!p) return;
    clearTimeout(p.timer); pending.delete(message.id);
    if (message.error) p.reject(new Error("Inspector command unavailable")); else p.resolve(message.result);
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Inspector connection timed out")), timeoutMs);
      ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Inspector connection failed")); }, { once: true });
      ws.addEventListener("close", () => { clearTimeout(timer); reject(new Error("Inspector closed before connection")); }, { once: true });
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error("Inspector command timed out")); }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      try { ws.send(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
    const identity = await call("Runtime.evaluate", {
      expression: `globalThis.__moralTradeCpuProfileIdentity === ${JSON.stringify(expectedIdentity)}`,
      returnByValue: true,
    });
    assert.equal(identity.exceptionDetails, undefined, "Worker identity evaluation failed");
    assert.equal(identity.result?.type, "boolean");
    assert.equal(identity.result?.value, true, "Inspector does not belong to this synthetic Worker run");
    await call("Profiler.enable");
    await call("Profiler.setSamplingInterval", { interval: 1000 });
    return {
      start: () => call("Profiler.start"),
      async stop() { return summarizeProfile((await call("Profiler.stop")).profile); },
      close,
    };
  } catch (error) { close(); throw error; }
}
