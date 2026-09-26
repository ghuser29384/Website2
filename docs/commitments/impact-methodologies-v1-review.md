# Commitments impact-accounting methodology review remediation

**Status:** substantive founder review remediated in QA; exact current `main` synchronized; exact-head CI is enforced as release evidence rather than a methodology blocker; all six v2 candidates remain `under_review`; no candidate is approved or active; production is unchanged

## Decision and scope

Pull-request review `4897881155` rejected approval of all six v1 methodology hashes and required material corrections before another exact-hash review. This remediation implements those corrections without approving a model, activating estimates, configuring a production approver, merging PR #534, or deploying to production.

The branch incorporates current `main` `72729d80bec2e4ffa147d6dc56ae703fb3e79293` through merge commit `e06333b26170a34c56d3d5101ad61acb464f37a3`.

## Source framing

The methodology is conceptually grounded in:

- Toby Ord, *Moral Trade* (2015): moral trade depends on the no-trade default and faces distinct factual-trust and counterfactual-trust problems; occurrence evidence does not settle what would have happened without the trade; negative externalities and perverse incentives remain possible.
- William MacAskill and Fin Moorhouse, *Convergence and Compromise* (2025): trade can create large gains, but threats, bargaining power, concentration of power, and collective-decision procedures can destroy value or seal off valuable outcomes.
- Tom Davidson, William MacAskill, and Mia Taylor, *Moral public goods are a big deal for whether we get a good future* (2026): moral public goods face severe free-riding problems; assurance contracts can remain unlikely to succeed despite large gains from trade; dominant-assurance bonuses offer only a modest theoretical incentive shift and do not solve the fundamental problem.

These documents are conceptual inputs, not empirical calibration datasets. They are recorded under `conceptualBasisRefs`. Every v2 candidate has an empty `calibrationEvidenceRefs` array and therefore cannot be approved.

## Cross-cutting remediation

1. **Prediction and causal identification are separated.** Each methodology now specifies its causal estimand, admissible randomized or defensible quasi-experimental designs, interference treatment, overlap and positivity policy, sensitivity analysis, and the fail-closed action `withhold_causal_components`.
2. **Outcome evidence and additionality are separated.** `verified_additional` is replaced by `verified_outcome`. Receipts and reviewed evidence may establish occurrence and quantity; they do not establish the counterfactual. Public copy must use reviewed outcome evidence or participant-confirmed gain rather than “verified impact.”
3. **Calibration provenance is corrected.** Conceptual papers and software-test runs cannot appear as empirical calibration evidence. Approval requires actual eligible outcome data, fitted-model evaluation, or an immutable empirical calibration report.
4. **Marginal effects default to non-additive.** An additive causal component requires stable unique `resourceClaimRefs`; overlap is rejected. Verified outcomes are never additive caused impact. Cooperative allocation remains an alternative lens and is never summed with direct attribution.
5. **Fail-closed rendering is corrected.** Deterministic terms and reviewed outcome records may remain current under blocked or stale model health when every modeled component is withheld. Available modeled components require passing, nonexpired model health and a matching active model.
6. **Confidence thresholds are explicitly provisional.** Fixed sample floors and calibration bands are governance candidates rather than empirical findings. `highConfidenceAllowed` remains false until independent holdout or temporal validation and uncertainty around calibration metrics are documented.
7. **Strategic behavior and interference are first-class.** Every methodology includes baseline-antecedence, strategic-timing, interference, perverse-incentive, and manipulation-check policies.

## Mechanism-specific remediation

### Reciprocal trade

The participant-level causal estimand is the change in the counterparty outcome distribution under agreement versus no agreement. Repeated counterparties and bilateral dependence must be modeled. Reviewed evidence records the counterparty outcome without converting it into additionality.

### Co-Fund

The coalition outcome—whether and what project is delivered—is separated from the participant-level effect—other resources or delivery probability unlocked by inclusion. Participant effects require an interference-aware inclusion design. Shapley allocation remains separate and non-additive.

### Threshold funding / dominant assurance contracts

The focal estimand is the with-pledge versus without-pledge effect on threshold success and other eligible funding. Pledge arrivals, withdrawals, and payment behavior are treated as interference. Failure-bonus response is an unidentified treatment feature until empirical evidence exists; no beneficial sign is assumed. Platform-funded bonuses remain outside participant-caused totals.

### Donation Upgrade

Both the original donor's plan and the matcher's no-offer plan must be frozen before exposure. Only money absent from both baselines can be additional. Provider events establish payment occurrence; an approved offer-versus-no-offer design is required for matcher additionality. No universal two-times value claim is permitted.

### Threshold Sign-On

Activated or revealed signatures and completed public acts are distinct outcome quantities. A signature is impact only when the frozen objective is the public signal itself. Signature-arrival, withdrawal, reveal, and completion effects require a privacy-preserving interference-aware design.

### Donation Redirect

Shared-destination payment and cancellation or nonpayment of both original plans must be evidenced before an amount is labeled `baseline_redirected`. Only a top-up absent from both baselines can be additional. The shared-destination receipt alone does not prove cancellation.

## Exact v2 methodology hashes

| Mechanism | Model key | Prior rejected hash | New remediation hash |
|---|---|---|---|
| Reciprocal trade | `commitments-reciprocal-trade-v2` | `sha256:bff759b15853ebb0d8870a24cba0665870d2e2ba285f1eb7f8551573559bfa3f` | `sha256:f1d496d5d4c03197711fd683837ea4b2958e0ac8af2e7e0b2d97c54233c0cef9` |
| Co-Fund | `commitments-co-fund-v2` | `sha256:c1f759e224712a07b30bc28a3be6fd714a0a21c32ee8c0a822779f9f706946ef` | `sha256:785eb7a87e2dce2b3009f1fb063d1cf65aa2f47ba39dc690a36ab953b6b75108` |
| Threshold funding / DAC | `commitments-threshold-funding-v2` | `sha256:8c915821978c45138467e13e05c96f58d1a695b1206d8a2f95849972899df15c` | `sha256:e21419076cc2beca7b1e6cfb31bec2376098da117d5cffea0fb1bd4d71c7c066` |
| Donation Upgrade | `commitments-donation-upgrade-v2` | `sha256:e917387ce26a21e98af936388fd88436782f0c199b986e0a408f46dace600463` | `sha256:0666a06be19229e86bf776ab1b43ef8083d577acbbbed090804cbeab02067eac` |
| Threshold Sign-On | `commitments-threshold-sign-on-v2` | `sha256:f292553856e5d6f21aa2673b21158a91f7dc4cbf6464d0e35a3dfeafaebb9eff` | `sha256:d23f1c812d62ad5c6437c90a8cccb40d3d1516fa7b977d89502df874fbc77555` |
| Donation Redirect | `commitments-donation-redirect-v2` | `sha256:2e3ee0e9de06e8a254a87cddf33834d557cdb9e5e6f674f639774dca0f8cfe5a` | `sha256:af2366a1c6292cb27043cdfe68037be2f8f1e234ac5d8e85bb672be8c0a74c24` |

Each hash covers only the corresponding `methodology` object. The canonicalization algorithm recursively sorts object keys with JavaScript `localeCompare`, preserves array order, serializes compact JSON, and hashes the UTF-8 bytes with SHA-256.

## QA database remediation

Migration `20260810150350_commitments_impact_methodology_review_remediation.sql` is applied only to MoralTrade QA project `hvmxfjjbdcgjjudmthdz`.

- normalized source SHA-256: `1117861781bb1e3a22a619e5c3f17af5bcd4bf3d352227c41bf513f5850cd34b`
- normalized bytes: `36310`

Follow-up least-privilege migration `20260810151733_commitments_impact_methodology_remediation_privileges.sql` is also applied to QA only:

- normalized source SHA-256: `eb69557921cb0c774417cdf5b7cfd83a1f1d75705965af141691438db0a3d9cb`
- normalized bytes: `2782`

Alias-safety migration `20260810152035_commitments_impact_snapshot_overlap_alias_fix.sql` is also applied to QA only:

- normalized source SHA-256: `8e228fef725277da803d29b491b1f7de2cbc87b6fb59805a58e43942d6a92e5c`
- normalized bytes: `9247`
- production applied: **false**

The migrations add the review/approval distinction, causal-identification and evidence-semantics validators, strategic-behavior and validation policies, conceptual-versus-calibration provenance checks, non-additive resource-claim enforcement, and deterministic-only rendering under non-passing model health.

## Present-stage approval security

MFA remains deferred until Moral Trade is high-leverage. Present-stage governance requires an authenticated active allowlisted founder account. Exact-hash audit events and model-health activation gates remain mandatory.

## Remaining blockers

- Every changed pull-request head must pass focused tests, six-hash validation, the full repository suite, ESLint, TypeScript, production build, exact-diff checks, exact QA migration-source verification, transactional SQL regression, and zero-residue verification before merge. This is release evidence enforced by CI, not a substantive methodology approval blocker.
- A real founder approver account has not been configured in an authorized environment.
- The six new exact hashes have not received a substantive approval decision.
- No causal-identification design is validated.
- No empirical calibration evidence is registered.
- Confidence thresholds remain provisional and high confidence is disabled.
- No model has a current passing health snapshot.
- Production migration, merge, and deployment remain unauthorized.

Until all applicable blockers clear, the product may show deterministic terms and reviewed outcome records while withholding causal and expected-impact components with explicit blockers.
