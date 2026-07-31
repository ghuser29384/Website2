import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.join(root, "src/discover/moral-trade-discover.source.html");
const payloadDirectory = path.join(root, "public/discover/payload");
const partCount = 7;
const checkOnly = process.argv.includes("--check");

const source = await readFile(sourcePath);
const compressed = gzipSync(source, { level: 9, mtime: 0 });
const encoded = compressed.toString("base64");
const partSize = Math.ceil(encoded.length / partCount);
const parts = Array.from({ length: partCount }, (_, index) =>
  encoded.slice(index * partSize, (index + 1) * partSize),
);

if (parts.some((part) => part.length === 0)) {
  throw new Error(`Discover payload did not produce ${partCount} non-empty parts.`);
}

const reconstructed = Buffer.from(parts.join(""), "base64");
const roundTrip = gunzipSync(reconstructed);
if (!roundTrip.equals(source)) {
  throw new Error("Packed Discover payload does not round-trip to the canonical source.");
}

await mkdir(payloadDirectory, { recursive: true });

if (checkOnly) {
  const mismatches = [];
  for (let index = 0; index < partCount; index += 1) {
    const partPath = path.join(payloadDirectory, `${index}.txt`);
    let current = null;
    try {
      current = await readFile(partPath, "utf8");
    } catch {
      mismatches.push(`${index}.txt (missing)`);
      continue;
    }
    if (current !== parts[index]) mismatches.push(`${index}.txt`);
  }
  if (mismatches.length) {
    throw new Error(
      `Discover payload is stale: ${mismatches.join(", ")}. Run npm run discover:pack.`,
    );
  }
  console.log(
    `Discover payload verified: ${source.length} source bytes, ${compressed.length} gzip bytes, ${encoded.length} base64 characters across ${partCount} parts.`,
  );
} else {
  await Promise.all(
    parts.map((part, index) =>
      writeFile(path.join(payloadDirectory, `${index}.txt`), part, "utf8"),
    ),
  );
  console.log(
    `Packed Discover: ${source.length} source bytes, ${compressed.length} gzip bytes, ${encoded.length} base64 characters across ${partCount} parts.`,
  );
}
