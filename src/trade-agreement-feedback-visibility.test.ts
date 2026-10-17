import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stageSource = readFileSync(
  new URL("./components/core-trade/trade-agreement-stage.tsx", import.meta.url),
  "utf8",
);
const visibilityCss = readFileSync(
  new URL("./components/core-trade/trade-agreement-page-visibility.module.css", import.meta.url),
  "utf8",
);

test("completed agreement details and private outcome feedback remain visible in the app shell", () => {
  assert.match(stageSource, /className=\{pageStyles\.scope\}/);
  assert.match(stageSource, /id="outcome-feedback"/);
  assert.match(visibilityCss, /\.scope\s+:global\(\.section\)/);
  assert.match(visibilityCss, /\.scope\s+~\s+:global\(\.section\)/);
  assert.match(visibilityCss, /display:\s*block\s*!important/);
});
