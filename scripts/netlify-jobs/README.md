# Synthetic Netlify email acceptance harness (local preparation)

No deployable scheduler is supplied. Application code, batch 25, schedules and retries are unchanged.

- `postgres.mjs` starts a fresh installed-PostgreSQL cluster under /tmp with no TCP listener, private socket and sanitized environment; verifies identity before synthetic bootstrap. Stop retains files.
- `schema.mjs` extracts the repository's existing functions; minimal synthetic tables do not represent a full production restore.
- `fixture-server.mjs` binds only 127.0.0.1, bounds body size and shuts down explicitly.
- `http-fixture.mjs` accepts only synthetic authorization and the four allowlisted email RPCs; fake provider refuses nonsynthetic destinations and retains idempotency receipts within each case.
- `runtime-hook.mjs` is an opt-in emulator import, never a deployment file. Routes exact provider requests to loopback and rejects external fetch. OS network isolation remains required for a cloud test because this hook is not a complete network sandbox.
- `runtime-probe.mjs` exercises the full unchanged batch, retry, terminal failure and two injected latency profiles. It returns `provesFreeFit: false`; these waits are assumptions, not measured production latencies.
- `source-integration.mjs` validates that probe against the actual source route with Next/SDK stubs plus real HTTP/SQL. This is explicitly not the built Netlify runtime.

Existing Node 24 can run `node --test scripts/netlify-jobs/*.test.mjs` with local loopback permissions. PostgreSQL integration additionally needs the path to an already installed bin directory. No npm installation is required for these local scripts.

Next runner integration must use the existing exact-pinned Netlify build, then supply ONLY synthetic CRON_SECRET, RESEND_API_KEY, EMAIL_FROM, SUPABASE_SERVICE_ROLE_KEY and loopback Supabase URL to the emulator. Preserve the real compiled handler and SDK. Do not run `source-integration.mjs` and label it Netlify acceptance. Preserve network namespace isolation and process cleanup. Push/install/cloud execution requires separate owner approval.
