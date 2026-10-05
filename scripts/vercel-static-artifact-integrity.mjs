import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function collectFiles(root, relativeDirectory = "") {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, relativePath)));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Unsupported public asset type: ${relativePath}`);
    }
    files.push(relativePath);
  }

  return files;
}

export async function verifyStaticArtifactIntegrity({
  sourceRoot = "public",
  builtRoot = ".vercel/output/static",
  evidenceDir = "vercel-release-evidence",
  criticalRelativePath = "moral-trade-live-create-router.js",
} = {}) {
  const relativePaths = await collectFiles(sourceRoot);
  if (relativePaths.length === 0) {
    throw new Error(`No public assets found in ${sourceRoot}`);
  }
  if (!relativePaths.includes(criticalRelativePath)) {
    throw new Error(`Critical public asset is missing: ${criticalRelativePath}`);
  }

  const entries = [];
  for (const relativePath of relativePaths) {
    const sourcePath = path.join(sourceRoot, relativePath);
    const builtPath = path.join(builtRoot, relativePath);
    const [sourceBytes, builtBytes] = await Promise.all([
      readFile(sourcePath),
      readFile(builtPath).catch((error) => {
        throw new Error(`Prebuilt artifact is missing public asset ${relativePath}`, {
          cause: error,
        });
      }),
    ]);
    const sourceSha256 = sha256(sourceBytes);
    const builtSha256 = sha256(builtBytes);
    if (sourceSha256 !== builtSha256) {
      throw new Error(
        `Prebuilt public asset differs from source: ${relativePath} (${sourceSha256} != ${builtSha256})`,
      );
    }
    entries.push({ relativePath, sha256: sourceSha256, size: sourceBytes.length });
  }

  const critical = entries.find(
    (entry) => entry.relativePath === criticalRelativePath,
  );
  if (!critical) {
    throw new Error(`Critical asset was not verified: ${criticalRelativePath}`);
  }

  await mkdir(evidenceDir, { recursive: true });
  const manifest = entries
    .map((entry) => `${entry.sha256}  ${entry.relativePath}`)
    .join("\n");
  const result = {
    schemaVersion: 1,
    sourceRoot,
    builtRoot,
    fileCount: entries.length,
    critical,
    entries,
  };

  await Promise.all([
    writeFile(path.join(evidenceDir, "public-source.sha256"), `${manifest}\n`),
    writeFile(path.join(evidenceDir, "public-prebuilt.sha256"), `${manifest}\n`),
    writeFile(
      path.join(evidenceDir, "static-artifact-integrity.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    ),
  ]);

  return result;
}

async function main() {
  const result = await verifyStaticArtifactIntegrity({
    sourceRoot: process.env.STATIC_SOURCE_DIR || "public",
    builtRoot: process.env.STATIC_BUILD_DIR || ".vercel/output/static",
    evidenceDir: process.env.STATIC_EVIDENCE_DIR || "vercel-release-evidence",
    criticalRelativePath:
      process.env.STATIC_CRITICAL_ASSET || "moral-trade-live-create-router.js",
  });

  process.stdout.write(
    `Verified ${result.fileCount} public assets; critical SHA-256 ${result.critical.sha256}.\n`,
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
