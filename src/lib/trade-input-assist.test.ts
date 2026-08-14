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
  autoResolveDelayMs: number;
  composeCommitmentSuggestions(
    query: string,
    options?: { topicHint?: string },
  ): Array<{ label: string; score: number; topic: string }>;
  extractWebsiteMentions(value: string): Array<{ href: string; text: string }>;
  findDonationRoute(href: string): Record<string, unknown> | null;
  rankSuggestions(
    context: string,
    query: string,
    options?: { topicHint?: string },
  ): Array<{ label: string; score: number }>;
  resolveCanonicalMatch(
    context: string,
    query: string,
  ): { canonicalValue: string; label: string } | null;
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

test("natural-language research offers compose topic-specific commitments", async () => {
  const assist = await loadAssistApi();
  const labels = Array.from(
    assist.rankSuggestions(
      "commitments",
      "I'll do wild-animal-suffering research",
    ),
    (entry) => entry.label,
  );

  assert.deepEqual(labels.slice(0, 4), [
    "Research wild animal suffering for fixed hours",
    "Complete a defined wild animal suffering research deliverable",
    "Complete a wild animal suffering literature review",
    "Publish a wild animal suffering research output",
  ]);
});

test("the compositional matcher understands new topics and misspelled action words", async () => {
  const assist = await loadAssistApi();
  const labels = Array.from(
    assist.rankSuggestions(
      "commitments",
      "I'll do insect consciousness reserch",
    ),
    (entry) => entry.label,
  );

  assert.deepEqual(labels.slice(0, 4), [
    "Research insect consciousness for fixed hours",
    "Complete a defined insect consciousness research deliverable",
    "Complete an insect consciousness literature review",
    "Publish an insect consciousness research output",
  ]);
});

test("a selected priority supplies the topic when the action text omits it", async () => {
  const assist = await loadAssistApi();
  const labels = Array.from(
    assist.rankSuggestions("commitments", "literature review", {
      topicHint: "Wild animal suffering",
    }),
    (entry) => entry.label,
  );

  assert.equal(labels[0], "Complete a wild animal suffering literature review");
  assert.ok(labels.includes("Research wild animal suffering for fixed hours"));
});

test("compositional commitments cover common action families without pre-enumerating topics", async () => {
  const assist = await loadAssistApi();
  const examples = [
    ["write", "I will write a climate change brief", /climate change/i],
    ["build", "Build an insect consciousness tool", /insect consciousness/i],
    ["volunteer", "Volunteer for global health", /global health/i],
    ["teach", "Teach AI safety", /ai safety/i],
    ["outreach", "Do outreach about global poverty", /global poverty/i],
    ["translate", "Translate a factory farming report", /factory farming/i],
    ["donate", "Donate to mental health", /mental health/i],
  ] as const;

  for (const [intent, query, expectedTopic] of examples) {
    const suggestions = assist.composeCommitmentSuggestions(query);
    assert.ok(suggestions.length >= 2, `${intent} should produce bounded options`);
    assert.match(suggestions[0]?.label ?? "", expectedTopic, intent);
  }
});

test("confident typos resolve to a unique canonical value while ambiguity stays reviewable", async () => {
  const assist = await loadAssistApi();

  assert.equal(
    assist.resolveCanonicalMatch("priorities", "Global povertyefgef")?.label,
    "Global poverty",
  );
  assert.equal(
    assist.resolveCanonicalMatch("priorities", "Gloabl poverty")?.label,
    "Global poverty",
  );
  assert.equal(
    assist.resolveCanonicalMatch("recipients", "Globla poverty")?.label,
    "Global poverty",
  );
  assert.equal(assist.resolveCanonicalMatch("priorities", "Animal"), null);
  assert.equal(
    assist.resolveCanonicalMatch(
      "commitments",
      "I will write a careful memo for a new topic",
    ),
    null,
  );
});

test("insertions, deletions, and transpositions resolve across every canonical label", async () => {
  const assist = await loadAssistApi();
  const contexts = [
    "priorities",
    "commitments",
    "evidence",
    "durations",
    "baselines",
    "exits",
    "organizations",
  ];
  let mutationCount = 0;

  for (const context of contexts) {
    for (const entry of catalog[context]) {
      const label = String(entry.label);
      const match = /[A-Za-z]{2,}/.exec(label);
      assert.ok(match, `test fixture needs a mutable word: ${label}`);
      const start = match.index;
      const word = match[0];
      const index = Math.min(2, word.length - 2);
      const variants = [
        `${label.slice(0, start + index)}x${label.slice(start + index)}`,
        `${label.slice(0, start + index)}${label.slice(start + index + 1)}`,
        `${label.slice(0, start + index)}${word[index + 1]}${word[index]}${label.slice(
          start + index + 2,
        )}`,
      ];

      for (const variant of variants) {
        mutationCount += 1;
        assert.equal(
          assist.resolveCanonicalMatch(context, variant)?.label,
          label,
          `${context}: ${variant}`,
        );
      }
    }
  }
  assert.equal(mutationCount, 165);
});

test("automatic resolution is delayed, undoable, and IME-safe", async () => {
  const assist = await loadAssistApi();

  assert.equal(assist.autoResolveDelayMs, 650);
  assert.match(assistSource, /Changed “\$\{previousValue\}” to “\$\{canonicalValue\}”/);
  assert.match(assistSource, /undo\.textContent = "Undo"/);
  assert.match(assistSource, /ignoredCorrectionKeys/);
  assert.match(assistSource, /correctionElementKey/);
  assert.match(assistSource, /compositionstart/);
  assert.match(assistSource, /compositionend/);
  assert.match(assistSource, /ignoredCorrectionValues/);
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
  assert.ok(catalog.commitmentIntents?.length >= 8);
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
  const templateLibrary = readRepoFile(
    "src/components/trade-templates/trade-template-library.tsx",
  );

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
  assert.match(assistSource, /document\.activeElement === control/);
  assert.match(assistSource, /data-mt-autocomplete-ready/);
  assert.match(templateLibrary, /data-mt-autocomplete="off"/);
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
  assert.match(workbenchSource, /Suggestions appear as you type/);
  assert.match(workbenchSource, /Try “Animal” to see related priorities/);
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
