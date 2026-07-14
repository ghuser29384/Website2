import assert from "node:assert/strict";
import test from "node:test";

import { filterWishRegistryExamplePreviews } from "@/lib/wish-registry";

const examplePreviews = [
  {
    causes: ["Animal welfare", "Global poverty"],
    location: "Public preview",
    name: "Animal welfare and poverty donor",
    openness: ["Payment-open", "Pledge-open"],
    participantKind: "individual",
    preview:
      "Interested in reciprocal pledge swaps between animal welfare actions and evidence-backed global poverty donations.",
  },
  {
    causes: ["Existential risk", "Public health", "Institutions"],
    location: "Remote",
    name: "Risk and health working group",
    openness: ["Pledge-open"],
    participantKind: "collective",
    preview:
      "Looking for counterparties who value public health, biosecurity, and institution-building enough to test shared moral public goods.",
  },
  {
    causes: ["Climate", "Public health", "Community service"],
    location: "Regional preview",
    name: "Climate and community-service participant",
    openness: ["Pledge-open"],
    participantKind: "individual",
    preview:
      "Open to bounded trades pairing climate-friendly habit changes with local public-health or community-service commitments.",
  },
] as const;

test("wish registry example previews respect cause and openness filters", () => {
  assert.deepEqual(
    filterWishRegistryExamplePreviews(examplePreviews, {
      cause: "Animal welfare",
      opennessToPledges: true,
      query: "animal",
    }).map((preview) => preview.name),
    ["Animal welfare and poverty donor"],
  );

  assert.deepEqual(
    filterWishRegistryExamplePreviews(examplePreviews, {
      cause: "Public health",
      opennessToPayment: true,
    }).map((preview) => preview.name),
    [],
  );
});

test("wish registry example previews stay unfiltered without search inputs", () => {
  assert.equal(filterWishRegistryExamplePreviews(examplePreviews).length, examplePreviews.length);
});
