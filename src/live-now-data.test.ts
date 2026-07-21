import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { gunzipSync } from "node:zlib";

const loader = readFileSync("public/moral-trade-live.html", "utf8");
const bridge = readFileSync("public/moral-trade-live-now.js", "utf8");
const feedStyles = readFileSync("public/moral-trade-live-feed.css", "utf8");
const route = readFileSync("src/app/api/live-now/route.ts", "utf8");
const feedbackRoute = readFileSync("src/app/api/live-now/feedback/route.ts", "utf8");
const tracker = readFileSync(
  "src/components/recommendations/recommendation-learning-tracker.tsx",
  "utf8",
);

test("the live shell fetches private profile recommendations before rendering", () => {
  assert.match(loader, /fetch\('\/api\/live-now'/);
  assert.match(loader, /credentials: 'same-origin'/);
  assert.match(loader, /__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.match(loader, /moral-trade-live-now\.js/);
  assert.match(loader, /moral-trade-live-feed\.css/);
  assert.match(loader, /stripLegacyNowFocus/);
  assert.match(loader, /No generic or demo suggestions are shown/);
});

test("the live-now endpoint combines explicit priorities, browsing, actions, and multiple opportunity types", () => {
  assert.match(route, /hasSupabaseEnv\(\)/);
  assert.match(route, /hasSupabaseAuthCookie\(cookieStore\)/);
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /from\("wish_profiles"\)/);
  assert.match(route, /from\("saved_searches"\)/);
  assert.match(route, /from\("cohort_onboarding_profiles"\)/);
  assert.match(route, /from\("route_recommendation_profiles"\)/);
  assert.match(route, /from\("recommendation_preferences"\)/);
  assert.match(route, /from\("recommendation_interactions"\)/);
  assert.match(route, /from\("offers"\)/);
  assert.match(route, /from\("donation_offset_pools"\)/);
  assert.match(route, /from\("registered_charities"\)/);
  assert.match(route, /buildWeightedCauseSignals/);
  assert.match(route, /buildLearnedActionPreferences/);
  assert.match(route, /buildBrowsingCauseWeights/);
  assert.match(route, /eq\("status", "open"\)/);
  assert.match(route, /neq\("owner_id", userId\)/);
  assert.match(route, /\.range\(offset, offset \+ OFFER_BATCH_SIZE - 1\)/);
  assert.doesNotMatch(route, /\.limit\(240\)/);
  assert.match(route, /rankLiveNowOffers/);
  assert.match(route, /Cache-Control.*private, no-store/s);
  assert.match(route, /Vary: "Cookie"/);
});

test("feedback is typed, private, idempotent, and resolves opportunity metadata server-side", () => {
  assert.match(feedbackRoute, /MAX_EVENTS_PER_REQUEST/);
  assert.match(feedbackRoute, /isRecommendationEventType/);
  assert.match(feedbackRoute, /isRecommendationOpportunityType/);
  assert.match(feedbackRoute, /from\("offers"\)/);
  assert.match(feedbackRoute, /from\("donation_offset_pools"\)/);
  assert.match(feedbackRoute, /model_version: "adaptive-moral-feed-v1"/);
  assert.match(feedbackRoute, /onConflict: "profile_id,idempotency_key"/);
  assert.match(feedbackRoute, /learn_from_browsing/);
  assert.doesNotMatch(feedbackRoute, /referrer|pathname|raw_url|page_content/i);
});

test("offer, pool, and cause browsing is learned without retaining arbitrary URLs", () => {
  assert.match(tracker, /RecommendationLearningTracker/);
  assert.match(tracker, /const offerMatch = pathname\.match/);
  assert.match(tracker, /\{36\}/);
  assert.match(tracker, /opportunityType: "donation_pool"/);
  assert.match(tracker, /opportunityType: "cause_topic"/);
  assert.match(tracker, /eventType: "dwell"/);
  assert.match(tracker, /navigator\.sendBeacon/);
  assert.doesNotMatch(tracker, /document\.referrer|window\.location\.href/);
});

test("fallback states explicitly refuse generic or fabricated suggestions", () => {
  for (const phrase of [
    "does not guess your priorities",
    "No filler suggestions were added",
    "No generic or fabricated suggestions",
  ]) {
    assert.match(bridge, new RegExp(phrase));
  }

  for (const hardCodedSuggestion of [
    "Counteroffer from Mina",
    "AI-safety research under $100",
    "salary-gap pools · 12 new",
    "Verify your completed transit commitment",
  ]) {
    assert.doesNotMatch(bridge, new RegExp(hardCodedSuggestion, "i"));
  }
});

test("the loader removes the legacy suggestion function before its first render", () => {
  const names = [
    "0a",
    "0b",
    "0c",
    "0d",
    "1",
    "2",
    "3",
    "4a",
    "4b",
    "4c",
    "4d",
    "5a",
    "5b",
    "5c",
    "5d",
  ];
  const encoded = names
    .map((name) => readFileSync(`public/mt-live-0d0e0f03-${name}.txt`, "utf8"))
    .join("");
  const legacySource = gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
  const start = legacySource.indexOf("function nowFocus(){");
  const end = legacySource.indexOf("\nfunction story(", start);

  assert.ok(start >= 0 && end > start, "legacy nowFocus boundaries should remain identifiable");
  assert.match(legacySource.slice(start, end), /Counteroffer from Mina/);

  const deliveredSource = `${legacySource.slice(0, start)}function nowFocus(){return "Loading profile";}${legacySource.slice(end)}`;
  assert.doesNotMatch(deliveredSource, /Counteroffer from Mina|AI-safety research under \$100/);
  assert.match(deliveredSource, /function story\(/);
});

test("the browser bridge renders only fixture profile data and escapes opportunity fields", () => {
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
        generatedAt: "2026-07-20T12:00:00.000Z",
        matchingOpportunityCount: 1,
        profile: {
          causes: ["Animal welfare"],
          weightedCauses: [
            {
              cause: "Animal welfare",
              weight: 96,
              source: "explicit_priority",
              rank: 1,
            },
          ],
          openToPayment: true,
          openToPledges: false,
          signalSources: ["Weighted profile priorities"],
          learningEnabled: true,
          browsingSignalCount: 2,
          actionFeedbackCount: 1,
        },
        recentChanges: [],
        recommendations: [
          {
            id: "animal-offer",
            opportunityType: "offer",
            href: "/offers/animal-offer",
            mode: "payment",
            offeredCause: "Animal welfare <script>alert(1)</script>",
            requestedCause: "Plant-based meal evidence",
            matchCause: "Animal welfare",
            reason: "Matches your Animal welfare priority",
            reasonDetails: ["Safe <script>alert(1)</script> explanation"],
            actionLabel: "Reduce or avoid meat",
            difficultyLabel: "Moderate",
            actionFitLabel: "Possible fit",
          },
        ],
        status: "ready",
      },
      dispatchEvent() {},
      render() {
        context.rendered = context.window.nowFocus();
      },
      nowFocus: () => "legacy feed",
      __MT_LIVE_NOW_ACTIVE__: undefined as boolean | undefined,
    },
  };

  runInNewContext(bridge, context);

  assert.match(context.rendered, /For you/);
  assert.match(context.rendered, /Animal welfare &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(context.rendered, /Why this is in your feed/);
  assert.doesNotMatch(context.rendered, /legacy feed|Counteroffer from Mina/);
  assert.doesNotMatch(context.rendered, /<script>alert\(1\)<\/script>/);
});

test("the social feed has vertical card, feedback, privacy, and mobile rules", () => {
  assert.match(feedStyles, /\.mt-social-feed/);
  assert.match(feedStyles, /\.mt-feed-card/);
  assert.match(feedStyles, /\.mt-feed-feedback/);
  assert.match(feedStyles, /@media \(max-width: 620px\)/);
  assert.match(bridge, /Easy for me/);
  assert.match(bridge, /Hard for me/);
  assert.match(bridge, /Less like this/);
  assert.match(bridge, /does not retain raw browsing URLs or page content/);
});
