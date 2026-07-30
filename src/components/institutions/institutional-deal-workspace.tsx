import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalDate,
  InstitutionalDisclosure,
  InstitutionalEmpty,
  InstitutionalMetric,
  InstitutionalSectionHeader,
  InstitutionalStatus,
  formatInstitutionalLabel,
  institutionalStatusTone,
} from "@/components/institutions/institutional-ui";
import { INSTITUTIONAL_RESOURCE_TYPES } from "@/lib/institutional-trade";

type Row = Record<string, any> & { id: string };
type Mode = "organization" | "individual";

function formBase({
  actionType,
  dealId,
  returnTo,
  mode,
  actingOrganizationId,
  actingProgramId,
}: {
  actionType: string;
  dealId: string;
  returnTo: string;
  mode: Mode;
  actingOrganizationId?: string;
  actingProgramId?: string | null;
}) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
    <input name="dealId" type="hidden" value={dealId} />
    <input name="returnTo" type="hidden" value={returnTo} />
    <input name="actingCapacity" type="hidden" value={mode} />
    {mode === "organization" && actingOrganizationId ? <input name="actingOrganizationId" type="hidden" value={actingOrganizationId} /> : null}
    {mode === "organization" ? <input name="actingProgramId" type="hidden" value={actingProgramId ?? ""} /> : null}
  </>;
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function id(value: unknown) {
  return String(value ?? "");
}

export function InstitutionalDealWorkspace({
  data,
  mode,
  viewerProfileId,
  actingOrganizationId,
  actingProgramId,
  returnTo,
  canManage,
  canReviewEvidence,
}: {
  data: Record<string, any>;
  mode: Mode;
  viewerProfileId: string;
  actingOrganizationId?: string;
  actingProgramId?: string | null;
  returnTo: string;
  canManage: boolean;
  canReviewEvidence: boolean;
}) {
  const deal = data.deal as Row;
  const dealId = id(deal.id);
  const parties = asRows(data.parties);
  const profiles = asRows(data.profiles);
  const organizations = asRows(data.organizations);
  const programs = asRows(data.programs);
  const messages = asRows(data.dealMessages);
  const roomMembers = asRows(data.roomMembers);
  const proposals = asRows(data.proposals);
  const obligations = asRows(data.obligations);
  const dependencies = asRows(data.dependencies);
  const milestones = asRows(data.milestones);
  const assignments = asRows(data.verifierAssignments);
  const requirements = asRows(data.evidenceRequirements);
  const submissions = asRows(data.evidenceSubmissions);
  const risks = asRows(data.risks);
  const amendments = asRows(data.amendments);
  const disputes = asRows(data.disputes);
  const disputeEvents = asRows(data.disputeEvents);
  const attributionClaims = asRows(data.attributionClaims);
  const reportSnapshots = asRows(data.reportSnapshots);
  const authorityGrants = asRows(data.authorityGrants);

  const profileById = new Map(profiles.map((row) => [id(row.id), row]));
  const organizationById = new Map(organizations.map((row) => [id(row.id), row]));
  const programById = new Map(programs.map((row) => [id(row.id), row]));
  const partyById = new Map(parties.map((row) => [id(row.id), row]));
  const proposalById = new Map(proposals.map((row) => [id(row.id), row]));
  const requirementById = new Map(requirements.map((row) => [id(row.id), row]));

  const selectedProposal = proposals.find((proposal) => proposal.id === deal.selected_proposal_version_id) ?? null;
  const acceptedVerifierAssignments = assignments.filter((assignment) => assignment.status === "accepted");
  const openRisks = risks.filter((risk) => !["mitigated", "accepted", "closed"].includes(String(risk.status)));
  const completedObligations = obligations.filter((obligation) => ["completed", "waived"].includes(String(obligation.status)));
  const acceptedEvidence = submissions.filter((submission) => submission.status === "accepted");
  const personalParty = parties.find((party) => party.profile_id === viewerProfileId && party.party_capacity !== "organization");
  const actingParties = mode === "organization"
    ? parties.filter((party) => party.party_capacity === "organization" && party.organization_id === actingOrganizationId)
    : personalParty ? [personalParty] : [];

  const partyLabel = (party: Row | undefined) => {
    if (!party) return "Unknown party";
    if (party.party_capacity === "organization") {
      const organization = organizationById.get(id(party.organization_id));
      const program = programById.get(id(party.program_id));
      return `${organization?.display_name ?? `Organization ${id(party.organization_id).slice(0, 8)}`}${program ? ` · ${program.name}` : ""}`;
    }
    const profile = profileById.get(id(party.profile_id));
    return profile?.display_name ?? profile?.email ?? `Person ${id(party.profile_id).slice(0, 8)}`;
  };

  const base = (actionType: string) => formBase({ actionType, dealId, returnTo, mode, actingOrganizationId, actingProgramId });

  return <>
    <section className={styles.section} id="deal-room">
      <InstitutionalSectionHeader
        eyebrow="Deal room"
        title="Messages and confidential access"
        description="Access is explicit, scoped, revocable, and separate from being a substantive deal party. Independent verifiers receive confidential access only after accepting their assignment."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Messages" value={messages.length} />
        <InstitutionalMetric label="Room members" value={roomMembers.filter((row) => !row.revoked_at).length} note={`${roomMembers.filter((row) => row.revoked_at).length} revoked`} />
        <InstitutionalMetric label="Accepted verifiers" value={acceptedVerifierAssignments.length} />
        <InstitutionalMetric label="Selected terms" value={selectedProposal ? `v${selectedProposal.version}` : "None"} note={selectedProposal ? String(selectedProposal.terms_hash).slice(0, 12) : "No exact terms selected"} />
      </div>
      {messages.length ? <div className={styles.timeline}>{messages.map((message) => <div className={styles.timelineItem} key={message.id}><time><InstitutionalDate value={message.created_at} /></time><div><strong>{profileById.get(id(message.sender_profile_id))?.display_name ?? "Deal participant"}</strong><p>{message.body}</p><small>{formatInstitutionalLabel(message.visibility)}</small></div></div>)}</div> : <InstitutionalEmpty>No deal-room message has been posted.</InstitutionalEmpty>}
      <InstitutionalDisclosure title="Post a scoped deal-room message">
        <form action={runInstitutionalAction} className={styles.formGrid}>
          {base("post_deal_message")}
          <label className={styles.fullSpan}>Message<textarea name="body" required /></label>
          <label>Visibility<select name="visibility" defaultValue="all_parties"><option value="all_parties">All parties</option>{mode === "organization" ? <option value="party_internal">Represented organization only</option> : null}</select></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Post message</button></div>
        </form>
      </InstitutionalDisclosure>
      {canManage ? <InstitutionalDisclosure title="Grant or revoke scoped access">
        <div className={styles.twoColumn}>
          <form action={runInstitutionalAction} className={styles.formGrid}>
            {base("grant_room_access")}
            <label>Profile<select name="profileId" required defaultValue=""><option value="" disabled>Select profile</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.email || profile.id}</option>)}</select></label>
            <label>Party<select name="partyId" defaultValue=""><option value="">No party binding</option>{parties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label>
            <label>Organization<select name="organizationId" defaultValue=""><option value="">No represented organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.display_name}</option>)}</select></label>
            <label>Access scope<select name="accessScope" defaultValue="all_parties"><option value="all_parties">All parties</option><option value="party_internal">Party internal</option><option value="finance">Finance</option><option value="legal">Legal</option><option value="risk">Risk review</option><option value="evidence">Evidence</option></select></label>
            <label className={styles.checkbox}><input name="canPost" type="checkbox" defaultChecked />Can post</label>
            <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Grant access</button></div>
          </form>
          <div>
            {roomMembers.length ? <div className={styles.grid}>{roomMembers.map((member) => <article className={styles.card} key={member.id}><div className={styles.cardHeader}><h3>{profileById.get(id(member.profile_id))?.display_name ?? member.profile_id}</h3><InstitutionalStatus tone={member.revoked_at ? "danger" : "good"}>{member.revoked_at ? "Revoked" : "Active"}</InstitutionalStatus></div><p>{formatInstitutionalLabel(member.access_scope)} · {member.can_post ? "Can post" : "Read only"}</p>{!member.revoked_at ? <form action={runInstitutionalAction}>{base("revoke_room_access")}<input name="roomMemberId" type="hidden" value={member.id} /><button className={styles.secondaryButton} type="submit">Revoke access</button></form> : null}</article>)}</div> : <InstitutionalEmpty>No explicit access record.</InstitutionalEmpty>}
          </div>
        </div>
      </InstitutionalDisclosure> : null}
    </section>

    <section className={styles.section} id="execution-management">
      <InstitutionalSectionHeader
        eyebrow="Execution"
        title="Obligations, dependencies, and milestones"
        description="Obligations are bound to a proposal version and exact parties. Dependencies and lifecycle transitions are validated against the same deal."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Obligations" value={obligations.length} note={`${completedObligations.length} completed or verified`} />
        <InstitutionalMetric label="Dependencies" value={dependencies.length} />
        <InstitutionalMetric label="Milestones" value={milestones.length} note={`${milestones.filter((row) => row.status === "completed").length} completed`} />
        <InstitutionalMetric label="Deal stage" value={formatInstitutionalLabel(deal.stage)} />
      </div>
      {obligations.length ? <div className={styles.grid}>{obligations.map((obligation) => {
        const proposal = proposalById.get(id(obligation.proposal_version_id));
        const obligationMilestones = milestones.filter((milestone) => milestone.obligation_id === obligation.id);
        return <article className={styles.card} key={obligation.id}><div className={styles.cardHeader}><h3>{obligation.title}</h3><InstitutionalStatus tone={institutionalStatusTone(obligation.status)}>{formatInstitutionalLabel(obligation.status)}</InstitutionalStatus></div><p>{obligation.description || "No description."}</p><p><strong>Obligor:</strong> {partyLabel(partyById.get(id(obligation.obligor_party_id)))}</p><p><strong>Resource:</strong> {formatInstitutionalLabel(obligation.resource_type)} · proposal v{proposal?.version ?? "?"}</p>{obligation.individual_consent_required ? <p className={styles.callout}>Named-person consent required for {profileById.get(id(obligation.individual_profile_id))?.display_name ?? obligation.individual_profile_id}.</p> : null}{obligationMilestones.length ? <ul>{obligationMilestones.map((milestone) => <li key={milestone.id}>{milestone.title} · {formatInstitutionalLabel(milestone.status)}{canManage ? <form action={runInstitutionalAction} className={styles.inlineActions}>{base("update_milestone_status")}<input name="milestoneId" type="hidden" value={milestone.id} /><select name="status" defaultValue={milestone.status}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="submitted">Submitted</option><option value="verified">Verified</option><option value="completed">Completed</option><option value="overdue">Overdue</option><option value="waived">Waived</option><option value="failed">Failed</option></select><button className={styles.secondaryButton} type="submit">Update milestone</button></form> : null}</li>)}</ul> : null}{canManage ? <form action={runInstitutionalAction} className={styles.inlineActions}>{base("update_obligation_status")}<input name="obligationId" type="hidden" value={obligation.id} /><select name="status" defaultValue={obligation.status}><option value="pending">Pending</option><option value="active">Active</option><option value="blocked">Blocked</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="waived">Waived</option><option value="terminated">Terminated</option></select><button className={styles.secondaryButton} type="submit">Update status</button></form> : null}</article>;
      })}</div> : <InstitutionalEmpty>No obligation has been recorded.</InstitutionalEmpty>}
      {canManage && selectedProposal ? <div className={styles.twoColumn}>
        <InstitutionalDisclosure title="Create a typed obligation">
          <form action={runInstitutionalAction} className={styles.formGrid}>
            {base("create_obligation")}
            <input name="proposalVersionId" type="hidden" value={selectedProposal.id} />
            <label>Obligor party<select name="obligorPartyId" required defaultValue=""><option value="" disabled>Select party</option>{parties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label>
            <label>Beneficiary party<select name="beneficiaryPartyId" defaultValue=""><option value="">No named beneficiary</option>{parties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label>
            <label>Resource type<select name="resourceType" required defaultValue="staff_time">{INSTITUTIONAL_RESOURCE_TYPES.map((type) => <option key={type} value={type}>{formatInstitutionalLabel(type)}</option>)}</select></label>
            <label>Title<input name="title" required /></label>
            <label className={styles.fullSpan}>Description<textarea name="description" /></label>
            <label>Amount<input name="amount" inputMode="decimal" /></label>
            <label>Currency<input name="currency" defaultValue="usd" /></label>
            <label>Quantity<input name="quantity" inputMode="decimal" /></label>
            <label>Unit<input name="unit" /></label>
            <label>Due at<input name="dueAt" type="datetime-local" /></label>
            <label>Named individual profile<input name="individualProfileId" /></label>
            <label className={styles.checkbox}><input name="individualConsentRequired" type="checkbox" />Require named-person consent</label>
            <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create obligation</button></div>
          </form>
        </InstitutionalDisclosure>
        <InstitutionalDisclosure title="Add a dependency">
          <form action={runInstitutionalAction} className={styles.formGrid}>
            {base("create_obligation_dependency")}
            <label>Predecessor<select name="predecessorObligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{obligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label>
            <label>Successor<select name="successorObligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{obligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label>
            <label>Dependency type<select name="dependencyType" defaultValue="must_complete_before"><option value="must_complete_before">Must complete before</option><option value="activates">Activates</option><option value="blocks">Blocks</option><option value="evidence_for">Provides evidence for</option></select></label>
            <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Add dependency</button></div>
          </form>
        </InstitutionalDisclosure>
      </div> : null}
      {canManage ? <InstitutionalDisclosure title="Transition the fail-closed deal lifecycle">
        <form action={runInstitutionalAction} className={styles.formGrid}>{base("transition_deal_stage")}<label>Next stage<select name="stage" defaultValue={deal.stage}><option value="draft">Draft</option><option value="exploratory">Exploratory</option><option value="authorized_for_negotiation">Authorized for negotiation</option><option value="proposed">Proposed</option><option value="term_sheet_agreed">Term sheet agreed</option><option value="pending_governance_approval">Pending governance approval</option><option value="signed">Signed</option><option value="execution">Execution</option><option value="evidence_review">Evidence review</option><option value="completed">Completed</option><option value="amended">Amended</option><option value="disputed">Disputed</option><option value="terminated">Terminated</option><option value="expired">Expired</option></select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Transition stage</button></div></form>
      </InstitutionalDisclosure> : null}
    </section>

    <section className={styles.section} id="evidence-review">
      <InstitutionalSectionHeader
        eyebrow="Evidence and verification"
        title="Exact requirements, submissions, and independent review"
        description="Evidence must match the selected proposal, obligation, milestone, and requirement. Accepted verifier status is required before an independent verifier can access or review confidential evidence."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Requirements" value={requirements.length} />
        <InstitutionalMetric label="Submissions" value={submissions.length} />
        <InstitutionalMetric label="Accepted evidence" value={acceptedEvidence.length} />
        <InstitutionalMetric label="Verifier assignments" value={assignments.length} note={`${acceptedVerifierAssignments.length} accepted`} />
      </div>
      {submissions.length ? <div className={styles.grid}>{submissions.map((submission) => {
        const requirement = requirementById.get(id(submission.requirement_id));
        return <article className={styles.card} key={submission.id}><div className={styles.cardHeader}><h3>{requirement?.title ?? "Evidence submission"}</h3><InstitutionalStatus tone={institutionalStatusTone(submission.status)}>{formatInstitutionalLabel(submission.status)}</InstitutionalStatus></div><p>Submitted by {profileById.get(id(submission.submitted_by))?.display_name ?? submission.submitted_by}</p><details className={styles.commandPayload}><summary>Evidence record</summary><pre>{JSON.stringify(submission.evidence ?? {}, null, 2)}</pre></details>{canReviewEvidence ? <form action={runInstitutionalAction} className={styles.formGrid}>{base("review_evidence")}<input name="submissionId" type="hidden" value={submission.id} /><label>Status<select name="status" defaultValue="accepted"><option value="accepted">Accept</option><option value="needs_revision">Request revision</option><option value="rejected">Reject</option></select></label><label className={styles.fullSpan}>Review note<textarea name="reviewNote" /></label>{mode === "organization" ? <><label>Program<select name="programId" defaultValue=""><option value="">Organization-wide</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Evidence-review authority<select name="authorityGrantId" defaultValue=""><option value="" disabled>Select exact evidence-review authority</option>{authorityGrants.filter((grant) => Array.isArray(grant.permissions) && (grant.permissions.includes("evidence:review") || grant.permissions.includes("deal:manage"))).map((grant) => <option key={grant.id} value={grant.id}>{grant.authority_basis}</option>)}</select></label></> : null}<div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record review</button></div></form> : null}</article>;
      })}</div> : <InstitutionalEmpty>No evidence has been submitted.</InstitutionalEmpty>}
      <div className={styles.twoColumn}>
        <InstitutionalDisclosure title="Submit exact evidence">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("submit_evidence")}<label>Requirement<select name="evidenceRequirementId" required defaultValue=""><option value="" disabled>Select requirement</option>{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.title}</option>)}</select></label><label>Proposal<select name="proposalVersionId" required defaultValue={selectedProposal?.id ?? ""}><option value="" disabled>Select proposal</option>{proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>v{proposal.version} · {proposal.title}</option>)}</select></label><label>Obligation<select name="obligationId" required defaultValue=""><option value="" disabled>Select obligation</option>{obligations.map((obligation) => <option key={obligation.id} value={obligation.id}>{obligation.title}</option>)}</select></label><label>Milestone<select name="milestoneId" defaultValue=""><option value="">No milestone</option>{milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select></label><label className={styles.fullSpan}>Submission JSON<textarea name="submission" required defaultValue={'{"type":"external_transfer_confirmation","reference":""}'} /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Submit evidence</button></div></form>
        </InstitutionalDisclosure>
        {canManage ? <InstitutionalDisclosure title="Invite an independent verifier or service provider">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("assign_verifier")}<label>Verifier profile ID<input name="verifierProfileId" required /></label><label>Scope<input name="scope" required placeholder="Evidence and milestone verification" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Invite verifier</button></div></form>
        </InstitutionalDisclosure> : null}
      </div>
      {assignments.length ? <div className={styles.grid}>{assignments.map((assignment) => <article className={styles.card} key={assignment.id}><div className={styles.cardHeader}><h3>{profileById.get(id(assignment.verifier_profile_id))?.display_name ?? assignment.verifier_profile_id}</h3><InstitutionalStatus tone={institutionalStatusTone(assignment.status)}>{formatInstitutionalLabel(assignment.status)}</InstitutionalStatus></div><p>{assignment.scope}</p><p>{assignment.conflict_declaration || "No conflict declaration recorded."}</p>{canManage && !["revoked", "completed"].includes(assignment.status) ? <form action={runInstitutionalAction}>{base("revoke_verifier_assignment")}<input name="assignmentId" type="hidden" value={assignment.id} /><button className={styles.secondaryButton} type="submit">Revoke assignment</button></form> : null}</article>)}</div> : null}
    </section>

    <section className={styles.section} id="integrity-review">
      <InstitutionalSectionHeader
        eyebrow="Integrity"
        title="Threats, conflicts, externalities, amendments, and disputes"
        description="The product treats threats and third-party harms as transaction-integrity questions, not merely optional notes. Signed terms remain unchanged unless an amendment completes its own approval and signature process."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Open findings" value={openRisks.length} />
        <InstitutionalMetric label="Amendments" value={amendments.length} />
        <InstitutionalMetric label="Disputes" value={disputes.length} />
        <InstitutionalMetric label="Dispute events" value={disputeEvents.length} />
      </div>
      {risks.length ? <div className={styles.grid}>{risks.map((risk) => <article className={styles.card} key={risk.id}><div className={styles.cardHeader}><h3>{formatInstitutionalLabel(risk.category)}</h3><InstitutionalStatus tone={institutionalStatusTone(risk.status)}>{formatInstitutionalLabel(risk.status)}</InstitutionalStatus></div><p>{risk.finding}</p><p><strong>Mitigation:</strong> {risk.mitigation || "Not recorded"}</p>{risk.nonwaivable ? <p className={styles.callout}>Nonwaivable finding</p> : null}</article>)}</div> : <InstitutionalEmpty>No integrity finding has been recorded.</InstitutionalEmpty>}
      {canManage ? <InstitutionalDisclosure title="Record an integrity or externality finding">
        <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_risk_review")}<input name="proposalVersionId" type="hidden" value={selectedProposal?.id ?? ""} /><label>Category<select name="category" defaultValue="externality"><option value="authority">Authority</option><option value="conflict_of_interest">Conflict of interest</option><option value="legal_policy">Legal or policy</option><option value="externality">Externality</option><option value="threat_or_coercion">Threat or coercion</option><option value="manufactured_baseline">Manufactured baseline</option><option value="individual_autonomy">Individual autonomy</option><option value="sanctions">Sanctions</option><option value="privacy_security">Privacy or security</option><option value="research_integrity">Research integrity</option><option value="financial">Financial</option><option value="operational">Operational</option><option value="other">Other</option></select></label><label>Severity<select name="severity" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label className={styles.fullSpan}>Finding<textarea name="finding" required /></label><label className={styles.fullSpan}>Mitigation<textarea name="mitigation" /></label><label>Status<select name="status" defaultValue="open"><option value="open">Open</option><option value="needs_information">Needs information</option><option value="mitigated">Mitigated</option><option value="accepted">Accepted</option><option value="blocked">Blocked</option><option value="closed">Closed</option></select></label><label>Visibility<select name="visibility" defaultValue="all_parties"><option value="all_parties">All parties</option>{mode === "organization" ? <option value="party_internal">Party internal</option> : null}</select></label><label className={styles.checkbox}><input name="nonwaivable" type="checkbox" />Nonwaivable</label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record finding</button></div></form>
      </InstitutionalDisclosure> : null}
      {amendments.length ? <div className={styles.grid}>{amendments.map((amendment) => <article className={styles.card} key={amendment.id}><div className={styles.cardHeader}><h3>Proposal v{proposalById.get(id(amendment.from_proposal_version_id))?.version ?? "?"} → v{proposalById.get(id(amendment.to_proposal_version_id))?.version ?? "?"}</h3><InstitutionalStatus tone={institutionalStatusTone(amendment.status)}>{formatInstitutionalLabel(amendment.status)}</InstitutionalStatus></div><p>{amendment.reason}</p>{canManage && amendment.status === "proposed" ? <form action={runInstitutionalAction} className={styles.inlineActions}>{base("decide_amendment")}<input name="amendmentId" type="hidden" value={amendment.id} /><select name="status" defaultValue="approved"><option value="approved">Approve for new exact-term selection and signatures</option><option value="rejected">Reject</option><option value="withdrawn">Withdraw</option></select><button className={styles.secondaryButton} type="submit">Record amendment decision</button></form> : null}</article>)}</div> : null}
      <div className={styles.twoColumn}>
        {canManage && proposals.length > 1 ? <InstitutionalDisclosure title="Propose an exact-term amendment">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_amendment")}<label>Superseded proposal<select name="supersededProposalVersionId" required defaultValue={selectedProposal?.id ?? ""}><option value="" disabled>Select proposal</option>{proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>v{proposal.version} · {proposal.title}</option>)}</select></label><label>Proposed replacement<select name="proposedProposalVersionId" required defaultValue=""><option value="" disabled>Select proposal</option>{proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>v{proposal.version} · {proposal.title}</option>)}</select></label><label className={styles.fullSpan}>Reason<textarea name="reason" required /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Propose amendment</button></div></form>
        </InstitutionalDisclosure> : null}
        <InstitutionalDisclosure title="Open a dispute or append an event">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("open_dispute")}<label>Opening party<select name="partyId" required defaultValue={personalParty?.id ?? ""}><option value="" disabled>Select your party</option>{actingParties.map((party) => <option key={party.id} value={party.id}>{partyLabel(party)}</option>)}</select></label><label className={styles.fullSpan}>Summary<textarea name="summary" required /></label><label className={styles.checkbox}><input name="publicDispute" type="checkbox" />Public to all parties</label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Open dispute</button></div></form>
          {disputes.length ? <form action={runInstitutionalAction} className={styles.formGrid}>{base("add_dispute_event")}<label>Dispute<select name="disputeId" required defaultValue=""><option value="" disabled>Select dispute</option>{disputes.map((dispute) => <option key={dispute.id} value={dispute.id}>{dispute.summary}</option>)}</select></label><label>Event type<input name="eventType" required placeholder="cure_proposed" /></label><label className={styles.fullSpan}>Detail<textarea name="detail" required /></label><label className={styles.fullSpan}>Attachments JSON<textarea name="attachments" defaultValue="[]" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.secondaryButton} type="submit">Append dispute event</button></div></form> : null}
        </InstitutionalDisclosure>
      </div>
    </section>

    <section className={styles.section} id="reporting">
      <InstitutionalSectionHeader
        eyebrow="Repeatability"
        title="Attribution, board packets, and structured reporting"
        description="Claims retain counterfactual qualifications and disclosure status. Report snapshots are immutable so board, committee, and public summaries can be audited against the deal record."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Attribution claims" value={attributionClaims.length} />
        <InstitutionalMetric label="Report snapshots" value={reportSnapshots.length} />
        <InstitutionalMetric label="Selected proposal" value={selectedProposal ? `v${selectedProposal.version}` : "None"} />
        <InstitutionalMetric label="Non-custody" value="External transfers" note="Moral Trade records commitments and evidence; it does not hold institutional funds." />
      </div>
      {attributionClaims.length ? <div className={styles.grid}>{attributionClaims.map((claim) => <article className={styles.card} key={claim.id}><div className={styles.cardHeader}><h3>{formatInstitutionalLabel(claim.claim_type)}</h3><InstitutionalStatus tone={institutionalStatusTone(claim.status)}>{formatInstitutionalLabel(claim.status)}</InstitutionalStatus></div><p>{claim.claim_text}</p><p>{claim.qualification || "No counterfactual qualification."}</p><small>{formatInstitutionalLabel(claim.visibility)}</small></article>)}</div> : <InstitutionalEmpty>No attribution claim has been recorded.</InstitutionalEmpty>}
      {canManage ? <div className={styles.twoColumn}>
        <InstitutionalDisclosure title="Record an attribution boundary">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_attribution_claim")}<label>Claim type<input name="claimType" required placeholder="causal_contribution" /></label><label>Status<select name="status" defaultValue="proposed"><option value="proposed">Proposed</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></label><label className={styles.fullSpan}>Claim text<textarea name="claimText" required /></label><label className={styles.fullSpan}>Counterfactual qualification<textarea name="counterfactualQualification" /></label><label>Disclosure status<select name="disclosureStatus" defaultValue="private"><option value="private">Private</option><option value="embargoed">Embargoed</option><option value="public">Public</option><option value="anonymized">Anonymized</option></select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record claim</button></div></form>
        </InstitutionalDisclosure>
        <InstitutionalDisclosure title="Generate a board or committee packet">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_report_snapshot")}<label>Report type<select name="reportType" defaultValue="board_packet"><option value="board_packet">Board packet</option><option value="committee_packet">Committee packet</option><option value="completion_report">Completion report</option><option value="public_summary">Public summary</option><option value="audit_export">Audit export</option></select></label><label>Title<input name="title" required /></label><label className={styles.fullSpan}>Structured payload JSON<textarea name="payload" defaultValue="{}" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create immutable snapshot</button></div></form>
        </InstitutionalDisclosure>
      </div> : null}
    </section>
  </>;
}
