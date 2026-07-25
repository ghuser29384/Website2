import { randomUUID } from "node:crypto";

import {
  DEFAULT_PARETO_THRESHOLDS,
  EMPTY_HEAD,
  PARETO_EXPERIMENT_KEY,
  PARETO_MODEL_VERSION,
  clamp,
  fitImplicitFactors,
  fitLogisticHead,
  inversePropensityDifference,
  predictParetoModel,
  round,
  tuneParetoSuccessThreshold,
  type BinaryTrainingExample,
  type ImplicitEdge,
  type ParetoFeatureSnapshot,
  type ParetoHeadKey,
  type ParetoModelArtifact,
} from "./pareto-recommendation-model";
import { createServiceClient } from "./supabase/server";

const TRAINING_WINDOW_DAYS = 365;
const MAX_EXPOSURES = 20_000;
const MAX_INTERACTIONS = 40_000;
const ACTIVATION_GATES = {
  exposureCount: 1_000,
  profileCount: 50,
  opportunityCount: 100,
  positiveCompletionCount: 30,
  feedbackCount: 40,
  maximumCoreBrier: 0.24,
} as const;

interface ExposureRow {
  assignment_arm: string;
  feature_snapshot: unknown;
  id: string;
  joint_propensity: number | string;
  match_class: string;
  occurred_at: string;
  opportunity_id: string;
  opportunity_type: string;
  owner_id: string | null;
  profile_id: string;
  was_shown: boolean;
}

interface InteractionRow {
  event_type: string;
  opportunity_id: string;
  opportunity_type: string;
  profile_id: string;
  occurred_at: string;
}

interface InterestRow {
  offer_id: string;
  status: string;
  user_id: string;
  created_at: string;
}

interface AgreementRow {
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  id: string;
  lifecycle_status: string;
  offer_id: string;
  proposer_id: string;
  responder_id: string;
  status: string;
}

interface ThreadRow {
  agreement_id: string | null;
  id: string;
  offer_id: string;
}

interface EvidenceRow {
  agreement_id: string;
  status: string;
}

interface CompletionConfirmationRow {
  agreement_id: string;
  user_id: string;
}

interface ReportRow {
  status: string;
  thread_id: string;
}

interface FeedbackRow {
  agreement_id: string;
  externality_concern: string;
  own_lights_gain: number;
  profile_id: string;
  satisfaction: number;
  would_happen_without_trade_percent: number;
}

interface RatingRow {
  agreement_id: string;
  score: number;
}

interface OfferRow {
  id: string;
  owner_id: string;
}

interface TrainingData {
  agreements: AgreementRow[];
  completionConfirmations: CompletionConfirmationRow[];
  evidence: EvidenceRow[];
  exposures: ExposureRow[];
  feedback: FeedbackRow[];
  interactions: InteractionRow[];
  interests: InterestRow[];
  offers: OfferRow[];
  ratings: RatingRow[];
  reports: ReportRow[];
  threads: ThreadRow[];
}

interface ReconciledOutcome {
  accepted: boolean;
  additionalityScore: number | null;
  ageDays: number;
  cancellation: boolean;
  completed: boolean;
  counterpartyGainPositive: boolean | null;
  exposure: ExposureRow;
  externalitySafe: boolean | null;
  feedbackCount: number;
  proposed: boolean;
  reportCount: number;
  satisfactionScore: number | null;
  verifiedCompletion: boolean;
  viewerGainPositive: boolean | null;
  agreementId: string | null;
}

interface GuardrailSnapshot {
  averageSatisfaction: number | null;
  cancellationRate: number;
  exposureCount: number;
  reasons: string[];
  reportRate: number;
  stopExperiment: boolean;
}

interface HeadExamples {
  additionality: BinaryTrainingExample[];
  counterpartyAcceptance: BinaryTrainingExample[];
  counterpartyGain: BinaryTrainingExample[];
  externalitySafety: BinaryTrainingExample[];
  satisfaction: BinaryTrainingExample[];
  userAcceptance: BinaryTrainingExample[];
  verifiedCompletion: BinaryTrainingExample[];
  viewerGain: BinaryTrainingExample[];
}

function nowIso() {
  return new Date().toISOString();
}

function opportunityKey(type: string, id: string) {
  return `${type || "offer"}:${id}`;
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBooleanLabel(value: boolean | null) {
  return value === null ? null : value ? 1 as const : 0 as const;
}

function safeFeatureSnapshot(value: unknown): ParetoFeatureSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result: Partial<ParetoFeatureSnapshot> = {};
  const keys: Array<keyof ParetoFeatureSnapshot> = [
    "substantive_compatibility",
    "base_user_acceptance",
    "base_counterparty_acceptance",
    "base_completion",
    "reciprocal_score",
    "difficulty_inverse",
    "willingness",
    "trust",
    "public_quality",
    "saved",
    "direct_prior",
    "near_prior",
    "collaborative_affinity",
    "graph_affinity",
    "owner_acceptance_prior",
    "owner_completion_prior",
  ];
  for (const key of keys) result[key] = clamp(asNumber(source[key]));
  return result as ParetoFeatureSnapshot;
}

function interactionWeight(eventType: string) {
  switch (eventType) {
    case "impression":
      return 0.05;
    case "open":
      return 0.45;
    case "dwell":
      return 0.65;
    case "save":
      return 2;
    case "unsave":
      return -1;
    case "hide":
      return -3;
    case "not_for_me":
      return -4;
    case "easy":
      return 0.8;
    case "hard":
      return -0.45;
    case "propose":
      return 4;
    case "accept":
      return 6;
    case "complete":
      return 8;
    default:
      return 0;
  }
}

async function loadTrainingData(service: any, cutoff: string): Promise<TrainingData> {
  const [
    exposures,
    interactions,
    interests,
    agreements,
    threads,
    evidence,
    completionConfirmations,
    reports,
    feedback,
    ratings,
    offers,
  ] = await Promise.all([
    service
      .from("recommendation_exposures")
      .select(
        "id,profile_id,opportunity_type,opportunity_id,owner_id,match_class,was_shown,feature_snapshot,assignment_arm,joint_propensity,occurred_at",
      )
      .gte("occurred_at", cutoff)
      .order("occurred_at", { ascending: false })
      .limit(MAX_EXPOSURES),
    service
      .from("recommendation_interactions")
      .select("profile_id,opportunity_type,opportunity_id,event_type,occurred_at")
      .gte("occurred_at", cutoff)
      .order("occurred_at", { ascending: false })
      .limit(MAX_INTERACTIONS),
    service
      .from("interests")
      .select("user_id,offer_id,status,created_at")
      .gte("created_at", cutoff)
      .limit(10_000),
    service
      .from("agreements")
      .select(
        "id,offer_id,proposer_id,responder_id,status,lifecycle_status,created_at,completed_at,cancelled_at",
      )
      .gte("created_at", cutoff)
      .limit(10_000),
    service
      .from("trade_threads")
      .select("id,offer_id,agreement_id")
      .limit(10_000),
    service
      .from("trade_evidence_items")
      .select("agreement_id,status")
      .limit(20_000),
    service
      .from("trade_completion_confirmations")
      .select("agreement_id,user_id")
      .limit(20_000),
    service
      .from("trade_reports")
      .select("thread_id,status")
      .gte("created_at", cutoff)
      .limit(10_000),
    service
      .from("recommendation_outcome_feedback")
      .select(
        "agreement_id,profile_id,own_lights_gain,satisfaction,would_happen_without_trade_percent,externality_concern",
      )
      .limit(20_000),
    service
      .from("agreement_ratings")
      .select("agreement_id,score")
      .gte("created_at", cutoff)
      .limit(20_000),
    service.from("offers").select("id,owner_id").limit(20_000),
  ]);
  const results = {
    exposures,
    interactions,
    interests,
    agreements,
    threads,
    evidence,
    completionConfirmations,
    reports,
    feedback,
    ratings,
    offers,
  };
  for (const [label, result] of Object.entries(results)) {
    if (result.error) throw new Error(`Training data query failed for ${label}: ${result.error.message}`);
  }
  return {
    exposures: (exposures.data ?? []) as ExposureRow[],
    interactions: (interactions.data ?? []) as InteractionRow[],
    interests: (interests.data ?? []) as InterestRow[],
    agreements: (agreements.data ?? []) as AgreementRow[],
    threads: (threads.data ?? []) as ThreadRow[],
    evidence: (evidence.data ?? []) as EvidenceRow[],
    completionConfirmations: (completionConfirmations.data ?? []) as CompletionConfirmationRow[],
    reports: (reports.data ?? []) as ReportRow[],
    feedback: (feedback.data ?? []) as FeedbackRow[],
    ratings: (ratings.data ?? []) as RatingRow[],
    offers: (offers.data ?? []) as OfferRow[],
  };
}

function reconcileOutcomes(data: TrainingData, now: Date): ReconciledOutcome[] {
  const offerOwner = new Map(data.offers.map((offer) => [offer.id, offer.owner_id]));
  const agreementsByOffer = new Map<string, AgreementRow[]>();
  data.agreements.forEach((agreement) => {
    const list = agreementsByOffer.get(agreement.offer_id) ?? [];
    list.push(agreement);
    agreementsByOffer.set(agreement.offer_id, list);
  });
  const threadsByAgreement = new Map<string, ThreadRow>();
  data.threads.forEach((thread) => {
    if (thread.agreement_id) threadsByAgreement.set(thread.agreement_id, thread);
  });
  const acceptedEvidence = new Map<string, number>();
  data.evidence.forEach((item) => {
    if (item.status !== "accepted") return;
    acceptedEvidence.set(item.agreement_id, (acceptedEvidence.get(item.agreement_id) ?? 0) + 1);
  });
  const completionConfirmations = new Map<string, Set<string>>();
  data.completionConfirmations.forEach((item) => {
    const set = completionConfirmations.get(item.agreement_id) ?? new Set<string>();
    set.add(item.user_id);
    completionConfirmations.set(item.agreement_id, set);
  });
  const reportsByThread = new Map<string, number>();
  data.reports.forEach((report) => {
    if (report.status === "dismissed" || report.status === "resolved_no_action") return;
    reportsByThread.set(report.thread_id, (reportsByThread.get(report.thread_id) ?? 0) + 1);
  });
  const feedbackByAgreement = new Map<string, FeedbackRow[]>();
  data.feedback.forEach((feedback) => {
    const list = feedbackByAgreement.get(feedback.agreement_id) ?? [];
    list.push(feedback);
    feedbackByAgreement.set(feedback.agreement_id, list);
  });
  const ratingsByAgreement = new Map<string, number[]>();
  data.ratings.forEach((rating) => {
    const list = ratingsByAgreement.get(rating.agreement_id) ?? [];
    list.push(clamp(Number(rating.score) / 5));
    ratingsByAgreement.set(rating.agreement_id, list);
  });
  const interests = new Set(
    data.interests
      .filter((interest) => interest.status !== "withdrawn")
      .map((interest) => `${interest.user_id}:${interest.offer_id}`),
  );
  const interactionEvents = new Map<string, InteractionRow[]>();
  data.interactions.forEach((interaction) => {
    const key = `${interaction.profile_id}:${opportunityKey(
      interaction.opportunity_type,
      interaction.opportunity_id,
    )}`;
    const list = interactionEvents.get(key) ?? [];
    list.push(interaction);
    interactionEvents.set(key, list);
  });

  return data.exposures.map((exposure) => {
    const exposureAt = Date.parse(exposure.occurred_at);
    const ageDays = Number.isFinite(exposureAt)
      ? Math.max(0, (now.getTime() - exposureAt) / 86_400_000)
      : TRAINING_WINDOW_DAYS;
    const events = interactionEvents.get(
      `${exposure.profile_id}:${opportunityKey(exposure.opportunity_type, exposure.opportunity_id)}`,
    ) ?? [];
    const laterEvents = events.filter((event) => Date.parse(event.occurred_at) >= exposureAt);
    const proposedFromEvent = laterEvents.some((event) => event.event_type === "propose");
    const proposedFromInterest =
      exposure.opportunity_type !== "donation_pool" &&
      interests.has(`${exposure.profile_id}:${exposure.opportunity_id}`);
    const proposed = proposedFromEvent || proposedFromInterest;
    const possibleAgreements = agreementsByOffer.get(exposure.opportunity_id) ?? [];
    const agreement = possibleAgreements.find(
      (item) => item.proposer_id === exposure.profile_id || item.responder_id === exposure.profile_id,
    ) ?? null;
    const accepted = Boolean(agreement);
    const completed = Boolean(
      agreement &&
        (agreement.lifecycle_status === "completed" || agreement.status === "completed" || agreement.completed_at),
    );
    const confirmations = agreement
      ? completionConfirmations.get(agreement.id)?.size ?? 0
      : 0;
    const verifiedCompletion = Boolean(
      agreement && completed && (acceptedEvidence.get(agreement.id) ?? 0) > 0 && confirmations >= 2,
    );
    const feedback = agreement ? feedbackByAgreement.get(agreement.id) ?? [] : [];
    const viewerFeedback = feedback.find((item) => item.profile_id === exposure.profile_id) ?? null;
    const counterpartyFeedback = feedback.find((item) => item.profile_id !== exposure.profile_id) ?? null;
    const viewerGainPositive = viewerFeedback ? viewerFeedback.own_lights_gain >= 4 : null;
    const counterpartyGainPositive = counterpartyFeedback
      ? counterpartyFeedback.own_lights_gain >= 4
      : null;
    const additionalityValues = feedback.map((item) =>
      clamp(1 - Number(item.would_happen_without_trade_percent) / 100),
    );
    const additionalityScore = additionalityValues.length
      ? additionalityValues.reduce((sum, value) => sum + value, 0) / additionalityValues.length
      : null;
    const satisfactionValues = [
      ...feedback.map((item) => clamp(Number(item.satisfaction) / 5)),
      ...(agreement ? ratingsByAgreement.get(agreement.id) ?? [] : []),
    ];
    const satisfactionScore = satisfactionValues.length
      ? satisfactionValues.reduce((sum, value) => sum + value, 0) / satisfactionValues.length
      : null;
    const thread = agreement ? threadsByAgreement.get(agreement.id) : null;
    const reportCount = thread ? reportsByThread.get(thread.id) ?? 0 : 0;
    const concerns = feedback.map((item) => item.externality_concern);
    const externalitySafe = completed || feedback.length || reportCount
      ? reportCount === 0 && concerns.every((value) => value === "none" || value === "low")
      : null;
    const cancellation = Boolean(
      agreement &&
        (agreement.lifecycle_status === "cancelled" || agreement.status === "cancelled" || agreement.cancelled_at),
    );
    if (!exposure.owner_id && exposure.opportunity_type !== "donation_pool") {
      exposure.owner_id = offerOwner.get(exposure.opportunity_id) ?? null;
    }
    return {
      accepted,
      additionalityScore,
      ageDays,
      agreementId: agreement?.id ?? null,
      cancellation,
      completed,
      counterpartyGainPositive,
      exposure,
      externalitySafe,
      feedbackCount: feedback.length,
      proposed,
      reportCount,
      satisfactionScore,
      verifiedCompletion,
      viewerGainPositive,
    };
  });
}

async function persistOutcomes(service: any, outcomes: readonly ReconciledOutcome[]) {
  if (!outcomes.length) return;
  const reconciledAt = nowIso();
  const rows = outcomes.map((outcome) => ({
    exposure_id: outcome.exposure.id,
    profile_id: outcome.exposure.profile_id,
    opportunity_type: outcome.exposure.opportunity_type,
    opportunity_id: outcome.exposure.opportunity_id,
    owner_id: outcome.exposure.owner_id,
    agreement_id: outcome.agreementId,
    proposed: outcome.proposed,
    accepted: outcome.accepted,
    completed: outcome.completed,
    verified_completion: outcome.verifiedCompletion,
    viewer_gain_positive: outcome.viewerGainPositive,
    counterparty_gain_positive: outcome.counterpartyGainPositive,
    additionality_score: outcome.additionalityScore,
    satisfaction_score: outcome.satisfactionScore,
    externality_safe: outcome.externalitySafe,
    report_count: outcome.reportCount,
    cancellation: outcome.cancellation,
    label_available:
      outcome.ageDays >= 7 ||
      outcome.proposed ||
      outcome.accepted ||
      outcome.completed ||
      outcome.feedbackCount > 0,
    reconciled_at: reconciledAt,
  }));
  for (let offset = 0; offset < rows.length; offset += 250) {
    const result = await service.from("recommendation_outcomes").upsert(rows.slice(offset, offset + 250), {
      onConflict: "exposure_id",
    });
    if (result.error) throw result.error;
  }
}

function aggregateEdges(data: TrainingData, outcomes: readonly ReconciledOutcome[]) {
  const map = new Map<
    string,
    {
      lastEventAt: string;
      negative: number;
      opportunityKey: string;
      positive: number;
      profileId: string;
      weight: number;
    }
  >();
  const add = (profileId: string, key: string, weight: number, occurredAt: string) => {
    if (!profileId || !key || !weight) return;
    const mapKey = `${profileId}:${key}`;
    const current = map.get(mapKey) ?? {
      lastEventAt: occurredAt,
      negative: 0,
      opportunityKey: key,
      positive: 0,
      profileId,
      weight: 0,
    };
    current.weight += weight;
    if (weight > 0) current.positive += weight;
    else current.negative += Math.abs(weight);
    if (Date.parse(occurredAt) > Date.parse(current.lastEventAt)) current.lastEventAt = occurredAt;
    map.set(mapKey, current);
  };
  data.interactions.forEach((interaction) => {
    if (interaction.opportunity_type === "cause_topic") return;
    add(
      interaction.profile_id,
      opportunityKey(interaction.opportunity_type, interaction.opportunity_id),
      interactionWeight(interaction.event_type),
      interaction.occurred_at,
    );
  });
  outcomes.forEach((outcome) => {
    const key = opportunityKey(outcome.exposure.opportunity_type, outcome.exposure.opportunity_id);
    if (outcome.proposed) add(outcome.exposure.profile_id, key, 4, outcome.exposure.occurred_at);
    if (outcome.accepted) add(outcome.exposure.profile_id, key, 6, outcome.exposure.occurred_at);
    if (outcome.verifiedCompletion) add(outcome.exposure.profile_id, key, 8, outcome.exposure.occurred_at);
    if (outcome.viewerGainPositive === true) add(outcome.exposure.profile_id, key, 3, outcome.exposure.occurred_at);
    if (outcome.viewerGainPositive === false) add(outcome.exposure.profile_id, key, -4, outcome.exposure.occurred_at);
    if (outcome.cancellation) add(outcome.exposure.profile_id, key, -3, outcome.exposure.occurred_at);
    if (outcome.reportCount) add(outcome.exposure.profile_id, key, -4 * outcome.reportCount, outcome.exposure.occurred_at);
  });
  return [...map.values()];
}

async function persistGraphEdges(service: any, edges: ReturnType<typeof aggregateEdges>) {
  if (!edges.length) return;
  const rows = edges.map((edge) => ({
    profile_id: edge.profileId,
    opportunity_key: edge.opportunityKey,
    aggregate_weight: round(edge.weight, 5),
    positive_weight: round(edge.positive, 5),
    negative_weight: round(edge.negative, 5),
    observation_count: 1,
    last_event_at: edge.lastEventAt,
    updated_at: nowIso(),
  }));
  for (let offset = 0; offset < rows.length; offset += 250) {
    const result = await service.from("recommendation_graph_edges").upsert(rows.slice(offset, offset + 250), {
      onConflict: "profile_id,opportunity_key",
    });
    if (result.error) throw result.error;
  }
}

function buildHeadExamples(outcomes: readonly ReconciledOutcome[]): HeadExamples {
  const result: HeadExamples = {
    additionality: [],
    counterpartyAcceptance: [],
    counterpartyGain: [],
    externalitySafety: [],
    satisfaction: [],
    userAcceptance: [],
    verifiedCompletion: [],
    viewerGain: [],
  };
  const add = (
    key: keyof HeadExamples,
    outcome: ReconciledOutcome,
    label: 0 | 1 | null,
    weight = 1,
  ) => {
    const features = safeFeatureSnapshot(outcome.exposure.feature_snapshot);
    if (!features || label === null) return;
    result[key].push({ features, id: outcome.exposure.id, label, weight });
  };
  outcomes.forEach((outcome) => {
    add(
      "userAcceptance",
      outcome,
      outcome.proposed || outcome.ageDays >= 7 ? (outcome.proposed ? 1 : 0) : null,
    );
    add(
      "counterpartyAcceptance",
      outcome,
      outcome.proposed ? (outcome.accepted ? 1 : 0) : null,
    );
    add(
      "verifiedCompletion",
      outcome,
      outcome.accepted && (outcome.verifiedCompletion || outcome.ageDays >= 45)
        ? outcome.verifiedCompletion
          ? 1
          : 0
        : null,
    );
    add("viewerGain", outcome, asBooleanLabel(outcome.viewerGainPositive));
    add("counterpartyGain", outcome, asBooleanLabel(outcome.counterpartyGainPositive));
    add(
      "additionality",
      outcome,
      outcome.additionalityScore === null ? null : outcome.additionalityScore >= 0.5 ? 1 : 0,
    );
    add("externalitySafety", outcome, asBooleanLabel(outcome.externalitySafe));
    add(
      "satisfaction",
      outcome,
      outcome.satisfactionScore === null ? null : outcome.satisfactionScore >= 0.7 ? 1 : 0,
    );
  });
  return result;
}

function platformPriors(outcomes: readonly ReconciledOutcome[]) {
  const proposed = outcomes.filter((outcome) => outcome.proposed);
  const accepted = proposed.filter((outcome) => outcome.accepted);
  return {
    acceptance: clamp(
      (accepted.length + 2) / Math.max(4, proposed.length + 4),
      0.05,
      0.95,
    ),
    completion: clamp(
      (accepted.filter((outcome) => outcome.verifiedCompletion).length + 2) /
        Math.max(4, accepted.length + 4),
      0.05,
      0.95,
    ),
  };
}

function fitArtifact(examples: HeadExamples, outcomes: readonly ReconciledOutcome[], trainedAt: string) {
  const heads = Object.fromEntries(
    (Object.keys(examples) as ParetoHeadKey[]).map((key) => [key, fitLogisticHead(examples[key])]),
  ) as ParetoModelArtifact["heads"];
  const priors = platformPriors(outcomes);
  const provisional: ParetoModelArtifact = {
    featureKeys: [
      "substantive_compatibility",
      "base_user_acceptance",
      "base_counterparty_acceptance",
      "base_completion",
      "reciprocal_score",
      "difficulty_inverse",
      "willingness",
      "trust",
      "public_quality",
      "saved",
      "direct_prior",
      "near_prior",
      "collaborative_affinity",
      "graph_affinity",
      "owner_acceptance_prior",
      "owner_completion_prior",
    ],
    heads,
    modelVersion: PARETO_MODEL_VERSION,
    platformPriors: priors,
    thresholds: { ...DEFAULT_PARETO_THRESHOLDS },
    trainedAt,
  };
  const fullLabelRows = outcomes.flatMap((outcome) => {
    const features = safeFeatureSnapshot(outcome.exposure.feature_snapshot);
    if (
      !features ||
      !outcome.verifiedCompletion ||
      outcome.viewerGainPositive === null ||
      outcome.counterpartyGainPositive === null ||
      outcome.additionalityScore === null ||
      outcome.externalitySafe === null
    ) {
      return [];
    }
    const prediction = predictParetoModel(provisional, features);
    const label =
      outcome.verifiedCompletion &&
      outcome.viewerGainPositive &&
      outcome.counterpartyGainPositive &&
      outcome.additionalityScore >= 0.5 &&
      outcome.externalitySafe
        ? 1
        : 0;
    return [{ label: label as 0 | 1, prediction: prediction.paretoSuccess }];
  });
  const tuned = tuneParetoSuccessThreshold(fullLabelRows);
  return {
    artifact: {
      ...provisional,
      thresholds: {
        ...provisional.thresholds,
        paretoSuccess: tuned.threshold,
      },
    },
    tuned,
  };
}

function evaluateGuardrails(outcomes: readonly ReconciledOutcome[]): GuardrailSnapshot {
  const mature = outcomes.filter((outcome) => outcome.ageDays >= 7 || outcome.proposed);
  const reportRate = mature.length
    ? mature.filter((outcome) => outcome.reportCount > 0).length / mature.length
    : 0;
  const cancellationRate = mature.length
    ? mature.filter((outcome) => outcome.cancellation).length / mature.length
    : 0;
  const satisfaction = mature
    .map((outcome) => outcome.satisfactionScore)
    .filter((value): value is number => value !== null);
  const averageSatisfaction = satisfaction.length
    ? satisfaction.reduce((sum, value) => sum + value, 0) / satisfaction.length
    : null;
  const reasons: string[] = [];
  if (mature.length >= 200 && reportRate > 0.025) reasons.push("elevated_report_rate");
  if (mature.length >= 200 && cancellationRate > 0.15) reasons.push("elevated_cancellation_rate");
  if (satisfaction.length >= 40 && (averageSatisfaction ?? 1) < 0.6) {
    reasons.push("low_participant_satisfaction");
  }
  return {
    averageSatisfaction,
    cancellationRate,
    exposureCount: mature.length,
    reasons,
    reportRate,
    stopExperiment: reasons.length > 0,
  };
}

function activationAssessment(
  artifact: ParetoModelArtifact,
  outcomes: readonly ReconciledOutcome[],
  guardrail: GuardrailSnapshot,
) {
  const profiles = new Set(outcomes.map((outcome) => outcome.exposure.profile_id));
  const opportunities = new Set(
    outcomes.map((outcome) => opportunityKey(outcome.exposure.opportunity_type, outcome.exposure.opportunity_id)),
  );
  const positiveCompletions = outcomes.filter(
    (outcome) =>
      outcome.verifiedCompletion &&
      outcome.viewerGainPositive === true &&
      outcome.counterpartyGainPositive === true,
  ).length;
  const feedbackCount = outcomes.reduce((sum, outcome) => sum + outcome.feedbackCount, 0);
  const coreHeads: ParetoHeadKey[] = [
    "userAcceptance",
    "counterpartyAcceptance",
    "verifiedCompletion",
    "viewerGain",
    "counterpartyGain",
    "additionality",
    "externalitySafety",
  ];
  const failures: string[] = [];
  if (outcomes.length < ACTIVATION_GATES.exposureCount) failures.push("insufficient_exposures");
  if (profiles.size < ACTIVATION_GATES.profileCount) failures.push("insufficient_profiles");
  if (opportunities.size < ACTIVATION_GATES.opportunityCount) failures.push("insufficient_opportunities");
  if (positiveCompletions < ACTIVATION_GATES.positiveCompletionCount) {
    failures.push("insufficient_positive_completions");
  }
  if (feedbackCount < ACTIVATION_GATES.feedbackCount) failures.push("insufficient_outcome_feedback");
  coreHeads.forEach((key) => {
    const head = artifact.heads[key] ?? EMPTY_HEAD;
    if (!head.enabled) failures.push(`${key}_head_unavailable`);
    if ((head.metrics.brier ?? 1) > ACTIVATION_GATES.maximumCoreBrier) {
      failures.push(`${key}_calibration_failed`);
    }
  });
  if (guardrail.stopExperiment) failures.push("safety_guardrail_stopped");
  const shadowReady = outcomes.length >= 100 && positiveCompletions >= 5;
  return {
    activate: failures.length === 0,
    failures: [...new Set(failures)],
    feedbackCount,
    positiveCompletions,
    profileCount: profiles.size,
    opportunityCount: opportunities.size,
    shadowReady,
  };
}

function counterpartyPriors(outcomes: readonly ReconciledOutcome[]) {
  const map = new Map<
    string,
    { acceptanceCount: number; completionCount: number; proposalCount: number; reportCount: number }
  >();
  outcomes.forEach((outcome) => {
    const ownerId = outcome.exposure.owner_id;
    if (!ownerId) return;
    const current = map.get(ownerId) ?? {
      acceptanceCount: 0,
      completionCount: 0,
      proposalCount: 0,
      reportCount: 0,
    };
    if (outcome.proposed) current.proposalCount += 1;
    if (outcome.accepted) current.acceptanceCount += 1;
    if (outcome.verifiedCompletion) current.completionCount += 1;
    current.reportCount += outcome.reportCount;
    map.set(ownerId, current);
  });
  return map;
}

async function persistModelArtifacts({
  artifact,
  collaborative,
  graph,
  modelId,
  outcomes,
  service,
}: {
  artifact: ParetoModelArtifact;
  collaborative: ReturnType<typeof fitImplicitFactors>;
  graph: ReturnType<typeof fitImplicitFactors>;
  modelId: string;
  outcomes: readonly ReconciledOutcome[];
  service: any;
}) {
  const profiles = new Set([
    ...collaborative.profileFactors.keys(),
    ...graph.profileFactors.keys(),
  ]);
  const userRows = [...profiles].map((profileId) => ({
    model_version_id: modelId,
    profile_id: profileId,
    factors: collaborative.profileFactors.get(profileId) ?? [],
    graph_factors: graph.profileFactors.get(profileId) ?? [],
    observation_count: outcomes.filter((outcome) => outcome.exposure.profile_id === profileId).length,
  }));
  const opportunities = new Set([
    ...collaborative.opportunityFactors.keys(),
    ...graph.opportunityFactors.keys(),
  ]);
  const opportunityRows = [...opportunities].map((key) => ({
    model_version_id: modelId,
    opportunity_key: key,
    factors: collaborative.opportunityFactors.get(key) ?? [],
    graph_factors: graph.opportunityFactors.get(key) ?? [],
    observation_count: outcomes.filter(
      (outcome) =>
        opportunityKey(outcome.exposure.opportunity_type, outcome.exposure.opportunity_id) === key,
    ).length,
  }));
  const priors = counterpartyPriors(outcomes);
  const priorRows = [...priors].map(([ownerId, value]) => ({
    model_version_id: modelId,
    owner_id: ownerId,
    proposal_count: value.proposalCount,
    acceptance_count: value.acceptanceCount,
    completion_count: value.completionCount,
    report_count: value.reportCount,
    platform_acceptance_prior: artifact.platformPriors.acceptance,
    platform_completion_prior: artifact.platformPriors.completion,
  }));
  for (const [table, rows] of [
    ["recommendation_user_factors", userRows],
    ["recommendation_opportunity_factors", opportunityRows],
    ["recommendation_counterparty_priors", priorRows],
  ] as const) {
    for (let offset = 0; offset < rows.length; offset += 250) {
      const result = await service.from(table).upsert(rows.slice(offset, offset + 250));
      if (result.error) throw result.error;
    }
  }
}

function causalMetrics(outcomes: readonly ReconciledOutcome[]) {
  const experiment = outcomes.filter(
    (outcome) =>
      outcome.exposure.assignment_arm === "treatment" ||
      outcome.exposure.assignment_arm === "holdout",
  );
  const rows = (selector: (outcome: ReconciledOutcome) => number) =>
    experiment.map((outcome) => ({
      outcome: selector(outcome),
      shown: outcome.exposure.was_shown,
      propensity: clamp(asNumber(outcome.exposure.joint_propensity, 0.5), 0.01, 0.99),
    }));
  return {
    proposalEffect: inversePropensityDifference(rows((outcome) => (outcome.proposed ? 1 : 0))),
    acceptanceEffect: inversePropensityDifference(rows((outcome) => (outcome.accepted ? 1 : 0))),
    verifiedCompletionEffect: inversePropensityDifference(
      rows((outcome) => (outcome.verifiedCompletion ? 1 : 0)),
    ),
  };
}

export async function runParetoRecommendationTrainingJob() {
  const service = createServiceClient() as any;
  const runId = randomUUID();
  const startedAt = nowIso();
  const cutoff = new Date(Date.now() - TRAINING_WINDOW_DAYS * 86_400_000).toISOString();
  const runInsert = await service.from("recommendation_training_runs").insert({
    id: runId,
    status: "running",
    stage: "load",
    started_at: startedAt,
    objective: "pareto_safe_additionality",
  });
  if (runInsert.error) throw runInsert.error;

  try {
    const data = await loadTrainingData(service, cutoff);
    const outcomes = reconcileOutcomes(data, new Date());
    await persistOutcomes(service, outcomes);
    const edges = aggregateEdges(data, outcomes);
    await persistGraphEdges(service, edges);

    const collaborativeEdges: ImplicitEdge[] = edges.map((edge) => ({
      opportunityKey: edge.opportunityKey,
      profileId: edge.profileId,
      weight: edge.weight,
    }));
    const graphEdges: ImplicitEdge[] = edges.map((edge) => ({
      opportunityKey: edge.opportunityKey,
      profileId: edge.profileId,
      weight: edge.positive > edge.negative ? 6 : -4,
    }));
    const collaborative = fitImplicitFactors(collaborativeEdges);
    const graph = fitImplicitFactors(graphEdges);
    const examples = buildHeadExamples(outcomes);
    const trainedAt = nowIso();
    const { artifact, tuned } = fitArtifact(examples, outcomes, trainedAt);
    const guardrail = evaluateGuardrails(outcomes);
    const activation = activationAssessment(artifact, outcomes, guardrail);
    const status = activation.activate ? "active" : activation.shadowReady ? "shadow" : "cold_start";
    const modelId = randomUUID();
    const modelKey = `${PARETO_MODEL_VERSION}:${trainedAt.slice(0, 10)}:${modelId.slice(0, 8)}`;
    const metrics = {
      activation,
      causal: causalMetrics(outcomes),
      guardrail,
      headMetrics: Object.fromEntries(
        Object.entries(artifact.heads).map(([key, head]) => [key, head.metrics]),
      ),
      thresholdTuning: tuned,
    };

    if (activation.activate) {
      const supersede = await service
        .from("recommendation_model_versions")
        .update({ status: "superseded", superseded_at: trainedAt })
        .eq("status", "active");
      if (supersede.error) throw supersede.error;
    }
    const modelInsert = await service.from("recommendation_model_versions").insert({
      id: modelId,
      model_key: modelKey,
      status,
      objective: "pareto_safe_additionality",
      algorithm_version: PARETO_MODEL_VERSION,
      trained_at: trainedAt,
      training_window_start: cutoff,
      training_window_end: trainedAt,
      sample_count: outcomes.length,
      profile_count: activation.profileCount,
      opportunity_count: activation.opportunityCount,
      proposal_count: outcomes.filter((outcome) => outcome.proposed).length,
      acceptance_count: outcomes.filter((outcome) => outcome.accepted).length,
      completion_count: outcomes.filter((outcome) => outcome.verifiedCompletion).length,
      outcome_feedback_count: activation.feedbackCount,
      artifact,
      metrics,
      activation_reason: activation.activate
        ? "All volume, calibration, Pareto, and safety gates passed."
        : activation.failures.join(", "),
    });
    if (modelInsert.error) throw modelInsert.error;
    await persistModelArtifacts({ artifact, collaborative, graph, modelId, outcomes, service });

    const guardrailInsert = await service.from("recommendation_guardrail_snapshots").insert({
      measured_at: trainedAt,
      window_days: TRAINING_WINDOW_DAYS,
      exposure_count: guardrail.exposureCount,
      report_rate: guardrail.reportRate,
      cancellation_rate: guardrail.cancellationRate,
      average_satisfaction: guardrail.averageSatisfaction,
      stop_experiment: guardrail.stopExperiment,
      reasons: guardrail.reasons,
      experiment_key: PARETO_EXPERIMENT_KEY,
    });
    if (guardrailInsert.error) throw guardrailInsert.error;

    const runUpdate = await service
      .from("recommendation_training_runs")
      .update({
        completed_at: nowIso(),
        stage: "complete",
        status: "succeeded",
        model_version_id: modelId,
        counts: {
          edges: edges.length,
          exposures: outcomes.length,
          feedback: activation.feedbackCount,
          opportunities: activation.opportunityCount,
          profiles: activation.profileCount,
        },
        metrics,
      })
      .eq("id", runId);
    if (runUpdate.error) throw runUpdate.error;

    return {
      activationFailures: activation.failures,
      experimentStopped: guardrail.stopExperiment,
      modelId,
      modelKey,
      outcomeCount: outcomes.length,
      runId,
      status,
      trainingWindowDays: TRAINING_WINDOW_DAYS,
    };
  } catch (error) {
    await service
      .from("recommendation_training_runs")
      .update({
        completed_at: nowIso(),
        error_code: "training_failed",
        error_detail: error instanceof Error ? error.message.slice(0, 1_000) : String(error).slice(0, 1_000),
        stage: "failed",
        status: "failed",
      })
      .eq("id", runId);
    throw error;
  }
}
