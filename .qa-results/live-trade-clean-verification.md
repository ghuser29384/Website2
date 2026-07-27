# Clean authenticated Trade Feed verification

- Result: **PASS**
- Candidate: `71480c03739f063a9725a4eb5c15e507b2cd0617`
- Baseline: `c42d07797554958074945547ec121ab922cebc61`
- Recorded: `2026-07-27T13:41:27Z`

| Gate | Status |
|---|---:|
| JavaScript syntax | 0 |
| Focused contract tests | 0 |
| Focused ESLint | 0 |
| Full tests versus main baseline | 0 |
| Full lint versus main baseline | 0 |
| Production build | 0 |
| Targeted Playwright on /#trade | 0 |
| git diff --check | 0 |

## Full-test comparison
```text
baseline_test_count=788
candidate_test_count=788
baseline_fail_count=54
candidate_fail_count=54
unexpected_failure_count=0
resolved_baseline_failure_count=0
```

## Full-lint comparison
```text
baseline_error_count=3
candidate_error_count=3
unexpected_error_count=0
resolved_baseline_error_count=0
```

## javascript-syntax
```text
```

## focused-tests
```text
TAP version 13
# Subtest: the delivered Trade builder removes the screenshot demo sidebar before first render
ok 1 - the delivered Trade builder removes the screenshot demo sidebar before first render
  ---
  duration_ms: 1.475114
  ...
# Subtest: Trade reads the one authenticated Feed snapshot and never creates a second exposure
ok 2 - Trade reads the one authenticated Feed snapshot and never creates a second exposure
  ---
  duration_ms: 0.329848
  ...
# Subtest: Trade and Feed DOM nodes preserve exact Feed item and receipt identity
ok 3 - Trade and Feed DOM nodes preserve exact Feed item and receipt identity
  ---
  duration_ms: 0.980587
  ...
# Subtest: malformed, signed-out, incomplete, unavailable, and zero-data states fail closed
ok 4 - malformed, signed-out, incomplete, unavailable, and zero-data states fail closed
  ---
  duration_ms: 0.44838
  ...
# Subtest: the responsive Trade surface stays within narrow mobile bounds
ok 5 - the responsive Trade surface stays within narrow mobile bounds
  ---
  duration_ms: 0.254527
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 326.660861
```

## focused-lint
```text
```

## build
```text
├ ƒ /contact
├ ƒ /create
├ ƒ /credibility
├ ƒ /dashboard
├ ƒ /donate
├ ƒ /donate/confirm
├ ƒ /donation-offsets
├ ƒ /donation-offsets/conditional
├ ƒ /donation-offsets/payments
├ ƒ /evidence/[[...recordId]]
├ ƒ /faq
├ ƒ /friend-testimonials/[inviteToken]
├ ● /funding-rounds/[roundId]
│ ├ /funding-rounds/vegetarian-week-micro-assurance-preview
│ └ /funding-rounds/vegetarian-week-capped-cohort-preview
├ ƒ /guest-witness/[inviteToken]
├ ○ /how-it-works
├ ƒ /invitations/[token]
├ ƒ /invite
├ ○ /labs/at-least-tier-platform-match
├ ƒ /labs/at-least-tier-platform-match/[roundSlug]
├ ƒ /labs/at-least-tier-platform-match/[roundSlug]/commit
├ ƒ /labs/moral-public-goods/[poolSlug]
├ ○ /labs/refund-bonus-pledge-pool
├ ƒ /labs/refund-bonus-pledge-pool/[roundSlug]
├ ƒ /labs/refund-bonus-pledge-pool/[roundSlug]/amount
├ ƒ /labs/refund-bonus-pledge-pool/[roundSlug]/review
├ ƒ /login
├ ○ /manifest.webmanifest
├ ƒ /measurement
├ ƒ /messages
├ ƒ /messages/[threadId]
├ ƒ /methodology
├ ƒ /moral-goods-group-buying
├ ƒ /moral-trade
├ ƒ /moral-trade/technical-spec
├ ƒ /mpgf
├ ƒ /mpgf/about
├ ƒ /mpgf/account/contributions
├ ƒ /mpgf/admin
├ ƒ /mpgf/admin/[section]
├ ƒ /mpgf/ballot/[cycleId]
├ ƒ /mpgf/campaigns/[campaignId]
├ ƒ /mpgf/contribute
├ ƒ /mpgf/contribute/cancel
├ ƒ /mpgf/contribute/every-org/pending
├ ƒ /mpgf/contribute/success
├ ƒ /mpgf/cycles/[cycleId]
├ ƒ /mpgf/governance
├ ƒ /mpgf/metrics
├ ƒ /mpgf/pools
├ ƒ /mpgf/pools/[poolId]
├ ƒ /mpgf/pools/new
├ ƒ /mpgf/real-money-terms
├ ƒ /mpgf/rounds/[roundId]
├ ƒ /mpgf/technical-spec
├ ƒ /offers
├ ƒ /offers/[offerId]
├ ƒ /offers/[offerId]/credibility
├ ƒ /offers/examples/[exampleId]
├ ƒ /offers/new
├ ○ /offers/plane
├ ƒ /offsets
├ ƒ /onboarding
├ ƒ /paid-action-offers
├ ƒ /password-reset
├ ƒ /password-update
├ ƒ /people
├ ƒ /people/[profileId]
├ ƒ /people/[profileId]/credibility
├ ○ /pilot
├ ƒ /pilot-updates
├ ƒ /pledge-swaps
├ ƒ /pools
├ ○ /pools/radar
├ ƒ /priority-correction-fund
├ ƒ /privacy
├ ƒ /profile
├ ƒ /profile/priorities
├ ƒ /projects
├ ƒ /public-goods-fund
├ ƒ /reasoning-center
├ ƒ /reasoning-standards
├ ƒ /redirects/[receiptId]
├ ƒ /redirects/-/opengraph-image
├ ƒ /research
├ ○ /robots.txt
├ ƒ /safety
├ ƒ /saved-offers
├ ƒ /schemas/moral-trade/[schema]
├ ƒ /signup
├ ○ /sitemap.xml
├ ƒ /sources
├ ƒ /start
├ ƒ /status
├ ƒ /support
├ ƒ /team
├ ƒ /team-and-governance
├ ƒ /terms
├ ƒ /trade-agreements/[agreementId]
├ ○ /trade-controls
├ ƒ /trades/[offerId]/invite
├ ƒ /trades/[offerId]/manage
├ ƒ /trades/new
├ ƒ /transparency
├ ○ /trust
├ ƒ /updates
├ ƒ /validation
├ ○ /walkthrough
├ ƒ /what-is-moral-trade
├ ƒ /wish-registry
└ ƒ /worked-examples


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

```

## playwright
```text

Running 5 tests using 1 worker
·····
  5 passed (9.9s)
```

## diff-check
```text
```
