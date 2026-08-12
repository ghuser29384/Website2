"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

const RETURN_TO = "/admin/evidence-credibility-shadow";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONFIDENCE_BANDS = new Set([0, 25, 50, 75, 100]);
const PROVENANCE_CLASSES = new Set([
  "platform_observed",
  "authenticated_provider",
  "independent_third_party",
  "bilateral_confirmation",
  "self_report",
]);
const PROVIDER_AUTHENTICATION_STATES = new Set([
  "not_applicable",
  "authenticated",
  "unverified",
  "failed",
  "manual_review_required",
]);
const CONTRADICTION_STATES = new Set([
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
  "permissible_cancellation",
  "late_payment_cure",
]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requiredUuid(formData: FormData, key: string, label: string) {
  const value = read(formData, key);
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} is unavailable.`);
  }
  return value;
}

function optionalUuid(formData: FormData, key: string) {
  const value = read(formData, key);
  if (!value) return null;
  if (!UUID_PATTERN.test(value)) {
    throw new Error("A private source identifier is malformed.");
  }
  return value;
}

function choice(formData: FormData, key: string, allowed: Set<string>, label: string) {
  const value = read(formData, key);
  if (!allowed.has(value)) {
    throw new Error(`Choose a supported ${label}.`);
  }
  return value;
}

function confidenceBand(formData: FormData) {
  const value = Number(read(formData, "decision_confidence_band"));
  if (!CONFIDENCE_BANDS.has(value)) {
    throw new Error("Choose one of the five fixed decision-confidence bands.");
  }
  return value;
}

function boundedText(
  formData: FormData,
  key: string,
  label: string,
  maximumLength: number,
  required = false,
) {
  const value = read(formData, key);
  if ((required && !value) || value.length > maximumLength) {
    throw new Error(
      required
        ? `${label} is required and must be ${maximumLength} characters or fewer.`
        : `${label} must be ${maximumLength} characters or fewer.`,
    );
  }
  return value;
}

function validateProviderFields(
  provenance: string,
  providerAuthenticationStatus: string,
  providerAuthenticationRef: string,
) {
  if (provenance === "authenticated_provider") {
    if (providerAuthenticationStatus !== "authenticated" || !providerAuthenticationRef) {
      throw new Error(
        "Authenticated-provider provenance requires an authenticated status and private provider reference.",
      );
    }
    return;
  }
  if (providerAuthenticationStatus === "authenticated") {
    throw new Error(
      "Authenticated provider status can be used only with authenticated-provider provenance.",
    );
  }
}

function withMessage(key: "error" | "message", message: string) {
  const target = new URL(RETURN_TO, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  return `${target.pathname}${target.search}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function rpcOrThrow(
  functionName: string,
  args: Record<string, unknown>,
) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc(functionName, args);
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

export async function recordEvidenceCredibilityShadowAction(formData: FormData) {
  await requireViewer(RETURN_TO);

  try {
    const confidence = confidenceBand(formData);
    const provenance = choice(
      formData,
      "primary_provenance_class",
      PROVENANCE_CLASSES,
      "provenance class",
    );
    const providerStatus = choice(
      formData,
      "provider_authentication_status",
      PROVIDER_AUTHENTICATION_STATES,
      "provider-authentication state",
    );
    const providerRef = boundedText(
      formData,
      "provider_authentication_ref",
      "Provider reference",
      500,
    );
    validateProviderFields(provenance, providerStatus, providerRef);

    const finalityReason = choice(
      formData,
      "finality_reason",
      EVIDENCE_FINALITY_REASONS,
      "evidence finality reason",
    );
    const exclusionReason = boundedText(
      formData,
      "exclusion_reason",
      "Private exclusion reason",
      1000,
    );
    if (
      (["permissible_exit", "force_majeure", "mutual_cancellation", "unresolved_dispute"].includes(
        finalityReason,
      ) || confidence === 0) &&
      !exclusionReason
    ) {
      throw new Error("Excluded and review-required decisions need a private reason.");
    }

    const data = await rpcOrThrow(
      "record_credibility_shadow_evidence_collection_v1",
      {
        p_milestone_id: requiredUuid(formData, "milestone_id", "Milestone"),
        p_review_id: optionalUuid(formData, "source_review_id"),
        p_decision_confidence_band: confidence,
        p_primary_provenance_class: provenance,
        p_provider_authentication_status: providerStatus,
        p_provider_authentication_ref: providerRef,
        p_contradiction_status: choice(
          formData,
          "contradiction_status",
          CONTRADICTION_STATES,
          "contradiction state",
        ),
        p_integrity_finding: choice(
          formData,
          "integrity_finding",
          INTEGRITY_FINDINGS,
          "integrity finding",
        ),
        p_responsiveness_finding: choice(
          formData,
          "responsiveness_finding",
          RESPONSIVENESS_FINDINGS,
          "responsiveness finding",
        ),
        p_dispute_conduct_finding: choice(
          formData,
          "dispute_conduct_finding",
          DISPUTE_FINDINGS,
          "dispute-conduct finding",
        ),
        p_finality_reason: finalityReason,
        p_exclusion_reason: exclusionReason,
        p_supersedes_decision_id: optionalUuid(formData, "current_decision_id"),
        p_private_rationale: boundedText(
          formData,
          "private_rationale",
          "Private operator rationale",
          4000,
          true,
        ),
      },
    );

    revalidatePath(RETURN_TO);
    redirect(
      withMessage(
        "message",
        data?.status === "replayed"
          ? "The identical private evidence judgment was already recorded."
          : "Private evidence judgment recorded in the shadow ledger.",
      ),
    );
  } catch (error) {
    redirect(
      withMessage(
        "error",
        errorMessage(error, "The private evidence judgment could not be recorded."),
      ),
    );
  }
}

export async function recordSettlementCredibilityShadowAction(formData: FormData) {
  await requireViewer(RETURN_TO);

  try {
    const confidence = confidenceBand(formData);
    const provenance = choice(
      formData,
      "primary_provenance_class",
      PROVENANCE_CLASSES,
      "provenance class",
    );
    const providerStatus = choice(
      formData,
      "provider_authentication_status",
      PROVIDER_AUTHENTICATION_STATES,
      "provider-authentication state",
    );
    const providerRef = boundedText(
      formData,
      "provider_authentication_ref",
      "Provider reference",
      500,
    );
    validateProviderFields(provenance, providerStatus, providerRef);

    const finalityReason = choice(
      formData,
      "finality_reason",
      SETTLEMENT_FINALITY_REASONS,
      "settlement finality reason",
    );
    const exclusionReason = boundedText(
      formData,
      "exclusion_reason",
      "Private exclusion reason",
      1000,
    );
    if ((["not_due", "permissible_cancellation"].includes(finalityReason) || confidence === 0) && !exclusionReason) {
      throw new Error("Excluded and review-required settlement decisions need a private reason.");
    }

    const data = await rpcOrThrow(
      "record_credibility_shadow_settlement_collection_v1",
      {
        p_payout_id: requiredUuid(formData, "payout_id", "Payout"),
        p_payment_review_decision_id: optionalUuid(
          formData,
          "source_payment_review_decision_id",
        ),
        p_decision_confidence_band: confidence,
        p_primary_provenance_class: provenance,
        p_provider_authentication_status: providerStatus,
        p_provider_authentication_ref: providerRef,
        p_finality_reason: finalityReason,
        p_exclusion_reason: exclusionReason,
        p_supersedes_decision_id: optionalUuid(formData, "current_decision_id"),
        p_private_rationale: boundedText(
          formData,
          "private_rationale",
          "Private operator rationale",
          4000,
          true,
        ),
      },
    );

    revalidatePath(RETURN_TO);
    redirect(
      withMessage(
        "message",
        data?.status === "replayed"
          ? "The identical private settlement judgment was already recorded."
          : "Private settlement judgment recorded in the shadow ledger.",
      ),
    );
  } catch (error) {
    redirect(
      withMessage(
        "error",
        errorMessage(error, "The private settlement judgment could not be recorded."),
      ),
    );
  }
}
