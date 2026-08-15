import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

const migration = source(
  "supabase/migrations/20260814150806_direct_spending_upgrade_subtype.sql",
);
const regression = source("supabase/tests/direct_spending_upgrade.sql");
const model = source("src/lib/direct-spending-upgrade.ts");
const actions = source("src/app/direct-spending-upgrade-actions.ts");
const createPage = source(
  "src/app/trades/new/direct-spending-upgrade-create.tsx",
);
const detailPage = source(
  "src/app/donation-upgrades/spending/[offerId]/page.tsx",
);
const directoryPage = source("src/app/donation-upgrades/page.tsx");
const adminPage = source("src/app/admin/donation-upgrades/page.tsx");
const webhook = source("src/lib/direct-spending-upgrade-webhook.ts");
const webhookRoute = source(
  "src/app/api/connectors/every-org/[secret]/route.ts",
);
const lifecycleRoute = source("src/app/api/jobs/donation-upgrades/route.ts");
const dataSource = source("src/lib/direct-spending-upgrade-data.ts");
const envExample = source(".env.example");
const qaWorkflow = source(
  ".github/workflows/direct-spending-upgrade-qa.yml",
);
const createInterface = source(
  "src/components/create/create-interface-frame.tsx",
);

test("Spending Upgrade is a separately disabled Donation Upgrade subtype", () => {
  assert.match(envExample, /^DIRECT_SPENDING_UPGRADES_ENABLED=false$/m);
  assert.match(envExample, /^DIRECT_SPENDING_UPGRADE_FINGERPRINT_SECRET=$/m);
  assert.match(model, /requestedEnabled[\s\S]*DIRECT_SPENDING_UPGRADES_ENABLED/);
  assert.match(
    createPage,
    /What was this money otherwise going to be used for\?[\s\S]*already going to donate this money[\s\S]*optional purchase or renewal/i,
  );
  assert.doesNotMatch(createInterface, /Spending Upgrade/);
  assert.match(
    createPage,
    /Donation Upgrade · Spending subtype/,
  );
  assert.match(
    directoryPage,
    /spendingConfig\.requestedEnabled[\s\S]*?No planned-donation upgrades are currently listed[\s\S]*?No Donation Upgrades are currently listed/,
  );
  assert.match(
    lifecycleRoute,
    /spendingConfig\.requestedEnabled[\s\S]*?spendingUpgrade: spendingResult[\s\S]*?: response/,
  );
});

test("versioned sibling storage never invents an original nonprofit", () => {
  for (const table of [
    "baselines",
    "offers",
    "candidates",
    "proposals",
    "evidence_records",
    "review_assignments",
    "review_decisions",
    "obligations",
    "impact_credits",
    "audit_events",
  ]) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.direct_spending_upgrade_${table}`),
    );
  }
  const offerTable = migration.match(
    /create table if not exists public\.direct_spending_upgrade_offers \([\s\S]*?\n\);/,
  )?.[0];
  assert.ok(offerTable);
  assert.doesNotMatch(offerTable, /original_recipient/);
  assert.match(offerTable, /upgraded_recipient jsonb not null/);
  assert.match(migration, /direct-spending-upgrade-terms-v1-2026-08-14/);
  assert.match(migration, /baselineSourceType', 'nonessential_spending'/);
  assert.doesNotMatch(actions, /original_recipient_identifier/);
});

test("unmatched and matched obligation semantics are exact and non-custodial", () => {
  assert.match(
    migration,
    /obligation_kind in \('creator_converted_spending', 'matcher_incremental'\)/,
  );
  assert.match(
    migration,
    /insert into public\.direct_spending_upgrade_obligations\([\s\S]*?values[\s\S]*?'creator_converted_spending'[\s\S]*?'matcher_incremental'/,
  );
  assert.match(
    migration,
    /before insert or update on public\.direct_spending_upgrade_obligations/,
  );
  assert.match(
    migration,
    /'direct-spending-upgrade:' \|\| new\.environment \|\| ':' \|\| new\.id::text/,
  );
  assert.match(
    migration,
    /obligation\.due_at is distinct from new\.fulfillment_deadline_at[\s\S]*obligation\.webhook_grace_ends_at is distinct from new\.webhook_grace_ends_at/,
  );
  assert.match(
    regression,
    /A Spending Upgrade obligation escaped frozen database terms/,
  );
  assert.match(
    migration,
    /Matched Spending Upgrade identity and deadlines are immutable/,
  );
  assert.match(
    regression,
    /A matched Spending Upgrade winner escaped frozen identity/,
  );
  assert.match(
    regression,
    /A matched Spending Upgrade returned to an unmatched state/,
  );
  assert.match(
    migration,
    /before insert on public\.direct_spending_upgrade_impact_credits[\s\S]*?direct_spending_upgrade_guard_credit/,
  );
  assert.match(
    regression,
    /A Spending Upgrade credit escaped its verified obligation identity/,
  );
  assert.match(
    migration,
    /'donationObligationCount', 2[\s\S]*?'spendingEvidenceRequired', true/,
  );
  assert.match(
    regression,
    /Matching did not create exactly the two direct same-recipient donations/,
  );
  assert.match(
    regression,
    /Unmatched expiry created a donation obligation or impact credit/,
  );
  assert.match(
    regression,
    /An unmatched Spending Upgrade was manually marked completed/,
  );
  assert.match(
    createPage,
    /never receives, combines, splits, transfers, or re-donates funds[\s\S]*never pays the creator/i,
  );
  assert.doesNotMatch(
    `${actions}\n${model}\n${createPage}\n${detailPage}`,
    /@\/lib\/stripe|stripe\.checkout|payment_intent|setup_intent/,
  );
});

test("provider donation truth and private spending review remain separate", () => {
  assert.match(webhook, /evaluateDirectDonationUpgradeWebhook/);
  assert.match(webhook, /complete_direct_spending_upgrade_obligation/);
  assert.match(webhookRoute, /handleDirectSpendingUpgradeEveryOrgWebhook/);
  assert.match(
    migration,
    /offer_row\.spending_change_review_status = 'accepted'[\s\S]*obligation_row\.status = 'verified'/,
  );
  assert.match(
    migration,
    /credit_kind = 'converted_spending'[\s\S]*evidence_decision_id is not null/,
  );
  assert.match(
    migration,
    /credit_kind = 'matcher_incremental'[\s\S]*evidence_decision_id is null/,
  );
  assert.match(
    regression,
    /Creator donation verification incorrectly proved converted spending/,
  );
  assert.match(
    regression,
    /Rejected spending evidence altered separated credit accounting/,
  );
  assert.match(
    regression,
    /Unavailable spending review minted creator credit or completion/,
  );
  assert.match(
    migration,
    /if obligation_row\.status = 'verified'[\s\S]*?update public\.direct_spending_upgrade_obligations[\s\S]*?status = 'needs_review'[\s\S]*?failure_code = 'altered_replay'/,
  );
  assert.match(
    regression,
    /An altered webhook replay left stale causal credit visible/,
  );
  assert.match(
    migration,
    /credited_provider_identity_changed[\s\S]*append-only impact credit/,
  );
  assert.match(
    regression,
    /A changed provider identity replaced append-only causal credit/,
  );
  assert.match(
    regression,
    /Submitting unreviewed spending evidence minted credit or masked provider review/,
  );
  assert.match(
    regression,
    /An exact pre-credit webhook did not clear only the provider review state/,
  );
});

test("commitment transitions take the lifecycle lock before offer row locks", () => {
  const acceptFunction = migration.match(
    /create or replace function public\.accept_direct_spending_upgrade_proposal[\s\S]*?create or replace function public\.submit_direct_spending_upgrade_change_evidence/,
  )?.[0];
  assert.ok(acceptFunction);
  const lifecycleLock = acceptFunction.indexOf(
    "pg_advisory_xact_lock_shared",
  );
  const offerLock = acceptFunction.indexOf("for update");
  assert.ok(lifecycleLock >= 0 && offerLock > lifecycleLock);
});

test("review authority is explicit, scoped, conflicted out, and not an admin shortcut", () => {
  assert.match(
    migration,
    /direct-spending-upgrade-assigned-reviewer-v1-2026-08-14/,
  );
  assert.match(
    migration,
    /A creator cannot review their own Spending Upgrade evidence/,
  );
  assert.match(
    migration,
    /A Spending Upgrade counterparty cannot review evidence for the same baseline/,
  );
  assert.match(
    migration,
    /An assigned Spending Upgrade reviewer cannot become a counterparty for the same baseline/,
  );
  assert.match(
    regression,
    /A baseline reviewer was able to match as the counterparty/,
  );
  assert.match(
    regression,
    /A baseline reviewer was able to propose as the counterparty/,
  );
  assert.match(
    migration,
    /Accepted Spending Upgrade evidence requires an append-only correction process/,
  );
  assert.match(
    migration,
    /Only the explicitly assigned scoped reviewer may decide this evidence/,
  );
  assert.doesNotMatch(adminPage, /recordDirectSpendingUpgradeReview|assignDirectSpendingUpgradeReviewer/);
  assert.match(adminPage, /read only[\s\S]*no accept or reject controls/i);
  assert.match(
    detailPage,
    /does not substitute an ordinary administrator[\s\S]*claim independent verification/i,
  );
});

test("safety exclusions exist at client, server, and database boundaries", () => {
  for (const fragment of [
    "food_nutrition_or_hydration",
    "medical_mental_dental_reproductive_or_disability",
    "housing_utilities_or_essential_household_goods",
    "essential_transport_or_mobility",
    "insurance",
    "required_education_or_work",
    "debt_taxes_fines_legal_or_support_obligations",
    "child_elder_dependent_or_pet_care",
    "personal_or_household_safety",
    "bnpl_credit_cash_advance_payday_or_new_debt",
    "substantial_harm_risk",
  ]) {
    assert.match(model, new RegExp(fragment));
  }
  assert.match(actions, /rejectBlockedDirectSpendingUpgradeCategory/);
  assert.match(actions, /excluded_categories_confirmed/);
  assert.match(
    migration,
    /category in \([\s\S]*?'recurring_subscription'[\s\S]*?'cancellable_reservation_or_service'[\s\S]*?'pending_order_or_upgrade'/,
  );
  assert.doesNotMatch(
    migration,
    /planned_action in \([^)]*'return'/,
  );
  assert.doesNotMatch(createPage, /option value="return"/);
  assert.match(createPage, /BNPL[\s\S]*cash advance[\s\S]*payday loan/i);
  assert.doesNotMatch(
    `${createPage}\n${detailPage}\n${directoryPage}`,
    /skip a meal|save a life by|sacrifice leaderboard|sacrifice streak|shame prompt/i,
  );
});

test("private evidence is absent from projections and ordinary role privileges", () => {
  const view = migration.match(
    /create or replace view public\.direct_spending_upgrade_public_offers[\s\S]*?alter table public\.direct_spending_upgrade_baselines enable row level security;/,
  )?.[0];
  assert.ok(view);
  for (const forbidden of [
    "private_merchant_label",
    "private_description",
    "evidence_payload",
    "private_payload",
    "baseline_fingerprint",
    "private_notes",
    "partner_donation_id",
    "provider_charge_id_hash",
    "provider_payload_hash",
  ]) {
    assert.doesNotMatch(view, new RegExp(`offer\\.${forbidden}|baseline\\.${forbidden}`));
  }
  assert.match(
    migration,
    /revoke all on public\.direct_spending_upgrade_baselines[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    migration,
    /grant execute on function public\.create_direct_spending_upgrade_offer[\s\S]*to service_role/,
  );
  assert.match(regression, /Spending Upgrade RLS or service-only privilege boundary is invalid/);
  assert.doesNotMatch(
    dataSource,
    /\.from\("direct_spending_upgrade_obligations"\)\s*\.select\("\*"\)/,
  );
  assert.doesNotMatch(
    dataSource,
    /provider_charge_id_hash|provider_payload_hash|partner_donation_id/,
  );
});

test("participant-private reads are environment scoped and require real participation", () => {
  assert.equal(
    dataSource.match(
      /offer_scope:direct_spending_upgrade_offers!offer_id!inner\(\)/g,
    )?.length,
    2,
  );
  assert.equal(
    dataSource.match(/\.eq\("offer_scope\.environment", input\.environment\)/g)
      ?.length,
    2,
  );
  assert.match(
    dataSource,
    /\.eq\("profile_id", input\.viewerId\)[\s\S]*?\.in\("status", \["primary", "fulfilled"\]\)/,
  );
  assert.match(
    dataSource,
    /isCreator \|\| ownCandidates\.length \|\| ownObligations\.length/,
  );
  assert.doesNotMatch(
    dataSource,
    /isCreator \|\| ownCandidates\.length \|\| ownProposals\.length/,
  );
});

test("SQL regression is exactly rollback-only and covers idempotency", () => {
  assert.equal((regression.match(/^begin;$/gm) ?? []).length, 1);
  assert.equal((regression.match(/^rollback;$/gm) ?? []).length, 1);
  assert.match(regression, /Exact webhook replay was not idempotent/);
  assert.match(regression, /duplicate private baseline fingerprint/);
  assert.match(regression, /Published Spending Upgrade terms were mutable/);
  assert.match(regression, /unassigned reviewer was able/);
  assert.match(regression, /More than one active Spending Upgrade evidence record was accepted/);
  assert.match(regression, /Accepted causal evidence was replaced without an append-only correction/);
  assert.match(regression, /insert into auth\.users/);
  assert.equal(
    qaWorkflow.match(/from auth\.users/g)?.length,
    2,
  );
  assert.match(qaWorkflow, /spending-upgrade-qa-auth-user-precount\.txt/);
});
