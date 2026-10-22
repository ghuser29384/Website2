import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const requireFromCandidate = createRequire(join(process.cwd(), "package.json"));
const { chromium } = requireFromCandidate("@playwright/test");

const deploymentUrl = process.env.COMPACT_UAT_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const qaRef = process.env.EXPECTED_QA_REF;
const prodRef = process.env.FORBIDDEN_PROD_REF;
const evidenceDir = process.env.UAT712_EVIDENCE_DIR ?? "test-results/uat712-evidence";

if (!deploymentUrl || !bypass || !qaRef || !prodRef) {
  throw new Error("Protected Preview preflight variables are incomplete.");
}
if (!deploymentUrl.startsWith("https://") || deploymentUrl.includes(prodRef)) {
  throw new Error("Refusing an unexpected deployment URL.");
}

const deploymentHost = new URL(deploymentUrl).hostname;
const qaPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const qaPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!qaPublicUrl?.includes(qaRef) || qaPublicUrl.includes(prodRef) || !qaPublishableKey) {
  throw new Error("The selected public browser environment is not exact QA.");
}

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: deploymentUrl,
  viewport: { width: 1280, height: 900 },
  extraHTTPHeaders: {
    "x-vercel-protection-bypass": bypass,
    "x-vercel-set-bypass-cookie": "true",
  },
});

const failures = [];
const observedHosts = new Set();
let runtimeAttestation;
context.on("request", (request) => {
  try {
    observedHosts.add(new URL(request.url()).hostname);
  } catch {}
});
context.on("response", (response) => {
  if (response.status() >= 500) {
    failures.push({ kind: "http_5xx", status: response.status(), path: new URL(response.url()).pathname });
  }
});

try {
  const page = await context.newPage();
  const attestationResponse = await context.request.get("/api/uat712/runtime-attestation");
  const attestationStatus = attestationResponse.status();
  runtimeAttestation = await attestationResponse.json().catch(() => null);
  if (
    attestationStatus !== 200 ||
    runtimeAttestation?.schemaVersion !== 1 ||
    runtimeAttestation?.scope !== "controller-only-protected-preview" ||
    runtimeAttestation?.ok !== true ||
    runtimeAttestation?.runtimeEnvironment !== "preview" ||
    runtimeAttestation?.qaProjectRef !== qaRef ||
    runtimeAttestation?.qaPublicUrlExact !== true ||
    runtimeAttestation?.qaPublishableKeyConfigured !== true ||
    runtimeAttestation?.serviceRoleAbsent !== true ||
    runtimeAttestation?.qaApiRead !== true ||
    runtimeAttestation?.paymentModesDisabled !== true ||
    runtimeAttestation?.productionProjectPresent !== false ||
    runtimeAttestation?.secretValuesReturned !== false ||
    !Array.isArray(runtimeAttestation?.nonemptyProviderCredentialKeys) ||
    runtimeAttestation.nonemptyProviderCredentialKeys.length !== 0
  ) {
    throw new Error(`Protected runtime attestation failed closed with HTTP ${attestationStatus}.`);
  }

  const response = await page.goto("/mpgf/compacts", { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) {
    throw new Error(`Protected Compact route returned ${response?.status() ?? "no response"}.`);
  }
  await page.getByRole("heading", { level: 1, name: "Coordinate by constitution, not taxation." }).waitFor();
  const body = await page.locator("body").innerText();
  for (const required of [
    "adds no platform-wide marketplace tax or checkout surcharge",
    "separately calculates one later aggregate monthly obligation",
    "platform-governance commitment",
    "does not itself create a legal debt",
    "No action on this page moves money",
  ]) {
    if (!body.includes(required)) throw new Error(`Required Compact boundary is absent: ${required}`);
  }
  if (body.includes(prodRef)) throw new Error("The protected page exposed the production project reference.");

  const scriptUrls = await page.evaluate(() =>
    [...new Set([
      ...[...document.querySelectorAll("script[src]")].map((node) => node.getAttribute("src") ?? ""),
      ...performance.getEntriesByType("resource").map((entry) => entry.name),
    ])]
      .filter(Boolean)
      .map((value) => new URL(value, window.location.href).toString())
      .filter((value) => new URL(value).hostname === window.location.hostname && value.includes(".js")),
  );
  let clientBundleQaPair = false;
  for (const scriptUrl of scriptUrls) {
    const scriptResponse = await context.request.get(scriptUrl);
    if (!scriptResponse.ok()) continue;
    const source = await scriptResponse.text();
    if (source.includes(prodRef)) {
      throw new Error("A loaded browser bundle retained the forbidden production Supabase fallback.");
    }
    if (source.includes(qaPublicUrl) && source.includes(qaPublishableKey)) clientBundleQaPair = true;
  }
  if (!clientBundleQaPair) {
    throw new Error("The deployed browser bundle did not contain the exact QA URL/key pair.");
  }

  const rootResponse = await context.request.get("/");
  if (rootResponse.status() !== 200) throw new Error(`Protected root returned ${rootResponse.status()}.`);
  const robots = rootResponse.headers()["x-robots-tag"] ?? "";
  if (!robots.toLowerCase().includes("noindex")) {
    throw new Error("Protected Preview did not retain the noindex response boundary.");
  }
  if (failures.length) throw new Error("A 5xx response occurred during pre-mutation preflight.");

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    `${evidenceDir}/deployment-runtime-environment-proof.json`,
    `${JSON.stringify({
      protectedControllerAttestation: "passed",
      runtimeEnvironment: runtimeAttestation.runtimeEnvironment,
      qaProjectRef: runtimeAttestation.qaProjectRef,
      qaPublicUrlExact: true,
      qaPublishableKeyConfigured: true,
      qaRuntimeServiceRolePresent: false,
      qaApiRead: true,
      paymentModesDisabled: true,
      productionProjectExcluded: true,
      nonemptyProviderCredentialKeys: [],
      secretValuesRetained: false,
    }, null, 2)}\n`,
  );
  await writeFile(
    `${evidenceDir}/pre-mutation-browser-proof.json`,
    `${JSON.stringify({
      deploymentHost,
      protectedAccess: true,
      noindex: true,
      compactRouteBeforeSchema: "truthful_published_examples",
      protectedRuntimeAttestation: "passed",
      runtimePaymentModesDisabled: true,
      runtimeProviderCredentialValues: 0,
      runtimeServiceRoleValues: 0,
      clientBundleQaPair: true,
      clientBundleForbiddenProductionRef: false,
      qaProjectRef: qaRef,
      productionProjectExcluded: true,
      observedHosts: [...observedHosts]
        .filter((host) => !host.includes(prodRef))
        .map((host) => (host === deploymentHost ? "protected-preview" : host.includes(qaRef) ? "qa-supabase" : host))
        .sort(),
      http5xx: 0,
    }, null, 2)}\n`,
  );
  console.log("pre_mutation_browser_proof=passed");
} finally {
  await context.close();
  await browser.close();
}
