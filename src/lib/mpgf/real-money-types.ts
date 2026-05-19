export interface MpgfRealMoneyReadiness {
  ready: boolean;
  mode: "blocked" | "test_payment" | "real_money";
  blockers: string[];
  requiredGates: Array<{
    gateKey: string;
    status: "blocked" | "pending_review" | "passed" | "failed" | "not_found";
  }>;
}

export interface MpgfRealMoneyCheckoutResult {
  ok: boolean;
  message: string;
  checkoutUrl?: string;
  readiness?: MpgfRealMoneyReadiness;
}

export interface MpgfManualEvidenceReadiness {
  ready: boolean;
  mode: "blocked" | "manual_evidence_only";
  providerLabel: string;
  externalPaymentUrl?: string;
  blockers: string[];
  requiredGates: Array<{
    gateKey: string;
    status: "blocked" | "pending_review" | "passed" | "failed" | "not_found";
  }>;
}

export type MpgfManualEvidenceProvider =
  | "open_collective"
  | "fiscal_host"
  | "bank_transfer"
  | "paypal"
  | "other";

export interface MpgfManualExternalPaymentEvidenceRecord {
  id: string;
  amountCents: number;
  currency: string;
  provider: MpgfManualEvidenceProvider;
  externalPaymentReference: string;
  evidenceUrl?: string | null;
  evidenceDescription: string;
  paidAt?: string | null;
  status: "submitted" | "under_review" | "verified" | "rejected" | "converted_to_contribution";
  createdAt?: string | null;
  reviewedAt?: string | null;
}

export interface MpgfManualEvidenceActionResult {
  ok: boolean;
  message: string;
  evidence?: MpgfManualExternalPaymentEvidenceRecord;
  readiness?: MpgfManualEvidenceReadiness;
}

export interface MpgfRealMoneyContributionRecord {
  id: string;
  paymentIntentId?: string | null;
  amountCents: number;
  currency: string;
  contributionMode: "test_payment" | "real_money" | "manual_external";
  status:
    | "pending"
    | "recorded"
    | "late_assigned_next_cycle"
    | "refunded"
    | "chargeback_disputed"
    | "chargeback_lost"
    | "voided";
  receivedAt?: string | null;
  budgetEffectiveAt?: string | null;
}

export interface MpgfRealMoneyRefundRecord {
  id: string;
  contributionId?: string | null;
  paymentIntentId?: string | null;
  amountCents: number;
  currency: string;
  status: "requested" | "approved" | "submitted_to_provider" | "succeeded" | "failed" | "cancelled";
  requestedAt?: string | null;
  processedAt?: string | null;
}

export interface MpgfRealMoneyAccountState {
  contributions: MpgfRealMoneyContributionRecord[];
  manualEvidence: MpgfManualExternalPaymentEvidenceRecord[];
  refunds: MpgfRealMoneyRefundRecord[];
  billingPortalAvailable: boolean;
  warnings: string[];
}
