export const BACKGROUND_PRIVATE_OVERLAP_CONTRACT_VERSION =
  "background-private-overlap-design-v0.1-2026-06";
export const BACKGROUND_PRIVATE_OVERLAP_VALIDATOR_VERSION =
  "background-private-overlap-validator-v0.1";

export type BackgroundPrivateOverlapNamespace =
  | "capability_tags"
  | "constraint_flags"
  | "verification_preferences"
  | "coarse_availability";

export type BackgroundPrivateOverlapEndpointStatus =
  | "blocked_pending_crypto_review"
  | "not_implemented";

export interface BackgroundPrivateOverlapNamespaceRule {
  key: BackgroundPrivateOverlapNamespace;
  label: string;
  allowedSource: string;
  storedRepresentation: "blinded_token_only";
  rawValueRetention: "forbidden";
}

export interface BackgroundPrivateOverlapPlannedEndpoint {
  method: "POST" | "DELETE";
  path: string;
  status: BackgroundPrivateOverlapEndpointStatus;
}

export interface BackgroundPrivateOverlapContract {
  blockedUntil: string[];
  contractTests: string[];
  fallbackBehavior: string;
  forbiddenInputs: string[];
  forbiddenStoredFields: string[];
  futureStoredFields: string[];
  liveEndpointEnabled: false;
  namespaceRules: BackgroundPrivateOverlapNamespaceRule[];
  participantOutput: {
    allowed: string[];
    forbidden: string[];
  };
  plannedEndpoints: BackgroundPrivateOverlapPlannedEndpoint[];
  purpose: string;
  releaseState: "design_review_only";
  requiredReviews: string[];
  storageState: "not_created";
  version: typeof BACKGROUND_PRIVATE_OVERLAP_CONTRACT_VERSION;
}

export interface BackgroundPrivateOverlapContractCheck {
  evidence: string;
  id: string;
  label: string;
  status: "pass" | "fail";
}

export interface BackgroundPrivateOverlapValidation {
  blockers: string[];
  checks: BackgroundPrivateOverlapContractCheck[];
  contractVersion: typeof BACKGROUND_PRIVATE_OVERLAP_CONTRACT_VERSION;
  liveReady: false;
  status: "pass" | "fail";
  validatorName: "background-private-overlap-design";
  validatorVersion: typeof BACKGROUND_PRIVATE_OVERLAP_VALIDATOR_VERSION;
}

export interface BackgroundPrivateOverlapPilotGateInput {
  adminFeatureFlagEnabled?: boolean;
  cryptographicReviewApproved?: boolean;
  dpiaApproved?: boolean;
  environment?: "development" | "preview" | "production" | "test";
  externalReviewApproved?: boolean;
  namespace?: string;
  requestedTags?: string[];
  threatModelApproved?: boolean;
}

export interface BackgroundPrivateOverlapPilotGate {
  blockers: string[];
  curatedTagsOnly: true;
  liveEndpointEnabled: false;
  allowed: false;
  namespace: BackgroundPrivateOverlapNamespace | null;
  rawInputsAccepted: false;
  stateMutation: false;
}

const REQUIRED_REVIEWS = [
  "DPIA and documented privacy-design review",
  "formal cryptographic design review",
  "narrow threat model and abuse-case review",
  "external security/privacy review before pilot",
  "property tests for non-overlap redaction and token deletion",
] as const;

const FORBIDDEN_INPUTS = [
  "free_text",
  "exact_wish",
  "exact_ask",
  "raw_source_text",
  "contact_details",
  "precise_location",
] as const;

const FORBIDDEN_STORED_FIELDS = [
  "raw_tag",
  "canonical_tag",
  "raw_text",
  "exact_private_wish",
  "non_overlap_value",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundPrivateOverlapContractCheck {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

function isBackgroundPrivateOverlapNamespace(value?: string | null): value is BackgroundPrivateOverlapNamespace {
  if (!value) {
    return false;
  }

  return [
    "capability_tags",
    "constraint_flags",
    "verification_preferences",
    "coarse_availability",
  ].includes(value);
}

function hasUnsafePrivateOverlapTag(value: string) {
  return /(?:\s|@|https?:\/\/|free_text|exact|wish|ask|contact|phone|email|location|source_text|raw)/i.test(value);
}

export function evaluateBackgroundPrivateOverlapPilotGate({
  adminFeatureFlagEnabled = false,
  cryptographicReviewApproved = false,
  dpiaApproved = false,
  environment = "development",
  externalReviewApproved = false,
  namespace,
  requestedTags = [],
  threatModelApproved = false,
}: BackgroundPrivateOverlapPilotGateInput): BackgroundPrivateOverlapPilotGate {
  const blockers: string[] = [];
  const normalizedNamespace = isBackgroundPrivateOverlapNamespace(namespace) ? namespace : null;
  const cleanTags = requestedTags.map((tag) => tag.trim()).filter(Boolean);

  if (!adminFeatureFlagEnabled) {
    blockers.push("admin_feature_flag_disabled");
  }

  if (environment === "production") {
    blockers.push("production_disabled_until_external_review");
  }

  if (!dpiaApproved) {
    blockers.push("dpia_required");
  }

  if (!cryptographicReviewApproved) {
    blockers.push("cryptographic_review_required");
  }

  if (!threatModelApproved) {
    blockers.push("threat_model_required");
  }

  if (!externalReviewApproved) {
    blockers.push("external_security_privacy_review_required");
  }

  if (!normalizedNamespace) {
    blockers.push("curated_namespace_required");
  }

  if (!cleanTags.length) {
    blockers.push("curated_tags_required");
  }

  if (cleanTags.some(hasUnsafePrivateOverlapTag)) {
    blockers.push("free_text_or_raw_private_tag_rejected");
  }

  return {
    blockers,
    curatedTagsOnly: true,
    liveEndpointEnabled: false,
    allowed: false,
    namespace: normalizedNamespace,
    rawInputsAccepted: false,
    stateMutation: false,
  };
}

export function getBackgroundPrivateOverlapContract(): BackgroundPrivateOverlapContract {
  return {
    blockedUntil: [
      "No live /api/background/private-overlap routes are enabled.",
      "No background_private_overlap_tags or background_private_overlap_checks tables are created.",
      "No raw or canonical tags are stored.",
      "No overlap result can change matching, disclosure, ranking, or outreach state.",
    ],
    contractTests: [
      "background_private_overlap_contract_validator",
      "background_private_overlap_no_live_endpoint_smoke",
      "background_private_overlap_route_contract_smoke",
    ],
    fallbackBehavior:
      "Use current deterministic broad-preview matching when the private-overlap service is unavailable, unreviewed, or disabled.",
    forbiddenInputs: [...FORBIDDEN_INPUTS],
    forbiddenStoredFields: [...FORBIDDEN_STORED_FIELDS],
    futureStoredFields: [
      "blinded_tag",
      "token_version",
      "tag_namespace",
      "expires_at",
      "audit_reason",
    ],
    liveEndpointEnabled: false,
    namespaceRules: [
      {
        allowedSource: "approved profile synthesis capability tags only",
        key: "capability_tags",
        label: "Capability tags",
        rawValueRetention: "forbidden",
        storedRepresentation: "blinded_token_only",
      },
      {
        allowedSource: "approved broad constraint flags only",
        key: "constraint_flags",
        label: "Constraint flags",
        rawValueRetention: "forbidden",
        storedRepresentation: "blinded_token_only",
      },
      {
        allowedSource: "approved verification-preference tags only",
        key: "verification_preferences",
        label: "Verification preferences",
        rawValueRetention: "forbidden",
        storedRepresentation: "blinded_token_only",
      },
      {
        allowedSource: "approved coarse availability tags only",
        key: "coarse_availability",
        label: "Coarse availability",
        rawValueRetention: "forbidden",
        storedRepresentation: "blinded_token_only",
      },
    ],
    participantOutput: {
      allowed: ["overlap_count_bucket", "factor_codes", "blockers"],
      forbidden: ["matching_tag_names", "non_overlap_tags", "raw_tokens", "counterparty_tag_set"],
    },
    plannedEndpoints: [
      {
        method: "POST",
        path: "/api/background/private-overlap/evaluate",
        status: "blocked_pending_crypto_review",
      },
      {
        method: "POST",
        path: "/api/background/private-overlap/refresh-tokens",
        status: "blocked_pending_crypto_review",
      },
      {
        method: "DELETE",
        path: "/api/background/private-overlap/tokens",
        status: "blocked_pending_crypto_review",
      },
    ],
    purpose:
      "Design-only guardrail for future narrow privacy-preserving overlap checks over curated tags, without shipping live overlap APIs or storage before cryptographic review.",
    releaseState: "design_review_only",
    requiredReviews: [...REQUIRED_REVIEWS],
    storageState: "not_created",
    version: BACKGROUND_PRIVATE_OVERLAP_CONTRACT_VERSION,
  };
}

export function validateBackgroundPrivateOverlapContract(
  contract: BackgroundPrivateOverlapContract = getBackgroundPrivateOverlapContract(),
): BackgroundPrivateOverlapValidation {
  const namespaceKeys = contract.namespaceRules.map((rule) => rule.key);
  const endpointEvidence = contract.plannedEndpoints
    .map((endpoint) => `${endpoint.method} ${endpoint.path}:${endpoint.status}`)
    .join(", ");
  const checks = [
    check(
      "design-only-release-state",
      "Private-overlap remains design-review-only and not live-ready",
      contract.releaseState === "design_review_only" &&
        contract.liveEndpointEnabled === false &&
        contract.storageState === "not_created",
      `${contract.releaseState}; live=${contract.liveEndpointEnabled}; storage=${contract.storageState}`,
    ),
    check(
      "review-gates",
      "DPIA, formal cryptographic review, threat model, external review, and property tests are required before pilot",
      REQUIRED_REVIEWS.every((review) => contract.requiredReviews.includes(review)),
      contract.requiredReviews.join(", "),
    ),
    check(
      "curated-tags-only",
      "Namespaces are curated tags only and exclude free text",
      namespaceKeys.length > 0 &&
        namespaceKeys.every((key) =>
          ["capability_tags", "constraint_flags", "verification_preferences", "coarse_availability"].includes(key),
        ) &&
        !namespaceKeys.some((key) => /free|text|wish|contact|location/i.test(key)),
      namespaceKeys.join(", "),
    ),
    check(
      "raw-values-forbidden",
      "Raw source text, raw tags, canonical tags, exact wishes, and non-overlap values are forbidden",
      ["free_text", "raw_source_text", "exact_wish"].every((value) =>
        contract.forbiddenInputs.includes(value),
      ) &&
        ["raw_tag", "canonical_tag", "raw_text", "non_overlap_value"].every((value) =>
          contract.forbiddenStoredFields.includes(value),
        ) &&
        contract.namespaceRules.every(
          (rule) =>
            rule.storedRepresentation === "blinded_token_only" &&
            rule.rawValueRetention === "forbidden",
      ),
      `${contract.forbiddenInputs.join(", ")} | ${contract.forbiddenStoredFields.join(", ")}`,
    ),
    check(
      "future-storage-is-blinded-only",
      "Future storage is limited to blinded token metadata and excludes raw or canonical tags",
      ["blinded_tag", "token_version", "tag_namespace", "expires_at"].every((value) =>
        contract.futureStoredFields.includes(value),
      ) &&
        !contract.futureStoredFields.some((value) =>
          /raw|canonical|free_text|exact|source_text|contact/i.test(value),
        ),
      contract.futureStoredFields.join(", "),
    ),
    check(
      "blocked-live-endpoints",
      "Planned live endpoints are blocked pending cryptographic review",
      contract.plannedEndpoints.length === 3 &&
        contract.plannedEndpoints.every(
          (endpoint) => endpoint.status === "blocked_pending_crypto_review",
        ) &&
        contract.plannedEndpoints.every((endpoint) =>
          endpoint.path.startsWith("/api/background/private-overlap/"),
        ),
      endpointEvidence,
    ),
    check(
      "counts-only-output",
      "Participant output is limited to counts, factor codes, and blockers",
      contract.participantOutput.allowed.includes("overlap_count_bucket") &&
        contract.participantOutput.allowed.includes("factor_codes") &&
        contract.participantOutput.forbidden.includes("matching_tag_names") &&
        contract.participantOutput.forbidden.includes("counterparty_tag_set"),
      `${contract.participantOutput.allowed.join(", ")} | forbidden ${contract.participantOutput.forbidden.join(", ")}`,
    ),
    check(
      "deterministic-fallback",
      "Unavailable or unreviewed overlap falls back to current deterministic broad-preview matching",
      /deterministic broad-preview matching/i.test(contract.fallbackBehavior),
      contract.fallbackBehavior,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    contractVersion: contract.version,
    liveReady: false,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-private-overlap-design",
    validatorVersion: BACKGROUND_PRIVATE_OVERLAP_VALIDATOR_VERSION,
  };
}
