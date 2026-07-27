"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { isInstitutionalFeatureEnabled } from "@/lib/institutional-feature-gates";
import {
  INSTITUTIONAL_PARTY_CAPACITIES,
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
    .maybeSingle();
  dbError(membership.error, "Could not validate organization acting context.");
  if (!membership.data) throw new Error("Switch to an active organization workspace before using organization-only controls.");
}

async function requireDealManagementActingContext(
  client: any,
  viewerProfileId: string,
  dealId: string,
  formData: FormData,
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
    return { capacity, organizationId: null };
  }

  const organizationId = uuid(formData, "actingOrganizationId", true)!;
  await requireOrganizationActingContext(client, viewerProfileId, organizationId, formData);
  const party = await client
    .from("institutional_deal_parties")
    .select("id")
    .eq("deal_id", dealId)
    .eq("party_capacity", "organization")
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();
  dbError(party.error, "Could not validate organization deal-party context.");
  if (!party.data) throw new Error("The active organization is not an exact party to this deal.");
  return { capacity, organizationId };
}

async function requirePartyActingContext(
  client: any,
  viewerProfileId: string,
  party: any,
  formData: FormData,
) {
  const capacity = actingCapacity(formData);
  if (isPersonalInstitutionalCapacity(party.party_capacity)) {
    if (!isPersonalInstitutionalCapacity(capacity) || party.profile_id !== viewerProfileId) {
      throw new Error("A personal-capacity party may be represented only by that same person.");
    }
    await requireActiveIndividualParticipation(client, viewerProfileId);
    return;
  }

  if (capacity !== "organization" || !party.organization_id) {
    throw new Error("Switch to the exact organization party before representing it.");
  }
  await requireOrganizationActingContext(client, viewerProfileId, party.organization_id, formData);
}

async function requireDealParticipationActingContext(
  client: any,
  viewerProfileId: string,
  dealId: string,
  formData: FormData,
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
      throw new Error("Personal capacity may submit evidence only as an accepted named party or verifier.");
    }
    return { capacity, organizationId: null };
  }

  const organizationId = uuid(formData, "actingOrganizationId", true)!;
  await requireOrganizationActingContext(client, viewerProfileId, organizationId, formData);
  const party = await client
    .from("institutional_deal_parties")
    .select("id")
    .eq("deal_id", dealId)
    .eq("party_capacity", "organization")
    .eq("organization_id", organizationId)
    .not("joined_at", "is", null)
    .is("left_at", null)
    .limit(1)
    .maybeSingle();
  dbError(party.error, "Could not validate organization deal participation.");
  if (!party.data) throw new Error("The active organization is not an accepted party to this deal.");
  return { capacity, organizationId };
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
      case "create_program": {
        const organizationId = uuid(formData, "organizationId", true)!;
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
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
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const programId = uuid(formData, "programId", true)!;
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
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const programId = uuid(formData, "programId", true)!;
        const result = await client.from("institutional_resource_profiles").insert({
          organization_id: organizationId,
          program_id: programId,
          direction: value(formData, "direction", true),
          resource_type: value(formData, "resourceType", true),
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
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.from("institutional_opportunities").insert({
          organization_id: organizationId,
          program_id: uuid(formData, "programId", true),
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
          resource_type: value(formData, "resourceType", true),
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
        await requirePartyActingContext(client, viewer.authUser.id, party, formData);
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
          visibility: value(formData, "visibility") || "all_parties",
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
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const result = await client.from("institutional_budget_accounts").insert({
          organization_id: organizationId,
          program_id: uuid(formData, "programId"),
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
        await requireOrganizationActingContext(client, viewer.authUser.id, organizationId, formData);
        const configuration = json(formData, "configuration", {});
        assertInstitutionalIntegrationConfigHasNoSecrets(configuration);
        const result = await client.from("institutional_integrations").insert({
          organization_id: organizationId,
          program_id: uuid(formData, "programId"),
          integration_type: value(formData, "integrationType", true),
          name: value(formData, "name", true),
          configuration,
          credential_reference: nullable(value(formData, "credentialReference")),
          status: value(formData, "status") || "draft",
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
        const endpoint = await validateInstitutionalWebhookDestination(value(formData, "endpointUrl", true));
        const events = validateSupportedInstitutionalWebhookEvents(stringArray(formData, "supportedEvents"));
        const result = await client.from("institutional_webhooks").insert({
          integration_id: integrationId,
          endpoint_url: endpoint.normalizedUrl,
          supported_events: events,
          secret_reference: value(formData, "secretReference", true),
          status: value(formData, "status") || "draft",
          created_by: viewer.authUser.id,
        });
        dbError(result.error, "Could not create webhook.");
        revalidatePath(returnTo.split("?")[0]);
        redirectWith(returnTo, "message", "Webhook created with a supported event allowlist and external secret reference.");
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
          category: value(formData, "category", true),
          severity: value(formData, "severity", true),
          finding: value(formData, "finding", true),
          mitigation: nullable(value(formData, "mitigation")),
          nonwaivable: bool(formData, "nonwaivable"),
          status: value(formData, "status") || "open",
          visibility: value(formData, "visibility") || "operator_only",
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
