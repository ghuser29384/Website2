export const COMMAND_TRADE_HANDOFF_KEY = "moral-trade.command-center.handoff.v1";
export const COMMAND_TRADE_HANDOFF_VERSION = 1;

const DEFAULT_EXIT_CONDITIONS =
  "Either participant may withdraw before both participants confirm the final terms; no commitment begins before that confirmation.";

const CAUSE_RULES: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "Animal welfare",
    pattern:
      /\b(?:animal welfare|factory farm|farmed animal|vegetarian|vegan|meatless|avoid meat|meat consumption)\b/i,
  },
  {
    label: "AI safety",
    pattern: /\b(?:ai[- ]?safety|ai alignment|artificial intelligence safety)\b/i,
  },
  {
    label: "Global poverty",
    pattern: /\b(?:global poverty|poverty reduction|extreme poverty)\b/i,
  },
  {
    label: "Global health",
    pattern: /\b(?:global health|malaria|vaccination|disease prevention)\b/i,
  },
  {
    label: "Climate change",
    pattern: /\b(?:climate|carbon|emissions?|transit trips?|car trips?|public transport)\b/i,
  },
  {
    label: "Democracy",
    pattern: /\b(?:democracy|democratic institutions|voting access)\b/i,
  },
  {
    label: "Future flourishing",
    pattern: /\b(?:future flourishing|future generations|long[- ]?term future)\b/i,
  },
];

function clean(value: unknown, maxLength = 5_000) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function ensurePeriod(value: string) {
  const normalized = clean(value).replace(/[.;:,!?]+$/, "");
  return normalized ? `${normalized}.` : "";
}

function sentenceCase(value: string) {
  const normalized = clean(value)
    .replace(/^(?:you|the other participant|the counterparty)\s+/i, "")
    .replace(/^to\s+/i, "");
  if (!normalized) return "";
  return ensurePeriod(`${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`);
}

export function causeForCommand(value: string) {
  return CAUSE_RULES.find((entry) => entry.pattern.test(value))?.label ?? "";
}

export function splitReciprocalCommand(value: string) {
  let normalized = clean(value, 2_000);
  normalized = normalized.replace(
    /^(?:please\s+)?(?:create|build|draft|make)\s+(?:me\s+)?(?:an?\s+)?(?:offer|trade|commitment)\s*:?\s*/i,
    "",
  );
  normalized = normalized.replace(/^offer\s+(?=\$|an?\b)/i, "");

  for (const separator of [
    /\s+in\s+exchange\s+for\s+/i,
    /\s+in\s+return\s+for\s+/i,
    /\s+provided\s+that\s+/i,
    /\s+if\s+/i,
    /\s+when\s+/i,
  ]) {
    const match = separator.exec(normalized);
    if (!match || match.index <= 0) continue;
    const offered = clean(normalized.slice(0, match.index));
    const requested = clean(normalized.slice(match.index + match[0].length));
    if (offered && requested) return { offered, requested };
  }

  return { offered: normalized, requested: "" };
}

function normalizeAmount(value: string) {
  return clean(value, 40).replace(/\s+/g, "");
}

function parseOfferedAction(value: string) {
  const segment = clean(value);
  const donation =
    /^(\$[\d,]+(?:\.\d{1,2})?)\s+(?:donation|gift)\s+to\s+(.+)$/i.exec(segment) ||
    /^donate\s+(\$[\d,]+(?:\.\d{1,2})?)\s+to\s+(.+)$/i.exec(segment);

  if (donation) {
    const amount = normalizeAmount(donation[1]);
    const target = clean(donation[2], 500);
    const cause = causeForCommand(target) || causeForCommand(segment);
    const normalizedTarget = target.replace(/^(?:an?\s+)?/i, "");
    const destination =
      cause && normalizedTarget.toLowerCase() === cause.toLowerCase()
        ? `an agreed ${cause === "AI safety" ? "AI-safety" : cause.toLowerCase()} organization`
        : normalizedTarget;
    return {
      action: ensurePeriod(`Donate ${amount} to ${destination}`),
      cause,
      descriptor: `${amount} donation`,
      kind: "donation" as const,
    };
  }

  const funding = /^(\$[\d,]+(?:\.\d{1,2})?)\s+(?:for|toward|towards)\s+(.+)$/i.exec(
    segment,
  );
  if (funding) {
    const amount = normalizeAmount(funding[1]);
    const target = clean(funding[2], 500);
    return {
      action: ensurePeriod(`Provide ${amount} for ${target}`),
      cause: causeForCommand(target) || causeForCommand(segment),
      descriptor: `${amount} contribution`,
      kind: "funding" as const,
    };
  }

  return {
    action: sentenceCase(segment),
    cause: causeForCommand(segment),
    descriptor: "offered commitment",
    kind: "other" as const,
  };
}

function quantity(value: string) {
  const normalized = clean(value, 20).toLowerCase();
  return normalized === "one" ? "1" : normalized;
}

function durationFor(value: string) {
  const meal = /\b(\d+|one)\s+(?:vegetarian|vegan|meatless)\s+meals?\b/i.exec(value);
  if (meal) {
    const count = quantity(meal[1]);
    return count === "1" ? "One meal" : `${count} meals`;
  }
  const trips = /\b(\d+|one)\s+(?:transit|car|commute)\s+trips?\b/i.exec(value);
  if (trips) {
    const count = quantity(trips[1]);
    return count === "1" ? "One trip" : `${count} trips`;
  }
  const time = /\b(\d+|one)\s+(day|week|month|year)s?\b/i.exec(value);
  if (time) {
    const count = quantity(time[1]);
    const unit = time[2].toLowerCase();
    return count === "1" ? `One ${unit}` : `${count} ${unit}s`;
  }
  return "";
}

function requestedDescriptor(value: string) {
  const meal = /\b(\d+|one)\s+(?:vegetarian|vegan|meatless)\s+meals?\b/i.exec(value);
  if (meal) {
    const count = quantity(meal[1]);
    return count === "1" ? "vegetarian meal" : `${count} vegetarian meals`;
  }
  return "requested commitment";
}

export function parseTradeCommand(command: string) {
  const { offered, requested } = splitReciprocalCommand(command);
  const offeredTerms = parseOfferedAction(offered);
  const requestedAction = requested ? sentenceCase(requested) : "";
  const requestedCause = requested ? causeForCommand(requested) : "";
  const duration = durationFor(requested || offered);
  const requestDescriptor = requestedDescriptor(requested);
  const noTradeBaseline = requested
    ? offeredTerms.kind === "donation" && requestDescriptor.includes("vegetarian")
      ? `Without this trade, neither the ${offeredTerms.descriptor} nor the ${requestDescriptor} is assumed to occur.`
      : "Without this trade, neither stated commitment is assumed to occur."
    : "";

  const values = {
    offeredCause: offeredTerms.cause,
    requestedCause,
    proposedAction: offeredTerms.action,
    requestedAction,
    noTradeBaseline,
    duration,
    startDate: "",
    evidenceDueDate: "",
    evidenceRule: "",
    exitConditions: DEFAULT_EXIT_CONDITIONS,
    notes: "",
  };

  const reviewFields = [
    ...(!values.offeredCause || !values.requestedCause ? ["priorities"] : []),
    ...(!values.requestedAction ? ["reciprocal commitment"] : []),
    "no-trade baseline",
    "deadline",
    "evidence",
  ];

  return { values, reviewFields: [...new Set(reviewFields)] };
}

export function createTradeHandoff(command: string, now = Date.now()) {
  const parsed = parseTradeCommand(command);
  return {
    version: COMMAND_TRADE_HANDOFF_VERSION,
    source: "command-center",
    createdAt: now,
    values: parsed.values,
    reviewFields: parsed.reviewFields,
  };
}
