import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalDisclosure,
  InstitutionalEmpty,
  InstitutionalMetric,
  InstitutionalSectionHeader,
  InstitutionalStatus,
  formatInstitutionalLabel,
  institutionalStatusTone,
} from "@/components/institutions/institutional-ui";

type Row = Record<string, any> & { id: string };

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function base(actionType: string, organizationId: string) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
    <input name="actingCapacity" type="hidden" value="organization" />
    <input name="actingOrganizationId" type="hidden" value={organizationId} />
    <input name="organizationId" type="hidden" value={organizationId} />
    <input name="returnTo" type="hidden" value={`/institutions/${organizationId}`} />
  </>;
}

export function InstitutionalOrganizationAdministration({ data, organizationId }: { data: Record<string, any>; organizationId: string }) {
  const programs = rows(data.programs);
  const legalEntities = rows(data.legalEntities);
  const memberships = rows(data.memberships);
  const authorityGrants = rows(data.authorityGrants);
  const approvalPolicies = rows(data.approvalPolicies);
  const templates = rows(data.templates);
  const frameworkAgreements = rows(data.frameworkAgreements);
  const commandDrafts = rows(data.commandDrafts);
  const trackRecord = rows(data.trackRecord);
  const matches = rows(data.matches);
  const profiles = rows(data.profiles);
  const organizations = rows(data.organizations);
  const profileById = new Map(profiles.map((profile) => [String(profile.id), profile]));
  const programById = new Map(programs.map((program) => [String(program.id), program]));
  const organizationById = new Map(organizations.map((organization) => [String(organization.id), organization]));

  return <>
    <section className={styles.section} id="organization-administration">
      <InstitutionalSectionHeader
        eyebrow="Institutional administration"
        title="Legal identity, membership, delegated authority, and approval policy"
        description="Membership does not itself authorize representation. Every consequential action must use a valid exact-scope authority grant or the product’s explicit self-authority path."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Legal entities" value={legalEntities.length} />
        <InstitutionalMetric label="Active members" value={memberships.filter((row) => row.status === "active").length} />
        <InstitutionalMetric label="Active authority grants" value={authorityGrants.filter((row) => !row.revoked_at).length} />
        <InstitutionalMetric label="Approval policies" value={approvalPolicies.filter((row) => row.status === "active").length} />
      </div>
      <div className={styles.twoColumn}>
        <div>
          <h3>Legal counterparties</h3>
          {legalEntities.length ? <div className={styles.grid}>{legalEntities.map((entity) => <article className={styles.card} key={entity.id}><div className={styles.cardHeader}><h3>{entity.legal_name}</h3><InstitutionalStatus tone={institutionalStatusTone(entity.status)}>{formatInstitutionalLabel(entity.status)}</InstitutionalStatus></div><p>{formatInstitutionalLabel(entity.entity_type)} · {entity.jurisdiction || "Jurisdiction not recorded"}</p><p>{entity.registration_number || "Registration number not recorded"}</p></article>)}</div> : <InstitutionalEmpty>No legal counterparty record.</InstitutionalEmpty>}
        </div>
        <div>
          <h3>Members and roles</h3>
          {memberships.length ? <div className={styles.grid}>{memberships.map((membership) => <article className={styles.card} key={membership.id}><div className={styles.cardHeader}><h3>{profileById.get(String(membership.profile_id))?.display_name || membership.profile_id}</h3><InstitutionalStatus tone={institutionalStatusTone(membership.status)}>{formatInstitutionalLabel(membership.status)}</InstitutionalStatus></div><p>{formatInstitutionalLabel(membership.role)}</p><p>{Array.isArray(membership.permissions) && membership.permissions.length ? membership.permissions.map(formatInstitutionalLabel).join(" · ") : "No membership-level permissions"}</p></article>)}</div> : <InstitutionalEmpty>No membership record.</InstitutionalEmpty>}
        </div>
      </div>
      <div className={styles.twoColumn}>
        <InstitutionalDisclosure title="Record a legal counterparty">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_legal_entity", organizationId)}<label>Legal name<input name="legalName" required /></label><label>Entity type<input name="entityType" required placeholder="nonprofit corporation" /></label><label>Jurisdiction<input name="jurisdiction" /></label><label>Registration number<input name="registrationNumber" /></label><label>Fiscal sponsor organization ID<input name="fiscalSponsorOrganizationId" /></label><label>Status<select name="status" defaultValue="pending_verification"><option value="pending_verification">Pending verification</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label className={styles.fullSpan}>Registered address JSON<textarea name="registeredAddress" defaultValue="{}" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record legal entity</button></div></form>
        </InstitutionalDisclosure>
        <InstitutionalDisclosure title="Invite a member">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("invite_membership", organizationId)}<label>Profile ID<input name="profileId" required /></label><label>Role<select name="role" defaultValue="member"><option value="owner">Owner</option><option value="administrator">Administrator</option><option value="deal_manager">Deal manager</option><option value="approver">Approver</option><option value="signatory">Signatory</option><option value="finance">Finance</option><option value="reviewer">Reviewer</option><option value="auditor">Auditor</option><option value="viewer">Viewer</option><option value="member">Member</option></select></label><label>Status<select name="status" defaultValue="invited"><option value="invited">Invited</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="revoked">Revoked</option></select></label><label className={styles.fullSpan}>Membership permissions (one per line)<textarea name="permissions" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Save membership</button></div></form>
        </InstitutionalDisclosure>
      </div>
      <div className={styles.twoColumn}>
        <InstitutionalDisclosure title="Create exact-scope delegated authority">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_authority_grant", organizationId)}<label>Profile ID<input name="profileId" required /></label><label>Program<select name="programId" defaultValue=""><option value="">Organization-wide</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label className={styles.fullSpan}>Permissions (one per line)<textarea name="permissions" required defaultValue={'deal:manage\ndeal:approve'} /></label><label>Amount limit<input name="amountLimit" inputMode="decimal" /></label><label>Currency<input name="currency" defaultValue="usd" /></label><label className={styles.fullSpan}>Authority basis<textarea name="authorityBasis" required /></label><label>Valid from<input name="validFrom" type="datetime-local" /></label><label>Valid until<input name="validUntil" type="datetime-local" /></label><label className={styles.fullSpan}>Evidence references JSON<textarea name="evidenceReferences" defaultValue="[]" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create authority grant</button></div></form>
        </InstitutionalDisclosure>
        <InstitutionalDisclosure title="Create an approval policy">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_approval_policy", organizationId)}<label>Program<select name="programId" defaultValue=""><option value="">Organization-wide</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Name<input name="name" required /></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></label><label className={styles.fullSpan}>Policy JSON<textarea name="policy" defaultValue={'{"quorum":2,"required_roles":["approver"]}'} /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record policy</button></div></form>
        </InstitutionalDisclosure>
      </div>
      <InstitutionalDisclosure title="Request fact-specific verification">
        <form action={runInstitutionalAction} className={styles.formGrid}>{base("request_verification", organizationId)}<label>Subject type<select name="subjectType" defaultValue="organization"><option value="organization">Organization</option><option value="legal_entity">Legal entity</option><option value="program">Program</option><option value="representative">Representative</option><option value="authority">Authority</option><option value="payment_account">Payment account</option></select></label><label>Subject ID<input name="subjectId" defaultValue={organizationId} required /></label><label>Facet<select name="facet" defaultValue="legal_entity"><option value="domain_control">Domain control</option><option value="legal_entity">Legal entity</option><option value="representative_identity">Representative identity</option><option value="authority">Authority</option><option value="payment_account">Payment account</option><option value="enhanced_review">Enhanced review</option></select></label><label>Method<input name="method" required placeholder="official registry and signed board resolution" /></label><label className={styles.fullSpan}>Evidence references JSON<textarea name="evidenceReferences" defaultValue="[]" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Request verification</button></div></form>
      </InstitutionalDisclosure>
    </section>

    <section className={styles.section} id="matches">
      <InstitutionalSectionHeader
        eyebrow="Confidential matching"
        title="Institutional opportunities and bilateral interest"
        description="Match generation uses structured mandates and resource profiles. A confidential match is not disclosed as mutual until both exact parties record compatible interest."
      />
      {matches.length ? <div className={styles.grid}>{matches.map((match) => <article className={styles.card} key={match.id}><div className={styles.cardHeader}><h3>Match {String(match.id).slice(0, 8)}</h3><InstitutionalStatus tone={institutionalStatusTone(match.status)}>{formatInstitutionalLabel(match.status)}</InstitutionalStatus></div><p>Score {Number(match.score || 0).toFixed(2)}</p><p>{match.explanation || "No explanation supplied."}</p><form action={runInstitutionalAction} className={styles.inlineActions}>{base("record_match_interest", organizationId)}<input name="matchId" type="hidden" value={match.id} /><select name="interest" defaultValue="interested"><option value="interested">Interested</option><option value="declined">Decline</option><option value="needs_information">Needs information</option></select><button className={styles.secondaryButton} type="submit">Record interest</button></form></article>)}</div> : <InstitutionalEmpty>No confidential match has been generated.</InstitutionalEmpty>}
      <form action={runInstitutionalAction} className={styles.inlineActions}>{base("generate_matches", organizationId)}<button className={styles.primaryButton} type="submit">Generate or refresh matches</button></form>
    </section>

    <section className={styles.section} id="templates">
      <InstitutionalSectionHeader
        eyebrow="Repeatability"
        title="Templates, framework agreements, track record, and Command"
        description="Reusable structures reduce transaction costs without allowing old approvals or signatures to bind new exact terms. Command produces reviewable drafts and never silently executes institutional authority."
      />
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Templates" value={templates.length} />
        <InstitutionalMetric label="Framework agreements" value={frameworkAgreements.length} />
        <InstitutionalMetric label="Track-record entries" value={trackRecord.length} />
        <InstitutionalMetric label="Command drafts" value={commandDrafts.length} />
      </div>
      <div className={styles.twoColumn}>
        <div>
          <h3>Reusable templates</h3>
          {templates.length ? <div className={styles.grid}>{templates.map((template) => <article className={styles.card} key={template.id}><div className={styles.cardHeader}><h3>{template.name}</h3><InstitutionalStatus tone={institutionalStatusTone(template.status)}>{formatInstitutionalLabel(template.status)}</InstitutionalStatus></div><p>{formatInstitutionalLabel(template.template_type)} · {programById.get(String(template.program_id))?.name || "Organization-wide"}</p><details className={styles.commandPayload}><summary>Template content</summary><pre>{JSON.stringify(template.content, null, 2)}</pre></details></article>)}</div> : <InstitutionalEmpty>No reusable template.</InstitutionalEmpty>}
        </div>
        <div>
          <h3>Framework agreements</h3>
          {frameworkAgreements.length ? <div className={styles.grid}>{frameworkAgreements.map((agreement) => { const counterpartyId = String(agreement.organization_a_id) === organizationId ? String(agreement.organization_b_id) : String(agreement.organization_a_id); return <article className={styles.card} key={agreement.id}><div className={styles.cardHeader}><h3>{agreement.title}</h3><InstitutionalStatus tone={institutionalStatusTone(agreement.status)}>{formatInstitutionalLabel(agreement.status)}</InstitutionalStatus></div><p>{organizationById.get(counterpartyId)?.display_name || counterpartyId}</p><p className={styles.termHash}>{agreement.terms_hash}</p></article>; })}</div> : <InstitutionalEmpty>No framework agreement.</InstitutionalEmpty>}
        </div>
      </div>
      <div className={styles.twoColumn}>
        <InstitutionalDisclosure title="Create a reusable transaction template">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_template", organizationId)}<label>Program<select name="programId" defaultValue=""><option value="">Organization-wide</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Deal type<input name="dealType" required placeholder="institutional_secondment" /></label><label>Name<input name="name" required /></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></label><label className={styles.fullSpan}>Template JSON<textarea name="template" required defaultValue="{}" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create template</button></div></form>
        </InstitutionalDisclosure>
        <InstitutionalDisclosure title="Create a framework agreement">
          <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_framework_agreement", organizationId)}<label>Counterparty organization ID<input name="organizationBId" required /></label><label>Title<input name="title" required /></label><label>Status<select name="status" defaultValue="draft"><option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select></label><label>Effective from<input name="effectiveFrom" type="datetime-local" /></label><label>Effective until<input name="effectiveUntil" type="datetime-local" /></label><label className={styles.fullSpan}>Standard terms JSON<textarea name="standardTerms" required defaultValue="{}" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record framework</button></div></form>
        </InstitutionalDisclosure>
      </div>
      <InstitutionalDisclosure title="Create a permission-aware Command draft">
        <form action={runInstitutionalAction} className={styles.formGrid}>{base("create_command_draft", organizationId)}<label>Program<select name="programId" defaultValue=""><option value="">Organization-wide</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Interpreted action<input name="interpretedAction" required placeholder="create_proposal" /></label><label className={styles.fullSpan}>Command text<textarea name="commandText" required /></label><label className={styles.fullSpan}>Reviewable payload JSON<textarea name="payload" defaultValue="{}" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create draft, do not execute</button></div></form>
      </InstitutionalDisclosure>
      {trackRecord.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Completed deals</th><th>Disputed deals</th><th>Exact signatures</th><th>Accepted evidence</th></tr></thead><tbody>{trackRecord.map((entry) => <tr key={entry.organization_id || entry.id}><td>{entry.completed_deals ?? 0}</td><td>{entry.disputed_deals ?? 0}</td><td>{entry.signatures ?? 0}</td><td>{entry.accepted_evidence_submissions ?? 0}</td></tr>)}</tbody></table></div> : null}
    </section>

  </>;
}
