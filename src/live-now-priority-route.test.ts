import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const liveNowBridge = readFileSync("public/moral-trade-live-now.js", "utf8");
const priorityRoute = readFileSync("public/moral-trade-live-priority-route.js", "utf8");

test("the home priority invitation stays optional and opens the Complete Profile page", () => {
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
      location: { pathname: "/" },
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

  assert.equal(context.rendered.match(/href="\/complete-profile"/g)?.length, 1);
  assert.match(context.rendered, /What matters to you\?/);
  assert.match(context.rendered, /Choose the causes you care about to help us suggest relevant opportunities\./);
  assert.match(context.rendered, /You can also explore without setting priorities\./);
  assert.match(context.rendered, /Viewing activity only helps personalize suggestions if you turn it on\./);
  assert.match(context.rendered, /Choose priorities →/);
  assert.match(context.rendered, /href="\/discover">Explore opportunities →/);
  assert.doesNotMatch(context.rendered, /Profile needs priorities|data-mt-live-now-recommendation/);
  assert.doesNotMatch(context.rendered, /Review profile →|Profile basis|Feed rule/);
  assert.doesNotMatch(context.rendered, /\/profile\/priorities/);
});
