# Coalition-Routed Escrowed Conditional Matching (CRECM v1.3)

**Target:** `moraltrade.org`
**Audience:** Codex GPT-5.5-xhigh
**Purpose:** Implement the concrete moral-public-goods funding mechanism described below.

---

## 0. Executive Build Target

Build **Coalition-Routed Escrowed Conditional Matching v1.3** in `moraltrade.org`.

- **Abbreviation:** CRECM
- **User-facing label:** Common Ground Budget
- **Technical label:** CRECM v1.3

CRECM is not pure ECM, pure VCQA, pure assurance funding, pure quadratic funding, or the current MPGF pilot. It is an **ECM-core hybrid**:

> Verified users set a **Common Ground Budget** and explicit project stances. The platform converts strong and weak cross-view support into **batch-cleared conditional pledges**. Cleared funds are held through **supervised escrow / custody or just-in-time authorization**. Sponsor funds provide a **precommitted base match** plus a **capped diversity-aware bonus** only after hard review gates pass. Failed projects trigger refund, reroute, carry-forward, or a tightly capped failure credit.

For `moraltrade.org`, the target is a voluntary Toby-Ord-style moral-trade platform. Under that constraint, CRECM is the concrete mechanism to build.

### 0.1 Improvements from `moralpublicgoods6.md`

This revision changes the mechanism only where the improvement case is above 50% credence. The changes are mechanism-level, not merely editorial:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Separate **actual dollars**, **counted dollars**, and **match-eligible dollars** throughout clearing and matching | 0.84 | Prevents accounting ambiguity, avoids letting low-confidence or over-cap contributions unlock disproportionate match, and preserves the distinction between real payout dollars and subsidy/allocation power. |
| Forbid **self-matching** and same-participant counterparty satisfaction | 0.82 | A donor must not be able to satisfy their own cross-view condition by splitting allocations across buckets or accounts. |
| Require **sponsor-pool precommitment and rule locks** before a round opens | 0.76 | Prevents phantom matching, mid-round rule changes, and donor-facing uncertainty about whether match funds are real. |
| Add explicit **user priority ordering, default abstain, and recurring-budget cancellation consent** | 0.68 | Reduces accidental allocation, preserves user autonomy, and improves trust for recurring Common Ground Budgets. |
| Add **conflict-of-interest and self-dealing review** for recipients, sponsors, reviewers, and project proposers | 0.64 | Reduces capture, undisclosed influence, and legitimacy failures in a morally pluralist funding mechanism. |
| Add **parameter-freeze and safety-freeze rules** for rounds | 0.71 | Makes the round auditable and prevents opportunistic changes while preserving an emergency stop for safety blockers. |

### 0.2 Improvements from `moralpublicgoods7.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are mainly consistency and exploit-prevention fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Use **match-eligible dollars**, not counted or actual dollars, as the input and cap for the capped diversity-aware bonus | 0.93 | The previous text said the bonus used match-eligible dollars but the formulas still referenced `countedContribution` and capped bonus by deprecated `directClearedCents`; that could let non-match-eligible dollars unlock or cap sponsor bonus. |
| Add missing **conflict-review** and **sponsor-pool-state** fields to the data model and hard-gate pipeline | 0.90 | The mechanism already required these gates, but the data model and Stage 1 pipeline did not expose all fields needed to implement them deterministically. |
| Normalize identity weights from **basis points** before multiplying contribution values | 0.91 | The data model stores `countedWeightBps`; formulas that multiply directly by the raw bps value would be off by a factor of 10,000. |
| Remove the stale `allocatedCents`/`countedContribution` accounting alias from the router and use explicit actual/count/match-eligible variables | 0.89 | Prevents implementers from accidentally reintroducing the ambiguity v1.1 was intended to remove. |
| Align failure-credit formulas, tests, and acceptance criteria with **match-eligible** failed intent and with conflict-review blocking | 0.88 | Failure credit should not be unlocked by non-match-eligible or conflict-blocked allocations. |

### 0.3 Improvements from `moralpublicgoods8.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes close implementation gaps that could otherwise make the mechanism easier to game or harder to implement deterministically:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Enforce **identity-weight thresholds** explicitly in formulas and clamp basis-point weights to `[0, 10_000]` before normalization | 0.94 | v1.2 listed minimum identity thresholds but formulas did not actually enforce them, leaving room for low-confidence accounts to count or unlock match. |
| Require project-level **sponsor compatibility** and **conflict-review nonblocking state** in Stage 1 hard gates | 0.92 | v1.2 had these fields but the hard-gate code checked only round-level sponsor state and allowed `conflictReviewState: "review"` to pass. |
| Add `perProjectCapCents`, `nextCaptureAt`, and `nextCaptureRule` to `CommonGroundBudget` and enforce them in candidate allocation | 0.89 | The user-facing mechanism requires per-project caps and visible next-capture rules, but the data model and Stage 2 formula did not store or enforce them. |
| Specify optimizer objectives in terms of **match-eligible cross-view dollars** before actual payout dollars | 0.88 | Counterparty satisfaction and subsidy integrity depend on match-eligible participation; optimizing an ambiguous “cross-view cleared cents” objective could reintroduce actual/count/match-eligible confusion. |

---

## 1. Rationale

Forethought's core point is that moral public goods can generate large gains from trade: if many people value a shared good somewhat, coordination can make each participant's contribution behave like a large discount on the consensus good.

But Forethought is also pessimistic about simple voluntary mechanisms. Moral public goods are underfunded because each person prefers that others fund them while keeping their own resources; assurance contracts are brittle at realistic population sizes; dominant assurance helps only partially; and quadratic funding depends on an outside matching pool.

Therefore, the mechanism must not be pure assurance, pure QF, pure matching, or social norms. It needs:

- conditional coordination,
- matching,
- verification,
- cross-view trade structure,
- explicit anti-threat safeguards,
- low-friction user routing,
- and reproducible auditability.

Forethought's *Convergence and Compromise* adds that moral trade can create large gains where groups with different moral views bargain or compromise, but only if the right institutions exist. It also warns that threats can destroy much of the value of moral trade, so this system must block extortionary “pay me or I will do harm” dynamics.

Toby Ord's conception of moral trade also points toward a market-like institution: moral trade is trade made possible by differences in parties' moral views, and richer market-like structures can recover otherwise-lost moral surplus.

The current moraltrade.org MPGF is already in the right design family: it uses verified contribution intents, conditional payment authorization, sponsor matching, dissent notes, and reviewer verification. But the exact build target should preserve Moral Trade's review and anti-threat stack while replacing the campaign-by-campaign assurance flow with **round-based coalition-routed escrowed conditional matching**.

---

## 2. Non-Negotiable Invariants

Preserve these invariants:

1. No global moral ranking.
2. Moral reputation must not increase allocation power.
3. Anti-threat and baseline-integrity rules are hard blocking gates.
4. Action evidence, baseline confidence, and externality review remain separate concepts.
5. Public pages remain privacy-safe and aggregate-first.
6. Do not expose private donor-level moral stances except according to explicit visibility settings.
7. Do not create any “pay me or I will do harm” pathway.
8. Do not support political campaign trades, lifestyle trades, or behavior-change promises in v1.
9. Do not claim escrow/custody unless a legally valid custody/escrow/payment partner is active.
10. All allocation results must be reproducible from stored input bundles and calculation-version hashes.
11. Keep **actual captured dollars**, **counted contribution dollars**, and **match-eligible dollars** separate in data, calculations, public reporting, and tests.
12. Do not publish a donor-facing match schedule unless the sponsor pool is funded, escrowed, or contractually committed through an auditable sponsor route.
13. A participant's own contributions, linked accounts, or same-control entities must never satisfy that participant's counterparty-volume condition.
14. Recurring Common Ground Budgets require explicit informed consent, easy cancellation, and a visible next-capture rule.
15. Recipient, sponsor, reviewer, and proposer conflicts of interest must be reviewed and logged before a project can become payable.
16. Round parameters are frozen once a round opens, except for an auditable safety freeze or cancellation.

---

## 3. Build Objective

Implement a moral-public-goods funding mechanism with these components:

1. Common Ground Budget setup.
2. Strong / weak / dissent / abstain project stances.
3. Explicit cross-view conditional pledge constraints.
4. Batch-cleared coalition routing.
5. Hard review gates.
6. Precommitted base matching.
7. Capped diversity-aware post-clear bonus matching.
8. Supervised custody or just-in-time manual authorization/capture.
9. Separate actual, counted, and match-eligible accounting.
10. Sponsor-pool precommitment and round-parameter locking.
11. Refund / reroute / carry-forward / release-hold failure handling.
12. Public audit bundles and privacy-safe round reports.

---

## 4. User-Facing Mechanism

Each user sets a per-round or monthly **Common Ground Budget**.

For every public-good project or pool, the user marks one of four stances:

| Stance | Meaning | Allocatable? |
|---|---|---:|
| **Strong support** | “I actively want to fund this.” | Yes |
| **Weak common-ground support** | “I do not top-rank this, but I will support it if enough morally different others also do.” | Yes |
| **Dissent / review needed** | “I object, or this needs externality review.” | No; increases review pressure |
| **Abstain** | “No signal.” | No |

Each user also sets:

| Field | Meaning |
|---|---|
| `round_budget_cents` | Maximum total spend this round |
| `budget_period` | `one_time`, `per_round`, or `monthly`; recurring budgets require explicit consent and cancellation controls |
| `per_project_cap_cents` | Maximum exposure to any one project |
| `rank_order` | User's priority ordering among projects/pools when not all approved allocations can clear |
| `acceptable_counter_buckets[]` | Which morally distinct buckets can satisfy the trade condition |
| `min_counterparty_volume_cents` | Minimum morally distinct counter-support required |
| `fallback_rule` | `refund`, `reroute`, `carry_forward`, or `release_hold` |
| `visibility_pref` | `public`, `pseudonymous`, `aggregate_only`, or `private` |
| `recognition_opt_in` | Optional social proof; never required |
| `fee_acknowledgement` | User-facing acknowledgement of platform, payment, fiscal-host, and recipient-routing fees if any |

This implements the core insight: **weak common-ground support becomes spendable budget**, not merely a ranking signal.

Default stance is **abstain**. Do not infer allocatable support from browsing, profile data, background networking, or past giving. Weak support is spendable only when the user explicitly selected it and set a cap.

---

## 5. Project Eligibility

A project can enter a round only if it has:

| Requirement | Rule |
|---|---|
| Eligible good type | Moral public good, not private benefit |
| Recipient | Registered nonprofit, fiscal host, or signed auditable disbursement route |
| Moral bucket | Example buckets: global health, animal welfare, existential risk, public-interest knowledge, institutional resilience |
| Review state | Approval-compatible |
| Anti-threat state | No blocker |
| Externality review | No unresolved severe objection |
| Destination proof | Payout route verified |
| Sponsor-pool compatibility | Any promised base/bonus/failure match for the project is funded, escrowed, or contractually committed before round open |
| Conflict review | Recipient, sponsor, reviewer, proposer, and fiscal-host conflicts are disclosed, reviewed, and non-blocking |
| Milestone plan | Required for nonstandard grants |
| Public summary | Privacy-safe and reviewable |

Moral Trade's current validation structure separates narrow evidence certification from broad moral worth, legal enforceability, tax treatment, escrow status, or final impact. CRECM must preserve that separation.

---

## 6. Round Structure

Each round has fixed dates.

Default v1 cadence:

| Parameter | Default |
|---|---:|
| Round length | 14 days |
| Review freeze | 48 hours before round close |
| Challenge window | 72 hours after preliminary clearing |
| Capture / escrow window | After clearing + review |
| Payout release | After challenge closure and destination verification |

Rounds must not require unanimity or near-unanimity. They should clear **partial coalitions** that satisfy donor constraints and project thresholds.

Before a round opens, the platform must publish and freeze the round rulebook: eligible projects, moral buckets, threshold rules, base-match ratio, bonus formula, failure-credit rule, sponsor-pool size, donor caps, identity-counting policy, challenge deadlines, and calculation version. After opening, parameters may change only through a public safety freeze or cancellation event that invalidates affected preliminary calculations.

---

## 7. Hard Gates

A project can clear only if all hard gates pass:

```text
project.review_state is approval-compatible
project.challenge_state is clear or non-blocking
project.destination_proof_state is verified
project.anti_threat_state is clear
project.externality_state has no unresolved severe blocker
project.conflict_review_state is clear or non-blocking
round.sponsor_pool_state is funded, escrowed, or contractually committed
actual_cleared_amount >= project.minimum_viable_cents
match_eligible_cleared_amount >= threshold_amount
verified_supporter_count >= threshold_supporter_min
active_moral_cluster_count >= threshold_cluster_min
```

Default v1 thresholds:

| Threshold | Default |
|---|---:|
| `threshold_supporter_min` | 3 |
| `threshold_cluster_min` | 2 |
| `donor_counted_cap_cents` | Configurable; default $100 |
| `identity_weight_min_for_counting` | 0.75 |
| `identity_weight_min_for_bonus` | 1.0 |

A contribution below `identity_weight_min_for_counting` is treated as `counted_contribution_cents = 0` for threshold, supporter, and cluster-counting purposes. A contribution below `identity_weight_min_for_bonus` is treated as `match_eligible_cents = 0` for base-match, bonus-match, counterparty-volume, and failure-credit purposes.

Moral reputation must never increase allocation power.

### 7.1 Accounting Definitions

Use three separate monetary quantities throughout the mechanism:

| Quantity | Meaning | Used for |
|---|---|---|
| `actual_allocated_cents` / `actual_cleared_cents` | Real donor dollars the user is willing to pay and that may be captured if all gates pass | Recipient payout, user exposure, receipts |
| `counted_contribution_cents` | Cap-limited and identity-weighted contribution amount | Threshold eligibility, supporter/cluster breadth, anti-sybil counting |
| `match_eligible_cents` | The portion of counted contribution eligible to unlock sponsor base match and bonus match | Sponsor match claims and QF-style bonus formula |

Never use raw actual dollars to unlock sponsor matching unless they are also match-eligible. Never reduce the actual payout receipt merely because a donor has an identity weight below 1.0; instead, reduce or block that donor's counting and match-unlocking power.

---

## 8. Coalition-Routing Algorithm

The router has two jobs:

1. Find threshold-feasible coalitions.
2. Clear only cross-view conditional commitments that satisfy donor constraints.

For each user-project pair, first compute actual user exposure, then separately compute counted and match-eligible quantities. Identity weight is stored in basis points and must be normalized before multiplication:

```ts
const identityWeight = clamp(
  identityEligibility[userId].countedWeightBps,
  0,
  10_000
) / 10_000

const countingEligible =
  identityWeight >= round.identityWeightMinForCounting

const bonusEligible =
  identityWeight >= round.identityWeightMinForBonus

const stanceCap = min(
  supportStance.maxAllocCents,
  supportStance.maxAllocPct == null
    ? Infinity
    : commonGroundBudget.totalBudgetCents * supportStance.maxAllocPct
)

const actualAllocCents = min(
  user.roundBudgetRemaining,
  commonGroundBudget.perProjectCapCents,
  project.remainingRequestedCap,
  stanceCap
)

const countedContributionCents =
  countingEligible
    ? min(actualAllocCents, round.donorCountedCapCents) * identityWeight
    : 0

const matchEligibleCents =
  bonusEligible &&
  identityEligibility[userId].sybilRiskState === "clear" &&
  identityEligibility[userId].collusionRiskState === "clear"
    ? min(countedContributionCents, round.donorCountedCapCents)
    : 0
```

Allowed stances:

```text
strong = allocatable
weak = allocatable
dissent = not allocatable, adds review pressure
abstain = not allocatable
```

Default stance weights:

```ts
const stanceWeights = {
  strong: 1.0,
  weak: 0.6,
  dissent: 0.0,
  abstain: 0.0,
} as const
```

Store these quantities separately:

```ts
actualAllocation[userId][projectId] = actualAllocCents
countedContribution[userId][projectId] = countedContributionCents
matchEligibleContribution[userId][projectId] = matchEligibleCents
```

The optimizer should maximize:

```text
Primary objective:
  maximize total match-eligible cross-view cleared cents

Secondary objective:
  maximize actual cleared cents to verified public-good recipients

Tertiary objective:
  maximize number of cleared moral clusters

Quaternary objective:
  maximize weak-support-to-counted-dollar conversion

Guardrail:
  never clear a pledge unless its counterparty constraints are satisfied
```

A user's allocation to project `p` clears only if:

```ts
counterpartyVolumeCents(userId, projectId) >= minCounterpartyVolumeCents(userId, projectId)
```

where `counterpartyVolumeCents` counts **match-eligible cleared dollars** in projects whose moral bucket is in `acceptableCounterBucketIds`.

`counterpartyVolumeCents` must exclude the participant's own contributions, linked accounts, same-payment-method accounts, same-control entities, and any account cluster under active sybil/collusion review. A user cannot satisfy their own moral-trade condition by splitting one budget across multiple buckets.

Verified supporter counts and active moral-cluster counts are computed from positive `countedContributionCents` after identity, sybil, collusion, conflict, and self-matching exclusions. Sponsor matching and counterparty-volume satisfaction are stricter: they use positive `matchEligibleCents`.

When not all user-approved allocations can clear, the router must respect the user's explicit `rank_order` before using global optimization tie-breakers. The global optimizer may not allocate a lower-ranked weak-support stance ahead of a higher-ranked strong-support stance unless the user explicitly opted into unrestricted coalition routing for that round.

A trade counts as **moral trade** only when the counter-support comes from sufficiently distinct moral buckets.

---

## 9. Matching

### 9.1 Base Match

Base match is precommitted and donor-visible before the round opens.

Default:

```ts
const baseMatchRatio = 1.0
```

For each cleared project:

```ts
baseMatchClaim[projectId] =
  matchEligibleClearedCents[projectId] * baseMatchRatioByProject[projectId]
```

If the base pool is insufficient:

```ts
baseMatch[projectId] =
  (baseMatchPoolRemaining * baseMatchClaim[projectId]) /
  sumBaseMatchClaimsForAllClearedProjects
```

Base match applies only after hard gates pass. Base match is never unlocked by non-verified, over-cap, self-matched, or collusion-discounted contributions, even if those actual dollars are still captured and paid to the recipient.

### 9.2 Capped Diversity-Aware Bonus

Do not use pure QF as the core mechanism. Use QF only as a **secondary, capped, post-clear bonus**.

Raw score uses match-eligible contributions as the input:

```ts
qfRaw[projectId] =
  Math.pow(
    sumUsers(Math.sqrt(matchEligibleContribution[userId][projectId] * stanceWeight[userId][projectId])),
    2
  ) - sumUsers(matchEligibleContribution[userId][projectId])
```

Diversity factor:

```ts
clusterDiversity[projectId] = normalizedEntropy(clusterShareDistribution[projectId])

dissentPressure[projectId] = Math.min(
  1,
  dissentCount[projectId] / reviewPressureThreshold
)

diversityFactor[projectId] = clamp(
  1 + alpha * clusterDiversity[projectId] - beta * dissentPressure[projectId],
  0.75,
  1.25
)
```

Defaults:

```ts
const alpha = 0.20
const beta = 0.20
const gamma = 0.50
const weakWeight = 0.60
const bonusCapMultiple = 1.0
const baseMatchRatio = 1.0
```

Anti-manipulation discount:

```ts
antiManipulationDiscount[projectId] = clamp(
  1 - gamma * collusionRiskScore[projectId],
  0,
  1
)
```

Adjusted score:

```ts
qfAdjusted[projectId] = Math.max(
  0,
  qfRaw[projectId] * diversityFactor[projectId] * antiManipulationDiscount[projectId]
)
```

Bonus allocation:

```ts
bonusMatch[projectId] =
  (bonusPool * qfAdjusted[projectId]) /
  sumQfAdjustedForAllClearedProjects
```

Hard cap:

```ts
bonusMatch[projectId] <= matchEligibleClearedCents[projectId] * bonusCapMultiple
```

---

## 10. Failure Handling

Failure bonuses must be small, secondary, and not lottery-like.

Default failure handling:

```text
if project fails before capture:
  release authorization
  execute user fallback_rule
```

Allowed fallback rules:

| Rule | Behavior |
|---|---|
| `refund` | Release hold / do not capture |
| `reroute` | Route to next eligible cleared project within user-approved bucket |
| `carry_forward` | Preserve intent for next round |
| `release_hold` | Cancel authorization entirely |

Optional small failure credit:

```ts
failureBonusPool <= 0.05 * sponsorPool
perUserFailureCredit <= min(500, 0.10 * failedQualifiedMatchEligibleCents)
```

Qualification:

```ts
const qualified =
  projectFailed &&
  userAuthorizedBeforeEarlyCutoff &&
  identityWeight >= 1.0 &&
  !sybilFlag &&
  !collusionFlag
```

Default to carry-forward credit, not cash.

---

## 11. Escrow / Custody / Payment Design

CRECM requires either real supervised custody or a legally reviewed escrow-like partner.

The current site should not market anything as escrow unless that legal stack exists. The platform must not claim it holds funds, provides escrow/custody, provides payment protection, or gives legal/tax advice unless that exact function has been legally implemented and approved.

Implementation rule:

```text
Do not capture funds at budget setup.
Save a payment method.
Run clearing.
Authorize only near capture.
Capture only after threshold + review + challenge gates pass.
Cancel authorization if project fails.
```

For card rails, use manual capture only where the authorization window is adequate. Store `authExpiresAt`. Do not allow a round state to remain payable if the authorization would expire before expected capture.

Sponsor funds follow the same honesty rule. A round may show a base match, bonus pool, or failure-credit pool as donor-facing only after the sponsor pool is funded, escrowed, or backed by a signed auditable sponsor route. If sponsor backing is lost before round open, the round cannot open under the advertised match schedule. If sponsor backing is lost after round open, freeze the round, publish an exception event, and let users withdraw or re-consent under a revised schedule.

---

## 12. Data Model

Add or extend these entities.

```ts
type MoralBucket = {
  id: string
  slug: string
  name: string
  description: string
  distinctFromBucketIds: string[]
  eligibilityPolicyVersion: string
}

type PublicGoodProject = {
  id: string
  roundId: string
  bucketId: string
  title: string
  summary: string
  goodType: "consensus" | "hybrid"
  destinationType: "registered_nonprofit" | "fiscal_host" | "signed_auditable_route"
  destinationRef: string
  requestedMaxCents: number
  minimumViableCents: number
  thresholdAmountCents: number
  thresholdSupporterMin: number
  thresholdClusterMin: number
  reviewState: "draft" | "reviewing" | "approved" | "blocked" | "needs_evidence"
  challengeState: "none" | "open" | "resolved" | "blocking"
  antiThreatState: "clear" | "review" | "blocked"
  externalityState: "clear" | "review" | "blocked"
  destinationProofState: "unverified" | "verified" | "blocked"
  sponsorPoolCompatibilityState: "unverified" | "funded" | "escrowed" | "contractually_committed" | "blocked"
  conflictReviewState: "clear" | "disclosed_nonblocking" | "review" | "blocked"
  baseMatchRatioBps: number
  bonusCapMultipleBps: number
  milestoneScheduleJson: unknown
}

type MpgfRound = {
  id: string
  slug: string
  status: "draft" | "open" | "locked" | "frozen" | "reviewing" | "cleared" | "payable" | "released" | "closed" | "canceled"
  opensAt: string
  closesAt: string
  reviewFreezeAt: string
  challengeDeadline: string
  baseMatchBudgetCents: number
  bonusBudgetCents: number
  failureBonusBudgetCents: number
  donorCountedCapCents: number
  identityWeightMinForCounting: number
  identityWeightMinForBonus: number
  minVerifiedSupportersDefault: number
  minActiveClustersDefault: number
  calculationVersion: string
  sponsorPoolSourceHash: string
  sponsorPoolState: "unverified" | "funded" | "escrowed" | "contractually_committed" | "lost" | "blocked"
  rulebookHash: string
  parametersFrozenAt: string | null
}

type CommonGroundBudget = {
  id: string
  participantId: string
  roundId: string
  totalBudgetCents: number
  perProjectCapCents: number
  budgetPeriod: "one_time" | "per_round" | "monthly"
  paymentMethodRef: string | null
  fallbackRule: "refund" | "reroute" | "carry_forward" | "release_hold"
  visibilityDefault: "public" | "pseudonymous" | "aggregate_only" | "private"
  recurringConsentVersion: string | null
  cancelUrl: string | null
  nextCaptureAt: string | null
  nextCaptureRule: string | null
  canceledAt: string | null
  state: "draft" | "active" | "paused" | "expired" | "canceled"
}

type ProjectSupportStance = {
  id: string
  participantId: string
  projectId: string
  stance: "strong" | "weak" | "dissent" | "abstain"
  maxAllocCents: number
  maxAllocPct: number | null
  rankOrder: number | null
  unrestrictedRoutingOptIn: boolean
  acceptableCounterBucketIds: string[]
  minCounterpartyVolumeCents: number
  noteRedacted: string | null
}

type IdentityEligibility = {
  participantId: string
  roundId: string
  humanVerified: boolean
  identityConfidenceScore: number
  sybilRiskState: "clear" | "review" | "blocked"
  collusionRiskState: "clear" | "review" | "blocked"
  collusionRiskScore: number
  linkedAccountClusterId: string | null
  sameControlEntityId: string | null
  countedWeightBps: number // integer 0..10_000; clamp and reject out-of-range writes
  reviewedAt: string | null
}

type ConditionalTradeIntent = {
  id: string
  participantId: string
  roundId: string
  projectId: string
  amountCents: number
  maxExposureCents: number
  acceptableCounterBucketIds: string[]
  minCounterpartyVolumeCents: number
  fallbackRule: "refund" | "reroute" | "carry_forward" | "release_hold"
  visibilityPref: "public" | "pseudonymous" | "aggregate_only" | "private"
  authorizationState: "none" | "payment_method_saved" | "authorized" | "captured" | "released" | "failed"
}

type CoalitionClearanceResult = {
  id: string
  roundId: string
  projectId: string
  actualClearedCents: number
  countedClearedCents: number
  matchEligibleClearedCents: number
  directClearedCents: number // deprecated alias for actualClearedCents; do not use for sponsor-match claims
  baseMatchCents: number
  bonusMatchCents: number
  failureBonusCents: number
  finalPayoutPlanCents: number
  activeSupportersCount: number
  activeClustersCount: number
  qfRaw: number
  qfAdjusted: number
  diversityFactor: number
  antiManipulationDiscount: number
  calculationHash: string
}

type SponsorCommitment = {
  id: string
  roundId: string
  sponsorId: string
  poolType: "base_match" | "bonus_match" | "failure_credit"
  committedCents: number
  fundedCents: number
  commitmentState: "draft" | "signed" | "funded" | "escrowed" | "revoked" | "expired"
  sourceHash: string
  publishedAt: string | null
}

type ConflictReview = {
  id: string
  objectType: "project" | "recipient" | "sponsor" | "reviewer" | "proposer"
  objectId: string
  roundId: string
  conflictState: "clear" | "disclosed_nonblocking" | "review" | "blocked"
  reviewerId: string | null
  publicSummary: string | null
  reviewedAt: string | null
}

type CustodyAuthorization = {
  id: string
  roundId: string
  participantId: string
  projectId: string
  provider: "stripe" | "fiscal_host" | "escrow_partner" | "manual_external"
  providerRef: string
  authorizedAmountCents: number
  capturedAmountCents: number
  authExpiresAt: string | null
  custodyState: "none" | "authorized" | "captured" | "released" | "expired" | "canceled"
}

type RoundAuditBundle = {
  id: string
  roundId: string
  inputsHash: string
  eligibilitySnapshotHash: string
  calculationHash: string
  clearanceResultsHash: string
  payoutHash: string
  exceptionLogHash: string
  publicReportRef: string
}
```

---

## 13. Allocation Pipeline

Implement a deterministic, versioned clearing pipeline.

### Stage 1: Hard Gates

A project is eligible for clearing only if all safety, destination, conflict, and sponsor gates are satisfied:

```ts
project.reviewState === "approved"
project.challengeState !== "blocking"
project.antiThreatState === "clear"
project.externalityState !== "blocked"
project.destinationProofState === "verified"
["clear", "disclosed_nonblocking"].includes(project.conflictReviewState)
["funded", "escrowed", "contractually_committed"].includes(project.sponsorPoolCompatibilityState)
["funded", "escrowed", "contractually_committed"].includes(round.sponsorPoolState)
```

The amount, supporter, and cluster thresholds are checked after candidate allocation using `actualClearedCents`, `countedClearedCents`, and `matchEligibleClearedCents` separately.

### Stage 2: Candidate Allocatable Budget

For each participant-project pair:

```ts
const stanceWeight = {
  strong: 1.0,
  weak: 0.6,
  dissent: 0.0,
  abstain: 0.0,
}[stance]

const identityWeight = clamp(identityEligibility.countedWeightBps, 0, 10_000) / 10_000

const countingEligible =
  identityWeight >= round.identityWeightMinForCounting

const bonusEligible =
  identityWeight >= round.identityWeightMinForBonus

const stanceCap = min(
  supportStance.maxAllocCents,
  supportStance.maxAllocPct == null
    ? Infinity
    : commonGroundBudget.totalBudgetCents * supportStance.maxAllocPct
)

actualAllocCents =
  ["strong", "weak"].includes(stance)
    ? min(
        userRemainingRoundBudget,
        commonGroundBudget.perProjectCapCents,
        stanceCap,
        project.requestedMaxRemainingCents
      )
    : 0

countedContributionCents =
  countingEligible
    ? min(actualAllocCents, round.donorCountedCapCents) * identityWeight
    : 0

matchEligibleCents =
  bonusEligible &&
  identityEligibility.sybilRiskState === "clear" &&
  identityEligibility.collusionRiskState === "clear"
    ? min(countedContributionCents, round.donorCountedCapCents)
    : 0
```

Reject or clamp any persisted identity weight outside `0..10_000` basis points before the round can lock. Dissent allocates no money but increments `dissentPressure`.

### Stage 3: Coalition Clearing

Implement a deterministic optimizer that maximizes:

```text
1. total match-eligible cross-view cleared cents
2. actual cleared cents to verified public-good recipients
3. number of cleared projects
4. active moral-cluster breadth
5. weak-support-to-counted-dollar conversion
```

Subject to:

```text
user budget constraints
per-project caps
identity eligibility
project thresholds
minimum verified supporter counts
minimum active cluster counts
acceptable counter-bucket constraints
minimum counterparty volume constraints
no self-matching, linked-account matching, or same-control counterparty satisfaction
user rank-order constraints unless unrestricted routing is explicitly enabled
```

A user's pledge to project `p` may clear only when:

```ts
counterpartyVolumeCents(userId, projectId) >= minCounterpartyVolumeCents(userId, projectId)
```

where `counterpartyVolumeCents` counts match-eligible cleared dollars in projects whose moral bucket is in `acceptableCounterBucketIds`, excluding the user's own dollars and linked or same-control accounts.

Use an ILP solver if already acceptable in the repo. Otherwise implement a deterministic greedy approximation and clearly version it as `crecm-greedy-v1`, with unit tests demonstrating constraint satisfaction.

### Stage 4: Base Match

For all cleared projects:

```ts
baseMatchClaim[projectId] = matchEligibleClearedCents[projectId] * baseMatchRatio[projectId]
```

If total claims exceed the base pool, prorate.

### Stage 5: Capped Diversity-Aware Bonus

Compute from match-eligible contributions, not raw actual or merely counted contributions:

```ts
qfRaw[projectId] =
  Math.pow(
    sumUsers(Math.sqrt(matchEligibleContribution[userId][projectId] * stanceWeight[userId][projectId])),
    2
  ) - sumUsers(matchEligibleContribution[userId][projectId])
```

Then:

```ts
diversityFactor[projectId] = clamp(
  1 + alpha * normalizedClusterDiversity[projectId] - beta * normalizedDissentPressure[projectId],
  0.75,
  1.25
)
```

Defaults:

```ts
const alpha = 0.20
const beta = 0.20
const gamma = 0.50
const weakWeight = 0.60
const bonusCapMultiple = 1.0
const baseMatchRatio = 1.0
```

Compute:

```ts
antiManipulationDiscount[projectId] = clamp(1 - gamma * collusionRiskScore[projectId], 0, 1)

qfAdjusted[projectId] = Math.max(
  0,
  qfRaw[projectId] * diversityFactor[projectId] * antiManipulationDiscount[projectId]
)
```

Allocate bonus pool proportionally to `qfAdjusted`, capped by:

```ts
bonusMatch[projectId] <= matchEligibleClearedCents[projectId] * bonusCapMultiple
```

### Stage 6: Payment Authorization and Capture

Do not authorize at the start of the round.

Flow:

```text
save payment method
round closes
clearance computed
review/challenge checks pass
create just-in-time manual-capture authorization or custody hold
capture/release only after final gates
cancel authorization if failed
execute fallback rule
publish audit bundle
```

For card rails, use manual capture only where the authorization window is adequate. Store `authExpiresAt`. Do not allow a round state to remain payable if the authorization would expire before expected capture.

### Stage 7: Failure Handling

If a project fails:

```ts
if (fallbackRule === "refund") {
  cancelAuthorization()
}

if (fallbackRule === "reroute") {
  rerouteToNextEligibleClearedProjectWithinApprovedBuckets()
}

if (fallbackRule === "carry_forward") {
  createCarryForwardCreditForNextRound()
}

if (fallbackRule === "release_hold") {
  cancelAuthorization()
  markClosed()
}
```

Optional failure credit:

```ts
failureBonusPool <= 0.05 * sponsorPool
perUserFailureCredit <= min(500, 0.10 * failedQualifiedMatchEligibleCents)
```

Default to carry-forward credit, not cash.

---

## 14. API Routes

Add or update:

```text
GET    /api/mpgf/rounds
GET    /api/mpgf/rounds/:roundId
POST   /api/mpgf/rounds/:roundId/common-ground-budget
POST   /api/mpgf/rounds/:roundId/common-ground-budget/cancel
POST   /api/mpgf/rounds/:roundId/support-stance
POST   /api/mpgf/rounds/:roundId/conditional-intent
GET    /api/mpgf/rounds/:roundId/settlement-preview
POST   /api/mpgf/rounds/:roundId/lock
POST   /api/mpgf/rounds/:roundId/clear
POST   /api/mpgf/rounds/:roundId/authorize
POST   /api/mpgf/rounds/:roundId/capture
POST   /api/mpgf/rounds/:roundId/freeze
GET    /api/mpgf/rounds/:roundId/sponsor-commitments
POST   /api/mpgf/rounds/:roundId/sponsor-commitments
POST   /api/mpgf/rounds/:roundId/release-failed
GET    /api/mpgf/rounds/:roundId/audit-bundle
GET    /api/mpgf/projects/:projectId/review-state
POST   /api/mpgf/projects/:projectId/challenge
POST   /api/mpgf/projects/:projectId/conflict-review
GET    /api/mpgf/recipient-registry
POST   /api/mpgf/recipient-registry
```

---

## 15. Public UX

Build these screens.

### 15.1 Common Ground Budget Setup

```text
Common Ground Budget

Set one budget for public goods you can endorse.

Round budget: [$50]
Budget period: [one-time / per-round / monthly]
Next capture rule: [shown before confirmation]
Cancellation: [cancel before next round close]

Capture rule:
Only after threshold + review + challenge gates pass.
Fees and routing:
Show platform, payment, fiscal-host, and recipient-routing fees before confirmation.

Fallback if a project fails:
(o) refund / release hold
( ) reroute to next eligible common-ground project
( ) carry forward to next round

Your stances:
[Strong] Global health and basic needs
[Weak common-ground] Existential-risk resilience
[Weak common-ground] Public-interest knowledge
[Dissent / review] Animal welfare transition
```

### 15.2 Cross-View Pledge Modal

```text
I will contribute $50 to Global Health and Basic Needs
only if at least $200 clears from one or more morally distinct buckets:

[✓] Animal welfare
[✓] Long-run future
[✓] Public-interest knowledge

Maximum exposure: $50
Base match if cleared: 1:1 on match-eligible dollars
Bonus: capped diversity-aware post-clear bonus
Self-matching: your own allocations cannot satisfy this counterparty condition
If not cleared: release hold / use fallback rule
Funds captured only after review and challenge gates pass.
```

### 15.3 Round Board

```text
June Common Ground Round

Global health
Threshold: $250 + 3 supporters + 2 clusters
Status: near threshold
Your stance: strong
Your current max exposure: $25
Counterparty volume: $180 / $200

Biosecurity
Threshold: $500 + 3 supporters + 2 clusters
Status: needs one more verified supporter
Your stance: weak common-ground

Animal welfare
Status: review pressure high
Your stance: dissent / review
```

### 15.4 Contribution State

```text
Your Common Ground Budget

Authorized budget: $50
Routed:
- Global health: $23.50 pending final review
- Biosecurity: $15.00 pending threshold
- Public-interest knowledge: $0 failed threshold

Fallback:
- Public-interest knowledge carried forward

Review states:
- Identity: passed
- Threshold: mixed
- Anti-threat: clear
- Destination proof: passed
- Challenge window: open
```

---

## 16. Admin Consoles

Build the following operator surfaces.

### 16.1 Registry Console

- Recipient legal status
- Fiscal host
- Destination proof
- Allowed uses
- Milestone schedule
- Receipt requirements

### 16.2 Round Console

- Round status
- Sponsor pool
- Base match pool
- Bonus pool
- Failure pool
- Threshold settings
- Clearance simulation
- Calculation hash

### 16.3 Safety Console

- Anti-threat blockers
- Externality review
- Dissent pressure
- Challenge state
- Appeal state
- Privacy incidents

### 16.4 Sybil / Collusion Console

- Duplicate identity flags
- Linked-account and same-control clusters
- Suspicious cluster patterns
- Donor splitting
- Payment-method anomalies
- Counterparty-volume exclusions
- Post-round adjustment log

### 16.5 Sponsor and Governance Console

- Sponsor commitment state
- Funded / escrowed / signed-route amount
- Rulebook hash and parameter-freeze timestamp
- Sponsor-recipient-reviewer-proposer conflicts
- Safety freeze / cancellation events
- Public exception reports

---

## 17. Public Metrics

Publish privacy-safe aggregate KPIs:

```text
actual-cleared dollars
counted-cleared dollars
match-eligible cleared dollars
weak-support-to-counted-dollar conversion
strong-support-to-counted-dollar conversion
cleared cross-view dollars per sponsor dollar
threshold-clear rate
average active clusters per cleared project
base-match utilization
bonus-match utilization
failure-credit utilization
sponsor-pool funded-vs-advertised ratio
self-match / linked-account exclusions
authorization-to-capture lag
counted-to-payout lag
donor retention into next round
Sybil flag rate
appeal rate
blocked-project precision
privacy incident count
```

Do not optimize for gross donation volume alone. Optimize for **incremental, verified, cross-view, review-cleared funding of moral public goods**.

---

## 18. Test Requirements

Add unit and integration tests for:

```text
hard-gate blocking
anti-threat blocking
dissent not allocating funds
weak support allocating only under caps
counterparty bucket constraints
minimum counterparty volume
no self-matching or linked-account counterparty satisfaction
partial clearing
actual-vs-counted-vs-match-eligible accounting separation
base-match proration
bonus cap enforcement
identity-weight effects
identity-threshold enforcement and basis-point clamping
per-project cap and next-capture-rule enforcement
Sybil/collusion discount
authorization expiry handling
refund fallback
reroute fallback
carry-forward fallback
recurring-budget consent and cancellation
sponsor-pool precommitment and no phantom match display
round parameter freeze and safety freeze
conflict-review blocking for recipients, sponsors, reviewers, and proposers
QF bonus input and cap use match-eligible dollars, not actual or counted dollars
audit hash reproducibility
privacy-safe public reporting
```

---

## 19. Migration Plan

Do not delete the current MPGF pages. Introduce CRECM behind a feature flag:

```env
MPGF_MECHANISM_VERSION=crecm_v1_3
```

Keep legacy pages readable as historical pilot artifacts.

Mark legacy mechanism as:

```text
Verified Assurance Matching pilot
```

Mark new mechanism as:

```text
Coalition-Routed Escrowed Conditional Matching v1.3
```

---

## 20. Acceptance Criteria

The implementation is complete only when:

1. A user can create a Common Ground Budget.
2. A user can mark project stances.
3. A user can create explicit cross-view conditional pledge constraints.
4. The round optimizer clears only valid cross-bucket coalitions.
5. A project cannot clear without review, identity, threshold, challenge, destination, and anti-threat gates.
6. Base match is deterministic and precommitted.
7. Bonus match is capped, diversity-aware, post-clear only, and uses match-eligible dollars for both score input and cap.
8. Failed projects trigger explicit fallback.
9. Payment authorization happens after clearing, not at round start.
10. Public audit bundles reproduce the final allocation.
11. No private donor-level stance is exposed without explicit permission.
12. No page claims escrow/custody unless the legal payment path actually provides it.
13. Actual captured dollars, counted dollars, and match-eligible dollars are separated in calculations, public metrics, and audit bundles.
14. A user cannot satisfy their own counterparty condition through self-matching, linked accounts, or same-control entities.
15. Sponsor match is not displayed as committed unless funded, escrowed, or backed by a signed auditable sponsor route.
16. Recurring Common Ground Budgets have explicit consent, a visible next-capture rule, and easy cancellation.
17. Round parameters are frozen after opening except for auditable safety freeze or cancellation.
18. Conflict review can block recipient, sponsor, reviewer, proposer, and fiscal-host conflicts before a project becomes payable.
19. Identity weights are clamped to `0..10_000` bps and minimum identity thresholds are enforced for counting and match eligibility.
20. Project-level sponsor compatibility and round-level sponsor state both gate clearing.
21. Common Ground Budgets store and enforce per-project caps, cancellation state, and visible next-capture rules.

---

## 21. Do Not Build

Do **not** build:

- pure assurance crowdfunding,
- pure quadratic funding,
- pure matching,
- pure ECM without Common Ground Budget routing,
- pure VCQA without explicit cross-view conditional moral-trade constraints,
- a mechanism that relies mainly on social norms,
- political campaign trades,
- lifestyle or behavior-change trades,
- anything that creates an incentive to threaten harm to obtain payment,
- phantom or merely aspirational sponsor matching,
- self-matching or linked-account matching that satisfies a user's own counterparty conditions,
- recurring-budget capture without explicit consent and easy cancellation,
- or counting / matching low-confidence identity records below the round's published identity thresholds.

---

## 22. References for Codex Context

- Forethought: *Moral Public Goods Are a Big Deal for Whether We Get a Good Future*
  https://www.forethought.org/research/moral-public-goods-are-a-big-deal-for-whether-we-get-a-good-future
- Forethought: *Convergence and Compromise*
  https://www.forethought.org/research/convergence-and-compromise
- Toby Ord: *Moral Trade*
  https://amirrorclear.net/files/moral-trade.pdf
- Moral Trade validation page
  https://www.moraltrade.org/validation
- Moral Trade trust page
  https://www.moraltrade.org/trust
- Stripe manual capture / authorization timing
  https://docs.stripe.com/payments/place-a-hold-on-a-payment-method

---

## Final Build Target

Build:

> **CRECM v1.3: Common Ground Budget + cross-view conditional clearing + supervised escrow/custody + hard review gates + separated actual/counted/match-eligible accounting + enforced identity thresholds + sponsor-pool precommitment + base match + capped diversity-aware post-clear bonus + explicit failure handling.**

This is the concrete build target for `moraltrade.org`.
