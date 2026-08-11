from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one marker in {path}, found {count}: {old[:140]!r}")
    path.write_text(text.replace(old, new, 1))


script = Path("public/moral-trade-live-now.js")
replace_once(
    script,
    '''  model.suggestedOpportunityCount = model.recommendations.filter(
    (recommendation) => recommendation.origin === "platform_generated",
  ).length;
  model.feedOpportunityCount = model.recommendations.length;
''',
    '''  model.suggestedOpportunityCount = model.recommendations.filter(
    (recommendation) => recommendation.origin === "platform_generated",
  ).length;
  model.publishedOpportunityCount = model.recommendations.filter(
    (recommendation) => recommendation.origin === "published",
  ).length;
  model.feedOpportunityCount = model.recommendations.length;
''',
)
replace_once(
    script,
    '''    if (model.matchingOpportunityCount > 0) {
      parts.push(
        `${model.matchingOpportunityCount} live ${
          model.matchingOpportunityCount === 1 ? "opportunity" : "opportunities"
        }`,
      );
    }
''',
    '''    if (model.publishedOpportunityCount > 0) {
      parts.push(
        `${model.publishedOpportunityCount} live ${
          model.publishedOpportunityCount === 1 ? "opportunity" : "opportunities"
        }`,
      );
    }
''',
)

wiring = Path("src/bottleneck-atlas-feed-wiring.test.ts")
replace_once(
    wiring,
    '''  assert.match(feed, /model\.feedOpportunityCount/);
  assert.match(feed, /generated \$\{/);
''',
    '''  assert.match(feed, /model\.feedOpportunityCount/);
  assert.match(feed, /model\.publishedOpportunityCount/);
  assert.match(feed, /recommendation\.origin === "published"/);
  assert.match(feed, /generated \$\{/);
''',
)
