import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const core = readFileSync("src/lib/direct-donation-upgrade.ts", "utf8");
const actions = readFileSync("src/app/direct-donation-upgrade-actions.ts", "utf8");
const dataLoader = readFileSync(
  "src/lib/direct-donation-upgrade-data.ts",
  "utf8",
);
const createPage = readFileSync(
  "src/app/trades/new/direct-donation-upgrade-create.tsx",
  "utf8",
);
const detailPage = readFileSync(
  "src/app/donation-upgrades/[offerId]/page.tsx",
  "utf8",
);
const webhookRoute = readFileSync("src/app/api/connectors/every-org/[secret]/route.ts", "utf8");
const directWebhook = readFileSync(
  "src/lib/direct-donation-upgrade-webhook.ts",
  "utf8",
);
const lifecycleRoute = readFileSync("src/app/api/jobs/donation-upgrades/route.ts", "utf8");
const baseMigration = readFileSync(
  "supabase/migrations/20260801050000_direct_verified_donation_upgrades.sql",
  "utf8",
);
const negotiationMigration = readFileSync(
  "supabase/migrations/20260813150000_direct_donation_upgrade_partial_redirect_negotiation.sql",
  "utf8",
);
const lifecycleMigration = readFileSync(
  "supabase/migrations/20260813151000_direct_donation_upgrade_partial_redirect_lifecycle.sql",
  "utf8",
);
const hardeningMigration = readFileSync(
  "supabase/migrations/20260813152000_direct_donation_upgrade_partial_redirect_hardening.sql",
  "utf8",
);
const vercelConfig = readFileSync("scripts/vercel-project-config.mjs", "utf8");
const renderedQaWorkflow = readFileSync(
  ".github/workflows/direct-donation-upgrade-rendered-qa.yml",
  "utf8",
);

test("rendered QA can inspect the commitment form without loading service-role data", () => {
  assert.match(createPage, /directDonationUpgradeRenderedQaNoServiceDataEnabled/);
  assert.match(createPage, /config\.environment && !renderedQaNoServiceData/);
  assert.match(
    dataLoader,
    /DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE[\s\S]*DIRECT_DONATION_UPGRADE_QA_FIXTURES[\s\S]*VERCEL_ENV[\s\S]*input\.environment === "staging"[\s\S]*input\.viewerId === DIRECT_DONATION_UPGRADE_RENDERED_QA_VIEWER_ID/,
  );
  assert.match(
    renderedQaWorkflow,
    /DIRECT_DONATION_UPGRADE_RENDERED_QA_NO_SERVICE_ROLE: "true"/,
  );
  assert.match(
    renderedQaWorkflow,
    /HARDENING_MIGRATION: supabase\/migrations\/20260813152000_direct_donation_upgrade_partial_redirect_hardening\.sql/,
  );
  assert.doesNotMatch(renderedQaWorkflow, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
});

test("the direct Donation Upgrade rail never imports or invokes Stripe", () => {
  for (const source of [core, actions, createPage, lifecycleRoute]) {
    assert.doesNotMatch(source, /@\/lib\/stripe|stripe\.checkout|payment_intent|setup_intent/i);
  }
  assert.match(createPage, /Commit and publish/);
  assert.doesNotMatch(createPage, /Authorize and publish/);
});

test("publication freezes baseline, environment, both recipient identities, and the terms hash", () => {
  assert.match(actions, /fetchEveryOrgNonprofitIdentity/);
  assert.match(actions, /sameEveryOrgNonprofit/);
  assert.match(actions, /p_baseline_attestation: attestation/);
  assert.match(core, /baselineAttestationHash/);
  assert.match(baseMigration, /original_recipient_hash text not null/);
  assert.match(baseMigration, /upgraded_recipient_hash text not null/);
  assert.match(
    baseMigration,
    /check \(original_recipient_hash <> upgraded_recipient_hash\)/,
  );
  assert.match(
    negotiationMigration,
    /create or replace function public\.direct_donation_upgrade_terms_hash_v2\(/,
  );
});

test("published offers, candidates, and obligations have database-level immutable identity guards", () => {
  assert.match(
    lifecycleMigration,
    /create or replace function public\.direct_donation_upgrade_guard_offer_terms\(\)/,
  );
  assert.match(
    baseMigration,
    /create trigger direct_donation_upgrade_offer_terms_immutable/,
  );
  assert.match(
    lifecycleMigration,
    /Published Donation Upgrade terms and baseline are immutable/,
  );
  assert.match(
    baseMigration,
    /create or replace function public\.direct_donation_upgrade_guard_candidate_identity\(\)/,
  );
  assert.match(
    baseMigration,
    /Donation Upgrade matcher identity and commitment are immutable/,
  );
  assert.match(
    lifecycleMigration,
    /create or replace function public\.direct_donation_upgrade_guard_obligation_terms\(\)/,
  );
  assert.match(
    lifecycleMigration,
    /Direct Donation Upgrade obligation terms are immutable/,
  );
  assert.match(
    negotiationMigration,
    /create trigger direct_donation_upgrade_proposal_terms_immutable/,
  );
});

test("webhook verification is the only completion authority and exact replays are idempotent", () => {
  assert.match(webhookRoute, /handleDirectDonationUpgradeEveryOrgWebhook/);
  assert.match(webhookRoute, /directResult\.handled/);
  assert.match(
    lifecycleMigration,
    /create or replace function public\.complete_direct_donation_upgrade_obligation\(/,
  );
  assert.match(lifecycleMigration, /outcome', 'already_verified'/);
  assert.match(lifecycleMigration, /altered_replay/);
  assert.match(createPage, /Browser returns, screenshots, and self-attestation do not complete/);
});

test("every environment-owned mutation carries the exact runtime environment into SQL", () => {
  const actionRpcNames = [
    "join_direct_donation_upgrade_offer",
    "propose_direct_donation_upgrade_terms",
    "withdraw_direct_donation_upgrade_proposal",
    "reject_direct_donation_upgrade_proposal",
    "accept_direct_donation_upgrade_proposal",
    "withdraw_direct_donation_upgrade_backup",
    "cancel_direct_donation_upgrade_offer",
    "start_direct_donation_upgrade_checkout",
  ];

  for (const [index, name] of actionRpcNames.entries()) {
    const start = actions.indexOf(`"${name}"`);
    const nextName = actionRpcNames[index + 1];
    const end = nextName ? actions.indexOf(`"${nextName}"`, start + 1) : actions.length;
    assert.ok(start >= 0, `${name} must be called by the app`);
    assert.match(
      actions.slice(start, end),
      /p_expected_environment: config\.environment/,
      `${name} must bind the configured environment`,
    );
  }

  assert.match(
    actions,
    /"create_direct_donation_upgrade_offer",[\s\S]*?p_environment: config\.environment/,
  );
  assert.match(
    directWebhook,
    /"complete_direct_donation_upgrade_obligation",[\s\S]*?p_expected_environment: input\.config\.environment/,
  );
  assert.match(
    lifecycleRoute,
    /"run_direct_donation_upgrade_lifecycle",[\s\S]*?p_expected_environment: config\.environment/,
  );
});

test("server actions expose only allowlisted public failures", () => {
  assert.match(actions, /class PublicDonationUpgradeError extends Error/);
  assert.match(actions, /error instanceof PublicDonationUpgradeError/);
  assert.doesNotMatch(actions, /error\?\.message|throw new Error\(error\.message\)/);
});

test("server actions preserve login and framework redirects across their error boundary", () => {
  assert.match(
    actions,
    /String\(error\.digest\)\.startsWith\("NEXT_REDIRECT"\)/,
  );
  assert.equal(
    actions.match(/rethrowFrameworkNavigation\(error\);/g)?.length,
    9,
  );
});

test("provider charge allocation is serialized before the unique-charge reuse check", () => {
  assert.match(
    baseMigration,
    /pg_advisory_xact_lock\([\s\S]*hashtextextended\(lower\(p_provider_charge_id_hash\), 0\)/,
  );
  assert.match(
    baseMigration,
    /where provider_charge_id_hash = lower\(p_provider_charge_id_hash\)/,
  );
  assert.match(
    baseMigration,
    /Valid provider charge and payload hashes are required/,
  );
});

test("additive hardening reserves zero retained cents for an exact 100% redirect", () => {
  assert.match(
    hardeningMigration,
    /\(p_redirect_basis_points = 10000\) is distinct from \(p_retained_amount_cents = 0\)/,
  );
  assert.match(
    hardeningMigration,
    /\(\(redirect_basis_points = 10000\) = \(retained_amount_cents = 0\)\)/,
  );
  assert.match(
    hardeningMigration,
    /split amounts must remain stored generated columns/,
  );
});

test("additive creator wrapper preserves exact attestation hash-to-text identity", () => {
  assert.match(
    hardeningMigration,
    /rename to direct_donation_upgrade_create_offer_20260813/,
  );
  assert.match(
    hardeningMigration,
    /char_length\(trim\(coalesce\(p_baseline_attestation, ''\)\)\) > 2000/,
  );
  assert.match(
    hardeningMigration,
    /return public\.direct_donation_upgrade_create_offer_20260813\(/,
  );
});

test("commitment eligibility is rechecked under the same lock used by defaults", () => {
  assert.match(
    hardeningMigration,
    /create or replace function public\.direct_donation_upgrade_lock_profile_eligibility/,
  );
  assert.match(
    hardeningMigration,
    /direct_donation_upgrade_default:' \|\| p_profile_id::text/,
  );
  assert.match(
    hardeningMigration,
    /before insert or update of status on public\.direct_donation_upgrade_candidates/,
  );
  assert.match(
    hardeningMigration,
    /public\.direct_donation_upgrade_temporarily_restricted\(profile_id_value\)/,
  );
});

test("lifecycle profile locking is globally serialized before offer processing", () => {
  const workerLock = hardeningMigration.indexOf(
    "moraltrade:direct-donation-upgrade-lifecycle-worker",
  );
  const delegate = hardeningMigration.indexOf(
    "return public.direct_donation_upgrade_run_lifecycle_20260813(",
  );
  assert.ok(workerLock >= 0, "the global lifecycle worker lock must exist");
  assert.ok(delegate > workerLock, "the lifecycle must lock before delegating");
});

test("commitments share the lifecycle gate before taking any offer lock", () => {
  const wrapperDelegates = [
    "return public.direct_donation_upgrade_create_offer_20260813(",
    "return public.direct_donation_upgrade_join_offer_20260813(",
    "return public.direct_donation_upgrade_propose_terms_20260813(",
    "return public.direct_donation_upgrade_accept_proposal_20260813(",
    "return public.direct_donation_upgrade_start_checkout_20260813(",
  ];
  for (const delegate of wrapperDelegates) {
    const delegateIndex = hardeningMigration.indexOf(delegate);
    const wrapperStart = hardeningMigration.lastIndexOf(
      "create or replace function public.",
      delegateIndex,
    );
    const wrapper = hardeningMigration.slice(wrapperStart, delegateIndex);
    assert.ok(delegateIndex > wrapperStart, `${delegate} wrapper must exist`);
    assert.match(
      wrapper,
      /pg_catalog\.pg_advisory_xact_lock_shared\([\s\S]*moraltrade:direct-donation-upgrade-lifecycle-worker/,
    );
  }
});

test("charge reuse locks all affected offers before any obligation row", () => {
  const completionStart = hardeningMigration.indexOf(
    "create or replace function public.complete_direct_donation_upgrade_obligation(",
  );
  const completion = hardeningMigration.slice(completionStart);
  const lifecycleExclusion = completion.indexOf(
    "moraltrade:direct-donation-upgrade-lifecycle-worker",
  );
  const chargeLock = completion.indexOf(
    "pg_catalog.hashtextextended(normalized_charge_hash, 0)",
  );
  const canonicalOfferLocks = completion.indexOf("order by affected_offer.id");
  const obligationLock = completion.indexOf("select * into obligation_row");
  assert.ok(
    lifecycleExclusion >= 0,
    "completion must exclude the lifecycle worker before row locking",
  );
  assert.ok(
    chargeLock > lifecycleExclusion,
    "the global lifecycle lock must precede the charge allocation lock",
  );
  assert.ok(
    canonicalOfferLocks > chargeLock,
    "affected offers must be locked after stabilizing the charge allocation",
  );
  assert.ok(
    obligationLock > canonicalOfferLocks,
    "all affected offers must be locked before the current obligation",
  );
});

test("provider charge reuse invalidates affected completed offers", () => {
  assert.match(
    hardeningMigration,
    /completion_result->>'reason' = 'provider_charge_reused'/,
  );
  assert.match(
    hardeningMigration,
    /update public\.direct_donation_upgrade_offers affected_offer[\s\S]*failure_code = 'provider_charge_reused'/,
  );
  assert.doesNotMatch(
    hardeningMigration.slice(
      hardeningMigration.indexOf("if completion_result->>'reason' = 'provider_charge_reused'"),
      hardeningMigration.indexOf("return completion_result"),
    ),
    /status <> 'completed'/,
  );
});

test("the matcher-first lifecycle edge preserves a fulfilled matcher when the creator defaults", () => {
  assert.match(
    lifecycleMigration,
    /where id = offer_row\.winning_candidate_id\s+and status in \('primary', 'promoted', 'fulfilled'\)/,
  );
  assert.match(
    lifecycleMigration,
    /if matcher_obligation\.status = 'verified' then\s+update public\.direct_donation_upgrade_candidates\s+set status = 'fulfilled'/,
  );
  assert.match(
    lifecycleMigration,
    /set status = 'defaulted',\s+defaulted_at = p_now,\s+failure_code = 'creator_matched_default'/,
  );
});

test("backup promotion, reminders, defaults, and temporary restrictions are explicit", () => {
  assert.match(lifecycleMigration, /status = 'backup'/);
  assert.match(
    lifecycleMigration,
    /set status = 'promoted',\s+promoted_at = p_now/,
  );
  assert.match(lifecycleMigration, /reminder_72h_sent_at/);
  assert.match(lifecycleMigration, /reminder_24h_sent_at/);
  assert.match(lifecycleMigration, /direct_donation_upgrade_default/);
  assert.match(lifecycleMigration, /p_now \+ interval '7 days'/);
});

test("the lifecycle handler exists without adding a production Vercel cron", () => {
  assert.match(lifecycleRoute, /export async function GET\(request: Request\)/);
  assert.match(lifecycleRoute, /isCronRequestAuthorized\(request\)/);
  assert.match(lifecycleRoute, /run_direct_donation_upgrade_lifecycle/);
  assert.doesNotMatch(vercelConfig, /\/api\/jobs\/donation-upgrades/);
});

test("public privacy reveals identities only when public or completed", () => {
  assert.match(
    negotiationMigration,
    /offer\.privacy_mode = 'public' or offer\.status = 'completed'/,
  );
  assert.match(
    negotiationMigration,
    /else null\s+end as creator_display_name/,
  );
  assert.match(
    negotiationMigration,
    /else null\s+end as matcher_display_name/,
  );
});

test("impact accounting separates gross, net, incremental, and redirected amounts", () => {
  assert.match(negotiationMigration, /verified_gross_amount_cents/);
  assert.match(negotiationMigration, /verified_net_amount_cents/);
  assert.match(negotiationMigration, /incremental_net_amount_cents/);
  assert.match(negotiationMigration, /redirected_net_amount_cents/);
  assert.match(
    createPage,
    /The\s+creator’s\s+original\s+amount\s+is\s+not\s+counted\s+as\s+incremental\s+impact/,
  );
  assert.match(
    detailPage,
    /retained\s+original-recipient\s+leg\s+remains\s+verified\s+gross\s+and\s+net\s+but\s+receives\s+neither\s+incremental\s+nor\s+redirected\s+impact\s+credit/,
  );
  assert.match(
    detailPage,
    /matcher’s\s+verified\s+net\s+amount\s+is\s+incremental/,
  );
});

test("all mutating RPCs are revoked from users and granted only to service_role", () => {
  const normalizedNegotiation = negotiationMigration.replace(/\s+/g, " ");
  const normalizedLifecycle = lifecycleMigration.replace(/\s+/g, " ");
  const normalizedAdditiveMigrations = `${negotiationMigration} ${lifecycleMigration} ${hardeningMigration}`.replace(
    /\s+/g,
    " ",
  );
  const environmentBoundSignatures = [
    "create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)",
    "join_direct_donation_upgrade_offer(uuid, uuid, text, text)",
    "propose_direct_donation_upgrade_terms(uuid, uuid, integer, integer, integer, integer, text, text, text)",
    "withdraw_direct_donation_upgrade_proposal(uuid, uuid, text)",
    "reject_direct_donation_upgrade_proposal(uuid, uuid, text, text)",
    "accept_direct_donation_upgrade_proposal(uuid, uuid, text, text)",
    "cancel_direct_donation_upgrade_offer(uuid, uuid, text)",
    "withdraw_direct_donation_upgrade_backup(uuid, uuid, text)",
    "start_direct_donation_upgrade_checkout(uuid, uuid, text)",
    "complete_direct_donation_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)",
    "run_direct_donation_upgrade_lifecycle(timestamptz, text)",
  ];
  for (const signature of environmentBoundSignatures) {
    assert.ok(
      normalizedAdditiveMigrations.includes(
        `revoke execute on function public.${signature} from public, anon, authenticated, service_role;`,
      ),
      `${signature} must be revoked before its least-privilege grant`,
    );
    assert.ok(
      normalizedAdditiveMigrations.includes(
        `grant execute on function public.${signature} to service_role;`,
      ),
      `${signature} must be service-role-only`,
    );
  }

  const environmentUnboundSignatures = [
    "create_direct_donation_upgrade_offer(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text)",
    "join_direct_donation_upgrade_offer(uuid, uuid, text)",
    "withdraw_direct_donation_upgrade_backup(uuid, uuid)",
    "cancel_direct_donation_upgrade_offer(uuid, uuid)",
    "start_direct_donation_upgrade_checkout(uuid, uuid)",
    "run_direct_donation_upgrade_lifecycle(timestamptz)",
  ];
  for (const signature of environmentUnboundSignatures) {
    assert.ok(
      normalizedLifecycle.includes(
        `revoke execute on function public.${signature} from public, anon, authenticated, service_role;`,
      ),
      `${signature} must not remain callable through PostgREST`,
    );
  }

  assert.match(
    baseMigration,
    /revoke all on public\.direct_donation_upgrade_obligations from anon, authenticated/,
  );
  assert.match(
    normalizedNegotiation,
    /revoke all on public\.direct_donation_upgrade_proposals from public, anon, authenticated, service_role;/,
  );
  assert.match(
    normalizedLifecycle,
    /revoke insert, update, delete, truncate on public\.direct_donation_upgrade_impact_credits from public, anon, authenticated, service_role;/,
  );
  assert.match(
    normalizedLifecycle,
    /grant select on public\.direct_donation_upgrade_impact_credits to service_role;/,
  );
  const normalizedHardening = hardeningMigration.replace(/\s+/g, " ");
  for (const signature of [
    "direct_donation_upgrade_lock_profile_eligibility(uuid)",
    "direct_donation_upgrade_guard_profile_eligibility()",
    "direct_donation_upgrade_record_default(uuid, uuid, uuid, uuid, integer)",
    "direct_donation_upgrade_create_offer_20260813(uuid, text, integer, integer, timestamptz, text, jsonb, jsonb, text, text, text, integer)",
    "direct_donation_upgrade_join_offer_20260813(uuid, uuid, text, text)",
    "direct_donation_upgrade_propose_terms_20260813(uuid, uuid, integer, integer, integer, integer, text, text, text)",
    "direct_donation_upgrade_accept_proposal_20260813(uuid, uuid, text, text)",
    "direct_donation_upgrade_start_checkout_20260813(uuid, uuid, text)",
    "direct_donation_upgrade_run_lifecycle_20260813(timestamptz, text)",
  ]) {
    assert.ok(
      normalizedHardening.includes(
        `revoke execute on function public.${signature} from public, anon, authenticated, service_role;`,
      ),
      `${signature} must remain internal even to service_role`,
    );
  }
});
