export type MatchWorkflowStageKey =
  | "suggested"
  | "waiting_for_counterparty"
  | "waiting_for_viewer"
  | "intro_ready"
  | "introduced"
  | "closed";

export interface MatchWorkflowStage {
  description: string;
  key: MatchWorkflowStageKey;
  label: string;
}

export interface MatchExplanationInput {
  canRevealIdentity: boolean;
  counterpartyConsented: boolean;
  generatedBy: string;
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

const FACTOR_LABELS: Record<string, string> = {
  ask_offer_complement: "Ask/offer complement",
  cause_overlap: "Cause overlap",
  deterministic_scan: "Deterministic scan",
  geographic_overlap: "Geographic overlap",
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

export function getMatchWorkflowStage({
  canRevealIdentity,
  counterpartyConsented,
  status,
  viewerConsented,
}: Pick<
  MatchExplanationInput,
  "canRevealIdentity" | "counterpartyConsented" | "status" | "viewerConsented"
>): MatchWorkflowStage {
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
      key: "closed",
      label: "Closed",
    };
  }

  if (canRevealIdentity || (viewerConsented && counterpartyConsented)) {
    return {
      description: "Mutual consent is recorded; use narrow disclosure grants before sharing more.",
      key: "intro_ready",
      label: "Intro ready",
    };
  }

  if (viewerConsented) {
    return {
      description: "You opted in; the counterparty has not opted in yet.",
      key: "waiting_for_counterparty",
      label: "Waiting for counterparty",
    };
  }

  if (counterpartyConsented) {
    return {
      description: "The counterparty opted in; you still control whether to continue.",
      key: "waiting_for_viewer",
      label: "Needs your decision",
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
