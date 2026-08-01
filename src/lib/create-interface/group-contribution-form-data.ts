import type { UnderlyingContributionKind } from "./group-contribution";
import type { GroupContributionProposalFlags } from "./group-contribution-flags";
import {
  validateGroupContributionProposalForPersistence,
  type AuthoritativeProposalOption,
  type ServerGroupContributionResult,
} from "./group-contribution-server";

export const GROUP_CONTRIBUTION_FORM_FIELD = "groupContributionTerms";

export interface ValidateGroupContributionFormDataInput {
  formData: Pick<FormData, "get">;
  authoritativeOptions: readonly AuthoritativeProposalOption[];
  flags?: GroupContributionProposalFlags;
}

export function validateGroupContributionFormDataForPersistence(
  input: ValidateGroupContributionFormDataInput,
): ServerGroupContributionResult {
  const field = input.formData.get(GROUP_CONTRIBUTION_FORM_FIELD);
  if (field instanceof File) {
    return {
      ok: false,
      issues: [
        {
          path: GROUP_CONTRIBUTION_FORM_FIELD,
          code: "invalid-envelope",
          message: "Group-contribution terms must be submitted as UTF-8 JSON text",
        },
      ],
    };
  }

  return validateGroupContributionProposalForPersistence({
    rawField: typeof field === "string" ? field : null,
    authoritativeOptions: input.authoritativeOptions,
    ...(input.flags ? { flags: input.flags } : {}),
  });
}

export function authoritativeOption(
  optionKey: string,
  contributionKind: UnderlyingContributionKind,
): AuthoritativeProposalOption {
  return { optionKey, contributionKind };
}
