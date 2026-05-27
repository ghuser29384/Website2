export type MatchWorkflowStageKey =
  | "suggested"
  | "detail_requested"
  | "grant_pending"
  | "intro_review"
  | "intro_ready"
  | "introduced"
  | "archived"
  | "reported";

export type MatchScoreBucket = "0-24" | "25-44" | "45-59" | "60-74" | "75-100";

export interface MatchWorkflowStage {
  description: string;
  key: MatchWorkflowStageKey;
  label: string;
}

export interface MatchExplanationInput {
  canRevealIdentity: boolean;
  counterpartyConsented: boolean;
  generatedBy: string;
  hasConciergeReview?: boolean;
  hasOpenDetailRequest?: boolean;
  hasOpenReport?: boolean;
  matchBasis: string[];
  riskNotes: string;
  score: number;
  sharedCauses: string[];
  status: "suggested" | "dismissed" | "introduced" | "archived";
  suggestedFirstStep: string;
  viewerConsented: boolean;
}

export interface MatchExplanation {
  confidenceBand: "High" | "Moderate" | "Tentative" | "Exploratory";
  factorCodes: string[];
  privacyNote: string;
  provenance: string;
  redactedSurfaces: string[];
  scannedSurfaces: string[];
  summary: string;
  workflowStage: MatchWorkflowStage;
}

export interface MatchExplanationSnapshotPayload {
  confidence_band: MatchExplanation["confidenceBand"];
  explanation_version: string;
  factor_codes: string[];
  match_id: string;
  privacy_note: string;
  profile_id: string;
  provenance: string;
  redacted_surfaces: string[];
  scanned_surfaces: string[];
  score_bucket: MatchScoreBucket;
  source_run_id: string;
  source_run_kind: string;
  summary: string;
  workflow_stage: MatchWorkflowStageKey;
}

export const MATCH_EXPLANATION_VERSION = "background-explanation-v1";

const FACTOR_LABELS: Record<string, string> = {
  ask_offer_complement: "Ask/offer complement",
  cause_overlap: "Cause overlap",
  deterministic_scan: "Deterministic scan",
  geographic_overlap: "Geographic overlap",
  participant_complement: "Participant complement",
  payment_compatible: "Payment compatible",
  pledge_compatible: "Pledge compatible",
  privacy_aligned: "Privacy aligned",
  saved_search_hit: "Saved search hit",
  source_supported: "Source supported",
  verification_ready: "Verification ready",
};

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getMatchConfidenceBand(score: number): MatchExplanation["confidenceBand"] {
  if (score >= 75) {
    return "High";
  }

  if (score >= 60) {
    return "Moderate";
  }

  if (score >= 45) {
    return "Tentative";
  }

  return "Exploratory";
}

export function getMatchScoreBucket(score: number): MatchScoreBucket {
  if (score >= 75) {
    return "75-100";
  }

  if (score >= 60) {
    return "60-74";
  }

  if (score >= 45) {
    return "45-59";
  }

  if (score >= 25) {
    return "25-44";
  }

  return "0-24";
}

export function getMatchWorkflowStage({
  canRevealIdentity,
  counterpartyConsented,
  hasConciergeReview = false,
  hasOpenDetailRequest = false,
  hasOpenReport = false,
  status,
  viewerConsented,
}: Pick<
  MatchExplanationInput,
  | "canRevealIdentity"
  | "counterpartyConsented"
  | "hasConciergeReview"
  | "hasOpenDetailRequest"
  | "hasOpenReport"
  | "status"
  | "viewerConsented"
>): MatchWorkflowStage {
  if (hasOpenReport) {
    return {
      description: "A participant report or safety concern is waiting for review.",
      key: "reported",
      label: "Reported",
    };
  }

  if (status === "introduced") {
    return {
      description: "Both sides can move through an introduction plan or agreement room.",
      key: "introduced",
      label: "Introduced",
    };
  }

  if (status === "dismissed" || status === "archived") {
    return {
      description: "This suggestion is no longer active in the match inbox.",
      key: "archived",
      label: "Archived",
    };
  }

  if (canRevealIdentity || (viewerConsented && counterpartyConsented)) {
    return {
      description: "Mutual consent is recorded; use narrow disclosure grants before sharing more.",
      key: "intro_ready",
      label: "Intro ready",
    };
  }

  if (hasConciergeReview) {
    return {
      description: "An operator is reviewing whether the introduction can proceed safely.",
      key: "intro_review",
      label: "Operator review",
    };
  }

  if (hasOpenDetailRequest) {
    return {
      description: "A purpose-bound disclosure request is open before any broader reveal.",
      key: "detail_requested",
      label: "Detail requested",
    };
  }

  if (viewerConsented || counterpartyConsented) {
    return {
      description: "One side has opted in; grants and counterparty consent are still pending.",
      key: "grant_pending",
      label: "Grant pending",
    };
  }

  return {
    description: "A broad-preview suggestion is available for review.",
    key: "suggested",
    label: "Suggested",
  };
}

export function getPrivacySafeFactorCodes(matchBasis: string[], generatedBy: string) {
  const text = `${matchBasis.join(" ")} ${generatedBy}`.toLowerCase();
  const codes = [
    text.includes("cause_overlap") || text.includes("shared cause") ? "cause_overlap" : "",
    text.includes("ask_offer_complement") || text.includes("complement") ? "ask_offer_complement" : "",
    text.includes("payment_compatible") || text.includes("payment") ? "payment_compatible" : "",
    text.includes("pledge_compatible") || text.includes("pledge") ? "pledge_compatible" : "",
    text.includes("verification_ready") || text.includes("verification") ? "verification_ready" : "",
    text.includes("privacy_aligned") || text.includes("privacy") ? "privacy_aligned" : "",
    text.includes("source_supported") || text.includes("source") ? "source_supported" : "",
    text.includes("geographic_overlap") || text.includes("same city") || text.includes("same region")
      ? "geographic_overlap"
      : "",
    text.includes("participant_complement") ? "participant_complement" : "",
    text.includes("saved search") || text.includes("saved-search") ? "saved_search_hit" : "",
    text.includes("deterministic") || text.includes("rule-based") || text.includes("cron")
      ? "deterministic_scan"
      : "",
  ];

  return uniqueStrings(codes);
}

export function formatFactorCode(code: string) {
  return FACTOR_LABELS[code] ?? code.replaceAll("_", " ");
}

export function buildMatchExplanation(input: MatchExplanationInput): MatchExplanation {
  const factorCodes = getPrivacySafeFactorCodes(input.matchBasis, input.generatedBy);
  const scannedSurfaces = uniqueStrings([
    "Saved wish profile",
    "Broad registry previews",
    input.generatedBy.includes("saved-search") || factorCodes.includes("saved_search_hit")
      ? "Saved searches"
      : "",
    factorCodes.includes("source_supported") ? "Manual source summaries" : "",
    input.generatedBy.includes("delegate") ? "Helper strategy records" : "",
  ]);
  const redactedSurfaces = [
    "Exact wishes",
    "Private asks",
    "Contact details",
    "Raw source notes",
    "Sensitive constraints",
  ];
  const confidenceBand = getMatchConfidenceBand(input.score);
  const workflowStage = getMatchWorkflowStage(input);
  const causeSummary = input.sharedCauses.length
    ? ` It has ${input.sharedCauses.length} broad cause overlap(s).`
    : "";
  const summary = `${confidenceBand} confidence from privacy-safe factor codes, not private-text disclosure.${causeSummary}`;

  return {
    confidenceBand,
    factorCodes,
    privacyNote:
      "Explanation labels are deliberately coarse. Use privacy grants for purpose-bound detail, and keep raw wishes out of notifications and analytics.",
    provenance: `Generated by ${input.generatedBy || "rule-based scan"}; last score is a review prompt, not an automatic introduction.`,
    redactedSurfaces,
    scannedSurfaces,
    summary,
    workflowStage,
  };
}

export function buildMatchExplanationSnapshot({
  matchId,
  profileId,
  sourceRunId = "",
  sourceRunKind = "unknown",
  ...input
}: MatchExplanationInput & {
  matchId: string;
  profileId: string;
  sourceRunId?: string;
  sourceRunKind?: string;
}): MatchExplanationSnapshotPayload {
  const explanation = buildMatchExplanation(input);

  return {
    confidence_band: explanation.confidenceBand,
    explanation_version: MATCH_EXPLANATION_VERSION,
    factor_codes: explanation.factorCodes,
    match_id: matchId,
    privacy_note: explanation.privacyNote,
    profile_id: profileId,
    provenance: explanation.provenance,
    redacted_surfaces: explanation.redactedSurfaces,
    scanned_surfaces: explanation.scannedSurfaces,
    score_bucket: getMatchScoreBucket(input.score),
    source_run_id: sourceRunId,
    source_run_kind: sourceRunKind,
    summary: explanation.summary,
    workflow_stage: explanation.workflowStage.key,
  };
}

export function buildPrivacySafeMatchAuditMetadata({
  compatibilityTags,
  runReason,
  sharedCauseCount,
  sharedTokenCount,
}: {
  compatibilityTags: string[];
  runReason: string;
  sharedCauseCount: number;
  sharedTokenCount: number;
}) {
  return {
    compatibilityTags: getPrivacySafeFactorCodes(
      compatibilityTags.map((tag) => `Compatibility tag: ${tag}`),
      runReason,
    ),
    runReason,
    sharedCauseCount,
    sharedTokenCount,
  };
}

export function formatGrantExpiry(expiresAt: string | null) {
  if (!expiresAt) {
    return "until revoked";
  }

  const timestamp = Date.parse(expiresAt);
  if (Number.isNaN(timestamp)) {
    return "expiry unavailable";
  }

  return `expires ${new Date(timestamp).toLocaleDateString()}`;
}
