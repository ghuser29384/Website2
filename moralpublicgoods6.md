# Coalition-Routed Escrowed Conditional Matching (CRECM v1)

**Target:** `moraltrade.org`
**Audience:** Codex GPT-5.5-xhigh
**Purpose:** Implement the concrete moral-public-goods funding mechanism described below.

---

## 0. Executive Build Target

Build **Coalition-Routed Escrowed Conditional Matching v1** in `moraltrade.org`.

- **Abbreviation:** CRECM
- **User-facing label:** Common Ground Budget
- **Technical label:** CRECM v1

CRECM is not pure ECM, pure VCQA, pure assurance funding, pure quadratic funding, or the current MPGF pilot. It is an **ECM-core hybrid**:

> Verified users set a **Common Ground Budget** and explicit project stances. The platform converts strong and weak cross-view support into **batch-cleared conditional pledges**. Cleared funds are held through **supervised escrow / custody or just-in-time authorization**. Sponsor funds provide a **precommitted base match** plus a **capped diversity-aware bonus** only after hard review gates pass. Failed projects trigger refund, reroute, carry-forward, or a tightly capped failure credit.

For `moraltrade.org`, the target is a voluntary Toby-Ord-style moral-trade platform. Under that constraint, CRECM is the concrete mechanism to build.

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
9. Refund / reroute / carry-forward / release-hold failure handling.
10. Public audit bundles and privacy-safe round reports.

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
| `per_project_cap_cents` | Maximum exposure to any one project |
| `acceptable_counter_buckets[]` | Which morally distinct buckets can satisfy the trade condition |
| `min_counterparty_volume_cents` | Minimum morally distinct counter-support required |
| `fallback_rule` | `refund`, `reroute`, `carry_forward`, or `release_hold` |
| `visibility_pref` | `public`, `pseudonymous`, `aggregate_only`, or `private` |
| `recognition_opt_in` | Optional social proof; never required |

This implements the core insight: **weak common-ground support becomes spendable budget**, not merely a ranking signal.

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

---

## 7. Hard Gates

A project can clear only if all hard gates pass:

```text
project.review_state is approval-compatible
project.challenge_state is clear or non-blocking
project.destination_proof_state is verified
project.anti_threat_state is clear
project.externality_state has no unresolved severe blocker
direct_cleared_amount >= threshold_amount
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

Moral reputation must never increase allocation power.

---

## 8. Coalition-Routing Algorithm

The router has two jobs:

1. Find threshold-feasible coalitions.
2. Clear only cross-view conditional commitments that satisfy donor constraints.

For each user-project pair:

```ts
const eligibleAllocCap = min(
  user.roundBudgetRemaining,
  user.perProjectCap,
  project.remainingRequestedCap,
  round.donorCountedCap,
  stanceCap
)
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

Identity-adjusted counted contribution:

```ts
countedContribution[userId][projectId] =
  allocatedCents[userId][projectId] * identityWeight[userId]
```

The optimizer should maximize:

```text
Primary objective:
  maximize total cleared cross-view dollars

Secondary objective:
  maximize number of cleared moral clusters

Tertiary objective:
  maximize weak-support-to-counted-dollar conversion

Guardrail:
  never clear a pledge unless its counterparty constraints are satisfied
```

A user's allocation to project `p` clears only if:

```ts
counterpartyVolumeCents(userId, projectId) >= minCounterpartyVolumeCents(userId, projectId)
```

where `counterpartyVolumeCents` counts cleared dollars in projects whose moral bucket is in `acceptableCounterBucketIds`.

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
baseMatchClaim[projectId] = directClearedCents[projectId] * baseMatchRatioByProject[projectId]
```

If the base pool is insufficient:

```ts
baseMatch[projectId] =
  (baseMatchPoolRemaining * baseMatchClaim[projectId]) /
  sumBaseMatchClaimsForAllClearedProjects
```

Base match applies only after hard gates pass.

### 9.2 Capped Diversity-Aware Bonus

Do not use pure QF as the core mechanism. Use QF only as a **secondary, capped, post-clear bonus**.

Raw score:

```ts
qfRaw[projectId] =
  Math.pow(
    sumUsers(Math.sqrt(countedContribution[userId][projectId] * stanceWeight[userId][projectId])),
    2
  ) - sumUsers(countedContribution[userId][projectId])
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
bonusMatch[projectId] <= directClearedCents[projectId] * bonusCapMultiple
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
perUserFailureCredit <= min(500, 0.10 * failedQualifiedIntentCents)
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
  baseMatchRatioBps: number
  bonusCapMultipleBps: number
  milestoneScheduleJson: unknown
}

type MpgfRound = {
  id: string
  slug: string
  status: "draft" | "open" | "locked" | "reviewing" | "cleared" | "payable" | "released" | "closed"
  opensAt: string
  closesAt: string
  reviewFreezeAt: string
  challengeDeadline: string
  baseMatchBudgetCents: number
  bonusBudgetCents: number
  failureBonusBudgetCents: number
  donorCountedCapCents: number
  minVerifiedSupportersDefault: number
  minActiveClustersDefault: number
  calculationVersion: string
  sponsorPoolSourceHash: string
}

type CommonGroundBudget = {
  id: string
  participantId: string
  roundId: string
  totalBudgetCents: number
  paymentMethodRef: string | null
  fallbackRule: "refund" | "reroute" | "carry_forward" | "release_hold"
  visibilityDefault: "public" | "pseudonymous" | "aggregate_only" | "private"
  state: "draft" | "active" | "paused" | "expired"
}

type ProjectSupportStance = {
  id: string
  participantId: string
  projectId: string
  stance: "strong" | "weak" | "dissent" | "abstain"
  maxAllocCents: number
  maxAllocPct: number | null
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
  countedWeightBps: number
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
  directClearedCents: number
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

A project is eligible for clearing only if:

```ts
project.reviewState === "approved"
project.challengeState !== "blocking"
project.antiThreatState === "clear"
project.externalityState !== "blocked"
project.destinationProofState === "verified"
```

### Stage 2: Candidate Allocatable Budget

For each participant-project pair:

```ts
const stanceWeight = {
  strong: 1.0,
  weak: 0.6,
  dissent: 0.0,
  abstain: 0.0,
}[stance]

eligibleAllocCents =
  ["strong", "weak"].includes(stance)
    ? min(
        userRemainingRoundBudget,
        supportStance.maxAllocCents,
        round.donorCountedCapCents,
        project.requestedMaxRemainingCents
      )
    : 0
```

Dissent allocates no money but increments `dissentPressure`.

### Stage 3: Coalition Clearing

Implement a deterministic optimizer that maximizes:

```text
1. total cross-view cleared cents
2. number of cleared projects
3. active moral-cluster breadth
4. weak-support-to-counted-dollar conversion
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
```

A user's pledge to project `p` may clear only when:

```ts
counterpartyVolumeCents(userId, projectId) >= minCounterpartyVolumeCents(userId, projectId)
```

where `counterpartyVolumeCents` counts cleared dollars in projects whose moral bucket is in `acceptableCounterBucketIds`.

Use an ILP solver if already acceptable in the repo. Otherwise implement a deterministic greedy approximation and clearly version it as `crecm-greedy-v1`, with unit tests demonstrating constraint satisfaction.

### Stage 4: Base Match

For all cleared projects:

```ts
baseMatchClaim[projectId] = directClearedCents[projectId] * baseMatchRatio[projectId]
```

If total claims exceed the base pool, prorate.

### Stage 5: Capped Diversity-Aware Bonus

Compute:

```ts
qfRaw[projectId] =
  Math.pow(
    sumUsers(Math.sqrt(countedContribution[userId][projectId] * stanceWeight[userId][projectId])),
    2
  ) - sumUsers(countedContribution[userId][projectId])
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
bonusMatch[projectId] <= directClearedCents[projectId] * bonusCapMultiple
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
perUserFailureCredit <= min(500, 0.10 * failedQualifiedIntentCents)
```

Default to carry-forward credit, not cash.

---

## 14. API Routes

Add or update:

```text
GET    /api/mpgf/rounds
GET    /api/mpgf/rounds/:roundId
POST   /api/mpgf/rounds/:roundId/common-ground-budget
POST   /api/mpgf/rounds/:roundId/support-stance
POST   /api/mpgf/rounds/:roundId/conditional-intent
GET    /api/mpgf/rounds/:roundId/settlement-preview
POST   /api/mpgf/rounds/:roundId/lock
POST   /api/mpgf/rounds/:roundId/clear
POST   /api/mpgf/rounds/:roundId/authorize
POST   /api/mpgf/rounds/:roundId/capture
POST   /api/mpgf/rounds/:roundId/release-failed
GET    /api/mpgf/rounds/:roundId/audit-bundle
GET    /api/mpgf/projects/:projectId/review-state
POST   /api/mpgf/projects/:projectId/challenge
```

---

## 15. Public UX

Build these screens.

### 15.1 Common Ground Budget Setup

```text
Common Ground Budget

Set one budget for public goods you can endorse.

Round budget: [$50]

Capture rule:
Only after threshold + review + challenge gates pass.

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
Base match if cleared: 1:1
Bonus: capped diversity-aware post-clear bonus
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
- Suspicious cluster patterns
- Donor splitting
- Payment-method anomalies
- Post-round adjustment log

---

## 17. Public Metrics

Publish privacy-safe aggregate KPIs:

```text
weak-support-to-counted-dollar conversion
strong-support-to-counted-dollar conversion
cleared cross-view dollars per sponsor dollar
threshold-clear rate
average active clusters per cleared project
base-match utilization
bonus-match utilization
failure-credit utilization
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
partial clearing
base-match proration
bonus cap enforcement
identity-weight effects
Sybil/collusion discount
authorization expiry handling
refund fallback
reroute fallback
carry-forward fallback
audit hash reproducibility
privacy-safe public reporting
```

---

## 19. Migration Plan

Do not delete the current MPGF pages. Introduce CRECM behind a feature flag:

```env
MPGF_MECHANISM_VERSION=crecm_v1
```

Keep legacy pages readable as historical pilot artifacts.

Mark legacy mechanism as:

```text
Verified Assurance Matching pilot
```

Mark new mechanism as:

```text
Coalition-Routed Escrowed Conditional Matching
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
7. Bonus match is capped, diversity-aware, and post-clear only.
8. Failed projects trigger explicit fallback.
9. Payment authorization happens after clearing, not at round start.
10. Public audit bundles reproduce the final allocation.
11. No private donor-level stance is exposed without explicit permission.
12. No page claims escrow/custody unless the legal payment path actually provides it.

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
- or anything that creates an incentive to threaten harm to obtain payment.

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

> **CRECM v1: Common Ground Budget + cross-view conditional clearing + supervised escrow/custody + hard review gates + base match + capped diversity-aware post-clear bonus + explicit failure handling.**

This is the concrete build target for `moraltrade.org`.
