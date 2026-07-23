import type { EvidenceStageRecord } from "@/components/evidence/evidence-stage";
import { smartDiscoveryScore } from "@/lib/smart-discovery-ranking";
import {
  parseSmartQuery,
  type SmartQueryFacets,
  type SmartQueryInterpretation,
} from "@/lib/smart-query";
import {
  smartCauseMatchScore,
  smartInterpretationScore,
  smartPersonalPriorityScore,
} from "@/lib/smart-query-scoring";

export type SmartEvidenceSort = "best_match" | "most_verified" | "challenged" | "newest";

interface RankedEvidenceRecord {
  evidenceQuality: number;
  record: EvidenceStageRecord;
  score: number;
  semanticRelevance: number;
}

function evidenceFields(record: EvidenceStageRecord) {
  return [
    { value: `${record.offeredCause} ${record.requestedCause}`, weight: 1 },
    { value: `${record.proposedAction} ${record.requestedAction}`, weight: 0.92 },
    { value: record.evidenceRule, weight: 0.88 },
    {
      value: record.evidence
        .map((item) => `${item.title} ${item.summary} ${item.evidenceType} ${item.group} ${item.state}`)
        .join(" "),
      weight: 0.84,
    },
    { value: `${record.duration} ${record.lifecycle}`, weight: 0.58 },
  ] as const;
}

export function smartEvidenceReviewState(record: EvidenceStageRecord) {
  if (record.evidence.some((item) => item.state === "challenged")) return "challenged" as const;
  if (record.evidence.length && record.evidence.every((item) => item.state === "accepted")) {
    return "accepted" as const;
  }
  return "submitted" as const;
}

function evidenceQuality(record: EvidenceStageRecord) {
  if (!record.evidence.length) return 0;
  const accepted = record.evidence.filter((item) => item.state === "accepted").length;
  const challenged = record.evidence.filter((item) => item.state === "challenged").length;
  const publicReady = record.evidence.filter((item) =>
    item.redactionState === "redacted" || item.redactionState === "not_required",
  ).length;
  const reviewedRatio = accepted / record.evidence.length;
  const publicRatio = publicReady / record.evidence.length;
  const challengePenalty = challenged / record.evidence.length;
  return Math.min(1, Math.max(0, 0.62 * reviewedRatio + 0.38 * publicRatio - 0.35 * challengePenalty));
}

function causeIdsFor(record: EvidenceStageRecord) {
  return parseSmartQuery(`${record.offeredCause} ${record.requestedCause}`, {
    surface: "evidence",
  }).facets.causes;
}

function matchesHardConstraints(
  record: EvidenceStageRecord,
  interpretation: SmartQueryInterpretation,
) {
  const facets = interpretation.facets;
  const fields = evidenceFields(record);
  const reviewState = smartEvidenceReviewState(record);

  if (facets.causes.length && smartCauseMatchScore(facets.causes, fields) < 0.42) return false;
  if (facets.evidenceStates.length && !facets.evidenceStates.includes(reviewState)) return false;
  if (facets.verified !== null) {
    const verified = reviewState === "accepted";
    if (verified !== facets.verified) return false;
  }
  if (
    facets.minAmountCents !== null ||
    facets.maxAmountCents !== null ||
    facets.deadlineBefore ||
    facets.deadlineAfter ||
    facets.actionTypes.length ||
    facets.participantKinds.length ||
    facets.openToPayment !== null ||
    facets.openToPledges !== null ||
    facets.minCredit !== null ||
    facets.poolKinds.length ||
    facets.location
  ) {
    return false;
  }

  const semanticRequired = Boolean(
    interpretation.residualTerms.length || facets.causes.length,
  );
  return !semanticRequired || smartInterpretationScore(interpretation, fields) >= 0.16;
}

export function filterAndRankEvidenceRecords({
  facets,
  personalPriorities,
  query,
  records,
  sort,
}: {
  facets: SmartQueryFacets;
  personalPriorities: readonly string[];
  query: string;
  records: EvidenceStageRecord[];
  sort: SmartEvidenceSort;
}) {
  const base = parseSmartQuery(query, { surface: "evidence" });
  const interpretation = { ...base, facets };
  const ranked = records
    .filter((record) => matchesHardConstraints(record, interpretation))
    .map((record): RankedEvidenceRecord => {
      const semanticRelevance = smartInterpretationScore(interpretation, evidenceFields(record));
      const quality = evidenceQuality(record);
      const score = smartDiscoveryScore({
        semanticRelevance,
        evidenceQuality: quality,
        personalMoralFit: smartPersonalPriorityScore(causeIdsFor(record), personalPriorities),
        deadlineUrgency: 0,
        credit: 0,
      });
      return { evidenceQuality: quality, record, score, semanticRelevance };
    });

  return ranked
    .sort((left, right) => {
      if (sort === "newest") {
        return Date.parse(right.record.updatedAt) - Date.parse(left.record.updatedAt) ||
          right.score - left.score || left.record.id.localeCompare(right.record.id);
      }
      if (sort === "most_verified") {
        return right.evidenceQuality - left.evidenceQuality || right.score - left.score ||
          left.record.id.localeCompare(right.record.id);
      }
      if (sort === "challenged") {
        const leftChallenge = smartEvidenceReviewState(left.record) === "challenged" ? 1 : 0;
        const rightChallenge = smartEvidenceReviewState(right.record) === "challenged" ? 1 : 0;
        return rightChallenge - leftChallenge || right.score - left.score ||
          left.record.id.localeCompare(right.record.id);
      }
      return right.score - left.score ||
        right.semanticRelevance - left.semanticRelevance ||
        Date.parse(right.record.updatedAt) - Date.parse(left.record.updatedAt) ||
        left.record.id.localeCompare(right.record.id);
    })
    .map((entry) => entry.record);
}
