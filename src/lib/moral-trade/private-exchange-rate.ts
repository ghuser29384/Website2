export const MORAL_TRADE_PRIVATE_EXCHANGE_RATE_CONTRACT_VERSION =
  "moral-trade-private-exchange-rate-v0.1-2026-06";
export const MORAL_TRADE_PRIVATE_EXCHANGE_RATE_VALIDATOR_VERSION =
  "moral-trade-private-exchange-rate-validator-v0.1";

export type MoralTradePrivateExchangeRateTransition =
  | "draft_preview"
  | "match_candidate_generation"
  | "matched_trade_lock"
  | "clearing_run"
  | "payment_capture"
  | "reliance"
  | "public_metric_publication"
  | "release_gate_promotion";

export type MoralTradePrivateExchangeRateSubjectType =
  | "offset_offer"
  | "pledge_swap_offer"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "bargaining_round_record";

export type MoralTradePrivateExchangeRateQuoteType =
  | "clearing_ratio_bound"
  | "side_payment_bound"
  | "counterpart_volume_bound"
  | "action_money_tradeoff"
  | "empirical_effectiveness_tradeoff"
  | "manual_review";

export type MoralTradePrivateExchangeRateDisclosureScope =
  | "participant_only"
  | "reviewer_only"
  | "counterparty_band_only"
  | "public_suppressed";

export type MoralTradePrivateExchangeRateQuoteState =
  | "draft"
  | "active"
  | "locked"
  | "expired"
  | "superseded"
  | "withdrawn";

export type MoralTradePrivateExchangeRatePolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradePrivateExchangeRateQuoteRecord {
  recordId: string;
  subjectType: MoralTradePrivateExchangeRateSubjectType;
  subjectId: string;
  participantIdHash: string;
  privateExchangeRateQuotePolicyRef: string;
  policyStatus: MoralTradePrivateExchangeRatePolicyStatus;
  quoteType: MoralTradePrivateExchangeRateQuoteType;
  privateQuoteTermsHash: string;
  acceptableMinBps: number;
  acceptableMaxBps: number;
  settlementCurrency: string | null;
  disclosureScope: MoralTradePrivateExchangeRateDisclosureScope;
  publicMoralPriceProhibited: boolean;
  publicCausePricePublished: boolean;
  globalExchangeRatePublished: boolean;
  publicEffectivenessComparisonPublished: boolean;
  moralValueInferencePublished: boolean;
  exactCounterpartyQuoteDisclosed: boolean;
  rawPrivateTermsPublic: boolean;
  quoteState: MoralTradePrivateExchangeRateQuoteState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradePrivateExchangeRateEvaluationInput {
  transition: MoralTradePrivateExchangeRateTransition;
  privateExchangeRateRequired: boolean;
  requiredAffectedParticipantCount: number;
  checkedAt?: string;
  records: MoralTradePrivateExchangeRateQuoteRecord[];
}

export interface MoralTradePrivateExchangeRateEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradePrivateExchangeRateTransition;
  checkedAt: string;
  privateExchangeRateRequired: boolean;
  reviewedRecordCount: number;
  activeQuoteRecordCount: number;
  privacySafeRecordCount: number;
  affectedParticipantQuoteCount: number;
  requiredAffectedParticipantCount: number;
  publicPriceBlockerCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradePrivateExchangeRateTransitionDefinition {
  key: MoralTradePrivateExchangeRateTransition;
  label: string;
  requiresQuoteRecord: boolean;
  requiresActiveQuote: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradePrivateExchangeRateCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradePrivateExchangeRateValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-private-exchange-rate-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradePrivateExchangeRateCheck[];
  blockers: string[];
}

export interface MoralTradePrivateExchangeRateContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  publicNonPriceRule: string;
  privacyBoundary: string;
  affectedParticipantCoverageRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradePrivateExchangeRateSubjectType[];
  quoteTypes: MoralTradePrivateExchangeRateQuoteType[];
  disclosureScopes: MoralTradePrivateExchangeRateDisclosureScope[];
  quoteStates: MoralTradePrivateExchangeRateQuoteState[];
  policyStatuses: MoralTradePrivateExchangeRatePolicyStatus[];
  transitionDefinitions: MoralTradePrivateExchangeRateTransitionDefinition[];
  sampleEvaluations: MoralTradePrivateExchangeRateEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_private_exchange_rate_quote_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["private_exchange_rate_quote"] as const;

const SUBJECT_TYPES: MoralTradePrivateExchangeRateSubjectType[] = [
  "offset_offer",
  "pledge_swap_offer",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "bargaining_round_record",
];

const QUOTE_TYPES: MoralTradePrivateExchangeRateQuoteType[] = [
  "clearing_ratio_bound",
  "side_payment_bound",
  "counterpart_volume_bound",
  "action_money_tradeoff",
  "empirical_effectiveness_tradeoff",
  "manual_review",
];

const DISCLOSURE_SCOPES: MoralTradePrivateExchangeRateDisclosureScope[] = [
  "participant_only",
  "reviewer_only",
  "counterparty_band_only",
  "public_suppressed",
];

const QUOTE_STATES: MoralTradePrivateExchangeRateQuoteState[] = [
  "draft",
  "active",
  "locked",
  "expired",
  "superseded",
  "withdrawn",
];

const POLICY_STATUSES: MoralTradePrivateExchangeRatePolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const ACTIVE_QUOTE_STATES = new Set<MoralTradePrivateExchangeRateQuoteState>([
  "active",
  "locked",
]);

const MONEY_QUOTE_TYPES = new Set<MoralTradePrivateExchangeRateQuoteType>([
  "side_payment_bound",
  "action_money_tradeoff",
]);

const TRANSITION_DEFINITIONS: MoralTradePrivateExchangeRateTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresQuoteRecord: false,
    requiresActiveQuote: false,
    userFacingBlockerCategory:
      "Private exchange-rate quotes are preview-only until participant-owned willingness-to-trade terms are hashed and reviewed",
  },
  {
    key: "match_candidate_generation",
    label: "Match-candidate generation",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Matching waits for affected participants' private quote records and privacy-safe compatibility bands",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Lock requires private ratio, side-payment, or counterpart-volume quote records without public moral-price leakage",
  },
  {
    key: "clearing_run",
    label: "Clearing run",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Clearing cannot use participant willingness-to-trade terms as public cause prices or global exchange rates",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Payment capture cannot rely on public-price, global-rate, or private-cap-leaking quote records",
  },
  {
    key: "reliance",
    label: "Reliance",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Reliance-bearing states require private quote records that disclose at most compatibility bands",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Public metrics may say trades cleared within participant bounds but cannot publish cause prices, moral exchange rates, or willingness-to-trade terms",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresQuoteRecord: true,
    requiresActiveQuote: true,
    userFacingBlockerCategory:
      "Release promotion requires private exchange-rate quote evidence and suppression of public moral-price claims",
  },
];

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradePrivateExchangeRateCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 8);
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
}

function isValidIso(value: string) {
  return Number.isFinite(Date.parse(value));
}

function isStaleTimestamp(value: string, checkedAt: string) {
  if (!isValidIso(value) || !isValidIso(checkedAt)) {
    return true;
  }

  const maxAgeMs = MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000;

  return Date.parse(checkedAt) - Date.parse(value) > maxAgeMs;
}

function isValidCurrency(value: string | null) {
  return value === null || /^[A-Z]{3}$/.test(value);
}

function hasPublicPriceLeak(record: MoralTradePrivateExchangeRateQuoteRecord) {
  return (
    record.publicCausePricePublished ||
    record.globalExchangeRatePublished ||
    record.publicEffectivenessComparisonPublished ||
    record.moralValueInferencePublished ||
    record.exactCounterpartyQuoteDisclosed ||
    record.rawPrivateTermsPublic
  );
}

function evaluateRecord({
  checkedAt,
  record,
  requiresActiveQuote,
}: {
  checkedAt: string;
  record: MoralTradePrivateExchangeRateQuoteRecord;
  requiresActiveQuote: boolean;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("private_exchange_rate_quote_record_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`private_exchange_rate_subject_missing:${record.recordId}`);
  }

  if (!isHash(record.participantIdHash)) {
    blockers.push(`private_exchange_rate_participant_hash_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.privateExchangeRateQuotePolicyRef)) {
    blockers.push(`private_exchange_rate_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(
      `private_exchange_rate_policy_not_immutable:${record.recordId}:${record.policyStatus}`,
    );
  }

  if (!isHash(record.privateQuoteTermsHash)) {
    blockers.push(`private_exchange_rate_quote_terms_hash_missing:${record.recordId}`);
  }

  if (
    !Number.isFinite(record.acceptableMinBps) ||
    !Number.isFinite(record.acceptableMaxBps) ||
    record.acceptableMinBps < 0 ||
    record.acceptableMaxBps < 0 ||
    record.acceptableMinBps > record.acceptableMaxBps
  ) {
    blockers.push(`private_exchange_rate_bounds_invalid:${record.recordId}`);
  }

  if (!isValidCurrency(record.settlementCurrency)) {
    blockers.push(`private_exchange_rate_settlement_currency_invalid:${record.recordId}`);
  }

  if (MONEY_QUOTE_TYPES.has(record.quoteType) && record.settlementCurrency === null) {
    blockers.push(`private_exchange_rate_settlement_currency_missing:${record.recordId}`);
  }

  if (!record.publicMoralPriceProhibited) {
    blockers.push(`private_exchange_rate_public_moral_price_not_prohibited:${record.recordId}`);
  }

  if (record.publicCausePricePublished) {
    blockers.push(`private_exchange_rate_public_cause_price_published:${record.recordId}`);
  }

  if (record.globalExchangeRatePublished) {
    blockers.push(`private_exchange_rate_global_exchange_rate_published:${record.recordId}`);
  }

  if (record.publicEffectivenessComparisonPublished) {
    blockers.push(
      `private_exchange_rate_public_effectiveness_comparison_published:${record.recordId}`,
    );
  }

  if (record.moralValueInferencePublished) {
    blockers.push(`private_exchange_rate_moral_value_inference_published:${record.recordId}`);
  }

  if (record.exactCounterpartyQuoteDisclosed) {
    blockers.push(`private_exchange_rate_exact_counterparty_quote_disclosed:${record.recordId}`);
  }

  if (record.rawPrivateTermsPublic) {
    blockers.push(`private_exchange_rate_raw_private_terms_public:${record.recordId}`);
  }

  if (requiresActiveQuote && !ACTIVE_QUOTE_STATES.has(record.quoteState)) {
    blockers.push(`private_exchange_rate_quote_state_not_active:${record.recordId}:${record.quoteState}`);
  }

  if (["expired", "superseded", "withdrawn"].includes(record.quoteState)) {
    blockers.push(`private_exchange_rate_quote_state_blocking:${record.recordId}:${record.quoteState}`);
  }

  if (
    ACTIVE_QUOTE_STATES.has(record.quoteState) &&
    !hasMeaningfulText(record.reviewerDecisionRef)
  ) {
    blockers.push(`private_exchange_rate_reviewer_decision_missing:${record.recordId}`);
  }

  if (!isValidIso(record.createdAt)) {
    blockers.push(`private_exchange_rate_created_at_invalid:${record.recordId}`);
  }

  if (!isValidIso(record.updatedAt)) {
    blockers.push(`private_exchange_rate_updated_at_invalid:${record.recordId}`);
  } else if (isStaleTimestamp(record.updatedAt, checkedAt)) {
    blockers.push(`private_exchange_rate_quote_record_stale:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradePrivateExchangeRate(
  input: MoralTradePrivateExchangeRateEvaluationInput,
): MoralTradePrivateExchangeRateEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const privateExchangeRateRequired =
    input.privateExchangeRateRequired ||
    transitionDefinition?.requiresQuoteRecord === true;
  const requiresActiveQuote =
    transitionDefinition?.requiresActiveQuote === true;
  const requiredAffectedParticipantCount = Math.max(
    0,
    Math.floor(input.requiredAffectedParticipantCount),
  );
  const blockers: string[] = [];
  const coveredParticipants = new Set<string>();
  let reviewedRecordCount = 0;
  let activeQuoteRecordCount = 0;
  let privacySafeRecordCount = 0;
  let publicPriceBlockerCount = 0;

  if (privateExchangeRateRequired && input.records.length === 0) {
    blockers.push("private_exchange_rate_quote_record_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({
      checkedAt,
      record,
      requiresActiveQuote,
    });

    blockers.push(...recordBlockers);

    if (record.policyStatus === "resolved_immutable" && hasMeaningfulText(record.reviewerDecisionRef)) {
      reviewedRecordCount += 1;
    }

    if (isHash(record.participantIdHash) && recordBlockers.length === 0) {
      coveredParticipants.add(record.participantIdHash);
    }

    if (ACTIVE_QUOTE_STATES.has(record.quoteState) && recordBlockers.length === 0) {
      activeQuoteRecordCount += 1;
    }

    if (!hasPublicPriceLeak(record) && record.publicMoralPriceProhibited) {
      privacySafeRecordCount += 1;
    }

    if (hasPublicPriceLeak(record) || !record.publicMoralPriceProhibited) {
      publicPriceBlockerCount += 1;
    }
  }

  if (
    privateExchangeRateRequired &&
    input.records.length > 0 &&
    activeQuoteRecordCount === 0
  ) {
    blockers.push("active_private_exchange_rate_quote_record_missing");
  }

  if (
    privateExchangeRateRequired &&
    coveredParticipants.size < requiredAffectedParticipantCount
  ) {
    blockers.push("private_exchange_rate_affected_participant_quote_coverage_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    privateExchangeRateRequired,
    reviewedRecordCount,
    activeQuoteRecordCount,
    privacySafeRecordCount,
    affectedParticipantQuoteCount: coveredParticipants.size,
    requiredAffectedParticipantCount,
    publicPriceBlockerCount,
    blockers,
    userFacingBlockerCategories: Array.from(
      new Set(
        blockers.map((blocker) =>
          blocker.includes("public") ||
          blocker.includes("global") ||
          blocker.includes("inference") ||
          blocker.includes("counterparty_quote") ||
          blocker.includes("raw_private")
            ? "Public surfaces cannot publish moral prices, global exchange rates, exact private quotes, or inferred moral values"
            : blocker.includes("participant_quote_coverage")
              ? "Every affected participant needs a private quote record"
              : blocker.includes("policy")
                ? "Private exchange-rate quote policy is not frozen"
                : blocker.includes("stale") || blocker.includes("expired")
                  ? "Private exchange-rate quote record is stale or expired"
                  : "Private exchange-rate quote record is incomplete",
        ),
      ),
    ),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradePrivateExchangeRateQuoteRecord> = {},
): MoralTradePrivateExchangeRateQuoteRecord {
  return {
    recordId: "private-exchange-rate:demo-a",
    subjectType: "matched_trade_lock_proposal",
    subjectId: "matched-trade-lock-proposal:demo",
    participantIdHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    privateExchangeRateQuotePolicyRef: "policy-snapshot:private-exchange-rate-v1",
    policyStatus: "resolved_immutable",
    quoteType: "clearing_ratio_bound",
    privateQuoteTermsHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    acceptableMinBps: 8_000,
    acceptableMaxBps: 12_500,
    settlementCurrency: null,
    disclosureScope: "counterparty_band_only",
    publicMoralPriceProhibited: true,
    publicCausePricePublished: false,
    globalExchangeRatePublished: false,
    publicEffectivenessComparisonPublished: false,
    moralValueInferencePublished: false,
    exactCounterpartyQuoteDisclosed: false,
    rawPrivateTermsPublic: false,
    quoteState: "locked",
    reviewerDecisionRef: "review-decision:private-exchange-rate",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

export function getMoralTradePrivateExchangeRateContract(): MoralTradePrivateExchangeRateContract {
  return {
    version: MORAL_TRADE_PRIVATE_EXCHANGE_RATE_CONTRACT_VERSION,
    purpose:
      "Fail-closed private exchange-rate quote contract for ratio bounds, side payments, counterpart volumes, and implied tradeoffs in donation-offset and pledge-swap proposals.",
    failClosedRule:
      "Donation-offset and pledge-swap matching, lock, clearing, capture, reliance, public metrics, and release promotion fail closed when affected participants' private exchange-rate quote records are missing, policy-mutable, stale, inactive, unreviewed, hash-invalid, overbroadly disclosed, or used to publish cause prices, global moral exchange rates, public effectiveness comparisons, exact willingness-to-trade terms, or inferred moral values.",
    publicNonPriceRule:
      "Public surfaces may say that a trade cleared within each participant's stated bounds, but must not publish a cause-price table, moral exchange-rate chart, leaderboard, platform-endorsed effectiveness comparison, exact participant willingness-to-trade term, or inferred moral value from private quote terms.",
    privacyBoundary:
      "Participants may see their own implied tradeoff and final ratio-bounds result. Counterparties and public pages receive only privacy-safe compatibility bands unless a narrower disclosure is explicitly granted; raw private quote terms, exact caps, reviewer notes, and participant identity hashes stay private.",
    affectedParticipantCoverageRule:
      "Any clearing ratio, side payment, counterpart volume, or implied cause tradeoff must be backed by private exchange-rate quote records from every affected participant before it can support matching, lock, capture, reliance, public metrics, or release promotion.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    quoteTypes: [...QUOTE_TYPES],
    disclosureScopes: [...DISCLOSURE_SCOPES],
    quoteStates: [...QUOTE_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
    sampleEvaluations: [
      evaluateMoralTradePrivateExchangeRate({
        transition: "matched_trade_lock",
        privateExchangeRateRequired: true,
        requiredAffectedParticipantCount: 1,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [sampleRecord()],
      }),
      evaluateMoralTradePrivateExchangeRate({
        transition: "public_metric_publication",
        privateExchangeRateRequired: true,
        requiredAffectedParticipantCount: 1,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          sampleRecord({
            recordId: "private-exchange-rate:public-leak-demo",
            publicCausePricePublished: true,
            globalExchangeRatePublished: true,
            moralValueInferencePublished: true,
            rawPrivateTermsPublic: true,
          }),
        ],
      }),
    ],
    contractTests: [
      "private_exchange_rate_quote_test",
      "private_exchange_rate_contract_validator",
      "private_exchange_rate_public_price_blocks",
      "private_exchange_rate_affected_participant_coverage_test",
      "private_exchange_rate_route_contract",
      "private_exchange_rate_schema_contract",
    ],
  };
}

export function validateMoralTradePrivateExchangeRateContract(
  contract: MoralTradePrivateExchangeRateContract = getMoralTradePrivateExchangeRateContract(),
): MoralTradePrivateExchangeRateValidation {
  const checks = [
    check(
      "first-class-record-table",
      "Contract names private exchange-rate quote records",
      contract.firstClassRecordTables.includes(
        "moral_trade_private_exchange_rate_quote_records",
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names private_exchange_rate_quote policy snapshots",
      contract.policySnapshotSubjects.includes("private_exchange_rate_quote"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "subject-coverage",
      "Contract covers offers, lock proposals, cleared agreements, and bargaining rounds",
      [
        "offset_offer",
        "pledge_swap_offer",
        "matched_trade_lock_proposal",
        "cleared_trade_agreement",
        "bargaining_round_record",
      ].every((subjectType) =>
        contract.subjectTypes.includes(
          subjectType as MoralTradePrivateExchangeRateSubjectType,
        ),
      ),
      contract.subjectTypes.join(", "),
    ),
    check(
      "quote-type-coverage",
      "Contract covers ratio bounds, side payments, counterpart volumes, action-money tradeoffs, effectiveness tradeoffs, and manual review",
      [
        "clearing_ratio_bound",
        "side_payment_bound",
        "counterpart_volume_bound",
        "action_money_tradeoff",
        "empirical_effectiveness_tradeoff",
        "manual_review",
      ].every((quoteType) =>
        contract.quoteTypes.includes(
          quoteType as MoralTradePrivateExchangeRateQuoteType,
        ),
      ),
      contract.quoteTypes.join(", "),
    ),
    check(
      "disclosure-boundary",
      "Contract limits disclosure to participants, reviewers, compatibility bands, or public suppression",
      contract.disclosureScopes.includes("counterparty_band_only") &&
        contract.disclosureScopes.includes("public_suppressed") &&
        !contract.disclosureScopes.some((scope) => /public_exact|public_price/.test(scope)),
      contract.disclosureScopes.join(", "),
    ),
    check(
      "public-non-price-rule",
      "Contract forbids public moral exchange rates, cause prices, leaderboards, willingness-to-trade terms, and moral-value inference",
      /cause-price table/i.test(contract.publicNonPriceRule) &&
        /moral exchange-rate chart/i.test(contract.publicNonPriceRule) &&
        /leaderboard/i.test(contract.publicNonPriceRule) &&
        /willingness-to-trade/i.test(contract.publicNonPriceRule) &&
        /inferred moral value/i.test(contract.publicNonPriceRule),
      contract.publicNonPriceRule,
    ),
    check(
      "transition-coverage",
      "Contract requires quote records for match, lock, clearing, capture, reliance, public metrics, and release promotion",
      [
        "match_candidate_generation",
        "matched_trade_lock",
        "clearing_run",
        "payment_capture",
        "reliance",
        "public_metric_publication",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition && definition.requiresQuoteRecord,
        ),
      ),
      contract.transitionDefinitions
        .filter((definition) => definition.requiresQuoteRecord)
        .map((definition) => definition.key)
        .join(", "),
    ),
    check(
      "sample-evaluations",
      "Contract includes pass and public-price blocked samples",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.status === "blocked" && evaluation.publicPriceBlockerCount > 0,
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract lists private-exchange-rate quote test hook",
      contract.contractTests.includes("private_exchange_rate_quote_test"),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-private-exchange-rate-contract",
    validatorVersion: MORAL_TRADE_PRIVATE_EXCHANGE_RATE_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
