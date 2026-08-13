import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  acceptDirectDonationUpgradeProposalAction,
  cancelDirectDonationUpgradeOfferAction,
  joinDirectDonationUpgradeOfferAction,
  proposeDirectDonationUpgradeTermsAction,
  rejectDirectDonationUpgradeProposalAction,
  startDirectDonationUpgradeCheckoutAction,
  withdrawDirectDonationUpgradeBackupAction,
  withdrawDirectDonationUpgradeProposalAction,
} from "@/app/direct-donation-upgrade-actions";
import { DirectUpgradeProposalFields } from "@/components/donation-upgrades/direct-upgrade-amount-fields";
import { DirectUpgradeLocalDateTime } from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  PageHero,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
  type DirectDonationUpgradeCandidateRow,
} from "@/lib/direct-donation-upgrade";
import {
  directDonationUpgradeCounterofferWindowOpen,
  directDonationUpgradeJoinWindowOpen,
  type DirectDonationUpgradeProposalRow,
  type PartialDirectDonationUpgradeObligationRow,
  type PartialDirectDonationUpgradeOfferRow,
} from "@/lib/direct-donation-upgrade-negotiation";
import {
  describeDirectDonationUpgradeRetainedLeg,
  formatDirectDonationUpgradeRedirectPercentage,
} from "@/lib/direct-donation-upgrade-split";
import { loadDirectDonationUpgradePrivateDetail } from "@/lib/direct-donation-upgrade-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrade",
  robots: { index: true, follow: true },
};

interface PageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

async function loadRenderClockMs() {
  return Date.now();
}

function profileName(candidate: Record<string, unknown>) {
  const profile = candidate.profile;
  if (Array.isArray(profile)) {
    return String((profile[0] as any)?.display_name ?? "Participant");
  }
  return String((profile as any)?.display_name ?? "Participant");
}

function proposalProfileName(proposal: DirectDonationUpgradeProposalRow) {
  if (Array.isArray(proposal.profile)) {
    return String(proposal.profile[0]?.display_name ?? "Counterparty");
  }
  return String(proposal.profile?.display_name ?? "Counterparty");
}

export default async function DonationUpgradeDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ offerId }, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const config = getDirectDonationUpgradeConfig();
  if (!config.environment) notFound();
  const detail = await loadDirectDonationUpgradePrivateDetail({
    offerId,
    viewerId: viewer?.authUser.id ?? null,
    environment: config.environment,
  });
  const publicOffer = detail.publicOffer;
  if (!publicOffer && !detail.offer) notFound();
  const displayOffer = (detail.offer ??
    publicOffer!) as PartialDirectDonationUpgradeOfferRow;
  const renderClockMs = await loadRenderClockMs();
  const counterofferWindowOpen =
    directDonationUpgradeCounterofferWindowOpen(displayOffer, renderClockMs);
  const joinWindowOpen = directDonationUpgradeJoinWindowOpen(
    displayOffer,
    renderClockMs,
  );
  const matchingDeadlinePassed =
    displayOffer.status === "open" && !counterofferWindowOpen;
  const backupWindowClosed =
    displayOffer.status === "matched" && !joinWindowOpen;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewerId = viewer?.authUser.id ?? null;
  const candidates = detail.candidates as Array<
    DirectDonationUpgradeCandidateRow & Record<string, unknown>
  >;
  const proposals = detail.proposals as DirectDonationUpgradeProposalRow[];
  const viewerCandidate = candidates.find(
    (candidate) => String(candidate.profile_id) === viewerId,
  );
  const viewerObligations = (
    detail.obligations as PartialDirectDonationUpgradeObligationRow[]
  ).filter(
    (obligation) => obligation.participant_profile_id === viewerId,
  );
  const isCreator = Boolean(
    detail.offer && viewerId === detail.offer.creator_profile_id,
  );
  const canJoin = Boolean(
    viewer &&
      !isCreator &&
      !viewerCandidate &&
      joinWindowOpen,
  );
  const canPropose = Boolean(
    viewer &&
      !isCreator &&
      !viewerCandidate &&
      counterofferWindowOpen,
  );
  const pendingViewerProposal = proposals.find(
    (proposal) =>
      proposal.proposer_profile_id === viewerId && proposal.status === "pending",
  );
  const pendingCreatorProposals = isCreator
    ? proposals.filter((proposal) => proposal.status === "pending")
    : [];
  const retainedBranchDescription = describeDirectDonationUpgradeRetainedLeg(
    displayOffer.retained_amount_cents,
    displayOffer.original_recipient.name,
  );

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs
          items={[
            { href: "/donation-upgrades", label: "Donation Upgrades" },
            {
              href: `/donation-upgrades/${offerId}`,
              label: "Exact commitment",
            },
          ]}
        />
        <PageHero
          eyebrow={`Donation Upgrade · ${statusLabel(displayOffer.status)}`}
          title={`Redirect ${formatDirectDonationUpgradeUsd(
            displayOffer.redirected_amount_cents,
          )} and add ${formatDirectDonationUpgradeUsd(
            displayOffer.matcher_amount_cents,
          )} for ${displayOffer.upgraded_recipient.name}`}
          description={`Without a match, the creator commits ${formatDirectDonationUpgradeUsd(
            displayOffer.creator_amount_cents,
          )} to ${displayOffer.original_recipient.name}. With a match, ${retainedBranchDescription}; ${formatDirectDonationUpgradeUsd(
            displayOffer.redirected_amount_cents,
          )} moves to ${displayOffer.upgraded_recipient.name}, and the matcher adds ${formatDirectDonationUpgradeUsd(
            displayOffer.matcher_amount_cents,
          )}.`}
          actions={
            <>
              <Link
                className="button button-secondary"
                href="/donation-upgrades"
              >
                Back to directory
              </Link>
              <Link
                className="button button-secondary"
                href="/trades/new?structure=conditional-donation&rail=direct"
              >
                Create another
              </Link>
            </>
          }
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : ""
            }`}
            role="status"
          >
            {formMessage.text}
          </div>
        ) : null}
        {!config.readyForCommitments ? (
          <div
            className="status-banner status-banner-error"
            role="status"
          >
            {config.blockers[0] ??
              "The direct donation rail is unavailable."}
          </div>
        ) : null}

        <section
          className="section section-white"
          aria-labelledby="frozen-terms-heading"
        >
          <SectionHeader
            eyebrow="Frozen terms"
            id="frozen-terms-heading"
            title="This revision cannot be silently rewritten."
          >
            The percentage, exact cent amounts, recipients, deadline, and
            baseline are frozen. Negotiation happens through explicit
            counteroffers; accepting one cancels this open revision and creates
            a new immutable matched revision.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>If nobody matches</h3>
              <p>
                The creator donates{" "}
                {formatDirectDonationUpgradeUsd(
                  displayOffer.creator_amount_cents,
                )}{" "}
                directly to {displayOffer.original_recipient.name}.
              </p>
              <a
                href={displayOffer.original_recipient.profileUrl}
                rel="noreferrer"
                target="_blank"
              >
                Verify Every.org recipient
              </a>
            </article>
            <article className="panel concept-card">
              <h3>If someone matches</h3>
              <p>
                For the creator, {retainedBranchDescription}. The creator
                redirects{" "}
                {formatDirectDonationUpgradeUsd(
                  displayOffer.redirected_amount_cents,
                )}{" "}
                to {displayOffer.upgraded_recipient.name}. The matcher adds{" "}
                {formatDirectDonationUpgradeUsd(
                  displayOffer.matcher_amount_cents,
                )}{" "}
                to the upgraded recipient.
              </p>
              <a
                href={displayOffer.upgraded_recipient.profileUrl}
                rel="noreferrer"
                target="_blank"
              >
                Verify upgraded Every.org recipient
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Timing and visibility</h3>
              <p>
                Match by{" "}
                <DirectUpgradeLocalDateTime
                  value={displayOffer.match_deadline_at}
                />
                .
              </p>
              <p>
                Redirect share:{" "}
                {formatDirectDonationUpgradeRedirectPercentage(
                  displayOffer.redirect_basis_points,
                )}
                .
              </p>
              <p>
                Identities:{" "}
                {displayOffer.privacy_mode === "public"
                  ? "public"
                  : "hidden until successful completion"}
                .
              </p>
            </article>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Terms hash</dt>
              <dd>{String(displayOffer.terms_hash).slice(0, 24)}…</dd>
            </div>
            <div>
              <dt>Branch</dt>
              <dd>
                {statusLabel(displayOffer.selected_branch ?? "not selected")}
              </dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>
                {publicOffer?.creator_display_name ??
                  (isCreator ? viewer?.displayName : "Hidden")}
              </dd>
            </div>
            <div>
              <dt>Matcher</dt>
              <dd>{publicOffer?.matcher_display_name ?? "None or hidden"}</dd>
            </div>
            <div>
              <dt>Counteroffers</dt>
              <dd>{isCreator ? proposals.length : 0}</dd>
            </div>
            <div>
              <dt>Revision history</dt>
              <dd>
                {displayOffer.supersedes_offer_id ? (
                  <Link
                    href={`/donation-upgrades/${displayOffer.supersedes_offer_id}`}
                  >
                    Replaces an earlier revision
                  </Link>
                ) : (
                  "Original revision"
                )}
                {displayOffer.supersedes_offer_id &&
                displayOffer.superseded_by_offer_id ? (
                  <> · </>
                ) : null}
                {displayOffer.superseded_by_offer_id ? (
                  <Link
                    href={`/donation-upgrades/${displayOffer.superseded_by_offer_id}`}
                  >
                    Replaced by accepted terms
                  </Link>
                ) : null}
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="section section-subtle"
          aria-labelledby="join-upgrade-heading"
        >
          <SectionHeader
            eyebrow="Matching and negotiation"
            id="join-upgrade-heading"
            title="Accept the current terms or send a binding counteroffer."
          >
            Accepting current terms selects the primary matcher while this
            offer is open; later accepters join as backups. A counteroffer is
            not a chat message: submitting it records a binding advance
            commitment to the exact proposed percentage and matcher amount,
            conditional on the creator accepting it before the deadline.
          </SectionHeader>
          <div className="panel form-stack">
            {matchingDeadlinePassed ? (
              <p className="field-note" role="status">
                The matching deadline has passed. This offer is awaiting its
                lifecycle update and cannot be accepted or negotiated.
              </p>
            ) : null}
            {backupWindowClosed ? (
              <p className="field-note" role="status">
                The backup-matcher window has closed.
              </p>
            ) : null}
            {isCreator && displayOffer.status === "open" ? (
              <form action={cancelDirectDonationUpgradeOfferAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <button
                  className="button button-secondary"
                  type="submit"
                >
                  Cancel unmatched offer
                </button>
              </form>
            ) : null}
            {viewerCandidate?.status === "backup" ? (
              <form action={withdrawDirectDonationUpgradeBackupAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <button
                  className="button button-secondary"
                  type="submit"
                >
                  Withdraw backup commitment
                </button>
              </form>
            ) : null}
            {viewerCandidate ? (
              <p className="field-note">
                Your matcher status: {statusLabel(viewerCandidate.status)}.
              </p>
            ) : null}

            {canJoin ? (
              <form
                action={joinDirectDonationUpgradeOfferAction}
                className="form-stack"
              >
                <h3>Accept the published terms</h3>
                <input name="offer_id" type="hidden" value={offerId} />
                <label className="check-row">
                  <input
                    name="matcher_commitment"
                    type="checkbox"
                    required
                  />
                  <span>
                    If selected, I will donate exactly{" "}
                    {formatDirectDonationUpgradeUsd(
                      displayOffer.matcher_amount_cents,
                    )}{" "}
                    directly to {displayOffer.upgraded_recipient.name} within
                    seven days. I accept the frozen{" "}
                    {formatDirectDonationUpgradeRedirectPercentage(
                      displayOffer.redirect_basis_points,
                    )}{" "}
                    creator redirect. Browser returns and screenshots do not
                    count as fulfillment.
                  </span>
                </label>
                <button className="button button-primary" type="submit">
                  {displayOffer.status === "open"
                    ? "Accept current terms"
                    : "Join as backup"}
                </button>
              </form>
            ) : !viewer && joinWindowOpen ? (
              <Link
                className="button button-primary"
                href={`/login?returnTo=${encodeURIComponent(
                  `/donation-upgrades/${offerId}`,
                )}`}
              >
                Sign in to match or negotiate
              </Link>
            ) : null}

            {canPropose && !pendingViewerProposal ? (
              <form
                action={proposeDirectDonationUpgradeTermsAction}
                className="form-stack"
              >
                <h3>Propose different terms</h3>
                <input name="offer_id" type="hidden" value={offerId} />
                <DirectUpgradeProposalFields
                  creatorAmountCents={displayOffer.creator_amount_cents}
                  defaultRedirectBasisPoints={
                    displayOffer.redirect_basis_points
                  }
                  defaultMatcherAmountCents={
                    displayOffer.matcher_amount_cents
                  }
                />
                <label>
                  Note to the creator (optional)
                  <textarea
                    name="proposal_message"
                    rows={3}
                    maxLength={600}
                    placeholder="Explain the trade-off you are proposing."
                  />
                </label>
                <label className="check-row">
                  <input
                    name="proposal_commitment"
                    type="checkbox"
                    required
                  />
                  <span>
                    If the creator accepts these exact terms, I commit to the
                    proposed matcher donation within seven days. Acceptance
                    will create a new matched revision without another
                    confirmation step.
                  </span>
                </label>
                <button className="button button-secondary" type="submit">
                  Send counteroffer
                </button>
              </form>
            ) : null}
            {pendingViewerProposal ? (
              <p className="field-note">
                {counterofferWindowOpen
                  ? "You already have a pending counteroffer. Withdraw it before submitting revised terms. If you accept the published terms instead, this pending counteroffer will be superseded."
                  : "Your pending counteroffer remains in the audit trail. You may withdraw it while this offer awaits its lifecycle update."}
              </p>
            ) : null}
            {!canJoin &&
            viewer &&
            !detail.isParticipant &&
            !matchingDeadlinePassed &&
            !backupWindowClosed ? (
              <p className="field-note">
                This commitment is no longer accepting matchers or
                counteroffers.
              </p>
            ) : null}
          </div>
        </section>

        {isCreator && proposals.length ? (
          <section
            className="section section-white"
            aria-labelledby="creator-proposals-heading"
          >
            <SectionHeader
              eyebrow="Counteroffers"
              id="creator-proposals-heading"
              title="Review exact alternative splits."
            >
              Accepting a pending counteroffer immediately creates the new
              matched revision, links both revisions, preserves the proposer’s
              commitment record, supersedes every other pending proposal, and
              creates the exact direct donation obligations atomically.
              Rejecting it may include a short response so the proposer can
              revise.
            </SectionHeader>
            <div className="data-grid">
              {proposals.map((proposal) => (
                <article className="panel data-card" key={proposal.id}>
                  <p className="detail-kicker">
                    {statusLabel(proposal.status)} ·{" "}
                    {proposalProfileName(proposal)}
                  </p>
                  <h3>
                    {formatDirectDonationUpgradeRedirectPercentage(
                      proposal.proposed_redirect_basis_points,
                    )}{" "}
                    redirect; matcher adds{" "}
                    {formatDirectDonationUpgradeUsd(
                      proposal.proposed_matcher_amount_cents,
                    )}
                  </h3>
                  <p>
                    {describeDirectDonationUpgradeRetainedLeg(
                      proposal.proposed_retained_amount_cents,
                      displayOffer.original_recipient.name,
                    )};{" "}
                    {formatDirectDonationUpgradeUsd(
                      proposal.proposed_redirected_amount_cents,
                    )}{" "}
                    moves to {displayOffer.upgraded_recipient.name}.
                  </p>
                  {proposal.message ? <p>{proposal.message}</p> : null}
                  {proposal.response_message ? (
                    <p className="field-note">
                      Creator response: {proposal.response_message}
                    </p>
                  ) : null}
                  <dl className="detail-grid">
                    <div>
                      <dt>Commitment version</dt>
                      <dd>{proposal.commitment_version}</dd>
                    </div>
                    <div>
                      <dt>Committed at</dt>
                      <dd>
                        <DirectUpgradeLocalDateTime
                          value={proposal.commitment_accepted_at}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt>Base terms hash</dt>
                      <dd>{proposal.base_terms_hash.slice(0, 24)}…</dd>
                    </div>
                  </dl>
                  {proposal.accepted_offer_id ? (
                    <Link
                      className="button button-secondary"
                      href={`/donation-upgrades/${proposal.accepted_offer_id}`}
                    >
                      View accepted revision
                    </Link>
                  ) : null}
                  {proposal.status === "pending" &&
                  displayOffer.status === "open" ? (
                    <div className="form-stack">
                      {counterofferWindowOpen ? (
                        <form
                          action={acceptDirectDonationUpgradeProposalAction}
                        >
                          <input
                            name="offer_id"
                            type="hidden"
                            value={offerId}
                          />
                          <input
                            name="proposal_id"
                            type="hidden"
                            value={proposal.id}
                          />
                          <button
                            className="button button-primary"
                            type="submit"
                          >
                            Accept and create matched revision
                          </button>
                          <p className="field-note">
                            This atomically cancels this revision as superseded,
                            creates and links one matched revision, installs the
                            proposer as primary, and creates every required leg.
                          </p>
                        </form>
                      ) : (
                        <p className="field-note">
                          This counteroffer cannot be accepted after the matching
                          deadline. It remains visible in the audit trail.
                        </p>
                      )}
                      <form
                        action={rejectDirectDonationUpgradeProposalAction}
                        className="form-stack"
                      >
                        <input
                          name="offer_id"
                          type="hidden"
                          value={offerId}
                        />
                        <input
                          name="proposal_id"
                          type="hidden"
                          value={proposal.id}
                        />
                        <label>
                          Response (optional)
                          <textarea
                            name="response_message"
                            rows={2}
                            maxLength={600}
                            placeholder="For example: I would accept a 50% redirect if you add $15."
                          />
                        </label>
                        <button
                          className="button button-secondary"
                          type="submit"
                        >
                          Reject counteroffer
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            {!pendingCreatorProposals.length ? (
              <p className="field-note">No counteroffer is currently pending.</p>
            ) : null}
          </section>
        ) : null}

        {!isCreator && proposals.length ? (
          <section
            className="section section-white"
            aria-labelledby="viewer-proposals-heading"
          >
            <SectionHeader
              eyebrow="Your counteroffers"
              id="viewer-proposals-heading"
              title="Negotiation history remains auditable."
            />
            <div className="data-grid">
              {proposals.map((proposal) => (
                <article className="panel data-card" key={proposal.id}>
                  <p className="detail-kicker">
                    {statusLabel(proposal.status)}
                  </p>
                  <h3>
                    {formatDirectDonationUpgradeRedirectPercentage(
                      proposal.proposed_redirect_basis_points,
                    )}{" "}
                    redirect; you add{" "}
                    {formatDirectDonationUpgradeUsd(
                      proposal.proposed_matcher_amount_cents,
                    )}
                  </h3>
                  {proposal.message ? <p>{proposal.message}</p> : null}
                  {proposal.response_message ? (
                    <p className="field-note">
                      Creator response: {proposal.response_message}
                    </p>
                  ) : null}
                  <p className="field-note">
                    Commitment recorded{" "}
                    <DirectUpgradeLocalDateTime
                      value={proposal.commitment_accepted_at}
                    />{" "}
                    under {proposal.commitment_version}; base terms{" "}
                    {proposal.base_terms_hash.slice(0, 16)}…
                  </p>
                  {proposal.accepted_offer_id ? (
                    <Link
                      className="button button-primary"
                      href={`/donation-upgrades/${proposal.accepted_offer_id}`}
                    >
                      Open matched revision
                    </Link>
                  ) : null}
                  {proposal.status === "pending" ? (
                    <form
                      action={withdrawDirectDonationUpgradeProposalAction}
                    >
                      <input
                        name="offer_id"
                        type="hidden"
                        value={offerId}
                      />
                      <input
                        name="proposal_id"
                        type="hidden"
                        value={proposal.id}
                      />
                      <button
                        className="button button-secondary"
                        type="submit"
                      >
                        Withdraw counteroffer
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {detail.isParticipant ? (
          <section
            className="section section-white"
            aria-labelledby="participant-record-heading"
          >
            <SectionHeader
              eyebrow="Participant record"
              id="participant-record-heading"
              title="Private obligations and fulfillment states."
            >
              This section is visible only to the creator, selected matcher,
              and backup matchers. A proposal alone does not reveal private
              participant records.
            </SectionHeader>
            <div className="data-grid">
              {viewerObligations.map((obligation) => (
                <article className="panel data-card" key={obligation.id}>
                  <p className="detail-kicker">
                    {statusLabel(obligation.obligation_kind)} ·{" "}
                    {statusLabel(obligation.status)}
                  </p>
                  <h3>
                    {formatDirectDonationUpgradeUsd(
                      obligation.expected_amount_cents,
                    )}{" "}
                    to {obligation.expected_recipient.name}
                  </h3>
                  <p>
                    Due <DirectUpgradeLocalDateTime value={obligation.due_at} />
                  </p>
                  {obligation.status === "verified" ? (
                    <dl className="detail-grid">
                      <div>
                        <dt>Verified gross</dt>
                        <dd>
                          {formatDirectDonationUpgradeUsd(
                            obligation.provider_gross_amount_cents ?? 0,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Verified net</dt>
                        <dd>
                          {formatDirectDonationUpgradeUsd(
                            obligation.provider_net_amount_cents ?? 0,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Provider date</dt>
                        <dd>
                          {obligation.provider_donation_date ? (
                            <DirectUpgradeLocalDateTime
                              value={obligation.provider_donation_date}
                            />
                          ) : (
                            "Unavailable"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Payment method</dt>
                        <dd>
                          {obligation.provider_payment_method || "Not recorded"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                  {["pending", "checkout_started"].includes(
                    obligation.status,
                  ) ? (
                    <form action={startDirectDonationUpgradeCheckoutAction}>
                      <input
                        name="offer_id"
                        type="hidden"
                        value={offerId}
                      />
                      <input
                        name="obligation_id"
                        type="hidden"
                        value={obligation.id}
                      />
                      <button
                        className="button button-primary"
                        type="submit"
                        disabled={!config.readyForCheckout}
                      >
                        Donate directly through Every.org
                      </button>
                    </form>
                  ) : null}
                  {obligation.failure_message ? (
                    <p className="field-note">
                      {obligation.failure_message}
                    </p>
                  ) : null}
                </article>
              ))}
              {!viewerObligations.length ? (
                <article className="panel data-card">
                  <h3>No direct donation is currently due from you</h3>
                  <p>
                    Your record remains{" "}
                    {statusLabel(
                      viewerCandidate?.status ??
                        pendingViewerProposal?.status ??
                        displayOffer.status,
                    )}
                    .
                  </p>
                </article>
              ) : null}
            </div>

            <div className="data-grid">
              {candidates.map((candidate) => (
                <article className="panel data-card" key={candidate.id}>
                  <p className="detail-kicker">
                    Matcher rank {candidate.rank}
                  </p>
                  <h3>{profileName(candidate)}</h3>
                  <p>{statusLabel(candidate.status)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section
          className="section section-subtle"
          aria-labelledby="verified-impact-heading"
        >
          <SectionHeader
            eyebrow="Verified impact"
            id="verified-impact-heading"
            title="Gross, net, incremental, redirected, and retained value stay separate."
          />
          <div className="pilot-metric-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Verified obligations</p>
              <h2>{publicOffer?.verified_obligation_count ?? 0}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Verified gross</p>
              <h2>
                {formatDirectDonationUpgradeUsd(
                  publicOffer?.verified_gross_amount_cents ?? 0,
                )}
              </h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Verified net</p>
              <h2>
                {formatDirectDonationUpgradeUsd(
                  publicOffer?.verified_net_amount_cents ?? 0,
                )}
              </h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Incremental net</p>
              <h2>
                {formatDirectDonationUpgradeUsd(
                  publicOffer?.incremental_net_amount_cents ?? 0,
                )}
              </h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Redirected net</p>
              <h2>
                {formatDirectDonationUpgradeUsd(
                  publicOffer?.redirected_net_amount_cents ?? 0,
                )}
              </h2>
            </article>
          </div>
          <p className="field-note">
            The creator’s full original amount is baseline, not incremental.
            Only the verified creator leg that moves to the upgraded recipient
            is counted as redirected. The retained original-recipient leg
            remains verified gross and net but receives neither incremental nor
            redirected impact credit. The matcher’s verified net amount is
            incremental.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
