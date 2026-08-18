import assert from "node:assert/strict";

export const PR700_HEAD = "813573f64eaa17d2ca240c50f76ead9a3b535f97";
export const PRODUCT_REPAIR_HEAD = "495f714b6dd4753ad78cf3d41945cffc84923876";
export const QA_PROJECT_REF = "hvmxfjjbdcgjjudmthdz";
export const AUTHENTICATED_CONFIRMATION_MIGRATION =
  "supabase/migrations/20260817113000_authenticate_trade_donation_confirmation_caller.sql";
export const CONFIRMATION_SIGNATURE =
  "confirm_trade_donation_version_v2(uuid,uuid,uuid)";

export const INTEGRATION_PATHS = [
  ".github/scripts/pooled-settlement-authenticated-caller-integration-contract.mjs",
  ".github/scripts/pooled-settlement-authenticated-caller-integration.mjs",
  ".github/scripts/pooled-settlement-authenticated-caller-integration.test.mjs",
  ".github/workflows/pooled-settlement-authenticated-caller-integration-20260817.yml",
  "src/app/trade-donation-actions-base.ts",
  "src/lib/moral-trade/trade-donation-confirmation-authenticated-caller.test.ts",
  AUTHENTICATED_CONFIRMATION_MIGRATION,
];

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  assert.ok(first >= 0, `${label}: expected source contract was not found.`);
  assert.equal(
    source.indexOf(before, first + before.length),
    -1,
    `${label}: expected source contract was not unique.`,
  );
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function buildAuthenticatedHarnessSource(input) {
  let source = String(input);

  source = replaceExactly(
    source,
    "let databaseContract = null;",
    "let databaseContract = null;\nlet confirmationBoundaryProbed = false;",
    "authorization probe state",
  );

  const qaEmailBlock = [
    "function qaEmail(role) {",
    '  return `pooled-qa-${runId}-${role}@example.test`.toLowerCase();',
    "}",
  ].join("\n");
  const qaIdentityBlock = [
    qaEmailBlock,
    "",
    "function qaUsername(role) {",
    '  return "pq-" + sha256(runId + ":" + role).slice(0, 20);',
    "}",
  ].join("\n");
  source = replaceExactly(
    source,
    qaEmailBlock,
    qaIdentityBlock,
    "run-owned profile username helper",
  );

  source = replaceExactly(
    source,
    [
      '    await admin.from("profiles").upsert({',
      "      id: user.id,",
      "      email,",
      "      display_name: displayName,",
    ].join("\n"),
    [
      '    await admin.from("profiles").upsert({',
      "      id: user.id,",
      "      email,",
      "      username: qaUsername(role),",
      "      display_name: displayName,",
    ].join("\n"),
    "run-owned profile username persistence",
  );

  source = replaceExactly(
    source,
    '  const stage = page.locator("main");',
    '  const stage = page.locator("#main-content");',
    "canonical participant content root",
  );

  source = replaceExactly(
    source,
    [
      "delete from public.trade_evidence_items where agreement_id = any(${agreementIds});",
      "delete from public.trade_agreement_confirmations where agreement_version_id in (",
    ].join("\n"),
    [
      "delete from public.trade_evidence_items where agreement_id = any(${agreementIds});",
      "delete from public.trade_agreement_milestones where agreement_id = any(${agreementIds});",
      "delete from public.trade_agreement_confirmations where agreement_version_id in (",
    ].join("\n"),
    "run-owned milestone cleanup",
  );

  const helperMarker = "async function establishAal2(user) {";
  const helpers = [
    "async function participantAuthenticatedClient(user) {",
    "  const client = createClient(supabaseUrl, publishableKey, {",
    "    auth: { autoRefreshToken: false, persistSession: false },",
    "  });",
    "  unwrap(",
    "    await client.auth.signInWithPassword({ email: user.email, password }),",
    '    user.role + " participant sign-in",',
    "  );",
    '  const identity = unwrap(await client.auth.getUser(), user.role + " getUser");',
    '  assert.equal(identity.user?.id, user.id, user.role + " authenticated as the wrong user.");',
    "  return client;",
    "}",
    "",
    "function expectConfirmationFailure(result, label) {",
    '  assert.ok(result.error, label + " unexpectedly succeeded.");',
    "  assert.match(",
    "    result.error.message,",
    "    /permission denied|authenticated participant|authenticated profile|not authorized/i,",
    '    label + " failed for an unexpected reason: " + result.error.message,',
    "  );",
    "}",
    "",
    "async function probeConfirmationAuthorizationBoundary({ counterparty, payer, agreement, version }) {",
    "  const anonymous = createClient(supabaseUrl, publishableKey, {",
    "    auth: { autoRefreshToken: false, persistSession: false },",
    "  });",
    '  const unauthenticated = await anonymous.rpc("confirm_trade_donation_version_v2", {',
    "    p_actor_id: counterparty.id,",
    "    p_agreement_id: agreement.id,",
    "    p_agreement_version_id: version.id,",
    "  });",
    '  expectConfirmationFailure(unauthenticated, "Unauthenticated confirmation");',
    "",
    "  const counterpartyClient = await participantAuthenticatedClient(counterparty);",
    '  const mismatched = await counterpartyClient.rpc("confirm_trade_donation_version_v2", {',
    "    p_actor_id: payer.id,",
    "    p_agreement_id: agreement.id,",
    "    p_agreement_version_id: version.id,",
    "  });",
    '  expectConfirmationFailure(mismatched, "Actor-mismatched confirmation");',
    "",
    '  const serviceRole = await admin.rpc("confirm_trade_donation_version_v2", {',
    "    p_actor_id: counterparty.id,",
    "    p_agreement_id: agreement.id,",
    "    p_agreement_version_id: version.id,",
    "  });",
    '  expectConfirmationFailure(serviceRole, "Service-role confirmation");',
    "",
    '  record("Confirmation boundary rejects unauthenticated, mismatched, and service-role callers", "passed");',
    "}",
    "",
    "async function ensureFinalMilestoneManifest({ counterparty, payer, agreement, version, label }) {",
    "  const client = await participantAuthenticatedClient(counterparty);",
    "  const existing = unwrap(",
    "    await admin",
    '      .from("trade_agreement_milestones")',
    '      .select("id")',
    '      .eq("agreement_version_id", version.id)',
    '      .order("position", { ascending: true }),',
    '    "load milestone manifest " + label,',
    "  );",
    "  if ((existing ?? []).length === 0) {",
    "    const milestoneId = unwrap(",
    '      await client.rpc("create_trade_agreement_milestone_v1", {',
    "        p_agreement_version_id: version.id,",
    "        p_position: 1,",
    "        p_performer_id: counterparty.id,",
    "        p_payer_id: payer.id,",
    '        p_action_category: "service",',
    '        p_description: "Synthetic reciprocal action for " + label,',
    '        p_unit_label: "completed action",',
    "        p_units_total: 1,",
    "        p_indivisible: true,",
    "        p_maximum_amount_cents: 0,",
    '        p_currency: "USD",',
    '        p_evidence_rule: "Independent synthetic QA evidence required.",',
    "      }),",
    '      "create milestone manifest " + label,',
    "    );",
    '    assert.ok(milestoneId, "The synthetic milestone was not created.");',
    "  }",
    "  const completeTermsHash = unwrap(",
    '    await client.rpc("finalize_trade_milestone_manifest_v1", {',
    "      p_agreement_version_id: version.id,",
    "    }),",
    '    "finalize milestone manifest " + label,',
    "  );",
    "  assert.match(String(completeTermsHash), /^[0-9a-f]{64}$/);",
    '  const frozenVersion = await loadOne("trade_agreement_versions", version.id);',
    "  assert.equal(frozenVersion.requires_milestone_manifest, true);",
    "  assert.match(String(frozenVersion.milestone_manifest_hash), /^[0-9a-f]{64}$/);",
    "  assert.equal(String(frozenVersion.complete_terms_hash), String(completeTermsHash));",
    '  record("Canonical milestone manifest finalized before bilateral confirmation", "passed", {',
    "    agreementId: agreement.id,",
    "    agreementVersionId: version.id,",
    "  });",
    "}",
    "",
    "async function confirmAsAuthenticatedParticipant(actor, agreementId, agreementVersionId, label) {",
    "  const client = await participantAuthenticatedClient(actor);",
    "  return unwrap(",
    '    await client.rpc("confirm_trade_donation_version_v2", {',
    "      p_actor_id: actor.id,",
    "      p_agreement_id: agreementId,",
    "      p_agreement_version_id: agreementVersionId,",
    "    }),",
    '    "confirm " + label + " as " + actor.role,',
    "  );",
    "}",
    "",
    "",
  ].join("\n");
  source = replaceExactly(
    source,
    helperMarker,
    helpers + helperMarker,
    "authenticated participant helpers",
  );

  const serviceRoleLoop = [
    "  for (const actor of [counterparty, payer]) {",
    "    unwrap(",
    '      await admin.rpc("confirm_trade_donation_version_v2", {',
    "        p_actor_id: actor.id,",
    "        p_agreement_id: agreement.id,",
    "        p_agreement_version_id: version.id,",
    "      }),",
    "      `confirm ${label} as ${actor.role}` ,",
    "    );",
    "  }",
  ].join("\n").replace("` ,", "`,");
  const authenticatedLoop = [
    "  if (!confirmationBoundaryProbed) {",
    "    await probeConfirmationAuthorizationBoundary({ counterparty, payer, agreement, version });",
    "    confirmationBoundaryProbed = true;",
    "  }",
    "  await ensureFinalMilestoneManifest({ counterparty, payer, agreement, version, label });",
    "  for (const actor of [counterparty, payer]) {",
    "    await confirmAsAuthenticatedParticipant(actor, agreement.id, version.id, label);",
    "  }",
  ].join("\n");
  source = replaceExactly(
    source,
    serviceRoleLoop,
    authenticatedLoop,
    "bilateral participant confirmations",
  );

  const returnContract =
    "  return { migrations: versions, tables: tables.map(([name]) => name), functions };\n}";
  const authenticatedPrivilegeContract = [
    "  const confirmation = queryPostgres(`",
    "select p.prosecdef,",
    "       coalesce(array_to_string(p.proconfig, ','), ''),",
    "       has_function_privilege('anon', p.oid, 'EXECUTE'),",
    "       has_function_privilege('authenticated', p.oid, 'EXECUTE'),",
    "       has_function_privilege('service_role', p.oid, 'EXECUTE')",
    "from pg_proc p",
    "where p.oid = to_regprocedure('public.confirm_trade_donation_version_v2(uuid,uuid,uuid)');",
    '`).split("\\t");',
    "  assert.deepEqual(",
    "    confirmation,",
    '    ["t", "search_path=pg_catalog", "f", "t", "f"],',
    '    "confirm_trade_donation_version_v2(uuid,uuid,uuid)",',
    "  );",
    "  functions.push({",
    '    signature: "confirm_trade_donation_version_v2(uuid,uuid,uuid)",',
    "    securityDefiner: true,",
    '    searchPath: "pg_catalog",',
    "    anonymousExecute: false,",
    "    authenticatedExecute: true,",
    "    serviceRoleExecute: false,",
    "  });",
    "  return { migrations: versions, tables: tables.map(([name]) => name), functions };",
    "}",
  ].join("\n");
  source = replaceExactly(
    source,
    returnContract,
    authenticatedPrivilegeContract,
    "authenticated-only database privilege contract",
  );

  assert.doesNotMatch(
    source,
    /for \(const actor of \[counterparty, payer\]\) \{\s*unwrap\(\s*await admin\.rpc\("confirm_trade_donation_version_v2"/s,
  );
  assert.doesNotMatch(source, /const stage = page\.locator\("main"\)/);
  return source;
}
