import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  "src/components/walkthrough/immersive-walkthrough.tsx",
  "utf8",
);
const styles = readFileSync("src/app/walkthrough/walkthrough.css", "utf8");
const page = readFileSync("src/app/walkthrough/page.tsx", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const staticLoader = readFileSync("public/moral-trade-production.html", "utf8");

test("Next Walkthrough is canonical while the released static artifact remains available", () => {
  assert.match(page, /ImmersiveWalkthrough/);
  assert.match(page, /getWalkthroughActivationDestination/);
  assert.doesNotMatch(
    nextConfig,
    /source:\s*"\/walkthrough"[\s\S]{0,100}moral-trade-production\.html/,
  );
  assert.match(staticLoader, /moral-trade-interactive-walkthroughs\.html/);
});

test("the Next crowd flow includes the released salary-gap sequence and real internal exits", () => {
  for (const copy of [
    "See what the crowd can unlock",
    "Maya has two verified offers.",
    "$115,000",
    "$85,000",
    "$30,000",
    "Close the gap with",
    "Maya can take the higher-impact job.",
  ]) {
    assert.match(component, new RegExp(copy.replaceAll("$", "\\$")));
  }

  assert.match(component, /\/create\?source=walkthrough&mode=back/);
  assert.match(component, /\/discover\?source=walkthrough&domain=pools&view=threshold/);
  assert.match(styles, /@keyframes mtw-career-threshold-fill/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*mtw-career-offers/);
});

test("the Next match finish creates a private draft and server-controlled handoff", () => {
  assert.match(component, /Starter profile created/);
  assert.match(component, /Nothing is public until[\s\S]*review and save it/);
  assert.match(component, /completeWalkthroughActivationAction/);
  assert.match(component, /WALKTHROUGH_PROFILE_STORAGE_KEY/);
  assert.match(component, /Review &amp; refine/);
  assert.match(styles, /\.mtw-profile-draft/);
});

test("released keyboard, hydration, and mobile focus behavior remain explicit", () => {
  assert.match(component, /data-walkthrough-ready="false"/);
  assert.match(component, /event\.altKey && event\.key === "ArrowRight"/);
  assert.match(component, /event\.altKey \|\| event\.ctrlKey \|\| event\.metaKey/);
  assert.match(component, /scrollIntoView\(\{ block: "center" \}\)/);
});

test("the canonical walkthrough controls keep the released hard geometry", () => {
  assert.match(
    styles,
    /\.mtw-concept-tab\s*\{[^}]*border-radius:\s*2px;/,
  );
  assert.match(
    styles,
    /\.mtw-cause-choice\s*\{[^}]*border-radius:\s*2px;[^}]*box-shadow:\s*none;/,
  );
});
