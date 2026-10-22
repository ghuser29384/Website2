from pathlib import Path
import subprocess,sys
root=Path(sys.argv[1])
def edit(path, fn):
 p=root/path;s=p.read_text();n=fn(s);assert n!=s,path;p.write_text(n)
def replace(s,a,b,count=1):
 assert s.count(a)==count,(a,s.count(a));return s.replace(a,b)

def action(s):
 s=replace(s,'import test from "node:test";','import test from "node:test";\nimport { getTopbarActions } from "./site";')
 s=replace(s,r'assert.match(site, /href: "\/trades\/new", label: "Create"/);',
 'assert.deepEqual(getTopbarActions(true).primaryAction, { href: "/trades/new", label: "Create" });')
 s=replace(s,r'assert.match(site, /href: "\/worked-examples", label: "Worked examples"/);',
 r'assert.doesNotMatch(site, /href: "\/worked-examples"/);'+'\n  assert.ok(readFileSync("src/app/worked-examples/page.tsx", "utf8").length > 0);')
 return s
edit('src/lib/action-first-positioning.test.ts',action)

def live(s):
 s=replace(s,'[["/feed", "Home"], ["/discover", "Trades"], ["/commitments", "Commitments"], ["/profile", "Profile"]]',
 '[["/feed", "Feed"], ["/discover", "Discover"], ["/messages", "Messages"], ["/commitments", "Commitments"]]')
 s=replace(s,'"How it works"','"Tour"')
 s=replace(s,'aria-current="page">Trades','aria-current="page">Discover')
 return s
edit('src/lib/live-discover-navigation.test.ts',live)

def production(s):
 s=replace(s,'demonstrations and review notes are learning resources, not primary controls','demonstrations remain available without shared navigation promotion')
 s=replace(s,'  const learn = FOOTER_LINK_GROUPS.find((group) => group.title === "Learn")!;\n','')
 s=replace(s,'    assert.ok(learn.links.some((link) => link.href === href));','    assert.ok(read(`src/app${href}/page.tsx`).length > 0);')
 s=replace(s,'FOOTER_LINK_GROUPS.filter((group) => group.title !== "Learn").every','FOOTER_LINK_GROUPS.every')
 return s
edit('src/lib/production-feature-cleanup.test.ts',production)

def smoke(s):
 s=replace(s,'    "Create",\n    "Invite",\n','')
 s=replace(s,'    "Evidence",\n    "Safety",\n','')
 a=s.index('  assert.deepEqual(hrefs, ['); b=s.index('  assert.deepEqual(getTopbarActions',a)
 s=s[:a]+'''  assert.deepEqual(hrefs, ["/feed", "/discover", "/messages", "/commitments"]);
'''+s[b:]
 s=replace(s,'    "/worked-examples",\n    "/moral-trade/technical-spec",\n','')
 s=replace(s,'    "/privacy",\n    "/terms",\n','')
 marker='  assert.equal(hrefs.includes("/cart"), false);'
 s=replace(s,marker,'''  const footerSource = readRepoFile("src/components/layout/site-footer.tsx");
  for (const href of ["/privacy", "/terms", "/accessibility", "/contact"]) {
    assert.ok(footerSource.includes(`href="${href}"`));
  }
  for (const route of ["worked-examples", "moral-trade/technical-spec"]) {
    assert.ok(readRepoFile(`src/app/${route}/page.tsx`).length > 0);
    assert.ok(!footerHrefs.includes(`/${route}`));
  }
'''+marker)
 s=replace(s,r'  assert.match(siteSource, /href: "\/trades\/new", label: "Create"/);',
 r'  assert.match(siteSource, /href: "\/trades\/new",\s*label: "Create"/);')
 s=replace(s,r'  assert.match(topbarSource, /filterSmartSiteSearchItems/);',
 r'  assert.doesNotMatch(topbarSource, /filterSmartSiteSearchItems/);',count=2)
 s=replace(s,r'  assert.match(topbarSource, /placeholder="Search offers, people, pools, or evidence"/);',
 r'  assert.match(topbarSource, /placeholder="Search offers"/);',count=2)
 s=replace(s,r'  assert.match(topbarSource, /topbar-search-results/);',
 r'  assert.match(topbarSource, /<form action="\/offers" className="topbar-search" method="get" role="search"/);',count=2)
 s=replace(s,r'  assert.match(topbarSource, /\/api\/query\/interpret/);',
 r'  assert.doesNotMatch(topbarSource, /\/api\/query\/interpret/);')
 return s
edit('src/lib/public-route-smoke.test.ts',smoke)

def site(s):
 s=replace(s,'import { SITE_SEARCH_ITEMS }','import { HEADER_UTILITY_LINKS } from "@/lib/refined-header";\nimport { SITE_SEARCH_ITEMS }')
 s=replace(s,'assert.ok(primaryLinks.some((link) => link.href === "/evidence" && link.label === "Evidence"));',
 '''assert.ok(primaryLinks.every((link) => link.href !== "/evidence"));
  assert.ok(HEADER_UTILITY_LINKS.some((link) => link.href === "/evidence" && link.label === "Evidence"));''')
 s=replace(s,'group.title === "Marketplace"','group.title === "Explore"')
 s=replace(s,'link.label === "Personalized feed"','link.label === "Feed"')
 s=replace(s,'link.label === "Discover opportunities"','link.label === "Discover"')
 a=s.index('test("links to Trade controls'); b=s.index('test("makes all ten',a)
 s=s[:a]+'''test("Trade controls stays out of shared navigation while its directory entry remains", () => {
  assert.ok(FOOTER_LINK_GROUPS.every((group) => group.links.every((link) => link.href !== "/trade-controls")));
  assert.ok(getPrimaryNavLinks(false).every((link) => link.href !== "/trade-controls"));
  assert.ok(SITE_SEARCH_ITEMS.some((item) => item.href === "/trade-controls"));
});

'''+s[b:]
 return s
edit('src/lib/site.test.ts',site)
edit('src/lib/trade-controls-route-contract.test.ts',lambda s: replace(s,
 r'assert.match(siteSource, /href: "\/trade-controls", label: "Safeguard demonstrations"/);',
 r'assert.doesNotMatch(siteSource, /href: "\/trade-controls"/);'))
files=['action-first-positioning','live-discover-navigation','production-feature-cleanup','public-route-smoke','site','trade-controls-route-contract']
expected=sorted('src/lib/'+f+'.test.ts' for f in files)
changed=subprocess.check_output(['git','-C',str(root),'diff','--name-only'],text=True).splitlines()
assert sorted(changed)==expected,changed
subprocess.run(['git','-C',str(root),'add','--',*expected],check=True)
subprocess.run(['git','-C',str(root),'diff','--cached','--check'],check=True)
print('Updated only superseded navigation/search/footer expectations; all route, payment, and privacy checks retained.')
