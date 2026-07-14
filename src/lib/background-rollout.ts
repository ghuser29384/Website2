import { getBackgroundPhaseStatusForDocs } from "@/lib/background-phase-gates";

export const BACKGROUND_NETWORKING_BG14_ROLLOUT_VERSION =
  "background-networking-bg14-rollout-v1";
export const BACKGROUND_NETWORKING_BG14_ROLLOUT_VALIDATOR_VERSION =
  "background-networking-bg14-rollout-validator-v1";

export type BackgroundNetworkingRolloutFlagKey =
  | "background_source_summary_enabled"
  | "background_wish_interview_enabled"
  | "background_opportunity_briefs_enabled";

export type BackgroundNetworkingRolloutStage =
  | "internal"
  | "tiny_cohort"
  | "pilot_pack"
  | "public_beta";

export interface BackgroundNetworkingRolloutFlag {
  defaultEnabled: false;
  enabled: boolean;
  envKey: string;
  gatedSurfaces: string[];
  key: BackgroundNetworkingRolloutFlagKey;
  label: string;
  purpose: string;
  rollbackAction: string;
}

export interface BackgroundNetworkingDeploymentNote {
  broadenOnlyAfter: string[];
  currentStageLabel: string;
  stageOrder: BackgroundNetworkingRolloutStage[];
  summary: string;
}

export interface BackgroundNetworkingRollbackPlan {
  actions: string[];
  owner: string;
  summary: string;
}

export interface BackgroundNetworkingRolloutPlan {
  deploymentNote: BackgroundNetworkingDeploymentNote;
  flags: BackgroundNetworkingRolloutFlag[];
  hardInvariants: string[];
  rollbackPlan: BackgroundNetworkingRollbackPlan;
  stage: BackgroundNetworkingRolloutStage;
  version: typeof BACKGROUND_NETWORKING_BG14_ROLLOUT_VERSION;
}

export interface BackgroundNetworkingRolloutValidation {
  blockers: string[];
  checks: Array<{
    evidence: string;
    id: string;
    label: string;
    status: "pass" | "fail";
  }>;
  contractVersion: typeof BACKGROUND_NETWORKING_BG14_ROLLOUT_VERSION;
  status: "pass" | "fail";
  validatorName: "background-networking-bg14-rollout";
  validatorVersion: typeof BACKGROUND_NETWORKING_BG14_ROLLOUT_VALIDATOR_VERSION;
}

const ROLLOUT_STAGE_ORDER = [
  "internal",
  "tiny_cohort",
  "pilot_pack",
  "public_beta",
] as const satisfies readonly BackgroundNetworkingRolloutStage[];

const REQUIRED_FLAG_DEFINITIONS = [
  {
    envKey: "BACKGROUND_SOURCE_SUMMARY_ENABLED",
    gatedSurfaces: [
      "/api/background/source-summaries",
      "/api/background/source-summaries/:id/approve",
      "dashboard_manual_source_summary_panel",
    ],
    key: "background_source_summary_enabled",
    label: "Consented source summaries",
    purpose:
      "Let users approve redacted source summaries as matching signals without importing raw feeds.",
    rollbackAction:
      "Set BACKGROUND_SOURCE_SUMMARY_ENABLED=false, stop promoting new summaries, and keep existing approved summaries revocable through the source permission controls.",
  },
  {
    envKey: "BACKGROUND_WISH_INTERVIEW_ENABLED",
    gatedSurfaces: [
      "/api/background/profile/interview",
      "dashboard_structured_elicitation_panel",
      "profile_signal_recompute_from_interview_answers",
    ],
    key: "background_wish_interview_enabled",
    label: "Wish interview assistant",
    purpose:
      "Collect user-approved answers to deterministic clarification prompts before any profile signal changes.",
    rollbackAction:
      "Set BACKGROUND_WISH_INTERVIEW_ENABLED=false and leave saved answers private until the user edits or deletes them.",
  },
  {
    envKey: "BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED",
    gatedSurfaces: [
      "/api/background/opportunity-briefs",
      "/api/background/opportunity-briefs/:id/feedback",
      "/api/background/intro-packets",
      "dashboard_opportunity_briefs_panel",
    ],
    key: "background_opportunity_briefs_enabled",
    label: "Opportunity briefs and intro requests",
    purpose:
      "Package broad-preview match leads as reviewed next steps without autonomous outreach or contact disclosure.",
    rollbackAction:
      "Set BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED=false, pause brief generation jobs, and keep existing intro packets in operator review.",
  },
] as const satisfies readonly Omit<
  BackgroundNetworkingRolloutFlag,
  "defaultEnabled" | "enabled"
>[];

function boolFromEnv(value: string | undefined) {
  return value === "true" || value === "1";
}

function normalizeStage(value: string | undefined): BackgroundNetworkingRolloutStage {
  if (ROLLOUT_STAGE_ORDER.includes(value as BackgroundNetworkingRolloutStage)) {
    return value as BackgroundNetworkingRolloutStage;
  }

  return "internal";
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundNetworkingRolloutValidation["checks"][number] {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

export function getBackgroundNetworkingRolloutPlan(
  env: Record<string, string | undefined> = process.env,
): BackgroundNetworkingRolloutPlan {
  const stage = normalizeStage(env.BACKGROUND_NETWORKING_ROLLOUT_STAGE);

  return {
    deploymentNote: {
      broadenOnlyAfter: [
        "zero unresolved privacy incidents",
        "operator-reviewed disclosure and appeal metrics",
        "route-backed API contract evidence for every background lane",
        "documented rollback rehearsal for every enabled flag",
      ],
      currentStageLabel: stage.replaceAll("_", " "),
      stageOrder: [...ROLLOUT_STAGE_ORDER],
      summary:
        "Deploy bg14 lanes to internal/staff profiles first, then a tiny consenting cohort, then a pilot pack; broaden only after transparency, privacy, and operator-review checks stay clean.",
    },
    flags: REQUIRED_FLAG_DEFINITIONS.map((flag) => ({
      ...flag,
      defaultEnabled: false,
      enabled: boolFromEnv(env[flag.envKey]),
    })),
    hardInvariants: [
      "Broad previews are shown before exact private details.",
      "Exact details move only through field-level privacy grants.",
      "No autonomous outreach is sent by background networking.",
      "No raw private-feed ingestion is enabled for matching.",
      "AI promotion remains shadow-first and user/operator approved before live state mutation.",
      "Operator review is required before introduced-stage contact disclosure.",
    ],
    rollbackPlan: {
      actions: [
        "Turn off the affected BACKGROUND_*_ENABLED flag in production.",
        "Pause background opportunity and source-promotion jobs while reviewing incident scope.",
        "Leave route handlers private/no-store and return safe status metadata rather than raw detail.",
        "Use revocation, grant expiry, and intro-packet review states to stop further disclosure.",
      ],
      owner: "Moral Trade operator on call",
      summary:
        "Disable the specific bg14 flag, pause new promotion, preserve user revocation paths, and review audit rows before re-enabling.",
    },
    stage,
    version: BACKGROUND_NETWORKING_BG14_ROLLOUT_VERSION,
  };
}

export function getBackgroundNetworkingRolloutFlag(
  plan: BackgroundNetworkingRolloutPlan,
  key: BackgroundNetworkingRolloutFlagKey,
) {
  return plan.flags.find((flag) => flag.key === key);
}

export function serializeBackgroundNetworkingRolloutSurface(
  key: BackgroundNetworkingRolloutFlagKey,
  env: Record<string, string | undefined> = process.env,
) {
  const plan = getBackgroundNetworkingRolloutPlan(env);
  const flag = getBackgroundNetworkingRolloutFlag(plan, key);
  const phaseStatus = getBackgroundPhaseStatusForDocs();

  return {
    flag: flag
      ? {
          enabled: flag.enabled,
          envKey: flag.envKey,
          key: flag.key,
          label: flag.label,
          rollbackAction: flag.rollbackAction,
        }
      : null,
    hardInvariants: plan.hardInvariants,
    phaseGate: {
      bundleHash: phaseStatus.phaseGateBundleHash,
      bundleVersion: phaseStatus.phaseGateBundleVersion,
      currentPhase: phaseStatus.currentPhase,
      manifestId: phaseStatus.manifestId,
      policyEngineVersion: phaseStatus.policyEngineVersion,
    },
    rawPrivateFeedIngestionEnabled: false,
    stage: plan.stage,
    version: plan.version,
  };
}

export function validateBackgroundNetworkingRolloutPlan(
  plan: BackgroundNetworkingRolloutPlan = getBackgroundNetworkingRolloutPlan(),
): BackgroundNetworkingRolloutValidation {
  const flagKeys = plan.flags.map((flag) => flag.key);
  const rollbackText = [
    plan.rollbackPlan.summary,
    ...plan.rollbackPlan.actions,
    ...plan.flags.map((flag) => flag.rollbackAction),
  ].join(" ");
  const invariantText = plan.hardInvariants.join(" ");
  const deploymentText = [
    plan.deploymentNote.summary,
    ...plan.deploymentNote.broadenOnlyAfter,
    ...plan.deploymentNote.stageOrder,
  ].join(" ");
  const checks = [
    check(
      "required-bg14-flags",
      "Rollout plan defines the three bg14 feature flags",
      REQUIRED_FLAG_DEFINITIONS.every((flag) => flagKeys.includes(flag.key)),
      flagKeys.join(", "),
    ),
    check(
      "default-off",
      "Every bg14 lane is default-off unless its env flag is enabled",
      plan.flags.every((flag) => flag.defaultEnabled === false),
      plan.flags.map((flag) => `${flag.key}:${flag.defaultEnabled}`).join(", "),
    ),
    check(
      "rollback-actions",
      "Each flag and the overall plan names an explicit rollback action",
      plan.flags.every((flag) => /false|pause|review|revocable|operator/i.test(flag.rollbackAction)) &&
        /Disable|pause|review/i.test(rollbackText),
      rollbackText,
    ),
    check(
      "privacy-invariants",
      "Plan preserves broad previews, grants, no outreach, no raw ingestion, shadow-first AI, and contact review",
      /Broad previews/i.test(invariantText) &&
        /field-level privacy grants/i.test(invariantText) &&
        /No autonomous outreach/i.test(invariantText) &&
        /No raw private-feed ingestion/i.test(invariantText) &&
        /shadow-first/i.test(invariantText) &&
        /Operator review/i.test(invariantText),
      invariantText,
    ),
    check(
      "deployment-note",
      "Deployment note stages internal, tiny cohort, pilot pack, and broaden-only-after checks",
      /internal\/staff/i.test(deploymentText) &&
        /tiny consenting cohort/i.test(deploymentText) &&
        /pilot pack/i.test(deploymentText) &&
        /zero unresolved privacy incidents/i.test(deploymentText),
      deploymentText,
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    blockers,
    checks,
    contractVersion: plan.version,
    status: blockers.length ? "fail" : "pass",
    validatorName: "background-networking-bg14-rollout",
    validatorVersion: BACKGROUND_NETWORKING_BG14_ROLLOUT_VALIDATOR_VERSION,
  };
}
