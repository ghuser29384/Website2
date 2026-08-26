import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}
function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function save(path, value) {
  writeFileSync(path, value, { mode: 0o600 });
  chmodSync(path, 0o600);
}

const sourceRoot = required("I782_SOURCE_ROOT");
const stateDir = required("I782_STATE_DIR");
const planned = load(required("I782_PLANNED_MANIFEST"));
const auth = load(required("I782_AUTH_STATE"));
for (const role of ["creator", "reviewer", "pledger", "outsider"]) {
  if (!auth.users?.[role]?.id) throw new Error(`Missing exact Auth id for ${role}`);
}

const old = {
  creatorId: "ca111111-1111-4111-8111-111111111111",
  reviewerId: "cb222222-2222-4222-8222-222222222222",
  pledgerId: "cc333333-3333-4333-8333-333333333333",
  outsiderId: "cd444444-4444-4444-8444-444444444444",
  proposalOpen: "ce555555-5555-4555-8555-555555555555",
  proposalSuccess: "cf666666-6666-4666-8666-666666666666",
  proposalLapse: "c0777777-7777-4777-8777-777777777777",
  submissionOpen: "d1111111-1111-4111-8111-111111111111",
  submissionSuccess: "d2222222-2222-4222-8222-222222222222",
  submissionLapse: "d3333333-3333-4333-8333-333333333333",
  creatorEmail: "dac-product-creator@qa.invalid",
  reviewerEmail: "dac-product-reviewer@qa.invalid",
  pledgerEmail: "dac-product-pledger@qa.invalid",
  outsiderEmail: "dac-product-outsider@qa.invalid",
  matchPool: "qa-dac-product-match-20260807",
  round: "qa-dac-product-round-20260807",
  slugOpen: "qa-dac-product-open",
  slugSuccess: "qa-dac-product-succeeded",
  slugLapse: "qa-dac-product-lapsed",
  submissionKeyOpen: "qa-dac-product-open-submission",
  submissionKeySuccess: "qa-dac-product-success-submission",
  submissionKeyLapse: "qa-dac-product-lapse-submission",
  destinationOpen: "qa-dac-product-open-recipient",
  destinationSuccess: "qa-dac-product-success-recipient",
  destinationLapse: "qa-dac-product-lapse-recipient",
  threshold: "qa-dac-product-threshold-1",
};
const next = {
  creatorId: auth.users.creator.id,
  reviewerId: auth.users.reviewer.id,
  pledgerId: auth.users.pledger.id,
  outsiderId: auth.users.outsider.id,
  proposalOpen: planned.objectIds.proposal_open,
  proposalSuccess: planned.objectIds.proposal_success,
  proposalLapse: planned.objectIds.proposal_lapse,
  submissionOpen: planned.objectIds.submission_open,
  submissionSuccess: planned.objectIds.submission_success,
  submissionLapse: planned.objectIds.submission_lapse,
  creatorEmail: auth.users.creator.email,
  reviewerEmail: auth.users.reviewer.email,
  pledgerEmail: auth.users.pledger.email,
  outsiderEmail: auth.users.outsider.email,
  matchPool: planned.strings.matchPool,
  round: planned.strings.round,
  slugOpen: planned.strings.slugOpen,
  slugSuccess: planned.strings.slugSuccess,
  slugLapse: planned.strings.slugLapse,
  submissionKeyOpen: planned.strings.submissionKeyOpen,
  submissionKeySuccess: planned.strings.submissionKeySuccess,
  submissionKeyLapse: planned.strings.submissionKeyLapse,
  destinationOpen: planned.strings.destinationOpen,
  destinationSuccess: planned.strings.destinationSuccess,
  destinationLapse: planned.strings.destinationLapse,
  threshold: planned.strings.threshold,
};

function campaign(id) {
  return `campaign-${id.replaceAll("-", "")}`;
}
const replacements = new Map();
for (const key of Object.keys(old)) replacements.set(old[key], next[key]);
replacements.set(campaign(old.proposalOpen), campaign(next.proposalOpen));
replacements.set(campaign(old.proposalSuccess), campaign(next.proposalSuccess));
replacements.set(campaign(old.proposalLapse), campaign(next.proposalLapse));
replacements.set("mpgf_dac_product_browser", planned.strings.ownershipTag);
replacements.set("Synthetic isolated-QA", `Synthetic ${planned.namespaceHandle}`);

function replaceAll(source) {
  let result = source;
  const entries = [...replacements.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) result = result.split(from).join(to);
  return result;
}

const fixtureSource = readFileSync(join(sourceRoot, "supabase/tests/mpgf_dac_product_browser_fixture.sql"), "utf8");
const cleanupSource = readFileSync(join(sourceRoot, "supabase/tests/mpgf_dac_product_browser_cleanup.sql"), "utf8");
const specSource = readFileSync(join(sourceRoot, "tests/mpgf-dac-product-lifecycle.spec.ts"), "utf8");

const profileStart = fixtureSource.indexOf("insert into public.profiles");
if (profileStart < 0) throw new Error("Could not locate profile fixture boundary");
let fixture = `\\set ON_ERROR_STOP on\n\nbegin;\n\n${fixtureSource.slice(profileStart)}`;
fixture = replaceAll(fixture);

const mappedCleanup = replaceAll(cleanupSource);
const authCleanupMarker = "\ndelete from auth.mfa_factors";
const authCleanupIndex = mappedCleanup.indexOf(authCleanupMarker);
if (authCleanupIndex < 0) throw new Error("Could not locate Auth cleanup boundary");
const appCleanup = `${mappedCleanup.slice(0, authCleanupIndex).trimEnd()}\n\ncommit;\n`;
const exactIds = [next.creatorId, next.reviewerId, next.pledgerId, next.outsiderId];
const quotedIds = exactIds.map((id) => `'${id}'`).join(",\n  ");
const profileCleanup = `\\set ON_ERROR_STOP on\n\nbegin;\n\ndelete from moral_trade_private.person_accounts\nwhere profile_id in (\n  ${quotedIds}\n);\n\ndelete from public.profiles\nwhere id in (\n  ${quotedIds}\n);\n\ncommit;\n`;
let spec = replaceAll(specSource);
spec = spec.replace(
  'const SCREENSHOT_DIR = "test-results/mpgf-dac-product-lifecycle";',
  'const SCREENSHOT_DIR = process.env.I782_SCREENSHOT_DIR ?? "test-results/mpgf-dac-product-lifecycle";',
);

const collisionSql = `\\set ON_ERROR_STOP on\n\\pset tuples_only on\n\\pset format unaligned\nselect json_build_object(\n  'authEmails', (select count(*) from auth.users where email in (${Object.values(auth.users).map((entry) => `'${entry.email}'`).join(", ")})),\n  'authIds', (select count(*) from auth.users where id in (${Object.values(auth.users).map((entry) => `'${entry.id}'`).join(", ")})),\n  'profiles', (select count(*) from public.profiles where id in (${Object.values(auth.users).map((entry) => `'${entry.id}'`).join(", ")})),\n  'proposals', (select count(*) from public.mpgf_pool_proposals where id in ('${next.proposalOpen}','${next.proposalSuccess}','${next.proposalLapse}')),\n  'campaigns', (select count(*) from public.mpgf_public_goods_campaigns where id in ('${campaign(next.proposalOpen)}','${campaign(next.proposalSuccess)}','${campaign(next.proposalLapse)}')),\n  'submissions', (select count(*) from public.moral_trade_create_submissions where id in ('${next.submissionOpen}','${next.submissionSuccess}','${next.submissionLapse}')),\n  'matchPools', (select count(*) from public.mpgf_public_goods_match_pools where id='${next.matchPool}'),\n  'rounds', (select count(*) from public.mpgf_public_goods_rounds where id='${next.round}')\n);\n`;

const zeroSql = `\\set ON_ERROR_STOP on\n\\pset tuples_only on\n\\pset format unaligned\nselect json_build_object(\n  'profiles', (select count(*) from public.profiles where id in (${Object.values(auth.users).map((entry) => `'${entry.id}'`).join(", ")})),\n  'personAccounts', (select count(*) from moral_trade_private.person_accounts where profile_id in (${Object.values(auth.users).map((entry) => `'${entry.id}'`).join(", ")})),\n  'proposals', (select count(*) from public.mpgf_pool_proposals where id in ('${next.proposalOpen}','${next.proposalSuccess}','${next.proposalLapse}')),\n  'campaigns', (select count(*) from public.mpgf_public_goods_campaigns where id in ('${campaign(next.proposalOpen)}','${campaign(next.proposalSuccess)}','${campaign(next.proposalLapse}')),\n  'pledges', (select count(*) from public.mpgf_public_goods_pledges where campaign_id in ('${campaign(next.proposalOpen)}','${campaign(next.proposalSuccess)}','${campaign(next.proposalLapse)}')),\n  'paymentReferences', (select count(*) from public.mpgf_public_goods_pledges where payment_intent_ref is not null or status='captured')\n);\n`;

const files = {
  fixture: join(stateDir, "fixture.sql"),
  appCleanup: join(stateDir, "app-cleanup.sql"),
  profileCleanup: join(stateDir, "profile-cleanup.sql"),
  collision: join(stateDir, "collision.sql"),
  zero: join(stateDir, "zero.sql"),
  spec: join(sourceRoot, "tests/issue782-runtime-dac.spec.ts"),
};
save(files.fixture, fixture);
save(files.appCleanup, appCleanup);
save(files.profileCleanup, profileCleanup);
save(files.collision, collisionSql);
save(files.zero, zeroSql);
save(files.spec, spec);

for (const stale of [...replacements.keys()]) {
  if (fixture.includes(stale) || appCleanup.includes(stale) || spec.includes(stale)) {
    throw new Error(`A fixed cross-run token remains after transformation: ${stale}`);
  }
}
const evidence = {
  schemaVersion: 1,
  namespaceHandle: planned.namespaceHandle,
  sourceFixtureSha256Required: true,
  authInsertionRemoved: !fixture.includes("insert into auth.users") && !fixture.includes("insert into auth.identities"),
  fixedTokenCountReplaced: replacements.size,
  exactAppCleanup: true,
  exactProfileCleanup: true,
  generatedAt: new Date().toISOString(),
};
save(join(stateDir, "transform-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ...evidence, files }));
