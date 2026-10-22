import { createInterface } from "node:readline";

const statusCounts = {};
const pathCounts = {};
let entries = 0;
let errors = 0;
let warnings = 0;
let http5xx = 0;
let paymentSignals = 0;
let privateLeakSignals = 0;
let authFailures = 0;
const paymentPattern = /stripe|every\.org|paymentintent|setupintent|checkout|charge|capture|custody|settlement|reserve|refund|payout|collection/i;
const privateLeakPattern = /@qa\.invalid|eyJ[A-Za-z0-9_-]{16,}\.|postgres(?:ql)?:\/\/|SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|authorization.{0,24}bearer|password=/i;

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  if (!line.trim()) continue;
  let record;
  try { record = JSON.parse(line); } catch { continue; }
  entries += 1;
  const status = Number(record.statusCode ?? record.status ?? record.responseStatus ?? 0);
  if (status) statusCounts[String(status)] = (statusCounts[String(status)] ?? 0) + 1;
  if (status >= 500) http5xx += 1;
  if (status === 401 || status === 403) authFailures += 1;
  const level = String(record.level ?? "").toLowerCase();
  if (level === "error" || level === "fatal") errors += 1;
  if (level === "warning" || level === "warn") warnings += 1;
  let path = String(record.path ?? record.requestPath ?? record.request?.path ?? "");
  if (path) {
    path = path.split("?")[0]
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<fixture-id>")
      .replace(/campaign-[0-9a-f]{32}/gi, "campaign-<fixture-id>");
    pathCounts[path] = (pathCounts[path] ?? 0) + 1;
  }
  const signalText = `${path} ${record.message ?? ""}`;
  if (paymentPattern.test(signalText)) paymentSignals += 1;
  if (privateLeakPattern.test(signalText)) privateLeakSignals += 1;
}

process.stdout.write(`${JSON.stringify({
  entries,
  statusCounts,
  pathCounts,
  errors,
  warnings,
  http5xx,
  paymentSignals,
  privateLeakSignals,
  authFailures,
  rawMessagesRetained: false,
}, null, 2)}\n`);
