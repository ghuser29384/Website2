import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.UI_UX_BASE_URL ?? "http://127.0.0.1:3210";
const outputRoot = process.env.UI_UX_OUTPUT_DIR ?? "artifacts/ui-ux/capture";
const sourceKind = process.env.UI_UX_SOURCE_KIND ?? "local";
const sourceCommit = process.env.UI_UX_SOURCE_COMMIT ?? "unknown";
const capturedAt = new Date().toISOString();

const viewports = [
  { id: "desktop-1440x1000", width: 1440, height: 1000 },
  { id: "tablet-1024x768", width: 1024, height: 768 },
  { id: "mobile-390x844", width: 390, height: 844 },
];

const routes = [
  { id: "root", route: "/", state: "signed-out" },
  { id: "walkthrough", route: "/walkthrough", state: "signed-out" },
  { id: "feed", route: "/feed", state: "signed-out" },
  { id: "discover", route: "/discover", state: "signed-out-empty-or-live" },
  { id: "offers-live", route: "/offers?view=live", state: "signed-out-empty-or-live" },
  { id: "offers-templates", route: "/offers?view=templates", state: "signed-out-example-library" },
  { id: "create", route: "/create", state: "signed-out" },
  { id: "trade-create", route: "/trades/new", state: "signed-out" },
  { id: "invite", route: "/invite", state: "signed-out" },
  { id: "messages", route: "/messages", state: "signed-out" },
  { id: "commitments", route: "/commitments", state: "signed-out" },
  { id: "evidence", route: "/evidence", state: "signed-out-empty-or-live" },
  { id: "evidence-example", route: "/evidence/example", state: "illustrative" },
  { id: "safety", route: "/safety", state: "public" },
  { id: "trust", route: "/trust", state: "public" },
  { id: "status", route: "/status", state: "public-service-boundary" },
  { id: "background-networking", route: "/background-networking", state: "public-pilot" },
  { id: "mpgf", route: "/mpgf", state: "public-pilot" },
  { id: "mpgf-pools", route: "/mpgf/pools", state: "public-pilot" },
  { id: "support", route: "/support", state: "public" },
  { id: "team-governance", route: "/team-and-governance", state: "public" },
  { id: "contact", route: "/contact", state: "public" },
  { id: "profile", route: "/profile", state: "signed-out" },
  { id: "login", route: "/login", state: "signed-out" },
  { id: "signup", route: "/signup", state: "signed-out" },
  { id: "not-found", route: "/ui-ux-audit-intentional-404", state: "error" },
];

function safeFilePart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const manifest = {
  schemaVersion: 1,
  capturedAt,
  baseUrl,
  sourceKind,
  sourceCommit,
  viewports,
  entries: [],
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    await context.addCookies([
      {
        name: "mt_walkthrough_seen",
        value: "1",
        url: new URL(baseUrl).origin,
        sameSite: "Lax",
      },
    ]);

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const targetUrl = new URL(route.route, baseUrl).toString();
      let responseStatus = null;
      let navigationError = null;
      try {
        const response = await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        responseStatus = response?.status() ?? null;
        await page.waitForTimeout(900);
      } catch (error) {
        navigationError = error instanceof Error ? error.message : String(error);
      }

      const fileName = `${safeFilePart(route.id)}__${safeFilePart(route.state)}__${viewport.id}__${safeFilePart(sourceKind)}__${sourceCommit.slice(0, 12)}.png`;
      const filePath = path.join(outputRoot, fileName);
      await page.screenshot({ path: filePath, fullPage: false });

      const diagnostics = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const headings = Array.from(document.querySelectorAll("h1"))
          .map((heading) => heading.textContent?.trim() ?? "")
          .filter(Boolean);
        const primaryActions = Array.from(
          document.querySelectorAll("a.button, button.button, [data-primary-action], main a[href]"),
        )
          .slice(0, 8)
          .map((element) => element.textContent?.trim().replace(/\s+/g, " ") ?? "")
          .filter(Boolean);
        return {
          documentWidth: root.scrollWidth,
          viewportWidth: root.clientWidth,
          bodyWidth: body?.scrollWidth ?? null,
          horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
          title: document.title,
          h1: headings,
          primaryActions,
          landmarks: {
            header: document.querySelectorAll("header").length,
            nav: document.querySelectorAll("nav").length,
            main: document.querySelectorAll("main").length,
            footer: document.querySelectorAll("footer").length,
          },
        };
      });

      manifest.entries.push({
        route: route.route,
        routeId: route.id,
        state: route.state,
        viewport: viewport.id,
        screenshot: fileName,
        requestedUrl: targetUrl,
        finalUrl: page.url(),
        responseStatus,
        navigationError,
        consoleErrors,
        pageErrors,
        ...diagnostics,
      });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const failures = manifest.entries.filter(
  (entry) =>
    entry.navigationError ||
    entry.pageErrors.length ||
    entry.consoleErrors.length ||
    entry.horizontalOverflow,
);
process.stdout.write(
  `Captured ${manifest.entries.length} UI states to ${outputRoot}; ${failures.length} entries require review.\n`,
);
