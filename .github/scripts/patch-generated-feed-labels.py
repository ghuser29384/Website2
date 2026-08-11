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
    '''    const metadata =
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? value.metadata
        : {};
    const opportunityType = allowedOpportunityTypes.has(value.opportunityType)
''',
    '''    const metadata =
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? value.metadata
        : {};
    const origin =
      metadata.origin === "platform_generated" ? "platform_generated" : "published";
    const opportunityType = allowedOpportunityTypes.has(value.opportunityType)
''',
)
replace_once(
    script,
    '''    return {
      id,
      opportunityType,
      href: safePath(value.href, defaultHref),
''',
    '''    return {
      id,
      origin,
      opportunityType,
      href: safePath(value.href, defaultHref),
''',
)
replace_once(
    script,
    '''  if (model.status === "ready" && !model.recommendations.length) {
    model.status = "unavailable";
  }
''',
    '''  model.suggestedOpportunityCount = model.recommendations.filter(
    (recommendation) => recommendation.origin === "platform_generated",
  ).length;
  model.feedOpportunityCount = model.recommendations.length;

  if (model.status === "ready" && !model.recommendations.length) {
    model.status = "unavailable";
  }
''',
)
replace_once(
    script,
    '''  function opportunityVisual(type) {
    if (type === "donation_redirect") {
''',
    '''  function opportunityVisual(type, generated) {
    if (generated) {
      return {
        key: "suggested",
        label: "Potential trade",
        symbol: "◇",
        fromLabel: "You might offer",
        toLabel: "Could advance",
        connector: "↔",
      };
    }
    if (type === "donation_redirect") {
''',
)
replace_once(
    script,
    '''  function recommendationCard(recommendation, rank) {
    const visual = opportunityVisual(recommendation.opportunityType);
''',
    '''  function recommendationCard(recommendation, rank) {
    const visual = opportunityVisual(
      recommendation.opportunityType,
      recommendation.origin === "platform_generated",
    );
''',
)
replace_once(
    script,
    '''    return `<article class="story mt-feed-card mt-feed-card--${visual.key}" data-mt-live-now-recommendation="${escapeHtml(
      recommendation.id,
    )}" data-opportunity-type="${escapeHtml(
      recommendation.opportunityType,
    )}" data-opportunity-id="${escapeHtml(recommendation.id)}" data-rank="${rank}">
''',
    '''    return `<article class="story mt-feed-card mt-feed-card--${visual.key}" data-mt-live-now-recommendation="${escapeHtml(
      recommendation.id,
    )}" data-opportunity-type="${escapeHtml(
      recommendation.opportunityType,
    )}" data-generated="${
      recommendation.origin === "platform_generated" ? "true" : "false"
    }" data-opportunity-id="${escapeHtml(recommendation.id)}" data-rank="${rank}">
''',
)
replace_once(
    script,
    '''  function opportunityTypeLegend() {
    const counts = new Map([
      ["offer", 0],
      ["donation_redirect", 0],
      ["donation_pool", 0],
    ]);
    model.recommendations.forEach((recommendation) => {
      counts.set(
        recommendation.opportunityType,
        (counts.get(recommendation.opportunityType) || 0) + 1,
      );
    });
    return [...counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([type, count]) => {
        const visual = opportunityVisual(type);
        return `<span class="mt-feed-legend-item mt-feed-legend-item--${escapeHtml(
          visual.key,
        )}"><i aria-hidden="true">${escapeHtml(visual.symbol)}</i>${escapeHtml(
          visual.label,
        )}<b>${count}</b></span>`;
      })
      .join("");
  }

  function renderReadyState() {
''',
    '''  function opportunityTypeLegend() {
    const counts = new Map([
      ["suggested", 0],
      ["offer", 0],
      ["donation_redirect", 0],
      ["donation_pool", 0],
    ]);
    model.recommendations.forEach((recommendation) => {
      const key =
        recommendation.origin === "platform_generated"
          ? "suggested"
          : recommendation.opportunityType;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([type, count]) => {
        const visual =
          type === "suggested"
            ? opportunityVisual("offer", true)
            : opportunityVisual(type, false);
        return `<span class="mt-feed-legend-item mt-feed-legend-item--${escapeHtml(
          visual.key,
        )}"><i aria-hidden="true">${escapeHtml(visual.symbol)}</i>${escapeHtml(
          visual.label,
        )}<b>${count}</b></span>`;
      })
      .join("");
  }

  function feedCompositionLabel() {
    const parts = [];
    if (model.matchingOpportunityCount > 0) {
      parts.push(
        `${model.matchingOpportunityCount} live ${
          model.matchingOpportunityCount === 1 ? "opportunity" : "opportunities"
        }`,
      );
    }
    if (model.suggestedOpportunityCount > 0) {
      parts.push(
        `${model.suggestedOpportunityCount} generated ${
          model.suggestedOpportunityCount === 1 ? "possibility" : "possibilities"
        }`,
      );
    }
    return parts.join(" · ") || "No opportunity inventory";
  }

  function renderReadyState() {
''',
)
replace_once(
    script,
    '''        <div class="mt-feed-toolbar-title"><div class="eyebrow blue">For you</div><h2>Live opportunities <span>${escapeHtml(
          String(model.matchingOpportunityCount),
        )}</span></h2><p>${escapeHtml(formatRefreshTime(model.generatedAt))}</p></div>
''',
    '''        <div class="mt-feed-toolbar-title"><div class="eyebrow blue">For you</div><h2>Opportunities for you <span>${escapeHtml(
          String(model.feedOpportunityCount),
        )}</span></h2><p>${escapeHtml(formatRefreshTime(model.generatedAt))} · ${escapeHtml(
          feedCompositionLabel(),
        )}</p></div>
''',
)
replace_once(
    script,
    '''        ["No guessed priorities", "No demo records", "Live opportunities only"],
''',
    '''        ["No guessed priorities", "No demo records", "No invented counterparties"],
''',
)

css = Path("public/moral-trade-live-feed.css")
replace_once(
    css,
    '''  --mt-feed-public-goods: #526b00;
''',
    '''  --mt-feed-public-goods: #526b00;
  --mt-feed-suggested: #6b3fc4;
''',
)
replace_once(
    css,
    '''.mt-feed-legend-item--public-goods {
  --mt-kind: var(--mt-feed-public-goods);
}
''',
    '''.mt-feed-legend-item--public-goods {
  --mt-kind: var(--mt-feed-public-goods);
}

.mt-feed-legend-item--suggested {
  --mt-kind: var(--mt-feed-suggested);
}
''',
)
replace_once(
    css,
    '''.mt-feed-card[data-opportunity-type="donation_pool"],
.mt-feed-card--public-goods {
  --mt-kind: var(--mt-feed-public-goods);
}
''',
    '''.mt-feed-card[data-opportunity-type="donation_pool"],
.mt-feed-card--public-goods {
  --mt-kind: var(--mt-feed-public-goods);
}

.mt-feed-card--suggested {
  --mt-kind: var(--mt-feed-suggested);
  border-style: dashed;
  background: color-mix(in srgb, var(--mt-feed-suggested) 2.5%, var(--mt-feed-paper));
}
''',
)

wiring = Path("src/bottleneck-atlas-feed-wiring.test.ts")
replace_once(
    wiring,
    '''test("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {
''',
    '''test("the feed distinguishes generated possibilities from live opportunity inventory", () => {
  const feed = read("public/moral-trade-live-now.js");
  const styles = read("public/moral-trade-live-feed.css");
  assert.match(feed, /metadata\.origin === "platform_generated"/);
  assert.match(feed, /Potential trade/);
  assert.match(feed, /Opportunities for you/);
  assert.match(feed, /model\.feedOpportunityCount/);
  assert.match(feed, /generated \$\{/);
  assert.match(feed, /possibilities/);
  assert.match(styles, /mt-feed-card--suggested/);
});

test("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {
''',
)
