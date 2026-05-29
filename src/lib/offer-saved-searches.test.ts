import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOfferSavedSearchPayload,
  normalizeOfferSavedSearchDraft,
  validateOfferSavedSearchPayload,
} from "./offer-saved-searches";

test("offer saved search draft normalizes public browse filters", () => {
  const draft = normalizeOfferSavedSearchDraft({
    cause: ["Animal welfare", "Global poverty"],
    format: "pledge",
    label: "",
    notifyOnLiveMatch: true,
    q: "vegetarian receipts",
    reviewState: "manual-review",
    sort: "efficient",
    tab: "examples",
  });
  const payload = buildOfferSavedSearchPayload({
    draft,
    mode: "validated",
  });
  const validation = validateOfferSavedSearchPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(draft.label, "Offers: vegetarian receipts");
  assert.deepEqual(draft.causes, ["Animal welfare", "Global poverty"]);
  assert.deepEqual(draft.filters.formats, ["pledge-swap"]);
  assert.deepEqual(draft.filters.reviewStates, ["manual-review-required"]);
  assert.equal(draft.filters.sort, "best-fit");
  assert.equal(draft.cadence, "weekly");
  assert.match(draft.sourceRoute, /^\/offers\?/);
  assert.match(draft.sourceRoute, /q=vegetarian\+receipts/);
  assert.match(draft.sourceRoute, /format=pledge-swap/);
});

test("offer saved search logged-out payload keeps a sign-in draft without stored id", () => {
  const draft = normalizeOfferSavedSearchDraft({
    cause: "Animal welfare",
    notifyOnLiveMatch: "false",
  });
  const payload = buildOfferSavedSearchPayload({
    draft,
    mode: "auth_required",
  });
  const validation = validateOfferSavedSearchPayload(payload);

  assert.equal(validation.status, "pass");
  assert.equal(payload.savedSearch.id, null);
  assert.equal(payload.savedSearch.cadence, "manual");
  assert.equal(payload.savedSearch.notifyOnLiveMatch, false);
  assert.ok(payload.signInUrl?.startsWith("/login?returnTo="));
  assert.ok(payload.publicContract.nonClaims.some((claim) => claim.includes("Logged-out")));
});

test("offer saved search validation blocks empty or private-looking payloads", () => {
  const emptyDraft = normalizeOfferSavedSearchDraft({});
  const emptyPayload = buildOfferSavedSearchPayload({
    draft: emptyDraft,
    mode: "validated",
  });
  const privateDraft = normalizeOfferSavedSearchDraft({
    q: "email me at person@example.com",
  });
  const privatePayload = buildOfferSavedSearchPayload({
    draft: privateDraft,
    mode: "validated",
  });

  assert.equal(validateOfferSavedSearchPayload(emptyPayload).status, "fail");
  assert.ok(
    validateOfferSavedSearchPayload(emptyPayload).blockers.some((blocker) =>
      blocker.includes("browse-scope"),
    ),
  );
  assert.equal(validateOfferSavedSearchPayload(privatePayload).status, "fail");
  assert.ok(
    validateOfferSavedSearchPayload(privatePayload).blockers.some((blocker) =>
      blocker.includes("privacy-and-nonclaims"),
    ),
  );
});
