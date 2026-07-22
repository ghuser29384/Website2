const CLEARING_WEEKDAY_UTC = 4;
const CLEARING_HOUR_UTC = 17;
const INTRODUCTION_DAY_OFFSET = 4;

export interface MarketplaceClearingRound {
  cutoffAt: Date;
  introductionDate: Date;
}

export function getNextMarketplaceClearingRound(
  now: Date = new Date(),
): MarketplaceClearingRound {
  const cutoffAt = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      CLEARING_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
  const daysUntilThursday =
    (CLEARING_WEEKDAY_UTC - cutoffAt.getUTCDay() + 7) % 7;

  cutoffAt.setUTCDate(cutoffAt.getUTCDate() + daysUntilThursday);

  if (cutoffAt.getTime() <= now.getTime()) {
    cutoffAt.setUTCDate(cutoffAt.getUTCDate() + 7);
  }

  const introductionDate = new Date(cutoffAt);
  introductionDate.setUTCDate(
    introductionDate.getUTCDate() + INTRODUCTION_DAY_OFFSET,
  );
  introductionDate.setUTCHours(12, 0, 0, 0);

  return { cutoffAt, introductionDate };
}

export function formatMarketplaceCutoff(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    timeZone: "UTC",
    timeZoneName: "short",
    weekday: "long",
  }).format(value);
}

export function formatMarketplaceIntroductionDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(value);
}
