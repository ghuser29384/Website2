import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const roots = process.argv.slice(2);
if (!roots.length) throw new Error("At least one evidence root is required.");

const exactSecrets = [
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  process.env.VERCEL_TOKEN,
  process.env.QA_SUPABASE_DB_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.MPGF_DAC_PRODUCT_QA_PASSWORD,
].filter((value) => typeof value === "string" && value.length >= 8);

const jwtPattern = /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}/g;
const cookiePattern = /(?:sb-[a-z0-9-]+-auth-token(?:\.[0-9]+)?|_vercel_jwt)(?:%3D|=|"\s*:\s*")[^\s";,}]+/gi;
const cookieObjectPattern = /("name"\s*:\s*"(?:sb-[a-z0-9-]+-auth-token(?:\.[0-9]+)?|_vercel_jwt)"\s*,\s*"value"\s*:\s*")[^"]*(")/gi;
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const jwtTestPattern = /eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}/;
const cookieTestPattern = /(?:sb-[a-z0-9-]+-auth-token(?:\.[0-9]+)?|_vercel_jwt)(?:%3D|=|"\s*:\s*")[^\s";,}]+/i;
const cookieObjectTestPattern = /"name"\s*:\s*"(?:sb-[a-z0-9-]+-auth-token(?:\.[0-9]+)?|_vercel_jwt)"\s*,\s*"value"\s*:\s*"(?!\[REDACTED\]")[^"]+"/i;

async function walk(root) {
  const entries = [];
  for (const name of await readdir(root)) {
    const path = join(root, name);
    const info = await stat(path);
    if (info.isDirectory()) entries.push(...(await walk(path)));
    else entries.push(path);
  }
  return entries;
}

function redactText(text) {
  let result = text;
  for (const secret of exactSecrets) result = result.split(secret).join("[REDACTED]");
  result = result.replace(jwtPattern, "[REDACTED_JWT]");
  result = result.replace(cookieObjectPattern, "$1[REDACTED]$2");
  result = result.replace(cookiePattern, "[REDACTED_COOKIE]");
  result = result.replace(emailPattern, "[REDACTED_FIXTURE_ROLE]");
  result = result.replace(uuidPattern, "[REDACTED_FIXTURE_ID]");
  return result;
}

function containsSecret(buffer) {
  const text = buffer.toString("utf8");
  return exactSecrets.some((secret) => text.includes(secret))
    || jwtTestPattern.test(text)
    || cookieTestPattern.test(text)
    || cookieObjectTestPattern.test(text);
}

async function redactTree(root) {
  for (const file of await walk(root)) {
    const buffer = await readFile(file);
    const name = basename(file);
    const textual =
      /(?:^trace\.(?:trace|network|stacks)$|\.(?:json|jsonl|txt|log|html|css|js|ts|md|xml|yml|yaml)$)/i.test(name)
      || !buffer.includes(0);
    if (textual) {
      await writeFile(file, redactText(buffer.toString("utf8")));
    } else if (containsSecret(buffer)) {
      await rm(file);
    }
  }
}

let traceCount = 0;
for (const root of roots) {
  let files = [];
  try {
    files = await walk(root);
  } catch {
    continue;
  }
  for (const trace of files.filter((file) =>
    (file.endsWith(".zip") && basename(file).includes("trace")) || /\/uat702-traces\/[^/]+\.zip$/.test(file)
  )) {
    const tracePath = resolve(trace);
    const temp = await mkdtemp(join(tmpdir(), "uat702-trace-"));
    try {
      execFileSync("unzip", ["-qq", tracePath, "-d", temp], { stdio: "ignore" });
      await redactTree(temp);
      const replacement = `${tracePath}.redacted`;
      execFileSync("zip", ["-qr", replacement, "."], { cwd: temp, stdio: "ignore" });
      await rename(replacement, tracePath);
      traceCount += 1;
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  }
  await redactTree(root);
}

for (const root of roots) {
  let files = [];
  try {
    files = await walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    if (file.endsWith(".zip")) {
      const temp = await mkdtemp(join(tmpdir(), "uat702-scan-"));
      try {
        execFileSync("unzip", ["-qq", file, "-d", temp], { stdio: "ignore" });
        for (const member of await walk(temp)) {
          if (containsSecret(await readFile(member))) throw new Error("Credential material remained in a trace archive.");
        }
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    } else if (containsSecret(await readFile(file))) {
      throw new Error("Credential material remained in retained evidence.");
    }
  }
}

if (traceCount < 1) throw new Error("No successful-run trace archive was retained.");
console.log(`trace_count=${traceCount}`);
console.log("trace_redaction=passed");
