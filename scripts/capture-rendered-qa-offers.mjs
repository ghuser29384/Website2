import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Usage: capture-rendered-qa-offers.mjs <output-path>");

const url = new URL("https://jnpoxvalyjtdghnperyu.supabase.co/rest/v1/offers");
url.searchParams.set("select", "*");
url.searchParams.set("status", "eq.open");
url.searchParams.set("mode", "eq.pledge");
url.searchParams.set("order", "created_at.desc,id.asc");
url.searchParams.set("offset", "0");
url.searchParams.set("limit", "24");

const publishableKey = "sb_publishable_Pcmy5vefKiaEhuYTOSU75Q_NklsZOrT";
const response = await fetch(url, {
  headers: {
    apikey: publishableKey,
    authorization: `Bearer ${publishableKey}`,
    prefer: "count=exact",
  },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) throw new Error(`Public Offers capture failed with ${response.status}.`);
const items = await response.json();
const contentRange = response.headers.get("content-range") ?? "";
const total = Number(contentRange.split("/")[1]);
if (!Array.isArray(items) || items.length === 0 || !Number.isInteger(total)) {
  throw new Error("Public Offers capture returned an invalid or empty page.");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ items, total }, null, 2)}\n`, "utf8");
process.stdout.write(`Captured ${items.length}/${total} public pledge offers at ${outputPath}.\n`);
