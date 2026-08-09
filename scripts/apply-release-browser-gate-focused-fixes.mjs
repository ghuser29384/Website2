import fs from "node:fs";

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content);
}

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Missing expected ${label}`);
  }
  return source.replace(before, after);
}

{
  const filePath = "tests/commitments-live-portfolio.spec.ts";
  let source = read(filePath);
  source = replaceRequired(
    source,
    `  const isBestEffortFunnelEvent =\n    request.method() === "POST" && url.pathname === "/api/funnel-events";\n\n  return isNextRoutePrefetch || isDiscoverLinkPrefetch || isBestEffortFunnelEvent;`,
    `  const isBestEffortFunnelEvent =\n    request.method() === "POST" && url.pathname === "/api/funnel-events";\n  const isSupersededInputAssistLoad =\n    request.method() === "GET" &&\n    [\n      "/moral-trade-input-assist.js",\n      "/moral-trade-input-standards.json",\n    ].includes(url.pathname);\n\n  return (\n    isNextRoutePrefetch ||\n    isDiscoverLinkPrefetch ||\n    isBestEffortFunnelEvent ||\n    isSupersededInputAssistLoad\n  );`,
    "expected navigation-abort classification",
  );
  write(filePath, source);
}

{
  const filePath = "tests/exact-live-route-recommendations.spec.ts";
  let source = read(filePath);
  source = replaceRequired(
    source,
    `      causePriorities: ["Farmed-animal welfare"],`,
    `      causePriorities: ["Factory farming"],`,
    "canonical cause expectation",
  );
  source = replaceRequired(
    source,
    `    await dialog.getByLabel("Evidence").selectOption("connected");`,
    `    const evidence = dialog.getByLabel("Evidence");\n    await expect(\n      evidence.getByRole("option", { name: "Connected proof — no eligible inventory yet" }),\n    ).toHaveAttribute("disabled", "");\n    await evidence.selectOption("standard");`,
    "fail-closed evidence selection",
  );
  source = replaceRequired(
    source,
    `        evidencePreference: "connected",`,
    `        evidencePreference: "standard",`,
    "allowed evidence expectation",
  );
  write(filePath, source);
}

{
  const filePath = "tests/exact-live-verification.spec.ts";
  let source = read(filePath);
  source = replaceRequired(
    source,
    `    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });\n    await page.evaluate(() => {`,
    `    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });\n    await page.waitForFunction(() =>\n      Boolean(\n        (window as typeof window & { __MT_COMPLETE_VERIFICATION_BRIDGE__?: boolean })\n          .__MT_COMPLETE_VERIFICATION_BRIDGE__,\n      ),\n    );\n    await page.evaluate(() => {`,
    "verification bridge readiness wait",
  );
  write(filePath, source);
}
