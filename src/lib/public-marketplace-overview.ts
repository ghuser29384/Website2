import type { MarketplaceOverview } from "@/lib/app-data";

export const PUBLIC_MARKETPLACE_OVERVIEW_TIMEOUT_MS = 4_000;

export function createUnavailableMarketplaceOverview(): MarketplaceOverview {
  return {
    hasLiveData: false,
    openOfferCount: null,
    publicProfileCount: null,
    completedAgreementCount: null,
    redirectedOffsetCents: null,
    pooledCommitmentCents: null,
  };
}

export async function resolvePublicMarketplaceOverview(
  request: Promise<MarketplaceOverview>,
  timeoutMs = PUBLIC_MARKETPLACE_OVERVIEW_TIMEOUT_MS,
): Promise<MarketplaceOverview> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      request.then((overview) => ({
        overview,
        timedOut: false,
      })),
      new Promise<{
        overview: MarketplaceOverview;
        timedOut: boolean;
      }>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve({
              overview: createUnavailableMarketplaceOverview(),
              timedOut: true,
            }),
          timeoutMs,
        );
      }),
    ]);

    if (result.timedOut) {
      console.warn("[supabase] Marketplace overview timed out; rendering unavailable metrics.", {
        timeoutMs,
      });
    }

    return result.overview;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
