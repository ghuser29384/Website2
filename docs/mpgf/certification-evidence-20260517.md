# MPGF Certification Evidence Collected 2026-05-17

Status: exact-pilot solver certified for the active non-real-money profile; full production-domain participant verification still blocked.

## Certified Exact-Pilot Solver Evidence

Collected with the repository solver and control-plane validators.

- Certificate schema: `mpgf-solver-certificate-v0.3`
- Certificate type: `region_enumeration`
- Canonical instance hash prefix: `0650f01b`
- Budget cents: `100000`
- Candidate allocation lines: `4`
- Optimality verifier status: `passed`
- Optimality verified: `true`
- Live ordinary allocation preflight inside active limits: `passed`
- Selected live solver: `complete_region_enumeration`
- Solver benchmark fixtures: `passed`
- Solver support profile validator: `passed`
- Active support profile supports `exact_pilot_complete`: `true`
- Solver benchmark support: `passed`
- Solver benchmark execution: `passed`
- Solver certification gate: `passed`
- Exact-pilot completion gate: `passed`

Evidence files:

- `config/mpgf/solver-support-profile.json`
- `docs/mpgf/solver-benchmark-report.md`
- `docs/mpgf/www-exact-pilot-dry-run-verification.md`
- `docs/mpgf/completion-profile-evidence-exact_pilot_complete.json`

Conclusion: the current code has certified exact-pilot solver evidence for the active non-real-money exact-integer proportional profile. It does not certify larger piecewise-linear instances, branch-and-bound instances, real-money allocation effects, payout authorization, or external disbursement.

## Production Browser Evidence

Collected with Google Chrome through a read-only browser run against `https://www.moraltrade.org`.

Evidence artifact directory:

`/private/tmp/mpgf-production-evidence-20260517-resolved`

Recorded files include:

- `browser-evidence.json`
- `01-mpgf-home.png`
- `02-mpgf-contribute-initial.png`
- `03-mpgf-contribute-filled-auth-gated.png`
- `04-mpgf-pools.png`
- `05-mpgf-pools-new-initial.png`
- `06-mpgf-pools-new-ready-no-submit.png`
- `07-mpgf-account-contributions.png`
- `08-mpgf-admin-launch.png`
- `health.json`
- `exact-pilot-dry-run.json`
- `monitor-evidence.json`

Observed public route results:

- `/mpgf`: rendered.
- `/mpgf/contribute`: rendered.
- `/mpgf/pools`: rendered.
- `/mpgf/pools/new`: rendered.
- `/mpgf/account/contributions`: rendered behind the account-state route.
- `/mpgf/admin/launch`: rendered with admin-gated controls.

Read-only journey observations:

- Manual external-payment evidence fields render in production.
- Unsigned manual evidence submission remains disabled and shows sign-in prompting.
- Pool proposal reasoning fields render in production.
- After required pool-reasoning fields are filled, the proposal submit button becomes enabled.
- The browser evidence intentionally did not click submit or mutate production state without an authenticated participant session.
- The admin launch route renders, but authorization actions remain gated by authenticated admin checks.

## Production Deployment Evidence

Latest Vercel production deployment metadata from the deployment command:

- Deployment ID: `dpl_8VHmr7ptjdfbyV9FBcc3XZeWXnsz`
- Deployment URL: `https://website2-1b58na896-ellen-s.vercel.app`
- Target: `production`
- Ready state: `READY`
- Alias: `https://www.moraltrade.org`
- Inspector URL: `https://vercel.com/ellen-s/website2/8VHmr7ptjdfbyV9FBcc3XZeWXnsz`

The deployed app build completed successfully on Vercel. Local post-deploy HTTP probes were not rerun after the final doc-only deployment because the execution environment rejected further production network fetches.

## Five-Minute Production Monitor Evidence

Monitor window from the resolved evidence run:

- Started: `2026-05-17T20:39:08.367Z`
- Final sample: `2026-05-17T20:44:16.620Z`
- Samples: `6`
- Interval: approximately `60s`
- Configured public routes: `/mpgf`, `/mpgf/contribute`, `/mpgf/pools`

Every sample returned the public routes successfully. `/api/mpgf/health` and `/api/mpgf/exact-pilot-dry-run` returned `ok=true` during that monitor window.

## Remaining Evidence Needed Before Full Production-Domain Demo Completion

- Use an authenticated ordinary participant session to verify return-to-MPGF login, persisted manual evidence submission, pledge state, recurring commitment controls, account display, pool proposal, and ballot journey.
- Use authenticated browser evidence to verify sign-out/sign-in persistence and unsafe redirect rejection.
- Record `docs/mpgf/www-auth-session-verification.md` as passed only after the auth/session browser run passes.
- Record `docs/mpgf/www-participant-journey-verification.md` as passed only after the ordinary participant journey browser run passes.
