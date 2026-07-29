export const COLLECTIVE_PROPOSITION_TYPES = [
  "public_letter",
  "workplace_organizing",
  "whistleblowing",
  "political_dissent",
  "funding_pledge",
  "other_collective_action",
] as const;

export type CollectivePropositionType = (typeof COLLECTIVE_PROPOSITION_TYPES)[number];

export const COLLECTIVE_RISK_DIMENSIONS = [
  "financial",
  "reputational",
  "employment",
  "political",
  "legal",
] as const;

export type CollectiveRiskDimension = (typeof COLLECTIVE_RISK_DIMENSIONS)[number];

export const COLLECTIVE_PROPOSITION_TYPE_META: Record<
  CollectivePropositionType,
  {
    label: string;
    description: string;
    highRisk: boolean;
    defaultRiskDimensions: readonly CollectiveRiskDimension[];
  }
> = {
  public_letter: {
    label: "Open or closed letter",
    description: "A verified group publicly associates its names with one frozen statement or request.",
    highRisk: true,
    defaultRiskDimensions: ["reputational", "political"],
  },
  workplace_organizing: {
    label: "Workplace organizing or unionization intention",
    description: "Workers privately commit to a collective workplace action that reveals only at the threshold.",
    highRisk: true,
    defaultRiskDimensions: ["employment", "legal", "reputational"],
  },
  whistleblowing: {
    label: "Coordinated whistleblowing",
    description: "Eligible people commit to a bounded disclosure or reporting proposition.",
    highRisk: true,
    defaultRiskDimensions: ["employment", "legal", "reputational"],
  },
  political_dissent: {
    label: "Political-party dissent or defection",
    description: "Eligible participants privately commit to a frozen political declaration or departure condition.",
    highRisk: true,
    defaultRiskDimensions: ["political", "reputational", "legal"],
  },
  funding_pledge: {
    label: "High-net-worth or institutional funding pledge",
    description: "Verified funders condition a public pledge on enough other qualified funders joining.",
    highRisk: true,
    defaultRiskDimensions: ["financial", "reputational"],
  },
  other_collective_action: {
    label: "Other identity-threshold commitment",
    description: "A different proposition where identity association is itself the coordinated act.",
    highRisk: false,
    defaultRiskDimensions: [],
  },
};

export type CollectiveCommitmentStatus = "open" | "activating" | "active" | "expired";
export type CollectiveIdentityCredentialStatus =
  | "pending"
  | "verified"
  | "stale"
  | "revoked"
  | "rejected";

export interface CollectiveIdentityCredential {
  id: string;
  profileId: string;
  credentialVersion: number;
  status: CollectiveIdentityCredentialStatus;
  verifiedRealName: string;
  verifiedAffiliation: string;
  provider: string;
  verificationMethod: string;
  assuranceTier: string;
  duplicateCheckResult: "clear" | "potential_duplicate" | "confirmed_duplicate" | "not_run";
  manualReviewStatus: "approved" | "pending" | "rejected";
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectiveCommitmentSummary {
  id: string;
  creatorId: string;
  creatorDisplayName: string;
  title: string;
  propositionType: CollectivePropositionType;
  propositionText: string;
  requirementsText: string;
  eligibilityRule: string;
  thresholdCount: number;
  qualifyingSignerCount: number;
  deadlineAt: string;
  riskClass: "standard" | "high";
  riskDimensions: CollectiveRiskDimension[];
  status: CollectiveCommitmentStatus;
  termsHash: string;
  createdAt: string;
  activatedAt: string | null;
  expiredAt: string | null;
}

export interface CollectivePublicSigner {
  id: string;
  commitmentId: string;
  ordinal: number;
  verifiedRealName: string;
  verifiedAffiliation: string | null;
  signedAt: string;
  revealedAt: string;
  identityCommitment: string;
}

export interface CollectiveCommitmentReceipt {
  id: string;
  commitmentId: string;
  outcome: "active" | "expired";
  termsHash: string;
  signerManifestHash: string | null;
  signerCount: number;
  receiptHash: string;
  createdAt: string;
}

export interface CollectiveCommitmentDetail extends CollectiveCommitmentSummary {
  publicSigners: CollectivePublicSigner[];
  receipt: CollectiveCommitmentReceipt | null;
  viewerHasSigned: boolean;
  viewerCanSign: boolean;
}

export interface FrozenCollectiveCommitmentTerms {
  title: string;
  propositionType: CollectivePropositionType;
  propositionText: string;
  requirementsText: string;
  eligibilityRule: string;
  thresholdCount: number;
  deadlineAt: string;
  riskClass: "standard" | "high";
  riskDimensions: CollectiveRiskDimension[];
}

export function isCollectivePropositionType(value: string): value is CollectivePropositionType {
  return (COLLECTIVE_PROPOSITION_TYPES as readonly string[]).includes(value);
}

export function normalizeRiskDimensions(values: readonly string[]): CollectiveRiskDimension[] {
  const allowed = new Set<string>(COLLECTIVE_RISK_DIMENSIONS);
  return [...new Set(values.filter((value): value is CollectiveRiskDimension => allowed.has(value)))].sort();
}

export function getCollectiveRiskProfile(
  propositionType: CollectivePropositionType,
  selectedDimensions: readonly string[],
): { riskClass: "standard" | "high"; riskDimensions: CollectiveRiskDimension[] } {
  const meta = COLLECTIVE_PROPOSITION_TYPE_META[propositionType];
  const riskDimensions = normalizeRiskDimensions([
    ...meta.defaultRiskDimensions,
    ...selectedDimensions,
  ]);

  return {
    riskClass: meta.highRisk || riskDimensions.length > 0 ? "high" : "standard",
    riskDimensions,
  };
}

export function canonicalizeFrozenTerms(terms: FrozenCollectiveCommitmentTerms): string {
  return JSON.stringify({
    deadlineAt: new Date(terms.deadlineAt).toISOString(),
    eligibilityRule: terms.eligibilityRule.trim(),
    propositionText: terms.propositionText.trim(),
    propositionType: terms.propositionType,
    requirementsText: terms.requirementsText.trim(),
    riskClass: terms.riskClass,
    riskDimensions: [...terms.riskDimensions].sort(),
    thresholdCount: terms.thresholdCount,
    title: terms.title.trim(),
  });
}
