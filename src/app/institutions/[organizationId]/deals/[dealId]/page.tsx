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

function txt(value: unknown, fallback = "Not recorded") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function mapRow(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function formBase(actionType: string, returnTo: string, dealId: string) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
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
  await requireViewer(`/institutions/${organizationId}/deals/${dealId}`);
  const data = await loadInstitutionalDeal(organizationId, dealId);
  if (!data) notFound();

  const returnTo = `/institutions/${organizationId}/deals/${dealId}`;
  const message = getFormMessage(resolvedSearchParams);
  const actions = getTopbarActions(true);
  const programById = mapRow(data.programs);
  const profileById = mapRow(data.profiles);
  const partyById = mapRow(data.parties);
  const proposalById = mapRow(data.proposals);
  const obligationById = mapRow(data.obligations);
  const requirementById = mapRow(data.evidenceRequirements);
  const accountById = mapRow(data.budgetAccounts);
  const selectedProposal = data.proposals.find((proposal) => proposal.id === data.deal.selected_proposal_version_id) ?? null;
  const activeAuthorityGrants = data.authorityGrants;
  const exactPrograms = data.programs.filter((program) => data.parties.some((party) => party.program_id === program.id));
  const organizationParty = data.parties.find((party) => party.organization_id === organizationId) ?? data.parties[0] ?? null;
  const selectedObligations = selectedProposal ? data.obligations.filter((obligation) => obligation.proposal_version_id === selectedProposal.id) : [];
  const requiredConsents = data.consents.filter((consent) => consent.decision !== "withdrawn");
  const acceptedVerifierCount = data.verifierAssignments.filter((assignment) => assignment.status === "accepted").length;
  const blockingRisks = data.risks.filter((risk) => risk.nonwaivable && !["resolved", "accepted"].includes(risk.status)).length;
  const committedContributions = data.contributions.filter((row) => ["committed", "paid"].includes(row.status));
  const committedCents = committedContributions.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);

  return <div className={styles.shell}>
    <SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{formatInstitutionalLabel(data.deal.deal_type)} · {formatInstitutionalLabel(data.deal.classification)}</p>
        <h1>{data.deal.title}</h1>
        <p>{data.deal.summary || "No deal summary has been recorded."}</p>
        <div className={styles.heroActions}><Link className={styles.secondaryButton} href={`/institutions/${organizationId}`}>Back to organization</Link><a className={styles.secondaryButton} href="#proposals">Exact terms</a><a className={styles.secondaryButton} href="#evidence">Evidence</a>{data.pool ? <a className={styles.secondaryButton} href="#pool">Pool governance</a> : null}</div>
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
        <InstitutionalMetric label="Deal stage" value={formatInstitutionalLabel(data.deal.stage)} detail={data.deal.signed_at ? `Signed ${new Date(data.deal.signed_at).toLocaleString()}` : "No signed-stage timestamp"} />
        <InstitutionalMetric label="Exact parties" value={data.parties.length} detail={`${exactPrograms.length} program scope${exactPrograms.length === 1 ? "" : "s"}`} />
        <InstitutionalMetric label="Signatures" value={data.signatures.length} detail={`${requiredConsents.filter((row) => row.decision === "affirmed").length}/${requiredConsents.length} named consents affirmed`} />
        <InstitutionalMetric label={data.pool ? "Committed pool amount" : "Integrity gates"} value={data.pool ? formatInstitutionalMoney(committedCents, data.pool.currency) : blockingRisks} detail={data.pool ? `${committedContributions.length} committed contributors` : `${acceptedVerifierCount} accepted verifier assignments`} />
      </div>

      <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Scope" title="Parties and no-trade baselines" description="The no-trade baseline is recorded for the same organization and program as the deal party. Another program in the same organization cannot approve or substitute its baseline." />
        <div className={styles.grid}>{data.parties.map((party) => {
          const program = programById.get(party.program_id);
          const representative = profileById.get(party.representative_profile_id);
          const baselines = data.baselines.filter((baseline) => baseline.party_id === party.id);
          return <article className={styles.card} key={party.id}>
            <div className={styles.cardHeader}><h3>{program?.name || txt(party.organization_id, "Organization-wide party")}</h3><InstitutionalStatus tone={institutionalStatusTone(party.authority_status)}>{formatInstitutionalLabel(party.authority_status)}</InstitutionalStatus></div>
            <InstitutionalKeyValue entries={[
              ["Party role", formatInstitutionalLabel(party.party_role)],
              ["Representative", representative?.display_name || representative?.email || "Not named"],
              ["Approval", formatInstitutionalLabel(party.approval_status)],
              ["Consent", formatInstitutionalLabel(party.consent_status)],
            ]} />
            {baselines.length ? baselines.map((baseline) => <div className={styles.callout} key={baseline.id}><p><strong>No trade:</strong> {baseline.statement}</p><p><small>{formatInstitutionalLabel(baseline.confidence)} confidence · {formatInstitutionalLabel(baseline.status)}</small></p></div>) : <InstitutionalEmpty>No exact-scope baseline recorded.</InstitutionalEmpty>}
          </article>;
        })}</div>
        <InstitutionalDisclosure title="Record an exact-scope baseline"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_baseline", returnTo, dealId)}
          <label>Party<select name="partyId" required defaultValue=""><option value="" disabled>Select exact party</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{programById.get(party.program_id)?.name || party.party_role}</option>)}</select></label>
          <label>Organization<select name="organizationId" required defaultValue={organizationParty?.organization_id || ""}>{data.parties.map((party) => <option key={party.id} value={party.organization_id}>{programById.get(party.program_id)?.name || party.organization_id}</option>)}</select></label>
          <label>Program<select name="programId" defaultValue={organizationParty?.program_id || ""}><option value="">Organization-wide</option>{exactPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
          <label>Confidence<select name="confidence" defaultValue="moderate"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
          <label className={styles.fullSpan}>What happens without this trade?<textarea name="statement" required /></label>
          <label className={`${styles.checkbox} ${styles.fullSpan}`}><input name="lockNow" type="checkbox" />Lock this baseline after creation</label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record exact-scope baseline</button></div>
        </form></InstitutionalDisclosure>
      </section>

      <section className={styles.section} id="proposals">
        <InstitutionalSectionHeader eyebrow="Terms" title="Versioned proposals and exact-term selection" description="Proposal rows are immutable after selection. A database-owned hash binds the selected proposal, named-person consent, and every signature to the same terms." />
        {data.proposals.length ? <div className={styles.grid}>{data.proposals.map((proposal) => <article className={styles.card} key={proposal.id}>
          <div className={styles.cardHeader}><div><p className={styles.eyebrow}>Version {proposal.version}</p><h3>{proposal.title}</h3></div><InstitutionalStatus tone={institutionalStatusTone(proposal.status)}>{formatInstitutionalLabel(proposal.status)}</InstitutionalStatus></div>
          <p>{proposal.summary}</p><p className={styles.termHash}>{proposal.terms_hash}</p><JsonDetails label="Exact structured terms" value={proposal.terms} />
          {proposal.status === "proposed" && !selectedProposal ? <form action={runInstitutionalAction} className={styles.form}>
            {formBase("select_proposal", `${returnTo}#proposals`, dealId)}
            <input name="proposalVersionId" type="hidden" value={proposal.id} /><input name="organizationId" type="hidden" value={organizationParty?.organization_id || organizationId} /><input name="programId" type="hidden" value={organizationParty?.program_id || ""} />
            <button className={styles.primaryButton} type="submit">Select exact terms</button>
          </form> : null}
        </article>)}</div> : <InstitutionalEmpty>No proposal version has been created.</InstitutionalEmpty>}
        <InstitutionalDisclosure title="Create a proposal version"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_proposal", `${returnTo}#proposals`, dealId)}
          <label>Version<input name="version" type="number" min="1" defaultValue={data.proposals.length + 1} required /></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="proposed">Proposed</option></select></label>
          <label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Summary<textarea name="summary" /></label><label className={styles.fullSpan}>Structured exact terms (JSON)<textarea name="terms" defaultValue="{}" required /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create immutable version</button></div>
        </form></InstitutionalDisclosure>
      </section>

      <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Authorization" title="Approvals, named-person consent, and signatures" description="Organizational approval and individual consent are independent records. A signature is accepted only for the currently selected authoritative terms hash." />
        <div className={styles.twoColumn}><div><h3>Organizational approvals</h3>{data.approvals.length ? <div className={styles.grid}>{data.approvals.map((approval) => <article className={styles.card} key={approval.id}><div className={styles.cardHeader}><h3>{formatInstitutionalLabel(approval.approval_kind)}</h3><InstitutionalStatus tone={institutionalStatusTone(approval.decision)}>{formatInstitutionalLabel(approval.decision)}</InstitutionalStatus></div><p>{programById.get(approval.program_id)?.name || "Organization-wide"}</p><p>Requested from {profileById.get(approval.requested_from_profile_id)?.display_name || approval.requested_from_profile_id}</p></article>)}</div> : <InstitutionalEmpty>No organizational approval record.</InstitutionalEmpty>}</div>
        <div><h3>Named-person consents</h3>{data.consents.length ? <div className={styles.grid}>{data.consents.map((consent) => <article className={styles.card} key={consent.id}><div className={styles.cardHeader}><h3>{profileById.get(consent.individual_profile_id)?.display_name || "Named person"}</h3><InstitutionalStatus tone={institutionalStatusTone(consent.decision)}>{formatInstitutionalLabel(consent.decision)}</InstitutionalStatus></div><p className={styles.termHash}>{consent.terms_hash}</p><Link className={styles.textButton} href={`/institutions/consents/${consent.id}`}>Open exact-term consent</Link></article>)}</div> : <InstitutionalEmpty>No named-person consent has been requested.</InstitutionalEmpty>}</div></div>
        {selectedProposal && selectedObligations.filter((obligation) => obligation.individual_consent_required).map((obligation) => {
          const existing = data.consents.find((consent) => consent.obligation_id === obligation.id && consent.terms_hash === selectedProposal.terms_hash && !["withdrawn", "superseded"].includes(consent.decision));
          return existing ? null : <form action={runInstitutionalAction} className={styles.inlineActions} key={obligation.id}>
            {formBase("request_individual_consent", `${returnTo}#proposals`, dealId)}<input name="obligationId" type="hidden" value={obligation.id} />
            <button className={styles.primaryButton} type="submit">Request exact-term consent</button><span>for {obligation.title}</span>
          </form>;
        })}
        {selectedProposal ? <InstitutionalDisclosure title="Sign selected exact terms"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("sign_deal", returnTo, dealId)}<input name="expectedTermsHash" type="hidden" value={selectedProposal.terms_hash} />
          <label>Exact party<select name="partyId" required defaultValue={organizationParty?.id || ""}>{data.parties.map((party) => <option key={party.id} value={party.id}>{programById.get(party.program_id)?.name || party.party_role}</option>)}</select></label>
          <label>Signing authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select exact-scope signing authority</option>{activeAuthorityGrants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("deal:sign")).map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label>
          <div className={styles.fullSpan}><p className={styles.termHash}>{selectedProposal.terms_hash}</p></div><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Sign exact selected terms</button></div>
        </form></InstitutionalDisclosure> : <p className={styles.callout}>Select one exact proposal before collecting consent or signatures.</p>}
        {data.signatures.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Party</th><th>Signer</th><th>Exact hash</th><th>Signed</th></tr></thead><tbody>{data.signatures.map((signature) => <tr key={signature.id}><td>{programById.get(partyById.get(signature.party_id)?.program_id)?.name || signature.party_id}</td><td>{profileById.get(signature.signer_profile_id)?.display_name || signature.signer_profile_id}</td><td className={styles.termHash}>{signature.terms_hash}</td><td><InstitutionalDate value={signature.signed_at} /></td></tr>)}</tbody></table></div> : null}
      </section>

      <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Obligations" title="Typed obligations and milestones" description="Every obligation, dependency, and milestone is constrained to one deal and one exact proposal version. Cross-deal and cross-obligation relationships fail closed." />
        {data.obligations.length ? <div className={styles.grid}>{data.obligations.map((obligation) => <article className={styles.card} key={obligation.id}><div className={styles.cardHeader}><h3>{obligation.title}</h3><InstitutionalStatus tone={institutionalStatusTone(obligation.status)}>{formatInstitutionalLabel(obligation.status)}</InstitutionalStatus></div><p>{obligation.description}</p><InstitutionalKeyValue entries={[["Resource", formatInstitutionalLabel(obligation.resource_type)],["Obligor", programById.get(partyById.get(obligation.obligor_party_id)?.program_id)?.name || obligation.obligor_party_id],["Quantity", obligation.amount_cents != null ? formatInstitutionalMoney(obligation.amount_cents, obligation.currency) : `${obligation.quantity ?? "—"} ${obligation.unit ?? ""}`],["Named consent", obligation.individual_consent_required ? "Required" : "Not required"]]} />{data.milestones.filter((milestone) => milestone.obligation_id === obligation.id).map((milestone) => <p key={milestone.id}><strong>{milestone.title}</strong> · {formatInstitutionalLabel(milestone.status)} · <InstitutionalDate value={milestone.due_at} /></p>)}</article>)}</div> : <InstitutionalEmpty>No obligation has been recorded.</InstitutionalEmpty>}
        {selectedProposal ? <InstitutionalDisclosure title="Create a typed obligation"><form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_obligation", returnTo, dealId)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} />
          <label>Obligor party<select name="obligorPartyId" required defaultValue=""><option value="" disabled>Select party</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{programById.get(party.program_id)?.name || party.party_role}</option>)}</select></label><label>Beneficiary party<select name="beneficiaryPartyId" defaultValue=""><option value="">No named beneficiary</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{programById.get(party.program_id)?.name || party.party_role}</option>)}</select></label>
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
        {selectedProposal && data.obligations.length ? <>
          <InstitutionalDisclosure title="Create a milestone"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("create_milestone", returnTo, dealId)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} /><label>Obligation<select name="obligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{selectedObligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label><label>Due date<input name="dueAt" type="datetime-local" /></label><label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Description<textarea name="description" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create exact-relation milestone</button></div></form></InstitutionalDisclosure>
          <InstitutionalDisclosure title="Create an evidence requirement"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("create_evidence_requirement", returnTo, dealId)}<input name="proposalVersionId" type="hidden" value={selectedProposal.id} /><label>Obligation<select name="obligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{selectedObligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label><label>Milestone<select name="milestoneId" defaultValue=""><option value="">No milestone</option>{data.milestones.filter((milestone) => milestone.proposal_version_id === selectedProposal.id).map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label><label>Verifier assignment<select name="verifierAssignmentId" defaultValue=""><option value="">No independent verifier</option>{data.verifierAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{profileById.get(assignment.verifier_profile_id)?.display_name || assignment.id}</option>)}</select></label><label>Evidence type<select name="evidenceType"><option value="document">Document</option><option value="receipt">Receipt</option><option value="attestation">Attestation</option><option value="data">Data</option><option value="photo">Photo</option><option value="link">Link</option><option value="third_party_confirmation">Third-party confirmation</option></select></label><label className={styles.fullSpan}>Title<input name="title" required /></label><label className={styles.fullSpan}>Description<textarea name="description" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create exact evidence requirement</button></div></form></InstitutionalDisclosure>
        </> : null}
      </section>

      {data.pool ? <section className={styles.section} id="pool">
        <InstitutionalSectionHeader eyebrow="Collective coordination" title="Pool approval, reservation, and governance" description="Program approval authority, financial reservation authority, and pool governance authority are separate. Contribution, anchor, underwriting, and vote eligibility are validated atomically against the current pool terms hash." />
        <div className={styles.metricGrid}><InstitutionalMetric label="Threshold" value={formatInstitutionalMoney(data.pool.threshold_amount_cents, data.pool.currency)} detail={`${data.pool.minimum_contributors} minimum contributors`} /><InstitutionalMetric label="Committed" value={formatInstitutionalMoney(committedCents, data.pool.currency)} detail={`${committedContributions.length} contributors`} /><InstitutionalMetric label="Governance votes" value={data.votes.length} detail={formatInstitutionalLabel(data.pool.governance_rule)} /><InstitutionalMetric label="Pool status" value={formatInstitutionalLabel(data.pool.status)} detail={`Terms ${String(data.pool.terms_hash).slice(0, 12)}…`} /></div>
        <p className={styles.callout}>Financial reservation and pool approval remain separate. A pool-wide commitment cannot activate solely because one representative controls both records.</p>
        <div className={styles.grid}>{data.contributions.map((contribution) => <article className={styles.card} key={contribution.id}><div className={styles.cardHeader}><h3>{programById.get(contribution.program_id)?.name || contribution.organization_id}</h3><InstitutionalStatus tone={institutionalStatusTone(contribution.status)}>{formatInstitutionalLabel(contribution.status)}</InstitutionalStatus></div><p>{formatInstitutionalMoney(contribution.amount_cents, data.pool.currency)}</p><p>{formatInstitutionalLabel(contribution.approval_status)}</p></article>)}</div>
        <InstitutionalDisclosure title="Record independent pool approval"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("record_pool_approval", `${returnTo}#pool`, dealId)}<input name="organizationId" type="hidden" value={organizationParty?.organization_id || organizationId} /><label>Program<select name="programId" defaultValue={organizationParty?.program_id || ""}><option value="">Organization-wide</option>{exactPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Decision<select name="decision"><option value="approve">Approve participation</option><option value="reject">Reject participation</option></select></label><label className={styles.fullSpan}>Pool-approval authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select pool:approve authority</option>{activeAuthorityGrants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("pool:approve")).map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record independent decision</button></div></form></InstitutionalDisclosure>
        <InstitutionalDisclosure title="Reserve financial capacity"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("reserve_budget", `${returnTo}#pool`, dealId)}<label>Budget account<select name="budgetAccountId" required defaultValue=""><option value="" disabled>Select account</option>{data.budgetAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatInstitutionalMoney(account.authorized_cents, account.currency)}</option>)}</select></label><label>Amount<input name="amount" inputMode="decimal" required /></label><label className={styles.fullSpan}>Finance-reservation authority<select name="financeAuthorityGrantId" required defaultValue=""><option value="" disabled>Select finance:reserve authority</option>{activeAuthorityGrants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("finance:reserve")).map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Reserve financial capacity</button></div></form></InstitutionalDisclosure>
        <InstitutionalDisclosure title="Record contribution lifecycle"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("save_pool_contribution", `${returnTo}#pool`, dealId)}<input name="organizationId" type="hidden" value={organizationParty?.organization_id || organizationId} /><label>Program<select name="programId" defaultValue={organizationParty?.program_id || ""}><option value="">Organization-wide</option>{exactPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Amount<input name="amount" inputMode="decimal" required /></label><label>Budget reservation ID<input name="budgetReservationId" /></label><label>Finance authority<select name="financeAuthorityGrantId" defaultValue=""><option value="">Not required for pledge</option>{activeAuthorityGrants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("finance:reserve")).map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label><label>Status<select name="status"><option value="pledged">Pledged</option><option value="committed">Committed</option><option value="paid">Paid</option><option value="released">Released</option><option value="refunded">Refunded</option><option value="withdrawn">Withdrawn</option></select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Save contribution lifecycle</button></div></form></InstitutionalDisclosure>
        <InstitutionalDisclosure title="Cast an eligible governance vote"><form action={runInstitutionalAction} className={styles.formGrid}>{formBase("cast_pool_vote", `${returnTo}#pool`, dealId)}<input name="organizationId" type="hidden" value={organizationParty?.organization_id || organizationId} /><label>Program<select name="programId" defaultValue={organizationParty?.program_id || ""}><option value="">Organization-wide</option>{exactPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Proposal key<select name="proposalKey"><option value="activation">Activation</option><option value="amendment">Amendment</option><option value="termination">Termination</option><option value="dispute_resolution">Dispute resolution</option></select></label><label>Vote<select name="vote"><option value="approve">Approve</option><option value="reject">Reject</option><option value="abstain">Abstain</option></select></label><label>Governance authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select pool:approve authority</option>{activeAuthorityGrants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("pool:approve")).map((grant) => <option key={grant.id} value={grant.id}>{programById.get(grant.program_id)?.name || "Organization-wide"} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Cast exact-term vote</button></div></form></InstitutionalDisclosure>
        {data.reservations.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Budget</th><th>Amount</th><th>Status</th><th>Reserved by</th></tr></thead><tbody>{data.reservations.map((reservation) => <tr key={reservation.id}><td>{accountById.get(reservation.budget_account_id)?.name || reservation.budget_account_id}</td><td>{formatInstitutionalMoney(reservation.amount_cents, accountById.get(reservation.budget_account_id)?.currency)}</td><td>{formatInstitutionalLabel(reservation.status)}</td><td>{profileById.get(reservation.reserved_by)?.display_name || reservation.reserved_by}</td></tr>)}</tbody></table></div> : null}
      </section> : null}

      <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Audit" title="Immutable event history" description="Consequential events retain the human actor, represented organization and program, action, authority basis, trace, and before/after state." />
        {data.auditEvents.length ? <div className={styles.timeline}>{data.auditEvents.map((event) => <div className={styles.timelineItem} key={event.id}><time><InstitutionalDate value={event.occurred_at} /></time><div><strong>{formatInstitutionalLabel(event.event_type)}</strong><p>{formatInstitutionalLabel(event.entity_type)} · {event.entity_id || "No entity ID"}</p>{event.trace_id ? <p className={styles.termHash}>Trace {event.trace_id}</p> : null}</div></div>)}</div> : <InstitutionalEmpty>No audit event has been recorded.</InstitutionalEmpty>}
      </section>
    </main><SiteFooter />
  </div>;
}
