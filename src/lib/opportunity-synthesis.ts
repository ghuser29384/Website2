import {
  BOTTLENECK_ATLAS_FIELDS,
  BOTTLENECK_ATLAS_REVIEWED_AT,
  BOTTLENECK_ATLAS_VERSION,
  OPPORTUNITY_SYNTHESIS_TEMPLATES,
  getAtlasField,
  getSynthesisTemplate,
  synthesisClassificationLabel,
  type OpportunitySynthesisTemplate,
} from "./bottleneck-atlas";
import {
  uniqueProfileCauses,
  type LiveNowCauseSignal,
  type LiveNowProfileSignals,
  type LiveNowRecommendation,
} from "./live-now-recommendations";
import { normalizeRecommendationText } from "./recommendation-learning";

export const OPPORTUNITY_SYNTHESIS_VERSION = "atlas-synthesis-v1";
export const SYNTHESIZED_OPPORTUNITY_PREFIX = "synth:";

export interface OpportunitySynthesisDiagnostics {
  version: typeof OPPORTUNITY_SYNTHESIS_VERSION;
  atlasVersion: typeof BOTTLENECK_ATLAS_VERSION;
  generatedAt: string;
  profileSignalCount: number;
  templatesConsidered: number;
  relevantTemplateCount: number;
  generatedCount: number;
  genericFallbackCount: number;
  privateTextSentToProvider: false;
  counterpartyClaimsMade: false;
  liveOffersCreated: false;
}

export interface SynthesizedFeedRecommendation extends LiveNowRecommendation {
  metadata: {
    origin: "platform_generated";
    synthesisVersion: typeof OPPORTUNITY_SYNTHESIS_VERSION;
    atlasVersion: typeof BOTTLENECK_ATLAS_VERSION;
    templateId: string;
    classification: string;
    moralTradeStatus: "unconfirmed";
    sensitivity: string;
    verifiedCounterparty: false;
    liveOffer: false;
  };
}

export interface OpportunitySynthesisResult {
  recommendations: SynthesizedFeedRecommendation[];
  diagnostics: OpportunitySynthesisDiagnostics;
}

interface ScoredTemplate {
  template: OpportunitySynthesisTemplate;
  signal: LiveNowCauseSignal;
  relevance: number;
  basis: string;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function slug(value: string) {
  return normalizeRecommendationText(value).replace(/\s+/g, "-").slice(0, 64) || "priority";
}

export interface ParsedSynthesizedOpportunityId {
  template: OpportunitySynthesisTemplate;
  matchedCause: string;
}

export function parseSynthesizedOpportunityId(
  value: string,
): ParsedSynthesizedOpportunityId | null {
  const normalized = value.trim();
  if (!normalized.startsWith(SYNTHESIZED_OPPORTUNITY_PREFIX)) return null;

  const payload = normalized.slice(SYNTHESIZED_OPPORTUNITY_PREFIX.length);
  const separator = payload.indexOf(":");
  if (separator <= 0 || separator === payload.length - 1) return null;

  const templateId = payload.slice(0, separator);
  const causeSlug = payload.slice(separator + 1);
  if (!causeSlug || causeSlug.length > 64 || /[\s:]/.test(causeSlug)) return null;

  const template = getSynthesisTemplate(templateId);
  if (!template) return null;
  const matchedCause = causeSlug.replace(/-/g, " ").trim();
  return matchedCause ? { template, matchedCause } : null;
}

export type SynthesizedTradeDraftRole = "first_party" | "counterparty";

export interface SynthesizedTradeDraftPrefill {
  offeredCause: string;
  requestedCause: string;
  proposedAction: string;
  requestedAction: string;
  noTradeBaseline: string;
  duration: string;
  startDate: string;
  evidenceDueDate: string;
  evidenceRule: string;
  maximumBurden: string;
  privacyScope: string;
  exitConditions: string;
  notes: string;
  voluntaryCertification: false;
}

export function isSynthesizedTradeDraftRole(value: string): value is SynthesizedTradeDraftRole {
  return value === "first_party" || value === "counterparty";
}

function draftPrompt(instruction: string, startingPoint?: string) {
  const suggestion = startingPoint?.trim()
    ? ` Suggested starting point: ${startingPoint.trim()}`
    : "";
  return `[Replace: ${instruction}.${suggestion}]`;
}

export function buildSynthesizedTradeDraftPrefill({
  template,
  matchedCause,
  role,
}: {
  template: OpportunitySynthesisTemplate;
  matchedCause: string;
  role: SynthesizedTradeDraftRole;
}): SynthesizedTradeDraftPrefill {
  const priority = matchedCause.trim().replace(/\s+/g, " ").slice(0, 120) || template.offeredCause;
  const userGives = role === "first_party" ? template.firstPartyGives : template.counterpartyGives;
  const userReceives = role === "first_party" ? template.firstPartyReceives : template.counterpartyReceives;
  const roleLabel = role === "first_party" ? "first-party side" : "counterparty side";
  const classification = synthesisClassificationLabel(template.classification);

  return {
    offeredCause: draftPrompt(
      "name the counterparty's moral priority that your proposed contribution would advance",
    ),
    requestedCause: priority,
    proposedAction: draftPrompt("state your concrete, bounded commitment", userGives),
    requestedAction: draftPrompt(
      "state the counterparty's concrete, bounded reciprocal commitment",
      userReceives,
    ),
    noTradeBaseline: draftPrompt(
      "replace this field-level hypothesis with a dated account of what both sides would actually do without the trade",
      template.noTradeBaseline,
    ),
    duration: draftPrompt("state a bounded duration or completion date"),
    startDate: "",
    evidenceDueDate: "",
    evidenceRule: draftPrompt(
      "specify evidence and an authorized verifier for the binding need, available capacity, additionality, consent, and each completion milestone",
    ),
    maximumBurden: draftPrompt(
      "state a hard cap covering direct cost, management, backfill, recruitment, transition, lost output, legal or administrative cost, and risk",
    ),
    privacyScope:
      "Keep identities, organization-specific bottlenecks, staff availability, internal evidence, and contact details private until every authorized party approves disclosure. Publish only explicitly approved outcome metadata.",
    exitConditions: draftPrompt(
      "state withdrawal, amendment, pause, dispute, and termination rules; withdrawal before terms freeze must carry no reputational penalty",
    ),
    notes: [
      `Generated from Bottleneck Atlas ${BOTTLENECK_ATLAS_VERSION}: ${template.title}.`,
      `Drafting role: ${roleLabel}. Classification hypothesis: ${classification}.`,
      "No named counterparty is confirmed, no consent or authority is inferred, and this draft is not a live offer or agreement.",
      "Do not apply the moral-trade label unless differences in moral priorities materially create the deal and both sides attest to that fact.",
      `Candidate structures: ${template.candidateStructures.join("; ")}.`,
      `Validation questions: ${template.validationQuestions.join(" ")}`,
      `Safety checks: ${template.safetyChecks.join(" ")}`,
    ].join("\n\n"),
    voluntaryCertification: false,
  };
}

function tokens(value: string) {
  return new Set(normalizeRecommendationText(value).split(/\s+/).filter(Boolean));
}

function phraseScore(left: string, right: string) {
  const a = normalizeRecommendationText(left);
  const b = normalizeRecommendationText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `)) return 0.86;
  const leftTokens = tokens(a);
  const rightTokens = tokens(b);
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  if (!overlap) return 0;
  return clamp((overlap / Math.max(leftTokens.size, rightTokens.size)) * 0.72);
}

function effectiveSignals(profile: Pick<LiveNowProfileSignals, "causes" | "causeSignals">) {
  if (profile.causeSignals?.length) {
    return profile.causeSignals
      .filter((signal) => signal.cause.trim())
      .map((signal) => ({ ...signal, weight: Math.max(1, Math.min(100, signal.weight)) }))
      .sort((left, right) => right.weight - left.weight || left.cause.localeCompare(right.cause));
  }
  return profile.causes
    .filter(Boolean)
    .map((cause, index) => ({
      cause,
      weight: Math.max(30, 100 - index * 12),
      source: "profile_priority" as const,
      rank: index + 1,
    }));
}

function templateSearchTerms(template: OpportunitySynthesisTemplate) {
  const fieldTerms = template.sourceFieldIds.flatMap((fieldId) => {
    const field = getAtlasField(fieldId);
    return field ? [field.name, ...field.aliases] : [];
  });
  return [...template.triggerTerms, ...fieldTerms];
}

function isGenericTemplate(template: OpportunitySynthesisTemplate) {
  return template.generic === true;
}

function scoreTemplate(
  template: OpportunitySynthesisTemplate,
  signals: readonly LiveNowCauseSignal[],
): ScoredTemplate | null {
  const topSignal = signals[0];
  if (!topSignal) return null;

  if (template.triggerTerms.includes("*")) {
    const genericOrder = OPPORTUNITY_SYNTHESIS_TEMPLATES
      .filter((candidate) => isGenericTemplate(candidate))
      .findIndex((candidate) => candidate.id === template.id);
    return {
      template,
      signal: topSignal,
      relevance: clamp(0.42 + topSignal.weight / 250 - Math.max(0, genericOrder) * 0.025),
      basis: `${topSignal.cause} is your strongest current declared priority`,
    };
  }

  const terms = templateSearchTerms(template);
  let best: ScoredTemplate | null = null;
  for (const signal of signals) {
    const semantic = Math.max(0, ...terms.map((term) => phraseScore(signal.cause, term)));
    if (semantic <= 0) continue;
    const relevance = clamp(semantic * 0.76 + (signal.weight / 100) * 0.24);
    if (!best || relevance > best.relevance) {
      best = {
        template,
        signal,
        relevance,
        basis: `${signal.cause} overlaps the atlas evidence for ${template.title}`,
      };
    }
  }
  return best && best.relevance >= 0.34 ? best : null;
}

function fieldCauses(template: OpportunitySynthesisTemplate) {
  return template.sourceFieldIds
    .map((fieldId) => getAtlasField(fieldId)?.name ?? "")
    .filter(Boolean);
}

function personalizedOfferedCause(template: OpportunitySynthesisTemplate, matchedCause: string) {
  if (template.id === "professional-time-for-cause-funding") {
    return `Turn a useful skill into support for ${matchedCause}`;
  }
  if (template.id === "reciprocal-donation-redirect") {
    return `Increase support for ${matchedCause} through a reciprocal redirect`;
  }
  if (template.id === "moral-public-good-cofund") {
    return `Coordinate a potential public good for ${matchedCause}`;
  }
  return template.offeredCause;
}

function modeForTemplate(template: OpportunitySynthesisTemplate) {
  return template.id === "reciprocal-donation-redirect" ? "offset" as const : "pledge" as const;
}

function opportunityTypeForTemplate(template: OpportunitySynthesisTemplate) {
  return template.id === "reciprocal-donation-redirect"
    ? "donation_redirect" as const
    : "offer" as const;
}

function buildRecommendation(item: ScoredTemplate, now: Date): SynthesizedFeedRecommendation {
  const { template, signal, relevance, basis } = item;
  const offeredCause = personalizedOfferedCause(template, signal.cause);
  const fieldNames = fieldCauses(template);
  const confidence = clamp((template.confidence / 100) * 0.72 + relevance * 0.28);
  const difficulty = template.sensitivity === "restricted" ? 4.4 : template.sensitivity === "elevated" ? 3.5 : 2.8;
  const difficultyLabel = difficulty >= 4 ? "Hard" as const : difficulty >= 2.4 ? "Moderate" as const : "Easy" as const;
  const id = `synth:${template.id}:${slug(signal.cause)}`;
  const query = new URLSearchParams({ cause: signal.cause, source: "feed" });
  const classification = synthesisClassificationLabel(template.classification);
  const safetySummary = template.safetyChecks[0] ?? "Complete the standard safety review.";

  return {
    id,
    ownerId: "platform:opportunity-synthesis",
    ownerAlias: "Potential opportunity — no counterparty has agreed",
    mode: modeForTemplate(template),
    offeredCause,
    requestedCause: template.requestedCause,
    compromiseCause: classification,
    offerAction: template.firstPartyReceives,
    requestAction: `Review whether you could offer: ${template.firstPartyGives}`,
    verification:
      "Unconfirmed synthesis. Verify the need, available capacity, authority, no-trade baseline, full opportunity cost, staff consent, and third-party effects before any introduction.",
    duration: `Exploration only · atlas reviewed ${BOTTLENECK_ATLAS_REVIEWED_AT}`,
    trustLevel: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sourceRevision: 1,
    opportunityType: opportunityTypeForTemplate(template),
    href: `/suggested-opportunities/${encodeURIComponent(template.id)}?${query.toString()}`,
    ctaLabel: "Review potential trade",
    sourceLabel: "Bottleneck Atlas suggestion",
    summary: template.summary,
    benefitCauses: uniqueProfileCauses([signal.cause], [offeredCause], fieldNames),
    actionCauses: uniqueProfileCauses([template.requestedCause], fieldNames),
    actionKey: `synthesis:${template.id}`,
    actionLabel: "Review and correct assumptions",
    defaultDifficulty: difficulty,
    metadata: {
      origin: "platform_generated",
      synthesisVersion: OPPORTUNITY_SYNTHESIS_VERSION,
      atlasVersion: BOTTLENECK_ATLAS_VERSION,
      templateId: template.id,
      classification: template.classification,
      moralTradeStatus: "unconfirmed",
      sensitivity: template.sensitivity,
      verifiedCounterparty: false,
      liveOffer: false,
    },
    matchCause: signal.cause,
    matchCauseSource: signal.source,
    actionCauseMatch: template.requestedCause,
    reason: "Potential opportunity generated from the Bottleneck Atlas",
    reasonDetails: [
      "No counterparty has agreed to this. It is a generated hypothesis, not a live offer or verified match.",
      `Why it appeared: ${basis}.`,
      `${classification}; the moral-trade label remains unconfirmed until the parties attest that differences in moral priorities materially create the deal.`,
      `Current evidence confidence: ${template.confidence}/100. ${template.evidenceLabel}`,
      `First safety gate: ${safetySummary}`,
      "Use the detail page to review the no-trade baseline, candidate structures, assumptions, and externality checks before creating or sharing anything.",
    ],
    score: round(confidence * 100),
    difficulty,
    difficultyLabel,
    willingness: Math.round(clamp(0.38 + relevance * 0.28) * 100),
    actionFitLabel: relevance >= 0.72 ? "Strong fit" : relevance >= 0.46 ? "Possible fit" : "Stretch",
    learnedActionSignalCount: 0,
    saved: false,
    scoreBreakdown: {
      benefit: round(relevance * 100),
      actionCause: round(relevance * 40),
      actionFit: round((relevance - 0.5) * 40),
      difficultyPenalty: round((difficulty - 1) * 4),
      recency: 12,
      quality: round(template.confidence / 12.5),
      trust: 0,
      saved: 0,
    },
  };
}

export function isOpportunitySynthesisEnabled(
  environment: Record<string, string | undefined> = process.env,
) {
  return environment.OPPORTUNITY_SYNTHESIS_ENABLED?.trim().toLowerCase() !== "false";
}

export function synthesizeBottleneckAtlasRecommendations({
  profile,
  now = new Date(),
  limit = 6,
}: {
  profile: Pick<LiveNowProfileSignals, "causes" | "causeSignals">;
  now?: Date;
  limit?: number;
}): OpportunitySynthesisResult {
  const signals = effectiveSignals(profile);
  const scored = OPPORTUNITY_SYNTHESIS_TEMPLATES
    .map((template) => scoreTemplate(template, signals))
    .filter((item): item is ScoredTemplate => Boolean(item))
    .sort((left, right) =>
      Number(isGenericTemplate(left.template)) - Number(isGenericTemplate(right.template)) ||
      right.relevance - left.relevance ||
      right.template.confidence - left.template.confidence ||
      left.template.id.localeCompare(right.template.id),
    );

  const selected: ScoredTemplate[] = [];
  const usedSourceFields = new Set<string>();
  for (const item of scored) {
    if (selected.length >= Math.max(0, Math.min(8, limit))) break;
    if (!isGenericTemplate(item.template)) {
      const sourceOverlap = item.template.sourceFieldIds.some((fieldId) => usedSourceFields.has(fieldId));
      if (sourceOverlap && selected.filter((candidate) => !isGenericTemplate(candidate.template)).length >= 2) continue;
      item.template.sourceFieldIds.forEach((fieldId) => usedSourceFields.add(fieldId));
    }
    selected.push(item);
  }

  const recommendations = selected.map((item) => buildRecommendation(item, now));
  return {
    recommendations,
    diagnostics: {
      version: OPPORTUNITY_SYNTHESIS_VERSION,
      atlasVersion: BOTTLENECK_ATLAS_VERSION,
      generatedAt: now.toISOString(),
      profileSignalCount: signals.length,
      templatesConsidered: OPPORTUNITY_SYNTHESIS_TEMPLATES.length,
      relevantTemplateCount: scored.length,
      generatedCount: recommendations.length,
      genericFallbackCount: selected.filter((item) => isGenericTemplate(item.template)).length,
      privateTextSentToProvider: false,
      counterpartyClaimsMade: false,
      liveOffersCreated: false,
    },
  };
}

export function mergeExistingAndSynthesizedRecommendations<
  Existing extends { id: string },
  Synthesized extends { id: string },
>(
  existing: readonly Existing[],
  synthesized: readonly Synthesized[],
  limit = 12,
): Array<Existing | Synthesized> {
  const maximum = Math.max(0, Math.min(24, limit));
  if (!maximum) return [];
  if (!synthesized.length) return [...existing].slice(0, maximum);
  if (!existing.length) return [...synthesized].slice(0, Math.min(maximum, 5));

  const selected: Array<Existing | Synthesized> = [];
  const seen = new Set<string>();
  const add = (item: Existing | Synthesized | undefined) => {
    if (!item || seen.has(item.id) || selected.length >= maximum) return;
    seen.add(item.id);
    selected.push(item);
  };
  const synthesisCap = Math.min(3, synthesized.length);
  let synthesisIndex = 0;
  const insertionAfterExisting = new Set([2, 5, 8]);

  existing.forEach((item, index) => {
    add(item);
    if (insertionAfterExisting.has(index + 1) && synthesisIndex < synthesisCap) {
      add(synthesized[synthesisIndex]);
      synthesisIndex += 1;
    }
  });
  while (synthesisIndex < synthesisCap && selected.length < maximum) {
    add(synthesized[synthesisIndex]);
    synthesisIndex += 1;
  }
  for (const item of existing) add(item);
  return selected.slice(0, maximum);
}

export function publicOpportunitySynthesisCatalog() {
  return {
    version: OPPORTUNITY_SYNTHESIS_VERSION,
    atlasVersion: BOTTLENECK_ATLAS_VERSION,
    reviewedAt: BOTTLENECK_ATLAS_REVIEWED_AT,
    fields: BOTTLENECK_ATLAS_FIELDS.map((field) => ({
      id: field.id,
      name: field.name,
      cluster: field.cluster,
      aliases: field.aliases,
      confidence: field.confidence,
      sensitivity: field.sensitivity,
    })),
    templates: OPPORTUNITY_SYNTHESIS_TEMPLATES.map((template) => ({
      id: template.id,
      title: template.title,
      classification: template.classification,
      actorScopes: template.actorScopes,
      sourceFieldIds: template.sourceFieldIds,
      confidence: template.confidence,
      sensitivity: template.sensitivity,
      generic: isGenericTemplate(template),
    })),
  };
}
