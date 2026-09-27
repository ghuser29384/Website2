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

/** Keep legacy feedback and control selections without accepting a redirect host. */
export function getProfileDashboardTarget(
  values: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}
