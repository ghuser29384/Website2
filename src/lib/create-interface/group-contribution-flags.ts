export interface GroupContributionProposalFlags {
  coAct: boolean;
  coFund: boolean;
  coActComplementaryRoles: boolean;
  coFundFlexible: boolean;
  coFundCustomSplit: boolean;
  coFundMatching: boolean;
}

export const DEFAULT_GROUP_CONTRIBUTION_PROPOSAL_FLAGS: GroupContributionProposalFlags = {
  coAct: true,
  coFund: true,
  coActComplementaryRoles: true,
  coFundFlexible: true,
  coFundCustomSplit: true,
  coFundMatching: true,
};

export function readGroupContributionProposalFlags(
  environment: Record<string, string | undefined> = process.env,
): GroupContributionProposalFlags {
  return {
    coAct: readFlag(environment.NEXT_PUBLIC_MORAL_TRADE_CO_ACT_PROPOSALS, true),
    coFund: readFlag(environment.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_PROPOSALS, true),
    coActComplementaryRoles: readFlag(
      environment.NEXT_PUBLIC_MORAL_TRADE_CO_ACT_COMPLEMENTARY_ROLES,
      true,
    ),
    coFundFlexible: readFlag(environment.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_FLEXIBLE, true),
    coFundCustomSplit: readFlag(
      environment.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_CUSTOM_SPLIT,
      true,
    ),
    coFundMatching: readFlag(environment.NEXT_PUBLIC_MORAL_TRADE_CO_FUND_MATCHING, true),
  };
}

export function permitsGroupContributionMode(
  flags: GroupContributionProposalFlags,
  mode: "co-act" | "co-fund",
): boolean {
  return mode === "co-act" ? flags.coAct : flags.coFund;
}

export function permitsCoActStructure(
  flags: GroupContributionProposalFlags,
  structure: "same-action" | "complementary-roles",
): boolean {
  return structure === "same-action" || flags.coActComplementaryRoles;
}

export function permitsCoFundAllocation(
  flags: GroupContributionProposalFlags,
  mode: "equal-share" | "flexible-contribution" | "custom-split" | "matching-pledge",
): boolean {
  switch (mode) {
    case "equal-share":
      return true;
    case "flexible-contribution":
      return flags.coFundFlexible;
    case "custom-split":
      return flags.coFundCustomSplit;
    case "matching-pledge":
      return flags.coFundMatching;
  }
}

function readFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return false;
}
