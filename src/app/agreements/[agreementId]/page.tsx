import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addAgreementEventAction,
  createAgreementPaymentCheckoutAction,
  createAgreementPaymentScheduleAction,
  rateAgreementAction,
  acceptPerformanceBondEvidenceAction,
  challengePerformanceBondEvidenceAction,
  requestAgreementReviewAppealAction,
  requestPaymentReviewAction,
  saveAgreementTermsAction,
  submitAgreementEvidenceAction,
  submitPerformanceBondEvidenceAction,
  updateAgreementStatusAction,
} from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getAgreementForUser, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import {
  PERFORMANCE_BOND_LIMITATION_COPY,
  PERFORMANCE_BOND_REVIEWER_POLICY,
  evidenceSchemaFromJson,
  formatPerformanceBondAmount,
  splitConfigFromJson,
} from "@/lib/performance-bonds";
import { buildAgreementPaymentAuthorizationPreview } from "@/lib/agreement-payment-authorization";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasStripeEnv } from "@/lib/stripe";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Agreement",
  robots: {
    index: false,
    follow: false,
  },
};

interface AgreementPageProps {
  params: Promise<{ agreementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type PerformanceBondRow = Database["public"]["Tables"]["performance_bonds"]["Row"];
type BondEvidenceRow = Database["public"]["Tables"]["bond_evidence"]["Row"];
type BondChallengeRow = Database["public"]["Tables"]["bond_challenges"]["Row"];
type BondLedgerEntryRow = Database["public"]["Tables"]["bond_ledger_entries"]["Row"];
type BondAuditEventRow = Database["public"]["Tables"]["performance_bond_audit_events"]["Row"];

function formatPaymentAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatCadence(value: number, unit: string) {
  if (unit === "one_time") {
    return "one-time";
  }

  if (unit === "custom_days") {
    return `every ${value} day${value === 1 ? "" : "s"}`;
  }

  return value === 1 ? `every ${unit}` : `every ${value} ${unit}s`;
}

const COMPLETION_STATES = [
  "pending_evidence",
  "under_review",
  "challenge_window_open",
  "reviewed_complete",
  "disputed_unresolved",
] as const;

const VERIFICATION_BADGES = [
  "identity_verified",
  "organization_verified",
  "payment_evidence_verified",
  "completion_reviewed",
  "repeat_counterparty",
] as const;

function formatState(value: string) {
  return value.replaceAll("_", " ");
}

function formatAgreementDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return <LocalDateTime value={value} fallback="Date unavailable" dateOnly />;
}

function formatPerformanceBondDestination(bond: PerformanceBondRow) {
  if (bond.forfeiture_destination === "mpgf") {
    return "Moral Public Goods Fund";
  }

  if (bond.forfeiture_destination === "counterparty") {
    return "Counterparty after platform review";
  }

  if (bond.forfeiture_destination === "split") {
    const split = splitConfigFromJson(bond.split_config);
    return `Split: ${split.counterpartyPercent}% counterparty, ${split.neutralCausePercent}% neutral cause, ${split.mpgfPercent}% MPGF`;
  }

  return "Compromise charity / neutral cause, or MPGF if no neutral cause is available";
}

function isFinalPerformanceBondStatus(status: string) {
  return ["refunded", "forfeited", "split_disbursed", "cancelled", "expired"].includes(status);
}

function formatSla(value: string | null) {
  if (!value) {
    return "No SLA set";
  }

  const dueAt = Date.parse(value);
  if (Number.isNaN(dueAt)) {
    return "SLA unavailable";
  }

  const diffMs = dueAt - Date.now();
  const hours = Math.max(1, Math.ceil(Math.abs(diffMs) / (60 * 60 * 1000)));

  return diffMs < 0 ? `Overdue by ${hours}h` : `Due in ${hours}h`;
}

export default async function AgreementPage({ params, searchParams }: AgreementPageProps) {
  const { agreementId } = await params;
  const resolvedSearchParams = await searchParams;
  const viewer = await requireViewer(`/agreements/${agreementId}`);
  const agreement = await getAgreementForUser(agreementId, viewer.authUser.id);
  const formMessage = getFormMessage(resolvedSearchParams);

  if (!agreement) {
    notFound();
  }

  const proposerBadges = new Set(
    agreement.proposer?.verificationBadges
      .filter((badge) => badge.status === "verified")
      .map((badge) => badge.badge_type) ?? [],
  );
  const responderBadges = new Set(
    agreement.responder?.verificationBadges
      .filter((badge) => badge.status === "verified")
      .map((badge) => badge.badge_type) ?? [],
  );
  const defaultStructuredTerms =
    agreement.structured_terms ||
    agreement.offer?.offer_action ||
    "State the proposed action, reciprocal action, burden, and expected moral surplus.";
  const defaultEvidenceRule =
    agreement.evidence_rule ||
    agreement.offer?.verification ||
    "Name the receipts, logs, attestations, or provider records that will count.";
  const paymentAuthorizationPreview = buildAgreementPaymentAuthorizationPreview({
    agreementCompletionState: agreement.completion_state,
    agreementSource: agreement.source,
    hasAtomicSettlementGroup: false,
    hasFreshFinalConfirmations: false,
    hasMatchedTradeLockProposal: false,
    hasNonConflictingCommitmentReservation: false,
    offerMode: agreement.offer?.mode,
    participantEligibilityCleared: false,
    paymentRailReviewCleared: false,
    providerConfigured: hasStripeEnv(),
    providerSupportsConditionalAuthorization: false,
    reviewStage: agreement.status,
    termsText: [
      agreement.notes,
      agreement.structured_terms,
      agreement.no_trade_baseline,
      agreement.counterfactual_declaration,
      agreement.duration_terms,
      agreement.exit_conditions,
      agreement.evidence_rule,
      agreement.offer?.offer_action,
      agreement.offer?.request_action,
      agreement.offer?.notes,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Agreement record</p>
            <h1>
              Agreement with{" "}
              {agreement.counterparty ? agreement.counterparty.resolvedName : "counterparty"}.
            </h1>
            <p className="hero-text">
              This page keeps the negotiation, payment records, verification evidence, disputes,
              cancellation requests, and ratings in one auditable place.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/dashboard">
                Back to dashboard
              </Link>
              {agreement.offer ? (
                <Link className="button button-primary" href={`/offers/${agreement.offer.id}`}>
                  View offer
                </Link>
              ) : null}
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current state</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>{formatState(agreement.completion_state)}</strong>
                  <p>
                    Status last updated{" "}
                    <LocalDateTime value={agreement.updated_at} fallback="Date unavailable" dateOnly />.
                  </p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>{agreement.payments.length} payment record(s)</strong>
                  <p>{agreement.paymentSchedules.length} reminder schedule(s).</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  {agreement.legacyEvidenceReviewAvailable ? (
                    <>
                      <strong>{agreement.reviewCases.length} review case(s)</strong>
                      <p>{agreement.evidenceItems.length} evidence item(s) submitted.</p>
                    </>
                  ) : (
                    <>
                      <strong>Current milestone review workflow</strong>
                      <p>The retired agreement-room evidence console is not enabled.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Terms</p>
            <h2>What the parties are tracking</h2>
            <p>
              {agreement.offer
                ? `${agreement.offer.offered_cause} for ${agreement.offer.requested_cause}`
                : "Private introduction agreement room"}
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Offer action</p>
              <h3>{agreement.offer?.offer_action ?? (agreement.structured_terms || "Draft terms needed")}</h3>
              <p className="route-text">{defaultEvidenceRule}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Counterparty action</p>
              <h3>{agreement.offer?.request_action ?? "Confirm reciprocal action in room terms"}</h3>
              <p className="route-text">{agreement.notes || "No additional notes recorded."}</p>
            </article>
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Agreement room</p>
            <h3>Structured terms before evidence review</h3>
            <form action={saveAgreementTermsAction} className="stack-form">
              <input name="agreement_id" type="hidden" value={agreement.id} />
              <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
              <label className="field">
                <span>Structured terms</span>
                <textarea defaultValue={defaultStructuredTerms} name="structured_terms" rows={4} required />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>No-trade baseline</span>
                  <textarea
                    defaultValue={agreement.no_trade_baseline}
                    name="no_trade_baseline"
                    placeholder="What would each side likely do if this trade does not happen?"
                    rows={3}
                    required
                  />
                </label>
                <label className="field">
                  <span>Counterfactual declaration</span>
                  <textarea
                    defaultValue={agreement.counterfactual_declaration}
                    name="counterfactual_declaration"
                    placeholder="Why is this action plausibly caused by the agreement rather than already planned?"
                    rows={3}
                    required
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Duration</span>
                  <textarea defaultValue={agreement.duration_terms} name="duration_terms" rows={3} required />
                </label>
                <label className="field">
                  <span>Exit conditions</span>
                  <textarea defaultValue={agreement.exit_conditions} name="exit_conditions" rows={3} required />
                </label>
              </div>
              <label className="field">
                <span>Evidence</span>
                <textarea defaultValue={defaultEvidenceRule} name="evidence_rule" rows={3} required />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Privacy scope</span>
                  <textarea defaultValue={agreement.privacy_scope} name="privacy_scope" rows={3} required />
                </label>
                <label className="field">
                  <span>Disclosure scope</span>
                  <textarea defaultValue={agreement.disclosure_scope} name="disclosure_scope" rows={3} />
                </label>
              </div>
              <button className="button button-primary button-mini" type="submit">
                Save agreement terms
              </button>
            </form>
          </div>
        </section>

        {agreement.performanceBonds.length ? (
          <section className="section section-white" aria-labelledby="performance-bonds-heading">
            <div className="section-head">
              <p className="eyebrow">Pledge performance bonds</p>
              <h2 id="performance-bonds-heading">Evidence, challenge windows, and review status</h2>
              <p>
                These bonds support factual trust about whether each pledged act was performed.
                They do not replace the no-trade baseline or additionality explanation.
              </p>
            </div>

            <div className="data-grid">
              {agreement.performanceBonds.map((bond) => {
                const evidenceSchema = evidenceSchemaFromJson(bond.evidence_schema);
                const evidenceItems = agreement.bondEvidence
                  .filter((item: BondEvidenceRow) => item.bond_id === bond.id)
                  .sort(
                    (left, right) =>
                      Date.parse(right.submitted_at) - Date.parse(left.submitted_at),
                  );
                const latestEvidence = evidenceItems[0] ?? null;
                const challenges = agreement.bondChallenges
                  .filter((challenge: BondChallengeRow) => challenge.bond_id === bond.id)
                  .sort(
                    (left, right) =>
                      Date.parse(right.challenged_at) - Date.parse(left.challenged_at),
                  );
                const ledgerEntries = agreement.bondLedgerEntries.filter(
                  (entry: BondLedgerEntryRow) => entry.bond_id === bond.id,
                );
                const auditEvents = agreement.performanceBondAuditEvents
                  .filter((event: BondAuditEventRow) => event.bond_id === bond.id)
                  .sort(
                    (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
                  );
                const isPledger = viewer.authUser.id === bond.party_id;
                const isCounterparty = viewer.authUser.id === bond.counterparty_id;
                const canSubmitEvidence =
                  isPledger &&
                  !latestEvidence &&
                  !isFinalPerformanceBondStatus(bond.status) &&
                  ["active", "awaiting_funding", "evidence_due"].includes(bond.status);
                const canRespondToEvidence =
                  isCounterparty && latestEvidence && bond.status === "challenge_window_open";

                return (
                  <article className="panel data-card data-card-wide" key={bond.id}>
                    <p className="detail-kicker">
                      {bond.side === "offerer" ? "Offer-maker pledge" : "Taker reciprocal pledge"}
                    </p>
                    <h3>{formatPerformanceBondAmount(bond.amount_cents, bond.currency)}</h3>
                    <div className="tag-row">
                      <span className="badge">{formatState(bond.status)}</span>
                      <span className="source-pill">
                        Funding: {formatState(bond.funding_status)}
                      </span>
                      <span className="source-pill">
                        Evidence due {formatAgreementDate(bond.evidence_due_at)}
                      </span>
                      <span className="source-pill">
                        Challenge window {bond.challenge_window_days} days
                      </span>
                    </div>
                    <p className="route-text">
                      {bond.funding_status === "payment_pending"
                        ? "Manual-payment pending: this record tracks terms and review status, but does not claim live platform custody."
                        : "Funding and ledger status are shown separately from evidence review."}
                    </p>
                    <div className="field-grid">
                      <div>
                        <h4>Evidence schema</h4>
                        <p className="route-text">
                          <strong>Action:</strong> {evidenceSchema.actionToProve}
                        </p>
                        <p className="route-text">
                          <strong>Evidence types:</strong> {evidenceSchema.acceptedEvidenceTypes}
                        </p>
                        <p className="route-text">
                          <strong>Minimum detail:</strong> {evidenceSchema.minimumDetail}
                        </p>
                        <p className="route-text">
                          <strong>Review standard:</strong> {evidenceSchema.reviewStandard}
                        </p>
                        <p className="route-text">
                          <strong>Visibility:</strong>{" "}
                          {formatState(evidenceSchema.visibility)}
                          {evidenceSchema.privateEvidenceAllowed
                            ? "; private/redacted evidence allowed"
                            : ""}
                        </p>
                      </div>
                      <div>
                        <h4>Bond terms</h4>
                        <p className="route-text">
                          <strong>Refunded when:</strong> evidence is accepted under the evidence
                          schema.
                        </p>
                        <p className="route-text">
                          <strong>Forfeiture rule:</strong> {formatPerformanceBondDestination(bond)}
                        </p>
                        <p className="route-text">
                          <strong>Reviewer:</strong> {PERFORMANCE_BOND_REVIEWER_POLICY}
                        </p>
                        <p className="panel-note">{PERFORMANCE_BOND_LIMITATION_COPY}</p>
                      </div>
                    </div>
                    <div className="field-grid">
                      <div>
                        <h4>No-trade baseline</h4>
                        <p className="route-text">{bond.no_trade_baseline}</p>
                      </div>
                      <div>
                        <h4>Why this is additional?</h4>
                        <p className="route-text">{bond.additionality_statement}</p>
                      </div>
                    </div>

                    {canSubmitEvidence ? (
                      <form action={submitPerformanceBondEvidenceAction} className="stack-form compact-form">
                        <input name="bond_id" type="hidden" value={bond.id} />
                        <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                        <label className="field">
                          <span>Submit evidence for your pledge</span>
                          <textarea
                            name="evidence_text"
                            placeholder="Explain what was completed and how this evidence satisfies the agreed schema."
                            required
                            rows={4}
                          />
                        </label>
                        <label className="field">
                          <span>Evidence URL</span>
                          <input
                            name="evidence_urls"
                            placeholder="Optional public log, receipt link, or proof packet URL"
                            type="url"
                          />
                        </label>
                        <div className="field-grid">
                          <label className="field">
                            <span>Visibility</span>
                            <select defaultValue={evidenceSchema.visibility} name="visibility">
                              <option value="counterparty_only">Counterparty only</option>
                              <option value="platform_reviewer_only">Platform reviewer only</option>
                              <option value="public_proof">Public proof</option>
                              <option value="mixed_redacted">Mixed/redacted</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Redaction notes</span>
                            <input
                              name="redaction_notes"
                              placeholder="Receipt IDs, addresses, or personal details redacted"
                            />
                          </label>
                        </div>
                        <p className="panel-note">
                          Do not upload or link invasive, unsafe, or unnecessary personal evidence.
                          Redact transaction IDs and private details unless the evidence schema
                          requires them.
                        </p>
                        <label className="radio-row">
                          <input name="attestation" required type="checkbox" />
                          <span>
                            I attest that this evidence is accurate and materially complete under
                            the agreed evidence standard.
                          </span>
                        </label>
                        <button className="button button-primary button-mini" type="submit">
                          Submit evidence
                        </button>
                      </form>
                    ) : null}

                    {latestEvidence ? (
                      <div className="status-banner">
                        <strong>Latest evidence</strong>
                        <p>{latestEvidence.evidence_text || "Evidence text not provided."}</p>
                        {latestEvidence.evidence_urls.length ? (
                          <div className="mini-list">
                            {latestEvidence.evidence_urls.map((url) => (
                              <a className="inline-link" href={url} key={url}>
                                Open evidence link
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <p className="panel-note">
                          Submitted{" "}
                          <LocalDateTime
                            value={latestEvidence.submitted_at}
                            fallback="Date unavailable"
                          />.
                          {bond.challenge_window_ends_at ? (
                            <>
                              {" "}Challenge window ends{" "}
                              <LocalDateTime
                                value={bond.challenge_window_ends_at}
                                fallback="Date unavailable"
                              />.
                            </>
                          ) : null}
                        </p>
                      </div>
                    ) : null}

                    {canRespondToEvidence ? (
                      <div className="field-grid">
                        <form action={acceptPerformanceBondEvidenceAction} className="compact-form">
                          <input name="bond_id" type="hidden" value={bond.id} />
                          <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                          <label className="field">
                            <span>Acceptance note</span>
                            <textarea
                              name="reason"
                              placeholder="Optional note confirming why the evidence satisfies the schema."
                            />
                          </label>
                          <button className="button button-primary button-mini" type="submit">
                            Accept evidence
                          </button>
                        </form>

                        <form action={challengePerformanceBondEvidenceAction} className="compact-form">
                          <input name="bond_id" type="hidden" value={bond.id} />
                          <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                          <input name="requested_outcome" type="hidden" value="platform_review" />
                          <p className="panel-note">
                            Challenges should identify a specific mismatch with the agreed evidence
                            schema. Bad-faith challenges may affect account trust.
                          </p>
                          <label className="field">
                            <span>Challenge reason</span>
                            <textarea name="reason" required rows={3} />
                          </label>
                          <label className="field">
                            <span>Specific mismatch</span>
                            <textarea name="specific_objection" required rows={3} />
                          </label>
                          <button className="button button-secondary button-mini" type="submit">
                            Challenge evidence
                          </button>
                        </form>
                      </div>
                    ) : null}

                    {challenges.length ? (
                      <div className="mini-list">
                        {challenges.map((challenge) => (
                          <div className="mini-list-item" key={challenge.id}>
                            <strong>{formatState(challenge.status)}</strong>
                            <span>{challenge.reason}</span>
                            <span>{challenge.specific_objection}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {ledgerEntries.length ? (
                      <div className="mini-list">
                        {ledgerEntries.map((entry) => (
                          <div className="mini-list-item" key={entry.id}>
                            <strong>
                              {formatState(entry.type)} |{" "}
                              {formatPaymentAmount(entry.amount_cents, entry.currency)}
                            </strong>
                            <span>
                              {formatState(entry.status)} to {entry.destination_type}
                              {entry.destination_id ? ` (${entry.destination_id})` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {auditEvents.length ? (
                      <details className="subtle-panel">
                        <summary className="panel-summary">Audit log</summary>
                        <div className="mini-list">
                          {auditEvents.slice(0, 8).map((event) => (
                            <div className="mini-list-item" key={event.id}>
                              <strong>
                                {formatState(event.event_type)} |{" "}
                                {formatState(event.from_status)} to {formatState(event.to_status)}
                              </strong>
                              <span>{event.reason}</span>
                              <span>
                                <LocalDateTime value={event.created_at} fallback="Date unavailable" />
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {agreement.legacyEvidenceReviewAvailable ? (
          <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Evidence review</p>
            <h2>Completion states, evidence schemas, and challenge lane</h2>
            <p>
              A participant can submit evidence, then an operator reviews it with SLA, conflict
              notes, public reasoning, and an appeal path before the room earns completion trust.
            </p>
          </div>

          <div className="data-grid">
            {COMPLETION_STATES.map((state) => (
              <article className="panel data-card" key={state}>
                <p className="detail-kicker">Completion state</p>
                <h3>{formatState(state)}</h3>
                <p className="route-text">
                  {state === agreement.completion_state ? "Current room state." : "Available state in the review ladder."}
                </p>
              </article>
            ))}
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Submit evidence</p>
              <h3>Open operator review</h3>
              <form action={submitAgreementEvidenceAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <div className="field-grid">
                  <label className="field">
                    <span>Trade schema</span>
                    <select name="trade_type" defaultValue={agreement.offer?.mode === "offset" ? "donation_offset" : "pledge_swap"}>
                      <option value="pledge_swap">Pledge swap</option>
                      <option value="donation_offset">Donation offset</option>
                      <option value="mpgf">Moral public goods</option>
                      <option value="paid_action">Paid action</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Evidence type</span>
                    <select name="evidence_type" defaultValue="manual_attestation">
                      <option value="receipt">Receipt</option>
                      <option value="provider_record">Provider record</option>
                      <option value="manual_attestation">Manual attestation</option>
                      <option value="public_log">Public log</option>
                      <option value="timestamped_commitment">Timestamped commitment</option>
                      <option value="third_party_review">Third-party review</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Evidence title</span>
                  <input name="title" placeholder="Receipt, dated pledge log, provider record, or attestation" required />
                </label>
                <label className="field">
                  <span>Evidence URL</span>
                  <input name="evidence_url" placeholder="Optional link to proof packet" type="url" />
                </label>
                <label className="field">
                  <span>Evidence summary</span>
                  <textarea name="evidence_summary" placeholder="What claim does this evidence support?" required />
                </label>
                <label className="field">
                  <span>Review scope</span>
                  <textarea name="review_scope" placeholder="What should the operator verify, and what should remain out of scope?" />
                </label>
                <button className="button button-primary button-mini" type="submit">
                  Submit for review
                </button>
              </form>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Verification ladder</p>
              <h3>Transaction-linked trust signals</h3>
              <div className="mini-list">
                {VERIFICATION_BADGES.map((badge) => (
                  <div className="mini-list-item" key={badge}>
                    <strong>{formatState(badge)}</strong>
                    <span>
                      Proposer: {proposerBadges.has(badge) ? "verified" : "not verified"} | Responder:{" "}
                      {responderBadges.has(badge) ? "verified" : "not verified"}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="data-grid">
            {agreement.evidenceItems.length ? (
              agreement.evidenceItems.map((item) => (
                <article className="panel data-card" key={item.id}>
                  <p className="detail-kicker">{formatState(item.trade_type)} | {formatState(item.evidence_type)}</p>
                  <h3>{item.title}</h3>
                  <div className="tag-row">
                    <span className="badge">{formatState(item.status)}</span>
                    <span className="source-pill">{item.schema_key}</span>
                    {item.reviewer_confidence !== null ? (
                      <span className="source-pill">Confidence {item.reviewer_confidence}/100</span>
                    ) : null}
                  </div>
                  <p className="route-text">{item.evidence_summary}</p>
                  {item.evidence_url ? (
                    <a className="inline-link" href={item.evidence_url}>Open evidence</a>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No evidence submitted.</strong>
                  <p>Submit a receipt, log, attestation, or provider record once terms are clear.</p>
                </div>
              </div>
            )}

            {agreement.reviewCases.length ? (
              agreement.reviewCases.map((reviewCase) => (
                <article className="panel data-card" key={reviewCase.id}>
                  <p className="detail-kicker">{reviewCase.reviewer_role.replaceAll("_", " ")}</p>
                  <h3>{formatState(reviewCase.status)}</h3>
                  <div className="tag-row">
                    <span className="source-pill">{formatSla(reviewCase.sla_due_at)}</span>
                    {reviewCase.challenge_window_ends_at ? (
                      <span className="source-pill">
                        Challenge until{" "}
                        <LocalDateTime
                          value={reviewCase.challenge_window_ends_at}
                          fallback="Date unavailable"
                          dateOnly
                        />
                      </span>
                    ) : null}
                  </div>
                  <p className="route-text">{reviewCase.review_scope || "No review scope recorded."}</p>
                  {reviewCase.public_reasoning_summary ? (
                    <p className="route-text">{reviewCase.public_reasoning_summary}</p>
                  ) : null}
                  <form action={requestAgreementReviewAppealAction} className="compact-form">
                    <input name="review_case_id" type="hidden" value={reviewCase.id} />
                    <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                    <label className="field">
                      <span>Challenge or appeal reason</span>
                      <textarea name="appeal_reason" placeholder="What fact, duplicate proof, coercion issue, or conflict should be reviewed?" />
                    </label>
                    <button className="button button-secondary button-mini" type="submit">
                      Request appeal
                    </button>
                  </form>
                </article>
              ))
            ) : null}
          </div>
          </section>
        ) : (
          <section className="section section-subtle">
            <div className="section-head">
              <p className="eyebrow">Evidence review</p>
              <h2>Current milestone evidence workflow</h2>
              <p>
                This agreement record does not use the retired agreement-room evidence console.
                Its terms, events, payments, and performance-bond evidence remain available here.
              </p>
            </div>
          </section>
        )}

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Payments</p>
            <h2>Payment, reminders, refund review, and disputes</h2>
            <p>
              Payment capture is gated by agreement type. Donation offsets, pledge swaps, and
              compensated moral-action agreements record no-capture authorization stubs until
              lock, confirmation, reservation, atomic-settlement, eligibility, and conditional
              provider gates are non-blocking.
            </p>
          </div>

          <div className="status-banner">
            <strong>{paymentAuthorizationPreview.statusLabel}</strong>
            <p>
              Trade mode: {paymentAuthorizationPreview.tradeMode.replaceAll("_", " ")}. Capture
              policy: {paymentAuthorizationPreview.capturePolicy.replaceAll("_", " ")}.
            </p>
            <div className="mini-list" aria-label="Payment authorization gates">
              {paymentAuthorizationPreview.gates.map((gate) => (
                <span className="source-pill" key={gate.key}>
                  {gate.label}: {gate.status.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">
                {paymentAuthorizationPreview.checkoutCreationAllowed
                  ? "Pay now"
                  : "Authorization stub"}
              </p>
              <h3>
                {paymentAuthorizationPreview.checkoutCreationAllowed
                  ? "Create a Stripe checkout"
                  : "Record no-capture payment authorization"}
              </h3>
              <form action={createAgreementPaymentCheckoutAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <div className="field-grid">
                  <label className="field">
                    <span>Amount</span>
                    <input min="1" name="amount" placeholder="25.00" step="0.01" type="number" />
                  </label>
                  <label className="field">
                    <span>Currency</span>
                    <input defaultValue="usd" name="currency" />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Cadence label</span>
                    <select defaultValue="one_time" name="cadence_unit">
                      <option value="one_time">One-time</option>
                      <option value="day">Daily</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="custom_days">Custom day range</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Every</span>
                    <input defaultValue={1} min={1} name="cadence_value" type="number" />
                  </label>
                </div>
                <label className="field">
                  <span>Payment note</span>
                  <input name="notes" placeholder="What this payment covers" />
                </label>
                <button className="button button-primary button-mini" type="submit">
                  {paymentAuthorizationPreview.checkoutCreationAllowed
                    ? "Pay with Stripe"
                    : "Record authorization stub"}
                </button>
              </form>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Recurring reminder</p>
              <h3>Record a negotiated cadence</h3>
              <form action={createAgreementPaymentScheduleAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <div className="field-grid">
                  <label className="field">
                    <span>Amount</span>
                    <input min="1" name="amount" placeholder="25.00" step="0.01" type="number" />
                  </label>
                  <label className="field">
                    <span>Currency</span>
                    <input defaultValue="usd" name="currency" />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Cadence</span>
                    <select defaultValue="month" name="cadence_unit">
                      <option value="day">Daily</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="custom_days">Custom day range</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Every</span>
                    <input defaultValue={1} min={1} name="cadence_value" type="number" />
                  </label>
                </div>
                <label className="field">
                  <span>First due date</span>
                  <input name="next_due_at" type="date" />
                </label>
                <label className="field">
                  <span>Schedule note</span>
                  <input name="notes" placeholder="Monthly stipend, 40-day trial, annual pledge, etc." />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Create reminder schedule
                </button>
              </form>
            </article>
          </div>

          <div className="data-grid">
            {agreement.payments.length ? (
              agreement.payments.map((payment) => (
                <article className="panel data-card" key={payment.id}>
                  <p className="detail-kicker">Payment record</p>
                  <h3>{formatPaymentAmount(payment.amount_cents, payment.currency)}</h3>
                  <div className="tag-row">
                    <span className="badge">{payment.status.replace("_", " ")}</span>
                    <span className="source-pill">
                      {formatCadence(payment.cadence_interval_value, payment.cadence_interval_unit)}
                    </span>
                    <span className="source-pill">
                      Auth {payment.authorization_status.replaceAll("_", " ")}
                    </span>
                    <span className="source-pill">
                      {payment.capture_policy.replaceAll("_", " ")}
                    </span>
                    {payment.paid_at ? (
                      <span className="source-pill">
                        Paid <LocalDateTime value={payment.paid_at} fallback="Date unavailable" dateOnly />
                      </span>
                    ) : null}
                  </div>
                  <p className="route-text">{payment.notes || "No payment note."}</p>
                  <form action={requestPaymentReviewAction} className="stack-form compact-form">
                    <input name="payment_id" type="hidden" value={payment.id} />
                    <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                    <label className="field">
                      <span>Payment review</span>
                      <select defaultValue="refund" name="request_type">
                        <option value="refund">Request refund review</option>
                        <option value="dispute">Open dispute</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Reason</span>
                      <textarea name="details" placeholder="Explain the refund or dispute request." />
                    </label>
                    <button className="button button-secondary button-mini" type="submit">
                      Record review request
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No payment records yet.</strong>
                  <p>Create a checkout when a payment is due under this agreement.</p>
                </div>
              </div>
            )}

            {agreement.paymentSchedules.length ? (
              agreement.paymentSchedules.map((schedule) => (
                <article className="panel data-card" key={schedule.id}>
                  <p className="detail-kicker">Reminder schedule</p>
                  <h3>{formatPaymentAmount(schedule.amount_cents, schedule.currency)}</h3>
                  <div className="tag-row">
                    <span className="badge">{schedule.status}</span>
                    <span className="source-pill">
                      {formatCadence(schedule.cadence_interval_value, schedule.cadence_interval_unit)}
                    </span>
                    <span className="source-pill">
                      Next due{" "}
                      <LocalDateTime value={schedule.next_due_at} fallback="Date unavailable" dateOnly />
                    </span>
                  </div>
                </article>
              ))
            ) : null}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Lifecycle</p>
            <h2>Counterproposals, evidence, cancellation, and rating</h2>
            <p>Every material change should be recorded as an event.</p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Record update</p>
              <h3>Add an agreement event</h3>
              <form action={addAgreementEventAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <label className="field">
                  <span>Event type</span>
                  <select defaultValue="verification_submitted" name="event_type">
                    <option value="note">Note</option>
                    <option value="counterproposal">Counterproposal</option>
                    <option value="verification_submitted">Verification evidence</option>
                    <option value="cancellation_requested">Cancellation request</option>
                    <option value="dispute_opened">Dispute opened</option>
                  </select>
                </label>
                <label className="field">
                  <span>Summary</span>
                  <input name="summary" placeholder="Short event summary" />
                </label>
                <label className="field">
                  <span>Details</span>
                  <textarea name="details" placeholder="Evidence, counterproposal terms, or dispute details" />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Record update
                </button>
              </form>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Status and rating</p>
              <h3>Close the loop</h3>
              <div className="form-actions">
                <form action={updateAgreementStatusAction}>
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                  <input name="status" type="hidden" value="completed" />
                  <input name="summary" type="hidden" value="Agreement marked completed by one party." />
                  <button className="button button-secondary button-mini" type="submit">
                    Mark complete
                  </button>
                </form>
                <form action={updateAgreementStatusAction}>
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                  <input name="status" type="hidden" value="cancelled" />
                  <input name="summary" type="hidden" value="Agreement cancellation recorded by one party." />
                  <button className="button button-secondary button-mini" type="submit">
                    Cancel
                  </button>
                </form>
              </div>
              {agreement.counterparty ? (
                <form action={rateAgreementAction} className="stack-form compact-form">
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input name="rated_user_id" type="hidden" value={agreement.counterparty.id} />
                  <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                  <label className="field">
                    <span>Rate this transaction (1-10)</span>
                    <input
                      defaultValue={agreement.viewerRating?.score ?? 8}
                      max={10}
                      min={1}
                      name="score"
                      type="number"
                    />
                  </label>
                  <button className="button button-secondary button-mini" type="submit">
                    {agreement.viewerRating ? "Update rating" : "Submit rating"}
                  </button>
                </form>
              ) : null}
            </article>
          </div>

          <div className="data-grid">
            {agreement.events.length ? (
              agreement.events.map((event) => (
                <article className="panel data-card" key={event.id}>
                  <p className="detail-kicker">{event.event_type.replaceAll("_", " ")}</p>
                  <h3>{event.summary}</h3>
                  <p className="route-text">{event.details || "No additional detail."}</p>
                  <span className="source-pill">
                    <LocalDateTime value={event.created_at} fallback="Date unavailable" />
                  </span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No events yet.</strong>
                  <p>Record evidence, counterproposals, and status changes as the agreement moves.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
