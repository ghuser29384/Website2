export const COMMAND_CENTER_HANDOFF_KEY =
  "moral-trade.command-center.handoff.v1";
export const COMMAND_CENTER_HANDOFF_VERSION = 1;

const MAX_HANDOFF_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

const STRING_LIMITS = {
  offeredCause: 180,
  requestedCause: 180,
  proposedAction: 5_000,
  requestedAction: 5_000,
  noTradeBaseline: 5_000,
  duration: 200,
  startDate: 10,
  evidenceDueDate: 10,
  evidenceRule: 5_000,
  exitConditions: 5_000,
  notes: 5_000,
} as const;

export type CommandCenterHandoffValues = Partial<
  Record<keyof typeof STRING_LIMITS, string>
>;

export interface CommandCenterHandoff {
  createdAt: number;
  reviewFields: string[];
  source: "command-center";
  values: CommandCenterHandoffValues;
  version: typeof COMMAND_CENTER_HANDOFF_VERSION;
}

interface HandoffStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeDate(value: unknown) {
  const normalized = sanitizeString(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "";
}

function sanitizeReviewFields(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((entry) => sanitizeString(entry, 60))
        .filter(Boolean)
        .slice(0, 8),
    ),
  ];
}

export function parseCommandCenterHandoff(
  raw: string,
  now = Date.now(),
): CommandCenterHandoff | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== COMMAND_CENTER_HANDOFF_VERSION) return null;
  if (parsed.source !== "command-center") return null;
  if (typeof parsed.createdAt !== "number" || !Number.isFinite(parsed.createdAt)) {
    return null;
  }
  if (parsed.createdAt > now + MAX_FUTURE_CLOCK_SKEW_MS) return null;
  if (now - parsed.createdAt > MAX_HANDOFF_AGE_MS) return null;
  if (!isRecord(parsed.values)) return null;

  const values: CommandCenterHandoffValues = {};
  for (const [key, maxLength] of Object.entries(STRING_LIMITS) as Array<
    [keyof typeof STRING_LIMITS, number]
  >) {
    const value =
      key === "startDate" || key === "evidenceDueDate"
        ? sanitizeDate(parsed.values[key])
        : sanitizeString(parsed.values[key], maxLength);
    if (value) values[key] = value;
  }

  if (
    !values.offeredCause &&
    !values.requestedCause &&
    !values.proposedAction &&
    !values.requestedAction
  ) {
    return null;
  }

  return {
    version: COMMAND_CENTER_HANDOFF_VERSION,
    source: "command-center",
    createdAt: parsed.createdAt,
    values,
    reviewFields: sanitizeReviewFields(parsed.reviewFields),
  };
}

export function consumeCommandCenterHandoff(
  storage: HandoffStorage,
  now = Date.now(),
) {
  let raw: string | null = null;
  try {
    raw = storage.getItem(COMMAND_CENTER_HANDOFF_KEY);
  } catch {
    return null;
  }

  try {
    storage.removeItem(COMMAND_CENTER_HANDOFF_KEY);
  } catch {
    // The record is still treated as one-time data in application state.
  }

  return raw ? parseCommandCenterHandoff(raw, now) : null;
}
