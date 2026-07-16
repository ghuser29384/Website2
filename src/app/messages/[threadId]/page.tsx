import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  blockTradeThreadAction,
  createCounterproposalAction,
  decideCounterproposalAction,
  reportTradeThreadAction,
  sendTradeMessageAction,
  withdrawTradeResponseAction,
} from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getThreadForUser } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private trade thread",
  robots: { index: false, follow: false },
};

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString();
}

function changed(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").trim() !== String(right ?? "").trim();
}

export default async function ThreadPage({ params, searchParams }: ThreadPageProps) {
  const [{ threadId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/messages/${threadId}`);
  const detail = await getThreadForUser(threadId, viewer.authUser.id);
  if (!detail) notFound();
  const formMessage = getFormMessage(resolvedSearchParams);
  const { offer, latestProposal } = detail;
  const current = latestProposal ?? {
    proposed_action: offer.offer_action,
    requested_action: offer.request_action,
    duration: offer.duration,
    start_date: offer.start_date,
    evidence_rule: offer.verification,
    evidence_due_date: offer.evidence_due_date,
    exit_conditions: offer.exit_conditions,
    maximum_burden: offer.maximum_burden,
    privacy_scope: offer.privacy_scope,
    no_trade_baseline: offer.no_trade_baseline,
  };
  const proposalFromViewer = latestProposal?.proposer_id === viewer.authUser.id;

  const diffs = [
    ["Your/offer-maker action", offer.offer_action, current.proposed_action],
    ["Counterparty action", offer.request_action, current.requested_action],
    ["Duration", offer.duration, current.duration],
    ["Start date", offer.start_date, current.start_date],
    ["Evidence rule", offer.verification, current.evidence_rule],
    ["Evidence due date", offer.evidence_due_date, current.evidence_due_date],
    ["Exit conditions", offer.exit_conditions, current.exit_conditions],
    ["Maximum burden", offer.maximum_burden, current.maximum_burden],
    ["Privacy scope", offer.privacy_scope, current.privacy_scope],
    ["No-trade baseline", offer.no_trade_baseline, current.no_trade_baseline],
  ] as const;

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
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

        <section className="section section-white" aria-labelledby="thread-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private counterparty thread</p>
            <h1 id="thread-heading">
              {offer.offered_cause} ↔ {offer.requested_cause}
            </h1>
            <p>
              With {detail.counterpart?.display_name ?? "counterparty"}. This thread is private;
              public comments and profile pages do not expose its messages or terms history.
            </p>
          </div>

          {detail.agreementId ? (
            <div className="status-banner status-banner-success">
              <strong>Agreement record exists</strong>
              <p>Negotiated terms moved into an immutable bilateral agreement version.</p>
              <Link className="button button-primary button-mini" href={`/trade-agreements/${detail.agreementId}`}>
                Open agreement
              </Link>
            </div>
          ) : null}

          <div className="detail-grid detail-grid-wide">
            <article className="panel detail-block">
              <p className="detail-kicker">Conversation</p>
              <h2>{detail.messages.length} message{detail.messages.length === 1 ? "" : "s"}</h2>
              <div className="mini-list">
                {detail.messages.length ? (
                  detail.messages.map((message) => {
                    const senderId = message.sender_id ? String(message.sender_id) : null;
                    const senderLabel =
                      message.message_type === "system"
                        ? "System"
                        : senderId === viewer.authUser.id
                          ? "You"
                          : detail.counterpart?.display_name ?? "Counterparty";
                    return (
                      <div className="panel subtle-panel" key={message.id}>
                        <div className="tag-row">
                          <span className="badge">{senderLabel}</span>
                          <span className="source-pill">{formatDate(String(message.created_at))}</span>
                        </div>
                        <p className="route-text">{message.body}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="route-text">No messages yet.</p>
                )}
              </div>

              {!detail.blocked ? (
                <form action={sendTradeMessageAction} className="stack-form">
                  <input name="thread_id" type="hidden" value={threadId} />
                  <label className="field">
                    <span>Message</span>
                    <textarea
                      name="body"
                      placeholder="Ask a question, explain a constraint, or state why a term should change"
                      required
                      rows={4}
                    />
                  </label>
                  <PendingSubmitButton pendingLabel="Sending...">Send private message</PendingSubmitButton>
                </form>
              ) : (
                <div className="status-banner status-banner-error">
                  <strong>Thread blocked</strong>
                  <p>No further private messages or counterproposals can be sent.</p>
                </div>
              )}
            </article>

            <aside className="panel detail-block">
              <p className="detail-kicker">Current negotiable version</p>
              <h2>
                {latestProposal ? `Counterproposal v${latestProposal.version}` : "Published offer terms"}
              </h2>
              {latestProposal ? (
                <div className="tag-row">
                  <span className="badge">{latestProposal.status}</span>
                  <span className="source-pill">
                    Proposed by {proposalFromViewer ? "you" : detail.counterpart?.display_name ?? "counterparty"}
                  </span>
                </div>
              ) : null}
              <dl className="detail-grid">
                <div>
                  <dt>Action A</dt>
                  <dd>{current.proposed_action}</dd>
                </div>
                <div>
                  <dt>Action B</dt>
                  <dd>{current.requested_action}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{current.duration}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{current.evidence_rule}</dd>
                </div>
                <div>
                  <dt>Maximum burden</dt>
                  <dd>{current.maximum_burden}</dd>
                </div>
                <div>
                  <dt>Exit</dt>
                  <dd>{current.exit_conditions}</dd>
                </div>
              </dl>

              {latestProposal ? (
                <div className="clean-stack">
                  <h3>Changes from the published offer</h3>
                  {diffs.filter(([, before, after]) => changed(before, after)).length ? (
                    diffs
                      .filter(([, before, after]) => changed(before, after))
                      .map(([label, before, after]) => (
                        <div className="status-banner" key={label}>
                          <strong>{label}</strong>
                          <p>
                            <span className="source-pill">Before: {before || "Not set"}</span>
                          </p>
                          <p>
                            <span className="source-pill">Proposed: {after || "Not set"}</span>
                          </p>
                        </div>
                      ))
                  ) : (
                    <p className="route-text">No changes; this response adopts the published terms.</p>
                  )}
                </div>
              ) : null}

              {latestProposal?.status === "proposed" && !proposalFromViewer && !detail.agreementId ? (
                <div className="form-actions">
                  <form action={decideCounterproposalAction}>
                    <input name="thread_id" type="hidden" value={threadId} />
                    <input name="proposal_id" type="hidden" value={latestProposal.id} />
                    <input name="decision" type="hidden" value="accept" />
                    <PendingSubmitButton
                      className="button button-primary button-mini"
                      pendingLabel="Freezing terms..."
                    >
                      Accept and create agreement
                    </PendingSubmitButton>
                  </form>
                  <form action={decideCounterproposalAction}>
                    <input name="thread_id" type="hidden" value={threadId} />
                    <input name="proposal_id" type="hidden" value={latestProposal.id} />
                    <input name="decision" type="hidden" value="reject" />
                    <PendingSubmitButton
                      className="button button-secondary button-mini"
                      pendingLabel="Rejecting..."
                    >
                      Reject
                    </PendingSubmitButton>
                  </form>
                </div>
              ) : latestProposal?.status === "proposed" && proposalFromViewer ? (
                <p className="panel-note">Waiting for the other participant to accept, reject, or counter.</p>
              ) : null}
            </aside>
          </div>
        </section>

        {!detail.agreementId && !detail.blocked ? (
          <section className="section section-subtle" aria-labelledby="counterproposal-heading">
            <div className="section-head section-head-compact">
              <p className="eyebrow">Structured counterproposal</p>
              <h2 id="counterproposal-heading">Change terms without losing the original.</h2>
              <p>
                Each submission creates a new immutable version and shows a before/after diff. A new
                proposal supersedes the previous pending proposal but does not erase history.
              </p>
            </div>

            <form action={createCounterproposalAction} className="panel stack-form">
              <input name="thread_id" type="hidden" value={threadId} />
              <label className="field">
                <span>Action A</span>
                <textarea defaultValue={current.proposed_action} name="proposed_action" required rows={3} />
              </label>
              <label className="field">
                <span>Action B</span>
                <textarea defaultValue={current.requested_action} name="requested_action" required rows={3} />
              </label>
              <label className="field">
                <span>No-trade baseline</span>
                <textarea defaultValue={current.no_trade_baseline} name="no_trade_baseline" required rows={3} />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Duration</span>
                  <input defaultValue={current.duration} name="duration" required />
                </label>
                <label className="field">
                  <span>Start date</span>
                  <input defaultValue={current.start_date ?? ""} name="start_date" type="date" />
                </label>
                <label className="field">
                  <span>Evidence due date</span>
                  <input
                    defaultValue={current.evidence_due_date ?? ""}
                    name="evidence_due_date"
                    type="date"
                  />
                </label>
              </div>
              <label className="field">
                <span>Evidence rule</span>
                <textarea defaultValue={current.evidence_rule} name="evidence_rule" required rows={3} />
              </label>
              <label className="field">
                <span>Maximum burden</span>
                <textarea defaultValue={current.maximum_burden} name="maximum_burden" required rows={3} />
              </label>
              <label className="field">
                <span>Exit conditions</span>
                <textarea defaultValue={current.exit_conditions} name="exit_conditions" required rows={3} />
              </label>
              <label className="field">
                <span>Privacy scope</span>
                <textarea defaultValue={current.privacy_scope} name="privacy_scope" required rows={3} />
              </label>
              <PendingSubmitButton pendingLabel="Sending counterproposal...">
                Send counterproposal
              </PendingSubmitButton>
            </form>
          </section>
        ) : null}

        <section className="section section-white" aria-labelledby="thread-safety-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Safety and recourse</p>
            <h2 id="thread-safety-heading">Block or report without making the conversation public.</h2>
          </div>
          <div className="data-grid">
            {!detail.blocked ? (
              <form action={blockTradeThreadAction} className="panel stack-form">
                <input name="thread_id" type="hidden" value={threadId} />
                <label className="field">
                  <span>Block reason (optional)</span>
                  <textarea name="reason" rows={3} />
                </label>
                <PendingSubmitButton
                  className="button button-secondary"
                  pendingLabel="Blocking..."
                >
                  Block thread
                </PendingSubmitButton>
              </form>
            ) : null}

            <form action={reportTradeThreadAction} className="panel stack-form">
              <input name="thread_id" type="hidden" value={threadId} />
              <label className="field">
                <span>Operator report</span>
                <textarea
                  name="reason"
                  placeholder="Threat, coercion, privacy breach, factual issue, or another safety concern"
                  required
                  rows={4}
                />
              </label>
              <PendingSubmitButton
                className="button button-secondary"
                pendingLabel="Reporting..."
              >
                Report privately
              </PendingSubmitButton>
            </form>

            {detail.interestId && !detail.agreementId ? (
              <form action={withdrawTradeResponseAction} className="panel stack-form">
                <input name="thread_id" type="hidden" value={threadId} />
                <input name="interest_id" type="hidden" value={detail.interestId} />
                <h3>Withdraw before agreement formation</h3>
                <p className="route-text">
                  Withdrawal closes this response and creates no obligation.
                </p>
                <PendingSubmitButton
                  className="button button-secondary"
                  pendingLabel="Withdrawing..."
                >
                  Withdraw response
                </PendingSubmitButton>
              </form>
            ) : null}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
