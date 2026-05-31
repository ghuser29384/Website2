import { formatDisclosureFieldLabel } from "@/lib/background-disclosure";

export const BACKGROUND_LOCAL_TRANSPARENCY_RECEIPT_VERSION =
  "background-local-transparency-v1";

export type BackgroundLocalTransparencyReceiptKind = "match_explanation" | "consent_grant";

export interface BackgroundLocalTransparencyMatchSnapshotInput {
  confidenceBand: string;
  createdAt: string;
  explanationVersion: string;
  factorCodes: string[];
  id: string;
  matchId: string;
  scoreBucket: string;
  workflowStage: string;
}

export interface BackgroundLocalTransparencyGrantInput {
  accessLevel: string;
  audienceStage: string;
  expiresAt: string | null;
  fieldKey: string;
  id: string;
  matchId: string | null;
  status: string;
  updatedAt: string;
}

export interface BackgroundLocalTransparencyReceipt {
  accessLevel?: string;
  audienceStage?: string;
  confidenceBand?: string;
  expiresAt?: string | null;
  factorCodes?: string[];
  fieldKey?: string;
  fieldLabel?: string;
  key: string;
  kind: BackgroundLocalTransparencyReceiptKind;
  matchId?: string | null;
  receiptVersion: typeof BACKGROUND_LOCAL_TRANSPARENCY_RECEIPT_VERSION;
  recordId: string;
  recordedAt: string;
  scoreBucket?: string;
  status?: string;
  workflowStage?: string;
}

function cleanIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120) || "unknown";
}

function uniqueCompactCodes(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
}

export function getBackgroundLocalTransparencyReceiptKey({
  kind,
  recordId,
}: {
  kind: BackgroundLocalTransparencyReceiptKind;
  recordId: string;
}) {
  return `${kind}:${cleanIdentifier(recordId)}`;
}

export function buildLocalMatchExplanationReceipt(
  snapshot: BackgroundLocalTransparencyMatchSnapshotInput,
): BackgroundLocalTransparencyReceipt {
  return {
    confidenceBand: snapshot.confidenceBand,
    factorCodes: uniqueCompactCodes(snapshot.factorCodes),
    key: getBackgroundLocalTransparencyReceiptKey({
      kind: "match_explanation",
      recordId: snapshot.id,
    }),
    kind: "match_explanation",
    matchId: snapshot.matchId,
    receiptVersion: BACKGROUND_LOCAL_TRANSPARENCY_RECEIPT_VERSION,
    recordId: snapshot.id,
    recordedAt: snapshot.createdAt,
    scoreBucket: snapshot.scoreBucket,
    status: snapshot.explanationVersion,
    workflowStage: snapshot.workflowStage,
  };
}

export function buildLocalConsentGrantReceipt(
  grant: BackgroundLocalTransparencyGrantInput,
): BackgroundLocalTransparencyReceipt {
  return {
    accessLevel: grant.accessLevel,
    audienceStage: grant.audienceStage,
    expiresAt: grant.expiresAt,
    fieldKey: grant.fieldKey,
    fieldLabel: formatDisclosureFieldLabel(grant.fieldKey),
    key: getBackgroundLocalTransparencyReceiptKey({
      kind: "consent_grant",
      recordId: grant.id,
    }),
    kind: "consent_grant",
    matchId: grant.matchId,
    receiptVersion: BACKGROUND_LOCAL_TRANSPARENCY_RECEIPT_VERSION,
    recordId: grant.id,
    recordedAt: grant.updatedAt,
    status: grant.status,
  };
}

export function summarizeLocalTransparencyReceipts(
  receipts: BackgroundLocalTransparencyReceipt[],
) {
  return receipts.reduce(
    (summary, receipt) => {
      if (receipt.kind === "match_explanation") {
        summary.matchExplanations += 1;
      }

      if (receipt.kind === "consent_grant") {
        summary.consentGrants += 1;
      }

      if (receipt.status === "revoked") {
        summary.revokedConsentReceipts += 1;
      }

      return summary;
    },
    {
      consentGrants: 0,
      matchExplanations: 0,
      revokedConsentReceipts: 0,
    },
  );
}
