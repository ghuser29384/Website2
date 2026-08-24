import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(process.cwd(), ".vercel/output");
const outputConfig = JSON.parse(
  await readFile(join(outputDirectory, "config.json"), "utf8"),
);

if (outputConfig.version !== 3) {
  throw new Error("Runtime attestation requires Vercel Build Output API version 3.");
}

const targetDirectory = join(
  outputDirectory,
  "functions",
  "api",
  "pr737",
  "runtime-attestation.func",
);
await mkdir(targetDirectory, { recursive: true });
await Promise.all([
  copyFile(join(sourceDirectory, "runtime-attestation.cjs"), join(targetDirectory, "index.cjs")),
  copyFile(
    join(sourceDirectory, "runtime-attestation.vc-config.json"),
    join(targetDirectory, ".vc-config.json"),
  ),
  copyFile(
    join(sourceDirectory, "runtime-attestation.package.json"),
    join(targetDirectory, "package.json"),
  ),
]);

console.log("pr737_controller_runtime_attestation=injected");
