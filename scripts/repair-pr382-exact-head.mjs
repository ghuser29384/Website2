import { readFile, writeFile } from "node:fs/promises";

function replaceExactly(source, search, replacement, label, expectedCount = 1) {
  const count = source.split(search).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  return source.split(search).join(replacement);
}

async function patch(path, transform) {
  const before = await readFile(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`${path}: patch produced no change`);
  await writeFile(path, after, "utf8");
}

await patch("public/moral-trade-discover-search.js", (source) => {
  let next = replaceExactly(
    source,
    'return `<div class="state-panel"><div class="state-panel-inner"><h2>No active ${escapeHtml(response.domain)} match “${escapeHtml(state.query || "this search")}”</h2>',
    'return `<div class="state-panel" data-live-search-zero="true"><div class="state-panel-inner"><h2>No active ${escapeHtml(response.domain)} match “${escapeHtml(state.query || "this search")}”</h2>',
    "mark live zero results",
  );

  next = replaceExactly(
    next,
    `  function updateHeading() {\n`,
    `  function liveResultsIntact(response = state.response) {\n    const list = document.querySelector(".transaction-list");\n    if (!response || !list || list.dataset.liveSearchResults !== "true") {\n      return false;\n    }\n    if (response.items.length === 0) {\n      return Boolean(list.querySelector('[data-live-search-zero="true"]'));\n    }\n    return (\n      list.querySelectorAll('[data-live-record="true"]').length ===\n      response.items.length\n    );\n  }\n\n  function updateHeading() {\n`,
    "add live-result integrity check",
  );

  next = replaceExactly(
    next,
    `        if (\n          state.response &&\n          !document.querySelector(\n            '.transaction-list[data-live-search-results="true"]',\n          ) &&\n          state.controller\n        ) {`,
    `        if (\n          state.response &&\n          !liveResultsIntact(state.response) &&\n          state.controller\n        ) {`,
    "repair observer ownership check",
  );

  return next;
});

await patch("tests/discover-payload-cache.spec.ts", (source) =>
  replaceExactly(
    source,
    'page.getByRole("button", { name: /Run search/i })',
    'page.getByRole("button", { name: /^Search$/i })',
    "update cache-recovery button label",
  ),
);

await patch("tests/discover-cofund.spec.ts", (source) =>
  replaceExactly(
    source,
    'getByRole("button", { name: "Run search" })',
    'getByRole("button", { name: "Search" })',
    "update Co-Fund search button labels",
    2,
  ),
);

console.log("PR #382 exact-head patches applied.");
