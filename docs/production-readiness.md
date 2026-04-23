# Production Readiness Checklist

This app now has scaffolding for payments, email, admin review, and scheduled jobs, but several items still require external configuration before relying on them in production.

## Required Vercel environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PLATFORM_FEE_BPS`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`
- `ADMIN_EMAILS`

## Required external setup

- Apply `supabase/schema.sql` or the files in `supabase/migrations` before deploying code that reads new tables.
- Configure Stripe Connect and the Stripe webhook endpoint at `/api/stripe/webhook`.
- Configure Resend DNS and sender identity for `EMAIL_FROM`.
- Add at least one comma-separated operator email to `ADMIN_EMAILS`.
- Confirm Vercel Cron is enabled for `/api/jobs/email`, `/api/jobs/payment-reminders`, `/api/jobs/saved-searches`, and `/api/jobs/delegates`.

## Current operational model

- Stripe Checkout creates one payment at a time.
- Recurring cadence is implemented as reminder schedules, not automatic card charging.
- Refunds and disputes are recorded in the app, but Stripe-side refunds, chargebacks, and legal disputes still require Stripe/operator handling.
- The admin page is a review console, not a full moderation back office.
- Matching is still rule-based and database-backed. There is no AI or vector search yet.
- Saved searches are scanned by cron with simple cause/token matching and score thresholds.
- Personal delegates are durable non-AI preference/search configurations. The delegate cron records helper-run coverage, low-confidence synthesis signals, and missing-strategy signals; it does not import external data or introduce users automatically.
- Source connections are consent and scope records only. Social, email, calendar, chatbot, and search-profile ingestion still require separate provider integrations and privacy review.
- `/api/profile/export` provides a portable authenticated export of the signed-in user's profile, wishes, delegate settings, grants, bounties, collectives, and helper records.
- `/api/wish-registry/search` exposes only broad wish-profile previews. Exact wishes, asks, constraints, contact details, and source records remain behind profile ownership, grants, and RLS.
- Brokerage bounties are pledge-like willingness-to-pay records. They are not automatic brokerage fees, escrow, invoices, or Stripe charges.
- Collective records support basic group identity and owner/member rows, but institutional verification and delegated authority review remain operator processes.
