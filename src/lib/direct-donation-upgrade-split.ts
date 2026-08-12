export const DIRECT_DONATION_UPGRADE_MIN_REDIRECT_BASIS_POINTS = 1;
export const DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS = 10_000;
export const DIRECT_DONATION_UPGRADE_MIN_DIRECT_LEG_CENTS = 100;

export interface DirectDonationUpgradeSplit {
  redirectBasisPoints: number;
  redirectedAmountCents: number;
  retainedAmountCents: number;
}

export function parseDirectDonationUpgradeRedirectPercentage(value: string) {
  const normalized = value.trim();
  if (!/^(?:100(?:\.0{1,2})?|(?:0|[1-9]\d?)(?:\.\d{1,2})?)$/.test(normalized)) {
    return null;
  }
  const percentage = Number(normalized);
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    return null;
  }
  const basisPoints = Math.round(percentage * 100);
  if (
    basisPoints < DIRECT_DONATION_UPGRADE_MIN_REDIRECT_BASIS_POINTS ||
    basisPoints > DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS ||
    Math.abs(percentage * 100 - basisPoints) > Number.EPSILON * 100
  ) {
    return null;
  }
  return basisPoints;
}

export function calculateDirectDonationUpgradeSplit(
  creatorAmountCents: number,
  redirectBasisPoints: number,
): DirectDonationUpgradeSplit {
  if (!Number.isSafeInteger(creatorAmountCents) || creatorAmountCents < 1) {
    throw new Error("The planned donation amount must be a positive whole number of cents.");
  }
  if (
    !Number.isSafeInteger(redirectBasisPoints) ||
    redirectBasisPoints < DIRECT_DONATION_UPGRADE_MIN_REDIRECT_BASIS_POINTS ||
    redirectBasisPoints > DIRECT_DONATION_UPGRADE_MAX_REDIRECT_BASIS_POINTS
  ) {
    throw new Error("The redirect percentage must be greater than 0% and no more than 100%.");
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
