import { readFile, writeFile } from "node:fs/promises";

const path = "src/app/people/page.tsx";
let source = await readFile(path, "utf8");

function replaceOnce(search, replacement, label) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one occurrence, found ${occurrences}`);
  }
  source = source.replace(search, replacement);
}

replaceOnce(
`import {
  collectPeopleCauseOptions,
  CREDIT_FILTER_OPTIONS,
  PEOPLE_DISCOVERY_SORT_OPTIONS,
  PEOPLE_KIND_FILTER_OPTIONS,
  PEOPLE_PARTICIPATION_FILTER_OPTIONS,
  PEOPLE_PAYMENT_FILTER_OPTIONS,
  profileMatchesFilters,
  rankProfiles,
  type CreditFilter,
  type PeopleDiscoveryFilters,
  type PeopleDiscoverySort,
  type PeopleKindFilter,
  type PeopleParticipationFilter,
  type PeoplePaymentFilter,
} from "@/lib/discovery-ranking";`,
`import {
  collectPeopleCauseOptions,
  CREDIT_FILTER_OPTIONS,
  PEOPLE_DISCOVERY_SORT_OPTIONS,
  PEOPLE_KIND_FILTER_OPTIONS,
  PEOPLE_PARTICIPATION_FILTER_OPTIONS,
  PEOPLE_PAYMENT_FILTER_OPTIONS,
  type CreditFilter,
  type PeopleDiscoveryFilters,
  type PeopleDiscoverySort,
  type PeopleKindFilter,
  type PeopleParticipationFilter,
  type PeoplePaymentFilter,
} from "@/lib/discovery-ranking";
import { filterAndRankSmartProfiles } from "@/lib/smart-people-ranking";
import {
  getSmartQueryCauseLabel,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
} from "@/lib/smart-query";
import { hasSmartQueryConstraints, mergeSmartQueryFacets } from "@/lib/smart-query-facets";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";`,
"replace people ranking imports",
);

replaceOnce(
`function rankingDescription(sort: PeopleDiscoverySort, hasSearch: boolean) {
  if (sort === "credit") {
    return "Highest credit prioritizes the confidence-adjusted conservative score, then public activity, relevance, and recency.";
  }
  if (sort === "offers") {
    return "Most open offers remains activity-led; confidence-adjusted credit contributes 12% so reliability can break close results.";
  }
  if (sort === "newest") {
    return "Newest remains primarily chronological; credit contributes 10% and cannot overwhelm a large recency difference.";
  }
  if (hasSearch) {
    return "Best match is 68% text relevance and 15% confidence-adjusted credit, with smaller activity and recency signals.";
  }
  return "Without a query, Best match emphasizes reviewed activity and recency; confidence-adjusted credit contributes 20%.";
}`,
`function rankingDescription(sort: PeopleDiscoverySort, hasSearch: boolean) {
  if (sort === "credit") {
    return "Highest credit is an explicit alternate order. Unknown and low-confidence records remain conservative rather than receiving inferred scores.";
  }
  if (sort === "offers") {
    return "Most open offers is activity-led; semantic fit and reviewed evidence break close results before the bounded credit signal.";
  }
  if (sort === "newest") {
    return "Newest is chronological; semantic fit and reviewed evidence break ties, with credit remaining a modest signal.";
  }
  if (hasSearch) {
    return "Hard constraints run first. Remaining members are ranked by semantic relevance (46%), reviewed evidence (20%), saved cause fit (16%), and a modest transaction-credit signal (8%). Member records have no deadline signal.";
  }
  return "Without a query, Best match preserves the established reviewed-activity and recency browse order; transaction credit remains bounded.";
}`,
"replace people ranking explanation",
);

replaceOnce(
`  const search = readParam(resolvedSearchParams, "search").trim().slice(0, 120);
  const filters: PeopleFilterState = {`,
`  const search = readParam(resolvedSearchParams, "search").trim().slice(0, 500);
  const parsedInterpretation = parseSmartQuery(search, { surface: "people" });
  const smartFacets = mergeSmartQueryFacets(
    parsedInterpretation.facets,
    parseSerializedSmartQueryFacets(resolvedSearchParams),
  );
  const interpretation = { ...parsedInterpretation, facets: smartFacets };
  const filters: PeopleFilterState = {`,
"insert people smart interpretation",
);

replaceOnce(
`  const discoveryFilters: PeopleDiscoveryFilters = {
    cause: filters.cause,
    credit: filters.credit,
    kind: filters.kind,
    participation: filters.participation,
    payment: filters.payment,
    search,
  };
  const filteredProfiles = candidates.filter((profile) =>
    profileMatchesFilters(profile, credibilityByProfile.get(profile.id), discoveryFilters),
  );
  const rankedProfiles = rankProfiles(
    filteredProfiles,
    credibilityByProfile,
    search,
    filters.sort,
  );`,
`  const discoveryFilters: PeopleDiscoveryFilters = {
    cause: filters.cause,
    credit: filters.credit,
    kind: filters.kind,
    participation: filters.participation,
    payment: filters.payment,
    search,
  };
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const rankedProfiles = filterAndRankSmartProfiles({
    credibilityByProfile,
    explicitFilters: discoveryFilters,
    interpretation,
    personalPriorities,
    profiles: candidates,
    sort: filters.sort,
  });`,
"replace people filtering and ranking",
);

replaceOnce(
`  const activeFilterLabels = [
    filters.cause ? \`Cause: \${filters.cause}\` : null,
    filters.payment !== "any"
      ? optionLabel(filters.payment, PEOPLE_PAYMENT_FILTER_OPTIONS)
      : null,
    filters.participation !== "any"
      ? optionLabel(filters.participation, PEOPLE_PARTICIPATION_FILTER_OPTIONS)
      : null,
    filters.kind !== "any" ? optionLabel(filters.kind, PEOPLE_KIND_FILTER_OPTIONS) : null,
    filters.credit !== "any" ? optionLabel(filters.credit, CREDIT_FILTER_OPTIONS) : null,
  ].filter((label): label is string => Boolean(label));
  const hasFilters = Boolean(search || activeFilterLabels.length);`,
`  const activeFilterLabels = [
    filters.cause ? \`Cause: \${filters.cause}\` : null,
    ...smartFacets.causes.map((cause) => \`Cause: \${getSmartQueryCauseLabel(cause)}\`),
    filters.payment !== "any"
      ? optionLabel(filters.payment, PEOPLE_PAYMENT_FILTER_OPTIONS)
      : null,
    filters.participation !== "any"
      ? optionLabel(filters.participation, PEOPLE_PARTICIPATION_FILTER_OPTIONS)
      : null,
    filters.kind !== "any" ? optionLabel(filters.kind, PEOPLE_KIND_FILTER_OPTIONS) : null,
    filters.credit !== "any" ? optionLabel(filters.credit, CREDIT_FILTER_OPTIONS) : null,
    smartFacets.verified === true ? "Reviewed evidence required" : null,
    smartFacets.verified === false ? "No reviewed evidence" : null,
    smartFacets.location ? \`Location: \${smartFacets.location}\` : null,
    smartFacets.minCredit !== null ? \`Credit ≥ \${smartFacets.minCredit}\` : null,
  ].filter((label, index, labels): label is string => Boolean(label) && labels.indexOf(label) === index);
  const hasFilters = Boolean(search || activeFilterLabels.length || hasSmartQueryConstraints(smartFacets));`,
"expand people active constraints",
);

replaceOnce(
`              A Moral Trade credit score is the public contextual credibility estimate for completing
              commitments. It modestly affects discovery, but does not rank moral views, popularity,
              wealth, or perceived virtue. Sparse evidence remains visibly Unproven.`,
`              Describe the member, cause, location, evidence state, or openness you need in ordinary
              language. Hard constraints are applied before semantic fit, reviewed evidence, saved cause
              priorities, and a modest transaction-credit signal. Sparse evidence remains visibly Unproven.`,
"update people hero copy",
);

replaceOnce(
`                  <strong>Relevance first</strong>
                  <p>Best match gives text relevance most of the weight and uses credit as a bounded signal.</p>`,
`                  <strong>Constraints first</strong>
                  <p>Explicit cause, location, participation, evidence, and credit requirements are enforced before ranking.</p>`,
"update people process copy",
);

replaceOnce(
`                  placeholder="Name, location, bio, collective, or cause"`,
`                  placeholder="e.g. verified civic participants in Chicago open to pledges"`,
"update people search example",
);

await writeFile(path, source, "utf8");
console.log(`Patched ${path}`);
