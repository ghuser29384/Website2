import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);
const CHUNKS = ["0a", "0b", "0c", "0d", "1", "2", "3", "4a", "4b", "4c", "4d", "5a", "5b", "5c", "5d"] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pieces = await Promise.all(
    CHUNKS.map((name) =>
      readFile(join(process.cwd(), "public", `mt-live-0d0e0f03-${name}.txt`), "utf8"),
    ),
  );
  const compressed = Buffer.from(pieces.join(""), "base64");
  const source = await gunzipAsync(compressed);

  return new Response(source.toString("utf8"), {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
