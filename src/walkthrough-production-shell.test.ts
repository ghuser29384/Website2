import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionShell = readFileSync(
  new URL("../public/moral-trade-production.html", import.meta.url),
  "utf8",
);

test("the production shell only offers Skip on the first-visit walkthrough route", () => {
  assert.match(productionShell, /window\.location\.pathname === "\/walkthrough"/);
  assert.match(
    productionShell,
    /new URLSearchParams\(window\.location\.search\)\.get\("first_visit"\) === "1"/,
  );
  assert.match(productionShell, /aria-label="Skip walkthrough"/);
  assert.match(productionShell, /<form action="\/"[^>]*method="get">/);
});
