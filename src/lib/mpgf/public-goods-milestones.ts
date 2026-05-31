import { createHash } from "node:crypto";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import {
  demoMpgfAssurancePledges,
  demoMpgfPublicGoodsCampaigns,
  demoMpgfPublicGoodsReviewCases,
} from "./data";
import { allocateMpgfAssuranceRound } from "./mechanism";
import type {
  MpgfPublicGoodsAllocationLine,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsReviewCase,
} from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export type MpgfPublicGoodsMilestoneStatus = "pending" | "eligible" | "paused" | "released" | "rejected";
export type MpgfPublicGoodsIncidentStatus = "clear" | "frozen";

export interface MpgfPublicGoodsMilestone {
  id: string;
  campaignId: string;
  ordinal: number;
  releasePct: number;
  evidenceRequirements: string[];
  status: MpgfPublicGoodsMilestoneStatus;
}

export interface MpgfPublicGoodsMilestoneReleaseDecision {
  milestone: MpgfPublicGoodsMilestone;
  campaignId: string;
  approvedMatchCents: number;
  releaseAmountCents: number;
  status: "authorized_for_partner_release" | "paused" | "rejected";
  blockerCodes: string[];
  reviewerId: string;
  dualControlApproverId: string;
  evidenceSummary: string;
  reviewStateConfirmed: boolean;
  dualControlConfirmed: boolean;
  webhookCanAuthorizeFinalPayout: false;
  createsCustody: false;
  requiresPartnerExecution: true;
  decidedAt: string;
}

export interface MpgfPublicGoodsMilestoneRow {
  id: string;
  campaign_id: string;
  ordinal: number;
  release_pct: number;
  evidence_requirements: string[];
  status: MpgfPublicGoodsMilestoneStatus;
}

export interface MpgfPublicGoodsDisbursementReviewRow {
  milestone_id: string;
  campaign_id: string;
  amount_cents: number;
  status: "partner_release_pending" | "paused" | "rejected";
  reviewer_id: string | null;
  approver_id: string | null;
  review_state_confirmed: boolean;
  dual_control_confirmed: boolean;
  blocker_codes: string[];
  public_notes: string;
  created_at: string;
}

export interface MpgfPublicGoodsReleaseAuditRow {
  object_type: "mpgf_public_goods_milestone";
  object_id: string;
  actor_type: "reviewer";
  event_type: "milestone_release_authorized" | "milestone_release_paused" | "milestone_release_rejected";
  event_hash: string;
  event_json: Record<string, unknown>;
  created_at: string;
}

export interface PersistMpgfPublicGoodsMilestoneReleaseResult {
  ok: boolean;
  status: "persisted" | "dry_run" | "not_configured";
  decision: MpgfPublicGoodsMilestoneReleaseDecision;
  milestoneRow: MpgfPublicGoodsMilestoneRow;
  disbursementReviewRow: MpgfPublicGoodsDisbursementReviewRow;
  auditRow: MpgfPublicGoodsReleaseAuditRow;
  warnings: string[];
}

const defaultReleasePercents = [40, 30, 30] as const;

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function releaseStatusForDecision(status: MpgfPublicGoodsMilestoneReleaseDecision["status"]) {
  if (status === "authorized_for_partner_release") {
    return "partner_release_pending" as const;
  }

  return status;
}

function auditTypeForDecision(status: MpgfPublicGoodsMilestoneReleaseDecision["status"]) {
  if (status === "authorized_for_partner_release") {
    return "milestone_release_authorized" as const;
  }

  if (status === "rejected") {
    return "milestone_release_rejected" as const;
  }

  return "milestone_release_paused" as const;
}

function openReviewBlockers(reviewCases: MpgfPublicGoodsReviewCase[]) {
  const blockers = new Set<string>();

  for (const reviewCase of reviewCases) {
    if (reviewCase.appealStatus === "appeal_requested") {
      blockers.add("appeal_requested");
    }

    if (reviewCase.state === "blocked") {
      blockers.add("review_blocked");
    }

    if (reviewCase.state === "needs_evidence") {
      blockers.add("needs_evidence");
    }

    if (reviewCase.action === "challenge" && !reviewCase.closedAt) {
      blockers.add("challenge_window_open");
    }
  }

  return [...blockers].sort();
}

export function buildMpgfPublicGoodsMilestoneSchedule(input: {
  campaignId: string;
  releasePercents?: readonly number[];
  evidenceRequirements?: readonly string[];
}) {
  const releasePercents = input.releasePercents ?? defaultReleasePercents;
  const total = releasePercents.reduce((sum, pct) => sum + pct, 0);

  if (total !== 100) {
    throw new Error("MPGF public-goods milestone release percentages must sum to 100.");
  }

  return releasePercents.map((releasePct, index) => ({
    id: `mpgf-public-goods-milestone-${input.campaignId}-${index + 1}`,
    campaignId: input.campaignId,
    ordinal: index + 1,
    releasePct,
    evidenceRequirements: [
      ...(input.evidenceRequirements ?? [
        "reviewer evidence summary",
        "distinct second approver confirmation",
        "partner release confirmation",
      ]),
    ],
    status: "pending" as const,
  }));
}

export function authorizeMpgfPublicGoodsMilestoneRelease(input: {
  campaign: MpgfPublicGoodsCampaign;
  allocationLine: MpgfPublicGoodsAllocationLine;
  milestone: MpgfPublicGoodsMilestone;
  reviewCases?: MpgfPublicGoodsReviewCase[];
  releasedPctBefore?: number;
  incidentStatus?: MpgfPublicGoodsIncidentStatus;
  reviewerId: string;
  dualControlApproverId?: string;
  evidenceSummary: string;
  reviewStateConfirmed: boolean;
  now?: string;
}): MpgfPublicGoodsMilestoneReleaseDecision {
  const reviewerId = input.reviewerId.trim();
  const dualControlApproverId = input.dualControlApproverId?.trim() ?? "";
  const evidenceSummary = input.evidenceSummary.trim();
  const approvedMatchCents = input.allocationLine.baseMatchCents + input.allocationLine.qfBonusCents;
  const blockerCodes = new Set<string>();

  if (!reviewerId) {
    throw new Error("MPGF public-goods milestone release requires a reviewer id.");
  }

  if (!evidenceSummary) {
    throw new Error("MPGF public-goods milestone release requires a public evidence summary.");
  }

  if (input.milestone.campaignId !== input.campaign.id || input.allocationLine.campaignId !== input.campaign.id) {
    throw new Error("MPGF public-goods milestone release requires matching campaign, allocation, and milestone ids.");
  }

  if (input.milestone.releasePct <= 0 || input.milestone.releasePct > 100) {
    throw new Error("MPGF public-goods milestone release percentage must be between 1 and 100.");
  }

  if ((input.releasedPctBefore ?? 0) + input.milestone.releasePct > 100) {
    throw new Error("MPGF public-goods milestone release cannot exceed 100 percent of approved match.");
  }

  if (input.allocationLine.status !== "payable") {
    blockerCodes.add("campaign_not_payable");
  }

  if (approvedMatchCents <= 0) {
    blockerCodes.add("no_approved_match");
  }

  if (!input.reviewStateConfirmed) {
    blockerCodes.add("review_state_not_confirmed");
  }

  if (!dualControlApproverId) {
    blockerCodes.add("dual_control_approver_required");
  } else if (dualControlApproverId.toLowerCase() === reviewerId.toLowerCase()) {
    blockerCodes.add("dual_control_approver_must_be_distinct");
  }

  if (input.incidentStatus === "frozen") {
    blockerCodes.add("incident_frozen");
  }

  for (const blocker of openReviewBlockers(input.reviewCases ?? [])) {
    blockerCodes.add(blocker);
  }

  const releaseAmountCents = Math.floor((approvedMatchCents * input.milestone.releasePct) / 100);
  const status = blockerCodes.size === 0 ? "authorized_for_partner_release" : "paused";

  return {
    milestone: {
      ...input.milestone,
      status: status === "authorized_for_partner_release" ? "eligible" : "paused",
    },
    campaignId: input.campaign.id,
    approvedMatchCents,
    releaseAmountCents: status === "authorized_for_partner_release" ? releaseAmountCents : 0,
    status,
    blockerCodes: [...blockerCodes].sort(),
    reviewerId,
    dualControlApproverId,
    evidenceSummary,
    reviewStateConfirmed: input.reviewStateConfirmed,
    dualControlConfirmed:
      Boolean(dualControlApproverId) && dualControlApproverId.toLowerCase() !== reviewerId.toLowerCase(),
    webhookCanAuthorizeFinalPayout: false,
    createsCustody: false,
    requiresPartnerExecution: true,
    decidedAt: input.now ?? new Date().toISOString(),
  };
}

export function buildMpgfPublicGoodsMilestoneReleaseRows(decision: MpgfPublicGoodsMilestoneReleaseDecision) {
  const publicEventJson = {
    campaignId: decision.campaignId,
    milestoneId: decision.milestone.id,
    milestoneOrdinal: decision.milestone.ordinal,
    releasePct: decision.milestone.releasePct,
    status: decision.status,
    blockerCodes: decision.blockerCodes,
    reviewStateConfirmed: decision.reviewStateConfirmed,
    dualControlConfirmed: decision.dualControlConfirmed,
    webhookCanAuthorizeFinalPayout: decision.webhookCanAuthorizeFinalPayout,
  };
  const eventHash = createHash("sha256")
    .update(`mpgf-public-goods-milestone:${JSON.stringify(publicEventJson)}`)
    .digest("hex");
  const milestoneRow = {
    id: decision.milestone.id,
    campaign_id: decision.campaignId,
    ordinal: decision.milestone.ordinal,
    release_pct: decision.milestone.releasePct,
    evidence_requirements: decision.milestone.evidenceRequirements,
    status: decision.milestone.status,
  } satisfies MpgfPublicGoodsMilestoneRow;
  const disbursementReviewRow = {
    milestone_id: decision.milestone.id,
    campaign_id: decision.campaignId,
    amount_cents: decision.releaseAmountCents,
    status: releaseStatusForDecision(decision.status),
    reviewer_id: isUuid(decision.reviewerId) ? decision.reviewerId : null,
    approver_id: isUuid(decision.dualControlApproverId) ? decision.dualControlApproverId : null,
    review_state_confirmed: decision.reviewStateConfirmed,
    dual_control_confirmed: decision.dualControlConfirmed,
    blocker_codes: decision.blockerCodes,
    public_notes: decision.evidenceSummary,
    created_at: decision.decidedAt,
  } satisfies MpgfPublicGoodsDisbursementReviewRow;
  const auditRow = {
    object_type: "mpgf_public_goods_milestone",
    object_id: decision.milestone.id,
    actor_type: "reviewer",
    event_type: auditTypeForDecision(decision.status),
    event_hash: eventHash,
    event_json: publicEventJson,
    created_at: decision.decidedAt,
  } satisfies MpgfPublicGoodsReleaseAuditRow;

  return {
    milestoneRow,
    disbursementReviewRow,
    auditRow,
  };
}

export async function persistMpgfPublicGoodsMilestoneRelease({
  decision,
  dryRun = false,
}: {
  decision: MpgfPublicGoodsMilestoneReleaseDecision;
  dryRun?: boolean;
}): Promise<PersistMpgfPublicGoodsMilestoneReleaseResult> {
  const rows = buildMpgfPublicGoodsMilestoneReleaseRows(decision);

  if (dryRun) {
    return {
      ok: true,
      status: "dry_run",
      decision,
      ...rows,
      warnings: [],
    };
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured",
      decision,
      ...rows,
      warnings: ["Supabase service-role configuration is required to persist MPGF public-goods milestone releases."],
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const milestonePersist = await supabase
    .from("mpgf_public_goods_milestones")
    .upsert(rows.milestoneRow, { onConflict: "id" });

  if (milestonePersist.error) {
    throw new Error(`Could not persist MPGF public-goods milestone: ${milestonePersist.error.message}`);
  }

  const disbursementPersist = await supabase
    .from("mpgf_public_goods_disbursements")
    .insert(rows.disbursementReviewRow);

  if (disbursementPersist.error) {
    throw new Error(`Could not persist MPGF public-goods disbursement review: ${disbursementPersist.error.message}`);
  }

  const auditPersist = await supabase.from("mpgf_public_goods_release_audit_events").insert(rows.auditRow);

  if (auditPersist.error) {
    throw new Error(`Could not persist MPGF public-goods release audit event: ${auditPersist.error.message}`);
  }

  return {
    ok: true,
    status: "persisted",
    decision,
    ...rows,
    warnings: [],
  };
}

export function buildDemoMpgfPublicGoodsMilestoneReleaseDecision(input: {
  campaignId?: string;
  milestoneOrdinal?: number;
  reviewerId?: string;
  dualControlApproverId?: string;
  evidenceSummary?: string;
  reviewStateConfirmed?: boolean;
  incidentStatus?: MpgfPublicGoodsIncidentStatus;
} = {}) {
  const campaign = demoMpgfPublicGoodsCampaigns.find(
    (candidate) => candidate.id === (input.campaignId ?? "campaign-global-health-basic-needs"),
  );

  if (!campaign) {
    throw new Error("Unknown demo MPGF public-goods campaign for milestone release.");
  }

  const allocation = allocateMpgfAssuranceRound();
  const allocationLine = allocation.lines.find((line) => line.campaignId === campaign.id);

  if (!allocationLine) {
    throw new Error("Missing demo MPGF public-goods allocation line for milestone release.");
  }

  const milestone = buildMpgfPublicGoodsMilestoneSchedule({ campaignId: campaign.id })[
    (input.milestoneOrdinal ?? 1) - 1
  ];

  if (!milestone) {
    throw new Error("Unknown demo MPGF public-goods milestone ordinal.");
  }

  return authorizeMpgfPublicGoodsMilestoneRelease({
    campaign,
    allocationLine,
    milestone,
    reviewCases: demoMpgfPublicGoodsReviewCases.filter((reviewCase) => reviewCase.campaignId === campaign.id),
    reviewerId: input.reviewerId ?? "demo-reviewer-public-goods",
    dualControlApproverId: input.dualControlApproverId ?? "demo-release-approver-public-goods",
    evidenceSummary: input.evidenceSummary ?? "Reviewer confirmed destination evidence and partner release conditions.",
    reviewStateConfirmed: input.reviewStateConfirmed ?? true,
    incidentStatus: input.incidentStatus ?? "clear",
    now: "2026-06-05T12:00:00.000Z",
  });
}
