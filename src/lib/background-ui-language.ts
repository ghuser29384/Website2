import { createHash } from "node:crypto";

export const BACKGROUND_UI_COPY_BUNDLE_VERSION =
  "background-ui-copy-bundle-bg84-v1-2026-06-24";
export const BACKGROUND_PARTICIPANT_SCREEN_STATE_SCHEMA_VERSION =
  "background-participant-screen-state-bg84-v1";

export const BACKGROUND_CANONICAL_PARTICIPANT_STATUSES = [
  "off",
  "ready",
  "waiting",
  "possible_opportunity",
  "needs_review",
  "paused",
  "stale_or_unavailable",
  "closed",
] as const;

export type BackgroundParticipantStatus =
  (typeof BACKGROUND_CANONICAL_PARTICIPANT_STATUSES)[number];

export type BackgroundSetupQuestionKey =
  | "what_can_it_use"
  | "what_should_it_look_for"
  | "where_can_it_look"
  | "who_may_see_preview"
  | "run_and_notify"
  | "permission_end";

export type BackgroundPrivacySummaryKey =
  | "find_opportunities_for_me"
  | "let_others_find_me"
  | "approve_source_summary"
  | "confirm_profile_tags"
  | "ask_to_explore"
  | "share_exact_details"
  | "pause_everything_now"
  | "export_activity"
  | "set_notifications";

export interface BackgroundPlainLanguageTerm {
  copyKey: string;
  internalTerm: string;
  participantLabel: string;
  shortExplanation: string;
  technicalDetailsLabel: string;
  distinctionGuard: string;
}

export interface BackgroundSetupQuestion {
  key: BackgroundSetupQuestionKey;
  label: string;
  plainDescription: string;
  underlyingControls: string[];
}

export interface BackgroundThreePartPrivacySummary {
  actionKey: BackgroundPrivacySummaryKey;
  heading: string;
  whatHappens: string;
  whatStaysHidden: string;
  howToStopOrUndo: string;
}

export interface BackgroundTechnicalDetailRow {
  label: string;
  value: string;
}

export interface BackgroundTechnicalDetailsInput {
  broadSignalCategories?: string[];
  outputSchemaVersion?: string | null;
  policyDecisionReceiptRef?: string | null;
  purposeCode?: string | null;
  purposePolicyVersion?: string | null;
  retentionWindow?: string | null;
}

export interface BackgroundParticipantStatusInput {
  closed?: boolean;
  enabled?: boolean;
  laneUnavailable?: boolean;
  needsReview?: boolean;
  opportunityAvailable?: boolean;
  privacyFreezeActive?: boolean;
  queuedOrWaiting?: boolean;
  stale?: boolean;
}

export interface BackgroundParticipantScreenStateInput {
  actionKey: BackgroundPrivacySummaryKey;
  defaultExplanation: string;
  screenKey: string;
  statusInput: BackgroundParticipantStatusInput;
  technicalDetails?: BackgroundTechnicalDetailsInput;
  whySeeingThis: string;
}

export interface BackgroundParticipantScreenState {
  actionLabel: string;
  defaultExplanation: string;
  privacySummary: BackgroundThreePartPrivacySummary;
  schemaVersion: typeof BACKGROUND_PARTICIPANT_SCREEN_STATE_SCHEMA_VERSION;
  screenKey: string;
  setupQuestions: BackgroundSetupQuestion[];
  status: BackgroundParticipantStatus;
  statusLabel: string;
  technicalDetails: {
    collapsedByDefault: true;
    rows: BackgroundTechnicalDetailRow[];
    title: "Technical details";
  };
  uiCopyBundleHash: string;
  uiCopyBundleVersion: typeof BACKGROUND_UI_COPY_BUNDLE_VERSION;
  whySeeingThis: string;
}

export interface BackgroundUiLanguageValidation {
  blockers: string[];
  checks: Array<{
    evidence: string;
    id: string;
    label: string;
    status: "pass" | "fail";
  }>;
  status: "pass" | "fail";
  uiCopyBundleHash: string;
  uiCopyBundleVersion: typeof BACKGROUND_UI_COPY_BUNDLE_VERSION;
}

const DEFAULT_COPY_JARGON_PATTERN =
  /\b(policy decision|bundle hash|manifest|candidate handle|artifact transition|retention hold|anti-probing|rare-combination|internal blocker|phase-gate)\b/i;
const TECHNICAL_DETAIL_FORBIDDEN_PATTERN =
  /\b(candidate-specific|hidden blocker|abuse heuristic|exact counterparty|raw source|contact detail|private wish|rare-combination internal)\b/i;
const PRESSURE_COPY_PATTERN =
  /\b(urgent|scarce|popular|don't miss|last chance|everyone|must|failure|lose this opportunity|why are you declining|shame)\b/i;

export const BACKGROUND_PLAIN_LANGUAGE_TERM_MAP = [
  {
    copyKey: "term.delegate_authorization",
    distinctionGuard: "Separated from inbound discovery so permission to search does not imply being surfaced.",
    internalTerm: "delegate authorization",
    participantLabel: "Find opportunities for me",
    shortExplanation: "Let scheduled helper scans look for broad, consent-safe possibilities.",
    technicalDetailsLabel: "Technical details: delegate authorization scope",
  },
  {
    copyKey: "term.candidate_exposure",
    distinctionGuard: "Separated from outbound search so being findable requires its own consent.",
    internalTerm: "candidate exposure",
    participantLabel: "Let others find me",
    shortExplanation: "Allow broad previews of your profile to be considered by authorized helpers.",
    technicalDetailsLabel: "Technical details: inbound exposure scope",
  },
  {
    copyKey: "term.opportunity_brief",
    distinctionGuard: "A possible opportunity is not an introduction and does not disclose exact identity.",
    internalTerm: "opportunity brief",
    participantLabel: "Possible opportunity",
    shortExplanation: "A broad preview that needs review before either person is contacted.",
    technicalDetailsLabel: "Technical details: opportunity brief schema",
  },
  {
    copyKey: "term.intro_request",
    distinctionGuard: "Asking to explore starts review; it is not autonomous outreach.",
    internalTerm: "intro request",
    participantLabel: "Ask to explore",
    shortExplanation: "Ask Moral Trade to review whether a consent-gated introduction can proceed.",
    technicalDetailsLabel: "Technical details: intro request workflow",
  },
  {
    copyKey: "term.disclosure_grant",
    distinctionGuard: "Mutual consent is separate from sharing exact details.",
    internalTerm: "disclosure grant",
    participantLabel: "Share exact details",
    shortExplanation: "Choose exact fields, purpose, audience, and expiry before details move.",
    technicalDetailsLabel: "Technical details: field-level disclosure grant",
  },
  {
    copyKey: "term.privacy_freeze",
    distinctionGuard: "Pause blocks future access; it does not claim retroactive erasure.",
    internalTerm: "privacy freeze",
    participantLabel: "Pause everything now",
    shortExplanation: "Stop background runs, queued sends, exports, intro advancement, and disclosure access.",
    technicalDetailsLabel: "Technical details: privacy freeze controls",
  },
  {
    copyKey: "term.delegate_receipt",
    distinctionGuard: "Receipts show your activity without revealing hidden counterparties.",
    internalTerm: "delegate receipt",
    participantLabel: "Activity receipt",
    shortExplanation: "A redacted timeline of background actions and state changes.",
    technicalDetailsLabel: "Technical details: receipt schema",
  },
  {
    copyKey: "term.policy_decision",
    distinctionGuard: "Shown only in technical details, not default copy.",
    internalTerm: "policy decision",
    participantLabel: "Safety check result",
    shortExplanation: "A server-side check that decides whether an action is allowed, blocked, or stale.",
    technicalDetailsLabel: "Technical details: policy decision reference",
  },
  {
    copyKey: "term.retention_hold",
    distinctionGuard: "Shown only in technical details and does not imply broader access.",
    internalTerm: "retention hold",
    participantLabel: "Keep required records",
    shortExplanation: "A time-bounded reason some records cannot yet be removed.",
    technicalDetailsLabel: "Technical details: retention hold state",
  },
  {
    copyKey: "term.source_summary_approval",
    distinctionGuard: "Approving a summary does not automatically confirm all tags for matching.",
    internalTerm: "source-summary approval",
    participantLabel: "Approve a source summary",
    shortExplanation: "Approve a redacted summary before selected fields can become eligible.",
    technicalDetailsLabel: "Technical details: source-summary approval",
  },
  {
    copyKey: "term.tag_confirmation",
    distinctionGuard: "Tag confirmation is the step that allows broad fields to influence matching.",
    internalTerm: "tag confirmation",
    participantLabel: "Confirm what can be used",
    shortExplanation: "Choose which broad fields from an approved summary can become match inputs.",
    technicalDetailsLabel: "Technical details: confirmed tag scope",
  },
] as const satisfies readonly BackgroundPlainLanguageTerm[];

export const BACKGROUND_SETUP_QUESTIONS = [
  {
    key: "what_can_it_use",
    label: "What can it use?",
    plainDescription: "Choose the saved wish fields, broad profile fields, or approved summaries that may become inputs.",
    underlyingControls: ["structured_wish_profile", "confirmed_tags", "source_summary_field_scope"],
  },
  {
    key: "what_should_it_look_for",
    label: "What should it look for?",
    plainDescription: "Name the kinds of trades, help, introductions, or coordination you want found.",
    underlyingControls: ["goals", "purpose_codes", "helper_strategy"],
  },
  {
    key: "where_can_it_look",
    label: "Where can it look?",
    plainDescription: "Limit scans to broad registry previews, cohorts, saved searches, or reviewed source summaries.",
    underlyingControls: ["allowed_surfaces", "cohort_scope", "saved_search_scope"],
  },
  {
    key: "who_may_see_preview",
    label: "Who may see a broad preview?",
    plainDescription: "Choose whether only you, a named cohort, or another consented participant can see a broad preview.",
    underlyingControls: ["audience_scope", "inbound_exposure", "counterparty_prompt_scope"],
  },
  {
    key: "run_and_notify",
    label: "How often should it run or notify?",
    plainDescription: "Pick conservative scan, digest, quiet-hour, and notification-volume limits.",
    underlyingControls: ["run_budget", "digest_frequency", "quiet_hours", "notification_volume"],
  },
  {
    key: "permission_end",
    label: "When should this permission end?",
    plainDescription: "Set expiry, reconfirmation, pause, narrow, revoke, and receipt preferences.",
    underlyingControls: ["expires_at", "reconfirmation", "revocation", "receipts"],
  },
] as const satisfies readonly BackgroundSetupQuestion[];

export const BACKGROUND_PRIVACY_SUMMARY_TEMPLATES = [
  {
    actionKey: "find_opportunities_for_me",
    heading: "Find opportunities for me",
    whatHappens: "Scheduled helper scans may compare approved broad fields against allowed broad surfaces.",
    whatStaysHidden: "Exact wishes, source text, contact details, private constraints, and hidden review reasons stay hidden.",
    howToStopOrUndo: "Pause, narrow, revoke, or let the permission expire; old queued work rechecks permission before acting.",
  },
  {
    actionKey: "let_others_find_me",
    heading: "Let others find me",
    whatHappens: "Your broad preview may be considered by authorized helper scans within the selected audience and purpose.",
    whatStaysHidden: "Exact identity, contact details, exact wishes, source notes, and private constraints are not shown by this setting.",
    howToStopOrUndo: "Turn it off, narrow the audience, reduce budgets, set a cool-off, or wait for expiry.",
  },
  {
    actionKey: "approve_source_summary",
    heading: "Approve a source summary",
    whatHappens: "A reviewed summary can be saved as a redacted record for the fields you choose later.",
    whatStaysHidden: "Raw source material and unconfirmed tags stay out of matching, notifications, exports, and public routes.",
    howToStopOrUndo: "Revoke or correct the summary; dependent outputs become stale before reuse.",
  },
  {
    actionKey: "confirm_profile_tags",
    heading: "Confirm what can be used",
    whatHappens: "Selected broad tags can influence deterministic matching under the chosen purpose.",
    whatStaysHidden: "Unselected tags, raw notes, exact claims, and hidden safety checks stay private.",
    howToStopOrUndo: "Remove the tag confirmation or narrow the purpose; dependent scans and briefs revalidate.",
  },
  {
    actionKey: "ask_to_explore",
    heading: "Ask to explore",
    whatHappens: "Moral Trade can review whether an intro path should proceed from this broad preview.",
    whatStaysHidden: "The other person does not receive exact wishes, contact details, source notes, or targeting reasons from this action alone.",
    howToStopOrUndo: "Cancel before advancement, decline later prompts, or pause background networking.",
  },
  {
    actionKey: "share_exact_details",
    heading: "Share exact details",
    whatHappens: "Only selected fields may be shared with the selected audience for the stated purpose and expiry.",
    whatStaysHidden: "Unselected fields, unrelated source notes, private constraints, and hidden review signals remain hidden.",
    howToStopOrUndo: "Revoke future access or wait for expiry; previously viewed information cannot be technically erased.",
  },
  {
    actionKey: "pause_everything_now",
    heading: "Pause everything now",
    whatHappens: "Background runs, queued non-critical sends, exports, intro advancement, and disclosure access pause.",
    whatStaysHidden: "The pause reason is not required and is not shown to counterparties.",
    howToStopOrUndo: "Release later with step-up authentication and fresh revalidation.",
  },
  {
    actionKey: "export_activity",
    heading: "Export my activity",
    whatHappens: "A participant-owned export can be generated from allowed records while no privacy pause is active.",
    whatStaysHidden: "Hidden counterparties, exact private fields without access, abuse heuristics, and raw source text remain excluded.",
    howToStopOrUndo: "Pause everything to block new exports, or request correction, deletion, or restriction.",
  },
  {
    actionKey: "set_notifications",
    heading: "Set notifications",
    whatHappens: "Non-critical updates can be batched, narrowed, or muted within safe delivery rules.",
    whatStaysHidden: "Emails and notifications do not include exact wishes, source notes, contact details, or private constraints.",
    howToStopOrUndo: "Switch to digest-only, lower volume, set quiet hours, or pause background networking.",
  },
] as const satisfies readonly BackgroundThreePartPrivacySummary[];

export const BACKGROUND_STATUS_LABELS = {
  closed: "Closed",
  needs_review: "Needs review",
  off: "Off",
  paused: "Paused",
  possible_opportunity: "Possible opportunity",
  ready: "Ready",
  stale_or_unavailable: "Stale or unavailable",
  waiting: "Waiting",
} as const satisfies Record<BackgroundParticipantStatus, string>;

function canonicalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForHash);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeForHash(entry)]),
    );
  }

  if (typeof value === "string") {
    return value.normalize("NFC");
  }

  return value;
}

function hashUiCopyObject(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeForHash(value)))
    .digest("hex");
}

export const BACKGROUND_UI_COPY_BUNDLE_HASH = hashUiCopyObject({
  privacySummaries: BACKGROUND_PRIVACY_SUMMARY_TEMPLATES,
  setupQuestions: BACKGROUND_SETUP_QUESTIONS,
  statusLabels: BACKGROUND_STATUS_LABELS,
  termMap: BACKGROUND_PLAIN_LANGUAGE_TERM_MAP,
  version: BACKGROUND_UI_COPY_BUNDLE_VERSION,
});

export function getBackgroundUiCopyBundle() {
  return {
    hash: BACKGROUND_UI_COPY_BUNDLE_HASH,
    privacySummaries: BACKGROUND_PRIVACY_SUMMARY_TEMPLATES.map((summary) => ({ ...summary })),
    setupQuestions: BACKGROUND_SETUP_QUESTIONS.map((question) => ({
      ...question,
      underlyingControls: [...question.underlyingControls],
    })),
    statusLabels: { ...BACKGROUND_STATUS_LABELS },
    termMap: BACKGROUND_PLAIN_LANGUAGE_TERM_MAP.map((term) => ({ ...term })),
    version: BACKGROUND_UI_COPY_BUNDLE_VERSION,
  };
}

export function getBackgroundPlainLanguageTerm(internalTerm: string) {
  const normalized = internalTerm.trim().toLowerCase();

  return (
    BACKGROUND_PLAIN_LANGUAGE_TERM_MAP.find(
      (term) => term.internalTerm.toLowerCase() === normalized,
    ) ?? null
  );
}

export function getBackgroundPrivacySummary(actionKey: BackgroundPrivacySummaryKey) {
  const summary = BACKGROUND_PRIVACY_SUMMARY_TEMPLATES.find(
    (entry) => entry.actionKey === actionKey,
  );

  if (!summary) {
    throw new Error(`Unknown background privacy summary action: ${actionKey}`);
  }

  return { ...summary };
}

export function isBackgroundParticipantStatus(
  value: string,
): value is BackgroundParticipantStatus {
  return BACKGROUND_CANONICAL_PARTICIPANT_STATUSES.includes(
    value as BackgroundParticipantStatus,
  );
}

export function deriveBackgroundParticipantStatus({
  closed = false,
  enabled = false,
  laneUnavailable = false,
  needsReview = false,
  opportunityAvailable = false,
  privacyFreezeActive = false,
  queuedOrWaiting = false,
  stale = false,
}: BackgroundParticipantStatusInput): BackgroundParticipantStatus {
  if (closed) {
    return "closed";
  }

  if (privacyFreezeActive) {
    return "paused";
  }

  if (!enabled) {
    return "off";
  }

  if (laneUnavailable || stale) {
    return "stale_or_unavailable";
  }

  if (needsReview) {
    return "needs_review";
  }

  if (opportunityAvailable) {
    return "possible_opportunity";
  }

  if (queuedOrWaiting) {
    return "waiting";
  }

  return "ready";
}

function redactTechnicalDetail(value: string) {
  if (TECHNICAL_DETAIL_FORBIDDEN_PATTERN.test(value)) {
    return "withheld";
  }

  return value.replace(/\s+/g, " ").trim() || "not set";
}

export function buildBackgroundTechnicalDetailsPanel({
  broadSignalCategories = [],
  outputSchemaVersion,
  policyDecisionReceiptRef,
  purposeCode,
  purposePolicyVersion,
  retentionWindow,
}: BackgroundTechnicalDetailsInput) {
  const rows: BackgroundTechnicalDetailRow[] = [
    {
      label: "Purpose",
      value: redactTechnicalDetail([purposeCode, purposePolicyVersion].filter(Boolean).join(" / ")),
    },
    {
      label: "Broad signal categories",
      value: redactTechnicalDetail(
        broadSignalCategories.length ? broadSignalCategories.join(", ") : "none",
      ),
    },
    {
      label: "Retention window",
      value: redactTechnicalDetail(retentionWindow ?? "default retention window"),
    },
    {
      label: "Safety check receipt",
      value: redactTechnicalDetail(policyDecisionReceiptRef ?? "not created for this view"),
    },
    {
      label: "Copy and schema",
      value: redactTechnicalDetail(
        `${BACKGROUND_UI_COPY_BUNDLE_VERSION}; ${outputSchemaVersion ?? "screen-state schema"}`,
      ),
    },
  ];

  return {
    collapsedByDefault: true as const,
    rows,
    title: "Technical details" as const,
  };
}

export function buildBackgroundParticipantScreenState({
  actionKey,
  defaultExplanation,
  screenKey,
  statusInput,
  technicalDetails = {},
  whySeeingThis,
}: BackgroundParticipantScreenStateInput): BackgroundParticipantScreenState {
  const status = deriveBackgroundParticipantStatus(statusInput);
  const summary = getBackgroundPrivacySummary(actionKey);

  return {
    actionLabel: summary.heading,
    defaultExplanation,
    privacySummary: summary,
    schemaVersion: BACKGROUND_PARTICIPANT_SCREEN_STATE_SCHEMA_VERSION,
    screenKey,
    setupQuestions: BACKGROUND_SETUP_QUESTIONS.map((question) => ({
      ...question,
      underlyingControls: [...question.underlyingControls],
    })),
    status,
    statusLabel: BACKGROUND_STATUS_LABELS[status],
    technicalDetails: buildBackgroundTechnicalDetailsPanel(technicalDetails),
    uiCopyBundleHash: BACKGROUND_UI_COPY_BUNDLE_HASH,
    uiCopyBundleVersion: BACKGROUND_UI_COPY_BUNDLE_VERSION,
    whySeeingThis,
  };
}

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): BackgroundUiLanguageValidation["checks"][number] {
  return {
    evidence,
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

export function validateBackgroundUiLanguageContract(): BackgroundUiLanguageValidation {
  const bundle = getBackgroundUiCopyBundle();
  const recomputedHash = hashUiCopyObject({
    privacySummaries: BACKGROUND_PRIVACY_SUMMARY_TEMPLATES,
    setupQuestions: BACKGROUND_SETUP_QUESTIONS,
    statusLabels: BACKGROUND_STATUS_LABELS,
    termMap: BACKGROUND_PLAIN_LANGUAGE_TERM_MAP,
    version: BACKGROUND_UI_COPY_BUNDLE_VERSION,
  });
  const allDefaultCopy = [
    ...bundle.termMap.flatMap((term) => [
      term.participantLabel,
      term.shortExplanation,
      term.distinctionGuard,
    ]),
    ...bundle.setupQuestions.flatMap((question) => [question.label, question.plainDescription]),
    ...bundle.privacySummaries.flatMap((summary) => [
      summary.heading,
      summary.whatHappens,
      summary.whatStaysHidden,
      summary.howToStopOrUndo,
    ]),
    ...Object.values(bundle.statusLabels),
  ].join("\n");
  const requiredDistinctions = [
    ["delegate authorization", "Find opportunities for me"],
    ["candidate exposure", "Let others find me"],
    ["opportunity brief", "Possible opportunity"],
    ["intro request", "Ask to explore"],
    ["disclosure grant", "Share exact details"],
    ["privacy freeze", "Pause everything now"],
  ] as const;
  const summaryPartsPresent = bundle.privacySummaries.every(
    (summary) =>
      summary.whatHappens.length > 20 &&
      summary.whatStaysHidden.length > 20 &&
      summary.howToStopOrUndo.length > 20,
  );
  const technicalPanel = buildBackgroundTechnicalDetailsPanel({
    broadSignalCategories: ["cause area", "trade mode"],
    policyDecisionReceiptRef: "bgpd_example",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: "v1",
    retentionWindow: "90 days",
  });
  const technicalCopy = technicalPanel.rows.map((row) => `${row.label}: ${row.value}`).join("\n");

  const checks = [
    validationCheck(
      "ui-copy-bundle-hash-valid",
      "UI-copy bundle hash is recomputed from the term map, setup questions, privacy summaries, and statuses",
      bundle.hash === BACKGROUND_UI_COPY_BUNDLE_HASH && bundle.hash === recomputedHash,
      `${bundle.version}:${bundle.hash}`,
    ),
    validationCheck(
      "six-setup-questions",
      "One-page setup uses exactly six stable plain-language questions",
      bundle.setupQuestions.length === 6 &&
        bundle.setupQuestions.map((question) => question.key).join(",") ===
          "what_can_it_use,what_should_it_look_for,where_can_it_look,who_may_see_preview,run_and_notify,permission_end",
      bundle.setupQuestions.map((question) => question.label).join(" | "),
    ),
    validationCheck(
      "canonical-status-vocabulary",
      "Participant screens use the canonical non-enumerating status vocabulary",
      Object.keys(bundle.statusLabels).sort().join(",") ===
        [...BACKGROUND_CANONICAL_PARTICIPANT_STATUSES].sort().join(","),
      Object.keys(bundle.statusLabels).join(", "),
    ),
    validationCheck(
      "default-copy-avoids-implementation-jargon",
      "Default participant-facing copy avoids implementation jargon",
      !DEFAULT_COPY_JARGON_PATTERN.test(allDefaultCopy),
      "default copy scanned",
    ),
    validationCheck(
      "required-distinction-labels",
      "Plain-language labels preserve outbound, inbound, opportunity, intro, disclosure, and pause distinctions",
      requiredDistinctions.every(([internalTerm, label]) =>
        bundle.termMap.some(
          (term) => term.internalTerm === internalTerm && term.participantLabel === label,
        ),
      ),
      requiredDistinctions.map(([, label]) => label).join(" | "),
    ),
    validationCheck(
      "three-part-privacy-summaries",
      "High-impact summaries include what happens, what stays hidden, and how to stop or undo future access",
      summaryPartsPresent && !PRESSURE_COPY_PATTERN.test(allDefaultCopy),
      `${bundle.privacySummaries.length} summary templates`,
    ),
    validationCheck(
      "technical-details-sanitized",
      "Technical details are opt-in, generic, and do not reveal hidden candidate-specific internals",
      !TECHNICAL_DETAIL_FORBIDDEN_PATTERN.test(technicalCopy) &&
        technicalPanel.collapsedByDefault === true,
      technicalCopy,
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    blockers,
    checks,
    status: blockers.length ? "fail" : "pass",
    uiCopyBundleHash: BACKGROUND_UI_COPY_BUNDLE_HASH,
    uiCopyBundleVersion: BACKGROUND_UI_COPY_BUNDLE_VERSION,
  };
}
