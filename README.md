# Moral Trade

Minimal Next.js web app for Moral Trade. The homepage keeps the existing prototype design and local demo behavior, while the app now includes Supabase-backed auth, offer creation, offer browsing, interest capture, a member dashboard, and a non-AI background networking prototype.

The product currently supports three offer modes: personal pledge swaps, donation offsets, and paid action offers. It also supports explicit wish profiles, broad public previews, consent-gated match suggestions, manual source notes, and rule-based background scans without automatic social, email, chatbot, or AI ingestion.

## Stack

- Next.js App Router
- React
- TypeScript
- Supabase SSR helpers via `@supabase/ssr`
- Supabase Auth and Postgres
- Stripe Checkout and Connect for payment-mediated agreements

## Routes

- `/` preserved homepage with the existing Moral Trade prototype UI and local browser storage
- `/signup` unified account creation page with email and deployment-enabled OAuth options
- `/login` unified login page with email and deployment-enabled OAuth options
- `/offers` live offer directory
- `/offers/new` authenticated offer creation page
- `/offers/[offerId]` live offer detail page with interest form
- `/wish-registry` broad wish-profile preview search page
- `/dashboard` authenticated dashboard showing your offers and interests
- `/agreements/[agreementId]` authenticated agreement record with payments, schedules, evidence, disputes, and ratings
- `/admin` operator review console gated by `ADMIN_EMAILS`
- `/terms`, `/privacy`, `/safety`, and `/methodology` public institutional pages
- `/api/stripe/webhook` Stripe webhook endpoint for payment status updates
- `/api/jobs/email` cron endpoint for queued email delivery through Resend
- `/api/jobs/payment-reminders` cron endpoint for scheduled payment reminders
- `/api/jobs/saved-searches` cron endpoint for non-AI saved-search matching
- `/api/jobs/delegates` cron endpoint for non-AI personal delegate heartbeats
- `/api/profile/export` authenticated portable wish-profile export
- `/api/profile/import` authenticated import endpoint for portable wish-profile records
- `/api/profile/schema` JSON description of the portable import/export surface
- `/api/wish-registry/search` broad semi-private wish registry search endpoint for integrations

## Project structure

```text
src/
  app/
    actions.ts
    auth/confirm/route.ts
    dashboard/page.tsx
    login/page.tsx
    offers/page.tsx
    offers/[offerId]/page.tsx
    offers/new/page.tsx
    signup/page.tsx
    page.tsx
    globals.css
  components/
    home/
    layout/
  lib/
    app-data.ts
    form-state.ts
    offers.ts
    paths.ts
    supabase/
      browser.ts
      config.ts
      database.types.ts
      proxy.ts
      server.ts
supabase/
  schema.sql
proxy.ts
```

## Setup

Official Next.js docs currently require Node.js `20.9.0` or newer for the App Router workflow.

1. Install dependencies.

```bash
npm install
```

2. Create local environment variables.

```bash
cp .env.example .env.local
```

3. Add your Supabase values to `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_FEE_BPS=0
MPGF_REAL_MONEY_ENABLED=false
MPGF_REAL_MONEY_ACCEPTANCE_ENABLED=false
MPGF_TEST_PAYMENT_ENABLED=false
MPGF_MANUAL_EVIDENCE_PROVIDER_LABEL=Open Collective
NEXT_PUBLIC_MPGF_EXTERNAL_PAYMENT_URL=
RESEND_API_KEY=re_...
EMAIL_FROM="Moral Trade <notifications@moraltrade.org>"
CRON_SECRET=long-random-secret
ADMIN_EMAILS=operator@example.com
```

For Google and Apple sign-in, enable those providers in Supabase Auth and keep the
provider client IDs/secrets in the Supabase dashboard rather than in this app. The
app reads Supabase Auth's public provider settings, hides disabled OAuth providers,
and rejects disabled provider submissions before starting OAuth. Add
`NEXT_PUBLIC_SITE_URL/auth/confirm` to the allowed redirect URLs for each deployment
and to the provider console configuration. For local development with the sample
`NEXT_PUBLIC_SITE_URL`, the redirect URL is `http://localhost:3000/auth/confirm`.

4. Apply the database schema from [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.

If your project was created before `public.profiles` existed, you can still apply [`supabase/profiles.sql`](supabase/profiles.sql) first, but the current app expects the full updated [`supabase/schema.sql`](supabase/schema.sql) afterward.

Re-running the current schema is the intended repair step for older deployments. It backfills `public.profiles`, recreates the current foreign keys, and aligns `offers`, `interests`, and `agreements` with the current app code.

For MPGF real-money Checkout/Billing, apply the MPGF migrations in timestamp order through the Supabase SQL editor, including [`supabase/migrations/20260513_mpgf_participant_workflow.sql`](supabase/migrations/20260513_mpgf_participant_workflow.sql) and [`supabase/migrations/20260515_mpgf_real_money_checkout.sql`](supabase/migrations/20260515_mpgf_real_money_checkout.sql). Production Stripe acceptance remains blocked until `MPGF_REAL_MONEY_ENABLED`, `MPGF_REAL_MONEY_ACCEPTANCE_ENABLED`, Stripe keys, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and every relevant `mpgf_real_money_gate_status` row are configured and approved.

For manual Open Collective or fiscal-host evidence intake, also apply [`supabase/migrations/20260516_mpgf_manual_external_payment_evidence.sql`](supabase/migrations/20260516_mpgf_manual_external_payment_evidence.sql). Signed-in participants can submit manual evidence as soon as Supabase Auth is configured and the manual evidence table exists; the submit path uses the participant session and RLS, not `SUPABASE_SERVICE_ROLE_KEY`. `MPGF_MANUAL_EVIDENCE_PROVIDER_LABEL` and `NEXT_PUBLIC_MPGF_EXTERNAL_PAYMENT_URL` only control the displayed external destination link; they do not gate submission. Submitted manual evidence is review state only; it is not verified contribution accounting until review marks it verified.

For pool reasoning drafts, apply [`supabase/migrations/20260516_mpgf_pool_reasoning_fields.sql`](supabase/migrations/20260516_mpgf_pool_reasoning_fields.sql) after the participant workflow migration. It adds the Build Instruction proposal fields for cause area, funding bounds, outcome/output units, effect-vs-funding reasoning, timeline, milestones, risks, misuse pathways, and recipient or implementing-team information.

5. Start the development server.

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## Database schema

[`supabase/schema.sql`](supabase/schema.sql) creates the core data model for:

- `public.profiles`
- `public.offers`
- `public.interests`
- `public.agreements`
- `public.profile_payment_accounts`
- `public.agreement_payments`
- `public.agreement_payment_schedules`
- `public.agreement_events`
- `public.email_outbox`
- `public.saved_searches`
- `public.personal_delegates`
- `public.source_connections`
- `public.profile_syntheses`
- `public.helper_strategies`
- `public.helper_runs`
- `public.match_introduction_plans`
- `public.privacy_grants`
- `public.risk_signals`
- `public.brokerage_bounties`
- `public.collectives`
- `public.collective_members`

Important: the current app is centered on `public.profiles`.

- `public.profiles` is the account table used by the viewer/dashboard code.
- `offers.owner_id`, `interests.user_id`, and `agreements.proposer_id` / `agreements.responder_id` are keyed directly to profile ids, which match `auth.users.id`.

The full schema also sets up enum types, indexes, update triggers, auth-to-profile sync, backfills from `auth.users`, and row-level security policies.

The background networking model is intentionally narrow for now:

- participants manually state wishes, asks, capabilities, and constraints
- broad previews can be searched while exact wishes stay private
- scans are rule-based, not AI-generated
- identities and sensitive details are revealed only through mutual consent
- source connections are consent records only; the app does not ingest external accounts
- deterministic synthesis summarizes user-entered data, manual excerpts, source snapshots, and structured constraints without LLM processing
- personal delegates run scheduled helper strategies that can surface deterministic hits, draft outreach targets, and open review signals without autonomous AI
- privacy grants record field-level sharing decisions for staged introductions, notes, and expirations
- collectives can open lightweight decision records and member responses for approvals without needing a separate human moderator workflow

## Supabase integration

The live app uses:

- `src/app/actions.ts` for signup, login, logout, offer creation, and interest submission
- `src/lib/app-data.ts` for server-side reads used by offers and dashboard routes
- `src/lib/supabase/browser.ts` for browser clients
- `src/lib/supabase/server.ts` for server clients
- `src/lib/supabase/proxy.ts` and `proxy.ts` for auth session refresh

The homepage still works without Supabase so the original prototype remains usable. The auth, offer, interest, and dashboard flows require the environment variables and SQL schema above.

## Implemented flows

- deployment-enabled Google and Apple OAuth login/signup through Supabase Auth
- email/password signup
- email/password login
- create offer
- list offers
- view offer
- express interest
- dashboard showing your own offers and interests
- three offer modes: pledge swap, donation offset, and paid action offer
- Stripe Connect onboarding for users who want to receive payments
- Stripe Checkout for agreement-linked payments
- agreement-level payment reminder schedules for daily, monthly, yearly, and custom-day cadences
- agreement event logs for counterproposals, evidence, cancellations, and disputes
- queued notification records delivered by `/api/jobs/email` when Resend is configured
- `/admin` review queues for match reports, payment review, lifecycle problems, email, and safety-flagged wish profiles
- non-AI saved-search background scans through `/api/jobs/saved-searches`
- non-AI personal delegates with durable goals, helper strategies, source consent records, deterministic synthesis, staged privacy grants, introduction plans, risk signals, brokerage bounties, and collective records
- browsable wish registry search for broad previews without exposing exact wishes, asks, private sources, or contact details

## Operations

The operational checklist is in [`docs/production-readiness.md`](docs/production-readiness.md). Apply schema changes before deploying, configure Vercel env vars, and verify Vercel Cron can call the job endpoints. For existing deployments, apply [`supabase/migrations/20260422_background_networking_non_ai.sql`](supabase/migrations/20260422_background_networking_non_ai.sql) after the earlier app schema migrations.

The accessibility and mobile test checklist is in [`docs/accessibility-checklist.md`](docs/accessibility-checklist.md). Use it for the first-visit interview, dashboard, agreements, payments, and admin flows.

## Notes

- The homepage offer board remains client-side so the original demo stays intact.
- The authenticated routes use the same visual system as the homepage rather than default framework scaffolding.
- Stripe payments are not legal escrow. They are payment records and payout routing through Stripe Connect.
- Recurring payments are reminder schedules, not automatic card charges or legally binding invoices.
