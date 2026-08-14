import type { GroupContributionMode, UnderlyingContributionKind } from "./group-contribution";
import {
  DEFAULT_GROUP_CONTRIBUTION_PROPOSAL_FLAGS,
  permitsCoActStructure,
  permitsCoFundAllocation,
  permitsGroupContributionMode,
  type GroupContributionProposalFlags,
} from "./group-contribution-flags";
import {
  parseGroupContributionProposalPayload,
  type GroupContributionProposalPayload,
  type PayloadIssue,
} from "./group-contribution-payload";
import { validateGroupContributionNestedShape } from "./group-contribution-shape";

export interface AuthoritativeProposalOption {
  optionKey: string;
  contributionKind: UnderlyingContributionKind;
}

export interface ServerGroupContributionInput {
  rawField: string | null | undefined;
  authoritativeOptions: readonly AuthoritativeProposalOption[];
  flags?: GroupContributionProposalFlags;
}

export type ServerGroupContributionResult =
  | {
      ok: true;
      value: GroupContributionProposalPayload;
      canonicalJson: string;
      issues: [];
    }
  | {
      ok: false;
      issues: PayloadIssue[];
    };

export function validateGroupContributionProposalForPersistence(
  input: ServerGroupContributionInput,
): ServerGroupContributionResult {
  const flags = input.flags ?? DEFAULT_GROUP_CONTRIBUTION_PROPOSAL_FLAGS;
  const optionKinds = new Map<string, UnderlyingContributionKind>();
  const issues: PayloadIssue[] = [];

  for (const option of input.authoritativeOptions) {
    const key = option.optionKey.trim();
    if (!key) {
      issues.push({
        path: "authoritativeOptions",
        code: "invalid-envelope",
        message: "Authoritative option keys must be non-empty",
      });
      continue;
    }
    if (optionKinds.has(key)) {
      issues.push({
        path: `authoritativeOptions.${key}`,
        code: "duplicate-option",
        message: "Authoritative proposal contains a duplicate option key",
      });
      continue;
    }
    optionKinds.set(key, option.contributionKind);
  }

  if (issues.length > 0) return { ok: false, issues };

  const parsedJson = parseRawJson(input.rawField);
  if (!parsedJson.ok) return parsedJson;

  if (parsedJson.value && isRecord(parsedJson.value) && Array.isArray(parsedJson.value.options)) {
    parsedJson.value.options.forEach((candidate, index) => {
      if (!isRecord(candidate)) return;
      const nestedIssues = validateGroupContributionNestedShape(candidate.terms);
      nestedIssues.forEach((issue) => {
        issues.push({
          ...issue,
          path: issue.path ? `options[${index}].terms.${issue.path}` : `options[${index}].terms`,
        });
      });
    });
  }

  const parsed = parseGroupContributionProposalPayload(input.rawField, optionKinds);
  if (!parsed.ok) issues.push(...parsed.issues);

  if (parsed.ok) {
    parsed.value.options.forEach((option, index) => {
      const mode = option.terms.mode;
      if (!permitsGroupContributionMode(flags, mode)) {
        issues.push(featureDisabledIssue(index, mode, `${mode} proposals are disabled`));
        return;
      }
      if (
        mode === "co-act" &&
        !permitsCoActStructure(flags, option.terms.structure)
      ) {
        issues.push(
          featureDisabledIssue(
            index,
            mode,
            `${option.terms.structure} Co-Act proposals are disabled`,
          ),
        );
      }
      if (
        mode === "co-fund" &&
        !permitsCoFundAllocation(flags, option.terms.allocationMode)
      ) {
        issues.push(
          featureDisabledIssue(
            index,
            mode,
            `${option.terms.allocationMode} Co-Fund proposals are disabled`,
          ),
        );
      }
    });
  }

  if (issues.length > 0 || !parsed.ok) return { ok: false, issues };

  const canonicalJson = JSON.stringify(parsed.value);
  return { ok: true, value: parsed.value, canonicalJson, issues: [] };
}

function featureDisabledIssue(
  index: number,
  _mode: GroupContributionMode,
  message: string,
): PayloadIssue {
  return {
    path: `options[${index}].terms.mode`,
    code: "invalid-value",
    message,
  };
}

function parseRawJson(
  raw: string | null | undefined,
): { ok: true; value: unknown } | { ok: false; issues: PayloadIssue[] } {
  if (raw === null || raw === undefined || raw.trim() === "") return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "invalid-json",
          message: "Group-contribution payload is not valid JSON",
        },
      ],
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
