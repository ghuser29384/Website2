import { createHash, createHmac } from "node:crypto";

export const FEATURE_HEAD = "9c4363e5e6713163df5b7a8b51981af585d2f0a9";
export const FEATURE_TREE = "84aecf084083b01f4dc93103c45ceae23f9e789c";
export const QA_PROJECT_REF = "hvmxfjjbdcgjjudmthdz";
export const PRODUCTION_PROJECT_REF = "jnpoxvalyjtdghnperyu";

export const HARNESS_PATHS = [
  ".github/scripts/pooled-settlement-qa-contract.mjs",
  ".github/scripts/pooled-settlement-qa-e2e.mjs",
  ".github/scripts/pooled-settlement-qa-e2e.test.mjs",
  ".github/workflows/pooled-settlement-authenticated-e2e-20260814.yml",
];

export const REQUIRED_MIGRATIONS = [
  "20260725152000",
  "20260814024354",
  "20260814030000",
  "20260814033000",
];

export const REQUIRED_PROVIDER_SECRETS = [
  "QA_STRIPE_SECRET_KEY",
  "QA_STRIPE_PUBLISHABLE_KEY",
  "QA_STRIPE_WEBHOOK_SECRET",
  "QA_EVERY_ORG_WEBHOOK_TOKEN",
  "QA_EVERY_ORG_WEBHOOK_PATH_SECRET",
  "QA_EVERY_ORG_PARTNER_METADATA_SECRET",
];

export const POOLED_TABLES = [
  "trade_donation_pool_gate_status",
  "trade_donation_pool_obligations",
  "trade_donation_pool_bundles",
  "trade_donation_pool_bundle_items",
  "trade_donation_pool_ledger_journals",
  "trade_donation_pool_ledger_lines",
  "trade_donation_pool_stripe_events",
  "trade_donation_pool_audit_events",
];

export const SERVICE_ONLY_RPCS = [
  "mark_trade_donation_pool_component_stale()",
  "record_trade_donation_pool_stripe_failure(text,text,boolean,text,boolean,uuid,text,text)",
  "start_trade_donation_pool_bundle_checkout(uuid,uuid,text)",
];

export const SCENARIOS = [
  [1, "Four $2.50 obligations form exactly one $10.00 bundle"],
  [2, "The frozen manifest contains the exact four immutable allocations"],
  [3, "Funding and settlement journals balance in whole cents"],
  [4, "A signed Stripe test payment failure remains non-funded"],
  [5, "A signed expired Checkout Session remains non-funded"],
  [6, "A pre-freeze refund reverses the liability and remains non-activating"],
  [7, "Refund and cancellation controls disappear after bundle freeze"],
  [8, "Version drift after funding fails closed before a bundle can settle"],
  [9, "A stale or invalid bundle component blocks provider checkout"],
  [10, "Duplicate signed Stripe events are idempotent"],
  [11, "Duplicate Every.org completion is idempotent"],
  [12, "Every.org amount mismatch activates zero components"],
  [13, "Every.org recipient mismatch activates zero components"],
  [14, "Every.org metadata mismatch activates zero components"],
  [15, "An invalid component forces the bundle to review"],
  [16, "Concurrent compatible funding freezes one deterministic bundle"],
  [17, "A post-settlement chargeback records a balanced loss journal"],
  [18, "Exact Every.org completion activates every component atomically"],
  [19, "Every mismatch path activates zero component agreements"],
].map(([id, title]) => ({ id, title }));

const SENSITIVE_KEY = /(secret|token|password|authorization|cookie|service_role|publishable|signature)/i;
const SENSITIVE_VALUE = /(sk_(?:live|test|restricted)_|rk_(?:live|test)_|pk_(?:live|test)_|whsec_|eyJ[a-zA-Z0-9_-]{10,}|postgres(?:ql)?:\/\/[^\s]+)/g;

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createPartnerMetadata({ bundleId, manifestHash, partnerDonationId, metadataSecret }) {
  const metadata = {
    schema: "moral-trade-pooled-settlement-v1",
    bundleId,
    manifestHash,
    partnerDonationId,
  };
  const input = [metadata.schema, metadata.bundleId, metadata.manifestHash, metadata.partnerDonationId].join("\u241f");
  return {
    ...metadata,
    signature: createHmac("sha256", metadataSecret).update(input).digest("hex"),
  };
}

export function redactEvidence(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactEvidence(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redactEvidence(item, name)]));
  }
  if (typeof value === "string") return value.replace(SENSITIVE_VALUE, "[REDACTED]");
  return value;
}

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function referencesProject(value, projectRef) {
  return present(value) && String(value).toLowerCase().includes(projectRef.toLowerCase());
}

export function classifyEnvironment(env) {
  const missingCore = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "QA_SUPABASE_DB_URL",
    "QA_TEST_PASSWORD",
  ].filter((key) => !present(env[key]));
  const missingProvider = REQUIRED_PROVIDER_SECRETS.filter((key) => !present(env[key]));
  const unsafe = [];

  const projectValues = [env.NEXT_PUBLIC_SUPABASE_URL, env.QA_SUPABASE_DB_URL].filter(present);
  if (projectValues.some((value) => referencesProject(value, PRODUCTION_PROJECT_REF))) {
    unsafe.push("A configured target references the production Supabase project.");
  }
  if (present(env.NEXT_PUBLIC_SUPABASE_URL) && !referencesProject(env.NEXT_PUBLIC_SUPABASE_URL, QA_PROJECT_REF)) {
    unsafe.push("NEXT_PUBLIC_SUPABASE_URL does not identify the canonical isolated QA project.");
  }
  if (present(env.QA_SUPABASE_DB_URL) && !referencesProject(env.QA_SUPABASE_DB_URL, QA_PROJECT_REF)) {
    unsafe.push("QA_SUPABASE_DB_URL does not identify the canonical isolated QA project.");
  }
  if (present(env.QA_STRIPE_SECRET_KEY) && !env.QA_STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    unsafe.push("QA_STRIPE_SECRET_KEY is not a Stripe test-mode key.");
  }
  if (present(env.QA_STRIPE_PUBLISHABLE_KEY) && !env.QA_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_")) {
    unsafe.push("QA_STRIPE_PUBLISHABLE_KEY is not a Stripe test-mode key.");
  }
  if (present(env.QA_STRIPE_WEBHOOK_SECRET) && !env.QA_STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
    unsafe.push("QA_STRIPE_WEBHOOK_SECRET is not a Stripe webhook signing secret.");
  }
  for (const key of ["QA_EVERY_ORG_WEBHOOK_PATH_SECRET", "QA_EVERY_ORG_PARTNER_METADATA_SECRET"]) {
    if (present(env[key]) && env[key].length < 32) unsafe.push(`${key} is shorter than 32 characters.`);
  }
  if (present(env.QA_TEST_PASSWORD) && env.QA_TEST_PASSWORD.length < 14) {
    unsafe.push("QA_TEST_PASSWORD is shorter than 14 characters.");
  }
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("QA_") && typeof value === "string" && /(?:sk|pk|rk)_live_/.test(value)) {
      unsafe.push(`${key} contains a live Stripe credential.`);
    }
  }

  const coreReady = missingCore.length === 0 && unsafe.length === 0;
  const stripeReady = [
    "QA_STRIPE_SECRET_KEY",
    "QA_STRIPE_PUBLISHABLE_KEY",
    "QA_STRIPE_WEBHOOK_SECRET",
  ].every((key) => present(env[key])) && unsafe.length === 0;
  const everyOrgReady = [
    "QA_EVERY_ORG_WEBHOOK_TOKEN",
    "QA_EVERY_ORG_WEBHOOK_PATH_SECRET",
    "QA_EVERY_ORG_PARTNER_METADATA_SECRET",
  ].every((key) => present(env[key])) && unsafe.length === 0;

  return {
    coreReady,
    stripeReady,
    everyOrgReady,
    authenticatedE2EReady: coreReady && stripeReady && everyOrgReady,
    missingCore,
    missingProvider,
    unsafe: [...new Set(unsafe)],
    target: QA_PROJECT_REF,
  };
}

export function emptyScenarioResults() {
  return SCENARIOS.map((scenario) => ({
    ...scenario,
    status: "blocked",
    expected: scenario.title,
    actual: "Not run because the QA provider-secret preflight did not pass.",
    fixtureIds: [],
    eventIds: [],
    transitions: [],
    ledger: null,
    evidence: [],
  }));
}
