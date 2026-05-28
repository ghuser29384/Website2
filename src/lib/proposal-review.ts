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
  { key: "exitConditions", label: "Exit, pause, expiry, or unresolved-evidence rule", minLength: 20 },
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
  "Exit, pause, expiry, or unresolved-evidence rule":
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
  input,
  missingFields,
  partyRelativeBenefit,
  privacyRedaction,
}: {
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
        ? `Policy conflict codes: ${policyConflicts.join(", ")}.`
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
        ? "Policy conflicts block any match explanation from authorizing a preview."
        : factorCodes.length && privacyRedaction.rating === "high"
          ? "Factor codes and redactions are available for reviewer-facing explanation."
          : "A privacy-safe factor-code explanation is not ready yet.",
    ),
    verificationStep(
      "human_review_routing",
      status === "blocked"
        ? "blocked"
        : status === "matchable" || status === "needs_human_review"
          ? "human_review"
          : "needs_input",
      status === "blocked"
        ? "Route to human safety review; do not publish or match."
        : status === "matchable"
          ? "Route to human review before reliance, disclosure, or agreement completion."
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
    steps.push("Do not publish or match this draft; route it to human safety review with the policy conflict codes.");
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
  policyConflicts,
  uncertaintyFlags,
}: {
  input: MoralTradeProtocolDraftInput;
  artifactsToRequest: readonly string[];
  policyConflicts: readonly string[];
  uncertaintyFlags: readonly string[];
}) {
  const offered = truncateText(input.offeredAction, 120) || "Not specified";
  const requested = truncateText(input.requestedAction, 120) || "Not specified";
  const baseline = truncateText(input.baselineStatement, 120) || "Not specified";
  const evidence =
    truncateText(input.verificationMethod, 80) ||
    artifactsToRequest[0] ||
    "No evidence method specified";
  const policy = policyConflicts.length ? policyConflicts.join(", ") : "none from deterministic preview";
  const unverified = uncertaintyFlags.length
    ? uncertaintyFlags.slice(0, 4).join(", ")
    : "completion, scope alignment, and artifact uniqueness remain unverified until review";

  return [
    `What is being offered: ${offered}.`,
    `What is being requested: ${requested}.`,
    `Baseline claim: ${baseline}.`,
    `What evidence would count: ${evidence}.`,
    `Main policy flags: ${policy}.`,
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
    rows.push(
      evidenceRow({
        claim: conflict,
        evidenceType: "policy_registry",
        citation: `policy_registry.${conflict}`,
        status: "policy_flag",
        reviewerNote: "Policy flag blocks publishing or matching until safety review resolves it.",
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
    summary = "The terms are structured, but the evidence rule is not specific enough for reliance.";
  } else if (counterfactualBaseline.rating === "low" || externalityReview.required) {
    status = "needs_human_review";
    summary =
      "The draft needs reviewer attention before matching or reliance because baseline or externality risks remain.";
  } else if (privacyRedaction.rating === "low") {
    status = "needs_clarification";
    summary =
      "The draft needs redaction before matching because public fields include private or contact-like details.";
  } else if (partyRelativeBenefit.rating === "low") {
    status = "needs_clarification";
    summary =
      "The draft needs party-relative benefit framing before it can be treated as a moral-trade candidate.";
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
      policyConflicts,
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
