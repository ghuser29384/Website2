from pathlib import Path
import base64, hashlib, json, subprocess, sys

p = Path(sys.argv[1]).resolve()
blobs = {
 'src/components/walkthrough/quick-walkthrough.tsx': 'f889b7f5302f2ec9d755be24f4001a3a669fbbbf',
 'src/components/walkthrough/quick-walkthrough.css': '02e51021e5bda697a1aeaebc5e804e9d5105d525',
 'src/lib/quick-walkthrough.ts': 'e8f1baf0e517f39b04d95842de957d1da5f85497',
 'src/app/start/page.tsx': 'cf19bf69be0615d48e821b44aca31a4145dfd2db',
 'src/app/start/start.module.css': 'bcf106d76473af306cc57f439767ece65f640aee',
 'src/lib/start-paths.test.ts': '4c2efe1dad83325ea77e12477c2afa70dc3466c7',
 'tests/start-page.spec.ts': 'c25d6337a85a73f96ff953bf13ed51d9e2e0be68',
}
for name, sha in blobs.items():
 raw = subprocess.check_output(['gh','api',f'repos/ghuser29384/Website2/git/blobs/{sha}'])
 blob = json.loads(raw)
 assert blob['sha'] == sha and blob['encoding'] == 'base64'
 content = base64.b64decode(blob['content'])
 assert hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest() == sha
 target=p/name; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(content)
(p/'src/lib/start-paths.ts').write_text('''/** Keep the existing account-aware Create handoff; an example never pre-fills it. */
export function getStartCreateHref(isAuthenticated: boolean) {
  return isAuthenticated ? "/create" : "/signup?returnTo=/create";
}
''')
f=p/'src/lib/action-first-positioning.test.ts'
s=f.read_text().replace('assert.match(start, /START_PATHS/);','assert.match(start, /QuickWalkthrough/);').replace('assert.match(start, /<h1>Get started<\\/h1>/);','assert.match(start, /<QuickWalkthrough/);')
f.write_text(s)
f=p/'src/lib/public-route-smoke.test.ts';s=f.read_text();a=s.index('  assert.match(startPage, /<h1>Get started');b=s.index('\n',s.index('  assert.match(startPathsSource, /Browse trades/);',a))
s=s[:a]+'''  assert.match(startPage, /<QuickWalkthrough/);
  assert.match(startPage, /Donations are completed on Every\\.org/);
  assert.match(startPage, /Moral Trade does not hold funds, offer escrow/);
  assert.doesNotMatch(startPage, /getMarketplaceOverview|growth-progress-card/);
  const introSource = readRepoFile("src/components/walkthrough/quick-walkthrough.tsx");
  assert.match(introSource, /Different priorities. A better trade/);
  assert.match(introSource, /Find terms that work for both/);
  assert.match(introSource, /Skip the example/);
  for (const href of ["/discover", "/walkthrough", "/donate", "/pools"]) {
    assert.ok(introSource.includes(`href="${href}"`));
  }
  const startPathsSource = readRepoFile("src/lib/start-paths.ts");
  assert.match(startPathsSource, /\\/signup\\?returnTo=\\/create/);''' + s[b:]; f.write_text(s)
for name in ['tests/pilot-copy.spec.ts','tests/meta-explanatory-copy.spec.ts']:
 f=p/name;s=f.read_text().replace('name: "Get started"','name: "Different priorities. A better trade."');f.write_text(s)
f=p/'tests/sitewide-canonical-visual-fidelity.spec.ts';s=f.read_text();a=s.index('test("Start action choices');b=s.index('\ntest("Complete Profile',a)
s=s[:a]+'''test("Start example sides render as readable non-overlapping contributions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/start", { timeout: 60_000, waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1, name: "Different priorities. A better trade." })).toBeVisible();
  const example = page.getByRole("region", { name: "Example exchange" });
  const people = example.locator("article");
  await expect(people).toHaveCount(2);
  await expect(page.getByRole("complementary", { name: "Current service state" })).toHaveCount(0);
  const left = await rect(people.nth(0));
  const right = await rect(people.nth(1));
  expect(left.right).toBeLessThanOrEqual(right.left + 1);
  await expect(people.nth(0)).toContainText("Donate $20");
  await expect(people.nth(1)).toContainText("30 days");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("start-exchange-1440.png"), fullPage: false });
});
''' + s[b:];f.write_text(s)
