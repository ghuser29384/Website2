# Commitments impact-accounting continuation packet

**Status:** current-main synchronized; QA RLS hardening applied and verified; not approved; not active; not deployed to production

This packet advances the methodology-design and least-privilege work in PR #534. It contains a review manifest, one separate v1 methodology candidate file for each supported mechanism, canonical methodology hashes using the repository's recursive key-sorting algorithm, a structural validation contract, and the exact QA-applied RLS migration. None of the six methodology versions is approved or active, and no modeled estimate is authorized for production display.

## Exact repository and QA state

- Repository: `ghuser29384/Website2`
- Continuation PR: `#534`
- Original tested PR head: `4e56ba774274b58104d75faf40be8269d8422054`
- Prior exact successful QA run: `31115065783`
- Current `main` merged into the feature branch: `bb3b0e4608b7282aecc9d1fe11b5cb310c409347`
- Current-main synchronization merge commit: `d34398baeae99ea99d87c97576ef3280dd5b9b57`
- Final continuation head: to be set by the commit that adds this packet and the updated gate workflow
- MoralTrade QA project: `hvmxfjjbdcgjjudmthdz`
- QA-only RLS migration: `20260808174259_mpgf_public_goods_public_read_rls.sql`
- Exact normalized migration SHA-256: `33bc1fefed0298a1643bd37956b9c8850ccffd8805d66403439e4c1ab60e5bf4`
- Production database and production deployment: unchanged by this continuation

The prior exact-head pass remains useful historical evidence. It is not a substitute for the final exact-current-main gate run on the commit containing this packet.

The repository review source is intentionally split into `docs/commitments/impact-methodologies-v1/manifest.json` plus one JSON file per mechanism. This makes each exact-hash candidate independently reviewable while the manifest binds the six expected files, lifecycle blockers, and QA-only RLS evidence. The local continuation package also retains a combined bundle for archival convenience.


## Methodology hashes

| Mechanism | Model key | Exact methodology hash |
|---|---|---|
| `trade` | `commitments-reciprocal-trade-v1` | `sha256:bff759b15853ebb0d8870a24cba0665870d2e2ba285f1eb7f8551573559bfa3f` |
| `co_fund` | `commitments-co-fund-v1` | `sha256:c1f759e224712a07b30bc28a3be6fd714a0a21c32ee8c0a822779f9f706946ef` |
| `threshold_funding` | `commitments-threshold-funding-v1` | `sha256:8c915821978c45138467e13e05c96f58d1a695b1206d8a2f95849972899df15c` |
| `donation_upgrade` | `commitments-donation-upgrade-v1` | `sha256:e917387ce26a21e98af936388fd88436782f0c199b986e0a408f46dace600463` |
| `threshold_sign_on` | `commitments-threshold-sign-on-v1` | `sha256:f292553856e5d6f21aa2673b21158a91f7dc4cbf6464d0e35a3dfeafaebb9eff` |
| `donation_redirect` | `commitments-donation-redirect-v1` | `sha256:2e3ee0e9de06e8a254a87cddf33834d557cdb9e5e6f674f639774dca0f8cfe5a` |

These hashes cover only each `methodology` object, not surrounding bundle metadata. They are produced by recursively sorting object keys, preserving array order, serializing compact JSON, and hashing the UTF-8 bytes, matching `canonicalImpactMethodologyJson` and `hashImpactMethodology`.

## Locked accounting semantics

1. **No receipt-only causation.** A receipt establishes occurrence; causal claims require a frozen counterfactual baseline and an approved model.
2. **Success-case and expected impact remain distinct.** Expected impact is probability-weighted and always carries an 80% interval and confidence label.
3. **Direct and cooperative attribution are alternative views.** They are never summed.
4. **Native units remain separate.** Money, counts, duration, and value-adjusted quantities are not combined without an independently approved immutable conversion snapshot.
5. **Platform-funded bonuses are separate.** DAC failure bonuses or subsidies never enter participant-caused resource totals.
6. **Redirected baseline is not new money.** Donation Upgrade and Donation Redirect show baseline redirection separately from genuinely new matcher or top-up funds.
7. **Open offers remain outside lifecycle impact accounting.** Only accepted or frozen terms and later verified lifecycle records enter snapshots.

## Mechanism-specific core estimands

### Reciprocal trade
The participant's own commitment is excluded from success-case impact. The primary success-case quantity is the counterparty resource or action absent from the counterparty's frozen no-agreement baseline. Expected impact multiplies that quantity by calibrated causal completion probability.

### Co-Fund
The project must be absent from frozen no-pool defaults. Direct inclusion effects and Shapley cooperative allocation are shown separately. Delivery evidence replaces modeled project quantity after completion, while counterfactual uncertainty remains.

### Threshold funding / DAC
Success-case impact is other eligible funding activated, excluding the participant's own pledge and any platform bonus. Expected impact is the with-pledge versus without-pledge change in success probability times other eligible funding.

### Donation Upgrade
Only the genuinely new matcher or top-up donation is additional money. The original donor's planned amount is `baseline_redirected`. The methodology forbids a universal 2× welfare claim and requires exact provider verification for verified credit.

### Threshold Sign-On
Success-case impact is other qualifying participants or action units activated, excluding the participant's own signature. High-risk and unreviewed proposition classes fail closed. Exact private-manifest and verified-human integrity are required.

### Donation Redirect
Original planned amounts are `baseline_redirected`, not additional. Only a top-up or match absent from both baselines can be additional. Political or regulated donation exchanges remain out of domain without jurisdiction-specific approval.

## QA least-privilege repair

Preflight inspection found a materially broader live QA privilege state than the earlier draft memo assumed: `anon` and `authenticated` had direct `INSERT`, `UPDATE`, and `DELETE` privileges on all four public moral-public-goods summary tables, and RLS was disabled. The affected tables were:

- `mpgf_public_goods_match_pools`
- `mpgf_public_goods_rounds`
- `mpgf_public_goods_campaigns`
- `mpgf_public_goods_allocation_results`

Migration `20260808174259_mpgf_public_goods_public_read_rls.sql` was applied to QA only. It:

- revokes direct client writes, including `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`;
- preserves the existing anonymous and authenticated `SELECT` surface;
- enables RLS on all four tables;
- creates one explicit public-read `SELECT` policy per table; and
- fails transactionally if the required RLS or privilege invariants are not met.

Post-migration verification established, for all four tables, that RLS is enabled, anonymous and authenticated reads remain available, direct client writes are absent, and the expected `USING (true)` read policy exists. The Supabase security advisor no longer reports `rls_disabled_in_public` for these four tables. This does not claim that unrelated pre-existing advisor findings elsewhere in the database have been resolved.

## Approval and activation sequence

1. Run the updated exact-current-main code, bundle-hash, migration-source, transactional SQL, RLS, lint, TypeScript, and build gates on the final continuation commit.
2. Keep all six candidates at `under_review`; do not activate them.
3. Enroll authenticator MFA for the selected founder approver and verify a real AAL2 session on `/dashboard#account-security`.
4. Insert each candidate with its exact methodology hash only after the final exact-head gates pass.
5. Review the six exact hashes. Any textual or parameter change creates a new hash and requires a new review.
6. Record explicit AAL2 founder approval for each exact hash.
7. Keep model health `blocked` until eligible resolved observations and calibration evidence satisfy the methodology.
8. Activate one model per mechanism only after a current passing health snapshot exists.
9. Obtain separate production-release authorization before applying the RLS migration or any methodology migration to production, configuring the approver, merging the product change, or deploying it.

## Current blockers

- The final exact-current-main continuation gates have not yet completed on the commit containing this packet.
- Founder authenticator MFA / AAL2 has not been verified.
- No methodology hash is approved.
- No empirical production calibration registry is populated.
- No model has a passing health record.
- Production migration and release are not authorized.

Until all applicable blockers clear, the correct user-visible behavior is to show deterministic quantities and verified records where available and withhold modeled expected-impact components with explicit blockers.
