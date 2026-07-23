import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHUNKS = [
  "0a",
  "0b",
  "0c",
  "0d",
  "1",
  "2",
  "3",
  "4a",
  "4b",
  "4c",
  "4d",
  "5a",
  "5b",
  "5c",
  "5d",
] as const;

function loadExactLiveSource() {
  const encoded = CHUNKS.map((name) =>
    readFileSync(join(process.cwd(), "public", `mt-live-0d0e0f03-${name}.txt`), "utf8").trim(),
  ).join("");
  return gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
}

function snippetAround(source: string, query: string) {
  const index = source.indexOf(query);
  if (index < 0) return { index, snippet: null };
  const start = Math.max(0, index - 3_500);
  const end = Math.min(source.length, index + query.length + 5_500);
  return { index, snippet: source.slice(start, end) };
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const source = loadExactLiveSource();
  const queries = [
    "COMMAND CENTER",
    "Build this offer",
    "Draft created with editable exact terms.",
    "Create the next commitment.",
  ];

  return Response.json({
    length: source.length,
    matches: Object.fromEntries(queries.map((query) => [query, snippetAround(source, query)])),
  });
}
