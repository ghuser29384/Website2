# Repository Guidelines

## Moral Trade Design Intent Clarification

For Moral Trade, ask for clarification before implementing when design intent is unclear and the ambiguity could cause path-dependent product or mechanism errors.

Ask first if:

- the requested design could be interpreted as adding a new feature family rather than improving the current rendered UI;
- the instruction references 美团 / 淘宝 / 大众点评 screenshots and it is unclear whether the image is a strict visual target, layout-density target, interaction reference, or only conceptual inspiration;
- the requested design affects pledge funding, moral public goods, commitment flows, payments, reviews, evidence, verification, refunds, releases, or receipt atoms;
- the intended implementation state is unclear: live-backed, preview-only, SafeState/off-state, route-safe only, or future-work only;
- the change might weaken truthfulness, privacy, anti-coercion, no-fake-state, no-fake-counts, no-fake-urgency, or v72 receipt-atom rules;
- the requested change may conflict with v72, this AGENTS.md, Supabase/RLS constraints, GitHub branch/PR state, Vercel deployment behavior, or production safety.

When asking, give 2–4 concrete interpretations and a default recommendation.

Example:

“I see two plausible intents:

A. make this a strict visual match to the screenshot;  
B. use the screenshot only for interaction structure.

Default would be A because you asked for the site to look more like the screenshot. Which intent should I follow?”

For small, reversible ambiguity that does not affect architecture, safety, state ownership, payment/auth/database behavior, or major UX direction, proceed with the most conservative v72-compatible assumption and state that assumption in the final report.

## Project Structure & Module Organization

This is a Next.js App Router TypeScript app. Route pages and handlers live in `src/app/`, reusable UI in `src/components/`, and shared domain logic in `src/lib/`, including `src/lib/moral-trade/` and `src/lib/mpgf/`. Supabase clients and generated types are in `src/lib/supabase/`. Database schema and migrations live under `supabase/`, public assets under `public/`, scripts under `scripts/`, Playwright specs under `tests/`, and docs under `docs/`. Keep source-adjacent tests as `src/**/*.test.ts`.

## Build, Test, and Development Commands

- `npm install`: install dependencies; Node `>=20.9.0` is required.
- `npm run dev`: start the local Next.js dev server with webpack.
- `npm run build`: create a production build.
- `npm run start`: serve the built app locally.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run Node test-runner tests in `src/**/*.test.ts`.
- `npm run test:e2e`: run Playwright specs in `tests/`.
- `npm run measure:routes` and `npm run verify:crawlability`: validate public route and crawlability baselines.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Match the existing 2-space indentation and concise module style. Name route folders and files with lowercase kebab-case, for example `background-networking/page.tsx` or `public-goods-api.ts`. Export React components in PascalCase and helpers in camelCase. Keep server-only Supabase or Stripe code out of client components, and prefer typed helpers in `src/lib/` over duplicating logic in pages.

## Testing Guidelines

Add focused `*.test.ts` coverage beside changed library code. Use Playwright `*.spec.ts` tests for user-visible flows and route behavior. When editing public copy, navigation, or crawlable pages, update the route smoke or crawlability checks in the same change. Run at least `npm test` plus the narrow command that covers the touched surface before handing off.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects such as `Gate OAuth providers by deployment config` and `Require unique CRECM fee quote allocation keys`. Keep commits scoped to one behavior change. Pull requests should include a clear summary, verification commands, linked issue or source doc when applicable, screenshots for UI changes, and explicit notes for Supabase migrations, env vars, Stripe behavior, or production gates.

## Security & Configuration Tips

Start from `.env.example`; do not commit `.env.local`, service-role keys, Stripe secrets, webhook secrets, or Resend keys. Preserve the app's privacy-first boundaries: broad public previews are allowed, but exact wishes, identities, sensitive evidence, and automated contact require the consent and disclosure checks already modeled in the code.
