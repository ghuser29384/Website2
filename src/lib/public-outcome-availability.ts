// Only the existing anonymous, finalized six-field outcome projection is accepted.
// This is navigation visibility, not a claim that a payment or whole agreement completed.
const lifecycleStatuses = new Set([
  "paid", "payment_due", "payment_reported", "payment_review", "evidence_due", "graded",
]);
const fields = ["actionCategory", "lifecycleStatus", "confidenceBand", "completionFraction", "payoutPercentage", "date"];

export function hasPublicOutcome(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const records = (payload as Record<string, unknown>).records;
  if (!Array.isArray(records)) return false;
  return records.some((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== fields.length || !fields.every((key) => Object.hasOwn(row, key))) return false;
    if (typeof row.actionCategory !== "string" || !row.actionCategory.trim()) return false;
    if (typeof row.lifecycleStatus !== "string" || !lifecycleStatuses.has(row.lifecycleStatus)) return false;
    if (typeof row.confidenceBand !== "number" || ![0, 25, 50, 75, 100].includes(row.confidenceBand)) return false;
    if (typeof row.completionFraction !== "number" || !Number.isFinite(row.completionFraction) || row.completionFraction < 0 || row.completionFraction > 1) return false;
    if (typeof row.payoutPercentage !== "number" || !Number.isFinite(row.payoutPercentage) || row.payoutPercentage < 0 || row.payoutPercentage > 100) return false;
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return false;
    const date = new Date(`${row.date}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === row.date;
  });
}

export async function readPublicOutcomeAvailability(
  read: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<boolean> {
  try {
    const { data, error } = await read();
    return !error && hasPublicOutcome(data);
  } catch {
    return false;
  }
}
