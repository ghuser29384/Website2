from pathlib import Path

p = Path('src/app/canonical-visual-system.css')
s = p.read_text()
s = s.replace('--line-strong: #b8bec8;', '--line-strong: #89919e;').replace('--mt-line-dark: #b8bec8;', '--mt-line-dark: #89919e;')
needle = '.page-shell .eyebrow,\n.page-shell .detail-kicker,'
assert s.count(needle) == 1
s = s.replace(needle, '''/* Section titles must stay subordinate to the operational page title. */
.page-shell .section-head h2,
.page-shell .section-head-compact h2 {
  font-family: var(--font-body);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.page-shell .data-card h3,
.page-shell .detail-block h3,
.page-shell .concept-card h3 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

''' + needle)
p.write_text(s)
p = Path('public/moral-trade-canonical-static.css')
s = p.read_text().replace('--line-strong: #b8bec8;', '--line-strong: #89919e;')
assert s != p.read_text()
p.write_text(s)

p = Path('tests/quiet-ui.spec.ts')
s = p.read_text() + '''
for (const width of [1440, 390, 320]) {
  test(`shared page hierarchy remains quieter than its page title at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/about");
    const sizes = await page.evaluate(() => ({
      title: parseFloat(getComputedStyle(document.querySelector(".hero-copy h1")!).fontSize),
      sections: Array.from(document.querySelectorAll(".section-head h2")).map(el => parseFloat(getComputedStyle(el).fontSize)),
      strongBorder: getComputedStyle(document.documentElement).getPropertyValue("--line-strong").trim(),
    }));
    expect(sizes.title).toBeGreaterThanOrEqual(28);
    expect(sizes.title).toBeLessThanOrEqual(32);
    expect(sizes.sections.length).toBeGreaterThan(0);
    for (const size of sizes.sections) expect(size).toBeLessThan(sizes.title);
    expect(sizes.strongBorder).toBe("#89919e");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`quiet-about-${width}.png`), fullPage: false });
  });
}
'''
p.write_text(s)
print('Shared section hierarchy and stronger control boundaries updated; data and release gates unchanged.')
