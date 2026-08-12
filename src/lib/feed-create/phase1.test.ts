import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateFeedCreateSourceRecords,
  feedCreateMatchContextStorageKey,
  feedCreateRequestFromSearchParams,
  feedCreateReturnTo,
  isValidFeedCreateRequest,
  type FeedCreateRequest,
} from "./phase1";

const VIEWER_A = "11111111-1111-4111-8111-111111111111";
const VIEWER_B = "22222222-2222-4222-8222-222222222222";
const OWNER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OFFER_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const OFFER_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const REQUEST_A = "cccccccc-1111-4111-8111-cccccccccccc";
const REQUEST_B = "dddddddd-2222-4222-8222-dddddddddddd";
const EXPOSURE_A = "eeeeeeee-1111-4111-8111-eeeeeeeeeeee";
const EXPOSURE_B = "ffffffff-2222-4222-8222-ffffffffffff";

function request(overrides: Partial<FeedCreateRequest> = {}): FeedCreateRequest {
  return {
    opportunityType: "offer",
    opportunityId: OFFER_A,
    exposureRequestId: REQUEST_A,
    sourceRevision: 3,
    ...overrides,
  };
}

function exposure(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPOSURE_A,
    profile_id: VIEWER_A,
    request_id: REQUEST_A,
    opportunity_type: "offer",
    opportunity_id: OFFER_A,
    owner_id: OWNER_A,
    rank: 1,
    was_shown: true,
    ...overrides,
  };
}

function sourceOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: OFFER_A,
    owner_id: OWNER_A,
    owner_alias: "Maya Chen",
    mode: "pledge",
    offered_cause: "Global poverty reduction",
    requested_cause: "Lower-carbon transport",
    offer_action: "Donate $100 to an agreed evidence-backed charity.",
    request_action: "Replace ten car trips with public transit.",
    verification: "Dated transit receipts or a contemporaneous travel log.",
    duration: "Through August 31, 2026",
    status: "open",
    workflow_status: "published",
    published_at: "2026-07-30T12:00:00.000Z",
    closed_at: null,
    deleted_at: null,
    terms_version: 3,
    ...overrides,
  };
}

function requireSuccess(
  result: ReturnType<typeof evaluateFeedCreateSourceRecords>,
) {
  if (!result.ok) throw new Error(result.failure.message);
  return result.source;
}

function requireFailure(
  result: ReturnType<typeof evaluateFeedCreateSourceRecords>,
  code: string,
) {
  if (result.ok) throw new Error("Expected a Feed-to-Create failure.");
  assert.equal(result.failure.code, code);
}

test("parses and round-trips the exact receipt-bound Feed-to-Create request", () => {
  const parsed = feedCreateRequestFromSearchParams({
    fromFeed: "1",
    sourceType: "offer",
    sourceId: OFFER_A,
    exposureRequestId: REQUEST_A,
    sourceRevision: "3",
  });
  assert.deepEqual(parsed, request());
  assert.equal(isValidFeedCreateRequest(parsed!), true);
  assert.equal(
    feedCreateReturnTo(parsed!),
    `/trades/new?fromFeed=1&sourceType=offer&sourceId=${OFFER_A}&exposureRequestId=${REQUEST_A}&sourceRevision=3`,
  );
  assert.equal(
    feedCreateMatchContextStorageKey(parsed!),
    `moral_trade_feed_create_context_v1:${REQUEST_A}:offer:${OFFER_A}:3`,
  );
});

test("fails closed for a malformed or non-offer request", () => {
  const malformed = feedCreateRequestFromSearchParams({
    fromFeed: "1",
    sourceType: "donation_pool",
    sourceId: OFFER_A,
    exposureRequestId: REQUEST_A,
    sourceRevision: "3",
  });
  assert.ok(malformed);
  assert.equal(isValidFeedCreateRequest(malformed!), false);
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: malformed!,
      viewerId: VIEWER_A,
      exposure: exposure(),
      sourceOffer: sourceOffer(),
    }),
    "invalid_request",
  );
});

test("two authenticated viewers receive distinct source, counterparty, Feed key, and receipt projections", () => {
  const resultA = requireSuccess(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure(),
      sourceOffer: sourceOffer(),
    }),
  );
  const requestB = request({
    opportunityId: OFFER_B,
    exposureRequestId: REQUEST_B,
    sourceRevision: 7,
  });
  const resultB = requireSuccess(
    evaluateFeedCreateSourceRecords({
      request: requestB,
      viewerId: VIEWER_B,
      exposure: exposure({
        id: EXPOSURE_B,
        profile_id: VIEWER_B,
        request_id: REQUEST_B,
        opportunity_id: OFFER_B,
        owner_id: OWNER_B,
      }),
      sourceOffer: sourceOffer({
        id: OFFER_B,
        owner_id: OWNER_B,
        owner_alias: "Ravi Singh",
        offered_cause: "Animal welfare",
        requested_cause: "AI safety research",
        offer_action: "Fund one independently reviewed animal-welfare intervention.",
        request_action: "Review an AI-governance draft for two hours.",
        terms_version: 7,
      }),
    }),
  );

  assert.equal(resultA.request.opportunityId, OFFER_A);
  assert.equal(resultB.request.opportunityId, OFFER_B);
  assert.notEqual(resultA.exposureId, resultB.exposureId);
  assert.notEqual(resultA.counterpartyName, resultB.counterpartyName);
  assert.notEqual(resultA.matchContextStorageKey, resultB.matchContextStorageKey);
  assert.equal(resultA.initialValues.offeredCause, "Lower-carbon transport");
  assert.equal(resultA.initialValues.requestedCause, "Global poverty reduction");
  assert.equal(
    resultA.initialValues.proposedAction,
    "Replace ten car trips with public transit.",
  );
  assert.equal(
    resultA.initialValues.requestedAction,
    "Donate $100 to an agreed evidence-backed charity.",
  );
  assert.equal(resultB.initialValues.offeredCause, "AI safety research");
  assert.equal(resultB.initialValues.requestedCause, "Animal welfare");
});

test("retains only public source terms and never projects matching or private ranking data into the draft", () => {
  const result = requireSuccess(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure({
        prediction: { paretoSuccess: 0.92 },
        feature_snapshot: { privatePreferenceVector: "must-not-copy" },
      }),
      sourceOffer: sourceOffer({
        private_matching_preferences: "must-not-copy",
        payment_method: "must-not-copy",
      }),
    }),
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /paretoSuccess|privatePreferenceVector|private_matching|payment_method/);
  assert.match(serialized, /Maya Chen/);
  assert.match(serialized, /Dated transit receipts/);
});

test("zero-data and spoofed-receipt users receive no source projection", () => {
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: null,
      sourceOffer: sourceOffer(),
    }),
    "receipt_missing",
  );
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_B,
      exposure: exposure(),
      sourceOffer: sourceOffer(),
    }),
    "receipt_missing",
  );
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure({ request_id: REQUEST_B }),
      sourceOffer: sourceOffer(),
    }),
    "receipt_missing",
  );
});

test("rejects the viewer's own offer and an exposure-owner mismatch", () => {
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure({ owner_id: VIEWER_A }),
      sourceOffer: sourceOffer({ owner_id: VIEWER_A }),
    }),
    "source_is_own",
  );
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure({ owner_id: OWNER_B }),
      sourceOffer: sourceOffer(),
    }),
    "source_owner_mismatch",
  );
});

test("rejects stale, closed, unpublished, payment, redirect, and incomplete sources", () => {
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request({ sourceRevision: 2 }),
      viewerId: VIEWER_A,
      exposure: exposure(),
      sourceOffer: sourceOffer(),
    }),
    "source_stale",
  );
  for (const changes of [
    { status: "closed", closed_at: "2026-07-30T13:00:00.000Z" },
    { workflow_status: "draft", published_at: null },
    { mode: "payment" },
    { mode: "offset" },
  ]) {
    requireFailure(
      evaluateFeedCreateSourceRecords({
        request: request(),
        viewerId: VIEWER_A,
        exposure: exposure(),
        sourceOffer: sourceOffer(changes),
      }),
      "source_ineligible",
    );
  }
  requireFailure(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure(),
      sourceOffer: sourceOffer({ verification: "" }),
    }),
    "source_incomplete",
  );
});

test("surfaces the active duplicate count as a warning rather than silently suppressing another draft", () => {
  const result = requireSuccess(
    evaluateFeedCreateSourceRecords({
      request: request(),
      viewerId: VIEWER_A,
      exposure: exposure(),
      sourceOffer: sourceOffer(),
      duplicateDraftCount: 2,
    }),
  );
  assert.equal(result.duplicateDraftCount, 2);
});
