# Moral Trade Marketplace Improvement Brief for Codex GPT-5.5-xHigh

I inspected the public site and the attached mechanism notes. The core issue is clear: [moraltrade.org](https://moraltrade.org/) currently has a careful safety/review posture, but not yet a liquid marketplace. The homepage reports **0 live offers**, **8 worked examples**, **2 public profiles**, and **0 completed agreements**, with “no custody or escrow,” “manual review before reliance,” and “privacy-first matching.” The [`/offers`](https://www.moraltrade.org/offers) page confirms that the live directory has no public offers and opens on worked examples instead. This brief intentionally does **not** specify the moral-public-goods / Common-Ground-Budget mechanism; implement that track only from `moralpublicgoods102.md` / CRECM v1.96.

## Bottom line

Instruct Codex to turn the marketplace from a **static example directory** into a **review-gated, conditional moral-trade marketplace** for non-public-goods moral trades, while delegating the separate moral-public-goods / Common-Ground-Budget track to `moralpublicgoods102.md` / CRECM v1.96.

This file must not define or duplicate the public-goods mechanism. It governs marketplace integration, launch sequencing, privacy, safety, review, donation offsets, pledge swaps, and related non-public-goods trade controls.

---

# Copy/paste prompt for Codex GPT-5.5-xHigh

You are working on `moraltrade.org`. Use high-reasoning mode. Inspect the repository before changing code. Do not assume file paths, framework conventions, database schema, or API contracts until verified locally.

## Objective

Improve the site’s **moral trade marketplace** so it moves from an example-heavy pilot to a usable, review-gated marketplace for conditional moral trades.

### Current public state to preserve and build from

The site is a reviewed pilot, not a liquid exchange. It currently reports **0 live proposals**, **8 worked examples**, **2 public profiles**, and **0 completed agreements**. The offer directory says there are **0 live offers** and **8 worked examples**, and that examples are first today.

Implement a **Moral Trade Marketplace** with this document covering only the non-public-goods tracks and their integration boundaries. The moral-public-goods / Common-Ground-Budget track is out of scope for this brief; implement it only from `moralpublicgoods102.md` / CRECM v1.96, and treat it here only as an external module.

1. **Donation Offset Batch Clearing**
   Users post conditional donation-offset commitments that clear only when compatible counterparties or shared-destination conditions are satisfied.

2. **Bounded Pledge Swap Matching**
   Users can create structured, reviewable pledge-swap offers, but matching must stay broad-preview, consent-gated, and human-review-bound until later governance approval.

Do not try to create a fully automated, legally enforceable, custody-bearing, or escrow-claiming marketplace in this iteration.

### Release-gate posture

Treat marketplace activation as a staged pilot, not a single all-at-once launch:

```text
release_stage:
  demo
  sandbox_calculation
  reviewed_no_money_manual_evidence_pilot
  capped_real_money_external_crecm_module
  donation_offset_pilot
  pledge_swap_preview_only
  pledge_swap_manual_pilot

feature_flags:
  external_crecm_module
  real_money_capture
  non_public_goods_subsidies
  donation_offsets
  pledge_swaps
  automated_provider_evidence
  payout_release

release_gate_requirements:
  dry_run_calculation_bundle
  route_health_baseline
  privacy_review
  anti_threat_review
  payment_replay_tests
  evidence_challenge_tests
  reviewer_conflict_tests
  emergency_pause_test
  neutral_reviewer_approval
  deployment_config_snapshot
  schema_migration_dry_run
  rollback_plan_test
  environment_data_isolation_check
  donation_offset_lock_confirmation_test
  non_public_goods_term_sheet_test
  marketplace_intake_triage_routing_test
  participant_ui_ux_progressive_disclosure_test
  participant_ui_render_snapshot_accessibility_test
  plain_language_copy_contract_test
  participant_task_card_simplification_test
  safe_template_default_disclosure_test
  public_moral_trade_page_simplification_test
  offset_creation_route_happy_path_test
  worked_example_card_simplification_test
  technical_detail_progressive_disclosure_test
  counterparty_blinding_staged_disclosure_test
  recipient_acceptance_association_test
  ai_preference_elicitation_boundary_test
  post_clear_audit_sampling_test
  public_receipt_card_publication_test
  public_receipt_causal_wording_and_reuse_test
  public_receipt_net_personal_contribution_test
  public_receipt_anti_gamification_test
  public_receipt_authenticity_revocation_test
  public_receipt_social_pressure_sensitive_action_test
  approved_trade_template_parameter_test
  review_capacity_admission_queue_test
  non_public_goods_subsidy_schedule_test
  direct_pair_clearing_test
  cause_bucket_taxonomy_review_test
  resource_compatibility_assessment_test
  net_offset_accounting_test
  pledge_swap_performance_terms_test
  behavioral_micro_pledge_duration_test
  behavioral_micro_pledge_evidence_ladder_test
  behavioral_micro_pledge_unit_baseline_test
  micro_pledge_sequence_cumulative_cap_test
  food_abstention_health_safety_boundary_test
  behavioral_micro_pledge_low_stakes_cap_test
  micro_pledge_unit_settlement_test
  micro_pledge_preperformance_lock_test
  commitment_inventory_double_count_test
  atomic_settlement_group_test
  pledge_swap_synchronized_performance_test
  compensated_moral_action_terms_test
  negative_commitment_substitution_test
  irreversible_action_gate_test
  donor_of_record_tax_receipt_test
  third_party_obligation_assessment_test
  baseline_integrity_manufacturing_test
  compensated_action_classification_test
  agreement_amendment_confirmation_test
  anti_corruption_improper_inducement_test
  representative_authority_verification_test
  protected_reporting_non_suppression_test
  civil_rights_discrimination_test
  participant_autonomy_undue_influence_test
  confidentiality_privacy_rights_test
  evidence_authenticity_synthetic_media_test
  financial_crime_fraud_screening_test
  agreement_non_transferability_test
  regulated_goods_hazardous_activity_test
  cyber_abuse_digital_systems_integrity_test
  noncompensable_safety_blocker_test
  offer_expiry_staleness_test
  batch_clearing_objective_fairness_test
  privacy_preserving_verification_attestation_test
  non_public_goods_tier_scope_test
  counterfactual_trust_class_test
  closed_counterparty_pledge_swap_test
  control_applicability_matrix_test
  private_exchange_rate_quote_test
  market_simulation_red_team_test
  pilot_exit_criteria_test
  option_set_pareto_comparison_test
  preference_incomparability_noncardinal_test
  trade_burden_accounting_test
  moral_difference_attestation_test
  bargaining_protocol_anti_holdup_test
  empirical_assumption_snapshot_test
  moral_side_constraint_agent_relative_test
  intrapersonal_self_offset_classification_test
  pledge_performance_bond_neutral_forfeiture_test
```

Each requirement in `release_gate_requirements` must resolve to a first-class `release_gate_requirement_result` or an equivalent frozen requirement-result bundle. A release gate is not approved merely because its parent `release_gate` row says `approved`; every required check for the requested stage must be `passed`, `not_required_for_stage` under a frozen policy, or explicitly `waived` by a privileged neutral-review decision with reason codes. Missing, stale, unmapped, or silently waived requirement results fail closed.

Start by integrating the external CRECM module only through the boundary specified by `moralpublicgoods102.md`; do not reproduce its mechanism here. Donation offsets and pledge swaps may be visible as templates and previews, but should not become payable or reliance-bearing until the relevant release gate has passed. This keeps the build aligned with the trust-first posture of the current site while still allowing the marketplace to become usable.

### Implementation posture: vertical slices and fail-closed stubs

Do not attempt to build the entire governance/control-plane matrix before shipping a small reviewed path. Implement in vertical slices:

```text
vertical_slice_0: demo data only, no auth-required money movement
vertical_slice_1: external CRECM-module preview integration only; no duplicated public-goods mechanism in this brief
vertical_slice_2: reviewed no-money/manual-evidence CRECM integration boundary only
vertical_slice_3: capped real-money CRECM module handoff only after the CRECM release gate defined in `moralpublicgoods102.md` passes
vertical_slice_4: donation-offset preview, marketplace-intake triage routing, participant-facing guided flow, UI render snapshot/accessibility check, plain-language copy contract, participant task-card/stepper simplification, safe-template-default disclosure, route-level public-page simplification audit for /offers/new?mode=offset, /offers, /donation-offsets, /pledge-swaps, /moral-trade, /how-it-works, /validation, and /paid-action-offers, canonical participant term-sheet preview, counterparty-blinding/staged-disclosure plan, recipient-acceptance/adverse-association check, AI-assisted preference-elicitation boundary check, approved-template and parameter-bound preview, review-capacity/admission check, non-public-goods subsidy schedule preview, direct-pair clearing preview, cause-bucket taxonomy review, resource-compatibility assessment, net-offset accounting, non-public-goods tier-scope check, counterfactual-trust-class assessment, noncompensable-safety-blocker check, offer-expiry/staleness check, commitment-inventory reservation, ratio-bounded batch-clearing dry run with frozen clearing objective and fairness/tie-break policy, private exchange-rate quote preview, control-pack gating, privacy-preserving verification-attestation option for sensitive evidence, market-simulation/red-team dry run, pilot-exit criteria preview, post-clear audit sampling plan, opt-in public receipt card preview with net-personal-contribution attribution for completed-trade surfaces, public-receipt anti-gamification and authenticity/revocation preview, sensitive-action receipt-redaction preview, direct-donation-parity no-ranking check, atomic all-or-none settlement preview, and final lock proposal with no capture
vertical_slice_5: pledge-swap template, behavioral micro-pledge duration defaults for one meal / a few meals / one day / a few days, unit-specific no-trade-baseline/additionality capture, cumulative micro-pledge sequence caps, food-abstention health-safety boundary check, micro-pledge evidence-ladder and per-unit amount-band defaults, low-stakes donation/bond caps, per-unit settlement defaults, pre-performance meal/action-window lock, no-auto-rollover sequence rule, marketplace-intake triage routing, participant-facing guided flow, UI render snapshot/accessibility check, plain-language copy contract, participant task-card/stepper simplification, safe-template-default disclosure, route-level public-page simplification audit for /offers/new?mode=offset, /offers, /donation-offsets, /pledge-swaps, /moral-trade, /how-it-works, /validation, and /paid-action-offers, canonical participant term-sheet preview, counterparty-blinding/staged-disclosure plan, AI-assisted preference-elicitation boundary check, approved-template and parameter-bound preview, review-capacity/admission check, direct-pair or closed-counterparty clearing preview, cause-bucket taxonomy review, resource-compatibility assessment, non-public-goods tier-scope check, closed-counterparty/default-known-counterparty mode, counterfactual-trust-class assessment, noncompensable-safety-blocker check, offer-expiry/staleness and renewal check, baseline-integrity check, compensated moral-action terms and ordinary-service classification, negative/abstention commitment scope, net-offset accounting where an abstention or cancellation claim is part of the swap, action reversibility gate, third-party-obligation assessment, representative/agent-authority assessment, protected-reporting/non-suppression assessment, civil-rights/discrimination assessment, participant-autonomy/coercion-undue-influence assessment, confidentiality/privacy-rights assessment, evidence-authenticity/synthetic-media assessment, privacy-preserving verification-attestation option for sensitive evidence, financial-crime/fraud/source-of-funds screening, agreement non-transferability/anti-securitization screening, regulated-goods/hazardous-activity screening, cyber-abuse/digital-systems-integrity screening, option-set/Pareto-comparison preview, preference-incomparability/noncardinal handling, trade-burden accounting, moral-difference attestation, bargaining-protocol and anti-holdup screening, empirical-assumption snapshotting, private exchange-rate quote handling, risk-control-pack/control-applicability gating, market-simulation/red-team evidence, pilot-exit criteria, moral side-constraint/agent-relative-limit capture, intrapersonal/self-offset classification, anti-corruption/process-integrity screening, optional refundable pledge-performance-bond preview, synchronized performance schedule, post-lock amendment preview, post-clear audit sampling plan, opt-in public receipt card preview with net-personal-contribution attribution for completed-trade surfaces, public-receipt anti-gamification and authenticity/revocation preview, sensitive-action receipt-redaction preview, direct-donation-parity no-ranking check, least-intrusive verification plan, and manual-review preview
```

For controls that are not yet implemented in a given slice, create explicit fail-closed policy snapshots, visible blocker states, and reviewer-console rows rather than leaving implicit TODOs. A feature may be usable only when all controls required for that release stage are implemented or intentionally marked `not_required_for_stage` by a frozen policy snapshot. This keeps the first implementation shippable without weakening the safety, privacy, anti-threat, and provenance model.

This also creates a control-plane complexity budget. Codex should not materialize every inactive-stage table, workflow, and reviewer tool before the first preview can run. For each vertical slice, implement only the controls required for that slice as real production records; represent later-stage controls as typed fail-closed stubs or frozen `not_required_for_stage` policy decisions with visible blocker rows. A control may move from stub to production only when its subject type, policy snapshot, reviewer decision path, audit trail, and regression tests are implemented for that release stage.

Internal governance complexity must stay mostly behind the reviewer/operator surface. User-facing pages should not display raw policy names, internal state enums, reviewer notes, source hashes, or security/audit jargon as the primary explanation for a block. Every user-visible blocker should map to a plain-language status, a safe reason category, the user's next available action, and the relevant appeal/correction path where one exists.


### Non-public-goods launch tiers and control-pack architecture

For the non-public-goods marketplace tracks, separate the core exchange kernel from the safety/control plane. The exchange kernel should know only the frozen parties, baseline snapshots, matched terms, amount or action unit, counterparty bucket, evidence plan, settlement group, and participant confirmations. The control plane should attach a versioned bundle of required reviews, blockers, and policy states to that kernel. This avoids making every future review category a hard-coded column on every trade table while preserving the fail-closed behavior required by the rest of this brief.

Every non-public-goods lock should also produce a canonical participant term sheet. This is not a legal contract or an escrow claim; it is the user-facing frozen summary of the exact terms the participant is confirming. It should show, in plain language, what the participant will do, what the counterparty or batch must do, the maximum exposure, clearing ratio, destination, evidence standard, privacy disclosures, cancellation/refund rule, residual obligations, material deadlines, and the non-legal/non-tax disclaimer. The final confirmation must reference the term-sheet hash, not only an internal terms snapshot.

Use counterparty blinding and staged disclosure as the default for non-public-goods trades. Before lock, the system may reveal coarse counterparty bucket, matched-volume band, review status, and evidence feasibility, but it should not reveal counterparty identity, exact caps, private notes, direct contact details, private surplus estimates, or rare cause-bucket combinations unless the frozen disclosure policy, privacy grants, and user-safety review allow it. This reduces cap leakage, retaliation, harassment, and threat-like bargaining while preserving enough information for participant surplus confirmation.

Recipient acceptance and adverse-association review should be first-class for donation offsets. If a compromise destination, fiscal host, charity, evaluator, or project would be publicly named, bound by restrictions, asked to provide milestone evidence, used in marketing, or associated with a controversial offset pair, the recipient or authorized representative must accept the relevant terms or the public association must remain redacted. Verified payment destination alone is not consent to public moral-trade framing.

AI assistance may help participants elicit their own preferences, side constraints, empirical assumptions, and acceptable parameter ranges, but only in a sandboxed preference-elicitation mode. The output must become user-edited structured input, a participant confirmation, or a reviewer decision before it affects matching, clearing, disclosure, or payment. AI-generated willingness-to-pay estimates, moral rankings, hidden negotiation moves, or automatically accepted counteroffers remain prohibited.

After completion, run a privacy-safe post-clear audit sample for non-public-goods pilots. The audit should check whether baselines, evidence, recipient acceptance, disclosure, payment state, classification, and user-facing term sheets matched the frozen record. It should feed aggregate template and policy improvements, not create public moral reputation or retroactive obligations unless the frozen dispute, fraud, or refund policy authorizes a specific correction.

After a non-public-goods trade is completed and any required challenge window, reconciliation, post-clear audit trigger, recipient-acceptance/adverse-association review, public-metric-release policy, and content-moderation checks are non-blocking, offer the participant an **opt-in shareable public receipt card**. The card is a verified contribution receipt, not a good-person badge, moral reputation score, leaderboard entry, or platform moral endorsement. It should separate the participant's personal verified contribution from any trade-conditioned contribution and from the total verified recipient transfer. Use the label **trade-conditioned contribution** by default; use **trade-unlocked contribution** only when baseline, additionality, counterfactual-trust, and evidence reviews support the stronger causal wording under the frozen public-receipt-card policy. It may support social sharing and profile display only through explicit participant approval, privacy-safe redaction, small-cell/public-metric checks where applicable, and revocation/unpublish behavior under the frozen publication policy.

Public receipt cards need a claim-hygiene layer. The card may say `verified`, `recipient transfer`, `trade-conditioned`, or `trade-unlocked` only when the corresponding payment, evidence, reconciliation, challenge-window, recipient/destination, counterfactual-trust, and impact-claim records support that exact claim. It may say `additional` or `unlocked` only when baseline and additionality review for that contribution are non-blocking under the frozen policy; otherwise use neutral wording such as `trade-conditioned verified transfer`. The card must not conflate the participant's direct donation, the counterparty's donation, sponsor subsidy, platform fee coverage, pledged action, performance bond, or gross payment authorization. A direct-donation or direct-donation-parity claim must be new, reconciled, and reserved to that receipt or agreement; old donations, separately publicized donations, employer matches, donor-advised-fund credits, or receipts already counted elsewhere must be excluded from parity display or clearly disclosed as already counted under the frozen policy.

Public receipt publication must also avoid turning contribution records into a status game. Do not display likes, reactions, applause counts, share counts, public streaks, percentile badges, trending modules, receipt-count leaderboards, comparative rankings, public-profile boosts, search-ranking boosts, match priority, review priority, recommendation ranking, follower-growth loops, or engagement-feed optimization derived from receipt publication, receipt amount, or receipt volume. Default publication should be unlisted or profile-opt-in rather than search-indexed; a receipt may have a verification page, but that page should verify the stated claims without creating social pressure, engagement loops, or moral reputation.

A canonical card should look like:

```text
Verified Moral Trade Completed

Alice completed a verified moral trade.

Personal contribution:
$100 direct donation to Against Malaria Foundation

Trade-conditioned contribution:
$100 verified counterparty donation conditioned on the trade

Causal wording:
Displayed as trade-unlocked only if the additionality/counterfactual review permits that stronger claim

Total verified recipient transfer:
$200 to Against Malaria Foundation

Trade type:
Cross-view donation offset

Verification:
Recipient verified; payment verified; no unresolved challenge.

Platform note:
This is a verified contribution record, not a moral score or global ranking.
```

Allow an optional **direct-donation parity mode** for users who want the public signal of ordinary donation plus the additional signal of moral trade. In that mode, the participant can add a direct co-donation, donate compensation onward, or cover fees; the receipt must show these as separate verified facts rather than implying that counterparty funds were personally donated by that participant. Direct-donation parity mode should also show whether the direct contribution is new to this agreement, independently made but newly linked, or excluded from parity display because it was already counted elsewhere. If the parity donation would have happened anyway or is not separately verified, the card must label it as an ordinary verified personal donation or exclude it from parity claims rather than presenting it as moral-trade-generated surplus. Direct-donation parity must remain a user-selected add-on, not a default, recommendation, access condition, matching advantage, review-priority advantage, or platform statement that the participant is more morally admirable than someone who completed a non-public receipt or non-parity trade.

For public signaling, distinguish **gross transfer**, **net personal contribution**, and **trade-conditioned or trade-unlocked contribution**. If a participant's apparent direct donation was reimbursed, subsidized, refunded, offset by compensation, funded by a counterparty, funded by an employer match or donor-advised-fund credit, or tied to a side benefit, the receipt must disclose or suppress the affected personal-contribution claim. When net personal contribution is uncertain or disputed, the card should use a qualified label or omit the personal-contribution line rather than presenting it as donation-equivalent sacrifice.


For personal-behavior pledge swaps, especially food-abstention micro-pledges, public receipts should default to coarse action labels such as `verified micro-pledge completed` plus the verified recipient transfer. Exact behavior details such as no-meat, vegetarian, diet, health, family, religious, political, or lifestyle terms require a separate public-action-disclosure confirmation, non-blocking privacy/autonomy review, and content-moderation approval. The participant can still keep the receipt private or publish only the verified transfer side of the trade.

Make public receipts tamper-resistant and correctable. A static image or screenshot is not the source of truth; every share card should include a privacy-safe verification URL or equivalent verification handle, issued-at time, current status, and correction/revocation state. If a receipt is corrected, revoked, superseded, suppressed, or no longer satisfies publication policy, the public verification page must show a safe status without exposing private evidence or counterparty data. A counterparty, sponsor, or reviewer must not require public receipt publication as a term of matching, payout, compensation, evidence acceptance, or dispute resolution.

Use a tiered launch model for non-public-goods moral trade:

```text
non_public_goods_market_tier:
  tier_1_money_only_donation_offset
  tier_2_donation_offset_with_abstention_or_additionality_proof
  tier_3_closed_counterparty_pledge_swap
  tier_4_open_market_pledge_swap_or_compensated_action
```

The default payable/reliance-bearing launch target is `tier_1_money_only_donation_offset`: short-horizon, money-only donation-offset batch clearing to verified recipient/payment destinations, with no behavioral pledge, no political/electoral flow, no open-ended abstention surveillance, and no compensation for personal behavior. `tier_2` may be a capped manual pilot only when abstention or additionality proof is claim-typed and minimally intrusive. `tier_3` may be preview/manual-review only with user-supplied or closed/invite-only counterparties. `tier_4` remains disabled or sandbox-only until specific governance approval. This is not a retreat from Toby-Ord moral trade; it is a counterfactual-trust staging rule.

For food-abstention or similar personal-behavior pledge swaps, default templates should be **micro-pledges**: one meal, a few meals, one day, or a few days. A 30-day no-meat pledge, month-long vegetarian challenge, or open-ended diet pledge is not the default product shape; it is either an explicit manual-review exception or a sequence of separately confirmed micro-pledges. Prefer shorter units because factual trust, counterfactual trust, evidence burden, and privacy risk degrade as duration increases. Longer-duration variants require renewed confirmation, explicit counterfactual-trust review, evidence-burden review, and reviewer approval before they become reliance-bearing.

For behavioral micro-pledges, keep the default economic stakes small and legible. The approved template should freeze a per-unit donation or compensation cap, a sequence-total cap, any performance-bond cap, and whether personal cash compensation is allowed. Food-abstention micro-pledges should normally route value to a verified charity or cause selected in the trade rather than pay unrestricted personal cash to the performer; personal cash compensation, high per-unit amounts, or escalating bonuses are higher-risk compensated-action terms and remain manual-review unless the frozen policy explicitly permits them.

Micro-pledge sequences should settle unit-by-unit by default. A sequence of five meat-free lunches should normally be five separately confirmable units with independent evidence checkpoints and per-unit release/cancellation behavior, not a hidden five-day all-or-nothing obligation. If a sponsor or counterparty wants all-or-nothing settlement, the preview must say this plainly, show the extra burden and failure consequences, and require renewed confirmation. Extensions and repeat sequences must not auto-renew.

For behavioral micro-pledges, use an evidence ladder rather than a surveillance default. Low-stakes one-meal or one-day food-abstention templates should default to participant self-attestation plus optional lightweight corroboration; meal photos, receipts, third-party witness statements, or reviewer-visible artifacts should be optional, challenge-triggered, or amount/duration-triggered rather than required by default. The template should also freeze per-unit amount bands and sequence caps. Above-band donations, performance bonds, repeated extensions, or high cumulative burdens route to manual review. Micro-pledge sequences must not auto-roll over; every new unit or batch of units needs a clear renewal confirmation that shows cumulative money, evidence burden, privacy burden, and remaining counterfactual uncertainty.

For behavioral micro-pledges, especially food-abstention pledges, require **pre-performance lock**. A meal-level or day-level pledge must be frozen before the covered meal or day begins, using server-side time and a participant-facing term sheet. Retroactive claims such as “I already ate vegetarian yesterday; please count it” may be stored as self-offset evidence or personal bookkeeping, but must not become completed Toby-Ord moral trade unless the frozen policy explicitly allowed an advance schedule and all counterparties saw that schedule before reliance. Each micro-pledge window should have a start time, end time, pre-performance confirmation, post-performance attestation/evidence deadline, challenge window, and fallback/cancellation rule.

Use a template-first launch posture for non-public-goods trades. A donation offset, pledge swap, or compensated moral-action agreement can become reliance-bearing only if it conforms to an approved trade template and frozen parameter policy for the relevant tier, or if a neutral reviewer explicitly approves an off-template exception. The template should freeze the allowed trade type, recipient/destination class, eligible cause buckets, amount/action-unit range, evidence claim types, challenge windows, cancellation rule, required control pack, and for behavioral pledges the allowed action-unit granularity, default duration range, evidence ladder, per-unit amount band, sequence cap, no-auto-rollover rule, unit-specific baseline requirement, cumulative sequence cap, and food-abstention health-safety boundary. User free text may explain the trade, but it must not create new obligations, new evidence standards, new side payments, new durations, or new counterparties outside the approved parameter envelope.

Treat reviewer attention as a scarce safety-critical resource. Before a non-public-goods offer can be presented as live, matchable, payable, or reliance-bearing, the relevant release stage must have a review-capacity policy, queue-admission rule, and visible user-facing queue status. If the queue is beyond policy, if no eligible reviewer or neutral panel is available, or if the estimated review delay would make baselines or payment authorizations stale, the system should waitlist, expire, or keep the offer in preview rather than silently accumulating unreviewed moral-trade promises.

Allow sponsor-funded non-public-goods clearing subsidies only as governed bridge mechanisms for low-risk donation-offset tiers. A subsidy may reduce the effective price of a cleared donation-offset trade or fund a small fixed bonus for verified clearing, but the source, budget, eligibility rule, cap, allocation schedule, public disclosure level, and refund/carry-forward rule must be frozen before the relevant clearing run. Subsidy dollars are mechanism support, not participant moral-trade volume, moral impact, or a platform moral endorsement of either cause.

Within `tier_1`, support a direct-pair clearing mode as a special case of the same exchange kernel. A participant may invite a known counterparty into a two-party donation-offset preview, or two participants may co-create a shared lock proposal, before the platform attempts wider batch clearing. Direct-pair clearing is not a background-networking feature and must not introduce autonomous outreach; it simply gives low-liquidity pilots a one-to-one path consistent with Ord's simple-market examples while preserving all lock, review, privacy, and payment gates. Batch clearing remains the scalable path once there is enough liquidity.

Use a versioned, plural-reviewed cause-bucket taxonomy for offered causes, opposed causes, compromise destinations, and action buckets. The taxonomy is a coordination interface, not a platform ideology map: it must use coarse self-declared buckets, avoid protected traits and inferred psychology, record taxonomy-version hashes, and allow participants to see when a trade's moral-difference classification depends on a taxonomy assignment. Taxonomy changes after preview are material changes if they affect counterparty distinctness, trade classification, clearing ratio, or eligible counterparties.

Before lock, require a resource-compatibility or joint-feasibility assessment for non-public-goods trades. A proposed trade should not clear merely because each party likes some part of it; the actions, donations, abstentions, destinations, timing, and control claims must be jointly feasible and not mutually exclusive in a way that destroys the asserted gains from trade. Where the only apparent gain comes from both parties claiming the same scarce control right, blocking each other's action, or relabeling a zero-sum conflict as a compromise, the trade remains preview/manual-review only.


Represent control-plane requirements through a `risk_control_pack` and `control_applicability_matrix`. The long field lists below are logical contracts for what must be knowable, reviewable, and testable; they are not a command to denormalize every blocker into every production table. A runtime transition is allowed only if the applicable control pack resolves every required control to `passed`, `not_required_for_stage`, or an explicit privileged neutral-review waiver. Unknown, missing, stale, duplicated, or unmapped controls fail closed.

Do not publish a general moral exchange rate between causes, duties, or actions. Clearing ratios, side payments, and acceptable counterpart volumes are participant-owned, private bargaining terms tied to the specific frozen trade. Public surfaces may say that a trade cleared within each participant's stated bounds, but must not display a cause-price table, moral exchange-rate chart, or leaderboard that implies platform endorsement of a moral conversion rate.

Treat safety, legality, privacy, third-party-rights, process-integrity, and anti-threat blockers as constraints, not as prices. A participant may choose among morally permissible options and may waive only their own waivable interests under the relevant policy; they may not pay, bargain, bond, or side-agree their way around a blocker protecting nonparticipants, truthful reporting, civil rights, confidentiality, legal compliance, digital systems, or institutional process integrity. Any attempted compensation for a blocking control is itself a reviewable signal.

Give non-public-goods offers a short, explicit validity window. Counterfactual trust decays when baselines, evidence methods, empirical assumptions, payment credentials, jurisdictions, or counterparties go stale. Donation-offset and pledge-swap offers should therefore expire or require renewal confirmation before they can be matched, locked, captured, publicly counted, or used as evidence of market liquidity.

For donation-offset batch clearing, make the clearing objective explicit before the run. The system should optimize only over participant-confirmed constraints, verified eligibility, safety gates, and a frozen objective such as maximizing confirmed matched volume, maximizing participant count subject to caps, or minimizing unmatched residuals. Tie-breaking, pro-rata treatment, and remainder handling must be deterministic and must not use moral scores, public pressure, private willingness-to-pay leakage, operator preference, or database order.

Where evidence is sensitive but verification is valuable, prefer privacy-preserving attestations over raw disclosure. A neutral reviewer, approved verifier, or confidential-monitoring tool may inspect private data only under a privacy grant and produce a claim-typed attestation with uncertainty, scope, and challenge rights; counterparties should normally see the attestation result rather than the underlying private artifacts.

Before any non-public-goods tier becomes payable or reliance-bearing, run synthetic market simulations and red-team exercises covering thin-market failures, holdup, baseline manufacturing, fake evidence, privacy leakage, side agreements, counterparty nonperformance, and threat-like offers. Each pilot needs pre-registered scale-up, pause, and rollback criteria; success is not merely “more matches,” but more verified mutually acceptable moral trade with tolerable safety, privacy, legal, and review costs.

---

## Non-negotiable invariants

Do not regress these existing site commitments:

- No global moral ranking.
- No “moral reputation” affecting matching priority, clearing priority, or allocation power in any external module.
- Anti-threat and prohibited-content screening remains a blocking gate.
- Offer text, templates, profile copy, public descriptions, evidence filenames/previews, reviewer-visible notes, invite-link text, and impact-claim copy must pass content-moderation/prohibited-use screening before they can become public, reliance-bearing, payable, or reviewer-actionable. Content moderation is separate from moral ranking: it blocks illegal, coercive, deceptive, hateful, doxxing, self-harm, malware, sexual exploitation, extremist, spam, or otherwise prohibited use, not unpopular moral views.
- Non-public-goods live offers must be template-bounded by default. A donation offset, pledge swap, compensated moral-action agreement, performance-bond condition, or side agreement cannot become locked, payable, reliance-bearing, or publicly counted as completed merely because a user wrote free-form terms; it must conform to an approved template and frozen parameter policy, or receive an explicit off-template reviewer decision with renewed participant confirmation.
- Action evidence, baseline good-faith review, baseline confidence, baseline integrity/manufacturing review, additionality review, and externality review stay separate. A self-attested no-trade baseline is not treated as certain merely because it is good-faith; low-confidence baselines trigger manual review or preview-only handling rather than automatic clearing.
- Baselines must not be manufactured or escalated in order to extract concessions. If a participant adopts, enlarges, delays, or publicizes a harmful or opposed no-trade baseline only after entering the marketplace or learning of likely counterparties, the offer remains draft/preview-only until a baseline-integrity assessment is non-blocking. Baseline integrity is not a moral ranking; it is an anti-threat and counterfactual-trust control.
- Evidence must be claim-typed and scoped: proof that an action happened, proof of payment or destination, proof relevant to baseline/additionality, proof relevant to externalities, and proof relevant to legal/jurisdiction review are distinct evidence claims with distinct standards. Accepting one claim must not automatically satisfy another.
- Evidence authenticity and provenance must be evaluated separately from the claim that the evidence is meant to support. User-submitted screenshots, receipts, photos, videos, messages, location logs, attestations, and exported platform data must not be treated as reliable merely because they are uploaded or hash-stored. If a record could be forged, AI-generated, selectively edited, replayed, or detached from its asserted source, the platform must require an evidence-authenticity/synthetic-media assessment before the evidence can satisfy action, abstention, payment, baseline, additionality, challenge, or bond-return/forfeiture claims.
- No autonomous outreach.
- Non-public-goods final confirmations must reference a canonical participant term sheet. A user cannot be bound by raw JSON, hidden policy state, reviewer shorthand, or an internal terms hash that has no participant-facing equivalent; the confirmed term sheet must be plain-language, privacy-safe, hash-backed, and scoped to the exact matched proposal.
- Counterparty disclosure is staged by default for donation offsets and pledge swaps. Coarse buckets and review-relevant bands may be shown before lock, but counterparty identity, direct contact, exact caps, private notes, rare bucket combinations, and private surplus information remain hidden until a frozen disclosure policy, privacy grant, user-safety review, and participant confirmation permit disclosure.
- Recipient or destination verification is not recipient consent to be publicly framed as part of a moral trade. If a recipient, fiscal host, evaluator, or project is publicly associated with a controversial offset pair, bound by restricted-use terms, asked for milestone evidence, or used in promotional copy, a recipient-acceptance/adverse-association record must be non-blocking or the association remains redacted/preview-only.
- AI-assisted preference elicitation may help users structure their own baselines, caps, side constraints, and empirical assumptions, but AI output cannot infer hidden willingness to pay, finalize trade terms, make counteroffers, accept matches, disclose private facts, or change state without explicit participant confirmation or reviewer decision.
- Completed non-public-goods trades are subject to privacy-safe post-clear audit sampling under a frozen audit policy. Sampling may correct fraud, payment, evidence, or classification errors under the frozen policy, but it must not create public moral reputation, retroactive moral blame, or new obligations not shown in the locked term sheet.
- Shareable public receipt cards are opt-in verified contribution records, not moral-status badges. A public receipt may show verified personal contribution, verified trade-conditioned contribution, verified trade-unlocked contribution only when the stronger causal claim is reviewed and permitted, total verified recipient transfer, trade type, verification state, and uncertainty/disclaimer text, but it must not say or imply that the participant is a good person, assign a moral score, create a moral leaderboard, inflate personal donation credit with counterparty funds, relabel old or reused donations as new direct-donation parity, expose private evidence or counterparty data, or publish recipient association without the required recipient-acceptance/adverse-association and privacy-publication checks. Public receipt cards must use claim-hygiene rules: `additional`, `unlocked`, `matched`, `completed`, `verified`, and `impact` language must each be backed by the corresponding reviewed claim record and policy snapshot. They must not display likes, share counts, streaks, percentile badges, trending modules, or profile boosts that convert verified contribution facts into competitive moral status.
- Public receipt cards must not become engagement or reputation infrastructure. Receipt publication, receipt count, receipt amount, direct-donation parity use, share-card clicks, profile views, likes, reactions, reposts, or external-share counts must not affect matching, clearing, search ranking, profile amplification, recommendation order, review priority, allocation power in any external module, or user status. If social metrics are collected for abuse/debugging, they remain private, bucketed, and excluded from public UI and matching logic.
- Public receipt publication cannot be a trade term. A counterparty, sponsor, recipient, reviewer, or operator must not require a participant to publish a receipt card, keep it public, include a personal note, reveal identity, or disclose raw evidence as a condition of matching, payout, compensation, evidence acceptance, dispute resolution, or public completion. Receipt-card publication is post-completion, opt-in, revocable where policy allows, and governed by a separate privacy-publication confirmation.
- Static public receipt images are not authoritative records. Each receipt card must include or resolve to a privacy-safe verification URL or handle with issued-at time, current publication state, correction/revocation/supersession state, and reviewed claim scope. Screenshots, copied card images, or stale social previews must not be treated as evidence of current completion, current recipient status, or current impact claims.
- Direct-donation parity mode is optional and non-preferential. The platform must not preselect it, shame users for declining it, describe parity users as morally better, or let direct-donation parity affect matching priority, review priority, eligibility, public search ordering, receipt prominence, or future marketplace access.
- Public receipts for personal-behavior pledge swaps default to coarse/generic action descriptions. Exact food, diet, health, family, religious, political, lifestyle, or other sensitive behavior details may be published only after separate explicit publication consent and non-blocking privacy, autonomy, content-moderation, and user-safety review; users may publish a transfer-only or generic-action receipt instead.
- For donation offsets and pledge swaps, a match candidate is not a deal. Before any donation offset or pledge swap becomes locked, payable, reliance-bearing, or publicly counted as completed, the system must create a matched-trade lock proposal that freezes the matched counterparties or counterparty bucket, exact matched volume, clearing ratio, destination, evidence standards, deadline, no-trade-baseline snapshots, residual obligations, and fallback/cancellation terms. Each participant must then give a fresh final lock confirmation against that frozen proposal. No unilateral substitution of counterparty, ratio, action, evidence standard, deadline, baseline, or destination may occur after final confirmation without creating a superseding proposal and renewed confirmations.
- Post-lock changes require an explicit amendment path. A participant, reviewer, operator, or system job must not silently amend a locked donation offset or pledge swap by editing parent records. Any material change to amount, ratio, counterparty bucket, compensation, action unit, evidence standard, deadline, baseline, remedy, privacy disclosure, destination, donor-of-record treatment, or third-party-obligation status requires an `agreement_amendment_record`, renewed confirmations from affected participants, and neutral review where the change shifts burdens or benefits.
- Donation-offset clearing must support explicitly ratio-bounded clearing rather than assuming every opposed donation offsets one-for-one. Participants may set acceptable clearing-ratio bounds and minimum/maximum exposure; if the final matched ratio is outside either participant’s bounds, the trade stays preview-only or fails closed. Ratio fields are descriptive bargaining terms, not platform moral-effectiveness judgments.
- Direct-pair clearing is allowed only as a two-party or invite-linked special case of donation-offset or pledge-swap clearing. It must not bypass matched-trade lock proposals, participant confirmations, counterparty consent, user-safety limits, privacy grants, review gates, payment gates, or no-autonomous-outreach rules.
- Cause buckets, counterparty buckets, compromise-destination buckets, and action buckets must come from a versioned, plural-reviewed taxonomy. Bucket assignments are coordination labels, not moral rankings or public ideology labels; taxonomy changes that affect matching, classification, distinctness, or eligible counterparties require a new preview and renewed confirmation.
- Donation-offset claims must be net-of-offset, not gross-volume claims. A compromise donation or matched transfer does not prove that the opposed donation, action, or substitute channel was reduced; the canceled amount, residual opposed action, and evidence standard must be recorded separately before moral-trade volume or completion can be counted.
- Review capacity is a release and matching constraint, not an internal operations detail. If the relevant reviewer, neutral panel, verifier, or support capacity is exhausted or stale under the frozen review-capacity policy, new non-public-goods offers stay draft/preview/waitlisted, existing previews show a queue status, and no capture, disclosure, reliance-bearing lock, or completed-agreement count may proceed merely because the user has submitted terms.
- Sponsor-funded donation-offset subsidies are optional governed mechanism inputs, not moral prices. Subsidy eligibility, caps, allocation order, source-of-funds review, conflict review, and public disclosure level must be frozen before clearing; subsidy funds cannot compensate noncompensable blockers, subsidize higher-risk tiers by implication, or inflate participant contribution, moral-trade volume, impact, or counterparty distinctness metrics.
- Non-public-goods trades require resource-compatibility and joint-feasibility review where actions, abstentions, destinations, timing, or scarce control claims might be mutually exclusive. A transaction that merely repackages an unresolved zero-sum conflict, blocks one side's feasible action, or depends on incompatible duties remains preview/manual-review only.
- Pledge-swap offers must define the promised action enough that “performed,” “partially performed,” “cured,” “breached,” and “released from future obligations” are reviewable without inventing terms after the fact. Required terms include action unit, frequency or deadline, minimum performance threshold, material-breach rule, grace/cure rule where allowed, partial-performance handling, evidence due dates, and reciprocal release for future obligations.
- Food-abstention and similar personal-behavior pledge swaps must be unitized by default. For no-meat or vegetarian commitments, the default templates are one meal, a few meals, one day, or a few days; week-long, month-long, 30-day, or open-ended variants remain preview/manual-review-only unless a frozen policy approves them as a sequence of separately confirmed micro-pledges or as an explicit longer-duration exception. Do not use a 30-day no-meat pledge as the default UI exemplar or default payable template.
- Food-abstention micro-pledges require unit-specific baseline and additionality review. A one-meal pledge counts as moral trade only if the participant represents that the specific meal would likely have included the covered food absent the trade, and that claim is not blocked by baseline-integrity, counterfactual-trust, or evidence review. Broad dietary history may support the baseline, but it cannot substitute for the unit-specific no-trade comparison.
- Micro-pledge sequences must not be used to bypass longer-duration controls. If repeated one-meal, few-meal, one-day, or few-day pledges exceed the frozen rolling-window duration, payout, evidence-burden, or privacy-burden cap, the sequence becomes stale/manual-review until renewed confirmation, cumulative counterfactual-trust review, and reviewer approval are non-blocking.
- Food-abstention templates must stay within a health-safety boundary. They must not solicit fasting, purging, weight-loss, calorie restriction, medically risky diet changes, body-image challenges, or eating-disorder-adjacent behavior; they should ask for ordinary adequate meals with allowed substitutions and route medically sensitive, minor, dependency, coercion, or high-burden cases to preview/manual review.
- Behavioral micro-pledge evidence must default to the least intrusive evidence ladder compatible with the pledge unit and amount. For low-stakes food-abstention micro-pledges, self-attestation plus optional lightweight corroboration is the default; meal photos, receipts, third-party witness statements, location/device data, or continuous monitoring must not be default requirements. Evidence burden may escalate only under a frozen policy based on duration, amount, challenge, repeated dispute, or reviewer decision, and must be disclosed before lock.
- Behavioral micro-pledges must be locked before the covered action window begins. A meal, few-meal, one-day, or few-day pledge needs a `micro_pledge_window_record` or equivalent frozen window with server-side start/end time, pre-performance confirmation, post-performance attestation/evidence deadline, and challenge rule. Retroactive food-abstention claims may support personal bookkeeping or reviewer context, but they cannot by themselves create payable, reliance-bearing, or completed moral-trade status.
- Behavioral micro-pledge sequences must not auto-renew or use streak pressure. Each additional unit or batch of units requires renewed confirmation showing cumulative payment exposure, cumulative evidence burden, privacy burden, opt-out/release rule, and remaining counterfactual uncertainty. Sequence caps, per-unit amount bands, and above-band manual-review triggers must be frozen before the first unit can become reliance-bearing.
- Verification demands for donation offsets and pledge swaps must follow a least-intrusive-sufficient-evidence rule. The platform must not require or encourage invasive surveillance, public shaming, unnecessary location tracking, protected-trait disclosure, biometric/device telemetry, private medical/immigration/employment records, or third-party exposure when less intrusive evidence can satisfy the relevant claim type. High-burden or privacy-sensitive evidence plans require reviewer approval and user-facing disclosure before lock.
- Donation-offset and pledge-swap commitments must not be double-counted. A planned donation, abstention, promised action, payment authorization, evidence artifact, or no-trade baseline capacity can satisfy only one locked moral-trade agreement unless every affected participant sees and confirms an explicit multi-counterparty or pooled-use policy. The same $100 planned donation, the same one-day/few-meal vegetarian pledge or the same approved longer-duration sequence, the same abstention from an opposed donation, or the same evidence artifact must not be sold, offset, or counted repeatedly across separate trades without reservation records and renewed confirmations.
- Donation-offset and pledge-swap settlement must be atomic at the matched-trade-lock boundary. If a matched batch requires N participants, then the proposal locks, authorizes, captures, and becomes reliance-bearing only if all required participants have non-stale final confirmations and, where relevant, valid payment authorizations. If any required participant declines, expires, fails eligibility, fails authorization, or becomes blocked before lock, the group expires or recomputes; the platform must not capture one side, disclose one side, or induce irreversible performance while the reciprocal side is not locked.
- Pledge-swap performance over time must be synchronized and staged. A continuing pledge swap needs a performance schedule stating when each side's duties start, when checkpoints occur, what happens if one side is late, when obligations are suspended, and when future obligations are reciprocally released. Breach consequences must be pre-agreed, proportionate, and non-punitive; public shaming, moral reputation penalties, or public breach labels are prohibited unless separately lawful, consented, privacy-reviewed, and explicitly approved for that release stage.
- Optional pledge performance bonds may be used only as bounded factual-trust support for pledge swaps and compensated moral-action agreements. A bond is not a moral-reputation score, punishment mechanism, platform escrow claim, or proof of counterfactual additionality. The bond amount, posting method, return condition, forfeiture condition, forfeiture destination, challenge window, and neutral-review rule must be frozen before lock. If a counterparty financially or reputationally benefits from forfeiture, that counterparty may accept evidence or challenge it but must not be the final judge. Forfeiture must be neutral-review-gated, proportionate, non-punitive, and unavailable for high-stakes, coercive, unlawful, or irreversible personal decisions unless the exact release stage and legal review explicitly approve it.
- Compensated moral-action agreements are allowed only as a bounded, review-gated submode of pledge swaps. If one participant pays another to perform or abstain from an action, the platform must classify the trade as mixed moral trade only when the trade is made possible by the payer's moral aim and the performer's different moral/prudential weighting, freeze compensation terms before lock, and require legal/jurisdiction, labor/employment, tax/reporting, coercion, vulnerability/undue-inducement, ordinary-service/procurement, and externality review before it becomes payable or reliance-bearing. The platform must not create an open-ended gig-work market for morally controversial, hazardous, medical, immigration, employment, political/electoral, sexual, illegal, or high-pressure personal decisions.
- Negative or abstention commitments must be bounded and substitution-aware. A promise not to donate to an opposed cause, not to perform an action, or not to use an alternative channel must specify the covered action, time window, known affiliates/substitutes, excluded de minimis conduct, and evidence standard. Proof of a compromise donation is not by itself proof that the participant abstained from the opposed action; abstention confidence remains a separate claim and must use the least-intrusive feasible evidence.
- Irreversible or high-stakes pledged actions require a separate reversibility and harm assessment before lock. Actions that are hard to undo, affect employment, education, health, immigration, housing, finances, family relations, legal status, political rights, bodily autonomy, or third-party welfare must remain preview/manual-review only unless the frozen jurisdiction, externality, vulnerability, and action-reversibility policies explicitly approve the exact flow.
- Donation-offset flows must make donor-of-record, tax-receipt, and charitable-solicitation treatment explicit before lock. The platform must not imply that participants, counterparties, sponsors, or the platform receive tax deductibility unless a frozen policy and jurisdiction review support the claim. Tax receipts, donor-advised-fund credits, employer matches, commercial co-venture disclosures, and similar benefits must not be double-claimed or silently reassigned; they are operational/legal facts, not moral-trade volume or impact.
- Pledge swaps and compensated moral-action agreements must not induce breach of third-party obligations. If a requested action or abstention may conflict with an employment duty, fiduciary duty, professional obligation, school rule, contract, court order, confidentiality duty, intellectual-property restriction, family/care obligation, donor restriction, or other third-party right, the agreement remains preview/manual-review only until a bounded third-party-obligation assessment is non-blocking. The platform must not treat a participant's willingness to trade as authority to waive rights held by someone else.
- Participants may bind only themselves by default. If a participant claims to act for a company, charity, fiscal host, campaign, school, employer, client, patient, family member, informal group, account holder, donor-advised fund, or any other represented person or entity, the agreement remains draft/preview-only until a representative-authority assessment verifies the claimed authority for the exact action, amount, evidence disclosure, receipt/tax treatment, and time window. A self-attested moral reason is not authority to redirect another party's money, waive another party's rights, disclose another party's information, or promise another party's action.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, and side agreements must not buy silence, complaint withdrawal, false statements, evidence suppression, or noncooperation with legitimate safety, legal, platform, professional, academic, journalistic, or regulatory reporting. If a proposed action or negative commitment would require someone not to report misconduct, not to file or maintain a complaint, not to cooperate with a lawful or institutional investigation, not to submit truthful evidence, or not to disclose safety-relevant information, the agreement remains preview/manual-review only until a reporting-integrity assessment is non-blocking. The platform must not treat “not telling the truth” or “not reporting harm” as an ordinary abstention commitment.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, and side agreements must not require, reward, or incentivize unlawful discrimination, exclusion, retaliation, harassment, segregation, or differential treatment based on protected traits, protected activity, or legally protected association. If a proposed action, abstention, recipient choice, employment/school/housing/service decision, platform-moderation action, or evidence term could affect civil rights or anti-discrimination obligations, the agreement remains preview/manual-review only until a civil-rights and discrimination assessment is non-blocking. The platform must not treat “I will discriminate less/more” or “I will exclude group X” as an ordinary pledge-swap action or donation-offset bargaining term.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, and side agreements must not exploit duress, dependency, acute financial pressure, immigration/housing/medical/educational vulnerability, addiction, cognitive impairment, crisis, caregiver or employer power, school authority, platform-moderator power, or other asymmetric leverage. If a proposed action, abstention, compensation term, bond, evidence demand, challenge term, or side agreement could pressure a vulnerable participant into a materially harmful or non-voluntary bargain, the agreement remains preview/manual-review only until a participant-autonomy and coercion/undue-influence assessment is non-blocking. The platform must not treat consent extracted through dependency, crisis, or authority pressure as ordinary participant surplus confirmation.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, evidence terms, and side agreements must not require, reward, or incentivize unauthorized disclosure, exposure, sale, or misuse of confidential information, private personal data, credentials, access tokens, private communications, nonconsensual intimate or sensitive content, location/device data, client/patient/student/employee records, trade secrets, or third-party records. A participant may disclose their own private information only through an explicit, narrow privacy grant and non-blocking confidentiality/privacy-rights review; they may not disclose another person’s or organization’s private information without verified authority, consent where required, and non-blocking legal/privacy review. The platform must not treat doxxing, credential-sharing, blackmail-like disclosure, or sale of private information as an ordinary pledge-swap action.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, evidence terms, payment terms, refunds, and side agreements must not be used for money laundering, sanctions evasion, terrorist or extremist financing, stolen payment methods, stolen funds, fabricated receipts, chargeback/refund abuse, card testing, circular routing, fake donation volume, or disguised private compensation. If a transaction, donor identity, payment method, recipient, refund path, compensation term, side agreement, or receipt pattern could indicate financial crime or payment fraud, the agreement remains preview/manual-review only until a financial-crime/fraud/source-of-funds assessment is non-blocking. The platform must not treat a moral aim as permission to hide the beneficial source, destination, or purpose of funds.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, refunds, payout rights, evidence claims, completed-agreement records, and side agreements must not be assigned, sold, resold, tokenized, securitized, syndicated, or converted into transferable moral-trade credits. Moral trade depends on the particular participants' no-trade baselines, confirmations, eligibility, evidence duties, and moral/prudential reasons; those obligations and claims cannot be transferred to an uninvolved buyer or bundled into a secondary market without destroying the participant-specific comparison. Any proposed assignment, delegation, resale, tokenization, credit issuance, claims purchase, or third-party assumption remains preview/manual-review only until an agreement-transferability/non-assignment assessment, legal review, participant-confirmation review, financial-crime/fraud review, and anti-speculation review are all non-blocking. The default policy is non-transferability.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, evidence terms, payment terms, side agreements, and templates must not require, reward, or coordinate dangerous or regulated physical-world activity without explicit approval for the exact release stage and jurisdiction. If a proposed action, abstention, recipient choice, evidence method, compensation term, or side agreement involves weapons, ammunition, explosives, hazardous chemicals, controlled substances, unsafe medical or bodily interventions, dangerous transportation, animal-handling risk, biosecurity-relevant materials, cyber-physical sabotage, or other regulated goods or hazardous activity, the agreement remains preview/manual-review only until a regulated-goods/hazardous-activity assessment, legal/jurisdiction review, participant-autonomy review, nonparticipant-externality review, content-moderation review, and anti-threat review are non-blocking. The platform must not treat a moral aim as permission to broker dangerous goods, unsafe procedures, or physical harm.
- Donation offsets, pledge swaps, compensated moral-action agreements, performance bonds, evidence terms, payment terms, side agreements, templates, invite links, and support/contact surfaces must not require, reward, or coordinate cyber abuse or unauthorized digital-system manipulation. If a proposed action, abstention, evidence method, compensation term, recipient choice, side agreement, or performance-bond condition involves unauthorized access, credential theft, phishing, malware, botting, spam, denial-of-service, exploit use, unauthorized scraping, data exfiltration, adversarial prompt/model attacks against third-party systems, review/rating manipulation, platform-integrity manipulation, or vulnerability disclosure/suppression outside an authorized defensive process, the agreement remains preview/manual-review only until a cyber-abuse/digital-systems-integrity assessment, legal/jurisdiction review, confidentiality/privacy-rights review, content-moderation review, user-safety review, and anti-threat review are non-blocking. The platform must not treat a moral aim as permission to hack, deceive, spam, manipulate platforms, or bypass another system's rules.
- Non-public-goods marketplace flows must declare a launch tier before preview or matching. Money-only donation-offset clearing to verified destinations is the first payable candidate; donation offsets that rely on abstention/additionality proof, closed-counterparty pledge swaps, open-market pledge swaps, and compensated moral-action agreements each require their own non-blocking tier policy, release gate, and pilot decision. A higher-risk tier must not become payable or reliance-bearing merely because lower-risk donation offsets work.
- Counterfactual trust must be a first-class launch gate, not just a note. Long-duration behavior changes, diffuse lifestyle promises, negative commitments, and compensated personal actions remain preview/manual-review only unless a `counterfactual_trust_assessment` classifies the claim as acceptable for that tier, the evidence burden is least-intrusive, and the participant sees the remaining uncertainty before confirmation. Open-market pledge-swap matching is disabled by default; early pledge swaps use closed, user-supplied, or invite-only counterparties unless the frozen policy explicitly approves open-market matching.
- Control-plane checks should be composed through versioned risk-control packs and a control-applicability matrix. The platform may expose logical fields such as `financial_crime_fraud_assessment_ref` or `baseline_integrity_assessment_ref`, but the runtime gate must resolve the applicable control requirements through a normalized control-result bundle. Duplicated, stale, or contradictory per-table control fields do not authorize clearing.
- Safety, legal, privacy, third-party-rights, anti-threat, anti-corruption, reporting-integrity, civil-rights, confidentiality, regulated-goods, cyber-abuse, and process-integrity blockers are non-compensable. A higher donation, side payment, performance bond, reciprocal favor, or private waiver cannot convert a blocking state into a permissible trade unless the frozen policy says the protected interest is personally waivable by the affected participant and all required renewed confirmations and reviews are non-blocking.
- Non-public-goods offers must expire or require renewal before matching, lock, payment capture, reliance, or public completion when the baseline, evidence method, empirical assumptions, jurisdiction, payment method, recipient/destination, counterparty bucket, or policy snapshot becomes stale. Stale offers are not live liquidity.
- Donation-offset batch clearing must use a frozen objective, deterministic tie-breaker, and fairness policy. It may maximize safe matched volume or participants subject to confirmed constraints, but it must not allocate scarce matches by moral ranking, reviewer taste, public pressure, private-cap leakage, timestamp races, or database order.
- Sensitive evidence should use privacy-preserving verification when feasible. Claim-typed attestations may support performance, abstention, baseline, additionality, or challenge decisions, but raw private data should not be disclosed to counterparties or public pages merely because direct inspection would be more convenient.
- Clearing ratios, side payments, and cause equivalence assumptions are private participant terms, not public moral prices. The platform must not publish general exchange rates between causes, actions, or duties, and must not use one participant's private acceptable ratio to infer another participant's moral valuation or bargaining surplus.
- Donation-offset and pledge-swap pilots require pre-registered simulation, red-team, scale-up, pause, and rollback criteria before the release gate promotes them. A pilot that produces matches by inducing threats, privacy leakage, excessive review burden, low-confidence baselines, or repeated disputes should pause or roll back even if gross matched volume rises.
- Donation offsets, pledge swaps, and compensated moral-action agreements must not become bribery, kickbacks, pay-for-votes, pay-for-testimony, procurement manipulation, admissions/grading manipulation, medical/legal referral payments, platform-moderation manipulation, or payments for official or fiduciary acts. If a proposed action, abstention, donation, compensation, side agreement, or recipient choice involves a public official, employee-agent, fiduciary, procurement decision-maker, professional gatekeeper, school official, platform moderator, or other entrusted decision-maker, the agreement remains preview/manual-review only until an anti-corruption and process-integrity assessment is non-blocking. The platform must not treat a moral aim as permission to buy or sell entrusted decisions.
- User-initiated contact, invite links, profile messaging, support messages, and discussion surfaces must be consent-gated, rate-limited, blockable, and reportable. A participant declining, blocking, or withdrawing from a preview must not be followed by repeated solicitations, off-platform pressure, doxxing, harassment, or retaliatory visibility changes. Contact attempts and abuse reports must be first-class records where configured; unresolved serious user-safety blockers prevent introductions, reliance-bearing previews, and public-profile amplification.
- Matching, broad previews, and batch clearing must be reproducible, snapshot-backed, and privacy-safe. Donation-offset batches, pledge-swap previews, and any broad match-candidate generation must be produced by a `matching_clearing_run` or equivalent frozen input bundle; ad hoc operator matching, database-order matching, or hidden match reasoning cannot create payable or reliance-bearing obligations.
- Exact wishes, contact details, sensitive constraints, raw source notes, and private evidence remain hidden unless the user grants narrow, staged disclosure.
- Staged disclosure of exact wishes, contact details, sensitive constraints, raw source notes, private evidence, or non-aggregate moral-preference data must be mediated by explicit, revocable `privacy_grant` records and audited access logs. Reviewer access may be broader than counterparty/public access, but it must still be purpose-limited, role-limited, and reconstructible from `privacy_access_log` records.
- Public pages remain aggregate-first and privacy-safe.
- User-facing blockers, review states, payment states, and privacy states must be understandable without exposing private facts or internal control-plane jargon. Every participant-facing block, pause, rejection, or manual-review state must show a plain-language reason category, the next action available to the user, whether money or obligations are currently affected, and the appeal/correction route where applicable. Do not expose raw reviewer notes, exact private caps, sensitive counterparty data, source hashes, provider payloads, policy internals, or security signals merely to explain a blocker.
- Public marketplace metrics, search summaries, and transparency reports must use small-cell suppression or k-anonymity thresholds before publication. Do not publish cluster, stance, jurisdiction, or cause-area breakdowns where a small group or rare view could be inferred.
- Search, browse, preview, invite-link, and match-candidate endpoints must enforce anti-enumeration budgets, rate limits, query fingerprinting, and bucketed result counts. Users, counterparties, scrapers, or operators must not be able to infer rare views, hidden offers, private constraints, zero-count sensitive facets, or exact willingness-to-pay by repeated filtering, timing differences, pagination behavior, or error-message differences.
- All real-money amounts must have an explicit currency or inherit the frozen agreement or track settlement currency. If payment rails, recipients, or users use different currencies, freeze the FX policy and rate snapshot before preview/lock; FX spreads and conversion fees must be displayed separately and excluded from moral-trade volume and recipient-impact claims.
- The first real-money release must be capped, pausable, and reviewable: enforce per-participant, per-agreement, per-recipient/destination, per-pilot, and non-public-goods-subsidy-pool exposure limits, and provide an operator emergency pause that blocks new authorizations/captures while preserving refunds, cancellations, evidence records, and audit trails.
- Participant identity, legal capacity, sanctions/payment-rail eligibility, and jurisdictional eligibility must be first-class reviewed states before any real-money or reliance-bearing flow. Human-uniqueness and Sybil checks may affect counted support or block clearing, but must never become public moral reputation or a moral-worth score; raw identity artifacts and linkage signals remain private, purpose-limited, and governed by retention/privacy-grant policy.
- Account security and account-takeover risk must be first-class blockers for real-money, reliance-bearing, privacy-disclosing, and exposure-increasing actions. Password/email/MFA changes, new devices, session anomalies, payment-method changes, participant-identity changes, and recovery flows must be governed by a frozen account-security policy; stale or high-risk account-security events require step-up authentication, notice, cooldown, or manual review before confirmations, captures, payout releases, privacy grants, or contact introductions can proceed.
- Privileged operator, reviewer, support, and system-job actions must be least-privilege, role-scoped, and auditable. Emergency pause may be unilateral to stop risk, but unpausing, approving release gates, approving policy snapshots, verifying recipients or payment destinations, granting private-data access, publishing impact claims, overriding blockers, capturing payments, releasing payouts, or issuing non-routine refunds requires a `privileged_action_record` and either dual control or neutral-review approval under the frozen privileged-action policy.
- Reviewer quality must be governed rather than assumed. Reviewers who approve clearing, release gates, recipient verification, privacy grants, evidence acceptance, impact claims, appeals, incident closure, or payout release must satisfy the frozen reviewer-quality policy for that review type. Calibration failures, repeated overturns, unresolved conflicts, missing second review where required, or stale reviewer authorization block reliance-bearing decisions until another eligible reviewer or neutral panel records a superseding decision.
- Refund, cancellation, expired-authorization, failed-payout, blocked-release, and user-withdrawal behavior must be governed by a frozen refund/cancellation policy before any real-money preview. If funds cannot be released as previewed because review, destination verification, legal, anti-threat, notice, or evidence gates fail, the user must see whether the result is authorization cancellation, refund, carry-forward with renewed confirmation, or manual review; the platform must not keep or reroute funds under an unstated fallback.
- Security, privacy, payment, provider, and operational incidents must be first-class records. Suspected private-data exposure, unauthorized privileged action, provider compromise, erroneous capture/release, reconciliation failure, enumeration attack, or evidence/source-authentication failure must create an incident-response record, preserve audit evidence, apply the frozen containment/notice policy, and pause new risk where required without deleting user rights, refund paths, or evidence records.
- Deployment, configuration, and feature-flag state must be provenance-backed. A release gate does not authorize production behavior unless the deployed code artifact, dependency lockfile, environment configuration, provider-account bindings, payment mode, feature flags, and policy-snapshot bundle match the reviewed deployment-release record and configuration snapshot. Configuration drift, unreviewed feature-flag changes, wrong-provider environment, unpinned dependency changes, or deployment from an unapproved build block real-money, reliance-bearing, privacy-disclosing, and public-metric-release paths until superseded by review.
- Launch must be staged behind explicit feature flags and release gates. The default path is: demo/sandbox calculation, reviewed no-money/manual-evidence pilot, capped real-money external CRECM-module handoff, donation-offset pilot, and pledge-swap preview/manual pilot. A later or riskier track must not become payable or reliance-bearing until its release gate has a non-blocking reviewer decision, dry-run evidence, and regression results.
- Each cleared trade must record explicit participant confirmation that the cleared agreement is preferable or acceptable relative to that participant’s stated no-trade baseline by that participant’s own lights; the platform may facilitate, verify, and block unsafe trades, but must not infer moral surplus on behalf of a participant. Participant surplus confirmation is necessary for clearing, not sufficient: serious unresolved negative externality or anti-threat blockers still block clearing.
- Participant confirmations and renewed confirmations must be first-class, versioned, hash-backed records. A checkbox, transient client state, email reply, or raw JSON field is not sufficient to authorize routing, clearing, payment capture, payout release, or material-term changes unless it resolves to a `participant_confirmation_record` tied to the frozen baseline, terms snapshot, policy snapshot bundle, maximum exposure, notice record, and confirmation scope.
- Participant confirmations must be high-quality consent, not merely recorded clicks. Real-money, reliance-bearing, exposure-increasing, or privacy-disclosing confirmations require the required disclosures, comprehension checks where configured, no preselected paid commitments, no countdown pressure except genuine deadline disclosure, no misleading default routing, and no dark-pattern interface. Failed, skipped, or stale consent-quality checks block routing, clearing, capture, payout release, and private-data disclosure until renewed confirmation or manual review under the frozen choice-architecture policy.
- Participant consent cannot waive harms to nonparticipants. Externality review must consider material effects on affected third parties, recipients, and public goods outside the trade; unresolved serious nonparticipant-harm blockers prevent clearing even when all direct participants confirm surplus.
- Recipient identity, destination identity, and payment-destination routing must be anti-impersonation reviewed before funds can be captured or released. User-submitted recipient names, URLs, wallet addresses, bank details, or charity identifiers are evidence inputs, not payment destinations, until they resolve to a verified recipient registry entry and verified payment destination.
- Recipient registry entries and payment destinations must be first-class, reviewed records. A free-text recipient name, copied donation link, bank detail, wallet address, or fiscal-host note cannot be reused across agreements, milestones, or releases unless the registry entry and payment destination have non-blocking verification, anti-impersonation, jurisdiction, and prohibited-use review states.
- Ongoing pledge swaps must have bounded obligations and a reciprocal release rule: if one participant exits, pauses, or expires the agreement under the agreed rule, counterparties are released from future obligations while completed or disputed past obligations remain auditable.
- Do not count ordinary donation matching, ordinary co-funding, or ordinary resource exchange as “moral trade” unless the deal is made possible by differences in participants’ moral views, moral priorities, or indexical obligations.
- Marketplace intake must route non-moral-trade cases away from the moral-trade lock path. If a user is trying to make an ordinary donation, ordinary matching gift, ordinary procurement/service purchase, personal self-offset, external CRECM/public-goods contribution, background-networking request, or prohibited/unsupported transaction, the UI should say so early and offer only the safe available path; it must not force the user through a Toby-Ord moral-trade agreement merely to keep them in the marketplace funnel.
- Intrapersonal/self-offset flows may be supported as personal planning, bookkeeping, or external-donation evidence, but they are not counted as interpersonal Toby-Ord moral trade, matched volume, or completed moral-trade agreements unless a distinct counterparty or represented moral perspective is actually part of the frozen agreement.
- Participant-stated side constraints, role duties, and agent-relative limits must be respected as participant-owned blockers. The platform may ask users to identify actions they regard as impermissible, nondelegable, or nontradable, but it must not pressure, optimize around, or infer waiver of those limits merely because another participant offers compensation or moral concessions.
- Donation offsets and pledge swaps must preserve the option-set comparison needed for moral trade: the frozen matched proposal must be acceptable relative to the participant’s no-trade baseline and must not knowingly select an option that all affected participants have already marked as dominated by another reviewed, feasible option. This comparison uses participant-stated preferences and coarse option labels, not platform moral ranking.
- Option-set comparison must allow non-cardinal, incomplete, lexically constrained, and incomparable judgments. The platform must not force a participant to rank or numerically score options merely to make a Pareto test pass; if a required comparison is marked `incomparable`, `lexically_blocked`, or `insufficiently_comparable`, dominance-based clearing remains preview/manual-review only unless the frozen policy records a safe non-dominance interpretation.
- Participant surplus confirmation must be net of disclosed burdens, not just net of transferred dollars. Before lock, the participant must see the expected money, platform fees, time, evidence burden, privacy disclosure, attention cost, performance burden, challenge/dispute burden, and residual obligation; a trade must not clear merely because the cash terms are favorable while the non-monetary burden makes the participant’s confirmed no-trade comparison stale or invalid.
- Moral-trade classification must be backed by a participant-owned moral-difference or moral/prudential-asymmetry attestation. The platform may ask which coarse difference makes the trade possible—moral view, moral priority, empirical belief, indexical obligation, or moral/prudential weighting—but must not require disclosure of a full moral theory, infer hidden ideology, or publish the attestation as a moral-status badge.
- Bargaining protocol must be frozen before a donation offset or pledge swap becomes reliance-bearing. The platform must not use hidden dynamic pricing, urgency pressure, personalized extraction, last-mover holdup, or post-match disclosure of private caps to push participants toward concessions; material counteroffers require a new frozen proposal and renewed confirmations.
- Empirical assumptions that make a trade acceptable, including assumptions about relative charity effectiveness, action efficacy, substitution, likelihood of performance, and causal route, must be captured separately from moral valuation. If those assumptions materially change after preview or lock, the proposal becomes stale and requires renewed confirmation or amendment review.
- Payment, evidence-provider, and agreement-state events must be idempotent, append-only, and replay-safe. No payment capture, payout release, evidence acceptance, or state transition may be triggered by a duplicate provider event, stale preview, mutable client state, or unordered background job.
- Provider webhooks, third-party evidence feeds, identity checks, payment-rail checks, and destination-verification feeds must be source-authenticated before they can change marketplace state. Unsigned, failed-signature, wrong-provider-account, stale, replayed, or endpoint-mismatched provider events may be stored as evidence for manual review, but must fail closed for payment capture, payout release, evidence acceptance, eligibility approval, destination verification, and release-gate promotion.
- Sensitive private data and provider secrets must be protected by frozen data-security and key-management policy. Raw wishes, private evidence, identity artifacts, source notes, moral-preference profiles, provider signing keys, webhook secrets, payout credentials, and audit exports must be encrypted or tokenized according to data class; secrets must not appear in logs, public metrics, URLs, analytics, model prompts, or reviewer notes. Missing encryption state, stale key version, failed decryption audit, or unlogged private-data access blocks counterparty/public disclosure, provider-state changes, and release-gate promotion until resolved.
- Non-public-goods subsidy funds and recipient/destination relationships must be screened for self-dealing, common control, circular routing, and collusive contribution patterns. A trade cannot clear, count toward matching or moral-trade metrics, or receive subsidy funds when the apparent cross-view support is manufactured by affiliates, common-control entities, or quid-pro-quo rings rather than independent participants.
- AI assistance may draft, critique, summarize, and produce checklists, but must not make live match suggestions, contact counterparties, change proposal state, or rank moral value without explicit governance approval.
- AI-generated text is never a source of truth for clearing, evidence acceptance, baseline confidence, externality review, legal review, payment capture, or payout release. Any AI-assisted output must be converted into structured participant input, verifiable evidence, or a reviewer decision before it affects marketplace state.
- Frozen policy versions govern locked agreements. Every policy reference that affects matching, eligibility, clearing, fees, notifications, evidence standards, legal availability, public metrics, payment, payout release, data retention, or non-public-goods subsidy scheduling must resolve to an immutable `policy_snapshot` captured at preview/lock or in the calculation input bundle. Later policy changes may pause new risk, block unsafe future captures, or trigger refunds/cancellations under an emergency policy, but they must not silently expand a participant’s obligations, change the agreed no-trade baseline, alter already-confirmed exposure, change fee/FX terms, alter evidence or notification standards, or reinterpret a cleared trade without renewed participant confirmation and a superseding review record.
- Review, verification, challenge, release, blocker, and eligibility states must be interpreted through a frozen `state_interpretation_policy` or equivalent immutable policy snapshot. Unknown, stale, under-review, superseded, unmapped, or missing states fail closed for payable, releasable, reliance-bearing, and release-gate transitions unless the frozen policy explicitly marks that field as not required for that release stage.
- Adverse decisions that block real-money participation, eligibility, matching, clearing, payout release, recipient verification, privacy grants, or public impact claims must have a bounded appeal or correction path unless the frozen policy marks the case as emergency-only. Appeals must be first-class records with notice, deadline, neutral-review requirements, evidence scope, and non-retaliation against the appellant; opening an appeal must not silently reopen settled obligations or waive safety blockers.
- No hidden experiments may affect matching, clearing, payment timing, evidence standards, participant risk, or public classification. Experiments that touch user money, moral-trade classification, or reliance-bearing recommendations require prior governance approval, explicit user-facing disclosure where relevant, and must not alter locked agreements without renewed confirmation.
- Private wish data, raw evidence, identity artifacts, source notes, and sensitive moral-preference profiles must not be used for model training, evaluator datasets, public demos, or product analytics beyond approved aggregate metrics unless the user gives explicit, revocable, purpose-specific consent.
- Undisclosed off-platform side agreements, compensation, reciprocal favors, threats, or coercive arrangements that materially affect a baseline, clearing condition, evidence submission, challenge decision, or recipient choice are blockers until disclosed and reviewed for collusion, externality, legal, and anti-threat risk.
- Side-agreement disclosures must be structured, reviewable records rather than free-text notes hidden inside an offer. Reviewers must be able to see who disclosed the side arrangement, what subject it affects, which evidence supports it, and whether collusion, externality, legal, or anti-threat review remains blocking.
- Challenge windows, dispute deadlines, renewed confirmations, emergency pauses, and payout-release opportunities require recorded notice under the frozen notification policy. A participant or counterparty must not lose a challenge, cancellation, or withdrawal right because a material notice was never sent, failed, or was routed only through an unconfirmed channel.
- Deadlines, lock times, challenge windows, confirmation expiry, FX quote expiry, authorization expiry, cancellation windows, and release-gate time limits must be computed from a server-side time authority under a frozen time-authority policy. Client clocks, browser-local time zones, unsynchronized background jobs, or mutable display strings must not determine whether a participant has lost a right, whether a quote is stale, or whether money can be captured or released.

These constraints are already reflected in the [technical spec](https://www.moraltrade.org/moral-trade/technical-spec)’s required proposal fields, review statuses, state transitions, and guardrails. Broad previews, consent before detail, and no autonomous outreach are shared platform safety constraints here, not an instruction to implement any background-networking feature in this brief.

---

## Product change


### Toby-Ord market standard: default, mutual gain, and classification

Before implementing any new marketplace surface, make the Toby-Ord structure explicit in the product and data model:

```text
no_trade_baseline
baseline_good_faith_attestation
baseline_confidence_level
baseline_confidence_rationale
baseline_snapshot_hash
baseline_version
baseline_integrity_assessment_ref
participant_surplus_confirmation
participant_confirmation_hash
participant_confirmation_record_ref
participant_term_sheet_record_ref
marketplace_intake_triage_record_ref
participant_ui_render_snapshot_refs
ui_accessibility_copy_policy_ref
plain_language_copy_policy_ref
participant_explanation_record_refs
route_simplification_policy_ref
route_simplification_audit_record_refs
site_nav_simplification_state
offset_create_route_happy_path_state
worked_example_card_simplification_state
factor_code_primary_copy_block_state
technical_detail_progressive_disclosure_state
consent_quality_record_ref
choice_architecture_policy_ref
participant_eligibility_record_ref
matching_clearing_run_ref
matched_trade_lock_proposal_ref
counterparty_blinding_policy_ref
staged_counterparty_disclosure_record_refs
recipient_acceptance_record_ref
ai_preference_elicitation_record_ref
post_clear_audit_record_refs
approved_trade_template_ref
template_instance_record_ref
template_parameter_policy_ref
template_conformance_state
review_capacity_policy_ref
review_queue_record_refs
non_public_goods_subsidy_pool_ref
subsidy_schedule_record_ref
direct_pair_clearing_record_ref
cause_bucket_taxonomy_ref
cause_bucket_assignment_refs
resource_compatibility_assessment_ref
net_offset_accounting_record_ref
final_match_confirmation_record_refs
clearing_ratio_policy_ref
verification_burden_policy_ref
performance_terms_snapshot_hash
performance_schedule_ref
behavioral_micro_pledge_policy_ref
pledge_unit_granularity
pledge_duration_units
unit_specific_baseline_required_bool
unit_baseline_snapshot_refs
unit_additionality_review_state
micro_pledge_sequence_ref
cumulative_micro_pledge_cap_policy_ref
cumulative_sequence_exposure_cents
cumulative_sequence_duration_units
food_abstention_health_safety_review_state
micro_pledge_window_record_refs
pre_performance_lock_confirmation_ref
post_performance_attestation_record_ref
retroactive_claim_state
micro_pledge_unit_settlement_policy_ref
micro_pledge_unit_settlement_mode
per_unit_donation_cap_cents
sequence_total_cap_cents
per_unit_evidence_standard_ref
longer_duration_manual_review_state
breach_cure_policy_ref
breach_remedy_policy_ref
compensated_action_terms_ref
compensation_policy_ref
ordinary_service_procurement_review_state
agreement_amendment_record_refs
donor_of_record_policy_ref
tax_receipt_policy_ref
donation_receipt_record_refs
charitable_solicitation_review_state
negative_commitment_scope_ref
action_reversibility_policy_ref
action_reversibility_assessment_ref
third_party_obligation_policy_ref
third_party_obligation_assessment_ref
representative_authority_policy_ref
representative_authority_assessment_ref
reporting_integrity_policy_ref
reporting_integrity_assessment_ref
protected_reporting_review_state
civil_rights_policy_ref
civil_rights_discrimination_assessment_ref
civil_rights_review_state
coercion_undue_influence_policy_ref
coercion_undue_influence_assessment_ref
participant_autonomy_review_state
confidentiality_privacy_rights_policy_ref
confidentiality_privacy_rights_assessment_ref
confidentiality_review_state
evidence_authenticity_policy_ref
evidence_authenticity_assessment_ref
synthetic_media_review_state
financial_crime_fraud_policy_ref
financial_crime_fraud_assessment_ref
source_of_funds_review_state
fraud_review_state
agreement_transferability_policy_ref
agreement_transferability_assessment_ref
transferability_review_state
regulated_goods_hazardous_activity_policy_ref
regulated_goods_hazardous_activity_assessment_ref
regulated_goods_review_state
hazardous_activity_review_state
cyber_abuse_digital_systems_integrity_policy_ref
cyber_abuse_digital_systems_integrity_assessment_ref
cyber_abuse_review_state
digital_systems_integrity_review_state
non_public_goods_market_tier
non_public_goods_tier_policy_ref
counterfactual_trust_policy_ref
counterfactual_trust_assessment_ref
counterfactual_trust_class
preexisting_relationship_or_closed_counterparty_state
open_market_matching_allowed_bool
control_applicability_matrix_ref
risk_control_pack_refs
control_requirement_result_refs
private_exchange_rate_quote_record_refs
market_simulation_run_refs
pilot_exit_criteria_policy_ref
pilot_scale_decision_record_ref
option_set_comparison_record_ref
pareto_dominance_review_state
preference_comparability_policy_ref
participant_option_comparability_state
incomparability_review_state
trade_burden_accounting_record_ref
burden_net_surplus_confirmation_state
moral_difference_attestation_record_ref
moral_difference_attestation_review_state
bargaining_protocol_ref
bargaining_round_record_refs
empirical_assumption_snapshot_ref
moral_side_constraint_profile_ref
side_constraint_review_state
intrapersonal_self_offset_record_ref
self_offset_classification_state
noncompensable_blocker_policy_ref
noncompensable_blocker_assessment_ref
noncompensable_blocker_review_state
offer_validity_policy_ref
offer_validity_record_ref
offer_expires_at
stale_offer_state
batch_clearing_objective_policy_ref
batch_clearing_objective_result_ref
privacy_preserving_verification_policy_ref
confidential_verification_attestation_refs
anti_corruption_policy_ref
anti_corruption_assessment_ref
process_integrity_review_state
pledge_performance_bond_policy_ref
pledge_performance_bond_record_refs
commitment_inventory_record_refs
commitment_reservation_record_refs
atomic_settlement_group_ref
anti_enumeration_policy_ref
appeal_case_refs
reviewer_quality_policy_ref
review_quality_audit_refs
user_safety_policy_ref
contact_interaction_record_refs
abuse_report_record_refs
content_moderation_policy_ref
content_moderation_record_refs
account_security_policy_ref
account_security_event_refs
backup_recovery_policy_ref
backup_recovery_checkpoint_ref
deployment_release_record_ref
configuration_snapshot_ref
schema_migration_policy_ref
schema_migration_run_refs
environment_data_isolation_policy_ref
environment_data_isolation_record_refs
privacy_grant_refs
privacy_access_log_refs
impact_claim_policy_ref
impact_claim_record_refs
public_receipt_card_policy_ref
public_receipt_card_record_refs
public_receipt_causal_wording_policy_ref
personal_contribution_reuse_check_ref
terms_snapshot_hash
idempotency_key
state_transition_policy_version
state_interpretation_policy_ref
policy_version_snapshot_hash
policy_snapshot_refs
challenge_window_policy_ref
dispute_case_ref
experiment_policy_ref
data_retention_policy_ref
platform_fee_policy_ref
pilot_risk_limit_policy_ref
privileged_action_policy_ref
refund_policy_ref
financial_reconciliation_policy_ref
financial_reconciliation_run_ref
incident_response_policy_ref
incident_response_record_refs
data_security_policy_ref
audit_integrity_policy_ref
audit_integrity_checkpoint_ref
public_metric_release_policy_ref
jurisdiction_policy_version
legal_review_state
collusion_review_state
side_agreement_disclosure_state
payout_milestone_policy_ref
payout_milestone_ref
recipient_anti_impersonation_state
verified_payment_destination_ref
settlement_currency
fx_policy_ref
fx_rate_snapshot_ref
notification_policy_ref
notice_receipt_ref
provider_source_authentication_policy_ref
time_authority_policy_ref
reciprocal_release_rule
trade_classification
evidence_plan
evidence_claim_type
evidence_standard_ref
evidence_record_hash
challenge_window_state
challenge_window_closes_at
externality_review_state
nonparticipant_externality_review_state
anti_threat_state
```

For donation offsets and pledge swaps, require each participant to state the relevant no-trade baseline, attest that it is a good-faith default rather than a newly threatened harmful action, record baseline confidence separately from good faith, and confirm that the cleared agreement is preferable to that baseline by their own stated view. Freeze the baseline and offer terms at preview/lock time: if a participant changes the baseline, caps, fallback rule, or material evidence standard after counterparty interest exists, create a new version, re-run review, and require renewed participant confirmation rather than silently mutating the old trade.

Treat baseline confidence as an explicit uncertainty field. A participant may sincerely report a baseline that is still hard to verify; that should be represented as `low`, `medium`, or `high` confidence with a short rationale and evidence references. Low-confidence baselines may remain useful for drafting or preview, but they must not support automatic clearing of donation offsets or pledge swaps without a reviewer decision and user-facing uncertainty disclosure.

Treat baseline integrity as separate from both good faith and confidence. A participant can sincerely state a baseline and still be using a marketplace-created or escalated baseline that would not have occurred absent the bargaining opportunity. Donation offsets and pledge swaps should ask whether the baseline predates the offer, whether the participant has a history or independent reason for the baseline, and whether the baseline became more harmful, more expensive, or more urgent after counterparties appeared. If baseline integrity is blocking, classify the proposal as preview-only or rejected-threat/externality rather than moral trade.

Treat participant surplus confirmation as a private-participant condition, not as a complete welfare test. Reviewers must separately check nonparticipant externalities, including harms to people, animals, institutions, recipients, or public goods that are not represented by the immediate parties. Direct participants cannot waive these blockers on behalf of outsiders.

For reliance-bearing review, enforce reviewer neutrality. A reviewer who is a participant, counterparty, sponsor, recipient, direct affiliate of a recipient, or otherwise materially exposed to the outcome must be recused from final approval. When a counterparty financially or reputationally benefits from rejection, route the dispute to a neutral reviewer or panel rather than letting the beneficiary be the final judge.


Keep real-money and regulated-domain features jurisdiction-gated. The platform must default to disabled for political/electoral, raffle, lottery, quasi-security, tax-sensitive, or other regulated flows unless a jurisdiction-specific policy version and legal review state explicitly approve that flow. If the user's location, recipient jurisdiction, payment rail, or legal-regulatory domain is unknown or unsupported, the feature remains draft/preview-only rather than payable.

Treat the first real-money launch as a bounded pilot. Before any non-public-goods pilot, trade track, or agreement can become payable, freeze a pilot risk-limit policy covering maximum participant exposure, maximum recipient/destination payout, maximum pilot capture, non-public-goods-subsidy-pool caps, emergency-pause authority, and what happens to pending authorizations if the pause is triggered. This is a governance guardrail, not a claim that the mechanism is solved at scale.

Treat privileged actions and refunds as policy-governed state transitions. Internal staff or system jobs must not be able to bypass participant confirmations, release gates, policy snapshots, privacy grants, recipient verification, or payout milestones by directly editing parent records. High-risk manual actions require a `privileged_action_record`; refund/cancellation outcomes must follow the frozen refund policy rather than ad hoc operator discretion.

Freeze policy versions at preview/lock. Terms, evidence standards, fee rules, metric-release rules, experiment rules, legal/jurisdiction policy, notification rules, data-retention rules, FX rules, and matching/clearing policy must be represented by immutable `policy_snapshot` references in the agreement or calculation bundle. A later policy may stop unsafe future action, but it must not retroactively increase exposure, change the agreed bargain, alter fees/FX/notice standards, or reclassify a participant's confirmed trade without renewed confirmation.


Make agreement amendments first-class. Locked donation offsets and pledge swaps may need correction, mutual amendment, pause, or early termination, but amendments must be append-only and consent-bound. An amendment may not retroactively change what counted as performance, convert old evidence into a different claim type, increase exposure, redirect funds, change compensation, or narrow cancellation rights without renewed confirmation from affected participants and reviewer approval where the frozen policy requires it.

Make final matched-deal lock explicit for donation offsets and pledge swaps. A broad preview, candidate match, batch-clearing dry run, or accepted template is not enough to create obligations. When the system finds a concrete donation-offset batch or pledge-swap counterpart, it must generate a frozen `matched_trade_lock_proposal`; each affected participant must see the exact matched terms and confirm again before the agreement can lock. This is especially important because Ord-style moral trade depends on each party preferring the actual trade to its no-trade baseline, not merely preferring some abstract class of trades.

Make pledge-swap performance terms explicit. The platform should refuse reliance-bearing pledge swaps where the promised action is too vague to review without moralized improvisation. “Exercise more,” “be kinder,” “reduce harm,” or “support cause X” may be useful drafting language, but the locked proposal must reduce the obligation to bounded, measurable, privacy-compatible performance terms or remain preview/manual-review only.

For no-meat, vegetarian, or similar food-abstention templates, the default action unit should be a meal or a day, not a month. The guided builder should first offer one meal, a few meals, one day, and a few days. For each unit, the builder should ask whether this specific meal or day would likely have included meat absent the trade, what covered foods are included, what adequate substitute meal is planned, and whether any health, dependency, coercion, or privacy concern makes the pledge inappropriate for automatic review. A longer pledge should be represented as either a micro-pledge sequence with separate checkpoints and renewal confirmations, or as a higher-counterfactual-trust manual-review exception. The preview must show why the longer duration increases verification burden, privacy burden, and counterfactual uncertainty, and must show cumulative sequence caps before the user can extend a sequence. The same preview must show the default evidence ladder, whether any evidence beyond self-attestation is required, the per-unit donation or compensation band, any performance-bond amount, the sequence cap, and the fact that extensions never auto-renew.

For behavioral micro-pledges, use a simple evidence ladder rather than a surveillance ladder. The default evidence profile for one meal or one day should be self-attestation plus optional meal note/photo/receipt; third-party attestation, randomized check-ins, reviewer inspection, or performance bonds should appear only when the amount, duration, prior dispute history, or release stage justifies the added burden. The UI must show that stronger evidence increases privacy and effort costs, and that evidence proves only the agreed performance claim, not counterfactual additionality.

For micro-pledge sequences, the product should prefer per-unit release/cancellation over hidden all-or-nothing settlement. A participant who completes three of five independently confirmed meat-free lunches should not lose credit for those units merely because a later unit fails, unless the term sheet clearly made the sequence all-or-nothing and the participant confirmed that burden. This keeps short pledges usable while preserving the option for stricter all-or-nothing templates under manual review.

Make commitment inventory and settlement atomicity first-class for donation offsets and pledge swaps. Ord-style trades compare the actual trade with the no-trade baseline; therefore the platform must know whether a baseline donation/action is still available, already reserved, already fulfilled, or already used elsewhere. Batch clearing must reserve the relevant commitment inventory, create an atomic settlement group, then either lock all required sides together or release the reservations without creating partial reliance.

Make pledge-swap breach consequences non-punitive and pre-agreed. The platform may record performance, partial performance, cure, breach, dispute, and reciprocal release, but it must not create informal moral-credit scores, public shame pages, or unbounded reputational penalties. If a performance bond, refund, or other remedy is used later, it must be pre-agreed, neutral-review-gated, and separated from moral-worth or public-reputation scoring.

Make optional pledge performance bonds first-class and narrow. Ord explicitly identifies factual trust as a major practical obstacle and notes that forfeitable money could help support performance, but the platform should implement this only as a bounded, reviewed pledge-swap option. The participant posting the bond must see the exact bond amount, payment/authorization method, return condition, forfeiture condition, forfeiture destination, evidence deadline, challenge window, refund/cancellation behavior, and no-escrow/no-legal-advice disclaimer before lock. Bonds should normally be returned to the poster when claim-typed performance evidence satisfies the frozen evidence standard by the deadline. Forfeiture should require neutral review whenever the counterparty benefits from rejection, and default forfeiture destinations should be neutral or pre-agreed rather than direct counterparty windfalls.

Make compensated moral-action agreements explicit but narrow. Ord's examples include mixed moral/prudential trades where one party pays another to do something the payer values morally and the performer values prudentially. Support that only as a tightly bounded pledge-swap submode: the payer's moral reason, the performer's compensation, the exact action, the review period, the evidence burden, and the exit/remedy rule must be frozen before lock. Disable or preview-only any compensated action that looks like regulated employment, professional service procurement, campaign finance, medical/immigration/legal/financial advice, coercive inducement, or exploitation of a vulnerable participant.

Do not let compensated moral-action mode relabel ordinary services as moral trade. If the performer is mainly selling a normal service, if the payer's moral aim is not necessary to explain the bargain, or if the same transaction would exist as ordinary procurement without moral disagreement or moral/prudential asymmetry, classify it as ordinary service/procurement and exclude it from moral-trade-specific metrics. The platform may still offer a draft/template for discussion, but it must not count the arrangement as Toby-Ord-style moral trade.

Make negative commitments and abstentions first-class. Donation offsets often involve redirecting or abstaining from an opposed donation; pledge swaps can also involve abstaining from an action. The platform must not infer abstention from silence or from a different positive act. It should record a bounded negative-commitment scope, substitution policy, confidence level, and minimally intrusive evidence plan; unresolved abstention uncertainty should reduce confidence or block clearing rather than trigger financial surveillance.

Make action reversibility first-class. Some pledged actions can be stopped or cured easily; others cannot. A reliance-bearing proposal must classify the requested action as reversible, partly reversible, or effectively irreversible, and must separately flag legally or personally high-stakes actions. High-stakes or effectively irreversible actions remain preview/manual-review only unless the exact flow is approved by the frozen action-reversibility, legal, externality, and vulnerability policies.

Make donor-of-record and tax-receipt handling first-class for donation offsets. The platform should show who the legal donor of record is, who receives any receipt, whether any tax benefit or employer/donor-advised-fund credit is expected, and whether charitable-solicitation or commercial-co-venture review is blocking. These facts must not be inferred from payment source alone and must not be counted as moral benefit.

Make third-party-obligation assessment first-class for pledge swaps and compensated moral-action agreements. Moral trade cannot authorize someone to breach duties owed to others. The proposal should ask whether the action or abstention implicates contracts, fiduciary duties, employment or school rules, professional standards, confidentiality, IP, court orders, family/care duties, donor restrictions, or other third-party rights; unresolved conflicts keep the agreement preview/manual-review only.

Make representative authority first-class. Most users should be treated as acting only for themselves. If a user says they can redirect an organization's donation, bind an employer or school, commit a campaign, act for a family member, use a donor-advised fund, sign for a fiscal host, disclose a client's or patient's information, or otherwise act in a representative capacity, the exact authority must be verified before the proposal can become locked, payable, reliance-bearing, or publicly counted. Authority should be scoped; being an employee, donor, volunteer, student, family member, or supporter is not enough to bind the represented party.

Make reporting integrity first-class. Negative commitments are sometimes legitimate abstentions, but the platform must not enable trades that purchase silence or suppress truthful reporting. The proposal should ask whether any term would require a participant or third party not to report misconduct, withdraw a complaint, avoid cooperating with an investigation, suppress truthful evidence, make a false statement, hide safety-relevant information, or refrain from a lawful public-interest disclosure. If so, the agreement remains preview/manual-review only unless reporting-integrity, legal, anti-threat, and externality review are all non-blocking.

Make civil-rights and anti-discrimination assessment first-class. Moral disagreement cannot be used as a wrapper for unlawful discrimination or exclusion. The proposal should ask whether any action, abstention, hiring/firing decision, admissions/grading decision, housing/service access decision, platform-moderation decision, recipient choice, evidence term, or side agreement would treat people differently because of protected traits, protected activity, protected association, retaliation status, or legally protected complaint/reporting activity. If such a risk is possible, the agreement remains preview/manual-review only until civil-rights, legal, anti-threat, reporting-integrity, and externality review are non-blocking.

Make participant autonomy and coercion/undue-influence assessment first-class. Moral trade depends on voluntary exchange that each participant can endorse by their own lights; it should not rely on dependency, desperation, authority pressure, or crisis leverage. The proposal should ask whether any participant is a minor, dependent, employee, student, tenant, patient, client, immigration applicant, caregiver recipient, platform user subject to moderator power, or otherwise vulnerable to the counterparty, sponsor, reviewer, recipient, or operator. If compensation, a performance bond, private disclosure, evidence burden, abstention, or requested action could exploit that leverage, the agreement remains preview/manual-review only until participant-autonomy, legal, anti-threat, user-safety, and externality review are non-blocking.

Make confidentiality and personal-data-rights assessment first-class. Moral trade must not use private information, credentials, or confidential records as bargaining chips. The proposal should ask whether any action, abstention, evidence term, performance bond, compensation term, side agreement, or challenge term would disclose, sell, transfer, verify, suppress, or misuse private personal data, third-party records, confidential relationship information, private communications, location/device data, access credentials, trade secrets, or nonconsensual intimate or sensitive content. If such a risk is possible, the agreement remains preview/manual-review only until confidentiality/privacy-rights, legal, representative-authority, reporting-integrity, user-safety, and data-security review are non-blocking.

Make evidence authenticity and synthetic-media assessment first-class. Factual trust is a central practical barrier for pledge swaps, donation offsets, performance bonds, and compensated moral-action agreements, so evidence must be evaluated for provenance before it can change obligations or money movement. The proposal and evidence-submission flow should ask whether proof may rely on screenshots, photos, videos, receipts, emails, chat logs, exported app data, location logs, third-party attestations, or AI-generated summaries. If a claim depends on evidence that could be forged, AI-generated, selectively edited, replayed, detached from its source, or generated under identity/account compromise, the agreement or evidence claim remains preview/manual-review only until evidence-authenticity, source-authentication where applicable, data-security, account-security, and reviewer-quality checks are non-blocking.

Make financial-crime, payment-fraud, and source-of-funds assessment first-class. Moral trade should not become a laundering, stolen-payment, fake-receipt, refund-abuse, chargeback, card-testing, sanctions-evasion, or terrorist/extremist-financing channel. The proposal, payment, receipt, refund, and compensation flows should ask whether the payment source, beneficial owner, recipient, refund route, donation receipt, compensation destination, side agreement, or circular flow could disguise who is paying whom, why funds are moving, or whether the funds are stolen or prohibited. If such a risk is possible, the agreement remains preview/manual-review only until financial-crime/fraud, legal/jurisdiction, sanctions/payment-rail, recipient/destination, financial-reconciliation, and incident-response review are non-blocking.

Make agreement non-transferability and anti-securitization first-class. Moral-trade obligations, payout expectations, performance-bond claims, refund claims, evidence claims, completed-agreement status, and any "moral trade credit" must not become transferable assets or secondary-market instruments. A donation offset or pledge swap is tied to the specific participants' no-trade baselines, participant surplus confirmations, evidence burdens, eligibility, and review states; selling or assigning the claim to a third party changes the bargain. The proposal and payment flows should ask whether anyone expects to transfer, assign, resell, tokenize, bundle, pledge as collateral, or let another party assume an agreement right or obligation. If such a risk is possible, the agreement remains preview/manual-review only until agreement-transferability/non-assignment, legal/jurisdiction, participant-confirmation, financial-crime/fraud, and anti-speculation review are non-blocking; the default is non-transferable, non-assignable, and not a credit or security.

Make regulated-goods and hazardous-activity assessment first-class. A moral-trade platform must not become a coordination layer for physical harm, dangerous goods, or regulated activities merely because participants attach moral significance to the action. The proposal should ask whether the action, abstention, payment, evidence method, recipient choice, performance bond, or side agreement involves weapons, ammunition, explosives, controlled substances, hazardous chemicals, biosecurity-relevant materials, unsafe medical or bodily interventions, dangerous transportation, animal-handling risk, cyber-physical sabotage, or other activity requiring special legal, safety, or professional controls. If such a risk is possible, the agreement remains preview/manual-review only until regulated-goods/hazardous-activity, legal/jurisdiction, participant-autonomy, nonparticipant-externality, content-moderation, and anti-threat review are non-blocking.

Make cyber-abuse and digital-systems-integrity assessment first-class. A moral-trade platform should not become an exchange for hacktivism, account compromise, botting, spam, review manipulation, unauthorized scraping, vulnerability misuse, or adversarial attacks on third-party systems. The proposal should ask whether the action, abstention, evidence method, compensation term, performance bond, side agreement, invite link, or contact behavior would involve unauthorized access, credential theft, phishing, malware, exploit use, denial-of-service, bot or fake-account activity, platform-integrity manipulation, private-data exfiltration, or vulnerability disclosure/suppression outside an authorized defensive process. If such a risk is possible, the agreement remains preview/manual-review only until cyber-abuse/digital-systems-integrity, legal/jurisdiction, confidentiality/privacy-rights, content-moderation, user-safety, and anti-threat review are non-blocking.

Make non-public-goods tier scope first-class. Donation offsets and pledge swaps should not share one undifferentiated launch path. The first clearable non-public-goods product should be short-horizon, money-only donation-offset batch clearing to verified destinations. Donation offsets that depend on abstention proof, pledge swaps with personal performance, compensated moral-action agreements, and open-market pledge swaps require increasingly strict tier policies and remain preview/manual-review-only until their tier-specific release gate passes.

Make counterfactual trust class first-class. A proposal should state whether the key claim is direct payment, destination proof, short-horizon abstention, short-horizon action, long-duration behavior change, diffuse lifestyle change, compensated personal action, or other high-counterfactual-risk conduct. Factual proof that an action occurred never proves that the action would not have occurred anyway. The counterfactual-trust assessment should control launch mode, evidence burden, review depth, and whether open-market matching is permitted.

Make closed-counterparty pledge-swap mode the default. Early pledge swaps should be drafted for user-supplied, invite-only, or otherwise known counterparties where both sides can evaluate the other's baseline plausibility. Open-market pledge-swap discovery can remain a broad, non-reliance-bearing preview, but it should not generate locked obligations until counterfactual-trust, privacy, user-safety, and bargaining-protocol evidence show that unknown-counterparty matching is safe enough for the release stage.

Make risk-control packs and control-applicability matrices first-class. The platform should avoid a brittle schema where every new control is manually added as a column on every offer, agreement, payment, evidence, and dispute table. Instead, each subject should reference the applicable control pack and control-result bundle for its tier, track, jurisdiction, money movement, evidence burden, and release stage. The named fields in this brief are the required semantics and reviewer surfaces; the implementation may satisfy them through normalized control-result records when that is safer and easier to audit.

Make private exchange-rate quotes first-class. Participants may set acceptable ratios, side payments, or counterpart volumes, but these are local willingness-to-trade terms for a frozen proposal. They must not be promoted into public cause prices, global moral exchange rates, or platform-endorsed effectiveness comparisons. A participant may see their own implied tradeoff and the final ratio-bounds result; counterparties and public pages see only privacy-safe compatibility bands unless a narrower disclosure is explicitly granted.

Make simulation, red-team, and pilot-exit criteria first-class. Before activating payable donation-offset or reliance-bearing pledge-swap pilots, run synthetic market simulations and adversarial test cases for baseline manufacturing, holdup, private-cap leakage, fake evidence, user-safety abuse, side agreements, collusion, and counterparty nonperformance. A pilot should have pre-registered continuation, scale-up, pause, and rollback criteria based on trust, safety, review cost, and verified surplus metrics rather than matched volume alone.

Make anti-corruption and process-integrity assessment first-class. Some apparent moral trades are not merely risky trades; they are attempts to purchase entrusted decisions or institutional authority. The proposal should ask whether money, donations, compensation, abstention, evidence submission, recipient choice, or side agreements are connected to public office, voting, testimony, procurement, grading, admissions, licensing, referrals, platform moderation, fiduciary decisions, or other gatekeeping roles. Any bribery, kickback, pay-for-vote, pay-for-testimony, or institutional-process manipulation signal blocks payable or reliance-bearing launch unless a frozen policy explicitly treats the case as lawful, disclosed, non-corrupt, and non-coercive.

Make option-set and Pareto-comparison review first-class. For donation offsets and pledge swaps, the platform should keep a frozen, privacy-safe menu of the relevant reviewed options: no trade, proposed matched trade, obvious partial-clearing variants, obvious side-payment variants, and reviewed feasible alternatives that the participants themselves considered. The platform must not claim to know objective moral value, but it can ask each participant whether an option is acceptable, unacceptable, preferred, incomparable, or lexically blocked by their own lights. A matched proposal should not become locked if all affected participants have already marked another reviewed feasible option as weakly better for everyone and strictly better for at least one participant, unless the frozen policy records why that alternative is unavailable, stale, legally blocked, unsafe, outside the release stage, or not comparable under the affected participant's own option-judgment schema.

Make preference-comparability handling first-class. Some moral views do not behave like cardinal utility functions; some options may be incomparable, insufficiently comparable, or blocked by lexical side constraints. The marketplace should therefore use coarse participant judgments rather than numeric moral scores, preserve `incomparable` and `insufficiently_comparable` as real states, and fail closed for dominance-based clearing when comparability is required but absent.

Make trade-burden accounting first-class. Donation offsets and pledge swaps impose transaction costs: time, attention, evidence production, privacy disclosure, review delay, legal uncertainty, challenge risk, and residual obligation. The preview should show those burdens at a coarse, privacy-safe level and require participant surplus confirmation to be net of the disclosed burden profile. Reviewer approval of a trade does not substitute for the participant's own burden-aware confirmation.

Make moral-difference attestation first-class. Because Toby-Ord-style moral trade is made possible by differences in moral views, priorities, indexical obligations, empirical beliefs, or moral/prudential weighting, the platform should record a coarse participant-owned attestation explaining why this is not ordinary donation matching, procurement, or self-offset bookkeeping. This attestation is private/reviewer-scoped by default and is used for classification and anti-fraud review, not for moral ranking.

Make bargaining protocol and anti-holdup controls first-class. Moral-trade bargaining can waste surplus or become threat-like if the platform reveals private caps, creates artificial urgency, or allows a participant to renegotiate after the counterparty has already made reliance-bearing disclosures. Donation offsets and pledge swaps should therefore use a frozen bargaining protocol: posted template, sealed-cap batch clearing, one-shot counteroffer, neutral mediator, or manual-review negotiation. Any material counteroffer must create a new bargaining-round record, show changed terms only at the appropriate disclosure level, and require renewed confirmation; no user should be punished or deprioritized for refusing a counteroffer.

Make empirical-assumption snapshots first-class. A participant may accept a donation offset because they believe two opposed organizations have similar effectiveness, because they accept a specified clearing ratio, because they believe a compromise charity is sufficiently valuable, or because they believe a pledged action would not otherwise happen. These empirical assumptions should be frozen as assumptions, not platform facts or moral rankings. If an assumption is essential to participant surplus confirmation, the preview should show the assumption summary, confidence level, evidence references where any exist, and what happens if the assumption is challenged or superseded.

Make moral side-constraint and agent-relative-limit capture first-class. Some users will treat certain actions as impermissible for themselves, nondelegable, or agent-relative even if another user would compensate them. The wizard should let a participant mark actions, evidence demands, disclosures, counterparties, or destinations as personal side-constraint blockers. The platform must not infer that a side constraint is waived merely because the participant confirms some other part of the trade; waiver or amendment requires an explicit renewed confirmation and, where configured, cooling-off or manual review.

Treat intrapersonal/self-offset flows separately from interpersonal moral trade. A user may want a self-offset template, such as redirecting their own opposed donation or offsetting their own carbon-producing activity. Such flows can be useful as personal planning or evidence collection, but they should be classified as `self_offset_or_personal_moral_bookkeeping` or ordinary donation/offset unless a distinct counterparty or represented moral perspective participates in the frozen agreement. They must not inflate completed-agreement counts, matched volume, or Toby-Ord moral-trade metrics.

Interpret states through a frozen state-interpretation policy. Terms such as `approval-compatible`, `non-blocking`, `releasable`, `payable`, `stale`, and `superseded` must be resolved by a versioned policy snapshot, not by ad hoc string checks. If a required state is unknown, missing, under review, stale, superseded, or unmapped, the safe default is to block payable, releasable, reliance-bearing, and release-gate transitions until a reviewer records a superseding decision or the frozen policy explicitly says the state is not required at that stage.


Make challenge windows and payout milestones explicit records. A challenge window must have an opened-at time, closes-at time, eligible challengers, default outcome, notification policy, and neutral-review escalation rule before it can affect clearing or release. A payout milestone must have an amount, recipient/destination reference, required claim-typed evidence, challenge window, and release policy; capture does not imply payout release.

Freeze recipient and payment-destination verification before money movement. Recipient display names, external URLs, donation-page links, fiscal-host references, bank details, wallet addresses, and charity identifiers must resolve to a verified recipient registry entry and verified payment destination. If anti-impersonation review is blocking or stale, the trade may remain preview/review-only but must not capture or release funds.

Freeze currency and FX treatment before preview/lock. Each agreement or pilot track should have a settlement currency; every amount either uses that currency or carries a frozen conversion policy and rate snapshot. Currency conversion costs, spreads, and payment-processor fees must be displayed separately and excluded from moral-trade volume and recipient-impact totals.

Make material notice delivery auditable. Challenge windows, dispute deadlines, renewed confirmations, payout-release opportunities, emergency pauses, and policy-change notices must create notification records with delivery or failed-delivery state. If a notice required for a participant action fails under the frozen policy, the relevant deadline should pause or route to manual review rather than defaulting against that participant.

Make privacy disclosure, public receipt cards, and impact claims first-class governance objects. Private facts may be used for review only under a role/purpose-limited privacy grant and access log; counterparty/public disclosure requires a separate grant or redacted publication policy. Similarly, an actual transfer, payout, or match is only a transfer/payout/match unless a reviewed `impact_claim_record` ties the public impact claim to a frozen methodology policy, evidence, and uncertainty disclosure. A public receipt card may summarize verified contribution facts, but it must use reviewed claim records and must not transform those facts into a good-person score, public moral ranking, unreviewed impact/effectiveness claim, stronger causal/additionality claim than the evidence and counterfactual-trust review support, or social-engagement object. Receipt-card publication is a sidecar publication event: it must not change agreement status, matching priority, reviewer treatment, or future eligibility.

Make data security and audit integrity first-class. A privacy grant authorizes access only if the underlying artifact, key version, and access path satisfy the frozen data-security policy; a state transition is auditable only if the relevant append-only records are included in a valid audit-integrity checkpoint or immutable-log equivalent. Operational convenience must not allow staff, scripts, migrations, or background jobs to bypass encryption, key rotation, access logging, or audit-chain verification.

Make discovery anti-enumeration first-class. Public search, signed-in search, preview generation, invite-link creation, and match-candidate browsing must apply the frozen anti-enumeration policy and produce query/access events sufficient to audit repeated probing. Suppressed, bucketed, delayed, or redacted results must be indistinguishable enough that a user cannot infer a hidden rare offer, cluster, constraint, or exact counterparty attribute from the absence, timing, or wording of a response.

Make appeals first-class, but bounded. Eligibility blocks, recipient/destination rejections, privacy-grant denials, evidence rejections, anti-threat blocks, externality blocks, classification decisions, stale-confirmation blocks, and payout-release blocks should create or reference an `appeal_case` when a participant has a correction right. Appeals must preserve safety gates and audit history; they provide a route to add evidence or obtain neutral review, not a mechanism to pressure reviewers or relitigate every automated non-match.

Make reviewer quality first-class. A marketplace that depends on human review cannot treat reviewer judgment as an ungoverned primitive. The system should require review-type-specific training or authorization, conflict checks, calibration or second-review where configured, periodic audit sampling, and superseding review when a reviewer is stale, conflicted, overturned, or outside scope. Review-speed targets must not create default approvals or default private-data disclosures.

Make user safety first-class. The platform should support user-initiated discovery and invite links without creating a harassment, doxxing, coercive-solicitation, or retaliation channel. Contact attempts, decline/block actions, abuse reports, and support escalations should be recorded where configured, and serious unresolved user-safety reports should block introductions, public amplification, and reliance-bearing pledge-swap previews involving the reported interaction until reviewed.

Make content moderation first-class. User-generated marketplace content should be reviewed against a frozen content-moderation/prohibited-use policy before it can become public, reliance-bearing, payable, or used as reviewer evidence. The moderation layer must not become a moral-ranking system: it should block prohibited conduct, coercion, fraud, illegal activity, privacy violations, impersonation, malware, and harassment while preserving viewpoint-neutral treatment of lawful moral disagreement.

Make account security first-class. Participant confirmations, saved payment methods, privacy grants, payout approvals, identity artifacts, and contact introductions should not be trusted merely because a browser session is authenticated. High-risk account-security events should create audit records, trigger step-up authentication or cooldown where configured, and block real-money, reliance-bearing, privacy-disclosing, or exposure-increasing actions until the account-security policy is satisfied.

Make backup and recovery first-class. A tamper-evident audit log is not enough if the platform cannot recover the evidence, payment, policy, privacy, and reconciliation records needed to honor cancellations, refunds, appeals, and audit obligations. Backup recovery must be tested, policy-governed, encryption-preserving, and integrity-verifiable before release gates promote real-money flows.

Make deployment and configuration provenance first-class. Release gates should bind not only to product intent but also to the concrete code artifact, dependency lockfile, migration set, feature flags, provider account, policy snapshot bundle, and environment configuration that will run. Production behavior should fail closed when the running deployment or configuration diverges from the approved snapshot.

Make schema migration and backfill safety first-class. The marketplace now depends on append-only provenance, immutable policy snapshots, private-data references, and financial ledgers; a careless migration can silently destroy the evidential basis for trust. Production migrations and repair scripts should be dry-run, hash-backed, reviewable, and rollback- or forward-fix-tested before they touch reliance-bearing or real-money records.


Make user-facing status and blocker explanations first-class. Fail-closed controls are necessary, but a marketplace made only of opaque blocks will not create usable moral trade. User-visible pages should translate internal controls into a small set of safe, action-oriented statuses such as `ready to preview`, `needs your confirmation`, `waiting for review`, `blocked for safety/legal/privacy reasons`, `payment not authorized`, `payout not releasable yet`, and `closed/refunded/cancelled`. Each status should identify the user's next step without revealing sensitive counterparty information or implying that the platform has made an objective moral ranking.

Treat release-gate promotions and policy snapshots as first-class reviewed subjects. A release gate, policy snapshot, fee policy, FX policy, notification policy, or data-retention policy must not be approved merely by editing a parent record; it needs its own review decision or referenced policy snapshot, and any state change must be represented in the audit trail.


### 0. External CRECM / public-goods module boundary

Do not specify or duplicate moral-public-goods / Common-Ground-Budget mechanism details in this file. Implement that track only from `moralpublicgoods102.md` / CRECM v1.96.


For marketplace liquidity, seed only non-public-goods templates here:

```text
seed_non_public_goods_templates
- 2 to 4 donation-offset templates
- 2 to 4 pledge-swap templates
- clear demo/live labels
- operator-only controls for promoting a worked example into a reviewed live template
```

User-facing marketplace tabs must separate:

```text
Live offers
Create from template
Worked examples
Demo data
External CRECM module link
```

### 1. Participant-facing UI/UX contract

Build the non-public-goods marketplace as a small set of task-oriented user journeys, not as a public rendering of the control-plane schema. The default participant flow should be:

```text
intake triage
  -> template gallery
  -> guided builder
  -> draft preview
  -> review / queue status
  -> matched-trade lock proposal
  -> final confirmation
  -> participant dashboard
  -> optional public receipt card
```

Required UI surfaces:

```text
intake_triage
- asks what the user is trying to do before showing moral-trade templates
- routes ordinary donation/matching, ordinary procurement/service, personal self-offset, external-CRECM/public-goods, background-networking, and prohibited/unsupported cases out of the non-public-goods moral-trade lock path
- explains the routing decision in neutral, non-moral-ranking language
- allows correction or manual review when the user says the triage misunderstood the intended trade
- does not infer ideology, willingness to pay, or private moral theory from the triage answers

template_gallery
- separates live, preview-only, worked-example, demo, and external-CRECM-module cards
- labels donation-offset, pledge-swap, compensated-action, and self-offset templates distinctly
- labels food-abstention pledge templates by duration: one meal, a few meals, one day, a few days, or longer-duration manual review; do not default to 30-day no-meat pledges
- shows the default evidence ladder and per-unit amount band for behavioral micro-pledges, with above-band or longer-duration variants labeled manual review
- shows whether money movement, counterparty matching, recipient verification, evidence, or manual review is required
- uses primary actions such as create draft, preview only, request review, or view example; do not show pay, lock, or match CTAs before the relevant release gate permits them

guided_builder
- asks for no-trade baseline before proposed trade terms
- separates amount/action, counterparty bucket, destination, evidence plan, privacy disclosure, fallback/cancellation rule, and side constraints into short steps
- for personal behavior pledges, asks for action-unit granularity and duration early, with one-meal/few-meal/one-day/few-day defaults and explicit warning before week/month/30-day variants
- for food-abstention pledges, asks for the unit-specific no-trade baseline, covered food category, planned adequate substitute, and health-safety boundary before evidence or compensation terms
- for behavioral micro-pledges, defaults evidence to self-attestation plus optional lightweight corroboration, and requires explicit review before making photos, receipts, witnesses, or device/location evidence mandatory
- shows autosaved draft state and "not a commitment yet" copy until final lock confirmation
- flags off-template, regulated, high-counterfactual-trust, or privacy-sensitive terms immediately as preview/manual-review only

trade_preview
- shows a side-by-side comparison: no trade vs if this clears
- shows maximum exposure, matched-volume or counterparty requirement, clearing ratio or action unit, destination, evidence standard, evidence ladder, privacy disclosures, expected burden, deadlines, fallback/cancellation rule, sequence cap/no-auto-renewal rule where relevant, and residual obligations
- for behavioral micro-pledges, shows the unit-specific baseline, cumulative sequence count, rolling-window cap, per-unit settlement rule, longer-duration escalation state, and any food-abstention health-safety warning
- groups controls into plain-language sections: basics, matching, review, privacy, evidence, payment, safety/legal, and what happens next
- renders internal control results as summary chips plus expandable details, not as a wall of internal enum names

final_lock_confirmation
- requires the participant-facing term-sheet hash
- repeats the exact maximum exposure, counterpart or batch condition, payment/cancellation/refund behavior, disclosure change, evidence ladder, sequence renewal rule, and remaining uncertainty
- uses a distinct confirmation action such as confirm locked terms; no final confirmation may be hidden behind save draft, continue, request review, or view preview

participant_dashboard
- groups records by draft, waiting for match, waiting for review, needs your confirmation, locked, evidence/challenge, payout or transfer status, closed/refunded/cancelled
- shows one next action per card where possible
- shows micro-pledge progress by unit without streak pressure, shame language, or engagement-optimized urgency
- offers share receipt only after completion, reconciliation, challenge-window, publication-policy, privacy, and content-moderation checks permit it
- keeps raw evidence, private caps, counterparty identity, reviewer notes, policy internals, and source hashes out of the primary participant view

public_receipt_card
- is opt-in, previewed before publication, revocable where the frozen policy allows, and never auto-posted to a public profile
- presents direct-donation parity as an optional factual display mode, not a recommended default, moral upgrade, or path to better matching/review treatment
- uses the title Verified Moral Trade Completed or an equivalent approved phrase
- separates personal contribution, trade-unlocked contribution, and total verified recipient transfer
- shows trade type, recipient or destination only at the approved disclosure level, verification state, challenge-window state, and a short uncertainty/no-moral-ranking disclaimer
- shows a verification URL or verification handle, issued-at date, current status, and correction/revocation/supersession state
- for personal-behavior pledge swaps, defaults public copy to a generic verified-action label unless exact-action publication has separate consent and non-blocking privacy/autonomy review
- may include a participant note only after content moderation and privacy review
- must not include a good-person badge, moral score, moral rank, exact private caps, private surplus, raw evidence, hidden counterparty identity, social reaction counts, share counts, profile boosts, streaks, comparative rank language, or unreviewed impact/cost-effectiveness claims
- must not offer like/reaction/share-count UI, public receipt-count leaderboards, profile sorting by receipt totals, or engagement-optimized prompts to publish more receipts
```

Every participant-facing screen must answer these questions in plain language: what am I proposing or committing to, what must happen before it clears, what is hidden or disclosed, what can still be changed or cancelled, what money or obligations are affected now, and what happens if review, matching, payment, evidence, or recipient verification fails. Worked examples and demo data must be visually and textually distinguishable from live offers; a user should never be able to mistake a simulated or preview-only moral trade for a payable or reliance-bearing agreement.

Every public receipt preview must answer these questions in plain language: what verified personal contribution is being claimed, whether it is new or already counted elsewhere, what contribution was conditioned by the trade, whether the stronger phrase trade-unlocked is permitted, what total recipient transfer was verified, what remains uncertain, what raw/private information is hidden, who or what will be publicly named, why the card is not a moral score or platform endorsement, how viewers can verify the current status, and how the participant can unpublish or correct the card where policy permits.

For reliance-bearing or money-affecting screens, store a privacy-safe `participant_ui_render_snapshot` or equivalent hash-backed render record. The record should capture the screen type, copy version, visible field set, hidden/redacted field set, language, accessibility accommodation state, term-sheet hash shown, maximum exposure shown, primary/secondary CTA labels, and any comprehension prompt shown. A participant confirmation is invalid if the render snapshot does not match the frozen term sheet or if the UI omitted a required material disclosure.

Use accessibility and readability as consent safeguards, not merely style preferences. Required flows should support keyboard-only navigation, screen-reader labels for status chips and comparison tables, mobile/narrow-width layouts, locale-aware currency/date formatting, and a plain-language copy review for final-lock and payment screens. If the user cannot reasonably perceive the no-trade comparison, maximum exposure, disclosure change, cancellation/refund rule, or final-confirmation action, the flow should stay draft/preview-only or route to manual support.

Add a plain-language copy layer above the control plane. The default participant view should use a small stable vocabulary and put exact policy/control names in an optional detail drawer. Simplification must not hide material facts; it must translate them. A user should see short labels such as:

```text
What happens if I do nothing?        -> no-trade baseline
What am I agreeing to do?            -> action, donation, or abstention term
What must the other side do?         -> counterparty or batch condition
What has to be checked first?        -> review, recipient, evidence, legal/safety, and payment gates
What is my maximum cost?             -> exposure, fees, bond, or burden
What stays private?                  -> staged disclosure and privacy grants
What proof is needed?                -> evidence standard and least-intrusive evidence path
What happens if this fails?          -> cancellation, refund, release, amendment, or appeal path
Why is this moral trade?             -> coarse moral-difference / moral-priority / moral-prudential-asymmetry explanation
```

Do not use internal names such as `counterfactual_trust_assessment`, `baseline_integrity_assessment`, `control_requirement_result`, `noncompensable_blocker`, `release_gate`, `state_interpretation_policy`, or `public_metric_release_policy` as primary user-facing copy. Map them to user-facing phrases such as `hard to verify`, `baseline needs review`, `required check`, `cannot be fixed by paying more`, `not live yet`, `status is unclear`, or `not publishable yet`, with an expandable technical explanation for reviewers and advanced users.

Each key screen should have a one-sentence summary, a short checklist, and a details drawer. For example, a blocked pledge-swap preview should say `This is still a draft because the evidence plan is too invasive and the action would last too long`, then show the user's available choices: shorten the pledge, choose a lighter evidence path, request review, or cancel. It should not show a wall of enums or imply the platform has ranked the user's moral view.

Use a task-card pattern for the default participant view. Each card should show: a short status label, one plain-language sentence, at most five key facts, exactly one primary action, and secondary actions only when they are genuinely available. For example, a donation-offset draft card should say `Not live yet — finish the basics, then request review`, then show `your maximum cost`, `where the money would go`, `what the other side must do`, `what stays private`, and `what happens if it fails`. Avoid showing more than one primary call to action on a card; users should not have to decide among `save`, `submit`, `lock`, `authorize`, `publish`, and `request review` unless the current state actually permits more than one materially different path.

Use a stable participant-facing term map across the product. Preferred labels include:

```text
If I do nothing       -> no-trade baseline
If this clears        -> proposed matched trade
Make it final         -> final lock confirmation
What we check         -> review, eligibility, evidence, legal/safety, recipient, and payment gates
My maximum cost       -> money exposure, fees, bond, or burden
What stays private    -> staged disclosure and privacy grants
Proof needed          -> evidence standard and evidence ladder
If it fails           -> cancellation, refund, fallback, amendment, or appeal path
Why this counts       -> moral-trade classification and moral-difference attestation
```

Do not make the guided builder ask every control-plane question when an approved template already supplies a safe default. The builder should ask only the participant-owned or trade-specific facts needed for that template: what they would otherwise do, what they are offering or requesting, maximum exposure, destination or counterparty bucket, evidence preference, privacy preference, and side constraints. All template defaults that affect money, obligations, privacy, evidence, duration, failure handling, or public display must still appear in the preview and participant term sheet before final confirmation. Hidden defaults are allowed only as draft-time simplification, never as hidden commitments.

Do not optimize this UI for engagement, urgency, or volume. The UX objective is comprehension, valid consent, correct classification, safe review throughput, and fewer mistaken commitments. Route screenshots, blocked-state screenshots, empty-state screenshots, public-receipt-card screenshots, and mobile/narrow-width screenshots should be part of the PR evidence for every newly reliance-bearing or public-sharing surface.

### 1A. Current public-page simplification retrofit

The current public Moral Trade pages already contain many correct safety concepts, but too much of the user-facing surface reads like a validator, policy map, or pilot-status report. Keep every safety, review, privacy, evidence, no-escrow, no-autonomous-outreach, and no-moral-ranking feature; simplify by moving internal mechanism detail out of the default view and into labeled detail drawers, reviewer consoles, or technical pages.

Apply this retrofit to all public pages related to non-public-goods Toby-Ord-style moral trade, including `/offers/new?mode=offset`, `/offers`, `/donation-offsets`, `/pledge-swaps`, `/moral-trade`, `/how-it-works`, `/validation`, `/paid-action-offers`, worked-example detail pages, and any create-similar or signed-in draft surfaces.

Sitewide simplification rules:

```text
public_page_default_shape
- one-sentence hero explaining what the user can do on this page
- one primary CTA and at most one secondary CTA above the fold
- one small status strip: live / preview-only / worked example / demo / sign-in required
- task cards instead of validator tables on public pages
- plain labels first, technical labels only inside details drawers
- no factor-code strings, raw policy names, enum walls, route-health diagnostics, or source hashes as primary copy
- no impact-score sliders, participant-importance scores, moral-fit sorting, or moral-looking ranks on the default browse surface
- advanced filters, evidence schemas, and validator diagnostics collapsed by default
- repeated mega-navigation and footer blocks visually compressed so they do not look like page content
```

If a public route falls back to a route-boundary state, the fallback page must be short and action-oriented. It should say `This page did not load. No draft was submitted and no review state changed.` Then show only: retry, go to examples, go to start, and contact support. Do not render the full navigation tree, long trust language, or validator explanation as though it were the intended product surface.

For `/offers/new?mode=offset`, replace the generic signed-out account gate with a concrete offset-builder landing surface. A signed-out user may draft or preview locally, but cannot save, publish, request review, disclose counterparties, authorize money, or create a live offer until sign-in and release gates permit it. The page should show:

```text
Draft a donation offset

Step 1: What would happen if there were no trade?
Step 2: What should happen if this clears?
Step 3: Where would the money go?
Step 4: What proof should reviewers check?
Step 5: Preview before sign-in or save after sign-in.
```

Use user-facing labels instead of mechanism labels:

```text
What would you fund without this trade?      -> baseline donation
What do you want to avoid cancelling out?    -> opposed or counterparty bucket
Where should matched money go instead?       -> compromise destination
How much are you willing to redirect?        -> maximum exposure and ratio bound
What proof can you show?                     -> evidence method
When should this draft expire?               -> expiry
What if review or matching fails?            -> refund/cancel/fallback rule
```

The offset creation page should not use `publish`, `lock`, `pay`, `capture`, or `match me` as CTAs until the relevant state is actually available. Default CTAs should be `Preview draft`, `Save after sign-in`, and `Start from example`. A user who is signed out should understand the trade shape before being asked to create an account.

For `/offers`, make the default browse page a clean directory, not a dense search console. Use tabs in this order:

```text
Live offers
Templates
Worked examples
Demo data
```

If there are zero live offers, show a simple empty state: `No live offers yet. You can inspect examples or create a reviewed draft.` Do not lead with sortable moral-looking metrics. Move `impact scores`, `participant-stated importance`, `counterparty minimum acceptable importance`, factor codes, and validator details into `Why this is reviewable` drawers or reviewer-only views. Public cards should show no more than:

```text
status: worked example / preview-only / live
trade type
offered action
requested action or matched condition
evidence needed
review state
primary action: view example / create a draft / request review
```

Worked examples should be rewritten to match the current launch posture. Do not use a 12-month vegetarian pledge as the default card exemplar. Keep Victoria/Paul as a source-linked teaching example if useful, but label it `source example / not default product shape`; default pledge-swap examples should be micro-pledges, short donation offsets, or closed-counterparty previews.

For `/moral-trade` and `/how-it-works`, make the first reading path three short sections:

```text
1. What happens if nobody trades?
2. What changes if the trade clears?
3. What must be checked before anyone relies on it?
```

Move protocol gate tables, status code walkthroughs, cited evidence rows, and factor-code demonstrations below a `Show reviewer details` drawer. The primer should not teach new visitors by showing walls of `pass`, `needs input`, `blocked`, or factor-code strings. Keep the validator information accessible, but do not make it the first explanation.

For `/pledge-swaps`, put a micro-pledge builder above general pledge-swap prose:

```text
I will do this small action.
I want the other side to do this.
This is when it starts and ends.
This is the lightest proof that would be enough.
This is what happens if either side does not finish.
```

Default no-meat / vegetarian examples should be one meal, a few meals, one day, or a few days. Week, month, or 30-day pledges should appear only behind `Longer pledge — manual review required` copy. The page must explain that a promise is not locked until the covered meal/day starts in the future, both sides confirm the same terms, and proof/fallback rules are named.

For `/donation-offsets`, replace checklist jargon with ordinary questions. Map current labels as follows:

```text
Baseline intention        -> What would each side donate without this trade?
Match ratio               -> How much does each side redirect?
Destination               -> Where does the shared money go?
Surplus rule              -> Why does each side prefer this to no trade?
Evidence method           -> What proof can reviewers inspect?
Expiry                    -> When does this offer stop being current?
Anti-threat certification -> What would make this unsafe or invalid?
```

The page should show a one-screen example with actual numbers, then a button to draft an offset. Example: `Without the trade, A would give $50 to Cause X and B would give $50 to opposed Cause Y. If it clears, both redirect $50 to GiveWell Top Charities Fund. Reviewers check prior intent, payment proof, destination, and externality blockers.`

For `/validation`, keep the reviewer institution visible but simplify the public explanation. Public copy should say `Reviewers verify specific claims, not moral worth.` Then show six status pills: draft, needs info, in review, challenge open, verified, disputed. Each status gets one sentence and one next action. Full evidence schemas, reviewer roles, and proof-reuse rules belong below `Reviewer details`.

For `/paid-action-offers`, the first line should be blunt and simple: `Paid action offers are not open to the public yet.` Then provide exactly three safe alternatives: inspect a worked example, create a donation offset, or join an invitation-only pilot. Keep labor, exploitation, AML/KYC, tax, and dispute warnings in an expandable details section.

For public receipts, use a simple share preview before any public publication:

```text
This card will say:
- what you personally contributed
- what the trade conditioned or unlocked
- where verified money went
- what remains uncertain
- that this is not a moral score

This card will not show:
- raw evidence
- private counterparty data
- exact private caps
- reviewer notes
- hidden moral-preference data
```

Codex must implement this as a route-level simplification layer, not as one-off copy edits. Each route should have a screenshot-backed `route_simplification_audit_record` or equivalent QA artifact showing: default desktop, default mobile, signed-out state, signed-in draft state where applicable, empty state, blocked state, details drawer, and final confirmation/publication state where applicable. A release gate fails if the public default view still exposes raw factor codes, internal policy enums, impact-score-like moral metrics, multiple competing primary CTAs, route fallback diagnostics as normal page content, or long-duration pledge examples as the default pledge-swap product.

## Data model extension

Extend the existing validator-backed model rather than replacing it. The current technical spec already names participants, profiles, offers, source notes, saved searches, privacy grants, evidence records, disputes, payment updates, notifications, and agreement events as core objects.

Add or adapt these entities:

```text
release_gate
- id
- from_release_stage
- to_release_stage
- feature_flags_json
- required_requirement_codes_json
- release_gate_requirement_bundle_hash
- dry_run_calculation_hash
- route_health_baseline_ref
- privacy_review_state
- anti_threat_review_state
- payment_replay_test_state
- evidence_challenge_test_state
- reviewer_conflict_test_state
- emergency_pause_test_state
- release_gate_requirement_result_refs
- passed_requirement_codes_json
- blocked_requirement_codes_json
- not_required_requirement_codes_json
- waived_requirement_codes_json
- waiver_policy_ref
- neutral_review_panel_ref
- decision_state: blocked | needs_changes | approved | superseded
- reviewer_decision_ref
- deployment_release_record_ref
- configuration_snapshot_ref
- environment_data_isolation_state
- migration_dry_run_state
- rollback_plan_test_state
- created_at
- updated_at


release_gate_requirement_result
- id
- release_gate_ref
- requirement_code
- requirement_group: privacy | anti_threat | payment | evidence | reviewer | deployment | migration | environment | donation_offset | pledge_swap | legal | safety | security | measurement | other
- applies_to_release_stage
- applies_to_feature_flag
- requirement_policy_ref
- required_bool
- requirement_state: pending | passed | blocked | not_required_for_stage | waived | superseded
- evidence_refs_json
- test_artifact_hash
- route_or_contract_ref
- reviewer_decision_ref
- privileged_waiver_action_ref
- reason_codes_json
- created_at
- updated_at


participant_term_sheet_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | participant_confirmation_record
- subject_id
- participant_id_hash
- term_sheet_policy_ref
- plain_language_summary_hash
- participant_action_summary_hash
- counterparty_or_batch_obligation_summary_hash
- maximum_exposure_cents
- settlement_currency
- clearing_ratio_or_action_unit_summary
- destination_or_recipient_summary_hash
- evidence_standard_summary_hash
- privacy_disclosure_summary_hash
- cancellation_refund_and_residual_obligation_summary_hash
- material_deadline_summary_hash
- non_legal_non_tax_disclaimer_shown_bool
- term_sheet_hash
- display_language_locale
- accessibility_accommodation_ref
- term_sheet_state: draft | presented | confirmed | stale | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


marketplace_intake_triage_record
- id
- participant_id_hash
- intake_surface_ref
- user_stated_goal_hash
- initial_route: non_public_goods_moral_trade_candidate | ordinary_donation_or_matching | ordinary_procurement_or_service | self_offset_or_personal_bookkeeping | external_crecm_public_goods_candidate | background_networking_request | prohibited_or_unsupported | unclear_manual_review
- route_reason_codes_json
- moral_trade_candidate_bool
- public_goods_or_crecm_boundary_bool
- background_networking_boundary_bool
- prohibited_or_unsupported_review_state: not_required | under_review | blocked | manual_review | superseded
- user_correction_or_appeal_state: not_requested | requested | accepted | rejected | manual_review | superseded
- triage_visibility: participant_only | reviewer_only | aggregate_only
- ideology_inference_prohibited_bool
- willingness_to_pay_inference_prohibited_bool
- triage_state: draft | routed | corrected | manual_review | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


participant_ui_render_snapshot
- id
- subject_type: marketplace_intake_triage_record | participant_term_sheet_record | public_receipt_card_record | offset_offer | pledge_swap_offer | matched_trade_lock_proposal | participant_confirmation_record | cleared_trade_agreement | payout_milestone | privacy_grant | appeal_case
- subject_id
- participant_id_hash
- ui_surface: intake_triage | template_gallery | guided_builder | trade_preview | review_queue_status | matched_trade_lock | final_confirmation | participant_dashboard | public_receipt_preview | payment_preview | evidence_submission | dispute_or_appeal | manual_review
- route_or_component_ref
- copy_version_ref
- display_language_locale
- accessibility_accommodation_ref
- visible_fields_hash
- redacted_or_hidden_fields_hash
- primary_cta_label_hash
- secondary_cta_labels_hash
- workflow_step_label_hash
- primary_action_availability_state: available | unavailable | blocked | not_required | manual_review
- safe_template_defaults_hidden_in_builder_hash
- safe_template_defaults_disclosed_in_preview_bool
- term_sheet_hash_shown
- maximum_exposure_cents_shown
- settlement_currency_shown
- no_trade_comparison_shown_bool
- payment_or_obligation_effect_shown_bool
- cancellation_refund_rule_shown_bool
- privacy_disclosure_change_shown_bool
- comprehension_prompt_refs_json
- render_snapshot_hash
- snapshot_state: draft | rendered | confirmed_against | stale | mismatch_blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


plain_language_copy_policy
- id
- policy_version
- applies_to_surface: intake_triage | template_gallery | guided_builder | trade_preview | review_queue_status | matched_trade_lock | final_confirmation | participant_dashboard | public_receipt_preview | payment_preview | evidence_submission | dispute_or_appeal | manual_review
- allowed_plain_status_codes_json
- internal_to_user_label_map_hash
- participant_term_map_hash
- canonical_task_card_pattern_ref
- max_visible_key_facts
- single_primary_action_required_bool
- safe_template_defaults_allowed_bool
- safe_template_default_material_fact_disclosure_required_bool
- required_user_questions_json
- required_one_sentence_summary_bool
- required_next_action_bool
- detail_drawer_required_bool
- forbidden_primary_copy_terms_json
- max_reading_level_label
- localization_required_bool
- accessibility_review_required_bool
- material_fact_omission_behavior: block | manual_review
- reviewer_decision_ref
- created_at
- updated_at


participant_explanation_record
- id
- subject_type: marketplace_intake_triage_record | offset_offer | pledge_swap_offer | matched_trade_lock_proposal | participant_confirmation_record | cleared_trade_agreement | payout_milestone | evidence_record | dispute_case | appeal_case | public_receipt_card_record | user_facing_status_record
- subject_id
- participant_id_hash
- ui_surface
- plain_language_copy_policy_ref
- simple_title_hash
- one_sentence_summary_hash
- key_fact_bullets_hash
- next_action_text_hash
- workflow_step_label_hash
- primary_action_label_hash
- secondary_action_labels_hash
- visible_key_fact_count
- safe_template_defaults_summary_hash
- safe_template_defaults_disclosed_bool
- money_or_obligation_effect_summary_hash
- privacy_effect_summary_hash
- failure_or_fallback_summary_hash
- advanced_detail_refs_hash
- internal_control_refs_hash
- participant_ui_render_snapshot_ref
- explanation_state: draft | shown | confirmed_against | stale | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


route_simplification_policy
- id
- policy_version
- applies_to_route: offers_new_offset | offers_directory | donation_offsets | pledge_swaps | moral_trade_primer | how_it_works | validation | paid_action_offers | worked_example_detail | create_similar | participant_dashboard | public_receipt
- public_page_default_shape_hash
- hero_max_words
- max_primary_ctas
- max_secondary_ctas
- max_visible_key_facts_per_card
- advanced_details_default_collapsed_bool
- advanced_filters_default_collapsed_bool
- factor_codes_hidden_from_primary_copy_bool
- impact_score_like_metrics_hidden_from_default_bool
- route_fallback_minimal_copy_required_bool
- signed_out_preview_allowed_bool
- account_required_before_save_publish_review_bool
- worked_example_default_duration_policy_ref
- long_duration_pledge_default_block_bool
- micro_pledge_default_required_bool
- screenshot_qa_required_bool
- forbidden_primary_copy_terms_json
- reviewer_decision_ref
- created_at
- updated_at


route_simplification_audit_record
- id
- route_simplification_policy_ref
- route_path
- page_type: public_learn | offer_directory | create_flow | trust_or_validation | worked_example | participant_workspace | public_receipt | fallback
- route_state: intended_render | route_fallback | signed_out | signed_in_draft | empty_state | blocked_state | details_drawer | final_confirmation | public_publication
- desktop_screenshot_ref
- mobile_screenshot_ref
- simplified_copy_snapshot_hash
- primary_cta_count
- secondary_cta_count
- visible_key_fact_count_max
- forbidden_primary_copy_detected_state: none | possible | blocking | manual_review
- raw_factor_code_primary_copy_state: absent | present_blocking | manual_review
- impact_score_like_metric_primary_copy_state: absent | present_blocking | manual_review
- advanced_filter_default_state: collapsed | expanded_blocking | not_applicable | manual_review
- fallback_diagnostics_primary_copy_state: absent | present_blocking | manual_review
- signed_out_dead_end_state: absent | present_blocking | manual_review
- long_duration_default_example_state: absent | present_blocking | manual_review
- route_simplification_state: pending | passed | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


counterparty_blinding_policy
- id
- policy_version
- applies_to: donation_offset | pledge_swap | compensated_moral_action | direct_pair | batch_clearing | manual_review
- prelock_disclosure_allowed_fields_json
- postlock_disclosure_allowed_fields_json
- exact_identity_prelock_allowed_bool
- exact_caps_prelock_allowed_bool
- rare_bucket_combination_suppression_bool
- direct_contact_prelock_allowed_bool
- user_safety_review_required_bool
- privacy_grant_required_bool
- disclosure_failure_behavior: block | redacted_preview | manual_review
- reviewer_decision_ref
- created_at
- updated_at


staged_counterparty_disclosure_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | direct_pair_clearing_record | matching_clearing_run
- subject_id
- participant_id_hash
- counterparty_blinding_policy_ref
- disclosure_stage: public_browse | broad_preview | matched_preview | final_lock | post_lock | dispute | public_completion | manual_review
- disclosed_fields_json
- withheld_fields_hash
- privacy_grant_refs
- user_safety_review_state
- rare_bucket_or_small_cell_review_state
- disclosure_state: not_started | redacted | presented | blocked | withdrawn | superseded | manual_review
- reviewer_decision_ref
- created_at
- updated_at


recipient_acceptance_record
- id
- subject_type: offset_offer | matched_trade_lock_proposal | cleared_trade_agreement | payout_milestone | donation_receipt_record | impact_claim_record
- subject_id
- recipient_registry_ref
- payment_destination_ref
- recipient_public_association_policy_ref
- restricted_use_terms_hash
- milestone_evidence_request_hash
- public_association_level: none | aggregate_only | named_recipient | named_with_offset_context | promotional_use | manual_review
- recipient_authorized_representative_hash
- representative_authority_assessment_ref
- acceptance_state: not_required | requested | accepted | declined | disputed | blocked | manual_review | superseded
- adverse_association_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


ai_preference_elicitation_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | participant_confirmation_record
- subject_id
- participant_id_hash
- ai_preference_elicitation_policy_ref
- elicitation_scope: baseline | caps | side_constraints | empirical_assumptions | cause_buckets | evidence_preferences | fallback_rules | manual_review
- ai_output_hash
- user_edited_structured_input_hash
- hidden_willingness_to_pay_inference_prohibited_bool
- autonomous_counteroffer_or_acceptance_bool
- state_change_allowed_bool
- participant_confirmation_record_ref
- elicitation_state: sandbox | user_reviewed | converted_to_structured_input | discarded | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


post_clear_audit_record
- id
- subject_type: cleared_trade_agreement | matched_trade_lock_proposal | payment_event | evidence_record | payout_milestone | impact_claim_record
- subject_id
- post_clear_audit_policy_ref
- audit_type: random_sample | risk_triggered | dispute_triggered | payment_triggered | evidence_triggered | recipient_triggered | classification_triggered | manual_review
- sampled_fields_json
- term_sheet_match_state: not_checked | matched | mismatch | manual_review
- baseline_and_evidence_match_state: not_checked | matched | mismatch | manual_review
- recipient_acceptance_match_state: not_checked | matched | mismatch | manual_review
- payment_and_reconciliation_match_state: not_checked | matched | mismatch | manual_review
- privacy_or_disclosure_match_state: not_checked | matched | mismatch | manual_review
- classification_match_state: not_checked | matched | mismatch | manual_review
- corrective_action_refs_json
- public_reputation_effect_prohibited_bool
- audit_state: pending | passed | failed | corrective_action_open | closed | superseded
- reviewer_decision_ref
- created_at
- updated_at


cause_bucket_taxonomy
- id
- policy_version
- taxonomy_type: offered_cause | opposed_cause | compromise_destination | action_bucket | counterparty_bucket | manual_review
- allowed_bucket_codes_json
- bucket_definition_hashes_json
- protected_trait_proxy_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- ideology_or_psychology_inference_prohibited_bool
- plural_reviewer_panel_ref
- public_summary_hash
- taxonomy_state: draft | active | deprecated | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


cause_bucket_assignment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | seed_template | worked_example
- subject_id
- participant_id_hash
- cause_bucket_taxonomy_ref
- participant_selected_bucket_codes_json
- reviewer_normalized_bucket_codes_json
- assignment_confidence_state: self_attested | reviewer_normalized | disputed | blocked | manual_review | superseded
- assignment_visibility: participant_only | reviewer_only | counterparty_band_only | public_coarse
- affects_counterparty_distinctness_bool
- affects_trade_classification_bool
- assignment_state: draft | previewed | locked | disputed | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


direct_pair_clearing_record
- id
- trade_type: donation_offset | pledge_swap | compensated_moral_action
- source_offer_ids
- matched_trade_lock_proposal_ref
- initiator_participant_id_hash
- invited_or_known_counterparty_id_hash
- invite_or_known_counterparty_ref
- direct_pair_clearing_policy_ref
- no_background_networking_bool
- two_party_terms_snapshot_hash
- final_confirmation_record_refs
- privacy_grant_refs
- user_safety_review_state
- matching_clearing_run_ref
- direct_pair_state: draft | invited | previewed | both_confirmed | locked | expired | withdrawn | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


resource_compatibility_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope | side_agreement_disclosure
- subject_id
- participant_ids_hash
- resource_compatibility_policy_ref
- resource_or_action_conflict_type: none_disclosed | mutually_exclusive_resource | mutually_exclusive_action | incompatible_destination | incompatible_timing | zero_sum_control_claim | third_party_control_conflict | manual_review | unknown
- joint_feasibility_state: feasible | feasible_with_conditions | under_review | infeasible_blocking | disputed | manual_review | superseded
- hybrid_or_compromise_good_state: not_applicable | identified | unclear | blocked | manual_review
- incompatible_duty_or_control_refs_json
- review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


net_offset_accounting_record
- id
- subject_type: offset_offer | matched_trade_lock_proposal | cleared_trade_agreement | negative_commitment_scope | evidence_record
- subject_id
- participant_id_hash
- net_offset_accounting_policy_ref
- baseline_opposed_action_type: donation | abstention | advocacy | purchase | service_use | other | unknown
- baseline_opposed_amount_cents
- baseline_opposed_action_units
- matched_canceled_amount_cents
- matched_canceled_action_units
- compromise_transfer_amount_cents
- sponsor_or_match_amount_cents
- residual_opposed_amount_cents
- residual_opposed_action_units
- residual_action_policy: allowed_if_disclosed | blocks_clearance | manual_review | not_applicable
- substitution_channel_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- evidence_claim_refs_json
- net_offset_state: draft | previewed | locked | verified | challenged | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


non_public_goods_tier_policy
- id
- policy_version
- tier: tier_1_money_only_donation_offset | tier_2_donation_offset_with_abstention_or_additionality_proof | tier_3_closed_counterparty_pledge_swap | tier_4_open_market_pledge_swap_or_compensated_action
- allowed_release_stages_json
- allowed_trade_types_json
- real_money_allowed_bool
- open_market_matching_allowed_bool
- compensation_allowed_bool
- negative_commitment_allowed_bool
- max_counterfactual_trust_class_allowed
- required_control_pack_refs
- pilot_exit_criteria_policy_ref
- reviewer_decision_ref
- created_at
- updated_at


risk_control_pack
- id
- policy_version
- pack_name
- applies_to_trade_type: donation_offset | pledge_swap | compensated_moral_action | performance_bond | side_agreement | evidence_claim | payment_event | manual_review
- applies_to_release_stages_json
- applies_to_tiers_json
- required_control_codes_json
- optional_control_codes_json
- not_required_control_codes_json
- fail_closed_unknown_controls_bool
- control_pack_hash
- reviewer_decision_ref
- created_at
- updated_at


control_applicability_matrix
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | payment_event | evidence_record | dispute_case | appeal_case
- subject_id
- release_stage
- trade_type
- non_public_goods_market_tier
- jurisdiction_bucket
- money_movement_bool
- participant_term_sheet_required_bool
- counterparty_blinding_required_bool
- recipient_acceptance_required_bool
- ai_preference_elicitation_used_bool
- post_clear_audit_required_bool
- compensation_bool
- negative_commitment_bool
- high_stakes_or_irreversible_bool
- open_market_matching_bool
- evidence_burden_level
- noncompensable_blocker_present_bool
- stale_offer_bool
- batch_clearing_required_bool
- direct_pair_clearing_bool
- behavioral_micro_pledge_required_bool
- pledge_unit_granularity
- pledge_duration_units
- unit_specific_baseline_required_bool
- cumulative_micro_pledge_cap_required_bool
- food_abstention_health_safety_review_required_bool
- cause_bucket_taxonomy_ref
- resource_compatibility_required_bool
- net_offset_accounting_required_bool
- confidential_verification_required_bool
- applicable_risk_control_pack_refs
- applicable_control_codes_json
- matrix_hash
- reviewer_decision_ref
- created_at
- updated_at


control_requirement_result
- id
- control_applicability_matrix_ref
- risk_control_pack_ref
- subject_type
- subject_id
- control_code
- noncompensable_bool
- control_state: pending | passed | blocked | not_required_for_stage | waived | superseded
- source_assessment_ref
- evidence_refs_json
- reviewer_decision_ref
- privileged_waiver_action_ref
- reason_codes_json
- created_at
- updated_at


counterfactual_trust_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope | pledge_performance_bond_record | evidence_record
- subject_id
- participant_id_hash
- counterfactual_trust_policy_ref
- claim_category: direct_payment | destination_proof | short_horizon_abstention | short_horizon_action | long_duration_behavior_change | diffuse_lifestyle_change | compensated_personal_action | other
- counterfactual_trust_class: low | medium | high | unknown
- baseline_preexistence_state: preexisting | partly_preexisting | marketplace_prompted | unknown | disputed
- preexisting_relationship_or_closed_counterparty_state: known_counterparty | invite_only_counterparty | open_market_counterparty | represented_entity | unknown
- open_market_matching_allowed_bool
- required_evidence_claim_types_json
- remaining_uncertainty_disclosure_hash
- assessment_state: draft | under_review | non_blocking | blocked | preview_only | superseded
- reviewer_decision_ref
- created_at
- updated_at


private_exchange_rate_quote_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | bargaining_round_record
- subject_id
- participant_id_hash
- quote_type: clearing_ratio_bound | side_payment_bound | counterpart_volume_bound | action_money_tradeoff | empirical_effectiveness_tradeoff | manual_review
- private_quote_terms_hash
- acceptable_min_bps
- acceptable_max_bps
- settlement_currency
- disclosure_scope: participant_only | reviewer_only | counterparty_band_only | public_suppressed
- public_moral_price_prohibited_bool
- quote_state: draft | active | locked | expired | superseded | withdrawn
- reviewer_decision_ref
- created_at
- updated_at


market_simulation_run
- id
- release_gate_ref
- trade_type: donation_offset | pledge_swap | compensated_moral_action | performance_bond | mixed
- non_public_goods_market_tier
- simulation_type: synthetic_liquidity | red_team | abuse_case | privacy_enumeration | holdup | counterfactual_trust | payment_replay | evidence_forgery | manual_review
- input_bundle_hash
- cause_bucket_taxonomy_ref
- cause_bucket_assignment_refs
- direct_pair_clearing_record_refs
- resource_compatibility_assessment_refs
- net_offset_accounting_record_refs
- scenario_pack_hash
- simulated_actor_count
- simulated_offer_count
- matched_volume_cents
- blocked_or_abuse_case_count
- failure_modes_json
- mitigation_refs_json
- simulation_state: planned | run | passed | failed | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


pilot_exit_criteria_policy
- id
- policy_version
- applies_to_trade_type: donation_offset | pledge_swap | compensated_moral_action | performance_bond | mixed
- non_public_goods_market_tier
- scale_up_thresholds_json
- pause_thresholds_json
- rollback_thresholds_json
- max_review_burden_hours
- max_dispute_rate_bps
- max_privacy_or_safety_incidents
- minimum_verified_surplus_rate_bps
- matched_volume_not_sufficient_bool
- reviewer_decision_ref
- created_at
- updated_at


pilot_scale_decision_record
- id
- release_gate_ref
- pilot_exit_criteria_policy_ref
- trade_type
- non_public_goods_market_tier
- metrics_bundle_hash
- simulation_run_refs
- decision_state: continue_preview | start_manual_pilot | scale_up | pause | rollback | close | superseded
- reason_codes_json
- privileged_action_ref
- reviewer_decision_ref
- created_at
- updated_at


behavioral_micro_pledge_policy
- id
- policy_version
- applies_to_trade_type: pledge_swap | compensated_moral_action | manual_review
- applies_to_action_bucket: food_abstention | diet_abstention | lifestyle_abstention | other_behavioral_pledge | manual_review
- default_unit_granularity: one_meal | few_meals | one_day | few_days | manual_review
- default_duration_options_json
- max_default_duration_units
- longer_duration_behavior: block | preview_only | micro_pledge_sequence | manual_review
- micro_pledge_sequence_allowed_bool
- renewal_confirmation_required_bool
- auto_rollover_allowed_bool
- default_evidence_ladder_policy_ref
- default_evidence_claim_types_json
- self_attestation_default_allowed_bool
- meal_photo_or_receipt_default_required_bool
- raw_evidence_default_counterparty_visible_bool
- default_per_unit_amount_min_cents
- default_per_unit_amount_max_cents
- max_default_performance_bond_cents
- personal_cash_compensation_default: disallow | preview_only | manual_review | allowed_if_policy_approved
- default_value_destination: verified_charity_or_cause | participant_cash | mixed | manual_review
- default_unit_settlement_mode: per_unit | milestone_batch | all_or_nothing_manual_review
- max_sequence_total_amount_cents
- max_sequence_total_duration_units
- rolling_window_max_units
- rolling_window_max_duration_days
- rolling_window_max_payout_cents
- cumulative_sequence_escalation_behavior: block | renew_confirmation | manual_review
- above_band_manual_review_required_bool
- evidence_burden_escalation_policy_ref
- counterfactual_trust_escalation_policy_ref
- reviewer_decision_ref
- created_at
- updated_at


micro_pledge_sequence_record
- id
- subject_type: pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | pledge_swap_performance_schedule
- subject_id
- participant_id_hash
- behavioral_micro_pledge_policy_ref
- unit_granularity: one_meal | few_meals | one_day | few_days | custom_manual_review
- planned_unit_count
- completed_unit_count
- unit_baseline_snapshot_refs
- unit_additionality_review_states_json
- unit_confirmation_record_refs
- per_unit_amount_cents
- sequence_total_amount_cap_cents
- sequence_total_duration_cap_units
- rolling_window_unit_count
- rolling_window_duration_days
- cumulative_cap_policy_ref
- cumulative_cap_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- food_abstention_health_safety_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- unit_settlement_mode: per_unit | milestone_batch | all_or_nothing | manual_review
- unit_outcomes_json
- unit_payment_or_release_refs_json
- unit_evidence_record_refs_json
- failed_unit_effect_policy: cancel_failed_unit_only | pause_future_units | cancel_remaining_units | all_or_nothing_failure | manual_review
- auto_rollover_prohibited_bool
- next_unit_requires_renewed_confirmation_bool
- cumulative_burden_disclosure_ref
- renewed_confirmation_record_refs
- evidence_checkpoint_refs_json
- sequence_state: draft | active | paused | completed | expired | superseded | blocked | manual_review
- reviewer_decision_ref
- created_at
- updated_at


micro_pledge_window_record
- id
- subject_type: pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | pledge_swap_performance_schedule | micro_pledge_sequence_record
- subject_id
- participant_id_hash
- behavioral_micro_pledge_policy_ref
- unit_granularity: one_meal | few_meals | one_day | few_days | custom_manual_review
- window_label: breakfast | lunch | dinner | snack | custom_meal | one_day | few_days | manual_review
- window_start_at
- window_end_at
- time_authority_policy_ref
- pre_performance_confirmation_record_ref
- pre_performance_confirmed_at
- pre_performance_lock_state: not_required | required | confirmed_before_window | missed | stale | manual_review | superseded
- post_performance_attestation_record_ref
- post_performance_evidence_due_at
- retroactive_claim_state: not_retroactive | retroactive_bookkeeping_only | under_review | blocked_for_moral_trade | manual_review | superseded
- evidence_record_refs
- challenge_window_policy_ref
- challenge_window_state
- window_state: draft | previewed | locked | active | attestation_due | evidence_under_review | satisfied | failed | expired | cancelled | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


approved_trade_template
- id
- template_slug
- template_version
- applies_to_trade_type: donation_offset | pledge_swap | compensated_moral_action | performance_bond | side_agreement
- applies_to_tiers_json
- allowed_release_stages_json
- allowed_cause_bucket_taxonomy_refs
- allowed_recipient_or_destination_classes_json
- allowed_amount_min_cents
- allowed_amount_max_cents
- allowed_action_units_json
- allowed_micro_pledge_window_granularities_json
- pre_performance_lock_required_bool
- retroactive_claim_behavior: block | bookkeeping_only | manual_review
- default_pledge_unit_granularity
- default_duration_options_json
- max_default_duration_units
- longer_duration_behavior: block | preview_only | micro_pledge_sequence | manual_review
- behavioral_micro_pledge_policy_ref
- unit_specific_baseline_required_bool
- cumulative_micro_pledge_cap_policy_ref
- food_abstention_health_safety_boundary_ref
- default_evidence_ladder_policy_ref
- default_per_unit_amount_min_cents
- default_per_unit_amount_max_cents
- max_sequence_total_amount_cents
- max_default_performance_bond_cents
- default_value_destination: verified_charity_or_cause | participant_cash | mixed | manual_review
- default_unit_settlement_mode: per_unit | milestone_batch | all_or_nothing_manual_review
- auto_rollover_allowed_bool
- allowed_evidence_claim_types_json
- required_control_pack_refs
- required_preview_fields_json
- prohibited_parameter_codes_json
- off_template_behavior: block | preview_only | manual_review
- template_state: draft | active | deprecated | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


template_instance_record
- id
- approved_trade_template_ref
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | side_agreement_disclosure
- subject_id
- participant_id_hash
- submitted_parameter_hash
- normalized_parameter_hash
- template_parameter_policy_ref
- conformance_state: draft | conforms | off_template_preview_only | off_template_manual_review | blocked | superseded
- off_template_reason_codes_json
- renewed_confirmation_required_bool
- reviewer_decision_ref
- created_at
- updated_at


review_capacity_policy
- id
- policy_version
- applies_to_review_type: offer_intake | matched_trade_lock | evidence_acceptance | payout_release | appeal | incident | off_template_exception | subsidy_pool | manual_review
- applies_to_trade_type: donation_offset | pledge_swap | compensated_moral_action | performance_bond | mixed
- applies_to_release_stages_json
- max_open_cases
- max_estimated_review_hours
- max_user_wait_days
- required_reviewer_roles_json
- neutral_panel_required_bool
- queue_overflow_behavior: waitlist | preview_only | expire_offer | pause_new_intake | manual_review
- stale_queue_behavior: renew_confirmation | expire_offer | manual_review
- reviewer_decision_ref
- created_at
- updated_at


review_queue_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | evidence_record | dispute_case | appeal_case | release_gate
- subject_id
- review_capacity_policy_ref
- queue_type: offer_intake | lock_review | evidence_review | payout_review | appeal_review | off_template_exception | incident_review | manual_review
- priority_bucket: standard | safety_critical | payment_deadline | appeal_deadline | manual_review
- assigned_reviewer_or_panel_ref
- estimated_review_by
- queue_state: queued | assigned | waiting_on_user | under_review | completed | expired | overflow_blocked | superseded
- user_facing_status_record_ref
- reviewer_decision_ref
- created_at
- updated_at


non_public_goods_subsidy_pool
- id
- sponsor_id_hash
- applies_to_trade_type: donation_offset | pledge_swap | compensated_moral_action | manual_review
- applies_to_tiers_json
- total_budget_cents
- settlement_currency
- source_of_funds_review_state
- sponsor_conflict_of_interest_state
- allowed_cause_bucket_taxonomy_refs
- allowed_recipient_or_destination_classes_json
- max_subsidy_per_participant_cents
- max_subsidy_per_trade_cents
- max_subsidy_ratio_bps
- public_disclosure_level
- refund_or_carry_forward_policy: return_to_sponsor | carry_forward | manual_review
- subsidy_pool_state: draft | active | paused | exhausted | closed | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


subsidy_schedule_record
- id
- non_public_goods_subsidy_pool_ref
- matching_clearing_run_ref
- matched_trade_lock_proposal_ref
- cleared_trade_agreement_ref
- subsidy_type: fixed_bonus | ratio_match | fee_offset | verification_cost_coverage | manual_review
- eligibility_input_hash
- subsidy_amount_cents
- subsidy_ratio_bps
- cap_binding_bool
- participant_moral_trade_volume_exclusion_bool
- impact_claim_exclusion_bool
- subsidy_state: previewed | reserved | applied | released | cancelled | refunded | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


noncompensable_blocker_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | side_agreement_disclosure | payment_event | evidence_record | dispute_case
- subject_id
- participant_id_hash
- noncompensable_blocker_policy_ref
- protected_interest_type: participant_waivable_interest | nonparticipant_interest | legal_or_regulatory | public_safety | truthful_reporting | civil_rights | confidentiality_or_privacy | institutional_process | digital_system_integrity | anti_threat | other
- blocking_control_codes_json
- attempted_compensation_or_waiver_state: none | possible | under_review | blocking | superseded
- personal_waiver_allowed_state: not_applicable | allowed_with_renewed_confirmation | disallowed | disputed | manual_review
- renewed_confirmation_record_refs
- review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


offer_validity_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | seed_template | worked_example
- subject_id
- offer_validity_policy_ref
- baseline_snapshot_hash
- terms_snapshot_hash
- empirical_assumption_snapshot_refs
- evidence_standard_refs_json
- jurisdiction_policy_version
- recipient_or_destination_refs_json
- valid_from
- offer_expires_at
- stale_at
- renewal_confirmation_record_refs
- stale_reason_codes_json
- validity_state: draft | valid | stale | expired | renewed | withdrawn | superseded | blocked
- reviewer_decision_ref
- created_at
- updated_at


batch_clearing_objective_policy
- id
- policy_version
- applies_to: donation_offset_batch | pledge_swap_preview | mixed
- objective_type: maximize_safe_matched_volume | maximize_safe_participant_count | minimize_unmatched_residual | balanced_volume_and_participants | manual_review
- fairness_rule: pro_rata_by_confirmed_volume | pro_rata_by_participant_cap | stable_id_largest_remainder | random_seeded_by_input_hash | manual_review
- tie_breaker_version
- private_cap_use_policy: allowed_in_sealed_computation_only | reviewer_only | disallow | manual_review
- moral_score_use_prohibited_bool
- database_order_use_prohibited_bool
- reviewer_preference_use_prohibited_bool
- reviewer_decision_ref
- created_at
- updated_at


batch_clearing_objective_result
- id
- matching_clearing_run_ref
- batch_clearing_objective_policy_ref
- objective_input_hash
- objective_value_summary_hash
- matched_volume_cents
- matched_participant_count
- unmatched_residual_cents
- pro_rata_or_tie_break_summary_hash
- excluded_for_safety_or_staleness_refs_json
- clearing_objective_state: computed | blocked | under_review | superseded | manual_review
- reviewer_decision_ref
- created_at
- updated_at


privacy_preserving_verification_attestation
- id
- subject_type: evidence_record | pledge_swap_offer | offset_offer | matched_trade_lock_proposal | cleared_trade_agreement | pledge_performance_bond_record | dispute_case
- subject_id
- participant_id_hash
- privacy_preserving_verification_policy_ref
- verifier_type: reviewer | approved_third_party | confidential_ai_monitor | provider_attestation | manual_review
- underlying_private_artifact_refs_hash
- attested_claim_type
- evidence_standard_ref
- attestation_result: satisfied | not_satisfied | inconclusive | challenged | superseded | manual_review
- uncertainty_disclosure_hash
- raw_disclosure_to_counterparty_allowed_bool
- privacy_grant_refs
- challenge_window_policy_ref
- challenge_window_state
- reviewer_decision_ref
- created_at
- updated_at


deployment_release_record
- id
- release_gate_ref
- environment: local | preview | staging | production
- release_stage
- feature_flags_json
- source_commit_hash
- build_artifact_hash
- dependency_lockfile_hash
- schema_migration_run_refs
- configuration_snapshot_ref
- policy_snapshot_bundle_hash
- provider_account_bindings_hash
- payment_mode: disabled | test | live
- deployment_state: planned | deployed | rolled_back | blocked | superseded
- rollback_target_ref
- reviewer_decision_ref
- created_at
- updated_at


configuration_snapshot
- id
- environment: local | preview | staging | production
- snapshot_type: feature_flags | env_vars | provider_bindings | payment_mode | policy_bundle | route_config | auth_rbac | rls_policy | full_runtime
- source_commit_hash
- build_artifact_hash
- config_hash
- secret_refs_hash
- policy_snapshot_bundle_hash
- release_gate_ref
- created_by_hash
- reviewer_decision_ref
- created_at
- updated_at


configuration_change_record
- id
- configuration_snapshot_ref
- subject_type: release_gate | deployment_release_record | provider_account | feature_flag | policy_snapshot | environment
- subject_id
- change_type: create | update | rollback | emergency_disable | supersede
- prior_config_hash
- next_config_hash
- actor_id_hash
- privileged_action_ref
- reason_codes_json
- review_state: pending | approved | blocked | superseded
- created_at
- updated_at


matching_clearing_run
- id
- run_type: donation_offset_batch | pledge_swap_preview | discovery_preview
- clearing_mode: batch | direct_pair | preview_only | manual_review
- release_stage
- feature_flags_json
- input_bundle_hash
- candidate_subject_ids_hash
- normalized_input_ref
- excluded_records_json
- matching_algorithm_version
- privacy_policy_snapshot_ref
- state_interpretation_policy_ref
- participant_eligibility_policy_ref
- counterparty_distinctness_policy_ref
- deterministic_sort_key_version
- match_candidate_results_ref
- batch_clearing_objective_policy_ref
- batch_clearing_objective_result_ref
- offer_validity_record_refs
- noncompensable_blocker_assessment_refs
- manual_override_block_state
- review_state
- calculation_hash
- reviewer_decision_ref
- created_by
- created_at
- updated_at


option_set_comparison_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement
- subject_id
- participant_ids_hash
- no_trade_option_hash
- proposed_trade_option_hash
- alternative_option_hashes_json
- option_generation_policy_ref
- participant_option_judgments_json
- preference_comparability_policy_ref
- participant_option_comparability_json
- dominance_applicability_state: applicable | not_applicable_incomparable | not_applicable_lexical_block | insufficient_information | manual_review | superseded
- cardinal_score_required_bool
- cardinal_score_prohibited_bool
- incomparability_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- pareto_dominance_review_state: not_required | under_review | no_known_dominating_option | dominated_option_blocking | alternative_unavailable | incomparable_or_noncardinal_manual_review | manual_review | superseded
- unavailable_alternative_reason_codes_json
- privacy_redaction_policy_ref
- reviewer_decision_ref
- created_at
- updated_at


bargaining_protocol
- id
- policy_version
- applies_to: donation_offset | pledge_swap | compensated_moral_action | manual_review
- protocol_type: posted_template | sealed_cap_batch_clearing | one_shot_counteroffer | neutral_mediator | manual_review
- private_cap_disclosure_behavior: never_to_counterparty | reviewer_only | aggregate_band_only | manual_review
- dynamic_pricing_allowed_bool
- counteroffer_limit
- anti_holdup_cooldown_hours
- artificial_urgency_prohibited_bool
- rejection_nonretaliation_required_bool
- renewed_confirmation_required_for_counteroffer_bool
- reviewer_decision_ref
- created_at
- updated_at


bargaining_round_record
- id
- bargaining_protocol_ref
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement
- subject_id
- round_index
- proposed_by_hash
- terms_snapshot_hash
- changed_terms_json
- private_cap_disclosure_state: none | reviewer_only | aggregate_band | blocked | manual_review
- holdup_or_pressure_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- participant_confirmation_record_refs
- counteroffer_state: draft | presented | accepted | rejected | expired | withdrawn | superseded
- reviewer_decision_ref
- created_at
- updated_at


empirical_assumption_snapshot
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | evidence_record
- subject_id
- participant_id_hash
- assumption_type: relative_charity_effectiveness | action_efficacy | baseline_likelihood | substitution_likelihood | performance_likelihood | causal_route | empirical_belief_difference | other
- assumption_summary_hash
- confidence_level: low | medium | high
- evidence_refs_json
- material_to_surplus_confirmation_bool
- stale_if_challenged_bool
- challenge_state: not_applicable | open | closed | superseded
- assumption_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


moral_side_constraint_profile
- id
- participant_id_hash
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope
- subject_id
- side_constraint_policy_ref
- side_constraint_context: none_disclosed | impermissible_action | nondelegable_duty | agent_relative_limit | intention_sensitive_act | personal_integrity_limit | sacred_value_or_taboo | other | unknown
- blocked_action_or_term_hash
- waiver_allowed_bool
- waiver_confirmation_required_bool
- cooling_off_required_bool
- side_constraint_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


intrapersonal_self_offset_record
- id
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | evidence_record
- subject_id
- participant_id_hash
- self_offset_type: personal_offset | personal_bookkeeping | internal_moral_trade_like_planning | ordinary_donation | manual_review
- external_counterparty_present_bool
- represented_moral_perspective_hash
- classification_state: self_offset_only | ordinary_donation_or_matching | eligible_interpersonal_moral_trade | manual_review | superseded
- excluded_from_moral_trade_metrics_bool
- reviewer_decision_ref
- created_at
- updated_at


trade_burden_accounting_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | participant_confirmation_record
- subject_id
- participant_id_hash
- trade_burden_policy_ref
- monetary_burden_cents
- platform_fee_burden_cents
- estimated_time_burden_minutes_bucket
- evidence_burden_level: none | low | medium | high | invasive_blocked | manual_review
- privacy_disclosure_burden_level: none | low | medium | high | manual_review
- attention_or_coordination_burden_level: low | medium | high | manual_review
- challenge_or_dispute_burden_level: none | low | medium | high | manual_review
- residual_obligation_summary_hash
- burden_disclosure_record_ref
- burden_net_surplus_confirmation_state: not_required | requested | confirmed | declined | stale | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


moral_difference_attestation_record
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | intrapersonal_self_offset_record
- subject_id
- participant_id_hash
- moral_difference_policy_ref
- asserted_trade_basis: moral_view_difference | moral_priority_difference | indexical_obligation_difference | empirical_belief_difference | moral_prudential_asymmetry | ordinary_trade_or_donation | self_offset_only | unclear | manual_review
- coarse_moral_reason_codes_json
- disclosure_level: reviewer_only | counterparty_coarse | public_aggregate_only | manual_review
- full_theory_required_bool
- ideology_inference_prohibited_bool
- classification_support_state: not_required | supports_moral_trade_classification | ordinary_trade_blocking | self_offset_blocking | under_review | manual_review | superseded
- inconsistency_or_bad_faith_signal_state: none | possible | under_review | blocking | manual_review
- reviewer_decision_ref
- created_at
- updated_at


matched_trade_lock_proposal
- id
- trade_type: donation_offset | pledge_swap
- source_offer_ids
- matching_clearing_run_ref
- participant_ids_hash
- approved_trade_template_ref
- template_instance_record_refs
- template_conformance_state
- review_queue_record_refs
- participant_term_sheet_record_refs
- counterparty_blinding_policy_ref
- staged_counterparty_disclosure_record_refs
- recipient_acceptance_record_refs
- ai_preference_elicitation_record_refs
- post_clear_audit_record_refs
- non_public_goods_subsidy_pool_ref
- subsidy_schedule_record_refs
- direct_pair_clearing_record_ref
- cause_bucket_assignment_refs
- resource_compatibility_assessment_ref
- net_offset_accounting_record_refs
- proposed_terms_snapshot_hash
- no_trade_baseline_snapshot_refs
- baseline_integrity_assessment_ref
- option_set_comparison_record_ref
- pareto_dominance_review_state
- preference_comparability_policy_ref
- participant_option_comparability_state
- incomparability_review_state
- trade_burden_accounting_record_ref
- burden_net_surplus_confirmation_state
- moral_difference_attestation_record_ref
- moral_difference_attestation_review_state
- bargaining_protocol_ref
- bargaining_round_record_refs
- empirical_assumption_snapshot_refs
- moral_side_constraint_profile_refs
- side_constraint_review_state
- intrapersonal_self_offset_record_ref
- self_offset_classification_state
- final_confirmation_record_refs
- participant_eligibility_record_refs
- matched_counterparty_bucket_summary
- matched_volume_cents
- settlement_currency
- clearing_ratio_bps
- clearing_ratio_policy_ref
- compromise_destination_ref
- verified_payment_destination_ref
- performance_terms_snapshot_hash
- performance_schedule_ref
- behavioral_micro_pledge_policy_ref
- pledge_unit_granularity
- pledge_duration_units
- unit_baseline_snapshot_refs
- unit_additionality_review_state
- micro_pledge_sequence_record_ref
- cumulative_micro_pledge_cap_policy_ref
- cumulative_sequence_exposure_cents
- longer_duration_manual_review_state
- food_abstention_health_safety_review_state
- micro_pledge_window_record_refs
- pre_performance_lock_confirmation_refs
- retroactive_claim_state
- evidence_standard_refs_json
- verification_burden_policy_ref
- commitment_reservation_refs
- atomic_settlement_group_ref
- residual_obligation_summary_json
- fallback_or_cancellation_rule
- breach_remedy_policy_ref
- compensated_action_terms_ref
- ordinary_service_procurement_review_state
- agreement_amendment_record_refs
- donor_of_record_policy_ref
- donation_receipt_record_refs
- negative_commitment_scope_refs
- action_reversibility_assessment_ref
- third_party_obligation_assessment_ref
- representative_authority_assessment_ref
- reporting_integrity_assessment_ref
- protected_reporting_review_state
- civil_rights_discrimination_assessment_ref
- civil_rights_review_state
- coercion_undue_influence_assessment_ref
- participant_autonomy_review_state
- confidentiality_privacy_rights_assessment_ref
- confidentiality_review_state
- evidence_authenticity_assessment_ref
- synthetic_media_review_state
- financial_crime_fraud_assessment_ref
- source_of_funds_review_state
- fraud_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- non_public_goods_market_tier
- non_public_goods_tier_policy_ref
- counterfactual_trust_assessment_ref
- counterfactual_trust_class
- preexisting_relationship_or_closed_counterparty_state
- open_market_matching_allowed_bool
- control_applicability_matrix_ref
- risk_control_pack_refs
- control_requirement_result_refs
- private_exchange_rate_quote_record_refs
- market_simulation_run_ref
- pilot_exit_criteria_policy_ref
- pilot_scale_decision_record_ref
- noncompensable_blocker_assessment_ref
- noncompensable_blocker_review_state
- offer_validity_record_refs
- stale_offer_state
- batch_clearing_objective_result_ref
- privacy_preserving_verification_attestation_refs
- anti_corruption_assessment_ref
- process_integrity_review_state
- pledge_performance_bond_record_refs
- challenge_window_policy_ref
- user_facing_status_record_refs
- proposal_state: draft | presented | participant_confirmed | locked | expired | withdrawn | rejected | superseded
- expires_at
- reviewer_decision_ref
- created_at
- updated_at


baseline_integrity_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | negative_commitment_scope
- subject_id
- participant_id_hash
- baseline_snapshot_hash
- baseline_integrity_policy_ref
- baseline_origin: preexisting_plan | recurring_pattern | prompted_by_marketplace | escalated_after_counterparty_interest | unknown
- prior_behavior_evidence_refs_json
- marketplace_prompted_change_bool
- escalation_or_threat_indicator_state: none | possible | blocking | manual_review
- baseline_manufacturing_review_state: not_required | under_review | non_blocking | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


commitment_inventory_record
- id
- participant_id_hash
- commitment_type: planned_donation | opposed_donation_abstention | pledged_action | abstention | payment_authorization | evidence_artifact | other
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | evidence_record
- subject_id
- no_trade_baseline_snapshot_hash
- negative_commitment_scope_ref
- action_unit
- amount_cents
- currency
- performance_window_start
- performance_window_end
- total_capacity_units
- reserved_capacity_units
- fulfilled_capacity_units
- commitment_inventory_policy_ref
- reuse_policy: exclusive | pooled_if_preconfirmed | reusable_evidence_only | manual_review
- inventory_state: draft | available | reserved | locked | fulfilled | released | expired | disputed | superseded
- privacy_grant_refs
- reviewer_decision_ref
- created_at
- updated_at


commitment_reservation_record
- id
- commitment_inventory_record_ref
- matched_trade_lock_proposal_ref
- cleared_trade_agreement_ref
- reserved_units
- reserved_amount_cents
- reservation_scope: lock_proposal | payment_authorization | evidence_claim | performance_obligation
- reservation_state: pending | reserved | locked | fulfilled | released | expired | cancelled | superseded
- double_count_check_state: not_required | passed | blocked | manual_review
- release_reason
- reviewer_decision_ref
- created_at
- updated_at


atomic_settlement_group
- id
- trade_type: donation_offset | pledge_swap
- matched_trade_lock_proposal_refs
- required_participant_count
- required_final_confirmation_refs
- required_payment_authorization_refs
- commitment_reservation_refs
- atomic_settlement_policy_ref
- all_or_none_state: draft | waiting_for_confirmations | waiting_for_authorizations | locked | failed | released | cancelled | superseded
- failed_member_behavior: expire_group | recompute_group | manual_review
- no_partial_capture_bool
- no_partial_disclosure_bool
- no_irreversible_performance_before_lock_bool
- reviewer_decision_ref
- created_at
- updated_at


pledge_swap_performance_schedule
- id
- pledge_swap_offer_id
- matched_trade_lock_proposal_ref
- cleared_trade_agreement_ref
- performance_schedule_policy_ref
- behavioral_micro_pledge_policy_ref
- pledge_unit_granularity: one_meal | few_meals | one_day | few_days | week | month | custom_manual_review
- pledge_duration_units
- micro_pledge_sequence_record_ref
- micro_pledge_window_record_refs
- pre_performance_lock_required_bool
- retroactive_claim_behavior: block | bookkeeping_only | manual_review
- default_evidence_ladder_policy_ref
- per_unit_amount_cents
- sequence_total_amount_cap_cents
- auto_rollover_prohibited_bool
- renewal_confirmation_required_bool
- performance_start_at
- performance_end_at
- checkpoint_schedule_json
- synchronized_start_required_bool
- counterpart_nonperformance_suspension_rule
- reciprocal_release_trigger
- grace_or_cure_period_days
- evidence_due_schedule
- public_breach_disclosure_allowed_bool
- breach_remedy_policy_ref
- schedule_state: draft | previewed | locked | active | suspended | completed | released | disputed | superseded
- reviewer_decision_ref
- created_at
- updated_at


compensated_action_terms
- id
- pledge_swap_offer_id
- matched_trade_lock_proposal_ref
- payer_participant_id_hash
- performer_participant_id_hash
- compensation_mode: none | sponsor_pays_performer | performer_pays_sponsor | mutual_payment | manual_review
- compensation_amount_cents
- settlement_currency
- payment_timing: on_lock | on_evidence_acceptance | per_checkpoint | on_completion | manual_review
- compensation_destination_ref
- fee_policy_ref
- tax_or_reporting_review_state
- labor_employment_review_state
- professional_service_review_state
- vulnerability_or_undue_inducement_review_state
- coercion_review_state
- anti_corruption_review_state
- process_integrity_review_state
- reporting_integrity_review_state
- civil_rights_review_state
- coercion_undue_influence_assessment_ref
- participant_autonomy_review_state
- confidentiality_privacy_rights_assessment_ref
- confidentiality_review_state
- evidence_authenticity_assessment_ref
- synthetic_media_review_state
- financial_crime_fraud_assessment_ref
- source_of_funds_review_state
- fraud_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- legal_review_state
- externality_review_state
- compensation_policy_ref
- payer_moral_reason_hash
- performer_counterfactual_acceptance_state: not_recorded | says_would_not_without_compensation | says_would_anyway | unclear | manual_review
- ordinary_service_procurement_review_state: not_required | under_review | ordinary_service_blocking | non_blocking | manual_review
- moral_trade_classification_rationale_hash
- terms_state: draft | previewed | locked | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


negative_commitment_scope
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | commitment_inventory_record
- subject_id
- participant_id_hash
- negative_commitment_type: opposed_donation_abstention | action_abstention | alternative_channel_abstention | non_solicitation | complaint_withdrawal_or_non_reporting | truthful_statement_or_review_suppression | other
- covered_action_summary_hash
- covered_time_window_start
- covered_time_window_end
- known_affiliates_or_substitutes_json
- excluded_de_minimis_conduct_json
- substitution_policy: block_substitutes | disclose_and_review | allowed_if_outside_scope | manual_review
- reporting_integrity_assessment_ref
- protected_reporting_review_state
- civil_rights_discrimination_assessment_ref
- civil_rights_review_state
- coercion_undue_influence_assessment_ref
- participant_autonomy_review_state
- confidentiality_privacy_rights_assessment_ref
- confidentiality_review_state
- evidence_authenticity_assessment_ref
- synthetic_media_review_state
- financial_crime_fraud_assessment_ref
- fraud_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- abstention_confidence_level: low | medium | high
- evidence_standard_ref
- verification_burden_policy_ref
- privacy_grant_refs
- scope_state: draft | previewed | locked | fulfilled | challenged | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


action_reversibility_assessment
- id
- subject_type: pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement
- subject_id
- action_reversibility_policy_ref
- reversibility_level: reversible | partly_reversible | effectively_irreversible | unknown
- high_stakes_domain_flags_json
- cooling_off_required_bool
- cooling_off_until
- legal_review_state
- vulnerability_or_undue_inducement_review_state
- nonparticipant_externality_review_state
- irreversible_performance_before_lock_block_bool
- reliance_state_allowed: preview_only | manual_review_only | reliance_bearing_allowed
- reviewer_decision_ref
- created_at
- updated_at


donor_of_record_policy
- id
- policy_version
- applies_to: donation_offset | pledge_swap_compensation | external_donation_evidence | manual_review
- donor_of_record_options_json
- tax_receipt_behavior: no_receipt | receipt_to_payer | receipt_to_recipient | receipt_to_sponsor | manual_review
- tax_benefit_claim_behavior: no_claim | participant_claim_if_eligible | sponsor_claim_if_eligible | manual_review
- charitable_solicitation_review_required_bool
- commercial_coventure_review_required_bool
- employer_match_or_daf_credit_behavior: disallow | disclose_and_review | manual_review
- no_tax_advice_disclaimer_required_bool
- reviewer_decision_ref
- created_at
- updated_at


donation_receipt_record
- id
- subject_type: offset_offer | matched_trade_lock_proposal | cleared_trade_agreement | payment_event | evidence_record
- subject_id
- donor_of_record_policy_ref
- donor_of_record_type: participant | counterparty | sponsor | platform | external_donor | unknown
- donor_of_record_hash
- receipt_recipient_hash
- receipt_amount_cents
- currency
- receipt_artifact_ref
- tax_benefit_claim_state: not_applicable | unclaimed | claimed_by_participant | claimed_by_sponsor | disputed | manual_review
- charitable_solicitation_review_state
- commercial_coventure_review_state
- tax_or_reporting_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- review_state
- reviewer_decision_ref
- created_at
- updated_at


third_party_obligation_assessment
- id
- subject_type: pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope
- subject_id
- third_party_obligation_policy_ref
- obligation_domains_json: employment | school | fiduciary | contract | court_order | confidentiality | intellectual_property | professional_ethics | family_or_care | donor_restriction | other
- participant_disclosure_hash
- potential_conflict_state: none_disclosed | possible_conflict | conflict_blocking | under_review | superseded
- third_party_consent_or_clearance_state: not_required | provided | unavailable | disputed | manual_review
- legal_review_state
- privacy_grant_refs
- reviewer_decision_ref
- created_at
- updated_at


representative_authority_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope | donation_receipt_record | side_agreement_disclosure
- subject_id
- participant_id_hash
- representative_authority_policy_ref
- claimed_capacity: self_only | agent_for_org | officer_or_employee | parent_or_guardian | trustee_or_fiduciary | campaign_or_political_org | charity_or_fiscal_host | donor_advised_fund_controller | informal_group | other | unknown
- represented_entity_hash
- authority_evidence_refs_json
- authority_scope_json
- authority_state: self_only_not_required | under_review | verified_for_scope | insufficient | disputed | blocked | superseded
- legal_review_state
- privacy_grant_refs
- reviewer_decision_ref
- created_at
- updated_at


reporting_integrity_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope | side_agreement_disclosure | evidence_record | dispute_case
- subject_id
- participant_id_hash
- reporting_integrity_policy_ref
- reporting_context: none_disclosed | safety_report | legal_or_regulatory_report | platform_abuse_report | professional_or_academic_complaint | workplace_or_school_complaint | journalistic_or_public_interest_disclosure | evidence_or_testimony | consumer_review_or_public_statement | unknown
- requested_suppression_or_withdrawal_state: none | possible | under_review | blocking | superseded
- truthful_evidence_or_statement_suppression_state: none | possible | under_review | blocking | manual_review
- retaliation_or_non_disparagement_pressure_state: none | possible | under_review | blocking | manual_review
- legal_review_state
- reviewer_decision_ref
- created_at
- updated_at


civil_rights_discrimination_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | negative_commitment_scope | side_agreement_disclosure | evidence_record | dispute_case | contact_interaction_record
- subject_id
- participant_id_hash
- civil_rights_policy_ref
- affected_domain: none_disclosed | employment | education | housing | public_accommodation | healthcare | financial_service | platform_access_or_moderation | charitable_service_delivery | voting_or_civic_participation | other | unknown
- protected_trait_or_activity_context: none_disclosed | possible | under_review | blocking | manual_review | superseded
- differential_treatment_state: none | possible | under_review | blocking | manual_review
- retaliation_or_harassment_state: none | possible | under_review | blocking | manual_review
- legal_review_state
- externality_review_state
- reviewer_decision_ref
- created_at
- updated_at


coercion_undue_influence_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | negative_commitment_scope | side_agreement_disclosure | evidence_record | dispute_case | contact_interaction_record
- subject_id
- participant_id_hash
- coercion_undue_influence_policy_ref
- vulnerability_context: none_disclosed | minor_or_legal_capacity_concern | employment_or_school_dependency | housing_or_immigration_dependency | medical_or_care_dependency | financial_distress | addiction_or_compulsion | acute_crisis | platform_power_asymmetry | family_or_intimate_relationship_pressure | other | unknown
- power_asymmetry_state: none | possible | under_review | blocking | manual_review | superseded
- undue_inducement_state: none | possible | under_review | blocking | manual_review
- coercive_pressure_state: none | possible | under_review | blocking | manual_review
- cooling_off_or_independent_advice_state: not_required | required | satisfied | failed | manual_review
- legal_review_state
- anti_threat_state
- user_safety_review_state
- externality_review_state
- reviewer_decision_ref
- created_at
- updated_at


confidentiality_privacy_rights_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | negative_commitment_scope | side_agreement_disclosure | evidence_record | dispute_case | privacy_grant | contact_interaction_record
- subject_id
- participant_id_hash
- confidentiality_privacy_rights_policy_ref
- data_or_secret_context: none_disclosed | participant_private_data | third_party_personal_data | confidential_relationship_data | client_patient_student_employee_record | credential_or_access_secret | private_communication | location_or_device_data | nonconsensual_intimate_or_sensitive_content | trade_secret_or_ip | other | unknown
- consent_or_authority_state: not_required | participant_self_disclosure_only | third_party_consent_provided | representative_authority_required | insufficient | disputed | blocking | manual_review
- misuse_or_disclosure_state: none | possible | under_review | blocking | manual_review | superseded
- credential_or_secret_handling_state: not_applicable | under_review | blocking | manual_review | non_blocking
- data_security_review_state
- legal_review_state
- reporting_integrity_review_state
- user_safety_review_state
- reviewer_decision_ref
- created_at
- updated_at


evidence_authenticity_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | negative_commitment_scope | side_agreement_disclosure | evidence_record | dispute_case | payout_milestone | payment_event
- subject_id
- participant_id_hash
- evidence_authenticity_policy_ref
- evidence_subject_refs_json
- artifact_or_provider_event_refs_json
- asserted_source_type: provider_webhook | receipt | screenshot | photo | video | audio | email | chat_log | exported_platform_data | location_or_device_log | public_record | third_party_attestation | self_attestation | ai_summary | other | unknown
- source_provenance_state: authenticated | plausible | unauthenticated | inconsistent | impossible | manual_review | superseded
- synthetic_or_manipulated_media_state: none_detected | possible | under_review | confirmed_manipulated | confirmed_synthetic | manual_review | superseded
- replay_or_reuse_state: none_detected | possible_duplicate | already_used_elsewhere | under_review | blocking | manual_review
- chain_of_custody_state: not_required | complete | partial | missing | disputed | manual_review
- account_or_identity_compromise_state: none_detected | possible | under_review | blocking | manual_review
- authenticity_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- data_security_review_state
- reviewer_decision_ref
- created_at
- updated_at


financial_crime_fraud_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | donation_receipt_record | payment_event | payout_milestone | refund_cancellation_policy | side_agreement_disclosure | evidence_record | dispute_case
- subject_id
- participant_id_hash
- financial_crime_fraud_policy_ref
- source_of_funds_context: none_disclosed | participant_self_funded | sponsor_or_third_party_funded | cash_equivalent | crypto_or_wallet | donor_advised_fund | employer_match | unknown | manual_review
- beneficial_owner_state: not_required | self_declared | verified_for_scope | unclear | disputed | blocking | manual_review
- payment_fraud_signal_state: none | possible_stolen_payment_method | possible_card_testing | possible_chargeback_or_refund_abuse | possible_synthetic_identity | under_review | blocking | manual_review
- laundering_or_sanctions_evasion_state: none | possible | under_review | blocking | manual_review
- terrorist_extremist_or_prohibited_financing_state: none | possible | under_review | blocking | manual_review
- circular_or_fake_volume_state: none | possible | under_review | blocking | manual_review
- receipt_or_tax_fraud_state: none | possible | under_review | blocking | manual_review
- source_of_funds_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- legal_review_state
- sanctions_payment_rail_review_state
- recipient_destination_review_state
- financial_reconciliation_run_ref
- incident_response_record_ref
- reviewer_decision_ref
- created_at
- updated_at


agreement_transferability_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | donation_receipt_record | payment_event | payout_milestone | refund_cancellation_policy | side_agreement_disclosure | evidence_record | dispute_case
- subject_id
- participant_id_hash
- agreement_transferability_policy_ref
- transfer_subject: obligation | payout_right | refund_right | performance_bond_claim | evidence_claim | completion_record | moral_trade_credit | tokenized_claim | collateralized_claim | other
- proposed_transfer_type: none_disclosed | assignment | delegation | resale | tokenization | securitization | syndication | collateralization | third_party_assumption | manual_review
- transferee_context: none | original_participant | counterparty | sponsor | affiliate | external_buyer | unknown | manual_review
- participant_specificity_state: not_required | participant_specific | transferable_if_reconfirmed | disputed | blocking | manual_review
- legal_review_state
- financial_crime_fraud_review_state
- anti_speculation_review_state: not_required | under_review | non_blocking | blocked | manual_review
- renewed_confirmation_required_bool
- transferability_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- reviewer_decision_ref
- created_at
- updated_at


cyber_abuse_digital_systems_integrity_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | pledge_performance_bond_record | negative_commitment_scope | side_agreement_disclosure | evidence_record | dispute_case | contact_interaction_record | payment_event
- subject_id
- participant_id_hash
- cyber_abuse_digital_systems_integrity_policy_ref
- digital_activity_context: none_disclosed | authorized_security_research | vulnerability_disclosure | unauthorized_access | credential_theft_or_phishing | malware_or_exploit | denial_of_service | botting_or_fake_accounts | spam_or_mass_messaging | unauthorized_scraping_or_exfiltration | platform_integrity_manipulation | review_or_rating_manipulation | adversarial_prompt_or_model_attack | other | unknown
- authorization_or_defensive_scope_state: not_required | authorized_for_scope | insufficient | disputed | blocking | manual_review
- cyber_abuse_state: none | possible | under_review | blocking | manual_review | superseded
- digital_systems_integrity_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- legal_review_state
- confidentiality_privacy_rights_review_state
- content_moderation_review_state
- user_safety_review_state
- anti_threat_state
- reviewer_decision_ref
- created_at
- updated_at


anti_corruption_assessment
- id
- subject_type: offset_offer | pledge_swap_offer | matched_trade_lock_proposal | cleared_trade_agreement | compensated_action_terms | side_agreement_disclosure | donation_receipt_record
- subject_id
- anti_corruption_policy_ref
- role_or_authority_context: none_disclosed | public_official | elected_or_voting_participant | employee_or_agent | fiduciary | procurement_decider | licensing_or_permit_decider | admissions_or_grading_decider | healthcare_or_legal_referrer | platform_moderator | professional_gatekeeper | other_entrusted_role | unknown
- participant_disclosure_hash
- side_payment_or_benefit_refs_json
- official_act_or_entrusted_decision_state: not_applicable | possible | under_review | blocking | superseded
- bribery_kickback_pay_to_vote_or_testimony_state: none | possible | blocking | manual_review
- process_integrity_review_state: not_required | under_review | non_blocking | blocked | manual_review
- legal_review_state
- reviewer_decision_ref
- created_at
- updated_at


pledge_performance_bond_policy
- id
- policy_version
- applies_to: pledge_swap | compensated_moral_action | manual_review
- allowed_release_stages_json
- max_bond_cents
- min_bond_cents
- settlement_currency
- posting_mode: authorization_only | captured_provider_hold | external_proof_only | manual_review
- return_condition_policy_ref
- forfeiture_condition_policy_ref
- forfeiture_destination_policy: return_to_poster | neutral_public_good | pre_agreed_non_counterparty_destination | counterparty_only_if_approved | manual_review
- counterparty_benefit_from_forfeiture_allowed_bool
- neutral_review_required_for_forfeiture_bool
- evidence_standard_ref
- challenge_window_policy_ref
- refund_policy_ref
- no_escrow_claim_disclaimer_required_bool
- high_stakes_or_irreversible_action_behavior: block | preview_only | manual_review
- reviewer_decision_ref
- created_at
- updated_at


pledge_performance_bond_record
- id
- pledge_swap_offer_id
- matched_trade_lock_proposal_ref
- cleared_trade_agreement_ref
- participant_id_hash
- pledge_performance_bond_policy_ref
- bond_amount_cents
- settlement_currency
- payment_authorization_event_ref
- posting_mode: authorization_only | captured_provider_hold | external_proof_only | manual_review
- bond_state: draft | previewed | authorized | posted | return_pending | returned | forfeiture_review | forfeited | refunded | cancelled | disputed | superseded
- return_condition_summary_hash
- forfeiture_condition_summary_hash
- forfeiture_destination_ref
- counterparty_benefit_from_forfeiture_state: none | possible | direct | indirect | manual_review
- neutral_review_required_bool
- evidence_due_at
- evidence_record_refs
- challenge_window_policy_ref
- challenge_window_state
- refund_policy_ref
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- reviewer_decision_ref
- created_at
- updated_at


agreement_amendment_record
- id
- cleared_trade_agreement_ref
- matched_trade_lock_proposal_ref
- amendment_type: correction | mutual_modification | pause | early_termination | evidence_standard_change | schedule_change | compensation_change | destination_change | baseline_correction | privacy_change | other
- requested_by_hash
- affected_participant_ids_hash
- prior_terms_snapshot_hash
- proposed_terms_snapshot_hash
- policy_snapshot_bundle_hash
- participant_confirmation_record_refs
- consent_quality_record_refs
- neutral_review_required_bool
- third_party_obligation_assessment_ref
- externality_review_state
- anti_threat_state
- amendment_state: draft | presented | confirmed | approved | applied | rejected | withdrawn | superseded
- non_retroactivity_check_state: passed | blocked | manual_review
- reviewer_decision_ref
- created_at
- updated_at


privileged_action_record
- id
- subject_type: release_gate | policy_snapshot | state_interpretation_policy | recipient_registry_entry | payment_destination | privacy_grant | impact_claim_record | participant_confirmation_record | cleared_trade_agreement | payout_milestone | payment_event | dispute_case
- subject_id
- action_type: approve_release_gate | approve_policy_snapshot | verify_recipient | verify_payment_destination | grant_privacy_access | publish_impact_claim | override_blocker | authorize_capture | release_payout | trigger_emergency_pause | lift_emergency_pause | refund_or_cancel_payment | manual_state_override
- actor_id_hash
- actor_role
- privileged_action_policy_ref
- required_dual_control_bool
- second_approver_id_hash
- neutral_panel_ref
- action_state: requested | approved | applied | blocked | rejected | superseded
- reason_codes_json
- evidence_refs_json
- prior_action_id
- created_at
- updated_at


policy_snapshot
- id
- policy_type: approved_trade_template | template_parameter | participant_term_sheet | marketplace_intake_triage | participant_ui_render_snapshot | ui_accessibility_copy | plain_language_copy | route_simplification | public_receipt_card | counterparty_blinding | staged_counterparty_disclosure | recipient_acceptance | ai_preference_elicitation | post_clear_audit | review_capacity | non_public_goods_subsidy | subsidy_schedule | cause_bucket_taxonomy | direct_pair_clearing | resource_compatibility | net_offset_accounting | evidence_standard | fee | fx | refund_cancellation | financial_reconciliation | incident_response | data_security | audit_integrity | deployment_release | configuration_integrity | schema_migration | environment_data_isolation | user_facing_status | release_gate_requirement | matched_trade_lock | clearing_ratio | verification_burden | pledge_swap_performance | behavioral_micro_pledge | behavioral_micro_pledge_evidence_ladder | commitment_inventory | atomic_settlement | breach_remedy | compensated_moral_action | ordinary_service_procurement | donor_of_record | tax_receipt | baseline_integrity | agreement_amendment | anti_corruption | pledge_performance_bond | negative_commitment | action_reversibility | third_party_obligation | representative_authority | reporting_integrity | civil_rights_discrimination | coercion_undue_influence | confidentiality_privacy_rights | evidence_authenticity | financial_crime_fraud | agreement_transferability | regulated_goods_hazardous_activity | cyber_abuse_digital_systems_integrity | non_public_goods_tier | counterfactual_trust | risk_control_pack | control_applicability_matrix | private_exchange_rate_quote | market_simulation | pilot_exit_criteria | noncompensable_blocker | offer_validity | batch_clearing_objective | privacy_preserving_verification | option_set_comparison | preference_comparability | trade_burden_accounting | moral_difference_attestation | bargaining_protocol | empirical_assumption | moral_side_constraint | intrapersonal_self_offset | notification | provider_source_authentication | time_authority | legal_jurisdiction | public_metric_release | experiment | data_retention | privacy_disclosure | impact_claim_methodology | choice_architecture | anti_enumeration | appeal | reviewer_quality | user_safety | content_moderation | account_security | backup_recovery | privileged_action | pilot_risk_limit | payout_milestone | challenge_window | state_interpretation
- policy_version
- policy_body_hash
- human_summary
- effective_from
- effective_until
- supersedes_policy_snapshot_id
- reviewer_decision_ref
- created_at
- updated_at


platform_fee_policy
- id
- policy_version
- fee_type: platform | payment_processing | sponsor_admin | evaluator | reviewer
- applies_to: participant_contribution | non_public_goods_subsidy_pool | payout | refund | manual_review
- fixed_cents
- percent_bps
- currency
- disclosure_label
- excluded_from_counted_contribution_bool
- excluded_from_moral_trade_volume_bool
- excluded_from_sponsor_leverage_bool
- created_at
- updated_at


refund_cancellation_policy
- id
- policy_version
- applies_to: authorization | capture | payout_milestone | refund | cancellation | failed_payout | emergency_pause
- authorization_expiry_behavior: cancel | refresh_with_renewed_confirmation | manual_review
- blocked_capture_behavior: cancel_authorization | manual_review
- blocked_release_behavior: refund_participant | carry_forward_with_renewed_confirmation | manual_review
- failed_payout_behavior: retry_verified_destination | refund_participant | manual_review
- fee_refund_behavior: refund_all_fees | refund_platform_fee_only | no_fee_refund | manual_review
- max_refund_delay_days
- disclosure_label
- reviewer_decision_ref
- created_at
- updated_at


financial_reconciliation_policy
- id
- policy_version
- applies_to: authorization | capture | refund | payout | fee | non_public_goods_subsidy_pool | agreement_close | pilot_close | public_metric_release
- required_provider_reports_json
- internal_ledger_sources_json
- max_variance_cents
- missing_provider_record_behavior: block | manual_review
- unmatched_internal_event_behavior: block | manual_review
- fee_variance_behavior: block | manual_review
- stale_settlement_report_behavior: block | refresh | manual_review
- public_totals_release_behavior: block_until_reconciled | disclose_unreconciled | manual_review
- reviewer_decision_ref
- created_at
- updated_at


financial_reconciliation_run
- id
- subject_type: cleared_trade_agreement | payout_milestone | payment_event | platform_fee_policy
- subject_id
- provider
- provider_account_ref
- settlement_currency
- financial_reconciliation_policy_ref
- internal_ledger_hash
- provider_balance_snapshot_hash
- provider_settlement_report_hash
- expected_gross_cents
- expected_fee_cents
- expected_net_cents
- provider_reported_gross_cents
- provider_reported_fee_cents
- provider_reported_net_cents
- variance_cents
- unmatched_provider_event_refs_json
- unmatched_internal_event_refs_json
- reconciliation_state: pending | matched | variance_blocked | missing_provider_record | under_review | resolved | superseded
- reviewer_decision_ref
- created_at
- updated_at


incident_response_policy
- id
- policy_version
- incident_type: privacy | payment | payout | provider_source_authentication | reconciliation | security | enumeration | privileged_action | data_retention | other
- severity_levels_json
- containment_required_bool
- emergency_pause_behavior: none | pause_new_risk | pause_affected_pilot | pause_affected_agreement | global_pause
- user_notice_policy_ref
- reviewer_escalation_required_bool
- external_reporting_behavior: not_applicable | legal_review | manual_review
- evidence_preservation_policy_ref
- public_postmortem_policy: none | aggregate_only | redacted_summary | manual_review
- reviewer_decision_ref
- created_at
- updated_at


incident_response_record
- id
- incident_type: privacy | payment | payout | provider_source_authentication | reconciliation | security | enumeration | privileged_action | data_retention | other
- severity: low | medium | high | critical
- subject_refs_json
- detected_by_type: participant | reviewer | system_job | provider | external_report
- detected_by_hash
- incident_response_policy_ref
- containment_state: pending | contained | paused | resolved | superseded
- emergency_pause_ref
- affected_participant_count_bucket
- affected_money_cents
- evidence_refs_json
- user_notice_state: not_required | pending | sent | failed | manual_review
- root_cause_summary_hash
- corrective_action_refs_json
- reviewer_decision_ref
- created_at
- updated_at


data_security_policy
- id
- policy_version
- data_class: public | aggregate | private_user_data | identity_artifact | payment_secret | provider_secret | audit_export | legal_hold
- encryption_required_bool
- encryption_mode: provider_managed | platform_kms | client_side | tokenized | not_applicable
- key_version_ref
- key_rotation_days
- signed_url_ttl_seconds
- log_redaction_required_bool
- prompt_injection_exclusion_bool
- backup_encryption_required_bool
- failed_decryption_behavior: block | manual_review
- stale_key_behavior: block | rotate_before_use | manual_review
- reviewer_decision_ref
- created_at
- updated_at


audit_integrity_policy
- id
- policy_version
- covered_record_types_json
- hash_algorithm
- checkpoint_interval_minutes
- immutable_storage_ref
- external_timestamping_required_bool
- missing_checkpoint_behavior: block | manual_review
- broken_chain_behavior: block | incident_response | manual_review
- retention_policy_ref
- reviewer_decision_ref
- created_at
- updated_at


audit_integrity_checkpoint
- id
- audit_integrity_policy_ref
- covered_record_type
- covered_record_ids_hash
- prior_checkpoint_hash
- checkpoint_hash
- checkpointed_at
- immutable_storage_ref
- external_timestamp_ref
- verification_state: pending | verified | broken | stale | superseded | manual_review
- incident_response_record_ref
- reviewer_decision_ref
- created_at
- updated_at


fx_policy
- id
- policy_version
- settlement_currency
- allowed_source_currencies
- allowed_destination_currencies
- rate_source
- max_spread_bps
- fee_policy_ref
- stale_rate_behavior: block | refresh_quote | manual_review
- created_at
- updated_at


fx_rate_snapshot
- id
- fx_policy_ref
- source_currency
- settlement_currency
- destination_currency
- rate
- spread_bps
- conversion_fee_cents
- quote_provider
- quote_timestamp
- quote_expires_at
- raw_quote_hash
- created_at


notification_policy
- id
- policy_version
- notice_type
- required_channels
- acknowledgement_required_bool
- retry_schedule_json
- failed_delivery_behavior: pause_deadline | manual_review | alternate_channel | no_default_against_recipient
- deadline_grace_period_hours
- created_at
- updated_at


provider_source_authentication_policy
- id
- policy_version
- provider_type: payment_processor | evidence_provider | identity_provider | sanctions_screening | recipient_registry | payment_destination_verifier | other
- provider_account_ref
- allowed_event_types_json
- signature_scheme
- signing_key_version_ref
- replay_window_seconds
- allowed_endpoint_ids_json
- stale_event_behavior: block | manual_review
- failed_authentication_behavior: block | manual_review
- reviewer_decision_ref
- created_at
- updated_at


time_authority_policy
- id
- policy_version
- authoritative_clock_source
- timezone_for_display
- deadline_storage_format: utc_instant
- client_clock_behavior: display_only | reject_for_state_transition
- max_clock_skew_seconds
- background_job_deadline_behavior: recompute_from_server_time | manual_review
- stale_quote_behavior: block | refresh_with_renewed_confirmation | manual_review
- reviewer_decision_ref
- created_at
- updated_at


choice_architecture_policy
- id
- policy_version
- applies_to_surface: offer_creation | trade_lock | trade_preview | cleared_agreement | renewed_confirmation | privacy_disclosure | payout_release | policy_change
- required_disclosures_json
- comprehension_check_required_bool
- no_preselected_paid_commitments_bool
- no_countdown_pressure_except_true_deadline_bool
- default_amount_policy: blank | user_prior_amount | minimum_safe_default | manual_review
- cooling_off_required_bool
- cooling_off_hours
- failed_check_behavior: block | manual_review | allow_preview_only
- reviewer_decision_ref
- created_at
- updated_at


anti_enumeration_policy
- id
- policy_version
- applies_to_surface: public_search | signed_in_search | broad_preview | invite_link | match_candidate_generation | transparency_report
- query_budget_window_seconds
- max_queries_per_actor
- max_queries_per_subject
- min_result_bucket_size
- zero_count_behavior: suppress | bucket | generic_message | manual_review
- timing_equalization_required_bool
- pagination_bucket_policy
- sensitive_facet_suppression_policy_ref
- violation_behavior: block | throttle | manual_review
- reviewer_decision_ref
- created_at
- updated_at


reviewer_quality_policy
- id
- policy_version
- applies_to_review_type: clearing | release_gate | recipient_verification | evidence_acceptance | privacy_grant | impact_claim | payout_release | appeal | incident_closure | policy_snapshot
- required_training_refs_json
- authorization_scope_json
- calibration_required_bool
- second_review_required_bool
- audit_sample_rate_bps
- stale_authorization_days
- max_recent_overturn_rate_bps
- default_approval_forbidden_bool
- reviewer_decision_ref
- created_at
- updated_at


review_quality_audit
- id
- subject_review_decision_ref
- reviewer_quality_policy_ref
- audited_by_hash
- audit_type: random_sample | appeal_triggered | incident_triggered | conflict_triggered | calibration_check
- audit_state: pending | passed | failed | needs_second_review | superseded
- disagreement_reason_codes_json
- corrective_action_refs_json
- superseding_review_decision_ref
- created_at
- updated_at


user_safety_policy
- id
- policy_version
- applies_to_surface: profile | invite_link | broad_preview | introduction_request | messaging | support | public_offer
- contact_consent_required_bool
- block_after_decline_bool
- max_contact_attempts_per_window
- contact_attempt_window_seconds
- harassment_or_doxxing_behavior: block | manual_review | incident_response
- retaliation_visibility_behavior: block | manual_review
- safety_report_deadline_hours
- reviewer_decision_ref
- created_at
- updated_at


contact_interaction_record
- id
- actor_id_hash
- target_id_hash
- subject_type: offer | profile | invite_link | pledge_swap_offer | offset_offer | cleared_trade_agreement | support_case
- subject_id
- contact_type: invite_link | introduction_request | message | support_message | decline | block | report
- user_safety_policy_ref
- contact_consent_state: not_required | requested | granted | declined | blocked | revoked
- visibility_change_state: not_applicable | blocked | under_review | approved
- abuse_report_ref
- created_at
- updated_at


abuse_report_record
- id
- reporter_id_hash
- reported_actor_id_hash
- subject_type: contact_interaction_record | profile | offer | invite_link | message | pledge_swap_offer | offset_offer | cleared_trade_agreement
- subject_id
- report_type: harassment | doxxing | coercive_solicitation | threat | spam | impersonation | retaliation | other
- user_safety_policy_ref
- severity: low | medium | high | critical
- status: open | under_review | resolved | rejected | escalated | withdrawn
- evidence_refs_json
- incident_response_record_ref
- reviewer_decision_ref
- created_at
- updated_at


content_moderation_policy
- id
- policy_version
- applies_to_surface: public_offer | public_receipt_card | worked_example_template | profile | invite_link | message | evidence_preview | impact_claim | reviewer_note | support_case
- prohibited_categories_json
- required_classifier_version
- human_review_required_categories_json
- viewpoint_neutrality_required_bool
- appeal_policy_ref
- public_copy_behavior: allow | redact | block | manual_review
- private_evidence_behavior: reviewer_only | redact_before_review | block | manual_review
- reviewer_decision_ref
- created_at
- updated_at


content_moderation_record
- id
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | public_receipt_card_record | evidence_record | impact_claim_record | profile | invite_link | message | support_case
- subject_id
- content_moderation_policy_ref
- submitted_by_hash
- scan_state: pending | passed | blocked | needs_human_review | superseded
- classifier_version
- matched_categories_json
- redaction_refs_json
- appeal_case_ref
- reviewer_decision_ref
- created_at
- updated_at


account_security_policy
- id
- policy_version
- applies_to_action: login | payment_method_change | participant_confirmation | privacy_grant | identity_artifact_change | payout_release | contact_introduction | account_recovery | email_change | mfa_change
- step_up_required_bool
- trusted_device_required_bool
- cooldown_hours
- risk_signals_json
- high_risk_behavior: block | step_up | cooldown | manual_review
- notice_required_bool
- account_recovery_behavior: block_real_money | manual_review | limited_access
- reviewer_decision_ref
- created_at
- updated_at


account_security_event
- id
- participant_id_hash
- event_type: login | new_device | session_anomaly | payment_method_change | email_change | mfa_change | account_recovery | identity_artifact_change | step_up_passed | step_up_failed
- account_security_policy_ref
- risk_state: low | medium | high | blocked | manual_review
- action_subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | privacy_grant | payment_event | contact_interaction_record | participant_confirmation_record
- action_subject_id
- notice_ref
- cooldown_until
- reviewer_decision_ref
- created_at
- updated_at


backup_recovery_policy
- id
- policy_version
- covered_record_types_json
- backup_frequency_minutes
- recovery_point_objective_minutes
- recovery_time_objective_minutes
- encrypted_backup_required_bool
- key_escrow_policy_ref
- restore_test_interval_days
- legal_hold_preservation_required_bool
- deletion_tombstone_preservation_required_bool
- failed_backup_behavior: block | manual_review | incident_response
- failed_restore_test_behavior: block | incident_response | manual_review
- reviewer_decision_ref
- created_at
- updated_at


backup_recovery_checkpoint
- id
- backup_recovery_policy_ref
- covered_record_type
- backup_artifact_hash
- backup_created_at
- restore_test_state: not_required | pending | passed | failed | stale | manual_review
- restored_record_ids_hash
- audit_integrity_checkpoint_ref
- encryption_key_version_ref
- incident_response_record_ref
- reviewer_decision_ref
- created_at
- updated_at


schema_migration_policy
- id
- policy_version
- applies_to: schema_change | data_backfill | repair_script | index_change | rls_policy_change | trigger_change | archival_job
- dry_run_required_bool
- production_snapshot_required_bool
- rollback_or_forward_fix_required_bool
- affected_record_types_json
- forbidden_silent_rewrite_fields_json
- record_count_check_required_bool
- audit_integrity_check_required_bool
- failed_dry_run_behavior: block | manual_review
- failed_record_count_behavior: block | manual_review
- reviewer_decision_ref
- created_at
- updated_at


schema_migration_run
- id
- migration_name
- migration_type: schema_change | data_backfill | repair_script | index_change | rls_policy_change | trigger_change | archival_job
- schema_migration_policy_ref
- source_schema_hash
- target_schema_hash
- source_table_hashes_json
- affected_record_types_json
- dry_run_state: not_required | pending | passed | failed | manual_review
- production_snapshot_ref
- records_expected_count
- records_touched_count
- records_failed_count
- rollback_plan_hash
- forward_fix_plan_hash
- audit_integrity_checkpoint_ref
- migration_state: planned | dry_run_passed | applied | rolled_back | forward_fixed | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


environment_data_isolation_policy
- id
- policy_version
- applies_to: demo_data | sandbox_calculation | test_payment | seed_template | staging_copy | production_restore | public_metric_release | provider_event_replay
- allowed_source_environments_json
- allowed_target_environments_json
- synthetic_data_required_bool
- live_data_copy_behavior: forbid | redact_then_copy | manual_review
- test_provider_event_behavior: ignore | store_as_test_only | manual_review
- demo_to_live_promotion_behavior: reviewed_template_only | reviewed_clearing_run_only | forbid
- live_metric_exclusion_required_bool
- reviewer_decision_ref
- created_at
- updated_at


environment_data_isolation_record
- id
- subject_type: release_gate | deployment_release_record | configuration_snapshot | matching_clearing_run | payment_event | evidence_record | offset_offer | pledge_swap_offer | seed_template | worked_example
- subject_id
- source_environment: demo | sandbox | test | preview | staging | production
- target_environment: demo | sandbox | test | preview | staging | production
- environment_data_isolation_policy_ref
- source_record_hash
- target_record_hash
- synthetic_or_redacted_state: not_required | synthetic | redacted | contains_live_data | manual_review
- live_metric_exclusion_state: excluded | included_after_review | blocked | manual_review
- promotion_state: not_applicable | requested | approved | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


user_facing_status_policy
- id
- policy_version
- applies_to_surface: offer_board | template_setup | trade_preview | offer_preview | payment_preview | evidence_submission | dispute_or_appeal | payout_status | profile_or_contact | reviewer_feedback
- allowed_status_codes_json
- allowed_reason_categories_json
- required_next_action_bool
- money_or_obligation_effect_required_bool
- appeal_route_required_bool
- privacy_redaction_policy_ref
- forbidden_disclosures_json
- internal_jargon_redaction_required_bool
- stale_status_behavior: block | refresh | manual_review
- reviewer_decision_ref
- created_at
- updated_at


user_facing_status_record
- id
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | payout_milestone | evidence_record | dispute_case | appeal_case | payment_event | privacy_grant | contact_interaction_record | abuse_report_record
- subject_id
- participant_id_hash
- user_facing_status_policy_ref
- status_code: ready_to_preview | needs_user_confirmation | waiting_for_review | blocked | paused | payment_not_authorized | payout_not_releasable | disputed | closed | refunded_or_cancelled
- reason_category: user_action_needed | review_pending | matching_condition_not_met | safety_or_anti_threat | legal_or_jurisdiction | privacy_or_disclosure | payment_or_reconciliation | recipient_or_destination | evidence_or_challenge | account_security | system_or_release_gate | not_applicable
- next_action_json
- money_or_obligation_effect_summary
- appeal_or_correction_route_ref
- redaction_state: public_safe | participant_only | reviewer_only | blocked_for_privacy | manual_review
- internal_state_refs_hash
- display_text_hash
- created_at
- updated_at


state_interpretation_policy
- id
- policy_version
- state_family: review | verification | challenge | release | blocker | eligibility | payment | evidence | release_gate
- approval_compatible_states_json
- non_blocking_states_json
- blocking_states_json
- terminal_states_json
- missing_state_behavior: block | manual_review | not_required_for_stage
- unknown_state_behavior: block | manual_review
- stale_state_behavior: block | manual_review
- superseded_state_behavior: block | use_superseding_record
- applies_to_release_stages_json
- reviewer_decision_ref
- created_at
- updated_at


data_retention_policy
- id
- policy_version
- data_category: raw_wish | private_evidence | identity_artifact | source_note | moral_preference_profile | aggregate_metric | audit_log
- default_retention_days
- deletion_behavior: delete | redact | aggregate_only | retain_for_legal_hold
- export_enabled_bool
- legal_hold_behavior
- created_at
- updated_at


data_consent_record
- id
- participant_id_hash
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | evidence_record | profile | source_note
- subject_id
- purpose: model_training | evaluator_dataset | public_demo | non_aggregate_product_analytics | support_review | legal_compliance
- consent_state: granted | denied | revoked | expired
- scope_json
- policy_version
- granted_at
- revoked_at
- expires_at
- created_at
- updated_at


participant_eligibility_record
- id
- participant_id_hash
- identity_verification_state: unverified | under_review | verified | rejected | superseded
- human_uniqueness_state: unverified | under_review | unique_enough | duplicate_or_linked | superseded
- sybil_review_state
- legal_capacity_state: unknown | eligible | ineligible | manual_review
- sanctions_screening_state: unknown | clear | potential_match | blocked | manual_review
- payment_rail_eligibility_state: unknown | eligible | ineligible | manual_review
- jurisdiction_bucket
- eligibility_weight_bps
- raw_identity_artifact_refs_private
- data_retention_policy_ref
- privacy_grant_refs
- reviewer_decision_ref
- created_at
- updated_at


privacy_grant
- id
- participant_id_hash
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | evidence_record | profile | source_note | moral_preference_profile
- subject_id
- grantee_type: reviewer | counterparty | public_redacted | system_job | support_staff
- grantee_id_hash
- purpose: review | staged_disclosure | dispute_resolution | payout_release | support | legal_compliance | aggregate_measurement
- scope_json
- allowed_fields_json
- redaction_policy_ref
- policy_snapshot_ref
- consent_record_ref
- grant_state: requested | granted | denied | revoked | expired | superseded
- granted_at
- expires_at
- revoked_at
- created_at
- updated_at


privacy_access_log
- id
- privacy_grant_ref
- actor_type: reviewer | counterparty | system_job | support_staff | public_view
- actor_id_hash
- subject_type
- subject_id
- accessed_fields_json
- access_purpose
- access_result: allowed | blocked | redacted | manual_review
- created_at


discovery_access_event
- id
- actor_id_hash
- surface_type: public_search | signed_in_search | broad_preview | invite_link | match_candidate_generation | transparency_report
- query_fingerprint_hash
- filters_bucketed_hash
- result_count_bucket
- suppressed_facets_json
- timing_equalization_applied_bool
- anti_enumeration_policy_ref
- access_result: allowed | throttled | blocked | redacted | manual_review
- created_at


impact_claim_record
- id
- subject_type: cleared_trade_agreement | payout_milestone | public_receipt_card_record
- subject_id
- claim_type: transfer_amount | recipient_payout | personal_verified_contribution | net_personal_verified_contribution | trade_conditioned_contribution | trade_unlocked_contribution | total_verified_recipient_transfer | sponsor_leverage | moral_trade_volume | recipient_output | outcome_estimate | cost_effectiveness_estimate | other_impact_claim
- claim_text_hash
- amount_cents
- currency
- methodology_policy_ref
- evidence_refs_json
- uncertainty_disclosure
- review_state
- public_display_allowed_bool
- reviewer_decision_ref
- created_at
- updated_at


public_receipt_card_policy
- id
- policy_version
- applies_to_trade_type: donation_offset | pledge_swap | compensated_moral_action | mixed
- allowed_release_stages_json
- allowed_card_templates_json
- required_verified_claim_types_json
- personal_contribution_display_required_bool
- trade_conditioned_contribution_display_required_bool
- trade_unlocked_contribution_display_required_bool
- trade_unlocked_label_requires_additionality_bool
- causal_wording_default: trade_conditioned | trade_unlocked_if_reviewed | manual_review
- direct_donation_parity_new_money_required_bool
- reused_personal_contribution_display_behavior: prohibit | disclose_as_already_counted | manual_review
- total_verified_transfer_display_required_bool
- direct_donation_parity_default_bool
- direct_donation_parity_ranking_effect_prohibited_bool
- direct_donation_parity_shame_or_moral_upgrade_copy_prohibited_bool
- net_personal_contribution_display_required_bool
- reimbursement_or_subsidy_disclosure_required_bool
- uncertain_net_personal_contribution_behavior: qualify | suppress_personal_line | manual_review | block
- sensitive_action_default_redaction_level: generic_action | transfer_only | exact_action_if_separately_confirmed | manual_review
- publication_pressure_reporting_required_bool
- good_person_or_moral_score_language_prohibited_bool
- public_moral_ranking_prohibited_bool
- social_reaction_metric_display_prohibited_bool
- receipt_count_leaderboard_prohibited_bool
- profile_sorting_or_boosting_use_prohibited_bool
- matching_or_review_priority_use_prohibited_bool
- engagement_feed_optimization_prohibited_bool
- public_receipt_publication_as_trade_term_prohibited_bool
- verification_url_required_bool
- static_share_image_status_disclaimer_required_bool
- correction_revocation_status_required_bool
- public_indexing_default: unlisted | profile_only | public_indexed_if_opt_in | manual_review
- counterparty_identity_default: hidden | coarse_bucket | named_if_both_consent | manual_review
- recipient_name_display_rule: aggregate_only | named_if_recipient_accepts | named_if_public_charity_and_noncontroversial | manual_review
- raw_evidence_publication_behavior: prohibit | participant_grant_required | manual_review
- participant_note_allowed_bool
- content_moderation_required_bool
- public_metric_release_policy_ref
- additionality_wording_policy: prohibit_unless_reviewed | allow_verified_only | manual_review
- engagement_metric_display_prohibited_bool
- comparative_or_leaderboard_context_prohibited_bool
- default_publication_scope: unlisted | profile_only | public_unindexed | public_indexed_after_review | manual_review
- search_indexing_default: noindex | index_after_review | manual_review
- claim_correction_or_unpublish_required_bool
- revocation_or_unpublish_behavior: allow_unpublish | retain_redacted_receipt | manual_review
- reviewer_decision_ref
- created_at
- updated_at


public_receipt_card_record
- id
- cleared_trade_agreement_ref
- participant_id_hash
- public_receipt_card_policy_ref
- public_profile_subject_ref
- card_title: verified_moral_trade_completed | verified_donation_offset_completed | verified_pledge_swap_completed | manual_review
- participant_display_name_or_handle_hash
- verified_recipient_display_name_hash
- recipient_registry_ref
- payment_destination_ref
- trade_type_label: cross_view_donation_offset | pledge_swap | compensated_moral_action | mixed | manual_review
- personal_contribution_type: direct_donation | waived_compensation | completed_verified_action | covered_fees | none | mixed | manual_review
- personal_contribution_cents
- gross_personal_transfer_cents
- known_reimbursement_or_subsidy_cents
- known_refund_or_reversal_cents
- known_side_benefit_or_compensation_cents
- net_personal_verified_contribution_cents
- net_personal_contribution_attribution_state: verified_net_personal | disclosed_partial_reimbursement | disclosed_subsidy_or_match | uncertain_qualified | disputed_blocked | suppressed | manual_review
- personal_contribution_new_or_reused_state: new_for_this_agreement | independently_made_newly_linked | already_counted_elsewhere | unclear | manual_review | blocked
- personal_contribution_reuse_check_state: not_required | passed | disclosed_as_reused | blocked | manual_review | superseded
- trade_conditioned_contribution_cents
- trade_unlocked_contribution_cents
- trade_unlocked_label_allowed_bool
- public_causal_wording_label: trade_conditioned | trade_unlocked | verified_transfer_only | manual_review
- additionality_confidence_state: low | medium | high | unknown | manual_review
- counterfactual_trust_assessment_ref
- public_receipt_causal_wording_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- total_verified_recipient_transfer_cents
- settlement_currency
- direct_donation_parity_mode_bool
- direct_donation_parity_user_selected_bool
- direct_donation_parity_ranking_effect_block_state
- additionality_wording_state: not_claimed | reviewed_additional | verified_only_no_additionality_claim | blocked | manual_review
- publication_scope: unlisted | profile_only | public_unindexed | public_indexed | manual_review
- search_indexing_state: noindex | index_allowed | blocked | manual_review
- engagement_metric_display_state: prohibited | hidden | violation_blocked | manual_review
- comparative_or_leaderboard_language_state: prohibited | hidden | violation_blocked | manual_review
- claim_correction_notice_ref
- impact_claim_record_refs
- payment_event_refs
- donation_receipt_record_refs
- evidence_attestation_refs
- verification_summary_hash
- counterfactual_uncertainty_disclosure_hash
- no_moral_score_disclaimer_shown_bool
- no_global_ranking_disclaimer_shown_bool
- social_reaction_metrics_disabled_bool
- receipt_count_leaderboard_excluded_bool
- profile_sorting_or_boosting_use_prohibited_bool
- matching_or_review_priority_use_prohibited_bool
- static_share_image_status_disclaimer_shown_bool
- sensitive_action_redaction_state: not_required | generic_action | transfer_only | exact_action_publication_confirmed | blocked | manual_review
- exact_action_publication_confirmation_ref
- publication_pressure_report_refs
- publicity_as_trade_term_block_state: not_required | possible | blocked | manual_review
- raw_evidence_public_bool
- counterparty_identity_disclosure_state: hidden | coarse_bucket | named_with_consent | blocked | manual_review
- recipient_acceptance_record_ref
- adverse_association_review_state
- privacy_grant_refs
- public_metric_release_state
- small_cell_suppression_state
- public_indexing_state: unlisted | profile_visible | public_indexed | blocked | manual_review
- public_receipt_publication_as_trade_term_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- content_moderation_record_refs
- participant_note_hash
- card_text_hash
- share_image_render_hash
- static_share_image_hash
- verification_url_hash
- public_url_slug_hash
- issued_at
- last_verified_at
- current_status_disclosure_hash
- correction_or_revocation_record_refs
- participant_ui_render_snapshot_refs
- participant_confirmation_record_ref
- publication_state: draft | previewed | participant_approved | published | unlisted | corrected | revoked | suppressed | blocked | superseded
- reviewer_decision_ref
- created_at
- updated_at


notification_record
- id
- recipient_id_hash
- subject_type: release_gate_requirement_result | participant_term_sheet_record | counterparty_blinding_policy | staged_counterparty_disclosure_record | recipient_acceptance_record | ai_preference_elicitation_record | post_clear_audit_record | matched_trade_lock_proposal | baseline_integrity_assessment | agreement_amendment_record | pledge_performance_bond_record | commitment_inventory_record | commitment_reservation_record | atomic_settlement_group | pledge_swap_performance_schedule | behavioral_micro_pledge_policy | micro_pledge_sequence_record | micro_pledge_window_record | compensated_action_terms | donor_of_record_policy | donation_receipt_record | negative_commitment_scope | action_reversibility_assessment | third_party_obligation_assessment | representative_authority_assessment | reporting_integrity_assessment | civil_rights_discrimination_assessment | coercion_undue_influence_assessment | confidentiality_privacy_rights_assessment | evidence_authenticity_assessment | financial_crime_fraud_assessment | agreement_transferability_assessment | regulated_goods_hazardous_activity_assessment | cyber_abuse_digital_systems_integrity_assessment | counterfactual_trust_assessment | risk_control_pack | control_applicability_matrix | control_requirement_result | private_exchange_rate_quote_record | market_simulation_run | pilot_exit_criteria_policy | pilot_scale_decision_record | option_set_comparison_record | trade_burden_accounting_record | moral_difference_attestation_record | bargaining_protocol | bargaining_round_record | empirical_assumption_snapshot | moral_side_constraint_profile | intrapersonal_self_offset_record | anti_corruption_assessment | cleared_trade_agreement | evidence_record | payout_milestone | dispute_case | appeal_case | financial_reconciliation_run | incident_response_record | audit_integrity_checkpoint | payment_event | review_decision | release_gate | policy_snapshot | state_interpretation_policy | provider_source_authentication_policy | time_authority_policy | data_security_policy | audit_integrity_policy | choice_architecture_policy | anti_enumeration_policy | reviewer_quality_policy | review_quality_audit | user_safety_policy | contact_interaction_record | abuse_report_record | content_moderation_policy | content_moderation_record | account_security_policy | account_security_event | backup_recovery_policy | backup_recovery_checkpoint | deployment_release_record | configuration_snapshot | configuration_change_record | schema_migration_run | environment_data_isolation_record | user_facing_status_record | consent_quality_record | privacy_grant | impact_claim_record | public_receipt_card_record
- subject_id
- notice_type: preview_ready | trade_lock | renewed_confirmation_required | consent_check_required | evidence_submitted | challenge_opened | challenge_closing | dispute_opened | appeal_opened | appeal_closing | user_safety_report_opened | user_safety_report_resolved | payout_releasable | public_receipt_ready | public_receipt_published | reconciliation_blocked | incident_notice | emergency_pause | policy_change | payment_action
- delivery_channel: in_app | email | sms | webhook | none
- delivery_state: queued | sent | delivered | failed | acknowledged | bounced | suppressed
- related_challenge_window_ref
- related_policy_version
- sent_at
- delivered_at
- acknowledged_at
- failure_reason
- server_deadline_at
- time_authority_policy_ref
- created_at
- updated_at


recipient_registry_entry
- id
- display_name
- legal_name_hash
- entity_type: registered_charity | nonprofit | fiscal_host | individual | project | other
- jurisdiction_bucket
- registry_source
- registry_identifier_hash
- website_domain_hash
- verification_state: unverified | under_review | verified | rejected | superseded
- recipient_anti_impersonation_state
- prohibited_use_policy_ref
- affiliate_disclosure_state
- reviewer_decision_ref
- created_at
- updated_at


payment_destination
- id
- recipient_registry_ref
- destination_type: bank_account | payment_processor_account | charity_platform | fiscal_host_subaccount | crypto_wallet | other
- destination_reference_hash
- destination_currency
- destination_jurisdiction_bucket
- owner_match_state: matches_recipient | fiscal_host_for_recipient | mismatch | under_review
- verification_state: unverified | under_review | verified | rejected | superseded
- recipient_anti_impersonation_state
- prohibited_use_policy_ref
- reviewer_decision_ref
- created_at
- updated_at


side_agreement_disclosure
- id
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | dispute_case
- subject_id
- disclosed_by_hash
- disclosure_type: compensation | reciprocal_favor | off_platform_commitment | threat_or_pressure | recipient_selection | evidence_or_challenge_commitment | other
- private_summary_hash
- evidence_refs_json
- collusion_review_state
- externality_review_state
- legal_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- anti_threat_state
- reviewer_decision_ref
- created_at
- updated_at


participant_confirmation_record
- id
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | payout_milestone | matched_trade_lock_proposal | policy_change
- subject_id
- participant_id_hash
- confirmation_type: offer_creation | trade_lock | trade_preview | cleared_agreement | renewed_confirmation | exposure_change | payout_release_acknowledgement | policy_change_acknowledgement
- no_trade_baseline_snapshot_hash
- terms_snapshot_hash
- policy_snapshot_bundle_hash
- maximum_exposure_cents
- settlement_currency
- confirmation_text_hash
- participant_surplus_confirmation_bool
- consent_quality_record_ref
- choice_architecture_policy_ref
- required_notice_ref
- notice_delivery_state
- confirmation_state: requested | confirmed | declined | expired | revoked | superseded
- confirmed_at
- expires_at
- time_authority_policy_ref
- revoked_at
- superseded_by_id
- created_at
- updated_at


consent_quality_record
- id
- participant_confirmation_record_ref
- participant_id_hash
- subject_type: offset_offer | pledge_swap_offer | cleared_trade_agreement | payout_milestone | privacy_grant | policy_change
- subject_id
- choice_architecture_policy_ref
- required_disclosures_shown_hash
- comprehension_check_state: not_required | passed | failed | skipped | manual_review
- comprehension_check_refs_json
- no_dark_pattern_review_state
- preselected_paid_commitment_bool
- cooling_off_until
- language_locale
- accessibility_accommodation_ref
- reviewer_decision_ref
- created_at
- updated_at


cleared_trade_agreement
- id
- trade_type: donation_offset | pledge_swap
- status: draft | previewed | participant_confirmed | locked | reviewing | payable | released | cancelled | disputed | closed
- source_offer_ids
- participant_ids_hash
- approved_trade_template_ref
- template_instance_record_refs
- template_conformance_state
- review_queue_record_refs
- non_public_goods_subsidy_pool_refs
- subsidy_schedule_record_refs
- no_trade_baseline_summary_json
- baseline_good_faith_attestations_json
- baseline_confidence_summary_json
- baseline_snapshot_hash
- baseline_integrity_assessment_ref
- terms_snapshot_hash
- participant_surplus_confirmations_json
- participant_confirmation_hashes_json
- participant_confirmation_record_refs
- participant_term_sheet_record_refs
- staged_counterparty_disclosure_record_refs
- recipient_acceptance_record_refs
- ai_preference_elicitation_record_refs
- post_clear_audit_record_refs
- participant_eligibility_record_refs
- matching_clearing_run_ref
- matched_trade_lock_proposal_ref
- direct_pair_clearing_record_ref
- cause_bucket_assignment_refs
- resource_compatibility_assessment_ref
- net_offset_accounting_record_refs
- final_match_confirmation_record_refs
- agreement_amendment_record_refs
- pledge_performance_bond_record_refs
- commitment_reservation_refs
- atomic_settlement_group_ref
- performance_schedule_ref
- behavioral_micro_pledge_policy_ref
- pledge_unit_granularity
- pledge_duration_units
- unit_baseline_snapshot_refs
- unit_additionality_review_state
- micro_pledge_sequence_record_ref
- cumulative_micro_pledge_cap_policy_ref
- cumulative_sequence_exposure_cents
- longer_duration_manual_review_state
- food_abstention_health_safety_review_state
- micro_pledge_window_record_refs
- pre_performance_lock_confirmation_refs
- retroactive_claim_state
- breach_remedy_policy_ref
- appeal_case_refs
- review_quality_audit_refs
- contact_interaction_record_refs
- abuse_report_record_refs
- content_moderation_record_refs
- account_security_event_refs
- backup_recovery_checkpoint_refs
- privacy_grant_refs
- impact_claim_record_refs
- public_receipt_card_record_refs
- policy_version_snapshot_hash
- state_interpretation_policy_ref
- privileged_action_policy_ref
- refund_policy_ref
- financial_reconciliation_policy_ref
- financial_reconciliation_run_refs
- incident_response_record_refs
- platform_fee_policy_ref
- platform_fee_cents
- settlement_currency
- fx_rate_snapshot_ref
- side_agreement_disclosure_state
- option_set_comparison_record_ref
- pareto_dominance_review_state
- preference_comparability_policy_ref
- participant_option_comparability_state
- incomparability_review_state
- trade_burden_accounting_record_ref
- burden_net_surplus_confirmation_state
- moral_difference_attestation_record_ref
- moral_difference_attestation_review_state
- bargaining_protocol_ref
- bargaining_round_record_refs
- empirical_assumption_snapshot_refs
- moral_side_constraint_profile_refs
- side_constraint_review_state
- intrapersonal_self_offset_record_ref
- self_offset_classification_state
- reporting_integrity_assessment_ref
- protected_reporting_review_state
- civil_rights_discrimination_assessment_ref
- civil_rights_review_state
- coercion_undue_influence_assessment_ref
- participant_autonomy_review_state
- confidentiality_privacy_rights_assessment_ref
- confidentiality_review_state
- evidence_authenticity_assessment_ref
- synthetic_media_review_state
- financial_crime_fraud_assessment_ref
- source_of_funds_review_state
- fraud_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- non_public_goods_market_tier
- non_public_goods_tier_policy_ref
- counterfactual_trust_assessment_ref
- counterfactual_trust_class
- preexisting_relationship_or_closed_counterparty_state
- open_market_matching_allowed_bool
- control_applicability_matrix_ref
- risk_control_pack_refs
- control_requirement_result_refs
- private_exchange_rate_quote_record_refs
- market_simulation_run_ref
- pilot_exit_criteria_policy_ref
- pilot_scale_decision_record_ref
- experiment_assignment_state
- challenge_window_policy_ref
- dispute_case_refs
- payout_milestone_policy_ref
- payout_milestone_refs
- reciprocal_release_rule
- reviewer_conflict_of_interest_state
- neutral_review_panel_ref
- jurisdiction_policy_version
- legal_review_state
- baseline_review_state
- additionality_review_state
- trade_classification
- counterparty_distinctness_state
- affiliate_disclosure_state
- collusion_review_state
- evidence_plan_ref
- review_state
- anti_threat_state
- externality_review_state
- nonparticipant_externality_review_state
- challenge_state
- created_at
- updated_at


offset_offer
- id
- approved_trade_template_ref
- template_instance_record_ref
- template_parameter_policy_ref
- template_conformance_state
- review_queue_record_refs
- non_public_goods_subsidy_pool_ref
- subsidy_schedule_record_refs
- offered_cause_bucket
- opposed_or_counterparty_bucket
- acceptable_counterparty_buckets
- counterparty_distinctness_min
- cause_bucket_taxonomy_ref
- cause_bucket_assignment_refs
- affiliate_disclosure_state
- collusion_review_state
- side_agreement_disclosure_state
- clearing_ratio_policy_ref
- empirical_assumption_snapshot_ref
- option_set_comparison_record_refs
- pareto_dominance_review_state
- bargaining_protocol_ref
- bargaining_round_record_refs
- batch_clearing_objective_policy_ref
- batch_clearing_objective_result_ref
- offer_validity_record_ref
- offer_expires_at
- stale_offer_state
- noncompensable_blocker_assessment_ref
- noncompensable_blocker_review_state
- privacy_preserving_verification_attestation_refs
- moral_side_constraint_profile_ref
- side_constraint_review_state
- intrapersonal_self_offset_record_ref
- self_offset_classification_state
- acceptable_clearing_ratio_min_bps
- acceptable_clearing_ratio_max_bps
- final_match_lock_required_bool
- matched_trade_lock_proposal_refs
- commitment_inventory_record_refs
- direct_pair_clearing_allowed_bool
- direct_pair_clearing_record_refs
- resource_compatibility_assessment_ref
- net_offset_accounting_record_refs
- commitment_reuse_policy: exclusive | pooled_if_preconfirmed | manual_review
- atomic_settlement_required_bool
- donor_of_record_policy_ref
- donation_receipt_record_refs
- charitable_solicitation_review_state
- commercial_coventure_review_state
- tax_or_reporting_review_state
- user_safety_policy_ref
- contact_interaction_record_refs
- abuse_report_record_refs
- content_moderation_record_refs
- account_security_event_refs
- preview_confirmation_record_ref
- participant_term_sheet_record_refs
- counterparty_blinding_policy_ref
- staged_counterparty_disclosure_record_refs
- recipient_acceptance_record_refs
- ai_preference_elicitation_record_refs
- post_clear_audit_record_refs
- consent_quality_record_ref
- matching_clearing_run_ref
- compromise_destination
- compromise_destination_verification_state
- recipient_registry_ref
- verified_payment_destination_ref
- recipient_anti_impersonation_state
- prohibited_use_policy_ref
- amount_cents
- settlement_currency
- fx_rate_snapshot_ref
- min_counterparty_volume_cents
- max_exposure_cents
- fallback_rule
- no_trade_baseline
- baseline_statement
- baseline_good_faith_attestation
- baseline_declared_at
- baseline_version
- baseline_change_reason
- baseline_change_review_state
- baseline_review_state
- baseline_integrity_assessment_ref
- baseline_integrity_review_state
- baseline_confidence_level: low | medium | high
- baseline_confidence_rationale
- why_this_is_additional
- additionality_review_state
- counterfactual_risk_note
- partial_clear_allowed
- residual_no_trade_action
- evidence_method
- evidence_standard
- trade_classification_state
- moral_difference_attestation_record_ref
- moral_difference_attestation_review_state
- option_set_comparison_record_ref
- preference_comparability_policy_ref
- participant_option_comparability_state
- incomparability_review_state
- trade_burden_accounting_record_ref
- burden_net_surplus_confirmation_state
- review_state
- externality_review_state
- nonparticipant_externality_review_state
- anti_threat_state
- anti_corruption_assessment_ref
- anti_corruption_review_state
- process_integrity_review_state
- representative_authority_assessment_ref
- representative_authority_review_state
- coercion_undue_influence_assessment_ref
- participant_autonomy_review_state
- confidentiality_privacy_rights_assessment_ref
- confidentiality_review_state
- evidence_authenticity_assessment_ref
- synthetic_media_review_state
- financial_crime_fraud_assessment_ref
- source_of_funds_review_state
- fraud_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- non_public_goods_market_tier
- non_public_goods_tier_policy_ref
- counterfactual_trust_assessment_ref
- counterfactual_trust_class
- preexisting_relationship_or_closed_counterparty_state
- open_market_matching_allowed_bool
- control_applicability_matrix_ref
- risk_control_pack_refs
- control_requirement_result_refs
- private_exchange_rate_quote_record_refs
- market_simulation_run_ref
- pilot_exit_criteria_policy_ref
- pilot_scale_decision_record_ref
- legal_regulatory_domain
- user_jurisdiction_bucket
- recipient_jurisdiction_bucket
- jurisdiction_policy_version
- legal_review_state


pledge_swap_offer
- id
- approved_trade_template_ref
- template_instance_record_ref
- template_parameter_policy_ref
- template_conformance_state
- review_queue_record_refs
- non_public_goods_subsidy_pool_ref
- subsidy_schedule_record_refs
- trade_format
- option_set_comparison_record_refs
- pareto_dominance_review_state
- bargaining_protocol_ref
- bargaining_round_record_refs
- empirical_assumption_snapshot_refs
- batch_clearing_objective_policy_ref
- batch_clearing_objective_result_ref
- offer_validity_record_ref
- offer_expires_at
- stale_offer_state
- noncompensable_blocker_assessment_ref
- noncompensable_blocker_review_state
- privacy_preserving_verification_attestation_refs
- moral_side_constraint_profile_refs
- side_constraint_review_state
- intrapersonal_self_offset_record_ref
- self_offset_classification_state
- offered_cause_area
- requested_cause_area
- offered_action
- cause_bucket_taxonomy_ref
- cause_bucket_assignment_refs
- resource_compatibility_assessment_ref
- direct_pair_clearing_record_refs
- requested_action
- affiliate_disclosure_state
- collusion_review_state
- side_agreement_disclosure_state
- action_unit
- pledge_unit_granularity: one_meal | few_meals | one_day | few_days | week | month | custom_manual_review
- pledge_duration_units
- behavioral_micro_pledge_policy_ref
- micro_pledge_sequence_record_ref
- micro_pledge_window_record_refs
- pre_performance_lock_required_bool
- retroactive_claim_behavior: block | bookkeeping_only | manual_review
- default_evidence_ladder_policy_ref
- per_unit_amount_cents
- sequence_total_amount_cap_cents
- auto_rollover_prohibited_bool
- longer_duration_manual_review_state: not_required | under_review | non_blocking | blocked | manual_review | superseded
- max_default_donation_or_compensation_per_unit_cents
- max_default_sequence_total_cents
- unit_settlement_mode: per_unit | milestone_batch | all_or_nothing | manual_review
- failed_unit_effect_policy
- default_micro_pledge_evidence_profile: self_attestation | self_attestation_plus_optional_artifact | third_party_attestation | manual_review
- performance_frequency
- minimum_performance_threshold
- partial_performance_policy: none | pro_rata | manual_review | breach
- grace_or_cure_period_days
- material_breach_definition
- evidence_due_schedule
- verification_burden_level: low | medium | high
- verification_burden_policy_ref
- invasive_evidence_prohibited_bool
- final_match_lock_required_bool
- matched_trade_lock_proposal_refs
- commitment_inventory_record_refs
- performance_schedule_ref
- synchronized_performance_required_bool
- breach_remedy_policy_ref
- public_breach_disclosure_prohibited_bool
- compensation_mode: none | sponsor_pays_performer | performer_pays_sponsor | mutual_payment | manual_review
- compensation_amount_cents
- compensation_policy_ref
- ordinary_service_procurement_review_state
- agreement_amendment_policy_ref
- tax_or_reporting_review_state
- labor_employment_review_state
- professional_service_review_state
- vulnerability_or_undue_inducement_review_state
- coercion_review_state
- negative_commitment_scope_ref
- action_reversibility_assessment_ref
- third_party_obligation_assessment_ref
- third_party_obligation_review_state
- representative_authority_assessment_ref
- representative_authority_review_state
- reporting_integrity_assessment_ref
- protected_reporting_review_state
- civil_rights_discrimination_assessment_ref
- civil_rights_review_state
- coercion_undue_influence_assessment_ref
- participant_autonomy_review_state
- confidentiality_privacy_rights_assessment_ref
- confidentiality_review_state
- evidence_authenticity_assessment_ref
- synthetic_media_review_state
- financial_crime_fraud_assessment_ref
- source_of_funds_review_state
- fraud_review_state
- agreement_transferability_assessment_ref
- transferability_review_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- non_public_goods_market_tier
- non_public_goods_tier_policy_ref
- counterfactual_trust_assessment_ref
- counterfactual_trust_class
- preexisting_relationship_or_closed_counterparty_state
- open_market_matching_allowed_bool
- control_applicability_matrix_ref
- risk_control_pack_refs
- control_requirement_result_refs
- private_exchange_rate_quote_record_refs
- market_simulation_run_ref
- pilot_exit_criteria_policy_ref
- pilot_scale_decision_record_ref
- offer_validity_record_refs
- anti_corruption_assessment_ref
- anti_corruption_review_state
- process_integrity_review_state
- pledge_performance_bond_policy_ref
- pledge_performance_bond_record_refs
- performance_bond_required_bool
- atomic_settlement_required_bool
- user_safety_policy_ref
- contact_interaction_record_refs
- abuse_report_record_refs
- content_moderation_record_refs
- account_security_event_refs
- preview_confirmation_record_ref
- participant_term_sheet_record_refs
- counterparty_blinding_policy_ref
- staged_counterparty_disclosure_record_refs
- recipient_acceptance_record_refs
- ai_preference_elicitation_record_refs
- post_clear_audit_record_refs
- consent_quality_record_ref
- matching_clearing_run_ref
- no_trade_baseline
- baseline_good_faith_attestation
- baseline_declared_at
- baseline_version
- baseline_change_reason
- baseline_change_review_state
- baseline_review_state
- baseline_integrity_assessment_ref
- baseline_integrity_review_state
- baseline_confidence_level: low | medium | high
- baseline_confidence_rationale
- why_this_is_additional
- additionality_review_state
- counterfactual_risk_note
- counterfactual_risk_level: low | medium | high
- duration_or_review_period
- max_obligation_duration
- exit_pause_expiry_rule
- reciprocal_release_rule
- withdrawal_before_lock_allowed
- verification_method
- evidence_standard
- challenge_window
- neutral_review_required_if_counterparty_benefits_from_rejection
- public_description
- trade_classification_state
- moral_difference_attestation_record_ref
- moral_difference_attestation_review_state
- option_set_comparison_record_ref
- preference_comparability_policy_ref
- participant_option_comparability_state
- incomparability_review_state
- trade_burden_accounting_record_ref
- burden_net_surplus_confirmation_state
- externality_review_state
- nonparticipant_externality_review_state
- anti_threat_state
- user_jurisdiction_bucket
- counterparty_jurisdiction_bucket
- jurisdiction_policy_version
- legal_review_state
- review_state


evidence_record
- id
- subject_type: release_gate | release_gate_requirement_result | approved_trade_template | template_instance_record | review_capacity_policy | review_queue_record | non_public_goods_subsidy_pool | subsidy_schedule_record | cause_bucket_taxonomy | cause_bucket_assignment | direct_pair_clearing_record | resource_compatibility_assessment | net_offset_accounting_record | matching_clearing_run | matched_trade_lock_proposal | baseline_integrity_assessment | agreement_amendment_record | pledge_performance_bond_record | commitment_inventory_record | commitment_reservation_record | atomic_settlement_group | pledge_swap_performance_schedule | behavioral_micro_pledge_policy | micro_pledge_sequence_record | micro_pledge_window_record | compensated_action_terms | donor_of_record_policy | donation_receipt_record | negative_commitment_scope | action_reversibility_assessment | third_party_obligation_assessment | representative_authority_assessment | reporting_integrity_assessment | civil_rights_discrimination_assessment | coercion_undue_influence_assessment | confidentiality_privacy_rights_assessment | evidence_authenticity_assessment | financial_crime_fraud_assessment | agreement_transferability_assessment | regulated_goods_hazardous_activity_assessment | cyber_abuse_digital_systems_integrity_assessment | noncompensable_blocker_assessment | offer_validity_record | batch_clearing_objective_result | privacy_preserving_verification_attestation | option_set_comparison_record | trade_burden_accounting_record | moral_difference_attestation_record | bargaining_protocol | bargaining_round_record | empirical_assumption_snapshot | moral_side_constraint_profile | intrapersonal_self_offset_record | anti_corruption_assessment | financial_reconciliation_run | incident_response_record | audit_integrity_checkpoint | policy_snapshot | state_interpretation_policy | privileged_action_record | provider_source_authentication_policy | time_authority_policy | data_security_policy | audit_integrity_policy | choice_architecture_policy | anti_enumeration_policy | reviewer_quality_policy | review_quality_audit | user_safety_policy | contact_interaction_record | abuse_report_record | content_moderation_policy | content_moderation_record | account_security_policy | account_security_event | backup_recovery_policy | backup_recovery_checkpoint | deployment_release_record | configuration_snapshot | configuration_change_record | schema_migration_policy | schema_migration_run | environment_data_isolation_policy | environment_data_isolation_record | user_facing_status_policy | user_facing_status_record | participant_eligibility_record | consent_quality_record | privacy_grant | privacy_access_log | discovery_access_event | impact_claim_record | public_receipt_card_record | recipient_registry_entry | payment_destination | side_agreement_disclosure | participant_confirmation_record | offset_offer | pledge_swap_offer | cleared_trade_agreement | payout_milestone | payment_event | dispute_case | appeal_case | dispute
- subject_id
- evidence_claim_type: action_performed | payment_or_transfer | destination_verified | recipient_or_destination_verification | performance_bond_posted | performance_bond_return_or_forfeiture_support | baseline_support | additionality_support | externality_support | nonparticipant_externality_support | impact_or_outcome_support | public_receipt_card_support | identity_or_sybil_support | participant_eligibility_support | matching_or_clearing_support | financial_reconciliation_support | template_conformance_support | review_capacity_support | subsidy_schedule_support | incident_response_support | legal_or_jurisdiction_support | representative_authority_support | reporting_integrity_support | civil_rights_discrimination_support | coercion_undue_influence_support | confidentiality_privacy_rights_support | evidence_authenticity_support | financial_crime_fraud_support | cause_bucket_taxonomy_support | direct_pair_clearing_support | resource_compatibility_support | net_offset_accounting_support | agreement_transferability_support | regulated_goods_hazardous_activity_support | cyber_abuse_digital_systems_integrity_support | noncompensable_blocker_support | offer_validity_support | batch_clearing_objective_support | privacy_preserving_verification_support | counterfactual_trust_support | control_requirement_support | private_exchange_rate_quote_support | market_simulation_support | pilot_exit_criteria_support | option_set_comparison_support | preference_comparability_support | trade_burden_accounting_support | moral_difference_attestation_support | bargaining_protocol_support | behavioral_micro_pledge_support | behavioral_micro_pledge_evidence_ladder_support | micro_pledge_window_support | empirical_assumption_support | moral_side_constraint_support | intrapersonal_self_offset_support | anti_corruption_support | process_integrity_support | privacy_grant_support | consent_quality_support | anti_enumeration_support | reviewer_quality_support | user_safety_support | abuse_report_support | content_moderation_support | account_security_support | backup_recovery_support | deployment_release_support | configuration_integrity_support | schema_migration_support | environment_data_isolation_support | user_facing_status_support | appeal_support | release_gate_support | release_gate_requirement_support | term_sheet_support | counterparty_disclosure_support | recipient_acceptance_support | ai_preference_elicitation_support | post_clear_audit_support | policy_review_support | side_agreement_support
- submitted_by_type: participant | reviewer | provider | system
- submitted_by_hash
- source_type: provider_webhook | receipt | attestation | public_record | third_party_report | reviewer_note | audit_log
- provider_source_authentication_policy_ref
- source_authentication_state: not_applicable | pending | authenticated | failed | stale | replayed | manual_review
- provider_account_ref
- provider_signature_hash
- received_endpoint_id
- artifact_ref
- artifact_hash
- evidence_authenticity_assessment_ref
- source_provenance_state: not_required | authenticated | plausible | unauthenticated | inconsistent | impossible | manual_review
- synthetic_or_manipulated_media_state: not_required | none_detected | possible | under_review | confirmed_manipulated | confirmed_synthetic | manual_review
- replay_or_reuse_state: not_required | none_detected | possible_duplicate | already_used_elsewhere | under_review | blocking | manual_review
- data_security_policy_ref
- encryption_state: not_required | encrypted | tokenized | missing | stale_key | failed_decryption | manual_review
- encryption_key_version_ref
- evidence_standard_ref
- privacy_level: private | reviewer_only | counterparty_visible | public_redacted
- data_retention_policy_ref
- data_consent_refs
- privacy_grant_refs
- legal_hold_state: none | active | released
- verification_state: submitted | under_review | accepted | challenged | rejected | superseded
- challenge_window_state: not_applicable | open | closed | waived_non_blocking
- challenge_window_opened_at
- challenge_window_closes_at
- challenge_default_outcome: accept_if_unchallenged | manual_review_if_no_response | reject_if_unanswered
- required_notice_ref
- notice_delivery_state
- challenged_by_hash
- challenge_reason_codes_json
- counterparty_acceptance_state: not_applicable | accepted | challenged | no_response
- reviewer_decision_ref
- created_at
- updated_at


payout_milestone
- id
- cleared_trade_agreement_id
- recipient_or_destination_subject_ref
- refund_policy_ref
- financial_reconciliation_run_ref
- incident_response_record_refs
- recipient_registry_ref
- verified_payment_destination_ref
- recipient_anti_impersonation_state
- destination_reference
- milestone_label
- amount_cents
- currency
- required_evidence_claim_types
- evidence_standard_refs_json
- challenge_window_policy_ref
- challenge_window_state
- challenge_window_opened_at
- challenge_window_closes_at
- challenge_default_outcome: release_if_unchallenged | manual_review_if_no_response | block_if_unanswered
- required_notice_ref
- notice_delivery_state
- dispute_case_ref
- release_state: pending | evidence_submitted | under_review | releasable | released | blocked | disputed | cancelled
- release_payment_event_ref
- reviewer_decision_ref
- created_at
- updated_at


dispute_case
- id
- subject_type: evidence_record | payout_milestone | cleared_trade_agreement | payment_event | review_decision
- subject_id
- opened_by_type: participant | counterparty | reviewer | system
- opened_by_hash
- dispute_type: evidence_challenge | baseline_challenge | additionality_challenge | externality_challenge | payment_dispute | payout_release_dispute | classification_dispute | collusion_dispute
- status: open | under_review | resolved | rejected | escalated | withdrawn
- neutral_review_required_bool
- neutral_panel_ref
- challenge_window_opened_at
- challenge_window_closes_at
- default_outcome
- required_notice_ref
- notice_delivery_state
- reason_codes_json
- evidence_refs_json
- resolution_decision_ref
- created_at
- updated_at


appeal_case
- id
- subject_type: participant_eligibility_record | recipient_registry_entry | payment_destination | privacy_grant | impact_claim_record | public_receipt_card_record | abuse_report_record | contact_interaction_record | evidence_record | review_decision | cleared_trade_agreement | payout_milestone | release_gate
- subject_id
- opened_by_hash
- appeal_type: eligibility_reconsideration | destination_reverification | evidence_reconsideration | privacy_grant_reconsideration | impact_claim_reconsideration | public_receipt_card_reconsideration | abuse_report_reconsideration | contact_block_reconsideration | anti_threat_reconsideration | externality_reconsideration | payout_release_reconsideration | classification_reconsideration | release_gate_reconsideration
- status: open | under_review | resolved | rejected | escalated | withdrawn
- appeal_policy_ref
- neutral_review_required_bool
- neutral_panel_ref
- deadline_at
- required_notice_ref
- notice_delivery_state
- evidence_refs_json
- resolution_decision_ref
- created_at
- updated_at


review_decision
- id
- subject_type: release_gate | release_gate_requirement_result | matching_clearing_run | matched_trade_lock_proposal | baseline_integrity_assessment | agreement_amendment_record | pledge_performance_bond_policy | pledge_performance_bond_record | commitment_inventory_record | commitment_reservation_record | atomic_settlement_group | pledge_swap_performance_schedule | behavioral_micro_pledge_policy | micro_pledge_sequence_record | micro_pledge_window_record | compensated_action_terms | donor_of_record_policy | donation_receipt_record | negative_commitment_scope | action_reversibility_assessment | third_party_obligation_assessment | representative_authority_assessment | reporting_integrity_assessment | civil_rights_discrimination_assessment | coercion_undue_influence_assessment | confidentiality_privacy_rights_assessment | evidence_authenticity_assessment | financial_crime_fraud_assessment | agreement_transferability_assessment | regulated_goods_hazardous_activity_assessment | cyber_abuse_digital_systems_integrity_assessment | noncompensable_blocker_assessment | offer_validity_record | batch_clearing_objective_result | privacy_preserving_verification_attestation | option_set_comparison_record | trade_burden_accounting_record | moral_difference_attestation_record | bargaining_protocol | bargaining_round_record | empirical_assumption_snapshot | moral_side_constraint_profile | intrapersonal_self_offset_record | anti_corruption_assessment | financial_reconciliation_run | incident_response_record | audit_integrity_checkpoint | policy_snapshot | state_interpretation_policy | privileged_action_record | provider_source_authentication_policy | time_authority_policy | data_security_policy | audit_integrity_policy | choice_architecture_policy | anti_enumeration_policy | reviewer_quality_policy | review_quality_audit | user_safety_policy | contact_interaction_record | abuse_report_record | content_moderation_policy | content_moderation_record | account_security_policy | account_security_event | backup_recovery_policy | backup_recovery_checkpoint | deployment_release_record | configuration_snapshot | configuration_change_record | schema_migration_policy | schema_migration_run | environment_data_isolation_policy | environment_data_isolation_record | user_facing_status_policy | user_facing_status_record | participant_eligibility_record | consent_quality_record | platform_fee_policy | refund_cancellation_policy | fx_policy | notification_policy | data_retention_policy | privacy_grant | privacy_access_log | discovery_access_event | impact_claim_record | public_receipt_card_policy | public_receipt_card_record | appeal_case | recipient_registry_entry | payment_destination | side_agreement_disclosure | participant_confirmation_record | offset_offer | pledge_swap_offer | cleared_trade_agreement | evidence_record | payout_milestone | dispute_case | dispute
- subject_id
- reviewer_id_hash
- reviewer_role
- conflict_of_interest_state
- neutral_panel_ref
- reviewer_quality_policy_ref
- review_quality_audit_refs
- decision_state: approved | blocked | needs_changes | recused | superseded
- reason_codes_json
- evidence_refs_json
- prior_decision_id
- created_at


payment_event
- id
- cleared_trade_agreement_id
- payout_milestone_id
- participant_id_hash
- provider
- provider_event_id
- provider_account_ref
- provider_source_authentication_policy_ref
- source_authentication_state: pending | authenticated | failed | stale | replayed | manual_review
- financial_crime_fraud_assessment_ref
- payment_fraud_review_state: not_required | under_review | non_blocking | blocked | manual_review
- source_of_funds_review_state: not_required | under_review | non_blocking | blocked | manual_review
- agreement_transferability_assessment_ref
- transferability_review_state: not_required | under_review | non_blocking | blocked | manual_review
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state: not_required | under_review | non_blocking | blocked | manual_review
- hazardous_activity_review_state: not_required | under_review | non_blocking | blocked | manual_review
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state: not_required | under_review | non_blocking | blocked | manual_review
- digital_systems_integrity_review_state: not_required | under_review | non_blocking | blocked | manual_review
- received_endpoint_id
- idempotency_key
- event_type: payment_method_saved | authorization_created | authorization_cancelled | capture_succeeded | capture_failed | refund_created | payout_released | performance_bond_authorization_created | performance_bond_posted | performance_bond_returned | performance_bond_forfeited | provider_dispute_opened | provider_dispute_closed
- amount_cents
- platform_fee_cents
- net_contribution_or_payout_cents
- currency
- provider_status
- related_terms_snapshot_hash
- related_participant_confirmation_hash
- raw_payload_hash
- data_security_policy_ref
- encryption_state: encrypted | tokenized | missing | stale_key | manual_review
- processing_state: pending | applied | ignored_duplicate | blocked_stale_snapshot | failed | manual_review
- financial_reconciliation_run_ref
- error_code
- received_at
- processed_at
- created_at


marketplace_state_event
- id
- subject_type: release_gate | release_gate_requirement_result | matching_clearing_run | matched_trade_lock_proposal | baseline_integrity_assessment | agreement_amendment_record | pledge_performance_bond_record | commitment_inventory_record | commitment_reservation_record | atomic_settlement_group | pledge_swap_performance_schedule | behavioral_micro_pledge_policy | micro_pledge_sequence_record | micro_pledge_window_record | compensated_action_terms | donor_of_record_policy | donation_receipt_record | negative_commitment_scope | action_reversibility_assessment | third_party_obligation_assessment | representative_authority_assessment | reporting_integrity_assessment | civil_rights_discrimination_assessment | coercion_undue_influence_assessment | confidentiality_privacy_rights_assessment | evidence_authenticity_assessment | financial_crime_fraud_assessment | agreement_transferability_assessment | regulated_goods_hazardous_activity_assessment | cyber_abuse_digital_systems_integrity_assessment | noncompensable_blocker_assessment | offer_validity_record | batch_clearing_objective_result | privacy_preserving_verification_attestation | option_set_comparison_record | trade_burden_accounting_record | moral_difference_attestation_record | bargaining_protocol | bargaining_round_record | empirical_assumption_snapshot | moral_side_constraint_profile | intrapersonal_self_offset_record | anti_corruption_assessment | financial_reconciliation_run | incident_response_record | audit_integrity_checkpoint | policy_snapshot | state_interpretation_policy | privileged_action_record | provider_source_authentication_policy | time_authority_policy | data_security_policy | audit_integrity_policy | choice_architecture_policy | anti_enumeration_policy | reviewer_quality_policy | review_quality_audit | user_safety_policy | contact_interaction_record | abuse_report_record | content_moderation_policy | content_moderation_record | account_security_policy | account_security_event | backup_recovery_policy | backup_recovery_checkpoint | deployment_release_record | configuration_snapshot | configuration_change_record | schema_migration_policy | schema_migration_run | environment_data_isolation_policy | environment_data_isolation_record | user_facing_status_policy | user_facing_status_record | participant_eligibility_record | consent_quality_record | privacy_grant | privacy_access_log | discovery_access_event | impact_claim_record | appeal_case | recipient_registry_entry | payment_destination | side_agreement_disclosure | participant_confirmation_record | cleared_trade_agreement | payout_milestone | payment_event | evidence_record | dispute_case | dispute
- subject_id
- prior_state
- next_state
- actor_type: participant | reviewer | system_job | provider_webhook
- actor_id_hash
- trigger: user_action | reviewer_decision | calculation | provider_webhook | scheduled_job
- idempotency_key
- source_event_ref
- terms_snapshot_hash
- participant_confirmation_hash
- reason_codes_json
- created_at
```

Every release gate must be reproducible from first-class requirement results. The human-readable `release_gate_requirements` checklist is only a specification; the runtime gate must verify the corresponding `release_gate_requirement_result` records or frozen requirement-result bundle before promotion, feature-flag activation, real-money capture, reliance-bearing preview, or public-metric release.

For non-public-goods marketplace tracks, matching and settlement outputs must be reproducible from append-only input bundles. Evidence records must be claim-typed and evidence-standard-scoped: accepting an `action_performed` record does not satisfy `baseline_support`, `additionality_support`, `destination_verified`, `externality_support`, or `legal_or_jurisdiction_support`. If evidence is challenged, superseded, or accepted for a narrower claim than originally submitted, keep the original artifact hash and add a new reviewer decision or superseding evidence record rather than rewriting the old record. Reviewer decisions, payment/provider-webhook events, release gates, recipient registry entries, payment destinations, side-agreement disclosures, participant confirmation records, privacy grants, impact claim records, and policy snapshots are reviewable subjects with evidence, reviewer decisions, and state events rather than unstructured fields on a parent offer. Participant confirmation records are the canonical consent ledger; hashes or JSON summaries on parent objects are indexes into this ledger, not substitutes for it. Privacy grants are the canonical disclosure ledger; raw private data should not be exposed through parent-object fields. Impact claim records are the canonical public-impact ledger; payout and transfer records are not substitutes for impact claims.

---

## External CRECM module boundary

This file contains no moral-public-goods / Common-Ground-Budget allocation algorithm or implementation rules. Use `moralpublicgoods102.md` / CRECM v1.96 as the sole source of truth for that track.

---

## Donation offset marketplace

Keep donation offsets as a separate marketplace track. Do not treat them as ordinary charity matching.

Implement:

```text
offset_offer
- offered_cause_bucket
- opposed_or_counterparty_bucket
- acceptable_counterparty_buckets
- counterparty_distinctness_min
- affiliate_disclosure_state
- collusion_review_state
- side_agreement_disclosure_state
- clearing_ratio_policy_ref
- acceptable_clearing_ratio_min_bps
- acceptable_clearing_ratio_max_bps
- final_match_lock_required_bool
- matched_trade_lock_proposal_refs
- preview_confirmation_record_ref
- compromise_destination
- compromise_destination_verification_state
- recipient_registry_ref
- verified_payment_destination_ref
- recipient_anti_impersonation_state
- prohibited_use_policy_ref
- amount_cents
- settlement_currency
- fx_rate_snapshot_ref
- min_counterparty_volume_cents
- max_exposure_cents
- partial_clear_allowed
- residual_no_trade_action
- fallback_rule
- no_trade_baseline
- baseline_statement
- baseline_good_faith_attestation
- baseline_review_state
- baseline_confidence_level: low | medium | high
- baseline_confidence_rationale
- why_this_is_additional
- additionality_review_state
- counterfactual_risk_note
- evidence_method
- evidence_standard
- review_state
- externality_review_state
- nonparticipant_externality_review_state
- anti_threat_state
- regulated_goods_hazardous_activity_assessment_ref
- regulated_goods_review_state
- hazardous_activity_review_state
- cyber_abuse_digital_systems_integrity_assessment_ref
- cyber_abuse_review_state
- digital_systems_integrity_review_state
- legal_regulatory_domain
- user_jurisdiction_bucket
- recipient_jurisdiction_bucket
- jurisdiction_policy_version
- legal_review_state
```

Clearing logic:

```text
clear only when:
- matching and clearing are produced by a frozen `matching_clearing_run` with reproducible inputs, deterministic algorithm version, frozen batch-clearing objective, deterministic tie-break/fairness policy, and non-blocking review state
- direct-pair clearing, where used, is represented by a frozen `direct_pair_clearing_record`; it has both-party consent, a known/invite-linked counterparty, no autonomous outreach, and the same review/payment/privacy gates as batch clearing
- cause-bucket assignments are drawn from the frozen cause-bucket taxonomy version; disputed, inferred, protected-trait-proxy, or stale taxonomy assignments remain preview/manual-review only
- resource-compatibility assessment is non-blocking for the proposed donations, abstentions, destinations, timing, and control claims
- net-offset accounting records the matched canceled opposed amount, residual opposed action, substitution-channel review, and evidence standard before any moral-trade volume or completed-agreement count is emitted
- the frozen batch-clearing objective result is non-blocking; matched volume, participant-count treatment, residuals, pro-rata/tie-break behavior, and exclusions are reproducible from the input bundle rather than reviewer preference, public pressure, private-cap leakage, timestamp races, or database order
- both sides are review-compatible
- the offer and matched proposal conform to an approved template and frozen parameter policy, or have an explicit non-blocking off-template reviewer decision with renewed participant confirmation
- the relevant review-capacity policy admits the case, assigns or reserves an eligible reviewer or neutral panel where required, and is not in overflow/stale state
- all source offers and lock proposals are non-stale under the frozen offer-validity policy; expired, stale, or materially changed baselines, empirical assumptions, evidence standards, payment methods, jurisdictions, destinations, or counterparty buckets require a new preview and renewed confirmation before clearing
- participant eligibility/legal-capacity/sanctions/payment-rail checks are non-blocking for both sides
- baselines are named
- each side explicitly confirms the cleared bundle is preferable to its no-trade baseline by its own stated view
- baseline/additionality review is not blocking
- baseline integrity/manufacturing review is non-blocking; marketplace-created or escalated opposed baselines are preview-only or rejected-threat/externality rather than clearable moral trades
- baseline confidence is not low, unless a neutral reviewer explicitly approves clearing with user-facing uncertainty disclosure
- externality review does not block
- nonparticipant externality review does not block; participants cannot waive material third-party harm
- destination and payment destination are verified through the recipient registry or reviewer-approved destination proof, with non-blocking anti-impersonation review
- recipient-acceptance/adverse-association review is non-blocking where the recipient, fiscal host, evaluator, charity, or project is publicly named, bound by restricted-use terms, asked for milestone evidence, or used in offset-pair promotional copy
- donor-of-record, tax-receipt, charitable-solicitation, commercial-co-venture, and tax/reporting review states are non-blocking where the flow involves a charitable donation, external donation platform, donor-advised fund, employer match, or receipt-generating transfer
- matched volume >= each side’s minimum
- any non-public-goods subsidy schedule is frozen, source-of-funds reviewed, conflict reviewed, cap checked, and excluded from participant moral-trade volume and impact claims
- final matched terms are frozen in a `matched_trade_lock_proposal`; each participant has a non-stale final lock confirmation for that exact proposal; and each final confirmation references a non-stale participant-facing term sheet whose hash matches the frozen proposal
- each planned donation, opposed-donation abstention, payment authorization, and evidence artifact used for the trade has a non-conflicting `commitment_reservation_record`; the same baseline capacity is not already reserved, locked, fulfilled, or counted in another live trade unless a pooled-use policy was explicitly confirmed by all affected participants
- any opposed-donation abstention or other negative commitment has a bounded `negative_commitment_scope`, substitution policy, confidence level, and least-intrusive evidence plan; proof of the compromise donation alone does not satisfy the abstention claim
- the matched proposal belongs to an `atomic_settlement_group` whose all-or-none state is non-blocking; if any required participant fails final confirmation, eligibility, authorization, or reservation checks, no participant is captured, no private counterparty details are newly disclosed, and the batch expires, recomputes, or routes to manual review under the frozen policy
- the clearing ratio is within each participant’s acceptable ratio bounds; if the ratio is outside bounds, the matched proposal expires or remains preview-only rather than being silently scaled
- if partial clearing is enabled, only the matched volume clears; any residual amount follows the participant’s stated residual no-trade action or fallback rule and is never silently captured
- counterparty buckets pass the configured distinctness test; otherwise classify as ordinary donation/matching, not moral trade
- the distinctness test uses only self-declared cause/offer buckets and a reviewer-approved coarse taxonomy, not protected traits or inferred ideology/psychology
- affiliate/common-control and circular-volume checks are non-blocking; reviewer-blocked or undisclosed affiliate volume does not count toward matching or moral-trade metrics
- side-agreement disclosure review is non-blocking; undisclosed compensation, reciprocal favors, or off-platform commitments that materially affect the trade block clearing until reviewed
- counterparty-blinding and staged-disclosure records are non-blocking; exact identities, direct contact, rare bucket combinations, exact caps, private notes, and private surplus information are not disclosed before the frozen disclosure policy permits them
- no party is worsening the default or threatening to worsen the default in order to extract concessions
- no safety, legal, privacy, third-party-rights, anti-threat, reporting-integrity, civil-rights, confidentiality, regulated-goods, cyber-abuse, financial-crime, or process-integrity blocker is being compensated for or waived by side payment, higher donation, performance bond, reciprocal favor, or private agreement unless the frozen policy explicitly treats the protected interest as personally waivable and all renewed confirmations/reviews are non-blocking
- representative-authority review is non-blocking when a participant claims to redirect, commit, disclose, receipt, or evidence anything on behalf of a represented person, organization, donor-advised fund, fiscal host, campaign, employer, school, family member, client, patient, or other third party
- reporting-integrity review is non-blocking when a negative commitment, side agreement, evidence term, challenge term, or compensation term could suppress truthful reporting, complaint filing, complaint maintenance, safety disclosure, evidence submission, or cooperation with a lawful or institutional investigation
- civil-rights/discrimination review is non-blocking when the donation, abstention, requested action, recipient choice, side agreement, compensation term, evidence term, contact behavior, or platform-moderation action could require or reward protected-trait discrimination, unlawful exclusion, retaliation, harassment, or protected-activity suppression
- participant-autonomy/coercion-undue-influence review is non-blocking when compensation, a performance bond, evidence burden, abstention, disclosure term, dependency, authority relationship, or urgent vulnerability could pressure a participant into a materially harmful or non-voluntary bargain
- confidentiality/privacy-rights review is non-blocking when an action, evidence term, disclosure term, side agreement, compensation term, or performance bond could disclose, sell, transfer, misuse, or suppress private personal data, third-party records, confidential information, access credentials, location/device data, private communications, trade secrets, or nonconsensual intimate/sensitive content
- evidence-authenticity/synthetic-media review is non-blocking when action proof, payment proof, abstention proof, baseline proof, challenge evidence, or bond-return/forfeiture evidence relies on user-submitted screenshots, receipts, photos, videos, messages, exported logs, third-party attestations, or other evidence that could be forged, replayed, selectively edited, AI-generated, or detached from the asserted source
- privacy-preserving verification attestations are used where the evidence claim can be satisfied without showing raw private artifacts to counterparties; if raw private evidence disclosure would be necessary, the trade remains preview/manual-review only until the privacy grant, confidentiality review, and user-facing disclosure are non-blocking
- financial-crime/fraud/source-of-funds review is non-blocking when a payment method, donor identity, beneficial owner, recipient, refund route, compensation term, donation receipt, side agreement, circular flow, or unusual payment pattern could indicate money laundering, sanctions evasion, terrorist/extremist financing, stolen funds, stolen payment methods, card testing, chargeback/refund abuse, fabricated receipts, fake donation volume, or disguised private compensation
- regulated-goods/hazardous-activity review is non-blocking when a recipient choice, evidence method, payment term, compensation term, side agreement, or linked action could involve weapons, ammunition, explosives, controlled substances, hazardous chemicals, unsafe medical or bodily interventions, dangerous transportation, animal-handling risk, biosecurity-relevant materials, cyber-physical sabotage, or comparable dangerous conduct
- agreement-transferability/non-assignment review is non-blocking when an obligation, payout expectation, refund path, performance-bond claim, evidence claim, completed-agreement record, or alleged moral-trade credit could be assigned, sold, resold, tokenized, collateralized, syndicated, or assumed by a third party
- cyber-abuse/digital-systems-integrity review is non-blocking when an action, abstention, evidence method, compensation term, performance bond, recipient choice, invite/contact behavior, or side agreement could involve unauthorized access, credential theft, phishing, malware, botting, spam, denial-of-service, unauthorized scraping, data exfiltration, platform-integrity manipulation, review/rating manipulation, exploit use, or adversarial prompt/model attacks against third-party systems
- non-public-goods market tier policy is non-blocking; the proposal's tier permits the trade type, money movement, evidence burden, jurisdiction, and matching mode for the current release stage
- counterfactual-trust assessment is non-blocking; if the trade depends on abstention, non-action, or another counterfactual claim, the remaining uncertainty is disclosed and the tier policy permits clearing at that trust class
- applicable risk-control packs and control requirement results are resolved through the control-applicability matrix; missing, stale, contradictory, or duplicated controls fail closed
- any clearing ratio, side payment, or implied cause tradeoff is backed by private exchange-rate quote records from the affected participants and is not published as a general moral exchange rate
- market-simulation/red-team results and pilot-exit criteria are non-blocking for the release stage; a pilot that has met pause or rollback criteria cannot produce payable or reliance-bearing trades
- option-set/Pareto-comparison review is non-blocking; if all affected participants have marked another reviewed feasible option as weakly better for everyone and strictly better for at least one participant, the current proposal remains preview/manual-review only unless that alternative is unavailable, stale, legally blocked, unsafe, out of stage, or not comparable under a frozen participant-owned comparability state
- preference-comparability/incomparability review is non-blocking; the platform must not force a cardinal score or rank-order where a participant has marked options as incomparable, lexically blocked, or insufficiently comparable by their own view
- trade-burden accounting is non-blocking; each participant has confirmed the matched proposal relative to the no-trade baseline after seeing the disclosed money, fee, time, evidence, privacy, coordination, challenge, and residual-obligation burden profile
- moral-difference attestation review is non-blocking; the trade classification is supported by a coarse participant-owned attestation explaining why the deal is made possible by moral-view, moral-priority, indexical-obligation, empirical-belief, or moral/prudential-asymmetry differences rather than ordinary matching, procurement, or self-offset bookkeeping
- bargaining-protocol/anti-holdup review is non-blocking; no hidden dynamic pricing, private-cap disclosure, artificial urgency, last-mover holdup, or material counteroffer can create reliance-bearing obligations without renewed confirmations
- empirical-assumption snapshot review is non-blocking; assumptions material to participant surplus confirmation are frozen and not stale, challenged, or superseded
- side-constraint/agent-relative-limit review is non-blocking; a participant-stated personal side constraint, nondelegable duty, or impermissible-action flag cannot be waived by implication from ordinary participant surplus confirmation
- intrapersonal/self-offset classification is non-blocking; self-offset or personal moral-bookkeeping flows are not counted as completed interpersonal moral trade unless a distinct counterparty or represented moral perspective is part of the frozen agreement
- anti-corruption and process-integrity review is non-blocking where the donation, abstention, recipient choice, side agreement, or compensation could influence a public official, vote, testimony, procurement decision, professional referral, platform moderation action, fiduciary choice, or other entrusted decision
- legal/jurisdiction review is non-blocking; no political/electoral, raffle, lottery, quasi-security, tax-sensitive, or other regulated domain is enabled unless the applicable jurisdiction policy version explicitly approves it
- if AI-assisted preference elicitation shaped baselines, caps, cause buckets, side constraints, evidence preferences, or fallback rules, the AI output has been converted into user-edited structured input and cannot itself authorize clearing
- the trade is eligible for post-clear audit sampling under the frozen audit policy, and the audit path does not create public moral reputation or retroactive obligations beyond the locked term sheet
```

Before lock, show each participant a no-trade comparison preview:

```text
Your stated no-trade baseline
Baseline confidence level and uncertainty disclosure
Your proposed contribution if the trade clears
Counterparty volume required for clearing
Matched amount, clearing ratio, ratio-bounds status, unmatched residual amount, residual no-trade action if partial clearing is enabled, and the frozen batch-clearing objective/fairness rule used to compute the match
Direct-pair or batch-clearing mode, known/invite-linked counterparty status where relevant, and final lock-confirmation status
Cause-bucket taxonomy version, your bucket assignments, counterparty distinctness status, and whether classification depends on those assignments
Resource-compatibility / joint-feasibility status
Net-offset accounting: baseline opposed action, matched canceled amount, compromise transfer amount, sponsor/match amount, residual opposed action, and substitution-channel status
Offer expiry, stale-offer status, renewal requirement, and what changed since the last confirmation if renewal is required
Negative/abstention commitment scope, substitution policy, and abstention-confidence disclosure where relevant
Whether this is only a match candidate or a final lock proposal requiring confirmation
Plain-language participant term sheet and term-sheet hash
Counterparty-blinding/staged-disclosure state and what facts remain hidden before lock
Approved template and parameter-conformance status
Review queue status, expected review timing, and what happens if the offer expires before review
Any sponsor-funded subsidy amount, cap, eligibility rule, and whether the subsidy is excluded from moral-trade volume and impact claims
Compromise destination, destination-verification and anti-impersonation status, verified payment destination, recipient-acceptance/adverse-association status, donor-of-record/tax-receipt handling, charitable-solicitation status, and evidence standard
Maximum exposure and fallback rule
Legal/jurisdiction availability status
Reporting-integrity, civil-rights/discrimination, participant-autonomy/coercion-undue-influence, confidentiality/privacy-rights, evidence-authenticity/synthetic-media, privacy-preserving verification-attestation status, financial-crime/fraud, regulated-goods/hazardous-activity, cyber-abuse/digital-systems-integrity, noncompensable-safety-blocker status, offer-validity/staleness status, batch-clearing-objective/fairness status, non-public-goods tier, counterfactual-trust class, control-pack/control-result status, private exchange-rate quote status, simulation/pilot-exit status, option-set/Pareto-comparison, preference-incomparability/noncardinal, trade-burden accounting, moral-difference attestation, bargaining-protocol, empirical-assumption, side-constraint/agent-relative-limit, intrapersonal/self-offset classification, agreement-transferability/non-assignment, representative-authority, and anti-corruption status where relevant
Why this is classified as moral trade rather than ordinary matching
Whether AI-assisted preference elicitation was used and what user-edited structured input it produced
Whether the completed agreement may be sampled for privacy-safe post-clear audit
```

Start with charity-to-charity or donor-to-charity flows. Do not launch regulated campaign-finance, raffle, lottery, or quasi-security features without counsel. The attached mechanism comparison says the recommendation is strongest for charity-to-charity or donor-to-charity funding flows and weaker for political or regulated instruments.

---

## Bounded pledge swaps

For pledge swaps, improve creation and matching, but do not optimize for volume yet.

Pledge-swap previews should support a direct-pair or closed-counterparty path before any open-market matching path. Direct-pair mode lets an existing pair test a proposed trade without turning the platform into a counterparty discovery engine; it must still freeze terms, record both confirmations, and pass the same review gates.

Add or improve a wizard that requires:

```text
approved_trade_template_ref
template_parameter_policy_ref
template_conformance_state
review_queue_record_refs
trade_format
participant_term_sheet_record_ref
counterparty_blinding_policy_ref
staged_counterparty_disclosure_record_refs
ai_preference_elicitation_record_ref
post_clear_audit_record_refs
offered_cause_area
requested_cause_area
recipient_acceptance_record_ref
performance_bond_required_bool
cause_bucket_taxonomy_ref
cause_bucket_assignment_refs
resource_compatibility_assessment_ref
direct_pair_clearing_record_refs
pledge_performance_bond_policy_ref
pledge_performance_bond_amount_cents
pledge_performance_bond_forfeiture_destination
offered_action
requested_action
affiliate_disclosure_state
collusion_review_state
side_agreement_disclosure_state
compensation_mode
compensation_amount_cents
compensation_policy_ref
tax_or_reporting_review_state
labor_employment_review_state
professional_service_review_state
vulnerability_or_undue_inducement_review_state
coercion_review_state
negative_commitment_scope_ref
action_reversibility_assessment_ref
third_party_obligation_assessment_ref
third_party_obligation_review_state
representative_authority_assessment_ref
representative_authority_review_state
reporting_integrity_assessment_ref
protected_reporting_review_state
civil_rights_discrimination_assessment_ref
civil_rights_review_state
coercion_undue_influence_assessment_ref
participant_autonomy_review_state
confidentiality_privacy_rights_assessment_ref
confidentiality_review_state
evidence_authenticity_assessment_ref
synthetic_media_review_state
financial_crime_fraud_assessment_ref
source_of_funds_review_state
fraud_review_state
agreement_transferability_assessment_ref
transferability_review_state
regulated_goods_hazardous_activity_assessment_ref
regulated_goods_review_state
hazardous_activity_review_state
cyber_abuse_digital_systems_integrity_assessment_ref
cyber_abuse_review_state
digital_systems_integrity_review_state
non_public_goods_market_tier
non_public_goods_tier_policy_ref
counterfactual_trust_assessment_ref
counterfactual_trust_class
preexisting_relationship_or_closed_counterparty_state
closed_counterparty_required_bool
open_market_matching_allowed_bool
control_applicability_matrix_ref
risk_control_pack_refs
control_requirement_result_refs
private_exchange_rate_quote_record_refs
market_simulation_run_refs
pilot_exit_criteria_policy_ref
pilot_scale_decision_record_ref
option_set_comparison_record_refs
pareto_dominance_review_state
bargaining_protocol_ref
bargaining_round_record_refs
empirical_assumption_snapshot_refs
moral_side_constraint_profile_refs
side_constraint_review_state
intrapersonal_self_offset_record_ref
self_offset_classification_state
anti_corruption_assessment_ref
anti_corruption_review_state
process_integrity_review_state
action_unit
performance_frequency
minimum_performance_threshold
partial_performance_policy
grace_or_cure_period_days
material_breach_definition
evidence_due_schedule
verification_burden_level
verification_burden_policy_ref
invasive_evidence_prohibited_bool
final_match_lock_required_bool
matched_trade_lock_proposal_refs
no_trade_baseline
baseline_good_faith_attestation
baseline_review_state
baseline_confidence_level
why_this_is_additional
additionality_review_state
counterfactual_risk_note
counterfactual_risk_level
offer_expires_at
stale_offer_state
noncompensable_blocker_review_state
privacy_preserving_verification_attestation_refs
duration_or_review_period
max_obligation_duration
exit_pause_expiry_rule
reciprocal_release_rule
withdrawal_before_lock_allowed
verification_method
evidence_standard
challenge_window
neutral_review_required_if_counterparty_benefits_from_rejection
public_description
externality_review_prompt
nonparticipant_externality_review_prompt
legal_regulatory_domain
user_jurisdiction_bucket
counterparty_jurisdiction_bucket
```

Use factor-code explanations and compatibility bands only. Never generate a hidden moral score. The current site’s worked examples already separate participant-stated importance from platform moral ranking and require evidence, baseline confidence, and externality review. For pledge swaps, do not present verification as proof of counterfactual additionality; evidence can show that an action happened, while the no-trade baseline and additionality claim remain separately reviewable and uncertain.

Treat pledge swaps as the highest-counterfactual-risk track. Pledge-swap pilots should be template-bounded: off-template action descriptions, compensation terms, evidence duties, performance-bond terms, or side agreements remain draft/manual-review until the parameter policy and review-capacity policy explicitly admit the case. Any match candidate that becomes reliance-bearing must reference a frozen `matching_clearing_run` and must not be created by ad hoc operator judgment or database-order matching. Baseline integrity review is required before reliance-bearing use: a new or escalated harmful baseline created for bargaining remains preview-only or rejected-threat/externality. The evidence standard must be chosen before lock and mapped to claim types; post-hoc evidence reinterpretation must not silently convert factual action evidence into baseline or additionality evidence. The locked proposal must also specify what counts as performance, partial performance, material breach, cure, and release; otherwise the pledge swap remains a non-reliance-bearing draft. If performance is sequential or ongoing, duties must be synchronized through a `pledge_swap_performance_schedule`; the platform must not induce one participant to begin irreversible performance while the counterparty is unconfirmed, unauthorized, ineligible, or outside the atomic settlement group. The default launch posture should be template, preview, and manual review only. Do not auto-clear lifestyle, political, or diffuse behavior-change promises merely because factual evidence is available; require a credible additionality story, a baseline-confidence decision, a bounded review period, and neutral review when the counterparty benefits from rejection. If baseline confidence is low, the pledge swap remains preview-only unless a neutral reviewer explicitly approves a narrow manual pilot with user-facing uncertainty disclosure. Any pledge swap touching employment, education, medical, immigration, political/electoral, financial, or other legally sensitive domains must remain disabled unless jurisdictional review explicitly approves the exact flow.

Ongoing pledge swaps must not create indefinite or one-sided obligations. The preview must state the maximum obligation duration, the action unit, performance frequency or deadline, minimum performance threshold, partial-performance rule, grace/cure rule, material-breach definition, reciprocal release rule, and what happens to future obligations if one party exits, pauses, expires, or materially breaches the agreement. Exiting under the agreed rule releases counterparties from future obligations but does not erase already-due evidence, challenge windows, or dispute records. If one participant materially breaches or misses a checkpoint, the default consequence is reciprocal suspension or release of future obligations under the frozen schedule, not public shaming, moral-score reduction, or unilateral expansion of the other participant's duties.

For pledge swaps, the participant-facing term sheet is the canonical object of confirmation. The final lock screen must summarize the action unit, maximum obligation duration, evidence schedule, privacy disclosures, counterparty-disclosure stage, compensation or bond terms, residual obligations, and reciprocal release in plain language; a hidden internal terms snapshot is not sufficient.

For pledge swaps, counterparty disclosure should remain staged even in direct-pair or invite-only mode. A known counterparty can be identified only to the extent needed for the invited preview and final confirmation; public surfaces and unmatched previews remain redacted, and exact caps or private surplus estimates are never disclosed.

For pledge swaps, AI-assisted preference elicitation may help draft action units, side constraints, and fallback rules, but the participant must edit and confirm the structured terms. AI-generated negotiation moves, inferred willingness to pay, or auto-accepted counteroffers remain forbidden.

For pledge swaps, externality review must not be limited to the two parties' preferences. If a promised action could materially affect nonparticipants, reviewers must record a nonparticipant-externality decision before lock; participant surplus confirmation does not authorize harm to outsiders.

For pledge swaps, resource compatibility must be checked before lock. A trade involving mutually exclusive actions, incompatible duties, incompatible timing, or contested control over the same resource remains preview/manual-review only until the parties and reviewer agree that the frozen action units can jointly be performed without destroying the asserted gains from trade.

For pledge swaps, verification must be proportionate to the obligation. A receipt, public attestation, calendar log, bounded third-party confirmation, or periodic self-report may be sufficient for many low-stakes pledges. The platform must not turn pledge swaps into surveillance contracts; privacy-invasive evidence requirements require explicit reviewer approval, user-facing disclosure, and a less-intrusive-alternative check.

For sensitive pledge-swap evidence, use privacy-preserving verification where possible. A neutral verifier may inspect private evidence and issue a claim-typed attestation, but counterparties should normally receive only the attested claim, scope, uncertainty, and challenge route. If the only feasible evidence plan requires broad raw-data disclosure, the pledge swap remains preview/manual-review only.

Pledge-swap offers must have validity windows. If a match candidate arrives after the offer, baseline, empirical assumptions, evidence burden, jurisdiction, payment method, compensation terms, or side-constraint profile has gone stale, the candidate cannot become reliance-bearing until the participant renews the offer against a fresh preview.

For compensated pledge swaps, the compensation itself must be part of the frozen bargain rather than an off-platform side payment. The preview must show who pays whom, how much, when payment is authorized or released, whether taxes/reporting or labor/employment review is blocking, whether ordinary-service/procurement review is blocking, and whether vulnerability/undue-inducement review is non-blocking. Compensation may make a trade mixed moral trade, but it must not be used to pressure participants into high-stakes or personally harmful actions or to relabel ordinary procurement as moral trade.

For pledge swaps with an optional performance bond, the bond must be previewed as a separate factual-trust mechanism, not compensation and not an impact claim. The preview must show the bond poster, amount, currency, authorization/capture mode, return condition, forfeiture condition, forfeiture destination, evidence due date, challenge window, refund/cancellation behavior, and whether neutral review is required before forfeiture. Counterparty-benefiting forfeiture should be disfavored and must not let the counterparty be the final judge of evidence.

For negative or abstention-based pledge swaps, the promised non-action must have a bounded scope and substitution policy. The system should ask whether close substitutes, affiliates, alternate accounts, or delayed performance would defeat the point of the trade, and it should disclose the confidence level that the negative commitment can be verified without invasive monitoring.

For irreversible or high-stakes pledged actions, the action-reversibility assessment controls the launch mode. Reversible low-stakes actions may be manually piloted; effectively irreversible or legally/personal high-stakes actions remain disabled or preview-only unless the exact flow passes legal, vulnerability, nonparticipant-externality, and neutral-review gates.

For actions that may affect duties owed to others, the third-party-obligation assessment controls the launch mode. A participant cannot trade away obligations to an employer, client, patient, student, family member, court, donor, or counterparty outside the platform. If the requested act or abstention plausibly conflicts with a third-party duty or right, the agreement remains preview/manual-review only until the conflict is resolved or the exact flow is approved as non-blocking.

For actions claimed on behalf of another person or entity, the representative-authority assessment controls the launch mode. A user may promise their own action, abstention, money, evidence, or disclosure; they may not bind an employer, nonprofit, campaign, school, family member, donor-advised fund, fiscal host, client, patient, or informal group unless the authority is verified for the exact scope shown in the proposal. If authority is ambiguous or disputed, the proposal remains personal-only, preview-only, or blocked.

For negative commitments that may affect complaints, investigations, testimony, reviews, safety reports, abuse reports, regulatory reports, journalistic disclosures, or other truthful reporting, the reporting-integrity assessment controls the launch mode. The platform must not enable payments, donations, performance bonds, reciprocal favors, or moral concessions in exchange for silence, false statements, complaint withdrawal, noncooperation, or suppression of safety-relevant information. If such a risk is possible, the agreement remains preview/manual-review only until reporting-integrity, legal, anti-threat, and externality review are non-blocking.

For actions, abstentions, recipient choices, compensation terms, or platform interactions that may affect employment, education, housing, public accommodations, healthcare, financial services, charitable service delivery, platform access, voting/civic participation, or similar protected domains, the civil-rights/discrimination assessment controls the launch mode. The platform must not enable payments, donations, performance bonds, reciprocal favors, or moral concessions in exchange for protected-trait discrimination, unlawful exclusion, retaliation, harassment, segregation, or protected-activity suppression. If such a risk is possible, the agreement remains preview/manual-review only until civil-rights, legal, anti-threat, reporting-integrity, and externality review are non-blocking.

For actions, abstentions, compensation terms, performance bonds, evidence demands, private disclosures, or challenge terms involving dependency, acute need, authority relationships, or other asymmetric leverage, the participant-autonomy/coercion-undue-influence assessment controls the launch mode. The platform must not enable payments, donations, performance bonds, reciprocal favors, or moral concessions that exploit financial distress, housing or immigration dependence, employment or school authority, medical/care dependence, addiction, cognitive impairment, acute crisis, family pressure, or platform power. If such a risk is possible, the agreement remains preview/manual-review only until participant-autonomy, legal, anti-threat, user-safety, and externality review are non-blocking.

For actions, abstentions, evidence terms, compensation terms, performance bonds, side agreements, or challenge terms that may involve private data, confidential records, credentials, private communications, location/device data, nonconsensual intimate or sensitive content, trade secrets, or third-party personal information, the confidentiality/privacy-rights assessment controls the launch mode. The platform must not enable payments, donations, performance bonds, reciprocal favors, or moral concessions in exchange for doxxing, credential-sharing, confidential-record disclosure, privacy-rights waiver by someone without authority, or blackmail-like exposure. If such a risk is possible, the agreement remains preview/manual-review only until confidentiality/privacy-rights, legal, representative-authority, reporting-integrity, user-safety, and data-security review are non-blocking.

For evidence that could determine performance, breach, abstention, bond return/forfeiture, payout release, baseline confidence, additionality, or challenge outcomes, the evidence-authenticity/synthetic-media assessment controls whether the evidence can be accepted. The platform must not let fabricated screenshots, AI-generated media, edited videos, recycled receipts, unverifiable chat logs, manipulated location/device logs, or unauthenticated exported data create obligations, trigger forfeiture, release funds, or clear disputes. If authenticity is uncertain, the evidence may remain reviewer-only support, but it must not satisfy the claim until authenticity, source-provenance, replay/reuse, account-security, and data-security checks are non-blocking.

For payments, compensation, refunds, performance bonds, donation receipts, or side agreements that could disguise fund source or destination, the financial-crime/fraud assessment controls the launch mode. The platform must not enable money laundering, sanctions evasion, terrorist or extremist financing, stolen payment methods, fake donation receipts, card testing, refund/chargeback abuse, circular self-dealing, or private compensation disguised as charity. If such a risk is possible, the agreement remains preview/manual-review only until financial-crime/fraud, sanctions/payment-rail, recipient/destination, legal, financial-reconciliation, and incident-response checks are non-blocking.

For actions, abstentions, evidence terms, compensation terms, performance bonds, recipient choices, or side agreements that could involve regulated goods or hazardous physical-world activity, the regulated-goods/hazardous-activity assessment controls the launch mode. The platform must not enable moral concessions in exchange for weapons acquisition or transfer, ammunition or explosive handling, controlled-substance activity, hazardous-chemical handling, unsafe medical or bodily interventions, risky animal handling, biosecurity-relevant material access, cyber-physical sabotage, or comparable dangerous conduct. If such a risk is possible, the agreement remains preview/manual-review only until regulated-goods/hazardous-activity, legal, participant-autonomy, nonparticipant-externality, content-moderation, and anti-threat review are non-blocking.

For actions, abstentions, evidence terms, compensation terms, performance bonds, recipient choices, invite/contact behavior, or side agreements that could involve cyber abuse or digital-system manipulation, the cyber-abuse/digital-systems-integrity assessment controls the launch mode. The platform must not enable moral concessions in exchange for unauthorized access, credential theft, phishing, malware or exploit use, denial-of-service, bot or fake-account activity, spam, unauthorized scraping or data exfiltration, review/rating manipulation, platform-integrity manipulation, adversarial prompt/model attacks against third-party systems, or vulnerability disclosure/suppression outside an authorized defensive process. If such a risk is possible, the agreement remains preview/manual-review only until cyber-abuse/digital-systems-integrity, legal, confidentiality/privacy-rights, content-moderation, user-safety, and anti-threat review are non-blocking.

For non-public-goods tier scope and counterfactual trust, pledge swaps default to closed-counterparty preview. A pledge swap may become reliance-bearing only when its tier policy permits the release stage, its counterfactual-trust class is non-blocking, and the matched proposal identifies whether the counterparty is known, invite-only, represented by a verified agent, or open-market. Open-market pledge swaps and compensated moral-action agreements remain disabled unless the release gate has specific evidence that unknown-counterparty matching does not create unacceptable baseline manufacturing, holdup, privacy, or user-safety risk.

For control-pack implementation, the pledge-swap flow should resolve applicable controls through the subject's control-applicability matrix rather than trusting scattered per-table flags. If the same blocker appears with contradictory states across the offer, lock proposal, evidence record, and payment event, the agreement remains preview/manual-review only until a superseding control-result bundle resolves the conflict.

For exchange-rate and side-payment terms, the pledge-swap preview may show a participant their own local tradeoff, but not a public price of the requested action, cause, or moral concession. Any counterparty-facing explanation should use coarse compatibility bands and final ratio-bounds status, not another participant's exact willingness to pay or side-constraint threshold.

For option-set and Pareto-comparison review, the pledge-swap preview should show the no-trade baseline, the proposed swap, obvious no-money or partial-performance alternatives, obvious side-payment or compensation variants, and any reviewed feasible option that all affected participants have already marked as jointly dominating the current proposal. The platform should not force a welfare calculation, but it should prevent an obviously dominated proposal from being locked merely because it was the first match found.

For preference-comparability and noncardinal review, the pledge-swap preview should allow each participant to mark options as acceptable, unacceptable, preferred, incomparable, lexically blocked, or insufficiently comparable without forcing a numeric moral score. If the current clearing path depends on a Pareto comparison that is unavailable under a participant's own comparability state, the swap remains preview/manual-review only.

For trade-burden accounting, the pledge-swap preview should show the non-monetary burden profile before participant surplus confirmation: expected time, evidence work, privacy disclosure, check-in frequency, challenge/dispute risk, performance burden, and residual obligations. A participant's confirmation must be treated as stale if the burden profile materially changes.

For moral-difference attestation, the pledge-swap preview should ask for a coarse reason why the proposed trade is moral trade rather than ordinary cooperation, procurement, or self-offset: different moral views, different priorities, indexical duties, different empirical beliefs, or moral/prudential asymmetry. The attestation should be private/reviewer-scoped by default and must not become a public ideology label.

For bargaining protocol and anti-holdup review, the pledge-swap launch mode is controlled by the frozen bargaining protocol. Counteroffers may be useful, but they must not expose private caps, create artificial urgency, or use one participant's already-submitted evidence, identity, or reliance-bearing disclosure to extract concessions. Material counteroffers create a new bargaining-round record and renewed confirmations.

For empirical-assumption snapshots, the pledge-swap launch mode should distinguish action evidence from beliefs about whether the action would have happened anyway, whether the action is causally efficacious, and whether substitutes would defeat the trade. Material empirical assumptions are frozen at preview/lock and become stale if challenged or superseded.

For participant side constraints and agent-relative limits, the pledge-swap launch mode should allow users to mark certain actions, intentions, disclosures, or delegations as nontradable by their own view. A participant can change such a limit, but only through explicit renewed confirmation and any configured cooling-off or manual review; the platform must not infer waiver from compensation or from another party's moral valuation.

For intrapersonal/self-offset flows, the launch mode should classify personal offsets and moral-bookkeeping templates separately from interpersonal moral trade. These flows may remain useful drafts or evidence records, but they do not become completed Toby-Ord-style moral trades without a distinct counterparty or represented moral perspective.

For agreement rights, obligations, performance-bond claims, refund claims, payout expectations, evidence claims, or completed-agreement records that could be transferred, sold, tokenized, pledged, or assigned, the agreement-transferability/non-assignment assessment controls the launch mode. The platform must not create transferable moral-trade credits, tradable offset certificates, resaleable pledge obligations, third-party-purchased refund rights, or tokenized performance-bond claims. If such a risk is possible, the agreement remains preview/manual-review only until transferability, legal, renewed-confirmation, financial-crime/fraud, and anti-speculation review are non-blocking; the default is that moral-trade agreements are personal, non-transferable, and non-assignable.

For actions that may affect entrusted public, professional, fiduciary, or institutional decisions, the anti-corruption and process-integrity assessment controls the launch mode. The platform must not enable payments, donations, reciprocal favors, or abstentions in exchange for votes, testimony, official acts, procurement choices, admissions or grading decisions, professional referrals, platform moderation decisions, fiduciary decisions, or comparable gatekeeping acts. If such a risk is possible, the agreement remains preview/manual-review only until anti-corruption, legal, and process-integrity review are non-blocking.

If a pledge-swap participant changes their no-trade baseline, evidence standard, review period, exit rule, requested counterparty action, compensation, performance schedule, remedy, or privacy disclosure after a preview or match candidate exists, mark the existing preview stale and require an `agreement_amendment_record` or superseding matched-trade proposal, a new reviewer decision, and renewed participant confirmation. This prevents late baseline edits from becoming disguised threats or from invalidating the participant-surplus comparison.

---

## Matching and discovery

Upgrade marketplace discovery without violating privacy:

- Public browsing shows live offers, worked examples, and demo pools as separate tabs.
- Batch clearing and broad match previews must reference a frozen `matching_clearing_run`; match explanations may cite only coarse compatibility bands and review-relevant blockers, and any manual override must be explicitly blocked or recorded as a privileged/reviewer-approved action.
- Discovery, browsing, search facets, preview counts, invite links, pagination, and empty-state messages must apply the frozen anti-enumeration policy, create `discovery_access_event` records where configured, and return bucketed or generic results when exact counts or rare filters could expose hidden offers or sensitive clusters.
- Search facets must not expose zero-count sensitive private facets.
- Broad previews may include cause areas, trade mode, verification preference, and coarse constraints.
- Exact wishes, contact details, sensitive constraints, protected traits, ideology/psychology inferences, and raw notes must remain hidden.
- A match suggestion is not an introduction, and a batch-clearing result is not a locked deal until it becomes a frozen matched-trade lock proposal with final confirmations from all affected participants.
- Discovery and batch clearing must show whether an offer is already reserved, locked, expired, or unavailable at the coarse status level; they must not reveal private counterparty identity or exact caps, but they also must not let users rely on already-used baseline commitments.
- Do not expose maximum willingness to pay, private surplus estimates, exact caps, fallback hierarchy, or unilateral bargaining ranges to potential counterparties or public surfaces. The user must still see their own maximum exposure, caps, fallback rule, and lock/cancel window before confirmation; reviewers may access necessary private fields only through audited review tools.
- Match explanations should show only coarse compatibility bands plus review-relevant blockers: no-trade baseline fit, evidence feasibility, externality status, anti-threat status, and privacy status.
- Introductions require both-party consent plus operator review.

Use broad previews, deterministic matching bands, staged disclosure, redacted match reasons, anti-enumeration budgets, and mandatory human review before disclosure/contact/reliance as non-public-goods marketplace safety constraints. Do not import background-networking behavior or autonomous outreach into this brief.

---

## Payment implementation

For v1, do **not** implement on-chain smart contracts. Do **not** use the word “escrow” in public claims unless legal review explicitly approves it.

Use:

```text
saved payment method
identity eligibility check
just-in-time authorization near final lock
capture only after hard gates pass
release/cancel authorization if gates fail
manual evidence fallback when provider integration is unavailable
```

Before any capture, show the user a frozen preview of the exact maximum exposure, recipients/destinations or matched counterparties, fallback/cancellation rule, lock time, cancellation window, settlement currency, any FX conversion or spread, legal/jurisdiction availability status, and any platform/payment/evaluator fee. For donation offsets and pledge swaps, also require approved-template/parameter conformance, non-overflow review-capacity admission, any non-public-goods subsidy schedule where applicable, a non-stale matched-trade lock proposal, participant-facing term-sheet records whose hashes match the frozen proposal, final confirmation from each affected participant for the exact matched terms, direct-pair clearing record where applicable, frozen cause-bucket taxonomy assignments, non-blocking resource-compatibility assessment, net-offset accounting for donation-offset or abstention claims, non-conflicting commitment reservations, non-blocking counterparty-blinding/staged-disclosure records, non-blocking recipient-acceptance/adverse-association records where relevant, non-blocking AI-preference-elicitation boundary records where AI assistance was used, non-blocking post-clear-audit eligibility, non-blocking baseline-integrity assessment, any required negative-commitment scope, donor-of-record/tax-receipt handling, compensation terms, ordinary-service/procurement classification, action-reversibility assessment, third-party-obligation assessment, representative-authority assessment, reporting-integrity assessment, civil-rights/discrimination assessment, participant-autonomy/coercion-undue-influence assessment, confidentiality/privacy-rights assessment, evidence-authenticity/synthetic-media assessment for any evidence-dependent gate, financial-crime/fraud/source-of-funds assessment for any money-movement, receipt, refund, compensation, or bond-related gate, agreement-transferability/non-assignment assessment for any rights, obligations, refund, payout, bond, evidence, or credit-transfer risk, regulated-goods/hazardous-activity assessment for any hazardous or regulated action, recipient choice, evidence method, payment term, compensation term, performance bond, or side agreement, cyber-abuse/digital-systems-integrity assessment for any unauthorized digital-system access, manipulation, scraping, botting, spam, exploit, malware, phishing, or platform-integrity risk, non-public-goods tier policy, counterfactual-trust assessment, closed-counterparty/open-market-matching state, applicable risk-control-pack/control-result bundle, private exchange-rate quote records where ratios or side payments are material, market-simulation and pilot-exit criteria status for the track, option-set/Pareto-comparison review, preference-comparability/incomparability review, trade-burden accounting review, moral-difference-attestation review, bargaining-protocol/anti-holdup review, empirical-assumption snapshot review, noncompensable-safety-blocker status, offer-validity/staleness status, privacy-preserving verification-attestation status, side-constraint/agent-relative-limit review, intrapersonal/self-offset classification review, anti-corruption/process-integrity assessment, any required pledge-performance-bond policy and record, any applicable agreement-amendment record, and a non-blocking atomic settlement group. Require an explicit confirmation for each final lock, stored as a `participant_confirmation_record` whose terms snapshot, policy snapshot bundle, maximum exposure, notice state, and participant hash match the locked agreement. For configured real-money or reliance-bearing confirmations, also require a non-blocking `consent_quality_record` showing that required disclosures were shown, no forbidden default or pressure pattern was used, and any required comprehension check passed or was manually reviewed. A saved payment method is not standing permission to route money into materially changed destinations, counterparties, or trade terms. A successful authorization by one participant is also not permission to capture, disclose, or trigger performance by that participant unless the matched group is atomically locked or the frozen policy explicitly allows a harmless no-money preview. Real-money mode is disabled unless the relevant participant eligibility, legal capacity, sanctions/payment-rail, recipient, payment-rail, and trade-domain jurisdiction checks are non-blocking.

Real-money authorization and capture are also disabled unless the current `release_stage` permits that track and the relevant `release_gate` is approved. A successful dry-run calculation is not enough by itself; the gate must also include route-health, privacy, payment replay, evidence-challenge, reviewer-conflict, and emergency-pause checks. Donation-offset and pledge-swap captures remain disabled until their specific pilot gates are approved.

Separate gross contribution, fees, matching funds, and recipient payout in every payment preview and ledger. Fees may be charged only under a frozen fee policy; they must never inflate public payout totals, participant contribution totals, or moral-trade volume.
Separate payout/transfer records, public receipt cards, and public impact claims. A receipt card may summarize verified contribution and transfer facts, but a receipt, capture, payout release, or matched contribution must not be presented as an outcome, cost-effectiveness, or moral-impact claim unless a reviewed `impact_claim_record` with a frozen methodology policy authorizes that presentation. Receipt-card wording such as `additional`, `unlocked`, or `matched` must be generated from the frozen claim records and suppressed or replaced with neutral wording when additionality, net-offset, or baseline review is inconclusive.

For agreements with `milestone_schedule_json` or `payout_milestone_policy_ref`, capture and payout release are separate states. Create `payout_milestone` records for each staged release, with amount, destination, required claim-typed evidence, challenge window, reviewer decision, and release payment event. Captured funds may be released only when the relevant milestone is `releasable` under the frozen payout plan and claim-typed evidence standard, and only to the milestone's verified payment destination. Immediate release is allowed only for verified direct-donation flows whose recipient and destination checks are complete and whose frozen policy marks the transfer as single-stage.

Before authorization or capture, enforce pilot risk limits from the frozen policy: participant exposure, agreement payout, total track capture, and emergency-pause state. If a cap would be exceeded or the track is paused, block new authorizations/captures and route the affected agreement to manual review or cancellation according to the frozen policy.

Before any real-money authorization, capture, performance-bond posting, performance-bond return, performance-bond forfeiture, refund, cancellation, or payout release, resolve the frozen refund/cancellation policy, pledge-performance-bond policy where applicable, financial-crime/fraud policy where applicable, agreement-transferability/non-assignment policy where applicable, regulated-goods/hazardous-activity policy where applicable, cyber-abuse/digital-systems-integrity policy where applicable, non-public-goods tier policy where applicable, counterfactual-trust policy where applicable, risk-control-pack/control-applicability policy where applicable, private-exchange-rate quote policy where applicable, noncompensable-blocker policy where applicable, offer-validity policy where applicable, batch-clearing-objective policy where applicable, privacy-preserving verification policy where applicable, pilot-exit criteria where applicable, and privileged-action policy. Routine user-initiated cancellation may follow the frozen policy automatically; non-routine refunds, blocker overrides, emergency unpauses, manual captures, and manual payout releases require a `privileged_action_record` with the required approval state. If a capture cannot proceed to the previewed destination or milestone, apply the frozen refund/cancellation policy rather than retaining funds or routing them elsewhere by operator discretion. Suspected stolen payment methods, source-of-funds mismatches, circular routing, refund abuse, fabricated receipts, or prohibited financing create a blocking `financial_crime_fraud_assessment`. Suspected weapons, controlled-substance, hazardous-chemical, unsafe medical, biosecurity, cyber-physical, or other dangerous-activity facilitation creates a blocking `regulated_goods_hazardous_activity_assessment`. Suspected unauthorized access, malware, phishing, denial-of-service, botting, spam, unauthorized scraping, data exfiltration, platform-integrity manipulation, or exploit facilitation creates a blocking `cyber_abuse_digital_systems_integrity_assessment`; where severe or suspicious, either blocker also creates an `incident_response_record` before new money movement is allowed.


For suspected privacy leakage, unauthorized privileged action, provider compromise, erroneous capture/release, enumeration attack, or reconciliation failure, apply the frozen incident-response policy before taking new risk. The incident workflow should preserve evidence, pause the affected release stage, pilot, or agreement where required, issue user notice under the notification policy, and leave refunds/cancellations available under the frozen refund policy.


Before any real-money or reliance-bearing deployment, verify the deployment-release record, configuration snapshot, provider-account bindings, dependency lockfile hash, feature flags, policy-snapshot bundle, and environment-data-isolation state against the approved release gate. Before applying migrations or backfills, run the frozen schema-migration policy: dry-run, record-count checks, rollback or forward-fix plan, and audit-integrity verification must pass before production records are altered. Test-mode provider events, demo clearing outputs, seed templates, and sandbox identities must be marked and excluded from live money movement and live metrics unless a reviewed promotion path explicitly approves the relevant record.

Implement payment state transitions as idempotent, replay-safe operations:

```text
1. Generate an idempotency key for every authorization, capture, cancellation, refund, and payout-release attempt.
2. Store each provider webhook as a `payment_event` before applying it.
3. Authenticate the provider source, signature, provider account, endpoint, event type, and replay window under the frozen provider-source-authentication policy before the event can affect state.
4. Ignore duplicate provider events with the same provider event ID or idempotency key.
5. Apply a provider event only if the referenced terms snapshot and participant confirmation hash match the locked agreement.
6. If the provider event refers to a stale preview, changed terms, an already-terminal agreement, failed source authentication, an expired server-side deadline, or an impossible state transition, block it and route it to manual review.
7. Perform capture/release state changes inside a database transaction that also writes a `marketplace_state_event`.
```

This is an implementation guard, not an escrow claim. Its purpose is to prevent double-capture, stale-preview capture, webhook replay, and silent payment-state mutation.

The public site currently says the platform does not represent legal escrow and does not provide legal, tax, financial, or investment advice. Stripe webhook records can support provider-approved flows when real-money mode is configured, while provider data remains review evidence rather than a promise of custody or legal escrow. Implement accordingly.

---

## Review console

Add reviewer views for:

```text
release readiness
release-stage, feature-flag, dry-run, release-gate promotion status, release-gate requirement-result bundles, approved-template/parameter-conformance status, review-capacity queues, non-public-goods subsidy pools and schedules, release-gate evidence records, and first-class release-gate review decisions
policy snapshots, state-interpretation policy, privileged-action policy, refund/cancellation policy, provider-source-authentication policy, time-authority policy, choice-architecture policy, anti-enumeration policy, appeal policy, fee/FX/notification/data-retention policy review decisions, and mutable-policy-reference, unauthenticated-provider-event, client-clock, dark-pattern, enumeration, appeal-deadline, or unmapped-state blockers
matching-clearing runs, deterministic input bundles, manual matching override blockers, and clearing reproducibility checks
direct-pair clearing records, known/invite-linked counterparty checks, cause-bucket taxonomy versions, bucket-assignment disputes, resource-compatibility assessments, and net-offset accounting records
participant eligibility, legal capacity, sanctions/payment-rail state, human-uniqueness/Sybil state, and private identity-artifact handling
recipient registry entries, payment-destination records, side-agreement disclosures, privileged action records, participant confirmation records, consent-quality records, reviewer-quality audits, user-safety/contact records, abuse reports, content-moderation records, account-security events, backup-recovery checkpoints, deployment-release records, configuration snapshots, schema-migration runs, environment-data-isolation records, appeal cases, stale/expired confirmation blockers, and their reviewer decisions
user-facing status records, marketplace-intake triage records, participant term sheets, term-sheet hash matching, participant UI render snapshots, accessibility/copy review state, route-simplification policies and audit records, public-page screenshots for /offers/new?mode=offset, /offers, /donation-offsets, /pledge-swaps, /moral-trade, /how-it-works, /validation, and /paid-action-offers, minimal route-fallback copy, signed-out offset-builder preview, template-gallery/guided-builder/preview/final-lock/dashboard screenshots, live-vs-demo distinction, hidden factor-code/internal-enum checks, worked-example card simplification, advanced-filter collapse checks, plain-language blocker copy, task-card/single-primary-action checks, safe-template-default disclosure checks, next-action accuracy, appeal/correction-route visibility, behavioral micro-pledge low-stakes caps, evidence-ladder fit, unit-level settlement display, no-auto-renew checks, and privacy-safe explanation checks
matched-trade lock proposals, final confirmation status, counterparty-blinding/staged-disclosure records, recipient-acceptance/adverse-association records, AI-preference-elicitation boundary records, post-clear-audit records, baseline-integrity/manufacturing assessments, noncompensable-blocker assessments, offer-validity/staleness records, batch-clearing objective results, privacy-preserving verification attestations, agreement-amendment records, commitment-inventory reservations, double-counting blockers, atomic settlement groups, donation-offset clearing ratio bounds, donor-of-record/tax-receipt records, charitable-solicitation/commercial-co-venture blockers, negative-commitment scopes and substitution blockers, compensated moral-action terms, ordinary-service/procurement classification blockers, action-reversibility assessments, third-party-obligation assessments, representative-authority assessments, reporting-integrity/non-suppression assessments, civil-rights/discrimination assessments, participant-autonomy/coercion-undue-influence assessments, confidentiality/privacy-rights assessments, evidence-authenticity/synthetic-media assessments, financial-crime/fraud/source-of-funds assessments, agreement-transferability/non-assignment assessments, regulated-goods/hazardous-activity assessments, cyber-abuse/digital-systems-integrity assessments, non-public-goods tier-scope decisions, counterfactual-trust assessments, closed-counterparty/open-market-matching states, risk-control packs, control-applicability matrices, control requirement results, private exchange-rate quote records, market-simulation/red-team runs, pilot-exit criteria and scale decisions, option-set/Pareto-comparison records, preference-comparability/incomparability states, trade-burden accounting records, moral-difference attestation records, bargaining-protocol and counteroffer/holdup records, empirical-assumption snapshots, side-constraint/agent-relative-limit profiles, intrapersonal/self-offset classification records, anti-corruption/process-integrity assessments, behavioral-micro-pledge policies, micro-pledge sequence records, micro-pledge window records, pre-performance lock confirmations, retroactive-claim blockers, no-meat/food-abstention duration defaults, evidence-ladder defaults, per-unit amount bands, no-auto-rollover sequence blockers, longer-duration manual-review blockers, pledge-swap performance schedules, pledge-swap performance-term completeness, verification-burden/privacy checks, material-breach/cure rules, public-breach-disclosure blockers, and non-unilateral-substitution blockers
recipient/payment-destination proof, anti-impersonation status, verified payment destination, pledge performance bond posting/return/forfeiture status, and recipient registry status
non-public-goods subsidy source, restricted-use, refund/carry-forward, and conflict-of-interest state
pilot risk limits, exposure-cap blockers, and emergency-pause state
platform fee policy, fee disclosure, currency/FX treatment, provider settlement reports, financial reconciliation runs, fee/exposure ledger consistency, and reconciliation variance blockers
incident response records, containment state, user-notice state, emergency-pause links, corrective-action status, data-security/key-management state, audit-integrity checkpoints, and broken-chain blockers
experiment-policy enrollment and hidden-experiment blockers
policy-version snapshot, policy-reference resolution, fallback/cancellation policy, residual-obligation handling, and non-retroactivity blockers
participant eligibility and sybil flags
affiliate/common-control disclosures and collusive-volume blockers
baseline-confidence blockers and uncertainty disclosures
jurisdiction/legal-review blockers
AI-assisted-output attempts that require structured confirmation
reviewer conflict-of-interest and recusal state
neutral reviewer / panel assignment
anti-threat blockers
review notes
third-party/nonparticipant externality blockers
challenge windows, challenge deadlines, required notices, delivery state, and default outcomes
dispute cases and neutral-review escalation state
duplicate proof detection
claim-typed evidence records, evidence standards, and challenge-window state
payout milestone records, release state, and required evidence claims
matching/release calculation bundle
manual override with reason code
payment/provider event replay, failed-source-authentication, server-deadline, client-clock, and stale-snapshot blockers
payout milestone evidence and staged-release blockers
state-transition audit trail
public-metric release suppression and small-cell review
data-retention, export/delete, purpose-specific consent audit, privacy grants, privacy access logs, anti-enumeration access events, and appeal/correction outcomes
impact-claim methodology, evidence, uncertainty disclosure, and transfer-vs-impact separation
public receipt card anti-gamification, net-personal-contribution attribution, reimbursement/subsidy disclosure, no-publicity-as-trade-term, verification URL, static-image status disclaimer, correction/revocation status, direct-donation-parity non-preference, sensitive-action receipt redaction, publication-pressure reports, no profile/search/matching boost, and no social-metric display checks
payout milestone status
```

Do not let reviewers silently edit final clearing results, payment states, evidence states, or agreement statuses. Any change must create a traceable `review_decision` or `marketplace_state_event` record and update the calculation hash or produce a new calculation version where relevant. Final approval for a disputed, challenge-bearing, or counterparty-benefiting rejection decision must be made by a reviewer or panel with a recorded non-conflict state. Reviewer decisions and state-transition events must be immutable except by superseding records, so the audit trail can reconstruct why a trade cleared, stalled, charged, released, or was blocked.

---

## Measurement

Extend the existing privacy-safe measurement plan. Current measurement rules prohibit ranking moral views, exposing exact wishes, optimizing for engagement feeds, storing raw private content, or storing raw search/location-bearing detail. Keep that posture.

Publish marketplace metrics only after applying the applicable public-metric-release policy. Suppress, bucket, or delay any breakdown whose cell count is below the configured threshold or whose combination of filters could reveal a participant, rare moral cluster, jurisdiction, exact wish, or sensitive constraint.

Add non-public-goods marketplace-specific aggregate KPIs:

```text
live_offer_count
reviewable_offer_count
completed_agreement_count
donation_offset_preview_count
donation_offset_lock_proposal_count
pledge_swap_preview_count
pledge_swap_lock_proposal_count
behavioral_micro_pledge_preview_count
food_abstention_micro_pledge_share
unit_specific_baseline_failure_rate
micro_pledge_cumulative_cap_escalation_rate
food_abstention_health_safety_manual_review_rate
long_duration_pledge_manual_review_rate
micro_pledge_sequence_extension_rate
micro_pledge_preperformance_lock_success_rate
retroactive_micro_pledge_claim_block_count
evidence_burden_escalation_block_count
behavioral_micro_pledge_evidence_ladder_override_rate
food_abstention_amount_band_manual_review_rate
micro_pledge_auto_rollover_block_count
micro_pledge_per_unit_settlement_share
micro_pledge_all_or_nothing_exception_rate
micro_pledge_cap_violation_block_count
closed_counterparty_pledge_swap_preview_count
intake_triage_route_count_by_safe_category
intake_triage_correction_rate
ordinary_donation_or_procurement_routed_out_count
participant_ui_snapshot_mismatch_block_count
final_confirmation_comprehension_failure_rate
accessibility_or_locale_blocker_count
plain_language_copy_omission_block_count
internal_jargon_primary_copy_block_count
participant_explanation_detail_drawer_open_rate
plain_language_next_action_correction_rate
task_card_single_primary_action_violation_block_count
safe_template_default_hidden_material_fact_block_count
participant_task_card_next_action_success_rate
participant_term_map_inconsistency_block_count
public_route_simplification_audit_pass_rate
offers_new_offset_signed_out_dead_end_block_count
route_fallback_diagnostics_primary_copy_block_count
public_page_factor_code_primary_copy_block_count
public_page_internal_enum_primary_copy_block_count
public_page_impact_score_default_surface_block_count
offers_advanced_filter_default_expanded_block_count
worked_example_card_overload_block_count
worked_example_long_duration_default_block_count
micro_pledge_default_example_share
donation_offset_plain_label_map_violation_block_count
validation_page_reviewer_details_default_open_block_count
public_page_multiple_primary_cta_block_count
reviewer_overturns
reviewer_quality_audit_fail_rate
inter_reviewer_disagreement_rate
user_safety_report_open_count
contact_consent_violation_block_count
blocked_user_contact_attempt_count
content_moderation_block_count
content_moderation_false_positive_appeal_rate
account_security_step_up_failure_count
account_takeover_risk_block_count
backup_recovery_checkpoint_missing_block_count
backup_restore_test_failure_count
deployment_config_drift_block_count
unapproved_build_deployment_block_count
schema_migration_dry_run_failure_count
financial_reconciliation_failure_count
incident_response_open_count
incident_time_to_containment_hours
privacy_or_payment_incident_notice_failure_count
data_security_missing_encryption_block_count
stale_key_version_block_count
audit_integrity_checkpoint_missing_block_count
audit_integrity_broken_chain_block_count
release_gate_evidence_missing_block_count
release_gate_requirement_missing_block_count
release_gate_requirement_waiver_count
recipient_registry_record_block_count
payment_destination_record_block_count
side_agreement_disclosure_record_block_count
fx_policy_missing_block_count
notification_policy_failure_pause_count
platform_fee_disclosure_error_count
payout_milestone_block_rate
data_training_consent_violation_target_zero
data_consent_revocation_count
raw_private_data_retention_violation_target_zero
noncompensable_blocker_compensation_attempt_count
offer_staleness_block_count
offer_renewal_completion_rate
batch_clearing_objective_reproducibility_failure_count
batch_clearing_unmatched_residual_rate
privacy_preserving_verification_attestation_count
raw_sensitive_evidence_disclosure_block_count
public_receipt_card_preview_count
public_receipt_card_publication_count
public_receipt_card_revocation_count
public_receipt_causal_wording_block_count
direct_donation_parity_mode_use_count
public_receipt_personal_contribution_display_rate
public_receipt_net_personal_contribution_display_rate
public_receipt_reimbursement_or_subsidy_disclosure_block_count
public_receipt_trade_unlocked_contribution_display_rate
public_receipt_total_transfer_display_rate
public_receipt_raw_evidence_disclosure_block_count
public_receipt_recipient_association_block_count
public_receipt_moral_score_language_block_count
public_receipt_social_metric_display_block_count
public_receipt_profile_boost_or_sort_block_count
public_receipt_publication_as_trade_term_block_count
public_receipt_static_image_stale_status_view_count
public_receipt_verification_url_missing_block_count
public_receipt_claim_correction_rate
public_receipt_sensitive_action_redaction_count
public_receipt_exact_action_publication_confirmation_count
public_receipt_publication_pressure_report_count
direct_donation_parity_non_preference_block_count
private_surplus_leakage_incidents_target_zero
```

Governed experiments may test non-public-goods template wording, plain-language copy variants, review-queue presentation, privacy-safe blocker explanations, and opt-in reminder timing. No experiment may alter payment capture, payout release, evidence standards, public classification, or participant risk without explicit user-facing disclosure and renewed confirmation where relevant. Do not run experiments over the external CRECM module from this brief; use `moralpublicgoods102.md` for that track.

---

## Acceptance criteria

Ship the non-public-goods marketplace only when all are true:

1. Public marketplace separates live offers, worked examples, demo pools, non-public-goods templates, and the external CRECM module link.
2. Donation-offset and pledge-swap previews are structured, template-bounded, and non-reliance-bearing until the appropriate release gate passes.
3. No public route exposes exact wishes, contact details, private notes, raw evidence, private counterparty data, exact caps, private surplus estimates, or maximum willingness to pay.
4. No autonomous outreach is introduced.
5. Public copy does not claim legal escrow, custody, tax treatment, investment treatment, or objective moral endorsement.
6. Existing validator/health contracts still pass or blockers are explicitly listed.
7. API contract and performance blockers are not worsened; ideally reduce current route/API blocker counts.
8. Measurement emits only approved aggregate/bucketed events.
9. Empty-market states are handled by reviewed non-public-goods templates and clearly separated worked examples; demo data is never mixed with live offers.
10. Every payment capture requires a frozen user-facing preview and explicit final-lock confirmation.
11. Every cleared non-public-goods trade agreement records a no-trade baseline, baseline good-faith attestation, participant surplus confirmation, trade classification, evidence plan, anti-threat state, externality-review state, and nonparticipant-externality-review state.
12. Participant confirmations are first-class records tied to the frozen baseline, terms snapshot, policy snapshot bundle, maximum exposure, notice state, and confirmation scope; expired, revoked, superseded, missing, or stale confirmations cannot authorize routing, clearing, capture, payout release, or material-term changes.
13. Same-view co-funding and ordinary donation matching are not counted as moral trade unless differences in moral views, moral priorities, or indexical obligations are necessary to explain the exchange.
14. Pledge swaps with high counterfactual risk are not auto-cleared and cannot rely on factual evidence alone as proof of additionality.
15. No-trade baselines, material offer terms, and participant confirmations are versioned and hash-backed; material changes after preview/lock re-open review and require renewed confirmation.
16. Donation offsets either support explicit partial clearing with residual no-trade action shown to the user, or explicitly disable partial clearing; unmatched residual amounts are never silently captured.
17. Baseline review and additionality review have explicit states in the data model and must be non-blocking before donation offsets or pledge swaps clear.
18. Participants cannot waive serious third-party harms: nonparticipant-externality blockers and recipient/destination verification blockers prevent clearing even when all direct participants confirm surplus.
19. Ongoing pledge swaps have bounded obligation duration, reciprocal release rules, and withdrawal-before-lock behavior visible in the preview.
20. Reviewer conflict-of-interest checks and neutral reviewer/panel assignment are enforced for disputed or counterparty-benefiting rejection decisions.
21. Reviewer decisions are append-only or superseded by later decisions; silent status mutation cannot change clearing, payout, dispute, or blocker state.
22. Payment and provider-webhook processing is idempotent and replay-safe: duplicate provider events are ignored, stale-snapshot events are blocked or routed to manual review, and no capture or payout release can occur without a matching locked terms snapshot and participant confirmation hash.
23. Agreement, payment, evidence, dispute, and blocker state changes are recorded as append-only `marketplace_state_event` records; terminal states cannot be silently reopened or mutated.
24. Baseline confidence is represented separately from baseline good-faith attestation and baseline review; low-confidence baselines cannot support automatic clearing of donation offsets or pledge swaps.
25. Regulated or legally sensitive real-money flows are jurisdiction-gated and disabled by default unless the relevant legal review state and jurisdiction policy version explicitly approve them.
26. AI-assisted outputs cannot directly change marketplace state, evidence acceptance, legal review, baseline confidence, externality review, payment capture, or payout release without structured participant input, verifiable evidence, or reviewer decision.
27. Evidence records are claim-typed, evidence-standard-scoped, artifact-hash-backed, and challenge-window-aware; accepting action evidence cannot by itself satisfy baseline confidence, additionality, destination verification, externality review, or legal review.
28. The external CRECM module is linked or integrated only by boundary contract; this document must not implement or test its mechanism details.
29. Participant-facing non-public-goods UI implements the template gallery, guided builder, draft preview, matched-trade lock proposal, final confirmation, and participant dashboard as separate task-oriented surfaces, with live, preview-only, worked-example, and demo states clearly distinguishable.
30. The final-lock UX shows a side-by-side no-trade vs if-this-clears comparison, the participant-facing term-sheet hash, maximum exposure, clearing condition, privacy disclosure, payment/refund/cancellation behavior, evidence burden, remaining uncertainty, and a distinct final-confirmation action; internal control-plane enum names are not the primary user explanation.
31. Marketplace intake triage routes ordinary donations, ordinary matching, ordinary procurement/service, self-offset bookkeeping, external CRECM/public-goods candidates, background-networking requests, and prohibited/unsupported requests away from the non-public-goods moral-trade lock path unless the user corrects the routing and review confirms a plausible Toby-Ord moral-trade candidate.
32. Reliance-bearing and money-affecting participant screens create hash-backed UI render snapshots; final confirmation is blocked if the snapshot omits required material disclosures, mismatches the term sheet, fails configured comprehension/accessibility checks, or hides the distinct final-lock action.
33. Food-abstention pledge-swap templates default to one meal, a few meals, one day, or a few days; 30-day, month-long, or open-ended no-meat pledges are not default payable templates and require either a micro-pledge sequence with renewed confirmations or explicit longer-duration manual review.
34. Pledge-swap previews show pledge-unit granularity, duration, evidence burden, privacy burden, counterfactual-trust class, renewal rule, and longer-duration review state before final lock.
35. Behavioral micro-pledge previews show the evidence ladder, default self-attestation path, any evidence escalation trigger, low-stakes per-unit cap, cumulative sequence cap, personal-cash/manual-review handling, performance-bond cap where any, no-auto-renew rule, and renewed-confirmation requirement before final lock or extension.
36. Micro-pledge sequences disclose per-unit vs all-or-nothing settlement, failed-unit effect, evidence checkpoints, renewed-confirmation requirements, and release/cancellation behavior before final confirmation.
37. Behavioral micro-pledges cannot become payable, reliance-bearing, or completed moral trade unless each covered meal/day/few-day window was locked before the window began; retroactive claims are routed to personal bookkeeping or manual-review context rather than completed moral-trade status.
38. Each food-abstention micro-pledge unit records a unit-specific no-trade baseline, unit-specific additionality review state, covered-food definition, and adequate-substitute plan before it can count as completed Toby-Ord moral trade.
39. Micro-pledge sequences enforce frozen rolling-window duration, payout, evidence-burden, and privacy-burden caps; exceeding those caps routes the sequence to renewed confirmation plus manual review rather than silently constructing a longer-duration pledge.
40. Food-abstention pledge templates block fasting, weight-loss, calorie-restriction, medical-diet, body-image, eating-disorder-adjacent, minor/dependency/coercion, or high-burden variants unless the exact flow is non-blocking under health-safety, autonomy, legal, and reviewer-quality policies.
41. Completed non-public-goods trades may generate an opt-in shareable public receipt card only after reconciliation, challenge-window, privacy-publication, recipient-acceptance/adverse-association, content-moderation, and public-metric-release gates are non-blocking. The card must separately display personal verified contribution, trade-conditioned contribution, reviewed trade-unlocked contribution where allowed, and total verified recipient transfer where applicable.
42. Public receipt cards must not use good-person, moral-score, moral-rank, leaderboard, or platform-endorsement language; they must not expose raw evidence, private counterparty data, exact private caps, private surplus, or unreviewed impact/effectiveness claims.
43. Public receipt cards use trade-conditioned wording by default; trade-unlocked wording is allowed only when the frozen public-receipt-card policy, baseline/additionality review, counterfactual-trust review, and impact-claim methodology support that stronger causal claim.
44. Direct-donation parity display cannot reuse old, already-counted, or separately claimed donations as new personal contribution; reused or independently made contributions must be excluded from parity display or plainly disclosed under the frozen policy.
45. Public receipt cards must pass claim-hygiene checks before publication: `additional`, `unlocked`, `matched`, `completed`, `verified`, and `impact` wording must map to reviewed claim records, and unsupported additionality wording is replaced with trade-conditioned or verified-transfer wording or blocked.
46. Public receipt publication is a sidecar event, not marketplace state: receipt publication, likes/shares, profile display, or public visibility must not affect future matching, clearing, review priority, eligibility, or moral-trade classification.
47. Public receipt cards must not create engagement or reputation infrastructure: no public likes/reactions/share counts, streaks, receipt-count leaderboards, profile/search boosts, matching priority, review priority, or recommendation ranking may depend on receipt publication, receipt amount, or receipt volume.
48. Public receipt cards must include or resolve to a privacy-safe verification URL or handle with current status and correction/revocation/supersession state; static images and screenshots are not authoritative. Public receipt publication cannot be required as a trade term, compensation condition, evidence condition, or payout condition.
49. Direct-donation parity mode is opt-in and non-preferential: it cannot be preselected, framed as a moral upgrade, required for receipt publication, or used for matching priority, review priority, eligibility, public search ordering, profile prominence, or future marketplace access.
50. Public receipts for personal-behavior pledge swaps default to coarse/generic action labels or transfer-only display; exact food, diet, health, family, religious, political, lifestyle, or other sensitive behavior details require separate publication consent and non-blocking privacy/autonomy/content-moderation review.
51. Public receipt personal-contribution lines must be net-attribution-safe: gross transfers, known reimbursements/subsidies/side benefits, and net personal verified contribution are separated or the personal-contribution line is qualified/suppressed. Trade-conditioned funds, trade-unlocked funds, sponsor subsidies, employer matches, donor-advised-fund credits, refunds, and counterparty reimbursements must not be presented as the participant's own personal contribution.
52. Participant-facing screens must use an approved plain-language copy layer: every reliance-bearing, money-affecting, privacy-disclosing, evidence-submitting, or public-receipt screen shows a one-sentence summary, key facts, next action, and optional details drawer. Internal control codes and enum names cannot be the primary explanation, and simplification cannot omit maximum exposure, no-trade comparison, privacy change, evidence burden, failure/refund behavior, or remaining uncertainty.
53. Participant-facing screens must use a task-card pattern with one primary action, a stable term map, and safe-template-default disclosure. The guided builder may hide safe template defaults while drafting, but any default affecting money, obligations, privacy, evidence, duration, failure handling, or public display must be shown in preview and in the participant term sheet before final lock confirmation.
54. Public Moral Trade pages pass the route-simplification audit: `/offers/new?mode=offset`, `/offers`, `/donation-offsets`, `/pledge-swaps`, `/moral-trade`, `/how-it-works`, `/validation`, `/paid-action-offers`, and worked-example detail/create-similar routes use one clear primary action, collapsed technical details, no raw factor-code primary copy, no internal-enum walls, no moral-looking impact-score default sort/filter, and no route-fallback diagnostics as normal page content.
55. The signed-out offset creation route is not a dead end. It lets the user understand or locally preview the offset shape while clearly stating that sign-in is required before saving, publishing, requesting review, disclosing counterparties, authorizing money, or creating a live offer.
56. Worked-example cards are lightweight teaching cards by default. They show status, trade type, offered/requested terms, evidence needed, review state, and one primary action; full baselines, factor codes, validator details, participant-stated importance scores, and technical proof schemas live in details drawers or reviewer/technical pages.
57. Pledge-swap and food-abstention pages do not present week/month/30-day no-meat pledges as the default product. Default public examples and template cards use one-meal, few-meal, one-day, or few-day micro-pledges unless the page is explicitly discussing source examples or manual-review exceptions.
58. Donation-offset pages use the approved plain-label map for user-facing copy: `what would each side donate without this trade`, `how much each side redirects`, `where the shared money goes`, `why each side prefers this`, `what proof reviewers check`, `when the offer expires`, and `what would make this unsafe or invalid`.

---

## Implementation sequence

1. Add a clear source-of-truth note: all moral-public-goods / Common-Ground-Budget mechanism work belongs in `moralpublicgoods102.md` / CRECM v1.96, not in this marketplace brief.
2. Build marketplace-intake triage and non-public-goods template scaffolds for donation offsets and pledge swaps, with preview-only state by default and safe routing out for ordinary donation/matching, ordinary procurement/service, self-offset, external CRECM/public-goods, background-networking, and prohibited/unsupported cases. For food-abstention pledge templates, make one-meal/few-meal/one-day/few-day micro-pledges the default scaffolds; add unit-specific no-trade baselines, covered-food definitions, adequate-substitute prompts, health-safety boundaries, self-attestation-first evidence ladders, pre-performance meal/day window locks, per-unit amount bands, cumulative sequence caps, and no-auto-rollover defaults; keep 30-day or longer variants as manual-review exceptions or explicitly sequenced micro-pledges.
3. Add release-gate, feature-flag, policy-snapshot, reviewer-quality, privacy, anti-threat, content-moderation, user-safety, account-security, deployment/configuration, schema-migration, environment-isolation, backup-recovery, incident-response, financial-reconciliation, data-security, and audit-integrity records needed for non-public-goods previews.
4. Add donation-offset and pledge-swap clearing previews that show baseline, baseline version, participant term sheet and hash, counterparty volume, counterparty-blinding/staged-disclosure status, recipient-acceptance/adverse-association status, AI-preference-elicitation boundary status, post-clear-audit sampling status, approved-template/parameter-conformance status, review queue/admission status, any non-public-goods subsidy schedule and cap status, direct-pair-or-batch mode, cause-bucket taxonomy/assignment status, clearing ratio and ratio-bounds status, resource-compatibility status, net-offset accounting status, baseline-integrity status, commitment-reservation and atomic-settlement status, compensation terms and ordinary-service/procurement status where relevant, donor-of-record/tax-receipt status where relevant, negative-commitment scope/substitution/confidence, action-reversibility/high-stakes status, third-party-obligation status, representative-authority status, reporting-integrity/non-suppression status, civil-rights/discrimination status, participant-autonomy/coercion-undue-influence status, confidentiality/privacy-rights status, evidence-authenticity/synthetic-media status, financial-crime/fraud/source-of-funds status, agreement-transferability/non-assignment status, regulated-goods/hazardous-activity status, cyber-abuse/digital-systems-integrity status, non-public-goods tier status, counterfactual-trust class, closed-counterparty/open-market matching state, control-pack/control-result status, private exchange-rate quote status, noncompensable-safety-blocker status, offer-validity/staleness and renewal status, batch-clearing objective/fairness status, privacy-preserving verification-attestation status, market-simulation/red-team status, pilot-exit criteria status, option-set/Pareto-comparison status, preference-incomparability/noncardinal status, trade-burden accounting status, moral-difference attestation status, bargaining-protocol/anti-holdup status, empirical-assumption snapshot status, side-constraint/agent-relative-limit status, intrapersonal/self-offset classification status, anti-corruption/process-integrity status, pledge-performance-bond amount/return/forfeiture status where relevant, matched/unmatched residuals, destination verification, nonparticipant externality status, evidence burden and least-intrusive alternatives, pledge-unit granularity, unit-specific baseline/additionality state, micro-pledge duration/sequence policy, cumulative sequence caps, food-abstention health-safety boundary state, micro-pledge window/pre-performance-lock status, retroactive-claim state, evidence ladder, per-unit amount band, no-auto-rollover/renewal state, longer-duration review state, fallback, performance terms, breach/cure terms, reciprocal release where applicable, matched-trade lock confirmation state, amendment/supersession state where relevant, and classification.
5. Build participant-facing UI/UX as progressive-disclosure surfaces: intake triage, template gallery, guided builder, draft preview, review/queue status, matched-trade lock proposal, final confirmation, participant dashboard, and opt-in public receipt card preview/publication. Add the plain-language copy layer, route-simplification policy/audit records, and participant explanation records so each public and participant screen has a one-sentence summary, a stable participant-facing term map, no more than the configured number of key facts, one primary action, safe-template-default disclosure, and optional advanced details drawer; specifically retrofit /offers/new?mode=offset, /offers, /donation-offsets, /pledge-swaps, /moral-trade, /how-it-works, /validation, /paid-action-offers, worked-example detail pages, and create-similar routes so signed-out offset creation is not a dead-end, advanced filters/details are collapsed by default, factor codes/internal enums are hidden from primary copy, long-duration pledge examples are not the default, and route fallback diagnostics are not rendered as normal page content; render the long control list as grouped summary chips and expandable detail drawers rather than one undifferentiated blocker wall; create participant UI render snapshots for reliance-bearing and money-affecting screens; make public receipt cards unlisted/profile-opt-in by default, with claim-hygiene preview, no engagement counters, no comparative/leaderboard context, direct-donation-parity non-preference copy, net-personal-contribution attribution preview, reimbursement/subsidy disclosure preview, and sensitive-action redaction previews; include live/demo/preview-only empty states, accessibility/locale checks, and route screenshots in the PR.
6. Add reviewer console extensions, including reviewer conflict-of-interest state, neutral reviewer / panel assignment, plain-language copy/material-omission checks, task-card/single-primary-action checks, safe-template-default disclosure checks, and public receipt card publication checks for privacy, recipient association, content moderation, verified claims, direct-donation parity display and non-preference, net-personal-contribution attribution, reimbursement/subsidy disclosure, sensitive-action redaction, publication-pressure reports, no-moral-score language, anti-gamification, no-publicity-as-trade-term, verification URL/status, and correction/revocation behavior.
7. Add payment authorization stubs or real provider integration depending on current environment.
8. Add public marketplace tab separation: live offers / create from template / worked examples / demo data / external CRECM module.
9. Add reviewed non-public-goods seed templates so the marketplace does not launch into an empty state.
10. Add privacy-safe measurement events and KPI aggregation, including plain-language copy omission blocks, internal-jargon primary-copy blocks, route-simplification audit pass/fail, signed-out offset-builder dead-end blocks, route-fallback-diagnostics primary-copy blocks, factor-code/internal-enum primary-copy blocks, impact-score default-surface blocks, advanced-filter default-expanded blocks, worked-example-card overload blocks, long-duration default-example blocks, task-card single-primary-action blocks, safe-template-default hidden-material-fact blocks, term-map inconsistency blocks, next-action correction rates, public receipt card preview/publication/revocation, claim-correction, recipient-association block, causal-wording block, personal-contribution reuse block, net-personal-contribution display, reimbursement/subsidy disclosure blocks, direct-donation parity use, direct-donation parity non-preference blocks, sensitive-action redaction, exact-action publication confirmations, publication-pressure reports, moral-score-language block, anti-gamification block, publication-as-trade-term block, and verification-URL/status metrics.
11. Run existing route baseline command and fix regressions:

    ```bash
    MORALTRADE_BASE_URL=http://127.0.0.1:3000 npm run measure:routes
    ```

12. Produce a PR with: migration summary, route screenshots, tests, validator output, privacy review notes, and remaining blockers.

---

## Strategic caution

Do not oversell the marketplace. Non-public-goods moral trade can fail through thin markets, unsafe bargains, privacy leakage, counterfactual-trust failures, regulatory blockers, and excessive review burden. Treat the external CRECM module as a separate build target governed by `moralpublicgoods102.md`.

---

## My confidence

I am **high confidence** that the site’s current bottleneck is liquidity/activation rather than conceptual clarity: the public pages are unusually explicit, but the marketplace has 0 live offers and 0 completed agreements.

I am **moderate confidence** that donation-offset and bounded pledge-swap previews are the best next marketplace-side build targets, provided the external CRECM module remains governed by `moralpublicgoods102.md` and is not re-specified here.
