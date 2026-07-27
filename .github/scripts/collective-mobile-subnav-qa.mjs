import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const baseUrl = process.env.BROWSER_QA_BASE_URL ?? "http://127.0.0.1:3000";
const artifactDir = process.env.BROWSER_QA_ARTIFACT_DIR ?? "collective-mobile-subnav-artifacts";
const viewports = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-320x568", width: 320, height: 568 },
];

await mkdir(artifactDir, { recursive: true });

const audit = {
  outcome: "running",
  baseUrl,
  generatedAt: new Date().toISOString(),
  viewports: [],
};

function isExpectedAbortedPrefetch(request) {
  const failure = request.failure()?.errorText ?? "";
  if (failure !== "net::ERR_ABORTED") return false;
  try {
    return new URL(request.url()).searchParams.has("_rsc");
  } catch {
    return false;
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    const ignoredPrefetchAborts = [];
    const errorResponses = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (!url.startsWith(baseUrl)) return;
      const detail = `${request.method()} ${url}: ${request.failure()?.errorText ?? "failed"}`;
      if (isExpectedAbortedPrefetch(request)) {
        ignoredPrefetchAborts.push(detail);
        return;
      }
      failedRequests.push(detail);
    });
    page.on("response", (response) => {
      if (response.url().startsWith(baseUrl) && response.status() >= 400) {
        errorResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto(`${baseUrl}/collective-commitments`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    assert.ok(response, `${viewport.name}: navigation returned no response.`);
    assert.equal(response.status(), 200, `${viewport.name}: expected HTTP 200.`);

    const disabledHeading = page.getByRole("heading", {
      name: "Collective commitments are disabled.",
    });
    assert.equal(
      await disabledHeading.isVisible().catch(() => false),
      false,
      `${viewport.name}: feature is disabled in the rendered candidate.`,
    );

    const nav = page.getByRole("navigation", { name: "Collective commitments" });
    await nav.waitFor({ state: "visible", timeout: 30_000 });

    const diagnostics = await nav.evaluate((element) => {
      const links = Array.from(element.querySelectorAll("a"));
      const navRect = element.getBoundingClientRect();
      const documentElement = document.documentElement;
      const computed = getComputedStyle(element);
      const viewportWidth = window.innerWidth;
      const overflowingElements = Array.from(document.body.querySelectorAll("*"))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            tag: node.tagName.toLowerCase(),
            className: typeof node.className === "string" ? node.className : "",
            text: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
            left: rect.left,
            right: rect.right,
            width: rect.width,
            clientWidth: node.clientWidth,
            scrollWidth: node.scrollWidth,
          };
        })
        .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 30);

      return {
        metrics: {
          viewportWidth,
          documentScrollWidth: documentElement.scrollWidth,
          documentClientWidth: documentElement.clientWidth,
          navClientWidth: element.clientWidth,
          navScrollWidth: element.scrollWidth,
          navLeft: navRect.left,
          navRight: navRect.right,
          display: computed.display,
          flexWrap: computed.flexWrap,
          overflowX: computed.overflowX,
          whiteSpace: computed.whiteSpace,
          links: links.map((link) => {
            const rect = link.getBoundingClientRect();
            return {
              text: link.textContent?.trim() ?? "",
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
              visible: rect.width > 0 && rect.height > 0,
            };
          }),
        },
        overflowingElements,
      };
    });

    await page.screenshot({
      path: path.join(artifactDir, `${viewport.name}-viewport.png`),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(artifactDir, `${viewport.name}-full-page.png`),
      fullPage: true,
    });

    const record = {
      ...viewport,
      outcome: "measured",
      metrics: diagnostics.metrics,
      overflowingElements: diagnostics.overflowingElements,
      consoleErrors,
      pageErrors,
      failedRequests,
      ignoredPrefetchAborts,
      errorResponses,
    };
    audit.viewports.push(record);

    const metrics = diagnostics.metrics;
    assert.deepEqual(
      metrics.links.map((link) => link.text),
      ["Collective commitments", "Create", "Identity verification"],
      `${viewport.name}: the secondary navigation labels changed or are incomplete.`,
    );
    assert.ok(
      metrics.documentScrollWidth <= metrics.viewportWidth + 1,
      `${viewport.name}: page scroll width ${metrics.documentScrollWidth}px exceeds viewport ${metrics.viewportWidth}px.`,
    );
    assert.ok(
      metrics.navScrollWidth <= metrics.navClientWidth + 1,
      `${viewport.name}: secondary navigation still scrolls horizontally (${metrics.navScrollWidth}px > ${metrics.navClientWidth}px).`,
    );
    assert.equal(metrics.overflowX, "visible", `${viewport.name}: overflow-x must be visible.`);
    assert.equal(metrics.whiteSpace, "normal", `${viewport.name}: labels must be allowed to wrap.`);

    for (const link of metrics.links) {
      assert.equal(link.visible, true, `${viewport.name}: ${link.text} is not rendered.`);
      assert.ok(link.left >= -1, `${viewport.name}: ${link.text} is clipped on the left.`);
      assert.ok(
        link.right <= metrics.viewportWidth + 1,
        `${viewport.name}: ${link.text} is clipped on the right (${link.right}px).`,
      );
    }

    assert.deepEqual(consoleErrors, [], `${viewport.name}: console errors detected.`);
    assert.deepEqual(pageErrors, [], `${viewport.name}: page errors detected.`);
    assert.deepEqual(failedRequests, [], `${viewport.name}: same-origin request failures detected.`);
    assert.deepEqual(errorResponses, [], `${viewport.name}: same-origin HTTP errors detected.`);

    record.outcome = "pass";
    await context.close();
  }

  audit.outcome = "pass";
} catch (error) {
  audit.outcome = "fail";
  audit.error = error instanceof Error ? error.stack ?? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  audit.completedAt = new Date().toISOString();
  await writeFile(path.join(artifactDir, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
}
