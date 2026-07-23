import { readFile, writeFile } from "node:fs/promises";

const path = "src/components/layout/site-topbar.tsx";
let source = await readFile(path, "utf8");

const replacements = [
  [
    '  const searchInputId = useId();\n  const clarificationInputId = useId();',
    '  const searchInputId = useId();\n  const searchResultsId = useId();\n  const clarificationInputId = useId();',
  ],
  [
    '              aria-expanded={searchOpen}\n              aria-haspopup="listbox"\n              id={searchInputId}',
    '              aria-autocomplete="list"\n              aria-controls={searchResultsId}\n              aria-expanded={searchOpen && Boolean(searchQuery.trim())}\n              aria-haspopup="listbox"\n              id={searchInputId}\n              role="combobox"',
  ],
  [
    '            <div className="topbar-search-results" role="listbox" aria-label="Search suggestions">',
    '            <div\n              aria-label="Search suggestions"\n              className="topbar-search-results"\n              id={searchResultsId}\n              role="listbox"\n            >',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Expected smart-query combobox source fragment was not found: ${before}`);
  }
  source = source.replace(before, after);
}

await writeFile(path, source, "utf8");
