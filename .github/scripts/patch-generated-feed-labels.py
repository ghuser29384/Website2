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
    '''    const metadata =\n      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)\n        ? value.metadata\n        : {};\n    const opportunityType = allowedOpportunityTypes.has(value.opportunityType)\n''',
    '''    const metadata =\n      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)\n        ? value.metadata\n        : {};\n    const origin =\n      metadata.origin === "platform_generated" ? "platform_generated" : "published";\n    const opportunityType = allowedOpportunityTypes.has(value.opportunityType)\n''',
)
replace_once(
    script,
    '''    return {\n      id,\n      opportunityType,\n''',
    '''    return {\n      id,\n      origin,\n      opportunityType,\n''',
)
replace_once(
    script,
    '''  if (model.status === "ready" && !model.recommendations.length) {\n    model.status = "unavailable";\n  }\n''',
    '''  model.suggestedOpportunityCount = model.recommendations.filter(\n    (recommendation) => recommendation.origin === "platform_generated",\n  ).length;\n  model.feedOpportunityCount = model.recommendations.length;\n\n  if (model.status === "ready" && !model.recommendations.length) {\n    model.status = "unavailable";\n  }\n''',
)
replace_once(
    script,
    '''  function opportunityVisual(type) {\n    if (type === "donation_redirect") {\n''',
    '''  function opportunityVisual(type, generated) {\n    if (generated) {\n      return {\n        key: "suggested",\n        label: "Potential trade",\n        symbol: "◇",\n        fromLabel: "You might offer",\n        toLabel: "Could advance",\n        connector: "↔",\n      };\n    }\n    if (type === "donation_redirect") {\n''',
)
replace_once(
    script,
    '''  function recommendationCard(recommendation, rank) {\n    const visual = opportunityVisual(recommendation.opportunityType);\n''',
    '''  function recommendationCard(recommendation, rank) {\n    const visual = opportunityVisual(\n      recommendation.opportunityType,\n      recommendation.origin === "platform_generated",\n    );\n''',
)
replace_once(
    script,
    '''    return `<article class="story mt-feed-card mt-feed-card--${visual.key}" data-mt-live-now-recommendation="${escapeHtml(\n      recommendation.id,\n    )}" data-opportunity-type="${escapeHtml(\n      recommendation.opportunityType,\n    )}" data-opportunity-id="${escapeHtml(recommendation.id)}" data-rank="${rank}">\n''',
    '''    return `<article class="story mt-feed-card mt-feed-card--${visual.key}" data-mt-live-now-recommendation="${escapeHtml(\n      recommendation.id,\n    )}" data-opportunity-type="${escapeHtml(\n      recommendation.opportunityType,\n    )}" data-generated="${\n      recommendation.origin === "platform_generated" ? "true" : "false"\n    }" data-opportunity-id="${escapeHtml(recommendation.id)}" data-rank="${rank}">\n''',
)
replace_once(
    script,
    '''  function opportunityTypeLegend() {\n    const counts = new Map([\n      ["offer", 0],\n      ["donation_redirect", 0],\n      ["donation_pool", 0],\n    ]);\n    model.recommendations.forEach((recommendation) => {\n      counts.set(\n        recommendation.opportunityType,\n        (counts.get(recommendation.opportunityType) || 0) + 1,\n      );\n    });\n    return [...counts.entries()]\n      .filter(([, count]) => count > 0)\n      .map(([type, count]) => {\n        const visual = opportunityVisual(type);\n        return `<span class="mt-feed-legend-item mt-feed-legend-item--${escapeHtml(\n          visual.key,\n        )}"><i aria-hidden="true">${escapeHtml(visual.symbol)}</i>${escapeHtml(\n          visual.label,\n        )}<b>${count}</b></span>`;\n      })\n      .join("");\n  }\n\n  function renderReadyState() {\n''',
    '''  function opportunityTypeLegend() {\n    const counts = new Map([\n      ["suggested", 0],\n      ["offer", 0],\n      ["donation_redirect", 0],\n      ["donation_pool", 0],\n    ]);\n    model.recommendations.forEach((recommendation) => {\n      const key =\n        recommendation.origin === "platform_generated"\n          ? "suggested"\n          : recommendation.opportunityType;\n      counts.set(key, (counts.get(key) || 0) + 1);\n    });\n    return [...counts.entries()]\n      .filter(([, count]) => count > 0)\n      .map(([type, count]) => {\n        const visual =\n          type === "suggested"\n            ? opportunityVisual("offer", true)\n            : opportunityVisual(type, false);\n        return `<span class="mt-feed-legend-item mt-feed-legend-item--${escapeHtml(\n          visual.key,\n        )}"><i aria-hidden="true">${escapeHtml(visual.symbol)}</i>${escapeHtml(\n          visual.label,\n        )}<b>${count}</b></span>`;\n      })\n      .join("");\n  }\n\n  function feedCompositionLabel() {\n    const parts = [];\n    if (model.matchingOpportunityCount > 0) {\n      parts.push(\n        `${model.matchingOpportunityCount} live ${\n          model.matchingOpportunityCount === 1 ? "opportunity" : "opportunities"\n        }`,\n      );\n    }\n    if (model.suggestedOpportunityCount > 0) {\n      parts.push(\n        `${model.suggestedOpportunityCount} generated ${\n          model.suggestedOpportunityCount === 1 ? "possibility" : "possibilities"\n        }`,\n      );\n    }\n    return parts.join(" · ") || "No opportunity inventory";\n  }\n\n  function renderReadyState() {\n''',
)
replace_once(
    script,
    '''        <div class="mt-feed-toolbar-title"><div class="eyebrow blue">For you</div><h2>Live opportunities <span>${escapeHtml(\n          String(model.matchingOpportunityCount),\n        )}</span></h2><p>${escapeHtml(formatRefreshTime(model.generatedAt))}</p></div>\n''',
    '''        <div class="mt-feed-toolbar-title"><div class="eyebrow blue">For you</div><h2>Opportunities for you <span>${escapeHtml(\n          String(model.feedOpportunityCount),\n        )}</span></h2><p>${escapeHtml(formatRefreshTime(model.generatedAt))} · ${escapeHtml(\n          feedCompositionLabel(),\n        )}</p></div>\n''',
)
replace_once(
    script,
    '''        ["No guessed priorities", "No demo records", "Live opportunities only"],\n''',
    '''        ["No guessed priorities", "No demo records", "No invented counterparties"],\n''',
)

css = Path("public/moral-trade-live-feed.css")
replace_once(
    css,
    '''  --mt-feed-public-goods: #526b00;\n''',
    '''  --mt-feed-public-goods: #526b00;\n  --mt-feed-suggested: #6b3fc4;\n''',
)
replace_once(
    css,
    '''.mt-feed-legend-item--public-goods {\n  --mt-kind: var(--mt-feed-public-goods);\n}\n''',
    '''.mt-feed-legend-item--public-goods {\n  --mt-kind: var(--mt-feed-public-goods);\n}\n\n.mt-feed-legend-item--suggested {\n  --mt-kind: var(--mt-feed-suggested);\n}\n''',
)
replace_once(
    css,
    '''.mt-feed-card[data-opportunity-type="donation_pool"],\n.mt-feed-card--public-goods {\n  --mt-kind: var(--mt-feed-public-goods);\n}\n''',
    '''.mt-feed-card[data-opportunity-type="donation_pool"],\n.mt-feed-card--public-goods {\n  --mt-kind: var(--mt-feed-public-goods);\n}\n\n.mt-feed-card--suggested {\n  --mt-kind: var(--mt-feed-suggested);\n  border-style: dashed;\n  background: color-mix(in srgb, var(--mt-feed-suggested) 2.5%, var(--mt-feed-paper));\n}\n''',
)

wiring = Path("src/bottleneck-atlas-feed-wiring.test.ts")
replace_once(
    wiring,
    '''test("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {\n''',
    '''test("the feed distinguishes generated possibilities from live opportunity inventory", () => {\n  const feed = read("public/moral-trade-live-now.js");\n  const styles = read("public/moral-trade-live-feed.css");\n  assert.match(feed, /metadata\\.origin === "platform_generated"/);\n  assert.match(feed, /Potential trade/);\n  assert.match(feed, /Opportunities for you/);\n  assert.match(feed, /model\\.feedOpportunityCount/);\n  assert.match(feed, /generated possibilities/);\n  assert.match(styles, /mt-feed-card--suggested/);\n});\n\ntest("synthesized interactions resolve locally without querying generated IDs as UUID offers", () => {\n''',
)
