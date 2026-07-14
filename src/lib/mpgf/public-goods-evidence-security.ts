import { createHash, createHmac } from "node:crypto";

export const MPGF_EVIDENCE_ACCESS_SCOPE = "owner_and_reviewer_only";
export const MPGF_EVIDENCE_SIGNED_URL_TTL_SECONDS = 15 * 60;

export type MpgfEvidenceMalwareScanStatus =
  | "metadata_scan_passed"
  | "manual_review_required"
  | "blocked_suspicious_file_type";

export interface MpgfNormalizedEvidenceSecurity {
  signedEvidenceUrl: string | null;
  signedUrlExpiresAt: string | null;
  accessScope: typeof MPGF_EVIDENCE_ACCESS_SCOPE;
  malwareScanStatus: MpgfEvidenceMalwareScanStatus;
  normalizedEvidenceJson: {
    accessScope: typeof MPGF_EVIDENCE_ACCESS_SCOPE;
    evidenceUrlHash: string | null;
    referenceHash: string;
    descriptionHash: string;
    sourceKind: "external_url" | "description_only";
    signedUrlTtlSeconds: number;
    storesRawReceiptUrl: false;
  };
}

const suspiciousEvidencePathPattern = /\.(app|bat|cmd|com|dmg|exe|jar|js|msi|pkg|ps1|scr|sh|vbs)(?:$|[?#])/i;
const archiveEvidencePathPattern = /\.(7z|gz|rar|tar|zip)(?:$|[?#])/i;

function evidenceSigningSecret() {
  return process.env.MPGF_EVIDENCE_SIGNING_SECRET ?? process.env.CRON_SECRET ?? "mpgf-evidence-dev-signing-key";
}

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function evidenceSignature(payload: string) {
  return createHmac("sha256", evidenceSigningSecret()).update(payload).digest("hex");
}

function signaturePayload(input: {
  evidenceHash: string;
  evidenceRef: string;
  expiresAt: string;
  scope: string;
}) {
  return [input.evidenceRef, input.evidenceHash, input.expiresAt, input.scope].join(":");
}

function parseExternalEvidenceUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Evidence URL must be a valid HTTPS URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Evidence URL must use HTTPS before it can be converted into a signed MPGF access link.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Evidence URL must not include embedded credentials.");
  }

  const pathAndSearch = `${parsed.pathname}${parsed.search}`;

  if (suspiciousEvidencePathPattern.test(pathAndSearch)) {
    throw new Error("Evidence URL points to a file type blocked by MPGF malware-scan policy.");
  }

  if (archiveEvidencePathPattern.test(pathAndSearch)) {
    throw new Error("Evidence archives must be uploaded through the scanned reviewer intake, not linked directly.");
  }

  return parsed;
}

function buildSignedEvidenceUrl(input: {
  evidenceHash: string;
  evidenceRef: string;
  expiresAt: string;
  siteUrl: string;
}) {
  const url = new URL(`/api/mpgf/evidence/${input.evidenceRef}`, input.siteUrl);
  const scope = MPGF_EVIDENCE_ACCESS_SCOPE;
  const signature = evidenceSignature(
    signaturePayload({
      evidenceHash: input.evidenceHash,
      evidenceRef: input.evidenceRef,
      expiresAt: input.expiresAt,
      scope,
    }),
  );

  url.searchParams.set("scope", scope);
  url.searchParams.set("expires", input.expiresAt);
  url.searchParams.set("evidenceHash", input.evidenceHash);
  url.searchParams.set("sig", signature);

  return url.toString();
}

export function normalizeMpgfManualEvidenceSecurity(input: {
  evidenceDescription: string;
  evidenceUrl?: string | null;
  externalPaymentReference: string;
  now?: Date;
  siteUrl: string;
}): MpgfNormalizedEvidenceSecurity {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + MPGF_EVIDENCE_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const descriptionHash = stableHash(input.evidenceDescription.trim());
  const referenceHash = stableHash(input.externalPaymentReference.trim());
  const trimmedEvidenceUrl = input.evidenceUrl?.trim();

  if (!trimmedEvidenceUrl) {
    return {
      signedEvidenceUrl: null,
      signedUrlExpiresAt: null,
      accessScope: MPGF_EVIDENCE_ACCESS_SCOPE,
      malwareScanStatus: "manual_review_required",
      normalizedEvidenceJson: {
        accessScope: MPGF_EVIDENCE_ACCESS_SCOPE,
        evidenceUrlHash: null,
        referenceHash,
        descriptionHash,
        sourceKind: "description_only",
        signedUrlTtlSeconds: MPGF_EVIDENCE_SIGNED_URL_TTL_SECONDS,
        storesRawReceiptUrl: false,
      },
    };
  }

  const parsed = parseExternalEvidenceUrl(trimmedEvidenceUrl);
  const evidenceHash = stableHash(parsed.toString());
  const evidenceRef = `manual-${evidenceHash.slice(0, 20)}`;
  const signedEvidenceUrl = buildSignedEvidenceUrl({
    evidenceHash,
    evidenceRef,
    expiresAt,
    siteUrl: input.siteUrl,
  });

  return {
    signedEvidenceUrl,
    signedUrlExpiresAt: expiresAt,
    accessScope: MPGF_EVIDENCE_ACCESS_SCOPE,
    malwareScanStatus: "metadata_scan_passed",
    normalizedEvidenceJson: {
      accessScope: MPGF_EVIDENCE_ACCESS_SCOPE,
      evidenceUrlHash: evidenceHash,
      referenceHash,
      descriptionHash,
      sourceKind: "external_url",
      signedUrlTtlSeconds: MPGF_EVIDENCE_SIGNED_URL_TTL_SECONDS,
      storesRawReceiptUrl: false,
    },
  };
}

export function verifyMpgfEvidenceAccessSignature(input: {
  evidenceHash: string | null;
  evidenceRef: string;
  expiresAt: string | null;
  scope: string | null;
  signature: string | null;
  now?: Date;
}) {
  if (
    !input.evidenceHash ||
    !input.expiresAt ||
    !input.signature ||
    input.scope !== MPGF_EVIDENCE_ACCESS_SCOPE
  ) {
    return {
      ok: false,
      status: "invalid" as const,
      message: "MPGF evidence access URL is missing required signed parameters.",
    };
  }

  const expiresAtMs = Date.parse(input.expiresAt);

  if (!Number.isFinite(expiresAtMs)) {
    return {
      ok: false,
      status: "invalid" as const,
      message: "MPGF evidence access URL has an invalid expiry.",
    };
  }

  if ((input.now ?? new Date()).getTime() > expiresAtMs) {
    return {
      ok: false,
      status: "expired" as const,
      message: "MPGF evidence access URL has expired.",
    };
  }

  const expected = evidenceSignature(
    signaturePayload({
      evidenceHash: input.evidenceHash,
      evidenceRef: input.evidenceRef,
      expiresAt: input.expiresAt,
      scope: input.scope,
    }),
  );

  if (input.signature !== expected) {
    return {
      ok: false,
      status: "invalid" as const,
      message: "MPGF evidence access signature did not verify.",
    };
  }

  return {
    ok: true,
    status: "verified" as const,
    message: "MPGF evidence access URL verified.",
    expiresAt: input.expiresAt,
    scope: input.scope,
  };
}
