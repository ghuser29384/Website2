export const MORAL_TRADE_PILOT_EVIDENCE_CONTRACT_VERSION =
  "moral-trade-pilot-evidence-v0.1-2026-06";
export const MORAL_TRADE_PILOT_EVIDENCE_VALIDATOR_VERSION =
  "moral-trade-pilot-evidence-validator-v0.1";

export type MoralTradePilotEvidenceTransition =
  | "donation_offset_payable_promotion"
  | "pledge_swap_reliance_promotion"
  | "capped_real_money_release"
  | "public_metric_release"
  | "release_gate_promotion";

export type MoralTradePilotEvidenceTrack =
  | "donation_offset"
  | "pledge_swap"
  | "combined_market_pilot";

export type MoralTradePilotEvidenceType =
  | "agent_based_market_simulation"
  | "historical_replay_simulation"
  | "adversarial_red_team_review"
  | "fraud_abuse_red_team_review"
  | "participant_comprehension_drill"
  | "operational_game_day";

export type MoralTradePilotEvidenceSuccessMetric =
  | "matched_volume"
  | "safety_incident_rate"
  | "privacy_leak_rate"
  | "dispute_rate"
  | "false_positive_block_rate"
  | "manual_review_sla"
  | "participant_comprehension"
  | "rollback_recovery_time";

export type MoralTradePilotEvidencePolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradePilotEvidenceResultState =
  | "draft"
  | "under_review"
  | "passed"
  | "blocked"
  | "paused"
  | "rollback_required"
  | "superseded";

export interface MoralTradePilotEvidenceRecord {
  recordId: string;
  pilotTrack: MoralTradePilotEvidenceTrack;
  releaseStage: string;
  policyRef: string;
  policyStatus: MoralTradePilotEvidencePolicyStatus;
  simulationEvidenceHash: string | null;
  redTeamEvidenceHash: string | null;
  preRegisteredCriteriaHash: string | null;
  scaleUpCriteria: string;
  pauseCriteria: string;
  rollbackCriteria: string;
  evidenceTypes: MoralTradePilotEvidenceType[];
  successMetrics: MoralTradePilotEvidenceSuccessMetric[];
  matchedVolumeOnly: boolean;
  replayRunCount: number;
  redTeamFindingCount: number;
  unresolvedCriticalFindingCount: number;
  resultState: MoralTradePilotEvidenceResultState;
  reviewerDecisionRef: string | null;
  criteriaPublishedAt: string | null;
  updatedAt: string;
}

export interface MoralTradePilotEvidenceEvaluationInput {
  transition: MoralTradePilotEvidenceTransition;
  evidenceRequired: boolean;
  checkedAt?: string;
  records: MoralTradePilotEvidenceRecord[];
}

export interface MoralTradePilotEvidenceEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePilotEvidenceTransition;
  checkedAt: string;
  evidenceRequired: boolean;
  reviewedRecordCount: number;
  passingRecordCount: number;
  simulationEvidenceCount: number;
  redTeamEvidenceCount: number;
  blockerCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePilotEvidenceTransitionDefinition {
  key: MoralTradePilotEvidenceTransition;
  label: string;
  requiresEvidence: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradePilotEvidenceCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePilotEvidenceValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-pilot-evidence-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePilotEvidenceCheck[];
  blockers: string[];
}

export interface MoralTradePilotEvidenceContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  simulationRule: string;
  redTeamRule: string;
  exitCriteriaRule: string;
  matchedVolumeRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  pilotTracks: MoralTradePilotEvidenceTrack[];
  evidenceTypes: MoralTradePilotEvidenceType[];
  successMetrics: MoralTradePilotEvidenceSuccessMetric[];
  transitionDefinitions: MoralTradePilotEvidenceTransitionDefinition[];
  sampleEvaluations: MoralTradePilotEvidenceEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = ["moral_trade_pilot_evidence_gates"] as const;
const POLICY_SNAPSHOT_SUBJECTS = ["pilot_evidence"] as const;

const PILOT_TRACKS: MoralTradePilotEvidenceTrack[] = [
  "donation_offset",
  "pledge_swap",
  "combined_market_pilot",
];

const EVIDENCE_TYPES: MoralTradePilotEvidenceType[] = [
  "agent_based_market_simulation",
  "historical_replay_simulation",
  "adversarial_red_team_review",
  "fraud_abuse_red_team_review",
  "participant_comprehension_drill",
  "operational_game_day",
];

const SUCCESS_METRICS: MoralTradePilotEvidenceSuccessMetric[] = [
  "matched_volume",
  "safety_incident_rate",
  "privacy_leak_rate",
  "dispute_rate",
  "false_positive_block_rate",
  "manual_review_sla",
  "participant_comprehension",
  "rollback_recovery_time",
];

const SIMULATION_EVIDENCE_TYPES = new Set<MoralTradePilotEvidenceType>([
  "agent_based_market_simulation",
  "historical_replay_simulation",
  "participant_comprehension_drill",
  "operational_game_day",
]);

const RED_TEAM_EVIDENCE_TYPES = new Set<MoralTradePilotEvidenceType>([
  "adversarial_red_team_review",
  "fraud_abuse_red_team_review",
]);

const TRANSITION_DEFINITIONS: MoralTradePilotEvidenceTransitionDefinition[] = [
  {
    key: "donation_offset_payable_promotion",
    label: "Donation-offset payable promotion",
    requiresEvidence: true,
    userFacingBlockerCategory:
      "Donation-offset payable mode waits for simulation, red-team, scale-up, pause, and rollback evidence",
  },
  {
    key: "pledge_swap_reliance_promotion",
    label: "Pledge-swap reliance promotion",
    requiresEvidence: true,
    userFacingBlockerCategory:
      "Pledge-swap reliance waits for simulation, red-team, scale-up, pause, and rollback evidence",
  },
  {
    key: "capped_real_money_release",
    label: "Capped real-money release",
    requiresEvidence: true,
    userFacingBlockerCategory:
      "Capped real-money release requires pre-registered pilot evidence and exit criteria",
  },
  {
    key: "public_metric_release",
    label: "Public metric release",
    requiresEvidence: true,
    userFacingBlockerCategory:
      "Public metric release cannot use matched volume alone as pilot success evidence",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresEvidence: true,
    userFacingBlockerCategory:
      "Release promotion requires reviewed simulation, red-team, and pilot exit criteria records",
  },
];

const CONTRACT_TESTS = [
  "pilot_evidence_contract_validator",
  "market_simulation_red_team_test",
  "pilot_exit_criteria_test",
  "pilot_success_not_matched_volume_only_test",
  "pilot_evidence_schema_contract",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePilotEvidenceCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 12);
}

function isHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function isValidIso(value: string | null) {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

function isStaleTimestamp(value: string, checkedAt: string) {
  if (!isValidIso(value) || !isValidIso(checkedAt)) {
    return true;
  }

  return Date.parse(checkedAt) - Date.parse(value) >
    MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function hasSimulationEvidence(record: MoralTradePilotEvidenceRecord) {
  return record.evidenceTypes.some((type) => SIMULATION_EVIDENCE_TYPES.has(type));
}

function hasRedTeamEvidence(record: MoralTradePilotEvidenceRecord) {
  return record.evidenceTypes.some((type) => RED_TEAM_EVIDENCE_TYPES.has(type));
}

function hasNonVolumeSuccessMetric(record: MoralTradePilotEvidenceRecord) {
  return record.successMetrics.some((metric) => metric !== "matched_volume");
}

function evaluateRecord({
  checkedAt,
  record,
}: {
  checkedAt: string;
  record: MoralTradePilotEvidenceRecord;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("pilot_evidence_record_id_missing");
  }

  if (!hasMeaningfulText(record.releaseStage)) {
    blockers.push(`pilot_evidence_release_stage_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.policyRef)) {
    blockers.push(`pilot_evidence_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(`pilot_evidence_policy_not_immutable:${record.recordId}:${record.policyStatus}`);
  }

  if (!isHash(record.simulationEvidenceHash)) {
    blockers.push(`pilot_evidence_simulation_hash_missing:${record.recordId}`);
  }

  if (!isHash(record.redTeamEvidenceHash)) {
    blockers.push(`pilot_evidence_red_team_hash_missing:${record.recordId}`);
  }

  if (!isHash(record.preRegisteredCriteriaHash)) {
    blockers.push(`pilot_evidence_exit_criteria_hash_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.scaleUpCriteria)) {
    blockers.push(`pilot_evidence_scale_up_criteria_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.pauseCriteria)) {
    blockers.push(`pilot_evidence_pause_criteria_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.rollbackCriteria)) {
    blockers.push(`pilot_evidence_rollback_criteria_missing:${record.recordId}`);
  }

  if (!hasSimulationEvidence(record) || record.replayRunCount <= 0) {
    blockers.push(`pilot_evidence_simulation_or_replay_missing:${record.recordId}`);
  }

  if (!hasRedTeamEvidence(record)) {
    blockers.push(`pilot_evidence_red_team_review_missing:${record.recordId}`);
  }

  if (record.unresolvedCriticalFindingCount > 0) {
    blockers.push(`pilot_evidence_unresolved_critical_findings:${record.recordId}`);
  }

  if (
    record.matchedVolumeOnly ||
    record.successMetrics.length === 0 ||
    !hasNonVolumeSuccessMetric(record)
  ) {
    blockers.push(`pilot_success_cannot_be_matched_volume_alone:${record.recordId}`);
  }

  if (record.resultState !== "passed") {
    blockers.push(`pilot_evidence_result_not_passed:${record.recordId}:${record.resultState}`);
  }

  if (!hasMeaningfulText(record.reviewerDecisionRef)) {
    blockers.push(`pilot_evidence_reviewer_decision_missing:${record.recordId}`);
  }

  if (!isValidIso(record.criteriaPublishedAt)) {
    blockers.push(`pilot_evidence_exit_criteria_not_pre_registered:${record.recordId}`);
  }

  if (!isValidIso(record.updatedAt)) {
    blockers.push(`pilot_evidence_updated_at_invalid:${record.recordId}`);
  } else if (isStaleTimestamp(record.updatedAt, checkedAt)) {
    blockers.push(`pilot_evidence_record_stale:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradePilotEvidence(
  input: MoralTradePilotEvidenceEvaluationInput,
): MoralTradePilotEvidenceEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transition = TRANSITION_DEFINITIONS.find(
    (entry) => entry.key === input.transition,
  );
  const evidenceRequired = input.evidenceRequired || transition?.requiresEvidence === true;
  const blockers: string[] = [];
  let passingRecordCount = 0;
  let simulationEvidenceCount = 0;
  let redTeamEvidenceCount = 0;

  if (evidenceRequired && input.records.length === 0) {
    blockers.push("pilot_evidence_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({ checkedAt, record });

    if (hasSimulationEvidence(record)) {
      simulationEvidenceCount += 1;
    }

    if (hasRedTeamEvidence(record)) {
      redTeamEvidenceCount += 1;
    }

    if (recordBlockers.length === 0) {
      passingRecordCount += 1;
    }

    blockers.push(...recordBlockers);
  }

  if (evidenceRequired && input.records.length > 0 && passingRecordCount === 0) {
    blockers.push("pilot_evidence_no_passing_record");
  }

  const userFacingBlockerCategories = [
    ...new Set(
      blockers.map((blocker) => {
        if (blocker.includes("matched_volume")) {
          return "Matched volume alone cannot satisfy pilot success.";
        }
        if (blocker.includes("simulation") || blocker.includes("red_team")) {
          return "Simulation and red-team evidence must pass before promotion.";
        }
        if (blocker.includes("scale_up") || blocker.includes("pause") || blocker.includes("rollback") || blocker.includes("criteria")) {
          return "Scale-up, pause, and rollback criteria must be pre-registered.";
        }
        return "Pilot evidence must be reviewed and current before promotion.";
      }),
    ),
  ];

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    evidenceRequired,
    reviewedRecordCount: input.records.length,
    passingRecordCount,
    simulationEvidenceCount,
    redTeamEvidenceCount,
    blockerCount: blockers.length,
    blockers,
    userFacingBlockerCategories,
  };
}

function demoRecord(
  overrides: Partial<MoralTradePilotEvidenceRecord> = {},
): MoralTradePilotEvidenceRecord {
  return {
    recordId: "pilot-evidence:demo",
    pilotTrack: "donation_offset",
    releaseStage: "donation_offset_pilot",
    policyRef: "policy-snapshot:pilot-evidence-v1",
    policyStatus: "resolved_immutable",
    simulationEvidenceHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    redTeamEvidenceHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    preRegisteredCriteriaHash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    scaleUpCriteria:
      "Scale only after review SLA, privacy, dispute, and comprehension thresholds pass.",
    pauseCriteria:
      "Pause on unresolved critical safety, privacy, payment, or comprehension findings.",
    rollbackCriteria:
      "Rollback within the pre-registered recovery window and preserve append-only evidence.",
    evidenceTypes: [
      "agent_based_market_simulation",
      "adversarial_red_team_review",
      "participant_comprehension_drill",
    ],
    successMetrics: [
      "matched_volume",
      "privacy_leak_rate",
      "dispute_rate",
      "participant_comprehension",
      "rollback_recovery_time",
    ],
    matchedVolumeOnly: false,
    replayRunCount: 12,
    redTeamFindingCount: 3,
    unresolvedCriticalFindingCount: 0,
    resultState: "passed",
    reviewerDecisionRef: "review-decision:pilot-evidence-demo",
    criteriaPublishedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

export function getMoralTradePilotEvidenceContract(): MoralTradePilotEvidenceContract {
  return {
    version: MORAL_TRADE_PILOT_EVIDENCE_CONTRACT_VERSION,
    purpose:
      "Govern donation-offset and pledge-swap pilot promotion with first-class simulation, red-team, scale-up, pause, rollback, and non-volume success evidence before payable or reliance-bearing behavior.",
    failClosedRule:
      "Missing, stale, under-review, or matched-volume-only pilot evidence blocks donation-offset payable promotion, pledge-swap reliance promotion, capped real-money release, public metric release, and release-gate promotion.",
    simulationRule:
      "Pilot records must include reviewed market simulation or historical replay evidence before donation offsets or pledge swaps can move beyond templates and previews.",
    redTeamRule:
      "Pilot records must include adversarial or fraud-abuse red-team evidence with zero unresolved critical findings before payable or reliance-bearing promotion.",
    exitCriteriaRule:
      "Scale-up, pause, and rollback criteria must be pre-registered, hash-backed, reviewer-approved, and available before the promoted stage begins.",
    matchedVolumeRule:
      "Matched volume alone cannot satisfy pilot success; success metrics must include safety, privacy, dispute, comprehension, review-SLA, or rollback evidence.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    pilotTracks: [...PILOT_TRACKS],
    evidenceTypes: [...EVIDENCE_TYPES],
    successMetrics: [...SUCCESS_METRICS],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((entry) => ({ ...entry })),
    sampleEvaluations: [
      evaluateMoralTradePilotEvidence({
        transition: "donation_offset_payable_promotion",
        evidenceRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [demoRecord()],
      }),
      evaluateMoralTradePilotEvidence({
        transition: "pledge_swap_reliance_promotion",
        evidenceRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          demoRecord({
            pilotTrack: "pledge_swap",
            recordId: "pilot-evidence:matched-volume-only",
            matchedVolumeOnly: true,
            successMetrics: ["matched_volume"],
            resultState: "under_review",
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradePilotEvidenceContract(
  contract = getMoralTradePilotEvidenceContract(),
): MoralTradePilotEvidenceValidation {
  const transitionKeys = contract.transitionDefinitions.map((entry) => entry.key);
  const samplePass = contract.sampleEvaluations.find(
    (entry) => entry.transition === "donation_offset_payable_promotion",
  );
  const sampleBlocked = contract.sampleEvaluations.find(
    (entry) => entry.transition === "pledge_swap_reliance_promotion",
  );
  const checks = [
    check(
      "first-class-record-tables",
      "Pilot evidence uses first-class records",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subjects",
      "Contract names pilot_evidence policy snapshots",
      contract.policySnapshotSubjects.includes("pilot_evidence"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "transition-coverage",
      "Donation-offset, pledge-swap, metrics, and release promotion are covered",
      [
        "donation_offset_payable_promotion",
        "pledge_swap_reliance_promotion",
        "public_metric_release",
        "release_gate_promotion",
      ].every((transition) =>
        transitionKeys.includes(transition as MoralTradePilotEvidenceTransition),
      ),
      transitionKeys.join(", "),
    ),
    check(
      "simulation-red-team-evidence",
      "Contract requires simulation and red-team evidence",
      /market simulation/i.test(contract.simulationRule) &&
        /red-team/i.test(contract.redTeamRule),
      `${contract.simulationRule} ${contract.redTeamRule}`,
    ),
    check(
      "exit-criteria",
      "Contract requires pre-registered scale-up, pause, and rollback criteria",
      /Scale-up, pause, and rollback criteria must be pre-registered/i.test(
        contract.exitCriteriaRule,
      ),
      contract.exitCriteriaRule,
    ),
    check(
      "matched-volume-not-success",
      "Matched volume alone cannot satisfy success",
      /Matched volume alone cannot satisfy pilot success/i.test(
        contract.matchedVolumeRule,
      ) && contract.successMetrics.some((metric) => metric !== "matched_volume"),
      contract.matchedVolumeRule,
    ),
    check(
      "sample-evaluations",
      "Sample evaluations include one pass and one matched-volume-only blocker",
      samplePass?.status === "pass" &&
        sampleBlocked?.status === "blocked" &&
        sampleBlocked.blockers.some((blocker) =>
          blocker.includes("pilot_success_cannot_be_matched_volume_alone"),
        ),
      contract.sampleEvaluations
        .map((entry) => `${entry.transition}:${entry.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      [...CONTRACT_TESTS].every((testKey) =>
        contract.contractTests.includes(testKey),
      ),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-pilot-evidence-contract",
    validatorVersion: MORAL_TRADE_PILOT_EVIDENCE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradePilotEvidence = {
  evaluateMoralTradePilotEvidence,
  getMoralTradePilotEvidenceContract,
  validateMoralTradePilotEvidenceContract,
};

export default moralTradePilotEvidence;
