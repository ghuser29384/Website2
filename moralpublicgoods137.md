# Moral Public Goods Funding Non-MVP v1.5 — Backed Refund-Bonus CGPP + At-Least-Tier Platform-Match Commitment

**Output file:** `moralpublicgoods137.md`
**Supersedes:** `moralpublicgoods136.md` **for the non-MVP moral-public-goods incentive branches**
**Does not supersede:** the current Direct Capped CGPP MVP (`moralpublicgoods135.md`) unless a later promotion decision explicitly says so
**Target:** `moraltrade.org`
**Audience:** product, engineering, payments, reviewer-ops, trust-and-safety, governance, legal/compliance
**Status:** non-MVP build/specification branch
**Primary decision:** define two non-MVP moral-public-goods incentive branches: (1) a **Backed Refund-Bonus Common Ground Pledge Pool**, and (2) an **At-Least-Tier Platform-Match Commitment** with damped odds-based reward growth. Both are disabled-by-default labs mechanisms for testing stronger free-rider mitigation than direct capped CGPP.

---

## 0. One-page decision memo

### 0.1 Decision

Build two **non-MVP, disabled-by-default moral-public-goods incentive mechanisms**:

1. **Backed Refund-Bonus Common Ground Pledge Pool**.
2. **At-Least-Tier Platform-Match Commitment**.

The refund-bonus branch remains as defined in v136:

A user chooses one reviewed moral-public-good pool, enters a maximum pledge, optionally chooses a broad viewpoint tag, reviews exact success and qualifying-failure conditions, saves a provider-confirmed payment method, and then:

```text
If the pool clears:
  the user's exact pledge is authorized and captured;
  net funds are sent to reviewed public-good projects.

If the pool fails for an eligible support-threshold reason:
  the user is charged $0;
  an eligible user receives a small backed failure-participation bonus.

If the pool is blocked, canceled for safety/legal/review reasons, or the user fails eligibility/payment/Sybil checks:
  the user is charged $0;
  no bonus is paid unless the frozen rulebook explicitly classifies the state as bonus-eligible.
```

This revision adds a non-MVP mechanism that was explicitly out of scope in `moralpublicgoods135.md`: **failure bonuses**. It does not make failure bonuses part of the live MVP, does not expose them on the primary public CGPP route, and does not permit production real-money use without a later promotion record.

This v137 revision also adds a second non-MVP mechanism: **At-Least-Tier Platform-Match Commitment**. A user chooses a reviewed public-good pool, selects an `at least Tier K` target, and states an intended contribution amount `X`. If other eligible users’ effective support reaches at least the selected tier, Moral Trade contributes a tier-specific percentage of `X` to the projects from a backed platform-match reserve and the user is charged `$0`. If other eligible users’ effective support does not reach the selected tier, the user contributes `X` to the projects and the platform contributes `$0` for that user. There is no direct user payout. Platform-match rewards always go to reviewed projects.

### 0.2 Why add these non-MVP branches

The direct capped CGPP in `moralpublicgoods135.md` mainly solves **assurance risk**: a user is not charged unless enough support joins and all gates pass. It only partially mitigates **free-riding**: a user may still prefer that others pay while they keep their own money.

A refund-bonus / dominant-assurance variant directly targets that problem by making participation valuable even in the failure state:

```text
Pledge-side incentive sketch:
E(pledge - no pledge)
= P(pivotal) * (V - x)
  - P(success anyway) * x
  + P(qualifying failure anyway) * b
```

Where:

- `x` is the pledge charged only if the pool clears;
- `b` is the backed failure-participation bonus;
- `V` is the user's value from the public good being funded.

The bonus does not automatically make contribution a dominant strategy under every real-world implementation. It increases the incentive to pledge in worlds where the user expects non-clearance and would otherwise free-ride or ignore the pool. Public copy must call it a **backed failure-participation bonus**, not an investment return, lottery, guaranteed profit, or proof of impact.

The at-least-tier platform-match branch targets a different free-riding margin: a user states what they would contribute if others do not reach a selected tier, but if other eligible effective support does reach that tier, the platform contributes a tier-specific percentage of the user's stated amount to the projects. This tests whether tiered local pivotality and platform-funded matching can motivate users to reveal conditional support without using direct user payouts. The branch uses at-least tiers only, leave-one-cluster-out resolution, effective-support accounting, and damped odds-based reward growth.

### 0.3 What changed from `moralpublicgoods136.md`

This revision preserves the v136 refund-bonus branch and adds an additional non-MVP tier-forecast incentive branch. It changes the non-MVP branch set, maturity level, and accounting model.

1. Updates file-level identifiers to `moralpublicgoods137.md` and **Non-MVP v1.5**, while preserving the v136 refund-bonus calculation version `cgpp_refund_bonus_non_mvp_v0_1`.
2. Changes deployment mode from `capped_real_money_mvp` to `refund_bonus_non_mvp_labs`.
3. Adds `RefundBonusOpenGate`, `RefundBonusReserve`, `BonusEligibilitySnapshot`, `RefundBonusPayoutOperation`, and bonus-specific settlement rows.
4. Adds a **qualifying failure** state distinct from review/safety/legal/payment failure.
5. Adds fully backed bonus-reserve requirements before any pledge can be presented as bonus-eligible.
6. Adds exact public copy for the user promise: “If this pool misses the support threshold, eligible pledgers receive a backed bonus.”
7. Adds hard blocks against bonus farming, Sybil exploitation, failure sabotage, unbacked rewards, and misleading financial-promotion copy.
8. Keeps all v135 project-review, anti-threat, privacy, sealed-progress, identity, payment, exact-authorization, recomputation, and separated-accounting safeguards.
9. Keeps the current direct capped CGPP MVP path clean: these features are hidden from primary MVP surfaces and disabled in production until separately promoted.
10. Adds `cgpp_at_least_tier_platform_match_non_mvp_v0_1` as a separate feature key.
11. Adds `at_least_tier_platform_match_live_money_enabled` as a separate live-money flag, default false everywhere.
12. Adds `AtLeastTierPlatformMatchRound`, `PublicGoodTier`, `DampedOddsRewardSchedule`, `AtLeastTierPlatformMatchCommitment`, `PlatformMatchReserve`, `AtLeastTierResolutionSnapshot`, `AtLeastTierResolutionRow`, `PlatformMatchContributionOperation`, `AtLeastTierSettlementRow`, and `AtLeastTierAuditReport`.
13. Adds a damped odds-based reward schedule with square-root odds as the default growth rule.
14. Adds leave-one-cluster-out effective-support resolution, so users cannot make their own at-least-tier forecasts true.
15. Adds a circularity guard: tier outcomes are based on eligible effective support before settlement, not on final project disbursement after losing users pay and winning platform matches are routed.

### 0.4 Credence

- **0.62** that a backed refund-bonus variant will mitigate free-riding more than v135-style direct capped CGPP among users who understand the mechanism.
- **0.55** that the added incentive improves clearing rates enough to justify a small post-MVP pilot after the direct CGPP MVP validates charge comprehension.
- **0.45** that a high-ratio example such as `$0.50 pledge → $1 failure bonus` is net-positive in an early real-money pilot; farming and compliance risks are material.
- **0.78** that the safest first real-money refund-bonus pilot should use a smaller ratio, such as `5%–25% of pledge, capped at $0.50–$2.50`, not a 200% failure bonus.
- **0.85** that this mechanism should remain non-MVP until Sybil controls, bonus reserve accounting, payment rails, copy review, and legal/compliance review are production-ready.
- **0.58** that an at-least-tier platform-match branch will improve contribution motivation relative to simple tiered CGPP among users who understand it.
- **0.70** that at-least-tier forecasts should be cumulative rather than exact-tier, because exact-tier rewards create incentives to suppress higher tiers.
- **0.76** that reward rates should grow nonlinearly with tier difficulty, using damped odds or capped geometric growth rather than linear growth by tier number.
- **0.83** that tier resolution must use other users’ eligible effective support rather than raw stated contributions, to prevent circular clearing and overstatement of expected project funding.

### 0.5 Non-MVP launch blocker

Do **not** expose refund-bonus pledging on the live public MVP route.

Production real-money refund-bonus use is blocked unless all of the following exist:

```text
1. approved FeaturePromotionRecord for cgpp_refund_bonus_non_mvp_v0_1;
2. refund_bonus_live_money_enabled == true;
3. bonus reserve fully backed and frozen;
4. legal/compliance approval for failure bonuses in supported jurisdictions;
5. payment/payout provider approval for bonus payouts;
6. identity/Sybil controls strong enough for bonus-bearing pledges;
7. copy preflight passed after latest deployment;
8. bonus exposure cap configured;
9. emergency pause configured;
10. audit/reporting templates reviewed;
11. no active stale MVP/CRECM/Common Ground Budget copy outside historical drawers.
```

Production real-money at-least-tier platform-match use is blocked unless all of the following exist:

```text
1. approved FeaturePromotionRecord for cgpp_at_least_tier_platform_match_non_mvp_v0_1;
2. at_least_tier_platform_match_live_money_enabled == true;
3. platform-match reserve fully backed and frozen;
4. legal/compliance approval for platform-funded conditional project contributions in supported jurisdictions;
5. payment provider approval for user-loss authorization/capture and platform-match project routing;
6. identity/Sybil controls strong enough for leave-one-cluster-out resolution;
7. damped odds reward schedule computed, validated, and frozen before hard commitments;
8. copy preflight passed after latest deployment;
9. reserve exposure cap configured;
10. emergency pause configured;
11. audit/reporting templates reviewed;
12. no active public copy using betting, wagering, investment, return, profit, prize, lottery, or user-payout language.
```

As active-product public copy, pages must not say:

```text
free money
profit
investment return
guaranteed return
risk-free return
lottery
cashback on donation
interest
refund with interest
bonus match impact
failure impact
you get paid if it fails, no matter why
guaranteed bonus
```

Allowed public copy must be more precise:

```text
If this pool misses its support threshold, eligible pledgers receive a backed failure-participation bonus. No bonus is paid for blocked, unsafe, ineligible, duplicate, or payment-failed pledges.

For the at-least-tier platform-match branch: If other eligible users’ effective support reaches at least your selected tier, Moral Trade contributes the displayed platform-match amount to the projects from a backed reserve, and you are charged $0. If other eligible users’ effective support does not reach your selected tier, you contribute your stated amount to the projects.
```

---

## 1. Build or experiment target

This is a **non-MVP funding mechanism build spec**. It is not the current live CGPP MVP and must not be merged into the direct capped MVP pledge path.

### 1.1 Product and technical labels

```text
Public label: Common Ground Pledge Pool with Backed Failure Bonus
Short label: Refund-Bonus Pledge Pool
Internal label: Backed Refund-Bonus CGPP Non-MVP
Spec version: moralpublicgoods137.md / Non-MVP v1.5
Calculation version: cgpp_refund_bonus_non_mvp_v0_1
Feature flag: cgpp_refund_bonus_non_mvp_v0_1
Live-money feature flag: refund_bonus_live_money_enabled
Deployment mode: refund_bonus_non_mvp_labs
Feature classification: non_mvp
Default production visibility: off
Default production money movement: off
```

Additional non-MVP branch labels:

```text
Public label: At-Least-Tier Platform Match
Short label: Tier Platform Match
Internal label: At-Least-Tier Platform-Match Commitment Non-MVP
Calculation version: at_least_tier_platform_match_v0_1
Feature flag: cgpp_at_least_tier_platform_match_non_mvp_v0_1
Live-money feature flag: at_least_tier_platform_match_live_money_enabled
Deployment mode: at_least_tier_platform_match_non_mvp_labs
Feature classification: non_mvp
Default production visibility: off
Default production money movement: off
```

### 1.2 Active non-MVP build scope

Build exactly this non-MVP branch:

```text
Pools open at once: 1 in labs/staging; 0 on live public MVP route
Projects per pool: 2–3 already reviewed projects
Participant entry: invite-only labs, then closed alpha if promoted
Participant max gross pledge: configurable; recommended labs examples below
Bonus design: backed failure-participation bonus
Bonus eligibility: only qualifying support-threshold failure unless frozen rulebook says otherwise
Bonus reserve: fully backed before pledge collection
Round duration: 7–14 days in real-money pilot; shorter in simulation
Progress disclosure: sealed qualitative status only before close
Payment method: provider-confirmed saved method required for hard pledge
Success authorization: exact just-in-time authorization after close and gates
Success capture: only after authorization reconciliation confirms the pool still clears
Failure outcome, qualifying support shortfall: no charge + eligible bonus payout
Failure outcome, nonqualifying failure: no charge + no bonus
Audit: aggregate report separating project funds, fees, sponsor match, bonus reserve, bonus liabilities, and bonus payouts
```

This v137 branch also defines a second non-MVP labs mechanism, **At-Least-Tier Platform-Match Commitment**, whose active scope is specified in section 11. It is not a refund-bonus payout, not a direct user reward, and not a direct capped CGPP MVP path. It is a platform-funded conditional match to reviewed projects, with user-loss payment only when other eligible effective support does not reach the user’s selected at-least tier.

### 1.3 Example configurations

#### 1.3.1 Demonstration configuration, not default production

```text
User-facing example:
“Pledge $0.50 to this reviewed public-good pool.
 If the pool clears, your $0.50 is charged and sent to projects after fees.
 If the pool misses the support threshold, you pay $0 and receive a backed $1 bonus.”
```

This configuration is allowed only in simulation, test, or tightly capped non-production labs unless legal/compliance and fraud controls approve it for a real-money pilot.

Required parameters:

```text
pledgeMinGrossCents: 50
pledgeMaxGrossCents: 50
bonusAmountCents: 100
bonusRatioBps: 20000
perUserBonusCapCents: 100
roundBonusExposureCapCents: explicit, backed, and frozen
bonusReserveBackingState: funded | escrowed | contractually_committed
```

#### 1.3.2 Safer first real-money pilot configuration

```text
User-facing example:
“Pledge up to $25.
 If the pool clears, your pledge is charged and sent to projects after fees.
 If the pool misses the support threshold, eligible pledgers receive a backed bonus equal to 10% of their pledge, capped at $2.50.”
```

Recommended parameters:

```text
participantMinGrossCents: 500
participantMaxGrossCents: 2500
bonusRatioBps: 1000
perUserBonusCapCents: 250
roundGrossCaptureCapCents: 100000..250000
roundBonusExposureCapCents: 10000..25000
```

### 1.4 Non-MVP invariants

The refund-bonus branch must preserve:

1. voluntary participation;
2. reviewed project registry;
3. one active reviewed pool per round;
4. pool-level net-recipient threshold;
5. pool-level verified-supporter threshold;
6. pool-level different-view support threshold;
7. fully backed bonus reserve before any bonus-eligible hard pledge opens;
8. capped bonus exposure;
9. final review before hard pledge;
10. provider-confirmed saved payment method for hard pledges;
11. no charge at payment-method save;
12. no success authorization before close and gates;
13. exact post-close just-in-time authorization for success charges;
14. authorization failure removal and recomputation before success capture;
15. qualifying-failure computation before bonus payout;
16. no bonus for ineligible, duplicate, payment-failed, Sybil, blocked, or abuse-flagged pledges;
17. separate accounting for gross, fee, net-recipient, counted, match-eligible, sponsor match, bonus reserve, bonus liability, bonus paid, and bonus unearned;
18. aggregate audit report;
19. emergency pause;
20. disabled-by-default production public exposure and real-money movement.

### 1.5 Explicitly out of scope for this non-MVP branch

Do not build in this branch:

- public real-money launch by default;
- open public pool creation;
- user-created public-good pools eligible for bonuses;
- political campaign contributions;
- campaign donations;
- lobbying trades;
- lifestyle trades;
- behavior-change promises;
- private-benefit projects;
- pay-to-stop-harm proposals;
- threat-like proposals;
- failure bonuses for safety/review/legal-blocked pools unless explicitly approved by governance;
- direct user payouts or user success rewards;
- tradable impact certificates;
- QF-like bonus scoring;
- diversity-aware bonus match;
- public moral rankings;
- public donor-level reputation rewards;
- exact pre-close progress or pivotality display;
- bonus trading, bonus assignment, or secondary markets;
- claims that the bonus is interest, investment return, lottery winnings, or charitable impact.

---

## 2. User flow

The pledge flow has exactly three decision screens:

```text
Pool → Amount → Review
```

Sign-in, identity, and payment-provider components may appear inline or as modal steps, but they must not create additional mechanism decisions.

### 2.1 Entry from moral-public-goods search

For the live MVP route, do not show this feature except in an admin/labs drawer. The primary public route remains the direct capped CGPP unless this feature is later promoted.

Labs/admin card:

```text
Refund-Bonus Pledge Pool

Non-MVP labs mechanism.
Fund reviewed public goods only if enough different-view support joins.
If the pool misses the support threshold, eligible pledgers may receive a backed failure-participation bonus.

No charge now. Exact live progress is hidden until the round closes.
Real-money use is disabled unless this mechanism is explicitly promoted.

[View labs pool details]
[Set my maximum pledge]
[How it works]
```

Rules:

- show persistent non-MVP banner;
- do not show on ordinary public MVP card stack;
- do not show above the direct capped CGPP MVP;
- do not show bonus CTA unless labs/admin access or promotion flag permits;
- technical version strings may appear only in an advanced technical drawer.

### 2.2 Screen 1 — Pool

Purpose: explain what the user is considering.

Default labs copy:

```text
Refund-Bonus Pledge Pool

This is a non-MVP labs mechanism.
Fund reviewed public goods only if enough people, including enough different-view supporters, join.

No charge now. Exact live progress is hidden until the round closes.

This pool supports:
- [Project A]
- [Project B]
- [Project C, if used]

If this pool clears:
- at least $[threshold] net reaches the projects,
- at least [N] verified supporters join,
- at least [K] different-view clusters join,
- review and challenge gates pass,
- exact payment authorization succeeds after close,
- your pledge may be charged up to your maximum.

If this pool misses the support threshold:
- eligible pledgers are charged $0,
- eligible pledgers receive a backed failure-participation bonus of [bonus rule].

No bonus is paid for blocked, unsafe, ineligible, duplicate, payment-failed, or abuse-flagged pledges.

[Set my maximum pledge]
```

Display rules:

- show project names, one-line summaries, recipient-route status, and review-state chips;
- show sponsor match as `none`, `backed`, or `not active`;
- show bonus reserve as `backed`, `not active`, or `labs simulation only`;
- do not show exact live threshold gaps;
- do not show exact supporter gaps;
- do not show exact different-view cluster gaps;
- do not show success-without-me status;
- do not show `your pledge is pivotal`;
- do not show `guaranteed bonus` without eligibility qualifications.

### 2.3 Screen 2 — Amount

Purpose: collect maximum pledge, optional broad viewpoint tag, visibility, and bonus-term acknowledgement.

Default copy:

```text
Maximum pledge

You choose the most you could be charged if the pool clears.
If the pool misses the support threshold, eligible pledgers are charged $0 and receive the backed failure-participation bonus shown below.

Maximum pledge: [$25]

Failure-participation bonus if support threshold is missed:
[10% of your pledge, capped at $2.50]

This bonus is not interest, not an investment return, not a donation receipt, not a lottery, and not public-good impact.

Optional viewpoint tag
This is not a moral score. It does not affect your power. It is used only to check whether enough different-view support joined.

[Humanitarian]
[Animal-inclusive]
[Long-run future]
[Institutional resilience]
[Public knowledge]
[Other]
[Prefer not to say]

Visibility
[Aggregate only]  (default)

[Continue]
```

Validation:

- `maxGrossCents` must be positive integer cents;
- `maxGrossCents` must be within configured participant cap;
- if fixed-pledge configuration is active, `maxGrossCents` must equal the fixed pledge amount;
- the pledge must not cause the round to exceed the gross capture cap;
- the pledge must not cause the round to exceed the bonus exposure cap;
- the bonus reserve must remain sufficient for all eligible pledge exposure after this pledge;
- visibility must default to `aggregate_only`;
- `prefer_not_to_say` counts as a verified supporter but not as a distinct different-view cluster unless the frozen rulebook explicitly says otherwise; default is **not** to count it as distinct.

### 2.4 Screen 3 — Final review and payment setup

Purpose: informed final consent and provider-confirmed payment readiness.

Default copy:

```text
Final review

You are saving a hard pledge, not making an immediate donation.

Maximum gross charge if the pool clears: $[gross]
Estimated fees if charged: $[fee]
Estimated net sent to projects if charged: $[net]
Counts toward pool threshold if all gates pass: $[net]
Failure-participation bonus if the pool misses support threshold: $[bonus]
Bonus reserve: [backed / labs simulation only]
Sponsor match: [none / backed up to $X / not active]

You are charged only if all of these are true after the round closes:
1. the pool reaches its net-recipient threshold,
2. enough verified supporters joined,
3. enough different-view support joined,
4. review and challenge gates pass,
5. sponsor match is backed if shown,
6. exact authorization succeeds,
7. the pool still clears after failed authorizations are removed.

You may receive the failure-participation bonus only if all of these are true:
1. you saved an eligible hard pledge before close,
2. your identity, payment, and Sybil checks pass,
3. the bonus reserve was backed under the frozen terms,
4. the pool fails for a bonus-eligible support-threshold reason,
5. the pool is not blocked or canceled for safety, legal, review, fraud, or threat-like reasons,
6. you have not withdrawn or been excluded under the frozen rules.

Payment language:
- saving your payment method is not a charge,
- not a hold,
- not escrow,
- not custody,
- not an authorization,
- not a guarantee that authorization will later succeed,
- not a guarantee of bonus payout outside the listed bonus-eligible failure state.

Rulebook hash: sha256:...
Fee policy hash: sha256:...
Bonus policy hash: sha256:...

[Save hard pledge]
```

The `Save hard pledge` action must atomically do all of the following or fail closed:

1. verify that `RefundBonusOpenGate.state === passed`;
2. record final review consent;
3. record fee acknowledgement;
4. record sealed-progress acknowledgement;
5. record bonus-term acknowledgement;
6. create or reference an identity snapshot;
7. create or reference a `BonusEligibilitySnapshot`;
8. invoke the payment provider to save and confirm the payment method;
9. create a provider-confirmed payment commitment snapshot;
10. reserve bonus exposure from `RefundBonusReserve` under the frozen rulebook;
11. create or update the pledge to `hard_saved` only after provider confirmation and bonus-exposure reservation.

If the payment provider returns `requires_action`, `invalid`, `detached`, or any non-confirmed state, the pledge remains incomplete and does not count toward thresholds, supporter counts, different-view cluster counts, counted dollars, match-eligible dollars, sponsor match, or bonus eligibility.

### 2.5 Outcome states

Cleared:

```text
The pool cleared.
Your card was authorized and captured for $[gross].
$[net] was sent to reviewed public-good projects after $[fee] in fees.
Failure bonus: not paid because the pool cleared.
Sponsor match added: $[match].
```

Qualifying failure:

```text
The pool did not clear.
You were charged $0.
Reason: the pool missed its support threshold.
Because your pledge was eligible under the frozen bonus rules, you will receive a backed failure-participation bonus of $[bonus].
```

Failed different-view threshold, if bonus-eligible under frozen terms:

```text
The pool did not clear.
You were charged $0.
Reason: not enough verified different-view support joined.
Because this was classified as a bonus-eligible support-threshold failure and your pledge was eligible, you will receive a backed failure-participation bonus of $[bonus].
```

Failed different-view threshold, if not bonus-eligible:

```text
The pool did not clear.
You were charged $0.
Reason: not enough verified different-view support joined.
No bonus is paid for this failure state under the frozen rules.
```

Review blocked:

```text
The pool was blocked in review.
You were charged $0.
No failure-participation bonus is paid for review-blocked pools.
Reason: [review reason category].
```

Authorization failure:

```text
The pool did not capture funds.
You were charged $0.
Reason: exact authorization did not succeed for enough eligible pledges after close.
No bonus is paid for pledges excluded by payment failure. Bonus treatment for otherwise eligible pledges follows the frozen payment-failure policy.
```

---

## 3. Data model

Implement these non-MVP data objects or adapt existing equivalents. Reuse v135 objects where possible, but do not overload direct-MVP states with refund-bonus semantics.

### 3.1 `CgppRound`

```ts
type CgppRound = {
  id: string;
  deploymentMode: 'refund_bonus_non_mvp_labs';
  featureClassification: 'non_mvp';
  status:
    | 'draft'
    | 'preflight'
    | 'labs_open'
    | 'open'
    | 'closed_to_new_pledges'
    | 'reviewing'
    | 'cleared'
    | 'qualifying_failed'
    | 'nonqualifying_failed'
    | 'authorizing'
    | 'payable'
    | 'captured'
    | 'bonus_payable'
    | 'bonus_paying'
    | 'bonus_paid'
    | 'released'
    | 'blocked'
    | 'canceled';

  activePoolId: string;

  participantMinGrossCents: number;
  participantMaxGrossCents: number;
  fixedPledgeGrossCents?: number;
  roundGrossCaptureCapCents: number;
  roundBonusExposureCapCents: number;

  opensAt: string;
  closesAt: string;
  challengeDeadlineAt: string;
  parametersFrozenAt: string;

  rulebookHash: string;
  feePolicyHash: string;
  bonusPolicyHash: string;
  calculationVersion: 'cgpp_refund_bonus_non_mvp_v0_1';

  sealedProgressMode: 'qualitative_only_before_close';

  refundBonusOpenGateId?: string;
  copyPreflightState: 'not_run' | 'passed' | 'failed';
  copyPreflightHash?: string;

  productionPublicEnabled: boolean; // default false
  productionRealMoneyEnabled: boolean; // default false
  promotionRecordId?: string;

  createdAt: string;
  updatedAt: string;
};
```

### 3.2 `RefundBonusOpenGate`

```ts
type RefundBonusOpenGate = {
  id: string;
  roundId: string;
  poolId: string;
  checkedAt: string;
  lastDeployHash: string;

  routeCopyPreflightReportId: string;
  projectReviewReady: boolean;
  bonusReserveReady: boolean;
  bonusPolicyFrozen: boolean;
  sponsorStateReady: boolean;
  capsReady: boolean;
  paymentProviderReady: boolean;
  bonusPayoutProviderReady: boolean;
  identitySybilControlsReady: boolean;
  legalComplianceReady: boolean;
  rulebookFrozen: boolean;
  feePolicyFrozen: boolean;
  sealedProgressConfigured: boolean;
  emergencyPauseConfigured: boolean;
  promotionRecordReady: boolean;

  state: 'not_run' | 'passed' | 'failed';
  failedReasonCodes: string[];
  gateHash: string;
};
```

A round cannot enter `open`, cannot create hard pledges, and cannot advertise failure bonuses unless the current `RefundBonusOpenGate.state === passed`.

In production, `promotionRecordReady` must be false until an explicit future promotion is approved; therefore the gate fails closed by default.

### 3.3 `PublicGoodProjectReviewSnapshot`

Same as v135, with one added field for bonus eligibility:

```ts
type PublicGoodProjectReviewSnapshot = {
  id: string;
  roundId: string;
  poolId: string;
  projectId: string;

  title: string;
  summary: string;
  recipientRouteRef: string;
  recipientRouteState: 'verified' | 'blocked' | 'review';

  projectScopeState: 'valid_moral_public_good' | 'blocked' | 'review';
  baselineState: 'clear' | 'blocked' | 'review';
  actionEvidenceState: 'adequate' | 'blocked' | 'review';
  antiThreatState: 'clear' | 'blocked' | 'review';
  externalityState: 'clear' | 'blocked' | 'review';
  conflictState: 'clear' | 'non_blocking' | 'blocked' | 'review';
  challengeState: 'clear' | 'non_blocking' | 'open' | 'blocking';

  qualifyingFailureBonusAllowed: boolean;
  blockedFailureBonusAllowed: false;

  prohibitsPoliticalCampaigns: true;
  prohibitsLobbyingTrades: true;
  prohibitsLifestyleTrades: true;
  prohibitsBehaviorChangePromises: true;
  prohibitsPrivateBenefitProjects: true;
  prohibitsThreatLikeProjects: true;

  reviewSnapshotHash: string;
  createdAt: string;
};
```

### 3.4 `PledgePool`

```ts
type PledgePool = {
  id: string;
  roundId: string;
  title: string;
  summary: string;

  projectIds: [string, string] | [string, string, string];
  allocationWeightsBpsByProjectId: Record<string, number>; // sums to 10000

  thresholdNetRecipientCents: number;
  minVerifiedSupporters: number;
  minDistinctViewpointClusters: number;
  minNetRecipientCentsPerSupporter: number;

  sponsorMatchEnabled: boolean;
  sponsorMatchPoolId?: string;
  sponsorMatchRatioBps: number;
  sponsorMatchCapCents: number;

  refundBonusEnabled: boolean;
  refundBonusReserveId?: string;
  bonusCalculationMode: 'fixed_cents' | 'percentage_of_pledge_capped' | 'none';
  fixedBonusCents?: number;
  bonusRatioBps?: number;
  perUserBonusCapCents: number;
  roundBonusExposureCapCents: number;
  qualifyingFailureModes: Array<
    | 'net_recipient_threshold_shortfall'
    | 'verified_supporter_threshold_shortfall'
    | 'different_view_threshold_shortfall'
  >;

  status:
    | 'draft'
    | 'labs_open'
    | 'open'
    | 'closed'
    | 'cleared'
    | 'qualifying_failed'
    | 'nonqualifying_failed'
    | 'payable'
    | 'captured'
    | 'bonus_payable'
    | 'bonus_paid'
    | 'released'
    | 'blocked'
    | 'canceled';
  rulebookHash: string;
  feePolicyHash: string;
  bonusPolicyHash: string;
  createdAt: string;
};
```

### 3.5 `RefundBonusReserve`

```ts
type RefundBonusReserve = {
  id: string;
  roundId: string;
  poolId: string;

  reserveType: 'failure_participation_bonus';
  sponsorNamePublic?: string;
  backedCents: number;
  committedCents: number;
  paidCents: number;
  releasedUnusedCents: number;
  maxExposureCents: number;

  backingState: 'funded' | 'escrowed' | 'contractually_committed' | 'unbacked' | 'dev_simulated';
  payoutProviderReady: boolean;
  legalComplianceState: 'approved' | 'review' | 'blocked';
  jurisdictionSet: string[];

  sourceHash: string;
  bonusPolicyHash: string;
  publishedAt: string;
  backingConfirmedAt: string;

  status: 'draft' | 'backed' | 'active' | 'paying' | 'paid' | 'released_unused' | 'blocked';
  createdAt: string;
  updatedAt: string;
};
```

Rules:

```text
reserve.backedCents >= reserve.maxExposureCents
reserve.backingState in {funded, escrowed, contractually_committed, dev_simulated}
reserve.legalComplianceState == approved except in dev simulation
reserve.payoutProviderReady == true except in dev simulation
```

### 3.6 `PoolPledge`

```ts
type PoolPledge = {
  id: string;
  roundId: string;
  poolId: string;
  participantId: string;

  maxGrossCents: number;
  estimatedFeeCents: number;
  estimatedNetRecipientCents: number;

  viewpointCluster:
    | 'humanitarian'
    | 'animal_inclusive'
    | 'long_run_future'
    | 'institutional_resilience'
    | 'public_knowledge'
    | 'other'
    | 'prefer_not_to_say';

  visibility: 'aggregate_only';

  pledgeState:
    | 'draft'
    | 'hard_saved'
    | 'excluded_identity'
    | 'excluded_payment'
    | 'excluded_bonus_abuse'
    | 'authorized'
    | 'captured'
    | 'released'
    | 'bonus_eligible'
    | 'bonus_ineligible'
    | 'bonus_payable'
    | 'bonus_paid'
    | 'failed'
    | 'canceled';

  paymentCommitmentSnapshotId?: string;
  identityEligibilitySnapshotId?: string;
  bonusEligibilitySnapshotId?: string;

  expectedBonusCents: number;
  bonusExposureReservedCents: number;
  bonusTermsAcknowledged: boolean;

  rulebookHashAtConsent: string;
  feePolicyHashAtConsent: string;
  bonusPolicyHashAtConsent: string;
  feeAcknowledged: boolean;
  sealedProgressAcknowledged: boolean;
  finalReviewConfirmedAt?: string;

  createdAt: string;
  updatedAt: string;
};
```

### 3.7 `BonusEligibilitySnapshot`

```ts
type BonusEligibilitySnapshot = {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;

  eligibleAtPledgeSave: boolean;
  eligibilityReasonCodes: string[];

  humanVerified: boolean;
  identityVerified: boolean;
  sybilState: 'clear' | 'review' | 'blocked';
  collusionState: 'clear' | 'review' | 'blocked';
  sameControlClusterId?: string;
  paymentClusterId?: string;
  priorBonusAbuseState: 'clear' | 'review' | 'blocked';
  jurisdictionEligibilityState: 'clear' | 'review' | 'blocked';

  bonusCalculationMode: 'fixed_cents' | 'percentage_of_pledge_capped' | 'none';
  computedBonusCents: number;
  perUserBonusCapCents: number;
  reserveId: string;
  reserveBackingStateAtSave: 'funded' | 'escrowed' | 'contractually_committed' | 'dev_simulated';

  snapshotHash: string;
  asOf: string;
};
```

### 3.8 `IdentityEligibilitySnapshot`

Same as v135, with the requirement that duplicate clusters do not receive multiple bonuses.

```ts
type IdentityEligibilitySnapshot = {
  id: string;
  roundId: string;
  participantId: string;

  humanVerified: boolean;
  identityVerified: boolean;
  sybilState: 'clear' | 'review' | 'blocked';
  collusionState: 'clear' | 'review' | 'blocked';

  sameControlClusterId?: string;
  paymentClusterId?: string;

  countingWeightBps: 0 | 10000;
  bonusEligibilityWeightBps: 0 | 10000;
  snapshotHash: string;
  asOf: string;
};
```

MVP identity weight remains binary: 0 or 10000. Do not implement partial identity weights.

### 3.9 `PaymentCommitmentSnapshot`

```ts
type PaymentCommitmentSnapshot = {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;

  paymentMethodRef: string;
  commitmentState: 'provider_confirmed' | 'requires_action' | 'invalid' | 'detached';
  savedAt: string;
  confirmedAt: string;
  asOf: string;

  supportsFutureAuthorization: boolean;
  supportsBonusPayoutMethod?: boolean;
  bonusPayoutMethodRef?: string;

  providerEvidenceHash: string;
  snapshotHash: string;
};
```

A payment commitment snapshot counts only if:

```text
commitmentState == provider_confirmed
paymentMethodRef is non-empty and trim-stable
savedAt <= confirmedAt <= asOf
asOf <= round.closesAt
providerEvidenceHash is canonical
snapshotHash is canonical
```

A bonus payout method may be separate from the saved payment method. If no bonus payout method exists by the bonus-payout deadline, the bonus remains a ledger liability and follows the frozen unclaimed-bonus policy.

### 3.10 `FeeQuote`

Same as v135:

```ts
type FeeQuote = {
  id: string;
  roundId: string;
  pledgeId: string;
  grossCents: number;
  feeCents: number;
  netRecipientCents: number;
  feePayer: 'donor' | 'waived';
  feePolicyHash: string;
  quoteHash: string;
};
```

Fees do not count toward project threshold, sponsor match, or bonus calculations unless the frozen bonus policy explicitly computes bonus from gross pledge. Default bonus calculation uses gross pledge but project threshold uses net-recipient dollars.

### 3.11 `AuthorizationAttempt`

Same as v135 for success charges. Bonus payout is separate.

```ts
type AuthorizationAttempt = {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;

  requiredGrossCents: number;
  providerAuthorizationRef?: string;
  providerCaptureRef?: string;

  authorizationState:
    | 'not_attempted'
    | 'authorized_exact'
    | 'failed'
    | 'wrong_amount'
    | 'expired_before_capture'
    | 'short_expiry'
    | 'released'
    | 'captured';

  authorizedAt?: string;
  expiresAt?: string;
  capturedAt?: string;
  releasedAt?: string;

  eventHash: string;
};
```

### 3.12 `RefundBonusPayoutOperation`

```ts
type RefundBonusPayoutOperation = {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;
  reserveId: string;

  bonusGrossCents: number;
  payoutFeeCents: number;
  bonusNetCents: number;
  currency: string;

  payoutDestinationRef?: string;
  providerPayoutRef?: string;
  payoutState:
    | 'not_attempted'
    | 'pending'
    | 'succeeded'
    | 'failed_retryable'
    | 'failed_final'
    | 'held_compliance'
    | 'unclaimed'
    | 'forfeited_under_rules'
    | 'reversed';

  idempotencyKey: string;
  eventHash: string;
  createdAt: string;
  updatedAt: string;
};
```

### 3.13 `PoolSettlementRow`

```ts
type PoolSettlementRow = {
  id: string;
  roundId: string;
  poolId: string;
  pledgeId: string;
  participantId: string;

  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;

  bonusExposureReservedCents: number;
  bonusEligibleCents: number;
  bonusPaidCents: number;
  bonusPayoutFeeCents: number;
  bonusUnearnedReleasedCents: number;

  settlementState:
    | 'pending'
    | 'captured'
    | 'released'
    | 'bonus_payable'
    | 'bonus_paid'
    | 'bonus_held'
    | 'blocked'
    | 'failed';
  createdAt: string;
};
```

### 3.14 `PoolAuditReport`

```ts
type PoolAuditReport = {
  id: string;
  roundId: string;
  poolId: string;

  rulebookHash: string;
  feePolicyHash: string;
  bonusPolicyHash: string;
  calculationVersion: 'cgpp_refund_bonus_non_mvp_v0_1';

  grossCapturedCents: number;
  feeCents: number;
  netRecipientDisbursedCents: number;
  actualGrossExposureCents: number;
  countedCents: number;
  matchEligibleCents: number;
  sponsorBaseMatchCents: number;

  bonusReserveBackedCents: number;
  bonusExposureReservedCents: number;
  bonusLiabilityCents: number;
  bonusPaidCents: number;
  bonusPayoutFeeCents: number;
  bonusUnclaimedCents: number;
  bonusUnearnedReleasedCents: number;

  verifiedSupporterCount: number;
  distinctViewpointClusterCount: number;
  authorizationFailureCount: number;
  excludedIdentityCount: number;
  excludedPaymentClusterCount: number;
  excludedBonusAbuseCount: number;
  reviewBlockCount: number;

  finalStatus:
    | 'cleared_and_captured'
    | 'qualifying_failed_bonus_payable'
    | 'qualifying_failed_bonus_paid'
    | 'nonqualifying_failed_no_bonus'
    | 'failed_authorization_no_bonus'
    | 'blocked_review_no_bonus'
    | 'canceled_no_bonus';

  publishedAt: string;
};
```

### 3.15 `CopyPreflightReport`

Add bonus-copy checks to v135:

```ts
type CopyPreflightReport = {
  id: string;
  roundId: string;
  checkedAt: string;
  lastDeployHash: string;
  checkedRoutes: string[];
  prohibitedActiveLabelsFound: string[];
  exactProgressLeakFound: boolean;
  paymentOverclaimFound: boolean;
  bonusOverclaimFound: boolean;
  financialPromotionRiskFound: boolean;
  ordinaryZeroStatePrimaryFound: boolean;
  staleCtaFound: boolean;
  nonMvpSurfaceLeakFound: boolean;
  pass: boolean;
  reportHash: string;
};
```

Prohibited bonus copy includes:

```text
free money
profit
guaranteed return
investment
interest
lottery
risk-free
cashback
paid to donate
bonus impact
```

### 3.16 `FeaturePromotionRecord`

```ts
type FeaturePromotionRecord = {
  id: string;
  featureKey: 'cgpp_refund_bonus_non_mvp_v0_1';
  fromClassification: 'non_mvp';
  toClassification: 'limited_public' | 'mvp_candidate' | 'production';

  requestedBy: string;
  approvedByProduct?: string;
  approvedByPayments?: string;
  approvedByLegal?: string;
  approvedByTrustSafety?: string;
  approvedByGovernance?: string;

  approvalState: 'draft' | 'approved' | 'rejected' | 'revoked';
  approvedAt?: string;
  notes: string;
  promotionHash: string;
  createdAt: string;
  updatedAt: string;
};
```

---

## 4. Consent boundaries

### 4.1 Nonbinding actions

These actions do **not** create a pledge, payment obligation, counted support, match eligibility, bonus eligibility, public recognition, audit funding row, or viewpoint disclosure:

- search;
- page view;
- click on `View labs pool details`;
- click on `How it works`;
- reading project cards;
- changing amount before final review;
- selecting a viewpoint tag before final review;
- opening historical, technical, or labs drawers;
- abandoning the flow before final review.

### 4.2 Draft pledge

A draft pledge may exist for UX continuity. It has no clearing, counting, payment, match, bonus, or audit funding effect.

A draft pledge cannot be shown publicly as support or counted as bonus exposure.

### 4.3 Hard pledge

A hard pledge exists only after:

1. `RefundBonusOpenGate.state === passed`;
2. final review consent;
3. fee acknowledgement;
4. sealed-progress acknowledgement;
5. bonus-term acknowledgement;
6. identity eligibility snapshot creation;
7. bonus eligibility snapshot creation;
8. bonus exposure reserved from a backed reserve;
9. provider-confirmed payment commitment snapshot;
10. rulebook hash, fee-policy hash, and bonus-policy hash capture.

Only hard pledges can count toward thresholds, supporter counts, different-view clusters, counted dollars, match eligibility, sponsor match, and bonus eligibility.

### 4.4 Final consent screen is mandatory

No user action outside Screen 3 may create a hard pledge or reserve bonus exposure.

No CTA, email, notification, or external route may bypass Screen 3.

### 4.5 Bonus-term consent

The failure-participation bonus must be described as:

```text
not a moral score;
not a public reputation reward;
not a donation receipt;
not investment income;
not interest;
not a lottery;
not guaranteed outside the qualifying failure state;
not impact;
not sponsor match;
not project funding.
```

### 4.6 Viewpoint-tag consent

The viewpoint tag is optional. It must be described as:

```text
not a moral score;
not a ranking;
not a public identity label by default;
not a source of extra power;
used only for aggregate different-view support checks.
```

Default visibility is `aggregate_only`.

---

## 5. Payment / no-payment / bonus semantics

### 5.1 Payment and bonus states

```text
Preview: no payment method, no pledge, no count, no bonus exposure.
Draft: no payment effect, no count, no bonus exposure.
Hard saved: provider-confirmed payment method saved, no charge and no authorization, bonus exposure reserved.
Authorized: exact post-close authorization created only if success gates pass.
Captured: charge captured only while pool remains payable after recomputation.
Released: authorization released/canceled or no charge required.
Bonus payable: qualifying support-threshold failure occurred and user passed bonus eligibility.
Bonus paid: backed failure bonus successfully paid or recorded as settled.
Bonus held: bonus is owed but payout method/compliance issue prevents immediate payout.
Bonus unearned/released: pool cleared or nonqualifying failure occurred, so reserved exposure is released.
```

### 5.2 Copy invariants

Saving a payment method must never be described as:

- a charge;
- a donation;
- a hold;
- escrow;
- custody;
- reserved funds;
- protection;
- authorization;
- guaranteed future payment;
- guaranteed match;
- guaranteed impact;
- guaranteed bonus.

Allowed copy:

```text
Your payment method is saved and provider-confirmed. You are not charged now. Exact authorization is attempted only after the round closes and all success gates pass.
```

Bonus reserve language must be precise:

```text
A separate backed bonus reserve funds eligible failure-participation bonuses if the pool misses the support threshold. The reserve is not project funding and does not count as impact.
```

### 5.3 Authorization timing

Success authorization must not occur:

- at page view;
- at pool preview;
- at amount entry;
- at payment-method save;
- before round close;
- before review and challenge gates pass;
- before sponsor-match backing is verified if match is active;
- before bonus reserve is verified if bonus copy is active;
- before copy preflight passes;
- before `RefundBonusOpenGate.state === passed`.

Authorization occurs only after close and only for the exact gross pledge amount shown on the final review screen.

### 5.4 Bonus-payout timing

Bonus payout must not occur:

- before round close;
- before determining that the pool failed in a bonus-eligible way;
- before recomputing eligibility from authoritative server state;
- before identity/Sybil/payment-cluster exclusions;
- before review/challenge/safety/legal states are confirmed nonblocking;
- before bonus reserve availability is rechecked;
- before the bonus settlement plan is written;
- while the feature, round, bonus reserve, or payout rail is paused.

### 5.5 Lifecycle side-effect states

| Round status | Allowed side effects |
|---|---|
| `draft` | configuration only; no public pledge route |
| `preflight` | copy/review/payment/bonus/sponsor readiness checks only |
| `labs_open` | labs/admin pledge creation only if gate passed; no production public exposure |
| `open` | hard pledge creation only if promoted and gate passed |
| `closed_to_new_pledges` | freeze inputs and compute preliminary clearing/failure only |
| `reviewing` | review and challenge resolution only; no authorization, capture, or bonus payout |
| `cleared` | create exact authorization attempts only |
| `qualifying_failed` | create bonus settlement plan only |
| `nonqualifying_failed` | release bonus exposure; no bonus payout |
| `authorizing` | continue/retry exact authorization attempts; no capture until payable |
| `payable` | capture, release, settlement-row creation, and sponsor-match payout |
| `captured` | receipt and audit publication; release unused bonus exposure |
| `bonus_payable` | bonus payout operations may be created from frozen plan |
| `bonus_paying` | execute/retry bonus payouts idempotently |
| `bonus_paid` | receipt and audit publication; no new bonus payouts |
| `released` | replay/report/audit only; no new payment side effects |
| `blocked` | no charge, no bonus unless explicitly frozen as bonus-eligible, release/cancel where possible |
| `canceled` | no charge, no bonus unless explicitly frozen as bonus-eligible, release/cancel where possible |

### 5.6 No-charge states

The user pays $0 if any of these occur:

- net-recipient threshold shortfall;
- verified-supporter shortfall;
- different-view support shortfall;
- review gate fails;
- challenge gate fails;
- sponsor match not backed when sponsor match was promised;
- bonus reserve not backed when bonus was promised;
- payment method not provider-confirmed;
- exact authorization fails;
- wrong-amount authorization;
- short-expiring authorization;
- expired authorization;
- failed authorization rows make the pool fall below thresholds;
- round canceled or safety-frozen before capture;
- copy preflight fails before hard pledges open.

Only the first three are bonus-eligible by default. All other no-charge states are no-bonus by default.

### 5.7 Receipts

If captured, the receipt must show:

```text
Gross captured
Fees
Net sent to projects
Project allocation amounts
Actual/gross exposure
Counted amount
Match-eligible amount
Sponsor match amount, if any
Failure bonus: $0 because the pool cleared
Authorization reference
Capture reference
Round id
Pool id
Rulebook hash
Fee policy hash
Bonus policy hash
Calculation version
```

If qualifying failure and bonus paid or owed, the receipt must show:

```text
Gross charged: $0
Project funding: $0
Failure reason category
Bonus eligibility status
Bonus gross amount
Bonus payout fees, if any
Bonus net amount
Bonus payout reference, if paid
Bonus reserve id
Round id
Pool id
Rulebook hash
Bonus policy hash
Calculation version
```

---

## 6. Review and anti-threat gates

### 6.1 Project scope

A project is eligible only if it is a moral public good.

This branch excludes:

- political campaign contributions;
- lobbying trades;
- lifestyle trades;
- behavior-change promises;
- private-benefit projects;
- compensation for newly created harmful behavior;
- `pay me or I will do harm` proposals;
- proposals whose primary value is private status, access, consumption, or membership.

### 6.2 Recipient route

Every project must have a verified recipient route before the pool opens.

Recipient-route review must verify:

- legal recipient or fiscal host;
- payment destination;
- allowed use of funds;
- receipt capability;
- conflict status;
- sponsor/proposer/reviewer/self-dealing concerns.

### 6.3 Bonus reserve route

Every bonus reserve must have a verified funding and payout route before hard pledge opening.

Bonus-reserve review must verify:

- bonus sponsor identity or source;
- backing state;
- maximum exposure;
- supported payout jurisdictions;
- tax/reporting treatment;
- provider acceptable-use status;
- anti-fraud/Sybil controls;
- reserve-release policy;
- conflict/self-dealing concerns.

### 6.4 Baseline and action evidence

Every project must have a clear baseline and adequate action evidence.

The review record must answer:

```text
What happens without this funding?
What will the recipient do with marginal funding?
Why is this action plausibly a moral public good?
What evidence supports the action path?
What review uncertainty remains?
```

Malformed, missing, or unresolved baseline/action-evidence review fails closed.

### 6.5 Externality review

Externality state must be `clear`.

`review` and `blocked` both prevent pledgeability, authorization, capture, sponsor match, and bonus payout.

### 6.6 Anti-threat review

Anti-threat state must be `clear`.

The pool must block any project where funding or bonus structure would reward or encourage:

- newly created threats;
- strategic harm creation;
- extortionate bargaining;
- `pay to stop` behavior created for payment;
- coercive pressure against nonparticipants;
- deliberate failure sabotage to earn bonuses;
- malicious campaigns to deny public-good funding while collecting bonuses.

### 6.7 Conflict review

Conflicts must be `clear` or explicitly `non_blocking` under the frozen rulebook.

Reviewer notes must identify conflicts involving:

- project proposer;
- recipient;
- fiscal host;
- bonus sponsor;
- sponsor match provider;
- reviewer;
- platform operator where relevant.

### 6.8 Challenge state

An open challenge blocks success authorization and bonus payout unless marked `non_blocking` under the frozen rulebook.

No pool can move to `payable` or `bonus_payable` with an unresolved open challenge.

---

## 7. Privacy and sealed-disclosure rules

### 7.1 Default privacy

Default visibility is `aggregate_only`.

The branch must not expose donor-level viewpoint tags, pledge amounts, bonus eligibility, bonus payout state, payment state, identity state, or moral preferences without explicit public visibility consent. Default has no public donor-level visibility.

### 7.2 Viewpoint-cluster reporting

Public reports may show only aggregate cluster counts after privacy thresholds are met.

Small clusters may be grouped as:

```text
other / suppressed for privacy
```

### 7.3 Pre-close sealed progress

Allowed before close:

```text
Not enough support yet
Some support joined
Likely near threshold
Review pending
Closed; calculating results
Bonus reserve backed
Bonus reserve not active
```

Forbidden before close:

```text
$4,732 / $5,000
need 3 more supporters
need 1 more cluster
your pledge is pivotal
pool succeeds without you
pool likely fails and pays bonus
exact success-without-me probability
exact failure-bonus probability
exact threshold gap
exact supporter gap
exact different-view gap
exact bonus exposure remaining
```

### 7.4 Search and browse privacy

Search terms, clicks, browsing, CTA selection, and project-card expansion must not infer allocatable stances, create pledges, create viewpoint tags, or affect clearing.

### 7.5 Bonus privacy

Public reports must not show user-level bonus receipt unless a user explicitly opts into public disclosure and the disclosure passes privacy review.

Aggregate bonus reporting may show:

```text
Total eligible bonus recipients
Total bonus paid
Total bonus held/unclaimed
Total bonus reserve released unused
```

---

## 8. Accounting rules

All monetary outputs must be integer cents.

Store and display these channels separately:

1. `grossCapturedCents`
2. `feeCents`
3. `netRecipientDisbursedCents`
4. `actualGrossExposureCents`
5. `countedCents`
6. `matchEligibleCents`
7. `sponsorBaseMatchCents`
8. `bonusReserveBackedCents`
9. `bonusExposureReservedCents`
10. `bonusLiabilityCents`
11. `bonusPaidCents`
12. `bonusPayoutFeeCents`
13. `bonusUnclaimedCents`
14. `bonusUnearnedReleasedCents`

### 8.1 Channel semantics

| Channel | Meaning | Counts toward project threshold? | Unlocks sponsor match? | Counts as bonus? |
|---|---|---:|---:|---:|
| Gross captured | Total charged to donor on success | No | No | No |
| Fees | Platform/payment/fiscal-route fees | No | No | No |
| Net recipient-disbursed | Amount sent to reviewed projects | Yes | Yes, if all gates pass | No |
| Actual/gross exposure | Donor's gross charge exposure | No | No | No |
| Counted | Eligible public-good credit | Yes, only if derived from net-recipient dollars | Possibly | No |
| Match-eligible | Eligible amount for sponsor base match | No threshold by itself | Yes | No |
| Sponsor base match | Sponsor-funded project match | No donor threshold credit | N/A | No |
| Bonus reserve backed | Money or enforceable commitment backing failure bonuses | No | No | Reserve only |
| Bonus exposure reserved | Maximum bonus liability reserved for eligible hard pledges | No | No | Potential bonus |
| Bonus liability | Actual owed bonuses after qualifying failure | No | No | Yes |
| Bonus paid | Bonuses actually paid | No | No | Yes |
| Bonus payout fee | Provider/platform cost to send bonus | No | No | Fee |
| Bonus unclaimed | Owed but not yet paid bonuses | No | No | Liability |
| Bonus unearned released | Reserved exposure released because pool cleared or failure was nonqualifying | No | No | Released reserve |

### 8.2 Public copy rule

Do not combine channels into one unlabeled `impact`, `matched impact`, `total value`, `donation impact`, or `bonus impact` number.

Allowed success summary:

```text
You were charged $25 gross. After $0.95 in fees, $24.05 went to projects. Failure bonus: $0 because the pool cleared.
```

Allowed qualifying-failure summary:

```text
The pool missed its support threshold. You were charged $0. You received a $2.50 backed failure-participation bonus from a separate reserve. No project funds were disbursed.
```

### 8.3 Receipts and audit

Receipts and audit reports must show every accounting channel separately.

### 8.4 Bonus reserve treatment

Bonus reserve is not:

- project funding;
- donor threshold credit;
- sponsor match;
- impact;
- a donation receipt for pledgers;
- platform revenue.

Unused reserve follows the frozen reserve-release policy.

---

## 9. Bonus-backing rules

### 9.1 Default: no bonus on live MVP route

If refund bonus is absent, public copy must say:

```text
Failure bonus: not active in this MVP round.
```

### 9.2 Active refund bonus

Refund bonus may be active only if:

```text
pool.refundBonusEnabled == true
pool.refundBonusReserveId exists
refundBonusReserve.reserveType == failure_participation_bonus
refundBonusReserve.backingState in {funded, escrowed, contractually_committed} for real money
refundBonusReserve.backedCents >= refundBonusReserve.maxExposureCents
refundBonusReserve.maxExposureCents >= pool.roundBonusExposureCapCents
refundBonusReserve.publishedAt <= round.parametersFrozenAt
refundBonusReserve.backingConfirmedAt <= round.parametersFrozenAt
refundBonusReserve.sourceHash is canonical
refundBonusReserve.bonusPolicyHash == round.bonusPolicyHash
RefundBonusOpenGate.state == passed
```

If users consented to active refund bonus and the bonus reserve is not backed at clearing/failure time, fail closed:

```text
No success authorization.
No bonus payout.
No public claim that the round was bonus-backed.
Escalate to incident/support.
```

### 9.3 Bonus calculation

Supported modes:

#### Fixed cents

```text
bonusEligibleCents = min(fixedBonusCents, perUserBonusCapCents)
```

Example:

```text
pledge = $0.50
fixedBonusCents = 100
perUserBonusCapCents = 100
bonusEligibleCents = $1.00
```

#### Percentage of pledge, capped

```text
claim = maxGrossCents * bonusRatioBps / 10000
bonusEligibleCents = min(claim, perUserBonusCapCents)
```

Example:

```text
pledge = $25
bonusRatioBps = 1000
perUserBonusCapCents = 250
bonusEligibleCents = $2.50
```

### 9.4 Reserve exposure calculation

Before hard pledges open:

```text
maxBonusExposureCents = min(
  configuredRoundBonusExposureCapCents,
  maxEligiblePledgeCount * perUserBonusCapCents
)
```

For fixed $0.50 pledge and $1 bonus:

```text
maxEligiblePledgeCount = floor(roundGrossCaptureCapCents / 50)
maxBonusExposureCents = maxEligiblePledgeCount * 100
```

For a $5,000 gross capture cap:

```text
maxEligiblePledgeCount = 10000
maxBonusExposureCents = $10,000
```

A round must stop accepting bonus-eligible hard pledges when accepting another pledge would exceed the backed exposure cap.

### 9.5 Bonus reserve release

Unused bonus reserve is released only after:

- the pool clears and captures successfully; or
- a nonqualifying failure is finalized and no bonus is owed; or
- all qualifying-failure bonuses are paid/held/forfeited under the frozen policy; and
- audit report is generated or a support/compliance hold is recorded.

---

## 10. Clearing and failure-bonus rules

### 10.1 Clearing overview

A pool clears only if all of these are true after round close:

```text
1. round is in closed_to_new_pledges, reviewing, cleared, authorizing, or payable for calculation;
2. refund bonus open gate passed before any bonus-eligible hard pledge was saved;
3. active pool is not canceled or blocked;
4. copy preflight passed before hard pledges opened;
5. all project review gates pass;
6. bonus reserve gates pass if bonus copy was active;
7. enough eligible hard pledges exist;
8. net-recipient threshold is met;
9. verified-supporter threshold is met;
10. different-view threshold is met;
11. sponsor match is backed if displayed;
12. exact authorization succeeds for enough rows;
13. pool still clears after failed authorization rows are removed.
```

Calculation may occur in `closed_to_new_pledges` or `reviewing`, but authorization side effects cannot occur until `cleared` or `authorizing`, capture cannot occur until `payable`, and bonus payout cannot occur until `bonus_payable`.

### 10.2 Eligible hard pledge predicate

A pledge is eligible for threshold, supporter count, different-view count, counted dollars, match eligibility, sponsor match, and bonus eligibility only if:

```text
pledge.roundId == round.id
pledge.poolId == activePool.id
pledge.pledgeState == hard_saved
pledge.finalReviewConfirmedAt exists
pledge.feeAcknowledged == true
pledge.sealedProgressAcknowledged == true
pledge.bonusTermsAcknowledged == true
pledge.rulebookHashAtConsent == round.rulebookHash
pledge.feePolicyHashAtConsent == round.feePolicyHash
pledge.bonusPolicyHashAtConsent == round.bonusPolicyHash
pledge.maxGrossCents is positive integer cents
pledge.maxGrossCents <= round.participantMaxGrossCents
pledge.maxGrossCents >= round.participantMinGrossCents
identity snapshot passes
payment commitment snapshot passes
bonus eligibility snapshot passes
participant is not excluded by sybil, collusion, same-control, same-payment-cluster, prior bonus-abuse, jurisdiction, or payment rules
```

### 10.3 Identity and cluster counting

A participant counts only if:

```text
humanVerified == true
identityVerified == true
sybilState == clear
collusionState == clear
countingWeightBps == 10000
bonusEligibilityWeightBps == 10000
```

For supporter, different-view, and bonus counting:

- at most one participant per same-control cluster counts;
- at most one participant per payment cluster counts;
- if multiple hard pledges share a same-control or payment cluster, count only the earliest eligible consent by canonical stable ordering;
- excluded cluster duplicates do not increase supporter count, different-view count, counted dollars, match-eligible dollars, sponsor match, or bonus eligibility.

Default behavior: excluded duplicate-cluster pledges are removed before authorization and are not bonus-eligible.

### 10.4 Fee and net-recipient calculation

For each eligible hard pledge:

```text
gross = pledge.maxGrossCents
fee = feeQuote.feeCents
netRecipient = gross - fee
```

Rules:

- `netRecipient` must be positive integer cents;
- fee dollars do not satisfy thresholds;
- fee dollars do not count as public-good funding;
- fee dollars do not unlock sponsor match;
- fee dollars are reported separately.

### 10.5 Threshold predicates

The pool passes initial threshold checks only if:

```text
sum(netRecipient from eligible pledges) >= pool.thresholdNetRecipientCents
count(eligible verified supporters with netRecipient >= pool.minNetRecipientCentsPerSupporter) >= pool.minVerifiedSupporters
count(distinct eligible viewpoint clusters after same-control/payment-cluster exclusion) >= pool.minDistinctViewpointClusters
sum(gross from eligible pledges) <= round.roundGrossCaptureCapCents
sum(bonusExposureReservedCents from eligible pledges) <= round.roundBonusExposureCapCents
```

`prefer_not_to_say` does not count as a distinct viewpoint cluster.

### 10.6 Qualifying failure predicate

A pool has a qualifying failure only if:

```text
round closes normally
copy preflight and open gate passed before pledge collection
projects remain reviewed and nonblocked
anti-threat, externality, conflict, and challenge gates are nonblocking
bonus reserve remains backed
failure reason is in pool.qualifyingFailureModes
no material fraud, Sybil, collusion, safety, legal, or payment-provider incident invalidates the round
```

Default qualifying failure modes:

```text
net_recipient_threshold_shortfall
verified_supporter_threshold_shortfall
different_view_threshold_shortfall
```

Default nonqualifying failure modes:

```text
review_block
challenge_block
anti_threat_block
externality_block
conflict_block
legal_compliance_block
payment_provider_outage
bonus_reserve_unbacked
copy_preflight_failure
round_canceled_by_admin
safety_pause
material_sybil_attack
material_collusion_attack
```

### 10.7 Authorization reconciliation

After thresholds and gates pass, attempt exact authorization for each included pledge.

A row remains payable only if:

```text
authorizationState == authorized_exact
requiredGrossCents == pledge.maxGrossCents
authorization remains valid through expected capture
provider authorization reference exists
```

Rows with failed, wrong-amount, expired, short-expiring, or missing authorization are removed. After removal, recompute:

- gross cap;
- net-recipient threshold;
- supporter count;
- different-view cluster count;
- counted dollars;
- match-eligible dollars;
- sponsor match;
- bonus reserve release state.

If the pool no longer clears due to authorization failures, release/cancel all successful authorizations and charge $0. Bonus treatment follows the frozen payment-failure policy; default is no bonus for payment-failure-caused round failure unless governance explicitly classifies the failure as qualifying.

### 10.8 Capture and disbursement

Capture may occur only when:

```text
round.status == payable
pool still clears after authorization reconciliation
all payable rows have exact authorization
total gross captured will not exceed round cap
```

After capture:

- disburse net-recipient amounts according to fixed allocation weights;
- report fees separately;
- apply sponsor base match if backed and active;
- release unused bonus exposure;
- publish aggregate audit report.

### 10.9 Bonus payout settlement

Bonus payout may occur only when:

```text
round.status == bonus_payable or bonus_paying
pool.status == qualifying_failed or bonus_payable
qualifying failure predicate passed
bonus reserve is backed and active
bonus settlement plan is written and approved
eligible pledge rows are recomputed from authoritative server state
no emergency pause blocks bonus payouts
```

For each bonus-eligible pledge:

```text
bonusGrossCents = computed bonus under frozen policy
bonusPayoutFeeCents = provider/payout fee under frozen policy
bonusNetCents = bonusGrossCents - bonusPayoutFeeCents if user-paid fees apply
```

Default fee rule: bonus sponsor pays bonus payout fees if legally and operationally supported. If not supported, fee treatment must be disclosed before pledge save.

---


## 11. At-Least-Tier Platform-Match Commitment — non-MVP v0.1

### 11.1 Decision

Add a second disabled-by-default non-MVP branch called **At-Least-Tier Platform-Match Commitment**.

A user chooses one reviewed public-good pool, selects an **at least Tier K** forecast, and states an intended contribution amount `X`.

```text
If other eligible users' effective support reaches at least the selected tier:
  Moral Trade contributes a tier-specific percentage of X to the reviewed projects
  from a backed platform-match reserve.
  The user is charged $0.

If other eligible users' effective support does not reach the selected tier:
  the user contributes X to the reviewed projects.
  The platform contributes $0 for that user.

If review, safety, legal, payment, anti-threat, recipient-route, schedule, reserve,
or Sybil gates fail:
  the user is charged $0;
  the platform contributes $0;
  the round is blocked, canceled, or simulation-only under the frozen rules.
```

There is **no direct user payout**. The platform never pays money to the user under this mechanism. All winning platform-match amounts are routed to reviewed moral-public-good projects.

This mechanism is not part of the current direct capped CGPP MVP. It is not part of the refund-bonus branch. It is a separate non-MVP labs mechanism for testing whether tiered, platform-funded conditional matching can mitigate free-riding while avoiding direct user reward, exact-tier, and wagering dynamics.

### 11.2 Product and technical labels

```text
Public label: At-Least-Tier Platform Match
Short label: Tier Platform Match
Internal label: At-Least-Tier Platform-Match Commitment Non-MVP
Calculation version: at_least_tier_platform_match_v0_1
Feature flag: cgpp_at_least_tier_platform_match_non_mvp_v0_1
Live-money feature flag: at_least_tier_platform_match_live_money_enabled
Deployment mode: at_least_tier_platform_match_non_mvp_labs
Feature classification: non_mvp
Default production visibility: off
Default production money movement: off
```

The ordinary user-facing mechanism name should be **platform match**, **tier platform match**, or **at-least-tier platform match**. Ordinary user-facing copy must not use:

```text
bet
wager
gamble
profit
prize
lottery
investment
return
cashback
free money
paid if right
payout to you
```

Admin methodology and developer documentation may use `damped odds schedule`, `odds against`, and related technical language. Ordinary user copy should instead say:

```text
Reward rates are based on frozen pre-round estimates of how hard each tier is to reach.
```

### 11.3 Feature classification and promotion gate

Feature metadata:

```text
feature_classification: non_mvp
deployment_stage: labs_research_non_mvp
default_enabled: false
production_public_enabled: false
production_real_money_enabled: false
mvp_surface_enabled: false
cgpp_mvp_pledge_path_enabled: false
requires_admin_or_labs_access: true
requires_explicit_promotion_record: true
```

Add a separate live-money flag:

```text
at_least_tier_platform_match_live_money_enabled
```

Default: `false` everywhere.

Even if the feature flag is enabled for labs viewing, live money remains blocked unless all of the following are true:

1. `at_least_tier_platform_match_live_money_enabled == true`;
2. an approved `FeaturePromotionRecord` exists;
3. legal/compliance approval exists;
4. payment provider readiness exists;
5. platform-match reserve is backed and frozen;
6. identity/Sybil controls pass;
7. damped odds reward schedule is computed, valid, and frozen;
8. copy preflight passes;
9. emergency pause is inactive.

### 11.4 Capability gate

Add or extend a server-side gate:

```ts
assertAtLeastTierPlatformMatchCapability(action, actor, environment)
```

Actions:

```text
view_labs_landing
view_public_landing
create_config
create_round
open_round
create_commitment
save_payment_method
authorize_loss_payment
capture_loss_payment
release_winner_authorization
compute_reward_schedule
compute_resolution
approve_settlement
execute_platform_match_contribution
execute_user_loss_contribution
publish_public_report
seed_demo_data
```

Production behavior:

- ordinary public users cannot access public product surfaces;
- ordinary public users cannot create commitments;
- no real payment authorization, capture, donation routing, or platform-match contribution can occur;
- admins may view and edit labs/draft data only if permitted;
- all side-effecting jobs must fail closed before provider calls.

Reason enum:

```text
feature_non_mvp
feature_disabled
public_surface_disabled
production_real_money_disabled
missing_promotion_record
insufficient_role
missing_platform_match_reserve
platform_match_reserve_unbacked
damped_odds_schedule_invalid
payment_mode_not_allowed_for_non_mvp
route_not_available_in_current_deployment
```

Client-side hiding is not sufficient. Enforce this gate in services, routes, jobs, admin actions, API mutations, payment operations, settlement operations, and public-report publication.

### 11.5 Core user promise

Labs card copy:

```text
At-Least-Tier Platform Match

Non-MVP labs mechanism.
State an amount you would contribute if this reviewed public-good pool does not reach your selected tier from other eligible users' effective support.

If other eligible support reaches at least your selected tier, Moral Trade contributes a tier-specific percentage of your stated amount to the projects from a backed platform-match reserve, and you are charged $0.

If other eligible support does not reach your selected tier, you contribute your stated amount to the projects.
```

Persistent warning:

```text
Non-MVP mechanism. Not part of the current Common Ground Pledge Pool MVP. Production real-money use is disabled unless this mechanism is explicitly promoted.
```

The user must see, before commitment:

- selected at-least tier;
- stated intended contribution amount;
- tier-specific platform-match rate;
- estimated platform contribution if the user wins;
- estimated user contribution if the user loses;
- the fact that the user’s own commitment and same-control accounts do not count toward that user’s forecast result;
- the fact that platform-match payments do not count toward forecast results;
- the fact that final project totals may be higher than the forecast-resolution total;
- the fact that this is non-MVP and may be simulation-only.

### 11.6 At-least-tier only

Only cumulative at-least-tier forecasts are allowed:

```text
at least Tier 1
at least Tier 2
at least Tier 3
...
```

Do not build:

- exact-tier forecasts;
- below-tier forecasts;
- under-tier forecasts;
- shorting failure;
- peer-to-peer forecasts;
- tradable tier claims;
- direct user payout for correct forecasts.

Rationale: exact-tier and below-tier rewards can incentivize users to suppress higher funding. At-least-tier rewards remain aligned with higher final project funding: if Tier 4 clears, users who selected Tier 1, Tier 2, Tier 3, or Tier 4 all have correct at-least forecasts.

### 11.7 Product model

Add or adapt models. Use repository naming conventions and reuse v136 non-MVP primitives where possible.

#### 11.7.1 `AtLeastTierPlatformMatchRound`

```ts
type AtLeastTierPlatformMatchRound = {
  id: string;
  poolId: string;
  roundId?: string; // nullable if reusing CgppRound

  featureKey: 'cgpp_at_least_tier_platform_match_non_mvp_v0_1';
  deploymentMode: 'at_least_tier_platform_match_non_mvp_labs';
  featureClassification: 'non_mvp';

  status:
    | 'draft'
    | 'preflight'
    | 'labs_open'
    | 'open'
    | 'closed_to_new_commitments'
    | 'reviewing'
    | 'authorizing'
    | 'resolving'
    | 'settlement_planned'
    | 'payable'
    | 'settling'
    | 'settled'
    | 'released'
    | 'blocked'
    | 'canceled';

  opensAt: string;
  closesAt: string;
  parametersFrozenAt: string;

  rulebookHash: string;
  feePolicyHash: string;
  platformMatchPolicyHash: string;
  rewardScheduleHash: string;
  calculationVersion: 'at_least_tier_platform_match_v0_1';

  sealedProgressMode: 'qualitative_only_before_close';

  productionPublicEnabled: boolean; // default false
  productionRealMoneyEnabled: boolean; // default false
  promotionRecordId?: string;

  createdAt: string;
  updatedAt: string;
};
```

#### 11.7.2 `PublicGoodTier`

```ts
type PublicGoodTier = {
  id: string;
  roundId: string;
  tierIndex: number; // starts at 1
  publicLabel: string; // e.g. "Tier 1"
  thresholdNetRecipientCents: number;
  frozenForecastProbabilityBps: number;
  oddsAgainstDecimalString: string;
  rewardRateBps: number;
  scheduleVersion: string;
  createdAt: string;
};
```

#### 11.7.3 `DampedOddsRewardSchedule`

```ts
type DampedOddsRewardSchedule = {
  id: string;
  roundId: string;
  scheduleVersion: 'damped_odds_sqrt_v0_1';

  rMinBps: number; // default 500
  rMaxBps: number; // default 3500
  gammaDecimalString: string; // default "0.5"
  qMinBps: number; // default 100
  qMaxBps: number; // default 9900
  minRewardIncrementBps: number; // default 1

  fallbackMode: 'fail_closed' | 'capped_geometric_dev_only';

  inputHash: string;
  outputHash: string;
  state: 'draft' | 'computed' | 'frozen' | 'invalid' | 'superseded';
  invalidReasonCodes: string[];
  createdAt: string;
  frozenAt?: string;
};
```

#### 11.7.4 `AtLeastTierPlatformMatchCommitment`

```ts
type AtLeastTierPlatformMatchCommitment = {
  id: string;
  roundId: string;
  poolId: string;
  participantId: string;

  selectedTierIndex: number;
  statedGrossCents: number;
  estimatedFeeCents: number;
  statedNetRecipientCents: number;

  platformMatchRewardRateBps: number;
  platformMatchNetCents: number;
  platformMatchGrossCostCents: number;
  guaranteedEffectiveSupportCents: number;

  viewpointCluster?: string;
  visibility: 'aggregate_only';

  commitmentState:
    | 'draft'
    | 'hard_saved'
    | 'excluded_identity'
    | 'excluded_payment'
    | 'excluded_sybil'
    | 'excluded_same_control'
    | 'excluded_review'
    | 'authorized_for_possible_loss'
    | 'won_platform_pays'
    | 'lost_user_pays'
    | 'user_loss_captured'
    | 'platform_match_paid'
    | 'released'
    | 'settled'
    | 'blocked'
    | 'canceled';

  paymentCommitmentSnapshotId?: string;
  identityEligibilitySnapshotId?: string;
  sameControlClusterId?: string;

  platformMatchReserveId: string;
  platformMatchExposureReservedCents: number;

  rulebookHashAtConsent: string;
  feePolicyHashAtConsent: string;
  platformMatchPolicyHashAtConsent: string;
  finalReviewConfirmedAt?: string;

  createdAt: string;
  updatedAt: string;
};
```

#### 11.7.5 `PlatformMatchReserve`

```ts
type PlatformMatchReserve = {
  id: string;
  roundId: string;
  poolId: string;

  reserveType: 'at_least_tier_platform_match';
  backedCents: number;
  committedCents: number;
  paidCents: number;
  releasedUnusedCents: number;
  maxExposureCents: number;

  backingState: 'funded' | 'escrowed' | 'contractually_committed' | 'unbacked' | 'dev_simulated';
  legalComplianceState: 'approved' | 'review' | 'blocked';
  paymentProviderReady: boolean;
  recipientRouteReady: boolean;

  sourceHash: string;
  platformMatchPolicyHash: string;
  status: 'draft' | 'backed' | 'active' | 'paying' | 'paid' | 'released_unused' | 'blocked';

  createdAt: string;
  updatedAt: string;
};
```

#### 11.7.6 `AtLeastTierResolutionSnapshot`

```ts
type AtLeastTierResolutionSnapshot = {
  id: string;
  roundId: string;

  inputHash: string;
  outputHash: string;
  resolvedAt: string;

  eligibleCommitmentCount: number;
  excludedCommitmentCount: number;
  ordinaryDirectPledgeSupportCents: number;
  effectiveSupportTotalCents: number;

  resolutionMethod: 'leave_one_cluster_out_effective_support';
  status: 'computed' | 'approved' | 'superseded' | 'blocked';

  createdAt: string;
};
```

#### 11.7.7 `AtLeastTierResolutionRow`

```ts
type AtLeastTierResolutionRow = {
  id: string;
  resolutionSnapshotId: string;
  roundId: string;
  commitmentId: string;
  participantId: string;

  selectedTierIndex: number;
  selectedTierThresholdNetCents: number;
  statedNetRecipientCents: number;
  rewardRateBps: number;
  platformMatchNetCents: number;
  guaranteedEffectiveSupportCents: number;
  otherEligibleEffectiveSupportCents: number;
  excludedSameControlEffectiveSupportCents: number;

  won: boolean;
  outcome: 'won_platform_pays' | 'lost_user_pays' | 'excluded';
  exclusionReason?: string;
  rowHash: string;
  createdAt: string;
};
```

#### 11.7.8 `PlatformMatchContributionOperation`

```ts
type PlatformMatchContributionOperation = {
  id: string;
  roundId: string;
  commitmentId: string;
  reserveId: string;
  destinationProjectId: string;

  grossCostCents: number;
  feeCents: number;
  netRecipientCents: number;
  currency: string;

  providerOperationRef?: string;
  operationState:
    | 'not_attempted'
    | 'pending'
    | 'succeeded'
    | 'failed_retryable'
    | 'failed_final'
    | 'held_compliance'
    | 'reversed';

  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};
```

#### 11.7.9 `AtLeastTierSettlementRow`

```ts
type AtLeastTierSettlementRow = {
  id: string;
  roundId: string;
  commitmentId: string;
  participantId: string;

  outcome: 'won_platform_pays' | 'lost_user_pays' | 'excluded' | 'blocked';

  userGrossCapturedCents: number;
  userFeeCents: number;
  userNetRecipientDisbursedCents: number;

  platformMatchGrossCostCents: number;
  platformMatchFeeCents: number;
  platformMatchNetRecipientDisbursedCents: number;

  platformMatchExposureReservedCents: number;
  platformMatchExposureReleasedCents: number;
  finalProjectDisbursementCents: number;

  settlementState:
    | 'pending'
    | 'captured_user_loss'
    | 'paid_platform_match'
    | 'released'
    | 'blocked'
    | 'failed'
    | 'settled';

  createdAt: string;
};
```

#### 11.7.10 `AtLeastTierAuditReport`

```ts
type AtLeastTierAuditReport = {
  id: string;
  roundId: string;

  calculationVersion: 'at_least_tier_platform_match_v0_1';
  rulebookHash: string;
  feePolicyHash: string;
  platformMatchPolicyHash: string;
  rewardScheduleHash: string;

  grossUserLossCapturedCents: number;
  userLossFeeCents: number;
  userLossNetRecipientCents: number;

  platformMatchReserveBackedCents: number;
  platformMatchExposureReservedCents: number;
  platformMatchGrossPaidCents: number;
  platformMatchFeeCents: number;
  platformMatchNetRecipientCents: number;
  platformMatchUnusedReleasedCents: number;

  ordinaryDirectPledgeNetCents: number;
  finalProjectDisbursementCents: number;

  eligibleCommitmentCount: number;
  winningCommitmentCount: number;
  losingCommitmentCount: number;
  excludedIdentityCount: number;
  excludedPaymentCount: number;
  excludedSybilCount: number;
  excludedSameControlCount: number;
  authorizationFailureCount: number;

  finalStatus: 'settled' | 'blocked' | 'canceled' | 'simulation_only';
  publicReportJson: unknown;
  publishedAt?: string;
};
```

### 11.8 Damped odds-based reward schedule

Reward rates must be monotone increasing by at-least tier. Higher tiers receive higher platform-match rates because they are harder to reach.

Definitions:

```text
T_k = net-recipient threshold for Tier k
q_k = frozen forecast probability that other eligible effective support reaches Tier k
o_k = (1 - q_k) / q_k = odds against reaching Tier k
r_k = platform-match reward rate for Tier k
r_min = minimum reward rate
r_max = maximum reward rate
gamma = damping exponent
```

Default parameters:

```text
r_min_bps = 500          // 5%
r_max_bps = 3500         // 35%
gamma = 0.5              // square-root odds
q_min_bps = 100          // 1%
q_max_bps = 9900         // 99%
min_reward_increment_bps = 1
fallback_mode = fail_closed
```

Formula, with tiers sorted by increasing threshold:

```text
q_k = frozen_forecast_probability_bps / 10000

o_k = (1 - q_k) / q_k

r_k =
  r_min
  + (r_max - r_min)
    * ((o_k ^ gamma - o_1 ^ gamma) / (o_K ^ gamma - o_1 ^ gamma))
```

Use deterministic decimal or rational arithmetic. Do not use binary floating point for persisted reward rates, money, reserve exposure, threshold resolution, or settlement-critical calculations.

Validation:

- tier thresholds must be strictly increasing;
- frozen `q_k` must be strictly decreasing as tiers get harder;
- `q_k` must be within `[q_min, q_max]`;
- `r_min_bps >= 0`;
- `r_max_bps <= 10000`;
- `r_min_bps < r_max_bps`;
- `gamma` must be between `0.5` and `0.7` inclusive;
- computed reward rates must be monotone increasing by tier;
- after rounding to basis points, reward rates must still be strictly increasing by at least `min_reward_increment_bps`;
- if rounding breaks monotonicity, deterministically bump later tiers by `min_reward_increment_bps` if this does not exceed `r_max_bps`; otherwise fail closed;
- if `o_K == o_1` or denominator is zero, fail closed in production;
- capped-geometric fallback is dev/test only unless separately approved.

Example expected output for frozen probabilities:

| Tier | Threshold | Frozen `q_k` | Reward rate |
|---|---:|---:|---:|
| Tier 1 | $1,000 | 75% | about 5% |
| Tier 2 | $3,000 | 55% | about 9% |
| Tier 3 | $5,000 | 35% | about 15% |
| Tier 4 | $10,000 | 20% | about 23% |
| Tier 5 | $25,000 | 10% | about 35% |

Persist the exact computed output in `DampedOddsRewardSchedule` and `PublicGoodTier` before the round opens. The schedule must be frozen before any hard commitment is accepted.

### 11.9 Effective support resolution rule

Do not compute tier outcomes from raw stated intended contributions when reward rates are below 100%. Raw stated contributions can overstate what will actually reach projects if users win and the platform-match rate is only a percentage of the user’s stated amount.

For each at-least-tier commitment `j`:

```text
user_loss_net_j = stated_net_recipient_cents_j
platform_win_net_j = platform_match_net_cents_j
guaranteed_effective_support_j = min(user_loss_net_j, platform_win_net_j)
```

Because reward rates are expected to be below 100%, this usually equals:

```text
guaranteed_effective_support_j = platform_match_net_cents_j
```

For ordinary direct CGPP-style hard pledges, if included in this non-MVP labs round:

```text
guaranteed_effective_support_j = net_recipient_cents_j
```

For each user `i`, compute:

```text
other_eligible_effective_support_i =
  sum guaranteed_effective_support_j
  for all eligible at-least-tier commitments and ordinary direct pledges j
  where j is not user i
  and j is not in user i's same-control cluster
```

User `i` wins if:

```text
other_eligible_effective_support_i >= threshold_net_recipient_cents[selected_tier_i]
```

Otherwise user `i` loses.

Same-control cluster exclusion:

- exclude the user’s own account;
- exclude accounts with the same `same_control_cluster_id`;
- exclude duplicate payment clusters if identity/Sybil policy says they are same-control;
- do not let one natural person satisfy another controlled account’s forecast.

Do not count:

- user `i`’s own commitment;
- same-control cluster commitments;
- sponsor match;
- platform-match payments;
- refund-bonus reserves or failure bonuses;
- unbacked reserve;
- fees;
- soft intents;
- draft commitments;
- payment-failed commitments;
- identity/Sybil-failed commitments;
- blocked or review-failed commitments;
- stale authorizations;
- final project disbursement after settlement.

The final project disbursement may exceed a tier threshold after losing users pay and winning platform matches are paid. That must not retroactively change forecast outcomes. Forecast outcomes are based only on the frozen resolution calculation.

### 11.10 Circularity guard

Required circularity test case:

```text
100 users each state $10.
Reward rate is 10%.
Tier threshold is $1,000.

Raw stated commitments = $1,000.
Guaranteed effective support = 100 * ($10 * 10%) = $100.

Tier 1 must not resolve as reached from raw stated commitments.
```

This guard is mandatory. A platform-match rate below 100% cannot be used to make raw stated contributions satisfy a tier threshold that will not be funded if everyone wins.

### 11.11 User flow

This is a labs/non-MVP flow. Do not expose it on the primary CGPP MVP pledge route.

Suggested labs routes:

```text
/labs/at-least-tier-platform-match
/labs/at-least-tier-platform-match/[roundSlug]
/labs/at-least-tier-platform-match/[roundSlug]/commit
/account/labs/at-least-tier-platform-match
```

Suggested admin routes:

```text
/admin/moral-public-goods/at-least-tier-platform-match
/admin/moral-public-goods/at-least-tier-platform-match/rounds
/admin/moral-public-goods/at-least-tier-platform-match/reward-schedule
/admin/moral-public-goods/at-least-tier-platform-match/resolution
/admin/moral-public-goods/at-least-tier-platform-match/settlement
/admin/moral-public-goods/at-least-tier-platform-match/audit
```

Do not add this feature to:

- primary public CGPP MVP card;
- current CGPP `Pool → Amount → Review` flow;
- ordinary moral-public-goods search top result;
- production onboarding;
- primary public navigation.

Labs/admin pages must show the persistent non-MVP banner.

#### Screen 1 — Pool and tiers

Show:

- reviewed public-good pool;
- 2–3 reviewed projects;
- tier thresholds;
- frozen reward rates by at-least tier;
- reserve status: backed / dev simulated / unavailable;
- sealed qualitative progress only;
- no exact live progress before close.

Tier display example:

```text
At least Tier 1 — $1,000 threshold — 5% platform match if your forecast is correct
At least Tier 2 — $3,000 threshold — 9% platform match if your forecast is correct
At least Tier 3 — $5,000 threshold — 15% platform match if your forecast is correct
At least Tier 4 — $10,000 threshold — 23% platform match if your forecast is correct
At least Tier 5 — $25,000 threshold — 35% platform match if your forecast is correct
```

#### Screen 2 — Amount and selected tier

Fields:

- selected at-least tier;
- stated intended contribution amount;
- optional viewpoint tag;
- visibility default `aggregate_only`.

Copy:

```text
Higher tiers have higher platform-match rates because they are harder to reach. The rates are frozen before the round opens using a reviewed schedule.
```

Show:

- if the user wins: platform contributes `[r_k * X]` to projects; user pays `$0`;
- if the user loses: user contributes `X` to projects;
- the user’s own commitment does not count toward their forecast result;
- same-control accounts do not count toward their forecast result;
- platform-match payments do not count toward forecast results;
- final project totals may be higher than the forecast-resolution total.

#### Screen 3 — Final review and payment setup

Required final consent copy:

```text
You are saving a hard, payment-backed platform-match commitment.

Selected forecast: at least Tier [K].
Your stated intended contribution if your forecast is not met: $[gross].
Estimated net to projects if you pay: $[net].
Platform-match rate if your forecast is met: [r_k]%.
Estimated platform contribution if your forecast is met: $[platform_match_net] net to projects.

If other eligible users' effective support reaches at least Tier [K], Moral Trade contributes the platform-match amount to the projects from a backed reserve, and you are charged $0.

If other eligible users' effective support does not reach Tier [K], you are charged $[gross], and approximately $[net] goes to the projects after fees.

Your own commitment and same-control accounts do not count toward your forecast result. Platform-match payments, sponsor match, fees, drafts, and failed payments do not count toward forecast results.

Saving your payment method is not a charge, not a hold, not escrow, not custody, not an authorization, and not a guarantee that authorization will later succeed.

This is a non-MVP labs mechanism.
```

Require explicit acknowledgement:

- I understand my own commitment does not count toward my forecast result.
- I understand that if I lose, I may be charged my stated contribution.
- I understand that if I win, the platform contributes the tier-specific match amount to the projects and I receive no direct payment.
- I understand this is non-MVP and may be simulation-only.

### 11.12 Payment and settlement

Default production behavior:

- no real payment authorization;
- no real capture;
- no real platform-match contribution;
- no real project disbursement;
- no provider operation refs created.

Dev/test behavior:

- simulated provider only;
- simulated ledger entries clearly marked simulated.

If later promoted for live money, settlement must work as follows.

Before resolution:

1. Close round to new commitments.
2. Recompute eligibility from server state.
3. Exclude ineligible, blocked, Sybil, duplicate, payment-failed, stale, or draft commitments.
4. Attempt exact authorization for each potentially user-payable commitment for the stated gross amount.
5. Exclude failed authorizations.
6. Recompute eligibility and effective support after authorization failures.
7. Verify platform-match reserve remains sufficient for maximum possible winning platform-match exposure.
8. Create `AtLeastTierResolutionSnapshot` and rows.

Resolution:

- For each eligible commitment `i`, compute `other_eligible_effective_support_i` using leave-one-cluster-out effective support.
- Compare it with the selected tier threshold.
- Mark commitment as `won_platform_pays` or `lost_user_pays`.

Settlement:

- For `won_platform_pays`:
  - release user authorization;
  - execute `PlatformMatchContributionOperation` from backed platform-match reserve;
  - route platform-match net amount to reviewed projects by frozen allocation weights.
- For `lost_user_pays`:
  - capture user authorization;
  - route user net-recipient amount to reviewed projects by frozen allocation weights;
  - release reserved platform-match exposure for that user.
- For `excluded`:
  - release authorization if any;
  - no platform-match contribution;
  - no user charge.

All operations must be idempotent. Retrying must not double-capture, double-release, double-pay platform match, or double-publish reports.

Use the existing ledger if present. If no ledger exists, implement minimal double-entry-style ledger entries for:

- user authorization;
- user capture;
- user release;
- platform-match reserve commitment;
- platform-match reserve disbursement;
- platform-match exposure release;
- project disbursement;
- fees;
- provider operation reconciliation.

### 11.13 Reserve and exposure rules

A platform-match reserve must be fully backed before the round opens.

Reserve exposure for commitment `i`:

```text
platform_match_exposure_reserved_cents_i = platform_match_gross_cost_cents_i
```

where `platform_match_gross_cost_cents_i` is the gross cost required for the platform to send `platform_match_net_cents_i` to projects after platform-paid or provider fees.

Round reserve invariant:

```text
sum(platform_match_exposure_reserved_cents for all hard_saved eligible commitments)
  <= PlatformMatchReserve.max_exposure_cents
  <= PlatformMatchReserve.backed_cents
```

If a new commitment would exceed the reserve exposure cap:

- reject the commitment or place it in draft/waitlist state;
- do not create a hard commitment;
- do not count it toward any threshold.

If reserve backing becomes blocked before settlement:

- block the round;
- release user authorizations;
- do not capture user loss payments;
- do not execute platform-match payments;
- publish only a blocked/non-MVP-safe report.

### 11.14 Accounting rules

Store and report these channels separately:

1. `forecastCommitmentGrossCents`
2. `forecastCommitmentNetRecipientCents`
3. `forecastResolutionOtherUserNetCents`
4. `selectedAtLeastTier`
5. `resolvedAtLeastTier`
6. `forecastWon`
7. `userPaidOnLossCents`
8. `platformPaidOnWinCents`
9. `platformMatchReserveBackedCents`
10. `platformMatchExposureReservedCents`
11. `platformMatchPaidCents`
12. `platformMatchReleasedUnusedCents`
13. `ordinaryDirectPledgeNetCents`
14. `finalProjectDisbursementCents`
15. `feesCents`

Do not merge platform-paid winning contributions with user-paid losing contributions into a single unlabeled impact number. Public reporting must separate user-paid loss funds, platform-paid win funds, ordinary direct pledges, sponsor match, fees, reserve exposure, and final project disbursement.

### 11.15 Copy preflight additions

Extend copy preflight to this mechanism.

Block ordinary user-facing copy containing:

```text
bet
wager
gamble
odds, unless in admin methodology docs only
profit
prize
lottery
investment
return
guaranteed return
cashback
free money
paid if right
payout to you
tax-deductible for platform-paid match
guaranteed match
objective impact
MVP
live
launch
real-money available
production-ready
```

Required ordinary copy:

- non-MVP labs warning;
- no direct user payout;
- if the user wins, platform contributes to projects;
- if the user loses, user contributes to projects;
- outcome computed from other eligible users’ effective support;
- own commitment and same-control accounts excluded;
- platform match does not count toward forecast results;
- production real money disabled unless promoted.

### 11.16 Admin workflow

Admin can:

- create draft labs round;
- configure reviewed public-good pool;
- configure tier thresholds;
- enter frozen forecast probabilities `q_k`;
- compute damped odds reward schedule;
- inspect reward schedule;
- freeze schedule;
- configure platform-match reserve;
- run copy preflight;
- run simulated commitments;
- run simulated authorization/resolution/settlement;
- view audit report;
- pause/kill-switch.

Admin cannot while feature is non-MVP in production:

- open public real-money round;
- accept public real-money commitments;
- authorize/capture real payments;
- execute live platform-match contributions;
- publish public report implying live product availability.

Admin blockers:

```text
feature_non_mvp
production_real_money_disabled
missing_promotion_record
invalid_damped_odds_schedule
schedule_not_frozen
reserve_unbacked
reserve_exposure_exceeded
copy_preflight_failed
legal_compliance_not_approved
payment_provider_not_ready
sybil_controls_not_ready
```

### 11.17 Seed data

Dev/test seeds only:

- one reviewed public-good pool;
- 5 tiers:
  - Tier 1: `$1,000`, `q = 75%`;
  - Tier 2: `$3,000`, `q = 55%`;
  - Tier 3: `$5,000`, `q = 35%`;
  - Tier 4: `$10,000`, `q = 20%`;
  - Tier 5: `$25,000`, `q = 10%`;
- reward schedule approximately `5%`, `9%`, `15%`, `23%`, `35%`;
- simulated backed platform-match reserve;
- commitments that produce winning outcomes;
- commitments that produce losing outcomes;
- same-control-cluster exclusion case;
- payment failure exclusion case;
- reserve insufficiency case;
- circularity test case.

No production seed may create active rounds, live commitments, backed reserves, or public routes for this feature.

### 11.18 At-least-tier acceptance tests

Feature classification tests:

1. Feature is `non_mvp`.
2. Default production visibility is false.
3. Production real money is false.
4. Live-money flag is false.
5. Promotion record is required.
6. Absent, rejected, or revoked promotion blocks real-money actions.

Route tests:

1. Public production route is hidden, 404, or unavailable.
2. Labs route shows non-MVP banner.
3. Feature is absent from primary CGPP MVP route.
4. Feature is absent from CGPP `Pool → Amount → Review` flow.
5. Feature is absent from primary moral-public-goods top card.

Damped odds schedule tests:

1. Computes expected rates for `q = 75%, 55%, 35%, 20%, 10%`.
2. Reward rates are strictly increasing.
3. `q` must strictly decrease with tier difficulty.
4. Thresholds must strictly increase.
5. Invalid `q` fails closed.
6. Denominator zero fails closed.
7. Binary floating point is not used for persisted schedule outputs.
8. Rounding preserves monotonicity or fails closed.
9. `r_max` cap is enforced.

Effective-support tests:

1. Tier resolution uses guaranteed effective support, not raw stated contribution.
2. Own commitment is excluded.
3. Same-control cluster is excluded.
4. Fees are excluded.
5. Platform-match payments are excluded.
6. Sponsor match is excluded.
7. Draft, payment-failed, and Sybil-failed commitments are excluded.
8. Ordinary direct hard pledges, if included, count by net-recipient amount.
9. Circularity example does not clear incorrectly.

Payment and settlement tests:

1. Production authorization is blocked while non-MVP.
2. Production capture is blocked while non-MVP.
3. Production platform-match contribution is blocked while non-MVP.
4. Dev simulated settlement can mark winners and losers.
5. Winners cause platform contribution to projects, not user payout.
6. Losers cause user contribution to projects.
7. Winner user authorization is released.
8. Loser authorization is captured.
9. Failed authorization excludes commitment and recomputes.
10. Settlement retries do not double-capture, double-release, or double-pay.
11. Reserve insufficiency blocks settlement.

Accounting tests:

1. User-paid loss funds are separated from platform-paid win funds.
2. Platform-match reserve backed, committed, paid, and released-unused amounts reconcile.
3. Final project disbursement separates user loss contributions, platform match, ordinary direct pledges, sponsor match, and fees.
4. Audit report does not call platform match “objective impact.”

Copy tests:

1. Ordinary UI does not contain bet/wager/profit/prize/lottery/investment/return/free money/cashback.
2. Ordinary UI states no direct user payout.
3. Ordinary UI states if win platform contributes to projects.
4. Ordinary UI states if lose user contributes.
5. Ordinary UI states own commitment and same-control accounts do not count.
6. Ordinary UI states non-MVP.

Admin and job tests:

1. Admin can compute/freeze schedule in labs.
2. Admin cannot open real-money round without promotion.
3. Admin cannot execute real settlement while non-MVP.
4. Admin blocker list includes invalid schedule and reserve unbacked.
5. Resolution job checks non-MVP gate.
6. Settlement job checks non-MVP gate before provider calls.
7. Scheduled close job can run simulation only in dev/test.
8. Public report job cannot publish live-product copy in production.

### 11.19 Documentation requirement

Create or update:

```text
docs/at-least-tier-platform-match-non-mvp.md
```

Top warning:

```text
Status: NON-MVP. This mechanism is not part of the Direct Capped CGPP MVP. Production public commitments, real-money authorization, capture, platform-match contribution, project routing, and settlement are disabled unless explicitly promoted through a later approval process.
```

Document:

- user promise;
- at-least-tier only;
- no exact-tier forecasts;
- no below/under forecasts;
- no direct user payout;
- damped odds schedule formula;
- `q_k` and odds definitions;
- reward schedule defaults;
- effective-support resolution rule;
- leave-one-cluster-out exclusion;
- payment/settlement sequence;
- reserve requirements;
- accounting channels;
- copy rules;
- tests;
- production gaps.

### 11.20 At-least-tier branch acceptance criteria

Implementation of this branch is complete only when:

- feature is explicitly non-MVP in code/config/docs;
- disabled by default in production;
- absent from the current CGPP MVP pledge path;
- absent from primary public MVP surfaces;
- live money is blocked unless separate live-money flag and approved promotion record exist;
- damped odds schedule computes and freezes monotone tier reward rates;
- higher tiers have higher platform-match reward rates;
- tier outcome uses other users’ eligible effective support, not raw stated contributions;
- own and same-control commitments are excluded from each user’s resolution;
- winners receive no direct payment;
- winners trigger platform contributions to reviewed projects only;
- losers contribute their stated amount to reviewed projects;
- platform-match reserve is fully backed before commitments open;
- settlement is idempotent and auditable;
- public reporting separates user-paid, platform-paid, fees, reserve, and final project disbursement;
- copy preflight blocks betting/investment/return language;
- tests cover feature gating, reward schedule, effective support, circularity, payment blocking, settlement, accounting, copy, routes, admin, jobs, and docs;
- lint, typecheck, tests, and build pass.


## 12. Abuse and failure-mode red-team

| Failure mode | Risk | Non-MVP mitigation |
|---|---|---|
| Bonus farming | Users pledge to likely-failing pools to collect bonuses. | Sealed progress, identity checks, bonus exposure caps, one bonus per natural person/payment cluster, small bonus ratios by default. |
| Sybil bonus harvesting | One actor creates many accounts to collect bonuses. | Human/identity verification, same-control exclusion, same-payment-cluster exclusion, prior-bonus-abuse state, fraud review. |
| Strategic failure sabotage | Users pledge and then coordinate to prevent different-view threshold from clearing. | Sealed progress, no exact gaps, abuse detection, no bonus for material collusion/sabotage. |
| Sponsor reserve underfunding | Users expect bonuses but reserve cannot pay. | Fully backed reserve before hard pledges, reserve cap, no public bonus copy unless reserve gate passed. |
| Financial-promotion misunderstanding | Users treat the bonus as investment/profit. | Copy preflight bans investment/interest/lottery/profit language; teach-back comprehension. |
| Payment method confusion | Saved card interpreted as charge/hold/escrow. | Same v135 copy invariants and final review. |
| Review-blocked bonus expectations | Users expect bonus when a pool is blocked for safety. | Public copy distinguishes qualifying support-threshold failure from blocked/canceled failure. |
| Dust supporter gaming | Tiny pledges satisfy supporter counts or earn bonuses. | Minimum net-recipient cents per supporter and bonus-eligible natural-person checks. |
| Unbounded bonus liability | Many tiny pledges create huge failure exposure. | Max bonus exposure cap, backed reserve, stop accepting pledges at cap. |
| Payout compliance failure | Bonus payouts create tax/KYC/payment issues. | Jurisdiction gating, payout provider readiness, unclaimed-bonus liability policy. |
| Bad public-good selection | Bonus mechanism increases funding for poor projects. | Reviewed registry, challenge gates, externality review, conflict review. |
| Threat-like proposal | Platform rewards harm creation or extortion. | Anti-threat hard gate and project-scope exclusions. |
| Stale mechanism copy | Users see old MVP/CRECM labels and misunderstand bonus rules. | Copy-preflight and non-MVP route isolation. |
| Minority moral-view discomfort | Different-view tags feel like moral identity collection. | Optional tags, aggregate-only default, no moral score copy. |
| Adversarial press framing | Product appears to pay users when charity fails. | Precise public explanation, caps, non-MVP status, audit report, no “free money” language. |

---

## 13. Metrics

### 13.1 Product metrics

Track:

- moral-public-goods search visits;
- labs-card click-through rate;
- pool-page completion rate;
- amount-screen completion rate;
- final-review completion rate;
- provider-confirmed payment-method rate;
- hard pledges saved;
- hard pledged gross cents;
- hard pledged net-recipient cents;
- cleared net-recipient cents;
- captured gross cents;
- number of verified supporters;
- number of distinct eligible viewpoint clusters;
- qualifying failures;
- nonqualifying failures;
- bonus-eligible pledges;
- bonus-ineligible pledges;
- bonus reserve utilization;
- bonus paid cents;
- bonus unclaimed cents.

### 13.2 Comprehension metrics

Ask mandatory or sampled comprehension questions before hard pledge or immediately after save:

```text
When can you be charged?
A. Immediately when I save my payment method.
B. Only after the round closes and all listed success gates pass.
C. Whenever the platform chooses.
```

```text
When can you receive the failure-participation bonus?
A. Any time the pool fails for any reason.
B. Only if I saved an eligible pledge and the pool fails for a bonus-eligible support-threshold reason.
C. Whenever I decide not to donate.
```

```text
What is the failure-participation bonus?
A. A donation receipt.
B. Investment interest.
C. A separate backed participation incentive, not project impact.
```

Pause if more than 5% answer charge timing incorrectly or more than 10% answer bonus eligibility incorrectly in a real-money pilot.

### 13.3 Safety metrics

Track:

- sybil flags;
- collusion flags;
- same-control exclusions;
- same-payment-cluster exclusions;
- bonus-abuse flags;
- prior-bonus-abuse exclusions;
- review blocks;
- challenge blocks;
- conflict-review flags;
- anti-threat flags;
- externality-review blocks;
- authorization failures;
- bonus payout failures;
- payment-copy incidents;
- bonus-copy incidents;
- stale-copy incidents;
- privacy incidents;
- exact-progress leak incidents;
- refund-bonus-open gate failures.

### 13.4 Accounting metrics

Track all channels in section 8.

---

## 14. Experiment plan

This is a **non-MVP staged experiment**, not a public real-money MVP.

### 14.1 Stage 0 — document and fake-door only

```text
Real money: off
Bonus payouts: off
User commitments: none
Goal: comprehension and willingness-to-pledge measurement
```

Success criteria:

- at least 85% understand charge timing;
- at least 80% understand bonus eligibility;
- at least 70% understand bonus is not impact/investment;
- no public-MVP route confusion.

### 14.2 Stage 1 — simulation with internal users

```text
Real money: off
Simulated pledge: on
Simulated bonus: on
Participants: internal/test users
```

Test both:

- `$0.50 pledge → $1 simulated bonus`; and
- `$25 pledge → 10% bonus capped at $2.50`.

Measure:

- comprehension;
- perceived trust;
- Sybil/farming exploit attempts in red-team setting;
- copy problems;
- accounting reconciliation.

### 14.3 Stage 2 — closed alpha, no public listing

```text
Real money: optional only if promoted for alpha
Users: invite-only, identity-verified
Pledge cap: $5–$25
Bonus: 5%–10%, capped at $0.50–$2.50
Round gross cap: $500–$2,500
Bonus exposure cap: $50–$250
```

Do not use `$0.50 pledge → $1 bonus` in real money at Stage 2 unless governance explicitly approves the high-ratio test.

### 14.4 Stage 3 — limited public pilot, if promoted

```text
Real money: enabled only after promotion record
Users: tightly capped public entry or invite-only
Pledge cap: $5–$50
Bonus: 5%–25%, capped at $0.50–$2.50
Round gross cap: $1,000–$5,000
Bonus exposure cap: explicitly backed
```

### 14.5 Pivot criteria

After each stage:

- If free-riding remains high despite bonus, test tiered thresholds or standing public-goods microfunds instead.
- If users are attracted primarily by bonus profit, lower the bonus ratio or stop.
- If Sybil/farming controls are costly relative to bonus value, stop or restrict to verified members.
- If bonus comprehension is low, return to direct capped CGPP.
- If legal/compliance review is uncertain, keep simulation-only.

---

## 15. Kill criteria

Pause refund-bonus pledge collection immediately if any of these occur:

1. Public route shows refund-bonus feature as MVP or live by default.
2. Bonus copy implies free money, guaranteed return, investment, interest, lottery, cashback, or donation receipt.
3. A pool displays failure bonus without backed reserve evidence.
4. A saved payment method is described as escrow, custody, hold, protection, reservation, or authorization.
5. Exact threshold, supporter, cluster, bonus-exposure, or success/failure probability gaps leak before close.
6. A review-blocked pool becomes pledgeable, authorizing, payable, bonus-payable, captured, or bonus-paid.
7. A project is discovered to be political campaign, lobbying, lifestyle, private-benefit, behavior-change, or threat-like.
8. A proposer/recipient/fiscal-host/bonus-sponsor/reviewer conflict is discovered after pledge collection but before capture/bonus payout and is not explicitly non-blocking.
9. Any payment provider behavior creates actual holds before close.
10. Failed authorization rows are not removed before recomputation.
11. The pool captures funds after falling below threshold on recomputation.
12. A bonus payout executes for a duplicate, Sybil, payment-failed, ineligible, or abuse-flagged user.
13. A bonus payout executes for a nonqualifying failure state.
14. Bonus exposure can exceed the backed reserve.
15. More than 5% of users answer charge timing incorrectly in a real-money pilot.
16. More than 10% of users answer bonus eligibility incorrectly in a real-money pilot.
17. Any privacy incident exposes donor-level viewpoint tags, bonus eligibility, payment state, or moral preferences without consent.
18. Any same-control, sybil, or same-payment-cluster issue materially affects supporter, different-view, or bonus counting.
19. Total potential capture can exceed the round gross cap.
20. Total potential bonus exposure can exceed the round bonus exposure cap.
21. Public copy uses stale current-product labels as active mechanism copy.
22. Copy preflight fails after hard pledge collection opens.
23. Hard pledge creation is possible while `RefundBonusOpenGate.state !== passed`.
24. Authorization is possible while round status is `open`, `closed_to_new_pledges`, or `reviewing`.
25. Capture is possible while round status is not `payable`.
26. Bonus payout is possible while round status is not `bonus_payable` or `bonus_paying`.

If a pause occurs after hard pledges but before authorization or bonus payout, keep all pledges uncharged, publish a concise status note, and require manual review before resuming.

If a pause occurs after authorization but before capture, release/cancel authorizations where possible and do not capture until the pause reason is resolved.

If a pause occurs after qualifying failure but before bonus payout, hold bonus liabilities and do not pay until the pause reason is resolved.

---

## 16. Migration from `moralpublicgoods135.md`

### 16.1 Migration objective

Create a **separate non-MVP branch** from the direct capped CGPP MVP.

Do not mutate the live MVP route into a refund-bonus route.

### 16.2 Keep from v135

Keep:

- reviewed public-good project registry;
- one-pool structure;
- two to three reviewed projects;
- sealed qualitative progress;
- provider-confirmed saved payment method;
- exact post-close JIT authorization;
- authorization failure removal and recomputation;
- sponsor match only if backed;
- separated accounting;
- aggregate audit;
- project-scope exclusions;
- anti-threat review;
- copy preflight;
- hard pledge open gating;
- lifecycle side-effect states;
- charge-comprehension tests.

### 16.3 Change from v135

Change:

| v135 direct capped CGPP | v136 refund-bonus branch |
|---|---|
| MVP | non-MVP labs/research branch |
| Failure outcome: no charge | Qualifying failure: no charge + backed bonus |
| Failure bonuses out of scope | Failure bonuses are the core non-MVP mechanism |
| `HardPledgeOpenGate` | `RefundBonusOpenGate` |
| No bonus accounting | Bonus reserve/liability/payout accounting |
| One-arm real-money MVP | staged simulation/closed-alpha/promotion path |
| Public route primary | hidden from primary MVP route by default |

### 16.4 Do not reintroduce stale labels

As in v135, do not use these as active mechanism copy:

```text
CRECM
CRECM v1.96
crecm_v1_125
Common Ground Budget
Common Ground Budget / Public Goods Fund
External CRECM module
moralpublicgoods102.md
Verified Assurance Matching demo
shadow preview
simulation
wish registry
Preview a Common Ground Budget
Open external CRECM module
```

Historical labels may exist only in an advanced drawer titled `Historical mechanism notes`, outside the pledge path.

---

## 17. Do-not-build constraints

### 17.1 No production MVP leakage

Do not build:

- public primary-card exposure by default;
- live-MVP placement above direct capped CGPP;
- real-money refund-bonus route without promotion;
- real-money at-least-tier platform-match route without promotion;
- refund-bonus CTA from the direct CGPP pledge path;
- at-least-tier platform-match CTA from the direct CGPP pledge path;
- silent conversion of v135 hard pledges into v136/v137 bonus-eligible or at-least-tier commitments.

### 17.2 No advanced allocation controls

Do not build in this branch:

- per-user counterparty buckets;
- per-project stances;
- per-project caps;
- conditional trade intents;
- coalition optimizer;
- algorithmic pool allocation changes after consent;
- user-defined fallback routing.

### 17.3 No extra direct-user payout or uncontrolled reward surfaces

Do not build:

- direct user success rewards;
- user cash payouts for at-least-tier outcomes;
- peer-to-peer wagering;
- exact-tier rewards;
- below-tier or under-tier rewards;
- coordination credits;
- impact certificates;
- diversity-aware bonus match;
- QF-like bonus scoring;
- tradable impact claims;
- public moral reputation.

The only added user-facing incentive surfaces in this file are:

1. the backed failure-participation bonus defined for the refund-bonus branch; and
2. the at-least-tier platform-match contribution defined in section 11, where any winning platform match is paid to reviewed projects, never to the user.

Neither branch authorizes direct user payout for success, profit, investment return, lottery, betting, wagering, or cashback copy.

### 17.4 No unsafe project categories

Do not build or allow:

- political campaign offsets;
- campaign donations;
- lobbying trades;
- lifestyle trades;
- behavior-change promises;
- private-benefit projects;
- pay-to-stop-harm proposals;
- threat-like proposals;
- coercive or extortionary proposals.

### 17.5 No misleading copy

Do not use active-product copy that implies:

- escrow;
- custody;
- held funds;
- reserved user funds;
- guaranteed match;
- guaranteed impact;
- guaranteed bonus outside qualifying failure;
- tax treatment;
- legal advice;
- moral ranking;
- moral reputation power;
- exact live pivotality;
- investment return;
- interest;
- lottery;
- current CRECM mechanism status.

---

## 18. Open questions and cruxes

1. **Bonus ratio:** What bonus ratio improves participation without attracting primarily bonus-farming users?
2. **Qualifying failures:** Should different-view threshold failure be bonus-eligible by default, or only net-recipient threshold shortfall?
3. **Comprehension:** Can users distinguish no-charge-if-fail, failure bonus, and ordinary refunds?
4. **Legal treatment:** How should failure bonuses be characterized for tax, payment-provider, promotional, and consumer-protection purposes?
5. **Sybil cost:** Is the cost of preventing bonus farming larger than the free-rider-mitigation benefit?
6. **Moral optics:** Does paying users when a public-good pool fails undermine trust or make the mechanism look unserious?
7. **Sponsor willingness:** Will sponsors back failure bonuses, given that money is spent when the public good is not funded?
8. **Dominance claim:** Under what exact parameterization, if any, can the product safely claim dominant-assurance properties?
9. **At-least-tier reward schedule:** How should frozen tier probabilities be estimated without creating gaming or false precision?
10. **Effective-support accounting:** How much user comprehension is lost by using effective support rather than raw stated contribution for tier resolution?
11. **Platform-match reserve willingness:** Will funders or platform sponsors back tiered project contributions when user payments are avoided in success states?
12. **Tier-selection behavior:** Do users choose higher tiers when rates rise nonlinearly, or do most still select the lowest tier?
13. **Alternative mechanisms:** Would tiered thresholds, sponsor gap-fill, access-conditioned public-goods contribution, or at-least-tier platform match outperform refund bonuses with lower abuse risk?
14. **Scaling:** Do bonus costs and platform-match reserve costs scale acceptably beyond small capped rounds?

---

## 19. Acceptance tests

### 19.1 Feature classification tests

1. `cgpp_refund_bonus_non_mvp_v0_1` is classified as `non_mvp`.
2. `refund_bonus_live_money_enabled` defaults to false in production.
3. Production public visibility defaults to false.
4. Production real-money movement defaults to false.
5. Feature is absent from primary live CGPP MVP surfaces.
6. Feature requires a valid `FeaturePromotionRecord` for any production real-money use.

### 19.2 Copy and migration tests

1. No active public page says the feature is MVP or live by default.
2. No active public page says `free money`, `investment`, `interest`, `lottery`, `guaranteed return`, or `cashback`.
3. Bonus copy says the bonus is backed, conditional, and not impact.
4. Bonus copy distinguishes qualifying support-threshold failure from blocked/canceled/review failure.
5. No exact progress gaps display before close.
6. No page says saved funds are held, escrowed, protected, reserved, authorized, or guaranteed.
7. Viewpoint tag copy says the tag is not a moral score and does not affect power.
8. Latest `CopyPreflightReport` was generated after the last deploy affecting moral-public-goods routes.
9. `RefundBonusOpenGate.state` remains `failed` if prohibited active labels appear outside the historical drawer.

### 19.3 User-flow tests

1. A signed-out user can identify that no charge happens now.
2. A signed-in labs user can create a hard pledge in no more than three decision screens.
3. A user cannot create a hard pledge without final review consent.
4. A user cannot create a hard pledge without bonus-term acknowledgement.
5. A user cannot create a hard pledge without provider-confirmed payment method.
6. A user cannot pledge above the participant cap.
7. A user cannot pledge after the round gross capture cap is reached.
8. A user cannot pledge after the round bonus exposure cap is reached.
9. A user cannot create a hard pledge when `RefundBonusOpenGate.state !== passed`.
10. A user sees one receipt/timeline that distinguishes success charge from failure bonus.

### 19.4 Clearing tests

1. Pool succeeds if net-recipient, verified-supporter, different-view, review, sponsor, bonus-reserve, and authorization gates pass.
2. Pool has qualifying failure if net-recipient threshold is short and all non-threshold gates are nonblocking.
3. Pool has qualifying failure if verified-supporter threshold is short and the frozen rulebook includes that failure mode.
4. Pool has qualifying failure if different-view cluster threshold is short and the frozen rulebook includes that failure mode.
5. Pool has nonqualifying failure if review blocks.
6. Pool has nonqualifying failure if anti-threat review blocks.
7. Pool has nonqualifying failure if bonus reserve is unbacked.
8. `prefer_not_to_say` does not count as a distinct viewpoint cluster.
9. Same-control and same-payment-cluster duplicates do not increase supporter, cluster, or bonus counts.
10. Fees do not satisfy thresholds or match eligibility.
11. Open blocking challenge prevents authorization and bonus payout.
12. Sponsor match cannot be active without backing.
13. Failed authorization rows are removed and thresholds are recomputed.
14. If recomputation fails, successful authorizations are released/canceled and no capture occurs.
15. Default payment-failure-caused failure does not pay bonuses unless frozen rulebook says otherwise.

### 19.5 Bonus calculation tests

1. Fixed bonus mode computes `min(fixedBonusCents, perUserBonusCapCents)`.
2. Percentage mode computes `min(maxGrossCents * bonusRatioBps / 10000, perUserBonusCapCents)` with deterministic rounding.
3. `$0.50 pledge → $1 bonus` works in simulation under fixed-cents mode.
4. `$25 pledge → 10% capped at $2.50` computes $2.50.
5. Bonus exposure cannot exceed backed reserve.
6. Bonus reserve is released unused when pool clears.
7. Bonus reserve is not counted as project funding.
8. Bonus payout is idempotent; retries do not double-pay.

### 19.6 Payment and lifecycle tests

1. Saving a payment method creates no authorization.
2. Authorization is attempted only after close and success gates.
3. Authorization cannot occur while round status is `open`, `closed_to_new_pledges`, or `reviewing`.
4. Capture cannot occur unless round status is `payable`.
5. Bonus payout cannot occur unless round status is `bonus_payable` or `bonus_paying`.
6. Wrong-amount authorization is rejected.
7. Short-expiring authorization is rejected.
8. Expired authorization is rejected.
9. Capture occurs only from exact authorized rows while the pool remains payable.
10. Bonus payout operation has unique idempotency key.

### 19.7 Audit tests

1. Public report separates gross, fee, net-recipient, actual/gross exposure, counted, match-eligible, sponsor match, bonus reserve, bonus liability, bonus paid, bonus held, bonus unearned released.
2. Public report includes final status and reason codes for no-charge failures.
3. Public report does not expose donor-level viewpoint tags.
4. Public report does not expose donor-level bonus eligibility or payout status.
5. Public report does not expose exact pre-close progress logs.
6. Success receipts include rulebook hash, fee-policy hash, bonus-policy hash, round id, pool id, authorization reference, capture reference, and calculation version.
7. Qualifying-failure receipts include bonus reserve id, bonus amount, payout state, rulebook hash, bonus-policy hash, round id, pool id, and calculation version.

### 19.8 Abuse tests

1. Duplicate same-control users cannot collect multiple bonuses.
2. Duplicate payment-cluster users cannot collect multiple bonuses.
3. Sybil-blocked users cannot collect bonuses.
4. Prior-bonus-abuse-blocked users cannot collect bonuses.
5. Collusion-flagged users are reviewed before bonus payout.
6. Payout provider cannot execute bonus payout when emergency pause is active.
7. Bonus route fails closed if legal/compliance state is not approved.
8. Bonus payout is blocked for safety/review/legal-blocked failure states.

---


### 19.9 At-least-tier platform-match tests

1. Feature is `non_mvp`, disabled by default, and blocked from production real-money movement without promotion.
2. Public production routes are hidden, unavailable, or 404.
3. Labs routes show the persistent non-MVP warning.
4. Feature does not appear in the direct capped CGPP MVP pledge path.
5. Damped odds schedule computes approximately `5%, 9%, 15%, 23%, 35%` for `q = 75%, 55%, 35%, 20%, 10%` under default parameters.
6. Reward rates strictly increase with tier difficulty.
7. Invalid tier thresholds, non-decreasing probabilities, invalid `q`, denominator zero, invalid gamma, and rounding failures fail closed.
8. Resolution uses leave-one-cluster-out eligible effective support, not raw stated contribution.
9. A user's own commitment and same-control cluster commitments do not satisfy that user's selected tier.
10. Fees, sponsor match, platform-match payments, refund-bonus reserves, soft intents, drafts, failed payments, and stale authorizations are excluded from forecast resolution.
11. Circularity test case with 100 users × $10 at 10% platform match produces $100 effective support, not $1,000.
12. Winners receive no direct payment and instead trigger platform contributions to reviewed projects.
13. Losers contribute their stated amount to reviewed projects.
14. Winner authorizations are released; loser authorizations are captured only in promoted live-money mode.
15. Settlement retries do not double-capture, double-release, double-pay platform match, or double-publish reports.
16. Public audit separates user-paid loss funds, platform-paid win funds, ordinary direct pledges, sponsor match, fees, reserves, and final project disbursement.
17. Ordinary user-facing copy does not contain betting, wagering, profit, prize, lottery, investment, return, cashback, or user-payout language.

## 20. Source anchors

The background rationale remains:

- moral public goods are underfunded because of free-riding and coordination failure;
- direct capped CGPP solves assurance risk but not all free-riding incentives;
- refund-bonus / dominant-assurance mechanisms can make participation more attractive in failure states;
- voluntary mechanisms should be narrow, reviewed, privacy-preserving, and defense-favoured;
- payment, review, anti-threat, sponsor-backing, bonus-backing, sealed-disclosure, Sybil controls, and separated accounting constraints are safety requirements, not optional UX complexity.

Reference anchors for this branch:

- Toby Ord, “Moral Trade” — moral trade as gains from exchange made possible by different moral views.
- Forethought, “Moral public goods are a big deal for whether we get a good future” — moral public goods, free-riding, and coordination.
- Tabarrok (1998), dominant assurance contracts — refund-bonus logic for public goods provision.
- Refund-bonus crowdfunding literature — empirical and mechanism-design context for failure bonuses.
- Tiered assurance and platform-match experiments — mechanism-design context for increasing local pivotality and reducing free-riding without direct user payout.

This file defines non-MVP refund-bonus and at-least-tier platform-match branches. It does not authorize production launch or modify the current direct capped CGPP MVP path without a later promotion decision.
