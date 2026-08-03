export const GROUP_CONTRIBUTION_REVIEW_RECORD_KEY = "groupContributionTerms" as const;

export interface GroupContributionReviewRecordFragment {
  [GROUP_CONTRIBUTION_REVIEW_RECORD_KEY]: {
    visibility: "private-review";
    execution: "proposal-only";
    canonicalJson: string;
  };
}
