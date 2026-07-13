# Coalition-Routed Escrowed Conditional Matching (CRECM v1.125)

**Target:** `moraltrade.org`
**Audience:** Codex GPT-5.5-xhigh
**Purpose:** Implement the concrete moral-public-goods funding mechanism described below.

---

## 0. Executive Build Target

Build **Coalition-Routed Escrowed Conditional Matching v1.125** in `moraltrade.org`.

- **Abbreviation:** CRECM
- **User-facing label:** Common Ground Budget
- **Technical label:** CRECM v1.125

CRECM is not pure ECM, pure VCQA, pure assurance funding, pure quadratic funding, or the current MPGF pilot. It is an **ECM-core hybrid**:

> Verified users set a **Common Ground Budget** and explicit project stances. The platform converts strong and weak cross-view support into **batch-cleared conditional pledges**. Cleared obligations are settled through **supervised escrow / custody or just-in-time authorization**. Sponsor funds provide a **precommitted base match**, a **capped diversity-aware bonus**, and optional **contributor-only success rewards / coordination credits** only after hard review gates pass. Failed projects trigger refund, reroute, carry-forward, or a tightly capped failure bonus.

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

### 0.4 Improvements from `moralpublicgoods9.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes close two remaining implementation gaps that could otherwise create unauthorized allocations or distort the bonus formula:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate candidate allocation on an **active, uncanceled, consent-valid Common Ground Budget** before any actual allocation is computed | 0.92 | v1.3 stored cancellation and next-capture fields, but the allocation formula did not explicitly zero out paused, expired, canceled, or recurring budgets lacking current consent/next-capture disclosure. That could produce allocations or payment attempts after user consent had ended. |
| Compute QF raw scores from **stance-weighted match-eligible contributions** for both the square-root term and the subtraction term | 0.88 | v1.3 multiplied match-eligible dollars by stance weight inside the square root but subtracted unweighted match-eligible dollars. That over-penalized weak common-ground support and made the formula internally inconsistent with the intended effective contribution input. |

### 0.5 Improvements from `moralpublicgoods10.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow exploit-prevention and consent-integrity fixes, motivated by Forethought's emphasis that voluntary moral-public-goods mechanisms face severe free-riding and coordination problems, so the clearing rules must be unusually explicit and hard to game:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Enforce active **ConditionalTradeIntent amount and max-exposure caps** in candidate allocation | 0.91 | v1.4 stored `amountCents` and `maxExposureCents`, but Stage 2 allocation did not explicitly cap actual allocation by the active conditional intent. That could route more than the donor explicitly exposed for the trade. |
| Validate acceptable counterparty buckets against `MoralBucket.distinctFromBucketIds`, and exclude sponsor dollars from counterparty satisfaction | 0.92 | Cross-view clearing is the core moral-trade condition. Without a deterministic distinct-bucket validation rule, same-bucket or non-donor dollars could accidentally satisfy a cross-view condition. |
| Constrain reroute and carry-forward to pre-consented recipient, bucket, rulebook, and exposure terms; otherwise release/refund and require re-consent | 0.88 | Rerouting or carrying forward under changed terms can become accidental allocation. Consent must travel with the exact rulebook, eligible bucket set, fallback rule, and max exposure. |

### 0.6 Improvements from `moralpublicgoods12.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow failure-bonus and implementation-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Restrict sponsor-funded failure bonuses to **otherwise eligible projects that fail only because threshold or counterparty-volume conditions do not clear** | 0.94 | Failure bonuses are meant to reduce free-riding and first-mover hesitation, not to reward proposals that fail because of anti-threat, destination, conflict, sponsor, rulebook, identity, or user-consent blockers. |
| Replace `userAuthorizedBeforeEarlyCutoff` with **locked intent plus saved payment method before the early cutoff** for failure-bonus qualification | 0.92 | The mechanism otherwise conflicts with its own just-in-time authorization rule: it says not to authorize at round start, while requiring authorization before an early cutoff. |
| Add an auditable `FailureBonusClaim` object and explicit failure-bonus reason codes | 0.89 | Cash or cash-equivalent failure bonuses need duplicate-payment prevention, eligibility auditability, public aggregate reporting, and clear exclusion of non-threshold failures. |
| Correct the feature flag and migration identifier to `crecm_v1_7` | 0.98 | The document labels the mechanism v1.7; a stale feature flag would cause Codex to build or deploy the wrong versioned mechanism. |

### 0.7 Improvements from `moralpublicgoods13.md`

This revision changes the mechanism only where the improvement case is above 88% credence. The changes are narrow implementation-consistency and null-safety fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the main Section 8 routing formula with the Stage 2 allocation pipeline by enforcing **rulebook consent, active conditional-intent gates, intent caps, and validated distinct counterparty buckets** in both places | 0.94 | v1.7's Stage 2 pipeline had the newer gates, but the earlier main router formula still showed the older budget-only allocation path. Codex could implement the less restrictive formula and miss the consent and cross-view safeguards. |
| Make `validatedCounterBucketIds` **null-safe** by computing it only after `conditionalIntentEligible`; otherwise it is `[]` | 0.95 | v1.7's Stage 2 pseudocode dereferenced `conditionalTradeIntent.acceptableCounterBucketIds` even when the intent might be null. That is an implementation bug in a critical clearing path. |
| Update mechanism and deployment identifiers from **v1.7 / `crecm_v1_7`** to **v1.8 / `crecm_v1_8`** | 0.98 | Once the mechanism changes, stale version identifiers would make audits, feature flags, migration tests, and deployment traces ambiguous. |


### 0.8 Improvements from `moralpublicgoods14.md`

This revision changes the mechanism only where the improvement case is above 88% credence. The changes are narrow budget-integrity and payout-determinism fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Cap total failure-bonus payouts by the funded `failureBonusBudgetCents`, and prorate qualified claims deterministically if provisional claims exceed that budget | 0.95 | v1.8 capped each user's failure bonus but did not specify what happens if aggregate qualified claims exceed the funded failure-bonus pool. Without proration, the mechanism could overpay the sponsor budget or resolve claims arbitrarily. |
| Define `failedQualifiedMatchEligibleCents` as the candidate match-eligible amount from a locked, eligible intent that would have counted if the project had cleared, after all identity, sybil, collusion, consent, exposure, and self-match exclusions | 0.92 | The failure-bonus formula used this variable but did not define it precisely. Ambiguity here could pay bonuses on invalid or over-cap intent, or deny valid threshold-failure participation. |
| Add failure-bonus proration fields to `FailureBonusClaim` and corresponding tests, metrics, and acceptance criteria | 0.91 | Cash or cash-equivalent failure bonuses must be auditable, budget-limited, reproducible, and protected against duplicate or arbitrary payouts. |


### 0.9 Improvements from `moralpublicgoods15.md`

This revision changes the mechanism only where the improvement case is above 89% credence. The changes are narrow consistency and implementation-safety fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add project-level **sponsor-pool compatibility** to the Section 7 hard-gate list | 0.91 | Project eligibility and Stage 1 already require project-level sponsor compatibility, but the canonical hard-gate list omitted it. A project-specific sponsor incompatibility must not be able to pass merely because the round-level sponsor pool is funded. |
| Express failure-bonus proration as **basis points** consistently | 0.92 | The `FailureBonusClaim` model stores `prorationFactorBps`, but the formula used a 0..1 ratio. Mixing ratio and bps representations can create large payout errors or non-reproducible audits. |
| Rename remaining implementation-facing **failure-credit** terminology to **failure-bonus** terminology | 0.90 | The mechanism now pays or credits sponsor-funded failure bonuses. Keeping `failure_credit` as the sponsor pool type or current rule terminology risks implementing the wrong payout semantics. |
| Update mechanism and deployment identifiers from **v1.9 / `crecm_v1_9`** to **v1.10 / `crecm_v1_10`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.10 Improvements from `moralpublicgoods16.md`

This revision changes the mechanism only where the improvement case is above 89% credence. The changes are narrow sponsor-pool integrity and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require **pool-specific sponsor backing** for base match, bonus match, and failure-bonus budgets, rather than relying on a generic round-level sponsor state alone | 0.94 | Forethought emphasizes that quadratic or matching-style funding depends on an outside matching pool. If advertised base, bonus, or failure-bonus pools are not independently funded, escrowed, or contractually committed, donor-facing incentives become phantom matching and can worsen trust. |
| Normalize `SponsorCommitment.commitmentState` to use **`contractually_committed`** instead of ambiguous `signed` | 0.91 | The rest of the mechanism uses `contractually_committed`; leaving a different `signed` enum in the data model risks implementers treating signed but non-binding commitments as match-backed funds or failing to derive pool state deterministically. |
| Add pool-specific sponsor-backed metrics, tests, acceptance criteria, and do-not-build constraints | 0.90 | The pool-specific backing rule must be auditable and enforced in tests; otherwise the rule can remain aspirational while the live mechanism still shows underfunded sponsor pools. |
| Make challenge gating explicit: open challenges do not pass clearing unless they are recorded as `non_blocking` | 0.93 | The prose says challenge state must be clear or non-blocking, but the implementation predicate allowed every state except `blocking`, which would let open challenges pass hard gates. That weakens review integrity and could release funds before challenge resolution. |
| Update mechanism and deployment identifiers from **v1.10 / `crecm_v1_10`** to **v1.11 / `crecm_v1_11`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.11 Improvements from `moralpublicgoods17.md`

This revision changes the mechanism only where the improvement case is above 89% credence. The changes are narrow consistency and sponsor-backing fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align all failure-bonus eligibility language with the actual eligible reason codes: **threshold-amount, verified-supporter, active-cluster, and counterparty-volume shortfalls** | 0.93 | v1.11's formal eligibility code allowed verified-supporter and active-cluster shortfalls, but some prose and tests described only threshold/counterparty failures. That inconsistency could make Codex under-implement the intended threshold-family failure-bonus rule. |
| Replace the stale numeric-budget funding-state check for failure bonuses with the pool-specific `sponsorBackedCents("failure_bonus")` check | 0.94 | A number such as `round.failureBonusBudgetCents` cannot itself be funded, escrowed, or contractually committed. The already-specified pool-specific sponsor-backing function is the correct gate for advertising and paying failure bonuses. |
| Update mechanism and deployment identifiers from **v1.11 / `crecm_v1_11`** to **v1.12 / `crecm_v1_12`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.12 Improvements from `moralpublicgoods18.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-safety and accounting-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Normalize `baseMatchRatioBps` and `bonusCapMultipleBps` before using them in match formulas | 0.93 | The data model stores these values in basis points, but the formulas used ratio-like variables. Without explicit normalization, Codex could overpay or underpay sponsor funds by a factor of 10,000. |
| Replace ambiguous `maxAllocPct` with basis-point `maxAllocBps` and divide by `10_000` in stance-cap calculations | 0.91 | Percentage fields are ambiguous in implementation. Basis-point representation matches the rest of the mechanism and prevents accidental 100x or 10,000x cap errors. |
| Add zero-denominator guards for base-match and bonus-match proration | 0.90 | If no valid claims or no positive adjusted QF scores exist after gates and discounts, the mechanism must allocate zero rather than divide by zero or allocate arbitrarily. |
| Add an explicit `legal_custody_blocked` failure reason and corresponding failure-bonus denial language | 0.89 | The mechanism already says legal/custody blockers deny failure bonuses, but the formal failure-reason enum lacked a code for that case. Explicit coding improves auditability and prevents accidental treatment as a threshold failure. |
| Update mechanism and deployment identifiers from **v1.12 / `crecm_v1_12`** to **v1.13 / `crecm_v1_13`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.13 Improvements from `moralpublicgoods19.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-consistency and user-disclosure fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the Stage 4 and Stage 5 allocation-pipeline formulas with the Section 9 matching formulas by normalizing `baseMatchRatioBps` and `bonusCapMultipleBps`, and by adding zero-denominator guards directly in the pipeline | 0.94 | v1.13 fixed the explanatory matching section, but the canonical allocation pipeline still showed older ratio-like variables and no denominator guards. Codex could implement the pipeline rather than Section 9 and reintroduce overpayment, underpayment, or divide-by-zero errors. |
| Expand user-facing failure-bonus denial disclosure to include rulebook, legal/custody, identity/sybil/collusion, authorization, and consent failures | 0.88 | The mechanism already denies failure bonuses for these cases. The UX must disclose the same exclusion categories before pledging so users do not misinterpret failure bonuses as general insurance against all failures. |
| Update mechanism and deployment identifiers from **v1.13 / `crecm_v1_13`** to **v1.14 / `crecm_v1_14`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.14 Improvements from `moralpublicgoods20.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-safety, sponsor-backing, and failure-bonus anti-gaming fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Filter `sponsorBackedCents(poolType)` by both **current round** and **matching pool type** before summing sponsor commitments | 0.96 | The function accepted a `poolType` argument but did not explicitly filter commitments by pool type or round. Without this, base-match commitments could accidentally back failure bonuses or another round's commitments could be counted. |
| Store and compare identity-weight thresholds as **basis points**, and compute counted cents using integer basis-point arithmetic | 0.90 | The mechanism stores identity weights in basis points but thresholds were ratio-like values. Integer bps comparisons and `Math.floor` cents arithmetic avoid floating-point ambiguity and fractional-cent audit problems. |
| Make base-match, bonus-match, and counted/match-eligible monetary outputs **integer cents** with deterministic remainder handling | 0.89 | Donation, match, and bonus payouts must be auditable in cents. Rounding and leftover distribution should be deterministic rather than implementation-dependent. |
| Cap failure bonuses per participant per round before applying the round-level failure-bonus budget proration | 0.87 | Failure bonuses reduce first-mover hesitation, but without a participant-level round cap they could become a bonus-farming strategy across many doomed projects. This preserves the incentive while keeping it small and non-lottery-like. |
| Update mechanism and deployment identifiers from **v1.14 / `crecm_v1_14`** to **v1.15 / `crecm_v1_15`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.15 Improvements from `moralpublicgoods21.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-consistency and payout-integrity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the Stage 2 candidate-allocation formula with the already-specified basis-point identity-threshold fields and integer-cent counted/match-eligible arithmetic | 0.94 | v1.15 updated the main router formula and data model to use `identityWeightMinForCountingBps` and `identityWeightMinForBonusBps`, but the Stage 2 pipeline still used ratio-style threshold fields and fractional-cent arithmetic. Codex could implement the stale pipeline and reintroduce accounting ambiguity. |
| Make base-match allocation pay the claim amount when the backed base-match pool is sufficient, and prorate only when total claims exceed the backed pool | 0.96 | v1.15's prose said to prorate only if claims exceed the pool, but the displayed formula would scale claims up when the pool was larger than total claims. Base match should never exceed the claim generated by match-eligible donor dollars. |
| Operationalize the bonus-match cap using deterministic capped proration rather than a merely declarative inequality | 0.90 | v1.15 stated that bonus match is capped, but the formula could still allocate an above-cap proportional amount unless implementers separately enforced the inequality. A deterministic capped-proration algorithm prevents cap violations and arbitrary leftover handling. |
| Replace JavaScript-invalid `projectFailureReason in [...]` pseudocode with `.includes(projectFailureReason)` in failure-bonus eligibility checks | 0.95 | In JavaScript/TypeScript, `in` checks array indexes, not membership in the listed reason values. Leaving this in critical payout eligibility pseudocode could deny valid claims or approve invalid claims depending on implementation interpretation. |
| Update mechanism and deployment identifiers from **v1.15 / `crecm_v1_15`** to **v1.16 / `crecm_v1_16`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.16 Improvements from `moralpublicgoods22.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-consistency and consent-disclosure fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace the remaining statement that identity weights “must be normalized before multiplication” with an explicit instruction to use **basis-point integer arithmetic** in allocation formulas | 0.88 | v1.16 already moved identity thresholds to bps and integer-cent arithmetic. A stale normalization instruction could lead implementers back to floating-point ratios and fractional-cent outputs. |
| Make participant-round failure-bonus capping explicitly prorate **only across that participant's own qualified claims**, with deterministic claim ordering | 0.89 | v1.16 introduced a participant-round cap, but the pseudocode passed the full `rawFailureBonusCents` map into the participant-level proration helper. That could be misread as prorating across all participants rather than one participant’s claims. |
| Change the Contribution State UX label from **“Authorized budget”** to **“Maximum budget”** | 0.88 | The payment design says not to authorize at budget setup or round start. “Authorized budget” is misleading and could cause Codex to build premature authorization semantics. |
| Update mechanism and deployment identifiers from **v1.16 / `crecm_v1_16`** to **v1.17 / `crecm_v1_17`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.17 Improvements from `moralpublicgoods23.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-consistency, conflict-review, and deterministic-allocation fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add **fiscal-host conflict-review coverage** to the `ConflictReview` data model and tests | 0.91 | Project eligibility and acceptance criteria already require fiscal-host conflicts to be reviewed, but the conflict-review object type omitted `fiscal_host`. That gap could leave fiscal-host self-dealing or capture unimplemented despite being a hard legitimacy condition. |
| Use **integer division by 10** for 10% failure-bonus formulas instead of floating-point `0.10 * cents` arithmetic | 0.90 | The mechanism requires integer-cent deterministic payout accounting. Floating-point percentage arithmetic can create implementation-dependent rounding; integer division is simpler and auditable. |
| Make bonus-match capped proration **mandatory and deterministic until no eligible remaining cap exists**, rather than optional | 0.88 | Optional additional proration passes can produce different outputs across implementations. A mandatory deterministic capped-proration loop better satisfies reproducibility while still leaving unallocatable leftover funds unspent or carried forward under sponsor terms. |
| Update mechanism and deployment identifiers from **v1.17 / `crecm_v1_17`** to **v1.18 / `crecm_v1_18`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.18 Improvements from `moralpublicgoods24.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow auditability, consent, and payout-eligibility fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add `paymentMethodSavedAt` and require a saved payment method timestamp before the early cutoff for failure-bonus qualification | 0.94 | The mechanism already required a saved payment method before the cutoff, but the data model lacked a timestamp. Without it, Codex could not audit whether a user qualified without relying on early card authorization. |
| Add immutable round-open project eligibility snapshots for failure-bonus qualification | 0.90 | Failure bonuses depend on whether a project was otherwise eligible at round open. Mutable live project fields can change after the fact, so eligibility should be based on a stored snapshot and hash. |
| Add explicit `review_not_approved` and `challenge_blocked` failure reasons and deny failure bonuses for them | 0.90 | Review and challenge blockers are hard gates. Without explicit failure codes, they could be misclassified as threshold-family failures and incorrectly receive failure bonuses. |
| Use integer arithmetic for the 5% failure-bonus budget cap | 0.88 | The mechanism already requires integer-cent deterministic accounting. The 5% budget cap should not rely on floating-point arithmetic or ambiguous percentage semantics. |
| Clarify that a saved payment method is not a hold or authorization | 0.88 | The payment design authorizes only near capture. Calling a saved payment method a “hold” could lead Codex to build premature authorization semantics. |
| Update mechanism and deployment identifiers from **v1.18 / `crecm_v1_18`** to **v1.19 / `crecm_v1_19`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.19 Improvements from `moralpublicgoods25.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow commitment-credibility, payout-availability, and audit-reproducibility fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require a timestamped saved payment method before round close for final clearing, while allowing unpaid settlement previews to remain explicitly non-binding | 0.90 | The payment flow already requires saving a payment method before clearing. Without this gate, non-credible intents could satisfy thresholds, counterparty volume, or match eligibility and then fail at authorization, worsening the voluntary coordination problem Forethought emphasizes. |
| Prorate and pay failure bonuses only within the backed available failure-bonus pool, not merely the configured numeric budget | 0.88 | A numeric budget is not itself spendable. Using `min(round.failureBonusBudgetCents, sponsorBackedCents("failure_bonus"))` prevents overpayment if sponsor backing is partially lost or lower than the configured budget. |
| Store snapshot and payment-method timing references on `FailureBonusClaim` | 0.87 | Failure-bonus qualification depends on a round-open eligibility snapshot and a timestamped saved payment method. Storing those references directly on the claim makes audits reproducible without relying only on an opaque aggregate hash. |
| Define deterministic stable ordering as SHA-256 over canonical JSON tuples | 0.86 | The mechanism repeatedly uses “ascending hash” for leftover cents and claim ordering. Without a canonical hash rule, different implementations could produce different auditable payout allocations. |
| Update mechanism and deployment identifiers from **v1.19 / `crecm_v1_19`** to **v1.20 / `crecm_v1_20`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.20 Improvements from `moralpublicgoods26.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow payment-credibility, authorization-reconciliation, and acceptance-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require a provider-confirmed saved payment method, not merely a stored payment-method reference, before final clearing and failure-bonus qualification | 0.91 | A saved reference without provider confirmation can be stale, detached, or still requiring action. Letting it count toward thresholds or counterparty volume would weaken the credible-commitment layer needed for voluntary moral-public-goods coordination. |
| Add deterministic post-clear authorization/custody reconciliation: failed authorization rows are removed and clearing/matching is rerun before capture or release | 0.93 | Without reclearing after authorization failures, thresholds, counterparty-volume conditions, and sponsor-match amounts could rely on money that cannot actually be captured. |
| Store provider-confirmation and authorization-reconciliation evidence in data models and audit bundles | 0.87 | Payment credibility and post-clear reclearing must be auditable from stored fields rather than inferred from opaque provider logs. |
| Add review-not-approved and challenge-blocked to the canonical acceptance criterion for failure-bonus denial | 0.90 | The mechanism already denies these cases elsewhere, but the main acceptance criterion omitted them. That inconsistency could under-specify hard review/challenge gates. |
| Update mechanism and deployment identifiers from **v1.20 / `crecm_v1_20`** to **v1.21 / `crecm_v1_21`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.21 Improvements from `moralpublicgoods27.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow payment-commitment, authorization-reconciliation, and cross-view-integrity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Use immutable **PaymentCommitmentSnapshot** records for final clearing and failure-bonus qualification instead of mutable live Common Ground Budget payment fields | 0.90 | Provider-confirmed payment-method state can change after round close. Clearing and failure-bonus auditability should depend on a stored round-close or early-cutoff snapshot with a hash, not on mutable live fields. |
| Treat partial, wrong-amount, expired-before-capture, or short-expiring authorization/custody holds as reconciliation failures; remove affected rows and deterministically reclear before capture or release | 0.89 | Post-clear authorization is useful only if the hold covers the exact reconciled obligation and remains valid through expected capture. Otherwise the final allocation can still rely on unavailable money. |
| Add explicit `AuthorizationReconciliationEvent` records for removed rows, fixed-point reclearing iterations, and post-clear authorization evidence | 0.87 | The mechanism already requires post-clear reconciliation. A first-class event object makes the reclearing path auditable without relying on opaque provider logs or prose-only implementation. |
| Require moral-bucket distinctness to be symmetric and frozen in the round rulebook before lock | 0.87 | Cross-view clearing depends on bucket distinctness. If bucket A treats B as distinct but B does not reciprocally treat A as distinct, counterparty validation can become inconsistent and easier to game. |
| Replace the remaining optional bonus-match capped-proration language with mandatory deterministic capped-proration language | 0.96 | v1.18 made capped-proration mandatory, but one Stage 5 sentence still said additional passes were optional. That inconsistency could produce non-reproducible bonus allocations. |
| Update mechanism and deployment identifiers from **v1.21 / `crecm_v1_21`** to **v1.22 / `crecm_v1_22`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.22 Improvements from `moralpublicgoods28.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow implementation-consistency, auditability, and cross-view-integrity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the Stage 2 candidate-allocation pipeline with the Section 8 router by using immutable `PaymentCommitmentSnapshot` records rather than mutable Common Ground Budget payment fields | 0.93 | v1.22 correctly moved Section 8 to snapshots, but Stage 2 still read live budget payment fields. Codex could implement the stale Stage 2 path and let mutable or changed payment state affect final clearing. |
| Add an explicit `RoundMoralBucketSnapshot` data model and require all counterparty-bucket validation to use the frozen reciprocal snapshot rather than live `MoralBucket.distinctFromBucketIds` | 0.91 | v1.22 required symmetric frozen bucket distinctness but did not give a first-class snapshot object. Without it, cross-view clearing could depend on mutable bucket data or inconsistent implementations. |
| Update the Section 10 failure-bonus qualification code to define and use the early-cutoff `PaymentCommitmentSnapshot` explicitly | 0.88 | v1.22's qualification predicate referenced `earlyPaymentCommitmentSnapshot` without defining it in that section. A critical payout predicate should be locally implementable and audit-safe. |
| Align tests, acceptance criteria, and do-not-build constraints with provider-confirmed payment snapshots and frozen reciprocal bucket snapshots | 0.89 | Several requirements still mentioned live saved-payment fields or mutable `MoralBucket.distinctFromBucketIds`. Those stale references could lead to implementation paths that contradict v1.22's snapshot-based design. |
| Update mechanism and deployment identifiers from **v1.22 / `crecm_v1_22`** to **v1.23 / `crecm_v1_23`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

---

### 0.23 Improvements from `moralpublicgoods29.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow snapshot-binding, cross-view-integrity, and implementation-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind `PaymentCommitmentSnapshot` eligibility to the current round, participant, budget, snapshot kind, rulebook hash, and `asOf` cutoff in both final clearing and failure-bonus qualification | 0.91 | v1.23 required immutable payment snapshots, but the predicates did not explicitly verify all binding fields. Without these checks, a wrong-round, wrong-budget, wrong-kind, or after-cutoff snapshot could be accidentally used. |
| Add `moralBucketSnapshotId` and `rulebookHash` to the frozen bucket-snapshot path, and require the selected `RoundMoralBucketSnapshot` to match the current round and rulebook with `asymmetricPairCount === 0` | 0.90 | v1.23 required frozen reciprocal bucket snapshots, but the round stored only a hash and the routing predicate did not explicitly bind the snapshot to the round/rulebook. Cross-view clearing should not depend on an unbound or asymmetric snapshot. |
| Replace the remaining current-mechanism references to live `MoralBucket.distinctFromBucketIds` with frozen `RoundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId` | 0.89 | v1.23's current invariants and Stage 3 constraints still contained stale live-bucket language, which could lead Codex to implement mutable bucket validation despite the snapshot-based design. |
| Correct remaining nonexistent-stage references to `Stage 2` | 0.94 | The document has no Stage 13; the intended reference is Stage 2. Leaving that typo could make Codex search for or create a nonexistent pipeline stage instead of enforcing the intended candidate-allocation checks. |
| Update mechanism and deployment identifiers from **v1.23 / `crecm_v1_23`** to **v1.24 / `crecm_v1_24`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.24 Improvements from `moralpublicgoods30.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow snapshot-completeness, auditability, and implementation-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add an immutable `RoundClearingInputBundle` so final clearing uses frozen round-close copies of participant budgets, support stances, conditional intents, identity eligibility, payment-commitment snapshots, and bucket snapshots rather than mutable live records | 0.90 | v1.24 correctly made payment and bucket inputs snapshot-based, but the formulas still read mutable budget, stance, conditional-intent, and identity fields. Post-close edits could otherwise change clearing, thresholds, counterparty volume, or matching. |
| Require Section 8 and Stage 2 formulas to treat `commonGroundBudget`, `supportStance`, `conditionalTradeIntent`, and `identityEligibility` as bundle-derived immutable inputs | 0.90 | This keeps the displayed formulas usable while preventing Codex from implementing live-record reads in the final clearing path. |
| Add `clearingInputBundleHash` to audit bundles, tests, acceptance criteria, and do-not-build constraints | 0.89 | The mechanism already requires reproducibility from stored input bundles, but the audit data model did not expose a first-class hash for the participant-input bundle. |
| Fix the missing list marker for the wrong-amount / short-expiry authorization do-not-build constraint | 0.88 | A missing bullet in a long negative specification can make Codex parse the constraint less reliably, and the constraint is materially important for post-clear authorization integrity. |
| Update mechanism and deployment identifiers from **v1.24 / `crecm_v1_24`** to **v1.25 / `crecm_v1_25`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.25 Improvements from `moralpublicgoods31.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow cutoff-binding, bundle-binding, and audit-reproducibility fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require `PaymentCommitmentSnapshot.asOf` to equal the relevant cutoff (`round.closesAt` for final clearing and `round.earlyFailureBonusCutoff` for failure-bonus qualification), rather than merely being before the cutoff | 0.92 | A snapshot from earlier in the round can become stale if the payment method is detached or requires action before the cutoff. Cutoff-exact snapshots make the commitment predicate reflect provider state at the decision boundary. |
| Require final clearing to use a round-bound `RoundClearingInputBundle` whose `sourceCutoffAt === round.closesAt`, `calculationVersion === round.calculationVersion`, and `bundleHash` matches the locked round | 0.91 | v1.25 introduced clearing bundles but did not require the displayed formulas to reject an unbound, wrong-version, or wrong-cutoff bundle. A wrong bundle would undermine reproducibility. |
| Store `clearingInputBundleId` and `clearingInputBundleHash` on `MpgfRound` and `RoundAuditBundle`, and add bundle schema/calculation-version fields to `RoundClearingInputBundle` | 0.89 | Audit bundles should identify the exact frozen input bundle, not only rely on prose or a loose hash field. Versioned bundle schemas reduce implementation drift. |
| State explicitly that failure-bonus qualification uses bundle-derived `CommonGroundBudget`, `ConditionalTradeIntent`, and `IdentityEligibility` rows rather than mutable live records | 0.88 | The invariant existed at a high level, but Section 10's qualification code could still be read as using live records. Failure-bonus qualification is a payout path and should be snapshot-bound. |
| Update mechanism and deployment identifiers from **v1.25 / `crecm_v1_25`** to **v1.26 / `crecm_v1_26`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.26 Improvements from `moralpublicgoods32.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow final-clearing immutability, sponsor-input, and audit-reproducibility fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Define and enforce `roundClearingInputBundleEligible` in Stage 2 itself, not only in Section 8 | 0.96 | Stage 2 referenced `roundClearingInputBundleEligible` without defining it locally. Codex could implement Stage 2 as written and hit an undefined guard in the canonical candidate-allocation path. |
| Add `canonicalInputJsonHash` and `sponsorCommitmentInputHash` to `RoundClearingInputBundle`, and require the bundle to bind both canonical input content and frozen sponsor commitments | 0.91 | v1.26 froze participant inputs but still left sponsor-backed calculations and canonical bundle content less explicitly bound. Final matching should not depend on mutable live sponsor commitment rows or an unauthenticated input-reference path. |
| Require payment-commitment predicates to check `providerEvidenceHash`, not merely snapshot existence and timestamps | 0.89 | A provider-confirmed payment snapshot should carry auditable provider evidence. Requiring the evidence hash reduces the risk that empty or placeholder snapshots count toward final clearing or failure-bonus qualification. |
| Bind failure-bonus qualification to an eligible `RoundClearingInputBundle` and make its eligibility inputs include the bundle hash | 0.89 | Section 10 said failure-bonus qualification used bundle-derived rows, but the predicate did not require an eligible bundle. Cash or credit payout eligibility should be reproducible from the same frozen participant inputs as final clearing. |
| Require final `sponsorBackedCents` calculations to use frozen sponsor inputs from the clearing bundle, not mutable live `SponsorCommitment` rows | 0.90 | Base match, bonus match, and failure bonuses depend on the sponsor pool. Letting post-close sponsor-row edits affect final clearing would undermine donor-facing credible commitment. |
| Update mechanism and deployment identifiers from **v1.26 / `crecm_v1_26`** to **v1.27 / `crecm_v1_27`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.27 Improvements from `moralpublicgoods33.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow frozen-input, uniqueness, hash-integrity, and implementation-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Freeze project economic terms and project candidate-cap inputs inside `RoundClearingInputBundle` via `projectInputHash` | 0.91 | v1.27 froze participant, payment, sponsor, and bucket inputs, but final formulas still read project terms such as caps, thresholds, and match ratios from `project` rows. Mutable project edits after close could otherwise change clearing or match calculations. |
| Replace live or ambiguous `userRemainingRoundBudget` / `project.remainingRequestedCap` inputs with deterministic bundle-derived remaining-budget and remaining-project-cap state | 0.90 | Final clearing should not depend on live user/project state or inconsistent field names. The remaining-budget and remaining-cap quantities must be deterministic allocator state derived from frozen input rows. |
| Require non-empty, auditable hash fields through an explicit `isNonEmptyHash` predicate for payment evidence, snapshot hashes, bundle hashes, canonical input hashes, sponsor-input hashes, and project-input hashes | 0.89 | `!= null` permits empty placeholder strings. Empty hash fields would undermine reproducibility and allow unaudited snapshots or bundles to pass eligibility checks. |
| Add explicit uniqueness constraints for payment snapshots, round bucket snapshots, clearing bundles, and failure-bonus claims | 0.90 | The lookup pattern `paymentCommitmentSnapshotByBudgetIdAndKind[budgetId]?.round_close` is ambiguous if multiple records exist. Uniqueness constraints make the snapshot and payout paths deterministic. |
| Bind failure-bonus claim records directly to the eligible clearing input bundle | 0.88 | The eligibility hash included the bundle hash, but storing the bundle reference directly makes payout audits and duplicate-claim prevention more robust. |
| Update mechanism and deployment identifiers from **v1.27 / `crecm_v1_27`** to **v1.28 / `crecm_v1_28`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.28 Improvements from `moralpublicgoods34.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow hash-format, frozen-sponsor, component-bundle, and audit-field fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace the weak `isNonEmptyHash` predicate with an explicit canonical SHA-256 hash-format predicate for clearing and payout hash fields | 0.92 | A non-empty string can still be a placeholder. Final clearing, payment evidence, bundle, sponsor, project, and snapshot hashes should match a canonical digest format and be reproducible from serialized inputs. |
| Require every component hash in `RoundClearingInputBundle` to pass the canonical hash predicate before final clearing | 0.91 | v1.28 checked several bundle hashes but not all component hashes. Missing or placeholder budget, stance, intent, identity, payment-snapshot, or project-eligibility hashes would undermine final-clearing reproducibility. |
| Define `sponsorBackedCentsForFinalClearing(poolType)` over frozen sponsor-commitment inputs and use it in final hard gates, matching, and failure-bonus availability | 0.90 | v1.28 stated that final sponsor calculations use frozen sponsor inputs, but several final formulas still used the ambiguous `sponsorBackedCents(...)` name. A distinct final-clearing function prevents live sponsor rows from re-entering payout calculations. |
| Add direct canonical-input, project-input, sponsor-input, and moral-bucket-snapshot hashes to `RoundAuditBundle` | 0.88 | The audit bundle already stored the clearing bundle hash, but direct component hashes make audits and mismatch diagnosis easier without changing allocation semantics. |
| Add tests and do-not-build constraints for canonical hash-format validation and frozen-sponsor final calculations | 0.89 | These rules are security and auditability requirements, not merely prose. Tests are needed to prevent Codex from accepting placeholder hashes or live sponsor inputs in final clearing. |
| Update mechanism and deployment identifiers from **v1.28 / `crecm_v1_28`** to **v1.29 / `crecm_v1_29`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.29 Improvements from `moralpublicgoods35.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow sponsor-backing, payout-eligibility, and deterministic-calculation fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Separate pre-round donor-facing sponsor-pool advertisement checks from final-clearing sponsor-backed calculations | 0.94 | v1.29 correctly introduced frozen sponsor inputs for final clearing, but some text still used the final-clearing function in before-round-open contexts. Before a clearing bundle exists, the platform must use preview/opening sponsor checks; final payout must use frozen bundle sponsor inputs. |
| Require final sponsor-backed calculations to count only frozen sponsor records with canonical `sourceHash` and non-negative integer-cent commitment/funding amounts | 0.90 | Sponsor backing is a credible-commitment input. Malformed sponsor evidence or negative/fractional monetary fields should not unlock matches or failure bonuses. |
| Align the non-negotiable failure-bonus pool invariants with `sponsorBackedCentsForFinalClearing("failure_bonus")` | 0.92 | v1.29 still had older invariant language using ambiguous `sponsorBackedCents("failure_bonus")`. The canonical invariant should match the final-clearing function used in the actual payout formulas. |
| Define `identityWeightBps` locally in failure-bonus qualification from the bundle-derived identity row | 0.93 | The Section 10 payout predicate used `identityWeightBps` without defining it in that section. A cash-or-credit eligibility path should be locally implementable and audit-safe. |
| Require deterministic fixed-point / pinned-decimal QF and diversity-score arithmetic for bonus allocation | 0.88 | Bonus-match cents depend on QF, entropy, diversity, and collusion-discount scores. Those intermediate values should not depend on implementation-specific floating-point behavior if audit bundles must reproduce final allocations. |
| Update mechanism and deployment identifiers from **v1.29 / `crecm_v1_29`** to **v1.30 / `crecm_v1_30`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.30 Improvements from `moralpublicgoods36.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow null-safety, snapshot-uniqueness, and deterministic-bonus-allocation fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Make missing support stances default to `abstain`, with zero allocation and empty counterparty buckets, directly inside the Section 8 and Stage 2 formulas | 0.93 | The user-facing mechanism already says abstain is the default. Without null-safe formula support, a missing stance row could crash clearing or be implemented inconsistently instead of contributing zero. |
| Make missing identity-eligibility rows count as zero identity weight and fail counting, matching, and failure-bonus qualification rather than being dereferenced | 0.91 | Identity eligibility is a hard anti-sybil input. Missing identity rows should never unlock thresholds, matching, counterparty volume, or failure bonuses. |
| Enforce uniqueness for `ProjectRoundEligibilitySnapshot(roundId, projectId)` | 0.90 | Failure-bonus qualification selects a round-open eligibility snapshot by project. Multiple snapshots for the same project-round would make payout eligibility ambiguous. |
| Allocate bonus-match dollars from deterministic quantized `bonusScoreUnits`, not from floating-point `qfAdjusted` values | 0.92 | v1.30 required fixed-point / pinned-decimal bonus arithmetic but the displayed allocation formula still prorated over `qfAdjusted`. Using quantized score units closes the implementation gap. |
| Store `bonusScoreUnits` on `CoalitionClearanceResult` and require bonus-score unit tests / do-not-build constraints | 0.89 | The audit bundle already stores `bonusScoreHash`; storing the per-project score units makes final bonus allocation easier to reproduce and prevents hidden float-dependent allocation paths. |
| Update mechanism and deployment identifiers from **v1.30 / `crecm_v1_30`** to **v1.31 / `crecm_v1_31`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.31 Improvements from `moralpublicgoods37.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow validation, anti-sybil, and deterministic-score fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require counting and bonus eligibility to depend on human verification plus clear sybil/collusion state, not identity weight alone | 0.91 | v1.31 made missing identity rows safe, but high `countedWeightBps` with non-clear or unverified identity could still unlock counted dollars. Thresholds, supporter counts, counterparty volume, matching, and failure bonuses should not be unlocked by unverified or under-review identities. |
| Reject or zero invalid cent and basis-point caps before candidate allocation | 0.90 | Negative, fractional, or malformed caps could otherwise produce negative or non-reproducible allocations. Actual/count/match-eligible outputs should be derived only from non-negative integer-cent caps and normalized basis-point caps. |
| Make QF raw-score and bonus-score-unit computation fully fixed-point instead of leaving `Math.sqrt` / `Math.pow` float pseudocode in the allocation path | 0.93 | v1.31 said bonus scoring must be fixed-point, but the displayed formulas still used implementation-dependent floating-point operations for raw QF. Final sponsor cents should be reproducible from quantized fixed-point score units. |
| Treat stored `bonusScoreUnits` as canonical non-negative integer strings while all allocation arithmetic uses exact integer arithmetic | 0.89 | v1.31 stored bonus-score units as strings but used them in numeric proration formulas. Explicit integer conversion prevents hidden JavaScript `number` coercion or overflow. |
| Require `ProjectRoundEligibilitySnapshot.snapshotHash` to be canonical and to cover its eligibility fields before failure-bonus qualification | 0.88 | Failure-bonus qualification depends on the round-open eligibility snapshot. Placeholder or under-specified snapshot hashes would weaken payout auditability. |
| Update mechanism and deployment identifiers from **v1.31 / `crecm_v1_31`** to **v1.32 / `crecm_v1_32`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.32 Improvements from `moralpublicgoods38.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow validation, snapshot-binding, and deterministic-accounting fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require conditional-intent `minCounterpartyVolumeCents` to be positive integer cents and treat malformed counterparty-bucket arrays as empty | 0.92 | Counterparty-volume conditions are part of the moral-trade constraint. Fractional, malformed, or non-array counterparty inputs could otherwise create non-reproducible clearing or accidental cross-view satisfaction. |
| Fail closed on malformed round identity-threshold basis points and use a sanitized integer `roundDonorCountedCapCents` in counted/match formulas | 0.90 | Invalid round caps or thresholds should not unlock counting, matching, or threshold satisfaction. A malformed donor-counted cap must not propagate NaN, fractional, or negative counted dollars. |
| Add `snapshotKind: "round_open"` and `sourceCutoffAt === round.opensAt` to `ProjectRoundEligibilitySnapshot` and require them for failure-bonus qualification | 0.91 | Failure bonuses depend on whether a project was otherwise eligible at round open. A snapshot that is not explicitly bound to the round-open cutoff could be confused with a later or wrong-kind snapshot. |
| Normalize project base-match and bonus-cap basis-point fields with explicit integer-bps helpers; malformed non-null match bps values resolve to zero instead of producing fractional or unintended sponsor payouts | 0.88 | Project matching parameters are frozen economic terms. Malformed bps values should not silently default to a positive match or produce non-integer sponsor payout behavior. |
| Default invalid support-stance values to abstain and sanitize stance/intent counterparty-bucket arrays before intersection | 0.89 | The mechanism already says abstain is the default. Invalid stances or malformed bucket arrays should not crash clearing, expose unintended counterparty buckets, or create inconsistent cross-view constraints. |
| Update mechanism and deployment identifiers from **v1.32 / `crecm_v1_32`** to **v1.33 / `crecm_v1_33`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.33 Improvements from `moralpublicgoods39.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow validation, payment-commitment, and deterministic-accounting fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Sanitize round sponsor-budget fields before hard gates, match calculations, and failure-bonus calculations | 0.94 | v1.33 validated many participant-side cent fields, but `round.baseMatchBudgetCents`, `round.bonusBudgetCents`, and `round.failureBonusBudgetCents` could still be malformed, negative, fractional, or NaN. Sponsor-budget fields must not produce negative pool availability, negative match payouts, or invalid failure-bonus caps. |
| Treat malformed identity-weight bps as zero instead of clamping or coercing them | 0.92 | Identity weights are anti-sybil inputs. A fractional, string-coerced, NaN, or out-of-range `countedWeightBps` should never unlock counted dollars, counterparty volume, sponsor matching, or failure bonuses. |
| Require non-empty payment-method references in round-close and early-failure-bonus payment-commitment snapshots | 0.90 | A provider-confirmed snapshot with an empty payment-method reference is not an auditable payment commitment. The snapshot should not count toward final clearing or failure-bonus qualification unless the payment-method reference is present. |
| Define deterministic fixed-point constants and stance-weight maps, and guard invalid review-pressure thresholds in bonus scoring | 0.90 | v1.33 used `alphaFixed`, `betaFixed`, `gammaFixed`, `stanceWeightFixed`, and `reviewPressureThreshold` without fully defining the fixed-point constants and denominator guard. Bonus allocation should be reproducible and should not divide by zero or fall back to implementation-dependent values. |
| Mark `ProjectSupportStance.minCounterpartyVolumeCents` as non-authoritative; final clearing uses `ConditionalTradeIntent.minCounterpartyVolumeCents` only | 0.88 | Cross-view counterparty volume is a conditional-intent constraint. Keeping a second authoritative field on the stance row creates a duplicate source of truth that could let Codex implement inconsistent clearing. |
| Update mechanism and deployment identifiers from **v1.33 / `crecm_v1_33`** to **v1.34 / `crecm_v1_34`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.34 Improvements from `moralpublicgoods40.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow project-threshold, snapshot-binding, failure-bonus-cap, and deterministic-score-input fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Validate project economic terms before hard gates and threshold checks | 0.93 | v1.34 validated many participant, round, and sponsor fields but still let malformed, negative, fractional, or NaN project thresholds and supporter/cluster minima affect clearing. Invalid project economic terms should block clearing rather than accidentally lower thresholds. |
| Require `PaymentCommitmentSnapshot.snapshotHash` to cover all binding payment-commitment fields | 0.92 | v1.34 required a canonical snapshot hash and provider-evidence hash, but did not explicitly require the snapshot hash to bind the snapshot kind, round, participant, budget, payment-method reference, cutoff, rulebook, provider evidence, and timestamps. Payment-commitment auditability depends on that binding. |
| Require `RoundMoralBucketSnapshot.snapshotHash` to cover the frozen reciprocal bucket-distinctness graph | 0.91 | Cross-view clearing depends on the frozen bucket graph. A canonical but under-specified bucket-snapshot hash would weaken reproducibility of counterparty-bucket validation. |
| Enforce the 5% failure-bonus sponsor-budget cap before advertising, qualifying, or paying failure bonuses | 0.90 | v1.34 stated the integer cap formula but did not make the cap a required eligibility predicate. Failure bonuses should be disabled when the published cap is not satisfied. |
| Fail closed on malformed bonus-score risk/diversity inputs | 0.88 | Invalid cluster-share distributions or collusion-risk scores can otherwise create non-reproducible bonus scores. Invalid cluster distributions should contribute zero diversity, and invalid collusion-risk inputs should be treated as maximum risk for bonus allocation. |
| Update mechanism and deployment identifiers from **v1.34 / `crecm_v1_34`** to **v1.35 / `crecm_v1_35`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.35 Improvements from `moralpublicgoods41.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow canonical-binding, sponsor-timing, reciprocal-graph, and basis-point fail-closed fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require `RoundClearingInputBundle.bundleHash` to bind the full canonical bundle identity and component-hash set, and require a non-empty bundle schema/ref | 0.92 | v1.35 required component hashes to be canonical, but a valid-looking `bundleHash` could still be arbitrary. Final clearing should reject unbound bundles because the bundle is the root of payout reproducibility. |
| Require the frozen moral-bucket snapshot graph to be well-formed, not merely hash-bound: non-empty bucket set, reciprocal map keys matching bucket IDs, no self-distinctness, reciprocal edges, and empty blocked pairs when `asymmetricPairCount === 0` | 0.91 | Cross-view clearing depends on bucket distinctness. A hash-bound but malformed graph could still create inconsistent or unintended counterparty validation. |
| Require final sponsor-backed calculations to count only sponsor commitments whose donor-facing publication and backing-confirmation timestamps are present and no later than round open | 0.90 | Sponsor matching is supposed to be precommitted before donors act. Without timing checks, late or post-close sponsor records could retroactively satisfy match backing and weaken credible commitment. |
| Fail closed on out-of-range basis-point caps and match ratios rather than clamping them to positive values | 0.89 | Out-of-range user caps and project match ratios are invalid consent/economic terms. Clamping can silently create unintended allocation or sponsor payouts; zero/rejection is safer and more auditable. |
| Extend metrics, tests, acceptance criteria, and do-not-build constraints to cover bundle binding, moral-bucket graph well-formedness, sponsor backing timing, and out-of-range bps fail-closed behavior | 0.89 | These are security and reproducibility rules; without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.35 / `crecm_v1_35`** to **v1.36 / `crecm_v1_36`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.36 Improvements from `moralpublicgoods42.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow timestamp-validation, failure-bonus-availability, and bundle-row consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require canonical UTC timestamp validation before using timestamps for payment snapshots, sponsor precommitment timing, bundle cutoffs, and round-open eligibility snapshots | 0.90 | v1.36 used string timestamp comparisons such as `<= round.opensAt`. Without canonical timestamp validation, malformed or differently formatted timestamps could pass or fail timing predicates non-reproducibly. |
| Align Section 8's identity-eligibility row with the Stage 2 bundle-row semantics | 0.91 | Section 8 still read `identityEligibility?.[userId]` even though the surrounding text and Stage 2 define `identityEligibility` as a bundle-derived row. The stale map lookup could make identity checks fail or diverge across router implementations. |
| Resolve the failure-bonus under-backed-pool ambiguity by making final failure-bonus availability zero unless the final frozen sponsor backing fully covers the advertised failure-bonus budget | 0.90 | The mechanism requires donor-facing failure bonuses to be precommitted. Allowing partial automatic payout when final backing is below the advertised pool conflicts with the freeze/re-consent rule and weakens credible commitment. |
| Require non-empty strings to be non-whitespace strings | 0.88 | Payment-method references, bundle schema fields, canonical-input references, and sponsor timing fields should not pass validation when they contain only whitespace. |
| Add metrics, tests, acceptance criteria, and do-not-build constraints for canonical timestamp validation and full-backed failure-bonus availability | 0.89 | These are payout and audit integrity rules; without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.36 / `crecm_v1_36`** to **v1.37 / `crecm_v1_37`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.37 Improvements from `moralpublicgoods43.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow timing, counterparty-input, and failure-bonus disclosure fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require the round timeline itself to be canonical and well ordered before lock, clearing, matching, or failure-bonus qualification | 0.91 | v1.37 validated individual timestamps but did not explicitly require `opensAt`, `reviewFreezeAt`, `earlyFailureBonusCutoff`, `closesAt`, and `challengeDeadline` to form a coherent lifecycle. A malformed or reversed round timeline can break cutoff semantics and audit reproducibility. |
| Treat malformed, duplicate, or whitespace-only counterparty-bucket arrays as empty for user-facing stance and conditional-intent inputs | 0.90 | v1.37's helper deduplicated malformed arrays, which could let an invalid input still satisfy cross-view clearing. Counterparty buckets are consent and moral-trade constraints; invalid arrays should fail closed. |
| Split failure-bonus advertisement from final failure-bonus qualification/payout: advertisement uses preview/opening full backing, while qualification and payout use frozen final full backing | 0.91 | v1.37 correctly required full final backing for payout but one integrity rule implied that pre-round advertisement could depend on a final-clearing function that does not exist before the clearing bundle. This could confuse preview/opening checks with final payout checks. |
| Replace remaining identity-weight “clamping” language with zero-on-malformed / fail-closed language | 0.89 | v1.37's formulas treat malformed or out-of-range identity weights as zero, but some prose still said identity weights were clamped. That could cause Codex to implement positive allocation power for invalid identity records. |
| Add metrics, tests, acceptance criteria, and do-not-build constraints for round-timeline validation, strict counterparty-bucket raw validation, and failure-bonus preview/full-backing separation | 0.89 | These are clearing and payout integrity rules; without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.37 / `crecm_v1_37`** to **v1.38 / `crecm_v1_38`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.38 Improvements from `moralpublicgoods44.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow rulebook-freeze, sponsor-preview, and consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require the round rulebook, sponsor-pool source hash, calculation version, failure-bonus policy version, and parameter-freeze timestamp to be valid before lock, clearing, matching, authorization, or failure-bonus qualification | 0.92 | v1.38 validated the round timeline but still allowed final clearing to rely on a non-canonical rulebook hash, empty calculation version, empty failure-bonus policy version, missing sponsor-pool source hash, or `parametersFrozenAt` after the round opened. That weakens rule-lock credibility and audit reproducibility. |
| Define `sponsorBackedCentsForPreview(poolType, previewAsOf)` explicitly for pre-round sponsor-pool advertisement | 0.90 | v1.38 referenced preview/opening sponsor backing but left the preview function informal. Donor-facing advertised match and failure-bonus pools should be backed by current, round-bound, pool-specific, source-hashed, timestamp-valid sponsor commitments before opening. |
| Replace the remaining stale failure-bonus sentence that described availability as `min(roundFailureBonusBudgetCents, sponsorBackedCentsForFinalClearing("failure_bonus"))` | 0.94 | v1.38 changed the rule to all-or-zero full backing for advertised failure bonuses. The old `min(...)` sentence conflicts with that rule and could reintroduce partial payout after under-backing without freeze/re-consent. |
| Replace the remaining identity-weight data-model comment that still mentioned clamping | 0.89 | The current mechanism treats malformed or out-of-range identity weights as zero. A stale data-model comment saying “clamp” could cause Codex to give positive allocation power to invalid identity rows. |
| Add metrics, tests, acceptance criteria, and do-not-build constraints for rulebook/parameter-freeze validation and sponsor-preview backing validation | 0.89 | These are credible-commitment and auditability rules. Without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.38 / `crecm_v1_38`** to **v1.39 / `crecm_v1_39`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.39 Improvements from `moralpublicgoods45.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow frozen-input, sponsor-evidence, and failure-bonus qualification fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require frozen moral-bucket snapshots to be created no later than the round parameter-freeze timestamp and require reciprocal-map raw keys to exactly match the bucket set | 0.91 | v1.39 required graph well-formedness, but the implementation could ignore extra malformed reciprocal-map keys and did not explicitly bind the snapshot creation time to the parameter freeze. Cross-view clearing should not depend on a bucket graph that could be created or altered after the rulebook was frozen. |
| Require sponsor commitments counted for preview or final backing to have both `committedCents` and `fundedCents` as non-negative integer cents, regardless of which field the current commitment state pays from | 0.90 | v1.39's prose required both fields to be valid, but the helper checked only the field used for the current state. A malformed unused monetary field should not be part of a sponsor commitment that unlocks donor-facing credible commitment. |
| Require failure-bonus qualification itself, not merely payout, to fail unless final frozen sponsor backing fully covers the advertised failure-bonus budget | 0.91 | v1.39 said no claim may qualify or pay under final under-backing, but the `qualified` predicate checked only the budget-cap predicate. This could create approved/qualified zero-payout claims and confuse audit semantics. |
| Add a binding hash predicate for `ProjectRoundEligibilitySnapshot` and require failure-bonus project eligibility to use it rather than accepting any canonical-looking snapshot hash | 0.92 | Failure-bonus eligibility depends on round-open project status. Merely checking that the snapshot hash is well formed does not prove it binds the eligibility booleans, cutoff, project, round, and rulebook fields. |
| Require non-empty identifier strings and counterparty string-array entries to be trim-stable, not merely non-whitespace after trimming | 0.88 | Provider refs, schema refs, version strings, bucket IDs, and counterparty bucket IDs should not pass validation with leading or trailing whitespace that changes canonical serialization, hash reproducibility, or bucket matching. |
| Add metrics, tests, acceptance criteria, and do-not-build constraints for these rules | 0.89 | These are clearing, sponsor-backing, and payout-audit rules; without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.39 / `crecm_v1_39`** to **v1.40 / `crecm_v1_40`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.40 Improvements from `moralpublicgoods46.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow consent, preview-backing, and authorization-audit fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require `CommonGroundBudget.budgetPeriod` to be one of the allowed enum values and require recurring budgets to have a canonical next-capture timestamp plus a non-empty trim-stable next-capture rule before allocation | 0.92 | v1.40 required recurring consent and non-null capture fields, but an invalid budget period with non-null fields could still pass. Recurring budget consent should not depend on malformed period or capture metadata. |
| Require active conditional intents to have a valid authorization-state enum and a valid fallback-rule enum before they can clear | 0.89 | v1.40 rejected only `authorizationState === "failed"`; malformed authorization or fallback states could still enter clearing. Intent state is a consent and fallback-control input, so invalid enum values should fail closed. |
| Add a `previewAsOf` cutoff to sponsor-preview backing so donor-facing sponsor-pool advertisements cannot rely on future-dated sponsor publication or backing-confirmation timestamps | 0.90 | v1.40 required preview sponsor timestamps no later than round open, but a pre-open preview could still count future-dated records. Donor-facing sponsor backing should exist by the actual preview/advertisement time. |
| Add binding-hash and timestamp/integer validation for `AuthorizationReconciliationEvent`, and require custody authorization timing fields to be canonical before exact-amount authorization can keep a row payable | 0.91 | Authorization reconciliation removes unavailable money before capture. Without a binding event hash and canonical timing checks, audit bundles can be reproducible in name but not in the actual removed-row event trail. |
| Require `RoundClearingInputBundle.bundleHash` to bind the bundle `id` as well as the round, schema, source cutoff, component hashes, canonical input reference/hash, and creation timestamp | 0.88 | v1.40 required the hash to bind bundle identity, but the displayed canonical hash omitted the bundle `id`. Including the selected bundle id reduces ambiguity in audit and duplicate-bundle failure modes. |
| Add metrics, tests, acceptance criteria, and do-not-build constraints for these rules | 0.89 | These are consent, credible-commitment, and auditability rules; without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.40 / `crecm_v1_40`** to **v1.41 / `crecm_v1_41`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.41 Improvements from `moralpublicgoods47.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow self-matching, safe-integer, sponsor-freeze, consent-enum, and authorization-audit fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add same-payment-method / payment-cluster exclusion to counterparty-volume satisfaction, data, tests, metrics, and do-not-build constraints | 0.92 | v1.41 excluded same-payment-method accounts in one counterparty-volume sentence but did not expose a stable data field or consistently list the exclusion in invariants, Stage 3 constraints, tests, and negative constraints. A donor should not be able to satisfy cross-view conditions through another account using the same payment method. |
| Require JavaScript-number cent, count, and basis-point inputs to be safe integers, or otherwise fail closed / use exact BigInt or fixed-point helpers | 0.90 | The mechanism requires deterministic integer-cent accounting. `Number.isInteger` can accept numbers outside JavaScript's safe integer range, where cent arithmetic is not reliably exact. |
| Require sponsor commitments that back locked donor-facing schedules to be published and backing-confirmed no later than `round.parametersFrozenAt`, not merely before `round.opensAt` | 0.91 | v1.41 froze the rulebook before round open but still allowed sponsor commitments after the parameter-freeze timestamp to support final backing. A locked advertised match schedule should not depend on post-freeze sponsor records. |
| Require `CommonGroundBudget.fallbackRule` to be a valid fallback enum before the budget can allocate | 0.89 | v1.41 validated conditional-intent fallback rules but not budget-level fallback rules. Invalid budget fallback metadata can create non-consented behavior when a project fails. |
| Restrict active conditional intents that can clear to pre-capture/payable authorization states: `none`, `payment_method_saved`, or `authorized` | 0.89 | v1.41 allowed `captured` and `released` conditional intents to clear. Those are post-capture/post-release states and should not expose new allocation authority in a final clearing pass. |
| Require authorization-reconciliation event uniqueness and bind the event `id` and valid reconciliation-state enum into `eventHash`; require payable custody rows to have valid provider metadata and `custodyState === "authorized"` | 0.91 | Authorization reconciliation is the audit trail for removing unavailable money before capture. Duplicate or under-bound events, invalid reconciliation states, or payable rows without valid provider/authorization state weaken reproducibility and payment integrity. |
| Update mechanism and deployment identifiers from **v1.41 / `crecm_v1_41`** to **v1.42 / `crecm_v1_42`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

---

### 0.42 Improvements from `moralpublicgoods48.md`

This revision changes the mechanism only where the improvement case is above 87% credence. The changes are narrow escrow/JIT-payment, project-eligibility, externality-review, and arithmetic-safety fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Clarify that CRECM can use either legally reviewed escrow/custody or just-in-time authorization/capture, and that escrow/custody claims are forbidden unless the legal/payment stack exists | 0.91 | v1.42 allowed just-in-time authorization throughout the payment flow but Section 11 still said CRECM required supervised custody or an escrow-like partner. That could make Codex build a legally heavier mechanism than intended or market authorization as escrow. |
| Require unresolved externality-review states to fail closed in v1: projects clear only when `externalityState === "clear"` | 0.89 | v1.42 let `externalityState: "review"` pass because the gate rejected only `blocked`. Under a hard-review moral-public-goods mechanism, unresolved externality review should not become payable or receive sponsor matching. |
| Add project identity and destination-route validation before clearing: valid good type, destination type, bucket, destination reference, and frozen-bucket membership | 0.90 | The user-facing eligibility table requires a moral-public-good type and verified recipient route, but the hard-gate implementation mostly checked review and destination-proof states. Invalid project identity or route fields should not clear merely because a status enum says verified. |
| Require exact `BigInt` / fixed-point multiply-divide helpers for cent, count, basis-point, and score-unit products, not just safe-integer inputs | 0.90 | v1.42 correctly rejected unsafe integer inputs, but several formulas still multiplied safe JavaScript numbers before division. The product of two safe integers can itself exceed the safe-integer range, so payout and matching formulas need exact arithmetic for intermediate products. |
| Add metrics, tests, acceptance criteria, and do-not-build constraints for these rules | 0.89 | These are payment-honesty, review-integrity, and reproducible-accounting rules; without tests and negative constraints, Codex could leave them as prose-only requirements. |
| Update mechanism and deployment identifiers from **v1.42 / `crecm_v1_42`** to **v1.43 / `crecm_v1_43`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.43 Improvements from `moralpublicgoods49.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow failure-bonus eligibility, deterministic arithmetic, fixed-point, and deployment-identifier fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align failure-bonus round-open eligibility snapshots with fail-closed externality review and project identity/destination-route hard gates | 0.93 | v1.43 required `externalityState === "clear"` and valid project identity/destination-route fields for clearing and failure-bonus eligibility, but the failure-bonus snapshot still stored only `wasExternalityNonBlockedAtRoundOpen` and did not bind project identity/destination-route validity. That could let otherwise ineligible projects qualify for threshold-family failure bonuses. |
| Replace undefined `bigIntToSafeCents(...)` bonus-proration calls with the defined `bigIntToSafeCentsOrZero(...)` helper | 0.97 | v1.43 defined `bigIntToSafeCentsOrZero` but called `bigIntToSafeCents` in the bonus-proration formulas. An undefined helper in payout pseudocode can cause implementation failure or unreviewed helper substitution. |
| Remove numeric floating-point bonus-default aliases from fixed-point QF sections and keep only fixed-point constants | 0.92 | v1.43 requires deterministic fixed-point bonus arithmetic and forbids payout allocation from implementation-dependent floating-point values. Adjacent `const alpha = 0.20`-style aliases create a direct path for accidental JavaScript-number bonus calculations. |
| Update mechanism and deployment identifiers from **v1.43 / `crecm_v1_43`** to **v1.44 / `crecm_v1_44`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.44 Improvements from `moralpublicgoods50.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow implementation-consistency and payout-eligibility fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add missing Stage 1 hard-gate helper definitions for canonical hash validation and integer-cent/count validation | 0.97 | Stage 1 used `isCanonicalHash`, `isNonNegativeIntegerCents`, and `isNonNegativeInteger` before defining them. Undefined helpers in the canonical hard-gate pipeline could cause implementation failure or unreviewed helper substitution. |
| Align failure-bonus identity-threshold checks with the round's fail-closed `identityWeightMinForBonusBps`, rather than hard-coding `10_000` | 0.94 | The mechanism makes match eligibility and failure-bonus eligibility depend on the round's identity-threshold fields. A hard-coded full-weight threshold could silently diverge from the frozen rulebook and deny or admit claims inconsistently with match eligibility. |
| Require failure-bonus qualification to verify the conditional intent's pre-capture/payable authorization state and valid fallback rule | 0.92 | Stage 2 already requires valid conditional-intent authorization and fallback enums before clearing. The payout predicate should not qualify a failure-bonus claim from a malformed, failed, captured, released, or invalid-fallback intent. |
| Update mechanism and deployment identifiers from **v1.44 / `crecm_v1_44`** to **v1.45 / `crecm_v1_45`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.45 Improvements from `moralpublicgoods51.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow payout-eligibility and implementation-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require failure-bonus qualification to check positive conditional-intent amount, max exposure, counterparty-volume threshold, and valid non-empty counterparty buckets, matching the Stage 2 conditional-intent exposure gates | 0.92 | v1.45 checked conditional-intent state, authorization-state, fallback-rule, rulebook, and lock timing, but not the positive exposure/counterparty fields that Stage 2 requires before an intent can clear. A payout predicate should not qualify a malformed, zero-exposure, or counterparty-empty intent merely because a downstream `failedQualifiedMatchEligibleCents` value is nonzero. |
| Align failure-bonus denial language, tests, acceptance criteria, and do-not-build constraints with the canonical denial categories, including anti-threat, project-identity/destination-route, externality, sybil, collusion, same-payment-method / same-payment-cluster, and authorization failures | 0.93 | The canonical invariants denied these categories, but some summary/test/do-not-build text omitted several of them. In a cash-or-credit failure-bonus path, stale denial lists can lead to under-testing and accidental payout on non-threshold failures. |
| Align failure-bonus identity-threshold tests and acceptance criteria with the round's fail-closed `identityWeightMinForBonusBps`, rather than stale hard-coded `10_000` prose | 0.95 | The qualification predicate now uses the round's frozen identity-threshold field. Leaving test and acceptance text at `10_000` could make Codex write tests against the wrong threshold and silently diverge from the rulebook. |
| Add same-payment-method / same-payment-cluster exclusions to the Stage 3 counterparty-volume prose, matching the invariant and optimizer constraint list | 0.91 | The Stage 3 constraint list already excluded same-payment-method clusters, but the explanatory counterparty-volume paragraph omitted them. That omission could let an implementation use the weaker paragraph and reintroduce a self-matching path. |
| Update mechanism and deployment identifiers from **v1.45 / `crecm_v1_45`** to **v1.46 / `crecm_v1_46`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.46 Improvements from `moralpublicgoods52.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow payout-consent and deterministic-arithmetic fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require failure-bonus qualification to check an active, uncanceled, rulebook-consented Common Ground Budget with valid budget period, valid fallback rule, valid caps, and current recurring-budget consent | 0.93 | v1.46 required `failedQualifiedMatchEligibleCents` to exclude consent-invalid budgets, but the explicit cash-or-credit `qualified` predicate did not directly check Common Ground Budget state, cancellation, rulebook consent, fallback metadata, recurring consent, or caps. Failure bonuses should fail closed on invalid or ended budget consent rather than relying only on a downstream derived amount. |
| Replace `Math.floor(... / 10)` failure-bonus formulas with an exact integer division helper | 0.91 | The mechanism already requires integer-cent deterministic payout accounting and tests describe integer division by 10 for the 10% failure-bonus formulas. Using an explicit BigInt-backed integer division helper avoids accidental floating-number division in cash-or-credit payout calculations. |
| Update mechanism and deployment identifiers from **v1.46 / `crecm_v1_46`** to **v1.47 / `crecm_v1_47`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.47 Improvements from `moralpublicgoods53.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow row-binding and payout-integrity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Common Ground Budget, support-stance, conditional-intent, and identity-eligibility rows used in final clearing to be explicitly bound to the current round, project, and participant | 0.94 | v1.47 froze these rows inside a `RoundClearingInputBundle`, but the candidate-allocation predicates did not directly reject wrong-round, wrong-project, or wrong-participant rows. Explicit row binding prevents accidental cross-row allocation or counterparty satisfaction if bundle lookup or join code is mis-keyed. |
| Require failure-bonus qualification to bind the conditional intent and identity-eligibility row to the current round, project, participant, and Common Ground Budget | 0.95 | The cash-or-credit failure-bonus predicate checked budget consent and intent exposure fields, but did not directly check the conditional intent's round/project/participant binding or the identity row's round/participant binding. Wrong-row qualification would undermine the threshold-family-only failure-bonus rule. |
| Add tests, acceptance criteria, and do-not-build constraints for wrong-round, wrong-project, wrong-participant, and cross-budget participant-row rejection | 0.92 | These row-binding rules are security and auditability requirements. Without tests and negative constraints, Codex could leave them as prose-only requirements while still using weak lookup assumptions. |
| Update mechanism and deployment identifiers from **v1.47 / `crecm_v1_47`** to **v1.48 / `crecm_v1_48`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.48 Improvements from `moralpublicgoods54.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow null-safety, row-binding, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Make candidate-allocation Common Ground Budget row access null-safe in both Section 8 and Stage 2, including budget-period checks, cap checks, payment-snapshot lookup, identity-row binding, support-stance binding, conditional-intent binding, and remaining-budget lookup | 0.94 | v1.48 correctly required wrong-row and missing-row inputs to fail closed, but the local candidate-allocation pseudocode still dereferenced `commonGroundBudget` before the fail-closed predicate could run. Missing or malformed bundle joins should produce zero allocation, not an implementation crash or accidental row substitution. |
| Widen candidate-allocation integer helper signatures to accept optional/null row fields and fail closed | 0.91 | The candidate-allocation formulas pass optional bundle-derived fields such as conditional-intent amounts and support-stance caps into integer validators. Narrow `number`-only helper signatures could make a strict TypeScript implementation diverge from the intended fail-closed semantics. |
| Gate Stage 7 failure-bonus claim creation on an eligible clearing bundle and use null-safe early-payment-snapshot lookup | 0.92 | v1.48's main failure-bonus predicate required an eligible clearing bundle, but the Stage 7 claim-creation snippet could dereference a missing `roundClearingInputBundle` or `commonGroundBudget` before the qualification helper could deny the claim. |
| Add tests, acceptance criteria, and do-not-build constraints for missing Common Ground Budget rows, null-safe payment-snapshot lookups, and missing clearing-bundle fail-closed behavior | 0.91 | These null-safety and row-binding rules are implementation-critical; without tests and negative constraints, Codex could leave them as prose-only requirements while still crashing or substituting rows on missing inputs. |
| Update mechanism and deployment identifiers from **v1.48 / `crecm_v1_48`** to **v1.49 / `crecm_v1_49`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.49 Improvements from `moralpublicgoods55.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow implementation-consistency and anti-ambiguity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind reciprocal counterparty-bucket lookup to the project's frozen `project.bucketId` instead of an undefined `targetMoralBucket.id` alias | 0.95 | v1.49 required project bucket IDs to appear in the frozen moral-bucket snapshot, but the Section 8 and Stage 2 formulas still looked up reciprocal distinct buckets through `targetMoralBucket.id`, which is not defined or locally bound. An undefined target-bucket alias in the cross-view clearing path could cause implementation failure or unreviewed live-bucket substitution. |
| Replace remaining floating-point stance-weight aliases in Section 8 and Stage 2 with fixed-point / reporting-only language | 0.92 | v1.49 requires fixed-point stance weights for bonus scoring and forbids payout-relevant floating-point QF arithmetic, but Section 8 and Stage 2 still exposed numeric `1.0` / `0.6` stance-weight aliases. Those aliases are unused in candidate allocation and create a direct path for accidental floating-point scoring. |
| Replace active generic `sponsorBackedCents(poolType)` references with the explicit preview and final-clearing sponsor-backed functions | 0.94 | The current mechanism distinguishes current-record preview checks from frozen final-clearing sponsor calculations. Active generic sponsor-backed terminology in Section 11, tests, and acceptance criteria could reintroduce ambiguous current-record reads in clearing or audit paths. |
| Update mechanism and deployment identifiers from **v1.49 / `crecm_v1_49`** to **v1.50 / `crecm_v1_50`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.50 Improvements from `moralpublicgoods56.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow project-row, counterparty-threshold, failure-bonus-bundle, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require bundle-derived project rows used in hard gates and candidate allocation to be explicitly bound to the current round, with trim-stable project and bucket IDs, and make project-row access null-safe | 0.94 | v1.50 required participant-row binding but still dereferenced `project.id`, `project.bucketId`, and project economic/status fields before locally proving that the bundle-derived project row existed, matched the current round, and exposed valid identifiers. Missing, wrong-round, or malformed project rows should fail closed rather than crash or invite live-row substitution. |
| Replace generic counterparty-volume threshold references with the active `ConditionalTradeIntent.minCounterpartyVolumeCents` threshold | 0.91 | v1.50 already made `ProjectSupportStance.minCounterpartyVolumeCents` non-authoritative, but two explanatory formulas still referenced a generic `minCounterpartyVolumeCents(userId, projectId)` function. In the core cross-view clearing path, the threshold source should be unambiguous. |
| Align Stage 7 failure-bonus claim creation with the full `failureBonusBundleEligible` / binding-hash predicate rather than a weaker hash-format-only bundle check | 0.93 | v1.50's main failure-bonus predicate required a fully eligible clearing bundle, but the Stage 7 claim-creation snippet only checked a subset of bundle fields plus canonical hash format. A payout-adjacent path should not call claim creation unless the same full bundle-binding and component-hash checks pass. |
| Update mechanism and deployment identifiers from **v1.50 / `crecm_v1_50`** to **v1.51 / `crecm_v1_51`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.51 Improvements from `moralpublicgoods57.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow hard-gate snapshot-binding and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Stage 1 project identity/destination-route hard gates to use the same frozen, round-bound, rulebook-bound, hash-bound, graph-well-formed `RoundMoralBucketSnapshot` predicate used by candidate allocation | 0.93 | v1.51's Stage 1 project identity/destination-route check only required a non-null snapshot with a raw bucket-id array containing the project bucket. That could let a wrong-round, wrong-rulebook, malformed, asymmetric, or post-freeze bucket snapshot pass the hard gate even though candidate allocation would fail closed. |
| Add tests, acceptance criteria, metrics, and do-not-build constraints for Stage 1 loose moral-bucket-snapshot rejection | 0.91 | The hard-gate rule is implementation-critical; without explicit tests and negative constraints, Codex could leave the stronger frozen-snapshot predicate in Stage 2 while still using a weaker Stage 1 clearing gate. |
| Update mechanism and deployment identifiers from **v1.51 / `crecm_v1_51`** to **v1.52 / `crecm_v1_52`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.52 Improvements from `moralpublicgoods58.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow final-clearing bundle-gating, failure-bonus snapshot-type, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Stage 1 final sponsor-backed hard gates to fail closed unless an eligible round-close `RoundClearingInputBundle` is present and bound by the same bundle/component/sponsor-input predicates used in candidate allocation | 0.93 | v1.52 made candidate allocation and failure-bonus claim creation bundle-gated, but Stage 1 still called `sponsorBackedCentsForFinalClearing(...)` without locally requiring an eligible clearing bundle. Since final sponsor backing is defined over frozen sponsor inputs from the eligible bundle, Stage 1 must not be able to use live sponsor rows or an unbound bundle. |
| Require round-open failure-bonus eligibility snapshot booleans to be exact `true` booleans, not merely truthy values | 0.91 | Failure-bonus project eligibility is a cash-or-credit payout path. v1.52 required binding hashes for the snapshot but the eligibility predicate still used truthiness checks for the eligibility booleans; malformed truthy strings or objects should not qualify threshold-family failure bonuses. |
| Update mechanism and deployment identifiers from **v1.52 / `crecm_v1_52`** to **v1.53 / `crecm_v1_53`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.53 Improvements from `moralpublicgoods59.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow budget-row binding, failure-bonus sponsor-backing, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind `ProjectSupportStance` and `ConditionalTradeIntent` rows to the current `CommonGroundBudget` by `commonGroundBudgetId` in candidate allocation and failure-bonus qualification | 0.94 | v1.53 required wrong-round, wrong-project, wrong-participant, and cross-budget rows to fail closed, but the stance and conditional-intent data model and predicates lacked a budget identifier. That could let a stance or intent from one Common Ground Budget be paired with another budget's caps or payment snapshot for the same participant. |
| Gate Section 10 / Stage 7 failure-bonus final sponsor-backing calculations on the eligible round-close clearing bundle before calling `sponsorBackedCentsForFinalClearing("failure_bonus")` | 0.92 | v1.53 required Stage 1 final sponsor-backed hard gates to be bundle-gated, but the failure-bonus qualification and aggregate-payout snippets still called the final-clearing sponsor-backed function before locally proving an eligible bundle. Since final sponsor backing is defined over frozen sponsor inputs from the eligible bundle, failure-bonus payout paths should fail closed when the bundle is missing or invalid. |
| Update mechanism and deployment identifiers from **v1.53 / `crecm_v1_53`** to **v1.54 / `crecm_v1_54`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.54 Improvements from `moralpublicgoods60.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow sponsor-backing and deterministic-integer consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate Section 9 and Stage 4/5 base-match and bonus-match pool availability on an eligible round-close `RoundClearingInputBundle` before calling `sponsorBackedCentsForFinalClearing("base_match")` or `sponsorBackedCentsForFinalClearing("bonus_match")` | 0.93 | v1.54 bundle-gated Stage 1 final sponsor-backed hard gates and failure-bonus final backing, but Section 9 and Stage 4/5 matching formulas still called the final-clearing sponsor-backed function without a local eligible-bundle guard. Because final sponsor backing is defined over frozen sponsor inputs from an eligible bundle, base and bonus match availability should fail closed when the bundle is missing or invalid. |
| Replace redundant `Math.floor(min(...))` match-eligible formulas with direct integer `min(...)` after counted-contribution and donor-counted-cap values have already passed integer-cent guards | 0.91 | `countedContributionCents` and `roundDonorCountedCapCents` are already integer cents. Keeping `Math.floor(...)` in payout-relevant candidate allocation unnecessarily reintroduces a JavaScript-number rounding operation into a path that the mechanism otherwise specifies as integer-cent deterministic. |
| Update mechanism and deployment identifiers from **v1.54 / `crecm_v1_54`** to **v1.55 / `crecm_v1_55`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.55 Improvements from `moralpublicgoods61.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow final-sponsor-backing guard and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace remaining raw Section 11 and Stage 1 final sponsor-backed hard-gate calls with gated backing variables that are zero unless the eligible round-close clearing bundle predicate has passed | 0.93 | v1.55 already required final sponsor backing to come from the eligible clearing bundle, and it locally gated Section 9, Stage 4/5, Section 10, and Stage 7. But Section 11's summary check and Stage 1's canonical hard-gate list still displayed raw `sponsorBackedCentsForFinalClearing(...)` comparisons. That could lead Codex to implement an ungated call path even though final sponsor backing is defined over frozen sponsor inputs from an eligible bundle. |
| Replace stale failure-bonus explanatory comparisons against raw `sponsorBackedCentsForFinalClearing("failure_bonus")` with the gated `finalFailureBonusBackingCents` variable | 0.91 | The failure-bonus formulas already compute `finalFailureBonusBackingCents` as `0` unless `failureBonusBundleEligible` is true. Explanatory prose should use the same gated variable rather than suggesting a direct call to frozen sponsor backing when the bundle may be missing or invalid. |
| Update mechanism and deployment identifiers from **v1.55 / `crecm_v1_55`** to **v1.56 / `crecm_v1_56`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.56 Improvements from `moralpublicgoods62.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow hard-gate consistency, support-stance row-binding, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace the remaining Section 7 raw final sponsor-backed hard-gate comparisons with gated Stage 1 backing variables | 0.93 | v1.56 already required Stage 1 and Section 11 final sponsor-backed checks to use gated backing variables, but the Section 7 canonical hard-gate list still displayed raw snake-case final sponsor-backed comparisons. The canonical list should not leave a weaker implementation path that bypasses the eligible clearing-bundle predicate. |
| Gate support-stance-derived stance, cap, and counterparty-bucket inputs on a bound current Common Ground Budget / project / participant row in Section 8 and Stage 2 | 0.92 | v1.56 required wrong-budget and wrong-project support stances to contribute zero and expose no caps or counterparty buckets, but the formulas computed stance-derived inputs before proving `supportStanceRowEligible`. A wrong-row support stance should default to abstain, zero caps, and empty counterparty buckets before any candidate-allocation or cross-view validation path can read it. |
| Update mechanism and deployment identifiers from **v1.56 / `crecm_v1_56`** to **v1.57 / `crecm_v1_57`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.57 Improvements from `moralpublicgoods63.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow selected-row uniqueness, failure-bonus project-row binding, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Enforce deterministic uniqueness for bundle-selected `ProjectSupportStance` and clearing-eligible `ConditionalTradeIntent` rows per `(commonGroundBudgetId, projectId)` | 0.92 | v1.57 bound stance and intent rows to the current Common Ground Budget, but did not make duplicate selected rows for the same budget/project fail closed. Without uniqueness, final clearing could select one row for caps or counterparty buckets and another for rank order, fallback, authorization, or failure-bonus qualification. |
| Require failure-bonus qualification to directly verify the bundle-derived project row is current-round-bound and exposes trim-stable project/bucket IDs before any claim can qualify | 0.91 | v1.57's invariants said project rows used for failure-bonus qualification must be bound and null-safe, but the Section 10 cash-or-credit `qualified` predicate did not directly require a valid bundle-derived project row before checking the round-open eligibility snapshot and intent project binding. A payout-adjacent predicate should not rely only on a downstream derived amount for project-row validity. |
| Update mechanism and deployment identifiers from **v1.57 / `crecm_v1_57`** to **v1.58 / `crecm_v1_58`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.58 Improvements from `moralpublicgoods64.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow project-input uniqueness, finite-cap arithmetic, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Enforce deterministic uniqueness for bundle-derived `PublicGoodProject` rows per `(roundId, id)` inside the round-close input bundle | 0.92 | v1.58 made project rows bound and null-safe but did not explicitly make duplicate bundle-derived project rows fail closed. Without this, final clearing could select one row's bucket/status/economic terms and another row's thresholds or matching parameters, undermining reproducibility. |
| Replace non-finite `Infinity` stance-cap fallback values with finite sanitized integer-cent caps in Section 8 and Stage 2 | 0.91 | Candidate allocation is payout-relevant integer-cent arithmetic. When no basis-point stance cap is set, the finite `supportStanceMaxAllocCents` cap is semantically equivalent to `min(maxAllocCents, Infinity)` but avoids non-finite sentinels in deterministic allocation logic. |
| Update mechanism and deployment identifiers from **v1.58 / `crecm_v1_58`** to **v1.59 / `crecm_v1_59`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.59 Improvements from `moralpublicgoods65.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow formula-level row-uniqueness and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Operationalize bundle-derived project, support-stance, and conditional-intent row uniqueness directly in Section 8, Stage 1, Stage 2, and Section 10 formulas using bundle-derived row-count guards | 0.93 | v1.59 stated project/stance/intent uniqueness in invariants, tests, and do-not-build constraints, but the payout-relevant formulas still accepted a selected row without proving that the immutable bundle contained exactly one eligible row for the relevant key. Row-count guards prevent arbitrary row selection from affecting allocation, counterparty buckets, matching, authorization, or failure-bonus qualification. |
| Update mechanism and deployment identifiers from **v1.59 / `crecm_v1_59`** to **v1.60 / `crecm_v1_60`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.60 Improvements from `moralpublicgoods66.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow payout-input uniqueness, Stage 7 claim-gating, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add formula-level row-count guards for bundle-derived `IdentityEligibility` rows, round-close and early-cutoff `PaymentCommitmentSnapshot` rows, and round-open `ProjectRoundEligibilitySnapshot` rows in final-clearing and failure-bonus paths | 0.93 | v1.60 added formula-level guards for project, support-stance, and conditional-intent rows, but payment snapshots, project-round eligibility snapshots, and identity rows were still selected by key without proving that the immutable bundle contained exactly one eligible row. Duplicate selected payout or identity inputs could otherwise let arbitrary row selection affect threshold counting, matching, payment credibility, or failure-bonus qualification. |
| Require Stage 7 failure-bonus claim creation to be gated by the full Section 10 `qualified` predicate, including row-count uniqueness guards, rather than by project eligibility plus bundle eligibility alone | 0.92 | v1.60's Stage 7 snippet still allowed claim creation to be attempted after only project eligibility and bundle eligibility, while passing possibly null early-payment snapshot fields into the claim helper. A cash-or-credit payout path should not create or advance a claim unless the same full predicate used for Section 10 qualification has passed. |
| Update mechanism and deployment identifiers from **v1.60 / `crecm_v1_60`** to **v1.61 / `crecm_v1_61`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.61 Improvements from `moralpublicgoods67.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow budget-row uniqueness, payment-snapshot keying, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add formula-level row-count guards for bundle-derived `CommonGroundBudget` rows in final-clearing and failure-bonus paths | 0.92 | v1.61 required Common Ground Budget rows to be bound and null-safe, but unlike project, stance, intent, identity, payment-snapshot, and project-eligibility rows, the payout-relevant formulas still accepted a selected Common Ground Budget row without proving that the immutable bundle contained exactly one eligible row for that budget key. Duplicate budget rows could otherwise let arbitrary row selection affect consent, caps, payment-snapshot lookup, remaining budget, matching, authorization, or failure-bonus qualification. |
| Key formula-level `PaymentCommitmentSnapshot` row-count and lookup maps by round, Common Ground Budget, and snapshot kind | 0.91 | The invariant states payment snapshots are unique per `(roundId, commonGroundBudgetId, snapshotKind)`, but v1.61's formula-level row-count and selected-snapshot maps were keyed only by budget and kind. Making the round dimension explicit prevents wrong-round or cross-round snapshot ambiguity and aligns final-clearing and failure-bonus payment-commitment predicates with the frozen round-close bundle. |
| Update mechanism and deployment identifiers from **v1.61 / `crecm_v1_61`** to **v1.62 / `crecm_v1_62`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.62 Improvements from `moralpublicgoods68.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow participant-budget uniqueness, snapshot-lookup keying, Stage 2 implementation-syntax, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require formula-level Common Ground Budget uniqueness by both `(roundId, id)` and `(roundId, participantId)` in final-clearing, failure-bonus, and Stage 7 paths | 0.92 | v1.62 added row-count guards for Common Ground Budget rows by budget id, but the mechanism is user-round-budget based and still used participant-level remaining-budget state. Multiple budget rows for the same participant in one round could let arbitrary row selection or split budget rows affect caps, consent, payment-snapshot lookup, authorization, matching, or failure-bonus qualification. |
| Key formula-level `ProjectRoundEligibilitySnapshot` selected-snapshot lookups by `(roundId, projectId)` in Section 10 and Stage 7 | 0.91 | v1.62 row-counted project-round eligibility snapshots by round and project, but the selected snapshot lookup was still keyed by project id alone. That could let a wrong-round snapshot be selected before the binding predicate rejects it, or deny a valid claim because an arbitrary same-project snapshot from another round was selected. |
| Restore missing Stage 2 `const` declarations for `actualAllocCents`, `countedContributionCents`, and `matchEligibleCents` | 0.96 | Stage 2 is the canonical candidate-allocation pipeline, but these three payout-relevant variables were displayed as bare assignments while Section 8 used local constants. In strict TypeScript or direct implementation, bare assignments can fail compilation or create unintended outer-scope mutation. |
| Update mechanism and deployment identifiers from **v1.62 / `crecm_v1_62`** to **v1.63 / `crecm_v1_63`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.63 Improvements from `moralpublicgoods69.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow failure-bonus claim-gating, bundle-integrity, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Stage 7 failure-bonus project eligibility and the `evaluateSection10FailureBonusQualified(...)` call to carry `projectFailed` explicitly | 0.93 | Section 10's cash-or-credit qualification predicate requires `projectFailed`, but Stage 7's local project-eligibility snippet did not directly check it and did not pass it into the full qualification helper. A payout-adjacent claim-creation path should not rely on ambient stage context for the fact of project failure. |
| Align Section 12.1 bundle-integrity constraints with Common Ground Budget participant uniqueness and project-round eligibility lookup-keying rules | 0.92 | v1.63 required formula-level Common Ground Budget uniqueness by both `(roundId, id)` and `(roundId, participantId)`, and project-round eligibility selected-snapshot lookups by `(roundId, projectId)`, but Section 12.1 still omitted the explicit Common Ground Budget uniqueness lines and did not state the project-eligibility lookup key in the integrity prose. |
| Update mechanism and deployment identifiers from **v1.63 / `crecm_v1_63`** to **v1.64 / `crecm_v1_64`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.64 Improvements from `moralpublicgoods70.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow row-keying, claim-id, exact-arithmetic, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Key formula-level `ProjectSupportStance` and clearing-eligible `ConditionalTradeIntent` row-count guards by `(roundId, commonGroundBudgetId, projectId)`, and bind `ProjectSupportStance` rows directly to the current round | 0.92 | v1.64 required wrong-round support-stance and intent rows to fail closed, but support-stance rows lacked an explicit `roundId` field and the formula-level row-count guards were keyed only by budget/project. Since Common Ground Budget IDs are specified as unique per round rather than globally, a round dimension is needed to prevent cross-round row ambiguity. |
| Require clearing and failure-bonus `ConditionalTradeIntent` rows to expose non-empty trim-stable IDs, and have Stage 7 claim creation use `conditionalTradeIntent.id` explicitly | 0.93 | Stage 7 attempted to create a `FailureBonusClaim` using `conditionalTradeIntentId` without defining it locally. The failure-bonus uniqueness key and audit trail require the active bundle-derived intent's actual ID, and malformed or missing intent IDs should fail closed before clearing or claim creation. |
| Compute the failure-bonus 5% sponsor-budget cap with exact `BigInt` sponsor-budget sums instead of JavaScript-number addition | 0.91 | Each sanitized sponsor budget is a safe integer, but the sum of base-match, bonus-match, and failure-bonus budgets can exceed JavaScript's safe-integer range. The cap predicate is payout-relevant and should compare `failureBonusBudgetCents * 20` to an exact integer sponsor-budget sum. |
| Update mechanism and deployment identifiers from **v1.64 / `crecm_v1_64`** to **v1.65 / `crecm_v1_65`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.65 Improvements from `moralpublicgoods71.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow allocator-state keying, sponsor-backing arithmetic, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Key bundle-derived remaining-budget and remaining-project-cap allocator-state lookups by `(roundId, participantId)` and `(roundId, projectId)` in Section 8 and Stage 2 | 0.92 | v1.65 made row selection round-bound for budgets, projects, stances, intents, payment snapshots, and project-eligibility snapshots, but the allocator-state maps for remaining participant budget and remaining project requested cap were still keyed only by participant or project id. Since project and budget identifiers are specified as round-scoped in several places, wrong-round allocator-state lookups could affect actual allocation. |
| Compute preview and final sponsor-backed pool sums with exact `BigInt` accumulation over eligible sponsor commitments before safe-cent conversion | 0.91 | v1.65 fixed the failure-bonus sponsor-budget cap sum, but `sponsorBackedCentsForFinalClearing(...)` and `sponsorBackedCentsForPreview(...)` still used JavaScript-number `sum(...)` over individually safe commitment amounts. Aggregate sponsor backing is payout-relevant and should not depend on unsafe number summation. |
| Updated mechanism/deployment identifiers from **v1.65 / `crecm_v1_65`** to **v1.66 / `crecm_v1_66`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.66 Improvements from `moralpublicgoods72.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow aggregate-proration arithmetic and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Compute base-match aggregate claim sums and proration denominators with exact `BigInt` arithmetic in Section 9 and Stage 4 | 0.92 | v1.66 required exact sponsor-backed pool sums, but base-match proration still compared and divided by `sumBaseMatchClaimsForAllClearedProjects` as an unspecified JavaScript-number aggregate. Since aggregate match claims are payout-relevant and can exceed safe-integer range even when each claim is safe, the denominator should be an exact integer sum. |
| Compute participant-level failed-qualified totals and aggregate provisional failure-bonus totals with exact `BigInt` arithmetic before caps, proration-factor calculation, and final failure-bonus payout | 0.92 | v1.66 fixed sponsor-budget and sponsor-backed aggregate sums, but failure-bonus participant caps and round-level proration still depended on aggregate cent totals that could be implemented as unsafe JavaScript-number sums. Cash-or-credit failure-bonus proration should not depend on unsafe aggregate-number precision. |
| Updated mechanism/deployment identifiers from **v1.66 / `crecm_v1_66`** to **v1.67 / `crecm_v1_67`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.67 Improvements from `moralpublicgoods73.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow failure-handling fallback-integrity and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace undefined Stage 7 `fallbackRule` reads with a bundle-bound executable fallback rule derived from the current Common Ground Budget / ConditionalTradeIntent context, failing closed to no capture and fresh consent when unavailable or malformed | 0.93 | Stage 7 previously executed refund/reroute/carry-forward/release branches from an unbound `fallbackRule` variable. In a consent-sensitive payout path, fallback execution must not depend on ambient state or wrong-row fallback metadata. |
| Update mechanism and deployment identifiers from **v1.67 / `crecm_v1_67`** to **v1.68 / `crecm_v1_68`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.68 Improvements from `moralpublicgoods74.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow fallback-row-binding, failure-bonus audit-hash, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate Stage 7 fallback execution on exactly one eligible bundle-derived project row, Common Ground Budget row, and ConditionalTradeIntent row before using any fallback rule | 0.93 | v1.68 correctly removed the undefined ambient `fallbackRule`, but the local Stage 7 fallback block could still execute from weakly checked rows without proving formula-level row-count uniqueness, active intent state, rulebook consent, and current project/budget/participant binding. Fallback execution is consent-sensitive, especially for reroute and carry-forward. |
| Define the Stage 7 `FailureBonusClaim.eligibilityInputsHash` locally from the exact eligible bundle/snapshot/intent/failure inputs, and store the early-failure-bonus cutoff on the claim | 0.92 | v1.68's claim-creation snippet passed an unbound `eligibilityInputsHash` and an `earlyFailureBonusCutoff` field that was not present in the claim data model. A payout-adjacent claim must not depend on an ambient hash variable or omit the cutoff it records for audit. |
| Update mechanism and deployment identifiers from **v1.68 / `crecm_v1_68`** to **v1.69 / `crecm_v1_69`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.69 Improvements from `moralpublicgoods75.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow Stage 7 identifier-binding, failure-bonus claim-field, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Made Stage 7 failure-bonus project/snapshot selection use a locally bound project identifier instead of ambient `projectId`, and required claim creation to pass explicit round, project, participant, Common Ground Budget, and failure-reason fields | 0.95 | v1.69's Stage 7 block introduced local fallback identifiers but the failure-bonus snapshot lookup and hash still used `projectId` directly. In an implementation-facing code block, a payout path should not rely on an ambient project identifier or omit required claim identity fields from the creation call. |
| Added `commonGroundBudgetId` to `FailureBonusClaim` and included `earlyFailureBonusCutoff` in the Stage 7 eligibility-input hash | 0.91 | Failure-bonus qualification is bound to a Common Ground Budget and an early cutoff. The claim data model and hash should preserve those binding inputs directly rather than requiring auditors to infer them only from the conditional intent or payment snapshot. |
| Updated mechanism/deployment identifiers from **v1.69 / `crecm_v1_69`** to **v1.70 / `crecm_v1_70`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.70 Improvements from `moralpublicgoods76.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow fallback-consent, project-snapshot-binding, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Required `CommonGroundBudget.fallbackRule` and `ConditionalTradeIntent.fallbackRule` to match before candidate allocation, failure-bonus qualification, or Stage 7 fallback execution can use fallback authority | 0.92 | v1.70 validated each fallback enum and bound the relevant rows, but did not require the budget-level fallback rule and intent-level fallback rule to be the same. A mismatch creates ambiguous consent, especially for reroute and carry-forward; the safer v1 behavior is to fail closed to zero allocation or release/cancel/no-capture until fresh consent resolves the mismatch. |
| Replaced remaining tautological `ProjectRoundEligibilitySnapshot` `projectId === projectId` references with explicit binding to the current bundle-derived project id | 0.93 | Failure-bonus qualification depends on a round-open project snapshot being for the same project as the current bundle-derived project row. A self-comparison is implementation-facing noise and can let tests or acceptance criteria miss wrong-project snapshot selection. |
| Updated mechanism/deployment identifiers from **v1.70 / `crecm_v1_70`** to **v1.71 / `crecm_v1_71`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.71 Improvements from `moralpublicgoods77.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow payment-snapshot binding, fallback-denial consistency, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Required `paymentCommitmentSnapshotBindingHashValid(...)` itself to fail unless `paymentMethodRef` is non-empty and trim-stable in Section 8, Section 10, and Stage 2 | 0.92 | v1.71 required non-empty payment-method references before payment snapshots could affect final clearing or failure-bonus qualification, but the reusable binding-hash predicate only included `paymentMethodRef` in the canonical hash and left non-empty validation to surrounding callers. A local predicate used across payout paths should fail closed if the payment-method reference is empty or whitespace-padded, so an omitted caller-side check cannot turn a hash-bound placeholder reference into a valid commitment. |
| Aligned Section 10's default failure-handling and failure-bonus denial text with the current budget/intent fallback-rule consistency requirement | 0.91 | v1.71 made mismatched Common Ground Budget and ConditionalTradeIntent fallback rules fail closed in formulas and tests, but Section 10's prose still said to execute a generic `user fallback_rule` and did not explicitly list fallback-rule mismatch as a failure-bonus denial / zero-match-eligible condition. Consent-sensitive fallback and failure-bonus paths should not leave a weaker prose path. |
| Updated mechanism/deployment identifiers from **v1.71 / `crecm_v1_71`** to **v1.72 / `crecm_v1_72`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.72 Improvements from `moralpublicgoods78.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow payment-commitment eligibility, version-audit, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Required `paymentCommitmentSnapshotBindingHashValid(...)` itself to fail unless `paymentMethodCommitmentState === "provider_confirmed"` and `paymentMethodSavedAt <= paymentMethodConfirmedAt <= asOf` in Section 8, Section 10, and Stage 2 | 0.92 | v1.72 already required provider-confirmed payment snapshots at the relevant cutoff, but the reusable binding-hash predicate could still return true for a hash-bound snapshot whose state was `none`, `requires_action`, `invalid`, or `detached`, or whose confirmation timestamp was chronologically impossible. A local predicate used across clearing and failure-bonus paths should fail closed when provider-confirmation evidence is missing or malformed. |
| Corrected historical version-trace text in the 0.70 and 0.71 improvement tables | 0.96 | The 0.70 table incorrectly said the `moralpublicgoods76.md` revision updated v1.70 directly to v1.72, and the 0.71 rationales described prior v1.71 issues as v1.72 issues. This is audit/deployment trace metadata, but stale version traces can cause Codex or reviewers to misread which mechanism revision introduced which constraint. |
| Updated mechanism/deployment identifiers from **v1.72 / `crecm_v1_72`** to **v1.73 / `crecm_v1_73`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.73 Improvements from `moralpublicgoods79.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The change is a narrow payment-commitment integrity consistency fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Aligned Section 12.1 snapshot/bundle integrity constraints with the current `paymentCommitmentSnapshotBindingHashValid(...)` predicate by requiring `paymentMethodCommitmentState === "provider_confirmed"` and `paymentMethodSavedAt <= paymentMethodConfirmedAt <= asOf` before any `PaymentCommitmentSnapshot` can affect clearing or failure-bonus qualification | 0.92 | v1.73 enforced provider-confirmed chronological payment snapshots in the reusable binding predicate and tests, but Section 12.1's integrity-constraints paragraph still mentioned only non-empty refs and canonical timestamps. The database/application integrity section should not leave a weaker implementation path for payout-relevant payment snapshots. |
| Updated mechanism/deployment identifiers from **v1.73 / `crecm_v1_73`** to **v1.74 / `crecm_v1_74`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.74 Improvements from `moralpublicgoods80.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The change is a narrow failure-bonus policy-version auditability fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bound `FailureBonusClaim` records and `FailureBonusClaim.eligibilityInputsHash` to the current `round.failureBonusPolicyVersion` | 0.92 | v1.74 requires `failureBonusPolicyVersion` to be valid before failure-bonus qualification, but the Stage 7 claim data model and eligibility-input hash did not store or bind the specific failure-bonus policy version used to decide the claim. A cash-or-credit payout audit object should not require reviewers to infer the policy version only from mutable round metadata or a broader rulebook hash. |
| Updated mechanism/deployment identifiers from **v1.74 / `crecm_v1_74`** to **v1.75 / `crecm_v1_75`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.75 Improvements from `moralpublicgoods81.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow implementation-consistency and auditability fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Required `paymentCommitmentSnapshotBindingHashValid(...)` itself to fail unless `snapshotKind` is a valid payment-commitment snapshot kind, `roundId` / `participantId` / `commonGroundBudgetId` are non-empty trim-stable identifiers, and `rulebookHash` is canonical, with matching integrity, test, acceptance, and do-not-build coverage | 0.92 | v1.75 made the reusable payment-snapshot binding predicate enforce non-empty payment-method references, provider-confirmed state, chronological payment timestamps, canonical provider evidence, and canonical snapshot hashes. But the same reusable predicate could still return true for a hash-bound snapshot with a malformed kind, blank round/participant/budget identifiers, or malformed rulebook hash if a caller forgot an outer binding check. A payout-relevant reusable predicate should fail closed on malformed binding identity fields. |
| Removed duplicate fixed-point alpha/beta/gamma/stance-weight `const` redeclarations from Section 9.2 and Stage 5, leaving only the bonus-cap basis-point default in the later defaults block | 0.91 | The bonus-scoring sections already define fixed-point constants before the formulas use them. Redeclaring the same `const` names later in the same implementation-facing section creates an avoidable strict-TypeScript duplicate-identifier path and could make Codex copy inconsistent defaults. Keeping fixed-point constants single-sourced better supports deterministic calculation-version auditability. |
| Updated mechanism/deployment identifiers from **v1.75 / `crecm_v1_75`** to **v1.76 / `crecm_v1_76`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.76 Improvements from `moralpublicgoods82.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow binding-hash fail-closed and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Required `roundMoralBucketSnapshotBindingHashValid(...)` itself to fail unless round/rulebook/distinctness-policy identity fields are valid and the raw bucket graph inputs are valid before canonicalization | 0.91 | v1.76 required the selected moral-bucket snapshot to be graph-well-formed in candidate allocation, but the reusable binding-hash predicate could still return true for a hash-bound snapshot with blank round identity, malformed rulebook hash, missing distinctness-policy version, or malformed raw graph fields if a caller omitted the separate graph predicate. Cross-view counterparty validation should fail closed at the reusable binding predicate as well as at outer eligibility gates. |
| Required `roundClearingInputBundleBindingHashValid(...)` itself to fail unless bundle identity, rulebook, calculation version, snapshot kind, every component hash, moral-bucket snapshot id/hash, canonical input ref/hash, source cutoff, and creation timestamp are valid before canonicalization | 0.93 | v1.76 required `roundClearingInputBundleEligible` to check these fields around the binding predicate, but the reusable bundle binding predicate itself still accepted hash-bound bundles with malformed identity or component fields if a caller forgot an outer check. Since the clearing bundle is the root of reproducible final clearing, the binding predicate should fail closed locally. |
| Updated mechanism/deployment identifiers from **v1.76 / `crecm_v1_76`** to **v1.77 / `crecm_v1_77`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.77 Improvements from `moralpublicgoods83.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow project-round eligibility snapshot integrity and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Required `projectRoundEligibilitySnapshotBindingHashValid(...)` itself to fail unless the project-round eligibility snapshot exposes `snapshotKind === "round_open"`, non-empty trim-stable round/project identifiers, a canonical rulebook hash, canonical cutoff/creation timestamps, exact boolean round-open eligibility fields, and a canonical snapshot hash reproducible from those fields | 0.92 | v1.77 required exact-boolean round-open eligibility snapshots and binding-hash predicates in the surrounding failure-bonus qualification path, but the reusable project-round eligibility snapshot binding predicate itself still accepted hash-bound snapshots with malformed kind, identifiers, rulebook hash, or boolean fields if a caller omitted an outer eligibility check. A payout-relevant reusable predicate should fail closed locally. |
| Updated mechanism/deployment identifiers from **v1.77 / `crecm_v1_77`** to **v1.78 / `crecm_v1_78`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.78 Improvements from `moralpublicgoods84.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow authorization-row binding, reconciliation-audit integrity, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require payable `CustodyAuthorization` rows and `AuthorizationReconciliationEvent` records to expose non-empty trim-stable row identifiers and bind to the current payable or removed row before they can keep a row payable or enter the audit bundle | 0.93 | v1.78 already removes wrong-row authorizations and hashes reconciliation events, but the implementation-facing predicates did not fail closed on blank or whitespace row identifiers. Authorization and reconciliation records are the bridge between cleared obligations and actual payment availability, so wrong-row or weakly identified rows should not keep funds payable, remove rows, or satisfy audit reproducibility. |
| Updated mechanism/deployment identifiers from **v1.78 / `crecm_v1_78`** to **v1.79 / `crecm_v1_79`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.79 Improvements from `moralpublicgoods85.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow helper-definition, counterparty-validation, payout-arithmetic, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Define deterministic fail-closed `min(...)` and `intersection(...)` helpers in the implementation-facing Section 8, Section 10, and Stage 2 code paths before those helpers are used | 0.94 | v1.79 used bare `min(...)` in candidate allocation and failure-bonus formulas, and `intersection(...)` in validated counterparty-bucket calculation, without locally defining either helper. Undefined helpers in payout-relevant and cross-view-clearing pseudocode can cause implementation failure or unreviewed substitutions; the helpers should fail closed on unsafe, negative, fractional, malformed, duplicate, or non-trim-stable inputs. |
| Add invariant, test, acceptance, and do-not-build coverage for fail-closed helper definitions used by allocation, counterparty-bucket intersection, and failure-bonus formulas | 0.92 | Without explicit coverage, Codex could define the helpers loosely, use `Math.min` on unsanitized values, or compute bucket intersections from malformed arrays. These helper semantics are small but payout- and consent-relevant. |
| Updated mechanism/deployment identifiers from **v1.79 / `crecm_v1_79`** to **v1.80 / `crecm_v1_80`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.80 Improvements from `moralpublicgoods86.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow failure-bonus payout-input validation and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Validate and sanitize `failedQualifiedMatchEligibleCents` as positive safe-integer cents before failure-bonus qualification, participant-round cap aggregation, eligibility-input hashing, and claim creation | 0.93 | v1.80 used a raw `failedQualifiedMatchEligibleCents > 0` check, directly converted `failedQualifiedMatchEligibleCents[id]` with `BigInt(...)`, and hash-bound/stored the raw Stage 7 value. Malformed strings, fractional values, unsafe integers, NaN, or missing values could otherwise qualify by JavaScript coercion, crash/coerce during payout arithmetic, or enter claim audit hashes. |
| Updated mechanism/deployment identifiers from **v1.80 / `crecm_v1_80`** to **v1.81 / `crecm_v1_81`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.81 Improvements from `moralpublicgoods87.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow aggregate-helper and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Define a deterministic fail-closed `sumBigInt(...)` helper before aggregate payout/proration formulas use it, and require aggregate base-match, bonus-score-unit, participant failure-bonus, and provisional failure-bonus sums to use that helper | 0.93 | v1.81 required exact BigInt aggregate arithmetic, but implementation-facing Section 9, Section 10, Stage 4, and Stage 5 still called `sumBigInt(...)` without defining the helper. Undefined aggregate helpers in payout-relevant formulas can cause implementation failure or unreviewed substitution with JavaScript-number sums, undermining deterministic cents accounting. |
| Updated mechanism/deployment identifiers from **v1.81 / `crecm_v1_81`** to **v1.82 / `crecm_v1_82`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.82 Improvements from `moralpublicgoods88.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow fail-closed helper and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace remaining payout-relevant raw `Math.min(...)` calls in Section 9 and Stage 4/5 matching formulas with the fail-closed `min(...)` helper, and define that helper in the relevant implementation scope before use | 0.93 | v1.82 defined fail-closed `min(...)` for Section 8, Section 10, and Stage 2, but Section 9 and Stage 4/5 still used raw `Math.min(...)` for base-match pool availability, bonus-match pool availability, and bonus-cap enforcement. Raw `Math.min(...)` can propagate `NaN` on malformed inputs and bypass the mechanism's own fail-closed helper semantics in payout-relevant matching paths. |
| Updated mechanism/deployment identifiers from **v1.82 / `crecm_v1_82`** to **v1.83 / `crecm_v1_83`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.83 Improvements from `moralpublicgoods89.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow participant-proration, helper-definition, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace the undefined `pick(...)` helper and pseudo-named `stableOrder = ascendingHash(...)` argument in participant-round failure-bonus proration with explicit local maps for participant claim amounts and per-claim stable-order keys | 0.94 | v1.83 correctly required participant-round failure-bonus capping to prorate only across that participant's own qualified claims, but the implementation-facing formula still called an undefined `pick(...)` helper and passed a pseudo-named `stableOrder = ...` argument using an ambient `claimId`. A payout-adjacent proration path should construct the exact participant-only amount map and stable-order-key map from qualified claim IDs before proration, so Codex does not substitute an unsafe helper or mis-scope the ordering key. |
| Updated mechanism/deployment identifiers from **v1.83 / `crecm_v1_83`** to **v1.84 / `crecm_v1_84`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.84 Improvements from `moralpublicgoods90.md`

This revision changes the mechanism only where the improvement case is above 90% credence. The changes are narrow failure-bonus proration, matching-default, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Define deterministic fail-closed failure-bonus proration behavior before participant-round or round-level failure-bonus proration can run, replacing the remaining undefined participant and approved-claim proration helper paths | 0.93 | v1.84 removed an undefined `pick(...)` helper but still left participant-round failure-bonus proration dependent on an undefined `prorateParticipantClaimsDeterministicallyWithin(...)` helper, and Stage 7 still called an undefined `prorateApprovedFailureBonusClaimsWithin(...)` helper. These helpers directly determine cash-or-credit payout amounts, so they must be locally defined or replaced by explicit proration arithmetic using sanitized claim IDs, participant-capped amounts, exact `sumBigInt(...)`, basis-point proration, and stable-order keys. |
| Define `defaultBaseMatchRatioBps` locally in Stage 4 before the Stage 4 base-match formula uses it | 0.95 | v1.84's canonical Stage 4 allocation pipeline called `normalizeMatchBps(project.baseMatchRatioBps, defaultBaseMatchRatioBps)` without defining `defaultBaseMatchRatioBps` in that implementation-facing stage. Section 9 defines the default, but Codex could implement Stage 4 as the canonical pipeline and hit an undefined identifier or substitute an unreviewed default. |
| Updated mechanism/deployment identifiers from **v1.84 / `crecm_v1_84`** to **v1.85 / `crecm_v1_85`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |



### 0.85 Improvements from `moralpublicgoods91.md`

This revision changes the mechanism only where the improvement case is above 50% credence. The changes are narrow matching-safety, timing, counterparty-terminology, stable-order, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Sanitize payout-relevant base-match claims, bonus-score-unit parses, bonus caps, and proportional bonus values before BigInt conversion, aggregate summation, capped proration, or direct payout in Section 9 and Stage 4/5 | 0.84 | v1.85 already required exact integer arithmetic and fail-closed aggregate helpers, but several matching formulas still read raw per-project map values immediately before `BigInt(...)`, `sumBigInt(...)`, or cap enforcement. A malformed or missing per-project value should resolve to `0`, not crash, coerce, or poison the matching path. |
| Require `earlyFailureBonusCutoff <= reviewFreezeAt < closesAt` in round lifecycle validation | 0.62 | The failure-bonus cutoff is meant to be early and based on otherwise eligible projects before late review/challenge dynamics. Requiring it no later than review freeze reduces late strategic qualification and gives reviewers a stable review window, though the improvement is moderate because this also reduces round-design flexibility. |
| Replace residual `targetMoralBucketId` / “target moral bucket” wording in implementation-facing counterparty validation with explicit bundle-derived project-bucket wording | 0.72 | The code already set `targetMoralBucketId = projectBucketId`, but the residual target-bucket label is less precise and conflicts with the later rule that reciprocal lookup uses the bundle-derived `project.bucketId`. Renaming reduces the chance of implementers substituting an ambient target bucket or live bucket object. |
| Replace residual callable counterparty-threshold pseudocode with the already bundle-derived active `ConditionalTradeIntent.minCounterpartyVolumeCents` value in Section 8 and Stage 3 | 0.76 | v1.85 already computes `conditionalIntentMinCounterpartyVolumeCents` from the active frozen `ConditionalTradeIntent.minCounterpartyVolumeCents`, but two later snippets still called `conditionalIntentMinCounterpartyVolumeCents(userId, projectId)`. The callable form can be read as an unbound generic lookup and conflicts with the mechanism's conditional-intent-only threshold rule. |
| Replace remaining “ascending hash” stable-order examples with explicit SHA-256 canonical-JSON tuple fields for base-match, bonus-match, and failure-bonus rounding | 0.78 | v1.85 already requires stable ordering by SHA-256 over canonical JSON tuples, but several payout-adjacent examples still used informal “ascending hash of (...)” language. Explicit tuple fields make rounding and proration reproducible and easier to test. |
| Use exact target-payout numerator / total-claim denominator arithmetic for failure-bonus proration, with duplicate-free current-round claim-ID validation before Section 10 and Stage 7 final payout | 0.86 | The locally defined proration helper and Stage 7 path still computed base payouts from a truncated basis-point factor before distributing at most one remainder cent per claim. That can underallocate the funded failure-bonus pool when the truncation deficit exceeds the number of claims. Exact target-share arithmetic preserves deterministic cents accounting while keeping the basis-point factor for reporting. |
| Updated mechanism/deployment identifiers from **v1.85 / `crecm_v1_85`** to **v1.86 / `crecm_v1_86`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.86 Improvements from `moralpublicgoods92.md`

This revision changes the mechanism only where the improvement case is above 50% credence. The changes are mechanism-level accounting, anti-gaming, reproducibility, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Separate gross captured cents, fee cents, and net recipient-disbursed cents; use net recipient-disbursed cents, not fee-inclusive gross dollars, for project minimum-viable and public-good threshold satisfaction | 0.78 | v1.86 disclosed fees but did not make fee accounting payout-relevant. If platform, payment, fiscal-host, or routing fees can be deducted from the cleared amount, a project could appear to meet a threshold while the recipient receives less than the minimum viable amount. Fees should be transparent, auditable, and excluded from counterparty/match/threshold credit unless separately sponsor-paid under the rulebook. |
| Make bonus-affecting dissent pressure sybil-resistant by counting only verified, sybil-clear, collusion-clear, current-round dissent rows, capped to one per participant/control cluster; non-verified dissent can still trigger manual review but not payout scoring | 0.74 | Dissent pressure reduces bonus scoring. If raw dissent counts can include unverified or clustered accounts, attackers can cheaply suppress sponsor bonuses for disfavored projects. Restricting payout-relevant dissent pressure to verified clear identities preserves review signalling while reducing manipulation. |
| Add deterministic final optimizer tie-breakers and bind the solver/greedy algorithm version plus tie-break tuple to the calculation hash | 0.67 | The mechanism requires reproducible auditability but still leaves equal-objective coalition solutions under-specified. Explicit tie-breakers reduce implementation drift and prevent arbitrary solver-dependent allocation choices, while preserving the existing primary objectives and user-rank constraints. |
| Updated mechanism/deployment identifiers from **v1.86 / `crecm_v1_86`** to **v1.87 / `crecm_v1_87`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.87 Improvements from `moralpublicgoods93.md`

This revision changes the mechanism only where the improvement case is above 50% credence. The changes are narrow fee-accounting, threshold-consistency, review-signal, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind fee-policy and per-row `FeeQuote` inputs into the round-close clearing bundle, require positive allocations to have a hash-bound fee quote, and compute counted / match-eligible cents from net recipient-disbursed public-good credit rather than fee-inclusive gross exposure | 0.76 | v1.87 says fee dollars must not satisfy thresholds, counterparty volume, counted contribution, match eligibility, or sponsor-match claims, but the candidate-allocation formulas still computed counted and match-eligible cents from `actualAllocCents` and stored `grossCapturedCents`, `feeCents`, and `netRecipientDisbursedCents` without defining them. A frozen fee quote closes that implementation gap. |
| Align Stage 1 threshold prose with the net-recipient hard gate by replacing the stale `actualClearedCents` threshold description with `netRecipientClearedCents`, while preserving counted and match-eligible threshold/breadth checks | 0.64 | The canonical hard-gate list already uses net recipient-disbursed funding for minimum viable recipient funding. A later Stage 1 sentence still named `actualClearedCents`, which could let fee-inclusive gross dollars satisfy recipient funding gates. |
| Clarify that raw dissent increments only review queues / public reporting, while bonus-affecting dissent pressure uses the verified-clear duplicate-cluster-excluded dissent count | 0.61 | v1.87 correctly made payout-relevant dissent pressure sybil-resistant, but the Stage 2 prose still said dissent increments `dissentPressure` without distinguishing raw review signals from bonus-scoring inputs. This could re-open cheap bonus suppression. |
| Make failure-bonus proration claim lists all-or-nothing valid: malformed, duplicate, wrong-round, wrong-policy, or missing claim identifiers fail closed instead of being silently filtered before participant-round or round-level proration | 0.79 | v1.87 said malformed or wrong-round claim IDs fail closed, but Section 10 and Stage 7 filtered invalid claim IDs out and continued prorating the rest. Silent filtering can hide corrupted payout input and change proration denominators; payout-adjacent claim lists should be rejected as a whole. |
| Updated mechanism/deployment identifiers from **v1.87 / `crecm_v1_87`** to **v1.88 / `crecm_v1_88`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.88 Improvements from `moralpublicgoods94.md`

This revision changes the mechanism only where the improvement case is above 50% credence. The changes are narrow fee-policy binding, fee-quote uniqueness, claim-identity validation, stable-order consistency, accounting-channel, and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind every payout-relevant `FeeQuote` to the current `round.feePolicyHash`, include that hash in `FeeQuote.quoteHash`, require exact fee-quote uniqueness, and expose fee-policy / fee-input hashes in the audit bundle | 0.76 | v1.88 required a frozen fee policy and hash-bound fee quotes, but fee quotes were bound only to `feePolicyVersion`, and `RoundAuditBundle` did not expose `feeInputHash` / `feePolicyHash` directly. A stale or reused policy version could make gross/net-recipient credit unreproducible. Direct hash binding and fee-quote uniqueness make fee accounting auditable and prevent arbitrary quote selection. |
| Require waived-fee quotes to have `feeCents === 0`, while donor-deducted and sponsor-paid fee quotes keep explicit net/gross equations | 0.62 | A waived fee should not create a positive fee liability or a misleading fee report. The previous `feeQuoteNetMatches(...)` rule allowed `feePayer: "waived"` with positive `feeCents` as long as net equaled gross. That is internally inconsistent and can confuse fee reporting and reconciliation. |
| Require failure-bonus claim-list validation to bind each list key to `FailureBonusClaim.id` and to non-empty trim-stable round/project/participant/Common Ground Budget/intent identity fields before participant-round or round-level proration | 0.69 | v1.88 made malformed claim lists fail closed, but Section 10 and Stage 7 still accepted claim-map keys without verifying that the selected `FailureBonusClaim` row's own `id` and identity fields matched the payout context. Payout proration should not proceed from weakly identified or key-mismatched claim rows. |
| Align stale current-mechanism accounting-channel text with the six active channels: gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible cents | 0.74 | v1.88 introduced gross/fee/net-recipient accounting but several current invariants and pipeline sentences still said zeroing or authorization failures affected only actual/count/match-eligible cents or “five accounting channels.” Those stale phrases could let fee or net-recipient rows survive when the allocation row itself should fail closed. |
| Align Stage 4/5 base-match and bonus-match remainder prose with Section 9 by naming the SHA-256 canonical-JSON tuple fields and sanitized cap/claim values | 0.66 | Section 9 already specifies explicit tuple fields for base-match and bonus-match rounding, but the allocation-pipeline Stage 4/5 prose still said only “deterministic stable order.” Payout-remainder ordering should be reproducible from named tuple fields in every implementation-facing path. |
| Add fee-policy version/hash and net-recipient accounting rules to the pre-round published-and-frozen rulebook list | 0.67 | v1.88 made fees payout-relevant. Donors and auditors should know the fee policy before pledging, otherwise net-recipient thresholds and match eligibility could depend on an under-disclosed rulebook input. |
| Updated mechanism/deployment identifiers from **v1.88 / `crecm_v1_88`** to **v1.89 / `crecm_v1_89`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.89 Improvements from `moralpublicgoods95.md`

This revision changes the mechanism where the improvement case is above 50% credence, including both architectural rollout constraints and implementation-specific integrity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add deployment-mode guardrails: `shadow`, `capped_pilot`, and `full`, with zero-capture shadow rounds, real-money pilot caps, and full-scale activation only after an auditable passed deployment review | 0.71 | Forethought emphasizes that voluntary moral-public-goods mechanisms face hard free-rider and coordination problems. A complicated real-money mechanism should not jump directly from specification to uncapped live deployment; shadow and capped-pilot modes reduce downside from solver, payment, fee, identity, and collusion mistakes while preserving a path to full deployment. |
| Deny failure bonuses to project-affiliated or conflicted claimants, including project proposers, recipients, fiscal hosts, sponsors, reviewers, and same-control entities | 0.68 | Failure bonuses are meant to reduce first-mover hesitation, not to reward participants who can propose or influence doomed projects and then collect threshold-failure bonuses. Existing project-level conflict review can be nonblocking; claimant-level self-dealing should still deny cash-or-credit failure bonuses. |
| Require sponsor-paid fee quotes to bind their `sponsorFeeBackingHash` to the current round's frozen sponsor-pool source hash before they can preserve net-recipient public-good credit | 0.64 | v1.89 required sponsor-paid fee quotes to carry a canonical sponsor backing hash, but not that the hash was the current round's frozen sponsor input. A stale or unrelated backing hash could make fee support look funded while fees are not actually backed under the locked sponsor schedule. |
| Align the canonical accounting invariant with the six active accounting channels, and remove the duplicate Section 10 heading | 0.73 | The build target already uses gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible channels. The invariant still listed only five channels, and the duplicate heading could make parsers or implementers split the failure-handling section incorrectly. |
| Updated mechanism/deployment identifiers from **v1.89 / `crecm_v1_89`** to **v1.90 / `crecm_v1_90`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.90 Improvements from `moralpublicgoods96.md`

This revision changes the mechanism where the improvement case is above 50% credence, including both architectural rollout semantics and sponsor-fee / deployment-audit integrity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Turn the v1 scope ban into an implementation-facing project-scope hard gate | 0.78 | v1.90's invariants ban political campaign trades, lifestyle trades, behavior-change promises, threat-like trades, and private-benefit projects, but project eligibility and Stage 1 did not expose a direct project-scope predicate. Since these categories are outside the intended moral-public-good mechanism, they should fail closed before clearing, authorization, matching, payout, or failure-bonus qualification. |
| Separate shadow-mode simulation outputs from binding capture / payout outputs | 0.66 | v1.90 says shadow rounds may run the full clearing, fee, matching, failure-bonus, and audit pipeline but must capture zero. The candidate-allocation formula instead set the deployment exposure cap to zero and rejected shadow allocation, preventing meaningful non-binding simulation. Shadow mode should compute explicitly labeled shadow results while all binding gross-captured, fee, net-recipient, actual, counted, match-eligible, authorization, match, failure-bonus, and payout outputs remain zero. |
| Require sponsor-paid fees to be backed by an explicit aggregate `fee_support` sponsor pool | 0.81 | v1.90 binds each sponsor-paid `FeeQuote` to the round sponsor input hash, but a row-level backing hash and per-row `sponsorFeeBackedCents` can still overcommit a sponsor across many fee quotes unless aggregate sponsor-paid fee obligations are checked against a frozen pool-specific sponsor commitment. Sponsor-paid fees should be treated like a pool-specific sponsor obligation, not as unmetered side support. |
| Require a first-class binding `DeploymentAudit` object for full deployment instead of accepting a canonical-looking audit hash alone | 0.72 | v1.90 requires full rounds to have a passed deployment audit hash, but the implementation-facing predicate checks only that the hash is canonical. A hash string alone does not prove the audit covers the current calculation version, rulebook, fee policy, sponsor inputs, payment/reconciliation path, and prior shadow or capped-pilot evidence. |
| Cap `capped_pilot` candidate allocation by both frozen pilot maximums and bundle-derived remaining exposure state | 0.82 | v1.90 requires frozen pilot caps, but the candidate-allocation formula used only remaining exposure maps. If those allocator-state maps are malformed, wrong, or too high, a capped pilot could exceed the published cap even though the cap fields were valid. |
| Bind capped-pilot deployment-exposure allocator state into the clearing and audit bundles | 0.68 | Once capped-pilot exposure caps depend on remaining round and participant exposure maps, those maps must be frozen and hash-bound like other payout-relevant inputs. Otherwise mutable or wrong-round deployment-exposure state could change pilot allocation after round close or evade audit reproduction. |
| Require `FailureBonusClaimantConflictSnapshot.snapshotHash` to bind claimant-conflict identity fields and exact conflict state before failure-bonus qualification or claim creation | 0.72 | v1.90 denies claimant-conflicted failure bonuses but accepts a canonical-looking conflict snapshot hash. Cash-or-credit claimant conflict gates should be reproducible from a bound snapshot rather than a loose hash-format check. |
| Align bundle-binding invariants, tests, and audit criteria with fee and deployment-exposure component hashes | 0.64 | v1.90 introduced fee-input, fee-policy, and deployment-exposure inputs, but some canonical bundle-binding / audit criteria still listed the older component-hash set. Component-hash lists should match the actual bundle eligibility predicate so implementers do not omit payout-relevant fee or pilot-exposure inputs from reproducibility checks. |
| Updated mechanism/deployment identifiers from **v1.90 / `crecm_v1_90`** to **v1.91 / `crecm_v1_91`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.91 Improvements from `moralpublicgoods97.md`

This revision changes the mechanism where the improvement case is above 50% credence. The changes are narrow deployment-audit evidence-coherence and fee-support aggregation fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require `DeploymentAudit.auditKind`, `targetDeploymentMode`, and prior deployment evidence to be mutually coherent, with equal-length prior evidence arrays, duplicate-free trim-stable prior round ids, no current-round self-reference, repeated prior deployment modes allowed, and aligned prior-evidence tuples bound into `DeploymentAudit.auditHash` | 0.76 | v1.91 made deployment audits first-class, but a `shadow_to_pilot` audit could still target `full`, a full audit could carry ambiguous prior evidence, and separately sorted prior arrays could lose the relationship between a prior round, its audit-bundle hash, and its deployment mode. Since deployment rollout is a real-money safety gate, audit evidence should bind the actual prior shadow/pilot path as aligned tuples rather than only contain canonical-looking arrays. |
| Apply `DeploymentAudit` uniqueness and binding constraints to any selected audit-backed `capped_pilot` or `full` round, not only to `full` deployment | 0.63 | v1.91 allows capped pilots either without an audit or with an audit, but Section 12.1 described uniqueness and binding constraints only for full deployment audits. If a capped pilot chooses to rely on an audit object, that object should be just as uniquely selected and binding-hash-valid. |
| Gate aggregate sponsor-paid fee-support calculations on an eligible round-close bundle and binding-hash-valid current-round sponsor-paid fee aggregate inputs before comparing them to the frozen `fee_support` pool | 0.69 | v1.91 requires sponsor-paid fees to be aggregate-backed, but the Section 11 aggregate could accept weakly bound sponsor-paid fee quote rows and did not require the selected sponsor-paid quotes to pass the same binding-hash, rulebook, fee-policy, and sponsor-input checks used by payout-relevant fee quotes. A missing or malformed fee input set should fail closed rather than silently reducing aggregate fee-support demand. |
| Updated mechanism/deployment identifiers from **v1.91 / `crecm_v1_91`** to **v1.92 / `crecm_v1_92`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.92 Improvements from `moralpublicgoods98.md`

This revision changes the mechanism where the improvement case is above 50% credence, covering both architecture-level rollout safeguards and concrete clearing / accounting fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Let `shadow` rounds run non-binding simulations without requiring provider-confirmed payment-commitment snapshots, while preserving that requirement for `capped_pilot` and `full` binding rounds | 0.74 | v1.92 separated shadow outputs from binding capture channels, but the shared `budgetEligible` predicate still required a round-close provider-confirmed payment snapshot. That makes shadow rounds nearly as high-friction as real-money rounds and undermines their purpose as safe learning runs; binding outputs remain zero in shadow mode. |
| Bind `DeploymentAudit` eligibility to a frozen `round.paymentReconciliationPathHash` | 0.82 | v1.92 requires deployment audits to hash a payment/reconciliation path, but `MpgfRound` did not expose the current path hash and the selected audit did not compare against it. A canonical audit hash can otherwise cover a different payment/reconciliation stack than the one actually used for real-money deployment. |
| Require full-deployment audit evidence to include at least one capped-pilot prior round; shadow-only prior evidence cannot unlock `full` deployment | 0.67 | Shadow simulations are useful, but they do not exercise real authorization, capture, fee, reconciliation, dispute, and payout paths. Because Forethought emphasizes that voluntary moral-public-goods mechanisms are hard to make work, full deployment should require at least one capped real-money pilot before uncapped real-money rollout. |
| Compute aggregate sponsor-paid fee-support demand from selected positive binding sponsor-paid `FeeQuote` rows, not from every frozen possible fee quote in the bundle | 0.73 | v1.92 summed all sponsor-paid fee quotes in the frozen fee input bundle. If the bundle contains quotes for candidate rows that do not clear, the fee-support pool can be over-reserved and valid rounds can be blocked. The aggregate support check should cover only fee quotes referenced by binding cleared allocation rows, while malformed selected rows still fail closed. |
| Require verified-supporter and active-cluster counts to use a frozen minimum net public-good credit per supporter, defaulting to 100 cents while allowing the frozen rulebook to specify a higher processor minimum | 0.57 | v1.92 counted any positive counted contribution toward supporter and cluster breadth. That lets one-cent/dust contributions from verified accounts satisfy breadth thresholds. A small frozen net-recipient minimum reduces dust gaming while preserving configurability and keeping sponsor matching stricter than ordinary counting. |
| Updated mechanism/deployment identifiers from **v1.92 / `crecm_v1_92`** to **v1.93 / `crecm_v1_93`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.93 Improvements from `moralpublicgoods99.md`

This revision changes the mechanism where the improvement case is above 50% credence, covering sponsor-backing null safety, rollout-audit timing/coherence, support-breadth anti-dust safeguards, fee-support aggregation determinism, baseline/action-evidence gating, claimant-conflict binding, bundle-integrity consistency, and failure-bonus proration identity checks:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Move Stage 1 string-array helper definitions before deployment-audit evidence predicates use them, without duplicate `const` redeclarations | 0.78 | v1.93's Stage 1 deployment-audit predicates called `rawStringArrayValid(...)` before that helper was locally defined in the same implementation-facing TypeScript block. In strict implementation, this can cause a temporal-dead-zone runtime failure or encourage unreviewed helper substitution in a real-money deployment gate. |
| Replace residual callable `counterpartyVolumeCents(userId, projectId)` pseudocode with a sanitized current-round/current-budget/current-intent counterparty-volume value before comparing to `ConditionalTradeIntent.minCounterpartyVolumeCents` | 0.72 | v1.93 already treats `ProjectSupportStance.minCounterpartyVolumeCents` as non-authoritative, but Section 8 and Stage 3 still showed a generic callable counterparty-volume threshold. The counterparty constraint should be keyed to the exact participant, Common Ground Budget, project, and conditional intent derived from the frozen bundle. |
| Fail closed on malformed or missing sponsor-commitment input arrays and sponsor-commitment rows before preview or final sponsor-backed calculations | 0.74 | v1.93 said invalid sponsor records count as zero, but the Section 11 helper code dereferenced `frozenSponsorCommitmentInputsFromEligibleBundle`, `currentSponsorCommitments`, and row fields directly. A missing array, null row, or malformed sponsor commitment could crash sponsor backing or invite unreviewed fallback logic rather than counting as zero. |
| Require selected `DeploymentAudit` rows to be created no later than the round parameter-freeze timestamp before they can unlock audit-backed `capped_pilot` or `full` deployment | 0.72 | v1.93 required a first-class deployment audit, but the selected audit could be created after parameters were frozen or after the round opened. Real-money deployment mode is part of the donor-facing rule lock, so a post-freeze audit should not retroactively unlock capture, matching, payout, or audit publication. |
| Enforce the verified-supporter / active-cluster net public-good-credit floor as at least the default 100 cents; lower or malformed frozen values resolve to 100 cents | 0.78 | v1.93's invariant said the floor defaults to 100 cents unless the frozen rulebook specifies a higher processor minimum, but the formulas accepted any positive value, including one-cent floors. That re-opened the dust-supporter gaming path the floor was meant to close. |
| Make `pilot_to_full` deployment-audit evidence contain only capped-pilot prior modes; use `shadow_or_pilot_to_full` when shadow evidence is mixed in | 0.61 | v1.93 required full deployment to include capped-pilot evidence, but `pilot_to_full` still allowed shadow rows in the prior-mode array. Keeping the audit kind semantically aligned with its evidence reduces rollout-audit ambiguity while preserving the mixed-evidence path. |
| Require selected sponsor-paid fee quote IDs to resolve to exactly one frozen `FeeQuote` row by `(roundId, id)` before aggregate fee-support demand can be computed | 0.71 | v1.93 required the selected fee-quote id list to be duplicate-free, but did not prove that the frozen bundle contained exactly one row for each selected id. Since aggregate fee-support demand maps selected ids to rows, duplicate same-id quote rows could make demand depend on arbitrary `.find(...)` ordering. |
| Align the final round-level failure-bonus proration claim-list predicate with the stricter key-bound claim identity predicate used earlier in Section 10 and Stage 7 | 0.69 | v1.93 had one remaining final-proration block that checked only round id and policy version. It should also bind the claim-map key to `FailureBonusClaim.id` and require non-empty project, participant, Common Ground Budget, and conditional-intent identifiers before determining denominators or payouts. |
| Bind deployment mode, pilot caps, deployment-audit identity, and payment/reconciliation path into the round-close `RoundClearingInputBundle` and `bundleHash` before any clearing, matching, authorization, payout, or audit path can proceed | 0.78 | v1.93 made deployment mode and rollout audits payout-relevant, but the bundle root hash still did not explicitly bind the selected deployment mode, capped-pilot limits, audit id/hash/state, or payment/reconciliation path. A post-bundle or wrong-bundle deployment-mode substitution could otherwise change whether rows simulate, cap, authorize, or pay without changing the bundle hash. |
| Compare sponsor-paid fee-support demand to the frozen `fee_support` pool using exact `BigInt` demand values and require selected sponsor-paid `FeeQuote` ids to occur exactly once in the frozen fee input bundle | 0.89 | v1.93 converted aggregate sponsor-paid fee demand back to safe integer cents before the support-pool comparison. If aggregate demand exceeded JavaScript safe-integer range, the helper could return `0`, incorrectly making fee support look sufficient. Duplicate fee-quote ids in the frozen input bundle could also let arbitrary `find(...)` selection determine fee-support demand. |
| Require full-deployment audit evidence to include at least one capped-pilot prior round whose payment/reconciliation path hash matches the current selected deployment audit path | 0.66 | v1.93 required full deployment to cite capped-pilot evidence, but did not machine-bind the prior pilot's payment/reconciliation path. Because full rollout risk is dominated by the real authorization/capture/reconciliation path, at least one cited capped-pilot prior should exercise the same path that full deployment is about to use. |
| Operationalize baseline-integrity, baseline-confidence, and action-evidence gates for binding rounds, while allowing shadow-only provisional learning signals | 0.78 | The non-negotiable invariants already say baseline-integrity rules are hard blocking gates and that action evidence, baseline confidence, and externality review are separate concepts. But the current project eligibility, data model, and hard-gate pipeline did not expose baseline/additionality or action-evidence predicates. Binding real-money funding should not clear, match, pay, or qualify for failure bonuses when a project lacks a clear baseline/additionality story or adequate action evidence; shadow mode can still learn from provisional projects without binding funds. |
| Strengthen `FailureBonusClaimantConflictSnapshot` binding with snapshot kind, cutoff, rulebook, policy, Common Ground Budget, and conditional-intent identity fields, and store the selected conflict snapshot id on claims | 0.70 | Failure-bonus claimant conflict denial is a cash-or-credit anti-self-dealing gate. v1.93 bound only round/project/participant/state/createdAt in the conflict snapshot hash, leaving room for stale, wrong-policy, wrong-budget, or wrong-intent conflict snapshots to support a claim. The selected conflict snapshot should bind the exact payout context. |
| Align Section 12.1 bundle-integrity prose with the active clearing-bundle component set, including `feePolicyHash` and `deploymentExposureInputHash` | 0.72 | Earlier predicates already require fee-policy and deployment-exposure hashes, but the Section 12.1 integrity paragraph still listed an older component-hash set. The database/application integrity section should not leave a weaker implementation path for payout-relevant fee or capped-pilot exposure inputs. |
| Updated mechanism/deployment identifiers from **v1.93 / `crecm_v1_93`** to **v1.94 / `crecm_v1_94`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.94 Improvements from `moralpublicgoods100.md`

This revision changes the mechanism where the improvement case is above 50% credence, covering round-status fail-closed behavior, deployment-audit outcome evidence, deployment-mode cap compatibility, and optimization-trace reproducibility:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Make round lifecycle status a binding fail-closed eligibility gate for clearing, matching, authorization, payout, failure-bonus qualification, and final audit publication | 0.74 | v1.94 stored `MpgfRound.status` and allowed safety freezes / cancellations in prose, but the canonical eligibility predicates did not locally reject `draft`, `frozen`, or `canceled` rounds. A real-money mechanism should not let a stale round-close bundle or otherwise valid sponsor/payment inputs override a safety freeze or cancellation. |
| Add prior-round outcome states to `DeploymentAudit` evidence and require cited rollout evidence to be passed rather than merely present | 0.71 | v1.94 required prior shadow or capped-pilot rounds before audit-backed deployment, but the deployment audit bound only prior ids, modes, audit-bundle hashes, and payment paths. A failed, canceled, or incident-review prior round should not unlock capped-pilot or full real-money deployment merely because it produced an audit-bundle hash. |
| Require pilot cap fields to be mode-compatible: positive only for `capped_pilot`, and null for `shadow` / `full` | 0.60 | v1.94 validates pilot caps for capped pilots, but allows shadow or full rounds to carry non-null pilot-cap values. Those values are semantically inactive yet payout-adjacent; making them null outside capped-pilot mode reduces bundle-hash ambiguity and accidental cap application. |
| Add a first-class deterministic `OptimizationRunTrace` / optimization certificate for Stage 3 solver or greedy runs, and require binding rounds to use only optimal or explicitly versioned deterministic-greedy traces | 0.69 | Stage 3 allowed an ILP solver or deterministic greedy approximation, but did not store a first-class trace proving which mode, objective vector, tie-break hash, and input bundle produced the selected coalition. Without that trace, solver timeouts, nondeterministic solver statuses, or unbound greedy substitutions could change allocation while leaving auditors unable to reproduce the optimization step. |
| Updated mechanism/deployment identifiers from **v1.94 / `crecm_v1_94`** to **v1.95 / `crecm_v1_95`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.95 Improvements from `moralpublicgoods101.md`

This revision changes the mechanism where the improvement case is above 50% credence, covering optimization-policy binding, optimization-trace auditability, and deployment-audit optimizer coverage:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind the round, deployment audit, round-close clearing bundle, and optimization trace to a frozen `optimizationPolicyHash` | 0.74 | v1.95 made Stage 3 optimization traceable, but the frozen rulebook did not expose a first-class optimizer-policy hash. Solver mode, objective-vector construction, tie-break fields, approximation policy, and greedy/ILP fallback rules are payout-relevant; a different optimizer policy should not be able to reuse the same clearing bundle, deployment audit, or audit report. |
| Strengthen `OptimizationRunTrace` with stage/schema identity, optimizer-input, selected-allocation, and constraint-satisfaction hashes, plus an explicit binding predicate | 0.78 | v1.95 required `objectiveVectorHash`, `stableTieBreakTupleHash`, and `selectedCoalitionHash`, but a selected coalition hash alone may omit the exact per-row allocation amounts and constraint checks. A binding trace should prove the optimizer input, selected allocation rows, and post-selection constraint satisfaction before matching, authorization, payout, or audit output. |
| Store both `optimizationTraceId` and `optimizationTraceHash` in audit outputs and require exactly one selected current-round Stage 3 trace | 0.66 | A hash alone is less diagnosable when multiple trace rows exist. Binding the trace id, hash, optimizer policy, round, bundle, and calculation version reduces arbitrary trace selection and makes audit reproduction less brittle. |
| Updated mechanism/deployment identifiers from **v1.95 / `crecm_v1_95`** to **v1.96 / `crecm_v1_96`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.96 Improvements from `moralpublicgoods102.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow bundle-integrity propagation fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align `RoundClearingInputBundle.bundleHash` integrity prose, test requirements, acceptance criteria, and do-not-build constraints with the active v1.96 binding fields | 0.89 | v1.96 correctly binds fee-policy version/hash, deployment mode, pilot caps, deployment-audit identity/state/hash, payment/reconciliation path, deployment-exposure input, and optimization-policy hash in the implementation predicate, but several later prose/test/acceptance/do-not-build references still described the older bundle field set. Those stale references could lead Codex to implement or test a weaker bundle hash despite the stronger active pseudocode. |
| Updated mechanism/deployment identifiers from **v1.96 / `crecm_v1_96`** to **v1.97 / `crecm_v1_97`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.97 Improvements from `moralpublicgoods103.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow round-status final-binding and deployment-consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Treat `open` and `locked` round statuses as non-binding preview/setup states rather than final-binding statuses | 0.87 | v1.97 rejected `draft`, `frozen`, and `canceled` rounds but still let `open` and `locked` satisfy the reusable final-binding status predicate. Final clearing, matching, authorization, capture, payout, failure-bonus qualification, fallback routing, and final binding audit publication should require a post-close operational status such as `reviewing`, `cleared`, `payable`, `released`, or `closed`; otherwise a stale or prematurely created round-close bundle could make an active/open round produce binding money movement before the round has actually moved to review/clearing. Open and locked rounds may still show setup or non-binding preview outputs. |
| Updated mechanism/deployment identifiers from **v1.97 / `crecm_v1_97`** to **v1.98 / `crecm_v1_98`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.98 Improvements from `moralpublicgoods104.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow round-status final-binding correction:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Treat `reviewing` round status as a non-binding review state rather than a final-binding status | 0.88 | v1.98 correctly made `open` and `locked` non-binding, but the reusable final-binding status predicate still allowed `reviewing` to produce final binding clearing, matching, authorization, capture, payout, failure-bonus qualification, fallback routing, and final audit outputs. A round that is still under review should be able to produce only internal review calculations or explicitly non-binding previews; final binding outputs should require `cleared`, `payable`, `released`, or `closed`. |
| Updated mechanism/deployment identifiers from **v1.98 / `crecm_v1_98`** to **v1.99 / `crecm_v1_99`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.99 Improvements from `moralpublicgoods105.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow bundle-integrity propagation fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the non-negotiable invariants and acceptance criteria for `RoundClearingInputBundle` binding with the active v1.99 bundle field set | 0.90 | v1.99's implementation predicate, data model, and later do-not-build constraint already bind fee-policy version/hash, deployment mode, pilot caps, deployment-audit state/id/hash, payment/reconciliation path, optimization-policy hash, bundle schema, source cutoff, canonical-input reference/hash, and every active component hash. But several early non-negotiable invariants and one acceptance criterion still described an older shorthand bundle field set. Because these early invariants are canonical build guidance, leaving them weaker could lead Codex to implement or test a less reproducible clearing bundle despite the stronger later pseudocode. |
| Updated mechanism/deployment identifiers from **v1.99 / `crecm_v1_99`** to **v1.100 / `crecm_v1_100`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.100 Improvements from `moralpublicgoods106.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow round-lifecycle side-effect safety fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Split round-status eligibility into binding-result/replay status, authorization-attempt status, and capture/payout/fallback side-effect status | 0.88 | v1.100 used one broad final-binding status predicate for final clearing, matching, authorization, capture, payout, failure-bonus qualification, fallback routing, and audit outputs. Because `released` and `closed` are post-settlement/replay states, allowing the same predicate to authorize, capture, pay, or execute fallback side effects creates an unnecessary duplicate-side-effect path. The safer lifecycle is: `cleared` may initiate new authorization attempts, `payable` may execute capture/release/payout/fallback side effects, and `released`/`closed` may only publish, replay, or audit already-recorded final outputs. |
| Updated mechanism/deployment identifiers from **v1.100 / `crecm_v1_100`** to **v1.101 / `crecm_v1_101`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.101 Improvements from `moralpublicgoods107.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow bundle-integrity propagation fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the early invariant and acceptance-test descriptions of `RoundClearingInputBundle.bundleHash` with the active v1.101 binding predicate, including explicit `createdAt` binding and the full fee-policy, deployment, deployment-audit, payment/reconciliation-path, optimization-policy, schema, source-cutoff, component-hash, canonical-input, moral-bucket, sponsor-input, and creation field set | 0.88 | v1.101 already made the implementation predicate and later integrity constraints require these fields, but one early non-negotiable invariant omitted `createdAt` and one acceptance criterion still used an older shorthand field list. Because these early sections are canonical implementation guidance, leaving them weaker could lead Codex to test or implement a less reproducible clearing bundle despite the stronger active pseudocode. |
| Updated mechanism/deployment identifiers from **v1.101 / `crecm_v1_101`** to **v1.102 / `crecm_v1_102`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.102 Improvements from `moralpublicgoods108.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow bundle-integrity propagation fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align the remaining `RoundClearingInputBundle.bundleHash` / `roundClearingInputBundleBindingHashValid(...)` test requirements, acceptance criteria, and do-not-build constraints with the active v1.102 binding field set | 0.89 | v1.102's implementation predicate and early invariants bind fee-policy version/hash, deployment mode, mode-compatible pilot caps, deployment-audit state/id/hash, payment/reconciliation path hash, optimization-policy hash, calculation version, bundle schema version, snapshot kind, source cutoff, all active component hashes, canonical input reference/hash, moral-bucket snapshot id/hash, sponsor input, and `createdAt`. But a few later test, acceptance, and negative-build bullets still used older shorthand field lists. Because Codex may implement from those later checklists, leaving them weaker could cause tests to pass while the live bundle hash omits payout-relevant fields. |
| Updated mechanism/deployment identifiers from **v1.102 / `crecm_v1_102`** to **v1.103 / `crecm_v1_103`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.103 Improvements from `moralpublicgoods109.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow Stage 7 side-effect-status gating fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate Stage 7 fallback execution and failure-bonus claim-creation side effects on `round.status === "payable"` | 0.89 | v1.103 split round-status eligibility into result/replay, authorization-attempt, and capture/payout/fallback side-effect statuses, but the active Stage 7 code still executed fallback functions and could create failure-bonus claims whenever bundle and row predicates passed. Because `released` and `closed` remain eligible for deterministic result replay, ungated Stage 7 side effects could duplicate or newly create routing, authorization-cancellation/release, claim-creation, crediting, or payment actions in replay states. Fallback routing, reroute/carry-forward, release/cancel, and failure-bonus claim/payment side effects should require `payable`; `released` and `closed` may only replay/report/audit already-recorded failure-handling outputs. |
| Updated mechanism/deployment identifiers from **v1.103 / `crecm_v1_103`** to **v1.104 / `crecm_v1_104`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.104 Improvements from `moralpublicgoods110.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus payout side-effect gating fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate Section 10 and Stage 7 failure-bonus payout/proration mutations on `round.status === "payable"` | 0.89 | v1.104 correctly gated Stage 7 fallback execution and failure-bonus claim creation on `payable`, but the active Section 10 and Stage 7 proration code could still write `finalFailureBonusCents` and `FailureBonusClaim.prorationFactorBps` whenever claim-list predicates passed. Because `released` and `closed` remain replay/audit states, unguarded payout/proration mutation could alter or duplicate already-recorded failure-bonus outputs during deterministic replay. New failure-bonus payout, crediting, proration, and claim-field mutation should require `payable`; `released` and `closed` may only read/report/audit stored payout and proration fields. |
| Updated mechanism/deployment identifiers from **v1.104 / `crecm_v1_104`** to **v1.105 / `crecm_v1_105`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.105 Improvements from `moralpublicgoods111.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus claim-list validation fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Align Section 10 final failure-bonus payout/proration claim-list validation with the stricter key-bound `FailureBonusClaim` identity predicate already required elsewhere | 0.89 | v1.105's invariant, tests, and Stage 7 path require every failure-bonus claim-list key to match `FailureBonusClaim.id` and require non-empty trim-stable project, participant, Common Ground Budget, and conditional-intent identifiers before payout or proration. But the Section 10 final round-level payout/proration predicate still checked only round id and policy version. A weak Section 10 predicate could let key-mismatched or weakly identified claim rows determine final failure-bonus payout amounts despite the stronger active invariant and Stage 7 rule. |
| Updated mechanism/deployment identifiers from **v1.105 / `crecm_v1_105`** to **v1.106 / `crecm_v1_106`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.106 Improvements from `moralpublicgoods112.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus payout-input side-effect gating fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate Section 10 and Stage 7 failure-bonus payout/proration side-effect claim lists on full backed-pool availability, not merely payable status and claim-list validity | 0.89 | v1.106 correctly computed `failureBonusPoolAvailableCents` as `0` when the eligible bundle was missing or invalid, the failure-bonus budget-cap predicate failed, or final frozen sponsor backing was below the advertised failure-bonus budget. But the Section 10 and Stage 7 payout/proration loops could still iterate over valid claim ids in a `payable` round and write zero-valued `finalFailureBonusCents` or `FailureBonusClaim.prorationFactorBps` fields even when the backed pool was unavailable. Because the active prose says no new payout, crediting, proration, or claim-field mutation may occur under those conditions, the mutation claim-list must be empty unless the backed failure-bonus pool is actually available. |
| Updated mechanism/deployment identifiers from **v1.106 / `crecm_v1_106`** to **v1.107 / `crecm_v1_107`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.107 Improvements from `moralpublicgoods113.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus preliminary claim-field side-effect gating fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Gate Section 10 raw, participant-cap, and participant-capped provisional failure-bonus claim-field mutations on the same payable-status and backed-pool availability predicate used for final failure-bonus payout/proration side effects | 0.88 | v1.107 correctly empties final payout/proration claim lists when the backed failure-bonus pool is unavailable, but Section 10's earlier provisional failure-bonus block can still write `rawFailureBonusCents`, `participantRoundFailureBonusCapCents`, and `participantCappedProvisionalFailureBonusCents` when only claim-list validity and the budget-cap predicate pass. Those values correspond to `FailureBonusClaim.rawBonusCents`, `FailureBonusClaim.participantRoundCapCents`, and `FailureBonusClaim.participantCappedProvisionalBonusCents`. Since the active side-effect rule says no claim-field mutation may occur outside `payable` or without an available backed pool, these preliminary claim-field writes should use the same side-effect/backing gate as final payout/proration. |
| Updated mechanism/deployment identifiers from **v1.107 / `crecm_v1_107`** to **v1.108 / `crecm_v1_108`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.108 Improvements from `moralpublicgoods114.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow Stage 7 fallback-side-effect fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Prevent Stage 7's fail-closed fallback path from being treated as a user-consented `release_hold` fallback rule | 0.90 | v1.108 set `stage7ExecutableFallbackRule` to `"release_hold"` whenever fallback inputs were missing, malformed, wrong-row, or fallback-rule-inconsistent. That made the later `release_hold` branch executable even when no user-consented bundle-bound fallback rule had been proven, causing the fail-closed path to behave as if the user had selected `release_hold`. Missing or invalid fallback context should release/cancel/no-capture and require fresh consent, but it should not execute any refund, reroute, carry-forward, or release-hold branch unless the current bundle-derived project, Common Ground Budget, and ConditionalTradeIntent rows are uniquely proven and the budget/intent fallback rules match. |
| Updated mechanism/deployment identifiers from **v1.108 / `crecm_v1_108`** to **v1.109 / `crecm_v1_109`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.109 Improvements from `moralpublicgoods115.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus claim-field persistence fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Persist Section 10 / Stage 7 failure-bonus calculation outputs to the corresponding `FailureBonusClaim` row fields under the existing payable-status and backed-pool side-effect gates | 0.88 | v1.109's data model stores `rawBonusCents`, `participantRoundCapCents`, `participantCappedProvisionalBonusCents`, `prorationFactorBps`, and `bonusCents` on `FailureBonusClaim`, and the active prose describes these as claim-field mutations. But the Section 10 / Stage 7 implementation-facing snippets still wrote several values only to detached calculation maps such as `rawFailureBonusCents`, `participantCappedProvisionalFailureBonusCents`, and `finalFailureBonusCents`, while never writing `bonusCents` to the claim row and writing `prorationFactorBps` only in the Stage 7 path. This could leave the auditable claim object incomplete even though payout maps were computed. The revised snippets write the corresponding claim fields only when the existing current-round claim-list validation, `round.status === "payable"`, and positive backed failure-bonus-pool gates have already passed. |
| Updated mechanism/deployment identifiers from **v1.109 / `crecm_v1_109`** to **v1.110 / `crecm_v1_110`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.110 Improvements from `moralpublicgoods116.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow Stage 7 helper-definition consistency fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Define Stage 7's payout- and fallback-relevant helper predicates before the Stage 7 implementation-facing code uses them | 0.89 | v1.110's Stage 7 code used `isNonEmptyString`, `isCanonicalHash`, `isCanonicalUtcTimestamp`, `timestampEquals`, `timestampLte`, `isNonNegativeIntegerCents`, and `sumBigInt(...)` before defining them in that code block. Earlier sections define similar helpers, but Stage 7 is a standalone canonical implementation path for fallback execution, failure-bonus claim creation, and failure-bonus payout/proration side effects. Leaving these helpers implicit could make Codex substitute weaker validation or implement a Stage 7 path that compiles only by relying on ambient helper scope. |
| Updated mechanism/deployment identifiers from **v1.110 / `crecm_v1_110`** to **v1.111 / `crecm_v1_111`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.111 Improvements from `moralpublicgoods117.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus payout-state validation fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require final Section 10 and Stage 7 failure-bonus payout/proration claim lists to contain only `FailureBonusClaim.claimState === "approved"` rows | 0.89 | v1.111 gives `FailureBonusClaim` an explicit state machine (`pending`, `approved`, `paid`, `credited`, `denied`, `expired`), but the final payout/proration predicates checked only id, round, identity, and policy fields. A stale or corrupted `qualifiedFailureBonusClaimIds` list could therefore include a pending, denied, expired, already paid, or already credited claim and still receive new `bonusCents`, `prorationFactorBps`, or `finalFailureBonusCents` mutations. Final payout/proration should be approved-claim-only; already paid/credited rows may only be replayed or audited, and denied/expired/pending rows must not enter payout denominators. |
| Updated mechanism/deployment identifiers from **v1.111 / `crecm_v1_111`** to **v1.112 / `crecm_v1_112`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.112 Improvements from `moralpublicgoods118.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus settlement-state fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require final Section 10 and Stage 7 failure-bonus payout/proration claim lists to contain only unsettled approved claims (`claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null`), and require successful cash payout or platform-credit issuance to advance `FailureBonusClaim.claimState` to `paid` or `credited` with a non-empty trim-stable `payoutRef` and canonical `resolvedAt` timestamp | 0.89 | v1.112 correctly rejects non-approved claims, but an approved claim could still remain eligible for repeat payout if the payment/credit side effect writes payout fields without advancing the claim out of `approved`, or if a stale `approved` row already has settlement metadata. Because the payout lists are approved-claim-only, the settlement transition must be explicit to prevent duplicate payout or crediting during repeated `payable` passes. |
| Updated mechanism/deployment identifiers from **v1.112 / `crecm_v1_112`** to **v1.113 / `crecm_v1_113`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.113 Improvements from `moralpublicgoods119.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow preliminary failure-bonus claim-field state-gating fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require preliminary Section 10 failure-bonus claim-field mutation lists to contain only unsettled non-terminal claims (`claimState === "pending"` or `claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null`) | 0.88 | v1.113 made final payout/proration claim lists unsettled-approved-only, but the Section 10 preliminary mutation list for `rawBonusCents`, `participantRoundCapCents`, and `participantCappedProvisionalBonusCents` still accepted any current-round, policy-bound claim id. A terminal or already settled claim could therefore receive new preliminary claim-field mutations during a later `payable` pass even though it could not enter final payout denominators. Preliminary claim fields are still auditable claim fields, so `denied`, `expired`, `paid`, `credited`, and already settled rows should be replay/audit-only. Pending claims remain allowed for preliminary calculation before approval; final payout remains approved-and-unsettled only. |
| Updated mechanism/deployment identifiers from **v1.113 / `crecm_v1_113`** to **v1.114 / `crecm_v1_114`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |


### 0.114 Improvements from `moralpublicgoods120.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow Stage 7 replay-path implementation-safety fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Replace Stage 7's undefined `emitFailureHandlingReplayOnly(...)` call with an explicit non-side-effect replay/review output object | 0.90 | v1.114 defined Stage 7's validation helpers before fallback, claim-creation, and payout/proration code, but the non-payable Stage 7 path still called `emitFailureHandlingReplayOnly(...)` without defining it in the implementation-facing block. That undefined helper sits exactly in the lifecycle gate that separates replay/review states from side-effect states. Leaving it implicit could cause compile/runtime failure or invite an unreviewed helper that mutates fallback, authorization, failure-bonus, payout, credit, or proration rows. Non-payable Stage 7 handling should be an explicitly side-effect-free replay/report/audit or non-binding-review output. |
| Updated mechanism/deployment identifiers from **v1.114 / `crecm_v1_114`** to **v1.115 / `crecm_v1_115`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.115 Improvements from `moralpublicgoods121.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus claim-creation initialization fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Stage 7 failure-bonus claim creation to initialize the `FailureBonusClaim` state and default settlement/calculation fields explicitly | 0.90 | v1.115 added a state machine and settlement gating for `FailureBonusClaim`, but the Stage 7 `createFailureBonusClaimIfQualified(...)` call still passed only identity, snapshot, payment, and eligibility-hash fields. A helper could therefore create a row with missing or implicit `claimState`, non-null settlement fields, or uninitialized calculation fields. Because preliminary mutation lists and final payout lists now rely directly on `claimState`, `payoutRef`, `resolvedAt`, and calculation defaults, claim creation must set those fields explicitly: qualified Stage 7 creation starts as approved-and-unsettled, or an explicitly pending review path must be separate and cannot enter final payout until approval. |
| Updated mechanism/deployment identifiers from **v1.115 / `crecm_v1_115`** to **v1.116 / `crecm_v1_116`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.116 Improvements from `moralpublicgoods122.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus claim-creation idempotency fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Stage 7 failure-bonus claim creation to be idempotent under the unique `FailureBonusClaim(roundId, projectId, participantId, conditionalTradeIntentId)` key | 0.89 | v1.116 requires unique failure-bonus claims and explicit state/default initialization, but the Stage 7 payable side-effect path still calls `createFailureBonusClaimIfQualified(...)` whenever the qualification predicate passes. A retried or repeated payable pass could therefore attempt a duplicate insert or overwrite the existing claim unless the creation path first performs a unique-key lookup. The revised mechanism creates only when no matching claim exists; an exact existing matching claim is a no-op/replay, and a mismatched existing claim fails closed for manual review rather than being overwritten. |
| Updated mechanism/deployment identifiers from **v1.116 / `crecm_v1_116`** to **v1.117 / `crecm_v1_117`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.117 Improvements from `moralpublicgoods123.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus claim-list audit-context validation fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require Section 10 and Stage 7 failure-bonus preliminary and final mutation claim lists to validate each `FailureBonusClaim`'s audit context, not merely its id, round, policy, and settlement state | 0.87 | v1.117 made claim creation idempotent and state/default-initialized, but the later raw/cap/provisional/final payout/proration mutation lists still accepted any current-round, policy-bound, unsettled claim id with non-empty identity fields. A corrupted or stale approved claim with a missing or non-canonical eligibility-input hash, wrong clearing-bundle hash, non-threshold failure reason, missing payment snapshot evidence, or non-provider-confirmed payment fields could therefore enter payout/proration denominators if it appeared in the qualified-claim list. The revised mechanism requires the claim row's stored audit context to bind the active round, clearing bundle, payment snapshot evidence, failure-bonus policy, threshold-family failure reason, positive failed-qualified amount, canonical eligibility-input hash, and unsettled state before any preliminary or final claim-field mutation. |
| Updated mechanism/deployment identifiers from **v1.117 / `crecm_v1_117`** to **v1.118 / `crecm_v1_118`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.118 Improvements from `moralpublicgoods124.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The change is a narrow failure-bonus claim audit-context timing fix:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require failure-bonus claim audit-context predicates to enforce provider-confirmed payment timing at or before the stored early-failure-bonus cutoff | 0.89 | v1.118 required preliminary and final failure-bonus claim mutation lists to validate stored payment-snapshot evidence and early-cutoff binding, but `failureBonusClaimAuditContextEligible(...)` and the Stage 7 analogue checked only `paymentMethodSavedAt <= paymentMethodConfirmedAt` and `earlyFailureBonusCutoff === round.earlyFailureBonusCutoff`. A stale or corrupted claim with `paymentMethodConfirmedAt` after the early cutoff could still enter raw/cap/provisional/final payout/proration mutation lists. Because failure-bonus eligibility is explicitly based on a provider-confirmed payment snapshot before the early cutoff, the claim audit-context predicate itself must require `paymentMethodSavedAt <= paymentMethodConfirmedAt <= earlyFailureBonusCutoff`. |
| Updated mechanism/deployment identifiers from **v1.118 / `crecm_v1_118`** to **v1.119 / `crecm_v1_119`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.119 Improvements from `moralpublicgoods125.md`

This revision changes the mechanism only where the improvement case is above 85% credence. The changes are narrow failure-bonus claim auditability and version-trace consistency fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Require failure-bonus claim audit-context predicates to reject claims whose `createdAt` is missing or not a canonical UTC timestamp before any preliminary or final claim-field mutation | 0.88 | v1.119 requires Stage 7 claim creation to set canonical `createdAt`, but `failureBonusClaimAuditContextEligible(...)` and the Stage 7 analogue did not check the persisted claim's `createdAt` before admitting a claim into raw/cap/provisional/final payout/proration mutation lists. A stale or corrupted claim row with malformed creation time could therefore receive new audit-relevant field mutations despite lacking the timestamp required for claim provenance. |
| Restore the missing 0.118 improvement table and correct the 0.117 deployment-trace identifier from `crecm_v1_119` to `crecm_v1_118` | 0.96 | The active document was v1.119, but the revision trace jumped from 0.117 directly to the rationale and the 0.117 row incorrectly said the v1.118 revision deployed `crecm_v1_119`. That can confuse migration tests, audit review, and version provenance even when active code paths are otherwise correct. |
| Updated mechanism/deployment identifiers from **v1.119 / `crecm_v1_119`** to **v1.120 / `crecm_v1_120`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.120 Improvements from `moralpublicgoods126.md`

This revision changes the mechanism only where the improvement case is above 50% credence. The changes are narrow failure-bonus audit-integrity, hard-gate consistency, and public UX specificity fixes:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Bind failure-bonus claim audit-context predicates to **claimant-conflict snapshots**, recomputed stored eligibility-input hashes, and stored claim amount fields before mutation or payout | 0.91 | v1.120 denied conflicted claimants at claim creation, but Section 10 and Stage 7 audit-context predicates did not themselves verify the persisted claimant-conflict snapshot fields or recompute the claim's eligibility hash from stored context. A corrupted or stale approved claim could therefore enter raw/cap/provisional/final payout lists without the same claimant-conflict and eligibility-input binding required at creation. |
| Add the **baseline/action-evidence hard gate** to the canonical Section 7 hard-gate list | 0.89 | The mechanism already treats baseline integrity and action evidence as hard project gates in invariants, project eligibility, Stage 1, failure-bonus exclusion, and the final build target, but the canonical Section 7 list omitted the gate. Codex could otherwise implement the shorter list and clear projects that should fail baseline/action-evidence review. |
| Clarify public UX for **match-eligible counterparty volume**, project-specific base-match ratios, actual hold-release wording, and failure-bonus denial categories | 0.78 | Donor-facing wording should not imply that saved payment methods are holds, should not hide that counterparty thresholds are based on verified match-eligible distinct dollars, and should disclose the same denial categories used by the failure-bonus rules. |
| Updated mechanism/deployment identifiers from **v1.120 / `crecm_v1_120`** to **v1.121 / `crecm_v1_121`** | 0.98 | Once the mechanism changes, stale version identifiers would make feature flags, migration tests, audit bundles, and deployment traces ambiguous. |

### 0.121 Improvements from `moralpublicgoods127.md`

This revision integrates the most useful parts of Dominant-Strategy Escrowed Assurance Matching while preserving CRECM's hard review, consent, audit, and anti-gaming constraints. The changes are mechanism-level, not merely editorial:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add an optional **contributor-only success-reward module** backed by a separate `success_reward` sponsor pool | 0.86 | Simple assurance contracts leave a signer worse off when the project would have succeeded without them. A sponsor-backed signer-only reward can neutralize that comparison without making the public good itself excludable. |
| Add **non-transferable coordination credits** and contributor-only impact certificates for captured successful contributions | 0.84 | These create an excludable coordination-layer benefit for signers while preserving non-excludability of the moral public good. They can reduce free-riding without needing cash rebates in every round. |
| Add a **dominance-target disclosure and formula**: if a user values signer-only rewards at least as much as their contribution cost, free-riding is no longer better in the success-without-me state | 0.78 | This imports the strongest theoretical feature of DSEAM, but treats it as a sponsor-backed optional target rather than an unconditional platform promise. |
| Add **sealed-pledge / blind-progress defaults** before round close | 0.83 | Exact live threshold status can invite strategic waiting. Sealed pledging reduces the ability to condition one's decision on whether others have already made the project succeed. |
| Add **no-late-access**, reward-specific anti-sybil, same-payment-method exclusion, conflict review, and audit-bundle rules for rewards, credits, and impact certificates | 0.89 | Contributor-only rewards create new gaming incentives. They must inherit CRECM's identity, payment, conflict, project-review, externality, and frozen-input controls. |
| Update mechanism/deployment identifiers from **v1.121 / `crecm_v1_121`** to **v1.122 / `crecm_v1_122`** | 0.98 | Once the mechanism changes, stale feature flags, migration tests, audit bundles, and deployment traces become ambiguous. |


### 0.122 Improvements from `moralpublicgoods128.md`

This revision changes the product only where the improvement case is above 85% credence. The changes are narrow user-education, UX-simplification, and anti-free-riding disclosure fixes that do not change the clearing, matching, review, payment, or audit mechanism:

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add an optional **Advanced Pivotality Calculator** for threshold-funding intuition | 0.87 | Users can misunderstand why threshold rounds need early contributors. A user-supplied, non-binding calculator helps them reason about decisive probability while preserving sealed live-progress rules. |
| Constrain the calculator to **advanced explainer, shadow simulation, or post-round educational analysis** surfaces, not the default pledge modal | 0.91 | If the calculator were connected to live exact threshold or success-without-me estimates, it could train strategic waiting. It must use only subjective user inputs or post-close public aggregates. |
| Add the generalized success-reward-aware formula for the required decisive probability | 0.88 | CRECM v1.122 already introduced contributor-only success rewards and coordination credits. The calculator should show how signer-only benefits can reduce the pivotality requirement without counting them as public-good dollars or matching inputs. |
| Replace the public UX with a **progressive-disclosure three-step flow**: Budget, Projects, Review | 0.86 | The mechanism has many necessary safeguards, but the default user path can be simpler. Basic mode should show only the decisions users must make, while advanced drawers expose all caps, counters, hashes, fees, rewards, fallbacks, and audit fields before consent. |
| Add tests, acceptance criteria, metrics, and do-not-build constraints for calculator non-binding behavior and simplified-UX data parity | 0.90 | A simplified UI is safe only if it round-trips to the same explicit Common Ground Budget, support-stance, conditional-intent, payment, fee, reward, and fallback records. |
| Update mechanism/deployment identifiers from **v1.122 / `crecm_v1_122`** to **v1.123 / `crecm_v1_123`** | 0.98 | Once the product changes, stale feature flags, migration tests, audit bundles, and deployment traces become ambiguous. |


### 0.123 Improvements from `moralpublicgoods129.md`

This revision changes only user-facing UX/UI/language where the improvement case is above 85% credence. These are presentation-layer and consent-surface changes: they do **not** change clearing, matching, review, payment, reward, credit, certificate, failure-bonus, deployment, or audit semantics.

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Add a default **plain-language guided mode** with a one-to-one map from plain labels to canonical CRECM fields | 0.91 | The mechanism is necessarily complex, but users should be able to complete it without reading internal labels such as `ConditionalTradeIntent` or `matchEligibleCents`. A fixed copy map reduces cognitive load while preserving the exact underlying records. |
| Rename default stance buttons to **Fund this**, **Fund if different-view support joins**, **Needs review**, and **Skip**, while preserving canonical `strong`, `weak`, `dissent`, and `abstain` values in review, advanced drawers, APIs, and audits | 0.89 | The canonical stance names are accurate but less immediately legible. Plain labels make the first decision easier without adding new states or changing allocatability. |
| Add a **pre-save checklist and status chips** for budget, payment method, project choices, cross-view conditions, fallback, privacy, sealed-progress acknowledgement, and final review completeness | 0.88 | Users need to know what remains incomplete. Status chips can guide setup without weakening consent because the review screen remains the consent boundary. |
| Add a **plain-language settlement summary** that groups outcomes as charged, sent to projects, counted for matching, sponsor-added, rewards/credits/certificates, and failed/carry-forward, with technical accounting in a details drawer and final receipt | 0.88 | The separated accounting channels are essential but intimidating. A plain summary improves comprehension while keeping gross/fee/net-recipient/count/match-eligible details visible before settlement and in receipts. |
| Add a **copy style guide and terminology map** that forbids ambiguous terms such as “impact matched,” “authorized budget,” “held funds,” “escrow,” or “guaranteed match” unless the exact corresponding legal/payment/accounting condition is true | 0.92 | Simplification is safe only if it is also precise. The product must not make payment, escrow, matching, reward, or impact claims that are stronger than the mechanism permits. |
| Add tests, acceptance criteria, metrics, and do-not-build constraints for plain-label/canonical-record parity, final-review disclosure completeness, and payment/matching copy accuracy | 0.90 | UX simplification can silently become mechanism degradation unless automated tests prove that simple-mode actions round-trip to the same canonical records and disclosures as advanced mode. |
| Update mechanism/deployment identifiers from **v1.123 / `crecm_v1_123`** to **v1.124 / `crecm_v1_124`** | 0.98 | Once the product changes, stale feature flags, migration tests, audit bundles, and deployment traces become ambiguous. |


### 0.124 Improvements from `moralpublicgoods130.md`

This revision changes only page-level UX/UI, search-routing, and copy where the improvement case is above 85% credence. These are presentation-layer and entry-surface changes after reviewing `https://www.moraltrade.org/offers?search=moral%20public%20goods`: they do **not** change clearing, matching, review, payment, reward, credit, certificate, failure-bonus, deployment, sealed-progress, or audit semantics.

| Change | Credence it improves rather than worsens | Reason |
|---|---:|---|
| Route moral-public-goods search intent to a first-class **Common Ground Budget / Public Goods Fund result**, not a generic zero-listing directory state | 0.91 | The reviewed offers page can display no matching ordinary listings while separately showing an external CRECM/MPGF module. A user searching for moral public goods should see the public-goods funding route first without losing the strict separation between live offers, examples, templates, demos, and public-goods modules. |
| Replace the offers-page five-lane scan with a **single primary task card** plus collapsed “other lanes” drawer | 0.88 | The current page exposes live offers, reviewed templates, worked examples, demo records, and the external module at the same level. A primary task card makes the public-goods action obvious while preserving lane counts and separation in a details drawer. |
| Hide irrelevant empty filters and zero-facet panels for moral-public-goods searches | 0.90 | Showing cause/format filters with no available facets and a primary “0 listings” directory increases confusion. Empty controls should collapse into an advanced “ordinary offer filters” drawer when the intent resolves to Common Ground Budget. |
| Add a strict CTA hierarchy: **Preview a Common Ground Budget** first, then **View current round**, then **Learn how it works / View audit and rules** | 0.87 | Users should not have to choose between many similarly weighted links such as external module, preview budget, view proof path, candidate pools, and governance. A single next action reduces friction without bypassing sign-in, verification, consent, review, or payment gates. |
| Replace stale and implementation-facing public labels such as **external CRECM module**, **Verified Assurance Matching demo**, and old mechanism-version references with current public copy | 0.93 | Current-product pages must not present outdated mechanism labels or spec versions as if they govern the active Common Ground Budget. Legacy names may remain in a historical/details drawer, never as the primary label for the active product. |
| Add tests, acceptance criteria, metrics, and do-not-build constraints for search-intent routing, public-goods zero-state behavior, stale-version copy, empty filters, CTA hierarchy, and lane-separation preservation | 0.90 | Page simplification is safe only if it preserves the product boundaries that prevent users from confusing examples, demos, no-capture previews, public-goods modules, binding contribution intents, and current CRECM rounds. |
| Update mechanism/deployment identifiers from **v1.124 / `crecm_v1_124`** to **v1.125 / `crecm_v1_125`** | 0.98 | Once the product changes, stale feature flags, migration tests, audit bundles, and deployment traces become ambiguous. |

## 1. Rationale

Forethought's core point is that moral public goods can generate large gains from trade: if many people value a shared good somewhat, coordination can make each participant's contribution behave like a large discount on the consensus good.

But Forethought is also pessimistic about simple voluntary mechanisms. Moral public goods are underfunded because each person prefers that others fund them while keeping their own resources; assurance contracts are brittle at realistic population sizes; dominant assurance helps only partially; and quadratic funding depends on an outside matching pool.


The DSEAM-style addition in v1.122 targets the pivotality problem directly. In a simple assurance contract, if the project would succeed without a participant, non-signing strictly dominates signing. CRECM therefore adds an optional contributor-only reward layer: successful signers can receive sponsor-backed success rewards, non-transferable coordination credits, or impact certificates that non-signers cannot retroactively obtain. This makes the coordination layer partially excludable while keeping the moral public good non-excludable. Because such rewards can create bonus-farming and Sybil incentives, they are allowed only under separate sponsor backing, no-late-access rules, identity/payment-cluster exclusions, conflict review, and frozen audit-bundle accounting.

The v1.123 addition kept that pivotality logic out of the default pledge funnel and turned it into an optional educational tool. The Advanced Pivotality Calculator asks users for their own subjective value ratio and probability estimates, then computes the minimum decisive probability needed for a pledge to be best by their stated values under a simplified model. It must not use live exact threshold, counterparty-volume, or success-without-me data before round close, and it must not affect clearing, matching, rewards, credits, certificates, payment, or audit outcomes.

The v1.124 addition is UX/language-only. It introduces a plain-language guided mode over the same CRECM records. “Fund this” maps to `strong`; “Fund if different-view support joins” maps to `weak`; “Needs review” maps to `dissent`; and “Skip” maps to `abstain`. The UI can be simpler, but it cannot silently change caps, counterparty buckets, fallbacks, fees, payment semantics, reward/credit/certificate opt-ins, sealed-progress behavior, failure-bonus disclosures, or the final review consent boundary.

The v1.125 addition is page-entry UX only. The offers search page should not make a user searching “moral public goods” infer that there is no relevant funding route because ordinary offer listings are empty while a separate public-goods module exists. The page should route this intent to a single Common Ground Budget entry card, collapse irrelevant ordinary-offer filters, preserve the separation between live offers, templates, worked examples, demo records, and public-goods modules, and use current public product language before exposing internal mechanism labels or legacy pilot names.

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
8. Do not support political campaign trades, lifestyle trades, behavior-change promises, private-benefit projects, or threat-like trades in v1.
9. Do not claim escrow/custody unless a legally valid custody/escrow/payment partner is active.

Success rewards, coordination credits, and impact certificates execute only after final payable clearing, exact-amount authorization reconciliation, and successful capture of the underlying contribution. Success rewards must be paid or credited from the backed `success_reward` sponsor pool; they must never be withheld from recipient project funds, netted against recipient disbursements, or treated as fees. A saved payment method is not consideration for success rewards until the underlying contribution clears and is captured.

10. All allocation results must be reproducible from stored input bundles and calculation-version hashes.
11. Keep **gross captured dollars**, **fee dollars**, **net recipient-disbursed dollars**, **actual/gross exposure dollars**, **counted contribution dollars**, and **match-eligible dollars** separate in data, calculations, public reporting, and tests.
12. Do not publish a donor-facing match schedule unless the sponsor pool is funded, escrowed, or contractually committed through an auditable sponsor route.
13. A participant's own contributions, linked accounts, same-payment-method / same-payment-cluster accounts, or same-control entities must never satisfy that participant's counterparty-volume condition.
14. Recurring Common Ground Budgets require explicit informed consent, easy cancellation, and a visible next-capture rule.
15. A Common Ground Budget that is paused, expired, canceled, or missing required recurring consent must contribute `0` gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible cents.
16. Recipient, sponsor, reviewer, and proposer conflicts of interest must be reviewed and logged before a project can become payable.
17. Round parameters are frozen once a round opens, except for an auditable safety freeze or cancellation.
18. Actual allocation must never exceed the active conditional intent's `amountCents`, `maxExposureCents`, or user-approved project cap.
19. Acceptable counterparty buckets must be validated against the frozen `RoundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId`; same-bucket, sponsor-funded, platform-funded, self-funded, linked-account, same-payment-method / same-payment-cluster, and same-control dollars must never satisfy cross-view counterparty conditions.
20. Reroute and carry-forward may execute only under the same user-consented rulebook, recipient/bucket eligibility set, fallback rule, and exposure cap; material changes require new consent before routing or capture.
21. Failure bonuses may be paid only for otherwise eligible projects that fail solely because threshold-amount, verified-supporter, active-cluster, or counterparty-volume conditions do not clear.
22. Failure bonuses must never be paid for review-not-approved, challenge-blocked, safety, anti-threat, externality, destination, conflict-review, sponsor-funding, rulebook, identity, sybil, collusion, authorization, or user-consent failures.
23. Failure-bonus eligibility must be based on a locked active conditional intent and an immutable provider-confirmed `PaymentCommitmentSnapshot` captured before the early cutoff, not on live payment fields or early card authorization.
24. Total approved failure-bonus payouts must never exceed the backed available failure-bonus pool. The backed available pool is `roundFailureBonusBudgetCents` only when the integer failure-bonus budget-cap predicate passes and final frozen sponsor backing is at least `roundFailureBonusBudgetCents`; otherwise it is `0`. If qualified provisional claims exceed that backed available pool, prorate deterministically and publish the proration factor.
25. Each donor-facing sponsor pool must be backed at the pool level: base-match, bonus-match, failure-bonus, and sponsor-paid fee-support budgets are advertised or used only to the extent that matching `SponsorCommitment` records are funded, escrowed, or contractually committed.
26. `round.sponsorPoolState` is derived from pool-specific sponsor commitments and cannot substitute for checking the backing of each advertised pool.
27. A project with an open challenge cannot clear, become payable, or release funds unless the challenge is explicitly recorded as `non_blocking` under the round rulebook.
28. All monetary outputs denominated in cents, including counted contributions, match-eligible contributions, base matches, bonus matches, and failure bonuses, must be integer cents with deterministic rounding and remainder allocation.
29. Failure-bonus payouts are capped both by the funded failure-bonus pool and by a per-participant per-round cap, so failure bonuses cannot become a multi-project bonus-farming strategy.
30. Failure-bonus qualification must use a stored round-open eligibility snapshot, not mutable live project fields.
31. Review-not-approved and challenge-blocked failure reasons are hard failure-bonus denials and must not be treated as threshold-family failures.
32. A saved or provider-confirmed payment method is not a hold, authorization, escrow, custody event, or guarantee of future authorization; user-facing copy and payment logic must not imply funds are held before real post-clearing authorization or custody.
33. Binding final clearing, counterparty-volume satisfaction, threshold counting, and sponsor-match eligibility in `capped_pilot` or `full` deployment require an immutable round-close `PaymentCommitmentSnapshot` with non-empty string `paymentMethodRef`, `paymentMethodSavedAt <= round.closesAt`, `paymentMethodCommitmentState === "provider_confirmed"`, `paymentMethodConfirmedAt <= round.closesAt`, `asOf === round.closesAt`, and `rulebookHash === round.rulebookHash`. Shadow-mode simulation outputs may omit such snapshots only when written exclusively to `shadowPreview*` fields; settlement previews without such a snapshot must be labeled non-binding and must not count toward binding clearing.
34. Failure-bonus proration uses the backed available failure-bonus pool: `roundFailureBonusBudgetCents` only when final frozen sponsor backing is at least the advertised failure-bonus budget and the integer 5% sponsor-budget cap predicate passes; otherwise `0`. It must not use the configured numeric budget alone.
35. Every deterministic stable order used for leftover cents, capped proration, or claim ordering uses SHA-256 over a canonical JSON tuple with explicitly listed fields.
36. If any post-clear payment authorization or custody hold fails, all affected rows must be removed from gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible clearing inputs and the round must be deterministically recalculated before any capture, release, payout, match, or public final report.
37. Final clearing and failure-bonus qualification must use immutable `PaymentCommitmentSnapshot` records, not mutable live Common Ground Budget payment fields.
38. Authorization or custody holds must cover the exact reconciled obligation amount and remain valid through expected capture; partial, wrong-amount, expired-before-capture, or short-expiring holds are reconciliation failures.
39. Moral-bucket distinctness must be symmetric and frozen into a `RoundMoralBucketSnapshot` before round lock; asymmetric bucket distinctness blocks round lock.
40. Counterparty-bucket validation must use the frozen `RoundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId`, not mutable live `MoralBucket.distinctFromBucketIds`.
41. Final clearing, threshold counting, counterparty-volume satisfaction, sponsor-match eligibility, and failure-bonus qualification must use the immutable `RoundClearingInputBundle` for mutable participant and project inputs; live post-round edits to Common Ground Budgets, support stances, conditional intents, identity eligibility, project caps, project thresholds, or project matching parameters must not change clearing results.
42. A `RoundClearingInputBundle` may be used for final clearing only if it is bound to the current round by `id`, `roundId`, `rulebookHash`, `feePolicyVersion`, `feePolicyHash`, `deploymentMode`, mode-compatible pilot cap fields, `deploymentAuditState`, `deploymentAuditId`, `deploymentAuditHash`, `paymentReconciliationPathHash`, `optimizationPolicyHash`, `calculationVersion`, `bundleSchemaVersion`, `snapshotKind === "round_close"`, `sourceCutoffAt === round.closesAt`, `bundleHash`, `commonGroundBudgetInputHash`, `supportStanceInputHash`, `conditionalTradeIntentInputHash`, `identityEligibilityInputHash`, `paymentCommitmentSnapshotHash`, `feeInputHash`, `deploymentExposureInputHash`, `projectInputHash`, `projectEligibilitySnapshotHash`, `sponsorCommitmentInputHash`, `successRewardInputHash`, `coordinationCreditInputHash`, `impactCertificateInputHash`, `canonicalInputJsonRef`, `canonicalInputJsonHash`, `moralBucketSnapshotId`, `moralBucketSnapshotHash`, and `createdAt`.
43. Round-close and early-failure-bonus `PaymentCommitmentSnapshot` records must have `asOf` equal to the relevant cutoff, not merely before it; stale earlier snapshots must not affect binding final clearing or failure-bonus qualification.
44. Final base-match, bonus-match, sponsor-backed failure-bonus availability, sponsor-backed success-reward availability, sponsor-paid fee support, and sponsor-backed payout calculations must use `sponsorBackedCentsForFinalClearing(poolType)` over frozen sponsor-commitment inputs from the eligible `RoundClearingInputBundle`; live `SponsorCommitment` changes after bundle creation must not alter final clearing.
45. Hash-bearing inputs used for clearing or payout eligibility must pass an explicit canonical SHA-256 hash-format predicate and must be reproducible from canonical serialized content; placeholder, empty, malformed, or unauditable hash strings do not count.
46. Snapshot, bundle, and bundle-selected participant-input objects that are selected by key in clearing or payout predicates must be unique at the database/application level: there must be at most one payment snapshot per `(roundId, commonGroundBudgetId, snapshotKind)`, at most one locked moral-bucket snapshot per round, at most one round-close clearing input bundle per `(roundId, calculationVersion)`, at most one bundle-derived `PublicGoodProject` row per `(roundId, id)`, at most one bundle-derived `CommonGroundBudget` row per `(roundId, id)` and at most one bundle-derived `CommonGroundBudget` row per `(roundId, participantId)`, at most one bundle-derived identity-eligibility row per `(roundId, participantId)`, at most one project-round eligibility snapshot per `(roundId, projectId)`, at most one bundle-selected support stance per `(roundId, commonGroundBudgetId, projectId)`, at most one clearing-eligible conditional intent per `(roundId, commonGroundBudgetId, projectId)`, at most one bundle-derived `FeeQuote` row per `(roundId, id)` and at most one bundle-derived `FeeQuote` row per `(roundId, commonGroundBudgetId, projectId, conditionalTradeIntentId)`, at most one failure-bonus claim per `(roundId, projectId, participantId, conditionalTradeIntentId)`, and at most one authorization-reconciliation event per `(roundId, clearingIteration, participantId, projectId, conditionalTradeIntentId, custodyAuthorizationId, reconciliationState)`.
47. A `RoundClearingInputBundle` may not be eligible unless `rulebookHash`, `feePolicyHash`, `paymentReconciliationPathHash`, `optimizationPolicyHash`, `commonGroundBudgetInputHash`, `supportStanceInputHash`, `conditionalTradeIntentInputHash`, `identityEligibilityInputHash`, `paymentCommitmentSnapshotHash`, `feeInputHash`, `deploymentExposureInputHash`, `projectInputHash`, `projectEligibilitySnapshotHash`, `sponsorCommitmentInputHash`, `canonicalInputJsonHash`, `moralBucketSnapshotHash`, any non-null `deploymentAuditHash`, and `bundleHash` pass the canonical hash predicate, and unless `feePolicyVersion`, `deploymentMode`, mode-compatible pilot caps, deployment-audit state/id fields, `bundleSchemaVersion`, `snapshotKind`, `sourceCutoffAt`, `canonicalInputJsonRef`, and `createdAt` pass the same non-hash validation used by `roundClearingInputBundleBindingHashValid(...)`.
48. Pre-round donor-facing sponsor-pool advertisement and settlement previews may use current sponsor records only as preview/opening checks; final clearing, matching, failure-bonus availability, payout plans, and audit bundles must use frozen sponsor inputs through `sponsorBackedCentsForFinalClearing(poolType)`.
49. `sponsorBackedCentsForFinalClearing(poolType)` may count only frozen sponsor-commitment records with canonical `sourceHash` values and non-negative safe-integer-cent `committedCents` / `fundedCents`; invalid, negative, fractional, or unauditable sponsor records count as `0` and block final backing until corrected.
50. Failure-bonus qualification must define `identityWeightBps` from the bundle-derived `IdentityEligibility.countedWeightBps` using the same valid-integer `[0, 10_000]` check and zero-on-malformed rule used in Stage 2 before applying identity-threshold checks.
51. QF raw scores, entropy/diversity factors, dissent pressure, collusion discounts, and adjusted bonus scores used for bonus allocation must be computed with deterministic fixed-point or pinned decimal arithmetic specified by `round.calculationVersion`; final bonus cent allocation must use quantized score units included in the calculation hash, not unrounded implementation-dependent floating-point values.
52. Missing support-stance rows are treated as `abstain`: they allocate zero gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible cents and expose no acceptable counterparty buckets.
53. Missing identity-eligibility rows are treated as zero identity weight with non-clear sybil/collusion state for counting, matching, counterparty-volume, and failure-bonus purposes.
54. There must be at most one `ProjectRoundEligibilitySnapshot` for each `(roundId, projectId)`, and failure-bonus qualification must reject ambiguous or duplicate project-round eligibility snapshots.
55. Counted-contribution, verified-supporter, active-cluster, counterparty-volume, sponsor-match, and failure-bonus eligibility require a human-verified identity row with clear sybil and collusion states; identity weight alone is not sufficient.
56. Candidate-allocation cent amounts and caps must be non-negative integer cents, and basis-point caps must be integer basis points normalized to the allowed range before use; invalid monetary/cap fields make the affected allocation row contribute zero rather than negative or fractional cents.
57. QF raw scores and bonus-score units must be computed from deterministic fixed-point operations, and sponsor bonus proration must use exact integer arithmetic over `bonusScoreUnitsInt`; reporting aliases such as `qfRaw` and `qfAdjusted` cannot determine payout cents.
58. Conditional-intent counterparty-volume thresholds must be positive integer cents, and support-stance / conditional-intent counterparty-bucket inputs must be valid string arrays; malformed arrays are treated as empty and cannot satisfy cross-view clearing.
59. Round donor-counted caps and identity-threshold bps fields must be valid before counting or matching. Invalid donor-counted caps become `0`; invalid identity-threshold bps fail closed and cannot unlock counting or matching.
60. Project-round eligibility snapshots used for failure-bonus qualification must be explicit `round_open` snapshots with `sourceCutoffAt === round.opensAt`, `roundId === round.id`, and `snapshot.projectId` equal to the current bundle-derived project id.
61. Project base-match and bonus-cap bps fields must be null/default or valid integer bps fields; malformed non-null bps values contribute `0` for the affected sponsor-match calculation rather than defaulting to a positive match.
62. Round base-match, bonus-match, failure-bonus, success-reward, and fee-support budget fields must be non-negative integer cents before they can affect hard gates, matching, reward/failure-bonus caps, or payout availability; malformed, negative, fractional, or NaN sponsor-budget fields count as `0`.
63. `IdentityEligibility.countedWeightBps` must be an integer in `[0, 10_000]`; malformed, fractional, NaN, or out-of-range identity weights count as `0` and cannot unlock counted dollars, counterparty volume, sponsor matching, or failure bonuses.
64. A `PaymentCommitmentSnapshot` must include a non-empty `paymentMethodRef` before it can affect binding final clearing, threshold counting, counterparty-volume satisfaction, sponsor-match eligibility, or failure-bonus qualification; shadow-only `shadowPreview*` outputs remain non-binding and cannot satisfy those binding quantities.
65. Fixed-point bonus-scoring constants and stance-weight maps must be explicit in the calculation version. Invalid review-pressure denominators must be handled by a deterministic denominator guard and must not produce division-by-zero or implementation-dependent bonus payouts.
66. `ProjectSupportStance.minCounterpartyVolumeCents` is non-authoritative and must not determine final clearing; the authoritative counterparty-volume threshold is `ConditionalTradeIntent.minCounterpartyVolumeCents`.
67. Project economic terms used for clearing and threshold checks — `requestedMaxCents`, `minimumViableCents`, `thresholdAmountCents`, `thresholdSupporterMin`, and `thresholdClusterMin` — must be valid integer fields before a project can clear; malformed, negative, fractional, or NaN project economic terms block clearing rather than lowering thresholds.
68. `PaymentCommitmentSnapshot.snapshotHash` must bind the snapshot kind, round, participant, Common Ground Budget, non-empty payment-method reference, saved/confirmed timestamps, cutoff `asOf`, rulebook hash, provider-evidence hash, and creation timestamp before the snapshot can affect clearing or failure-bonus qualification.
69. `RoundMoralBucketSnapshot.snapshotHash` must bind the round, rulebook, distinctness-policy version, bucket IDs, reciprocal distinctness map, asymmetric-pair count, blocked asymmetric pairs, and creation timestamp before bucket distinctness can affect counterparty validation.
70. Failure bonuses may be advertised only when `roundFailureBonusBudgetCents > 0`, the exact BigInt sum of sanitized sponsor budgets is positive, the integer 5% sponsor-budget cap predicate passes, and the preview/opening sponsor backing fully covers the advertised failure-bonus budget. Failure bonuses may be qualified or paid only when the same budget-cap predicate passes and final frozen sponsor backing fully covers the advertised failure-bonus budget; otherwise the backed available failure-bonus pool is `0`.
71. Bonus scoring must fail closed on malformed diversity/risk inputs: invalid cluster-share distributions produce zero diversity, and invalid project collusion-risk scores are treated as maximum collusion risk for bonus allocation.
72. Final clearing may use a `RoundClearingInputBundle` only if `bundleHash` binds the bundle identity, rulebook hash, fee-policy version/hash, deployment mode, mode-compatible pilot caps, deployment-audit state/id/hash, payment/reconciliation path hash, optimization-policy hash, calculation version, bundle schema version, snapshot kind, source cutoff, every component hash, canonical input JSON reference/hash, moral-bucket snapshot identifiers, sponsor-commitment input hash, and `createdAt`; a merely well-formed hash string is insufficient.
73. A frozen `RoundMoralBucketSnapshot` must be graph-well-formed before it can affect counterparty validation: non-empty bucket set, reciprocal map keys matching bucket IDs, no self-distinct edges, symmetric distinctness, `asymmetricPairCount === 0`, and no blocked asymmetric pairs.
74. Final sponsor-backed calculations may count only sponsor commitments with non-empty `publishedAt` and `backingConfirmedAt` timestamps no later than both `round.parametersFrozenAt` and `round.opensAt`; late, post-freeze, or post-open sponsor records do not satisfy donor-facing precommitment.
75. Out-of-range basis-point caps or match-ratio fields are invalid and fail closed; they must not be clamped to a positive allocation cap or sponsor-match value.
76. Round lifecycle timestamps must be canonical UTC timestamps and well ordered before a round can lock, clear, authorize, match, or qualify failure bonuses: `opensAt <= earlyFailureBonusCutoff <= reviewFreezeAt < closesAt`, `opensAt < reviewFreezeAt`, and `closesAt < challengeDeadline`.
77. User-supplied counterparty-bucket arrays for support stances and conditional intents must be valid duplicate-free trim-stable non-whitespace string arrays before they can expose counterparty buckets; malformed arrays are treated as empty and cannot satisfy cross-view clearing.
78. A round may lock, clear, authorize, match, or qualify failure bonuses only if `round.rulebookHash`, `round.sponsorPoolSourceHash`, `round.paymentReconciliationPathHash`, `round.optimizationPolicyHash`, and `round.feePolicyHash` are canonical hashes, `round.calculationVersion`, `round.failureBonusPolicyVersion`, and `round.feePolicyVersion` are non-empty trim-stable non-whitespace strings, and `round.parametersFrozenAt` is a canonical UTC timestamp no later than `round.opensAt`.
79. A frozen `RoundMoralBucketSnapshot` may affect counterparty validation only if it was created no later than `round.parametersFrozenAt`, its raw reciprocal-map keys exactly match the frozen bucket ID set, and all bucket/string identifiers are trim-stable non-whitespace strings.
80. Sponsor commitments may count for preview or final backing only if both `committedCents` and `fundedCents` are non-negative safe-integer cents, even when the current commitment state pays from only one of those fields.
81. Failure-bonus qualification itself, not merely final payout, requires full final frozen sponsor backing for the advertised failure-bonus budget.
82. Project-round eligibility snapshots used for failure-bonus project eligibility must pass a binding-hash predicate that covers the round, project, rulebook, cutoff, eligibility booleans, and creation timestamp.
83. `CommonGroundBudget.budgetPeriod` must be a valid enum value before a budget can allocate; recurring budgets must also have a non-empty trim-stable consent version, canonical next-capture timestamp, and non-empty trim-stable next-capture rule before they can contribute actual, counted, or match-eligible cents.
84. Active `ConditionalTradeIntent` rows must have valid authorization-state and fallback-rule enum values before they can expose allocation or fallback authority.
85. Donor-facing sponsor-preview backing must be computed as of a canonical `previewAsOf` timestamp no later than `round.opensAt`; sponsor publication or backing-confirmation records after `previewAsOf` or after `round.parametersFrozenAt` must not support match or failure-bonus advertisement.
86. `AuthorizationReconciliationEvent.eventHash` must bind the event `id`, removed-row, exact-amount, expiry, valid reconciliation-state enum, reason-code, and creation fields before the event can enter an audit bundle; payable authorization rows must use canonical custody timing fields, valid provider metadata, `custodyState === "authorized"`, and exact amount coverage.
87. `RoundClearingInputBundle.bundleHash` must bind the selected bundle `id` and the full active bundle field set: round, rulebook, fee-policy, deployment-mode, pilot-cap, deployment-audit, payment/reconciliation-path, optimization-policy, calculation-version, schema, source-cutoff, snapshot-kind, component-hash, canonical-input, moral-bucket, sponsor-input, and creation fields.
88. Same-payment-method or same-payment-cluster accounts must never satisfy a user's counterparty-volume condition; the frozen identity/payment input bundle must expose a stable privacy-preserving same-payment-method cluster field sufficient to enforce this exclusion.
89. Cent, count, basis-point, and fixed integer score inputs represented as JavaScript `number` values must pass safe-integer validation before arithmetic; unsafe integer values must fail closed or be represented with exact `BigInt` / fixed-point helpers before they can affect clearing, matching, authorization, or payout.
90. Sponsor commitments may count toward a locked donor-facing match or failure-bonus schedule only if `publishedAt` and `backingConfirmedAt` are canonical timestamps no later than `round.parametersFrozenAt`; for preview advertisement they must also be no later than `previewAsOf`.
91. `CommonGroundBudget.fallbackRule` must be one of `refund`, `reroute`, `carry_forward`, or `release_hold` before the budget can contribute actual, counted, or match-eligible cents.
92. Active `ConditionalTradeIntent` rows may clear only with pre-capture/payable authorization states `none`, `payment_method_saved`, or `authorized`; `captured`, `released`, `failed`, or malformed authorization states cannot expose new allocation authority.
93. Authorization-reconciliation events selected for audit or payout reconciliation must be unique per removed row and clearing iteration, and `eventHash` must bind the event `id`; duplicate or under-bound reconciliation events must freeze the round rather than double-count removed rows.

94. CRECM may use legally valid escrow/custody only when a reviewed custody/escrow/payment partner is active. If that stack is absent, the build must use just-in-time authorization/capture and must not claim that saved payment methods, payment commitments, or platform records are escrow, custody, funds held, or payment protection.
95. Externality review fails closed in v1: a project may clear, become payable, receive sponsor matching, or qualify for failure bonuses only if `externalityState === "clear"`; `review`, malformed, or blocked externality states do not clear.
96. Project identity and destination-route fields must be valid before clearing: `goodType` is a valid moral-public-good type, `destinationType` is a valid approved route type, `bucketId` and `destinationRef` are non-empty trim-stable strings, and the project bucket appears in the frozen round moral-bucket snapshot.
97. Failure-bonus round-open eligibility snapshots must bind `wasExternalityClearAtRoundOpen`, `wasProjectIdentityAndRouteValidAtRoundOpen`, and `wasBaselineAndActionEvidenceValidAtRoundOpen`; non-clear externality review, invalid project identity/destination-route fields, or failed binding baseline/action-evidence gates at round open deny failure-bonus qualification.
98. Products used in cent, count, basis-point, or score-unit arithmetic must be computed with exact `BigInt` or pinned fixed-point helpers before division or comparison. Safe-integer inputs alone are insufficient when the intermediate product can exceed JavaScript's safe-integer range.
99. Public copy, audit records, and API fields must distinguish escrow/custody, payment-method saving, authorization, and capture; no just-in-time authorization path may be labeled as escrow or custody.
100. Bundle-derived participant rows used for final clearing or failure-bonus qualification must be explicitly bound to the current round, project, participant, and budget/intent context. Wrong-round, wrong-project, wrong-participant, or cross-budget Common Ground Budget, support-stance, conditional-intent, identity-eligibility, or payment-snapshot rows contribute `0` and cannot clear, match, satisfy counterparty volume, authorize, or qualify for failure bonuses.
101. Bundle-derived project rows used for hard gates, candidate allocation, counterparty-bucket lookup, matching, authorization, payout, or failure-bonus qualification must match the current round and expose trim-stable non-empty `id` and `bucketId` values. Missing, wrong-round, missing-id, missing-bucket, or malformed project rows fail closed, contribute zero, and must not be replaced by mutable live project records.
102. Stage 1 project identity/destination-route hard gates must use the same frozen, round-bound, rulebook-bound, hash-bound, graph-well-formed `RoundMoralBucketSnapshot` eligibility predicate as candidate allocation. A loose bucket-id membership check against an unbound or malformed snapshot cannot make a project clear, match, authorize, pay, or qualify for failure bonuses.
103. Stage 1 final sponsor-backed hard gates that call `sponsorBackedCentsForFinalClearing(poolType)` must require an eligible round-close `RoundClearingInputBundle` with reproducible bundle hash, valid component hashes, sponsor-input hash binding, and moral-bucket snapshot id/hash binding. If the eligible bundle is missing or invalid, final sponsor-backed hard gates fail closed; pre-round or settlement previews must use `sponsorBackedCentsForPreview(poolType, previewAsOf)` instead.
104. Round-open failure-bonus eligibility snapshot fields such as `wasReviewApprovedAtRoundOpen`, `wasChallengeNonBlockingAtRoundOpen`, `wasDestinationVerifiedAtRoundOpen`, `wasProjectIdentityAndRouteValidAtRoundOpen`, `wasBaselineAndActionEvidenceValidAtRoundOpen`, `wasAntiThreatClearAtRoundOpen`, `wasExternalityClearAtRoundOpen`, `wasConflictNonBlockingAtRoundOpen`, and `wasSponsorBackedAtRoundOpen` must be exact booleans and must be exactly `true` before threshold-family failure-bonus qualification. Truthy strings, numbers, objects, or malformed values do not qualify.
105. Bundle-derived `ProjectSupportStance` and `ConditionalTradeIntent` rows used for final clearing or failure-bonus qualification must bind to the current `CommonGroundBudget.id`. A stance or intent from another Common Ground Budget for the same participant contributes `0`, cannot expose caps or counterparty buckets, cannot authorize capture, and cannot qualify for failure bonuses.
106. Section 10 and Stage 7 failure-bonus payout calculations may call `sponsorBackedCentsForFinalClearing("failure_bonus")` only after the same eligible round-close clearing-bundle predicate used for failure-bonus qualification has passed. If the eligible bundle is missing or invalid, `finalFailureBonusBackingCents` and `failureBonusPoolAvailableCents` are `0`.
107. Section 9 and Stage 4/5 base-match and bonus-match pool availability calculations may call `sponsorBackedCentsForFinalClearing("base_match")` or `sponsorBackedCentsForFinalClearing("bonus_match")` only after an eligible round-close clearing bundle has passed the same final-clearing bundle predicate. If the eligible bundle is missing or invalid, `baseMatchPoolAvailableCents` and `bonusPoolAvailableCents` are `0`; live sponsor rows cannot back final base or bonus match payouts.
108. Section 11 final sponsor-backed summary checks and Stage 1 final sponsor-backed hard-gate checks must compare gated backing variables derived only after the eligible round-close clearing-bundle predicate has passed. If the eligible bundle is missing or invalid, `finalBaseMatchBackingCents`, `finalBonusMatchBackingCents`, `finalFailureBonusBackingCents`, `finalFeeSupportBackingCents`, `stageOneBaseMatchBackingCents`, `stageOneBonusMatchBackingCents`, `stageOneFailureBonusBackingCents`, and `stageOneFeeSupportBackingCents` are `0`; raw final sponsor-backed function calls cannot make a project clear, match, authorize, pay, or appear in a final audit bundle.
109. Bundle-derived support-stance rows must expose stance, cap, rank-order, and acceptable counterparty-bucket inputs only after they bind to the current `CommonGroundBudget.id`, participant, and project. Missing, wrong-round, wrong-project, wrong-participant, or cross-budget support-stance rows default to abstain, zero cap, and empty acceptable counterparty buckets before candidate allocation or cross-view validation reads them.
110. Bundle-selected `ProjectSupportStance` rows and clearing-eligible `ConditionalTradeIntent` rows must be unique per `(roundId, commonGroundBudgetId, projectId)` within the round-close input bundle. Duplicate selected rows for the same round / Common Ground Budget / project fail closed and cannot allocate, expose rank order, satisfy counterparty constraints, authorize capture, match, or qualify for failure bonuses.
111. Failure-bonus qualification must directly require the bundle-derived project row to match the current round and expose trim-stable non-empty `id` and `bucketId` values before checking the round-open eligibility snapshot, conditional-intent project binding, or payout eligibility. Missing, wrong-round, missing-id, missing-bucket, or malformed project rows deny qualification.
112. Bundle-derived `PublicGoodProject` rows must be unique per `(roundId, id)` within the round-close input bundle. Duplicate project rows for the same round/project fail closed and cannot supply economic terms, bucket identity, review state, sponsor-compatibility state, matching parameters, authorization inputs, payout inputs, or failure-bonus eligibility.
113. Candidate-allocation stance-cap calculations must not use non-finite sentinel values such as `Infinity`; when no optional basis-point cap is set, the basis-point cap component resolves to the already sanitized integer-cent stance cap.
114. Section 8, Stage 1, Stage 2, and Section 10 must operationalize bundle-derived project, support-stance, and conditional-intent uniqueness with row-count guards derived from the immutable round-close input bundle. Database uniqueness constraints and prose-only invariants cannot substitute for formula-level fail-closed guards in allocation, matching, authorization, or failure-bonus qualification paths.
115. Section 8, Stage 2, Section 10, and Stage 7 must operationalize row-count uniqueness for bundle-derived `IdentityEligibility` rows, relevant `PaymentCommitmentSnapshot` rows, and `ProjectRoundEligibilitySnapshot` rows before those selected rows can affect counting, matching, payment commitment, authorization, or failure-bonus qualification. Duplicate or ambiguous identity, payment-snapshot, or project-eligibility-snapshot rows fail closed and cannot be resolved by arbitrary row ordering.
116. Stage 7 may create or advance a `FailureBonusClaim` only after the same full Section 10 `qualified` predicate passes, including eligible clearing bundle, project row, project-round eligibility snapshot, Common Ground Budget, conditional intent, early payment snapshot, identity row, sponsor backing, and row-count uniqueness checks.
117. Section 8, Stage 2, Section 10, and Stage 7 must operationalize formula-level row-count uniqueness for bundle-derived `CommonGroundBudget` rows by both `(roundId, id)` and `(roundId, participantId)` before those rows can affect caps, consent, fallback authority, payment-snapshot lookup, remaining budget, authorization, matching, or failure-bonus qualification. Formula-level `PaymentCommitmentSnapshot` row-count guards and selected-snapshot lookups must be keyed by `(roundId, commonGroundBudgetId, snapshotKind)`, not by budget and kind alone. Duplicate, same-participant, or wrong-round budget/payment-snapshot rows fail closed and cannot be resolved by arbitrary row ordering.
118. Formula-level `ProjectRoundEligibilitySnapshot` row-count guards and selected-snapshot lookups in Section 10 and Stage 7 must be keyed by `(roundId, projectId)`, not by project id alone. Wrong-round or duplicate project-round eligibility snapshots fail closed and cannot be resolved by arbitrary row ordering.
119. Formula-level `ProjectSupportStance` and clearing-eligible `ConditionalTradeIntent` row-count guards and selected-row lookups must be keyed by `(roundId, commonGroundBudgetId, projectId)`. `ProjectSupportStance` rows must bind directly to `round.id`, and both stance and intent rows must expose trim-stable non-empty IDs before they can affect allocation, counterparty buckets, authorization, matching, or failure-bonus qualification.
120. Failure-bonus sponsor-budget cap checks must compute the total sponsor budget as an exact `BigInt` sum of the sanitized base-match, bonus-match, and failure-bonus budget cents before comparing it with `BigInt(roundFailureBonusBudgetCents) * 20n`; JavaScript-number addition must not determine whether the 5% cap passes.
121. Bundle-derived allocator-state maps for participant remaining budget and project remaining requested cap must be keyed by `(roundId, participantId)` and `(roundId, projectId)` before they can affect Section 8 or Stage 2 actual allocation. Wrong-round or missing allocator-state rows fail closed to `0` and must not be selected by participant id or project id alone.
122. Preview and final sponsor-backed pool sums must use exact `BigInt` accumulation over eligible sponsor commitments before conversion to safe integer cents. JavaScript-number `sum(...)` over sponsor commitments must not determine final or preview pool availability; unsafe aggregate sponsor-backed sums fail closed to `0` unless represented and compared through an explicitly audited exact-integer path.
123. Base-match aggregate claim sums and proration denominators must use exact `BigInt` accumulation over cleared project claims before comparison with the backed base-match pool or proportional proration. JavaScript-number aggregate base-match claim sums must not determine whether claims are fully paid or prorated.
124. Participant-level failed-qualified match-eligible totals and aggregate provisional failure-bonus totals must use exact `BigInt` accumulation before participant-round caps, round-level proration-factor calculation, or final failure-bonus payout. JavaScript-number aggregate failure-bonus sums must not determine cash-or-credit payout eligibility or proration.
125. Stage 7 fallback execution must not read an undefined or ambient `fallbackRule`. It must derive the executable fallback from the current bundle-bound Common Ground Budget / ConditionalTradeIntent context; missing, malformed, wrong-round, wrong-budget, wrong-project, or cross-context fallback inputs fail closed to release/cancel/no capture and require fresh consent before reroute or carry-forward.
126. Stage 7 fallback execution may use a fallback rule only after proving exactly one bundle-derived project row for `(roundId, projectId)`, exactly one bundle-derived Common Ground Budget row for both `(roundId, id)` and `(roundId, participantId)`, and exactly one clearing-eligible ConditionalTradeIntent row for `(roundId, commonGroundBudgetId, projectId)`, all bound to the current round, participant, budget, project, active intent state, and rulebook. Otherwise it must release/cancel/no-capture and require fresh consent before reroute or carry-forward.
127. Stage 7 failure-bonus claim creation must compute `FailureBonusClaim.eligibilityInputsHash` locally from the exact eligible `RoundClearingInputBundle.bundleHash`, `ProjectRoundEligibilitySnapshot.snapshotHash`, early-cutoff `PaymentCommitmentSnapshot.snapshotHash`, `ConditionalTradeIntent.id`, round/project/participant/Common Ground Budget identifiers, `round.failureBonusPolicyVersion`, `projectFailed`, `projectFailureReason`, and `failedQualifiedMatchEligibleCents`. An undefined, ambient, stale, policy-version-omitting, or hash-format-only eligibility-input hash must not create, approve, credit, pay, or advance a claim.
128. Stage 7 failure-bonus project-snapshot lookup, eligibility-input hashing, and claim creation must use Stage 7 locally bound `roundId`, `projectId`, `participantId`, and `commonGroundBudgetId` values. Ambient `projectId`, `participantId`, or Common Ground Budget identifiers from earlier code blocks cannot select snapshots, construct claim identity fields, or create claims.
129. `FailureBonusClaim` records must store `commonGroundBudgetId` and `failureBonusPolicyVersion`, and Stage 7 claim creation must pass explicit `roundId`, `projectId`, `participantId`, `commonGroundBudgetId`, `failureBonusPolicyVersion`, and `failureReason` values. `FailureBonusClaim.eligibilityInputsHash` must include the `earlyFailureBonusCutoff` used for the early payment-commitment snapshot.
130. `CommonGroundBudget.fallbackRule` and `ConditionalTradeIntent.fallbackRule` must match before candidate allocation, payment authorization, fallback execution, or failure-bonus qualification can use fallback authority. Mismatched budget/intent fallback rules fail closed: the allocation contributes `0`, no capture occurs, any existing authorization is released/canceled, and reroute or carry-forward requires fresh consent.
131. `paymentCommitmentSnapshotBindingHashValid(...)` must fail unless `snapshot.paymentMethodRef` is a non-empty trim-stable string. It is not enough for an empty or whitespace-padded payment-method reference to appear inside an otherwise canonical `snapshotHash`; such snapshots cannot affect final clearing, counterparty-volume satisfaction, sponsor-match eligibility, authorization, or failure-bonus qualification.
132. `paymentCommitmentSnapshotBindingHashValid(...)` must also fail unless `snapshot.paymentMethodCommitmentState === "provider_confirmed"` and the payment timestamps are chronologically valid under canonical UTC comparison: `paymentMethodSavedAt <= paymentMethodConfirmedAt <= asOf`. A hash-bound snapshot with `none`, `requires_action`, `invalid`, `detached`, missing, malformed, or chronologically impossible provider-confirmation evidence cannot affect final clearing, counterparty-volume satisfaction, sponsor-match eligibility, authorization, or failure-bonus qualification.
133. `FailureBonusClaim` records and `FailureBonusClaim.eligibilityInputsHash` must bind the exact non-empty trim-stable `round.failureBonusPolicyVersion` used for claim qualification. Claim creation, approval, crediting, payment, and audit reporting must fail closed if the policy version is missing, malformed, not stored on the claim, or omitted from the eligibility-input hash.
134. `paymentCommitmentSnapshotBindingHashValid(...)` must fail unless `snapshot.snapshotKind` is one of `early_failure_bonus_cutoff`, `round_close`, or `authorization_reconciliation`, `roundId`, `participantId`, and `commonGroundBudgetId` are non-empty trim-stable strings, and `rulebookHash` is canonical. A hash-bound snapshot with malformed binding identifiers or a malformed rulebook hash cannot affect final clearing, counterparty-volume satisfaction, sponsor-match eligibility, authorization, or failure-bonus qualification.
135. Fixed-point alpha/beta/gamma/stance-weight constants used for bonus scoring must be single-sourced inside each calculation-version scope. Section 9.2 and Stage 5 may define the bonus-cap basis-point default after the fixed-point formulas, but they must not redeclare the same fixed-point constants or introduce duplicate `const` names that can make strict TypeScript implementations fail or drift from the calculation hash.
136. `roundMoralBucketSnapshotBindingHashValid(...)` must fail unless the moral-bucket snapshot exposes non-empty trim-stable round identity, a canonical rulebook hash, a non-empty trim-stable distinctness-policy version, valid duplicate-free raw bucket IDs, valid duplicate-free reciprocal-map keys and values, a non-negative safe-integer asymmetric-pair count, a valid raw blocked-pair array, canonical creation time, and a canonical snapshot hash reproducible from those fields. A hash-bound but malformed moral-bucket snapshot cannot affect counterparty-bucket validation.
137. `roundClearingInputBundleBindingHashValid(...)` must fail unless the clearing bundle exposes non-empty trim-stable bundle and round identifiers, a canonical rulebook hash, a non-empty trim-stable fee-policy version, a canonical fee-policy hash, a valid deployment mode, mode-compatible pilot cap fields, a valid deployment-audit state with non-empty/canonical nullable deployment-audit id/hash fields, canonical payment/reconciliation-path and optimization-policy hashes, a non-empty trim-stable calculation version and bundle schema version, `snapshotKind === "round_close"`, canonical source-cutoff and creation timestamps, canonical component hashes for `commonGroundBudgetInputHash`, `supportStanceInputHash`, `conditionalTradeIntentInputHash`, `identityEligibilityInputHash`, `projectInputHash`, `paymentCommitmentSnapshotHash`, `feeInputHash`, `deploymentExposureInputHash`, `projectEligibilitySnapshotHash`, `sponsorCommitmentInputHash`, `canonicalInputJsonHash`, and `moralBucketSnapshotHash`, a non-empty trim-stable moral-bucket snapshot id, a canonical moral-bucket snapshot hash, a non-empty trim-stable canonical input ref, a canonical canonical-input hash, and a canonical bundle hash reproducible from those fields. A hash-bound but malformed clearing bundle cannot make final clearing, matching, authorization, failure-bonus qualification, or audit reporting proceed.
138. `projectRoundEligibilitySnapshotBindingHashValid(...)` must fail unless the project-round eligibility snapshot exposes `snapshotKind === "round_open"`, canonical source-cutoff and creation timestamps, non-empty trim-stable round and project identifiers, a canonical rulebook hash, exact boolean round-open eligibility fields, and a canonical snapshot hash reproducible from those fields. A hash-bound but malformed project-round eligibility snapshot cannot qualify, create, approve, credit, pay, or audit a threshold-family failure bonus.
139. Payable `CustodyAuthorization` rows and `AuthorizationReconciliationEvent` records must be bound to the row they keep payable or remove. `CustodyAuthorization.id`, `roundId`, `participantId`, `projectId`, and `providerRef` must be non-empty trim-stable strings and the row's round / participant / project identifiers must match the current payable row. `AuthorizationReconciliationEvent.roundId`, `participantId`, `projectId`, and `conditionalTradeIntentId` must be non-empty trim-stable strings; `custodyAuthorizationId` must be either `null` or a non-empty trim-stable string. Blank, whitespace-padded, wrong-round, wrong-participant, wrong-project, wrong-intent, or wrong-authorization reconciliation/authorization rows fail closed, cannot keep a row payable, cannot remove a row for audit purposes, and cannot enter the round audit bundle.
140. Implementation-facing helpers used by payout-relevant allocation, counterparty validation, matching eligibility, or failure-bonus formulas must be locally defined before use and fail closed. In particular, `min(...)` must accept only non-negative safe-integer values and return `0` on missing, negative, fractional, unsafe, or malformed inputs; `intersection(...)` must accept only duplicate-free trim-stable string arrays and return a sorted duplicate-free array, or `[]` on malformed input. Undefined helper reads or permissive helper substitutions must not affect clearing, matching, authorization, or failure-bonus qualification.
141. `failedQualifiedMatchEligibleCents` values used for failure-bonus qualification, participant-round caps, aggregate provisional totals, eligibility-input hashing, claim creation, payout storage, or payout arithmetic must be positive safe-integer cents before use. Missing, zero, negative, fractional, unsafe, string-coerced, NaN, or malformed values deny qualification and resolve to `0` before any `BigInt` conversion, eligibility-input hash construction, claim creation, claim approval, crediting, payment, or proration.
142. Aggregate payout and proration sums used for base-match claims, bonus-score units, participant-level failed-qualified totals, and aggregate provisional failure-bonus totals must use a locally defined fail-closed `sumBigInt(...)` helper. The helper must accept only arrays of non-negative safe-integer `number` values or non-negative `bigint` values, return `0n` on missing, non-array, negative, fractional, unsafe, string-coerced, NaN, or malformed inputs, and must not be replaced by JavaScript-number `sum(...)`, `reduce(...)` over unsafe numbers, or an undefined aggregate helper in any clearing, matching, authorization, failure-bonus, or audit path.
143. Section 9 and Stage 4/5 payout-relevant matching formulas must use the fail-closed `min(...)` helper from the relevant implementation scope for base-match pool availability, bonus-match pool availability, and bonus-cap enforcement. Raw `Math.min(...)` may appear only inside the helper definition; it must not directly determine matching payouts, pool availability, cap enforcement, authorization, or audit outputs.
144. Participant-round failure-bonus proration must construct an explicit participant-only raw-claim amount map and an explicit per-claim stable-order-key map before calling the proration helper. Undefined `pick(...)` helpers, pseudo-named assignment arguments such as `stableOrder = ...`, ambient claim identifiers, or ordering keys not bound to the current round / participant / claim / failure-bonus policy version must not determine participant caps, claim approval, crediting, payment, proration, or audit outputs.
145. Failure-bonus proration behavior that determines participant-round caps or round-level final payouts must be locally defined before use and fail closed on malformed claim maps, malformed caps, missing or non-canonical stable-order keys, unsafe/fractional/negative cent inputs, duplicate claim identifiers, wrong-round claim identifiers, or malformed claim identifiers. Stage 7 must not call undefined aggregate helpers such as `prorateApprovedFailureBonusClaimsWithin(...)`; it must use explicit final-proration arithmetic over duplicate-free sanitized qualified claim IDs, participant-capped provisional amounts, exact `sumBigInt(...)`, exact target-payout numerator / total-claim denominator base shares, basis-point proration only as audit/reporting metadata, and stable-order keys bound to the current round / claim / failure-bonus policy version.
146. Stage 4 must define `defaultBaseMatchRatioBps` in its own implementation-facing scope before using it in base-match normalization; undefined or substituted base-match default ratios cannot determine base-match claims, payout availability, authorization, or audit outputs.
147. Review-freeze and early-failure-bonus cutoff ordering is a hard timing gate: `reviewFreezeAt` must be strictly before `closesAt`, and `earlyFailureBonusCutoff` must be no later than `reviewFreezeAt`. Rounds that collapse the review-freeze window into round close, or that let “early” failure-bonus qualification occur after review freeze, cannot lock, clear, authorize, match, qualify failure bonuses, or enter final audit bundles.
148. Base-match and bonus-match formulas must sanitize per-project claim, cap, proportional payout, and bonus-score-unit map values before `BigInt` conversion, `sumBigInt(...)`, direct payout, or capped-proration use. Missing, unsafe, negative, fractional, malformed, or non-canonical per-project values resolve to `0` / `0n` and must not crash, coerce, or determine payouts.
149. Stable-order keys used for base-match, bonus-match, and failure-bonus rounding must include explicit SHA-256 canonical-JSON tuple fields with a proration or rounding scope; informal “ascending hash” examples or tuple-field-omitting ordering rules cannot determine payout remainders.
150. Counterparty-bucket lookup must name and use the bundle-derived project bucket, not a generic target moral bucket, before reading `RoundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId`.
151. Section 8 and Stage 3 counterparty-volume predicates must compare against the already sanitized local `conditionalIntentMinCounterpartyVolumeCents` value derived from the active bundle-derived `ConditionalTradeIntent.minCounterpartyVolumeCents`. They must not call a generic `conditionalIntentMinCounterpartyVolumeCents(userId, projectId)` helper, read the deprecated `ProjectSupportStance.minCounterpartyVolumeCents` mirror, or derive reciprocal bucket eligibility from an unbound target-bucket alias instead of the current bundle-derived `project.bucketId`.
152. Failure-bonus proration factors stored in basis points are audit/reporting fields and must not be the sole determinant of final payout cents when claims exceed caps or the funded pool. Base payout cents must be computed as `floor(rawClaimCents * targetPayoutCents / totalRawClaimCents)` using exact `BigInt` arithmetic, with leftover cents assigned by canonical stable-order keys; otherwise basis-point truncation can underallocate funded failure-bonus budgets.
153. Fee accounting is payout-relevant: platform, payment, fiscal-host, and recipient-routing fees must be stored and reported separately from gross captured cents and net recipient-disbursed cents. Fees never count toward counted contributions, match-eligible contributions, counterparty volume, sponsor-match claims, project threshold amounts, or minimum-viable recipient funding unless an explicit sponsor-paid-fee rule in the frozen rulebook funds those fees separately and excludes them from donor match credit. Positive final-clearing allocation rows must use hash-bound bundle-derived `FeeQuote` rows whose `feePolicyVersion` and `feePolicyHash` match the current round; missing, duplicate, wrong-round, wrong-budget, wrong-project, wrong-intent, wrong-policy-version, wrong-policy-hash, or internally inconsistent fee quotes make the row contribute `0` gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible cents.
154. Bonus-affecting dissent pressure must be computed only from bundle-derived current-round dissent rows whose participants are human verified, sybil-clear, collusion-clear, and unique after linked-account, same-payment-method / same-payment-cluster, and same-control clustering. Unverified, duplicate-cluster, review-state, blocked, or malformed dissent may trigger manual review queues, but it must not reduce bonus scoring, unlock hard gates, or determine payout-relevant review-pressure metrics.
155. The coalition optimizer must have a deterministic final tie-breaker after user-rank constraints and the stated objective order. Equal-objective solutions must be selected by stable SHA-256 canonical-JSON tuple ordering over explicit round / calculation-version / participant / project / Common Ground Budget / conditional-intent identifiers, and the solver or greedy algorithm version plus tie-break tuple fields must be included in the calculation hash. Arbitrary solver-dependent or database-order-dependent tie resolution must not affect clearing, matching, authorization, or audit outputs.
156. Round-close clearing bundles and audit bundles must include a canonical `feeInputHash`, and the round must expose non-empty trim-stable `feePolicyVersion` plus canonical `feePolicyHash` before lock, clearing, matching, authorization, or failure-bonus qualification. Fee-policy or fee-quote data that is mutable, unbound to the current rulebook and fee-policy hash, or absent from the calculation hash cannot determine gross capture, net recipient-disbursed public-good credit, counted contribution, match eligibility, threshold satisfaction, authorization, payout, or audit outputs.
157. Every payout-relevant `FeeQuote` must bind to the current `round.feePolicyHash`, not merely to `round.feePolicyVersion`; `FeeQuote.quoteHash` must include that policy hash, and `RoundAuditBundle` must expose `feeInputHash` and `feePolicyHash` directly. Fee quotes must be unique for both `(roundId, id)` and `(roundId, commonGroundBudgetId, projectId, conditionalTradeIntentId)` in the round-close fee input bundle. Waived-fee quotes require `feeCents === 0`; donor-deducted and sponsor-paid fee quotes must satisfy their respective gross/net equations before any fee, net-recipient, counted, match-eligible, authorization, payout, or audit value can use them.
158. Failure-bonus claim-list validation for participant-round and round-level proration must bind every claim-list key to `FailureBonusClaim.id` and require non-empty trim-stable round, project, participant, Common Ground Budget, and conditional-intent identifiers on the selected claim row. Key-mismatched, weakly identified, wrong-round, wrong-policy, malformed, missing, or duplicate claim rows fail closed before proration and cannot be silently filtered into a changed denominator.
159. Sponsor-paid fee quotes must bind `sponsorFeeBackingHash` to the current round's frozen `round.sponsorPoolSourceHash` / clearing-bundle sponsor-commitment input before sponsor-paid fees can preserve net recipient-disbursed public-good credit. A canonical but stale, wrong-round, wrong-pool, or unbound sponsor fee backing hash cannot determine gross capture, net-recipient credit, counted contribution, match eligibility, authorization, payout, or audit outputs.
160. Failure-bonus claimants must not be project proposers, recipient controllers, fiscal-host controllers, sponsors, reviewers, or same-control / linked-account / same-payment-method / same-payment-cluster affiliates of those parties for the project receiving the claim. Claimant-level conflicts that are anything other than `no_conflict` deny failure bonuses even when the project's general conflict review is non-blocking for ordinary donations.
161. Real-money deployment must be mode-gated. `shadow` rounds may compute non-binding allocations but must capture `0`; `capped_pilot` rounds may capture only within frozen per-round and per-participant gross-exposure caps; `full` rounds require a first-class passed deployment audit row whose hash covers the current payment/reconciliation path and at least one prior capped-pilot real-money round. Missing, malformed, failed, or stale deployment-mode evidence blocks lock, clearing, authorization, matching, payout, and final audit publication.
162. Project scope is a hard gate. Projects whose `scopeState` is not exactly `valid_moral_public_good`, or whose `excludedTradeType` is non-null, cannot clear, authorize, receive sponsor matching, qualify for failure bonuses, or appear as payable in audit bundles.
163. Sponsor-paid fees must be backed by frozen `SponsorCommitment` records with `poolType === "fee_support"`. Base-match, bonus-match, and failure-bonus commitments cannot be reused to back sponsor-paid fees, and sponsor-paid `FeeQuote` rows cannot preserve net recipient-disbursed public-good credit unless the fee-support pool is round-bound, source-hash-bound, and sufficient for aggregate sponsor-paid fee cents.
164. Capped-pilot candidate allocation must be min-capped by both the configured `pilotMaxRoundGrossExposureCents` / `pilotMaxParticipantGrossExposureCents` values and the bundle-derived remaining round/participant deployment-exposure maps. Remaining-exposure maps cannot raise a pilot cap above the frozen configured cap.
165. Deployment audits that unlock `full` deployment, or optional audit-backed `capped_pilot` deployment, must be first-class `DeploymentAudit` rows created no later than `round.parametersFrozenAt`. The audit hash must bind the audit id, round id, target deployment mode, calculation version, rulebook hash, fee-policy hash, sponsor-pool source hash, current payment/reconciliation path hash, solver version, prior shadow/pilot round ids, prior audit-bundle hashes, prior deployment modes, prior payment/reconciliation path hashes, including at least one capped-pilot prior mode with the same payment/reconciliation path for full deployment, passed state, auditor id, and creation timestamp. A bare canonical `deploymentAuditHash`, post-freeze audit row, or audit row without a matching bound `DeploymentAudit` record cannot unlock lock, clearing, authorization, matching, payout, or audit publication.
166. Capped-pilot gross-exposure allocator state must be frozen into `RoundClearingInputBundle.deploymentExposureInputHash` and exposed in `RoundAuditBundle.deploymentExposureInputHash` before it can cap candidate allocation. Missing, malformed, mutable, wrong-round, or non-hash-bound deployment-exposure maps fail closed to zero real-money allocation in capped pilots.
167. Shadow-mode rounds may compute and publish explicitly labeled non-binding simulation outputs, including shadow gross, fee, net-recipient, actual, counted, match-eligible, match, failure-bonus, authorization, and payout preview values. Those shadow outputs must be stored in separate shadow fields and must not write to binding gross-captured, fee, net-recipient, actual/gross exposure, counted, match-eligible, authorization, capture, sponsor-match, failure-bonus, recipient-payout, or payable audit channels, all of which resolve to `0` in shadow mode.
168. Deployment audits must bind coherent rollout evidence. `DeploymentAudit.auditKind`, `targetDeploymentMode`, prior round ids, prior audit-bundle hashes, prior deployment modes, and prior payment/reconciliation path hashes must be mutually coherent, equal-length, duplicate-free where applicable, and bound into `auditHash`; prior round ids must not include the current round. `shadow_to_pilot` audits may target only `capped_pilot` and must cite shadow prior modes; full-deployment audits must use `pilot_to_full` with only capped-pilot prior modes and at least one same-payment-path capped-pilot prior, or `shadow_or_pilot_to_full` with at least one same-payment-path capped-pilot prior plus any additional shadow/pilot prior modes; shadow-only prior evidence cannot unlock `full` deployment.
169. DeploymentAudit uniqueness and binding-hash constraints apply to every selected audit-backed deployment path, including optional audit-backed `capped_pilot` rounds and required `full` rounds. A selected deployment audit with the wrong target mode, wrong audit kind, mismatched prior evidence arrays, duplicate prior ids, current-round self-reference, or missing prior deployment modes cannot unlock lock, clearing, authorization, matching, payout, or audit publication.
170. Aggregate sponsor-paid fee-support calculations may compare sponsor-paid fee demand to the frozen `fee_support` pool only after the eligible round-close clearing bundle predicate passes and the selected sponsor-paid fee quote id list for positive binding cleared rows is valid. Aggregate demand must be computed from selected binding sponsor-paid `FeeQuote` ids that each resolve to exactly one frozen `FeeQuote` row by `(roundId, id)`, not every possible fee quote in the frozen bundle. Unselected candidate fee quotes do not consume fee-support backing, while missing, duplicate, non-array, wrong-round, wrong-policy, wrong-sponsor-backing, wrong-cutoff, negative, unsafe, fractional, or malformed selected sponsor-paid fee aggregate inputs fail closed rather than being silently filtered or reducing aggregate fee-support demand.
171. Shadow-mode simulations may use active consented Common Ground Budgets without provider-confirmed round-close payment-commitment snapshots, but only for `shadowPreview*` outputs. Binding `capped_pilot` and `full` clearing still require eligible provider-confirmed `PaymentCommitmentSnapshot` rows before any threshold counting, counterparty volume, sponsor matching, authorization, capture, payout, or failure-bonus qualification can occur.
172. Deployment audits must match the current `round.paymentReconciliationPathHash`; audit rows whose payment/reconciliation path hash is canonical but different from the current round's frozen path cannot unlock capped-pilot or full deployment.
173. Full deployment requires prior capped-pilot evidence in the selected `DeploymentAudit`, including at least one capped-pilot prior whose `priorRoundPaymentReconciliationPathHash` equals the current deployment audit payment/reconciliation path. Shadow-only or different-payment-path prior evidence can support a capped-pilot audit but cannot unlock `full` deployment.
174. Verified-supporter and active-cluster breadth thresholds use a frozen `supporterCountMinNetPublicGoodCents` floor. Donor rows below that net recipient-disbursed public-good credit floor cannot count as verified supporters or active-cluster members, even if their counted contribution is positive; invalid, missing, or below-100-cent floor values default to 100 cents; only a frozen value at or above 100 cents may raise the floor to a higher payment-processor minimum.
175. Baseline integrity, baseline confidence, and action evidence are implementation-facing eligibility inputs, not background prose. Binding `capped_pilot` and `full` rounds may clear, match, authorize, pay, or qualify failure bonuses only when the bundle-derived project has `baselineIntegrityState === "clear"`, `baselineConfidenceState` in `high` / `medium`, and `actionEvidenceState === "adequate"`. Shadow rounds may publish nonbinding provisional previews for `provisional_nonblocking` action evidence, but those previews cannot affect binding clearing, matching, failure-bonus, authorization, payout, or audit channels.
176. Failure-bonus claimant conflict snapshots must bind the exact claim context: snapshot kind, round, project, participant, Common Ground Budget, conditional intent, rulebook hash, failure-bonus policy version, source cutoff, conflict state, and creation timestamp. Missing, stale, wrong-policy, wrong-budget, wrong-intent, wrong-cutoff, or merely canonical-looking claimant-conflict snapshots deny qualification and cannot create, approve, credit, pay, or audit a failure-bonus claim.
177. Round-clearing bundle integrity prose, database constraints, tests, and audit bundles must list every active payout-relevant bundle field and component hash, including `feePolicyVersion`, `feePolicyHash`, `deploymentMode`, mode-compatible pilot cap fields, `deploymentAuditState`, `deploymentAuditId`, `deploymentAuditHash`, `paymentReconciliationPathHash`, `optimizationPolicyHash`, `feeInputHash`, `deploymentExposureInputHash`, `projectEligibilitySnapshotHash`, and `sponsorCommitmentInputHash`; older component lists cannot substitute for the active bundle-binding predicate.
178. `MpgfRound.status` is a binding operational gate with distinct replay and side-effect predicates. Binding result calculation, deterministic replay, matching-result reproduction, failure-bonus qualification review, and final audit/reporting may read `cleared`, `payable`, `released`, or `closed` rounds. New authorization attempts may be initiated only while `round.status === "cleared"`. Capture, release, payment, Stage 7 fallback execution, authorization cancellation/release, reroute, carry-forward, failure-bonus claim creation, failure-bonus claim advancement, failure-bonus raw-bonus / participant-cap / participant-capped-provisional / bonus-cents / payout / proration field mutation, failure-bonus payment/crediting, and fallback-routing side effects may execute only while `round.status === "payable"`; all failure-bonus claim-field, payout, proration, payment, and crediting side effects additionally require positive backed failure-bonus-pool availability through the Section 10 / Stage 7 payout-input predicate. `released` and `closed` rounds may publish, replay, or audit already-recorded final outputs, but must not create new authorization, capture, payout, failure-bonus, fallback, or routing side effects. `draft`, `open`, `locked`, `frozen`, `reviewing`, `canceled`, malformed, or missing statuses fail closed for final binding outputs; `open`, `locked`, and `reviewing` rounds may produce only setup displays, internal review calculations, or explicitly non-binding previews. A public safety freeze or cancellation overrides otherwise valid bundles, sponsor backing, payment snapshots, deployment audits, optimization traces, and authorization rows.
179. Deployment audits must bind prior-round outcome states. Every cited prior shadow or capped-pilot evidence tuple must include a valid outcome state, and only `passed` prior outcomes can support audit-backed `capped_pilot` or `full` deployment. Failed, canceled, unresolved incident-review, missing, malformed, or unbound prior outcomes cannot unlock real-money deployment.
180. Pilot-cap fields are mode-specific. `capped_pilot` rounds must have positive safe-integer pilot round and participant gross-exposure caps; `shadow` and `full` rounds must have `pilotMaxRoundGrossExposureCents === null` and `pilotMaxParticipantGrossExposureCents === null`. Non-null pilot caps outside capped-pilot mode fail closed rather than being silently ignored or accidentally applied.
181. Stage 3 coalition optimization must produce a first-class deterministic `OptimizationRunTrace` bound to the eligible round-close input bundle, calculation version, solver/greedy mode, objective vector, stable tie-break tuple hash, and selected coalition hash. Binding rounds may clear only when the trace is uniquely selected, hash-bound, and either `optimalityStatus === "optimal"` for ILP mode or `optimalityStatus === "deterministic_greedy_selected"` for the frozen greedy calculation version. Timeout, infeasible, unknown, non-deterministic, missing, duplicate, or wrong-bundle optimization traces fail closed.
182. `MpgfRound.optimizationPolicyHash` is a first-class frozen rulebook input. It must be a canonical hash before lock, clearing, matching, authorization, payout, failure-bonus qualification, or audit publication. `DeploymentAudit`, `RoundClearingInputBundle`, `OptimizationRunTrace`, and `RoundAuditBundle` rows selected for the round must bind the same `optimizationPolicyHash`; a wrong-policy optimizer trace or deployment audit cannot unlock binding outputs.
183. A binding `OptimizationRunTrace` must expose `optimizationStage === "stage_3_coalition_clearing"`, a non-empty trace schema version, canonical `optimizationPolicyHash`, `optimizationInputHash`, `objectiveVectorHash`, `stableTieBreakTupleHash`, `selectedCoalitionHash`, `selectedAllocationRowsHash`, and `constraintSatisfactionHash`. `optimizationTraceHash` must be reproducible from those fields plus trace id, round id, clearing-bundle id/hash, calculation version, solver mode/version, optimality status, and creation timestamp. A trace created before the selected round-close bundle, a trace whose selected-allocation hash omits per-row gross/fee/net-recipient/actual/count/match-eligible cents, or a trace whose constraint-satisfaction hash is missing cannot make binding outputs proceed.
184. `RoundAuditBundle` must store both `optimizationTraceId` and `optimizationTraceHash`, and database/application integrity must enforce at most one selected Stage 3 `OptimizationRunTrace` for `(roundId, clearingInputBundleId, calculationVersion, optimizationStage)`. Duplicate, unselected, wrong-policy, wrong-stage, wrong-bundle, wrong-version, or hash-format-only traces fail closed rather than being resolved by arbitrary row ordering.
185. Stage 7 fail-closed fallback handling must not synthesize `release_hold` or any other executable fallback rule. If the current bundle-derived project, Common Ground Budget, and ConditionalTradeIntent rows are not uniquely proven and fallback-rule-consistent, Stage 7 may only release/cancel/no-capture and mark fresh consent required; refund, reroute, carry-forward, and release-hold branches may run only after an explicitly user-consented bound fallback rule is selected from eligible rows.
186. Final Section 10 and Stage 7 failure-bonus payout/proration claim lists may contain only unsettled approved `FailureBonusClaim` rows with `claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null`, in addition to the existing id, round, project, participant, Common Ground Budget, conditional-intent, policy-version, payable-status, and backed-pool predicates. `pending`, `denied`, `expired`, `paid`, `credited`, or already-settled approved claims must not enter payout denominators, receive new `bonusCents`, `prorationFactorBps`, `finalFailureBonusCents`, crediting, or payment mutations, or be used to change payout allocations; already paid/credited rows may only be replayed or audited. Successful cash payout or platform-credit issuance must atomically advance `claimState` to `paid` or `credited`, set a non-empty trim-stable `payoutRef`, and set a canonical `resolvedAt` timestamp so later `payable` passes cannot treat the row as eligible again.
187. Stage 7 failure-bonus claim creation must initialize the created `FailureBonusClaim` row's state and default fields explicitly. A fully qualified Stage 7 claim that is created for payout must start as unsettled approved: `claimState === "approved"`, `denialReason == null`, `payoutRef == null`, `resolvedAt == null`, canonical `createdAt`, and non-negative integer-cent `rawBonusCents`, `participantRoundCapCents`, `participantCappedProvisionalBonusCents`, and `bonusCents` defaulted to `0`, with `prorationFactorBps` defaulted to `10_000` until the payable backed-pool calculation overwrites it. If the product instead creates an intake-only claim, it must be explicitly `pending`, use the same null settlement/default field requirements, and be unable to enter final payout/proration lists until a separate approval transition sets `claimState === "approved"` under the same current-round, policy, bundle, and claimant-conflict predicates. Missing, implicit, terminal, already-settled, or helper-default claim states must fail closed.
188. Section 10 and Stage 7 failure-bonus claim audit-context predicates must re-verify the stored claimant-conflict snapshot identity, `no_conflict` state, canonical hash, and source-cutoff binding; recompute `FailureBonusClaim.eligibilityInputsHash` from stored claim context including claimant-conflict, bundle, payment, project-round eligibility, policy, failure-reason, and failed-qualified amount fields; and use stored claim amount fields for raw/cap/provisional/final payout arithmetic unless any external amount map is absent or exactly matches the stored claim field. Mismatched, missing, conflicted, stale, or non-reproducible claim context fails closed before any mutation, proration, payout, or crediting.
189. Contributor-only success rewards, coordination credits, and impact certificates are private coordination-layer benefits, not moral public-good dollars. They must never count toward net recipient-disbursed dollars, project thresholds, minimum-viable funding, counted contributions, match-eligible contributions, counterparty volume, base-match claims, bonus-match claims, verified-supporter counts, active-cluster counts, or public-good impact totals.
190. Contributor-only success rewards may be advertised, qualified, credited, or paid only when a separate pool-specific `success_reward` sponsor pool is funded, escrowed, or contractually committed before the round's parameter-freeze timestamp. Base-match, bonus-match, failure-bonus, and fee-support pools cannot be reused to back success rewards.
191. A donor-facing dominance or “reward offsets your contribution” claim may be shown only if the maximum possible signer-only success-reward liability implied by that claim is fully backed by the frozen `success_reward` pool. If the reward pool is capped or prorated, the UX must say “up to” and must not imply dominant-strategy participation.
192. Success rewards are available only to verified, sybil-clear, collusion-clear, conflict-clear contributors with captured successful contribution rows in a payable round after authorization reconciliation. Review-blocked, challenge-blocked, anti-threat-blocked, externality-not-clear, project-scope-blocked, conflict-blocked, authorization-failed, self-matched, linked-account, same-payment-method / same-payment-cluster, same-control, or consent-invalid rows cannot earn success rewards, coordination credits, or impact certificates.
193. No-late-access is a hard reward invariant. Non-signers, late signers, post-close buyers, or participants without a locked pre-close conditional intent and provider-confirmed payment snapshot cannot retroactively buy or receive the same contributor-only success reward, coordination credit, or impact certificate for that round.
194. Coordination credits are non-transferable by default and must not increase moral reputation, vote weight, identity weight, counted dollars, match eligibility, counterparty-volume satisfaction, or allocation power. They may be used only as an excludable eligibility or priority signal for future sponsor-funded coordination opportunities, public recognition, audit receipts, or non-binding advisory access.
195. Impact certificates minted by CRECM represent contributor receipts for captured successful net recipient-disbursed public-good funding. They must bind to the same round, project, participant, Common Ground Budget, conditional intent, payment snapshot, fee quote, clearing bundle, and rulebook hash as the underlying contribution; certificate sale or transfer, if enabled in a later version, must not double-count impact or alter final clearing.
196. Pledge-progress disclosure is sealed by default before round close. The public board may show rounded, delayed, or qualitative status, but it must not expose exact current threshold satisfaction, exact counterparty-volume gaps, or exact project success-without-me signals that would let participants cheaply time free-riding. Final exact aggregates may be published only after close in the audit bundle.
197. Success-reward, coordination-credit, and impact-certificate input hashes must be bound into the round-close clearing bundle, selected optimization trace, and audit bundle before reward, credit, or certificate side effects can run. Mutable live reward-policy or certificate rows must not affect final reward issuance.
198. Cash or cash-equivalent success rewards must be paid only from the backed `success_reward` sponsor pool, never from recipient project funds or donor-captured project contributions. If a success reward is a platform credit rather than cash, the credit liability, expiry, redemption limits, and sponsor backing must be disclosed and hash-bound in the reward policy.
199. The Advanced Pivotality Calculator is non-binding educational tooling. It must not create, modify, rank, clear, authorize, capture, release, reward, credit, certify, or audit any Common Ground Budget, support stance, conditional intent, payment snapshot, sponsor commitment, allocation row, failure-bonus claim, success-reward claim, coordination-credit entry, or impact-certificate claim.
200. Before round close, the calculator may use only user-supplied subjective inputs, static explanatory examples, or shadow-mode hypothetical inputs. It must not read or infer exact live threshold satisfaction, exact live counterparty-volume gaps, exact supporter counts, exact active-cluster counts, live success-without-me status, live success-without-me probability, or platform-generated decisive-probability estimates.
201. The calculator output must be labeled "best by your stated values under this simplified model" or materially equivalent wording. It must not say or imply "objectively best," "the platform estimates you are pivotal," or "your donation is guaranteed to be decisive."
202. Calculator success-reward, coordination-credit, and non-decisive-funding inputs represent the user's subjective value for private coordination-layer benefits. They must not be counted as public-good dollars, net recipient-disbursed dollars, counted dollars, match-eligible dollars, threshold satisfaction, counterparty volume, supporter counts, cluster counts, base-match claims, bonus-match claims, failure-bonus eligibility, or allocation power.
203. The simplified public UX is a progressive-disclosure wrapper around the same explicit records and constraints. Basic mode may hide rarely edited fields behind advanced drawers, but it must still collect explicit stances, project caps, conditional-intent exposure, counterparty buckets, fallback consent, payment consent, fee acknowledgement, reward/credit/certificate opt-ins, visibility settings, and sealed-pledge acknowledgement before any binding round-close allocation can use them.
204. Suggested defaults in simplified UX are not consent. Auto-filled cross-view conditions, counterparty buckets, max exposures, fallback rules, reward opt-ins, or visibility settings become binding only after the user sees them in the review screen and explicitly saves them under the current rulebook hash.
205. Plain-language guided mode is a presentation layer only. Every plain label must map one-to-one to a canonical CRECM enum value or field; it must not introduce new stance states, fallback states, payment states, reward states, accounting channels, or hidden consent states.
206. The final review screen must expose the canonical meaning of every plain-language choice before save, including stance value, maximum exposure, counterparty buckets, minimum counterparty volume, priority order, fallback, fee treatment, reward/credit/certificate opt-ins, visibility, payment language, sealed-progress acknowledgement, self-matching exclusions, and failure-bonus denial categories.
207. User-facing copy must distinguish maximum budget, possible captured amount, gross captured exposure, fees, net recipient-disbursed public-good dollars, counted dollars, match-eligible dollars, sponsor base match, bonus match, success rewards, coordination credits, and impact certificates. Simplified copy may group these visually, but the detailed accounting must remain accessible before consent and on receipts.
208. Primary UI, emails, receipts, and public pages must not use “held,” “authorized,” “escrow,” “custody,” “guaranteed match,” “matched impact,” or “impact certificate” in a way that implies a stronger legal, payment, accounting, or impact claim than the corresponding CRECM state supports.
209. Moral-public-goods search intent is first-class. A query, route, or filter state matching “moral public goods,” “public goods fund,” “Common Ground Budget,” “CRECM,” “MPGF,” “assurance matching,” or materially equivalent terms must surface the Common Ground Budget / Public Goods Fund entry card before a generic ordinary-offer zero state. Ordinary-offer zero states may still be shown, but only as secondary explanatory context.
210. The offers page must preserve lane separation while simplifying the default view. Live offers, reviewed templates, worked examples, demo records, shadow previews, capped-pilot rounds, and public-goods modules must keep separate counts, labels, and non-guarantee states; the simplified UI may collapse them into an “Other ways to browse” drawer but must not merge their counts or imply that examples/demos are live liquidity.
211. Public product copy must use current active labels for the current product: “Common Ground Budget” and “Public Goods Fund” in user-facing headers, with “CRECM v1.125” available in technical details. Stale current-product labels such as “external CRECM module,” old moralpublicgoods file numbers, old mechanism versions, or legacy “Verified Assurance Matching” names may appear only in historical/demo details and must be visually marked as legacy.
212. Moral-public-goods search pages must not render irrelevant empty filters, zero-facet panels, or a primary “0 listings” message when a public-goods funding module, preview, or round exists. Empty ordinary-offer filters can remain accessible in an advanced drawer labeled “ordinary offer filters,” but they cannot be the default path for a public-goods search.
213. Page-level CTA hierarchy is binding copy/interaction guidance, not a mechanism shortcut. The first CTA should be the safest next action available for the current deployment mode, usually “Preview a Common Ground Budget” or “View current round.” Any CTA that could create a binding contribution intent must still require sign-in, identity/payment prerequisites, explicit stance/cap/condition/fallback consent, final review, and the normal CRECM gates.
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
9. Separate gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible accounting.
10. Sponsor-pool precommitment and round-parameter locking.
11. Refund / reroute / carry-forward / release-hold failure handling.
12. Auditable failure-bonus claim tracking and reason-coded exclusion of non-threshold failures.
13. Public audit bundles and privacy-safe round reports.
14. Shadow / capped-pilot / full deployment-mode guardrails with auditable activation before uncapped real-money use.
15. Explicit shadow-output separation, aggregate fee-support sponsor-pool backing, binding deployment-audit snapshots, capped-pilot cap enforcement, and claimant-conflict snapshot binding.
16. Optional contributor-only success rewards backed by a separate sponsor pool.
17. Non-transferable coordination credits and contributor-only impact certificates for captured successful contributions.
18. Sealed-pledge / blind-progress defaults that reduce strategic waiting and free-riding.
19. Optional Advanced Pivotality Calculator for user-supplied, non-binding threshold-funding intuition.
20. Progressive-disclosure public UX that simplifies the default flow without weakening explicit consent, accounting, review, payment, reward, or audit constraints.
21. Plain-language guided mode, copy-map parity, and final-review checklist that make the UI easier while preserving the exact canonical CRECM records and hard gates.
22. Offers-search and Public-Goods-Fund entry-page simplification that makes moral-public-goods search intent route to a first-class Common Ground Budget card while preserving lane separation, no-capture/demo labels, sealed-progress defaults, and all CRECM consent and audit gates.

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
| `min_counterparty_volume_cents` | Minimum verified, match-eligible, morally distinct counterparty volume required; sponsor dollars, fees, self/linked accounts, same-payment-method clusters, and same-control entities do not count |
| `intent_amount_cents` / `max_exposure_cents` | The explicit conditional-intent amount and maximum amount that can be captured for this project in this round |
| `rulebook_hash_at_consent` | Hash of the rulebook the user consented to; reroute or carry-forward under a different material rulebook requires re-consent |
| `fallback_rule` | `refund`, `reroute`, `carry_forward`, or `release_hold` |
| `visibility_pref` | `public`, `pseudonymous`, `aggregate_only`, or `private` |
| `recognition_opt_in` | Optional social proof; never required |
| `payment_method_saved_at` | Timestamp showing when a payment method was saved; final clearing also requires provider confirmation before round close |
| `payment_method_commitment_state` / `payment_method_confirmed_at` | Provider-confirmation state and timestamp; only `provider_confirmed` commitments count for final clearing |
| `payment_commitment_snapshot_id` | Immutable round-close or early-cutoff snapshot used for final clearing and failure-bonus qualification; live payment fields alone do not count |
| `fee_acknowledgement` | User-facing acknowledgement of platform, payment, fiscal-host, and recipient-routing fees if any |
| `success_reward_opt_in` | Whether the user wants contributor-only success rewards or credits if their conditional pledge clears; rewards never count as public-good funding |
| `coordination_credit_opt_in` | Whether the user wants non-transferable coordination credits that may give future sponsor-funded coordination access but never allocation power |
| `impact_certificate_opt_in` | Whether the user wants a contributor-only impact certificate for captured successful contributions; no retroactive certificate access for non-signers |
| `sealed_pledge_acknowledgement` | Acknowledgement that live exact threshold and counterparty-volume status may be hidden or rounded until round close to reduce strategic waiting |
| `pivotality_calculator_opt_in` | Optional access to a non-binding educational calculator; this is not a pledge field and must not affect allocation |

The default UX may use a simplified **Budget → Projects → Review** flow. Basic mode can collapse advanced controls, but the final review screen must show all binding caps, stances, fallback rules, counterparty-bucket conditions, fee treatment, reward/credit/certificate opt-ins, visibility settings, and payment-consent language before the user saves. Advanced drawers must expose the underlying CRECM fields without changing their semantics.

Plain-language mode may render the stance buttons as a fixed copy map:

| Plain UI label | Canonical stance value | Allocatable? |
|---|---|---:|
| **Fund this** | `strong` | Yes |
| **Fund if different-view support joins** | `weak` | Yes |
| **Needs review** | `dissent` | No; increases review pressure |
| **Skip** | `abstain` | No |

The plain label is presentation only. APIs, stored records, final review details, exports, tests, and audit bundles continue to use the canonical CRECM values.

The optional Advanced Pivotality Calculator is available only from the explainer page, shadow simulation, post-round educational analysis, or an explicitly labeled "learn why this might matter" drawer. It is not a default pledge step and cannot produce binding consent.

This implements the core insight: **weak common-ground support becomes spendable budget**, not merely a ranking signal.

Default stance is **abstain**. Do not infer allocatable support from browsing, profile data, background networking, or past giving. Weak support is spendable only when the user explicitly selected it and set a cap.

---

## 5. Project Eligibility

A project can enter a round only if it has:

| Requirement | Rule |
|---|---|
| Eligible good type | Moral public good, not private benefit |
| Excluded v1 scope | No political campaign trades, lifestyle trades, behavior-change promises, private-benefit projects, or threat-like trades |
| Recipient | Registered nonprofit, fiscal host, or signed auditable disbursement route |
| Moral bucket | Example buckets: global health, animal welfare, existential risk, public-interest knowledge, institutional resilience |
| Review state | Approval-compatible |
| Anti-threat state | No blocker |
| Externality review | Clear in v1; projects under externality review cannot become payable until the review is resolved as clear |
| Baseline integrity / additionality | Clear baseline-integrity state; binding rounds require medium/high baseline confidence that funded net-recipient dollars are counterfactually useful rather than merely replacing already-secured funding |
| Action evidence | Adequate action evidence for binding rounds; shadow rounds may show provisional nonbinding learning signals but cannot clear, match, authorize, pay, or qualify failure bonuses from provisional evidence |
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
| Deployment mode | `shadow`, `capped_pilot`, or `full` |
| Default launch mode | `shadow` or `capped_pilot` until deployment audit passes |

Rounds must not require unanimity or near-unanimity. They should clear **partial coalitions** that satisfy donor constraints and project thresholds.

Before a round opens, the platform must publish and freeze the round rulebook: eligible projects, moral buckets, threshold rules, base-match ratio, bonus formula, failure-bonus rule, success-reward rule, coordination-credit and impact-certificate rules, sealed-pledge disclosure mode, pool-specific sponsor-pool sizes and backed amounts, including any success-reward and fee-support pool, donor caps, identity-counting policy, fee-policy version/hash, net-recipient accounting rules, deployment mode, pilot gross-exposure caps, deployment-audit binding fields and payment/reconciliation path hash for audit-backed rounds, challenge deadlines, and calculation version. After opening, parameters may change only through a public safety freeze or cancellation event that invalidates affected preliminary calculations.

A `shadow` round may run the full clearing, fee, matching, failure-bonus, and audit pipeline in explicitly labeled shadow-output channels, but must remain non-binding and must not authorize, capture, release, or pay funds. A `capped_pilot` round may use real payment authorization/capture only within the frozen per-round and per-participant gross-exposure caps, enforced from bundle-derived remaining deployment-exposure allocator state before candidate allocation. A `full` round may open only after a first-class deployment audit covering the current calculation version, rulebook hash, fee-policy hash, sponsor-pool source hash, the current payment/reconciliation path hash, and prior evidence including at least one capped-pilot real-money round is recorded as passed with a canonical binding hash no later than the parameter-freeze timestamp.

---

## 7. Hard Gates

A project can clear only if all hard gates pass:

```text
project.review_state is approval-compatible
project.challenge_state is none, resolved, or explicitly non_blocking
project.destination_proof_state is verified
project.anti_threat_state is clear
project.externality_state is clear
project_identity_and_route_state is valid
project_baseline_and_action_evidence_state is valid
project_scope_state is valid_moral_public_good
project.conflict_review_state is clear or non-blocking
project.sponsor_pool_compatibility_state is funded, escrowed, or contractually committed
round.sponsor_pool_state is funded, escrowed, or contractually committed
round_rulebook_and_parameter_freeze_state is valid
round_deployment_mode_state is valid
round_clearing_input_bundle_state is valid for final clearing
stage_one_base_match_backing_cents >= safe_round_base_match_budget_cents
stage_one_bonus_match_backing_cents >= safe_round_bonus_budget_cents
stage_one_failure_bonus_backing_cents >= safe_round_failure_bonus_budget_cents
stage_one_fee_support_backing_cents >= aggregate_sponsor_paid_fee_cents
project_economic_terms_valid
net_recipient_cleared_amount >= safe_project_minimum_viable_cents
match_eligible_cleared_amount >= safe_project_threshold_amount_cents
verified_supporter_count >= safe_project_threshold_supporter_min
active_moral_cluster_count >= safe_project_threshold_cluster_min
```

`safe_round_base_match_budget_cents`, `safe_round_bonus_budget_cents`, and `safe_round_failure_bonus_budget_cents` mean the corresponding round sponsor-budget fields after non-negative integer-cent validation; malformed, negative, fractional, or NaN values are treated as `0`. `project_economic_terms_valid` means the project's requested maximum, minimum viable amount, threshold amount, verified-supporter minimum, and active-cluster minimum are valid integer fields; malformed project economic terms block clearing.

`net_recipient_cleared_amount` means the recipient-disbursed public-good amount after platform, payment, fiscal-host, and recipient-routing fees. Fee-inclusive gross captured dollars can define user exposure, but fees do not satisfy minimum-viable amounts, threshold amounts, counterparty volume, counted contribution, or match-eligible contribution.

`project_baseline_and_action_evidence_state` means baseline integrity is clear, action evidence is adequate, and baseline confidence is high or medium for binding `capped_pilot` / `full` rounds. `shadow` rounds may compute explicitly labeled nonbinding previews for projects with provisional nonblocking action evidence, but those projects cannot produce binding gross, fee, net-recipient, actual, counted, match-eligible, match, failure-bonus, authorization, or payout outputs until the binding baseline/evidence gate passes.

`round_deployment_mode_state` means the round declares `shadow`, `capped_pilot`, or `full`; shadow rounds remain non-binding with zero capture while writing only shadow-output simulation rows, capped pilots enforce frozen gross-exposure caps, and full rounds require a passed first-class deployment audit object created no later than parameter freeze whose binding hash covers the current calculation version, rulebook, fee policy, sponsor input, current payment/reconciliation path, and prior evidence including at least one capped-pilot real-money round.

`stage_one_base_match_backing_cents`, `stage_one_bonus_match_backing_cents`, `stage_one_failure_bonus_backing_cents`, `stage_one_success_reward_backing_cents`, and `stage_one_fee_support_backing_cents` are gated Stage 1 backing variables: each is `0` unless the eligible round-close `RoundClearingInputBundle` predicate passes with the required bundle hash, component hashes, sponsor-input hash binding, and moral-bucket snapshot id/hash binding. Only after that predicate passes may they equal the corresponding `sponsorBackedCentsForFinalClearing(poolType)` value over frozen sponsor inputs, including `poolType === "success_reward"` for contributor-only success rewards and `poolType === "fee_support"` for aggregate sponsor-paid fee support.

Default v1 thresholds:

| Threshold | Default |
|---|---:|
| `threshold_supporter_min` | 3 |
| `threshold_cluster_min` | 2 |
| `donor_counted_cap_cents` | Configurable; default $100 |
| `supporter_count_min_net_public_good_cents` | Configurable; default $1; the frozen rulebook may specify a higher payment-processor minimum |
| `identity_weight_min_for_counting_bps` | 7,500 |
| `identity_weight_min_for_bonus_bps` | 10,000 |

A contribution below `identity_weight_min_for_counting_bps` is treated as `counted_contribution_cents = 0` for threshold, supporter, and cluster-counting purposes. A contribution below `identity_weight_min_for_bonus_bps` is treated as `match_eligible_cents = 0` for base-match, bonus-match, counterparty-volume, and failure-bonus purposes.

Moral reputation must never increase allocation power.

### 7.1 Accounting Definitions

Use these separate monetary quantities throughout the mechanism:

| Quantity | Meaning | Used for |
|---|---|---|
| `gross_captured_cents` | Total amount charged or captured from the donor or sponsor, including any pass-through fees | User exposure, payment authorization, receipts |
| `fee_cents` | Platform, payment, fiscal-host, and recipient-routing fees or retained amounts | Fee disclosure, reconciliation, audit; never threshold or match credit |
| `net_recipient_disbursed_cents` | Amount expected to reach the verified recipient route after fees | Minimum viable project funding, recipient payout, public-good delivery |
| `actual_allocated_cents` / `actual_cleared_cents` | Real donor dollars the user is willing to pay and that may be captured if all gates pass; if fees are deducted from the donation, this is gross exposure rather than net recipient funding | User exposure, receipts, gross capture reconciliation |
| `counted_contribution_cents` | Cap-limited and identity-weighted contribution amount, excluding fee dollars | Threshold eligibility, supporter/cluster breadth, anti-sybil counting |
| `match_eligible_cents` | The portion of counted contribution eligible to unlock sponsor base match and bonus match, excluding fee dollars | Sponsor match claims and QF-style bonus formula |

Never use fee-inclusive gross actual dollars to unlock sponsor matching, satisfy counterparty volume, or clear project threshold/minimum-viable gates unless the same cents are also net recipient-disbursed public-good dollars under the frozen fee policy. Never reduce the actual payout receipt merely because a donor has an identity weight below 1.0; instead, reduce or block that donor's counting and match-unlocking power.

---

## 8. Coalition-Routing Algorithm

The router has two jobs:

1. Find threshold-feasible coalitions.
2. Clear only cross-view conditional commitments that satisfy donor constraints.

For each user-project pair, first compute actual user exposure, then separately compute counted and match-eligible quantities. Identity weight is stored and compared in basis points; allocation formulas must use basis-point integer arithmetic rather than floating-point ratio arithmetic. This main router formula is intentionally identical in substance to the Stage 2 candidate-allocation formula below; implementers must not use a weaker budget-only path:

Before final clearing, the platform must create a `RoundClearingInputBundle` at round close. In the formula below, `commonGroundBudget`, `supportStance`, `conditionalTradeIntent`, `identityEligibility`, and `project` mean immutable bundle-derived input rows, not mutable live database records. Live edits after the bundle is created may affect later previews or later rounds, but they must not change final clearing, thresholds, counterparty volume, sponsor matching, failure bonuses, or audit bundles for the locked round. Any `bundleDerived*RowCount*` maps referenced below are computed deterministically from the same immutable `RoundClearingInputBundle` before row selection; duplicate or ambiguous rows fail closed rather than being resolved by arbitrary ordering.

```ts
const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isCanonicalUtcTimestamp = (value: string | null | undefined) =>
  isNonEmptyString(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value

const timestampEquals = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  a === b

const timestampLte = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) <= Date.parse(b)

const timestampLt = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) < Date.parse(b)

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const isPositiveIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value > 0

const isNonNegativeInteger = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const normalizeBps = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 10_000 ? value : null

const isValidBps = (value: number | null | undefined, max = 10_000) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max

const identityWeightBpsOrZero = (value: number | null | undefined) =>
  isValidBps(value, 10_000) ? value : 0

const failClosedIdentityThresholdBps = (value: number | null | undefined) =>
  isValidBps(value, 10_000) ? value : 10_001

const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0

const min = (...values: Array<number | null | undefined>) =>
  values.length > 0 &&
  values.every(value => Number.isSafeInteger(value) && value >= 0)
    ? Math.min(...(values as number[]))
    : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const nonNegativeBigIntTerm = (value: unknown) =>
  (typeof value === "bigint" && value >= 0n) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)

const sumBigInt = (values: unknown) =>
  Array.isArray(values) && values.every(nonNegativeBigIntTerm)
    ? values.reduce(
        (total, value) =>
          total + (typeof value === "bigint" ? value : BigInt(value as number)),
        0n
      )
    : 0n

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const normalizeMatchBps = (value: number | null | undefined, fallback: number) =>
  value == null
    ? fallback
    : Number.isSafeInteger(value) && value >= 0 && value <= 100_000
      ? value
      : 0

const isNonWhitespaceStringValue = (item: unknown) =>
  typeof item === "string" && item.trim().length > 0 && item === item.trim()

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter(isNonWhitespaceStringValue))].sort()
    : []

const rawStringArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(isNonWhitespaceStringValue) &&
  new Set(value).size === value.length

const stringArrayOrEmpty = (value: unknown) =>
  rawStringArrayValid(value) ? [...value].sort() : []

const intersection = (...arrays: unknown[]) =>
  arrays.length > 0 && arrays.every(rawStringArrayValid)
    ? [...new Set(arrays[0] as string[])]
        .filter(item => arrays.every(array => (array as string[]).includes(item)))
        .sort()
    : []

const rawPairArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(pair =>
    Array.isArray(pair) &&
    pair.length === 2 &&
    isNonWhitespaceStringValue(pair[0]) &&
    isNonWhitespaceStringValue(pair[1])
  )

const validPaymentCommitmentSnapshotKinds = [
  "early_failure_bonus_cutoff",
  "round_close",
  "authorization_reconciliation",
] as const

const paymentCommitmentSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  validPaymentCommitmentSnapshotKinds.includes(snapshot.snapshotKind as any) &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.participantId) &&
  isNonEmptyString(snapshot.commonGroundBudgetId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.paymentMethodRef) &&
  snapshot.paymentMethodCommitmentState === "provider_confirmed" &&
  isCanonicalUtcTimestamp(snapshot.paymentMethodSavedAt) &&
  isCanonicalUtcTimestamp(snapshot.paymentMethodConfirmedAt) &&
  isCanonicalUtcTimestamp(snapshot.asOf) &&
  timestampLte(snapshot.paymentMethodSavedAt, snapshot.paymentMethodConfirmedAt) &&
  timestampLte(snapshot.paymentMethodConfirmedAt, snapshot.asOf) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  isCanonicalHash(snapshot.providerEvidenceHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    paymentMethodRef: snapshot.paymentMethodRef,
    paymentMethodSavedAt: snapshot.paymentMethodSavedAt,
    paymentMethodCommitmentState: snapshot.paymentMethodCommitmentState,
    paymentMethodConfirmedAt: snapshot.paymentMethodConfirmedAt,
    asOf: snapshot.asOf,
    providerEvidenceHash: snapshot.providerEvidenceHash,
    rulebookHash: snapshot.rulebookHash,
    createdAt: snapshot.createdAt,
  }))

const validFeePayers = ["donor_deducted", "sponsor_paid", "waived"] as const

const feeQuoteNetMatches = (quote) =>
  quote != null &&
  isNonNegativeIntegerCents(quote.grossCapturedCents) &&
  isNonNegativeIntegerCents(quote.feeCents) &&
  isNonNegativeIntegerCents(quote.netRecipientDisbursedCents) &&
  validFeePayers.includes(quote.feePayer as any) &&
  (
    quote.feePayer === "donor_deducted"
      ? quote.grossCapturedCents >= quote.feeCents &&
        quote.netRecipientDisbursedCents === quote.grossCapturedCents - quote.feeCents &&
        quote.sponsorFeeBackingHash == null &&
        quote.sponsorFeeBackedCents == null
      : quote.feePayer === "waived"
        ? quote.feeCents === 0 &&
          quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
          quote.sponsorFeeBackingHash == null &&
          quote.sponsorFeeBackedCents == null
        : quote.feePayer === "sponsor_paid" &&
          quote.feeCents > 0 &&
          quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
          isCanonicalHash(quote.sponsorFeeBackingHash) &&
          isNonNegativeIntegerCents(quote.sponsorFeeBackedCents) &&
          quote.sponsorFeeBackedCents >= quote.feeCents
  )

const feeQuoteBindingHashValid = (quote) =>
  quote != null &&
  isNonEmptyString(quote.id) &&
  isNonEmptyString(quote.roundId) &&
  isNonEmptyString(quote.participantId) &&
  isNonEmptyString(quote.commonGroundBudgetId) &&
  isNonEmptyString(quote.projectId) &&
  isNonEmptyString(quote.conditionalTradeIntentId) &&
  isNonEmptyString(quote.feePolicyVersion) &&
  isCanonicalHash(quote.feePolicyHash) &&
  validFeePayers.includes(quote.feePayer as any) &&
  feeQuoteNetMatches(quote) &&
  isCanonicalUtcTimestamp(quote.sourceCutoffAt) &&
  isCanonicalHash(quote.rulebookHash) &&
  isCanonicalUtcTimestamp(quote.createdAt) &&
  isCanonicalHash(quote.quoteHash) &&
  quote.quoteHash === sha256(canonicalJson({
    id: quote.id,
    roundId: quote.roundId,
    participantId: quote.participantId,
    commonGroundBudgetId: quote.commonGroundBudgetId,
    projectId: quote.projectId,
    conditionalTradeIntentId: quote.conditionalTradeIntentId,
    feePolicyVersion: quote.feePolicyVersion,
    feePolicyHash: quote.feePolicyHash,
    feePayer: quote.feePayer,
    grossCapturedCents: quote.grossCapturedCents,
    feeCents: quote.feeCents,
    netRecipientDisbursedCents: quote.netRecipientDisbursedCents,
    sponsorFeeBackingHash: quote.sponsorFeeBackingHash ?? null,
    sponsorFeeBackedCents: quote.sponsorFeeBackedCents ?? null,
    sourceCutoffAt: quote.sourceCutoffAt,
    rulebookHash: quote.rulebookHash,
    createdAt: quote.createdAt,
  }))

const canonicalStringArrayRecord = (record) =>
  Object.fromEntries(
    Object.entries(record ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, asStringArray(value)])
  )

const canonicalPairArray = (value) =>
  Array.isArray(value)
    ? value
        .filter(pair =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          isNonWhitespaceStringValue(pair[0]) &&
          isNonWhitespaceStringValue(pair[1])
        )
        .map(([a, b]) => [a, b])
        .sort(([a1, b1], [a2, b2]) =>
          a1 === a2 ? b1.localeCompare(b2) : a1.localeCompare(a2)
        )
    : []

const roundMoralBucketSnapshotGraphWellFormed = (snapshot) => {
  const bucketIds = asStringArray(snapshot?.bucketIds)
  const bucketIdSet = new Set(bucketIds)
  const rawReciprocalMap =
    snapshot?.reciprocalDistinctFromBucketIdsByBucketId ?? {}
  const rawMapKeys = Object.keys(rawReciprocalMap)
  const reciprocalMap = canonicalStringArrayRecord(rawReciprocalMap)
  const mapKeys = rawStringArrayValid(rawMapKeys)
    ? [...rawMapKeys].sort()
    : []
  const blockedPairs = canonicalPairArray(snapshot?.blockedAsymmetricPairs)

  return snapshot != null &&
    rawStringArrayValid(snapshot.bucketIds) &&
    rawStringArrayValid(rawMapKeys) &&
    rawPairArrayValid(snapshot.blockedAsymmetricPairs) &&
    Object.values(rawReciprocalMap).every(rawStringArrayValid) &&
    bucketIds.length > 0 &&
    Number.isSafeInteger(snapshot.asymmetricPairCount) &&
    snapshot.asymmetricPairCount === blockedPairs.length &&
    snapshot.asymmetricPairCount === 0 &&
    blockedPairs.length === 0 &&
    mapKeys.length === bucketIds.length &&
    mapKeys.every(bucketId => bucketIdSet.has(bucketId)) &&
    bucketIds.every(bucketId => mapKeys.includes(bucketId)) &&
    Object.entries(reciprocalMap).every(([bucketId, distinctIds]) =>
      bucketIdSet.has(bucketId) &&
      distinctIds.every(otherId =>
        bucketIdSet.has(otherId) &&
        otherId !== bucketId &&
        (reciprocalMap[otherId] ?? []).includes(bucketId)
      )
    )
}

const roundMoralBucketSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  isNonEmptyString(snapshot.roundId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.distinctnessPolicyVersion) &&
  rawStringArrayValid(snapshot.bucketIds) &&
  snapshot.reciprocalDistinctFromBucketIdsByBucketId != null &&
  typeof snapshot.reciprocalDistinctFromBucketIdsByBucketId === "object" &&
  !Array.isArray(snapshot.reciprocalDistinctFromBucketIdsByBucketId) &&
  rawStringArrayValid(Object.keys(snapshot.reciprocalDistinctFromBucketIdsByBucketId)) &&
  Object.values(snapshot.reciprocalDistinctFromBucketIdsByBucketId).every(rawStringArrayValid) &&
  isNonNegativeInteger(snapshot.asymmetricPairCount) &&
  rawPairArrayValid(snapshot.blockedAsymmetricPairs) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    roundId: snapshot.roundId,
    rulebookHash: snapshot.rulebookHash,
    distinctnessPolicyVersion: snapshot.distinctnessPolicyVersion,
    bucketIds: asStringArray(snapshot.bucketIds),
    reciprocalDistinctFromBucketIdsByBucketId: canonicalStringArrayRecord(
      snapshot.reciprocalDistinctFromBucketIdsByBucketId
    ),
    asymmetricPairCount: snapshot.asymmetricPairCount,
    blockedAsymmetricPairs: canonicalPairArray(snapshot.blockedAsymmetricPairs),
    createdAt: snapshot.createdAt,
  }))

const roundClearingInputBundleBindingHashValid = (bundle) =>
  bundle != null &&
  isNonEmptyString(bundle.id) &&
  isNonEmptyString(bundle.roundId) &&
  isCanonicalHash(bundle.rulebookHash) &&
  isNonEmptyString(bundle.feePolicyVersion) &&
  isCanonicalHash(bundle.feePolicyHash) &&
  ["shadow", "capped_pilot", "full"].includes(bundle.deploymentMode as any) &&
  (
    bundle.deploymentMode === "capped_pilot"
      ? isPositiveIntegerCents(bundle.pilotMaxRoundGrossExposureCents) &&
        isPositiveIntegerCents(bundle.pilotMaxParticipantGrossExposureCents)
      : bundle.pilotMaxRoundGrossExposureCents == null &&
        bundle.pilotMaxParticipantGrossExposureCents == null
  ) &&
  ["not_required", "required", "passed", "failed"].includes(bundle.deploymentAuditState as any) &&
  (bundle.deploymentAuditId == null || isNonEmptyString(bundle.deploymentAuditId)) &&
  (bundle.deploymentAuditHash == null || isCanonicalHash(bundle.deploymentAuditHash)) &&
  isCanonicalHash(bundle.paymentReconciliationPathHash) &&
  isCanonicalHash(bundle.optimizationPolicyHash) &&
  isNonEmptyString(bundle.calculationVersion) &&
  isNonEmptyString(bundle.bundleSchemaVersion) &&
  bundle.snapshotKind === "round_close" &&
  isCanonicalUtcTimestamp(bundle.sourceCutoffAt) &&
  isCanonicalUtcTimestamp(bundle.createdAt) &&
  isCanonicalHash(bundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(bundle.supportStanceInputHash) &&
  isCanonicalHash(bundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(bundle.identityEligibilityInputHash) &&
  isCanonicalHash(bundle.projectInputHash) &&
  isCanonicalHash(bundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(bundle.feeInputHash) &&
  isCanonicalHash(bundle.deploymentExposureInputHash) &&
  isNonEmptyString(bundle.moralBucketSnapshotId) &&
  isCanonicalHash(bundle.moralBucketSnapshotHash) &&
  isCanonicalHash(bundle.projectEligibilitySnapshotHash) &&
  isCanonicalHash(bundle.sponsorCommitmentInputHash) &&
  isCanonicalHash(bundle.successRewardInputHash) &&
  isCanonicalHash(bundle.coordinationCreditInputHash) &&
  isCanonicalHash(bundle.impactCertificateInputHash) &&
  isCanonicalHash(bundle.canonicalInputJsonHash) &&
  isNonEmptyString(bundle.canonicalInputJsonRef) &&
  isCanonicalHash(bundle.bundleHash) &&
  bundle.bundleHash === sha256(canonicalJson({
    id: bundle.id,
    roundId: bundle.roundId,
    rulebookHash: bundle.rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents ?? null,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents ?? null,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId ?? null,
    deploymentAuditHash: bundle.deploymentAuditHash ?? null,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    bundleSchemaVersion: bundle.bundleSchemaVersion,
    snapshotKind: bundle.snapshotKind,
    sourceCutoffAt: bundle.sourceCutoffAt,
    commonGroundBudgetInputHash: bundle.commonGroundBudgetInputHash,
    supportStanceInputHash: bundle.supportStanceInputHash,
    conditionalTradeIntentInputHash: bundle.conditionalTradeIntentInputHash,
    identityEligibilityInputHash: bundle.identityEligibilityInputHash,
    projectInputHash: bundle.projectInputHash,
    paymentCommitmentSnapshotHash: bundle.paymentCommitmentSnapshotHash,
    feeInputHash: bundle.feeInputHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    moralBucketSnapshotId: bundle.moralBucketSnapshotId,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    projectEligibilitySnapshotHash: bundle.projectEligibilitySnapshotHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    successRewardInputHash: bundle.successRewardInputHash,
    coordinationCreditInputHash: bundle.coordinationCreditInputHash,
    impactCertificateInputHash: bundle.impactCertificateInputHash,
    canonicalInputJsonRef: bundle.canonicalInputJsonRef,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    createdAt: bundle.createdAt,
  }))

const roundTimelineValid =
  timestampLt(round.opensAt, round.reviewFreezeAt) &&
  timestampLte(round.opensAt, round.earlyFailureBonusCutoff) &&
  timestampLte(round.earlyFailureBonusCutoff, round.reviewFreezeAt) &&
  timestampLt(round.reviewFreezeAt, round.closesAt) &&
  timestampLt(round.closesAt, round.challengeDeadline)

const bindingFinalResultStatuses = [
  "cleared",
  "payable",
  "released",
  "closed",
] as const

const authorizationSideEffectStatuses = ["cleared"] as const
const capturePayoutFallbackSideEffectStatuses = ["payable"] as const
const finalAuditReplayStatuses = ["released", "closed"] as const

const bindingResultStatusEligible =
  bindingFinalResultStatuses.includes(round.status as any)

const authorizationSideEffectStatusEligible =
  authorizationSideEffectStatuses.includes(round.status as any)

const capturePayoutFallbackSideEffectStatusEligible =
  capturePayoutFallbackSideEffectStatuses.includes(round.status as any)

const finalAuditReplayStatusEligible =
  finalAuditReplayStatuses.includes(round.status as any)

const roundStatusEligible =
  bindingResultStatusEligible

const validDeploymentModes = ["shadow", "capped_pilot", "full"] as const
const validDeploymentAuditKinds = ["shadow_to_pilot", "pilot_to_full", "shadow_or_pilot_to_full"] as const
const validPriorDeploymentModes = ["shadow", "capped_pilot"] as const
const validPriorDeploymentOutcomeStates = [
  "passed",
  "failed",
  "canceled",
  "incident_review",
] as const

const rawPriorDeploymentModeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(mode => validPriorDeploymentModes.includes(mode as any))

const rawPriorDeploymentOutcomeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(state => validPriorDeploymentOutcomeStates.includes(state as any))

const deploymentAuditPriorEvidenceArraysValid = (audit) =>
  audit != null &&
  rawStringArrayValid(audit.priorRoundIds) &&
  rawStringArrayValid(audit.priorRoundAuditBundleHashes) &&
  rawPriorDeploymentModeArrayValid(audit.priorRoundDeploymentModes) &&
  rawStringArrayValid(audit.priorRoundPaymentReconciliationPathHashes) &&
  rawPriorDeploymentOutcomeArrayValid(audit.priorRoundOutcomeStates) &&
  audit.priorRoundIds.length > 0 &&
  audit.priorRoundIds.length === audit.priorRoundAuditBundleHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundDeploymentModes.length &&
  audit.priorRoundIds.length === audit.priorRoundPaymentReconciliationPathHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundOutcomeStates.length &&
  new Set(audit.priorRoundIds).size === audit.priorRoundIds.length &&
  !audit.priorRoundIds.includes(audit.roundId) &&
  audit.priorRoundAuditBundleHashes.every(isCanonicalHash) &&
  audit.priorRoundPaymentReconciliationPathHashes.every(isCanonicalHash) &&
  audit.priorRoundOutcomeStates.every(state => state === "passed")

const canonicalDeploymentPriorEvidence = (audit) =>
  deploymentAuditPriorEvidenceArraysValid(audit)
    ? audit.priorRoundIds
        .map((priorRoundId, index) => ({
          priorRoundId,
          priorRoundAuditBundleHash: audit.priorRoundAuditBundleHashes[index],
          priorRoundDeploymentMode: audit.priorRoundDeploymentModes[index],
          priorRoundPaymentReconciliationPathHash: audit.priorRoundPaymentReconciliationPathHashes[index],
          priorRoundOutcomeState: audit.priorRoundOutcomeStates[index],
        }))
        .sort((a, b) =>
          a.priorRoundId === b.priorRoundId
            ? a.priorRoundAuditBundleHash === b.priorRoundAuditBundleHash
              ? a.priorRoundDeploymentMode.localeCompare(b.priorRoundDeploymentMode)
              : a.priorRoundAuditBundleHash.localeCompare(b.priorRoundAuditBundleHash)
            : a.priorRoundId.localeCompare(b.priorRoundId)
        )
    : []

const deploymentAuditKindTargetAndEvidenceCoherent = (audit) =>
  audit != null &&
  (
    audit.targetDeploymentMode === "capped_pilot"
      ? audit.auditKind === "shadow_to_pilot" &&
        audit.priorRoundDeploymentModes.every(mode => mode === "shadow")
      : audit.targetDeploymentMode === "full" &&
        (
          (
            audit.auditKind === "pilot_to_full" &&
            audit.priorRoundDeploymentModes.every(mode => mode === "capped_pilot") &&
            audit.priorRoundPaymentReconciliationPathHashes.every(
              hash => hash === audit.paymentReconciliationPathHash
            )
          ) ||
          (
            audit.auditKind === "shadow_or_pilot_to_full" &&
            audit.priorRoundDeploymentModes.some((mode, index) =>
              mode === "capped_pilot" &&
              audit.priorRoundPaymentReconciliationPathHashes[index] === audit.paymentReconciliationPathHash
            ) &&
            audit.priorRoundDeploymentModes.every(mode =>
              mode === "shadow" || mode === "capped_pilot"
            )
          )
        )
  )

const deploymentAuditBindingHashValid = (audit) =>
  audit != null &&
  isNonEmptyString(audit.id) &&
  isNonEmptyString(audit.roundId) &&
  validDeploymentAuditKinds.includes(audit.auditKind as any) &&
  ["capped_pilot", "full"].includes(audit.targetDeploymentMode as any) &&
  audit.auditState === "passed" &&
  isNonEmptyString(audit.calculationVersion) &&
  isCanonicalHash(audit.rulebookHash) &&
  isCanonicalHash(audit.feePolicyHash) &&
  isCanonicalHash(audit.sponsorPoolSourceHash) &&
  isCanonicalHash(audit.paymentReconciliationPathHash) &&
  isCanonicalHash(audit.optimizationPolicyHash) &&
  ["ilp", "deterministic_greedy"].includes(audit.solverMode as any) &&
  isNonEmptyString(audit.solverVersion) &&
  deploymentAuditPriorEvidenceArraysValid(audit) &&
  deploymentAuditKindTargetAndEvidenceCoherent(audit) &&
  isNonEmptyString(audit.auditorId) &&
  isCanonicalUtcTimestamp(audit.createdAt) &&
  isCanonicalHash(audit.auditHash) &&
  audit.auditHash === sha256(canonicalJson({
    id: audit.id,
    roundId: audit.roundId,
    auditKind: audit.auditKind,
    targetDeploymentMode: audit.targetDeploymentMode,
    auditState: audit.auditState,
    calculationVersion: audit.calculationVersion,
    rulebookHash: audit.rulebookHash,
    feePolicyHash: audit.feePolicyHash,
    sponsorPoolSourceHash: audit.sponsorPoolSourceHash,
    paymentReconciliationPathHash: audit.paymentReconciliationPathHash,
    optimizationPolicyHash: audit.optimizationPolicyHash,
    solverMode: audit.solverMode,
    solverVersion: audit.solverVersion,
    priorEvidence: canonicalDeploymentPriorEvidence(audit),
    auditorId: audit.auditorId,
    createdAt: audit.createdAt,
  }))

const deploymentAuditEligibleForCurrentRound = (targetDeploymentMode) =>
  round.deploymentAuditState === "passed" &&
  round.deploymentAuditId != null &&
  deploymentAudit != null &&
  deploymentAudit.id === round.deploymentAuditId &&
  deploymentAudit.auditHash === round.deploymentAuditHash &&
  deploymentAudit.roundId === round.id &&
  deploymentAudit.targetDeploymentMode === targetDeploymentMode &&
  deploymentAudit.calculationVersion === round.calculationVersion &&
  deploymentAudit.rulebookHash === round.rulebookHash &&
  deploymentAudit.feePolicyHash === round.feePolicyHash &&
  deploymentAudit.sponsorPoolSourceHash === round.sponsorPoolSourceHash &&
  deploymentAudit.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  deploymentAudit.optimizationPolicyHash === round.optimizationPolicyHash &&
  timestampLte(deploymentAudit.createdAt, round.parametersFrozenAt) &&
  deploymentAuditBindingHashValid(deploymentAudit)

const cappedPilotDeploymentAuditEligible =
  (
    round.deploymentAuditState === "not_required" &&
    round.deploymentAuditId == null &&
    round.deploymentAuditHash == null
  ) || deploymentAuditEligibleForCurrentRound("capped_pilot")

const fullDeploymentAuditEligible =
  deploymentAuditEligibleForCurrentRound("full")

const deploymentPilotCapFieldsModeCompatible =
  round.deploymentMode === "capped_pilot"
    ? isPositiveIntegerCents(round.pilotMaxRoundGrossExposureCents) &&
      isPositiveIntegerCents(round.pilotMaxParticipantGrossExposureCents)
    : round.pilotMaxRoundGrossExposureCents == null &&
      round.pilotMaxParticipantGrossExposureCents == null

const roundDeploymentModeEligible =
  validDeploymentModes.includes(round.deploymentMode as any) &&
  deploymentPilotCapFieldsModeCompatible &&
  (
    (
      round.deploymentMode === "shadow" &&
      round.deploymentAuditState === "not_required" &&
      round.deploymentAuditId == null &&
      round.deploymentAuditHash == null
    ) ||
    (
      round.deploymentMode === "capped_pilot" &&
      cappedPilotDeploymentAuditEligible
    ) ||
    (
      round.deploymentMode === "full" &&
      fullDeploymentAuditEligible
    )
  )

const roundRulebookAndFreezeEligible =
  roundTimelineValid &&
  roundStatusEligible &&
  roundDeploymentModeEligible &&
  isCanonicalHash(round.rulebookHash) &&
  isCanonicalHash(round.sponsorPoolSourceHash) &&
  isCanonicalHash(round.paymentReconciliationPathHash) &&
  isCanonicalHash(round.optimizationPolicyHash) &&
  isNonEmptyString(round.calculationVersion) &&
  isNonEmptyString(round.failureBonusPolicyVersion) &&
  isNonEmptyString(round.feePolicyVersion) &&
  isCanonicalHash(round.feePolicyHash) &&
  isCanonicalUtcTimestamp(round.parametersFrozenAt) &&
  timestampLte(round.parametersFrozenAt, round.opensAt)

const roundClearingInputBundleEligible =
  roundClearingInputBundle != null &&
  roundRulebookAndFreezeEligible &&
  roundClearingInputBundle.id === round.clearingInputBundleId &&
  roundClearingInputBundle.roundId === round.id &&
  roundClearingInputBundle.rulebookHash === round.rulebookHash &&
  roundClearingInputBundle.feePolicyVersion === round.feePolicyVersion &&
  roundClearingInputBundle.feePolicyHash === round.feePolicyHash &&
  roundClearingInputBundle.deploymentMode === round.deploymentMode &&
  roundClearingInputBundle.pilotMaxRoundGrossExposureCents === (round.pilotMaxRoundGrossExposureCents ?? null) &&
  roundClearingInputBundle.pilotMaxParticipantGrossExposureCents === (round.pilotMaxParticipantGrossExposureCents ?? null) &&
  roundClearingInputBundle.deploymentAuditState === round.deploymentAuditState &&
  roundClearingInputBundle.deploymentAuditId === (round.deploymentAuditId ?? null) &&
  roundClearingInputBundle.deploymentAuditHash === (round.deploymentAuditHash ?? null) &&
  roundClearingInputBundle.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  roundClearingInputBundle.optimizationPolicyHash === round.optimizationPolicyHash &&
  roundClearingInputBundle.calculationVersion === round.calculationVersion &&
  roundClearingInputBundle.snapshotKind === "round_close" &&
  timestampEquals(roundClearingInputBundle.sourceCutoffAt, round.closesAt) &&
  roundClearingInputBundle.bundleHash === round.clearingInputBundleHash &&
  roundClearingInputBundleBindingHashValid(roundClearingInputBundle) &&
  isCanonicalHash(roundClearingInputBundle.canonicalInputJsonHash) &&
  isCanonicalHash(roundClearingInputBundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(roundClearingInputBundle.supportStanceInputHash) &&
  isCanonicalHash(roundClearingInputBundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(roundClearingInputBundle.identityEligibilityInputHash) &&
  isCanonicalHash(roundClearingInputBundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(roundClearingInputBundle.feeInputHash) &&
  isCanonicalHash(roundClearingInputBundle.deploymentExposureInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectEligibilitySnapshotHash) &&
  roundClearingInputBundle.sponsorCommitmentInputHash === round.sponsorPoolSourceHash &&
  isCanonicalHash(roundClearingInputBundle.sponsorCommitmentInputHash) &&
  roundClearingInputBundle.moralBucketSnapshotId === round.moralBucketSnapshotId &&
  roundClearingInputBundle.moralBucketSnapshotHash === round.moralBucketSnapshotHash &&
  isCanonicalHash(roundClearingInputBundle.moralBucketSnapshotHash)

const roundDonorCountedCapCents =
  isNonNegativeIntegerCents(round.donorCountedCapCents)
    ? round.donorCountedCapCents
    : 0

const defaultSupporterCountMinNetPublicGoodCents = 100

const supporterCountMinNetPublicGoodCents =
  isPositiveIntegerCents(round.supporterCountMinNetPublicGoodCents) &&
  round.supporterCountMinNetPublicGoodCents >= defaultSupporterCountMinNetPublicGoodCents
    ? round.supporterCountMinNetPublicGoodCents
    : defaultSupporterCountMinNetPublicGoodCents

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const identityWeightMinForCountingBps =
  failClosedIdentityThresholdBps(round.identityWeightMinForCountingBps)

const identityWeightMinForBonusBps =
  failClosedIdentityThresholdBps(round.identityWeightMinForBonusBps)

const commonGroundBudgetId =
  commonGroundBudget?.id ?? null

const commonGroundBudgetParticipantId =
  commonGroundBudget?.participantId ?? null

const bundleCommonGroundBudgetRowCount =
  isNonEmptyString(commonGroundBudgetId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndBudgetId[
        round.id
      ]?.[commonGroundBudgetId] ?? 0
    : 0

const bundleCommonGroundBudgetParticipantRowCount =
  isNonEmptyString(commonGroundBudgetParticipantId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : 0

const commonGroundBudgetRowUnique =
  bundleCommonGroundBudgetRowCount === 1 &&
  bundleCommonGroundBudgetParticipantRowCount === 1

const commonGroundBudgetRowEligible =
  commonGroundBudget != null &&
  commonGroundBudgetRowUnique &&
  commonGroundBudget.roundId === round.id &&
  isNonEmptyString(commonGroundBudgetId) &&
  isNonEmptyString(commonGroundBudgetParticipantId)

const safeCommonGroundBudgetTotalCents =
  isPositiveIntegerCents(commonGroundBudget?.totalBudgetCents)
    ? commonGroundBudget?.totalBudgetCents ?? 0
    : 0

const safeCommonGroundBudgetPerProjectCapCents =
  isNonNegativeIntegerCents(commonGroundBudget?.perProjectCapCents)
    ? commonGroundBudget?.perProjectCapCents ?? 0
    : 0

const commonGroundBudgetCapsValid =
  commonGroundBudgetRowEligible &&
  safeCommonGroundBudgetTotalCents > 0 &&
  isNonNegativeIntegerCents(safeCommonGroundBudgetPerProjectCapCents)

const validBudgetPeriods = ["one_time", "per_round", "monthly"] as const

const budgetPeriodEligible =
  commonGroundBudgetRowEligible &&
  validBudgetPeriods.includes(commonGroundBudget?.budgetPeriod as any)

const recurringBudgetConsentEligible =
  commonGroundBudgetRowEligible &&
  (
    commonGroundBudget?.budgetPeriod === "one_time" ||
    (
      ["per_round", "monthly"].includes(commonGroundBudget?.budgetPeriod as any) &&
      isNonEmptyString(commonGroundBudget?.recurringConsentVersion) &&
      isCanonicalUtcTimestamp(commonGroundBudget?.nextCaptureAt) &&
      isNonEmptyString(commonGroundBudget?.nextCaptureRule)
    )
  )

const budgetFallbackRuleEligible =
  commonGroundBudgetRowEligible &&
  ["refund", "reroute", "carry_forward", "release_hold"].includes(
    commonGroundBudget?.fallbackRule as any
  )

const projectId =
  project?.id ?? null

const projectBucketId =
  project?.bucketId ?? null

const bundleProjectRowCount =
  isNonEmptyString(projectId)
    ? bundleDerivedProjectRowCountByRoundAndProjectId[
        round.id
      ]?.[projectId] ?? 0
    : 0

const projectRowUnique =
  bundleProjectRowCount === 1

const projectRowEligible =
  project != null &&
  projectRowUnique &&
  project.roundId === round.id &&
  isNonEmptyString(projectId) &&
  isNonEmptyString(projectBucketId)

const bundleSelectedSupportStanceRowCount =
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  commonGroundBudgetId != null &&
  projectId != null
    ? bundleDerivedSupportStanceRowCountByRoundBudgetAndProjectId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId] ?? 0
    : 0

const supportStanceRowUnique =
  supportStance == null
    ? bundleSelectedSupportStanceRowCount === 0
    : bundleSelectedSupportStanceRowCount === 1

const supportStanceRowEligible =
  supportStance == null
    ? supportStanceRowUnique
    : supportStanceRowUnique &&
      commonGroundBudgetRowEligible &&
      projectRowEligible &&
      isNonEmptyString(supportStance.id) &&
      supportStance.commonGroundBudgetId === commonGroundBudgetId &&
      supportStance.roundId === round.id &&
      supportStance.participantId === commonGroundBudgetParticipantId &&
      supportStance.projectId === projectId

const validStances = ["strong", "weak", "dissent", "abstain"] as const

const supportStanceInputEligible =
  supportStanceRowEligible &&
  supportStance != null

const effectiveStance =
  supportStanceInputEligible &&
  validStances.includes(supportStance.stance as any)
    ? supportStance.stance
    : "abstain"

const acceptableCounterBucketIdsFromStance =
  supportStanceInputEligible
    ? stringArrayOrEmpty(supportStance.acceptableCounterBucketIds)
    : []

const rawSupportStanceMaxAllocCents =
  supportStanceInputEligible
    ? supportStance.maxAllocCents
    : 0

const supportStanceMaxAllocCents =
  isNonNegativeIntegerCents(rawSupportStanceMaxAllocCents)
    ? rawSupportStanceMaxAllocCents
    : 0

const supportStanceMaxAllocBps =
  supportStanceInputEligible
    ? normalizeBps(supportStance.maxAllocBps ?? null)
    : null

const supportStanceCapsValid =
  supportStanceInputEligible &&
  isNonNegativeIntegerCents(supportStanceMaxAllocCents) &&
  (supportStance.maxAllocBps == null || isValidBps(supportStance.maxAllocBps, 10_000))

const identityEligibilityRow = identityEligibility ?? null

const bundleIdentityEligibilityRowCount =
  commonGroundBudgetRowEligible && commonGroundBudgetParticipantId != null
    ? bundleDerivedIdentityEligibilityRowCountByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : 0

const identityEligibilityRowUnique =
  bundleIdentityEligibilityRowCount === 1

const identityWeightBps =
  identityWeightBpsOrZero(identityEligibilityRow?.countedWeightBps)

const identityEligibilityRowEligible =
  commonGroundBudgetRowEligible &&
  identityEligibilityRowUnique &&
  identityEligibilityRow != null &&
  identityEligibilityRow.participantId === commonGroundBudgetParticipantId &&
  identityEligibilityRow.roundId === round.id

const identityCountingClear =
  identityEligibilityRowEligible &&
  identityEligibilityRow.humanVerified === true &&
  identityEligibilityRow.sybilRiskState === "clear" &&
  identityEligibilityRow.collusionRiskState === "clear"

const countingEligible =
  identityCountingClear &&
  identityWeightBps >= identityWeightMinForCountingBps

const bonusEligible =
  identityCountingClear &&
  identityWeightBps >= identityWeightMinForBonusBps

const supportStanceBpsCapCents =
  supportStanceMaxAllocBps == null
    ? supportStanceMaxAllocCents
    : floorMulDivNonNegative(safeCommonGroundBudgetTotalCents, supportStanceMaxAllocBps, 10_000)

const stanceCap = min(
  supportStanceMaxAllocCents,
  supportStanceBpsCapCents
)

const roundClosePaymentCommitmentSnapshotRowCount =
  commonGroundBudgetRowEligible && commonGroundBudgetId != null
    ? bundleDerivedPaymentCommitmentSnapshotRowCountByRoundBudgetAndKind[
        round.id
      ]?.[commonGroundBudgetId]?.round_close ?? 0
    : 0

const roundClosePaymentCommitmentSnapshotUnique =
  roundClosePaymentCommitmentSnapshotRowCount === 1

const roundClosePaymentCommitmentSnapshot =
  roundClosePaymentCommitmentSnapshotUnique &&
  commonGroundBudgetRowEligible && commonGroundBudgetId != null
    ? paymentCommitmentSnapshotByRoundBudgetAndKind[
        round.id
      ]?.[commonGroundBudgetId]?.round_close
    : null

const paymentCommitmentEligible =
  roundClosePaymentCommitmentSnapshotUnique &&
  roundClosePaymentCommitmentSnapshot != null &&
  roundClosePaymentCommitmentSnapshot.snapshotKind === "round_close" &&
  roundClosePaymentCommitmentSnapshot.roundId === round.id &&
  roundClosePaymentCommitmentSnapshot.participantId === commonGroundBudgetParticipantId &&
  roundClosePaymentCommitmentSnapshot.commonGroundBudgetId === commonGroundBudgetId &&
  roundClosePaymentCommitmentSnapshot.rulebookHash === round.rulebookHash &&
  timestampEquals(roundClosePaymentCommitmentSnapshot.asOf, round.closesAt) &&
  isNonEmptyString(roundClosePaymentCommitmentSnapshot.paymentMethodRef) &&
  timestampLte(roundClosePaymentCommitmentSnapshot.paymentMethodSavedAt, round.closesAt) &&
  roundClosePaymentCommitmentSnapshot.paymentMethodCommitmentState === "provider_confirmed" &&
  timestampLte(roundClosePaymentCommitmentSnapshot.paymentMethodConfirmedAt, round.closesAt) &&
  paymentCommitmentSnapshotBindingHashValid(roundClosePaymentCommitmentSnapshot)

const paymentCommitmentRequirementSatisfied =
  round.deploymentMode === "shadow" || paymentCommitmentEligible

const budgetEligible =
  roundClearingInputBundleEligible &&
  commonGroundBudgetRowEligible &&
  commonGroundBudgetCapsValid &&
  budgetPeriodEligible &&
  recurringBudgetConsentEligible &&
  budgetFallbackRuleEligible &&
  commonGroundBudget?.state === "active" &&
  commonGroundBudget?.canceledAt == null &&
  safeCommonGroundBudgetTotalCents > 0 &&
  commonGroundBudget?.rulebookHashAtConsent === round.rulebookHash &&
  paymentCommitmentRequirementSatisfied

const conditionalIntentAcceptableCounterBucketIds =
  stringArrayOrEmpty(conditionalTradeIntent?.acceptableCounterBucketIds)

const conditionalIntentMinCounterpartyVolumeCents =
  isPositiveIntegerCents(conditionalTradeIntent?.minCounterpartyVolumeCents)
    ? conditionalTradeIntent.minCounterpartyVolumeCents
    : 0

const conditionalIntentAmountCents =
  isPositiveIntegerCents(conditionalTradeIntent?.amountCents)
    ? conditionalTradeIntent.amountCents
    : 0

const conditionalIntentMaxExposureCents =
  isPositiveIntegerCents(conditionalTradeIntent?.maxExposureCents)
    ? conditionalTradeIntent.maxExposureCents
    : 0

const validConditionalIntentAuthorizationStates = [
  "none",
  "payment_method_saved",
  "authorized",
] as const

const validFallbackRules = [
  "refund",
  "reroute",
  "carry_forward",
  "release_hold",
] as const

const conditionalIntentAuthorizationStateEligible =
  validConditionalIntentAuthorizationStates.includes(
    conditionalTradeIntent?.authorizationState as any
  )

const conditionalIntentFallbackRuleEligible =
  validFallbackRules.includes(conditionalTradeIntent?.fallbackRule as any)

const budgetAndIntentFallbackRuleConsistent =
  budgetFallbackRuleEligible &&
  conditionalIntentFallbackRuleEligible &&
  commonGroundBudget?.fallbackRule === conditionalTradeIntent?.fallbackRule

const bundleClearingEligibleConditionalIntentRowCount =
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  commonGroundBudgetId != null &&
  projectId != null
    ? bundleDerivedClearingEligibleConditionalIntentRowCountByRoundBudgetAndProjectId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId] ?? 0
    : 0

const conditionalIntentRowEligible =
  bundleClearingEligibleConditionalIntentRowCount === 1 &&
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  conditionalTradeIntent != null &&
  isNonEmptyString(conditionalTradeIntent.id) &&
  conditionalTradeIntent.commonGroundBudgetId === commonGroundBudgetId &&
  conditionalTradeIntent.roundId === round.id &&
  conditionalTradeIntent.projectId === projectId &&
  conditionalTradeIntent.participantId === commonGroundBudgetParticipantId

const conditionalIntentEligible =
  conditionalIntentRowEligible &&
  conditionalTradeIntent.state === "active" &&
  conditionalIntentAuthorizationStateEligible &&
  conditionalIntentFallbackRuleEligible &&
  budgetAndIntentFallbackRuleConsistent &&
  conditionalTradeIntent.rulebookHashAtConsent === round.rulebookHash &&
  conditionalIntentAmountCents > 0 &&
  conditionalIntentMaxExposureCents > 0 &&
  conditionalIntentMinCounterpartyVolumeCents > 0 &&
  conditionalIntentAcceptableCounterBucketIds.length > 0

const roundMoralBucketSnapshotEligible =
  roundMoralBucketSnapshot != null &&
  roundMoralBucketSnapshot.id === round.moralBucketSnapshotId &&
  roundMoralBucketSnapshot.roundId === round.id &&
  roundMoralBucketSnapshot.rulebookHash === round.rulebookHash &&
  roundMoralBucketSnapshot.snapshotHash === round.moralBucketSnapshotHash &&
  roundMoralBucketSnapshotBindingHashValid(roundMoralBucketSnapshot) &&
  roundMoralBucketSnapshotGraphWellFormed(roundMoralBucketSnapshot) &&
  timestampLte(roundMoralBucketSnapshot.createdAt, round.parametersFrozenAt) &&
  roundMoralBucketSnapshot.asymmetricPairCount === 0

const projectBucketIdForCounterpartyValidation =
  projectRowEligible ? projectBucketId : null

const projectBucketInFrozenSnapshot =
  roundMoralBucketSnapshotEligible &&
  projectBucketIdForCounterpartyValidation != null &&
  roundMoralBucketSnapshot.bucketIds.includes(projectBucketIdForCounterpartyValidation)

const reciprocalDistinctCounterBucketIds =
  projectBucketInFrozenSnapshot
    ? roundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId[
        projectBucketIdForCounterpartyValidation
      ] ?? []
    : []

const validatedCounterBucketIds = conditionalIntentEligible
  ? intersection(
      acceptableCounterBucketIdsFromStance,
      conditionalIntentAcceptableCounterBucketIds,
      reciprocalDistinctCounterBucketIds
    )
  : []

const crossViewIntentEligible =
  conditionalIntentEligible &&
  projectBucketInFrozenSnapshot &&
  validatedCounterBucketIds.length > 0 &&
  conditionalIntentMinCounterpartyVolumeCents > 0

const intentCapCents = crossViewIntentEligible
  ? min(conditionalIntentAmountCents, conditionalIntentMaxExposureCents)
  : 0

const rawParticipantRemainingRoundBudgetCents =
  commonGroundBudgetRowEligible
    ? bundleDerivedRemainingBudgetCentsByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : 0

const participantRemainingRoundBudgetCents =
  isNonNegativeIntegerCents(rawParticipantRemainingRoundBudgetCents)
    ? rawParticipantRemainingRoundBudgetCents
    : 0

const rawProjectRemainingRequestedCapCents =
  projectRowEligible && projectId != null
    ? bundleDerivedRemainingRequestedCapCentsByRoundAndProjectId[
        round.id
      ]?.[projectId] ?? 0
    : 0

const projectRemainingRequestedCapCents =
  isNonNegativeIntegerCents(rawProjectRemainingRequestedCapCents)
    ? rawProjectRemainingRequestedCapCents
    : 0

const rawDeploymentRoundRemainingGrossExposureCents =
  round.deploymentMode === "capped_pilot"
    ? bundleDerivedDeploymentRemainingGrossExposureCentsByRoundId[round.id] ?? 0
    : participantRemainingRoundBudgetCents

const rawDeploymentParticipantRemainingGrossExposureCents =
  round.deploymentMode === "capped_pilot" && commonGroundBudgetParticipantId != null
    ? bundleDerivedDeploymentRemainingGrossExposureCentsByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : participantRemainingRoundBudgetCents

const deploymentRoundRemainingGrossExposureCents =
  isNonNegativeIntegerCents(rawDeploymentRoundRemainingGrossExposureCents)
    ? rawDeploymentRoundRemainingGrossExposureCents
    : 0

const deploymentParticipantRemainingGrossExposureCents =
  isNonNegativeIntegerCents(rawDeploymentParticipantRemainingGrossExposureCents)
    ? rawDeploymentParticipantRemainingGrossExposureCents
    : 0

const pilotConfiguredRoundGrossExposureCapCents =
  round.deploymentMode === "capped_pilot" &&
  isPositiveIntegerCents(round.pilotMaxRoundGrossExposureCents)
    ? round.pilotMaxRoundGrossExposureCents
    : 0

const pilotConfiguredParticipantGrossExposureCapCents =
  round.deploymentMode === "capped_pilot" &&
  isPositiveIntegerCents(round.pilotMaxParticipantGrossExposureCents)
    ? round.pilotMaxParticipantGrossExposureCents
    : 0

const deploymentGrossExposureCapCents =
  round.deploymentMode === "shadow"
    ? participantRemainingRoundBudgetCents
    : round.deploymentMode === "capped_pilot"
      ? min(
          pilotConfiguredRoundGrossExposureCapCents,
          pilotConfiguredParticipantGrossExposureCapCents,
          deploymentRoundRemainingGrossExposureCents,
          deploymentParticipantRemainingGrossExposureCents
        )
      : participantRemainingRoundBudgetCents

const deploymentModeCalculationEligible =
  roundDeploymentModeEligible &&
  deploymentGrossExposureCapCents > 0

const bindingPaymentModeEligible =
  roundDeploymentModeEligible &&
  round.deploymentMode !== "shadow"

const candidateGrossAllocCents =
  budgetEligible && deploymentModeCalculationEligible && projectRowEligible && supportStanceRowEligible && supportStanceCapsValid && crossViewIntentEligible && ["strong", "weak"].includes(effectiveStance)
    ? min(
        participantRemainingRoundBudgetCents,
        deploymentGrossExposureCapCents,
        safeCommonGroundBudgetPerProjectCapCents,
        intentCapCents,
        projectRemainingRequestedCapCents,
        stanceCap
      )
    : 0

const candidateConditionalIntentId =
  conditionalIntentRowEligible ? conditionalTradeIntent.id : null

const bundleFeeQuoteRowCount =
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  candidateConditionalIntentId != null &&
  commonGroundBudgetId != null &&
  projectId != null
    ? bundleDerivedFeeQuoteRowCountByRoundBudgetProjectAndIntentId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId]?.[candidateConditionalIntentId] ?? 0
    : 0

const feeQuoteRowUnique =
  bundleFeeQuoteRowCount === 1

const feeQuote =
  feeQuoteRowUnique &&
  commonGroundBudgetId != null &&
  projectId != null &&
  candidateConditionalIntentId != null
    ? feeQuoteByRoundBudgetProjectAndIntentId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId]?.[candidateConditionalIntentId]
    : null

const feeQuoteEligible =
  candidateGrossAllocCents > 0 &&
  feeQuoteRowUnique &&
  feeQuote != null &&
  feeQuote.roundId === round.id &&
  feeQuote.participantId === commonGroundBudgetParticipantId &&
  feeQuote.commonGroundBudgetId === commonGroundBudgetId &&
  feeQuote.projectId === projectId &&
  feeQuote.conditionalTradeIntentId === candidateConditionalIntentId &&
  feeQuote.rulebookHash === round.rulebookHash &&
  feeQuote.feePolicyVersion === round.feePolicyVersion &&
  feeQuote.feePolicyHash === round.feePolicyHash &&
  (feeQuote.feePayer !== "sponsor_paid" || feeQuote.sponsorFeeBackingHash === round.sponsorPoolSourceHash) &&
  feeQuote.grossCapturedCents === candidateGrossAllocCents &&
  timestampEquals(feeQuote.sourceCutoffAt, round.closesAt) &&
  feeQuoteBindingHashValid(feeQuote)

const bindingFeeQuoteEligible =
  feeQuoteEligible && bindingPaymentModeEligible

const shadowFeeQuoteEligible =
  feeQuoteEligible && round.deploymentMode === "shadow"

const actualAllocCents =
  bindingFeeQuoteEligible ? candidateGrossAllocCents : 0

const grossCapturedCents =
  bindingFeeQuoteEligible ? feeQuote.grossCapturedCents : 0

const feeCents =
  bindingFeeQuoteEligible ? feeQuote.feeCents : 0

const netRecipientDisbursedCents =
  bindingFeeQuoteEligible ? feeQuote.netRecipientDisbursedCents : 0

const publicGoodCreditCents =
  netRecipientDisbursedCents

const shadowPreviewGrossAllocCents =
  shadowFeeQuoteEligible ? candidateGrossAllocCents : 0

const shadowPreviewFeeCents =
  shadowFeeQuoteEligible ? feeQuote.feeCents : 0

const shadowPreviewNetRecipientDisbursedCents =
  shadowFeeQuoteEligible ? feeQuote.netRecipientDisbursedCents : 0

const shadowPreviewPublicGoodCreditCents =
  shadowPreviewNetRecipientDisbursedCents

const countedContributionCents =
  countingEligible && bindingFeeQuoteEligible
    ? floorMulDivNonNegative(min(publicGoodCreditCents, roundDonorCountedCapCents), identityWeightBps, 10_000)
    : 0

const matchEligibleCents =
  bonusEligible &&
  bindingFeeQuoteEligible &&
  identityEligibilityRow?.sybilRiskState === "clear" &&
  identityEligibilityRow?.collusionRiskState === "clear"
    ? min(countedContributionCents, roundDonorCountedCapCents)
    : 0

const verifiedSupporterBreadthEligible =
  countingEligible &&
  bindingFeeQuoteEligible &&
  countedContributionCents > 0 &&
  publicGoodCreditCents >= supporterCountMinNetPublicGoodCents

const activeMoralClusterBreadthEligible =
  verifiedSupporterBreadthEligible

const shadowPreviewCountedContributionCents =
  countingEligible && shadowFeeQuoteEligible
    ? floorMulDivNonNegative(min(shadowPreviewPublicGoodCreditCents, roundDonorCountedCapCents), identityWeightBps, 10_000)
    : 0

const shadowPreviewMatchEligibleCents =
  bonusEligible &&
  shadowFeeQuoteEligible &&
  identityEligibilityRow?.sybilRiskState === "clear" &&
  identityEligibilityRow?.collusionRiskState === "clear"
    ? min(shadowPreviewCountedContributionCents, roundDonorCountedCapCents)
    : 0

const shadowPreviewVerifiedSupporterBreadthEligible =
  countingEligible &&
  shadowFeeQuoteEligible &&
  shadowPreviewCountedContributionCents > 0 &&
  shadowPreviewPublicGoodCreditCents >= supporterCountMinNetPublicGoodCents

const shadowPreviewActiveMoralClusterBreadthEligible =
  shadowPreviewVerifiedSupporterBreadthEligible
```

A paused, expired, canceled, rulebook-mismatched, missing provider-confirmed payment-commitment snapshot in a binding `capped_pilot` or `full` round, missing-or-invalid-frozen-bucket-snapshot, or consent-invalid budget contributes zero in all gross/fee/net-recipient/actual/count/match-eligible accounting channels and must not be routed, authorized, or captured. In `shadow` deployment mode, binding gross/fee/net-recipient/actual/count/match-eligible accounting channels are also zero; any dry-run quantities are written only to `shadowPreview*` channels and never satisfy binding thresholds, counterparty volume, matching, authorization, failure-bonus qualification, payout, or receipts. A missing, inactive, rulebook-mismatched, null, or zero-exposure conditional intent also contributes zero and must not be dereferenced. Settlement previews may display non-binding prospective allocations before payment commitment, but those rows must be labeled as previews and must not count toward thresholds, counterparty volume, matching, failure bonuses, clearing, authorization, or payout. A missing, wrong-round, wrong-project, wrong-participant, or cross-budget support-stance row defaults to abstain and exposes no stance cap, rank-order authority, or acceptable counterparty buckets.

Allowed stances:

```text
strong = allocatable
weak = allocatable
dissent = not allocatable, adds review pressure
abstain = not allocatable
```

Default stance weights are reporting aliases only. Payout-relevant bonus scoring must use the fixed-point `stanceWeightFixedByStance` map in Section 9.2 / Stage 5, not JavaScript-number stance weights.

Store these quantities separately:

```ts
grossCapturedAllocation[userId][projectId] = grossCapturedCents
feeAllocation[userId][projectId] = feeCents
netRecipientAllocation[userId][projectId] = netRecipientDisbursedCents
actualAllocation[userId][projectId] = actualAllocCents
countedContribution[userId][projectId] = countedContributionCents
matchEligibleContribution[userId][projectId] = matchEligibleCents
shadowPreviewGrossAllocation[userId][projectId] = shadowPreviewGrossAllocCents
shadowPreviewFeeAllocation[userId][projectId] = shadowPreviewFeeCents
shadowPreviewNetRecipientAllocation[userId][projectId] = shadowPreviewNetRecipientDisbursedCents
shadowPreviewCountedContribution[userId][projectId] = shadowPreviewCountedContributionCents
shadowPreviewMatchEligibleContribution[userId][projectId] = shadowPreviewMatchEligibleCents
```

The optimizer should maximize:

```text
Primary objective:
  maximize total match-eligible cross-view cleared cents

Secondary objective:
  maximize net recipient-disbursed cents to verified public-good recipients

Tertiary objective:
  maximize number of cleared moral clusters

Quaternary objective:
  maximize weak-support-to-counted-dollar conversion

Guardrail:
  never clear a pledge unless its counterparty constraints are satisfied

Final deterministic tie-breaker:
  among otherwise equal feasible solutions, choose the solution with the lexicographically smallest sorted list of SHA-256 canonical-JSON tie-break tuples over roundId, calculationVersion, participantId, projectId, commonGroundBudgetId, conditionalTradeIntentId, and tieBreakScope = "coalition_router"
```

The optimizer's algorithm identifier, objective ordering, user-rank constraint rule, and final tie-break tuple fields are part of `round.calculationVersion` and the final `calculationHash`. Solver-native arbitrary order, database insertion order, or nondeterministic map iteration must not decide between equal-objective allocations.

A user's allocation to project `p` clears only if:

```ts
const userCounterpartyVolumeCents =
  isNonNegativeIntegerCents(
    counterpartyVolumeCentsByRoundParticipantBudgetProjectIntent[
      round.id
    ]?.[commonGroundBudgetParticipantId]?.[commonGroundBudgetId]?.[projectId]?.[candidateConditionalIntentId]
  )
    ? counterpartyVolumeCentsByRoundParticipantBudgetProjectIntent[
        round.id
      ]?.[commonGroundBudgetParticipantId]?.[commonGroundBudgetId]?.[projectId]?.[candidateConditionalIntentId]
    : 0

const counterpartyConstraintSatisfied =
  crossViewIntentEligible &&
  userCounterpartyVolumeCents >= conditionalIntentMinCounterpartyVolumeCents
```

where `userCounterpartyVolumeCents` is a deterministic derived integer-cent value keyed by current `round.id`, bundle-derived participant, current `CommonGroundBudget.id`, current project, and current `ConditionalTradeIntent.id`. It counts only donor-originated match-eligible cleared dollars in projects whose moral bucket is in `validatedCounterBucketIds`. The threshold on the right side is the locally sanitized active `ConditionalTradeIntent.minCounterpartyVolumeCents`; `ProjectSupportStance.minCounterpartyVolumeCents` is a deprecated mirror and must not be used for final clearing. `validatedCounterBucketIds` must be the intersection of the user's acceptable counterparty buckets, the active conditional intent's acceptable counterparty buckets, and the bundle-derived project bucket's reciprocally validated distinct bucket set from the frozen `RoundMoralBucketSnapshot`.

`userCounterpartyVolumeCents` must exclude sponsor funds, platform funds, the participant's own contributions, linked accounts, same-payment-method accounts, same-payment-method clusters, same-control entities, and any account cluster under active sybil/collusion review. A user cannot satisfy their own moral-trade condition by splitting one budget across multiple buckets.

Verified supporter counts and active moral-cluster counts are computed from positive `countedContributionCents` only when the same donor row has at least `supporterCountMinNetPublicGoodCents` of net recipient-disbursed public-good credit after identity, sybil, collusion, conflict, and self-matching exclusions. Active moral-cluster counts count clusters with at least one such qualifying verified supporter. Sponsor matching and counterparty-volume satisfaction are stricter: they use positive `matchEligibleCents`.

When not all user-approved allocations can clear, the router must respect the user's explicit `rank_order` before using global optimization tie-breakers. The global optimizer may not allocate a lower-ranked weak-support stance ahead of a higher-ranked strong-support stance unless the user explicitly opted into unrestricted coalition routing for that round.

A trade counts as **moral trade** only when the counter-support comes from sufficiently distinct moral buckets.

---

## 9. Matching

### 9.1 Base Match

Base match is precommitted and donor-visible before the round opens.

Default:

```ts
const defaultBaseMatchRatioBps = 10_000 // 1.0x

const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0

const min = (...values: Array<number | null | undefined>) =>
  values.length > 0 &&
  values.every(value => Number.isSafeInteger(value) && value >= 0)
    ? Math.min(...(values as number[]))
    : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const nonNegativeBigIntTerm = (value: unknown) =>
  (typeof value === "bigint" && value >= 0n) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)

const sumBigInt = (values: unknown) =>
  Array.isArray(values) && values.every(nonNegativeBigIntTerm)
    ? values.reduce(
        (total, value) =>
          total + (typeof value === "bigint" ? value : BigInt(value as number)),
        0n
      )
    : 0n

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const normalizeMatchBps = (value: number | null | undefined, fallback: number) =>
  value == null
    ? fallback
    : Number.isSafeInteger(value) && value >= 0 && value <= 100_000
      ? value
      : 0

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)
```

Normalize project-specific basis-point fields before use:

```ts
const baseMatchRatioBps =
  normalizeMatchBps(project.baseMatchRatioBps, defaultBaseMatchRatioBps)
```

For each cleared project, compute the integer-cent claim generated by match-eligible donor dollars:

```ts
baseMatchClaimCents[projectId] =
  floorMulDivNonNegative(matchEligibleClearedCents[projectId], baseMatchRatioBps, 10_000)

const safeBaseMatchClaimCentsForProject = (projectId: string) =>
  Number.isSafeInteger(baseMatchClaimCents[projectId]) &&
  baseMatchClaimCents[projectId] >= 0
    ? baseMatchClaimCents[projectId]
    : 0
```

Base match must not exceed the claim generated by match-eligible dollars. If total base-match claims are zero, allocate zero base match. If the backed base-match pool is sufficient, pay each claim exactly. Prorate only when total claims exceed the backed pool. In the formulas below, `clearedProjectIds` means the deterministic stable-order list of current-round project IDs whose `CoalitionClearanceResult.failureReason === "none"`:

```ts
const baseMatchPoolAvailableCents =
  roundClearingInputBundleEligible
    ? min(roundBaseMatchBudgetCents, sponsorBackedCentsForFinalClearing("base_match"))
    : 0

const sumBaseMatchClaimsForAllClearedProjectsInt =
  sumBigInt(clearedProjectIds.map(projectId => safeBaseMatchClaimCentsForProject(projectId)))

baseMatch[projectId] =
  sumBaseMatchClaimsForAllClearedProjectsInt <= 0n
    ? 0
    : sumBaseMatchClaimsForAllClearedProjectsInt <= BigInt(baseMatchPoolAvailableCents)
      ? safeBaseMatchClaimCentsForProject(projectId)
      : bigIntToSafeCentsOrZero(
          (BigInt(baseMatchPoolAvailableCents) * BigInt(safeBaseMatchClaimCentsForProject(projectId))) /
          sumBaseMatchClaimsForAllClearedProjectsInt
        )
```

Allocate any leftover base-match rounding cents by deterministic stable order using `sha256(canonicalJson({ roundId, projectId, prorationScope: "base_match_rounding" }))`, but never above each project's sanitized base-match claim cents. Include the rounding method in the calculation hash. Any unused backed base-match pool remains unspent or carries forward according to sponsor terms; it is not allocated arbitrarily.

Base match applies only after hard gates pass. Base match is never unlocked by non-verified, over-cap, self-matched, or collusion-discounted contributions, even if those actual dollars are still captured and paid to the recipient.

### 9.2 Capped Diversity-Aware Bonus

Do not use pure QF as the core mechanism. Use QF only as a **secondary, capped, post-clear bonus**.

All QF, entropy, diversity, dissent-pressure, collusion-discount, and adjusted-score arithmetic used for bonus allocation must be deterministic. Default current rule: use fixed-point decimal arithmetic with 12 decimal places, round half-even at each named intermediate, serialize intermediate scores as decimal strings, and use quantized integer score units for bonus-proration inputs. The exact precision, rounding mode, and score serialization are part of `round.calculationVersion` and the calculation hash. Do not allocate bonus cents from unrounded implementation-dependent floating-point values.

Use these fixed-point constants before any bonus-score formula below:

```ts
const alphaFixed = "0.200000000000"
const betaFixed = "0.200000000000"
const gammaFixed = "0.500000000000"
const weakWeightFixed = "0.600000000000"
const strongWeightFixed = "1.000000000000"
const dissentWeightFixed = "0.000000000000"
const abstainWeightFixed = "0.000000000000"
```

Raw score uses stance-weighted match-eligible contributions consistently as the effective contribution input. Derive fixed-point stance weights from the frozen effective stance, not from mutable live stance records:

```ts
const stanceWeightFixedByStance = {
  strong: "1.000000000000",
  weak: "0.600000000000",
  dissent: "0.000000000000",
  abstain: "0.000000000000",
} as const

stanceWeightFixed[userId][projectId] =
  stanceWeightFixedByStance[
    effectiveStanceByUserProject[userId][projectId] ?? "abstain"
  ]

effectiveMatchEligibleContributionFixed[userId][projectId] =
  fixedMultiply(
    integerCentsToFixed(matchEligibleContribution[userId][projectId], 12),
    stanceWeightFixed[userId][projectId],
    12
  )

sqrtEffectiveMatchEligibleContributionFixed[userId][projectId] =
  fixedSqrt(effectiveMatchEligibleContributionFixed[userId][projectId], 12)

sumSqrtEffectiveFixed[projectId] =
  fixedSumUsers(sqrtEffectiveMatchEligibleContributionFixed[userId][projectId], 12)

sumEffectiveContributionFixed[projectId] =
  fixedSumUsers(effectiveMatchEligibleContributionFixed[userId][projectId], 12)

qfRawFixed[projectId] =
  fixedMax(
    "0.000000000000",
    fixedSubtract(
      fixedSquare(sumSqrtEffectiveFixed[projectId], 12),
      sumEffectiveContributionFixed[projectId],
      12
    )
  )

qfRaw[projectId] =
  fixedToReportingNumber(qfRawFixed[projectId]) // reporting alias only
```

Diversity factor. Before computing payout-relevant dissent pressure, derive `verifiedClearDissentCountByProjectId` from immutable bundle-derived dissent stances only when the participant's identity row is human-verified, sybil-clear, collusion-clear, and unique after linked-account, same-payment-method / same-payment-cluster, and same-control clustering. Other dissent notes may route to manual review or challenge queues, but they do not reduce bonus payouts.

```ts
const clusterShareDistributionValid =
  isValidFixedProbabilityDistribution(clusterShareDistribution[projectId])

clusterDiversityFixed[projectId] =
  clusterShareDistributionValid
    ? fixedNormalizedEntropy(clusterShareDistribution[projectId], 12)
    : "0.000000000000"

const safeReviewPressureThreshold =
  Number.isSafeInteger(reviewPressureThreshold) && reviewPressureThreshold > 0
    ? reviewPressureThreshold
    : 1

const safeDissentCount =
  Number.isSafeInteger(verifiedClearDissentCountByProjectId[projectId]) &&
  verifiedClearDissentCountByProjectId[projectId] >= 0
    ? verifiedClearDissentCountByProjectId[projectId]
    : 0

dissentPressureFixed[projectId] =
  fixedMin(
    "1.000000000000",
    fixedDivide(integerToFixed(safeDissentCount, 12), integerToFixed(safeReviewPressureThreshold, 12), 12)
  )

diversityFactorFixed[projectId] =
  fixedClamp(
    fixedSubtract(
      fixedAdd("1.000000000000", fixedMultiply(alphaFixed, clusterDiversityFixed[projectId], 12), 12),
      fixedMultiply(betaFixed, dissentPressureFixed[projectId], 12),
      12
    ),
    "0.750000000000",
    "1.250000000000"
  )

diversityFactor[projectId] =
  fixedToReportingNumber(diversityFactorFixed[projectId]) // reporting alias only
```

Bonus-cap basis-point default. Use the fixed-point alpha/beta/gamma/stance-weight constants defined above; do not redeclare them in the same implementation scope:

```ts
const defaultBonusCapMultipleBps = 10_000 // 1.0x
```

Normalize project-specific bonus-cap basis points before use:

```ts
const bonusCapMultipleBps =
  normalizeMatchBps(project.bonusCapMultipleBps, defaultBonusCapMultipleBps)
```

Anti-manipulation discount:

```ts
const safeCollusionRiskScoreFixed =
  fixedIsInRange(collusionRiskScoreFixed[projectId], "0.000000000000", "1.000000000000", 12)
    ? collusionRiskScoreFixed[projectId]
    : "1.000000000000"

antiManipulationDiscountFixed[projectId] =
  fixedClamp(
    fixedSubtract("1.000000000000", fixedMultiply(gammaFixed, safeCollusionRiskScoreFixed, 12), 12),
    "0.000000000000",
    "1.000000000000"
  )

antiManipulationDiscount[projectId] =
  fixedToReportingNumber(antiManipulationDiscountFixed[projectId]) // reporting alias only
```

Adjusted score and quantized bonus-score units:

```ts
qfAdjustedFixed[projectId] =
  fixedMax(
    "0.000000000000",
    fixedMultiply(
      fixedMultiply(qfRawFixed[projectId], diversityFactorFixed[projectId], 12),
      antiManipulationDiscountFixed[projectId],
      12
    )
  )

bonusScoreUnits[projectId] =
  decimalFixedToCanonicalNonNegativeIntegerString(qfAdjustedFixed[projectId], 12)

const isCanonicalNonNegativeIntegerString = (value: unknown) =>
  typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)

const canonicalNonNegativeIntegerStringToBigIntOrZero = (value: unknown) =>
  isCanonicalNonNegativeIntegerString(value) ? BigInt(value as string) : 0n

bonusScoreUnitsInt[projectId] =
  canonicalNonNegativeIntegerStringToBigIntOrZero(bonusScoreUnits[projectId])
```

Bonus allocation uses deterministic capped proration over quantized score units, not floating-point adjusted scores. If all adjusted bonus-score units are zero, allocate zero bonus rather than dividing by zero:

```ts
const bonusPoolAvailableCents =
  roundClearingInputBundleEligible
    ? min(roundBonusBudgetCents, sponsorBackedCentsForFinalClearing("bonus_match"))
    : 0

bonusCapCents[projectId] =
  floorMulDivNonNegative(matchEligibleClearedCents[projectId], bonusCapMultipleBps, 10_000)

const safeBonusScoreUnitsIntForProject = (projectId: string) =>
  typeof bonusScoreUnitsInt[projectId] === "bigint" && bonusScoreUnitsInt[projectId] >= 0n
    ? bonusScoreUnitsInt[projectId]
    : 0n

const safeBonusCapCentsForProject = (projectId: string) =>
  Number.isSafeInteger(bonusCapCents[projectId]) && bonusCapCents[projectId] >= 0
    ? bonusCapCents[projectId]
    : 0

const safeProportionalBonusCentsForProject = (projectId: string) =>
  Number.isSafeInteger(proportionalBonusCents[projectId]) && proportionalBonusCents[projectId] >= 0
    ? proportionalBonusCents[projectId]
    : 0

const sumBonusScoreUnitsForAllClearedProjectsInt =
  sumBigInt(clearedProjectIds.map(projectId => safeBonusScoreUnitsIntForProject(projectId)))

proportionalBonusCents[projectId] =
  sumBonusScoreUnitsForAllClearedProjectsInt <= 0n
    ? 0
    : bigIntToSafeCentsOrZero(
        (BigInt(bonusPoolAvailableCents) * safeBonusScoreUnitsIntForProject(projectId)) /
        sumBonusScoreUnitsForAllClearedProjectsInt
      )

bonusMatch[projectId] =
  min(safeProportionalBonusCentsForProject(projectId), safeBonusCapCentsForProject(projectId))
```

If capped projects leave bonus-pool dollars unallocated, run additional deterministic capped-proration passes among projects with positive remaining cap and positive `bonusScoreUnitsInt` until either the bonus pool is exhausted or no eligible remaining cap exists. If no eligible uncapped project remains, leftover bonus-pool cents remain unspent or carry forward under sponsor terms; they must not be allocated above cap or arbitrarily.

Allocate any leftover bonus-match rounding cents by deterministic stable order using `sha256(canonicalJson({ roundId, projectId, prorationScope: "bonus_match_rounding", cappedProrationPass }))`, but never above sanitized `bonusCapCents[projectId]`. Include the capped-proration pass count, remaining-cap rule, and rounding method in the calculation hash.

---

## 9.5 Contributor-Only Success Rewards and Coordination Credits

The success-reward module is optional. It exists to reduce the ordinary assurance-contract incentive to wait for others to fund the public good. It must not be implemented as a second public-good funding channel or as hidden matching.

### 9.5.1 Incentive target

For a participant with contribution cost `c_i`, value from the public good `V_i`, and signer-only success reward value `s_i`, the success-without-me comparison is:

```text
free-ride: V_i
sign:      V_i - c_i + s_i
```

If the participant values the signer-only reward at least as much as the contribution cost (`s_i >= c_i`), free-riding is no longer better in that state. CRECM may display this as a **dominance target** only when the frozen rulebook and backed `success_reward` pool are sufficient to pay the maximum promised reward liability. Otherwise the platform may display only an “up to” reward estimate.

### 9.5.2 Reward pool and eligibility

Success rewards are separate from base match, bonus match, fee support, and failure bonuses.

```ts
const roundSuccessRewardBudgetCents =
  safeRoundSponsorBudgetCents(round.successRewardBudgetCents)

const safeSuccessRewardRateBps =
  Number.isSafeInteger(round.successRewardRateBps) &&
  round.successRewardRateBps >= 0 &&
  round.successRewardRateBps <= 10_000
    ? round.successRewardRateBps
    : 0

const safeSuccessRewardMaxRateBps =
  Number.isSafeInteger(round.successRewardMaxRateBps) &&
  round.successRewardMaxRateBps >= safeSuccessRewardRateBps &&
  round.successRewardMaxRateBps <= 10_000
    ? round.successRewardMaxRateBps
    : safeSuccessRewardRateBps

const finalSuccessRewardBackingCents =
  roundClearingInputBundleEligible
    ? sponsorBackedCentsForFinalClearing("success_reward")
    : 0

const successRewardPoolAvailableCents =
  finalSuccessRewardBackingCents >= roundSuccessRewardBudgetCents
    ? roundSuccessRewardBudgetCents
    : 0
```

A participant-row can qualify for a success reward only if:

```ts
const contributorSuccessRewardRowEligible =
  round.status === "payable" &&
  successRewardPoolAvailableCents > 0 &&
  commonGroundBudget.successRewardOptIn === true &&
  conditionalTradeIntent.successRewardOptIn === true &&
  identityEligibility.humanVerified === true &&
  identityEligibility.sybilRiskState === "clear" &&
  identityEligibility.collusionRiskState === "clear" &&
  paymentAuthorizationReconciledExact === true &&
  capturedGrossCents[userId][projectId] > 0 &&
  netRecipientDisbursedCents[userId][projectId] > 0 &&
  matchEligibleContribution[userId][projectId] > 0 &&
  projectClearedAndPayable[projectId] === true &&
  claimantConflictStateForSuccessReward[userId][projectId] === "no_conflict" &&
  !sameParticipantOrLinkedOrSamePaymentClusterDuplicateReward(userId, projectId)
```

Success-reward claims are computed from the participant's own captured gross exposure, not from sponsor match or other donors' money:

```ts
successRewardClaimBaseCents[userId][projectId] =
  contributorSuccessRewardRowEligible
    ? min(
        capturedGrossCents[userId][projectId],
        conditionalTradeIntent.maxExposureCents,
        conditionalTradeIntent.amountCents
      )
    : 0

rawSuccessRewardClaimCents[userId][projectId] =
  floorMulDivNonNegative(
    successRewardClaimBaseCents[userId][projectId],
    safeSuccessRewardRateBps,
    10_000
  )
```

If `round.successRewardDominanceMode === "sponsor_backed"`, the platform may set `successRewardRateBps` as high as `10_000` only when the maximum possible liability under all selected eligible intents is fully backed by the frozen `success_reward` pool. If not fully backed, dominance-mode advertising is disabled and the reward rate must be lowered or the round must be re-consented before opening.

If total raw claims exceed the available pool, prorate deterministically using the same exact target-payout arithmetic and stable-order remainder rules used for base-match and failure-bonus proration. Do not advertise `s_i >= c_i` when proration can occur.

### 9.5.3 Coordination credits

Coordination credits are an excludable participation receipt, not an allocation weight.

```ts
coordinationCreditUnits[userId][projectId] =
  contributorSuccessRewardRowEligible && commonGroundBudget.coordinationCreditOptIn === true
    ? matchEligibleContribution[userId][projectId]
    : 0
```

Credits are non-transferable in v1. They may unlock access to future sponsor-funded coordination opportunities, early notification, opt-in recognition, or non-binding advisory channels, but they must never change counted dollars, match-eligible dollars, identity weight, supporter counts, cluster counts, counterparty volume, vote weight, or project-ranking power.

### 9.5.4 Impact certificates

Impact certificates are contributor-only receipts for captured successful net recipient-disbursed public-good funding. They are minted only when `impactCertificateOptIn === true`, after capture and authorization reconciliation, and only for the participant's own eligible contribution row.

```ts
impactCertificateUnits[userId][projectId] =
  contributorSuccessRewardRowEligible && commonGroundBudget.impactCertificateOptIn === true
    ? netRecipientDisbursedCents[userId][projectId]
    : 0
```

No one may buy the same certificate after round close unless they had a locked pre-close intent, provider-confirmed payment snapshot, and captured successful contribution row that would have qualified at close. Certificate sale, transfer, or retroactive funding markets are out of scope for v1 unless a separate rulebook section prevents double-counting and binds sale proceeds, certificate ownership, and impact claims in the audit bundle.

---


## 9.6 Advanced Pivotality Calculator

The Advanced Pivotality Calculator is optional educational tooling. It helps a user reason about threshold funding without exposing live sealed-round state or creating any allocation side effect.

### 9.6.1 Allowed surfaces

The calculator may appear only in:

```text
advanced explainer page
shadow simulation
post-round educational analysis
explicitly labeled project-card educational drawer
```

It must not appear as a required step in the default pledge modal, must not block budget creation, and must not write Common Ground Budget, support-stance, conditional-intent, payment, clearing, matching, reward, credit, certificate, or failure-bonus records.

### 9.6.2 Inputs

All inputs are user-supplied subjective values or static hypothetical values. The calculator must not fill them from live exact round state before close.

```ts
type PivotalityCalculatorInput = {
  contributionCents: number              // x; positive safe integer cents
  thresholdCents: number                 // T; positive safe integer cents
  valueRatio: string                     // r; decimal string >= 0
  pSuccessWithoutMe: string              // p0; decimal string in [0, 1]
  userEstimatedPDecisive: string         // pD; decimal string in [0, 1]
  signerOnlyRewardValue: string          // s; subjective value in units of the user's best alternative use of x; default "0"
  nonDecisiveExtraFundingValueFraction: string // h; default "0"
}
```

Validation:

```text
contributionCents > 0
thresholdCents > 0
valueRatio >= 0
pSuccessWithoutMe in [0, 1]
userEstimatedPDecisive in [0, 1]
pSuccessWithoutMe + userEstimatedPDecisive <= 1
signerOnlyRewardValue >= 0
nonDecisiveExtraFundingValueFraction >= 0
all decimal strings parse under deterministic fixed-point decimal rules
```

`signerOnlyRewardValue` may describe a backed or hypothetical contributor-only reward only as the user's subjective value. If the live round has a capped or prorated success-reward pool, the UX must say "up to" and must not imply dominant-strategy participation unless the maximum possible signer-only reward liability is fully backed under the frozen rulebook.

### 9.6.3 Output formula

Definitions:

```text
x = contributionCents
T = thresholdCents
r = valueRatio
p0 = pSuccessWithoutMe
pD_user = userEstimatedPDecisive
s = signerOnlyRewardValue
h = nonDecisiveExtraFundingValueFraction
```

Simple strict-assurance version, when `s = 0` and `h = 0`:

```text
required_p_decisive = p0 / ((r * T / x) - 1)
```

General success-reward-aware version:

```text
numerator = p0 * (1 - s - h * r)
denominator = r * T / x + s - 1

if numerator <= 0:
  required_p_decisive = 0
else if denominator <= 0:
  required_p_decisive = impossible
else:
  required_p_decisive = max(0, numerator / denominator)
```

The display may also show the equivalent compact form when the denominator is positive:

```text
required_p_decisive = max(0, p_success_without_me * (1 - s - h*r) / (r*T/x + s - 1))
```

Interpretation:

```text
if required_p_decisive is impossible:
  "Under these inputs, being decisive is not enough to make the pledge best by this simplified model."
else if required_p_decisive > 1 - pSuccessWithoutMe:
  "The required decisive probability is impossible under your probability inputs."
else if required_p_decisive <= userEstimatedPDecisive:
  "By your stated values under this simplified model, the pledge beats your alternative use of the money."
else:
  "By your stated values under this simplified model, the pledge does not beat your alternative use of the money."
```

The calculator must always show:

```text
This is a simplified model. It does not use live sealed-round data, does not estimate whether you are actually pivotal, and does not affect your pledge or the round clearing.
```

### 9.6.4 Data isolation

The calculator may run client-side or through a stateless endpoint. It must not accept `roundId`, `projectId`, `participantId`, `commonGroundBudgetId`, `conditionalTradeIntentId`, or any key that would let it query live round progress before close. If post-round analysis uses exact public aggregates, the UI must label them post-close and must not reuse the result for an open round.

## 10. Failure Handling

Failure bonuses must be small, secondary, and not lottery-like.

Default failure handling:

```text
if project fails before capture and round.status === "payable":
  release authorization if any; leave any saved payment method uncaptured and unused
  execute only the bundle-bound fallback rule when the current Common Ground Budget and ConditionalTradeIntent fallback rules match
  otherwise release/cancel/no-capture and require fresh consent before reroute or carry-forward; do not treat this fail-closed path as a user-selected `release_hold` fallback rule
  evaluate threshold-failure bonus eligibility separately
if project fails before capture and round.status !== "payable":
  do not execute fallback routing, reroute, carry-forward, authorization-cancellation/release, failure-bonus claim creation, crediting, or payment side effects from Stage 7
  emit only explicitly non-binding review output or replay/report/audit already-recorded failure-handling outputs
```

Allowed fallback rules:

| Rule | Behavior |
|---|---|
| `refund` | Release hold / do not capture |
| `reroute` | Route to next eligible cleared project within user-approved bucket |
| `carry_forward` | Preserve intent for next round |
| `release_hold` | Cancel authorization entirely |

Optional small failure bonus:

```ts
const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0

const isPositiveIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value > 0

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const min = (...values: Array<number | null | undefined>) =>
  values.length > 0 &&
  values.every(value => Number.isSafeInteger(value) && value >= 0)
    ? Math.min(...(values as number[]))
    : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const nonNegativeBigIntTerm = (value: unknown) =>
  (typeof value === "bigint" && value >= 0n) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)

const sumBigInt = (values: unknown) =>
  Array.isArray(values) && values.every(nonNegativeBigIntTerm)
    ? values.reduce(
        (total, value) =>
          total + (typeof value === "bigint" ? value : BigInt(value as number)),
        0n
      )
    : 0n

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const floorDivNonNegativeByInt = (value: number, divisor: number) =>
  Number.isSafeInteger(value) && value >= 0 &&
  Number.isSafeInteger(divisor) && divisor > 0
    ? bigIntToSafeCentsOrZero(BigInt(value) / BigInt(divisor))
    : 0

const floorDivNonNegativeBigIntByInt = (value: bigint, divisor: number) =>
  value >= 0n &&
  Number.isSafeInteger(divisor) && divisor > 0
    ? bigIntToSafeCentsOrZero(value / BigInt(divisor))
    : 0

const prorateClaimCentsDeterministicallyWithin = (
  rawClaimCentsByClaimId: Record<string, number>,
  capCents: number,
  stableOrderKeyByClaimId: Record<string, string>
) => {
  const inputObjectsEligible =
    rawClaimCentsByClaimId != null &&
    typeof rawClaimCentsByClaimId === "object" &&
    !Array.isArray(rawClaimCentsByClaimId) &&
    stableOrderKeyByClaimId != null &&
    typeof stableOrderKeyByClaimId === "object" &&
    !Array.isArray(stableOrderKeyByClaimId) &&
    isNonNegativeIntegerCents(capCents)

  const claimIds = inputObjectsEligible
    ? Object.keys(rawClaimCentsByClaimId).sort()
    : []

  const mapsEligible =
    inputObjectsEligible &&
    claimIds.every(isNonEmptyString) &&
    claimIds.every(claimId => isNonNegativeIntegerCents(rawClaimCentsByClaimId[claimId])) &&
    claimIds.every(claimId => isCanonicalHash(stableOrderKeyByClaimId[claimId]))

  if (!mapsEligible) return {}

  const totalRawCentsInt =
    sumBigInt(claimIds.map(claimId => rawClaimCentsByClaimId[claimId]))

  const targetPayoutCents =
    bigIntToSafeCentsOrZero(
      totalRawCentsInt > BigInt(capCents)
        ? BigInt(capCents)
        : totalRawCentsInt
    )

  const prorationFactorBps =
    totalRawCentsInt > BigInt(capCents)
      ? bigIntToSafeCentsOrZero((BigInt(capCents) * 10_000n) / totalRawCentsInt)
      : 10_000

  const baseProratedCentsByClaimId =
    Object.fromEntries(
      claimIds.map(claimId => [
        claimId,
        totalRawCentsInt <= 0n
          ? 0
          : bigIntToSafeCentsOrZero(
              (BigInt(rawClaimCentsByClaimId[claimId]) * BigInt(targetPayoutCents)) /
              totalRawCentsInt
            ),
      ])
    )

  const baseProratedSumCents =
    bigIntToSafeCentsOrZero(sumBigInt(Object.values(baseProratedCentsByClaimId)))

  const remainderCents =
    targetPayoutCents >= baseProratedSumCents
      ? targetPayoutCents - baseProratedSumCents
      : 0

  const remainderClaimIds =
    new Set(
      [...claimIds]
        .filter(claimId =>
          baseProratedCentsByClaimId[claimId] < rawClaimCentsByClaimId[claimId]
        )
        .sort((a, b) =>
          stableOrderKeyByClaimId[a].localeCompare(stableOrderKeyByClaimId[b])
        )
        .slice(0, remainderCents)
    )

  return Object.fromEntries(
    claimIds.map(claimId => {
      const baseCents = baseProratedCentsByClaimId[claimId]
      const withRemainderCents =
        remainderClaimIds.has(claimId) && baseCents < Number.MAX_SAFE_INTEGER
          ? baseCents + 1
          : baseCents

      return [
        claimId,
        min(rawClaimCentsByClaimId[claimId], withRemainderCents),
      ]
    })
  )
}

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const totalSponsorBudgetCentsInt =
  BigInt(roundBaseMatchBudgetCents) +
  BigInt(roundBonusBudgetCents) +
  BigInt(roundFailureBonusBudgetCents)

// Equivalent to failure-bonus budget <= 5% of total sponsor budget, without floating-point arithmetic.
const failureBonusBudgetCapValid =
  roundFailureBonusBudgetCents > 0 &&
  totalSponsorBudgetCentsInt > 0n &&
  BigInt(roundFailureBonusBudgetCents) * 20n <= totalSponsorBudgetCentsInt

const failureBonusProvisionalBackingCents =
  failureBonusBundleEligible
    ? sponsorBackedCentsForFinalClearing("failure_bonus")
    : 0

const failureBonusProvisionalClaimFieldMutationEligible =
  round.status === "payable" &&
  failureBonusBundleEligible &&
  failureBonusBudgetCapValid &&
  failureBonusProvisionalBackingCents >= roundFailureBonusBudgetCents &&
  roundFailureBonusBudgetCents > 0

const failedQualifiedMatchEligibleCentsByClaimIdEligible =
  failedQualifiedMatchEligibleCentsByClaimId != null &&
  typeof failedQualifiedMatchEligibleCentsByClaimId === "object" &&
  !Array.isArray(failedQualifiedMatchEligibleCentsByClaimId)

const qualifiedFailureBonusClaimIdsValid =
  Array.isArray(qualifiedFailureBonusClaimIds) &&
  qualifiedFailureBonusClaimIds.every(isNonEmptyString) &&
  new Set(qualifiedFailureBonusClaimIds).size === qualifiedFailureBonusClaimIds.length

const preliminaryFailureBonusClaimFieldMutationClaimStateEligible = (claim) =>
  ["pending", "approved"].includes(claim?.claimState as any) &&
  claim?.payoutRef == null &&
  claim?.resolvedAt == null

const failureBonusClaimThresholdFailureReasonEligible = (reason) =>
  [
    "threshold_amount_shortfall",
    "verified_supporter_shortfall",
    "active_cluster_shortfall",
    "counterparty_volume_shortfall",
  ].includes(reason as any)

const failureBonusClaimEligibilityInputsHashValid = (claim) =>
  claim != null &&
  roundClearingInputBundle != null &&
  isCanonicalHash(claim.eligibilityInputsHash) &&
  claim.eligibilityInputsHash === sha256(canonicalJson({
    roundId: claim.roundId,
    projectId: claim.projectId,
    participantId: claim.participantId,
    commonGroundBudgetId: claim.commonGroundBudgetId,
    failureBonusPolicyVersion: claim.failureBonusPolicyVersion,
    conditionalTradeIntentId: claim.conditionalTradeIntentId,
    claimantProjectConflictSnapshotId: claim.claimantProjectConflictSnapshotId,
    claimantProjectConflictState: claim.claimantProjectConflictState,
    claimantProjectConflictHash: claim.claimantProjectConflictHash,
    claimantProjectConflictSourceCutoffAt: claim.claimantProjectConflictSourceCutoffAt,
    clearingInputBundleHash: claim.clearingInputBundleHash,
    projectRoundEligibilitySnapshotId: claim.projectRoundEligibilitySnapshotId,
    projectRoundEligibilitySnapshotHash: claim.projectRoundEligibilitySnapshotHash,
    paymentCommitmentSnapshotId: claim.paymentCommitmentSnapshotId,
    paymentCommitmentSnapshotHash: claim.paymentCommitmentSnapshotHash,
    earlyFailureBonusCutoff: claim.earlyFailureBonusCutoff,
    projectFailed: true,
    projectFailureReason: claim.failureReason,
    failedQualifiedMatchEligibleCents: claim.failedQualifiedMatchEligibleCents,
  }))

const failureBonusClaimAuditContextEligible = (claim) =>
  claim != null &&
  isNonEmptyString(claim.id) &&
  claim.roundId === round.id &&
  isNonEmptyString(claim.projectId) &&
  isNonEmptyString(claim.participantId) &&
  isNonEmptyString(claim.commonGroundBudgetId) &&
  isNonEmptyString(claim.conditionalTradeIntentId) &&
  isNonEmptyString(claim.claimantProjectConflictSnapshotId) &&
  claim.claimantProjectConflictState === "no_conflict" &&
  isCanonicalHash(claim.claimantProjectConflictHash) &&
  isCanonicalUtcTimestamp(claim.claimantProjectConflictSourceCutoffAt) &&
  timestampEquals(claim.claimantProjectConflictSourceCutoffAt, round.closesAt) &&
  isCanonicalUtcTimestamp(claim.createdAt) &&
  claim.failureBonusPolicyVersion === round.failureBonusPolicyVersion &&
  failureBonusClaimThresholdFailureReasonEligible(claim.failureReason) &&
  isPositiveIntegerCents(claim.failedQualifiedMatchEligibleCents) &&
  isNonEmptyString(claim.projectRoundEligibilitySnapshotId) &&
  isCanonicalHash(claim.projectRoundEligibilitySnapshotHash) &&
  roundClearingInputBundle != null &&
  isNonEmptyString(claim.clearingInputBundleId) &&
  claim.clearingInputBundleId === roundClearingInputBundle.id &&
  claim.clearingInputBundleHash === roundClearingInputBundle.bundleHash &&
  isNonEmptyString(claim.paymentCommitmentSnapshotId) &&
  isCanonicalHash(claim.paymentCommitmentSnapshotHash) &&
  claim.paymentMethodCommitmentState === "provider_confirmed" &&
  isCanonicalUtcTimestamp(claim.paymentMethodSavedAt) &&
  isCanonicalUtcTimestamp(claim.paymentMethodConfirmedAt) &&
  timestampLte(claim.paymentMethodSavedAt, claim.paymentMethodConfirmedAt) &&
  timestampLte(claim.paymentMethodSavedAt, claim.earlyFailureBonusCutoff) &&
  timestampLte(claim.paymentMethodConfirmedAt, claim.earlyFailureBonusCutoff) &&
  timestampEquals(claim.earlyFailureBonusCutoff, round.earlyFailureBonusCutoff) &&
  failureBonusClaimEligibilityInputsHashValid(claim) &&
  claim.denialReason == null

const qualifiedFailureBonusClaimIdsAllCurrentRoundValid =
  qualifiedFailureBonusClaimIdsValid &&
  qualifiedFailureBonusClaimIds.every(claimId =>
    failureBonusClaim[claimId] != null &&
    failureBonusClaim[claimId].id === claimId &&
    failureBonusClaimAuditContextEligible(failureBonusClaim[claimId]) &&
    preliminaryFailureBonusClaimFieldMutationClaimStateEligible(failureBonusClaim[claimId])
  )

const currentRoundQualifiedFailureBonusClaimIds =
  failureBonusProvisionalClaimFieldMutationEligible &&
  qualifiedFailureBonusClaimIdsAllCurrentRoundValid
    ? [...qualifiedFailureBonusClaimIds].sort()
    : []

if (!failureBonusProvisionalClaimFieldMutationEligible) {
  // Do not write rawFailureBonusCents, participantRoundFailureBonusCapCents,
  // or participantCappedProvisionalFailureBonusCents.
  // Released/closed rounds and payable rounds without an available backed pool
  // may only read/report/audit already-recorded preliminary claim fields.
}

const safeFailedQualifiedMatchEligibleCentsForClaim = (claimId: string) => {
  const claim = failureBonusClaim[claimId]
  const externalValue = failedQualifiedMatchEligibleCentsByClaimIdEligible
    ? failedQualifiedMatchEligibleCentsByClaimId[claimId]
    : undefined
  const externalAbsentOrMatches =
    !failedQualifiedMatchEligibleCentsByClaimIdEligible ||
    externalValue == null ||
    externalValue === claim?.failedQualifiedMatchEligibleCents

  return failureBonusClaimAuditContextEligible(claim) &&
    isPositiveIntegerCents(claim?.failedQualifiedMatchEligibleCents) &&
    externalAbsentOrMatches
      ? claim.failedQualifiedMatchEligibleCents
      : 0
}

currentRoundQualifiedFailureBonusClaimIds.forEach(claimId => {
  rawFailureBonusCents[claimId] =
    failureBonusBudgetCapValid
      ? min(500, floorDivNonNegativeByInt(safeFailedQualifiedMatchEligibleCentsForClaim(claimId), 10))
      : 0
  failureBonusClaim[claimId].rawBonusCents = rawFailureBonusCents[claimId]
})

const participantIdsWithQualifiedFailureBonusClaims =
  [...new Set(
    currentRoundQualifiedFailureBonusClaimIds
      .map(claimId => failureBonusClaim[claimId]?.participantId)
      .filter(isNonEmptyString)
  )].sort()

participantIdsWithQualifiedFailureBonusClaims.forEach(participantId => {
  const participantQualifiedClaimIds =
    currentRoundQualifiedFailureBonusClaimIds.filter(
      id => failureBonusClaim[id]?.participantId === participantId
    )

  const totalFailedQualifiedMatchEligibleCentsForParticipantInRoundInt =
    sumBigInt(participantQualifiedClaimIds.map(id => safeFailedQualifiedMatchEligibleCentsForClaim(id)))

  participantRoundFailureBonusCapCents[participantId] =
    failureBonusBudgetCapValid
      ? min(
          500,
          floorDivNonNegativeBigIntByInt(
            totalFailedQualifiedMatchEligibleCentsForParticipantInRoundInt,
            10
          )
        )
      : 0

  const participantRawFailureBonusCentsByClaimId =
    Object.fromEntries(
      participantQualifiedClaimIds.map(id => [
        id,
        isNonNegativeIntegerCents(rawFailureBonusCents[id])
          ? rawFailureBonusCents[id]
          : 0,
      ])
    )

  const participantFailureBonusProrationOrderKeyByClaimId =
    Object.fromEntries(
      participantQualifiedClaimIds.map(id => [
        id,
        sha256(canonicalJson({
          roundId: round.id,
          participantId,
          claimId: id,
          prorationScope: "participant_round_failure_bonus_cap",
          failureBonusPolicyVersion: round.failureBonusPolicyVersion,
        })),
      ])
    )

  const participantCappedFailureBonusCentsByClaimId =
    prorateClaimCentsDeterministicallyWithin(
      participantRawFailureBonusCentsByClaimId,
      participantRoundFailureBonusCapCents[participantId],
      participantFailureBonusProrationOrderKeyByClaimId
    )

  participantQualifiedClaimIds.forEach(claimId => {
    participantCappedProvisionalFailureBonusCents[claimId] =
      isNonNegativeIntegerCents(participantCappedFailureBonusCentsByClaimId[claimId])
        ? participantCappedFailureBonusCentsByClaimId[claimId]
        : 0
    failureBonusClaim[claimId].participantRoundCapCents =
      participantRoundFailureBonusCapCents[participantId]
    failureBonusClaim[claimId].participantCappedProvisionalBonusCents =
      participantCappedProvisionalFailureBonusCents[claimId]
  })
})
```

Failure-bonus eligibility is intentionally narrower than ordinary project failure. A project is failure-bonus eligible only if it was review-approved, destination-verified, project-identity/destination-route valid, anti-threat clear, externality clear, conflict-review non-blocking, and sponsor-backed at round open, and then failed solely because threshold amount, verified-supporter count, active-cluster count, or counterparty-volume conditions did not clear.

No failure bonus is paid if the project fails because review was not approved, a challenge was unresolved or blocking, anti-threat review, destination or project-identity/destination-route failure, externality review or blocking, conflict-review blocking, sponsor-pool loss, rulebook mismatch, budget/intent fallback-rule mismatch, legal/custody blocker, identity/sybil/collusion blocker, authorization failure, user cancellation, or missing consent.

`failedQualifiedMatchEligibleCents` is the candidate match-eligible amount from a locked active conditional intent that would have counted for the project if the project had cleared, after applying human verification, identity thresholds, sybil/collusion exclusions, self-match, linked-account, same-payment-method / same-payment-cluster, and same-control exclusions, rulebook consent, active-budget gating, intent amount and max-exposure caps, user project caps, stance caps, and validated distinct-counterparty-bucket checks. It is always `0` for review-not-approved, challenge-blocked, safety-blocked, destination-blocked, project-identity/destination-route-blocked, externality-not-clear, conflict-blocked, sponsor-blocked, rulebook-mismatched, budget/intent fallback-rule-mismatched, legal/custody-blocked, identity-blocked, authorization-failed, canceled, missing-consent, or zero-exposure intents.

Qualification:

In the qualification code below, `project`, `commonGroundBudget`, `conditionalTradeIntent`, and `identityEligibility` are immutable rows from the `RoundClearingInputBundle`, not mutable live database records. Any `bundleDerived*RowCount*` maps referenced below are computed deterministically from the same immutable `RoundClearingInputBundle` before row selection; duplicate or ambiguous project/intent rows deny qualification rather than being resolved by arbitrary ordering.

```ts
const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isCanonicalUtcTimestamp = (value: string | null | undefined) =>
  isNonEmptyString(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value

const timestampEquals = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  a === b

const timestampLte = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) <= Date.parse(b)

const timestampLt = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) < Date.parse(b)

const isValidBps = (value: number | null | undefined, max = 10_000) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max

const identityWeightBpsOrZero = (value: number | null | undefined) =>
  isValidBps(value, 10_000) ? value : 0

const failClosedIdentityThresholdBps = (value: number | null | undefined) =>
  isValidBps(value, 10_000) ? value : 10_001

const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const isPositiveIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value > 0

const isNonWhitespaceStringValue = (item: unknown) =>
  typeof item === "string" && item.trim().length > 0 && item === item.trim()

const rawStringArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(isNonWhitespaceStringValue) &&
  new Set(value).size === value.length

const stringArrayOrEmpty = (value: unknown) =>
  rawStringArrayValid(value) ? [...value].sort() : []


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const totalSponsorBudgetCentsInt =
  BigInt(roundBaseMatchBudgetCents) +
  BigInt(roundBonusBudgetCents) +
  BigInt(roundFailureBonusBudgetCents)

const failureBonusBudgetCapValid =
  roundFailureBonusBudgetCents > 0 &&
  totalSponsorBudgetCentsInt > 0n &&
  BigInt(roundFailureBonusBudgetCents) * 20n <= totalSponsorBudgetCentsInt

const validPaymentCommitmentSnapshotKinds = [
  "early_failure_bonus_cutoff",
  "round_close",
  "authorization_reconciliation",
] as const

const paymentCommitmentSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  validPaymentCommitmentSnapshotKinds.includes(snapshot.snapshotKind as any) &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.participantId) &&
  isNonEmptyString(snapshot.commonGroundBudgetId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.paymentMethodRef) &&
  snapshot.paymentMethodCommitmentState === "provider_confirmed" &&
  isCanonicalUtcTimestamp(snapshot.paymentMethodSavedAt) &&
  isCanonicalUtcTimestamp(snapshot.paymentMethodConfirmedAt) &&
  isCanonicalUtcTimestamp(snapshot.asOf) &&
  timestampLte(snapshot.paymentMethodSavedAt, snapshot.paymentMethodConfirmedAt) &&
  timestampLte(snapshot.paymentMethodConfirmedAt, snapshot.asOf) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  isCanonicalHash(snapshot.providerEvidenceHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    paymentMethodRef: snapshot.paymentMethodRef,
    paymentMethodSavedAt: snapshot.paymentMethodSavedAt,
    paymentMethodCommitmentState: snapshot.paymentMethodCommitmentState,
    paymentMethodConfirmedAt: snapshot.paymentMethodConfirmedAt,
    asOf: snapshot.asOf,
    providerEvidenceHash: snapshot.providerEvidenceHash,
    rulebookHash: snapshot.rulebookHash,
    createdAt: snapshot.createdAt,
  }))

const isExactBoolean = (value: unknown) =>
  value === true || value === false

const projectRoundEligibilitySnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  snapshot.snapshotKind === "round_open" &&
  isCanonicalUtcTimestamp(snapshot.sourceCutoffAt) &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.projectId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isExactBoolean(snapshot.wasReviewApprovedAtRoundOpen) &&
  isExactBoolean(snapshot.wasChallengeNonBlockingAtRoundOpen) &&
  isExactBoolean(snapshot.wasDestinationVerifiedAtRoundOpen) &&
  isExactBoolean(snapshot.wasProjectIdentityAndRouteValidAtRoundOpen) &&
  isExactBoolean(snapshot.wasBaselineAndActionEvidenceValidAtRoundOpen) &&
  isExactBoolean(snapshot.wasAntiThreatClearAtRoundOpen) &&
  isExactBoolean(snapshot.wasExternalityClearAtRoundOpen) &&
  isExactBoolean(snapshot.wasConflictNonBlockingAtRoundOpen) &&
  isExactBoolean(snapshot.wasSponsorBackedAtRoundOpen) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    snapshotKind: snapshot.snapshotKind,
    sourceCutoffAt: snapshot.sourceCutoffAt,
    roundId: snapshot.roundId,
    projectId: snapshot.projectId,
    rulebookHash: snapshot.rulebookHash,
    wasReviewApprovedAtRoundOpen: snapshot.wasReviewApprovedAtRoundOpen,
    wasChallengeNonBlockingAtRoundOpen: snapshot.wasChallengeNonBlockingAtRoundOpen,
    wasDestinationVerifiedAtRoundOpen: snapshot.wasDestinationVerifiedAtRoundOpen,
    wasProjectIdentityAndRouteValidAtRoundOpen: snapshot.wasProjectIdentityAndRouteValidAtRoundOpen,
    wasBaselineAndActionEvidenceValidAtRoundOpen: snapshot.wasBaselineAndActionEvidenceValidAtRoundOpen,
    wasAntiThreatClearAtRoundOpen: snapshot.wasAntiThreatClearAtRoundOpen,
    wasExternalityClearAtRoundOpen: snapshot.wasExternalityClearAtRoundOpen,
    wasConflictNonBlockingAtRoundOpen: snapshot.wasConflictNonBlockingAtRoundOpen,
    wasSponsorBackedAtRoundOpen: snapshot.wasSponsorBackedAtRoundOpen,
    createdAt: snapshot.createdAt,
  }))

const roundClearingInputBundleBindingHashValid = (bundle) =>
  bundle != null &&
  isNonEmptyString(bundle.id) &&
  isNonEmptyString(bundle.roundId) &&
  isCanonicalHash(bundle.rulebookHash) &&
  isNonEmptyString(bundle.feePolicyVersion) &&
  isCanonicalHash(bundle.feePolicyHash) &&
  ["shadow", "capped_pilot", "full"].includes(bundle.deploymentMode as any) &&
  (
    bundle.deploymentMode === "capped_pilot"
      ? isPositiveIntegerCents(bundle.pilotMaxRoundGrossExposureCents) &&
        isPositiveIntegerCents(bundle.pilotMaxParticipantGrossExposureCents)
      : bundle.pilotMaxRoundGrossExposureCents == null &&
        bundle.pilotMaxParticipantGrossExposureCents == null
  ) &&
  ["not_required", "required", "passed", "failed"].includes(bundle.deploymentAuditState as any) &&
  (bundle.deploymentAuditId == null || isNonEmptyString(bundle.deploymentAuditId)) &&
  (bundle.deploymentAuditHash == null || isCanonicalHash(bundle.deploymentAuditHash)) &&
  isCanonicalHash(bundle.paymentReconciliationPathHash) &&
  isCanonicalHash(bundle.optimizationPolicyHash) &&
  isNonEmptyString(bundle.calculationVersion) &&
  isNonEmptyString(bundle.bundleSchemaVersion) &&
  bundle.snapshotKind === "round_close" &&
  isCanonicalUtcTimestamp(bundle.sourceCutoffAt) &&
  isCanonicalUtcTimestamp(bundle.createdAt) &&
  isCanonicalHash(bundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(bundle.supportStanceInputHash) &&
  isCanonicalHash(bundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(bundle.identityEligibilityInputHash) &&
  isCanonicalHash(bundle.projectInputHash) &&
  isCanonicalHash(bundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(bundle.feeInputHash) &&
  isCanonicalHash(bundle.deploymentExposureInputHash) &&
  isNonEmptyString(bundle.moralBucketSnapshotId) &&
  isCanonicalHash(bundle.moralBucketSnapshotHash) &&
  isCanonicalHash(bundle.projectEligibilitySnapshotHash) &&
  isCanonicalHash(bundle.sponsorCommitmentInputHash) &&
  isCanonicalHash(bundle.successRewardInputHash) &&
  isCanonicalHash(bundle.coordinationCreditInputHash) &&
  isCanonicalHash(bundle.impactCertificateInputHash) &&
  isCanonicalHash(bundle.canonicalInputJsonHash) &&
  isNonEmptyString(bundle.canonicalInputJsonRef) &&
  isCanonicalHash(bundle.bundleHash) &&
  bundle.bundleHash === sha256(canonicalJson({
    id: bundle.id,
    roundId: bundle.roundId,
    rulebookHash: bundle.rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents ?? null,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents ?? null,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId ?? null,
    deploymentAuditHash: bundle.deploymentAuditHash ?? null,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    bundleSchemaVersion: bundle.bundleSchemaVersion,
    snapshotKind: bundle.snapshotKind,
    sourceCutoffAt: bundle.sourceCutoffAt,
    commonGroundBudgetInputHash: bundle.commonGroundBudgetInputHash,
    supportStanceInputHash: bundle.supportStanceInputHash,
    conditionalTradeIntentInputHash: bundle.conditionalTradeIntentInputHash,
    identityEligibilityInputHash: bundle.identityEligibilityInputHash,
    projectInputHash: bundle.projectInputHash,
    paymentCommitmentSnapshotHash: bundle.paymentCommitmentSnapshotHash,
    feeInputHash: bundle.feeInputHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    moralBucketSnapshotId: bundle.moralBucketSnapshotId,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    projectEligibilitySnapshotHash: bundle.projectEligibilitySnapshotHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    successRewardInputHash: bundle.successRewardInputHash,
    coordinationCreditInputHash: bundle.coordinationCreditInputHash,
    impactCertificateInputHash: bundle.impactCertificateInputHash,
    canonicalInputJsonRef: bundle.canonicalInputJsonRef,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    createdAt: bundle.createdAt,
  }))

const roundTimelineValid =
  timestampLt(round.opensAt, round.reviewFreezeAt) &&
  timestampLte(round.opensAt, round.earlyFailureBonusCutoff) &&
  timestampLte(round.earlyFailureBonusCutoff, round.reviewFreezeAt) &&
  timestampLt(round.reviewFreezeAt, round.closesAt) &&
  timestampLt(round.closesAt, round.challengeDeadline)

const bindingFinalResultStatuses = [
  "cleared",
  "payable",
  "released",
  "closed",
] as const

const authorizationSideEffectStatuses = ["cleared"] as const
const capturePayoutFallbackSideEffectStatuses = ["payable"] as const
const finalAuditReplayStatuses = ["released", "closed"] as const

const bindingResultStatusEligible =
  bindingFinalResultStatuses.includes(round.status as any)

const authorizationSideEffectStatusEligible =
  authorizationSideEffectStatuses.includes(round.status as any)

const capturePayoutFallbackSideEffectStatusEligible =
  capturePayoutFallbackSideEffectStatuses.includes(round.status as any)

const finalAuditReplayStatusEligible =
  finalAuditReplayStatuses.includes(round.status as any)

const roundStatusEligible =
  bindingResultStatusEligible

const validDeploymentModes = ["shadow", "capped_pilot", "full"] as const
const validDeploymentAuditKinds = ["shadow_to_pilot", "pilot_to_full", "shadow_or_pilot_to_full"] as const
const validPriorDeploymentModes = ["shadow", "capped_pilot"] as const
const validPriorDeploymentOutcomeStates = [
  "passed",
  "failed",
  "canceled",
  "incident_review",
] as const

const rawPriorDeploymentModeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(mode => validPriorDeploymentModes.includes(mode as any))

const rawPriorDeploymentOutcomeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(state => validPriorDeploymentOutcomeStates.includes(state as any))

const deploymentAuditPriorEvidenceArraysValid = (audit) =>
  audit != null &&
  rawStringArrayValid(audit.priorRoundIds) &&
  rawStringArrayValid(audit.priorRoundAuditBundleHashes) &&
  rawPriorDeploymentModeArrayValid(audit.priorRoundDeploymentModes) &&
  rawStringArrayValid(audit.priorRoundPaymentReconciliationPathHashes) &&
  rawPriorDeploymentOutcomeArrayValid(audit.priorRoundOutcomeStates) &&
  audit.priorRoundIds.length > 0 &&
  audit.priorRoundIds.length === audit.priorRoundAuditBundleHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundDeploymentModes.length &&
  audit.priorRoundIds.length === audit.priorRoundPaymentReconciliationPathHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundOutcomeStates.length &&
  new Set(audit.priorRoundIds).size === audit.priorRoundIds.length &&
  !audit.priorRoundIds.includes(audit.roundId) &&
  audit.priorRoundAuditBundleHashes.every(isCanonicalHash) &&
  audit.priorRoundPaymentReconciliationPathHashes.every(isCanonicalHash) &&
  audit.priorRoundOutcomeStates.every(state => state === "passed")

const canonicalDeploymentPriorEvidence = (audit) =>
  deploymentAuditPriorEvidenceArraysValid(audit)
    ? audit.priorRoundIds
        .map((priorRoundId, index) => ({
          priorRoundId,
          priorRoundAuditBundleHash: audit.priorRoundAuditBundleHashes[index],
          priorRoundDeploymentMode: audit.priorRoundDeploymentModes[index],
          priorRoundPaymentReconciliationPathHash: audit.priorRoundPaymentReconciliationPathHashes[index],
          priorRoundOutcomeState: audit.priorRoundOutcomeStates[index],
        }))
        .sort((a, b) =>
          a.priorRoundId === b.priorRoundId
            ? a.priorRoundAuditBundleHash === b.priorRoundAuditBundleHash
              ? a.priorRoundDeploymentMode.localeCompare(b.priorRoundDeploymentMode)
              : a.priorRoundAuditBundleHash.localeCompare(b.priorRoundAuditBundleHash)
            : a.priorRoundId.localeCompare(b.priorRoundId)
        )
    : []

const deploymentAuditKindTargetAndEvidenceCoherent = (audit) =>
  audit != null &&
  (
    audit.targetDeploymentMode === "capped_pilot"
      ? audit.auditKind === "shadow_to_pilot" &&
        audit.priorRoundDeploymentModes.every(mode => mode === "shadow")
      : audit.targetDeploymentMode === "full" &&
        (
          (
            audit.auditKind === "pilot_to_full" &&
            audit.priorRoundDeploymentModes.every(mode => mode === "capped_pilot") &&
            audit.priorRoundPaymentReconciliationPathHashes.every(
              hash => hash === audit.paymentReconciliationPathHash
            )
          ) ||
          (
            audit.auditKind === "shadow_or_pilot_to_full" &&
            audit.priorRoundDeploymentModes.some((mode, index) =>
              mode === "capped_pilot" &&
              audit.priorRoundPaymentReconciliationPathHashes[index] === audit.paymentReconciliationPathHash
            ) &&
            audit.priorRoundDeploymentModes.every(mode =>
              mode === "shadow" || mode === "capped_pilot"
            )
          )
        )
  )

const deploymentAuditBindingHashValid = (audit) =>
  audit != null &&
  isNonEmptyString(audit.id) &&
  isNonEmptyString(audit.roundId) &&
  validDeploymentAuditKinds.includes(audit.auditKind as any) &&
  ["capped_pilot", "full"].includes(audit.targetDeploymentMode as any) &&
  audit.auditState === "passed" &&
  isNonEmptyString(audit.calculationVersion) &&
  isCanonicalHash(audit.rulebookHash) &&
  isCanonicalHash(audit.feePolicyHash) &&
  isCanonicalHash(audit.sponsorPoolSourceHash) &&
  isCanonicalHash(audit.paymentReconciliationPathHash) &&
  isCanonicalHash(audit.optimizationPolicyHash) &&
  ["ilp", "deterministic_greedy"].includes(audit.solverMode as any) &&
  isNonEmptyString(audit.solverVersion) &&
  deploymentAuditPriorEvidenceArraysValid(audit) &&
  deploymentAuditKindTargetAndEvidenceCoherent(audit) &&
  isNonEmptyString(audit.auditorId) &&
  isCanonicalUtcTimestamp(audit.createdAt) &&
  isCanonicalHash(audit.auditHash) &&
  audit.auditHash === sha256(canonicalJson({
    id: audit.id,
    roundId: audit.roundId,
    auditKind: audit.auditKind,
    targetDeploymentMode: audit.targetDeploymentMode,
    auditState: audit.auditState,
    calculationVersion: audit.calculationVersion,
    rulebookHash: audit.rulebookHash,
    feePolicyHash: audit.feePolicyHash,
    sponsorPoolSourceHash: audit.sponsorPoolSourceHash,
    paymentReconciliationPathHash: audit.paymentReconciliationPathHash,
    optimizationPolicyHash: audit.optimizationPolicyHash,
    solverMode: audit.solverMode,
    solverVersion: audit.solverVersion,
    priorEvidence: canonicalDeploymentPriorEvidence(audit),
    auditorId: audit.auditorId,
    createdAt: audit.createdAt,
  }))

const deploymentAuditEligibleForCurrentRound = (targetDeploymentMode) =>
  round.deploymentAuditState === "passed" &&
  round.deploymentAuditId != null &&
  deploymentAudit != null &&
  deploymentAudit.id === round.deploymentAuditId &&
  deploymentAudit.auditHash === round.deploymentAuditHash &&
  deploymentAudit.roundId === round.id &&
  deploymentAudit.targetDeploymentMode === targetDeploymentMode &&
  deploymentAudit.calculationVersion === round.calculationVersion &&
  deploymentAudit.rulebookHash === round.rulebookHash &&
  deploymentAudit.feePolicyHash === round.feePolicyHash &&
  deploymentAudit.sponsorPoolSourceHash === round.sponsorPoolSourceHash &&
  deploymentAudit.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  deploymentAudit.optimizationPolicyHash === round.optimizationPolicyHash &&
  timestampLte(deploymentAudit.createdAt, round.parametersFrozenAt) &&
  deploymentAuditBindingHashValid(deploymentAudit)

const cappedPilotDeploymentAuditEligible =
  (
    round.deploymentAuditState === "not_required" &&
    round.deploymentAuditId == null &&
    round.deploymentAuditHash == null
  ) || deploymentAuditEligibleForCurrentRound("capped_pilot")

const fullDeploymentAuditEligible =
  deploymentAuditEligibleForCurrentRound("full")

const deploymentPilotCapFieldsModeCompatible =
  round.deploymentMode === "capped_pilot"
    ? isPositiveIntegerCents(round.pilotMaxRoundGrossExposureCents) &&
      isPositiveIntegerCents(round.pilotMaxParticipantGrossExposureCents)
    : round.pilotMaxRoundGrossExposureCents == null &&
      round.pilotMaxParticipantGrossExposureCents == null

const roundDeploymentModeEligible =
  validDeploymentModes.includes(round.deploymentMode as any) &&
  deploymentPilotCapFieldsModeCompatible &&
  (
    (
      round.deploymentMode === "shadow" &&
      round.deploymentAuditState === "not_required" &&
      round.deploymentAuditId == null &&
      round.deploymentAuditHash == null
    ) ||
    (
      round.deploymentMode === "capped_pilot" &&
      cappedPilotDeploymentAuditEligible
    ) ||
    (
      round.deploymentMode === "full" &&
      fullDeploymentAuditEligible
    )
  )

const roundRulebookAndFreezeEligible =
  roundTimelineValid &&
  roundStatusEligible &&
  roundDeploymentModeEligible &&
  isCanonicalHash(round.rulebookHash) &&
  isCanonicalHash(round.sponsorPoolSourceHash) &&
  isCanonicalHash(round.paymentReconciliationPathHash) &&
  isCanonicalHash(round.optimizationPolicyHash) &&
  isNonEmptyString(round.calculationVersion) &&
  isNonEmptyString(round.failureBonusPolicyVersion) &&
  isNonEmptyString(round.feePolicyVersion) &&
  isCanonicalHash(round.feePolicyHash) &&
  isCanonicalUtcTimestamp(round.parametersFrozenAt) &&
  timestampLte(round.parametersFrozenAt, round.opensAt)

const failureBonusBundleEligible =
  roundClearingInputBundle != null &&
  roundRulebookAndFreezeEligible &&
  roundClearingInputBundle.id === round.clearingInputBundleId &&
  roundClearingInputBundle.roundId === round.id &&
  roundClearingInputBundle.rulebookHash === round.rulebookHash &&
  roundClearingInputBundle.feePolicyVersion === round.feePolicyVersion &&
  roundClearingInputBundle.feePolicyHash === round.feePolicyHash &&
  roundClearingInputBundle.deploymentMode === round.deploymentMode &&
  roundClearingInputBundle.pilotMaxRoundGrossExposureCents === (round.pilotMaxRoundGrossExposureCents ?? null) &&
  roundClearingInputBundle.pilotMaxParticipantGrossExposureCents === (round.pilotMaxParticipantGrossExposureCents ?? null) &&
  roundClearingInputBundle.deploymentAuditState === round.deploymentAuditState &&
  roundClearingInputBundle.deploymentAuditId === (round.deploymentAuditId ?? null) &&
  roundClearingInputBundle.deploymentAuditHash === (round.deploymentAuditHash ?? null) &&
  roundClearingInputBundle.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  roundClearingInputBundle.optimizationPolicyHash === round.optimizationPolicyHash &&
  roundClearingInputBundle.calculationVersion === round.calculationVersion &&
  roundClearingInputBundle.snapshotKind === "round_close" &&
  timestampEquals(roundClearingInputBundle.sourceCutoffAt, round.closesAt) &&
  roundClearingInputBundle.bundleHash === round.clearingInputBundleHash &&
  roundClearingInputBundleBindingHashValid(roundClearingInputBundle) &&
  isCanonicalHash(roundClearingInputBundle.canonicalInputJsonHash) &&
  isCanonicalHash(roundClearingInputBundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(roundClearingInputBundle.supportStanceInputHash) &&
  isCanonicalHash(roundClearingInputBundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(roundClearingInputBundle.identityEligibilityInputHash) &&
  isCanonicalHash(roundClearingInputBundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(roundClearingInputBundle.feeInputHash) &&
  isCanonicalHash(roundClearingInputBundle.deploymentExposureInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectEligibilitySnapshotHash) &&
  roundClearingInputBundle.sponsorCommitmentInputHash === round.sponsorPoolSourceHash &&
  isCanonicalHash(roundClearingInputBundle.sponsorCommitmentInputHash) &&
  roundClearingInputBundle.moralBucketSnapshotId === round.moralBucketSnapshotId &&
  roundClearingInputBundle.moralBucketSnapshotHash === round.moralBucketSnapshotHash &&
  isCanonicalHash(roundClearingInputBundle.moralBucketSnapshotHash)

const failureBonusProjectId =
  project?.id ?? null

const failureBonusProjectBucketId =
  project?.bucketId ?? null

const failureBonusProjectRowCount =
  isNonEmptyString(failureBonusProjectId)
    ? bundleDerivedProjectRowCountByRoundAndProjectId[
        round.id
      ]?.[failureBonusProjectId] ?? 0
    : 0

const failureBonusProjectRowUnique =
  failureBonusProjectRowCount === 1

const failureBonusProjectRowEligible =
  project != null &&
  failureBonusProjectRowUnique &&
  project.roundId === round.id &&
  isNonEmptyString(failureBonusProjectId) &&
  isNonEmptyString(failureBonusProjectBucketId)

const roundOpenEligibilitySnapshotRowCount =
  failureBonusProjectRowEligible && isNonEmptyString(failureBonusProjectId)
    ? bundleDerivedProjectRoundEligibilitySnapshotRowCountByRoundAndProjectId[
        round.id
      ]?.[failureBonusProjectId] ?? 0
    : 0

const roundOpenEligibilitySnapshotUnique =
  roundOpenEligibilitySnapshotRowCount === 1

const roundOpenEligibilitySnapshot =
  roundOpenEligibilitySnapshotUnique && failureBonusProjectRowEligible
    ? projectRoundEligibilitySnapshotByRoundAndProjectId[
        round.id
      ]?.[failureBonusProjectId]
    : null

const failureBonusProjectEligible =
  failureBonusProjectRowEligible &&
  roundOpenEligibilitySnapshotUnique &&
  projectFailed &&
  [
    "threshold_amount_shortfall",
    "verified_supporter_shortfall",
    "active_cluster_shortfall",
    "counterparty_volume_shortfall",
  ].includes(projectFailureReason) &&
  roundOpenEligibilitySnapshot != null &&
  roundOpenEligibilitySnapshot.snapshotKind === "round_open" &&
  roundOpenEligibilitySnapshot.roundId === round.id &&
  roundOpenEligibilitySnapshot.projectId === failureBonusProjectId &&
  timestampEquals(roundOpenEligibilitySnapshot.sourceCutoffAt, round.opensAt) &&
  timestampLte(roundOpenEligibilitySnapshot.createdAt, round.opensAt) &&
  projectRoundEligibilitySnapshotBindingHashValid(roundOpenEligibilitySnapshot) &&
  roundOpenEligibilitySnapshot.rulebookHash === round.rulebookHash &&
  roundOpenEligibilitySnapshot.wasReviewApprovedAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasChallengeNonBlockingAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasDestinationVerifiedAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasProjectIdentityAndRouteValidAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasBaselineAndActionEvidenceValidAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasAntiThreatClearAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasExternalityClearAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasConflictNonBlockingAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasSponsorBackedAtRoundOpen === true

const failureBonusCommonGroundBudgetId =
  commonGroundBudget?.id ?? null

const failureBonusCommonGroundBudgetParticipantId =
  commonGroundBudget?.participantId ?? null

const failureBonusCommonGroundBudgetRowCount =
  isNonEmptyString(failureBonusCommonGroundBudgetId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndBudgetId[
        round.id
      ]?.[failureBonusCommonGroundBudgetId] ?? 0
    : 0

const failureBonusCommonGroundBudgetParticipantRowCount =
  isNonEmptyString(failureBonusCommonGroundBudgetParticipantId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndParticipantId[
        round.id
      ]?.[failureBonusCommonGroundBudgetParticipantId] ?? 0
    : 0

const failureBonusCommonGroundBudgetRowUnique =
  failureBonusCommonGroundBudgetRowCount === 1 &&
  failureBonusCommonGroundBudgetParticipantRowCount === 1

const earlyPaymentCommitmentSnapshotRowCount =
  failureBonusCommonGroundBudgetRowUnique &&
  isNonEmptyString(failureBonusCommonGroundBudgetId)
    ? bundleDerivedPaymentCommitmentSnapshotRowCountByRoundBudgetAndKind[
        round.id
      ]?.[failureBonusCommonGroundBudgetId]?.early_failure_bonus_cutoff ?? 0
    : 0

const earlyPaymentCommitmentSnapshotUnique =
  earlyPaymentCommitmentSnapshotRowCount === 1

const earlyPaymentCommitmentSnapshot =
  earlyPaymentCommitmentSnapshotUnique &&
  failureBonusCommonGroundBudgetRowUnique &&
  isNonEmptyString(failureBonusCommonGroundBudgetId)
    ? paymentCommitmentSnapshotByRoundBudgetAndKind[
        round.id
      ]?.[failureBonusCommonGroundBudgetId]?.early_failure_bonus_cutoff
    : null

const identityEligibilityRow = identityEligibility ?? null

const failureBonusIdentityEligibilityRowCount =
  failureBonusCommonGroundBudgetRowUnique &&
  isNonEmptyString(failureBonusCommonGroundBudgetParticipantId)
    ? bundleDerivedIdentityEligibilityRowCountByRoundAndParticipantId[
        round.id
      ]?.[failureBonusCommonGroundBudgetParticipantId] ?? 0
    : 0

const failureBonusIdentityEligibilityRowUnique =
  failureBonusIdentityEligibilityRowCount === 1

const identityWeightBps =
  identityWeightBpsOrZero(identityEligibilityRow?.countedWeightBps)

const identityWeightMinForBonusBps =
  failClosedIdentityThresholdBps(round.identityWeightMinForBonusBps)

const identityEligibilityRowBoundToClaim =
  failureBonusIdentityEligibilityRowUnique &&
  identityEligibilityRow != null &&
  identityEligibilityRow.roundId === round.id &&
  identityEligibilityRow.participantId === commonGroundBudget?.participantId

const validConditionalIntentAuthorizationStates = [
  "none",
  "payment_method_saved",
  "authorized",
] as const

const validFallbackRules = [
  "refund",
  "reroute",
  "carry_forward",
  "release_hold",
] as const

const validBudgetPeriods = [
  "one_time",
  "per_round",
  "monthly",
] as const

const commonGroundBudgetPeriodEligible =
  validBudgetPeriods.includes(commonGroundBudget?.budgetPeriod as any)

const commonGroundBudgetRecurringConsentEligible =
  commonGroundBudget?.budgetPeriod === "one_time" ||
  (
    ["per_round", "monthly"].includes(commonGroundBudget?.budgetPeriod as any) &&
    isNonEmptyString(commonGroundBudget?.recurringConsentVersion) &&
    isCanonicalUtcTimestamp(commonGroundBudget?.nextCaptureAt) &&
    isNonEmptyString(commonGroundBudget?.nextCaptureRule)
  )

const commonGroundBudgetFallbackRuleEligible =
  validFallbackRules.includes(commonGroundBudget?.fallbackRule as any)

const commonGroundBudgetFailureBonusEligible =
  commonGroundBudget != null &&
  failureBonusCommonGroundBudgetRowUnique &&
  commonGroundBudget.roundId === round.id &&
  isNonEmptyString(failureBonusCommonGroundBudgetId) &&
  isNonEmptyString(failureBonusCommonGroundBudgetParticipantId) &&
  commonGroundBudget.participantId === conditionalTradeIntent?.participantId &&
  commonGroundBudget.id === conditionalTradeIntent?.commonGroundBudgetId &&
  commonGroundBudget.state === "active" &&
  commonGroundBudget.canceledAt == null &&
  commonGroundBudget.rulebookHashAtConsent === round.rulebookHash &&
  commonGroundBudgetPeriodEligible &&
  commonGroundBudgetRecurringConsentEligible &&
  commonGroundBudgetFallbackRuleEligible &&
  isPositiveIntegerCents(commonGroundBudget.totalBudgetCents) &&
  isNonNegativeIntegerCents(commonGroundBudget.perProjectCapCents)

const failureBonusConditionalIntentRowCount =
  failureBonusCommonGroundBudgetRowUnique &&
  failureBonusProjectRowEligible &&
  isNonEmptyString(failureBonusCommonGroundBudgetId) &&
  isNonEmptyString(failureBonusProjectId)
    ? bundleDerivedClearingEligibleConditionalIntentRowCountByRoundBudgetAndProjectId[
        round.id
      ]?.[failureBonusCommonGroundBudgetId]?.[failureBonusProjectId] ?? 0
    : 0

const conditionalIntentFailureBonusRowEligible =
  failureBonusConditionalIntentRowCount === 1 &&
  commonGroundBudget != null &&
  conditionalTradeIntent != null &&
  failureBonusProjectRowEligible &&
  isNonEmptyString(conditionalTradeIntent.id) &&
  conditionalTradeIntent.commonGroundBudgetId === commonGroundBudget.id &&
  conditionalTradeIntent.roundId === round.id &&
  conditionalTradeIntent.projectId === failureBonusProjectId &&
  conditionalTradeIntent.participantId === commonGroundBudget.participantId

const conditionalIntentAuthorizationStateEligible =
  validConditionalIntentAuthorizationStates.includes(
    conditionalTradeIntent?.authorizationState as any
  )

const conditionalIntentFallbackRuleEligible =
  validFallbackRules.includes(conditionalTradeIntent?.fallbackRule as any)

const failureBonusFallbackRuleConsistent =
  commonGroundBudgetFallbackRuleEligible &&
  conditionalIntentFallbackRuleEligible &&
  commonGroundBudget?.fallbackRule === conditionalTradeIntent?.fallbackRule

const conditionalIntentAcceptableCounterBucketIds =
  stringArrayOrEmpty(conditionalTradeIntent?.acceptableCounterBucketIds)

const conditionalIntentAmountCents =
  isPositiveIntegerCents(conditionalTradeIntent?.amountCents)
    ? conditionalTradeIntent.amountCents
    : 0

const conditionalIntentMaxExposureCents =
  isPositiveIntegerCents(conditionalTradeIntent?.maxExposureCents)
    ? conditionalTradeIntent.maxExposureCents
    : 0

const conditionalIntentMinCounterpartyVolumeCents =
  isPositiveIntegerCents(conditionalTradeIntent?.minCounterpartyVolumeCents)
    ? conditionalTradeIntent.minCounterpartyVolumeCents
    : 0

const conditionalIntentExposureAndCounterpartyEligible =
  conditionalIntentAmountCents > 0 &&
  conditionalIntentMaxExposureCents > 0 &&
  conditionalIntentMinCounterpartyVolumeCents > 0 &&
  conditionalIntentAcceptableCounterBucketIds.length > 0

const safeFailedQualifiedMatchEligibleCents =
  isPositiveIntegerCents(failedQualifiedMatchEligibleCents)
    ? failedQualifiedMatchEligibleCents
    : 0

const finalFailureBonusBackingCents =
  failureBonusBundleEligible
    ? sponsorBackedCentsForFinalClearing("failure_bonus")
    : 0

const failureBonusFundingEligible =
  failureBonusBundleEligible &&
  failureBonusBudgetCapValid &&
  finalFailureBonusBackingCents >= roundFailureBonusBudgetCents

const validFailureBonusClaimantConflictStates = [
  "no_conflict",
  "project_proposer",
  "recipient_affiliate",
  "fiscal_host_affiliate",
  "sponsor_affiliate",
  "reviewer_affiliate",
  "same_control_affiliate",
  "unknown",
] as const

const failureBonusClaimantConflictSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  isNonEmptyString(snapshot.id) &&
  snapshot.snapshotKind === "failure_bonus_claimant_conflict" &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.projectId) &&
  isNonEmptyString(snapshot.participantId) &&
  isNonEmptyString(snapshot.commonGroundBudgetId) &&
  isNonEmptyString(snapshot.conditionalTradeIntentId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.failureBonusPolicyVersion) &&
  isCanonicalUtcTimestamp(snapshot.sourceCutoffAt) &&
  validFailureBonusClaimantConflictStates.includes(snapshot.conflictState as any) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    id: snapshot.id,
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    projectId: snapshot.projectId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    conditionalTradeIntentId: snapshot.conditionalTradeIntentId,
    rulebookHash: snapshot.rulebookHash,
    failureBonusPolicyVersion: snapshot.failureBonusPolicyVersion,
    sourceCutoffAt: snapshot.sourceCutoffAt,
    conflictState: snapshot.conflictState,
    createdAt: snapshot.createdAt,
  }))

const failureBonusClaimantConflictEligible =
  failureBonusClaimantConflictSnapshotBindingHashValid(failureBonusClaimantConflictSnapshot) &&
  failureBonusClaimantConflictSnapshot.roundId === round.id &&
  failureBonusClaimantConflictSnapshot.projectId === failureBonusProjectId &&
  failureBonusClaimantConflictSnapshot.participantId === failureBonusCommonGroundBudgetParticipantId &&
  failureBonusClaimantConflictSnapshot.commonGroundBudgetId === failureBonusCommonGroundBudgetId &&
  failureBonusClaimantConflictSnapshot.conditionalTradeIntentId === conditionalTradeIntent?.id &&
  failureBonusClaimantConflictSnapshot.rulebookHash === round.rulebookHash &&
  failureBonusClaimantConflictSnapshot.failureBonusPolicyVersion === round.failureBonusPolicyVersion &&
  timestampEquals(failureBonusClaimantConflictSnapshot.sourceCutoffAt, round.closesAt) &&
  failureBonusClaimantConflictSnapshot.conflictState === "no_conflict"

const qualified =
  failureBonusBundleEligible &&
  failureBonusFundingEligible &&
  failureBonusProjectEligible &&
  failureBonusClaimantConflictEligible &&
  commonGroundBudgetFailureBonusEligible &&
  conditionalIntentFailureBonusRowEligible &&
  conditionalTradeIntent != null &&
  conditionalTradeIntent.state === "active" &&
  conditionalIntentAuthorizationStateEligible &&
  conditionalIntentFallbackRuleEligible &&
  failureBonusFallbackRuleConsistent &&
  conditionalIntentExposureAndCounterpartyEligible &&
  conditionalTradeIntent.rulebookHashAtConsent === round.rulebookHash &&
  conditionalTradeIntent.lockedAt != null &&
  timestampLte(conditionalTradeIntent.lockedAt, round.earlyFailureBonusCutoff) &&
  earlyPaymentCommitmentSnapshotUnique &&
  earlyPaymentCommitmentSnapshot != null &&
  earlyPaymentCommitmentSnapshot.snapshotKind === "early_failure_bonus_cutoff" &&
  earlyPaymentCommitmentSnapshot.roundId === round.id &&
  earlyPaymentCommitmentSnapshot.participantId === commonGroundBudget.participantId &&
  earlyPaymentCommitmentSnapshot.commonGroundBudgetId === commonGroundBudget.id &&
  earlyPaymentCommitmentSnapshot.rulebookHash === round.rulebookHash &&
  isNonEmptyString(earlyPaymentCommitmentSnapshot.paymentMethodRef) &&
  timestampEquals(earlyPaymentCommitmentSnapshot.asOf, round.earlyFailureBonusCutoff) &&
  timestampLte(earlyPaymentCommitmentSnapshot.paymentMethodSavedAt, round.earlyFailureBonusCutoff) &&
  earlyPaymentCommitmentSnapshot.paymentMethodCommitmentState === "provider_confirmed" &&
  timestampLte(earlyPaymentCommitmentSnapshot.paymentMethodConfirmedAt, round.earlyFailureBonusCutoff) &&
  paymentCommitmentSnapshotBindingHashValid(earlyPaymentCommitmentSnapshot) &&
  safeFailedQualifiedMatchEligibleCents > 0 &&
  identityEligibilityRowBoundToClaim &&
  identityEligibilityRow?.humanVerified === true &&
  identityWeightBps >= identityWeightMinForBonusBps &&
  identityEligibilityRow?.sybilRiskState === "clear" &&
  identityEligibilityRow?.collusionRiskState === "clear"
```

Total approved failure-bonus payouts must never exceed the backed available failure-bonus pool. If total provisional qualified claims exceed the backed available failure-bonus pool, prorate all qualified claims deterministically:

```ts
const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const finalFailureBonusBackingCents =
  failureBonusBundleEligible
    ? sponsorBackedCentsForFinalClearing("failure_bonus")
    : 0

const failureBonusPoolAvailableCents =
  failureBonusBundleEligible &&
  failureBonusBudgetCapValid &&
  finalFailureBonusBackingCents >= roundFailureBonusBudgetCents
    ? roundFailureBonusBudgetCents
    : 0

const failureBonusPayoutInputsEligible =
  failureBonusFundingEligible &&
  failureBonusPoolAvailableCents > 0

const finalFailureBonusPayoutClaimStateEligible = (claim) =>
  claim?.claimState === "approved" &&
  claim?.payoutRef == null &&
  claim?.resolvedAt == null

const finalFailureBonusClaimIdsRawValid =
  Array.isArray(qualifiedFailureBonusClaimIdsForCurrentRound) &&
  qualifiedFailureBonusClaimIdsForCurrentRound.every(isNonEmptyString) &&
  new Set(qualifiedFailureBonusClaimIdsForCurrentRound).size ===
    qualifiedFailureBonusClaimIdsForCurrentRound.length

const finalFailureBonusClaimIdsAllCurrentRoundValid =
  finalFailureBonusClaimIdsRawValid &&
  qualifiedFailureBonusClaimIdsForCurrentRound.every(claimId =>
    failureBonusClaim[claimId] != null &&
    failureBonusClaim[claimId].id === claimId &&
    failureBonusClaimAuditContextEligible(failureBonusClaim[claimId]) &&
    finalFailureBonusPayoutClaimStateEligible(failureBonusClaim[claimId])
  )

const finalFailureBonusPayoutSideEffectEligible =
  round.status === "payable" &&
  failureBonusPayoutInputsEligible

const finalFailureBonusReplayOnlyStatusEligible =
  ["released", "closed"].includes(round.status as any)

const finalFailureBonusClaimIds =
  finalFailureBonusPayoutSideEffectEligible &&
  finalFailureBonusClaimIdsAllCurrentRoundValid
    ? [...qualifiedFailureBonusClaimIdsForCurrentRound].sort()
    : []

if (!finalFailureBonusPayoutSideEffectEligible) {
  // Do not write finalFailureBonusCents or FailureBonusClaim.prorationFactorBps.
  // Released/closed rounds may only read/report/audit already-recorded payout fields.
}

const participantCappedProvisionalFailureBonusCentsByClaimId =
  Object.fromEntries(
    finalFailureBonusClaimIds.map(claimId => [
      claimId,
      isNonNegativeIntegerCents(participantCappedProvisionalFailureBonusCents[claimId])
        ? participantCappedProvisionalFailureBonusCents[claimId]
        : 0,
    ])
  )

const finalFailureBonusProrationOrderKeyByClaimId =
  Object.fromEntries(
    finalFailureBonusClaimIds.map(claimId => [
      claimId,
      sha256(canonicalJson({
        roundId: round.id,
        claimId,
        prorationScope: "round_failure_bonus_pool",
        failureBonusPolicyVersion: round.failureBonusPolicyVersion,
      })),
    ])
  )

const finalFailureBonusCentsByClaimId =
  prorateClaimCentsDeterministicallyWithin(
    participantCappedProvisionalFailureBonusCentsByClaimId,
    failureBonusPoolAvailableCents,
    finalFailureBonusProrationOrderKeyByClaimId
  )

const totalProvisionalFailureBonusCentsInt =
  sumBigInt(Object.values(participantCappedProvisionalFailureBonusCentsByClaimId))

const failureBonusProrationFactorBps =
  totalProvisionalFailureBonusCentsInt > BigInt(failureBonusPoolAvailableCents)
    ? bigIntToSafeCentsOrZero(
        (BigInt(failureBonusPoolAvailableCents) * 10_000n) /
        totalProvisionalFailureBonusCentsInt
      )
    : 10_000

finalFailureBonusClaimIds.forEach(claimId => {
  finalFailureBonusCents[claimId] =
    isNonNegativeIntegerCents(finalFailureBonusCentsByClaimId[claimId])
      ? finalFailureBonusCentsByClaimId[claimId]
      : 0
  failureBonusClaim[claimId].bonusCents = finalFailureBonusCents[claimId]
  failureBonusClaim[claimId].prorationFactorBps = failureBonusProrationFactorBps
})

const markFailureBonusClaimSettled = (
  claimId: string,
  settlement: {
    settlementType: "cash_payout" | "platform_credit"
    payoutRef: string
    settledAt: string
  }
) => {
  const claim = failureBonusClaim[claimId]

  if (
    finalFailureBonusPayoutSideEffectEligible &&
    finalFailureBonusClaimIds.includes(claimId) &&
    claim?.claimState === "approved" &&
    claim?.payoutRef == null &&
    claim?.resolvedAt == null &&
    isNonNegativeIntegerCents(finalFailureBonusCents[claimId]) &&
    finalFailureBonusCents[claimId] > 0 &&
    ["cash_payout", "platform_credit"].includes(settlement?.settlementType as any) &&
    isNonEmptyString(settlement?.payoutRef) &&
    isCanonicalUtcTimestamp(settlement?.settledAt)
  ) {
    claim.claimState = settlement.settlementType === "cash_payout" ? "paid" : "credited"
    claim.payoutRef = settlement.payoutRef
    claim.resolvedAt = settlement.settledAt
  }
}
```

Store `FailureBonusClaim.rawBonusCents`, `FailureBonusClaim.participantRoundCapCents`, `FailureBonusClaim.participantCappedProvisionalBonusCents`, `FailureBonusClaim.bonusCents`, and `FailureBonusClaim.prorationFactorBps` only during a `payable` side-effect pass with positive backed failure-bonus-pool availability. Preliminary raw, participant-cap, and participant-capped-provisional claim-field mutation lists are audit-context-bound unsettled non-terminal lists: each included claim must pass `failureBonusClaimAuditContextEligible(...)`, including canonical `createdAt` and `paymentMethodSavedAt <= paymentMethodConfirmedAt <= earlyFailureBonusCutoff`, have `claimState === "pending"` or `claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null`; `denied`, `expired`, `paid`, `credited`, or already-settled rows may only be replayed or audited and must not receive new preliminary claim-field mutations. Final failure-bonus payout and proration claim lists are audit-context-bound unsettled approved-claim lists: each included claim must pass `failureBonusClaimAuditContextEligible(...)`, including canonical `createdAt` and `paymentMethodSavedAt <= paymentMethodConfirmedAt <= earlyFailureBonusCutoff`, have `claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null`. `pending`, `denied`, `expired`, `paid`, `credited`, or already-settled approved rows must not enter payout denominators or receive new `bonusCents`, `prorationFactorBps`, `finalFailureBonusCents`, crediting, or payment mutations. After a cash payout or platform-credit issuance succeeds, the claim row must immediately advance to `claimState === "paid"` or `claimState === "credited"` with a non-empty trim-stable `payoutRef` and canonical `resolvedAt` timestamp before any later `payable` pass can run. The `prorateClaimCentsDeterministicallyWithin(...)` helper allocates leftover rounding cents by the canonical stable-order keys above and never above each participant-capped provisional claim amount; include the rounding method and stable-order-key construction in the calculation hash. Before round open, donor-facing failure bonuses may be advertised only if the integer 5% sponsor-budget cap predicate passes and the current preview/opening sponsor backing check fully covers `roundFailureBonusBudgetCents`. At final qualification or payout time, if the eligible round-close clearing bundle is missing/invalid, the failure-bonus budget-cap predicate fails, `round.status !== "payable"`, `finalFailureBonusBackingCents < roundFailureBonusBudgetCents`, or `failureBonusPoolAvailableCents <= 0`, no new `FailureBonusClaim` payout, crediting, proration, or claim-field mutation may occur; `released` and `closed` rounds may only read/report/audit already-recorded failure-bonus raw, participant-cap, provisional, payout, and proration fields.

Do not create early card authorizations merely to qualify a user for a failure bonus. The failure bonus is based on a locked active conditional intent plus a timestamped provider-confirmed `PaymentCommitmentSnapshot` before the early cutoff, because the payment design authorizes only near capture.

Default to paying small sponsor-funded cash bonuses from the failure pool when legally and operationally available. If cash payout is not legally or operationally available, pay an explicitly equivalent sponsor-funded credit only after the user sees that fallback before pledging.

Each failure bonus must create exactly one auditable `FailureBonusClaim` record with the failure reason, failure-bonus policy version, failed-qualified match-eligible amount, project-round eligibility snapshot reference and hash, clearing input bundle reference and hash, timestamped provider-confirmed payment-commitment snapshot evidence, raw bonus, participant-round cap, participant-capped provisional bonus, proration factor, final payout amount, eligibility inputs hash, payout state, and public aggregate reporting.

Reroute and carry-forward must never silently expand the user's intent: if any routing or carry-forward would change the pre-consented rulebook, recipient, bucket, counterparty set, or exposure, require fresh consent (otherwise abort that fallback option).

---

## 11. Escrow / Custody / Payment Design

CRECM may use real supervised custody or escrow only if a legally reviewed custody/escrow/payment partner is active. Otherwise, it must run as a just-in-time authorization/capture mechanism and must not describe saved payment methods, authorizations, or platform-held obligations as escrow or custody.

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

Sponsor funds follow the same honesty rule. A round may show a base-match pool, bonus-match pool, failure-bonus pool, success-reward pool, or sponsor-paid fee-support pool as donor-facing only to the extent that the corresponding pool-specific `SponsorCommitment` records are funded, escrowed, or contractually committed through an auditable sponsor route. Sponsor-paid fees use `poolType === "fee_support"` and success rewards use `poolType === "success_reward"`; neither may draw from base-match, bonus-match, failure-bonus, or each other's commitments.

For settlement previews, `sponsorBackedCentsForPreview(poolType, previewAsOf)` may read current sponsor records under the preview eligibility predicate below. For final clearing, sponsor-match calculation, failure-bonus availability, audit bundles, and payout plans, `sponsorBackedCentsForFinalClearing(poolType)` must read the frozen sponsor-commitment input set whose hash is stored in `RoundClearingInputBundle.sponsorCommitmentInputHash` and matches `round.sponsorPoolSourceHash`. Live `SponsorCommitment` edits after the clearing bundle is created must not change final sponsor-backed cents; if sponsor backing is lost or materially changed before capture, freeze the round, publish an exception, and require withdrawal or re-consent under a revised schedule.

The platform must compute live preview backing and final-clearing backing separately. Final-clearing formulas must use the frozen function and must reject malformed sponsor evidence or non-integer monetary fields:

```ts
const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isCanonicalUtcTimestamp = (value: string | null | undefined) =>
  isNonEmptyString(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value

const timestampEquals = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  a === b

const timestampLte = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) <= Date.parse(b)

const timestampLt = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) < Date.parse(b)

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const nonNegativeBigIntTerm = (value: unknown) =>
  (typeof value === "bigint" && value >= 0n) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)

const sumBigInt = (values: unknown) =>
  Array.isArray(values) && values.every(nonNegativeBigIntTerm)
    ? values.reduce(
        (total, value) =>
          total + (typeof value === "bigint" ? value : BigInt(value as number)),
        0n
      )
    : 0n
const sponsorCommitmentRecordPresent = (commitment) =>
  commitment != null && typeof commitment === "object"

const sponsorCommitmentCentsValid = (commitment) =>
  sponsorCommitmentRecordPresent(commitment) &&
  isNonNegativeIntegerCents(commitment.committedCents) &&
  isNonNegativeIntegerCents(commitment.fundedCents)

const sponsorCommitmentPayableCentsInt = (commitment) =>
  sponsorCommitmentCentsValid(commitment) &&
  (commitment.commitmentState === "funded" || commitment.commitmentState === "escrowed")
    ? BigInt(commitment.fundedCents)
    : sponsorCommitmentCentsValid(commitment) &&
      commitment.commitmentState === "contractually_committed"
      ? BigInt(commitment.committedCents)
      : 0n
const sponsorCommitmentEligibleForFinalClearing = (commitment) =>
  sponsorCommitmentRecordPresent(commitment) &&
  commitment.roundId === round.id &&
  isCanonicalHash(commitment.sourceHash) &&
  isNonEmptyString(commitment.publishedAt) &&
  timestampLte(commitment.publishedAt, round.opensAt) &&
  timestampLte(commitment.publishedAt, round.parametersFrozenAt) &&
  isNonEmptyString(commitment.backingConfirmedAt) &&
  timestampLte(commitment.backingConfirmedAt, round.opensAt) &&
  timestampLte(commitment.backingConfirmedAt, round.parametersFrozenAt) &&
  sponsorCommitmentCentsValid(commitment) &&
  (
    ["funded", "escrowed", "contractually_committed"].includes(
      commitment.commitmentState
    )
  )

const frozenSponsorCommitmentInputsForFinalClearing =
  Array.isArray(frozenSponsorCommitmentInputsFromEligibleBundle)
    ? frozenSponsorCommitmentInputsFromEligibleBundle
    : []

const sponsorBackedCentsForFinalClearing = (poolType) =>
  bigIntToSafeCentsOrZero(
    frozenSponsorCommitmentInputsForFinalClearing
      .filter(
        commitment =>
          sponsorCommitmentEligibleForFinalClearing(commitment) &&
          commitment.poolType === poolType
      )
      .reduce(
        (total, commitment) => total + sponsorCommitmentPayableCentsInt(commitment),
        0n
      )
  )
```

For settlement previews and pre-round donor-facing advertisement only, use an explicit preview/opening function over current sponsor records. It is provisional and must be labeled as such, but it must still be round-bound, pool-specific, source-hashed, timestamp-valid, and integer-cent-safe before any donor-facing sponsor pool is advertised:

```ts
const sponsorCommitmentEligibleForPreview = (commitment, previewAsOf) =>
  sponsorCommitmentRecordPresent(commitment) &&
  isCanonicalUtcTimestamp(previewAsOf) &&
  timestampLte(previewAsOf, round.opensAt) &&
  commitment.roundId === round.id &&
  isCanonicalHash(commitment.sourceHash) &&
  isNonEmptyString(commitment.publishedAt) &&
  timestampLte(commitment.publishedAt, previewAsOf) &&
  timestampLte(commitment.publishedAt, round.parametersFrozenAt) &&
  isNonEmptyString(commitment.backingConfirmedAt) &&
  timestampLte(commitment.backingConfirmedAt, previewAsOf) &&
  timestampLte(commitment.backingConfirmedAt, round.parametersFrozenAt) &&
  sponsorCommitmentCentsValid(commitment) &&
  (
    ["funded", "escrowed", "contractually_committed"].includes(
      commitment.commitmentState
    )
  )

const currentSponsorCommitmentsForPreview =
  Array.isArray(currentSponsorCommitments)
    ? currentSponsorCommitments
    : []

const sponsorBackedCentsForPreview = (poolType, previewAsOf) =>
  bigIntToSafeCentsOrZero(
    currentSponsorCommitmentsForPreview
      .filter(
        commitment =>
          sponsorCommitmentEligibleForPreview(commitment, previewAsOf) &&
          commitment.poolType === poolType
      )
      .reduce(
        (total, commitment) => total + sponsorCommitmentPayableCentsInt(commitment),
        0n
      )
  )
```

The round may advertise a sponsor pool before opening only if the preview/opening sponsor-backing check clears. Final clearing, matching, failure-bonus availability, audit bundles, and payout plans may use sponsor pools only if the corresponding frozen final-clearing backing check clears:

```ts
const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const finalSponsorBackingChecksEligible =
  roundClearingInputBundleEligible

const finalBaseMatchBackingCents =
  finalSponsorBackingChecksEligible
    ? sponsorBackedCentsForFinalClearing("base_match")
    : 0

const finalBonusMatchBackingCents =
  finalSponsorBackingChecksEligible
    ? sponsorBackedCentsForFinalClearing("bonus_match")
    : 0

const finalFailureBonusBackingCents =
  finalSponsorBackingChecksEligible
    ? sponsorBackedCentsForFinalClearing("failure_bonus")
    : 0

const finalFeeSupportBackingCents =
  finalSponsorBackingChecksEligible
    ? sponsorBackedCentsForFinalClearing("fee_support")
    : 0

// `selectedClearedSponsorPaidFeeQuoteIdsForBindingRows` is derived from positive binding
// cleared allocation rows after coalition clearing; unselected candidate fee quotes do
// not consume fee-support backing.
const sponsorPaidFeeQuoteIdsForAggregate =
  rawStringArrayValid(selectedClearedSponsorPaidFeeQuoteIdsForBindingRows)
    ? selectedClearedSponsorPaidFeeQuoteIdsForBindingRows
    : []

const sponsorPaidFeeQuoteIdUniqueInFrozenInputs = (feeQuoteId) =>
  Array.isArray(frozenFeeQuoteInputsFromEligibleBundle) &&
  frozenFeeQuoteInputsFromEligibleBundle.filter(quote => quote?.id === feeQuoteId).length === 1

const sponsorPaidFeeQuoteIdsUniqueInFrozenInputs =
  sponsorPaidFeeQuoteIdsForAggregate.every(sponsorPaidFeeQuoteIdUniqueInFrozenInputs)

const sponsorPaidFeeQuotesForAggregate =
  Array.isArray(frozenFeeQuoteInputsFromEligibleBundle) &&
  sponsorPaidFeeQuoteIdsUniqueInFrozenInputs
    ? sponsorPaidFeeQuoteIdsForAggregate.map(feeQuoteId =>
        frozenFeeQuoteInputsFromEligibleBundle.find(quote => quote?.id === feeQuoteId)
      )
    : []

const sponsorPaidFeeQuoteAggregateInputEligible = (quote) =>
  quote != null &&
  feeQuoteBindingHashValid(quote) &&
  quote.roundId === round.id &&
  quote.rulebookHash === round.rulebookHash &&
  quote.feePolicyVersion === round.feePolicyVersion &&
  quote.feePolicyHash === round.feePolicyHash &&
  quote.feePayer === "sponsor_paid" &&
  quote.sponsorFeeBackingHash === round.sponsorPoolSourceHash &&
  timestampEquals(quote.sourceCutoffAt, round.closesAt) &&
  isPositiveIntegerCents(quote.feeCents)

const sponsorPaidFeeQuoteAggregateInputsValid =
  finalSponsorBackingChecksEligible &&
  rawStringArrayValid(selectedClearedSponsorPaidFeeQuoteIdsForBindingRows) &&
  Array.isArray(frozenFeeQuoteInputsFromEligibleBundle) &&
  sponsorPaidFeeQuoteIdsUniqueInFrozenInputs &&
  sponsorPaidFeeQuotesForAggregate.length === sponsorPaidFeeQuoteIdsForAggregate.length &&
  sponsorPaidFeeQuotesForAggregate.every(sponsorPaidFeeQuoteAggregateInputEligible)

const aggregateSponsorPaidFeeCentsInt =
  sponsorPaidFeeQuoteAggregateInputsValid
    ? sumBigInt(sponsorPaidFeeQuotesForAggregate.map(quote => quote.feeCents))
    : 0n

const aggregateSponsorPaidFeeDemandRepresentable =
  aggregateSponsorPaidFeeCentsInt <= BigInt(Number.MAX_SAFE_INTEGER)

const sponsorPaidFeeSupportPoolEligible =
  sponsorPaidFeeQuoteAggregateInputsValid &&
  aggregateSponsorPaidFeeDemandRepresentable &&
  BigInt(finalFeeSupportBackingCents) >= aggregateSponsorPaidFeeCentsInt

finalBaseMatchBackingCents >= roundBaseMatchBudgetCents
finalBonusMatchBackingCents >= roundBonusBudgetCents
finalFailureBonusBackingCents >= roundFailureBonusBudgetCents
sponsorPaidFeeSupportPoolEligible
```

`round.sponsorPoolState` must be derived from these pool-specific checks; it must not be manually asserted as a substitute for them. If any advertised sponsor backing is lost before round open, the round cannot open under that advertised match schedule. If sponsor backing is lost after round open, freeze the round, publish an exception event, and let users withdraw or re-consent under a revised schedule.

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
  distinctnessPolicyVersion: string
  eligibilityPolicyVersion: string
}

type RoundMoralBucketSnapshot = {
  id: string
  roundId: string
  rulebookHash: string
  distinctnessPolicyVersion: string
  bucketIds: string[]
  reciprocalDistinctFromBucketIdsByBucketId: Record<string, string[]>
  asymmetricPairCount: number
  blockedAsymmetricPairs: Array<[string, string]>
  snapshotHash: string
  createdAt: string
}

type PublicGoodProject = {
  id: string
  roundId: string
  bucketId: string
  title: string
  summary: string
  goodType: "consensus" | "hybrid"
  scopeState: "valid_moral_public_good" | "review" | "private_benefit" | "political_campaign" | "lifestyle_trade" | "behavior_change_promise" | "threat_like_trade" | "blocked"
  excludedTradeType: null | "private_benefit" | "political_campaign" | "lifestyle_trade" | "behavior_change_promise" | "threat_like_trade"
  destinationType: "registered_nonprofit" | "fiscal_host" | "signed_auditable_route"
  destinationRef: string
  requestedMaxCents: number
  minimumViableCents: number
  thresholdAmountCents: number
  thresholdSupporterMin: number
  thresholdClusterMin: number
  reviewState: "draft" | "reviewing" | "approved" | "blocked" | "needs_evidence"
  challengeState: "none" | "open" | "resolved" | "non_blocking" | "blocking"
  antiThreatState: "clear" | "review" | "blocked"
  externalityState: "clear" | "review" | "blocked"
  baselineIntegrityState: "clear" | "review" | "blocked"
  baselineConfidenceState: "high" | "medium" | "low" | "unknown"
  actionEvidenceState: "adequate" | "provisional_nonblocking" | "review" | "blocked" | "missing"
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
  earlyFailureBonusCutoff: string
  deploymentMode: "shadow" | "capped_pilot" | "full"
  pilotMaxRoundGrossExposureCents: number | null
  pilotMaxParticipantGrossExposureCents: number | null
  deploymentAuditState: "not_required" | "required" | "passed" | "failed"
  deploymentAuditId: string | null
  deploymentAuditHash: string | null
  failureBonusPolicyVersion: string
  successRewardPolicyVersion: string
  feePolicyVersion: string
  feePolicyHash: string
  paymentReconciliationPathHash: string
  optimizationPolicyHash: string
  baseMatchBudgetCents: number
  bonusBudgetCents: number
  failureBonusBudgetCents: number
  successRewardBudgetCents: number
  successRewardRateBps: number
  successRewardMaxRateBps: number
  successRewardDominanceMode: "off" | "sponsor_backed"
  sealedPledgeMode: "blind_until_close" | "delayed_rounded_public" | "public_exact"
  impactCertificatePolicyHash: string
  donorCountedCapCents: number
  supporterCountMinNetPublicGoodCents: number
  identityWeightMinForCountingBps: number
  identityWeightMinForBonusBps: number
  minVerifiedSupportersDefault: number
  minActiveClustersDefault: number
  calculationVersion: string
  moralBucketSnapshotId: string
  moralBucketSnapshotHash: string
  clearingInputBundleId: string | null
  clearingInputBundleHash: string | null
  sponsorPoolSourceHash: string
  sponsorPoolState: "unverified" | "funded" | "escrowed" | "contractually_committed" | "lost" | "blocked"
  rulebookHash: string
  parametersFrozenAt: string | null
}

type DeploymentAudit = {
  id: string
  roundId: string
  auditKind: "shadow_to_pilot" | "pilot_to_full" | "shadow_or_pilot_to_full"
  targetDeploymentMode: "capped_pilot" | "full"
  auditState: "passed" | "failed"
  calculationVersion: string
  rulebookHash: string
  feePolicyHash: string
  sponsorPoolSourceHash: string
  paymentReconciliationPathHash: string
  optimizationPolicyHash: string
  solverMode: "ilp" | "deterministic_greedy"
  solverVersion: string
  priorRoundIds: string[]
  priorRoundAuditBundleHashes: string[]
  priorRoundDeploymentModes: Array<"shadow" | "capped_pilot">
  priorRoundPaymentReconciliationPathHashes: string[]
  priorRoundOutcomeStates: Array<"passed" | "failed" | "canceled" | "incident_review">
  auditorId: string
  auditHash: string
  createdAt: string
}

type CommonGroundBudget = {
  id: string
  participantId: string
  roundId: string
  totalBudgetCents: number
  perProjectCapCents: number
  budgetPeriod: "one_time" | "per_round" | "monthly"
  paymentMethodRef: string | null
  paymentMethodSavedAt: string | null
  paymentMethodCommitmentState: "none" | "provider_confirmed" | "requires_action" | "invalid" | "detached"
  paymentMethodConfirmedAt: string | null
  latestPaymentCommitmentSnapshotId: string | null
  fallbackRule: "refund" | "reroute" | "carry_forward" | "release_hold"
  visibilityDefault: "public" | "pseudonymous" | "aggregate_only" | "private"
  successRewardOptIn: boolean
  coordinationCreditOptIn: boolean
  impactCertificateOptIn: boolean
  rewardVisibilityPref: "public" | "pseudonymous" | "aggregate_only" | "private"
  sealedPledgeAcknowledgedAt: string | null
  recurringConsentVersion: string | null
  cancelUrl: string | null
  nextCaptureAt: string | null
  nextCaptureRule: string | null
  rulebookHashAtConsent: string | null
  canceledAt: string | null
  state: "draft" | "active" | "paused" | "expired" | "canceled"
}

type ProjectSupportStance = {
  id: string
  participantId: string
  commonGroundBudgetId: string
  roundId: string
  projectId: string
  stance: "strong" | "weak" | "dissent" | "abstain"
  maxAllocCents: number
  maxAllocBps: number | null
  rankOrder: number | null
  unrestrictedRoutingOptIn: boolean
  acceptableCounterBucketIds: string[]
  minCounterpartyVolumeCents: number // deprecated/non-authoritative mirror only; final clearing uses ConditionalTradeIntent.minCounterpartyVolumeCents
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
  samePaymentMethodClusterId: string | null
  sameControlEntityId: string | null
  countedWeightBps: number // safe integer 0..10_000; reject invalid writes or store invalid values as zero before eligibility use; never clamp invalid weights to a positive value
  reviewedAt: string | null
}

type PaymentCommitmentSnapshot = {
  id: string
  roundId: string
  participantId: string
  commonGroundBudgetId: string
  paymentMethodRef: string
  paymentMethodSavedAt: string
  paymentMethodCommitmentState: "provider_confirmed"
  paymentMethodConfirmedAt: string
  snapshotKind: "early_failure_bonus_cutoff" | "round_close" | "authorization_reconciliation"
  asOf: string
  providerEvidenceHash: string
  rulebookHash: string
  snapshotHash: string
  createdAt: string
}

type FeeQuote = {
  id: string
  roundId: string
  participantId: string
  commonGroundBudgetId: string
  projectId: string
  conditionalTradeIntentId: string
  feePolicyVersion: string
  feePolicyHash: string
  feePayer: "donor_deducted" | "sponsor_paid" | "waived"
  grossCapturedCents: number
  feeCents: number
  netRecipientDisbursedCents: number
  sponsorFeeBackingHash: string | null
  sponsorFeeBackedCents: number | null
  sourceCutoffAt: string
  rulebookHash: string
  quoteHash: string
  createdAt: string
}

type RoundClearingInputBundle = {
  id: string
  roundId: string
  rulebookHash: string
  calculationVersion: string
  feePolicyVersion: string
  feePolicyHash: string
  deploymentMode: "shadow" | "capped_pilot" | "full"
  pilotMaxRoundGrossExposureCents: number | null
  pilotMaxParticipantGrossExposureCents: number | null
  deploymentAuditState: "not_required" | "required" | "passed" | "failed"
  deploymentAuditId: string | null
  deploymentAuditHash: string | null
  paymentReconciliationPathHash: string
  optimizationPolicyHash: string
  bundleSchemaVersion: string
  snapshotKind: "round_close"
  sourceCutoffAt: string
  commonGroundBudgetInputHash: string
  supportStanceInputHash: string
  conditionalTradeIntentInputHash: string
  identityEligibilityInputHash: string
  projectInputHash: string
  paymentCommitmentSnapshotHash: string
  feeInputHash: string
  deploymentExposureInputHash: string
  moralBucketSnapshotId: string
  moralBucketSnapshotHash: string
  projectEligibilitySnapshotHash: string
  sponsorCommitmentInputHash: string
  successRewardInputHash: string
  coordinationCreditInputHash: string
  impactCertificateInputHash: string
  canonicalInputJsonRef: string
  canonicalInputJsonHash: string
  bundleHash: string
  createdAt: string
}

type ConditionalTradeIntent = {
  id: string
  participantId: string
  commonGroundBudgetId: string
  roundId: string
  projectId: string
  amountCents: number
  maxExposureCents: number
  acceptableCounterBucketIds: string[]
  minCounterpartyVolumeCents: number
  fallbackRule: "refund" | "reroute" | "carry_forward" | "release_hold" // v1 must match CommonGroundBudget.fallbackRule; mismatches fail closed until fresh consent
  visibilityPref: "public" | "pseudonymous" | "aggregate_only" | "private"
  successRewardOptIn: boolean
  coordinationCreditOptIn: boolean
  impactCertificateOptIn: boolean
  lockedAt: string | null
  rulebookHashAtConsent: string
  state: "draft" | "active" | "paused" | "expired" | "canceled"
  authorizationState: "none" | "payment_method_saved" | "authorized" | "captured" | "released" | "failed"
}

type OptimizationRunTrace = {
  id: string
  roundId: string
  clearingInputBundleId: string
  clearingInputBundleHash: string
  calculationVersion: string
  optimizationStage: "stage_3_coalition_clearing"
  traceSchemaVersion: string
  optimizationPolicyHash: string
  solverMode: "ilp" | "deterministic_greedy"
  solverVersion: string
  optimalityStatus: "optimal" | "deterministic_greedy_selected" | "timeout" | "infeasible" | "unknown" | "failed"
  optimizationInputHash: string
  objectiveVectorHash: string
  stableTieBreakTupleHash: string
  selectedCoalitionHash: string
  selectedAllocationRowsHash: string
  constraintSatisfactionHash: string
  optimizationTraceHash: string
  createdAt: string
}

type CoalitionClearanceResult = {
  id: string
  roundId: string
  projectId: string
  grossCapturedCents: number
  feeCents: number
  netRecipientClearedCents: number
  actualClearedCents: number // gross donor/sponsor exposure; do not use as net recipient threshold satisfaction when fees are deducted
  countedClearedCents: number
  matchEligibleClearedCents: number
  directClearedCents: number // deprecated alias for actualClearedCents; do not use for sponsor-match claims or net-recipient threshold checks
  baseMatchCents: number
  bonusMatchCents: number
  failureBonusCents: number
  successRewardCents: number
  coordinationCreditUnits: number
  impactCertificateUnits: number
  failureReason: "none" | "threshold_amount_shortfall" | "verified_supporter_shortfall" | "active_cluster_shortfall" | "counterparty_volume_shortfall" | "review_not_approved" | "challenge_blocked" | "safety_blocked" | "anti_threat_blocked" | "destination_failed" | "project_identity_route_blocked" | "project_scope_blocked" | "externality_blocked" | "conflict_blocked" | "sponsor_pool_lost" | "rulebook_mismatch" | "fallback_rule_mismatch" | "missing_consent" | "zero_exposure" | "fee_policy_blocked" | "legal_custody_blocked" | "identity_blocked" | "authorization_failed" | "user_canceled"
  finalPayoutPlanCents: number
  activeSupportersCount: number
  activeClustersCount: number
  qfRaw: number // reporting alias only; final allocation uses qfRawFixed
  qfAdjusted: number // reporting alias only; final allocation uses bonusScoreUnits
  qfRawFixed: string
  qfAdjustedFixed: string
  bonusScoreUnits: string // canonical decimal string of non-negative integer score units; allocation parses as BigInt
  bonusScoreHash: string
  diversityFactor: number
  antiManipulationDiscount: number
  calculationHash: string
}

type SponsorCommitment = {
  id: string
  roundId: string
  sponsorId: string
  poolType: "base_match" | "bonus_match" | "failure_bonus" | "success_reward" | "fee_support"
  committedCents: number
  fundedCents: number
  commitmentState: "draft" | "contractually_committed" | "funded" | "escrowed" | "revoked" | "expired"
  backingConfirmedAt: string | null
  sourceHash: string
  publishedAt: string | null
}

type ConflictReview = {
  id: string
  objectType: "project" | "recipient" | "sponsor" | "reviewer" | "proposer" | "fiscal_host"
  objectId: string
  roundId: string
  conflictState: "clear" | "disclosed_nonblocking" | "review" | "blocked"
  reviewerId: string | null
  publicSummary: string | null
  reviewedAt: string | null
}

type FailureBonusClaimantConflictSnapshot = {
  id: string
  snapshotKind: "failure_bonus_claimant_conflict"
  roundId: string
  projectId: string
  participantId: string
  commonGroundBudgetId: string
  conditionalTradeIntentId: string
  rulebookHash: string
  failureBonusPolicyVersion: string
  sourceCutoffAt: string
  conflictState: "no_conflict" | "project_proposer" | "recipient_affiliate" | "fiscal_host_affiliate" | "sponsor_affiliate" | "reviewer_affiliate" | "same_control_affiliate" | "unknown"
  snapshotHash: string
  createdAt: string
}

type ProjectRoundEligibilitySnapshot = {
  id: string
  roundId: string
  projectId: string
  rulebookHash: string
  snapshotKind: "round_open"
  sourceCutoffAt: string
  wasReviewApprovedAtRoundOpen: boolean
  wasChallengeNonBlockingAtRoundOpen: boolean
  wasDestinationVerifiedAtRoundOpen: boolean
  wasProjectIdentityAndRouteValidAtRoundOpen: boolean
  wasBaselineAndActionEvidenceValidAtRoundOpen: boolean
  wasAntiThreatClearAtRoundOpen: boolean
  wasExternalityClearAtRoundOpen: boolean
  wasConflictNonBlockingAtRoundOpen: boolean
  wasSponsorBackedAtRoundOpen: boolean
  snapshotHash: string
  createdAt: string
}

type FailureBonusClaim = {
  id: string
  roundId: string
  projectId: string
  participantId: string
  claimantProjectConflictSnapshotId: string
  claimantProjectConflictState: "no_conflict" | "project_proposer" | "recipient_affiliate" | "fiscal_host_affiliate" | "sponsor_affiliate" | "reviewer_affiliate" | "same_control_affiliate" | "unknown"
  claimantProjectConflictHash: string
  claimantProjectConflictSourceCutoffAt: string
  commonGroundBudgetId: string
  failureBonusPolicyVersion: string
  conditionalTradeIntentId: string
  failureReason: "threshold_amount_shortfall" | "verified_supporter_shortfall" | "active_cluster_shortfall" | "counterparty_volume_shortfall"
  failedQualifiedMatchEligibleCents: number
  projectRoundEligibilitySnapshotId: string
  projectRoundEligibilitySnapshotHash: string
  clearingInputBundleId: string
  clearingInputBundleHash: string
  paymentCommitmentSnapshotId: string
  paymentCommitmentSnapshotHash: string
  paymentMethodSavedAt: string
  paymentMethodCommitmentState: "provider_confirmed"
  paymentMethodConfirmedAt: string
  earlyFailureBonusCutoff: string
  rawBonusCents: number
  participantRoundCapCents: number
  participantCappedProvisionalBonusCents: number
  prorationFactorBps: number
  bonusCents: number
  eligibilityInputsHash: string
  claimState: "pending" | "approved" | "paid" | "credited" | "denied" | "expired"
  denialReason: string | null
  payoutRef: string | null
  createdAt: string
  resolvedAt: string | null
}

type ContributorSuccessRewardClaim = {
  id: string
  roundId: string
  projectId: string
  participantId: string
  commonGroundBudgetId: string
  conditionalTradeIntentId: string
  successRewardPolicyVersion: string
  clearingInputBundleId: string
  clearingInputBundleHash: string
  paymentCommitmentSnapshotId: string
  paymentCommitmentSnapshotHash: string
  feeQuoteId: string
  feeQuoteHash: string
  claimantConflictSnapshotId: string
  claimantConflictState: "no_conflict" | "project_proposer" | "recipient_affiliate" | "fiscal_host_affiliate" | "sponsor_affiliate" | "reviewer_affiliate" | "same_control_affiliate" | "unknown"
  capturedGrossCents: number
  netRecipientDisbursedCents: number
  matchEligibleCents: number
  rawRewardCents: number
  proratedRewardCents: number
  prorationFactorBps: number
  claimState: "pending" | "approved" | "paid" | "credited" | "denied" | "expired"
  denialReason: string | null
  payoutRef: string | null
  rewardInputsHash: string
  createdAt: string
  resolvedAt: string | null
}

type CoordinationCreditLedgerEntry = {
  id: string
  roundId: string
  projectId: string
  participantId: string
  commonGroundBudgetId: string
  conditionalTradeIntentId: string
  sourceClaimId: string | null
  creditUnits: number
  creditKind: "successful_captured_contribution"
  transferable: false
  creditPolicyVersion: string
  entryHash: string
  createdAt: string
}

type ImpactCertificateClaim = {
  id: string
  roundId: string
  projectId: string
  participantId: string
  commonGroundBudgetId: string
  conditionalTradeIntentId: string
  certificateUnits: number
  certificatePolicyHash: string
  netRecipientDisbursedCents: number
  clearingInputBundleId: string
  clearingInputBundleHash: string
  paymentCommitmentSnapshotId: string
  paymentCommitmentSnapshotHash: string
  feeQuoteId: string
  certificateHash: string
  transferState: "nontransferable_v1" | "transfer_disabled" | "transfer_enabled_by_future_rulebook"
  createdAt: string
}


// Non-persistent educational DTOs. These do not enter final clearing bundles.
type PivotalityCalculatorRequest = {
  contributionCents: number
  thresholdCents: number
  valueRatio: string
  pSuccessWithoutMe: string
  userEstimatedPDecisive: string
  signerOnlyRewardValue: string
  nonDecisiveExtraFundingValueFraction: string
  calculatorSurface: "advanced_explainer" | "shadow_simulation" | "post_round_analysis" | "project_card_educational_drawer"
}

type PivotalityCalculatorResult = {
  requiredPDecisive: string | "impossible"
  userEstimatedPDecisive: string
  inputValid: boolean
  validationErrors: string[]
  comparisonResult: "pledge_best_under_model" | "pledge_not_best_under_model" | "impossible_under_inputs" | "invalid_input"
  noSideEffect: true
  liveRoundDataUsed: false
}

type CustodyAuthorization = {
  id: string
  roundId: string
  participantId: string
  projectId: string
  provider: "stripe" | "fiscal_host" | "escrow_partner" | "manual_external"
  providerRef: string
  requiredAmountCents: number
  authorizedAmountCents: number
  capturedAmountCents: number
  expectedCaptureBy: string | null
  authExpiresAt: string | null
  authorizationAttemptedAt: string | null
  authorizationFailureReason: string | null
  clearingIteration: number
  custodyState: "none" | "authorized" | "captured" | "released" | "expired" | "canceled" | "failed"
}

type AuthorizationReconciliationEvent = {
  id: string
  roundId: string
  clearingIteration: number
  participantId: string
  projectId: string
  conditionalTradeIntentId: string
  custodyAuthorizationId: string | null
  requiredAmountCents: number
  authorizedAmountCents: number
  authExpiresAt: string | null
  expectedCaptureBy: string | null
  reconciliationState: "authorized_exact" | "removed_authorization_failed" | "removed_wrong_amount" | "removed_short_expiry" | "removed_expired"
  removedActualCents: number
  removedCountedCents: number
  removedMatchEligibleCents: number
  reasonCode: string
  eventHash: string
  createdAt: string
}

type RoundAuditBundle = {
  id: string
  roundId: string
  inputsHash: string
  clearingInputBundleId: string
  clearingInputBundleHash: string
  canonicalInputJsonHash: string
  projectInputHash: string
  sponsorCommitmentInputHash: string
  successRewardInputHash: string
  coordinationCreditLedgerHash: string
  impactCertificateClaimHash: string
  moralBucketSnapshotHash: string
  eligibilitySnapshotHash: string
  paymentCommitmentSnapshotHash: string
  feeInputHash: string
  deploymentExposureInputHash: string
  feePolicyHash: string
  paymentReconciliationPathHash: string
  deploymentAuditHash: string | null
  optimizationPolicyHash: string
  optimizationTraceId: string
  optimizationTraceHash: string
  calculationHash: string
  clearanceResultsHash: string
  payoutHash: string
  bonusScoreHash: string
  authorizationReconciliationHash: string
  authorizationReconciliationEventHash: string
  clearingIteration: number
  exceptionLogHash: string
  publicReportRef: string
}
```

### 12.1 Snapshot and Bundle Integrity Constraints

Enforce these database/application uniqueness and integrity constraints before any final clearing or failure-bonus payout can run:

```text
unique PaymentCommitmentSnapshot(roundId, commonGroundBudgetId, snapshotKind)
unique RoundMoralBucketSnapshot(roundId)
RoundMoralBucketSnapshot.snapshotHash must pass the canonical hash predicate and be reproducible from canonical serialized bucket-snapshot fields: roundId, rulebookHash, distinctnessPolicyVersion, bucketIds, reciprocalDistinctFromBucketIdsByBucketId, asymmetricPairCount, blockedAsymmetricPairs, and createdAt. The reusable `roundMoralBucketSnapshotBindingHashValid(...)` predicate itself must reject blank or whitespace-padded round identity, malformed rulebook hash, missing or whitespace-padded distinctness-policy version, malformed raw bucket arrays, malformed reciprocal-map keys or values, malformed asymmetric-pair counts, and malformed blocked-pair arrays before canonicalization. The frozen bucket graph must also be well-formed: bucket IDs and reciprocal-map values are valid duplicate-free string arrays, reciprocal-map keys match the bucket IDs, all referenced buckets are known, no bucket is distinct from itself, all distinctness edges are symmetric, `asymmetricPairCount === 0`, and `blockedAsymmetricPairs` is a valid empty pair array before counterparty validation.
unique RoundClearingInputBundle(roundId, snapshotKind, calculationVersion)
unique PublicGoodProject(roundId, id) within the round-close project input bundle
unique CommonGroundBudget(roundId, id) within the round-close common-ground-budget input bundle
unique CommonGroundBudget(roundId, participantId) within the round-close common-ground-budget input bundle
unique IdentityEligibility(roundId, participantId) within the round-close identity input bundle
unique ProjectRoundEligibilitySnapshot(roundId, projectId)
unique bundle-selected ProjectSupportStance(roundId, commonGroundBudgetId, projectId)
unique clearing-eligible ConditionalTradeIntent(roundId, commonGroundBudgetId, projectId)
unique FeeQuote(roundId, id) and unique FeeQuote(roundId, commonGroundBudgetId, projectId, conditionalTradeIntentId) within the round-close fee input bundle
unique FailureBonusClaim(roundId, projectId, participantId, conditionalTradeIntentId)
unique ContributorSuccessRewardClaim(roundId, projectId, participantId, conditionalTradeIntentId)
unique CoordinationCreditLedgerEntry(roundId, projectId, participantId, conditionalTradeIntentId, creditKind)
unique ImpactCertificateClaim(roundId, projectId, participantId, conditionalTradeIntentId)
unique AuthorizationReconciliationEvent(roundId, clearingIteration, participantId, projectId, conditionalTradeIntentId, custodyAuthorizationId, reconciliationState)

PaymentCommitmentSnapshot.paymentMethodRef must be a non-empty trim-stable non-whitespace string before the snapshot can affect binding final clearing or failure-bonus qualification. PaymentCommitmentSnapshot.paymentMethodCommitmentState must be exactly `provider_confirmed`; paymentMethodSavedAt, paymentMethodConfirmedAt, asOf, and createdAt must be canonical UTC timestamps; and the payment-method timeline must satisfy `paymentMethodSavedAt <= paymentMethodConfirmedAt <= asOf` before the snapshot can affect binding final clearing or failure-bonus qualification.
PaymentCommitmentSnapshot.snapshotKind must be one of `early_failure_bonus_cutoff`, `round_close`, or `authorization_reconciliation`; roundId, participantId, and commonGroundBudgetId must be non-empty trim-stable non-whitespace strings; and rulebookHash must pass the canonical hash predicate before the snapshot can affect binding final clearing, counterparty-volume satisfaction, sponsor-match eligibility, authorization, or failure-bonus qualification.
PaymentCommitmentSnapshot.providerEvidenceHash must pass the canonical hash predicate and be included in PaymentCommitmentSnapshot.snapshotHash. PaymentCommitmentSnapshot.snapshotHash must be reproducible from canonical serialized snapshot fields: snapshotKind, roundId, participantId, commonGroundBudgetId, paymentMethodRef, paymentMethodSavedAt, paymentMethodCommitmentState, paymentMethodConfirmedAt, asOf, providerEvidenceHash, rulebookHash, and createdAt.
FeeQuote rows used for positive final-clearing allocation or selected sponsor-paid fee-support aggregation must be unique for both `(roundId, id)` and `(roundId, commonGroundBudgetId, projectId, conditionalTradeIntentId)` inside the round-close fee input bundle. `FeeQuote.feePolicyHash` must equal `round.feePolicyHash`, pass the canonical hash predicate, and be included with `feePolicyVersion` in `FeeQuote.quoteHash`; a quote bound only to a policy version cannot determine gross, fee, net-recipient, counted, match-eligible, authorization, payout, or audit outputs. Waived-fee quotes must have `feeCents === 0`; donor-deducted quotes must satisfy `netRecipientDisbursedCents === grossCapturedCents - feeCents`; sponsor-paid quotes must satisfy `netRecipientDisbursedCents === grossCapturedCents` and must not create donor match credit for the fee cents.
ProjectRoundEligibilitySnapshot.snapshotHash must pass the canonical hash predicate and be reproducible from canonical serialized fields covering snapshotKind, sourceCutoffAt, roundId, projectId, rulebookHash, all round-open eligibility booleans, and createdAt. The reusable `projectRoundEligibilitySnapshotBindingHashValid(...)` predicate itself must reject snapshot kinds other than `round_open`, blank or whitespace-padded round/project identifiers, malformed rulebook hashes, malformed source-cutoff or creation timestamps, and non-boolean round-open eligibility fields before canonicalization. Each round-open eligibility field must be an exact boolean, and each required eligibility field must be exactly `true` before threshold-family failure-bonus project eligibility can pass; `sourceCutoffAt` must equal `round.opensAt`, and the binding-hash predicate must pass before failure-bonus project eligibility or failure-bonus qualification.
SponsorCommitment input arrays must be arrays and each counted SponsorCommitment row must be a present object before it can contribute to `sponsorBackedCentsForFinalClearing(poolType)` or `sponsorBackedCentsForPreview(poolType, previewAsOf)`. `poolType` may be `base_match`, `bonus_match`, `failure_bonus`, `success_reward`, or `fee_support`; commitments for one pool type must never back another pool type. Sponsor-paid fees may use only `fee_support` commitments, success rewards may use only `success_reward` commitments, and aggregate sponsor-paid fee or success-reward cents must not exceed the corresponding backed pool. Missing arrays, null rows, malformed rows, and rows whose `sourceHash` fails the canonical hash predicate count as `0`. SponsorCommitment.committedCents and fundedCents must both be non-negative safe-integer cents for every counted positive commitment state; negative, fractional, NaN, or otherwise invalid amounts in either field count the commitment as `0` and block preview/final backing until corrected. Preview and final sponsor-backed pool sums must accumulate eligible commitment amounts as exact `BigInt` values before safe-cent conversion; unsafe aggregate sponsor-backed sums fail closed to `0` unless a versioned exact-integer comparison path explicitly supports larger values. `SponsorCommitment.publishedAt` and `SponsorCommitment.backingConfirmedAt` must be non-empty canonical UTC timestamps no later than both `round.parametersFrozenAt` and `round.opensAt`; for preview/advertisement they must also be no later than the canonical `previewAsOf` timestamp. Late, post-freeze, future-dated-for-preview, malformed, or missing timing evidence counts as `0` for preview/final sponsor-backed calculations.
DeploymentAudit rows selected for audit-backed `capped_pilot` or `full` deployment must be unique by `(roundId, targetDeploymentMode, calculationVersion, auditHash)` and must pass `deploymentAuditBindingHashValid(...)`. The selected audit id and hash must match `round.deploymentAuditId` and `round.deploymentAuditHash`; `auditKind` must be coherent with `targetDeploymentMode`; `optimizationPolicyHash`, `solverMode`, and `solverVersion` must match the frozen round optimization policy and selected Stage 3 trace; prior round ids, prior audit-bundle hashes, prior deployment modes, prior payment/reconciliation path hashes, and prior outcome states must be equal-length duplicate-free/valid trim-stable arrays bound into `auditHash`; prior round ids must not include the current round; every cited prior outcome must be exactly `passed`; `pilot_to_full` audits must contain only capped-pilot prior modes; and wrong-round, wrong-target-mode, wrong-audit-kind, wrong-version, wrong-rulebook, wrong-fee-policy, wrong-sponsor-input, wrong-payment-path, wrong-optimization-policy, wrong-solver-mode, shadow-only full-deployment evidence, post-freeze-audit, failed/canceled/incident-review prior outcome, missing-prior-evidence, blank-auditor, malformed, or merely canonical-looking deployment audit rows cannot unlock audit-backed capped-pilot or full deployment.

RoundClearingInputBundle.commonGroundBudgetInputHash, supportStanceInputHash, conditionalTradeIntentInputHash, identityEligibilityInputHash, paymentCommitmentSnapshotHash, feeInputHash, feePolicyHash, deploymentExposureInputHash, projectInputHash, projectEligibilitySnapshotHash, sponsorCommitmentInputHash, successRewardInputHash, coordinationCreditInputHash, impactCertificateInputHash, canonicalInputJsonHash, moralBucketSnapshotHash, optimizationPolicyHash, and bundleHash must pass the canonical hash predicate and be reproducible from canonical serialized inputs.
OptimizationRunTrace rows selected for binding Stage 3 clearing must be unique by `(roundId, clearingInputBundleId, calculationVersion, optimizationStage)` and must pass `optimizationRunTraceBindingHashValid(...)`. `OptimizationRunTrace.optimizationTraceHash` must be reproducible from canonical serialized fields covering trace id, round id, clearing input bundle id/hash, calculation version, optimization stage, trace schema version, optimization policy hash, solver mode/version, optimality status, optimization input hash, objective-vector hash, stable tie-break tuple hash, selected coalition hash, selected allocation rows hash, constraint satisfaction hash, and createdAt. `selectedAllocationRowsHash` must cover the exact selected per-row gross-captured, fee, net-recipient, actual/gross exposure, counted, match-eligible, base-match-claim, bonus-score-unit, and failure-bonus-relevant quantities; `constraintSatisfactionHash` must cover every hard constraint and cross-view counterparty constraint checked after selection. RoundAuditBundle must store the selected trace id and hash.
 The reusable `roundClearingInputBundleBindingHashValid(...)` predicate itself must reject blank or whitespace-padded bundle id / round id, malformed rulebook hash, missing or whitespace-padded fee policy version, malformed fee policy hash, malformed deployment mode, deployment-mode-incompatible pilot caps, malformed deployment audit state, malformed deployment audit id/hash fields, malformed payment/reconciliation path hash, malformed optimization policy hash, missing or whitespace-padded calculation version, missing or whitespace-padded bundle schema version, any snapshot kind other than `round_close`, malformed source-cutoff or creation timestamps, malformed component hashes, missing or whitespace-padded moral-bucket snapshot id, malformed moral-bucket snapshot hash, missing or whitespace-padded canonical-input ref, or malformed canonical-input hash before canonicalization. `RoundClearingInputBundle.sourceCutoffAt` and `createdAt` must be canonical UTC timestamps. `RoundClearingInputBundle.bundleHash` must bind id, roundId, rulebookHash, feePolicyVersion, feePolicyHash, deploymentMode, pilotMaxRoundGrossExposureCents, pilotMaxParticipantGrossExposureCents, deploymentAuditState, deploymentAuditId, deploymentAuditHash, paymentReconciliationPathHash, optimizationPolicyHash, calculationVersion, bundleSchemaVersion, snapshotKind, sourceCutoffAt, every component hash, moralBucketSnapshotId, moralBucketSnapshotHash, canonicalInputJsonRef, canonicalInputJsonHash, and createdAt; `bundleSchemaVersion`, `calculationVersion`, `feePolicyVersion`, `id`, `roundId`, `moralBucketSnapshotId`, and `canonicalInputJsonRef` must be non-empty trim-stable non-whitespace strings.
RoundClearingInputBundle.projectInputHash must cover all project economic and matching terms used in clearing, including requested caps, minimum viable amounts, threshold amounts, supporter/cluster thresholds, base-match ratios, bonus-cap multiples, and project bucket IDs. RoundClearingInputBundle.sponsorCommitmentInputHash must cover every frozen sponsor-commitment input used for final backing, including pool type, state, committed/funded cents, sourceHash, publishedAt, and backingConfirmedAt.
MpgfRound opensAt, reviewFreezeAt, earlyFailureBonusCutoff, closesAt, and challengeDeadline must be canonical UTC timestamps and must satisfy `opensAt <= earlyFailureBonusCutoff <= reviewFreezeAt < closesAt`, `opensAt < reviewFreezeAt`, and `closesAt < challengeDeadline`; otherwise the round cannot lock, clear, authorize, match, or qualify failure bonuses. `MpgfRound.rulebookHash`, `sponsorPoolSourceHash`, and `paymentReconciliationPathHash` must pass the canonical hash predicate; `calculationVersion` and `failureBonusPolicyVersion` must be non-empty trim-stable non-whitespace strings; and `parametersFrozenAt` must be a canonical UTC timestamp no later than `opensAt` before the round can lock, clear, authorize, match, or qualify failure bonuses.
PublicGoodProject requestedMaxCents, minimumViableCents, thresholdAmountCents, thresholdSupporterMin, and thresholdClusterMin must be valid integer fields before the project can clear; malformed, negative, fractional, or NaN project economic terms block clearing and must be reported as validation failures. PublicGoodProject goodType, destinationType, bucketId, and destinationRef must be valid before the project can clear; the project bucket must appear in the frozen round moral-bucket snapshot, and malformed project identity or destination-route fields block clearing rather than being inferred from status enums. PublicGoodProject baselineIntegrityState, baselineConfidenceState, and actionEvidenceState must also pass the deployment-mode-specific baseline/action-evidence gate before any binding clearing, matching, authorization, payout, or failure-bonus qualification; malformed, blocked, missing, low-confidence binding, or merely review-state evidence cannot be inferred from broad review approval.
CommonGroundBudget, ProjectSupportStance, ConditionalTradeIntent, round donor-counted caps, round base-match / bonus-match / failure-bonus budget fields, and bundle-derived allocator-state cent fields used in allocation or payout must be integer cents with non-negative caps and positive required spend/exposure fields; malformed, negative, fractional, or NaN monetary fields must not produce negative or fractional allocation or payout outputs. Any multiplication or multiply-then-divide step over cent, count, basis-point, or integer score-unit values must use exact BigInt or pinned fixed-point helpers; intermediate products that would exceed JavaScript safe-integer range must not be computed as JavaScript numbers. Bundle-derived allocator-state maps for participant remaining budget and project remaining requested cap must be keyed by `(roundId, participantId)` and `(roundId, projectId)`; wrong-round or missing allocator-state rows resolve to `0` before candidate allocation. CommonGroundBudget.budgetPeriod must be one of `one_time`, `per_round`, or `monthly`; `fallbackRule` must be one of `refund`, `reroute`, `carry_forward`, or `release_hold`; recurring budgets must have a non-empty trim-stable recurring-consent version, canonical `nextCaptureAt`, and non-empty trim-stable `nextCaptureRule` before allocation.
Bundle-derived PublicGoodProject rows must match `round.id` and expose trim-stable non-empty `id` and `bucketId` values before hard gates, candidate allocation, counterparty-bucket lookup, matching, authorization, payout, or failure-bonus qualification. There must be at most one bundle-derived PublicGoodProject row for each `(roundId, id)` in the round-close input bundle; duplicate project rows fail closed rather than being resolved by arbitrary row ordering. Bundle-derived CommonGroundBudget rows must match `round.id`, expose trim-stable `id` and participant ID values, and be unique for both `(roundId, id)` and `(roundId, participantId)` before final clearing or failure-bonus qualification. Bundle-derived ProjectSupportStance rows must be absent/default-abstain or match the current round, Common Ground Budget, participant, and project, and expose a trim-stable non-empty `id`, before they can expose allocatable support, caps, rank order, or counterparty buckets. Bundle-derived ConditionalTradeIntent rows must match the current Common Ground Budget, round, project, and participant, and expose a trim-stable non-empty `id`, before they can expose allocation, fallback, counterparty, authorization, or failure-bonus authority. There must be at most one bundle-selected support stance, at most one clearing-eligible conditional intent, and at most one bundle-derived FeeQuote for each `(roundId, commonGroundBudgetId, projectId)` / `(roundId, commonGroundBudgetId, projectId, conditionalTradeIntentId)` key in the round-close input bundle; duplicates fail closed rather than being resolved by arbitrary row ordering. Bundle-derived IdentityEligibility rows must match the current round and participant and must be unique for `(roundId, participantId)` before they can count, match, satisfy counterparty volume, or qualify a failure bonus. Round-close and early-cutoff `PaymentCommitmentSnapshot` rows and round-open `ProjectRoundEligibilitySnapshot` rows must also pass formula-level row-count uniqueness guards before selection; payment-snapshot row-count and lookup guards must be keyed by `(roundId, commonGroundBudgetId, snapshotKind)`, project-eligibility row-count and lookup guards must be keyed by `(roundId, projectId)`, and duplicate selected payment or project-eligibility snapshots fail closed rather than being resolved by arbitrary row ordering. Wrong-round, wrong-project, wrong-participant, wrong-budget, cross-budget participant, missing-project, duplicate Common Ground Budget/identity/payment/project-eligibility/support-stance/intent, or wrong-round-project rows fail closed and contribute zero.
ConditionalTradeIntent.minCounterpartyVolumeCents must be positive integer cents and `acceptableCounterBucketIds` must be a valid duplicate-free trim-stable non-whitespace string array before any cross-view intent can clear; malformed, duplicate, or whitespace-only arrays are treated as empty. ConditionalTradeIntent.authorizationState must be one of `none`, `payment_method_saved`, or `authorized` and `fallbackRule` must be one of `refund`, `reroute`, `carry_forward`, or `release_hold` before the intent can clear; `captured`, `released`, `failed`, or malformed authorization states cannot expose new allocation authority.
ProjectSupportStance.acceptableCounterBucketIds must also be a valid duplicate-free trim-stable non-whitespace string array before it can expose counterparty buckets; malformed, duplicate, or whitespace-only arrays are treated as empty.
ProjectSupportStance.maxAllocBps must be either null or an integer basis-point field in `[0, 10_000]`; malformed or out-of-range basis-point caps make the affected candidate row allocate zero.
ProjectSupportStance.minCounterpartyVolumeCents is a deprecated/non-authoritative mirror and must not be used for final clearing; the authoritative threshold is ConditionalTradeIntent.minCounterpartyVolumeCents.
Round identity threshold bps fields must be integer values in `[0, 10_000]`; malformed round threshold fields fail closed and cannot unlock counting or matching.
IdentityEligibility.countedWeightBps must be a safe integer in `[0, 10_000]`; malformed, fractional, NaN, unsafe, or out-of-range identity weights count as `0` before all counting, matching, counterparty-volume, and failure-bonus checks. Non-null `linkedAccountClusterId`, `samePaymentMethodClusterId`, and `sameControlEntityId` values must be trim-stable non-whitespace strings before they can appear in the frozen identity input bundle; malformed cluster identifiers fail closed for counterparty-volume satisfaction.
Project baseMatchRatioBps and bonusCapMultipleBps must be null/default or integer basis-point fields in `[0, 100_000]`; malformed or out-of-range non-null project match bps values count as `0` for the affected match calculation.
Failure-bonus advertisement requires a valid sponsor-budget cap predicate and full preview/opening sponsor backing: `roundFailureBonusBudgetCents > 0`, `totalSponsorBudgetCentsInt > 0n`, `BigInt(roundFailureBonusBudgetCents) * 20n <= totalSponsorBudgetCentsInt`, and `sponsorBackedCentsForPreview("failure_bonus", previewAsOf) >= roundFailureBonusBudgetCents` before round open. Failure-bonus qualification and payout require the same sponsor-budget cap predicate plus full final frozen sponsor backing: `finalFailureBonusBackingCents >= roundFailureBonusBudgetCents`; otherwise the backed available failure-bonus pool is `0`, the `qualified` predicate is false, and no claim may qualify or pay.
Success-reward advertisement requires a valid `successRewardPolicyVersion`, valid success-reward bps fields, `roundSuccessRewardBudgetCents > 0`, and preview/opening sponsor backing from `sponsorBackedCentsForPreview("success_reward", previewAsOf)` before round open. Success-reward qualification and payout require full final frozen sponsor backing for the advertised `success_reward` pool; otherwise success-reward claims resolve to `0`/denied and no coordination credits or impact certificates may be issued from the same invalid reward path. Dominance-mode reward claims require full backing of maximum possible liability, not merely expected liability.
FailureBonusClaim.failedQualifiedMatchEligibleCents and every `failedQualifiedMatchEligibleCentsByClaimId[claimId]` value used for raw-bonus calculation, participant-round cap aggregation, aggregate provisional totals, eligibility-input hashing, claim creation, claim approval, crediting, payment, or proration must be positive safe-integer cents before use. Missing, zero, negative, fractional, unsafe, string-coerced, NaN, or malformed values deny qualification and resolve to `0` before any `BigInt` conversion, hash construction, claim storage, or payout arithmetic.
Bonus-scoring inputs must fail closed: invalid cluster-share distributions produce `clusterDiversityFixed = "0.000000000000"`, and invalid project collusion-risk scores produce `safeCollusionRiskScoreFixed = "1.000000000000"` before anti-manipulation discounting.
AuthorizationReconciliationEvent rows selected for audit or payout reconciliation must be unique for each `(roundId, clearingIteration, participantId, projectId, conditionalTradeIntentId, custodyAuthorizationId, reconciliationState)`. `AuthorizationReconciliationEvent.id`, `roundId`, `participantId`, `projectId`, and `conditionalTradeIntentId` must be non-empty trim-stable strings, and `custodyAuthorizationId` must be either `null` or a non-empty trim-stable string, before the event can remove a row or enter an audit bundle. `AuthorizationReconciliationEvent.eventHash` must pass the canonical hash predicate and be reproducible from canonical serialized event fields covering id, roundId, clearingIteration, participantId, projectId, conditionalTradeIntentId, custodyAuthorizationId, required/authorized/removed cent amounts, authExpiresAt, expectedCaptureBy, reconciliationState, reasonCode, and createdAt. CustodyAuthorization records that keep a row payable must have non-empty trim-stable `id`, `roundId`, `participantId`, and `projectId` fields matching the current payable row, a valid provider enum, non-empty trim-stable `providerRef`, `custodyState === "authorized"`, non-negative safe-integer required/authorized/captured cents, exact required-vs-authorized amount coverage, `capturedAmountCents === 0` before capture, canonical authorizationAttemptedAt / expectedCaptureBy / authExpiresAt timestamps, and `expectedCaptureBy <= authExpiresAt`; otherwise the affected row must be removed and recleared before capture or release.
```

For every deterministic stable order used in rounding or proration, compute the ordering key as:

```ts
stableOrderKey = sha256(canonicalJson(tupleFields))
```

where `canonicalJson` means UTF-8 JSON with sorted object keys, no insignificant whitespace, integer cents as integers, timestamps as ISO strings, and tuple fields listed explicitly in the relevant calculation version.

At round lock, freeze the moral-bucket distinctness graph into `round.moralBucketSnapshotHash`. For every bucket pair `(a, b)`, the rulebook may treat them as distinct only if `b` appears in `a.distinctFromBucketIds` and `a` appears in `b.distinctFromBucketIds`; otherwise the pair is non-distinct for that round and cannot satisfy cross-view counterparty conditions.

---

## 13. Allocation Pipeline

Implement a deterministic, versioned clearing pipeline.

### Stage 1: Hard Gates

A project is eligible for clearing only if all safety, destination, conflict, sponsor, and round-timeline gates are satisfied:

```ts
const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const isPositiveIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value > 0

const isNonNegativeInteger = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const isCanonicalUtcTimestamp = (value: string | null | undefined) =>
  isNonEmptyString(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value

const timestampLte = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) <= Date.parse(b)

const timestampLt = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) < Date.parse(b)

const timestampEquals = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  a === b

const isNonWhitespaceStringValue = (item: unknown) =>
  typeof item === "string" && item.trim().length > 0 && item === item.trim()

const rawStringArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(isNonWhitespaceStringValue) &&
  new Set(value).size === value.length

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter(isNonWhitespaceStringValue))].sort()
    : []

const roundTimelineValid =
  timestampLt(round.opensAt, round.reviewFreezeAt) &&
  timestampLte(round.opensAt, round.earlyFailureBonusCutoff) &&
  timestampLte(round.earlyFailureBonusCutoff, round.reviewFreezeAt) &&
  timestampLt(round.reviewFreezeAt, round.closesAt) &&
  timestampLt(round.closesAt, round.challengeDeadline)

const bindingFinalResultStatuses = [
  "cleared",
  "payable",
  "released",
  "closed",
] as const

const authorizationSideEffectStatuses = ["cleared"] as const
const capturePayoutFallbackSideEffectStatuses = ["payable"] as const
const finalAuditReplayStatuses = ["released", "closed"] as const

const bindingResultStatusEligible =
  bindingFinalResultStatuses.includes(round.status as any)

const authorizationSideEffectStatusEligible =
  authorizationSideEffectStatuses.includes(round.status as any)

const capturePayoutFallbackSideEffectStatusEligible =
  capturePayoutFallbackSideEffectStatuses.includes(round.status as any)

const finalAuditReplayStatusEligible =
  finalAuditReplayStatuses.includes(round.status as any)

const roundStatusEligible =
  bindingResultStatusEligible

const validDeploymentModes = ["shadow", "capped_pilot", "full"] as const
const validDeploymentAuditKinds = ["shadow_to_pilot", "pilot_to_full", "shadow_or_pilot_to_full"] as const
const validPriorDeploymentModes = ["shadow", "capped_pilot"] as const
const validPriorDeploymentOutcomeStates = [
  "passed",
  "failed",
  "canceled",
  "incident_review",
] as const

const rawPriorDeploymentModeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(mode => validPriorDeploymentModes.includes(mode as any))

const rawPriorDeploymentOutcomeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(state => validPriorDeploymentOutcomeStates.includes(state as any))

const deploymentAuditPriorEvidenceArraysValid = (audit) =>
  audit != null &&
  rawStringArrayValid(audit.priorRoundIds) &&
  rawStringArrayValid(audit.priorRoundAuditBundleHashes) &&
  rawPriorDeploymentModeArrayValid(audit.priorRoundDeploymentModes) &&
  rawStringArrayValid(audit.priorRoundPaymentReconciliationPathHashes) &&
  rawPriorDeploymentOutcomeArrayValid(audit.priorRoundOutcomeStates) &&
  audit.priorRoundIds.length > 0 &&
  audit.priorRoundIds.length === audit.priorRoundAuditBundleHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundDeploymentModes.length &&
  audit.priorRoundIds.length === audit.priorRoundPaymentReconciliationPathHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundOutcomeStates.length &&
  new Set(audit.priorRoundIds).size === audit.priorRoundIds.length &&
  !audit.priorRoundIds.includes(audit.roundId) &&
  audit.priorRoundAuditBundleHashes.every(isCanonicalHash) &&
  audit.priorRoundPaymentReconciliationPathHashes.every(isCanonicalHash) &&
  audit.priorRoundOutcomeStates.every(state => state === "passed")

const canonicalDeploymentPriorEvidence = (audit) =>
  deploymentAuditPriorEvidenceArraysValid(audit)
    ? audit.priorRoundIds
        .map((priorRoundId, index) => ({
          priorRoundId,
          priorRoundAuditBundleHash: audit.priorRoundAuditBundleHashes[index],
          priorRoundDeploymentMode: audit.priorRoundDeploymentModes[index],
          priorRoundPaymentReconciliationPathHash: audit.priorRoundPaymentReconciliationPathHashes[index],
          priorRoundOutcomeState: audit.priorRoundOutcomeStates[index],
        }))
        .sort((a, b) =>
          a.priorRoundId === b.priorRoundId
            ? a.priorRoundAuditBundleHash === b.priorRoundAuditBundleHash
              ? a.priorRoundDeploymentMode.localeCompare(b.priorRoundDeploymentMode)
              : a.priorRoundAuditBundleHash.localeCompare(b.priorRoundAuditBundleHash)
            : a.priorRoundId.localeCompare(b.priorRoundId)
        )
    : []

const deploymentAuditKindTargetAndEvidenceCoherent = (audit) =>
  audit != null &&
  (
    audit.targetDeploymentMode === "capped_pilot"
      ? audit.auditKind === "shadow_to_pilot" &&
        audit.priorRoundDeploymentModes.every(mode => mode === "shadow")
      : audit.targetDeploymentMode === "full" &&
        (
          (
            audit.auditKind === "pilot_to_full" &&
            audit.priorRoundDeploymentModes.every(mode => mode === "capped_pilot") &&
            audit.priorRoundPaymentReconciliationPathHashes.every(
              hash => hash === audit.paymentReconciliationPathHash
            )
          ) ||
          (
            audit.auditKind === "shadow_or_pilot_to_full" &&
            audit.priorRoundDeploymentModes.some((mode, index) =>
              mode === "capped_pilot" &&
              audit.priorRoundPaymentReconciliationPathHashes[index] === audit.paymentReconciliationPathHash
            ) &&
            audit.priorRoundDeploymentModes.every(mode =>
              mode === "shadow" || mode === "capped_pilot"
            )
          )
        )
  )

const deploymentAuditBindingHashValid = (audit) =>
  audit != null &&
  isNonEmptyString(audit.id) &&
  isNonEmptyString(audit.roundId) &&
  validDeploymentAuditKinds.includes(audit.auditKind as any) &&
  ["capped_pilot", "full"].includes(audit.targetDeploymentMode as any) &&
  audit.auditState === "passed" &&
  isNonEmptyString(audit.calculationVersion) &&
  isCanonicalHash(audit.rulebookHash) &&
  isCanonicalHash(audit.feePolicyHash) &&
  isCanonicalHash(audit.sponsorPoolSourceHash) &&
  isCanonicalHash(audit.paymentReconciliationPathHash) &&
  isCanonicalHash(audit.optimizationPolicyHash) &&
  ["ilp", "deterministic_greedy"].includes(audit.solverMode as any) &&
  isNonEmptyString(audit.solverVersion) &&
  deploymentAuditPriorEvidenceArraysValid(audit) &&
  deploymentAuditKindTargetAndEvidenceCoherent(audit) &&
  isNonEmptyString(audit.auditorId) &&
  isCanonicalUtcTimestamp(audit.createdAt) &&
  isCanonicalHash(audit.auditHash) &&
  audit.auditHash === sha256(canonicalJson({
    id: audit.id,
    roundId: audit.roundId,
    auditKind: audit.auditKind,
    targetDeploymentMode: audit.targetDeploymentMode,
    auditState: audit.auditState,
    calculationVersion: audit.calculationVersion,
    rulebookHash: audit.rulebookHash,
    feePolicyHash: audit.feePolicyHash,
    sponsorPoolSourceHash: audit.sponsorPoolSourceHash,
    paymentReconciliationPathHash: audit.paymentReconciliationPathHash,
    optimizationPolicyHash: audit.optimizationPolicyHash,
    solverMode: audit.solverMode,
    solverVersion: audit.solverVersion,
    priorEvidence: canonicalDeploymentPriorEvidence(audit),
    auditorId: audit.auditorId,
    createdAt: audit.createdAt,
  }))

const deploymentAuditEligibleForCurrentRound = (targetDeploymentMode) =>
  round.deploymentAuditState === "passed" &&
  round.deploymentAuditId != null &&
  deploymentAudit != null &&
  deploymentAudit.id === round.deploymentAuditId &&
  deploymentAudit.auditHash === round.deploymentAuditHash &&
  deploymentAudit.roundId === round.id &&
  deploymentAudit.targetDeploymentMode === targetDeploymentMode &&
  deploymentAudit.calculationVersion === round.calculationVersion &&
  deploymentAudit.rulebookHash === round.rulebookHash &&
  deploymentAudit.feePolicyHash === round.feePolicyHash &&
  deploymentAudit.sponsorPoolSourceHash === round.sponsorPoolSourceHash &&
  deploymentAudit.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  deploymentAudit.optimizationPolicyHash === round.optimizationPolicyHash &&
  timestampLte(deploymentAudit.createdAt, round.parametersFrozenAt) &&
  deploymentAuditBindingHashValid(deploymentAudit)

const cappedPilotDeploymentAuditEligible =
  (
    round.deploymentAuditState === "not_required" &&
    round.deploymentAuditId == null &&
    round.deploymentAuditHash == null
  ) || deploymentAuditEligibleForCurrentRound("capped_pilot")

const fullDeploymentAuditEligible =
  deploymentAuditEligibleForCurrentRound("full")

const deploymentPilotCapFieldsModeCompatible =
  round.deploymentMode === "capped_pilot"
    ? isPositiveIntegerCents(round.pilotMaxRoundGrossExposureCents) &&
      isPositiveIntegerCents(round.pilotMaxParticipantGrossExposureCents)
    : round.pilotMaxRoundGrossExposureCents == null &&
      round.pilotMaxParticipantGrossExposureCents == null

const roundDeploymentModeEligible =
  validDeploymentModes.includes(round.deploymentMode as any) &&
  deploymentPilotCapFieldsModeCompatible &&
  (
    (
      round.deploymentMode === "shadow" &&
      round.deploymentAuditState === "not_required" &&
      round.deploymentAuditId == null &&
      round.deploymentAuditHash == null
    ) ||
    (
      round.deploymentMode === "capped_pilot" &&
      cappedPilotDeploymentAuditEligible
    ) ||
    (
      round.deploymentMode === "full" &&
      fullDeploymentAuditEligible
    )
  )

const roundRulebookAndFreezeEligible =
  roundTimelineValid &&
  roundStatusEligible &&
  roundDeploymentModeEligible &&
  isCanonicalHash(round.rulebookHash) &&
  isCanonicalHash(round.sponsorPoolSourceHash) &&
  isCanonicalHash(round.paymentReconciliationPathHash) &&
  isCanonicalHash(round.optimizationPolicyHash) &&
  isNonEmptyString(round.calculationVersion) &&
  isNonEmptyString(round.failureBonusPolicyVersion) &&
  isNonEmptyString(round.feePolicyVersion) &&
  isCanonicalHash(round.feePolicyHash) &&
  isCanonicalUtcTimestamp(round.parametersFrozenAt) &&
  timestampLte(round.parametersFrozenAt, round.opensAt)

const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const projectId =
  project?.id ?? null

const projectBucketId =
  project?.bucketId ?? null

const bundleProjectRowCount =
  isNonEmptyString(projectId)
    ? bundleDerivedProjectRowCountByRoundAndProjectId[
        round.id
      ]?.[projectId] ?? 0
    : 0

const projectRowUnique =
  bundleProjectRowCount === 1

const projectRowEligible =
  project != null &&
  projectRowUnique &&
  project.roundId === round.id &&
  isNonEmptyString(projectId) &&
  isNonEmptyString(projectBucketId)

const projectMinimumViableCentsValid =
  projectRowEligible &&
  isNonNegativeIntegerCents(project?.minimumViableCents)

const projectThresholdAmountCentsValid =
  projectRowEligible &&
  isNonNegativeIntegerCents(project?.thresholdAmountCents)

const projectThresholdSupporterMinValid =
  projectRowEligible &&
  isNonNegativeInteger(project?.thresholdSupporterMin)

const projectThresholdClusterMinValid =
  projectRowEligible &&
  isNonNegativeInteger(project?.thresholdClusterMin)

const projectRequestedMaxCentsValid =
  projectRowEligible &&
  isNonNegativeIntegerCents(project?.requestedMaxCents)

const projectEconomicTermsValid =
  projectRowEligible &&
  projectRequestedMaxCentsValid &&
  projectMinimumViableCentsValid &&
  projectThresholdAmountCentsValid &&
  projectThresholdSupporterMinValid &&
  projectThresholdClusterMinValid


const rawPairArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(pair =>
    Array.isArray(pair) &&
    pair.length === 2 &&
    isNonWhitespaceStringValue(pair[0]) &&
    isNonWhitespaceStringValue(pair[1])
  )

const validFeePayers = ["donor_deducted", "sponsor_paid", "waived"] as const

const feeQuoteNetMatches = (quote) =>
  quote != null &&
  isNonNegativeIntegerCents(quote.grossCapturedCents) &&
  isNonNegativeIntegerCents(quote.feeCents) &&
  isNonNegativeIntegerCents(quote.netRecipientDisbursedCents) &&
  validFeePayers.includes(quote.feePayer as any) &&
  (
    quote.feePayer === "donor_deducted"
      ? quote.grossCapturedCents >= quote.feeCents &&
        quote.netRecipientDisbursedCents === quote.grossCapturedCents - quote.feeCents &&
        quote.sponsorFeeBackingHash == null &&
        quote.sponsorFeeBackedCents == null
      : quote.feePayer === "waived"
        ? quote.feeCents === 0 &&
          quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
          quote.sponsorFeeBackingHash == null &&
          quote.sponsorFeeBackedCents == null
        : quote.feePayer === "sponsor_paid" &&
          quote.feeCents > 0 &&
          quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
          isCanonicalHash(quote.sponsorFeeBackingHash) &&
          isNonNegativeIntegerCents(quote.sponsorFeeBackedCents) &&
          quote.sponsorFeeBackedCents >= quote.feeCents
  )

const feeQuoteBindingHashValid = (quote) =>
  quote != null &&
  isNonEmptyString(quote.id) &&
  isNonEmptyString(quote.roundId) &&
  isNonEmptyString(quote.participantId) &&
  isNonEmptyString(quote.commonGroundBudgetId) &&
  isNonEmptyString(quote.projectId) &&
  isNonEmptyString(quote.conditionalTradeIntentId) &&
  isNonEmptyString(quote.feePolicyVersion) &&
  isCanonicalHash(quote.feePolicyHash) &&
  validFeePayers.includes(quote.feePayer as any) &&
  feeQuoteNetMatches(quote) &&
  isCanonicalUtcTimestamp(quote.sourceCutoffAt) &&
  isCanonicalHash(quote.rulebookHash) &&
  isCanonicalUtcTimestamp(quote.createdAt) &&
  isCanonicalHash(quote.quoteHash) &&
  quote.quoteHash === sha256(canonicalJson({
    id: quote.id,
    roundId: quote.roundId,
    participantId: quote.participantId,
    commonGroundBudgetId: quote.commonGroundBudgetId,
    projectId: quote.projectId,
    conditionalTradeIntentId: quote.conditionalTradeIntentId,
    feePolicyVersion: quote.feePolicyVersion,
    feePolicyHash: quote.feePolicyHash,
    feePayer: quote.feePayer,
    grossCapturedCents: quote.grossCapturedCents,
    feeCents: quote.feeCents,
    netRecipientDisbursedCents: quote.netRecipientDisbursedCents,
    sponsorFeeBackingHash: quote.sponsorFeeBackingHash ?? null,
    sponsorFeeBackedCents: quote.sponsorFeeBackedCents ?? null,
    sourceCutoffAt: quote.sourceCutoffAt,
    rulebookHash: quote.rulebookHash,
    createdAt: quote.createdAt,
  }))

const canonicalStringArrayRecord = (record) =>
  Object.fromEntries(
    Object.entries(record ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, asStringArray(value)])
  )

const canonicalPairArray = (value) =>
  Array.isArray(value)
    ? value
        .filter(pair =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          isNonWhitespaceStringValue(pair[0]) &&
          isNonWhitespaceStringValue(pair[1])
        )
        .map(([a, b]) => [a, b])
        .sort(([a1, b1], [a2, b2]) =>
          a1 === a2 ? b1.localeCompare(b2) : a1.localeCompare(a2)
        )
    : []

const roundMoralBucketSnapshotGraphWellFormed = (snapshot) => {
  const bucketIds = asStringArray(snapshot?.bucketIds)
  const bucketIdSet = new Set(bucketIds)
  const rawReciprocalMap =
    snapshot?.reciprocalDistinctFromBucketIdsByBucketId ?? {}
  const rawMapKeys = Object.keys(rawReciprocalMap)
  const reciprocalMap = canonicalStringArrayRecord(rawReciprocalMap)
  const mapKeys = rawStringArrayValid(rawMapKeys)
    ? [...rawMapKeys].sort()
    : []
  const blockedPairs = canonicalPairArray(snapshot?.blockedAsymmetricPairs)

  return snapshot != null &&
    rawStringArrayValid(snapshot.bucketIds) &&
    rawStringArrayValid(rawMapKeys) &&
    rawPairArrayValid(snapshot.blockedAsymmetricPairs) &&
    Object.values(rawReciprocalMap).every(rawStringArrayValid) &&
    bucketIds.length > 0 &&
    Number.isSafeInteger(snapshot.asymmetricPairCount) &&
    snapshot.asymmetricPairCount === blockedPairs.length &&
    snapshot.asymmetricPairCount === 0 &&
    blockedPairs.length === 0 &&
    mapKeys.length === bucketIds.length &&
    mapKeys.every(bucketId => bucketIdSet.has(bucketId)) &&
    bucketIds.every(bucketId => mapKeys.includes(bucketId)) &&
    Object.entries(reciprocalMap).every(([bucketId, distinctIds]) =>
      bucketIdSet.has(bucketId) &&
      distinctIds.every(otherId =>
        bucketIdSet.has(otherId) &&
        otherId !== bucketId &&
        (reciprocalMap[otherId] ?? []).includes(bucketId)
      )
    )
}

const roundMoralBucketSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  isNonEmptyString(snapshot.roundId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.distinctnessPolicyVersion) &&
  rawStringArrayValid(snapshot.bucketIds) &&
  snapshot.reciprocalDistinctFromBucketIdsByBucketId != null &&
  typeof snapshot.reciprocalDistinctFromBucketIdsByBucketId === "object" &&
  !Array.isArray(snapshot.reciprocalDistinctFromBucketIdsByBucketId) &&
  rawStringArrayValid(Object.keys(snapshot.reciprocalDistinctFromBucketIdsByBucketId)) &&
  Object.values(snapshot.reciprocalDistinctFromBucketIdsByBucketId).every(rawStringArrayValid) &&
  isNonNegativeInteger(snapshot.asymmetricPairCount) &&
  rawPairArrayValid(snapshot.blockedAsymmetricPairs) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    roundId: snapshot.roundId,
    rulebookHash: snapshot.rulebookHash,
    distinctnessPolicyVersion: snapshot.distinctnessPolicyVersion,
    bucketIds: asStringArray(snapshot.bucketIds),
    reciprocalDistinctFromBucketIdsByBucketId: canonicalStringArrayRecord(
      snapshot.reciprocalDistinctFromBucketIdsByBucketId
    ),
    asymmetricPairCount: snapshot.asymmetricPairCount,
    blockedAsymmetricPairs: canonicalPairArray(snapshot.blockedAsymmetricPairs),
    createdAt: snapshot.createdAt,
  }))

const roundMoralBucketSnapshotEligible =
  roundMoralBucketSnapshot != null &&
  roundMoralBucketSnapshot.id === round.moralBucketSnapshotId &&
  roundMoralBucketSnapshot.roundId === round.id &&
  roundMoralBucketSnapshot.rulebookHash === round.rulebookHash &&
  roundMoralBucketSnapshot.snapshotHash === round.moralBucketSnapshotHash &&
  roundMoralBucketSnapshotBindingHashValid(roundMoralBucketSnapshot) &&
  roundMoralBucketSnapshotGraphWellFormed(roundMoralBucketSnapshot) &&
  timestampLte(roundMoralBucketSnapshot.createdAt, round.parametersFrozenAt) &&
  roundMoralBucketSnapshot.asymmetricPairCount === 0

const roundClearingInputBundleBindingHashValid = (bundle) =>
  bundle != null &&
  isNonEmptyString(bundle.id) &&
  isNonEmptyString(bundle.roundId) &&
  isCanonicalHash(bundle.rulebookHash) &&
  isNonEmptyString(bundle.feePolicyVersion) &&
  isCanonicalHash(bundle.feePolicyHash) &&
  ["shadow", "capped_pilot", "full"].includes(bundle.deploymentMode as any) &&
  (
    bundle.deploymentMode === "capped_pilot"
      ? isPositiveIntegerCents(bundle.pilotMaxRoundGrossExposureCents) &&
        isPositiveIntegerCents(bundle.pilotMaxParticipantGrossExposureCents)
      : bundle.pilotMaxRoundGrossExposureCents == null &&
        bundle.pilotMaxParticipantGrossExposureCents == null
  ) &&
  ["not_required", "required", "passed", "failed"].includes(bundle.deploymentAuditState as any) &&
  (bundle.deploymentAuditId == null || isNonEmptyString(bundle.deploymentAuditId)) &&
  (bundle.deploymentAuditHash == null || isCanonicalHash(bundle.deploymentAuditHash)) &&
  isCanonicalHash(bundle.paymentReconciliationPathHash) &&
  isCanonicalHash(bundle.optimizationPolicyHash) &&
  isNonEmptyString(bundle.calculationVersion) &&
  isNonEmptyString(bundle.bundleSchemaVersion) &&
  bundle.snapshotKind === "round_close" &&
  isCanonicalUtcTimestamp(bundle.sourceCutoffAt) &&
  isCanonicalUtcTimestamp(bundle.createdAt) &&
  isCanonicalHash(bundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(bundle.supportStanceInputHash) &&
  isCanonicalHash(bundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(bundle.identityEligibilityInputHash) &&
  isCanonicalHash(bundle.projectInputHash) &&
  isCanonicalHash(bundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(bundle.feeInputHash) &&
  isCanonicalHash(bundle.deploymentExposureInputHash) &&
  isNonEmptyString(bundle.moralBucketSnapshotId) &&
  isCanonicalHash(bundle.moralBucketSnapshotHash) &&
  isCanonicalHash(bundle.projectEligibilitySnapshotHash) &&
  isCanonicalHash(bundle.sponsorCommitmentInputHash) &&
  isCanonicalHash(bundle.successRewardInputHash) &&
  isCanonicalHash(bundle.coordinationCreditInputHash) &&
  isCanonicalHash(bundle.impactCertificateInputHash) &&
  isCanonicalHash(bundle.canonicalInputJsonHash) &&
  isNonEmptyString(bundle.canonicalInputJsonRef) &&
  isCanonicalHash(bundle.bundleHash) &&
  bundle.bundleHash === sha256(canonicalJson({
    id: bundle.id,
    roundId: bundle.roundId,
    rulebookHash: bundle.rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents ?? null,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents ?? null,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId ?? null,
    deploymentAuditHash: bundle.deploymentAuditHash ?? null,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    bundleSchemaVersion: bundle.bundleSchemaVersion,
    snapshotKind: bundle.snapshotKind,
    sourceCutoffAt: bundle.sourceCutoffAt,
    commonGroundBudgetInputHash: bundle.commonGroundBudgetInputHash,
    supportStanceInputHash: bundle.supportStanceInputHash,
    conditionalTradeIntentInputHash: bundle.conditionalTradeIntentInputHash,
    identityEligibilityInputHash: bundle.identityEligibilityInputHash,
    projectInputHash: bundle.projectInputHash,
    paymentCommitmentSnapshotHash: bundle.paymentCommitmentSnapshotHash,
    feeInputHash: bundle.feeInputHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    moralBucketSnapshotId: bundle.moralBucketSnapshotId,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    projectEligibilitySnapshotHash: bundle.projectEligibilitySnapshotHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    successRewardInputHash: bundle.successRewardInputHash,
    coordinationCreditInputHash: bundle.coordinationCreditInputHash,
    impactCertificateInputHash: bundle.impactCertificateInputHash,
    canonicalInputJsonRef: bundle.canonicalInputJsonRef,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    createdAt: bundle.createdAt,
  }))

const roundClearingInputBundleEligibleForHardGates =
  roundClearingInputBundle != null &&
  roundRulebookAndFreezeEligible &&
  roundClearingInputBundle.id === round.clearingInputBundleId &&
  roundClearingInputBundle.roundId === round.id &&
  roundClearingInputBundle.rulebookHash === round.rulebookHash &&
  roundClearingInputBundle.feePolicyVersion === round.feePolicyVersion &&
  roundClearingInputBundle.feePolicyHash === round.feePolicyHash &&
  roundClearingInputBundle.deploymentMode === round.deploymentMode &&
  roundClearingInputBundle.pilotMaxRoundGrossExposureCents === (round.pilotMaxRoundGrossExposureCents ?? null) &&
  roundClearingInputBundle.pilotMaxParticipantGrossExposureCents === (round.pilotMaxParticipantGrossExposureCents ?? null) &&
  roundClearingInputBundle.deploymentAuditState === round.deploymentAuditState &&
  roundClearingInputBundle.deploymentAuditId === (round.deploymentAuditId ?? null) &&
  roundClearingInputBundle.deploymentAuditHash === (round.deploymentAuditHash ?? null) &&
  roundClearingInputBundle.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  roundClearingInputBundle.optimizationPolicyHash === round.optimizationPolicyHash &&
  roundClearingInputBundle.calculationVersion === round.calculationVersion &&
  roundClearingInputBundle.snapshotKind === "round_close" &&
  timestampEquals(roundClearingInputBundle.sourceCutoffAt, round.closesAt) &&
  roundClearingInputBundle.bundleHash === round.clearingInputBundleHash &&
  roundClearingInputBundleBindingHashValid(roundClearingInputBundle) &&
  isCanonicalHash(roundClearingInputBundle.canonicalInputJsonHash) &&
  isCanonicalHash(roundClearingInputBundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(roundClearingInputBundle.supportStanceInputHash) &&
  isCanonicalHash(roundClearingInputBundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(roundClearingInputBundle.identityEligibilityInputHash) &&
  isCanonicalHash(roundClearingInputBundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(roundClearingInputBundle.feeInputHash) &&
  isCanonicalHash(roundClearingInputBundle.deploymentExposureInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectEligibilitySnapshotHash) &&
  roundClearingInputBundle.sponsorCommitmentInputHash === round.sponsorPoolSourceHash &&
  isCanonicalHash(roundClearingInputBundle.sponsorCommitmentInputHash) &&
  roundClearingInputBundle.moralBucketSnapshotId === round.moralBucketSnapshotId &&
  roundClearingInputBundle.moralBucketSnapshotHash === round.moralBucketSnapshotHash &&
  isCanonicalHash(roundClearingInputBundle.moralBucketSnapshotHash)

const validProjectGoodTypes = ["consensus", "hybrid"] as const

const validProjectDestinationTypes = [
  "registered_nonprofit",
  "fiscal_host",
  "signed_auditable_route",
] as const

const projectScopeEligible =
  projectRowEligible &&
  project?.scopeState === "valid_moral_public_good" &&
  project?.excludedTradeType == null

const projectIdentityAndRouteValid =
  projectRowEligible &&
  validProjectGoodTypes.includes(project?.goodType as any) &&
  validProjectDestinationTypes.includes(project?.destinationType as any) &&
  isNonEmptyString(projectBucketId) &&
  isNonEmptyString(project?.destinationRef) &&
  roundMoralBucketSnapshotEligible &&
  roundMoralBucketSnapshot.bucketIds.includes(projectBucketId)

const validProjectBaselineConfidenceStates = ["high", "medium", "low", "unknown"] as const

const validProjectActionEvidenceStates = [
  "adequate",
  "provisional_nonblocking",
  "review",
  "blocked",
  "missing",
] as const

const projectBaselineAndActionEvidenceValid =
  projectRowEligible &&
  project?.baselineIntegrityState === "clear" &&
  validProjectBaselineConfidenceStates.includes(project?.baselineConfidenceState as any) &&
  validProjectActionEvidenceStates.includes(project?.actionEvidenceState as any) &&
  (
    round.deploymentMode === "shadow"
      ? ["adequate", "provisional_nonblocking", "review"].includes(project?.actionEvidenceState as any)
      : ["high", "medium"].includes(project?.baselineConfidenceState as any) &&
        project?.actionEvidenceState === "adequate"
  )

const safeProjectMinimumViableCents =
  projectMinimumViableCentsValid ? project.minimumViableCents : 0

const safeProjectThresholdAmountCents =
  projectThresholdAmountCentsValid ? project.thresholdAmountCents : 0

const safeProjectThresholdSupporterMin =
  projectThresholdSupporterMinValid ? project.thresholdSupporterMin : Number.MAX_SAFE_INTEGER

const safeProjectThresholdClusterMin =
  projectThresholdClusterMinValid ? project.thresholdClusterMin : Number.MAX_SAFE_INTEGER

const stageOneBaseMatchBackingCents =
  roundClearingInputBundleEligibleForHardGates
    ? sponsorBackedCentsForFinalClearing("base_match")
    : 0

const stageOneBonusMatchBackingCents =
  roundClearingInputBundleEligibleForHardGates
    ? sponsorBackedCentsForFinalClearing("bonus_match")
    : 0

const stageOneFailureBonusBackingCents =
  roundClearingInputBundleEligibleForHardGates
    ? sponsorBackedCentsForFinalClearing("failure_bonus")
    : 0

const stageOneFeeSupportBackingCents =
  roundClearingInputBundleEligibleForHardGates
    ? sponsorBackedCentsForFinalClearing("fee_support")
    : 0

// Stage 1 uses the same selected positive binding cleared allocation rows for
// sponsor-paid fee-support demand; bundle-wide unselected fee quotes do not count.
const stageOneSponsorPaidFeeQuoteIdsForAggregate =
  rawStringArrayValid(selectedClearedSponsorPaidFeeQuoteIdsForBindingRows)
    ? selectedClearedSponsorPaidFeeQuoteIdsForBindingRows
    : []

const stageOneSponsorPaidFeeQuoteIdUniqueInFrozenInputs = (feeQuoteId) =>
  Array.isArray(frozenFeeQuoteInputsFromEligibleBundle) &&
  frozenFeeQuoteInputsFromEligibleBundle.filter(quote => quote?.id === feeQuoteId).length === 1

const stageOneSponsorPaidFeeQuoteIdsUniqueInFrozenInputs =
  stageOneSponsorPaidFeeQuoteIdsForAggregate.every(stageOneSponsorPaidFeeQuoteIdUniqueInFrozenInputs)

const stageOneSponsorPaidFeeQuotesForAggregate =
  Array.isArray(frozenFeeQuoteInputsFromEligibleBundle) &&
  stageOneSponsorPaidFeeQuoteIdsUniqueInFrozenInputs
    ? stageOneSponsorPaidFeeQuoteIdsForAggregate.map(feeQuoteId =>
        frozenFeeQuoteInputsFromEligibleBundle.find(quote => quote?.id === feeQuoteId)
      )
    : []

const stageOneSponsorPaidFeeQuoteAggregateInputEligible = (quote) =>
  quote != null &&
  feeQuoteBindingHashValid(quote) &&
  quote.roundId === round.id &&
  quote.rulebookHash === round.rulebookHash &&
  quote.feePolicyVersion === round.feePolicyVersion &&
  quote.feePolicyHash === round.feePolicyHash &&
  quote.feePayer === "sponsor_paid" &&
  quote.sponsorFeeBackingHash === round.sponsorPoolSourceHash &&
  timestampEquals(quote.sourceCutoffAt, round.closesAt) &&
  isPositiveIntegerCents(quote.feeCents)

const stageOneSponsorPaidFeeQuoteAggregateInputsValid =
  roundClearingInputBundleEligibleForHardGates &&
  rawStringArrayValid(selectedClearedSponsorPaidFeeQuoteIdsForBindingRows) &&
  Array.isArray(frozenFeeQuoteInputsFromEligibleBundle) &&
  stageOneSponsorPaidFeeQuoteIdsUniqueInFrozenInputs &&
  stageOneSponsorPaidFeeQuotesForAggregate.length === stageOneSponsorPaidFeeQuoteIdsForAggregate.length &&
  stageOneSponsorPaidFeeQuotesForAggregate.every(stageOneSponsorPaidFeeQuoteAggregateInputEligible)

const stageOneAggregateSponsorPaidFeeCentsInt =
  stageOneSponsorPaidFeeQuoteAggregateInputsValid
    ? sumBigInt(stageOneSponsorPaidFeeQuotesForAggregate.map(quote => quote.feeCents))
    : 0n

const stageOneAggregateSponsorPaidFeeDemandRepresentable =
  stageOneAggregateSponsorPaidFeeCentsInt <= BigInt(Number.MAX_SAFE_INTEGER)

roundRulebookAndFreezeEligible
roundClearingInputBundleEligibleForHardGates
projectRowEligible
projectEconomicTermsValid
projectScopeEligible
projectIdentityAndRouteValid
projectBaselineAndActionEvidenceValid
project?.reviewState === "approved"
["none", "resolved", "non_blocking"].includes(project?.challengeState)
project?.antiThreatState === "clear"
project?.externalityState === "clear"
project?.destinationProofState === "verified"
["clear", "disclosed_nonblocking"].includes(project?.conflictReviewState)
["funded", "escrowed", "contractually_committed"].includes(project?.sponsorPoolCompatibilityState)
["funded", "escrowed", "contractually_committed"].includes(round.sponsorPoolState)
stageOneBaseMatchBackingCents >= roundBaseMatchBudgetCents
stageOneBonusMatchBackingCents >= roundBonusBudgetCents
stageOneFailureBonusBackingCents >= roundFailureBonusBudgetCents
stageOneSponsorPaidFeeQuoteAggregateInputsValid
stageOneAggregateSponsorPaidFeeDemandRepresentable
BigInt(stageOneFeeSupportBackingCents) >= stageOneAggregateSponsorPaidFeeCentsInt
```

The recipient-funding, supporter, and cluster thresholds are checked after candidate allocation using `netRecipientClearedCents`, `countedClearedCents`, and `matchEligibleClearedCents` separately; `matchEligibleClearedCents` must itself be derived from net public-good credit after fees, not from fee-inclusive gross exposure. If `projectEconomicTermsValid` is false, the project cannot clear; safe threshold variables must not be used to lower a malformed project threshold.

### Stage 2: Candidate Allocatable Budget

Before this stage runs for final clearing, material mutable participant inputs must be frozen into the `RoundClearingInputBundle`. In the pseudocode below, `commonGroundBudget`, `supportStance`, `conditionalTradeIntent`, `identityEligibility`, and `project` are bundle-derived immutable input rows, not mutable live records. `participantRemainingRoundBudgetCents` and `projectRemainingRequestedCapCents` are deterministic allocator state derived from the eligible bundle and current candidate pass, not live user or project records. Any `bundleDerived*RowCount*` maps referenced below are computed deterministically from the same immutable `RoundClearingInputBundle` before row selection; duplicate or ambiguous rows fail closed rather than being resolved by arbitrary ordering.

For each participant-project pair:

```ts
const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isCanonicalUtcTimestamp = (value: string | null | undefined) =>
  isNonEmptyString(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value

const timestampEquals = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  a === b

const timestampLte = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) <= Date.parse(b)

const timestampLt = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) < Date.parse(b)

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const isPositiveIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value > 0

const isNonNegativeInteger = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const normalizeBps = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 10_000 ? value : null

const isValidBps = (value: number | null | undefined, max = 10_000) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max

const identityWeightBpsOrZero = (value: number | null | undefined) =>
  isValidBps(value, 10_000) ? value : 0

const failClosedIdentityThresholdBps = (value: number | null | undefined) =>
  isValidBps(value, 10_000) ? value : 10_001

const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0

const min = (...values: Array<number | null | undefined>) =>
  values.length > 0 &&
  values.every(value => Number.isSafeInteger(value) && value >= 0)
    ? Math.min(...(values as number[]))
    : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const nonNegativeBigIntTerm = (value: unknown) =>
  (typeof value === "bigint" && value >= 0n) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)

const sumBigInt = (values: unknown) =>
  Array.isArray(values) && values.every(nonNegativeBigIntTerm)
    ? values.reduce(
        (total, value) =>
          total + (typeof value === "bigint" ? value : BigInt(value as number)),
        0n
      )
    : 0n

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const normalizeMatchBps = (value: number | null | undefined, fallback: number) =>
  value == null
    ? fallback
    : Number.isSafeInteger(value) && value >= 0 && value <= 100_000
      ? value
      : 0

const isNonWhitespaceStringValue = (item: unknown) =>
  typeof item === "string" && item.trim().length > 0 && item === item.trim()

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter(isNonWhitespaceStringValue))].sort()
    : []

const rawStringArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(isNonWhitespaceStringValue) &&
  new Set(value).size === value.length

const stringArrayOrEmpty = (value: unknown) =>
  rawStringArrayValid(value) ? [...value].sort() : []

const intersection = (...arrays: unknown[]) =>
  arrays.length > 0 && arrays.every(rawStringArrayValid)
    ? [...new Set(arrays[0] as string[])]
        .filter(item => arrays.every(array => (array as string[]).includes(item)))
        .sort()
    : []

const rawPairArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.every(pair =>
    Array.isArray(pair) &&
    pair.length === 2 &&
    isNonWhitespaceStringValue(pair[0]) &&
    isNonWhitespaceStringValue(pair[1])
  )

const validPaymentCommitmentSnapshotKinds = [
  "early_failure_bonus_cutoff",
  "round_close",
  "authorization_reconciliation",
] as const

const paymentCommitmentSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  validPaymentCommitmentSnapshotKinds.includes(snapshot.snapshotKind as any) &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.participantId) &&
  isNonEmptyString(snapshot.commonGroundBudgetId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.paymentMethodRef) &&
  snapshot.paymentMethodCommitmentState === "provider_confirmed" &&
  isCanonicalUtcTimestamp(snapshot.paymentMethodSavedAt) &&
  isCanonicalUtcTimestamp(snapshot.paymentMethodConfirmedAt) &&
  isCanonicalUtcTimestamp(snapshot.asOf) &&
  timestampLte(snapshot.paymentMethodSavedAt, snapshot.paymentMethodConfirmedAt) &&
  timestampLte(snapshot.paymentMethodConfirmedAt, snapshot.asOf) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  isCanonicalHash(snapshot.providerEvidenceHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    paymentMethodRef: snapshot.paymentMethodRef,
    paymentMethodSavedAt: snapshot.paymentMethodSavedAt,
    paymentMethodCommitmentState: snapshot.paymentMethodCommitmentState,
    paymentMethodConfirmedAt: snapshot.paymentMethodConfirmedAt,
    asOf: snapshot.asOf,
    providerEvidenceHash: snapshot.providerEvidenceHash,
    rulebookHash: snapshot.rulebookHash,
    createdAt: snapshot.createdAt,
  }))

const validFeePayers = ["donor_deducted", "sponsor_paid", "waived"] as const

const feeQuoteNetMatches = (quote) =>
  quote != null &&
  isNonNegativeIntegerCents(quote.grossCapturedCents) &&
  isNonNegativeIntegerCents(quote.feeCents) &&
  isNonNegativeIntegerCents(quote.netRecipientDisbursedCents) &&
  validFeePayers.includes(quote.feePayer as any) &&
  (
    quote.feePayer === "donor_deducted"
      ? quote.grossCapturedCents >= quote.feeCents &&
        quote.netRecipientDisbursedCents === quote.grossCapturedCents - quote.feeCents &&
        quote.sponsorFeeBackingHash == null &&
        quote.sponsorFeeBackedCents == null
      : quote.feePayer === "waived"
        ? quote.feeCents === 0 &&
          quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
          quote.sponsorFeeBackingHash == null &&
          quote.sponsorFeeBackedCents == null
        : quote.feePayer === "sponsor_paid" &&
          quote.feeCents > 0 &&
          quote.netRecipientDisbursedCents === quote.grossCapturedCents &&
          isCanonicalHash(quote.sponsorFeeBackingHash) &&
          isNonNegativeIntegerCents(quote.sponsorFeeBackedCents) &&
          quote.sponsorFeeBackedCents >= quote.feeCents
  )

const feeQuoteBindingHashValid = (quote) =>
  quote != null &&
  isNonEmptyString(quote.id) &&
  isNonEmptyString(quote.roundId) &&
  isNonEmptyString(quote.participantId) &&
  isNonEmptyString(quote.commonGroundBudgetId) &&
  isNonEmptyString(quote.projectId) &&
  isNonEmptyString(quote.conditionalTradeIntentId) &&
  isNonEmptyString(quote.feePolicyVersion) &&
  isCanonicalHash(quote.feePolicyHash) &&
  validFeePayers.includes(quote.feePayer as any) &&
  feeQuoteNetMatches(quote) &&
  isCanonicalUtcTimestamp(quote.sourceCutoffAt) &&
  isCanonicalHash(quote.rulebookHash) &&
  isCanonicalUtcTimestamp(quote.createdAt) &&
  isCanonicalHash(quote.quoteHash) &&
  quote.quoteHash === sha256(canonicalJson({
    id: quote.id,
    roundId: quote.roundId,
    participantId: quote.participantId,
    commonGroundBudgetId: quote.commonGroundBudgetId,
    projectId: quote.projectId,
    conditionalTradeIntentId: quote.conditionalTradeIntentId,
    feePolicyVersion: quote.feePolicyVersion,
    feePolicyHash: quote.feePolicyHash,
    feePayer: quote.feePayer,
    grossCapturedCents: quote.grossCapturedCents,
    feeCents: quote.feeCents,
    netRecipientDisbursedCents: quote.netRecipientDisbursedCents,
    sponsorFeeBackingHash: quote.sponsorFeeBackingHash ?? null,
    sponsorFeeBackedCents: quote.sponsorFeeBackedCents ?? null,
    sourceCutoffAt: quote.sourceCutoffAt,
    rulebookHash: quote.rulebookHash,
    createdAt: quote.createdAt,
  }))

const canonicalStringArrayRecord = (record) =>
  Object.fromEntries(
    Object.entries(record ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, asStringArray(value)])
  )

const canonicalPairArray = (value) =>
  Array.isArray(value)
    ? value
        .filter(pair =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          isNonWhitespaceStringValue(pair[0]) &&
          isNonWhitespaceStringValue(pair[1])
        )
        .map(([a, b]) => [a, b])
        .sort(([a1, b1], [a2, b2]) =>
          a1 === a2 ? b1.localeCompare(b2) : a1.localeCompare(a2)
        )
    : []

const roundMoralBucketSnapshotGraphWellFormed = (snapshot) => {
  const bucketIds = asStringArray(snapshot?.bucketIds)
  const bucketIdSet = new Set(bucketIds)
  const rawReciprocalMap =
    snapshot?.reciprocalDistinctFromBucketIdsByBucketId ?? {}
  const rawMapKeys = Object.keys(rawReciprocalMap)
  const reciprocalMap = canonicalStringArrayRecord(rawReciprocalMap)
  const mapKeys = rawStringArrayValid(rawMapKeys)
    ? [...rawMapKeys].sort()
    : []
  const blockedPairs = canonicalPairArray(snapshot?.blockedAsymmetricPairs)

  return snapshot != null &&
    rawStringArrayValid(snapshot.bucketIds) &&
    rawStringArrayValid(rawMapKeys) &&
    rawPairArrayValid(snapshot.blockedAsymmetricPairs) &&
    Object.values(rawReciprocalMap).every(rawStringArrayValid) &&
    bucketIds.length > 0 &&
    Number.isSafeInteger(snapshot.asymmetricPairCount) &&
    snapshot.asymmetricPairCount === blockedPairs.length &&
    snapshot.asymmetricPairCount === 0 &&
    blockedPairs.length === 0 &&
    mapKeys.length === bucketIds.length &&
    mapKeys.every(bucketId => bucketIdSet.has(bucketId)) &&
    bucketIds.every(bucketId => mapKeys.includes(bucketId)) &&
    Object.entries(reciprocalMap).every(([bucketId, distinctIds]) =>
      bucketIdSet.has(bucketId) &&
      distinctIds.every(otherId =>
        bucketIdSet.has(otherId) &&
        otherId !== bucketId &&
        (reciprocalMap[otherId] ?? []).includes(bucketId)
      )
    )
}

const roundMoralBucketSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  isNonEmptyString(snapshot.roundId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.distinctnessPolicyVersion) &&
  rawStringArrayValid(snapshot.bucketIds) &&
  snapshot.reciprocalDistinctFromBucketIdsByBucketId != null &&
  typeof snapshot.reciprocalDistinctFromBucketIdsByBucketId === "object" &&
  !Array.isArray(snapshot.reciprocalDistinctFromBucketIdsByBucketId) &&
  rawStringArrayValid(Object.keys(snapshot.reciprocalDistinctFromBucketIdsByBucketId)) &&
  Object.values(snapshot.reciprocalDistinctFromBucketIdsByBucketId).every(rawStringArrayValid) &&
  isNonNegativeInteger(snapshot.asymmetricPairCount) &&
  rawPairArrayValid(snapshot.blockedAsymmetricPairs) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    roundId: snapshot.roundId,
    rulebookHash: snapshot.rulebookHash,
    distinctnessPolicyVersion: snapshot.distinctnessPolicyVersion,
    bucketIds: asStringArray(snapshot.bucketIds),
    reciprocalDistinctFromBucketIdsByBucketId: canonicalStringArrayRecord(
      snapshot.reciprocalDistinctFromBucketIdsByBucketId
    ),
    asymmetricPairCount: snapshot.asymmetricPairCount,
    blockedAsymmetricPairs: canonicalPairArray(snapshot.blockedAsymmetricPairs),
    createdAt: snapshot.createdAt,
  }))

const roundClearingInputBundleBindingHashValid = (bundle) =>
  bundle != null &&
  isNonEmptyString(bundle.id) &&
  isNonEmptyString(bundle.roundId) &&
  isCanonicalHash(bundle.rulebookHash) &&
  isNonEmptyString(bundle.feePolicyVersion) &&
  isCanonicalHash(bundle.feePolicyHash) &&
  ["shadow", "capped_pilot", "full"].includes(bundle.deploymentMode as any) &&
  (
    bundle.deploymentMode === "capped_pilot"
      ? isPositiveIntegerCents(bundle.pilotMaxRoundGrossExposureCents) &&
        isPositiveIntegerCents(bundle.pilotMaxParticipantGrossExposureCents)
      : bundle.pilotMaxRoundGrossExposureCents == null &&
        bundle.pilotMaxParticipantGrossExposureCents == null
  ) &&
  ["not_required", "required", "passed", "failed"].includes(bundle.deploymentAuditState as any) &&
  (bundle.deploymentAuditId == null || isNonEmptyString(bundle.deploymentAuditId)) &&
  (bundle.deploymentAuditHash == null || isCanonicalHash(bundle.deploymentAuditHash)) &&
  isCanonicalHash(bundle.paymentReconciliationPathHash) &&
  isCanonicalHash(bundle.optimizationPolicyHash) &&
  isNonEmptyString(bundle.calculationVersion) &&
  isNonEmptyString(bundle.bundleSchemaVersion) &&
  bundle.snapshotKind === "round_close" &&
  isCanonicalUtcTimestamp(bundle.sourceCutoffAt) &&
  isCanonicalUtcTimestamp(bundle.createdAt) &&
  isCanonicalHash(bundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(bundle.supportStanceInputHash) &&
  isCanonicalHash(bundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(bundle.identityEligibilityInputHash) &&
  isCanonicalHash(bundle.projectInputHash) &&
  isCanonicalHash(bundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(bundle.feeInputHash) &&
  isCanonicalHash(bundle.deploymentExposureInputHash) &&
  isNonEmptyString(bundle.moralBucketSnapshotId) &&
  isCanonicalHash(bundle.moralBucketSnapshotHash) &&
  isCanonicalHash(bundle.projectEligibilitySnapshotHash) &&
  isCanonicalHash(bundle.sponsorCommitmentInputHash) &&
  isCanonicalHash(bundle.successRewardInputHash) &&
  isCanonicalHash(bundle.coordinationCreditInputHash) &&
  isCanonicalHash(bundle.impactCertificateInputHash) &&
  isCanonicalHash(bundle.canonicalInputJsonHash) &&
  isNonEmptyString(bundle.canonicalInputJsonRef) &&
  isCanonicalHash(bundle.bundleHash) &&
  bundle.bundleHash === sha256(canonicalJson({
    id: bundle.id,
    roundId: bundle.roundId,
    rulebookHash: bundle.rulebookHash,
    feePolicyVersion: bundle.feePolicyVersion,
    feePolicyHash: bundle.feePolicyHash,
    deploymentMode: bundle.deploymentMode,
    pilotMaxRoundGrossExposureCents: bundle.pilotMaxRoundGrossExposureCents ?? null,
    pilotMaxParticipantGrossExposureCents: bundle.pilotMaxParticipantGrossExposureCents ?? null,
    deploymentAuditState: bundle.deploymentAuditState,
    deploymentAuditId: bundle.deploymentAuditId ?? null,
    deploymentAuditHash: bundle.deploymentAuditHash ?? null,
    paymentReconciliationPathHash: bundle.paymentReconciliationPathHash,
    optimizationPolicyHash: bundle.optimizationPolicyHash,
    calculationVersion: bundle.calculationVersion,
    bundleSchemaVersion: bundle.bundleSchemaVersion,
    snapshotKind: bundle.snapshotKind,
    sourceCutoffAt: bundle.sourceCutoffAt,
    commonGroundBudgetInputHash: bundle.commonGroundBudgetInputHash,
    supportStanceInputHash: bundle.supportStanceInputHash,
    conditionalTradeIntentInputHash: bundle.conditionalTradeIntentInputHash,
    identityEligibilityInputHash: bundle.identityEligibilityInputHash,
    projectInputHash: bundle.projectInputHash,
    paymentCommitmentSnapshotHash: bundle.paymentCommitmentSnapshotHash,
    feeInputHash: bundle.feeInputHash,
    deploymentExposureInputHash: bundle.deploymentExposureInputHash,
    moralBucketSnapshotId: bundle.moralBucketSnapshotId,
    moralBucketSnapshotHash: bundle.moralBucketSnapshotHash,
    projectEligibilitySnapshotHash: bundle.projectEligibilitySnapshotHash,
    sponsorCommitmentInputHash: bundle.sponsorCommitmentInputHash,
    successRewardInputHash: bundle.successRewardInputHash,
    coordinationCreditInputHash: bundle.coordinationCreditInputHash,
    impactCertificateInputHash: bundle.impactCertificateInputHash,
    canonicalInputJsonRef: bundle.canonicalInputJsonRef,
    canonicalInputJsonHash: bundle.canonicalInputJsonHash,
    createdAt: bundle.createdAt,
  }))

const roundTimelineValid =
  timestampLt(round.opensAt, round.reviewFreezeAt) &&
  timestampLte(round.opensAt, round.earlyFailureBonusCutoff) &&
  timestampLte(round.earlyFailureBonusCutoff, round.reviewFreezeAt) &&
  timestampLt(round.reviewFreezeAt, round.closesAt) &&
  timestampLt(round.closesAt, round.challengeDeadline)

const bindingFinalResultStatuses = [
  "cleared",
  "payable",
  "released",
  "closed",
] as const

const authorizationSideEffectStatuses = ["cleared"] as const
const capturePayoutFallbackSideEffectStatuses = ["payable"] as const
const finalAuditReplayStatuses = ["released", "closed"] as const

const bindingResultStatusEligible =
  bindingFinalResultStatuses.includes(round.status as any)

const authorizationSideEffectStatusEligible =
  authorizationSideEffectStatuses.includes(round.status as any)

const capturePayoutFallbackSideEffectStatusEligible =
  capturePayoutFallbackSideEffectStatuses.includes(round.status as any)

const finalAuditReplayStatusEligible =
  finalAuditReplayStatuses.includes(round.status as any)

const roundStatusEligible =
  bindingResultStatusEligible

const validDeploymentModes = ["shadow", "capped_pilot", "full"] as const
const validDeploymentAuditKinds = ["shadow_to_pilot", "pilot_to_full", "shadow_or_pilot_to_full"] as const
const validPriorDeploymentModes = ["shadow", "capped_pilot"] as const
const validPriorDeploymentOutcomeStates = [
  "passed",
  "failed",
  "canceled",
  "incident_review",
] as const

const rawPriorDeploymentModeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(mode => validPriorDeploymentModes.includes(mode as any))

const rawPriorDeploymentOutcomeArrayValid = (value: unknown) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(state => validPriorDeploymentOutcomeStates.includes(state as any))

const deploymentAuditPriorEvidenceArraysValid = (audit) =>
  audit != null &&
  rawStringArrayValid(audit.priorRoundIds) &&
  rawStringArrayValid(audit.priorRoundAuditBundleHashes) &&
  rawPriorDeploymentModeArrayValid(audit.priorRoundDeploymentModes) &&
  rawStringArrayValid(audit.priorRoundPaymentReconciliationPathHashes) &&
  rawPriorDeploymentOutcomeArrayValid(audit.priorRoundOutcomeStates) &&
  audit.priorRoundIds.length > 0 &&
  audit.priorRoundIds.length === audit.priorRoundAuditBundleHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundDeploymentModes.length &&
  audit.priorRoundIds.length === audit.priorRoundPaymentReconciliationPathHashes.length &&
  audit.priorRoundIds.length === audit.priorRoundOutcomeStates.length &&
  new Set(audit.priorRoundIds).size === audit.priorRoundIds.length &&
  !audit.priorRoundIds.includes(audit.roundId) &&
  audit.priorRoundAuditBundleHashes.every(isCanonicalHash) &&
  audit.priorRoundPaymentReconciliationPathHashes.every(isCanonicalHash) &&
  audit.priorRoundOutcomeStates.every(state => state === "passed")

const canonicalDeploymentPriorEvidence = (audit) =>
  deploymentAuditPriorEvidenceArraysValid(audit)
    ? audit.priorRoundIds
        .map((priorRoundId, index) => ({
          priorRoundId,
          priorRoundAuditBundleHash: audit.priorRoundAuditBundleHashes[index],
          priorRoundDeploymentMode: audit.priorRoundDeploymentModes[index],
          priorRoundPaymentReconciliationPathHash: audit.priorRoundPaymentReconciliationPathHashes[index],
          priorRoundOutcomeState: audit.priorRoundOutcomeStates[index],
        }))
        .sort((a, b) =>
          a.priorRoundId === b.priorRoundId
            ? a.priorRoundAuditBundleHash === b.priorRoundAuditBundleHash
              ? a.priorRoundDeploymentMode.localeCompare(b.priorRoundDeploymentMode)
              : a.priorRoundAuditBundleHash.localeCompare(b.priorRoundAuditBundleHash)
            : a.priorRoundId.localeCompare(b.priorRoundId)
        )
    : []

const deploymentAuditKindTargetAndEvidenceCoherent = (audit) =>
  audit != null &&
  (
    audit.targetDeploymentMode === "capped_pilot"
      ? audit.auditKind === "shadow_to_pilot" &&
        audit.priorRoundDeploymentModes.every(mode => mode === "shadow")
      : audit.targetDeploymentMode === "full" &&
        (
          (
            audit.auditKind === "pilot_to_full" &&
            audit.priorRoundDeploymentModes.every(mode => mode === "capped_pilot") &&
            audit.priorRoundPaymentReconciliationPathHashes.every(
              hash => hash === audit.paymentReconciliationPathHash
            )
          ) ||
          (
            audit.auditKind === "shadow_or_pilot_to_full" &&
            audit.priorRoundDeploymentModes.some((mode, index) =>
              mode === "capped_pilot" &&
              audit.priorRoundPaymentReconciliationPathHashes[index] === audit.paymentReconciliationPathHash
            ) &&
            audit.priorRoundDeploymentModes.every(mode =>
              mode === "shadow" || mode === "capped_pilot"
            )
          )
        )
  )

const deploymentAuditBindingHashValid = (audit) =>
  audit != null &&
  isNonEmptyString(audit.id) &&
  isNonEmptyString(audit.roundId) &&
  validDeploymentAuditKinds.includes(audit.auditKind as any) &&
  ["capped_pilot", "full"].includes(audit.targetDeploymentMode as any) &&
  audit.auditState === "passed" &&
  isNonEmptyString(audit.calculationVersion) &&
  isCanonicalHash(audit.rulebookHash) &&
  isCanonicalHash(audit.feePolicyHash) &&
  isCanonicalHash(audit.sponsorPoolSourceHash) &&
  isCanonicalHash(audit.paymentReconciliationPathHash) &&
  isCanonicalHash(audit.optimizationPolicyHash) &&
  ["ilp", "deterministic_greedy"].includes(audit.solverMode as any) &&
  isNonEmptyString(audit.solverVersion) &&
  deploymentAuditPriorEvidenceArraysValid(audit) &&
  deploymentAuditKindTargetAndEvidenceCoherent(audit) &&
  isNonEmptyString(audit.auditorId) &&
  isCanonicalUtcTimestamp(audit.createdAt) &&
  isCanonicalHash(audit.auditHash) &&
  audit.auditHash === sha256(canonicalJson({
    id: audit.id,
    roundId: audit.roundId,
    auditKind: audit.auditKind,
    targetDeploymentMode: audit.targetDeploymentMode,
    auditState: audit.auditState,
    calculationVersion: audit.calculationVersion,
    rulebookHash: audit.rulebookHash,
    feePolicyHash: audit.feePolicyHash,
    sponsorPoolSourceHash: audit.sponsorPoolSourceHash,
    paymentReconciliationPathHash: audit.paymentReconciliationPathHash,
    optimizationPolicyHash: audit.optimizationPolicyHash,
    solverMode: audit.solverMode,
    solverVersion: audit.solverVersion,
    priorEvidence: canonicalDeploymentPriorEvidence(audit),
    auditorId: audit.auditorId,
    createdAt: audit.createdAt,
  }))

const deploymentAuditEligibleForCurrentRound = (targetDeploymentMode) =>
  round.deploymentAuditState === "passed" &&
  round.deploymentAuditId != null &&
  deploymentAudit != null &&
  deploymentAudit.id === round.deploymentAuditId &&
  deploymentAudit.auditHash === round.deploymentAuditHash &&
  deploymentAudit.roundId === round.id &&
  deploymentAudit.targetDeploymentMode === targetDeploymentMode &&
  deploymentAudit.calculationVersion === round.calculationVersion &&
  deploymentAudit.rulebookHash === round.rulebookHash &&
  deploymentAudit.feePolicyHash === round.feePolicyHash &&
  deploymentAudit.sponsorPoolSourceHash === round.sponsorPoolSourceHash &&
  deploymentAudit.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  deploymentAudit.optimizationPolicyHash === round.optimizationPolicyHash &&
  timestampLte(deploymentAudit.createdAt, round.parametersFrozenAt) &&
  deploymentAuditBindingHashValid(deploymentAudit)

const cappedPilotDeploymentAuditEligible =
  (
    round.deploymentAuditState === "not_required" &&
    round.deploymentAuditId == null &&
    round.deploymentAuditHash == null
  ) || deploymentAuditEligibleForCurrentRound("capped_pilot")

const fullDeploymentAuditEligible =
  deploymentAuditEligibleForCurrentRound("full")

const deploymentPilotCapFieldsModeCompatible =
  round.deploymentMode === "capped_pilot"
    ? isPositiveIntegerCents(round.pilotMaxRoundGrossExposureCents) &&
      isPositiveIntegerCents(round.pilotMaxParticipantGrossExposureCents)
    : round.pilotMaxRoundGrossExposureCents == null &&
      round.pilotMaxParticipantGrossExposureCents == null

const roundDeploymentModeEligible =
  validDeploymentModes.includes(round.deploymentMode as any) &&
  deploymentPilotCapFieldsModeCompatible &&
  (
    (
      round.deploymentMode === "shadow" &&
      round.deploymentAuditState === "not_required" &&
      round.deploymentAuditId == null &&
      round.deploymentAuditHash == null
    ) ||
    (
      round.deploymentMode === "capped_pilot" &&
      cappedPilotDeploymentAuditEligible
    ) ||
    (
      round.deploymentMode === "full" &&
      fullDeploymentAuditEligible
    )
  )

const roundRulebookAndFreezeEligible =
  roundTimelineValid &&
  roundStatusEligible &&
  roundDeploymentModeEligible &&
  isCanonicalHash(round.rulebookHash) &&
  isCanonicalHash(round.sponsorPoolSourceHash) &&
  isCanonicalHash(round.paymentReconciliationPathHash) &&
  isCanonicalHash(round.optimizationPolicyHash) &&
  isNonEmptyString(round.calculationVersion) &&
  isNonEmptyString(round.failureBonusPolicyVersion) &&
  isNonEmptyString(round.feePolicyVersion) &&
  isCanonicalHash(round.feePolicyHash) &&
  isCanonicalUtcTimestamp(round.parametersFrozenAt) &&
  timestampLte(round.parametersFrozenAt, round.opensAt)

const roundClearingInputBundleEligible =
  roundClearingInputBundle != null &&
  roundRulebookAndFreezeEligible &&
  roundClearingInputBundle.id === round.clearingInputBundleId &&
  roundClearingInputBundle.roundId === round.id &&
  roundClearingInputBundle.rulebookHash === round.rulebookHash &&
  roundClearingInputBundle.feePolicyVersion === round.feePolicyVersion &&
  roundClearingInputBundle.feePolicyHash === round.feePolicyHash &&
  roundClearingInputBundle.deploymentMode === round.deploymentMode &&
  roundClearingInputBundle.pilotMaxRoundGrossExposureCents === (round.pilotMaxRoundGrossExposureCents ?? null) &&
  roundClearingInputBundle.pilotMaxParticipantGrossExposureCents === (round.pilotMaxParticipantGrossExposureCents ?? null) &&
  roundClearingInputBundle.deploymentAuditState === round.deploymentAuditState &&
  roundClearingInputBundle.deploymentAuditId === (round.deploymentAuditId ?? null) &&
  roundClearingInputBundle.deploymentAuditHash === (round.deploymentAuditHash ?? null) &&
  roundClearingInputBundle.paymentReconciliationPathHash === round.paymentReconciliationPathHash &&
  roundClearingInputBundle.optimizationPolicyHash === round.optimizationPolicyHash &&
  roundClearingInputBundle.calculationVersion === round.calculationVersion &&
  roundClearingInputBundle.snapshotKind === "round_close" &&
  timestampEquals(roundClearingInputBundle.sourceCutoffAt, round.closesAt) &&
  roundClearingInputBundle.bundleHash === round.clearingInputBundleHash &&
  roundClearingInputBundleBindingHashValid(roundClearingInputBundle) &&
  isCanonicalHash(roundClearingInputBundle.canonicalInputJsonHash) &&
  isCanonicalHash(roundClearingInputBundle.commonGroundBudgetInputHash) &&
  isCanonicalHash(roundClearingInputBundle.supportStanceInputHash) &&
  isCanonicalHash(roundClearingInputBundle.conditionalTradeIntentInputHash) &&
  isCanonicalHash(roundClearingInputBundle.identityEligibilityInputHash) &&
  isCanonicalHash(roundClearingInputBundle.paymentCommitmentSnapshotHash) &&
  isCanonicalHash(roundClearingInputBundle.feeInputHash) &&
  isCanonicalHash(roundClearingInputBundle.deploymentExposureInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectInputHash) &&
  isCanonicalHash(roundClearingInputBundle.projectEligibilitySnapshotHash) &&
  roundClearingInputBundle.sponsorCommitmentInputHash === round.sponsorPoolSourceHash &&
  isCanonicalHash(roundClearingInputBundle.sponsorCommitmentInputHash) &&
  roundClearingInputBundle.moralBucketSnapshotId === round.moralBucketSnapshotId &&
  roundClearingInputBundle.moralBucketSnapshotHash === round.moralBucketSnapshotHash &&
  isCanonicalHash(roundClearingInputBundle.moralBucketSnapshotHash)

const roundDonorCountedCapCents =
  isNonNegativeIntegerCents(round.donorCountedCapCents)
    ? round.donorCountedCapCents
    : 0

const defaultSupporterCountMinNetPublicGoodCents = 100

const supporterCountMinNetPublicGoodCents =
  isPositiveIntegerCents(round.supporterCountMinNetPublicGoodCents) &&
  round.supporterCountMinNetPublicGoodCents >= defaultSupporterCountMinNetPublicGoodCents
    ? round.supporterCountMinNetPublicGoodCents
    : defaultSupporterCountMinNetPublicGoodCents

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const identityWeightMinForCountingBps =
  failClosedIdentityThresholdBps(round.identityWeightMinForCountingBps)

const identityWeightMinForBonusBps =
  failClosedIdentityThresholdBps(round.identityWeightMinForBonusBps)

const commonGroundBudgetId =
  commonGroundBudget?.id ?? null

const commonGroundBudgetParticipantId =
  commonGroundBudget?.participantId ?? null

const bundleCommonGroundBudgetRowCount =
  isNonEmptyString(commonGroundBudgetId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndBudgetId[
        round.id
      ]?.[commonGroundBudgetId] ?? 0
    : 0

const bundleCommonGroundBudgetParticipantRowCount =
  isNonEmptyString(commonGroundBudgetParticipantId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : 0

const commonGroundBudgetRowUnique =
  bundleCommonGroundBudgetRowCount === 1 &&
  bundleCommonGroundBudgetParticipantRowCount === 1

const commonGroundBudgetRowEligible =
  commonGroundBudget != null &&
  commonGroundBudgetRowUnique &&
  commonGroundBudget.roundId === round.id &&
  isNonEmptyString(commonGroundBudgetId) &&
  isNonEmptyString(commonGroundBudgetParticipantId)

const safeCommonGroundBudgetTotalCents =
  isPositiveIntegerCents(commonGroundBudget?.totalBudgetCents)
    ? commonGroundBudget?.totalBudgetCents ?? 0
    : 0

const safeCommonGroundBudgetPerProjectCapCents =
  isNonNegativeIntegerCents(commonGroundBudget?.perProjectCapCents)
    ? commonGroundBudget?.perProjectCapCents ?? 0
    : 0

const commonGroundBudgetCapsValid =
  commonGroundBudgetRowEligible &&
  safeCommonGroundBudgetTotalCents > 0 &&
  isNonNegativeIntegerCents(safeCommonGroundBudgetPerProjectCapCents)

const validBudgetPeriods = ["one_time", "per_round", "monthly"] as const

const budgetPeriodEligible =
  commonGroundBudgetRowEligible &&
  validBudgetPeriods.includes(commonGroundBudget?.budgetPeriod as any)

const recurringBudgetConsentEligible =
  commonGroundBudgetRowEligible &&
  (
    commonGroundBudget?.budgetPeriod === "one_time" ||
    (
      ["per_round", "monthly"].includes(commonGroundBudget?.budgetPeriod as any) &&
      isNonEmptyString(commonGroundBudget?.recurringConsentVersion) &&
      isCanonicalUtcTimestamp(commonGroundBudget?.nextCaptureAt) &&
      isNonEmptyString(commonGroundBudget?.nextCaptureRule)
    )
  )

const budgetFallbackRuleEligible =
  commonGroundBudgetRowEligible &&
  ["refund", "reroute", "carry_forward", "release_hold"].includes(
    commonGroundBudget?.fallbackRule as any
  )

const projectId =
  project?.id ?? null

const projectBucketId =
  project?.bucketId ?? null

const bundleProjectRowCount =
  isNonEmptyString(projectId)
    ? bundleDerivedProjectRowCountByRoundAndProjectId[
        round.id
      ]?.[projectId] ?? 0
    : 0

const projectRowUnique =
  bundleProjectRowCount === 1

const projectRowEligible =
  project != null &&
  projectRowUnique &&
  project.roundId === round.id &&
  isNonEmptyString(projectId) &&
  isNonEmptyString(projectBucketId)

const bundleSelectedSupportStanceRowCount =
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  commonGroundBudgetId != null &&
  projectId != null
    ? bundleDerivedSupportStanceRowCountByRoundBudgetAndProjectId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId] ?? 0
    : 0

const supportStanceRowUnique =
  supportStance == null
    ? bundleSelectedSupportStanceRowCount === 0
    : bundleSelectedSupportStanceRowCount === 1

const supportStanceRowEligible =
  supportStance == null
    ? supportStanceRowUnique
    : supportStanceRowUnique &&
      commonGroundBudgetRowEligible &&
      projectRowEligible &&
      isNonEmptyString(supportStance.id) &&
      supportStance.commonGroundBudgetId === commonGroundBudgetId &&
      supportStance.roundId === round.id &&
      supportStance.participantId === commonGroundBudgetParticipantId &&
      supportStance.projectId === projectId

const validStances = ["strong", "weak", "dissent", "abstain"] as const

const supportStanceInputEligible =
  supportStanceRowEligible &&
  supportStance != null

const effectiveStance =
  supportStanceInputEligible &&
  validStances.includes(supportStance.stance as any)
    ? supportStance.stance
    : "abstain"

const acceptableCounterBucketIdsFromStance =
  supportStanceInputEligible
    ? stringArrayOrEmpty(supportStance.acceptableCounterBucketIds)
    : []

const rawSupportStanceMaxAllocCents =
  supportStanceInputEligible
    ? supportStance.maxAllocCents
    : 0

const supportStanceMaxAllocCents =
  isNonNegativeIntegerCents(rawSupportStanceMaxAllocCents)
    ? rawSupportStanceMaxAllocCents
    : 0

const supportStanceMaxAllocBps =
  supportStanceInputEligible
    ? normalizeBps(supportStance.maxAllocBps ?? null)
    : null

const supportStanceCapsValid =
  supportStanceInputEligible &&
  isNonNegativeIntegerCents(supportStanceMaxAllocCents) &&
  (supportStance.maxAllocBps == null || isValidBps(supportStance.maxAllocBps, 10_000))

const identityEligibilityRow = identityEligibility ?? null

const bundleIdentityEligibilityRowCount =
  commonGroundBudgetRowEligible && commonGroundBudgetParticipantId != null
    ? bundleDerivedIdentityEligibilityRowCountByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : 0

const identityEligibilityRowUnique =
  bundleIdentityEligibilityRowCount === 1

const identityWeightBps =
  identityWeightBpsOrZero(identityEligibilityRow?.countedWeightBps)

const identityEligibilityRowEligible =
  commonGroundBudgetRowEligible &&
  identityEligibilityRowUnique &&
  identityEligibilityRow != null &&
  identityEligibilityRow.participantId === commonGroundBudgetParticipantId &&
  identityEligibilityRow.roundId === round.id

const identityCountingClear =
  identityEligibilityRowEligible &&
  identityEligibilityRow.humanVerified === true &&
  identityEligibilityRow.sybilRiskState === "clear" &&
  identityEligibilityRow.collusionRiskState === "clear"

const countingEligible =
  identityCountingClear &&
  identityWeightBps >= identityWeightMinForCountingBps

const bonusEligible =
  identityCountingClear &&
  identityWeightBps >= identityWeightMinForBonusBps

const supportStanceBpsCapCents =
  supportStanceMaxAllocBps == null
    ? supportStanceMaxAllocCents
    : floorMulDivNonNegative(safeCommonGroundBudgetTotalCents, supportStanceMaxAllocBps, 10_000)

const stanceCap = min(
  supportStanceMaxAllocCents,
  supportStanceBpsCapCents
)

const roundClosePaymentCommitmentSnapshotRowCount =
  commonGroundBudgetRowEligible && commonGroundBudgetId != null
    ? bundleDerivedPaymentCommitmentSnapshotRowCountByRoundBudgetAndKind[
        round.id
      ]?.[commonGroundBudgetId]?.round_close ?? 0
    : 0

const roundClosePaymentCommitmentSnapshotUnique =
  roundClosePaymentCommitmentSnapshotRowCount === 1

const roundClosePaymentCommitmentSnapshot =
  roundClosePaymentCommitmentSnapshotUnique &&
  commonGroundBudgetRowEligible && commonGroundBudgetId != null
    ? paymentCommitmentSnapshotByRoundBudgetAndKind[
        round.id
      ]?.[commonGroundBudgetId]?.round_close
    : null

const paymentCommitmentEligible =
  roundClosePaymentCommitmentSnapshotUnique &&
  roundClosePaymentCommitmentSnapshot != null &&
  roundClosePaymentCommitmentSnapshot.snapshotKind === "round_close" &&
  roundClosePaymentCommitmentSnapshot.roundId === round.id &&
  roundClosePaymentCommitmentSnapshot.participantId === commonGroundBudgetParticipantId &&
  roundClosePaymentCommitmentSnapshot.commonGroundBudgetId === commonGroundBudgetId &&
  roundClosePaymentCommitmentSnapshot.rulebookHash === round.rulebookHash &&
  timestampEquals(roundClosePaymentCommitmentSnapshot.asOf, round.closesAt) &&
  isNonEmptyString(roundClosePaymentCommitmentSnapshot.paymentMethodRef) &&
  timestampLte(roundClosePaymentCommitmentSnapshot.paymentMethodSavedAt, round.closesAt) &&
  roundClosePaymentCommitmentSnapshot.paymentMethodCommitmentState === "provider_confirmed" &&
  timestampLte(roundClosePaymentCommitmentSnapshot.paymentMethodConfirmedAt, round.closesAt) &&
  paymentCommitmentSnapshotBindingHashValid(roundClosePaymentCommitmentSnapshot)

const paymentCommitmentRequirementSatisfied =
  round.deploymentMode === "shadow" || paymentCommitmentEligible

const budgetEligible =
  roundClearingInputBundleEligible &&
  commonGroundBudgetRowEligible &&
  commonGroundBudgetCapsValid &&
  budgetPeriodEligible &&
  recurringBudgetConsentEligible &&
  budgetFallbackRuleEligible &&
  commonGroundBudget?.state === "active" &&
  commonGroundBudget?.canceledAt == null &&
  safeCommonGroundBudgetTotalCents > 0 &&
  commonGroundBudget?.rulebookHashAtConsent === round.rulebookHash &&
  paymentCommitmentRequirementSatisfied

const conditionalIntentAcceptableCounterBucketIds =
  stringArrayOrEmpty(conditionalTradeIntent?.acceptableCounterBucketIds)

const conditionalIntentMinCounterpartyVolumeCents =
  isPositiveIntegerCents(conditionalTradeIntent?.minCounterpartyVolumeCents)
    ? conditionalTradeIntent.minCounterpartyVolumeCents
    : 0

const conditionalIntentAmountCents =
  isPositiveIntegerCents(conditionalTradeIntent?.amountCents)
    ? conditionalTradeIntent.amountCents
    : 0

const conditionalIntentMaxExposureCents =
  isPositiveIntegerCents(conditionalTradeIntent?.maxExposureCents)
    ? conditionalTradeIntent.maxExposureCents
    : 0

const validConditionalIntentAuthorizationStates = [
  "none",
  "payment_method_saved",
  "authorized",
] as const

const validFallbackRules = [
  "refund",
  "reroute",
  "carry_forward",
  "release_hold",
] as const

const conditionalIntentAuthorizationStateEligible =
  validConditionalIntentAuthorizationStates.includes(
    conditionalTradeIntent?.authorizationState as any
  )

const conditionalIntentFallbackRuleEligible =
  validFallbackRules.includes(conditionalTradeIntent?.fallbackRule as any)

const budgetAndIntentFallbackRuleConsistent =
  budgetFallbackRuleEligible &&
  conditionalIntentFallbackRuleEligible &&
  commonGroundBudget?.fallbackRule === conditionalTradeIntent?.fallbackRule

const bundleClearingEligibleConditionalIntentRowCount =
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  commonGroundBudgetId != null &&
  projectId != null
    ? bundleDerivedClearingEligibleConditionalIntentRowCountByRoundBudgetAndProjectId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId] ?? 0
    : 0

const conditionalIntentRowEligible =
  bundleClearingEligibleConditionalIntentRowCount === 1 &&
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  conditionalTradeIntent != null &&
  isNonEmptyString(conditionalTradeIntent.id) &&
  conditionalTradeIntent.commonGroundBudgetId === commonGroundBudgetId &&
  conditionalTradeIntent.roundId === round.id &&
  conditionalTradeIntent.projectId === projectId &&
  conditionalTradeIntent.participantId === commonGroundBudgetParticipantId

const conditionalIntentEligible =
  conditionalIntentRowEligible &&
  conditionalTradeIntent.state === "active" &&
  conditionalIntentAuthorizationStateEligible &&
  conditionalIntentFallbackRuleEligible &&
  budgetAndIntentFallbackRuleConsistent &&
  conditionalTradeIntent.rulebookHashAtConsent === round.rulebookHash &&
  conditionalIntentAmountCents > 0 &&
  conditionalIntentMaxExposureCents > 0 &&
  conditionalIntentMinCounterpartyVolumeCents > 0 &&
  conditionalIntentAcceptableCounterBucketIds.length > 0

const roundMoralBucketSnapshotEligible =
  roundMoralBucketSnapshot != null &&
  roundMoralBucketSnapshot.id === round.moralBucketSnapshotId &&
  roundMoralBucketSnapshot.roundId === round.id &&
  roundMoralBucketSnapshot.rulebookHash === round.rulebookHash &&
  roundMoralBucketSnapshot.snapshotHash === round.moralBucketSnapshotHash &&
  roundMoralBucketSnapshotBindingHashValid(roundMoralBucketSnapshot) &&
  roundMoralBucketSnapshotGraphWellFormed(roundMoralBucketSnapshot) &&
  timestampLte(roundMoralBucketSnapshot.createdAt, round.parametersFrozenAt) &&
  roundMoralBucketSnapshot.asymmetricPairCount === 0

const projectBucketIdForCounterpartyValidation =
  projectRowEligible ? projectBucketId : null

const projectBucketInFrozenSnapshot =
  roundMoralBucketSnapshotEligible &&
  projectBucketIdForCounterpartyValidation != null &&
  roundMoralBucketSnapshot.bucketIds.includes(projectBucketIdForCounterpartyValidation)

const reciprocalDistinctCounterBucketIds =
  projectBucketInFrozenSnapshot
    ? roundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId[
        projectBucketIdForCounterpartyValidation
      ] ?? []
    : []

const validatedCounterBucketIds = conditionalIntentEligible
  ? intersection(
      acceptableCounterBucketIdsFromStance,
      conditionalIntentAcceptableCounterBucketIds,
      reciprocalDistinctCounterBucketIds
    )
  : []

const crossViewIntentEligible =
  conditionalIntentEligible &&
  projectBucketInFrozenSnapshot &&
  validatedCounterBucketIds.length > 0 &&
  conditionalIntentMinCounterpartyVolumeCents > 0

const intentCapCents = crossViewIntentEligible
  ? min(conditionalIntentAmountCents, conditionalIntentMaxExposureCents)
  : 0

const rawParticipantRemainingRoundBudgetCents =
  commonGroundBudgetRowEligible
    ? bundleDerivedRemainingBudgetCentsByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : 0

const participantRemainingRoundBudgetCents =
  isNonNegativeIntegerCents(rawParticipantRemainingRoundBudgetCents)
    ? rawParticipantRemainingRoundBudgetCents
    : 0

const rawProjectRemainingRequestedCapCents =
  projectRowEligible && projectId != null
    ? bundleDerivedRemainingRequestedCapCentsByRoundAndProjectId[
        round.id
      ]?.[projectId] ?? 0
    : 0

const projectRemainingRequestedCapCents =
  isNonNegativeIntegerCents(rawProjectRemainingRequestedCapCents)
    ? rawProjectRemainingRequestedCapCents
    : 0

const rawDeploymentRoundRemainingGrossExposureCents =
  round.deploymentMode === "capped_pilot"
    ? bundleDerivedDeploymentRemainingGrossExposureCentsByRoundId[round.id] ?? 0
    : participantRemainingRoundBudgetCents

const rawDeploymentParticipantRemainingGrossExposureCents =
  round.deploymentMode === "capped_pilot" && commonGroundBudgetParticipantId != null
    ? bundleDerivedDeploymentRemainingGrossExposureCentsByRoundAndParticipantId[
        round.id
      ]?.[commonGroundBudgetParticipantId] ?? 0
    : participantRemainingRoundBudgetCents

const deploymentRoundRemainingGrossExposureCents =
  isNonNegativeIntegerCents(rawDeploymentRoundRemainingGrossExposureCents)
    ? rawDeploymentRoundRemainingGrossExposureCents
    : 0

const deploymentParticipantRemainingGrossExposureCents =
  isNonNegativeIntegerCents(rawDeploymentParticipantRemainingGrossExposureCents)
    ? rawDeploymentParticipantRemainingGrossExposureCents
    : 0

const pilotConfiguredRoundGrossExposureCapCents =
  round.deploymentMode === "capped_pilot" &&
  isPositiveIntegerCents(round.pilotMaxRoundGrossExposureCents)
    ? round.pilotMaxRoundGrossExposureCents
    : 0

const pilotConfiguredParticipantGrossExposureCapCents =
  round.deploymentMode === "capped_pilot" &&
  isPositiveIntegerCents(round.pilotMaxParticipantGrossExposureCents)
    ? round.pilotMaxParticipantGrossExposureCents
    : 0

const deploymentGrossExposureCapCents =
  round.deploymentMode === "shadow"
    ? participantRemainingRoundBudgetCents
    : round.deploymentMode === "capped_pilot"
      ? min(
          pilotConfiguredRoundGrossExposureCapCents,
          pilotConfiguredParticipantGrossExposureCapCents,
          deploymentRoundRemainingGrossExposureCents,
          deploymentParticipantRemainingGrossExposureCents
        )
      : participantRemainingRoundBudgetCents

const deploymentModeCalculationEligible =
  roundDeploymentModeEligible &&
  deploymentGrossExposureCapCents > 0

const bindingPaymentModeEligible =
  roundDeploymentModeEligible &&
  round.deploymentMode !== "shadow"

const candidateGrossAllocCents =
  budgetEligible && deploymentModeCalculationEligible && projectRowEligible && supportStanceRowEligible && supportStanceCapsValid && crossViewIntentEligible && ["strong", "weak"].includes(effectiveStance)
    ? min(
        participantRemainingRoundBudgetCents,
        deploymentGrossExposureCapCents,
        safeCommonGroundBudgetPerProjectCapCents,
        intentCapCents,
        stanceCap,
        projectRemainingRequestedCapCents
      )
    : 0

const candidateConditionalIntentId =
  conditionalIntentRowEligible ? conditionalTradeIntent.id : null

const bundleFeeQuoteRowCount =
  commonGroundBudgetRowEligible &&
  projectRowEligible &&
  candidateConditionalIntentId != null &&
  commonGroundBudgetId != null &&
  projectId != null
    ? bundleDerivedFeeQuoteRowCountByRoundBudgetProjectAndIntentId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId]?.[candidateConditionalIntentId] ?? 0
    : 0

const feeQuoteRowUnique =
  bundleFeeQuoteRowCount === 1

const feeQuote =
  feeQuoteRowUnique &&
  commonGroundBudgetId != null &&
  projectId != null &&
  candidateConditionalIntentId != null
    ? feeQuoteByRoundBudgetProjectAndIntentId[
        round.id
      ]?.[commonGroundBudgetId]?.[projectId]?.[candidateConditionalIntentId]
    : null

const feeQuoteEligible =
  candidateGrossAllocCents > 0 &&
  feeQuoteRowUnique &&
  feeQuote != null &&
  feeQuote.roundId === round.id &&
  feeQuote.participantId === commonGroundBudgetParticipantId &&
  feeQuote.commonGroundBudgetId === commonGroundBudgetId &&
  feeQuote.projectId === projectId &&
  feeQuote.conditionalTradeIntentId === candidateConditionalIntentId &&
  feeQuote.rulebookHash === round.rulebookHash &&
  feeQuote.feePolicyVersion === round.feePolicyVersion &&
  feeQuote.feePolicyHash === round.feePolicyHash &&
  (feeQuote.feePayer !== "sponsor_paid" || feeQuote.sponsorFeeBackingHash === round.sponsorPoolSourceHash) &&
  feeQuote.grossCapturedCents === candidateGrossAllocCents &&
  timestampEquals(feeQuote.sourceCutoffAt, round.closesAt) &&
  feeQuoteBindingHashValid(feeQuote)

const bindingFeeQuoteEligible =
  feeQuoteEligible && bindingPaymentModeEligible

const shadowFeeQuoteEligible =
  feeQuoteEligible && round.deploymentMode === "shadow"

const actualAllocCents =
  bindingFeeQuoteEligible ? candidateGrossAllocCents : 0

const grossCapturedCents =
  bindingFeeQuoteEligible ? feeQuote.grossCapturedCents : 0

const feeCents =
  bindingFeeQuoteEligible ? feeQuote.feeCents : 0

const netRecipientDisbursedCents =
  bindingFeeQuoteEligible ? feeQuote.netRecipientDisbursedCents : 0

const publicGoodCreditCents =
  netRecipientDisbursedCents

const shadowPreviewGrossAllocCents =
  shadowFeeQuoteEligible ? candidateGrossAllocCents : 0

const shadowPreviewFeeCents =
  shadowFeeQuoteEligible ? feeQuote.feeCents : 0

const shadowPreviewNetRecipientDisbursedCents =
  shadowFeeQuoteEligible ? feeQuote.netRecipientDisbursedCents : 0

const shadowPreviewPublicGoodCreditCents =
  shadowPreviewNetRecipientDisbursedCents

const countedContributionCents =
  countingEligible && bindingFeeQuoteEligible
    ? floorMulDivNonNegative(min(publicGoodCreditCents, roundDonorCountedCapCents), identityWeightBps, 10_000)
    : 0

const matchEligibleCents =
  bonusEligible &&
  bindingFeeQuoteEligible &&
  identityEligibilityRow?.sybilRiskState === "clear" &&
  identityEligibilityRow?.collusionRiskState === "clear"
    ? min(countedContributionCents, roundDonorCountedCapCents)
    : 0

const verifiedSupporterBreadthEligible =
  countingEligible &&
  bindingFeeQuoteEligible &&
  countedContributionCents > 0 &&
  publicGoodCreditCents >= supporterCountMinNetPublicGoodCents

const activeMoralClusterBreadthEligible =
  verifiedSupporterBreadthEligible

const shadowPreviewCountedContributionCents =
  countingEligible && shadowFeeQuoteEligible
    ? floorMulDivNonNegative(min(shadowPreviewPublicGoodCreditCents, roundDonorCountedCapCents), identityWeightBps, 10_000)
    : 0

const shadowPreviewMatchEligibleCents =
  bonusEligible &&
  shadowFeeQuoteEligible &&
  identityEligibilityRow?.sybilRiskState === "clear" &&
  identityEligibilityRow?.collusionRiskState === "clear"
    ? min(shadowPreviewCountedContributionCents, roundDonorCountedCapCents)
    : 0

const shadowPreviewVerifiedSupporterBreadthEligible =
  countingEligible &&
  shadowFeeQuoteEligible &&
  shadowPreviewCountedContributionCents > 0 &&
  shadowPreviewPublicGoodCreditCents >= supporterCountMinNetPublicGoodCents

const shadowPreviewActiveMoralClusterBreadthEligible =
  shadowPreviewVerifiedSupporterBreadthEligible
```

Reject or store-as-zero any persisted identity weight outside `0..10_000` basis points before the round can lock. Reject or zero invalid monetary/cap fields before candidate allocation: negative, fractional, NaN, or malformed cent values and malformed basis-point caps must never produce negative or fractional allocation outputs. A paused, expired, canceled, rulebook-mismatched, missing provider-confirmed payment-commitment snapshot in a binding `capped_pilot` or `full` round, or consent-invalid budget contributes zero in all gross/fee/net-recipient/actual/count/match-eligible accounting channels and must not be routed, authorized, or captured. In `shadow` deployment mode, binding gross/fee/net-recipient/actual/count/match-eligible accounting channels are also zero; any dry-run quantities are written only to `shadowPreview*` channels and never satisfy binding thresholds, counterparty volume, matching, authorization, failure-bonus qualification, payout, or receipts. A missing, inactive, rulebook-mismatched, or zero-exposure conditional intent also contributes zero. Dissent allocates no money and may increment raw review-pressure / reporting queues, but only verified-clear duplicate-cluster-excluded dissent rows may affect payout-relevant `dissentPressureFixed` or bonus scoring.

### Stage 3: Coalition Clearing

Implement a deterministic optimizer that maximizes:

```text
1. total match-eligible cross-view cleared cents
2. net recipient-disbursed cents to verified public-good recipients
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
symmetric bucket-distinctness constraints using the frozen `RoundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId` bound by `round.moralBucketSnapshotId` and `round.moralBucketSnapshotHash`
no sponsor-funded, platform-funded, self-matched, linked-account, same-payment-method / same-payment-cluster, or same-control counterparty satisfaction
user rank-order constraints unless unrestricted routing is explicitly enabled
```

A user's pledge to project `p` may clear only when:

```ts
const stageThreeCounterpartyVolumeCents =
  isNonNegativeIntegerCents(
    counterpartyVolumeCentsByRoundParticipantBudgetProjectIntent[
      round.id
    ]?.[participantId]?.[commonGroundBudgetId]?.[projectId]?.[conditionalTradeIntentId]
  )
    ? counterpartyVolumeCentsByRoundParticipantBudgetProjectIntent[
        round.id
      ]?.[participantId]?.[commonGroundBudgetId]?.[projectId]?.[conditionalTradeIntentId]
    : 0

const stageThreeCounterpartyConstraintSatisfied =
  stageThreeCounterpartyVolumeCents >= conditionalIntentMinCounterpartyVolumeCents
```

where `stageThreeCounterpartyVolumeCents` is a deterministic derived integer-cent value keyed by current round, participant, Common Ground Budget, project, and conditional-intent identifiers. It counts only donor-originated match-eligible cleared dollars in projects whose moral bucket is in `validatedCounterBucketIds`, excluding sponsor funds, platform funds, the user's own dollars, linked accounts, same-payment-method / same-payment-cluster accounts, and same-control entities. The threshold on the right side is the locally sanitized active `ConditionalTradeIntent.minCounterpartyVolumeCents`; `ProjectSupportStance.minCounterpartyVolumeCents` is a deprecated mirror and must not be used for final clearing. `validatedCounterBucketIds` must be the intersection of the user's acceptable counterparty buckets, the active conditional intent's acceptable counterparty buckets, and the bundle-derived project bucket's reciprocally validated distinct bucket set from the frozen `RoundMoralBucketSnapshot`.

Use an ILP solver if already acceptable in the repo. Otherwise implement a deterministic greedy approximation and clearly version it as `crecm-greedy-v1`, with unit tests demonstrating constraint satisfaction. In either solver or greedy mode, equal-objective solutions are resolved only by the calculation-version-bound stable tie-break tuple; repo/database iteration order is not a valid tie-breaker.

For binding `capped_pilot` and `full` rounds, Stage 3 must emit exactly one selected `OptimizationRunTrace` for the current round and eligible round-close bundle before any binding allocation, matching, authorization, payout, failure-bonus, or audit output can proceed. The trace must bind `roundId`, `clearingInputBundleId`, `clearingInputBundleHash`, `calculationVersion`, `optimizationStage`, `traceSchemaVersion`, `optimizationPolicyHash`, `solverMode`, `solverVersion`, `optimalityStatus`, `optimizationInputHash`, `objectiveVectorHash`, `stableTieBreakTupleHash`, `selectedCoalitionHash`, `selectedAllocationRowsHash`, `constraintSatisfactionHash`, `createdAt`, and `optimizationTraceHash`. ILP traces may clear only with `optimalityStatus === "optimal"`; deterministic greedy traces may clear only when the frozen calculation version and deployment audit explicitly select the same greedy solver mode/version and `optimalityStatus === "deterministic_greedy_selected"`. `timeout`, `infeasible`, `unknown`, `failed`, missing, duplicate, wrong-policy, wrong-stage, wrong-bundle, wrong-calculation-version, missing-allocation-hash, missing-constraint-hash, or non-hash-bound traces fail closed to zero binding outputs; shadow rounds may publish only `shadowPreview*` optimization outputs when the trace is provisional.

```ts
const optimizationTraceRowCount =
  optimizationRunTraceRowCountByRoundBundleVersionAndStage[
    round.id
  ]?.[roundClearingInputBundle.id]?.[round.calculationVersion]?.stage_3_coalition_clearing ?? 0

const optimizationRunTraceBindingHashValid = (trace) =>
  trace != null &&
  roundClearingInputBundleEligible &&
  isNonEmptyString(trace.id) &&
  trace.roundId === round.id &&
  trace.clearingInputBundleId === roundClearingInputBundle.id &&
  trace.clearingInputBundleHash === roundClearingInputBundle.bundleHash &&
  trace.calculationVersion === round.calculationVersion &&
  trace.optimizationStage === "stage_3_coalition_clearing" &&
  isNonEmptyString(trace.traceSchemaVersion) &&
  trace.optimizationPolicyHash === round.optimizationPolicyHash &&
  isCanonicalHash(trace.optimizationPolicyHash) &&
  ["ilp", "deterministic_greedy"].includes(trace.solverMode as any) &&
  isNonEmptyString(trace.solverVersion) &&
  (
    (trace.solverMode === "ilp" && trace.optimalityStatus === "optimal") ||
    (
      trace.solverMode === "deterministic_greedy" &&
      trace.optimalityStatus === "deterministic_greedy_selected" &&
      (
        round.deploymentMode !== "full" ||
        (
          deploymentAudit != null &&
          deploymentAudit.solverMode === "deterministic_greedy" &&
          deploymentAudit.solverVersion === trace.solverVersion &&
          deploymentAudit.optimizationPolicyHash === trace.optimizationPolicyHash
        )
      )
    )
  ) &&
  isCanonicalHash(trace.optimizationInputHash) &&
  isCanonicalHash(trace.objectiveVectorHash) &&
  isCanonicalHash(trace.stableTieBreakTupleHash) &&
  isCanonicalHash(trace.selectedCoalitionHash) &&
  isCanonicalHash(trace.selectedAllocationRowsHash) &&
  isCanonicalHash(trace.constraintSatisfactionHash) &&
  isCanonicalUtcTimestamp(trace.createdAt) &&
  timestampLte(roundClearingInputBundle.createdAt, trace.createdAt) &&
  isCanonicalHash(trace.optimizationTraceHash) &&
  trace.optimizationTraceHash === sha256(canonicalJson({
    id: trace.id,
    roundId: trace.roundId,
    clearingInputBundleId: trace.clearingInputBundleId,
    clearingInputBundleHash: trace.clearingInputBundleHash,
    calculationVersion: trace.calculationVersion,
    optimizationStage: trace.optimizationStage,
    traceSchemaVersion: trace.traceSchemaVersion,
    optimizationPolicyHash: trace.optimizationPolicyHash,
    solverMode: trace.solverMode,
    solverVersion: trace.solverVersion,
    optimalityStatus: trace.optimalityStatus,
    optimizationInputHash: trace.optimizationInputHash,
    objectiveVectorHash: trace.objectiveVectorHash,
    stableTieBreakTupleHash: trace.stableTieBreakTupleHash,
    selectedCoalitionHash: trace.selectedCoalitionHash,
    selectedAllocationRowsHash: trace.selectedAllocationRowsHash,
    constraintSatisfactionHash: trace.constraintSatisfactionHash,
    createdAt: trace.createdAt,
  }))

const selectedOptimizationRunTraceEligible =
  round.deploymentMode === "shadow"
    ? optimizationRunTrace == null || optimizationRunTraceBindingHashValid(optimizationRunTrace)
    : optimizationTraceRowCount === 1 &&
      optimizationRunTraceBindingHashValid(optimizationRunTrace)
```

### Stage 4: Base Match

For all cleared projects, normalize project-specific basis-point fields before computing integer-cent claims:

```ts
const stageRoundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const defaultBaseMatchRatioBps = 10_000 // 1.0x

const stageBaseMatchRatioBps =
  normalizeMatchBps(project.baseMatchRatioBps, defaultBaseMatchRatioBps)

baseMatchClaimCents[projectId] =
  floorMulDivNonNegative(matchEligibleClearedCents[projectId], stageBaseMatchRatioBps, 10_000)

const safeStageBaseMatchClaimCentsForProject = (projectId: string) =>
  Number.isSafeInteger(baseMatchClaimCents[projectId]) &&
  baseMatchClaimCents[projectId] >= 0
    ? baseMatchClaimCents[projectId]
    : 0

const baseMatchPoolAvailableCents =
  roundClearingInputBundleEligible
    ? min(stageRoundBaseMatchBudgetCents, sponsorBackedCentsForFinalClearing("base_match"))
    : 0
```

If total base-match claims are zero, allocate zero base match. If the backed base-match pool is sufficient, pay each claim exactly. Prorate only when total claims exceed the backed pool. In the formulas below, `clearedProjectIds` means the deterministic stable-order list of current-round project IDs whose `CoalitionClearanceResult.failureReason === "none"`:

```ts
const sumBaseMatchClaimsForAllClearedProjectsInt =
  sumBigInt(clearedProjectIds.map(projectId => safeStageBaseMatchClaimCentsForProject(projectId)))

baseMatch[projectId] =
  sumBaseMatchClaimsForAllClearedProjectsInt <= 0n
    ? 0
    : sumBaseMatchClaimsForAllClearedProjectsInt <= BigInt(baseMatchPoolAvailableCents)
      ? safeStageBaseMatchClaimCentsForProject(projectId)
      : bigIntToSafeCentsOrZero(
          (BigInt(baseMatchPoolAvailableCents) * BigInt(safeStageBaseMatchClaimCentsForProject(projectId))) /
          sumBaseMatchClaimsForAllClearedProjectsInt
        )
```

Allocate any leftover base-match rounding cents by deterministic stable order using `sha256(canonicalJson({ roundId, projectId, prorationScope: "base_match_rounding" }))`, never above each project's sanitized `baseMatchClaimCents`, and include the tuple fields and rounding method in the calculation hash. Unused backed base-match pool remains unspent or carries forward under sponsor terms.

### Stage 5: Capped Diversity-Aware Bonus

Compute from stance-weighted match-eligible contributions, not raw actual, merely counted, or unweighted match-eligible contributions. The Stage 5 implementation must use the deterministic fixed-point / pinned-decimal arithmetic rule from Section 9.2 and must serialize the quantized score inputs into the calculation hash:

Use these fixed-point constants before any bonus-score formula below:

```ts
const alphaFixed = "0.200000000000"
const betaFixed = "0.200000000000"
const gammaFixed = "0.500000000000"
const weakWeightFixed = "0.600000000000"
const strongWeightFixed = "1.000000000000"
const dissentWeightFixed = "0.000000000000"
const abstainWeightFixed = "0.000000000000"
```

```ts
const stanceWeightFixedByStance = {
  strong: "1.000000000000",
  weak: "0.600000000000",
  dissent: "0.000000000000",
  abstain: "0.000000000000",
} as const

stanceWeightFixed[userId][projectId] =
  stanceWeightFixedByStance[
    effectiveStanceByUserProject[userId][projectId] ?? "abstain"
  ]

effectiveMatchEligibleContributionFixed[userId][projectId] =
  fixedMultiply(
    integerCentsToFixed(matchEligibleContribution[userId][projectId], 12),
    stanceWeightFixed[userId][projectId],
    12
  )

sqrtEffectiveMatchEligibleContributionFixed[userId][projectId] =
  fixedSqrt(effectiveMatchEligibleContributionFixed[userId][projectId], 12)

sumSqrtEffectiveFixed[projectId] =
  fixedSumUsers(sqrtEffectiveMatchEligibleContributionFixed[userId][projectId], 12)

sumEffectiveContributionFixed[projectId] =
  fixedSumUsers(effectiveMatchEligibleContributionFixed[userId][projectId], 12)

qfRawFixed[projectId] =
  fixedMax(
    "0.000000000000",
    fixedSubtract(
      fixedSquare(sumSqrtEffectiveFixed[projectId], 12),
      sumEffectiveContributionFixed[projectId],
      12
    )
  )

qfRaw[projectId] =
  fixedToReportingNumber(qfRawFixed[projectId]) // reporting alias only
```

Then compute the diversity factor from validated cluster diversity and verified-clear dissent pressure. `verifiedClearDissentCountByProjectId` is derived from immutable current-round dissent stances only after human-verification, sybil/collusion-clear, and duplicate-cluster exclusions; raw dissent counts are reporting/review signals only.

```ts
const clusterShareDistributionValid =
  isValidFixedProbabilityDistribution(clusterShareDistribution[projectId])

clusterDiversityFixed[projectId] =
  clusterShareDistributionValid
    ? fixedNormalizedEntropy(clusterShareDistribution[projectId], 12)
    : "0.000000000000"

const safeReviewPressureThreshold =
  Number.isSafeInteger(reviewPressureThreshold) && reviewPressureThreshold > 0
    ? reviewPressureThreshold
    : 1

const safeDissentCount =
  Number.isSafeInteger(verifiedClearDissentCountByProjectId[projectId]) &&
  verifiedClearDissentCountByProjectId[projectId] >= 0
    ? verifiedClearDissentCountByProjectId[projectId]
    : 0

dissentPressureFixed[projectId] =
  fixedMin(
    "1.000000000000",
    fixedDivide(integerToFixed(safeDissentCount, 12), integerToFixed(safeReviewPressureThreshold, 12), 12)
  )

diversityFactorFixed[projectId] =
  fixedClamp(
    fixedSubtract(
      fixedAdd("1.000000000000", fixedMultiply(alphaFixed, clusterDiversityFixed[projectId], 12), 12),
      fixedMultiply(betaFixed, dissentPressureFixed[projectId], 12),
      12
    ),
    "0.750000000000",
    "1.250000000000"
  )

diversityFactor[projectId] =
  fixedToReportingNumber(diversityFactorFixed[projectId]) // reporting alias only
```

Bonus-cap basis-point default. Use the fixed-point alpha/beta/gamma/stance-weight constants defined above; do not redeclare them in the same implementation scope:

```ts
const defaultBonusCapMultipleBps = 10_000 // 1.0x
```

Normalize project-specific bonus-cap basis points before use:

```ts
const stageBonusCapMultipleBps =
  normalizeMatchBps(project.bonusCapMultipleBps, defaultBonusCapMultipleBps)
```

Compute deterministic adjusted score units:

```ts
const safeCollusionRiskScoreFixed =
  fixedIsInRange(collusionRiskScoreFixed[projectId], "0.000000000000", "1.000000000000", 12)
    ? collusionRiskScoreFixed[projectId]
    : "1.000000000000"

antiManipulationDiscountFixed[projectId] =
  fixedClamp(
    fixedSubtract("1.000000000000", fixedMultiply(gammaFixed, safeCollusionRiskScoreFixed, 12), 12),
    "0.000000000000",
    "1.000000000000"
  )

qfAdjustedFixed[projectId] =
  fixedMax(
    "0.000000000000",
    fixedMultiply(
      fixedMultiply(qfRawFixed[projectId], diversityFactorFixed[projectId], 12),
      antiManipulationDiscountFixed[projectId],
      12
    )
  )

bonusScoreUnits[projectId] =
  decimalFixedToCanonicalNonNegativeIntegerString(qfAdjustedFixed[projectId], 12)

const isCanonicalNonNegativeIntegerString = (value: unknown) =>
  typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)

const canonicalNonNegativeIntegerStringToBigIntOrZero = (value: unknown) =>
  isCanonicalNonNegativeIntegerString(value) ? BigInt(value as string) : 0n

bonusScoreUnitsInt[projectId] =
  canonicalNonNegativeIntegerStringToBigIntOrZero(bonusScoreUnits[projectId])
```

If all adjusted bonus-score units are zero, allocate zero bonus rather than dividing by zero. Apply the project cap operationally using deterministic capped proration:

```ts
const stageRoundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const bonusPoolAvailableCents =
  roundClearingInputBundleEligible
    ? min(stageRoundBonusBudgetCents, sponsorBackedCentsForFinalClearing("bonus_match"))
    : 0

bonusCapCents[projectId] =
  floorMulDivNonNegative(matchEligibleClearedCents[projectId], stageBonusCapMultipleBps, 10_000)

const safeStageBonusScoreUnitsIntForProject = (projectId: string) =>
  typeof bonusScoreUnitsInt[projectId] === "bigint" && bonusScoreUnitsInt[projectId] >= 0n
    ? bonusScoreUnitsInt[projectId]
    : 0n

const safeStageBonusCapCentsForProject = (projectId: string) =>
  Number.isSafeInteger(bonusCapCents[projectId]) && bonusCapCents[projectId] >= 0
    ? bonusCapCents[projectId]
    : 0

const safeStageProportionalBonusCentsForProject = (projectId: string) =>
  Number.isSafeInteger(proportionalBonusCents[projectId]) && proportionalBonusCents[projectId] >= 0
    ? proportionalBonusCents[projectId]
    : 0

const sumBonusScoreUnitsForAllClearedProjectsInt =
  sumBigInt(clearedProjectIds.map(projectId => safeStageBonusScoreUnitsIntForProject(projectId)))

proportionalBonusCents[projectId] =
  sumBonusScoreUnitsForAllClearedProjectsInt <= 0n
    ? 0
    : bigIntToSafeCentsOrZero(
        (BigInt(bonusPoolAvailableCents) * safeStageBonusScoreUnitsIntForProject(projectId)) /
        sumBonusScoreUnitsForAllClearedProjectsInt
      )

bonusMatch[projectId] =
  min(safeStageProportionalBonusCentsForProject(projectId), safeStageBonusCapCentsForProject(projectId))
```

If capped projects leave bonus-pool dollars unallocated, run additional deterministic capped-proration passes among projects with positive remaining cap and positive `bonusScoreUnitsInt`. If no eligible uncapped project remains, leftover bonus-pool cents remain unspent or carry forward under sponsor terms. Allocate any leftover bonus-match rounding cents by deterministic stable order using `sha256(canonicalJson({ roundId, projectId, prorationScope: "bonus_match_rounding", cappedProrationPass }))`, never above each project's sanitized `bonusCapCents`, and include the capped-proration pass count, tuple fields, remaining-cap rule, and rounding method in the calculation hash.

### Stage 5B: Contributor-Only Success Rewards / Credits

After Stage 5 and before authorization side effects, compute non-binding expected success-reward, coordination-credit, and impact-certificate outputs from the same frozen bundle. These estimates become binding only after Stage 6 exact-amount authorization reconciliation and successful capture.

```ts
const successRewardPoolAvailableCents =
  roundClearingInputBundleEligible &&
  roundSuccessRewardBudgetCents > 0 &&
  sponsorBackedCentsForFinalClearing("success_reward") >= roundSuccessRewardBudgetCents
    ? roundSuccessRewardBudgetCents
    : 0

const successRewardParticipantEligible = (row) =>
  successRewardPoolAvailableCents > 0 &&
  row.commonGroundBudget.successRewardOptIn === true &&
  row.conditionalTradeIntent.successRewardOptIn === true &&
  row.identityEligibility.humanVerified === true &&
  row.identityEligibility.sybilRiskState === "clear" &&
  row.identityEligibility.collusionRiskState === "clear" &&
  row.matchEligibleCents > 0 &&
  row.netRecipientDisbursedCents > 0 &&
  row.capturedGrossCents > 0 &&
  row.claimantConflictState === "no_conflict" &&
  row.sameParticipantLinkedPaymentOrControlDuplicate === false

const rawSuccessRewardClaimCentsForRow = (row) =>
  successRewardParticipantEligible(row)
    ? floorMulDivNonNegative(
        min(row.capturedGrossCents, row.conditionalTradeIntent.amountCents, row.conditionalTradeIntent.maxExposureCents),
        safeSuccessRewardRateBps,
        10_000
      )
    : 0
```

Do not mutate reward, credit, certificate, payout, or public-receipt rows during Stage 5B. Stage 5B writes only deterministic calculation outputs and hashes. Stage 6/Stage 7 side-effect code may later create `ContributorSuccessRewardClaim`, `CoordinationCreditLedgerEntry`, or `ImpactCertificateClaim` rows only from these hash-bound Stage 5B outputs after capture.

### Stage 6: Payment Authorization and Capture

Do not authorize at the start of the round.

Flow:

```text
save and provider-confirm payment method
round closes
compute preliminary clearance using only provider-confirmed payment commitments
review/challenge checks pass
if round.status !== "cleared": do not create new authorization/custody holds; emit only an explicitly non-binding review/replay result
if round.status === "cleared": create just-in-time manual-capture authorization or custody hold for the exact `actualClearedCents` required by each preliminarily cleared row
if any authorization or custody hold fails, authorizes less than the required amount, authorizes the wrong row, expires before `expectedCaptureBy`, or otherwise will not remain valid through expected capture:
  create an `AuthorizationReconciliationEvent`
  mark the affected row authorization_failed or removed_wrong_amount / removed_short_expiry as applicable
  set that row's gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible cents to 0
  rerun Stage 3 through Stage 5 deterministically using the remaining eligible rows
  repeat authorization/recalculation until every payable row has a live exact-amount authorization/custody hold that remains valid through expected capture, or no project clears
if round.status !== "payable": do not capture, release, pay, credit, reroute, or carry forward funds; emit only an explicitly non-binding review/replay result
if round.status === "payable": capture/release only after the post-authorization clearing fixed point passes all final gates
if round.status === "payable": execute fallback rules for failed or removed rows
publish audit bundle with authorization-reconciliation hash and clearing-iteration count; if round.status is "released" or "closed", publication may replay/report only already-recorded side-effect results
```

For card rails, use manual capture only where the authorization window is adequate. Store `authExpiresAt`, `authorizationAttemptedAt`, `authorizationFailureReason`, and `clearingIteration`. Do not allow a round state to remain payable if the authorization would expire before expected capture. Status gates are side-effect-sensitive: `cleared` permits new authorization attempts; `payable` permits capture/release/payment/fallback execution; `released` and `closed` permit only final audit/report replay and must not initiate new payment or routing side effects.

Authorization failures, wrong-amount authorizations, short-expiring authorizations, and failed custody holds never qualify for failure bonuses and never count toward final thresholds, counterparty volume, sponsor matching, public final reports, or payout plans. They may appear only in exception logs and privacy-safe aggregate failure metrics.

The authorization-reconciliation loop must be monotone and terminating: each failed iteration removes at least one previously payable row from gross/fee/net-recipient/actual/count/match-eligible inputs, and `clearingIteration` must not exceed the number of preliminarily payable rows plus one. If this invariant is violated, freeze the round and publish a reconciliation exception instead of capturing funds.

Every authorization-reconciliation event included in the audit bundle must be hash-bound and timing-valid:

```ts
const authorizationReconciliationEventTimingValid = (event) =>
  event != null &&
  isCanonicalUtcTimestamp(event.createdAt) &&
  (
    event.expectedCaptureBy == null ||
    isCanonicalUtcTimestamp(event.expectedCaptureBy)
  ) &&
  (
    event.authExpiresAt == null ||
    isCanonicalUtcTimestamp(event.authExpiresAt)
  ) &&
  (
    event.reconciliationState !== "authorized_exact" ||
    (
      isCanonicalUtcTimestamp(event.expectedCaptureBy) &&
      isCanonicalUtcTimestamp(event.authExpiresAt) &&
      timestampLte(event.expectedCaptureBy, event.authExpiresAt)
    )
  )

const validAuthorizationReconciliationStates = [
  "authorized_exact",
  "removed_authorization_failed",
  "removed_wrong_amount",
  "removed_short_expiry",
  "removed_expired",
] as const

const isNullOrNonEmptyString = (value: string | null | undefined) =>
  value == null || isNonEmptyString(value)

const authorizationReconciliationEventBindingHashValid = (event) =>
  event != null &&
  isCanonicalHash(event.eventHash) &&
  authorizationReconciliationEventTimingValid(event) &&
  isNonEmptyString(event.id) &&
  isNonEmptyString(event.roundId) &&
  isNonEmptyString(event.participantId) &&
  isNonEmptyString(event.projectId) &&
  isNonEmptyString(event.conditionalTradeIntentId) &&
  isNullOrNonEmptyString(event.custodyAuthorizationId) &&
  validAuthorizationReconciliationStates.includes(event.reconciliationState as any) &&
  isNonNegativeInteger(event.clearingIteration) &&
  isNonNegativeIntegerCents(event.requiredAmountCents) &&
  isNonNegativeIntegerCents(event.authorizedAmountCents) &&
  isNonNegativeIntegerCents(event.removedActualCents) &&
  isNonNegativeIntegerCents(event.removedCountedCents) &&
  isNonNegativeIntegerCents(event.removedMatchEligibleCents) &&
  isNonEmptyString(event.reasonCode) &&
  event.eventHash === sha256(canonicalJson({
    id: event.id,
    roundId: event.roundId,
    clearingIteration: event.clearingIteration,
    participantId: event.participantId,
    projectId: event.projectId,
    conditionalTradeIntentId: event.conditionalTradeIntentId,
    custodyAuthorizationId: event.custodyAuthorizationId,
    requiredAmountCents: event.requiredAmountCents,
    authorizedAmountCents: event.authorizedAmountCents,
    authExpiresAt: event.authExpiresAt,
    expectedCaptureBy: event.expectedCaptureBy,
    reconciliationState: event.reconciliationState,
    removedActualCents: event.removedActualCents,
    removedCountedCents: event.removedCountedCents,
    removedMatchEligibleCents: event.removedMatchEligibleCents,
    reasonCode: event.reasonCode,
    createdAt: event.createdAt,
  }))
```

A row may remain payable after authorization reconciliation only if its custody/authorization record has a non-empty trim-stable `id`, valid provider enum, a non-empty trim-stable `providerRef`, `custodyState === "authorized"`, exact `authorizedAmountCents === requiredAmountCents`, `capturedAmountCents === 0` before capture, non-negative safe-integer cent amounts, canonical `authorizationAttemptedAt`, `expectedCaptureBy`, and `authExpiresAt` timestamps, `expectedCaptureBy <= authExpiresAt`, and non-empty trim-stable `roundId`, `participantId`, and `projectId` fields matching the current payable row. Otherwise, remove the row and reclear before capture or release.

### Stage 7: Failure Handling

If a project fails:

```ts
const isNonEmptyString = (value: string | null | undefined) =>
  typeof value === "string" && value.trim().length > 0 && value === value.trim()

const isCanonicalHash = (value: string | null | undefined) =>
  typeof value === "string" &&
  (/^sha256:[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{64}$/.test(value))

const isCanonicalUtcTimestamp = (value: string | null | undefined) =>
  isNonEmptyString(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value

const timestampEquals = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  a === b

const timestampLte = (a: string | null | undefined, b: string | null | undefined) =>
  isCanonicalUtcTimestamp(a) &&
  isCanonicalUtcTimestamp(b) &&
  Date.parse(a) <= Date.parse(b)

const isNonNegativeIntegerCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0

const nonNegativeBigIntTerm = (value: unknown) =>
  (typeof value === "bigint" && value >= 0n) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)

const sumBigInt = (values: unknown) =>
  Array.isArray(values) && values.every(nonNegativeBigIntTerm)
    ? values.reduce(
        (total, value) =>
          total + (typeof value === "bigint" ? value : BigInt(value as number)),
        0n
      )
    : 0n
const stage7ValidFallbackRules = [
  "refund",
  "reroute",
  "carry_forward",
  "release_hold",
] as const

const stage7SideEffectStatusEligible =
  round.status === "payable"

const stage7ReplayOnlyStatusEligible =
  ["released", "closed"].includes(round.status as any)

const stage7FallbackProjectId =
  project?.id ?? null

const stage7FallbackProjectRowCount =
  isNonEmptyString(stage7FallbackProjectId)
    ? bundleDerivedProjectRowCountByRoundAndProjectId[
        round.id
      ]?.[stage7FallbackProjectId] ?? 0
    : 0

const stage7FallbackProjectRowEligible =
  project != null &&
  stage7FallbackProjectRowCount === 1 &&
  project.roundId === round.id &&
  isNonEmptyString(stage7FallbackProjectId) &&
  isNonEmptyString(project.bucketId)

const stage7FallbackCommonGroundBudgetId =
  commonGroundBudget?.id ?? null

const stage7FallbackCommonGroundBudgetParticipantId =
  commonGroundBudget?.participantId ?? null

const stage7FallbackCommonGroundBudgetRowCount =
  isNonEmptyString(stage7FallbackCommonGroundBudgetId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndBudgetId[
        round.id
      ]?.[stage7FallbackCommonGroundBudgetId] ?? 0
    : 0

const stage7FallbackCommonGroundBudgetParticipantRowCount =
  isNonEmptyString(stage7FallbackCommonGroundBudgetParticipantId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndParticipantId[
        round.id
      ]?.[stage7FallbackCommonGroundBudgetParticipantId] ?? 0
    : 0

const stage7FallbackCommonGroundBudgetRowEligible =
  commonGroundBudget != null &&
  stage7FallbackCommonGroundBudgetRowCount === 1 &&
  stage7FallbackCommonGroundBudgetParticipantRowCount === 1 &&
  commonGroundBudget.roundId === round.id &&
  isNonEmptyString(stage7FallbackCommonGroundBudgetId) &&
  isNonEmptyString(stage7FallbackCommonGroundBudgetParticipantId) &&
  commonGroundBudget.state === "active" &&
  commonGroundBudget.canceledAt == null &&
  commonGroundBudget.rulebookHashAtConsent === round.rulebookHash &&
  stage7ValidFallbackRules.includes(commonGroundBudget.fallbackRule as any)

const stage7FallbackConditionalIntentRowCount =
  stage7FallbackCommonGroundBudgetRowEligible &&
  stage7FallbackProjectRowEligible &&
  isNonEmptyString(stage7FallbackCommonGroundBudgetId) &&
  isNonEmptyString(stage7FallbackProjectId)
    ? bundleDerivedClearingEligibleConditionalIntentRowCountByRoundBudgetAndProjectId[
        round.id
      ]?.[stage7FallbackCommonGroundBudgetId]?.[stage7FallbackProjectId] ?? 0
    : 0

const stage7FallbackConditionalIntentRowEligible =
  conditionalTradeIntent != null &&
  stage7FallbackConditionalIntentRowCount === 1 &&
  isNonEmptyString(conditionalTradeIntent.id) &&
  conditionalTradeIntent.roundId === round.id &&
  conditionalTradeIntent.projectId === stage7FallbackProjectId &&
  conditionalTradeIntent.commonGroundBudgetId === stage7FallbackCommonGroundBudgetId &&
  conditionalTradeIntent.participantId === stage7FallbackCommonGroundBudgetParticipantId &&
  conditionalTradeIntent.state === "active" &&
  conditionalTradeIntent.rulebookHashAtConsent === round.rulebookHash &&
  stage7ValidFallbackRules.includes(conditionalTradeIntent.fallbackRule as any)

const stage7FallbackRuleConsistencyEligible =
  stage7FallbackCommonGroundBudgetRowEligible &&
  stage7FallbackConditionalIntentRowEligible &&
  commonGroundBudget?.fallbackRule === conditionalTradeIntent?.fallbackRule

const stage7FallbackInputRowsAndConsentEligible =
  stage7FallbackProjectRowEligible &&
  stage7FallbackCommonGroundBudgetRowEligible &&
  stage7FallbackConditionalIntentRowEligible &&
  stage7FallbackRuleConsistencyEligible

const stage7ExecutableFallbackRule =
  stage7FallbackInputRowsAndConsentEligible
    ? conditionalTradeIntent.fallbackRule
    : null

const stage7FallbackRequiresFreshConsent =
  !stage7FallbackInputRowsAndConsentEligible

const stage7UserConsentedFallbackExecutionEligible =
  stage7SideEffectStatusEligible &&
  stage7FallbackInputRowsAndConsentEligible &&
  stage7ExecutableFallbackRule != null

const stage7FailureHandlingNonSideEffectOutput =
  !stage7SideEffectStatusEligible
    ? {
        roundId: round.id,
        status: round.status,
        replayOnly: stage7ReplayOnlyStatusEligible,
        sideEffectsAllowed: false,
        outputMode: stage7ReplayOnlyStatusEligible
          ? "replay_report_audit_only"
          : "non_binding_review_only",
      }
    : null

if (!stage7SideEffectStatusEligible) {
  // Non-payable Stage 7 produces only explicit non-side-effect output.
  // Do not call an ambient replay helper and do not mutate fallback, authorization,
  // failure-bonus, payout, credit, or proration rows.
}

if (stage7SideEffectStatusEligible && stage7FallbackRequiresFreshConsent) {
  cancelAuthorization()
  markPendingFreshConsent()
  // Do not fall through to the release_hold branch: missing, malformed,
  // wrong-row, or fallback-rule-inconsistent inputs are not a user-selected fallback rule.
}

if (stage7UserConsentedFallbackExecutionEligible && stage7ExecutableFallbackRule === "refund") {
  cancelAuthorization()
}

if (stage7UserConsentedFallbackExecutionEligible && stage7ExecutableFallbackRule === "reroute") {
  rerouteOnlyIfTargetWasPreconsentedUnderSameRulebookAndExposureCap()
  // Otherwise cancel authorization and require fresh consent before any new routing.
}

if (stage7UserConsentedFallbackExecutionEligible && stage7ExecutableFallbackRule === "carry_forward") {
  carryForwardOnlyIfNextRoundUsesCompatibleRulebookRecipientBucketAndExposureTerms()
  // Otherwise mark as pending re-consent and do not authorize or capture.
}

if (stage7UserConsentedFallbackExecutionEligible && stage7ExecutableFallbackRule === "release_hold") {
  cancelAuthorization()
  markClosed()
}

const stage7FailureBonusProjectId =
  stage7FallbackProjectId

const stage7FailureBonusProjectRowEligible =
  stage7FallbackProjectRowEligible

const stage7ProjectRoundEligibilitySnapshotRowCount =
  stage7FailureBonusProjectRowEligible &&
  isNonEmptyString(stage7FailureBonusProjectId)
    ? bundleDerivedProjectRoundEligibilitySnapshotRowCountByRoundAndProjectId[
        round.id
      ]?.[stage7FailureBonusProjectId] ?? 0
    : 0

const stage7ProjectRoundEligibilitySnapshotUnique =
  stage7ProjectRoundEligibilitySnapshotRowCount === 1

const roundOpenEligibilitySnapshot =
  stage7ProjectRoundEligibilitySnapshotUnique &&
  stage7FailureBonusProjectRowEligible &&
  isNonEmptyString(stage7FailureBonusProjectId)
    ? projectRoundEligibilitySnapshotByRoundAndProjectId[
        round.id
      ]?.[stage7FailureBonusProjectId]
    : null

const isExactBoolean = (value: unknown) =>
  value === true || value === false

const projectRoundEligibilitySnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  snapshot.snapshotKind === "round_open" &&
  isCanonicalUtcTimestamp(snapshot.sourceCutoffAt) &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.projectId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isExactBoolean(snapshot.wasReviewApprovedAtRoundOpen) &&
  isExactBoolean(snapshot.wasChallengeNonBlockingAtRoundOpen) &&
  isExactBoolean(snapshot.wasDestinationVerifiedAtRoundOpen) &&
  isExactBoolean(snapshot.wasProjectIdentityAndRouteValidAtRoundOpen) &&
  isExactBoolean(snapshot.wasBaselineAndActionEvidenceValidAtRoundOpen) &&
  isExactBoolean(snapshot.wasAntiThreatClearAtRoundOpen) &&
  isExactBoolean(snapshot.wasExternalityClearAtRoundOpen) &&
  isExactBoolean(snapshot.wasConflictNonBlockingAtRoundOpen) &&
  isExactBoolean(snapshot.wasSponsorBackedAtRoundOpen) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    snapshotKind: snapshot.snapshotKind,
    sourceCutoffAt: snapshot.sourceCutoffAt,
    roundId: snapshot.roundId,
    projectId: snapshot.projectId,
    rulebookHash: snapshot.rulebookHash,
    wasReviewApprovedAtRoundOpen: snapshot.wasReviewApprovedAtRoundOpen,
    wasChallengeNonBlockingAtRoundOpen: snapshot.wasChallengeNonBlockingAtRoundOpen,
    wasDestinationVerifiedAtRoundOpen: snapshot.wasDestinationVerifiedAtRoundOpen,
    wasProjectIdentityAndRouteValidAtRoundOpen: snapshot.wasProjectIdentityAndRouteValidAtRoundOpen,
    wasBaselineAndActionEvidenceValidAtRoundOpen: snapshot.wasBaselineAndActionEvidenceValidAtRoundOpen,
    wasAntiThreatClearAtRoundOpen: snapshot.wasAntiThreatClearAtRoundOpen,
    wasExternalityClearAtRoundOpen: snapshot.wasExternalityClearAtRoundOpen,
    wasConflictNonBlockingAtRoundOpen: snapshot.wasConflictNonBlockingAtRoundOpen,
    wasSponsorBackedAtRoundOpen: snapshot.wasSponsorBackedAtRoundOpen,
    createdAt: snapshot.createdAt,
  }))

const failureBonusProjectEligible =
  stage7FailureBonusProjectRowEligible &&
  stage7ProjectRoundEligibilitySnapshotUnique &&
  projectFailed &&
  [
    "threshold_amount_shortfall",
    "verified_supporter_shortfall",
    "active_cluster_shortfall",
    "counterparty_volume_shortfall",
  ].includes(projectFailureReason) &&
  roundOpenEligibilitySnapshot != null &&
  roundOpenEligibilitySnapshot.snapshotKind === "round_open" &&
  roundOpenEligibilitySnapshot.roundId === round.id &&
  roundOpenEligibilitySnapshot.projectId === stage7FailureBonusProjectId &&
  timestampEquals(roundOpenEligibilitySnapshot.sourceCutoffAt, round.opensAt) &&
  timestampLte(roundOpenEligibilitySnapshot.createdAt, round.opensAt) &&
  projectRoundEligibilitySnapshotBindingHashValid(roundOpenEligibilitySnapshot) &&
  roundOpenEligibilitySnapshot.rulebookHash === round.rulebookHash &&
  roundOpenEligibilitySnapshot.wasReviewApprovedAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasChallengeNonBlockingAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasDestinationVerifiedAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasProjectIdentityAndRouteValidAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasBaselineAndActionEvidenceValidAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasAntiThreatClearAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasExternalityClearAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasConflictNonBlockingAtRoundOpen === true &&
  roundOpenEligibilitySnapshot.wasSponsorBackedAtRoundOpen === true

const stage7CommonGroundBudgetId =
  commonGroundBudget?.id ?? null

const stage7CommonGroundBudgetParticipantId =
  commonGroundBudget?.participantId ?? null

const stage7CommonGroundBudgetRowCount =
  isNonEmptyString(stage7CommonGroundBudgetId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndBudgetId[
        round.id
      ]?.[stage7CommonGroundBudgetId] ?? 0
    : 0

const stage7CommonGroundBudgetParticipantRowCount =
  isNonEmptyString(stage7CommonGroundBudgetParticipantId)
    ? bundleDerivedCommonGroundBudgetRowCountByRoundAndParticipantId[
        round.id
      ]?.[stage7CommonGroundBudgetParticipantId] ?? 0
    : 0

const stage7CommonGroundBudgetRowUnique =
  stage7CommonGroundBudgetRowCount === 1 &&
  stage7CommonGroundBudgetParticipantRowCount === 1

const stage7EarlyPaymentCommitmentSnapshotRowCount =
  stage7CommonGroundBudgetRowUnique &&
  isNonEmptyString(stage7CommonGroundBudgetId)
    ? bundleDerivedPaymentCommitmentSnapshotRowCountByRoundBudgetAndKind[
        round.id
      ]?.[stage7CommonGroundBudgetId]?.early_failure_bonus_cutoff ?? 0
    : 0

const stage7EarlyPaymentCommitmentSnapshotUnique =
  stage7EarlyPaymentCommitmentSnapshotRowCount === 1

const earlyPaymentCommitmentSnapshot =
  stage7EarlyPaymentCommitmentSnapshotUnique &&
  stage7CommonGroundBudgetRowUnique &&
  isNonEmptyString(stage7CommonGroundBudgetId)
    ? paymentCommitmentSnapshotByRoundBudgetAndKind[
        round.id
      ]?.[stage7CommonGroundBudgetId]?.early_failure_bonus_cutoff
    : null

const stage7FailureBonusBundleEligible =
  failureBonusBundleEligible

const stage7SafeFailedQualifiedMatchEligibleCents =
  Number.isSafeInteger(failedQualifiedMatchEligibleCents) &&
  failedQualifiedMatchEligibleCents > 0
    ? failedQualifiedMatchEligibleCents
    : 0

const stage7ValidFailureBonusClaimantConflictStates = [
  "no_conflict",
  "project_proposer",
  "recipient_affiliate",
  "fiscal_host_affiliate",
  "sponsor_affiliate",
  "reviewer_affiliate",
  "same_control_affiliate",
  "unknown",
] as const

const stage7FailureBonusClaimantConflictSnapshotBindingHashValid = (snapshot) =>
  snapshot != null &&
  isNonEmptyString(snapshot.id) &&
  snapshot.snapshotKind === "failure_bonus_claimant_conflict" &&
  isNonEmptyString(snapshot.roundId) &&
  isNonEmptyString(snapshot.projectId) &&
  isNonEmptyString(snapshot.participantId) &&
  isNonEmptyString(snapshot.commonGroundBudgetId) &&
  isNonEmptyString(snapshot.conditionalTradeIntentId) &&
  isCanonicalHash(snapshot.rulebookHash) &&
  isNonEmptyString(snapshot.failureBonusPolicyVersion) &&
  isCanonicalUtcTimestamp(snapshot.sourceCutoffAt) &&
  stage7ValidFailureBonusClaimantConflictStates.includes(snapshot.conflictState as any) &&
  isCanonicalUtcTimestamp(snapshot.createdAt) &&
  isCanonicalHash(snapshot.snapshotHash) &&
  snapshot.snapshotHash === sha256(canonicalJson({
    id: snapshot.id,
    snapshotKind: snapshot.snapshotKind,
    roundId: snapshot.roundId,
    projectId: snapshot.projectId,
    participantId: snapshot.participantId,
    commonGroundBudgetId: snapshot.commonGroundBudgetId,
    conditionalTradeIntentId: snapshot.conditionalTradeIntentId,
    rulebookHash: snapshot.rulebookHash,
    failureBonusPolicyVersion: snapshot.failureBonusPolicyVersion,
    sourceCutoffAt: snapshot.sourceCutoffAt,
    conflictState: snapshot.conflictState,
    createdAt: snapshot.createdAt,
  }))

const stage7FailureBonusClaimantConflictEligible =
  stage7FailureBonusClaimantConflictSnapshotBindingHashValid(failureBonusClaimantConflictSnapshot) &&
  failureBonusClaimantConflictSnapshot.roundId === round.id &&
  failureBonusClaimantConflictSnapshot.projectId === stage7FailureBonusProjectId &&
  failureBonusClaimantConflictSnapshot.participantId === stage7CommonGroundBudgetParticipantId &&
  failureBonusClaimantConflictSnapshot.commonGroundBudgetId === stage7CommonGroundBudgetId &&
  failureBonusClaimantConflictSnapshot.conditionalTradeIntentId === conditionalTradeIntent?.id &&
  failureBonusClaimantConflictSnapshot.rulebookHash === round.rulebookHash &&
  failureBonusClaimantConflictSnapshot.failureBonusPolicyVersion === round.failureBonusPolicyVersion &&
  timestampEquals(failureBonusClaimantConflictSnapshot.sourceCutoffAt, round.closesAt) &&
  failureBonusClaimantConflictSnapshot.conflictState === "no_conflict"

const failureBonusClaimEligibilityInputsHash =
  stage7FailureBonusBundleEligible &&
  stage7ProjectRoundEligibilitySnapshotUnique &&
  stage7EarlyPaymentCommitmentSnapshotUnique &&
  roundOpenEligibilitySnapshot != null &&
  earlyPaymentCommitmentSnapshot != null &&
  commonGroundBudget != null &&
  conditionalTradeIntent != null &&
  isNonEmptyString(stage7FailureBonusProjectId) &&
  isNonEmptyString(stage7CommonGroundBudgetId) &&
  isNonEmptyString(stage7CommonGroundBudgetParticipantId) &&
  isNonEmptyString(conditionalTradeIntent.id) &&
  stage7FailureBonusClaimantConflictEligible &&
  isNonEmptyString(round.failureBonusPolicyVersion) &&
  isCanonicalUtcTimestamp(round.earlyFailureBonusCutoff)
    ? sha256(canonicalJson({
        roundId: round.id,
        projectId: stage7FailureBonusProjectId,
        participantId: stage7CommonGroundBudgetParticipantId,
        commonGroundBudgetId: stage7CommonGroundBudgetId,
        failureBonusPolicyVersion: round.failureBonusPolicyVersion,
        conditionalTradeIntentId: conditionalTradeIntent.id,
        claimantProjectConflictSnapshotId: failureBonusClaimantConflictSnapshot.id,
        claimantProjectConflictState: failureBonusClaimantConflictSnapshot.conflictState,
        claimantProjectConflictHash: failureBonusClaimantConflictSnapshot.snapshotHash,
        claimantProjectConflictSourceCutoffAt: failureBonusClaimantConflictSnapshot.sourceCutoffAt,
        clearingInputBundleHash: roundClearingInputBundle.bundleHash,
        projectRoundEligibilitySnapshotId: roundOpenEligibilitySnapshot.id,
        projectRoundEligibilitySnapshotHash: roundOpenEligibilitySnapshot.snapshotHash,
        paymentCommitmentSnapshotId: earlyPaymentCommitmentSnapshot.id,
        paymentCommitmentSnapshotHash: earlyPaymentCommitmentSnapshot.snapshotHash,
        earlyFailureBonusCutoff: round.earlyFailureBonusCutoff,
        projectFailed,
        projectFailureReason,
        failedQualifiedMatchEligibleCents: stage7SafeFailedQualifiedMatchEligibleCents,
      }))
    : null

const stage7ConditionalTradeIntentIdForClaim =
  conditionalTradeIntent?.id ?? null

const stage7FailureBonusClaimUniquenessKeyEligible =
  isNonEmptyString(stage7FailureBonusProjectId) &&
  isNonEmptyString(stage7CommonGroundBudgetParticipantId) &&
  isNonEmptyString(stage7CommonGroundBudgetId) &&
  isNonEmptyString(stage7ConditionalTradeIntentIdForClaim)

const stage7ExistingFailureBonusClaim =
  stage7FailureBonusClaimUniquenessKeyEligible
    ? (
        failureBonusClaimByRoundProjectParticipantIntent?.[round.id]?.[
          stage7FailureBonusProjectId
        ]?.[stage7CommonGroundBudgetParticipantId]?.[
          stage7ConditionalTradeIntentIdForClaim
        ] ?? null
      )
    : null

const stage7ExistingFailureBonusClaimMatchesCurrentContext =
  stage7ExistingFailureBonusClaim != null &&
  stage7FailureBonusClaimantConflictEligible &&
  isNonEmptyString(stage7ExistingFailureBonusClaim.id) &&
  stage7ExistingFailureBonusClaim.roundId === round.id &&
  stage7ExistingFailureBonusClaim.projectId === stage7FailureBonusProjectId &&
  stage7ExistingFailureBonusClaim.participantId === stage7CommonGroundBudgetParticipantId &&
  stage7ExistingFailureBonusClaim.commonGroundBudgetId === stage7CommonGroundBudgetId &&
  stage7ExistingFailureBonusClaim.conditionalTradeIntentId === stage7ConditionalTradeIntentIdForClaim &&
  stage7ExistingFailureBonusClaim.claimantProjectConflictSnapshotId === failureBonusClaimantConflictSnapshot.id &&
  stage7ExistingFailureBonusClaim.claimantProjectConflictState === "no_conflict" &&
  stage7ExistingFailureBonusClaim.claimantProjectConflictHash === failureBonusClaimantConflictSnapshot.snapshotHash &&
  timestampEquals(stage7ExistingFailureBonusClaim.claimantProjectConflictSourceCutoffAt, failureBonusClaimantConflictSnapshot.sourceCutoffAt) &&
  stage7ExistingFailureBonusClaim.failureBonusPolicyVersion ===
    round.failureBonusPolicyVersion &&
  stage7ExistingFailureBonusClaim.eligibilityInputsHash ===
    failureBonusClaimEligibilityInputsHash

const stage7FailureBonusClaimCreateNewEligible =
  stage7FailureBonusClaimUniquenessKeyEligible &&
  stage7ExistingFailureBonusClaim == null

const stage7FailureBonusClaimCreationEligible =
  stage7SideEffectStatusEligible &&
  stage7FailureBonusBundleEligible &&
  stage7FailureBonusClaimCreateNewEligible &&
  isCanonicalHash(failureBonusClaimEligibilityInputsHash) &&
  stage7ProjectRoundEligibilitySnapshotUnique &&
  stage7EarlyPaymentCommitmentSnapshotUnique &&
  earlyPaymentCommitmentSnapshot != null &&
  isNonEmptyString(stage7FailureBonusProjectId) &&
  isNonEmptyString(stage7CommonGroundBudgetId) &&
  isNonEmptyString(stage7CommonGroundBudgetParticipantId) &&
  isCanonicalUtcTimestamp(round.earlyFailureBonusCutoff) &&
  failureBonusProjectEligible &&
  stage7FailureBonusClaimantConflictEligible &&
  evaluateSection10FailureBonusQualified({
    round,
    roundClearingInputBundle,
    project,
    commonGroundBudget,
    conditionalTradeIntent,
    identityEligibility,
    roundOpenEligibilitySnapshot,
    earlyPaymentCommitmentSnapshot,
    failureBonusClaimantConflictSnapshot,
    failedQualifiedMatchEligibleCents: stage7SafeFailedQualifiedMatchEligibleCents,
    projectFailed,
    projectFailureReason,
  }) === true

if (stage7FailureBonusClaimCreationEligible) {
  createFailureBonusClaimIfQualified({
    roundId: round.id,
    projectId: stage7FailureBonusProjectId,
    participantId: stage7CommonGroundBudgetParticipantId,
    commonGroundBudgetId: stage7CommonGroundBudgetId,
    failureBonusPolicyVersion: round.failureBonusPolicyVersion,
    conditionalTradeIntentId: conditionalTradeIntent.id,
    claimantProjectConflictSnapshotId: failureBonusClaimantConflictSnapshot.id,
    claimantProjectConflictState: failureBonusClaimantConflictSnapshot.conflictState,
    claimantProjectConflictHash: failureBonusClaimantConflictSnapshot.snapshotHash,
    claimantProjectConflictSourceCutoffAt: failureBonusClaimantConflictSnapshot.sourceCutoffAt,
    failureReason: projectFailureReason,
    projectRoundEligibilitySnapshotId: roundOpenEligibilitySnapshot.id,
    projectRoundEligibilitySnapshotHash: roundOpenEligibilitySnapshot.snapshotHash,
    clearingInputBundleId: roundClearingInputBundle.id,
    clearingInputBundleHash: roundClearingInputBundle.bundleHash,
    paymentCommitmentSnapshotId: earlyPaymentCommitmentSnapshot.id,
    paymentCommitmentSnapshotHash: earlyPaymentCommitmentSnapshot.snapshotHash,
    paymentMethodSavedAt: earlyPaymentCommitmentSnapshot.paymentMethodSavedAt,
    paymentMethodCommitmentState: earlyPaymentCommitmentSnapshot.paymentMethodCommitmentState,
    paymentMethodConfirmedAt: earlyPaymentCommitmentSnapshot.paymentMethodConfirmedAt,
    earlyFailureBonusCutoff: round.earlyFailureBonusCutoff,
    failedQualifiedMatchEligibleCents: stage7SafeFailedQualifiedMatchEligibleCents,
    eligibilityInputsHash: failureBonusClaimEligibilityInputsHash,
    claimState: "approved",
    denialReason: null,
    payoutRef: null,
    resolvedAt: null,
    rawBonusCents: 0,
    participantRoundCapCents: 0,
    participantCappedProvisionalBonusCents: 0,
    prorationFactorBps: 10_000,
    bonusCents: 0,
    // The helper must set createdAt to a canonical UTC write timestamp before insert.
  })
}

if (stage7ExistingFailureBonusClaimMatchesCurrentContext) {
  // Idempotent retry/replay path: do not create or overwrite the existing claim.
  // Later payable payout/proration paths may use the existing claim only if the
  // unsettled approved-claim predicates pass.
}

if (
  stage7ExistingFailureBonusClaim != null &&
  !stage7ExistingFailureBonusClaimMatchesCurrentContext
) {
  // Existing row with the same unique key but mismatched policy, context, or
  // eligibility hash: fail closed for manual review; do not overwrite or create
  // a second FailureBonusClaim.
}

const safeRoundSponsorBudgetCents = (value: number | null | undefined) =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0


const bigIntToSafeCentsOrZero = (value: bigint) =>
  value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(value)
    : 0

const floorMulDivNonNegative = (a: number, b: number, denominator: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(denominator) && denominator > 0
    ? bigIntToSafeCentsOrZero((BigInt(a) * BigInt(b)) / BigInt(denominator))
    : 0

const safeProductLte = (a: number, b: number, limit: number) =>
  Number.isSafeInteger(a) && a >= 0 &&
  Number.isSafeInteger(b) && b >= 0 &&
  Number.isSafeInteger(limit) && limit >= 0 &&
  BigInt(a) * BigInt(b) <= BigInt(limit)

const roundBaseMatchBudgetCents =
  safeRoundSponsorBudgetCents(round.baseMatchBudgetCents)

const roundBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.bonusBudgetCents)

const roundFailureBonusBudgetCents =
  safeRoundSponsorBudgetCents(round.failureBonusBudgetCents)

const totalSponsorBudgetCentsInt =
  BigInt(roundBaseMatchBudgetCents) +
  BigInt(roundBonusBudgetCents) +
  BigInt(roundFailureBonusBudgetCents)

const failureBonusBudgetCapValid =
  roundFailureBonusBudgetCents > 0 &&
  totalSponsorBudgetCentsInt > 0n &&
  BigInt(roundFailureBonusBudgetCents) * 20n <= totalSponsorBudgetCentsInt

const finalFailureBonusBackingCents =
  failureBonusBundleEligible
    ? sponsorBackedCentsForFinalClearing("failure_bonus")
    : 0

const failureBonusPoolAvailableCents =
  failureBonusBundleEligible &&
  failureBonusBudgetCapValid &&
  finalFailureBonusBackingCents >= roundFailureBonusBudgetCents
    ? roundFailureBonusBudgetCents
    : 0

const stage7FailureBonusPayoutInputsEligible =
  stage7FailureBonusBundleEligible &&
  failureBonusBudgetCapValid &&
  finalFailureBonusBackingCents >= roundFailureBonusBudgetCents &&
  failureBonusPoolAvailableCents > 0

const stage7FailureBonusPayoutClaimStateEligible = (claim) =>
  claim?.claimState === "approved" &&
  claim?.payoutRef == null &&
  claim?.resolvedAt == null

const stage7FailureBonusClaimThresholdFailureReasonEligible = (reason) =>
  [
    "threshold_amount_shortfall",
    "verified_supporter_shortfall",
    "active_cluster_shortfall",
    "counterparty_volume_shortfall",
  ].includes(reason as any)

const stage7FailureBonusClaimEligibilityInputsHashValid = (claim) =>
  claim != null &&
  roundClearingInputBundle != null &&
  isCanonicalHash(claim.eligibilityInputsHash) &&
  claim.eligibilityInputsHash === sha256(canonicalJson({
    roundId: claim.roundId,
    projectId: claim.projectId,
    participantId: claim.participantId,
    commonGroundBudgetId: claim.commonGroundBudgetId,
    failureBonusPolicyVersion: claim.failureBonusPolicyVersion,
    conditionalTradeIntentId: claim.conditionalTradeIntentId,
    claimantProjectConflictSnapshotId: claim.claimantProjectConflictSnapshotId,
    claimantProjectConflictState: claim.claimantProjectConflictState,
    claimantProjectConflictHash: claim.claimantProjectConflictHash,
    claimantProjectConflictSourceCutoffAt: claim.claimantProjectConflictSourceCutoffAt,
    clearingInputBundleHash: claim.clearingInputBundleHash,
    projectRoundEligibilitySnapshotId: claim.projectRoundEligibilitySnapshotId,
    projectRoundEligibilitySnapshotHash: claim.projectRoundEligibilitySnapshotHash,
    paymentCommitmentSnapshotId: claim.paymentCommitmentSnapshotId,
    paymentCommitmentSnapshotHash: claim.paymentCommitmentSnapshotHash,
    earlyFailureBonusCutoff: claim.earlyFailureBonusCutoff,
    projectFailed: true,
    projectFailureReason: claim.failureReason,
    failedQualifiedMatchEligibleCents: claim.failedQualifiedMatchEligibleCents,
  }))

const stage7FailureBonusClaimAuditContextEligible = (claim) =>
  claim != null &&
  isNonEmptyString(claim.id) &&
  claim.roundId === round.id &&
  isNonEmptyString(claim.projectId) &&
  isNonEmptyString(claim.participantId) &&
  isNonEmptyString(claim.commonGroundBudgetId) &&
  isNonEmptyString(claim.conditionalTradeIntentId) &&
  isNonEmptyString(claim.claimantProjectConflictSnapshotId) &&
  claim.claimantProjectConflictState === "no_conflict" &&
  isCanonicalHash(claim.claimantProjectConflictHash) &&
  isCanonicalUtcTimestamp(claim.claimantProjectConflictSourceCutoffAt) &&
  timestampEquals(claim.claimantProjectConflictSourceCutoffAt, round.closesAt) &&
  isCanonicalUtcTimestamp(claim.createdAt) &&
  claim.failureBonusPolicyVersion === round.failureBonusPolicyVersion &&
  stage7FailureBonusClaimThresholdFailureReasonEligible(claim.failureReason) &&
  isPositiveIntegerCents(claim.failedQualifiedMatchEligibleCents) &&
  isNonEmptyString(claim.projectRoundEligibilitySnapshotId) &&
  isCanonicalHash(claim.projectRoundEligibilitySnapshotHash) &&
  roundClearingInputBundle != null &&
  isNonEmptyString(claim.clearingInputBundleId) &&
  claim.clearingInputBundleId === roundClearingInputBundle.id &&
  claim.clearingInputBundleHash === roundClearingInputBundle.bundleHash &&
  isNonEmptyString(claim.paymentCommitmentSnapshotId) &&
  isCanonicalHash(claim.paymentCommitmentSnapshotHash) &&
  claim.paymentMethodCommitmentState === "provider_confirmed" &&
  isCanonicalUtcTimestamp(claim.paymentMethodSavedAt) &&
  isCanonicalUtcTimestamp(claim.paymentMethodConfirmedAt) &&
  timestampLte(claim.paymentMethodSavedAt, claim.paymentMethodConfirmedAt) &&
  timestampLte(claim.paymentMethodSavedAt, claim.earlyFailureBonusCutoff) &&
  timestampLte(claim.paymentMethodConfirmedAt, claim.earlyFailureBonusCutoff) &&
  timestampEquals(claim.earlyFailureBonusCutoff, round.earlyFailureBonusCutoff) &&
  stage7FailureBonusClaimEligibilityInputsHashValid(claim) &&
  claim.denialReason == null

const stage7QualifiedFailureBonusClaimIdsRawValid =
  Array.isArray(qualifiedFailureBonusClaimIds) &&
  qualifiedFailureBonusClaimIds.every(isNonEmptyString) &&
  new Set(qualifiedFailureBonusClaimIds).size === qualifiedFailureBonusClaimIds.length

const stage7QualifiedFailureBonusClaimIdsAllCurrentRoundValid =
  stage7QualifiedFailureBonusClaimIdsRawValid &&
  qualifiedFailureBonusClaimIds.every(claimId =>
    failureBonusClaim[claimId] != null &&
    failureBonusClaim[claimId].id === claimId &&
    stage7FailureBonusClaimAuditContextEligible(failureBonusClaim[claimId]) &&
    stage7FailureBonusPayoutClaimStateEligible(failureBonusClaim[claimId])
  )

const stage7FailureBonusPayoutSideEffectEligible =
  stage7SideEffectStatusEligible &&
  stage7FailureBonusPayoutInputsEligible

const stage7QualifiedFailureBonusClaimIds =
  stage7FailureBonusPayoutSideEffectEligible &&
  stage7QualifiedFailureBonusClaimIdsAllCurrentRoundValid
    ? [...qualifiedFailureBonusClaimIds].sort()
    : []

if (!stage7FailureBonusPayoutSideEffectEligible) {
  // Do not write finalFailureBonusCents or FailureBonusClaim.prorationFactorBps.
  // Released/closed Stage 7 replay may only read/report/audit stored failure-bonus rows.
}

const stage7ParticipantCappedProvisionalFailureBonusCentsForClaim = (claimId: string) => {
  const claim = failureBonusClaim[claimId]
  const externalValue = participantCappedProvisionalFailureBonusCents[claimId]
  const externalAbsentOrMatches =
    externalValue == null ||
    externalValue === claim?.participantCappedProvisionalBonusCents

  return stage7FailureBonusClaimAuditContextEligible(claim) &&
    stage7FailureBonusPayoutClaimStateEligible(claim) &&
    isNonNegativeIntegerCents(claim?.participantCappedProvisionalBonusCents) &&
    externalAbsentOrMatches
      ? claim.participantCappedProvisionalBonusCents
      : 0
}

const stage7TotalProvisionalFailureBonusCentsInt =
  sumBigInt(
    stage7QualifiedFailureBonusClaimIds.map(
      stage7ParticipantCappedProvisionalFailureBonusCentsForClaim
    )
  )

const stage7FailureBonusTargetPayoutCents =
  bigIntToSafeCentsOrZero(
    stage7TotalProvisionalFailureBonusCentsInt > BigInt(failureBonusPoolAvailableCents)
      ? BigInt(failureBonusPoolAvailableCents)
      : stage7TotalProvisionalFailureBonusCentsInt
  )

const stage7FailureBonusProrationFactorBps =
  stage7TotalProvisionalFailureBonusCentsInt > BigInt(failureBonusPoolAvailableCents)
    ? bigIntToSafeCentsOrZero(
        (BigInt(failureBonusPoolAvailableCents) * 10_000n) /
        stage7TotalProvisionalFailureBonusCentsInt
      )
    : 10_000

const stage7BaseFinalFailureBonusCentsByClaimId =
  Object.fromEntries(
    stage7QualifiedFailureBonusClaimIds.map(claimId => [
      claimId,
      stage7TotalProvisionalFailureBonusCentsInt <= 0n
        ? 0
        : bigIntToSafeCentsOrZero(
            (
              BigInt(stage7ParticipantCappedProvisionalFailureBonusCentsForClaim(claimId)) *
              BigInt(stage7FailureBonusTargetPayoutCents)
            ) / stage7TotalProvisionalFailureBonusCentsInt
          ),
    ])
  )

const stage7BaseFinalFailureBonusSumCents =
  bigIntToSafeCentsOrZero(sumBigInt(Object.values(stage7BaseFinalFailureBonusCentsByClaimId)))

const stage7FailureBonusRemainderCents =
  stage7FailureBonusTargetPayoutCents >= stage7BaseFinalFailureBonusSumCents
    ? stage7FailureBonusTargetPayoutCents - stage7BaseFinalFailureBonusSumCents
    : 0

const stage7RoundFailureBonusProrationOrderKeyByClaimId =
  Object.fromEntries(
    stage7QualifiedFailureBonusClaimIds.map(claimId => [
      claimId,
      sha256(canonicalJson({
        roundId: round.id,
        claimId,
        prorationScope: "round_failure_bonus_pool",
        failureBonusPolicyVersion: round.failureBonusPolicyVersion,
      })),
    ])
  )

const stage7FailureBonusRemainderClaimIdSet =
  new Set(
    [...stage7QualifiedFailureBonusClaimIds]
      .filter(claimId =>
        stage7BaseFinalFailureBonusCentsByClaimId[claimId] <
        stage7ParticipantCappedProvisionalFailureBonusCentsForClaim(claimId)
      )
      .sort((a, b) =>
        stage7RoundFailureBonusProrationOrderKeyByClaimId[a]
          .localeCompare(stage7RoundFailureBonusProrationOrderKeyByClaimId[b])
      )
      .slice(0, stage7FailureBonusRemainderCents)
  )

stage7QualifiedFailureBonusClaimIds.forEach(claimId => {
  const baseCents = stage7BaseFinalFailureBonusCentsByClaimId[claimId]
  const withRemainderCents =
    stage7FailureBonusRemainderClaimIdSet.has(claimId) &&
    baseCents < Number.MAX_SAFE_INTEGER
      ? baseCents + 1
      : baseCents
  const claimCapCents =
    stage7ParticipantCappedProvisionalFailureBonusCentsForClaim(claimId)

  finalFailureBonusCents[claimId] =
    isNonNegativeIntegerCents(withRemainderCents) && withRemainderCents <= claimCapCents
      ? withRemainderCents
      : 0
  failureBonusClaim[claimId].bonusCents = finalFailureBonusCents[claimId]
  failureBonusClaim[claimId].prorationFactorBps = stage7FailureBonusProrationFactorBps
})

const stage7MarkFailureBonusClaimSettled = (
  claimId: string,
  settlement: {
    settlementType: "cash_payout" | "platform_credit"
    payoutRef: string
    settledAt: string
  }
) => {
  const claim = failureBonusClaim[claimId]

  if (
    stage7FailureBonusPayoutSideEffectEligible &&
    stage7QualifiedFailureBonusClaimIds.includes(claimId) &&
    claim?.claimState === "approved" &&
    claim?.payoutRef == null &&
    claim?.resolvedAt == null &&
    isNonNegativeIntegerCents(finalFailureBonusCents[claimId]) &&
    finalFailureBonusCents[claimId] > 0 &&
    ["cash_payout", "platform_credit"].includes(settlement?.settlementType as any) &&
    isNonEmptyString(settlement?.payoutRef) &&
    isCanonicalUtcTimestamp(settlement?.settledAt)
  ) {
    claim.claimState = settlement.settlementType === "cash_payout" ? "paid" : "credited"
    claim.payoutRef = settlement.payoutRef
    claim.resolvedAt = settlement.settledAt
  }
}
```

Stage 7 fallback execution must distinguish fail-closed cancellation from user-consented fallback execution: missing, malformed, wrong-row, or fallback-rule-inconsistent inputs may trigger release/cancel/no-capture and fresh-consent marking, but they must not synthesize `release_hold` or any other executable fallback rule. Refund, reroute, carry-forward, and release-hold branches may run only when `stage7UserConsentedFallbackExecutionEligible` is true and the executable rule was selected from uniquely proven, bundle-derived, fallback-rule-consistent rows.
When `round.status !== "payable"`, Stage 7 must use the explicit `stage7FailureHandlingNonSideEffectOutput` path or an equivalent locally defined side-effect-free output, never an undefined or ambient replay helper such as `emitFailureHandlingReplayOnly(...)`; that path may only replay/report/audit already-recorded outputs or emit non-binding review output.
Stage 7 failure-bonus claim creation, payout/proration calculation, final payout-field writes, and `FailureBonusClaim.prorationFactorBps` mutation must use the same full `failureBonusBundleEligible` predicate as Section 10, including round rulebook/freeze validation, `roundClearingInputBundleBindingHashValid(...)`, component-hash validation, sponsor-input hash binding, and moral-bucket snapshot id/hash binding, and must also require `round.status === "payable"` plus positive backed failure-bonus-pool availability before any side-effect write. A weaker hash-format-only clearing-bundle check must not create, advance, prorate, credit, pay, or mutate a failure-bonus claim.
Stage 7 `createFailureBonusClaimIfQualified(...)` must initialize state and default fields explicitly before insert. A fully qualified Stage 7 payout claim starts as `claimState === "approved"`, `denialReason == null`, `payoutRef == null`, `resolvedAt == null`, with `rawBonusCents`, `participantRoundCapCents`, `participantCappedProvisionalBonusCents`, and `bonusCents` initialized to `0`, `prorationFactorBps` initialized to `10_000`, and `createdAt` set by the helper to a canonical UTC write timestamp. If a product uses a separate intake/review path, that path may create only `pending` unsettled claims and must not place them in final payout/proration lists until an explicit approval transition sets `claimState === "approved"` under the same current-round, policy, bundle, payment-snapshot, and claimant-conflict predicates. Before insert, the helper must perform an idempotent unique-key lookup for `FailureBonusClaim(roundId, projectId, participantId, conditionalTradeIntentId)`: create only when no matching claim exists; no-op/replay without overwrite when an exact context/policy/eligibility-hash-matching claim already exists; and fail closed for manual review when an existing same-key claim has mismatched policy, context, or eligibility hash.
Section 10 and Stage 7 failure-bonus final sponsor-backed calculations return zero and do not call or trust frozen sponsor backing when `failureBonusBundleEligible` is false; when `round.status !== "payable"` or the backed failure-bonus pool is unavailable, they may only replay/report/audit already-recorded failure-bonus outputs without writing new payout or proration fields. Stage 7 final payout/proration lists must also require an audit-context-bound unsettled approved `FailureBonusClaim`: the claim row must pass `stage7FailureBonusClaimAuditContextEligible(...)`, including canonical `createdAt`, have `claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null`. `pending`, `denied`, `expired`, `paid`, `credited`, or already-settled approved rows may be replayed or audited but cannot enter payout denominators or receive new final payout/proration mutations. Successful cash payout or platform-credit issuance must advance the claim to `paid` or `credited` with a non-empty trim-stable `payoutRef` and canonical `resolvedAt` timestamp.

Failure bonuses are denied for review-not-approved, challenge-blocked, safety, anti-threat, destination, project-identity/destination-route, externality, conflict, sponsor, rulebook, legal/custody, identity, sybil, collusion, authorization, or user-consent failures. Total approved failure-bonus payouts must never exceed the backed available failure-bonus pool. That pool equals `roundFailureBonusBudgetCents` only when the eligible round-close clearing bundle is present, `failureBonusBudgetCapValid` is true, and `finalFailureBonusBackingCents >= roundFailureBonusBudgetCents`; otherwise it is `0`. If provisional qualified claims exceed that backed available pool, prorate them deterministically using exact target-payout numerator / total-provisional denominator arithmetic, deterministic stable-order remainder keys, and duplicate-free current-round claim IDs; include the proration factor in each `FailureBonusClaim` for audit/reporting. They are not based on early card authorization and must never require violating the just-in-time authorization rule.

---

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
POST   /api/mpgf/pivotality-calculator   # stateless educational endpoint; no roundId/projectId/live progress inputs
GET    /api/mpgf/rounds/:roundId/payment-commitment-snapshots
POST   /api/mpgf/rounds/:roundId/payment-commitment-snapshots
POST   /api/mpgf/rounds/:roundId/lock
POST   /api/mpgf/rounds/:roundId/clear
POST   /api/mpgf/rounds/:roundId/authorize
POST   /api/mpgf/rounds/:roundId/reconcile-authorizations
GET    /api/mpgf/rounds/:roundId/authorization-reconciliation-events
POST   /api/mpgf/rounds/:roundId/capture
POST   /api/mpgf/rounds/:roundId/freeze
GET    /api/mpgf/rounds/:roundId/sponsor-commitments
POST   /api/mpgf/rounds/:roundId/sponsor-commitments
POST   /api/mpgf/rounds/:roundId/release-failed
GET    /api/mpgf/rounds/:roundId/failure-bonus-claims
POST   /api/mpgf/rounds/:roundId/failure-bonus-claims/:claimId/resolve
GET    /api/mpgf/rounds/:roundId/success-reward-claims
POST   /api/mpgf/rounds/:roundId/success-reward-claims/:claimId/resolve
GET    /api/mpgf/rounds/:roundId/coordination-credits
GET    /api/mpgf/rounds/:roundId/impact-certificates
GET    /api/mpgf/rounds/:roundId/audit-bundle
GET    /api/mpgf/projects/:projectId/review-state
POST   /api/mpgf/projects/:projectId/challenge
POST   /api/mpgf/projects/:projectId/conflict-review
GET    /api/mpgf/recipient-registry
POST   /api/mpgf/recipient-registry
```

---

## 15. Public UX

Build a default **plain-language guided mode** with an advanced-details layer. This section replaces a long form with a simpler user path, but it does **not** remove any mechanism field, gate, review state, payment state, reward rule, or audit requirement. Every simple-mode action must round-trip to the same `CommonGroundBudget`, `ProjectSupportStance`, `ConditionalTradeIntent`, payment-snapshot, fee-quote, reward/credit/certificate opt-in, fallback, visibility, and sealed-pledge records used by the full CRECM mechanism.

### 15.0 Plain-Language Copy Map

The default UI may use short labels, but each label must have a fixed canonical meaning.

| Default UI text | Canonical CRECM meaning | Implementation requirement |
|---|---|---|
| **Maximum this round** | `CommonGroundBudget.totalBudgetCents` | A cap, not an authorization and not a charge |
| **Maximum for this project** | `ConditionalTradeIntent.maxExposureCents` plus project/stance caps | Cannot exceed budget, project cap, stance cap, or active intent cap |
| **Fund this** | `ProjectSupportStance.stance = "strong"` | Allocatable only after explicit cap and condition acceptance |
| **Fund if different-view support joins** | `ProjectSupportStance.stance = "weak"` | Allocatable only after explicit cap and cross-view condition acceptance |
| **Needs review** | `ProjectSupportStance.stance = "dissent"` | Allocates zero; may increase review pressure if identity-clear and non-duplicate |
| **Skip** | `ProjectSupportStance.stance = "abstain"` | Default; allocates zero |
| **Condition** | `ConditionalTradeIntent.acceptableCounterBucketIds` and `minCounterpartyVolumeCents` | Must use verified match-eligible distinct counterparty volume and self-match exclusions |
| **Sent to project** | `netRecipientDisbursedCents` | Fees excluded unless sponsor-paid fee support separately funds them |
| **Counts for matching** | `matchEligibleCents` | Never use gross captured or rewards/credits/certificates as match input |
| **Sponsor added** | base-match and bonus-match cents | Only from backed sponsor pools after hard gates |
| **Contributor benefit** | success reward, coordination credit, or impact certificate | Never public-good dollars, allocation power, or counterparty volume |

Terms to avoid in default copy unless the exact state is true: `authorized budget`, `funds held`, `escrow`, `custody`, `guaranteed match`, `guaranteed impact`, `matched impact`, and `insured donation`.

### 15.1 Guided Setup Checklist

Show a compact checklist at the top of the funding page.

```text
Common Ground Budget

1. Choose budget        Ready / needs amount
2. Pick projects        0 selected / N selected
3. Review and save      Not ready / ready

You are not charged now. A payment attempt can happen only after the round closes
and the selected projects pass threshold, review, challenge, payment, and authorization checks.
```

Use status chips:

```text
Ready
Needs review
Details hidden until review
Saved
Blocked
Non-binding preview
```

A status chip is never consent. It only summarizes whether required fields appear complete. The final review screen remains the consent boundary.

### 15.2 Step 1 — Choose Budget

Default screen:

```text
Choose your maximum

Maximum this round: [$50]
Budget type: [one-time / every round / monthly]
If something does not clear: [do not charge / try another approved project / carry forward / cancel authorization or release hold if applicable]
Privacy: [aggregate only]

Payment method
[Save payment method]
A saved card is not a charge, hold, authorization, escrow, custody event,
or guarantee that a later authorization will succeed.

[Continue]
```

Collapsed details drawer on the same screen:

```text
Details you are agreeing to
- Per-project maximum: [$25]
- Next capture rule and cancellation deadline
- Fee acknowledgement and fee-policy hash
- Sponsor-paid fee support disclosure
- Success-reward opt-in: [on/off]
- Coordination-credit opt-in: [on/off]
- Impact-certificate opt-in: [on/off]
- Recognition preference
- Rulebook hash at consent
- Sealed-progress acknowledgement
```

Required simplification rule: simple mode may prefill safe defaults, but those defaults become binding only after the final review screen shows them and the user saves.

### 15.3 Step 2 — Pick Projects

Show each project as a card with four plain-language buttons and one visible maximum-exposure field. Default stance is **Skip** / `abstain`.

```text
Global health and basic needs

[Fund this]
[Fund if different-view support joins]
[Needs review]
[Skip]

Maximum for this project if it clears: [$25]
Condition: shown below
```

If the user chooses **Fund this**:

```text
You chose: Fund this
Canonical stance: strong

This can clear only if the project passes threshold, review, challenge,
payment, authorization, and your saved condition.

Condition summary:
At least $200 of verified match-eligible support from morally distinct buckets.

[Use suggested condition] [Edit condition]
```

If the user chooses **Fund if different-view support joins**:

```text
You chose: Fund if different-view support joins
Canonical stance: weak

Suggested condition:
At least $200 of verified match-eligible support from morally distinct buckets:
global health, animal welfare, public-interest knowledge.

Does not count: your own dollars, linked accounts, same-payment-method or
same-payment-cluster accounts, same-control entities, sponsor dollars,
platform dollars, fees, same-bucket dollars, rewards, credits, or certificates.

[Use suggested condition] [Edit condition]
```

If the user chooses **Needs review**:

```text
You chose: Needs review
Canonical stance: dissent
Money allocation: $0
Review note: [text box]
Visibility of review signal: [aggregate only / pseudonymous / public]
```

The UI must not infer **Fund this** or **Fund if different-view support joins** from browsing, profile data, prior donations, background networking, project-card expansion, calculator use, or suggestion acceptance without explicit save. A project is allocatable only after the user explicitly selects an allocatable stance and accepts a cap and condition.

### 15.4 Edit Condition Drawer

The drawer exposes the complete cross-view pledge terms without requiring users to read implementation labels first.

```text
Edit condition

I may contribute up to [$25] to [project]
only if at least [$200] of verified match-eligible support clears
from these morally distinct buckets:

[✓] Animal welfare
[✓] Long-run future
[✓] Public-interest knowledge

Priority order: [1]
Fallback rule: [same as budget / custom compatible fallback]
Base match if cleared: project-specific sponsor match on match-eligible dollars
Bonus: capped diversity-aware post-clear sponsor bonus
Contributor benefit: success reward only if backed; otherwise $0 or "up to" with cap/proration disclosure
Coordination credits / impact certificate: optional contributor-only receipt; no allocation power
Fees: gross captured, fee, and sent-to-project amounts shown separately
Self-matching exclusions: self, linked accounts, same payment method, same payment cluster, same-control entity
Capture rule: after hard gates and exact authorization reconciliation only

[Save condition]
```

Advanced users may expand the canonical field names:

```text
Canonical fields
- ProjectSupportStance.stance
- ProjectSupportStance.maxAllocCents / maxAllocBps
- ConditionalTradeIntent.amountCents
- ConditionalTradeIntent.maxExposureCents
- ConditionalTradeIntent.acceptableCounterBucketIds
- ConditionalTradeIntent.minCounterpartyVolumeCents
- ConditionalTradeIntent.fallbackRule
- rulebookHashAtConsent
```

### 15.5 Step 3 — Review and Save

Before saving, show one consolidated consent screen. This screen must be short by default, but every binding field must be visible either inline or in an expanded “required details” panel on the same screen.

```text
Review your Common Ground Budget

Maximum this round: $50
Payment: saved method required for final clearing; no charge or hold now
If something does not clear: carry forward
Privacy: aggregate only
Sealed progress: exact live threshold and counterparty gaps hidden until close

Projects
- Global health: Fund this / canonical strong, max $25, condition accepted, priority 1
- Biosecurity: Fund if different-view support joins / canonical weak, max $15, condition accepted, priority 2
- Public-interest knowledge: Fund if different-view support joins / canonical weak, max $10, condition accepted, priority 3
- Animal welfare transition: Needs review / canonical dissent, allocation $0

What you may see after settlement
- Charged from you: gross captured amount, if any
- Sent to projects: net recipient-disbursed public-good dollars
- Counts for matching: counted and match-eligible dollars
- Sponsor added: base match and capped bonus, if backed and eligible
- Contributor benefits: success reward / coordination credit / impact certificate, if eligible
- Failed projects: refund, reroute, carry-forward, or cancellation according to your fallback

Required details
[Show caps, buckets, fallback, fees, benefits, payment language, self-match exclusions, sealed-progress rule, failure-bonus denial categories, rulebook hash]

[Save Common Ground Budget]
```

The review screen is the consent boundary. Hidden defaults, suggestions, project-card text, status chips, emails, or calculator outputs that are not shown here cannot become binding.

### 15.6 Round Board

Before close, sealed rounds show qualitative or rounded status only.

```text
June Common Ground Round
Deployment mode: capped pilot; real capture capped by the published round and participant limits
Sealed progress: exact live threshold, exact counterparty gaps, exact live supporter counts,
and exact success-without-me status are hidden until close.

Global health
Status: likely near threshold
Your choice: Fund this
Your maximum: $25

Biosecurity
Status: needs more verified different-view support
Your choice: Fund if different-view support joins
Your maximum: $15

Animal welfare transition
Status: review pressure high
Your choice: Needs review
```

Do not show exact current threshold satisfaction, exact current counterparty-volume gaps, exact live supporter counts, exact active-cluster counts, or exact success-without-me status before close in sealed mode. Final exact aggregates may appear only after close in the audit bundle or post-round report.

### 15.7 Contribution State and Proof Ledger

After close, and only as permitted by round status, show a plain-language summary first and the full technical ledger second.

```text
Your Common Ground Budget

Maximum this round: $50
Current state: pending final review / final / no charge

Plain summary
- Charged from you: pending / $0 / final gross amount
- Sent to projects: pending / $0 / final net-recipient amount
- Counted for matching: pending / $0 / final counted and match-eligible amount
- Sponsor added: pending / $0 / final base and bonus match
- Contributor benefits: pending / none / final reward, credit, certificate
- Failed or carried forward: project list and reason codes

Proof details
- Gross captured
- Fees
- Net recipient-disbursed
- Actual/gross exposure
- Counted contribution
- Match-eligible contribution
- Base-match claim and paid amount
- Bonus-score units and bonus-match paid amount
- Failure-bonus claim state and denial reason, if any
- Success-reward / coordination-credit / impact-certificate state
- Review, threshold, challenge, payment, and authorization reconciliation states
```

Primary summary numbers must not combine accounting channels. For example, “sent to projects” cannot include fees, rewards, credits, certificates, base match, or bonus match unless explicitly labeled as a separate sponsor-added amount.

### 15.8 Advanced Pivotality Calculator

Provide an optional educational calculator only in advanced explainer, shadow simulation, post-round educational analysis, or a labeled project-card educational drawer.

```text
Advanced: Pivotality Calculator

This is a simplified model. It does not use live sealed-round data,
does not estimate whether you are actually pivotal, and does not affect your pledge.

Your possible contribution, x: [$50]
Funding threshold, T: [$500]
Your value ratio, r:
  How much you value $x to this public good relative to your best alternative use of $x: [0.20]
Probability the project succeeds without you, p0: [0.30]
Your estimated probability your pledge is decisive, pD: [0.25]
Signer-only reward value, s: [0]
Non-decisive extra-funding value fraction, h: [0]

Output:
Required decisive probability: 30%
Your estimate: 25%
Result: By your stated values under this simplified model, this pledge does not beat your alternative use of the money.
```

Calculator copy must say "best by your stated values under this simplified model," not "objectively best." It must not use platform-generated live success-without-me probabilities before close. If success rewards are capped or prorated, the calculator may model them only as user-entered subjective values and the UX must say "up to" unless the maximum promised liability is fully backed.

### 15.9 UX Simplification Constraints

- Simple mode and advanced mode must write the same canonical records for the same user choices.
- Plain labels must never create new enum values or alternate clearing semantics.
- Suggested conditions are not binding until shown on the review screen and saved under the current rulebook hash.
- Collapsed details are allowed during setup, but the final review screen must expose all material payment, fee, fallback, reward, self-match, sealed-progress, and failure-bonus denial disclosures before save.
- Emails, receipts, and public round pages must use the same copy map and must not strengthen payment, escrow, custody, matching, reward, credit, certificate, or impact claims beyond the recorded CRECM state.
- Accessibility text must describe the canonical effect of each plain-language button, not only the short label.


### 15.10 Offers Search and Public Goods Fund Entry-Page Simplification

The moral-public-goods entry experience includes `GET /offers?search=moral%20public%20goods`, any equivalent public-goods search/filter route, and the Public Goods Fund hub. These pages are entry surfaces, not a separate funding mechanism. They must make the safe next action obvious while preserving every CRECM feature and boundary.

#### 15.10.1 Search-intent router

When the query, active filter, referrer, or route intent matches public-goods funding terms, the page should resolve to a **Common Ground Budget intent state** before rendering the ordinary offer directory.

Intent terms include:

```text
moral public goods
public goods fund
Common Ground Budget
CRECM
MPGF
assurance matching
conditional public-good pledge
cross-view funding
```

Default resolved state:

```text
Common Ground Budget
Fund moral public goods only if enough different-view support joins.

No charge now. Exact live progress may be hidden until the round closes.
Projects must pass threshold, review, challenge, payment, and authorization gates.

[Preview a Common Ground Budget]
[View current round]
[Learn how it works]
```

This intent router must not create, edit, clear, authorize, capture, release, reward, credit, certify, or audit any CRECM record. It only chooses the default page presentation and CTA order.

#### 15.10.2 Replace generic zero-state with public-goods result card

If there are zero matching ordinary offers but a public-goods module, round, shadow preview, capped pilot, or learning route exists, the primary page must not say only “0 listings” or “No matching listings.” Use:

```text
No ordinary moral-trade offers match this search.

The moral-public-goods route is separate:
Common Ground Budget / Public Goods Fund
- Current mode: shadow / capped pilot / full / learning-only
- Payment capture: disabled / JIT authorization after gates / legally reviewed custody path
- Current safe action: preview budget / view round / sign in to set stance

[Preview a Common Ground Budget]
[View public round]
[Browse ordinary offers instead]
```

The ordinary offer zero state may appear below this card, but not above it.

#### 15.10.3 Single primary task card and collapsed lanes

The offers page may still maintain these separate lanes:

```text
Live offers
Reviewed templates
Worked examples
Demo records
Public-goods module / Common Ground Budget
```

But for public-goods search intent, show one primary task card first and move the lane counts into a collapsed drawer:

```text
Other ways to browse
Live offers: 0
Reviewed templates: 4
Worked examples: 8
Demo records: 2
Public-goods module: 1

[Expand]
```

Do not merge counts. Do not count public-goods modules as live ordinary offers. Do not count worked examples or demo records as agreements, liquidity, pledges, cleared rows, match-eligible dollars, supporter counts, or active clusters.

#### 15.10.4 Collapse irrelevant filters

For public-goods intent states, hide or collapse filters whose current result set has no facets.

Default visible controls:

```text
Search public-goods funding
Deployment mode: any / shadow / capped pilot / full
Round state: open / reviewing / cleared / payable / closed
Project bucket: global health / animal welfare / long-run future / public-interest knowledge / institutional resilience
Review state: any / clear / needs review / blocked
```

Collapsed drawer:

```text
Ordinary offer filters
Cause area
Format
Verification method
Duration
Review status
Impact-score filters
Reciprocal-match filters
```

If a filter would show “No cause facets available,” “No formats available,” or all-zero counts, do not render it in the default public-goods view. Keep it reachable only in the ordinary-offer drawer.

#### 15.10.5 CTA hierarchy and one safe next action

Only one primary CTA should be visually dominant.

CTA order by page state:

| Page state | Primary CTA | Secondary CTAs |
|---|---|---|
| Signed out, no binding round | Preview a Common Ground Budget | Learn how it works; view examples |
| Signed out, open shadow/capped round | Preview budget | View current round; sign in |
| Signed in, not verified | Verify and preview budget | View current round; learn gates |
| Signed in and verified, open round | Start Common Ground Budget | View round; advanced details |
| Reviewing / sealed before close | Review your saved choices | Learn sealed progress; view rules |
| Post-close / audit published | View your contribution state | View audit bundle; download receipt |

A primary CTA must not bypass sign-in, identity verification, provider-confirmed payment commitment when required, explicit stance/cap/condition/fallback consent, sealed-progress acknowledgement, final review, round-close clearing, review gates, authorization reconciliation, or payable-state side-effect gates.

#### 15.10.6 Public label map for the offers and MPGF pages

Use this copy map on the public entry page:

| Avoid as primary public label | Use as primary public label | Where the avoided label may appear |
|---|---|---|
| External CRECM module | Common Ground Budget | Advanced technical details only |
| MPGF | Public Goods Fund | First mention may say “Public Goods Fund (MPGF)” |
| Verified Assurance Matching demo | Legacy assurance demo | Historical/demo drawer only |
| moralpublicgoods102.md / old CRECM versions | Current rulebook / CRECM v1.125 | Technical audit/version history only |
| Payment capture disabled | No charge in this preview | Status chip may also say “capture disabled” |
| Guaranteed base match | Base match if backed and gates pass | Only say guaranteed when backed and legally/promissorily true |
| Projected allocation | Possible allocation if gates pass | Never imply capture or impact before gates |

Current-product pages must not show old mechanism-version references as governing the active product. If legacy demos remain visible, their cards must say:

```text
Legacy demo — not the current Common Ground Budget mechanism.
No current-product rules, match estimates, payment states, or audit guarantees should be inferred from this demo.
```

#### 15.10.7 Public Goods Fund hub simplification

The Public Goods Fund hub should have this default structure:

```text
Hero
  Common Ground Budget
  One budget. Pick projects. Funding happens only if enough different-view support joins and review gates pass.
  [Preview a budget] [View current round]

Status strip
  No charge now / JIT authorization after gates / sealed progress / sponsor pools backed or not backed / review state

Current round
  Project cards with plain stance buttons or signed-out previews

How it works
  1. Choose your maximum
  2. Pick projects
  3. Review and save
  4. Round clears after gates

Trust and review
  Review gates, no-escrow-unless-true, anti-threat, externality, challenge, and appeal links

Audit and advanced details
  Rulebook hash, calculation version, sponsor pools, proof path, candidate pools, technical spec
```

Detailed mechanism language, candidate-pool taxonomy, proof paths, legacy demos, old verified-assurance wording, and technical notes belong below the fold or in drawers. They must remain accessible for auditors and expert users, but they must not be the first decision surface for new visitors.

#### 15.10.8 Search-result card schema

The public-goods result card should use this schema:

```text
Card title: Common Ground Budget
Subtitle: Fund public goods only if enough different-view support joins.
Status chips:
  - Shadow preview / capped pilot / full round
  - No charge now / JIT authorization after gates / custody path if legally true
  - Sealed progress before close
  - Review gates required
Summary numbers:
  - Current round state
  - Number of candidate projects
  - Sponsor pools backed / not backed / not applicable
  - Capture enabled / disabled
Primary CTA: Preview a Common Ground Budget
Secondary CTA: View current round
Tertiary CTA: Learn how this differs from ordinary offers
Advanced drawer:
  - lane counts
  - rulebook hash
  - calculation version
  - deployment mode
  - audit bundle link if available
```

Summary numbers must not combine gross captured, fees, net recipient-disbursed dollars, counted dollars, match-eligible dollars, sponsor match, success rewards, credits, certificates, ordinary offer counts, worked-example counts, or demo amounts into a single “impact” number.

#### 15.10.9 Sealed-progress compatibility on public pages

For sealed CRECM rounds, the offers page, Public Goods Fund hub, and project cards must follow the same sealed-progress rules as the round board. Before close, do not expose exact current threshold satisfaction, exact current counterparty-volume gaps, exact live supporter counts, exact live active-cluster counts, or exact success-without-me status. Show qualitative labels such as:

```text
Needs more support
Likely near threshold
Review pending
Closed; final audit available
```

Legacy demo pages may show demo threshold numbers only when they are visibly labeled as demo/non-binding or post-close historical values and cannot be confused with live sealed CRECM progress.

#### 15.10.10 Accessibility and mobile requirements

- The public-goods card must be reachable as the first main-region result after the page heading for public-goods search intent.
- Collapsed lane and filter drawers must be keyboard accessible, have descriptive ARIA labels, and preserve focus order.
- Status chips must have text labels, not color-only distinctions.
- The primary CTA must remain visible above the fold on mobile.
- The page must work without hover interactions.
- Search result announcements should say “Common Ground Budget result available” rather than only “0 listings.”

#### 15.10.11 Non-compromise constraints

The entry-page simplification cannot:

- create a pledge without the normal Common Ground Budget flow,
- infer allocatable stances from search terms, clicks, browsing, or CTA selection,
- bypass review, identity, payment, authorization, sponsor, sealed-progress, failure-bonus, reward, credit, certificate, or audit gates,
- merge demo/example/module/ordinary-offer counts,
- present stale legacy mechanism labels as current,
- imply escrow, custody, payment protection, tax treatment, legal advice, impact certainty, guaranteed match, or capture timing beyond the recorded CRECM state,
- expose sealed live progress before round close.

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
- Success-reward pool
- Coordination-credit / impact-certificate policy
- Sealed-pledge disclosure mode
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
- Funded / escrowed / contractually committed amount
- Rulebook hash and parameter-freeze timestamp
- Sponsor-recipient-reviewer-proposer conflicts
- Safety freeze / cancellation events
- Public exception reports

---

## 17. Public Metrics

Publish privacy-safe aggregate KPIs:

```text
gross-captured dollars
fee dollars excluded from public-good credit
fee-quote policy-hash binding, waived-fee validation, `(roundId, id)` / allocation-key uniqueness, and feeInputHash validation failure count
net-recipient-cleared dollars
actual-cleared dollars
counted-cleared dollars
match-eligible cleared dollars
weak-support-to-counted-dollar conversion
strong-support-to-counted-dollar conversion
cleared cross-view dollars per sponsor dollar
threshold-clear rate
average active clusters per cleared project
base-match utilization
base-match claim-vs-paid ratio
bonus-match utilization
bonus-match cap utilization
bonus-match capped-proration pass count
raw-vs-verified-clear dissent pressure count
bonus-affecting dissent-pressure exclusion count
optimizer equal-objective tie-break count
fee-excluded threshold/match dollars
missing, duplicate-id, duplicate-allocation-key, fee-policy-hash-mismatched, or waived-fee-inconsistent FeeQuote row zero-allocation count
failure-bonus utilization
failure-bonus denied-by-reason counts
failure-bonus raw-vs-participant-capped ratio
failure-bonus integer-rounding remainder cents
failure-bonus participant-round cap utilization
failure-bonus participant-proration stable-order-key validation failure count
failure-bonus participant-proration undefined-helper prevention count
failure-bonus round-level proration undefined-helper prevention count
Stage 4 base-match default-ratio local-definition validation failure count
failure-bonus provisional-vs-paid ratio
failure-bonus claim eligibility-hash / claimant-conflict / stored-amount mismatch rejection count
failure-bonus proration factor bps
failure-bonus backed-available-pool utilization
non-binding settlement-preview dollars excluded from clearing
base-match rounding remainder cents
bonus-match rounding remainder cents
base-match funded-vs-advertised ratio
bonus-match funded-vs-advertised ratio
failure-bonus funded-vs-advertised ratio
success-reward funded-vs-advertised ratio
success-reward utilization
success-reward denied-by-reason counts
success-reward dominance-mode disabled-by-underbacking count
coordination-credit units issued
coordination-credit no-allocation-power invariant violation count
impact-certificate units issued
impact-certificate late-access rejection count
sealed-pledge exact-progress exposure incident count
self-match / linked-account / same-payment-method / same-control exclusions
authorization failure reclearing count
authorization wrong-amount / short-expiry removals
authorization-failed dollars removed from clearing
payment-commitment snapshot count and invalidation count
payment-commitment provider-evidence-hash malformed/invalid count
clearing input bundle validation failure count
clearing input bundle component-hash mismatch count
clearing input bundle uniqueness violation count
snapshot / project-eligibility-snapshot uniqueness violation count
Common Ground Budget row-count uniqueness violation count
identity-eligibility row-count uniqueness violation count
round-keyed payment-snapshot row-count uniqueness violation count
Stage 7 claim-creation attempts denied by full Section 10 qualified predicate
Stage 7 duplicate failure-bonus claim create no-op / same-key mismatch rejection count
sponsor frozen-vs-live backing mismatch count
sponsor commitment source-hash / integer-cent validation failure count
bonus fixed-point score-unit quantization mismatch count
invalid monetary-cap / basis-point-cap allocation rejection count
unsafe integer cent/count/basis-point validation failure count
unverified-or-nonclear-identity counted-dollar exclusion count
project-eligibility-snapshot hash validation failure count
project-eligibility-snapshot baseline/action-evidence boolean validation failure count
project-eligibility-snapshot cutoff/kind mismatch count
conditional-intent counterparty-volume / bucket-array validation failure count
round donor-counted-cap / identity-threshold validation failure count
project match-bps validation failure count
round sponsor-budget validation failure count
identity-weight bps validation failure count
payment-commitment missing-payment-method-ref count
bonus fixed-constant / review-pressure-threshold validation failure count
project economic-term validation failure count
project baseline/action-evidence hard-gate rejection count
payment-commitment snapshot binding-hash validation failure count
moral-bucket snapshot binding-hash validation failure count
moral-bucket snapshot graph-well-formedness validation failure count
Stage 1 loose moral-bucket-snapshot hard-gate rejection count
Stage 1 missing/ineligible clearing-bundle sponsor-backed hard-gate rejection count
Section 11 / Stage 1 gated final sponsor-backing variable zeroing count
cross-budget stance/conditional-intent row rejection count
duplicate support-stance / conditional-intent selected-row rejection count
formula-level bundle row-count uniqueness guard rejection count
failure-bonus project-row binding rejection count
failure-bonus missing/ineligible clearing-bundle sponsor-backing rejection count
round-open eligibility snapshot non-boolean/truthy-field rejection count
round-clearing-input-bundle binding-hash validation failure count
sponsor backing timing validation failure count
sponsor backing post-parameter-freeze rejection count
sponsor commitment monetary-field validation failure count
moral-bucket snapshot post-freeze creation rejection count
moral-bucket reciprocal-map raw-key mismatch count
project-round eligibility snapshot binding-hash validation failure count
failure-bonus qualification full-backing denial count
failure-bonus claimant-conflict snapshot context-binding rejection count
trim-stable string identifier validation failure count
fail-closed helper validation failure count
matching raw Math.min bypass prevention count
matching per-project payout-map sanitization failure count
stable-order explicit tuple-field coverage count
project-bucket counterparty-lookup naming mismatch count
failure-bonus exact target-proration underallocation prevention count
failure-bonus duplicate/wrong-round claim-list rejection count
aggregate sumBigInt helper validation failure count
Stage 7 local helper-definition validation failure count
Stage 7 replay/review non-side-effect output undefined-helper prevention count
canonical timestamp validation failure count
round rulebook / parameter-freeze validation failure count
sponsor preview backing validation failure count
round timeline validation failure count
failure-bonus preview-backing validation failure count
failure-bonus full-backing validation failure count
counterparty-bucket raw-array validation failure count
budget-period / recurring-next-capture / budget-fallback-rule validation failure count
conditional-intent enum / post-capture-state validation failure count
sponsor preview future-timestamp rejection count
authorization-reconciliation event-hash / duplicate-event validation failure count
custody authorization timing / exact-amount validation failure count
round-clearing-input-bundle id-binding validation failure count
bps out-of-range fail-closed count
failure-bonus budget-cap validation failure count
bonus collusion-risk / cluster-distribution validation failure count
deprecated stance counterparty-volume field ignored count
moral-bucket distinctness asymmetry blocks
authorization-to-capture lag
counted-to-payout lag
donor retention into next round
Sybil flag rate
appeal rate
blocked-project precision
privacy incident count
deployment-mode guardrail rejection count
shadow-mode payment-snapshot exemption simulation count
deployment-audit payment-reconciliation-path mismatch count
full-deployment shadow-only-prior-evidence rejection count
selected sponsor-paid fee-support aggregate rejection count
supporter-count dust-floor exclusion count
capped-pilot configured-cap overrun rejection count
capped-pilot gross-exposure cap utilization
failure-bonus claimant-conflict denial count
failure-bonus claimant-conflict snapshot binding rejection count
sponsor-paid fee quote backing-hash mismatch count
sponsor-paid fee support aggregate overcommit rejection count
pivotality calculator open count by allowed surface
pivotality calculator invalid-input rejection count
pivotality calculator impossible-result count
pivotality calculator live-data-access rejection count
pivotality calculator no-side-effect invariant violation count
simplified-UX advanced-drawer open count
simplified-UX review-screen consent completion count
simplified-UX data-parity mismatch count
plain-language guided-mode completion count
plain-label to canonical-record mismatch count
final-review required-detail expansion count
final-review hidden-required-field rejection count
payment-language overclaim prevention count
matching/reward/impact-language overclaim prevention count
copy-map accessibility-label parity failure count
moral-public-goods search-intent routed-to-CGB-card count
moral-public-goods search zero-state suppression count
public-goods primary CTA click-through count
public-goods ordinary-offer drawer open count
empty-filter default-render prevention count
stale-current-product-label exposure count
legacy-demo-label correctness count
public-goods lane-count separation mismatch count
public-goods mobile primary-CTA visibility failure count
public-goods search accessibility announcement failure count
```

Do not optimize for gross donation volume alone. Optimize for **incremental, verified, cross-view, review-cleared funding of moral public goods**.

---

## 18. Test Requirements

Add unit and integration tests for:

```text
hard-gate blocking
round deployment mode validation: shadow rounds produce explicitly labeled non-binding shadow-output simulation rows with zero binding capture/payment outputs and do not require provider-confirmed payment snapshots for shadowPreview values, capped_pilot rounds enforce bundle-derived per-round and per-participant remaining gross-exposure caps before candidate allocation, and full rounds require a first-class passed deployment audit object created no later than parameter freeze whose binding hash covers the current calculation version, rulebook, fee policy, sponsor input, the current round payment/reconciliation path hash, coherent audit-kind/target-mode fields, equal-length prior shadow/capped-pilot evidence arrays, and at least one capped-pilot prior mode
open challenge does not pass clearing unless challengeState is explicitly non_blocking
anti-threat blocking
baseline-integrity, baseline-confidence, and action-evidence hard gates: binding capped_pilot/full rounds reject projects without clear baseline integrity, high/medium baseline confidence, and adequate action evidence, while shadow rounds keep provisional evidence in nonbinding shadowPreview channels only
dissent not allocating funds
missing support stance defaults to abstain, allocates zero, and exposes no counterparty buckets
missing Common Ground Budget rows fail closed, allocate zero, expose no payment authority, and do not dereference budget/payment fields before eligibility checks
missing identity eligibility row has zero identity weight and cannot count, match, satisfy counterparty volume, or qualify for failure bonuses
unverified, sybil-review, sybil-blocked, collusion-review, or collusion-blocked identity rows cannot produce countedContributionCents, verified supporter counts, active cluster counts, counterparty-volume satisfaction, sponsor-match eligibility, or failure-bonus qualification even when countedWeightBps is high; rows below the frozen `supporterCountMinNetPublicGoodCents` floor cannot count as verified supporters or active-cluster members even when countedContributionCents is positive, and malformed or below-100-cent floor values resolve to the 100-cent default
invalid, negative, fractional, NaN, unsafe-integer, or malformed budget totals, per-project caps, support-stance caps, conditional-intent amounts, exposure caps, counterparty-volume thresholds, round donor-counted caps, participant remaining-budget values, or project remaining-cap values allocate zero and never produce negative, unsafe, or fractional gross/fee/net-recipient/actual/count/match-eligible cents
fail-closed min helper returns zero on missing, negative, fractional, unsafe-integer, or malformed inputs and all Section 8, Section 9, Section 10, Stage 2, Stage 4, and Stage 5 payout-relevant min calls use that helper rather than an undefined helper or unsanitized Math.min path
fail-closed intersection helper returns a sorted duplicate-free intersection for valid trim-stable string arrays and returns [] for malformed, duplicate, whitespace-padded, non-array, or non-string inputs before counterparty-bucket validation
fail-closed sumBigInt helper returns exact BigInt sums for arrays of non-negative safe-integer cents or non-negative bigint score units and returns 0n for missing, non-array, negative, fractional, unsafe, string-coerced, NaN, or malformed aggregate inputs; Section 9, Section 10, Stage 4, and Stage 5 aggregate payout/proration formulas use this helper rather than undefined helpers, JavaScript-number sums, or unsafe reduce paths
bundle-derived participant remaining-budget and project remaining-cap lookups are keyed by (roundId, participantId) and (roundId, projectId); wrong-round allocator-state rows resolve to zero and cannot affect Section 8 or Stage 2 allocations
invalid, negative, fractional, or NaN round base-match, bonus-match, or failure-bonus budget fields count as zero and never produce negative match, bonus, failure-bonus, or payout availability outputs
invalid, negative, fractional, NaN, or malformed PublicGoodProject requestedMaxCents, minimumViableCents, thresholdAmountCents, thresholdSupporterMin, or thresholdClusterMin fields block project clearing and cannot lower threshold requirements
malformed identityEligibility.countedWeightBps values, including fractional, NaN, string-coerced, or out-of-range values, count as zero and cannot unlock counted dollars, counterparty volume, sponsor matching, or failure bonuses
round-close and early-failure-bonus PaymentCommitmentSnapshot records with missing or empty paymentMethodRef values cannot affect binding final clearing or failure-bonus qualification; shadow-only shadowPreview outputs remain non-binding
paymentCommitmentSnapshotBindingHashValid rejects missing, empty, whitespace-padded, or non-trim-stable paymentMethodRef values even if the rest of the snapshot hash is canonical
paymentCommitmentSnapshotBindingHashValid rejects payment snapshots whose paymentMethodCommitmentState is not provider_confirmed, whose paymentMethodConfirmedAt is earlier than paymentMethodSavedAt, or whose paymentMethodConfirmedAt is later than snapshot.asOf, even if the snapshot hash is canonical
paymentCommitmentSnapshotBindingHashValid rejects payment snapshots with malformed snapshotKind, blank or whitespace-padded roundId/participantId/commonGroundBudgetId, or malformed rulebookHash even if the snapshot hash is canonical
bonus fixed-point alpha/beta/gamma/stance-weight constants are single-sourced within each calculation-version scope, and Section 9.2 / Stage 5 do not redeclare those constants in later defaults blocks
PaymentCommitmentSnapshot.snapshotHash is reproducible from the canonical payment-commitment binding fields before the snapshot can affect binding final clearing or failure-bonus qualification
RoundClearingInputBundle.bundleHash is reproducible from the selected bundle id, roundId, rulebookHash, feePolicyVersion, feePolicyHash, deploymentMode, mode-compatible pilot cap fields, deploymentAuditState, deploymentAuditId, deploymentAuditHash, paymentReconciliationPathHash, optimizationPolicyHash, calculationVersion, bundleSchemaVersion, snapshotKind, sourceCutoffAt, all active component hashes, canonicalInputJsonRef, canonicalInputJsonHash, moralBucketSnapshotId, moralBucketSnapshotHash, sponsorCommitmentInputHash, and createdAt before final clearing or failure-bonus qualification
roundClearingInputBundleBindingHashValid rejects clearing bundles with blank/whitespace id or roundId, malformed rulebookHash, missing/whitespace feePolicyVersion, malformed feePolicyHash, malformed deployment mode, deployment-mode-incompatible pilot caps, malformed deploymentAuditState, malformed deploymentAuditId/deploymentAuditHash fields, malformed paymentReconciliationPathHash, malformed optimizationPolicyHash, missing/whitespace calculationVersion or bundleSchemaVersion, snapshotKind other than round_close, malformed sourceCutoffAt or createdAt, malformed component hashes, blank/whitespace moralBucketSnapshotId, malformed moralBucketSnapshotHash, blank/whitespace canonicalInputJsonRef, or malformed canonicalInputJsonHash even if bundleHash is canonical
payment, sponsor, bundle, project-eligibility, and conditional-intent timing predicates reject malformed, non-canonical, or non-UTC timestamp strings before clearing, sponsor backing, or failure-bonus qualification
round rulebookHash, sponsorPoolSourceHash, paymentReconciliationPathHash, calculationVersion, failureBonusPolicyVersion, and parametersFrozenAt are validated before lock, clearing, matching, authorization, or failure-bonus qualification
projects with unresolved externality review, malformed project identity/destination-route fields, or bucket IDs absent from the frozen bucket snapshot fail closed before clearing
failure-bonus round-open eligibility snapshots with non-clear externality review or invalid project identity/destination-route fields do not qualify
Stage 7 failure-bonus claim creation fails closed when `projectFailed !== true`, even if the failure reason, round-open eligibility snapshot, early payment snapshot, and clearing bundle otherwise pass
Stage 7 failure-bonus claim creation is idempotent under the unique claim key: repeated payable retries with the same round/project/participant/intent and matching eligibility hash do not create or overwrite a second claim, while same-key mismatched policy/context/hash rows fail closed for manual review
Section 10 and Stage 7 failure-bonus preliminary and final claim mutation lists reject claim rows with missing or malformed audit context, including non-threshold failure reasons, missing/malformed/conflicted claimant-conflict snapshot id/state/hash/source-cutoff fields, non-canonical or non-reproducible eligibility-input hashes, wrong clearing-bundle hashes, missing payment-snapshot evidence, non-provider-confirmed payment state, payment timestamps that do not satisfy `paymentMethodSavedAt <= paymentMethodConfirmedAt <= earlyFailureBonusCutoff`, missing early cutoff binding, missing or non-canonical `createdAt`, non-positive failed-qualified amount, external failed-qualified or participant-capped amount-map values that mismatch stored claim fields, or non-null denial reason
exact BigInt/fixed-point multiply-divide helpers are used for cent/bps/count products and no payout-relevant product is computed through unsafe JavaScript number multiplication
invalid budgetPeriod or budget fallbackRule values and recurring budgets with missing, non-canonical, or non-trim-stable nextCaptureAt/nextCaptureRule/recurringConsentVersion allocate zero and cannot be captured
malformed ConditionalTradeIntent authorizationState or fallbackRule values, including active `captured` or `released` intents, allocate zero and cannot expose fallback authority
Common Ground Budget / ConditionalTradeIntent fallback-rule mismatches allocate zero, cannot authorize or capture, cannot qualify for failure bonuses, and require fresh consent before reroute or carry-forward
Stage 7 fallback handling derives the executable fallback from the bundle-bound current ConditionalTradeIntent/CommonGroundBudget context and requires their fallback rules to match; undefined or ambient fallbackRule variables, wrong-row fallback metadata, mismatched budget/intent fallback rules, or malformed/missing fallback enums cancel/release and require fresh consent rather than routing or capture
pre-round sponsorBackedCentsForPreview is round-bound, pool-specific, source-hashed, timestamp-valid, integer-cent-safe, and bounded by a canonical previewAsOf timestamp before any donor-facing sponsor pool is advertised
future-dated sponsor publishedAt or backingConfirmedAt values after previewAsOf, or sponsor records after round.parametersFrozenAt, cannot support donor-facing sponsor-pool advertisement or final backing
malformed support-stance or conditional-intent counterparty-bucket arrays are treated as empty and cannot satisfy cross-view clearing
malformed round identity-threshold bps fields fail closed and cannot unlock counted dollars, match eligibility, counterparty volume, or failure bonuses
out-of-range support-stance maxAllocBps fields fail closed and allocate zero rather than being clamped to a positive user cap
malformed or out-of-range non-null project baseMatchRatioBps or bonusCapMultipleBps values resolve to zero for the affected sponsor-match calculation
weak support allocating only under caps
counterparty bucket constraints
minimum counterparty volume
validated distinct-bucket counterparty matching using the frozen reciprocal `RoundMoralBucketSnapshot`
reciprocal counterparty-bucket lookup uses the bundle-derived project.bucketId present in the frozen RoundMoralBucketSnapshot and never an undefined targetMoralBucket alias or mutable live bucket object
Stage 1 project identity/destination-route hard gates reject wrong-round, wrong-rulebook, malformed, asymmetric, post-freeze, or hash-unbound RoundMoralBucketSnapshot inputs even when a loose bucketIds array includes the project bucket
Stage 1 final sponsor-backed hard gates fail closed when the round-close RoundClearingInputBundle is missing, wrong-round, wrong-version, component-hash-invalid, sponsor-input-hash-mismatched, moral-bucket-snapshot-mismatched, or not bound by bundleHash; Stage 1 must not compute final sponsor backing from live sponsor rows
round-open ProjectRoundEligibilitySnapshot fields with truthy but non-boolean values, including strings, numbers, or objects, do not qualify for failure bonuses
projectRoundEligibilitySnapshotBindingHashValid rejects snapshot kinds other than round_open, blank or whitespace-padded round/project identifiers, malformed rulebook hashes, malformed source-cutoff or creation timestamps, and non-boolean eligibility fields even when snapshotHash is canonical-looking
conditional-intent amount and max-exposure enforcement
missing, inactive, null, rulebook-mismatched, or zero-exposure conditional intent allocates zero
section 8 router formula and Stage 2 candidate-allocation formula enforce the same consent, rulebook, intent-cap, and validated-bucket gates
no sponsor-funded, self-matching, linked-account, same-payment-method / same-payment-cluster, or same-control counterparty satisfaction
partial clearing
actual-vs-counted-vs-match-eligible accounting separation
base-match proration
base-match and bonus-match zero-denominator guards allocate zero rather than dividing by zero
Section 9 and Stage 4/5 base-match and bonus-match pool availability is zero when the eligible round-close clearing bundle is missing, invalid, wrong-round, wrong-version, component-hash-invalid, sponsor-input-hash-mismatched, or not bound by bundleHash; base/bonus match formulas must not compute final sponsor backing from live sponsor rows
base match pays each claim exactly when the backed base-match pool is sufficient and prorates only when claims exceed the backed pool
base-match aggregate claim sums and proration denominators use exact BigInt accumulation; unsafe JavaScript-number aggregate claim sums cannot determine full-payment vs proration behavior
bonus match applies project caps through mandatory deterministic capped proration until no eligible remaining cap exists and never allocates above bonusCapCents
base-match and bonus-match rounding remainders are allocated deterministically and included in the calculation hash
bonus-match capped-proration pass count and remaining-cap rule are included in the calculation hash
Stage 2 candidate allocation uses identityWeightMinForCountingBps / identityWeightMinForBonusBps and integer-cent counted/match-eligible arithmetic
Stage 4 and Stage 5 allocation pipeline formulas normalize baseMatchRatioBps and bonusCapMultipleBps before use
bonus cap enforcement
identity-weight effects
identity-threshold enforcement using basis-point fields and fail-closed validation
stance maxAllocBps is stored and applied as basis points, not percentage ratios
baseMatchRatioBps and bonusCapMultipleBps are normalized before payout formulas
per-project cap and next-capture-rule enforcement
Sybil/collusion discount
authorization expiry handling
post-clear authorization failures are removed from gross/fee/net-recipient/actual/count/match-eligible inputs and Stage 3-5 clearing/matching reruns before capture or release
wrong-amount, partial, expired-before-capture, or short-expiring authorization/custody holds are removed and recleared before capture or release
post-clear authorization reconciliation terminates monotonically within number of preliminarily payable rows plus one
AuthorizationReconciliationEvent records reproduce removed rows, exact amount checks, expiry checks, reclearing iteration hashes, uniqueness per removed row, valid reconciliation-state enum, id-bound canonical eventHash binding
AuthorizationReconciliationEvent records with blank, whitespace-padded, or missing roundId, participantId, projectId, conditionalTradeIntentId, or non-null custodyAuthorizationId cannot remove rows or enter audit bundles
authorization reconciliation hash, reconciliation-event hash, eventHash validation status, and clearing-iteration count are included in audit bundles
CustodyAuthorization rows that remain payable have valid provider metadata, custodyState === authorized, canonical authorization timing fields, exact required-vs-authorized amount coverage, capturedAmountCents === 0 before capture, expectedCaptureBy <= authExpiresAt, and non-empty trim-stable roundId / participantId / projectId values matching the current payable row
failure bonus paid only for threshold-amount, verified-supporter, active-cluster, or counterparty-volume shortfalls
failure bonus denied for review-not-approved, challenge-blocked, safety, anti-threat, destination, project-identity/destination-route, externality, conflict, sponsor, rulebook, legal/custody, identity, sybil, collusion, authorization, or consent failures
failure-bonus failureReason enum includes review_not_approved and challenge_blocked and denies them; CoalitionClearanceResult.failureReason has explicit non-threshold codes for safety_blocked, project_identity_route_blocked, fallback_rule_mismatch, missing_consent, zero_exposure, and fee_policy_blocked so these failures cannot be misclassified as threshold-family shortfalls
failure bonus qualification uses locked intent plus timestamped saved payment method, not early card authorization
failure bonus qualification requires positive conditional-intent amount, max exposure, counterparty-volume threshold, and valid non-empty counterparty buckets matching the Stage 2 intent exposure gates
failure-bonus qualification requires an active, uncanceled, rulebook-consented Common Ground Budget with valid caps, budgetPeriod, fallbackRule, and current recurring-budget consent before any claim can qualify
`early_failure_bonus_cutoff` PaymentCommitmentSnapshot must be present at earlyFailureBonusCutoff, with paymentMethodCommitmentState === provider_confirmed, for failure-bonus qualification
early-failure-bonus PaymentCommitmentSnapshot predicates bind snapshotKind, roundId, participantId, commonGroundBudgetId, rulebookHash, asOf === earlyFailureBonusCutoff, and snapshotHash before failure-bonus qualification
binding final clearing, threshold counting, counterparty-volume satisfaction, and match eligibility require a `round_close` PaymentCommitmentSnapshot with provider-confirmed payment-method evidence, chronologically valid payment-method saved/confirmed/asOf timestamps, and non-empty providerEvidenceHash at round close; shadow-only `shadowPreview*` outputs are non-binding and keep binding channels zero
round-close PaymentCommitmentSnapshot predicates bind snapshotKind, roundId, participantId, commonGroundBudgetId, rulebookHash, asOf === round.closesAt, providerEvidenceHash, and snapshotHash before final clearing
canonical hash predicates reject empty, placeholder, malformed, or unauditable providerEvidenceHash, snapshotHash, canonicalInputJsonHash, commonGroundBudgetInputHash, supportStanceInputHash, conditionalTradeIntentInputHash, identityEligibilityInputHash, paymentCommitmentSnapshotHash, projectInputHash, projectEligibilitySnapshotHash, sponsorCommitmentInputHash, moralBucketSnapshotHash, and bundleHash values
PaymentCommitmentSnapshot uniqueness is enforced for each (roundId, commonGroundBudgetId, snapshotKind)
round-close PaymentCommitmentSnapshot predicates bind snapshotKind, roundId, participantId, commonGroundBudgetId, rulebookHash, asOf === round.closesAt, and snapshotHash before final clearing
non-payment settlement previews are labeled non-binding and do not count toward clearing, matching, failure bonuses, authorization, or payout
FailureBonusClaim uniqueness, failure-bonus policy-version storage, clearing input bundle reference/hash, payout state, snapshot reference, canonical createdAt, provider-confirmed payment-method timestamps, and audit hash reproducibility
final failure-bonus payout/proration claim lists reject `pending`, `denied`, `expired`, `paid`, `credited`, already-settled approved claims, and claims with missing or non-canonical `createdAt`; include only rows with `FailureBonusClaim.claimState === "approved"`, `payoutRef == null`, and `resolvedAt == null` before computing denominators or mutating payout/proration fields, and advance successfully settled rows to `paid` or `credited` with non-empty trim-stable `payoutRef` and canonical `resolvedAt`
preliminary failure-bonus claim-field mutation lists reject terminal or settled claim rows and claims with missing or non-canonical `createdAt`; only `pending` or `approved` rows with `payoutRef == null`, `resolvedAt == null`, and canonical `createdAt` may receive new `rawBonusCents`, `participantRoundCapCents`, or `participantCappedProvisionalBonusCents` updates during payable backed-pool side-effect passes
deterministic stable ordering uses SHA-256 over canonical JSON tuple fields
PaymentCommitmentSnapshot records are used for final clearing and failure-bonus qualification instead of mutable CommonGroundBudget payment fields, including in both the Section 8 router and Stage 2 candidate-allocation pipeline
Stage 2 defines and enforces roundClearingInputBundleEligible before budgetEligible can pass
RoundClearingInputBundle freezes Common Ground Budget, support stance, conditional intent, identity eligibility, payment-commitment snapshot, sponsor-commitment input, and bucket-snapshot inputs at sourceCutoffAt === round.closesAt before final clearing
bundle-derived Common Ground Budget, support-stance, conditional-intent, and identity-eligibility rows with wrong roundId, wrong projectId, wrong participantId, or cross-budget binding fail closed and cannot allocate, count, match, satisfy counterparty volume, authorize, or qualify failure bonuses
ProjectSupportStance and ConditionalTradeIntent rows with missing, wrong, or cross-budget commonGroundBudgetId fail closed in Section 8, Stage 2, and failure-bonus qualification, even when participantId and projectId match
duplicate bundle-selected ProjectSupportStance rows or clearing-eligible ConditionalTradeIntent rows for the same (roundId, commonGroundBudgetId, projectId) fail closed and cannot allocate, expose rank order, satisfy counterparty constraints, authorize capture, match, or qualify failure bonuses
Section 8, Stage 1, Stage 2, and Section 10 enforce project/support-stance/conditional-intent uniqueness through bundle-derived row-count guards before selected rows can affect allocation, counterparty buckets, matching, authorization, or failure-bonus qualification
Section 8, Stage 2, Section 10, and Stage 7 enforce Common Ground Budget uniqueness by both (roundId, id) and (roundId, participantId) through bundle-derived row-count guards before selected budget rows can affect caps, consent, payment-snapshot lookup, remaining budget, authorization, matching, or failure-bonus qualification
Section 10 and Stage 7 key ProjectRoundEligibilitySnapshot row-count guards and selected-snapshot lookups by (roundId, projectId), not by project id alone; wrong-round project-eligibility snapshots fail closed before failure-bonus qualification
failure-bonus qualification directly rejects missing, wrong-round, missing-id, missing-bucket, or malformed bundle-derived project rows before checking round-open eligibility snapshots or conditional-intent project binding
RoundClearingInputBundle stores and verifies canonicalInputJsonHash, commonGroundBudgetInputHash, supportStanceInputHash, conditionalTradeIntentInputHash, identityEligibilityInputHash, paymentCommitmentSnapshotHash, feeInputHash, feePolicyHash, deploymentExposureInputHash, projectInputHash, projectEligibilitySnapshotHash, and sponsorCommitmentInputHash before final clearing
RoundClearingInputBundle projectInputHash freezes project caps, thresholds, bucket IDs, base-match ratios, and bonus-cap multiples before final clearing
post-round edits to mutable Common Ground Budget, support stance, conditional-intent, identity-eligibility, or project economic-parameter records do not change final clearing, threshold counting, counterparty-volume satisfaction, sponsor matching, failure bonuses, or audit bundles
RoundAuditBundle includes clearingInputBundleId, clearingInputBundleHash, canonicalInputJsonHash, feeInputHash, feePolicyHash, paymentReconciliationPathHash, deploymentExposureInputHash, deploymentAuditHash, optimizationPolicyHash, optimizationTraceId, optimizationTraceHash, projectInputHash, sponsorCommitmentInputHash, moralBucketSnapshotHash, and bonusScoreHash
RoundClearingInputBundle uniqueness is enforced for each (roundId, snapshotKind, calculationVersion)
RoundClearingInputBundle is bound to the locked round by id, roundId, rulebookHash, feePolicyVersion, feePolicyHash, deploymentMode, mode-compatible pilot cap fields, deploymentAuditState, deploymentAuditId, deploymentAuditHash, paymentReconciliationPathHash, optimizationPolicyHash, calculationVersion, bundleSchemaVersion, snapshotKind === "round_close", sourceCutoffAt === round.closesAt, bundleHash, canonicalInputJsonRef, canonicalInputJsonHash, commonGroundBudgetInputHash, supportStanceInputHash, conditionalTradeIntentInputHash, identityEligibilityInputHash, paymentCommitmentSnapshotHash, feeInputHash, deploymentExposureInputHash, projectInputHash, projectEligibilitySnapshotHash, sponsorCommitmentInputHash, successRewardInputHash, coordinationCreditInputHash, impactCertificateInputHash, moralBucketSnapshotId, moralBucketSnapshotHash, and createdAt
round lock creates a RoundMoralBucketSnapshot, blocks asymmetric moral-bucket distinctness graphs, and counterparty validation uses the frozen reciprocal bucket snapshot
RoundMoralBucketSnapshot uniqueness is enforced for each round
RoundMoralBucketSnapshot.snapshotHash is canonical and reproducible from the frozen reciprocal bucket-distinctness graph before counterparty-bucket validation can run
roundMoralBucketSnapshotBindingHashValid rejects moral-bucket snapshots with blank/whitespace roundId, malformed rulebookHash, missing/whitespace distinctnessPolicyVersion, malformed raw bucket arrays, malformed reciprocal-map keys or values, malformed asymmetricPairCount, or malformed blockedAsymmetricPairs even if snapshotHash is canonical
RoundMoralBucketSnapshot raw reciprocal-map keys exactly match the bucket ID set, reject extra/missing/whitespace keys, and the snapshot createdAt is no later than round.parametersFrozenAt before counterparty validation
RoundMoralBucketSnapshot graph-well-formedness is enforced: non-empty bucket set, reciprocal-map keys match bucket IDs, no self-distinctness, symmetric distinctness, asymmetricPairCount === 0, and blockedAsymmetricPairs is empty
RoundMoralBucketSnapshot is bound to the round by moralBucketSnapshotId, moralBucketSnapshotHash, rulebookHash, and asymmetricPairCount === 0 before any counterparty-bucket validation
failure-bonus qualification uses immutable ProjectRoundEligibilitySnapshot rather than mutable live project fields
ProjectRoundEligibilitySnapshot uniqueness is enforced for each (roundId, projectId)
ProjectRoundEligibilitySnapshot.snapshotHash is canonical and covers snapshotKind, sourceCutoffAt, roundId, projectId, rulebookHash, round-open eligibility booleans, and createdAt before failure-bonus qualification
ProjectRoundEligibilitySnapshot binding-hash validation recomputes the canonical hash and rejects snapshots whose booleans, cutoff, round, project, rulebook, or createdAt do not match the hash
ProjectRoundEligibilitySnapshot used for failure-bonus qualification has snapshotKind === "round_open", sourceCutoffAt === round.opensAt, roundId === round.id, snapshot.projectId equal to the current bundle-derived project id, and createdAt <= round.opensAt
failure-bonus aggregate payout never exceeds the backed available failureBonusPoolAvailableCents
failure-bonus raw-bonus, participant-round-cap, participant-capped-provisional, bonus-cents, payout, and proration claim-field side effects are empty and no `FailureBonusClaim.rawBonusCents`, `FailureBonusClaim.participantRoundCapCents`, `FailureBonusClaim.participantCappedProvisionalBonusCents`, `FailureBonusClaim.bonusCents`, `finalFailureBonusCents`, or `FailureBonusClaim.prorationFactorBps` mutation occurs unless `round.status === "payable"` and the backed failure-bonus pool is available through the Section 10 / Stage 7 payout-input predicate
failure-bonus qualification itself is false when final frozen sponsor backing does not fully cover the advertised failure-bonus budget, even if the budget-cap predicate passes
failure-bonus participant-round cap is applied before round-level budget proration using integer division by 10 for 10% formulas
failure-bonus participant-level failed-qualified totals and aggregate provisional payout totals use exact BigInt accumulation before cap and proration-factor calculations
failure-bonus budget cap uses integer arithmetic for the 5% sponsor-budget rule
failure-bonus advertising, qualification, and payout are disabled unless the integer 5% sponsor-budget cap predicate passes and final frozen sponsor backing fully covers the advertised failure-bonus budget
participant-round failure-bonus capping prorates only across that participant's own qualified claims
participant-round failure-bonus proration constructs an explicit participant-only raw-claim amount map and explicit per-claim stable-order-key map; it does not call undefined pick helpers, pseudo-named stableOrder assignment arguments, or ambient claimId ordering paths
participant-round and round-level failure-bonus proration behavior is locally defined before use, fails closed on malformed claim maps, malformed caps, missing stable-order keys, unsafe/fractional/negative cent inputs, or malformed claim identifiers, and Stage 7 does not call undefined approved-claim proration helpers
Stage 7 defines non-empty-string, canonical-hash, canonical-UTC-timestamp, timestamp-comparison, non-negative-cent, and exact `sumBigInt(...)` helper predicates in the Stage 7 implementation-facing code block before fallback execution, claim creation, or payout/proration code uses them
Stage 7 non-payable replay/review handling uses an explicitly defined side-effect-free output object or equivalent locally defined no-mutation path and never calls an undefined `emitFailureHandlingReplayOnly(...)` or ambient replay helper
Stage 7 failure-bonus claim creation initializes required `FailureBonusClaim` state/default fields explicitly: approved-and-unsettled for the fully qualified payout path, or pending-and-unsettled for a separate intake path that cannot enter final payout until explicit approval
Stage 7 failure-bonus claim creation is idempotent under the unique `FailureBonusClaim(roundId, projectId, participantId, conditionalTradeIntentId)` key; exact existing matching claims are no-op/replay, and mismatched existing same-key claims fail closed without overwrite or duplicate insert
Section 10 and Stage 7 failure-bonus preliminary and final mutation claim lists are audit-context-bound: claim rows with non-threshold failure reasons, missing/malformed/conflicted claimant-conflict fields, missing/corrupted or non-reproducible eligibility hashes, wrong clearing-bundle hash, malformed payment-snapshot evidence, non-provider-confirmed payment state, missing cutoff binding, non-positive failed-qualified amount, external amount-map values that mismatch stored claim fields, or non-null denial reason are rejected before denominator construction or claim-field mutation
Stage 4 defines defaultBaseMatchRatioBps locally before normalizing project base-match ratios, and undefined or substituted defaults cannot affect base-match claims
base-match and bonus-match formulas sanitize per-project claim, cap, proportional payout, and score-unit map values before BigInt conversion, sumBigInt aggregation, capped-proration, or direct payout; malformed values fail closed to 0 / 0n
stable-order rules for base-match, bonus-match, and failure-bonus rounding use explicit SHA-256 canonical-JSON tuple fields with a rounding/proration scope
counterparty validation uses projectBucketIdForCounterpartyValidation or equivalent bundle-derived project-bucket naming, not generic target-moral-bucket terminology
failure-bonus proration computes base payouts from exact target-payout numerator / total-claim denominator arithmetic, not from a truncated basis-point factor alone
Section 10 and Stage 7 reject malformed, duplicate, or wrong-round failure-bonus claim ID lists before round-level final payout proration
failure-bonus proration is deterministic when participant-capped provisional claims exceed the funded budget
failure-bonus proration factor is stored and applied in basis points, not mixed with 0..1 ratios
failedQualifiedMatchEligibleCents excludes blocked, invalid, over-cap, self-matched, linked-account, same-payment-method / same-payment-cluster, same-control, and consent-invalid intent
failedQualifiedMatchEligibleCents values that are missing, zero, negative, fractional, unsafe, NaN, string-coerced, or malformed deny failure-bonus qualification, resolve to 0 before BigInt aggregation, and cannot enter eligibility-input hashes, claim creation, claim approval, crediting, payment, or proration as qualified amounts
refund fallback
reroute fallback
carry-forward fallback
recurring-budget consent, cancellation, and active-budget allocation gating
reroute and carry-forward require compatible pre-consented rulebook, recipient, bucket, and exposure terms
stance-weighted QF raw score uses the same effective contribution in both terms
pool-specific sponsor backing for base-match, bonus-match, failure-bonus, success-reward, and fee-support budgets
sponsorBackedCentsForPreview filters current sponsor commitments by current round, matching pool type, source hash, previewAsOf, and parameter-freeze timing; sponsorBackedCentsForFinalClearing filters frozen sponsor inputs by current round and matching pool type
final sponsorBackedCentsForFinalClearing for clearing, matching, and failure bonuses is computed from frozen sponsor-commitment inputs, not mutable live SponsorCommitment rows
Section 11 final sponsor-backed summary checks and Stage 1 final sponsor-backed hard gates compute gated backing variables that are zero when the eligible round-close clearing bundle is missing or invalid
sponsorBackedCentsForFinalClearing and sponsorBackedCentsForPreview fail closed on missing sponsor-input arrays, null sponsor rows, malformed sponsor rows, malformed sourceHash values, or negative/fractional committedCents or fundedCents
sponsorBackedCentsForPreview and sponsorBackedCentsForFinalClearing exclude sponsor commitments unless both committedCents and fundedCents are non-negative safe-integer cents, regardless of commitment state
sponsorBackedCentsForPreview and sponsorBackedCentsForFinalClearing aggregate eligible commitment amounts with exact BigInt summation before safe-cent conversion; unsafe aggregate backing sums fail closed rather than relying on JavaScript-number sum precision
selected binding sponsor-paid FeeQuote aggregate fee cents cannot exceed `sponsorBackedCentsForFinalClearing("fee_support")`; selected fee quote ids must each resolve to exactly one frozen `(roundId, id)` FeeQuote row; unselected candidate FeeQuote rows do not consume fee-support backing, while overcommitted, missing, invalid-bundle, malformed, duplicate-id, duplicate-allocation-key, wrong-cutoff, unselected-bundle-wide, or wrong-round selected aggregate fee-support inputs make sponsor-paid fee support ineligible
sponsorBackedCentsForFinalClearing excludes sponsor commitments whose publishedAt or backingConfirmedAt timestamps are missing, later than round.parametersFrozenAt, or later than round.opensAt
pre-round sponsor pool advertisement uses current sponsor backing only as a provisional opening check, while final clearing uses frozen sponsor inputs
success-reward pool is pool-specific, precommitted, frozen before opening, and cannot reuse base-match, bonus-match, failure-bonus, or fee-support backing
success-reward claims are denied for non-captured, failed-authorization, review-blocked, externality-not-clear, conflict, sybil/collusion, linked-account, same-payment-method / same-payment-cluster, same-control, late-signing, or consent-invalid rows
success-reward dominance-mode displays only when maximum possible reward liability is fully backed; otherwise UX shows only “up to” or $0 reward
coordination credits are non-transferable and never affect counted dollars, match eligibility, counterparty volume, supporter counts, cluster counts, identity weight, ranking, voting, or allocation power
impact certificates mint only for captured successful net recipient-disbursed public-good funding and cannot be retroactively obtained by non-signers
sealed pledge mode hides, delays, or rounds exact live threshold and counterparty-volume status before round close
Advanced Pivotality Calculator validates contributionCents > 0, thresholdCents > 0, valueRatio >= 0, pSuccessWithoutMe and userEstimatedPDecisive in [0,1], pSuccessWithoutMe + userEstimatedPDecisive <= 1, signerOnlyRewardValue >= 0, nonDecisiveExtraFundingValueFraction >= 0, and deterministic fixed-point decimal parsing
Advanced Pivotality Calculator computes the strict-assurance formula `p0 / ((r*T/x) - 1)` when s=0 and h=0, computes the general formula `max(0, p0*(1-s-h*r)/(r*T/x+s-1))` when the denominator is positive, returns `0` when the numerator is <= 0, and returns `impossible` when the numerator is positive and the denominator is <= 0
Advanced Pivotality Calculator reports impossible-under-inputs when required_p_decisive > 1 - pSuccessWithoutMe, and compares required_p_decisive to userEstimatedPDecisive only after validation passes
Advanced Pivotality Calculator is available only on advanced explainer, shadow simulation, post-round educational analysis, or labeled project-card educational drawer surfaces; it is not a required step in the default pledge modal
Advanced Pivotality Calculator endpoint or client code does not accept roundId, projectId, participantId, commonGroundBudgetId, conditionalTradeIntentId, or any other key that would let it query live exact round progress before close
Advanced Pivotality Calculator uses only user-supplied subjective inputs before close and rejects or ignores platform-generated live threshold, live counterparty-gap, live supporter-count, live active-cluster, live success-without-me, or live decisive-probability values
Advanced Pivotality Calculator writes no Common Ground Budget, support-stance, conditional-intent, payment, payment-snapshot, allocation, match, failure-bonus, success-reward, coordination-credit, impact-certificate, or audit-bundle records
Advanced Pivotality Calculator labels results as "best by your stated values under this simplified model" and never displays "objectively best" or "the platform estimates you are pivotal"
simplified Budget -> Projects -> Review UX round-trips to the same explicit Common Ground Budget, ProjectSupportStance, ConditionalTradeIntent, payment, fee, reward/credit/certificate opt-in, fallback, visibility, and sealed-pledge records as the full advanced form
simplified UX suggestions for counterparty buckets, max exposures, fallback rules, and reward/credit/certificate opt-ins are not binding unless visible on the review screen and explicitly saved under the current rulebook hash
simplified UX default collapsed advanced drawers do not hide material payment, fee, fallback, reward, success-reward cap/proration, self-matching exclusion, sealed-progress, or failure-bonus denial disclosures before final consent
plain-language stance labels map exactly to canonical stance values: Fund this -> strong, Fund if different-view support joins -> weak, Needs review -> dissent, Skip -> abstain
plain-language mode and advanced mode produce byte-for-byte equivalent canonical records for the same user choices after canonical serialization, excluding explicitly non-persistent UI analytics
final review rejects save attempts if required details for caps, buckets, fallback, fee treatment, payment language, reward/credit/certificate opt-ins, self-match exclusions, sealed-progress rules, or failure-bonus denial categories are hidden or missing
user-facing payment copy tests reject saved-card, provider-confirmed-payment, or JIT-authorization language that says or implies charge, hold, escrow, custody, payment protection, or guaranteed future authorization before the corresponding provider/legal state exists
user-facing accounting copy tests reject “impact,” “matched,” “sent,” “counts,” “reward,” “credit,” or “certificate” claims that combine or confuse gross, fee, net-recipient, counted, match-eligible, sponsor-match, success-reward, coordination-credit, or impact-certificate channels
public-goods search-intent router sends moral-public-goods / Public Goods Fund / Common Ground Budget / CRECM / MPGF queries to the first-class Common Ground Budget result card before ordinary-offer zero-state content
public-goods search pages with zero ordinary listings but an available public-goods module, round, preview, or learning route do not show “0 listings” or “No matching listings” as the primary above-the-fold message
public-goods entry pages preserve separate lane counts for live offers, reviewed templates, worked examples, demo records, and public-goods modules, and never count demos/examples/modules as live liquidity or binding agreements
public-goods entry pages collapse no-facet / all-zero filters into the ordinary-offer drawer rather than rendering empty cause/format/filter panels in the default public-goods view
public-goods CTA hierarchy shows exactly one primary safe next action for the current signed-in / verification / deployment / round state and never bypasses sign-in, identity, payment, final-review, or gating requirements
public-facing current-product copy uses Common Ground Budget / Public Goods Fund / CRECM v1.125 labels, while old moralpublicgoods file references, older CRECM versions, and Verified Assurance Matching labels appear only in clearly marked legacy/historical drawers
public-goods search result card summary numbers keep gross, fee, net-recipient, counted, match-eligible, sponsor, reward, credit, certificate, ordinary-offer, worked-example, demo, and module quantities separate
sealed-progress public-goods entry cards hide exact live threshold satisfaction, counterparty gaps, supporter counts, active-cluster counts, and success-without-me status before close, except for clearly labeled nonbinding legacy demos or post-close aggregates
public-goods entry page has keyboard-accessible collapsed drawers, text-labeled status chips, first-result screen-reader announcement, and above-fold mobile primary CTA
contractually_committed SponsorCommitment state is treated consistently with round and project sponsor states
sponsor-pool precommitment and no phantom match display
round parameter freeze and safety freeze
conflict-review blocking for recipients, sponsors, reviewers, proposers, and fiscal hosts
QF bonus input and cap use match-eligible dollars, not actual or counted dollars
QF, entropy, diversity, dissent-pressure, collusion-discount, and adjusted-score values used for bonus allocation are computed with deterministic fixed-point or pinned decimal arithmetic and quantized score inputs are included in calculationHash / bonusScoreHash
QF raw-score calculation uses fixedSqrt, fixedSquare, fixedSum, and fixedSubtract operations rather than Math.sqrt, Math.pow, or implementation-dependent floating-point intermediates
fixed-point alpha/beta/gamma/stance-weight constants are explicitly defined by calculationVersion, and invalid reviewPressureThreshold values use a deterministic denominator guard rather than dividing by zero
Section 8 and Stage 2 expose no payout-relevant JavaScript-number stanceWeight / stanceWeights aliases; bonus scoring uses fixed-point stanceWeightFixedByStance values only
invalid cluster-share distributions produce zero diversity and invalid collusion-risk scores produce maximum risk before bonus-score calculation
ProjectSupportStance.minCounterpartyVolumeCents is ignored for final clearing; ConditionalTradeIntent.minCounterpartyVolumeCents is the only authoritative counterparty-volume threshold
bonus allocation prorates over deterministic quantized bonusScoreUnits parsed as exact integer weights, not floating-point qfAdjusted values or JavaScript number coercion
failure-bonus qualification defines identityWeightBps locally from the bundle-derived identity row before applying the round's fail-closed identityWeightMinForBonusBps threshold
duplicate bundle-derived PublicGoodProject rows for the same (roundId, id) fail closed and cannot supply bucket, economic, review, match, payout, or failure-bonus inputs
candidate-allocation stance caps use finite sanitized integer-cent values; missing maxAllocBps resolves to supportStanceMaxAllocCents and never introduces Infinity, NaN, or other non-finite sentinels
audit hash reproducibility
privacy-safe public reporting
```

---

- Round status safety-freeze / cancellation tests:
  - `draft`, `open`, `locked`, `frozen`, `reviewing`, `canceled`, missing, or malformed `MpgfRound.status` values fail closed for final binding clearing, matching, authorization, payout, failure-bonus qualification, fallback routing, and final binding audit publication; `open`, `locked`, and `reviewing` may emit only setup, internal review, or explicitly non-binding preview outputs; `released` and `closed` may replay/report/audit already-recorded final outputs but cannot initiate new authorization, capture, payout, failure-bonus, fallback, reroute, or carry-forward side effects.
  - Stage 7 fallback execution, authorization cancellation/release, reroute, carry-forward, failure-bonus claim creation, claim advancement, payout/proration field mutation, crediting, and payment side effects require `round.status === "payable"`; `cleared`, `released`, and `closed` Stage 7 paths emit only non-binding review output or replay/report/audit already-recorded failure-handling outputs.
  - A previously eligible round-close bundle cannot override a later public safety freeze or cancellation status.
- Deployment-audit prior-outcome tests:
  - prior evidence arrays must include `priorRoundOutcomeStates` with the same length and ordering as prior ids / audit-bundle hashes / deployment modes / payment path hashes.
  - failed, canceled, incident-review, missing, malformed, or unbound prior outcomes cannot unlock audit-backed capped-pilot or full deployment.
- Deployment-mode cap-compatibility tests:
  - capped pilots require positive pilot round and participant gross-exposure caps.
  - shadow and full rounds fail closed if either pilot-cap field is non-null.
- Optimization trace tests:
  - every binding Stage 3 result has exactly one current-round, current-bundle, current-optimization-policy `OptimizationRunTrace` with a stored trace id and hash.
  - ILP mode requires `optimalityStatus === "optimal"`, deterministic greedy mode requires frozen calculation-version and deployment-audit selection plus `optimalityStatus === "deterministic_greedy_selected"`, and timeout / infeasible / unknown / failed traces produce zero binding outputs.
  - optimization-input, objective-vector, stable tie-break tuple, selected-coalition, selected-allocation-row, and constraint-satisfaction hashes reproduce from canonical serialized optimization inputs and outputs.

## 19. Migration Plan

Do not delete the current MPGF pages. Introduce CRECM behind a feature flag:

```env
MPGF_MECHANISM_VERSION=crecm_v1_125
```

Add data migrations for `success_reward` sponsor commitments, contributor success-reward claims, coordination-credit ledger entries, impact-certificate claims, success-reward policy fields, and sealed-pledge mode fields. Existing rounds default to `successRewardBudgetCents = 0`, `successRewardRateBps = 0`, `successRewardDominanceMode = "off"`, and `sealedPledgeMode = "blind_until_close"` unless explicitly re-consented under the new rulebook.

No migration is required for the Advanced Pivotality Calculator unless optional aggregate analytics are stored. If analytics are stored, they must be aggregate, privacy-safe, non-binding, and must not include live round-progress inputs or donor-level moral stances. Existing UI defaults to the plain-language guided Budget → Projects → Review flow, with advanced drawers preserving the full CRECM field set and the same canonical records. Public offers/search pages that previously routed moral-public-goods queries through the ordinary offer directory must migrate to the Common Ground Budget intent card, preserve ordinary-offer lanes in a collapsed drawer, and replace current-product stale labels with CRECM v1.125 public copy while keeping legacy demos readable as historical artifacts.

Keep legacy pages readable as historical pilot artifacts.

Mark legacy mechanism as:

```text
Verified Assurance Matching pilot
```

Mark new mechanism as:

```text
Coalition-Routed Escrowed Conditional Matching v1.125
```

---

## 20. Acceptance Criteria

The implementation is complete only when:

1. A user can create a Common Ground Budget.
2. A user can mark project stances.
3. A user can create explicit cross-view conditional pledge constraints.
4. The round optimizer clears only valid cross-bucket coalitions.
5. A project cannot clear without review, identity, threshold, challenge, destination, and anti-threat gates; open challenges do not pass unless explicitly recorded as `non_blocking`.
6. Base match is deterministic and precommitted.
7. Bonus match is capped, diversity-aware, post-clear only, and uses match-eligible dollars for both score input and cap.
8. Failed projects trigger explicit fallback.
9. Payment authorization happens after clearing, not at round start.
10. Public audit bundles reproduce the final allocation.
11. No private donor-level stance is exposed without explicit permission.
12. No page claims escrow/custody unless the legal payment path actually provides it.
13. Gross captured dollars, fee dollars, net recipient-disbursed dollars, counted dollars, and match-eligible dollars are separated in calculations, public metrics, and audit bundles; fees cannot satisfy project minimum-viable or threshold amounts unless a sponsor-paid-fee rule separately funds them under the frozen rulebook.
14. A user cannot satisfy their own counterparty condition through self-matching, linked accounts, same-payment-method / same-payment-cluster accounts, or same-control entities.
15. Sponsor match is not displayed as committed unless funded, escrowed, or backed by a contractually committed auditable sponsor route.
16. Recurring Common Ground Budgets have explicit consent, a visible next-capture rule, and easy cancellation.
17. Round parameters are frozen after opening except for auditable safety freeze or cancellation.
18. Conflict review can block recipient, sponsor, reviewer, proposer, and fiscal-host conflicts before a project becomes payable, and `ConflictReview.objectType` includes `fiscal_host`.
19. Identity weights are valid integer basis-point fields in `0..10_000`; malformed, fractional, string-coerced, NaN, or out-of-range values count as zero, and minimum identity thresholds are enforced for counting and match eligibility.
20. Project-level sponsor compatibility and round-level sponsor state both gate clearing.
21. Common Ground Budgets store and enforce per-project caps, cancellation state, and visible next-capture rules.
22. Paused, expired, canceled, or consent-invalid Common Ground Budgets allocate zero gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible cents.
   - Missing Common Ground Budget rows fail closed without dereferencing budget, payment-snapshot, support-stance, identity, or conditional-intent fields.
   - Missing support-stance rows default to abstain and allocate zero; missing identity-eligibility rows are treated as zero-weight and never unlock counting, matching, counterparty volume, or failure bonuses.
   - Common Ground Budgets with invalid fallback rules allocate zero and cannot expose fallback authority.
   - Active conditional intents with `captured`, `released`, `failed`, or malformed authorization states allocate zero and cannot expose new allocation authority.
   - Unverified, sybil-review, sybil-blocked, collusion-review, or collusion-blocked identity rows never unlock counted contributions, verified supporter counts, active-cluster counts, counterparty-volume satisfaction, sponsor matching, or failure bonuses.
   - Invalid, negative, fractional, NaN, unsafe-integer, or malformed allocation caps and cent fields allocate zero, use exact BigInt/fixed-point handling, or are rejected before final clearing; they never produce negative, unsafe, or fractional allocation outputs.
   - Invalid, negative, fractional, NaN, or malformed round sponsor-budget fields count as zero and never produce negative match, bonus, failure-bonus, or payout availability outputs.
   - Malformed, fractional, NaN, string-coerced, or out-of-range `IdentityEligibility.countedWeightBps` values count as zero before counting, matching, counterparty-volume, and failure-bonus checks.
   - Round-close and early-failure-bonus payment-commitment snapshots require a non-empty `paymentMethodRef` and a binding `snapshotHash` covering all canonical payment-commitment fields.
   - Round-clearing input bundles require a binding `bundleHash` over the selected bundle id, round/rulebook identity, fee-policy version/hash, deployment mode, mode-compatible pilot caps, deployment-audit state/id/hash, payment/reconciliation-path hash, optimization-policy hash, calculation version, bundle schema version, snapshot kind, source cutoff, every active component hash, canonical input JSON reference/hash, sponsor-commitment input hash, moral-bucket snapshot id/hash, and `createdAt`.
   - Project economic terms used for thresholds and caps are valid integers before project clearing; malformed project economic terms block clearing instead of lowering thresholds.
   - Conditional-intent counterparty-volume thresholds must be positive integer cents and counterparty-bucket inputs must be valid duplicate-free trim-stable non-whitespace arrays before cross-view conditions can clear; malformed arrays are treated as empty.
   - Round lifecycle timestamps must be canonical UTC and well ordered before lock, clearing, matching, authorization, or failure-bonus qualification; `earlyFailureBonusCutoff` is no later than `reviewFreezeAt`, and `reviewFreezeAt` is strictly before `closesAt`.
   - Failure-bonus participant-round and round-level proration compute base payouts with exact target-payout numerator / total-claim denominator arithmetic; basis-point proration factors are stored only as audit/reporting metadata.
   - Section 10 and Stage 7 final failure-bonus payout use duplicate-free current-round claim-ID lists; malformed, duplicate, missing, wrong-round, wrong-policy, key-mismatched, or weakly identified claim identifiers fail closed before proration and are not silently filtered out.
   - Round rulebook hashes, sponsor-pool source hashes, calculation versions, failure-bonus policy versions, and parameter-freeze timestamps are valid before lock, clearing, matching, authorization, or failure-bonus qualification.
   - Donor-facing sponsor-pool advertisements use `sponsorBackedCentsForPreview(poolType, previewAsOf)` and require current round-bound, pool-specific, source-hashed, timestamp-valid, safe-integer-cent sponsor backing before opening; sponsor evidence after `previewAsOf` or after `round.parametersFrozenAt` cannot back advertisement.
   - Round identity-threshold bps fields fail closed when malformed, and invalid donor-counted caps become zero before counted/match-eligible calculations.
   - Out-of-range support-stance caps and project match-ratio bps fields fail closed rather than being clamped to positive allocation or sponsor-match values.
23. QF raw scores use the same stance-weighted match-eligible effective contribution in both the square-root term and the subtraction term.
   - Bonus-affecting dissent pressure is computed only from verified, sybil-clear, collusion-clear, duplicate-cluster-excluded current-round dissent rows; raw or unverified dissent may route to review but cannot reduce bonus scoring.
   - Equal-objective optimizer solutions are resolved by calculation-version-bound SHA-256 canonical-JSON tie-break tuples, not solver, database, or map iteration order.
24. Actual allocation cannot exceed the active conditional intent's `amountCents`, `maxExposureCents`, user project cap, or stance cap.
25. Counterparty satisfaction validates bucket distinctness against a hash-bound and graph-well-formed frozen reciprocal `RoundMoralBucketSnapshot`, not mutable live `MoralBucket.distinctFromBucketIds`, and excludes sponsor funds, platform funds, self-matches, linked accounts, same-payment-method / same-payment-cluster accounts, and same-control entities.
   - Reciprocal distinct-bucket lookup uses the bundle-derived `project.bucketId` after verifying that the bucket appears in the frozen `RoundMoralBucketSnapshot.bucketIds`; undefined `targetMoralBucket` aliases or mutable live bucket objects cannot determine counterparty buckets.
   - Stage 1 project identity/destination-route hard gates use the full frozen `RoundMoralBucketSnapshot` eligibility predicate — round-bound, rulebook-bound, hash-bound, graph-well-formed, and created no later than `round.parametersFrozenAt` — not a loose bucket-id membership check.
   - Stage 1 final sponsor-backed hard gates require the same full eligible round-close clearing-bundle predicate before any `sponsorBackedCentsForFinalClearing(...)` result can clear, match, authorize, pay, or appear in a final audit bundle.
   - Section 8, Section 9, Section 10, Stage 2, Stage 4, and Stage 5 use a fail-closed `min(...)` helper before any payout-relevant min operation; Section 9 and Stage 4/5 base-match pool availability, bonus-match pool availability, and bonus-cap enforcement do not use raw `Math.min(...)`. Section 8 / Stage 2 define fail-closed `intersection(...)` before validated counterparty-bucket computation.
   - The frozen moral-bucket snapshot was created no later than `round.parametersFrozenAt`, and its raw reciprocal-map keys exactly match the frozen bucket ID set with no extra, missing, duplicate, or whitespace-mutated keys.
   - Round-open ProjectRoundEligibilitySnapshot eligibility fields must be exact booleans and exactly true; truthy non-boolean values are denied before failure-bonus qualification.
   - The reusable `projectRoundEligibilitySnapshotBindingHashValid(...)` predicate rejects wrong snapshot kinds, blank or whitespace-padded round/project identifiers, malformed rulebook hashes, malformed source-cutoff or creation timestamps, and non-boolean eligibility fields before failure-bonus qualification can use the snapshot.
26. Reroute and carry-forward cannot proceed under changed rulebook, recipient, bucket, counterparty, or exposure terms without fresh user consent.
26a. Stage 7 fallback execution derives the executable fallback from the current bundle-bound ConditionalTradeIntent/CommonGroundBudget context and requires the budget and intent fallback rules to match; missing, malformed, mismatched, wrong-round, wrong-budget, wrong-project, or cross-context fallback inputs fail closed to release/cancel/no capture and require fresh consent before reroute or carry-forward, without synthesizing or executing a `release_hold` fallback rule.
27. Failure bonuses are paid only for threshold-amount, verified-supporter, active-cluster, or counterparty-volume shortfalls in otherwise eligible projects, where otherwise eligible includes valid project identity/destination-route fields and `externalityState === "clear"` at round open.
28. Failure bonuses are denied for review-not-approved, challenge-blocked, anti-threat, destination, project-identity/destination-route, externality, conflict, sponsor, rulebook, legal/custody, identity, sybil, collusion, authorization, or user-consent failures.
29. Failure-bonus qualification uses locked conditional intents plus an immutable provider-confirmed `early_failure_bonus_cutoff` `PaymentCommitmentSnapshot`, not live payment fields or early card authorization. The qualifying conditional intent must also satisfy the Stage 2 positive amount, max-exposure, counterparty-volume threshold, and non-empty counterparty-bucket gates.
   - Failure-bonus qualification also requires an active, uncanceled, rulebook-consented Common Ground Budget with valid caps, valid `budgetPeriod`, valid `fallbackRule`, current recurring-budget consent, and a fallback rule that matches the current ConditionalTradeIntent; paused, expired, canceled, recurring-consent-invalid, rulebook-mismatched, or budget/intent fallback-rule-mismatched budgets cannot qualify for failure bonuses.
30. Each failure bonus creates a unique auditable `FailureBonusClaim` record with reason code, failure-bonus policy version, failed-qualified match-eligible amount, provisional bonus, proration factor, final payout amount, eligibility-input hash, payout state, payout/credit reference, and resolved-at timestamp; successful cash payout or platform-credit issuance advances the claim out of `approved` to `paid` or `credited`.
31. Total approved failure-bonus payouts never exceed the backed available failure-bonus pool. Failure bonuses are advertised only when preview/opening backing fully covers `roundFailureBonusBudgetCents` and the integer 5% sponsor-budget cap predicate passes. Claims qualify and pay only when final frozen sponsor backing fully covers `roundFailureBonusBudgetCents` and the same cap predicate passes; over-subscribed qualified claims are prorated deterministically, and the backed available pool is `0` otherwise.
   - The failure-bonus `qualified` predicate is false, not merely zero-paid, when final frozen sponsor backing does not fully cover the advertised failure-bonus budget.
32. `failedQualifiedMatchEligibleCents` excludes blocked, invalid, over-cap, self-matched, linked-account, same-payment-method / same-payment-cluster, same-control, rulebook-mismatched, and consent-invalid intent.
32a. `failedQualifiedMatchEligibleCents` used for failure-bonus qualification, participant caps, aggregate provisional totals, eligibility-input hashes, claim creation, approval, crediting, payment, or proration is first sanitized to positive safe-integer cents; malformed, string-coerced, missing, zero, negative, fractional, unsafe, or NaN values deny qualification and resolve to `0` before `BigInt` conversion or claim storage.
32b. Aggregate base-match, bonus-score-unit, participant-level failed-qualified, and aggregate provisional failure-bonus sums are computed through a locally defined fail-closed `sumBigInt(...)` helper; malformed aggregate inputs return `0n`, and JavaScript-number aggregate sums cannot determine match, bonus, failure-bonus, proration, or audit outputs.
33. The main Section 8 router formula and the Stage 2 allocation pipeline enforce the same budget-consent, rulebook, conditional-intent, intent-cap, and validated-counter-bucket gates.
   - Bundle-derived project rows must match the current round and expose trim-stable non-empty `id` and `bucketId` values before hard gates, allocation, bucket lookup, matching, authorization, payout, or failure-bonus qualification.
   - Bundle-derived Common Ground Budget, support-stance, conditional-intent, and identity-eligibility rows must match the current round, project, participant, and budget/intent context before they can allocate, count, match, satisfy counterparty volume, authorize, or qualify failure bonuses.
   - Counterparty-volume threshold checks use the active `ConditionalTradeIntent.minCounterpartyVolumeCents`, not the deprecated `ProjectSupportStance.minCounterpartyVolumeCents` mirror.
34. Missing, inactive, null, rulebook-mismatched, or zero-exposure conditional intents allocate zero and cannot satisfy counterparty conditions.
35. Section 7 hard gates include both project-level sponsor compatibility and round-level sponsor state.
36. Failure-bonus proration is stored as basis points and applied as basis points in payout formulas and audit bundles.
37. `maxAllocBps`, `baseMatchRatioBps`, and `bonusCapMultipleBps` are normalized as basis points before allocation or payout formulas use them.
38. Base-match and bonus-match proration paths return zero when denominator claims or adjusted QF scores are zero.
39. Base match pays each claim exactly when the backed base-match pool is sufficient and prorates only when total claims exceed the backed pool.
40. Bonus match applies mandatory deterministic capped proration until no eligible remaining cap exists and never allocates above each project's `bonusCapCents`.
41. Stage 2 candidate allocation uses `identityWeightMinForCountingBps` / `identityWeightMinForBonusBps` and integer-cent counted/match-eligible arithmetic.
42. Stage 4 and Stage 5 allocation pipeline formulas normalize `baseMatchRatioBps` and `bonusCapMultipleBps` before computing match claims or caps.
43. Legal/custody blockers have an explicit `legal_custody_blocked` reason code and deny failure-bonus eligibility.
44. Base-match, bonus-match, failure-bonus, and sponsor-paid fee-support obligations are each backed by pool-specific `SponsorCommitment` totals before they are advertised, used for clearing, or included in audit bundles; counted sponsor commitments have non-empty `publishedAt` and `backingConfirmedAt` timestamps no later than `round.parametersFrozenAt` and round open.
   - Sponsor commitments counted for preview or final backing have both `committedCents` and `fundedCents` as non-negative integer cents, even if the current positive state uses only one field for payout amount.
45. `SponsorCommitment.commitmentState` uses `contractually_committed`, `funded`, or `escrowed` as the only positive backing states, and `round.sponsorPoolState` is derived from those pool-specific backing checks.
46. `sponsorBackedCentsForPreview(poolType, previewAsOf)` filters current sponsor commitments by current round, matching pool type, source hash, preview cutoff, and parameter-freeze timing before any donor-facing advertisement; `sponsorBackedCentsForFinalClearing(poolType)` filters frozen sponsor inputs from the eligible clearing bundle by current round and matching pool type before final clearing, matching, failure-bonus, or audit use. Generic `sponsorBackedCents(poolType)` reads are not used in final-clearing or advertised-schedule paths.
47. Counted contributions, match-eligible contributions, base-match payouts, bonus-match payouts, and failure-bonus payouts are integer cents with deterministic rounding and deterministic leftover-cent allocation.
48. Identity eligibility thresholds are stored and compared as basis points: `identityWeightMinForCountingBps` and `identityWeightMinForBonusBps`.
49. Failure-bonus claims are capped per participant per round before applying the round-level failure-bonus budget proration, using integer division by 10 for 10% failure-bonus formulas.
50. Participant-round failure-bonus caps prorate only across that participant's own qualified claims using deterministic claim ordering, with an explicit participant-only raw-claim amount map and per-claim stable-order-key map bound to the current round, participant, claim, and failure-bonus policy version.
51. Public contribution-state copy uses “Maximum budget” or equivalent non-authorization language until a real authorization is created after clearing.
52. `CommonGroundBudget.paymentMethodSavedAt` may be stored for UX/debugging, but failure-bonus qualification requires an immutable provider-confirmed `early_failure_bonus_cutoff` `PaymentCommitmentSnapshot` before `earlyFailureBonusCutoff`.
53. Failure-bonus qualification uses an immutable `ProjectRoundEligibilitySnapshot` with `snapshotKind === "round_open"`, `sourceCutoffAt === round.opensAt`, the current round/project IDs, and the round rulebook hash instead of mutable live project fields.
54. `review_not_approved` and `challenge_blocked` are explicit failure reason codes and deny failure-bonus eligibility.
55. The failure-bonus budget cap uses integer arithmetic for the 5% sponsor-budget rule; no floating-point percentage arithmetic is used for that cap.
56. Saved payment methods are never described or treated as payment holds, authorizations, escrow, or custody events before real post-clearing authorization or custody.
57. Binding final clearing, threshold counting, counterparty-volume satisfaction, and sponsor-match eligibility require an immutable provider-confirmed `round_close` `PaymentCommitmentSnapshot` at round close; otherwise the row is only a non-binding settlement preview, or a shadow-only `shadowPreview*` simulation row with all binding channels zero.
58. `FailureBonusClaim` stores the Common Ground Budget id, failure-bonus policy version, project-round eligibility snapshot reference/hash, early-failure-bonus cutoff, saved-payment-method timestamp, payment-method commitment state, and provider-confirmation timestamp used for qualification.
59. Deterministic stable ordering for leftover cents, capped proration, and claim ordering uses SHA-256 over canonical JSON tuple fields.
60. Post-clear authorization or custody failures remove affected rows from gross captured, fee, net recipient-disbursed, actual/gross exposure, counted, and match-eligible inputs; the mechanism reruns clearing and matching before any capture, release, payout, match, or final public report.
61. Audit bundles include authorization-reconciliation hashes, event-id-bound reconciliation event hashes, duplicate-event rejection, valid reconciliation-state validation, and clearing-iteration counts.
62. Final clearing and failure-bonus qualification use immutable `PaymentCommitmentSnapshot` records rather than mutable Common Ground Budget payment fields, including in the Section 8 router and the Stage 2 candidate-allocation pipeline.
63. Wrong-amount, partial, expired-before-capture, or short-expiring authorization/custody holds are treated as reconciliation failures; affected rows are removed and clearing/matching reruns before capture or release.
64. `AuthorizationReconciliationEvent` records reproduce removed rows, exact amount checks, expiry checks, and fixed-point clearing iterations. Their `id`, `roundId`, `participantId`, `projectId`, and `conditionalTradeIntentId` fields must be non-empty trim-stable strings, and non-null `custodyAuthorizationId` values must be non-empty trim-stable strings, before the event can remove a row or enter an audit bundle.
65. Authorization reconciliation is monotone and terminating: each failed iteration removes at least one payable row, and `clearingIteration` does not exceed the number of preliminarily payable rows plus one.
66. Moral-bucket distinctness is symmetric and frozen into a `RoundMoralBucketSnapshot` before lock; asymmetric distinctness blocks round lock and cannot satisfy counterparty conditions.
67. `RoundMoralBucketSnapshot.reciprocalDistinctFromBucketIdsByBucketId` is the only source of bucket distinctness for final clearing, counterparty validation, audit bundles, and tests, and the selected snapshot's hash must bind the frozen reciprocal distinctness graph.
68. `MpgfRound` stores both `moralBucketSnapshotId` and `moralBucketSnapshotHash`, and routing uses a `RoundMoralBucketSnapshot` whose `id`, `roundId`, `rulebookHash`, `snapshotHash`, and `asymmetricPairCount` match the locked round.
69. Round-close and early-failure-bonus `PaymentCommitmentSnapshot` predicates bind `snapshotKind`, `roundId`, `participantId`, `commonGroundBudgetId`, `rulebookHash`, `asOf`, provider-confirmed timestamps, and `snapshotHash` before they can affect clearing or failure-bonus qualification.
70. Final clearing uses a `RoundClearingInputBundle` whose `bundleHash` is stored in the audit bundle; mutable post-round edits to budgets, stances, conditional intents, identity eligibility, or project economic terms cannot change the locked round allocation.
71. `RoundClearingInputBundle` is bound to the locked round by `id`, `roundId`, `rulebookHash`, `feePolicyVersion`, `feePolicyHash`, `deploymentMode`, mode-compatible pilot cap fields, `deploymentAuditState`, `deploymentAuditId`, `deploymentAuditHash`, `paymentReconciliationPathHash`, `optimizationPolicyHash`, `calculationVersion`, `bundleSchemaVersion`, `snapshotKind === "round_close"`, `sourceCutoffAt === round.closesAt`, `bundleHash`, `canonicalInputJsonRef`, `canonicalInputJsonHash`, `commonGroundBudgetInputHash`, `supportStanceInputHash`, `conditionalTradeIntentInputHash`, `identityEligibilityInputHash`, `paymentCommitmentSnapshotHash`, `feeInputHash`, `deploymentExposureInputHash`, `projectInputHash`, `projectEligibilitySnapshotHash`, `sponsorCommitmentInputHash`, `moralBucketSnapshotId`, `moralBucketSnapshotHash`, and `createdAt` before final clearing can run.
72. Round-close `PaymentCommitmentSnapshot.asOf` equals `round.closesAt`, and early-failure-bonus `PaymentCommitmentSnapshot.asOf` equals `round.earlyFailureBonusCutoff`; earlier stale snapshots do not count.
73. `ProjectSupportStance` and `ConditionalTradeIntent` rows must bind to the current `CommonGroundBudget.id`; missing, wrong, or cross-budget `commonGroundBudgetId` rows contribute zero and cannot expose caps, counterparty buckets, fallback authority, authorization authority, or failure-bonus eligibility.
74. Stage 2 defines and enforces `roundClearingInputBundleEligible` before any budget can contribute actual, counted, or match-eligible cents.
75. `RoundClearingInputBundle` stores and verifies `canonicalInputJsonRef`, `canonicalInputJsonHash`, `commonGroundBudgetInputHash`, `supportStanceInputHash`, `conditionalTradeIntentInputHash`, `identityEligibilityInputHash`, `paymentCommitmentSnapshotHash`, `feeInputHash`, `feePolicyHash`, `deploymentExposureInputHash`, `projectInputHash`, `projectEligibilitySnapshotHash`, `sponsorCommitmentInputHash`, `moralBucketSnapshotHash`, `bundleHash`, and `optimizationPolicyHash`; the sponsor-commitment hash must match `round.sponsorPoolSourceHash`, the optimization-policy hash must match `round.optimizationPolicyHash`, and the fee/deployment/audit/path fields must match the locked round before final clearing.
76. Final base-match, bonus-match, failure-bonus, success-reward, and fee-support calculations use `sponsorBackedCentsForFinalClearing(poolType)` over frozen sponsor-commitment inputs from the clearing bundle, not mutable live `SponsorCommitment` rows.
77. Round-close and early-failure-bonus `PaymentCommitmentSnapshot` predicates require canonical `providerEvidenceHash` and `snapshotHash` values before the snapshot can affect clearing or payout eligibility.
78. Failure-bonus `eligibilityInputsHash` includes the eligible `RoundClearingInputBundle.bundleHash`, the relevant `PaymentCommitmentSnapshot.snapshotHash`, the `ProjectRoundEligibilitySnapshot.snapshotHash`, the locally bound round/project/participant/Common Ground Budget identifiers, the early-failure-bonus cutoff, the failure reason, and `failedQualifiedMatchEligibleCents`.
79. Stage 7 failure-bonus claim creation uses the same full Section 10 `qualified` predicate, including row-count uniqueness guards for project, Common Ground Budget, identity, payment-snapshot, project-eligibility-snapshot, support-stance, and conditional-intent inputs; a weaker project-eligibility, bundle-only, or hash-format-only check cannot create, approve, credit, pay, or advance a failure-bonus claim.
80. Section 10 and Stage 7 failure-bonus final sponsor-backed calculations return `0` unless `failureBonusBundleEligible` is true before `sponsorBackedCentsForFinalClearing("failure_bonus")` is used.
81. Section 9 and Stage 4/5 base-match and bonus-match pool availability return `0` unless `roundClearingInputBundleEligible` is true before `sponsorBackedCentsForFinalClearing("base_match")` or `sponsorBackedCentsForFinalClearing("bonus_match")` is used.
81a. Section 11 final sponsor-backed summary checks and Stage 1 final sponsor-backed hard gates use gated backing variables that are `0` unless the eligible round-close clearing bundle predicate passes; raw `sponsorBackedCentsForFinalClearing(...)` comparisons cannot substitute for the gated variables.
81b. Section 7's canonical hard-gate list uses the same gated Stage 1 sponsor-backed variables as Stage 1 implementation pseudocode.
81c. Wrong-round, wrong-project, wrong-participant, or cross-budget `ProjectSupportStance` rows default to abstain, zero caps, and empty counterparty-bucket exposure in both Section 8 and Stage 2 formulas.
82. Payment snapshots, identity-eligibility rows, round moral-bucket snapshots, round-close clearing input bundles, project-round eligibility snapshots, bundle-selected support-stance rows, clearing-eligible conditional-intent rows, and failure-bonus claims enforce the uniqueness constraints specified in Section 12.1.
83. Remaining participant-budget and project-requested-cap values used in candidate allocation are deterministic allocator state derived from the eligible clearing bundle, not live user or project records.
84. `RoundAuditBundle` exposes the clearing bundle hash and its direct component hashes / trace identifiers: `canonicalInputJsonHash`, `feeInputHash`, `feePolicyHash`, `deploymentExposureInputHash`, `paymentReconciliationPathHash`, `deploymentAuditHash`, `optimizationPolicyHash`, `optimizationTraceId`, `optimizationTraceHash`, `projectInputHash`, `sponsorCommitmentInputHash`, and `moralBucketSnapshotHash`.
85. Final hard gates, base match, bonus match, failure-bonus availability, success-reward availability, and fee-support availability use `sponsorBackedCentsForFinalClearing(poolType)`, not ambiguous live sponsor-backed calculations.
86. Pre-round sponsor-pool advertisement uses current sponsor records only as a provisional opening check; final clearing, matching, failure-bonus availability, and payout plans use frozen sponsor inputs from the eligible clearing bundle.
87. `sponsorBackedCentsForFinalClearing(poolType)` excludes sponsor commitments whose `sourceHash` is not canonical or whose `committedCents` / `fundedCents` are negative, fractional, NaN, or otherwise invalid.
88. Failure-bonus qualification computes `identityWeightBps` locally from the bundle-derived identity row before applying the round's fail-closed `identityWeightMinForBonusBps` qualification threshold.
89. Bonus allocation uses deterministic fixed-point or pinned-decimal QF/diversity arithmetic, stores quantized score inputs, and includes them in the calculation hash and `bonusScoreHash`.
90. Bonus-match proration uses quantized `bonusScoreUnits` for all proportional and capped-proration passes; unrounded floating-point `qfAdjusted` values are reporting aliases only and cannot determine sponsor payout cents.
91. QF raw scores, square roots, entropy/diversity factors, dissent pressure, collusion discounts, adjusted scores, and bonus-score units are computed with fixed-point / pinned-decimal operations specified by the calculation version; `Math.sqrt`, `Math.pow`, and implementation-dependent floating-point intermediates cannot determine payout cents.
92. Stored `bonusScoreUnits` are canonical non-negative integer strings, but proportional and capped bonus-proration arithmetic parses them into exact integer weights before computing cent payouts.
93. `ProjectRoundEligibilitySnapshot.snapshotHash` is canonical and covers the fields used for round-open eligibility before any failure-bonus claim can qualify.
94. Fixed-point alpha/beta/gamma/stance-weight constants are explicit calculation-version inputs, invalid review-pressure denominators use a deterministic guard rather than division by zero, invalid cluster-share distributions produce zero diversity, and invalid collusion-risk scores produce maximum risk before bonus scoring.
94A. Bonus-scoring fixed-point alpha/beta/gamma/stance-weight constants are single-sourced in each calculation-version scope; Section 9.2 and Stage 5 do not redeclare the same constants or expose duplicate `const` names in implementation-facing code blocks.
94B. `paymentCommitmentSnapshotBindingHashValid(...)` rejects malformed `snapshotKind`, blank or whitespace-padded `roundId` / `participantId` / `commonGroundBudgetId`, and malformed `rulebookHash` before a payment snapshot can affect clearing, matching, authorization, or failure-bonus qualification.
95. `ProjectSupportStance.minCounterpartyVolumeCents` is not authoritative for final clearing; `ConditionalTradeIntent.minCounterpartyVolumeCents` is the only counterparty-volume threshold used by the router.
96. Projects under externality review, projects with malformed good/destination/bucket fields, or projects whose bucket is absent from the frozen bucket snapshot cannot clear, become payable, receive sponsor matching, or qualify for failure bonuses.
97. All cent, count, basis-point, and score-unit multiply-divide calculations use exact BigInt or pinned fixed-point helpers before division or comparison; unsafe JavaScript number products are rejected or handled exactly before payout.
98. The payment UX and API distinguish escrow/custody from just-in-time authorization/capture and never label JIT authorization as escrow, custody, funds held, or payment protection.
99. Bundle-derived PublicGoodProject rows are unique per `(roundId, id)` inside the round-close input bundle; duplicate project rows fail closed and cannot affect hard gates, allocation, matching, authorization, payout, or failure-bonus qualification.
100. Section 8 and Stage 2 stance-cap fallback logic uses only finite sanitized integer-cent values; absent `maxAllocBps` resolves to `supportStanceMaxAllocCents`, not `Infinity` or another non-finite sentinel.
101. Section 8, Stage 2, Section 10, and Stage 7 use formula-level row-count guards for `CommonGroundBudget`, `ProjectSupportStance`, `ConditionalTradeIntent`, `IdentityEligibility`, round-close and early-cutoff `PaymentCommitmentSnapshot`, and round-open `ProjectRoundEligibilitySnapshot` rows; duplicates fail closed before the selected row can affect allocation, matching, payment commitment, authorization, or failure-bonus qualification. Common Ground Budget row-count guards enforce both `(roundId, id)` and `(roundId, participantId)` uniqueness. Payment-snapshot row-count guards and selected-snapshot lookups are keyed by `(roundId, commonGroundBudgetId, snapshotKind)`, and wrong-round payment snapshots fail closed. Project-round eligibility snapshot row-count guards and selected-snapshot lookups are keyed by `(roundId, projectId)`, support-stance and clearing-eligible conditional-intent row-count guards are keyed by `(roundId, commonGroundBudgetId, projectId)`, and wrong-round project-eligibility, support-stance, or conditional-intent rows fail closed.
102. Section 8 and Stage 2 read participant remaining budget and project remaining requested cap only from bundle-derived allocator-state maps keyed by `(roundId, participantId)` and `(roundId, projectId)`; wrong-round or missing allocator-state rows resolve to zero before actual allocation.
103. Preview and final sponsor-backed pool availability is computed through exact `BigInt` accumulation over eligible sponsor commitments before safe-cent conversion; unsafe aggregate sponsor-backed sums fail closed instead of relying on JavaScript-number `sum(...)` precision.
104. Base-match aggregate claim sums and proration denominators are computed through exact `BigInt` accumulation before comparing total claims with the backed base-match pool; unsafe aggregate claim sums cannot decide whether claims are fully paid or prorated.
105. Failure-bonus participant-level failed-qualified totals and aggregate provisional payout totals are computed through exact `BigInt` accumulation before participant caps, proration-factor calculation, or final failure-bonus payout; unsafe aggregate failure-bonus sums cannot determine payout proration.
106. Stage 7 does not create, approve, credit, pay, or advance a `FailureBonusClaim` unless the full Section 10 `qualified` predicate returns true for the same frozen bundle-derived inputs and selected snapshots, and the explicit `projectFailed` input is true.
107. Stage 7 never executes refund, reroute, carry-forward, or release-hold behavior from an undefined, ambient, or synthetic fallback rule; fallback execution is derived from bound current budget/intent rows and fails closed to no capture plus fresh consent when those rows are unavailable, malformed, or have mismatched fallback rules.
108. Stage 7 fallback execution proves exactly one eligible bundle-derived project row, Common Ground Budget row, and ConditionalTradeIntent row, plus matching budget/intent fallback rules, before using a fallback rule; otherwise it releases/cancels/no-captures and requires fresh consent before reroute or carry-forward. The fail-closed path must not set `stage7ExecutableFallbackRule` to `release_hold` or execute the user-selected `release_hold` branch.
109. Stage 7 computes `FailureBonusClaim.eligibilityInputsHash` locally from the eligible clearing bundle, round-open project-eligibility snapshot, early payment snapshot, conditional-intent id, locally bound round/project/participant/Common Ground Budget identifiers, the failure-bonus policy version, the early-failure-bonus cutoff, project-failure fields, and failed-qualified amount; claim creation never uses an undefined, policy-version-omitting, or ambient eligibility hash.
109A. Participant-round and round-level failure-bonus proration use locally defined deterministic behavior over sanitized claim maps, non-negative safe-integer caps, exact `sumBigInt(...)`, basis-point factors, and canonical stable-order keys; Stage 7 does not call undefined approved-claim proration helpers to determine final failure-bonus payouts.
109B. Stage 4 defines `defaultBaseMatchRatioBps` locally before using it in `normalizeMatchBps(...)`; an undefined or unreviewed base-match default cannot determine base-match claims.
109C. Stage 7 non-payable replay/review handling is explicitly side-effect-free: it must not call undefined or ambient replay helpers such as `emitFailureHandlingReplayOnly(...)`, and it must not mutate fallback, authorization, failure-bonus, payout, credit, proration, or claim rows when `round.status !== "payable"`.
110. `roundMoralBucketSnapshotBindingHashValid(...)` fails closed on malformed moral-bucket snapshot identity or raw graph fields before canonicalization; a canonical-looking snapshot hash alone cannot let a malformed moral-bucket snapshot affect counterparty validation.
111. `roundClearingInputBundleBindingHashValid(...)` fails closed on malformed clearing-bundle identity, rulebook hash, fee-policy version/hash, deployment mode, pilot cap fields, deployment-audit state/id/hash, payment/reconciliation-path hash, optimization-policy hash, calculation version, bundle schema version, snapshot kind, source-cutoff timestamp, creation timestamp, active component hashes, moral-bucket snapshot id/hash, canonical input ref/hash, or sponsor-input binding before canonicalization; a canonical-looking bundle hash alone cannot let a malformed clearing bundle affect final clearing, matching, authorization, failure-bonus qualification, or audit reporting.
112. Payable `CustodyAuthorization` rows expose non-empty trim-stable `id`, `roundId`, `participantId`, `projectId`, and `providerRef` values, and their round / participant / project identifiers match the current payable row; wrong-row or weakly identified custody/authorization records are removed and recleared before capture or release.
---
115. Round status is a binding fail-closed gate with separate result/replay and side-effect statuses: final binding result calculation, deterministic replay, failure-bonus qualification review, and audit outputs may read `cleared`, `payable`, `released`, or `closed`; new authorization attempts require `cleared`; Stage 7 fallback execution, authorization cancellation/release, reroute, carry-forward, failure-bonus claim creation, claim advancement, raw-bonus / participant-cap / participant-capped-provisional / bonus-cents / payout / proration field mutation, crediting, payment, fallback routing, and all capture/release/payment side effects require `payable`; all failure-bonus claim-field, payout, proration, crediting, and payment mutations additionally require positive backed failure-bonus-pool availability; `released` and `closed` may replay/report/audit already-recorded final outputs only. `draft`, `open`, `locked`, `frozen`, `reviewing`, `canceled`, missing, or malformed statuses cannot produce final binding outputs even if all other hashes and payment/sponsor inputs are valid. `open`, `locked`, and `reviewing` status rounds may produce only setup, internal review, or explicitly non-binding preview outputs.
115A. Final Section 10 and Stage 7 failure-bonus payout/proration claim lists are unsettled-approved-claim-only: rows with `claimState` equal to `pending`, `denied`, `expired`, `paid`, or `credited`, or approved rows with non-null `payoutRef` or `resolvedAt`, cannot enter payout denominators, cannot receive new final payout/proration field mutations, and cannot be paid or credited again. Successful cash payout or platform-credit issuance updates `claimState` to `paid` or `credited`, sets a non-empty trim-stable `payoutRef`, and sets a canonical `resolvedAt`.
115B. Section 10 preliminary failure-bonus claim-field mutation lists are unsettled-non-terminal-only: rows with `claimState` equal to `denied`, `expired`, `paid`, or `credited`, or any row with non-null `payoutRef` or `resolvedAt`, cannot receive new `rawBonusCents`, `participantRoundCapCents`, or `participantCappedProvisionalBonusCents` updates. Pending and approved rows may receive preliminary claim-field calculations only under the existing current-round identity, payable-status, and positive backed-pool predicates; final payout remains approved-and-unsettled only.
115C. Stage 7 failure-bonus claim creation initializes all state and settlement/default fields explicitly. Fully qualified payout-path claims are created as approved-and-unsettled with null `denialReason`, null `payoutRef`, null `resolvedAt`, canonical `createdAt`, zeroed raw/cap/provisional/bonus cent fields, and `prorationFactorBps === 10_000` until payable backed-pool calculation updates them; intake-only claims are pending-and-unsettled and cannot enter final payout until explicit approval.
115D. Stage 7 failure-bonus claim creation is idempotent under `FailureBonusClaim(roundId, projectId, participantId, conditionalTradeIntentId)`: no existing matching claim means create once, an exact same-key context/policy/eligibility-hash match means no-op/replay without overwrite, and a same-key mismatch fails closed for manual review without duplicate insert or terminal-claim overwrite.
115E. Failure-bonus claim audit-context predicates for Section 10 and Stage 7 require the claim's stored payment timestamps to satisfy `paymentMethodSavedAt <= paymentMethodConfirmedAt <= earlyFailureBonusCutoff`, and require `earlyFailureBonusCutoff === round.earlyFailureBonusCutoff`, before the claim can enter preliminary raw/cap/provisional mutation lists or final payout/proration denominators. Claims with provider confirmation after the stored/round early cutoff are replay/review-only and cannot receive new claim-field, payout, crediting, payment, or proration mutations.
115F. Failure-bonus claim audit-context predicates for Section 10 and Stage 7 require `FailureBonusClaim.createdAt` to be a canonical UTC timestamp before the claim can enter preliminary raw/cap/provisional mutation lists or final payout/proration denominators. Claims with missing, malformed, or non-canonical `createdAt` are replay/review-only and cannot receive new claim-field, payout, crediting, payment, or proration mutations.
115G. Section 10 and Stage 7 failure-bonus mutation and payout lists admit only claims whose stored claimant-conflict snapshot fields prove `no_conflict` at the round-close source cutoff, whose `eligibilityInputsHash` recomputes from the stored claim context, and whose external failed-qualified or participant-capped amount maps are absent or exactly equal to the corresponding stored `FailureBonusClaim` fields.
116. Deployment audits bind passed prior evidence outcomes; failed, canceled, unresolved incident-review, malformed, or missing prior outcomes cannot unlock capped-pilot or full deployment.
117. Pilot cap fields are mode-compatible: positive only for `capped_pilot`, null for `shadow` and `full`.
118. Stage 3 emits a unique id/hash-bound `OptimizationRunTrace`; binding ILP allocations require an optimal trace, binding deterministic-greedy allocations require the frozen greedy calculation version plus a deterministic-greedy-selected trace, and every trace binds the current `optimizationPolicyHash`, selected allocation rows, and constraint-satisfaction hash.

116. Contributor-only success rewards are issued only from a fully backed `success_reward` sponsor pool, never from recipient funds, base match, bonus match, failure bonus, or fee support.
117. Success-reward dominance-mode UX is displayed only when the frozen sponsor pool backs maximum possible reward liability; otherwise only an explicitly capped “up to” reward estimate or no reward is displayed.
118. Coordination credits and impact certificates are minted only for captured successful contribution rows and cannot be retroactively obtained by non-signers or late signers.
119. Coordination credits do not affect moral reputation, identity weight, counted dollars, match eligibility, counterparty volume, supporter counts, cluster counts, project ranking, voting, or allocation power.
120. Sealed-pledge mode prevents exact live threshold or counterparty-volume status from being exposed before close except to authorized operators under privacy/audit controls; public exact aggregates appear only after close in final reports or audit bundles.
121. Advanced Pivotality Calculator is implemented only as non-binding educational tooling on allowed surfaces, validates all inputs, computes the strict and generalized formulas deterministically, uses no live exact round-progress data before close, produces no side effects, and labels outputs as simplified model results rather than platform pivotality estimates.
122. Simplified public UX lets a user complete the mechanism through Budget → Projects → Review while preserving explicit consent and data parity with the advanced CRECM records; suggested defaults are not binding unless shown on the review screen and explicitly saved.
123. Plain-language guided mode maps every default label one-to-one to canonical CRECM records and states; no plain label can introduce new clearing, matching, payment, reward, credit, certificate, fallback, or audit semantics.
124. Final review is the consent boundary for simple mode and must disclose all binding caps, conditions, buckets, fallback rules, payment language, fee treatment, reward/credit/certificate opt-ins, self-matching exclusions, sealed-progress behavior, failure-bonus denial categories, and rulebook hash before save.
125. Receipts and contribution-state screens show a plain-language summary plus the separated gross/fee/net-recipient/actual/count/match-eligible and sponsor/reward/credit/certificate proof ledger; summary text cannot combine accounting channels without explicit labels.
126. Payment, escrow/custody, matching, reward, credit, certificate, and impact copy is validated against the recorded CRECM state before publication in primary UI, emails, receipts, public pages, or audit-adjacent summaries.
127. A user searching or filtering for moral public goods sees a first-class Common Ground Budget / Public Goods Fund result card before any ordinary-offer “0 listings” state.
128. The offers page preserves separate live-offer, reviewed-template, worked-example, demo-record, and public-goods-module counts while presenting one primary public-goods task card and one safe next-action CTA.
129. Empty or all-zero ordinary-offer filters do not appear in the default moral-public-goods search state; they remain accessible only in a collapsed ordinary-offer filters drawer.
130. Current-product public pages use Common Ground Budget / Public Goods Fund / CRECM v1.125 copy; legacy Verified Assurance Matching or older spec-version labels are visible only as marked historical/demo content.
131. Public-goods entry pages and search cards comply with sealed-progress, no-escrow-unless-true, separated-accounting, no-lane-merging, accessibility, mobile, and final-review-consent constraints.

## 21. Do Not Build

Do **not** build:

- pure assurance crowdfunding,
- public UX, API copy, or audit terminology that labels saved payment methods or just-in-time authorizations as escrow, custody, funds held, or payment protection without a legally valid custody/escrow/payment partner,
- clearing, matching, authorizing, or paying projects with `externalityState` equal to `review`, `blocked`, malformed, or anything other than `clear`,
- clearing, matching, authorizing, or paying projects with invalid `goodType`, invalid `destinationType`, empty or non-trim-stable `bucketId` / `destinationRef`, or a project bucket absent from the frozen round moral-bucket snapshot,
- Stage 1 project identity/destination-route hard gates that use loose bucket-id membership against a non-null `RoundMoralBucketSnapshot` instead of the full round-bound, rulebook-bound, hash-bound, graph-well-formed, parameter-frozen snapshot predicate,
- Stage 1 final sponsor-backed hard gates that call `sponsorBackedCentsForFinalClearing(...)` without first requiring an eligible round-close clearing bundle with binding hash, component hashes, sponsor-input hash binding, and moral-bucket snapshot id/hash binding,
- Section 11 final sponsor-backed summary checks or Stage 1 final hard-gate checks that compare raw `sponsorBackedCentsForFinalClearing(...)` results instead of gated `final*BackingCents` / `stageOne*BackingCents` variables that are zero when the eligible bundle is missing or invalid,
- Section 7 canonical hard-gate lists that display raw final sponsor-backed comparisons instead of gated Stage 1 backing variables,
- support-stance-derived stance, cap, rank-order, or counterparty-bucket inputs that remain readable when the `ProjectSupportStance` row is missing, wrong-round, wrong-project, wrong-participant, or bound to another Common Ground Budget,
- duplicate bundle-selected `ProjectSupportStance` rows or clearing-eligible `ConditionalTradeIntent` rows for the same `(roundId, commonGroundBudgetId, projectId)` that are resolved by arbitrary row order rather than failing closed,
- duplicate bundle-derived `PublicGoodProject` rows for the same `(roundId, id)` that are resolved by arbitrary row order rather than failing closed,
- Section 8, Stage 1, Stage 2, or Section 10 formulas that rely only on database uniqueness or selected-row lookup without bundle-derived row-count guards for project, support-stance, or conditional-intent uniqueness,
- Section 8, Stage 2, Section 10, or Stage 7 formulas that rely only on database uniqueness or selected-row lookup without bundle-derived row-count guards for Common Ground Budget rows, identity-eligibility rows, round-close or early-cutoff payment snapshots, or round-open project-eligibility snapshots, including Common Ground Budget guards that fail to enforce both `(roundId, id)` and `(roundId, participantId)` uniqueness, or support-stance / clearing-eligible conditional-intent guards that omit `(roundId, commonGroundBudgetId, projectId)` keying,
- payment-snapshot row-count guards or selected-snapshot lookups keyed only by Common Ground Budget and snapshot kind, without the current round id,
- project-round eligibility snapshot selected-snapshot lookups keyed only by project id, without the current round id,
- Stage 7 failure-bonus claim creation that uses project eligibility plus bundle eligibility, omits the explicit `projectFailed` input, or uses any weaker helper instead of the full Section 10 `qualified` predicate over the same frozen inputs,
- participant remaining-budget or project remaining-cap lookups keyed only by participant id or project id instead of `(roundId, participantId)` and `(roundId, projectId)`,
- candidate-allocation stance-cap code that uses `Infinity`, `NaN`, or any other non-finite sentinel instead of finite sanitized integer-cent caps,
- failure-bonus qualification paths that check a round-open eligibility snapshot or conditional-intent project binding before directly proving that the bundle-derived project row matches the current round and exposes trim-stable non-empty `id` and `bucketId`,
- Section 10 or Stage 7 failure-bonus final sponsor-backed calculations that call or trust `sponsorBackedCentsForFinalClearing("failure_bonus")` when the eligible round-close clearing bundle is missing or invalid,
- Section 9 or Stage 4/5 base-match or bonus-match pool-availability calculations that call or trust `sponsorBackedCentsForFinalClearing("base_match")` or `sponsorBackedCentsForFinalClearing("bonus_match")` when the eligible round-close clearing bundle is missing or invalid,
- failure-bonus qualification that treats truthy non-boolean round-open eligibility snapshot fields as passing instead of requiring exact `true` booleans,
- payout, matching, failure-bonus, or threshold formulas that multiply safe JavaScript numbers and then divide when exact BigInt/fixed-point multiply-divide helpers are required to preserve safe-integer arithmetic,
- binding project clearing, matching, authorization, payout, or failure-bonus qualification that relies only on broad review approval while omitting the separate baselineIntegrityState / baselineConfidenceState / actionEvidenceState hard gate,
- failure-bonus claimant-conflict snapshots that omit snapshot kind, rulebook hash, failure-bonus policy version, Common Ground Budget id, conditional-intent id, source cutoff, selected snapshot id on the claim, or current-round/current-policy/current-intent binding checks,
- round-clearing-bundle integrity prose, tests, or audit bundles that list the old component-hash set and omit feePolicyHash, feeInputHash, or deploymentExposureInputHash,
- pure quadratic funding,
- pure matching,
- pure ECM without Common Ground Budget routing,
- pure VCQA without explicit cross-view conditional moral-trade constraints,
- a mechanism that relies mainly on social norms,
- political campaign trades,
- lifestyle or behavior-change trades,
- anything that creates an incentive to threaten harm to obtain payment,
- phantom or merely aspirational sponsor matching,
- clearing, payable, or release flows that treat ordinary open challenges as non-blocking,
- donor-facing base-match, bonus-match, failure-bonus, or sponsor-paid fee-support commitments that are not backed by corresponding pool-specific `SponsorCommitment` totals,
- manually asserted round-level sponsor state that bypasses pool-specific sponsor-backing checks,
- sponsor-backed calculations that count sponsor commitments from the wrong round or wrong pool type,
- preview or final sponsor-backed pool sums that aggregate eligible commitments with JavaScript-number `sum(...)` instead of exact `BigInt` accumulation followed by safe-cent conversion or an explicitly audited exact-integer comparison path,
- ambiguous `signed` sponsor-commitment states where the mechanism requires `contractually_committed`, `funded`, or `escrowed`,
- conflict-review data models that omit fiscal-host conflicts,
- sponsor-funded, platform-funded, same-bucket, self-matching, linked-account, same-payment-method / same-payment-cluster, or same-control matching that satisfies a user's counterparty conditions,
- allocating more than the user's active conditional-intent amount or max exposure,
- allocation formulas that omit rulebook, conditional-intent, intent-cap, or validated distinct-bucket gates,
- rerouting or carrying forward funds under changed rulebook, recipient, bucket, counterparty, or exposure terms without fresh consent,
- failure-bonus payouts that exceed the backed available failure-bonus pool,
- failure-bonus designs without a per-participant per-round cap,
- participant-round failure-bonus capping that prorates across other participants' claims instead of only that participant's own qualified claims,
- participant-round failure-bonus proration formulas that call undefined `pick(...)` helpers, use pseudo-named assignment arguments such as `stableOrder = ...`, rely on ambient claim identifiers for ordering, or omit per-claim stable-order keys bound to the current round / participant / claim / failure-bonus policy version,
- participant-round or round-level failure-bonus proration paths that call undefined proration helpers such as `prorateParticipantClaimsDeterministicallyWithin(...)` or `prorateApprovedFailureBonusClaimsWithin(...)`, use malformed claim maps or caps, silently filter malformed/missing/wrong-round/wrong-policy/key-mismatched/weakly identified claim IDs instead of failing closed as an all-or-nothing claim list, omit canonical stable-order keys, bypass `sumBigInt(...)` / exact target-payout proration, or allow unsafe/fractional/negative values to determine claim approval, crediting, payment, proration, or audit outputs,
- Stage 4 base-match formulas that call `normalizeMatchBps(project.baseMatchRatioBps, defaultBaseMatchRatioBps)` before defining `defaultBaseMatchRatioBps` in that implementation-facing stage,
- matching formulas that convert raw per-project base-match claims, bonus-score-unit strings, bonus caps, or proportional bonus values with `BigInt(...)`, `sumBigInt(...)`, direct payout, or capped-proration before local fail-closed sanitization,
- stable-order rules for payout remainders that use informal ascending-hash or generic stable-order prose, omit explicit canonical-JSON tuple fields, or omit a rounding/proration scope,
- counterparty-validation code or prose that preserves generic `targetMoralBucketId` / target moral bucket lookup terminology instead of naming the bundle-derived project bucket used for reciprocal distinct-bucket lookup,
- failure-bonus proration formulas that compute final payout cents solely from a truncated basis-point factor, underallocate the funded target payout when the truncation deficit exceeds the claim count, or skip duplicate-free current-round claim-ID validation before final proration,
- verified-supporter or active-cluster counts that treat dust rows below the frozen `supporterCountMinNetPublicGoodCents` net public-good-credit floor as breadth contributions, accept a malformed or below-100-cent supporter floor instead of the 100-cent default,
- fee-inclusive gross captured dollars that satisfy project minimum-viable amounts, project threshold amounts, counterparty volume, counted contribution, match-eligible contribution, or sponsor-match claims when those cents are actually platform, payment, fiscal-host, or routing fees rather than net recipient-disbursed public-good dollars,
- fee quotes that are selected for positive allocations or sponsor-paid fee-support aggregation without exact `(roundId, id)` and `(roundId, commonGroundBudgetId, projectId, conditionalTradeIntentId)` uniqueness, without `FeeQuote.feePolicyHash === round.feePolicyHash`, without `feePolicyHash` inside `FeeQuote.quoteHash`, with `feePayer: "waived"` and positive `feeCents`, or without `feeInputHash` / `feePolicyHash` exposed in the audit bundle,
- bonus-affecting dissent-pressure calculations that count unverified, sybil-review, collusion-review, blocked, duplicate-cluster, wrong-round, or malformed dissent rows, or that let raw dissent notes reduce sponsor bonus payouts without verified-clear identity gating,
- optimizer tie-breaking that depends on solver arbitrary order, database insertion order, object-key order, map iteration order, or unspecified greedy traversal instead of calculation-version-bound SHA-256 canonical-JSON tie-break tuples,
- public UX that describes a budget as authorized before the payment provider or custody route has actually authorized funds,
- public UX or payment logic that treats a saved or provider-confirmed payment method as a hold, authorization, escrow, custody event, or guarantee of future authorization before real post-clearing authorization or custody,
- binding final clearing, threshold counting, counterparty-volume satisfaction, or sponsor-match eligibility from a budget without an immutable provider-confirmed `round_close` `PaymentCommitmentSnapshot` at round close, except for shadow-only `shadowPreview*` simulation outputs that write no binding channels,
- ProjectSupportStance or ConditionalTradeIntent rows without the current CommonGroundBudget.id, or with a wrong/cross-budget commonGroundBudgetId, exposing allocation caps, counterparty buckets, fallback authority, authorization authority, or failure-bonus eligibility,
- hard-gate, allocation, counterparty-bucket, matching, authorization, payout, or failure-bonus paths that dereference or substitute a project row before proving that the bundle-derived project row matches the current round and exposes trim-stable non-empty `id` and `bucketId`,
- final clearing that uses a generic counterparty-volume threshold source or the deprecated `ProjectSupportStance.minCounterpartyVolumeCents` mirror instead of `ConditionalTradeIntent.minCounterpartyVolumeCents`,
- failure-bonus claim creation or advancement gated only by a clearing-bundle hash-format check instead of the full `failureBonusBundleEligible` predicate and binding-hash/component-hash checks,
- settlement previews that are not clearly labeled non-binding when payment commitment is missing,
- treating a merely saved but provider-unconfirmed payment method as sufficient for final clearing, sponsor-match eligibility, or failure-bonus qualification,
- capture, release, payout, matching, or final public reporting based on rows whose post-clear authorization or custody hold failed,
- capture, release, payout, matching, or final public reporting based on partial, wrong-amount, expired-before-capture, or short-expiring authorization/custody holds,
- authorization-reconciliation loops that can fail without removing a row or that can run without a bounded deterministic termination rule,
- failure-bonus qualification or final clearing based on mutable live Common Ground Budget payment fields rather than immutable `PaymentCommitmentSnapshot` records,
- final clearing, threshold counting, counterparty-volume satisfaction, sponsor-match eligibility, or failure-bonus qualification based on mutable live Common Ground Budget, support-stance, conditional-intent, or identity-eligibility records after round close rather than the immutable `RoundClearingInputBundle`,
- candidate-allocation or failure-bonus claim-creation paths that dereference a missing Common Ground Budget, missing payment snapshot, or missing clearing bundle before the relevant fail-closed eligibility predicate has run,
- final clearing, threshold counting, counterparty-volume satisfaction, sponsor-match eligibility, authorization, or failure-bonus qualification from bundle-derived Common Ground Budget, support-stance, conditional-intent, identity-eligibility, or payment-snapshot rows whose round, project, participant, budget, or intent identifiers are missing, mismatched, wrong-round, wrong-project, wrong-participant, or cross-budget,
- final clearing using a `RoundClearingInputBundle` whose `id`, `roundId`, `rulebookHash`, `feePolicyVersion`, `feePolicyHash`, `deploymentMode`, pilot cap fields, `deploymentAuditState`, `deploymentAuditId`, `deploymentAuditHash`, `paymentReconciliationPathHash`, `optimizationPolicyHash`, `calculationVersion`, `snapshotKind`, `sourceCutoffAt`, `bundleHash`, `bundleSchemaVersion`, `canonicalInputJsonRef`, `canonicalInputJsonHash`, `commonGroundBudgetInputHash`, `supportStanceInputHash`, `conditionalTradeIntentInputHash`, `identityEligibilityInputHash`, `paymentCommitmentSnapshotHash`, `feeInputHash`, `deploymentExposureInputHash`, `projectInputHash`, `projectEligibilitySnapshotHash`, `sponsorCommitmentInputHash`, `moralBucketSnapshotId`, or `moralBucketSnapshotHash` is missing, malformed, mismatched, or not bound by a reproducible canonical `bundleHash`,
- final clearing based on mutable live project caps, project thresholds, project bucket IDs, base-match ratios, or bonus-cap multiples rather than frozen `projectInputHash`-covered bundle inputs,
- final clearing with multiple selectable payment snapshots for the same `(roundId, commonGroundBudgetId, snapshotKind)`, multiple locked bucket snapshots for the same round, multiple round-close clearing bundles for the same `(roundId, calculationVersion)`, multiple project-round eligibility snapshots for the same `(roundId, projectId)`, or duplicate failure-bonus claims for the same `(roundId, projectId, participantId, conditionalTradeIntentId)`,
- final sponsor-backed clearing, matching, failure-bonus, or payout calculations based on mutable live `SponsorCommitment` rows rather than the frozen sponsor-commitment inputs in the eligible `RoundClearingInputBundle`,
- generic `sponsorBackedCents(poolType)` reads in final clearing, matching, failure-bonus availability, payout plans, audit bundles, or donor-facing advertised schedules instead of the explicit preview and final-clearing sponsor-backed functions,
- final sponsor-backed calculations that count sponsor commitments with malformed source hashes, missing, post-freeze, or post-open `publishedAt` / `backingConfirmedAt` timestamps, or negative, fractional, unsafe-integer, NaN, or otherwise invalid `committedCents` / `fundedCents`,
- preview or final sponsor-backed calculations that count a sponsor commitment unless both `committedCents` and `fundedCents` are non-negative safe-integer cents, regardless of which amount field the commitment state pays from,
- donor-facing pre-round sponsor-pool advertisements that are not backed by current sponsor records and clearly labeled as provisional until final frozen-bundle clearing,
- final clearing or failure-bonus qualification from a payment snapshot with missing, empty, malformed, or unauditable `providerEvidenceHash`, missing/empty `paymentMethodRef`,
- final clearing or failure-bonus qualification using a `PaymentCommitmentSnapshot.asOf` before or after the relevant cutoff instead of exactly equal to `round.closesAt` or `round.earlyFailureBonusCutoff`,
- failure-bonus qualification or final clearing based on a `PaymentCommitmentSnapshot` whose snapshot kind, round, participant, budget, rulebook hash, cutoff `asOf`, provider-confirmed timestamps, or snapshot hash is missing or mismatched,
- round locking with asymmetric moral-bucket distinctness graphs,
- using a `RoundMoralBucketSnapshot` that is not bound to the current round by `moralBucketSnapshotId`, `moralBucketSnapshotHash`, `roundId`, `rulebookHash`, and `asymmetricPairCount === 0`, or whose graph is empty, self-distinct, non-reciprocal, refers to unknown buckets, or has blocked asymmetric pairs despite `asymmetricPairCount === 0`,
- using a `RoundMoralBucketSnapshot` created after `round.parametersFrozenAt` or with raw reciprocal-map keys that do not exactly match the frozen bucket ID set,
- counterparty validation based on mutable or asymmetric bucket distinctness rather than the frozen round bucket snapshot,
- counterparty validation that looks up reciprocal distinct buckets through an undefined `targetMoralBucket` alias or mutable live bucket object instead of the bundle-derived `project.bucketId` validated against the frozen `RoundMoralBucketSnapshot.bucketIds`,
- post-clear authorization-failure handling that does not deterministically remove failed rows and rerun clearing/matching before capture or release,
- failure-bonus payout formulas that use the configured numeric failure-bonus budget instead of the backed available failure-bonus pool,
- deterministic stable-order rules without a canonical hash and serialization rule,
- timestamp-dependent clearing, sponsor-backing, payment-commitment, bundle, or failure-bonus predicates that accept malformed, non-canonical, or non-UTC timestamp strings,
- round locking, clearing, matching, authorization, or failure-bonus qualification under malformed or incoherent round timeline ordering,
- donor-facing failure-bonus advertisement when preview/opening sponsor backing does not fully cover the advertised failure-bonus budget,
- failure-bonus payout availability when final frozen sponsor backing is below the advertised failure-bonus budget,
- treating failure-bonus claims as qualified when final frozen sponsor backing is below the advertised failure-bonus budget,
- arbitrary or non-deterministic proration of over-subscribed failure-bonus claims,
- floating-point percentage arithmetic for 10% failure-bonus calculations instead of integer-cent arithmetic,
- floating-point percentage arithmetic for the 5% failure-bonus sponsor-budget cap instead of integer arithmetic,
- failure-bonus proration formulas that mix basis-point and 0..1 ratio representations,
- allocation caps, identity thresholds, or match formulas that use ambiguous percentage fields, ratio-style threshold fields, fractional-cent outputs, or unnormalized basis-point fields,
- base-match or bonus-match formulas that divide by zero, return fractional cents, or allocate arbitrarily when there are no valid claims or no positive adjusted QF scores,
- base-match formulas that scale claims upward when the backed pool exceeds total claims,
- bonus-match formulas that state a cap but do not operationally enforce it through mandatory deterministic capped proration or equivalent deterministic cap-respecting allocation,
- Stage 2 candidate-allocation formulas that use ratio-style identity thresholds instead of `identityWeightMinForCountingBps` and `identityWeightMinForBonusBps`,
- failure bonuses based on review-not-approved, challenge-blocked, anti-threat-blocked, destination-blocked, project-identity/destination-route-blocked, externality-not-clear, conflict-blocked, sponsor-blocked, identity-blocked, sybil/collusion-blocked, authorization-failed, blocked, invalid, over-cap, self-matched, linked-account, same-payment-method / same-payment-cluster, same-control, rulebook-mismatched, legal/custody-blocked, or consent-invalid intent,
- failure-bonus qualification from a round-open eligibility snapshot whose externality-clear or project-identity/destination-route-valid boolean is false, missing, malformed, or absent from the snapshot hash,
- failure-bonus qualification based on mutable live project fields rather than a stored round-open eligibility snapshot,
- recurring-budget capture without explicit consent and easy cancellation,
- allocating from paused, expired, canceled, or consent-invalid Common Ground Budgets,
- missing support-stance rows that allocate funds or expose counterparty buckets instead of defaulting to abstain,
- missing identity-eligibility rows that count, unlock matching, satisfy counterparty volume, or qualify for failure bonuses,
- unverified, sybil-review, sybil-blocked, collusion-review, or collusion-blocked identity rows that count, unlock matching, satisfy counterparty volume, or qualify for failure bonuses merely because `countedWeightBps` is high,
- negative, fractional, NaN, unsafe-integer, or malformed cent amounts or caps that produce negative/fractional/unsafe gross, fee, net-recipient, actual, counted, match-eligible, match, bonus, failure-bonus, or payout-availability outputs instead of zero, exact BigInt/fixed-point handling, or rejection,
- negative, fractional, NaN, or malformed round sponsor-budget fields that produce negative base-match, bonus-match, failure-bonus, or payout availability outputs instead of zero,
- malformed `IdentityEligibility.countedWeightBps` values that are clamped, coerced, or treated as positive rather than counting as zero,
- malformed or out-of-range basis-point caps that are clamped to positive allocation/match values, bypass fail-closed validation, or cause allocation above user consent,
- malformed, duplicate, or whitespace-only counterparty-bucket arrays that are deduplicated into valid clearing inputs instead of being treated as empty,
- locking, clearing, matching, authorizing, or qualifying failure bonuses for a round whose rulebook hash, sponsor-pool source hash, calculation version, failure-bonus policy version, or parameter-freeze timestamp is missing, malformed, or not frozen no later than round open,
- donor-facing sponsor-pool advertisements that rely on an undefined preview backing function, wrong-round/wrong-pool sponsor records, malformed sponsor evidence, future-dated sponsor publication/backing after `previewAsOf`, sponsor records after `round.parametersFrozenAt`, late sponsor backing, or negative/fractional/unsafe sponsor cents,
- full-scale or uncapped real-money rounds that bypass shadow/capped-pilot deployment-mode gates, omit capped-pilot gross-exposure caps, require provider-confirmed payment snapshots for shadow-only simulation outputs, write shadow-mode results into binding capture/payment channels, or mark deployment audit as passed without a first-class binding DeploymentAudit object covering the current calculation version, rulebook, fee policy, sponsor input, current round payment/reconciliation path hash, coherent audit-kind/target-mode fields, equal-length prior evidence arrays, no current-round self-reference, and prior shadow/capped-pilot deployment modes including at least one capped-pilot prior mode for full deployment,
- audit-backed capped_pilot or full deployment paths that accept a DeploymentAudit with mismatched auditKind / targetDeploymentMode, missing priorRoundDeploymentModes, unequal-length prior evidence arrays, duplicate prior round ids, prior evidence that includes the current round, or merely canonical-looking but incoherent prior audit-bundle hashes,
- capped_pilot candidate allocation that trusts remaining deployment-exposure maps without min-capping by the frozen pilotMaxRoundGrossExposureCents and pilotMaxParticipantGrossExposureCents fields,
- capped-pilot deployment-exposure maps that are missing, mutable after bundle close, wrong-round, malformed, not covered by `deploymentExposureInputHash`, not exposed in `RoundAuditBundle`, or able to raise allocation above the frozen pilot caps,
- failure-bonus claimant-conflict snapshots or claims that treat a merely canonical-looking snapshotHash as enough without binding snapshot id, round, project, participant, exact conflict state, source cutoff, and creation timestamp, or failure-bonus claim audit-context predicates that do not verify the stored claimant-conflict snapshot fields and recompute the stored claim eligibility-input hash before mutation or payout,
- sponsor-paid fee quote paths that accept a canonical but wrong-round, stale, wrong-pool, duplicate-id, or unbound `sponsorFeeBackingHash` instead of requiring it to match the current frozen sponsor-pool source hash and a backed aggregate `fee_support` sponsor pool computed only from selected positive binding sponsor-paid fee quotes whose ids each resolve to exactly one frozen FeeQuote row,
- failure-bonus claim paths that pay project proposers, recipient/fiscal-host/sponsor/reviewer affiliates, same-control entities, or unknown-conflict claimants for threshold-family project failure,
- allocation from CommonGroundBudgets with invalid `budgetPeriod`, invalid `fallbackRule`, missing recurring consent, non-canonical `nextCaptureAt`, or empty / non-trim-stable `nextCaptureRule`,
- active ConditionalTradeIntent rows with malformed authorization-state or fallback-rule enum values, or with `captured`, `released`, or `failed` authorization states, clearing, qualifying for failure bonuses, or exposing fallback authority,
- Common Ground Budget / ConditionalTradeIntent fallback-rule mismatches clearing, authorizing, qualifying for failure bonuses, or executing reroute/carry-forward without fresh consent,
- Stage 7 failure handling that reads an undefined or ambient `fallbackRule` variable, or that executes reroute/carry-forward from wrong-round, wrong-budget, wrong-project, missing, malformed, mismatched budget/intent fallback, or cross-context fallback inputs instead of canceling/releasing and requiring fresh consent,
- Stage 7 fallback execution that uses a fallback rule without first proving formula-level uniqueness and binding for the current bundle-derived project, Common Ground Budget, and ConditionalTradeIntent rows and matching budget/intent fallback rules, or that treats missing/malformed/mismatched fallback inputs as a synthetic `release_hold` fallback rule,
- Stage 7 fallback execution, authorization cancellation/release, reroute, carry-forward, failure-bonus claim creation, claim advancement, raw-bonus / participant-cap / participant-capped-provisional / bonus-cents / payout / proration field mutation, crediting, or payment side effects that can run when `round.status !== "payable"`, or any failure-bonus claim-field, payout, proration, crediting, or payment mutations that run when the backed failure-bonus pool is unavailable, the failure-bonus budget-cap predicate fails, or final frozen sponsor backing is below the advertised failure-bonus budget, or any such side effects from `released` / `closed` replay states instead of replaying/reporting/auditing already-recorded failure-handling outputs only,
- final Section 10 or Stage 7 failure-bonus payout/proration claim lists that include `FailureBonusClaim` rows whose audit context is missing or malformed, whose claimant-conflict snapshot fields are missing, stale, conflicted, or not bound into a recomputed eligibility-input hash, whose `failureReason` is not threshold-family, whose `eligibilityInputsHash` is not canonical or not reproducible from stored claim context, whose clearing-bundle hash does not match the selected round-close bundle, whose payment-snapshot evidence is missing, non-provider-confirmed, or provider-confirmed after the stored/round early cutoff, whose early cutoff does not match the round, whose `createdAt` is missing or non-canonical, whose failed-qualified amount is non-positive, malformed, or mismatched against an external amount map, whose `denialReason` is non-null, whose `claimState` is not exactly `approved`, whose `payoutRef` is non-null, or whose `resolvedAt` is non-null, or that let `pending`, `denied`, `expired`, `paid`, `credited`, or already-settled approved claims enter payout denominators, receive new `bonusCents` / `prorationFactorBps` / `finalFailureBonusCents` mutations, remain `approved` after successful payout/credit issuance, or be credited or paid again,
- preliminary Section 10 failure-bonus claim-field mutation lists that let claim rows with missing/malformed audit context, claimant-conflict snapshot ids/states/hashes/source cutoffs that are missing, stale, conflicted, or not bound into a recomputed eligibility-input hash, non-threshold failure reasons, non-canonical or non-reproducible eligibility-input hashes, wrong clearing-bundle hashes, malformed payment evidence, non-provider-confirmed payment state, payment timestamps that do not satisfy `paymentMethodSavedAt <= paymentMethodConfirmedAt <= earlyFailureBonusCutoff`, missing cutoff binding, missing or non-canonical `createdAt`, non-positive failed-qualified amount, non-null denial reason, `denied`, `expired`, `paid`, `credited`, or already-settled state receive new `rawBonusCents`, `participantRoundCapCents`, or `participantCappedProvisionalBonusCents` mutations, or that treat terminal failure-bonus claim states as mutable merely because the claim id is current-round and policy-bound,
- Stage 7 failure-bonus claim creation that omits explicit `FailureBonusClaim` state/default initialization, creates a fully qualified payout-path claim without `claimState === "approved"`, creates a settled or terminal claim row, leaves `denialReason`, `payoutRef`, or `resolvedAt` non-null at creation, leaves raw/cap/provisional/bonus cent fields malformed or uninitialized, omits a canonical `createdAt`, or lets pending intake-only claims enter final payout/proration lists before explicit approval,
- Stage 7 failure-bonus claim creation that performs a non-idempotent insert without first checking the unique `(roundId, projectId, participantId, conditionalTradeIntentId)` key, overwrites an existing same-key claim, creates a duplicate same-key claim on a retried payable pass, or proceeds when an existing same-key claim has mismatched policy, claimant-conflict snapshot fields, context, or eligibility hash instead of failing closed,
- Stage 7 failure-bonus claim creation that passes an undefined, ambient, stale, policy-version-omitting, or hash-format-only `eligibilityInputsHash` instead of computing it from the exact eligible bundle/snapshot/intent/policy-version/failure inputs, or that selects project-round eligibility snapshots or constructs claim identity fields from ambient `projectId`, `participantId`, or Common Ground Budget identifiers instead of Stage 7 locally bound values,
- Stage 7 fallback, failure-bonus claim-creation, or payout/proration code that uses `isNonEmptyString`, `isCanonicalHash`, `isCanonicalUtcTimestamp`, timestamp-comparison helpers, non-negative-cent helpers, or `sumBigInt(...)` before defining them in the Stage 7 implementation-facing path, or that substitutes weaker ambient helper definitions,
- Stage 7 non-payable replay/review handling that calls an undefined or ambient helper such as `emitFailureHandlingReplayOnly(...)`, or that lets any replay helper mutate fallback, authorization, failure-bonus, payout, credit, proration, settlement, or claim rows when `round.status !== "payable"`,
- failure-bonus qualification from conditional intents with malformed, zero, or missing amount, max-exposure, counterparty-volume threshold, or counterparty-bucket fields,
- failure-bonus qualification, participant-round cap aggregation, eligibility-input hashing, claim creation, claim approval, crediting, payment, or proration that uses raw, string-coerced, malformed, unsafe, fractional, NaN, zero, missing, negative, or external-map-mismatched `failedQualifiedMatchEligibleCents` values instead of first sanitizing to positive safe-integer cents, comparing external maps to stored `FailureBonusClaim.failedQualifiedMatchEligibleCents` where present, and failing closed to denial/`0`,
- failure-bonus qualification from paused, expired, canceled, recurring-consent-invalid, invalid-fallback, invalid-budget-period, invalid-cap, or rulebook-mismatched Common Ground Budgets,
- AuthorizationReconciliationEvent records whose `eventHash` does not bind event id, non-empty trim-stable removed-row identifiers, exact-amount, expiry, valid reconciliation-state, reason-code, and createdAt fields entering an audit bundle; records with blank or whitespace-padded roundId / participantId / projectId / conditionalTradeIntentId values; records with blank non-null custodyAuthorizationId values; or duplicate reconciliation events for the same removed row and clearing iteration,
- payable CustodyAuthorization rows with invalid provider metadata, missing/blank/whitespace id / roundId / participantId / projectId / providerRef values, round / participant / project identifiers that do not match the current payable row, `custodyState` other than `authorized`, non-canonical timing fields, short-expiring authorization relative to `expectedCaptureBy`, nonzero captured amount before capture, or authorized amount below the exact required amount,
- RoundClearingInputBundle hashes that omit the selected bundle `id` from the canonical bundle hash,
- roundClearingInputBundleBindingHashValid implementations that accept blank or whitespace-padded bundle/round identifiers, malformed rulebook hashes, missing or whitespace-padded fee-policy versions, malformed fee-policy hashes, malformed deployment modes, deployment-mode-incompatible pilot caps, malformed deployment-audit state/id/hash fields, malformed payment/reconciliation-path hashes, malformed optimization-policy hashes, missing or whitespace-padded calculation or schema versions, snapshot kinds other than `round_close`, malformed source-cutoff or creation timestamps, malformed active component hashes including commonGroundBudgetInputHash, supportStanceInputHash, conditionalTradeIntentInputHash, identityEligibilityInputHash, paymentCommitmentSnapshotHash, feeInputHash, deploymentExposureInputHash, projectInputHash, projectEligibilitySnapshotHash, sponsorCommitmentInputHash, successRewardInputHash, coordinationCreditInputHash, impactCertificateInputHash, canonicalInputJsonHash, moralBucketSnapshotHash, or bundleHash, blank or whitespace-padded moral-bucket snapshot ids, blank or whitespace-padded canonical-input refs, or malformed canonical-input hashes because those fields appear inside a canonical-looking bundle hash,
- ProjectRoundEligibilitySnapshot records with missing, malformed, or under-specified `snapshotHash` values affecting failure-bonus qualification,
- projectRoundEligibilitySnapshotBindingHashValid implementations that accept snapshot kinds other than `round_open`, blank or whitespace-padded round/project identifiers, malformed rulebook hashes, malformed source-cutoff or creation timestamps, or non-boolean round-open eligibility fields because those fields appear inside a canonical-looking snapshot hash,
- PaymentCommitmentSnapshot records whose `snapshotHash` does not bind the canonical payment-commitment fields affecting final clearing or failure-bonus qualification,
- payment-commitment binding-hash predicates that accept missing, empty, whitespace-padded, or non-trim-stable `paymentMethodRef` values,
- RoundMoralBucketSnapshot records whose `snapshotHash` does not bind the frozen reciprocal bucket-distinctness graph,
- roundMoralBucketSnapshotBindingHashValid implementations that accept blank or whitespace-padded round identifiers, malformed rulebook hashes, missing or whitespace-padded distinctness-policy versions, malformed raw bucket arrays, malformed reciprocal-map keys or values, malformed asymmetric-pair counts, or malformed blocked-pair arrays because those fields appear inside a canonical-looking snapshot hash,
- project scope gates that allow private-benefit projects, political campaign trades, lifestyle trades, behavior-change promises, threat-like trades, or any non-`valid_moral_public_good` scope state to clear, authorize, match, pay, or qualify for failure bonuses,
- projects with malformed, negative, fractional, NaN, or under-specified economic threshold fields that lower clearing thresholds,
- QF formulas that mix stance-weighted and unweighted contribution terms,
- QF raw-score formulas that use `Math.sqrt`, `Math.pow`, or unrounded implementation-specific floating-point intermediates rather than fixed-point/pinned-decimal operations,
- Section 8 or Stage 2 numeric `stanceWeight` / `stanceWeights` JavaScript-number aliases that can be used for payout-relevant scoring instead of fixed-point stance weights,
- bonus allocations that depend on unrounded implementation-specific floating-point QF, entropy, diversity, dissent-pressure, collusion-discount, or adjusted-score values rather than deterministic fixed-point / pinned-decimal quantized scores,
- bonus allocations that use string or JavaScript `number` coercion for `bonusScoreUnits` instead of exact integer score-unit arithmetic,
- failure-bonus advertising, qualification, or payout when the integer 5% sponsor-budget cap predicate does not pass,
- bonus-score calculations that treat malformed cluster-share distributions or malformed collusion-risk scores as favorable inputs,
- bonus scoring paths that leave fixed-point alpha/beta/gamma/stance-weight constants implicit or divide by an invalid/zero review-pressure threshold,
- bonus scoring code blocks that redeclare the same fixed-point alpha/beta/gamma/stance-weight constants in a later defaults block instead of single-sourcing them under the calculation version,
- payment-snapshot binding predicates that accept malformed snapshotKind, blank or whitespace-padded roundId/participantId/commonGroundBudgetId, or malformed rulebookHash because those fields appear inside a canonical-looking snapshotHash,
- final clearing that treats `ProjectSupportStance.minCounterpartyVolumeCents` as authoritative instead of using `ConditionalTradeIntent.minCounterpartyVolumeCents`,
- Section 8, Section 9, Section 10, Stage 2, Stage 4, or Stage 5 formulas that call undefined `min(...)` / `intersection(...)` helpers, define `min(...)` over negative/fractional/unsafe/malformed numeric values, use raw `Math.min(...)` to determine matching payouts, pool availability, or cap enforcement, or define `intersection(...)` so malformed or duplicate counterparty-bucket arrays can satisfy cross-view clearing,
- Section 9, Section 10, Stage 4, or Stage 5 aggregate payout/proration formulas that call an undefined `sumBigInt(...)` helper, use JavaScript-number aggregate sums, accept malformed aggregate inputs, or allow unsafe aggregate precision to determine match, bonus, failure-bonus, proration, or audit outputs,
- or counting / matching low-confidence identity records below the round's published identity thresholds.

---

- round eligibility predicates that ignore `MpgfRound.status`, allow `draft`, `open`, `locked`, `frozen`, `reviewing`, `canceled`, missing, or malformed statuses to produce final binding clearing, matching, authorization, payout, failure-bonus, fallback, or final audit outputs, allow new authorization attempts outside `cleared`, allow capture/release/payment/failure-bonus payout/proration/fallback/reroute/carry-forward side effects outside `payable`, or allow `released` / `closed` rounds to initiate new payment or routing side effects rather than only replay/report/audit already-recorded final outputs; `open`, `locked`, and `reviewing` may produce only setup, internal review, or explicitly non-binding preview outputs,
- deployment audits that cite prior rounds without passed prior outcome states, or that let failed, canceled, incident-review, missing, malformed, or unbound prior outcomes unlock real-money deployment,
- shadow or full rounds with non-null pilot-cap fields, or capped-pilot rounds with missing / zero / malformed pilot caps,
- Stage 3 binding allocation paths that proceed after solver timeout, infeasible, unknown, failed, duplicate, missing, wrong-policy, wrong-stage, wrong-bundle, wrong-calculation-version, missing selected-allocation-row hash, missing constraint-satisfaction hash, or non-hash-bound optimization traces,
- ILP allocation paths without an optimality certificate in `OptimizationRunTrace`, or deterministic-greedy paths not explicitly selected by the frozen calculation version and selected deployment audit,

- success-reward, coordination-credit, or impact-certificate code that counts rewards, credits, or certificates as public-good dollars, net recipient-disbursed dollars, counted dollars, match-eligible dollars, counterparty volume, supporter counts, cluster counts, base-match claims, bonus-match claims, or project threshold satisfaction,
- success rewards paid, credited, advertised, or audited from base-match, bonus-match, failure-bonus, fee-support, recipient project funds, donor project contributions, or any pool other than a fully backed `success_reward` SponsorCommitment pool,
- success-reward dominance-mode or “your reward offsets your contribution” UX when the maximum possible liability is not fully backed before parameter freeze,
- coordination credits that increase moral reputation, voting power, rank-order power, identity weight, matching weight, counterparty-volume satisfaction, or allocation power,
- retroactive or late access to contributor-only success rewards, coordination credits, or impact certificates by non-signers, late signers, post-close buyers, rows without locked pre-close intents, or rows without provider-confirmed payment snapshots,
- impact certificates that double-count public-good impact, omit the bound payment/fee/clearing-bundle context, or can be minted for failed, uncaptured, review-blocked, externality-not-clear, authorization-failed, conflict, sybil/collusion, linked-account, same-payment-method, same-control, or consent-invalid rows,
- public live progress displays that expose exact current threshold satisfaction, exact counterparty-volume gaps, or exact success-without-me status in a sealed-pledge round before close,
- Advanced Pivotality Calculator code that reads live exact round progress, exact threshold gaps, exact counterparty-volume gaps, exact live supporter counts, exact active-cluster counts, exact success-without-me status, or platform-generated decisive-probability estimates before round close,
- Advanced Pivotality Calculator UX in the required default pledge modal, or calculator outputs that create, modify, rank, clear, authorize, capture, release, reward, credit, certify, or audit any funding record,
- Advanced Pivotality Calculator copy that says or implies "objectively best," "the platform estimates you are pivotal," "guaranteed decisive," or any equivalent claim not grounded in the user's own subjective inputs,
- calculator formulas that count success rewards, coordination credits, or impact certificates as public-good dollars, counted dollars, match-eligible dollars, threshold satisfaction, counterparty volume, supporter counts, cluster counts, matching claims, failure-bonus eligibility, or allocation power,
- simplified UX that hides binding project caps, counterparty buckets, fallback rules, payment language, fee treatment, reward/credit/certificate opt-ins, self-matching exclusions, sealed-progress disclosure, or failure-bonus denial categories from the final review screen,
- simplified UX that turns suggested defaults into binding Common Ground Budget, support-stance, conditional-intent, fallback, reward, credit, certificate, visibility, or payment consent without explicit user review and save under the current rulebook hash,
- plain-language stance labels, status chips, project cards, emails, receipts, or summaries that create alternate enum values, bypass canonical CRECM records, or let “Fund this,” “Fund if different-view support joins,” “Needs review,” or “Skip” mean anything other than `strong`, `weak`, `dissent`, or `abstain`, respectively,
- simple-mode contribution summaries that merge gross captured, fees, net recipient-disbursed dollars, counted dollars, match-eligible dollars, sponsor match, success rewards, coordination credits, or impact certificates into a single unlabeled “impact” or “matched” number,
- payment or trust copy in plain-language mode that says or implies money is charged, held, escrowed, protected, guaranteed, or authorized before the exact recorded payment/custody/authorization state exists,
- moral-public-goods search pages that show “0 listings,” “No matching listings,” or empty ordinary-offer filters as the primary result while a Common Ground Budget / Public Goods Fund module, round, preview, or learning route exists,
- public-goods search pages that make “External CRECM module,” legacy “Verified Assurance Matching,” old moralpublicgoods file numbers, or old mechanism versions the primary current-product label,
- offers-page UX that merges live offers, templates, worked examples, demo records, public-goods modules, shadow previews, capped-pilot rounds, or binding rounds into one count or implies that examples/demos are live agreements,
- public-goods entry-page CTAs that create or imply a binding contribution intent without the normal Common Ground Budget setup, explicit project stance, cap, condition, fallback, payment, sealed-progress acknowledgement, and final review,
- public-goods entry cards that expose exact live threshold satisfaction, exact counterparty gaps, supporter counts, active-cluster counts, or success-without-me status before close in sealed CRECM rounds,
- mobile or accessibility implementations where public-goods search intent does not expose the Common Ground Budget card as the first main result, where status chips are color-only, or where the primary safe action is inaccessible by keyboard,

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
- Moral Trade offers search page reviewed for public-goods UX
  https://www.moraltrade.org/offers?search=moral%20public%20goods
- Moral Trade Public Goods Fund page
  https://www.moraltrade.org/mpgf
- Stripe manual capture / authorization timing
  https://docs.stripe.com/payments/place-a-hold-on-a-payment-method

---

## Final Build Target

Build:

> **CRECM v1.125: Common Ground Budget + cross-view conditional clearing + legally valid escrow/custody-or-JIT authorization + hard review gates + separated gross/fee/net-recipient/actual/counted/match-eligible accounting + active-budget consent gating + provider-confirmed payment-commitment snapshots bound by kind/round/budget/cutoff + cutoff-exact round-close clearing input bundles with canonical hash-format-validated component hashes + deterministic fixed-point bonus scoring with explicit fixed constants and review-pressure guards + exact integer bonus-score-unit proration + verified-clear identity counting gates + at-least-100-cent net-public-good supporter-count floor + malformed identity-weight zeroing + invalid-cap zeroing + sanitized round sponsor budgets + non-empty payment-method refs + validated counterparty-volume cents + conditional-intent-only counterparty-volume authority + validated project economic thresholds + binding payment-snapshot hashes with non-empty payment-method-reference and provider-confirmed chronological predicate enforcement + binding moral-bucket-snapshot hashes + graph-well-formed bucket snapshots + binding round-clearing-bundle hashes + sponsor backing timing checks + bps fail-closed validation + enforced failure-bonus sponsor-budget cap + fail-closed bonus risk/diversity inputs + round-open eligibility snapshots + frozen project inputs + frozen sponsor-commitment inputs + frozen reciprocal bucket snapshots bound by id/hash/rulebook + canonical UTC timestamp validation + full-backed failure-bonus availability + enforced identity thresholds + pool-specific sponsor-pool precommitment + base match + stance-consistent capped diversity-aware post-clear bonus + intent-capped allocation + distinct-bucket and same-payment-method-excluding counterparty validation + bps-normalized matching parameters + claim-respecting base match + capped-prorated bonus match + safe-integer and exact BigInt/fixed-point deterministic payout accounting + round-and-pool-filtered sponsor backing + explicit preview-as-of and parameter-freeze sponsor-backing validation + rulebook/parameter-freeze validation + budget-period, fallback-rule, budget/intent fallback-rule consistency, recurring-next-capture, and failure-bonus budget-consent validation + exact integer failure-bonus division + conditional-intent enum and pre-capture-state validation + authorization-reconciliation event-id hash binding, row-identity validation, and uniqueness + custody authorization provider/state/timing/current-row binding validation + round-open eligibility snapshots + participant-capped budget-capped reason-coded failure bonuses + fiscal-host conflict-review coverage + mandatory deterministic capped-proration + integer failure-bonus percentage arithmetic + exact-amount authorization reconciliation and reclearing + externality-review fail-closed gating + failure-bonus snapshot externality/project-route binding + project identity/destination-route validation + fixed-point-only bonus defaults + explicit escrow-vs-JIT payment honesty + project-row binding/null-safety + conditional-intent-only counterparty-volume thresholds + full-bundle-gated failure-bonus claim creation + Stage 1 final-sponsor-backing bundle gating + exact-boolean round-open eligibility snapshots + Common Ground Budget-bound stance/intent rows + bundle-gated failure-bonus final sponsor backing + bundle-gated base/bonus final sponsor backing + gated Section 11/Stage 1 final sponsor-backed variables + Section 7 gated sponsor-backed hard-gate variables + support-stance-row input gating + selected stance/intent row uniqueness + failure-bonus project-row binding + unique bundle-derived project rows + formula-level row-count uniqueness guards + Common Ground Budget row-count guards + round-keyed payment-snapshot lookup/row-count guards + identity/payment/project-eligibility snapshot row-count guards + explicit project-failed Stage 7 claim gating + full Section 10 predicate-gated Stage 7 claim creation + Section 12.1 bundle-uniqueness key alignment + round-keyed stance/intent row-count guards + explicit conditional-intent claim IDs + exact BigInt sponsor-budget cap sums + round-keyed allocator-state lookups + exact BigInt sponsor-backed pool sums + exact BigInt base-match aggregate claim sums + exact BigInt failure-bonus aggregate proration sums + fail-closed exact BigInt aggregate sum helpers + bundle-bound Stage 7 fallback execution + Stage 7 fallback row-eligibility gating + fail-closed fallback branch isolation + locally bound failure-bonus eligibility input hashes + failure-bonus-policy-version-bound claim audit hashes + stronger payment-snapshot binding predicates + single-sourced fixed-point bonus constants + finite integer stance-cap fallback + direct integer match-eligible caps + fail-closed min/intersection helpers + safe-integer failed-qualified failure-bonus amount validation + locally defined failure-bonus proration helpers + Stage 4 local base-match default + per-project matching map-value sanitization + explicit stable-order tuple fields + project-bucket counterparty-lookup naming + sanitized counterparty-threshold predicate consistency + exact target-denominator failure-bonus proration + duplicate-free current-round key/id/identity-bound claim-list validation + gross/fee/net-recipient accounting separation + fee-policy-hash-bound unique FeeQuote inputs + waived-fee zero validation + net-public-good-credit counted/match eligibility + verified-clear dissent-pressure gating + deterministic optimizer tie-break tuples + claimant-conflict-denied failure bonuses + sponsor-fee-backing-bound FeeQuotes + deployment-mode shadow/capped-pilot/full guardrails + shadow simulation output separation + shadow simulation without provider-confirmed payment snapshots + aggregate fee-support sponsor backing + selected binding uniquely identified sponsor-paid fee-support demand + sponsor-input array/row fail-closed backing + minimum-100-cent net-supporter floor + binding pre-freeze deployment audit snapshots + pilot-to-full capped-pilot-only prior evidence + payment-reconciliation-path-bound deployment audits + capped-pilot-prior full deployment + capped-pilot frozen-cap enforcement + failure-bonus claimant-conflict snapshot binding + target-compatible prior-evidence-bound deployment audits + fail-closed sponsor-paid fee-support aggregation + binding baseline/action-evidence project gates + context-bound failure-bonus claimant-conflict snapshots + complete fee/deployment-exposure bundle-integrity component lists + optimization-policy-hash-bound deployment audits/clearing bundles/optimization traces + selected-allocation and constraint-satisfaction optimization trace hashes + optimization-trace-id-bound audit bundles + fully propagated bundle-hash field-set integrity across invariants, test requirements, acceptance criteria, and do-not-build constraints + post-review final-binding status gating + side-effect-specific round-status gating + Stage 7 payable-only side-effect and backed-pool-gated failure-bonus raw/cap/provisional/bonus-cents/payout/proration claim-field persistence and mutation gating + Stage 7 locally defined helper predicates + unsettled-approved-claim-only final failure-bonus payout/proration + paid/credited failure-bonus settlement-state advancement + unsettled-non-terminal preliminary failure-bonus claim-field mutation gating + Stage 7 explicit side-effect-free replay/review output + explicit failure-bonus claim-creation state/default initialization + idempotent failure-bonus claim creation + audit-context-bound failure-bonus claim mutation lists + canonical-createdAt failure-bonus claim audit context + early-cutoff-bounded failure-bonus claim payment-timestamp audit context + claimant-conflict-source-cutoff-bound failure-bonus claim audit context + stored-claim-field-bound failure-bonus payout amount arithmetic + contributor-only success-reward pool + dominance-target reward disclosure + non-transferable coordination credits + no-late-access impact certificates + sealed-pledge blind-progress defaults + advanced educational pivotality calculator with no live-progress side effects + simplified progressive-disclosure UX with full consent/data parity + plain-language guided mode with canonical copy-map parity and final-review checklist + moral-public-goods search/Public-Goods-Fund entry-page simplification with first-class Common Ground Budget intent routing, no primary zero-state, collapsed empty filters, current-label parity, lane-separation preservation, and one-safe-CTA hierarchy + reward-specific anti-sybil/conflict/payment/audit gating + explicit failure handling.**

This is the concrete build target for `moraltrade.org`.
