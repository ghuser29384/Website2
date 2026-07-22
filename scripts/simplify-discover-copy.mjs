import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";

const payloadDirectory = new URL("../public/discover/payload/", import.meta.url);
const chunkNames = ["0.txt", "1.txt", "2.txt", "3.txt", "4.txt", "5.txt", "6.txt"];
const chunkSize = 8_000;

const replacements = [
  ["Discover where value can move.", "Find a trade that works for you."],
  [
    "Explore causes, exact terms, trust routes, and pooled activation without losing the state of your search.",
    "Search offers, pools, and people. Your filters and view stay in place while you compare.",
  ],
  [
    "Find verified civic opportunities under $50 before August 1",
    "Find civic projects under $50 with strong evidence before August 1",
  ],
  ["Domains", "Browse"],
  ["Select / lasso", "Select several"],
  ["View as accessible list", "View as list"],
  ["Inspect exact terms", "See terms"],
  ["Back to Value field", "Back to comparison"],
  ["Back to constellation", "Back to map"],
  ["Opened Threshold because the query concerns pooled activation or pledging.", "Opened Pools because your search mentions shared funding or pledges."],
  ["Opened Value field because this is a broad opportunity search.", "Opened Compare because your search covers several kinds of opportunities."],
  ["Lowest burden", "Easiest"],
  ["Closest to activation", "Closest to goal"],
  ["Pools · All activation states", "Pools · All funding states"],
  ["Lower burden", "Easier"],
  ["Moderate burden", "Moderate effort"],
  ["Higher burden", "Harder"],
  ["Stronger supported value", "Stronger evidence-backed benefit"],
  ["Moderate supported value", "Moderate evidence-backed benefit"],
  ["Lower activation gap", "Close to goal"],
  ["Moderate activation gap", "Some way from goal"],
  ["Higher activation gap", "Far from goal"],
  [
    "Positions are derived from explicit burden, impact, evidence, and alignment variables—not hand-placed scores.",
    "Each point uses the offer’s difficulty, expected benefit, evidence, and fit. No point is placed by hand.",
  ],
  [
    "Value field. Horizontal position is estimated burden; vertical position is supported expected value.",
    "Offer comparison. Horizontal position shows estimated difficulty; vertical position shows evidence-backed expected benefit.",
  ],
  ["More supported expected value ↑", "More evidence-backed benefit ↑"],
  ["Lower estimated burden", "Easier"],
  ["Higher estimated burden →", "Harder →"],
  ["Interpretation", "How to read this"],
  ["Horizontal · estimated burden", "Left to right · difficulty"],
  [
    "Money, time, behavioral friction, and verification burden. The index is qualitative and bounded.",
    "Includes money, time, effort, and the work needed to provide evidence. These are rough comparisons.",
  ],
  ["Vertical · supported expected value", "Bottom to top · expected benefit"],
  [
    "Impact estimate × evidence confidence × value alignment. It is a comparison aid, not a probability.",
    "Combines the claimed benefit, strength of evidence, and fit with your priorities. It is not a probability.",
  ],
  ["Point shape · mechanism", "Point shape · offer type"],
  [
    "Circle: trade · diamond: action or redirect. Selection emphasis is not a recommendation.",
    "Circle means trade. Diamond means action or donation redirect. A highlighted point is not a recommendation.",
  ],
  ["Best fit under current sort", "Best match with this sort"],
  [
    "Click a point to inspect exact terms. Turn on Select several for multi-opportunity comparison.",
    "Select a point to see its terms. Turn on Select several to compare more than one.",
  ],
  ["The cause constellation", "Cause map"],
  ["Cause constellation. Use arrow keys to move between nodes.", "Cause map. Use arrow keys to move between points."],
  ["You, center of the constellation", "You, center of the map"],
  ["Threshold radar", "Pool view"],
  [
    "Distance from activation, deadline urgency, pool scale, and risk state are all derived from current pool terms.",
    "Distance from the funding goal, time left, pool size, and risk all come from the current pool terms.",
  ],
  ["Total pool scale, shown with a bounded logarithmic scale.", "The total pool size, adjusted so very large pools do not dominate the view."],
  ["Ranked by current fit, evidence, and burden", "Ranked by current fit, evidence, and difficulty"],
  ["cause alignment", "cause fit"],
  ["Complete cause inventory", "All offers in this cause"],
  ["Additionality", "What this trade adds"],
  ["Derived comparison signals", "How this compares"],
  ["Money + time + behavior + verification", "Money + time + effort + evidence"],
  ["Impact × evidence × value alignment", "Benefit × evidence × fit with your priorities"],
  ["Activation consequence", "What your pledge changes"],
  ["How likely am I to be pivotal?", "How much of the remaining gap would I cover?"],
  ["This is a mechanical share, not a forecast of other contributors.", "This shows only the current gap; it does not predict what other people will do."],
  ["Authorization expires", "Payment permission expires"],
  ["How the Value field is calculated", "How this comparison is calculated"],
  ["How the Pool view is calculated", "How the pool view is calculated"],
  [
    "Transparent comparison logic. These positions are decision aids, not acceptance or impact probabilities.",
    "How each position is chosen. These are comparison aids, not chances of acceptance or impact.",
  ],
  ["Close methodology", "Close explanation"],
  ["What is factual", "What comes from the offer"],
  ["What is estimated", "What we estimate"],
  ["Scale treatment", "How large values are handled"],
  ["What the chart does not claim", "What this chart cannot tell you"],
  ["Pivotality", "How much your pledge helps"],
  ["Failure semantics", "If the goal is missed"],
  ["Financial burden", "Money needed"],
  ["Time / behavior burden", "Time and effort"],
  ["Verification burden", "Evidence needed"],
  [
    "Compare exact terms",
    "Compare terms",
  ],
  [
    "Comparison does not alter either offer. Review integrity, burden, evidence, and failure conditions side by side.",
    "Comparing does not change either offer. Review trust, difficulty, evidence, and what happens if the trade fails side by side.",
  ],
  [
    "Select any pool to inspect pivotality, failure conditions, authorization expiry, and exact proof.",
    "Select a pool to see how much your pledge helps, what happens if the goal is missed, when payment permission ends, and what evidence is needed.",
  ],
  ["<span class=\"cell-label\">Activation</span>", "<span class=\"cell-label\">Funding</span>"],
  ["${mechanisms} mechanisms", "${mechanisms} types"],
  ["${pivotalLabel} pivotality", "${pivotalLabel} share of gap"],
  ["<dt>What your pledge changes</dt>", "<dt>Result if funded</dt>"],
  ["Pivotal share", "Share of current gap"],
  [
    "Estimated burden = money component (35%) + time (25%) + behavioral friction (20%) + verification burden (20%)<br>Supported expected value = impact estimate × evidence confidence × value alignment",
    "Difficulty = money needed (35%) + time (25%) + effort to change behavior (20%) + evidence work (20%)<br>Evidence-backed expected benefit = claimed benefit × evidence confidence × fit with your priorities",
  ],
  ["behavioral friction", "effort to change behavior"],
  ["bounded comparison inputs", "limited comparison inputs"],
  [
    "establish moral permissibility. Integrity and third-party effects remain separate review fields.",
    "tell you whether the trade is morally acceptable. Safety and effects on other people are reviewed separately.",
  ],
  [
    "This is a mechanical funding state, not a forecast that activation will occur.",
    "This is the current funding state, not a prediction that the pool will reach its goal.",
  ],
  [
    "Verification outages are shown separately with a dashed red border.",
    "Missing evidence checks are shown with a dashed red border.",
  ],
  ["when authorization expires.", "when payment permission expires."],
  ["Value field", "Compare"],
  ["Constellation", "Map"],
  ["Mechanism", "Type"],
];

const encoded = (
  await Promise.all(chunkNames.map((name) => readFile(new URL(name, payloadDirectory), "utf8")))
).join("");
let source = gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");

for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.replaceAll(from, to);
  } else if (!source.includes(to)) {
    throw new Error(`Discover copy source did not contain expected text: ${from}`);
  }
}

const nextEncoded = gzipSync(Buffer.from(source, "utf8"), { level: 9 }).toString("base64");
const nextChunks = Array.from(
  { length: Math.ceil(nextEncoded.length / chunkSize) },
  (_, index) => nextEncoded.slice(index * chunkSize, (index + 1) * chunkSize),
);

if (nextChunks.length !== chunkNames.length) {
  throw new Error(`Discover payload changed from ${chunkNames.length} to ${nextChunks.length} chunks`);
}

await Promise.all(
  chunkNames.map((name, index) => writeFile(new URL(name, payloadDirectory), nextChunks[index], "utf8")),
);

console.log(`Updated ${replacements.length} Discover phrases across ${nextChunks.length} payload chunks.`);
