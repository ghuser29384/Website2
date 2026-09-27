/** Derive count metrics with one meaning each. A creation timestamp must never
 * masquerade as an activation event. The calendar-month label explicitly says UTC.
 */
export interface SummaryRecord {
  lifecycle: string;
  createdAt: string;
  action: unknown;
  verifiedOutcome: boolean;
}

const activeStates = new Set(["conditional", "activated", "in_progress", "submitted", "under_review", "disputed"]);

export function summarizeCommitmentRecords(records: readonly SummaryRecord[], generatedAt: string) {
  const now = new Date(generatedAt);
  const validSnapshot = Number.isFinite(now.getTime());
  return {
    active: records.filter((record) => activeStates.has(record.lifecycle)).length,
    actionNeeded: records.filter((record) => activeStates.has(record.lifecycle) && record.action).length,
    underReview: records.filter((record) => record.lifecycle === "submitted" || record.lifecycle === "under_review").length,
    createdThisMonth: validSnapshot ? records.filter((record) => {
      const created = new Date(record.createdAt);
      return created.getUTCFullYear() === now.getUTCFullYear() && created.getUTCMonth() === now.getUTCMonth();
    }).length : null,
    verified: records.filter((record) => record.verifiedOutcome).length,
  };
}

export function commitmentCountLabel(count: number | null, complete: boolean) {
  if (count === null) return "Unavailable";
  if (complete) return String(count);
  return count > 0 ? `${count} found` : "Unknown";
}
