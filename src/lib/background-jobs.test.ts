import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_OPPORTUNITY_DIGEST_SOURCE_KIND,
  buildBackgroundOpportunityDigestEmailCopy,
  buildBackgroundOpportunityDigestRows,
  isBackgroundOpportunityDigestDue,
} from "@/lib/background-jobs";

test("background opportunity digest cadence respects opt-outs and daily windows", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  assert.equal(
    isBackgroundOpportunityDigestDue({
      now,
      preference: {
        digest_cadence: "none",
        enabled: true,
        last_digest_at: null,
      },
    }),
    false,
  );
  assert.equal(
    isBackgroundOpportunityDigestDue({
      now,
      preference: {
        digest_cadence: "daily",
        enabled: true,
        last_digest_at: "2026-06-01T09:00:00.000Z",
      },
    }),
    false,
  );
  assert.equal(
    isBackgroundOpportunityDigestDue({
      now,
      preference: {
        digest_cadence: "weekly",
        enabled: true,
        last_digest_at: "2026-05-24T09:00:00.000Z",
      },
    }),
    true,
  );
});

test("background opportunity digest copy is generic and idempotently keyed", () => {
  const rows = buildBackgroundOpportunityDigestRows({
    candidates: [
      {
        briefIds: ["brief-1", "brief-2"],
        email: "member@example.org",
        preference: {
          digest_cadence: "daily",
          enabled: true,
          last_digest_at: null,
        },
        profileId: "profile-1",
      },
    ],
    now: new Date("2026-06-01T12:00:00.000Z"),
    siteUrl: "https://www.moraltrade.org",
  });
  const copy = buildBackgroundOpportunityDigestEmailCopy({
    briefCount: 2,
    siteUrl: "https://www.moraltrade.org",
  });
  const serialized = JSON.stringify({ copy, rows });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.source_kind, BACKGROUND_OPPORTUNITY_DIGEST_SOURCE_KIND);
  assert.equal(rows[0]?.source_id, "profile-1:2026-06-01");
  assert.match(copy.body, /2 background networking opportunity briefs/);
  assert.match(copy.body, /exact wishes, private asks, contact details, source notes/);
  assert.equal(serialized.includes("exact private wish"), false);
});
