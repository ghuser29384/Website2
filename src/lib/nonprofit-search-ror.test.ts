import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRorSearchUrl,
  mapRorOrganizations,
  ROR_SEARCH_SOURCE,
} from "@/lib/nonprofit-search-ror";

test("ROR queries use the v2 name-search endpoint", () => {
  const url = new URL(buildRorSearchUrl("Wellcome Trust"));
  assert.equal(url.origin, "https://api.ror.org");
  assert.equal(url.pathname, "/v2/organizations");
  assert.equal(url.searchParams.get("query"), "Wellcome Trust");
  assert.equal(url.searchParams.get("page"), "1");
});

test("ROR records become global organization suggestions with aliases and identifiers", () => {
  const results = mapRorOrganizations(
    {
      items: [
        {
          id: "https://ror.org/029chgv08",
          names: [
            { value: "Wellcome Trust", types: ["ror_display"] },
            { value: "The Wellcome Trust", types: ["alias"] },
            { value: "WT", types: ["acronym"] },
          ],
          types: ["funder", "nonprofit"],
          locations: [
            {
              geonames_details: {
                name: "London",
                country_name: "United Kingdom",
                country_code: "GB",
              },
            },
          ],
          links: [{ type: "website", value: "https://wellcome.org/" }],
        },
      ],
    },
    "Wellcome Trust",
  );

  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    label: "Wellcome Trust",
    description: "Nonprofit organization · London, United Kingdom",
    aliases: ["The Wellcome Trust", "WT"],
    kind: "organization",
    source: ROR_SEARCH_SOURCE,
    ein: null,
    profileUrl: "https://ror.org/029chgv08",
    subsection: null,
    score: 1048,
    organizationId: "https://ror.org/029chgv08",
    countryCode: "GB",
    website: "https://wellcome.org/",
  });
});

test("ROR mapping excludes companies but keeps active public-interest institutions", () => {
  const results = mapRorOrganizations(
    {
      items: [
        {
          id: "https://ror.org/company",
          names: [{ value: "Commercial Research Company", types: ["ror_display"] }],
          types: ["company"],
          locations: [],
          links: [],
        },
        {
          id: "https://ror.org/hospital",
          names: [{ value: "Global Health Hospital", types: ["ror_display"] }],
          types: ["healthcare"],
          locations: [
            {
              geonames_details: {
                name: "Nairobi",
                country_name: "Kenya",
                country_code: "KE",
              },
            },
          ],
          links: [],
        },
      ],
    },
    "Global Health",
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.label, "Global Health Hospital");
  assert.match(results[0]?.description ?? "", /Healthcare institution · Nairobi, Kenya/);
  assert.equal(results[0]?.countryCode, "KE");
});
