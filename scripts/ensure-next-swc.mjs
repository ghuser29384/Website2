import { existsSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const swcPackages = {
  "darwin-arm64": {
    packageName: "@next/swc-darwin-arm64",
    binaryName: "next-swc.darwin-arm64.node",
  },
  "darwin-x64": {
    packageName: "@next/swc-darwin-x64",
    binaryName: "next-swc.darwin-x64.node",
  },
};

const swcPackage = swcPackages[`${process.platform}-${process.arch}`];
const nodeModulesRoot = join(process.cwd(), "node_modules");
const requiredFiles = [];
const missingFiles = [];

function hasUsableFile(filePath, minimumBytes) {
  if (!existsSync(filePath)) {
    return false;
  }

  return statSync(filePath).size > minimumBytes;
}

function ensureFileAvailable({ filePath, label, minimumBytes, packageRoot }) {
  if (hasUsableFile(filePath, minimumBytes)) {
    return;
  }

  const placeholderPaths = [
    `${filePath}.icloud`,
    join(dirname(filePath), `.${basename(filePath)}.icloud`),
  ];

  if (process.platform === "darwin" && placeholderPaths.some((path) => existsSync(path))) {
    for (const path of [filePath, ...placeholderPaths]) {
      const download = spawnSync("brctl", ["download", path], {
        encoding: "utf8",
        stdio: "pipe",
      });

      if (download.status === 0 && hasUsableFile(filePath, minimumBytes)) {
        console.log(`Downloaded ${label} from iCloud.`);
        return;
      }
    }
  }

  missingFiles.push({ filePath, label, packageRoot });
}

if (swcPackage) {
  const packageRoot = join(process.cwd(), "node_modules", ...swcPackage.packageName.split("/"));
  requiredFiles.push({
    filePath: join(
      packageRoot,
      swcPackage.binaryName,
    ),
    label: swcPackage.packageName,
    minimumBytes: 1_000_000,
    packageRoot,
  });
}

requiredFiles.push({
  filePath: join(process.cwd(), "node_modules", "typescript", "lib", "lib.dom.d.ts"),
  label: "typescript/lib/lib.dom.d.ts",
  minimumBytes: 100_000,
  packageRoot: join(process.cwd(), "node_modules", "typescript"),
});

function collectMissingFiles() {
  missingFiles.length = 0;

  for (const requiredFile of requiredFiles) {
    ensureFileAvailable(requiredFile);
  }
}

collectMissingFiles();

if (missingFiles.length && process.env.MORAL_TRADE_DISABLE_DEP_REPAIR !== "1") {
  console.warn(
    [
      "Required Next.js development dependencies are unavailable locally.",
      "Refreshing node_modules once; this usually repairs iCloud-placeholder package files.",
    ].join("\n"),
  );

  for (const packageRoot of new Set(missingFiles.map((file) => file.packageRoot).filter(Boolean))) {
    const relativePackageRoot = relative(nodeModulesRoot, packageRoot);

    if (
      relativePackageRoot &&
      !relativePackageRoot.startsWith("..") &&
      !relativePackageRoot.startsWith("/")
    ) {
      rmSync(packageRoot, { recursive: true, force: true });
    }
  }

  const repair = spawnSync("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund"], {
    encoding: "utf8",
    stdio: "inherit",
  });

  if (repair.status === 0) {
    collectMissingFiles();
  }
}

if (missingFiles.length) {
  console.error(
    [
      "Required Next.js development dependencies are missing or unavailable:",
      ...missingFiles.map(({ filePath, label }) => `- ${label}: ${filePath}`),
      "Run npm install, download any iCloud placeholders, or unset MORAL_TRADE_DISABLE_DEP_REPAIR before starting Next.js.",
    ].join("\n"),
  );
  process.exit(1);
}
