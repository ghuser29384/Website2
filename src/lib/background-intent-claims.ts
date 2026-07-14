import type { Database } from "@/lib/supabase/database.types";

type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type BackgroundIntentClaimInsert =
  Database["public"]["Tables"]["background_intent_claims"]["Insert"];
type BackgroundIntentClaimRow =
  Database["public"]["Tables"]["background_intent_claims"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type BackgroundSourceSummaryRow =
  Database["public"]["Tables"]["background_source_summaries"]["Row"];

export const BACKGROUND_INTENT_CLAIM_VERSION = "background-intent-claims-v1";

export type BackgroundIntentClaimType = BackgroundIntentClaimRow["claim_type"];

export interface BackgroundIntentClaimSynthesisInput {
  ask_terms?: string[] | null;
  capability_tags?: string[] | null;
  cause_priorities?: string[] | null;
  confidence_score?: number | null;
  constraint_flags?: string[] | null;
  missing_fields?: string[] | null;
  offer_terms?: string[] | null;
  source_count?: number | null;
  uncertainty_flags?: string[] | null;
}

export interface BuildBackgroundIntentClaimsInput {
  profile: Pick<
    WishProfileRow,
    | "background_search_enabled"
    | "causes"
    | "match_frequency"
    | "openness_to_payment"
    | "openness_to_pledges"
    | "participant_kind"
    | "privacy_stage"
    | "profile_id"
    | "share_public_preview"
  >;
  sourceConnections?: Array<
    Pick<
      SourceConnectionRow,
      "access_status" | "allowed_field_keys" | "id" | "provider" | "retention_expires_at"
    >
  >;
  sourceSummaries?: Array<
    Pick<
      BackgroundSourceSummaryRow,
      "allowed_field_keys" | "id" | "retention_expires_at" | "source_type" | "status"
    >
  >;
  synthesis?: BackgroundIntentClaimSynthesisInput | null;
}

const CLAIM_VALUE_MAX_LENGTH = 80;
const MAX_CLAIMS_PER_GROUP = 12;

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeClaimSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function compactClaimValue(value: string) {
  const withoutUrls = value.replace(/https?:\/\/\S+/gi, "[redacted-url]");
  const withoutEmails = withoutUrls.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[redacted-email]",
  );
  const withoutPhoneLike = withoutEmails.replace(/\b\+?\d[\d\s().-]{7,}\d\b/g, "[redacted-phone]");
  const compact = withoutPhoneLike.replace(/\s+/g, " ").trim();

  if (compact.length <= CLAIM_VALUE_MAX_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, CLAIM_VALUE_MAX_LENGTH - 1).trim()}...`;
}

function confidenceBandFor(score: number | null | undefined) {
  if ((score ?? 0) >= 75) {
    return "high" as const;
  }

  if ((score ?? 0) >= 45) {
    return "medium" as const;
  }

  return "low" as const;
}

function isRetentionLive(expiresAt: string | null | undefined, now: Date) {
  if (!expiresAt) {
    return true;
  }

  const timestamp = Date.parse(expiresAt);

  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

function pushClaim(
  claims: BackgroundIntentClaimInsert[],
  input: {
    claimType: BackgroundIntentClaimInsert["claim_type"];
    claimValue: string;
    confidenceBand?: BackgroundIntentClaimInsert["confidence_band"];
    explanation: string;
    previewSafe?: boolean;
    profileId: string;
    sourceKind: BackgroundIntentClaimInsert["source_kind"];
    sourceRecordId?: string | null;
    surfaceLabel: string;
  },
) {
  const claimValue = compactClaimValue(input.claimValue);
  const slug = normalizeClaimSlug(claimValue);

  if (!claimValue || !slug) {
    return;
  }

  claims.push({
    claim_key: `${input.claimType}:${slug}`,
    claim_type: input.claimType,
    claim_value: claimValue,
    claim_version: BACKGROUND_INTENT_CLAIM_VERSION,
    confidence_band: input.confidenceBand ?? "medium",
    explanation: input.explanation,
    preview_safe: input.previewSafe ?? false,
    profile_id: input.profileId,
    source_kind: input.sourceKind,
    source_record_id: input.sourceRecordId ?? null,
    status: "active",
    surface_label: input.surfaceLabel,
  });
}

function pushSynthesisClaims({
  claims,
  confidenceBand,
  profileId,
  synthesis,
}: {
  claims: BackgroundIntentClaimInsert[];
  confidenceBand: BackgroundIntentClaimInsert["confidence_band"];
  profileId: string;
  synthesis: BackgroundIntentClaimSynthesisInput;
}) {
  for (const value of uniqueStrings(synthesis.offer_terms ?? []).slice(0, MAX_CLAIMS_PER_GROUP)) {
    pushClaim(claims, {
      claimType: "offer_term",
      claimValue: value,
      confidenceBand,
      explanation:
        "Generated from deterministic offer tokens; exact offer text is not copied into this claim.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Deterministic synthesis",
    });
  }

  for (const value of uniqueStrings(synthesis.ask_terms ?? []).slice(0, MAX_CLAIMS_PER_GROUP)) {
    pushClaim(claims, {
      claimType: "ask_term",
      claimValue: value,
      confidenceBand,
      explanation:
        "Generated from deterministic ask tokens; exact wish or ask text is not copied into this claim.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Deterministic synthesis",
    });
  }

  for (const value of uniqueStrings(synthesis.capability_tags ?? []).slice(
    0,
    MAX_CLAIMS_PER_GROUP,
  )) {
    pushClaim(claims, {
      claimType: "capability_tag",
      claimValue: value,
      confidenceBand,
      explanation:
        "Generated from deterministic capability tags; private source text is not copied into this claim.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Deterministic synthesis",
    });
  }

  for (const value of uniqueStrings(synthesis.constraint_flags ?? []).slice(
    0,
    MAX_CLAIMS_PER_GROUP,
  )) {
    pushClaim(claims, {
      claimType: "constraint_flag",
      claimValue: value,
      confidenceBand,
      explanation:
        "Generated from broad constraint categories rather than raw constraints or contact details.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Deterministic synthesis",
    });
  }

  for (const value of uniqueStrings(synthesis.uncertainty_flags ?? []).slice(
    0,
    MAX_CLAIMS_PER_GROUP,
  )) {
    pushClaim(claims, {
      claimType: "uncertainty_item",
      claimValue: value,
      confidenceBand: confidenceBand === "high" ? "medium" : confidenceBand,
      explanation:
        "Generated from uncertainty categories and missing-field signals, not hidden behavioral data.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Deterministic synthesis",
    });
  }

  for (const value of uniqueStrings(synthesis.missing_fields ?? []).slice(0, MAX_CLAIMS_PER_GROUP)) {
    pushClaim(claims, {
      claimType: "missing_field",
      claimValue: value,
      confidenceBand: "high",
      explanation: "Generated from empty explicit profile fields to drive structured elicitation.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Profile completeness",
    });
  }

  if ((synthesis.source_count ?? 0) > 0) {
    pushClaim(claims, {
      claimType: "source_permission",
      claimValue: `${synthesis.source_count} reviewed source surface(s) available`,
      confidenceBand: "high",
      explanation:
        "Counts approved source surfaces without copying raw source notes or source summaries.",
      profileId,
      sourceKind: "profile_synthesis",
      surfaceLabel: "Source permission count",
    });
  }
}

export function buildBackgroundIntentClaims({
  profile,
  sourceConnections = [],
  sourceSummaries = [],
  synthesis,
}: BuildBackgroundIntentClaimsInput): BackgroundIntentClaimInsert[] {
  const profileId = profile.profile_id;
  const confidenceBand = confidenceBandFor(synthesis?.confidence_score);
  const claims: BackgroundIntentClaimInsert[] = [];
  const now = new Date();

  for (const cause of uniqueStrings(profile.causes ?? []).slice(0, MAX_CLAIMS_PER_GROUP)) {
    pushClaim(claims, {
      claimType: "cause_priority",
      claimValue: cause,
      confidenceBand: "high",
      explanation: "Generated from explicit cause selections on the private wish profile.",
      previewSafe: profile.share_public_preview,
      profileId,
      sourceKind: "wish_profile",
      surfaceLabel: "Broad profile preview",
    });
  }

  pushClaim(claims, {
    claimType: "profile_state",
    claimValue: `participant:${profile.participant_kind}`,
    confidenceBand: "high",
    explanation: "Generated from the explicit participant type saved on the wish profile.",
    previewSafe: true,
    profileId,
    sourceKind: "wish_profile",
    surfaceLabel: "Profile settings",
  });
  pushClaim(claims, {
    claimType: "profile_state",
    claimValue: `privacy:${profile.privacy_stage}`,
    confidenceBand: "high",
    explanation: "Generated from the explicit disclosure posture saved on the wish profile.",
    profileId,
    sourceKind: "wish_profile",
    surfaceLabel: "Profile settings",
  });
  pushClaim(claims, {
    claimType: "profile_state",
    claimValue: profile.background_search_enabled
      ? `background_scan:${profile.match_frequency}`
      : "background_scan:off",
    confidenceBand: "high",
    explanation: "Generated from the explicit background scan and cadence settings.",
    previewSafe: false,
    profileId,
    sourceKind: "wish_profile",
    surfaceLabel: "Scan settings",
  });

  if (profile.openness_to_payment) {
    pushClaim(claims, {
      claimType: "trade_preference",
      claimValue: "payment_mediated_trades",
      confidenceBand: "high",
      explanation: "Generated from the explicit payment-mediated trade preference.",
      previewSafe: true,
      profileId,
      sourceKind: "wish_profile",
      surfaceLabel: "Broad profile preview",
    });
  }

  if (profile.openness_to_pledges) {
    pushClaim(claims, {
      claimType: "trade_preference",
      claimValue: "pledge_mediated_trades",
      confidenceBand: "high",
      explanation: "Generated from the explicit pledge-mediated trade preference.",
      previewSafe: true,
      profileId,
      sourceKind: "wish_profile",
      surfaceLabel: "Broad profile preview",
    });
  }

  if (synthesis) {
    pushSynthesisClaims({ claims, confidenceBand, profileId, synthesis });
  }

  for (const connection of sourceConnections) {
    if (
      connection.access_status !== "connected" ||
      !isRetentionLive(connection.retention_expires_at, now)
    ) {
      continue;
    }

    for (const fieldKey of uniqueStrings(connection.allowed_field_keys ?? []).slice(
      0,
      MAX_CLAIMS_PER_GROUP,
    )) {
      pushClaim(claims, {
        claimType: "source_permission",
        claimValue: `${connection.provider}:${fieldKey}`,
        confidenceBand: "high",
        explanation:
          "Generated from a connected source permission; raw source ingestion remains disabled.",
        profileId,
        sourceKind: "source_connection",
        sourceRecordId: connection.id,
        surfaceLabel: "Connector permission",
      });
    }
  }

  for (const summary of sourceSummaries) {
    if (
      !["reviewed", "active"].includes(summary.status) ||
      !isRetentionLive(summary.retention_expires_at, now)
    ) {
      continue;
    }

    for (const fieldKey of uniqueStrings(summary.allowed_field_keys ?? []).slice(
      0,
      MAX_CLAIMS_PER_GROUP,
    )) {
      pushClaim(claims, {
        claimType: "source_permission",
        claimValue: `${summary.source_type}:${fieldKey}`,
        confidenceBand: "high",
        explanation:
          "Generated from reviewed source-summary permissions without copying the summary text.",
        profileId,
        sourceKind: "source_summary",
        sourceRecordId: summary.id,
        surfaceLabel: "Reviewed source summary",
      });
    }
  }

  const byKey = new Map<string, BackgroundIntentClaimInsert>();
  for (const claim of claims) {
    if (!byKey.has(claim.claim_key)) {
      byKey.set(claim.claim_key, claim);
    }
  }

  return [...byKey.values()].slice(0, 80);
}

export function formatBackgroundIntentClaimType(value: string) {
  switch (value) {
    case "ask_term":
      return "Ask signal";
    case "capability_tag":
      return "Capability signal";
    case "cause_priority":
      return "Cause priority";
    case "constraint_flag":
      return "Boundary";
    case "missing_field":
      return "Clarification need";
    case "offer_term":
      return "Offer signal";
    case "profile_state":
      return "Profile state";
    case "source_permission":
      return "Source permission";
    case "trade_preference":
      return "Trade preference";
    case "uncertainty_item":
      return "Uncertainty item";
    default:
      return value.replaceAll("_", " ");
  }
}
