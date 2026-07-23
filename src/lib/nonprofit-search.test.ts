import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProPublicaSearchUrl,
  mapProPublicaOrganizations,
  normalizeNonprofitSearchQuery,
} from "@/lib/nonprofit-search";

test("nonprofit queries are normalized and bounded before external search", () => {
  assert.equal(
    normalizeNonprofitSearchQuery("  Longterm\n Futures\t Fund  "),
    "Longterm Futures Fund",
  );
  assert.equal(normalizeNonprofitSearchQuery(null), "");
  assert.equal(normalizeNonprofitSearchQuery("x".repeat(200)).length, 120);

  const url = new URL(buildProPublicaSearchUrl("Against Malaria Foundation"));
  assert.equal(url.origin, "https://projects.propublica.org");
  assert.equal(url.pathname, "/nonprofits/api/v2/search.json");
  assert.equal(url.searchParams.get("q"), "Against Malaria Foundation");
});

test("ProPublica organizations become concise autocomplete suggestions", () => {
  const results = mapProPublicaOrganizations({
    organizations: [
      {
        ein: 142007220,
        strein: "14-2007220",
        name: "Pro Publica Inc",
        sub_name: "ProPublica",
        city: "New York",
        state: "NY",
        subseccd: 3,
        score: 110.36,
      },
      {
        ein: 142007220,
        strein: "14-2007220",
        name: "Pro Publica Inc",
        sub_name: "ProPublica",
        city: "New York",
        state: "NY",
        subseccd: 3,
        score: 110.36,
      },
      {
        ein: 123456789,
        name: "Civic Organization",
        city: "Washington",
        state: "DC",
        subseccd: 4,
        score: 80,
      },
    ],
  });

  assert.equal(results.length, 2);
  assert.deepEqual(results[0], {
    label: "Pro Publica Inc",
    description: "501(c)(3) charity · New York, NY · EIN 14-2007220",
    aliases: ["ProPublica"],
    kind: "organization",
    source: "ProPublica Nonprofit Explorer / IRS",
    ein: "14-2007220",
    profileUrl: "https://projects.propublica.org/nonprofits/organizations/142007220",
    subsection: 3,
    score: 110.36,
  });
  assert.match(results[1]?.description ?? "", /^501\(c\)\(4\) organization/);
});
