import { notFound } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export type InstitutionalRow = Record<string, any> & { id: string };

function rows<T extends InstitutionalRow = InstitutionalRow>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function assertNoError(error: { message?: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message ?? "Unknown database error"}`);
}

export async function loadInstitutionalDirectory() {
  const client = (await createClient()) as any;
  const [organizationsResult, programsResult, opportunitiesResult] = await Promise.all([
    client.from("institutional_public_organizations").select("*").order("display_name"),
    client.from("institutional_public_programs").select("*").order("name"),
    client.from("institutional_public_opportunities").select("*").order("published_at", { ascending: false }).limit(50),
  ]);
  assertNoError(organizationsResult.error, "Load institutional organizations");
  assertNoError(programsResult.error, "Load institutional programs");
  assertNoError(opportunitiesResult.error, "Load institutional opportunities");
  return {
    organizations: rows(organizationsResult.data),
    programs: rows(programsResult.data),
    opportunities: rows(opportunitiesResult.data),
  };
}

export async function loadInstitutionalWorkspace(organizationId: string) {
  const client = (await createClient()) as any;
  const [organizationResult, programsResult, membershipsResult, grantsResult, mandatesResult, resourcesResult, opportunitiesResult, dealsResult, verificationsResult, budgetAccountsResult, integrationsResult] = await Promise.all([
    client.from("institutional_organizations").select("*").eq("id", organizationId).maybeSingle(),
    client.from("institutional_programs").select("*").eq("organization_id", organizationId).order("name"),
    client.from("institutional_memberships").select("*").eq("organization_id", organizationId).order("created_at"),
    client.from("institutional_authority_grants").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_mandates").select("*").eq("organization_id", organizationId).order("version", { ascending: false }),
    client.from("institutional_resource_profiles").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_opportunities").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_deals").select("*").eq("lead_organization_id", organizationId).order("updated_at", { ascending: false }),
    client.from("institutional_verification_records").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_budget_accounts").select("*").eq("organization_id", organizationId).order("name"),
    client.from("institutional_integrations").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
  ]);
  if (organizationResult.error || !organizationResult.data) notFound();
  for (const [result, context] of [
    [programsResult, "programs"], [membershipsResult, "memberships"], [grantsResult, "authority grants"],
    [mandatesResult, "mandates"], [resourcesResult, "resource profiles"], [opportunitiesResult, "opportunities"],
    [dealsResult, "deals"], [verificationsResult, "verification records"], [budgetAccountsResult, "budget accounts"],
    [integrationsResult, "integrations"],
  ] as const) assertNoError(result.error, `Load institutional ${context}`);
  return {
    organization: organizationResult.data as InstitutionalRow,
    programs: rows(programsResult.data),
    memberships: rows(membershipsResult.data),
    authorityGrants: rows(grantsResult.data),
    mandates: rows(mandatesResult.data),
    resourceProfiles: rows(resourcesResult.data),
    opportunities: rows(opportunitiesResult.data),
    deals: rows(dealsResult.data),
    verifications: rows(verificationsResult.data),
    budgetAccounts: rows(budgetAccountsResult.data),
    integrations: rows(integrationsResult.data),
  };
}

export async function loadInstitutionalDeal(organizationId: string, dealId: string) {
  const client = (await createClient()) as any;
  const dealResult = await client.from("institutional_deals").select("*").eq("id", dealId).maybeSingle();
  if (dealResult.error || !dealResult.data) return null;
  const deal = dealResult.data as InstitutionalRow;
  const [organizationResult, programsResult, partiesResult, roomMembersResult, profilesResult, authorityGrantsResult, proposalsResult, baselinesResult, obligationsResult, dependenciesResult, approvalsResult, consentsResult, signaturesResult, milestonesResult, assignmentsResult, requirementsResult, submissionsResult, risksResult, reservationsResult, accountsResult, poolResult, contributionsResult, anchorsResult, underwritingsResult, votesResult, disputesResult, auditResult] = await Promise.all([
    client.from("institutional_organizations").select("*").eq("id", organizationId).maybeSingle(),
    client.from("institutional_programs").select("*").in("organization_id", [deal.lead_organization_id, organizationId]),
    client.from("institutional_deal_parties").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_deal_room_members").select("*").eq("deal_id", dealId),
    client.from("profiles").select("id,display_name,email").limit(500),
    client.from("institutional_authority_grants").select("*").eq("organization_id", organizationId).eq("status", "active").order("created_at", { ascending: false }),
    client.from("institutional_proposal_versions").select("*").eq("deal_id", dealId).order("version", { ascending: false }),
    client.from("institutional_counterfactual_baselines").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_obligations").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_obligation_dependencies").select("*").eq("deal_id", dealId),
    client.from("institutional_approvals").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_individual_consents").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_signatures").select("*").eq("deal_id", dealId).order("signed_at"),
    client.from("institutional_milestones").select("*").eq("deal_id", dealId).order("due_at"),
    client.from("institutional_verifier_assignments").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_evidence_requirements").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_evidence_submissions").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_risk_reviews").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_budget_reservations").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_budget_accounts").select("*").order("name"),
    client.from("institutional_pool_terms").select("*").eq("deal_id", dealId).maybeSingle(),
    client.from("institutional_pool_contributions").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_pool_anchors").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_pool_underwritings").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_pool_votes").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_disputes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_audit_events").select("*").eq("deal_id", dealId).order("occurred_at", { ascending: false }).limit(100),
  ]);
  if (organizationResult.error || !organizationResult.data) return null;
  return {
    organization: organizationResult.data as InstitutionalRow,
    deal,
    programs: rows(programsResult.data),
    parties: rows(partiesResult.data),
    roomMembers: rows(roomMembersResult.data),
    profiles: rows(profilesResult.data),
    authorityGrants: rows(authorityGrantsResult.data),
    proposals: rows(proposalsResult.data),
    baselines: rows(baselinesResult.data),
    obligations: rows(obligationsResult.data),
    dependencies: rows(dependenciesResult.data),
    approvals: rows(approvalsResult.data),
    consents: rows(consentsResult.data),
    signatures: rows(signaturesResult.data),
    milestones: rows(milestonesResult.data),
    verifierAssignments: rows(assignmentsResult.data),
    evidenceRequirements: rows(requirementsResult.data),
    evidenceSubmissions: rows(submissionsResult.data),
    risks: rows(risksResult.data),
    reservations: rows(reservationsResult.data),
    budgetAccounts: rows(accountsResult.data),
    pool: poolResult.data as InstitutionalRow | null,
    contributions: rows(contributionsResult.data),
    anchors: rows(anchorsResult.data),
    underwritings: rows(underwritingsResult.data),
    votes: rows(votesResult.data),
    disputes: rows(disputesResult.data),
    auditEvents: rows(auditResult.data),
  };
}

export async function loadInstitutionalVerifierAssignment(assignmentId: string) {
  const client = (await createClient()) as any;
  const assignmentResult = await client.from("institutional_verifier_assignments").select("*").eq("id", assignmentId).maybeSingle();
  if (assignmentResult.error || !assignmentResult.data) notFound();
  const dealResult = await client.from("institutional_deals").select("id,title,summary,lead_organization_id").eq("id", assignmentResult.data.deal_id).maybeSingle();
  return { assignment: assignmentResult.data as InstitutionalRow, deal: dealResult.data as InstitutionalRow | null };
}

export async function loadInstitutionalConsent(consentId: string) {
  const client = (await createClient()) as any;
  const consentResult = await client.from("institutional_individual_consents").select("*").eq("id", consentId).maybeSingle();
  if (consentResult.error || !consentResult.data) notFound();
  const consent = consentResult.data as InstitutionalRow;
  const [dealResult, proposalResult, obligationResult] = await Promise.all([
    client.from("institutional_deals").select("*").eq("id", consent.deal_id).maybeSingle(),
    client.from("institutional_proposal_versions").select("*").eq("id", consent.proposal_version_id).maybeSingle(),
    client.from("institutional_obligations").select("*").eq("id", consent.obligation_id).maybeSingle(),
  ]);
  return { consent, deal: dealResult.data as InstitutionalRow | null, proposal: proposalResult.data as InstitutionalRow | null, obligation: obligationResult.data as InstitutionalRow | null };
}

export async function loadInstitutionalDealDeskForVerifiedOperator() {
  const client = createServiceClient() as any;
  const now = new Date().toISOString();
  const [organizations, profiles, deals, parties, verifications, risks, disputes, milestones, reservations, accounts, pools, matches, audits] = await Promise.all([
    client.from("institutional_organizations").select("*").order("display_name"),
    client.from("profiles").select("id,display_name,email").limit(1000),
    client.from("institutional_deals").select("*").not("stage", "in", '(completed,terminated,expired)').order("updated_at", { ascending: false }),
    client.from("institutional_deal_parties").select("*").order("created_at"),
    client.from("institutional_verification_records").select("*").eq("status", "pending").order("created_at"),
    client.from("institutional_risk_reviews").select("*").in("status", ["open", "needs_information", "blocked"]).order("created_at", { ascending: false }),
    client.from("institutional_disputes").select("*").not("stage", "in", '(resolved,closed,withdrawn)').order("updated_at", { ascending: false }),
    client.from("institutional_milestones").select("*").lt("due_at", now).not("status", "in", '(verified,completed,waived)').order("due_at"),
    client.from("institutional_budget_reservations").select("*").in("status", ["tentative", "approved", "committed"]).order("created_at", { ascending: false }),
    client.from("institutional_budget_accounts").select("*").order("name"),
    client.from("institutional_pool_terms").select("*").in("status", ["draft", "open", "ready", "active"]).order("created_at", { ascending: false }),
    client.from("institutional_matches").select("*").order("created_at", { ascending: false }).limit(100),
    client.from("institutional_audit_events").select("*").order("occurred_at", { ascending: false }).limit(200),
  ]);
  for (const result of [organizations, profiles, deals, parties, verifications, risks, disputes, milestones, reservations, accounts, pools, matches, audits]) assertNoError(result.error, "Load institutional operator data");
  return {
    organizations: rows(organizations.data), profiles: rows(profiles.data), deals: rows(deals.data), dealParties: rows(parties.data),
    pendingVerifications: rows(verifications.data), risks: rows(risks.data), disputes: rows(disputes.data), overdueMilestones: rows(milestones.data),
    activeReservations: rows(reservations.data), budgetAccounts: rows(accounts.data), pools: rows(pools.data), recentMatches: rows(matches.data), recentAuditEvents: rows(audits.data),
  };
}
