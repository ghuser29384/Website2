import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/commitments/page.tsx", "utf8");
const model = readFileSync("src/lib/commitments-portfolio.ts", "utf8");
const share = readFileSync("src/components/commitments/impact-share-button.tsx", "utf8");

test("Commitments renders a live, cross-mechanism portfolio instead of the visual fixture", () => {
  for (const required of [
    "Additional resources you caused.",
    "Portfolio",
    "Ledger",
    "Completed",
    "Calendar",
    "If everything succeeds",
    "You committed",
    "Total coordinated",
    "Additional resources attributed",
  ]) {
    assert.ok(page.includes(required), `missing required production label: ${required}`);
  }

  for (const synthetic of [
    "$540",
    "$18,760",
    "Counteroffer received",
    "Salary-gap pool at 81%",
    "Factory-farming redirect",
  ]) {
    assert.equal(page.includes(synthetic), false, `visual-fixture value leaked into production source: ${synthetic}`);
  }
});

test("Commitments data is participant-scoped, real-record based, and noncustodial", () => {
  for (const required of [
    "listAgreementsForUser",
    "listCartItems",
    "listProfileOffers",
    "loadMpgfParticipantState",
    "donation_offset_matches",
    "attributedAdditionalResources",
    "expectedMarginalEffect",
  ]) {
    assert.ok(model.includes(required), `missing canonical data/accounting integration: ${required}`);
  }

  for (const forbidden of [
    "createServiceClient",
    "SUPABASE_SERVICE_ROLE_KEY",
    "5% wallet bonus",
    "wallet_balance",
    "demo commitments",
  ]) {
    assert.equal(model.includes(forbidden), false, `forbidden production dependency or synthetic fallback: ${forbidden}`);
  }

  assert.ok(share.includes("navigator.share"));
  assert.ok(share.includes("navigator.clipboard"));
});

test("Commitments dates are deterministic on the server and local to the visitor", () => {
  assert.ok(page.includes("LocalDateTime"));
  assert.equal(page.includes("Intl.DateTimeFormat"), false);
  assert.equal(page.includes("Date.now()"), false);
});
