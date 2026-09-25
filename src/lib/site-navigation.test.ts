import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getPrimaryNavLinks, getTopbarActions } from "./site";

import { groupPrimaryNavigation, getTaskPrimaryAction } from "./site-navigation";

const read = (path: string) => readFileSync(path, "utf8");
const navigation = groupPrimaryNavigation(getPrimaryNavLinks());
const routes = navigation.flatMap((item) => item.items ?? (item.href ? [{ href: item.href, label: item.label }] : []));
const bridge = read("public/moral-trade-live-navigation.js");
const staticPage = read("public/moral-trade-discover.html");
const header = staticPage.match(/<nav class="top-nav mt-task-nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
const topbar = read("src/components/layout/site-topbar.tsx");

test("primary navigation has five stable, task-based sections", () => {
  assert.deepEqual(navigation.map((item) => item.label), ["Discover", "Feed", "Activity", "Profile", "Help"]);
  assert.deepEqual(groupPrimaryNavigation(getPrimaryNavLinks(true)), groupPrimaryNavigation(getPrimaryNavLinks(false)));
});

test("Discover and Feed remain separate canonical entry points", () => {
  assert.deepEqual(navigation.slice(0, 2), [{ href: "/discover", label: "Discover" }, { href: "/feed", label: "Feed" }]);
});

test("activity groups the existing operational pages", () => {
  assert.deepEqual(navigation.find((item) => item.label === "Activity")?.items?.map((item) => item.href),
    ["/dashboard", "/commitments", "/messages", "/saved-offers", "/invite"]);
});

test("private priorities have an explicit 100 Sparks destination under Profile", () => {
  const profile = navigation.find((item) => item.label === "Profile")?.items ?? [];
  assert.equal(profile.find((item) => item.href === "/profile/priorities")?.label, "Adjust priorities · 100 Sparks");
  assert.ok(profile.some((item) => item.href === "/profile"));
  assert.ok(profile.some((item) => item.href === "/dashboard#data-portability"));
});

test("help keeps evidence, safety, walkthrough and contact reachable", () => {
  assert.deepEqual(navigation.find((item) => item.label === "Help")?.items?.map((item) => item.href),
    ["/walkthrough", "/evidence", "/safety", "/contact"]);
});

test("Create is one separate authenticated header action, not a duplicate section", () => {
  assert.ok(!routes.some((item) => item.href === "/trades/new"));
  assert.deepEqual(getTaskPrimaryAction(getTopbarActions(true).primaryAction), { href: "/trades/new", label: "Create trade" });
});

test("guest sign-in and getting-started routes are unchanged", () => {
  assert.deepEqual(getTopbarActions(false), {
    authLink: { href: "/login", label: "Sign in" },
    primaryAction: { href: "/start", label: "Get started" },
  });
  assert.equal(getTopbarActions(true).authLink, undefined);
});

test("no route is duplicated inside the primary hierarchy", () => {
  assert.equal(new Set(routes.map((item) => item.href)).size, routes.length);
  for (const item of routes) assert.match(item.href, /^\/(?!\/)/);
});

test("the static bridge and React source have identical labels, order and destinations", () => {
  const config = bridge.match(/const primaryNavigation = ([\s\S]*?);\n/)?.[1];
  assert.ok(config, "The bridge navigation contract must be inspectable");
  assert.deepEqual(JSON.parse(config), navigation);
});

test("Discover ships the same navigation as real no-JavaScript links", () => {
  const links = [...header.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((match) => ({ href: match[1], label: match[2] }));
  assert.deepEqual(links, [...routes.map(({ href, label }) => ({ href, label })), { href: "/trades/new", label: "Create trade" }]);
  assert.deepEqual([...header.matchAll(/<summary>([^<]+)<\/summary>/g)].map((match) => match[1]), ["Activity", "Profile", "Help"]);
  assert.match(staticPage, /src="\/moral-trade-live-navigation\.js"/);
  assert.match(staticPage, /href="\/moral-trade-site-navigation\.css"/);
});

test("the legacy bridge cannot mutate React navigation or intercept anchor routing", () => {
  assert.match(bridge, /\.topbar:not\(\.mt-site-topbar\) > nav, \.app-header > \.top-nav/);
  assert.doesNotMatch(bridge, /location\.(assign|replace)|stopImmediatePropagation|data-page=/);
  assert.match(bridge, /document\.createElement\("a"\)/);
});

test("navigation adds no account, payment, storage or preference mutations", () => {
  assert.doesNotMatch(bridge, /\bfetch\s*\(|localStorage|sessionStorage|sendBeacon|\/api\//);
  assert.match(bridge, /if \(window\.__MT_DISCOVER_NAVIGATION_BRIDGE__\) return/);
  assert.match(bridge, /mtNavigationBound/);
});

test("landmark normalization stays scoped to the actual live main", () => {
  assert.match(bridge, /const appMain = document\.querySelector\("main#app"\);\n    if \(!appMain\) return/);
  assert.match(bridge, /observer\.observe\(appMain, \{ childList: true, subtree: true \}\)/);
});

test("the React header keeps custom account menus but avoids duplicating the shared Profile menu", () => {
  assert.match(topbar, /showLogout && !navigationLinks\.some\(\(link\) => link\.label === "Profile"\)/);
  assert.match(topbar, /await supabase\.auth\.signOut\(\)/);
  assert.match(topbar, /aria-current=/);
  assert.match(topbar, /querySelector\("summary"\)\?\.focus\(\)/);
  assert.match(topbar, /moral-trade-site-navigation\.css/);
});


test("custom navigation and custom action labels pass through without dropping routes", () => {
  const custom = [{ href: "/admin", label: "Administration" }];
  assert.equal(groupPrimaryNavigation(custom), custom);
  const extended = [...getPrimaryNavLinks(), ...custom];
  assert.equal(groupPrimaryNavigation(extended), extended);
  const customAction = { href: "/trades/new", label: "Custom proposal" };
  assert.equal(getTaskPrimaryAction(customAction), customAction);
  assert.equal(getTaskPrimaryAction(undefined), undefined);
  assert.deepEqual(getTaskPrimaryAction(getTopbarActions(false).primaryAction), { href: "/start", label: "Get started" });
});

test("task presentation is wired into the actual native header", () => {
  assert.match(topbar, /const navigationLinks = groupPrimaryNavigation\(links\)/);
  assert.match(topbar, /navigationLinks\.map\(\(link\)/);
  assert.match(topbar, /const navigationAction = getTaskPrimaryAction\(primaryAction\)/);
  assert.match(topbar, /label=\{navigationAction\.label\}/);
});
