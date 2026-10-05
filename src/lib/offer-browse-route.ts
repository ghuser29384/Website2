/** Move ordinary browsing to Discover; preserve legacy advanced filters unchanged. */
export function getDiscoverBrowseHref(params: URLSearchParams): string | null {
  if (params.get("render") === "server") return null;
  const view = params.get("view");
  if (view && view !== "live") return null;
  const supported = new Set(["view", "search", "q", "query", "smart", "page", "sort", "mode"]);
  if ([...params.keys()].some((key) => !supported.has(key))) return null;
  if (params.get("mode") && params.get("mode") !== "all") return null;
  const sorts: Record<string, string> = {
    newest: "newest", best_match: "best-fit", lowest_cost: "lowest-cost",
    soonest_deadline: "deadline", most_verified: "strongest-evidence",
  };
  const sort = params.get("sort");
  if (sort && !sorts[sort]) return null;
  const next = new URLSearchParams({ domain: "offers", view: "list" });
  const query = params.get("q") || params.get("search") || params.get("query");
  if (query) next.set("q", query);
  if (params.has("page")) next.set("page", params.get("page")!);
  if (sort) next.set("sort", sorts[sort]);
  return `/discover?${next}`;
}
