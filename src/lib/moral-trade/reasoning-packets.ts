import type { Offer } from "@/lib/offers";
import {
  evaluateMoralTradeProtocolDraft,
  formatProtocolReviewStatus,
  getOfferReviewCardInstrumentation,
  getOfferReviewWorkflowContract,
  MORAL_TRADE_VERIFICATION_LOOP_STEPS,
  type MoralTradeCitedEvidenceRow,
  type MoralTradeVerificationLoopStep,
  type ProtocolReviewStatus,
} from "@/lib/proposal-review";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";

import { getMoralTradeProvenanceContract } from "./provenance";

export const MORAL_TRADE_REASONING_PACKET_CONTRACT_VERSION =
  "moral-trade-reasoning-packets-v0.1-2026-05";

export const MORAL_TRADE_REASONING_PACKET_VALIDATOR_VERSION =
  "moral-trade-reasoning-packet-validator-v0.1";

export type MoralTradeReasoningStatusTone =
  | "blocked"
  | "human-review"
  | "needs-input"
  | "pass";

export interface MoralTradeReasoningPacket {
  id: string;
  sourceOfferId: string;
  rank: number;
  status: string;
  statusCode: ProtocolReviewStatus;
  statusTone: MoralTradeReasoningStatusTone;
  scope: string;
  title: string;
  href: string;
  factorCodes: string[];
  summary: string;
  nextStep: string;
  decisionSteps: MoralTradeVerificationLoopStep[];
  evidenceRows: MoralTradeCitedEvidenceRow[];
  uncertaintyFlags: string[];
  reviewScope: string[];
  reviewerSummary: string;
  contractSources: string[];
}

export interface MoralTradeReasoningPacketContract {
  version: string;
  purpose: string;
  sourceRoute: "/reasoning-center";
  publicApiRoute: "/api/moral-trade/reasoning/packets";
  packetCount: number;
  requiredPacketFields: Array<keyof MoralTradeReasoningPacket>;
  linkedContracts: {
    reviewWorkflowContractVersion: string;
    reviewWorkflowCardCount: number;
    reviewWorkflowMarketplaceFactorCount: number;
    provenanceSchemaVersion: string;
    provenanceValidationRuleCount: number;
    provenanceSampleBundleStatus: string;
  };
  invariants: string[];
  samplePackets: MoralTradeReasoningPacket[];
  contractTests: string[];
}

export interface MoralTradeReasoningPacketContractCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeReasoningPacketContractValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-reasoning-packet-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeReasoningPacketContractCheck[];
  blockers: string[];
}

const PUBLIC_REASONING_PACKET_COUNT = 5;

const REQUIRED_REASONING_PACKET_FIELDS = [
  "id",
  "sourceOfferId",
  "rank",
  "status",
  "statusCode",
  "statusTone",
  "scope",
  "title",
  "href",
  "factorCodes",
  "summary",
  "nextStep",
  "decisionSteps",
  "evidenceRows",
  "uncertaintyFlags",
  "reviewScope",
  "reviewerSummary",
  "contractSources",
] as const satisfies ReadonlyArray<keyof MoralTradeReasoningPacket>;

const REASONING_PACKET_CONTRACT_TESTS = [
  "reasoning_packet_contract_validator",
  "reasoning_center_public_packet_smoke",
  "reasoning_packets_api_route_smoke",
  "technical_spec_reasoning_packet_smoke",
] as const;

const REQUIRED_CONTRACT_SOURCES = [
  "canonical_worked_case_offer",
  "deterministic_protocol_review",
  "review_workflow_contract",
  "provenance_contract",
] as const;

function reasoningPacketCheck(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeReasoningPacketContractCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getReasoningStatusTone(
  status: ProtocolReviewStatus,
): MoralTradeReasoningStatusTone {
  switch (status) {
    case "blocked":
      return "blocked";
    case "matchable":
      return "pass";
    case "challenge_window":
    case "needs_human_review":
      return "human-review";
    default:
      return "needs-input";
  }
}

export function getWorkedCaseBaselineStatement(offer: Offer) {
  if (offer.mode === "offset" && offer.baselineAmountUsd) {
    return `Without this trade, ${offer.alias} reports a baseline intention to direct $${offer.baselineAmountUsd.toLocaleString()} toward ${offer.baselineOpposedCause}.`;
  }

  return `Without this trade, ${offer.alias} would not expect this reciprocal ${offer.mode} to happen during ${offer.duration}.`;
}

export function getMoralTradeReasoningPackets(
  offers: readonly Offer[] = CANONICAL_WORKED_CASE_OFFERS,
): MoralTradeReasoningPacket[] {
  return offers.slice(0, PUBLIC_REASONING_PACKET_COUNT).map((offer, index) => {
    const protocolReview = evaluateMoralTradeProtocolDraft({
      format: offer.mode,
      offeredCause: offer.offeredCause,
      requestedCause: offer.requestedCause,
      offeredAction: offer.offerAction,
      requestedAction: offer.requestAction,
      baselineStatement: getWorkedCaseBaselineStatement(offer),
      duration: offer.duration,
      exitConditions:
        "If evidence is missing, disputed, stale, or outside the agreed scope, this worked example stays unresolved until a reviewer records a scoped decision.",
      verificationMethod: offer.verification,
      publicDescription: offer.notes,
      evidenceUrl: offer.evidenceUrl,
      participantImportance: offer.offerImpact,
      counterpartyThreshold: offer.minCounterpartyImpact,
    });
    const marketplaceInstrumentation = getOfferReviewCardInstrumentation({
      ...offer,
      currentStatus: "Worked example; manual review required before reliance",
      offerImpact: offer.offerImpact,
      minCounterpartyImpact: offer.minCounterpartyImpact,
    });
    const factorCodes = Array.from(
      new Set([...marketplaceInstrumentation.factorCodes, ...protocolReview.factorCodes]),
    ).slice(0, 7);

    return {
      id: `reasoning-packet-${offer.id}`,
      sourceOfferId: offer.id,
      rank: index + 1,
      status: formatProtocolReviewStatus(protocolReview.status),
      statusCode: protocolReview.status,
      statusTone: getReasoningStatusTone(protocolReview.status),
      scope: `Worked example ${offer.id}`,
      title: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
      href: `/offers/examples/${offer.id}`,
      factorCodes,
      summary: protocolReview.summary,
      nextStep: protocolReview.nextStepChecklist[0] ?? marketplaceInstrumentation.nextStep,
      decisionSteps: protocolReview.verificationLoop,
      evidenceRows: protocolReview.citedEvidenceTable.slice(0, 3),
      uncertaintyFlags: protocolReview.uncertaintyFlags.slice(0, 4),
      reviewScope: protocolReview.reviewInstructions.reviewScope.slice(0, 3),
      reviewerSummary: protocolReview.reviewerSummary,
      contractSources: [...REQUIRED_CONTRACT_SOURCES],
    };
  });
}

export function getMoralTradeReasoningPacketContract(
  packets: readonly MoralTradeReasoningPacket[] = getMoralTradeReasoningPackets(),
): MoralTradeReasoningPacketContract {
  const reviewWorkflowContract = getOfferReviewWorkflowContract();
  const provenanceContract = getMoralTradeProvenanceContract();

  return {
    version: MORAL_TRADE_REASONING_PACKET_CONTRACT_VERSION,
    purpose:
      "Public contract for Reasoning Center packets: structured summaries, cited evidence rows, uncertainty flags, reviewer scope, and next human-controlled steps derived from deterministic worked examples.",
    sourceRoute: "/reasoning-center",
    publicApiRoute: "/api/moral-trade/reasoning/packets",
    packetCount: packets.length,
    requiredPacketFields: [...REQUIRED_REASONING_PACKET_FIELDS],
    linkedContracts: {
      reviewWorkflowContractVersion: reviewWorkflowContract.version,
      reviewWorkflowCardCount: reviewWorkflowContract.detailWorkflowCards.length,
      reviewWorkflowMarketplaceFactorCount:
        reviewWorkflowContract.marketplaceFactorPriority.length,
      provenanceSchemaVersion: provenanceContract.schemaVersion,
      provenanceValidationRuleCount: provenanceContract.validationRules.length,
      provenanceSampleBundleStatus:
        provenanceContract.sampleBundleSummary.validationStatus,
    },
    invariants: [
      "Packets expose only structured summaries, cited evidence rows, uncertainty flags, reviewer scope, factor codes, and required next steps.",
      "Packets publish step-by-step decision gates with pass, needs_input, human_review, or blocked statuses before any public reliance.",
      "Packets must not expose chain-of-thought, private wish text, contact details, raw source notes, or autonomous outreach fields.",
      "Packets must preserve no_global_moral_ranking and participant-relative language.",
      "Packets are derived from canonical worked examples; live private offers are not exported.",
      "Every packet links to a worked example page and public contract sources.",
    ],
    samplePackets: packets.slice(0, 2),
    contractTests: [...REASONING_PACKET_CONTRACT_TESTS],
  };
}

function packetHasRequiredFields(packet: MoralTradeReasoningPacket) {
  return REQUIRED_REASONING_PACKET_FIELDS.every((field) => {
    const value = packet[field];

    if (Array.isArray(value)) {
      return value.length > 0 || field === "uncertaintyFlags";
    }

    return value !== null && value !== undefined && String(value).length > 0;
  });
}

function packetHasForbiddenRuntimeKey(packet: MoralTradeReasoningPacket) {
  const keys = new Set(Object.keys(packet));

  return [
    "chainOfThought",
    "hiddenReasoning",
    "privateWishText",
    "contactDetails",
    "counterpartyContact",
    "rawSourceNotes",
    "autonomousOutreach",
    "globalMoralRanking",
  ].some((key) => keys.has(key));
}

function packetContainsContactLikeText(packet: MoralTradeReasoningPacket) {
  const text = JSON.stringify(packet);

  return (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
    /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(text)
  );
}

function packetHasDecisionSteps(packet: MoralTradeReasoningPacket) {
  const requiredStepKeys = MORAL_TRADE_VERIFICATION_LOOP_STEPS.map((step) => step.key);
  const packetStepKeys = packet.decisionSteps.map((step) => step.key);

  return (
    packet.decisionSteps.length === MORAL_TRADE_VERIFICATION_LOOP_STEPS.length &&
    requiredStepKeys.every((key) => packetStepKeys.includes(key)) &&
    packet.decisionSteps.every(
      (step) =>
        step.label &&
        step.detail &&
        ["pass", "needs_input", "human_review", "blocked"].includes(step.status) &&
        typeof step.blocksMatchable === "boolean",
    )
  );
}

export function validateMoralTradeReasoningPacketContract(
  contract: MoralTradeReasoningPacketContract = getMoralTradeReasoningPacketContract(),
  packets: readonly MoralTradeReasoningPacket[] = getMoralTradeReasoningPackets(),
): MoralTradeReasoningPacketContractValidation {
  const requiredSources = [...REQUIRED_CONTRACT_SOURCES];
  const packetIds = packets.map((packet) => packet.id);
  const checks = [
    reasoningPacketCheck(
      "public-packet-count",
      "Public packet count matches worked-example launch subset",
      packets.length === PUBLIC_REASONING_PACKET_COUNT &&
        contract.packetCount === packets.length &&
        packets.every((packet, index) => packet.rank === index + 1),
      `${packets.length} packet(s): ${packetIds.join(", ")}`,
    ),
    reasoningPacketCheck(
      "packet-field-shape",
      "Every packet exposes the approved structured fields",
      packets.every(packetHasRequiredFields) &&
        REQUIRED_REASONING_PACKET_FIELDS.every((field) =>
          contract.requiredPacketFields.includes(field),
        ),
      contract.requiredPacketFields.join(", "),
    ),
    reasoningPacketCheck(
      "evidence-and-uncertainty-output",
      "Packets include cited evidence rows and uncertainty flags",
      packets.every(
        (packet) =>
          packet.evidenceRows.length > 0 &&
          packet.evidenceRows.every(
            (row) => row.claim && row.citation && row.status && row.reviewerNote,
          ),
      ) && packets.some((packet) => packet.uncertaintyFlags.length > 0),
      packets
        .map(
          (packet) =>
            `${packet.id}:${packet.evidenceRows.length} evidence row(s), ${packet.uncertaintyFlags.length} uncertainty flag(s)`,
        )
        .join("; "),
    ),
    reasoningPacketCheck(
      "factor-code-and-next-step-output",
      "Packets include factor codes, reviewer scope, and a next human-controlled step",
      packets.every(
        (packet) =>
          packet.factorCodes.length >= 2 &&
          packet.factorCodes.includes("no_global_moral_ranking") &&
          packet.reviewScope.length > 0 &&
          packet.nextStep.length >= 20,
      ),
      packets.map((packet) => `${packet.id}:${packet.factorCodes.join("|")}`).join("; "),
    ),
    reasoningPacketCheck(
      "decision-step-output",
      "Packets include step-by-step pass/fail review gates",
      packets.every(packetHasDecisionSteps) &&
        contract.invariants.some((invariant) => /step-by-step decision gates/i.test(invariant)),
      packets
        .map(
          (packet) =>
            `${packet.id}:${packet.decisionSteps
              .map((step) => `${step.key}=${step.status}`)
              .join("|")}`,
        )
        .join("; "),
    ),
    reasoningPacketCheck(
      "public-link-and-contract-source",
      "Packets link only to worked examples and named public contracts",
      packets.every(
        (packet) =>
          packet.href.startsWith("/offers/examples/") &&
          requiredSources.every((source) => packet.contractSources.includes(source)),
      ) &&
        contract.sourceRoute === "/reasoning-center" &&
        contract.publicApiRoute === "/api/moral-trade/reasoning/packets",
      `${contract.sourceRoute} -> ${contract.publicApiRoute}`,
    ),
    reasoningPacketCheck(
      "privacy-and-no-hidden-reasoning",
      "Packets omit hidden reasoning and private-contact fields",
      packets.every(
        (packet) =>
          !packetHasForbiddenRuntimeKey(packet) && !packetContainsContactLikeText(packet),
      ) &&
        contract.invariants.some((invariant) => /chain-of-thought/i.test(invariant)) &&
        contract.invariants.some((invariant) => /live private offers are not exported/i.test(invariant)),
      `${contract.invariants.length} invariant(s).`,
    ),
    reasoningPacketCheck(
      "linked-contracts",
      "Reasoning packets cite review workflow and provenance contract versions",
      Boolean(contract.linkedContracts.reviewWorkflowContractVersion) &&
        contract.linkedContracts.reviewWorkflowCardCount >= 6 &&
        contract.linkedContracts.reviewWorkflowMarketplaceFactorCount >= 5 &&
        Boolean(contract.linkedContracts.provenanceSchemaVersion) &&
        contract.linkedContracts.provenanceValidationRuleCount >= 5 &&
        contract.linkedContracts.provenanceSampleBundleStatus === "pass",
      `${contract.linkedContracts.reviewWorkflowContractVersion}; ${contract.linkedContracts.provenanceSchemaVersion}`,
    ),
    reasoningPacketCheck(
      "contract-tests",
      "Reasoning packet contract test hooks are named",
      REASONING_PACKET_CONTRACT_TESTS.every((hook) =>
        contract.contractTests.includes(hook),
      ),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-reasoning-packet-contract",
    validatorVersion: MORAL_TRADE_REASONING_PACKET_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}
