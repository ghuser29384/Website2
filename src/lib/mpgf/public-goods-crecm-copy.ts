import { createHash } from "node:crypto";

import {
  MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP,
  MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS,
  type MpgfCrecPlainLanguageCopyMapRow,
} from "./public-goods-crecm-labels";

export {
  MPGF_CRECM_ACCOUNTING_CHANNEL_DISCLOSURES,
  MPGF_CRECM_FINAL_REVIEW_REQUIRED_DISCLOSURES,
  MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP,
  MPGF_CRECM_PLAIN_LANGUAGE_LABELS,
  MPGF_CRECM_REQUIRED_ACCOUNTING_CHANNEL_KEYS,
  MPGF_CRECM_REQUIRED_FINAL_REVIEW_DISCLOSURE_KEYS,
  MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS,
  allMpgfCrecFinalReviewDisclosuresAcknowledged,
  buildMpgfCrecFinalReviewAcknowledgements,
  getMpgfCrecPlainLanguageLabelForStance,
  missingMpgfCrecFinalReviewAcknowledgementKeys,
} from "./public-goods-crecm-labels";
export type {
  MpgfCrecAccountingChannelDisclosure,
  MpgfCrecFinalReviewAcknowledgements,
  MpgfCrecFinalReviewDisclosureKey,
  MpgfCrecFinalReviewRequiredDisclosure,
  MpgfCrecGuidedStance,
  MpgfCrecPlainLanguageCopyMapRow,
} from "./public-goods-crecm-labels";

export const MPGF_CRECM_COPY_VALIDATION_POLICY =
  "crecm_v1_125_recorded_state_public_copy_validation_v3";

export const MPGF_CRECM_DEFAULT_COPY_TERMINOLOGY_MAP = [
  {
    term: "authorized budget",
    safeDefault: "Maximum this round",
    requiredRecordedState: "post_clear_payment_authorization_recorded",
  },
  {
    term: "funds held",
    safeDefault: "saved payment method or post-clear authorization state",
    requiredRecordedState: "escrow_or_custody_claim_allowed",
  },
  {
    term: "escrow",
    safeDefault: "no escrow unless legally approved",
    requiredRecordedState: "escrow_or_custody_claim_allowed",
  },
  {
    term: "custody",
    safeDefault: "partner or fiscal-host custody state, if recorded",
    requiredRecordedState: "escrow_or_custody_claim_allowed",
  },
  {
    term: "guaranteed match",
    safeDefault: "sponsor added, if backed",
    requiredRecordedState: "base_and_bonus_match_pools_backed",
  },
  {
    term: "guaranteed impact",
    safeDefault: "recorded impact or receipt state",
    requiredRecordedState: "impact_outcome_claim_allowed",
  },
  {
    term: "matched impact",
    safeDefault: "separate sponsor match and impact records",
    requiredRecordedState: "base_bonus_match_and_impact_state_recorded",
  },
  {
    term: "insured donation",
    safeDefault: "fallback or failure-bonus terms, if recorded",
    requiredRecordedState: "donation_insurance_claim_allowed",
  },
] as const;

export const MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS = [
  "primary_ui",
  "email",
  "receipt",
  "public_page",
  "audit_adjacent_summary",
] as const;

export type MpgfCrecCopyValidationSurfaceKind =
  (typeof MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS)[number];

export interface MpgfCrecRecordedStateForCopy {
  paymentCaptureAllowed: boolean;
  postClearPaymentAuthorizationRecorded: boolean;
  escrowClaimAllowed: boolean;
  custodyState: string;
  baseMatchPoolBacked: boolean;
  bonusMatchPoolBacked: boolean;
  successRewardPoolFullyBacked: boolean;
  successRewardMaximumLiabilityFullyBacked: boolean;
  coordinationCreditsEnabledForCapturedRows: boolean;
  impactCertificatesEnabledForCapturedRows: boolean;
  capturedContributionRowsAvailable: boolean;
  impactOutcomeClaimAllowed: boolean;
  donationInsuranceClaimAllowed: boolean;
}

export interface MpgfCrecPublishedCopySnippet {
  surface: string;
  surfaceKind?: MpgfCrecCopyValidationSurfaceKind;
  text: string;
}

export interface MpgfCrecCopyValidationResult {
  ok: boolean;
  policy: typeof MPGF_CRECM_COPY_VALIDATION_POLICY;
  surface: string;
  claims: string[];
  blockers: string[];
}

export interface MpgfCrecPlainLanguageCopyMapValidation {
  ok: boolean;
  policy: typeof MPGF_CRECM_COPY_VALIDATION_POLICY;
  requiredLabels: typeof MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS;
  rowCount: number;
  blockers: string[];
  rows: readonly MpgfCrecPlainLanguageCopyMapRow[];
}

function hashValue(value: unknown) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function hasPositiveClaim(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasNegatedClaim(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function inferSurfaceKind(surface: string): MpgfCrecCopyValidationSurfaceKind | null {
  const normalized = slug(surface);

  if (normalized.includes("email")) {
    return "email";
  }
  if (normalized.includes("receipt") || normalized.includes("contribution_state")) {
    return "receipt";
  }
  if (normalized.includes("public") || normalized.includes("entry_page")) {
    return "public_page";
  }
  if (normalized.includes("audit") || normalized.includes("summary")) {
    return "audit_adjacent_summary";
  }
  if (normalized.includes("review") || normalized.includes("terms") || normalized.includes("primary")) {
    return "primary_ui";
  }

  return null;
}

export function validateMpgfCrecPlainLanguageCopyMap(
  rows: readonly MpgfCrecPlainLanguageCopyMapRow[] = MPGF_CRECM_PLAIN_LANGUAGE_COPY_MAP,
): MpgfCrecPlainLanguageCopyMapValidation {
  const blockers: string[] = [];
  const seenLabels = new Set<string>();
  const duplicateLabels = new Set<string>();

  for (const row of rows) {
    if (seenLabels.has(row.defaultUiText)) {
      duplicateLabels.add(row.defaultUiText);
    }
    seenLabels.add(row.defaultUiText);

    if (row.defaultUiText.trim() !== row.defaultUiText || row.defaultUiText.length === 0) {
      blockers.push(`plain_copy_map_label_not_trim_stable_${slug(row.defaultUiText)}`);
    }
    if (!row.canonicalMeaning || !row.implementationRequirement || !row.canonicalRecord || !row.canonicalField) {
      blockers.push(`plain_copy_map_row_under_specified_${slug(row.defaultUiText)}`);
    }
    if (row.createsAlternateSemantics !== false) {
      blockers.push(`plain_copy_map_alternate_semantics_${slug(row.defaultUiText)}`);
    }
  }

  for (const label of MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS) {
    if (!seenLabels.has(label)) {
      blockers.push(`plain_copy_map_missing_${slug(label)}`);
    }
  }

  for (const label of duplicateLabels) {
    blockers.push(`plain_copy_map_duplicate_${slug(label)}`);
  }

  return {
    ok: blockers.length === 0,
    policy: MPGF_CRECM_COPY_VALIDATION_POLICY,
    requiredLabels: MPGF_CRECM_REQUIRED_PLAIN_LANGUAGE_COPY_LABELS,
    rowCount: rows.length,
    blockers,
    rows,
  };
}

export function validateMpgfCrecCopyAgainstRecordedState(
  snippet: MpgfCrecPublishedCopySnippet,
  state: MpgfCrecRecordedStateForCopy,
): MpgfCrecCopyValidationResult {
  const text = snippet.text.replace(/\s+/g, " ").trim();
  const claims: string[] = [];
  const blockers: string[] = [];

  if (
    hasPositiveClaim(text, [
      /\b(charge|charged|capture|captured|authorized payment|payment authorized) now\b/i,
      /\bwe (charged|captured|authorized) (your )?(payment|card|funds)\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(no charge now|not charged now|does not charge|do not charge|doesn't charge)\b/i,
      /\b(not|never) (capture|captured|authorize|authorized) (your )?(payment|card|funds)\b/i,
    ])
  ) {
    claims.push("payment_capture_or_authorization");
    if (!state.paymentCaptureAllowed) {
      blockers.push("copy_claims_payment_capture_without_recorded_payment_state");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\bauthorized budget\b/i,
      /\bbudget (is )?authorized\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\bnot (an? )?authorized budget\b/i,
      /\bbudget is not authorized\b/i,
      /\bmaximum budget[^.]*not (an? )?authorization\b/i,
    ])
  ) {
    claims.push("authorized_budget");
    if (!state.postClearPaymentAuthorizationRecorded) {
      blockers.push("copy_uses_authorized_budget_without_recorded_authorization_state");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(escrow-backed|held in escrow|escrowed funds|custody-backed|payment protection)\b/i,
      /\b(we hold|platform holds|funds are held|funds held|held funds)\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(not|never) (held in escrow|escrow-backed|custody-backed|payment protection)\b/i,
      /\bnot representing that funds are held\b/i,
      /\bnot represented as [^.]*escrow/i,
      /\bnot escrow\b/i,
      /\bwithout (claiming|guaranteeing|promising|representing) [^.]*\b(escrow|custody|payment protection)\b/i,
      /\bwithout [^.]*\b(escrow|custody|payment protection)\b/i,
    ])
  ) {
    claims.push("escrow_custody_or_payment_protection");
    if (!state.escrowClaimAllowed) {
      blockers.push("copy_claims_escrow_or_custody_without_recorded_approval");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(guaranteed|locked|fully backed) base match\b/i,
      /\b(guaranteed|locked|fully backed) bonus match\b/i,
      /\bbase match (is )?(guaranteed|locked|fully backed)\b/i,
      /\bbonus match (is )?(guaranteed|locked|fully backed)\b/i,
      /\bguaranteed matching\b/i,
      /\bmatched funds are guaranteed\b/i,
      /\bmatching is guaranteed\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(not|never) (a )?(guaranteed|locked|fully backed) (base match|bonus match|match|matching)\b/i,
      /\b(not|never) (guarantee|guaranteed|guaranteeing) (matching|base match|bonus match|matched funds)\b/i,
      /\bwithout (guaranteeing|guaranteed) (matching|base match|bonus match|matched funds)\b/i,
      /\bdoes not (guarantee|lock) (matching|base match|bonus match|matched funds)\b/i,
      /\bmatching is not guaranteed\b/i,
    ])
  ) {
    claims.push("guaranteed_or_backed_matching");
    if (!state.baseMatchPoolBacked || !state.bonusMatchPoolBacked) {
      blockers.push("copy_claims_matching_without_recorded_pool_backing");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(success reward|contributor reward|reward offsets|guaranteed reward)\b/i,
    ])
  ) {
    claims.push("success_reward");
    if (!state.successRewardPoolFullyBacked && !/\b(up to|only from fully backed|if fully backed)\b/i.test(text)) {
      blockers.push("copy_claims_reward_without_fully_backed_success_reward_pool");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(dominance target|dominant strategy|dominance-mode|dominance mode)\b/i,
      /\breward offsets (your )?(contribution|pledge|gift)\b/i,
      /\b(contribution|pledge|gift) (is )?offset by (the )?(success |contributor )?reward\b/i,
    ])
  ) {
    claims.push("success_reward_dominance_or_offset");
    if (!state.successRewardMaximumLiabilityFullyBacked) {
      blockers.push("copy_claims_success_reward_dominance_without_maximum_liability_backing");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(coordination credit issued|credit earned|guaranteed credit)\b/i,
    ])
  ) {
    claims.push("coordination_credit");
    if (!state.coordinationCreditsEnabledForCapturedRows || !state.capturedContributionRowsAvailable) {
      blockers.push("copy_claims_coordination_credit_without_captured_contribution_row");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(impact certificate issued|certified impact|certificate earned|guaranteed certificate)\b/i,
    ])
  ) {
    claims.push("impact_certificate");
    if (!state.impactCertificatesEnabledForCapturedRows || !state.capturedContributionRowsAvailable) {
      blockers.push("copy_claims_impact_certificate_without_captured_contribution_row");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\bguaranteed (impact|outcome|effectiveness)\b/i,
      /\b(impact|outcome|effectiveness) (is )?guaranteed\b/i,
      /\bguarantees? (impact|outcomes?|effectiveness)\b/i,
      /\bcertified impact\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(not|never) (guaranteed|guarantee|guarantees) (impact|outcomes?|effectiveness)\b/i,
      /\b(impact|outcome|effectiveness) is not guaranteed\b/i,
      /\bwithout (guaranteeing|guaranteed) (impact|outcomes?|effectiveness)\b/i,
      /\bwithout guaranteeing [^.]*\b(impact|outcomes?|effectiveness)\b/i,
      /\bdoes not guarantee (impact|outcomes?|effectiveness)\b/i,
      /\bdoes not guarantee [^.]*\b(impact|outcomes?|effectiveness)\b/i,
      /\bnot guaranteed-effective\b/i,
      /\bnot a guarantee of [^.]*impact\b/i,
    ])
  ) {
    claims.push("impact_or_effectiveness_guarantee");
    if (!state.impactOutcomeClaimAllowed) {
      blockers.push("copy_claims_impact_or_effectiveness_without_recorded_proof_state");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(matched impact|impact matched|impact matching|matched-effectiveness)\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(not|never) (matched impact|impact matched|impact matching|matched-effectiveness)\b/i,
      /\bdoes not (claim|promise|guarantee) [^.]*\b(matched impact|impact matched|impact matching)\b/i,
      /\bwithout [^.]*\b(matched impact|impact matched|impact matching)\b/i,
    ])
  ) {
    claims.push("matched_impact");
    if (!state.baseMatchPoolBacked || !state.bonusMatchPoolBacked || !state.impactOutcomeClaimAllowed) {
      blockers.push("copy_claims_matched_impact_without_recorded_matching_and_impact_state");
    }
  }

  if (
    hasPositiveClaim(text, [
      /\b(insured donation|donation insurance|insured contribution|contribution insurance)\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(not|never) (an? )?(insured donation|insured contribution)\b/i,
      /\b(no|without) (donation|contribution) insurance\b/i,
      /\bdoes not (insure|guarantee) (your )?(donation|contribution)\b/i,
    ])
  ) {
    claims.push("insured_donation");
    if (!state.donationInsuranceClaimAllowed) {
      blockers.push("copy_claims_insured_donation_without_recorded_insurance_state");
    }
  }

  return {
    ok: blockers.length === 0,
    policy: MPGF_CRECM_COPY_VALIDATION_POLICY,
    surface: snippet.surface,
    claims,
    blockers,
  };
}

export function validateMpgfCrecPublishedCopyBundle(
  snippets: MpgfCrecPublishedCopySnippet[],
  state: MpgfCrecRecordedStateForCopy,
) {
  const results = snippets.map((snippet) => validateMpgfCrecCopyAgainstRecordedState(snippet, state));
  const surfaceKinds = [
    ...new Set(snippets.flatMap((snippet) => snippet.surfaceKind ?? inferSurfaceKind(snippet.surface) ?? [])),
  ];
  const missingRequiredSurfaceKinds = MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS.filter(
    (surfaceKind) => !surfaceKinds.includes(surfaceKind),
  );
  const blockers = results.flatMap((result) =>
    result.blockers.map((blocker) => `${result.surface}:${blocker}`),
  ).concat(
    missingRequiredSurfaceKinds.map(
      (surfaceKind) => `copy_validation_missing_required_publication_surface_${surfaceKind}`,
    ),
  );

  return {
    ok: blockers.length === 0,
    policy: MPGF_CRECM_COPY_VALIDATION_POLICY,
    terminologyMap: MPGF_CRECM_DEFAULT_COPY_TERMINOLOGY_MAP,
    plainLanguageCopyMap: validateMpgfCrecPlainLanguageCopyMap(),
    requiredSurfaceKinds: MPGF_CRECM_REQUIRED_COPY_VALIDATION_SURFACE_KINDS,
    surfaceKinds,
    missingRequiredSurfaceKinds,
    stateHash: hashValue(state),
    surfaceCount: snippets.length,
    blockedSurfaceCount: results.filter((result) => !result.ok).length,
    claims: [...new Set(results.flatMap((result) => result.claims))],
    blockers,
    results,
  };
}
