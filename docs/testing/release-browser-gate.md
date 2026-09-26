# Release browser-gate contract

The Vercel release workflow runs `npm run test:e2e:release`. This is the credential-free browser contract for the current product. It uses one Playwright worker in CI because every test shares one Next.js development server; serial execution prevents unrelated route compilations and navigations from aborting one another's asset requests.

The release configuration explicitly excludes `feed-create-phase1-authenticated.spec.ts`. That test remains enforced by `.github/workflows/feed-create-phase1-release-qa.yml`, which creates isolated QA identities, database fixtures, and a short-lived password before running the authenticated browser flow.

The release configuration also excludes browser specifications for interfaces deliberately superseded by the unified Create route and current live-home workspace: the former account drawer, legacy Trade composer and autocomplete palette, inline itinerary editor, old Plan Resources controls, legacy template library, and prior Your Match tab. Replacement coverage remains in `create-entry-routing.spec.ts`, `create-route-workbench.spec.ts`, `input-assist-hydration.spec.ts`, `public-routes.spec.ts`, `exact-live-now-recommendations.spec.ts`, and `exact-live-route-recommendations.spec.ts`.

A browser test may leave the release contract only when the retired surface, its current replacement, and any separate credentialed workflow are named explicitly.
