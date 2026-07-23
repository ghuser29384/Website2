export interface SmartDiscoverySignals {
  semanticRelevance: number;
  evidenceQuality: number;
  personalMoralFit: number;
  deadlineUrgency: number;
  credit: number;
}

export const SMART_DISCOVERY_WEIGHTS = Object.freeze({
  semanticRelevance: 0.46,
  evidenceQuality: 0.2,
  personalMoralFit: 0.16,
  deadlineUrgency: 0.1,
  credit: 0.08,
});

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * Hard constraints are applied before this function. The score then follows the
 * product order agreed for discovery: semantic relevance, evidence quality,
 * personal moral fit, deadline urgency, and a deliberately modest credit signal.
 */
export function smartDiscoveryScore(signals: SmartDiscoverySignals) {
  return (
    SMART_DISCOVERY_WEIGHTS.semanticRelevance * clamp(signals.semanticRelevance) +
    SMART_DISCOVERY_WEIGHTS.evidenceQuality * clamp(signals.evidenceQuality) +
    SMART_DISCOVERY_WEIGHTS.personalMoralFit * clamp(signals.personalMoralFit) +
    SMART_DISCOVERY_WEIGHTS.deadlineUrgency * clamp(signals.deadlineUrgency) +
    SMART_DISCOVERY_WEIGHTS.credit * clamp(signals.credit)
  );
}

export function normalizeCreditSignal(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0;
  const score = Number(value);
  if (score <= 0) return 0;
  if (score <= 1) return clamp(score);
  if (score <= 5) return clamp(score / 5);
  return clamp(score / 100);
}
