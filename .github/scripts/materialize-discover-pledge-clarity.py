from __future__ import annotations

from pathlib import Path
import re

SOURCE_PATH = Path("src/discover/moral-trade-discover.source.html")
UNIT_TEST_PATH = Path("src/discover-pledge-clarity.test.ts")
BROWSER_TEST_PATH = Path("tests/discover-pledge-clarity.spec.ts")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new)


def verify_source(text: str) -> None:
    required = [
        "PREVIEW YOUR PLEDGE",
        "Preview your conditional pledge",
        "Share of the current gap",
        "This is arithmetic, not a forecast of other contributors.",
        "Moving the slider does not save a pledge or authorize payment.",
        "formatGapShare",
        '<div><h3>Share of the current gap</h3><p>Your proposed pledge divided by the current gap.',
    ]
    forbidden = [
        "TEST YOUR PLEDGE",
        "Low pivotality",
        "Moderate pivotality",
        "High pivotality",
        "How likely am I to be pivotal?",
        "inspect pivotality",
        "<h3>Pivotality</h3>",
    ]

    for value in required:
        if value not in text:
            raise SystemExit(f"missing pledge-clarity source contract: {value}")
    for value in forbidden:
        if value in text:
            raise SystemExit(f"forbidden pledge copy remained: {value}")


def materialize_source() -> None:
    text = SOURCE_PATH.read_text(encoding="utf-8")
    already_materialized = (
        "Preview your conditional pledge" in text
        and "formatGapShare" in text
        and "TEST YOUR PLEDGE" not in text
        and "<h3>Pivotality</h3>" not in text
    )

    if not already_materialized:
        text = replace_once(
            text,
            "const formatMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);\nconst clamp = (value, min, max) => Math.min(max, Math.max(min, value));",
            "const formatMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);\nconst formatGapShare = (share) => {\n  const percent = Math.max(0, Number(share) * 100);\n  if (!Number.isFinite(percent) || percent === 0) return '0%';\n  if (percent < 1) return `${percent.toFixed(2)}%`;\n  if (percent < 10) return `${percent.toFixed(1)}%`;\n  return `${Math.round(percent)}%`;\n};\nconst clamp = (value, min, max) => Math.min(max, Math.max(min, value));",
            "gap-share formatter",
        )
        text = replace_once(
            text,
            "Select any pool to inspect pivotality, failure conditions, authorization expiry, and exact proof.",
            "Select any pool to inspect its current gap, failure conditions, authorization expiry, and exact proof.",
            "radar instruction",
        )
        text = replace_once(
            text,
            '<div><h3>Pivotality</h3><p>Your pledge divided by the current gap. It shows how much of the known gap you close, not how likely other contributors are to act.</p></div>',
            '<div><h3>Share of the current gap</h3><p>Your proposed pledge divided by the current gap. It shows how much of the known gap you close, not how likely other contributors are to act.</p></div>',
            "threshold methodology label",
        )
        text = replace_once(
            text,
            "<span>TEST YOUR PLEDGE</span>",
            "<span>PREVIEW YOUR PLEDGE</span>",
            "radar preview label",
        )
        text = replace_once(
            text,
            '<span>${formatMoney(afterGap)} remains if activated with your pledge</span><button data-action="pledge" data-id="${active.id}">Pledge conditionally →</button>',
            '<span>${formatMoney(afterGap)} remains · ${formatGapShare(activeMetrics.gap > 0 ? pledge / activeMetrics.gap : 1)} of current gap</span><button data-action="pledge" data-id="${active.id}">Continue with a conditional pledge →</button>',
            "radar preview result",
        )

        inspector_pattern = re.compile(
            r"function renderPoolInspector\(state, item\) \{.*?\n\}\n\nfunction renderPersonInspector",
            re.S,
        )
        inspector_replacement = '''function renderPoolInspector(state, item) {
  const metrics = derivePoolMetrics(item);
  const pledge = state.pledgeAmounts[item.id] ?? Math.min(10, metrics.gap);
  const afterGap = Math.max(0, metrics.gap - pledge);
  const gapShare = metrics.gap > 0 ? pledge / metrics.gap : 1;
  return `<div class="inspector-kicker">${causeName(item.causeId)} · ${metrics.statusLabel}</div><h2>${escapeHtml(item.title)}</h2><p class="inspector-subtitle">${formatMoney(item.funded)} of ${formatMoney(item.threshold)} conditionally committed · ${item.contributors} contributors</p>
    <section class="inspector-section"><h3>Preview your conditional pledge</h3><div class="pool-pledge-box"><div class="detail-grid"><div class="detail-stat"><b>${formatMoney(pledge)}</b><span>Your proposed conditional pledge</span></div><div class="detail-stat"><b>${formatMoney(afterGap)}</b><span>Remaining after your pledge</span></div></div><input type="range" min="0" max="${Math.max(10, Math.min(250, metrics.gap))}" step="5" value="${pledge}" data-pledge-range data-pool-id="${item.id}" aria-label="Conditional pledge amount for ${escapeHtml(item.title)}" /><div class="pledge-result"><span>${formatGapShare(gapShare)} of current gap</span><span>${formatMoney(afterGap)} remains</span></div><p class="inspector-subtitle">Moving the slider does not save a pledge or authorize payment.</p></div></section>
    <section class="inspector-section"><h3>What your pledge changes</h3><dl class="integrity-list"><div class="integrity-row"><dt>Activation consequence</dt><dd>${escapeHtml(item.changes)}</dd></div><div class="integrity-row"><dt>Share of the current gap</dt><dd>Your pledge would close ${formatGapShare(gapShare)} of the current ${formatMoney(metrics.gap)} gap, leaving ${formatMoney(afterGap)}. This is arithmetic, not a forecast of other contributors.</dd></div><div class="integrity-row"><dt>If the threshold is missed</dt><dd>${escapeHtml(item.failure)}</dd></div><div class="integrity-row"><dt>Authorization expires</dt><dd>${formatDate(item.authorizationExpires)}. No charge occurs after expiry without renewed consent.</dd></div><div class="integrity-row"><dt>Verification</dt><dd>${escapeHtml(item.proof)}</dd></div></dl></section>
    <section class="inspector-section"><h3>Analytical position</h3><p class="inspector-subtitle">${Math.round(metrics.gapRatio * 100)}% of the threshold remains · ${metrics.urgencyDays} days to deadline · ${metrics.statusLabel}. Position is calculated from those terms.</p><button class="quiet-btn" data-action="open-method" data-method="threshold">How calculated →</button></section>
    <div class="inspector-actions"><button class="primary-btn wide" data-action="pledge" data-id="${item.id}">Continue with a conditional ${formatMoney(pledge)} pledge →</button><button class="outline-btn" data-action="toggle-compare" data-id="${item.id}">${state.compareIds.includes(item.id) ? 'Remove compare' : 'Add compare'}</button><button class="outline-btn" data-action="bookmark" data-id="${item.id}">${state.bookmarked.includes(item.id) ? 'Saved ◆' : 'Save ◇'}</button></div>`;
}

function renderPersonInspector'''
        text, inspector_count = inspector_pattern.subn(inspector_replacement, text)
        if inspector_count != 1:
            raise SystemExit(
                f"pool inspector: expected one function match, found {inspector_count}"
            )

    verify_source(text)
    SOURCE_PATH.write_text(text, encoding="utf-8")


def write_unit_test() -> None:
    UNIT_TEST_PATH.write_text(
        '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/discover/moral-trade-discover.source.html", "utf8");

test("Discover presents exact mechanical pledge arithmetic without calling it pivotality", () => {
  for (const required of [
    "PREVIEW YOUR PLEDGE",
    "Preview your conditional pledge",
    "Share of the current gap",
    "This is arithmetic, not a forecast of other contributors.",
    "Moving the slider does not save a pledge or authorize payment.",
    "formatGapShare",
  ]) {
    assert.ok(source.includes(required), `missing pledge-clarity contract: ${required}`);
  }

  for (const forbidden of [
    "TEST YOUR PLEDGE",
    "Low pivotality",
    "Moderate pivotality",
    "High pivotality",
    "How likely am I to be pivotal?",
    "inspect pivotality",
    "<h3>Pivotality</h3>",
  ]) {
    assert.equal(source.includes(forbidden), false, `misleading pledge copy remained: ${forbidden}`);
  }
});

test("sub-one-percent gap shares retain meaningful precision", () => {
  assert.match(source, /percent < 1[\\s\\S]*toFixed\\(2\\)/);
  assert.match(source, /pledge \\/ metrics\\.gap/);
  assert.match(source, /pledge \\/ activeMetrics\\.gap/);
});
''',
        encoding="utf-8",
    )


def write_browser_test() -> None:
    BROWSER_TEST_PATH.write_text(
        '''import { expect, test, type Page } from "@playwright/test";

const discoverUrl = "/discover?domain=pools&view=threshold&query=Find+pools&selected=pool-wild-research&selectedType=pool#discover";

async function setWildResearchPledge(page: Page, amount: number) {
  const slider = page
    .locator('[data-pledge-range][data-pool-id="pool-wild-research"]:visible')
    .last();
  await expect(slider).toBeVisible();
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, amount);
}

test("desktop pool inspector shows exact mechanical pledge arithmetic", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(discoverUrl);
  await expect(page.getByRole("heading", { name: /Wild-animal-suffering priority research pool/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview your conditional pledge" })).toBeVisible();
  await setWildResearchPledge(page, 35);

  await expect(page.getByText("0.43% of current gap", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$8,165 remains", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Moving the slider does not save a pledge or authorize payment.", { exact: true })).toBeVisible();
  await expect(page.getByText(/pivotality/i)).toHaveCount(0);
  await expect(page.getByText(/How likely am I to be pivotal/i)).toHaveCount(0);
  expect(pageErrors).toEqual([]);

  await page.screenshot({ path: "test-results/discover-pledge-clarity-desktop.png", fullPage: true });
});

test("mobile selected-pool sheet preserves the same explanation and stays within the viewport", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(discoverUrl);

  const sheet = page.locator(".inspector.mobile-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Preview your conditional pledge" })).toBeVisible();
  await setWildResearchPledge(page, 35);
  await expect(sheet.getByText("0.43% of current gap", { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText("$8,165 remains", { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText("Moving the slider does not save a pledge or authorize payment.", { exact: true })).toBeVisible();
  await expect(page.getByText(/pivotality/i)).toHaveCount(0);
  expect(pageErrors).toEqual([]);

  const bounds = await sheet.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  const sheetOverflow = await sheet.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(sheetOverflow).toBeLessThanOrEqual(1);
  const documentOverflow = await page.locator("html").evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);

  await page.screenshot({ path: "test-results/discover-pledge-clarity-mobile.png", fullPage: true });
});
''',
        encoding="utf-8",
    )


def main() -> None:
    materialize_source()
    write_unit_test()
    write_browser_test()


if __name__ == "__main__":
    main()
