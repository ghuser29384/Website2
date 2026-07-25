import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const completeMarker = join(root, "src/lib/recommendation-training.ts");
const partDirectory = join(root, ".a1");

function replaceOnce(path, before, after) {
  const absolute = join(root, path);
  const source = readFileSync(absolute, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    throw new Error(`A1 patch marker missing in ${path}`);
  }
  writeFileSync(absolute, source.replace(before, after), "utf8");
}

function patchJson(path, transform) {
  const absolute = join(root, path);
  const value = JSON.parse(readFileSync(absolute, "utf8"));
  transform(value);
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function alreadyMaterialized() {
  try {
    const training = readFileSync(completeMarker, "utf8");
    const config = readFileSync(join(root, "next.config.ts"), "utf8");
    return training.includes("runParetoRecommendationTrainingJob") && config.includes('source: "/api/live-now"');
  } catch {
    return false;
  }
}

if (!alreadyMaterialized()) {
  const parts = readdirSync(partDirectory)
    .filter((name) => /^part-\d+$/.test(name))
    .sort();
  if (!parts.length) throw new Error("A1 source bundle parts are missing");

  const encoded = parts.map((name) => readFileSync(join(partDirectory, name), "utf8")).join("");
  const directory = mkdtempSync(join(tmpdir(), "moraltrade-a1-"));
  const archive = join(directory, "pareto-feed.tar.gz");
  try {
    writeFileSync(archive, Buffer.from(encoded, "base64"));
    execFileSync("tar", ["-xzf", archive, "-C", root], { stdio: "inherit" });
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }

  replaceOnce(
    "next.config.ts",
    '      beforeFiles: [\n        {\n          source: "/feed",',
    '      beforeFiles: [\n        {\n          source: "/api/live-now",\n          destination: "/api/live-now-a1",\n        },\n        {\n          source: "/feed",',
  );
  replaceOnce(
    "public/moral-trade-live.html",
    '          \'<link id="mt-reciprocal-feed-diagnostics-styles" rel="stylesheet" href="/moral-trade-live-feed-diagnostics.css">\',',
    '          \'<link id="mt-reciprocal-feed-diagnostics-styles" rel="stylesheet" href="/moral-trade-live-feed-diagnostics.css">\',\n          \'<link id="mt-pareto-feed-learning-styles" rel="stylesheet" href="/moral-trade-live-learning-diagnostics.css">\',',
  );
  replaceOnce(
    "public/moral-trade-live.html",
    '          \'<script src="/moral-trade-live-feed-diagnostics.js"><\\/script>\',',
    '          \'<script src="/moral-trade-live-feed-diagnostics.js"><\\/script>\',\n          \'<script src="/moral-trade-live-learning-diagnostics.js"><\\/script>\',',
  );
  replaceOnce(
    "src/app/layout.tsx",
    '        <link href="/moral-trade-live-feed-diagnostics.css" rel="stylesheet" />',
    '        <link href="/moral-trade-live-feed-diagnostics.css" rel="stylesheet" />\n        {/* eslint-disable-next-line @next/next/no-css-tags */}\n        <link href="/moral-trade-live-learning-diagnostics.css" rel="stylesheet" />',
  );
  replaceOnce(
    "src/app/layout.tsx",
    '        <Script src="/moral-trade-live-feed-diagnostics.js" strategy="afterInteractive" />',
    '        <Script src="/moral-trade-live-feed-diagnostics.js" strategy="afterInteractive" />\n        <Script src="/moral-trade-live-learning-diagnostics.js" strategy="afterInteractive" />',
  );

  patchJson("vercel.json", (value) => {
    value.crons ??= [];
    if (!value.crons.some((item) => item.path === "/api/jobs/recommendation-training")) {
      value.crons.push({ path: "/api/jobs/recommendation-training", schedule: "30 12 * * *" });
    }
  });

  const generatedPatch = join(root, "scripts/apply-pareto-learning-patches.py");
  rmSync(generatedPatch, { force: true });
  console.log("Materialized the complete Pareto-safe causal Feed implementation.");
}
