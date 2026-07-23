import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

import {
  deriveCommitmentLimit,
  validateTradeCalendarDates,
} from "@/lib/trade-draft-standards";

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const catalog = JSON.parse(
  readRepoFile("public/moral-trade-input-standards.json"),
) as Record<string, Array<Record<string, unknown>>>;
const assistSource = readRepoFile("public/moral-trade-input-assist.js");
const workbenchSource = readRepoFile(
  "src/components/core-trade/trade-draft-workbench.tsx",
);
const actionSource = readRepoFile("src/app/core-trade-actions-base.ts");
const migrationSource = readRepoFile(
  "supabase/migrations/20260722171139_core_trade_authenticated_drafts.sql",
);

interface AssistApi {
  extractWebsiteMentions(value: string): Array<{ href: string; text: string }>;
  findDonationRoute(href: string): Record<string, unknown> | null;
  rankSuggestions(
    context: string,
    query: string,
  ): Array<{ label: string; score: number }>;
}

async function loadAssistApi() {
  const browserWindow: Record<string, unknown> = {
    clearTimeout,
    setTimeout,
  };
  const context = {
    URL,
    console,
    document: {
      addEventListener() {},
      readyState: "loading",
    },
    fetch: async () => ({
      json: async () => catalog,
      ok: true,
    }),
    window: browserWindow,
  };

  vm.runInNewContext(assistSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  return browserWindow.MoralTradeInputAssist as AssistApi;
}

test("typing Animal ranks the shared animal priority categories together", async () => {
  const assist = await loadAssistApi();
  const labels = Array.from(
    assist.rankSuggestions("priorities", "Animal"),
    (entry) => entry.label,
  );

  assert.deepEqual(labels.slice(0, 3), [
    "Animal welfare",
    "Wild animal suffering",
    "Factory farming",
  ]);
});

test("mixed search fields keep cause matches ahead of action matches", async () => {
  const assist = await loadAssistApi();
  const labels = Array.from(
    assist.rankSuggestions("search", "Animal"),
    (entry) => entry.label,
  );

  assert.deepEqual(labels.slice(0, 3), [
    "Animal welfare",
    "Wild animal suffering",
    "Factory farming",
  ]);
  assert.match(
    assistSource,
    /control instanceof HTMLInputElement && control\.type === "search"/,
  );
});

test("the shared catalog covers every standardized trade-term context", () => {
  for (const key of [
    "priorities",
    "commitments",
    "evidence",
    "durations",
    "baselines",
    "exits",
    "organizations",
  ]) {
    assert.ok(catalog[key]?.length, `${key} should contain standardized suggestions`);
  }
});

test("website mentions are normalized into safe links without HTML injection", async () => {
  const assist = await loadAssistApi();
  const mentions = Array.from(
    assist.extractWebsiteMentions(
      "Donate via againstmalaria.com, then review https://www.givewell.org/.",
    ),
  );

  assert.equal(mentions.length, 2);
  assert.equal(mentions[0]?.href, "https://againstmalaria.com/");
  assert.equal(mentions[1]?.href, "https://www.givewell.org/");
  assert.doesNotMatch(assistSource, /\.innerHTML\s*=/);
  assert.match(assistSource, /textContent = mention\.text/);
});

test("recognized sites expose only curated donation routes after a 500 ms hover", async () => {
  const assist = await loadAssistApi();
  const route = assist.findDonationRoute("https://www.againstmalaria.com/");

  assert.equal(route?.label, "Against Malaria Foundation");
  assert.equal(
    route?.donationRoute,
    "https://www.every.org/againstmalaria#/donate",
  );
  assert.equal(
    assist.findDonationRoute("https://appeal.againstmalaria.com/"),
    null,
  );
  assert.equal(assist.findDonationRoute("https://unreviewed.example.com/"), null);
  assert.match(assistSource, /setTimeout\(\(\) => showHoverCard\(anchor, mention\), 500\)/);
  assert.match(assistSource, /Moral Trade does not take custody of the gift/);
});

test("autocomplete and date assistance load across Next and legacy shells", () => {
  const layout = readRepoFile("src/app/layout.tsx");

  assert.match(layout, /moral-trade-input-assist\.css/);
  assert.match(layout, /moral-trade-input-assist\.js/);
  for (const path of [
    "public/moral-trade-live.html",
    "public/moral-trade-discover.html",
    "public/moral-trade-production.html",
  ]) {
    const source = readRepoFile(path);
    assert.match(source, /moral-trade-input-assist\.css/, path);
    assert.match(source, /moral-trade-input-assist\.js/, path);
  }
  assert.match(assistSource, /new MutationObserver/);
});

test("the composer uses standardized autocomplete contexts and terminology", () => {
  for (const context of [
    "priorities",
    "commitments",
    "baselines",
    "durations",
    "evidence",
    "exits",
  ]) {
    assert.match(
      workbenchSource,
      new RegExp(`data-mt-autocomplete="${context}"`),
    );
  }
  assert.match(workbenchSource, />Commitment limit</);
  assert.match(workbenchSource, />Evidence</);
  assert.doesNotMatch(workbenchSource, />Maximum burden</i);
  assert.doesNotMatch(workbenchSource, />Evidence rule</i);
});

test("the commitment limit is derived from earlier terms and edited only on request", () => {
  assert.equal(
    deriveCommitmentLimit({
      duration: "  30 days ",
      proposedAction: "Donate $20.",
      requestedAction: "Avoid meat for one meal.",
    }),
    "Limited to these two commitments for 30 days: Donate $20. In return: Avoid meat for one meal. No additional money, time, actions, or public exposure can be added without a newly confirmed agreement version.",
  );
  assert.match(workbenchSource, /Set a stricter limit/);
  assert.match(workbenchSource, /isCommitmentLimitEditorOpen \?/);
  assert.match(workbenchSource, /Edit commitment limit/);
});

test("past dates are blocked in the browser and revalidated on the server", () => {
  const now = new Date("2026-07-22T01:00:00.000Z");
  assert.equal(
    validateTradeCalendarDates({
      evidenceDueDate: "2026-07-22",
      now,
      startDate: "2026-07-21",
      timeZone: "America/Los_Angeles",
    }),
    null,
  );
  assert.equal(
    validateTradeCalendarDates({
      evidenceDueDate: "2026-07-22",
      now,
      startDate: "2026-07-21",
      timeZone: "Asia/Tokyo",
    }),
    "Choose a start date that has not passed.",
  );
  assert.equal(
    validateTradeCalendarDates({
      evidenceDueDate: "2026-07-23",
      now,
      startDate: "2026-07-24",
      timeZone: "UTC",
    }),
    "Evidence cannot be due before the commitment starts.",
  );
  assert.match(workbenchSource, /min=\{localToday \|\| undefined\}/);
  assert.match(workbenchSource, /Choose a start date that has not passed/);
  assert.match(assistSource, /control\.min = today/);
  assert.match(actionSource, /validateTradeCalendarDates/);
});

test("private drafts use the signed-in RLS client instead of a server-only secret", () => {
  const saveStart = actionSource.indexOf(
    "export async function saveCoreOfferAction",
  );
  const saveEnd = actionSource.indexOf(
    "export async function updateCoreOfferAction",
    saveStart,
  );
  const saveAction = actionSource.slice(saveStart, saveEnd);

  assert.ok(saveStart >= 0 && saveEnd > saveStart);
  assert.match(saveAction, /await createClient\(\)/);
  assert.doesNotMatch(saveAction, /createServiceClient\(\)/);
  assert.match(saveAction, /supabaseClient: supabase/);

  const updateStart = saveEnd;
  const updateEnd = actionSource.indexOf(
    "export async function changeCoreOfferStateAction",
    updateStart,
  );
  const updateAction = actionSource.slice(updateStart, updateEnd);
  assert.match(updateAction, /await createClient\(\)/);
  assert.doesNotMatch(updateAction, /createServiceClient\(\)/);
});

test("authenticated draft-event policies stay scoped to offers owned by the user", () => {
  assert.match(migrationSource, /to authenticated/);
  assert.match(migrationSource, /offer\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(
    migrationSource,
    /event_type in \('offer_draft_saved', 'offer_submitted'\)/,
  );
  assert.match(
    migrationSource,
    /action in \('submitted', 'duplicate_flagged'\)/,
  );
  assert.doesNotMatch(migrationSource, /to public/);
});
