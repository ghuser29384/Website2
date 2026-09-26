import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = "tests/mpgf-dac-product-lifecycle.spec.ts";
const outputPath = "uat702/base-product-lifecycle.spec.ts";
let source = await readFile(sourcePath, "utf8");

const importMarker = 'import { mkdir } from "node:fs/promises";';
if (!source.includes(importMarker)) throw new Error("Candidate browser spec import marker drifted.");
source = source.replace(importMarker, 'import { mkdir, writeFile } from "node:fs/promises";');

const insertAfter = 'const SCREENSHOT_DIR = "test-results/mpgf-dac-product-lifecycle";';
if (!source.includes(insertAfter)) throw new Error("Candidate browser spec marker drifted.");
const injectedSource = [
  'const TRACE_DIR = "test-results/uat702-traces";',
  'const BASE_OBSERVATION_PATH = "test-results/mpgf-dac-product-lifecycle/browser-observations.json";',
  'const PROD_REF = process.env.FORBIDDEN_PROD_REF ?? "";',
  'let traceSequence = 0;',
  'let contextSequence = 0;',
  'const baseObservations: Array<{',
  '  label: string;',
  '  consoleErrors: string[];',
  '  consoleWarnings: string[];',
  '  pageErrors: string[];',
  '  failedRequests: Array<{ method: string; host: string; path: string }>;',
  '  httpErrors: Array<{ status: number; host: string; path: string }>;',
  '  providerRequests: Array<{ method: string; host: string; path: string }>;',
  '}> = [];',
  '',
  'function protectionHeaders() {',
  '  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;',
  '  if (!bypass) throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET is required.");',
  '  return {',
  '    "x-vercel-protection-bypass": bypass,',
  '    "x-vercel-set-bypass-cookie": "true",',
  '  };',
  '}',
  '',
  'function baseSafeMessage(message: string) {',
  '  return message',
  '    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, "<fixture-role>")',
  '    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<fixture-id>")',
  '    .replace(/eyJ[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{8,}/g, "<redacted-token>")',
  '    .slice(0, 240);',
  '}',
  '',
  'function baseSafeRequest(raw: string) {',
  '  const url = new URL(raw);',
  '  if (PROD_REF && url.hostname.includes(PROD_REF)) throw new Error("Production project request observed.");',
  '  const deploymentHost = new URL(BASE_URL).hostname;',
  '  return {',
  '    host: url.hostname === deploymentHost ? "protected-preview" : url.hostname.includes("hvmxfjjbdcgjjudmthdz") ? "qa-supabase" : url.hostname,',
  '    path: url.pathname',
  '      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<fixture-id>")',
  '      .replace(/campaign-[0-9a-f]{32}/gi, "campaign-<fixture-id>"),',
  '  };',
  '}',
  '',
  'function attachBaseObservation(context: BrowserContext) {',
  '  contextSequence += 1;',
  '  const record = {',
  '    label: "base-context-" + String(contextSequence).padStart(2, "0"),',
  '    consoleErrors: [] as string[],',
  '    consoleWarnings: [] as string[],',
  '    pageErrors: [] as string[],',
  '    failedRequests: [] as Array<{ method: string; host: string; path: string }>,',
  '    httpErrors: [] as Array<{ status: number; host: string; path: string }>,',
  '    providerRequests: [] as Array<{ method: string; host: string; path: string }>,',
  '  };',
  '  baseObservations.push(record);',
  '  context.on("page", (page) => {',
  '    page.on("console", (message) => {',
  '      if (message.type() === "error") record.consoleErrors.push(baseSafeMessage(message.text()));',
  '      if (message.type() === "warning") record.consoleWarnings.push(baseSafeMessage(message.text()));',
  '    });',
  '    page.on("pageerror", (error) => record.pageErrors.push(baseSafeMessage(error.message)));',
  '  });',
  '  context.on("requestfailed", (request) => {',
  '    record.failedRequests.push({ method: request.method(), ...baseSafeRequest(request.url()) });',
  '  });',
  '  context.on("request", (request) => {',
  '    const safe = baseSafeRequest(request.url());',
  '    if (/(?:stripe|every\\.org|paypal|adyen|braintree|squareup)/i.test(safe.host)) {',
  '      record.providerRequests.push({ method: request.method(), ...safe });',
  '    }',
  '  });',
  '  context.on("response", (response) => {',
  '    if (response.status() >= 400) record.httpErrors.push({ status: response.status(), ...baseSafeRequest(response.url()) });',
  '  });',
  '}',
].join("\n");
source = source.replace(insertAfter, insertAfter + "\n" + injectedSource);

const contextMarker = "const context = await browser.newContext({ baseURL: BASE_URL, viewport: input.viewport });";
if (!source.includes(contextMarker)) throw new Error("Candidate browser-context marker drifted.");
source = source.replace(
  contextMarker,
  'const context = await browser.newContext({ baseURL: BASE_URL, viewport: input.viewport, extraHTTPHeaders: protectionHeaders() });',
);

const cookieMarker = "  await context.addCookies(cookies);\n  return context;";
if (!source.includes(cookieMarker)) throw new Error("Candidate cookie marker drifted.");
source = source.replace(
  cookieMarker,
  [
    "  await context.addCookies(cookies);",
    "  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });",
    "  attachBaseObservation(context);",
    "  return context;",
  ].join("\n"),
);

const closeMarker = "async function closeContext(context: BrowserContext | null) {\n  if (context) await context.close();\n}";
if (!source.includes(closeMarker)) throw new Error("Candidate close-context marker drifted.");
source = source.replace(
  closeMarker,
  [
    "async function closeContext(context: BrowserContext | null) {",
    "  if (!context) return;",
    "  await mkdir(TRACE_DIR, { recursive: true });",
    "  traceSequence += 1;",
    '  await context.tracing.stop({ path: TRACE_DIR + "/base-" + String(traceSequence).padStart(2, "0") + ".zip" });',
    "  await context.close();",
    "}",
  ].join("\n"),
);

const describeMarker = 'test.describe.configure({ mode: "serial" });';
if (!source.includes(describeMarker)) throw new Error("Candidate browser describe marker drifted.");
const afterAllSource = [
  "test.afterAll(async () => {",
  "  await mkdir(SCREENSHOT_DIR, { recursive: true });",
  "  const sanitized = baseObservations.map((record) => ({",
  "    ...record,",
  "    consoleErrors: [...new Set(record.consoleErrors)],",
  "    consoleWarnings: [...new Set(record.consoleWarnings)],",
  "    pageErrors: [...new Set(record.pageErrors)],",
  "  }));",
  "  await writeFile(BASE_OBSERVATION_PATH, JSON.stringify(sanitized, null, 2) + String.fromCharCode(10));",
  "  const serious = sanitized.flatMap((record) => [",
  '    ...record.pageErrors.map((message) => ({ label: record.label, kind: "page", message })),',
  '    ...record.consoleErrors.filter((message) => !message.includes("404")).map((message) => ({ label: record.label, kind: "console", message })),',
  '    ...record.httpErrors.filter((entry) => entry.status >= 500).map((entry) => ({ label: record.label, kind: "http", message: String(entry.status) + " " + entry.path })),',
  '    ...record.providerRequests.map((entry) => ({ label: record.label, kind: "payment-provider-request", message: entry.method + " " + entry.host + entry.path })),',
  "  ]);",
  "  expect(serious).toEqual([]);",
  "});",
].join("\n");
source = source.replace(describeMarker, describeMarker + "\n\n" + afterAllSource);

const apiStatusMarker = "  expect(apiResponse.status()).toBe(200);";
if (!source.includes(apiStatusMarker)) throw new Error("Candidate public API status marker drifted.");
source = source.replace(
  apiStatusMarker,
  [
    apiStatusMarker,
    '  expect(apiResponse.headers()["cache-control"] ?? "").toContain("public");',
    '  expect(apiResponse.headers()["cache-control"] ?? "").toContain("must-revalidate");',
  ].join("\n"),
);

const creatorNavigationMarker = "  await gotoReady(page, ROUTES.creator);";
if (!source.includes(creatorNavigationMarker)) throw new Error("Candidate creator navigation marker drifted.");
source = source.replace(
  creatorNavigationMarker,
  [
    "  const creatorResponse = await gotoReady(page, ROUTES.creator);",
    '  expect(creatorResponse?.headers()["cache-control"] ?? "").toMatch(/private|no-store/i);',
  ].join("\n"),
);

const outsiderStatusMarker = "  expect([200, 404]).toContain(outsiderResponse?.status());";
if (!source.includes(outsiderStatusMarker)) throw new Error("Candidate outsider status marker drifted.");
source = source.replace(
  outsiderStatusMarker,
  outsiderStatusMarker + '\n  expect(outsiderResponse?.headers()["cache-control"] ?? "").toMatch(/private|no-store/i);',
);

const reviewerSignOutMarker = '  await reviewer.client.auth.signOut({ scope: "local" });';
if (!source.includes(reviewerSignOutMarker)) throw new Error("Candidate reviewer sign-out marker drifted.");
source = source.replace(
  reviewerSignOutMarker,
  [
    "  const { data: reviewerFactors, error: reviewerFactorsError } = await reviewer.client.auth.mfa.listFactors();",
    '  if (reviewerFactorsError) throw new Error("Synthetic reviewer MFA factor listing failed.");',
    "  for (const factor of reviewerFactors.all) {",
    "    const { error: unenrollError } = await reviewer.client.auth.mfa.unenroll({ factorId: factor.id });",
    '    if (unenrollError) throw new Error("Synthetic reviewer MFA factor cleanup failed.");',
    "  }",
    reviewerSignOutMarker,
  ].join("\n"),
);

await mkdir("uat702", { recursive: true });
await writeFile(outputPath, source);
console.log("base_spec_trace_and_observation_mode=on");
