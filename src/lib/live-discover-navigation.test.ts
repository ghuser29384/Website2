import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const readPublicFile = (name: string) => readFileSync(join(process.cwd(), "public", name), "utf8");

test("the exact live loader injects the Discover navigation bridge", () => {
  const loader = readPublicFile("moral-trade-live.html");

  assert.match(loader, /moral-trade-live-navigation\.js/);
  assert.match(loader, /accountAwareSource\.replace\('<\/body>'/);
});

test("the live navigation bridge exposes Feed, Discover, an optional tour, and the global Evidence ledger", () => {
  const bridge = readPublicFile("moral-trade-live-navigation.js");

  const config = bridge.match(/const primaryNavigation = ([\s\S]*?);\n/)?.[1];
  assert.ok(config, "The navigation configuration must be inspectable");
  const sections = JSON.parse(config) as Array<{ href?: string; label: string; items?: Array<{ href: string; label: string }> }>;
  assert.deepEqual(sections.slice(0, 2), [{ href: "/discover", label: "Discover" }, { href: "/feed", label: "Feed" }]);
  const help = sections.find((section) => section.label === "Help")?.items ?? [];
  assert.ok(help.some((item) => item.href === "/walkthrough" && item.label === "How it works"));
  assert.ok(help.some((item) => item.href === "/evidence" && item.label === "Public evidence"));
  assert.ok(sections.find((section) => section.label === "Activity")?.items?.some((item) => item.href === "/commitments"));
  for (const hook of ["data-mt-feed-link", "data-mt-discover-link", "data-mt-optional-tour", "data-mt-evidence-link"]) {
    assert.ok(bridge.includes(hook), `missing existing integration hook: ${hook}`);
  }
  assert.match(bridge, /document\.createElement\("a"\)/);
  assert.match(bridge, /link\.href = item\.href/);
  assert.doesNotMatch(bridge, /createControlsControl|prepareControlsControl|location\.assign|stopImmediatePropagation/);
});

test("Discover ships complete canonical navigation without a graph or required JavaScript patch", () => {
  const shell = readPublicFile("moral-trade-discover.html");
  for (const href of ["/feed", "/discover", "/walkthrough", "/trades/new", "/commitments", "/evidence"]) {
    assert.ok(shell.includes(`href="${href}"`));
  }
  assert.match(shell, /aria-current="page"[^>]*>Discover/);
  assert.match(shell, /data-mt-task-navigation="true"/);
  assert.match(shell, /<summary>Profile<\/summary>/);
  assert.match(shell, /href="\/profile\/priorities"/);
  assert.doesNotMatch(shell, /moral-trade-discover-navigation|moral-trade-discover-value-hover/);
});
