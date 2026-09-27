from pathlib import Path
p=Path.cwd()
def replace(name,a,b,count=1):
 f=p/name;s=f.read_text();assert s.count(a)==count,(name,s.count(a),a[:75]);f.write_text(s.replace(a,b,count))
replace('src/sitewide-canonical-visual-system.test.ts','["paper", "#f5f2e9"]','["paper", "#f7f8fa"]')
replace('src/sitewide-canonical-visual-system.test.ts',r'assert.match(canonical, /\.hero\s*>\s*\.hero-grid\s+\.hero-copy\s*\{[\s\S]*background:\s*var\(--mt-black\)/);',r'assert.match(canonical, /\.hero\s*>\s*\.hero-grid\s+\.hero-copy\s*\{[^}]*background:\s*transparent/);')
replace('src/sitewide-canonical-visual-system.test.ts',r'assert.match(canonical, /background-image:[\s\S]*linear-gradient\(rgba\(17, 17, 17, 0\.035\)/);',r'assert.match(canonical, /body\s*\{[^}]*background-image:\s*none/);')
replace('src/app/canonical-visual-system.css',' * The product source of truth is the Home / Walkthrough language:\n * black framing, warm paper-grid workspaces, editorial serif hierarchy,\n * monospaced utility labels, cobalt actions, thin rules, and hard geometry.\n * This file is deliberately imported last so legacy and specialist routes', ' * Shared operational pages use the approved quiet visual language:\n * dark framing, neutral workspaces, restrained sans-serif hierarchy,\n * cobalt actions, muted sage, thin rules, and hard geometry.\n * This file follows the legacy styles so shared and specialist routes')
replace('src/feed-route.test.ts','label: "Feed"','label: "Home"')
replace('src/discover-home-visual-contract.test.ts','["/feed", "/discover", "/trade-controls", "/trades/new", "/commitments", "/evidence"]','["/feed", "/discover", "/profile", "/trades/new", "/commitments", "/evidence"]')
replace('src/discover-home-visual-contract.test.ts','#f5f2e9','#f7f8fa')
# Preserve the protected destination and no-prefetch behavior, independent of presentation classes.
replace('src/auth-resolution-wiring.test.ts',r'/<Link className="button button-secondary button-mini" href="\/offers" prefetch=\{false\}>/u',r'/<Link\b[^>]*href="\/offers"[^>]*prefetch=\{false\}[^>]*>Back to offers<\/Link>/u')
# Follow the shared owning view and explicitly assert account isolation.
replace('src/profile-priority-routing.test.ts','const priorityAction =', 'const priorityView = readFileSync("src/components/profile/profile-priorities-view.tsx", "utf8");\nconst priorityAction =')
replace('src/profile-priority-routing.test.ts','  assert.match(priorityPage, /ProfilePriorityEditor/);\n  assert.match(priorityPage, /priority_allocations,cause_areas/);','  assert.match(priorityPage, /<ProfilePrioritiesView searchParams=\\{searchParams\\}/);\n  assert.match(priorityView, /<ProfilePriorityEditor/);\n  assert.match(priorityView, /priority_allocations,cause_areas/);\n  assert.match(priorityView, /\\.eq\\("profile_id", viewer\\.authUser\\.id\\)/);')
replace('src/bottleneck-atlas-feed-wiring.test.ts','test("the Bottleneck Atlas is linked from the public navigation system", () => {\n  const site = read("src/lib/site.ts");\n  assert.match(site, /href: "\\/bottleneck-atlas", label: "Bottleneck Atlas"/);\n});','test("the Atlas stays available without crowding the site-wide task navigation", () => {\n  const site = read("src/lib/site.ts");\n  assert.doesNotMatch(site, /href: "\\/bottleneck-atlas"/);\n  assert.match(read("src/app/bottleneck-atlas/page.tsx"), /Field evidence is a search prior, not a live claim/);\n});')
# The module's paper grid and giant headings survived the shared stylesheet; repair the owner.
css=p/'src/app/commitments/commitments.module.css';s=css.read_text()
s=s.replace('--commitments-ink: #141310;', '--commitments-ink: #111111;').replace('--commitments-muted: #6d6961;', '--commitments-muted: #606773;').replace('--commitments-rule: rgba(20, 19, 16, 0.18);', '--commitments-rule: #e0e3e8;')
old='''  background:
    linear-gradient(rgba(32, 30, 24, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(32, 30, 24, 0.035) 1px, transparent 1px),
    #f8f5ec;
  background-size: 21px 21px;'''
assert s.count(old)==1;s=s.replace(old,'  background: #f7f8fa;')
s=s.replace('font-family: Georgia, "Times New Roman", serif;', 'font-family: var(--font-body), Arial, sans-serif;')
s=s.replace('font-size: clamp(2.8rem, 5.2vw, 5.5rem);','font-size: clamp(28px, 2.5vw, 32px);').replace('letter-spacing: -0.055em;', 'letter-spacing: -0.025em;').replace('line-height: 0.92;', 'line-height: 1.2;')
s=s.replace('font-size: clamp(1.35rem, 2vw, 2rem);', 'font-size: clamp(20px, 1.6vw, 24px);').replace('.hero h1 { font-size: 2.55rem; }', '.hero h1 { font-size: 28px; }')
s=s.replace('  font-size: 2rem;\n  font-weight: 500;\n  margin: 0;', '  font-size: 24px;\n  font-weight: 600;\n  margin: 0;')
s=s.replace('  padding: clamp(24px, 4vw, 54px);', '  padding: 24px;')
css.write_text(s)
replace('tests/commitments-loading.auth.ts','      await page.screenshot({ path: testInfo.outputPath(`loaded-empty-${viewport.width}.png`), fullPage: true });','''      const titleSize = await page.locator("#commitments-heading").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(titleSize).toBeGreaterThanOrEqual(28);
      expect(titleSize).toBeLessThanOrEqual(32);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`loaded-empty-${viewport.width}.png`), fullPage: true });''')
replace('src/lib/create-interface/create-ui-repairs.test.ts','background: #fffdf8 !important;', 'background: #ffffff !important;')
replace('tests/exact-live-now-recommendations.spec.ts','await expect(home).toHaveText("Feed");','await expect(home).toHaveText("Home");')
replace('tests/public-routes.spec.ts','await expect(feedControl).toHaveAccessibleName("Feed");','await expect(feedControl).toHaveAccessibleName("Home");')
replace('tests/public-routes.spec.ts','await expect(discoverControl).toHaveAccessibleName("Discover");','await expect(discoverControl).toHaveAccessibleName("Trades");')
replace('tests/refined-header.spec.ts','await expect(page.getByRole("link", { name: "Messages", exact: true })).toBeVisible();','await expect(page.locator(".mt-refined-header").getByRole("link", { name: "Messages", exact: true })).toBeVisible();')
replace('tests/refined-header.spec.ts','await page.getByRole("link", { name: "Moral Trade, home", exact: true }).click();','await page.locator(".mt-refined-header").getByRole("link", { name: "Moral Trade, home", exact: true }).click();')
# The automatic enhancer was removed on main. Lint the retained native form and its regression instead.
replace('.github/workflows/smart-query-qa.yml','src/components/search/smart-query-auto-enhancer.tsx','src/lib/selected-ui-cleanup.test.ts')
replace('src/live-now-priority-route.test.ts', '  assert.equal(context.rendered.match(/href="\\/complete-profile"/g)?.length, 2);\n  assert.match(context.rendered, /Set priorities →/);\n  assert.match(context.rendered, /Review profile →/);\n  assert.doesNotMatch(context.rendered, /\\/profile\\/priorities/);\n});\n', '  assert.equal(context.rendered.match(/href="\\/complete-profile"/g)?.length, 1);\n  assert.match(context.rendered, /href="\\/complete-profile">Set priorities →/);\n  assert.match(context.rendered, /href="\\/offers\\?view=live">Browse without personalization →/);\n  assert.match(context.rendered, /href="\\/profile\\/priorities">Review profile →/);\n});\n')
