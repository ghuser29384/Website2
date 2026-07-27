from pathlib import Path

replacements = [
    (
        Path("src/lib/action-first-positioning.test.ts"),
        '''test("the returning homepage keeps the action-first screenshot contract", () => {
  assert.doesNotMatch(home, /A trade worth considering\./);
  assert.match(home, /href="\/offers\?view=templates"/);
  assert.match(home, /Offer a trade/);
  assert.match(home, /Offer this trade/);
  assert.match(home, /Verifiable financial contribution/);
  assert.match(home, /Proof method/);
});''',
        '''test("the returning homepage keeps action-first controls tied to the authenticated Feed", () => {
  assert.doesNotMatch(home, /A trade worth considering\./);
  assert.match(home, /href="\/offers\?view=templates"/);
  assert.match(home, /Offer a trade/);
  assert.match(home, /href=\{recommendation\.href\}/);
  assert.match(home, /recommendation\.ctaLabel/);
  assert.match(home, /Open full Feed/);
  assert.match(home, /Offer another trade/);
  assert.match(home, /No generic or demo records are substituted/);
});''',
    ),
    (
        Path("src/lib/public-route-smoke.test.ts"),
        '''test("returning homepage keeps the screenshot match facts explicit and bounded", () => {
  const pageSource = readRepoFile("src/app/page.tsx");
  const homeSource = readRepoFile("src/components/home/home-page.tsx");

  assert.doesNotMatch(pageSource, /getMarketplaceOverview|buildMarketplaceSurface|listOpenOffersPage/);
  assert.match(homeSource, /11 completed/);
  assert.match(homeSource, /96% on-time verification/);
  assert.match(homeSource, /Jul 23, 2026/);
  assert.match(homeSource, /7 days left/);
  assert.match(homeSource, /setRemainingMatches/);
  assert.match(homeSource, /Math\.max\(0, count - 1\)/);
  assert.equal(homeSource.includes("total value traded"), false);
  assert.equal(homeSource.includes("registered users"), false);
});''',
        '''test("returning homepage derives match facts from the authenticated Feed snapshot", () => {
  const pageSource = readRepoFile("src/app/page.tsx");
  const homeSource = readRepoFile("src/components/home/home-page.tsx");
  const snapshotSource = readRepoFile("src/lib/home-feed-snapshot.ts");

  assert.doesNotMatch(pageSource, /getMarketplaceOverview|buildMarketplaceSurface|listOpenOffersPage/);
  assert.match(pageSource, /getLiveNowA1Response/);
  assert.match(pageSource, /projectHomeFeedSnapshot/);
  assert.match(pageSource, /exposureLimit: 1/);
  assert.match(homeSource, /data-feed-item-id/);
  assert.match(homeSource, /data-feed-item-key/);
  assert.match(homeSource, /data-exposure-request-id/);
  assert.match(snapshotSource, /feedItemKey: `\$\{type\}:\$\{id\}`/);
  assert.match(
    snapshotSource,
    /exposureRequestId: identifier\(item\.exposureRequestId\) \?\? fallbackRequestId/,
  );
  assert.doesNotMatch(
    homeSource,
    /11 completed|96% on-time verification|Jul 23, 2026|7 days left|setRemainingMatches/,
  );
  assert.match(homeSource, /No generic or demo records are substituted/);
  assert.equal(homeSource.includes("total value traded"), false);
  assert.equal(homeSource.includes("registered users"), false);
});''',
    ),
]

for path, old, new in replacements:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"expected legacy assertion block missing from {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
