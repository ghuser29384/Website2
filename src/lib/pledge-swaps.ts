export const PLEDGE_SWAP_MANUAL_REVIEW_SCHEMA_VERSION =
  "pledge_swap_manual_review_preview.v1";
export const PLEDGE_SWAP_MANUAL_REVIEW_RELEASE_STAGE =
  "pledge_swap_preview_manual_review_only";

export type PledgeSwapBaselineConfidence = "low" | "medium" | "high";

export type PledgeSwapGateStatus =
  | "pass"
  | "needs_input"
  | "human_review"
  | "blocked"
  | "not_required_for_stage";

export type PledgeSwapOrdinaryServiceClassification =
  | "not_ordinary_service_market"
  | "ordinary_service_or_procurement"
  | "unclear";

export type PledgeSwapActionReversibility =
  | "reversible_or_low_stakes"
  | "continuing_but_suspendable"
  | "irreversible_or_high_stakes"
  | "unknown";

export type PledgeSwapThirdPartyObligation =
  | "none_known"
  | "possible_or_unknown"
  | "conflict_declared";

export type PledgeSwapRepresentativeAuthority =
  | "self_only"
  | "claims_representative_authority"
  | "unknown";

export type PledgeSwapBinarySafetyAssertion =
  | "clear"
  | "possible_or_unknown"
  | "triggered";

export interface PledgeSwapManualReviewInput {
  offeredAction: string;
  requestedAction: string;
  noTradeBaseline: string;
  additionalityStatement: string;
  maxObligationDays: number | null;
  reciprocalReleaseRule: string;
  withdrawalBeforeLockRule: string;
  challengeWindowDays: number | null;
  neutralReviewRequired: boolean;
  evidencePlan: string;
  leastIntrusiveAlternative: string;
  baselinePredatesOffer: boolean;
  baselineConfidence: PledgeSwapBaselineConfidence;
  compensatedMoralAction: boolean;
  compensationSummary: string;
  ordinaryServiceClassification: PledgeSwapOrdinaryServiceClassification;
  negativeCommitmentScope: string;
  actionReversibility: PledgeSwapActionReversibility;
  thirdPartyObligation: PledgeSwapThirdPartyObligation;
  representativeAuthority: PledgeSwapRepresentativeAuthority;
  reportingIntegrity: PledgeSwapBinarySafetyAssertion;
  civilRights: PledgeSwapBinarySafetyAssertion;
  participantAutonomy: PledgeSwapBinarySafetyAssertion;
  confidentialityPrivacy: PledgeSwapBinarySafetyAssertion;
  evidenceAuthenticity: PledgeSwapBinarySafetyAssertion;
  financialCrime: PledgeSwapBinarySafetyAssertion;
  nonTransferability: PledgeSwapBinarySafetyAssertion;
  regulatedGoodsHazardousActivity: PledgeSwapBinarySafetyAssertion;
  cyberAbuseDigitalIntegrity: PledgeSwapBinarySafetyAssertion;
  antiCorruptionProcessIntegrity: PledgeSwapBinarySafetyAssertion;
  performanceBondPreviewEnabled: boolean;
}

export interface PledgeSwapGate {
  key: string;
  label: string;
  status: PledgeSwapGateStatus;
  detail: string;
  nextAction: string;
  blockerCodes: string[];
}

export interface PledgeSwapPerformanceSchedule {
  startBoundary: string;
  checkpointCadence: string;
  evidenceDue: string;
  challengeWindow: string;
  latePerformanceRule: string;
  suspensionRule: string;
  cureRule: string;
  reciprocalRelease: string;
  maxObligationDays: number | null;
}

export interface PledgeSwapManualReviewPreview {
  schemaVersion: typeof PLEDGE_SWAP_MANUAL_REVIEW_SCHEMA_VERSION;
  releaseStage: typeof PLEDGE_SWAP_MANUAL_REVIEW_RELEASE_STAGE;
  matchCandidateCreatesDeal: false;
  relianceBearing: false;
  captureAllowed: false;
  requiresFinalLockProposal: true;
  requiresFreshConfirmations: true;
  requiresAgreementAmendmentForPostLockChanges: true;
  commitmentReservationRequiredBeforeLock: true;
  doubleCountingAllowed: false;
  atomicSettlementAtLockBoundary: true;
  leastIntrusiveEvidenceRequired: true;
  manualReviewRequiredBeforeReliance: true;
  maxObligationDays: number | null;
  challengeWindowDays: number | null;
  performanceSchedule: PledgeSwapPerformanceSchedule;
  gates: PledgeSwapGate[];
  blockedGateCount: number;
  humanReviewGateCount: number;
  readyForManualReview: boolean;
}

const TERM_MIN_LENGTH = 12;
const SAFE_DEFAULT_NEXT_ACTION =
  "Keep this item available for reviewer confirmation before any lock proposal.";

const keywordGroups = {
  reportingIntegrity: [
    "do not report",
    "don't report",
    "not report",
    "withdraw complaint",
    "drop complaint",
    "stay silent",
    "keep silent",
    "hide misconduct",
    "false statement",
    "delete evidence",
    "suppress evidence",
  ],
  civilRights: [
    "discriminate",
    "exclude people based on",
    "protected trait",
    "retaliate",
    "segregate",
    "refuse service",
    "fire someone",
  ],
  participantAutonomy: [
    "must accept",
    "under pressure",
    "dependent on me",
    "immigration status",
    "housing crisis",
    "medical crisis",
    "caregiver",
    "employer power",
  ],
  confidentialityPrivacy: [
    "password",
    "access token",
    "private message",
    "dox",
    "doxx",
    "location log",
    "medical record",
    "immigration record",
    "employee record",
    "client record",
    "patient record",
    "student record",
    "trade secret",
  ],
  financialCrime: [
    "money laundering",
    "sanctions",
    "stolen funds",
    "stolen card",
    "fake receipt",
    "chargeback",
    "refund abuse",
    "card testing",
    "circular routing",
  ],
  transferability: [
    "assign this agreement",
    "sell this agreement",
    "resell",
    "tokenize",
    "securitize",
    "secondary market",
    "moral trade credit",
    "transfer rights",
  ],
  regulatedGoods: [
    "weapon",
    "firearm",
    "explosive",
    "controlled substance",
    "hazardous chemical",
    "unsafe medical",
    "biosecurity",
  ],
  cyberAbuse: [
    "hack",
    "malware",
    "phishing",
    "ddos",
    "denial of service",
    "unauthorized access",
    "scrape private",
    "exploit",
    "botting",
  ],
  antiCorruption: [
    "bribe",
    "kickback",
    "improper payment",
    "vote buying",
    "procurement decision",
    "official favor",
    "undisclosed conflict",
  ],
};

function compactText(...parts: string[]) {
  return parts.join(" ").trim().toLowerCase();
}

function hasKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isPresent(value: string) {
  return value.trim().length >= TERM_MIN_LENGTH;
}

function makeGate(gate: PledgeSwapGate): PledgeSwapGate {
  return gate;
}

function normalizeManualGateStatus(
  assertion: PledgeSwapBinarySafetyAssertion,
  textTriggered: boolean,
) {
  if (assertion === "triggered" || textTriggered) {
    return "blocked" as const;
  }

  if (assertion === "possible_or_unknown") {
    return "human_review" as const;
  }

  return "pass" as const;
}

function statusDetail(status: PledgeSwapGateStatus, passDetail: string, reviewDetail: string, blockedDetail: string) {
  if (status === "blocked") {
    return blockedDetail;
  }

  if (status === "human_review" || status === "needs_input") {
    return reviewDetail;
  }

  return passDetail;
}

export function buildPledgeSwapManualReviewPreview(
  input: PledgeSwapManualReviewInput,
): PledgeSwapManualReviewPreview {
  const fullText = compactText(
    input.offeredAction,
    input.requestedAction,
    input.noTradeBaseline,
    input.additionalityStatement,
    input.reciprocalReleaseRule,
    input.withdrawalBeforeLockRule,
    input.evidencePlan,
    input.compensationSummary,
    input.negativeCommitmentScope,
  );

  const performanceTermsPresent =
    isPresent(input.offeredAction) &&
    isPresent(input.requestedAction) &&
    Number.isInteger(input.maxObligationDays) &&
    Number(input.maxObligationDays) > 0 &&
    Number(input.maxObligationDays) <= 366 &&
    isPresent(input.reciprocalReleaseRule) &&
    isPresent(input.withdrawalBeforeLockRule) &&
    Number.isInteger(input.challengeWindowDays) &&
    Number(input.challengeWindowDays) >= 3 &&
    Number(input.challengeWindowDays) <= 45 &&
    input.neutralReviewRequired &&
    isPresent(input.evidencePlan) &&
    isPresent(input.leastIntrusiveAlternative);

  const baselineStatus =
    !isPresent(input.noTradeBaseline) || !isPresent(input.additionalityStatement)
      ? "needs_input"
      : !input.baselinePredatesOffer || input.baselineConfidence === "low"
        ? "human_review"
        : "pass";

  const compensatedActionStatus =
    !input.compensatedMoralAction
      ? "not_required_for_stage"
      : !isPresent(input.compensationSummary) ||
          input.ordinaryServiceClassification !== "not_ordinary_service_market"
        ? "human_review"
        : "pass";

  const negativeCommitmentStatus = input.negativeCommitmentScope.trim()
    ? isPresent(input.negativeCommitmentScope)
      ? "human_review"
      : "needs_input"
    : "not_required_for_stage";

  const reversibilityStatus =
    input.actionReversibility === "irreversible_or_high_stakes"
      ? "blocked"
      : input.actionReversibility === "unknown"
        ? "human_review"
        : "pass";

  const thirdPartyStatus =
    input.thirdPartyObligation === "conflict_declared"
      ? "blocked"
      : input.thirdPartyObligation === "possible_or_unknown"
        ? "human_review"
        : "pass";

  const representativeStatus =
    input.representativeAuthority === "claims_representative_authority"
      ? "human_review"
      : input.representativeAuthority === "unknown"
        ? "human_review"
        : "pass";

  const reportingStatus = normalizeManualGateStatus(
    input.reportingIntegrity,
    hasKeyword(fullText, keywordGroups.reportingIntegrity),
  );
  const civilRightsStatus = normalizeManualGateStatus(
    input.civilRights,
    hasKeyword(fullText, keywordGroups.civilRights),
  );
  const autonomyStatus = normalizeManualGateStatus(
    input.participantAutonomy,
    hasKeyword(fullText, keywordGroups.participantAutonomy),
  );
  const privacyStatus = normalizeManualGateStatus(
    input.confidentialityPrivacy,
    hasKeyword(fullText, keywordGroups.confidentialityPrivacy),
  );
  const financialCrimeStatus = normalizeManualGateStatus(
    input.financialCrime,
    hasKeyword(fullText, keywordGroups.financialCrime),
  );
  const transferabilityStatus = normalizeManualGateStatus(
    input.nonTransferability,
    hasKeyword(fullText, keywordGroups.transferability),
  );
  const regulatedGoodsStatus = normalizeManualGateStatus(
    input.regulatedGoodsHazardousActivity,
    hasKeyword(fullText, keywordGroups.regulatedGoods),
  );
  const cyberStatus = normalizeManualGateStatus(
    input.cyberAbuseDigitalIntegrity,
    hasKeyword(fullText, keywordGroups.cyberAbuse),
  );
  const antiCorruptionStatus = normalizeManualGateStatus(
    input.antiCorruptionProcessIntegrity,
    hasKeyword(fullText, keywordGroups.antiCorruption),
  );
  const evidenceAuthenticityStatus =
    input.evidenceAuthenticity === "triggered"
      ? "blocked"
      : input.evidenceAuthenticity === "possible_or_unknown" || isPresent(input.evidencePlan)
        ? "human_review"
        : "needs_input";

  const gates = [
    makeGate({
      key: "baseline-integrity",
      label: "Baseline integrity",
      status: baselineStatus,
      detail: statusDetail(
        baselineStatus,
        "Baseline and additionality statements are present for reviewer confirmation.",
        "Baseline confidence or timing needs neutral baseline-integrity review before lock.",
        "Baseline integrity is blocked.",
      ),
      nextAction:
        baselineStatus === "pass"
          ? SAFE_DEFAULT_NEXT_ACTION
          : "Provide a pre-existing no-trade baseline and an additionality statement before any lock proposal.",
      blockerCodes: baselineStatus === "pass" ? [] : ["baseline_integrity_review"],
    }),
    makeGate({
      key: "performance-terms",
      label: "Performance terms and schedule",
      status: performanceTermsPresent ? "pass" : "needs_input",
      detail: performanceTermsPresent
        ? "Action, reciprocal action, max duration, release, challenge window, neutral review, and evidence plan are stated."
        : "The pledge needs action units, maximum duration, reciprocal release, withdrawal-before-lock, challenge, and evidence terms.",
      nextAction: performanceTermsPresent
        ? SAFE_DEFAULT_NEXT_ACTION
        : "Complete the pledge-swap manual-review terms before publishing.",
      blockerCodes: performanceTermsPresent ? [] : ["performance_terms_missing"],
    }),
    makeGate({
      key: "compensated-moral-action",
      label: "Compensated moral action",
      status: compensatedActionStatus,
      detail:
        compensatedActionStatus === "not_required_for_stage"
          ? "No compensation terms are proposed in this preview."
          : compensatedActionStatus === "pass"
            ? "Compensation is bounded and classified outside ordinary-service procurement for reviewer confirmation."
            : "Compensation terms require legal, labor, tax, coercion, ordinary-service, and externality review before any payable state.",
      nextAction:
        compensatedActionStatus === "not_required_for_stage"
          ? "Do not add compensation after lock without a superseding proposal."
          : "Keep compensation terms frozen for neutral manual review before reliance or payment.",
      blockerCodes:
        compensatedActionStatus === "not_required_for_stage" || compensatedActionStatus === "pass"
          ? []
          : ["compensated_action_review"],
    }),
    makeGate({
      key: "negative-commitment-scope",
      label: "Negative or abstention scope",
      status: negativeCommitmentStatus,
      detail:
        negativeCommitmentStatus === "not_required_for_stage"
          ? "No negative or abstention commitment is proposed."
          : "Any abstention term must define covered action, time window, substitutes, exclusions, and evidence standard.",
      nextAction:
        negativeCommitmentStatus === "not_required_for_stage"
          ? "Do not count abstention unless a later lock proposal freezes that scope."
          : "Reviewer must confirm substitution scope and abstention evidence separately from action evidence.",
      blockerCodes:
        negativeCommitmentStatus === "not_required_for_stage" ? [] : ["negative_commitment_review"],
    }),
    makeGate({
      key: "action-reversibility",
      label: "Action reversibility",
      status: reversibilityStatus,
      detail: statusDetail(
        reversibilityStatus,
        "The action is described as low-stakes, reversible, or suspendable.",
        "The action needs reversibility review before lock.",
        "Irreversible or high-stakes personal decisions remain blocked in this preview stage.",
      ),
      nextAction:
        reversibilityStatus === "blocked"
          ? "Remove irreversible or high-stakes personal decisions from the pledge swap."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: reversibilityStatus === "blocked" ? ["action_reversibility_blocked"] : [],
    }),
    makeGate({
      key: "third-party-obligation",
      label: "Third-party obligations",
      status: thirdPartyStatus,
      detail: statusDetail(
        thirdPartyStatus,
        "No known employment, fiduciary, contract, school, family, or care obligation is declared.",
        "Possible third-party duties need review because participants can only waive their own rights.",
        "Declared conflicts with third-party duties block this preview.",
      ),
      nextAction:
        thirdPartyStatus === "blocked"
          ? "Remove terms that would breach third-party duties or obtain verified authority."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: thirdPartyStatus === "blocked" ? ["third_party_obligation_blocked"] : [],
    }),
    makeGate({
      key: "representative-authority",
      label: "Representative authority",
      status: representativeStatus,
      detail:
        representativeStatus === "pass"
          ? "The draft says the participant binds only their own actions, resources, and evidence."
          : "Claims to bind a company, charity, fund, campaign, employer, family member, or other entity need authority review.",
      nextAction:
        representativeStatus === "pass"
          ? SAFE_DEFAULT_NEXT_ACTION
          : "Verify exact authority before any lock proposal relies on another person's or entity's action.",
      blockerCodes: representativeStatus === "pass" ? [] : ["representative_authority_review"],
    }),
    makeGate({
      key: "reporting-integrity",
      label: "Reporting integrity",
      status: reportingStatus,
      detail: statusDetail(
        reportingStatus,
        "No reporting suppression or false-statement term is declared or detected.",
        "Potential reporting-integrity issues need manual review.",
        "Silence, complaint withdrawal, false statements, or evidence suppression cannot be brokered.",
      ),
      nextAction:
        reportingStatus === "blocked"
          ? "Remove silence, complaint, truthfulness, or evidence-suppression terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: reportingStatus === "blocked" ? ["reporting_integrity_blocked"] : [],
    }),
    makeGate({
      key: "civil-rights",
      label: "Civil rights and discrimination",
      status: civilRightsStatus,
      detail: statusDetail(
        civilRightsStatus,
        "No protected-trait discrimination, exclusion, retaliation, or harassment term is declared or detected.",
        "Possible civil-rights impact needs manual review.",
        "Protected-trait discrimination or retaliation cannot be brokered.",
      ),
      nextAction:
        civilRightsStatus === "blocked"
          ? "Remove discriminatory, exclusionary, retaliatory, or harassment terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: civilRightsStatus === "blocked" ? ["civil_rights_blocked"] : [],
    }),
    makeGate({
      key: "participant-autonomy",
      label: "Participant autonomy",
      status: autonomyStatus,
      detail: statusDetail(
        autonomyStatus,
        "No known duress, dependency, crisis, or authority-pressure condition is declared or detected.",
        "Possible vulnerability, coercion, or undue influence needs manual review.",
        "Coercive or dependency-based bargains cannot be brokered.",
      ),
      nextAction:
        autonomyStatus === "blocked"
          ? "Remove pressure, dependency, or crisis-leverage terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: autonomyStatus === "blocked" ? ["participant_autonomy_blocked"] : [],
    }),
    makeGate({
      key: "confidentiality-privacy",
      label: "Confidentiality and privacy rights",
      status: privacyStatus,
      detail: statusDetail(
        privacyStatus,
        "No unauthorized private data, credential, location, record, or confidential-information term is declared or detected.",
        "Possible privacy or confidentiality impact needs manual review.",
        "Unauthorized disclosure, credential sharing, doxxing, or misuse of private data cannot be brokered.",
      ),
      nextAction:
        privacyStatus === "blocked"
          ? "Remove private-data, credential, doxxing, or unauthorized disclosure terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: privacyStatus === "blocked" ? ["confidentiality_privacy_blocked"] : [],
    }),
    makeGate({
      key: "evidence-authenticity",
      label: "Evidence authenticity",
      status: evidenceAuthenticityStatus,
      detail:
        evidenceAuthenticityStatus === "blocked"
          ? "Evidence authenticity is blocked."
          : "Evidence authenticity remains a separate review from whether the evidence supports the action claim.",
      nextAction:
        evidenceAuthenticityStatus === "blocked"
          ? "Remove fabricated, replayed, selectively edited, or source-detached evidence claims."
          : "Use source-traceable evidence and keep one evidence artifact from satisfying multiple locked agreements.",
      blockerCodes:
        evidenceAuthenticityStatus === "blocked" ? ["evidence_authenticity_blocked"] : [],
    }),
    makeGate({
      key: "financial-crime",
      label: "Financial crime and fraud",
      status: financialCrimeStatus,
      detail: statusDetail(
        financialCrimeStatus,
        "No unusual funds, refund, receipt, sanctions, or fraud pattern is declared or detected.",
        "Possible financial-crime or payment-fraud indicators need manual review.",
        "Financial crime, sanctions evasion, stolen funds, fabricated receipts, or refund abuse cannot be brokered.",
      ),
      nextAction:
        financialCrimeStatus === "blocked"
          ? "Remove suspicious funds, receipt, refund, or sanctions-evasion terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: financialCrimeStatus === "blocked" ? ["financial_crime_blocked"] : [],
    }),
    makeGate({
      key: "non-transferability",
      label: "Non-transferability",
      status: transferabilityStatus,
      detail: statusDetail(
        transferabilityStatus,
        "Agreement rights are non-transferable and participant-specific by default.",
        "Possible assignment, resale, tokenization, or credit issuance needs manual review.",
        "Transferable moral-trade credits, secondary markets, assignment, or securitization are blocked.",
      ),
      nextAction:
        transferabilityStatus === "blocked"
          ? "Remove transfer, resale, tokenization, credit, or assignment terms."
          : "Keep the proposal participant-specific and non-transferable.",
      blockerCodes: transferabilityStatus === "blocked" ? ["non_transferability_blocked"] : [],
    }),
    makeGate({
      key: "regulated-goods-hazardous-activity",
      label: "Regulated goods and hazardous activity",
      status: regulatedGoodsStatus,
      detail: statusDetail(
        regulatedGoodsStatus,
        "No regulated goods or hazardous physical-world activity is declared or detected.",
        "Possible regulated or hazardous activity needs manual review.",
        "Weapons, controlled substances, unsafe medical activity, explosives, and comparable hazards are blocked.",
      ),
      nextAction:
        regulatedGoodsStatus === "blocked"
          ? "Remove regulated goods or hazardous activity terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes:
        regulatedGoodsStatus === "blocked" ? ["regulated_goods_hazardous_activity_blocked"] : [],
    }),
    makeGate({
      key: "cyber-abuse-digital-integrity",
      label: "Cyber abuse and digital integrity",
      status: cyberStatus,
      detail: statusDetail(
        cyberStatus,
        "No unauthorized access, malware, botting, spam, phishing, scraping, or platform manipulation is declared or detected.",
        "Possible digital-system integrity issues need manual review.",
        "Unauthorized access, malware, phishing, denial-of-service, botting, or data exfiltration are blocked.",
      ),
      nextAction:
        cyberStatus === "blocked"
          ? "Remove unauthorized digital-system or platform-manipulation terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes: cyberStatus === "blocked" ? ["cyber_abuse_blocked"] : [],
    }),
    makeGate({
      key: "anti-corruption-process-integrity",
      label: "Anti-corruption and process integrity",
      status: antiCorruptionStatus,
      detail: statusDetail(
        antiCorruptionStatus,
        "No bribe, kickback, vote-buying, improper-inducement, or process-integrity term is declared or detected.",
        "Possible process-integrity issue needs manual review.",
        "Bribes, kickbacks, vote buying, improper official favors, and process manipulation are blocked.",
      ),
      nextAction:
        antiCorruptionStatus === "blocked"
          ? "Remove bribery, kickback, vote-buying, or improper process terms."
          : SAFE_DEFAULT_NEXT_ACTION,
      blockerCodes:
        antiCorruptionStatus === "blocked" ? ["anti_corruption_process_integrity_blocked"] : [],
    }),
    makeGate({
      key: "post-lock-amendment",
      label: "Post-lock amendment path",
      status: "human_review",
      detail:
        "Any material post-lock change requires a superseding amendment record and renewed confirmations.",
      nextAction:
        "Create a new matched-trade lock proposal for changed action, evidence, deadline, baseline, compensation, remedy, privacy, or third-party terms.",
      blockerCodes: ["agreement_amendment_required_before_lock"],
    }),
    makeGate({
      key: "performance-bond-preview",
      label: "Optional performance bond",
      status: input.performanceBondPreviewEnabled ? "human_review" : "not_required_for_stage",
      detail: input.performanceBondPreviewEnabled
        ? "The optional bond can support factual trust only after amount, posting, return, forfeiture, challenge, and neutral review terms are frozen."
        : "No performance bond is proposed for this preview.",
      nextAction: input.performanceBondPreviewEnabled
        ? "Keep bond terms bounded, non-punitive, neutral-review gated, and unavailable for high-stakes decisions."
        : "Do not imply escrow, punishment, reputation, or counterfactual proof from the absence of a bond.",
      blockerCodes: input.performanceBondPreviewEnabled ? ["performance_bond_review"] : [],
    }),
  ];

  const blockedGateCount = gates.filter((gate) => gate.status === "blocked").length;
  const humanReviewGateCount = gates.filter(
    (gate) => gate.status === "human_review" || gate.status === "needs_input",
  ).length;

  return {
    schemaVersion: PLEDGE_SWAP_MANUAL_REVIEW_SCHEMA_VERSION,
    releaseStage: PLEDGE_SWAP_MANUAL_REVIEW_RELEASE_STAGE,
    matchCandidateCreatesDeal: false,
    relianceBearing: false,
    captureAllowed: false,
    requiresFinalLockProposal: true,
    requiresFreshConfirmations: true,
    requiresAgreementAmendmentForPostLockChanges: true,
    commitmentReservationRequiredBeforeLock: true,
    doubleCountingAllowed: false,
    atomicSettlementAtLockBoundary: true,
    leastIntrusiveEvidenceRequired: true,
    manualReviewRequiredBeforeReliance: true,
    maxObligationDays: input.maxObligationDays,
    challengeWindowDays: input.challengeWindowDays,
    performanceSchedule: {
      startBoundary: "Duties start only after a frozen lock proposal receives fresh final confirmations.",
      checkpointCadence:
        input.maxObligationDays && input.maxObligationDays <= 14
          ? "Midpoint and completion checkpoints."
          : "Weekly checkpoints until completion or reciprocal release.",
      evidenceDue: input.evidencePlan.trim() || "Evidence plan is not complete.",
      challengeWindow: input.challengeWindowDays
        ? `${input.challengeWindowDays} days after evidence is due.`
        : "Challenge window is not complete.",
      latePerformanceRule:
        "Late performance suspends reciprocal future duties until cure or neutral review resolves the claim.",
      suspensionRule:
        "If one side misses a required checkpoint, future duties are suspended rather than escalated.",
      cureRule:
        "Cure is limited to the stated review period and cannot impose punitive or public-shaming remedies.",
      reciprocalRelease:
        input.reciprocalReleaseRule.trim() || "Reciprocal release rule is not complete.",
      maxObligationDays: input.maxObligationDays,
    },
    gates,
    blockedGateCount,
    humanReviewGateCount,
    readyForManualReview: blockedGateCount === 0 && performanceTermsPresent,
  };
}

export function validatePledgeSwapManualReviewInput(
  input: PledgeSwapManualReviewInput,
): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(input.maxObligationDays) || Number(input.maxObligationDays) <= 0) {
    errors.push("Set a positive maximum obligation duration for the pledge swap.");
  } else if (Number(input.maxObligationDays) > 366) {
    errors.push("Maximum pledge-swap obligation duration must be 366 days or less in this preview stage.");
  }

  if (!isPresent(input.reciprocalReleaseRule)) {
    errors.push("State how future obligations are reciprocally released.");
  }

  if (!isPresent(input.withdrawalBeforeLockRule)) {
    errors.push("State how either side can withdraw before final lock.");
  }

  if (
    !Number.isInteger(input.challengeWindowDays) ||
    Number(input.challengeWindowDays) < 3 ||
    Number(input.challengeWindowDays) > 45
  ) {
    errors.push("Set a neutral-review challenge window between 3 and 45 days.");
  }

  if (!input.neutralReviewRequired) {
    errors.push("Confirm that disputes, challenges, and forfeiture decisions require neutral review.");
  }

  if (!isPresent(input.evidencePlan)) {
    errors.push("State the least-intrusive evidence plan for the promised action.");
  }

  if (!isPresent(input.leastIntrusiveAlternative)) {
    errors.push("Name a less-intrusive evidence alternative before private or high-burden evidence.");
  }

  const preview = buildPledgeSwapManualReviewPreview(input);
  const blockedGates = preview.gates.filter((gate) => gate.status === "blocked");

  for (const gate of blockedGates) {
    errors.push(`${gate.label}: ${gate.nextAction}`);
  }

  return errors;
}

export function summarizePledgeSwapManualReviewForNotes(
  preview: PledgeSwapManualReviewPreview,
) {
  const gateSummary = preview.gates
    .map((gate) => `${gate.label}: ${gate.status.replaceAll("_", " ")}`)
    .join("; ");

  return [
    "Pledge-swap manual-review preview:",
    `Schema version: ${preview.schemaVersion}`,
    `Release stage: ${preview.releaseStage}`,
    "Match candidate creates deal: no",
    "Reliance-bearing before final lock confirmation: no",
    "Capture allowed before final lock confirmation: no",
    "Requires frozen matched-trade lock proposal and fresh confirmations: yes",
    "Post-lock changes require amendment and renewed confirmations: yes",
    "Double counting allowed: no",
    "Atomic settlement at lock boundary: yes",
    `Max obligation duration: ${preview.maxObligationDays ?? "unset"} days`,
    `Challenge window: ${preview.challengeWindowDays ?? "unset"} days`,
    `Performance schedule: ${preview.performanceSchedule.checkpointCadence} ${preview.performanceSchedule.evidenceDue}`,
    `Manual-review gates: ${gateSummary}`,
  ].join("\n");
}

export function createDemoPledgeSwapManualReviewPreview() {
  return buildPledgeSwapManualReviewPreview({
    offeredAction:
      "I will follow a vegetarian diet for 30 days with a simple public log of material exceptions.",
    requestedAction:
      "The counterparty will donate to an evidence-focused global health charity during the same 30-day period.",
    noTradeBaseline:
      "Without this trade, I would not make this short diet commitment during the next 30 days.",
    additionalityStatement:
      "The reciprocal donation creates the reason to try this commitment now rather than later.",
    maxObligationDays: 30,
    reciprocalReleaseRule:
      "If one side exits under the stated rule, both sides are released from future obligations while completed or disputed past obligations remain reviewable.",
    withdrawalBeforeLockRule:
      "Either side can withdraw before final lock without penalty or private-detail escalation.",
    challengeWindowDays: 14,
    neutralReviewRequired: true,
    evidencePlan:
      "Public log or dated receipt is enough unless a reviewer approves a narrower private artifact.",
    leastIntrusiveAlternative:
      "Use a dated self-log or receipt before private messages, location history, or third-party exposure.",
    baselinePredatesOffer: true,
    baselineConfidence: "medium",
    compensatedMoralAction: false,
    compensationSummary: "",
    ordinaryServiceClassification: "not_ordinary_service_market",
    negativeCommitmentScope: "",
    actionReversibility: "continuing_but_suspendable",
    thirdPartyObligation: "none_known",
    representativeAuthority: "self_only",
    reportingIntegrity: "clear",
    civilRights: "clear",
    participantAutonomy: "clear",
    confidentialityPrivacy: "clear",
    evidenceAuthenticity: "possible_or_unknown",
    financialCrime: "clear",
    nonTransferability: "clear",
    regulatedGoodsHazardousActivity: "clear",
    cyberAbuseDigitalIntegrity: "clear",
    antiCorruptionProcessIntegrity: "clear",
    performanceBondPreviewEnabled: false,
  });
}
