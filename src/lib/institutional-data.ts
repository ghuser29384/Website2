import { notFound } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export type InstitutionalRow = Record<string, any> & { id: string };


export interface InstitutionalAuthorityGrantIdsByPermission {
  dealManage: string[];
  dealApprove: string[];
  dealSign: string[];
  financeReserve: string[];
  evidenceReview: string[];
}

export interface InstitutionalDealAuthorizationSnapshot {
  asOf: string;
  actingCapacity: "organization" | "individual";
  organizationId: string | null;
  programId: string | null;
  partyId: string | null;
  organizationPartyId: string | null;
  organizationPartyJoined: boolean;
  canAcceptOrganizationParty: boolean;
  canManageDeal: boolean;
  canApprove: boolean;
  canSign: boolean;
  canReserveFunds: boolean;
  canReviewEvidence: boolean;
  matchingAuthorityGrantIds: string[];
  authorityGrantIdsByPermission: InstitutionalAuthorityGrantIdsByPermission;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeInstitutionalAuthorizationSnapshot(
  value: unknown,
  expected: { actingCapacity: "organization" | "individual"; organizationId: string | null; partyId: string | null },
): InstitutionalDealAuthorizationSnapshot {
  if (!value || typeof value !== "object") throw new Error("Institutional authorization snapshot was not returned.");
  const record = value as Record<string, unknown>;
  const byPermission = record.authorityGrantIdsByPermission && typeof record.authorityGrantIdsByPermission === "object"
    ? record.authorityGrantIdsByPermission as Record<string, unknown>
    : {};
  if (record.actingCapacity !== expected.actingCapacity || (record.organizationId ?? null) !== expected.organizationId || (record.partyId ?? null) !== expected.partyId) {
    throw new Error("Institutional authorization snapshot did not match the requested acting scope.");
  }
  if (typeof record.asOf !== "string" || !record.asOf) throw new Error("Institutional authorization snapshot omitted database time.");
  return {
    asOf: record.asOf,
    actingCapacity: expected.actingCapacity,
    organizationId: expected.organizationId,
    programId: typeof record.programId === "string" ? record.programId : null,
    partyId: expected.partyId,
    organizationPartyId: typeof record.organizationPartyId === "string" ? record.organizationPartyId : null,
    organizationPartyJoined: record.organizationPartyJoined === true,
    canAcceptOrganizationParty: record.canAcceptOrganizationParty === true,
    canManageDeal: record.canManageDeal === true,
    canApprove: record.canApprove === true,
    canSign: record.canSign === true,
    canReserveFunds: record.canReserveFunds === true,
    canReviewEvidence: record.canReviewEvidence === true,
    matchingAuthorityGrantIds: stringArray(record.matchingAuthorityGrantIds),
    authorityGrantIdsByPermission: {
      dealManage: stringArray(byPermission.dealManage),
      dealApprove: stringArray(byPermission.dealApprove),
      dealSign: stringArray(byPermission.dealSign),
      financeReserve: stringArray(byPermission.financeReserve),
      evidenceReview: stringArray(byPermission.evidenceReview),
    },
  };
}

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
  const [
    organizationResult,
    programsResult,
    membershipsResult,
    grantsResult,
    mandatesResult,
    resourcesResult,
    opportunitiesResult,
    dealPartiesResult,
    verificationsResult,
    budgetAccountsResult,
    integrationsResult,
    legalEntitiesResult,
    approvalPoliciesResult,
    templatesResult,
    frameworkAgreementsResult,
    commandDraftsResult,
    matchesResult,
    profilesResult,
    organizationsResult,
    signaturesResult,
  ] = await Promise.all([
    client.from("institutional_organizations").select("*").eq("id", organizationId).maybeSingle(),
    client.from("institutional_programs").select("*").eq("organization_id", organizationId).order("name"),
    client.from("institutional_memberships").select("*").eq("organization_id", organizationId).order("created_at"),
    client.from("institutional_authority_grants").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_mandates").select("*").eq("organization_id", organizationId).order("version", { ascending: false }),
    client.from("institutional_resource_profiles").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_opportunities").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_deal_parties").select("deal_id").eq("party_capacity", "organization").eq("organization_id", organizationId),
    client.from("institutional_verification_records").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_budget_accounts").select("*").eq("organization_id", organizationId).order("name"),
    client.from("institutional_integrations").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_legal_entities").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_approval_policies").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_templates").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_framework_agreements").select("*").or(`organization_a_id.eq.${organizationId},organization_b_id.eq.${organizationId}`).order("created_at", { ascending: false }),
    client.from("institutional_command_drafts").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    client.from("institutional_matches").select("*").or(`offer_organization_id.eq.${organizationId},seek_organization_id.eq.${organizationId}`).order("created_at", { ascending: false }),
    client.from("profiles").select("id,display_name,email").limit(1000),
    client.from("institutional_public_organizations").select("id,display_name,slug,verification_status").order("display_name"),
    client.from("institutional_signatures").select("id").eq("organization_id", organizationId),
  ]);

  if (organizationResult.error || !organizationResult.data) notFound();
  for (const [result, context] of [
    [programsResult, "programs"], [membershipsResult, "memberships"], [grantsResult, "authority grants"],
    [mandatesResult, "mandates"], [resourcesResult, "resource profiles"], [opportunitiesResult, "opportunities"],
    [dealPartiesResult, "deal parties"], [verificationsResult, "verification records"], [budgetAccountsResult, "budget accounts"],
    [integrationsResult, "integrations"], [legalEntitiesResult, "legal entities"], [approvalPoliciesResult, "approval policies"],
    [templatesResult, "templates"], [frameworkAgreementsResult, "framework agreements"], [commandDraftsResult, "Command drafts"],
    [matchesResult, "matches"], [profilesResult, "profiles"], [organizationsResult, "organization directory"],
    [signaturesResult, "signatures"],
  ] as const) assertNoError(result.error, `Load institutional ${context}`);

  const dealIds = [...new Set(rows(dealPartiesResult.data).map((row) => String(row.deal_id)).filter(Boolean))];
  const integrationIds = rows(integrationsResult.data).map((row) => row.id);
  const [dealsResult, acceptedEvidenceResult, webhooksResult] = await Promise.all([
    dealIds.length
      ? client.from("institutional_deals").select("*").in("id", dealIds).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    dealIds.length
      ? client.from("institutional_evidence_submissions").select("id").in("deal_id", dealIds).eq("status", "accepted")
      : Promise.resolve({ data: [], error: null }),
    integrationIds.length
      ? client.from("institutional_webhooks").select("*").in("integration_id", integrationIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  assertNoError(dealsResult.error, "Load institutional deals");
  assertNoError(acceptedEvidenceResult.error, "Load institutional accepted evidence");
  assertNoError(webhooksResult.error, "Load institutional webhooks");

  const deals = rows(dealsResult.data);
  const trackRecord: InstitutionalRow[] = [{
    id: organizationId,
    organization_id: organizationId,
    completed_deals: deals.filter((deal) => deal.stage === "completed").length,
    disputed_deals: deals.filter((deal) => deal.stage === "disputed").length,
    signatures: rows(signaturesResult.data).length,
    accepted_evidence_submissions: rows(acceptedEvidenceResult.data).length,
  }];

  return {
    organization: organizationResult.data as InstitutionalRow,
    programs: rows(programsResult.data),
    memberships: rows(membershipsResult.data),
    authorityGrants: rows(grantsResult.data),
    mandates: rows(mandatesResult.data),
    resourceProfiles: rows(resourcesResult.data),
    opportunities: rows(opportunitiesResult.data),
    deals,
    verifications: rows(verificationsResult.data),
    budgetAccounts: rows(budgetAccountsResult.data),
    integrations: rows(integrationsResult.data),
    legalEntities: rows(legalEntitiesResult.data),
    approvalPolicies: rows(approvalPoliciesResult.data),
    templates: rows(templatesResult.data),
    frameworkAgreements: rows(frameworkAgreementsResult.data),
    commandDrafts: rows(commandDraftsResult.data),
    trackRecord,
    matches: rows(matchesResult.data),
    profiles: rows(profilesResult.data),
    organizations: rows(organizationsResult.data),
    webhooks: rows(webhooksResult.data),
  };
}

export async function loadInstitutionalDeal(organizationId: string, dealId: string, viewerProfileId: string) {
  const client = (await createClient()) as any;
  const membershipResult = await client
    .from("institutional_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", viewerProfileId)
    .eq("status", "active")
    .maybeSingle();
  if (membershipResult.error || !membershipResult.data) return null;

  const dealResult = await client.from("institutional_deals").select("*").eq("id", dealId).maybeSingle();
  if (dealResult.error || !dealResult.data) return null;
  const deal = dealResult.data as InstitutionalRow;
  const [organizationResult, programsResult, membershipsResult, partiesResult, roomMembersResult, profilesResult, authorityGrantsResult, proposalsResult, baselinesResult, obligationsResult, dependenciesResult, approvalsResult, consentsResult, signaturesResult, milestonesResult, assignmentsResult, requirementsResult, submissionsResult, risksResult, reservationsResult, accountsResult, poolResult, contributionsResult, anchorsResult, underwritingsResult, votesResult, disputesResult, auditResult, messagesResult, amendmentsResult, attributionClaimsResult, reportSnapshotsResult, organizationsResult] = await Promise.all([
    client.from("institutional_organizations").select("*").eq("id", organizationId).maybeSingle(),
    client.from("institutional_programs").select("*").in("organization_id", [...new Set([deal.lead_organization_id, organizationId].filter(Boolean))]),
    client.from("institutional_memberships").select("*,profiles:profiles!institutional_memberships_profile_id_fkey(id,display_name,email)").eq("organization_id", organizationId).eq("status", "active").order("created_at"),
    client.from("institutional_deal_parties").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_deal_room_members").select("*").eq("deal_id", dealId),
    client.from("profiles").select("id,display_name,email").limit(500),
    client.from("institutional_authority_grants").select("*").eq("organization_id", organizationId).eq("profile_id", viewerProfileId).is("revoked_at", null).order("created_at", { ascending: false }),
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
    client.from("institutional_budget_accounts").select("*").eq("organization_id", organizationId).order("name"),
    client.from("institutional_pool_terms").select("*").eq("deal_id", dealId).maybeSingle(),
    client.from("institutional_pool_contributions").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_pool_anchors").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_pool_underwritings").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_pool_votes").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_disputes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_audit_events").select("*").eq("deal_id", dealId).order("occurred_at", { ascending: false }).limit(100),
    client.from("institutional_deal_messages").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_amendments").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_attribution_claims").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_report_snapshots").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_public_organizations").select("id,display_name,slug,verification_status").order("display_name"),
  ]);
  if (organizationResult.error || !organizationResult.data) return null;
  const organizationParty = rows(partiesResult.data).find((party) => party.party_capacity === "organization" && party.organization_id === organizationId) ?? null;
  if (!organizationParty) return null;
  const authorizationResult = await client.rpc("get_institutional_deal_authorization_snapshot", {
    target_deal_id: dealId,
    target_organization_id: organizationId,
    target_party_id: organizationParty.id,
  });
  assertNoError(authorizationResult.error, "Load exact institutional authorization snapshot");
  const authorization = normalizeInstitutionalAuthorizationSnapshot(authorizationResult.data, {
    actingCapacity: "organization",
    organizationId,
    partyId: organizationParty.id,
  });
  const matchingAuthorityGrantIds = new Set(authorization.matchingAuthorityGrantIds);
  for (const [result, context] of [
    [programsResult, "programs"], [membershipsResult, "memberships"], [partiesResult, "parties"], [roomMembersResult, "deal-room members"],
    [profilesResult, "profiles"], [authorityGrantsResult, "authority grants"], [proposalsResult, "proposals"],
    [baselinesResult, "baselines"], [obligationsResult, "obligations"], [dependenciesResult, "dependencies"],
    [approvalsResult, "approvals"], [consentsResult, "consents"], [signaturesResult, "signatures"],
    [milestonesResult, "milestones"], [assignmentsResult, "verifier assignments"], [requirementsResult, "evidence requirements"],
    [submissionsResult, "evidence submissions"], [risksResult, "integrity reviews"], [reservationsResult, "budget reservations"],
    [accountsResult, "budget accounts"], [poolResult, "pool terms"], [contributionsResult, "pool contributions"],
    [anchorsResult, "pool anchors"], [underwritingsResult, "pool underwritings"], [votesResult, "pool votes"],
    [disputesResult, "disputes"], [auditResult, "audit events"], [messagesResult, "messages"],
    [amendmentsResult, "amendments"], [attributionClaimsResult, "attribution claims"], [reportSnapshotsResult, "report snapshots"],
    [organizationsResult, "organization directory"],
  ] as const) assertNoError(result.error, `Load organization institutional ${context}`);
  const disputeIds = rows(disputesResult.data).map((dispute) => dispute.id);
  const disputeEventsResult = disputeIds.length
    ? await client.from("institutional_dispute_events").select("*").in("dispute_id", disputeIds).order("created_at")
    : { data: [], error: null };
  assertNoError(disputeEventsResult.error, "Load organization institutional dispute events");
  return {
    organization: organizationResult.data as InstitutionalRow,
    deal,
    programs: rows(programsResult.data),
    memberships: rows(membershipsResult.data),
    parties: rows(partiesResult.data),
    roomMembers: rows(roomMembersResult.data),
    profiles: rows(profilesResult.data),
    authorization,
    authorityGrants: rows(authorityGrantsResult.data).filter((grant) => matchingAuthorityGrantIds.has(grant.id)),
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
    dealMessages: rows(messagesResult.data),
    amendments: rows(amendmentsResult.data),
    disputeEvents: rows(disputeEventsResult.data),
    attributionClaims: rows(attributionClaimsResult.data),
    reportSnapshots: rows(reportSnapshotsResult.data),
    organizations: rows(organizationsResult.data),
  };
}

export async function loadIndividualInstitutionalWorkspace(profileId: string) {
  const client = (await createClient()) as any;
  const [participationResult, opportunitiesResult, partiesResult, consentsResult, assignmentsResult, submissionsResult] = await Promise.all([
    client.from("institutional_individual_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
    client.from("institutional_public_opportunities").select("*").order("published_at", { ascending: false }).limit(50),
    client.from("institutional_deal_parties").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }),
    client.from("institutional_individual_consents").select("*").eq("individual_profile_id", profileId).order("created_at", { ascending: false }),
    client.from("institutional_verifier_assignments").select("*").eq("verifier_profile_id", profileId).order("created_at", { ascending: false }),
    client.from("institutional_evidence_submissions").select("*").eq("submitted_by", profileId).order("created_at", { ascending: false }).limit(100),
  ]);
  for (const [result, context] of [
    [participationResult, "individual participation"], [opportunitiesResult, "public opportunities"], [partiesResult, "personal deal parties"],
    [consentsResult, "personal consents"], [assignmentsResult, "verifier assignments"], [submissionsResult, "personal evidence"],
  ] as const) assertNoError(result.error, `Load institutional ${context}`);

  const parties = rows(partiesResult.data);
  const dealIds = [...new Set(parties.map((party) => String(party.deal_id)).filter(Boolean))];
  const partyIds = [...new Set(parties.map((party) => String(party.id)).filter(Boolean))];
  const dealsResult = dealIds.length
    ? await client.from("institutional_deals").select("*").in("id", dealIds).order("updated_at", { ascending: false })
    : { data: [], error: null };
  const obligationsResult = partyIds.length
    ? await client.from("institutional_obligations").select("*").or(`obligor_party_id.in.(${partyIds.join(",")}),beneficiary_party_id.in.(${partyIds.join(",")})`).order("created_at", { ascending: false })
    : { data: [], error: null };
  assertNoError(dealsResult.error, "Load personal institutional deals");
  assertNoError(obligationsResult.error, "Load personal institutional obligations");

  return {
    participation: participationResult.data as InstitutionalRow | null,
    opportunities: rows(opportunitiesResult.data),
    parties,
    deals: rows(dealsResult.data),
    obligations: rows(obligationsResult.data),
    consents: rows(consentsResult.data),
    verifierAssignments: rows(assignmentsResult.data),
    evidenceSubmissions: rows(submissionsResult.data),
  };
}

export async function loadIndividualInstitutionalDeal(profileId: string, dealId: string) {
  const client = (await createClient()) as any;
  const dealResult = await client.from("institutional_deals").select("*").eq("id", dealId).maybeSingle();
  if (dealResult.error || !dealResult.data) return null;
  const deal = dealResult.data as InstitutionalRow;
  const partiesResult = await client.from("institutional_deal_parties").select("*").eq("deal_id", dealId).order("created_at");
  assertNoError(partiesResult.error, "Load personal institutional deal parties");
  const parties = rows(partiesResult.data);
  const personalParty = parties.find((party) => party.profile_id === profileId && party.party_capacity !== "organization");
  const verifierAccessResult = await client.from("institutional_verifier_assignments").select("id,status").eq("deal_id", dealId).eq("verifier_profile_id", profileId).eq("status", "accepted").maybeSingle();
  assertNoError(verifierAccessResult.error, "Validate accepted verifier access");
  const acceptedVerifier = Boolean(verifierAccessResult.data);
  if (!personalParty && deal.lead_profile_id !== profileId && !acceptedVerifier) return null;
  const authorizationResult = await client.rpc("get_institutional_deal_authorization_snapshot", {
    target_deal_id: dealId,
    target_organization_id: null,
    target_party_id: personalParty?.id ?? null,
  });
  assertNoError(authorizationResult.error, "Load personal institutional authorization snapshot");
  const authorization = normalizeInstitutionalAuthorizationSnapshot(authorizationResult.data, {
    actingCapacity: "individual",
    organizationId: null,
    partyId: personalParty?.id ?? null,
  });

  const organizationIds = [...new Set(parties.map((party) => String(party.organization_id ?? "")).filter(Boolean))];
  const [organizationsResult, programsResult, roomMembersResult, profilesResult, proposalsResult, baselinesResult, obligationsResult, dependenciesResult, approvalsResult, consentsResult, signaturesResult, milestonesResult, assignmentsResult, requirementsResult, submissionsResult, risksResult, disputesResult, auditResult, messagesResult, amendmentsResult, attributionClaimsResult, reportSnapshotsResult] = await Promise.all([
    organizationIds.length ? client.from("institutional_organizations").select("*").in("id", organizationIds) : Promise.resolve({ data: [], error: null }),
    organizationIds.length ? client.from("institutional_programs").select("*").in("organization_id", organizationIds) : Promise.resolve({ data: [], error: null }),
    client.from("institutional_deal_room_members").select("*").eq("deal_id", dealId),
    client.from("profiles").select("id,display_name,email").limit(500),
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
    client.from("institutional_disputes").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_audit_events").select("*").eq("deal_id", dealId).order("occurred_at", { ascending: false }).limit(100),
    client.from("institutional_deal_messages").select("*").eq("deal_id", dealId).order("created_at"),
    client.from("institutional_amendments").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_attribution_claims").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
    client.from("institutional_report_snapshots").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
  ]);
  for (const [result, context] of [
    [organizationsResult, "counterparty organizations"], [programsResult, "counterparty programs"], [roomMembersResult, "deal-room members"],
    [profilesResult, "profiles"], [proposalsResult, "proposals"], [baselinesResult, "baselines"], [obligationsResult, "obligations"],
    [dependenciesResult, "dependencies"], [approvalsResult, "approvals"], [consentsResult, "consents"], [signaturesResult, "signatures"], [milestonesResult, "milestones"],
    [assignmentsResult, "verifier assignments"], [requirementsResult, "evidence requirements"], [submissionsResult, "evidence submissions"],
    [risksResult, "integrity reviews"], [disputesResult, "disputes"], [auditResult, "audit events"], [messagesResult, "messages"],
    [amendmentsResult, "amendments"], [attributionClaimsResult, "attribution claims"], [reportSnapshotsResult, "report snapshots"],
  ] as const) assertNoError(result.error, `Load personal institutional ${context}`);
  const disputeIds = rows(disputesResult.data).map((dispute) => dispute.id);
  const disputeEventsResult = disputeIds.length
    ? await client.from("institutional_dispute_events").select("*").in("dispute_id", disputeIds).order("created_at")
    : { data: [], error: null };
  assertNoError(disputeEventsResult.error, "Load personal institutional dispute events");

  return {
    deal,
    personalParty,
    acceptedVerifier,
    authorization,
    canManage: authorization.canManageDeal,
    organizations: rows(organizationsResult.data),
    programs: rows(programsResult.data),
    parties,
    roomMembers: rows(roomMembersResult.data),
    profiles: rows(profilesResult.data),
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
    disputes: rows(disputesResult.data),
    auditEvents: rows(auditResult.data),
    dealMessages: rows(messagesResult.data),
    amendments: rows(amendmentsResult.data),
    disputeEvents: rows(disputeEventsResult.data),
    attributionClaims: rows(attributionClaimsResult.data),
    reportSnapshots: rows(reportSnapshotsResult.data),
    authorityGrants: [],
  };
}

export async function loadInstitutionalVerifierAssignment(assignmentId: string) {
  const client = (await createClient()) as any;
  const assignmentResult = await client.from("institutional_verifier_assignments").select("*").eq("id", assignmentId).maybeSingle();
  if (assignmentResult.error || !assignmentResult.data) notFound();
  const dealResult = await client.from("institutional_deals").select("id,title,summary,lead_capacity,lead_profile_id,lead_organization_id").eq("id", assignmentResult.data.deal_id).maybeSingle();
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
