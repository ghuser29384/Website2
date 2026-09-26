"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

const CAPTURE_ROUTE = "/admin/evidence-calibration";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONFIDENCE_BANDS = new Set(["0", "25", "50", "75", "100"]);
const PROVENANCE_CLASSES = new Set([
  "platform_observed",
  "authenticated_provider",
  "independent_third_party",
  "bilateral_confirmation",
  "self_report",
]);
const PROVIDER_AUTHENTICATION_STATUSES = new Set([
  "not_applicable",
  "authenticated",
  "unverified",
  "failed",
  "manual_review_required",
]);
const CONTRADICTION_STATUSES = new Set([
  "not_assessed",
  "none",
  "innocent",
  "materially_reckless",
  "deliberate",
]);
const INTEGRITY_FINDINGS = new Set([
  "not_assessed",
  "supported_honest",
  "reckless_misleading",
  "deliberate_fabrication",
]);
const RESPONSIVENESS_FINDINGS = new Set([
  "not_assessed",
  "on_time",
  "late_cure",
  "missed_deadline",
  "excused",
]);
const DISPUTE_FINDINGS = new Set([
  "not_assessed",
  "cooperative",
  "obstructive",
  "retaliatory",
  "evidence_destruction",
  "abusive_appeal",
]);
const EVIDENCE_FINALITY_REASONS = new Set([
  "review_final",
  "replacement_success",
  "terminal_rejection",
  "replacement_expired",
  "appeal_affirmed",
  "appeal_overturned",
  "permissible_exit",
  "force_majeure",
  "mutual_cancellation",
  "unjustified_abandonment",
  "unresolved_dispute",
  "late_cure",
]);
const SETTLEMENT_FINALITY_REASONS = new Set([
  "confirmed",
  "adjudicated_paid",
  "adjudicated_unpaid",
  "not_due",
  "unresolved_dispute",
  "permissible_cancellation",
  "late_payment_cure",
  "administrative_correction",
]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeReturnTo(formData: FormData) {
  const candidate = read(formData, "return_to");
  return candidate.startsWith(CAPTURE_ROUTE) &&
    !candidate.startsWith("//") &&
    !candidate.includes("\n")
    ? candidate
    : CAPTURE_ROUTE;
}

function withMessage(path: string, key: "error" | "message", message: string) {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  return `${target.pathname}${target.search}${target.hash}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function requiredUuid(formData: FormData, key: string, label: string) {
  const value = read(formData, key);
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function optionalUuid(formData: FormData, key: string, label: string) {
  const value = read(formData, key);
  if (!value) return null;
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function allowedValue(
  formData: FormData,
  key: string,
  allowed: Set<string>,
  label: string,
) {
  const value = read(formData, key);
  if (!allowed.has(value)) {
    throw new Error(`Choose a permitted ${label}.`);
  }
  return value;
}

function confidenceBand(formData: FormData) {
  const value = allowedValue(
    formData,
    "decision_confidence_band",
    CONFIDENCE_BANDS,
    "decision-confidence band",
  );
  return Number(value);
}

function validateProviderFields(
  provenance: string,
  providerStatus: string,
  providerReference: string,
) {
  if (provenance === "authenticated_provider") {
    if (providerStatus !== "authenticated" || !providerReference) {
      throw new Error(
        "Authenticated-provider provenance requires an authenticated provider status and private reference.",
      );
    }
  } else if (providerStatus === "authenticated") {
    throw new Error(
      "Authenticated provider status is valid only for authenticated-provider provenance.",
    );
  }
}

function requirePrivateReason(
  confidence: number,
  finalityReason: string,
  exclusionReason: string,
  excludedFinalities: Set<string>,
) {
  const requiresReason =
    confidence === 0 ||
    finalityReason === "unresolved_dispute" ||
    excludedFinalities.has(finalityReason);
  if (requiresReason && !exclusionReason) {
    throw new Error(
      "Add a private reason for an excluded or review-required decision.",
    );
  }
}

async function rpcOrThrow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  functionName: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await (supabase as any).rpc(functionName, args);
  if (error) throw new Error(error.message);
  return data;
}

export async function recordEvidenceCredibilityCaptureAction(
  formData: FormData,
) {
  const returnTo = safeReturnTo(formData);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const confidence = confidenceBand(formData);
    const provenance = allowedValue(
      formData,
      "primary_provenance_class",
      PROVENANCE_CLASSES,
      "provenance class",
    );
    const providerStatus = allowedValue(
      formData,
      "provider_authentication_status",
      PROVIDER_AUTHENTICATION_STATUSES,
      "provider-authentication status",
    );
    const providerReference = read(formData, "provider_authentication_ref");
    const finalityReason = allowedValue(
      formData,
      "finality_reason",
      EVIDENCE_FINALITY_REASONS,
      "evidence finality",
    );
    const exclusionReason = read(formData, "exclusion_reason");
    const privateRationale = read(formData, "private_rationale");

    if (!privateRationale) {
      throw new Error("Add the private rationale used for this capture.");
    }
    validateProviderFields(provenance, providerStatus, providerReference);
    requirePrivateReason(
      confidence,
      finalityReason,
      exclusionReason,
      new Set(["permissible_exit", "force_majeure", "mutual_cancellation"]),
    );

    await rpcOrThrow(supabase, "record_trade_evidence_shadow_capture_v1", {
      p_contradiction_status: allowedValue(
        formData,
        "contradiction_status",
        CONTRADICTION_STATUSES,
        "contradiction status",
      ),
      p_decision_confidence_band: confidence,
      p_dispute_conduct_finding: allowedValue(
        formData,
        "dispute_conduct_finding",
        DISPUTE_FINDINGS,
        "dispute-conduct finding",
      ),
      p_exclusion_reason: exclusionReason,
      p_finality_reason: finalityReason,
      p_integrity_finding: allowedValue(
        formData,
        "integrity_finding",
        INTEGRITY_FINDINGS,
        "integrity finding",
      ),
      p_milestone_id: requiredUuid(
        formData,
        "milestone_id",
        "Milestone identifier",
      ),
      p_primary_provenance_class: provenance,
      p_private_rationale: privateRationale,
      p_provider_authentication_ref: providerReference,
      p_provider_authentication_status: providerStatus,
      p_responsiveness_finding: allowedValue(
        formData,
        "responsiveness_finding",
        RESPONSIVENESS_FINDINGS,
        "responsiveness finding",
      ),
      p_review_id: optionalUuid(formData, "review_id", "Review identifier"),
      p_supersedes_decision_id: optionalUuid(
        formData,
        "supersedes_decision_id",
        "Superseded decision identifier",
      ),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(error, "The private evidence capture could not be recorded."),
      ),
    );
  }

  revalidatePath(CAPTURE_ROUTE);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Private shadow evidence decision recorded. Public credibility and all activation switches remain unchanged.",
    ),
  );
}

export async function recordSettlementCredibilityCaptureAction(
  formData: FormData,
) {
  const returnTo = safeReturnTo(formData);
  await requireViewer(returnTo);
  const supabase = await createClient();

  try {
    const confidence = confidenceBand(formData);
    const provenance = allowedValue(
      formData,
      "primary_provenance_class",
      PROVENANCE_CLASSES,
      "provenance class",
    );
    const providerStatus = allowedValue(
      formData,
      "provider_authentication_status",
      PROVIDER_AUTHENTICATION_STATUSES,
      "provider-authentication status",
    );
    const providerReference = read(formData, "provider_authentication_ref");
    const finalityReason = allowedValue(
      formData,
      "finality_reason",
      SETTLEMENT_FINALITY_REASONS,
      "settlement finality",
    );
    const exclusionReason = read(formData, "exclusion_reason");
    const privateRationale = read(formData, "private_rationale");

    if (!privateRationale) {
      throw new Error("Add the private rationale used for this capture.");
    }
    validateProviderFields(provenance, providerStatus, providerReference);
    requirePrivateReason(
      confidence,
      finalityReason,
      exclusionReason,
      new Set(["not_due", "permissible_cancellation"]),
    );

    await rpcOrThrow(supabase, "record_trade_settlement_shadow_capture_v1", {
      p_decision_confidence_band: confidence,
      p_exclusion_reason: exclusionReason,
      p_finality_reason: finalityReason,
      p_payment_review_decision_id: optionalUuid(
        formData,
        "payment_review_decision_id",
        "Payment-review decision identifier",
      ),
      p_payout_id: requiredUuid(formData, "payout_id", "Payout identifier"),
      p_primary_provenance_class: provenance,
      p_private_rationale: privateRationale,
      p_provider_authentication_ref: providerReference,
      p_provider_authentication_status: providerStatus,
      p_supersedes_decision_id: optionalUuid(
        formData,
        "supersedes_decision_id",
        "Superseded decision identifier",
      ),
    });
  } catch (error) {
    redirect(
      withMessage(
        returnTo,
        "error",
        errorMessage(
          error,
          "The private settlement capture could not be recorded.",
        ),
      ),
    );
  }

  revalidatePath(CAPTURE_ROUTE);
  redirect(
    withMessage(
      returnTo,
      "message",
      "Private shadow settlement decision recorded. No payment movement or active credibility effect occurred.",
    ),
  );
}
