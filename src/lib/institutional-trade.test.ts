import assert from "node:assert/strict";
import test from "node:test";

import {
  INDIVIDUAL_INSTITUTIONAL_NAV,
  ORGANIZATION_INSTITUTIONAL_NAV,
  canBindInstitutionalPartyAsSelf,
  canTransitionInstitutionalDeal,
  hashInstitutionalTerms,
  institutionalDealHref,
  institutionalIndividualDealHref,
  institutionalOrganizationDealHref,
  interpretInstitutionalCommand,
  isPersonalInstitutionalCapacity,
  parseInstitutionalMoneyToCents,
  stableInstitutionalJson,
  validateSupportedInstitutionalWebhookEvents,
} from "./institutional-trade";

test("stable institutional hashes ignore object insertion order", () => {
  const first = { b: 2, a: { y: true, x: [3, 2, 1] } };
  const second = { a: { x: [3, 2, 1], y: true }, b: 2 };
  assert.equal(stableInstitutionalJson(first), stableInstitutionalJson(second));
  assert.equal(hashInstitutionalTerms(first), hashInstitutionalTerms(second));
  assert.match(hashInstitutionalTerms(first), /^[0-9a-f]{64}$/);
});

test("deal transitions fail closed", () => {
  assert.equal(canTransitionInstitutionalDeal("draft", "exploratory"), true);
  assert.equal(canTransitionInstitutionalDeal("completed", "execution"), false);
  assert.equal(canTransitionInstitutionalDeal("unknown", "signed"), false);
});

test("money parsing remains exact to cents", () => {
  assert.equal(parseInstitutionalMoneyToCents("100"), 10_000);
  assert.equal(parseInstitutionalMoneyToCents("0.01"), 1);
  assert.throws(() => parseInstitutionalMoneyToCents("1.001"), /two decimal places/);
  assert.throws(() => parseInstitutionalMoneyToCents("-1"), /non-negative/);
});

test("Command remains draft-only and never claims binding authority", () => {
  const draft = interpretInstitutionalCommand("Prepare a board approval packet for the secondment");
  assert.equal(draft.intent, "prepare_board_packet");
  assert.equal(draft.binding, false);
  assert.equal(draft.requiresConfirmation, true);
  assert.match(draft.explanation, /cannot approve, sign, reserve funds, activate a pool/i);
});

test("webhook event allowlist rejects wildcards and unknown events", () => {
  assert.deepEqual(validateSupportedInstitutionalWebhookEvents(["deal.signed", "deal.signed", "pool.activated"]), ["deal.signed", "pool.activated"]);
  assert.throws(() => validateSupportedInstitutionalWebhookEvents(["*"]), /unsupported institutional webhook event/i);
  assert.throws(() => validateSupportedInstitutionalWebhookEvents([]), /select at least one/i);
});


test("personal institutional capacity never inherits organization administration", () => {
  assert.equal(isPersonalInstitutionalCapacity("individual"), true);
  assert.equal(isPersonalInstitutionalCapacity("service_provider"), true);
  assert.equal(isPersonalInstitutionalCapacity("verifier"), true);
  assert.equal(isPersonalInstitutionalCapacity("organization"), false);

  assert.equal(
    institutionalDealHref({ id: "deal-1", lead_capacity: "individual", lead_organization_id: null }),
    "/institutions/individual/deals/deal-1",
  );
  assert.equal(
    institutionalDealHref({ id: "deal-2", lead_capacity: "organization", lead_organization_id: "org-1" }),
    "/institutions/org-1/deals/deal-2",
  );
  assert.equal(institutionalIndividualDealHref("deal-2"), "/institutions/individual/deals/deal-2");
  assert.equal(institutionalOrganizationDealHref("org-1", "deal-1"), "/institutions/org-1/deals/deal-1");

  assert.equal(
    canBindInstitutionalPartyAsSelf("person-1", { party_capacity: "individual", profile_id: "person-1" }),
    true,
  );
  assert.equal(
    canBindInstitutionalPartyAsSelf("person-1", { party_capacity: "individual", profile_id: "person-2" }),
    false,
  );
  assert.equal(
    canBindInstitutionalPartyAsSelf("person-1", { party_capacity: "organization", profile_id: "person-1" }),
    false,
  );

  for (const organizationOnly of ["Mandates", "Approvals", "Funds", "Integrations"]) {
    assert.equal(INDIVIDUAL_INSTITUTIONAL_NAV.includes(organizationOnly as never), false);
    assert.equal(ORGANIZATION_INSTITUTIONAL_NAV.includes(organizationOnly as never), true);
  }
});
