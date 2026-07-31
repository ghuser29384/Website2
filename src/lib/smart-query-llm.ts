import {
  SMART_QUERY_CONFIDENCE_THRESHOLD,
  SMART_QUERY_VERSION,
  buildSmartQueryTarget,
  type SmartQueryClarification,
  type SmartQueryFacets,
  type SmartQueryIntent,
  type SmartQueryInterpretation,
} from "./smart-query";

interface LlmFacetPatch {
  exactAmountCents: number | null;
  maxAmountCents: number | null;
  maxAmountInclusive: boolean | null;
  minAmountCents: number | null;
  minAmountInclusive: boolean | null;
  deadlineBefore: string | null;
  deadlineBeforeInclusive: boolean | null;
  deadlineAfter: string | null;
  deadlineAfterInclusive: boolean | null;
  verified: boolean | null;
  location: string | null;
}

interface LlmQueryResolution {
  confidence: number;
  resolved: boolean;
  intent: SmartQueryIntent | null;
  facetPatch: LlmFacetPatch;
  clarificationQuestion: string | null;
  clarificationOptions: string[];
  reason: string;
}

export interface LlmSmartQueryResult {
  interpretation: SmartQueryInterpretation;
  target: string;
  usedLlm: boolean;
}

const INTENTS: SmartQueryIntent[] = [
  "discover",
  "offers",
  "people",
  "wishes",
  "evidence",
  "pools",
  "mpgf_pools",
];

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "confidence",
    "resolved",
    "intent",
    "facetPatch",
    "clarificationQuestion",
    "clarificationOptions",
    "reason",
  ],
  properties: {
    confidence: { type: "number", minimum: 0, maximum: 1 },
    resolved: { type: "boolean" },
    intent: { anyOf: [{ type: "string", enum: INTENTS }, { type: "null" }] },
    facetPatch: {
      type: "object",
      additionalProperties: false,
      required: [
        "exactAmountCents",
        "maxAmountCents",
        "maxAmountInclusive",
        "minAmountCents",
        "minAmountInclusive",
        "deadlineBefore",
        "deadlineBeforeInclusive",
        "deadlineAfter",
        "deadlineAfterInclusive",
        "verified",
        "location",
      ],
      properties: {
        exactAmountCents: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
        maxAmountCents: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
        maxAmountInclusive: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        minAmountCents: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
        minAmountInclusive: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        deadlineBefore: {
          anyOf: [{ type: "string", pattern: "^20[0-9]{2}-[0-9]{2}-[0-9]{2}$" }, { type: "null" }],
        },
        deadlineBeforeInclusive: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        deadlineAfter: {
          anyOf: [{ type: "string", pattern: "^20[0-9]{2}-[0-9]{2}-[0-9]{2}$" }, { type: "null" }],
        },
        deadlineAfterInclusive: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        verified: { anyOf: [{ type: "boolean" }, { type: "null" }] },
        location: { anyOf: [{ type: "string", maxLength: 80 }, { type: "null" }] },
      },
    },
    clarificationQuestion: { anyOf: [{ type: "string", maxLength: 180 }, { type: "null" }] },
    clarificationOptions: {
      type: "array",
      maxItems: 5,
      items: { type: "string", maxLength: 60 },
    },
    reason: { type: "string", maxLength: 240 },
  },
} as const;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function cleanInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function cleanIntent(value: unknown): SmartQueryIntent | null {
  return INTENTS.includes(value as SmartQueryIntent) ? (value as SmartQueryIntent) : null;
}

function cleanResolution(value: unknown): LlmQueryResolution | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const patchRecord = record.facetPatch;
  if (!patchRecord || typeof patchRecord !== "object" || Array.isArray(patchRecord)) return null;
  const patch = patchRecord as Record<string, unknown>;
  const question = typeof record.clarificationQuestion === "string"
    ? record.clarificationQuestion.trim().slice(0, 180) || null
    : null;
  const options = Array.isArray(record.clarificationOptions)
    ? record.clarificationOptions
        .filter((option): option is string => typeof option === "string")
        .map((option) => option.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    confidence: clamp(Number(record.confidence) || 0),
    resolved: record.resolved === true,
    intent: cleanIntent(record.intent),
    facetPatch: {
      exactAmountCents: cleanInteger(patch.exactAmountCents),
      maxAmountCents: cleanInteger(patch.maxAmountCents),
      maxAmountInclusive: cleanBoolean(patch.maxAmountInclusive),
      minAmountCents: cleanInteger(patch.minAmountCents),
      minAmountInclusive: cleanBoolean(patch.minAmountInclusive),
      deadlineBefore: cleanDate(patch.deadlineBefore),
      deadlineBeforeInclusive: cleanBoolean(patch.deadlineBeforeInclusive),
      deadlineAfter: cleanDate(patch.deadlineAfter),
      deadlineAfterInclusive: cleanBoolean(patch.deadlineAfterInclusive),
      verified: cleanBoolean(patch.verified),
      location:
        typeof patch.location === "string" ? patch.location.trim().slice(0, 80) || null : null,
    },
    clarificationQuestion: question,
    clarificationOptions: options,
    reason: typeof record.reason === "string" ? record.reason.trim().slice(0, 240) : "",
  };
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return "";

  for (const item of record.output) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object" || Array.isArray(part)) continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") return text;
    }
  }
  return "";
}

function mergePatch(
  facets: SmartQueryFacets,
  patch: LlmFacetPatch,
): SmartQueryFacets {
  const merged = { ...facets };
  if (patch.exactAmountCents !== null && facets.minAmountCents === null && facets.maxAmountCents === null) {
    merged.minAmountCents = patch.exactAmountCents;
    merged.maxAmountCents = patch.exactAmountCents;
    merged.minAmountInclusive = true;
    merged.maxAmountInclusive = true;
  } else {
    if (facets.minAmountCents === null && patch.minAmountCents !== null) {
      merged.minAmountCents = patch.minAmountCents;
      merged.minAmountInclusive = patch.minAmountInclusive ?? true;
    }
    if (facets.maxAmountCents === null && patch.maxAmountCents !== null) {
      merged.maxAmountCents = patch.maxAmountCents;
      merged.maxAmountInclusive = patch.maxAmountInclusive ?? true;
    }
  }
  if (!facets.deadlineBefore && patch.deadlineBefore) {
    merged.deadlineBefore = patch.deadlineBefore;
    merged.deadlineBeforeInclusive = patch.deadlineBeforeInclusive ?? true;
  }
  if (!facets.deadlineAfter && patch.deadlineAfter) {
    merged.deadlineAfter = patch.deadlineAfter;
    merged.deadlineAfterInclusive = patch.deadlineAfterInclusive ?? true;
  }
  if (facets.verified === null && patch.verified !== null) merged.verified = patch.verified;
  if (!facets.location && patch.location) merged.location = patch.location;
  return merged;
}

export function mergeLlmSmartQueryResolution(
  base: SmartQueryInterpretation,
  resolution: LlmQueryResolution,
): SmartQueryInterpretation {
  const confidence = clamp(resolution.confidence);
  const facets = mergePatch(base.facets, resolution.facetPatch);
  const resolved = resolution.resolved && confidence >= SMART_QUERY_CONFIDENCE_THRESHOLD;
  const clarification: SmartQueryClarification | null = resolved
    ? null
    : resolution.clarificationQuestion
      ? {
          field: base.clarification?.field ?? "query",
          question: resolution.clarificationQuestion,
          options: resolution.clarificationOptions.length
            ? resolution.clarificationOptions
            : undefined,
        }
      : base.clarification;
  const intent = base.surface === "global" && resolution.intent ? resolution.intent : base.intent;

  return {
    ...base,
    version: SMART_QUERY_VERSION,
    intent,
    route: intent === base.intent ? base.route : {
      discover: "/discover",
      offers: "/offers",
      people: "/people",
      wishes: "/wish-registry",
      evidence: "/evidence",
      pools: "/pools",
      mpgf_pools: "/mpgf/pools",
    }[intent],
    stage: "llm",
    confidence,
    facets,
    needsClarification: !resolved,
    clarification,
    reasonCodes: [...new Set([
      ...base.reasonCodes,
      "llm_fallback",
      resolved ? "llm_resolved" : "llm_clarification",
    ])],
  };
}

const DEFAULT_SMART_QUERY_LLM_TIMEOUT_MS = 12_000;
const MIN_SMART_QUERY_LLM_TIMEOUT_MS = 3_000;
const MAX_SMART_QUERY_LLM_TIMEOUT_MS = 20_000;
export const SMART_QUERY_LLM_MAX_OUTPUT_TOKENS = 1_200;
export const SMART_QUERY_LLM_REASONING_EFFORT = "minimal" as const;

export function smartQueryLlmTimeoutMs(
  rawValue = process.env.OPENAI_QUERY_TIMEOUT_MS,
) {
  if (!rawValue) return DEFAULT_SMART_QUERY_LLM_TIMEOUT_MS;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return DEFAULT_SMART_QUERY_LLM_TIMEOUT_MS;
  return Math.min(
    MAX_SMART_QUERY_LLM_TIMEOUT_MS,
    Math.max(MIN_SMART_QUERY_LLM_TIMEOUT_MS, Math.round(parsed)),
  );
}

export async function resolveSmartQueryWithLlm(
  base: SmartQueryInterpretation,
): Promise<LlmSmartQueryResult> {
  const fallback = {
    interpretation: base,
    target: buildSmartQueryTarget(base),
    usedLlm: false,
  };
  if (
    !base.needsClarification ||
    base.confidence >= SMART_QUERY_CONFIDENCE_THRESHOLD ||
    process.env.AI_QUERY_FALLBACK_ENABLED !== "true" ||
    !process.env.OPENAI_API_KEY
  ) {
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), smartQueryLlmTimeoutMs());
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_QUERY_MODEL || "gpt-5-nano",
        store: false,
        reasoning: { effort: SMART_QUERY_LLM_REASONING_EFFORT },
        max_output_tokens: SMART_QUERY_LLM_MAX_OUTPUT_TOKENS,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You resolve search-query ambiguity for Moral Trade. Preserve every explicit deterministic constraint. Resolve only when the user's wording makes one interpretation at least 90% likely. Otherwise ask exactly one concise question about the single decision that most changes or invalidates results. Never infer private facts, moral worth, political preferences, or location. Monetary values are integer cents and dates are YYYY-MM-DD.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  query: base.originalQuery,
                  surface: base.surface,
                  deterministicIntent: base.intent,
                  deterministicFacets: base.facets,
                  deterministicClarification: base.clarification,
                  reasonCodes: base.reasonCodes,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "moral_trade_query_resolution",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });
    if (!response.ok) {
  let errorPayload: unknown = null;
  try {
    errorPayload = await response.json() as unknown;
  } catch {
    errorPayload = null;
  }
  const errorRecord = errorPayload && typeof errorPayload === "object" && !Array.isArray(errorPayload)
    ? (errorPayload as Record<string, unknown>).error
    : null;
  const error = errorRecord && typeof errorRecord === "object" && !Array.isArray(errorRecord)
    ? errorRecord as Record<string, unknown>
    : null;
  // Operational metadata only: never log the key, query, prompt, or provider message.
  console.warn("[smart-query-llm] openai_non_ok", {
    status: response.status,
    type: typeof error?.type === "string" ? error.type : null,
    code: typeof error?.code === "string" ? error.code : null,
    param: typeof error?.param === "string" ? error.param : null,
  });
  return fallback;
}
    const payload = await response.json() as unknown;
  const outputText = extractResponseText(payload);
  if (!outputText) {
    const responseRecord = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : null;
    const incompleteDetails = responseRecord?.incomplete_details;
    const incompleteRecord = incompleteDetails && typeof incompleteDetails === "object" && !Array.isArray(incompleteDetails)
      ? incompleteDetails as Record<string, unknown>
      : null;
    const output = Array.isArray(responseRecord?.output) ? responseRecord.output : [];
    const outputTypes = output
      .map((item) => item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>).type
        : null)
      .filter((value): value is string => typeof value === "string")
      .slice(0, 8);
    // Operational metadata only: never log generated content or user input.
    console.warn("[smart-query-llm] openai_no_output_text", {
      status: typeof responseRecord?.status === "string" ? responseRecord.status : null,
      incompleteReason: typeof incompleteRecord?.reason === "string" ? incompleteRecord.reason : null,
      outputTypes,
    });
    return fallback;
  }
  const resolution = cleanResolution(JSON.parse(outputText) as unknown);
  if (!resolution) {
    console.warn("[smart-query-llm] invalid_structured_resolution");
    return fallback;
  }
    const interpretation = mergeLlmSmartQueryResolution(base, resolution);
    return {
      interpretation,
      target: buildSmartQueryTarget(interpretation),
      usedLlm: true,
    };
  } catch (error) {
    // Operational metadata only: never log the key, query, prompt, or provider message.
    console.warn("[smart-query-llm] request_exception", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
