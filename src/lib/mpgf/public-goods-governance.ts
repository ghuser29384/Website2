import {
  demoMpgfAssuranceRound,
  demoMpgfMatchPool,
  demoMpgfPublicGoodsCampaigns,
} from "./data";

export const MPGF_PUBLIC_GOODS_GOVERNANCE_PRIVACY_POLICY =
  "public_governance_no_private_notes_no_personal_contact";

const operatorRoster = [
  {
    id: "mpgf-operator-steward",
    publicName: "Moral Trade MPGF operating steward",
    role: "operator_steward",
    responsibilities: [
      "publish round rules before donations open",
      "maintain public incident and dispute status",
      "ensure parameter changes happen only between rounds",
    ],
  },
  {
    id: "mpgf-security-steward",
    publicName: "Moral Trade MPGF security steward",
    role: "security_steward",
    responsibilities: [
      "verify admin and reviewer MFA gates",
      "coordinate webhook replay and secret-rotation checks",
      "keep private evidence and receipt links out of public analytics",
    ],
  },
  {
    id: "mpgf-payout-steward",
    publicName: "Moral Trade MPGF payout steward",
    role: "payout_steward",
    responsibilities: [
      "confirm fiscal-sponsor or partner execution requirements",
      "enforce dual control before partner release",
      "publish release logs without private payout documents",
    ],
  },
] as const;

const reviewerPanelRoles = [
  {
    role: "eligibility_reviewer",
    minimumCount: 2,
    responsibilities: [
      "campaign eligibility",
      "anti-threat baseline",
      "destination review",
    ],
  },
  {
    role: "evidence_reviewer",
    minimumCount: 2,
    responsibilities: [
      "manual external-payment evidence",
      "structured public reason code",
      "private evidence redaction",
    ],
  },
  {
    role: "payout_release_reviewer",
    minimumCount: 2,
    responsibilities: [
      "milestone evidence",
      "review-state confirmation",
      "distinct second approval before partner release",
    ],
  },
  {
    role: "appeals_reviewer",
    minimumCount: 1,
    responsibilities: [
      "appeal intake",
      "challenge-window resolution",
      "unreleased milestone pause review",
    ],
  },
] as const;

export function getMpgfPublicGoodsGovernanceApi() {
  const campaignThresholds = demoMpgfPublicGoodsCampaigns.map((campaign) => ({
    campaignId: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    thresholdAmountCents: campaign.thresholdAmountCents,
    thresholdDonors: campaign.thresholdSupporters,
    destinationType: campaign.destinationType,
    reviewStatus: campaign.reviewStatus,
    challengeWindowEndsAt: campaign.challengeWindowEndsAt ?? null,
  }));
  const perDonorQfCapCents = Number(demoMpgfMatchPool.restrictionsJson.perDonorQfCapCents ?? 0);

  return {
    ok: true,
    generatedAt: "2026-05-31T12:00:00.000Z",
    governancePath: "/mpgf/governance",
    privacyPolicy: MPGF_PUBLIC_GOODS_GOVERNANCE_PRIVACY_POLICY,
    operatorRoster,
    reviewerPanel: {
      structurePublished: true,
      namedRosterStatus: "panel_structure_published_named_person_roster_pending_opt_in",
      roleCount: reviewerPanelRoles.length,
      minimumReviewerCount: reviewerPanelRoles.reduce((sum, role) => sum + role.minimumCount, 0),
      roles: reviewerPanelRoles,
    },
    conflictAndRecusalRules: {
      summary:
        "Reviewers cannot approve records where they are a campaign party, beneficiary, sponsor, or active recusal subject.",
      automaticChecks: [
        "campaign party conflict",
        "beneficiary conflict",
        "sponsor conflict",
        "private relationship recusal",
      ],
      appealPath: "/api/mpgf/appeals",
      recusalEnforcement: "mpgf_public_goods_reviewer_recusals trigger blocks matching review cases",
    },
    roundRules: {
      roundId: demoMpgfAssuranceRound.id,
      formulaVersion: "verified-qf-assurance-v1",
      startsAt: demoMpgfAssuranceRound.startsAt,
      endsAt: demoMpgfAssuranceRound.endsAt,
      sponsorPoolCents: demoMpgfMatchPool.budgetCents,
      baseMatchRatio: demoMpgfMatchPool.baseMatchRatio,
      qfEnabled: demoMpgfAssuranceRound.qfEnabled,
      qfCapMultiple: demoMpgfAssuranceRound.qfCapMultiple,
      perDonorQfCapCents,
      verificationWeightPolicy: demoMpgfMatchPool.restrictionsJson.verificationWeightPolicy,
      parametersLockedBeforeDonationsOpen: true,
      parameterChangePolicy:
        "cap values, thresholds, and verification weights may be retuned only between rounds, never mid-round",
      sponsorEarmarkPolicy:
        "sponsors may earmark a round but cannot micromanage campaign allocations after the round opens",
      unmatchedSponsorFundsRule: "roll_forward_to_next_round_or_default_pool_by_published_rule",
      refundPolicyPath: "/mpgf/real-money-terms",
      campaignThresholds,
    },
    incidentAndDisputeLane: {
      publicStatusPath: "/mpgf/governance#incident-dispute-lane",
      appealEndpoint: "/api/mpgf/appeals",
      reviewerQueuePath: "/mpgf/admin/public-goods",
      statuses: ["clear", "frozen", "resolved"] as const,
      pausesUnreleasedMilestones: true,
      publicSummaryPolicy: "publish aggregate dispute state and reason codes without private evidence URLs",
    },
    whatRoundDoesNotDecide: [
      "No global moral ranking is created.",
      "No donor receives moral reputation weight for allocation influence.",
      "No token, karma, or transferable governance claim is issued.",
      "No campaign receives a promise of effectiveness, tax treatment, escrow, or final payout before partner release gates pass.",
    ],
    prohibitedGovernanceMechanisms: [
      "token_voting",
      "karma_weighted_treasury_allocation",
      "public_reputation_weighted_donor_power",
      "mid_round_parameter_retuning",
    ],
    deploymentChecklist: {
      beforeProd: [
        { key: "named_governance_roles", status: "published", evidencePath: "/mpgf/governance" },
        { key: "round_rules_caps_thresholds_refund_policy", status: "published", evidencePath: "/mpgf/governance" },
        { key: "legal_review", status: "pending_external_review", evidencePath: "/mpgf/real-money-terms" },
        { key: "admin_reviewer_mfa", status: "blocked_until_gate_passes", evidencePath: "/mpgf/admin" },
        { key: "webhook_signature_replay_check", status: "configured_gate_required", evidencePath: "/api/mpgf/health" },
        { key: "shadow_round_fake_money", status: "running_demo_round", evidencePath: `/mpgf/rounds/${demoMpgfAssuranceRound.id}` },
        { key: "public_audit_backfill", status: "planned_before_real_money", evidencePath: "/api/mpgf/audit/ledger" },
        { key: "public_postmortem_template", status: "published_template_pending", evidencePath: "/mpgf/governance#incident-dispute-lane" },
      ],
      afterFirstRealMoneyRound: [
        "publish allocation report",
        "publish sponsor-pool source breakdown",
        "publish dispute summary and parameter changes",
        "review donor retention and sustainer conversion",
        "retune caps, thresholds, and verification weights only between rounds",
      ],
    },
  };
}
