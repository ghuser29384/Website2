"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";

import {
  evaluateAdminOperatorAccess,
  isAdminEmail,
  normalizeAgreementReviewerConflictState,
  normalizeNeutralReviewAssignment,
} from "@/lib/admin";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSiteUrl, hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  deriveDisplayName,
  ensureAccountRowsForUser,
  getViewer,
  normalizePublicLocationGranularity,
  requireViewer,
} from "@/lib/app-data";
import {
  getAccountActivationState,
  getPostAuthActivationDestination,
} from "@/lib/account-activation";
import {
  buildDeterministicClarificationQuestions,
  buildDeterministicSynthesis,
  evaluateDeterministicMatch,
  getBackgroundTokens,
  getDeterministicSignalsFromSynthesis,
  hasActiveProfileSourcePermission,
  normalizeBackgroundToken,
  type DeterministicSynthesisPayload,
} from "@/lib/background-networking";
import { buildBackgroundIntentClaims } from "@/lib/background-intent-claims";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import {
  buildMatchExplanationSnapshot,
  buildPrivacySafeMatchAuditMetadata,
  buildPrivacySafeMatchAuditSummary,
  type MatchExplanationSnapshotPayload,
} from "@/lib/background-explanations";
import {
  BACKGROUND_CANDIDATE_BUDGET_VERSION,
  buildBackgroundPurposeBindingRecord,
  evaluateBackgroundDelegatePurposeAuthorization,
  evaluateCandidateExposureForBackgroundRun,
  normalizeBackgroundCandidateAudienceScope,
  normalizeBackgroundPurposeCodeList,
  type BackgroundCandidateExposureDecision,
} from "@/lib/background-candidate-exposure";
import { normalizeBackgroundConciergeAppealStatus } from "@/lib/background-concierge-appeals";
import { insertWishNotificationsWithSafeEmail } from "@/lib/background-notifications";
import {
  PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS,
  SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS,
  WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  overlayBackgroundRecordSensitiveText,
  overlayEncryptedWishEntryBody,
  prepareEncryptedWishEntryBody,
  prepareRecordSensitiveTextFields,
} from "@/lib/background-field-encryption";
import {
  buildDisclosureGrantNotes,
  evaluatePrivacyAccessRequestCadence,
  getDefaultGrantExpiryDays,
  getPrivacyAccessRequestWindowStart,
  requiresContactDisclosureStepUp,
  validateDisclosureRequest,
  type DisclosureAccessLevel,
  type DisclosureAudienceStage,
  type PrivacyAccessRequestCadenceRow,
} from "@/lib/background-disclosure";
import {
  hasActiveBackgroundSourcePermission,
  validateBackgroundSourcePermission,
} from "@/lib/background-source-permissions";
import {
  buildPrivacySafeRiskSignalInsert,
  completeBackgroundQueryEvent,
  insertMatchExplanationSnapshots,
  recordBackgroundQueryRiskSignal,
  reserveBackgroundQueryBudget,
  upsertBackgroundOpportunityBriefs,
} from "@/lib/background-operations";
import {
  buildOpportunityBriefRow,
  getBackgroundSourceRetentionExpiresAt,
} from "@/lib/background-opportunity-briefs";
import {
  getBackgroundQueryFingerprint,
  type BackgroundQueryScope,
} from "@/lib/background-query-budget";
import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  normalizeBackgroundPurposeCode,
  type BackgroundPurposeBinding,
} from "@/lib/background-purpose-registry";
import { getSafeInternalPath } from "@/lib/paths";
import { buildUsernameCompletionPath, profileNeedsUsername } from "@/lib/profile-username";
import {
  getBaselineBondAppealWindowEndsAt,
  getBaselineBondStatusAfterAccepted,
  isPaymentBondsEnabled,
  normalizeBaselineBondCurrency,
  normalizeBaselineBondStatus,
  validateBaselineBondInput,
  type BaselineBondStatus,
} from "@/lib/baseline-bonds";
import {
  PERFORMANCE_BOND_DEFAULT_CURRENCY,
  PERFORMANCE_BOND_MANUAL_PROVIDER,
  PERFORMANCE_BOND_REVIEWER_POLICY,
  acceptBondEvidence,
  adjudicateBondChallenge,
  cancelPerformanceBondDraft,
  challengeBondEvidence,
  createPerformanceBond,
  evidenceSchemaToJson,
  getDefaultPerformanceBondSplitConfig,
  getPerformanceBondConfig,
  getPerformanceBondForfeitureRule,
  isLiveBondPaymentsEnabled,
  isPledgePerformanceBondsEnabled,
  lockPerformanceBondTerms,
  normalizePerformanceBondChallengeWindowDays,
  normalizePerformanceBondCurrency,
  normalizePerformanceBondEvidenceSchema,
  normalizePerformanceBondForfeitureDestination,
  normalizePerformanceBondVisibility,
  parsePerformanceBondSplitConfig,
  splitConfigToJson,
  submitBondEvidence,
  validatePerformanceBondTerms,
  type BondAdjudicationDecision,
  type BondFundingStatus,
  type PerformanceBondForfeitureDestination,
  type PerformanceBondRecord,
  type PerformanceBondSide,
  type PerformanceBondStatus,
  type PerformanceBondTermsInput,
} from "@/lib/performance-bonds";
import { buildAgreementPaymentAuthorizationPreview } from "@/lib/agreement-payment-authorization";
import {
  ANALYTICS_OPT_OUT_COOKIE_NAME,
  ATTRIBUTION_COOKIE_NAME,
  buildPrivacySafeFunnelEventRecord,
  getFirstActionHref,
  isAnalyticsOptedOut,
  normalizeFirstAction,
  normalizeOnboardingGoal,
  normalizeParticipantKind as normalizeCohortParticipantKind,
  parseAttributionCookie,
  type FunnelEventType,
} from "@/lib/growth";
import {
  assessDonationOffsetModeration,
  buildDonationOffsetAuthorityFairnessPreview,
  buildDonationOffsetDonorOfRecordPreview,
  buildDonationOffsetExternalityEvidencePreview,
  buildDonationOffsetParticipantConfirmationPreview,
  buildDonationOffsetPaymentDestinationPreview,
  buildDonationOffsetSafetyAuthenticityPreview,
  calculateDonationOffsetPreview,
  findRegisteredCharityById,
  formatDonationOffsetUnmatchedRule,
  normalizeDonationOffsetCharitableSolicitationTreatment,
  normalizeDonationOffsetDestinationVerificationStatus,
  normalizeDonationOffsetDonorOfRecordRole,
  normalizeDonationOffsetEvidenceBurden,
  normalizeDonationOffsetFallbackPolicy,
  normalizeDonationOffsetAmendmentStatus,
  normalizeDonationOffsetBaselineIntegrityStatus,
  normalizeDonationOffsetBinarySafetyAssertion,
  normalizeDonationOffsetConfirmationScope,
  normalizeDonationOffsetConsentQualityStatus,
  normalizeDonationOffsetMatchedLockProposalStatus,
  normalizeDonationOffsetNonparticipantExternalityStatus,
  normalizeDonationOffsetNoticeRecordStatus,
  normalizeDonationOffsetPaymentDestinationKind,
  normalizeDonationOffsetPaymentDestinationReviewStatus,
  normalizeDonationOffsetParticipantConfirmationRecordStatus,
  normalizeDonationOffsetPrivacyGrantStatus,
  normalizeDonationOffsetRepresentativeAuthorityStatus,
  normalizeDonationOffsetRecipientIdentityStatus,
  normalizeDonationOffsetTaxReceiptTreatment,
  normalizeDonationOffsetThirdPartyObligationStatus,
  normalizeDonationOffsetJurisdictionReviewStatus,
  summarizeDonationOffsetAuthorityFairnessForNotes,
  summarizeDonationOffsetDonorOfRecordForNotes,
  summarizeDonationOffsetExternalityEvidenceForNotes,
  summarizeDonationOffsetParticipantConfirmationForNotes,
  summarizeDonationOffsetPaymentDestinationForNotes,
  summarizeDonationOffsetSafetyAuthenticityForNotes,
  validateDonationOffsetAuthorityFairnessInput,
  validateDonationOffsetDonorOfRecordInput,
  validateDonationOffsetExternalityEvidenceInput,
  validateDonationOffsetParticipantConfirmationInput,
  validateDonationOffsetPaymentDestinationInput,
  validateDonationOffsetSafetyAuthenticityInput,
  validateDonationOffsetFields,
  validateDonationOffsetSubmissionGuards,
  type DonationOffsetFields,
  type DonationOffsetAuthorityFairnessInput,
  type DonationOffsetDonorOfRecordInput,
  type DonationOffsetExternalityEvidenceInput,
  type DonationOffsetParticipationMode,
  type DonationOffsetParticipantConfirmationInput,
  type DonationOffsetPaymentDestinationInput,
  type DonationOffsetSafetyAuthenticityInput,
  type DonationOffsetPoolSide,
  type DonationOffsetTimeHorizon,
  type DonationOffsetUnmatchedSurplusRule,
  type DonationOffsetVerificationMethod,
} from "@/lib/donation-offsets";
import {
  finalizePriorityCorrectionCycle,
  parseStructuredLines,
  publishPriorityCorrectionCycleForMonth,
} from "@/lib/priority-correction";
import { takeRateLimitSlot } from "@/lib/rate-limit";
import {
  calculatePlatformFeeCents,
  getStripe,
  hasStripeEnv,
} from "@/lib/stripe";
import { evidenceLocatorsConflict } from "@/lib/validation";
import { evaluateMoralTradeProtocolDraft } from "@/lib/proposal-review";
import { getReviewedMarketplaceSeedTemplate } from "@/lib/marketplace-seed-templates";
import {
  buildMoralTradeOfferCreateProvenanceConflictSelectors,
  buildMoralTradeOfferCreateProvenanceAgentRow,
  buildMoralTradeOfferCreateProvenanceRows,
  buildMoralTradeOfferProtocolNotes,
  getMoralTradeOfferPersistenceStatus,
  isMoralTradeOfferCreateProvenanceUniqueViolation,
  validateMoralTradeOfferCreateTransition,
} from "@/lib/moral-trade/offer-write-path";
import {
  buildPledgeSwapManualReviewPreview,
  summarizePledgeSwapManualReviewForNotes,
  validatePledgeSwapManualReviewInput,
  type PledgeSwapActionReversibility,
  type PledgeSwapBaselineConfidence,
  type PledgeSwapBinarySafetyAssertion,
  type PledgeSwapManualReviewInput,
  type PledgeSwapOrdinaryServiceClassification,
  type PledgeSwapRepresentativeAuthority,
  type PledgeSwapThirdPartyObligation,
} from "@/lib/pledge-swaps";
import { buildMoralTradeSafeEmailCopy } from "@/lib/moral-trade/email-copy";
import { persistBaselineBondStatusTransition } from "@/lib/moral-trade/baseline-bond-transitions";
import { persistMoralTradeEvidenceSubmission } from "@/lib/moral-trade/evidence-persistence";
import {
  buildAuthPath,
  buildSupabaseAuthCallbackUrl,
  getOAuthProviderLabel,
  getAuthDefaultReturnTo,
  normalizeAuthMode,
  normalizeOAuthProvider,
} from "@/lib/auth-routes";
import { isOAuthProviderEnabled } from "@/lib/auth-provider-settings";
import type {
  MoralTradeEvidenceClaimScope,
  MoralTradeEvidenceClaimType,
} from "@/lib/moral-trade/provenance";
import {
  buildAgreementReviewDecisionConflictSelector,
  buildAgreementReviewDecisionRow,
  buildAgreementReviewProvenanceAgentRow,
  buildAgreementReviewProvenanceConflictSelectors,
  buildAgreementReviewProvenanceRows,
  validateAgreementReviewProtocolTransition,
} from "@/lib/moral-trade/agreement-write-path";
import { summarizeMoralTradeStateTransitionEventRecord } from "@/lib/moral-trade/protocol";

type WishEntryRow = Database["public"]["Tables"]["wish_entries"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type ProfileSourceRow = Database["public"]["Tables"]["profile_sources"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type BackgroundProfileSignalRow =
  Database["public"]["Tables"]["background_profile_signals"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];
type ProfileSourceInsert = Database["public"]["Tables"]["profile_sources"]["Insert"];
type ClarificationQuestionInsert = Database["public"]["Tables"]["clarification_questions"]["Insert"];
type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];
type AgreementInsert = Database["public"]["Tables"]["agreements"]["Insert"];
type AgreementUpdate = Database["public"]["Tables"]["agreements"]["Update"];
type AgreementEventInsert = Database["public"]["Tables"]["agreement_events"]["Insert"];
type AgreementReviewCaseRow = Database["public"]["Tables"]["agreement_review_cases"]["Row"];
type AgreementEvidenceItemInsert =
  Database["public"]["Tables"]["agreement_evidence_items"]["Insert"];
type AgreementEvidenceItemUpdate =
  Database["public"]["Tables"]["agreement_evidence_items"]["Update"];
type AgreementReviewCaseInsert =
  Database["public"]["Tables"]["agreement_review_cases"]["Insert"];
type AgreementReviewCaseUpdate =
  Database["public"]["Tables"]["agreement_review_cases"]["Update"];
type PerformanceBondInsert = Database["public"]["Tables"]["performance_bonds"]["Insert"];
type PerformanceBondRow = Database["public"]["Tables"]["performance_bonds"]["Row"];
type PerformanceBondUpdate = Database["public"]["Tables"]["performance_bonds"]["Update"];
type ProfileVerificationBadgeInsert =
  Database["public"]["Tables"]["profile_verification_badges"]["Insert"];
type DonationOffsetOfferRow = Database["public"]["Tables"]["donation_offset_offers"]["Row"];
type DonationOffsetOfferInsert = Database["public"]["Tables"]["donation_offset_offers"]["Insert"];
type DonationOffsetMatchInsert = Database["public"]["Tables"]["donation_offset_matches"]["Insert"];
type DonationOffsetPoolInsert = Database["public"]["Tables"]["donation_offset_pools"]["Insert"];
type AgreementPaymentScheduleInsert = Database["public"]["Tables"]["agreement_payment_schedules"]["Insert"];
type AgreementPaymentInsert = Database["public"]["Tables"]["agreement_payments"]["Insert"];
type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
type PersonalDelegateInsert = Database["public"]["Tables"]["personal_delegates"]["Insert"];
type SourceConnectionInsert = Database["public"]["Tables"]["source_connections"]["Insert"];
type HelperStrategyInsert = Database["public"]["Tables"]["helper_strategies"]["Insert"];
type MatchConciergeRequestInsert =
  Database["public"]["Tables"]["match_concierge_requests"]["Insert"];
type MatchConciergeRequestUpdate =
  Database["public"]["Tables"]["match_concierge_requests"]["Update"];
type MatchIntroductionPlanInsert =
  Database["public"]["Tables"]["match_introduction_plans"]["Insert"];
type MatchIntroductionPlanRow =
  Database["public"]["Tables"]["match_introduction_plans"]["Row"];
type MatchIntroductionTaskInsert =
  Database["public"]["Tables"]["match_introduction_tasks"]["Insert"];
type PrivacyGrantInsert = Database["public"]["Tables"]["privacy_grants"]["Insert"];
type PrivacyGrantUpdate = Database["public"]["Tables"]["privacy_grants"]["Update"];
type PrivacyAccessRequestInsert =
  Database["public"]["Tables"]["privacy_access_requests"]["Insert"];
type RiskSignalUpdate = Database["public"]["Tables"]["risk_signals"]["Update"];
type CollectiveMemberInsert = Database["public"]["Tables"]["collective_members"]["Insert"];
type CollectiveDecisionInsert = Database["public"]["Tables"]["collective_decisions"]["Insert"];
type CollectiveDecisionResponseInsert =
  Database["public"]["Tables"]["collective_decision_responses"]["Insert"];
type AgreementPaymentStatus = NonNullable<
  Database["public"]["Tables"]["agreement_payments"]["Update"]["status"]
>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MoralTradeProtocolProvenanceConflictSelector = {
  hashColumn: string;
  hashValue: string;
  idempotency_key: string;
  owner_profile_id: string;
  tableName: string;
};

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);

  redirect(`${target.pathname}${target.search}${target.hash}`);
}

function readRequired(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readBoolean(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase();
  return value === "on" || value === "true" || value === "1" || value === "yes";
}

function readPositiveIntOrNull(formData: FormData, key: string) {
  const value = Number(readOptional(formData, key));

  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

function readNonNegativeIntOrNull(formData: FormData, key: string) {
  const value = Number(readOptional(formData, key));

  if (!Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizePledgeSwapBaselineConfidence(value: string): PledgeSwapBaselineConfidence {
  if (value === "low" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizePledgeSwapOrdinaryServiceClassification(
  value: string,
): PledgeSwapOrdinaryServiceClassification {
  if (value === "ordinary_service_or_procurement" || value === "unclear") {
    return value;
  }

  return "not_ordinary_service_market";
}

function normalizePledgeSwapActionReversibility(value: string): PledgeSwapActionReversibility {
  if (
    value === "reversible_or_low_stakes" ||
    value === "irreversible_or_high_stakes" ||
    value === "unknown"
  ) {
    return value;
  }

  return "continuing_but_suspendable";
}

function normalizePledgeSwapThirdPartyObligation(value: string): PledgeSwapThirdPartyObligation {
  if (value === "possible_or_unknown" || value === "conflict_declared") {
    return value;
  }

  return "none_known";
}

function normalizePledgeSwapRepresentativeAuthority(
  value: string,
): PledgeSwapRepresentativeAuthority {
  if (value === "claims_representative_authority" || value === "unknown") {
    return value;
  }

  return "self_only";
}

function normalizePledgeSwapBinarySafetyAssertion(value: string): PledgeSwapBinarySafetyAssertion {
  if (value === "possible_or_unknown" || value === "triggered") {
    return value;
  }

  return "clear";
}

async function replaceBackgroundIntentClaims({
  profile,
  sourceConnections,
  supabase,
  synthesis,
  userId,
}: {
  profile: WishProfileRow;
  sourceConnections: SourceConnectionRow[];
  supabase: SupabaseServerClient;
  synthesis: DeterministicSynthesisPayload;
  userId: string;
}) {
  const claims = buildBackgroundIntentClaims({
    profile,
    sourceConnections,
    synthesis,
  });
  const { error: archiveError } = await supabase
    .from("background_intent_claims")
    .update({ status: "superseded" })
    .eq("profile_id", userId)
    .eq("status", "active");

  if (archiveError) {
    logSupabaseActionError("Failed to supersede background intent claims", archiveError, {
      userId,
    });
    return;
  }

  if (!claims.length) {
    return;
  }

  const { error: upsertError } = await supabase
    .from("background_intent_claims")
    .upsert(claims, { onConflict: "profile_id,claim_key" });

  if (upsertError) {
    logSupabaseActionError("Failed to refresh background intent claims", upsertError, {
      userId,
    });
  }
}

function readPositiveMoneyAmount(formData: FormData, key: string) {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function readNonNegativeMoneyAmount(formData: FormData, key: string) {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function readStringList(formData: FormData, key: string) {
  const rawValue = readOptional(formData, key);

  if (!rawValue) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return rawValue
      .split(/[,;\n]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
}

function readRepeatedStrings(formData: FormData, key: string, limit = 12) {
  return formData
    .getAll(key)
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index)
    .slice(0, limit);
}

function normalizeDisclosureStage(value: string): DisclosureAudienceStage {
  if (value === "registry" || value === "introduced") {
    return value;
  }

  return "consent";
}

function normalizeDisclosureAccess(value: string): DisclosureAccessLevel {
  if (value === "hidden" || value === "broad" || value === "contact") {
    return value;
  }

  return "specific";
}

function readDisclosureFieldKeys(
  formData: FormData,
  {
    jsonKey = "requested_fields_json",
    repeatedKey = "requested_fields",
    singleKey = "field_key",
  }: {
    jsonKey?: string;
    repeatedKey?: string;
    singleKey?: string;
  } = {},
) {
  return [
    ...readStringList(formData, jsonKey),
    ...readRepeatedStrings(formData, repeatedKey),
    readOptional(formData, singleKey),
  ]
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

function disclosureErrorsToMessage(errors: string[]) {
  return errors.join(" ");
}

async function requireContactDisclosureMfaStepUp({
  accessLevel,
  fieldKeys,
  returnTo,
}: {
  accessLevel: DisclosureAccessLevel;
  fieldKeys: string[];
  returnTo: string;
}) {
  if (!requiresContactDisclosureStepUp({ accessLevel, fieldKeys })) {
    return;
  }

  const mfaSummary = await loadBackgroundAccountSecuritySummary();

  if (mfaSummary.currentLevel !== "aal2") {
    redirectWithMessage(
      returnTo,
      "error",
      "Contact disclosure grants require an active MFA step-up. Verify an authenticator session from account security, then approve the grant.",
    );
  }
}

function logSupabaseActionError(
  context: string,
  error: PostgrestError | Error | null | undefined,
  metadata: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (!error) {
    return;
  }

  console.error(`[supabase] ${context}`, {
    code: "code" in error ? error.code ?? null : null,
    details: "details" in error ? error.details ?? null : null,
    hint: "hint" in error ? error.hint ?? null : null,
    message: error.message,
    ...metadata,
  });
}

function toActionError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

async function getOrCreateMoralTradeOfferProvenanceAgentId({
  actorAgentId,
  actorLabel,
  ownerProfileId,
  supabase,
}: {
  actorAgentId: string;
  actorLabel: string;
  ownerProfileId: string;
  supabase: SupabaseServerClient;
}) {
  const agentRow = buildMoralTradeOfferCreateProvenanceAgentRow({
    actorAgentId,
    actorLabel,
    ownerProfileId,
  });
  const provenanceClient = supabase as any;
  const { data: existingAgent, error: existingAgentError } = await provenanceClient
    .from("moral_trade_provenance_agents")
    .select("id")
    .eq("owner_profile_id", ownerProfileId)
    .eq("agent_key", agentRow.agent_key)
    .maybeSingle();

  if (existingAgentError) {
    return { error: existingAgentError as PostgrestError, id: null };
  }

  if (existingAgent?.id) {
    return { error: null, id: String(existingAgent.id) };
  }

  const { data: insertedAgent, error: insertedAgentError } = await provenanceClient
    .from("moral_trade_provenance_agents")
    .insert(agentRow)
    .select("id")
    .single();

  if (!insertedAgentError && insertedAgent?.id) {
    return { error: null, id: String(insertedAgent.id) };
  }

  if (insertedAgentError?.code === "23505") {
    const { data: racedAgent, error: racedAgentError } = await provenanceClient
      .from("moral_trade_provenance_agents")
      .select("id")
      .eq("owner_profile_id", ownerProfileId)
      .eq("agent_key", agentRow.agent_key)
      .maybeSingle();

    if (racedAgent?.id && !racedAgentError) {
      return { error: null, id: String(racedAgent.id) };
    }

    return { error: racedAgentError ?? insertedAgentError, id: null };
  }

  return { error: insertedAgentError as PostgrestError, id: null };
}

async function confirmExistingMoralTradeProtocolPersistenceRow({
  selector,
  supabase,
}: {
  selector: MoralTradeProtocolProvenanceConflictSelector;
  supabase: SupabaseServerClient;
}) {
  const provenanceClient = supabase as any;
  const { data: existingRow, error: existingRowError } = await provenanceClient
    .from(selector.tableName)
    .select("id")
    .eq("owner_profile_id", selector.owner_profile_id)
    .eq("idempotency_key", selector.idempotency_key)
    .eq(selector.hashColumn, selector.hashValue)
    .maybeSingle();

  if (existingRow?.id && !existingRowError) {
    return null;
  }

  return (
    (existingRowError as PostgrestError | null) ??
    new Error(
      `Conflicting Moral Trade provenance duplicate for ${selector.tableName} idempotency key ${selector.idempotency_key}`,
    )
  );
}

async function insertMoralTradeProtocolPersistenceRow({
  row,
  selector,
  supabase,
}: {
  row: unknown;
  selector: MoralTradeProtocolProvenanceConflictSelector;
  supabase: SupabaseServerClient;
}) {
  const provenanceClient = supabase as any;
  const { error } = await provenanceClient.from(selector.tableName).insert(row);

  if (!error) {
    return null;
  }

  if (!isMoralTradeOfferCreateProvenanceUniqueViolation(error)) {
    return error as PostgrestError;
  }

  return confirmExistingMoralTradeProtocolPersistenceRow({
    selector,
    supabase,
  });
}

async function persistMoralTradeOfferCreateProtocolProvenance({
  actorAgentId,
  actorLabel,
  draft,
  offerId,
  ownerProfileId,
  protocolReview,
  recordedAt,
  supabase,
}: {
  actorAgentId: string;
  actorLabel: string;
  draft: Parameters<typeof validateMoralTradeOfferCreateTransition>[0]["draft"];
  offerId: string;
  ownerProfileId: string;
  protocolReview: Parameters<typeof validateMoralTradeOfferCreateTransition>[0]["protocolReview"];
  recordedAt: string;
  supabase: SupabaseServerClient;
}) {
  const agent = await getOrCreateMoralTradeOfferProvenanceAgentId({
    actorAgentId,
    actorLabel,
    ownerProfileId,
    supabase,
  });

  if (!agent.id || agent.error) {
    return {
      error: agent.error,
      transition: null,
    };
  }

  const transition = validateMoralTradeOfferCreateTransition({
    actorAgentId: agent.id,
    actorAgentKind: "participant",
    draft,
    idempotencyKey: `offer-create:${offerId}:draft-to-submitted`,
    protocolReview,
    recordedAt,
    subjectId: offerId,
    subjectKind: "offer",
  });

  if (transition.status === "fail" || !transition.transitionEventRecord) {
    return {
      error: new Error(
        `Offer protocol provenance transition failed: ${transition.blockers.join(", ")}`,
      ),
      transition,
    };
  }

  const rows = buildMoralTradeOfferCreateProvenanceRows({
    actorProvenanceAgentId: agent.id,
    offerId,
    ownerProfileId,
    transitionEventRecord: transition.transitionEventRecord,
  });
  const selectors = buildMoralTradeOfferCreateProvenanceConflictSelectors(rows);
  const activityError = await insertMoralTradeProtocolPersistenceRow({
    row: rows.provenanceActivity,
    selector: selectors.provenanceActivity,
    supabase,
  });

  if (activityError) {
    return { error: activityError, transition };
  }

  const transitionError = await insertMoralTradeProtocolPersistenceRow({
    row: rows.stateTransitionEvent,
    selector: selectors.stateTransitionEvent,
    supabase,
  });

  return {
    error: transitionError,
    transition,
  };
}

function normalizeAgreementReviewProvenanceAgentKind(
  reviewerRole: NonNullable<AgreementReviewCaseUpdate["reviewer_role"]>,
) {
  return reviewerRole === "external_reviewer" ? "external_reviewer" : "operator";
}

async function getOrCreateMoralTradeAgreementReviewProvenanceAgentId({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  ownerProfileId,
  supabase,
}: {
  actorAgentId: string;
  actorAgentKind: "operator" | "external_reviewer";
  actorLabel: string;
  ownerProfileId: string;
  supabase: SupabaseServerClient;
}) {
  const agentRow = buildAgreementReviewProvenanceAgentRow({
    actorAgentId,
    actorAgentKind,
    actorLabel,
    ownerProfileId,
  });
  const provenanceClient = supabase as any;
  const { data: existingAgent, error: existingAgentError } = await provenanceClient
    .from("moral_trade_provenance_agents")
    .select("id")
    .eq("owner_profile_id", ownerProfileId)
    .eq("agent_key", agentRow.agent_key)
    .maybeSingle();

  if (existingAgentError) {
    return { error: existingAgentError as PostgrestError, id: null };
  }

  if (existingAgent?.id) {
    return { error: null, id: String(existingAgent.id) };
  }

  const { data: insertedAgent, error: insertedAgentError } = await provenanceClient
    .from("moral_trade_provenance_agents")
    .insert(agentRow)
    .select("id")
    .single();

  if (!insertedAgentError && insertedAgent?.id) {
    return { error: null, id: String(insertedAgent.id) };
  }

  if (isMoralTradeOfferCreateProvenanceUniqueViolation(insertedAgentError)) {
    const { data: racedAgent, error: racedAgentError } = await provenanceClient
      .from("moral_trade_provenance_agents")
      .select("id")
      .eq("owner_profile_id", ownerProfileId)
      .eq("agent_key", agentRow.agent_key)
      .maybeSingle();

    if (racedAgent?.id && !racedAgentError) {
      return { error: null, id: String(racedAgent.id) };
    }

    return { error: racedAgentError ?? insertedAgentError, id: null };
  }

  return { error: insertedAgentError as PostgrestError, id: null };
}

async function persistMoralTradeAgreementReviewProtocolProvenance({
  actorAgentId,
  actorAgentKind,
  actorLabel,
  currentAgreement,
  currentReviewCase,
  disputeRecordCreated,
  evidenceReviewReadiness,
  nextReviewCaseStatus,
  protocolTransitionRecordedAt,
  publicReasoningSummary,
  reviewerConfidence,
  reviewerNotes,
  reviewScope,
  supabase,
}: {
  actorAgentId: string;
  actorAgentKind: "operator" | "external_reviewer";
  actorLabel: string;
  currentAgreement: AgreementRow;
  currentReviewCase: AgreementReviewCaseRow;
  disputeRecordCreated: boolean;
  evidenceReviewReadiness: NonNullable<
    Parameters<typeof validateAgreementReviewProtocolTransition>[0]["evidenceReviewReadiness"]
  >;
  nextReviewCaseStatus: AgreementReviewCaseRow["status"];
  protocolTransitionRecordedAt: string;
  publicReasoningSummary: string;
  reviewerConfidence: number;
  reviewerNotes: string;
  reviewScope: string;
  supabase: SupabaseServerClient;
}) {
  const ownerProfileIds = [
    currentAgreement.proposer_id,
    currentAgreement.responder_id,
  ].filter((profileId, index, profileIds) => profileIds.indexOf(profileId) === index);
  let firstTransition: ReturnType<typeof validateAgreementReviewProtocolTransition> | null = null;

  for (const ownerProfileId of ownerProfileIds) {
    const agent = await getOrCreateMoralTradeAgreementReviewProvenanceAgentId({
      actorAgentId,
      actorAgentKind,
      actorLabel,
      ownerProfileId,
      supabase,
    });

    if (!agent.id || agent.error) {
      return {
        error: agent.error,
        transition: firstTransition,
      };
    }

    const transition = validateAgreementReviewProtocolTransition({
      actorAgentId: agent.id,
      actorAgentKind,
      currentCompletionState: currentAgreement.completion_state,
      currentReviewCaseStatus: currentReviewCase.status,
      disputeRecordCreated,
      evidenceReviewReadiness,
      generatedEntityIds: [`review_decision:${currentReviewCase.id}`],
      hasEvidenceItem: evidenceReviewReadiness.hasEvidenceItem,
      humanReviewApproved: true,
      idempotencyKey: [
        "agreement-review",
        currentReviewCase.id,
        ownerProfileId,
        currentReviewCase.status,
        nextReviewCaseStatus,
        protocolTransitionRecordedAt,
      ].join(":"),
      nextReviewCaseStatus,
      recordedAt: protocolTransitionRecordedAt,
      reviewerConfidence,
      subjectId: currentAgreement.id,
      subjectKind: "agreement",
      terms: {
        source: currentAgreement.source,
        notes: currentAgreement.notes,
        structuredTerms: currentAgreement.structured_terms,
        noTradeBaseline: currentAgreement.no_trade_baseline,
        counterfactualDeclaration: currentAgreement.counterfactual_declaration,
        durationTerms: currentAgreement.duration_terms,
        exitConditions: currentAgreement.exit_conditions,
        evidenceRule: currentAgreement.evidence_rule,
        privacyScope: currentAgreement.privacy_scope,
        disclosureScope: currentAgreement.disclosure_scope,
      },
      usedEntityIds: [
        currentAgreement.id,
        `review_case:${currentReviewCase.id}`,
        ...(currentReviewCase.evidence_item_id
          ? [`evidence_item:${currentReviewCase.evidence_item_id}`]
          : []),
      ],
    });

    firstTransition ??= transition;

    if (transition.status === "fail") {
      return {
        error: new Error(
          `Agreement review protocol provenance transition failed: ${transition.blockers.join(", ")}`,
        ),
        transition,
      };
    }

    if (!transition.transitionEventRecord) {
      continue;
    }

    const rows = buildAgreementReviewProvenanceRows({
      actorProvenanceAgentId: agent.id,
      agreementId: currentAgreement.id,
      ownerProfileId,
      reviewCaseId: currentReviewCase.id,
      transitionEventRecord: transition.transitionEventRecord,
    });
    const selectors = buildAgreementReviewProvenanceConflictSelectors(rows);
    const reviewDecisionRow = buildAgreementReviewDecisionRow({
      agreementId: currentAgreement.id,
      evidenceReviewReadiness,
      nextReviewCaseStatus,
      ownerProfileId,
      publicReasoningSummary,
      reviewCaseId: currentReviewCase.id,
      reviewerAgentId: agent.id,
      reviewerNotes,
      reviewScope,
      transitionEventRecord: transition.transitionEventRecord,
    });
    const reviewDecisionError = await insertMoralTradeProtocolPersistenceRow({
      row: reviewDecisionRow,
      selector: buildAgreementReviewDecisionConflictSelector(reviewDecisionRow),
      supabase,
    });

    if (reviewDecisionError) {
      return { error: reviewDecisionError, transition };
    }

    const activityError = await insertMoralTradeProtocolPersistenceRow({
      row: rows.provenanceActivity,
      selector: selectors.provenanceActivity,
      supabase,
    });

    if (activityError) {
      return { error: activityError, transition };
    }

    const transitionError = await insertMoralTradeProtocolPersistenceRow({
      row: rows.stateTransitionEvent,
      selector: selectors.stateTransitionEvent,
      supabase,
    });

    if (transitionError) {
      return { error: transitionError, transition };
    }
  }

  return {
    error: null,
    transition: firstTransition,
  };
}

async function readAttributionPayload() {
  const cookieStore = await cookies();
  if (isAnalyticsOptedOut(cookieStore.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value)) {
    return null;
  }

  return parseAttributionCookie(cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value);
}

async function recordServerFunnelEvent({
  eventType,
  metadata = {},
  path,
  profileId,
  supabase,
}: {
  eventType: FunnelEventType;
  metadata?: Record<string, unknown>;
  path: string;
  profileId: string | null;
  supabase: SupabaseServerClient;
}) {
  const cookieStore = await cookies();

  if (isAnalyticsOptedOut(cookieStore.get(ANALYTICS_OPT_OUT_COOKIE_NAME)?.value)) {
    return;
  }

  const attribution = await readAttributionPayload();
  const eventRecord = buildPrivacySafeFunnelEventRecord({
    attribution,
    eventType,
    metadata,
    path,
    profileId,
  });
  const { error } = await (supabase as any).from("funnel_events").insert(eventRecord);

  if (error) {
    logSupabaseActionError("Failed to record funnel event", error, {
      eventType,
      profileId,
    });
  }
}

async function persistCohortAttribution({
  lastPath,
  profileId,
  supabase,
}: {
  lastPath: string;
  profileId: string;
  supabase: SupabaseServerClient;
}) {
  const attribution = await readAttributionPayload();

  if (!attribution) {
    return;
  }

  const { error } = await (supabase as any)
    .from("cohort_attributions")
    .upsert(
      {
        anonymous_id: attribution.anonymousId,
        first_path: attribution.firstPath,
        first_seen_at: attribution.firstSeenAt || new Date().toISOString(),
        last_path: lastPath || attribution.lastPath,
        partner_slug: attribution.partnerSlug,
        profile_id: profileId,
        referral_code: attribution.referralCode,
        referrer: attribution.referrer,
        utm_campaign: attribution.utmCampaign,
        utm_content: attribution.utmContent,
        utm_medium: attribution.utmMedium,
        utm_source: attribution.utmSource,
        utm_term: attribution.utmTerm,
      },
      { onConflict: "profile_id" },
    );

  if (error) {
    logSupabaseActionError("Failed to persist cohort attribution", error, {
      profileId,
    });
  }
}

async function subscribeEmailNurture({
  email,
  nextStep,
  profileId,
  segment,
  source,
  supabase,
}: {
  email: string;
  nextStep: string;
  profileId: string | null;
  segment: string;
  source: string;
  supabase: SupabaseServerClient;
}) {
  if (!email) {
    return;
  }

  const attribution = await readAttributionPayload();
  const { error } = await (supabase as any)
    .from("email_nurture_subscriptions")
    .upsert(
      {
        attribution: attribution ?? {},
        email,
        next_step: nextStep,
        profile_id: profileId,
        segment,
        source,
        status: "subscribed",
      },
      { ignoreDuplicates: true, onConflict: "email,segment" },
    );

  if (error) {
    logSupabaseActionError("Failed to save email nurture subscription", error, {
      email,
      segment,
    });
  }
}

function enforceActionRateLimit({
  key,
  limit,
  message,
  returnTo,
  windowMs,
}: {
  key: string;
  limit: number;
  message: string;
  returnTo: string;
  windowMs: number;
}) {
  const result = takeRateLimitSlot(key, { limit, windowMs });

  if (result.limited) {
    redirectWithMessage(returnTo, "error", message);
  }
}

async function queueEmailOutbox({
  profileId,
  recipientEmail,
  subject,
  body,
}: {
  profileId: string;
  recipientEmail: string | null | undefined;
  subject: string;
  body: string;
}) {
  if (!recipientEmail) {
    return;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("email_outbox").insert({
    profile_id: profileId,
    recipient_email: recipientEmail,
    subject,
    body,
  });

  if (error) {
    logSupabaseActionError("Failed to queue email notification", error, {
      profileId,
      recipientEmail,
    });
  }
}

async function requireAdminViewer(returnTo: string) {
  const viewer = await requireViewer(returnTo);

  if (!isAdminEmail(viewer.authUser.email)) {
    redirectWithMessage(returnTo, "error", "Admin access is required.");
  }

  const adminMfaSummary = await loadBackgroundAccountSecuritySummary();
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: adminMfaSummary,
  });

  if (!adminAccess.allowed) {
    redirectWithMessage(returnTo, "error", adminAccess.message);
  }

  return viewer;
}

function normalizeOfferMode(value: string) {
  if (value === "offset" || value === "payment") {
    return value;
  }

  return "pledge";
}

function readBoundedInt(
  formData: FormData,
  key: string,
  {
    fallback,
    min,
    max,
  }: {
    fallback: number;
    min: number;
    max: number;
  },
) {
  const rawValue = String(formData.get(key) ?? "").trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsedValue)));
}

function convertUsdToCents(amountUsd: number | null | undefined) {
  if (!Number.isFinite(amountUsd ?? NaN) || !amountUsd || amountUsd <= 0) {
    return 0;
  }

  return Math.round(Number(amountUsd) * 100);
}

function normalizeDonationOffsetTimeHorizon(value: string): DonationOffsetTimeHorizon {
  return value === "recurring" ? "recurring" : "one_off";
}

function normalizeDonationOffsetVerificationMethod(value: string): DonationOffsetVerificationMethod {
  if (
    value === "proof_of_past_donations" ||
    value === "receipts_uploaded" ||
    value === "funds_in_escrow" ||
    value === "third_party_audit"
  ) {
    return value;
  }

  return "proof_of_past_donations";
}

function getDonationOffsetEvidencePersistenceShape(
  verificationMethod: DonationOffsetVerificationMethod,
) {
  switch (verificationMethod) {
    case "funds_in_escrow":
      return {
        claimScope: "payment_or_donation_record" as const,
        evidenceKind: "payment_event" as const,
        reasonCodes: ["donation_offset_evidence", "third_party_payment_record"],
      };
    case "third_party_audit":
      return {
        claimScope: "factual_action" as const,
        evidenceKind: "attestation" as const,
        reasonCodes: ["donation_offset_evidence", "third_party_audit"],
      };
    case "proof_of_past_donations":
      return {
        claimScope: "counterfactual_baseline" as const,
        evidenceKind: "prior_intent" as const,
        reasonCodes: ["donation_offset_evidence", "counterfactual_baseline"],
      };
    case "receipts_uploaded":
    default:
      return {
        claimScope: "payment_or_donation_record" as const,
        evidenceKind: "receipt" as const,
        reasonCodes: ["donation_offset_evidence", "receipt_or_public_log"],
      };
  }
}

function normalizeDonationOffsetUnmatchedRule(value: string): DonationOffsetUnmatchedSurplusRule {
  if (
    value === "donate_to_compromise_destination" ||
    value === "donate_to_original_cause" ||
    value === "split_evenly"
  ) {
    return value;
  }

  return "return_to_donors";
}

function normalizeDonationOffsetParticipationMode(value: string): DonationOffsetParticipationMode {
  return value === "pool" ? "pool" : "direct";
}

function normalizeDonationOffsetPoolSide(value: string): DonationOffsetPoolSide | "" {
  if (value === "side_a" || value === "side_b") {
    return value;
  }

  return "";
}

function performanceBondFormKey(prefix: string, key: string) {
  return `${prefix}_${key}`;
}

function readPerformanceBondTermsFromForm({
  fallbackAdditionality,
  fallbackNoTradeBaseline,
  formData,
  prefix,
}: {
  fallbackAdditionality: string;
  fallbackNoTradeBaseline: string;
  formData: FormData;
  prefix: string;
}) {
  const field = (key: string) => performanceBondFormKey(prefix, key);
  const enabled = readBoolean(formData, field("enabled"));
  const forfeitureDestination = normalizePerformanceBondForfeitureDestination(
    readOptional(formData, field("forfeiture_destination")),
  );
  const splitConfig = parsePerformanceBondSplitConfig({
    counterpartyPercent: readOptional(formData, field("counterparty_percent")),
    mpgfPercent: readOptional(formData, field("mpgf_percent")),
    neutralCausePercent: readOptional(formData, field("neutral_cause_percent")),
  });
  const evidenceSchema = normalizePerformanceBondEvidenceSchema({
    acceptedEvidenceTypes: readOptional(formData, field("evidence_types")),
    actionToProve: readOptional(formData, field("action_to_prove")),
    minimumDetail: readOptional(formData, field("minimum_detail")),
    privateEvidenceAllowed: readBoolean(formData, field("private_evidence_allowed")),
    reviewStandard: readOptional(formData, field("review_standard")),
    templateKey: readOptional(formData, field("schema_template")),
    visibility: readOptional(formData, field("visibility")),
  });
  const terms: PerformanceBondTermsInput = {
    additionalityStatement:
      readOptional(formData, field("additionality_statement")) || fallbackAdditionality,
    amountCents: readMoneyCents(formData, field("amount_usd")),
    challengeWindowDays: normalizePerformanceBondChallengeWindowDays(
      readOptional(formData, field("challenge_window_days")),
    ),
    counterpartyPayoutConsent: readBoolean(formData, field("counterparty_payout_consent")),
    currency: normalizePerformanceBondCurrency(
      readOptional(formData, field("currency")) || PERFORMANCE_BOND_DEFAULT_CURRENCY,
    ),
    enabled,
    evidenceDueAt: enabled ? parseOptionalTimestamp(readOptional(formData, field("evidence_due_at"))) : null,
    evidenceSchema,
    forfeitureDestination,
    noTradeBaseline:
      readOptional(formData, field("no_trade_baseline")) || fallbackNoTradeBaseline,
    splitConfig: forfeitureDestination === "split" ? splitConfig : getDefaultPerformanceBondSplitConfig(),
  };

  return {
    enabled,
    forfeitureDestinationId: readOptional(formData, field("forfeiture_destination_id")) || null,
    terms,
  };
}

function buildDraftPerformanceBondPayload({
  counterpartyId,
  forfeitureDestinationId,
  interestId,
  offerId,
  partyId,
  side,
  terms,
}: {
  counterpartyId: string | null;
  forfeitureDestinationId: string | null;
  interestId: string | null;
  offerId: string;
  partyId: string;
  side: PerformanceBondSide;
  terms: PerformanceBondTermsInput;
}): PerformanceBondInsert {
  const forfeitureDestination = normalizePerformanceBondForfeitureDestination(
    terms.forfeitureDestination,
  );

  return {
    additionality_statement: terms.additionalityStatement.trim(),
    amount_cents: terms.amountCents,
    challenge_window_days: terms.challengeWindowDays as 7 | 14 | 30,
    counterparty_id: counterpartyId,
    counterparty_payout_consent: terms.counterpartyPayoutConsent,
    currency: normalizePerformanceBondCurrency(terms.currency),
    enabled: terms.enabled,
    evidence_due_at: terms.evidenceDueAt,
    evidence_schema: evidenceSchemaToJson(terms.evidenceSchema),
    forfeiture_destination: forfeitureDestination,
    forfeiture_destination_id:
      forfeitureDestination === "compromise_charity" ? forfeitureDestinationId : null,
    forfeiture_rule: getPerformanceBondForfeitureRule(forfeitureDestination),
    funding_status: "awaiting_funding",
    interest_id: interestId,
    no_trade_baseline: terms.noTradeBaseline.trim(),
    offer_id: offerId,
    party_id: partyId,
    payment_provider: PERFORMANCE_BOND_MANUAL_PROVIDER,
    reviewer_policy: PERFORMANCE_BOND_REVIEWER_POLICY,
    side,
    split_config: splitConfigToJson(terms.splitConfig),
    status: "draft",
  };
}

async function upsertDraftPerformanceBond({
  counterpartyId,
  forfeitureDestinationId,
  interestId,
  offerId,
  partyId,
  returnTo,
  side,
  supabase,
  terms,
}: {
  counterpartyId: string | null;
  forfeitureDestinationId: string | null;
  interestId: string | null;
  offerId: string;
  partyId: string;
  returnTo: string;
  side: PerformanceBondSide;
  supabase: ReturnType<typeof createServiceClient>;
  terms: PerformanceBondTermsInput;
}) {
  const lookup = supabase
    .from("performance_bonds")
    .select("*")
    .eq("offer_id", offerId)
    .eq("side", side);
  const { data: existing, error: existingError } = interestId
    ? await lookup.eq("interest_id", interestId).maybeSingle()
    : await lookup.maybeSingle();

  if (existingError) {
    redirectWithMessage(returnTo, "error", existingError.message);
  }

  const existingBond = existing as PerformanceBondRow | null;
  if (existingBond?.locked_at) {
    redirectWithMessage(returnTo, "error", "Pledge performance bond terms are locked after acceptance.");
  }

  if (!terms.enabled) {
    if (existingBond) {
      try {
        await cancelPerformanceBondDraft({
          actorId: partyId,
          bondId: existingBond.id,
          supabase,
        });
      } catch (error) {
        redirectWithMessage(
          returnTo,
          "error",
          error instanceof Error ? error.message : "Unable to cancel pledge performance bond.",
        );
      }
    }

    return null;
  }

  const validation = validatePerformanceBondTerms(terms, getPerformanceBondConfig());
  if (validation.errors.length) {
    redirectWithMessage(returnTo, "error", validation.errors[0] ?? "Complete the pledge performance bond fields.");
  }

  if (!existingBond) {
    try {
      return await createPerformanceBond({
        counterpartyId,
        forfeitureDestinationId,
        interestId,
        offerId,
        partyId,
        side,
        supabase,
        terms,
      });
    } catch (error) {
      redirectWithMessage(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to create pledge performance bond.",
      );
    }
  }

  const {
    created_at: _createdAt,
    id: _id,
    offer_id: _offerId,
    party_id: _partyId,
    side: _side,
    ...payload
  } = buildDraftPerformanceBondPayload({
    counterpartyId,
    forfeitureDestinationId,
    interestId,
    offerId,
    partyId,
    side,
    terms,
  });
  const updatePayload: PerformanceBondUpdate = payload;
  const { data, error } = await supabase
    .from("performance_bonds")
    .update(updatePayload)
    .eq("id", existingBond.id)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error || !data) {
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to update pledge performance bond.");
  }

  return data as PerformanceBondRow;
}

const blockedWishPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(kill|murder|assault|poison|bomb|terror|weaponize)\b/i, label: "violence" },
  { pattern: /\b(harass|stalk|dox|doxx|blackmail|extort|threaten)\b/i, label: "coercion or harassment" },
  { pattern: /\b(fraud|scam|bribe|hack|steal|illegal|launder)\b/i, label: "illegal or deceptive action" },
  { pattern: /\b(exploit|traffick|groom|abuse)\b/i, label: "exploitative ask" },
];

function detectBlockedWishText(values: string[]) {
  const combined = values.join("\n");

  for (const { pattern, label } of blockedWishPatterns) {
    if (pattern.test(combined)) {
      return label;
    }
  }

  return null;
}

function truncateText(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function normalizeMatchToken(value: string) {
  return value.trim().toLowerCase();
}

function formatCauseList(causes: string[]) {
  if (!causes.length) {
    return "open moral priorities";
  }

  if (causes.length === 1) {
    return causes[0];
  }

  return `${causes.slice(0, -1).join(", ")} and ${causes[causes.length - 1]}`;
}

function buildBroadWishPreview({
  causes,
  openToPayment,
  openToPledges,
}: {
  causes: string[];
  openToPayment: boolean;
  openToPledges: boolean;
}) {
  const tradeForms = [
    openToPayment ? "payment-mediated trades" : "",
    openToPledges ? "pledge-based trades" : "",
  ].filter(Boolean);

  return truncateText(
    `Interested in moral trades around ${formatCauseList(causes)}${
      tradeForms.length ? `; open to ${tradeForms.join(" and ")}` : ""
    }.`,
    220,
  );
}

function inferTradeMode({
  openToPayment,
  openToPledges,
  tradeShape,
}: {
  openToPayment: boolean;
  openToPledges: boolean;
  tradeShape: string;
}) {
  const normalizedShape = tradeShape.toLowerCase();

  if (openToPayment || normalizedShape.includes("paid")) {
    return "payment";
  }

  if (openToPledges || normalizedShape.includes("pledge")) {
    return "pledge";
  }

  if (normalizedShape.includes("donation")) {
    return "donation";
  }

  return "open";
}

function normalizeParticipantKind(value: string) {
  if (value === "collective" || value === "institution") {
    return value;
  }

  return "individual";
}

function normalizePrivacyStage(value: string) {
  if (value === "strict" || value === "limited") {
    return value;
  }

  return "broad";
}

function normalizeMatchFrequency(value: string) {
  if (value === "manual" || value === "monthly") {
    return value;
  }

  return "weekly";
}

function normalizeDelegateMode(value: string): PersonalDelegateInsert["operating_mode"] {
  if (value === "active" || value === "paused") {
    return value;
  }

  return "passive";
}

function normalizeDelegateRiskTolerance(value: string): PersonalDelegateInsert["risk_tolerance"] {
  if (value === "moderate" || value === "exploratory") {
    return value;
  }

  return "conservative";
}

function normalizeIntroductionPolicy(value: string): PersonalDelegateInsert["introduction_policy"] {
  if (value === "auto_draft_only") {
    return value;
  }

  return "ask_each_time";
}

function normalizeSourceConnectionProvider(value: string): SourceConnectionInsert["provider"] {
  if (
    value === "social" ||
    value === "blog" ||
    value === "email" ||
    value === "calendar" ||
    value === "chat_history" ||
    value === "search_profile" ||
    value === "other"
  ) {
    return value;
  }

  return "manual";
}

function normalizeSourceImportMode(
  value: string,
): SourceConnectionInsert["import_mode"] {
  if (value === "manual_paste" || value === "rss_pull" || value === "forwarded_note") {
    return value;
  }

  return "manual_review";
}

function normalizeSourceSyncFrequency(
  value: string,
): SourceConnectionInsert["sync_frequency"] {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return "manual";
}

function normalizeSourceAccessStatus(value: string): SourceConnectionInsert["access_status"] {
  if (value === "connected" || value === "revoked" || value === "needs_review") {
    return value;
  }

  return "not_connected";
}

function normalizeHelperKind(value: string): HelperStrategyInsert["helper_kind"] {
  if (
    value === "payment_compatibility" ||
    value === "geographic" ||
    value === "network_expansion" ||
    value === "saved_search" ||
    value === "risk_filter"
  ) {
    return value;
  }

  return "cause_overlap";
}

function normalizePrivacyGrantStatus(value: string): PrivacyGrantInsert["status"] {
  if (value === "granted" || value === "revoked") {
    return value;
  }

  return "draft";
}

function normalizeBrokerageTargetKind(
  value: string,
): Database["public"]["Tables"]["brokerage_bounties"]["Insert"]["target_kind"] {
  if (value === "group" || value === "institution" || value === "public_call") {
    return value;
  }

  return "counterparty";
}

function normalizeBrokerageRewardType(
  value: string,
): Database["public"]["Tables"]["brokerage_bounties"]["Insert"]["reward_type"] {
  if (
    value === "verified_trade" ||
    value === "group_formation" ||
    value === "research_lead"
  ) {
    return value;
  }

  return "introduction";
}

function normalizeCollectiveVerificationStatus(
  value: string,
): Database["public"]["Tables"]["collectives"]["Insert"]["verification_status"] {
  if (value === "review_pending" || value === "verified") {
    return value;
  }

  return "unverified";
}

function normalizeNetworkInviteTargetKind(
  value: string,
): Database["public"]["Tables"]["network_invites"]["Insert"]["target_kind"] {
  if (
    value === "collective" ||
    value === "institution" ||
    value === "community" ||
    value === "public_call"
  ) {
    return value;
  }

  return "person";
}

function normalizeSourceType(value: string) {
  if (
    value === "social" ||
    value === "blog" ||
    value === "chat_history" ||
    value === "email" ||
    value === "calendar" ||
    value === "other"
  ) {
    return value;
  }

  return "manual";
}

function normalizeSourceContentKind(
  value: string,
): ProfileSourceInsert["content_kind"] {
  if (
    value === "pasted_excerpt" ||
    value === "public_post" ||
    value === "email_note" ||
    value === "chat_note" ||
    value === "calendar_note"
  ) {
    return value;
  }

  return "manual_summary";
}

function normalizeCollectiveDecisionType(
  value: string,
): CollectiveDecisionInsert["decision_type"] {
  if (
    value === "match_review" ||
    value === "privacy_grant" ||
    value === "bounty_award" ||
    value === "verification_request"
  ) {
    return value;
  }

  return "general";
}

function normalizeCollectiveDecisionTargetKind(
  value: string,
): CollectiveDecisionInsert["target_kind"] {
  if (value === "collective" || value === "bounty" || value === "privacy_grant" || value === "internal") {
    return value;
  }

  return "match";
}

function normalizeCollectiveDecisionResponse(
  value: string,
): CollectiveDecisionResponseInsert["response"] {
  if (value === "reject" || value === "abstain") {
    return value;
  }

  return "approve";
}

function normalizeCollectiveMemberRole(
  value: string,
): CollectiveMemberInsert["role"] {
  if (value === "owner" || value === "admin" || value === "viewer") {
    return value;
  }

  return "member";
}

function normalizeCollectiveMemberStatus(
  value: string,
): CollectiveMemberInsert["status"] {
  if (value === "active" || value === "removed") {
    return value;
  }

  return "invited";
}

function parseOptionalTimestamp(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function readOptionalExpiryTimestamp(
  formData: FormData,
  {
    fallbackDays = 0,
    key = "expires_in_days",
  }: {
    fallbackDays?: number;
    key?: string;
  } = {},
) {
  const explicitExpiresAt = parseOptionalTimestamp(readOptional(formData, "expires_at"));

  if (explicitExpiresAt) {
    return explicitExpiresAt;
  }

  const expiresInDays = readBoundedInt(formData, key, {
    fallback: fallbackDays,
    min: 0,
    max: 3650,
  });

  if (!expiresInDays) {
    return null;
  }

  return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
}

function buildHelperStrategyConfig(formData: FormData) {
  const focusCauses = readStringList(formData, "focus_causes_json");
  const requiredTerms = readStringList(formData, "required_terms_json");
  const preferredRegions = readStringList(formData, "preferred_regions_json");

  return {
    focusCauses,
    maxMissingFields: readBoundedInt(formData, "max_missing_fields", {
      fallback: 9,
      min: 0,
      max: 12,
    }),
    notes: readOptional(formData, "strategy_notes"),
    preferredRegions,
    preferExistingSources: readBoolean(formData, "prefer_existing_sources"),
    requireCollectiveApproval: readBoolean(formData, "require_collective_approval"),
    requiredTerms,
    requireCollective: readBoolean(formData, "require_collective"),
    requirePayment: readBoolean(formData, "require_payment"),
    requirePledges: readBoolean(formData, "require_pledges"),
    requireVerification: readBoolean(formData, "require_verification"),
    respectStrictPrivacy: readBoolean(formData, "respect_strict_privacy"),
  };
}

function normalizeCurrency(value: string) {
  const normalized = value.trim().toLowerCase();

  return /^[a-z]{3}$/.test(normalized) ? normalized : "usd";
}

function normalizePaymentCadenceUnit(value: string) {
  if (
    value === "one_time" ||
    value === "day" ||
    value === "month" ||
    value === "year" ||
    value === "custom_days"
  ) {
    return value;
  }

  return "one_time";
}

function normalizePaymentScheduleUnit(
  value: string,
): AgreementPaymentScheduleInsert["cadence_interval_unit"] {
  if (value === "month" || value === "year" || value === "custom_days") {
    return value;
  }

  return "day";
}

function computeNextDueAt({
  cadenceValue,
  cadenceUnit,
  startDate,
}: {
  cadenceValue: number;
  cadenceUnit: AgreementPaymentScheduleInsert["cadence_interval_unit"];
  startDate?: string;
}) {
  const baseDate = startDate ? new Date(startDate) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString();
  }

  if (cadenceUnit === "month") {
    baseDate.setMonth(baseDate.getMonth() + cadenceValue);
  } else if (cadenceUnit === "year") {
    baseDate.setFullYear(baseDate.getFullYear() + cadenceValue);
  } else {
    baseDate.setDate(baseDate.getDate() + cadenceValue);
  }

  return baseDate.toISOString();
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function addDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeAgreementEventType(value: string): AgreementEventInsert["event_type"] {
  if (
    value === "counterproposal" ||
    value === "verification_submitted" ||
    value === "cancellation_requested" ||
    value === "dispute_opened" ||
    value === "status_change" ||
    value === "payment_update" ||
    value === "terms_updated" ||
    value === "evidence_submitted" ||
    value === "review_status_changed" ||
    value === "challenge_opened" ||
    value === "appeal_requested" ||
    value === "verification_badge_updated"
  ) {
    return value;
  }

  return "note";
}

function normalizeAgreementStatus(value: string): Database["public"]["Enums"]["agreement_status"] {
  if (value === "proposed" || value === "completed" || value === "cancelled") {
    return value;
  }

  return "active";
}

function normalizeAgreementCompletionState(value: string): NonNullable<AgreementUpdate["completion_state"]> {
  if (
    value === "under_review" ||
    value === "challenge_window_open" ||
    value === "reviewed_complete" ||
    value === "disputed_unresolved"
  ) {
    return value;
  }

  return "pending_evidence";
}

function normalizeEvidenceTradeType(value: string): NonNullable<AgreementEvidenceItemInsert["trade_type"]> {
  if (
    value === "donation_offset" ||
    value === "mpgf" ||
    value === "paid_action" ||
    value === "other"
  ) {
    return value;
  }

  return "pledge_swap";
}

function normalizeEvidenceType(value: string): NonNullable<AgreementEvidenceItemInsert["evidence_type"]> {
  if (
    value === "receipt" ||
    value === "provider_record" ||
    value === "public_log" ||
    value === "timestamped_commitment" ||
    value === "third_party_review" ||
    value === "other"
  ) {
    return value;
  }

  return "manual_attestation";
}

type AgreementEvidencePersistenceShape = {
  claimScope: MoralTradeEvidenceClaimScope;
  evidenceKind: MoralTradeEvidenceClaimType;
  reasonCodes: string[];
};

function getAgreementEvidencePersistenceShape({
  evidenceType,
  tradeType,
}: {
  evidenceType: NonNullable<AgreementEvidenceItemInsert["evidence_type"]>;
  tradeType: NonNullable<AgreementEvidenceItemInsert["trade_type"]>;
}): AgreementEvidencePersistenceShape {
  const evidenceKind: MoralTradeEvidenceClaimType =
    evidenceType === "receipt"
      ? "receipt"
      : evidenceType === "provider_record"
        ? "payment_event"
        : evidenceType === "public_log"
          ? "public_log"
          : evidenceType === "timestamped_commitment"
            ? "prior_intent"
            : "attestation";
  const paymentLikeTrade =
    tradeType === "donation_offset" || tradeType === "mpgf" || tradeType === "paid_action";
  const claimScope: MoralTradeEvidenceClaimScope =
    evidenceType === "timestamped_commitment"
      ? "counterfactual_baseline"
      : evidenceType === "third_party_review"
        ? "externality_review"
        : (evidenceType === "receipt" || evidenceType === "provider_record") && paymentLikeTrade
          ? "payment_or_donation_record"
          : "factual_action";

  return {
    claimScope,
    evidenceKind,
    reasonCodes: [
      "agreement_evidence",
      `agreement_${tradeType}`,
      `evidence_${evidenceType}`,
      claimScope,
    ],
  };
}

function normalizeReviewCaseStatus(value: string): NonNullable<AgreementReviewCaseUpdate["status"]> {
  if (
    value === "under_review" ||
    value === "challenge_window_open" ||
    value === "reviewed_complete" ||
    value === "disputed_unresolved" ||
    value === "appealed" ||
    value === "closed"
  ) {
    return value;
  }

  return "open";
}

function normalizeReviewerRole(value: string): NonNullable<AgreementReviewCaseUpdate["reviewer_role"]> {
  if (value === "validator" || value === "external_reviewer" || value === "admin") {
    return value;
  }

  return "operator";
}

function normalizeVerificationBadgeType(value: string): ProfileVerificationBadgeInsert["badge_type"] {
  if (
    value === "organization_verified" ||
    value === "payment_evidence_verified" ||
    value === "completion_reviewed" ||
    value === "repeat_counterparty"
  ) {
    return value;
  }

  return "identity_verified";
}

function normalizeVerificationBadgeStatus(value: string): ProfileVerificationBadgeInsert["status"] {
  if (value === "verified" || value === "rejected" || value === "revoked") {
    return value;
  }

  return "pending";
}

function normalizeBondAdjudicationDecision(value: string): BondAdjudicationDecision {
  if (value === "reject" || value === "request_more_evidence") {
    return value;
  }

  return "accept";
}

function readMoneyCents(formData: FormData, key: string) {
  const rawValue = readRequired(formData, key).replace(/[$,\s]/g, "");
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function normalizeAccessLevel(value: string) {
  if (value === "none" || value === "metadata_only") {
    return value;
  }

  return "manual_summary";
}

async function loadParticipantAgreementOrRedirect(
  supabase: SupabaseServerClient,
  agreementId: string,
  userId: string,
  returnTo: string,
): Promise<AgreementRow> {
  const { data: agreement, error } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (error || !agreement) {
    redirectWithMessage(returnTo, "error", error?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== userId && agreement.responder_id !== userId) {
    redirectWithMessage(returnTo, "error", "You can only update your own agreement rooms.");
  }

  return agreement as AgreementRow;
}

function normalizeReportReason(value: string) {
  if (
    value === "unsafe" ||
    value === "spam" ||
    value === "privacy" ||
    value === "coercion" ||
    value === "illegal"
  ) {
    return value;
  }

  return "other";
}

function normalizeConciergeRoute(value: string): NonNullable<MatchConciergeRequestInsert["route"]> {
  if (
    value === "pledge_swap" ||
    value === "donation_offset" ||
    value === "mpgf" ||
    value === "other"
  ) {
    return value;
  }

  return "private_match";
}

function normalizeConciergeStatus(value: string): NonNullable<MatchConciergeRequestUpdate["status"]> {
  if (
    value === "triaged" ||
    value === "waiting_on_requester" ||
    value === "waiting_on_counterparty" ||
    value === "introduced" ||
    value === "declined" ||
    value === "closed"
  ) {
    return value;
  }

  return "open";
}

function getConciergeAppealResolutionTimestamp(
  appealStatus: ReturnType<typeof normalizeBackgroundConciergeAppealStatus>,
) {
  return appealStatus === "resolved" || appealStatus === "dismissed"
    ? new Date().toISOString()
    : null;
}

function buildSlaDueAt(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function buildIntroductionPlanPayloads({
  matchId,
  profileAId,
  profileBId,
  reasonForA,
  reasonForB,
  suggestedFirstStep,
  riskNotes,
}: {
  matchId: string;
  profileAId: string;
  profileBId: string;
  reasonForA: string;
  reasonForB: string;
  suggestedFirstStep: string;
  riskNotes: string;
}): MatchIntroductionPlanInsert[] {
  const sharedAgenda =
    "1. Restate the proposed trade in plain language.\n2. Name the requested action, burden, and time horizon.\n3. Name any payment or pledge cadence.\n4. List non-negotiable constraints, privacy boundaries, and exit conditions.\n5. Agree on evidence, check-ins, and who can see which facts.";
  const proposalTerms =
    "Requested action; offered consideration; cadence or duration; verification evidence; off-ramp; what remains private unless expressly granted.";
  const timeline =
    "Within 48 hours: confirm interest and missing facts. Within 7 days: exchange a bounded proposal. After agreement: schedule the first verification checkpoint.";
  const nextActions =
    "Decide whether to continue. If yes, convert the proposal into an agreement with verification, payment cadence, and cancellation terms. If no, archive the intro without revealing unnecessary details.";
  const verificationPlan =
    "Use lightweight evidence first: receipts, dated commitments, check-in notes, or mutually acceptable attestations. Escalate to admin review only when both parties think the record is unclear.";
  const privacyNotes =
    "Do not reveal contact details, exact wishes, sensitive constraints, or third-party information beyond fields each side explicitly grants.";

  return [
    {
      match_id: matchId,
      profile_id: profileAId,
      counterparty_id: profileBId,
      status: "draft",
      intro_message: truncateText(`Both sides opted in. Start from this reason: ${reasonForA}`, 520),
      proposal_outline: truncateText(suggestedFirstStep || reasonForA, 520),
      proposal_terms: proposalTerms,
      agenda: sharedAgenda,
      timeline,
      next_actions: nextActions,
      verification_plan: verificationPlan,
      privacy_notes: riskNotes ? `${privacyNotes}\nRisk note: ${riskNotes}` : privacyNotes,
    },
    {
      match_id: matchId,
      profile_id: profileBId,
      counterparty_id: profileAId,
      status: "draft",
      intro_message: truncateText(`Both sides opted in. Start from this reason: ${reasonForB}`, 520),
      proposal_outline: truncateText(suggestedFirstStep || reasonForB, 520),
      proposal_terms: proposalTerms,
      agenda: sharedAgenda,
      timeline,
      next_actions: nextActions,
      verification_plan: verificationPlan,
      privacy_notes: riskNotes ? `${privacyNotes}\nRisk note: ${riskNotes}` : privacyNotes,
    },
  ];
}

function buildIntroductionTaskPayloads({
  planId,
  profileId,
}: {
  planId: string;
  profileId: string;
}): MatchIntroductionTaskInsert[] {
  return [
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "confirm_scope",
      title: "Confirm the scope of the proposed trade",
      detail:
        "Restate what each side wants, what each side is offering, and what remains outside scope before sharing more detail.",
      sort_order: 1,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_action",
      title: "Name the requested action in bounded terms",
      detail:
        "Specify the action, burden, duration, and any material conditions so the proposal is concrete rather than aspirational.",
      sort_order: 2,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_cadence",
      title: "Set cadence, duration, and off-ramp",
      detail:
        "If money or pledges are involved, state the cadence, total duration, pauses, and what ends the arrangement.",
      sort_order: 3,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_verification",
      title: "Agree on lightweight verification",
      detail:
        "Decide what evidence, receipts, check-ins, or attestations will count, and how often they are expected.",
      sort_order: 4,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "set_privacy",
      title: "Set privacy boundaries for the introduction",
      detail:
        "Decide what can be shown to the counterparty, what stays hidden, and which disclosures require an explicit privacy grant.",
      sort_order: 5,
      status: "pending",
    },
    {
      plan_id: planId,
      profile_id: profileId,
      step_key: "decide_next_step",
      title: "Choose the next concrete step",
      detail:
        "Either convert the proposal into an agreement, request narrower information, or archive the introduction without oversharing.",
      sort_order: 6,
      status: "pending",
    },
  ];
}

function getOrderedProfilePair(profileId: string, counterpartyId: string) {
  return profileId < counterpartyId
    ? { profileAId: profileId, profileBId: counterpartyId, viewerIsProfileA: true }
    : { profileAId: counterpartyId, profileBId: profileId, viewerIsProfileA: false };
}

function getSharedCause(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalizeBackgroundToken));
  return left.find((cause) => rightSet.has(normalizeBackgroundToken(cause))) ?? null;
}

async function reserveBackgroundCandidateExposureSurface({
  candidateProfileId,
  cohortScopeId = "",
  decision,
  profileId,
  purposeBinding,
  runReason,
  serviceSupabase,
}: {
  candidateProfileId: string;
  cohortScopeId?: string;
  decision: BackgroundCandidateExposureDecision;
  profileId: string;
  purposeBinding: BackgroundPurposeBinding;
  runReason: string;
  serviceSupabase: SupabaseServerClient;
}) {
  if (!decision.allowed || !decision.budgetConfig) {
    return false;
  }

  const { data, error } = await serviceSupabase.rpc("reserve_background_candidate_exposure", {
    target_audience_scope: decision.normalizedAudienceScope,
    target_budget_version: decision.candidateBudgetVersion || BACKGROUND_CANDIDATE_BUDGET_VERSION,
    target_candidate_profile_id: candidateProfileId,
    target_cohort_scope_id: cohortScopeId,
    target_purpose_code: purposeBinding.purposeCode,
    target_purpose_policy_version: purposeBinding.purposePolicyVersion,
    target_surface_limit: decision.budgetConfig.surfaceLimit,
    target_window_days: decision.budgetConfig.windowDays,
  });

  if (error) {
    logSupabaseActionError("Failed to reserve candidate exposure budget", error, {
      candidateProfileId,
      profileId,
      runReason,
    });
    return false;
  }

  const reservation = data?.[0] ?? null;
  return Boolean(reservation?.allowed);
}

async function generateWishMatchSuggestions({
  profileId,
  causes,
  wishText,
  askText,
  offerText,
  openToPayment,
  openToPledges,
  viewerEntry,
  runReason = "profile-save",
}: {
  profileId: string;
  causes: string[];
  wishText: string;
  askText: string;
  offerText: string;
  openToPayment: boolean;
  openToPledges: boolean;
  viewerEntry: WishEntryRow | null;
  runReason?: string;
}) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const scope: BackgroundQueryScope =
    runReason === "manual-refresh" ? "manual_scan" : "profile_save_scan";
  const backgroundGeneratedBy =
    scope === "manual_scan" ? "manual-scan" : "profile-save-scan";
  const budgetReservation = await reserveBackgroundQueryBudget({
    metadata: { runReason },
    profileId,
    queryFingerprint: getBackgroundQueryFingerprint({
      askText,
      causes,
      offerText,
      openToPayment,
      openToPledges,
      runReason,
      wishText,
    }),
    scope,
    supabase: serviceSupabase,
  });

  if (budgetReservation.error) {
    logSupabaseActionError("Failed to reserve background query budget", budgetReservation.error, {
      profileId,
      runReason,
    });
  }

  if (budgetReservation.limited) {
    await recordBackgroundQueryRiskSignal({
      eventId: budgetReservation.eventId,
      metadata: {
        limit: budgetReservation.limit,
        runReason,
        scope,
        used: budgetReservation.used,
      },
      profileId,
      signalType: "background_query_budget_pressure",
      summary:
        "Background networking scan was skipped because this profile reached its daily query budget.",
      supabase: serviceSupabase,
    });

    return {
      budgetLimited: true,
      candidatesScanned: 0,
      matchesCreated: 0,
      matchesRefreshed: 0,
    };
  }

  const [{ data: previews, error }, { data: viewerProfile }, { data: viewerSynthesis }] =
    await Promise.all([
      supabase
        .from("wish_profile_previews")
        .select("*")
        .neq("profile_id", profileId)
        .eq("background_search_enabled", true)
        .limit(40),
      supabase.from("wish_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
      serviceSupabase.from("profile_syntheses").select("*").eq("profile_id", profileId).maybeSingle(),
    ]);

  if (error || !viewerProfile) {
    logSupabaseActionError("Failed to load wish previews for match generation", error, {
      profileId,
    });
    return {
      budgetLimited: false,
      candidatesScanned: 0,
      matchesCreated: 0,
      matchesRefreshed: 0,
    };
  }

  const previewRows = (previews ?? []) as WishProfilePreviewRow[];
  const previewIds = previewRows.map((preview) => preview.profile_id);
  const [
    { data: counterpartySyntheses, error: synthesisError },
    { data: candidateProfiles, error: candidateProfileError },
  ] = previewIds.length
    ? await Promise.all([
        serviceSupabase.from("profile_syntheses").select("*").in("profile_id", previewIds),
        serviceSupabase.from("wish_profiles").select("*").in("profile_id", previewIds),
      ])
    : [
        { data: [] as ProfileSynthesisRow[], error: null },
        { data: [] as WishProfileRow[], error: null },
      ];

  if (synthesisError) {
    logSupabaseActionError("Failed to load counterparty syntheses for match generation", synthesisError, {
      profileId,
    });
  }

  if (candidateProfileError) {
    logSupabaseActionError("Failed to load candidate exposure settings for match generation", candidateProfileError, {
      profileId,
      runReason,
    });
  }

  const synthesisByProfileId = new Map(
    ((counterpartySyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      synthesis,
    ]),
  );
  const candidateProfileById = new Map(
    ((candidateProfiles ?? []) as WishProfileRow[]).map((profile) => [profile.profile_id, profile]),
  );
  const viewerSignals = getDeterministicSignalsFromSynthesis(
    (viewerSynthesis ?? null) as ProfileSynthesisRow | null,
  );
  const purposeBinding: BackgroundPurposeBinding = {
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  };
  const audienceScope = normalizeBackgroundCandidateAudienceScope("cohort_only");

  let matchesCreated = 0;
  let matchesRefreshed = 0;
  const generatedNotifications: Database["public"]["Tables"]["wish_notifications"]["Insert"][] = [];
  const explanationSnapshots: MatchExplanationSnapshotPayload[] = [];
  const opportunityBriefs: Database["public"]["Tables"]["background_opportunity_briefs"]["Insert"][] = [];

  for (const preview of previewRows) {
    const candidateExposureDecision = evaluateCandidateExposureForBackgroundRun({
      audienceScope,
      candidateProfile: candidateProfileById.get(preview.profile_id) ?? null,
      purposeBinding,
      surfaces: ["broad_profile"],
    });

    if (!candidateExposureDecision.allowed) {
      continue;
    }

    const evaluation = evaluateDeterministicMatch({
      counterparty: preview,
      counterpartySignals: getDeterministicSignalsFromSynthesis(
        synthesisByProfileId.get(preview.profile_id) ?? null,
      ),
      runLabel: runReason,
      viewer: {
        askText,
        askTerms: viewerSignals?.askTerms,
        brokeragePreference: viewerProfile.brokerage_preference,
        capabilityTags: viewerSignals?.capabilityTags,
        causes,
        collectiveName: viewerProfile.collective_name,
        locationCity: viewerProfile.location_city,
        locationRegion: viewerProfile.location_region,
        offerTerms: viewerSignals?.offerTerms,
        openToPayment,
        openToPledges,
        participantKind: viewerProfile.participant_kind,
        privacyStage: viewerProfile.privacy_stage,
        publicPreview: viewerProfile.public_preview,
        signals: viewerSignals,
        sourceCount: viewerSignals?.sourceCount,
        wishText,
      },
    });

    if (evaluation.score < 52) {
      continue;
    }

    const exposureReserved = await reserveBackgroundCandidateExposureSurface({
      candidateProfileId: preview.profile_id,
      decision: candidateExposureDecision,
      profileId,
      purposeBinding,
      runReason,
      serviceSupabase,
    });

    if (!exposureReserved) {
      continue;
    }

    const sharedCause = getSharedCause(causes, preview.causes ?? []);
    const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
      profileId,
      preview.profile_id,
    );
    const dedupeSignal = normalizeBackgroundToken(
      sharedCause ??
        evaluation.sharedTokens[0] ??
        evaluation.compatibilityTags[0] ??
        "general",
    );
    const dedupeKey = [
      profileAId,
      profileBId,
      getBackgroundQueryFingerprint({
        signal: dedupeSignal,
        version: "background-match-dedupe-v1",
      }),
    ].join(":");
    const matchBasis = [
      ...evaluation.compatibilityTags.map((tag) => `Compatibility tag: ${tag}`),
      ...(evaluation.sharedCauses.length
        ? [`Shared broad cause overlap count: ${evaluation.sharedCauses.length}`]
        : []),
      ...(evaluation.sharedTokens.length ? ["Shared broad language overlap"] : []),
      `Generated by deterministic scan: ${runReason}`,
    ];
    const { data: matchResult, error: matchError } = await supabase.rpc(
      "upsert_match_suggestion",
      {
        target_profile_a_id: profileAId,
        target_profile_b_id: profileBId,
        target_profile_a_entry_id: viewerIsProfileA ? viewerEntry?.id ?? null : null,
        target_profile_b_entry_id: viewerIsProfileA ? null : viewerEntry?.id ?? null,
        target_reason_for_a: viewerIsProfileA ? evaluation.viewerReason : evaluation.counterpartyReason,
        target_reason_for_b: viewerIsProfileA ? evaluation.counterpartyReason : evaluation.viewerReason,
        target_score: evaluation.score,
        target_dedupe_key: dedupeKey,
        target_match_basis: matchBasis,
        target_shared_causes: evaluation.sharedCauses,
        target_suggested_first_step: evaluation.suggestedFirstStep,
        target_risk_notes: evaluation.riskNotes,
        target_generated_by: backgroundGeneratedBy,
      },
    );
    const match = matchResult?.[0] ?? null;

    if (matchError || !match) {
      logSupabaseActionError("Failed to generate wish match suggestion", matchError, {
        profileId,
        counterpartyId: preview.profile_id,
      });
      continue;
    }

    const { error: ownerError } = await serviceSupabase
      .from("match_suggestions")
      .update({
        background_owner_profile_id: profileId,
        generated_by: backgroundGeneratedBy,
      })
      .eq("id", match.match_id);

    if (ownerError) {
      logSupabaseActionError("Failed to mark background match owner", ownerError, {
        matchId: match.match_id,
        profileId,
        runReason,
      });
    }

    if (match.was_created) {
      matchesCreated += 1;
      generatedNotifications.push(
        {
          profile_id: profileId,
          match_id: match.match_id,
          kind: "match",
          title: "New opportunity brief",
          body:
            "A privacy-safe opportunity brief is ready in your dashboard. Exact wishes, private asks, and contact details are still hidden.",
        },
      );
    } else {
      matchesRefreshed += 1;
    }

    explanationSnapshots.push(
      buildMatchExplanationSnapshot({
        canRevealIdentity: false,
        counterpartyConsented: false,
        generatedBy: backgroundGeneratedBy,
        matchBasis,
        matchId: match.match_id,
        profileId,
        purposeCode: purposeBinding.purposeCode,
        purposePolicyVersion: purposeBinding.purposePolicyVersion,
        riskNotes: evaluation.riskNotes,
        score: evaluation.score,
        sharedCauses: evaluation.sharedCauses,
        sourceRunId: runReason,
        sourceRunKind: scope,
        status: "suggested",
        suggestedFirstStep: evaluation.suggestedFirstStep,
        viewerConsented: false,
      }),
    );
    opportunityBriefs.push(
      buildOpportunityBriefRow({
        canRevealIdentity: false,
        candidateProfileId: preview.profile_id,
        counterpartyConsented: false,
        generatedBy: backgroundGeneratedBy,
        matchBasis,
        matchId: match.match_id,
        profileId,
        purposeCode: purposeBinding.purposeCode,
        purposePolicyVersion: purposeBinding.purposePolicyVersion,
        riskNotes: evaluation.riskNotes,
        score: evaluation.score,
        sharedCauses: evaluation.sharedCauses,
        status: "suggested",
        suggestedFirstStep: evaluation.suggestedFirstStep,
        title: "Opportunity brief: possible counterparty",
        viewerConsented: false,
      }),
    );

    const { error: auditError } = await supabase.from("match_audit_events").insert({
      match_id: match.match_id,
      actor_profile_id: profileId,
      event_type: match.was_created ? "match_created" : "match_refreshed",
      summary: buildPrivacySafeMatchAuditSummary({
        score: evaluation.score,
        sourceLabel: "Deterministic scan",
      }),
      metadata: buildPrivacySafeMatchAuditMetadata({
        compatibilityTags: evaluation.compatibilityTags,
        runReason,
        sharedCauseCount: evaluation.sharedCauses.length,
        sharedTokenCount: evaluation.sharedTokens.length,
      }),
    });

    if (auditError) {
      logSupabaseActionError("Failed to write match audit event", auditError, {
        profileId,
        matchId: match.match_id,
      });
    }
  }

  const opportunityBriefError = await upsertBackgroundOpportunityBriefs({
    briefs: opportunityBriefs,
    supabase: serviceSupabase,
  });

  if (opportunityBriefError) {
    logSupabaseActionError("Failed to save opportunity briefs", opportunityBriefError, {
      profileId,
      runReason,
    });
  }

  const snapshotError = await insertMatchExplanationSnapshots({
    snapshots: explanationSnapshots,
    supabase: serviceSupabase,
  });

  if (snapshotError) {
    logSupabaseActionError("Failed to save match explanation snapshots", snapshotError, {
      profileId,
      runReason,
    });
  }

  if (generatedNotifications.length) {
    const notificationResult = await insertWishNotificationsWithSafeEmail({
      emailSupabase: serviceSupabase,
      notifications: generatedNotifications,
      supabase: serviceSupabase,
    });

    if (notificationResult.notificationError) {
      logSupabaseActionError("Failed to create wish match notifications", notificationResult.notificationError, {
        profileId,
      });
    }

    if (notificationResult.emailError) {
      logSupabaseActionError("Failed to queue wish match email notifications", notificationResult.emailError, {
        profileId,
      });
    }
  }

  const budgetCompletionError = await completeBackgroundQueryEvent({
    candidateCount: previewRows.length,
    eventId: budgetReservation.eventId,
    metadata: {
      matchesCreated,
      matchesRefreshed,
      runReason,
      scope,
    },
    resultCount: matchesCreated + matchesRefreshed,
    supabase: serviceSupabase,
  });

  if (budgetCompletionError) {
    logSupabaseActionError("Failed to complete background query budget event", budgetCompletionError, {
      profileId,
      runReason,
    });
  }

  return {
    budgetLimited: false,
    candidatesScanned: previewRows.length,
    matchesCreated,
    matchesRefreshed,
  };
}

export async function signUpAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/walkthrough");
  const signupPath = buildAuthPath({
    method: "email",
    mode: "signup",
    returnTo,
    route: "/signup",
  });

  if (!hasSupabaseEnv()) {
    redirectWithMessage(signupPath, "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email").toLowerCase();
  const password = readRequired(formData, "password");

  if (!email || !password) {
    redirectWithMessage(signupPath, "error", "Email and password are required.");
  }

  enforceActionRateLimit({
    key: `signup:${email}`,
    limit: 5,
    message: "Too many signup attempts. Wait a few minutes before trying again.",
    returnTo: signupPath,
    windowMs: 15 * 60 * 1000,
  });

  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? getSiteUrl();
  const confirmUrl = buildSupabaseAuthCallbackUrl(origin, returnTo, "signup");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmUrl,
      data: {
        public_location_granularity: "hidden",
      },
    },
  });

  if (error) {
    redirectWithMessage(signupPath, "error", error.message);
  }

  if (data.user && data.session) {
    const { profile, profileResult } = await ensureAccountRowsForUser(data.user, supabase);
    await persistCohortAttribution({
      lastPath: returnTo,
      profileId: data.user.id,
      supabase,
    });
    await recordServerFunnelEvent({
      eventType: "signup_complete",
      metadata: { hasSession: true },
      path: returnTo,
      profileId: data.user.id,
      supabase,
    });
    await subscribeEmailNurture({
      email,
      nextStep: "Complete onboarding wizard",
      profileId: data.user.id,
      segment: "signed_up_not_activated",
      source: "signup",
      supabase,
    });
    const activationState = getAccountActivationState({
      authenticated: true,
      viewer: {
        profile,
        profileStatus: profileResult.profileStatus,
        profileSyncError: profileResult.profileSyncError,
      },
    });
    redirectWithMessage(
      getPostAuthActivationDestination(activationState, returnTo),
      "message",
      "Account created. Continue the private setup walkthrough.",
    );
  }

  await subscribeEmailNurture({
    email,
    nextStep: "Confirm email and complete onboarding",
    profileId: null,
    segment: "lead",
    source: "signup",
    supabase,
  });

  redirectWithMessage(
    buildAuthPath({ mode: "login", returnTo, route: "/login" }),
    "message",
    "Account created. Check your email to confirm your address, then sign in.",
  );
}

export async function saveOnboardingAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/onboarding");

  if (!hasSupabaseEnv()) {
    redirectWithMessage(returnTo, "error", "Supabase is not configured yet.");
  }

  const viewer = await requireViewer(returnTo);
  const primaryGoal = normalizeOnboardingGoal(readRequired(formData, "primary_goal"));
  const participantKind = normalizeCohortParticipantKind(readRequired(formData, "participant_kind"));
  const firstAction = normalizeFirstAction(readRequired(formData, "first_action"));
  const causeAreas = readRepeatedStrings(formData, "cause_area", 6);
  const inviteTarget = readOptional(formData, "invite_target");
  const referralSource = readOptional(formData, "referral_source");

  if (!causeAreas.length) {
    redirectWithMessage(returnTo, "error", "Choose at least one cause area.");
  }

  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("cohort_onboarding_profiles")
    .upsert(
      {
        cause_areas: causeAreas,
        completed_at: new Date().toISOString(),
        first_action: firstAction,
        invite_target: inviteTarget,
        participant_kind: participantKind,
        primary_goal: primaryGoal,
        profile_id: viewer.authUser.id,
        referral_source: referralSource,
        status: "completed",
      },
      { onConflict: "profile_id" },
    );

  if (error) {
    logSupabaseActionError("Failed to save cohort onboarding", error, {
      profileId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await persistCohortAttribution({
    lastPath: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });
  await recordServerFunnelEvent({
    eventType: "role_selected",
    metadata: { participantKind },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });
  await recordServerFunnelEvent({
    eventType: "cause_selected",
    metadata: { causeAreas },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });
  await recordServerFunnelEvent({
    eventType: "first_action_selected",
    metadata: {
      firstAction,
      primaryGoal,
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });
  await recordServerFunnelEvent({
    eventType: "onboarding_complete",
    metadata: {
      causeAreaCount: causeAreas.length,
      firstAction,
      participantKind,
      primaryGoal,
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });
  await subscribeEmailNurture({
    email: viewer.profile.email,
    nextStep:
      firstAction === "invite_counterparty"
        ? "Send one counterparty invite"
        : "Complete selected first action",
    profileId: viewer.authUser.id,
    segment: "signed_up_not_activated",
    source: "onboarding",
    supabase,
  });

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  redirectWithMessage(getFirstActionHref(firstAction), "message", "Onboarding saved. Start with this action.");
}

export async function createWebinarRsvpAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/cohort");

  if (!hasSupabaseEnv()) {
    redirectWithMessage(returnTo, "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email").toLowerCase();
  const displayName = readOptional(formData, "display_name");
  const role = readOptional(formData, "role");
  const community = readOptional(formData, "community");
  const sessionPreference = readOptional(formData, "session_preference") || "next_available";
  const notes = readOptional(formData, "notes");

  if (!email) {
    redirectWithMessage(returnTo, "error", "Email is required for demo RSVP.");
  }

  enforceActionRateLimit({
    key: `webinar-rsvp:${email}`,
    limit: 4,
    message: "Too many RSVP attempts. Wait a few minutes before trying again.",
    returnTo,
    windowMs: 15 * 60 * 1000,
  });

  const supabase = await createClient();
  const viewer = await getViewer();
  const attribution = await readAttributionPayload();
  const profileId = viewer?.authUser.id ?? null;
  const { error } = await (supabase as any).from("webinar_rsvps").insert({
    attribution: attribution ?? {},
    community,
    display_name: displayName || viewer?.displayName || "",
    email,
    notes,
    profile_id: profileId,
    role,
    session_preference: sessionPreference,
  });

  if (error) {
    logSupabaseActionError("Failed to save webinar RSVP", error, {
      email,
      profileId,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await recordServerFunnelEvent({
    eventType: "webinar_rsvp",
    metadata: {
      community,
      role,
      sessionPreference,
    },
    path: returnTo,
    profileId,
    supabase,
  });
  await subscribeEmailNurture({
    email,
    nextStep: "Attend founding cohort demo",
    profileId,
    segment: "lead",
    source: "webinar_rsvp",
    supabase,
  });

  revalidatePath("/cohort");
  redirectWithMessage(returnTo, "message", "RSVP saved. We will follow up with a small-group demo slot.");
}

export async function signInAction(formData: FormData) {
  const next = getSafeInternalPath(
    readOptional(formData, "next") || readOptional(formData, "return_to"),
    "/feed",
  );
  const loginPath = buildAuthPath({
    method: "email",
    mode: "login",
    returnTo: next,
    route: "/login",
  });

  if (!hasSupabaseEnv()) {
    redirectWithMessage(loginPath, "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email").toLowerCase();
  const password = readRequired(formData, "password");

  if (!email || !password) {
    redirectWithMessage(loginPath, "error", "Email and password are required.");
  }

  enforceActionRateLimit({
    key: `login:${email}`,
    limit: 8,
    message: "Too many login attempts. Wait a few minutes before trying again.",
    returnTo: loginPath,
    windowMs: 10 * 60 * 1000,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage(loginPath, "error", error.message);
  }

  let destination = next;
  if (data.user) {
    const { profile, profileResult } = await ensureAccountRowsForUser(data.user, supabase);
    const completedDestination = profileNeedsUsername(profile)
      ? buildUsernameCompletionPath(next)
      : next;
    destination = getPostAuthActivationDestination(
      getAccountActivationState({
        authenticated: true,
        viewer: {
          profile,
          profileStatus: profileResult.profileStatus,
          profileSyncError: profileResult.profileSyncError,
        },
      }),
      completedDestination,
    );
  }

  redirect(destination);
}

export async function oauthSignInAction(formData: FormData) {
  const mode = normalizeAuthMode(readOptional(formData, "mode"));
  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    getAuthDefaultReturnTo(mode),
  );
  const authPath = buildAuthPath({ mode, returnTo, route: mode === "signup" ? "/signup" : "/login" });
  const provider = normalizeOAuthProvider(readOptional(formData, "provider"));

  if (!provider) {
    redirectWithMessage(authPath, "error", "Choose a sign-in provider to continue.");
  }

  if (!(await isOAuthProviderEnabled(provider))) {
    redirectWithMessage(
      authPath,
      "error",
      `${getOAuthProviderLabel(provider)} sign-in is not enabled for this deployment. Use email instead.`,
    );
  }

  if (!hasSupabaseEnv()) {
    redirectWithMessage(authPath, "error", "Supabase is not configured yet.");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? getSiteUrl();
  const redirectTo = buildSupabaseAuthCallbackUrl(origin, returnTo, mode);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    const message =
      error.message.toLowerCase().includes("provider is not enabled") ||
      error.message.toLowerCase().includes("unsupported provider")
        ? `${getOAuthProviderLabel(provider)} sign-in is not enabled in Supabase yet. Use email instead.`
        : error.message;
    redirectWithMessage(authPath, "error", message);
  }

  if (!data.url) {
    redirectWithMessage(
      authPath,
      "error",
      "That provider is not configured yet. Try email or contact support.",
    );
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const resetPath =
    returnTo === "/dashboard"
      ? "/password-reset"
      : `/password-reset?returnTo=${encodeURIComponent(returnTo)}`;

  if (!hasSupabaseEnv()) {
    redirectWithMessage(resetPath, "error", "Supabase is not configured yet.");
  }

  const email = readRequired(formData, "email").toLowerCase();

  if (!email) {
    redirectWithMessage(resetPath, "error", "Email is required to request a reset link.");
  }

  enforceActionRateLimit({
    key: `password-reset:${email}`,
    limit: 4,
    message: "Too many reset requests. Wait a few minutes before trying again.",
    returnTo: resetPath,
    windowMs: 15 * 60 * 1000,
  });

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? getSiteUrl();
  const updatePath =
    returnTo === "/dashboard"
      ? "/password-update"
      : `/password-update?returnTo=${encodeURIComponent(returnTo)}`;
  const confirmUrl = new URL("/auth/confirm", origin);
  confirmUrl.searchParams.set("next", updatePath);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: confirmUrl.toString(),
  });

  if (error) {
    const emailDomain = email.includes("@") ? email.split("@").at(-1) : "invalid-format";
    logSupabaseActionError("Failed to request password reset", error, {
      emailDomain,
    });
  }

  redirectWithMessage(
    resetPath,
    "message",
    "If an account exists for that email, a reset link is on its way.",
  );
}

export async function updatePasswordAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const updatePath =
    returnTo === "/dashboard"
      ? "/password-update"
      : `/password-update?returnTo=${encodeURIComponent(returnTo)}`;
  const resetPath =
    returnTo === "/dashboard"
      ? "/password-reset"
      : `/password-reset?returnTo=${encodeURIComponent(returnTo)}`;
  const loginPath =
    returnTo === "/dashboard" ? "/login" : `/login?returnTo=${encodeURIComponent(returnTo)}`;

  if (!hasSupabaseEnv()) {
    redirectWithMessage(updatePath, "error", "Supabase is not configured yet.");
  }

  const password = readRequired(formData, "password");
  const confirmPassword = readRequired(formData, "confirm_password");

  if (!password || !confirmPassword) {
    redirectWithMessage(updatePath, "error", "Enter and confirm your new password.");
  }

  if (password.length < 12) {
    redirectWithMessage(updatePath, "error", "Use at least 12 characters for your new password.");
  }

  if (password !== confirmPassword) {
    redirectWithMessage(updatePath, "error", "The password fields do not match.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (userError) {
      logSupabaseActionError("Failed to read user before password update", userError);
    }

    redirectWithMessage(
      resetPath,
      "error",
      "Open a fresh reset link before choosing a new password.",
    );
  }

  enforceActionRateLimit({
    key: `password-update:${user.id}`,
    limit: 5,
    message: "Too many password update attempts. Wait a few minutes before trying again.",
    returnTo: updatePath,
    windowMs: 15 * 60 * 1000,
  });

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    logSupabaseActionError("Failed to update password", error, {
      profileId: user.id,
    });
    redirectWithMessage(updatePath, "error", error.message);
  }

  await supabase.auth.signOut();
  redirectWithMessage(loginPath, "message", "Password updated. Sign in with your new password.");
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createOfferAction(formData: FormData) {
  const requestedTemplate = getReviewedMarketplaceSeedTemplate(
    readOptional(formData, "template_id"),
  );
  const offsetTemplateId =
    requestedTemplate?.format === "donation_offset" ? requestedTemplate.id : "";
  const baseOffsetReturnPath = `/offers/new?mode=offset${
    offsetTemplateId
      ? `&entry=draft&template=${encodeURIComponent(offsetTemplateId)}`
      : ""
  }`;

  if (!hasSupabaseEnv()) {
    redirectWithMessage(baseOffsetReturnPath, "error", "Supabase is not configured yet.");
  }

  const viewer = await requireViewer(baseOffsetReturnPath);
  const supabase = await createClient();

  enforceActionRateLimit({
    key: `offer-create:${viewer.authUser.id}`,
    limit: 8,
    message: "You are creating offers too quickly. Wait a bit before publishing another one.",
    returnTo: baseOffsetReturnPath,
    windowMs: 60 * 60 * 1000,
  });

  const mode = readRequired(formData, "mode");
  const normalizedMode = normalizeOfferMode(mode);
  if (String(normalizedMode) !== "offset") {
    redirectWithMessage(
      baseOffsetReturnPath,
      "error",
      "This template route only accepts donation-offset trades. Use the private trade builder for pledge or action templates.",
    );
  }

  const offeredCause = readRequired(formData, "offered_cause");
  const requestedCause = readRequired(formData, "requested_cause");
  const ownerAliasOverride = readOptional(formData, "owner_alias_override");
  const offerAction = readRequired(formData, "offer_action");
  const requestAction = readRequired(formData, "request_action");
  const baselineStatement = readRequired(formData, "baseline_statement");
  const additionalityStatement = normalizedMode === "pledge"
    ? readRequired(formData, "additionality_statement")
    : readOptional(formData, "additionality_statement");
  const exitCondition = readRequired(formData, "exit_condition");
  const compromiseCause = readRequired(formData, "compromise_cause") || "Not needed";
  const verification = readRequired(formData, "verification");
  const duration = readRequired(formData, "duration");
  const paymentIntervalUnit = null;
  const paymentIntervalValue = null;
  const notes = readRequired(formData, "notes");
  const offerImpact = readBoundedInt(formData, "offer_impact", {
    fallback: 7,
    min: 1,
    max: 10,
  });
  const minCounterpartyImpact = readBoundedInt(formData, "min_counterparty_impact", {
    fallback: 6,
    min: 1,
    max: 10,
  });
  const trustLevel = readBoundedInt(formData, "trust_level", {
    fallback: 3,
    min: 1,
    max: 5,
  });
  const baselineAmountUsd = normalizedMode === "offset"
    ? readPositiveMoneyAmount(formData, "baseline_amount_usd")
    : null;
  const baselineOpposedCause = normalizedMode === "offset"
    ? readRequired(formData, "baseline_opposed_cause")
    : "";
  const requestedMatchingAmountUsd = normalizedMode === "offset"
    ? readPositiveMoneyAmount(formData, "requested_matching_amount_usd")
    : null;
  const requestedOpposedCause = normalizedMode === "offset"
    ? readRequired(formData, "requested_opposed_cause")
    : "";
  const compromiseDestinationId = normalizedMode === "offset"
    ? readRequired(formData, "compromise_destination_id")
    : "";
  const offsetRatioRaw = normalizedMode === "offset" ? Number(readOptional(formData, "offset_ratio")) : 1;
  const offsetRatio = Number.isFinite(offsetRatioRaw) && offsetRatioRaw > 0
    ? Number(offsetRatioRaw.toFixed(4))
    : null;
  const offsetTimeHorizon = normalizedMode === "offset"
    ? normalizeDonationOffsetTimeHorizon(readOptional(formData, "offset_time_horizon"))
    : "one_off";
  const offsetVerificationMethod = normalizedMode === "offset"
    ? normalizeDonationOffsetVerificationMethod(readOptional(formData, "offset_verification_method"))
    : "receipts_uploaded";
  const unmatchedSurplusRule = normalizedMode === "offset"
    ? normalizeDonationOffsetUnmatchedRule(readOptional(formData, "unmatched_surplus_rule"))
    : "return_to_donors";
  const participationMode = normalizedMode === "offset"
    ? normalizeDonationOffsetParticipationMode(readOptional(formData, "offset_participation_mode"))
    : "direct";
  const poolId = normalizedMode === "offset" ? readOptional(formData, "offset_pool_id") : "";
  const poolName = normalizedMode === "offset" ? readOptional(formData, "offset_pool_name") : "";
  const poolSide = normalizedMode === "offset"
    ? normalizeDonationOffsetPoolSide(readOptional(formData, "offset_pool_side"))
    : "";
  const assuranceMinimumUsd = normalizedMode === "offset"
    ? readNonNegativeMoneyAmount(formData, "assurance_minimum_usd")
    : null;
  const poolMaximumCapUsd = normalizedMode === "offset"
    ? readPositiveMoneyAmount(formData, "offset_pool_maximum_cap_usd")
    : null;
  const assuranceDeadline = normalizedMode === "offset"
    ? readOptional(formData, "assurance_deadline")
    : "";
  const evidenceUrl = normalizedMode === "offset" ? readOptional(formData, "offset_evidence_url") : "";
  const baselineBondEnabled = normalizedMode === "offset"
    ? readBoolean(formData, "baseline_bond_enabled")
    : false;
  const offerExpiresAt = normalizedMode === "offset"
    ? parseOptionalTimestamp(readOptional(formData, "offer_expires_at"))
    : null;
  const baselineBondAmountUsd = normalizedMode === "offset" && baselineBondEnabled
    ? readPositiveMoneyAmount(formData, "baseline_bond_amount_usd")
    : null;
  const baselineBondAmountCents = convertUsdToCents(baselineBondAmountUsd);
  const baselineBondCurrency = normalizeBaselineBondCurrency(
    normalizedMode === "offset" ? readOptional(formData, "baseline_bond_currency") : "",
  );
  const baselineBondForfeitDestinationId = normalizedMode === "offset" && baselineBondEnabled
    ? readRequired(formData, "baseline_bond_forfeit_destination_id")
    : "";
  const baselineBondEvidenceDueAt = normalizedMode === "offset" && baselineBondEnabled
    ? parseOptionalTimestamp(readOptional(formData, "baseline_bond_evidence_due_at"))
    : null;
  const baselineBondEvidenceStandard = normalizedMode === "offset" && baselineBondEnabled
    ? readRequired(formData, "baseline_bond_evidence_standard")
    : "";
  const antiThreatCertification = normalizedMode === "offset"
    ? readBoolean(formData, "offset_anti_threat_certification")
    : false;
  const verificationMetadataAcknowledged = normalizedMode === "offset"
    ? readBoolean(formData, "offset_verification_metadata_acknowledgement")
    : false;
  const selectedDonationOffsetDestination =
    normalizedMode === "offset" ? findRegisteredCharityById(compromiseDestinationId) : null;
  const donationOffsetDonorOfRecordInput: DonationOffsetDonorOfRecordInput | null =
    normalizedMode === "offset"
      ? {
          destinationLabel:
            selectedDonationOffsetDestination?.name || "Selected compromise destination",
          donationPlatform: readRequired(formData, "offset_donor_record_donation_platform"),
          donorOfRecordRole: normalizeDonationOffsetDonorOfRecordRole(
            readOptional(formData, "offset_donor_of_record_role"),
          ),
          donorOfRecordExplanation: readRequired(formData, "offset_donor_of_record_explanation"),
          taxReceiptTreatment: normalizeDonationOffsetTaxReceiptTreatment(
            readOptional(formData, "offset_tax_receipt_treatment"),
          ),
          taxReceiptExplanation: readRequired(formData, "offset_tax_receipt_explanation"),
          taxBenefitClaimed: readBoolean(formData, "offset_tax_benefit_claimed"),
          donorAdvisedFundInvolved: readBoolean(formData, "offset_daf_involved"),
          employerMatchInvolved: readBoolean(formData, "offset_employer_match_involved"),
          commercialCoVentureInvolved: readBoolean(formData, "offset_commercial_co_venture_involved"),
          charitableSolicitationTreatment: normalizeDonationOffsetCharitableSolicitationTreatment(
            readOptional(formData, "offset_charitable_solicitation_treatment"),
          ),
          jurisdictionReviewRequired: readBoolean(formData, "offset_jurisdiction_review_required"),
          participantAcknowledgedNoTaxAdvice: readBoolean(
            formData,
            "offset_no_tax_advice_acknowledgement",
          ),
          participantAcknowledgedOperationalNotImpact: readBoolean(
            formData,
            "offset_receipt_operational_not_impact_acknowledgement",
          ),
          receiptDoubleClaimPrevented: readBoolean(formData, "offset_receipt_double_claim_prevented"),
          receiptReassignmentProhibited: readBoolean(
            formData,
            "offset_receipt_reassignment_prohibited",
          ),
          lockTermsFrozenBeforeConfirmation: readBoolean(
            formData,
            "offset_donor_terms_lock_freeze_acknowledgement",
          ),
          destinationVerificationStatus: normalizeDonationOffsetDestinationVerificationStatus(
            readOptional(formData, "offset_destination_verification_status"),
          ),
        }
      : null;
  const donationOffsetDonorOfRecordPreview = donationOffsetDonorOfRecordInput
    ? buildDonationOffsetDonorOfRecordPreview(donationOffsetDonorOfRecordInput)
    : null;
  const donationOffsetPaymentDestinationInput: DonationOffsetPaymentDestinationInput | null =
    normalizedMode === "offset"
      ? {
          recipientLabel:
            selectedDonationOffsetDestination?.name || "Selected compromise destination",
          recipientIdentityStatus: normalizeDonationOffsetRecipientIdentityStatus(
            readOptional(formData, "offset_recipient_identity_status"),
          ),
          paymentDestinationKind: normalizeDonationOffsetPaymentDestinationKind(
            readOptional(formData, "offset_payment_destination_kind"),
          ),
          paymentDestinationLocator: readRequired(
            formData,
            "offset_payment_destination_locator",
          ),
          paymentDestinationReviewStatus: normalizeDonationOffsetPaymentDestinationReviewStatus(
            readOptional(formData, "offset_payment_destination_review_status"),
          ),
          antiImpersonationReviewed: readBoolean(
            formData,
            "offset_anti_impersonation_reviewed",
          ),
          jurisdictionReviewed: readBoolean(formData, "offset_jurisdiction_reviewed"),
          prohibitedUseReviewed: readBoolean(formData, "offset_prohibited_use_reviewed"),
          destinationControlledByRecipient: readBoolean(
            formData,
            "offset_destination_controlled_by_recipient",
          ),
          freeTextDestination: readBoolean(formData, "offset_free_text_destination"),
          reuseAcrossAgreementsRequested: readBoolean(
            formData,
            "offset_destination_reuse_requested",
          ),
          captureOrReleaseRequested: readBoolean(
            formData,
            "offset_capture_or_release_requested",
          ),
          participantAcknowledgedEvidenceNotDestination: readBoolean(
            formData,
            "offset_evidence_not_destination_acknowledgement",
          ),
          participantAcknowledgedNoCaptureBeforeVerification: readBoolean(
            formData,
            "offset_no_capture_before_verification_acknowledgement",
          ),
        }
      : null;
  const donationOffsetPaymentDestinationPreview = donationOffsetPaymentDestinationInput
    ? buildDonationOffsetPaymentDestinationPreview(donationOffsetPaymentDestinationInput)
    : null;
  const donationOffsetExternalityEvidenceInput: DonationOffsetExternalityEvidenceInput | null =
    normalizedMode === "offset"
      ? {
          recipientLabel:
            selectedDonationOffsetDestination?.name || "Selected compromise destination",
          nonparticipantExternalityStatus:
            normalizeDonationOffsetNonparticipantExternalityStatus(
              readOptional(formData, "offset_nonparticipant_externality_status"),
            ),
          nonparticipantHarmSummary: readRequired(
            formData,
            "offset_nonparticipant_harm_summary",
          ),
          antiThreatReviewed: readBoolean(
            formData,
            "offset_anti_threat_externality_reviewed",
          ),
          evidenceBurden: normalizeDonationOffsetEvidenceBurden(
            readOptional(formData, "offset_evidence_burden"),
          ),
          evidencePlanSummary: readRequired(formData, "offset_evidence_plan_summary"),
          leastIntrusiveAlternative: readRequired(
            formData,
            "offset_least_intrusive_evidence_alternative",
          ),
          privacySensitiveEvidenceRequested: readBoolean(
            formData,
            "offset_privacy_sensitive_evidence_requested",
          ),
          highBurdenEvidenceReviewerApproved: readBoolean(
            formData,
            "offset_high_burden_evidence_reviewer_approved",
          ),
          impactClaimReviewRequired: readBoolean(
            formData,
            "offset_impact_claim_review_required",
          ),
          impactClaimMethodologyReviewed: readBoolean(
            formData,
            "offset_impact_claim_methodology_reviewed",
          ),
          fallbackPolicy: normalizeDonationOffsetFallbackPolicy(
            readOptional(formData, "offset_fallback_policy"),
          ),
          fallbackExplanation: readRequired(formData, "offset_fallback_explanation"),
          lockOrRelianceRequested: readBoolean(formData, "offset_lock_or_reliance_requested"),
          participantAcknowledgedNonparticipantHarmsNotWaived: readBoolean(
            formData,
            "offset_nonparticipant_harms_not_waived_acknowledgement",
          ),
          participantAcknowledgedLeastIntrusiveEvidence: readBoolean(
            formData,
            "offset_least_intrusive_evidence_acknowledgement",
          ),
          participantAcknowledgedNoImpactClaimFromReceipt: readBoolean(
            formData,
            "offset_no_impact_claim_from_receipt_acknowledgement",
          ),
          participantAcknowledgedFallbackNoSilentReroute: readBoolean(
            formData,
            "offset_fallback_no_silent_reroute_acknowledgement",
          ),
        }
      : null;
  const donationOffsetExternalityEvidencePreview = donationOffsetExternalityEvidenceInput
    ? buildDonationOffsetExternalityEvidencePreview(donationOffsetExternalityEvidenceInput)
    : null;
  const donationOffsetSafetyAuthenticityInput: DonationOffsetSafetyAuthenticityInput | null =
    normalizedMode === "offset"
      ? {
          publicDescription: [offerAction, requestAction, baselineStatement, exitCondition, notes]
            .filter(Boolean)
            .join("\n"),
          evidencePlanSummary: readRequired(formData, "offset_evidence_plan_summary"),
          paymentPatternSummary: readRequired(
            formData,
            "offset_safety_payment_pattern_summary",
          ),
          sideAgreementSummary: readRequired(
            formData,
            "offset_safety_side_agreement_summary",
          ),
          privacyGrantStatus: normalizeDonationOffsetPrivacyGrantStatus(
            readOptional(formData, "offset_privacy_grant_status"),
          ),
          confidentialityPrivacy: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_confidentiality_privacy_status"),
          ),
          evidenceAuthenticity: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_evidence_authenticity_status"),
          ),
          financialCrime: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_financial_crime_status"),
          ),
          nonTransferability: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_non_transferability_status"),
          ),
          regulatedGoodsHazardousActivity: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_regulated_goods_hazardous_activity_status"),
          ),
          cyberAbuseDigitalIntegrity: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_cyber_abuse_digital_integrity_status"),
          ),
          antiCorruptionProcessIntegrity: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_anti_corruption_process_integrity_status"),
          ),
          privacySensitiveEvidenceRequested: readBoolean(
            formData,
            "offset_privacy_sensitive_evidence_requested",
          ),
          sourceAuthenticationReviewed: readBoolean(
            formData,
            "offset_source_authentication_reviewed",
          ),
          lockOrRelianceRequested: readBoolean(formData, "offset_lock_or_reliance_requested"),
          participantAcknowledgedNoUnauthorizedPrivateDisclosure: readBoolean(
            formData,
            "offset_no_unauthorized_private_disclosure_acknowledgement",
          ),
          participantAcknowledgedClaimTypedEvidence: readBoolean(
            formData,
            "offset_claim_typed_evidence_acknowledgement",
          ),
          participantAcknowledgedNonTransferability: readBoolean(
            formData,
            "offset_non_transferability_acknowledgement",
          ),
        }
      : null;
  const donationOffsetSafetyAuthenticityPreview = donationOffsetSafetyAuthenticityInput
    ? buildDonationOffsetSafetyAuthenticityPreview(donationOffsetSafetyAuthenticityInput)
    : null;
  const donationOffsetAuthorityFairnessInput: DonationOffsetAuthorityFairnessInput | null =
    normalizedMode === "offset"
      ? {
          publicDescription: [offerAction, requestAction, baselineStatement, exitCondition, notes]
            .filter(Boolean)
            .join("\n"),
          baselineStatement,
          authoritySummary: readRequired(formData, "offset_authority_summary"),
          sideAgreementSummary: readRequired(
            formData,
            "offset_authority_side_agreement_summary",
          ),
          baselineIntegrityStatus: normalizeDonationOffsetBaselineIntegrityStatus(
            readOptional(formData, "offset_baseline_integrity_status"),
          ),
          thirdPartyObligationStatus: normalizeDonationOffsetThirdPartyObligationStatus(
            readOptional(formData, "offset_third_party_obligation_status"),
          ),
          representativeAuthorityStatus: normalizeDonationOffsetRepresentativeAuthorityStatus(
            readOptional(formData, "offset_representative_authority_status"),
          ),
          reportingIntegrity: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_reporting_integrity_status"),
          ),
          civilRights: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_civil_rights_status"),
          ),
          participantAutonomy: normalizeDonationOffsetBinarySafetyAssertion(
            readOptional(formData, "offset_participant_autonomy_status"),
          ),
          jurisdictionReviewStatus: normalizeDonationOffsetJurisdictionReviewStatus(
            readOptional(formData, "offset_jurisdiction_legal_review_status"),
          ),
          lockOrRelianceRequested: readBoolean(formData, "offset_lock_or_reliance_requested"),
          participantAcknowledgedOwnResourcesOnly: readBoolean(
            formData,
            "offset_own_resources_only_acknowledgement",
          ),
          participantAcknowledgedNoReportingSuppression: readBoolean(
            formData,
            "offset_no_reporting_suppression_acknowledgement",
          ),
          participantAcknowledgedNoDiscrimination: readBoolean(
            formData,
            "offset_no_discrimination_acknowledgement",
          ),
          participantAcknowledgedNoCoercion: readBoolean(
            formData,
            "offset_no_coercion_acknowledgement",
          ),
        }
      : null;
  const donationOffsetAuthorityFairnessPreview = donationOffsetAuthorityFairnessInput
    ? buildDonationOffsetAuthorityFairnessPreview(donationOffsetAuthorityFairnessInput)
    : null;
  const donationOffsetParticipantConfirmationInput: DonationOffsetParticipantConfirmationInput | null =
    normalizedMode === "offset"
      ? {
          baselineSnapshotId: readRequired(formData, "offset_baseline_snapshot_id"),
          termsSnapshotId: readRequired(formData, "offset_terms_snapshot_id"),
          policySnapshotId: readRequired(formData, "offset_policy_snapshot_id"),
          maximumExposureUsd: readPositiveMoneyAmount(
            formData,
            "offset_maximum_exposure_usd",
          ),
          matchedTradeLockProposalStatus: normalizeDonationOffsetMatchedLockProposalStatus(
            readOptional(formData, "offset_matched_lock_proposal_status"),
          ),
          confirmationRecordStatus: normalizeDonationOffsetParticipantConfirmationRecordStatus(
            readOptional(formData, "offset_participant_confirmation_record_status"),
          ),
          consentQualityStatus: normalizeDonationOffsetConsentQualityStatus(
            readOptional(formData, "offset_consent_quality_status"),
          ),
          noticeRecordStatus: normalizeDonationOffsetNoticeRecordStatus(
            readOptional(formData, "offset_notice_record_status"),
          ),
          confirmationScope: normalizeDonationOffsetConfirmationScope(
            readOptional(formData, "offset_confirmation_scope"),
          ),
          amendmentStatus: normalizeDonationOffsetAmendmentStatus(
            readOptional(formData, "offset_amendment_status"),
          ),
          affectedParticipantCount:
            readPositiveIntOrNull(formData, "offset_affected_participant_count") ?? 0,
          freshConfirmationCount:
            readNonNegativeIntOrNull(formData, "offset_fresh_confirmation_count") ?? -1,
          participantSurplusConfirmed: readBoolean(
            formData,
            "offset_participant_surplus_confirmed",
          ),
          participantSurplusStatement: readRequired(
            formData,
            "offset_participant_surplus_statement",
          ),
          materialChangePending: readBoolean(formData, "offset_material_change_pending"),
          lockOrCaptureRequested: readBoolean(formData, "offset_lock_or_capture_requested"),
          participantAcknowledgedBaselineComparison: readBoolean(
            formData,
            "offset_baseline_comparison_acknowledgement",
          ),
          participantAcknowledgedFreshConfirmationRequired: readBoolean(
            formData,
            "offset_fresh_confirmation_required_acknowledgement",
          ),
          participantAcknowledgedNoPreselectedPaidCommitment: readBoolean(
            formData,
            "offset_no_preselected_paid_commitment_acknowledgement",
          ),
          participantAcknowledgedNoDarkPattern: readBoolean(
            formData,
            "offset_no_dark_pattern_acknowledgement",
          ),
        }
      : null;
  const donationOffsetParticipantConfirmationPreview =
    donationOffsetParticipantConfirmationInput
      ? buildDonationOffsetParticipantConfirmationPreview(
          donationOffsetParticipantConfirmationInput,
        )
      : null;
  const newOfferReturnPath =
    normalizedMode === "offset"
      ? `${baseOffsetReturnPath}&offset_participation_mode=${participationMode}${
          poolId ? `&offset_pool_id=${encodeURIComponent(poolId)}` : ""
        }${
          poolSide ? `&offset_pool_side=${poolSide}` : ""
        }`
      : normalizedMode === "pledge"
        ? "/offers/new?mode=pledge"
        : "/offers/new";
  const pledgePerformanceBondConfig = getPerformanceBondConfig();
  const pledgePerformanceBondFields =
    normalizedMode === "pledge" && pledgePerformanceBondConfig.enabled
      ? readPerformanceBondTermsFromForm({
          fallbackAdditionality: additionalityStatement,
          fallbackNoTradeBaseline: baselineStatement,
          formData,
          prefix: "performance_bond",
        })
      : null;
  const pledgeSwapManualReviewInput: PledgeSwapManualReviewInput | null =
    normalizedMode === "pledge"
      ? {
          offeredAction: offerAction,
          requestedAction: requestAction,
          noTradeBaseline: baselineStatement,
          additionalityStatement,
          maxObligationDays: readPositiveIntOrNull(formData, "pledge_swap_max_obligation_days"),
          reciprocalReleaseRule: readRequired(formData, "pledge_swap_reciprocal_release_rule"),
          withdrawalBeforeLockRule: readRequired(formData, "pledge_swap_withdrawal_before_lock_rule"),
          challengeWindowDays: readPositiveIntOrNull(formData, "pledge_swap_challenge_window_days"),
          neutralReviewRequired: readBoolean(formData, "pledge_swap_neutral_review_required"),
          evidencePlan: readRequired(formData, "pledge_swap_evidence_plan"),
          leastIntrusiveAlternative: readRequired(formData, "pledge_swap_least_intrusive_alternative"),
          baselinePredatesOffer: readBoolean(formData, "pledge_swap_baseline_predates_offer"),
          baselineConfidence: normalizePledgeSwapBaselineConfidence(
            readOptional(formData, "pledge_swap_baseline_confidence"),
          ),
          compensatedMoralAction: readBoolean(formData, "pledge_swap_compensated_moral_action"),
          compensationSummary: readOptional(formData, "pledge_swap_compensation_summary"),
          ordinaryServiceClassification: normalizePledgeSwapOrdinaryServiceClassification(
            readOptional(formData, "pledge_swap_ordinary_service_classification"),
          ),
          negativeCommitmentScope: readOptional(formData, "pledge_swap_negative_commitment_scope"),
          actionReversibility: normalizePledgeSwapActionReversibility(
            readOptional(formData, "pledge_swap_action_reversibility"),
          ),
          thirdPartyObligation: normalizePledgeSwapThirdPartyObligation(
            readOptional(formData, "pledge_swap_third_party_obligation"),
          ),
          representativeAuthority: normalizePledgeSwapRepresentativeAuthority(
            readOptional(formData, "pledge_swap_representative_authority"),
          ),
          reportingIntegrity: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_reporting_integrity"),
          ),
          civilRights: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_civil_rights"),
          ),
          participantAutonomy: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_participant_autonomy"),
          ),
          confidentialityPrivacy: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_confidentiality_privacy"),
          ),
          evidenceAuthenticity: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_evidence_authenticity"),
          ),
          financialCrime: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_financial_crime"),
          ),
          nonTransferability: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_non_transferability"),
          ),
          regulatedGoodsHazardousActivity: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_regulated_goods_hazardous_activity"),
          ),
          cyberAbuseDigitalIntegrity: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_cyber_abuse_digital_integrity"),
          ),
          antiCorruptionProcessIntegrity: normalizePledgeSwapBinarySafetyAssertion(
            readOptional(formData, "pledge_swap_anti_corruption_process_integrity"),
          ),
          performanceBondPreviewEnabled: Boolean(pledgePerformanceBondFields?.enabled),
        }
      : null;
  const pledgeSwapManualReviewPreview = pledgeSwapManualReviewInput
    ? buildPledgeSwapManualReviewPreview(pledgeSwapManualReviewInput)
    : null;

  if (!offerAction || !requestAction || !baselineStatement || !exitCondition || !offeredCause || !requestedCause) {
    redirectWithMessage(newOfferReturnPath, "error", "Complete all required offer fields.");
  }

  if (normalizedMode === "pledge" && !additionalityStatement.trim()) {
    redirectWithMessage(
      newOfferReturnPath,
      "error",
      "Explain why this personal pledge swap is additional to the no-trade baseline.",
    );
  }

  if (pledgeSwapManualReviewInput) {
    const pledgeSwapValidationErrors = validatePledgeSwapManualReviewInput(
      pledgeSwapManualReviewInput,
    );

    if (pledgeSwapValidationErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        pledgeSwapValidationErrors[0] ?? "Complete the pledge-swap manual-review terms.",
      );
    }
  }

  if (donationOffsetDonorOfRecordInput) {
    const donorOfRecordErrors = validateDonationOffsetDonorOfRecordInput(
      donationOffsetDonorOfRecordInput,
    );

    if (donorOfRecordErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        donorOfRecordErrors[0] ?? "Complete the donation offset donor-of-record terms.",
      );
    }
  }

  if (donationOffsetPaymentDestinationInput) {
    const paymentDestinationErrors = validateDonationOffsetPaymentDestinationInput(
      donationOffsetPaymentDestinationInput,
    );

    if (paymentDestinationErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        paymentDestinationErrors[0] ?? "Complete the donation offset payment-destination terms.",
      );
    }
  }

  if (donationOffsetExternalityEvidenceInput) {
    const externalityEvidenceErrors = validateDonationOffsetExternalityEvidenceInput(
      donationOffsetExternalityEvidenceInput,
    );

    if (externalityEvidenceErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        externalityEvidenceErrors[0] ??
          "Complete the donation offset externality and evidence terms.",
      );
    }
  }

  if (donationOffsetSafetyAuthenticityInput) {
    const safetyAuthenticityErrors = validateDonationOffsetSafetyAuthenticityInput(
      donationOffsetSafetyAuthenticityInput,
    );

    if (safetyAuthenticityErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        safetyAuthenticityErrors[0] ??
          "Complete the donation offset safety and evidence-authenticity terms.",
      );
    }
  }

  if (donationOffsetAuthorityFairnessInput) {
    const authorityFairnessErrors = validateDonationOffsetAuthorityFairnessInput(
      donationOffsetAuthorityFairnessInput,
    );

    if (authorityFairnessErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        authorityFairnessErrors[0] ??
          "Complete the donation offset authority and fairness terms.",
      );
    }
  }

  if (donationOffsetParticipantConfirmationInput) {
    const participantConfirmationErrors = validateDonationOffsetParticipantConfirmationInput(
      donationOffsetParticipantConfirmationInput,
    );

    if (participantConfirmationErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        participantConfirmationErrors[0] ??
          "Complete the donation offset participant-confirmation terms.",
      );
    }
  }

  if (pledgePerformanceBondFields?.enabled) {
    const bondValidation = validatePerformanceBondTerms(
      pledgePerformanceBondFields.terms,
      pledgePerformanceBondConfig,
    );

    if (bondValidation.errors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        bondValidation.errors[0] ?? "Complete the pledge performance bond fields.",
      );
    }
  }

  const protocolDraft = {
    format: normalizedMode,
    offeredCause,
    requestedCause,
    offeredAction: offerAction,
    requestedAction: requestAction,
    baselineStatement,
    duration,
    exitConditions: exitCondition,
    verificationMethod: verification,
    publicDescription: notes,
    evidenceUrl: normalizedMode === "offset" ? readOptional(formData, "offset_evidence_url") : "",
    participantImportance: offerImpact,
    counterpartyThreshold: minCounterpartyImpact,
  };
  const protocolReview = evaluateMoralTradeProtocolDraft(protocolDraft);
  const protocolTransitionRecordedAt = new Date().toISOString();
  const protocolTransition = validateMoralTradeOfferCreateTransition({
    draft: protocolDraft,
    protocolReview,
    actorAgentId: viewer.authUser.id,
    actorAgentKind: "participant",
    idempotencyKey: `offer-create:${viewer.authUser.id}:${protocolTransitionRecordedAt}`,
    recordedAt: protocolTransitionRecordedAt,
    subjectId: "proposal_record:new_offer",
  });

  if (protocolReview.policyConflicts.length) {
    redirectWithMessage(
      newOfferReturnPath,
      "error",
      `This proposal cannot be published because it triggered protocol guardrails: ${protocolReview.policyConflicts.join(", ")}.`,
    );
  }

  if (protocolReview.missingRequiredFields.length) {
    redirectWithMessage(
      newOfferReturnPath,
      "error",
      `Complete the protocol-required fields: ${protocolReview.missingRequiredFields.join(", ")}.`,
    );
  }

  if (protocolTransition.status === "fail") {
    redirectWithMessage(
      newOfferReturnPath,
      "error",
      `The protocol state transition could not be recorded: ${protocolTransition.blockers.join(", ")}.`,
    );
  }

  const structuredNotes = [
    notes,
    `No-trade baseline / default: ${baselineStatement}`,
    additionalityStatement ? `Why this is additional: ${additionalityStatement}` : "",
    `Exit, pause, or expiry condition: ${exitCondition}`,
    pledgeSwapManualReviewPreview
      ? summarizePledgeSwapManualReviewForNotes(pledgeSwapManualReviewPreview)
      : "",
    donationOffsetDonorOfRecordPreview
      ? summarizeDonationOffsetDonorOfRecordForNotes(donationOffsetDonorOfRecordPreview)
      : "",
    donationOffsetPaymentDestinationPreview
      ? summarizeDonationOffsetPaymentDestinationForNotes(donationOffsetPaymentDestinationPreview)
      : "",
    donationOffsetExternalityEvidencePreview
      ? summarizeDonationOffsetExternalityEvidenceForNotes(donationOffsetExternalityEvidencePreview)
      : "",
    donationOffsetSafetyAuthenticityPreview
      ? summarizeDonationOffsetSafetyAuthenticityForNotes(donationOffsetSafetyAuthenticityPreview)
      : "",
    donationOffsetAuthorityFairnessPreview
      ? summarizeDonationOffsetAuthorityFairnessForNotes(donationOffsetAuthorityFairnessPreview)
      : "",
    donationOffsetParticipantConfirmationPreview
      ? summarizeDonationOffsetParticipantConfirmationForNotes(
          donationOffsetParticipantConfirmationPreview,
        )
      : "",
    buildMoralTradeOfferProtocolNotes(protocolReview, protocolTransition),
  ]
    .filter(Boolean)
    .join("\n\n");

  let donationOffsetFields: DonationOffsetFields | null = null;
  let baselineBondPauseReasons: string[] = [];

  if (normalizedMode === "offset") {
    donationOffsetFields = {
      baselineAmountUsd,
      baselineOpposedCause,
      requestedMatchingAmountUsd,
      requestedOpposedCause,
      compromiseDestinationId,
      offsetRatio,
      timeHorizon: offsetTimeHorizon,
      verificationMethod: offsetVerificationMethod,
      unmatchedSurplusRule,
      participationMode,
      poolId,
      poolName,
      poolSide,
      assuranceMinimumUsd,
      poolMaximumCapUsd,
      assuranceDeadline,
      description: [offerAction, requestAction, structuredNotes].filter(Boolean).join("\n"),
      evidenceUrl,
    };

    const charity = findRegisteredCharityById(compromiseDestinationId);
    const baselineBondForfeitDestination = findRegisteredCharityById(
      baselineBondForfeitDestinationId,
    );
    const baselineBondValidation = validateBaselineBondInput({
      amountCents: baselineBondAmountCents,
      baselineAmountCents: convertUsdToCents(donationOffsetFields.baselineAmountUsd),
      baselineStatement,
      currency: baselineBondCurrency,
      enabled: baselineBondEnabled,
      evidenceDueAt: baselineBondEvidenceDueAt,
      evidenceStandard: baselineBondEvidenceStandard,
      forfeitDestination: baselineBondForfeitDestination,
      forfeitDestinationId: baselineBondForfeitDestinationId,
      notes,
      offerExpiresAt,
      offeredAction: offerAction,
      requestedAction: requestAction,
    });
    baselineBondPauseReasons = baselineBondValidation.pauseReasons;
    const moderation = assessDonationOffsetModeration(donationOffsetFields, charity);
    const validationErrors = [
      ...(donationOffsetFields ? validateDonationOffsetFields(donationOffsetFields) : []),
      ...validateDonationOffsetSubmissionGuards({
        participationMode,
        antiThreatCertification,
        verificationMetadataAcknowledged,
        evidenceUrl,
      }),
      ...baselineBondValidation.errors,
    ];

    if (
      !baselineAmountUsd ||
      !requestedMatchingAmountUsd ||
      !baselineOpposedCause ||
      !requestedOpposedCause ||
      !compromiseDestinationId ||
      !offsetRatio
    ) {
      redirectWithMessage(newOfferReturnPath, "error", "Complete all required donation offset fields.");
    }

    if (!charity?.isActive) {
      redirectWithMessage(newOfferReturnPath, "error", "Choose a valid registered compromise destination.");
    }

    if (validationErrors.length) {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        validationErrors[0] ?? "Complete the donation offset fields.",
      );
    }

    if (moderation.status === "blocked") {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        moderation.reasons[0] ??
          "This donation offset could not be published because it violates the platform safeguards.",
      );
    }

    if (baselineBondValidation.safetyAction === "reject") {
      redirectWithMessage(
        newOfferReturnPath,
        "error",
        baselineBondValidation.rejectReasons[0] ??
          "This baseline credibility bond cannot be offered under the platform safeguards.",
      );
    }

    if (donationOffsetFields.evidenceUrl) {
      const { data: existingEvidenceRows, error: existingEvidenceError } = await supabase
        .from("donation_offset_offers")
        .select("offer_id, evidence_url")
        .neq("evidence_url", "")
        .limit(500);

      if (existingEvidenceError) {
        logSupabaseActionError(
          "Failed to verify donation offset proof uniqueness",
          existingEvidenceError,
          {
            ownerId: viewer.authUser.id,
          },
        );
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          "Unable to verify proof uniqueness. Try again or ask an operator to review the offset.",
        );
      }

      const duplicateEvidence = existingEvidenceRows?.find((row) =>
        evidenceLocatorsConflict(row.evidence_url, donationOffsetFields?.evidenceUrl),
      );

      if (duplicateEvidence) {
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          "That evidence link is already attached to another offset offer. Use a unique proof packet or ask an operator to review the duplicate.",
        );
      }
    }
  }

  const ownerAlias = ownerAliasOverride || deriveDisplayName(viewer.authUser, viewer.profile);
  await ensureAccountRowsForUser(viewer.authUser, supabase);
  let poolRecord:
    | Database["public"]["Tables"]["donation_offset_pools"]["Row"]
    | null = null;
  let createdPoolId: string | null = null;

  if (normalizedMode === "offset" && donationOffsetFields?.participationMode === "pool") {
    if (donationOffsetFields.poolId) {
      const { data: existingPool, error: existingPoolError } = await supabase
        .from("donation_offset_pools")
        .select("*")
        .eq("id", donationOffsetFields.poolId)
        .maybeSingle();

      if (existingPoolError || !existingPool) {
        logSupabaseActionError("Failed to load donation offset pool during offer creation", existingPoolError, {
          ownerId: viewer.authUser.id,
          poolId: donationOffsetFields.poolId,
        });
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          existingPoolError?.message ?? "That offset pool could not be found.",
        );
      }

      if (
        existingPool.status === "closed" ||
        existingPool.moderation_status !== "clear" ||
        existingPool.compromise_charity_id !== donationOffsetFields.compromiseDestinationId ||
        existingPool.time_horizon !== donationOffsetFields.timeHorizon ||
        existingPool.offset_ratio !== (donationOffsetFields.offsetRatio ?? 1) ||
        existingPool.verification_method !== donationOffsetFields.verificationMethod ||
        existingPool.unmatched_surplus_rule !== donationOffsetFields.unmatchedSurplusRule ||
        existingPool.assurance_minimum_cents !==
          convertUsdToCents(donationOffsetFields.assuranceMinimumUsd) ||
        existingPool.maximum_cap_cents !==
          convertUsdToCents(donationOffsetFields.poolMaximumCapUsd) ||
        (existingPool.assurance_deadline_at?.slice(0, 10) ?? "") !==
          (donationOffsetFields.assuranceDeadline?.slice(0, 10) ?? "") ||
        (donationOffsetFields.poolSide === "side_a" &&
          (donationOffsetFields.baselineOpposedCause !== existingPool.side_a_label ||
            donationOffsetFields.requestedOpposedCause !== existingPool.side_b_label)) ||
        (donationOffsetFields.poolSide === "side_b" &&
          (donationOffsetFields.baselineOpposedCause !== existingPool.side_b_label ||
            donationOffsetFields.requestedOpposedCause !== existingPool.side_a_label))
      ) {
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          "Join-pool commitments must use the pool's shared charity, ratio, horizon, verification, surplus rule, assurance settings, maximum cap, and side labels.",
        );
      }

      poolRecord = existingPool;
    } else {
      const poolInsert: DonationOffsetPoolInsert = {
        created_by: viewer.authUser.id,
        name: donationOffsetFields.poolName,
        description: structuredNotes,
        compromise_charity_id: donationOffsetFields.compromiseDestinationId,
        offset_ratio: donationOffsetFields.offsetRatio ?? 1,
        time_horizon: donationOffsetFields.timeHorizon,
        verification_method: donationOffsetFields.verificationMethod,
        unmatched_surplus_rule: donationOffsetFields.unmatchedSurplusRule,
        assurance_minimum_cents: convertUsdToCents(donationOffsetFields.assuranceMinimumUsd),
        maximum_cap_cents: convertUsdToCents(donationOffsetFields.poolMaximumCapUsd),
        assurance_deadline_at: parseOptionalTimestamp(donationOffsetFields.assuranceDeadline),
        side_a_label: donationOffsetFields.baselineOpposedCause,
        side_b_label: donationOffsetFields.requestedOpposedCause,
        status: "open",
        moderation_status: assessDonationOffsetModeration(donationOffsetFields).status,
        moderation_notes: assessDonationOffsetModeration(donationOffsetFields).reasons.join(" "),
      };

      const { data: createdPool, error: createdPoolError } = await supabase
        .from("donation_offset_pools")
        .insert(poolInsert)
        .select("*")
        .single();

      if (createdPoolError || !createdPool) {
        logSupabaseActionError("Failed to create donation offset pool", createdPoolError, {
          ownerId: viewer.authUser.id,
        });
        redirectWithMessage(
          newOfferReturnPath,
          "error",
          createdPoolError?.message ?? "Unable to create the donation offset pool.",
        );
      }

      poolRecord = createdPool;
      createdPoolId = createdPool.id;
    }
  }

  const offsetModeration =
    normalizedMode === "offset" && donationOffsetFields
      ? assessDonationOffsetModeration(donationOffsetFields)
      : null;
  const effectiveOffsetModerationStatus =
    offsetModeration?.status === "clear" && baselineBondPauseReasons.length
      ? "flagged"
      : offsetModeration?.status ?? null;
  const offerPersistenceStatus = getMoralTradeOfferPersistenceStatus({
    donationOffsetModerationStatus: effectiveOffsetModerationStatus,
    protocolReviewStatus: protocolReview.status,
  });

  const { data, error } = await supabase
    .from("offers")
    .insert({
      owner_id: viewer.authUser.id,
      owner_alias: ownerAlias,
      mode: normalizedMode,
      offered_cause: offeredCause,
      requested_cause: requestedCause,
      offer_action: offerAction,
      request_action: requestAction,
      compromise_cause: normalizedMode === "offset" ? compromiseCause : "Not needed",
      offer_impact: offerImpact,
      min_counterparty_impact: minCounterpartyImpact,
      verification,
      duration,
      payment_interval_unit: paymentIntervalUnit,
      payment_interval_value: paymentIntervalValue,
      trust_level: trustLevel,
      notes: structuredNotes,
      status: "paused",
    })
    .select("id")
    .single();

  if (error || !data) {
    logSupabaseActionError("Failed to create offer", error, {
      ownerId: viewer.authUser.id,
      mode: normalizedMode,
    });
    redirectWithMessage(newOfferReturnPath, "error", error?.message ?? "Unable to create offer.");
  }

  if (normalizedMode === "offset" && donationOffsetFields) {
    const baselineBondStatus: BaselineBondStatus = baselineBondEnabled ? "pending_payment" : "none";
    const baselineBondNotes = [
      offsetModeration?.reasons.join(" ") ?? "",
      ...baselineBondPauseReasons,
      baselineBondEnabled && !isPaymentBondsEnabled()
        ? "Baseline credibility bond recorded as planned pilot willingness only; no money was collected."
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const offsetInsert: DonationOffsetOfferInsert = {
      offer_id: data.id,
      baseline_amount_cents: convertUsdToCents(donationOffsetFields.baselineAmountUsd),
      baseline_opposed_cause: donationOffsetFields.baselineOpposedCause,
      requested_matching_amount_cents: convertUsdToCents(
        donationOffsetFields.requestedMatchingAmountUsd,
      ),
      requested_opposed_cause: donationOffsetFields.requestedOpposedCause,
      compromise_charity_id: donationOffsetFields.compromiseDestinationId,
      offset_ratio: donationOffsetFields.offsetRatio ?? 1,
      time_horizon: donationOffsetFields.timeHorizon,
      verification_method: donationOffsetFields.verificationMethod,
      unmatched_surplus_rule: donationOffsetFields.unmatchedSurplusRule,
      participation_mode: donationOffsetFields.participationMode,
      pool_id: poolRecord?.id ?? null,
      pool_side: donationOffsetFields.poolSide || null,
      assurance_minimum_cents: convertUsdToCents(donationOffsetFields.assuranceMinimumUsd),
      assurance_deadline_at: parseOptionalTimestamp(donationOffsetFields.assuranceDeadline),
      evidence_url: donationOffsetFields.evidenceUrl,
      moderation_status: effectiveOffsetModerationStatus ?? "clear",
      moderation_notes: baselineBondNotes,
      offer_expires_at: offerExpiresAt,
      baseline_bond_enabled: baselineBondEnabled,
      baseline_bond_amount_cents: baselineBondEnabled ? baselineBondAmountCents : 0,
      baseline_bond_currency: baselineBondCurrency,
      baseline_bond_forfeit_destination_id: baselineBondEnabled
        ? baselineBondForfeitDestinationId
        : null,
      baseline_bond_evidence_due_at: baselineBondEnabled ? baselineBondEvidenceDueAt : null,
      baseline_bond_evidence_standard: baselineBondEnabled ? baselineBondEvidenceStandard : "",
      baseline_bond_evidence_url: "",
      baseline_bond_status: baselineBondStatus,
      baseline_bond_appeal_window_ends_at: baselineBondEnabled
        ? getBaselineBondAppealWindowEndsAt(protocolTransitionRecordedAt)
        : null,
    };

    const { error: offsetError } = await supabase.from("donation_offset_offers").insert(offsetInsert);

    if (offsetError) {
      logSupabaseActionError("Failed to create donation offset details", offsetError, {
        offerId: data.id,
        ownerId: viewer.authUser.id,
      });
      const cleanupResults = await Promise.all([
        supabase
          .from("offers")
          .delete()
          .eq("id", data.id)
          .eq("owner_id", viewer.authUser.id)
          .eq("status", "paused"),
        createdPoolId
          ? supabase
              .from("donation_offset_pools")
              .delete()
              .eq("id", createdPoolId)
              .eq("created_by", viewer.authUser.id)
          : Promise.resolve({ error: null }),
      ]);
      const cleanupError = cleanupResults.find((result) => result.error)?.error;
      if (cleanupError) {
        logSupabaseActionError(
          "Failed to clean up incomplete donation offset creation",
          cleanupError,
          { offerId: data.id, ownerId: viewer.authUser.id },
        );
      }
      redirectWithMessage(newOfferReturnPath, "error", offsetError.message);
    }

    if (donationOffsetFields.evidenceUrl) {
      const evidencePersistenceShape = getDonationOffsetEvidencePersistenceShape(
        donationOffsetFields.verificationMethod,
      );
      const evidencePersistenceResult = await persistMoralTradeEvidenceSubmission({
        actorAgentId: viewer.authUser.id,
        actorAgentKind: "participant",
        actorLabel: ownerAlias,
        claimScope: evidencePersistenceShape.claimScope,
        evidenceKind: evidencePersistenceShape.evidenceKind,
        evidenceUrl: donationOffsetFields.evidenceUrl,
        idempotencyKey: `donation-offset:${data.id}:initial-evidence`,
        offerId: data.id,
        ownerProfileId: viewer.authUser.id,
        reasonCodes: evidencePersistenceShape.reasonCodes,
        recordedAt: protocolTransitionRecordedAt,
        redactionLevel: "reviewer_only",
        subjectId: data.id,
        subjectKind: "offer",
        supabase,
      });

      if (evidencePersistenceResult.error) {
        logSupabaseActionError(
          "Failed to persist donation offset evidence bundle",
          toActionError(
            evidencePersistenceResult.error,
            "Unable to persist donation offset evidence bundle.",
          ),
          { offerId: data.id, ownerId: viewer.authUser.id },
        );
        redirectWithMessage(
          `/offers/${data.id}`,
          "error",
          "Offer saved but kept paused because the donation offset evidence bundle could not be recorded.",
        );
      }
    }

    if (baselineBondEnabled) {
      const bondTransitionResult = await persistBaselineBondStatusTransition({
        actorAgentId: viewer.authUser.id,
        actorAgentKind: "participant",
        actorLabel: ownerAlias,
        fromStatus: "none",
        idempotencyKey: `baseline-bond:${data.id}:none-to-pending_payment`,
        offerId: data.id,
        ownerProfileId: viewer.authUser.id,
        provenanceActivity: "risk_screened",
        recordedAt: protocolTransitionRecordedAt,
        supabase,
        toStatus: "pending_payment",
      });

      if (bondTransitionResult.error) {
        logSupabaseActionError(
          "Failed to persist baseline credibility bond transition",
          toActionError(
            bondTransitionResult.error,
            "Unable to persist baseline credibility bond transition.",
          ),
          {
            offerId: data.id,
            ownerId: viewer.authUser.id,
          },
        );
        redirectWithMessage(
          `/offers/${data.id}`,
          "error",
          "Offer saved but kept paused because the baseline credibility bond audit transition could not be written.",
        );
      }
    }
  }

  if (normalizedMode === "pledge" && pledgePerformanceBondFields?.enabled) {
    const serviceSupabase = createServiceClient();

    try {
      await createPerformanceBond({
        counterpartyId: null,
        forfeitureDestinationId: pledgePerformanceBondFields.forfeitureDestinationId,
        offerId: data.id,
        partyId: viewer.authUser.id,
        side: "offerer",
        supabase: serviceSupabase,
        terms: pledgePerformanceBondFields.terms,
      });
    } catch (bondError) {
      logSupabaseActionError(
        "Failed to create pledge performance bond",
        toActionError(bondError, "Unable to create pledge performance bond."),
        { offerId: data.id, ownerId: viewer.authUser.id },
      );
      redirectWithMessage(
        `/offers/${data.id}`,
        "error",
        bondError instanceof Error
          ? bondError.message
          : "Offer saved but the pledge performance bond could not be recorded.",
      );
    }
  }

  const provenanceResult = await persistMoralTradeOfferCreateProtocolProvenance({
    actorAgentId: viewer.authUser.id,
    actorLabel: ownerAlias,
    draft: protocolDraft,
    offerId: data.id,
    ownerProfileId: viewer.authUser.id,
    protocolReview,
    recordedAt: protocolTransitionRecordedAt,
    supabase,
  });

  if (provenanceResult.error || !provenanceResult.transition) {
    logSupabaseActionError("Failed to persist offer protocol provenance", provenanceResult.error, {
      offerId: data.id,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(
      `/offers/${data.id}`,
      "error",
      "Offer saved but kept paused because the protocol provenance record could not be written. Ask an operator to review before relying on it.",
    );
  }

  const finalStructuredNotes = [
    notes,
    `No-trade baseline / default: ${baselineStatement}`,
    additionalityStatement ? `Why this is additional: ${additionalityStatement}` : "",
    `Exit, pause, or expiry condition: ${exitCondition}`,
    pledgeSwapManualReviewPreview
      ? summarizePledgeSwapManualReviewForNotes(pledgeSwapManualReviewPreview)
      : "",
    donationOffsetDonorOfRecordPreview
      ? summarizeDonationOffsetDonorOfRecordForNotes(donationOffsetDonorOfRecordPreview)
      : "",
    donationOffsetPaymentDestinationPreview
      ? summarizeDonationOffsetPaymentDestinationForNotes(donationOffsetPaymentDestinationPreview)
      : "",
    donationOffsetExternalityEvidencePreview
      ? summarizeDonationOffsetExternalityEvidenceForNotes(donationOffsetExternalityEvidencePreview)
      : "",
    donationOffsetSafetyAuthenticityPreview
      ? summarizeDonationOffsetSafetyAuthenticityForNotes(donationOffsetSafetyAuthenticityPreview)
      : "",
    donationOffsetAuthorityFairnessPreview
      ? summarizeDonationOffsetAuthorityFairnessForNotes(donationOffsetAuthorityFairnessPreview)
      : "",
    donationOffsetParticipantConfirmationPreview
      ? summarizeDonationOffsetParticipantConfirmationForNotes(
          donationOffsetParticipantConfirmationPreview,
        )
      : "",
    buildMoralTradeOfferProtocolNotes(protocolReview, provenanceResult.transition),
  ]
    .filter(Boolean)
    .join("\n\n");
  const { error: finalOfferUpdateError } = await supabase
    .from("offers")
    .update({
      notes: finalStructuredNotes,
      status: offerPersistenceStatus,
    })
    .eq("id", data.id);

  if (finalOfferUpdateError) {
    logSupabaseActionError("Failed to finalize offer protocol provenance status", finalOfferUpdateError, {
      offerId: data.id,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(
      `/offers/${data.id}`,
      "error",
      "Offer saved but kept paused because the protocol provenance status could not be finalized.",
    );
  }

  revalidatePath("/offers");
  revalidatePath("/donation-offsets");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectWithMessage(
    `/offers/${data.id}`,
    "message",
    normalizedMode === "offset" && effectiveOffsetModerationStatus === "flagged"
      ? "Donation offset saved for moderator review. It will remain paused until the baseline evidence is approved."
      : offerPersistenceStatus === "paused"
        ? "Offer saved for protocol review. It will remain paused until evidence or human-review requirements are cleared."
      : "Offer created successfully.",
  );
}

async function refundPostedBaselineBondAfterMatch({
  actorLabel,
  actorProfileId,
  idempotencyKeySuffix,
  offerId,
  offsetDetails,
  ownerProfileId,
  supabase,
}: {
  actorLabel: string;
  actorProfileId: string;
  idempotencyKeySuffix: string;
  offerId: string;
  offsetDetails: DonationOffsetOfferRow;
  ownerProfileId: string;
  supabase: SupabaseServerClient;
}) {
  const currentStatus = normalizeBaselineBondStatus(offsetDetails.baseline_bond_status);
  const nextStatus = getBaselineBondStatusAfterAccepted({
    offerExpiresAt: offsetDetails.offer_expires_at,
    status: currentStatus,
  });

  if (nextStatus === currentStatus) {
    return null;
  }

  const { error: updateError } = await supabase
    .from("donation_offset_offers")
    .update({
      baseline_bond_status: nextStatus,
      baseline_bond_review_notes:
        "Baseline credibility bond marked for refund because the offer was accepted before expiry.",
      baseline_bond_reviewed_at: new Date().toISOString(),
      baseline_bond_reviewed_by: actorProfileId,
    })
    .eq("offer_id", offerId)
    .eq("baseline_bond_status", currentStatus);

  if (updateError) {
    return updateError;
  }

  const transitionResult = await persistBaselineBondStatusTransition({
    actorAgentId: actorProfileId,
    actorAgentKind: "participant",
    actorLabel,
    fromStatus: currentStatus,
    idempotencyKey: `baseline-bond:${offerId}:${currentStatus}-to-${nextStatus}:${idempotencyKeySuffix}`,
    offerId,
    ownerProfileId,
    provenanceActivity: "review_completed",
    supabase,
    toStatus: nextStatus,
  });

  return transitionResult.error;
}

export async function expressInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const message = readRequired(formData, "message");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId) {
    redirectWithMessage("/offers", "error", "Offer ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot express interest in your own offer.");
  }

  const pledgePerformanceBondFeatureEnabled = isPledgePerformanceBondsEnabled();
  const { data: offererBond, error: offererBondError } =
    pledgePerformanceBondFeatureEnabled && offer.mode === "pledge"
      ? await supabase
          .from("performance_bonds")
          .select("*")
          .eq("offer_id", offerId)
          .eq("side", "offerer")
          .eq("enabled", true)
          .maybeSingle()
      : { data: null, error: null };

  if (offererBondError) {
    redirectWithMessage(returnTo, "error", offererBondError.message);
  }

  if (offererBond && !readBoolean(formData, "accept_offerer_performance_bond_terms")) {
    redirectWithMessage(
      returnTo,
      "error",
      "Accept the offer-maker's locked evidence schema and forfeiture rule before responding.",
    );
  }

  const takerBondFields =
    pledgePerformanceBondFeatureEnabled && offer.mode === "pledge"
      ? readPerformanceBondTermsFromForm({
          fallbackAdditionality: readOptional(
            formData,
            "taker_performance_bond_additionality_statement",
          ),
          fallbackNoTradeBaseline: readOptional(formData, "taker_performance_bond_no_trade_baseline"),
          formData,
          prefix: "taker_performance_bond",
        })
      : null;

  if (takerBondFields?.enabled) {
    const takerBondValidation = validatePerformanceBondTerms(
      takerBondFields.terms,
      getPerformanceBondConfig(),
    );

    if (takerBondValidation.errors.length) {
      redirectWithMessage(
        returnTo,
        "error",
        takerBondValidation.errors[0] ?? "Complete reciprocal pledge performance bond fields.",
      );
    }
  }

  const interestedAlias = deriveDisplayName(viewer.authUser, viewer.profile);
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  const { data: interest, error } = await supabase.from("interests").upsert(
    {
      offer_id: offerId,
      user_id: viewer.authUser.id,
      interested_alias: interestedAlias,
      message,
      status: "pending",
    },
    {
      onConflict: "offer_id,user_id",
    },
  ).select("*").single();

  if (error || !interest) {
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to record interest.");
  }

  if (takerBondFields) {
    const serviceSupabase = createServiceClient();
    await upsertDraftPerformanceBond({
      counterpartyId: offer.owner_id,
      forfeitureDestinationId: takerBondFields.forfeitureDestinationId,
      interestId: interest.id,
      offerId,
      partyId: viewer.authUser.id,
      returnTo,
      side: "taker",
      supabase: serviceSupabase,
      terms: takerBondFields.terms,
    });
  }

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", offer.owner_id)
    .maybeSingle();

  const offerResponseEmail = buildMoralTradeSafeEmailCopy("offer_response_received");
  await queueEmailOutbox({
    profileId: viewer.authUser.id,
    recipientEmail: ownerProfile?.email,
    subject: offerResponseEmail.subject,
    body: offerResponseEmail.body,
  });

  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    takerBondFields?.enabled
      ? "Interest and reciprocal pledge performance bond terms recorded."
      : "Interest recorded.",
  );
}

export async function updateProfileAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const displayName = readOptional(formData, "display_name");
  const city = readOptional(formData, "city");
  const region = readOptional(formData, "region");
  const country = readOptional(formData, "country");
  const publicLocationGranularity = normalizePublicLocationGranularity(
    readOptional(formData, "public_location_granularity"),
  );
  const bio = readOptional(formData, "bio");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      city: city || null,
      region: region || null,
      country: country || null,
      public_location_granularity: publicLocationGranularity,
      bio,
    })
    .eq("id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to update profile", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);
  redirectWithMessage(returnTo, "message", "Profile updated.");
}

export async function saveWishProfileAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  const causes = readStringList(formData, "causes_json");
  const offers = readStringList(formData, "offers_json");
  const wishText = readOptional(formData, "wish");
  const askText = readOptional(formData, "ask");
  const constraints = readOptional(formData, "constraints");
  const locationCity = readOptional(formData, "location_city");
  const locationRegion = readOptional(formData, "location_region");
  const verificationPreferences = readOptional(formData, "verification_preferences");
  const participantKind = normalizeParticipantKind(readOptional(formData, "participant_kind"));
  const collectiveName = readOptional(formData, "collective_name");
  const capabilities = readOptional(formData, "capabilities");
  const uncertaintyNotes = readOptional(formData, "uncertainty_notes");
  const privacyStage = normalizePrivacyStage(readOptional(formData, "privacy_stage"));
  const brokeragePreference = readOptional(formData, "brokerage_preference");
  const matchFrequency = normalizeMatchFrequency(readOptional(formData, "match_frequency"));
  const tradeShape = readOptional(formData, "trade_shape") || "Open to proposals";
  const openToPayment = readBoolean(formData, "open_to_payment");
  const openToPledges = readBoolean(formData, "open_to_pledges");
  const isDiscoverable = readBoolean(formData, "is_discoverable");
  const shareLocation = readBoolean(formData, "share_location");
  const sharePublicPreview = readBoolean(formData, "share_public_preview");
  const backgroundSearchEnabled = readBoolean(formData, "background_search_enabled");
  const manualSourceReviewEnabled = readBoolean(formData, "manual_source_review_enabled");
  const notificationEmailEnabled = readBoolean(formData, "notification_email_enabled");
  const notificationDashboardEnabled = readBoolean(formData, "notification_dashboard_enabled");
  const sourceLabel = readOptional(formData, "source_label");
  const sourceUrl = readOptional(formData, "source_url");
  const sourceType = normalizeSourceType(readOptional(formData, "source_type"));
  const sourceAccessLevel = normalizeAccessLevel(readOptional(formData, "source_access_level"));
  const sourceNotes = readOptional(formData, "source_notes");

  const safetyBlock = detectBlockedWishText([
    ...causes,
    ...offers,
    wishText,
    askText,
    participantKind,
    collectiveName,
    capabilities,
    constraints,
    uncertaintyNotes,
    verificationPreferences,
    locationCity,
    locationRegion,
    brokeragePreference,
    sourceLabel,
    sourceUrl,
    sourceNotes,
  ]);

  if (safetyBlock) {
    const { error: profileError } = await supabase.from("wish_profiles").upsert(
      {
        profile_id: viewer.authUser.id,
        participant_kind: participantKind,
        collective_name: participantKind === "individual" ? "" : collectiveName,
        causes,
        location_city: locationCity || null,
        location_region: locationRegion || null,
        capabilities: "",
        constraints: "",
        verification_preferences: "",
        uncertainty_notes: "",
        openness_to_payment: false,
        openness_to_pledges: false,
        background_search_enabled: false,
        manual_source_review_enabled: false,
        notification_email_enabled: false,
        notification_dashboard_enabled: true,
        privacy_stage: "strict",
        brokerage_preference: "",
        match_frequency: "manual",
        is_discoverable: false,
        share_public_preview: false,
        share_location: false,
        public_preview: "",
        safety_status: "blocked",
        safety_notes: `Blocked by safety filter: ${safetyBlock}.`,
      },
      {
        onConflict: "profile_id",
      },
    );

    if (profileError) {
      logSupabaseActionError("Failed to record blocked wish profile attempt", profileError, {
        userId: viewer.authUser.id,
      });
    }

    redirectWithMessage(
      returnTo,
      "error",
      `This wish profile was not saved because it appears to involve ${safetyBlock}. Moral Trade does not support coercive, illegal, harassing, or exploitative asks.`,
    );
  }

  const publicPreview = buildBroadWishPreview({ causes, openToPayment, openToPledges });
  const tradeMode = inferTradeMode({ openToPayment, openToPledges, tradeShape });
  let encryptedWishProfileFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedWishProfileFields = prepareRecordSensitiveTextFields({
      brokerage_preference: brokeragePreference,
      capabilities,
      constraints,
      uncertainty_notes: uncertaintyNotes,
      verification_preferences: verificationPreferences,
    });
  } catch (error) {
    logSupabaseActionError(
      "Failed to encrypt wish profile private fields",
      toActionError(error, "Unknown wish-profile encryption error"),
      {
        userId: viewer.authUser.id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Private wish fields cannot be saved until background field encryption is configured.",
    );
  }

  const { error: profileError } = await supabase.from("wish_profiles").upsert(
    {
      profile_id: viewer.authUser.id,
      participant_kind: participantKind,
      collective_name: participantKind === "individual" ? "" : collectiveName,
      causes,
      location_city: locationCity || null,
      location_region: locationRegion || null,
      capabilities: encryptedWishProfileFields.plaintextFields.capabilities,
      constraints: encryptedWishProfileFields.plaintextFields.constraints,
      verification_preferences: encryptedWishProfileFields.plaintextFields.verification_preferences,
      uncertainty_notes: encryptedWishProfileFields.plaintextFields.uncertainty_notes,
      openness_to_payment: openToPayment,
      openness_to_pledges: openToPledges,
      background_search_enabled: backgroundSearchEnabled,
      manual_source_review_enabled: manualSourceReviewEnabled,
      notification_email_enabled: notificationEmailEnabled,
      notification_dashboard_enabled: notificationDashboardEnabled,
      privacy_stage: privacyStage,
      brokerage_preference: encryptedWishProfileFields.plaintextFields.brokerage_preference,
      match_frequency: matchFrequency,
      is_discoverable: isDiscoverable,
      share_public_preview: sharePublicPreview,
      share_location: shareLocation,
      public_preview: sharePublicPreview ? publicPreview : "",
      safety_status: "clear",
      safety_notes: "",
      sensitive_ciphertexts: encryptedWishProfileFields.ciphertexts,
      sensitive_encryption_version: encryptedWishProfileFields.version,
    },
    {
      onConflict: "profile_id",
    },
  );

  if (profileError) {
    logSupabaseActionError("Failed to save wish profile", profileError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", profileError.message);
  }

  const { error: deleteError } = await supabase
    .from("wish_entries")
    .delete()
    .eq("profile_id", viewer.authUser.id);

  if (deleteError) {
    logSupabaseActionError("Failed to replace wish entries", deleteError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", deleteError.message);
  }

  const entryPayloads: Database["public"]["Tables"]["wish_entries"]["Insert"][] = [];
  const primaryCause = causes[0] ?? "";

  try {
    if (wishText) {
      entryPayloads.push({
        profile_id: viewer.authUser.id,
        entry_type: "wish",
        cause_area: primaryCause,
        title: "Concrete wish",
        ...prepareEncryptedWishEntryBody(wishText),
        trade_mode: tradeMode,
        visibility: "private",
        safety_status: "clear",
      });
    }

    if (offers.length) {
      entryPayloads.push({
        profile_id: viewer.authUser.id,
        entry_type: "offer",
        cause_area: primaryCause,
        title: "What this person can offer",
        ...prepareEncryptedWishEntryBody(offers.join(", ")),
        trade_mode: tradeMode,
        visibility: "private",
        safety_status: "clear",
      });
    }

    if (capabilities) {
      entryPayloads.push({
        profile_id: viewer.authUser.id,
        entry_type: "offer",
        cause_area: primaryCause,
        title: "Capabilities and resources",
        ...prepareEncryptedWishEntryBody(capabilities),
        trade_mode: tradeMode,
        visibility: "private",
        safety_status: "clear",
      });
    }

    if (askText) {
      entryPayloads.push({
        profile_id: viewer.authUser.id,
        entry_type: "ask",
        cause_area: primaryCause,
        title: "Ask from counterparties",
        ...prepareEncryptedWishEntryBody(askText),
        trade_mode: tradeMode,
        visibility: "private",
        safety_status: "clear",
      });
    }
  } catch (error) {
    logSupabaseActionError(
      "Failed to encrypt wish entry private fields",
      toActionError(error, "Unknown wish-entry encryption error"),
      {
        userId: viewer.authUser.id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Private wish entries cannot be saved until background field encryption is configured.",
    );
  }

  const { data: insertedEntries, error: entriesError } = entryPayloads.length
    ? await supabase.from("wish_entries").insert(entryPayloads).select("*")
    : { data: [] as WishEntryRow[], error: null };

  if (entriesError) {
    logSupabaseActionError("Failed to save wish registry entries", entriesError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", entriesError.message);
  }

  if (manualSourceReviewEnabled && sourceLabel) {
    let encryptedProfileSourceFields: ReturnType<typeof prepareRecordSensitiveTextFields>;
    const sourceSnapshotExcerpt = truncateText(sourceNotes || sourceLabel, 420);

    try {
      encryptedProfileSourceFields = prepareRecordSensitiveTextFields({
        notes: sourceNotes,
        snapshot_excerpt: sourceSnapshotExcerpt,
      });
    } catch (error) {
      logSupabaseActionError(
        "Failed to encrypt manual profile source fields",
        toActionError(error, "Unknown manual profile-source encryption error"),
        {
          userId: viewer.authUser.id,
        },
      );
      redirectWithMessage(
        returnTo,
        "error",
        "Manual source notes cannot be saved until background field encryption is configured.",
      );
    }

    const sourcePayload: ProfileSourceInsert = {
      profile_id: viewer.authUser.id,
      source_type: sourceType,
      label: sourceLabel,
      url: sourceUrl,
      access_level: sourceAccessLevel,
      notes: encryptedProfileSourceFields.plaintextFields.notes,
      content_kind: normalizeSourceContentKind(readOptional(formData, "source_content_kind")),
      snapshot_excerpt: encryptedProfileSourceFields.plaintextFields.snapshot_excerpt,
      captured_tags: getBackgroundTokens(`${sourceLabel} ${sourceNotes}`, 12),
      needs_review: manualSourceReviewEnabled,
      imported_at: new Date().toISOString(),
      retention_expires_at: getBackgroundSourceRetentionExpiresAt(90),
      is_active: true,
      sensitive_ciphertexts: encryptedProfileSourceFields.ciphertexts,
      sensitive_encryption_version: encryptedProfileSourceFields.version,
    };
    const { error: sourceError } = await supabase.from("profile_sources").insert(sourcePayload);

    if (sourceError) {
      logSupabaseActionError("Failed to save manual profile source", sourceError, {
        userId: viewer.authUser.id,
      });
    }
  }

  const [
    { data: currentWishProfile, error: currentWishProfileError },
    { data: currentProfileSources, error: currentProfileSourcesError },
    { data: currentSourceConnections, error: currentSourceConnectionsError },
    { data: currentProfileSignals, error: currentProfileSignalsError },
  ] = await Promise.all([
    supabase.from("wish_profiles").select("*").eq("profile_id", viewer.authUser.id).maybeSingle(),
    supabase.from("profile_sources").select("*").eq("profile_id", viewer.authUser.id),
    supabase.from("source_connections").select("*").eq("profile_id", viewer.authUser.id),
    supabase
      .from("background_profile_signals")
      .select("*")
      .eq("profile_id", viewer.authUser.id)
      .eq("status", "active"),
  ]);

  if (currentWishProfileError) {
    logSupabaseActionError("Failed to reload wish profile after save", currentWishProfileError, {
      userId: viewer.authUser.id,
    });
  }

  if (currentProfileSourcesError) {
    logSupabaseActionError("Failed to reload profile sources after save", currentProfileSourcesError, {
      userId: viewer.authUser.id,
    });
  }

  if (currentSourceConnectionsError) {
    logSupabaseActionError(
      "Failed to reload source connections after save",
      currentSourceConnectionsError,
      {
        userId: viewer.authUser.id,
      },
    );
  }

  if (currentProfileSignalsError) {
    logSupabaseActionError("Failed to reload profile signals after save", currentProfileSignalsError, {
      userId: viewer.authUser.id,
    });
  }

  const profileSourcesRows = ((currentProfileSources ?? []) as ProfileSourceRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS),
  );
  const activeProfileSourcesRows = profileSourcesRows.filter((row) =>
    hasActiveProfileSourcePermission(row),
  );
  const sourceConnectionRows = ((currentSourceConnections ?? []) as SourceConnectionRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS),
  );
  const activeSourceConnectionRows = sourceConnectionRows.filter((row) =>
    hasActiveBackgroundSourcePermission(row),
  );
  const profileSignalRows = (currentProfileSignals ?? []) as BackgroundProfileSignalRow[];
  const insertedEntryRows = ((insertedEntries ?? []) as WishEntryRow[]).map((row) =>
    overlayEncryptedWishEntryBody(row),
  );

  const { error: clarificationDeleteError } = await supabase
    .from("clarification_questions")
    .delete()
    .eq("profile_id", viewer.authUser.id)
    .eq("status", "open");

  if (clarificationDeleteError) {
    logSupabaseActionError("Failed to replace open clarification questions", clarificationDeleteError, {
      userId: viewer.authUser.id,
    });
  }

  const clarificationQuestions = buildDeterministicClarificationQuestions({
    askText,
    backgroundSearchEnabled,
    capabilities,
    causes,
    collectiveName,
    constraints,
    locationCity,
    locationRegion,
    manualSourceReviewEnabled,
    offers,
    openToPayment,
    openToPledges,
    participantKind,
    profileId: viewer.authUser.id,
    publicPreview: sharePublicPreview ? publicPreview : "",
    sourceCount:
      activeProfileSourcesRows.length + activeSourceConnectionRows.length + profileSignalRows.length,
    uncertaintyNotes,
    verificationPreferences,
    wishText,
  });

  if (clarificationQuestions.length) {
    const { error: clarificationError } = await supabase
      .from("clarification_questions")
      .insert(clarificationQuestions);

    if (clarificationError) {
      logSupabaseActionError("Failed to insert clarification questions", clarificationError, {
        userId: viewer.authUser.id,
      });
    }
  }

  if (currentWishProfile) {
    const decryptedWishProfile = overlayBackgroundRecordSensitiveText(
      currentWishProfile as WishProfileRow,
      WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
    );
    const synthesisPayload = buildDeterministicSynthesis({
      connections: sourceConnectionRows,
      entries: insertedEntryRows,
      profile: decryptedWishProfile,
      profileSignals: profileSignalRows,
      profileSources: profileSourcesRows,
    });
    let encryptedSynthesisFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

    try {
      encryptedSynthesisFields = prepareRecordSensitiveTextFields({
        capabilities: synthesisPayload.capabilities,
        constraints: synthesisPayload.constraints,
        hopes: synthesisPayload.hopes,
        intent: synthesisPayload.intent,
        uncertainty: synthesisPayload.uncertainty,
      });
    } catch (error) {
      logSupabaseActionError(
        "Failed to encrypt profile synthesis private fields",
        toActionError(error, "Unknown profile-synthesis encryption error"),
        {
          userId: viewer.authUser.id,
        },
      );
      redirectWithMessage(
        returnTo,
        "error",
        "Profile synthesis cannot be saved until background field encryption is configured.",
      );
    }

    const { error: synthesisError } = await supabase
      .from("profile_syntheses")
      .upsert(
        {
          profile_id: viewer.authUser.id,
          ...synthesisPayload,
          capabilities: encryptedSynthesisFields.plaintextFields.capabilities,
          constraints: encryptedSynthesisFields.plaintextFields.constraints,
          hopes: encryptedSynthesisFields.plaintextFields.hopes,
          intent: encryptedSynthesisFields.plaintextFields.intent,
          uncertainty: encryptedSynthesisFields.plaintextFields.uncertainty,
          sensitive_ciphertexts: encryptedSynthesisFields.ciphertexts,
          sensitive_encryption_version: encryptedSynthesisFields.version,
        },
        { onConflict: "profile_id" },
      );

    if (synthesisError) {
      logSupabaseActionError("Failed to refresh synthesis during wish profile save", synthesisError, {
        userId: viewer.authUser.id,
      });
    } else {
      await replaceBackgroundIntentClaims({
        profile: decryptedWishProfile,
        sourceConnections: sourceConnectionRows,
        supabase,
        synthesis: synthesisPayload,
        userId: viewer.authUser.id,
      });
    }
  }

  if (isDiscoverable && sharePublicPreview && backgroundSearchEnabled) {
    const viewerEntry =
      insertedEntryRows.find((entry) => entry.entry_type === "ask") ??
      insertedEntryRows[0] ??
      null;

    const runResult = await generateWishMatchSuggestions({
      profileId: viewer.authUser.id,
      causes,
      wishText,
      askText,
      offerText: [offers.join(", "), capabilities].filter(Boolean).join(", "),
      openToPayment,
      openToPledges,
      viewerEntry,
      runReason: "profile-save",
    });

    const { error: runError } = await supabase.from("background_match_runs").insert({
      profile_id: viewer.authUser.id,
      status: runResult.budgetLimited ? "failed" : "completed",
      run_reason: "profile-save",
      candidates_scanned: runResult.candidatesScanned,
      matches_created: runResult.matchesCreated,
      matches_refreshed: runResult.matchesRefreshed,
      error_message: runResult.budgetLimited
        ? "Daily background query budget reached. Profile was saved without running a scan."
        : "",
      completed_at: new Date().toISOString(),
    });

    if (runError) {
      logSupabaseActionError("Failed to save background match run", runError, {
        userId: viewer.authUser.id,
      });
    }

    await recordServerFunnelEvent({
      eventType: "background_scan_run",
      metadata: {
        candidateBucket: runResult.candidatesScanned > 100 ? "100+" : String(runResult.candidatesScanned),
        matchesCreated: runResult.matchesCreated,
        matchesRefreshed: runResult.matchesRefreshed,
        runReason: "profile-save",
      },
      path: returnTo,
      profileId: viewer.authUser.id,
      supabase,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);
  redirectWithMessage(returnTo, "message", "Private wish profile saved and safe match suggestions refreshed.");
}

export async function consentToMatchSuggestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const matchId = readRequired(formData, "match_id");
  const note = readOptional(formData, "note");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!matchId) {
    redirectWithMessage(returnTo, "error", "Match ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: consentResult, error: consentError } = await supabase.rpc(
    "viewer_consent_to_match",
    {
      target_match_id: matchId,
      consent_note: note,
    },
  );

  if (consentError) {
    logSupabaseActionError("Failed to record match consent", consentError, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", consentError.message);
  }

  const consentState = consentResult?.[0] ?? null;
  const bothConsented = Boolean(consentState?.both_consented);

  if (bothConsented && consentState) {
    const serviceClient = createServiceClient();
    const notificationResult = await insertWishNotificationsWithSafeEmail({
      notifications: [
        {
          profile_id: viewer.authUser.id,
          match_id: matchId,
          kind: "consent",
          title: "Both sides opted in",
          body: "Identity details can now be shown for this possible moral trade.",
        },
        {
          profile_id: consentState.counterparty_id,
          match_id: matchId,
          kind: "consent",
          title: "Both sides opted in",
          body: "Identity details can now be shown for this possible moral trade.",
        },
      ],
      supabase: serviceClient,
    });

    if (notificationResult.notificationError) {
      logSupabaseActionError("Failed to create match consent notifications", notificationResult.notificationError, {
        matchId,
      });
    }

    if (notificationResult.emailError) {
      logSupabaseActionError("Failed to queue match consent email notifications", notificationResult.emailError, {
        matchId,
      });
    }

    try {
      const { data: match, error: matchError } = await serviceClient
        .from("match_suggestions")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (matchError || !match) {
        throw new Error(matchError?.message ?? "Match suggestion not found.");
      }

      await insertMatchExplanationSnapshots({
        snapshots: [match.profile_a_id, match.profile_b_id].map((profileId) =>
          buildMatchExplanationSnapshot({
            canRevealIdentity: true,
            counterpartyConsented: true,
            generatedBy: match.generated_by,
            matchBasis: match.match_basis,
            matchId,
            profileId,
            riskNotes: match.risk_notes,
            score: match.score,
            sharedCauses: match.shared_causes,
            sourceRunId: "mutual-consent",
            sourceRunKind: "manual_scan",
            status: match.status,
            suggestedFirstStep: match.suggested_first_step,
            viewerConsented: true,
          }),
        ),
        supabase: serviceClient,
      });

      const { error: planError } = await serviceClient
        .from("match_introduction_plans")
        .upsert(
          buildIntroductionPlanPayloads({
            matchId,
            profileAId: match.profile_a_id,
            profileBId: match.profile_b_id,
            reasonForA: match.reason_for_a,
            reasonForB: match.reason_for_b,
            suggestedFirstStep: match.suggested_first_step,
            riskNotes: match.risk_notes,
          }),
          { onConflict: "match_id,profile_id" },
        );

      if (planError) {
        throw new Error(planError.message);
      }

      const { data: selectedPlans, error: selectPlansError } = await serviceClient
        .from("match_introduction_plans")
        .select("id, profile_id, counterparty_id")
        .eq("match_id", matchId);

      if (selectPlansError) {
        throw new Error(selectPlansError.message);
      }

      const taskPayloads = (selectedPlans ?? []).flatMap((plan) =>
        buildIntroductionTaskPayloads({
          planId: plan.id,
          profileId: plan.profile_id,
        }),
      );

      if (taskPayloads.length) {
        const { error: taskError } = await serviceClient
          .from("match_introduction_tasks")
          .upsert(taskPayloads, { onConflict: "plan_id,step_key" });

        if (taskError) {
          throw new Error(taskError.message);
        }
      }

      await serviceClient.from("match_audit_events").insert({
        match_id: matchId,
        actor_profile_id: viewer.authUser.id,
        event_type: "introduction_plan_created",
        summary:
          "Both sides consented; non-AI first-step plans and introduction tasks were generated for each participant.",
        metadata: { generatedBy: "deterministic-template-v2", taskCount: taskPayloads.length },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create introduction plans.";
      console.error("[supabase] Failed to create deterministic introduction plans", {
        matchId,
        userId: viewer.authUser.id,
        message,
      });
    }
  }

  await recordServerFunnelEvent({
    eventType: "match_consent_recorded",
    metadata: {
      bothConsented,
      hasNote: Boolean(note),
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    bothConsented
      ? "Both sides have consented. The counterparty can now be shown."
      : "Consent recorded. The counterparty remains hidden until both sides opt in.",
  );
}

export async function dismissMatchSuggestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const matchId = readRequired(formData, "match_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!matchId) {
    redirectWithMessage(returnTo, "error", "Match ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_suggestions")
    .update({
      status: "dismissed",
    })
    .eq("id", matchId)
    .or(`profile_a_id.eq.${viewer.authUser.id},profile_b_id.eq.${viewer.authUser.id}`);

  if (error) {
    logSupabaseActionError("Failed to dismiss match suggestion", error, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Match suggestion dismissed.");
}

export async function markWishNotificationReadAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const notificationId = readRequired(formData, "notification_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!notificationId) {
    redirectWithMessage(returnTo, "error", "Notification ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("wish_notifications")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to mark wish notification as read", error, {
      notificationId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Notification marked as read.");
}

export async function updateIntroductionTaskAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const taskId = readRequired(formData, "task_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!taskId) {
    redirectWithMessage(returnTo, "error", "Introduction task ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const nextStatus = (() => {
    const value = readOptional(formData, "status");

    if (value === "in_progress" || value === "done" || value === "skipped") {
      return value;
    }

    return "pending";
  })();
  const note = readOptional(formData, "note");
  const completedAt = nextStatus === "done" ? new Date().toISOString() : null;

  const { data: task, error: taskError } = await supabase
    .from("match_introduction_tasks")
    .select("id, plan_id, profile_id")
    .eq("id", taskId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (taskError || !task) {
    logSupabaseActionError("Failed to load introduction task before update", taskError, {
      taskId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", taskError?.message ?? "Introduction task not found.");
  }

  const { error: updateError } = await supabase
    .from("match_introduction_tasks")
    .update({
      status: nextStatus,
      note,
      completed_at: completedAt,
    })
    .eq("id", taskId)
    .eq("profile_id", viewer.authUser.id);

  if (updateError) {
    logSupabaseActionError("Failed to update introduction task", updateError, {
      taskId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const { data: siblingTasks, error: siblingTasksError } = await supabase
    .from("match_introduction_tasks")
    .select("status")
    .eq("plan_id", task.plan_id)
    .eq("profile_id", viewer.authUser.id);

  if (siblingTasksError) {
    logSupabaseActionError("Failed to load sibling introduction tasks", siblingTasksError, {
      planId: task.plan_id,
      userId: viewer.authUser.id,
    });
  } else {
    const allClosed = (siblingTasks ?? []).every(
      (entry) => entry.status === "done" || entry.status === "skipped",
    );
    const anyProgress = (siblingTasks ?? []).some(
      (entry) => entry.status === "in_progress" || entry.status === "done",
    );
    const nextPlanStatus = allClosed || anyProgress ? "shared" : "draft";

    const { error: planError } = await supabase
      .from("match_introduction_plans")
      .update({ status: nextPlanStatus })
      .eq("id", task.plan_id)
      .eq("profile_id", viewer.authUser.id);

    if (planError) {
      logSupabaseActionError("Failed to update introduction plan after task update", planError, {
        planId: task.plan_id,
        userId: viewer.authUser.id,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Introduction task updated.");
}

export async function createAgreementRoomFromIntroductionPlanAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const planId = readRequired(formData, "plan_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!planId) {
    redirectWithMessage(returnTo, "error", "Introduction plan ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("match_introduction_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (planError || !plan) {
    redirectWithMessage(returnTo, "error", planError?.message ?? "Introduction plan not found.");
  }

  const introductionPlan = plan as MatchIntroductionPlanRow;
  if (
    introductionPlan.profile_id !== viewer.authUser.id &&
    introductionPlan.counterparty_id !== viewer.authUser.id
  ) {
    redirectWithMessage(returnTo, "error", "You can only open rooms for your own introductions.");
  }

  const counterpartyId =
    introductionPlan.profile_id === viewer.authUser.id
      ? introductionPlan.counterparty_id
      : introductionPlan.profile_id;

  const { data: existingAgreement, error: existingAgreementError } = await supabase
    .from("agreements")
    .select("id")
    .eq("introduction_plan_id", planId)
    .maybeSingle();

  if (existingAgreementError) {
    redirectWithMessage(returnTo, "error", existingAgreementError.message);
  }

  if (existingAgreement?.id) {
    redirect(`/agreements/${existingAgreement.id}`);
  }

  const agreementPayload: AgreementInsert = {
    offer_id: null,
    interest_id: null,
    match_id: introductionPlan.match_id,
    introduction_plan_id: introductionPlan.id,
    source: "introduction",
    proposer_id: viewer.authUser.id,
    responder_id: counterpartyId,
    status: "proposed",
    notes: introductionPlan.next_actions || introductionPlan.intro_message,
    structured_terms:
      introductionPlan.proposal_terms ||
      introductionPlan.proposal_outline ||
      "Draft the bounded moral trade before either side relies on it.",
    duration_terms: introductionPlan.timeline,
    evidence_rule: introductionPlan.verification_plan,
    privacy_scope: introductionPlan.privacy_notes,
    disclosure_scope:
      "Share only the facts both sides need for this agreement room. Keep exact wishes and contact details behind explicit consent.",
    completion_state: "pending_evidence",
  };

  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .insert(agreementPayload)
    .select("id")
    .single();

  if (agreementError || !agreement) {
    logSupabaseActionError("Failed to create agreement room from introduction", agreementError, {
      planId,
      userId: viewer.authUser.id,
      counterpartyId,
    });
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Unable to create agreement room.");
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreement.id,
    actor_id: viewer.authUser.id,
    event_type: "terms_updated",
    summary: "Agreement room opened from accepted introduction.",
    details:
      "The room starts with drafted terms from the introduction plan. Both parties should confirm baseline, counterfactual, evidence, exit, and privacy terms before evidence review.",
  });

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreement.id}`);
  redirect(`/agreements/${agreement.id}`);
}

export async function refreshBackgroundMatchesAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase.from("wish_profiles").select("*").eq("profile_id", viewer.authUser.id).maybeSingle(),
      supabase
        .from("wish_entries")
        .select("*")
        .eq("profile_id", viewer.authUser.id)
        .eq("safety_status", "clear"),
    ]);

  if (profileError || entriesError || !profile) {
    const message =
      profileError?.message ??
      entriesError?.message ??
      "Save a private wish profile before running background matching.";

    await supabase.from("background_match_runs").insert({
      profile_id: viewer.authUser.id,
      status: "failed",
      run_reason: "manual-refresh",
      error_message: message,
      completed_at: new Date().toISOString(),
    });

    redirectWithMessage(returnTo, "error", message);
  }

  const wishProfile = overlayBackgroundRecordSensitiveText(
    profile as WishProfileRow,
    WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  );
  const decryptedEntries = ((entries ?? []) as WishEntryRow[]).map((entry) =>
    overlayEncryptedWishEntryBody(entry),
  );
  const wishEntries = decryptedEntries.filter((entry) => entry.entry_type === "wish");
  const offerEntries = decryptedEntries.filter((entry) => entry.entry_type === "offer");
  const askEntries = decryptedEntries.filter((entry) => entry.entry_type === "ask");
  const viewerEntry = askEntries[0] ?? wishEntries[0] ?? offerEntries[0] ?? null;

  if (!wishProfile.is_discoverable || !wishProfile.share_public_preview) {
    redirectWithMessage(
      returnTo,
      "error",
      "Enable discoverability and public preview before running background matching.",
    );
  }

  const runResult = await generateWishMatchSuggestions({
    profileId: viewer.authUser.id,
    causes: wishProfile.causes,
    wishText: wishEntries.map((entry) => entry.body).join(" "),
    askText: askEntries.map((entry) => entry.body).join(" "),
    offerText: offerEntries.map((entry) => entry.body).join(" "),
    openToPayment: wishProfile.openness_to_payment,
    openToPledges: wishProfile.openness_to_pledges,
    viewerEntry,
    runReason: "manual-refresh",
  });

  if (runResult.budgetLimited) {
    await supabase.from("background_match_runs").insert({
      profile_id: viewer.authUser.id,
      status: "failed",
      run_reason: "manual-refresh",
      error_message:
        "Daily background query budget reached. Try again after the budget window resets.",
      completed_at: new Date().toISOString(),
    });

    redirectWithMessage(
      returnTo,
      "error",
      "Daily background query budget reached. Try again after the budget window resets.",
    );
  }

  const { error: runError } = await supabase.from("background_match_runs").insert({
    profile_id: viewer.authUser.id,
    status: "completed",
    run_reason: "manual-refresh",
    candidates_scanned: runResult.candidatesScanned,
    matches_created: runResult.matchesCreated,
    matches_refreshed: runResult.matchesRefreshed,
    completed_at: new Date().toISOString(),
  });

  if (runError) {
    logSupabaseActionError("Failed to save manual background match run", runError, {
      userId: viewer.authUser.id,
    });
  }

  await recordServerFunnelEvent({
    eventType: "background_scan_run",
    metadata: {
      candidateBucket: runResult.candidatesScanned > 100 ? "100+" : String(runResult.candidatesScanned),
      matchesCreated: runResult.matchesCreated,
      matchesRefreshed: runResult.matchesRefreshed,
      runReason: "manual-refresh",
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    `Background scan finished: ${runResult.matchesCreated} new match(es), ${runResult.matchesRefreshed} refreshed.`,
  );
}

export async function answerClarificationQuestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const questionId = readRequired(formData, "question_id");
  const answer = readRequired(formData, "answer");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!questionId || !answer) {
    redirectWithMessage(returnTo, "error", "Question and answer are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clarification_questions")
    .update({
      answer,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to answer clarification question", error, {
      questionId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Clarification saved.");
}

export async function dismissClarificationQuestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const questionId = readRequired(formData, "question_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!questionId) {
    redirectWithMessage(returnTo, "error", "Question ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase
    .from("clarification_questions")
    .update({
      status: "dismissed",
    })
    .eq("id", questionId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to dismiss clarification question", error, {
      questionId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Clarification dismissed.");
}

export async function createPrivacyAccessRequestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const ownerProfileId = readRequired(formData, "owner_profile_id");
  const requestedFields = readDisclosureFieldKeys(formData);
  const purpose = readOptional(formData, "purpose");
  const requestedStage = normalizeDisclosureStage(readOptional(formData, "requested_stage"));

  if (!ownerProfileId || !requestedFields.length) {
    redirectWithMessage(
      returnTo,
      "error",
      "An owner profile and at least one requested field are required.",
    );
  }

  const viewer = await requireViewer(returnTo);

  enforceActionRateLimit({
    key: `privacy-access-request:${viewer.authUser.id}`,
    limit: 12,
    message: "Too many privacy access requests were sent today. Try again later.",
    returnTo,
    windowMs: 24 * 60 * 60 * 1000,
  });

  if (ownerProfileId === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot request private access from yourself.");
  }

  if (!purpose) {
    redirectWithMessage(
      returnTo,
      "error",
      "Add a narrow purpose for this disclosure request before asking for private fields.",
    );
  }

  const disclosureValidation = validateDisclosureRequest({
    accessLevel: "broad",
    fieldKeys: requestedFields,
    purpose,
    stage: requestedStage,
  });

  if (disclosureValidation.errors.length) {
    redirectWithMessage(returnTo, "error", disclosureErrorsToMessage(disclosureValidation.errors));
  }
  const allowedFields = disclosureValidation.allowedFields;
  const supabase = await createClient();
  const { data: recentRequests, error: recentRequestsError } = await supabase
    .from("privacy_access_requests")
    .select("created_at, requested_fields, requested_stage, status")
    .eq("requester_profile_id", viewer.authUser.id)
    .eq("owner_profile_id", ownerProfileId)
    .gte("created_at", getPrivacyAccessRequestWindowStart())
    .order("created_at", { ascending: false })
    .limit(20);

  if (recentRequestsError) {
    logSupabaseActionError("Failed to check recent privacy access requests", recentRequestsError, {
      ownerProfileId,
      requesterProfileId: viewer.authUser.id,
    });
    redirectWithMessage(
      returnTo,
      "error",
      "Unable to check recent detail requests. Try again before requesting private fields.",
    );
  }

  const cadenceDecision = evaluatePrivacyAccessRequestCadence({
    recentRequests: (recentRequests ?? []) as PrivacyAccessRequestCadenceRow[],
    requestedFields: allowedFields,
    requestedStage,
  });

  if (
    !cadenceDecision.allowed ||
    cadenceDecision.similarRequestCount >= 2 ||
    cadenceDecision.recentRequestCount >= 4
  ) {
    const serviceClient = createServiceClient();
    await recordBackgroundQueryRiskSignal({
      metadata: {
        pendingRequestCount: cadenceDecision.pendingRequestCount,
        recentRequestCount: cadenceDecision.recentRequestCount,
        requestedFieldCount: allowedFields.length,
        requestedStage,
        similarPendingCount: cadenceDecision.similarPendingCount,
        similarRequestCount: cadenceDecision.similarRequestCount,
      },
      profileId: viewer.authUser.id,
      severity: cadenceDecision.allowed ? "low" : "medium",
      signalType: "detail_request_probe_pressure",
      summary:
        "A detail request pattern approached or crossed the repeated-request privacy threshold.",
      supabase: serviceClient,
    });
  }

  if (!cadenceDecision.allowed) {
    redirectWithMessage(returnTo, "error", disclosureErrorsToMessage(cadenceDecision.blockers));
  }

  const payload: PrivacyAccessRequestInsert = {
    owner_profile_id: ownerProfileId,
    requester_profile_id: viewer.authUser.id,
    match_id: readOptional(formData, "match_id") || null,
    requested_fields: allowedFields,
    requested_stage: requestedStage,
    purpose,
    justification: readOptional(formData, "justification"),
    status: "pending",
  };

  const { data: requestRow, error } = await supabase
    .from("privacy_access_requests")
    .insert(payload)
    .select("id, match_id")
    .maybeSingle();

  if (error || !requestRow) {
    logSupabaseActionError("Failed to create privacy access request", error, {
      ownerProfileId,
      requesterProfileId: viewer.authUser.id,
    });
    redirectWithMessage(
      returnTo,
      "error",
      error?.message ?? "Unable to create privacy access request.",
    );
  }

  const serviceClient = createServiceClient();
  const notificationResult = await insertWishNotificationsWithSafeEmail({
    notifications: {
      profile_id: ownerProfileId,
      kind: "consent",
      title: "Privacy access request",
      body: `${viewer.displayName} requested a purpose-bound disclosure for ${payload.requested_stage}-stage discussion.`,
      match_id: payload.match_id,
    },
    supabase: serviceClient,
  });

  if (notificationResult.notificationError) {
    logSupabaseActionError("Failed to create privacy access request notification", notificationResult.notificationError, {
      ownerProfileId,
      requesterProfileId: viewer.authUser.id,
      requestId: requestRow.id,
    });
  }

  if (notificationResult.emailError) {
    logSupabaseActionError("Failed to queue privacy access request email notification", notificationResult.emailError, {
      ownerProfileId,
      requesterProfileId: viewer.authUser.id,
      requestId: requestRow.id,
    });
  }

  if (payload.match_id) {
    const { error: auditError } = await serviceClient.from("match_audit_events").insert({
      match_id: payload.match_id,
      actor_profile_id: viewer.authUser.id,
      event_type: "privacy_access_requested",
      summary: `Privacy access requested for ${allowedFields.length} field(s).`,
      metadata: {
        requestId: requestRow.id,
        requestedFieldCount: allowedFields.length,
        requestedStage: payload.requested_stage,
      },
    });

    if (auditError) {
      logSupabaseActionError("Failed to record privacy access audit event", auditError, {
        matchId: payload.match_id,
        requestId: requestRow.id,
      });
    }
  }

  await recordServerFunnelEvent({
    eventType: "detail_request_submitted",
    metadata: {
      fieldCount: allowedFields.length,
      hasMatch: Boolean(payload.match_id),
      requestedStage: payload.requested_stage,
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy access request recorded.");
}

export async function createMatchConciergeRequestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/background-networking", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/background-networking");
  const viewer = await requireViewer(returnTo);

  enforceActionRateLimit({
    key: `match-concierge-request:${viewer.authUser.id}`,
    limit: 10,
    message: "Too many concierge requests were created today. Try again tomorrow.",
    returnTo,
    windowMs: 24 * 60 * 60 * 1000,
  });

  const targetProfileId = readOptional(formData, "target_profile_id") || null;
  if (targetProfileId === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot request an introduction to yourself.");
  }

  const causeAreas = readStringList(formData, "cause_areas_json");
  const intentSummary = readRequired(formData, "intent_summary");
  const offerSummary = readOptional(formData, "offer_summary");
  const askSummary = readOptional(formData, "ask_summary");
  const constraints = readOptional(formData, "constraints");
  const noTradeBaseline = readOptional(formData, "no_trade_baseline");
  const targetPreview = readOptional(formData, "target_preview");

  if (!intentSummary || (!targetProfileId && !targetPreview && !askSummary)) {
    redirectWithMessage(
      returnTo,
      "error",
      "Describe the introduction you want and either choose a target preview or state the counterparty you need.",
    );
  }

  if (noTradeBaseline.trim().length < 12) {
    redirectWithMessage(
      returnTo,
      "error",
      "State what happens if no trade or introduction occurs before requesting concierge review.",
    );
  }

  const safetyBlock = detectBlockedWishText([
    ...causeAreas,
    intentSummary,
    offerSummary,
    askSummary,
    constraints,
    noTradeBaseline,
    targetPreview,
  ]);

  if (safetyBlock) {
    redirectWithMessage(
      returnTo,
      "error",
      `This concierge request was not saved because it appears to involve ${safetyBlock}.`,
    );
  }

  const payload: MatchConciergeRequestInsert = {
    requester_profile_id: viewer.authUser.id,
    target_profile_id: targetProfileId,
    match_id: readOptional(formData, "match_id") || null,
    route: normalizeConciergeRoute(readOptional(formData, "route")),
    cause_areas: causeAreas,
    target_preview: truncateText(targetPreview, 520),
    intent_summary: truncateText(intentSummary, 900),
    offer_summary: truncateText(offerSummary, 900),
    ask_summary: truncateText(askSummary, 900),
    constraints: truncateText(constraints, 900),
    no_trade_baseline: truncateText(noTradeBaseline, 900),
    desired_timeline: truncateText(readOptional(formData, "desired_timeline"), 240),
    risk_notes: "",
    status: "open",
    operator_notes: "",
    sla_due_at: buildSlaDueAt(24),
  };

  const supabase = await createClient();
  const { data: requestRow, error } = await supabase
    .from("match_concierge_requests")
    .insert(payload)
    .select("id, target_profile_id")
    .single();

  if (error || !requestRow) {
    logSupabaseActionError("Failed to create match concierge request", error, {
      userId: viewer.authUser.id,
      targetProfileId,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to create concierge request.");
  }

  const serviceClient = createServiceClient();
  const { error: eventError } = await serviceClient.from("match_concierge_events").insert({
    request_id: requestRow.id,
    actor_profile_id: viewer.authUser.id,
    event_type: "request_created",
    summary: "Participant requested concierge help moving from broad preview to introduction.",
    metadata: {
      route: payload.route,
      causeAreas,
      hasTargetProfile: Boolean(targetProfileId),
      noTradeBaselineRecorded: true,
      slaDueAt: payload.sla_due_at,
    },
  });

  if (eventError) {
    logSupabaseActionError("Failed to record match concierge request event", eventError, {
      requestId: requestRow.id,
    });
  }

  if (requestRow.target_profile_id) {
    const notificationResult = await insertWishNotificationsWithSafeEmail({
      notifications: {
        profile_id: requestRow.target_profile_id,
        kind: "consent",
        title: "Concierge introduction request",
        body:
          "A participant asked an operator to review whether an introduction would be appropriate. No private details were disclosed.",
        match_id: payload.match_id,
      },
      supabase: serviceClient,
    });

    if (notificationResult.notificationError) {
      logSupabaseActionError("Failed to notify target of concierge request", notificationResult.notificationError, {
        requestId: requestRow.id,
        targetProfileId: requestRow.target_profile_id,
      });
    }

    if (notificationResult.emailError) {
      logSupabaseActionError("Failed to queue target concierge request email", notificationResult.emailError, {
        requestId: requestRow.id,
        targetProfileId: requestRow.target_profile_id,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/background-networking");
  revalidatePath("/wish-registry");
  redirectWithMessage(
    returnTo,
    "message",
    "Concierge request queued. An operator can triage it before any introduction or private disclosure.",
  );
}

export async function updateMatchConciergeRequestAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const requestId = readRequired(formData, "request_id");

  if (!requestId) {
    redirectWithMessage(returnTo, "error", "Concierge request ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const nextStatus = normalizeConciergeStatus(readRequired(formData, "status"));
  const appealStatus = normalizeBackgroundConciergeAppealStatus(readOptional(formData, "appeal_status"));
  const appealResolvedAt = getConciergeAppealResolutionTimestamp(appealStatus);
  const operatorNotes = readOptional(formData, "operator_notes");
  const riskNotes = readOptional(formData, "risk_notes");
  const matchId = readOptional(formData, "match_id") || null;
  const reviewedAt =
    nextStatus === "open" ? null : new Date().toISOString();
  const updatePayload: MatchConciergeRequestUpdate = {
    status: nextStatus,
    operator_notes: operatorNotes,
    risk_notes: riskNotes,
    match_id: matchId,
    reviewed_by: nextStatus === "open" ? null : admin.authUser.id,
    reviewed_at: reviewedAt,
    appeal_status: appealStatus,
    appeal_resolution_note: readOptional(formData, "appeal_resolution_note").slice(0, 2000),
    appeal_resolved_at: appealResolvedAt,
    appeal_resolved_by: appealResolvedAt ? admin.authUser.id : null,
  };

  const { data: requestRow, error } = await supabase
    .from("match_concierge_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .select("*")
    .single();

  if (error || !requestRow) {
    logSupabaseActionError("Failed to update match concierge request", error, {
      requestId,
      nextStatus,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Concierge request not found.");
  }

  const { error: eventError } = await supabase.from("match_concierge_events").insert({
    request_id: requestId,
    actor_profile_id: admin.authUser.id,
    event_type: "request_triaged",
    summary: `Operator moved concierge request to ${nextStatus}.`,
    metadata: {
      appealStatus,
      operatorNotes,
      riskNotes,
      matchId,
    },
  });

  if (eventError) {
    logSupabaseActionError("Failed to record match concierge triage event", eventError, {
      requestId,
      nextStatus,
    });
  }

  if (nextStatus === "introduced" && matchId) {
    const { error: matchError } = await supabase
      .from("match_suggestions")
      .update({
        status: "introduced",
        identity_revealed: true,
      })
      .eq("id", matchId);

    if (matchError) {
      logSupabaseActionError("Failed to mark match introduced after concierge triage", matchError, {
        requestId,
        matchId,
      });
    }
  }

  const notificationTargets = [
    requestRow.requester_profile_id,
    requestRow.target_profile_id,
  ].filter((profileId): profileId is string => Boolean(profileId));

  if (notificationTargets.length) {
    const notificationResult = await insertWishNotificationsWithSafeEmail({
      notifications: notificationTargets.map((profileId) => ({
        profile_id: profileId,
        kind: "consent" as const,
        title: "Concierge request updated",
        body: `An operator moved the introduction request to ${nextStatus.replaceAll("_", " ")}.`,
        match_id: matchId,
      })),
      supabase,
    });

    if (notificationResult.notificationError) {
      logSupabaseActionError("Failed to notify concierge request participants", notificationResult.notificationError, {
        requestId,
        nextStatus,
      });
    }

    if (notificationResult.emailError) {
      logSupabaseActionError("Failed to queue concierge request update emails", notificationResult.emailError, {
        requestId,
        nextStatus,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/background-networking");
  redirectWithMessage(returnTo, "message", "Concierge request updated.");
}

export async function reportMatchSuggestionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const matchId = readRequired(formData, "match_id");
  const reason = normalizeReportReason(readOptional(formData, "reason"));
  const details = readOptional(formData, "details");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!matchId) {
    redirectWithMessage(returnTo, "error", "Match ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("match_reports").insert({
    match_id: matchId,
    reporter_profile_id: viewer.authUser.id,
    reason,
    details,
  });

  if (error) {
    logSupabaseActionError("Failed to report match suggestion", error, {
      matchId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { error: auditError } = await supabase.from("match_audit_events").insert({
    match_id: matchId,
    actor_profile_id: viewer.authUser.id,
    event_type: "match_reported",
    summary: `Participant reported this suggestion for ${reason}.`,
    metadata: { reason },
  });

  if (auditError) {
    logSupabaseActionError("Failed to write match report audit event", auditError, {
      matchId,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Report submitted for review.");
}

export async function saveProfileSourceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "source_label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Source label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const sourceNotes = readOptional(formData, "source_notes");
  const sourceLabel = label;
  const sourceSnapshotExcerpt = truncateText(
    readOptional(formData, "snapshot_excerpt") || sourceNotes || sourceLabel,
    420,
  );
  let encryptedProfileSourceFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedProfileSourceFields = prepareRecordSensitiveTextFields({
      notes: sourceNotes,
      snapshot_excerpt: sourceSnapshotExcerpt,
    });
  } catch (error) {
    logSupabaseActionError(
      "Failed to encrypt profile source fields",
      toActionError(error, "Unknown profile-source encryption error"),
      {
        userId: viewer.authUser.id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Source notes cannot be saved until background field encryption is configured.",
    );
  }

  const supabase = await createClient();
  const payload: ProfileSourceInsert = {
    profile_id: viewer.authUser.id,
    source_type: normalizeSourceType(readOptional(formData, "source_type")),
    label: sourceLabel,
    url: readOptional(formData, "source_url"),
    access_level: normalizeAccessLevel(readOptional(formData, "source_access_level")),
    content_kind: normalizeSourceContentKind(readOptional(formData, "source_content_kind")),
    notes: encryptedProfileSourceFields.plaintextFields.notes,
    snapshot_excerpt: encryptedProfileSourceFields.plaintextFields.snapshot_excerpt,
    captured_tags: getBackgroundTokens(
      `${sourceLabel} ${sourceNotes} ${readOptional(formData, "captured_tags")}`,
      12,
    ),
    needs_review: readBoolean(formData, "needs_review"),
    imported_at:
      parseOptionalTimestamp(readOptional(formData, "imported_at")) ?? new Date().toISOString(),
    retention_expires_at: getBackgroundSourceRetentionExpiresAt(
      readOptional(formData, "retention_days") || 90,
    ),
    is_active: true,
    sensitive_ciphertexts: encryptedProfileSourceFields.ciphertexts,
    sensitive_encryption_version: encryptedProfileSourceFields.version,
  };
  const { error } = await supabase.from("profile_sources").insert(payload);

  if (error) {
    logSupabaseActionError("Failed to save profile source", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Source saved. It is not automatically ingested.");
}

export async function createNetworkInviteAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const targetLabel = readRequired(formData, "target_label");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!targetLabel) {
    redirectWithMessage(returnTo, "error", "Invite target is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("network_invites").insert({
    profile_id: viewer.authUser.id,
    target_kind: normalizeNetworkInviteTargetKind(readOptional(formData, "target_kind")),
    target_label: targetLabel,
    target_url: readOptional(formData, "target_url"),
    target_context: readOptional(formData, "target_context"),
    desired_capability: readOptional(formData, "desired_capability"),
    suggested_message: readOptional(formData, "suggested_message"),
    priority: readBoundedInt(formData, "priority", {
      fallback: 3,
      min: 1,
      max: 5,
    }),
    reason: readOptional(formData, "reason"),
  });

  if (error) {
    logSupabaseActionError("Failed to draft network invite", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await recordServerFunnelEvent({
    eventType: "referral_invite_drafted",
    metadata: {
      hasTargetUrl: Boolean(readOptional(formData, "target_url")),
      targetKind: readOptional(formData, "target_kind") || "person",
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Network expansion draft saved.");
}

export async function savePersonalDelegateAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const goals = readStringList(formData, "goals_json");
  const allowedPurposeCodes = normalizeBackgroundPurposeCodeList([
    ...readStringList(formData, "allowed_purpose_codes_json"),
    ...readRepeatedStrings(formData, "allowed_purpose_codes", 6),
  ]);
  const label = readOptional(formData, "label") || "Personal delegate";
  const operatingMode = normalizeDelegateMode(readOptional(formData, "operating_mode"));

  if (operatingMode === "active" && !allowedPurposeCodes.length) {
    redirectWithMessage(
      returnTo,
      "error",
      "An active personal delegate needs at least one allowed purpose.",
    );
  }

  const status = operatingMode === "paused" ? "paused" : "active";
  const payload: PersonalDelegateInsert = {
    profile_id: viewer.authUser.id,
    label,
    goals,
    operating_mode: operatingMode,
    search_scope: readOptional(formData, "search_scope"),
    risk_tolerance: normalizeDelegateRiskTolerance(readOptional(formData, "risk_tolerance")),
    introduction_policy: normalizeIntroductionPolicy(readOptional(formData, "introduction_policy")),
    allowed_purpose_bindings: buildBackgroundPurposeBindingRecord(allowedPurposeCodes),
    max_weekly_suggestions: readBoundedInt(formData, "max_weekly_suggestions", {
      fallback: 5,
      min: 0,
      max: 50,
    }),
    status,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_delegates")
    .upsert(payload, { onConflict: "profile_id" });

  if (error) {
    logSupabaseActionError("Failed to save personal delegate", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Personal delegate settings saved.");
}

export async function saveSourceConnectionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Connection label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const provider = normalizeSourceConnectionProvider(readOptional(formData, "provider"));
  const accessStatus = normalizeSourceAccessStatus(readOptional(formData, "access_status"));
  const accessScope = readOptional(formData, "access_scope");
  const consentNotes = readOptional(formData, "consent_notes");
  const permission = validateBackgroundSourcePermission({
    accessScope,
    accessStatus,
    aiShadowModeAllowed: readBoolean(formData, "ai_shadow_mode_allowed"),
    allowedFieldKeys: readRepeatedStrings(formData, "allowed_field_keys"),
    consentNotes,
    provider,
    rawIngestionAllowed: readBoolean(formData, "raw_ingestion_allowed"),
    retentionDays: readOptional(formData, "retention_days"),
  });

  if (permission.errors.length) {
    redirectWithMessage(returnTo, "error", permission.errors.join(" "));
  }

  let encryptedSourceConnectionFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedSourceConnectionFields = prepareRecordSensitiveTextFields({
      access_scope: accessScope,
      consent_notes: consentNotes,
      last_sync_summary: readOptional(formData, "last_sync_summary"),
    });
  } catch (error) {
    logSupabaseActionError(
      "Failed to encrypt source connection fields",
      toActionError(error, "Unknown source-connection encryption error"),
      {
        userId: viewer.authUser.id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Source connection notes cannot be saved until background field encryption is configured.",
    );
  }

  const payload: SourceConnectionInsert = {
    profile_id: viewer.authUser.id,
    provider,
    label,
    url: readOptional(formData, "url"),
    access_status: accessStatus,
    access_scope: encryptedSourceConnectionFields.plaintextFields.access_scope,
    consent_notes: encryptedSourceConnectionFields.plaintextFields.consent_notes,
    import_mode: normalizeSourceImportMode(readOptional(formData, "import_mode")),
    sync_frequency: normalizeSourceSyncFrequency(readOptional(formData, "sync_frequency")),
    last_sync_summary: encryptedSourceConnectionFields.plaintextFields.last_sync_summary,
    last_import_item_count: readBoundedInt(formData, "last_import_item_count", {
      fallback: 0,
      min: 0,
      max: 10000,
    }),
    last_imported_at: parseOptionalTimestamp(readOptional(formData, "last_imported_at")),
    allowed_field_keys: permission.allowedFieldKeys,
    retention_expires_at: permission.retentionExpiresAt,
    ai_shadow_mode_allowed: permission.aiShadowModeAllowed,
    raw_ingestion_allowed: permission.rawIngestionAllowed,
    sensitive_ciphertexts: encryptedSourceConnectionFields.ciphertexts,
    sensitive_encryption_version: encryptedSourceConnectionFields.version,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("source_connections").insert(payload);

  if (error) {
    logSupabaseActionError("Failed to save source connection", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(
    returnTo,
    "message",
    "Source connection permission recorded. Raw ingestion remains disabled.",
  );
}

export async function refreshProfileSynthesisAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const [{ data: profile }, { data: entries }, { data: sources }, { data: connections }, { data: signals }] =
    await Promise.all([
      supabase.from("wish_profiles").select("*").eq("profile_id", viewer.authUser.id).maybeSingle(),
      supabase
        .from("wish_entries")
        .select("*")
        .eq("profile_id", viewer.authUser.id)
        .eq("safety_status", "clear"),
      supabase.from("profile_sources").select("*").eq("profile_id", viewer.authUser.id),
      supabase.from("source_connections").select("*").eq("profile_id", viewer.authUser.id),
      supabase
        .from("background_profile_signals")
        .select("*")
        .eq("profile_id", viewer.authUser.id)
        .eq("status", "active"),
    ]);

  if (!profile) {
    redirectWithMessage(returnTo, "error", "Save a private wish profile before refreshing synthesis.");
  }

  const rows = ((entries ?? []) as WishEntryRow[]).map((row) => overlayEncryptedWishEntryBody(row));
  const profileSourceRows = ((sources ?? []) as ProfileSourceRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, PROFILE_SOURCE_SENSITIVE_TEXT_FIELDS),
  );
  const sourceConnectionRows = ((connections ?? []) as SourceConnectionRow[]).map((row) =>
    overlayBackgroundRecordSensitiveText(row, SOURCE_CONNECTION_SENSITIVE_TEXT_FIELDS),
  );
  const profileSignalRows = (signals ?? []) as BackgroundProfileSignalRow[];
  const decryptedProfile = overlayBackgroundRecordSensitiveText(
    profile as WishProfileRow,
    WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  );
  const synthesisPayload = buildDeterministicSynthesis({
    connections: sourceConnectionRows,
    entries: rows,
    profile: decryptedProfile,
    profileSignals: profileSignalRows,
    profileSources: profileSourceRows,
  });
  let encryptedSynthesisFields: ReturnType<typeof prepareRecordSensitiveTextFields>;

  try {
    encryptedSynthesisFields = prepareRecordSensitiveTextFields({
      capabilities: synthesisPayload.capabilities,
      constraints: synthesisPayload.constraints,
      hopes: synthesisPayload.hopes,
      intent: synthesisPayload.intent,
      uncertainty: synthesisPayload.uncertainty,
    });
  } catch (error) {
    logSupabaseActionError(
      "Failed to encrypt refreshed profile synthesis fields",
      toActionError(error, "Unknown refreshed profile-synthesis encryption error"),
      {
        userId: viewer.authUser.id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Profile synthesis cannot be saved until background field encryption is configured.",
    );
  }

  const { error } = await supabase
    .from("profile_syntheses")
    .upsert(
      {
        profile_id: viewer.authUser.id,
        ...synthesisPayload,
        capabilities: encryptedSynthesisFields.plaintextFields.capabilities,
        constraints: encryptedSynthesisFields.plaintextFields.constraints,
        hopes: encryptedSynthesisFields.plaintextFields.hopes,
        intent: encryptedSynthesisFields.plaintextFields.intent,
        uncertainty: encryptedSynthesisFields.plaintextFields.uncertainty,
        sensitive_ciphertexts: encryptedSynthesisFields.ciphertexts,
        sensitive_encryption_version: encryptedSynthesisFields.version,
      },
      { onConflict: "profile_id" },
    );

  if (error) {
    logSupabaseActionError("Failed to refresh profile synthesis", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await replaceBackgroundIntentClaims({
    profile: decryptedProfile,
    sourceConnections: sourceConnectionRows,
    supabase,
    synthesis: synthesisPayload,
    userId: viewer.authUser.id,
  });

  const { error: clarificationDeleteError } = await supabase
    .from("clarification_questions")
    .delete()
    .eq("profile_id", viewer.authUser.id)
    .eq("status", "open");

  if (clarificationDeleteError) {
    logSupabaseActionError("Failed to refresh open clarification questions", clarificationDeleteError, {
      userId: viewer.authUser.id,
    });
  }

  const clarificationQuestions = buildDeterministicClarificationQuestions({
    askText: rows.filter((entry) => entry.entry_type === "ask").map((entry) => entry.body).join(" "),
    backgroundSearchEnabled: decryptedProfile.background_search_enabled,
    capabilities: decryptedProfile.capabilities,
    causes: decryptedProfile.causes ?? [],
    collectiveName: decryptedProfile.collective_name,
    constraints: decryptedProfile.constraints,
    locationCity: decryptedProfile.location_city,
    locationRegion: decryptedProfile.location_region,
    manualSourceReviewEnabled: decryptedProfile.manual_source_review_enabled,
    offers: rows.filter((entry) => entry.entry_type === "offer").map((entry) => entry.body),
    openToPayment: decryptedProfile.openness_to_payment,
    openToPledges: decryptedProfile.openness_to_pledges,
    participantKind: decryptedProfile.participant_kind,
    profileId: viewer.authUser.id,
    publicPreview: decryptedProfile.public_preview,
    sourceCount: synthesisPayload.source_count,
    uncertaintyNotes: decryptedProfile.uncertainty_notes,
    verificationPreferences: decryptedProfile.verification_preferences,
    wishText: rows.filter((entry) => entry.entry_type === "wish").map((entry) => entry.body).join(" "),
  });

  if (clarificationQuestions.length) {
    const { error: clarificationError } = await supabase
      .from("clarification_questions")
      .insert(clarificationQuestions);

    if (clarificationError) {
      logSupabaseActionError("Failed to refresh clarification questions from synthesis", clarificationError, {
        userId: viewer.authUser.id,
      });
    }
  }

  if (synthesisPayload.confidence_score < 70 || synthesisPayload.missing_fields.length >= 3) {
    const { error: riskError } = await supabase.from("risk_signals").insert(
      buildPrivacySafeRiskSignalInsert({
        profile_id: viewer.authUser.id,
        signal_type: "underspecified_profile",
        severity: "low",
        summary:
          "The deterministic synthesis is low confidence; ask follow-up questions before relying on matches.",
        metadata: {
          confidenceScore: synthesisPayload.confidence_score,
          missingFieldCount: synthesisPayload.missing_fields.length,
          sourceCount: synthesisPayload.source_count,
          synthesisVersion: synthesisPayload.synthesis_version,
        },
      }),
    );

    if (riskError) {
      logSupabaseActionError("Failed to record low-confidence synthesis signal", riskError, {
        userId: viewer.authUser.id,
      });
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Profile synthesis refreshed without AI.");
}

export async function saveHelperStrategyAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Helper strategy label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const purposeCode =
    normalizeBackgroundPurposeCode(readOptional(formData, "purpose_code")) ?? "moral_trade_offer";
  const purposeBinding: BackgroundPurposeBinding = {
    purposeCode,
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  };
  const supabase = await createClient();
  const { data: delegate, error: delegateError } = await supabase
    .from("personal_delegates")
    .select("allowed_purpose_bindings")
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (delegateError) {
    logSupabaseActionError("Failed to load personal delegate purpose authorization", delegateError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", delegateError.message);
  }

  if (
    !evaluateBackgroundDelegatePurposeAuthorization({
      allowedPurposeBindings: delegate?.allowed_purpose_bindings,
      purposeBinding,
    })
  ) {
    redirectWithMessage(
      returnTo,
      "error",
      "This helper strategy purpose is not authorized by your personal delegate.",
    );
  }

  const payload: HelperStrategyInsert = {
    profile_id: viewer.authUser.id,
    helper_kind: normalizeHelperKind(readOptional(formData, "helper_kind")),
    label,
    priority: readBoundedInt(formData, "priority", {
      fallback: 3,
      min: 1,
      max: 5,
    }),
    min_score: readBoundedInt(formData, "min_score", {
      fallback: 55,
      min: 0,
      max: 100,
    }),
    purpose_code: purposeBinding.purposeCode,
    purpose_policy_version: purposeBinding.purposePolicyVersion,
    audience_scope: normalizeBackgroundCandidateAudienceScope(readOptional(formData, "audience_scope")),
    cohort_scope_id: readOptional(formData, "cohort_scope_id").slice(0, 80),
    strategy_config: buildHelperStrategyConfig(formData),
    status: readBoolean(formData, "is_paused") ? "paused" : "active",
  };

  const { error } = await supabase.from("helper_strategies").insert(payload);

  if (error) {
    logSupabaseActionError("Failed to save helper strategy", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Helper strategy saved.");
}

export async function savePrivacyGrantAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const requestedFields = readDisclosureFieldKeys(formData);

  if (!requestedFields.length) {
    redirectWithMessage(returnTo, "error", "Privacy field key is required.");
  }

  const viewer = await requireViewer(returnTo);
  const audienceStage = normalizeDisclosureStage(readOptional(formData, "audience_stage"));
  const accessLevel = normalizeDisclosureAccess(readOptional(formData, "access_level"));
  const grantStatus = normalizePrivacyGrantStatus(readOptional(formData, "status"));
  const purpose = readOptional(formData, "purpose") || readOptional(formData, "notes");
  const disclosureValidation = validateDisclosureRequest({
    accessLevel,
    fieldKeys: requestedFields,
    purpose,
    stage: audienceStage,
  });

  if (disclosureValidation.errors.length) {
    redirectWithMessage(returnTo, "error", disclosureErrorsToMessage(disclosureValidation.errors));
  }

  const fieldKey = disclosureValidation.allowedFields[0] ?? "";

  if (!fieldKey) {
    redirectWithMessage(returnTo, "error", "Choose a supported privacy field.");
  }

  if (grantStatus === "granted") {
    await requireContactDisclosureMfaStepUp({
      accessLevel,
      fieldKeys: disclosureValidation.allowedFields,
      returnTo,
    });
  }

  const payload: PrivacyGrantInsert = {
    profile_id: viewer.authUser.id,
    counterparty_id: readOptional(formData, "counterparty_id") || null,
    match_id: readOptional(formData, "match_id") || null,
    field_key: fieldKey,
    access_level: accessLevel,
    audience_stage: audienceStage,
    status: grantStatus,
    notes: buildDisclosureGrantNotes({
      ownerNote: readOptional(formData, "notes"),
      purpose,
    }),
    expires_at: readOptionalExpiryTimestamp(formData, {
      fallbackDays: getDefaultGrantExpiryDays(audienceStage),
    }),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("privacy_grants")
    .upsert(payload, { onConflict: "profile_id,counterparty_id,match_id,field_key" });

  if (error) {
    logSupabaseActionError("Failed to save privacy grant", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await recordServerFunnelEvent({
    eventType: "privacy_grant_changed",
    metadata: {
      accessLevel: payload.access_level,
      audienceStage: payload.audience_stage,
      fieldCount: 1,
      hasCounterparty: Boolean(payload.counterparty_id),
      hasExpiry: Boolean(payload.expires_at),
      status: payload.status,
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy grant saved.");
}

export async function revokePrivacyGrantAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const grantId = readRequired(formData, "grant_id");

  if (!grantId) {
    redirectWithMessage(returnTo, "error", "Privacy grant ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from("privacy_grants")
    .update({
      expires_at: now,
      notes: buildDisclosureGrantNotes({
        ownerNote: "Revoked from Consent Center.",
        purpose: "Stop future disclosure under this grant.",
      }),
      status: "revoked",
      updated_at: now,
    }, { count: "exact" })
    .eq("id", grantId)
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to revoke privacy grant", error, {
      grantId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  if (!count) {
    redirectWithMessage(returnTo, "error", "Privacy grant was not found.");
  }

  await recordServerFunnelEvent({
    eventType: "privacy_grant_changed",
    metadata: {
      status: "revoked",
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy grant revoked.");
}

export async function respondPrivacyAccessRequestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const requestId = readRequired(formData, "request_id");

  if (!requestId) {
    redirectWithMessage(returnTo, "error", "Privacy access request ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: requestRow, error: requestError } = await supabase
    .from("privacy_access_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    logSupabaseActionError("Failed to load privacy access request", requestError, {
      requestId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(
      returnTo,
      "error",
      requestError?.message ?? "Privacy access request not found.",
    );
  }

  const action = readOptional(formData, "status");
  const ownerNote = readOptional(formData, "owner_note");
  const accessLevel = normalizeDisclosureAccess(readOptional(formData, "access_level"));
  const requestedStage = normalizeDisclosureStage(requestRow.requested_stage);
  const expiresAt = readOptionalExpiryTimestamp(formData, {
    fallbackDays: getDefaultGrantExpiryDays(requestedStage),
  });
  const isOwner = requestRow.owner_profile_id === viewer.authUser.id;
  const isRequester = requestRow.requester_profile_id === viewer.authUser.id;

  if (!isOwner && !isRequester) {
    redirectWithMessage(returnTo, "error", "You cannot modify this privacy access request.");
  }

  const nextStatus =
    isRequester && action === "withdrawn"
      ? "withdrawn"
      : isOwner && action === "approved"
        ? "approved"
        : isOwner && action === "denied"
          ? "denied"
          : null;

  if (!nextStatus) {
    redirectWithMessage(returnTo, "error", "Unsupported privacy access request update.");
  }

  const disclosureValidation = validateDisclosureRequest({
    accessLevel,
    fieldKeys: requestRow.requested_fields ?? [],
    purpose: requestRow.purpose,
    stage: requestedStage,
  });

  if (nextStatus === "approved" && disclosureValidation.errors.length) {
    redirectWithMessage(returnTo, "error", disclosureErrorsToMessage(disclosureValidation.errors));
  }

  if (nextStatus === "approved" && isOwner) {
    await requireContactDisclosureMfaStepUp({
      accessLevel,
      fieldKeys: disclosureValidation.allowedFields,
      returnTo,
    });
  }

  const resolvedAt =
    nextStatus === "approved" || nextStatus === "denied" || nextStatus === "withdrawn"
      ? new Date().toISOString()
      : null;

  const { error: updateError } = await supabase
    .from("privacy_access_requests")
    .update({
      owner_note: isOwner ? ownerNote : requestRow.owner_note,
      status: nextStatus,
      resolved_at: resolvedAt,
    })
    .eq("id", requestId);

  if (updateError) {
    logSupabaseActionError("Failed to update privacy access request", updateError, {
      requestId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  if (nextStatus === "approved" && isOwner) {
    for (const fieldKey of disclosureValidation.allowedFields) {
      let grantQuery = supabase
        .from("privacy_grants")
        .select("id")
        .eq("profile_id", requestRow.owner_profile_id)
        .eq("counterparty_id", requestRow.requester_profile_id)
        .eq("field_key", fieldKey)
        .eq("audience_stage", requestedStage);

      grantQuery = requestRow.match_id
        ? grantQuery.eq("match_id", requestRow.match_id)
        : grantQuery.is("match_id", null);

      const { data: existingGrant, error: existingGrantError } = await grantQuery.maybeSingle();

      if (existingGrantError) {
        logSupabaseActionError("Failed to check existing privacy grant", existingGrantError, {
          requestId,
          fieldKey,
          userId: viewer.authUser.id,
        });
        continue;
      }

      const grantInsertPayload: PrivacyGrantInsert = {
        profile_id: requestRow.owner_profile_id,
        counterparty_id: requestRow.requester_profile_id,
        match_id: requestRow.match_id,
        field_key: fieldKey,
        access_level: accessLevel,
        audience_stage: requestedStage,
        status: "granted" as const,
        notes: buildDisclosureGrantNotes({
          justification: requestRow.justification,
          ownerNote,
          purpose: requestRow.purpose,
        }),
        expires_at: expiresAt,
      };

      const grantUpdatePayload: PrivacyGrantUpdate = {
        counterparty_id: grantInsertPayload.counterparty_id,
        match_id: grantInsertPayload.match_id,
        field_key: grantInsertPayload.field_key,
        access_level: grantInsertPayload.access_level,
        audience_stage: grantInsertPayload.audience_stage,
        status: grantInsertPayload.status,
        notes: grantInsertPayload.notes,
        expires_at: grantInsertPayload.expires_at,
      };

      const { error: grantError } = existingGrant
        ? await supabase.from("privacy_grants").update(grantUpdatePayload).eq("id", existingGrant.id)
        : await supabase.from("privacy_grants").insert(grantInsertPayload);

      if (grantError) {
        logSupabaseActionError("Failed to upsert approved privacy grant", grantError, {
          requestId,
          fieldKey,
          userId: viewer.authUser.id,
        });
      }
    }
  }

  const serviceClient = createServiceClient();
  const notificationTarget =
    nextStatus === "withdrawn" ? requestRow.owner_profile_id : requestRow.requester_profile_id;
  const actorLabel = isOwner ? "The owner" : viewer.displayName;
  const statusLabel =
    nextStatus === "approved"
      ? "approved"
      : nextStatus === "denied"
        ? "declined"
        : "withdrew";
  const notificationResult = await insertWishNotificationsWithSafeEmail({
    notifications: {
      profile_id: notificationTarget,
      kind: "consent",
      title: "Privacy access request updated",
      body: `${actorLabel} ${statusLabel} a purpose-bound disclosure request.`,
      match_id: requestRow.match_id,
    },
    supabase: serviceClient,
  });

  if (notificationResult.notificationError) {
    logSupabaseActionError("Failed to notify about privacy access request update", notificationResult.notificationError, {
      requestId,
      userId: viewer.authUser.id,
    });
  }

  if (notificationResult.emailError) {
    logSupabaseActionError("Failed to queue privacy access request update email", notificationResult.emailError, {
      requestId,
      userId: viewer.authUser.id,
    });
  }

  if (requestRow.match_id) {
    const { error: auditError } = await serviceClient.from("match_audit_events").insert({
      match_id: requestRow.match_id,
      actor_profile_id: viewer.authUser.id,
      event_type: "privacy_access_updated",
      summary: `Privacy access request ${nextStatus} for ${requestRow.requested_fields.length} field(s).`,
      metadata: {
        requestId,
        accessLevel: nextStatus === "approved" ? accessLevel : null,
        expiresAt: nextStatus === "approved" ? expiresAt : null,
        requestedFieldCount: requestRow.requested_fields.length,
      },
    });

    if (auditError) {
      logSupabaseActionError("Failed to record privacy access request update audit", auditError, {
        requestId,
        matchId: requestRow.match_id,
      });
    }
  }

  await recordServerFunnelEvent({
    eventType: "detail_request_resolved",
    metadata: {
      decision: nextStatus,
      fieldCount: requestRow.requested_fields.length,
      hasExpiry: nextStatus === "approved" && Boolean(expiresAt),
      hasMatch: Boolean(requestRow.match_id),
      requestedStage,
    },
    path: returnTo,
    profileId: viewer.authUser.id,
    supabase,
  });

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Privacy access request updated.");
}

export async function createBrokerageBountyAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");

  if (!label) {
    redirectWithMessage(returnTo, "error", "Bounty label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("brokerage_bounties").insert({
    profile_id: viewer.authUser.id,
    label,
    target_kind: normalizeBrokerageTargetKind(readOptional(formData, "target_kind")),
    cause_area: readOptional(formData, "cause_area"),
    max_amount_cents: readMoneyCents(formData, "max_amount"),
    currency: normalizeCurrency(readOptional(formData, "currency") || "usd"),
    reward_type: normalizeBrokerageRewardType(readOptional(formData, "reward_type")),
    preferred_regions: readStringList(formData, "preferred_regions_json"),
    success_condition: readOptional(formData, "success_condition"),
    target_note: readOptional(formData, "target_note"),
    status: "active",
  });

  if (error) {
    logSupabaseActionError("Failed to create brokerage bounty", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Speculative matchmaking bounty saved.");
}

export async function createCollectiveAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const name = readRequired(formData, "name");

  if (!name) {
    redirectWithMessage(returnTo, "error", "Collective name is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: collective, error } = await supabase
    .from("collectives")
    .insert({
      owner_id: viewer.authUser.id,
      name,
      description: readOptional(formData, "description"),
      homepage_url: readOptional(formData, "homepage_url"),
      contact_policy: readOptional(formData, "contact_policy"),
      decision_rule: readOptional(formData, "decision_rule"),
      verification_notes: readOptional(formData, "verification_notes"),
      verification_status: normalizeCollectiveVerificationStatus(
        readOptional(formData, "verification_status"),
      ),
    })
    .select("id")
    .maybeSingle();

  if (error || !collective) {
    logSupabaseActionError("Failed to create collective", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to create collective.");
  }

  const { error: memberError } = await supabase.from("collective_members").insert({
    collective_id: collective.id,
    profile_id: viewer.authUser.id,
    role: "owner",
    status: "active",
    delegation_scope: "Full authority for initial setup.",
    can_approve_matches: true,
    can_grant_privacy: true,
    can_manage_bounties: true,
  });

  if (memberError) {
    logSupabaseActionError("Failed to create collective owner membership", memberError, {
      userId: viewer.authUser.id,
      collectiveId: collective.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective workspace created.");
}

export async function addCollectiveMemberAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const collectiveId = readRequired(formData, "collective_id");
  const memberProfileId = readRequired(formData, "member_profile_id");

  if (!collectiveId || !memberProfileId) {
    redirectWithMessage(returnTo, "error", "Collective ID and member profile ID are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: viewerMembership, error: membershipError } = await supabase
    .from("collective_members")
    .select("role, can_approve_matches, can_grant_privacy, can_manage_bounties, status")
    .eq("collective_id", collectiveId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (membershipError) {
    logSupabaseActionError("Failed to check collective membership before adding member", membershipError, {
      collectiveId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", membershipError.message);
  }

  const canManageMembers =
    viewerMembership?.status === "active" &&
    (viewerMembership.role === "owner" || viewerMembership.role === "admin");

  if (!canManageMembers) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only active collective owners or admins can add delegated members.",
    );
  }

  const payload: CollectiveMemberInsert = {
    collective_id: collectiveId,
    profile_id: memberProfileId,
    role: normalizeCollectiveMemberRole(readOptional(formData, "role")),
    status: normalizeCollectiveMemberStatus(readOptional(formData, "status")),
    delegation_scope: readOptional(formData, "delegation_scope"),
    can_approve_matches: readBoolean(formData, "can_approve_matches"),
    can_grant_privacy: readBoolean(formData, "can_grant_privacy"),
    can_manage_bounties: readBoolean(formData, "can_manage_bounties"),
  };

  const { error } = await supabase
    .from("collective_members")
    .upsert(payload, { onConflict: "collective_id,profile_id" });

  if (error) {
    logSupabaseActionError("Failed to add collective member", error, {
      collectiveId,
      memberProfileId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective member permissions saved.");
}

export async function createCollectiveDecisionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const collectiveId = readRequired(formData, "collective_id");
  const title = readRequired(formData, "title");

  if (!collectiveId || !title) {
    redirectWithMessage(returnTo, "error", "Collective and title are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const requiredApprovals = readBoundedInt(formData, "required_approvals", {
    fallback: 1,
    min: 1,
    max: 25,
  });
  const payload: CollectiveDecisionInsert = {
    collective_id: collectiveId,
    created_by: viewer.authUser.id,
    title,
    decision_type: normalizeCollectiveDecisionType(readOptional(formData, "decision_type")),
    target_kind: normalizeCollectiveDecisionTargetKind(readOptional(formData, "target_kind")),
    target_id: readOptional(formData, "target_id") || null,
    target_label: readOptional(formData, "target_label"),
    summary: readOptional(formData, "summary"),
    required_approvals: requiredApprovals,
    status: "open",
  };

  const { data: decision, error } = await supabase
    .from("collective_decisions")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error || !decision) {
    logSupabaseActionError("Failed to create collective decision", error, {
      collectiveId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Unable to create collective decision.");
  }

  const initialResponse: CollectiveDecisionResponseInsert = {
    decision_id: decision.id,
    profile_id: viewer.authUser.id,
    response: normalizeCollectiveDecisionResponse(readOptional(formData, "initial_response")),
    note: readOptional(formData, "initial_note"),
    responded_at: new Date().toISOString(),
  };

  const { error: responseError } = await supabase
    .from("collective_decision_responses")
    .upsert(initialResponse, { onConflict: "decision_id,profile_id" });

  if (responseError) {
    logSupabaseActionError("Failed to record initial collective decision response", responseError, {
      collectiveId,
      decisionId: decision.id,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective decision opened.");
}

export async function respondCollectiveDecisionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const decisionId = readRequired(formData, "decision_id");

  if (!decisionId) {
    redirectWithMessage(returnTo, "error", "Decision ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const responseValue = normalizeCollectiveDecisionResponse(readOptional(formData, "response"));
  const note = readOptional(formData, "note");

  const { error: responseError } = await supabase
    .from("collective_decision_responses")
    .upsert(
      {
        decision_id: decisionId,
        profile_id: viewer.authUser.id,
        response: responseValue,
        note,
        responded_at: new Date().toISOString(),
      },
      { onConflict: "decision_id,profile_id" },
    );

  if (responseError) {
    logSupabaseActionError("Failed to save collective decision response", responseError, {
      decisionId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", responseError.message);
  }

  const { data: decision, error: decisionError } = await supabase
    .from("collective_decisions")
    .select("required_approvals")
    .eq("id", decisionId)
    .maybeSingle();

  if (!decisionError && decision) {
    const { data: responses, error: responsesError } = await supabase
      .from("collective_decision_responses")
      .select("response")
      .eq("decision_id", decisionId);

    if (!responsesError) {
      const approvals = (responses ?? []).filter((entry) => entry.response === "approve").length;
      const rejections = (responses ?? []).filter((entry) => entry.response === "reject").length;
      const nextStatus =
        approvals >= decision.required_approvals
          ? "approved"
          : rejections >= decision.required_approvals
            ? "rejected"
            : "open";

      const { error: statusError } = await supabase
        .from("collective_decisions")
        .update({ status: nextStatus })
        .eq("id", decisionId);

      if (statusError) {
        logSupabaseActionError("Failed to update collective decision status", statusError, {
          decisionId,
          userId: viewer.authUser.id,
        });
      }
    }
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Collective decision response saved.");
}

export async function createStripeConnectAccountAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  if (!hasStripeEnv()) {
    redirectWithMessage("/dashboard", "error", "Stripe is not configured yet. Add STRIPE_SECRET_KEY.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  const { data: existingAccount, error: accountReadError } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (accountReadError) {
    logSupabaseActionError("Failed to read Stripe payment account", accountReadError, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", accountReadError.message);
  }

  const stripeAccountId =
    existingAccount?.stripe_account_id ??
    (
      await stripe.accounts.create({
        type: "express",
        email: viewer.authUser.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          profile_id: viewer.authUser.id,
        },
      })
    ).id;

  const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
  const { error: upsertError } = await supabase.from("profile_payment_accounts").upsert(
    {
      profile_id: viewer.authUser.id,
      stripe_account_id: stripeAccount.id,
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      onboarding_completed_at:
        stripeAccount.charges_enabled && stripeAccount.payouts_enabled
          ? new Date().toISOString()
          : existingAccount?.onboarding_completed_at ?? null,
    },
    {
      onConflict: "profile_id",
    },
  );

  if (upsertError) {
    logSupabaseActionError("Failed to save Stripe payment account", upsertError, {
      userId: viewer.authUser.id,
      stripeAccountId: stripeAccount.id,
    });
    redirectWithMessage(returnTo, "error", upsertError.message);
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccount.id,
    refresh_url: `${siteUrl}/dashboard?message=${encodeURIComponent("Stripe onboarding can be resumed.")}`,
    return_url: `${siteUrl}/dashboard?message=${encodeURIComponent("Stripe payment account connected.")}`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

export async function refreshStripeConnectAccountAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  if (!hasStripeEnv()) {
    redirectWithMessage("/dashboard", "error", "Stripe is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: paymentAccount, error: accountError } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (accountError || !paymentAccount) {
    redirectWithMessage(
      returnTo,
      "error",
      accountError?.message ?? "Connect Stripe before refreshing payment status.",
    );
  }

  const stripeAccount = await getStripe().accounts.retrieve(paymentAccount.stripe_account_id);
  const { error } = await supabase
    .from("profile_payment_accounts")
    .update({
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
      details_submitted: stripeAccount.details_submitted,
      onboarding_completed_at:
        stripeAccount.charges_enabled && stripeAccount.payouts_enabled
          ? new Date().toISOString()
          : paymentAccount.onboarding_completed_at,
    })
    .eq("profile_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to refresh Stripe payment account", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Stripe payment account status refreshed.");
}

export async function createAgreementPaymentCheckoutAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const amountCents = readMoneyCents(formData, "amount");
  const currency = normalizeCurrency(readOptional(formData, "currency") || "usd");
  const cadenceUnit = normalizePaymentCadenceUnit(readOptional(formData, "cadence_unit"));
  const cadenceValue = readBoundedInt(formData, "cadence_value", {
    fallback: 1,
    min: 1,
    max: 3650,
  });
  const notes = readOptional(formData, "notes");

  if (!agreementId || amountCents <= 0) {
    redirectWithMessage(returnTo, "error", "Payment amount and agreement are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  const viewerIsParticipant =
    agreement.proposer_id === viewer.authUser.id || agreement.responder_id === viewer.authUser.id;

  if (!viewerIsParticipant) {
    redirectWithMessage(returnTo, "error", "You can only pay inside your own agreements.");
  }

  const { data: linkedOffer, error: linkedOfferError } = agreement.offer_id
    ? await supabase.from("offers").select("*").eq("id", agreement.offer_id).maybeSingle()
    : { data: null, error: null };

  if (linkedOfferError) {
    logSupabaseActionError("Failed to load linked offer for payment authorization", linkedOfferError, {
      agreementId,
      offerId: agreement.offer_id,
    });
    redirectWithMessage(returnTo, "error", linkedOfferError.message);
  }

  const offer = linkedOffer as OfferRow | null;
  const paymentAuthorizationPreview = buildAgreementPaymentAuthorizationPreview({
    agreementCompletionState: agreement.completion_state,
    agreementSource: agreement.source,
    hasAtomicSettlementGroup: false,
    hasFreshFinalConfirmations: false,
    hasMatchedTradeLockProposal: false,
    hasNonConflictingCommitmentReservation: false,
    offerMode: offer?.mode,
    participantEligibilityCleared: false,
    paymentRailReviewCleared: false,
    providerConfigured: hasStripeEnv(),
    providerSupportsConditionalAuthorization: false,
    reviewStage: agreement.status,
    termsText: [
      agreement.notes,
      agreement.structured_terms,
      agreement.no_trade_baseline,
      agreement.counterfactual_declaration,
      agreement.duration_terms,
      agreement.exit_conditions,
      agreement.evidence_rule,
      offer?.offer_action,
      offer?.request_action,
      offer?.notes,
      notes,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (!paymentAuthorizationPreview.checkoutCreationAllowed) {
    if (!paymentAuthorizationPreview.requiresConditionalAuthorization) {
      redirectWithMessage(returnTo, "error", "Stripe is not configured yet. Add STRIPE_SECRET_KEY.");
    }

    const payeeId =
      agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;
    const platformFeeCents = calculatePlatformFeeCents(amountCents);
    const stubPayload: AgreementPaymentInsert = {
      agreement_id: agreementId,
      payer_id: viewer.authUser.id,
      payee_id: payeeId,
      amount_cents: amountCents,
      currency,
      cadence_interval_unit: cadenceUnit,
      cadence_interval_value: cadenceValue,
      platform_fee_cents: platformFeeCents,
      authorization_mode: paymentAuthorizationPreview.authorizationMode,
      authorization_status: paymentAuthorizationPreview.authorizationStatus,
      capture_policy: paymentAuthorizationPreview.capturePolicy,
      authorization_gate_snapshot: paymentAuthorizationPreview.gateSnapshot,
      notes: [
        notes,
        paymentAuthorizationPreview.statusLabel,
        "No Stripe Checkout was created. Payment authorization remains a manual-review stub until a frozen lock proposal, fresh final confirmations, reservation, atomic settlement, eligibility/payment-rail review, and conditional provider path are all non-blocking.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      status: "draft",
    };
    const { data: stubPayment, error: stubError } = await supabase
      .from("agreement_payments")
      .insert(stubPayload)
      .select("*")
      .single();

    if (stubError || !stubPayment) {
      logSupabaseActionError("Failed to create agreement payment authorization stub", stubError, {
        agreementId,
        payerId: viewer.authUser.id,
        payeeId,
      });
      redirectWithMessage(
        returnTo,
        "error",
        stubError?.message ?? "Unable to create payment authorization stub.",
      );
    }

    await supabase.from("agreement_events").insert({
      agreement_id: agreementId,
      actor_id: viewer.authUser.id,
      event_type: "payment_update",
      summary: `Payment authorization stub recorded for ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}.`,
      details: paymentAuthorizationPreview.gateSnapshot,
    });

    revalidatePath(`/agreements/${agreementId}`);
    redirectWithMessage(
      returnTo,
      "message",
      "Payment authorization stub recorded. No Stripe checkout or capture was created.",
    );
  }

  const payeeId =
    agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;
  const { data: payeePaymentAccount, error: accountError } = await supabase
    .from("profile_payment_accounts")
    .select("*")
    .eq("profile_id", payeeId)
    .maybeSingle();

  if (accountError || !payeePaymentAccount) {
    redirectWithMessage(
      returnTo,
      "error",
      accountError?.message ??
        "The counterparty has not connected a Stripe account yet, so payment cannot be routed to them.",
    );
  }

  if (!payeePaymentAccount.charges_enabled || !payeePaymentAccount.payouts_enabled) {
    redirectWithMessage(
      returnTo,
      "error",
      "The counterparty must finish Stripe onboarding before receiving payments.",
    );
  }

  const platformFeeCents = calculatePlatformFeeCents(amountCents);
  const { data: payment, error: paymentError } = await supabase
    .from("agreement_payments")
    .insert({
      agreement_id: agreementId,
      payer_id: viewer.authUser.id,
      payee_id: payeeId,
      amount_cents: amountCents,
      currency,
      cadence_interval_unit: cadenceUnit,
      cadence_interval_value: cadenceValue,
      platform_fee_cents: platformFeeCents,
      authorization_mode: paymentAuthorizationPreview.authorizationMode,
      authorization_status: paymentAuthorizationPreview.authorizationStatus,
      capture_policy: paymentAuthorizationPreview.capturePolicy,
      authorization_gate_snapshot: paymentAuthorizationPreview.gateSnapshot,
      notes,
      status: "draft",
    })
    .select("*")
    .single();

  if (paymentError || !payment) {
    logSupabaseActionError("Failed to create agreement payment record", paymentError, {
      agreementId,
      payerId: viewer.authUser.id,
      payeeId,
    });
    redirectWithMessage(returnTo, "error", paymentError?.message ?? "Unable to create payment record.");
  }

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: "Moral Trade agreement payment",
            description:
              cadenceUnit === "one_time"
                ? "One-time payment connected to a Moral Trade agreement."
                : `Installment for a negotiated ${cadenceValue} ${cadenceUnit.replace("_", " ")} cadence.`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFeeCents || undefined,
      transfer_data: {
        destination: payeePaymentAccount.stripe_account_id,
      },
      metadata: {
        agreement_id: agreementId,
        agreement_payment_id: payment.id,
        payer_id: viewer.authUser.id,
        payee_id: payeeId,
      },
    },
    metadata: {
      agreement_id: agreementId,
      agreement_payment_id: payment.id,
      payer_id: viewer.authUser.id,
      payee_id: payeeId,
    },
    success_url: `${siteUrl}${returnTo}?message=${encodeURIComponent("Payment completed. Stripe will confirm it by webhook.")}`,
    cancel_url: `${siteUrl}${returnTo}?message=${encodeURIComponent("Payment checkout cancelled.")}`,
  });

  const { error: updateError } = await supabase
    .from("agreement_payments")
    .update({
      status: "checkout_created",
      stripe_checkout_session_id: session.id,
    })
    .eq("id", payment.id);

  if (updateError) {
    logSupabaseActionError("Failed to attach Stripe checkout session to payment record", updateError, {
      agreementId,
      paymentId: payment.id,
      sessionId: session.id,
    });
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "payment_update",
    summary: `Payment checkout created for ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}.`,
    details: notes,
  });

  if (!session.url) {
    redirectWithMessage(returnTo, "error", "Stripe did not return a checkout URL.");
  }

  redirect(session.url);
}

export async function createAgreementPaymentScheduleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const amountCents = readMoneyCents(formData, "amount");
  const currency = normalizeCurrency(readOptional(formData, "currency") || "usd");
  const cadenceUnit = normalizePaymentScheduleUnit(readOptional(formData, "cadence_unit"));
  const cadenceValue = readBoundedInt(formData, "cadence_value", {
    fallback: 1,
    min: 1,
    max: 3650,
  });
  const firstDueAt = readOptional(formData, "next_due_at");
  const notes = readOptional(formData, "notes");

  if (!agreementId || amountCents <= 0) {
    redirectWithMessage(returnTo, "error", "Schedule amount and agreement are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== viewer.authUser.id && agreement.responder_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only schedule payments inside your own agreements.");
  }

  const payeeId =
    agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;
  const requestedDueDate = firstDueAt ? new Date(`${firstDueAt}T09:00:00.000Z`) : null;
  const nextDueAt =
    requestedDueDate && !Number.isNaN(requestedDueDate.getTime())
      ? requestedDueDate.toISOString()
      : computeNextDueAt({ cadenceValue, cadenceUnit });

  const { error: scheduleError } = await supabase.from("agreement_payment_schedules").insert({
    agreement_id: agreementId,
    payer_id: viewer.authUser.id,
    payee_id: payeeId,
    amount_cents: amountCents,
    currency,
    cadence_interval_unit: cadenceUnit,
    cadence_interval_value: cadenceValue,
    next_due_at: nextDueAt,
    status: "active",
  });

  if (scheduleError) {
    logSupabaseActionError("Failed to create payment schedule", scheduleError, {
      agreementId,
      payerId: viewer.authUser.id,
      payeeId,
    });
    redirectWithMessage(returnTo, "error", scheduleError.message);
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "payment_update",
    summary: `Payment reminder schedule created for ${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}.`,
    details: notes || `Cadence: every ${cadenceValue} ${cadenceUnit.replace("_", " ")}.`,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Payment reminder schedule created.");
}

export async function requestPaymentReviewAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const paymentId = readRequired(formData, "payment_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const requestType = readRequired(formData, "request_type");
  const details = readOptional(formData, "details");

  if (!paymentId) {
    redirectWithMessage(returnTo, "error", "Payment ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: payment, error: paymentError } = await supabase
    .from("agreement_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    redirectWithMessage(returnTo, "error", paymentError?.message ?? "Payment record not found.");
  }

  if (payment.payer_id !== viewer.authUser.id && payment.payee_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only review payments from your own agreements.");
  }

  const eventType = requestType === "dispute" ? "dispute_opened" : "payment_update";
  const status: AgreementPaymentStatus =
    requestType === "dispute" ? "disputed" : "refund_requested";
  const summary =
    requestType === "dispute"
      ? "A participant opened a payment dispute."
      : "A participant requested refund review.";

  const { error: updateError } = await supabase
    .from("agreement_payments")
    .update({ status })
    .eq("id", paymentId);

  if (updateError) {
    logSupabaseActionError("Failed to update payment review status", updateError, {
      paymentId,
      userId: viewer.authUser.id,
      status,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const { error: eventError } = await supabase.from("agreement_events").insert({
    agreement_id: payment.agreement_id,
    actor_id: viewer.authUser.id,
    event_type: eventType,
    summary,
    details,
  });

  if (eventError) {
    logSupabaseActionError("Failed to record payment review event", eventError, {
      paymentId,
      agreementId: payment.agreement_id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${payment.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Payment review request recorded.");
}

export async function saveAgreementTermsAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!agreementId) {
    redirectWithMessage(returnTo, "error", "Agreement ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  await loadParticipantAgreementOrRedirect(supabase, agreementId, viewer.authUser.id, returnTo);

  const updatePayload: AgreementUpdate = {
    structured_terms: truncateText(readRequired(formData, "structured_terms"), 1600),
    no_trade_baseline: truncateText(readRequired(formData, "no_trade_baseline"), 1200),
    counterfactual_declaration: truncateText(
      readRequired(formData, "counterfactual_declaration"),
      1200,
    ),
    duration_terms: truncateText(readRequired(formData, "duration_terms"), 800),
    exit_conditions: truncateText(readRequired(formData, "exit_conditions"), 1000),
    evidence_rule: truncateText(readRequired(formData, "evidence_rule"), 1200),
    privacy_scope: truncateText(readRequired(formData, "privacy_scope"), 1000),
    disclosure_scope: truncateText(readRequired(formData, "disclosure_scope"), 1000),
    completion_state: "pending_evidence",
  };

  if (
    !updatePayload.structured_terms ||
    !updatePayload.no_trade_baseline ||
    !updatePayload.counterfactual_declaration ||
    !updatePayload.duration_terms ||
    !updatePayload.exit_conditions ||
    !updatePayload.evidence_rule ||
    !updatePayload.privacy_scope
  ) {
    redirectWithMessage(
      returnTo,
      "error",
      "Structured terms, baseline, counterfactual, duration, exit, evidence, and privacy fields are required.",
    );
  }

  const { error } = await supabase
    .from("agreements")
    .update(updatePayload)
    .eq("id", agreementId);

  if (error) {
    logSupabaseActionError("Failed to save agreement room terms", error, {
      agreementId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "terms_updated",
    summary: "Structured agreement terms updated.",
    details:
      "Baseline, counterfactual declaration, duration, exit conditions, evidence, and privacy/disclosure scope were saved.",
  });

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Agreement room terms saved.");
}

export async function submitAgreementEvidenceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!agreementId) {
    redirectWithMessage(returnTo, "error", "Agreement ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const agreement = await loadParticipantAgreementOrRedirect(
    supabase,
    agreementId,
    viewer.authUser.id,
    returnTo,
  );

  const tradeType = normalizeEvidenceTradeType(readOptional(formData, "trade_type"));
  const evidenceType = normalizeEvidenceType(readOptional(formData, "evidence_type"));
  const title = truncateText(readRequired(formData, "title"), 160);
  const evidenceUrl = truncateText(readOptional(formData, "evidence_url"), 900);
  const evidenceSummary = truncateText(readRequired(formData, "evidence_summary"), 1400);
  const reviewScope = truncateText(readOptional(formData, "review_scope"), 900);

  if (!title || !evidenceSummary) {
    redirectWithMessage(returnTo, "error", "Evidence title and summary are required.");
  }

  const evidencePayload: AgreementEvidenceItemInsert = {
    agreement_id: agreementId,
    uploader_id: viewer.authUser.id,
    trade_type: tradeType,
    evidence_type: evidenceType,
    schema_key: `${tradeType}_v1`,
    title,
    evidence_url: evidenceUrl,
    evidence_summary: evidenceSummary,
    status: "pending_evidence",
  };

  const { data: evidenceItem, error: evidenceError } = await supabase
    .from("agreement_evidence_items")
    .insert(evidencePayload)
    .select("id")
    .single();

  if (evidenceError || !evidenceItem) {
    logSupabaseActionError("Failed to submit agreement evidence", evidenceError, {
      agreementId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", evidenceError?.message ?? "Unable to submit evidence.");
  }

  const evidencePersistenceShape = getAgreementEvidencePersistenceShape({
    evidenceType,
    tradeType,
  });
  const provenanceLocator = evidenceUrl || `moraltrade://agreement-evidence/${evidenceItem.id}`;
  const evidencePersistenceResult = await persistMoralTradeEvidenceSubmission({
    actorAgentId: viewer.authUser.id,
    actorAgentKind: agreement.responder_id === viewer.authUser.id ? "counterparty" : "participant",
    actorLabel: viewer.displayName,
    agreementId,
    claimScope: evidencePersistenceShape.claimScope,
    evidenceKind: evidencePersistenceShape.evidenceKind,
    evidenceUrl: provenanceLocator,
    idempotencyKey: `agreement:${agreementId}:evidence:${evidenceItem.id}`,
    ownerProfileId: viewer.authUser.id,
    reasonCodes: [...evidencePersistenceShape.reasonCodes],
    redactionLevel: "reviewer_only",
    subjectId: agreementId,
    subjectKind: "agreement",
    supabase,
    traceabilityLocationType: evidenceUrl ? "public_log" : "platform",
  });

  if (evidencePersistenceResult.error) {
    logSupabaseActionError(
      "Failed to persist agreement evidence provenance bundle",
      toActionError(
        evidencePersistenceResult.error,
        "Unable to persist agreement evidence provenance bundle.",
      ),
      { agreementId, evidenceItemId: evidenceItem.id, userId: viewer.authUser.id },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Evidence was saved as pending, but review was not opened because the provenance bundle could not be recorded.",
    );
  }

  const reviewPayload: AgreementReviewCaseInsert = {
    agreement_id: agreementId,
    evidence_item_id: evidenceItem.id,
    opened_by: viewer.authUser.id,
    reviewer_role: "operator",
    review_scope:
      reviewScope ||
      `Review ${tradeType.replaceAll("_", " ")} evidence using schema ${tradeType}_v1.`,
    status: "under_review",
    sla_due_at: addHours(72),
  };

  const { error: reviewError } = await supabase.from("agreement_review_cases").insert(reviewPayload);

  if (reviewError) {
    logSupabaseActionError("Failed to open agreement review case", reviewError, {
      agreementId,
      evidenceItemId: evidenceItem.id,
    });
    redirectWithMessage(returnTo, "error", reviewError.message);
  }

  const { error: evidenceStatusError } = await supabase
    .from("agreement_evidence_items")
    .update({ status: "under_review" })
    .eq("id", evidenceItem.id);

  if (evidenceStatusError) {
    logSupabaseActionError("Failed to move agreement evidence into review", evidenceStatusError, {
      agreementId,
      evidenceItemId: evidenceItem.id,
    });
    redirectWithMessage(returnTo, "error", evidenceStatusError.message);
  }

  await supabase
    .from("agreements")
    .update({ completion_state: "under_review" })
    .eq("id", agreementId);

  await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "evidence_submitted",
    summary: `Evidence submitted: ${title}`,
    details: evidenceSummary,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Evidence submitted for review.");
}

export async function submitPerformanceBondEvidenceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const bondId = readRequired(formData, "bond_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const evidenceText = truncateText(readRequired(formData, "evidence_text"), 2400);
  const evidenceUrls = readStringList(formData, "evidence_urls")
    .map((url) => truncateText(url, 900))
    .filter(Boolean);
  const visibility = normalizePerformanceBondVisibility(readOptional(formData, "visibility"));
  const redactionNotes = truncateText(readOptional(formData, "redaction_notes"), 1200);
  const attestation = readBoolean(formData, "attestation");

  if (!bondId) {
    redirectWithMessage(returnTo, "error", "Pledge performance bond ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const serviceSupabase = createServiceClient();

  try {
    const result = await submitBondEvidence({
      actorId: viewer.authUser.id,
      attestation,
      bondId,
      evidenceText,
      evidenceUrls,
      redactionNotes,
      supabase: serviceSupabase,
      visibility,
    });

    if (result.bond.swap_id) {
      await serviceSupabase.from("agreement_events").insert({
        agreement_id: result.bond.swap_id,
        actor_id: viewer.authUser.id,
        event_type: "evidence_submitted",
        summary: "Pledge performance bond evidence submitted.",
        details: evidenceText,
      });
      revalidatePath(`/agreements/${result.bond.swap_id}`);
    }
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to submit pledge performance bond evidence.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Pledge performance bond evidence submitted.");
}

export async function acceptPerformanceBondEvidenceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const bondId = readRequired(formData, "bond_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const reason = truncateText(readOptional(formData, "reason"), 1200);
  const viewer = await requireViewer(returnTo);
  const serviceSupabase = createServiceClient();

  try {
    const bond = await acceptBondEvidence({
      actorId: viewer.authUser.id,
      bondId,
      reason,
      supabase: serviceSupabase,
    });

    if (bond.swap_id) {
      await serviceSupabase.from("agreement_events").insert({
        agreement_id: bond.swap_id,
        actor_id: viewer.authUser.id,
        event_type: "review_status_changed",
        summary: "Counterparty accepted pledge performance bond evidence.",
        details: reason,
      });
      revalidatePath(`/agreements/${bond.swap_id}`);
    }
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to accept pledge performance bond evidence.",
    );
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Evidence accepted. Refund processing status updated.");
}

export async function challengePerformanceBondEvidenceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const bondId = readRequired(formData, "bond_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const reason = truncateText(readRequired(formData, "reason"), 1200);
  const specificObjection = truncateText(readRequired(formData, "specific_objection"), 1200);
  const requestedOutcome = truncateText(readOptional(formData, "requested_outcome") || "platform_review", 240);
  const viewer = await requireViewer(returnTo);
  const serviceSupabase = createServiceClient();

  try {
    const bond = await challengeBondEvidence({
      actorId: viewer.authUser.id,
      bondId,
      reason,
      requestedOutcome,
      specificObjection,
      supabase: serviceSupabase,
    });

    if (bond.swap_id) {
      await serviceSupabase.from("agreement_events").insert({
        agreement_id: bond.swap_id,
        actor_id: viewer.authUser.id,
        event_type: "challenge_opened",
        summary: "Pledge performance bond evidence challenged.",
        details: specificObjection,
      });
      revalidatePath(`/agreements/${bond.swap_id}`);
    }
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to challenge pledge performance bond evidence.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Challenge recorded and routed to platform review.");
}

export async function adjudicatePerformanceBondChallengeAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/admin", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const bondId = readRequired(formData, "bond_id");
  const challengeId = readOptional(formData, "challenge_id") || null;
  const decision = normalizeBondAdjudicationDecision(readRequired(formData, "decision"));
  const decisionReason = truncateText(readRequired(formData, "decision_reason"), 1600);
  const appealAllowed = readBoolean(formData, "appeal_allowed");
  const appealDeadline = parseOptionalTimestamp(readOptional(formData, "appeal_deadline"));
  const admin = await requireAdminViewer(returnTo);
  const serviceSupabase = createServiceClient();

  try {
    const bond = await adjudicateBondChallenge({
      appealAllowed,
      appealDeadline,
      bondId,
      challengeId,
      decision,
      decisionReason,
      reviewerId: admin.authUser.id,
      supabase: serviceSupabase,
    });

    if (bond.swap_id) {
      await serviceSupabase.from("agreement_events").insert({
        agreement_id: bond.swap_id,
        actor_id: admin.authUser.id,
        event_type: "review_status_changed",
        summary: `Pledge performance bond review decision: ${decision.replaceAll("_", " ")}.`,
        details: decisionReason,
      });
      revalidatePath(`/agreements/${bond.swap_id}`);
    }
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to adjudicate pledge performance bond.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Pledge performance bond review decision saved.");
}

export async function requestAgreementReviewAppealAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const reviewCaseId = readRequired(formData, "review_case_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const appealReason = truncateText(readRequired(formData, "appeal_reason"), 1400);

  if (!reviewCaseId || !appealReason) {
    redirectWithMessage(returnTo, "error", "Review case and appeal reason are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: reviewCase, error: reviewCaseError } = await supabase
    .from("agreement_review_cases")
    .select("*")
    .eq("id", reviewCaseId)
    .maybeSingle();

  if (reviewCaseError || !reviewCase) {
    redirectWithMessage(returnTo, "error", reviewCaseError?.message ?? "Review case not found.");
  }

  await loadParticipantAgreementOrRedirect(
    supabase,
    reviewCase.agreement_id,
    viewer.authUser.id,
    returnTo,
  );

  const appealedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("agreement_review_cases")
    .update({
      status: "appealed",
      appeal_requested_by: viewer.authUser.id,
      appeal_reason: appealReason,
      appealed_at: appealedAt,
    })
    .eq("id", reviewCaseId);

  if (updateError) {
    logSupabaseActionError("Failed to request review appeal", updateError, {
      reviewCaseId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  await supabase
    .from("agreements")
    .update({ completion_state: "disputed_unresolved" })
    .eq("id", reviewCase.agreement_id);

  if (reviewCase.evidence_item_id) {
    await supabase
      .from("agreement_evidence_items")
      .update({ status: "disputed_unresolved" })
      .eq("id", reviewCase.evidence_item_id);
  }

  await supabase.from("agreement_events").insert({
    agreement_id: reviewCase.agreement_id,
    actor_id: viewer.authUser.id,
    event_type: "appeal_requested",
    summary: "Review appeal requested.",
    details: appealReason,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${reviewCase.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Appeal requested.");
}

export async function addAgreementEventAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const eventType = normalizeAgreementEventType(readOptional(formData, "event_type"));
  const summary = readRequired(formData, "summary");
  const details = readOptional(formData, "details");

  if (!agreementId || !summary) {
    redirectWithMessage(returnTo, "error", "Agreement event and summary are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== viewer.authUser.id && agreement.responder_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only update your own agreements.");
  }

  const { error } = await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: eventType,
    summary,
    details,
  });

  if (error) {
    logSupabaseActionError("Failed to add agreement event", error, {
      agreementId,
      userId: viewer.authUser.id,
      eventType,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Agreement update recorded.");
}

export async function updateAgreementStatusAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const status = normalizeAgreementStatus(readRequired(formData, "status"));
  const summary = readOptional(formData, "summary") || `Agreement marked ${status}.`;

  if (!agreementId) {
    redirectWithMessage(returnTo, "error", "Agreement ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  if (agreement.proposer_id !== viewer.authUser.id && agreement.responder_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only update your own agreements.");
  }

  const { error } = await supabase
    .from("agreements")
    .update({ status })
    .eq("id", agreementId);

  if (error) {
    logSupabaseActionError("Failed to update agreement status", error, {
      agreementId,
      userId: viewer.authUser.id,
      status,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { error: eventError } = await supabase.from("agreement_events").insert({
    agreement_id: agreementId,
    actor_id: viewer.authUser.id,
    event_type: "status_change",
    summary,
  });

  if (eventError) {
    logSupabaseActionError("Failed to record agreement status event", eventError, {
      agreementId,
      userId: viewer.authUser.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${agreementId}`);
  redirectWithMessage(returnTo, "message", "Agreement status updated.");
}

export async function saveSearchAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");
  const label = readRequired(formData, "label");
  const query = readOptional(formData, "query");
  const causes = readStringList(formData, "causes_json");
  const cadence = normalizeMatchFrequency(readOptional(formData, "cadence"));
  const minScore = readBoundedInt(formData, "min_score", {
    fallback: 50,
    min: 0,
    max: 100,
  });

  if (!label) {
    redirectWithMessage(returnTo, "error", "Saved search label is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").insert({
    profile_id: viewer.authUser.id,
    label,
    query,
    causes,
    cadence,
    min_score: minScore,
    status: "active",
  });

  if (error) {
    logSupabaseActionError("Failed to save match search", error, {
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Saved search created.");
}

export async function updateMatchReportStatusAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const reportId = readRequired(formData, "report_id");
  const rawStatus = readRequired(formData, "status");
  const status =
    rawStatus === "reviewed" || rawStatus === "dismissed" ? rawStatus : "open";

  if (!reportId) {
    redirectWithMessage(returnTo, "error", "Report ID is required.");
  }

  await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("match_reports")
    .update({
      status,
      reviewed_at: status === "open" ? null : new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    logSupabaseActionError("Failed to update match report status", error, {
      reportId,
      status,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Report status updated.");
}

export async function updateRiskSignalStatusAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const signalId = readRequired(formData, "risk_signal_id");
  const rawStatus = readRequired(formData, "status");
  const status =
    rawStatus === "reviewed" || rawStatus === "dismissed" ? rawStatus : "open";

  if (!signalId) {
    redirectWithMessage(returnTo, "error", "Risk signal ID is required.");
  }

  await requireAdminViewer(returnTo);
  const updatePayload: RiskSignalUpdate = {
    status,
    reviewed_at: status === "open" ? null : new Date().toISOString(),
  };
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("risk_signals")
    .update(updatePayload)
    .eq("id", signalId);

  if (error) {
    logSupabaseActionError("Failed to update risk signal status", error, {
      signalId,
      status,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Risk signal status updated.");
}

async function upsertVerificationBadgeForProfile({
  badgeType,
  evidenceSummary,
  profileId,
  reviewedBy,
  source = "agreement_review",
  status = "verified",
  supabase,
}: {
  badgeType: ProfileVerificationBadgeInsert["badge_type"];
  evidenceSummary: string;
  profileId: string;
  reviewedBy: string;
  source?: string;
  status?: ProfileVerificationBadgeInsert["status"];
  supabase: ReturnType<typeof createServiceClient>;
}) {
  const { error } = await supabase.from("profile_verification_badges").upsert(
    {
      profile_id: profileId,
      badge_type: badgeType,
      status,
      evidence_summary: evidenceSummary,
      source,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    },
    {
      onConflict: "profile_id,badge_type",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to upsert verification badge", error, {
      badgeType,
      profileId,
      status,
    });
  }
}

async function refreshRepeatCounterpartyBadge({
  profileId,
  reviewedBy,
  supabase,
}: {
  profileId: string;
  reviewedBy: string;
  supabase: ReturnType<typeof createServiceClient>;
}) {
  const { data, error } = await supabase
    .from("agreements")
    .select("id")
    .or(`proposer_id.eq.${profileId},responder_id.eq.${profileId}`)
    .eq("completion_state", "reviewed_complete")
    .limit(2);

  if (error) {
    logSupabaseActionError("Failed to count reviewed completions for repeat badge", error, {
      profileId,
    });
    return;
  }

  if ((data ?? []).length >= 2) {
    await upsertVerificationBadgeForProfile({
      badgeType: "repeat_counterparty",
      evidenceSummary: "At least two agreement rooms have reached reviewed-complete state.",
      profileId,
      reviewedBy,
      source: "automatic_review_count",
      supabase,
    });
  }
}

export async function updateAgreementReviewCaseAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const reviewCaseId = readRequired(formData, "review_case_id");

  if (!reviewCaseId) {
    redirectWithMessage(returnTo, "error", "Review case ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const nextStatus = normalizeReviewCaseStatus(readRequired(formData, "status"));
  const reviewerRole = normalizeReviewerRole(readOptional(formData, "reviewer_role"));
  const reviewerConfidence = readBoundedInt(formData, "reviewer_confidence", {
    fallback: 0,
    min: 0,
    max: 100,
  });
  const challengeWindowEndsAt =
    nextStatus === "challenge_window_open" ? addDaysFromNow(7) : null;
  const reviewedAt =
    nextStatus === "open" || nextStatus === "under_review" ? null : new Date().toISOString();

  const updatePayload: AgreementReviewCaseUpdate = {
    status: nextStatus,
    reviewer_role: reviewerRole,
    assigned_reviewer_id: admin.authUser.id,
    review_scope: truncateText(readOptional(formData, "review_scope"), 900),
    reviewer_conflict_state: normalizeAgreementReviewerConflictState(
      readOptional(formData, "reviewer_conflict_state"),
    ),
    neutral_review_assignment: normalizeNeutralReviewAssignment(
      readOptional(formData, "neutral_review_assignment"),
    ),
    conflict_of_interest_notes: truncateText(
      readOptional(formData, "conflict_of_interest_notes"),
      1000,
    ),
    review_panel_notes: truncateText(readOptional(formData, "review_panel_notes"), 1000),
    reviewer_notes: truncateText(readOptional(formData, "reviewer_notes"), 1400),
    public_reasoning_summary: truncateText(
      readOptional(formData, "public_reasoning_summary"),
      1400,
    ),
    reviewed_by: reviewedAt ? admin.authUser.id : null,
    reviewed_at: reviewedAt,
    challenge_window_ends_at: challengeWindowEndsAt,
  };

  const { data: currentReviewCase, error: currentReviewCaseError } = await supabase
    .from("agreement_review_cases")
    .select("*")
    .eq("id", reviewCaseId)
    .maybeSingle();

  if (currentReviewCaseError || !currentReviewCase) {
    logSupabaseActionError("Failed to load current agreement review case", currentReviewCaseError, {
      reviewCaseId,
      nextStatus,
    });
    redirectWithMessage(returnTo, "error", currentReviewCaseError?.message ?? "Review case not found.");
  }

  const { data: currentAgreement, error: currentAgreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", currentReviewCase.agreement_id)
    .maybeSingle();

  if (currentAgreementError || !currentAgreement) {
    logSupabaseActionError("Failed to load agreement for protocol review transition", currentAgreementError, {
      agreementId: currentReviewCase.agreement_id,
      reviewCaseId,
    });
    redirectWithMessage(
      returnTo,
      "error",
      currentAgreementError?.message ?? "Agreement not found for review transition.",
    );
  }

  const { data: currentEvidenceItem, error: currentEvidenceItemError } =
    currentReviewCase.evidence_item_id
      ? await supabase
          .from("agreement_evidence_items")
          .select("*")
          .eq("id", currentReviewCase.evidence_item_id)
          .maybeSingle()
      : { data: null, error: null };

  if (currentEvidenceItemError) {
    logSupabaseActionError("Failed to load evidence item for protocol review transition", currentEvidenceItemError, {
      evidenceItemId: currentReviewCase.evidence_item_id,
      reviewCaseId,
    });
    redirectWithMessage(returnTo, "error", currentEvidenceItemError.message);
  }

  const evidenceReviewReadiness = {
    hasEvidenceItem: Boolean(currentEvidenceItem),
    reviewerConfidence,
    artifactLinked: readBoolean(formData, "evidence_artifact_linked"),
    claimScopeAligned: readBoolean(formData, "claim_scope_aligned"),
    proofUniquenessChecked: readBoolean(formData, "proof_uniqueness_checked"),
    freshnessReviewed: readBoolean(formData, "evidence_freshness_reviewed"),
    agentLinksRecorded: readBoolean(formData, "evidence_agent_links_recorded"),
  };
  const disputeRecordCreated = Boolean(
    updatePayload.public_reasoning_summary ||
      updatePayload.reviewer_notes ||
      currentReviewCase.appeal_reason,
  );

  const protocolTransitionRecordedAt = new Date().toISOString();
  const protocolTransitionPrecheck = validateAgreementReviewProtocolTransition({
    currentCompletionState: currentAgreement.completion_state,
    currentReviewCaseStatus: currentReviewCase.status,
    nextReviewCaseStatus: nextStatus,
    terms: {
      source: currentAgreement.source,
      notes: currentAgreement.notes,
      structuredTerms: currentAgreement.structured_terms,
      noTradeBaseline: currentAgreement.no_trade_baseline,
      counterfactualDeclaration: currentAgreement.counterfactual_declaration,
      durationTerms: currentAgreement.duration_terms,
      exitConditions: currentAgreement.exit_conditions,
      evidenceRule: currentAgreement.evidence_rule,
      privacyScope: currentAgreement.privacy_scope,
      disclosureScope: currentAgreement.disclosure_scope,
    },
    hasEvidenceItem: evidenceReviewReadiness.hasEvidenceItem,
    reviewerConfidence,
    evidenceReviewReadiness,
    disputeRecordCreated,
    humanReviewApproved: true,
    actorAgentId: admin.authUser.id,
    actorAgentKind: "operator",
    idempotencyKey: `agreement-review:${reviewCaseId}:${nextStatus}:${protocolTransitionRecordedAt}`,
    provenanceActivityRecorded: true,
    recordedAt: protocolTransitionRecordedAt,
    subjectId: `review_decision:${reviewCaseId}`,
    subjectKind: "review_decision",
  });

  if (protocolTransitionPrecheck.status === "fail") {
    redirectWithMessage(
      returnTo,
      "error",
      `The review state transition is not allowed by the Moral Trade protocol: ${protocolTransitionPrecheck.blockers.join(", ")}.`,
    );
  }

  const provenanceResult = protocolTransitionPrecheck.transitionEventRecord
    ? await persistMoralTradeAgreementReviewProtocolProvenance({
        actorAgentId: admin.authUser.id,
        actorAgentKind: normalizeAgreementReviewProvenanceAgentKind(reviewerRole),
        actorLabel: admin.displayName,
        currentAgreement,
        currentReviewCase,
        disputeRecordCreated,
        evidenceReviewReadiness,
        nextReviewCaseStatus: nextStatus,
        protocolTransitionRecordedAt,
        publicReasoningSummary: updatePayload.public_reasoning_summary ?? "",
        reviewerConfidence,
        reviewerNotes: updatePayload.reviewer_notes ?? "",
        reviewScope: updatePayload.review_scope ?? "",
        supabase,
      })
    : { error: null, transition: protocolTransitionPrecheck };

  if (provenanceResult.error) {
    logSupabaseActionError("Failed to persist agreement review protocol provenance", provenanceResult.error, {
      agreementId: currentAgreement.id,
      reviewCaseId,
    });
    redirectWithMessage(
      returnTo,
      "error",
      "Review status was not changed because the required protocol provenance record could not be written.",
    );
  }

  const protocolTransition = provenanceResult.transition ?? protocolTransitionPrecheck;

  const { data: reviewCase, error } = await supabase
    .from("agreement_review_cases")
    .update(updatePayload)
    .eq("id", reviewCaseId)
    .select("*")
    .single();

  if (error || !reviewCase) {
    logSupabaseActionError("Failed to update agreement review case", error, {
      reviewCaseId,
      nextStatus,
    });
    redirectWithMessage(returnTo, "error", error?.message ?? "Review case not found.");
  }

  const evidenceStatus: NonNullable<AgreementEvidenceItemUpdate["status"]> =
    nextStatus === "reviewed_complete"
      ? "reviewed_complete"
      : nextStatus === "challenge_window_open"
        ? "challenge_window_open"
        : nextStatus === "disputed_unresolved" || nextStatus === "appealed"
          ? "disputed_unresolved"
          : "under_review";
  const agreementCompletionState: NonNullable<AgreementUpdate["completion_state"]> =
    evidenceStatus === "reviewed_complete"
      ? "reviewed_complete"
      : evidenceStatus === "challenge_window_open"
        ? "challenge_window_open"
        : evidenceStatus === "disputed_unresolved"
          ? "disputed_unresolved"
          : "under_review";

  let evidenceItem:
    | Database["public"]["Tables"]["agreement_evidence_items"]["Row"]
    | null = null;

  if (reviewCase.evidence_item_id) {
    const { data: updatedEvidenceItem, error: evidenceError } = await supabase
      .from("agreement_evidence_items")
      .update({
        status: evidenceStatus,
        reviewer_confidence: reviewerConfidence || null,
      })
      .eq("id", reviewCase.evidence_item_id)
      .select("*")
      .maybeSingle();

    if (evidenceError) {
      logSupabaseActionError("Failed to update evidence item review status", evidenceError, {
        reviewCaseId,
        evidenceItemId: reviewCase.evidence_item_id,
      });
    }

    evidenceItem = updatedEvidenceItem;
  }

  const agreementUpdatePayload: AgreementUpdate = {
    completion_state: agreementCompletionState,
    challenge_window_ends_at: challengeWindowEndsAt,
  };

  if (agreementCompletionState === "reviewed_complete") {
    agreementUpdatePayload.status = "completed";
  }

  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .update(agreementUpdatePayload)
    .eq("id", reviewCase.agreement_id)
    .select("*")
    .maybeSingle();

  if (agreementError || !agreement) {
    logSupabaseActionError("Failed to update agreement completion state", agreementError, {
      reviewCaseId,
      agreementId: reviewCase.agreement_id,
    });
  }

  const evidenceReadinessAuditDetails =
    nextStatus === "reviewed_complete"
      ? [
          "Evidence readiness checks:",
          `artifact_linked=${evidenceReviewReadiness.artifactLinked};`,
          `claim_scope_aligned=${evidenceReviewReadiness.claimScopeAligned};`,
          `proof_uniqueness_checked=${evidenceReviewReadiness.proofUniquenessChecked};`,
          `freshness_reviewed=${evidenceReviewReadiness.freshnessReviewed};`,
          `agent_links_recorded=${evidenceReviewReadiness.agentLinksRecorded}.`,
        ].join(" ")
      : "";
  const protocolTransitionEventDetails =
    summarizeMoralTradeStateTransitionEventRecord(protocolTransition.transitionEventRecord);

  await supabase.from("agreement_events").insert({
    agreement_id: reviewCase.agreement_id,
    actor_id: admin.authUser.id,
    event_type:
      nextStatus === "challenge_window_open"
        ? "challenge_opened"
        : "review_status_changed",
    summary: `Review case moved to ${nextStatus.replaceAll("_", " ")}.`,
    details: [
      updatePayload.public_reasoning_summary || updatePayload.reviewer_notes || "",
      evidenceReadinessAuditDetails,
      protocolTransitionEventDetails,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  if (nextStatus === "reviewed_complete" && agreement) {
    const badgeSummary =
      updatePayload.public_reasoning_summary ||
      "An agreement room reached reviewed-complete state after evidence review.";
    for (const profileId of [agreement.proposer_id, agreement.responder_id]) {
      await upsertVerificationBadgeForProfile({
        badgeType: "completion_reviewed",
        evidenceSummary: badgeSummary,
        profileId,
        reviewedBy: admin.authUser.id,
        supabase,
      });

      if (
        evidenceItem &&
        ["receipt", "provider_record", "third_party_review"].includes(evidenceItem.evidence_type)
      ) {
        await upsertVerificationBadgeForProfile({
          badgeType: "payment_evidence_verified",
          evidenceSummary: `Evidence item reviewed: ${evidenceItem.title}`,
          profileId,
          reviewedBy: admin.authUser.id,
          supabase,
        });
      }

      await refreshRepeatCounterpartyBadge({
        profileId,
        reviewedBy: admin.authUser.id,
        supabase,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${reviewCase.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Evidence review case updated.");
}

export async function updateProfileVerificationBadgeAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const profileId = readRequired(formData, "profile_id");

  if (!profileId) {
    redirectWithMessage(returnTo, "error", "Profile ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const badgeType = normalizeVerificationBadgeType(readRequired(formData, "badge_type"));
  const status = normalizeVerificationBadgeStatus(readRequired(formData, "status"));

  await upsertVerificationBadgeForProfile({
    badgeType,
    evidenceSummary: truncateText(readOptional(formData, "evidence_summary"), 1200),
    profileId,
    reviewedBy: admin.authUser.id,
    source: truncateText(readOptional(formData, "source") || "operator_review", 120),
    status,
    supabase,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/people/${profileId}`);
  redirectWithMessage(returnTo, "message", "Verification badge updated.");
}

export async function updatePaymentReviewStatusAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const paymentId = readRequired(formData, "payment_id");
  const rawStatus = readRequired(formData, "status");
  const status: AgreementPaymentStatus =
    rawStatus === "refunded" ||
    rawStatus === "disputed" ||
    rawStatus === "cancelled" ||
    rawStatus === "paid"
      ? rawStatus
      : "refund_requested";

  if (!paymentId) {
    redirectWithMessage(returnTo, "error", "Payment ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const { data: payment, error: paymentError } = await supabase
    .from("agreement_payments")
    .update({ status })
    .eq("id", paymentId)
    .select("*")
    .maybeSingle();

  if (paymentError || !payment) {
    logSupabaseActionError("Failed to update payment review status as admin", paymentError, {
      paymentId,
      status,
    });
    redirectWithMessage(returnTo, "error", paymentError?.message ?? "Payment not found.");
  }

  await supabase.from("agreement_events").insert({
    agreement_id: payment.agreement_id,
    actor_id: admin.authUser.id,
    event_type: "payment_update",
    summary: `Admin marked payment ${status.replace("_", " ")}.`,
    details: "Administrative payment review action. This records platform state only; Stripe disputes or refunds still need Stripe-side handling when applicable.",
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath(`/agreements/${payment.agreement_id}`);
  redirectWithMessage(returnTo, "message", "Payment review status updated.");
}

export async function suppressEmailOutboxAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const emailId = readRequired(formData, "email_id");

  if (!emailId) {
    redirectWithMessage(returnTo, "error", "Email ID is required.");
  }

  await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("email_outbox")
    .update({
      status: "suppressed",
      last_error: "Suppressed by administrator.",
    })
    .eq("id", emailId);

  if (error) {
    logSupabaseActionError("Failed to suppress queued email", error, {
      emailId,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage(returnTo, "message", "Email suppressed.");
}

export async function reviewDonationOffsetOfferAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const offerId = readRequired(formData, "offer_id");
  const rawStatus = readRequired(formData, "moderation_status");
  const moderationStatus =
    rawStatus === "clear" || rawStatus === "blocked" ? rawStatus : "flagged";
  const moderationNotes = readOptional(formData, "moderation_notes");

  if (!offerId) {
    redirectWithMessage(returnTo, "error", "Offer ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const reviewedAt = new Date().toISOString();

  const { data: offsetOffer, error: offsetOfferError } = await supabase
    .from("donation_offset_offers")
    .update({
      moderation_status: moderationStatus,
      moderation_notes: moderationNotes,
      moderation_reviewed_by: admin.authUser.id,
      moderation_reviewed_at: reviewedAt,
    })
    .eq("offer_id", offerId)
    .select("*")
    .maybeSingle();

  if (offsetOfferError || !offsetOffer) {
    logSupabaseActionError("Failed to review donation offset offer", offsetOfferError, {
      offerId,
      moderationStatus,
    });
    redirectWithMessage(returnTo, "error", offsetOfferError?.message ?? "Donation offset offer not found.");
  }

  const nextOfferStatus =
    moderationStatus === "clear" ? "open" : moderationStatus === "blocked" ? "closed" : "paused";

  const { error: offerError } = await supabase
    .from("offers")
    .update({
      status: nextOfferStatus,
    })
    .eq("id", offerId);

  if (offerError) {
    logSupabaseActionError("Failed to update offer status after donation offset review", offerError, {
      offerId,
      moderationStatus,
    });
    redirectWithMessage(returnTo, "error", offerError.message);
  }

  if (offsetOffer.pool_id) {
    const { error: poolError } = await supabase
      .from("donation_offset_pools")
      .update({
        moderation_status: moderationStatus,
        moderation_notes: moderationNotes,
      })
      .eq("id", offsetOffer.pool_id);

    if (poolError) {
      logSupabaseActionError("Failed to update donation offset pool review state", poolError, {
        offerId,
        poolId: offsetOffer.pool_id,
        moderationStatus,
      });
      redirectWithMessage(returnTo, "error", poolError.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/offers");
  revalidatePath("/donation-offsets");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Donation offset review updated.");
}

export async function submitBaselineBondEvidenceAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);
  const evidenceUrl = readRequired(formData, "baseline_bond_evidence_url");

  if (!offerId) {
    redirectWithMessage(returnTo, "error", "Offer ID is required.");
  }

  if (!evidenceUrl || !/^https?:\/\//i.test(evidenceUrl)) {
    redirectWithMessage(
      returnTo,
      "error",
      "Submit a reviewable evidence link for the baseline credibility bond.",
    );
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const [{ data: offer, error: offerError }, { data: offset, error: offsetError }] =
    await Promise.all([
      supabase.from("offers").select("*").eq("id", offerId).maybeSingle(),
      supabase.from("donation_offset_offers").select("*").eq("offer_id", offerId).maybeSingle(),
    ]);

  if (offerError || !offer) {
    redirectWithMessage(returnTo, "error", offerError?.message ?? "Offer not found.");
  }

  if (offsetError || !offset) {
    redirectWithMessage(
      returnTo,
      "error",
      offsetError?.message ?? "Baseline credibility bond details were not found.",
    );
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can submit baseline credibility bond evidence.");
  }

  const currentStatus = normalizeBaselineBondStatus(offset.baseline_bond_status);

  if (currentStatus !== "evidence_due") {
    redirectWithMessage(
      returnTo,
      "error",
      "Baseline credibility bond evidence is not open for submission yet.",
    );
  }

  const { error: updateError } = await supabase
    .from("donation_offset_offers")
    .update({
      baseline_bond_evidence_url: evidenceUrl,
      baseline_bond_status: "evidence_submitted",
    })
    .eq("offer_id", offerId)
    .eq("baseline_bond_status", currentStatus);

  if (updateError) {
    logSupabaseActionError("Failed to submit baseline credibility bond evidence", updateError, {
      offerId,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const evidenceRecordedAt = new Date().toISOString();
  const evidencePersistenceResult = await persistMoralTradeEvidenceSubmission({
    actorAgentId: viewer.authUser.id,
    actorAgentKind: "participant",
    actorLabel: offer.owner_alias,
    claimScope: "counterfactual_baseline",
    evidenceKind: "prior_intent",
    evidenceUrl,
    idempotencyKey: `baseline-bond:${offerId}:counterfactual-baseline-evidence`,
    offerId,
    ownerProfileId: viewer.authUser.id,
    reasonCodes: ["baseline_credibility_bond", "counterfactual_baseline"],
    recordedAt: evidenceRecordedAt,
    redactionLevel: "reviewer_only",
    subjectId: offerId,
    subjectKind: "offer",
    supabase,
  });

  if (evidencePersistenceResult.error) {
    logSupabaseActionError(
      "Failed to persist baseline credibility bond evidence bundle",
      toActionError(
        evidencePersistenceResult.error,
        "Unable to persist baseline credibility bond evidence bundle.",
      ),
      { offerId, ownerId: viewer.authUser.id },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Evidence was submitted, but the provenance evidence bundle could not be recorded.",
    );
  }

  const transitionResult = await persistBaselineBondStatusTransition({
    actorAgentId: viewer.authUser.id,
    actorAgentKind: "participant",
    actorLabel: offer.owner_alias,
    fromStatus: currentStatus,
    idempotencyKey: `baseline-bond:${offerId}:evidence_due-to-evidence_submitted`,
    offerId,
    ownerProfileId: viewer.authUser.id,
    provenanceActivity: "evidence_submitted",
    recordedAt: evidenceRecordedAt,
    supabase,
    toStatus: "evidence_submitted",
  });

  if (transitionResult.error) {
    logSupabaseActionError(
      "Failed to persist baseline credibility bond evidence transition",
      toActionError(
        transitionResult.error,
        "Unable to persist baseline credibility bond evidence transition.",
      ),
      { offerId, ownerId: viewer.authUser.id },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Evidence was submitted, but the baseline credibility bond audit transition could not be recorded.",
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Baseline credibility bond evidence submitted for review.");
}

export async function reviewBaselineBondEvidenceAction(formData: FormData) {
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/admin");
  const offerId = readRequired(formData, "offer_id");
  const decision = readRequired(formData, "baseline_bond_decision");
  const reviewNotes = readOptional(formData, "baseline_bond_review_notes");

  if (!offerId) {
    redirectWithMessage(returnTo, "error", "Offer ID is required.");
  }

  const admin = await requireAdminViewer(returnTo);
  const supabase = createServiceClient();
  const [{ data: offer, error: offerError }, { data: offset, error: offsetError }] =
    await Promise.all([
      supabase.from("offers").select("*").eq("id", offerId).maybeSingle(),
      supabase.from("donation_offset_offers").select("*").eq("offer_id", offerId).maybeSingle(),
    ]);

  if (offerError || !offer) {
    redirectWithMessage(returnTo, "error", offerError?.message ?? "Offer not found.");
  }

  if (offsetError || !offset) {
    redirectWithMessage(
      returnTo,
      "error",
      offsetError?.message ?? "Baseline credibility bond details were not found.",
    );
  }

  const currentStatus = normalizeBaselineBondStatus(offset.baseline_bond_status);
  let nextStatus: BaselineBondStatus | null = null;

  if (decision === "approve") {
    if (currentStatus !== "evidence_submitted" && currentStatus !== "evidence_due") {
      redirectWithMessage(returnTo, "error", "Baseline credibility bond evidence is not awaiting approval.");
    }
    nextStatus = "refunded_after_evidence";
  } else if (decision === "forfeit") {
    if (currentStatus !== "evidence_submitted" && currentStatus !== "evidence_due") {
      redirectWithMessage(returnTo, "error", "Baseline credibility bond is not ready for forfeiture review.");
    }

    const now = new Date();
    const appealWindowEndsAt =
      offset.baseline_bond_appeal_window_ends_at ??
      getBaselineBondAppealWindowEndsAt(now);
    const appealWindowMs = appealWindowEndsAt ? Date.parse(appealWindowEndsAt) : NaN;

    if (!Number.isFinite(appealWindowMs) || appealWindowMs > now.getTime()) {
      const { error: appealWindowError } = await supabase
        .from("donation_offset_offers")
        .update({
          baseline_bond_appeal_window_ends_at: appealWindowEndsAt,
          baseline_bond_review_notes:
            reviewNotes ||
            "Evidence was not approved. The appeal window must close before forfeiture.",
          baseline_bond_reviewed_at: now.toISOString(),
          baseline_bond_reviewed_by: admin.authUser.id,
        })
        .eq("offer_id", offerId);

      if (appealWindowError) {
        redirectWithMessage(returnTo, "error", appealWindowError.message);
      }

      revalidatePath("/admin");
      revalidatePath(`/offers/${offerId}`);
      redirectWithMessage(
        returnTo,
        "message",
        "Baseline credibility bond appeal window opened. Forfeiture is blocked until that window closes.",
      );
    }

    nextStatus = "forfeited";
  } else if (decision === "cancel") {
    nextStatus = "cancelled_by_review";
  } else {
    redirectWithMessage(returnTo, "error", "Choose a valid baseline credibility bond review decision.");
  }

  const { error: updateError } = await supabase
    .from("donation_offset_offers")
    .update({
      baseline_bond_status: nextStatus,
      baseline_bond_review_notes: reviewNotes,
      baseline_bond_reviewed_at: new Date().toISOString(),
      baseline_bond_reviewed_by: admin.authUser.id,
    })
    .eq("offer_id", offerId)
    .eq("baseline_bond_status", currentStatus);

  if (updateError) {
    logSupabaseActionError("Failed to review baseline credibility bond evidence", updateError, {
      offerId,
      decision,
    });
    redirectWithMessage(returnTo, "error", updateError.message);
  }

  const transitionResult = await persistBaselineBondStatusTransition({
    actorAgentId: admin.authUser.id,
    actorAgentKind: "operator",
    actorLabel: admin.authUser.email ?? "Admin reviewer",
    fromStatus: currentStatus,
    idempotencyKey: `baseline-bond:${offerId}:${currentStatus}-to-${nextStatus}`,
    offerId,
    ownerProfileId: offer.owner_id,
    provenanceActivity: "review_completed",
    supabase,
    toStatus: nextStatus,
  });

  if (transitionResult.error) {
    logSupabaseActionError(
      "Failed to persist baseline credibility bond review transition",
      toActionError(
        transitionResult.error,
        "Unable to persist baseline credibility bond review transition.",
      ),
      { offerId, decision },
    );
    redirectWithMessage(
      returnTo,
      "error",
      "Baseline credibility bond review was saved, but the audit transition could not be recorded.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Baseline credibility bond review updated.");
}

export async function toggleFollowAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/", "error", "Supabase is not configured yet.");
  }

  const profileId = readRequired(formData, "profile_id");
  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    profileId ? `/people/${profileId}` : "/people",
  );

  if (!profileId) {
    redirectWithMessage("/people", "error", "Profile ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  if (viewer.authUser.id === profileId) {
    redirectWithMessage(returnTo, "error", "You cannot follow your own profile.");
  }

  const supabase = await createClient();
  await ensureAccountRowsForUser(viewer.authUser, supabase);

  const { data: existing } = await supabase
    .from("user_follows")
    .select("*")
    .eq("follower_id", viewer.authUser.id)
    .eq("followed_id", profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", viewer.authUser.id)
      .eq("followed_id", profileId);

    if (error) {
      logSupabaseActionError("Failed to unfollow profile", error, {
        followerId: viewer.authUser.id,
        followedId: profileId,
      });
      redirectWithMessage(returnTo, "error", error.message);
    }

    revalidatePath("/people");
    revalidatePath(`/people/${profileId}`);
    revalidatePath(`/people/${viewer.authUser.id}`);
    redirectWithMessage(returnTo, "message", "Unfollowed.");
  }

  const { error } = await supabase.from("user_follows").insert({
    follower_id: viewer.authUser.id,
    followed_id: profileId,
  });

  if (error) {
    logSupabaseActionError("Failed to follow profile", error, {
      followerId: viewer.authUser.id,
      followedId: profileId,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${profileId}`);
  revalidatePath(`/people/${viewer.authUser.id}`);
  redirectWithMessage(returnTo, "message", "Now following this member.");
}

export async function toggleCartAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId) {
    redirectWithMessage("/offers", "error", "Offer ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot save your own offer.");
  }

  const { data: existing } = await supabase
    .from("offer_carts")
    .select("*")
    .eq("offer_id", offerId)
    .eq("user_id", viewer.authUser.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("offer_carts")
      .delete()
      .eq("offer_id", offerId)
      .eq("user_id", viewer.authUser.id);

    if (error) {
      logSupabaseActionError("Failed to remove saved offer", error, {
        offerId,
        userId: viewer.authUser.id,
      });
      redirectWithMessage(returnTo, "error", error.message);
    }

    revalidatePath("/saved-offers");
    revalidatePath("/cart");
    revalidatePath("/dashboard");
    revalidatePath(`/offers/${offerId}`);
    redirectWithMessage(returnTo, "message", "Removed saved offer.");
  }

  const { error } = await supabase.from("offer_carts").insert({
    offer_id: offerId,
    user_id: viewer.authUser.id,
  });

  if (error) {
    logSupabaseActionError("Failed to save offer", error, {
      offerId,
      userId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/saved-offers");
  revalidatePath("/cart");
  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Saved offer.");
}

export async function updateOfferDiscountAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const discountNote = readOptional(formData, "discount_note");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId) {
    redirectWithMessage("/offers", "error", "Offer ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage("/offers", "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can change discounts.");
  }

  const { error } = await supabase
    .from("offers")
    .update({
      discount_note: discountNote,
    })
    .eq("id", offerId);

  if (error) {
    logSupabaseActionError("Failed to update offer discount", error, {
      offerId,
      ownerId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/cart");
  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Offer discount updated.");
}

export async function addOfferRecommendationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const recommendedOfferId = readRequired(formData, "recommended_offer_id");
  const sourceOfferId = readOptional(formData, "source_offer_id");
  const profilePageId = readOptional(formData, "profile_page_id");
  const fallbackPath = profilePageId ? `/people/${profilePageId}` : `/offers/${sourceOfferId}`;
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), fallbackPath);

  if (!recommendedOfferId) {
    redirectWithMessage(returnTo, "error", "Choose an offer to recommend.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  const { data: recommendedOffer, error: recommendedOfferError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", recommendedOfferId)
    .maybeSingle();

  if (recommendedOfferError || !recommendedOffer) {
    redirectWithMessage(returnTo, "error", recommendedOfferError?.message ?? "Offer not found.");
  }

  if (recommendedOffer.owner_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Recommendations must point to another member's offer.");
  }

  if (sourceOfferId) {
    const { data: sourceOffer, error: sourceOfferError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", sourceOfferId)
      .maybeSingle();

    if (sourceOfferError || !sourceOffer) {
      redirectWithMessage(returnTo, "error", sourceOfferError?.message ?? "Source offer not found.");
    }

    if (sourceOffer.owner_id !== viewer.authUser.id) {
      redirectWithMessage(returnTo, "error", "You can only recommend from your own offer pages.");
    }
  } else if (profilePageId && profilePageId !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You can only add profile recommendations to your own page.");
  }

  const duplicateQuery = supabase
    .from("offer_recommendations")
    .select("*")
    .eq("recommender_id", viewer.authUser.id)
    .eq("recommended_offer_id", recommendedOfferId);

  const { data: existing, error: existingError } = sourceOfferId
    ? await duplicateQuery.eq("source_offer_id", sourceOfferId).maybeSingle()
    : await duplicateQuery.is("source_offer_id", null).maybeSingle();

  if (existingError) {
    logSupabaseActionError("Failed to check existing recommendation", existingError, {
      recommenderId: viewer.authUser.id,
      recommendedOfferId,
      sourceOfferId: sourceOfferId || null,
    });
  }

  if (existing) {
    redirectWithMessage(returnTo, "message", "That recommendation is already published.");
  }

  const { error } = await supabase.from("offer_recommendations").insert({
    recommender_id: viewer.authUser.id,
    source_offer_id: sourceOfferId || null,
    recommended_offer_id: recommendedOfferId,
  });

  if (error) {
    logSupabaseActionError("Failed to add recommendation", error, {
      recommenderId: viewer.authUser.id,
      recommendedOfferId,
      sourceOfferId: sourceOfferId || null,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/offers");
  revalidatePath(`/offers/${recommendedOfferId}`);
  if (sourceOfferId) {
    revalidatePath(`/offers/${sourceOfferId}`);
  }
  if (profilePageId) {
    revalidatePath(`/people/${profilePageId}`);
  }
  redirectWithMessage(returnTo, "message", "Recommendation published.");
}

export async function removeOfferRecommendationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const recommendationId = readRequired(formData, "recommendation_id");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!recommendationId) {
    redirectWithMessage(returnTo, "error", "Recommendation ID is required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();

  const { error } = await supabase
    .from("offer_recommendations")
    .delete()
    .eq("id", recommendationId)
    .eq("recommender_id", viewer.authUser.id);

  if (error) {
    logSupabaseActionError("Failed to remove recommendation", error, {
      recommendationId,
      recommenderId: viewer.authUser.id,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/offers");
  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirectWithMessage(returnTo, "message", "Recommendation removed.");
}

export async function addOfferCommentAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const offerId = readRequired(formData, "offer_id");
  const parentId = readOptional(formData, "parent_id");
  const body = readOptional(formData, "body");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!offerId || !body) {
    redirectWithMessage(returnTo, "error", "Comments cannot be empty.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  let depth = 0;

  enforceActionRateLimit({
    key: `offer-comment:${viewer.authUser.id}`,
    limit: 12,
    message: "You are posting comments too quickly. Wait a few minutes before trying again.",
    returnTo,
    windowMs: 5 * 60 * 1000,
  });

  if (parentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from("offer_comments")
      .select("*")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parentComment) {
      redirectWithMessage(returnTo, "error", parentError?.message ?? "Parent comment not found.");
    }

    if (parentComment.offer_id !== offerId) {
      redirectWithMessage(returnTo, "error", "Reply target does not belong to this offer.");
    }

    if (parentComment.depth >= 49) {
      redirectWithMessage(returnTo, "error", "Replies are capped at 50 nested levels.");
    }

    depth = parentComment.depth + 1;
  }

  const { error } = await supabase.from("offer_comments").insert({
    offer_id: offerId,
    author_id: viewer.authUser.id,
    parent_id: parentId || null,
    depth,
    body,
  });

  if (error) {
    logSupabaseActionError("Failed to add offer comment", error, {
      offerId,
      authorId: viewer.authUser.id,
      parentId: parentId || null,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${viewer.authUser.id}`);
  revalidatePath(`/offers/${offerId}`);
  const successMessage =
    readOptional(formData, "submission_kind") === "question"
      ? "Question posted."
      : "Comment posted.";
  redirectWithMessage(returnTo, "message", successMessage);
}

export async function voteCommentAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const commentId = readRequired(formData, "comment_id");
  const offerId = readRequired(formData, "offer_id");
  const value = Number(readRequired(formData, "value"));
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!commentId || !offerId || ![-1, 1].includes(value)) {
    redirectWithMessage(returnTo, "error", "Invalid comment vote.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: comment, error: commentError } = await supabase
    .from("offer_comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError || !comment) {
    redirectWithMessage(returnTo, "error", commentError?.message ?? "Comment not found.");
  }

  if (comment.author_id === viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "You cannot vote on your own comment.");
  }

  const { data: existing } = await supabase
    .from("comment_votes")
    .select("*")
    .eq("comment_id", commentId)
    .eq("user_id", viewer.authUser.id)
    .maybeSingle();

  if (existing && existing.value === value) {
    const { error } = await supabase
      .from("comment_votes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", viewer.authUser.id);

    if (error) {
      logSupabaseActionError("Failed to clear comment vote", error, {
        commentId,
        userId: viewer.authUser.id,
      });
      redirectWithMessage(returnTo, "error", error.message);
    }

    revalidatePath("/people");
    revalidatePath(`/people/${comment.author_id}`);
    revalidatePath(`/offers/${offerId}`);
    redirectWithMessage(returnTo, "message", "Vote removed.");
  }

  const { error } = await supabase.from("comment_votes").upsert(
    {
      comment_id: commentId,
      user_id: viewer.authUser.id,
      value,
    },
    {
      onConflict: "comment_id,user_id",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to record comment vote", error, {
      commentId,
      userId: viewer.authUser.id,
      value,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${comment.author_id}`);
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", value > 0 ? "Upvoted." : "Downvoted.");
}

export async function acceptInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const interestId = readRequired(formData, "interest_id");
  const offerId = readRequired(formData, "offer_id");
  const notes = readOptional(formData, "notes");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!interestId || !offerId) {
    redirectWithMessage(returnTo, "error", "Interest ID and offer ID are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage(returnTo, "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can accept interest.");
  }

  const { data: interest, error: interestError } = await supabase
    .from("interests")
    .select("*")
    .eq("id", interestId)
    .maybeSingle();

  if (interestError || !interest) {
    redirectWithMessage(returnTo, "error", interestError?.message ?? "Interest not found.");
  }

  if (interest.offer_id !== offerId) {
    redirectWithMessage(returnTo, "error", "That interest is not attached to this offer.");
  }

  let offererPerformanceBond: PerformanceBondRow | null = null;
  let takerPerformanceBond: PerformanceBondRow | null = null;

  if (offer.mode === "pledge" && isPledgePerformanceBondsEnabled()) {
    const [offererBondResult, takerBondResult] = await Promise.all([
      supabase
        .from("performance_bonds")
        .select("*")
        .eq("offer_id", offerId)
        .eq("side", "offerer")
        .eq("enabled", true)
        .maybeSingle(),
      supabase
        .from("performance_bonds")
        .select("*")
        .eq("interest_id", interestId)
        .eq("side", "taker")
        .eq("enabled", true)
        .maybeSingle(),
    ]);

    if (offererBondResult.error || takerBondResult.error) {
      redirectWithMessage(
        returnTo,
        "error",
        offererBondResult.error?.message ??
          takerBondResult.error?.message ??
          "Unable to load pledge performance bond terms.",
      );
    }

    offererPerformanceBond = offererBondResult.data as PerformanceBondRow | null;
    takerPerformanceBond = takerBondResult.data as PerformanceBondRow | null;
  }

  const { data: acceptanceResult, error: acceptanceError } = await (supabase as any).rpc(
    "accept_marketplace_interest_v1",
    {
      p_interest_id: interestId,
      p_offer_id: offerId,
      p_notes: notes,
    },
  );

  const acceptancePayload = acceptanceResult as
    | { agreement?: AgreementRow; created?: boolean }
    | null;
  const agreement = acceptancePayload?.agreement;

  if (acceptanceError || !agreement) {
    logSupabaseActionError(
      "Failed to atomically accept interest and create agreement",
      acceptanceError,
      {
        offerId,
        interestId,
        proposerId: viewer.authUser.id,
        responderId: interest.user_id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      acceptanceError?.message ?? "Unable to accept interest and create agreement.",
    );
  }

  if (offer.mode === "pledge" && (offererPerformanceBond || takerPerformanceBond)) {
    const serviceSupabase = createServiceClient();
    const livePaymentsEnabled = isLiveBondPaymentsEnabled();

    try {
      if (offererPerformanceBond) {
        await lockPerformanceBondTerms({
          actorId: viewer.authUser.id,
          bondId: offererPerformanceBond.id,
          counterpartyId: interest.user_id,
          livePaymentsEnabled,
          supabase: serviceSupabase,
          swapId: agreement.id,
        });
      }

      if (takerPerformanceBond) {
        await lockPerformanceBondTerms({
          actorId: interest.user_id,
          bondId: takerPerformanceBond.id,
          counterpartyId: viewer.authUser.id,
          livePaymentsEnabled,
          supabase: serviceSupabase,
          swapId: agreement.id,
        });
      }
    } catch (bondLockError) {
      logSupabaseActionError(
        "Failed to lock pledge performance bond terms",
        toActionError(bondLockError, "Unable to lock pledge performance bond terms."),
        { agreementId: agreement.id, offerId, interestId },
      );
      redirectWithMessage(
        returnTo,
        "error",
        bondLockError instanceof Error
          ? bondLockError.message
          : "Agreement created, but pledge performance bond terms could not be locked.",
      );
    }
  }

  if (offer.mode === "offset") {
    const { data: offsetDetails, error: offsetError } = await supabase
      .from("donation_offset_offers")
      .select("*")
      .eq("offer_id", offerId)
      .maybeSingle();

    if (offsetError || !offsetDetails) {
      logSupabaseActionError("Failed to load donation offset details during acceptance", offsetError, {
        offerId,
        interestId,
      });
      redirectWithMessage(
        returnTo,
        "error",
        offsetError?.message ?? "Donation offset details were missing for this offer.",
      );
    }

    if (offsetDetails.participation_mode === "pool") {
      redirectWithMessage(
        returnTo,
        "error",
        "Pool commitments are aggregated through the pool itself. Join the pool instead of accepting it one-to-one.",
      );
    }

    const preview = calculateDonationOffsetPreview({
      baselineAmountUsd: offsetDetails.baseline_amount_cents / 100,
      requestedMatchingAmountUsd: offsetDetails.requested_matching_amount_cents / 100,
      offsetRatio: offsetDetails.offset_ratio,
      unmatchedSurplusRule: offsetDetails.unmatched_surplus_rule,
    });

    const matchInsert: DonationOffsetMatchInsert = {
      offer_id: offerId,
      interest_id: interestId,
      owner_profile_id: viewer.authUser.id,
      counterparty_profile_id: interest.user_id,
      matched_baseline_cents: convertUsdToCents(preview.matchedBaselineUsd),
      matched_counterparty_cents: convertUsdToCents(preview.matchedCounterpartyUsd),
      compromise_total_cents: convertUsdToCents(preview.compromiseTotalUsd),
      unmatched_baseline_cents: convertUsdToCents(preview.unmatchedBaselineUsd),
      unmatched_counterparty_cents: convertUsdToCents(preview.unmatchedCounterpartyUsd),
      status: "matched",
      owner_evidence_url: offsetDetails.evidence_url,
      compromise_evidence_url: offsetDetails.evidence_url,
    };

    const { error: matchError } = await supabase.from("donation_offset_matches").insert(matchInsert);

    if (matchError) {
      logSupabaseActionError("Failed to record donation offset match", matchError, {
        offerId,
        interestId,
      });
      redirectWithMessage(returnTo, "error", matchError.message);
    }

    const bondRefundError = await refundPostedBaselineBondAfterMatch({
      actorLabel: offer.owner_alias,
      actorProfileId: viewer.authUser.id,
      idempotencyKeySuffix: interestId,
      offerId,
      offsetDetails: offsetDetails as DonationOffsetOfferRow,
      ownerProfileId: viewer.authUser.id,
      supabase,
    });

    if (bondRefundError) {
      logSupabaseActionError(
        "Failed to update baseline credibility bond after match",
        toActionError(bondRefundError, "Unable to update baseline credibility bond after match."),
        { offerId, interestId },
      );
      redirectWithMessage(
        returnTo,
        "error",
        "The response was accepted, but the baseline credibility bond refund transition could not be recorded.",
      );
    }
  }

  const { data: responderProfile } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", interest.user_id)
    .maybeSingle();

  const responseAcceptedEmail = buildMoralTradeSafeEmailCopy("response_accepted");
  await queueEmailOutbox({
    profileId: viewer.authUser.id,
    recipientEmail: responderProfile?.email,
    subject: responseAcceptedEmail.subject,
    body: responseAcceptedEmail.body,
  });

  const { error: offerUpdateError } = await supabase
    .from("offers")
    .update({
      status: "matched",
    })
    .eq("id", offerId);

  if (offerUpdateError) {
    logSupabaseActionError("Failed to mark offer as matched", offerUpdateError, {
      offerId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(returnTo, "message", "Interest accepted and agreement created.");
}

export async function acceptGuestInterestAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/offers", "error", "Supabase is not configured yet.");
  }

  const guestInterestId = readRequired(formData, "guest_interest_id");
  const offerId = readRequired(formData, "offer_id");
  const notes = readOptional(formData, "notes");
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), `/offers/${offerId}`);

  if (!guestInterestId || !offerId) {
    redirectWithMessage(returnTo, "error", "Guest response ID and offer ID are required.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    redirectWithMessage(returnTo, "error", offerError?.message ?? "Offer not found.");
  }

  if (offer.owner_id !== viewer.authUser.id) {
    redirectWithMessage(returnTo, "error", "Only the offer owner can accept responses.");
  }

  const { data: guestInterest, error: guestInterestError } = await supabase
    .from("guest_interests")
    .select("*")
    .eq("id", guestInterestId)
    .maybeSingle();

  if (guestInterestError || !guestInterest) {
    redirectWithMessage(returnTo, "error", guestInterestError?.message ?? "Guest response not found.");
  }

  if (guestInterest.offer_id !== offerId) {
    redirectWithMessage(returnTo, "error", "That guest response is not attached to this offer.");
  }

  if (!guestInterest.claimed_by_profile_id) {
    redirectWithMessage(
      returnTo,
      "error",
      "That guest respondent has not created an account yet. Ask them to sign up with the same email first.",
    );
  }

  if (offer.mode === "pledge" && isPledgePerformanceBondsEnabled()) {
    const { data: offererBond, error: offererBondError } = await supabase
      .from("performance_bonds")
      .select("id")
      .eq("offer_id", offerId)
      .eq("side", "offerer")
      .eq("enabled", true)
      .maybeSingle();

    if (offererBondError) {
      redirectWithMessage(returnTo, "error", offererBondError.message);
    }

    if (offererBond) {
      redirectWithMessage(
        returnTo,
        "error",
        "Bonded pledge swaps require a signed-in member response so evidence terms and reciprocal bond choices can be locked before acceptance.",
      );
    }
  }

  const { data: existingAgreement, error: existingAgreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("offer_id", offerId)
    .maybeSingle();

  if (existingAgreementError) {
    logSupabaseActionError("Failed to check existing agreement before accepting guest response", existingAgreementError, {
      offerId,
      guestInterestId,
    });
    redirectWithMessage(returnTo, "error", existingAgreementError.message);
  }

  if (existingAgreement) {
    redirectWithMessage(returnTo, "message", "This offer already has an agreement.");
  }

  const { data: acceptanceResult, error: acceptanceError } = await (supabase as any).rpc(
    "accept_marketplace_guest_interest_v1",
    {
      p_guest_interest_id: guestInterestId,
      p_offer_id: offerId,
      p_notes: notes,
    },
  );

  const acceptancePayload = acceptanceResult as
    | { agreement?: AgreementRow; created?: boolean }
    | null;

  if (acceptanceError || !acceptancePayload?.agreement) {
    logSupabaseActionError(
      "Failed to atomically accept guest response and create agreement",
      acceptanceError,
      {
        offerId,
        guestInterestId,
        proposerId: viewer.authUser.id,
        responderId: guestInterest.claimed_by_profile_id,
      },
    );
    redirectWithMessage(
      returnTo,
      "error",
      acceptanceError?.message ??
        "Unable to accept the guest response and create an agreement.",
    );
  }

  if (offer.mode === "offset") {
    const { data: offsetDetails, error: offsetError } = await supabase
      .from("donation_offset_offers")
      .select("*")
      .eq("offer_id", offerId)
      .maybeSingle();

    if (offsetError || !offsetDetails) {
      logSupabaseActionError(
        "Failed to load donation offset details during guest acceptance",
        offsetError,
        {
          offerId,
          guestInterestId,
        },
      );
      redirectWithMessage(
        returnTo,
        "error",
        offsetError?.message ?? "Donation offset details were missing for this offer.",
      );
    }

    if (offsetDetails.participation_mode === "pool") {
      redirectWithMessage(
        returnTo,
        "error",
        "Pool commitments are aggregated through the pool itself. Join the pool instead of accepting it one-to-one.",
      );
    }

    const preview = calculateDonationOffsetPreview({
      baselineAmountUsd: offsetDetails.baseline_amount_cents / 100,
      requestedMatchingAmountUsd: offsetDetails.requested_matching_amount_cents / 100,
      offsetRatio: offsetDetails.offset_ratio,
      unmatchedSurplusRule: offsetDetails.unmatched_surplus_rule,
    });

    const matchInsert: DonationOffsetMatchInsert = {
      offer_id: offerId,
      guest_interest_id: guestInterestId,
      owner_profile_id: viewer.authUser.id,
      counterparty_profile_id: guestInterest.claimed_by_profile_id,
      counterparty_email: guestInterest.contact_email,
      matched_baseline_cents: convertUsdToCents(preview.matchedBaselineUsd),
      matched_counterparty_cents: convertUsdToCents(preview.matchedCounterpartyUsd),
      compromise_total_cents: convertUsdToCents(preview.compromiseTotalUsd),
      unmatched_baseline_cents: convertUsdToCents(preview.unmatchedBaselineUsd),
      unmatched_counterparty_cents: convertUsdToCents(preview.unmatchedCounterpartyUsd),
      status: "matched",
      owner_evidence_url: offsetDetails.evidence_url,
      compromise_evidence_url: offsetDetails.evidence_url,
    };

    const { error: matchError } = await supabase.from("donation_offset_matches").insert(matchInsert);

    if (matchError) {
      logSupabaseActionError("Failed to record guest donation offset match", matchError, {
        offerId,
        guestInterestId,
      });
      redirectWithMessage(returnTo, "error", matchError.message);
    }

    const bondRefundError = await refundPostedBaselineBondAfterMatch({
      actorLabel: offer.owner_alias,
      actorProfileId: viewer.authUser.id,
      idempotencyKeySuffix: guestInterestId,
      offerId,
      offsetDetails: offsetDetails as DonationOffsetOfferRow,
      ownerProfileId: viewer.authUser.id,
      supabase,
    });

    if (bondRefundError) {
      logSupabaseActionError(
        "Failed to update baseline credibility bond after guest match",
        toActionError(
          bondRefundError,
          "Unable to update baseline credibility bond after guest match.",
        ),
        { offerId, guestInterestId },
      );
      redirectWithMessage(
        returnTo,
        "error",
        "The guest response was accepted, but the baseline credibility bond refund transition could not be recorded.",
      );
    }
  }

  const responseAcceptedEmail = buildMoralTradeSafeEmailCopy("response_accepted");
  await queueEmailOutbox({
    profileId: viewer.authUser.id,
    recipientEmail: guestInterest.contact_email,
    subject: responseAcceptedEmail.subject,
    body: responseAcceptedEmail.body,
  });

  const { error: offerUpdateError } = await supabase
    .from("offers")
    .update({
      status: "matched",
    })
    .eq("id", offerId);

  if (offerUpdateError) {
    logSupabaseActionError("Failed to mark offer as matched after guest response acceptance", offerUpdateError, {
      offerId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/offers/${offerId}`);
  redirectWithMessage(
    returnTo,
    "message",
    "Guest response accepted. The linked account was used to create a formal agreement.",
  );
}

export async function rateAgreementAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/dashboard", "error", "Supabase is not configured yet.");
  }

  const agreementId = readRequired(formData, "agreement_id");
  const ratedUserId = readRequired(formData, "rated_user_id");
  const score = Math.max(1, Math.min(10, Number(readRequired(formData, "score")) || 0));
  const returnTo = getSafeInternalPath(readOptional(formData, "return_to"), "/dashboard");

  if (!agreementId || !ratedUserId || !score) {
    redirectWithMessage(returnTo, "error", "Agreement rating is incomplete.");
  }

  const viewer = await requireViewer(returnTo);
  const supabase = await createClient();
  const { data: agreement, error: agreementError } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .maybeSingle();

  if (agreementError || !agreement) {
    redirectWithMessage(returnTo, "error", agreementError?.message ?? "Agreement not found.");
  }

  const viewerIsParticipant =
    agreement.proposer_id === viewer.authUser.id || agreement.responder_id === viewer.authUser.id;

  if (!viewerIsParticipant) {
    redirectWithMessage(returnTo, "error", "You are not a participant in that agreement.");
  }

  const expectedCounterpartyId =
    agreement.proposer_id === viewer.authUser.id ? agreement.responder_id : agreement.proposer_id;

  if (ratedUserId !== expectedCounterpartyId) {
    redirectWithMessage(returnTo, "error", "You can only rate the other party to the agreement.");
  }

  const { error } = await supabase.from("agreement_ratings").upsert(
    {
      agreement_id: agreementId,
      rater_id: viewer.authUser.id,
      rated_user_id: ratedUserId,
      score,
    },
    {
      onConflict: "agreement_id,rater_id,rated_user_id",
    },
  );

  if (error) {
    logSupabaseActionError("Failed to record agreement rating", error, {
      agreementId,
      raterId: viewer.authUser.id,
      ratedUserId,
      score,
    });
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { data: ratings } = await supabase
    .from("agreement_ratings")
    .select("*")
    .eq("agreement_id", agreementId);

  if ((ratings?.length ?? 0) >= 2) {
    const { error: completeError } = await supabase
      .from("agreements")
      .update({
        status: "completed",
      })
      .eq("id", agreementId);

    if (completeError) {
      logSupabaseActionError("Failed to mark agreement as completed", completeError, {
        agreementId,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/people");
  revalidatePath(`/people/${ratedUserId}`);
  redirectWithMessage(returnTo, "message", "Agreement rating recorded.");
}

function getPriorityFundServiceClient() {
  return createServiceClient() as any;
}

async function requirePriorityAssignment({
  cycleId,
  profileId,
  role,
  causeArea,
}: {
  cycleId: string;
  profileId: string;
  role: "specific_action_arbiter" | "cause_area_arbiter";
  causeArea?: string | null;
}) {
  const supabase = getPriorityFundServiceClient();
  let query = supabase
    .from("priority_correction_arbiter_assignments")
    .select("*")
    .eq("cycle_id", cycleId)
    .eq("profile_id", profileId)
    .eq("role", role)
    .eq("status", "active");

  if (role === "specific_action_arbiter") {
    query = query.eq("cause_area", causeArea ?? "");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("You are not assigned to that Priority Correction Fund role.");
  }

  return data as {
    id: string;
    cycle_id: string;
    profile_id: string;
    role: "specific_action_arbiter" | "cause_area_arbiter";
    cause_area: string | null;
  };
}

export async function logImpactContributionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const contributionKind =
    readOptional(formData, "contribution_kind") === "money_equivalent"
      ? "money_equivalent"
      : "donation";
  const causeArea = readRequired(formData, "cause_area");
  const actionLabel = readOptional(formData, "action_label");
  const amountDollars = Number(readRequired(formData, "amount_dollars"));
  const occurredAt = readOptional(formData, "occurred_at");
  const evidenceUrl = readOptional(formData, "evidence_url");
  const evidenceNote = readOptional(formData, "evidence_note");
  const verificationStatus =
    readOptional(formData, "verification_status") === "verified"
      ? "verified"
      : readOptional(formData, "verification_status") === "imported"
        ? "imported"
        : "self_reported";

  if (!causeArea) {
    redirectWithMessage(returnTo, "error", "Choose a cause area for this contribution.");
  }

  if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
    redirectWithMessage(returnTo, "error", "Contribution amount must be greater than zero.");
  }

  const amountCents = Math.round(amountDollars * 100);
  const occurredAtIso = occurredAt
    ? new Date(`${occurredAt}T12:00:00.000Z`).toISOString()
    : new Date().toISOString();

  const { error } = await supabase.from("impact_contributions").insert({
    profile_id: viewer.authUser.id,
    contribution_kind: contributionKind,
    cause_area: causeArea,
    action_label: actionLabel,
    amount_cents: amountCents,
    currency: "usd",
    occurred_at: occurredAtIso,
    evidence_url: evidenceUrl,
    evidence_note: evidenceNote,
    verification_status: verificationStatus,
    source_label: "manual_dashboard_entry",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/priority-correction-fund");
  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Contribution logged.");
}

export async function publishPriorityCorrectionCycleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireAdminViewer(returnTo);

  try {
    await publishPriorityCorrectionCycleForMonth({
      actingProfileId: viewer.authUser.id,
      cycleMonth: readOptional(formData, "cycle_month") || null,
    });
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to publish the Priority Correction Fund cycle.",
    );
  }

  revalidatePath("/priority-correction-fund");
  revalidatePath("/dashboard");
  redirectWithMessage(returnTo, "message", "Priority Correction Fund cycle published.");
}

export async function finalizePriorityCorrectionCycleAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  await requireAdminViewer(returnTo);
  const cycleId = readRequired(formData, "cycle_id");

  if (!cycleId) {
    redirectWithMessage(returnTo, "error", "Priority Correction Fund cycle id is missing.");
  }

  try {
    const result = await finalizePriorityCorrectionCycle(cycleId);

    revalidatePath("/priority-correction-fund");
    revalidatePath("/dashboard");
    redirectWithMessage(
      returnTo,
      "message",
      result.status === "reserved"
        ? "This month’s fund was reserved and carried forward."
        : "Priority Correction Fund cycle finalized.",
    );
  } catch (error) {
    redirectWithMessage(
      returnTo,
      "error",
      error instanceof Error ? error.message : "Unable to finalize the Priority Correction Fund cycle.",
    );
  }
}

export async function submitPrioritySpecificActionReasoningAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const causeArea = readRequired(formData, "cause_area");
  const title = readRequired(formData, "title");
  const combinationSummary = readRequired(formData, "combination_summary");
  const allocationSchedule = parseStructuredLines(readOptional(formData, "allocation_schedule"));
  const effectSchedule = parseStructuredLines(readOptional(formData, "effect_schedule"));
  const reasoning = readRequired(formData, "reasoning");

  if (!cycleId || !causeArea || !title || !combinationSummary || !reasoning) {
    redirectWithMessage(returnTo, "error", "Specific-action reasoning is incomplete.");
  }

  try {
    await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "specific_action_arbiter",
      causeArea,
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { data: previousSubmissions, error: previousError } = await supabase
    .from("priority_specific_action_submissions")
    .select("id,version")
    .eq("cycle_id", cycleId)
    .eq("cause_area", causeArea)
    .order("version", { ascending: false });

  if (previousError) {
    redirectWithMessage(returnTo, "error", previousError.message);
  }

  const nextVersion = (((previousSubmissions ?? []) as Array<{ version: number }>)[0]?.version ?? 0) + 1;

  if ((previousSubmissions ?? []).length) {
    const { error: supersedeError } = await supabase
      .from("priority_specific_action_submissions")
      .update({
        status: "superseded",
      })
      .eq("cycle_id", cycleId)
      .eq("cause_area", causeArea)
      .neq("status", "excluded");

    if (supersedeError) {
      redirectWithMessage(returnTo, "error", supersedeError.message);
    }
  }

  const { error } = await supabase.from("priority_specific_action_submissions").insert({
    cycle_id: cycleId,
    cause_area: causeArea,
    version: nextVersion,
    submitted_by: viewer.authUser.id,
    title,
    combination_summary: combinationSummary,
    allocation_schedule: allocationSchedule,
    effect_schedule: effectSchedule,
    reasoning,
    status: "draft",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Specific-action reasoning draft submitted.");
}

export async function recordPrioritySpecificActionPositionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const causeArea = readRequired(formData, "cause_area");
  const submissionId = readRequired(formData, "submission_id");
  const stance = readOptional(formData, "stance") === "dissent" ? "dissent" : "agree";
  const note = readOptional(formData, "note");

  if (!submissionId || !cycleId || !causeArea) {
    redirectWithMessage(returnTo, "error", "Specific-action arbiter response is incomplete.");
  }

  let assignmentId = "";

  try {
    const assignment = await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "specific_action_arbiter",
      causeArea,
    });
    assignmentId = assignment.id;
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { error } = await supabase.from("priority_specific_action_positions").upsert(
    {
      submission_id: submissionId,
      arbiter_assignment_id: assignmentId,
      stance,
      note,
    },
    {
      onConflict: "submission_id,arbiter_assignment_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { data: positions, error: positionsError } = await supabase
    .from("priority_specific_action_positions")
    .select("stance")
    .eq("submission_id", submissionId);

  if (positionsError) {
    redirectWithMessage(returnTo, "error", positionsError.message);
  }

  const agreeCount = ((positions ?? []) as Array<{ stance: "agree" | "dissent" }>).filter(
    (position) => position.stance === "agree",
  ).length;

  if (agreeCount >= 3) {
    const { error: publishError } = await supabase
      .from("priority_specific_action_submissions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (publishError) {
      redirectWithMessage(returnTo, "error", publishError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Specific-action arbiter position recorded.");
}

export async function recordPrioritySpecificActionFeedbackAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const submissionId = readRequired(formData, "submission_id");
  const cycleId = readRequired(formData, "cycle_id");
  const causeArea = readRequired(formData, "cause_area");
  const stance =
    readOptional(formData, "stance") === "agree_with_dissent"
      ? "agree_with_dissent"
      : "object";

  if (!submissionId || !cycleId || !causeArea) {
    redirectWithMessage(returnTo, "error", "Specific-action feedback is incomplete.");
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("priority_correction_member_snapshots")
    .select("prioritized_cause_area")
    .eq("cycle_id", cycleId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (snapshotError) {
    redirectWithMessage(returnTo, "error", snapshotError.message);
  }

  if (!snapshot || snapshot.prioritized_cause_area !== causeArea) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only members who currently prioritize this cause area can file feedback here.",
    );
  }

  const { error } = await supabase.from("priority_specific_action_feedback").upsert(
    {
      submission_id: submissionId,
      profile_id: viewer.authUser.id,
      stance,
    },
    {
      onConflict: "submission_id,profile_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const [{ data: feedbackRows, error: feedbackError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("priority_specific_action_feedback")
        .select("profile_id", { count: "exact" })
        .eq("submission_id", submissionId),
      supabase
        .from("priority_correction_member_snapshots")
        .select("profile_id", { count: "exact", head: true })
        .eq("cycle_id", cycleId)
        .eq("prioritized_cause_area", causeArea),
    ]);

  if (feedbackError || countError) {
    redirectWithMessage(
      returnTo,
      "error",
      feedbackError?.message ?? countError?.message ?? "Unable to evaluate feedback threshold.",
    );
  }

  const eligibleCount = count ?? 0;
  const feedbackCount = (feedbackRows ?? []).length;

  if (eligibleCount > 0 && feedbackCount / eligibleCount >= 0.2) {
    const { error: reconsiderError } = await supabase
      .from("priority_specific_action_submissions")
      .update({
        status: "reconsideration_requested",
      })
      .eq("id", submissionId);

    if (reconsiderError) {
      redirectWithMessage(returnTo, "error", reconsiderError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Specific-action feedback recorded.");
}

export async function submitPriorityCauseAreaAllocationAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const allocationSchedule = parseStructuredLines(readOptional(formData, "allocation_schedule"));
  const expectedImpact = readRequired(formData, "expected_impact");
  const reasoning = readRequired(formData, "reasoning");

  if (!cycleId || !allocationSchedule.length || !expectedImpact || !reasoning) {
    redirectWithMessage(returnTo, "error", "Cause-area allocation reasoning is incomplete.");
  }

  try {
    await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "cause_area_arbiter",
    });
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { data: previousRows, error: previousError } = await supabase
    .from("priority_cause_area_allocations")
    .select("id,version")
    .eq("cycle_id", cycleId)
    .order("version", { ascending: false });

  if (previousError) {
    redirectWithMessage(returnTo, "error", previousError.message);
  }

  const nextVersion = (((previousRows ?? []) as Array<{ version: number }>)[0]?.version ?? 0) + 1;

  if ((previousRows ?? []).length) {
    const { error: supersedeError } = await supabase
      .from("priority_cause_area_allocations")
      .update({
        status: "superseded",
      })
      .eq("cycle_id", cycleId);

    if (supersedeError) {
      redirectWithMessage(returnTo, "error", supersedeError.message);
    }
  }

  const { error } = await supabase.from("priority_cause_area_allocations").insert({
    cycle_id: cycleId,
    version: nextVersion,
    submitted_by: viewer.authUser.id,
    allocation_schedule: allocationSchedule,
    expected_impact: expectedImpact,
    reasoning,
    status: "draft",
  });

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Cause-area allocation draft submitted.");
}

export async function recordPriorityCauseAreaPositionAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const cycleId = readRequired(formData, "cycle_id");
  const allocationId = readRequired(formData, "allocation_id");
  const stance = readOptional(formData, "stance") === "dissent" ? "dissent" : "agree";
  const note = readOptional(formData, "note");

  if (!cycleId || !allocationId) {
    redirectWithMessage(returnTo, "error", "Cause-area arbiter response is incomplete.");
  }

  let assignmentId = "";

  try {
    const assignment = await requirePriorityAssignment({
      cycleId,
      profileId: viewer.authUser.id,
      role: "cause_area_arbiter",
    });
    assignmentId = assignment.id;
  } catch (error) {
    redirectWithMessage(returnTo, "error", error instanceof Error ? error.message : "Assignment required.");
  }

  const { error } = await supabase.from("priority_cause_area_positions").upsert(
    {
      allocation_id: allocationId,
      arbiter_assignment_id: assignmentId,
      stance,
      note,
    },
    {
      onConflict: "allocation_id,arbiter_assignment_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const { data: positions, error: positionsError } = await supabase
    .from("priority_cause_area_positions")
    .select("stance")
    .eq("allocation_id", allocationId);

  if (positionsError) {
    redirectWithMessage(returnTo, "error", positionsError.message);
  }

  const agreeCount = ((positions ?? []) as Array<{ stance: "agree" | "dissent" }>).filter(
    (position) => position.stance === "agree",
  ).length;

  if (agreeCount >= 4) {
    const { error: publishError } = await supabase
      .from("priority_cause_area_allocations")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", allocationId);

    if (publishError) {
      redirectWithMessage(returnTo, "error", publishError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Cause-area arbiter position recorded.");
}

export async function recordPriorityCauseAreaFeedbackAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/priority-correction-fund", "error", "Supabase is not configured yet.");
  }

  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/priority-correction-fund",
  );
  const viewer = await requireViewer(returnTo);
  const supabase = getPriorityFundServiceClient();
  const allocationId = readRequired(formData, "allocation_id");
  const cycleId = readRequired(formData, "cycle_id");
  const stance =
    readOptional(formData, "stance") === "agree_with_dissent"
      ? "agree_with_dissent"
      : "object";

  if (!allocationId || !cycleId) {
    redirectWithMessage(returnTo, "error", "Cause-area allocation feedback is incomplete.");
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("priority_correction_member_snapshots")
    .select("prioritized_cause_area")
    .eq("cycle_id", cycleId)
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();

  if (snapshotError) {
    redirectWithMessage(returnTo, "error", snapshotError.message);
  }

  if (!snapshot?.prioritized_cause_area) {
    redirectWithMessage(
      returnTo,
      "error",
      "Only members with a recorded prioritized cause area can file community feedback here.",
    );
  }

  const { error } = await supabase.from("priority_cause_area_feedback").upsert(
    {
      allocation_id: allocationId,
      profile_id: viewer.authUser.id,
      stance,
    },
    {
      onConflict: "allocation_id,profile_id",
    },
  );

  if (error) {
    redirectWithMessage(returnTo, "error", error.message);
  }

  const [{ data: feedbackRows, error: feedbackError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("priority_cause_area_feedback")
        .select("profile_id")
        .eq("allocation_id", allocationId),
      supabase
        .from("priority_correction_member_snapshots")
        .select("profile_id", { count: "exact", head: true })
        .eq("cycle_id", cycleId)
        .not("prioritized_cause_area", "is", null),
    ]);

  if (feedbackError || countError) {
    redirectWithMessage(
      returnTo,
      "error",
      feedbackError?.message ?? countError?.message ?? "Unable to evaluate community feedback.",
    );
  }

  const communityEligibleCount = count ?? 0;
  const feedbackCount = (feedbackRows ?? []).length;

  if (communityEligibleCount > 0 && feedbackCount / communityEligibleCount >= 0.4) {
    const { error: reconsiderError } = await supabase
      .from("priority_cause_area_allocations")
      .update({
        status: "reconsideration_requested",
      })
      .eq("id", allocationId);

    if (reconsiderError) {
      redirectWithMessage(returnTo, "error", reconsiderError.message);
    }
  }

  revalidatePath("/priority-correction-fund");
  redirectWithMessage(returnTo, "message", "Community feedback recorded.");
}
