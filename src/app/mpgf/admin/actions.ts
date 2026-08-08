"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess, isAdminEmail } from "@/lib/admin";
import { getViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { demoMpgfAssuranceRound, demoMpgfMatchPool, demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES, reviewMpgfPublicGoodsCampaign } from "@/lib/mpgf/mechanism";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";
import { runAndPersistMpgfProductionHealthCheck } from "@/lib/mpgf/production-verification";
import type { MpgfPublicGoodsReviewAction, MpgfPublicGoodsReviewReasonCode } from "@/lib/mpgf/types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
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

const publicGoodsReviewActions = new Set<MpgfPublicGoodsReviewAction>([
  "approve",
  "needs_evidence",
  "block",
  "challenge",
  "finalize",
]);

const publicGoodsReviewReasonCodes = new Set(MPGF_PUBLIC_GOODS_REVIEW_REASON_CODES);

async function requireMpgfAdmin() {
  const viewer = await getViewer();

  if (!viewer || !isAdminEmail(viewer.authUser.email)) {
    throw new Error("MPGF admin approval requires an authenticated admin session.");
  }

  const adminMfaSummary = await loadBackgroundAccountSecuritySummary();
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: adminMfaSummary,
  });

  if (!adminAccess.allowed) {
    throw new Error(adminAccess.message);
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

export async function approveMpgfFailureBonusScheduleAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const proposalId = readRequired(formData, "proposal_id");
  const rationale = readRequired(formData, "rationale");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(proposalId)) {
    throw new Error("Failure-bonus schedule approval requires a valid proposal ID.");
  }
  if (rationale.length < 20) {
    throw new Error("Failure-bonus schedule approval requires a substantive rationale of at least 20 characters.");
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const result = await supabase.rpc("mpgf_approve_failure_bonus_premium_schedule", {
    proposal_id_input: proposalId,
    reviewer_id_input: viewer.authUser.id,
    rationale_input: rationale,
  });

  if (result.error) {
    throw new Error(`Could not approve the complete failure-bonus schedule: ${result.error.message}`);
  }

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.failure_bonus_schedule.approve",
    targetType: "mpgf_pool_proposal",
    targetId: proposalId,
    auditJson: {
      proposalId,
      approvalMode: "atomic_complete_schedule",
      rationale,
      result: result.data,
    },
  });

  revalidatePath("/mpgf/admin");
  revalidatePath("/mpgf/admin/failure-bonus");
  revalidatePath("/mpgf/pools");
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

export async function recordMpgfPublicGoodsReviewAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const campaignId = readRequired(formData, "campaign_id");
  const action = readRequired(formData, "review_action") as MpgfPublicGoodsReviewAction;
  const reasonCode = readRequired(formData, "reason_code");
  const publicNotes = readRequired(formData, "public_notes");
  const campaign = demoMpgfPublicGoodsCampaigns.find((candidate) => candidate.id === campaignId);

  if (!campaign) {
    throw new Error(`Unknown MPGF public-goods campaign: ${campaignId}.`);
  }

  if (!publicGoodsReviewActions.has(action)) {
    throw new Error(`Unsupported MPGF public-goods review action: ${action}.`);
  }

  if (!publicGoodsReviewReasonCodes.has(reasonCode as MpgfPublicGoodsReviewReasonCode)) {
    throw new Error(`Unsupported MPGF public-goods reason code: ${reasonCode}.`);
  }

  const result = reviewMpgfPublicGoodsCampaign({
    campaign,
    action,
    reasonCode: reasonCode as MpgfPublicGoodsReviewReasonCode,
    reviewerId: viewer.authUser.id,
    publicNotes,
  });
  const supabase = createServiceClient() as SupabaseServiceAny;
  const matchPoolPersist = await supabase
    .from("mpgf_public_goods_match_pools")
    .upsert({
      id: demoMpgfMatchPool.id,
      funder_type: demoMpgfMatchPool.funderType,
      budget_cents: demoMpgfMatchPool.budgetCents,
      base_match_ratio: demoMpgfMatchPool.baseMatchRatio,
      qf_bonus_cents: demoMpgfMatchPool.qfBonusCents,
      visible_commitment: demoMpgfMatchPool.visibleCommitment,
      restrictions_json: demoMpgfMatchPool.restrictionsJson,
      status: "active",
    }, { onConflict: "id" });

  if (matchPoolPersist.error) {
    throw new Error(`Could not persist MPGF public-goods match pool: ${matchPoolPersist.error.message}`);
  }

  const roundPersist = await supabase
    .from("mpgf_public_goods_rounds")
    .upsert({
      id: demoMpgfAssuranceRound.id,
      name: demoMpgfAssuranceRound.name,
      starts_at: demoMpgfAssuranceRound.startsAt,
      ends_at: demoMpgfAssuranceRound.endsAt,
      match_pool_id: demoMpgfAssuranceRound.matchPoolId,
      qf_enabled: demoMpgfAssuranceRound.qfEnabled,
      qf_cap_multiple: demoMpgfAssuranceRound.qfCapMultiple,
      supporter_gate: demoMpgfAssuranceRound.supporterGate,
      status: "open",
    }, { onConflict: "id" });

  if (roundPersist.error) {
    throw new Error(`Could not persist MPGF public-goods round: ${roundPersist.error.message}`);
  }

  const campaignRow = {
    id: result.campaign.id,
    round_id: demoMpgfAssuranceRound.id,
    slug: result.campaign.slug,
    pool_alternative_id: result.campaign.poolAlternativeId ?? null,
    title: result.campaign.title,
    destination_type: result.campaign.destinationType,
    destination_ref: result.campaign.destinationRef,
    cause_tags: result.campaign.causeTags,
    public_summary: result.campaign.publicSummary,
    threshold_amount_cents: result.campaign.thresholdAmountCents,
    threshold_supporters: result.campaign.thresholdSupporters,
    deadline_at: result.campaign.deadlineAt,
    verification_method: result.campaign.verificationMethod,
    baseline_rule: result.campaign.baselineRule,
    exit_rule: result.campaign.exitRule,
    review_status: result.campaign.reviewStatus,
    challenge_window_ends_at: result.campaign.challengeWindowEndsAt ?? null,
  };
  const reviewCaseRow = {
    campaign_id: result.reviewCase.campaignId,
    state: result.reviewCase.state,
    action: result.reviewCase.action,
    reason_code: result.reviewCase.reasonCode,
    reviewer_id: viewer.authUser.id,
    opened_at: result.reviewCase.openedAt,
    closed_at: result.reviewCase.closedAt ?? null,
    appeal_status: result.reviewCase.appealStatus,
    challenge_window_ends_at: result.reviewCase.challengeWindowEndsAt ?? null,
    public_notes: result.reviewCase.publicNotes,
    allowed_next_actions: result.reviewCase.allowedNextActions,
  };
  const campaignPersist = await supabase
    .from("mpgf_public_goods_campaigns")
    .upsert(campaignRow, { onConflict: "id" });

  if (campaignPersist.error) {
    throw new Error(`Could not persist MPGF public-goods campaign review state: ${campaignPersist.error.message}`);
  }

  const casePersist = await supabase.from("mpgf_public_goods_review_cases").insert(reviewCaseRow);

  if (casePersist.error) {
    throw new Error(`Could not persist MPGF public-goods review case: ${casePersist.error.message}`);
  }

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.public_goods.review",
    targetType: "mpgf_public_goods_campaign",
    targetId: campaignId,
    auditJson: {
      reviewAction: action,
      reasonCode,
      reviewStatus: result.campaign.reviewStatus,
    },
  });

  revalidatePath("/mpgf");
  revalidatePath("/mpgf/pools");
  revalidatePath(`/mpgf/pools/${result.campaign.slug}`);
  revalidatePath("/mpgf/admin/public-goods");
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
}

function validateSubstantiveReason(value: string, label: string) {
  if (value.length < 20) {
    throw new Error(`${label} must be at least 20 characters.`);
  }
  if (value.length > 2_000) {
    throw new Error(`${label} must be 2,000 characters or fewer.`);
  }
}

function firstRpcRow(data: unknown) {
  return Array.isArray(data) ? data[0] ?? null : data;
}

function revalidateMpgfDacLifecycleRoutes(input?: {
  proposalId?: string;
  campaignId?: string;
  campaignSlug?: string;
}) {
  revalidatePath("/mpgf/admin");
  revalidatePath("/mpgf/admin/dac-lifecycle");
  revalidatePath("/mpgf/pools");
  revalidatePath("/mpgf/pools/new");
  if (input?.proposalId) revalidatePath(`/mpgf/pools/proposals/${input.proposalId}`);
  if (input?.campaignId) revalidatePath(`/mpgf/campaigns/${input.campaignId}`);
  if (input?.campaignSlug) revalidatePath(`/mpgf/campaigns/${input.campaignSlug}`);
}

async function runDacLifecycleRpc(input: {
  rpcName: string;
  args: Record<string, unknown>;
  errorLabel: string;
}) {
  const supabase = createServiceClient() as SupabaseServiceAny;
  const result = await supabase.rpc(input.rpcName, input.args);
  if (result.error) {
    throw new Error(`${input.errorLabel}: ${result.error.message}`);
  }
  return firstRpcRow(result.data);
}

export async function beginMpgfDacProposalReviewAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const proposalId = readRequired(formData, "proposal_id");
  const reason = readRequired(formData, "reason");
  validateUuid(proposalId, "Proposal ID");
  validateSubstantiveReason(reason, "Review rationale");

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_begin_pool_proposal_review",
    args: {
      p_proposal_id: proposalId,
      p_reviewer_id: viewer.authUser.id,
      p_reason: reason,
    },
    errorLabel: "Could not begin DAC proposal review",
  });

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_proposal.review_begin",
    targetType: "mpgf_pool_proposal",
    targetId: proposalId,
    auditJson: { reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ proposalId });
}

export async function requestMpgfDacProposalChangesAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const proposalId = readRequired(formData, "proposal_id");
  const reason = readRequired(formData, "reason");
  validateUuid(proposalId, "Proposal ID");
  validateSubstantiveReason(reason, "Change request");

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_request_pool_proposal_changes",
    args: {
      p_proposal_id: proposalId,
      p_reviewer_id: viewer.authUser.id,
      p_reason: reason,
    },
    errorLabel: "Could not request DAC proposal changes",
  });

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_proposal.changes_requested",
    targetType: "mpgf_pool_proposal",
    targetId: proposalId,
    auditJson: { reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ proposalId });
}

export async function rejectMpgfDacProposalAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const proposalId = readRequired(formData, "proposal_id");
  const reason = readRequired(formData, "reason");
  validateUuid(proposalId, "Proposal ID");
  validateSubstantiveReason(reason, "Rejection rationale");

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_reject_pool_proposal",
    args: {
      p_proposal_id: proposalId,
      p_reviewer_id: viewer.authUser.id,
      p_reason: reason,
    },
    errorLabel: "Could not reject the DAC proposal",
  });

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_proposal.reject",
    targetType: "mpgf_pool_proposal",
    targetId: proposalId,
    auditJson: { reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ proposalId });
}

export async function approveAndFreezeMpgfDacProposalAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const proposalId = readRequired(formData, "proposal_id");
  const reason = readRequired(formData, "reason");
  validateUuid(proposalId, "Proposal ID");
  validateSubstantiveReason(reason, "Approval rationale");

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_approve_and_freeze_pool_proposal",
    args: {
      p_proposal_id: proposalId,
      p_reviewer_id: viewer.authUser.id,
      p_reason: reason,
    },
    errorLabel: "Could not approve and freeze the DAC proposal",
  });

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_proposal.approve_and_freeze",
    targetType: "mpgf_pool_proposal",
    targetId: proposalId,
    auditJson: { reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ proposalId });
}

export async function publishMpgfDacProposalAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const proposalId = readRequired(formData, "proposal_id");
  const roundId = readRequired(formData, "round_id");
  const slug = readRequired(formData, "slug").toLowerCase();
  const reason = readRequired(formData, "reason");
  validateUuid(proposalId, "Proposal ID");
  validateSubstantiveReason(reason, "Publication rationale");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 96) {
    throw new Error("Campaign slug must be 3–96 lowercase letters, numbers, or single hyphens.");
  }

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_publish_pool_proposal",
    args: {
      p_proposal_id: proposalId,
      p_round_id: roundId,
      p_slug: slug,
      p_publisher_id: viewer.authUser.id,
      p_reason: reason,
    },
    errorLabel: "Could not publish the exact frozen DAC proposal",
  }) as Record<string, unknown> | null;
  const campaignId = typeof result?.public_campaign_id === "string" ? result.public_campaign_id : undefined;
  const campaignSlug = typeof result?.public_slug === "string" ? result.public_slug : slug;

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_proposal.publish",
    targetType: "mpgf_pool_proposal",
    targetId: proposalId,
    auditJson: { roundId, slug, reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ proposalId, campaignId, campaignSlug });
}

export async function reviewMpgfDacPledgeEligibilityAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const pledgeId = readRequired(formData, "pledge_id");
  const eligibilityState = readRequired(formData, "eligibility_state");
  const humanScoreBps = Number(String(formData.get("human_score_bps") ?? "0"));
  const reason = readRequired(formData, "reason");
  validateUuid(pledgeId, "Pledge ID");
  validateSubstantiveReason(reason, "Eligibility rationale");
  if (!["eligible", "duplicate_identity", "below_minimum", "blocked"].includes(eligibilityState)) {
    throw new Error("Choose a final DAC eligibility state.");
  }
  if (!Number.isInteger(humanScoreBps) || humanScoreBps < 0 || humanScoreBps > 10_000) {
    throw new Error("Human score must be an integer from 0 to 10,000 basis points.");
  }
  if (eligibilityState === "eligible" && humanScoreBps < 1) {
    throw new Error("An eligible pledge requires a positive human score.");
  }
  const effectiveHumanScoreBps = eligibilityState === "eligible" ? humanScoreBps : 0;

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_review_dac_pledge_eligibility",
    args: {
      p_pledge_id: pledgeId,
      p_reviewer_id: viewer.authUser.id,
      p_eligibility_state: eligibilityState,
      p_human_score_bps: effectiveHumanScoreBps,
      p_reason: reason,
    },
    errorLabel: "Could not finalize DAC pledge eligibility",
  }) as Record<string, unknown> | null;
  const campaignId = typeof result?.reviewed_campaign_id === "string" ? result.reviewed_campaign_id : undefined;

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_pledge.eligibility_review",
    targetType: "mpgf_public_goods_pledge",
    targetId: pledgeId,
    auditJson: { eligibilityState, humanScoreBps: effectiveHumanScoreBps, reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ campaignId });
  redirect("/mpgf/admin/dac-lifecycle");
}

export async function finalizeMpgfDacCampaignAction(formData: FormData) {
  const viewer = await requireMpgfAdmin();
  const campaignId = readRequired(formData, "campaign_id");
  const reason = readRequired(formData, "reason");
  validateSubstantiveReason(reason, "Terminal-outcome rationale");

  const result = await runDacLifecycleRpc({
    rpcName: "mpgf_finalize_dac_campaign",
    args: {
      p_campaign_id: campaignId,
      p_reviewer_id: viewer.authUser.id,
      p_reason: reason,
    },
    errorLabel: "Could not finalize the DAC campaign",
  }) as Record<string, unknown> | null;
  const proposalId = typeof result?.finalized_pool_proposal_id === "string"
    ? result.finalized_pool_proposal_id
    : undefined;

  await recordAdminAuditLog({
    actorUserId: viewer.authUser.id,
    action: "mpgf.dac_campaign.finalize",
    targetType: "mpgf_public_goods_campaign",
    targetId: campaignId,
    auditJson: { reason, result },
  });
  revalidateMpgfDacLifecycleRoutes({ proposalId, campaignId });
}
