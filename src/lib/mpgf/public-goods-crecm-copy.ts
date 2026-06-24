import { createHash } from "node:crypto";

export const MPGF_CRECM_COPY_VALIDATION_POLICY =
  "crecm_v1_125_recorded_state_public_copy_validation";

export interface MpgfCrecRecordedStateForCopy {
  paymentCaptureAllowed: boolean;
  escrowClaimAllowed: boolean;
  custodyState: string;
  baseMatchPoolBacked: boolean;
  bonusMatchPoolBacked: boolean;
  successRewardPoolFullyBacked: boolean;
  coordinationCreditsEnabledForCapturedRows: boolean;
  impactCertificatesEnabledForCapturedRows: boolean;
  capturedContributionRowsAvailable: boolean;
}

export interface MpgfCrecPublishedCopySnippet {
  surface: string;
  text: string;
}

export interface MpgfCrecCopyValidationResult {
  ok: boolean;
  policy: typeof MPGF_CRECM_COPY_VALIDATION_POLICY;
  surface: string;
  claims: string[];
  blockers: string[];
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
      /\b(escrow-backed|held in escrow|escrowed funds|custody-backed|payment protection)\b/i,
      /\b(we hold|platform holds|funds are held)\b/i,
    ]) &&
    !hasNegatedClaim(text, [
      /\b(not|never) (held in escrow|escrow-backed|custody-backed|payment protection)\b/i,
      /\bnot representing that funds are held\b/i,
      /\bnot represented as [^.]*escrow/i,
      /\bnot escrow\b/i,
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
      /\bmatching is guaranteed\b/i,
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
  const blockers = results.flatMap((result) =>
    result.blockers.map((blocker) => `${result.surface}:${blocker}`),
  );

  return {
    ok: blockers.length === 0,
    policy: MPGF_CRECM_COPY_VALIDATION_POLICY,
    stateHash: hashValue(state),
    surfaceCount: snippets.length,
    blockedSurfaceCount: results.filter((result) => !result.ok).length,
    claims: [...new Set(results.flatMap((result) => result.claims))],
    blockers,
    results,
  };
}
