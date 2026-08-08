"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { isInstitutionalFeatureEnabled } from "@/lib/institutional-feature-gates";
import {
  INSTITUTIONAL_DEAL_STAGES,
  INSTITUTIONAL_PARTY_CAPACITIES,
  INSTITUTIONAL_PERMISSIONS,
  INSTITUTIONAL_RESOURCE_TYPES,
  INSTITUTIONAL_RISK_CATEGORIES,
  INSTITUTIONAL_RISK_SEVERITIES,
  hashInstitutionalTerms,
  isPersonalInstitutionalCapacity,
  parseInstitutionalMoneyToCents,
  validateSupportedInstitutionalWebhookEvents,
  type InstitutionalPartyCapacity,
} from "@/lib/institutional-trade";
import {
  assertInstitutionalIntegrationConfigHasNoSecrets,
  validateInstitutionalWebhookDestination,
} from "@/lib/institutional-webhooks";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_RETURN_PREFIXES = ["/institutions", "/admin/institutional-deal-desk"];

function value(formData: FormData, name: string, required = false) {
  const normalized = String(formData.get(name) ?? "").trim();
  if (required && !normalized) throw new Error(`${name.replaceAll(/([A-Z])/g, " $1").trim()} is required.`);
  return normalized;
}

function uuid(formData: FormData, name: string, required = false) {
  const normalized = value(formData, name, required);
  if (!normalized) return null;
  if (!UUID_PATTERN.test(normalized)) throw new Error(`${name} must be a valid identifier.`);
  return normalized;
}

function nullable(valueToNormalize: string) {
  return valueToNormalize || null;
}

function bool(formData: FormData, name: string) {
  return ["1", "true", "on", "yes"].includes(value(formData, name).toLowerCase());
}

function partyCapacity(formData: FormData, name = "partyCapacity", fallback: InstitutionalPartyCapacity = "organization") {
  const candidate = value(formData, name) || fallback;
  if (!INSTITUTIONAL_PARTY_CAPACITIES.includes(candidate as InstitutionalPartyCapacity)) {
    throw new Error("Unsupported institutional acting capacity.");
  }
  return candidate as InstitutionalPartyCapacity;
}

function actingCapacity(formData: FormData) {
  const candidate = value(formData, "actingCapacity", true);
  if (!INSTITUTIONAL_PARTY_CAPACITIES.includes(candidate as InstitutionalPartyCapacity)) {
    throw new Error("Unsupported institutional acting capacity.");
  }
  return candidate as InstitutionalPartyCapacity;
}

function requirePersonalCapacitySelection(formData: FormData) {
  const capacity = actingCapacity(formData);
  if (!isPersonalInstitutionalCapacity(capacity)) {
    throw new Error("Switch to personal / independent capacity before using this action.");
  }
  return capacity;
}

function integer(formData: FormData, name: string, fallback?: number) {
  const normalized = value(formData, name);
  if (!normalized && fallback !== undefined) return fallback;
  if (!/^-?\d+$/.test(normalized)) throw new Error(`${name} must be an integer.`);
  return Number(normalized);
}

function json(formData: FormData, name: string, fallback: unknown = {}) {
  const normalized = value(formData, name);
  if (!normalized) return fallback;
  try { return JSON.parse(normalized); }
  catch { throw new Error(`${name} must contain valid JSON.`); }
}

function stringArray(formData: FormData, name: string) {
  const direct = formData.getAll(name).map(String).map((item) => item.trim()).filter(Boolean);
  if (direct.length > 1) return [...new Set(direct)];
  return [...new Set((direct[0] ?? "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
}

function oneOf<const T extends readonly string[]>(
  formData: FormData,
  name: string,
  allowed: T,
  fallback?: T[number],
): T[number] {
  const candidate = value(formData, name) || fallback || "";
  if (!allowed.includes(candidate as T[number])) {
    throw new Error(`${name} has an unsupported value.`);
  }
  return candidate as T[number];
}

function allowedStringArray<const T extends readonly string[]>(formData: FormData, name: string, allowed: T) {
  const values = stringArray(formData, name);
  const unsupported = values.filter((item) => !allowed.includes(item as T[number]));
  if (unsupported.length) throw new Error(`${name} contains unsupported values: ${unsupported.join(", ")}.`);
  return values as T[number][];
}

const LEGAL_ENTITY_STATUSES = ["active", "inactive", "pending_verification"] as const;
const MEMBERSHIP_ROLES = ["owner", "administrator", "deal_manager", "approver", "signatory", "finance", "reviewer", "auditor", "viewer", "member"] as const;
const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "revoked"] as const;
const APPROVAL_POLICY_STATUSES = ["draft", "active", "retired"] as const;
const VERIFICATION_SUBJECT_TYPES = ["organization", "legal_entity", "program", "representative", "authority", "payment_account"] as const;
const VERIFICATION_FACETS = ["domain_control", "legal_entity", "representative_identity", "authority", "payment_account", "enhanced_review"] as const;
const MATCH_INTERESTS = ["interested", "declined", "needs_information"] as const;
const DEAL_MESSAGE_VISIBILITIES = ["all_parties", "party_internal", "operator_only"] as const;
const DEAL_ROOM_ACCESS_SCOPES = ["all_parties", "party_internal", "finance", "legal", "risk", "evidence", "operator"] as const;
const PARTICIPANT_DEAL_ROOM_ACCESS_SCOPES = ["all_parties", "party_internal", "finance", "legal", "risk", "evidence"] as const;
const OBLIGATION_DEPENDENCY_TYPES = ["must_complete_before", "activates", "blocks", "evidence_for"] as const;
const OBLIGATION_STATUSES = ["pending", "active", "blocked", "completed", "failed", "waived", "terminated"] as const;
const MILESTONE_STATUSES = ["pending", "in_progress", "submitted", "verified", "completed", "overdue", "waived", "failed"] as const;
const EVIDENCE_REVIEW_STATUSES = ["accepted", "needs_revision", "rejected"] as const;
const RISK_STATUSES = ["open", "needs_information", "mitigated", "accepted", "blocked", "closed"] as const;
const RISK_VISIBILITIES = ["all_parties", "party_internal", "operator_only"] as const;
const AMENDMENT_DECISIONS = ["approved", "rejected", "withdrawn"] as const;
const ATTRIBUTION_STATUSES = ["proposed", "approved", "rejected", "withdrawn"] as const;
const ATTRIBUTION_VISIBILITIES = ["private", "embargoed", "public", "anonymized"] as const;
const POOL_ACTIVATION_RULES = ["threshold_only", "governance_vote_and_threshold", "unanimous", "operator_confirmed"] as const;
const POOL_GOVERNANCE_RULES = ["one_organization_one_vote", "contribution_weighted", "unanimous", "custom"] as const;
const POOL_TERM_EDITABLE_STATUSES = ["draft", "open", "ready"] as const;
const TEMPLATE_STATUSES = ["draft", "active", "retired"] as const;
const FRAMEWORK_STATUSES = ["draft", "active", "expired", "terminated"] as const;
const INTEGRATION_TYPES = ["webhook", "api", "esignature", "payment", "registry", "storage", "other"] as const;
const INTEGRATION_STATUSES = ["draft", "active", "disabled", "revoked"] as const;

function safeReturnTo(formData: FormData) {
  const candidate = value(formData, "returnTo") || "/institutions";
  if (!SAFE_RETURN_PREFIXES.some((prefix) => candidate === prefix || candidate.startsWith(`${prefix}/`) || candidate.startsWith(`${prefix}?`) || candidate.startsWith(`${prefix}#`))) return "/institutions";
  return candidate;
}

function redirectWith(returnTo: string, key: "message" | "error", text: string): never {
  const url = new URL(returnTo, "https://moraltrade.invalid");
  url.searchParams.set(key, text);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function requireEnabled(feature: "trades" | "pools" | "webhooks") {
  if (!isInstitutionalFeatureEnabled(feature)) throw new Error(`Institutional ${feature} are not enabled in this environment.`);
}

function dbError(error: any, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

async function requireProposalInDeal(client: any, dealId: string, proposalVersionId: string) {
  const result = await client.from("institutional_proposal_versions").select("id,deal_id,terms_hash,status").eq("id", proposalVersionId).eq("deal_id", dealId).maybeSingle();
  dbError(result.error, "Could not validate proposal relationship.");
  if (!result.data) throw new Error("Proposal version must belong to the same deal.");
  return result.data;
}

async function requirePartyInDeal(client: any, dealId: string, partyId: string) {
  const result = await client.from("institutional_deal_parties").select("id,deal_id,party_capacity,profile_id,organization_id,program_id,legal_entity_id,joined_at").eq("id", partyId).eq("deal_id", dealId).maybeSingle();
  dbError(result.error, "Could not validate party relationship.");
  if (!result.data) throw new Error("Party must belong to the same deal.");
  return result.data;
}

async function requireObligationInProposal(client: any, dealId: string, proposalVersionId: string, obligationId: string) {
  const result = await client.from("institutional_obligations").select("id,deal_id,proposal_version_id").eq("id", obligationId).eq("deal_id", dealId).eq("proposal_version_id", proposalVersionId).maybeSingle();
  dbError(result.error, "Could not validate obligation relationship.");
  if (!result.data) throw new Error("Obligation must belong to the same deal and exact proposal version.");
  return result.data;
}

async function requireObligationInDeal(client: any, dealId: string, obligationId: string) {
  const result = await client.from("institutional_obligations").select("id,deal_id,proposal_version_id").eq("id", obligationId).eq("deal_id", dealId).maybeSingle();
  dbError(result.error, "Could not validate obligation relationship.");
  if (!result.data) throw new Error("Obligation must belong to the same deal.");
  return result.data;
}

async function requireDisputeInDeal(client: any, dealId: string, disputeId: string) {
  const result = await client.from("institutional_disputes").select("id,deal_id").eq("id", disputeId).eq("deal_id", dealId).maybeSingle();
  dbError(result.error, "Could not validate dispute relationship.");
  if (!result.data) throw new Error("Dispute must belong to the same deal.");
  return result.data;
}

async function requireMilestoneInObligation(client: any, dealId: string, proposalVersionId: string, obligationId: string, milestoneId: string) {
  const result = await client.from("institutional_milestones").select("id,deal_id,proposal_version_id,obligation_id").eq("id", milestoneId).eq("deal_id", dealId).eq("proposal_version_id", proposalVersionId).eq("obligation_id", obligationId).maybeSingle();
  dbError(result.error, "Could not validate milestone relationship.");
  if (!result.data) throw new Error("Milestone must belong to the same deal, exact proposal, and obligation.");
  return result.data;
}

async function requireEvidenceRequirementRelationship(client: any, input: { dealId: string; proposalVersionId: string; obligationId: string; milestoneId: string | null; evidenceRequirementId: string }) {
  let query = client.from("institutional_evidence_requirements").select("id,deal_id,proposal_version_id,obligation_id,milestone_id").eq("id", input.evidenceRequirementId).eq("deal_id", input.dealId).eq("proposal_version_id", input.proposalVersionId).eq("obligation_id", input.obligationId);
  query = input.milestoneId ? query.eq("milestone_id", input.milestoneId) : query.is("milestone_id", null);
  const result = await query.maybeSingle();
  dbError(result.error, "Could not validate evidence requirement relationship.");
  if (!result.data) throw new Error("Evidence submission must match the same deal, exact proposal, obligation, milestone, and requirement.");
  return result.data;
}

async function requireOrganizationActingContext(
  client: any,
  viewerProfileId: string,
  organizationId: string,
  formData: FormData,
) {
  if (actingCapacity(formData) !== "organization") {
    throw new Error("Switch to the organization workspace before using organization-only controls.");
  }
  const actingOrganizationId = uuid(formData, "actingOrganizationId", true);
  if (actingOrganizationId !== organizationId) {
    throw new Error("The active organization context does not match the organization being represented.");
  }
  const membership = await client
    .from("institutional_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", viewerProfileId)
    .eq("status", "active")
    .is("revoked_at", null)
    .maybeSingle();
  dbError(membership.error, "Could not validate organization acting context.");
  if (!membership.data) throw new Error("Switch to an active organization workspace before using organization-only controls.");
}

async function requireExactOrganizationPermission(
  client: any,
  viewerProfileId: string,
  organizationId: string,
  programId: string | null,
  requiredPermissions: readonly string[],
  amountCents: number | null = null,
) {
  if (!requiredPermissions.length) return null;
  if (programId) {
    const program = await client
      .from("institutional_programs")
      .select("id")
      .eq("id", programId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    dbError(program.error, "Could not validate exact organization/program scope.");
    if (!program.data) throw new Error("The selected program does not belong to the active organization.");
  }

  const grants = await client
    .from("institutional_authority_grants")
    .select("id,organization_id,program_id,profile_id,permissions,amount_limit_cents,currency,authority_basis,valid_from,valid_until,revoked_at")
    .eq("organization_id", organizationId)
    .eq("profile_id", viewerProfileId)
    .is("revoked_at", null);
  dbError(grants.error, "Could not validate delegated organization authority.");
  const now = Date.now();
  const exactGrant = (grants.data ?? []).find((grant: any) => {
    if ((grant.program_id ?? null) !== programId) return false;
    if (!Array.isArray(grant.permissions) || !requiredPermissions.some((permission) => grant.permissions.includes(permission))) return false;
    const validFrom = Date.parse(String(grant.valid_from ?? ""));
    const validUntil = grant.valid_until ? Date.parse(String(grant.valid_until)) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(validFrom) || validFrom > now || validUntil <= now) return false;
    if (amountCents !== null && grant.amount_limit_cents !== null && Number(grant.amount_limit_cents) < amountCents) return false;
    return true;
  });
  if (!exactGrant) {
    throw new Error(`Exact-scope ${requiredPermissions.join(" or ")} authority is required for this organization/program action.`);
  }
  return exactGrant;
}

async function requireDealManagementActingContext(
  client: any,
  viewerProfileId: string,
  dealId: string,
  formData: FormData,
  requiredPermissions: readonly string[] = ["deal:manage", "deal:approve"],
) {
  const capacity = actingCapacity(formData);
  if (isPersonalInstitutionalCapacity(capacity)) {
    await requireActiveIndividualParticipation(client, viewerProfileId);
    const deal = await client
      .from("institutional_deals")
      .select("id,lead_capacity,lead_profile_id")
      .eq("id", dealId)
      .maybeSingle();
    dbError(deal.error, "Could not validate personal deal management context.");
    if (!deal.data || !isPersonalInstitutionalCapacity(deal.data.lead_capacity) || deal.data.lead_profile_id !== viewerProfileId) {
      throw new Error("Personal capacity may manage only a deal led by that same person.");
    }
    return { capacity, organizationId: null, programId: null, authorityGrant: null };
  }

  const organizationId = uuid(formData, "actingOrganizationId", true)!;
  const programId = uuid(formData, "actingProgramId");
  await requireOrganizationActingContext(client, viewerProfileId, organizationId, formData);
  let partyQuery = client
    .from("institutional_deal_parties")
    .select("id,program_id,joined_at,left_at")
    .eq("deal_id", dealId)
    .eq("party_capacity", "organization")
    .eq("organization_id", organizationId)
    .not("joined_at", "is", null)
    .is("left_at", null);
  partyQuery = programId ? partyQuery.eq("program_id", programId) : partyQuery.is("program_id", null);
  const party = await partyQuery.limit(1).maybeSingle();
  dbError(party.error, "Could not validate organization deal-party context.");
  if (!party.data) throw new Error("The active organization/program is not an accepted exact party to this deal.");
  const authorityGrant = await requireExactOrganizationPermission(
    client,
    viewerProfileId,
    organizationId,
    programId,
    requiredPermissions,
  );
  return { capacity, organizationId, programId, authorityGrant };
}

async function requirePartyActingContext(
  client: any,
  viewerProfileId: string,
  party: any,
  formData: FormData,
  requiredPermissions: readonly string[] = ["deal:manage"],
) {
  const capacity = actingCapacity(formData);
  if (isPersonalInstitutionalCapacity(party.party_capacity)) {
    if (!isPersonalInstitutionalCapacity(capacity) || party.profile_id !== viewerProfileId) {
      throw new Error("A personal-capacity party may be represented only by that same person.");
    }
    await requireActiveIndividualParticipation(client, viewerProfileId);
    return { capacity, organizationId: null, programId: null, authorityGrant: null };
  }

  if (capacity !== "organization" || !party.organization_id) {
    throw new Error("Switch to the exact organization party before representing it.");
  }
  const actingProgramId = uuid(formData, "actingProgramId");
  if ((party.program_id ?? null) !== actingProgramId) {
    throw new Error("The active organization program does not match the exact deal party scope.");
  }
  await requireOrganizationActingContext(client, viewerProfileId, party.organization_id, formData);
  const authorityGrant = await requireExactOrganizationPermission(
    client,
    viewerProfileId,
    party.organization_id,
    actingProgramId,
    requiredPermissions,
  );
  return { capacity, organizationId: party.organization_id, programId: actingProgramId, authorityGrant };
}

async function requireDealParticipationActingContext(
  client: any,
  viewerProfileId: string,
  dealId: string,
  formData: FormData,
  requiredPermissions: readonly string[] = ["deal:manage"],
) {
  const capacity = actingCapacity(formData);
  if (isPersonalInstitutionalCapacity(capacity)) {
    const personalParty = await client
      .from("institutional_deal_parties")
      .select("id")
      .eq("deal_id", dealId)
      .in("party_capacity", ["individual", "service_provider", "verifier"])
      .eq("profile_id", viewerProfileId)
      .not("joined_at", "is", null)
      .is("left_at", null)
      .limit(1)
      .maybeSingle();
    dbError(personalParty.error, "Could not validate personal deal participation.");

    const acceptedVerifier = await client
      .from("institutional_deal_room_members")
      .select("id,institutional_verifier_assignments!inner(status)")
      .eq("deal_id", dealId)
      .eq("profile_id", viewerProfileId)
      .eq("access_scope", "evidence")
      .is("revoked_at", null)
      .eq("institutional_verifier_assignments.status", "accepted")
      .limit(1)
      .maybeSingle();
    dbError(acceptedVerifier.error, "Could not validate accepted verifier access.");

    if (!personalParty.data && !acceptedVerifier.data) {
      throw new Error("Personal capacity may act only as an accepted named party or verifier for this deal.");
    }
    return { capacity, organizationId: null, programId: null, authorityGrant: null };
  }

  const organizationId = uuid(formData, "actingOrganizationId", true)!;
  const programId = uuid(formData, "actingProgramId");
  await requireOrganizationActingContext(client, viewerProfileId, organizationId, formData);
  let partyQuery = client
    .from("institutional_deal_parties")
    .select("id,program_id")
    .eq("deal_id", dealId)
    .eq("party_capacity", "organization")
    .eq("organization_id", organizationId)
    .not("joined_at", "is", null)
    .is("left_at", null);
  partyQuery = programId ? partyQuery.eq("program_id", programId) : partyQuery.is("program_id", null);
  const party = await partyQuery.limit(1).maybeSingle();
  dbError(party.error, "Could not validate organization deal participation.");
  if (!party.data) throw new Error("The active organization/program is not an accepted exact party to this deal.");

  let authorityGrant = null;
  if (requiredPermissions.length) {
    authorityGrant = await requireExactOrganizationPermission(
      client,
      viewerProfileId,
      organizationId,
      programId,
      requiredPermissions,
    );
  }
  return { capacity, organizationId, programId, authorityGrant };
}

async function requireApprovalOrganization(client: any, approvalId: string) {
  const approval = await client
    .from("institutional_approvals")
    .select("id,organization_id,program_id")
    .eq("id", approvalId)
    .maybeSingle();
  dbError(approval.error, "Could not validate approval organization.");
  if (!approval.data) throw new Error("Approval does not exist or is not visible in the active organization context.");
  return approval.data;
}

async function requireActiveIndividualParticipation(client: any, viewerProfileId: string) {
  const participation = await client
    .from("institutional_individual_profiles")
    .select("profile_id,status")
    .eq("profile_id", viewerProfileId)
    .eq("status", "active")
    .maybeSingle();
  dbError(participation.error, "Could not validate independent institutional participation.");
  if (!participation.data) throw new Error("Enable independent institutional participation before acting in a personal capacity.");
}

async function requireBudgetAccountOrganization(client: any, budgetAccountId: string) {
  const account = await client
    .from("institutional_budget_accounts")
    .select("id,organization_id,program_id")
    .eq("id", budgetAccountId)
    .maybeSingle();
  dbError(account.error, "Could not validate institutional budget account.");
  if (!account.data) throw new Error("Institutional budget account is not visible in the active organization context.");
  return account.data;
}

async function requireIntegrationOrganization(client: any, integrationId: string) {
  const integration = await client
    .from("institutional_integrations")
    .select("id,organization_id,program_id")
    .eq("id", integrationId)
    .maybeSingle();
  dbError(integration.error, "Could not validate integration organization.");
  if (!integration.data) throw new Error("Integration does not exist or is not visible in the active organization context.");
  return integration.data;
}

async function operatorContext() {
  const [viewer, security] = await Promise.all([
    requireViewer("/admin/institutional-deal-desk"),
    loadBackgroundAccountSecuritySummary(),
  ]);
  const access = evaluateAdminOperatorAccess({ email: viewer.authUser.email, mfaSummary: security });
  if (!access.allowed) throw new Error(access.message);
  return { viewer, client: createServiceClient() as any };
}

export async function runInstitutionalAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const actionType = value(formData, "actionType", true);
  try {
    const viewer = await requireViewer(returnTo);
    const client = (await createClient()) as any;
    requireEnabled(actionType.includes("pool") ? "pools" : actionType.includes("webhook") ? "webhooks" : "trades");

    switch (actionType) {
      case "enable_individual_participation": {
        requirePersonalCapacitySelection(formData);
        const result = await client.from("institutional_individual_profiles").upsert({
          profile_id: viewer.authUser.id,
          status: "active",
          headline: value(formData, "headline"),
          summary: value(formData, "summary"),
          participation_roles: stringArray(formData, "participationRoles"),
          visibility: value(formData, "visibility") || "private",
        }, { onConflict: "profile_id" });
        dbError(result.error, "Could not enable independent institutional participation.");
        revalidatePath("/institutions/individual");
        redirectWith("/institutions/individual", "message", "Independent institutional participation enabled. You can bind only yourself and resources you personally control.");
      }
      case "pause_individual_participation": {
        requirePersonalCapacitySelection(formData);
        const result = await client.from("institutional_individual_profiles").update({ status: "paused" }).eq("profile_id", viewer.authUser.id);
        dbError(result.error, "Could not pause independent institutional participation.");
        revalidatePath("/institutions/individual");
        redirectWith("/institutions/individual", "message", "Independent institutional participation paused. Existing signed obligations remain unchanged.");
      }
      case "create_organization": {
        const slug = value(formData, "slug", true).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
        const organizationResult = await client.from("institutional_organizations").insert({
          created_by: viewer.authUser.id,
          slug,
          display_name: value(formData, "displayName", true),
          legal_name: nullable(value(formData, "legalName")),
          organization_type: value(formData, "organizationType", true),
          summary: value(formData, "summary"),
          website_url: nullable(value(formData, "websiteUrl")),
          official_domain: nullable(value(formData, "officialDomain").toLowerCase()),
          jurisdiction: nullable(value(formData, "jurisdiction")),
          registration_number: nullable(value(formData, "registrationNumber")),
        }).select("id").single();
        dbError(organizationResult.error, "Could not create organization.");
        const organizationId = organizationResult.data.id;
        const membershipResult = await client.from("institutional_memberships").insert({
          organization_id: organizationId,
          profile_id: viewer.authUser.id,
          role: "owner",
          permissions: [],
          status: "active",
          accepted_at: new Date().toISOString(),
          invited_by: viewer.authUser.id,
        });
        dbError(membershipResult.error, "Could not create owner membership.");
        const grantResult = await client.from("institutional_authority_grants").insert({
          organization_id: organizationId,
          program_id: null,
          profile_id: viewer.authUser.id,
          granted_by: viewer.authUser.id,
          permissions: ["organization:manage", "program:manage", "mandate:manage", "opportunity:manage", "deal:manage", "deal:approve", "deal:sign", "finance:manage", "finance:reserve", "finance:release", "risk:review", "evidence:review", "completion:confirm", "pool:manage", "pool:approve", "pool:activate", "integration:manage"],
          authority_basis: "Founding organization owner; replace with reviewed scoped grants before binding institutional activity.",
          currency: "usd",
        });
        dbError(grantResult.error, "Could not create founding authority grant.");
        revalidatePath("/institutions");
        redirectWith(`/institutions/${organizationId}`, "message", "Organization workspace created. Identity and authority remain fact-specific and unverified until reviewed.");
      }

      case "create_legal_entity": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, null, ["organization:manage"]);
        const result = await client.from("institutional_legal_entities").insert({
          organization_id: organizationId,
          legal_name: value(formData, "legalName", true),
          entity_type: value(formData, "entityType", true),
          jurisdiction: nullable(value(formData, "jurisdiction")),
          registration_number: nullable(value(formData, "registrationNumber")),
          registered_address: json(formData, "registeredAddress", {}),
          fiscal_sponsor_organization_id: uuid(formData, "fiscalSponsorOrganizationId"),
          status: oneOf(formData, "status", LEGAL_ENTITY_STATUSES, "pending_verification"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create legal entity record.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Legal counterparty recorded. This does not verify the entity or authorize a representative.");
      }
      case "invite_membership": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, null, ["organization:manage"]);
        const profileId = uuid(formData, "profileId", true)!;
        const result = await client.from("institutional_memberships").upsert({
          organization_id: organizationId,
          profile_id: profileId,
          role: oneOf(formData, "role", MEMBERSHIP_ROLES, "member"),
          permissions: allowedStringArray(formData, "permissions", INSTITUTIONAL_PERMISSIONS),
          status: oneOf(formData, "status", MEMBERSHIP_STATUSES, "invited"),
          invited_by: viewer.authUser.id,
          accepted_at: value(formData, "status") === "active" ? new Date().toISOString() : null,
          revoked_at: null,
        }, { onConflict: "organization_id,profile_id" });
        dbError(result.error, "Could not invite organization member.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Membership record updated. Membership alone does not grant delegated authority.");
      }
      case "create_authority_grant": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, null, ["organization:manage"]);
        const result = await client.from("institutional_authority_grants").insert({
          organization_id: organizationId,
          program_id: uuid(formData, "programId"),
          profile_id: uuid(formData, "profileId", true),
          permissions: allowedStringArray(formData, "permissions", INSTITUTIONAL_PERMISSIONS),
          amount_limit_cents: value(formData, "amountLimit") ? parseInstitutionalMoneyToCents(formData.get("amountLimit")) : null,
          currency: (value(formData, "currency") || "usd").toLowerCase(),
          authority_basis: value(formData, "authorityBasis", true),
          evidence_references: json(formData, "evidenceReferences", []),
          valid_from: value(formData, "validFrom") || new Date().toISOString(),
          valid_until: nullable(value(formData, "validUntil")),
          granted_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create scoped authority grant.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Exact-scope delegated authority recorded.");
      }
      case "create_approval_policy": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId");
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["program:manage"]);
        const result = await client.from("institutional_approval_policies").insert({
          organization_id: organizationId,
          program_id: programId,
          name: value(formData, "name", true),
          policy: json(formData, "policy", {}),
          status: oneOf(formData, "status", APPROVAL_POLICY_STATUSES, "draft"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create approval policy.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Approval policy recorded; it cannot substitute for named-person consent or signing authority.");
      }
      case "request_verification": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, null, ["organization:manage"]);
        const result = await client.from("institutional_verification_records").insert({
          organization_id: organizationId,
          subject_type: oneOf(formData, "subjectType", VERIFICATION_SUBJECT_TYPES, "organization"),
          subject_id: uuid(formData, "subjectId", true),
          facet: oneOf(formData, "facet", VERIFICATION_FACETS),
          method: value(formData, "method", true),
          evidence_references: json(formData, "evidenceReferences", []),
          requested_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not request fact-specific verification.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Verification request submitted. Verification will not imply endorsement.");
      }
      case "generate_matches": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("generate_institutional_matches", { target_organization_id: organizationId });
        dbError(result.error, "Could not generate institutional matches.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", `${Number(result.data ?? 0)} compatible confidential match records generated or refreshed.`);
      }
      case "record_match_interest": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("record_institutional_match_interest", {
          target_match_id: uuid(formData, "matchId", true),
          target_organization_id: organizationId,
          target_interest: oneOf(formData, "interest", MATCH_INTERESTS),
        });
        dbError(result.error, "Could not record match interest.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Confidential match interest updated.");
      }
      case "create_program": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, null, ["organization:manage", "program:manage"]);
        const result = await client.from("institutional_programs").insert({
          organization_id: organizationId,
          legal_entity_id: uuid(formData, "legalEntityId"),
          slug: value(formData, "slug", true).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 80),
          name: value(formData, "name", true),
          summary: value(formData, "summary"),
          mandate_summary: value(formData, "mandateSummary"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create program.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Program created with its own scope boundary.");
      }
      case "create_mandate": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["mandate:manage"]);
        const result = await client.from("institutional_mandates").insert({
          organization_id: organizationId,
          program_id: programId,
          version: integer(formData, "version", 1),
          title: value(formData, "title", true),
          public_summary: value(formData, "publicSummary"),
          confidential_constraints: json(formData, "confidentialConstraints", {}),
          cause_scope: stringArray(formData, "causeScope"),
          permissible_resources: stringArray(formData, "permissibleResources"),
          prohibited_activities: stringArray(formData, "prohibitedActivities"),
          minimum_commitment_cents: value(formData, "minimumCommitment") ? parseInstitutionalMoneyToCents(formData.get("minimumCommitment")) : null,
          maximum_commitment_cents: value(formData, "maximumCommitment") ? parseInstitutionalMoneyToCents(formData.get("maximumCommitment")) : null,
          status: value(formData, "status") || "draft",
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create mandate version.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Versioned program mandate recorded.");
      }
      case "create_resource_profile": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["opportunity:manage"]);
        const result = await client.from("institutional_resource_profiles").insert({
          organization_id: organizationId,
          program_id: programId,
          direction: value(formData, "direction", true),
          resource_type: oneOf(formData, "resourceType", INSTITUTIONAL_RESOURCE_TYPES),
          title: value(formData, "title", true),
          description: value(formData, "description"),
          quantity: value(formData, "quantity") ? Number(value(formData, "quantity")) : null,
          unit: nullable(value(formData, "unit")),
          amount_min_cents: value(formData, "amountMin") ? parseInstitutionalMoneyToCents(formData.get("amountMin")) : null,
          amount_max_cents: value(formData, "amountMax") ? parseInstitutionalMoneyToCents(formData.get("amountMax")) : null,
          currency: nullable(value(formData, "currency").toLowerCase()),
          urgency: value(formData, "urgency") || "normal",
          confidentiality: value(formData, "confidentiality") || "confidential_matching",
          reservation_terms: json(formData, "reservationTerms", {}),
          qualifications: json(formData, "qualifications", {}),
          constraints: json(formData, "constraints", {}),
          status: "active",
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create resource profile.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Resource or bottleneck profile recorded.");
      }
      case "create_opportunity": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["opportunity:manage"]);
        const result = await client.from("institutional_opportunities").insert({
          organization_id: organizationId,
          program_id: programId,
          mandate_id: uuid(formData, "mandateId"),
          title: value(formData, "title", true),
          summary: value(formData, "summary"),
          offer_resource_profile_id: uuid(formData, "offerResourceProfileId"),
          seek_resource_profile_id: uuid(formData, "seekResourceProfileId"),
          moral_difference_statement: value(formData, "moralDifferenceStatement"),
          no_trade_summary: value(formData, "noTradeSummary", true),
          visibility: value(formData, "visibility") || "confidential_matching",
          status: value(formData, "status") || "draft",
          published_at: value(formData, "status") === "published" ? new Date().toISOString() : null,
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create institutional opportunity.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Institutional opportunity created with an explicit no-trade baseline summary.");
      }
      case "create_deal": {
        const selectedCapacity = actingCapacity(formData);
        if (selectedCapacity !== "individual" && selectedCapacity !== "organization") {
          throw new Error("A deal lead must act either as an individual or as an organization.");
        }
        const title = value(formData, "title", true);
        const summary = value(formData, "summary");
        const dealType = value(formData, "dealType") || "bilateral_trade";
        const classification = value(formData, "classification") || "unclassified";
        const visibility = value(formData, "visibility") || "parties_only";

        if (selectedCapacity === "individual") {
          await requireActiveIndividualParticipation(client, viewer.authUser.id);
          const result = await client.from("institutional_deals").insert({
            lead_capacity: "individual",
            lead_profile_id: viewer.authUser.id,
            lead_organization_id: null,
            lead_program_id: null,
            legal_counterparty_id: null,
            created_by: viewer.authUser.id,
            title,
            summary,
            deal_type: dealType,
            classification,
            stage: "draft",
            visibility,
          }).select("id").single();
          dbError(result.error, "Could not create personal-capacity institutional deal.");
          const dealId = result.data.id;
          const partyResult = await client.from("institutional_deal_parties").insert({
            deal_id: dealId,
            party_capacity: "individual",
            profile_id: viewer.authUser.id,
            organization_id: null,
            program_id: null,
            legal_entity_id: null,
            party_role: "lead",
            representative_profile_id: viewer.authUser.id,
            authority_status: "self_authorized",
            approval_status: "not_required",
            consent_status: "not_required",
            joined_at: new Date().toISOString(),
          }).select("id").single();
          dbError(partyResult.error, "Could not create personal lead party.");
          const roomResult = await client.from("institutional_deal_room_members").insert({
            deal_id: dealId,
            profile_id: viewer.authUser.id,
            party_id: partyResult.data.id,
            organization_id: null,
            access_scope: "all_parties",
            can_post: true,
            added_by: viewer.authUser.id,
          });
          dbError(roomResult.error, "Could not create personal deal-room membership.");
          revalidatePath("/institutions/individual");
          redirectWith(`/institutions/individual/deals/${dealId}`, "message", "Draft personal-capacity institutional deal created. Self authority applies only to you and resources you personally control.");
        }

        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["deal:manage"]);
        const result = await client.from("institutional_deals").insert({
          lead_capacity: "organization",
          lead_profile_id: null,
          lead_organization_id: organizationId,
          lead_program_id: programId,
          legal_counterparty_id: uuid(formData, "legalCounterpartyId"),
          created_by: viewer.authUser.id,
          title,
          summary,
          deal_type: dealType,
          classification,
          stage: "draft",
          visibility,
        }).select("id").single();
        dbError(result.error, "Could not create organization-capacity deal.");
        const dealId = result.data.id;
        const partyResult = await client.from("institutional_deal_parties").insert({
          deal_id: dealId,
          party_capacity: "organization",
          profile_id: null,
          organization_id: organizationId,
          program_id: programId,
          legal_entity_id: uuid(formData, "legalCounterpartyId"),
          party_role: "lead",
          representative_profile_id: viewer.authUser.id,
          authority_status: "verified_for_scope",
          approval_status: "pending",
          consent_status: "not_required",
          joined_at: new Date().toISOString(),
        }).select("id").single();
        dbError(partyResult.error, "Could not create lead organization party.");
        const roomResult = await client.from("institutional_deal_room_members").insert({
          deal_id: dealId,
          profile_id: viewer.authUser.id,
          party_id: partyResult.data.id,
          organization_id: organizationId,
          access_scope: "all_parties",
          can_post: true,
          added_by: viewer.authUser.id,
        });
        dbError(roomResult.error, "Could not create organization deal-room membership.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(`/institutions/${organizationId}/deals/${dealId}`, "message", "Draft organization-capacity institutional deal created.");
      }
      case "create_deal_party": {
        const capacity = partyCapacity(formData);
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const partyProfileId = uuid(formData, "partyProfileId");
        const partyOrganizationId = uuid(formData, "partyOrganizationId");
        const partyProgramId = uuid(formData, "partyProgramId");
        const legalEntityId = uuid(formData, "legalEntityId");

        if (capacity === "organization" && !partyOrganizationId) throw new Error("An organization party requires an organization.");
        if (isPersonalInstitutionalCapacity(capacity) && !partyProfileId) throw new Error("A personal-capacity party requires the named person's profile.");
        if (isPersonalInstitutionalCapacity(capacity) && (partyOrganizationId || partyProgramId || legalEntityId)) {
          throw new Error("A personal-capacity party cannot inherit an organization, program, or legal entity.");
        }

        const result = await client.from("institutional_deal_parties").insert({
          deal_id: dealId,
          party_capacity: capacity,
          profile_id: isPersonalInstitutionalCapacity(capacity) ? partyProfileId : null,
          organization_id: capacity === "organization" ? partyOrganizationId : null,
          program_id: capacity === "organization" ? partyProgramId : null,
          legal_entity_id: capacity === "organization" ? legalEntityId : null,
          party_role: value(formData, "partyRole", true),
          representative_profile_id: capacity === "organization" ? uuid(formData, "representativeProfileId") : partyProfileId,
          authority_status: capacity === "organization" ? (value(formData, "authorityStatus") || "pending") : "self_authorized",
          approval_status: capacity === "organization" ? "pending" : "not_required",
          consent_status: "not_required",
        });
        dbError(result.error, "Could not add deal party.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", capacity === "organization" ? "Exact organization/program party added." : "Named personal-capacity party invited without creating an organization.");
      }
      case "accept_deal_party": {
        requirePersonalCapacitySelection(formData);
        const result = await client.rpc("accept_institutional_deal_party", {
          target_party_id: uuid(formData, "partyId", true),
        });
        dbError(result.error, "Could not accept personal-capacity deal participation.");
        revalidatePath("/institutions/individual");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Personal-capacity participation accepted. You remain authorized only for yourself.");
      }
      case "create_proposal": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const terms = json(formData, "terms", {});
        const result = await client.from("institutional_proposal_versions").insert({
          deal_id: dealId,
          version: integer(formData, "version", 1),
          title: value(formData, "title", true),
          summary: value(formData, "summary"),
          terms,
          terms_hash: hashInstitutionalTerms(terms),
          status: value(formData, "status") || "draft",
          created_by: viewer.authUser.id,
          proposed_at: value(formData, "status") === "proposed" ? new Date().toISOString() : null,
        });
        dbError(result.error, "Could not create proposal version.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Immutable proposal version created.");
      }
      case "select_proposal": {
        const organizationId = uuid(formData, "organizationId");
        const programId = uuid(formData, "programId");
        if (!organizationId && programId) throw new Error("A personal-capacity selection cannot inherit an organization program.");
        if (organizationId) await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        else requirePersonalCapacitySelection(formData);
        const result = await client.rpc("select_institutional_proposal_version", {
          target_deal_id: uuid(formData, "dealId", true),
          target_proposal_version_id: uuid(formData, "proposalVersionId", true),
          target_organization_id: organizationId,
          target_program_id: programId,
        });
        dbError(result.error, "Could not select proposal.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Proposal selected and exact terms frozen.");
      }
      case "create_baseline": {
        const dealId = uuid(formData, "dealId", true)!;
        const partyId = uuid(formData, "partyId", true)!;
        const proposalVersionId = uuid(formData, "proposalVersionId");
        const party = await requirePartyInDeal(client, dealId, partyId);
        await requirePartyActingContext(client, viewer.authUser.id, party, formData);
        if (proposalVersionId) await requireProposalInDeal(client, dealId, proposalVersionId);

        const personalParty = isPersonalInstitutionalCapacity(party.party_capacity);
        const profileId = personalParty ? (uuid(formData, "profileId") ?? party.profile_id) : null;
        const organizationId = personalParty ? null : uuid(formData, "organizationId", true);
        const programId = personalParty ? null : uuid(formData, "programId");

        if (personalParty) {
          if (profileId !== party.profile_id) throw new Error("Baseline profile must exactly match the selected personal-capacity party.");
          if (uuid(formData, "organizationId") || uuid(formData, "programId")) throw new Error("A personal baseline cannot inherit organization or program scope.");
        } else if (party.organization_id !== organizationId || party.program_id !== programId) {
          throw new Error("Baseline organization/program scope must exactly match the selected organization party.");
        }

        const result = await client.from("institutional_counterfactual_baselines").insert({
          deal_id: dealId,
          proposal_version_id: proposalVersionId,
          party_id: partyId,
          profile_id: profileId,
          organization_id: organizationId,
          program_id: programId,
          statement: value(formData, "statement", true),
          confidence: value(formData, "confidence") || "moderate",
          evidence_references: json(formData, "evidenceReferences", []),
          status: bool(formData, "lockNow") ? "locked" : "draft",
          locked_at: bool(formData, "lockNow") ? new Date().toISOString() : null,
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create exact-scope baseline.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", personalParty ? "Counterfactual baseline recorded for the exact person." : "Counterfactual baseline recorded for the exact organization/program party.");
      }
      case "create_obligation": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const proposalVersionId = uuid(formData, "proposalVersionId", true)!;
        const obligorPartyId = uuid(formData, "obligorPartyId", true)!;
        const beneficiaryPartyId = uuid(formData, "beneficiaryPartyId");
        await requireProposalInDeal(client, dealId, proposalVersionId);
        const obligor = await requirePartyInDeal(client, dealId, obligorPartyId);
        if (beneficiaryPartyId) await requirePartyInDeal(client, dealId, beneficiaryPartyId);

        const consentRequired = bool(formData, "individualConsentRequired");
        let individualProfileId = uuid(formData, "individualProfileId");
        if (isPersonalInstitutionalCapacity(obligor.party_capacity)) {
          if (individualProfileId && individualProfileId !== obligor.profile_id) {
            throw new Error("A personal-capacity obligation cannot name a different individual.");
          }
          individualProfileId = obligor.profile_id;
        }
        if (consentRequired && !individualProfileId) throw new Error("Named-person consent requires the exact individual profile.");

        const result = await client.from("institutional_obligations").insert({
          deal_id: dealId,
          proposal_version_id: proposalVersionId,
          obligor_party_id: obligorPartyId,
          beneficiary_party_id: beneficiaryPartyId,
          resource_type: oneOf(formData, "resourceType", INSTITUTIONAL_RESOURCE_TYPES),
          title: value(formData, "title", true),
          description: value(formData, "description"),
          amount_cents: value(formData, "amount") ? parseInstitutionalMoneyToCents(formData.get("amount")) : null,
          currency: nullable(value(formData, "currency").toLowerCase()),
          quantity: value(formData, "quantity") ? Number(value(formData, "quantity")) : null,
          unit: nullable(value(formData, "unit")),
          due_at: nullable(value(formData, "dueAt")),
          individual_consent_required: consentRequired,
          individual_profile_id: individualProfileId,
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create obligation.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Typed obligation recorded under the exact proposal version. Personal-capacity obligations remain bound to the named person.");
      }
      case "create_approval": {
        const dealId = uuid(formData, "dealId", true)!;
        const proposalVersionId = uuid(formData, "proposalVersionId", true)!;
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId");
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireProposalInDeal(client, dealId, proposalVersionId);
        let exactParty;
        if (programId) exactParty = await client.from("institutional_deal_parties").select("id").eq("deal_id", dealId).eq("party_capacity", "organization").eq("organization_id", organizationId).eq("program_id", programId).maybeSingle();
        else exactParty = await client.from("institutional_deal_parties").select("id").eq("deal_id", dealId).eq("party_capacity", "organization").eq("organization_id", organizationId).is("program_id", null).maybeSingle();
        dbError(exactParty.error, "Could not validate approval scope.");
        if (!exactParty.data) throw new Error("Approval organization/program scope must exactly match an organization deal party.");
        const result = await client.from("institutional_approvals").insert({
          deal_id: dealId,
          proposal_version_id: proposalVersionId,
          organization_id: organizationId,
          program_id: programId,
          approval_kind: value(formData, "approvalKind", true),
          required_role: value(formData, "requiredRole") || "approver",
          requested_from_profile_id: uuid(formData, "requestedFromProfileId", true),
          requested_by: viewer.authUser.id,
          decision: "pending",
        });
        dbError(result.error, "Could not request approval.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Exact-scope approval requested from the named representative.");
      }
      case "decide_approval": {
        const approvalId = uuid(formData, "approvalId", true)!;
        const approval = await requireApprovalOrganization(client, approvalId);
        await requireOrganizationActingContext(client, viewer.authUser.id, approval.organization_id, formData);
        const result = await client.rpc("decide_institutional_approval", {
          target_approval_id: approvalId,
          target_decision: value(formData, "decision") || "approve",
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
          target_decision_note: nullable(value(formData, "decisionNote")),
        });
        dbError(result.error, "Could not decide approval.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Named exact-scope approval decision recorded.");
      }
      case "request_individual_consent": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.rpc("request_institutional_individual_consent", {
          target_deal_id: dealId,
          target_obligation_id: uuid(formData, "obligationId", true),
        });
        dbError(result.error, "Could not request individual consent.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Exact-term named-person consent requested.");
      }
      case "decide_individual_consent": {
        requirePersonalCapacitySelection(formData);
        const result = await client.rpc("decide_institutional_individual_consent", {
          target_consent_id: uuid(formData, "consentId", true),
          target_decision: value(formData, "decision") || "affirmed",
          target_decision_note: nullable(value(formData, "decisionNote")),
        });
        dbError(result.error, "Could not record individual consent decision.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", `Consent is ${value(formData, "decision") || "affirmed"}.`);
      }
      case "decide_verifier_assignment": {
        requirePersonalCapacitySelection(formData);
        const result = await client.rpc("accept_institutional_verifier_assignment", {
          target_assignment_id: uuid(formData, "assignmentId", true),
          target_decision: value(formData, "decision") || "accepted",
          target_conflict_declaration: value(formData, "conflictDeclaration", true),
        });
        dbError(result.error, "Could not decide verifier assignment.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Verifier assignment updated. Confidential access follows acceptance only.");
      }
      case "sign_deal": {
        const dealId = uuid(formData, "dealId", true)!;
        const partyId = uuid(formData, "partyId", true)!;
        const party = await requirePartyInDeal(client, dealId, partyId);
        await requirePartyActingContext(client, viewer.authUser.id, party, formData, ["deal:sign"]);
        const result = await client.rpc("sign_institutional_deal", {
          target_deal_id: dealId,
          target_party_id: partyId,
          target_authority_grant_id: uuid(formData, "authorityGrantId"),
          target_expected_terms_hash: value(formData, "expectedTermsHash", true),
        });
        dbError(result.error, "Could not sign exact terms.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Immutable signature recorded against the selected exact terms.");
      }
      case "create_milestone": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const proposalVersionId = uuid(formData, "proposalVersionId", true)!;
        const obligationId = uuid(formData, "obligationId", true)!;
        await requireProposalInDeal(client, dealId, proposalVersionId);
        await requireObligationInProposal(client, dealId, proposalVersionId, obligationId);
        const result = await client.from("institutional_milestones").insert({
          deal_id: dealId,
          proposal_version_id: proposalVersionId,
          obligation_id: obligationId,
          title: value(formData, "title", true),
          description: value(formData, "description"),
          due_at: nullable(value(formData, "dueAt")),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create milestone.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Milestone linked to the exact obligation and proposal.");
      }
      case "create_evidence_requirement": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const proposalVersionId = uuid(formData, "proposalVersionId", true)!;
        const obligationId = uuid(formData, "obligationId", true)!;
        const milestoneId = uuid(formData, "milestoneId");
        const verifierAssignmentId = uuid(formData, "verifierAssignmentId");
        await requireProposalInDeal(client, dealId, proposalVersionId);
        await requireObligationInProposal(client, dealId, proposalVersionId, obligationId);
        if (milestoneId) await requireMilestoneInObligation(client, dealId, proposalVersionId, obligationId, milestoneId);
        if (verifierAssignmentId) {
          const verifier = await client.from("institutional_verifier_assignments").select("id").eq("id", verifierAssignmentId).eq("deal_id", dealId).maybeSingle();
          dbError(verifier.error, "Could not validate verifier assignment.");
          if (!verifier.data) throw new Error("Verifier assignment must belong to the same deal.");
        }
        const result = await client.from("institutional_evidence_requirements").insert({
          deal_id: dealId,
          proposal_version_id: proposalVersionId,
          obligation_id: obligationId,
          milestone_id: milestoneId,
          title: value(formData, "title", true),
          description: value(formData, "description"),
          evidence_type: value(formData, "evidenceType") || "document",
          verifier_assignment_id: verifierAssignmentId,
          visibility: oneOf(formData, "visibility", DEAL_MESSAGE_VISIBILITIES, "all_parties"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create evidence requirement.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Evidence requirement linked to the exact obligation relationship.");
      }
      case "submit_evidence": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealParticipationActingContext(client, viewer.authUser.id, dealId, formData);
        const proposalVersionId = uuid(formData, "proposalVersionId", true)!;
        const obligationId = uuid(formData, "obligationId", true)!;
        const milestoneId = uuid(formData, "milestoneId");
        const evidenceRequirementId = uuid(formData, "evidenceRequirementId", true)!;
        await requireProposalInDeal(client, dealId, proposalVersionId);
        await requireObligationInProposal(client, dealId, proposalVersionId, obligationId);
        if (milestoneId) await requireMilestoneInObligation(client, dealId, proposalVersionId, obligationId, milestoneId);
        await requireEvidenceRequirementRelationship(client, { dealId, proposalVersionId, obligationId, milestoneId, evidenceRequirementId });
        const result = await client.from("institutional_evidence_submissions").insert({
          deal_id: dealId,
          proposal_version_id: proposalVersionId,
          obligation_id: obligationId,
          milestone_id: milestoneId,
          requirement_id: evidenceRequirementId,
          submitted_by: viewer.authUser.id,
          evidence: json(formData, "submission", {}),
          status: "submitted",
        });
        dbError(result.error, "Could not submit evidence.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Evidence submitted under the exact requirement.");
      }
      case "record_pool_approval": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("record_institutional_pool_approval", {
          target_deal_id: uuid(formData, "dealId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
          target_decision: value(formData, "decision") || "approve",
        });
        dbError(result.error, "Could not record pool approval.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Pool participation approval recorded separately from financial reservation.");
      }
      case "create_budget_account": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId");
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["finance:manage"]);
        const result = await client.from("institutional_budget_accounts").insert({
          organization_id: organizationId,
          program_id: programId,
          name: value(formData, "name", true),
          currency: (value(formData, "currency") || "usd").toLowerCase(),
          authorized_cents: parseInstitutionalMoneyToCents(formData.get("authorizedAmount")),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create budget account.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Institutional commitment account created.");
      }
      case "reserve_budget": {
        const budgetAccountId = uuid(formData, "budgetAccountId", true)!;
        const account = await requireBudgetAccountOrganization(client, budgetAccountId);
        await requireOrganizationActingContext(client, viewer.authUser.id, account.organization_id, formData);
        const result = await client.rpc("reserve_institutional_budget", {
          target_budget_account_id: budgetAccountId,
          target_deal_id: uuid(formData, "dealId", true),
          target_amount_cents: parseInstitutionalMoneyToCents(formData.get("amount")),
          target_authority_grant_id: uuid(formData, "financeAuthorityGrantId", true),
          target_idempotency_key: value(formData, "idempotencyKey") || randomUUID(),
        });
        dbError(result.error, "Could not reserve budget.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Financial reservation recorded independently of program approval.");
      }
      case "save_pool_contribution": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("save_institutional_pool_contribution", {
          target_deal_id: uuid(formData, "dealId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_amount_cents: parseInstitutionalMoneyToCents(formData.get("amount")),
          target_status: value(formData, "status") || "pledged",
          target_budget_reservation_id: uuid(formData, "budgetReservationId"),
          target_finance_authority_grant_id: uuid(formData, "financeAuthorityGrantId"),
        });
        dbError(result.error, "Could not save contribution lifecycle.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Financial reservation and pool approval remain separate; contribution lifecycle updated.");
      }
      case "save_pool_anchor": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("save_institutional_pool_anchor", {
          target_deal_id: uuid(formData, "dealId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_contribution_id: uuid(formData, "contributionId", true),
          target_amount_cents: parseInstitutionalMoneyToCents(formData.get("amount")),
          target_status: value(formData, "status") || "proposed",
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
        });
        dbError(result.error, "Could not save anchor commitment.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Anchor commitment validated atomically.");
      }
      case "save_pool_underwriting": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("save_institutional_pool_underwriting", {
          target_deal_id: uuid(formData, "dealId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_maximum_amount_cents: parseInstitutionalMoneyToCents(formData.get("maximumAmount")),
          target_status: value(formData, "status") || "proposed",
          target_budget_reservation_id: uuid(formData, "budgetReservationId"),
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
        });
        dbError(result.error, "Could not save underwriting commitment.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Underwriting commitment validated atomically.");
      }
      case "cast_pool_vote": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("cast_institutional_pool_vote", {
          target_deal_id: uuid(formData, "dealId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_proposal_key: value(formData, "proposalKey") || "activation",
          target_vote: value(formData, "vote") || "approve",
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
        });
        dbError(result.error, "Could not cast pool vote.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Eligible exact-scope governance vote recorded.");
      }
      case "activate_pool": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("activate_institutional_pool", {
          target_deal_id: uuid(formData, "dealId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
        });
        dbError(result.error, "Could not activate pool.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Pool activation gates passed atomically.");
      }
      case "create_integration": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId");
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["integration:manage"]);
        const configuration = json(formData, "configuration", {});
        assertInstitutionalIntegrationConfigHasNoSecrets(configuration);
        const result = await client.from("institutional_integrations").insert({
          organization_id: organizationId,
          program_id: programId,
          integration_type: oneOf(formData, "integrationType", INTEGRATION_TYPES),
          name: value(formData, "name", true),
          configuration,
          credential_reference: nullable(value(formData, "credentialReference")),
          status: oneOf(formData, "status", INTEGRATION_STATUSES, "draft"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create integration.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Integration configuration stored without embedded secrets.");
      }
      case "create_webhook": {
        const integrationId = uuid(formData, "integrationId", true)!;
        const integration = await requireIntegrationOrganization(client, integrationId);
        await requireOrganizationActingContext(client, viewer.authUser.id, integration.organization_id, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, integration.organization_id, integration.program_id ?? null, ["integration:manage"]);
        const endpoint = await validateInstitutionalWebhookDestination(value(formData, "endpointUrl", true));
        const events = validateSupportedInstitutionalWebhookEvents(stringArray(formData, "supportedEvents"));
        const result = await client.from("institutional_webhooks").insert({
          integration_id: integrationId,
          endpoint_url: endpoint.normalizedUrl,
          supported_events: events,
          secret_reference: value(formData, "secretReference", true),
          status: oneOf(formData, "status", INTEGRATION_STATUSES, "draft"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create webhook.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Webhook created with a supported event allowlist and external secret reference.");
      }

      case "accept_organization_deal_party": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.rpc("accept_institutional_organization_party", {
          target_party_id: uuid(formData, "partyId", true),
          target_organization_id: organizationId,
          target_program_id: uuid(formData, "programId"),
          target_authority_grant_id: uuid(formData, "authorityGrantId", true),
        });
        dbError(result.error, "Could not accept organization participation.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Organization participation accepted under exact-scope authority.");
      }
      case "post_deal_message": {
        const dealId = uuid(formData, "dealId", true)!;
        const participationContext = await requireDealParticipationActingContext(client, viewer.authUser.id, dealId, formData);
        const visibility = oneOf(formData, "visibility", ["all_parties", "party_internal"] as const, "all_parties");
        if (visibility === "party_internal" && !participationContext.organizationId) {
          throw new Error("Personal capacity cannot post a message as an organization-internal communication.");
        }
        const result = await client.from("institutional_deal_messages").insert({
          deal_id: dealId,
          sender_profile_id: viewer.authUser.id,
          organization_id: visibility === "party_internal" ? participationContext.organizationId : null,
          visibility,
          body: value(formData, "body", true),
        });
        dbError(result.error, "Could not post deal-room message.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Deal-room message posted to the selected visibility scope.");
      }
      case "grant_room_access": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const profileId = uuid(formData, "profileId", true)!;
        const partyId = uuid(formData, "partyId");
        const organizationId = uuid(formData, "organizationId");
        const accessScope = oneOf(
          formData,
          "accessScope",
          PARTICIPANT_DEAL_ROOM_ACCESS_SCOPES,
          "all_parties",
        );
        if (partyId) {
          const party = await requirePartyInDeal(client, dealId, partyId);
          if (party.party_capacity === "organization") {
            if (!organizationId || organizationId !== party.organization_id) {
              throw new Error("Organization-scoped room access must exactly match the selected organization party.");
            }
            const membership = await client.from("institutional_memberships").select("id")
              .eq("organization_id", organizationId).eq("profile_id", profileId).eq("status", "active").is("revoked_at", null).maybeSingle();
            dbError(membership.error, "Could not validate room-access organization membership.");
            if (!membership.data) throw new Error("The selected profile is not an active member of the exact organization party.");
          } else if (party.profile_id !== profileId || organizationId) {
            throw new Error("Personal-capacity room access must match the named party and cannot imply organization authority.");
          }
        } else if (organizationId) {
          const [party, membership] = await Promise.all([
            client.from("institutional_deal_parties").select("id").eq("deal_id", dealId).eq("party_capacity", "organization").eq("organization_id", organizationId).limit(1).maybeSingle(),
            client.from("institutional_memberships").select("id").eq("organization_id", organizationId).eq("profile_id", profileId).eq("status", "active").is("revoked_at", null).maybeSingle(),
          ]);
          dbError(party.error, "Could not validate room-access organization party.");
          dbError(membership.error, "Could not validate room-access organization membership.");
          if (!party.data || !membership.data) throw new Error("Organization-scoped room access requires an exact deal party and active membership.");
        }
        if (accessScope === "party_internal" && !organizationId) {
          throw new Error("Party-internal access requires an exact organization party.");
        }
        if (!partyId && !organizationId) {
          const verifierAssignment = await client
            .from("institutional_verifier_assignments")
            .select("id,status")
            .eq("deal_id", dealId)
            .eq("verifier_profile_id", profileId)
            .maybeSingle();
          dbError(verifierAssignment.error, "Could not validate verifier access boundary.");
          if (verifierAssignment.data) {
            throw new Error("Independent verifier access must be created by accepting the exact assignment; generic room access cannot substitute.");
          }
        }
        const result = await client.from("institutional_deal_room_members").upsert({
          deal_id: dealId,
          profile_id: profileId,
          party_id: partyId,
          organization_id: organizationId,
          access_scope: accessScope,
          can_post: bool(formData, "canPost"),
          added_by: viewer.authUser.id,
          revoked_at: null,
        }, { onConflict: "deal_id,profile_id,access_scope" });
        dbError(result.error, "Could not grant deal-room access.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Scoped deal-room access granted.");
      }
      case "revoke_room_access": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.rpc("revoke_institutional_room_access", {
          target_room_member_id: uuid(formData, "roomMemberId", true),
          target_deal_id: dealId,
        });
        dbError(result.error, "Could not revoke deal-room access.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Deal-room access revoked without deleting the audit history.");
      }
      case "create_obligation_dependency": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const predecessorObligationId = uuid(formData, "predecessorObligationId", true)!;
        const successorObligationId = uuid(formData, "successorObligationId", true)!;
        await Promise.all([
          requireObligationInDeal(client, dealId, predecessorObligationId),
          requireObligationInDeal(client, dealId, successorObligationId),
        ]);
        const result = await client.from("institutional_obligation_dependencies").insert({
          deal_id: dealId,
          obligation_id: successorObligationId,
          depends_on_obligation_id: predecessorObligationId,
          dependency_type: oneOf(formData, "dependencyType", OBLIGATION_DEPENDENCY_TYPES, "must_complete_before"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create obligation dependency.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Obligation dependency recorded; circular dependencies remain blocked by the database.");
      }
      case "transition_deal_stage": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.rpc("transition_institutional_deal_stage", { target_deal_id: dealId, target_stage: oneOf(formData, "stage", INSTITUTIONAL_DEAL_STAGES) });
        dbError(result.error, "Could not transition deal stage.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Deal stage transitioned through the fail-closed lifecycle.");
      }
      case "update_obligation_status": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.rpc("transition_institutional_obligation_status", {
          target_deal_id: dealId,
          target_obligation_id: uuid(formData, "obligationId", true),
          target_status: oneOf(formData, "status", OBLIGATION_STATUSES),
        });
        dbError(result.error, "Could not update obligation status.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Obligation status updated under the transition guard.");
      }
      case "update_milestone_status": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.rpc("transition_institutional_milestone_status", {
          target_deal_id: dealId,
          target_milestone_id: uuid(formData, "milestoneId", true),
          target_status: oneOf(formData, "status", MILESTONE_STATUSES),
        });
        dbError(result.error, "Could not update milestone status.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Milestone status updated.");
      }
      case "assign_verifier": {
        const dealId = uuid(formData, "dealId", true)!;
        const managementContext = await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.from("institutional_verifier_assignments").insert({
          deal_id: dealId,
          organization_id: managementContext.organizationId,
          verifier_profile_id: uuid(formData, "verifierProfileId", true),
          scope: value(formData, "scope", true),
          status: "invited",
          assigned_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not invite independent verifier or service provider.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Verifier invited. Confidential evidence access remains closed until acceptance.");
      }
      case "revoke_verifier_assignment": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.rpc("revoke_institutional_verifier_assignment", {
          target_assignment_id: uuid(formData, "assignmentId", true),
          target_deal_id: dealId,
        });
        dbError(result.error, "Could not revoke verifier assignment.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Verifier assignment and associated confidential access revoked.");
      }
      case "review_evidence": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealParticipationActingContext(client, viewer.authUser.id, dealId, formData, []);
        const result = await client.rpc("review_institutional_evidence", {
          target_submission_id: uuid(formData, "submissionId", true),
          target_deal_id: dealId,
          target_status: oneOf(formData, "status", EVIDENCE_REVIEW_STATUSES),
          target_review_note: value(formData, "reviewNote"),
          target_organization_id: uuid(formData, "actingOrganizationId"),
          target_program_id: uuid(formData, "programId"),
          target_authority_grant_id: uuid(formData, "authorityGrantId"),
        });
        dbError(result.error, "Could not review evidence.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Evidence review recorded against the exact requirement.");
      }
      case "create_risk_review": {
        const dealId = uuid(formData, "dealId", true)!;
        const context = await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData, ["risk:review"]);
        const result = await client.from("institutional_risk_reviews").insert({
          deal_id: dealId,
          organization_id: context.organizationId,
          proposal_version_id: uuid(formData, "proposalVersionId"),
          category: oneOf(formData, "category", INSTITUTIONAL_RISK_CATEGORIES),
          severity: oneOf(formData, "severity", INSTITUTIONAL_RISK_SEVERITIES, "medium"),
          finding: value(formData, "finding", true),
          mitigation: nullable(value(formData, "mitigation")),
          nonwaivable: bool(formData, "nonwaivable"),
          status: oneOf(formData, "status", RISK_STATUSES, "open"),
          visibility: oneOf(formData, "visibility", RISK_VISIBILITIES, "all_parties"),
          reviewer_profile_id: viewer.authUser.id,
        });
        dbError(result.error, "Could not record integrity review.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Integrity, threat, conflict, or externality finding recorded.");
      }
      case "create_amendment": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const fromProposalVersionId = uuid(formData, "supersededProposalVersionId", true)!;
        const toProposalVersionId = uuid(formData, "proposedProposalVersionId", true)!;
        await Promise.all([
          requireProposalInDeal(client, dealId, fromProposalVersionId),
          requireProposalInDeal(client, dealId, toProposalVersionId),
        ]);
        const result = await client.from("institutional_amendments").insert({
          deal_id: dealId,
          from_proposal_version_id: fromProposalVersionId,
          to_proposal_version_id: toProposalVersionId,
          reason: value(formData, "reason", true),
          status: "proposed",
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not propose amendment.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Amendment proposed; exact terms remain unchanged until approval and signature.");
      }
      case "decide_amendment": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const status = oneOf(formData, "status", AMENDMENT_DECISIONS);
        const result = await client.from("institutional_amendments").update({
          status,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        }).eq("id", uuid(formData, "amendmentId", true)).eq("deal_id", dealId);
        dbError(result.error, "Could not decide amendment.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Amendment decision recorded.");
      }
      case "open_dispute": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealParticipationActingContext(client, viewer.authUser.id, dealId, formData);
        const partyId = uuid(formData, "partyId", true)!;
        const party = await requirePartyInDeal(client, dealId, partyId);
        await requirePartyActingContext(client, viewer.authUser.id, party, formData);
        const result = await client.from("institutional_disputes").insert({
          deal_id: dealId,
          opened_by_party_id: partyId,
          summary: value(formData, "summary", true),
          stage: "concern_raised",
          confidential: !bool(formData, "publicDispute"),
          opened_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not open dispute.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Dispute opened with an append-only escalation record.");
      }
      case "add_dispute_event": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealParticipationActingContext(client, viewer.authUser.id, dealId, formData);
        const disputeId = uuid(formData, "disputeId", true)!;
        await requireDisputeInDeal(client, dealId, disputeId);
        const result = await client.from("institutional_dispute_events").insert({
          dispute_id: disputeId,
          actor_profile_id: viewer.authUser.id,
          event_type: value(formData, "eventType", true),
          note: value(formData, "detail", true),
          attachments: json(formData, "attachments", []),
        });
        dbError(result.error, "Could not add dispute event.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Dispute event appended.");
      }
      case "create_attribution_claim": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const organizationId = uuid(formData, "actingOrganizationId");
        const result = await client.from("institutional_attribution_claims").insert({
          deal_id: dealId,
          organization_id: organizationId,
          profile_id: organizationId ? null : viewer.authUser.id,
          claim_type: value(formData, "claimType", true),
          claim_text: value(formData, "claimText", true),
          qualification: nullable(value(formData, "counterfactualQualification")),
          status: oneOf(formData, "status", ATTRIBUTION_STATUSES, "proposed"),
          visibility: oneOf(formData, "disclosureStatus", ATTRIBUTION_VISIBILITIES, "private"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not record attribution claim.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Attribution and public-claim boundary recorded.");
      }
      case "create_report_snapshot": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData);
        const result = await client.from("institutional_report_snapshots").insert({
          deal_id: dealId,
          report_type: value(formData, "reportType", true),
          snapshot: {
            title: value(formData, "title", true),
            payload: json(formData, "payload", {}),
            generated_at: new Date().toISOString(),
          },
          generated_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create structured report snapshot.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Immutable structured report snapshot created.");
      }
      case "create_pool_terms": {
        const dealId = uuid(formData, "dealId", true)!;
        await requireDealManagementActingContext(client, viewer.authUser.id, dealId, formData, ["pool:manage"]);
        const governingTerms = {
          threshold_amount_cents: parseInstitutionalMoneyToCents(formData.get("threshold")),
          currency: (value(formData, "currency") || "usd").toLowerCase(),
          minimum_contributors: Math.max(2, integer(formData, "minimumContributors", 2)),
          contribution_deadline: value(formData, "deadline", true),
          activation_rule: oneOf(formData, "activationRule", POOL_ACTIVATION_RULES, "governance_vote_and_threshold"),
          contribution_cap_cents: value(formData, "contributionCap") ? parseInstitutionalMoneyToCents(formData.get("contributionCap")) : null,
          excess_funds_rule: value(formData, "excessFundsTreatment", true),
          failure_rule: value(formData, "failureTreatment", true),
          withdrawal_rule: value(formData, "withdrawalRule", true),
          governance_rule: oneOf(formData, "governanceRule", POOL_GOVERNANCE_RULES, "one_organization_one_vote"),
          governance_config: json(formData, "governanceRules", {}),
        };
        const result = await client.from("institutional_pool_terms").upsert({
          deal_id: dealId,
          ...governingTerms,
          terms_hash: hashInstitutionalTerms(governingTerms),
          status: oneOf(formData, "status", POOL_TERM_EDITABLE_STATUSES, "draft"),
          created_by: viewer.authUser.id,
        }, { onConflict: "deal_id" });
        dbError(result.error, "Could not create consortium or pool terms.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Pool economics and governance terms recorded. Opening the pool freezes them.");
      }
      case "create_template": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId");
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["deal:manage"]);
        const result = await client.from("institutional_templates").insert({
          organization_id: organizationId,
          program_id: programId,
          template_type: value(formData, "dealType", true),
          name: value(formData, "name", true),
          content: json(formData, "template", {}),
          status: oneOf(formData, "status", TEMPLATE_STATUSES, "draft"),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create institutional template.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Reusable institutional trade template recorded.");
      }
      case "create_framework_agreement": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, null, ["deal:manage"]);
        const organizationBId = uuid(formData, "organizationBId", true)!;
        const terms = json(formData, "standardTerms", {});
        const result = await client.from("institutional_framework_agreements").insert({
          organization_a_id: organizationId,
          organization_b_id: organizationBId,
          title: value(formData, "title", true),
          terms,
          terms_hash: hashInstitutionalTerms(terms),
          status: oneOf(formData, "status", FRAMEWORK_STATUSES, "draft"),
          effective_from: nullable(value(formData, "effectiveFrom")),
          effective_until: nullable(value(formData, "effectiveUntil")),
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create framework agreement.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Framework agreement recorded with exact standard terms.");
      }
      case "create_command_draft": {
        const organizationId = uuid(formData, "organizationId", true)!;
        const programId = uuid(formData, "programId");
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        await requireExactOrganizationPermission(client, viewer.authUser.id, organizationId, programId, ["deal:manage"]);
        const result = await client.from("institutional_command_drafts").insert({
          organization_id: organizationId,
          program_id: programId,
          profile_id: viewer.authUser.id,
          command_text: value(formData, "commandText", true),
          interpreted_action: value(formData, "interpretedAction", true),
          payload: json(formData, "payload", {}),
          status: "draft",
        });
        dbError(result.error, "Could not create Command draft.");
        revalidatePath(`/institutions/${organizationId}`);
        redirectWith(returnTo, "message", "Permission-aware Command draft recorded for review.");
      }
      case "operator_review_verification": {
        const { client: operator, viewer: operatorViewer } = await operatorContext();
        const status = value(formData, "status", true);
        const result = await operator.from("institutional_verification_records").update({
          status,
          reviewed_by: operatorViewer.authUser.id,
          review_note: value(formData, "reviewNote", true),
          decided_at: new Date().toISOString(),
          expires_at: nullable(value(formData, "expiresAt")),
        }).eq("id", uuid(formData, "verificationId", true));
        dbError(result.error, "Could not record verification review.");
        revalidatePath("/admin/institutional-deal-desk");
        redirectWith(returnTo, "message", "Fact-specific verification decision recorded; no broader endorsement was created.");
      }
      case "operator_create_risk_review": {
        const { client: operator, viewer: operatorViewer } = await operatorContext();
        const result = await operator.from("institutional_risk_reviews").insert({
          deal_id: uuid(formData, "dealId", true),
          organization_id: uuid(formData, "riskOrganizationId"),
          proposal_version_id: uuid(formData, "proposalVersionId"),
          category: oneOf(formData, "category", INSTITUTIONAL_RISK_CATEGORIES),
          severity: oneOf(formData, "severity", INSTITUTIONAL_RISK_SEVERITIES),
          finding: value(formData, "finding", true),
          mitigation: nullable(value(formData, "mitigation")),
          nonwaivable: bool(formData, "nonwaivable"),
          status: oneOf(formData, "status", RISK_STATUSES, "open"),
          visibility: oneOf(formData, "visibility", RISK_VISIBILITIES, "operator_only"),
          reviewer_profile_id: operatorViewer.authUser.id,
        });
        dbError(result.error, "Could not create integrity review.");
        revalidatePath("/admin/institutional-deal-desk");
        redirectWith(returnTo, "message", "Institutional integrity finding recorded.");
      }
      default:
        throw new Error(`Unsupported institutional action: ${actionType}.`);
    }
  } catch (error) {
    if (error instanceof Error && String((error as Error & { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT")) throw error;
    const message = error instanceof Error ? error.message : "Institutional action failed.";
    redirectWith(returnTo, "error", message.slice(0, 500));
  }
}
