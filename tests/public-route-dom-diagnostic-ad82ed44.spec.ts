import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { test, type Page } from "@playwright/test";

const BASE_SHA = "ad82ed44628deeadef038c21f2d9a36fa60f9da3";
const OUTPUT_DIR = "public-route-dom-diagnostic-ad82ed44";

const routes = [
  "/",
  "/login",
  "/signup",
  "/create",
  "/offers",
  "/cohort",
  "/donation-offsets",
  "/background-networking",
  "/mpgf/pools",
  "/team-and-governance",
] as const;

interface DiagnosticEvents {
  consoleErrors: string[];
  failedRequests: string[];
  pageErrors: string[];
  responseErrors: string[];
}

function safeName(route: string) {
  return route === "/" ? "root" : route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-");
}

function attachDiagnostics(page: Page, events: DiagnosticEvents) {
  page.on("console", (message) => {
    if (message.type() === "error") events.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    events.pageErrors.push(error.stack || error.message);
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(page.url() || "http://127.0.0.1:3210").origin) return;
    events.failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== new URL(page.url() || "http://127.0.0.1:3210").origin) return;
    if (response.status() >= 400) {
      events.responseErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
}

async function captureDom(page: Page, phase: string) {
  return page.evaluate((currentPhase) => {
    function describeElement(element: Element, index: number) {
      const htmlElement = element as HTMLElement;
      const style = getComputedStyle(htmlElement);
      const rect = htmlElement.getBoundingClientRect();
      const hiddenAncestor = htmlElement.closest("[hidden]");
      const ariaHiddenAncestor = htmlElement.closest('[aria-hidden="true"]');
      const inertAncestor = htmlElement.closest("[inert]");
      const ancestorTrail: Array<Record<string, unknown>> = [];
      let current: HTMLElement | null = htmlElement;

      for (let depth = 0; current && depth < 8; depth += 1) {
        const currentStyle = getComputedStyle(current);
        ancestorTrail.push({
          tag: current.tagName.toLowerCase(),
          id: current.id || null,
          className: current.className || null,
          hidden: current.hidden,
          ariaHidden: current.getAttribute("aria-hidden"),
          inert: current.hasAttribute("inert"),
          display: currentStyle.display,
          visibility: currentStyle.visibility,
          position: currentStyle.position,
          dataAttributes: Object.fromEntries(
            [...current.attributes]
              .filter((attribute) => attribute.name.startsWith("data-"))
              .map((attribute) => [attribute.name, attribute.value]),
          ),
        });
        current = current.parentElement;
      }

      const visible =
        !hiddenAncestor &&
        !ariaHiddenAncestor &&
        !inertAncestor &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") !== 0 &&
        rect.width > 0 &&
        rect.height > 0 &&
        htmlElement.getClientRects().length > 0;

      return {
        index,
        tag: element.tagName.toLowerCase(),
        id: htmlElement.id || null,
        className: htmlElement.className || null,
        role: htmlElement.getAttribute("role"),
        ariaLabel: htmlElement.getAttribute("aria-label"),
        hidden: htmlElement.hidden,
        ariaHidden: htmlElement.getAttribute("aria-hidden"),
        inert: htmlElement.hasAttribute("inert"),
        hiddenAncestor: hiddenAncestor
          ? `${hiddenAncestor.tagName.toLowerCase()}#${(hiddenAncestor as HTMLElement).id || ""}.${(hiddenAncestor as HTMLElement).className || ""}`
          : null,
        ariaHiddenAncestor: ariaHiddenAncestor
          ? `${ariaHiddenAncestor.tagName.toLowerCase()}#${(ariaHiddenAncestor as HTMLElement).id || ""}.${(ariaHiddenAncestor as HTMLElement).className || ""}`
          : null,
        inertAncestor: inertAncestor
          ? `${inertAncestor.tagName.toLowerCase()}#${(inertAncestor as HTMLElement).id || ""}.${(inertAncestor as HTMLElement).className || ""}`
          : null,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        clientRectCount: htmlElement.getClientRects().length,
        offsetParent: htmlElement.offsetParent
          ? `${htmlElement.offsetParent.tagName.toLowerCase()}#${(htmlElement.offsetParent as HTMLElement).id || ""}.${(htmlElement.offsetParent as HTMLElement).className || ""}`
          : null,
        visible,
        text: (htmlElement.textContent || "").replace(/\s+/g, " ").trim().slice(0, 500),
        outerHTML: htmlElement.outerHTML.slice(0, 3000),
        ancestorTrail,
      };
    }

    function describeAll(selector: string) {
      return [...document.querySelectorAll(selector)].map(describeElement);
    }

    return {
      phase: currentPhase,
      recordedAt: new Date().toISOString(),
      readyState: document.readyState,
      url: location.href,
      title: document.title,
      bodyTextLength: document.body.innerText.length,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      nextOverlayCount: document.querySelectorAll('[data-nextjs-dialog-overlay], nextjs-portal').length,
      hiddenFooterCount: document.querySelectorAll("[hidden] footer").length,
      ariaHiddenFooterCount: document.querySelectorAll('[aria-hidden="true"] footer').length,
      landmarks: {
        h1: describeAll("h1"),
        primaryNav: describeAll('nav[aria-label="Primary"]'),
        main: describeAll("main"),
        footer: describeAll("footer"),
        contentinfo: describeAll('[role="contentinfo"]'),
      },
    };
  }, phase);
}

test.describe.configure({ mode: "serial" });

for (const route of routes) {
  test(`diagnose landmark lifecycle for ${route}`, async ({ page }) => {
    test.setTimeout(45_000);
    await mkdir(OUTPUT_DIR, { recursive: true });

    const events: DiagnosticEvents = {
      consoleErrors: [],
      failedRequests: [],
      pageErrors: [],
      responseErrors: [],
    };
    attachDiagnostics(page, events);

    const snapshots: unknown[] = [];
    await page.goto(route, { waitUntil: "domcontentloaded" });
    snapshots.push(await captureDom(page, "domcontentloaded"));

    await page.waitForTimeout(250);
    snapshots.push(await captureDom(page, "plus-250ms"));

    await page.waitForTimeout(750);
    snapshots.push(await captureDom(page, "plus-1s"));

    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    snapshots.push(await captureDom(page, "network-idle-or-timeout"));

    await page.waitForTimeout(4_000);
    snapshots.push(await captureDom(page, "plus-5s"));

    const name = safeName(route);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${name}.png`),
      fullPage: true,
    });
    await writeFile(
      path.join(OUTPUT_DIR, `${name}.json`),
      `${JSON.stringify({ baseSha: BASE_SHA, route, finalUrl: page.url(), events, snapshots }, null, 2)}\n`,
      "utf8",
    );
  });
}
