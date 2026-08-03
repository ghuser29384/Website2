import {
  validateGroupContributionTerms,
  type GroupContributionTerms,
  type UnderlyingContributionKind,
  type ValidationIssue,
} from "./group-contribution";

export const MAX_GROUP_CONTRIBUTION_PAYLOAD_BYTES = 64 * 1024;
export const MAX_GROUP_CONTRIBUTION_OPTIONS = 20;

export interface GroupContributionProposalOption {
  optionKey: string;
  terms: GroupContributionTerms;
}

export interface GroupContributionProposalPayload {
  schemaVersion: 1;
  execution: "proposal-only";
  options: GroupContributionProposalOption[];
}

export interface PayloadIssue {
  path: string;
  code:
    | "invalid-json"
    | "payload-too-large"
    | "invalid-envelope"
    | "unknown-field"
    | "duplicate-option"
    | "unknown-option"
    | "too-many-options"
    | ValidationIssue["code"];
  message: string;
}

export type PayloadParseResult =
  | { ok: true; value: GroupContributionProposalPayload; issues: [] }
  | { ok: false; issues: PayloadIssue[] };

const ENVELOPE_KEYS = new Set(["schemaVersion", "execution", "options"]);
const OPTION_KEYS = new Set(["optionKey", "terms"]);

export function parseGroupContributionProposalPayload(
  raw: string | null | undefined,
  contributionKinds: ReadonlyMap<string, UnderlyingContributionKind>,
): PayloadParseResult {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return {
      ok: true,
      value: { schemaVersion: 1, execution: "proposal-only", options: [] },
      issues: [],
    };
  }

  if (new TextEncoder().encode(raw).byteLength > MAX_GROUP_CONTRIBUTION_PAYLOAD_BYTES) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "payload-too-large",
          message: `Group-contribution payload exceeds ${MAX_GROUP_CONTRIBUTION_PAYLOAD_BYTES} bytes`,
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      issues: [{ path: "", code: "invalid-json", message: "Group-contribution payload is not valid JSON" }],
    };
  }

  if (!isRecord(parsed)) {
    return invalidEnvelope("Payload must be an object");
  }

  const issues: PayloadIssue[] = [];
  rejectUnknownFields(parsed, ENVELOPE_KEYS, "", issues);
  if (parsed.schemaVersion !== 1) {
    issues.push({ path: "schemaVersion", code: "invalid-envelope", message: "Unsupported payload version" });
  }
  if (parsed.execution !== "proposal-only") {
    issues.push({
      path: "execution",
      code: "invalid-envelope",
      message: "Only proposal-only group terms are accepted",
    });
  }
  if (!Array.isArray(parsed.options)) {
    issues.push({ path: "options", code: "invalid-envelope", message: "Options must be an array" });
    return { ok: false, issues };
  }
  if (parsed.options.length > MAX_GROUP_CONTRIBUTION_OPTIONS) {
    issues.push({
      path: "options",
      code: "too-many-options",
      message: `No more than ${MAX_GROUP_CONTRIBUTION_OPTIONS} group options may be submitted`,
    });
  }

  const seen = new Set<string>();
  const options: GroupContributionProposalOption[] = [];

  parsed.options.slice(0, MAX_GROUP_CONTRIBUTION_OPTIONS).forEach((candidate, index) => {
    const path = `options[${index}]`;
    if (!isRecord(candidate)) {
      issues.push({ path, code: "invalid-envelope", message: "Option must be an object" });
      return;
    }
    rejectUnknownFields(candidate, OPTION_KEYS, path, issues);

    if (typeof candidate.optionKey !== "string" || !candidate.optionKey.trim()) {
      issues.push({ path: `${path}.optionKey`, code: "invalid-envelope", message: "Option key is required" });
      return;
    }
    const optionKey = candidate.optionKey.trim();
    if (seen.has(optionKey)) {
      issues.push({ path: `${path}.optionKey`, code: "duplicate-option", message: "Option appears more than once" });
      return;
    }
    seen.add(optionKey);

    const kind = contributionKinds.get(optionKey);
    if (!kind) {
      issues.push({
        path: `${path}.optionKey`,
        code: "unknown-option",
        message: "Group terms reference an option that is not part of this proposal",
      });
      return;
    }

    const validation = validateGroupContributionTerms(candidate.terms, kind);
    if (!validation.ok) {
      validation.issues.forEach((issue) =>
        issues.push({
          ...issue,
          path: issue.path ? `${path}.terms.${issue.path}` : `${path}.terms`,
        }),
      );
      return;
    }

    options.push({ optionKey, terms: validation.value });
  });

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: { schemaVersion: 1, execution: "proposal-only", options },
    issues: [],
  };
}

function invalidEnvelope(message: string): PayloadParseResult {
  return {
    ok: false,
    issues: [{ path: "", code: "invalid-envelope", message }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  issues: PayloadIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (allowed.has(key)) continue;
    issues.push({
      path: path ? `${path}.${key}` : key,
      code: "unknown-field",
      message: `Unsupported payload field: ${key}`,
    });
  }
}
