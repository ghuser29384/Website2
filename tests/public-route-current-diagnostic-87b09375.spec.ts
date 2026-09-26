import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const routes = [
  "/",
  "/cohort",
  "/create",
  "/donation-offsets",
  "/login?returnTo=/offers/new",
  "/offers",
  "/offers/new",
  "/priority-correction-fund",
  "/signup?next=/wish-registry",
  "/status",
  "/methodology",
  "/mpgf",
  "/people",
  "/safety",
] as const;

function slug(route: string) {
  return route
    .replace(/^\//, "root-")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

test("record current public-route shell contracts", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const report: Array<Record<string, unknown>> = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: Array<{ route: string; status: number; url: string }> = [];
  let activeRoute = "";

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${activeRoute}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(`${activeRoute}: ${error.stack || error.message}`);
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${activeRoute}: ${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === "http://127.0.0.1:3210") {
      httpErrors.push({ route: activeRoute, status: response.status(), url: response.url() });
    }
  });

  for (const route of routes) {
    activeRoute = route;
    const before = {
      console: consoleErrors.length,
      page: pageErrors.length,
      failed: failedRequests.length,
      http: httpErrors.length,
    };

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load").catch(() => undefined);
    await page.waitForTimeout(2_000);

    const dom = await page.evaluate(() => {
      function visible(element: Element) {
        const html = element as HTMLElement;
        const style = getComputedStyle(html);
        const rect = html.getBoundingClientRect();
        return (
          !html.hidden &&
          html.getAttribute("aria-hidden") !== "true" &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function summarize(selector: string) {
        return [...document.querySelectorAll(selector)].map((element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          className: element.getAttribute("class"),
          text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
          visible: visible(element),
          ariaHidden: element.getAttribute("aria-hidden"),
          hiddenAncestor: Boolean(element.closest("[hidden], [aria-hidden='true'], [inert]")),
          ancestorTrail: (() => {
            const trail: string[] = [];
            let current: Element | null = element;
            while (current && trail.length < 7) {
              trail.push(
                `${current.tagName.toLowerCase()}${current.id ? `#${current.id}` : ""}${
                  current.classList.length ? `.${[...current.classList].slice(0, 3).join(".")}` : ""
                }`,
              );
              current = current.parentElement;
            }
            return trail;
          })(),
        }));
      }

      return {
        h1: summarize("h1"),
        nav: summarize('nav[aria-label="Primary"]'),
        main: summarize("main"),
        footer: summarize("footer, [role='contentinfo']"),
        topbarLabels: [
          ...document.querySelectorAll(".topbar-links > a, .topbar-links > details > summary"),
        ].map((item) => (item.textContent ?? "").replace(/\s+/g, " ").replace("▾", "").trim()),
        actionLabels: [...document.querySelectorAll(".topbar-actions a")].map((item) =>
          (item.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
        bodyText: (document.body.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 3_000),
        htmlLang: document.documentElement.lang,
        width: {
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        },
      };
    });

    const screenshot = testInfo.outputPath(`${slug(route)}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    report.push({
      requestedRoute: route,
      finalUrl: page.url(),
      title: await page.title(),
      documentStatus: response?.status() ?? null,
      dom,
      consoleErrors: consoleErrors.slice(before.console),
      pageErrors: pageErrors.slice(before.page),
      failedRequests: failedRequests.slice(before.failed),
      httpErrors: httpErrors.slice(before.http),
      screenshot,
    });
  }

  const reportPath = testInfo.outputPath("public-route-current-diagnostic.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await testInfo.attach("public-route-current-diagnostic", {
    path: reportPath,
    contentType: "application/json",
  });

  expect(report).toHaveLength(routes.length);
});
