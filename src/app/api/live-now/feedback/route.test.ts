import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { DELETE, POST } from "./route";

const previousDisableSupabase = process.env.MORAL_TRADE_DISABLE_SUPABASE;

before(() => {
  process.env.MORAL_TRADE_DISABLE_SUPABASE = "true";
});

after(() => {
  if (previousDisableSupabase === undefined) {
    delete process.env.MORAL_TRADE_DISABLE_SUPABASE;
  } else {
    process.env.MORAL_TRADE_DISABLE_SUPABASE = previousDisableSupabase;
  }
});

function feedbackRequest(body: unknown) {
  return new Request("http://localhost/api/live-now/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("anonymous passive recommendation telemetry is a non-storing 204 no-op", async () => {
  const response = await POST(
    feedbackRequest({
      events: [
        {
          opportunityType: "offer",
          opportunityId: "82000000-0000-4000-8000-000000000001",
          eventType: "open",
          dwellMs: 0,
          idempotencyKey: "open:test",
          metadata: { surface: "offer_detail" },
        },
        {
          opportunityType: "offer",
          opportunityId: "82000000-0000-4000-8000-000000000001",
          eventType: "dwell",
          dwellMs: 4_000,
          idempotencyKey: "dwell:test",
          metadata: { surface: "offer_detail" },
        },
      ],
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});

test("anonymous active signals and preference mutations remain unauthorized", async (t) => {
  const cases = [
    {
      name: "active save",
      body: {
        events: [
          {
            opportunityType: "offer",
            opportunityId: "82000000-0000-4000-8000-000000000001",
            eventType: "save",
            idempotencyKey: "save:test",
          },
        ],
      },
    },
    {
      name: "learning preference",
      body: {
        learningEnabled: false,
        events: [
          {
            opportunityType: "offer",
            opportunityId: "82000000-0000-4000-8000-000000000001",
            eventType: "open",
            idempotencyKey: "open:preference-test",
          },
        ],
      },
    },
    {
      name: "exploration preference",
      body: {
        explorationPercent: 5,
        events: [
          {
            opportunityType: "offer",
            opportunityId: "82000000-0000-4000-8000-000000000001",
            eventType: "open",
            idempotencyKey: "open:exploration-test",
          },
        ],
      },
    },
    { name: "empty batch", body: { events: [] } },
    {
      name: "mixed malformed passive batch",
      body: {
        events: [
          {
            opportunityType: "offer",
            opportunityId: "82000000-0000-4000-8000-000000000001",
            eventType: "open",
            idempotencyKey: "open:mixed-test",
          },
          {},
        ],
      },
    },
    { name: "future authenticated operation", body: { events: [], clearHistory: true } },
  ] as const;

  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      const response = await POST(feedbackRequest(fixture.body));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { authenticated: false });
    });
  }
});

test("anonymous malformed telemetry and learned-signal deletion remain unauthorized", async () => {
  const malformed = await POST(
    new Request("http://localhost/api/live-now/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }),
  );
  assert.equal(malformed.status, 401);

  const deletion = await DELETE();
  assert.equal(deletion.status, 401);
  assert.deepEqual(await deletion.json(), { authenticated: false });
});
