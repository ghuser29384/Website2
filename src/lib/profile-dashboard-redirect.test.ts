import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nextConfig from "../../next.config";
import { getProfileDashboardTarget } from "./dashboard-view";

test("Profile redirects only the exact account route, not the nested editor", async () => {
  const redirects = await nextConfig.redirects!();
  assert.deepEqual(redirects.filter((entry) => entry.source.startsWith("/profile")), [
    { source: "/profile", destination: "/dashboard", permanent: true },
  ]);
  assert.equal(redirects.some((entry) => entry.source === "/dashboard"), false);
});

test("Profile fallback preserves feedback, controls, repeated and empty query values", () => {
  assert.equal(getProfileDashboardTarget({}), "/dashboard");
  const target = new URL(getProfileDashboardTarget({
    message: "Saved & ready ✓", view: "controls", filter: ["first", "second"], empty: "", omitted: undefined,
  }), "https://www.moraltrade.org");
  assert.equal(target.pathname, "/dashboard");
  assert.equal(target.searchParams.get("message"), "Saved & ready ✓");
  assert.equal(target.searchParams.get("view"), "controls");
  assert.deepEqual(target.searchParams.getAll("filter"), ["first", "second"]);
  assert.equal(target.searchParams.get("empty"), "");
  assert.equal(target.searchParams.has("omitted"), false);
});

test("redirect-like inputs cannot change the canonical origin or pathname", () => {
  for (const returnTo of ["https://example.invalid", "//example.invalid", "/profile", "\\evil.invalid"]) {
    const target = new URL(getProfileDashboardTarget({ returnTo }), "https://www.moraltrade.org");
    assert.equal(target.origin, "https://www.moraltrade.org");
    assert.equal(target.pathname, "/dashboard");
    assert.equal(target.searchParams.get("returnTo"), returnTo);
  }
});

test("rendered account entry points use Dashboard without duplicate Profile destinations", () => {
  assert.match(readFileSync("src/components/trade-controls/trade-controls-workspace.tsx", "utf8"), /links=\{getPrimaryNavLinks\(\)\}/);
  for (const path of [
    "src/lib/site.ts", "src/components/marketplace/marketplace-components.tsx",
    "public/moral-trade-live-navigation.js", "public/moral-trade-discover.html",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /["']\/profile["']/);
    assert.match(source, /["']\/dashboard["']/);
  }
});
