from pathlib import Path
import re, subprocess, sys

root = Path(sys.argv[1]); BASE = 'ccc581e3e310d0ad3fc23cc101cf7c54cbe0b8bf'
OLD = '406f5e5033c6f07973bf8752ca93d7c6db2a85db'
OLD_BASE = '98723f7f7c45407d8303cf72acf38e9a35a0904c'
def git(*args): return subprocess.check_output(['git', '-C', str(root), *args], text=True)
def show(ref, path): return git('show', ref + ':' + path)
def edit(path, fn):
    p = root / path; before = p.read_text(); after = fn(before)
    assert after != before, f'No change: {path}'
    p.write_text(after.rstrip('\n')+'\n')
def once(s, before, after):
    assert s.count(before) == 1, f'Expected one occurrence: {before[:120]!r}'
    return s.replace(before, after, 1)
assert git('rev-parse', 'HEAD').strip() == BASE
assert not git('status', '--porcelain').strip()
# Restore only the approved shared footer copy and link inventory, not the later About deletion.
for file in ['src/lib/site.ts', 'src/components/layout/site-footer.tsx']:
    assert show(BASE, file) == show(OLD_BASE, file), f'Concurrent change: {file}'
    (root / file).write_text(show(OLD, file))
s = (root/'src/lib/site.ts').read_text()
a = s.index('export function getPrimaryNavLinks('); b = s.index('export function getTopbarActions(', a)
s = s[:a] + '''export function getPrimaryNavLinks(_isAuthenticated = false): SiteNavLinkItem[] {
  return [
    { href: "/feed", label: "Feed" },
    { href: "/discover", label: "Discover" },
    { href: "/messages", label: "Messages" },
    { href: "/commitments", label: "Commitments" },
  ];
}

''' + s[b:]
(root/'src/lib/site.ts').write_text(s)
# Keep the deployed charcoal styling and header implementation; change its route labels/inventory only.
def refined(s):
    a=s.index('export const REFINED_HEADER_LINKS:'); b=s.index('export const HEADER_UTILITY_LINKS',a)
    s=s[:a]+'export const REFINED_HEADER_LINKS: SiteNavLinkItem[] = getPrimaryNavLinks();\n\n'+s[b:]
    s=once(s, '  { href: "/messages", label: "Messages" },', '  { href: "/profile", label: "Profile" },')
    s=once(s, '{ href: "/invite", label: "Invite someone" }', '{ href: "/invite", label: "Invite" }')
    s=once(s, '  { href: "/walkthrough", label: "How it works" },', '  { href: "/evidence", label: "Evidence" },\n  { href: "/walkthrough", label: "Tour" },')
    return s
edit('src/lib/refined-header.ts', refined)
edit('src/app/layout.tsx', lambda s: once(once(s,
    'import { SmartQueryAutoEnhancer } from "@/components/search/smart-query-auto-enhancer";\n', ''),
    '          <SmartQueryAutoEnhancer />\n',''))
assert show(BASE,'src/components/search/smart-query-auto-enhancer.tsx') == show(OLD_BASE,'src/components/search/smart-query-auto-enhancer.tsx')
(root/'src/components/search/smart-query-auto-enhancer.tsx').unlink()

def topbar(s):
    s=once(s, '''import {
  Fragment,
  useId,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";''', 'import { Fragment, useId, useState, useTransition } from "react";')
    s=once(s, 'import type { SmartQueryClarification, SmartQueryInterpretation } from "@/lib/smart-query";\n','')
    s=once(s, '''import {
  filterSmartSiteSearchItems,
  getSmartSiteSearchTarget,
} from "@/lib/site-search-smart";
''','')
    a=s.index('interface QueryApiResponse {'); b=s.index('function getHrefPath',a); s=s[:a]+s[b:]
    a=s.index('  const searchResultsId = useId();'); b=s.index('  function handleLogout()',a)
    s=s[:a]+'''  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  function handleMenuOpenChange(menuKey: string, isOpen: boolean) {
    setOpenMenuKey((currentMenuKey) =>
      isOpen ? menuKey : currentMenuKey === menuKey ? null : currentMenuKey,
    );
  }

'''+s[b:]
    s=once(s, '''        <div className="topbar-menu-heading">
          <strong>{label}</strong>
          {summary ? <span>{summary}</span> : null}
        </div>''', '''        {summary ? <p className="topbar-menu-heading">{summary}</p> : null}''')
    s=once(s, ') : link.href ? (', ') : link.href && link.href !== primaryAction?.href && link.href !== authLink?.href ? (')
    a=s.index('      {showSearch ? (\n        <form'); b=s.index('      {refinedHeader ||',a)
    s=s[:a]+'''      {showSearch ? (
        <form action="/offers" className="topbar-search" method="get" role="search">
          <label className="sr-only" htmlFor={searchInputId}>Search offers</label>
          <div className="topbar-search-box" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
            <input id={searchInputId} name="search" placeholder="Search offers" type="search" />
            <button className="topbar-search-submit" type="submit">Search</button>
          </div>
        </form>
      ) : null}
'''+s[b:]
    s=once(s, '{refinedHeader && !showLogout ? (','{refinedHeader ? (')
    s=once(s, 'items={HEADER_UTILITY_LINKS}', 'items={HEADER_UTILITY_LINKS.filter((item) => item.href !== primaryAction?.href)}')
    s=once(s, '                ...(refinedHeader ? HEADER_UTILITY_LINKS : []),\n','')
    for description in ['Review owned and engaged offers.','Export or import account data.','Watch offers for later review.']:
        s=once(s, f', description: "{description}"', '')
    s=once(s, '              summary="Manage your saved and private workspace."\n','')
    return s
edit('src/components/layout/site-topbar.tsx',topbar)

def live(s):
    s=once(s, '["/feed", "Home", "data-mt-feed-link"]','["/feed", "Feed", "data-mt-feed-link"]')
    s=once(s, '["/discover", "Trades", "data-mt-discover-link"]','["/discover", "Discover", "data-mt-discover-link"]')
    s=once(s, '''        ["/commitments", "Commitments", ""],
        ["/profile", "Profile", ""],''', '''        ["/messages", "Messages", ""],
        ["/commitments", "Commitments", ""],''')
    s=once(s, '["/messages", "Messages"], ["/cart", "Saved offers"]','["/profile", "Profile"], ["/cart", "Saved offers"]')
    s=once(s, '["/invite", "Invite someone"], ["/walkthrough", "How it works"], ["/safety", "Safety"],',
                 '["/invite", "Invite"], ["/evidence", "Evidence"], ["/walkthrough", "Tour"], ["/safety", "Safety"],')
    return s
edit('public/moral-trade-live-navigation.js',live)
# The directory has its own static header; change only the same four navigation links.
edit('public/moral-trade-discover.html',lambda s:once(s,'''      <a href="/feed">Home</a>
      <a href="/discover" aria-current="page">Trades</a>
      <a href="/commitments">Commitments</a>
      <a href="/profile">Profile</a>''','''      <a href="/feed">Feed</a>
      <a href="/discover" aria-current="page">Discover</a>
      <a href="/messages">Messages</a>
      <a href="/commitments">Commitments</a>'''))
# Update only assertions that encode the superseded navigation labels/positions.
edit('src/lib/refined-header.test.ts', lambda s: s.replace('["Home", "Trades", "Commitments", "Profile"]', '["Feed", "Discover", "Messages", "Commitments"]')
    .replace('["/feed", "/discover", "/commitments", "/profile"]','["/feed", "/discover", "/messages", "/commitments"]')
    .replace('link.href === "/messages"','link.href === "/profile"'))
def browser(s):
    s=s.replace('["Home", "Trades", "Commitments", "Profile"]','["Feed", "Discover", "Messages", "Commitments"]')
    s=s.replace('["/feed", "/discover", "/commitments", "/profile"]','["/feed", "/discover", "/messages", "/commitments"]')
    s=once(s, 'await expect(nav.locator(\'[aria-current="page"]\')).toHaveCount(1);', 'await expect(nav.locator(\'[aria-current="page"]\')).toHaveCount(route === "/profile" ? 0 : 1);')
    s=s.replace('{ name: "Messages", exact: true }','{ name: "Evidence", exact: true }')
    s=once(s, 'const profile = page.locator(\'[data-mt-primary-links] a[href="/profile"]\');', 'const profile = page.locator(\'[data-mt-primary-links] a[href="/feed"]\');')
    s=once(s, 'toHaveAccessibleName("Profile")','toHaveAccessibleName("Feed")')
    s=once(s, 'await expect(page).toHaveURL(/\\/profile$/);','await expect(page).toHaveURL(/\\/feed$/);')
    s=once(s, '// The pre-existing streamed Profile application requires JavaScript; the', '// The pre-existing Feed application requires JavaScript; the')
    return s
edit('tests/refined-header.spec.ts',browser)
# The test files are supplied separately by this one-use controller.
for file in ['src/lib/selected-ui-cleanup.test.ts','tests/selected-ui-cleanup.spec.ts']:
    assert not (root/file).exists()
    (root/file).write_text((Path(__file__).parent/file.split('/')[-1]).read_text())
ALLOWED=['public/moral-trade-live-navigation.js','public/moral-trade-discover.html',
'src/app/layout.tsx','src/components/layout/site-footer.tsx','src/components/layout/site-topbar.tsx',
'src/components/search/smart-query-auto-enhancer.tsx','src/lib/site.ts','src/lib/refined-header.ts',
'src/lib/refined-header.test.ts','src/lib/selected-ui-cleanup.test.ts','tests/refined-header.spec.ts','tests/selected-ui-cleanup.spec.ts']
# The route removal, sitemap, CSS, APIs, all saved-data functions, and release configuration stay byte-for-byte unchanged.
subprocess.run(['git','-C',str(root),'add','--',*ALLOWED],check=True)
assert sorted(git('diff','--cached','--name-only').splitlines())==sorted(ALLOWED)
subprocess.run(['git','-C',str(root),'diff','--cached','--check'],check=True)
for file in ALLOWED:
    p=root/file
    if p.exists():
        data=p.read_text(); assert data.endswith('\n'),file
        assert not re.search(r'[ \t]+$',data,re.M),file
print('Validated exact twelve-path selected cleanup; About, sitemap, styling, data, and release controls unchanged.')
