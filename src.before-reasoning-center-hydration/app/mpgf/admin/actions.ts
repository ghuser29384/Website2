"use server";

import { revalidatePath } from "next/cache";

import { isAdminEmail } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { runAndPersistMpgfProductionHealthCheck } from "@/lib/mpgf/production-verification";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

const approvableGateKeys = new Set([
  "legal_terms_approved",
  "stripe_live_keys_configured",
  "stripe_webhook_configured",
  "refund_policy_approved",
  "recipient_compliance_policy_approved",
  "payout_profile_approved",
  "manual_external_payment_evidence_policy_approved",
  "external_payment_destination_approved",
]);

const approvableAdminActions = new Set([
  "mpgf.payout_authorization.approve",
  "mpgf.real_money.enable",
  "mpgf.production_enablement.approve",
]);

async function requireMpgfAdmin() {
  const viewer = await getViewer();

  if (!viewer || !isAdminEmail(viewer.authUser.email)) {
    throw new Error("MPGF admin approval requires an authenticated admin session.");
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("MPGF admin approval requires Supabase service-role configuration.");
  }

  return viewer;
}

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Missing ${key}.`);
  }

  return value;
}

async function recordAdminAuditLog(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  auditJson: Record<string, unknown>;
}) {
  const supabase = createServiceClient() as SupabaseServiceAny;
  await supabase.from("mpgf_admin_audit_logs").insert({
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    actor_user_id: input.actorUserId,
    audit_json: input.auditJson,
  });
}

export async function approveMpgfRealMoneyGateAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const gateKey = readRequired(formData, "gate_key");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!approvableGateKeys.has(gateKey)) {
    throw new Error(`Unsupported MPGF approval gate: ${gateKey}.`);
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { error } = await supabase
    .from("mpgf_real_money_gate_status")
    .upsert({
      gate_key: gateKey,
      status: "passed",
      notes: notes || `Approved by ${viewer.authUser.email ?? viewer.authUser.id}.`,
      reviewed_by: viewer.authUser.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "gate_key",
    });

  if (error) {
    throw new Error(`Could not approve MPGF gate ${gateKey}: ${error.message}`);
  }

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.real_money_gate.approve",
    targetType: "mpgf_real_money_gate_status",
    targetId: gateKey,
    auditJson: {
      gateKey,
      status: "passed",
      notes: notes || null,
    },
  });

  revalidatePath("/mpgf/admin");
  revalidatePath("/mpgf/admin/legal");
  revalidatePath("/mpgf/admin/payments");
  revalidatePath("/mpgf/admin/payouts");
}

export async function recordMpgfAdminApprovalRecordAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const action = readRequired(formData, "approval_action");
  const targetType = readRequired(formData, "target_type");
  const targetVersion = readRequired(formData, "target_version");
  const approverRole = readRequired(formData, "approver_role");
  const targetId = String(formData.get("target_id") ?? "").trim() || null;

  if (!approvableAdminActions.has(action)) {
    throw new Error(`Unsupported MPGF admin approval action: ${action}.`);
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const { error } = await supabase.from("mpgf_admin_approval_records").insert({
    action,
    target_type: targetType,
    target_id: targetId,
    target_version: targetVersion,
    approver_user_id: viewer.authUser.id,
    approver_role: approverRole,
    decision: "approve",
    status: "approved",
    conflicted: false,
  });

  if (error) {
    throw new Error(`Could not record MPGF admin approval: ${error.message}`);
  }

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action,
    targetType,
    targetId,
    auditJson: {
      targetVersion,
      approverRole,
      decision: "approve",
      status: "approved",
    },
  });

  revalidatePath("/mpgf/admin");
  revalidatePath("/mpgf/admin/rbac");
  revalidatePath("/mpgf/admin/payouts");
  revalidatePath("/mpgf/admin/launch");
}

export async function runMpgfProductionHealthCheckAction() {
  const viewer = await requireMpgfAdmin();
  const { result, persistence } = await runAndPersistMpgfProductionHealthCheck({
    evaluatedBy: viewer.authUser.id,
  });

  revalidatePath("/mpgf/admin");
  revalidatePath("/mpgf/admin/launch");
  revalidatePath("/mpgf/admin/incidents");

  if (!persistence.persisted) {
    throw new Error(persistence.warning ?? "MPGF production health check could not be persisted.");
  }

  if (!result.passed) {
    throw new Error(`MPGF production health check failed: ${result.blockers.join(" ")}`);
  }
}
