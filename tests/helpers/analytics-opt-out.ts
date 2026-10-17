import type { BrowserContext } from "@playwright/test";

export async function optOutOfOptionalAnalytics(context: BrowserContext, baseURL?: string) {
  if (!baseURL) throw new Error("UI checks require the configured app origin.");
  await context.addCookies([
    { name: "mt_analytics_opt_out", value: "1", url: baseURL, sameSite: "Lax" },
  ]);
}
