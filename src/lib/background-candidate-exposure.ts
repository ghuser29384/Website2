import {
  BACKGROUND_PURPOSE_POLICY_VERSION,
  type BackgroundPurposeBinding,
  type BackgroundPurposeCode,
  normalizeBackgroundPurposeCode,
} from "@/lib/background-purpose-registry";

export const BACKGROUND_CANDIDATE_EXPOSURE_VERSION = "candidate-exposure-v1";
export const BACKGROUND_CANDIDATE_BUDGET_VERSION = "candidate-budget-v1";

export const BACKGROUND_INBOUND_DELEGATE_SCOPES = [
  "off",
  "cohort_only",
  "partner_matchmaker",
  "public_broad_preview",
] as const;

export type BackgroundInboundDelegateScope =
  (typeof BACKGROUND_INBOUND_DELEGATE_SCOPES)[number];

export const BACKGROUND_CANDIDATE_AUDIENCE_SCOPES = [
  "cohort_only",
  "partner_matchmaker",
  "public_broad_preview",
] as const;

export type BackgroundCandidateAudienceScope =
  (typeof BACKGROUND_CANDIDATE_AUDIENCE_SCOPES)[number];

export const BACKGROUND_CANDIDATE_SURFACES = ["broad_profile"] as const;

export type BackgroundCandidateSurface = (typeof BACKGROUND_CANDIDATE_SURFACES)[number];

export interface BackgroundCandidateExposureProfile {
  allowed_cohort_ids?: string[] | null;
  candidate_exposure_version?: string | null;
  candidate_inbound_budget_version?: string | null;
  inbound_delegate_cooloff_until?: string | null;
  inbound_delegate_discovery?: string | null;
  inbound_delegate_pending_intro_limit?: number | null;
  inbound_delegate_purpose_bindings?: unknown;
  inbound_delegate_purpose_codes?: string[] | null;
  inbound_delegate_surface_budget_per_window?: unknown;
  inbound_delegate_surfaces?: string[] | null;
  is_discoverable?: boolean | null;
  privacy_stage?: string | null;
  profile_id?: string | null;
  safety_status?: string | null;
  share_public_preview?: boolean | null;
}

export interface BackgroundCandidateBudgetConfig {
  surfaceLimit: number;
  windowDays: number;
}

export interface BackgroundCandidateExposureDecision {
  allowed: boolean;
  blockerCode: string;
  budgetConfig: BackgroundCandidateBudgetConfig | null;
  candidateBudgetVersion: string;
  candidateExposureVersion: string;
  normalizedAudienceScope: BackgroundCandidateAudienceScope;
  normalizedDiscovery: BackgroundInboundDelegateScope;
}

const AUDIENCE_SCOPE_RANK: Record<BackgroundCandidateAudienceScope, number> = {
  cohort_only: 1,
  partner_matchmaker: 2,
  public_broad_preview: 3,
};

export function normalizeBackgroundInboundDelegateScope(
  value?: string | null,
): BackgroundInboundDelegateScope {
  return BACKGROUND_INBOUND_DELEGATE_SCOPES.includes(value as BackgroundInboundDelegateScope)
    ? (value as BackgroundInboundDelegateScope)
    : "off";
}

export function normalizeBackgroundCandidateAudienceScope(
  value?: string | null,
): BackgroundCandidateAudienceScope {
  return BACKGROUND_CANDIDATE_AUDIENCE_SCOPES.includes(value as BackgroundCandidateAudienceScope)
    ? (value as BackgroundCandidateAudienceScope)
    : "cohort_only";
}

export function normalizeBackgroundCandidateSurface(value?: string | null) {
  return BACKGROUND_CANDIDATE_SURFACES.includes(value as BackgroundCandidateSurface)
    ? (value as BackgroundCandidateSurface)
    : null;
}

export function buildBackgroundPurposeBindingRecord(purposeCodes: string[]) {
  const bindings: Record<string, BackgroundPurposeBinding> = {};

  for (const purposeCode of purposeCodes) {
    const normalizedCode = normalizeBackgroundPurposeCode(purposeCode);

    if (!normalizedCode) {
      continue;
    }

    bindings[normalizedCode] = {
      purposeCode: normalizedCode,
      purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    };
  }

  return bindings;
}

export function normalizeBackgroundPurposeCodeList(values: string[]) {
  return [
    ...new Set(
      values
        .map(normalizeBackgroundPurposeCode)
        .filter((value): value is BackgroundPurposeCode => Boolean(value)),
    ),
  ];
}

export function buildBackgroundCandidateBudgetConfig({
  surfaceLimit,
  windowDays,
}: {
  surfaceLimit?: number | null;
  windowDays?: number | null;
}): BackgroundCandidateBudgetConfig {
  return {
    surfaceLimit: clampInteger(surfaceLimit, 1, 50, 3),
    windowDays: clampInteger(windowDays, 1, 90, 30),
  };
}

export function buildBackgroundCandidateBudgetRecord({
  audienceScope,
  purposeCodes,
  surfaceLimit,
  windowDays,
}: {
  audienceScope: BackgroundCandidateAudienceScope;
  purposeCodes: BackgroundPurposeCode[];
  surfaceLimit?: number | null;
  windowDays?: number | null;
}) {
  const config = buildBackgroundCandidateBudgetConfig({ surfaceLimit, windowDays });
  const record: Record<string, Record<string, BackgroundCandidateBudgetConfig>> = {};

  for (const purposeCode of purposeCodes) {
    record[purposeCode] = {
      [audienceScope]: config,
    };
  }

  return record;
}

export function evaluateBackgroundDelegatePurposeAuthorization({
  allowedPurposeBindings,
  purposeBinding,
}: {
  allowedPurposeBindings: unknown;
  purposeBinding: BackgroundPurposeBinding;
}) {
  return Boolean(
    getPurposeBindingFromRecord(allowedPurposeBindings, purposeBinding.purposeCode)
      ?.purposePolicyVersion === purposeBinding.purposePolicyVersion,
  );
}

export function evaluateCandidateExposureForBackgroundRun({
  audienceScope,
  candidateProfile,
  cohortScopeId = "",
  now = new Date(),
  purposeBinding,
  surfaces,
}: {
  audienceScope?: string | null;
  candidateProfile: BackgroundCandidateExposureProfile | null;
  cohortScopeId?: string | null;
  now?: Date;
  purposeBinding: BackgroundPurposeBinding;
  surfaces: string[];
}): BackgroundCandidateExposureDecision {
  const normalizedAudienceScope = normalizeBackgroundCandidateAudienceScope(audienceScope);
  const normalizedDiscovery = normalizeBackgroundInboundDelegateScope(
    candidateProfile?.inbound_delegate_discovery,
  );
  const candidateBudgetVersion =
    candidateProfile?.candidate_inbound_budget_version || BACKGROUND_CANDIDATE_BUDGET_VERSION;
  const candidateExposureVersion =
    candidateProfile?.candidate_exposure_version || BACKGROUND_CANDIDATE_EXPOSURE_VERSION;

  const blocked = (blockerCode: string): BackgroundCandidateExposureDecision => ({
    allowed: false,
    blockerCode,
    budgetConfig: null,
    candidateBudgetVersion,
    candidateExposureVersion,
    normalizedAudienceScope,
    normalizedDiscovery,
  });

  if (!candidateProfile?.profile_id) {
    return blocked("candidate_profile_missing");
  }

  if (candidateProfile.safety_status !== "clear" || candidateProfile.is_discoverable !== true) {
    return blocked("candidate_not_active_or_clear");
  }

  if (candidateProfile.privacy_stage === "strict") {
    return blocked("candidate_privacy_stage");
  }

  if (normalizedDiscovery === "off") {
    return blocked("candidate_inbound_delegate_off");
  }

  if (
    AUDIENCE_SCOPE_RANK[normalizedAudienceScope] >
    AUDIENCE_SCOPE_RANK[normalizeBackgroundCandidateAudienceScope(normalizedDiscovery)]
  ) {
    return blocked("candidate_scope_mismatch");
  }

  if (normalizedAudienceScope === "public_broad_preview" && candidateProfile.share_public_preview !== true) {
    return blocked("candidate_public_preview_not_confirmed");
  }

  const allowedPurposeCodes = new Set(
    normalizeBackgroundPurposeCodeList(candidateProfile.inbound_delegate_purpose_codes ?? []),
  );

  if (!allowedPurposeCodes.has(purposeBinding.purposeCode)) {
    return blocked("candidate_purpose_not_allowed");
  }

  const binding = getPurposeBindingFromRecord(
    candidateProfile.inbound_delegate_purpose_bindings,
    purposeBinding.purposeCode,
  );

  if (binding?.purposePolicyVersion !== purposeBinding.purposePolicyVersion) {
    return blocked("candidate_purpose_version_mismatch");
  }

  const allowedSurfaces = new Set(
    (candidateProfile.inbound_delegate_surfaces ?? [])
      .map(normalizeBackgroundCandidateSurface)
      .filter(Boolean),
  );

  if (!surfaces.length || surfaces.some((surface) => !allowedSurfaces.has(surface as BackgroundCandidateSurface))) {
    return blocked("candidate_surface_not_allowed");
  }

  if (
    candidateProfile.inbound_delegate_cooloff_until &&
    new Date(candidateProfile.inbound_delegate_cooloff_until).getTime() > now.getTime()
  ) {
    return blocked("candidate_cooloff");
  }

  if (typeof candidateProfile.inbound_delegate_pending_intro_limit !== "number") {
    return blocked("candidate_pending_intro_limit_missing");
  }

  const allowedCohorts = candidateProfile.allowed_cohort_ids ?? [];
  const normalizedCohort = (cohortScopeId ?? "").trim();

  if (allowedCohorts.length && !allowedCohorts.includes(normalizedCohort)) {
    return blocked("candidate_cohort_mismatch");
  }

  const budgetConfig = getCandidateBudgetConfig(
    candidateProfile.inbound_delegate_surface_budget_per_window,
    purposeBinding.purposeCode,
    normalizedAudienceScope,
  );

  if (!budgetConfig || budgetConfig.surfaceLimit <= 0 || budgetConfig.windowDays <= 0) {
    return blocked("candidate_budget_missing");
  }

  return {
    allowed: true,
    blockerCode: "",
    budgetConfig,
    candidateBudgetVersion,
    candidateExposureVersion,
    normalizedAudienceScope,
    normalizedDiscovery,
  };
}

function clampInteger(value: number | null | undefined, min: number, max: number, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function getCandidateBudgetConfig(
  value: unknown,
  purposeCode: BackgroundPurposeCode,
  audienceScope: BackgroundCandidateAudienceScope,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const purposeRecord = (value as Record<string, unknown>)[purposeCode];

  if (!purposeRecord || typeof purposeRecord !== "object" || Array.isArray(purposeRecord)) {
    return null;
  }

  const rawConfig = (purposeRecord as Record<string, unknown>)[audienceScope];

  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return null;
  }

  const config = rawConfig as Record<string, unknown>;
  const surfaceLimit = Number(config.surfaceLimit);
  const windowDays = Number(config.windowDays);

  if (!Number.isFinite(surfaceLimit) || !Number.isFinite(windowDays)) {
    return null;
  }

  return {
    surfaceLimit: Math.floor(surfaceLimit),
    windowDays: Math.floor(windowDays),
  };
}

function getPurposeBindingFromRecord(value: unknown, purposeCode: BackgroundPurposeCode) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const rawBinding = Array.isArray(value)
    ? value.find((entry) => {
        if (!entry || typeof entry !== "object") {
          return false;
        }

        return (entry as Record<string, unknown>).purposeCode === purposeCode ||
          (entry as Record<string, unknown>).purpose_code === purposeCode;
      })
    : (value as Record<string, unknown>)[purposeCode];

  if (!rawBinding || typeof rawBinding !== "object") {
    return null;
  }

  const record = rawBinding as Record<string, unknown>;
  const normalizedCode = normalizeBackgroundPurposeCode(
    String(record.purposeCode ?? record.purpose_code ?? ""),
  );
  const policyVersion = String(
    record.purposePolicyVersion ?? record.purpose_policy_version ?? "",
  );

  if (!normalizedCode || policyVersion !== BACKGROUND_PURPOSE_POLICY_VERSION) {
    return null;
  }

  return {
    purposeCode: normalizedCode,
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
  };
}
