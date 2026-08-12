"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROUTE = "/admin/evidence-calibration/audits";
const REVIEW_ROUTE = "/review/evidence-calibration";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FINAL_STATUSES = new Set(["eligible", "excluded", "review_required"]);
const EVIDENCE_FINALITIES = new Set([
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
  "administrative_correction",
]);
const SETTLEMENT_FINALITIES = new Set([
  "confirmed",
  "adjudicated_paid",
  "adjudicated_unpaid",
  "not_due",
  "unresolved_dispute",
  "permissible_cancellation",
  "late_payment_cure",
  "administrative_correction",
]);
const INTEGRITY_FINDINGS = new Set([
  "not_assessed",
  "supported_honest",
  "reckless_misleading",
  "deliberate_fabrication",
  "not_applicable",
]);
const RESPONSIVENESS_FINDINGS = new Set([
  "not_assessed",
  "on_time",
  "late_cure",
  "missed_deadline",
  "excused",
  "not_applicable",
]);
const DISPUTE_FINDINGS = new Set([
  "not_assessed",
  "cooperative",
  "obstructive",
  "retaliatory",
  "evidence_destruction",
  "abusive_appeal",
  "not_applicable",
]);

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withMessage(path: string, key: "error" | "message", message: string) {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  return `${target.pathname}${target.search}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function requiredUuid(formData: FormData, key: string, label: string) {
  const value = read(formData, key);
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function allowedValue(
  formData: FormData,
  key: string,
  values: Set<string>,
  label: string,
) {
  const value = read(formData, key);
  if (!values.has(value)) throw new Error(`Choose a permitted ${label}.`);
  return value;
}

function parseOutcome(formData: FormData, finalStatus: string, targetType: string) {
  if (finalStatus !== "eligible") return null;
  const value = Number(read(formData, "final_outcome"));
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Independent outcome must be between 0 and 1.");
  }
  if (targetType === "settlement_decision" && value !== 0 && value !== 1) {
    throw new Error("Independent settlement outcome must be 0 or 1.");
  }
  return value;
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

export async function materializeEvidenceCredibilityAuditDrawsAction() {
  await requireViewer(ADMIN_ROUTE);
  const supabase = await createClient();

  try {
    await rpcOrThrow(
      supabase,
      "materialize_evidence_credibility_calibration_draws_v1",
      {
        p_random_floor: 0.1,
        p_sampling_seed: randomBytes(32).toString("hex"),
        p_source_key: `admin-draw:${randomUUID()}`,
      },
    );
  } catch (error) {
    redirect(
      withMessage(
        ADMIN_ROUTE,
        "error",
        errorMessage(error, "Calibration draws could not be materialized."),
      ),
    );
  }

  revalidatePath(ADMIN_ROUTE);
  redirect(
    withMessage(
      ADMIN_ROUTE,
      "message",
      "Every newly eligible terminal decision received an immutable draw; selected cases are ready for independent assignment.",
    ),
  );
}

export async function reconcileEvidenceCredibilityAuditAssignmentsAction() {
  await requireViewer(ADMIN_ROUTE);
  const supabase = await createClient();

  try {
    const result = (await rpcOrThrow(
      supabase,
      "reconcile_evidence_credibility_calibration_assignments_v1",
      {},
    )) as Record<string, unknown> | null;
    const expiredCount = Number(result?.expiredCount ?? 0);
    const excludedCount = Number(result?.excludedCount ?? 0);

    revalidatePath(ADMIN_ROUTE);
    revalidatePath(REVIEW_ROUTE);
    redirect(
      withMessage(
        ADMIN_ROUTE,
        "message",
        `Assignment reconciliation recorded ${expiredCount} expired and ${excludedCount} superseded cases.`,
      ),
    );
  } catch (error) {
    redirect(
      withMessage(
        ADMIN_ROUTE,
        "error",
        errorMessage(error, "Calibration assignments could not be reconciled."),
      ),
    );
  }
}

export async function assignEvidenceCredibilityAuditAction(formData: FormData) {
  await requireViewer(ADMIN_ROUTE);
  const supabase = await createClient();

  try {
    await rpcOrThrow(
      supabase,
      "assign_evidence_credibility_calibration_audit_v1",
      {
        p_draw_id: requiredUuid(formData, "draw_id", "Draw identifier"),
        p_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        p_request_key: read(formData, "request_key") || randomUUID(),
        p_reviewer_id: requiredUuid(formData, "reviewer_id", "Reviewer identifier"),
      },
    );
  } catch (error) {
    redirect(
      withMessage(
        ADMIN_ROUTE,
        "error",
        errorMessage(error, "The independent calibration audit could not be assigned."),
      ),
    );
  }

  revalidatePath(ADMIN_ROUTE);
  revalidatePath(REVIEW_ROUTE);
  redirect(
    withMessage(
      ADMIN_ROUTE,
      "message",
      "Blind audit assigned to an independent reviewer. The underlying participant decision was not changed.",
    ),
  );
}

export async function recordEvidenceCredibilityAuditLabelAction(formData: FormData) {
  await requireViewer(REVIEW_ROUTE);
  const supabase = await createClient();

  try {
    const targetType = read(formData, "target_type");
    if (!["evidence_decision", "settlement_decision"].includes(targetType)) {
      throw new Error("Audit target type is invalid.");
    }
    const finalStatus = allowedValue(
      formData,
      "final_status",
      FINAL_STATUSES,
      "independent final status",
    );
    const finality = allowedValue(
      formData,
      "final_finality_reason",
      targetType === "evidence_decision"
        ? EVIDENCE_FINALITIES
        : SETTLEMENT_FINALITIES,
      "independent finality reason",
    );
    const rationale = read(formData, "private_rationale");
    if (!rationale) throw new Error("Add an independent private rationale.");

    await rpcOrThrow(
      supabase,
      "record_evidence_credibility_calibration_label_v1",
      {
        p_assignment_id: requiredUuid(
          formData,
          "assignment_id",
          "Assignment identifier",
        ),
        p_blinding_complete: read(formData, "blinding_complete") === "true",
        p_final_dispute_conduct_finding:
          targetType === "settlement_decision"
            ? "not_applicable"
            : allowedValue(
                formData,
                "final_dispute_conduct_finding",
                DISPUTE_FINDINGS,
                "dispute-conduct finding",
              ),
        p_final_finality_reason: finality,
        p_final_integrity_finding:
          targetType === "settlement_decision"
            ? "not_applicable"
            : allowedValue(
                formData,
                "final_integrity_finding",
                INTEGRITY_FINDINGS,
                "integrity finding",
              ),
        p_final_outcome: parseOutcome(formData, finalStatus, targetType),
        p_final_responsiveness_finding:
          targetType === "settlement_decision"
            ? "not_applicable"
            : allowedValue(
                formData,
                "final_responsiveness_finding",
                RESPONSIVENESS_FINDINGS,
                "responsiveness finding",
              ),
        p_final_status: finalStatus,
        p_private_rationale: rationale,
        p_request_key: read(formData, "request_key") || randomUUID(),
      },
    );
  } catch (error) {
    redirect(
      withMessage(
        REVIEW_ROUTE,
        "error",
        errorMessage(error, "The independent calibration label could not be recorded."),
      ),
    );
  }

  revalidatePath(REVIEW_ROUTE);
  revalidatePath(ADMIN_ROUTE);
  redirect(
    withMessage(
      REVIEW_ROUTE,
      "message",
      "Independent blind-review label recorded. It remains private and has no active credibility effect.",
    ),
  );
}
