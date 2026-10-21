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

export async function connectProfiler() {
  const targets = await (await fetch('http://127.0.0.1:9229/json/list', { signal: AbortSignal.timeout(5000) })).json();
  const candidates = targets.filter(t => [t.title, t.id, t.url].some(v => typeof v === 'string' && v.includes('moraltrade-compat-only')));
  assert.equal(candidates.length, 1, 'Expected exactly one Moral Trade inspector target');
  const url = new URL(candidates[0].webSocketDebuggerUrl);
  assert.equal(url.protocol, 'ws:'); assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.port, '9229');
  const ws = new WebSocket(url); let seq = 0; const pending = new Map();
  const rejectPending = () => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Inspector connection closed')); } pending.clear(); };
  ws.addEventListener('close', rejectPending); ws.addEventListener('error', rejectPending);
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), p = pending.get(message.id); if (!p) return;
    clearTimeout(p.timer); pending.delete(message.id);
    if (message.error) p.reject(new Error('Inspector command unavailable')); else p.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); reject(new Error('Inspector connection timed out')); }, 5000);
    ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Inspector connection failed')); }, { once: true });
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error('Inspector command timed out')); }, 5000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
  try { await call('Profiler.enable'); await call('Profiler.setSamplingInterval', { interval: 1000 }); }
  catch (error) { ws.close(); throw error; }
  return {
    start: () => call('Profiler.start'),
    async stop() { return summarizeProfile((await call('Profiler.stop')).profile); },
    close() { rejectPending(); ws.close(); },
  };
}
