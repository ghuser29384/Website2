import { readFile, writeFile } from "node:fs/promises";

const path = "src/app/wish-registry/page.tsx";
let source = await readFile(path, "utf8");

function replaceOnce(search, replacement, label) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: expected 1 occurrence, found ${occurrences}`);
  source = source.replace(search, replacement);
}

replaceOnce(
`import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";`,
`import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";`,
"add wish personalization import",
);

replaceOnce(
`  const viewer = await getViewer();
  const query = readParam(resolvedSearchParams, "q");`,
`  const viewer = await getViewer();
  const personalPriorities = await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const query = readParam(resolvedSearchParams, "q").trim().slice(0, 500);`,
"load wish personalization",
);

replaceOnce(
`          opennessToPayment,
          opennessToPledges,
          query,
        });`,
`          opennessToPayment,
          opennessToPledges,
          personalPriorities,
          query,
        });`,
"pass personal priorities to wish search",
);

replaceOnce(
`              Start with a keyword or cause area. Trade-mode filters are optional and stay broad.
              This page does not show contact information, exact asks, or approval claims.`,
`              Describe a broad cause, location, participant type, or payment and pledge openness in
              ordinary language. Search operates only on opt-in public previews; exact asks, contact
              details, private text, and approval claims remain outside the query pipeline.`,
"update wish search explanation",
);

replaceOnce(
`                  placeholder="vegetarian trial, digital minds, public health"`,
`                  placeholder="e.g. civic collectives in Chicago open to pledges"`,
"update wish search example",
);

await writeFile(path, source, "utf8");
console.log(`Patched ${path}`);
