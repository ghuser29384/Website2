import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const BASE_URL = process.env.SMOKE_BASE_URL || "https://www.moraltrade.org";
const OUTPUT_DIR = path.resolve(
  process.env.SMOKE_OUTPUT_DIR || "live-trade-feed-production-smoke-evidence",
);
const PASSWORD = required("QA_TEST_PASSWORD");
const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
const RUN_ID = process.env.GITHUB_RUN_ID || `${Date.now()}`;
const EXPECTED_PRODUCTION_SHA = process.env.EXPECTED_PRODUCTION_SHA || "";
const CLEANUP_ONLY = process.env.SMOKE_CLEANUP_ONLY === "1";
const IDS_PATH = path.join(OUTPUT_DIR, "synthetic-ids.json");
const RESULT_PATH = path.join(OUTPUT_DIR, CLEANUP_ONLY ? "cleanup-result.json" : "result.json");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function cleanText(value) {
  return typeof value === "string" ? value.slice(0, 4_000) : String(value ?? "");
}

function serializeError(error) {
  return {
    name: error instanceof Error ? error.name : "Error",
    message: cleanText(error instanceof Error ? error.message : error),
    stack: error instanceof Error ? cleanText(error.stack) : null,
  };
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function uuid() {
  return crypto.randomUUID();
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function expectSuccess(label, operation) {
  const result = await operation;
  if (result?.error) {
    throw new Error(`${label}: ${result.error.code || "unknown"} ${result.error.message}`);
  }
  return result;
}

async function tableKeys(table) {
  const result = await admin.from(table).select("*").limit(1);
  if (result.error) throw new Error(`Read ${table} schema sample: ${result.error.message}`);
  const row = result.data?.[0];
  return row && typeof row === "object" ? new Set(Object.keys(row)) : null;
}

function filterKnownColumns(value, keys) {
  if (!keys) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => keys.has(key)));
}

async function createAuthUser(email, displayName) {
  const result = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      full_name: displayName,
      smoke_run: RUN_ID,
    },
  });
  if (result.error || !result.data.user) {
    throw new Error(`Create synthetic auth user ${email}: ${result.error?.message || "no user"}`);
  }
  return result.data.user;
}

async function setupSyntheticData(result) {
  const suffix = `${RUN_ID}-${crypto.randomBytes(4).toString("hex")}`;
  const cause = `Feed parity ${suffix}`;
  const viewerEmail = `mt-feed-parity-viewer-${suffix}@example.test`;
  const ownerEmail = `mt-feed-parity-owner-${suffix}@example.test`;
  const viewer = await createAuthUser(viewerEmail, `Feed Parity Viewer ${suffix}`);
  const owner = await createAuthUser(ownerEmail, `Feed Parity Owner ${suffix}`);
  const offerId = uuid();

  const ids = {
    runId: RUN_ID,
    viewerId: viewer.id,
    ownerId: owner.id,
    offerId,
    viewerEmail,
    ownerEmail,
    cause,
  };
  writeJson(IDS_PATH, ids);
  result.synthetic = ids;

  await expectSuccess(
    "Upsert synthetic profiles",
    admin.from("profiles").upsert(
      [
        {
          id: viewer.id,
          email: viewerEmail,
          display_name: `Feed Parity Viewer ${suffix}`,
          bio: "Synthetic authenticated production smoke profile; remove after verification.",
        },
        {
          id: owner.id,
          email: ownerEmail,
          display_name: `Feed Parity Owner ${suffix}`,
          bio: "Synthetic authenticated production smoke profile; remove after verification.",
        },
      ],
      { onConflict: "id" },
    ),
  );

  const wishKeys = await tableKeys("wish_profiles");
  const wishPayload = filterKnownColumns(
    {
      profile_id: viewer.id,
      participant_kind: "individual",
      collective_name: "",
      causes: [cause],
      capabilities: "Bounded production smoke action",
      constraints: "Synthetic QA only",
      verification_preferences: "Public receipt and counterparty confirmation",
      uncertainty_notes: "Synthetic QA fixture",
      openness_to_payment: true,
      openness_to_pledges: true,
      background_search_enabled: false,
      privacy_stage: "strict",
      is_discoverable: false,
      share_public_preview: false,
      share_location: false,
      public_preview: "",
      safety_status: "clear",
      safety_notes: "Synthetic production smoke fixture",
    },
    wishKeys,
  );
  await expectSuccess(
    "Upsert viewer wish profile",
    admin.from("wish_profiles").upsert(wishPayload, { onConflict: "profile_id" }),
  );

  const offerKeys = await tableKeys("offers");
  const now = new Date().toISOString();
  const offerPayload = filterKnownColumns(
    {
      id: offerId,
      owner_id: owner.id,
      owner_alias: `Feed Parity Owner ${suffix}`,
      mode: "payment",
      offered_cause: cause,
      requested_cause: `Bounded action for ${cause}`,
      offer_action: `Fund the reviewed ${cause} outcome`,
      request_action: `Complete one bounded ${cause} review`,
      compromise_cause: "Not needed",
      offer_impact: 100,
      min_counterparty_impact: 1,
      verification: "Public receipt and counterparty confirmation",
      duration: "Complete within 30 days",
      payment_interval_value: null,
      payment_interval_unit: null,
      trust_level: 3,
      maximum_burden: "One short review",
      no_trade_baseline: "No synthetic action occurs without this QA offer.",
      privacy_scope: "public",
      notes: `Synthetic authenticated production smoke ${suffix}`,
      discount_note: "Synthetic QA only",
      status: "open",
      workflow_status: "published",
      published_at: now,
      closed_at: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
    offerKeys,
  );
  result.offerColumns = Object.keys(offerPayload).sort();
  await expectSuccess(
    "Insert synthetic published offer",
    admin.from("offers").insert(offerPayload),
  );

  return ids;
}

async function readIdentity(locator) {
  return locator.evaluate((element) => ({
    opportunityId: element.getAttribute("data-opportunity-id"),
    opportunityType: element.getAttribute("data-opportunity-type"),
    feedItemId: element.getAttribute("data-feed-item-id"),
    feedItemKey: element.getAttribute("data-feed-item-key"),
    exposureRequestId: element.getAttribute("data-exposure-request-id"),
  }));
}

async function runBrowserCheck(ids, result) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(cleanText(error.message)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(cleanText(message.text()));
  });

  try {
    await page.goto(`${BASE_URL}/login?returnTo=%2Ffeed`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.getByLabel("Email").fill(ids.viewerEmail);
    await page.getByLabel("Password").fill(PASSWORD);
    await Promise.all([
      page.waitForURL(/\/feed(?:$|[?#])/, { timeout: 45_000 }),
      page.getByRole("button", { name: "Log in" }).click(),
    ]);

    const feedCard = page.locator(
      `[data-feed-item-id="${ids.offerId}"][data-feed-item-key="offer:${ids.offerId}"]`,
    );
    await feedCard.waitFor({ state: "visible", timeout: 60_000 });
    const feedIdentity = await readIdentity(feedCard);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "01-production-feed.png"),
      fullPage: true,
      animations: "disabled",
    });

    assert.equal(feedIdentity.opportunityId, ids.offerId);
    assert.equal(feedIdentity.opportunityType, "offer");
    assert.equal(feedIdentity.feedItemId, ids.offerId);
    assert.equal(feedIdentity.feedItemKey, `offer:${ids.offerId}`);
    assert.ok(feedIdentity.exposureRequestId, "The production Feed card had no exposure receipt.");

    await page.evaluate(() => {
      const tradeControl = document.querySelector('[data-page="trade"]');
      if (!(tradeControl instanceof HTMLElement)) {
        throw new Error("The live shell did not expose its Trade control.");
      }
      history.replaceState(null, "", "/#trade");
      tradeControl.click();
    });
    await page.waitForURL(/\/#trade$/, { timeout: 15_000 });

    const tradeCard = page.locator(
      `[data-mt-live-trade-feed="ready"] [data-feed-item-id="${ids.offerId}"]`,
    );
    await tradeCard.waitFor({ state: "visible", timeout: 30_000 });
    const tradeIdentity = await readIdentity(tradeCard);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "02-production-trade.png"),
      fullPage: true,
      animations: "disabled",
    });

    assert.deepEqual(
      {
        opportunityId: tradeIdentity.opportunityId,
        feedItemKey: tradeIdentity.feedItemKey,
        exposureRequestId: tradeIdentity.exposureRequestId,
      },
      {
        opportunityId: feedIdentity.opportunityId,
        feedItemKey: feedIdentity.feedItemKey,
        exposureRequestId: feedIdentity.exposureRequestId,
      },
      "The live /#trade card did not retain the exact /feed identity and exposure receipt.",
    );
    assert.equal(tradeIdentity.opportunityType, feedIdentity.opportunityType);
    assert.equal(tradeIdentity.feedItemId, feedIdentity.feedItemId);

    const exposureResult = await admin
      .from("recommendation_exposures")
      .select("id,request_id,opportunity_type,opportunity_id,was_shown")
      .eq("profile_id", ids.viewerId)
      .eq("opportunity_type", "offer")
      .eq("opportunity_id", ids.offerId)
      .eq("request_id", feedIdentity.exposureRequestId);
    if (exposureResult.error) {
      throw new Error(`Read production exposure receipt: ${exposureResult.error.message}`);
    }
    assert.equal(
      exposureResult.data?.length,
      1,
      "Expected exactly one authoritative production exposure row for the shared snapshot.",
    );
    assert.equal(exposureResult.data?.[0]?.was_shown, true);

    result.browser = {
      finalUrl: page.url(),
      feedIdentity,
      tradeIdentity,
      authoritativeExposureRows: exposureResult.data,
      pageErrors,
      consoleErrors,
    };
    assert.deepEqual(pageErrors, [], "Production browser emitted page errors.");
    assert.deepEqual(consoleErrors, [], "Production browser emitted console errors.");
  } finally {
    await context.close();
    await browser.close();
  }
}

async function deleteWhere(table, configure, cleanupErrors) {
  try {
    let query = admin.from(table).delete();
    query = configure(query);
    const result = await query;
    if (result.error) cleanupErrors.push(`${table}: ${result.error.code || ""} ${result.error.message}`);
  } catch (error) {
    cleanupErrors.push(`${table}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function cleanupSyntheticData(ids) {
  const cleanupErrors = [];
  if (!ids) return { completed: false, cleanupErrors: ["No synthetic ID manifest was available."], leftovers: {} };

  let exposureIds = [];
  try {
    const exposures = await admin
      .from("recommendation_exposures")
      .select("id")
      .eq("profile_id", ids.viewerId)
      .eq("opportunity_id", ids.offerId);
    if (exposures.error) cleanupErrors.push(`read recommendation_exposures: ${exposures.error.message}`);
    exposureIds = (exposures.data || []).map((row) => row.id).filter(Boolean);
  } catch (error) {
    cleanupErrors.push(`read recommendation_exposures: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (exposureIds.length) {
    await deleteWhere(
      "recommendation_outcomes",
      (query) => query.in("exposure_id", exposureIds),
      cleanupErrors,
    );
  }
  await deleteWhere(
    "recommendation_interactions",
    (query) => query.eq("profile_id", ids.viewerId).eq("opportunity_id", ids.offerId),
    cleanupErrors,
  );
  await deleteWhere(
    "recommendation_exposures",
    (query) => query.eq("profile_id", ids.viewerId).eq("opportunity_id", ids.offerId),
    cleanupErrors,
  );
  await deleteWhere(
    "recommendation_experiment_assignments",
    (query) => query.eq("profile_id", ids.viewerId),
    cleanupErrors,
  );
  await deleteWhere("offers", (query) => query.eq("id", ids.offerId), cleanupErrors);

  for (const profileId of [ids.viewerId, ids.ownerId]) {
    for (const table of [
      "recommendation_preferences",
      "recommendation_user_factors",
      "route_recommendation_profiles",
      "profile_syntheses",
      "wish_profiles",
      "profiles",
    ]) {
      const column = table === "profiles" ? "id" : "profile_id";
      await deleteWhere(table, (query) => query.eq(column, profileId), cleanupErrors);
    }
  }

  for (const userId of [ids.viewerId, ids.ownerId]) {
    try {
      const result = await admin.auth.admin.deleteUser(userId, false);
      if (result.error) cleanupErrors.push(`auth.users ${userId}: ${result.error.message}`);
    } catch (error) {
      cleanupErrors.push(`auth.users ${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const leftovers = {};
  const checks = [
    ["offers", "id", ids.offerId],
    ["recommendation_exposures", "opportunity_id", ids.offerId],
    ["profiles", "id", ids.viewerId],
    ["profiles", "id", ids.ownerId],
  ];
  for (const [table, column, value] of checks) {
    const key = `${table}:${value}`;
    try {
      const count = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
      leftovers[key] = count.error ? `error:${count.error.message}` : count.count || 0;
    } catch (error) {
      leftovers[key] = `error:${error instanceof Error ? error.message : String(error)}`;
    }
  }
  for (const [label, userId] of [
    ["viewerAuthUser", ids.viewerId],
    ["ownerAuthUser", ids.ownerId],
  ]) {
    try {
      const user = await admin.auth.admin.getUserById(userId);
      leftovers[label] = user.data.user ? 1 : 0;
      if (user.error && !/not found/i.test(user.error.message)) {
        cleanupErrors.push(`${label}: ${user.error.message}`);
      }
    } catch (error) {
      leftovers[label] = 0;
    }
  }

  const numericLeftovers = Object.values(leftovers).filter((value) => typeof value === "number");
  const completed = cleanupErrors.length === 0 && numericLeftovers.every((value) => value === 0);
  return { completed, cleanupErrors, leftovers };
}

async function loadIds() {
  if (!fs.existsSync(IDS_PATH)) return null;
  return JSON.parse(fs.readFileSync(IDS_PATH, "utf8"));
}

async function main() {
  if (CLEANUP_ONLY) {
    const ids = await loadIds();
    const cleanup = await cleanupSyntheticData(ids);
    writeJson(RESULT_PATH, { cleanupOnly: true, cleanup });
    if (!cleanup.completed) process.exitCode = 1;
    return;
  }

  const result = {
    baseUrl: BASE_URL,
    expectedProductionSha: EXPECTED_PRODUCTION_SHA,
    runId: RUN_ID,
    startedAt: new Date().toISOString(),
    passed: false,
    synthetic: null,
    browser: null,
    cleanup: null,
    error: null,
  };
  let ids = null;
  try {
    ids = await setupSyntheticData(result);
    await runBrowserCheck(ids, result);
    result.passed = true;
  } catch (error) {
    result.error = serializeError(error);
    process.exitCode = 1;
  } finally {
    result.cleanup = await cleanupSyntheticData(ids || (await loadIds()));
    if (!result.cleanup.completed) process.exitCode = 1;
    result.completedAt = new Date().toISOString();
    writeJson(RESULT_PATH, result);
  }
}

await main();
