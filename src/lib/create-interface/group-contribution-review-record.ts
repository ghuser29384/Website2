import type { GroupContributionProposalFlags } from "./group-contribution-flags";
import {
  GROUP_CONTRIBUTION_FORM_FIELD,
  validateGroupContributionFormDataForPersistence,
} from "./group-contribution-form-data";
import type { AuthoritativeProposalOption } from "./group-contribution-server";

export const GROUP_CONTRIBUTION_REVIEW_RECORD_KEY = "groupContributionTerms" as const;

export interface GroupContributionReviewRecordFragment {
  [GROUP_CONTRIBUTION_REVIEW_RECORD_KEY]: {
    visibility: "private-review";
    execution: "proposal-only";
    canonicalJson: string;
  };
}

type GroupContributionValidationFailure = Extract<
  ReturnType<typeof validateGroupContributionFormDataForPersistence>,
  { ok: false }
>;

export type GroupContributionReviewRecordResult =
  | {
      ok: true;
      fragment: GroupContributionReviewRecordFragment | null;
      issues: [];
    }
  | GroupContributionValidationFailure;

export function buildGroupContributionReviewRecordFragment(input: {
  formData: Pick<FormData, "get">;
  authoritativeOptions: readonly AuthoritativeProposalOption[];
  flags?: GroupContributionProposalFlags;
}): GroupContributionReviewRecordResult {
  const validated = validateGroupContributionFormDataForPersistence(input);
  if (!validated.ok) return validated;
  if (validated.value.options.length === 0) {
    return { ok: true, fragment: null, issues: [] };
  }

  return {
    ok: true,
    fragment: {
      [GROUP_CONTRIBUTION_REVIEW_RECORD_KEY]: {
        visibility: "private-review",
        execution: "proposal-only",
        canonicalJson: validated.canonicalJson,
      },
    },
    issues: [],
  };
}

export function hasGroupContributionFormField(formData: Pick<FormData, "has">): boolean {
  return formData.has(GROUP_CONTRIBUTION_FORM_FIELD);
}
