#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const oldSpinbuttonHelper = `function spinbutton(page, name) {
  return page.getByRole("spinbutton", { name, exact: true });
}`;
const newSpinbuttonHelper = `function spinbutton(page, name) {
  return page.getByRole("spinbutton", { name: new RegExp(\`^\${name}\`) });
}`;
if (source.split(oldSpinbuttonHelper).length !== 2) {
  throw new Error("Expected one exact spinbutton helper in the reviewed QA script.");
}

const oldThresholdFill = [
  "async function fillThresholdCard(page, index, { amount, successProbability, failureFill }) {",
  "  const card = thresholdCards(page).nth(index - 1);",
  "  await card",
  "    .getByRole(\"textbox\", {",
  "      name: `Threshold ${index} cumulative net recipient amount`,",
  "      exact: true,",
  "    })",
  "    .fill(amount);",
  "  await card",
  "    .getByRole(\"textbox\", {",
  "      name: `Threshold ${index} estimated success probability`,",
  "      exact: true,",
  "    })",
  "    .fill(successProbability);",
  "  await card",
  "    .getByRole(\"textbox\", {",
  "      name: `Threshold ${index} expected eligible balance at failure`,",
  "      exact: true,",
  "    })",
  "    .fill(failureFill);",
  "}",
].join("\n");
const newThresholdFill = [
  "function thresholdTextbox(card, name) {",
  "  return card.getByRole(\"textbox\", { name: new RegExp(`^${name}`) });",
  "}",
  "",
  "async function fillThresholdCard(page, index, { amount, successProbability, failureFill }) {",
  "  const card = thresholdCards(page).nth(index - 1);",
  "  await thresholdTextbox(card, `Threshold ${index} cumulative net recipient amount`).fill(amount);",
  "  await thresholdTextbox(card, `Threshold ${index} estimated success probability`).fill(",
  "    successProbability,",
  "  );",
  "  await thresholdTextbox(card, `Threshold ${index} expected eligible balance at failure`).fill(",
  "    failureFill,",
  "  );",
  "}",
].join("\n");
if (source.split(oldThresholdFill).length !== 2) {
  throw new Error("Expected one exact threshold-card textbox block in the reviewed QA script.");
}

const repaired = source
  .replace(oldSpinbuttonHelper, newSpinbuttonHelper)
  .replace(oldThresholdFill, newThresholdFill);
const wrapperDirectory = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(wrapperDirectory, ".multi-threshold-authenticated-browser-qa.executed.mjs");
writeFileSync(target, repaired, "utf8");
await import(`${pathToFileURL(target).href}?run=${Date.now()}`);
