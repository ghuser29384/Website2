import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createFixture } from './nonempty-fixture.mjs';

// Email state is real disposable Postgres. Other coincident jobs use the existing
// bounded contract fixture; this does not claim their database/RLS parity.
export function createNativeFixture(database) {
  const provider = createFixture(), background = createFixture({ scenario: 'background' });
  const events = [], violations = [];
  let scenario;
  function reset(name) {
    database.reset(name); scenario = name; events.length = 0; violations.length = 0;
    provider.reset({ scenario: 'email', providerFailure: name === 'provider-error' });
    background.reset({ scenario: 'background' });
  }
  function handle(method, path, headers, body) {
    try {
      const url = new URL(path, 'http://127.0.0.1:15433');
      assert.equal(url.origin, 'http://127.0.0.1:15433');
      events.push({ method, path: url.pathname });
      if (url.pathname === '/synthetic-provider/emails') {
        if (['full', 'post', 'overfull', 'scheduled'].includes(scenario)) {
          const previous = provider.state.provider.size;
          if (previous) {
            const persisted = database.snapshot().filter(row => row.status === 'sent');
            assert.equal(persisted.length, previous, 'Every earlier receipt must already be committed');
            assert.ok(persisted.every(row => row.body === '[private invitation link removed after delivery]'), 'Invitation bodies must already be redacted');
          }
        }
        return provider.handle(method, path, headers, body);
      }
      assert.ok(!url.pathname.includes('_email_outbox_v2'), 'Native email must not fall back to database HTTP');
      return background.handle(method, path, headers, body);
    } catch (error) {
      violations.push(error.message);
      return { status: 500, body: { message: 'Synthetic native fixture rejected request' } };
    }
  }
  return { reset, handle, events, get violations() { return [...violations, ...provider.violations, ...background.violations]; }, get provider() { return provider.state.provider; }, get background() { return background.state; } };
}

export async function startNativeFixture(database) {
  const fixture = createNativeFixture(database);
  const server = createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) { raw += chunk; assert.ok(raw.length <= 4 * 1024 * 1024); }
      const result = fixture.handle(req.method, req.url, req.headers, raw ? JSON.parse(raw) : null);
      res.writeHead(result.status, { 'content-type': 'application/json', ...result.headers });
      res.end(JSON.stringify(result.body));
    } catch { res.writeHead(500); res.end('{}'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(15433, '127.0.0.1', resolve); });
  fixture.close = async () => { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); };
  return fixture;
}

export function countNativeQueries(log) {
  return [...log.matchAll(/(?:statement|execute [^\n]+?): SELECT (?:\* FROM public\.claim_email_outbox_v2|public\.(?:complete|retry|suppress)_email_outbox_v2)\(/g)].length;
}
