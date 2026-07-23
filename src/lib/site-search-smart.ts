import {
  buildSmartQueryTarget,
  parseSmartQuery,
  semanticTextScore,
} from "@/lib/smart-query";
import { SITE_SEARCH_ITEMS, type SiteSearchItem } from "@/lib/site-search";

function routeIntentBoost(item: SiteSearchItem, route: string) {
  const path = item.href.split("?")[0];
  if (path === route) return 0.22;
  if (route === "/offers" && ["trade", "category"].includes(item.kind)) return 0.08;
  if (route === "/pools" && item.kind === "fund") return 0.08;
  if (route === "/people" && item.kind === "community") return 0.08;
  return 0;
}

export function filterSmartSiteSearchItems(query: string, limit = 7) {
  const interpretation = parseSmartQuery(query, { surface: "global" });
  if (!interpretation.normalizedQuery) return SITE_SEARCH_ITEMS.slice(0, limit);

  return SITE_SEARCH_ITEMS.map((item, index) => {
    const semantic = semanticTextScore(interpretation, [
      { value: item.label, weight: 1 },
      { value: item.keywords.join(" "), weight: 0.92 },
      { value: item.summary, weight: 0.72 },
      { value: item.kind, weight: 0.42 },
    ]);
    const exactLabel = item.label.toLowerCase().includes(interpretation.normalizedQuery) ? 0.18 : 0;
    const score = semantic + exactLabel + routeIntentBoost(item, interpretation.route);
    return { item, score, index };
  })
    .filter((entry) => entry.score >= 0.16)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.index - right.index ||
        left.item.label.localeCompare(right.item.label),
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function getSmartSiteSearchTarget(query: string) {
  return buildSmartQueryTarget(parseSmartQuery(query, { surface: "global" }));
}
