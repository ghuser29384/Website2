import assert from "node:assert/strict";
import test from "node:test";

import { GENERIC_CREATE_NO_TRADE_BASELINE } from "@/lib/trade-safeguards";

import { validateCreatePayloadWithSafeguards } from "./safeguards";
import { CREATE_INTERFACE_VERSION } from "./types";

function payload() {
  return {
    interfaceVersion: CREATE_INTERFACE_VERSION,
    submissionKey: "create-safeguards-unit",
    cause: "Animal welfare",
    requestKind: "commitment",
    fundMode: null,
    dacPath: null,
    requestAction: "Eat four vegetarian meals this week",
    existingPoolAmount: "",
    existingPoolCurrency: "USD",
    offers: [
      {
        id: "money",
        title: "Funding",
        options: [
          {
            amount: "25.00",
            currency: "USD",
            schedule: "one-time",
            destination: "organization",
            organization: "Against Malaria Foundation",
            allowAlternatives: false,
            donationMode: "direct",
            matchRatio: "",
            matchTarget: "",
          },
        ],
      },
    ],
    pool: null,
    safeguards: {
      noTradeBaseline:
        "Without this proposal, the counterparty expects to eat the same number of meat-based meals as usual.",
      baselineConfirmed: true,
      noManufacturedLeverage: true,
      affectedPartyStatus: "none_identified",
      affectedPartyPlan: "",
      capacity: "individual",
    },
  };
}

test("attaches validated safeguards to the durable Create source payload", () => {
  const result = validateCreatePayloadWithSafeguards(payload());

  assert.equal(result.kind, "pledge_swap");
  assert.equal(result.safeguards.capacity, "individual");
  assert.equal(result.source.safeguards.baselineConfirmed, true);
  assert.match(result.source.safeguards.noTradeBaseline, /Without this proposal/);
  assert.match(result.payloadHash, /^[0-9a-f]{64}$/);
});

test("requires a concrete baseline and both anti-manufacturing confirmations", () => {
  const generic = payload();
  generic.safeguards.noTradeBaseline = GENERIC_CREATE_NO_TRADE_BASELINE;
  assert.throws(
    () => validateCreatePayloadWithSafeguards(generic),
    /specific default/i,
  );

  const unconfirmed = payload();
  unconfirmed.safeguards.baselineConfirmed = false;
  assert.throws(
    () => validateCreatePayloadWithSafeguards(unconfirmed),
    /baseline is genuine/i,
  );

  const manufactured = payload();
  manufactured.safeguards.noManufacturedLeverage = false;
  assert.throws(
    () => validateCreatePayloadWithSafeguards(manufactured),
    /manufactured or escalated/i,
  );
});

test("requires an affected-party plan when a possible externality is identified", () => {
  const input = payload();
  input.safeguards.affectedPartyStatus = "review_required";

  assert.throws(
    () => validateCreatePayloadWithSafeguards(input),
    /impact, standing, and remedy plan/i,
  );

  input.safeguards.affectedPartyPlan =
    "A local resident can contact the safety operator, and implementation pauses pending a remedy review.";
  const result = validateCreatePayloadWithSafeguards(input);
  assert.equal(result.safeguards.affectedPartyStatus, "review_required");
});

test("rejects organizational representation in the current individual-only Create flow", () => {
  const input = payload();
  input.safeguards.capacity = "organization";

  assert.throws(
    () => validateCreatePayloadWithSafeguards(input),
    /individual capacity only/i,
  );
});
