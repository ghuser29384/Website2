#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_BRANCH = "qa/multi-threshold-browser-script-source-20260727";
const SOURCE_PATH = ".github/scripts/multi-threshold-authenticated-browser-qa.mjs";
const EXPECTED_SOURCE_BLOB = "e4c3e28751eee741527d761e778e71d136f50d8b";

execFileSync("git", ["fetch", "--no-tags", "origin", SOURCE_BRANCH], { stdio: "inherit" });
const source = execFileSync("git", ["show", `FETCH_HEAD:${SOURCE_PATH}`], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});
const actualBlob = execFileSync("git", ["hash-object", "--stdin"], {
  input: source,
  encoding: "utf8",
}).trim();
if (actualBlob !== EXPECTED_SOURCE_BLOB) {
  throw new Error(`Refusing unexpected QA script blob: ${actualBlob}`);
}

const oldHelper = `function spinbutton(page, name) {
  return page.getByRole("spinbutton", { name, exact: true });
}`;
const newHelper = `function spinbutton(page, name) {
  return page.getByRole("spinbutton", { name: new RegExp(\`^\${name}\`) });
}`;
if (source.split(oldHelper).length !== 2) {
  throw new Error("Expected one exact spinbutton helper in the reviewed QA script.");
}

const repaired = source.replace(oldHelper, newHelper);
const directory = mkdtempSync(path.join(tmpdir(), "moraltrade-multi-threshold-qa-"));
const target = path.join(directory, "multi-threshold-authenticated-browser-qa.mjs");
writeFileSync(target, repaired, "utf8");
await import(pathToFileURL(target).href);
