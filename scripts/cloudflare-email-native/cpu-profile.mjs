import assert from 'node:assert/strict';

// Only locally assigned, bounded fields may enter the aggregate diagnostic report.
// Never serialize a caught error, its stack/cause, or an arbitrary CDP response.
const failureDetails = new WeakMap();
function diagnosedError(message, details) {
  const error = new Error(message); failureDetails.set(error, details); return error;
}
export function describeProfilerFailure(error) {
  return { ...(failureDetails.get(error) ?? { stage: 'unknown', kind: 'unexpected-error' }) };
}
function requireProfile(condition, check, sampleIndex) {
  try { assert.ok(condition, `Invalid CPU profile: ${check}`); }
  catch (error) {
    failureDetails.set(error, { stage: 'profile-validation', kind: 'invalid-profile', check, ...(sampleIndex === undefined ? {} : { sampleIndex }) });
    throw error;
  }
}

// CDP sampling finds local hotspots. This is neither billed CPU nor a Free-plan acceptance gate.
export function summarizeProfile(profile) {
  requireProfile(profile && Array.isArray(profile.nodes), 'nodes-array');
  requireProfile(Array.isArray(profile.samples) && Array.isArray(profile.timeDeltas), 'sample-arrays');
  requireProfile(profile.samples.length === profile.timeDeltas.length, 'sample-delta-length');
  requireProfile(profile.endTime >= profile.startTime, 'time-order');
  const nodes = new Map(profile.nodes.map(n => [n.id, n]));
  const counts = new Map(); let idle = 0, program = 0, active = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const node = nodes.get(profile.samples[i]); requireProfile(node, 'sample-node-present', i);
    const delta = profile.timeDeltas[i];
    requireProfile(Number.isFinite(delta), 'finite-time-delta', i);
    requireProfile(delta >= 0, 'nonnegative-time-delta', i);
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
  const contexts = new Map();
  const rejectPending = (kind = 'connection-closed') => {
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(diagnosedError(`Inspector command ${p.method} failed (${kind})`, { stage: 'command', method: p.method, kind }));
    }
    pending.clear();
  };
  const close = (kind = 'connection-closed') => { rejectPending(kind); ws.close(); };
  ws.addEventListener("close", () => rejectPending()); ws.addEventListener("error", () => rejectPending('connection-error'));
  ws.addEventListener("message", event => {
    let message;
    try { message = JSON.parse(event.data); } catch { close('malformed-reply'); return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) { close('malformed-reply'); return; }
    if (message.method === "Runtime.executionContextCreated") {
      const context = message.params?.context;
      if (Number.isSafeInteger(context?.id) && context.id > 0) contexts.set(context.id, context.name);
    } else if (message.method === "Runtime.executionContextDestroyed") {
      contexts.delete(message.params?.executionContextId);
    } else if (message.method === "Runtime.executionContextsCleared") {
      contexts.clear();
    }
    const p = pending.get(message.id); if (!p) return;
    clearTimeout(p.timer); pending.delete(message.id);
    if (message.error) {
      // Do not echo arbitrary protocol text, evaluated expressions, URLs or error.data.
      const code = Number.isSafeInteger(message.error.code) ? message.error.code : "unknown";
      const reason = ["Cannot find default execution context", "Cannot find context with specified id", "Method not found", "Invalid parameters"].includes(message.error.message)
        ? message.error.message : "protocol details redacted";
      p.reject(diagnosedError(`Inspector command ${p.method} rejected (code ${code}; ${reason})`, { stage: 'command', method: p.method, kind: 'rejected', protocolCode: code, reason }));
    } else p.resolve(message.result);
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Inspector connection timed out")), timeoutMs);
      ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Inspector connection failed")); }, { once: true });
      ws.addEventListener("close", () => { clearTimeout(timer); reject(new Error("Inspector closed before connection")); }, { once: true });
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(diagnosedError(`Inspector command ${method} timed out`, { stage: 'command', method, kind: 'timeout' })); }, timeoutMs);
      pending.set(id, { method, resolve, reject, timer });
      try { ws.send(JSON.stringify({ id, method, params })); }
      catch { clearTimeout(timer); pending.delete(id); reject(diagnosedError(`Inspector command ${method} could not be sent`, { stage: 'command', method, kind: 'send-failed' })); }
    });
    // workerd has no default execution context. Use its reported Worker context,
    // never a guessed ID; Wrangler may have buffered these events before we connect.
    await call("Runtime.enable");
    const workerContexts = [...contexts].filter(([, name]) => name === "Worker");
    assert.equal(workerContexts.length, 1, "Expected one reported Worker execution context");
    const [contextId] = workerContexts[0];
    const identity = await call("Runtime.evaluate", {
      expression: `globalThis.__moralTradeCpuProfileIdentity === ${JSON.stringify(expectedIdentity)}`,
      contextId,
      returnByValue: true,
    });
    assert.equal(identity.exceptionDetails, undefined, "Worker identity evaluation failed");
    assert.equal(identity.result?.type, "boolean");
    assert.equal(identity.result?.value, true, "Inspector does not belong to this synthetic Worker run");
    await call("Profiler.enable");
    await call("Profiler.setSamplingInterval", { interval: 1000 });
    return {
      start: () => call("Profiler.start"),
      async stop() {
        const reply = await call("Profiler.stop");
        try { return summarizeProfile(reply?.profile); }
        catch (error) {
          if (!failureDetails.has(error)) failureDetails.set(error, { stage: 'profile-validation', kind: 'invalid-profile', check: 'unexpected-shape' });
          throw error;
        }
      },
      close: () => close(),
    };
  } catch (error) { close(); throw error; }
}
