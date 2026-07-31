export type DonationUpgradeDestinationEnvironment = "test" | "live";

function canonicalProductionFromSiteUrl(siteUrl: string) {
  try {
    const hostname = new URL(siteUrl).hostname.toLowerCase();
    return hostname === "moraltrade.org" || hostname === "www.moraltrade.org";
  } catch {
    return false;
  }
}

export function getDonationUpgradeDestinationEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): DonationUpgradeDestinationEnvironment {
  if (environment.VERCEL_ENV) {
    return environment.VERCEL_ENV === "production" ? "live" : "test";
  }
  return canonicalProductionFromSiteUrl(String(environment.NEXT_PUBLIC_SITE_URL ?? ""))
    ? "live"
    : "test";
}
