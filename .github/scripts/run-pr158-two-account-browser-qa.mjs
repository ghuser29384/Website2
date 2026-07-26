#!/usr/bin/env node

import { readFile, unlink, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const sourcePath = path.resolve(
  ".github/scripts/pr158-two-account-browser-qa.mjs",
);
const generatedPath = path.resolve(
  ".github/scripts/.pr158-two-account-browser-qa.generated.mjs",
);

function replaceExactly(source, needle, replacement, label) {
  const occurrences = source.split(needle).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one ${label} patch target; found ${occurrences}.`,
    );
  }
  return source.replace(needle, replacement);
}

let source = await readFile(sourcePath, "utf8");

source = replaceExactly(
  source,
  '    await expect(responder.page.getByRole("link", { name: /Log out/i })).toBeVisible();',
  '    await expect(responder.page.getByLabel("Your question")).toBeVisible();',
  "post-login authenticated-page assertion",
);

source = replaceExactly(
  source,
  '    if (!delayed && route.request().method() === "POST") {',
  [
    "    const request = route.request();",
    "    if (",
    "      !delayed &&",
    '      request.method() === "POST" &&',
    '      Boolean(request.headers()["next-action"])',
    "    ) {",
  ].join("\n"),
  "server-action pending-state interception",
);

source = replaceExactly(
  source,
  "      await sleep(900);",
  "      await sleep(1200);",
  "server-action pending-state delay",
);

source = replaceExactly(
  source,
  '    const button = page.getByRole("button", { name: "Post public question" });',
  '    const button = page.locator(\'form.comment-compose-form button[type="submit"]\');',
  "stable question submit locator",
);

source = replaceExactly(
  source,
  '    const save = card.getByRole("button", { name: "Save" });',
  '    const save = card.locator(\'form button[type="submit"]\');',
  "stable save submit locator",
);

source = replaceExactly(
  source,
  '    const remove = reloadedCard.getByRole("button", { name: "Remove saved" });',
  '    const remove = reloadedCard.locator(\'form button[type="submit"]\');',
  "stable remove-saved submit locator",
);

source = replaceExactly(
  source,
  "  const allDiagnostics = report.diagnostics;",
  [
    "  await owner.close();",
    "  sessions.splice(sessions.indexOf(owner), 1);",
    "  await responder.close();",
    "  sessions.splice(sessions.indexOf(responder), 1);",
    "",
    "  const allDiagnostics = report.diagnostics;",
  ].join("\n"),
  "diagnostic session close",
);

source = replaceExactly(
  source,
  '      ...item.failedRequests.map((error) => `${item.label} request: ${JSON.stringify(error)}`),',
  [
    "      ...item.failedRequests",
    '        .filter((error) => error.failure !== "net::ERR_ABORTED" && error.resourceType !== "ping")',
    '        .map((error) => `${item.label} request: ${JSON.stringify(error)}`),',
  ].join("\n"),
  "benign aborted-prefetch diagnostic filter",
);

await writeFile(generatedPath, source, "utf8");
try {
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
