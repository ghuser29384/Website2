import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const liveNowBridge = readFileSync("public/moral-trade-live-now.js", "utf8");
const priorityRoute = readFileSync("public/moral-trade-live-priority-route.js", "utf8");

test("the home Set priorities links open the Complete Profile page", () => {
  const context = {
    CustomEvent: class CustomEvent {
      constructor(
        public type: string,
        public init: { detail: { status: string } },
      ) {}
    },
    URLSearchParams,
    document: {
      documentElement: { setAttribute() {} },
    },
    rendered: "",
    window: {
      __MT_LIVE_NOW_BOOTSTRAP__: {
        authenticated: true,
        generatedAt: "2026-07-21T15:30:00.000Z",
        matchingOpportunityCount: 0,
        profile: {
          causes: [],
          weightedCauses: [],
          openToPayment: null,
          openToPledges: null,
          signalSources: [],
          learningEnabled: true,
        },
        recentChanges: [],
        recommendations: [],
        status: "profile_incomplete",
      },
      dispatchEvent() {},
      render() {
        context.rendered = context.window.nowFocus();
      },
      nowFocus: () => "legacy feed",
      __MT_LIVE_NOW_ACTIVE__: undefined as boolean | undefined,
      __MT_LIVE_NOW_PRIORITY_ROUTE_ACTIVE__: undefined as boolean | undefined,
    },
  };

  runInNewContext(liveNowBridge, context);
  runInNewContext(priorityRoute, context);

  assert.equal(context.rendered.match(/href="\/complete-profile"/g)?.length, 2);
  assert.match(context.rendered, /Set priorities →/);
  assert.match(context.rendered, /Review profile →/);
  assert.doesNotMatch(context.rendered, /\/profile\/priorities/);
});
