import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import test from "node:test";

const execFileAsync = promisify(execFile);
const packerPath = new URL("./pack-discover-payload.mjs", import.meta.url);

function gitBlobSha1(source) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${source.length}\0`))
    .update(source)
    .digest("hex");
}

async function writeFixture(root, source, compressionLevel) {
  const sourceDirectory = path.join(root, "src/discover");
  const payloadDirectory = path.join(root, "public/discover/payload");
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(payloadDirectory, { recursive: true }),
  ]);
  await writeFile(
    path.join(sourceDirectory, "moral-trade-discover.source.html"),
    source,
  );

  const compressed = gzipSync(source, { level: compressionLevel, mtime: 0 });
  const encoded = compressed.toString("base64");
  const partCount = 7;
  const partSize = Math.ceil(encoded.length / partCount);
  const parts = Array.from({ length: partCount }, (_, index) =>
    encoded.slice(index * partSize, (index + 1) * partSize),
  );
  const manifest = {
    version: gitBlobSha1(source),
    encoding: "gzip+base64",
    parts: parts.map((_, index) => `${index}.txt`),
    sourceBytes: source.length,
    gzipBytes: compressed.length,
    encodedCharacters: encoded.length,
  };

  await Promise.all([
    ...parts.map((part, index) =>
      writeFile(path.join(payloadDirectory, `${index}.txt`), part, "utf8"),
    ),
    writeFile(
      path.join(payloadDirectory, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    ),
  ]);
}

test("payload verification accepts alternate valid gzip bytes and rejects stale source", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "discover-payload-pack-"));
  const source = Buffer.from(
    "<!doctype html><title>Discover</title><main>Verified offer details.</main>".repeat(20),
  );

  try {
    await writeFixture(root, source, 1);
    const levelOne = gzipSync(source, { level: 1, mtime: 0 });
    const levelNine = gzipSync(source, { level: 9, mtime: 0 });
    assert.notDeepEqual(levelOne, levelNine, "fixture must use different valid gzip bytes");

    const verified = await execFileAsync(
      process.execPath,
      [packerPath.pathname, "--check"],
      { cwd: root },
    );
    assert.match(verified.stdout, /Discover payload verified/);

    await writeFile(
      path.join(root, "src/discover/moral-trade-discover.source.html"),
      Buffer.concat([source, Buffer.from("<!-- stale -->")]),
    );
    await assert.rejects(
      execFileAsync(process.execPath, [packerPath.pathname, "--check"], { cwd: root }),
      /Discover payload is stale/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
