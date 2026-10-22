# Local Netlify preparation — not a deployment package

Prepared 21 October 2026 (local date). No installations, pushes, cloud tests, accounts, deployments or plan changes. Existing application repositories are unchanged. Templates deliberately are not an active Netlify configuration.

## Minimal changes

- Moral Trade: two-file candidate patch moves only the three static-file rewrites from Next configuration into the existing proxy when NETLIFY=true. The API rewrite, homepage, walkthrough cookie, query parameters, search, auth, payment and business handlers remain intact. Expanded proxy matcher passes through /feed and /discover outside Netlify. No host-native forced redirect is used to bypass the walkthrough cookie logic. This addresses the documented unsupported static-public rewrites in next.config. Netlify adapter routing and header ordering still require runtime acceptance; local mocks do not prove them.
- Normativity: api.ts.template mounts existing public-config and audit handlers and the existing Express application without a new listener or interval. It requires serverless-http, which has NOT been installed or added to a lockfile. Preserve original request path /api/*, headers, query, methods, raw body behavior and responses when adding the eventual host mapping. Prisma generation/native engine, OpenSSL executable/trust files, runtime assets and frontend publish allowlist remain packaging gates. Never publish the repository root as a static folder. No imported Cloudflare TSA/dependency patch is implicitly included.
- RLHF: narrow buffered-handler adapter and function template reuse the unchanged existing release handler. No new dependency. It preserves release bundle loading/caching and error retries; raw binary bodies, status, response headers and GET/HEAD remain covered. This is intentionally not a general Express adapter.

## Tests and exact limits

Run using existing Node:

    /Users/HenryZhu/.nvm/versions/node/v24.14.0/bin/node --disable-warning=ExperimentalWarning work/netlify-compat-20261021/tests/local.mjs

196 checks passed: 94 RLHF baseline cases, 2 failure/recovery cases, 100 Moral Trade routing/config checks. Network fetch is replaced by pinned public fixture data. Source and compressed fixture hashes are checked. No external requests or provider calls. Moral Trade uses Node type stripping and stubbed Next response primitives, not an installed Next/Netlify runtime. Normativity runtime was NOT tested. No full builds or application-wide test suites were run in this preparation-only overlay.

Moral Trade source is the previously audited canonical baseline a4adf0cbb7029a6316a34478bd27dffad22cbca4 in the existing isolated publish checkout; source-file hashes are in moraltrade/source-manifest.json. Before application/push, reconcile against then-current exact canonical and older Website2 release separately. This overlay must not replace the newer legacy fuzzy-search release. RLHF uses the previously captured exact public handler (SHA1 a9faf272965ec07e0d346789e39c2bcf4978d027). Normativity template references original existing API business handlers, not a claim of fresh hosted source equivalence.

## Schedulers: preserve, do not silently replace

Retain all UTC schedules: saved-searches 0 9 * * *; delegates 30 9 * * *; email 0 10 * * *; trade-reminders 0 11 * * *; background-networking 0 * * * *; conditional-redirects 15 * * * *; canonical-only recommendation-training 30 12 * * *; Normativity audit 0 8 * * *. Preserve the 25-email batch, leases, retries and completion/error reporting. Do not merge canonical and legacy jobs without separate evidence and approval.

No active scheduler files are supplied because the 30-second scheduled-function limit remains unproven for complete batches. A scheduled-to-background bridge would change acknowledgement/retry semantics and is not an equivalent minimal fix. The next synthetic test must time complete batches including provider waits and injected failures; use fake providers and local synthetic PostgreSQL only. If it exceeds the limit, report incompatibility before proposing a behavioral change. Keep Vercel as sole job owner until separately approved cutover.

## Next approval boundary

Prepare an exact dependency-pinned runner proposal before requesting permission: Next/Netlify adapter build for both Moral Trade baselines, serverless-http/Prisma package verification for Normativity, and RLHF function packaging. One isolated branch, automatic deployments blocked, no production secrets, no live provider calls, network denied during tests. Do not use npm install merely to discover versions or generate a lockfile without approval. No cloud run or installation is authorized by this README.

Required acceptance: static routing/proxy cookies/security headers; redirects and private caching; search forms/results; auth callbacks/session boundaries; Stripe signature/raw-body preservation; assets and server actions; Normativity database persistence, signing/TSA proof and audit; RLHF all response cases and bundle outage recovery; full job batches and retries. Hosted limits and shared Free credits must be assessed independently. Do not claim all-feature compatibility or Free fit from these unit checks.

Sources: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ ; https://docs.netlify.com/build/frameworks/framework-setup-guides/express/ ; https://docs.netlify.com/build/functions/scheduled-functions/
