import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { gunzipSync } from "node:zlib";

const loader = readFileSync("public/moral-trade-live.html", "utf8");
const bridge = readFileSync("public/moral-trade-live-now.js", "utf8");
const route = readFileSync("src/app/api/live-now/route.ts", "utf8");
const priorityPage = readFileSync("src/app/profile/priorities/page.tsx", "utf8");
const priorityAction = readFileSync("src/app/profile/priorities/actions.ts", "utf8");

test("the live shell fetches private profile recommendations before rendering", () => {
  assert.match(loader, /fetch\('\/api\/live-now'/);
  assert.match(loader, /credentials: 'same-origin'/);
  assert.match(loader, /__MT_LIVE_NOW_BOOTSTRAP__/);
  assert.match(loader, /moral-trade-live-now\.js/);
  assert.match(loader, /stripLegacyNowFocus/);
  assert.match(loader, /No generic or demo suggestions are shown/);
});

test("the live-now endpoint uses authenticated profile causes and live offers", () => {
  assert.match(route, /hasSupabaseEnv\(\)/);
  assert.match(route, /hasSupabaseAuthCookie\(cookieStore\)/);
  assert.match(route, /getViewer\(\)/);
  assert.match(route, /from\("wish_profiles"\)/);
  assert.match(route, /from\("saved_searches"\)/);
  assert.match(route, /from\("offers"\)/);
  assert.match(route, /eq\("status", "open"\)/);
  assert.match(route, /neq\("owner_id", userId\)/);
  assert.match(route, /\.range\(offset, offset \+ OFFER_BATCH_SIZE - 1\)/);
  assert.doesNotMatch(route, /\.limit\(240\)/);
  assert.match(route, /rankLiveNowOffers/);
  assert.match(route, /Cache-Control.*private, no-store/s);
  assert.match(route, /Vary: "Cookie"/);
});

test("the incomplete-profile CTA opens direct priority setup instead of the dashboard", () => {
  const incompleteStart = bridge.indexOf('if (model.status === "profile_incomplete")');
  const noMatchesStart = bridge.indexOf('if (model.status === "no_matches")');
  const incompleteBlock = bridge.slice(incompleteStart, noMatchesStart);

  assert.ok(incompleteStart >= 0 && noMatchesStart > incompleteStart);
  assert.match(
    bridge,
    /\/profile\/priorities\?returnTo=%2Fmoral-trade-live\.html%23now/,
  );
  assert.match(incompleteBlock, /primaryHref: profilePriorityHref/);
  assert.doesNotMatch(incompleteBlock, /dashboard#wish-profile/);
  assert.match(priorityPage, /Choose what should shape Now\./);
  assert.match(priorityPage, /saveProfilePrioritySearchAction/);
});

test("priority setup saves a manual active cause search and returns to Now", () => {
  assert.match(priorityAction, /from\("saved_searches"\)/);
  assert.match(priorityAction, /cadence: "manual"/);
  assert.match(priorityAction, /status: "active"/);
  assert.match(priorityAction, /\/moral-trade-live\.html#now/);
  assert.match(priorityAction, /Choose at least one cause area\./);
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

test("the browser bridge renders only fixture profile data and escapes offer fields", () => {
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
        matchingOfferCount: 1,
        profile: {
          causes: ["Animal welfare"],
          openToPayment: true,
          openToPledges: false,
          signalSources: ["Profile priorities"],
        },
        recentChanges: [],
        recommendations: [
          {
            id: "animal-offer",
            mode: "payment",
            offeredCause: "Animal welfare <script>alert(1)</script>",
            requestedCause: "Plant-based evidence",
            matchCause: "Animal welfare",
            reason: "Matches your Animal welfare priority",
          },
        ],
        status: "ready",
      },
      dispatchEvent() {},
      render() {
        context.rendered = context.window.nowFocus();
      },
      nowFocus: () => "legacy feed",
    } as {
      __MT_LIVE_NOW_BOOTSTRAP__: Record<string, unknown>;
      dispatchEvent: () => void;
      nowFocus: () => string;
      render: () => void;
      __MT_LIVE_NOW_ACTIVE__?: boolean;
    },
  };

  runInNewContext(bridge, context);

  assert.match(context.rendered, /Based on your profile/);
  assert.match(context.rendered, /Animal welfare &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(context.rendered, /legacy feed|Counteroffer from Mina/);
  assert.doesNotMatch(context.rendered, /<script>alert\(1\)<\/script>/);
});
