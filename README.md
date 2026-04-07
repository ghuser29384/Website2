# Moral Trade

Minimal Next.js web app for Moral Trade. The homepage keeps the existing prototype design and local demo behavior, while the app now includes Supabase-backed auth, offer creation, offer browsing, interest capture, and a simple member dashboard.

The product currently supports three offer modes: personal pledge swaps, donation offsets, and paid action offers.

## Stack

- Next.js App Router
- React
- TypeScript
- Supabase SSR helpers via `@supabase/ssr`
- Supabase Auth and Postgres

## Routes

- `/` preserved homepage with the existing Moral Trade prototype UI and local browser storage
- `/signup` email/password signup page
- `/login` email/password login page
- `/offers` live offer directory
- `/offers/new` authenticated offer creation page
- `/offers/[offerId]` live offer detail page with interest form
- `/dashboard` authenticated dashboard showing your offers and interests

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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Apply the database schema from [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.

5. Start the development server.

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## Database schema

[`supabase/schema.sql`](supabase/schema.sql) creates the core data model for:

- `public.users`
- `public.offers`
- `public.interests`
- `public.agreements`

It also sets up enum types, indexes, update triggers, auth-to-profile sync, and row-level security policies.

## Supabase integration

The live app uses:

- `src/app/actions.ts` for signup, login, logout, offer creation, and interest submission
- `src/lib/app-data.ts` for server-side reads used by offers and dashboard routes
- `src/lib/supabase/browser.ts` for browser clients
- `src/lib/supabase/server.ts` for server clients
- `src/lib/supabase/proxy.ts` and `proxy.ts` for auth session refresh

The homepage still works without Supabase so the original prototype remains usable. The auth, offer, interest, and dashboard flows require the environment variables and SQL schema above.

## Implemented flows

- email/password signup
- email/password login
- create offer
- list offers
- view offer
- express interest
- dashboard showing your own offers and interests
- three offer modes: pledge swap, donation offset, and paid action offer

## Notes

- The homepage offer board remains client-side so the original demo stays intact.
- The authenticated routes use the same visual system as the homepage rather than default framework scaffolding.
- The next logical extension is turning `agreements` into a real user-facing workflow.
