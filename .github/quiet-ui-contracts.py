from pathlib import Path
import re

p = Path('public/moral-trade-discover.css')
s = p.read_text().replace('--paper: #f5f2e9;', '--paper: #f7f8fa;').replace('--paper-strong: #fffdf8;', '--paper-strong: #ffffff;').replace('--muted: #5e5c56;', '--muted: #606773;').replace('--line: #c7c5bd;', '--line: #e0e3e8;')
s = s.replace('font: 400 clamp(36px, 4.5vw, 54px)/1.08 Georgia, serif;', 'font: 600 clamp(28px, 2.5vw, 32px)/1.2 var(--sans);')
assert s != p.read_text()
p.write_text(s)
p = Path('tests/discover-home-visual-alignment.spec.ts')
s = p.read_text().replace('rgb(245, 242, 233)', 'rgb(247, 248, 250)')
assert s != p.read_text()
p.write_text(s)

# The owner removed the whole introduction, including its clock/greeting. Verify
# hydration and local-day changes do not recreate it; do not restore hidden clutter.
p = Path('tests/exact-live-local-time.spec.ts')
s = p.read_text()
start = s.index('async function expectLocalHeader(')
end = s.index('test.describe("exact live interface local time"', start)
s = s[:start] + '''async function expectHeaderlessHome(page: Page) {
  await expect(page.locator(".head")).toHaveCount(0);
  await expect(page.locator(".head .date")).toHaveCount(0);
  await expect(page.locator(".mt-home-controls")).toBeVisible();
  await expect(page.locator('[data-home-create="true"]')).toHaveAttribute("href", "/trades/new");
}

async function expectHeaderlessLiveViews(page: Page) {
  for (const section of ["focus", "plan", "focus"]) {
    await page.locator(`[data-now="${section}"]`).click();
    await expectHeaderlessHome(page);
  }
  await page.locator('.topbar nav a[href="/commitments"]').click();
  await expect(page).toHaveURL(/\\/commitments$/);
  await expect(page.locator("#commitments-heading")).toBeVisible();
  await expect(page.locator(".head .date")).toHaveCount(0);
}

''' + s[end:]
s = re.sub(r'await expectHeaderAcrossLiveViews\(page, \{.*?\n      \}\);', 'await expectHeaderlessLiveViews(page);', s, flags=re.S)
s = re.sub(r'await expectLocalHeader\(page, \{.*?\n      \}\);', 'await expectHeaderlessHome(page);', s, flags=re.S)
s = s.replace("uses the visitor's previous local day across Focus and Plan, then opens real Commitments", "does not restore the retired introduction on the previous local day")
s = s.replace("uses the visitor's next local day across Focus and Plan, then opens real Commitments", "does not restore the retired introduction on the next local day")
s = s.replace('refreshes after the local date and greeting period change', 'keeps controls usable when the local day changes')
assert 'expectLocalHeader' not in s and 'expectHeaderAcross' not in s
p.write_text(s)

p = Path('tests/returning-homepage-timezone.spec.ts')
s = p.read_text().replace('await expect(page.locator(".head .date")).toBeVisible({ timeout: 30_000 });', 'await expect(page.locator(".mt-home-controls")).toBeVisible();')
start = s.index('async function expectLocalGreeting(')
end = s.index('test.describe(', start)
s = s[:start] + '''async function expectNoReintroducedHeader(page: Page) {
  await expect(page.locator(".head")).toHaveCount(0);
  await expect(page.locator('[data-mt-local-greeting="true"]')).toHaveCount(0);
  await expect(page.locator(".mt-home-controls")).toBeVisible();
  await expect(page.locator('[data-home-create="true"]')).toBeVisible();
}

''' + s[end:]
s = re.sub(r'await expectLocalGreeting\(page, \{.*?\n    \}\);', 'await expectNoReintroducedHeader(page);', s, flags=re.S)
s = s.replace("uses the visitor's previous local date and evening greeting", "opens directly into controls on the previous local day")
s = s.replace("uses the visitor's next local date and morning greeting", "opens directly into controls on the next local day")
s = s.replace('refreshes after the local date and greeting period change', 'does not restore the introduction after local date refresh')
assert 'expectLocalGreeting' not in s
p.write_text(s)

p = Path('tests/returning-homepage.spec.ts')
s = p.read_text().replace('button[data-action="create"]', '[data-home-create="true"]')
start = s.index('    const date = page.locator(".head .date");')
end = s.index('    const feed = ', start)
s = s[:start] + '    await expect(page.locator(".head")).toHaveCount(0);\n\n' + s[end:]
s = s.replace('    await expect(feed.getByText("No profile loaded", { exact: true })).toBeVisible();\n    await expect(feed.getByText("No recommendations shown", { exact: true })).toBeVisible();', '''    const explanation = feed.locator(".mt-feed-explanation");
    await expect(explanation).not.toHaveAttribute("open", "");
    await explanation.locator("summary").click();
    await expect(explanation).toHaveAttribute("open", "");
    await expect(explanation).toContainText("No profile loaded");
    await expect(explanation).toContainText("No recommendations shown");''')
s = s.replace('      "/complete-profile",\n', '      "/profile/priorities",\n')
s = s.replace('    await expect(page.getByRole("link", { name: "Review profile →" })).toBeVisible();', '''    const explanation = page.locator(".mt-feed-explanation");
    await expect(explanation).not.toHaveAttribute("open", "");
    await explanation.locator("summary").click();
    await expect(page.getByRole("link", { name: "Review profile →" })).toBeVisible();''')
p.write_text(s)
print('Aligned Discover and retained exact interaction coverage for the intentionally retired home introduction.')
