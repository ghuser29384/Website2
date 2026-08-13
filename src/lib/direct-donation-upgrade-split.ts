export const DIRECT_DONATION_UPGRADE_MIN_REDIRECT_BASIS_POINTS = 1;
export const DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS = 10_000;
export const DIRECT_DONATION_UPGRADE_MIN_DIRECT_LEG_CENTS = 100;
export const DIRECT_DONATION_UPGRADE_MAX_DIRECT_LEG_CENTS = 5_000_000;

export interface DirectDonationUpgradeSplit {
  redirectBasisPoints: number;
  redirectedAmountCents: number;
  retainedAmountCents: number;
}

export function parseDirectDonationUpgradeUsdValue(value: string) {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const dollars = Number(match[1]);
  if (!Number.isSafeInteger(dollars)) return null;
  const cents = dollars * 100 + Number((match[2] ?? "").padEnd(2, "0") || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatDirectDonationUpgradeUsdValue(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function parseDirectDonationUpgradeRedirectPercentage(value: string) {
  const normalized = value.trim();
  const match = /^(?:(100)(?:\.(0{1,2}))?|((?:0|[1-9]\d?))(?:\.(\d{1,2}))?)$/.exec(
    normalized,
  );
  if (!match) {
    return null;
  }
  const basisPoints = match[1]
    ? DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS
    : Number(match[3]) * 100 + Number((match[4] ?? "").padEnd(2, "0"));
  if (
    !Number.isSafeInteger(basisPoints) ||
    basisPoints < DIRECT_DONATION_UPGRADE_MIN_REDIRECT_BASIS_POINTS ||
    basisPoints > DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS
  ) {
    return null;
  }
  return basisPoints;
}

export function calculateDirectDonationUpgradeSplit(
  creatorAmountCents: number,
  redirectBasisPoints: number,
): DirectDonationUpgradeSplit {
  if (
    !Number.isSafeInteger(creatorAmountCents) ||
    creatorAmountCents < DIRECT_DONATION_UPGRADE_MIN_DIRECT_LEG_CENTS ||
    creatorAmountCents > DIRECT_DONATION_UPGRADE_MAX_DIRECT_LEG_CENTS
  ) {
    throw new Error("The planned donation must be between $1.00 and $50,000.00.");
  }
  if (
    !Number.isSafeInteger(redirectBasisPoints) ||
    redirectBasisPoints < DIRECT_DONATION_UPGRADE_MIN_REDIRECT_BASIS_POINTS ||
    redirectBasisPoints > DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS
  ) {
    throw new Error("The redirect percentage must be greater than 0% and no more than 100%.");
  }
  if (
    creatorAmountCents >
    Math.floor((Number.MAX_SAFE_INTEGER - 5_000) / redirectBasisPoints)
  ) {
    throw new Error("The planned donation and redirect percentage exceed the exact arithmetic range.");
  }

  const redirectedAmountCents = Math.floor(
    (creatorAmountCents * redirectBasisPoints + 5_000) / 10_000,
  );
  const retainedAmountCents = creatorAmountCents - redirectedAmountCents;

  if (redirectedAmountCents < DIRECT_DONATION_UPGRADE_MIN_DIRECT_LEG_CENTS) {
    throw new Error("The redirected portion must be at least $1.00.");
  }
  if (
    retainedAmountCents > 0 &&
    retainedAmountCents < DIRECT_DONATION_UPGRADE_MIN_DIRECT_LEG_CENTS
  ) {
    throw new Error(
      "The portion remaining with the original recipient must be either $0.00 or at least $1.00.",
    );
  }

  return {
    redirectBasisPoints,
    redirectedAmountCents,
    retainedAmountCents,
  };
}

export function formatDirectDonationUpgradeRedirectPercentage(basisPoints: number) {
  if (!Number.isFinite(basisPoints)) return "0%";
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(basisPoints / 100)}%`;
}
