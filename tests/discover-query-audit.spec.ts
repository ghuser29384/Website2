import { mkdir, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

test("inspect the rendered Discover query controls", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/discover", { waitUntil: "networkidle" });
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { __moralTradeSmartQueryLoaded?: boolean })
            .__moralTradeSmartQueryLoaded,
        ),
      ),
    )
    .toBe(true);
  await expect(page.locator('script[src$="/moral-trade-smart-query.js"]')).toHaveCount(1);

  const audit = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("input, textarea, select, button, form")]
      .map((element) => {
        const htmlElement = element as HTMLElement;
        const input = element as HTMLInputElement;
        const select = element as HTMLSelectElement;
        return {
          tag: element.tagName.toLowerCase(),
          type: input.type || "",
          name: input.name || "",
          id: htmlElement.id || "",
          className: htmlElement.className || "",
          text: (htmlElement.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180),
          placeholder: input.placeholder || "",
          value: input.value || select.value || "",
          action: element instanceof HTMLFormElement ? element.action : "",
          data: { ...htmlElement.dataset },
        };
      })
      .filter((entry) =>
        /search|query|filter|sort|constraint|value|cause|domain|deadline|verified|budget/i.test(
          JSON.stringify(entry),
        ),
      );

    const textMatches = [...document.querySelectorAll("body *")]
      .filter((element) =>
        /parsed constraints|search interpretation|run search|opened value field/i.test(
          (element.textContent || "").replace(/\s+/g, " "),
        ),
      )
      .slice(0, 30)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: (element as HTMLElement).id,
        className: (element as HTMLElement).className,
        text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 500),
        html: element.outerHTML.slice(0, 1_500),
      }));

    const globals = Object.keys(window)
      .filter((key) => /search|query|filter|constraint|discover/i.test(key))
      .sort();

    const inlineSources = [...document.scripts]
      .filter((script) => !script.src && (script.textContent?.length ?? 0) > 1_000)
      .map((script) => script.textContent ?? "");
    const scripts = [...document.scripts].map((script) => ({
      src: script.src,
      textLength: script.textContent?.length ?? 0,
    }));

    function closestOfferRow(control: Element) {
      let current = control.parentElement;
      for (let depth = 0; current && depth < 14; depth += 1) {
        const text = (current.textContent || "").replace(/\s+/g, " ").trim();
        if (
          /REQUESTED BY/i.test(text) &&
          /MECHANISM/i.test(text) &&
          /DEADLINE/i.test(text) &&
          /TERMS/i.test(text)
        ) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }

    const rowElements = [...document.querySelectorAll("button, a")]
      .filter((element) => /^Offer(?:\s*→)?$/i.test((element.textContent || "").trim()))
      .map(closestOfferRow)
      .filter((element): element is HTMLElement => Boolean(element));
    const uniqueRows = [...new Set(rowElements)];
    const offerRows = uniqueRows.map((element, index) => ({
      index,
      tag: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      text: (element.textContent || "").replace(/\s+/g, " ").trim(),
      html: element.outerHTML,
    }));

    return {
      audit: {
        controls,
        textMatches,
        globals,
        scripts,
        title: document.title,
        url: location.href,
        offerRows: offerRows.map(({ html, ...row }) => row),
      },
      inlineSources,
      dom: document.documentElement.outerHTML,
      offerRows,
    };
  });

  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/discover-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/discover-mobile.png", fullPage: true });
  await Promise.all([
    writeFile(
      "test-results/discover-query-audit.json",
      `${JSON.stringify(audit.audit, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      "test-results/discover-inline-source.js",
      audit.inlineSources.join("\n\n/* --- INLINE SCRIPT BOUNDARY --- */\n\n"),
      "utf8",
    ),
    writeFile("test-results/discover-dom.html", audit.dom, "utf8"),
    writeFile(
      "test-results/discover-offer-rows.json",
      `${JSON.stringify(audit.offerRows, null, 2)}\n`,
      "utf8",
    ),
  ]);
});

test("Discover sends natural-language queries through the shared interpreter", async ({ page }) => {
  const requests: Array<Record<string, unknown>> = [];

  await page.route("**/api/query/interpret", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        interpretation: {
          originalQuery: body.query,
          normalizedQuery: "verified animal welfare work for $50",
          parsedConstraintCount: 2,
          confidence: 0.72,
          reasonCodes: ["ambiguous_amount"],
          needsClarification: true,
          clarification: {
            field: "amount",
            question: "Should $50 be a maximum, a minimum, or an exact amount?",
            options: ["Maximum", "Minimum", "Exact"],
          },
        },
        target: "/discover?q=verified%20animal%20welfare%20work%20for%20%2450",
        usedLlm: false,
      }),
    });
  });

  await page.goto("/discover", { waitUntil: "networkidle" });
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { __moralTradeSmartQueryLoaded?: boolean })
            .__moralTradeSmartQueryLoaded,
        ),
      ),
    )
    .toBe(true);

  const form = page.locator("#command-form");
  await expect(form).toBeVisible();
  const queryInput = form.locator('input[name="q"], input[name="command"], #command-input');
  await expect(queryInput).toBeVisible();
  await queryInput.fill("Verified animal welfare work for $50");
  await form.locator('button[type="submit"]').click();

  const clarification = page.getByTestId("discover-smart-query-clarification");
  await expect(clarification).toContainText("One detail changes the results.");
  await expect(clarification).toContainText("Should $50 be a maximum, a minimum, or an exact amount?");
  await expect(clarification.getByRole("button", { name: "Maximum" })).toBeVisible();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({
    query: "Verified animal welfare work for $50",
    surface: "discover",
  });
});
