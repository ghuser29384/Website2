import assert from "node:assert/strict";
import test from "node:test";

import { GET as verifyPublicReceiptRoute } from "@/app/api/moral-trade/public-receipts/[receiptId]/verify/route";

test("public receipt verification route returns contract-only validation without private claim data", async () => {
  const response = await verifyPublicReceiptRoute(
    new Request("http://localhost/api/moral-trade/public-receipts/receipt-card-1/verify"),
    {
      params: Promise.resolve({
        receiptId: "receipt-card-1",
      }),
    },
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.receiptId, "receipt-card-1");
  assert.equal(body.verificationStatus, "contract_only_no_public_claim_loaded");
  assert.equal(body.publicContract.participantOptInRequired, true);
  assert.equal(body.publicContract.gamificationAndRankingAllowed, false);
  assert.equal(serialized.includes("private_note"), false);
  assert.equal(serialized.includes("raw_evidence"), false);
  assert.equal(serialized.includes("contact"), false);
});

test("public receipt verification route rejects invalid receipt ids", async () => {
  const response = await verifyPublicReceiptRoute(
    new Request("http://localhost/api/moral-trade/public-receipts/bad/verify"),
    {
      params: Promise.resolve({
        receiptId: "bad",
      }),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.ok(body.blockers.includes("invalid_receipt_id"));
});
