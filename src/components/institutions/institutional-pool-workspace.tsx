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

type Row = Record<string, any> & { id: string };

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function id(value: unknown) {
  return String(value ?? "");
}

function formBase(actionType: string, returnTo: string, dealId: string, organizationId: string) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
    <input name="actingCapacity" type="hidden" value="organization" />
    <input name="actingOrganizationId" type="hidden" value={organizationId} />
    <input name="returnTo" type="hidden" value={returnTo} />
    <input name="dealId" type="hidden" value={dealId} />
  </>;
}

function programOptionLabel(programById: Map<string, Row>, programId: unknown) {
  return programById.get(id(programId))?.name || "Organization-wide";
}

export function InstitutionalPoolWorkspace({
  data,
  organizationId,
  returnTo,
  canManage,
  canReserveFunds,
}: {
  data: Record<string, any>;
  organizationId: string;
  returnTo: string;
  canManage: boolean;
  canReserveFunds: boolean;
}) {
  const deal = data.deal as Row;
  const dealId = id(deal.id);
  const pool = data.pool as Row | null;
  const programs = asRows(data.programs);
  const parties = asRows(data.parties);
  const grants = asRows(data.authorityGrants);
  const accounts = asRows(data.budgetAccounts);
  const reservations = asRows(data.reservations);
  const contributions = asRows(data.contributions);
  const anchors = asRows(data.anchors);
  const underwritings = asRows(data.underwritings);
  const votes = asRows(data.votes);
  const profiles = asRows(data.profiles);

  const programById = new Map(programs.map((program) => [id(program.id), program]));
  const accountById = new Map(accounts.map((account) => [id(account.id), account]));
  const profileById = new Map(profiles.map((profile) => [id(profile.id), profile]));
  const contributionById = new Map(contributions.map((contribution) => [id(contribution.id), contribution]));
  const organizationParty = parties.find((party) => party.party_capacity === "organization" && party.organization_id === organizationId) ?? null;
  const exactProgramId = organizationParty?.program_id ?? null;
  const exactPrograms = programs.filter((program) => parties.some((party) => party.party_capacity === "organization" && party.program_id === program.id));
  const exactProgramOptions = exactPrograms.length ? exactPrograms : programs.filter((program) => program.organization_id === organizationId);
  const poolApprovalGrants = grants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("pool:approve"));
  const financeGrants = grants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("finance:reserve"));
  const activationGrants = grants.filter((grant) => Array.isArray(grant.permissions) && grant.permissions.includes("pool:activate"));
  const committedContributions = contributions.filter((contribution) => ["committed", "paid"].includes(id(contribution.status)));
  const committedCents = committedContributions.reduce((sum, contribution) => sum + Number(contribution.amount_cents || 0), 0);
  const anchorCents = anchors.filter((anchor) => anchor.status === "committed").reduce((sum, anchor) => sum + Number(anchor.amount_cents || 0), 0);
  const underwritingCents = underwritings.filter((underwriting) => underwriting.status === "committed").reduce((sum, underwriting) => sum + Number(underwriting.maximum_amount_cents || 0), 0);
  const poolReturnTo = `${returnTo}#pool`;

  const organizationScopeFields = <>
    <input name="organizationId" type="hidden" value={organizationId} />
    <label>Program
      <select name="programId" defaultValue={exactProgramId || ""}>
        <option value="">Organization-wide</option>
        {exactProgramOptions.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
      </select>
    </label>
  </>;

  return <section className={styles.section} id="pool">
    <InstitutionalSectionHeader
      eyebrow="Collective coordination"
      title="Consortium and moral-public-goods pool governance"
      description="Pool economics, approval, financial reservation, anchor, underwriting, vote, and activation records are separate. Every consequential update is validated against the same deal and exact pool terms."
    />
    <p className={styles.callout}><strong>Non-custody boundary:</strong> Moral Trade records commitments, authority, direct-transfer evidence, and completion. It does not hold, escrow, or transfer institutional funds.</p>

    {!pool ? <>
      <InstitutionalEmpty>No consortium or moral-public-goods pool terms have been recorded for this deal.</InstitutionalEmpty>
      {canManage ? <InstitutionalDisclosure title="Create exact pool economics and governance terms">
        <form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_pool_terms", poolReturnTo, dealId, organizationId)}
          <label>Threshold amount<input name="threshold" inputMode="decimal" required /></label>
          <label>Currency<input name="currency" defaultValue="usd" maxLength={3} required /></label>
          <label>Minimum contributors<input name="minimumContributors" type="number" min="2" defaultValue="2" required /></label>
          <label>Contribution deadline<input name="deadline" type="datetime-local" required /></label>
          <label>Activation rule<select name="activationRule" defaultValue="governance_vote_and_threshold"><option value="threshold_only">Threshold only</option><option value="governance_vote_and_threshold">Governance vote and threshold</option><option value="unanimous">Unanimous</option><option value="operator_confirmed">Operator confirmed</option></select></label>
          <label>Contribution cap<input name="contributionCap" inputMode="decimal" /></label>
          <label>Governance rule<select name="governanceRule" defaultValue="one_organization_one_vote"><option value="one_organization_one_vote">One organization, one vote</option><option value="contribution_weighted">Contribution weighted</option><option value="unanimous">Unanimous</option><option value="custom">Custom</option></select></label>
          <label>Status<select name="status" defaultValue="draft"><option value="draft">Draft and editable</option><option value="open">Open and freeze terms</option><option value="ready">Ready and freeze terms</option></select></label>
          <label className={styles.fullSpan}>Excess-funds treatment<textarea name="excessFundsTreatment" required defaultValue="Return pro rata to contributors unless exact terms designate an eligible successor use." /></label>
          <label className={styles.fullSpan}>Failure treatment<textarea name="failureTreatment" required defaultValue="Release reservations and record that no platform-held funds existed." /></label>
          <label className={styles.fullSpan}>Withdrawal rule<textarea name="withdrawalRule" required defaultValue="Withdrawals are permitted only before commitment and remain subject to the exact terms." /></label>
          <label className={styles.fullSpan}>Governance configuration JSON<textarea name="governanceRules" defaultValue={'{"required_anchor_total_cents":0,"required_underwriting_total_cents":0}'} required /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create exact pool terms</button></div>
        </form>
      </InstitutionalDisclosure> : null}
    </> : <>
      <div className={styles.metricGrid}>
        <InstitutionalMetric label="Threshold" value={formatInstitutionalMoney(pool.threshold_amount_cents, pool.currency)} note={`${pool.minimum_contributors} minimum contributors`} />
        <InstitutionalMetric label="Committed" value={formatInstitutionalMoney(committedCents, pool.currency)} note={`${committedContributions.length} contributors`} />
        <InstitutionalMetric label="Anchors" value={formatInstitutionalMoney(anchorCents, pool.currency)} note={`${anchors.filter((anchor) => anchor.status === "committed").length} committed`} />
        <InstitutionalMetric label="Underwriting" value={formatInstitutionalMoney(underwritingCents, pool.currency)} note={`${underwritings.filter((underwriting) => underwriting.status === "committed").length} committed`} />
      </div>
      <article className={styles.card}>
        <div className={styles.cardHeader}><h3>Exact governing terms</h3><InstitutionalStatus tone={institutionalStatusTone(pool.status)}>{formatInstitutionalLabel(pool.status)}</InstitutionalStatus></div>
        <InstitutionalKeyValue entries={[
          ["Deadline", <InstitutionalDate key="deadline" value={pool.contribution_deadline} />],
          ["Activation", formatInstitutionalLabel(pool.activation_rule)],
          ["Governance", formatInstitutionalLabel(pool.governance_rule)],
          ["Contribution cap", pool.contribution_cap_cents ? formatInstitutionalMoney(pool.contribution_cap_cents, pool.currency) : "No cap"],
          ["Terms hash", String(pool.terms_hash)],
        ]} />
        <details className={styles.commandPayload}><summary>Governance configuration</summary><pre>{JSON.stringify(pool.governance_config ?? {}, null, 2)}</pre></details>
      </article>

      {pool.status === "draft" && canManage ? <InstitutionalDisclosure title="Revise draft terms or open and freeze them">
        <form action={runInstitutionalAction} className={styles.formGrid}>
          {formBase("create_pool_terms", poolReturnTo, dealId, organizationId)}
          <label>Threshold amount<input name="threshold" inputMode="decimal" defaultValue={Number(pool.threshold_amount_cents || 0) / 100} required /></label>
          <label>Currency<input name="currency" defaultValue={pool.currency} maxLength={3} required /></label>
          <label>Minimum contributors<input name="minimumContributors" type="number" min="2" defaultValue={pool.minimum_contributors} required /></label>
          <label>Contribution deadline<input name="deadline" type="datetime-local" defaultValue={String(pool.contribution_deadline || "").slice(0, 16)} required /></label>
          <label>Activation rule<select name="activationRule" defaultValue={pool.activation_rule}><option value="threshold_only">Threshold only</option><option value="governance_vote_and_threshold">Governance vote and threshold</option><option value="unanimous">Unanimous</option><option value="operator_confirmed">Operator confirmed</option></select></label>
          <label>Contribution cap<input name="contributionCap" inputMode="decimal" defaultValue={pool.contribution_cap_cents ? Number(pool.contribution_cap_cents) / 100 : ""} /></label>
          <label>Governance rule<select name="governanceRule" defaultValue={pool.governance_rule}><option value="one_organization_one_vote">One organization, one vote</option><option value="contribution_weighted">Contribution weighted</option><option value="unanimous">Unanimous</option><option value="custom">Custom</option></select></label>
          <label>Status<select name="status" defaultValue="draft"><option value="draft">Keep draft</option><option value="open">Open and freeze terms</option><option value="ready">Ready and freeze terms</option></select></label>
          <label className={styles.fullSpan}>Excess-funds treatment<textarea name="excessFundsTreatment" required defaultValue={pool.excess_funds_rule} /></label>
          <label className={styles.fullSpan}>Failure treatment<textarea name="failureTreatment" required defaultValue={pool.failure_rule} /></label>
          <label className={styles.fullSpan}>Withdrawal rule<textarea name="withdrawalRule" required defaultValue={pool.withdrawal_rule} /></label>
          <label className={styles.fullSpan}>Governance configuration JSON<textarea name="governanceRules" defaultValue={JSON.stringify(pool.governance_config ?? {}, null, 2)} required /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Save draft or freeze exact terms</button></div>
        </form>
      </InstitutionalDisclosure> : null}

      <div className={styles.twoColumn}>
        <div>
          <h3>Contributions and reservations</h3>
          {contributions.length ? <div className={styles.grid}>{contributions.map((contribution) => <article className={styles.card} key={contribution.id}><div className={styles.cardHeader}><h3>{programOptionLabel(programById, contribution.program_id)}</h3><InstitutionalStatus tone={institutionalStatusTone(contribution.status)}>{formatInstitutionalLabel(contribution.status)}</InstitutionalStatus></div><p>{formatInstitutionalMoney(contribution.amount_cents, pool.currency)}</p><p>{formatInstitutionalLabel(contribution.approval_status)}</p><p className={styles.termHash}>{String(contribution.terms_hash)}</p></article>)}</div> : <InstitutionalEmpty>No contribution record.</InstitutionalEmpty>}
        </div>
        <div>
          <h3>Anchors and underwriting</h3>
          {anchors.length || underwritings.length ? <div className={styles.grid}>
            {anchors.map((anchor) => <article className={styles.card} key={anchor.id}><div className={styles.cardHeader}><h3>Anchor · {programOptionLabel(programById, anchor.program_id)}</h3><InstitutionalStatus tone={institutionalStatusTone(anchor.status)}>{formatInstitutionalLabel(anchor.status)}</InstitutionalStatus></div><p>{formatInstitutionalMoney(anchor.amount_cents, pool.currency)}</p><p>Contribution {id(anchor.contribution_id).slice(0, 8)}</p></article>)}
            {underwritings.map((underwriting) => <article className={styles.card} key={underwriting.id}><div className={styles.cardHeader}><h3>Underwriting · {programOptionLabel(programById, underwriting.program_id)}</h3><InstitutionalStatus tone={institutionalStatusTone(underwriting.status)}>{formatInstitutionalLabel(underwriting.status)}</InstitutionalStatus></div><p>{formatInstitutionalMoney(underwriting.maximum_amount_cents, pool.currency)}</p></article>)}
          </div> : <InstitutionalEmpty>No anchor or underwriting commitment.</InstitutionalEmpty>}
        </div>
      </div>

      {poolApprovalGrants.length ? <InstitutionalDisclosure title="Record independent pool participation approval">
        <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("record_pool_approval", poolReturnTo, dealId, organizationId)}{organizationScopeFields}<label>Decision<select name="decision"><option value="approve">Approve participation</option><option value="reject">Reject participation</option><option value="abstain">Abstain</option><option value="withdrawn">Withdraw prior decision</option></select></label><label>Pool-approval authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select pool:approve authority</option>{poolApprovalGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record independent approval</button></div></form>
      </InstitutionalDisclosure> : null}

      <div className={styles.twoColumn}>
        {canReserveFunds ? <InstitutionalDisclosure title="Reserve financial capacity">
          <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("reserve_budget", poolReturnTo, dealId, organizationId)}<label>Budget account<select name="budgetAccountId" required defaultValue=""><option value="" disabled>Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {formatInstitutionalMoney(account.authorized_cents, account.currency)}</option>)}</select></label><label>Amount<input name="amount" inputMode="decimal" required /></label><label className={styles.fullSpan}>Finance authority<select name="financeAuthorityGrantId" required defaultValue=""><option value="" disabled>Select finance:reserve authority</option>{financeGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><label className={styles.fullSpan}>Stable idempotency key<input name="idempotencyKey" minLength={8} placeholder="board-resolution-2026-07-pool-1" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Reserve capacity, not custody funds</button></div></form>
        </InstitutionalDisclosure> : null}
        {canManage ? <InstitutionalDisclosure title="Record contribution lifecycle">
          <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("save_pool_contribution", poolReturnTo, dealId, organizationId)}{organizationScopeFields}<label>Amount<input name="amount" inputMode="decimal" required /></label><label>Budget reservation<select name="budgetReservationId" defaultValue=""><option value="">No reservation for a pledge</option>{reservations.map((reservation) => <option key={reservation.id} value={reservation.id}>{accountById.get(id(reservation.budget_account_id))?.name || id(reservation.id).slice(0, 8)} · {formatInstitutionalMoney(reservation.amount_cents, pool.currency)}</option>)}</select></label><label>Finance authority<select name="financeAuthorityGrantId" defaultValue=""><option value="">Not required for pledge or withdrawal</option>{financeGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><label>Status<select name="status" defaultValue="pledged"><option value="pledged">Pledged</option>{canReserveFunds ? <><option value="committed">Committed</option><option value="paid">Paid externally</option><option value="released">Released</option><option value="refunded">Refund confirmed externally</option></> : null}<option value="withdrawn">Withdrawn</option></select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Save contribution state</button></div></form>
        </InstitutionalDisclosure> : null}
      </div>
      {!canReserveFunds ? <p className={styles.callout}>No active exact-scope finance:reserve authority was present in the database authorization snapshot. Financial reservation and underwriting controls are hidden.</p> : null}

      <div className={styles.twoColumn}>
        {poolApprovalGrants.length ? <InstitutionalDisclosure title="Record an anchor commitment">
          <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("save_pool_anchor", poolReturnTo, dealId, organizationId)}{organizationScopeFields}<label>Exact contribution<select name="contributionId" required defaultValue=""><option value="" disabled>Select contribution</option>{contributions.filter((contribution) => contribution.organization_id === organizationId).map((contribution) => <option key={contribution.id} value={contribution.id}>{formatInstitutionalMoney(contribution.amount_cents, pool.currency)} · {programOptionLabel(programById, contribution.program_id)}</option>)}</select></label><label>Anchor amount<input name="amount" inputMode="decimal" required /></label><label>Status<select name="status" defaultValue="proposed"><option value="proposed">Proposed</option><option value="committed">Committed</option><option value="released">Released</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></label><label>Pool authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select pool:approve authority</option>{poolApprovalGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Save anchor</button></div></form>
        </InstitutionalDisclosure> : null}
        {canReserveFunds ? <InstitutionalDisclosure title="Record underwriting">
          <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("save_pool_underwriting", poolReturnTo, dealId, organizationId)}{organizationScopeFields}<label>Maximum amount<input name="maximumAmount" inputMode="decimal" required /></label><label>Budget reservation<select name="budgetReservationId" defaultValue=""><option value="">No reservation for proposal</option>{reservations.map((reservation) => <option key={reservation.id} value={reservation.id}>{accountById.get(id(reservation.budget_account_id))?.name || id(reservation.id).slice(0, 8)} · {formatInstitutionalMoney(reservation.amount_cents, pool.currency)}</option>)}</select></label><label>Status<select name="status" defaultValue="proposed"><option value="proposed">Proposed</option><option value="committed">Committed</option><option value="drawn">Drawn externally</option><option value="released">Released</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></label><label>Finance authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select finance:reserve authority</option>{financeGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Save underwriting</button></div></form>
        </InstitutionalDisclosure> : null}
      </div>

      <div className={styles.twoColumn}>
        {poolApprovalGrants.length ? <InstitutionalDisclosure title="Cast an exact-term governance vote">
          <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("cast_pool_vote", poolReturnTo, dealId, organizationId)}{organizationScopeFields}<label>Proposal key<select name="proposalKey"><option value="activation">Activation</option><option value="amendment">Amendment</option><option value="termination">Termination</option><option value="dispute_resolution">Dispute resolution</option></select></label><label>Vote<select name="vote"><option value="approve">Approve</option><option value="reject">Reject</option><option value="abstain">Abstain</option></select></label><label className={styles.fullSpan}>Governance authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select pool:approve authority</option>{poolApprovalGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Cast exact-term vote</button></div></form>
        </InstitutionalDisclosure> : null}
        {activationGrants.length ? <InstitutionalDisclosure title="Activate only after every atomic gate passes">
          <form action={runInstitutionalAction} className={styles.formGrid}>{formBase("activate_pool", poolReturnTo, dealId, organizationId)}{organizationScopeFields}<label className={styles.fullSpan}>Pool-activation authority<select name="authorityGrantId" required defaultValue=""><option value="" disabled>Select pool:activate authority</option>{activationGrants.map((grant) => <option key={grant.id} value={grant.id}>{programOptionLabel(programById, grant.program_id)} · {grant.authority_basis}</option>)}</select></label><p className={`${styles.callout} ${styles.fullSpan}`}>Activation checks the exact threshold, contributor count, required governance votes, committed anchors, committed underwriting, and unexpired deadline in one database transaction.</p><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Run atomic activation gate</button></div></form>
        </InstitutionalDisclosure> : null}
      </div>

      {votes.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Scope</th><th>Proposal</th><th>Vote</th><th>Voter</th></tr></thead><tbody>{votes.map((vote) => <tr key={vote.id}><td>{programOptionLabel(programById, vote.program_id)}</td><td>{formatInstitutionalLabel(vote.proposal_key)}</td><td>{formatInstitutionalLabel(vote.vote)}</td><td>{profileById.get(id(vote.voter_profile_id))?.display_name || id(vote.voter_profile_id).slice(0, 8)}</td></tr>)}</tbody></table></div> : null}
      {reservations.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Budget</th><th>Amount</th><th>Status</th><th>Reserved by</th></tr></thead><tbody>{reservations.map((reservation) => <tr key={reservation.id}><td>{accountById.get(id(reservation.budget_account_id))?.name || reservation.budget_account_id}</td><td>{formatInstitutionalMoney(reservation.amount_cents, accountById.get(id(reservation.budget_account_id))?.currency || pool.currency)}</td><td>{formatInstitutionalLabel(reservation.status)}</td><td>{profileById.get(id(reservation.reserved_by))?.display_name || id(reservation.reserved_by).slice(0, 8)}</td></tr>)}</tbody></table></div> : null}
    </>}
  </section>;
}
