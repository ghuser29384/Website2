# Repository and project guidance

## Authority and freshness

Use this file as durable project context, not as proof of current implementation or production state.

For every task, apply this order of authority:

1. The user's current request and any exact brief, specification, named file, or visible acceptance criteria.
2. Current repository files, tests, Git history, database schema, deployment configuration, runtime logs, and rendered behavior.
3. The project intent and historical lessons below.

Reinspect current state before reporting that a feature is live, complete, deployed, funded, verified, or safe. Preserve user-owned changes and do not sweep unrelated work into a commit.

## Working agreements

- Read the exact supplied brief or specification before acting; do not substitute a remembered summary.
- Preserve user-provided names, labels, prompts, and visible copy unless asked to revise them.
- Prefer extending the current architecture over a speculative rewrite.
- Make public claims mechanically true. Never fabricate payments, commitments, evidence, counts, pivotality, personalization, urgency, or social proof.
- Keep read-only audits non-mutating unless the user explicitly asks for changes.
- Use focused tests first, then lint, type-check/build, broader tests, `git diff --check`, and rendered-route evidence when proportionate.
- For commit/push work, inspect the branch, remote, upstream divergence, recent log, and exact files. Stage narrowly and report whether a new scoped commit was pushed, an existing commit was already published, or safe isolation was impossible.
- Report evidence, pass/fail boundaries, unresolved risks, and blockers rather than only a feature recap.

## Moral Trade design-intent clarification

Ask for clarification before implementing when design intent is unclear and the ambiguity could cause path-dependent product or mechanism errors.

Ask first if:

- the requested design could be interpreted as adding a new feature family rather than improving the current rendered UI;
- an instruction references 美团 / 淘宝 / 大众点评 screenshots and it is unclear whether the image is a strict visual target, layout-density target, interaction reference, or only conceptual inspiration;
- the requested design affects pledge funding, moral public goods, commitment flows, payments, reviews, evidence, verification, refunds, releases, or receipt atoms;
- the intended implementation state is unclear: live-backed, preview-only, SafeState/off-state, route-safe only, or future-work only;
- the change might weaken truthfulness, privacy, anti-coercion, no-fake-state, no-fake-counts, no-fake-urgency, or v72 receipt-atom rules;
- the requested change may conflict with v72, this `AGENTS.md`, Supabase/RLS constraints, GitHub branch/PR state, Vercel deployment behavior, or production safety.

When asking, give two to four concrete interpretations and a default recommendation. For small, reversible ambiguity that does not affect architecture, safety, state ownership, payment/auth/database behavior, or major UX direction, proceed with the most conservative v72-compatible assumption and state that assumption in the final report.

## Product intent

Moral Trade is marketplace-first while retaining explicit ethical, privacy, and trust context.

- Keep group buying within the Trade information architecture rather than restoring a prominent top-right homepage CTA without a new design instruction.
- Simplify dashboards through regrouping and progressive disclosure, not by deleting user actions.
- Use “credibility” framing rather than “credit,” “social credit,” or a generalized reputation score.
- Trust and evidence mechanisms should be privacy-aware, consent-gated, evidence-gated, revocable where applicable, and fail closed.
- Background networking should remain privacy-first, staged, non-autonomous, and based on explicit consent. Do not imply automatic ingestion of social accounts, email, chats, or private sources.
- Preview or simulation surfaces must state that no durable state changed and must not imply real custody, payment, refund, payout, or commitment infrastructure.

## Historical implementation context

The prior project work included the following areas. Treat this as orientation and reverify the current code before relying on it:

- Marketplace-first homepage and navigation changes.
- Dashboard information-architecture simplification without removing functionality.
- Metropolis Regular body-font integration.
- Background-networking public-page and route alignment.
- Participant credibility, optional private friend testimonials, and invite-based guest-witness testimony.
- Opportunity-constrained meal-evidence publishing.
- Performance-bond schema and neutral-review/custody wording.
- Pledge-funding browse, detail, and sheet routes that were originally implemented as preview-only.
- Supabase-backed fallback livestream evidence with schema, RLS, generated types, create flow, and admin review.
- Preview/Production Vercel workflow controls and low-memory build configuration.

Historical preview-only status does not determine the current state. The current repository documents Stripe, Connect, MPGF migrations, and explicit real-money gates. Before calling any funding flow live, verify the deployed schema and migrations, environment variables, gate rows, webhook configuration, ledger/accounting behavior, charge/refund behavior, custody language, payout routing, and runtime evidence. Stripe payment records are not legal escrow, and reminder schedules are not automatic recurring card charges.

## Data, privacy, and trust verification

For Supabase-backed changes, verify all of the following as applicable:

- schema and migration ordering;
- RLS policies, grants, indexes, and constraints;
- generated database types;
- server/client integration and authorization boundaries;
- failure states and rendered behavior;
- production or protected-preview runtime logs.

A deployment marked Ready and a basic route smoke test are insufficient when protected routes, authentication, database calls, or background jobs are involved.

Preserve these semantics unless a current specification explicitly changes them:

- exact wishes and sensitive source material remain private until an authorized disclosure step;
- testimonials are optional, private, revocable, expiring, rate-limited, and capped where the current model supports those properties;
- evidence and witness surfaces must distinguish submitted, reviewed, verified, disputed, and unavailable states;
- no claim of neutrality, custody, verification, or payout should exceed the implemented mechanism.

## Repository structure and module organization

This is a Next.js App Router TypeScript app. Route pages and handlers live in `src/app/`, reusable UI in `src/components/`, and shared domain logic in `src/lib/`, including `src/lib/moral-trade/` and `src/lib/mpgf/`. Supabase clients and generated types are in `src/lib/supabase/`. Database schema and migrations live under `supabase/`, public assets under `public/`, scripts under `scripts/`, Playwright specs under `tests/`, and docs under `docs/`. Keep source-adjacent tests as `src/**/*.test.ts`.

## Build, test, and development commands

Inspect `package.json` before execution. Current root commands include:

- `npm install`: install dependencies; Node `>=20.9.0` is required.
- `npm run dev`: start the local Next.js development server with webpack.
- `npm run build`: create a production build.
- `npm run start`: serve the built application locally.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run Node test-runner tests in `src/**/*.test.ts`.
- `npm run test:e2e`: run Playwright specifications in `tests/`.
- `npm run measure:routes` and `npm run verify:crawlability`: validate public-route and crawlability baselines.

Run only the proportionate subset for the task, then expand when risk or scope requires it.

## Coding and testing conventions

Use TypeScript and React function components. Match the existing two-space indentation and concise module style. Name route folders and files with lowercase kebab-case. Export React components in PascalCase and helpers in camelCase. Keep server-only Supabase or Stripe code out of client components, and prefer typed helpers in `src/lib/` over duplicated page logic.

Add focused `*.test.ts` coverage beside changed library code. Use Playwright `*.spec.ts` tests for user-visible flows and route behavior. When editing public copy, navigation, or crawlable pages, update route-smoke or crawlability checks in the same change. Run at least `npm test` plus the narrow command covering the touched surface before handoff.

## Commit and pull-request conventions

Use short imperative commit subjects and keep commits scoped to one behavior change. Pull requests should include a clear summary, verification commands, linked issue or source document when applicable, screenshots for UI changes, and explicit notes for Supabase migrations, environment variables, Stripe behavior, or production gates.

## Security and configuration

Start from `.env.example`; do not commit `.env.local`, service-role keys, Stripe secrets, webhook secrets, or Resend keys. Preserve the application's privacy-first boundaries: broad public previews are allowed, but exact wishes, identities, sensitive evidence, and automated contact require the consent and disclosure checks already modeled in the code.

## Research and artifact continuity

For MPGF, group-buying, or browser-assisted research loops:

- Locate and read the newest exact specification or numbered artifact before starting.
- Do not assume an earlier local file is the newest version merely because it is present in the workspace.
- Resume a partially completed loop only from a verified saved state; do not duplicate earlier prompt submissions or infer missing responses.
- Preserve the full requested objective across interruptions rather than redefining success around the completed subset.

## Questions to recheck when relevant

- Whether current production still has any historical Supabase/runtime errors.
- Whether funding flows have complete and deployed ledger, charge, refund, custody, and payout support.
- Whether protected Preview and Production deployments map to the intended branches and environments.
- Whether the newest MPGF and group-buying research artifacts have been obtained and fully processed.
