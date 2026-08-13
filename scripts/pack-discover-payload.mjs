import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.join(root, "src/discover/moral-trade-discover.source.html");
const payloadDirectory = path.join(root, "public/discover/payload");
const manifestPath = path.join(payloadDirectory, "manifest.json");
const partCount = 7;
const checkOnly = process.argv.includes("--check");

const source = await readFile(sourcePath);
const sourceVersion = createHash("sha1")
  .update(Buffer.from(`blob ${source.length}\0`))
  .update(source)
  .digest("hex");
const partNames = Array.from({ length: partCount }, (_, index) => `${index}.txt`);

function createManifest(compressed, encoded) {
  return {
    version: sourceVersion,
    encoding: "gzip+base64",
    parts: partNames,
    sourceBytes: source.length,
    gzipBytes: compressed.length,
    encodedCharacters: encoded.length,
  };
}

function assertCanonicalPayload(compressed, encoded) {
  if (compressed.toString("base64") !== encoded) {
    throw new Error("Discover payload is not canonical base64.");
  }

  const roundTrip = gunzipSync(compressed);
  if (!roundTrip.equals(source)) {
    throw new Error("Discover payload does not match the canonical source.");
  }
}

await mkdir(payloadDirectory, { recursive: true });

if (checkOnly) {
  const mismatches = [];
  const parts = [];
  for (const partName of partNames) {
    const partPath = path.join(payloadDirectory, partName);
    try {
      const part = await readFile(partPath, "utf8");
      if (part.length === 0) mismatches.push(`${partName} (empty)`);
      parts.push(part);
    } catch {
      mismatches.push(`${partName} (missing)`);
    }
  }

  let compressed = null;
  let encoded = null;
  if (parts.length === partCount && !mismatches.length) {
    encoded = parts.join("");
    compressed = Buffer.from(encoded, "base64");
    try {
      assertCanonicalPayload(compressed, encoded);
    } catch (error) {
      mismatches.push(`payload (${error.message})`);
    }
  }

  let currentManifest = null;
  try {
    currentManifest = await readFile(manifestPath, "utf8");
  } catch {
    mismatches.push("manifest.json (missing)");
  }
  if (currentManifest !== null && compressed !== null && encoded !== null) {
    const manifestText = `${JSON.stringify(createManifest(compressed, encoded), null, 2)}\n`;
    if (currentManifest !== manifestText) mismatches.push("manifest.json");
  }

  if (mismatches.length) {
    throw new Error(
      `Discover payload is stale: ${mismatches.join(", ")}. Run npm run discover:pack.`,
    );
  }
  console.log(
    `Discover payload verified: ${source.length} source bytes, ${compressed.length} gzip bytes, ${encoded.length} base64 characters across ${partCount} parts; version ${sourceVersion}.`,
  );
} else {
  const compressed = gzipSync(source, { level: 9, mtime: 0 });
  const encoded = compressed.toString("base64");
  const partSize = Math.ceil(encoded.length / partCount);
  const parts = partNames.map((_, index) =>
    encoded.slice(index * partSize, (index + 1) * partSize),
  );

  if (parts.some((part) => part.length === 0)) {
    throw new Error(`Discover payload did not produce ${partCount} non-empty parts.`);
  }

  assertCanonicalPayload(compressed, encoded);
  const manifestText = `${JSON.stringify(createManifest(compressed, encoded), null, 2)}\n`;
  await Promise.all([
    ...parts.map((part, index) =>
      writeFile(path.join(payloadDirectory, `${index}.txt`), part, "utf8"),
    ),
    writeFile(manifestPath, manifestText, "utf8"),
  ]);
  console.log(
    `Packed Discover: ${source.length} source bytes, ${compressed.length} gzip bytes, ${encoded.length} base64 characters across ${partCount} parts; version ${sourceVersion}.`,
  );
}
