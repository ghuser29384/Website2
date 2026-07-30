import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalDate,
  InstitutionalEmpty,
  InstitutionalSectionHeader,
  InstitutionalStatus,
  formatInstitutionalLabel,
  formatInstitutionalMoney,
  institutionalStatusTone,
} from "@/components/institutions/institutional-ui";
import { InstitutionalDealWorkspace } from "@/components/institutions/institutional-deal-workspace";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { loadIndividualInstitutionalDeal } from "@/lib/institutional-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ dealId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dealId } = await params;
  return { title: `Independent deal ${dealId.slice(0, 8)}` };
}

function base(actionType: string, dealId: string, returnTo: string) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
    <input name="actingCapacity" type="hidden" value="individual" />
    <input name="dealId" type="hidden" value={dealId} />
    <input name="returnTo" type="hidden" value={returnTo} />
  </>;
}

function identifier(value: unknown) {
  return String(value ?? "");
}

export default async function IndividualInstitutionalDealPage({ params, searchParams }: PageProps) {
  const [{ dealId }, viewer, resolvedSearchParams] = await Promise.all([
    params,
    requireViewer("/institutions/individual"),
    searchParams,
  ]);
  const data = await loadIndividualInstitutionalDeal(viewer.authUser.id, dealId);
  if (!data) notFound();
  const returnTo = `/institutions/individual/deals/${dealId}`;
  const message = getFormMessage(resolvedSearchParams);
  const actions = getTopbarActions(true);
  const profileById = new Map(data.profiles.map((profile) => [identifier(profile.id), profile]));
  const organizationById = new Map(data.organizations.map((organization) => [identifier(organization.id), organization]));
  const partyById = new Map(data.parties.map((party) => [identifier(party.id), party]));
  const selectedProposal = data.proposals.find((proposal) => proposal.id === data.deal.selected_proposal_version_id) ?? null;
  const acceptedPersonalParty = data.personalParty?.joined_at && !data.personalParty.left_at ? data.personalParty : null;
  const personalSignatures = data.signatures.filter((signature) => signature.profile_id === viewer.authUser.id);
  const canSign = Boolean(acceptedPersonalParty && selectedProposal && !personalSignatures.some((signature) => signature.party_id === acceptedPersonalParty.id && signature.terms_hash === selectedProposal.terms_hash));

  const partyName = (party: Record<string, any> | undefined) => {
    if (!party) return "Unknown party";
    if (party.party_capacity === "organization") return organizationById.get(identifier(party.organization_id))?.display_name ?? `Organization ${identifier(party.organization_id).slice(0, 8)}`;
    return profileById.get(identifier(party.profile_id))?.display_name ?? `Person ${identifier(party.profile_id).slice(0, 8)}`;
  };

  return <div className={styles.shell}>
    <SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Acting as: Personal / independent</p>
        <h1>{data.deal.title}</h1>
        <p>{data.deal.summary || "No deal summary supplied."}</p>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryButton} href="/institutions/individual">Independent workspace</Link>
          <InstitutionalStatus tone={institutionalStatusTone(data.deal.stage)}>{formatInstitutionalLabel(data.deal.stage)}</InstitutionalStatus>
        </div>
        <nav aria-label="Independent deal workspace" className={styles.subnav}>
          {["Parties", "Proposals", "Baselines", "Obligations", "Evidence", "Consent and verification"].map((item) => <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>{item}</a>)}
        </nav>
      </div>
      <aside className={styles.heroAside}>
        <div className={styles.principle}><span>01</span><div><strong>Exact terms</strong><p>A signature is valid only for the selected proposal version and its stored terms hash.</p></div></div>
        <div className={styles.principle}><span>02</span><div><strong>Self authority</strong><p>Your signature covers only your own party record. It cannot authorize another person or institution.</p></div></div>
        <div className={styles.principle}><span>03</span><div><strong>Separate consent</strong><p>When a named-person consent record is required, no other approval can replace it.</p></div></div>
      </aside>
    </div></header>

    <main className={styles.main}>
      {message ? <p className={message.tone === "error" ? styles.errorNotice : styles.successNotice}>{message.text}</p> : null}

      {data.personalParty && !data.personalParty.joined_at ? <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Invitation" title="Accept your named party record" description="Acceptance gives you access as the named person. It does not confer authority over any other party." />
        <article className={styles.panel}>
          <p><strong>Capacity:</strong> {formatInstitutionalLabel(data.personalParty.party_capacity)} · <strong>Role:</strong> {formatInstitutionalLabel(data.personalParty.party_role)}</p>
          <form action={runInstitutionalAction}>{base("accept_deal_party", dealId, returnTo)}<input name="partyId" type="hidden" value={data.personalParty.id} /><button className={styles.primaryButton} type="submit">Accept participation</button></form>
        </article>
      </section> : null}

      <section className={styles.section} id="parties">
        <InstitutionalSectionHeader eyebrow="Parties" title="Who is participating" description="Every party has an explicit capacity. Personal parties have a profile and no organization or program scope." />
        {data.parties.length ? <div className={styles.grid}>{data.parties.map((party) => <article className={styles.card} key={party.id}><div className={styles.cardHeader}><h3>{partyName(party)}</h3><InstitutionalStatus tone={party.joined_at ? "good" : "warn"}>{party.joined_at ? "Accepted" : "Invited"}</InstitutionalStatus></div><p>{formatInstitutionalLabel(party.party_capacity)} · {formatInstitutionalLabel(party.party_role)}</p><p>Authority: {formatInstitutionalLabel(party.authority_status)} · Party decision: {formatInstitutionalLabel(party.approval_status)}</p></article>)}</div> : <InstitutionalEmpty>No party record.</InstitutionalEmpty>}
        {data.canManage ? <details className={styles.disclosure}><summary>Invite another party</summary><div className={styles.disclosureBody}><form action={runInstitutionalAction} className={styles.formGrid}>
          {base("create_deal_party", dealId, returnTo)}
          <label>Capacity<select name="partyCapacity" defaultValue="individual"><option value="individual">Individual</option><option value="service_provider">Service provider</option><option value="verifier">Verifier</option><option value="organization">Organization</option></select></label>
          <label>Role<input name="partyRole" required placeholder="counterparty, donor, researcher, beneficiary…" /></label>
          <label>Person profile ID<input name="partyProfileId" placeholder="Required for a personal capacity" /></label>
          <label>Organization ID<input name="partyOrganizationId" placeholder="Required only for organization capacity" /></label>
          <label>Program ID<input name="partyProgramId" placeholder="Optional exact program" /></label>
          <label>Legal entity ID<input name="legalEntityId" placeholder="Optional organization legal entity" /></label>
          <label>Representative profile ID<input name="representativeProfileId" placeholder="Optional organization representative" /></label>
          <label>Authority status<select name="authorityStatus" defaultValue="pending"><option value="pending">Pending</option><option value="verified_for_scope">Verified for scope</option><option value="unverified">Unverified</option></select></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Invite exact party</button></div>
        </form></div></details> : null}
      </section>

      <section className={styles.section} id="proposals">
        <InstitutionalSectionHeader eyebrow="Terms" title="Proposal versions" description="Drafts remain non-binding. Selection freezes one exact proposal; later changes require a new version." />
        {data.proposals.length ? <div className={styles.grid}>{data.proposals.map((proposal) => <article className={styles.card} key={proposal.id}><div className={styles.cardHeader}><h3>Version {proposal.version}: {proposal.title}</h3><InstitutionalStatus tone={institutionalStatusTone(proposal.status)}>{formatInstitutionalLabel(proposal.status)}</InstitutionalStatus></div><p>{proposal.summary || "No summary supplied."}</p><p className={styles.termHash}>{proposal.terms_hash}</p><details className={styles.commandPayload}><summary>Structured terms</summary><pre>{JSON.stringify(proposal.terms, null, 2)}</pre></details>{data.canManage && ["draft", "proposed"].includes(proposal.status) ? <form action={runInstitutionalAction}>{base("select_proposal", dealId, returnTo)}<input name="proposalVersionId" type="hidden" value={proposal.id} /><button className={styles.secondaryButton} type="submit">Select and freeze this version</button></form> : null}</article>)}</div> : <InstitutionalEmpty>No proposal version.</InstitutionalEmpty>}
        {data.canManage ? <details className={styles.disclosure}><summary>Create a proposal version</summary><div className={styles.disclosureBody}><form action={runInstitutionalAction} className={styles.formGrid}>
          {base("create_proposal", dealId, returnTo)}
          <label>Version<input min="1" name="version" type="number" defaultValue={data.proposals.length + 1} /></label>
          <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="proposed">Proposed</option></select></label>
          <label className={styles.fullSpan}>Title<input name="title" required /></label>
          <label className={styles.fullSpan}>Summary<textarea name="summary" /></label>
          <label className={styles.fullSpan}>Structured terms JSON<textarea name="terms" required defaultValue="{}" /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create immutable version</button></div>
        </form></div></details> : null}
      </section>

      <section className={styles.section} id="baselines">
        <InstitutionalSectionHeader eyebrow="No-trade comparison" title="Counterfactual baselines" description="A baseline belongs to one exact personal or organization party and cannot be silently reassigned." />
        {data.baselines.length ? <div className={styles.grid}>{data.baselines.map((baseline) => <article className={styles.card} key={baseline.id}><div className={styles.cardHeader}><h3>{partyName(partyById.get(identifier(baseline.party_id)))}</h3><InstitutionalStatus tone={institutionalStatusTone(baseline.status)}>{formatInstitutionalLabel(baseline.status)}</InstitutionalStatus></div><p>{baseline.statement}</p><p>Confidence: {formatInstitutionalLabel(baseline.confidence)}</p></article>)}</div> : <InstitutionalEmpty>No baseline recorded.</InstitutionalEmpty>}
        {acceptedPersonalParty ? <details className={styles.disclosure}><summary>Record your baseline</summary><div className={styles.disclosureBody}><form action={runInstitutionalAction} className={styles.formGrid}>
          {base("create_baseline", dealId, returnTo)}
          <input name="partyId" type="hidden" value={acceptedPersonalParty.id} />
          <input name="profileId" type="hidden" value={viewer.authUser.id} />
          <label>Proposal<select name="proposalVersionId" defaultValue=""><option value="">Deal-wide baseline</option>{data.proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>Version {proposal.version}</option>)}</select></label>
          <label>Confidence<select name="confidence" defaultValue="moderate"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
          <label className={styles.fullSpan}>What would you do without this trade?<textarea name="statement" required /></label>
          <label className={styles.fullSpan}>Evidence references JSON<textarea name="evidenceReferences" defaultValue="[]" /></label>
          <label className={`${styles.checkbox} ${styles.fullSpan}`}><input name="lockNow" type="checkbox" />Lock this baseline now</label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record exact personal baseline</button></div>
        </form></div></details> : null}
      </section>

      <section className={styles.section} id="obligations">
        <InstitutionalSectionHeader eyebrow="Performance" title="Obligations" description="Personal obligations remain attached to the named person. A different profile cannot be substituted." />
        {data.obligations.length ? <div className={styles.grid}>{data.obligations.map((obligation) => <article className={styles.card} key={obligation.id}><div className={styles.cardHeader}><h3>{obligation.title}</h3><InstitutionalStatus tone={institutionalStatusTone(obligation.status)}>{formatInstitutionalLabel(obligation.status)}</InstitutionalStatus></div><p>{obligation.description || "No description supplied."}</p><p><strong>From:</strong> {partyName(partyById.get(identifier(obligation.obligor_party_id)))}{obligation.beneficiary_party_id ? <> · <strong>To:</strong> {partyName(partyById.get(identifier(obligation.beneficiary_party_id)))}</> : null}</p>{obligation.amount_cents != null ? <p>{formatInstitutionalMoney(obligation.amount_cents, obligation.currency ?? "usd")}</p> : null}<p>{obligation.individual_consent_required ? "Separate named-person consent required" : "Exact-party signature required"}</p></article>)}</div> : <InstitutionalEmpty>No obligation.</InstitutionalEmpty>}
        {data.canManage && selectedProposal ? <details className={styles.disclosure}><summary>Add an obligation to the selected proposal</summary><div className={styles.disclosureBody}><form action={runInstitutionalAction} className={styles.formGrid}>
          {base("create_obligation", dealId, returnTo)}
          <input name="proposalVersionId" type="hidden" value={selectedProposal.id} />
          <label>Obligor<select name="obligorPartyId" required defaultValue=""><option disabled value="">Select exact party</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{partyName(party)} · {formatInstitutionalLabel(party.party_capacity)}</option>)}</select></label>
          <label>Beneficiary<select name="beneficiaryPartyId" defaultValue=""><option value="">No named beneficiary</option>{data.parties.map((party) => <option key={party.id} value={party.id}>{partyName(party)}</option>)}</select></label>
          <label>Resource type<select name="resourceType" defaultValue="staff_time"><option value="funding">Funding</option><option value="staff_time">Staff time</option><option value="staff_secondment">Staff secondment</option><option value="grantmaking_capacity">Grantmaking capacity</option><option value="research">Research</option><option value="operations">Operations</option><option value="data">Data</option><option value="compute">Compute</option><option value="introductions">Introductions</option><option value="other">Other</option></select></label>
          <label>Title<input name="title" required /></label>
          <label>Amount<input min="0" name="amount" step="0.01" /></label>
          <label>Currency<input name="currency" defaultValue="usd" /></label>
          <label>Quantity<input min="0" name="quantity" step="any" /></label>
          <label>Unit<input name="unit" /></label>
          <label>Due at<input name="dueAt" type="datetime-local" /></label>
          <label>Named person profile ID<input name="individualProfileId" placeholder="Required when consent is required" /></label>
          <label className={`${styles.checkbox} ${styles.fullSpan}`}><input name="individualConsentRequired" type="checkbox" />Require a separate named-person consent record</label>
          <label className={styles.fullSpan}>Description<textarea name="description" /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Add exact obligation</button></div>
        </form></div></details> : null}
      </section>

      <section className={styles.section} id="evidence">
        <InstitutionalSectionHeader eyebrow="Verification" title="Evidence" description="Evidence remains related to one exact proposal, obligation, milestone, and requirement." />
        {data.evidenceRequirements.length ? <div className={styles.grid}>{data.evidenceRequirements.map((requirement) => { const submitted = data.evidenceSubmissions.filter((submission) => submission.requirement_id === requirement.id); return <article className={styles.card} key={requirement.id}><div className={styles.cardHeader}><h3>{requirement.title}</h3><InstitutionalStatus tone={submitted.length ? "good" : "warn"}>{submitted.length ? `${submitted.length} submitted` : "Awaiting evidence"}</InstitutionalStatus></div><p>{requirement.description || "No description supplied."}</p>{acceptedPersonalParty ? <form action={runInstitutionalAction} className={styles.form}>{base("submit_evidence", dealId, returnTo)}<input name="proposalVersionId" type="hidden" value={requirement.proposal_version_id} /><input name="obligationId" type="hidden" value={requirement.obligation_id} /><input name="milestoneId" type="hidden" value={requirement.milestone_id ?? ""} /><input name="evidenceRequirementId" type="hidden" value={requirement.id} /><label>Evidence JSON<textarea name="submission" required defaultValue="{}" /></label><button className={styles.primaryButton} type="submit">Submit evidence</button></form> : null}</article>; })}</div> : <InstitutionalEmpty>No evidence requirement.</InstitutionalEmpty>}
        {data.evidenceSubmissions.length ? <div className={styles.timeline}>{data.evidenceSubmissions.map((submission) => <article className={styles.timelineItem} key={submission.id}><time><InstitutionalDate value={submission.created_at} /></time><div><strong>{formatInstitutionalLabel(submission.status)}</strong><p>Requirement {identifier(submission.requirement_id)}</p></div></article>)}</div> : null}
      </section>

      <section className={styles.section} id="consent-and-verification">
        <InstitutionalSectionHeader eyebrow="Personal decisions" title="Consent and verification" description="Only you can make your personal decision. Verifier access begins only after explicit acceptance." />
        <div className={styles.twoColumn}>
          <div><h3>Consent records</h3>{data.consents.length ? <div className={styles.grid}>{data.consents.map((consent) => <article className={styles.card} key={consent.id}><div className={styles.cardHeader}><strong>Obligation {identifier(consent.obligation_id).slice(0, 8)}</strong><InstitutionalStatus tone={institutionalStatusTone(consent.decision)}>{formatInstitutionalLabel(consent.decision)}</InstitutionalStatus></div><p className={styles.termHash}>{consent.terms_hash}</p>{consent.individual_profile_id === viewer.authUser.id ? <Link className={styles.textButton} href={`/institutions/consents/${consent.id}`}>Review your decision</Link> : null}</article>)}</div> : <InstitutionalEmpty>No consent record.</InstitutionalEmpty>}</div>
          <div><h3>Verifier assignments</h3>{data.verifierAssignments.length ? <div className={styles.grid}>{data.verifierAssignments.map((assignment) => <article className={styles.card} key={assignment.id}><div className={styles.cardHeader}><strong>{formatInstitutionalLabel(assignment.scope)}</strong><InstitutionalStatus tone={institutionalStatusTone(assignment.status)}>{formatInstitutionalLabel(assignment.status)}</InstitutionalStatus></div>{assignment.verifier_profile_id === viewer.authUser.id ? <Link className={styles.textButton} href={`/institutions/verifier-assignments/${assignment.id}`}>Review assignment</Link> : null}</article>)}</div> : <InstitutionalEmpty>No verifier assignment.</InstitutionalEmpty>}</div>
        </div>
        {canSign ? <article className={styles.panel}>
          <h3>Sign selected exact terms</h3>
          <p>Your personal signature applies only to party <span className={styles.termHash}>{acceptedPersonalParty?.id}</span> and terms hash <span className={styles.termHash}>{selectedProposal?.terms_hash}</span>.</p>
          <form action={runInstitutionalAction}>{base("sign_deal", dealId, returnTo)}<input name="partyId" type="hidden" value={acceptedPersonalParty?.id} /><input name="expectedTermsHash" type="hidden" value={selectedProposal?.terms_hash} /><button className={styles.primaryButton} type="submit">Sign for myself</button></form>
        </article> : null}
      </section>

      <InstitutionalDealWorkspace
        data={data}
        mode="individual"
        viewerProfileId={viewer.authUser.id}
        returnTo={returnTo}
        canManage={data.canManage}
        canReviewEvidence={data.authorization.canReviewEvidence}
      />

      <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Traceability" title="Recent deal history" description="The append-only history identifies the actor and acting basis; it does not treat an affiliation as authority." />
        {data.auditEvents.length ? <div className={styles.timeline}>{data.auditEvents.map((event) => <article className={styles.timelineItem} key={event.id}><time><InstitutionalDate value={event.occurred_at} /></time><div><strong>{formatInstitutionalLabel(event.event_type)}</strong><p>{event.authority_basis || "No authority basis supplied."}</p></div></article>)}</div> : <InstitutionalEmpty>No audit event.</InstitutionalEmpty>}
      </section>
    </main>
    <SiteFooter />
  </div>;
}
