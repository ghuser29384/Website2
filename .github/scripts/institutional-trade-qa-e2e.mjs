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
    user_metadata: {
      display_name: displayName,
      qa_fixture: true,
      one_person_qa_run_id: runId,
    },
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
  const independent = await createUser("independent", "QA Independent Counterparty");
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

  await insertOne("institutional_individual_profiles", {
    profile_id: named.id,
    status: "active",
    headline: "Independent grantmaker",
    summary: "Synthetic opted-in individual institutional participant.",
    participation_roles: ["grantmaker", "researcher"],
    visibility: "private",
  });
  await insertOne("institutional_individual_profiles", {
    profile_id: independent.id,
    status: "active",
    headline: "Independent funder",
    summary: "Synthetic independent counterparty with no organization or program in this deal.",
    participation_roles: ["funder", "research_partner"],
    visibility: "private",
  });

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
  const expiredLeadGrant = await insertOne("institutional_authority_grants", {
    organization_id: orgA.id,
    program_id: programA.id,
    profile_id: lead.id,
    granted_by: lead.id,
    permissions: ["deal:manage", "deal:approve", "deal:sign", "finance:reserve", "evidence:review"],
    amount_limit_cents: 5_000_000,
    currency: "usd",
    authority_basis: "Expired synthetic authority that must never enable rendered controls.",
    valid_from: new Date(Date.now() - 172_800_000).toISOString(),
    valid_until: new Date(Date.now() - 86_400_000).toISOString(),
  });
  const futureLeadGrant = await insertOne("institutional_authority_grants", {
    organization_id: orgA.id,
    program_id: programA.id,
    profile_id: lead.id,
    granted_by: lead.id,
    permissions: ["deal:manage", "deal:approve", "deal:sign", "finance:reserve", "evidence:review"],
    amount_limit_cents: 5_000_000,
    currency: "usd",
    authority_basis: "Future synthetic authority that must never enable rendered controls.",
    valid_from: new Date(Date.now() + 86_400_000).toISOString(),
    valid_until: new Date(Date.now() + 172_800_000).toISOString(),
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
    authority_grant_id: leadGrant.id,
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
    authority_grant_id: namedGrant.id,
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
  const fundingObligation = await insertOne("institutional_obligations", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligor_party_id: partyA.id,
    beneficiary_party_id: partyB.id,
    resource_type: "funding",
    title: "Confirm direct external animal-welfare transfer",
    description: "The funder records a direct external transfer. Moral Trade does not custody or route the institutional funds.",
    amount_cents: 1_000_000,
    currency: "usd",
    individual_consent_required: false,
    created_by: lead.id,
  });
  const milestone = await insertOne("institutional_milestones", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligation_id: obligation.id,
    title: "Six-month exact-scope review",
    created_by: lead.id,
  });
  const fundingMilestone = await insertOne("institutional_milestones", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligation_id: fundingObligation.id,
    title: "Direct external transfer confirmation",
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
  const fundingEvidenceRequirement = await insertOne("institutional_evidence_requirements", {
    deal_id: deal.id,
    proposal_version_id: proposal.id,
    obligation_id: fundingObligation.id,
    milestone_id: fundingMilestone.id,
    title: "Direct external transfer evidence",
    description: "Receipt or grant confirmation from the external provider; no Moral Trade custody.",
    evidence_type: "receipt",
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

  for (const requirementId of [evidenceRequirement.id, fundingEvidenceRequirement.id]) {
    const linked = await admin
      .from("institutional_evidence_requirements")
      .update({ verifier_assignment_id: verifierAssignment.id })
      .eq("id", requirementId);
    if (linked.error) throw linked.error;
  }

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
    authority_grant_id: leadGrant.id,
    authority_status: "verified_for_scope",
    joined_at: new Date().toISOString(),
  });
  const poolPartyB = await insertOne("institutional_deal_parties", {
    deal_id: poolDeal.id,
    organization_id: orgB.id,
    program_id: programB.id,
    party_role: "contributor",
    representative_profile_id: named.id,
    authority_grant_id: namedGrant.id,
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

  const personalDeal = await insertOne("institutional_deals", {
    lead_capacity: "individual",
    lead_profile_id: named.id,
    lead_organization_id: null,
    lead_program_id: null,
    legal_counterparty_id: null,
    created_by: named.id,
    title: `QA independent grantmaker trade ${suffix}`,
    summary: "Synthetic personal-capacity deal that must not inherit organizational authority.",
    deal_type: "bilateral_trade",
    classification: "mixed_moral_trade",
    stage: "draft",
    visibility: "parties_only",
  });
  createdDealIds.push(personalDeal.id);
  const personalParty = await insertOne("institutional_deal_parties", {
    deal_id: personalDeal.id,
    party_capacity: "individual",
    profile_id: named.id,
    organization_id: null,
    program_id: null,
    legal_entity_id: null,
    party_role: "independent_grantmaker",
    representative_profile_id: named.id,
    authority_status: "self_authorized",
    approval_status: "not_required",
    consent_status: "not_required",
    joined_at: new Date().toISOString(),
  });
  await insertOne("institutional_deal_room_members", {
    deal_id: personalDeal.id,
    profile_id: named.id,
    party_id: personalParty.id,
    organization_id: null,
    access_scope: "all_parties",
    can_post: true,
    added_by: named.id,
  });
  const personalProposal = await insertOne("institutional_proposal_versions", {
    deal_id: personalDeal.id,
    version: 1,
    title: "Independent research commitment",
    summary: "The individual commits only their own work under exact terms.",
    terms: { service: { profile_id: named.id, activity: "research", hours: 20 }, acting_capacity: "individual" },
    terms_hash: zeroHash,
    status: "draft",
    created_by: named.id,
  });
  const personalCounterparty = await insertOne("institutional_deal_parties", {
    deal_id: personalDeal.id,
    party_capacity: "individual",
    profile_id: independent.id,
    organization_id: null,
    program_id: null,
    legal_entity_id: null,
    party_role: "independent_counterparty",
    representative_profile_id: independent.id,
    authority_status: "self_authorized",
    approval_status: "not_required",
    consent_status: "not_required",
    joined_at: null,
  });
  const personalObligation = await insertOne("institutional_obligations", {
    deal_id: personalDeal.id,
    proposal_version_id: personalProposal.id,
    obligor_party_id: personalParty.id,
    beneficiary_party_id: personalCounterparty.id,
    resource_type: "research",
    title: "Complete independent research work",
    description: "Twenty hours of work controlled by the individual alone.",
    quantity: 20,
    unit: "hours",
    individual_consent_required: false,
    individual_profile_id: named.id,
    created_by: named.id,
  });
  const personalFundingObligation = await insertOne("institutional_obligations", {
    deal_id: personalDeal.id,
    proposal_version_id: personalProposal.id,
    obligor_party_id: personalCounterparty.id,
    beneficiary_party_id: personalParty.id,
    resource_type: "funding",
    title: "Confirm direct external cause-linked transfer",
    description: "The independent counterparty confirms a direct external transfer; Moral Trade does not custody funds.",
    amount_cents: 10_000,
    currency: "usd",
    individual_consent_required: false,
    individual_profile_id: independent.id,
    created_by: named.id,
  });
  const personalMilestone = await insertOne("institutional_milestones", {
    deal_id: personalDeal.id,
    proposal_version_id: personalProposal.id,
    obligation_id: personalObligation.id,
    title: "Independent research completion",
    created_by: named.id,
  });
  const personalFundingMilestone = await insertOne("institutional_milestones", {
    deal_id: personalDeal.id,
    proposal_version_id: personalProposal.id,
    obligation_id: personalFundingObligation.id,
    title: "External transfer confirmation",
    created_by: named.id,
  });
  const personalEvidenceRequirement = await insertOne("institutional_evidence_requirements", {
    deal_id: personalDeal.id,
    proposal_version_id: personalProposal.id,
    obligation_id: personalObligation.id,
    milestone_id: personalMilestone.id,
    title: "Independent research completion evidence",
    description: "Evidence of the individual's own completed work.",
    evidence_type: "document",
    visibility: "verifier_only",
    status: "open",
    created_by: named.id,
  });
  const personalFundingEvidenceRequirement = await insertOne("institutional_evidence_requirements", {
    deal_id: personalDeal.id,
    proposal_version_id: personalProposal.id,
    obligation_id: personalFundingObligation.id,
    milestone_id: personalFundingMilestone.id,
    title: "Direct external transfer evidence",
    description: "Receipt or grant confirmation from the external provider; no Moral Trade custody.",
    evidence_type: "receipt",
    visibility: "verifier_only",
    status: "open",
    created_by: named.id,
  });
  const personalVerifierAssignment = await insertOne("institutional_verifier_assignments", {
    deal_id: personalDeal.id,
    organization_id: null,
    verifier_profile_id: verifier.id,
    scope: "Review independent work and direct-transfer evidence.",
    status: "invited",
    assigned_by: named.id,
  });

  for (const requirementId of [personalEvidenceRequirement.id, personalFundingEvidenceRequirement.id]) {
    const linked = await admin
      .from("institutional_evidence_requirements")
      .update({ verifier_assignment_id: personalVerifierAssignment.id })
      .eq("id", requirementId);
    if (linked.error) throw linked.error;
  }

  return {
    runId,
    suffix,
    lead,
    finance,
    named,
    verifier,
    outsider,
    independent,
    orgA,
    orgB,
    programA,
    wrongProgramA,
    programB,
    leadGrant,
    expiredLeadGrant,
    futureLeadGrant,
    financeGrantA,
    namedGrant,
    financeGrantB,
    deal,
    partyA,
    partyB,
    proposal,
    alternateProposal,
    obligation,
    fundingObligation,
    alternateObligation,
    milestone,
    fundingMilestone,
    evidenceRequirement,
    fundingEvidenceRequirement,
    verifierAssignment,
    poolDeal,
    poolPartyA,
    poolPartyB,
    poolTerms,
    budgetAccountA,
    budgetAccountB,
    integration,
    personalDeal,
    personalParty,
    personalCounterparty,
    personalProposal,
    personalObligation,
    personalFundingObligation,
    personalMilestone,
    personalFundingMilestone,
    personalEvidenceRequirement,
    personalFundingEvidenceRequirement,
    personalVerifierAssignment,
    reservationA: null,
    reservationB: null,
    contributionA: null,
    contributionB: null,
    clients: {},
  };
}

async function establishAal2Clients(value) {
  for (const role of ["lead", "finance", "named", "verifier", "outsider", "independent"]) {
    value.clients[role] = await makeAal2Client(value[role]);
  }
}

async function authorizationSnapshotChecks(value) {
  const leadSnapshotResult = await value.clients.lead.rpc("get_institutional_deal_authorization_snapshot", {
    target_deal_id: value.deal.id,
    target_organization_id: value.orgA.id,
    target_party_id: value.partyA.id,
  });
  if (leadSnapshotResult.error) throw leadSnapshotResult.error;
  const leadSnapshot = leadSnapshotResult.data;
  assert.equal(leadSnapshot.actingCapacity, "organization");
  assert.equal(leadSnapshot.organizationId, value.orgA.id);
  assert.equal(leadSnapshot.programId, value.programA.id);
  assert.equal(leadSnapshot.organizationPartyId, value.partyA.id);
  assert.equal(leadSnapshot.organizationPartyJoined, true);
  assert.equal(leadSnapshot.canManageDeal, true);
  assert.equal(leadSnapshot.canApprove, true);
  assert.equal(leadSnapshot.canSign, true);
  assert.equal(leadSnapshot.canReviewEvidence, true);
  assert.equal(leadSnapshot.canReserveFunds, false);
  assert.ok(typeof leadSnapshot.asOf === "string" && leadSnapshot.asOf.length > 0);
  assert.ok(leadSnapshot.matchingAuthorityGrantIds.includes(value.leadGrant.id));
  assert.ok(!leadSnapshot.matchingAuthorityGrantIds.includes(value.expiredLeadGrant.id));
  assert.ok(!leadSnapshot.matchingAuthorityGrantIds.includes(value.futureLeadGrant.id));
  assert.deepEqual(leadSnapshot.authorityGrantIdsByPermission.dealManage, [value.leadGrant.id]);
  assert.deepEqual(leadSnapshot.authorityGrantIdsByPermission.dealApprove, [value.leadGrant.id]);
  assert.deepEqual(leadSnapshot.authorityGrantIdsByPermission.dealSign, [value.leadGrant.id]);
  assert.deepEqual(leadSnapshot.authorityGrantIdsByPermission.evidenceReview, [value.leadGrant.id]);
  assert.deepEqual(leadSnapshot.authorityGrantIdsByPermission.financeReserve, []);
  record("Database-time authorization snapshot excludes expired and not-yet-active grants", "passed", { asOf: leadSnapshot.asOf });

  const financeSnapshotResult = await value.clients.finance.rpc("get_institutional_deal_authorization_snapshot", {
    target_deal_id: value.deal.id,
    target_organization_id: value.orgA.id,
    target_party_id: value.partyA.id,
  });
  if (financeSnapshotResult.error) throw financeSnapshotResult.error;
  const financeSnapshot = financeSnapshotResult.data;
  assert.equal(financeSnapshot.canManageDeal, false);
  assert.equal(financeSnapshot.canApprove, false);
  assert.equal(financeSnapshot.canSign, false);
  assert.equal(financeSnapshot.canReviewEvidence, false);
  assert.equal(financeSnapshot.canReserveFunds, true);
  assert.deepEqual(financeSnapshot.matchingAuthorityGrantIds, [value.financeGrantA.id]);
  assert.deepEqual(financeSnapshot.authorityGrantIdsByPermission.financeReserve, [value.financeGrantA.id]);
  record("Authorization snapshot separates finance reservation authority from deal management", "passed");

  const personalSnapshotResult = await value.clients.named.rpc("get_institutional_deal_authorization_snapshot", {
    target_deal_id: value.personalDeal.id,
    target_organization_id: null,
    target_party_id: value.personalParty.id,
  });
  if (personalSnapshotResult.error) throw personalSnapshotResult.error;
  const personalSnapshot = personalSnapshotResult.data;
  assert.equal(personalSnapshot.actingCapacity, "individual");
  assert.equal(personalSnapshot.organizationId, null);
  assert.equal(personalSnapshot.programId, null);
  assert.equal(personalSnapshot.partyId, value.personalParty.id);
  assert.equal(personalSnapshot.canManageDeal, true);
  assert.equal(personalSnapshot.canApprove, false);
  assert.equal(personalSnapshot.canReserveFunds, false);
  assert.deepEqual(personalSnapshot.matchingAuthorityGrantIds, []);
  assert.deepEqual(personalSnapshot.authorityGrantIdsByPermission, {
    dealManage: [],
    dealApprove: [],
    dealSign: [],
    financeReserve: [],
    evidenceReview: [],
  });
  record("Personal-capacity snapshot never inherits organizational authority", "passed");

  await expectRpcFailure(
    "Organization member cannot request another person's personal authorization snapshot",
    () => value.clients.finance.rpc("get_institutional_deal_authorization_snapshot", {
      target_deal_id: value.personalDeal.id,
      target_organization_id: null,
      target_party_id: value.personalParty.id,
    }),
    /exact named personal party/i,
  );
}

async function personalCapacityChecks(value) {
  const dealResult = await admin.from("institutional_deals").select("*").eq("id", value.personalDeal.id).single();
  if (dealResult.error) throw dealResult.error;
  assert.equal(dealResult.data.lead_capacity, "individual");
  assert.equal(dealResult.data.lead_profile_id, value.named.id);
  assert.equal(dealResult.data.lead_organization_id, null);
  assert.equal(dealResult.data.lead_program_id, null);
  assert.equal(dealResult.data.legal_counterparty_id, null);

  const partyResult = await admin.from("institutional_deal_parties").select("*").eq("id", value.personalParty.id).single();
  if (partyResult.error) throw partyResult.error;
  assert.equal(partyResult.data.party_capacity, "individual");
  assert.equal(partyResult.data.profile_id, value.named.id);
  assert.equal(partyResult.data.organization_id, null);
  assert.equal(partyResult.data.program_id, null);
  assert.equal(partyResult.data.authority_status, "self_authorized");
  assert.equal(partyResult.data.approval_status, "not_required");
  record("Individual party and deal lead require no organization or program", "passed");

  assert.equal(value.personalObligation.individual_profile_id, value.named.id);
  record("Individual binds their own labor under self authority", "passed");

  await expectDatabaseFailure(
    "Individual cannot bind another person",
    () => admin.from("institutional_obligations").insert({
      deal_id: value.personalDeal.id,
      proposal_version_id: value.personalProposal.id,
      obligor_party_id: value.personalParty.id,
      resource_type: "research",
      title: "Invalid attempt to bind another person",
      individual_consent_required: true,
      individual_profile_id: value.outsider.id,
      created_by: value.named.id,
    }),
    /cannot name or bind a different individual/i,
  );

  await expectDatabaseFailure(
    "Individual cannot represent an organization without authority",
    () => value.clients.named.from("institutional_deals").insert({
      lead_capacity: "organization",
      lead_profile_id: null,
      lead_organization_id: value.orgA.id,
      lead_program_id: value.programA.id,
      legal_counterparty_id: null,
      created_by: value.named.id,
      title: `Invalid unauthorized organization representation ${value.suffix}`,
      summary: "An independent individual cannot silently adopt another organization's authority.",
      deal_type: "bilateral_trade",
      classification: "unclassified",
      stage: "draft",
      visibility: "parties_only",
    }),
    /(row-level security|permission|authority)/i,
  );

  await expectRpcFailure(
    "Organization membership does not leak into another person's personal-capacity deal",
    () => value.clients.finance.rpc("select_institutional_proposal_version", {
      target_deal_id: value.personalDeal.id,
      target_proposal_version_id: value.personalProposal.id,
      target_organization_id: null,
      target_program_id: null,
    }),
    /only the personal-capacity deal lead/i,
  );

  await expectRpcFailure(
    "Outsider cannot accept another individual's party invitation",
    () => value.clients.outsider.rpc("accept_institutional_deal_party", {
      target_party_id: value.personalCounterparty.id,
    }),
    /only the named personal-capacity participant/i,
  );

  const acceptedCounterparty = await value.clients.independent.rpc("accept_institutional_deal_party", {
    target_party_id: value.personalCounterparty.id,
  });
  if (acceptedCounterparty.error) throw acceptedCounterparty.error;
  const acceptedParty = await admin
    .from("institutional_deal_parties")
    .select("id,party_capacity,profile_id,organization_id,program_id,authority_status,approval_status,joined_at")
    .eq("id", value.personalCounterparty.id)
    .single();
  if (acceptedParty.error) throw acceptedParty.error;
  assert.equal(acceptedParty.data.profile_id, value.independent.id);
  assert.equal(acceptedParty.data.organization_id, null);
  assert.equal(acceptedParty.data.program_id, null);
  assert.equal(acceptedParty.data.authority_status, "self_authorized");
  assert.equal(acceptedParty.data.approval_status, "not_required");
  assert.ok(acceptedParty.data.joined_at);
  value.personalCounterparty = { ...value.personalCounterparty, ...acceptedParty.data };
  record("Named independent counterparty accepts without an organization or program", "passed");

  const selected = await value.clients.named.rpc("select_institutional_proposal_version", {
    target_deal_id: value.personalDeal.id,
    target_proposal_version_id: value.personalProposal.id,
    target_organization_id: null,
    target_program_id: null,
  });
  if (selected.error) throw selected.error;
  record("Personal lead selects exact terms without delegated organizational authority", "passed");

  await expectDatabaseFailure(
    "Individual cannot create an organization-only budget without an organization",
    () => value.clients.named.from("institutional_budget_accounts").insert({
      organization_id: null,
      program_id: null,
      name: "Invalid personal institutional budget",
      currency: "usd",
      authorized_cents: 100,
      status: "active",
      created_by: value.named.id,
    }),
    /(null value|row-level security|organization_id)/i,
  );
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
    /baseline profile or organization\/program scope must exactly match the deal party/i,
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
  await panel.waitFor({ state: "attached", timeout: 30_000 });
  await panel.scrollIntoViewIfNeeded();
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  const initialPanelText = await panel.innerText();
  if (/Session level\s*aal2/i.test(initialPanelText) || /AAL:\s*aal2/i.test(initialPanelText)) return;
  const verifyForm = panel.locator("form").filter({ has: page.getByRole("button", { name: "Verify session" }) });
  await verifyForm.waitFor({ state: "visible", timeout: 30_000 });
  await verifyForm.locator('select[name="factor_id"]').selectOption(user.mfa.factorId);
  await verifyForm.locator('input[name="code"]').fill(await freshTotp(user.mfa.secret));

  const authCookieSignature = async () =>
    (await page.context().cookies())
      .filter(({ name }) => name.startsWith("sb-") || name.includes("auth-token"))
      .sort(({ name: left }, { name: right }) => left.localeCompare(right))
      .map(({ name, value }) => `${name}:${value}`)
      .join("|");
  const beforeAuthCookieSignature = await authCookieSignature();

  const actionResponsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      if (request.method() !== "POST") return false;
      try {
        return new URL(response.url()).pathname === "/dashboard";
      } catch {
        return false;
      }
    },
    { timeout: 30_000 },
  );
  const [actionResponse] = await Promise.all([
    actionResponsePromise,
    verifyForm.getByRole("button", { name: "Verify session" }).click(),
  ]);
  assert.equal(
    actionResponse.status(),
    200,
    `MFA server action returned HTTP ${actionResponse.status()} for ${user.role}.`,
  );

  let authCookieChanged = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(250);
    if ((await authCookieSignature()) !== beforeAuthCookieSignature) {
      authCookieChanged = true;
      break;
    }
  }

  const postActionPanelText = await panel.innerText().catch(() => "");
  await page.reload({ waitUntil: "domcontentloaded" });
  const refreshedPanel = page.locator("article#account-security");
  await refreshedPanel.waitFor({ state: "attached", timeout: 30_000 });
  await refreshedPanel.scrollIntoViewIfNeeded();
  await refreshedPanel.waitFor({ state: "visible", timeout: 30_000 });
  const refreshedPanelText = await refreshedPanel.innerText();
  if (
    !/Session level\s*aal2/i.test(refreshedPanelText) &&
    !/AAL:\s*aal2/i.test(refreshedPanelText)
  ) {
    const cookieMetadata = (await page.context().cookies())
      .filter(({ name }) => name.startsWith("sb-") || name.includes("auth-token"))
      .map(({ domain, expires, httpOnly, name, path: cookiePath, sameSite, secure, value }) => ({
        domain,
        expires,
        httpOnly,
        name,
        path: cookiePath,
        sameSite,
        secure,
        valueLength: value.length,
      }));
    await writeFile(
      path.join(outputDir, `mfa-${user.role}-verification.json`),
      `${JSON.stringify(
        {
          actionResponseStatus: actionResponse.status(),
          authCookieChanged,
          cookieMetadata,
          initialPanelText,
          postActionPanelText,
          refreshedPanelText,
          role: user.role,
          url: page.url(),
        },
        null,
        2,
      )}\n`,
    );
    await screenshot(page, `mfa-${user.role}-verification-failed`);
    throw new Error(
      `MFA verification did not persist AAL2 for ${user.role}. ` +
        `Post-action panel: ${postActionPanelText.slice(0, 500)} ` +
        `Reloaded panel: ${refreshedPanelText.slice(0, 500)}`,
    );
  }

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
    await verifierPage.goto(`${baseUrl}/institutions/individual/deals/${value.deal.id}`);
    assert.doesNotMatch(await verifierPage.locator("body").innerText(), new RegExp(value.deal.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    record("Invited verifier has no confidential access before acceptance", "passed");
    await verifierPage.goto(`${baseUrl}/institutions/verifier-assignments/${value.verifierAssignment.id}`);
    const verifierForm = verifierPage.locator("form").filter({ has: verifierPage.getByRole("button", { name: "Record my decision" }) }).first();
    await verifierForm.locator('textarea[name="conflictDeclaration"]').fill("No conflict for synthetic QA.");
    await verifierForm.getByRole("button", { name: "Record my decision" }).click();
    await verifierPage.waitForLoadState("networkidle");
    assert.match(await verifierPage.locator("body").innerText(), /Verifier assignment updated|Assignment is accepted/i);
    await verifierPage.goto(`${baseUrl}/institutions/individual/deals/${value.deal.id}`);
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

    await namedPage.goto(`${baseUrl}/institutions/individual`);
    const personalWorkspaceText = await namedPage.locator("body").innerText();
    assert.match(personalWorkspaceText, /Acting as: Personal \/ independent/i);
    assert.match(personalWorkspaceText, /Opportunities[\s\S]*Matches[\s\S]*Deals[\s\S]*Obligations[\s\S]*Evidence[\s\S]*Consent and verification/i);
    assert.doesNotMatch(personalWorkspaceText, /\bMandates\b|\bApprovals\b|\bFunds\b|\bIntegrations\b/i);
    const mobileOverflow = await namedPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(mobileOverflow <= 1, `Individual mobile workspace has horizontal overflow: ${mobileOverflow}px.`);
    await screenshot(namedPage, "individual-reduced-workspace-mobile");

    const namedDesktopPage = await namedContext.newPage();
    observePage(namedDesktopPage, "named-desktop");
    await namedDesktopPage.setViewportSize({ width: 1440, height: 1000 });
    await namedDesktopPage.goto(`${baseUrl}/institutions/individual`);
    const desktopWorkspaceText = await namedDesktopPage.locator("body").innerText();
    assert.match(desktopWorkspaceText, /Acting as: Personal \/ independent/i);
    assert.match(desktopWorkspaceText, /Opportunities[\s\S]*Matches[\s\S]*Deals[\s\S]*Obligations[\s\S]*Evidence[\s\S]*Consent and verification/i);
    assert.doesNotMatch(desktopWorkspaceText, /\bMandates\b|\bApprovals\b|\bFunds\b|\bIntegrations\b/i);
    const desktopOverflow = await namedDesktopPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 1, `Individual desktop workspace has horizontal overflow: ${desktopOverflow}px.`);
    await screenshot(namedDesktopPage, "individual-reduced-workspace-desktop");
    await namedDesktopPage.close();
    record("Desktop/mobile individual navigation omits organization-only controls", "passed");

    const forbiddenOrganizationResponse = await namedPage.goto(`${baseUrl}/institutions/${value.orgA.id}`);
    assert.ok([200, 404].includes(forbiddenOrganizationResponse?.status() ?? 0));
    const forbiddenOrganizationText = await namedPage.locator("body").innerText();
    assert.doesNotMatch(forbiddenOrganizationText, /Open workspace|Create a program|Create a commitment account|Enterprise integrations/i);
    record("Individual direct access to another organization's controls is denied", "passed");

    await namedPage.goto(`${baseUrl}/institutions/${value.orgB.id}`);
    const organizationWorkspaceText = await namedPage.locator("body").innerText();
    assert.match(organizationWorkspaceText, /Mandates/i);
    assert.match(organizationWorkspaceText, /Funds/i);
    assert.match(organizationWorkspaceText, /Enterprise integrations/i);
    record("Organization member can switch to exact organization capacity without authority leakage", "passed");

    await namedPage.goto(`${baseUrl}/institutions/individual/deals/${value.personalDeal.id}`);
    const personalDealText = await namedPage.locator("body").innerText();
    assert.match(personalDealText, /Sign for myself/i);
    assert.doesNotMatch(personalDealText, /Reserve financial capacity|Enterprise integrations|Request organizational approval/i);
    const personalSignForm = namedPage.locator("form").filter({ has: namedPage.getByRole("button", { name: "Sign for myself" }) }).first();
    await personalSignForm.getByRole("button", { name: "Sign for myself" }).click();
    await namedPage.waitForLoadState("networkidle");
    assert.match(await namedPage.locator("body").innerText(), /Signature recorded|Signed/i);
    record("Individual signs exact terms for themselves without an authority grant", "passed");

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

async function transitionDeal(client, dealId, stage, label) {
  const result = await client.rpc("transition_institutional_deal_stage", {
    target_deal_id: dealId,
    target_stage: stage,
  });
  if (result.error) throw result.error;
  record(label, "passed", { dealId, stage });
}

async function updateExactStatus(client, table, id, values, label) {
  const result = await client.from(table).update(values).eq("id", id).select("id").single();
  if (result.error) throw result.error;
  record(label, "passed", { table, id, ...values });
}

async function submitExactEvidence(client, values, label) {
  const result = await client
    .from("institutional_evidence_submissions")
    .insert(values)
    .select("id,status")
    .single();
  if (result.error) throw result.error;
  record(label, "passed", { submissionId: result.data.id, status: result.data.status });
  return result.data.id;
}

async function reviewExactEvidence(value, submissionId, dealId, label) {
  const result = await value.clients.verifier.rpc("review_institutional_evidence", {
    target_submission_id: submissionId,
    target_deal_id: dealId,
    target_status: "accepted",
    target_review_note: "Exact relationship and external-transfer boundary verified in synthetic QA.",
    target_organization_id: null,
    target_program_id: null,
    target_authority_grant_id: null,
  });
  if (result.error) throw result.error;
  record(label, "passed", { submissionId });
}

async function completeOrganizationWorkflow(value) {
  await transitionDeal(value.clients.lead, value.deal.id, "execution", "Organization-led deal enters execution under exact-scope authority");
  await expectDatabaseFailure(
    "Milestone cannot complete before required evidence is accepted",
    () => value.clients.lead.from("institutional_milestones").update({ status: "completed" }).eq("id", value.milestone.id),
    /evidence requirements must be satisfied/i,
  );
  await expectDatabaseFailure(
    "Obligation cannot complete before milestones and evidence are accepted",
    () => value.clients.lead.from("institutional_obligations").update({ status: "completed" }).eq("id", value.obligation.id),
    /milestones must be verified, completed, or waived/i,
  );

  const workEvidenceId = await submitExactEvidence(value.clients.named, {
    deal_id: value.deal.id,
    proposal_version_id: value.proposal.id,
    obligation_id: value.obligation.id,
    milestone_id: value.milestone.id,
    requirement_id: value.evidenceRequirement.id,
    submitted_by: value.named.id,
    evidence: {
      type: "attestation",
      synthetic: true,
      completion: "Named grantmaker work completed under the selected exact terms.",
    },
  }, "Named participant submits exact secondment evidence");
  const fundingEvidenceId = await submitExactEvidence(value.clients.finance, {
    deal_id: value.deal.id,
    proposal_version_id: value.proposal.id,
    obligation_id: value.fundingObligation.id,
    milestone_id: value.fundingMilestone.id,
    requirement_id: value.fundingEvidenceRequirement.id,
    submitted_by: value.finance.id,
    evidence: {
      type: "external_transfer_receipt",
      synthetic: true,
      provider_reference: `qa-external-transfer-org-${runId}`,
      custody: "none",
      statement: "Funds moved directly through the parties' existing provider; Moral Trade did not hold or route funds.",
    },
  }, "Finance representative submits direct external-transfer evidence");

  await transitionDeal(value.clients.lead, value.deal.id, "evidence_review", "Organization-led deal enters evidence review");
  await reviewExactEvidence(value, workEvidenceId, value.deal.id, "Independent verifier accepts exact secondment evidence");
  await reviewExactEvidence(value, fundingEvidenceId, value.deal.id, "Independent verifier accepts direct-transfer evidence");
  const now = new Date().toISOString();
  await updateExactStatus(value.clients.lead, "institutional_milestones", value.milestone.id, { status: "completed", completed_at: now }, "Secondment milestone completes after evidence acceptance");
  await updateExactStatus(value.clients.lead, "institutional_milestones", value.fundingMilestone.id, { status: "completed", completed_at: now }, "External-transfer milestone completes after evidence acceptance");
  await updateExactStatus(value.clients.lead, "institutional_obligations", value.obligation.id, { status: "completed" }, "Named-person secondment obligation completes after milestone and evidence acceptance");
  await updateExactStatus(value.clients.lead, "institutional_obligations", value.fundingObligation.id, { status: "completed" }, "Direct external funding obligation completes without custody after evidence acceptance");
  await transitionDeal(value.clients.lead, value.deal.id, "completed", "Organization-led deal completes after exact evidence acceptance");

  const state = await admin
    .from("institutional_deals")
    .select("stage,completed_at")
    .eq("id", value.deal.id)
    .single();
  if (state.error) throw state.error;
  assert.equal(state.data.stage, "completed");
  assert.ok(state.data.completed_at);
  const requirements = await admin
    .from("institutional_evidence_requirements")
    .select("id,status")
    .in("id", [value.evidenceRequirement.id, value.fundingEvidenceRequirement.id]);
  if (requirements.error) throw requirements.error;
  assert.deepEqual(new Set(requirements.data.map((row) => row.status)), new Set(["satisfied"]));
  record("Organization-led positive workflow reaches verified completion", "passed");
}

async function completeIndependentWorkflow(value) {
  const verifierDecision = await value.clients.verifier.rpc("accept_institutional_verifier_assignment", {
    target_assignment_id: value.personalVerifierAssignment.id,
    target_decision: "accepted",
    target_conflict_declaration: "No conflict for the synthetic independent workflow.",
  });
  if (verifierDecision.error) throw verifierDecision.error;
  record("Independent verifier accepts the personal-capacity assignment", "passed");

  const browser = await chromium.launch({ headless: true });
  try {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const independentPage = await mobileContext.newPage();
    observePage(independentPage, "independent-mobile-signature");
    await login(independentPage, value.independent, `/institutions/individual/deals/${value.personalDeal.id}`);
    await ensureMfa(independentPage, value.independent);
    await independentPage.goto(`${baseUrl}/institutions/individual/deals/${value.personalDeal.id}`);
    const body = await independentPage.locator("body").innerText();
    assert.match(body, /Acting as: Personal \/ independent/i);
    assert.doesNotMatch(body, /Institutional funds|Delegated authority|Enterprise integrations/i);
    const signForm = independentPage.locator("form").filter({ has: independentPage.getByRole("button", { name: "Sign for myself" }) }).first();
    await signForm.getByRole("button", { name: "Sign for myself" }).click();
    await independentPage.waitForLoadState("networkidle");
    assert.match(await independentPage.locator("body").innerText(), /Signature recorded|Signed/i);
    const overflow = await independentPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `Independent mobile deal has horizontal overflow: ${overflow}px.`);
    await screenshot(independentPage, "independent-counterparty-mobile-signature");
    await mobileContext.close();
  } finally {
    await browser.close();
  }

  const signed = await admin.from("institutional_deals").select("stage,signed_at").eq("id", value.personalDeal.id).single();
  if (signed.error) throw signed.error;
  assert.equal(signed.data.stage, "signed");
  assert.ok(signed.data.signed_at);
  record("Both independent individuals sign the selected exact terms", "passed");

  await transitionDeal(value.clients.named, value.personalDeal.id, "execution", "Independent-individual-led deal enters execution");

  const workEvidenceId = await submitExactEvidence(value.clients.named, {
    deal_id: value.personalDeal.id,
    proposal_version_id: value.personalProposal.id,
    obligation_id: value.personalObligation.id,
    milestone_id: value.personalMilestone.id,
    requirement_id: value.personalEvidenceRequirement.id,
    submitted_by: value.named.id,
    evidence: { type: "document", synthetic: true, work_log: "Twenty independently controlled research hours completed." },
  }, "Independent lead submits exact work evidence");
  const transferEvidenceId = await submitExactEvidence(value.clients.independent, {
    deal_id: value.personalDeal.id,
    proposal_version_id: value.personalProposal.id,
    obligation_id: value.personalFundingObligation.id,
    milestone_id: value.personalFundingMilestone.id,
    requirement_id: value.personalFundingEvidenceRequirement.id,
    submitted_by: value.independent.id,
    evidence: {
      type: "external_transfer_receipt",
      synthetic: true,
      provider_reference: `qa-external-transfer-personal-${runId}`,
      custody: "none",
    },
  }, "Independent counterparty submits direct external-transfer evidence");

  await transitionDeal(value.clients.named, value.personalDeal.id, "evidence_review", "Independent-individual-led deal enters evidence review");
  await reviewExactEvidence(value, workEvidenceId, value.personalDeal.id, "Independent verifier accepts personal work evidence");
  await reviewExactEvidence(value, transferEvidenceId, value.personalDeal.id, "Independent verifier accepts personal transfer evidence");
  const now = new Date().toISOString();
  await updateExactStatus(value.clients.named, "institutional_milestones", value.personalMilestone.id, { status: "completed", completed_at: now }, "Independent research milestone completes after evidence acceptance");
  await updateExactStatus(value.clients.named, "institutional_milestones", value.personalFundingMilestone.id, { status: "completed", completed_at: now }, "Independent external-transfer milestone completes after evidence acceptance");
  await updateExactStatus(value.clients.named, "institutional_obligations", value.personalObligation.id, { status: "completed" }, "Independent research obligation completes after milestone and evidence acceptance");
  await updateExactStatus(value.clients.named, "institutional_obligations", value.personalFundingObligation.id, { status: "completed" }, "Independent direct-funding obligation completes after evidence acceptance");
  await transitionDeal(value.clients.named, value.personalDeal.id, "completed", "Independent-individual-led deal completes after exact evidence acceptance");

  const state = await admin.from("institutional_deals").select("stage,completed_at").eq("id", value.personalDeal.id).single();
  if (state.error) throw state.error;
  assert.equal(state.data.stage, "completed");
  assert.ok(state.data.completed_at);
  record("Independent-individual-led positive workflow reaches verified completion", "passed");
}

async function reviewCompletedWorkflows(value) {
  const browser = await chromium.launch({ headless: true });
  try {
    const orgDesktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const orgPage = await orgDesktop.newPage();
    observePage(orgPage, "organization-completed-desktop");
    await login(orgPage, value.lead, `/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    await orgPage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.deal.id}`);
    const orgText = await orgPage.locator("body").innerText();
    assert.match(orgText, /Completed/i);
    assert.match(orgText, /direct external|does not custody|does not hold/i);
    await screenshot(orgPage, "organization-workflow-completed-desktop");
    await orgDesktop.close();

    const orgMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const orgMobilePage = await orgMobile.newPage();
    observePage(orgMobilePage, "organization-completed-mobile");
    await login(orgMobilePage, value.named, `/institutions/${value.orgB.id}/deals/${value.deal.id}`);
    await orgMobilePage.goto(`${baseUrl}/institutions/${value.orgB.id}/deals/${value.deal.id}`);
    assert.match(await orgMobilePage.locator("body").innerText(), /Completed/i);
    assert.ok((await orgMobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
    await screenshot(orgMobilePage, "organization-workflow-completed-mobile");
    await orgMobile.close();

    const personalDesktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const personalPage = await personalDesktop.newPage();
    observePage(personalPage, "personal-completed-desktop");
    await login(personalPage, value.named, `/institutions/individual/deals/${value.personalDeal.id}`);
    await personalPage.goto(`${baseUrl}/institutions/individual/deals/${value.personalDeal.id}`);
    const personalText = await personalPage.locator("body").innerText();
    assert.match(personalText, /Completed/i);
    assert.match(personalText, /direct external|does not custody|does not hold/i);
    assert.doesNotMatch(personalText, /Delegated authority|Approval committees|Enterprise integrations/i);
    await screenshot(personalPage, "independent-workflow-completed-desktop");
    await personalDesktop.close();

    const personalMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const personalMobilePage = await personalMobile.newPage();
    observePage(personalMobilePage, "personal-completed-mobile");
    await login(personalMobilePage, value.independent, `/institutions/individual/deals/${value.personalDeal.id}`);
    await personalMobilePage.goto(`${baseUrl}/institutions/individual/deals/${value.personalDeal.id}`);
    const personalMobileText = await personalMobilePage.locator("body").innerText();
    assert.match(personalMobileText, /Completed/i);
    assert.doesNotMatch(personalMobileText, /Delegated authority|Approval committees|Enterprise integrations/i);
    assert.ok((await personalMobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
    await screenshot(personalMobilePage, "independent-workflow-completed-mobile");
    await personalMobile.close();

    const poolDesktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const poolPage = await poolDesktop.newPage();
    observePage(poolPage, "collective-active-desktop");
    await login(poolPage, value.lead, `/institutions/${value.orgA.id}/deals/${value.poolDeal.id}`);
    await poolPage.goto(`${baseUrl}/institutions/${value.orgA.id}/deals/${value.poolDeal.id}#pool`);
    assert.match(await poolPage.locator("body").innerText(), /Active|Anchor|Underwriting|Governance/i);
    await screenshot(poolPage, "collective-coordination-active-desktop");
    await poolDesktop.close();
  } finally {
    await browser.close();
  }
  record("Organization, independent, and collective interfaces pass rendered desktop/mobile review", "passed");
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
  "institutional_attribution_claims",
  "institutional_report_snapshots",
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
    for (const id of createdUserIds) {
      const result = await admin.rpc("cleanup_one_person_qa_fixture_v1", {
        p_profile_id: id,
        p_qa_run_id: runId,
      });
      if (result.error) {
        throw new Error(`cleanup_one_person_qa_fixture_v1 ${id}: ${result.error.message}`);
      }
    }
  }
}

async function verifyZeroSyntheticResidue() {
  const residue = {};
  residue.institutional_deals = await countByIds("institutional_deals", "id", createdDealIds);
  residue.institutional_organizations = await countByIds("institutional_organizations", "id", createdOrganizationIds);
  residue.institutional_individual_profiles = await countByIds("institutional_individual_profiles", "profile_id", createdUserIds);
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
  residue["institutional_dispute_events.actor_profile_id"] = await countByIds(
    "institutional_dispute_events",
    "actor_profile_id",
    createdUserIds,
  );
  residue["institutional_command_drafts.profile_id"] = await countByIds(
    "institutional_command_drafts",
    "profile_id",
    createdUserIds,
  );
  residue["institutional_command_drafts.organization_id"] = await countByIds(
    "institutional_command_drafts",
    "organization_id",
    createdOrganizationIds,
  );
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
  await authorizationSnapshotChecks(fixture);
  await personalCapacityChecks(fixture);
  await relationshipAndDatabaseNegativeChecks(fixture);
  await authenticatedNegativeChecksBeforeSelection(fixture);
  await browserFlow(fixture);
  await verifyAcceptedEvidenceAccess(fixture);
  await signedImmutabilityChecks(fixture);
  await completeOrganizationWorkflow(fixture);
  await completeIndependentWorkflow(fixture);
  await completeAtomicPoolFlow(fixture);
  await reviewCompletedWorkflows(fixture);
  assert.deepEqual(browserErrors, [], `Relevant browser errors: ${JSON.stringify(browserErrors)}`);
  record("Institutional authenticated organization, independent, and collective QA suite", "passed");
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
