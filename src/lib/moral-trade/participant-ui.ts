import { createHash } from "node:crypto";

export const MORAL_TRADE_PARTICIPANT_UI_CONTRACT_VERSION =
  "moral-trade-participant-ui-v0.1-2026-06";
export const MORAL_TRADE_PARTICIPANT_UI_VALIDATOR_VERSION =
  "moral-trade-participant-ui-validator-v0.1";

export type MoralTradeParticipantUiSurface =
  | "intake_triage"
  | "template_gallery"
  | "guided_builder"
  | "draft_preview"
  | "review_queue_status"
  | "matched_trade_lock_proposal"
  | "final_lock_confirmation"
  | "participant_dashboard"
  | "public_receipt_card_preview"
  | "public_receipt_card_publication";

export type MoralTradeParticipantUiDisclosure =
  | "no_trade_comparison"
  | "maximum_exposure"
  | "counterparty_or_batch_condition"
  | "payment_refund_cancellation"
  | "privacy_change"
  | "evidence_burden"
  | "remaining_uncertainty"
  | "term_sheet_hash"
  | "distinct_final_confirmation"
  | "receipt_claim_scope"
  | "receipt_verification_status"
  | "receipt_correction_revocation";

export type MoralTradeParticipantUiStableTermKey =
  | "if_i_do_nothing"
  | "if_this_clears"
  | "make_it_final"
  | "what_we_check"
  | "my_maximum_cost"
  | "what_stays_private"
  | "proof_needed"
  | "if_it_fails"
  | "why_this_counts"
  | "exact_terms_fingerprint"
  | "what_still_needs_review"
  | "what_this_receipt_claims"
  | "current_receipt_status"
  | "correct_or_unpublish";

export type MoralTradeParticipantUiSafeTemplateDefaultFact =
  | "money"
  | "obligations"
  | "privacy"
  | "evidence"
  | "duration"
  | "failure_handling"
  | "public_display";

export type MoralTradePublicReceiptPreviewQuestion =
  | "personal_contribution_claimed"
  | "personal_contribution_new_or_reused"
  | "trade_conditioned_contribution"
  | "trade_unlocked_wording_allowed"
  | "total_verified_transfer"
  | "remaining_uncertainty"
  | "private_information_hidden"
  | "publicly_named_entities"
  | "not_moral_score_or_endorsement"
  | "verification_correction_or_unpublish_path";

export interface MoralTradeParticipantUiRenderSnapshot {
  snapshotId: string;
  screenType: MoralTradeParticipantUiSurface;
  copyVersion: string;
  visibleFieldSet: string[];
  hiddenRedactedFieldSet: string[];
  language: string;
  accessibilityAccommodationState: {
    keyboardReachable: boolean;
    screenReaderLabelled: boolean;
    mobileViewportChecked: boolean;
    plainLanguageChecked: boolean;
  };
  termSheetHashShown: string | null;
  maxExposureShown: string | null;
  primaryCtaLabel: string;
  secondaryCtaLabels: string[];
  comprehensionPromptShown: string | null;
  snapshotHash: string;
}

export interface MoralTradeParticipantUiSurfaceRecord {
  surface: MoralTradeParticipantUiSurface;
  routePath: string;
  plainLanguageCopyPolicyRef: string;
  taskCardStatusLabel: string;
  oneSentenceSummary: string;
  keyFacts: string[];
  nextAction: string;
  primaryAction: string;
  secondaryActions: string[];
  optionalDetailsDrawer: string[];
  participantTermMap: Record<string, string>;
  stableTermKeys: MoralTradeParticipantUiStableTermKey[];
  materialDisclosures: MoralTradeParticipantUiDisclosure[];
  safeTemplateDefaultDisclosure: string | null;
  safeTemplateDefaultFactsShown: MoralTradeParticipantUiSafeTemplateDefaultFact[];
  renderSnapshot: MoralTradeParticipantUiRenderSnapshot | null;
  publicReceiptPreviewQuestionsAnswered?: MoralTradePublicReceiptPreviewQuestion[];
  publicReceiptPolicy?: {
    participantOptInRequired: boolean;
    profileOptInDefault: boolean;
    directDonationParityNonPreferential: boolean;
    separatesPersonalTradeConditionedAndTotal: boolean;
    usesTradeConditionedByDefault: boolean;
    verificationUrlOrHandleRequired: boolean;
    correctionRevocationStateRequired: boolean;
    exactSensitiveActionRequiresSeparateConsent: boolean;
    publicEngagementCountersAllowed: boolean;
    publicationCanBeTradeTerm: boolean;
  };
}

export interface MoralTradeParticipantUiEvaluation {
  status: "pass" | "blocked";
  checkedAt: string;
  screenCount: number;
  missingSurfaces: MoralTradeParticipantUiSurface[];
  blockers: string[];
}

export interface MoralTradeParticipantUiContract {
  version: string;
  purpose: string;
  firstClassRecordTables: string[];
  requiredSurfaces: MoralTradeParticipantUiSurface[];
  requiredRenderSnapshotSurfaces: MoralTradeParticipantUiSurface[];
  bannedPrimaryCopyTerms: string[];
  stableTermMap: Record<MoralTradeParticipantUiStableTermKey, string>;
  safeTemplateDefaultFacts: MoralTradeParticipantUiSafeTemplateDefaultFact[];
  requiredLockSafeTemplateDefaultFacts: MoralTradeParticipantUiSafeTemplateDefaultFact[];
  requiredReceiptSafeTemplateDefaultFacts: MoralTradeParticipantUiSafeTemplateDefaultFact[];
  requiredReceiptPreviewQuestions: MoralTradePublicReceiptPreviewQuestion[];
  maxKeyFactsPerScreen: number;
  requiredRelianceDisclosures: MoralTradeParticipantUiDisclosure[];
  requiredReceiptDisclosures: MoralTradeParticipantUiDisclosure[];
  sampleScreens: MoralTradeParticipantUiSurfaceRecord[];
  contractTests: string[];
}

export interface MoralTradeParticipantUiValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-participant-ui-contract";
  validatorVersion: string;
  contractVersion: string;
  blockers: string[];
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

const REQUIRED_SURFACES: MoralTradeParticipantUiSurface[] = [
  "intake_triage",
  "template_gallery",
  "guided_builder",
  "draft_preview",
  "review_queue_status",
  "matched_trade_lock_proposal",
  "final_lock_confirmation",
  "participant_dashboard",
  "public_receipt_card_preview",
  "public_receipt_card_publication",
];

const REQUIRED_RENDER_SNAPSHOT_SURFACES: MoralTradeParticipantUiSurface[] = [
  "draft_preview",
  "matched_trade_lock_proposal",
  "final_lock_confirmation",
  "public_receipt_card_preview",
  "public_receipt_card_publication",
];

const REQUIRED_RELIANCE_DISCLOSURES: MoralTradeParticipantUiDisclosure[] = [
  "no_trade_comparison",
  "maximum_exposure",
  "counterparty_or_batch_condition",
  "payment_refund_cancellation",
  "privacy_change",
  "evidence_burden",
  "remaining_uncertainty",
];

const REQUIRED_RECEIPT_DISCLOSURES: MoralTradeParticipantUiDisclosure[] = [
  "receipt_claim_scope",
  "receipt_verification_status",
  "receipt_correction_revocation",
];

const STABLE_TERM_MAP: Record<MoralTradeParticipantUiStableTermKey, string> = {
  correct_or_unpublish: "Correct or unpublish",
  current_receipt_status: "Current receipt status",
  exact_terms_fingerprint: "Exact terms fingerprint",
  if_i_do_nothing: "If I do nothing",
  if_it_fails: "If it fails",
  if_this_clears: "If this clears",
  make_it_final: "Make it final",
  my_maximum_cost: "My maximum cost",
  proof_needed: "Proof needed",
  what_stays_private: "What stays private",
  what_still_needs_review: "What still needs review",
  what_this_receipt_claims: "What this receipt claims",
  what_we_check: "What we check",
  why_this_counts: "Why this counts",
};

const DISCLOSURE_STABLE_TERM_KEYS: Record<
  MoralTradeParticipantUiDisclosure,
  MoralTradeParticipantUiStableTermKey
> = {
  counterparty_or_batch_condition: "if_this_clears",
  distinct_final_confirmation: "make_it_final",
  evidence_burden: "proof_needed",
  maximum_exposure: "my_maximum_cost",
  no_trade_comparison: "if_i_do_nothing",
  payment_refund_cancellation: "if_it_fails",
  privacy_change: "what_stays_private",
  receipt_claim_scope: "what_this_receipt_claims",
  receipt_correction_revocation: "correct_or_unpublish",
  receipt_verification_status: "current_receipt_status",
  remaining_uncertainty: "what_still_needs_review",
  term_sheet_hash: "exact_terms_fingerprint",
};

const SAFE_TEMPLATE_DEFAULT_FACTS: MoralTradeParticipantUiSafeTemplateDefaultFact[] = [
  "money",
  "obligations",
  "privacy",
  "evidence",
  "duration",
  "failure_handling",
  "public_display",
];

const REQUIRED_LOCK_SAFE_TEMPLATE_DEFAULT_FACTS: MoralTradeParticipantUiSafeTemplateDefaultFact[] = [
  "money",
  "obligations",
  "privacy",
  "evidence",
  "duration",
  "failure_handling",
];

const REQUIRED_RECEIPT_SAFE_TEMPLATE_DEFAULT_FACTS: MoralTradeParticipantUiSafeTemplateDefaultFact[] = [
  "privacy",
  "failure_handling",
  "public_display",
];

const REQUIRED_RECEIPT_PREVIEW_QUESTIONS: MoralTradePublicReceiptPreviewQuestion[] = [
  "personal_contribution_claimed",
  "personal_contribution_new_or_reused",
  "trade_conditioned_contribution",
  "trade_unlocked_wording_allowed",
  "total_verified_transfer",
  "remaining_uncertainty",
  "private_information_hidden",
  "publicly_named_entities",
  "not_moral_score_or_endorsement",
  "verification_correction_or_unpublish_path",
];

const BANNED_PRIMARY_COPY_TERMS = [
  "counterfactual_trust_assessment",
  "baseline_integrity_assessment",
  "control_requirement_result",
  "noncompensable_blocker",
  "release_gate",
  "state_interpretation_policy",
  "public_metric_release_policy",
  "policy_snapshot_hash",
  "source_hash",
];

const APPROVED_COPY_POLICY_REF = "moral-trade-plain-language-copy-policy:v0.1";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}

function hashRecord(value: unknown) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function buildParticipantUiRenderSnapshot(
  input: Omit<MoralTradeParticipantUiRenderSnapshot, "snapshotHash">,
): MoralTradeParticipantUiRenderSnapshot {
  return {
    ...input,
    snapshotHash: hashRecord(input),
  };
}

function hasAll<T extends string>(actual: readonly T[], required: readonly T[]) {
  return required.every((item) => actual.includes(item));
}

function primaryCopy(record: MoralTradeParticipantUiSurfaceRecord) {
  return [
    record.taskCardStatusLabel,
    record.oneSentenceSummary,
    ...record.keyFacts,
    record.nextAction,
    record.primaryAction,
    ...Object.values(record.participantTermMap),
  ].join(" ");
}

function primaryActionHasMultipleChoices(label: string) {
  return /[,/]/.test(label) || /\bor\b/i.test(label);
}

function requiredStableTermKeys(record: MoralTradeParticipantUiSurfaceRecord) {
  return Array.from(
    new Set(record.materialDisclosures.map((disclosure) => DISCLOSURE_STABLE_TERM_KEYS[disclosure])),
  );
}

function requiredSafeTemplateDefaultFacts(record: MoralTradeParticipantUiSurfaceRecord) {
  if (
    record.surface === "draft_preview" ||
    record.surface === "matched_trade_lock_proposal" ||
    record.surface === "final_lock_confirmation"
  ) {
    return REQUIRED_LOCK_SAFE_TEMPLATE_DEFAULT_FACTS;
  }

  if (record.surface === "public_receipt_card_preview" || record.surface === "public_receipt_card_publication") {
    return REQUIRED_RECEIPT_SAFE_TEMPLATE_DEFAULT_FACTS;
  }

  return [];
}

function validateScreen(record: MoralTradeParticipantUiSurfaceRecord, contract: MoralTradeParticipantUiContract) {
  const blockers: string[] = [];

  if (!record.plainLanguageCopyPolicyRef.trim()) {
    blockers.push(`plain_language_copy_policy_missing:${record.surface}`);
  }

  if (!record.taskCardStatusLabel.trim()) {
    blockers.push(`task_card_status_required:${record.surface}`);
  }

  if (!record.oneSentenceSummary.trim()) {
    blockers.push(`summary_required:${record.surface}`);
  }

  if (!record.nextAction.trim()) {
    blockers.push(`next_action_required:${record.surface}`);
  }

  if (!record.primaryAction.trim()) {
    blockers.push(`primary_action_required:${record.surface}`);
  }

  if (record.nextAction !== record.primaryAction) {
    blockers.push(`next_action_primary_action_mismatch:${record.surface}`);
  }

  if (primaryActionHasMultipleChoices(record.primaryAction)) {
    blockers.push(`multiple_primary_actions:${record.surface}`);
  }

  if (record.keyFacts.length > contract.maxKeyFactsPerScreen) {
    blockers.push(`too_many_key_facts:${record.surface}`);
  }

  if (!record.optionalDetailsDrawer.length) {
    blockers.push(`details_drawer_required:${record.surface}`);
  }

  if (!record.stableTermKeys.length) {
    blockers.push(`stable_term_keys_required:${record.surface}`);
  }
  for (const termKey of record.stableTermKeys) {
    if (!contract.stableTermMap[termKey]) {
      blockers.push(`unknown_stable_term_key:${record.surface}:${termKey}`);
    }
  }
  for (const termKey of requiredStableTermKeys(record)) {
    if (!record.stableTermKeys.includes(termKey)) {
      blockers.push(`stable_term_key_missing:${record.surface}:${termKey}`);
    }
  }

  const copy = primaryCopy(record).toLowerCase();
  const rawIdentifier = copy.match(/\b[a-z]+(?:_[a-z0-9]+)+\b/);
  if (rawIdentifier) {
    blockers.push(`raw_enum_primary_copy:${record.surface}:${rawIdentifier[0]}`);
  }
  for (const bannedTerm of contract.bannedPrimaryCopyTerms) {
    if (copy.includes(bannedTerm.toLowerCase())) {
      blockers.push(`internal_jargon_primary_copy:${record.surface}:${bannedTerm}`);
    }
  }

  if (record.surface === "template_gallery") {
    const forbiddenCta = [record.primaryAction, ...record.secondaryActions].some((label) =>
      /\b(pay|lock|match now|capture)\b/i.test(label),
    );
    if (forbiddenCta) {
      blockers.push("template_gallery_pre_gate_cta");
    }
  }

  if (
    record.surface === "draft_preview" ||
    record.surface === "matched_trade_lock_proposal" ||
    record.surface === "final_lock_confirmation"
  ) {
    if (!hasAll(record.materialDisclosures, contract.requiredRelianceDisclosures)) {
      blockers.push(`material_disclosures_missing:${record.surface}`);
    }
  }

  const requiredDefaultFacts = requiredSafeTemplateDefaultFacts(record);
  if (requiredDefaultFacts.length) {
    if (!record.safeTemplateDefaultDisclosure?.trim()) {
      blockers.push(`safe_template_default_disclosure_missing:${record.surface}`);
    }
    if (!hasAll(record.safeTemplateDefaultFactsShown, requiredDefaultFacts)) {
      blockers.push(`safe_template_default_facts_missing:${record.surface}`);
    }
  }

  if (record.surface === "final_lock_confirmation") {
    if (!record.materialDisclosures.includes("term_sheet_hash")) {
      blockers.push("final_lock_term_sheet_hash_missing");
    }
    if (!record.materialDisclosures.includes("distinct_final_confirmation")) {
      blockers.push("final_lock_distinct_confirmation_missing");
    }
    if (!/confirm locked terms/i.test(record.primaryAction)) {
      blockers.push("final_lock_primary_action_not_distinct");
    }
  }

  if (contract.requiredRenderSnapshotSurfaces.includes(record.surface)) {
    if (!record.renderSnapshot) {
      blockers.push(`render_snapshot_required:${record.surface}`);
    } else {
      blockers.push(...validateRenderSnapshot(record).blockers);
    }
  }

  if (record.surface === "public_receipt_card_preview" || record.surface === "public_receipt_card_publication") {
    if (!hasAll(record.publicReceiptPreviewQuestionsAnswered ?? [], contract.requiredReceiptPreviewQuestions)) {
      blockers.push(`receipt_preview_answers_missing:${record.surface}`);
    }
    if (!hasAll(record.materialDisclosures, contract.requiredReceiptDisclosures)) {
      blockers.push(`receipt_disclosures_missing:${record.surface}`);
    }
    if (!record.publicReceiptPolicy) {
      blockers.push(`public_receipt_policy_required:${record.surface}`);
    } else {
      const policy = record.publicReceiptPolicy;
      if (!policy.participantOptInRequired) blockers.push(`receipt_opt_in_required:${record.surface}`);
      if (!policy.profileOptInDefault) blockers.push(`receipt_profile_opt_in_default_required:${record.surface}`);
      if (!policy.directDonationParityNonPreferential) {
        blockers.push(`direct_donation_parity_non_preference_required:${record.surface}`);
      }
      if (!policy.separatesPersonalTradeConditionedAndTotal) {
        blockers.push(`receipt_net_attribution_lines_required:${record.surface}`);
      }
      if (!policy.usesTradeConditionedByDefault) blockers.push(`receipt_trade_conditioned_default_required:${record.surface}`);
      if (!policy.verificationUrlOrHandleRequired) blockers.push(`receipt_verification_handle_required:${record.surface}`);
      if (!policy.correctionRevocationStateRequired) blockers.push(`receipt_correction_state_required:${record.surface}`);
      if (!policy.exactSensitiveActionRequiresSeparateConsent) {
        blockers.push(`receipt_sensitive_action_consent_required:${record.surface}`);
      }
      if (policy.publicEngagementCountersAllowed) blockers.push(`receipt_engagement_counter_allowed:${record.surface}`);
      if (policy.publicationCanBeTradeTerm) blockers.push(`receipt_publication_as_trade_term:${record.surface}`);
    }
  }

  return blockers;
}

export function validateRenderSnapshot(record: MoralTradeParticipantUiSurfaceRecord) {
  const snapshot = record.renderSnapshot;
  const blockers: string[] = [];

  if (!snapshot) {
    return { status: "blocked" as const, blockers: [`render_snapshot_required:${record.surface}`] };
  }

  if (snapshot.screenType !== record.surface) blockers.push(`render_snapshot_screen_mismatch:${record.surface}`);
  if (!HASH_PATTERN.test(snapshot.snapshotHash)) blockers.push(`render_snapshot_hash_invalid:${record.surface}`);
  if (!snapshot.visibleFieldSet.length) blockers.push(`visible_field_set_required:${record.surface}`);
  if (!snapshot.hiddenRedactedFieldSet.length) blockers.push(`hidden_redacted_field_set_required:${record.surface}`);
  if (!snapshot.primaryCtaLabel || snapshot.primaryCtaLabel !== record.primaryAction) {
    blockers.push(`render_snapshot_cta_mismatch:${record.surface}`);
  }

  const a11y = snapshot.accessibilityAccommodationState;
  if (!a11y.keyboardReachable || !a11y.screenReaderLabelled || !a11y.mobileViewportChecked || !a11y.plainLanguageChecked) {
    blockers.push(`accessibility_copy_check_missing:${record.surface}`);
  }

  if (record.materialDisclosures.includes("maximum_exposure") && !snapshot.maxExposureShown) {
    blockers.push(`render_snapshot_max_exposure_missing:${record.surface}`);
  }

  const requiresTermSheetHash =
    record.surface === "final_lock_confirmation" ||
    record.materialDisclosures.includes("term_sheet_hash");
  if (requiresTermSheetHash) {
    if (!snapshot.termSheetHashShown || !HASH_PATTERN.test(snapshot.termSheetHashShown)) {
      blockers.push(`render_snapshot_term_sheet_hash_missing:${record.surface}`);
    }
  }

  return {
    status: blockers.length ? ("blocked" as const) : ("pass" as const),
    blockers,
  };
}

export function evaluateParticipantUiContract(
  screens: MoralTradeParticipantUiSurfaceRecord[],
  checkedAt = new Date().toISOString(),
): MoralTradeParticipantUiEvaluation {
  const contract = getMoralTradeParticipantUiContract(screens);
  const surfaceSet = new Set(screens.map((screen) => screen.surface));
  const missingSurfaces = contract.requiredSurfaces.filter((surface) => !surfaceSet.has(surface));
  const blockers = [
    ...missingSurfaces.map((surface) => `surface_missing:${surface}`),
    ...screens.flatMap((screen) => validateScreen(screen, contract)),
  ];

  return {
    status: blockers.length ? "blocked" : "pass",
    checkedAt,
    screenCount: screens.length,
    missingSurfaces,
    blockers,
  };
}

function sampleSnapshot(
  surface: MoralTradeParticipantUiSurface,
  primaryCtaLabel: string,
  overrides: Partial<Omit<MoralTradeParticipantUiRenderSnapshot, "snapshotHash">> = {},
) {
  return buildParticipantUiRenderSnapshot({
    accessibilityAccommodationState: {
      keyboardReachable: true,
      mobileViewportChecked: true,
      plainLanguageChecked: true,
      screenReaderLabelled: true,
    },
    comprehensionPromptShown: "Review the comparison, maximum exposure, evidence burden, privacy change, and cancellation rule.",
    copyVersion: "participant-ui-copy-v0.1",
    hiddenRedactedFieldSet: ["raw evidence", "private caps", "counterparty identity", "reviewer notes"],
    language: "en-US",
    maxExposureShown: "$25 maximum before renewed confirmation",
    primaryCtaLabel,
    screenType: surface,
    secondaryCtaLabels: ["Save draft", "Request manual review"],
    snapshotId: `participant-ui-render-snapshot:${surface}:sample`,
    termSheetHashShown: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    visibleFieldSet: [
      "no-trade comparison",
      "maximum exposure",
      "matched condition",
      "privacy disclosure",
      "evidence burden",
      "failure behavior",
    ],
    ...overrides,
  });
}

const receiptPolicy = {
  correctionRevocationStateRequired: true,
  directDonationParityNonPreferential: true,
  exactSensitiveActionRequiresSeparateConsent: true,
  participantOptInRequired: true,
  profileOptInDefault: true,
  publicEngagementCountersAllowed: false,
  publicationCanBeTradeTerm: false,
  separatesPersonalTradeConditionedAndTotal: true,
  usesTradeConditionedByDefault: true,
  verificationUrlOrHandleRequired: true,
};

export const PARTICIPANT_UI_SAMPLE_SCREENS: MoralTradeParticipantUiSurfaceRecord[] = [
  {
    surface: "intake_triage",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Choose route",
    oneSentenceSummary: "Tell us what you are trying to do before choosing a Moral Trade template.",
    keyFacts: [
      "Ordinary donations, public-goods work, services, self-offset bookkeeping, background networking, and unsafe requests route elsewhere.",
      "You can correct the routing or request manual review.",
    ],
    nextAction: "Choose route",
    primaryAction: "Choose route",
    secondaryActions: ["Request manual review"],
    optionalDetailsDrawer: ["Why this route was suggested", "What is not a commitment yet"],
    participantTermMap: {
      route: "Where this request belongs",
      manual_review: "A reviewer can check whether the route misunderstood the request",
    },
    stableTermKeys: ["what_we_check", "if_it_fails"],
    materialDisclosures: [],
    safeTemplateDefaultDisclosure: null,
    safeTemplateDefaultFactsShown: [],
    renderSnapshot: null,
  },
  {
    surface: "template_gallery",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Create from template",
    oneSentenceSummary: "Start from reviewed donation-offset or micro-pledge templates, or view examples.",
    keyFacts: [
      "Live, preview-only, worked-example, demo, and external CRECM module cards are separated.",
      "Food-abstention defaults are one meal, a few meals, one day, or a few days.",
      "Templates show evidence ladder, per-unit band, money movement, recipient review, and manual-review state.",
    ],
    nextAction: "Create draft",
    primaryAction: "Create draft",
    secondaryActions: ["Preview only", "Request review", "View example"],
    optionalDetailsDrawer: ["Template defaults", "Manual-review exceptions"],
    participantTermMap: {
      default_duration: "Short default window",
      evidence_ladder: "How proof starts light and escalates only if needed",
    },
    stableTermKeys: ["proof_needed", "my_maximum_cost", "what_we_check"],
    materialDisclosures: [],
    safeTemplateDefaultDisclosure:
      "Safe defaults can prefill the draft, but money, privacy, evidence, duration, and failure behavior appear again before lock.",
    safeTemplateDefaultFactsShown: ["money", "privacy", "evidence", "duration", "failure_handling"],
    renderSnapshot: null,
  },
  {
    surface: "guided_builder",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Draft only",
    oneSentenceSummary: "Draft the baseline, action, destination, evidence, privacy, cancellation, and side constraints in short steps.",
    keyFacts: [
      "The no-trade baseline comes before trade terms.",
      "Behavior pledges ask unit, duration, covered food, substitute, and health boundary before compensation.",
      "Self-attestation is the default evidence path for low-stakes micro-pledges.",
    ],
    nextAction: "Save draft",
    primaryAction: "Save draft",
    secondaryActions: ["Preview only"],
    optionalDetailsDrawer: ["Template defaults", "Manual-review triggers"],
    participantTermMap: {
      no_trade_baseline: "What would happen without this trade",
      health_boundary: "Conditions under which the pledge should not proceed",
    },
    stableTermKeys: ["if_i_do_nothing", "my_maximum_cost", "proof_needed", "what_stays_private", "if_it_fails"],
    materialDisclosures: [],
    safeTemplateDefaultDisclosure:
      "Defaults simplify drafting only; they are repeated in preview and the term sheet before final confirmation.",
    safeTemplateDefaultFactsShown: ["duration", "evidence"],
    renderSnapshot: null,
  },
  {
    surface: "draft_preview",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Ready for review",
    oneSentenceSummary: "Compare no trade against the proposal before review or matching.",
    keyFacts: [
      "The preview shows maximum exposure, matched condition, destination, evidence, privacy, deadlines, and fallback behavior.",
      "Internal checks appear as plain-language summary chips with details for reviewers.",
    ],
    nextAction: "Request review",
    primaryAction: "Request review",
    secondaryActions: ["Edit draft", "Save for later"],
    optionalDetailsDrawer: ["Review checks", "Advanced policy details"],
    participantTermMap: {
      maximum_exposure: "Most you can owe or authorize before renewed confirmation",
      remaining_uncertainty: "What still needs review before anything is locked",
    },
    stableTermKeys: [
      "if_i_do_nothing",
      "if_this_clears",
      "my_maximum_cost",
      "what_stays_private",
      "proof_needed",
      "if_it_fails",
      "what_still_needs_review",
    ],
    materialDisclosures: REQUIRED_RELIANCE_DISCLOSURES,
    safeTemplateDefaultDisclosure: "All template defaults that affect money, privacy, evidence, duration, or failure handling are shown here.",
    safeTemplateDefaultFactsShown: REQUIRED_LOCK_SAFE_TEMPLATE_DEFAULT_FACTS,
    renderSnapshot: sampleSnapshot("draft_preview", "Request review"),
  },
  {
    surface: "review_queue_status",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Waiting for review",
    oneSentenceSummary: "See whether the draft is waiting, needs changes, or is blocked before it can move forward.",
    keyFacts: [
      "Reviewer capacity is a marketplace constraint.",
      "Blocked states explain the next action without exposing private counterparty details.",
    ],
    nextAction: "View requested changes",
    primaryAction: "View requested changes",
    secondaryActions: ["Withdraw draft"],
    optionalDetailsDrawer: ["Queue status", "Manual-review reason"],
    participantTermMap: {
      waiting_for_review: "A reviewer has not cleared this yet",
      blocked: "This cannot proceed unless the named issue is resolved",
    },
    stableTermKeys: ["what_we_check", "what_still_needs_review", "if_it_fails"],
    materialDisclosures: [],
    safeTemplateDefaultDisclosure: null,
    safeTemplateDefaultFactsShown: [],
    renderSnapshot: null,
  },
  {
    surface: "matched_trade_lock_proposal",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Needs confirmation",
    oneSentenceSummary: "Review the frozen matched proposal before either side can rely on it.",
    keyFacts: [
      "The proposal freezes matched volume, ratio, destination, evidence standard, deadline, baselines, residual obligations, and cancellation terms.",
      "Counterparty identity and private caps remain staged or redacted unless disclosure policy permits them.",
    ],
    nextAction: "Review lock proposal",
    primaryAction: "Review lock proposal",
    secondaryActions: ["Request changes", "Decline"],
    optionalDetailsDrawer: ["Matched condition", "Counterparty disclosure"],
    participantTermMap: {
      matched_volume: "The amount or action unit this proposal covers",
      residual_obligation: "What remains unmatched or unresolved",
    },
    stableTermKeys: [
      "if_i_do_nothing",
      "if_this_clears",
      "my_maximum_cost",
      "what_stays_private",
      "proof_needed",
      "if_it_fails",
      "what_still_needs_review",
    ],
    materialDisclosures: REQUIRED_RELIANCE_DISCLOSURES,
    safeTemplateDefaultDisclosure: "No material term can be hidden in template defaults at this stage.",
    safeTemplateDefaultFactsShown: REQUIRED_LOCK_SAFE_TEMPLATE_DEFAULT_FACTS,
    renderSnapshot: sampleSnapshot("matched_trade_lock_proposal", "Review lock proposal"),
  },
  {
    surface: "final_lock_confirmation",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Final confirmation",
    oneSentenceSummary: "Confirm the locked terms only after the exact participant-facing term sheet is shown.",
    keyFacts: [
      "This repeats maximum exposure, batch condition, payment, cancellation, privacy change, evidence ladder, renewal rule, and remaining uncertainty.",
      "The action is distinct from saving a draft or requesting review.",
    ],
    nextAction: "Confirm locked terms",
    primaryAction: "Confirm locked terms",
    secondaryActions: ["Decline", "Request amended proposal"],
    optionalDetailsDrawer: ["Term sheet", "What changes require new confirmation"],
    participantTermMap: {
      term_sheet_hash: "The fingerprint of the exact terms shown to you",
      final_confirmation: "The separate action that locks these terms",
    },
    stableTermKeys: [
      "if_i_do_nothing",
      "if_this_clears",
      "make_it_final",
      "my_maximum_cost",
      "what_stays_private",
      "proof_needed",
      "if_it_fails",
      "exact_terms_fingerprint",
      "what_still_needs_review",
    ],
    materialDisclosures: [
      ...REQUIRED_RELIANCE_DISCLOSURES,
      "term_sheet_hash",
      "distinct_final_confirmation",
    ],
    safeTemplateDefaultDisclosure: "Template defaults cannot bind the participant unless they are visible in the final term sheet.",
    safeTemplateDefaultFactsShown: REQUIRED_LOCK_SAFE_TEMPLATE_DEFAULT_FACTS,
    renderSnapshot: sampleSnapshot("final_lock_confirmation", "Confirm locked terms"),
  },
  {
    surface: "participant_dashboard",
    routePath: "/dashboard",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Continue next step",
    oneSentenceSummary: "Track drafts, review, confirmation, locked agreements, evidence, payout or transfer state, and closed records.",
    keyFacts: [
      "Each card has one main next action where possible.",
      "Micro-pledge progress is shown by unit without streak pressure or shame language.",
      "Share receipt appears only after the required completion and publication checks are non-blocking.",
    ],
    nextAction: "Continue next step",
    primaryAction: "Continue next step",
    secondaryActions: ["View details"],
    optionalDetailsDrawer: ["Evidence status", "Payment or transfer status"],
    participantTermMap: {
      needs_confirmation: "Review the exact proposal before anything is locked",
      closed: "Completed, refunded, cancelled, or no longer active",
    },
    stableTermKeys: ["make_it_final", "proof_needed", "if_it_fails", "current_receipt_status"],
    materialDisclosures: [],
    safeTemplateDefaultDisclosure: null,
    safeTemplateDefaultFactsShown: [],
    renderSnapshot: null,
  },
  {
    surface: "public_receipt_card_preview",
    routePath: "/offers/new",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Private by default",
    oneSentenceSummary: "Preview an optional verified contribution receipt before any public display.",
    keyFacts: [
      "The preview separates personal contribution, trade-conditioned contribution, reviewed trade-unlocked contribution where allowed, and total verified transfer.",
      "Direct-donation parity is factual, optional, and non-preferential.",
      "Sensitive behavior details stay generic unless separate publication consent and review allow exact action copy.",
    ],
    nextAction: "Keep private",
    primaryAction: "Keep private",
    secondaryActions: ["Request publication review"],
    optionalDetailsDrawer: ["Claim hygiene", "Correction and revocation"],
    participantTermMap: {
      trade_conditioned: "Contribution conditioned on the completed trade",
      verification_handle: "Where current receipt status can be checked",
    },
    stableTermKeys: [
      "what_this_receipt_claims",
      "current_receipt_status",
      "correct_or_unpublish",
      "what_stays_private",
    ],
    materialDisclosures: REQUIRED_RECEIPT_DISCLOSURES,
    safeTemplateDefaultDisclosure: "Receipts are private by default and never required for matching, payout, or review.",
    safeTemplateDefaultFactsShown: REQUIRED_RECEIPT_SAFE_TEMPLATE_DEFAULT_FACTS,
    renderSnapshot: sampleSnapshot("public_receipt_card_preview", "Keep private", {
      maxExposureShown: null,
      termSheetHashShown: null,
    }),
    publicReceiptPreviewQuestionsAnswered: REQUIRED_RECEIPT_PREVIEW_QUESTIONS,
    publicReceiptPolicy: receiptPolicy,
  },
  {
    surface: "public_receipt_card_publication",
    routePath: "/api/moral-trade/public-receipts/[receiptId]/verify",
    plainLanguageCopyPolicyRef: APPROVED_COPY_POLICY_REF,
    taskCardStatusLabel: "Ready to publish",
    oneSentenceSummary: "Publish only a reviewed, opt-in receipt with current verification and correction status.",
    keyFacts: [
      "Publication never creates moral rank, review priority, matching priority, profile boosts, or engagement counters.",
      "Static images and stale shares are not authoritative; the verification page is the current status source.",
    ],
    nextAction: "Publish reviewed receipt",
    primaryAction: "Publish reviewed receipt",
    secondaryActions: ["Keep private", "Request correction"],
    optionalDetailsDrawer: ["Verification status", "Revocation status"],
    participantTermMap: {
      current_status: "Whether this receipt is current, corrected, revoked, or superseded",
      no_status_game: "Receipt publication does not affect matching, review, or ranking",
    },
    stableTermKeys: [
      "what_this_receipt_claims",
      "current_receipt_status",
      "correct_or_unpublish",
      "what_stays_private",
    ],
    materialDisclosures: REQUIRED_RECEIPT_DISCLOSURES,
    safeTemplateDefaultDisclosure: "Publication is a sidecar event, not a trade term.",
    safeTemplateDefaultFactsShown: REQUIRED_RECEIPT_SAFE_TEMPLATE_DEFAULT_FACTS,
    renderSnapshot: sampleSnapshot("public_receipt_card_publication", "Publish reviewed receipt", {
      maxExposureShown: null,
      termSheetHashShown: null,
    }),
    publicReceiptPreviewQuestionsAnswered: REQUIRED_RECEIPT_PREVIEW_QUESTIONS,
    publicReceiptPolicy: receiptPolicy,
  },
];

export function getMoralTradeParticipantUiContract(
  sampleScreens = PARTICIPANT_UI_SAMPLE_SCREENS,
): MoralTradeParticipantUiContract {
  return {
    version: MORAL_TRADE_PARTICIPANT_UI_CONTRACT_VERSION,
    purpose:
      "Defines the participant-facing progressive-disclosure contract for non-public-goods Moral Trade screens, including render snapshots, plain-language copy, task cards, safe template defaults, and public receipt publication boundaries.",
    firstClassRecordTables: [
      "moral_trade_participant_ui_render_snapshots",
      "moral_trade_participant_explanation_records",
      "moral_trade_plain_language_copy_policies",
      "moral_trade_participant_task_cards",
      "moral_trade_public_receipt_publication_reviews",
    ],
    requiredSurfaces: REQUIRED_SURFACES,
    requiredRenderSnapshotSurfaces: REQUIRED_RENDER_SNAPSHOT_SURFACES,
    bannedPrimaryCopyTerms: BANNED_PRIMARY_COPY_TERMS,
    stableTermMap: STABLE_TERM_MAP,
    safeTemplateDefaultFacts: SAFE_TEMPLATE_DEFAULT_FACTS,
    requiredLockSafeTemplateDefaultFacts: REQUIRED_LOCK_SAFE_TEMPLATE_DEFAULT_FACTS,
    requiredReceiptSafeTemplateDefaultFacts: REQUIRED_RECEIPT_SAFE_TEMPLATE_DEFAULT_FACTS,
    requiredReceiptPreviewQuestions: REQUIRED_RECEIPT_PREVIEW_QUESTIONS,
    maxKeyFactsPerScreen: 5,
    requiredRelianceDisclosures: REQUIRED_RELIANCE_DISCLOSURES,
    requiredReceiptDisclosures: REQUIRED_RECEIPT_DISCLOSURES,
    sampleScreens,
    contractTests: [
      "src/lib/moral-trade/participant-ui.test.ts",
      "src/app/api/moral-trade/participant-ui/contract/route.ts",
      "src/app/offers/new/page.tsx",
    ],
  };
}

export function validateMoralTradeParticipantUiContract(
  contract = getMoralTradeParticipantUiContract(),
): MoralTradeParticipantUiValidation {
  const evaluation = evaluateParticipantUiContract(contract.sampleScreens, "2026-06-24T12:00:00.000Z");
  const checks = [
    {
      id: "required-surfaces",
      label: "All participant-facing surfaces are represented",
      status: evaluation.missingSurfaces.length === 0 ? ("pass" as const) : ("fail" as const),
      evidence: `missing=${evaluation.missingSurfaces.join(",") || "none"}`,
    },
    {
      id: "first-class-records",
      label: "Render snapshots, explanations, copy policies, task cards, and receipt reviews are first-class",
      status:
        contract.firstClassRecordTables.includes("moral_trade_participant_ui_render_snapshots") &&
        contract.firstClassRecordTables.includes("moral_trade_participant_explanation_records") &&
        contract.firstClassRecordTables.includes("moral_trade_plain_language_copy_policies") &&
        contract.firstClassRecordTables.includes("moral_trade_participant_task_cards") &&
        contract.firstClassRecordTables.includes("moral_trade_public_receipt_publication_reviews")
          ? ("pass" as const)
          : ("fail" as const),
      evidence: contract.firstClassRecordTables.join(","),
    },
    {
      id: "render-snapshot-required",
      label: "Reliance, money, and receipt screens require hash-backed render snapshots",
      status: contract.requiredRenderSnapshotSurfaces.every((surface) =>
        contract.sampleScreens.some((screen) => screen.surface === surface && screen.renderSnapshot),
      )
        ? ("pass" as const)
        : ("fail" as const),
      evidence: contract.requiredRenderSnapshotSurfaces.join(","),
    },
    {
      id: "plain-language-primary-copy",
      label: "Primary participant copy excludes internal control names",
      status: evaluation.blockers.some(
        (blocker) =>
          blocker.startsWith("internal_jargon_primary_copy") || blocker.startsWith("raw_enum_primary_copy"),
      )
        ? ("fail" as const)
        : ("pass" as const),
      evidence: `bannedTerms=${contract.bannedPrimaryCopyTerms.length}`,
    },
    {
      id: "task-card-term-map",
      label: "Task cards provide status labels, one next action, details drawers, and stable term keys",
      status: evaluation.blockers.some(
        (blocker) =>
          blocker.startsWith("task_card_") ||
          blocker.startsWith("next_action_") ||
          blocker.startsWith("multiple_primary_actions") ||
          blocker.startsWith("details_drawer") ||
          blocker.startsWith("stable_term"),
      )
        ? ("fail" as const)
        : ("pass" as const),
      evidence: Object.values(contract.stableTermMap).join(", "),
    },
    {
      id: "safe-template-defaults",
      label: "Preview, lock, and receipt surfaces disclose material safe template defaults",
      status: evaluation.blockers.some((blocker) => blocker.startsWith("safe_template_default"))
        ? ("fail" as const)
        : ("pass" as const),
      evidence: `lock=${contract.requiredLockSafeTemplateDefaultFacts.join(",")}; receipt=${contract.requiredReceiptSafeTemplateDefaultFacts.join(",")}`,
    },
    {
      id: "receipt-preview-questions",
      label: "Public receipt preview answers required publication and correction questions",
      status: evaluation.blockers.some((blocker) => blocker.startsWith("receipt_preview_answers_missing"))
        ? ("fail" as const)
        : ("pass" as const),
      evidence: contract.requiredReceiptPreviewQuestions.join(","),
    },
    {
      id: "receipt-sidecar-boundary",
      label: "Public receipt publication is opt-in, non-preferential, non-gamified, and revocable",
      status: evaluation.blockers.some((blocker) => blocker.startsWith("receipt_") || blocker.startsWith("direct_donation"))
        ? ("fail" as const)
        : ("pass" as const),
      evidence: "receipt policy sample blocks publicity-as-trade-term and engagement counters",
    },
  ];
  const blockers = [
    ...evaluation.blockers,
    ...checks.filter((check) => check.status === "fail").map((check) => check.id),
  ];

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-participant-ui-contract",
    validatorVersion: MORAL_TRADE_PARTICIPANT_UI_VALIDATOR_VERSION,
    contractVersion: contract.version,
    blockers,
    checks,
  };
}
