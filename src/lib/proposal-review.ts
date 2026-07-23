export type BaselineConfidence = "Weak" | "Moderate" | "Strong" | "Not assessed";
export type ScoreConfidence = "Low" | "Medium" | "High";
export type ProtocolTrustRating = "low" | "medium" | "high";
export type MoralTradeVerificationStepStatus =
  | "pass"
  | "needs_input"
  | "human_review"
  | "blocked";
export type ProtocolReviewStatus =
  | "draft"
  | "needs_clarification"
  | "needs_evidence"
  | "needs_human_review"
  | "challenge_window"
  | "blocked"
  | "matchable";

export interface ProposalReviewInput {
  id?: string;
  mode: string;
  verification: string;
  trustLevel?: number | null;
  baselineAmountUsd?: number | null;
  baselineOpposedCause?: string | null;
  requestedMatchingAmountUsd?: number | null;
  requestedOpposedCause?: string | null;
  evidenceUrl?: string | null;
  moderationStatus?: string | null;
  offeredCause?: string | null;
  requestedCause?: string | null;
}

export interface OfferReviewWorkflowInput extends ProposalReviewInput {
  currentStatus?: string | null;
  offerImpact?: number | null;
  minCounterpartyImpact?: number | null;
}

export interface OfferReviewWorkflowCard {
  key:
    | "current_status"
    | "action_evidence"
    | "baseline_confidence"
    | "externality_review"
    | "participant_relative_scores"
    | "appeal_scope";
  label: string;
  status: MoralTradeVerificationStepStatus;
  statusReasonCode: string;
  statusReason: string;
  factorCodes: string[];
  summary: string;
  nextStep: string;
}

export interface OfferReviewCardInstrumentation {
  factorCodes: string[];
  label: string;
  nextStep: string;
  status: MoralTradeVerificationStepStatus;
  statusReasonCode: string;
  statusReason: string;
}

export interface OfferReviewWorkflowCardContract {
  key: OfferReviewWorkflowCard["key"];
  label: string;
  requiredFactorCodes: string[];
  purpose: string;
  statusReasonRule: string;
  nextStepRule: string;
}

export interface OfferReviewWorkflowCopyTemplates {
  baselineHelperText: string;
  needsEvidenceStatusCopy: string;
  safetyWarningCopy: string;
  importanceScoreNote: string;
  appealCopy: string;
}

export type MoralTradeUserFacingBlockerKey =
  | "needs_evidence"
  | "baseline_review"
  | "privacy_review"
  | "safety_review"
  | "account_security"
  | "reviewer_or_neutral_review"
  | "recipient_destination"
  | "clearing_confirmation"
  | "agreement_change"
  | "appeal_correction"
  | "production_payout"
  | "general_review_pending";

export interface MoralTradeUserFacingBlockerExplanation {
  key: MoralTradeUserFacingBlockerKey;
  reasonCategory: string;
  plainLanguageStatus: string;
  nextAction: string;
  moneyEffect: string;
  obligationEffect: string;
  appealOrCorrectionPath: string;
  privacyBoundary: string;
}

export interface OfferReviewWorkflowPathStep {
  key: string;
  label: string;
  contractSurface: string;
  enforcement: "structured_input" | "deterministic_policy" | "human_review" | "provenance";
}

export interface OfferReviewWorkflowContract {
  version: string;
  purpose: string;
  statuses: MoralTradeVerificationStepStatus[];
  detailWorkflowCards: OfferReviewWorkflowCardContract[];
  policyEnforcedWorkflow: OfferReviewWorkflowPathStep[];
  reviewStateOutcomes: string[];
  marketplaceFactorPriority: string[];
  participantCopyTemplates: OfferReviewWorkflowCopyTemplates;
  userFacingBlockerExplanations: MoralTradeUserFacingBlockerExplanation[];
  sampleUserFacingBlockerExplanations: MoralTradeUserFacingBlockerExplanation[];
  forbiddenUserFacingExplanationTerms: string[];
  invariants: string[];
  sampleDetailCards: OfferReviewWorkflowCard[];
  sampleMarketplaceCard: OfferReviewCardInstrumentation;
  contractTests: string[];
}

export interface OfferReviewWorkflowContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface OfferReviewWorkflowContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-review-workflow-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: OfferReviewWorkflowContractCheck[];
  blockers: string[];
}

export interface MoralTradeProtocolDraftInput {
  format: string;
  offeredCause?: string | null;
  requestedCause?: string | null;
  offeredAction?: string | null;
  requestedAction?: string | null;
  baselineStatement?: string | null;
  duration?: string | null;
  exitConditions?: string | null;
  verificationMethod?: string | null;
  publicDescription?: string | null;
  evidenceUrl?: string | null;
  participantImportance?: number | null;
  counterpartyThreshold?: number | null;
}

export type MoralTradeCitedEvidenceStatus =
  | "draft_claim"
  | "evidence_locator"
  | "artifact_requested"
  | "policy_flag";

export interface MoralTradeCitedEvidenceRow {
  claim: string;
  evidenceType: "draft_field" | "evidence_locator" | "artifact_request" | "policy_registry";
  citation: string;
  status: MoralTradeCitedEvidenceStatus;
  reviewerNote: string;
}

export interface MoralTradeVerificationLoopStep {
  key: (typeof MORAL_TRADE_VERIFICATION_LOOP_STEPS)[number]["key"];
  label: string;
  status: MoralTradeVerificationStepStatus;
  detail: string;
  blocksMatchable: boolean;
}

export interface MoralTradeProtocolDraftReview {
  status: ProtocolReviewStatus;
  summary: string;
  missingRequiredFields: string[];
  underspecifiedFields: string[];
  policyConflicts: string[];
  factorCodes: string[];
  clarificationQuestions: Array<{
    field: string;
    question: string;
  }>;
  verificationLoop: MoralTradeVerificationLoopStep[];
  uncertaintyFlags: string[];
  userFacingBlockerExplanations: MoralTradeUserFacingBlockerExplanation[];
  nextStepChecklist: string[];
  citedEvidenceTable: MoralTradeCitedEvidenceRow[];
  reviewerSummary: string;
  trustAssessment: {
    factualTrust: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    counterfactualBaseline: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    externalityReview: {
      required: boolean;
      flags: string[];
    };
    partyRelativeBenefit: {
      rating: ProtocolTrustRating;
      reasons: string[];
    };
    privacyRedaction: {
      rating: ProtocolTrustRating;
      flags: string[];
      reasons: string[];
    };
  };
  reviewInstructions: {
    artifactsToRequest: string[];
    reviewScope: string[];
    appealTriggers: string[];
  };
}

export const WORKED_EXAMPLE_LAUNCH_ORDER = [
  "seed-victoria",
  "seed-paul",
  "seed-nia",
  "seed-omar",
  "seed-lina",
  "seed-marco",
  "seed-rebecca",
  "seed-christopher",
] as const;

export const MORAL_TRADE_REVIEW_WORKFLOW_CONTRACT_VERSION =
  "moral-trade-review-workflow-v0.2-2026-06";

export const MORAL_TRADE_REVIEW_WORKFLOW_VALIDATOR_VERSION =
  "moral-trade-review-workflow-validator-v0.2";

export const OFFER_REVIEW_WORKFLOW_CARD_CONTRACTS: OfferReviewWorkflowCardContract[] = [
  {
    key: "current_status",
    label: "Status card",
    requiredFactorCodes: ["status_visible", "human_review_required"],
    purpose: "Expose whether a record is live, example-only, blocked, or still under review.",
    statusReasonRule: "Explain why the visible status is pass, needs-input, human-review, or blocked without implying completion.",
    nextStepRule: "Never imply completion, custody, enforceability, or moral endorsement from a visible status.",
  },
  {
    key: "action_evidence",
    label: "Action evidence",
    requiredFactorCodes: ["evidence_rule_named", "evidence_sufficiency"],
    purpose: "Show whether each factual action claim has a named reviewable proof method.",
    statusReasonRule: "Explain whether a proof method and locator exist, or which evidence boundary keeps the card out of pass.",
    nextStepRule: "Ask for scoped artifacts before anyone relies on a factual action claim.",
  },
  {
    key: "baseline_confidence",
    label: "Counterfactual baseline",
    requiredFactorCodes: ["baseline_stated", "baseline_credibility"],
    purpose: "Keep factual proof separate from the no-trade baseline and counterfactual trust problem.",
    statusReasonRule: "Explain why the no-trade baseline is credible enough, weak, or still review-bound.",
    nextStepRule: "Ask what would happen without the trade and what dated evidence supports that claim.",
  },
  {
    key: "externality_review",
    label: "Externality review",
    requiredFactorCodes: ["externality_review_required", "human_review_required"],
    purpose: "Name third-party harm, perverse-incentive, and unrepresented-value review before reliance.",
    statusReasonRule: "Explain which mode or cause trigger requires human review, or why no obvious trigger was detected.",
    nextStepRule: "Route affected-party standing, remedy, and challenge-window questions to human review.",
  },
  {
    key: "participant_relative_scores",
    label: "Participant-relative scores",
    requiredFactorCodes: ["participant_relative_scores", "no_global_moral_ranking"],
    purpose: "Display stated priorities without turning them into an objective platform ranking.",
    statusReasonRule: "Explain that pass only means scores are bounded as participant-stated context.",
    nextStepRule: "Use scores only as participant-stated context and preserve the no-global-ranking notice.",
  },
  {
    key: "appeal_scope",
    label: "Appeal scope",
    requiredFactorCodes: ["appealable_review_scope", "reviewer_summary"],
    purpose: "Limit appeals to the claim, evidence row, baseline concern, disclosure decision, or policy flag under review.",
    statusReasonRule: "Explain that appeal handling remains human-reviewed and scoped to the reviewed issue.",
    nextStepRule: "Do not reopen unrelated moral disagreements by default.",
  },
];

export const REVIEW_WORKFLOW_PARTICIPANT_COPY: OfferReviewWorkflowCopyTemplates = {
  baselineHelperText:
    "What would you do if this trade did not happen? Be concrete. Mention your current intention, prior behavior, or any evidence that makes your baseline credible.",
  needsEvidenceStatusCopy:
    "Status: Needs evidence. Your draft is structurally complete, but no reviewable proof method has been attached yet.",
  safetyWarningCopy:
    "This proposal cannot be published because it resembles a threat, coercive compensation request, or newly escalated harmful behavior.",
  importanceScoreNote:
    "This score reflects the participant's own stated priorities. It is not a platform judgment about objective moral value.",
  appealCopy:
    "If you think this review decision is wrong, appeal the specific claim that was reviewed. Appeals do not reopen unrelated moral disagreements by default.",
};

const USER_FACING_BLOCKER_EXPLANATIONS: readonly MoralTradeUserFacingBlockerExplanation[] = [
  {
    key: "needs_evidence",
    reasonCategory: "Evidence is incomplete",
    plainLanguageStatus: "A reviewable proof artifact is still needed for the exact claim.",
    nextAction: "Attach or request one scoped artifact for the claim being reviewed.",
    moneyEffect: "No payment capture or payout should proceed from this record.",
    obligationEffect: "No new locked obligation should be created from this record.",
    appealOrCorrectionPath:
      "If evidence was rejected, use the appeal path for the specific evidence row.",
    privacyBoundary:
      "Show only the claim scope and safe artifact type; keep private records hidden.",
  },
  {
    key: "baseline_review",
    reasonCategory: "Baseline needs review",
    plainLanguageStatus: "The no-trade baseline needs dated support before anyone relies on it.",
    nextAction: "Add prior-intent, past-behavior, or dated baseline support.",
    moneyEffect: "Money movement stays blocked for reliance-bearing use.",
    obligationEffect: "Completion, clearing, and public count claims stay paused.",
    appealOrCorrectionPath:
      "Appeal only the reviewed baseline concern or submit a corrected baseline packet.",
    privacyBoundary:
      "Show the baseline category only; keep private timing and counterparty facts hidden.",
  },
  {
    key: "privacy_review",
    reasonCategory: "Privacy review is incomplete",
    plainLanguageStatus: "Private details need a narrower disclosure grant or redaction first.",
    nextAction: "Redact exact wishes, contact details, and sensitive constraints before routing.",
    moneyEffect: "Money is not affected unless the private detail is needed for payment review.",
    obligationEffect: "No contact introduction or privacy disclosure should proceed yet.",
    appealOrCorrectionPath:
      "Use the correction path for the specific disclosure decision or privacy grant.",
    privacyBoundary:
      "Show only the safe category; keep detailed personal facts and contact details hidden.",
  },
  {
    key: "safety_review",
    reasonCategory: "Safety or legality review is needed",
    plainLanguageStatus: "This proposal cannot move forward until a safety reviewer clears it.",
    nextAction: "Pause publication and ask for a narrow safety review of the reviewed issue.",
    moneyEffect: "No payment, payout, or public money claim should proceed.",
    obligationEffect: "No new obligation, lock, or completion claim should be created.",
    appealOrCorrectionPath:
      "Use the appeal path for the specific safety decision; do not broaden the dispute.",
    privacyBoundary:
      "Show only a safe reason category; keep sensitive facts and affected-party details hidden.",
  },
  {
    key: "account_security",
    reasonCategory: "Account security check is pending",
    plainLanguageStatus: "A recent account-risk event requires step-up or manual review.",
    nextAction: "Complete the requested account check or wait for manual review.",
    moneyEffect: "Payment capture and payout release stay blocked.",
    obligationEffect: "High-risk confirmations, privacy grants, and contact introductions stay paused.",
    appealOrCorrectionPath:
      "Use account recovery or correction if the account-security decision is wrong.",
    privacyBoundary:
      "Show the account-check category only; keep device and session details hidden.",
  },
  {
    key: "reviewer_or_neutral_review",
    reasonCategory: "Reviewer check is incomplete",
    plainLanguageStatus: "A qualified or neutral reviewer still needs to decide this issue.",
    nextAction: "Route the narrow issue to the required reviewer or neutral panel.",
    moneyEffect: "Money movement stays blocked for the affected release stage.",
    obligationEffect: "Reliance, clearing, and blocker overrides stay paused.",
    appealOrCorrectionPath:
      "If the review decision is adverse, appeal the specific reviewed issue.",
    privacyBoundary:
      "Show reviewer status only; keep private review evidence hidden.",
  },
  {
    key: "recipient_destination",
    reasonCategory: "Recipient or destination is not verified",
    plainLanguageStatus: "The recipient or payment destination is not ready for money movement.",
    nextAction: "Use a verified recipient and destination record, or request destination review.",
    moneyEffect: "Capture, payout, reuse, and public money metrics stay blocked.",
    obligationEffect: "No locked agreement should rely on this destination yet.",
    appealOrCorrectionPath:
      "Use the correction path for the specific recipient or destination rejection.",
    privacyBoundary:
      "Show destination readiness only; keep bank, wallet, and raw donation-link details hidden.",
  },
  {
    key: "clearing_confirmation",
    reasonCategory: "Clearing or confirmation is incomplete",
    plainLanguageStatus: "The trade is still a preview until frozen matching and confirmations pass.",
    nextAction: "Create or refresh the lock proposal and collect fresh confirmations.",
    moneyEffect: "Payable and public-completion states stay blocked.",
    obligationEffect: "No participant has a new locked obligation from this preview.",
    appealOrCorrectionPath:
      "Use the correction path for the specific clearing or confirmation defect.",
    privacyBoundary:
      "Show only the stage and safe reason; keep individual participant terms hidden.",
  },
  {
    key: "agreement_change",
    reasonCategory: "Agreement change needs review",
    plainLanguageStatus: "A post-lock change needs an explicit amendment record first.",
    nextAction: "Create an amendment with before/after terms and renewed confirmations.",
    moneyEffect: "Payment or payout tied to the changed terms stays blocked.",
    obligationEffect: "Existing obligations are not silently changed by this record.",
    appealOrCorrectionPath:
      "Use the correction path for the specific amendment decision or changed term.",
    privacyBoundary:
      "Show the changed-term category only; keep private terms and counterparties hidden.",
  },
  {
    key: "appeal_correction",
    reasonCategory: "Appeal or correction case is incomplete",
    plainLanguageStatus: "The correction path needs notice, deadline, scope, or neutral review.",
    nextAction: "File or complete the bounded appeal case for the reviewed issue.",
    moneyEffect: "No release, payout, or public reliance should proceed from the disputed decision.",
    obligationEffect: "The appeal does not reopen settled obligations or waive safety blockers.",
    appealOrCorrectionPath:
      "Use the existing appeal case; keep it limited to the adverse decision under review.",
    privacyBoundary:
      "Show only appeal status; keep appeal narratives and evidence details hidden.",
  },
  {
    key: "production_payout",
    reasonCategory: "Production or payout gate is not ready",
    plainLanguageStatus: "Operational checks are not complete enough for release or payout.",
    nextAction: "Wait for the required operational review before publishing money or impact claims.",
    moneyEffect: "Payout release, public totals, and sponsor-leverage claims stay blocked.",
    obligationEffect: "No new operational override should be created from this state.",
    appealOrCorrectionPath:
      "Use the correction path for the specific operational check if a record is wrong.",
    privacyBoundary:
      "Show readiness category only; keep internal operational details hidden.",
  },
  {
    key: "general_review_pending",
    reasonCategory: "Review is not complete",
    plainLanguageStatus: "This record cannot move forward until the reviewed issue is resolved.",
    nextAction: "Ask for reviewer triage or submit a correction for the specific issue.",
    moneyEffect: "No money movement should proceed from this record.",
    obligationEffect: "No new locked obligation should be created from this record.",
    appealOrCorrectionPath:
      "Use the appeal or correction path only for the issue that was reviewed.",
    privacyBoundary:
      "Show a safe reason category; keep private facts and internal records hidden.",
  },
] as const;

const USER_FACING_BLOCKER_MATCHERS: ReadonlyArray<{
  key: MoralTradeUserFacingBlockerKey;
  patterns: readonly RegExp[];
}> = [
  {
    key: "needs_evidence",
    patterns: [/evidence|proof|artifact|receipt|synthetic|duplicate|authenticity/i],
  },
  {
    key: "safety_review",
    patterns: [
      /threat|coerc|civil_rights|discrimination|hazard|cyber|corruption|fraud|sanction|unsafe|prohibited|abuse|reporting_integrity|duress|vulnerab/i,
    ],
  },
  {
    key: "baseline_review",
    patterns: [/baseline|additionality|counterfactual|manufactur/i],
  },
  {
    key: "privacy_review",
    patterns: [/privacy|disclos|redact|contact|private|confidential/i],
  },
  {
    key: "appeal_correction",
    patterns: [/appeal|challenge|deadline|notice|standing|non_retaliation|settled_obligation|correction/i],
  },
  {
    key: "agreement_change",
    patterns: [/amendment|renewed_confirmation|post_lock|retroactive|parent_record|changed_term/i],
  },
  {
    key: "clearing_confirmation",
    patterns: [/matching|clearing|lock|confirmation|ratio|settlement|reservation|atomic/i],
  },
  {
    key: "recipient_destination",
    patterns: [/recipient|destination|payment_destination|impersonation|wallet|bank/i],
  },
  {
    key: "reviewer_or_neutral_review",
    patterns: [/reviewer|neutral|conflict|calibration|audit|second_review|quality/i],
  },
  {
    key: "account_security",
    patterns: [/account|step_up|cooldown|session|mfa|recovery|device/i],
  },
  {
    key: "production_payout",
    patterns: [/payout|backup|deployment|configuration|migration|reconciliation|integrity|key|provider|ledger|restore/i],
  },
];

export const MORAL_TRADE_USER_FACING_EXPLANATION_FORBIDDEN_TERMS = [
  "sha256",
  "policy_hash",
  "source hash",
  "provider payload",
  "reviewer notes",
  "risk signal",
  "session anomaly",
  "exact private",
  "counterparty-specific",
] as const;

function getUserFacingExplanationByKey(
  key: MoralTradeUserFacingBlockerKey,
): MoralTradeUserFacingBlockerExplanation {
  return (
    USER_FACING_BLOCKER_EXPLANATIONS.find((entry) => entry.key === key) ??
    USER_FACING_BLOCKER_EXPLANATIONS[USER_FACING_BLOCKER_EXPLANATIONS.length - 1]
  );
}

export function getMoralTradeUserFacingBlockerExplanations() {
  return [...USER_FACING_BLOCKER_EXPLANATIONS];
}

export function explainMoralTradeUserFacingBlocker(
  blocker: string | null | undefined,
): MoralTradeUserFacingBlockerExplanation {
  const normalized = blocker?.trim() ?? "";
  const match = USER_FACING_BLOCKER_MATCHERS.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(normalized)),
  );

  return getUserFacingExplanationByKey(match?.key ?? "general_review_pending");
}

function explainMoralTradeUserFacingBlockers(
  blockers: readonly string[],
): MoralTradeUserFacingBlockerExplanation[] {
  const explanations = blockers.length
    ? blockers.map((blocker) => explainMoralTradeUserFacingBlocker(blocker))
    : [getUserFacingExplanationByKey("general_review_pending")];
  const seen = new Set<MoralTradeUserFacingBlockerKey>();

  return explanations.filter((entry) => {
    if (seen.has(entry.key)) {
      return false;
    }

    seen.add(entry.key);
    return true;
  });
}

export const OFFER_REVIEW_POLICY_ENFORCED_WORKFLOW: OfferReviewWorkflowPathStep[] = [
  {
    key: "user_draft",
    label: "User draft",
    contractSurface: "structured_review_input",
    enforcement: "structured_input",
  },
  {
    key: "schema_normalizer",
    label: "Schema normalizer",
    contractSurface: "normalizeReviewInput",
    enforcement: "deterministic_policy",
  },
  {
    key: "completeness_check",
    label: "Completeness check",
    contractSurface: "current_status_card",
    enforcement: "deterministic_policy",
  },
  {
    key: "anti_threat_policy_engine",
    label: "Anti-threat / prohibited-content engine",
    contractSurface: "current_status_blocked_reason_codes",
    enforcement: "deterministic_policy",
  },
  {
    key: "baseline_credibility_assessment",
    label: "Baseline credibility assessment",
    contractSurface: "baseline_confidence_card",
    enforcement: "deterministic_policy",
  },
  {
    key: "evidence_checklist_generator",
    label: "Evidence checklist generator",
    contractSurface: "action_evidence_card",
    enforcement: "deterministic_policy",
  },
  {
    key: "privacy_redaction_engine",
    label: "Privacy / redaction engine",
    contractSurface: "disclosure_contract",
    enforcement: "deterministic_policy",
  },
  {
    key: "rule_based_match_engine",
    label: "Rule-based match engine",
    contractSurface: "match_signal_contract",
    enforcement: "deterministic_policy",
  },
  {
    key: "match_card_factor_codes",
    label: "Match card with factor codes and confidence band",
    contractSurface: "marketplace_factor_priority",
    enforcement: "deterministic_policy",
  },
  {
    key: "human_review",
    label: "Human review",
    contractSurface: "human_review_required",
    enforcement: "human_review",
  },
  {
    key: "agreement_room",
    label: "Agreement room",
    contractSurface: "agreement_review_workflow",
    enforcement: "human_review",
  },
  {
    key: "evidence_submission",
    label: "Evidence submission",
    contractSurface: "provenance_evidence_artifact",
    enforcement: "provenance",
  },
  {
    key: "reviewer_decision",
    label: "Reviewer decision",
    contractSurface: "review_decision",
    enforcement: "human_review",
  },
  {
    key: "audit_log_provenance_record",
    label: "Audit log / provenance record",
    contractSurface: "state_transition_event_record",
    enforcement: "provenance",
  },
];

export const OFFER_REVIEW_STATE_OUTCOMES = [
  "needs_clarification",
  "blocked",
  "needs_evidence",
  "challenge_window",
  "disputed_unresolved",
  "matchable",
  "completion_reviewed",
] as const;

const WORKED_EXAMPLE_ORDER_MAP = new Map<string, number>(
  WORKED_EXAMPLE_LAUNCH_ORDER.map((id, index) => [id, index]),
);

const POLITICAL_ADJACENT_CAUSES = ["gun rights", "gun control", "political", "campaign"];

const REQUIRED_DRAFT_FIELD_LABELS: Array<{
  key: keyof MoralTradeProtocolDraftInput;
  label: string;
  minLength?: number;
}> = [
  { key: "format", label: "Trade format" },
  { key: "offeredAction", label: "Offered action", minLength: 12 },
  { key: "requestedAction", label: "Requested action", minLength: 12 },
  { key: "baselineStatement", label: "No-trade baseline", minLength: 20 },
  { key: "duration", label: "Duration or review period" },
  { key: "exitConditions", label: "Exit, pause, expiry, or unresolved evidence", minLength: 20 },
  { key: "verificationMethod", label: "Verification method" },
  { key: "publicDescription", label: "Public description and boundaries", minLength: 20 },
];

export const MORAL_TRADE_VERIFICATION_LOOP_STEPS = [
  { key: "schema_completeness", label: "Schema completeness check", blocksMatchable: true },
  { key: "anti_threat", label: "Anti-threat / prohibited-content check", blocksMatchable: true },
  { key: "baseline_credibility", label: "Baseline credibility check", blocksMatchable: true },
  { key: "evidence_sufficiency", label: "Evidence sufficiency check", blocksMatchable: true },
  { key: "externality_trigger", label: "Externality-review trigger check", blocksMatchable: false },
  { key: "privacy_redaction", label: "Privacy/redaction check", blocksMatchable: true },
  { key: "match_explanation", label: "Match explanation generation", blocksMatchable: false },
  { key: "human_review_routing", label: "Human-review routing", blocksMatchable: false },
] as const;

const THREAT_OR_COERCION_PATTERNS = [
  /\bpay\s+me\b.{0,80}\b(or|otherwise|unless)\b.{0,80}\bi\s+will\b/,
  /\b(unless|until)\b.{0,80}\b(pay|paid|fund|donate|compensate)\b.{0,80}\b(i\s+will|i'll|start|increase|resume|continue)\b/,
  /\bi\s+(will|would|might)\s+(start|increase|resume|continue)\b.{0,80}\b(harass|harm|dox|doxx|expose|attack|sabotage)\b/,
  /\b(expose|dox|doxx|harass|retaliate)\b.{0,80}\b(unless|until)\b/,
  /\bnewly\s+escalated\b.{0,80}\b(pay|compensate|donat|fund)\b/,
];

export const PROHIBITED_MORAL_TRADE_PATTERNS = [
  {
    code: "anti_threat_baseline",
    label: "Threat or coercive baseline",
    patterns: THREAT_OR_COERCION_PATTERNS,
  },
  {
    code: "prohibited_illegal_or_fraud",
    label: "Illegal, deceptive, or fraudulent action",
    patterns: [
      /\b(illegal|fraud|fraudulent|deceptive|scam|bribe|hack|steal|launder|fake receipt|falsify)\b/,
    ],
  },
  {
    code: "prohibited_doxxing_or_harassment",
    label: "Doxxing, harassment, blackmail, or private exposure",
    patterns: [
      /\b(dox|doxx|harass|blackmail|extort|stalk|retaliate)\b/,
      /\b(publish|expose|release|share)\b.{0,60}\b(address|phone|email|contact|private)\b/,
      /\b(contact|message|email)\b.{0,40}\b(employer|family|landlord|school)\b/,
    ],
  },
  {
    code: "prohibited_political_campaign_offset",
    label: "Political campaign contribution offset",
    patterns: [
      /\b(campaign contribution|campaign donation|candidate contribution|candidate donation|candidate committee|election donation|super pac|super-pac|political action committee)\b/,
      /\b(donate|redirect|offset|match)\b.{0,80}\b(candidate|campaign|super pac|super-pac|pac)\b/,
    ],
  },
  {
    code: "newly_escalated_harmful_behavior",
    label: "Compensation for newly escalated harmful behavior",
    patterns: [
      /\b(just|recently|newly)\b.{0,80}\b(started|increased|escalated|resumed)\b.{0,100}\b(harm|harass|dox|attack|sabotage|pollut|opposed donation|hostile donation)\b/,
      /\b(pay|compensate|fund|match|send money)\b.{0,80}\b(stop|pause|reduce)\b.{0,100}\b(new|newly|recently|just|escalated|increased)\b/,
      /\bi\s+just\s+increased\b.{0,120}\b(now|if)\b.{0,80}\b(pay|compensate|fund|match|send money)\b/,
    ],
  },
] as const;

export const PROHIBITED_PROPOSAL_FIXTURES: Array<{
  code: (typeof PROHIBITED_MORAL_TRADE_PATTERNS)[number]["code"];
  title: string;
  draft: MoralTradeProtocolDraftInput;
}> = [
  {
    code: "anti_threat_baseline",
    title: "Pay-me-or-I-will threat",
    draft: {
      format: "payment",
      offeredCause: "Financial support",
      requestedCause: "Community safety",
      offeredAction: "Pay me or I will start harassing this organization.",
      requestedAction: "Send the payment this week.",
      baselineStatement: "Without payment I will start harassing the organization next week.",
      duration: "30 days",
      exitConditions: "If payment is missing, I resume the conduct.",
      verificationMethod: "Manual review required",
      publicDescription: "This is a pay-me-or-I-will-X demand.",
    },
  },
  {
    code: "prohibited_illegal_or_fraud",
    title: "Fraudulent evidence request",
    draft: {
      format: "paid action",
      offeredCause: "Personal finance",
      requestedCause: "Animal welfare",
      offeredAction: "I will create a fake receipt and falsify audit evidence for the trade.",
      requestedAction: "Pay me after I upload the fraudulent proof.",
      baselineStatement:
        "Without the trade I would not create the false receipt or submit deceptive evidence.",
      duration: "1 week",
      exitConditions: "If the proof is rejected, the proposal should be closed.",
      verificationMethod: "Fake receipt upload",
      publicDescription: "This asks reviewers to accept fraudulent evidence.",
    },
  },
  {
    code: "prohibited_doxxing_or_harassment",
    title: "Doxxing pressure",
    draft: {
      format: "pledge",
      offeredCause: "Privacy",
      requestedCause: "Global poverty",
      offeredAction: "I will not publish the target's private address if the pledge is accepted.",
      requestedAction: "Donate to my preferred charity this month.",
      baselineStatement:
        "Without this trade I would release the private contact details and email their employer.",
      duration: "30 days",
      exitConditions: "If the donation is not logged, I will share the private address.",
      verificationMethod: "Manual safety review",
      publicDescription: "This makes private exposure conditional on compliance.",
    },
  },
  {
    code: "prohibited_political_campaign_offset",
    title: "Campaign contribution offset",
    draft: {
      format: "offset",
      offeredCause: "Political campaign",
      requestedCause: "Public health",
      offeredAction:
        "Redirect my planned campaign contribution to a candidate committee if someone matches it.",
      requestedAction: "Make a matching campaign donation to the opposing candidate's campaign.",
      baselineStatement:
        "Without the trade I would donate to the candidate committee this month.",
      duration: "Election cycle",
      exitConditions: "If the campaign receipts are not uploaded, close the trade.",
      verificationMethod: "Campaign donation receipt",
      publicDescription: "This tries to structure a political campaign contribution offset.",
    },
  },
  {
    code: "newly_escalated_harmful_behavior",
    title: "Strategic worsening",
    draft: {
      format: "payment",
      offeredCause: "De-escalation",
      requestedCause: "Animal welfare",
      offeredAction:
        "I just increased hostile donations against this cause and will stop if someone compensates me.",
      requestedAction: "Pay me to stop the newly escalated harmful behavior.",
      baselineStatement:
        "Without payment I will continue the hostile donation campaign I just increased.",
      duration: "60 days",
      exitConditions: "If no one pays, I continue the escalation.",
      verificationMethod: "Manual review required",
      publicDescription: "This asks for compensation after strategic worsening.",
    },
  },
];

export const THIRD_PARTY_EXTERNALITY_PROMPTS = [
  "Who might object to this trade?",
  "Could this create bad incentives?",
  "Could this harm people or values not represented by the parties?",
  "Does this proposal need external reviewer input?",
] as const;

export const ANTI_THREAT_BASELINE_RULES = [
  "No pay me or I will do X offers.",
  "No compensation for stopping newly escalated harmful behavior.",
  "Every proposal needs a no-trade baseline statement: what would you do absent this trade?",
  "Recent harmful behavior triggers a cooling-off period before compensation can be discussed.",
  "Coercive or suspicious baselines go to reviewer challenge before any matching or reliance.",
] as const;

const CLARIFICATION_QUESTION_BY_FIELD: Record<string, string> = {
  "Trade format":
    "Which trade format are you proposing: pledge swap, donation offset, public-good commitment, or another reviewed format?",
  "Offered action":
    "What concrete action will you take, and what observable boundary tells reviewers it was completed?",
  "Requested action": "What concrete reciprocal action should the counterparty take?",
  "No-trade baseline":
    "What would you do if this trade did not happen, and what prior intent or behavior could support that baseline?",
  "Duration or review period": "How long does the commitment run, and when should evidence be reviewed?",
  "Exit, pause, expiry, or unresolved evidence":
    "What should happen if evidence is missing, disputed, stale, or outside the agreed scope?",
  "Verification method":
    "Which receipt, public log, attestation, provider record, or audit trail would count as evidence?",
  "Public description and boundaries":
    "What can be shown publicly without implying escrow, legal enforceability, tax treatment, or objective moral endorsement?",
  "Offered and requested cause areas":
    "Which broad cause areas describe each side without revealing private wishes or contact details?",
  "Evidence method": "Which specific artifact should reviewers request before anyone relies on this draft?",
  "Counterfactual baseline":
    "What prior-intent note, past behavior record, or dated baseline statement would make the counterfactual claim reviewable?",
  "Party-relative benefit":
    "Why is each side better off than the no-trade default, using participant-relative priorities rather than a platform moral ranking?",
  "Privacy redaction":
    "Which exact wishes, contact details, sensitive constraints, or private source notes should be removed or moved behind consent-gated review?",
};

export const REJECTED_PROPOSAL_EXAMPLES = [
  {
    title: "Newly escalated threat",
    summary:
      "I will start harassing this organization unless someone pays me to stop. Rejected as threat creation.",
  },
  {
    title: "Paid de-escalation after strategic worsening",
    summary:
      "I just increased my opposed donations and now want compensation to stop. Rejected until baseline integrity is reviewed.",
  },
  {
    title: "Pressure on a vulnerable person",
    summary:
      "A proposal that makes private contact or public exposure conditional on compliance. Rejected for coercive pressure.",
  },
] as const;

function cleanText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function truncateText(value: string | null | undefined, maxLength = 180) {
  const cleaned = cleanText(value).replace(/\s+/g, " ");

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trim()}...`;
}

function lowerText(value: string | null | undefined) {
  return cleanText(value).toLowerCase();
}

function fieldHasSubstance(value: string | null | undefined, minLength = 1) {
  return cleanText(value).length >= minLength;
}

function getDraftMissingFields(input: MoralTradeProtocolDraftInput) {
  const missing = REQUIRED_DRAFT_FIELD_LABELS.filter(
    (field) => !fieldHasSubstance(input[field.key] as string | null | undefined, field.minLength),
  ).map((field) => field.label);

  if (!cleanText(input.offeredCause) || !cleanText(input.requestedCause)) {
    missing.push("Offered and requested cause areas");
  }

  return missing;
}

function draftText(input: MoralTradeProtocolDraftInput) {
  return [
    input.format,
    input.offeredCause,
    input.requestedCause,
    input.offeredAction,
    input.requestedAction,
    input.baselineStatement,
    input.exitConditions,
    input.verificationMethod,
    input.publicDescription,
  ]
    .map(lowerText)
    .join(" ");
}

function getPolicyConflicts(input: MoralTradeProtocolDraftInput) {
  const text = draftText(input);
  const conflicts: string[] = [];

  for (const entry of PROHIBITED_MORAL_TRADE_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      conflicts.push(entry.code);
    }
  }

  if (
    conflicts.some((conflict) =>
      [
        "prohibited_illegal_or_fraud",
        "prohibited_doxxing_or_harassment",
        "prohibited_political_campaign_offset",
        "newly_escalated_harmful_behavior",
      ].includes(conflict),
    )
  ) {
    conflicts.push("prohibited_content_review");
  }

  return [...new Set(conflicts)];
}

function assessFactualTrust(input: MoralTradeProtocolDraftInput) {
  const verification = lowerText(input.verificationMethod);
  const evidenceUrl = cleanText(input.evidenceUrl);
  const reasons: string[] = [];

  if (evidenceUrl) {
    reasons.push("A reviewable evidence locator is attached.");
  }

  if (/(audit|third-party|third party|provider|receipt|annual receipt|payment record)/.test(verification)) {
    reasons.push("The verification method points to a receipt, provider record, or external reviewer.");
  }

  if (/(manual review|peer witness|public pledge|log)/.test(verification)) {
    reasons.push("The verification method names a reviewable but lighter-weight evidence path.");
  }

  if (!verification) {
    reasons.push("No evidence method is named yet.");
  }

  if (evidenceUrl && /(audit|third-party|third party|provider|receipt|payment record)/.test(verification)) {
    return { rating: "high" as const, reasons };
  }

  if (reasons.length > 0 && verification) {
    return { rating: "medium" as const, reasons };
  }

  return { rating: "low" as const, reasons };
}

function assessCounterfactualBaseline(input: MoralTradeProtocolDraftInput) {
  const baseline = lowerText(input.baselineStatement);
  const reasons: string[] = [];

  if (baseline.length >= 80) {
    reasons.push("The baseline is detailed enough to support reviewer challenge.");
  } else if (baseline.length >= 20) {
    reasons.push("A baseline is stated, but reviewers may need prior-intent evidence.");
  } else {
    reasons.push("The no-trade default is missing or too terse.");
  }

  if (/(past|prior|already planned|would otherwise|receipt|record|intent|history)/.test(baseline)) {
    reasons.push("The baseline mentions prior intent, history, or a checkable record.");
  }

  if (baseline.length >= 80 && reasons.length > 1) {
    return { rating: "high" as const, reasons };
  }

  if (baseline.length >= 20) {
    return { rating: "medium" as const, reasons };
  }

  return { rating: "low" as const, reasons };
}

function assessExternalityReview(input: MoralTradeProtocolDraftInput) {
  const causes = [input.offeredCause, input.requestedCause].map(lowerText).join(" ");
  const text = draftText(input);
  const flags: string[] = [];

  if (POLITICAL_ADJACENT_CAUSES.some((cause) => causes.includes(cause))) {
    flags.push("political_adjacent_case");
  }

  if (input.format === "offset" || lowerText(input.format).includes("offset")) {
    flags.push("donation_offset_incentive_review");
  }

  if (input.format === "payment" || lowerText(input.format).includes("payment")) {
    flags.push("paid_action_pressure_review");
  }

  if (/(vulnerable|pressure|public exposure|retaliation|unrepresented|third party|externality)/.test(text)) {
    flags.push("third_party_or_pressure_review");
  }

  return {
    required: flags.length > 0,
    flags,
  };
}

function assessPartyRelativeBenefit(input: MoralTradeProtocolDraftInput) {
  const text = draftText(input);
  const reasons: string[] = [];
  const participantScoreReady =
    typeof input.participantImportance === "number" && Number.isFinite(input.participantImportance);
  const counterpartyScoreReady =
    typeof input.counterpartyThreshold === "number" && Number.isFinite(input.counterpartyThreshold);
  const benefitTextReady =
    /\b(mutual|mutually|both sides|each side|better off|better than|reciprocal benefit|party-relative|participant-relative|pareto|concession|matters less|more valuable)\b/.test(
      text,
    );

  if (participantScoreReady && counterpartyScoreReady) {
    reasons.push("Both participant-relative score fields are present.");
  } else {
    reasons.push("One or both participant-relative score fields are missing.");
  }

  if (benefitTextReady) {
    reasons.push("The draft explains reciprocal benefit without claiming objective moral value.");
  } else {
    reasons.push("The draft does not yet explain why both sides are better off than the no-trade default.");
  }

  if (participantScoreReady && counterpartyScoreReady && benefitTextReady) {
    return { rating: "high" as const, reasons };
  }

  if (participantScoreReady && counterpartyScoreReady) {
    return { rating: "medium" as const, reasons };
  }

  return { rating: "low" as const, reasons };
}

function assessPrivacyRedaction(input: MoralTradeProtocolDraftInput) {
  const publicText = [
    input.offeredAction,
    input.requestedAction,
    input.baselineStatement,
    input.publicDescription,
  ]
    .map(cleanText)
    .join(" ");
  const lower = publicText.toLowerCase();
  const flags: string[] = [];
  const reasons: string[] = [];

  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(publicText)) {
    flags.push("contact_email_in_public_draft");
  }

  if (/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(publicText)) {
    flags.push("contact_phone_in_public_draft");
  }

  if (
    /\b(?:share|publish|reveal|include|list|expose|show)\b.{0,60}\b(?:exact wish|private wish|contact details|source notes|raw notes|sensitive constraints)\b/i.test(
      publicText,
    )
  ) {
    flags.push("private_surface_disclosure_in_public_draft");
  }

  if (/\b(?:address is|home address|private address|contact me at|message me at|call me at)\b/i.test(lower)) {
    flags.push("contact_or_address_instruction_in_public_draft");
  }

  if (flags.length) {
    reasons.push("Public draft fields include contact details, exact wishes, source notes, or sensitive constraints that should stay redacted.");
    return {
      rating: "low" as const,
      flags: [...new Set(flags)],
      reasons,
    };
  }

  reasons.push("Public draft fields do not expose obvious contact details, exact wishes, source notes, or sensitive constraints.");
  return {
    rating: "high" as const,
    flags,
    reasons,
  };
}

function getProtocolFactorCodes({
  counterfactualBaseline,
  input,
  missingFields,
  partyRelativeBenefit,
  privacyRedaction,
}: {
  counterfactualBaseline: { rating: ProtocolTrustRating };
  input: MoralTradeProtocolDraftInput;
  missingFields: readonly string[];
  partyRelativeBenefit: { rating: ProtocolTrustRating };
  privacyRedaction: { rating: ProtocolTrustRating };
}) {
  const factors: string[] = [];

  if (!missingFields.length) {
    factors.push("terms_complete");
  }

  if (fieldHasSubstance(input.baselineStatement, 20)) {
    factors.push("baseline_stated");
  }

  if (counterfactualBaseline.rating === "high") {
    factors.push("baseline_credibility");
  } else if (
    counterfactualBaseline.rating === "medium" &&
    fieldHasSubstance(input.baselineStatement, 20)
  ) {
    factors.push("baseline_challenge_recommended");
  }

  if (fieldHasSubstance(input.verificationMethod)) {
    factors.push("evidence_rule_named");
  }

  if (
    typeof input.participantImportance === "number" ||
    typeof input.counterpartyThreshold === "number"
  ) {
    factors.push("participant_relative_scores");
  }

  if (partyRelativeBenefit.rating !== "low") {
    factors.push("party_relative_benefit");
  }

  if (privacyRedaction.rating === "high") {
    factors.push("privacy_safe_preview");
  }

  return factors;
}

function getClarificationQuestions(
  missingRequiredFields: readonly string[],
  underspecifiedFields: readonly string[],
) {
  return [...new Set([...missingRequiredFields, ...underspecifiedFields])]
    .slice(0, 5)
    .map((field) => ({
      field,
      question:
        CLARIFICATION_QUESTION_BY_FIELD[field] ??
        `What should reviewers know to evaluate ${field.toLowerCase()} without guessing?`,
    }));
}

function getUncertaintyFlags({
  missingRequiredFields,
  policyConflicts,
  factualTrust,
  counterfactualBaseline,
  externalityReview,
  partyRelativeBenefit,
  privacyRedaction,
}: {
  missingRequiredFields: readonly string[];
  policyConflicts: readonly string[];
  factualTrust: { rating: ProtocolTrustRating };
  counterfactualBaseline: { rating: ProtocolTrustRating };
  externalityReview: { required: boolean; flags: readonly string[] };
  partyRelativeBenefit: { rating: ProtocolTrustRating };
  privacyRedaction: { rating: ProtocolTrustRating; flags: readonly string[] };
}) {
  const flags: string[] = [];

  if (missingRequiredFields.length) {
    flags.push("required_fields_incomplete");
  }

  if (policyConflicts.length) {
    flags.push(...policyConflicts.map((conflict) => `policy_conflict:${conflict}`));
  }

  if (factualTrust.rating !== "high") {
    flags.push(`factual_trust_${factualTrust.rating}`);
  }

  if (counterfactualBaseline.rating !== "high") {
    flags.push(`counterfactual_baseline_${counterfactualBaseline.rating}`);
  }

  if (counterfactualBaseline.rating === "medium") {
    flags.push("baseline_challenge_recommended");
  }

  if (externalityReview.required) {
    flags.push(...externalityReview.flags.map((flag) => `externality:${flag}`));
  }

  if (partyRelativeBenefit.rating !== "high") {
    flags.push(`party_relative_benefit_${partyRelativeBenefit.rating}`);
  }

  if (privacyRedaction.rating !== "high") {
    flags.push(`privacy_redaction_${privacyRedaction.rating}`);
    flags.push(...privacyRedaction.flags.map((flag) => `privacy:${flag}`));
  }

  return [...new Set(flags)];
}

function verificationStep(
  key: (typeof MORAL_TRADE_VERIFICATION_LOOP_STEPS)[number]["key"],
  status: MoralTradeVerificationStepStatus,
  detail: string,
): MoralTradeVerificationLoopStep {
  const step = MORAL_TRADE_VERIFICATION_LOOP_STEPS.find((entry) => entry.key === key);

  if (!step) {
    throw new Error(`Unknown Moral Trade verification step: ${key}`);
  }

  return {
    key,
    label: step.label,
    status,
    detail,
    blocksMatchable: step.blocksMatchable,
  };
}

function buildVerificationLoop({
  counterfactualBaseline,
  externalityReview,
  factualTrust,
  factorCodes,
  missingRequiredFields,
  policyConflicts,
  privacyRedaction,
  status,
}: {
  counterfactualBaseline: { rating: ProtocolTrustRating };
  externalityReview: { required: boolean; flags: readonly string[] };
  factualTrust: { rating: ProtocolTrustRating };
  factorCodes: readonly string[];
  missingRequiredFields: readonly string[];
  policyConflicts: readonly string[];
  privacyRedaction: { rating: ProtocolTrustRating };
  status: ProtocolReviewStatus;
}) {
  const primaryBlockerExplanation = policyConflicts.length
    ? explainMoralTradeUserFacingBlocker(policyConflicts[0])
    : null;

  return [
    verificationStep(
      "schema_completeness",
      missingRequiredFields.length ? "needs_input" : "pass",
      missingRequiredFields.length
        ? `${missingRequiredFields.length} required field(s) need clarification before matching.`
        : "Required draft fields are present.",
    ),
    verificationStep(
      "anti_threat",
      policyConflicts.length ? "blocked" : "pass",
      policyConflicts.length
        ? `${primaryBlockerExplanation?.reasonCategory}: ${primaryBlockerExplanation?.plainLanguageStatus}`
        : "No deterministic prohibited-pattern conflict was detected.",
    ),
    verificationStep(
      "baseline_credibility",
      counterfactualBaseline.rating === "low" ? "needs_input" : "pass",
      counterfactualBaseline.rating === "low"
        ? "The no-trade baseline needs prior-intent, history, or dated support."
        : `Baseline credibility preview is ${counterfactualBaseline.rating}.`,
    ),
    verificationStep(
      "evidence_sufficiency",
      factualTrust.rating === "low" ? "needs_input" : "pass",
      factualTrust.rating === "low"
        ? "A scoped receipt, public log, attestation, payment record, or audit trail is still needed."
        : `Factual evidence readiness is ${factualTrust.rating}.`,
    ),
    verificationStep(
      "externality_trigger",
      externalityReview.required ? "human_review" : "pass",
      externalityReview.required
        ? `Human review is required for: ${externalityReview.flags.join(", ")}.`
        : "No material externality trigger was detected by the deterministic preview.",
    ),
    verificationStep(
      "privacy_redaction",
      privacyRedaction.rating === "low" ? "needs_input" : "pass",
      privacyRedaction.rating === "low"
        ? "Public fields need redaction before any match preview."
        : "Public fields pass the deterministic redaction preview.",
    ),
    verificationStep(
      "match_explanation",
      policyConflicts.length
        ? "blocked"
        : factorCodes.length && privacyRedaction.rating === "high"
          ? "pass"
          : "needs_input",
      policyConflicts.length
        ? `${primaryBlockerExplanation?.reasonCategory} blocks any match explanation from authorizing a preview.`
        : factorCodes.length && privacyRedaction.rating === "high"
          ? "Factor codes and redactions are available for reviewer-facing explanation."
          : "A privacy-safe factor-code explanation is not ready yet.",
    ),
    verificationStep(
      "human_review_routing",
      status === "blocked"
        ? "blocked"
        : status === "matchable" || status === "needs_human_review" || status === "challenge_window"
          ? "human_review"
          : "needs_input",
      status === "blocked"
        ? "Route to human safety review; do not publish or match."
        : status === "matchable"
          ? "Route to human review before reliance, disclosure, or agreement completion."
          : status === "challenge_window"
            ? "Open a challenge window before matching, reliance, or completion."
          : status === "needs_human_review"
            ? "Route to human review before matching or reliance."
            : "Complete the earlier gates before reviewer matchability routing.",
    ),
  ];
}

function getNextStepChecklist({
  missingRequiredFields,
  policyConflicts,
  artifactsToRequest,
  externalityReview,
  partyRelativeBenefit,
  privacyRedaction,
}: {
  missingRequiredFields: readonly string[];
  policyConflicts: readonly string[];
  artifactsToRequest: readonly string[];
  externalityReview: { required: boolean };
  partyRelativeBenefit: { rating: ProtocolTrustRating };
  privacyRedaction: { rating: ProtocolTrustRating };
}) {
  const steps: string[] = [];

  if (policyConflicts.length) {
    const explanation = explainMoralTradeUserFacingBlocker(policyConflicts[0]);
    steps.push(`${explanation.nextAction} ${explanation.moneyEffect}`);
  }

  if (missingRequiredFields.length) {
    steps.push("Answer the clarification questions tied to missing or thin fields before resubmission.");
  }

  if (artifactsToRequest.length) {
    steps.push("Attach one scoped evidence artifact or baseline record for each claim reviewers are asked to trust.");
  }

  if (externalityReview.required) {
    steps.push("Route third-party impact, political-adjacent, pressure, or perverse-incentive concerns to human review.");
  }

  if (partyRelativeBenefit.rating === "low") {
    steps.push("State why each side is better off than the no-trade default using participant-relative priorities.");
  }

  if (privacyRedaction.rating === "low") {
    steps.push("Remove contact details, exact wishes, sensitive constraints, and raw source notes from public fields or move them behind consent-gated review.");
  }

  steps.push("Keep exact wishes, contact details, sensitive constraints, and raw notes redacted until the proper consent stage.");

  return [...new Set(steps)].slice(0, 5);
}

function buildReviewerSummary({
  input,
  artifactsToRequest,
  userFacingBlockerExplanations,
  uncertaintyFlags,
}: {
  input: MoralTradeProtocolDraftInput;
  artifactsToRequest: readonly string[];
  userFacingBlockerExplanations: readonly MoralTradeUserFacingBlockerExplanation[];
  uncertaintyFlags: readonly string[];
}) {
  const offered = truncateText(input.offeredAction, 120) || "Not specified";
  const requested = truncateText(input.requestedAction, 120) || "Not specified";
  const baseline = truncateText(input.baselineStatement, 120) || "Not specified";
  const evidence =
    truncateText(input.verificationMethod, 80) ||
    artifactsToRequest[0] ||
    "No evidence method specified";
  const reviewBlockers = userFacingBlockerExplanations.length
    ? userFacingBlockerExplanations.map((entry) => entry.reasonCategory).join(", ")
    : "none from deterministic preview";
  const safeUnverifiedCategories = userFacingBlockerExplanations.length
    ? userFacingBlockerExplanations
        .map((entry) => entry.reasonCategory.toLowerCase())
        .slice(0, 4)
    : ["completion", "scope alignment", "artifact uniqueness"];
  const unverified = uncertaintyFlags.length
    ? safeUnverifiedCategories.join(", ")
    : "completion, scope alignment, and artifact uniqueness remain unverified until review";

  return [
    `What is being offered: ${offered}.`,
    `What is being requested: ${requested}.`,
    `Baseline claim: ${baseline}.`,
    `What evidence would count: ${evidence}.`,
    `Main policy flags: ${reviewBlockers}.`,
    `What remains unverified: ${unverified}.`,
    "This is not escrow, legal advice, tax advice, custody, or objective moral endorsement.",
  ].join(" ");
}

function evidenceRow({
  citation,
  claim,
  evidenceType,
  reviewerNote,
  status,
}: MoralTradeCitedEvidenceRow): MoralTradeCitedEvidenceRow {
  return {
    citation,
    claim: truncateText(claim, 140) || "Not specified",
    evidenceType,
    reviewerNote: truncateText(reviewerNote, 180),
    status,
  };
}

function buildCitedEvidenceTable({
  artifactsToRequest,
  counterfactualBaseline,
  factualTrust,
  input,
  policyConflicts,
}: {
  artifactsToRequest: readonly string[];
  counterfactualBaseline: { rating: ProtocolTrustRating };
  factualTrust: { rating: ProtocolTrustRating };
  input: MoralTradeProtocolDraftInput;
  policyConflicts: readonly string[];
}) {
  const rows: MoralTradeCitedEvidenceRow[] = [];
  const offeredAction = cleanText(input.offeredAction);
  const requestedAction = cleanText(input.requestedAction);
  const baselineStatement = cleanText(input.baselineStatement);
  const verificationMethod = cleanText(input.verificationMethod);
  const evidenceUrl = cleanText(input.evidenceUrl);

  if (offeredAction) {
    rows.push(
      evidenceRow({
        claim: offeredAction,
        evidenceType: "draft_field",
        citation: "draft.offered_action",
        status: "draft_claim",
        reviewerNote: "Treat as a participant claim until completion evidence or an attestation is reviewed.",
      }),
    );
  }

  if (requestedAction) {
    rows.push(
      evidenceRow({
        claim: requestedAction,
        evidenceType: "draft_field",
        citation: "draft.requested_action",
        status: "draft_claim",
        reviewerNote: "Verify the reciprocal request remains voluntary, bounded, and within the agreed scope.",
      }),
    );
  }

  if (baselineStatement) {
    rows.push(
      evidenceRow({
        claim: baselineStatement,
        evidenceType: "draft_field",
        citation: "draft.baseline_statement",
        status:
          counterfactualBaseline.rating === "high" ? "draft_claim" : "artifact_requested",
        reviewerNote:
          counterfactualBaseline.rating === "high"
            ? "Baseline is specific enough for reviewer triage, but still needs ordinary counterfactual review."
            : "Ask for prior-intent or past-behavior support before reliance.",
      }),
    );
  }

  if (verificationMethod || evidenceUrl) {
    rows.push(
      evidenceRow({
        claim: verificationMethod || "Evidence locator attached",
        evidenceType: evidenceUrl ? "evidence_locator" : "draft_field",
        citation: evidenceUrl || "draft.verification_method",
        status: evidenceUrl && factualTrust.rating !== "low" ? "evidence_locator" : "draft_claim",
        reviewerNote:
          evidenceUrl && factualTrust.rating !== "low"
            ? "Locator is available for reviewer inspection; scope, freshness, and uniqueness are still not implied."
            : "Verification method is named, but artifact scope and proof sufficiency remain unreviewed.",
      }),
    );
  }

  for (const artifact of artifactsToRequest) {
    rows.push(
      evidenceRow({
        claim: artifact,
        evidenceType: "artifact_request",
        citation: "review_instructions.artifacts_to_request",
        status: "artifact_requested",
        reviewerNote: "Requested artifact should be scoped to one claim and reviewed before reliance.",
      }),
    );
  }

  for (const conflict of policyConflicts) {
    const explanation = explainMoralTradeUserFacingBlocker(conflict);

    rows.push(
      evidenceRow({
        claim: explanation.reasonCategory,
        evidenceType: "policy_registry",
        citation: `policy_registry.${conflict}`,
        status: "policy_flag",
        reviewerNote: `${conflict}: ${explanation.plainLanguageStatus} ${explanation.nextAction}`,
      }),
    );
  }

  return rows.slice(0, 8);
}

export function formatProtocolReviewStatus(status: ProtocolReviewStatus) {
  switch (status) {
    case "blocked":
      return "Blocked";
    case "draft":
      return "Draft";
    case "matchable":
      return "Matchable after review";
    case "needs_evidence":
      return "Needs evidence";
    case "challenge_window":
      return "Challenge window";
    case "needs_human_review":
      return "Needs human review";
    default:
      return "Needs clarification";
  }
}

export function evaluateMoralTradeProtocolDraft(
  input: MoralTradeProtocolDraftInput,
): MoralTradeProtocolDraftReview {
  const missingRequiredFields = getDraftMissingFields(input);
  const policyConflicts = getPolicyConflicts(input);
  const factualTrust = assessFactualTrust(input);
  const counterfactualBaseline = assessCounterfactualBaseline(input);
  const externalityReview = assessExternalityReview(input);
  const partyRelativeBenefit = assessPartyRelativeBenefit(input);
  const privacyRedaction = assessPrivacyRedaction(input);
  const factorCodes = getProtocolFactorCodes({
    counterfactualBaseline,
    input,
    missingFields: missingRequiredFields,
    partyRelativeBenefit,
    privacyRedaction,
  });
  const underspecifiedFields: string[] = [];
  const artifactsToRequest: string[] = [];
  const reviewScope = [
    "Confirm the action and reciprocal request are voluntary and bounded.",
    "Check factual evidence separately from counterfactual baseline confidence.",
    "Do not treat participant-stated scores as a platform moral ranking.",
  ];
  const appealTriggers = [
    "duplicate proof",
    "coercive baseline",
    "wrong-scope evidence",
    "material factual error",
  ];

  if (factualTrust.rating === "low") {
    underspecifiedFields.push("Evidence method");
    artifactsToRequest.push("receipt, public log, witness attestation, payment record, or audit link");
  }

  if (counterfactualBaseline.rating === "low") {
    underspecifiedFields.push("Counterfactual baseline");
    artifactsToRequest.push("prior-intent note, past behavior record, or dated no-trade baseline statement");
  } else if (counterfactualBaseline.rating === "medium") {
    artifactsToRequest.push("prior-intent note, past behavior record, or dated no-trade baseline statement");
    reviewScope.push("Challenge the stated no-trade baseline unless prior-intent or past-behavior support is supplied.");
  }

  if (partyRelativeBenefit.rating === "low") {
    underspecifiedFields.push("Party-relative benefit");
  }

  if (privacyRedaction.rating === "low") {
    underspecifiedFields.push("Privacy redaction");
  }

  if (externalityReview.required) {
    factorCodes.push("externality_review_required", "human_review_required");
    reviewScope.push("Review third-party externalities and perverse-incentive risks.");
  }

  if (privacyRedaction.rating === "low") {
    factorCodes.push("human_review_required");
    reviewScope.push("Check that public-facing fields remove exact wishes, contact details, sensitive constraints, and raw source notes.");
  }

  let status: ProtocolReviewStatus = "matchable";
  let summary =
    "The draft has the core structure needed for a privacy-safe match preview, subject to normal human review before reliance.";

  if (!draftText(input)) {
    status = "draft";
    summary = "Start by adding reciprocal terms, a no-trade baseline, evidence, and exit rules.";
  } else if (policyConflicts.length) {
    status = "blocked";
    factorCodes.push("human_review_required");
    summary =
      "The draft resembles a threat, coercive baseline, or prohibited content pattern and should not be published.";
  } else if (missingRequiredFields.length) {
    status = "needs_clarification";
    summary = "Required fields are missing or too terse for review.";
  } else if (factualTrust.rating === "low") {
    status = "needs_evidence";
    summary = "The terms are structured, but the evidence is not specific enough for reliance.";
  } else if (privacyRedaction.rating === "low") {
    status = "needs_clarification";
    summary =
      "The draft needs redaction before matching because public fields include private or contact-like details.";
  } else if (partyRelativeBenefit.rating === "low") {
    status = "needs_clarification";
    summary =
      "The draft needs party-relative benefit framing before it can be treated as a moral-trade candidate.";
  } else if (counterfactualBaseline.rating === "low") {
    status = "needs_human_review";
    summary =
      "The draft needs reviewer attention before matching or reliance because baseline risks remain.";
  } else if (externalityReview.required) {
    status = "challenge_window";
    summary =
      "The draft is structurally reviewable, but material externality or incentive risks require a challenge window before matching or reliance.";
  }

  const uniqueUnderspecifiedFields = [...new Set(underspecifiedFields)];
  const uniqueArtifactsToRequest = [...new Set(artifactsToRequest)];
  const clarificationQuestions = getClarificationQuestions(
    missingRequiredFields,
    uniqueUnderspecifiedFields,
  );
  const uncertaintyFlags = getUncertaintyFlags({
    missingRequiredFields,
    policyConflicts,
    factualTrust,
    counterfactualBaseline,
    externalityReview,
    partyRelativeBenefit,
    privacyRedaction,
  });
  const userFacingBlockerSignals = [
    ...policyConflicts,
    ...(factualTrust.rating === "low" ? ["evidence_missing"] : []),
    ...(counterfactualBaseline.rating !== "high" ? ["baseline_review_needed"] : []),
    ...(privacyRedaction.rating === "low" ? ["privacy_disclosure_review"] : []),
    ...(externalityReview.required ? ["challenge_window_required"] : []),
    ...(missingRequiredFields.length ? ["required_fields_incomplete"] : []),
  ];
  const userFacingBlockerExplanations = userFacingBlockerSignals.length
    ? explainMoralTradeUserFacingBlockers(userFacingBlockerSignals)
    : [];
  const nextStepChecklist = getNextStepChecklist({
    missingRequiredFields,
    policyConflicts,
    artifactsToRequest: uniqueArtifactsToRequest,
    externalityReview,
    partyRelativeBenefit,
    privacyRedaction,
  });
  const verificationLoop = buildVerificationLoop({
    counterfactualBaseline,
    externalityReview,
    factualTrust,
    factorCodes,
    missingRequiredFields,
    policyConflicts,
    privacyRedaction,
    status,
  });

  return {
    status,
    summary,
    missingRequiredFields,
    underspecifiedFields: uniqueUnderspecifiedFields,
    policyConflicts,
    factorCodes: [...new Set(factorCodes)],
    clarificationQuestions,
    verificationLoop,
    uncertaintyFlags,
    userFacingBlockerExplanations,
    nextStepChecklist,
    citedEvidenceTable: buildCitedEvidenceTable({
      artifactsToRequest: uniqueArtifactsToRequest,
      counterfactualBaseline,
      factualTrust,
      input,
      policyConflicts,
    }),
    reviewerSummary: buildReviewerSummary({
      input,
      artifactsToRequest: uniqueArtifactsToRequest,
      userFacingBlockerExplanations,
      uncertaintyFlags,
    }),
    trustAssessment: {
      factualTrust,
      counterfactualBaseline,
      externalityReview,
      partyRelativeBenefit,
      privacyRedaction,
    },
    reviewInstructions: {
      artifactsToRequest: uniqueArtifactsToRequest,
      reviewScope,
      appealTriggers,
    },
  };
}

export function getWorkedExampleLaunchOrder(id: string) {
  return WORKED_EXAMPLE_ORDER_MAP.get(id) ?? WORKED_EXAMPLE_LAUNCH_ORDER.length;
}

export function sortWorkedExamplesByLaunchRisk<T extends { id: string }>(offers: readonly T[]) {
  return [...offers].sort(
    (left, right) => getWorkedExampleLaunchOrder(left.id) - getWorkedExampleLaunchOrder(right.id),
  );
}

export function getScoreConfidence(input: ProposalReviewInput): ScoreConfidence {
  const trustLevel = input.trustLevel ?? 0;

  if (trustLevel >= 4) {
    return "High";
  }

  if (trustLevel >= 3) {
    return "Medium";
  }

  return "Low";
}

export function getActionEvidenceSummary(input: ProposalReviewInput) {
  const verification = input.verification.trim();
  const lowerVerification = verification.toLowerCase();

  if (lowerVerification.includes("annual receipt")) {
    return "Receipts, donation records, and an annual review checkpoint.";
  }

  if (lowerVerification.includes("public pledge")) {
    return "A dated public pledge plus light follow-up evidence.";
  }

  if (lowerVerification.includes("payment")) {
    return "External payment records and completion evidence before any reliance.";
  }

  if (lowerVerification.includes("peer witness")) {
    return "Named witness attestation plus the participant's action log.";
  }

  if (lowerVerification.includes("manual review")) {
    return "Reviewer inspection of the named evidence before reliance.";
  }

  return verification || "Evidence method not yet specified.";
}

export function getBaselineConfidence(input: ProposalReviewInput): BaselineConfidence {
  if (input.mode === "offset" && input.evidenceUrl && input.moderationStatus === "clear") {
    return "Moderate";
  }

  if (input.mode === "offset") {
    return "Weak";
  }

  if (input.verification.toLowerCase().includes("annual receipt")) {
    return "Moderate";
  }

  if (input.verification.toLowerCase().includes("public pledge")) {
    return "Weak";
  }

  if (input.verification.toLowerCase().includes("payment")) {
    return "Weak";
  }

  return "Not assessed";
}

export function getBaselineEvidenceSummary(input: ProposalReviewInput) {
  if (input.mode === "offset" && input.baselineAmountUsd && input.baselineOpposedCause) {
    return `Baseline claim: $${input.baselineAmountUsd.toLocaleString("en-US")} would otherwise have gone to ${input.baselineOpposedCause}. Reviewers should ask for prior giving history, dated intent, and counterparty challenge.`;
  }

  if (input.mode === "payment") {
    return "Baseline should state whether the requested action was already likely; payment alone does not show counterfactual impact.";
  }

  if (input.verification.toLowerCase().includes("annual receipt")) {
    return "Review should compare receipts with prior giving history, declared intention, duration, and counterparty review.";
  }

  return "Review should capture a dated no-trade baseline and any evidence that the agreement changed behavior.";
}

export function getExternalityReviewSummary(input: ProposalReviewInput) {
  const causes = [input.offeredCause, input.requestedCause].filter(Boolean).join(" ").toLowerCase();

  if (POLITICAL_ADJACENT_CAUSES.some((cause) => causes.includes(cause))) {
    return "Political-adjacent case study. Keep below lower-risk examples and require externality review for affected communities and unrepresented values.";
  }

  if (input.mode === "offset") {
    return "Check whether redirection creates perverse incentives or harms people not represented by the two parties.";
  }

  if (input.mode === "payment") {
    return "Check whether payment could reward strategic delay, newly escalated behavior, or pressure on vulnerable people.";
  }

  return "Review whether the trade creates third-party harms, bad incentives, or objections from moral views not present in the match.";
}

function workflowStatusFromCurrentStatus(status: string | null | undefined): MoralTradeVerificationStepStatus {
  const normalized = String(status ?? "").toLowerCase();

  if (/(blocked|flagged|rejected)/.test(normalized)) {
    return "blocked";
  }

  if (/(review|challenge|pending|worked example|submitted)/.test(normalized)) {
    return "human_review";
  }

  if (/(needs|missing|unresolved)/.test(normalized)) {
    return "needs_input";
  }

  return "human_review";
}

function workflowStatusFromBaseline(confidence: BaselineConfidence): MoralTradeVerificationStepStatus {
  if (confidence === "Strong" || confidence === "Moderate") {
    return "pass";
  }

  if (confidence === "Weak") {
    return "needs_input";
  }

  return "human_review";
}

function workflowStatusFromEvidence(input: ProposalReviewInput): MoralTradeVerificationStepStatus {
  const verification = input.verification.trim().toLowerCase();

  if (!verification) {
    return "needs_input";
  }

  if (input.evidenceUrl && input.moderationStatus === "clear") {
    return "pass";
  }

  if (/(receipt|audit|payment|pledge|witness|manual review|evidence-gated)/.test(verification)) {
    return "human_review";
  }

  return "needs_input";
}

function workflowStatusFromExternality(input: ProposalReviewInput): MoralTradeVerificationStepStatus {
  const causes = [input.offeredCause, input.requestedCause].filter(Boolean).join(" ").toLowerCase();

  if (POLITICAL_ADJACENT_CAUSES.some((cause) => causes.includes(cause))) {
    return "human_review";
  }

  if (input.mode === "offset" || input.mode === "payment") {
    return "human_review";
  }

  return "pass";
}

function workflowStatusReason(
  key: OfferReviewWorkflowCard["key"],
  status: MoralTradeVerificationStepStatus,
  reason: string,
) {
  return {
    statusReasonCode: `${key}.${status}`,
    statusReason: `${status.replaceAll("_", " ")}: ${reason}`,
  };
}

export function getOfferReviewWorkflowCards(input: OfferReviewWorkflowInput): OfferReviewWorkflowCard[] {
  const currentStatus = input.currentStatus?.trim() || "Manual review required before reliance";
  const actionEvidence = getActionEvidenceSummary(input);
  const evidenceStatus = workflowStatusFromEvidence(input);
  const baselineConfidence = getBaselineConfidence(input);
  const baselineEvidence = getBaselineEvidenceSummary(input);
  const baselineStatus = workflowStatusFromBaseline(baselineConfidence);
  const externalityReview = getExternalityReviewSummary(input);
  const externalityStatus = workflowStatusFromExternality(input);
  const scoreConfidence = getScoreConfidence(input);
  const currentStatusWorkflowStatus = workflowStatusFromCurrentStatus(currentStatus);
  const currentStatusBlockerExplanation =
    currentStatusWorkflowStatus === "blocked"
      ? explainMoralTradeUserFacingBlocker(currentStatus)
      : null;
  const scoreSummary =
    input.offerImpact && input.minCounterpartyImpact
      ? `Participant-stated importance ${input.offerImpact}/10; counterparty minimum ${input.minCounterpartyImpact}/10. Confidence: ${scoreConfidence}.`
      : `Participant-stated scores are review context only. Confidence: ${scoreConfidence}.`;
  const currentStatusReason =
    currentStatusWorkflowStatus === "blocked"
      ? (currentStatusBlockerExplanation?.plainLanguageStatus ??
        "this record cannot move forward until the reviewed issue is resolved.")
      : currentStatusWorkflowStatus === "needs_input"
        ? "the visible status says required review information is missing or unresolved."
        : "the visible status is still a review state, not completion, custody, enforceability, or moral endorsement.";
  const evidenceStatusReason =
    evidenceStatus === "pass"
      ? "a named proof method and clear evidence locator are present for reviewer inspection."
      : evidenceStatus === "human_review"
        ? "a proof method is named, but the artifact still needs reviewer inspection before reliance."
        : "no reviewable proof method or evidence locator is attached yet.";
  const baselineStatusReason =
    baselineStatus === "pass"
      ? "the baseline is stated with enough support to enter counterfactual review."
      : baselineStatus === "needs_input"
        ? "the baseline is weak and needs dated no-trade evidence."
        : "the baseline has not been assessed enough to clear counterfactual review.";
  const externalityStatusReason =
    externalityStatus === "pass"
      ? "no offset, payment, or political-adjacent trigger was detected."
      : "the mode or causes can affect third parties, incentives, or unrepresented values.";

  return [
    {
      key: "current_status",
      label: "Status card",
      status: currentStatusWorkflowStatus,
      ...workflowStatusReason("current_status", currentStatusWorkflowStatus, currentStatusReason),
      factorCodes: ["status_visible", "human_review_required"],
      summary:
        currentStatusWorkflowStatus === "blocked"
          ? `${currentStatusBlockerExplanation?.reasonCategory ?? "Review is not complete"}. ${
              currentStatusBlockerExplanation?.obligationEffect ??
              "No new locked obligation should be created from this record."
            }`
          : `Status: ${currentStatus}.`,
      nextStep:
        currentStatusBlockerExplanation?.nextAction ??
        "Treat this as a review state, not a claim of completion, legal enforceability, custody, or moral endorsement.",
    },
    {
      key: "action_evidence",
      label: "Action evidence",
      status: evidenceStatus,
      ...workflowStatusReason("action_evidence", evidenceStatus, evidenceStatusReason),
      factorCodes: ["evidence_rule_named", "evidence_sufficiency"],
      summary:
        evidenceStatus === "needs_input"
          ? REVIEW_WORKFLOW_PARTICIPANT_COPY.needsEvidenceStatusCopy
          : actionEvidence,
      nextStep:
        "Attach or inspect one scoped artifact for each factual action claim before relying on the record.",
    },
    {
      key: "baseline_confidence",
      label: "Counterfactual baseline",
      status: baselineStatus,
      ...workflowStatusReason("baseline_confidence", baselineStatus, baselineStatusReason),
      factorCodes: ["baseline_stated", "baseline_credibility"],
      summary: `${baselineConfidence}: ${baselineEvidence}`,
      nextStep: REVIEW_WORKFLOW_PARTICIPANT_COPY.baselineHelperText,
    },
    {
      key: "externality_review",
      label: "Externality review",
      status: externalityStatus,
      ...workflowStatusReason("externality_review", externalityStatus, externalityStatusReason),
      factorCodes: ["externality_review_required", "human_review_required"],
      summary: externalityReview,
      nextStep:
        "Ask who is affected outside the two parties, what harm pathway exists, and what remedy or challenge window is available.",
    },
    {
      key: "participant_relative_scores",
      label: "Participant-relative scores",
      status: "pass",
      ...workflowStatusReason(
        "participant_relative_scores",
        "pass",
        "scores are bounded as participant-stated context, not platform ranking.",
      ),
      factorCodes: ["participant_relative_scores", "no_global_moral_ranking"],
      summary: scoreSummary,
      nextStep: REVIEW_WORKFLOW_PARTICIPANT_COPY.importanceScoreNote,
    },
    {
      key: "appeal_scope",
      label: "Appeal scope",
      status: "human_review",
      ...workflowStatusReason(
        "appeal_scope",
        "human_review",
        "appeals require reviewer handling and must stay within the reviewed issue.",
      ),
      factorCodes: ["appealable_review_scope", "reviewer_summary"],
      summary:
        "Appeals should target the specific reviewed claim, evidence row, baseline concern, disclosure decision, or policy flag.",
      nextStep: REVIEW_WORKFLOW_PARTICIPANT_COPY.appealCopy,
    },
  ];
}

export const MARKETPLACE_REVIEW_FACTOR_PRIORITY = [
  "human_review_required",
  "evidence_rule_named",
  "baseline_credibility",
  "externality_review_required",
  "no_global_moral_ranking",
  "appealable_review_scope",
] as const;

export function getOfferReviewCardInstrumentation(
  input: OfferReviewWorkflowInput,
): OfferReviewCardInstrumentation {
  const workflowCards = getOfferReviewWorkflowCards(input);
  const nextActionCard =
    workflowCards.find((card) => card.key !== "current_status" && card.status !== "pass") ??
    workflowCards.find((card) => card.status !== "pass") ??
    workflowCards[0];
  const allFactorCodes = new Set(workflowCards.flatMap((card) => card.factorCodes));
  const priorityFactorCodes = MARKETPLACE_REVIEW_FACTOR_PRIORITY.filter((code) =>
    allFactorCodes.has(code),
  );
  const fallbackFactorCodes = Array.from(allFactorCodes).filter(
    (code) => !priorityFactorCodes.includes(code as (typeof MARKETPLACE_REVIEW_FACTOR_PRIORITY)[number]),
  );

  return {
    factorCodes: [...priorityFactorCodes, ...fallbackFactorCodes].slice(0, 5),
    label: nextActionCard.label,
    nextStep: nextActionCard.nextStep,
    status: nextActionCard.status,
    statusReasonCode: nextActionCard.statusReasonCode,
    statusReason: nextActionCard.statusReason,
  };
}

const REVIEW_WORKFLOW_SAMPLE_INPUT: OfferReviewWorkflowInput = {
  mode: "offset",
  verification: "Manual review required",
  trustLevel: 4,
  baselineAmountUsd: 1000,
  baselineOpposedCause: "Gun rights",
  requestedMatchingAmountUsd: 1000,
  requestedOpposedCause: "Gun control",
  evidenceUrl: "https://example.com/reviewable-evidence",
  moderationStatus: "clear",
  offeredCause: "Gun rights",
  requestedCause: "Gun control",
  currentStatus: "Worked example; manual review required before reliance",
  offerImpact: 8,
  minCounterpartyImpact: 7,
};

function workflowContractCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): OfferReviewWorkflowContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getOfferReviewWorkflowContract(): OfferReviewWorkflowContract {
  const sampleDetailCards = getOfferReviewWorkflowCards(REVIEW_WORKFLOW_SAMPLE_INPUT);
  const sampleMarketplaceCard = getOfferReviewCardInstrumentation(REVIEW_WORKFLOW_SAMPLE_INPUT);
  const sampleUserFacingBlockerExplanations = [
    explainMoralTradeUserFacingBlocker("anti_threat_baseline"),
    explainMoralTradeUserFacingBlocker("evidence_scope_missing"),
    explainMoralTradeUserFacingBlocker("payout_release_variance_unresolved"),
  ];

  return {
    version: MORAL_TRADE_REVIEW_WORKFLOW_CONTRACT_VERSION,
    purpose:
      "Public contract for the review workflow cards shown on offer detail pages, worked examples, marketplace cards, and homepage preview cards.",
    statuses: ["pass", "needs_input", "human_review", "blocked"],
    detailWorkflowCards: OFFER_REVIEW_WORKFLOW_CARD_CONTRACTS,
    policyEnforcedWorkflow: OFFER_REVIEW_POLICY_ENFORCED_WORKFLOW,
    reviewStateOutcomes: [...OFFER_REVIEW_STATE_OUTCOMES],
    marketplaceFactorPriority: [...MARKETPLACE_REVIEW_FACTOR_PRIORITY],
    participantCopyTemplates: REVIEW_WORKFLOW_PARTICIPANT_COPY,
    userFacingBlockerExplanations: getMoralTradeUserFacingBlockerExplanations(),
    sampleUserFacingBlockerExplanations,
    forbiddenUserFacingExplanationTerms: [
      ...MORAL_TRADE_USER_FACING_EXPLANATION_FORBIDDEN_TERMS,
    ],
    invariants: [
      "Every detail workflow card must expose at least one factor code, one status-reason code, one status reason, and one next-step instruction.",
      "Marketplace cards must show prioritized factor codes derived from the same workflow contract.",
      "Marketplace cards must inherit the selected detail card status reason.",
      "Every participant-facing block, pause, rejection, or manual-review state maps to a plain-language reason category, next action, money effect, obligation effect, and appeal or correction path where applicable.",
      "User-facing blocker explanations do not expose private facts, source hashes, provider payloads, raw review evidence, account-security details, or sensitive counterparty facts.",
      "Participant-relative scores must preserve no_global_moral_ranking.",
      "Appeals must preserve appealable_review_scope and reviewer_summary factor codes.",
      "Action evidence, baseline confidence, and externality review must remain separate cards.",
    ],
    sampleDetailCards,
    sampleMarketplaceCard,
    contractTests: [
      "review_workflow_contract_validator",
      "offer_review_workflow_card_smoke",
      "user_facing_blocker_explanation_smoke",
      "marketplace_factor_card_smoke",
      "technical_spec_review_workflow_smoke",
    ],
  };
}

export function validateOfferReviewWorkflowContract(
  contract: OfferReviewWorkflowContract = getOfferReviewWorkflowContract(),
): OfferReviewWorkflowContractValidation {
  const contractKeys = contract.detailWorkflowCards.map((card) => card.key);
  const sampleKeys = contract.sampleDetailCards.map((card) => card.key);
  const workflowStepKeys = contract.policyEnforcedWorkflow.map((step) => step.key);
  const contractFactorCodes = new Set(
    contract.detailWorkflowCards.flatMap((card) => card.requiredFactorCodes),
  );
  const sampleFactorCodes = new Set(
    contract.sampleDetailCards.flatMap((card) => card.factorCodes),
  );
  const explanationKeys = contract.userFacingBlockerExplanations.map(
    (entry) => entry.key,
  );
  const requiredExplanationKeys: MoralTradeUserFacingBlockerKey[] = [
    "needs_evidence",
    "baseline_review",
    "privacy_review",
    "safety_review",
    "account_security",
    "reviewer_or_neutral_review",
    "recipient_destination",
    "clearing_confirmation",
    "agreement_change",
    "appeal_correction",
    "production_payout",
    "general_review_pending",
  ];
  const explanationText = contract.userFacingBlockerExplanations
    .map((entry) =>
      [
        entry.reasonCategory,
        entry.plainLanguageStatus,
        entry.nextAction,
        entry.moneyEffect,
        entry.obligationEffect,
        entry.appealOrCorrectionPath,
        entry.privacyBoundary,
      ].join(" "),
    )
    .join(" ");
  const checks = [
    workflowContractCheck(
      "card-key-coverage",
      "Detail card contract covers every rendered workflow card",
      contractKeys.length === 6 &&
        sampleKeys.length === contractKeys.length &&
        contractKeys.every((key, index) => sampleKeys[index] === key),
      `${contractKeys.join(", ")} -> ${sampleKeys.join(", ")}`,
    ),
    workflowContractCheck(
      "status-reason-coverage",
      "Every detail and marketplace card exposes a structured status reason",
      contract.detailWorkflowCards.every((card) => card.statusReasonRule.trim().length > 0) &&
        contract.sampleDetailCards.every(
          (card) =>
            card.statusReasonCode === `${card.key}.${card.status}` &&
            card.statusReason.startsWith(`${card.status.replaceAll("_", " ")}:`),
        ) &&
        contract.sampleMarketplaceCard.statusReasonCode.length > 0 &&
        contract.sampleMarketplaceCard.statusReason.startsWith(
          `${contract.sampleMarketplaceCard.status.replaceAll("_", " ")}:`,
        ),
      contract.sampleDetailCards
        .map((card) => `${card.statusReasonCode}=${card.statusReason}`)
        .join(" | "),
    ),
    workflowContractCheck(
      "factor-code-coverage",
      "Required factor codes appear in rendered samples",
      Array.from(contractFactorCodes).every((code) => sampleFactorCodes.has(code)),
      Array.from(contractFactorCodes).join(", "),
    ),
    workflowContractCheck(
      "marketplace-factor-priority",
      "Marketplace factor priority is bounded and rendered",
      contract.marketplaceFactorPriority.length >= 5 &&
        contract.sampleMarketplaceCard.factorCodes.length > 0 &&
        contract.sampleMarketplaceCard.factorCodes.length <= 5 &&
        contract.sampleMarketplaceCard.factorCodes.every((code) => contractFactorCodes.has(code)),
      contract.sampleMarketplaceCard.factorCodes.join(", "),
    ),
    workflowContractCheck(
      "no-global-ranking-and-appeal-scope",
      "No-global-ranking and appeal-scope factors are preserved",
      contractFactorCodes.has("no_global_moral_ranking") &&
        contractFactorCodes.has("appealable_review_scope") &&
        contract.sampleDetailCards.some((card) => card.factorCodes.includes("no_global_moral_ranking")) &&
        contract.sampleDetailCards.some((card) => card.factorCodes.includes("appealable_review_scope")),
      Array.from(sampleFactorCodes).join(", "),
    ),
    workflowContractCheck(
      "separate-trust-dimensions",
      "Action evidence, baseline confidence, and externality review remain separate",
      contractKeys.includes("action_evidence") &&
        contractKeys.includes("baseline_confidence") &&
        contractKeys.includes("externality_review"),
      contractKeys.join(", "),
    ),
    workflowContractCheck(
      "participant-copy-templates",
      "Participant copy preserves baseline, evidence, safety, score, and appeal boundaries",
      /What would you do if this trade did not happen/i.test(
        contract.participantCopyTemplates.baselineHelperText,
      ) &&
        /Status: Needs evidence/i.test(contract.participantCopyTemplates.needsEvidenceStatusCopy) &&
        /reviewable proof method/i.test(contract.participantCopyTemplates.needsEvidenceStatusCopy) &&
        /cannot be published/i.test(contract.participantCopyTemplates.safetyWarningCopy) &&
        /threat|coercive|newly escalated/i.test(contract.participantCopyTemplates.safetyWarningCopy) &&
        /participant's own stated priorities/i.test(contract.participantCopyTemplates.importanceScoreNote) &&
        /not a platform judgment/i.test(contract.participantCopyTemplates.importanceScoreNote) &&
        /appeal the specific claim/i.test(contract.participantCopyTemplates.appealCopy) &&
        /unrelated moral disagreements/i.test(contract.participantCopyTemplates.appealCopy),
      Object.values(contract.participantCopyTemplates).join(" | "),
    ),
    workflowContractCheck(
      "user-facing-blocker-explanation-coverage",
      "User-facing blocker explanations cover review, money, obligation, and appeal/correction effects",
      requiredExplanationKeys.every((key) => explanationKeys.includes(key)) &&
        contract.userFacingBlockerExplanations.every(
          (entry) =>
            entry.reasonCategory &&
            entry.plainLanguageStatus &&
            entry.nextAction &&
            entry.moneyEffect &&
            entry.obligationEffect &&
            entry.appealOrCorrectionPath &&
            entry.privacyBoundary,
        ),
      explanationKeys.join(", "),
    ),
    workflowContractCheck(
      "user-facing-blocker-privacy-boundary",
      "User-facing blocker explanations avoid raw internal and private-detail terms",
      contract.forbiddenUserFacingExplanationTerms.every(
        (term) => !explanationText.toLowerCase().includes(term.toLowerCase()),
      ) &&
        contract.invariants.some((entry) => /plain-language reason category/i.test(entry)) &&
        contract.invariants.some((entry) => /do not expose private facts/i.test(entry)),
      explanationText,
    ),
    workflowContractCheck(
      "sample-blocker-explanations",
      "Sample blocker explanations prove safety, evidence, and payout categories",
      contract.sampleUserFacingBlockerExplanations.some(
        (entry) => entry.key === "safety_review",
      ) &&
        contract.sampleUserFacingBlockerExplanations.some(
          (entry) => entry.key === "needs_evidence",
        ) &&
        contract.sampleUserFacingBlockerExplanations.some(
          (entry) => entry.key === "production_payout",
        ),
      contract.sampleUserFacingBlockerExplanations
        .map((entry) => `${entry.key}:${entry.reasonCategory}`)
        .join(", "),
    ),
    workflowContractCheck(
      "policy-enforced-workflow-path",
      "Source-document workflow diagram is represented as ordered contract steps",
      [
        "user_draft",
        "schema_normalizer",
        "completeness_check",
        "anti_threat_policy_engine",
        "baseline_credibility_assessment",
        "evidence_checklist_generator",
        "privacy_redaction_engine",
        "rule_based_match_engine",
        "match_card_factor_codes",
        "human_review",
        "agreement_room",
        "evidence_submission",
        "reviewer_decision",
        "audit_log_provenance_record",
      ].every((key, index) => workflowStepKeys[index] === key) &&
        contract.policyEnforcedWorkflow.every(
          (step) => step.label && step.contractSurface && step.enforcement,
        ) &&
        contract.policyEnforcedWorkflow[contract.policyEnforcedWorkflow.length - 1]?.enforcement ===
          "provenance",
      workflowStepKeys.join(" -> "),
    ),
    workflowContractCheck(
      "review-state-outcome-coverage",
      "Workflow outcomes cover clarification, block, evidence, challenge, dispute, matchable, and reviewed completion states",
      [
        "needs_clarification",
        "blocked",
        "needs_evidence",
        "challenge_window",
        "disputed_unresolved",
        "matchable",
        "completion_reviewed",
      ].every((outcome) => contract.reviewStateOutcomes.includes(outcome)),
      contract.reviewStateOutcomes.join(", "),
    ),
    workflowContractCheck(
      "contract-tests",
      "Review workflow contract test hooks are named",
      [
        "review_workflow_contract_validator",
        "offer_review_workflow_card_smoke",
        "user_facing_blocker_explanation_smoke",
        "marketplace_factor_card_smoke",
        "technical_spec_review_workflow_smoke",
      ].every((hook) => contract.contractTests.includes(hook)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-review-workflow-contract",
    validatorVersion: MORAL_TRADE_REVIEW_WORKFLOW_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
