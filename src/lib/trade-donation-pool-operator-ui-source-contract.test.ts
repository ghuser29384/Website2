import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  "src/app/admin/trade-donation-pools/page.tsx",
  "utf8",
);
const globalCss = readFileSync("src/app/globals.css", "utf8");

test("the pooled-settlement operator route opts into visible trade workflow sections", () => {
  assert.match(
    pageSource,
    /className="page-shell marketplace-app-shell trade-workflow-shell"/,
  );
  assert.match(
    globalCss,
    /\.marketplace-app-shell #main-content > \.section\s*{\s*display: none;/,
  );
  assert.match(
    globalCss,
    /\.trade-workflow-shell\.marketplace-app-shell #main-content > \.section\s*{\s*display: block;/,
  );
});
