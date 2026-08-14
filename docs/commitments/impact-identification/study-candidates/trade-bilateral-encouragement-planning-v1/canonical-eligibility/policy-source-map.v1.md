# Reciprocal Trade research-eligibility policy source map v1

- **Bound base:** `79ca382c3bdc325dfc5a28e2cbbafc1b95640386`
- **Evaluator:** `reciprocal-trade-research-eligibility-v1.0.0`
- **Policy-source manifest:** `sha256:7ab1d8d53c9b761ea93c4ab324c11c388316591bf90f5a21222f5fbb44de2606`
- **Status:** `blocked_source_conflict`

`policy-source-manifest.v1.json` is the machine-readable authority for every exact path, symbol, Git blob SHA-1, raw SHA-256, input field, fail-closed rule, gate level, time rule, and test interpretation below. This map explains the conclusions without replacing those bindings.

## Authority method

A source is **authoritative** only where the bound commit shows live runtime use, database enforcement, RLS/RPC policy, or an exact contract test. A more detailed or newer file is not automatically authoritative. **Descriptive** sources can explain a concern but cannot supply a gate. **Unresolved** sources define a plausible structured contract that is not bound to the core Reciprocal Trade matchability path or conflicts with another active source.

All source hashes were calculated over the exact Git blob and raw bytes at the bound base. The independent validator recomputes both. Prose, UI copy, examples, synthetic fixtures, recommendation-learning tables, and conceptual papers are not promoted to policy authority.

## Gate conclusions

### 1. Offer identity and lifecycle — directed-edge level

- **Active authorities:** `src/lib/core-trade-base.ts::listReciprocalMatches`; `supabase/migrations/20260716080505_core_trade_loop.sql` workflow/block/thread/agreement state machines; current `supabase/schema.sql` offer mode/status constraints.
- **Unresolved structured source:** `src/lib/moral-trade/offer-validity.ts::evaluateMoralTradeOfferValidity` defines expired, withdrawn, superseded, stale, and blocked states but is not wired into the core matcher.
- **Inputs:** both pseudonymous offer and owner keys, mode, workflow status, offer status, and structured operability.
- **Candidate rule:** distinct offers and owners; equal pledge mode; both published/open/operative. Deleted, paused, closed, rejected, pending-review, changes-requested, expired, superseded, withdrawn, unknown, stale, and contradictory states fail closed.
- **Time:** every state must be frozen at the supplied `effectiveAt`.
- **Tests:** lifecycle fixtures plus existing core trade and offer-validity contract tests.
- **Conflict:** `listReciprocalMatches` permits any equal mode; `offer_is_invitable` in `20260722223000_harden_trade_invitations.sql` permits only nonfinancial pledge offers. The synthetic candidate narrows to pledge but cannot call that choice canonical.

### 2. Reciprocal matching — directed-edge level

- **Active authority:** `src/lib/core-trade-base.ts::listReciprocalMatches` applies `target.offered_cause ILIKE source.requested_cause` and `target.requested_cause ILIKE source.offered_cause` after publication/open/mode/identity filters.
- **Inputs:** both offered/requested causes and the explicit collation label.
- **Candidate rule:** reproduce both directed predicates for printable ASCII, including live `%`, `_`, and backslash pattern semantics. This intentionally does not silently replace the runtime's wildcard behavior with equality.
- **Time:** cause values must belong to the same frozen snapshot as `effectiveAt`.
- **Tests:** one- and two-sided mismatch, ASCII case folding, wildcard behavior, pair symmetry, and directed-role tests.
- **Gap:** deployed PostgreSQL locale/collation is not frozen by a repository contract. Non-ASCII or an unknown collation fails closed.

### 3. Moderation, harmful-offer safety, and baseline integrity — offer level

- **Active but incomplete authority:** `src/app/core-trade-actions-base.ts::reviewCoreOfferAction` controls core publication and clears `moderation_reason`; that does not prove structured clearance.
- **Unresolved structured sources:** `src/lib/moral-trade/user-safety-content-moderation.ts::evaluateMoralTradeUserSafetyContentModeration` and `src/lib/moral-trade/baseline-integrity.ts::evaluateMoralTradeBaselineIntegrity`, with their bound migrations and tests.
- **Descriptive only:** `src/lib/proposal-review.ts::reviewProposalText`; free-text threat/prohibited-pattern heuristics are not imported by the matcher and cannot infer safety or legality.
- **Inputs:** structured moderation, harmful-offer, and baseline-integrity evidence for each offer, each with status, source status/hash, review time, and expiry.
- **Candidate rule:** only `cleared` + `current` + time-valid + hash-bound evidence passes. Blocked, review-required, unknown, stale, contradictory, unbound, expired, or future-reviewed evidence fails closed. Empty prose never passes a gate.
- **Tests:** synthetic clear/blocked/review/unknown/stale/contradictory cases and existing structured moderation/baseline contracts.

### 4. Legality and participant policy eligibility — participant level

- **Unresolved structured source:** `src/lib/moral-trade/participant-eligibility.ts::evaluateMoralTradeParticipantEligibility` covers identity, legal capacity, sanctions, jurisdiction, payment-rail, source-authorization, and artifact-handling dimensions but is not wired into the core matcher.
- **Active restriction authority:** `supabase/migrations/20260714132939_contextual_credibility.sql::credibility_restrictions` supplies structured account/role/category restrictions.
- **Inputs:** structured legality and participant-eligibility evidence for each owner, plus restrictions below.
- **Candidate rule:** only current structured clearance passes. Unknown jurisdiction or policy state and human review fail closed. The evaluator makes no legal conclusion and parses no prose.
- **Time:** records must be valid at supplied `effectiveAt`.
- **Tests:** synthetic legality/participant states and existing participant-eligibility/restriction contract tests.

### 5. Consent, privacy, and directed roles — participant level

- **Active base authority:** `supabase/migrations/20260422_background_networking_non_ai.sql::privacy_grants` represents owner-controlled, revocable grants.
- **Unresolved study authority:** `src/lib/moral-trade/privacy-governance.ts::evaluateMoralTradePrivacyGovernance` defines purpose, scope, grant, revocation, expiry, and disclosure review, but no approved study-specific policy/grant is bound.
- **Related discovery authority:** `20260805152000_account_bound_participant_directory_v2.sql` respects invitation opt-out and account-bound safety; invitation preference is not research consent.
- **Inputs:** source and target consent status, directed allowed role, exact study purpose/scope, source status, grant hash, start, expiry, and revocation times.
- **Candidate rule:** current source/bidirectional consent is required for the source role and current target/bidirectional consent for the target role. Absent, revoked, stale, mismatched, unknown, contradictory, unbound, or time-invalid consent fails closed. Account creation is never consent.
- **Tests:** privacy-governance contracts and synthetic current/absent/revoked/stale/scope/unknown/directed-role cases.
- **Gap:** privacy, ethics, and consent/waiver determinations remain incomplete, so protected inputs are always ineligible.

### 6. Blocks and relationship restrictions — pair level

- **Active authorities:** `20260722223000_harden_trade_invitations.sql::pair_is_blocked/create_trade_invitation_v2/block_trade_pair_v2`; account-bound wrappers in `20260729165525_evidence_weighted_milestones_additive.sql`; account-bound directory exclusion; `credibility_restrictions`.
- **Inputs:** explicit either-direction pair-block state and source/target/pair restriction records.
- **Candidate rule:** either-direction block and active/reviewing restriction fail. Unknown, stale, unbound, contradictory, or internally inconsistent restriction state fails. A restriction marked expired/revoked is nonblocking only when supplied times prove that state at `effectiveAt`.
- **Tests:** existing invitation/block, directory, and restriction contracts plus one-way/two-way/active/expired/revoked/unknown fixtures.
- **Gap:** there is no approved atomic research projection across permanent pair blocks and time-scoped credibility restrictions.

### 7. Agreement and engagement conflicts — pair level

- **Active authorities:** core loop thread/agreement state; current-lifecycle uniqueness in `20260721153000_offer_bank_contracts.sql`; atomic accept/confirm checks in `20260729170000_marketplace_atomic_acceptance_current_core.sql`.
- **Inputs:** accepted interest, invitation, thread, agreement, duplicate-pair, and historical-interference state.
- **Candidate rule:** any active/current conflict is ineligible. Unknown/contradictory states fail. Terminal history is not silently erased; historical interference must be explicitly captured or explicitly absent.
- **Time:** the whole relationship projection must be frozen at `effectiveAt`.
- **Tests:** existing atomic acceptance/agreement tests plus active-thread/agreement/interest/duplicate/history fixtures.
- **Gap:** no approved transaction-consistent normalized research projection exists.

### 8. Study and provenance integrity — study level

- **Authorities:** bound `study-instance.json`; immutable real-readiness contract/evidence; accepted master protocol validator.
- **Explicit exclusion:** `src/lib/recommendation-training.ts` and `recommendation_graph_edges` are descriptive learning surfaces and are prohibited as eligibility evidence.
- **Inputs:** exact schema/evaluator/manifest/base versions, supplied effective time, synthetic/protected provenance, snapshot hash, cluster count, real-row flag, and prohibition flags.
- **Candidate rule:** only synthetic fixtures can pass in this tranche. Any protected provenance, real-row flag, recommendation edge, causal-output request, assignment material, version/hash mismatch, missing time, or extra field fails closed.
- **Tests:** exact hash/source validator; tamper/version/time/recommendation/leakage fixtures; deterministic/idempotent/monotonic/purity invariants; non-executing synthetic 3,200-cluster control.

## Active conflicts and stop result

1. Mode authority differs between suggestion and invitation paths.
2. `startSuggestedMatchAction` does not re-run the suggestion or invitation gate set.
3. Core publication does not bind the available structured safety, validity, baseline, participant-policy, or research-consent records.
4. Full PostgreSQL `ILIKE` collation semantics are not frozen.
5. No study-specific privacy, ethics, consent/waiver, or protected projection authority exists.

These are issue-defined stop conditions. They are recorded, not guessed around. The source is therefore a validated synthetic candidate with `canonicalEligibilitySourceStatus = blocked_source_conflict`, never `complete`, `authorized`, or `ready_for_real_diagnostic`.
