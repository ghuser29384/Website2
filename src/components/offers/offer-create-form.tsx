"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";

import { createOfferAction } from "@/app/actions";
import {
  BASELINE_BOND_DEFAULT_CURRENCY,
  BASELINE_CREDIBILITY_BOND_COPY,
  calculatePilotBaselineBondCapCents,
  formatBaselineBondAmount,
  getBaselineBondEvidenceDueAt,
  validateBaselineBondInput,
} from "@/lib/baseline-bonds";
import {
  PERFORMANCE_BOND_COPY,
  PERFORMANCE_BOND_COUNTERPARTY_WARNING,
  PERFORMANCE_BOND_DEFAULT_CURRENCY,
  PERFORMANCE_BOND_EVIDENCE_TEMPLATES,
  PERFORMANCE_BOND_LIMITATION_COPY,
  PERFORMANCE_BOND_REFUND_SUMMARY,
  PERFORMANCE_BOND_REVIEWER_POLICY,
  formatPerformanceBondAmount,
  normalizePerformanceBondEvidenceSchema,
  parsePerformanceBondSplitConfig,
  validatePerformanceBondTerms,
} from "@/lib/performance-bonds";
import {
  buildDonationOffsetDonorOfRecordPreview,
  calculateDonationOffsetPoolProgress,
  calculateDonationOffsetPreview,
  createDefaultDonationOffsetFields,
  formatDonationOffsetPoolStatus,
  formatDonationOffsetRatio,
  formatDonationOffsetTimeHorizon,
  formatDonationOffsetUnmatchedRule,
  formatDonationOffsetVerificationMethod,
  getConsensusCharities,
  getDonationOffsetComplexityWarnings,
  getSelectableRegisteredCharities,
  findRegisteredCharityById,
  validateDonationOffsetDonorOfRecordInput,
  validateDonationOffsetFields,
  validateDonationOffsetSubmissionGuards,
  DONATION_OFFSET_PARTICIPATION_MODE_OPTIONS,
  DONATION_OFFSET_POOL_SIDE_OPTIONS,
  DONATION_OFFSET_TIME_HORIZON_OPTIONS,
  DONATION_OFFSET_UNMATCHED_RULE_OPTIONS,
  DONATION_OFFSET_VERIFICATION_OPTIONS,
  type DonationOffsetCharitableSolicitationTreatment,
  type DonationOffsetDestinationVerificationStatus,
  type DonationOffsetDonorOfRecordGateStatus,
  type DonationOffsetDonorOfRecordInput,
  type DonationOffsetDonorOfRecordRole,
  type DonationOffsetTaxReceiptTreatment,
} from "@/lib/donation-offsets";
import {
  CAUSE_OPTIONS,
  COMPROMISE_CAUSE_OPTIONS,
  DURATION_OPTIONS,
  OFFER_MODE_OPTIONS,
  PAYMENT_INTERVAL_UNIT_OPTIONS,
  VERIFICATION_OPTIONS,
  type PaymentIntervalUnit,
  type OfferMode,
} from "@/lib/offers";
import {
  evaluateMoralTradeProtocolDraft,
  formatProtocolReviewStatus,
  getOfferReviewWorkflowCards,
  type MoralTradeProtocolDraftReview,
  type MoralTradeVerificationStepStatus,
} from "@/lib/proposal-review";
import {
  buildPledgeSwapManualReviewPreview,
  validatePledgeSwapManualReviewInput,
  type PledgeSwapActionReversibility,
  type PledgeSwapBaselineConfidence,
  type PledgeSwapBinarySafetyAssertion,
  type PledgeSwapGateStatus,
  type PledgeSwapManualReviewInput,
  type PledgeSwapOrdinaryServiceClassification,
  type PledgeSwapRepresentativeAuthority,
  type PledgeSwapThirdPartyObligation,
} from "@/lib/pledge-swaps";

interface DonationOffsetPoolOption {
  id: string;
  name: string;
  compromiseCharityId: string;
  compromiseCharityName: string;
  offsetRatio: number;
  timeHorizon: "one_off" | "recurring";
  verificationMethod: "proof_of_past_donations" | "receipts_uploaded" | "funds_in_escrow" | "third_party_audit";
  unmatchedSurplusRule:
    | "return_to_donors"
    | "donate_to_compromise_destination"
    | "donate_to_original_cause"
    | "split_evenly";
  assuranceMinimumCents: number;
  maximumCapCents: number;
  assuranceDeadlineAt: string | null;
  sideALabel: string;
  sideBLabel: string;
  sideATotalCents: number;
  sideBTotalCents: number;
  matchedCompromiseCents: number;
  status: "open" | "assurance_pending" | "assurance_met" | "closed";
}

interface OfferCreateFormProps {
  formMessage:
    | {
        text: string;
        tone: "error" | "success";
      }
    | null;
  supabaseReady: boolean;
  availablePools: DonationOffsetPoolOption[];
  initialMode?: OfferMode;
  initialOffsetParticipationMode?: "direct" | "pool";
  initialOffsetPoolId?: string;
  initialOffsetPoolSide?: "side_a" | "side_b" | "";
  initialTemplate?: OfferTemplate | null;
  paymentBondsEnabled: boolean;
  pledgePerformanceBondsEnabled: boolean;
  liveBondPaymentsEnabled: boolean;
  performanceBondMinCents: number;
  performanceBondMaxCents: number;
  provenanceValidationRules: ProvenanceValidationRuleOption[];
}

interface ProvenanceValidationRuleOption {
  key: string;
  label: string;
  rule: string;
}

export interface OfferTemplate {
  title: string;
  description: string;
  mode: OfferMode;
  offeredCause: string;
  requestedCause: string;
  compromiseCause: string;
  offerAction: string;
  requestAction: string;
  baselineStatement: string;
  exitCondition: string;
  notes: string;
  offerImpact: string;
  minCounterpartyImpact: string;
  verification: string;
  duration: string;
  paymentIntervalUnit: PaymentIntervalUnit;
  paymentIntervalValue: string;
  trustLevel: string;
  offset?: {
    baselineAmountUsd: string;
    requestedMatchingAmountUsd: string;
    baselineOpposedCause: string;
    requestedOpposedCause: string;
    participationMode: "direct" | "pool";
    compromiseDestinationId?: string;
    offsetRatio: string;
    timeHorizon?: "one_off" | "recurring";
    verificationMethod?: "proof_of_past_donations" | "receipts_uploaded" | "funds_in_escrow" | "third_party_audit";
    unmatchedSurplusRule?: "return_to_donors" | "donate_to_compromise_destination" | "donate_to_original_cause" | "split_evenly";
  };
}

interface OfferWizardStep {
  id: string;
  title: string;
  detail: string;
  href: string;
  complete: boolean;
}

interface EvidenceProvenancePreflightItem {
  detail: string;
  key: string;
  label: string;
  rule: string;
  status: MoralTradeVerificationStepStatus;
}

interface CopilotReviewOutput {
  status: string;
  completeness: {
    missing_required_fields: string[];
    underspecified_fields: string[];
    policy_conflicts: string[];
  };
  match_explanation: {
    confidence_band: string;
    factor_codes: string[];
    redactions_applied: string[];
  };
  verification_loop: Array<{
    blocks_matchable: boolean;
    detail: string;
    key: string;
    label: string;
    status: string;
  }>;
  clarification_questions: Array<{
    field: string;
    question: string;
  }>;
  next_step_checklist: string[];
  cited_evidence_table: Array<{
    citation: string;
    claim: string;
    evidence_type: string;
    reviewer_note: string;
    status: string;
  }>;
  reviewer_summary: string;
}

interface CopilotReviewResponse {
  blockers?: string[];
  checkedAt?: string;
  decisioningMode?: string;
  evidenceMetadataSummary?: {
    acceptedCount: number;
    blockers: string[];
    ignoredFieldCount: number;
    rejectedCount: number;
  };
  fallback?: string;
  ok: boolean;
  output?: CopilotReviewOutput;
  stateMutation?: boolean;
}

type CopilotReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { message: string; status: "error" }
  | { response: CopilotReviewResponse; status: "ready" };

interface TextareaTemplateSuggestion {
  body: string;
  keywords: readonly string[];
  title: string;
}

interface TemplateTextareaSuggestionsProps {
  helpText: string;
  id?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
  suggestions: readonly TextareaTemplateSuggestion[];
  value: string;
}

const defaultOffsetFields = createDefaultDonationOffsetFields();
const defaultOffsetDonorOfRecordExplanation =
  "The participant who makes the external donation remains donor of record; Moral Trade is not donor of record.";
const defaultOffsetTaxReceiptExplanation =
  "No participant should claim tax deductibility from Moral Trade. Any external receipt remains an operational record subject to legal review.";
const defaultPledgeReciprocalReleaseRule =
  "If one side exits under the stated rule, both sides are released from future obligations while completed or disputed past obligations remain reviewable.";
const defaultPledgeWithdrawalBeforeLockRule =
  "Either side can withdraw before final lock without penalty or private-detail escalation.";
const defaultPledgeEvidencePlan =
  "Use a public log, dated receipt, or similarly narrow artifact for the promised action.";
const defaultPledgeLeastIntrusiveAlternative =
  "Use a dated self-log or receipt before private messages, location history, protected-trait disclosure, or third-party exposure.";

function formatPledgeGateStatus(status: PledgeSwapGateStatus) {
  return status.replaceAll("_", " ");
}

function pledgeGateStatusClass(status: PledgeSwapGateStatus) {
  if (status === "blocked") {
    return "blocked";
  }

  if (status === "needs_input" || status === "human_review") {
    return "human_review";
  }

  return "pass";
}

function formatOffsetDonorGateStatus(status: DonationOffsetDonorOfRecordGateStatus) {
  return status.replaceAll("_", " ");
}

function offsetDonorGateStatusClass(status: DonationOffsetDonorOfRecordGateStatus) {
  if (status === "blocked") {
    return "blocked";
  }

  if (status === "needs_input" || status === "human_review") {
    return "human_review";
  }

  return "pass";
}

const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    title: "30-day pledge swap",
    description: "A short, reviewable commitment in exchange for a reciprocal action.",
    mode: "pledge",
    offeredCause: "Animal welfare",
    requestedCause: "Global poverty",
    compromiseCause: "Not needed",
    offerAction:
      "I will follow a vegetarian diet for the review period and keep a simple public log of exceptions.",
    requestAction:
      "The counterparty will donate to an evidence-focused global health or poverty charity during the same period.",
    baselineStatement:
      "Without this trade, I would not make this short diet commitment during the next 30 days.",
    exitCondition:
      "Either side can pause before the review period starts; after it starts, missed evidence creates an unresolved record rather than a completed one.",
    notes:
      "This is a voluntary pledge swap. Each side should be free to decline, pause, or renegotiate if the burden becomes materially different from what was stated.",
    offerImpact: "7",
    minCounterpartyImpact: "6",
    verification: "Public pledge",
    duration: "30 days",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "3",
  },
  {
    title: "Matched donation offset",
    description: "Redirect opposed donations to a named compromise destination with evidence rules.",
    mode: "offset",
    offeredCause: "Democracy",
    requestedCause: "Global poverty",
    compromiseCause: "Global poverty",
    offerAction:
      "I will redirect a real planned donation away from my baseline opposed cause and into the named compromise destination.",
    requestAction:
      "The counterparty will redirect the matched portion of their opposed donation into the same compromise destination.",
    baselineStatement:
      "I have a real baseline intention to make the opposed donation unless this offset clears review.",
    exitCondition:
      "If the match is incomplete by the deadline, the unmatched surplus rule controls and the record stays unresolved until evidence is reviewed.",
    notes:
      "This offset should only be used for a genuine baseline intention. It is not a threat, custody promise, tax claim, or legal escrow arrangement.",
    offerImpact: "7",
    minCounterpartyImpact: "7",
    verification: "Manual review required",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
    offset: {
      baselineAmountUsd: "1000",
      requestedMatchingAmountUsd: "1000",
      baselineOpposedCause: "Democracy",
      requestedOpposedCause: "Gun rights",
      participationMode: "direct",
      offsetRatio: "1",
    },
  },
  {
    title: "Threshold offset pool",
    description: "A pooled donation offset with a named threshold and review gate.",
    mode: "offset",
    offeredCause: "Democracy",
    requestedCause: "Global poverty",
    compromiseCause: "Not needed",
    offerAction:
      "I will join a pooled offset and redirect my baseline opposed donation if the pool reaches the assurance threshold.",
    requestAction:
      "Counterparties on the other side will redirect matching opposed donations into the same compromise destination.",
    baselineStatement:
      "The pool only counts commitments attached to a real baseline donation intention and reviewable evidence.",
    exitCondition:
      "If the assurance threshold is not met by the deadline, the pool closes or follows its published unmatched-surplus rule.",
    notes:
      "This is a thresholded offset pool, not custody, escrow, tax advice, or a guarantee that funds have moved before evidence review.",
    offerImpact: "7",
    minCounterpartyImpact: "7",
    verification: "Manual review required",
    duration: "3 months",
    paymentIntervalUnit: "none",
    paymentIntervalValue: "1",
    trustLevel: "4",
    offset: {
      baselineAmountUsd: "500",
      requestedMatchingAmountUsd: "500",
      baselineOpposedCause: "Democracy",
      requestedOpposedCause: "Gun rights",
      participationMode: "pool",
      offsetRatio: "1",
    },
  },
];

const EXIT_CONDITION_TEMPLATE_SUGGESTIONS: TextareaTemplateSuggestion[] = [
  {
    title: "No acceptance by date",
    body: "If no counterparty accepts by [date], the offer expires automatically.",
    keywords: ["acceptance", "accepts", "date", "deadline", "expire", "expiry"],
  },
  {
    title: "Evidence deadline missed",
    body:
      "If required evidence is not submitted by the deadline, the record remains unresolved and no completion badge is shown.",
    keywords: ["badge", "completion", "deadline", "evidence", "missing", "unresolved"],
  },
  {
    title: "Missed check-ins",
    body:
      "If either party misses two scheduled check-ins, the trade pauses until both parties reconfirm.",
    keywords: ["check-ins", "missed", "pause", "reconfirm", "schedule"],
  },
  {
    title: "Verification review",
    body:
      "If payment, donation, or offset evidence cannot be verified, the trade is paused for manual review.",
    keywords: ["donation", "evidence", "manual review", "offset", "payment", "verify"],
  },
  {
    title: "Material change before acceptance",
    body:
      "If a material fact changes before acceptance, either party may cancel before performance begins.",
    keywords: ["acceptance", "cancel", "change", "material", "performance"],
  },
  {
    title: "Baseline already completed",
    body:
      "If the agreed no-trade baseline has already been completed before matching, the offer expires.",
    keywords: ["baseline", "completed", "expire", "matching", "no-trade"],
  },
  {
    title: "Counterparty withdraws",
    body:
      "If the counterparty withdraws before the acceptance deadline, both parties are released from the commitment.",
    keywords: ["acceptance", "commitment", "deadline", "released", "withdraw"],
  },
  {
    title: "Platform safety review",
    body:
      "If the platform flags the trade for legality, safety, coercion, or threat concerns, the trade is paused pending review.",
    keywords: ["coercion", "legality", "pause", "safety", "threat"],
  },
  {
    title: "Mutual written cancellation",
    body:
      "If both parties mutually agree in writing, the trade can be cancelled before the evidence deadline.",
    keywords: ["cancel", "deadline", "evidence", "mutual", "writing"],
  },
  {
    title: "Completion date passes",
    body:
      "If the offer is not completed by [date], it expires and is marked incomplete rather than failed.",
    keywords: ["complete", "date", "expire", "failed", "incomplete"],
  },
];

const TEMPLATE_SUGGESTION_STOP_WORDS = new Set([
  "and",
  "are",
  "before",
  "both",
  "can",
  "for",
  "from",
  "has",
  "have",
  "into",
  "not",
  "the",
  "this",
  "until",
  "what",
  "when",
  "with",
]);

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function toIsoDateOrNull(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function readFormControlValue(event: { currentTarget: EventTarget }) {
  return (event.currentTarget as unknown as { value: string }).value;
}

function getTemplateSuggestionTokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !TEMPLATE_SUGGESTION_STOP_WORDS.has(token));
}

function getTemplateSuggestionSearchText(suggestion: TextareaTemplateSuggestion) {
  return [suggestion.title, suggestion.body, ...suggestion.keywords].join(" ").toLowerCase();
}

function filterTemplateSuggestions(
  suggestions: readonly TextareaTemplateSuggestion[],
  value: string,
) {
  const tokens = getTemplateSuggestionTokens(value);

  if (!tokens.length) {
    return suggestions;
  }

  return suggestions.filter((suggestion) => {
    const searchText = getTemplateSuggestionSearchText(suggestion);

    return tokens.some((token) => searchText.includes(token));
  });
}

function TemplateTextareaSuggestions({
  helpText,
  id,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  suggestions,
  value,
}: TemplateTextareaSuggestionsProps) {
  const generatedId = useId();
  const helpId = useId();
  const instructionsId = useId();
  const labelId = useId();
  const listboxId = useId();
  const textareaId = id ?? generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const filteredSuggestions = useMemo(
    () => filterTemplateSuggestions(suggestions, value),
    [suggestions, value],
  );
  const highlightedIndex = filteredSuggestions.length
    ? Math.min(activeIndex, filteredSuggestions.length - 1)
    : -1;

  function acceptSuggestion(suggestion: TextareaTemplateSuggestion) {
    onChange(suggestion.body);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        filteredSuggestions.length ? (currentIndex + 1) % filteredSuggestions.length : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        filteredSuggestions.length
          ? (currentIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length
          : 0,
      );
      return;
    }

    if (
      (event.key === "Enter" || event.key === "Tab") &&
      isOpen &&
      highlightedIndex >= 0
    ) {
      if (event.key === "Enter") {
        event.preventDefault();
      }

      acceptSuggestion(filteredSuggestions[highlightedIndex]);
    }
  }

  return (
    <div
      className="field template-textarea-field"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <label htmlFor={textareaId} id={labelId}>
        {label}
      </label>
      <div className="template-textarea-shell">
        <textarea
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-describedby={`${helpId} ${instructionsId}`}
          id={textareaId}
          name={name}
          onChange={(event) => {
            onChange(readFormControlValue(event));
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          rows={rows}
          value={value}
        />
        {isOpen ? (
          <div className="template-suggestion-panel">
            <div className="template-suggestion-panel-head">
              <span>Templates</span>
              <small>Optional</small>
            </div>
            {filteredSuggestions.length ? (
              <div
                className="template-suggestion-list"
                id={listboxId}
                role="listbox"
                aria-label={`${label} templates`}
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    aria-selected={index === highlightedIndex}
                    className="template-suggestion-option"
                    id={`${listboxId}-option-${index}`}
                    key={suggestion.body}
                    role="option"
                    type="button"
                    onClick={() => acceptSuggestion(suggestion)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <strong>{suggestion.title}</strong>
                    <span>{suggestion.body}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="template-suggestion-empty" role="status">
                No matching templates. Custom text is fine.
              </div>
            )}
          </div>
        ) : null}
      </div>
      <small id={helpId}>{helpText}</small>
      <span className="sr-only" id={instructionsId}>
        Template suggestions appear after this field. Use arrow keys to move through suggestions,
        Enter or Tab to accept the highlighted template, or Escape to close the suggestions.
      </span>
    </div>
  );
}

function formatOfferModeLabel(mode: OfferMode) {
  return OFFER_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

function formatVerificationStepStatus(status: MoralTradeVerificationStepStatus) {
  switch (status) {
    case "blocked":
      return "Blocked";
    case "human_review":
      return "Review";
    case "needs_input":
      return "Input";
    default:
      return "Pass";
  }
}

function getProvenanceRule(
  rulesByKey: Map<string, ProvenanceValidationRuleOption>,
  key: string,
  fallbackLabel: string,
  fallbackRule: string,
) {
  return rulesByKey.get(key) ?? { key, label: fallbackLabel, rule: fallbackRule };
}

function buildEvidenceProvenancePreflight(
  review: MoralTradeProtocolDraftReview,
  provenanceValidationRules: readonly ProvenanceValidationRuleOption[],
): EvidenceProvenancePreflightItem[] {
  const rulesByKey = new Map(provenanceValidationRules.map((rule) => [rule.key, rule]));
  const evidenceRows = review.citedEvidenceTable;
  const evidenceLocatorRows = evidenceRows.filter((row) => row.evidenceType === "evidence_locator");
  const artifactRequestRows = evidenceRows.filter((row) => row.evidenceType === "artifact_request");
  const hasEvidenceLocator = evidenceLocatorRows.length > 0;
  const requestedArtifacts = review.reviewInstructions.artifactsToRequest;
  const artifactNeedCount = Math.max(requestedArtifacts.length, artifactRequestRows.length);
  const evidenceMentionsExternalEntity = [...requestedArtifacts, ...evidenceRows.map((row) => row.claim)]
    .join(" ")
    .toLowerCase()
    .match(/charity|donation|payment|provider|receipt|external/);

  return [
    {
      ...getProvenanceRule(
        rulesByKey,
        "claim-artifact-links",
        "Claims link to existing artifacts",
        "Every evidence claim must link to existing artifacts.",
      ),
      status: hasEvidenceLocator ? "human_review" : "needs_input",
      detail: hasEvidenceLocator
        ? `${evidenceLocatorRows.length} evidence locator(s) can be turned into artifact links during review.`
        : `${artifactNeedCount || 1} scoped artifact request(s) remain before reviewer reliance.`,
    },
    {
      ...getProvenanceRule(
        rulesByKey,
        "scope-alignment",
        "Artifact scopes match claims",
        "Artifact claim scopes must match the claim being reviewed.",
      ),
      status: artifactNeedCount ? "needs_input" : "human_review",
      detail: artifactNeedCount
        ? "Each requested artifact needs one claim scope before it can support completion."
        : "Draft claims are present; reviewer scope still controls whether evidence fits the claim.",
    },
    {
      ...getProvenanceRule(
        rulesByKey,
        "one-proof-one-claim",
        "Duplicate proof is explicit",
        "Duplicate proof reuse must be explicit, not silent.",
      ),
      status: "human_review",
      detail:
        "Duplicate-proof checks run when artifact hashes and normalized locators are submitted.",
    },
    {
      ...getProvenanceRule(
        rulesByKey,
        "freshness-window",
        "Artifact timestamps are reviewable",
        "Evidence timestamps must be fresh enough for the review context or flagged.",
      ),
      status: hasEvidenceLocator ? "human_review" : "needs_input",
      detail: hasEvidenceLocator
        ? "Review should confirm the locator date and whether the record is fresh enough."
        : "Attach dated receipts, logs, attestations, or prior-intent records for freshness review.",
    },
    {
      ...getProvenanceRule(
        rulesByKey,
        "agent-links",
        "Artifacts, decisions, and activities name agents",
        "Artifacts, reviewer decisions, traceability events, and activities must name provenance agents.",
      ),
      status: "human_review",
      detail:
        "Saved evidence should name the participant, reviewer, and any payment or evidence provider involved.",
    },
    {
      ...getProvenanceRule(
        rulesByKey,
        evidenceMentionsExternalEntity ? "external-entity-references" : "traceability-events",
        evidenceMentionsExternalEntity
          ? "External entities have stable identifiers"
          : "Traceability records link what, where, and why",
        evidenceMentionsExternalEntity
          ? "External charities, providers, and supplier-like entities need stable identifier references."
          : "External payment or charity-routing events must link what happened, where, and why.",
      ),
      status: "human_review",
      detail: evidenceMentionsExternalEntity
        ? "External charities, payment providers, or public registries need dedupe-ready identifiers."
        : "Any later payment, donation, or completion event must name what, where, why, and agents.",
    },
  ];
}

export function OfferCreateForm({
  formMessage,
  supabaseReady,
  availablePools,
  initialMode = "pledge",
  initialOffsetParticipationMode = defaultOffsetFields.participationMode,
  initialOffsetPoolId = "",
  initialOffsetPoolSide = "",
  initialTemplate = null,
  paymentBondsEnabled,
  pledgePerformanceBondsEnabled,
  liveBondPaymentsEnabled,
  performanceBondMinCents,
  performanceBondMaxCents,
  provenanceValidationRules,
}: OfferCreateFormProps) {
  const [mode, setMode] = useState<OfferMode>(initialTemplate?.mode ?? initialMode);
  const [offeredCause, setOfferedCause] = useState(initialTemplate?.offeredCause ?? "Animal welfare");
  const [requestedCause, setRequestedCause] = useState(initialTemplate?.requestedCause ?? "Global poverty");
  const [compromiseCause, setCompromiseCause] = useState(initialTemplate?.compromiseCause ?? "Not needed");
  const [baselineAmountUsd, setBaselineAmountUsd] = useState(
    initialTemplate?.offset?.baselineAmountUsd ?? String(defaultOffsetFields.baselineAmountUsd ?? 1000),
  );
  const [baselineOpposedCause, setBaselineOpposedCause] = useState(
    initialTemplate?.offset?.baselineOpposedCause ?? defaultOffsetFields.baselineOpposedCause,
  );
  const [requestedMatchingAmountUsd, setRequestedMatchingAmountUsd] = useState(
    initialTemplate?.offset?.requestedMatchingAmountUsd ??
      String(defaultOffsetFields.requestedMatchingAmountUsd ?? 1000),
  );
  const [requestedOpposedCause, setRequestedOpposedCause] = useState(
    initialTemplate?.offset?.requestedOpposedCause ?? defaultOffsetFields.requestedOpposedCause,
  );
  const [offerAction, setOfferAction] = useState(initialTemplate?.offerAction ?? "");
  const [requestAction, setRequestAction] = useState(initialTemplate?.requestAction ?? "");
  const [baselineStatement, setBaselineStatement] = useState(initialTemplate?.baselineStatement ?? "");
  const [additionalityStatement, setAdditionalityStatement] = useState("");
  const [pledgeMaxObligationDays, setPledgeMaxObligationDays] = useState("30");
  const [pledgeReciprocalReleaseRule, setPledgeReciprocalReleaseRule] = useState(
    defaultPledgeReciprocalReleaseRule,
  );
  const [pledgeWithdrawalBeforeLockRule, setPledgeWithdrawalBeforeLockRule] = useState(
    defaultPledgeWithdrawalBeforeLockRule,
  );
  const [pledgeChallengeWindowDays, setPledgeChallengeWindowDays] = useState("14");
  const [pledgeNeutralReviewRequired, setPledgeNeutralReviewRequired] = useState(true);
  const [pledgeEvidencePlan, setPledgeEvidencePlan] = useState(defaultPledgeEvidencePlan);
  const [pledgeLeastIntrusiveAlternative, setPledgeLeastIntrusiveAlternative] = useState(
    defaultPledgeLeastIntrusiveAlternative,
  );
  const [pledgeBaselinePredatesOffer, setPledgeBaselinePredatesOffer] = useState(true);
  const [pledgeBaselineConfidence, setPledgeBaselineConfidence] =
    useState<PledgeSwapBaselineConfidence>("medium");
  const [pledgeCompensatedMoralAction, setPledgeCompensatedMoralAction] = useState(false);
  const [pledgeCompensationSummary, setPledgeCompensationSummary] = useState("");
  const [pledgeOrdinaryServiceClassification, setPledgeOrdinaryServiceClassification] =
    useState<PledgeSwapOrdinaryServiceClassification>("not_ordinary_service_market");
  const [pledgeNegativeCommitmentScope, setPledgeNegativeCommitmentScope] = useState("");
  const [pledgeActionReversibility, setPledgeActionReversibility] =
    useState<PledgeSwapActionReversibility>("continuing_but_suspendable");
  const [pledgeThirdPartyObligation, setPledgeThirdPartyObligation] =
    useState<PledgeSwapThirdPartyObligation>("none_known");
  const [pledgeRepresentativeAuthority, setPledgeRepresentativeAuthority] =
    useState<PledgeSwapRepresentativeAuthority>("self_only");
  const [pledgeReportingIntegrity, setPledgeReportingIntegrity] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeCivilRights, setPledgeCivilRights] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeParticipantAutonomy, setPledgeParticipantAutonomy] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeConfidentialityPrivacy, setPledgeConfidentialityPrivacy] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeEvidenceAuthenticity, setPledgeEvidenceAuthenticity] =
    useState<PledgeSwapBinarySafetyAssertion>("possible_or_unknown");
  const [pledgeFinancialCrime, setPledgeFinancialCrime] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeNonTransferability, setPledgeNonTransferability] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeRegulatedGoodsHazardousActivity, setPledgeRegulatedGoodsHazardousActivity] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeCyberAbuseDigitalIntegrity, setPledgeCyberAbuseDigitalIntegrity] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [pledgeAntiCorruptionProcessIntegrity, setPledgeAntiCorruptionProcessIntegrity] =
    useState<PledgeSwapBinarySafetyAssertion>("clear");
  const [baselineBondEnabled, setBaselineBondEnabled] = useState(false);
  const [baselineBondAmountUsd, setBaselineBondAmountUsd] = useState("50");
  const [baselineBondForfeitDestinationId, setBaselineBondForfeitDestinationId] = useState(
    defaultOffsetFields.compromiseDestinationId,
  );
  const [offerExpiresAt, setOfferExpiresAt] = useState("");
  const [baselineBondEvidenceDueAt, setBaselineBondEvidenceDueAt] = useState("");
  const [baselineBondEvidenceStandard, setBaselineBondEvidenceStandard] = useState("");
  const firstPerformanceBondTemplate = PERFORMANCE_BOND_EVIDENCE_TEMPLATES[0];
  const [performanceBondEnabled, setPerformanceBondEnabled] = useState(false);
  const [performanceBondAmountUsd, setPerformanceBondAmountUsd] = useState(
    String(Math.max(performanceBondMinCents, 2_500) / 100),
  );
  const [performanceBondEvidenceDueAt, setPerformanceBondEvidenceDueAt] = useState("");
  const [performanceBondChallengeWindowDays, setPerformanceBondChallengeWindowDays] = useState("14");
  const [performanceBondTemplateKey, setPerformanceBondTemplateKey] = useState<string>(
    firstPerformanceBondTemplate.key,
  );
  const [performanceBondActionToProve, setPerformanceBondActionToProve] = useState<string>(
    firstPerformanceBondTemplate.schema.actionToProve,
  );
  const [performanceBondEvidenceTypes, setPerformanceBondEvidenceTypes] = useState<string>(
    firstPerformanceBondTemplate.schema.acceptedEvidenceTypes,
  );
  const [performanceBondMinimumDetail, setPerformanceBondMinimumDetail] = useState<string>(
    firstPerformanceBondTemplate.schema.minimumDetail,
  );
  const [performanceBondPrivateEvidenceAllowed, setPerformanceBondPrivateEvidenceAllowed] =
    useState<boolean>(firstPerformanceBondTemplate.schema.privateEvidenceAllowed);
  const [performanceBondVisibility, setPerformanceBondVisibility] = useState<string>(
    firstPerformanceBondTemplate.schema.visibility,
  );
  const [performanceBondReviewStandard, setPerformanceBondReviewStandard] = useState<string>(
    firstPerformanceBondTemplate.schema.reviewStandard,
  );
  const [performanceBondForfeitureDestination, setPerformanceBondForfeitureDestination] =
    useState("compromise_charity");
  const [performanceBondCounterpartyPercent, setPerformanceBondCounterpartyPercent] = useState("0");
  const [performanceBondNeutralPercent, setPerformanceBondNeutralPercent] = useState("50");
  const [performanceBondMpgfPercent, setPerformanceBondMpgfPercent] = useState("50");
  const [performanceBondCounterpartyConsent, setPerformanceBondCounterpartyConsent] = useState(false);
  const [performanceBondAdditionality, setPerformanceBondAdditionality] = useState("");
  const [performanceBondNoTradeBaseline, setPerformanceBondNoTradeBaseline] = useState("");

  function applyPerformanceBondTemplate(templateKey: string) {
    const template =
      PERFORMANCE_BOND_EVIDENCE_TEMPLATES.find((entry) => entry.key === templateKey) ??
      firstPerformanceBondTemplate;

    setPerformanceBondTemplateKey(template.key);
    setPerformanceBondActionToProve(template.schema.actionToProve);
    setPerformanceBondEvidenceTypes(template.schema.acceptedEvidenceTypes);
    setPerformanceBondMinimumDetail(template.schema.minimumDetail);
    setPerformanceBondPrivateEvidenceAllowed(template.schema.privateEvidenceAllowed);
    setPerformanceBondVisibility(template.schema.visibility);
    setPerformanceBondReviewStandard(template.schema.reviewStandard);
  }

  const [exitCondition, setExitCondition] = useState(initialTemplate?.exitCondition ?? "");
  const [notes, setNotes] = useState(initialTemplate?.notes ?? "");
  const [compromiseDestinationId, setCompromiseDestinationId] = useState(
    initialTemplate?.offset?.compromiseDestinationId ?? defaultOffsetFields.compromiseDestinationId,
  );
  const [offsetRatio, setOffsetRatio] = useState(
    initialTemplate?.offset?.offsetRatio ?? String(defaultOffsetFields.offsetRatio ?? 1),
  );
  const [timeHorizon, setTimeHorizon] = useState(
    initialTemplate?.offset?.timeHorizon ?? defaultOffsetFields.timeHorizon,
  );
  const [verificationMethod, setVerificationMethod] = useState(
    initialTemplate?.offset?.verificationMethod ?? defaultOffsetFields.verificationMethod,
  );
  const [unmatchedSurplusRule, setUnmatchedSurplusRule] = useState(
    initialTemplate?.offset?.unmatchedSurplusRule ?? defaultOffsetFields.unmatchedSurplusRule,
  );
  const [participationMode, setParticipationMode] = useState(
    initialTemplate?.offset?.participationMode ?? initialOffsetParticipationMode,
  );
  const [poolId, setPoolId] = useState(initialOffsetPoolId);
  const [poolName, setPoolName] = useState("");
  const [poolSide, setPoolSide] = useState<"side_a" | "side_b" | "">(initialOffsetPoolSide);
  const [assuranceMinimumUsd, setAssuranceMinimumUsd] = useState("");
  const [poolMaximumCapUsd, setPoolMaximumCapUsd] = useState(
    String(defaultOffsetFields.poolMaximumCapUsd ?? 10_000),
  );
  const [assuranceDeadline, setAssuranceDeadline] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [offsetDonationPlatform, setOffsetDonationPlatform] = useState("External charity payment page");
  const [offsetDonorOfRecordRole, setOffsetDonorOfRecordRole] =
    useState<DonationOffsetDonorOfRecordRole>("participant_direct_donor");
  const [offsetDonorOfRecordExplanation, setOffsetDonorOfRecordExplanation] = useState(
    defaultOffsetDonorOfRecordExplanation,
  );
  const [offsetTaxReceiptTreatment, setOffsetTaxReceiptTreatment] =
    useState<DonationOffsetTaxReceiptTreatment>("no_tax_benefit_claimed");
  const [offsetTaxReceiptExplanation, setOffsetTaxReceiptExplanation] = useState(
    defaultOffsetTaxReceiptExplanation,
  );
  const [offsetTaxBenefitClaimed, setOffsetTaxBenefitClaimed] = useState(false);
  const [offsetDonorAdvisedFundInvolved, setOffsetDonorAdvisedFundInvolved] = useState(false);
  const [offsetEmployerMatchInvolved, setOffsetEmployerMatchInvolved] = useState(false);
  const [offsetCommercialCoVentureInvolved, setOffsetCommercialCoVentureInvolved] = useState(false);
  const [offsetCharitableSolicitationTreatment, setOffsetCharitableSolicitationTreatment] =
    useState<DonationOffsetCharitableSolicitationTreatment>(
      "external_donation_only_no_platform_solicitation",
    );
  const [offsetJurisdictionReviewRequired, setOffsetJurisdictionReviewRequired] = useState(true);
  const [offsetNoTaxAdviceAcknowledged, setOffsetNoTaxAdviceAcknowledged] = useState(false);
  const [offsetOperationalNotImpactAcknowledged, setOffsetOperationalNotImpactAcknowledged] =
    useState(false);
  const [offsetReceiptDoubleClaimPrevented, setOffsetReceiptDoubleClaimPrevented] = useState(true);
  const [offsetReceiptReassignmentProhibited, setOffsetReceiptReassignmentProhibited] =
    useState(true);
  const [offsetLockTermsFrozenBeforeConfirmation, setOffsetLockTermsFrozenBeforeConfirmation] =
    useState(true);
  const [offsetDestinationVerificationStatus, setOffsetDestinationVerificationStatus] =
    useState<DonationOffsetDestinationVerificationStatus>("registered_destination_selected");
  const [offerImpact, setOfferImpact] = useState(initialTemplate?.offerImpact ?? "7");
  const [minCounterpartyImpact, setMinCounterpartyImpact] = useState(initialTemplate?.minCounterpartyImpact ?? "6");
  const [verificationPreference, setVerificationPreference] = useState(initialTemplate?.verification ?? "Annual receipts");
  const [reviewPeriod, setReviewPeriod] = useState(initialTemplate?.duration ?? "6 months");
  const [paymentIntervalUnit, setPaymentIntervalUnit] = useState<PaymentIntervalUnit>(initialTemplate?.paymentIntervalUnit ?? "none");
  const [paymentIntervalValue, setPaymentIntervalValue] = useState(initialTemplate?.paymentIntervalValue ?? "1");
  const [trustLevel, setTrustLevel] = useState(initialTemplate?.trustLevel ?? "3");
  const [antiThreatCertified, setAntiThreatCertified] = useState(false);
  const [verificationMetadataAcknowledged, setVerificationMetadataAcknowledged] = useState(false);
  const [copilotReview, setCopilotReview] = useState<CopilotReviewState>({ status: "idle" });

  const isOffset = mode === "offset";
  const isPledge = mode === "pledge";
  const isPayment = mode === "payment";
  const selectableCharities = getSelectableRegisteredCharities();
  const consensusCharities = getConsensusCharities();
  const selectedPool = useMemo(
    () => availablePools.find((pool) => pool.id === poolId) ?? null,
    [availablePools, poolId],
  );
  const joinedPool = participationMode === "pool" ? selectedPool : null;
  const isJoiningExistingPool = joinedPool !== null;
  const effectivePoolName = joinedPool?.name ?? poolName;
  const effectiveBaselineOpposedCause =
    joinedPool && poolSide
      ? poolSide === "side_a"
        ? joinedPool.sideALabel
        : joinedPool.sideBLabel
      : baselineOpposedCause;
  const effectiveRequestedOpposedCause =
    joinedPool && poolSide
      ? poolSide === "side_a"
        ? joinedPool.sideBLabel
        : joinedPool.sideALabel
      : requestedOpposedCause;
  const effectiveCompromiseDestinationId = joinedPool?.compromiseCharityId ?? compromiseDestinationId;
  const selectedCompromiseDestination = findRegisteredCharityById(effectiveCompromiseDestinationId);
  const effectiveOffsetRatio = joinedPool ? String(joinedPool.offsetRatio) : offsetRatio;
  const effectiveTimeHorizon = joinedPool?.timeHorizon ?? timeHorizon;
  const effectiveVerificationMethod = joinedPool?.verificationMethod ?? verificationMethod;
  const effectiveUnmatchedSurplusRule = joinedPool?.unmatchedSurplusRule ?? unmatchedSurplusRule;
  const effectiveAssuranceMinimumUsd = joinedPool
    ? joinedPool.assuranceMinimumCents > 0
      ? String(joinedPool.assuranceMinimumCents / 100)
      : ""
    : assuranceMinimumUsd;
  const effectivePoolMaximumCapUsd = joinedPool
    ? String(joinedPool.maximumCapCents / 100)
    : poolMaximumCapUsd;
  const effectiveAssuranceDeadline = joinedPool
    ? toDateInputValue(joinedPool.assuranceDeadlineAt)
    : assuranceDeadline;

  const normalizedOffsetFields = useMemo(
    () => ({
      baselineAmountUsd: Number(baselineAmountUsd),
      baselineOpposedCause: effectiveBaselineOpposedCause,
      requestedMatchingAmountUsd: Number(requestedMatchingAmountUsd),
      requestedOpposedCause: effectiveRequestedOpposedCause,
      compromiseDestinationId: effectiveCompromiseDestinationId,
      offsetRatio: Number(effectiveOffsetRatio),
      timeHorizon: effectiveTimeHorizon,
      verificationMethod: effectiveVerificationMethod,
      unmatchedSurplusRule: effectiveUnmatchedSurplusRule,
      participationMode,
      poolId,
      poolName: effectivePoolName,
      poolSide,
      assuranceMinimumUsd:
        effectiveAssuranceMinimumUsd === "" ? null : Number(effectiveAssuranceMinimumUsd),
      poolMaximumCapUsd:
        effectivePoolMaximumCapUsd === "" ? null : Number(effectivePoolMaximumCapUsd),
      assuranceDeadline: effectiveAssuranceDeadline,
      description: [offerAction, requestAction, baselineStatement, exitCondition, notes]
        .filter(Boolean)
        .join("\n"),
      evidenceUrl,
    }),
    [
      baselineAmountUsd,
      baselineStatement,
      evidenceUrl,
      effectiveAssuranceDeadline,
      effectiveAssuranceMinimumUsd,
      effectiveBaselineOpposedCause,
      effectiveCompromiseDestinationId,
      effectiveOffsetRatio,
      effectivePoolName,
      effectivePoolMaximumCapUsd,
      effectiveRequestedOpposedCause,
      effectiveTimeHorizon,
      effectiveUnmatchedSurplusRule,
      effectiveVerificationMethod,
      notes,
      offerAction,
      participationMode,
      poolId,
      poolSide,
      requestAction,
      requestedMatchingAmountUsd,
      exitCondition,
    ],
  );
  const donationOffsetDonorOfRecordInput = useMemo<DonationOffsetDonorOfRecordInput>(
    () => ({
      destinationLabel: selectedCompromiseDestination?.name ?? "Selected compromise destination",
      donationPlatform: offsetDonationPlatform,
      donorOfRecordRole: offsetDonorOfRecordRole,
      donorOfRecordExplanation: offsetDonorOfRecordExplanation,
      taxReceiptTreatment: offsetTaxReceiptTreatment,
      taxReceiptExplanation: offsetTaxReceiptExplanation,
      taxBenefitClaimed: offsetTaxBenefitClaimed,
      donorAdvisedFundInvolved: offsetDonorAdvisedFundInvolved,
      employerMatchInvolved: offsetEmployerMatchInvolved,
      commercialCoVentureInvolved: offsetCommercialCoVentureInvolved,
      charitableSolicitationTreatment: offsetCharitableSolicitationTreatment,
      jurisdictionReviewRequired: offsetJurisdictionReviewRequired,
      participantAcknowledgedNoTaxAdvice: offsetNoTaxAdviceAcknowledged,
      participantAcknowledgedOperationalNotImpact: offsetOperationalNotImpactAcknowledged,
      receiptDoubleClaimPrevented: offsetReceiptDoubleClaimPrevented,
      receiptReassignmentProhibited: offsetReceiptReassignmentProhibited,
      lockTermsFrozenBeforeConfirmation: offsetLockTermsFrozenBeforeConfirmation,
      destinationVerificationStatus: offsetDestinationVerificationStatus,
    }),
    [
      offsetCharitableSolicitationTreatment,
      offsetCommercialCoVentureInvolved,
      offsetDestinationVerificationStatus,
      offsetDonationPlatform,
      offsetDonorAdvisedFundInvolved,
      offsetDonorOfRecordExplanation,
      offsetDonorOfRecordRole,
      offsetEmployerMatchInvolved,
      offsetJurisdictionReviewRequired,
      offsetLockTermsFrozenBeforeConfirmation,
      offsetNoTaxAdviceAcknowledged,
      offsetOperationalNotImpactAcknowledged,
      offsetReceiptDoubleClaimPrevented,
      offsetReceiptReassignmentProhibited,
      offsetTaxBenefitClaimed,
      offsetTaxReceiptExplanation,
      offsetTaxReceiptTreatment,
      selectedCompromiseDestination?.name,
    ],
  );
  const donationOffsetDonorOfRecordPreview = useMemo(
    () => buildDonationOffsetDonorOfRecordPreview(donationOffsetDonorOfRecordInput),
    [donationOffsetDonorOfRecordInput],
  );
  const donationOffsetDonorOfRecordErrors = useMemo(
    () =>
      isOffset
        ? validateDonationOffsetDonorOfRecordInput(donationOffsetDonorOfRecordInput)
        : [],
    [donationOffsetDonorOfRecordInput, isOffset],
  );
  const baselineAmountCents = Math.round((Number(baselineAmountUsd) || 0) * 100);
  const baselineBondCapCents = calculatePilotBaselineBondCapCents(baselineAmountCents);
  const baselineBondValidation = useMemo(
    () => {
      if (!isOffset) {
        return {
          errors: [],
          pauseReasons: [],
          rejectReasons: [],
          safetyAction: "clear" as const,
        };
      }

      return validateBaselineBondInput({
        amountCents: Math.round((Number(baselineBondAmountUsd) || 0) * 100),
        baselineAmountCents: Math.round((Number(baselineAmountUsd) || 0) * 100),
        baselineStatement,
        currency: BASELINE_BOND_DEFAULT_CURRENCY,
        enabled: baselineBondEnabled,
        evidenceDueAt: toIsoDateOrNull(baselineBondEvidenceDueAt),
        evidenceStandard: baselineBondEvidenceStandard,
        forfeitDestination: findRegisteredCharityById(baselineBondForfeitDestinationId),
        forfeitDestinationId: baselineBondForfeitDestinationId,
        notes,
        offerExpiresAt: toIsoDateOrNull(offerExpiresAt),
        offeredAction: offerAction,
        requestedAction: requestAction,
      });
    },
    [
      baselineAmountUsd,
      baselineBondAmountUsd,
      baselineBondEnabled,
      baselineBondEvidenceDueAt,
      baselineBondEvidenceStandard,
      baselineBondForfeitDestinationId,
      baselineStatement,
      isOffset,
      notes,
      offerAction,
      offerExpiresAt,
      requestAction,
    ],
  );
  const performanceBondValidation = useMemo(
    () => {
      const evidenceSchema = normalizePerformanceBondEvidenceSchema({
        acceptedEvidenceTypes: performanceBondEvidenceTypes,
        actionToProve: performanceBondActionToProve,
        minimumDetail: performanceBondMinimumDetail,
        privateEvidenceAllowed: performanceBondPrivateEvidenceAllowed,
        reviewStandard: performanceBondReviewStandard,
        templateKey: performanceBondTemplateKey,
        visibility: performanceBondVisibility,
      });

      return validatePerformanceBondTerms(
        {
          additionalityStatement: performanceBondAdditionality || additionalityStatement,
          amountCents: Math.round((Number(performanceBondAmountUsd) || 0) * 100),
          challengeWindowDays: Number(performanceBondChallengeWindowDays),
          counterpartyPayoutConsent: performanceBondCounterpartyConsent,
          currency: PERFORMANCE_BOND_DEFAULT_CURRENCY,
          enabled: isPledge && pledgePerformanceBondsEnabled && performanceBondEnabled,
          evidenceDueAt: toIsoDateOrNull(performanceBondEvidenceDueAt),
          evidenceSchema,
          forfeitureDestination:
            performanceBondForfeitureDestination === "mpgf" ||
            performanceBondForfeitureDestination === "counterparty" ||
            performanceBondForfeitureDestination === "split"
              ? performanceBondForfeitureDestination
              : "compromise_charity",
          noTradeBaseline: performanceBondNoTradeBaseline || baselineStatement,
          splitConfig: parsePerformanceBondSplitConfig({
            counterpartyPercent: performanceBondCounterpartyPercent,
            mpgfPercent: performanceBondMpgfPercent,
            neutralCausePercent: performanceBondNeutralPercent,
          }),
        },
        {
          enabled: pledgePerformanceBondsEnabled,
          livePaymentsEnabled: liveBondPaymentsEnabled,
          maxAmountCents: performanceBondMaxCents,
          minAmountCents: performanceBondMinCents,
          stalePaymentPendingDays: 14,
        },
      );
    },
    [
      additionalityStatement,
      baselineStatement,
      isPledge,
      liveBondPaymentsEnabled,
      performanceBondActionToProve,
      performanceBondAdditionality,
      performanceBondAmountUsd,
      performanceBondChallengeWindowDays,
      performanceBondCounterpartyConsent,
      performanceBondCounterpartyPercent,
      performanceBondEnabled,
      performanceBondEvidenceDueAt,
      performanceBondEvidenceTypes,
      performanceBondForfeitureDestination,
      performanceBondMaxCents,
      performanceBondMinCents,
      performanceBondMinimumDetail,
      performanceBondMpgfPercent,
      performanceBondNeutralPercent,
      performanceBondNoTradeBaseline,
      performanceBondPrivateEvidenceAllowed,
      performanceBondReviewStandard,
      performanceBondTemplateKey,
      performanceBondVisibility,
      pledgePerformanceBondsEnabled,
    ],
  );
  const pledgeSwapManualReviewInput = useMemo<PledgeSwapManualReviewInput>(() => {
    const parsedPledgeMaxObligationDays = Number(pledgeMaxObligationDays);
    const parsedPledgeChallengeWindowDays = Number(pledgeChallengeWindowDays);

    return {
      offeredAction: offerAction,
      requestedAction: requestAction,
      noTradeBaseline: baselineStatement,
      additionalityStatement,
      maxObligationDays:
        Number.isInteger(parsedPledgeMaxObligationDays) && parsedPledgeMaxObligationDays > 0
          ? parsedPledgeMaxObligationDays
          : null,
      reciprocalReleaseRule: pledgeReciprocalReleaseRule,
      withdrawalBeforeLockRule: pledgeWithdrawalBeforeLockRule,
      challengeWindowDays:
        Number.isInteger(parsedPledgeChallengeWindowDays) && parsedPledgeChallengeWindowDays > 0
          ? parsedPledgeChallengeWindowDays
          : null,
      neutralReviewRequired: pledgeNeutralReviewRequired,
      evidencePlan: pledgeEvidencePlan,
      leastIntrusiveAlternative: pledgeLeastIntrusiveAlternative,
      baselinePredatesOffer: pledgeBaselinePredatesOffer,
      baselineConfidence: pledgeBaselineConfidence,
      compensatedMoralAction: pledgeCompensatedMoralAction,
      compensationSummary: pledgeCompensationSummary,
      ordinaryServiceClassification: pledgeOrdinaryServiceClassification,
      negativeCommitmentScope: pledgeNegativeCommitmentScope,
      actionReversibility: pledgeActionReversibility,
      thirdPartyObligation: pledgeThirdPartyObligation,
      representativeAuthority: pledgeRepresentativeAuthority,
      reportingIntegrity: pledgeReportingIntegrity,
      civilRights: pledgeCivilRights,
      participantAutonomy: pledgeParticipantAutonomy,
      confidentialityPrivacy: pledgeConfidentialityPrivacy,
      evidenceAuthenticity: pledgeEvidenceAuthenticity,
      financialCrime: pledgeFinancialCrime,
      nonTransferability: pledgeNonTransferability,
      regulatedGoodsHazardousActivity: pledgeRegulatedGoodsHazardousActivity,
      cyberAbuseDigitalIntegrity: pledgeCyberAbuseDigitalIntegrity,
      antiCorruptionProcessIntegrity: pledgeAntiCorruptionProcessIntegrity,
      performanceBondPreviewEnabled: isPledge && pledgePerformanceBondsEnabled && performanceBondEnabled,
    };
  }, [
    additionalityStatement,
    baselineStatement,
    isPledge,
    offerAction,
    performanceBondEnabled,
    pledgeActionReversibility,
    pledgeAntiCorruptionProcessIntegrity,
    pledgeBaselineConfidence,
    pledgeBaselinePredatesOffer,
    pledgeChallengeWindowDays,
    pledgeCivilRights,
    pledgeCompensatedMoralAction,
    pledgeCompensationSummary,
    pledgeConfidentialityPrivacy,
    pledgeCyberAbuseDigitalIntegrity,
    pledgeEvidenceAuthenticity,
    pledgeEvidencePlan,
    pledgeFinancialCrime,
    pledgeLeastIntrusiveAlternative,
    pledgeMaxObligationDays,
    pledgeNegativeCommitmentScope,
    pledgeNeutralReviewRequired,
    pledgeNonTransferability,
    pledgeOrdinaryServiceClassification,
    pledgeParticipantAutonomy,
    pledgePerformanceBondsEnabled,
    pledgeReciprocalReleaseRule,
    pledgeRegulatedGoodsHazardousActivity,
    pledgeReportingIntegrity,
    pledgeRepresentativeAuthority,
    pledgeThirdPartyObligation,
    pledgeWithdrawalBeforeLockRule,
    requestAction,
  ]);
  const pledgeSwapManualReviewPreview = useMemo(
    () => buildPledgeSwapManualReviewPreview(pledgeSwapManualReviewInput),
    [pledgeSwapManualReviewInput],
  );
  const pledgeSwapManualReviewErrors = useMemo(
    () =>
      isPledge
        ? validatePledgeSwapManualReviewInput(pledgeSwapManualReviewInput)
        : [],
    [isPledge, pledgeSwapManualReviewInput],
  );

  const liveOffsetErrors = useMemo(
    () =>
      isOffset
        ? [
            ...validateDonationOffsetFields(normalizedOffsetFields),
            ...validateDonationOffsetSubmissionGuards({
              participationMode,
              antiThreatCertification: antiThreatCertified,
              verificationMetadataAcknowledged,
              evidenceUrl,
            }),
            ...baselineBondValidation.errors,
            ...donationOffsetDonorOfRecordErrors,
          ]
        : [],
    [
      antiThreatCertified,
      baselineBondValidation.errors,
      donationOffsetDonorOfRecordErrors,
      evidenceUrl,
      isOffset,
      normalizedOffsetFields,
      participationMode,
      verificationMetadataAcknowledged,
    ],
  );

  const offsetPreview = useMemo(
    () =>
      calculateDonationOffsetPreview({
        baselineAmountUsd: Number(baselineAmountUsd),
        requestedMatchingAmountUsd: Number(requestedMatchingAmountUsd),
        offsetRatio: Number(effectiveOffsetRatio),
        unmatchedSurplusRule: effectiveUnmatchedSurplusRule,
      }),
    [
      baselineAmountUsd,
      effectiveOffsetRatio,
      effectiveUnmatchedSurplusRule,
      requestedMatchingAmountUsd,
    ],
  );

  const complexityWarnings = useMemo(
    () => (isOffset ? getDonationOffsetComplexityWarnings(normalizedOffsetFields) : []),
    [isOffset, normalizedOffsetFields],
  );
  const liveCoreOfferErrors = useMemo(() => {
    const errors: string[] = [];

    if (!offerAction.trim()) {
      errors.push("Describe the action you are offering.");
    }

    if (!requestAction.trim()) {
      errors.push("Describe what you want the counterparty to do.");
    }

    if (!baselineStatement.trim()) {
      errors.push("State the no-trade baseline or default you are comparing against.");
    }

    if (isPledge && !additionalityStatement.trim()) {
      errors.push("Explain why this personal pledge swap is additional to the no-trade baseline.");
    }

    if (!exitCondition.trim()) {
      errors.push("State the exit, pause, expiry, or unresolved-evidence condition.");
    }

    if (!notes.trim()) {
      errors.push("Add a public description covering evidence, boundaries, and why the trade is mutually beneficial.");
    }

    if (isPayment) {
      errors.push("General paid action offers are deferred and cannot be published from the public offer wizard.");
    }

    return errors;
  }, [additionalityStatement, baselineStatement, exitCondition, isPayment, isPledge, notes, offerAction, requestAction]);
  const liveOfferErrors = useMemo(
    () => [
      ...liveCoreOfferErrors,
      ...liveOffsetErrors,
      ...performanceBondValidation.errors,
      ...pledgeSwapManualReviewErrors,
    ],
    [liveCoreOfferErrors, liveOffsetErrors, performanceBondValidation.errors, pledgeSwapManualReviewErrors],
  );
  const reviewVerificationMethod = isOffset
    ? formatDonationOffsetVerificationMethod(effectiveVerificationMethod)
    : verificationPreference;
  const protocolReview = useMemo(
    () =>
      evaluateMoralTradeProtocolDraft({
        format: mode,
        offeredCause,
        requestedCause,
        offeredAction: offerAction,
        requestedAction: requestAction,
        baselineStatement,
        duration: reviewPeriod,
        exitConditions: exitCondition,
        verificationMethod: reviewVerificationMethod,
        publicDescription: notes,
        evidenceUrl,
        participantImportance: Number(offerImpact),
        counterpartyThreshold: Number(minCounterpartyImpact),
      }),
    [
      baselineStatement,
      evidenceUrl,
      exitCondition,
      minCounterpartyImpact,
      mode,
      notes,
      offerAction,
      offerImpact,
      offeredCause,
      requestedCause,
      requestAction,
      reviewPeriod,
      reviewVerificationMethod,
    ],
  );
  const reviewWorkflowCards = useMemo(
    () =>
      getOfferReviewWorkflowCards({
        mode,
        verification: reviewVerificationMethod,
        trustLevel: Number(trustLevel),
        baselineAmountUsd: isOffset ? Number(baselineAmountUsd) : null,
        baselineOpposedCause: isOffset ? effectiveBaselineOpposedCause : null,
        requestedMatchingAmountUsd: isOffset ? Number(requestedMatchingAmountUsd) : null,
        requestedOpposedCause: isOffset ? effectiveRequestedOpposedCause : null,
        evidenceUrl,
        moderationStatus: protocolReview.policyConflicts.length ? "blocked" : "clear",
        offeredCause,
        requestedCause,
        currentStatus:
          protocolReview.status === "matchable"
            ? "Manual review required before reliance"
            : formatProtocolReviewStatus(protocolReview.status),
        offerImpact: Number(offerImpact),
        minCounterpartyImpact: Number(minCounterpartyImpact),
      }),
    [
      baselineAmountUsd,
      effectiveBaselineOpposedCause,
      effectiveRequestedOpposedCause,
      evidenceUrl,
      isOffset,
      minCounterpartyImpact,
      mode,
      offerImpact,
      offeredCause,
      protocolReview.policyConflicts.length,
      protocolReview.status,
      requestedCause,
      requestedMatchingAmountUsd,
      reviewVerificationMethod,
      trustLevel,
    ],
  );
  const evidenceProvenancePreflight = useMemo(
    () => buildEvidenceProvenancePreflight(protocolReview, provenanceValidationRules),
    [protocolReview, provenanceValidationRules],
  );
  const canPublishOffer = supabaseReady && liveOfferErrors.length === 0;
  const wizardSteps: OfferWizardStep[] = useMemo(
    () => [
      {
        id: "route",
        title: "Choose a launch route",
        detail: isPayment
          ? "Paid action offers are paused for operator-reviewed pilots."
          : `${formatOfferModeLabel(mode)} is inside the current launch wedge.`,
        href: "#offer-route",
        complete: !isPayment,
      },
      {
        id: "terms",
        title: "State reciprocal terms",
        detail: "Name what you will do and what the counterparty should do.",
        href: "#offer-terms",
        complete: Boolean(offerAction.trim() && requestAction.trim()),
      },
      {
        id: "baseline",
        title: "Explain baseline and exit",
        detail: "Make the no-trade default, expiry, and unresolved-evidence path reviewable.",
        href: "#offer-boundaries",
        complete: Boolean(
          baselineStatement.trim() &&
            exitCondition.trim() &&
            (!isPledge || additionalityStatement.trim()),
        ),
      },
      {
        id: "evidence",
        title: "Set evidence rules",
        detail: isOffset
          ? "Offset fields, evidence method, surplus rule, and pool safeguards must pass checks."
          : isPledge
            ? "Manual-review terms, schedule, and least-intrusive evidence plan must be complete."
            : `${verificationPreference} over ${reviewPeriod}.`,
        href: "#offer-evidence",
        complete: isOffset
          ? liveOffsetErrors.length === 0
          : isPledge
            ? pledgeSwapManualReviewErrors.length === 0
            : Boolean(verificationPreference && reviewPeriod),
      },
      {
        id: "publish",
        title: "Ready for review",
        detail: "A public description and all required safeguards are complete.",
        href: "#offer-publish",
        complete: canPublishOffer,
      },
    ],
    [
      baselineStatement,
      additionalityStatement,
      canPublishOffer,
      exitCondition,
      isOffset,
      isPayment,
      isPledge,
      liveOffsetErrors.length,
      mode,
      offerAction,
      pledgeSwapManualReviewErrors.length,
      requestAction,
      reviewPeriod,
      verificationPreference,
    ],
  );
  const completedWizardSteps = wizardSteps.filter((step) => step.complete).length;
  const wizardProgressPercent = Math.round((completedWizardSteps / wizardSteps.length) * 100);

  const joinedPoolProgress = useMemo(() => {
    if (!selectedPool || participationMode !== "pool" || !poolSide) {
      return null;
    }

    const baselineCents = Math.round((Number(baselineAmountUsd) || 0) * 100);
    const nextSideATotal =
      selectedPool.sideATotalCents + (poolSide === "side_a" ? baselineCents : 0);
    const nextSideBTotal =
      selectedPool.sideBTotalCents + (poolSide === "side_b" ? baselineCents : 0);

    return calculateDonationOffsetPoolProgress({
      sideATotalUsd: nextSideATotal / 100,
      sideBTotalUsd: nextSideBTotal / 100,
      offsetRatio: Number(effectiveOffsetRatio),
      assuranceMinimumUsd:
        effectiveAssuranceMinimumUsd === "" ? 0 : Number(effectiveAssuranceMinimumUsd),
      deadlineAt: effectiveAssuranceDeadline || selectedPool.assuranceDeadlineAt || undefined,
    });
  }, [
    baselineAmountUsd,
    effectiveAssuranceDeadline,
    effectiveAssuranceMinimumUsd,
    effectiveOffsetRatio,
    participationMode,
    poolSide,
    selectedPool,
  ]);

  function applyOfferTemplate(template: OfferTemplate) {
    setMode(template.mode);
    setOfferedCause(template.offeredCause);
    setRequestedCause(template.requestedCause);
    setCompromiseCause(template.compromiseCause);
    setOfferAction(template.offerAction);
    setRequestAction(template.requestAction);
    setBaselineStatement(template.baselineStatement);
    setExitCondition(template.exitCondition);
    setNotes(template.notes);
    setOfferImpact(template.offerImpact);
    setMinCounterpartyImpact(template.minCounterpartyImpact);
    setVerificationPreference(template.verification);
    setReviewPeriod(template.duration);
    setPaymentIntervalUnit(template.paymentIntervalUnit);
    setPaymentIntervalValue(template.paymentIntervalValue);
    setTrustLevel(template.trustLevel);

    if (template.mode === "pledge") {
      setPledgeMaxObligationDays(template.duration === "30 days" ? "30" : "90");
      setPledgeChallengeWindowDays("14");
      setPledgeReciprocalReleaseRule(defaultPledgeReciprocalReleaseRule);
      setPledgeWithdrawalBeforeLockRule(defaultPledgeWithdrawalBeforeLockRule);
      setPledgeNeutralReviewRequired(true);
      setPledgeEvidencePlan(defaultPledgeEvidencePlan);
      setPledgeLeastIntrusiveAlternative(defaultPledgeLeastIntrusiveAlternative);
      setPledgeBaselinePredatesOffer(true);
      setPledgeBaselineConfidence("medium");
      setPledgeCompensatedMoralAction(false);
      setPledgeCompensationSummary("");
      setPledgeOrdinaryServiceClassification("not_ordinary_service_market");
      setPledgeNegativeCommitmentScope("");
      setPledgeActionReversibility("continuing_but_suspendable");
      setPledgeThirdPartyObligation("none_known");
      setPledgeRepresentativeAuthority("self_only");
      setPledgeReportingIntegrity("clear");
      setPledgeCivilRights("clear");
      setPledgeParticipantAutonomy("clear");
      setPledgeConfidentialityPrivacy("clear");
      setPledgeEvidenceAuthenticity("possible_or_unknown");
      setPledgeFinancialCrime("clear");
      setPledgeNonTransferability("clear");
      setPledgeRegulatedGoodsHazardousActivity("clear");
      setPledgeCyberAbuseDigitalIntegrity("clear");
      setPledgeAntiCorruptionProcessIntegrity("clear");
    }

    if (template.offset) {
      setBaselineAmountUsd(template.offset.baselineAmountUsd);
      setRequestedMatchingAmountUsd(template.offset.requestedMatchingAmountUsd);
      setBaselineOpposedCause(template.offset.baselineOpposedCause);
      setRequestedOpposedCause(template.offset.requestedOpposedCause);
      setParticipationMode(template.offset.participationMode);
      setCompromiseDestinationId(
        template.offset.compromiseDestinationId ?? defaultOffsetFields.compromiseDestinationId,
      );
      setOffsetRatio(template.offset.offsetRatio);
      setTimeHorizon(template.offset.timeHorizon ?? defaultOffsetFields.timeHorizon);
      setVerificationMethod(
        template.offset.verificationMethod ?? defaultOffsetFields.verificationMethod,
      );
      setUnmatchedSurplusRule(
        template.offset.unmatchedSurplusRule ?? defaultOffsetFields.unmatchedSurplusRule,
      );
      setPoolId("");
      setPoolSide("");
      setBaselineBondEnabled(false);
      setOfferExpiresAt("");
      setBaselineBondEvidenceDueAt("");
      setBaselineBondEvidenceStandard("");
      setOffsetDonationPlatform("External charity payment page");
      setOffsetDonorOfRecordRole("participant_direct_donor");
      setOffsetDonorOfRecordExplanation(defaultOffsetDonorOfRecordExplanation);
      setOffsetTaxReceiptTreatment("no_tax_benefit_claimed");
      setOffsetTaxReceiptExplanation(defaultOffsetTaxReceiptExplanation);
      setOffsetTaxBenefitClaimed(false);
      setOffsetDonorAdvisedFundInvolved(false);
      setOffsetEmployerMatchInvolved(false);
      setOffsetCommercialCoVentureInvolved(false);
      setOffsetCharitableSolicitationTreatment("external_donation_only_no_platform_solicitation");
      setOffsetJurisdictionReviewRequired(true);
      setOffsetNoTaxAdviceAcknowledged(false);
      setOffsetOperationalNotImpactAcknowledged(false);
      setOffsetReceiptDoubleClaimPrevented(true);
      setOffsetReceiptReassignmentProhibited(true);
      setOffsetLockTermsFrozenBeforeConfirmation(true);
      setOffsetDestinationVerificationStatus("registered_destination_selected");
    }
  }

  async function runSchemaBoundCopilotReview() {
    setCopilotReview({ status: "loading" });

    const evidenceLocator = evidenceUrl.trim();
    const evidenceMetadata = evidenceLocator
      ? [
          {
            id: "draft-evidence-locator",
            claim: "Participant supplied a draft evidence locator for reviewer inspection.",
            evidenceType: "evidence_locator",
            citation: evidenceLocator.startsWith("http")
              ? evidenceLocator
              : "evidence:draft-evidence-locator",
            status: "submitted",
            scope: "factual_action",
            redactionLevel: "public",
            submittedAt: new Date().toISOString(),
          },
        ]
      : [];

    try {
      const response = await fetch("/api/moral-trade/copilot/review", {
        body: JSON.stringify({
          structured_draft: {
            format: mode,
            offeredCause,
            requestedCause,
            offeredAction: offerAction,
            requestedAction: requestAction,
            baselineStatement,
            duration: reviewPeriod,
            exitConditions: exitCondition,
            verificationMethod: reviewVerificationMethod,
            publicDescription: notes,
            evidenceUrl,
            participantImportance: Number(offerImpact),
            counterpartyThreshold: Number(minCounterpartyImpact),
          },
          citations: ["proposal:draft"],
          evidence_metadata: evidenceMetadata,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as CopilotReviewResponse | null;

      if (!payload) {
        setCopilotReview({
          message: "The copilot review returned an unreadable response. Use the deterministic preview instead.",
          status: "error",
        });
        return;
      }

      setCopilotReview({ response: payload, status: "ready" });
    } catch {
      setCopilotReview({
        message: "The copilot review could not be reached. The deterministic preview still applies.",
        status: "error",
      });
    }
  }

  return (
    <article className="panel auth-card">
      <div className="section-head auth-head">
        <p className="eyebrow">Offer details</p>
        <h2>Create offer</h2>
        <p>
          State the two sides, the expected gain, and the verification terms in one
          public record.
        </p>
      </div>

      {!supabaseReady ? (
        <div className="status-banner status-banner-error">
          Supabase is not configured yet. Add environment variables before creating
          live offers.
        </div>
      ) : null}

      {formMessage ? (
        <div
          className={`status-banner ${
            formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
          }`}
        >
          {formMessage.text}
        </div>
      ) : null}

      {isOffset ? (
        <div className="status-banner status-banner-error">
          Extortion is not allowed. Only publish an offset if the baseline donation is a real
          intention you can support with past-donation proof, a third-party payment record, or a
          third-party audit.
        </div>
      ) : null}

      {liveOfferErrors.length ? (
        <div className="status-banner status-banner-error" aria-live="polite">
          <strong>Fix these fields before publishing.</strong>
          <ul className="clean-list">
            {liveOfferErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {canPublishOffer ? (
        <div className="status-banner status-banner-success" aria-live="polite">
          Ready to publish. Server-side checks will still verify authentication, moderation, and
          evidence rules before the offer is saved.
        </div>
      ) : null}

      {isOffset && complexityWarnings.length ? (
        <div className="status-banner status-banner-warning">
          <strong>Complexity warning.</strong>
          <ul className="clean-list">
            {complexityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isOffset && baselineBondValidation.pauseReasons.length ? (
        <div className="status-banner status-banner-warning">
          <strong>Baseline credibility bond needs review.</strong>
          <ul className="clean-list">
            {baselineBondValidation.pauseReasons.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="offer-wizard-panel" aria-labelledby="offer-wizard-heading">
        <div className="offer-wizard-summary">
          <div>
            <p className="eyebrow">Guided offer wizard</p>
            <h3 id="offer-wizard-heading">Turn intent into a reviewable record</h3>
            <p>
              The report recommends short, bounded trades with explicit baselines, evidence, and
              completion states. Use this progress rail to keep the proposal inside that shape.
            </p>
          </div>
          <div className="offer-wizard-meter" aria-label={`${completedWizardSteps} of ${wizardSteps.length} steps complete`}>
            <span>{completedWizardSteps}/{wizardSteps.length} complete</span>
            <div className="offset-progress-track" aria-hidden="true">
              <span
                className="offset-progress-fill"
                style={{ width: `${wizardProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <ol className="offer-wizard-steps">
          {wizardSteps.map((step) => (
            <li className={step.complete ? "is-complete" : ""} key={step.id}>
              <a href={step.href}>
                <span aria-hidden="true">{step.complete ? "OK" : "--"}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel offer-template-panel" aria-labelledby="offer-template-heading">
        <div>
          <p className="eyebrow">Start from a template</p>
          <h3 id="offer-template-heading">Prefill a common moral-trade structure</h3>
          <p>
            Templates focus on the launch wedge: donation offsets, public-goods-style pools, and
            bounded pledge swaps. You still need to edit the terms so the offer is true,
            voluntary, and verifiable.
          </p>
        </div>
        <div className="offer-template-grid">
          {OFFER_TEMPLATES.map((template) => (
            <button
              className="offer-template-button"
              key={template.title}
              type="button"
              onClick={() => applyOfferTemplate(template)}
            >
              <strong>{template.title}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        className={`protocol-review-panel protocol-review-panel-${protocolReview.status}`}
        aria-labelledby="protocol-review-heading"
      >
        <div className="protocol-review-head">
          <div>
            <p className="eyebrow">Protocol review preview</p>
            <h3 id="protocol-review-heading">
              Status: {formatProtocolReviewStatus(protocolReview.status)}
            </h3>
            <p>{protocolReview.summary}</p>
          </div>
          <span className="protocol-review-status">
            {protocolReview.factorCodes.length} factor code
            {protocolReview.factorCodes.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="review-workflow-grid" aria-label="Draft review workflow cards">
          {reviewWorkflowCards.map((card) => (
            <article
              className={`panel review-workflow-card review-workflow-card-${card.status}`}
              key={card.key}
            >
              <div className="review-workflow-card-head">
                <p className="detail-kicker">{card.key.replaceAll("_", " ")}</p>
                <span className="review-workflow-status">{card.status.replaceAll("_", " ")}</span>
              </div>
              <h4>{card.label}</h4>
              <p className="route-text">{card.summary}</p>
              <div className="review-factor-list" aria-label={`${card.label} factor codes`}>
                {card.factorCodes.map((factorCode) => (
                  <span key={factorCode}>{factorCode}</span>
                ))}
              </div>
              <p className="review-next-step">
                <strong>Next step:</strong> {card.nextStep}
              </p>
            </article>
          ))}
        </div>

        <div>
          <strong>Fixed verification loop</strong>
          <ol className="protocol-verification-list">
            {protocolReview.verificationLoop.map((step) => (
              <li
                className={`protocol-verification-step protocol-verification-step-${step.status}`}
                key={step.key}
              >
                <span className="protocol-step-status">
                  {formatVerificationStepStatus(step.status)}
                </span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </li>
            ))}
          </ol>
        </div>

        <div className="protocol-review-grid">
          <div>
            <strong>Missing or thin fields</strong>
            {protocolReview.missingRequiredFields.length ||
            protocolReview.underspecifiedFields.length ? (
              <ul className="clean-list">
                {[...protocolReview.missingRequiredFields, ...protocolReview.underspecifiedFields].map(
                  (field) => (
                    <li key={field}>{field}</li>
                  ),
                )}
              </ul>
            ) : (
              <p>Core draft fields are present.</p>
            )}
          </div>
          <div>
            <strong>Trust axes</strong>
            <ul className="clean-list">
              <li>Factual trust: {protocolReview.trustAssessment.factualTrust.rating}</li>
              <li>
                Counterfactual baseline:{" "}
                {protocolReview.trustAssessment.counterfactualBaseline.rating}
              </li>
              <li>
                Externality review:{" "}
                {protocolReview.trustAssessment.externalityReview.required ? "required" : "not triggered"}
              </li>
              <li>
                Party-relative benefit:{" "}
                {protocolReview.trustAssessment.partyRelativeBenefit.rating}
              </li>
              <li>Privacy redaction: {protocolReview.trustAssessment.privacyRedaction.rating}</li>
            </ul>
          </div>
          <div>
            <strong>Factor codes</strong>
            <div className="protocol-factor-list">
              {protocolReview.factorCodes.map((factor) => (
                <span key={factor}>{factor}</span>
              ))}
            </div>
          </div>
        </div>

        {protocolReview.policyConflicts.length ? (
          <div className="protocol-conflict-note">
            <strong>Policy conflicts:</strong> {protocolReview.policyConflicts.join(", ")}
          </div>
        ) : null}

        <div className="protocol-review-grid">
          <div>
            <strong>Evidence to request</strong>
            {protocolReview.reviewInstructions.artifactsToRequest.length ? (
              <ul className="clean-list">
                {protocolReview.reviewInstructions.artifactsToRequest.map((artifact) => (
                  <li key={artifact}>{artifact}</li>
                ))}
              </ul>
            ) : (
              <p>No extra artifacts are requested by the deterministic preview.</p>
            )}
          </div>
          <div>
            <strong>Reviewer scope</strong>
            <ul className="clean-list">
              {protocolReview.reviewInstructions.reviewScope.map((scope) => (
                <li key={scope}>{scope}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Appeal triggers</strong>
            <ul className="clean-list">
              {protocolReview.reviewInstructions.appealTriggers.map((trigger) => (
                <li key={trigger}>{trigger}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="protocol-review-grid">
          <div>
            <strong>Cited evidence table</strong>
            <ul className="clean-list">
              {protocolReview.citedEvidenceTable.map((row) => (
                <li key={`${row.citation}:${row.claim}`}>
                  {row.status}: {row.claim} ({row.citation})
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="protocol-provenance-preflight">
          <div className="protocol-provenance-head">
            <div>
              <strong>Evidence object preflight</strong>
              <p>
                Uses the public provenance contract to show which evidence checks can only be
                completed after scoped artifacts, agents, and traceability records exist.
              </p>
            </div>
            <Link className="inline-link" href="/api/moral-trade/provenance/schema">
              View contract
            </Link>
          </div>
          <ol className="protocol-provenance-list">
            {evidenceProvenancePreflight.map((item) => (
              <li
                className={`protocol-provenance-item protocol-provenance-item-${item.status}`}
                key={item.key}
              >
                <span className="protocol-step-status">
                  {formatVerificationStepStatus(item.status)}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <small>{item.rule}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="protocol-review-grid">
          <div>
            <strong>Clarification questions</strong>
            {protocolReview.clarificationQuestions.length ? (
              <ul className="clean-list">
                {protocolReview.clarificationQuestions.map((item) => (
                  <li key={item.field}>
                    {item.field}: {item.question}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No clarification questions are needed before reviewer triage.</p>
            )}
          </div>
          <div>
            <strong>Next step checklist</strong>
            <ul className="clean-list">
              {protocolReview.nextStepChecklist.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Reviewer summary</strong>
            <p>{protocolReview.reviewerSummary}</p>
          </div>
        </div>

        <div className="schema-copilot-panel" aria-live="polite">
          <div className="schema-copilot-head">
            <div>
              <strong>Schema-bound copilot check</strong>
              <p>
                Runs the public copilot review contract against this draft. It returns structured
                critique only and reports <code>stateMutation false</code>.
              </p>
            </div>
            <button
              className="button button-secondary button-mini"
              disabled={copilotReview.status === "loading"}
              type="button"
              onClick={runSchemaBoundCopilotReview}
            >
              {copilotReview.status === "loading" ? "Checking..." : "Check draft"}
            </button>
          </div>

          {copilotReview.status === "idle" ? (
            <p className="panel-note">
              Use this after editing fields to compare the local preview with the API contract
              that reviewers and public validators inspect.
            </p>
          ) : null}

          {copilotReview.status === "error" ? (
            <p className="protocol-conflict-note">{copilotReview.message}</p>
          ) : null}

          {copilotReview.status === "ready" ? (
            <div className="schema-copilot-result">
              <div className="schema-copilot-status-row">
                <span className={copilotReview.response.ok ? "badge badge-success" : "badge badge-warning"}>
                  {copilotReview.response.ok ? "contract passed" : "contract blockers"}
                </span>
                <span>Mode {copilotReview.response.decisioningMode ?? "deterministic_draft_review_only"}</span>
                <span>stateMutation {String(copilotReview.response.stateMutation ?? false)}</span>
              </div>

              {copilotReview.response.output ? (
                <div className="protocol-review-grid">
                  <div>
                    <strong>Copilot status</strong>
                    <p>{copilotReview.response.output.status.replaceAll("_", " ")}</p>
                    <small>
                      Confidence band{" "}
                      {copilotReview.response.output.match_explanation.confidence_band}
                    </small>
                  </div>
                  <div>
                    <strong>Bounded questions</strong>
                    {copilotReview.response.output.clarification_questions.length ? (
                      <ul className="clean-list">
                        {copilotReview.response.output.clarification_questions.map((item) => (
                          <li key={`${item.field}:${item.question}`}>
                            {item.field}: {item.question}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No field-tied questions returned.</p>
                    )}
                  </div>
                  <div>
                    <strong>Reviewer summary</strong>
                    <p>{copilotReview.response.output.reviewer_summary}</p>
                  </div>
                </div>
              ) : null}

              {copilotReview.response.output ? (
                <div className="schema-copilot-detail-grid">
                  <div>
                    <strong>Copilot next steps</strong>
                    <ul className="clean-list">
                      {copilotReview.response.output.next_step_checklist.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Cited metadata</strong>
                    <ul className="clean-list">
                      {copilotReview.response.output.cited_evidence_table.map((row) => (
                        <li key={`${row.citation}:${row.claim}`}>
                          {row.status}: {row.claim} ({row.citation})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {copilotReview.response.blockers?.length ? (
                <div className="protocol-conflict-note">
                  <strong>Contract blockers:</strong> {copilotReview.response.blockers.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <form
        action={createOfferAction}
        className="stack-form"
        onSubmit={(event) => {
          if (liveOfferErrors.length || !supabaseReady) {
            event.preventDefault();
          }
        }}
      >
        <label className="field" id="offer-route">
          <span>Exchange mode</span>
          <select
            value={mode}
            name="mode"
            onChange={(event) => setMode(readFormControlValue(event) as OfferMode)}
          >
            {OFFER_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isPayment ? (
            <small>
              Paid action offers are intentionally deferred from the public creation path. Use
              pledge swaps, verified offsets, or the public-goods flow unless an operator invites a
              reviewed paid-action pilot.
            </small>
          ) : null}
        </label>

        <div className="panel subtle-panel">
          <p className="eyebrow">Validator checklist</p>
          <div className="tag-row">
            <span className="badge badge-secondary">No-trade baseline</span>
            <span className="badge badge-secondary">Evidence schema</span>
            <span className="badge badge-secondary">One proof, one claim</span>
            <span className="badge badge-secondary">Exit condition</span>
            <span className="badge badge-secondary">Challenge window</span>
            <span className="badge badge-secondary">Completion state</span>
          </div>
          <p className="panel-note">
            A public offer should be easy for a reviewer to evaluate without guessing what would
            have happened absent the trade.
          </p>
        </div>

        {isPledge && pledgePerformanceBondsEnabled ? (
          <details className="panel subtle-panel" open={performanceBondEnabled}>
            <summary className="panel-summary">Optional credibility stake</summary>
            <p className="route-text">{PERFORMANCE_BOND_COPY}</p>
            <p className="panel-note">
              {liveBondPaymentsEnabled
                ? "Live provider funding is required before this can become funded."
                : "Payment pending/manual review mode: terms can be drafted and reviewed, but the platform is not claiming money is currently held."}
            </p>
            <p className="panel-note">{PERFORMANCE_BOND_LIMITATION_COPY}</p>

            <label className="radio-row">
              <input
                checked={performanceBondEnabled}
                name="performance_bond_enabled"
                type="checkbox"
                onChange={(event) =>
                  setPerformanceBondEnabled((event.currentTarget as HTMLInputElement).checked)
                }
              />
              <span>Enable pledge performance bond</span>
            </label>

            {performanceBondEnabled ? (
              <div className="clean-stack">
                <div className="field-grid">
                  <label className="field">
                    <span>Bond amount</span>
                    <input
                      max={String(performanceBondMaxCents / 100)}
                      min={String(performanceBondMinCents / 100)}
                      name="performance_bond_amount_usd"
                      required={performanceBondEnabled}
                      step="0.01"
                      type="number"
                      value={performanceBondAmountUsd}
                      onChange={(event) => setPerformanceBondAmountUsd(readFormControlValue(event))}
                    />
                    <small>
                      Conservative v1 limit: {formatPerformanceBondAmount(performanceBondMinCents)} to{" "}
                      {formatPerformanceBondAmount(performanceBondMaxCents)}.
                    </small>
                  </label>

                  <label className="field">
                    <span>Currency</span>
                    <input
                      name="performance_bond_currency"
                      readOnly
                      type="text"
                      value={PERFORMANCE_BOND_DEFAULT_CURRENCY}
                    />
                  </label>

                  <label className="field">
                    <span>Evidence due date</span>
                    <input
                      name="performance_bond_evidence_due_at"
                      required={performanceBondEnabled}
                      type="date"
                      value={performanceBondEvidenceDueAt}
                      onChange={(event) => setPerformanceBondEvidenceDueAt(readFormControlValue(event))}
                    />
                  </label>

                  <label className="field">
                    <span>Challenge window</span>
                    <select
                      name="performance_bond_challenge_window_days"
                      value={performanceBondChallengeWindowDays}
                      onChange={(event) =>
                        setPerformanceBondChallengeWindowDays(readFormControlValue(event))
                      }
                    >
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Evidence schema template</span>
                  <select
                    name="performance_bond_schema_template"
                    value={performanceBondTemplateKey}
                    onChange={(event) => applyPerformanceBondTemplate(readFormControlValue(event))}
                  >
                    {PERFORMANCE_BOND_EVIDENCE_TEMPLATES.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                  <small>Templates are editable before acceptance.</small>
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>What action must be proven?</span>
                    <textarea
                      name="performance_bond_action_to_prove"
                      required={performanceBondEnabled}
                      rows={3}
                      value={performanceBondActionToProve}
                      onChange={(event) => setPerformanceBondActionToProve(readFormControlValue(event))}
                    />
                  </label>
                  <label className="field">
                    <span>What evidence types count?</span>
                    <textarea
                      name="performance_bond_evidence_types"
                      required={performanceBondEnabled}
                      rows={3}
                      value={performanceBondEvidenceTypes}
                      onChange={(event) => setPerformanceBondEvidenceTypes(readFormControlValue(event))}
                    />
                  </label>
                  <label className="field">
                    <span>Minimum acceptable detail</span>
                    <textarea
                      name="performance_bond_minimum_detail"
                      required={performanceBondEnabled}
                      rows={3}
                      value={performanceBondMinimumDetail}
                      onChange={(event) => setPerformanceBondMinimumDetail(readFormControlValue(event))}
                    />
                  </label>
                  <label className="field">
                    <span>Review standard</span>
                    <textarea
                      name="performance_bond_review_standard"
                      required={performanceBondEnabled}
                      rows={3}
                      value={performanceBondReviewStandard}
                      onChange={(event) => setPerformanceBondReviewStandard(readFormControlValue(event))}
                    />
                  </label>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Who can view the evidence?</span>
                    <select
                      name="performance_bond_visibility"
                      value={performanceBondVisibility}
                      onChange={(event) => setPerformanceBondVisibility(readFormControlValue(event))}
                    >
                      <option value="counterparty_only">Counterparty only</option>
                      <option value="platform_reviewer_only">Platform reviewer only</option>
                      <option value="public_proof">Public proof</option>
                      <option value="mixed_redacted">Mixed/redacted</option>
                    </select>
                    <small>Use redaction for receipts, reference IDs, addresses, and personal data.</small>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={performanceBondPrivateEvidenceAllowed}
                      name="performance_bond_private_evidence_allowed"
                      type="checkbox"
                      onChange={(event) =>
                        setPerformanceBondPrivateEvidenceAllowed(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Private/redacted evidence is allowed.</span>
                  </label>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Refunded when</span>
                    <input readOnly value={PERFORMANCE_BOND_REFUND_SUMMARY} />
                  </label>
                  <label className="field">
                    <span>Reviewer</span>
                    <input readOnly value={PERFORMANCE_BOND_REVIEWER_POLICY} />
                  </label>
                </div>

                <label className="field">
                  <span>If not completed, release bond to</span>
                  <select
                    name="performance_bond_forfeiture_destination"
                    value={performanceBondForfeitureDestination}
                    onChange={(event) => setPerformanceBondForfeitureDestination(readFormControlValue(event))}
                  >
                    <option value="compromise_charity">Compromise charity / neutral cause</option>
                    <option value="mpgf">Moral Public Goods Fund</option>
                    <option value="counterparty">Counterparty</option>
                    <option value="split">Split</option>
                  </select>
                  <small>Default is neutral; if no concrete neutral cause is available, MPGF is used.</small>
                </label>

                {performanceBondForfeitureDestination === "counterparty" ||
                performanceBondForfeitureDestination === "split" ? (
                  <div className="status-banner status-banner-error">
                    <p>{PERFORMANCE_BOND_COUNTERPARTY_WARNING}</p>
                    <label className="radio-row">
                      <input
                        checked={performanceBondCounterpartyConsent}
                        name="performance_bond_counterparty_payout_consent"
                        type="checkbox"
                        onChange={(event) =>
                          setPerformanceBondCounterpartyConsent(
                            (event.currentTarget as HTMLInputElement).checked,
                          )
                        }
                      />
                      <span>I explicitly consent to this counterparty payout structure.</span>
                    </label>
                  </div>
                ) : null}

                {performanceBondForfeitureDestination === "split" ? (
                  <div className="field-grid">
                    <label className="field">
                      <span>Counterparty %</span>
                      <input
                        max="100"
                        min="0"
                        name="performance_bond_counterparty_percent"
                        type="number"
                        value={performanceBondCounterpartyPercent}
                        onChange={(event) => setPerformanceBondCounterpartyPercent(readFormControlValue(event))}
                      />
                    </label>
                    <label className="field">
                      <span>Neutral cause %</span>
                      <input
                        max="100"
                        min="0"
                        name="performance_bond_neutral_cause_percent"
                        type="number"
                        value={performanceBondNeutralPercent}
                        onChange={(event) => setPerformanceBondNeutralPercent(readFormControlValue(event))}
                      />
                    </label>
                    <label className="field">
                      <span>MPGF %</span>
                      <input
                        max="100"
                        min="0"
                        name="performance_bond_mpgf_percent"
                        type="number"
                        value={performanceBondMpgfPercent}
                        onChange={(event) => setPerformanceBondMpgfPercent(readFormControlValue(event))}
                      />
                    </label>
                  </div>
                ) : null}

                <label className="field">
                  <span>Why this is additional?</span>
                  <textarea
                    name="performance_bond_additionality_statement"
                    placeholder="Explain why this bond-backed pledge would not happen on this timeline without the swap."
                    rows={3}
                    value={performanceBondAdditionality}
                    onChange={(event) => setPerformanceBondAdditionality(readFormControlValue(event))}
                  />
                </label>

                <label className="field">
                  <span>No-trade baseline</span>
                  <textarea
                    name="performance_bond_no_trade_baseline"
                    placeholder="Restate the baseline this specific bond is meant to make more credible."
                    rows={3}
                    value={performanceBondNoTradeBaseline}
                    onChange={(event) => setPerformanceBondNoTradeBaseline(readFormControlValue(event))}
                  />
                </label>
              </div>
            ) : null}
          </details>
        ) : null}

        <div className="field-grid" id="offer-terms">
          <label className="field">
            <span>What you&apos;re offering</span>
            <select
              name="offered_cause"
              value={offeredCause}
              onChange={(event) => setOfferedCause(readFormControlValue(event))}
            >
              {CAUSE_OPTIONS.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>What you want in return</span>
            <select
              name="requested_cause"
              value={requestedCause}
              onChange={(event) => setRequestedCause(readFormControlValue(event))}
            >
              {CAUSE_OPTIONS.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Alias</span>
          <input name="owner_alias_override" placeholder="Optional public alias override" type="text" />
          <small>
            Leave blank to use your profile display name. Offset offers are public, so choose the
            name you want others to see.
          </small>
        </label>

        <label className="field">
          <span>What will you do?</span>
          <textarea
            name="offer_action"
            onChange={(event) => setOfferAction(readFormControlValue(event))}
            placeholder="e.g. Redirect $1,000 I would otherwise have donated to an opposed lobbying cause into the named compromise fund."
            required
            rows={4}
            value={offerAction}
          />
        </label>

        <label className="field">
          <span>What do you want the other side to do?</span>
          <textarea
            name="request_action"
            onChange={(event) => setRequestAction(readFormControlValue(event))}
            placeholder="e.g. Redirect the matched portion of your opposed donation into the same compromise destination."
            required
            rows={4}
            value={requestAction}
          />
        </label>

        <label className="field" id="offer-boundaries">
          <span>No-trade baseline / default</span>
          <textarea
            name="baseline_statement"
            onChange={(event) => setBaselineStatement(readFormControlValue(event))}
            placeholder="e.g. Without this trade, I would make the opposed donation next month; I can support that baseline with past donation records."
            required
            rows={3}
            value={baselineStatement}
          />
          <small>
            This is the counterfactual trust field: reviewers need to know what the default would
            have been.
          </small>
        </label>

        {isPledge ? (
          <label className="field">
            <span>Why this is additional?</span>
            <textarea
              name="additionality_statement"
              onChange={(event) => setAdditionalityStatement(readFormControlValue(event))}
              placeholder="Explain why this action is plausibly caused by the swap rather than something you would have done anyway."
              required={isPledge}
              rows={3}
              value={additionalityStatement}
            />
            <small>
              This does not make the bond prove the counterfactual; it gives reviewers a concrete
              additionality claim to evaluate alongside the no-trade baseline.
            </small>
          </label>
        ) : null}

        {isPledge ? (
          <fieldset className="field baseline-bond-fieldset" id="pledge-manual-review">
            <legend>Pledge-swap manual-review terms</legend>
            <div className="panel subtle-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Before any final lock</p>
                  <h3>Keep the pledge reviewable without expanding surveillance.</h3>
                </div>
                <span className="badge badge-warning">
                  {pledgeSwapManualReviewPreview.releaseStage.replaceAll("_", " ")}
                </span>
              </div>
              <p className="panel-note">
                A match candidate does not create a deal. Final reliance requires a frozen lock
                proposal, fresh confirmations, commitment reservation, and neutral review.
              </p>

              <div className="field-grid">
                <label className="field">
                  <span>Maximum obligation duration</span>
                  <input
                    max="366"
                    min="1"
                    name="pledge_swap_max_obligation_days"
                    required={isPledge}
                    type="number"
                    value={pledgeMaxObligationDays}
                    onChange={(event) => setPledgeMaxObligationDays(readFormControlValue(event))}
                  />
                  <small>Preview stage limit: 366 days or less.</small>
                </label>
                <label className="field">
                  <span>Challenge window</span>
                  <select
                    name="pledge_swap_challenge_window_days"
                    value={pledgeChallengeWindowDays}
                    onChange={(event) => setPledgeChallengeWindowDays(readFormControlValue(event))}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </label>
                <label className="field">
                  <span>Baseline confidence</span>
                  <select
                    name="pledge_swap_baseline_confidence"
                    value={pledgeBaselineConfidence}
                    onChange={(event) =>
                      setPledgeBaselineConfidence(
                        readFormControlValue(event) as PledgeSwapBaselineConfidence,
                      )
                    }
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low - manual review</option>
                  </select>
                </label>
              </div>

              <div className="field-grid">
                <label className="radio-row">
                  <input
                    checked={pledgeBaselinePredatesOffer}
                    name="pledge_swap_baseline_predates_offer"
                    type="checkbox"
                    onChange={(event) =>
                      setPledgeBaselinePredatesOffer((event.currentTarget as HTMLInputElement).checked)
                    }
                  />
                  <span>The no-trade baseline predates this offer.</span>
                </label>
                <label className="radio-row">
                  <input
                    checked={pledgeNeutralReviewRequired}
                    name="pledge_swap_neutral_review_required"
                    required={isPledge}
                    type="checkbox"
                    onChange={(event) =>
                      setPledgeNeutralReviewRequired((event.currentTarget as HTMLInputElement).checked)
                    }
                  />
                  <span>Challenges, disputes, and forfeiture decisions require neutral review.</span>
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Reciprocal release rule</span>
                  <textarea
                    name="pledge_swap_reciprocal_release_rule"
                    required={isPledge}
                    rows={3}
                    value={pledgeReciprocalReleaseRule}
                    onChange={(event) => setPledgeReciprocalReleaseRule(readFormControlValue(event))}
                  />
                  <small>State what happens to future duties if one side exits or performance fails.</small>
                </label>
                <label className="field">
                  <span>Withdrawal before lock</span>
                  <textarea
                    name="pledge_swap_withdrawal_before_lock_rule"
                    required={isPledge}
                    rows={3}
                    value={pledgeWithdrawalBeforeLockRule}
                    onChange={(event) =>
                      setPledgeWithdrawalBeforeLockRule(readFormControlValue(event))
                    }
                  />
                  <small>Before final confirmation, withdrawal must not create penalty or private-detail escalation.</small>
                </label>
              </div>

              <div className="field-grid" id="pledge-manual-evidence">
                <label className="field">
                  <span>Least-intrusive evidence plan</span>
                  <textarea
                    name="pledge_swap_evidence_plan"
                    required={isPledge}
                    rows={3}
                    value={pledgeEvidencePlan}
                    onChange={(event) => setPledgeEvidencePlan(readFormControlValue(event))}
                  />
                </label>
                <label className="field">
                  <span>Less-intrusive fallback</span>
                  <textarea
                    name="pledge_swap_least_intrusive_alternative"
                    required={isPledge}
                    rows={3}
                    value={pledgeLeastIntrusiveAlternative}
                    onChange={(event) =>
                      setPledgeLeastIntrusiveAlternative(readFormControlValue(event))
                    }
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Action reversibility</span>
                  <select
                    name="pledge_swap_action_reversibility"
                    value={pledgeActionReversibility}
                    onChange={(event) =>
                      setPledgeActionReversibility(
                        readFormControlValue(event) as PledgeSwapActionReversibility,
                      )
                    }
                  >
                    <option value="continuing_but_suspendable">Continuing but suspendable</option>
                    <option value="reversible_or_low_stakes">Reversible or low stakes</option>
                    <option value="unknown">Unknown - manual review</option>
                    <option value="irreversible_or_high_stakes">Irreversible or high stakes - blocked</option>
                  </select>
                </label>
                <label className="field">
                  <span>Third-party obligation</span>
                  <select
                    name="pledge_swap_third_party_obligation"
                    value={pledgeThirdPartyObligation}
                    onChange={(event) =>
                      setPledgeThirdPartyObligation(
                        readFormControlValue(event) as PledgeSwapThirdPartyObligation,
                      )
                    }
                  >
                    <option value="none_known">No known third-party duty</option>
                    <option value="possible_or_unknown">Possible or unknown - manual review</option>
                    <option value="conflict_declared">Conflict declared - blocked</option>
                  </select>
                </label>
                <label className="field">
                  <span>Representative authority</span>
                  <select
                    name="pledge_swap_representative_authority"
                    value={pledgeRepresentativeAuthority}
                    onChange={(event) =>
                      setPledgeRepresentativeAuthority(
                        readFormControlValue(event) as PledgeSwapRepresentativeAuthority,
                      )
                    }
                  >
                    <option value="self_only">I bind only my own actions/resources</option>
                    <option value="claims_representative_authority">I claim representative authority</option>
                    <option value="unknown">Unknown - manual review</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Negative or abstention commitment scope</span>
                <textarea
                  name="pledge_swap_negative_commitment_scope"
                  placeholder="If this asks someone not to do something, define the covered action, time window, substitutes, exclusions, and evidence standard."
                  rows={3}
                  value={pledgeNegativeCommitmentScope}
                  onChange={(event) => setPledgeNegativeCommitmentScope(readFormControlValue(event))}
                />
              </label>

              <div className="field-grid">
                <label className="radio-row">
                  <input
                    checked={pledgeCompensatedMoralAction}
                    name="pledge_swap_compensated_moral_action"
                    type="checkbox"
                    onChange={(event) =>
                      setPledgeCompensatedMoralAction(
                        (event.currentTarget as HTMLInputElement).checked,
                      )
                    }
                  />
                  <span>This includes compensation for a moral action or abstention.</span>
                </label>
                <label className="field">
                  <span>Ordinary-service classification</span>
                  <select
                    name="pledge_swap_ordinary_service_classification"
                    value={pledgeOrdinaryServiceClassification}
                    onChange={(event) =>
                      setPledgeOrdinaryServiceClassification(
                        readFormControlValue(event) as PledgeSwapOrdinaryServiceClassification,
                      )
                    }
                  >
                    <option value="not_ordinary_service_market">Not an ordinary-service market</option>
                    <option value="unclear">Unclear - manual review</option>
                    <option value="ordinary_service_or_procurement">Ordinary service/procurement - manual review</option>
                  </select>
                </label>
              </div>

              {pledgeCompensatedMoralAction ? (
                <label className="field">
                  <span>Compensation terms</span>
                  <textarea
                    name="pledge_swap_compensation_summary"
                    required={pledgeCompensatedMoralAction}
                    rows={3}
                    value={pledgeCompensationSummary}
                    onChange={(event) => setPledgeCompensationSummary(readFormControlValue(event))}
                  />
                  <small>Compensation cannot become payable or reliance-bearing without manual review.</small>
                </label>
              ) : (
                <input name="pledge_swap_compensation_summary" type="hidden" value="" />
              )}

              <details className="panel subtle-panel">
                <summary className="panel-summary">Safety assessment gates</summary>
                <div className="field-grid">
                  <label className="field">
                    <span>Reporting integrity</span>
                    <select
                      name="pledge_swap_reporting_integrity"
                      value={pledgeReportingIntegrity}
                      onChange={(event) =>
                        setPledgeReportingIntegrity(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No reporting suppression term</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Civil rights</span>
                    <select
                      name="pledge_swap_civil_rights"
                      value={pledgeCivilRights}
                      onChange={(event) =>
                        setPledgeCivilRights(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No civil-rights issue known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Autonomy/coercion</span>
                    <select
                      name="pledge_swap_participant_autonomy"
                      value={pledgeParticipantAutonomy}
                      onChange={(event) =>
                        setPledgeParticipantAutonomy(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">Voluntary; no vulnerability known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Confidentiality/privacy</span>
                    <select
                      name="pledge_swap_confidentiality_privacy"
                      value={pledgeConfidentialityPrivacy}
                      onChange={(event) =>
                        setPledgeConfidentialityPrivacy(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No private-data requirement known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Evidence authenticity</span>
                    <select
                      name="pledge_swap_evidence_authenticity"
                      value={pledgeEvidenceAuthenticity}
                      onChange={(event) =>
                        setPledgeEvidenceAuthenticity(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="possible_or_unknown">Source-traceable review needed</option>
                      <option value="clear">Clear for preview</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Financial crime/fraud</span>
                    <select
                      name="pledge_swap_financial_crime"
                      value={pledgeFinancialCrime}
                      onChange={(event) =>
                        setPledgeFinancialCrime(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No unusual funds or fraud issue known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Non-transferability</span>
                    <select
                      name="pledge_swap_non_transferability"
                      value={pledgeNonTransferability}
                      onChange={(event) =>
                        setPledgeNonTransferability(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">Non-transferable participant-specific terms</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Regulated goods/hazards</span>
                    <select
                      name="pledge_swap_regulated_goods_hazardous_activity"
                      value={pledgeRegulatedGoodsHazardousActivity}
                      onChange={(event) =>
                        setPledgeRegulatedGoodsHazardousActivity(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No regulated goods or hazard known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Cyber/digital integrity</span>
                    <select
                      name="pledge_swap_cyber_abuse_digital_integrity"
                      value={pledgeCyberAbuseDigitalIntegrity}
                      onChange={(event) =>
                        setPledgeCyberAbuseDigitalIntegrity(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No cyber-abuse issue known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Anti-corruption</span>
                    <select
                      name="pledge_swap_anti_corruption_process_integrity"
                      value={pledgeAntiCorruptionProcessIntegrity}
                      onChange={(event) =>
                        setPledgeAntiCorruptionProcessIntegrity(
                          readFormControlValue(event) as PledgeSwapBinarySafetyAssertion,
                        )
                      }
                    >
                      <option value="clear">No improper-inducement issue known</option>
                      <option value="possible_or_unknown">Possible or unknown - manual review</option>
                      <option value="triggered">Unsafe or triggered - blocked</option>
                    </select>
                  </label>
                </div>
              </details>

              <div className="protocol-provenance-preflight" aria-live="polite">
                <div className="protocol-provenance-head">
                  <div>
                    <strong>Manual-review preview</strong>
                    <p>
                      Ready for manual review: {pledgeSwapManualReviewPreview.readyForManualReview ? "yes" : "no"}.
                      Blocked gates: {pledgeSwapManualReviewPreview.blockedGateCount}.
                    </p>
                  </div>
                  <span className="protocol-review-status">
                    {pledgeSwapManualReviewPreview.humanReviewGateCount} review item
                    {pledgeSwapManualReviewPreview.humanReviewGateCount === 1 ? "" : "s"}
                  </span>
                </div>
                <ol className="protocol-provenance-list">
                  {pledgeSwapManualReviewPreview.gates.map((gate) => (
                    <li
                      className={`protocol-provenance-item protocol-provenance-item-${pledgeGateStatusClass(
                        gate.status,
                      )}`}
                      key={gate.key}
                    >
                      <span className="protocol-step-status">
                        {formatPledgeGateStatus(gate.status)}
                      </span>
                      <div>
                        <strong>{gate.label}</strong>
                        <p>{gate.detail}</p>
                        <small>{gate.nextAction}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </fieldset>
        ) : null}

        {isOffset ? (
          <fieldset className="field baseline-bond-fieldset">
            <legend>Baseline credibility bond</legend>
            <div className="panel subtle-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">
                    {paymentBondsEnabled ? "Optional pilot" : "Planned pilot feature"}
                  </p>
                  <h3>Signal that this no-trade baseline is serious</h3>
                </div>
              </div>
              <p className="route-text">{BASELINE_CREDIBILITY_BOND_COPY}</p>
              <p className="panel-note">
                {paymentBondsEnabled
                  ? "Real payment collection still requires reviewer approval before any payment link is created."
                  : "Planned pilot feature: you can record willingness to post a baseline credibility bond, but no money is collected."}
              </p>
              <label className="radio-row">
                <input
                  checked={baselineBondEnabled}
                  name="baseline_bond_enabled"
                  type="checkbox"
                  onChange={(event) =>
                    setBaselineBondEnabled((event.currentTarget as HTMLInputElement).checked)
                  }
                />
                <span>I would post a baseline credibility bond for this offset.</span>
              </label>

              {baselineBondEnabled ? (
                <div className="field-grid">
                  <label className="field">
                    <span>Bond amount</span>
                    <input
                      max={baselineBondCapCents > 0 ? String(baselineBondCapCents / 100) : "250"}
                      min="10"
                      name="baseline_bond_amount_usd"
                      required={baselineBondEnabled}
                      step="0.01"
                      type="number"
                      value={baselineBondAmountUsd}
                      onChange={(event) => setBaselineBondAmountUsd(readFormControlValue(event))}
                    />
                    <small>
                      Pilot cap: min $10, max{" "}
                      {formatBaselineBondAmount(baselineBondCapCents || 0)} or 20% of the stated
                      baseline amount, whichever is lower.
                    </small>
                  </label>

                  <label className="field">
                    <span>Currency</span>
                    <input
                      name="baseline_bond_currency"
                      readOnly
                      required={baselineBondEnabled}
                      type="text"
                      value={BASELINE_BOND_DEFAULT_CURRENCY}
                    />
                    <small>USD only for the pilot.</small>
                  </label>

                  <label className="field">
                    <span>Offer expiry date</span>
                    <input
                      name="offer_expires_at"
                      required={baselineBondEnabled}
                      type="date"
                      value={offerExpiresAt}
                      onChange={(event) => {
                        const nextDate = readFormControlValue(event);
                        setOfferExpiresAt(nextDate);

                        if (!baselineBondEvidenceDueAt && nextDate) {
                          const nextEvidenceDueAt = getBaselineBondEvidenceDueAt(
                            toIsoDateOrNull(nextDate) ?? nextDate,
                          );
                          setBaselineBondEvidenceDueAt(
                            nextEvidenceDueAt ? nextEvidenceDueAt.slice(0, 10) : "",
                          );
                        }
                      }}
                    />
                    <small>A baseline credibility bond requires an expiry date.</small>
                  </label>

                  <label className="field">
                    <span>Evidence due date</span>
                    <input
                      name="baseline_bond_evidence_due_at"
                      required={baselineBondEnabled}
                      type="date"
                      value={baselineBondEvidenceDueAt}
                      onChange={(event) =>
                        setBaselineBondEvidenceDueAt(readFormControlValue(event))
                      }
                    />
                    <small>Evidence must be due after the offer expires unmatched.</small>
                  </label>

                  <label className="field">
                    <span>Forfeit destination</span>
                    <select
                      name="baseline_bond_forfeit_destination_id"
                      required={baselineBondEnabled}
                      value={baselineBondForfeitDestinationId}
                      onChange={(event) =>
                        setBaselineBondForfeitDestinationId(readFormControlValue(event))
                      }
                    >
                      {consensusCharities.map((charity) => (
                        <option key={charity.id} value={charity.id}>
                          {charity.name}
                        </option>
                      ))}
                    </select>
                    <small>Choose a preselected public-good destination.</small>
                  </label>

                  <label className="field">
                    <span>Evidence standard</span>
                    <textarea
                      name="baseline_bond_evidence_standard"
                      onChange={(event) =>
                        setBaselineBondEvidenceStandard(readFormControlValue(event))
                      }
                      placeholder="e.g. Dated donation receipt, public confirmation, or payment record showing the stated baseline was carried out."
                      required={baselineBondEnabled}
                      rows={3}
                      value={baselineBondEvidenceStandard}
                    />
                    <small>Name the concrete evidence reviewers should expect after expiry.</small>
                  </label>
                </div>
              ) : null}
            </div>
          </fieldset>
        ) : null}

        <TemplateTextareaSuggestions
          helpText="Short, bounded trades are easier to trust than open-ended commitments with unclear exit rules."
          label="Exit, pause, or expiry condition"
          name="exit_condition"
          onChange={setExitCondition}
          placeholder="e.g. If evidence is missing by the deadline, the record remains unresolved and no completion badge is shown."
          required
          rows={3}
          suggestions={EXIT_CONDITION_TEMPLATE_SUGGESTIONS}
          value={exitCondition}
        />

        {isOffset ? (
          <label className="field">
            <span>Compromise destination (offset only)</span>
            <select
              name="compromise_cause"
              value={compromiseCause}
              onChange={(event) => setCompromiseCause(readFormControlValue(event))}
            >
              {COMPROMISE_CAUSE_OPTIONS.map((cause) => (
                <option key={cause} value={cause}>
                  {cause}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isOffset ? (
          <div className="panel subtle-panel offset-fieldset">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Donation offset terms</p>
                <h3>State the redirect, the compromise charity, and the fallback rule</h3>
              </div>
            </div>

            {isJoiningExistingPool ? (
              <>
                <input
                  name="baseline_opposed_cause"
                  type="hidden"
                  value={effectiveBaselineOpposedCause}
                />
                <input
                  name="requested_opposed_cause"
                  type="hidden"
                  value={effectiveRequestedOpposedCause}
                />
                <input
                  name="compromise_destination_id"
                  type="hidden"
                  value={effectiveCompromiseDestinationId}
                />
                <input name="offset_ratio" type="hidden" value={effectiveOffsetRatio} />
                <input
                  name="offset_time_horizon"
                  type="hidden"
                  value={effectiveTimeHorizon}
                />
                <input
                  name="offset_verification_method"
                  type="hidden"
                  value={effectiveVerificationMethod}
                />
                <input
                  name="unmatched_surplus_rule"
                  type="hidden"
                  value={effectiveUnmatchedSurplusRule}
                />
                <input
                  name="assurance_minimum_usd"
                  type="hidden"
                  value={effectiveAssuranceMinimumUsd}
                />
                <input
                  name="offset_pool_maximum_cap_usd"
                  type="hidden"
                  value={effectivePoolMaximumCapUsd}
                />
                <input
                  name="assurance_deadline"
                  type="hidden"
                  value={effectiveAssuranceDeadline}
                />
              </>
            ) : null}

            <fieldset className="field">
              <legend>Participation mode</legend>
              <div className="radio-stack">
                {DONATION_OFFSET_PARTICIPATION_MODE_OPTIONS.map((option) => (
                  <label className="radio-row" key={option.value}>
                    <input
                      checked={participationMode === option.value}
                      name="offset_participation_mode"
                      type="radio"
                      value={option.value}
                      onChange={(event) => setParticipationMode(readFormControlValue(event) as "direct" | "pool")}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <br />
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {participationMode === "pool" ? (
              <div className="field-grid">
                <label className="field">
                  <span>Join an existing offset pool</span>
                  <select
                    name="offset_pool_id"
                    value={poolId}
                    onChange={(event) => setPoolId(readFormControlValue(event))}
                  >
                    <option value="">Create a new pool instead</option>
                    {availablePools.map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name} | {pool.compromiseCharityName} |{" "}
                        {formatDonationOffsetPoolStatus(pool.status)}
                      </option>
                    ))}
                  </select>
                  <small>
                    Existing pools aggregate donors on each side and apply one shared ratio,
                    verification method, and assurance deadline.
                  </small>
                </label>

                <label className="field">
                  <span>Name for a new pool</span>
                  <input
                    name="offset_pool_name"
                    placeholder="e.g. Pro-choice / pro-life global health pool"
                    type="text"
                    value={effectivePoolName}
                    disabled={isJoiningExistingPool}
                    onChange={(event) => setPoolName(readFormControlValue(event))}
                  />
                  <small>
                    Use this when you are opening a pooled offset rather than joining one that already
                    exists.
                  </small>
                </label>
              </div>
            ) : null}

            {participationMode === "pool" ? (
              <fieldset className="field">
                <legend>Which side are you joining?</legend>
                <div className="radio-stack">
                  {DONATION_OFFSET_POOL_SIDE_OPTIONS.map((option) => (
                    <label className="radio-row" key={option.value}>
                      <input
                        checked={poolSide === option.value}
                        name="offset_pool_side"
                        type="radio"
                        value={option.value}
                        onChange={(event) => setPoolSide(readFormControlValue(event) as "side_a" | "side_b")}
                      />
                      <span>
                        {option.value === "side_a"
                          ? selectedPool?.sideALabel || "Side A"
                          : selectedPool?.sideBLabel || "Side B"}
                      </span>
                    </label>
                  ))}
                </div>
                <small>
                  Pools work best when each side is named clearly, so that aggregate pledges remain
                  legible.
                </small>
              </fieldset>
            ) : null}

            <div className="field-grid">
              <label className="field">
                <span>Baseline donation amount</span>
                <input
                  min="0.01"
                  name="baseline_amount_usd"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={baselineAmountUsd}
                  onChange={(event) => setBaselineAmountUsd(readFormControlValue(event))}
                />
                <small>
                  The amount you would otherwise have donated to the opposed cause. Baseline proof is
                  what prevents extortion concerns.
                </small>
              </label>

              <label className="field">
                <span>Baseline opposed cause</span>
                <select
                  name="baseline_opposed_cause"
                  required={isOffset}
                  value={effectiveBaselineOpposedCause}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setBaselineOpposedCause(readFormControlValue(event))}
                >
                  {CAUSE_OPTIONS.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
                <small>The cause or campaign your baseline donation would otherwise have supported.</small>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Requested matching donation</span>
                <input
                  min="0.01"
                  name="requested_matching_amount_usd"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={requestedMatchingAmountUsd}
                  onChange={(event) => setRequestedMatchingAmountUsd(readFormControlValue(event))}
                />
                <small>
                  The amount you want redirected away from the other side&apos;s opposed cause.
                </small>
              </label>

              <label className="field">
                <span>Requested opposing cause</span>
                <select
                  name="requested_opposed_cause"
                  required={isOffset}
                  value={effectiveRequestedOpposedCause}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setRequestedOpposedCause(readFormControlValue(event))}
                >
                  {CAUSE_OPTIONS.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
                <small>The opposed cause from which you want the matching donor to redirect money.</small>
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Compromise destination</span>
                <select
                  name="compromise_destination_id"
                  required={isOffset}
                  value={effectiveCompromiseDestinationId}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setCompromiseDestinationId(readFormControlValue(event))}
                >
                  {selectableCharities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name}
                    </option>
                  ))}
                </select>
                <small>
                  Choose a named destination both sides can recognize. Consensus charities make better
                  compromise endpoints. Existing pools inherit this from the pool.
                </small>
              </label>

              <label className="field">
                <span>Offset ratio</span>
                <input
                  min="0.01"
                  name="offset_ratio"
                  required={isOffset}
                  step="0.01"
                  type="number"
                  value={effectiveOffsetRatio}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setOffsetRatio(readFormControlValue(event))}
                />
                <small>
                  How many counterparty dollars should match each $1 of your baseline donation.
                  Simple <strong>1:1</strong> offsets are usually easier to match.
                </small>
              </label>
            </div>

            <fieldset className="field">
              <legend>Donor-of-record and receipt treatment</legend>
              <div className="panel subtle-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Before final lock</p>
                    <h3>Freeze receipt and tax treatment without making tax claims</h3>
                  </div>
                  <span className="badge badge-warning">
                    {donationOffsetDonorOfRecordPreview.releaseStage.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="panel-note">
                  Moral Trade does not provide tax advice or certify deductibility. Receipts,
                  donor-advised-fund credits, employer matches, and co-venture facts are reviewed
                  as operational terms, not moral impact.
                </p>

                <div className="field-grid">
                  <label className="field">
                    <span>Donation platform</span>
                    <input
                      name="offset_donor_record_donation_platform"
                      required={isOffset}
                      type="text"
                      value={offsetDonationPlatform}
                      onChange={(event) => setOffsetDonationPlatform(readFormControlValue(event))}
                    />
                  </label>
                  <label className="field">
                    <span>Donor of record</span>
                    <select
                      name="offset_donor_of_record_role"
                      required={isOffset}
                      value={offsetDonorOfRecordRole}
                      onChange={(event) =>
                        setOffsetDonorOfRecordRole(
                          readFormControlValue(event) as DonationOffsetDonorOfRecordRole,
                        )
                      }
                    >
                      <option value="participant_direct_donor">Participant makes external donation</option>
                      <option value="counterparty_direct_donor">Counterparty makes external donation</option>
                      <option value="sponsor_or_third_party">Sponsor or third party</option>
                      <option value="platform_not_donor">Moral Trade explicitly not donor</option>
                      <option value="unknown">Unknown - needs review</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Destination verification</span>
                    <select
                      name="offset_destination_verification_status"
                      required={isOffset}
                      value={offsetDestinationVerificationStatus}
                      onChange={(event) =>
                        setOffsetDestinationVerificationStatus(
                          readFormControlValue(event) as DonationOffsetDestinationVerificationStatus,
                        )
                      }
                    >
                      <option value="registered_destination_selected">Registered destination selected</option>
                      <option value="external_unverified">External destination - manual review</option>
                      <option value="unknown">Unknown - needs input</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Donor-of-record explanation</span>
                  <textarea
                    name="offset_donor_of_record_explanation"
                    required={isOffset}
                    rows={3}
                    value={offsetDonorOfRecordExplanation}
                    onChange={(event) =>
                      setOffsetDonorOfRecordExplanation(readFormControlValue(event))
                    }
                  />
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>Tax receipt treatment</span>
                    <select
                      name="offset_tax_receipt_treatment"
                      required={isOffset}
                      value={offsetTaxReceiptTreatment}
                      onChange={(event) =>
                        setOffsetTaxReceiptTreatment(
                          readFormControlValue(event) as DonationOffsetTaxReceiptTreatment,
                        )
                      }
                    >
                      <option value="no_tax_benefit_claimed">No tax benefit claimed</option>
                      <option value="participant_may_receive_receipt">Participant may receive external receipt</option>
                      <option value="counterparty_may_receive_receipt">Counterparty may receive external receipt</option>
                      <option value="third_party_or_daf_receipt">Third-party or DAF receipt</option>
                      <option value="unknown_or_unreviewed">Unknown - needs input</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Solicitation treatment</span>
                    <select
                      name="offset_charitable_solicitation_treatment"
                      required={isOffset}
                      value={offsetCharitableSolicitationTreatment}
                      onChange={(event) =>
                        setOffsetCharitableSolicitationTreatment(
                          readFormControlValue(event) as DonationOffsetCharitableSolicitationTreatment,
                        )
                      }
                    >
                      <option value="external_donation_only_no_platform_solicitation">External donation only</option>
                      <option value="platform_facilitated_messaging_needs_review">Platform-facilitated messaging - review</option>
                      <option value="commercial_co_venture_or_match_promo">Co-venture or match promotion - review</option>
                      <option value="unknown">Unknown - needs input</option>
                    </select>
                  </label>
                </div>

                <label className="field">
                  <span>Tax receipt explanation</span>
                  <textarea
                    name="offset_tax_receipt_explanation"
                    required={isOffset}
                    rows={3}
                    value={offsetTaxReceiptExplanation}
                    onChange={(event) =>
                      setOffsetTaxReceiptExplanation(readFormControlValue(event))
                    }
                  />
                </label>

                <div className="field-grid">
                  <label className="radio-row">
                    <input
                      checked={offsetTaxBenefitClaimed}
                      name="offset_tax_benefit_claimed"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetTaxBenefitClaimed((event.currentTarget as HTMLInputElement).checked)
                      }
                    />
                    <span>Any participant expects to claim a tax benefit.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetDonorAdvisedFundInvolved}
                      name="offset_daf_involved"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetDonorAdvisedFundInvolved(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Donor-advised fund or fiscal sponsor is involved.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetEmployerMatchInvolved}
                      name="offset_employer_match_involved"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetEmployerMatchInvolved(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Employer match or similar benefit is involved.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetCommercialCoVentureInvolved}
                      name="offset_commercial_co_venture_involved"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetCommercialCoVentureInvolved(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Commercial co-venture or match promotion is involved.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetJurisdictionReviewRequired}
                      name="offset_jurisdiction_review_required"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetJurisdictionReviewRequired(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Legal/jurisdiction review is required before any tax or solicitation claim.</span>
                  </label>
                </div>

                <div className="field-grid">
                  <label className="radio-row">
                    <input
                      checked={offsetNoTaxAdviceAcknowledged}
                      name="offset_no_tax_advice_acknowledgement"
                      required={isOffset}
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetNoTaxAdviceAcknowledged(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>No tax advice or deductibility is provided by Moral Trade.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetOperationalNotImpactAcknowledged}
                      name="offset_receipt_operational_not_impact_acknowledgement"
                      required={isOffset}
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetOperationalNotImpactAcknowledged(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Receipts and payment evidence are not impact claims.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetReceiptDoubleClaimPrevented}
                      name="offset_receipt_double_claim_prevented"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetReceiptDoubleClaimPrevented(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Receipt benefits will not be double-claimed.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetReceiptReassignmentProhibited}
                      name="offset_receipt_reassignment_prohibited"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetReceiptReassignmentProhibited(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>Receipt benefits will not be silently reassigned.</span>
                  </label>
                  <label className="radio-row">
                    <input
                      checked={offsetLockTermsFrozenBeforeConfirmation}
                      name="offset_donor_terms_lock_freeze_acknowledgement"
                      type="checkbox"
                      onChange={(event) =>
                        setOffsetLockTermsFrozenBeforeConfirmation(
                          (event.currentTarget as HTMLInputElement).checked,
                        )
                      }
                    />
                    <span>These terms must be frozen before final lock confirmation.</span>
                  </label>
                </div>

                <div className="protocol-provenance-preflight" aria-live="polite">
                  <div className="protocol-provenance-head">
                    <div>
                      <strong>Donor-of-record preview</strong>
                      <p>
                        Ready for lock review:{" "}
                        {donationOffsetDonorOfRecordPreview.readyForLockReview ? "yes" : "no"}.
                        Tax claim allowed:{" "}
                        {donationOffsetDonorOfRecordPreview.taxDeductibilityClaimAllowed
                          ? "yes"
                          : "no"}.
                      </p>
                    </div>
                    <span className="protocol-review-status">
                      {donationOffsetDonorOfRecordPreview.humanReviewGateCount} review item
                      {donationOffsetDonorOfRecordPreview.humanReviewGateCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ol className="protocol-provenance-list">
                    {donationOffsetDonorOfRecordPreview.gates.map((gate) => (
                      <li
                        className={`protocol-provenance-item protocol-provenance-item-${offsetDonorGateStatusClass(
                          gate.status,
                        )}`}
                        key={gate.key}
                      >
                        <span className="protocol-step-status">
                          {formatOffsetDonorGateStatus(gate.status)}
                        </span>
                        <div>
                          <strong>{gate.label}</strong>
                          <p>{gate.detail}</p>
                          <small>{gate.nextAction}</small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </fieldset>

            <div className="field-grid">
              <label className="field">
                <span>Time horizon</span>
                <select
                  name="offset_time_horizon"
                  required={isOffset}
                  value={effectiveTimeHorizon}
                  disabled={isJoiningExistingPool}
                  onChange={(event) => setTimeHorizon(readFormControlValue(event) as "one_off" | "recurring")}
                >
                  {DONATION_OFFSET_TIME_HORIZON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>Use one-off for a single redirected donation and recurring for an ongoing rule.</small>
              </label>

              <label className="field">
                <span>Verification method</span>
                <select
                  name="offset_verification_method"
                  required={isOffset}
                  value={effectiveVerificationMethod}
                  disabled={isJoiningExistingPool}
                  onChange={(event) =>
                    setVerificationMethod(
                      readFormControlValue(event) as
                        | "proof_of_past_donations"
                        | "funds_in_escrow"
                        | "third_party_audit",
                    )
                  }
                >
                  {DONATION_OFFSET_VERIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  Proof of past donations helps establish counterfactual credibility. Third-party
                  payment records and audits can add stronger factual trust.
                </small>
              </label>
            </div>

            <fieldset className="field">
              <legend>Unmatched surplus rule</legend>
              <div className="radio-stack">
                {DONATION_OFFSET_UNMATCHED_RULE_OPTIONS.map((option) => (
                  <label className="radio-row" key={option.value}>
                    <input
                      checked={effectiveUnmatchedSurplusRule === option.value}
                      disabled={isJoiningExistingPool}
                      name="unmatched_surplus_rule"
                      type="radio"
                      value={option.value}
                      onChange={(event) =>
                        setUnmatchedSurplusRule(
                          readFormControlValue(event) as
                            | "return_to_donors"
                            | "donate_to_compromise_destination"
                            | "donate_to_original_cause",
                        )
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <small>
                State in advance what happens if only part of the intended offset is matched.
              </small>
            </fieldset>

            {participationMode === "pool" ? (
              <div className="field-grid">
                <label className="field">
                  <span>Assurance minimum</span>
                  <input
                    min="0"
                    name="assurance_minimum_usd"
                    step="0.01"
                    type="number"
                    value={effectiveAssuranceMinimumUsd}
                    disabled={isJoiningExistingPool}
                    onChange={(event) => setAssuranceMinimumUsd(readFormControlValue(event))}
                  />
                  <small>
                    Donors can commit on the condition that the pool reaches this minimum matched
                    redirection.
                  </small>
                </label>

                <label className="field">
                  <span>Assurance deadline</span>
                    <input
                      name="assurance_deadline"
                      type="date"
                      value={effectiveAssuranceDeadline}
                      disabled={isJoiningExistingPool}
                      onChange={(event) => setAssuranceDeadline(readFormControlValue(event))}
                    />
                  <small>
                    A deadline makes the assurance contract legible and gives people a clear decision
                    point.
                  </small>
                </label>

                <label className="field">
                  <span>Pool maximum cap</span>
                  <input
                    disabled={isJoiningExistingPool}
                    min="0.01"
                    name="offset_pool_maximum_cap_usd"
                    step="0.01"
                    type="number"
                    value={effectivePoolMaximumCapUsd}
                    onChange={(event) => setPoolMaximumCapUsd(readFormControlValue(event))}
                  />
                  <small>
                    The maximum aggregate compromise amount this pool should gather before review
                    closes further matching.
                  </small>
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Receipt, payment record, or audit link</span>
              <input
                name="offset_evidence_url"
                placeholder="https://..."
                type="url"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(readFormControlValue(event))}
              />
              <small>
                Evidence links must be unique to one offset claim. Unverified baselines are kept
                out of the public marketplace until they are reviewed.
              </small>
            </label>

            {participationMode === "pool" ? (
              <div className="panel subtle-panel">
                <p className="eyebrow">Pool review status</p>
                <p className="route-text">
                  New pooled offsets are saved for manual review. They are not legal escrow,
                  payment custody, or a promise that any redirection has happened.
                </p>
                <label className="radio-row">
                  <input
                    checked={antiThreatCertified}
                    name="offset_anti_threat_certification"
                    required
                    type="checkbox"
                    onChange={(event) =>
                      setAntiThreatCertified(
                        (event.currentTarget as HTMLInputElement).checked,
                      )
                    }
                  />
                  <span>
                    I certify this pool is based on a real baseline intention, not a threat,
                    coercive demand, harassment, doxxing, fraud, or pressure on vulnerable people.
                  </span>
                </label>
                <label className="radio-row">
                  <input
                    checked={verificationMetadataAcknowledged}
                    name="offset_verification_metadata_acknowledgement"
                    required
                    type="checkbox"
                    onChange={(event) =>
                      setVerificationMetadataAcknowledged(
                        (event.currentTarget as HTMLInputElement).checked,
                      )
                    }
                  />
                  <span>
                    I have provided a verification method and evidence link that a reviewer can
                    inspect before treating the pooled offset as credible.
                  </span>
                </label>
              </div>
            ) : null}

            <div className="panel offset-summary">
              <p className="eyebrow">Live summary</p>
              <h3>{formatUsd(offsetPreview.compromiseTotalUsd)} would move to the compromise charity.</h3>
              <p>
                This offer redirects <strong>{formatUsd(offsetPreview.matchedBaselineUsd)}</strong> from the
                baseline side and asks the counterparty to redirect{" "}
                <strong>{formatUsd(offsetPreview.matchedCounterpartyUsd)}</strong> at a ratio of{" "}
                <strong>{formatDonationOffsetRatio(Number(effectiveOffsetRatio))}</strong>.
              </p>
              <p>
                Unmatched remainder: {formatUsd(offsetPreview.unmatchedBaselineUsd)} on the baseline side
                and {formatUsd(offsetPreview.unmatchedCounterpartyUsd)} on the counterparty side.
              </p>
              <p>{offsetPreview.unmatchedRuleLabel}</p>
              <p>
                Verification: {formatDonationOffsetVerificationMethod(effectiveVerificationMethod)} | Horizon:{" "}
                {formatDonationOffsetTimeHorizon(effectiveTimeHorizon)} | Surplus rule:{" "}
                {formatDonationOffsetUnmatchedRule(effectiveUnmatchedSurplusRule)}
              </p>
              {participationMode === "pool" ? (
                <div className="offset-pool-preview">
                  <p>
                    Pool mode turns this into a larger aggregate offset. Your side is{" "}
                    <strong>{poolSide || "not yet chosen"}</strong>.
                  </p>
                  {selectedPool ? (
                    <>
                      <p>
                        Current pool: <strong>{selectedPool.name}</strong> | Already matched:{" "}
                        <strong>{formatUsd(selectedPool.matchedCompromiseCents / 100)}</strong>
                      </p>
                      {joinedPoolProgress ? (
                        <>
                          <div className="offset-progress-track" aria-hidden="true">
                            <span
                              className="offset-progress-fill"
                              style={{ width: `${joinedPoolProgress.assuranceProgressPct}%` }}
                            />
                          </div>
                          <p>
                            After your commitment, the pool would show{" "}
                            <strong>{formatUsd(joinedPoolProgress.matchedCompromiseUsd)}</strong> matched
                            toward an assurance threshold of{" "}
                            <strong>{formatUsd(joinedPoolProgress.assuranceMinimumUsd)}</strong>.
                          </p>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p>
                      New pool commitments can set an assurance threshold and deadline so donors only
                      redirect once enough matching support appears.
                    </p>
                  )}
                  <p>
                    Pool cap: <strong>{formatUsd(Number(effectivePoolMaximumCapUsd) || 0)}</strong>.
                    Review status: manual review required before public reliance.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="panel subtle-panel">
              <p className="eyebrow">Consensus destinations</p>
              <div className="tag-row">
                {consensusCharities.map((charity) => (
                  <span className="badge badge-secondary" key={charity.id}>
                    {charity.name}
                  </span>
                ))}
              </div>
              <p className="panel-note">
                These are the compromise destinations on Moral Trade most clearly framed as moral
                public goods: broad goods many different moral views can value at once.
              </p>
            </div>
          </div>
        ) : null}

        <div className="field-grid">
          <label className="field">
            <span>Your impact estimate</span>
            <input
              max={10}
              min={1}
              name="offer_impact"
              type="number"
              value={offerImpact}
              onChange={(event) => setOfferImpact(readFormControlValue(event))}
            />
            <small>
              This reflects your own stated priorities. It is not a platform judgment about
              objective moral value.
            </small>
          </label>

          <label className="field">
            <span>Minimum counterparty impact</span>
            <input
              max={10}
              min={1}
              name="min_counterparty_impact"
              type="number"
              value={minCounterpartyImpact}
              onChange={(event) => setMinCounterpartyImpact(readFormControlValue(event))}
            />
            <small>
              Use this as a participant-relative threshold for the trade, not as a global moral
              ranking.
            </small>
          </label>
        </div>

        <div className="field-grid" id="offer-evidence">
          <label className="field">
            <span>Verification preference</span>
            <select
              name="verification"
              value={verificationPreference}
              onChange={(event) => setVerificationPreference(readFormControlValue(event))}
            >
              {VERIFICATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Review period</span>
            <select
              name="duration"
              value={reviewPeriod}
              onChange={(event) => setReviewPeriod(readFormControlValue(event))}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isPayment ? (
          <>
            <div className="field-grid">
              <label className="field">
                <span>Payment cadence (deferred paid pilots only)</span>
                <select
                  name="payment_interval_unit"
                  value={paymentIntervalUnit}
                  onChange={(event) => setPaymentIntervalUnit(readFormControlValue(event) as PaymentIntervalUnit)}
                >
                  {PAYMENT_INTERVAL_UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Repeat every</span>
                <input
                  min={1}
                  name="payment_interval_value"
                  type="number"
                  value={paymentIntervalValue}
                  onChange={(event) => setPaymentIntervalValue(readFormControlValue(event))}
                />
              </label>
            </div>
            <p className="panel-note">
              Paid action offers are not part of the public launch wedge. Payment cadence appears
              only for future reviewed pilots and never implies escrow or custody.
            </p>
          </>
        ) : (
          <>
            <input name="payment_interval_unit" type="hidden" value="none" />
            <input name="payment_interval_value" type="hidden" value="1" />
          </>
        )}

        <label className="field">
          <span>Trust intensity</span>
          <input
            max={5}
            min={1}
            name="trust_level"
            type="number"
            value={trustLevel}
            onChange={(event) => setTrustLevel(readFormControlValue(event))}
          />
        </label>

        <label className="field" id="offer-publish">
          <span>Description</span>
          <textarea
            name="notes"
            onChange={(event) => setNotes(readFormControlValue(event))}
            placeholder="Explain why each side is better off than the no-trade baseline, what evidence you can provide, and what should happen if matching is incomplete."
            required
            rows={4}
            value={notes}
          />
        </label>

        <div className="form-actions">
          <button className="button button-primary" disabled={!canPublishOffer} type="submit">
            {isPayment ? "Paid offers are deferred" : "Publish offer"}
          </button>
          <Link className="button button-secondary" href="/offers">
            Back to offers
          </Link>
        </div>
      </form>
    </article>
  );
}
