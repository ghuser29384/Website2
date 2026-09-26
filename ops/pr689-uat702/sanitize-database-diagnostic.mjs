import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath, phase, source, boundary = "transaction_rolled_back=true"] = process.argv.slice(2);
if (!inputPath || !outputPath || !phase || !source) {
  throw new Error("Usage: sanitize-database-diagnostic.mjs <input> <output> <phase> <source> [boundary]");
}
if (!/^[a-z_]+=(?:true|false)$/.test(boundary)) throw new Error("Diagnostic boundary must be a safe boolean field.");

const exactSecrets = [
  process.env.QA_SUPABASE_DB_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.VERCEL_TOKEN,
].filter((value) => typeof value === "string" && value.length >= 8);

let diagnostic = await readFile(inputPath, "utf8");
for (const secret of exactSecrets) diagnostic = diagnostic.split(secret).join("[REDACTED]");
diagnostic = diagnostic
  .replace(/eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}/g, "[REDACTED_JWT]")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_IDENTITY]")
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[REDACTED_ID]");

const relevant = diagnostic
  .split(/\r?\n/)
  .filter((line) => /(?:ERROR|FATAL|DETAIL|HINT|CONTEXT|STATEMENT|psql:)/i.test(line))
  .slice(-80);

await writeFile(
  outputPath,
  [
    `phase=${phase}`,
    `source=${source}`,
    boundary,
    "diagnostic_begin",
    ...(relevant.length ? relevant : diagnostic.split(/\r?\n/).slice(-40)),
    "diagnostic_end",
    "",
  ].join("\n"),
);
