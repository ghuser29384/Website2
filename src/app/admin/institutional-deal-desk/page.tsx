import type { Metadata } from "next";
import Link from "next/link";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalDate,
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
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getFormMessage } from "@/lib/form-state";
import { loadInstitutionalDealDeskForVerifiedOperator } from "@/lib/institutional-data";
import { INSTITUTIONAL_RISK_CATEGORIES, INSTITUTIONAL_RISK_SEVERITIES, institutionalDealHref, isPersonalInstitutionalCapacity } from "@/lib/institutional-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Institutional Deal Desk",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type Row = Record<string, unknown> & { id: string };

const PIPELINE_STAGES = [
  ["draft", "Intake"],
  ["exploratory", "Qualification"],
  ["authorized_for_negotiation", "Matching"],
  ["proposed", "Structuring"],
  ["term_sheet_agreed", "Due diligence"],
  ["pending_governance_approval", "Approval"],
  ["signed", "Signature"],
  ["execution", "Execution"],
  ["evidence_review", "Verification"],
  ["disputed", "Dispute"],
] as const;

function id(value: unknown) {
  return String(value ?? "").trim();
}

function text(value: unknown, fallback = "Not set") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function mapName(map: Map<string, Row>, value: unknown, field = "display_name", fallback = "Not assigned") {
  const rowId = id(value);
  return rowId ? text(map.get(rowId)?.[field], rowId) : fallback;
}

function operatorBase(actionType: string, dealId?: string) {
  return (
    <>
      <input name="actionType" type="hidden" value={actionType} />
      <input name="returnTo" type="hidden" value="/admin/institutional-deal-desk" />
      {dealId ? <input name="dealId" type="hidden" value={dealId} /> : null}
    </>
  );
}

export default async function InstitutionalDealDeskPage({ searchParams }: PageProps) {
  const [viewer, security, resolvedSearchParams] = await Promise.all([
    requireViewer("/admin/institutional-deal-desk"),
    loadBackgroundAccountSecuritySummary(),
    searchParams,
  ]);
  const access = evaluateAdminOperatorAccess({ email: viewer.authUser.email, mfaSummary: security });
  const desk = access.allowed ? await loadInstitutionalDealDeskForVerifiedOperator() : null;
  const message = getFormMessage(resolvedSearchParams);
  const organizationById = new Map((desk?.organizations ?? []).map((row) => [row.id, row]));
  const profileById = new Map((desk?.profiles ?? []).map((row) => [row.id, row]));
  const budgetAccountById = new Map((desk?.budgetAccounts ?? []).map((row) => [row.id, row]));
  const partyById = new Map((desk?.dealParties ?? []).map((row) => [row.id, row]));
  const dealById = new Map((desk?.deals ?? []).map((row) => [row.id, row]));
  const leadName = (deal: Row | undefined) => deal && isPersonalInstitutionalCapacity(deal.lead_capacity)
    ? mapName(profileById, deal.lead_profile_id, "display_name", "Independent participant")
    : mapName(organizationById, deal?.lead_organization_id);
  const partyName = (party: Row | undefined) => party && isPersonalInstitutionalCapacity(party.party_capacity)
    ? mapName(profileById, party.profile_id, "display_name", "Independent participant")
    : mapName(organizationById, party?.organization_id);
  const actions = getTopbarActions(true);

  return (
    <div className={styles.shell}>
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(true)}
        authLink={actions.authLink}
        primaryAction={actions.primaryAction}
        showLogout
      />
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Institutional operations</p>
            <h1>Deal Desk</h1>
            <p>Qualify institutional participants, inspect confidential matches, structure multi-party terms, review counterfactual and integrity risks, monitor execution, and preserve an auditable closeout boundary.</p>
            <div className={styles.heroActions}><Link className={styles.secondaryButton} href="/admin">Admin console</Link><Link className={styles.primaryButton} href="/institutions">Institutional directory</Link></div>
          </div>
          <aside className={styles.heroAside}>
            <div className={styles.principle}><span>01</span><div><strong>Operator access is exceptional</strong><p>ADMIN_EMAILS allowlisting, a verified authenticator factor, and active AAL2 are required.</p></div></div>
            <div className={styles.principle}><span>02</span><div><strong>Review does not endorse</strong><p>Identity, authority, legal entity, payment account, risk, and evidence are fact-specific review dimensions.</p></div></div>
            <div className={styles.principle}><span>03</span><div><strong>No silent overrides</strong><p>Operators cannot bypass exact-term, approval, consent, signature, risk, evidence, or pool activation gates through this console.</p></div></div>
          </aside>
        </div>
      </header>

      <main className={styles.main}>
        {message ? <p className={message.tone === "error" ? styles.errorNotice : styles.successNotice}>{message.text}</p> : null}
        {!access.allowed || !desk ? (
          <section className={styles.section}>
            <InstitutionalSectionHeader title="Operator access blocked" description={access.message} />
            <div className={styles.panel}><p>Open Account security, verify an authenticator app, complete step-up authentication, and then reload this route.</p><div className={styles.inlineActions}><Link className={styles.primaryButton} href="/dashboard">Open account security</Link><Link className={styles.secondaryButton} href="/admin">Back to admin</Link></div></div>
          </section>
        ) : (
          <>
            <section className={styles.section}>
              <InstitutionalSectionHeader eyebrow="Pipeline" title="Current institutional cases" description="Pipeline state is derived from each deal’s authoritative lifecycle stage; it is not an informal spreadsheet status." />
              <div className={styles.operatorRail}>
                {PIPELINE_STAGES.map(([stage, label]) => <div className={styles.operatorStage} key={stage}><span>{label}</span><strong>{desk.deals.filter((deal) => deal.stage === stage).length}</strong></div>)}
              </div>
              <div className={styles.metricGrid}>
                <InstitutionalMetric label="Active deals" value={desk.deals.length} note="Excludes completed, terminated, and expired" />
                <InstitutionalMetric label="Open risks" value={desk.risks.length} note={`${desk.risks.filter((row) => Boolean(row.nonwaivable)).length} nonwaivable`} />
                <InstitutionalMetric label="Disputes" value={desk.disputes.length} note={`${desk.overdueMilestones.length} overdue milestones`} />
                <InstitutionalMetric label="Verification queue" value={desk.pendingVerifications.length} note={`${desk.pools.length} active pool records`} />
              </div>
              {desk.deals.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Deal</th><th>Lead</th><th>Type</th><th>Stage</th><th>Parties</th><th>Updated</th></tr></thead><tbody>{desk.deals.map((deal) => <tr key={deal.id}><td><Link href={institutionalDealHref(deal as { id: string; lead_capacity?: unknown; lead_organization_id?: unknown })}>{text(deal.title)}</Link></td><td>{leadName(deal)}</td><td>{formatInstitutionalLabel(deal.deal_type)}</td><td><InstitutionalStatus tone={institutionalStatusTone(deal.stage)}>{formatInstitutionalLabel(deal.stage)}</InstitutionalStatus></td><td>{desk.dealParties.filter((party) => id(party.deal_id) === deal.id).length}</td><td><InstitutionalDate value={deal.updated_at} /></td></tr>)}</tbody></table></div> : <InstitutionalEmpty>No active institutional deal.</InstitutionalEmpty>}
            </section>

            <section className={styles.section}>
              <InstitutionalSectionHeader eyebrow="Identity review" title="Pending verification facts" description="Approve only the stated facet. A domain-control result must not be presented as legal existence, representative authority, payment identity, effectiveness, or platform endorsement." />
              {desk.pendingVerifications.length ? <div className={styles.grid}>{desk.pendingVerifications.map((verification) => (
                <article className={styles.operatorCard} key={verification.id}>
                  <div className={styles.cardHeader}><div><p className={styles.eyebrow}>{formatInstitutionalLabel(verification.facet)}</p><h3>{mapName(organizationById, verification.organization_id)}</h3></div><InstitutionalStatus tone="warn">Pending</InstitutionalStatus></div>
                  <InstitutionalKeyValue entries={[["Method", formatInstitutionalLabel(verification.method)], ["Subject", `${formatInstitutionalLabel(verification.subject_type)} · ${text(verification.subject_id)}`], ["Requested by", mapName(profileById, verification.requested_by)], ["Created", <InstitutionalDate key="created" value={verification.created_at} />]]} />
                  <details className={styles.commandPayload}><summary>Evidence references</summary><pre>{JSON.stringify(verification.evidence_references ?? [], null, 2)}</pre></details>
                  <form action={runInstitutionalAction} className={styles.form}>
                    {operatorBase("operator_review_verification")}
                    <input name="verificationId" type="hidden" value={verification.id} />
                    <label>Decision<select name="status" defaultValue="needs_information"><option value="verified">Verified</option><option value="needs_information">Needs information</option><option value="rejected">Rejected</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select></label>
                    <label>Expires<input name="expiresAt" type="datetime-local" /></label>
                    <label>Review note<textarea name="reviewNote" required /></label>
                    <button className={styles.primaryButton} type="submit">Record fact-specific decision</button>
                  </form>
                </article>
              ))}</div> : <InstitutionalEmpty>No pending verification request.</InstitutionalEmpty>}
            </section>

            <section className={styles.section}>
              <InstitutionalSectionHeader eyebrow="Integrity" title="Open risk and externality findings" description="Threat or coercion, manufactured baselines, conflicts, individual autonomy, externalities, sanctions, privacy, research integrity, and legal-policy constraints receive explicit categories rather than a single opaque score." />
              {desk.risks.length ? <div className={styles.grid}>{desk.risks.map((risk) => {
                const deal = dealById.get(id(risk.deal_id));
                return <article className={styles.operatorCard} key={risk.id}><div className={styles.cardHeader}><div><p className={styles.eyebrow}>{formatInstitutionalLabel(risk.category)}</p><h3>{text(deal?.title, id(risk.deal_id))}</h3></div><InstitutionalStatus tone={institutionalStatusTone(risk.status)}>{formatInstitutionalLabel(risk.status)}</InstitutionalStatus></div><p>{text(risk.finding)}</p><p><strong>Mitigation:</strong> {text(risk.mitigation, "Not supplied")}</p><p>{formatInstitutionalLabel(risk.severity)} · {risk.nonwaivable ? "nonwaivable" : "waivable only under applicable process"} · reviewer {mapName(profileById, risk.reviewer_profile_id)}</p><Link className={styles.textButton} href={deal ? `${institutionalDealHref(deal as { id: string; lead_capacity?: unknown; lead_organization_id?: unknown })}#risk` : "/admin/institutional-deal-desk"}>Open deal risk record</Link></article>;
              })}</div> : <InstitutionalEmpty>No open risk finding.</InstitutionalEmpty>}
              <details className={styles.disclosure}><summary>Create an operator integrity finding</summary><div className={styles.disclosureBody}><form action={runInstitutionalAction} className={styles.formGrid}>{operatorBase("operator_create_risk_review")}<label>Deal<select name="dealId" required defaultValue=""><option value="" disabled>Select deal</option>{desk.deals.map((deal) => <option key={deal.id} value={deal.id}>{text(deal.title)} · {leadName(deal)}</option>)}</select></label><label>Organization in scope<select name="riskOrganizationId" defaultValue=""><option value="">Deal-wide</option>{desk.organizations.map((organization) => <option key={organization.id} value={organization.id}>{text(organization.display_name)}</option>)}</select></label><label>Proposal version ID<input name="proposalVersionId" placeholder="Optional exact proposal UUID" /></label><label>Category<select name="category" defaultValue="externality">{INSTITUTIONAL_RISK_CATEGORIES.map((value) => <option key={value} value={value}>{formatInstitutionalLabel(value)}</option>)}</select></label><label>Severity<select name="severity" defaultValue="high">{INSTITUTIONAL_RISK_SEVERITIES.map((value) => <option key={value} value={value}>{formatInstitutionalLabel(value)}</option>)}</select></label><label>Visibility<select name="visibility" defaultValue="operator_only"><option value="all_parties">All parties</option><option value="party_internal">Party internal</option><option value="operator_only">Operator only</option></select></label><label>Status<select name="status" defaultValue="open"><option value="open">Open</option><option value="needs_information">Needs information</option><option value="mitigated">Mitigated</option><option value="accepted">Accepted</option><option value="blocked">Blocked</option><option value="closed">Closed</option></select></label><label className={styles.checkbox}><input name="nonwaivable" type="checkbox" />Nonwaivable execution blocker</label><label className={styles.fullSpan}>Finding<textarea name="finding" required /></label><label className={styles.fullSpan}>Mitigation<textarea name="mitigation" /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record operator finding</button></div></form></div></details>
            </section>

            <section className={styles.section}>
              <InstitutionalSectionHeader eyebrow="Execution" title="Overdue milestones, commitments, pools, and disputes" description="These are operational exceptions, not proof of breach. Operators inspect the underlying terms, evidence, authority, and dispute process before drawing conclusions." />
              <div className={styles.twoColumn}>
                <div><h3>Overdue milestones</h3>{desk.overdueMilestones.length ? <div className={styles.timeline}>{desk.overdueMilestones.map((milestone) => <article className={styles.timelineItem} key={milestone.id}><time><InstitutionalDate value={milestone.due_at} /></time><div><strong>{text(milestone.title)}</strong><p>{text(dealById.get(id(milestone.deal_id))?.title, id(milestone.deal_id))} · {formatInstitutionalLabel(milestone.status)}</p></div></article>)}</div> : <InstitutionalEmpty>No overdue milestone.</InstitutionalEmpty>}</div>
                <div><h3>Open disputes</h3>{desk.disputes.length ? <div className={styles.timeline}>{desk.disputes.map((dispute) => {
                  const party = partyById.get(id(dispute.opened_by_party_id));
                  const deal = dealById.get(id(dispute.deal_id));
                  return <article className={styles.timelineItem} key={dispute.id}><time><InstitutionalDate value={dispute.updated_at} /></time><div><strong>{text(deal?.title, id(dispute.deal_id))} · {formatInstitutionalLabel(dispute.stage)}</strong><p>Opened by {partyName(party)} · {text(dispute.summary)}</p><Link href={deal ? `${institutionalDealHref(deal as { id: string; lead_capacity?: unknown; lead_organization_id?: unknown })}#disputes` : "/admin/institutional-deal-desk"}>Open dispute record</Link></div></article>;
                })}</div> : <InstitutionalEmpty>No open dispute.</InstitutionalEmpty>}</div>
              </div>
              <div className={styles.twoColumn}>
                <div><h3>Active budget reservations</h3>{desk.activeReservations.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Account</th><th>Deal</th><th>Amount</th><th>Status</th><th>Expires</th></tr></thead><tbody>{desk.activeReservations.map((reservation) => { const account = budgetAccountById.get(id(reservation.budget_account_id)); const deal = dealById.get(id(reservation.deal_id)); return <tr key={reservation.id}><td>{text(account?.name, id(reservation.budget_account_id))}</td><td>{text(deal?.title, id(reservation.deal_id))}</td><td>{formatInstitutionalMoney(reservation.amount_cents, account?.currency ?? "usd")}</td><td>{formatInstitutionalLabel(reservation.status)}</td><td><InstitutionalDate value={reservation.expires_at} /></td></tr>; })}</tbody></table></div> : <InstitutionalEmpty>No active reservation.</InstitutionalEmpty>}</div>
                <div><h3>Institutional pools</h3>{desk.pools.length ? <div className={styles.grid}>{desk.pools.map((pool) => { const deal = dealById.get(id(pool.deal_id)); return <article className={styles.card} key={pool.id ?? id(pool.deal_id)}><div className={styles.cardHeader}><h3>{text(deal?.title, id(pool.deal_id))}</h3><InstitutionalStatus tone={institutionalStatusTone(pool.status)}>{formatInstitutionalLabel(pool.status)}</InstitutionalStatus></div><p>{formatInstitutionalMoney(pool.threshold_amount_cents, pool.currency)} · minimum {String(pool.minimum_contributors)} contributors</p><p>Deadline <InstitutionalDate value={pool.contribution_deadline} /></p><Link className={styles.textButton} href={deal ? `${institutionalDealHref(deal as { id: string; lead_capacity?: unknown; lead_organization_id?: unknown })}#pool` : "/admin/institutional-deal-desk"}>Open pool controls</Link></article>; })}</div> : <InstitutionalEmpty>No active pool.</InstitutionalEmpty>}</div>
              </div>
            </section>

            <section className={styles.section}>
              <InstitutionalSectionHeader eyebrow="Discovery" title="Recent confidential matches" description="The operator view can inspect whether match generation is producing plausible opposite-bottleneck candidates without disclosing reservation terms to counterparties." />
              {desk.recentMatches.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Offer side</th><th>Seek side</th><th>Class</th><th>Fit</th><th>Overlap</th><th>Status</th></tr></thead><tbody>{desk.recentMatches.map((match) => <tr key={match.id}><td>{mapName(organizationById, match.offer_organization_id)}</td><td>{mapName(organizationById, match.seek_organization_id)}</td><td>{formatInstitutionalLabel(match.classification)}</td><td>{Math.round(Number(match.score ?? 0) * 100)}%</td><td>{match.bargaining_overlap ? "Detected" : "Not established"}</td><td>{formatInstitutionalLabel(match.status)}</td></tr>)}</tbody></table></div> : <InstitutionalEmpty>No active match.</InstitutionalEmpty>}
            </section>

            <section className={styles.section}>
              <InstitutionalSectionHeader eyebrow="Audit" title="Recent institutional audit events" description="Audit history is append-only and should be used to reconstruct actions, not to infer that the underlying moral, legal, or counterfactual claims are correct." />
              {desk.recentAuditEvents.length ? <div className={styles.timeline}>{desk.recentAuditEvents.map((event) => <article className={styles.timelineItem} key={event.id}><time><InstitutionalDate value={event.occurred_at} /></time><div><strong>{formatInstitutionalLabel(event.event_type)}</strong><p>{mapName(profileById, event.actor_profile_id, "display_name", formatInstitutionalLabel(event.actor_type))} · {mapName(organizationById, event.represented_organization_id)}</p><p>{text(event.authority_basis, "No authority note")}</p></div></article>)}</div> : <InstitutionalEmpty>No audit event.</InstitutionalEmpty>}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
