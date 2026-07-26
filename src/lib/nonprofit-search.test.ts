import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOpenAlexFunderSearchUrl,
  buildOpenAlexInstitutionSearchUrl,
  buildProPublicaSearchUrl,
  buildWikidataSearchUrl,
  mapOpenAlexFunders,
  mapOpenAlexInstitutions,
  mapProPublicaOrganizations,
  mapWikidataOrganizations,
  mergeOrganizationSuggestions,
  normalizeNonprofitSearchQuery,
  scoreOrganizationQueryMatch,
} from "@/lib/nonprofit-search";

test("nonprofit queries are normalized and bounded before external search", () => {
  assert.equal(
    normalizeNonprofitSearchQuery("  Longterm\n Futures\t Fund  "),
    "Longterm Futures Fund",
  );
  assert.equal(normalizeNonprofitSearchQuery(null), "");
  assert.equal(normalizeNonprofitSearchQuery("x".repeat(200)).length, 120);

  const proPublicaUrl = new URL(buildProPublicaSearchUrl("Against Malaria Foundation"));
  assert.equal(proPublicaUrl.origin, "https://projects.propublica.org");
  assert.equal(proPublicaUrl.pathname, "/nonprofits/api/v2/search.json");
  assert.equal(proPublicaUrl.searchParams.get("q"), "Against Malaria Foundation");

  const wikidataUrl = new URL(buildWikidataSearchUrl("Oxfam", 30));
  assert.equal(wikidataUrl.origin, "https://www.wikidata.org");
  assert.equal(wikidataUrl.searchParams.get("action"), "wbsearchentities");
  assert.equal(wikidataUrl.searchParams.get("search"), "Oxfam");
  assert.equal(wikidataUrl.searchParams.get("limit"), "30");

  const institutionUrl = new URL(buildOpenAlexInstitutionSearchUrl("Wellcome Trust", 40));
  assert.equal(institutionUrl.origin, "https://api.openalex.org");
  assert.equal(institutionUrl.pathname, "/institutions");
  assert.equal(institutionUrl.searchParams.get("search"), "Wellcome Trust");
  assert.equal(institutionUrl.searchParams.get("per-page"), "40");

  const funderUrl = new URL(buildOpenAlexFunderSearchUrl("Gates Foundation"));
  assert.equal(funderUrl.pathname, "/funders");
  assert.equal(funderUrl.searchParams.get("mailto"), "contact@moraltrade.org");
});

test("organization query scoring rewards exact, prefix, phrase, and token matches", () => {
  assert.ok(
    scoreOrganizationQueryMatch("Against Malaria Foundation", ["AMF"], "AMF") >
      scoreOrganizationQueryMatch("Against Malaria Foundation", [], "Malaria"),
  );
  assert.ok(
    scoreOrganizationQueryMatch("American National Red Cross", [], "Red Cross") > 600,
  );
  assert.equal(scoreOrganizationQueryMatch("Unrelated Organization", [], "Malaria"), 0);
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
    countryCode: "US",
  });
  assert.match(results[1]?.description ?? "", /^501\(c\)\(4\) organization/);
});

test("Wikidata search keeps global organizations and rejects non-organizations", () => {
  const results = mapWikidataOrganizations(
    {
      search: [
        {
          id: "Q219415",
          label: "Oxfam",
          description: "international charitable organization",
          aliases: ["Oxfam International"],
          concepturi: "https://www.wikidata.org/entity/Q219415",
        },
        {
          id: "Q42",
          label: "Douglas Adams",
          description: "English writer and humorist",
        },
        {
          id: "Q123",
          label: "Oxfam documentary",
          description: "2019 documentary film",
        },
      ],
    },
    "Oxfam",
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.label, "Oxfam");
  assert.equal(results[0]?.source, "Wikidata");
  assert.equal(results[0]?.organizationId, "Q219415");
  assert.deepEqual(results[0]?.aliases, ["Oxfam International"]);
});

test("OpenAlex adds global nonprofit, education, healthcare, and funder records", () => {
  const institutions = mapOpenAlexInstitutions(
    {
      results: [
        {
          id: "https://openalex.org/I1",
          ror: "https://ror.org/01",
          display_name: "Wellcome Trust",
          display_name_acronyms: ["WT"],
          display_name_alternatives: ["The Wellcome Trust"],
          country_code: "GB",
          type: "nonprofit",
          homepage_url: "https://wellcome.org/",
          works_count: 12_000,
          relevance_score: 100,
          geo: { city: "London", country: "United Kingdom" },
        },
        {
          id: "https://openalex.org/I2",
          display_name: "Commercial Research Company",
          country_code: "US",
          type: "company",
          works_count: 50_000,
        },
      ],
    },
    "Wellcome Trust",
  );

  assert.equal(institutions.length, 1);
  assert.equal(institutions[0]?.label, "Wellcome Trust");
  assert.equal(institutions[0]?.source, "OpenAlex / ROR");
  assert.match(institutions[0]?.description ?? "", /Nonprofit institution · London/);
  assert.equal(institutions[0]?.website, "https://wellcome.org/");

  const funders = mapOpenAlexFunders(
    {
      results: [
        {
          id: "https://openalex.org/F1",
          display_name: "Bill & Melinda Gates Foundation",
          alternate_titles: ["Gates Foundation"],
          country_code: "US",
          homepage_url: "https://www.gatesfoundation.org/",
          grants_count: 50_000,
        },
      ],
    },
    "Gates Foundation",
  );

  assert.equal(funders.length, 1);
  assert.equal(funders[0]?.source, "OpenAlex funders");
  assert.deepEqual(funders[0]?.aliases, ["Gates Foundation"]);
  assert.match(funders[0]?.description ?? "", /Research or philanthropic funder/);
});

test("multi-registry results deduplicate the same organization and preserve richer identifiers", () => {
  const merged = mergeOrganizationSuggestions([
    [
      {
        label: "Oxfam",
        description: "International charitable organization",
        aliases: ["Oxfam International"],
        kind: "organization",
        source: "Wikidata",
        ein: null,
        profileUrl: "https://www.wikidata.org/wiki/Q219415",
        subsection: null,
        score: 900,
        organizationId: "Q219415",
        countryCode: null,
      },
    ],
    [
      {
        label: "Oxfam",
        description: "Nonprofit institution · Oxford, United Kingdom",
        aliases: ["Oxford Committee for Famine Relief"],
        kind: "organization",
        source: "OpenAlex / ROR",
        ein: null,
        profileUrl: "https://ror.org/example",
        subsection: null,
        score: 940,
        organizationId: "https://ror.org/example",
        countryCode: "GB",
        website: "https://www.oxfam.org/",
      },
    ],
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.source, "OpenAlex / ROR");
  assert.equal(merged[0]?.website, "https://www.oxfam.org/");
  assert.ok(merged[0]?.aliases.includes("Oxfam International"));
  assert.ok(merged[0]?.aliases.includes("Oxford Committee for Famine Relief"));
});
