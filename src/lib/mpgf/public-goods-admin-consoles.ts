export type MpgfPublicGoodsAdminConsoleKey =
  | "registry"
  | "round"
  | "safety"
  | "sybil-collusion"
  | "sponsor-governance";

export type MpgfPublicGoodsAdminConsoleStatus =
  | "mapped"
  | "evidence_required"
  | "operator_review_required";

export interface MpgfPublicGoodsAdminConsoleRow {
  label: string;
  evidenceSource: string;
  operatorAction: string;
  status: MpgfPublicGoodsAdminConsoleStatus;
}

export interface MpgfPublicGoodsAdminConsole {
  key: MpgfPublicGoodsAdminConsoleKey;
  title: string;
  purpose: string;
  adminHref: `/mpgf/admin/${MpgfPublicGoodsAdminConsoleKey}`;
  rows: MpgfPublicGoodsAdminConsoleRow[];
  requiresMfaAdminGate: true;
  createsLiveAuthority: false;
  privacySafeOperatorView: true;
}

export interface MpgfPublicGoodsAdminConsoleRegistryValidation {
  passed: boolean;
  missingLabels: string[];
  consoleCount: number;
  requiredLabelCount: number;
  createsLiveAuthority: false;
  requiresMfaAdminGate: true;
  privacySafeOperatorView: true;
}

export const MPGF_PUBLIC_GOODS_ADMIN_CONSOLES: readonly MpgfPublicGoodsAdminConsole[] = [
  {
    key: "registry",
    title: "Registry Console",
    purpose:
      "Verify recipient eligibility, destination proof, allowed-use scope, milestone cadence, and receipt requirements before a public-good project can become payable.",
    adminHref: "/mpgf/admin/registry",
    requiresMfaAdminGate: true,
    createsLiveAuthority: false,
    privacySafeOperatorView: true,
    rows: [
      {
        label: "Recipient legal status",
        evidenceSource: "Recipient registry row, fiscal-host records, and compliance review evidence.",
        operatorAction: "Confirm eligible nonprofit, fiscal-host, or approved public-benefit status.",
        status: "operator_review_required",
      },
      {
        label: "Fiscal host",
        evidenceSource: "Recipient registry payout rail and fiscal-host destination records.",
        operatorAction: "Verify host identity, payout relationship, and no reviewer conflict.",
        status: "evidence_required",
      },
      {
        label: "Destination proof",
        evidenceSource: "Public-good destination proof, externality review, and payout destination evidence.",
        operatorAction: "Approve only clear public-good destinations with route-bound proof.",
        status: "operator_review_required",
      },
      {
        label: "Allowed uses",
        evidenceSource: "Project allowed-use statement and recipient compliance policy.",
        operatorAction: "Block private-benefit, unrelated, or unreviewed destination-use claims.",
        status: "operator_review_required",
      },
      {
        label: "Milestone schedule",
        evidenceSource: "Milestone release queue and dual-control release records.",
        operatorAction: "Confirm tranche schedule before release review can proceed.",
        status: "mapped",
      },
      {
        label: "Receipt requirements",
        evidenceSource: "Receipt template registry, payment proof rows, and reconciliation policy.",
        operatorAction: "Require public-safe receipt evidence before proof or release state advances.",
        status: "mapped",
      },
    ],
  },
  {
    key: "round",
    title: "Round Console",
    purpose:
      "Monitor the round state, sponsor-backed pools, sealed disclosure mode, thresholds, clearance simulation, and calculation hashes without exposing sealed live progress.",
    adminHref: "/mpgf/admin/round",
    requiresMfaAdminGate: true,
    createsLiveAuthority: false,
    privacySafeOperatorView: true,
    rows: [
      {
        label: "Round status",
        evidenceSource: "Round status value registry and round state-machine row.",
        operatorAction: "Confirm state transitions before lock, close, clear, payable, release, or audit.",
        status: "mapped",
      },
      {
        label: "Sponsor pool",
        evidenceSource: "Frozen sponsor-input bundle, commitment source hashes, and funded records.",
        operatorAction: "Compare advertised and frozen backing before any match claim is displayed.",
        status: "evidence_required",
      },
      {
        label: "Base match pool",
        evidenceSource: "Base-match pool configuration and exact BigInt proration records.",
        operatorAction: "Confirm backed base-match availability before final clearing.",
        status: "mapped",
      },
      {
        label: "Bonus pool",
        evidenceSource: "Bonus-match pool, fixed-point score units, and cap-proration logs.",
        operatorAction: "Review deterministic score-unit inputs and capped-proration outputs.",
        status: "mapped",
      },
      {
        label: "Failure pool",
        evidenceSource: "Failure-bonus backing, qualification predicates, and denied-by-reason counts.",
        operatorAction: "Confirm failure-bonus pool backing before claims can advance.",
        status: "operator_review_required",
      },
      {
        label: "Success-reward pool",
        evidenceSource: "Success-reward sponsor pool and maximum-liability backing checks.",
        operatorAction: "Disable dominance-mode rewards unless maximum liability is fully backed.",
        status: "operator_review_required",
      },
      {
        label: "Coordination-credit / impact-certificate policy",
        evidenceSource: "Credit and certificate policy rows plus captured contribution evidence.",
        operatorAction: "Confirm credits and certificates have no allocation or governance power.",
        status: "mapped",
      },
      {
        label: "Sealed-pledge disclosure mode",
        evidenceSource: "Sealed-progress policy, incident logs, and public disclosure controls.",
        operatorAction: "Prevent exact live threshold, counterparty, supporter, or cluster exposure before close.",
        status: "operator_review_required",
      },
      {
        label: "Threshold settings",
        evidenceSource: "Round thresholds, counterparty-volume conditions, and moral-bucket snapshot.",
        operatorAction: "Confirm frozen threshold inputs before clearance simulation or final clearing.",
        status: "mapped",
      },
      {
        label: "Clearance simulation",
        evidenceSource: "Non-binding preview outputs, solver trace, and final clearing bundle.",
        operatorAction: "Keep previews labeled non-binding until final bundle gates pass.",
        status: "mapped",
      },
      {
        label: "Calculation hash",
        evidenceSource: "Rulebook hash, calculation version, bundle hash, and score hash records.",
        operatorAction: "Reject mismatched or malformed hashes before final output publication.",
        status: "mapped",
      },
    ],
  },
  {
    key: "safety",
    title: "Safety Console",
    purpose:
      "Track anti-threat, externality, dissent, challenge, appeal, and privacy-incident controls before projects can clear or become payable.",
    adminHref: "/mpgf/admin/safety",
    requiresMfaAdminGate: true,
    createsLiveAuthority: false,
    privacySafeOperatorView: true,
    rows: [
      {
        label: "Anti-threat blockers",
        evidenceSource: "Threat screen, baseline/action evidence flags, and blocker reason codes.",
        operatorAction: "Block projects with unresolved threat, coercion, or unsafe baseline evidence.",
        status: "operator_review_required",
      },
      {
        label: "Externality review",
        evidenceSource: "Externality state, destination route, and bucket-snapshot membership.",
        operatorAction: "Prevent clearing unless externality state is clear and destination fields are valid.",
        status: "operator_review_required",
      },
      {
        label: "Dissent pressure",
        evidenceSource: "Raw and verified dissent-pressure rows plus bonus-affecting exclusion logs.",
        operatorAction: "Review dissent-pressure adjustments before they can affect bonus score units.",
        status: "mapped",
      },
      {
        label: "Challenge state",
        evidenceSource: "Challenge window records, reason codes, and public-safe dispute queue.",
        operatorAction: "Pause review or release while challenge windows are open.",
        status: "mapped",
      },
      {
        label: "Appeal state",
        evidenceSource: "Appeal requested, upheld, and denied review-case records.",
        operatorAction: "Require independent review before appeal outcomes change payable status.",
        status: "operator_review_required",
      },
      {
        label: "Privacy incidents",
        evidenceSource: "Sealed-progress exposure incidents and public-safe audit trail.",
        operatorAction: "Freeze disclosure or route to incident response when private progress leaks.",
        status: "operator_review_required",
      },
    ],
  },
  {
    key: "sybil-collusion",
    title: "Sybil / Collusion Console",
    purpose:
      "Inspect identity integrity and collusion controls without revealing private moral profiles or granting allocation power from reputation.",
    adminHref: "/mpgf/admin/sybil-collusion",
    requiresMfaAdminGate: true,
    createsLiveAuthority: false,
    privacySafeOperatorView: true,
    rows: [
      {
        label: "Duplicate identity flags",
        evidenceSource: "Identity attestation rows and duplicate-identity exclusion records.",
        operatorAction: "Exclude duplicate identities from counted dollars and supporter breadth.",
        status: "operator_review_required",
      },
      {
        label: "Linked-account and same-control clusters",
        evidenceSource: "Cluster graph, same-control attestations, and eligibility rows.",
        operatorAction: "Review linked-control clusters before counterparty volume can count.",
        status: "operator_review_required",
      },
      {
        label: "Suspicious cluster patterns",
        evidenceSource: "Cluster-pattern alerts, diversity-factor inputs, and collusion-risk rows.",
        operatorAction: "Apply reviewed anti-collusion penalties or block unsupported clusters.",
        status: "evidence_required",
      },
      {
        label: "Donor splitting",
        evidenceSource: "Participant, payment, and account-linkage split-donation indicators.",
        operatorAction: "Collapse or exclude split donations when they evade caps or breadth checks.",
        status: "evidence_required",
      },
      {
        label: "Payment-method anomalies",
        evidenceSource: "Payment commitment snapshots and same-payment-method exclusion logs.",
        operatorAction: "Remove anomalous payment rows before matching, rewards, or failure bonuses.",
        status: "operator_review_required",
      },
      {
        label: "Counterparty-volume exclusions",
        evidenceSource: "Conditional-intent counterparty thresholds and exclusion records.",
        operatorAction: "Exclude linked, duplicate, or unverified counterparty volume from clearing.",
        status: "mapped",
      },
      {
        label: "Post-round adjustment log",
        evidenceSource: "Post-round adjustment records and public exception reports.",
        operatorAction: "Publish public-safe adjustments without exposing private identity artifacts.",
        status: "mapped",
      },
    ],
  },
  {
    key: "sponsor-governance",
    title: "Sponsor and Governance Console",
    purpose:
      "Review sponsor commitments, parameter freezes, conflict checks, safety freezes, and public exception reports before sponsor-backed claims can be trusted.",
    adminHref: "/mpgf/admin/sponsor-governance",
    requiresMfaAdminGate: true,
    createsLiveAuthority: false,
    privacySafeOperatorView: true,
    rows: [
      {
        label: "Sponsor commitment state",
        evidenceSource: "Sponsor commitment rows, source hashes, and contract state.",
        operatorAction: "Treat advertised sponsor amounts as provisional until frozen bundle evidence passes.",
        status: "operator_review_required",
      },
      {
        label: "Funded / escrowed / contractually committed amount",
        evidenceSource: "Funded records, valid escrow/custody route if present, and contractually committed evidence.",
        operatorAction: "Use escrowed language only when a valid custody or escrow route is actually recorded.",
        status: "operator_review_required",
      },
      {
        label: "Rulebook hash and parameter-freeze timestamp",
        evidenceSource: "Rulebook report, parameter-freeze record, and calculation version.",
        operatorAction: "Reject stale or mismatched rulebook/hash inputs before publishing final outputs.",
        status: "mapped",
      },
      {
        label: "Sponsor-recipient-reviewer-proposer conflicts",
        evidenceSource: "Conflict-recusal records and reviewer independence checks.",
        operatorAction: "Block conflicted sponsor, recipient, reviewer, or proposer roles from final approval.",
        status: "operator_review_required",
      },
      {
        label: "Safety freeze / cancellation events",
        evidenceSource: "Safety freeze, cancellation, and incident-review event log.",
        operatorAction: "Prevent clearing, payment, rewards, credits, or certificates during active freezes.",
        status: "operator_review_required",
      },
      {
        label: "Public exception reports",
        evidenceSource: "Public-safe exception report rows and audit-bundle summaries.",
        operatorAction: "Publish aggregate exception reports without private donor or sealed-progress artifacts.",
        status: "mapped",
      },
    ],
  },
];

export const MPGF_PUBLIC_GOODS_ADMIN_CONSOLE_LABELS = MPGF_PUBLIC_GOODS_ADMIN_CONSOLES.flatMap(
  (consoleItem) => consoleItem.rows.map((row) => row.label),
);

export function getMpgfPublicGoodsAdminConsoles() {
  return MPGF_PUBLIC_GOODS_ADMIN_CONSOLES;
}

export function getMpgfPublicGoodsAdminConsole(key: string) {
  return MPGF_PUBLIC_GOODS_ADMIN_CONSOLES.find((consoleItem) => consoleItem.key === key) ?? null;
}

export function validateMpgfPublicGoodsAdminConsoles(): MpgfPublicGoodsAdminConsoleRegistryValidation {
  const presentLabels = new Set(MPGF_PUBLIC_GOODS_ADMIN_CONSOLE_LABELS);
  const requiredLabels = [
    "Recipient legal status",
    "Fiscal host",
    "Destination proof",
    "Allowed uses",
    "Milestone schedule",
    "Receipt requirements",
    "Round status",
    "Sponsor pool",
    "Base match pool",
    "Bonus pool",
    "Failure pool",
    "Success-reward pool",
    "Coordination-credit / impact-certificate policy",
    "Sealed-pledge disclosure mode",
    "Threshold settings",
    "Clearance simulation",
    "Calculation hash",
    "Anti-threat blockers",
    "Externality review",
    "Dissent pressure",
    "Challenge state",
    "Appeal state",
    "Privacy incidents",
    "Duplicate identity flags",
    "Linked-account and same-control clusters",
    "Suspicious cluster patterns",
    "Donor splitting",
    "Payment-method anomalies",
    "Counterparty-volume exclusions",
    "Post-round adjustment log",
    "Sponsor commitment state",
    "Funded / escrowed / contractually committed amount",
    "Rulebook hash and parameter-freeze timestamp",
    "Sponsor-recipient-reviewer-proposer conflicts",
    "Safety freeze / cancellation events",
    "Public exception reports",
  ];
  const missingLabels = requiredLabels.filter((label) => !presentLabels.has(label));

  return {
    passed:
      missingLabels.length === 0 &&
      MPGF_PUBLIC_GOODS_ADMIN_CONSOLES.every(
        (consoleItem) =>
          consoleItem.requiresMfaAdminGate &&
          consoleItem.createsLiveAuthority === false &&
          consoleItem.privacySafeOperatorView,
      ),
    missingLabels,
    consoleCount: MPGF_PUBLIC_GOODS_ADMIN_CONSOLES.length,
    requiredLabelCount: requiredLabels.length,
    createsLiveAuthority: false,
    requiresMfaAdminGate: true,
    privacySafeOperatorView: true,
  };
}
