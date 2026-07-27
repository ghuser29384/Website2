import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.INSTITUTIONAL_E2E_BASE_URL || "http://127.0.0.1:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.QA_TEST_PASSWORD;
const outputDir = process.env.INSTITUTIONAL_E2E_OUTPUT_DIR || "institutional-e2e-evidence";
const runId = String(process.env.GITHUB_RUN_ID || Date.now());
const zeroHash = "0".repeat(64);

for (const [name, value] of Object.entries({ supabaseUrl, serviceRoleKey, publishableKey, password })) {
  if (!value) throw new Error(`Missing ${name}.`);
}
if (password.length < 14) throw new Error("QA_TEST_PASSWORD must contain at least 14 characters.");
await mkdir(outputDir, { recursive: true });

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const createdUserIds = [];
const createdOrganizationIds = [];
const createdDealIds = [];
const audit = [];
const browserErrors = [];
let fixture;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function record(name, status, details = {}) {
  const entry = { name, status, at: new Date().toISOString(), ...details };
  audit.push(entry);
  console.log(`${status === "passed" ? "PASS" : "FAIL"}: ${name}`);
}

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "")) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error(`Invalid base32 character: ${character}`);
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totp(secret, at = Date.now()) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function freshTotp(secret) {
  const second = Math.floor(Date.now() / 1000) % 30;
  if (second >= 26) await sleep((31 - second) * 1000);
  return totp(secret);
}

function emailFor(role) {
  return `institutional-${runId}-${role}-${randomUUID().slice(0, 8)}@example.test`;
}

async function createUser(role, displayName) {
  const email = emailFor(role);
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (result.error || !result.data.user) throw result.error || new Error(`Could not create ${role}.`);
  const user = { id: result.data.user.id, email, displayName, role, mfa: null };
  createdUserIds.push(user.id);
  const profile = await admin.from("profiles").upsert({
    id: user.id,
    email,
    display_name: displayName,
    bio: `Synthetic institutional QA account for workflow ${runId}.`,
  });
  if (profile.error) throw profile.error;
  return user;
}

async function insertOne(table, values, select = "*") {
  const result = await admin.from(table).insert(values).select(select).single();
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.data;
}

async function expectDatabaseFailure(name, operation, pattern) {
  const result = await operation();
  assert.ok(result.error, `${name} unexpectedly succeeded.`);
  if (pattern) assert.match(result.error.message, pattern, result.error.message);
  record(name, "passed", { message: result.error.message });
}

async function expectRpcFailure(name, operation, pattern) {
  const result = await operation();
  assert.ok(result.error, `${name} unexpectedly succeeded.`);
  if (pattern) assert.match(result.error.message, pattern, result.error.message);
  assert.doesNotMatch(result.error.message, /AAL2 step-up authentication is required/i, `${name} stopped at AAL2 instead of the intended guard.`);
  record(name, "passed", { message: result.error.message });
}

async function makeAal2Client(user) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email: user.email, password });
  if (signIn.error) throw signIn.error;
  const enrollment = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Institutional QA ${user.role} ${runId}`,
    issuer: "Moral Trade QA",
  });
  if (enrollment.error || !enrollment.data?.id || !enrollment.data?.totp?.secret) {
    throw enrollment.error || new Error(`Could not enroll MFA for ${user.role}.`);
  }
  const factorId = enrollment.data.id;
  const secret = enrollment.data.totp.secret;
  const challenge = await client.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data?.id) throw challenge.error || new Error(`Could not challenge MFA for ${user.role}.`);
  const verification = await client.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: await freshTotp(secret),
  });
  if (verification.error) throw verification.error;
  const level = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level.error) throw level.error;
  assert.equal(level.data.currentLevel, "aal2", `${user.role} did not reach AAL2.`);
  user.mfa = { factorId, secret };
  record(`AAL2 established for ${user.role}`, "passed", { factorId });
  return client;
}

async function createFixture() {
  const lead = await createUser("lead", "QA Lead Approver");
  const finance = await createUser("finance", "QA Finance Representative");
  const named = await createUser("named", "QA Named Grantmaker");
  const verifier = await createUser("verifier", "QA Independent Verifier");
  const outsider = await createUser("outsider", "QA Outsider");
  const suffix = `${runId}-${randomUUID().slice(0, 6)}`.toLowerCase();

  const orgA = await insertOne("institutional_organizations", {
    created_by: lead.id,
    slug: `qa-institution-a-${suffix}`.slice(0, 80),
    display_name: `QA Institution A ${suffix}`,
    organization_type: "foundation",
    summary: "Synthetic institution A for exact-scope QA.",
    verification_status: "verified",
  });
  const orgB = await insertOne("institutional_organizations", {
    created_by: named.id,
    slug: `qa-institution-b-${suffix}`.slice(0, 80),
    display_name: `QA Institution B ${suffix}`,
    organization_type: "research_organization",
    summary: "Synthetic institution B for named-person QA.",
    verification_status: "verified",
  });
  createdOrganizationIds.push(orgA.id, orgB.id);

  const programA = await insertOne("institutional_programs", {
    organization_id: orgA.id,
    slug: "program-a",
    name: "Program A",
    summary: "Exact participating program A.",
    created_by: lead.id,
  });
  const wrongProgramA = await insertOne("institutional_programs", {
    organization_id: orgA.id,
    slug: "wrong-program-a",
    name: "Wrong Program A",
    summary: "A different program that must not inherit exact-scope authority.",
    created_by: lead.id,
  });
  const programB = await insertOne("institutional_programs", {
    organization_id: orgB.id,
    slug: "program-b",
    name: "Program B",
    summary: "Exact participating program B.",
    created_by: named.id,
  });

  for (const membership of [
    { organization_id: orgA.id, profile_id: lead.id, role: "owner" },
    { organization_id: orgA.id, profile_id: finance.id, role: "finance" },
    { organization_id: orgB.id, profile_id: named.id, role: "owner" },
    { organization_id: orgB.id, profile_id: finance.id, role: "finance" },
  ]) {
    await insertOne("institutional_memberships", {
      ...membership,
      permissions: [],
      status: "active",
      accepted_at: new Date().toISOString(),
    });
  }

  const leadGrant = await insertOne("institutional_authority_grants", {
    organization_id: orgA.id,
    program_id: programA.id,
    profile_id: lead.id,
    granted_by: lead.id,
    permissions: ["deal:manage", "deal:approve", "deal:sign", "pool:manage", "pool:approve", "pool:activate", "risk:review", "evidence:review", "completion:confirm"],
    amount_limit_cents: 5_000_000,
    currency: "usd",
    authority_basis: "Synthetic exact-scope QA authority.",
  });
  const financeGrantA = await insertOne("institutional_authority_grants", {
    organization_id: orgA.id,
    program_id: programA.id,
    profile_id: finance.id,
    granted_by: lead.id,
    permissions: ["finance:manage", "finance:reserve", "finance:release"],
    amount_limit_cents: 5_000_000,
    currency: "usd",
    authority_basis: "Synthetic independent finance authority for Program A.",
  });
  const namedGrant = await insertOne("institutional_authority_grants", {
    organization_id: orgB.id,
    program_id: programB.id,
    profile_id: named.id,
    granted_by: named.id,
    permissions: ["deal:manage", "deal:approve", "deal:sign", "pool:manage", "pool:approve", "pool:activate"],
    amount_limit_cents: 5_000_000,
    currency: "usd",
    authority_basis: "Synthetic counterparty exact-scope authority.",
  });
  const financeGrantB = await insertOne("institutional_authority_grants", {
    organization_id: orgB.id,
    program_id: programB.id,
    profile_id: finance.id,
    granted_by: named.id,
    permissions: ["finance:manage", "finance:reserve", "finance:release"],
    amount_limit_cents: 5_000_000,
    currency: "usd",
    authority_basis: "Synthetic independent finance authority for Program B.",
  });

  const deal = await insertOne("institutional_deals", {
    lead_organization_id: orgA.id,
    lead_program_id: programA.id,
    created_by: lead.id,
    title: `QA exact-term secondment ${suffix}`,
    summary: "Synthetic multi-party institutional trade.",
    deal_type: "institutional_secondment",
    classification: "pure_moral_trade",
    stage: "proposed",
    visibility: "parties_only",
  });
  createdDealIds.push(deal.id);
  const partyA = await insertOne("institutional_deal_parties", {
    deal_id: deal.id,
    organization_id: orgA.id,
    program_id: programA.id,
    party_role: "lead",
    representative_profile_id: lead.id,
    authority_status: "verified_for_scope",
    approval_status: "approved",
    consent_status: "not_required",
    joined_at: new Date().toISOString(),
  });
  const partyB = await insertOne("institutional_deal_parties", {
    deal_id: deal.id,
    organization_id: orgB.id,
    program_id: programB.id,
    party_role: "employer",
    representative_profile_id: named.id,
    authority_status: "verified_for_scope",
    approval_status: "approved",
    consent_status: "not_required",
    joined_at: new Date().toISOString(),
  });
  for (const member of [
    { profile_id: lead.id, party_id: partyA.id, organization_id: orgA.id, added_by: lead.id },
    { profile_id: named.id, party_id: partyB.id, organization_id: orgB.id, added_by: lead.id },
  ]) {
    await insertOne("institutional_deal_room_members", {
      deal_id: deal.id,
      access_scope: "all_parties",
      can_post: true,
      ...member,
    });
  }

  const proposal = await insertOne("institutional_proposal_versions", {
    deal_id: deal.id,
    version: 1,
    title: "Twelve-month grantmaker secondment",
    summary: "Named-person work exchanged for additional cause-linked funding.",
    terms: {
      consideration: { animal_welfare_funding_cents: 1_000_000 },
      service: { named_profile_id: named.id, role: "AI safety grantmaking", months: 12 },
      exact_scope: { organization_id: orgA.id, program_id: programA.id },
    },
    terms_hash: zeroHash,
    status: "draft",
    created_by: lead.id,
  });
  assert.match(proposal.terms_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(proposal.terms_hash, zeroHash);

  const alternateProposal = await insertOne("institutional_proposal_versions", {
    deal_id: deal.id,
    version: 2,
    title: "Alternative exact terms",
    summary: "Used only for cross-relation rejection tests.",
    terms: { alternative: true, months: 6 },
    terms_hash: zeroHash,
    status: "draft",
    created_by: lead.id,
  });

  const obligation = await insertOne("institutional_obligations", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligor_party_id: partyB.id,
    beneficiary_party_id: partyA.id,
    resource_type: "staff_secondment",
    title: "Named grantmaker secondment",
    description: "Twelve months of grantmaking work under the selected exact terms.",
    quantity: 12,
    unit: "months",
    individual_consent_required: true,
    individual_profile_id: named.id,
    created_by: lead.id,
  });
  const alternateObligation = await insertOne("institutional_obligations", {
    deal_id: deal.id,
    proposal_version_id: alternateProposal.id,
    obligor_party_id: partyA.id,
    beneficiary_party_id: partyB.id,
    resource_type: "research",
    title: "Alternative research obligation",
    created_by: lead.id,
  });
  const milestone = await insertOne("institutional_milestones", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligation_id: obligation.id,
    title: "Six-month exact-scope review",
    created_by: lead.id,
  });
  const evidenceRequirement = await insertOne("institutional_evidence_requirements", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligation_id: obligation.id,
    milestone_id: milestone.id,
    title: "Independent six-month review evidence",
    description: "Evidence must match the selected proposal, obligation, and milestone.",
    evidence_type: "attestation",
    visibility: "verifier_only",
    created_by: lead.id,
  });
  const verifierAssignment = await insertOne("institutional_verifier_assignments", {
    deal_id: deal.id,
    verifier_profile_id: verifier.id,
    scope: "Verify the named grantmaker milestone and evidence.",
    status: "invited",
    assigned_by: lead.id,
  });

  for (const approval of [
    {
      organization_id: orgA.id,
      program_id: programA.id,
      requested_from_profile_id: lead.id,
      requested_by: lead.id,
      authority_grant_id: leadGrant.id,
      decided_by: lead.id,
    },
    {
      organization_id: orgB.id,
      program_id: programB.id,
      requested_from_profile_id: named.id,
      requested_by: lead.id,
      authority_grant_id: namedGrant.id,
      decided_by: named.id,
    },
  ]) {
    await insertOne("institutional_approvals", {
      deal_id: deal.id,
      proposal_version_id: proposal.id,
      approval_kind: "program",
      required_role: "approver",
      decision: "approve",
      decision_note: "Synthetic exact-scope organizational approval; not individual consent.",
      decided_at: new Date().toISOString(),
      ...approval,
    });
  }

  await insertOne("institutional_counterfactual_baselines", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    party_id: partyA.id,
    organization_id: orgA.id,
    program_id: programA.id,
    statement: "Without this trade, Program A retains its funding and receives no secondment.",
    confidence: "high",
    status: "locked",
    locked_at: new Date().toISOString(),
    created_by: lead.id,
  });

  const poolDeal = await insertOne("institutional_deals", {
    lead_organization_id: orgA.id,
    lead_program_id: programA.id,
    created_by: lead.id,
    title: `QA moral-public-goods pool ${suffix}`,
    summary: "Synthetic institutional pool with independent approval and finance roles.",
    deal_type: "moral_public_good_pool",
    classification: "moral_public_goods_coordination",
    stage: "proposed",
    visibility: "parties_only",
  });
  createdDealIds.push(poolDeal.id);
  const poolPartyA = await insertOne("institutional_deal_parties", {
    deal_id: poolDeal.id,
    organization_id: orgA.id,
    program_id: programA.id,
    party_role: "contributor",
    representative_profile_id: lead.id,
    authority_status: "verified_for_scope",
    joined_at: new Date().toISOString(),
  });
  const poolPartyB = await insertOne("institutional_deal_parties", {
    deal_id: poolDeal.id,
    organization_id: orgB.id,
    program_id: programB.id,
    party_role: "contributor",
    representative_profile_id: named.id,
    authority_status: "verified_for_scope",
    joined_at: new Date().toISOString(),
  });
  for (const member of [
    { profile_id: lead.id, party_id: poolPartyA.id, organization_id: orgA.id, added_by: lead.id },
    { profile_id: finance.id, party_id: poolPartyA.id, organization_id: orgA.id, added_by: lead.id, access_scope: "finance" },
    { profile_id: named.id, party_id: poolPartyB.id, organization_id: orgB.id, added_by: named.id },
  ]) {
    await insertOne("institutional_deal_room_members", {
      deal_id: poolDeal.id,
      access_scope: member.access_scope || "all_parties",
      can_post: true,
      ...member,
    });
  }
  const poolTerms = await insertOne("institutional_pool_terms", {
    deal_id: poolDeal.id,
    threshold_amount_cents: 20_000,
    currency: "usd",
    minimum_contributors: 2,
    contribution_deadline: new Date(Date.now() + 86_400_000).toISOString(),
    activation_rule: "governance_vote_and_threshold",
    contribution_cap_cents: 20_000,
    excess_funds_rule: "return_pro_rata",
    failure_rule: "release_reservations",
    withdrawal_rule: "before_activation",
    governance_rule: "one_organization_one_vote",
    governance_config: { required_anchor_total_cents: 5_000, required_underwriting_total_cents: 5_000 },
    terms_hash: zeroHash,
    status: "open",
    created_by: lead.id,
  });
  assert.match(poolTerms.terms_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(poolTerms.terms_hash, zeroHash);
  const budgetAccountA = await insertOne("institutional_budget_accounts", {
    organization_id: orgA.id,
    program_id: programA.id,
    name: "QA institutional pool budget A",
    currency: "usd",
    authorized_cents: 100_000,
    status: "active",
    created_by: finance.id,
  });
  const budgetAccountB = await insertOne("institutional_budget_accounts", {
    organization_id: orgB.id,
    program_id: programB.id,
    name: "QA institutional pool budget B",
    currency: "usd",
    authorized_cents: 100_000,
    status: "active",
    created_by: finance.id,
  });
  const integration = await insertOne("institutional_integrations", {
    organization_id: orgA.id,
    program_id: programA.id,
    integration_type: "webhook",
    name: "QA valid credential-reference integration",
    configuration: { delivery_mode: "signed_json" },
    credential_reference: `vault:institutional-qa:${runId}`,
    status: "draft",
    created_by: lead.id,
  });

  return {
    runId,
    suffix,
    lead,
    finance,
    named,
    verifier,
    outsider,
    orgA,
    orgB,
    programA,
    wrongProgramA,
    programB,
    leadGrant,
    financeGrantA,
    namedGrant,
    financeGrantB,
    deal,
    partyA,
    partyB,
    proposal,
    alternateProposal,
    obligation,
    alternateObligation,
    milestone,
    evidenceRequirement,
    verifierAssignment,
    poolDeal,
    poolPartyA,
    poolPartyB,
    poolTerms,
    budgetAccountA,
    budgetAccountB,
    integration,
    reservationA: null,
    reservationB: null,
    contributionA: null,
    contributionB: null,
    clients: {},
  };
}

async function establishAal2Clients(value) {
  for (const role of ["lead", "finance", "named", "verifier", "outsider"]) {
    value.clients[role] = await makeAal2Client(value[role]);
  }
}

async function relationshipAndDatabaseNegativeChecks(value) {
  await expectDatabaseFailure(
    "Database rejects wrong-program baseline",
    () => admin.from("institutional_counterfactual_baselines").insert({
      deal_id: value.deal.id,
      proposal_version_id: value.proposal.id,
      party_id: value.partyA.id,
      organization_id: value.orgA.id,
      program_id: value.wrongProgramA.id,
      statement: "Invalid wrong-program baseline.",
      confidence: "high",
      status: "draft",
      created_by: value.lead.id,
    }),
    /baseline organization\/program scope must exactly match/i,
  );

  await expectDatabaseFailure(
    "Database rejects wrong-program approval",
    () => admin.from("institutional_approvals").insert({
      deal_id: value.deal.id,
      proposal_version_id: value.proposal.id,
      organization_id: value.orgA.id,
      program_id: value.wrongProgramA.id,
      approval_kind: "program",
      requested_from_profile_id: value.lead.id,
      requested_by: value.lead.id,
    }),
    /approval organization\/program scope must exactly match/i,
  );

  const unrelatedDeal = await insertOne("institutional_deals", {
    lead_organization_id: value.orgA.id,
    lead_program_id: value.programA.id,
    created_by: value.lead.id,
    title: `QA unrelated relationship guard ${value.suffix}`,
    deal_type: "bilateral_trade",
    stage: "draft",
  });
  createdDealIds.push(unrelatedDeal.id);
  const unrelatedParty = await insertOne("institutional_deal_parties", {
    deal_id: unrelatedDeal.id,
    organization_id: value.orgA.id,
    program_id: value.programA.id,
    party_role: "lead",
    representative_profile_id: value.lead.id,
    joined_at: new Date().toISOString(),
  });
  const unrelatedProposal = await insertOne("institutional_proposal_versions", {
    deal_id: unrelatedDeal.id,
    version: 1,
    title: "Unrelated terms",
    terms: { unrelated: true },
    terms_hash: zeroHash,
    status: "draft",
    created_by: value.lead.id,
  });

  await expectDatabaseFailure(
    "Database rejects cross-deal proposal relationship",
    () => admin.from("institutional_obligations").insert({
      deal_id: value.deal.id,
      proposal_version_id: unrelatedProposal.id,
      obligor_party_id: value.partyA.id,
      resource_type: "research",
      title: "Invalid cross-deal proposal obligation",
      created_by: value.lead.id,
    }),
    /proposal|foreign key|deal/i,
  );

  await expectDatabaseFailure(
    "Database rejects invalid party relationship",
    () => admin.from("institutional_obligations").insert({
      deal_id: value.deal.id,
      proposal_version_id: value.proposal.id,
      obligor_party_id: unrelatedParty.id,
      resource_type: "research",
      title: "Invalid party obligation",
      created_by: value.lead.id,
    }),
    /party|foreign key|deal/i,
  );

  await expectDatabaseFailure(
    "Database rejects cross-obligation milestone",
    () => admin.from("institutional_milestones").insert({
      deal_id: value.deal.id,
      proposal_version_id: value.proposal.id,
      obligation_id: value.alternateObligation.id,
      title: "Invalid cross-obligation milestone",
      created_by: value.lead.id,
    }),
    /obligation|proposal|foreign key/i,
  );

  await expectDatabaseFailure(
    "Database rejects mismatched evidence relationship",
    () => admin.from("institutional_evidence_submissions").insert({
      deal_id: value.deal.id,
      proposal_version_id: value.alternateProposal.id,
      obligation_id: value.alternateObligation.id,
      milestone_id: value.milestone.id,
      requirement_id: value.evidenceRequirement.id,
      submitted_by: value.lead.id,
      evidence: { type: "attestation", synthetic: true },
    }),
    /evidence|requirement|foreign key|obligation|milestone/i,
  );

  await expectDatabaseFailure(
    "Database blocks verifier deal-room access before acceptance",
    () => admin.from("institutional_deal_room_members").insert({
      deal_id: value.deal.id,
      profile_id: value.verifier.id,
      verifier_assignment_id: value.verifierAssignment.id,
      access_scope: "evidence",
      can_post: true,
      added_by: value.lead.id,
    }),
    /before confidential deal-room access|must accept/i,
  );

  await expectDatabaseFailure(
    "Database rejects embedded integration secret",
    () => admin.from("institutional_integrations").insert({
      organization_id: value.orgA.id,
      program_id: value.programA.id,
      integration_type: "api",
      name: "Invalid embedded secret",
      configuration: { api_key: "sk_test_abcdefghijklmnopqrstuvwxyz" },
      status: "draft",
      created_by: value.lead.id,
    }),
    /must not embed secrets|credential reference/i,
  );

  await expectDatabaseFailure(
    "Database rejects unsupported webhook event",
    () => admin.from("institutional_webhooks").insert({
      integration_id: value.integration.id,
      endpoint_url: "https://example.com/moral-trade-qa",
      supported_events: ["unsupported.webhook.event"],
      secret_reference: `vault:webhook:${runId}`,
      status: "draft",
      created_by: value.lead.id,
    }),
    /unsupported institutional webhook event/i,
  );
}

async function authenticatedNegativeChecksBeforeSelection(value) {
  await expectRpcFailure(
    "Authenticated wrong-program proposal selection is rejected",
    () => value.clients.lead.rpc("select_institutional_proposal_version", {
      target_deal_id: value.deal.id,
      target_proposal_version_id: value.proposal.id,
      target_organization_id: value.orgA.id,
      target_program_id: value.wrongProgramA.id,
    }),
    /exact-scope|exact party/i,
  );

  await expectRpcFailure(
    "Atomic unauthorized financial reservation is rejected",
    () => value.clients.lead.rpc("reserve_institutional_budget", {
      target_budget_account_id: value.budgetAccountA.id,
      target_deal_id: value.poolDeal.id,
      target_amount_cents: 10_000,
      target_authority_grant_id: value.financeGrantA.id,
      target_idempotency_key: `unauthorized-finance-${runId}`,
    }),
    /finance reservation authority/i,
  );

  await expectRpcFailure(
    "Atomic unauthorized pool vote is rejected",
    () => value.clients.outsider.rpc("cast_institutional_pool_vote", {
      target_deal_id: value.poolDeal.id,
      target_organization_id: value.orgA.id,
      target_program_id: value.programA.id,
      target_proposal_key: "activation",
      target_vote: "approve",
      target_authority_grant_id: value.leadGrant.id,
    }),
    /pool vote requires valid exact-scope|pool approval authority/i,
  );

  const reserveA = await value.clients.finance.rpc("reserve_institutional_budget", {
    target_budget_account_id: value.budgetAccountA.id,
    target_deal_id: value.poolDeal.id,
    target_amount_cents: 10_000,
    target_authority_grant_id: value.financeGrantA.id,
    target_idempotency_key: `qa-reservation-a-${runId}`,
  });
  if (reserveA.error) throw reserveA.error;
  value.reservationA = reserveA.data;
  const reserveB = await value.clients.finance.rpc("reserve_institutional_budget", {
    target_budget_account_id: value.budgetAccountB.id,
    target_deal_id: value.poolDeal.id,
    target_amount_cents: 10_000,
    target_authority_grant_id: value.financeGrantB.id,
    target_idempotency_key: `qa-reservation-b-${runId}`,
  });
  if (reserveB.error) throw reserveB.error;
  value.reservationB = reserveB.data;
  record("Independent finance representative atomically reserves both exact-scope budgets", "passed", {
    reservationA: value.reservationA,
    reservationB: value.reservationB,
  });
}

async function login(page, user, next = "/institutions") {
  await page.goto(`${baseUrl}/login?method=email&next=${encodeURIComponent(next)}`);
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Log in", exact: true }).click(),
  ]);
}

async function ensureMfa(page, user) {
  assert.ok(user.mfa?.secret, `Missing test MFA secret for ${user.role}.`);
  await page.goto(`${baseUrl}/dashboard#account-security`);
  const panel = page.locator("article#account-security");
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  if (/Session level\s*aal2/i.test(await panel.innerText())) return;
  const verifyForm = panel.locator("form").filter({ has: page.getByRole("button", { name: "Verify session" }) });
  await verifyForm.waitFor({ state: "visible", timeout: 30_000 });
  await verifyForm.locator('select[name="factor_id"]').selectOption(user.mfa.factorId);
  await verifyForm.locator('input[name="code"]').fill(await freshTotp(user.mfa.secret));
  await verifyForm.getByRole("button", { name: "Verify session" }).click();
  await panel.getByText("MFA verified for this session.").waitFor({ state: "visible", timeout: 30_000 });
}

async function screenshot(page, name) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function observePage(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push({ label, text: message.text() });
  });
  page.on("pageerror", (error) => browserErrors.push({ label, text: error.message }));
}

async function browserFlow(value) {
  const browser = await chromium.launch({ headless: true });
  let consentHref;
  try {
    const outsiderContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const outsiderPage = await outsiderContext.newPage();
    observePage(outsiderPage, "outsider");
    await login(outsiderPage, value.outsider, `/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    await outsiderPage.waitForLoadState("networkidle");
    assert.doesNotMatch(await outsiderPage.locator("body").innerText(), new RegExp(value.deal.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await screenshot(outsiderPage, "outsider-denied");
    record("Outsider cannot read the confidential deal room", "passed");
    await outsiderContext.close();

    const verifierContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const verifierPage = await verifierContext.newPage();
    observePage(verifierPage, "verifier");
    await login(verifierPage, value.verifier, `/institutions/verifier-assignments/${value.verifierAssignment.id}`);
    await ensureMfa(verifierPage, value.verifier);
    await verifierPage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    assert.doesNotMatch(await verifierPage.locator("body").innerText(), new RegExp(value.deal.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    record("Invited verifier has no confidential access before acceptance", "passed");
    await verifierPage.goto(`${baseUrl}/institutions/verifier-assignments/${value.verifierAssignment.id}`);
    const verifierForm = verifierPage.locator("form").filter({ has: verifierPage.getByRole("button", { name: "Record my decision" }) }).first();
    await verifierForm.locator('textarea[name="conflictDeclaration"]').fill("No conflict for synthetic QA.");
    await verifierForm.getByRole("button", { name: "Record my decision" }).click();
    await verifierPage.waitForLoadState("networkidle");
    assert.match(await verifierPage.locator("body").innerText(), /Verifier assignment updated|Assignment is accepted/i);
    await verifierPage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    await verifierPage.getByRole("heading", { name: value.deal.title }).waitFor({ state: "visible", timeout: 30_000 });
    await screenshot(verifierPage, "verifier-access-after-acceptance");
    record("Named verifier acceptance atomically grants confidential access", "passed");
    await verifierContext.close();

    const leadContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const leadPage = await leadContext.newPage();
    observePage(leadPage, "lead");
    await login(leadPage, value.lead, `/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    await ensureMfa(leadPage, value.lead);
    await leadPage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.deal.id}#proposals`);
    const proposalCard = leadPage.locator("article").filter({ hasText: value.proposal.title });
    await proposalCard.getByRole("button", { name: "Select exact terms" }).click();
    await leadPage.waitForLoadState("networkidle");
    assert.match(await leadPage.locator("body").innerText(), /Proposal selected|Selected v1|exact terms/i);
    record("Exact-scope representative selects one proposal version", "passed");

    const stale = await value.clients.lead.rpc("sign_institutional_deal", {
      target_deal_id: value.deal.id,
      target_party_id: value.partyA.id,
      target_authority_grant_id: value.leadGrant.id,
      target_expected_terms_hash: zeroHash,
    });
    assert.ok(stale.error, "Stale signature unexpectedly succeeded.");
    assert.match(stale.error.message, /stale because the selected exact terms changed/i);
    record("Atomic stale signature is rejected before any weaker check", "passed", { message: stale.error.message });

    await leadPage.getByRole("button", { name: "Request exact-term consent" }).click();
    await leadPage.waitForLoadState("networkidle");
    const consentLink = leadPage.getByRole("link", { name: /Open exact-term consent|Review and decide/ }).first();
    await consentLink.waitFor({ state: "visible", timeout: 30_000 });
    consentHref = await consentLink.getAttribute("href");
    assert.ok(consentHref);
    record("Consent request is bound to selected exact terms", "passed", { consentHref });

    const genericApprovalFailure = await value.clients.lead.rpc("sign_institutional_deal", {
      target_deal_id: value.deal.id,
      target_party_id: value.partyA.id,
      target_authority_grant_id: value.leadGrant.id,
      target_expected_terms_hash: value.proposal.terms_hash,
    });
    assert.ok(genericApprovalFailure.error, "Generic approval unexpectedly substituted for named consent.");
    assert.match(genericApprovalFailure.error.message, /generic approval cannot substitute|affirmatively consent/i);
    record("Generic approval cannot substitute for named-person consent", "passed", { message: genericApprovalFailure.error.message });
    await screenshot(leadPage, "generic-approval-does-not-substitute-for-consent");

    const poolUrl = `${baseUrl}/institutions/${value.orgA.id}/deals/${value.poolDeal.id}#pool`;
    await leadPage.goto(poolUrl);
    const approvalForm = leadPage.locator("form").filter({ has: leadPage.getByRole("button", { name: "Record independent decision" }) }).first();
    await approvalForm.locator('select[name="authorityGrantId"]').selectOption(value.leadGrant.id);
    await approvalForm.getByRole("button", { name: "Record independent decision" }).click();
    await leadPage.waitForLoadState("networkidle");
    assert.match(await leadPage.locator("body").innerText(), /approval recorded separately|Approved/i);
    await screenshot(leadPage, "pool-approval-separated-from-finance");
    record("Pool participation approval uses pool:approve independently", "passed");
    await leadContext.close();

    const namedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const namedPage = await namedContext.newPage();
    observePage(namedPage, "named-mobile");
    await login(namedPage, value.named, consentHref);
    await ensureMfa(namedPage, value.named);
    await namedPage.goto(`${baseUrl}${consentHref}`);
    const consentForm = namedPage.locator("form").filter({ has: namedPage.getByRole("button", { name: "Record my decision" }) }).first();
    await consentForm.locator('textarea[name="decisionNote"]').fill("I voluntarily affirm these exact terms for QA.");
    await consentForm.getByRole("button", { name: "Record my decision" }).click();
    await namedPage.waitForLoadState("networkidle");
    assert.match(await namedPage.locator("body").innerText(), /affirmed|Consent is affirmed/i);
    await screenshot(namedPage, "named-person-mobile-consent");
    record("Named person affirms exact terms on mobile", "passed");

    await namedPage.goto(`${baseUrl}/institutions/${value.orgB.id}/deals/${value.deal.id}`);
    const namedSignForm = namedPage.locator("form").filter({ has: namedPage.getByRole("button", { name: "Sign exact selected terms" }) });
    await namedSignForm.locator('select[name="partyId"]').selectOption(value.partyB.id);
    await namedSignForm.locator('select[name="authorityGrantId"]').selectOption(value.namedGrant.id);
    await namedSignForm.getByRole("button", { name: "Sign exact selected terms" }).click();
    await namedPage.waitForLoadState("networkidle");
    assert.match(await namedPage.locator("body").innerText(), /Signature recorded|signed/i);
    record("Named counterparty signs the immutable selected terms", "passed");

    const orgBPoolUrl = `${baseUrl}/institutions/${value.orgB.id}/deals/${value.poolDeal.id}#pool`;
    await namedPage.goto(orgBPoolUrl);
    const orgBApprovalForm = namedPage.locator("form").filter({ has: namedPage.getByRole("button", { name: "Record independent decision" }) }).first();
    await orgBApprovalForm.locator('select[name="authorityGrantId"]').selectOption(value.namedGrant.id);
    await orgBApprovalForm.getByRole("button", { name: "Record independent decision" }).click();
    await namedPage.waitForLoadState("networkidle");
    assert.match(await namedPage.locator("body").innerText(), /approval recorded separately|Approved/i);
    record("Second contributor records exact-scope pool approval", "passed");
    await namedContext.close();

    const leadSignContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const leadSignPage = await leadSignContext.newPage();
    observePage(leadSignPage, "lead-sign");
    await login(leadSignPage, value.lead, `/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    await ensureMfa(leadSignPage, value.lead);
    await leadSignPage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    const leadSignForm = leadSignPage.locator("form").filter({ has: leadSignPage.getByRole("button", { name: "Sign exact selected terms" }) });
    await leadSignForm.locator('select[name="partyId"]').selectOption(value.partyA.id);
    await leadSignForm.locator('select[name="authorityGrantId"]').selectOption(value.leadGrant.id);
    await leadSignForm.getByRole("button", { name: "Sign exact selected terms" }).click();
    await leadSignPage.waitForLoadState("networkidle");
    assert.match(await leadSignPage.locator("body").innerText(), /Signature recorded|Signed/i);
    await screenshot(leadSignPage, "both-parties-signed-exact-terms");
    record("All exact parties sign and the deal reaches signed state", "passed");
    await leadSignContext.close();

    const financeContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const financePage = await financeContext.newPage();
    observePage(financePage, "finance");
    await login(financePage, value.finance, `/institutions/${value.orgA.id}/deals/${value.poolDeal.id}`);
    await ensureMfa(financePage, value.finance);
    await financePage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.poolDeal.id}#pool`);
    const contributionForm = financePage.locator("form").filter({ has: financePage.getByRole("button", { name: "Save contribution lifecycle" }) });
    await contributionForm.locator('select[name="programId"]').selectOption(value.programA.id);
    await contributionForm.locator('input[name="amount"]').fill("100.00");
    await contributionForm.locator('input[name="budgetReservationId"]').fill(value.reservationA);
    await contributionForm.locator('select[name="financeAuthorityGrantId"]').selectOption(value.financeGrantA.id);
    await contributionForm.locator('select[name="status"]').selectOption("committed");
    await contributionForm.getByRole("button", { name: "Save contribution lifecycle" }).click();
    await financePage.waitForLoadState("networkidle");
    assert.match(await financePage.locator("body").innerText(), /Financial reservation and pool approval remain separate|Committed/i);
    await screenshot(financePage, "independent-finance-commitment");
    record("Different finance representative commits approved contribution", "passed");
    await financeContext.close();
  } finally {
    await browser.close();
  }
  return consentHref;
}

async function completeAtomicPoolFlow(value) {
  const contributionAResult = await admin
    .from("institutional_pool_contributions")
    .select("id,status,terms_hash")
    .eq("deal_id", value.poolDeal.id)
    .eq("organization_id", value.orgA.id)
    .eq("program_id", value.programA.id)
    .single();
  if (contributionAResult.error) throw contributionAResult.error;
  value.contributionA = contributionAResult.data.id;
  assert.equal(contributionAResult.data.status, "committed");
  assert.equal(contributionAResult.data.terms_hash, value.poolTerms.terms_hash);

  const contributionB = await value.clients.finance.rpc("save_institutional_pool_contribution", {
    target_deal_id: value.poolDeal.id,
    target_organization_id: value.orgB.id,
    target_program_id: value.programB.id,
    target_amount_cents: 10_000,
    target_status: "committed",
    target_budget_reservation_id: value.reservationB,
    target_finance_authority_grant_id: value.financeGrantB.id,
  });
  if (contributionB.error) throw contributionB.error;
  value.contributionB = contributionB.data;
  record("Second exact-scope contribution commits atomically", "passed", { contributionId: contributionB.data });

  const anchor = await value.clients.lead.rpc("save_institutional_pool_anchor", {
    target_deal_id: value.poolDeal.id,
    target_organization_id: value.orgA.id,
    target_program_id: value.programA.id,
    target_contribution_id: value.contributionA,
    target_amount_cents: 5_000,
    target_status: "committed",
    target_authority_grant_id: value.leadGrant.id,
  });
  if (anchor.error) throw anchor.error;
  record("Exact-scope anchor eligibility is validated atomically", "passed", { anchorId: anchor.data });

  const underwriting = await value.clients.finance.rpc("save_institutional_pool_underwriting", {
    target_deal_id: value.poolDeal.id,
    target_organization_id: value.orgA.id,
    target_program_id: value.programA.id,
    target_maximum_amount_cents: 5_000,
    target_status: "committed",
    target_budget_reservation_id: value.reservationA,
    target_authority_grant_id: value.financeGrantA.id,
  });
  if (underwriting.error) throw underwriting.error;
  record("Exact-scope underwriting eligibility is validated atomically", "passed", { underwritingId: underwriting.data });

  const voteA = await value.clients.lead.rpc("cast_institutional_pool_vote", {
    target_deal_id: value.poolDeal.id,
    target_organization_id: value.orgA.id,
    target_program_id: value.programA.id,
    target_proposal_key: "activation",
    target_vote: "approve",
    target_authority_grant_id: value.leadGrant.id,
  });
  if (voteA.error) throw voteA.error;
  const voteB = await value.clients.named.rpc("cast_institutional_pool_vote", {
    target_deal_id: value.poolDeal.id,
    target_organization_id: value.orgB.id,
    target_program_id: value.programB.id,
    target_proposal_key: "activation",
    target_vote: "approve",
    target_authority_grant_id: value.namedGrant.id,
  });
  if (voteB.error) throw voteB.error;
  record("Eligible pool votes are bound atomically to current exact terms", "passed", { voteA: voteA.data, voteB: voteB.data });

  const activation = await value.clients.lead.rpc("activate_institutional_pool", {
    target_deal_id: value.poolDeal.id,
    target_organization_id: value.orgA.id,
    target_program_id: value.programA.id,
    target_authority_grant_id: value.leadGrant.id,
  });
  if (activation.error) throw activation.error;
  const state = await admin.from("institutional_pool_terms").select("status,terms_hash").eq("deal_id", value.poolDeal.id).single();
  if (state.error) throw state.error;
  assert.equal(state.data.status, "active");
  assert.equal(state.data.terms_hash, value.poolTerms.terms_hash);
  record("Pool activation passes only after atomic contribution, anchor, underwriting, and vote gates", "passed");
}

async function signedImmutabilityChecks(value) {
  const dealState = await admin.from("institutional_deals").select("stage,signed_at,selected_proposal_version_id,selected_terms_hash").eq("id", value.deal.id).single();
  if (dealState.error) throw dealState.error;
  assert.equal(dealState.data.stage, "signed");
  assert.equal(dealState.data.selected_proposal_version_id, value.proposal.id);
  assert.equal(dealState.data.selected_terms_hash, value.proposal.terms_hash);
  assert.ok(dealState.data.signed_at);

  await expectDatabaseFailure(
    "Selected exact proposal remains immutable after signature",
    () => admin.from("institutional_proposal_versions").update({ title: "Mutated selected terms" }).eq("id", value.proposal.id),
    /selected proposal versions are immutable/i,
  );
  await expectDatabaseFailure(
    "Signed deal record remains immutable and exact-term-bound",
    () => admin.from("institutional_deals").update({ title: "Mutated signed deal" }).eq("id", value.deal.id),
    /signed deal records are immutable/i,
  );
  const signature = await admin.from("institutional_signatures").select("id").eq("deal_id", value.deal.id).limit(1).single();
  if (signature.error) throw signature.error;
  await expectDatabaseFailure(
    "Signature record cannot be changed",
    () => admin.from("institutional_signatures").update({ certificate: { altered: true } }).eq("id", signature.data.id),
    /signatures are immutable exact-term records/i,
  );
  await expectDatabaseFailure(
    "Signature record cannot be deleted directly",
    () => admin.from("institutional_signatures").delete().eq("id", signature.data.id),
    /signatures are immutable exact-term records/i,
  );
}

async function verifyAcceptedEvidenceAccess(value) {
  const room = await admin.from("institutional_deal_room_members").select("id,verifier_assignment_id").eq("deal_id", value.deal.id).eq("profile_id", value.verifier.id).eq("access_scope", "evidence").single();
  if (room.error) throw room.error;
  assert.equal(room.data.verifier_assignment_id, value.verifierAssignment.id);
  record("Verifier access is exact-assignment-bound after acceptance", "passed");
}

const dealScopedTables = [
  "institutional_deal_parties",
  "institutional_deal_room_members",
  "institutional_deal_messages",
  "institutional_proposal_versions",
  "institutional_counterfactual_baselines",
  "institutional_obligations",
  "institutional_obligation_dependencies",
  "institutional_approvals",
  "institutional_individual_consents",
  "institutional_signatures",
  "institutional_budget_reservations",
  "institutional_milestones",
  "institutional_verifier_assignments",
  "institutional_evidence_requirements",
  "institutional_evidence_submissions",
  "institutional_risk_reviews",
  "institutional_amendments",
  "institutional_disputes",
  "institutional_dispute_events",
  "institutional_attribution_claims",
  "institutional_report_snapshots",
  "institutional_command_drafts",
  "institutional_pool_terms",
  "institutional_pool_contributions",
  "institutional_pool_anchors",
  "institutional_pool_underwritings",
  "institutional_pool_votes",
  "institutional_audit_events",
];

async function countByIds(table, column, ids) {
  if (!ids.length) return 0;
  const result = await admin.from(table).select("*", { count: "exact", head: true }).in(column, ids);
  if (result.error) throw new Error(`Residue query ${table}.${column}: ${result.error.message}`);
  return result.count || 0;
}

async function cleanup() {
  if (createdDealIds.length) {
    const audits = await admin.from("institutional_audit_events").delete().in("deal_id", createdDealIds);
    if (audits.error) throw audits.error;
    const deals = await admin.from("institutional_deals").delete().in("id", createdDealIds);
    if (deals.error) throw deals.error;
  }
  if (createdOrganizationIds.length) {
    const audits = await admin.from("institutional_audit_events").delete().in("represented_organization_id", createdOrganizationIds);
    if (audits.error) throw audits.error;
    const organizations = await admin.from("institutional_organizations").delete().in("id", createdOrganizationIds);
    if (organizations.error) throw organizations.error;
  }
  if (createdUserIds.length) {
    const audits = await admin.from("institutional_audit_events").delete().in("actor_profile_id", createdUserIds);
    if (audits.error) throw audits.error;
    const profiles = await admin.from("profiles").delete().in("id", createdUserIds);
    if (profiles.error) throw profiles.error;
    for (const id of createdUserIds) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error && !/not found/i.test(result.error.message)) throw result.error;
    }
  }
}

async function verifyZeroSyntheticResidue() {
  const residue = {};
  residue.institutional_deals = await countByIds("institutional_deals", "id", createdDealIds);
  residue.institutional_organizations = await countByIds("institutional_organizations", "id", createdOrganizationIds);
  residue.profiles = await countByIds("profiles", "id", createdUserIds);
  for (const table of dealScopedTables) {
    if (table === "institutional_audit_events") {
      residue[`${table}.deal_id`] = await countByIds(table, "deal_id", createdDealIds);
      residue[`${table}.actor_profile_id`] = await countByIds(table, "actor_profile_id", createdUserIds);
      residue[`${table}.represented_organization_id`] = await countByIds(table, "represented_organization_id", createdOrganizationIds);
    } else {
      residue[table] = await countByIds(table, "deal_id", createdDealIds);
    }
  }
  const authResidue = [];
  for (const id of createdUserIds) {
    const result = await admin.auth.admin.getUserById(id);
    if (!result.error && result.data.user) authResidue.push(id);
  }
  residue.auth_users = authResidue.length;
  const nonzero = Object.entries(residue).filter(([, count]) => count !== 0);
  await writeFile(path.join(outputDir, "cleanup-residue.json"), JSON.stringify({ runId, residue, nonzero }, null, 2));
  assert.deepEqual(nonzero, [], `Synthetic residue remains: ${JSON.stringify(nonzero)}`);
  record("Complete deletion leaves zero synthetic QA users and records", "passed", { residue });
}

let failure;
try {
  fixture = await createFixture();
  await establishAal2Clients(fixture);
  await relationshipAndDatabaseNegativeChecks(fixture);
  await authenticatedNegativeChecksBeforeSelection(fixture);
  await browserFlow(fixture);
  await verifyAcceptedEvidenceAccess(fixture);
  await completeAtomicPoolFlow(fixture);
  await signedImmutabilityChecks(fixture);
  assert.deepEqual(browserErrors, [], `Relevant browser errors: ${JSON.stringify(browserErrors)}`);
  record("Institutional authenticated five-participant QA suite", "passed");
} catch (error) {
  failure = error;
  record("Institutional authenticated five-participant QA suite", "failed", {
    error: error instanceof Error ? error.stack : String(error),
  });
} finally {
  try {
    await cleanup();
    await verifyZeroSyntheticResidue();
  } catch (cleanupError) {
    record("Synthetic QA cleanup", "failed", {
      error: cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
    });
    failure ||= cleanupError;
  }
  await writeFile(path.join(outputDir, "browser-errors.json"), JSON.stringify(browserErrors, null, 2));
  await writeFile(path.join(outputDir, "audit.json"), JSON.stringify(audit, null, 2));
}

if (failure) throw failure;
