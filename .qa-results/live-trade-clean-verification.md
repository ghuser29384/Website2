# Clean authenticated Trade Feed verification

- Result: **FAIL**
- Candidate: `9a855a8d6d67f20a4fb7757592ef232b719d569f`
- Baseline: `c42d07797554958074945547ec121ab922cebc61`
- Recorded: `2026-07-27T13:07:48Z`

| Gate | Status |
|---|---:|
| JavaScript syntax | 0 |
| Focused contract tests | 0 |
| Focused ESLint | 0 |
| Full tests versus main baseline | 1 |
| Full lint versus main baseline | 0 |
| Production build | 0 |
| Targeted Playwright on /#trade | 1 |
| git diff --check | 0 |

## Full-test comparison
```text
baseline_test_count=788
candidate_test_count=788
baseline_fail_count=54
candidate_fail_count=54
unexpected_failure_count=1
resolved_baseline_failure_count=1
unexpected 1x /home/runner/work/Website2/Website2/candidate/src/lib/crawlability.test.ts
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
  duration_ms: 1.545396
  ...
# Subtest: Trade reads the one authenticated Feed snapshot and never creates a second exposure
ok 2 - Trade reads the one authenticated Feed snapshot and never creates a second exposure
  ---
  duration_ms: 0.325412
  ...
# Subtest: Trade and Feed DOM nodes preserve exact Feed item and receipt identity
ok 3 - Trade and Feed DOM nodes preserve exact Feed item and receipt identity
  ---
  duration_ms: 1.007473
  ...
# Subtest: malformed, signed-out, incomplete, unavailable, and zero-data states fail closed
ok 4 - malformed, signed-out, incomplete, unavailable, and zero-data states fail closed
  ---
  duration_ms: 0.435308
  ...
# Subtest: the responsive Trade Feed adapter does not depend on fixed desktop widths
ok 5 - the responsive Trade Feed adapter does not depend on fixed desktop widths
  ---
  duration_ms: 0.199181
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 327.722384
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
    [2m      Evidence Public receipt and counterparty confirmationTiming Complete within 30 days[22m
    [2m      AI safetyComplete the requested action[22m
    [2m      Review proposal →[22m
    [2m    "[22m


      299 |       await expect(cardA).toContainText("Avery N.");
      300 |       await expect(cardA).toContainText("Prepare three plant-based meals");
    > 301 |       await expect(cardB).toContainText("Jordan K.");
          |                           ^
      302 |       await expect(cardB).toContainText("Review one bounded evaluation brief");
      303 |       await expect(userA.page.locator('[data-feed-item-id="ai-opportunity"]')).toHaveCount(0);
      304 |       await expect(userB.page.locator('[data-feed-item-id="animal-opportunity"]')).toHaveCount(0);
        at /home/runner/work/Website2/Website2/candidate/tests/exact-live-trade-feed.spec.ts:301:27

    Error Context: test-results/exact-live-trade-feed-desk-579ea-act-Feed-cards-and-receipts/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/exact-live-trade-feed-desk-579ea-act-Feed-cards-and-receipts/trace.zip
    Usage:

        npx playwright show-trace test-results/exact-live-trade-feed-desk-579ea-act-Feed-cards-and-receipts/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) tests/exact-live-trade-feed.spec.ts:245:7 › narrow mobile: two users receive different exact Feed cards and receipts 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed

    Locator: locator('[data-mt-live-trade-feed="ready"] [data-feed-item-id="ai-opportunity"]')
    Timeout: 5000ms
    [32m- Expected substring  -  1[39m
    [31m+ Received string     + 14[39m

    [32m- Jordan K.[39m
    [31m+[39m
    [31m+       Potential matchView all[39m
    [31m+       84%[39m
    [31m+       Ellen Sun[39m
    [31m+       Direct match · Moral trade[39m
    [31m+       Direct reciprocal match for your AI safety priority[39m
    [31m+ [43m      [49m[39m
    [31m+         You would doReview one bounded evaluation brief[39m
    [31m+         This advancesFund technical AI-safety evaluation work[39m
    [31m+ [43m      [49m[39m
    [31m+       Evidence Public receipt and counterparty confirmationTiming Complete within 30 days[39m
    [31m+       AI safetyComplete the requested action[39m
    [31m+       Review proposal →[39m
    [31m+ [43m    [49m[39m

    Call log:
    [2m  - Expect "toContainText" with timeout 5000ms[22m
    [2m  - waiting for locator('[data-mt-live-trade-feed="ready"] [data-feed-item-id="ai-opportunity"]')[22m
    [2m    14 × locator resolved to <section data-opportunity-type="offer" data-feed-item-id="ai-opportunity" data-opportunity-id="ai-opportunity" data-feed-item-key="offer:ai-opportunity" data-exposure-request-id="receipt-user-b" class="panel matchcard mt-trade-feed-card">…</section>[22m
    [2m       - unexpected value "[22m
    [2m      Potential matchView all[22m
    [2m      84%[22m
    [2m      Ellen Sun[22m
    [2m      Direct match · Moral trade[22m
    [2m      Direct reciprocal match for your AI safety priority[22m
    [2m      [22m
    [2m        You would doReview one bounded evaluation brief[22m
    [2m        This advancesFund technical AI-safety evaluation work[22m
    [2m      [22m
    [2m      Evidence Public receipt and counterparty confirmationTiming Complete within 30 days[22m
    [2m      AI safetyComplete the requested action[22m
    [2m      Review proposal →[22m
    [2m    "[22m


      299 |       await expect(cardA).toContainText("Avery N.");
      300 |       await expect(cardA).toContainText("Prepare three plant-based meals");
    > 301 |       await expect(cardB).toContainText("Jordan K.");
          |                           ^
      302 |       await expect(cardB).toContainText("Review one bounded evaluation brief");
      303 |       await expect(userA.page.locator('[data-feed-item-id="ai-opportunity"]')).toHaveCount(0);
      304 |       await expect(userB.page.locator('[data-feed-item-id="animal-opportunity"]')).toHaveCount(0);
        at /home/runner/work/Website2/Website2/candidate/tests/exact-live-trade-feed.spec.ts:301:27

    Error Context: test-results/exact-live-trade-feed-narr-e98ad-act-Feed-cards-and-receipts/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/exact-live-trade-feed-narr-e98ad-act-Feed-cards-and-receipts/trace.zip
    Usage:

        npx playwright show-trace test-results/exact-live-trade-feed-narr-e98ad-act-Feed-cards-and-receipts/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  3) tests/exact-live-trade-feed.spec.ts:322:7 › narrow mobile: a zero-data user receives an explicit empty state and no demo records 

    Error: [2mexpect([22m[31mreceived[39m[2m).[22mtoBeLessThanOrEqual[2m([22m[32mexpected[39m[2m)[22m

    Expected: <= [32m1[39m
    Received:    [31m254[39m

      344 |           () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      345 |         );
    > 346 |         expect(overflow).toBeLessThanOrEqual(1);
          |                          ^
      347 |       }
      348 |     } finally {
      349 |       await user.context.close();
        at /home/runner/work/Website2/Website2/candidate/tests/exact-live-trade-feed.spec.ts:346:26

    Error Context: test-results/exact-live-trade-feed-narr-d2c02-y-state-and-no-demo-records/error-context.md

    attachment #2: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/exact-live-trade-feed-narr-d2c02-y-state-and-no-demo-records/trace.zip
    Usage:

        npx playwright show-trace test-results/exact-live-trade-feed-narr-d2c02-y-state-and-no-demo-records/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  3 failed
    tests/exact-live-trade-feed.spec.ts:245:7 › desktop: two users receive different exact Feed cards and receipts 
    tests/exact-live-trade-feed.spec.ts:245:7 › narrow mobile: two users receive different exact Feed cards and receipts 
    tests/exact-live-trade-feed.spec.ts:322:7 › narrow mobile: a zero-data user receives an explicit empty state and no demo records 
  2 passed (21.2s)
```

## diff-check
```text
```
