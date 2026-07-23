import { mkdir, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

test("inspect the rendered Discover query controls", async ({ page }) => {
  await page.goto("/discover", { waitUntil: "networkidle" });
  await expect(page.locator("body")).not.toContainText("Loading Discover…");

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

    return {
      audit: { controls, textMatches, globals, scripts, title: document.title, url: location.href },
      inlineSources,
    };
  });

  await mkdir("test-results", { recursive: true });
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
  ]);
});
