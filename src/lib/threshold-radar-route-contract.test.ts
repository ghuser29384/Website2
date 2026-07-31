import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const pageSource = readFileSync(join(root, "src/app/pools/radar/page.tsx"), "utf8");
const componentSource = readFileSync(
  join(root, "src/components/pools/threshold-radar.tsx"),
  "utf8",
);
const styleSource = readFileSync(
  join(root, "src/components/pools/threshold-radar.module.css"),
  "utf8",
);

test("the threshold radar route preserves the supplied campaign copy", () => {
  for (const copy of [
    "Threshold radar",
    "Help Priya take the biosecurity role.",
    "Verified salary gap",
    "$25,000",
    "$23,640",
    "$1,360",
    "No charge unless the threshold",
    "Moving the slider has not saved a pledge.",
  ]) {
    assert.match(componentSource, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(componentSource, /\{`Make a conditional \$\{pledgeAmount\.toLocaleString/);
  assert.doesNotMatch(componentSource, /Pledge \$\{pledgeAmount\} conditionally\./);

  assert.match(pageSource, /canonical: "\/pools\/radar"/);
  assert.match(pageSource, /robots:\s*\{/);
  assert.match(pageSource, /index: false/);
  assert.match(pageSource, /follow: false/);
});

test("the threshold radar keeps the target artboard and interactive controls", () => {
  assert.match(styleSource, /width: 1487px/);
  assert.match(styleSource, /height: 1058px/);
  assert.match(styleSource, /grid-template-columns: 234px minmax\(0, 1fr\) 342px/);
  assert.match(styleSource, /transform: scale\(var\(--artboard-scale\)\)/);
  assert.match(componentSource, /setSelectedId\(id\)/);
  assert.match(componentSource, /setPledgeIndex\(Number\(event\.currentTarget\.value\)\)/);
  assert.match(componentSource, /aria-valuetext=/);
  assert.match(componentSource, /max=\{pledgeAmounts\.length - 1\}/);
  assert.match(componentSource, /setCauseArea\(event\.target\.value as CauseArea\)/);
  assert.match(componentSource, /selected\.details\.map/);
  assert.match(componentSource, /navigator\.clipboard\.writeText/);
  assert.match(componentSource, /setCustomPledge\(Math\.round\(amount\)\)/);
  assert.match(componentSource, /setWatched\(\(value\) => !value\)/);
  assert.ok(existsSync(join(root, "public/assets/threshold-radar/paper-grid.png")));
});
