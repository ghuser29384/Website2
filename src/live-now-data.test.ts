import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { gunzipSync } from "node:zlib";

const loader = readFileSync("public/moral-trade-live.html", "utf8");
const bridge = readFileSync("public/moral-trade-live-now.js", "utf8");
const feedStyles = readFileSync("public/moral-trade-live-feed.css", "utf8");
const routeBridge = readFileSync("public/moral-trade-live-route-recommendations.js", "utf8");
const routeStyles = readFileSync("public/moral-trade-live-route-recommendations.css", "utf8");
const route = readFileSync("src/app/api/live-now/route.ts", "utf8");
const routeProfile = readFileSync("src/app/api/live-now/route-profile/route.ts", "utf8");
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
  assert.match(loader, /moral-trade-live-route-recommendations\.js/);
  assert.match(loader, /moral-trade-live-route-recommendations\.css/);
  assert.match(loader, /stripLegacyNowFocus/);
  assert.match(loader, /No generic or demo suggestions are shown/);
  assert.match(loader, /unavailableLiveNow/);
  assert.match(loader, /routePlanner:[\s\S]*status: 'unavailable'/);
  assert.match(
    loader,
    /loadingPlan[\s\S]*class="plan-grid"[\s\S]*class="panel plan-control"[\s\S]*class="panel route"[\s\S]*class="stack"/,
    "the fail-closed Plan shell must retain every mount point used by the recommendation UI",
  );
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
  assert.match(route, /eq\("workflow_status", "published"\)/);
  assert.match(route, /not\("published_at", "is", null\)/);
  assert.match(route, /is\("closed_at", null\)/);
  assert.match(route, /is\("deleted_at", null\)/);
  assert.match(route, /eq\("owner_id", userId\)/);
  assert.match(route, /neq\("owner_id", userId\)/);
  assert.match(route, /ownedOpportunities/);
  assert.match(route, /Manage & invite/);
  assert.match(route, /\.range\(offset, offset \+ OFFER_BATCH_SIZE - 1\)/);
  assert.doesNotMatch(route, /\.limit\(240\)/);
  assert.match(route, /rankLiveNowOffers/);
  assert.match(route, /buildRoutePlanner/);
  assert.match(route, /presentRoutePlanner/);
  assert.match(route, /routePlanner/);
  assert.match(route, /privacyLevel: classifyRoutePrivacyScope\(offer\.privacy_scope\)/);
  assert.equal(
    route.match(/summary:\s*text\(offer\.no_trade_baseline/g)?.length,
    1,
    "the private baseline may appear only in the owner's private management payload",
  );
  assert.match(route, /Cache-Control[\s\S]*private, no-store/);
  assert.match(route, /Vary: "Cookie"/);
});

test("the Plan surface uses private inputs and live-source-only route cards", () => {
  assert.match(routeBridge, /data-mt-live-route-composer/);
  assert.match(routeBridge, /document\.querySelector\("\[data-mt-live-route-planner\]"\)/);
  assert.match(routeBridge, /mount\.querySelector\("\.plan-grid"\)/);
  assert.match(routeBridge, /data-mt-lrp-comparison-choice="unsure"/);
  assert.match(routeBridge, /GUIDED GOAL INTERVIEW/);
  assert.match(routeBridge, /data-source-live="\$\{step\.live\}"/);
  assert.match(routeBridge, /These are next actions, not recommendations/);
  assert.match(routeBridge, /No personalized or demo route is shown while signed out/);
  assert.match(routeBridge, /\/api\/live-now\/route-profile/);
  assert.match(routeBridge, /credentials: "same-origin"/);
  assert.match(routeStyles, /mt-lrp-layout/);
  assert.doesNotMatch(routeBridge, /Redirect \$20 of political donations/);
  assert.doesNotMatch(routeBridge, /Fund a verified review/);

  assert.match(routeProfile, /isSameOriginMutation/);
  assert.match(routeProfile, /encryptBackgroundSensitiveText/);
  assert.match(routeProfile, /profileId = viewer\.authUser\.id/);
  assert.match(routeProfile, /updatePairwiseAnswers/);
  assert.match(routeProfile, /Object\.keys\(answers\)\.length >= 10/);
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
  assert.match(bridge, /\/login\?returnTo=%2Ffeed/);

  for (const hardCodedSuggestion of [
    "Counteroffer from Mina",
    "AI-safety research under $100",
    "salary-gap pools · 12 new",
    "Verify your completed transit commitment",
  ]) {
    assert.doesNotMatch(bridge, new RegExp(hardCodedSuggestion, "i"));
  }
});

test("the loader removes legacy feed and route suggestions before first render", () => {
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

  const withoutFocus = `${legacySource.slice(0, start)}function nowFocus(){return "Loading profile";}${legacySource.slice(end)}`;
  const planStart = withoutFocus.indexOf("function nowPlan(){");
  const planEnd = withoutFocus.indexOf("\nfunction field(", planStart);
  assert.ok(planStart >= 0 && planEnd > planStart, "legacy nowPlan boundaries should remain identifiable");
  assert.match(withoutFocus.slice(planStart, planEnd), /Recommended mixed route/);
  const deliveredSource = `${withoutFocus.slice(0, planStart)}function nowPlan(){return "Loading routes";}${withoutFocus.slice(planEnd)}`;
  assert.doesNotMatch(deliveredSource, /Counteroffer from Mina|AI-safety research under \$100/);
  assert.doesNotMatch(deliveredSource, /Recommended mixed route|Redirect \$20 of political donations/);
  assert.match(deliveredSource, /function story\(/);
  assert.match(deliveredSource, /function field\(/);
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
        ownedOpportunities: [
          {
            id: "owned-offer",
            opportunityType: "offer",
            href: "/trades/owned-offer/manage",
            ctaLabel: "Manage & invite",
            sourceLabel: "Your live offer",
            ownerAlias: "Ellen",
            offeredCause: "Cause prioritization",
            requestedCause: "Research feedback",
            offerAction: "Share a reviewed brief",
            requestAction: "Provide bounded feedback",
            verification: "Public link",
            duration: "Within 30 days",
            summary: "Safe owner summary",
            updatedAt: "2026-07-20T11:00:00.000Z",
          },
        ],
        ownedOpportunityCount: 1,
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
  assert.match(context.rendered, /Your live routes/);
  assert.match(context.rendered, /Shown here as your own listing, not as a match/);
  assert.match(context.rendered, /Manage &amp; invite/);
  assert.doesNotMatch(context.rendered, /legacy feed|Counteroffer from Mina/);
  assert.doesNotMatch(context.rendered, /<script>alert\(1\)<\/script>/);
});

test("the social feed has vertical card, feedback, privacy, and mobile rules", () => {
  assert.match(feedStyles, /\.mt-social-feed/);
  assert.match(feedStyles, /\.mt-feed-card/);
  assert.match(feedStyles, /\.mt-owned-feed/);
  assert.match(feedStyles, /\.mt-feed-feedback/);
  assert.match(feedStyles, /@media \(max-width: 620px\)/);
  assert.match(bridge, /Easy for me/);
  assert.match(bridge, /Hard for me/);
  assert.match(bridge, /Less like this/);
  assert.match(bridge, /Your live routes/);
  assert.match(bridge, /does not retain raw browsing URLs or page content/);
});
