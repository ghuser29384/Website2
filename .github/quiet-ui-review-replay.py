from pathlib import Path
import re
import hashlib

root = Path.cwd()
def read(n): return (root / n).read_text()
def write(n, s): (root / n).write_text(s)
def replace(n, old, new, count=1):
    s = read(n)
    assert s.count(old) == count, (n, old[:100], s.count(old))
    write(n, s.replace(old, new, count))

# Replay reviewed hunks only. The workflow verifies the complete resulting Git tree.
pat = r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> origin/export-quiet-ui-main\n'
core = read('public/moral-trade-live-core.txt')
assert len(re.findall(pat, core, re.S)) == 2
core = re.sub(pat, lambda m: m[1], core, flags=re.S)
for old, new in [('--lime:#477d60', '--sage:#b9cbbb'), ('var(--lime)', 'var(--sage)'), ('.lime{color:#789000}', '.lime{color:#365244}'), ('.tag.near{color:#697d00;border-color:#c8dd71;background:#f4f8da}', '.tag.near{color:#365244;border-color:#d2e0d3;background:#e7efe5}')]:
    assert old in core, old
    core = core.replace(old, new)
old = '''return `<section class="page" aria-label="Home"><div class="head">${actions()}</div><div class="mt-home-controls">
    ${tab([['focus', 'Focus'], ['plan', 'Plan resources']], 'now', 'now')}
    </div>'''
new = '''return `<section class="page" aria-label="Home"><div class="mt-home-controls">
    ${tab([['focus', 'Focus'], ['plan', 'Plan resources']], 'now', 'now')}
    ${actions()}</div>'''
assert core.count(old) == 1
core = core.replace(old, new)
write('public/moral-trade-live-core.txt', core)

s = read('public/moral-trade-live-feed.css')
assert len(re.findall(pat, s, re.S)) == 2
s = re.sub(pat, lambda m: m[2] if '--mt-feed-lime' in m[1] else m[1] + '}\n\n' + m[2], s, flags=re.S)
s = s.replace('.mt-home-controls { display: flex; align-items: center; justify-content: space-between; gap: 16px;', '.mt-home-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;')
s = s.replace('.mt-home-controls > .btn { font-size: 14px; min-height: 44px; }', '.mt-home-controls > .mt-feed-actions { margin: 0; }\n.mt-home-controls .mt-feed-actions > .btn { font-size: 14px; min-height: 44px; }')
s = s.replace('  .mt-home-controls > .tabs { gap: 16px; }', '  .mt-home-controls > .tabs { gap: 16px; flex-basis: 100%; }\n  .mt-home-controls > .mt-feed-actions { width: 100%; }')
write('public/moral-trade-live-feed.css', s)
s = re.sub(pat, lambda m: m[1], read('public/moral-trade-live.html'), flags=re.S)
digest = hashlib.sha256(core.encode()).hexdigest()
s, n = re.subn(r"digest !== '[0-9a-f]{64}'", f"digest !== '{digest}'", s)
assert n == 1
write('public/moral-trade-live.html', s)

# Current owner brief explicitly keeps these four destinations. Other new main
# features remain intact; Messages stays reachable through More and the footer.
replace('src/lib/site.ts', '''    { href: "/feed", label: "Feed" },
    { href: "/discover", label: "Discover" },
    { href: "/messages", label: "Messages" },
    { href: "/commitments", label: "Commitments" },''', '''    { href: "/feed", label: "Home" },
    { href: "/discover", label: "Trades" },
    { href: "/commitments", label: "Commitments" },
    { href: "/profile", label: "Profile" },''')
replace('src/lib/site.ts', '{ href: "/feed", label: "Feed" }', '{ href: "/feed", label: "Home" }')
replace('src/lib/site.ts', '{ href: "/discover", label: "Discover" }', '{ href: "/discover", label: "Trades" }')
replace('src/lib/refined-header.ts', '{ href: "/profile", label: "Profile" }', '{ href: "/messages", label: "Messages" }')
replace('public/moral-trade-live-navigation.js', '''        ["/feed", "Feed", "data-mt-feed-link"],
        ["/discover", "Discover", "data-mt-discover-link"],
        ["/messages", "Messages", ""],
        ["/commitments", "Commitments", ""],''', '''        ["/feed", "Home", "data-mt-feed-link"],
        ["/discover", "Trades", "data-mt-discover-link"],
        ["/commitments", "Commitments", ""],
        ["/profile", "Profile", ""],''')
replace('public/moral-trade-live-navigation.js', '["/profile", "Profile"], ["/cart", "Saved offers"]', '["/messages", "Messages"], ["/cart", "Saved offers"]')
replace('public/moral-trade-discover.html', '''      <a href="/feed">Feed</a>
      <a href="/discover" aria-current="page">Discover</a>
      <a href="/messages">Messages</a>
      <a href="/commitments">Commitments</a>''', '''      <a href="/feed">Home</a>
      <a href="/discover" aria-current="page">Trades</a>
      <a href="/commitments">Commitments</a>
      <a href="/profile">Profile</a>''')
replace('src/components/layout/site-topbar.tsx', 'if (href === "/feed" || href === "/discover")', 'if (href === "/" || href === "/feed" || href === "/discover")')
replace('src/components/layout/site-topbar.tsx', '''      <Link prefetch={false} aria-label="Moral Trade, home" className="brand mt-brand-link" href={brandHref}>
        <MoralTradeWordmark />
      </Link>''', '''      <a aria-label="Moral Trade, home" className="brand mt-brand-link" href={brandHref}>
        <MoralTradeWordmark />
      </a>''')
s = read('tests/discover-home-visual-alignment.spec.ts')
assert len(re.findall(pat, s, re.S)) == 1
write('tests/discover-home-visual-alignment.spec.ts', re.sub(pat, lambda m: m[1], s, flags=re.S))
for n in ['src/lib/refined-header.test.ts', 'src/lib/selected-ui-cleanup.test.ts', 'tests/returning-homepage.spec.ts', 'tests/public-routes.spec.ts', 'tests/selected-ui-cleanup.spec.ts', 'tests/refined-header.spec.ts', 'tests/contact-page-layout.spec.ts']:
    s = read(n).replace('["Feed", "Discover", "Messages", "Commitments"]', '["Home", "Trades", "Commitments", "Profile"]')
    s = s.replace('["/feed", "/discover", "/messages", "/commitments"]', '["/feed", "/discover", "/commitments", "/profile"]')
    write(n, s)
replace('src/lib/refined-header.test.ts', 'HEADER_UTILITY_LINKS.some((link) => link.href === "/profile")', 'HEADER_UTILITY_LINKS.some((link) => link.href === "/messages")')
s = read('src/lib/site.test.ts').replace('Feed and Discover', 'Home and Trades').replace('label: "Feed"', 'label: "Home"').replace('label: "Discover"', 'label: "Trades"').replace('link.label === "Feed"', 'link.label === "Home"').replace('link.label === "Discover"', 'link.label === "Trades"')
write('src/lib/site.test.ts', s)
replace('src/lib/public-route-smoke.test.ts', '''    "Feed",
    "Discover",
    "Messages",
    "Commitments",''', '''    "Home",
    "Trades",
    "Commitments",
    "Profile",''')
replace('src/lib/public-route-smoke.test.ts', 'label: "Feed"', 'label: "Home"')
s = read('src/lib/live-discover-navigation.test.ts').replace('[["/feed", "Feed"], ["/discover", "Discover"], ["/messages", "Messages"], ["/commitments", "Commitments"]]', '[["/feed", "Home"], ["/discover", "Trades"], ["/commitments", "Commitments"], ["/profile", "Profile"]]').replace('aria-current="page">Discover', 'aria-current="page">Trades')
write('src/lib/live-discover-navigation.test.ts', s)
replace('tests/returning-homepage.spec.ts', 'name: "Feed", exact: true', 'name: "Home", exact: true')
replace('tests/returning-homepage.spec.ts', 'name: "Discover", exact: true', 'name: "Trades", exact: true')
replace('tests/returning-homepage.spec.ts', 'primary.getByRole("link", { name: "Messages", exact: true })).toHaveAttribute("href", "/messages")', 'primary.getByRole("link", { name: "Profile", exact: true })).toHaveAttribute("href", "/profile")')
replace('tests/refined-header.spec.ts', 'toHaveCount(route === "/profile" ? 0 : 1)', 'toHaveCount(1)')
replace('tests/refined-header.spec.ts', 'toHaveAccessibleName("Feed")', 'toHaveAccessibleName("Home")')
replace('tests/quiet-ui.spec.ts', 'const utilityHeader = page.locator(".head");', 'const utilityHeader = page.locator(".mt-home-controls");\n    await expect(page.locator(".page .head")).toHaveCount(0);')
(root / '.github/workflows/quiet-ui-integrate-main.yml').unlink()
for n in ['public/moral-trade-live-core.txt', 'public/moral-trade-live-feed.css', 'public/moral-trade-live.html', 'tests/discover-home-visual-alignment.spec.ts']:
    assert not re.search(r'^(<<<<<<<|=======|>>>>>>>)', read(n), re.M), n

replace('src/lib/selected-ui-cleanup.test.ts', '["/profile", "/dashboard", "/trades/new", "/cart", "/invite", "/evidence", "/walkthrough", "/safety"]', '["/messages", "/dashboard", "/trades/new", "/cart", "/invite", "/evidence", "/walkthrough", "/safety"]')
replace('src/lib/public-route-smoke.test.ts', '["/feed", "/discover", "/messages", "/commitments"]', '["/feed", "/discover", "/commitments", "/profile"]')
replace('tests/public-routes.spec.ts', '"Feed", "Discover", "Messages", "Commitments",', '"Home", "Trades", "Commitments", "Profile",')
replace('tests/exact-live-now-recommendations.spec.ts', '''      "Feed",
      "Discover",
      "Messages",
      "Commitments",''', '''      "Home",
      "Trades",
      "Commitments",
      "Profile",''')
replace('tests/exact-live-now-recommendations.spec.ts', '''    const evidence = page.locator(".header-more").getByRole("link", { name: "Profile", exact: true });
    await expect(evidence).toBeVisible();''', '''    await expect(page.locator(".header-more").getByRole("link", { name: "Messages", exact: true })).toBeVisible();
    await page.locator(".header-more > summary").click();
    const profile = navigation.getByRole("link", { name: "Profile", exact: true });
    await expect(profile).toBeVisible();''')
replace('tests/exact-live-now-recommendations.spec.ts', '    await evidence.click();', '    await profile.click();')
replace('public/moral-trade-live-feed.css', '.mt-home-controls > .mt-feed-actions { margin: 0; }', '.mt-home-controls > .mt-feed-actions { margin: 0; padding: 0; border: 0; background: transparent; }')
replace('public/moral-trade-live-feed.css', '''/* The compact date and Create row must wrap independently of the removed intro. */
.mt-feed-actions {''', '''/* Scope the compact homepage row separately from feed-card action footers. */
.mt-home-controls > .mt-feed-actions {''')
replace('public/moral-trade-live-feed.css', '.mt-feed-actions .date {', '.mt-home-controls .mt-feed-actions .date {')
replace('public/moral-trade-live-feed.css', '.mt-feed-actions > .btn {\n', '.mt-home-controls .mt-feed-actions > .btn {\n')
s = read('tests/refined-header.spec.ts')
s += '''

test("the React brand navigates to the standalone homepage without RSC", async ({ page }) => {
  const rscRequests: string[] = [];
  await page.route(url => url.pathname === "/" && url.searchParams.has("_rsc"), route => {
    rscRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto("/contact");
  const navigation = page.waitForRequest(request => request.isNavigationRequest() && new URL(request.url()).pathname === "/");
  await page.getByRole("link", { name: "Moral Trade, home", exact: true }).click();
  await navigation;
  await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
  expect(rscRequests).toEqual([]);
});
'''
write('tests/refined-header.spec.ts', s)
print('Final live-core SHA256:', digest)
