import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalDate,
  InstitutionalDisclosure,
  InstitutionalEmpty,
  InstitutionalKeyValue,
  InstitutionalMetric,
  InstitutionalSectionHeader,
  InstitutionalStatus,
  formatInstitutionalLabel,
  formatInstitutionalMoney,
  institutionalStatusTone,
} from "@/components/institutions/institutional-ui";
import { InstitutionalDealWorkspace } from "@/components/institutions/institutional-deal-workspace";
import { InstitutionalPoolWorkspace } from "@/components/institutions/institutional-pool-workspace";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { loadInstitutionalDeal } from "@/lib/institutional-data";
import { INSTITUTIONAL_RESOURCE_TYPES } from "@/lib/institutional-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ organizationId: string; dealId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type Row = Record<string, any> & { id: string };

const ORGANIZATION_DEAL_NAV = [
  ["Scope and baselines", "scope"],
  ["Exact terms", "proposals"],
  ["Approvals and signatures", "authorization"],
  ["Obligations", "obligations"],
  ["Evidence", "evidence"],
  ["Pool governance", "pool"],
  ["Deal room", "deal-room"],
  ["Execution", "execution-management"],
  ["Integrity and disputes", "integrity-review"],
  ["Reports", "reporting"],
  ["Audit", "audit"],
] as const;

function txt(value: unknown, fallback = "Not recorded") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function mapRow(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function formBase(actionType: string, returnTo: string, dealId: string, organizationId: string, programId: string | null) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
    <input name="actingCapacity" type="hidden" value="organization" />
    <input name="actingOrganizationId" type="hidden" value={organizationId} />
    <input name="actingProgramId" type="hidden" value={programId ?? ""} />
    <input name="returnTo" type="hidden" value={returnTo} />
    <input name="dealId" type="hidden" value={dealId} />
  </>;
}

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  return <details className={styles.commandPayload}><summary>{label}</summary><pre>{JSON.stringify(value ?? {}, null, 2)}</pre></details>;
}

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { dealId } = await params;
  return { title: `Institutional deal ${dealId.slice(0, 8)}`, robots: { index: false, follow: false } };
}

export default async function InstitutionalDealPage({ params, searchParams }: PageProps) {
  const [{ organizationId, dealId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/institutions/${organizationId}/deals/${dealId}`);
  const data = await loadInstitutionalDeal(organizationId, dealId, viewer.authUser.id);
  if (!data) notFound();

  const returnTo = `/institutions/${organizationId}/deals/${dealId}`;
  const message = getFormMessage(resolvedSearchParams);
  const actions = getTopbarActions(true);
  const programById = mapRow(data.programs);
  const profileById = mapRow(data.profiles);
  const partyById = mapRow(data.parties);
  const requirementById = mapRow(data.evidenceRequirements);
  const selectedProposal = data.proposals.find((proposal) => proposal.id === data.deal.selected_proposal_version_id) ?? null;
  const authorization = data.authorization;
  const activeAuthorityGrants = data.authorityGrants;
  const organizationMembers = Array.isArray(data.memberships) ? data.memberships : [];
  const organizationParties = data.parties.filter((party) => party.party_capacity === "organization");
  const exactPrograms = data.programs.filter((program) => organizationParties.some((party) => party.program_id === program.id));
  const organizationParty = organizationParties.find((party) => party.id === authorization.organizationPartyId) ?? null;
  const pendingApprovalsForViewer = data.approvals.filter((approval) => approval.organization_id === organizationId && approval.requested_from_profile_id === viewer.authUser.id && approval.decision === "pending");
  const grantsById = new Map(activeAuthorityGrants.map((grant) => [grant.id, grant]));
  const grantsFor = (grantIds: string[]) => grantIds.map((grantId) => grantsById.get(grantId)).filter((grant): grant is Row => Boolean(grant));
  const exactAcceptanceGrants = grantsFor([...new Set([
    ...authorization.authorityGrantIdsByPermission.dealManage,
    ...authorization.authorityGrantIdsByPermission.dealApprove,
  ])]);
  const approvalGrants = grantsFor(authorization.authorityGrantIdsByPermission.dealApprove);
  const signingGrants = grantsFor(authorization.authorityGrantIdsByPermission.dealSign);
  const canManageDeal = authorization.canManageDeal;
  const canApprove = authorization.canApprove;
  const canSign = authorization.canSign;
  const canReserveFunds = authorization.canReserveFunds;
  const canReviewEvidence = authorization.canReviewEvidence;
  const partyLabel = (party: Row | undefined) => {
    if (!party) return "Unknown party";
    if (party.party_capacity === "organization") return programById.get(party.program_id)?.name || txt(party.organization_id, "Organization-wide party");
    const profile = profileById.get(party.profile_id);
    return profile?.display_name || profile?.email || `Person ${txt(party.profile_id).slice(0, 8)}`;
  };
  const selectedObligations = selectedProposal ? data.obligations.filter((obligation) => obligation.proposal_version_id === selectedProposal.id) : [];
  const requiredConsents = data.consents.filter((consent) => consent.decision !== "withdrawn");
  const acceptedVerifierCount = data.verifierAssignments.filter((assignment) => assignment.status === "accepted").length;
  const blockingRisks = data.risks.filter((risk) => risk.nonwaivable && !["mitigated", "accepted", "closed"].includes(risk.status)).length;
  const committedContributions = data.contributions.filter((row) => ["committed", "paid"].includes(row.status));
  const committedCents = committedContributions.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);

  return <div className={styles.shell}>
    <SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Acting as: {data.organization.display_name} · {formatInstitutionalLabel(data.deal.deal_type)}</p>
        <h1>{data.deal.title}</h1>
        <p>{data.deal.summary || "No deal summary has been recorded."}</p>
        <div className={styles.heroActions}><Link className={styles.secondaryButton} href={`/institutions/${organizationId}`}>Back to organization</Link><Link className={styles.secondaryButton} href="/institutions/individual">Switch to personal capacity</Link><a className={styles.secondaryButton} href="#proposals">Exact terms</a><a className={styles.secondaryButton} href="#evidence">Evidence</a><a className={styles.secondaryButton} href="#pool">Pool governance</a></div>
        <nav aria-label="Organization deal workspace" className={styles.subnav}>{ORGANIZATION_DEAL_NAV.map(([label, anchor]) => <a href={`#${anchor}`} key={anchor}>{label}</a>)}</nav>
      </div>
      <aside className={styles.heroAside}>
        <div className={styles.principle}><span>01</span><div><strong>Exact organization and program scope</strong><p>Baselines, approvals, signatures, contributions, and votes are valid only for the party scope named by the deal.</p></div></div>
        <div className={styles.principle}><span>02</span><div><strong>Selected terms are immutable</strong><p>Every signature and named-person consent is bound to one proposal identifier and its authoritative database hash.</p></div></div>
        <div className={styles.principle}><span>03</span><div><strong>Approval is not consent</strong><p>An organization may approve a deal, but it cannot consent on behalf of a named person whose labor or autonomy is involved.</p></div></div>
      </aside>
    </div></header>
    <main className={styles.main}>
      {message ? <p className={message.tone === "error" ? styles.errorNotice : styles.successNotice}>{message.text}</p> : null}
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Deal stage" value={formatInstitutionalLabel(data.deal.stage)} note={
          data.deal.signed_at ? (
            <>Signed <InstitutionalDate value={data.deal.signed_at} /></>
          ) : (
            "No signed-stage timestamp"
          )
        } />
        <InstitutionalMetric label="Exact parties" value={data.parties.length} note={`${exactPrograms.length} program scope${exactPrograms.length === 1 ? "" : "s"}`} />
        <InstitutionalMetric label="Signatures" value={data.signatures.length} note={`${requiredConsents.filter((row) => row.decision === "affirmed").length}/${requiredConsents.length} named consents affirmed`} />
        <InstitutionalMetric label={data.pool ? "Committed pool amount" : "Integrity gates"} value={data.pool ? formatInstitutionalMoney(committedCents, data.pool.currency) : blockingRisks} note={data.pool ? `${committedContributions.length} committed contributors` : `${acceptedVerifierCount} accepted verifier assignments`} />
      </div>
      <p className={styles.callout}>Authority controls are rendered from a database-owned snapshot as of <InstitutionalDate value={authorization.asOf} />. Every submitted action independently rechecks current authority, exact scope, and AAL2.</p>
      {!canManageDeal && !authorization.canAcceptOrganizationParty ? <p className={styles.callout}>This organization can read the deal, but the current acting scope has no active management authority. Organization-only mutation controls are hidden.</p> : null}

      <section className={styles.section} id="scope">
        <InstitutionalSectionHeader eyebrow="Scope" title="Parties and no-trade baselines" description="Every party has an explicit capacity. Organization baselines use exact organization/program scope; personal baselines use the exact named profile and no organization." />
        <div className={styles.grid}>{data.parties.map((party) => {
          const representative = profileById.get(party.representative_profile_id);
          const baselines = data.baselines.filter((baseline) => baseline.party_id === party.id);
          return <article className={styles.card} key={party.id}>
            <div className={styles.cardHeader}><h3>{partyLabel(party)}</h3><InstitutionalStatus tone={institutionalStatusTone(party.authority_status)}>{formatInstitutionalLabel(party.authority_status)}</InstitutionalStatus></div>
            <InstitutionalKeyValue entries={[
              ["Capacity", formatInstitutionalLabel(party.party_capacity)],
              ["Party role", formatInstitutionalLabel(party.party_role)],
              ["Representative", party.party_capacity === "organization" ? (representative?.display_name || representative?.email || "Not named") : partyLabel(party)],
              ["Approval", formatInstitutionalLabel(party.approval_status)],
              ["Consent", formatInstitutionalLabel(party.consent_status)],
            ]} />
            {baselines.length ? baselines.map((baseline) => <div className={styles.callout} key={baseline.id}><p><strong>No trade:</strong> {baseline.statement}</p><p><small>{formatInstitutionalLabel(baseline.confidence)} confidence · {formatInstitutionalLabel(baseline.status)}</small></p></div>) : <InstitutionalEmpty>No exact-scope baseline recorded.</InstitutionalEmpty>}
          </article>;
        })}</div>
        {canManageDeal ? <InstitutionalDisclosure title="Record an exact-scope baseline"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_baseline", returnTo, dealId, organizationId, organizationParty?.program_id ?? null)}
          <label>Party<select name="partyId" required defaultValue=""><option value="" disabled>Select exact party</option>{organizationParties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label>
          <label>Organization<select name="organizationId" required defaultValue={organizationParty?.organization_id || ""}>{organizationParties.map((party) => <option key={party.id} value={party.organization_id}>{partyLabel(party)}</option>)}</select></label>
          <label>Program<select name="programId" defaultValue={organizationParty?.program_id || ""}><option value="">Organization-wide</option>{exactPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
          <label>Confidence<select name="confidence" defaultValue="moderate"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
          <label className={styles.fullSpan}>What happens without this trade?<textarea name="statement" required /></label>
          <label className={`${styles.checkbox} ${styles.fullSpan}`}><input name="lockNow" type="checkbox" />Lock this baseline after creation</label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record exact-scope baseline</button></div>
        </form></InstitutionalDisclosure> : null}
        {canManageDeal ? <InstitutionalDisclosure title="Invite an organization or named person"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_deal_party", returnTo, dealId, organizationId, organizationParty?.program_id ?? null)}
          <label>Capacity<select name="partyCapacity" defaultValue="organization"><option value="organization">Organization</option><option value="individual">Individual</option><option value="service_provider">Service provider</option><option value="verifier">Verifier</option></select></label>
          <label>Party role<input name="partyRole" required /></label>
          <label>Person profile ID<input name="partyProfileId" placeholder="Required for a personal capacity" /></label>
          <label>Organization ID<input name="partyOrganizationId" placeholder="Required for organization capacity" /></label>
          <label>Program ID<input name="partyProgramId" placeholder="Optional exact program" /></label>
          <label>Legal entity ID<input name="legalEntityId" /></label>
          <label>Representative profile ID<input name="representativeProfileId" /></label>
          <label>Authority status<select name="authorityStatus" defaultValue="pending"><option value="pending">Pending</option><option value="verified_for_scope">Verified for scope</option><option value="unverified">Unverified</option></select></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Invite exact party</button></div>
        </form></InstitutionalDisclosure> : null}
        {organizationParty && authorization.canAcceptOrganizationParty && (!organizationParty.joined_at || organizationParty.authority_status !== "verified_for_scope") ? <InstitutionalDisclosure title="Accept this organization-party invitation under exact authority"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("accept_organization_deal_party", `${returnTo}#scope`, dealId, organizationId, organizationParty?.program_id ?? null)}
          <input name="partyId" type="hidden" value={organizationParty.id} /><input name="organizationId" type="hidden" value={organizationId} /><input name="programId" type="hidden" value={organizationParty.program_id || ""} />
          <label className={styles.fullSpan}>Acceptance authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select exact deal:manage or deal:approve authority</option>{exactAcceptanceGrants.map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label>
          <p className={`${styles.callout} ${styles.fullSpan}`}>Acceptance binds only the invited organization and exact program. It also grants the accepting representative an explicit deal-room membership; it does not create authority in personal capacity.</p>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Accept exact organization scope</button></div>
        </form></InstitutionalDisclosure> : null}
      </section>

      <section className={styles.section} id="proposals">
        <InstitutionalSectionHeader eyebrow="Terms" title="Versioned proposals and exact-term selection" description="Proposal rows are immutable after selection. A database-owned hash binds the selected proposal, named-person consent, and every signature to the same terms." />
        {data.proposals.length ? <div className={styles.grid}>{data.proposals.map((proposal) => <article className={styles.card} key={proposal.id}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Version {proposal.version}</p><h3>{proposal.title}</h3></div><InstitutionalStatus tone={institutionalStatusTone(proposal.status)}>{formatInstitutionalLabel(proposal.status)}</InstitutionalStatus></div>
          <p>{proposal.summary}</p><p className={styles.termHash}>{proposal.terms_hash}</p><JsonDetails label="Exact structured terms" value={proposal.terms} />
          {canManageDeal && proposal.status === "proposed" && !selectedProposal ? <form action={runInstitutionalAction} className={styles.form}>
            {formBase("select_proposal", `${returnTo}#proposals`, dealId, organizationId, organizationParty?.program_id ?? null)}
            <input name="proposalVersionId" type="hidden" value={proposal.id} /><input name="organizationId" type="hidden" value={organizationParty?.organization_id || organizationId} /><input name="programId" type="hidden" value={organizationParty?.program_id || ""} />
            <button className={styles.primaryButton} type="submit">Select exact terms</button>
          </form> : null}
        </article>)}</div> : <InstitutionalEmpty>No proposal version has been created.</InstitutionalEmpty>}
        {canManageDeal ? <InstitutionalDisclosure title="Create a proposal version"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_proposal", `${returnTo}#proposals`, dealId, organizationId, organizationParty?.program_id ?? null)}
          <label>Version<input name="version" type="number" min="1" defaultValue={data.proposals.length + 1} required /></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="proposed">Proposed</option></select></label>
          <label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Summary<textarea name="summary" /></label><label className={styles.fullSpan}>Structured exact terms (JSON)<textarea name="terms" defaultValue="{}" required /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create immutable version</button></div>
        </form></InstitutionalDisclosure> : null}
      </section>

      <section className={styles.section} id="authorization">
        <InstitutionalSectionHeader eyebrow="Authorization" title="Approvals, named-person consent, and signatures" description="Organizational approval and individual consent are independent records. A signature is accepted only for the currently selected authoritative terms hash." />
        <div className={styles.twoColumn}><div><h3>Organizational approvals</h3>{data.approvals.length ? <div className={styles.grid}>{data.approvals.map((approval) => <article className={styles.card} key={approval.id}><div className={styles.cardHeader}><h3>{formatInstitutionalLabel(approval.approval_kind)}</h3><InstitutionalStatus tone={institutionalStatusTone(approval.decision)}>{formatInstitutionalLabel(approval.decision)}</InstitutionalStatus></div><p>{programById.get(approval.program_id)?.name || "Organization-wide"}</p><p>Requested from {profileById.get(approval.requested_from_profile_id)?.display_name || approval.requested_from_profile_id}</p>{approval.decision_note ? <p>{approval.decision_note}</p> : null}</article>)}</div> : <InstitutionalEmpty>No organizational approval record.</InstitutionalEmpty>}</div>
        <div><h3>Named-person consents</h3>{data.consents.length ? <div className={styles.grid}>{data.consents.map((consent) => <article className={styles.card} key={consent.id}><div className={styles.cardHeader}><h3>{profileById.get(consent.individual_profile_id)?.display_name || "Named person"}</h3><InstitutionalStatus tone={institutionalStatusTone(consent.decision)}>{formatInstitutionalLabel(consent.decision)}</InstitutionalStatus></div><p className={styles.termHash}>{consent.terms_hash}</p><Link className={styles.textButton} href={`/institutions/consents/${consent.id}`}>Open exact-term consent</Link></article>)}</div> : <InstitutionalEmpty>No named-person consent has been requested.</InstitutionalEmpty>}</div></div>
        {canManageDeal && selectedProposal && organizationParty ? <InstitutionalDisclosure title="Request a named exact-scope organizational approval"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_approval", `${returnTo}#authorization`, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} /><input name="organizationId" type="hidden" value={organizationId} /><input name="programId" type="hidden" value={organizationParty.program_id || ""} />
          <label>Approval kind<select name="approvalKind" defaultValue="program"><option value="program">Program</option><option value="finance">Finance</option><option value="legal">Legal</option><option value="human_resources">Human resources</option><option value="board">Board</option><option value="committee">Committee</option><option value="risk">Risk</option><option value="completion">Completion</option></select></label>
          <label>Required role<input name="requiredRole" defaultValue="approver" required /></label>
          <label className={styles.fullSpan}>Named decision maker<select name="requestedFromProfileId" required defaultValue=""><option value="" disabled>Select an active organization member</option>{organizationMembers.map((membership) => <option key={membership.id} value={membership.profile_id}>{membership.profiles?.display_name || membership.profiles?.email || profileById.get(membership.profile_id)?.display_name || membership.profile_id}</option>)}</select></label>
          <p className={`${styles.callout} ${styles.fullSpan}`}>This creates a pending approval for the selected proposal and exact organization/program scope. It cannot substitute for a named person&apos;s consent.</p>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Request exact-scope approval</button></div>
        </form></InstitutionalDisclosure> : null}
        {canApprove && pendingApprovalsForViewer.length ? <InstitutionalDisclosure title="Decide approvals assigned to me"><div className={styles.grid}>{pendingApprovalsForViewer.map((approval) => <form action={runInstitutionalAction} className={styles.card} key={approval.id}>
          {formBase("decide_approval", `${returnTo}#authorization`, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="approvalId" type="hidden" value={approval.id} />
          <h3>{formatInstitutionalLabel(approval.approval_kind)} · {programById.get(approval.program_id)?.name || "Organization-wide"}</h3>
          <label>Decision<select name="decision" defaultValue="approve"><option value="approve">Approve</option><option value="reject">Reject</option><option value="abstain">Abstain</option><option value="withdrawn">Withdraw</option></select></label>
          <label>Exact approval authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select deal:approve authority</option>{approvalGrants.filter((grant) => grant.program_id === (approval.program_id || null)).map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label>
          <label>Decision note<textarea name="decisionNote" /></label><button className={styles.primaryButton} type="submit">Record named decision</button>
        </form>)}</div></InstitutionalDisclosure> : null}
        {canManageDeal && selectedProposal && selectedObligations.filter((obligation) => obligation.individual_consent_required).map((obligation) => {
          const existing = data.consents.find((consent) => consent.obligation_id === obligation.id && consent.terms_hash === selectedProposal.terms_hash && !["withdrawn", "superseded"].includes(consent.decision));
          return existing ? null : <form action={runInstitutionalAction} className={styles.inlineActions} key={obligation.id}>
            {formBase("request_individual_consent", `${returnTo}#proposals`, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="obligationId" type="hidden" value={obligation.id} />
            <button className={styles.primaryButton} type="submit">Request exact-term consent</button><span>for {obligation.title}</span>
          </form>;
        })}
        {canSign && selectedProposal ? <InstitutionalDisclosure title="Sign selected exact terms"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("sign_deal", returnTo, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="expectedTermsHash" type="hidden" value={selectedProposal.terms_hash} />
          <label>Exact party<select name="partyId" required defaultValue={organizationParty?.id || ""}>{organizationParties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label>
          <label>Signing authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select exact-scope signing authority</option>{signingGrants.map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label>
          <div className={styles.fullSpan}><p className={styles.termHash}>{selectedProposal.terms_hash}</p></div><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Sign exact selected terms</button></div>
        </form></InstitutionalDisclosure> : !selectedProposal ? <p className={styles.callout}>Select one exact proposal before collecting consent or signatures.</p> : null}
        {data.signatures.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Party</th><th>Signer</th><th>Exact hash</th><th>Signed</th></tr></thead><tbody>{data.signatures.map((signature) => <tr key={signature.id}><td>{partyLabel(partyById.get(signature.party_id))}</td><td>{profileById.get(signature.signer_profile_id)?.display_name || signature.signer_profile_id}</td><td className={styles.termHash}>{signature.terms_hash}</td><td><InstitutionalDate value={signature.signed_at} /></td></tr>)}</tbody></table></div> : null}
      </section>

      <section className={styles.section} id="obligations">
        <InstitutionalSectionHeader eyebrow="Obligations" title="Typed obligations and milestones" description="Every obligation, dependency, and milestone is constrained to one deal and one exact proposal version. Cross-deal and cross-obligation relationships fail closed." />
        {data.obligations.length ? <div className={styles.grid}>{data.obligations.map((obligation) => <article className={styles.card} key={obligation.id}><div className={styles.cardHeader}><h3>{obligation.title}</h3><InstitutionalStatus tone={institutionalStatusTone(obligation.status)}>{formatInstitutionalLabel(obligation.status)}</InstitutionalStatus></div><p>{obligation.description}</p><InstitutionalKeyValue entries={[["Resource", formatInstitutionalLabel(obligation.resource_type)],["Obligor", partyLabel(partyById.get(obligation.obligor_party_id))],["Quantity", obligation.amount_cents != null ? formatInstitutionalMoney(obligation.amount_cents, obligation.currency) : `${obligation.quantity ?? "—"} ${obligation.unit ?? ""}`],["Named consent", obligation.individual_consent_required ? "Required" : "Not required"]]} />{data.milestones.filter((milestone) => milestone.obligation_id === obligation.id).map((milestone) => <p key={milestone.id}><strong>{milestone.title}</strong> · {formatInstitutionalLabel(milestone.status)} · <InstitutionalDate value={milestone.due_at} /></p>)}</article>)}</div> : <InstitutionalEmpty>No obligation has been recorded.</InstitutionalEmpty>}
        {canManageDeal && selectedProposal ? <InstitutionalDisclosure title="Create a typed obligation"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_obligation", returnTo, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} />
          <label>Obligor party<select name="obligorPartyId" required defaultValue=""><option value="" disabled>Select party</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label><label>Beneficiary party<select name="beneficiaryPartyId" defaultValue=""><option value="">No named beneficiary</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label>
          <label>Resource type<select name="resourceType" required>{INSTITUTIONAL_RESOURCE_TYPES.map((resource) => <option key={resource} value={resource}>{formatInstitutionalLabel(resource)}</option>)}</select></label><label>Status<input disabled value="Pending" /></label>
          <label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Description<textarea name="description" /></label>
          <label>Amount<input name="amount" inputMode="decimal" /></label><label>Currency<input name="currency" defaultValue="usd" maxLength={3} /></label><label>Quantity<input name="quantity" type="number" step="any" /></label><label>Unit<input name="unit" /></label>
          <label>Named profile ID<input name="individualProfileId" /></label><label className={styles.checkbox}><input name="individualConsentRequired" type="checkbox" />Require named-person consent</label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create exact-term obligation</button></div>
        </form></InstitutionalDisclosure> : null}
      </section>

      <section className={styles.section} id="evidence">
        <InstitutionalSectionHeader eyebrow="Verification" title="Independent verification and evidence" description="A verifier receives confidential deal-room access only after accepting the named assignment and declaring conflicts. Evidence must match the same proposal, obligation, milestone, and requirement." />
        <div className={styles.twoColumn}><div><h3>Verifier assignments</h3>{data.verifierAssignments.length ? <div className={styles.grid}>{data.verifierAssignments.map((assignment) => <article className={styles.card} key={assignment.id}><div className={styles.cardHeader}><h3>{profileById.get(assignment.verifier_profile_id)?.display_name || "Independent verifier"}</h3><InstitutionalStatus tone={institutionalStatusTone(assignment.status)}>{formatInstitutionalLabel(assignment.status)}</InstitutionalStatus></div><p>{assignment.scope}</p><Link className={styles.textButton} href={`/institutions/verifier-assignments/${assignment.id}`}>Review assignment</Link></article>)}</div> : <InstitutionalEmpty>No verifier assignment.</InstitutionalEmpty>}</div>
        <div><h3>Evidence submissions</h3>{data.evidenceSubmissions.length ? <div className={styles.grid}>{data.evidenceSubmissions.map((submission) => <article className={styles.card} key={submission.id}><div className={styles.cardHeader}><h3>{requirementById.get(submission.requirement_id)?.title || "Evidence"}</h3><InstitutionalStatus tone={institutionalStatusTone(submission.status)}>{formatInstitutionalLabel(submission.status)}</InstitutionalStatus></div><JsonDetails label="Submission" value={submission.evidence} /></article>)}</div> : <InstitutionalEmpty>No evidence submitted.</InstitutionalEmpty>}</div></div>
        {canManageDeal && selectedProposal && data.obligations.length ? <>
          <InstitutionalDisclosure title="Create a milestone"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("create_milestone", returnTo, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} /><label>Obligation<select name="obligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{selectedObligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label><label>Due date<input name="dueAt" type="datetime-local" /></label><label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Description<textarea name="description" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create exact-relation milestone</button></div></form></InstitutionalDisclosure>
          <InstitutionalDisclosure title="Create an evidence requirement"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("create_evidence_requirement", returnTo, dealId, organizationId, organizationParty?.program_id ?? null)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} /><label>Obligation<select name="obligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{selectedObligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label><label>Milestone<select name="milestoneId" defaultValue=""><option value="">No milestone</option>{data.milestones.filter((milestone) => milestone.proposal_version_id === selectedProposal.id).map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label><label>Verifier assignment<select name="verifierAssignmentId" defaultValue=""><option value="">No independent verifier</option>{data.verifierAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{profileById.get(assignment.verifier_profile_id)?.display_name || assignment.id}</option>)}</select></label><label>Evidence type<select name="evidenceType"><option value="document">Document</option><option value="receipt">Receipt</option><option value="attestation">Attestation</option><option value="data">Data</option><option value="photo">Photo</option><option value="link">Link</option><option value="third_party_confirmation">Third-party confirmation</option></select></label><label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Description<textarea name="description" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create exact evidence requirement</button></div></form></InstitutionalDisclosure>
        </> : null}
      </section>

      <InstitutionalPoolWorkspace
        data={data}
        organizationId={organizationId}
        returnTo={returnTo}
        canManage={canManageDeal}
        canReserveFunds={canReserveFunds}
      />

      <InstitutionalDealWorkspace
        data={data}
        mode="organization"
        viewerProfileId={viewer.authUser.id}
        actingOrganizationId={organizationId}
        actingProgramId={organizationParty?.program_id ?? null}
        returnTo={returnTo}
        canManage={canManageDeal}
        canReviewEvidence={canReviewEvidence}
      />

      <section className={styles.section} id="audit">
        <InstitutionalSectionHeader eyebrow="Audit" title="Immutable event history" description="Consequential events retain the human actor, represented organization and program, action, authority basis, trace, and before/after state." />
        {data.auditEvents.length ? <div className={styles.timeline}>{data.auditEvents.map((event) => <div className={styles.timelineItem} key={event.id}><time><InstitutionalDate value={event.occurred_at} /></time><div><strong>{formatInstitutionalLabel(event.event_type)}</strong><p>{formatInstitutionalLabel(event.entity_type)} · {event.entity_id || "No entity ID"}</p>{event.trace_id ? <p className={styles.termHash}>Trace {event.trace_id}</p> : null}</div></div>)}</div> : <InstitutionalEmpty>No audit event has been recorded.</InstitutionalEmpty>}
      </section>
    </main><SiteFooter />
  </div>;
}
