import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const deploymentUrl = process.env.MPGF_DAC_PRODUCT_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const qaRef = process.env.EXPECTED_QA_REF;
const prodRef = process.env.FORBIDDEN_PROD_REF;
const evidenceDir = process.env.UAT702_EVIDENCE_DIR ?? "test-results/uat702-evidence";

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
  const response = await page.goto("/mpgf/pools/new", { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) {
    throw new Error(`QA service-read route returned ${response?.status() ?? "no response"}.`);
  }
  await page.getByRole("heading", { level: 1, name: "Propose a moral public good." }).waitFor();
  const body = await page.locator("body").innerText();
  for (const forbidden of [
    "MPGF real-money gate table is not available",
    "status could not be checked",
    prodRef,
  ]) {
    if (body.includes(forbidden)) {
      throw new Error("The server-side QA service-read proof failed closed.");
    }
  }

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
    if (source.includes(qaPublicUrl) && source.includes(qaPublishableKey)) {
      clientBundleQaPair = true;
    }
  }
  if (!clientBundleQaPair) {
    throw new Error("The deployed browser bundle did not contain the exact QA URL/key pair.");
  }

  const absentCampaign = await context.request.get("/api/mpgf/dac/campaigns/uat702-preflight-absent");
  if (absentCampaign.status() !== 404) {
    throw new Error(`The deployed anonymous Supabase read contract returned ${absentCampaign.status()} instead of 404.`);
  }

  const rootResponse = await context.request.get("/");
  if (rootResponse.status() !== 200) {
    throw new Error(`Protected root returned ${rootResponse.status()} with the automation boundary.`);
  }
  const robots = rootResponse.headers()["x-robots-tag"] ?? "";
  if (!robots.toLowerCase().includes("noindex")) {
    throw new Error("Protected Preview did not retain the noindex response boundary.");
  }
  if (failures.length) throw new Error("A 5xx response occurred during pre-mutation preflight.");

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    `${evidenceDir}/pre-mutation-browser-proof.json`,
    `${JSON.stringify({
      deploymentHost,
      protectedAccess: true,
      noindex: true,
      serverQaServiceRead: "passed",
      anonymousQaRead: "passed",
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
