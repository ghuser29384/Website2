export type DashboardView = "priorities" | "controls";

export function readDashboardView(value: string | string[] | undefined): DashboardView {
  return (Array.isArray(value) ? value[0] : value) === "controls" ? "controls" : "priorities";
}

// Preserve existing bookmarks and action redirects; fragments are not sent to the server.
const legacySections = new Set([
  "#dashboard-overview", "#wish-profile", "#background-networking", "#privacy-controls",
  "#match-inbox", "#my-trades", "#advanced-setup", "#payments-and-fund", "#payment-setup",
  "#consent-center", "#saved-searches", "#notifications", "#incoming-responses",
  "#outgoing-responses", "#agreements", "#saved-offers", "#account-security",
]);

export function getLegacyDashboardTarget(search: string, hash: string): string | null {
  const params = new URLSearchParams(search);
  if (params.get("view") === "controls" || !legacySections.has(hash)) return null;
  params.set("view", "controls");
  return `/dashboard?${params.toString()}${hash}`;
}
