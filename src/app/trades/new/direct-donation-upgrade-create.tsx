import Link from "next/link";

import {
  cancelDirectDonationUpgradeOfferAction,
  createDirectDonationUpgradeOfferAction,
  joinDirectDonationUpgradeOfferAction,
  startDirectDonationUpgradeCheckoutAction,
  withdrawDirectDonationUpgradeBackupAction,
} from "@/app/direct-donation-upgrade-actions";
import { DirectUpgradeAmountFields } from "@/components/donation-upgrades/direct-upgrade-amount-fields";
import {
  DirectUpgradeDeadlineField,
  DirectUpgradeLocalDateTime,
} from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { EveryOrgNonprofitSelector } from "@/components/donation-upgrades/every-org-nonprofit-selector";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  PageHero,
  SectionHeader,
  StepCard,
} from "@/components/ui/page-primitives";
import { requireViewer } from "@/lib/app-data";
import {
  DIRECT_DONATION_UPGRADE_DEFAULT_MATCH_DAYS,
  DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS,
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
  type DirectDonationUpgradeCandidateRow,
} from "@/lib/direct-donation-upgrade";
import {
  directDonationUpgradeCounterofferWindowOpen,
  directDonationUpgradeJoinWindowOpen,
  type DirectDonationUpgradeProposalRow,
  type PartialDirectDonationUpgradeOfferRow,
} from "@/lib/direct-donation-upgrade-negotiation";
import {
  describeDirectDonationUpgradeRetainedLeg,
  formatDirectDonationUpgradeRedirectPercentage,
} from "@/lib/direct-donation-upgrade-split";
import {
  directDonationUpgradeRenderedQaNoServiceDataEnabled,
  directDonationUpgradeRenderedQaViewerFixture,
  loadDirectDonationUpgradeViewerData,
} from "@/lib/direct-donation-upgrade-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function offerTitle(
  offer: Pick<
    PartialDirectDonationUpgradeOfferRow,
    "redirected_amount_cents" | "matcher_amount_cents" | "upgraded_recipient"
  >,
) {
  return `Redirect ${formatDirectDonationUpgradeUsd(
    offer.redirected_amount_cents,
  )} and add ${formatDirectDonationUpgradeUsd(
    offer.matcher_amount_cents,
  )} for ${offer.upgraded_recipient.name}`;
}

function candidateOfferId(candidate: DirectDonationUpgradeCandidateRow) {
  return String(candidate.offer_id);
}

async function loadRenderClockMs() {
  return Date.now();
}

export async function DirectDonationUpgradeCreate({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const returnTo = "/trades/new?structure=conditional-donation&rail=direct";
  const viewer = await requireViewer(returnTo);
  const config = getDirectDonationUpgradeConfig();
  const renderedQaNoServiceData =
    directDonationUpgradeRenderedQaNoServiceDataEnabled({
      viewerId: viewer.authUser.id,
      environment: config.environment,
    });
  const renderedQaViewerFixture =
    config.environment && renderedQaNoServiceData
      ? directDonationUpgradeRenderedQaViewerFixture({
          viewerId: viewer.authUser.id,
          environment: config.environment,
        })
      : null;
  const pageData =
    config.environment && !renderedQaNoServiceData
      ? await loadDirectDonationUpgradeViewerData({
          viewerId: viewer.authUser.id,
          environment: config.environment,
        })
      : renderedQaViewerFixture ?? {
          publicOffers: [],
          creatorOffers: [],
          viewerCandidates: [],
          viewerObligations: [],
          viewerProposals: [],
        };
  const formMessage = getFormMessage(params);
  const now = await loadRenderClockMs();
  const creatorOfferById = new Map(
    pageData.creatorOffers.map((offer) => [String(offer.id), offer]),
  );
  const viewerCandidateByOfferId = new Map(
    pageData.viewerCandidates.map((candidate) => [
      candidateOfferId(candidate),
      candidate,
    ]),
  );
  const viewerProposalByOfferId = new Map<
    string,
    DirectDonationUpgradeProposalRow
  >();
  for (const proposal of pageData.viewerProposals) {
    const offerId = String(proposal.offer_id);
    if (!viewerProposalByOfferId.has(offerId)) {
      viewerProposalByOfferId.set(offerId, proposal);
    }
  }
  const viewerObligationByOfferId = new Map(
    pageData.viewerObligations.map((obligation) => [
      String(obligation.offer_id),
      obligation,
    ]),
  );
  const activityByOffer = new Map<
    string,
    {
      offer: PartialDirectDonationUpgradeOfferRow | null;
      candidate: DirectDonationUpgradeCandidateRow | null;
      proposal: DirectDonationUpgradeProposalRow | null;
    }
  >();
  for (const offer of pageData.creatorOffers) {
    activityByOffer.set(String(offer.id), {
      offer,
      candidate: null,
      proposal: null,
    });
  }
  for (const candidate of pageData.viewerCandidates) {
    const id = candidateOfferId(candidate);
    if (!activityByOffer.has(id)) {
      activityByOffer.set(id, {
        offer: null,
        candidate,
        proposal: null,
      });
    }
  }
  for (const proposal of pageData.viewerProposals) {
    const id = String(proposal.offer_id);
    const activity = activityByOffer.get(id);
    if (activity) {
      if (!activity.proposal) activity.proposal = proposal;
    }
    else {
      activityByOffer.set(id, {
        offer: null,
        candidate: null,
        proposal,
      });
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
        />
        <Breadcrumbs
          items={[
            { href: "/trades/new", label: "Create" },
            { href: returnTo, label: "Donation Upgrade" },
          ]}
        />
        <PageHero
          eyebrow="Create · Donation Upgrade"
          title="Turn a planned donation into a larger donation to a more effective recipient."
          description="Choose how much of the original donation moves. If someone matches, the retained portion still goes to the original recipient, the redirected portion goes to the upgraded recipient, and the matcher adds a separate donation. Counterparties can accept the published terms or propose a different percentage and matcher amount."
          actions={
            <>
              <Link className="button button-secondary" href="/trades/new">
                Back to Create
              </Link>
              <Link
                className="button button-secondary"
                href="/donation-upgrades"
              >
                Browse Donation Upgrades
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
            <strong>
              Donation Upgrade commitments are temporarily unavailable.
            </strong>{" "}
            {config.blockers[0] ??
              "The direct Every.org rail is not configured."} No payment
            authorization or charge can be created from this page.
          </div>
        ) : null}

        <section
          className="section section-white"
          aria-labelledby="create-upgrade-heading"
        >
          <SectionHeader
            eyebrow="Create"
            id="create-upgrade-heading"
            title="Freeze the original plan and the offered split before publishing."
          >
            The baseline, recipient identities, amount, redirect percentage,
            and requested matcher amount are immutable within a published
            offer. Accepting a counteroffer creates a new immutable revision
            rather than rewriting history.
          </SectionHeader>
          <form
            action={createDirectDonationUpgradeOfferAction}
            className="panel form-stack"
          >
            <DirectUpgradeAmountFields />

            <div className="form-grid">
              <DirectUpgradeDeadlineField
                defaultValueIso={new Date(
                  now +
                    DIRECT_DONATION_UPGRADE_DEFAULT_MATCH_DAYS *
                      24 *
                      60 *
                      60 *
                      1000,
                ).toISOString()}
                maximumIso={new Date(
                  now +
                    DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS *
                      24 *
                      60 *
                      60 *
                      1000,
                ).toISOString()}
                minimumIso={new Date(now + 60 * 60 * 1000).toISOString()}
              />
              <label>
                Identity visibility
                <select name="privacy_mode" defaultValue="public" required>
                  <option value="public">Public from publication</option>
                  <option value="private_until_completed">
                    Hide participant identities until successful completion
                  </option>
                </select>
                <span className="field-note">
                  Private identities remain hidden publicly if the commitment
                  expires or defaults.
                </span>
              </label>
            </div>

            <EveryOrgNonprofitSelector
              inputName="original_recipient_identifier"
              label="Original recipient"
              description="Choose the nonprofit you already planned to support. Any unredirected remainder still goes here."
              placeholder="Search your local charity"
            />
            <EveryOrgNonprofitSelector
              inputName="upgraded_recipient_identifier"
              label="Upgraded recipient"
              description="The redirected portion and the matcher’s added donation go here as separate direct donations."
              defaultQuery="GiveWell Top Charities Fund"
              placeholder="Search GiveWell Top Charities Fund"
            />

            <label>
              Why was the original donation already planned?
              <textarea
                name="baseline_details"
                rows={4}
                minLength={20}
                maxLength={1200}
                placeholder="For example: I had already budgeted this donation and planned to make it this week before creating this offer."
                required
              />
              <span className="field-note">
                This pre-commitment record is frozen to distinguish incremental
                impact from a donation you were already going to make. The
                creator’s original amount is not counted as incremental impact;
                only the verified portion that moves is counted as redirected.
              </span>
            </label>
            <label className="check-row">
              <input name="baseline_confirmed" type="checkbox" required />
              <span>
                Before publishing, I independently intended to make the full
                stated donation to the original recipient even if nobody
                matched.
              </span>
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={!config.readyForCommitments}
            >
              Commit and publish
            </button>
            <p className="field-note">
              No card or bank information is collected now. Once the branch is
              fixed, each participant completes their exact direct Every.org
              donation obligations within seven days. A partial matched branch
              can create two creator donations and one matcher donation.
            </p>
          </form>
        </section>

        <section
          className="section section-subtle"
          aria-labelledby="open-upgrades-heading"
        >
          <SectionHeader
            eyebrow="Open"
            id="open-upgrades-heading"
            title="Accept the offered terms or negotiate the split."
          >
            The first eligible matcher who accepts the exact published terms
            becomes primary. A counteroffer instead proposes a different
            redirect percentage and matcher amount; creator acceptance creates
            a new matched revision. Later exact-term participants become
            backups.
          </SectionHeader>
          <div className="data-grid">
            {pageData.publicOffers.map((offer) => {
              const ownOffer = creatorOfferById.get(String(offer.id));
              const candidate = viewerCandidateByOfferId.get(String(offer.id));
              const proposal = viewerProposalByOfferId.get(String(offer.id));
              const counterofferWindowOpen =
                directDonationUpgradeCounterofferWindowOpen(offer, now);
              const joinWindowOpen = directDonationUpgradeJoinWindowOpen(
                offer,
                now,
              );
              return (
                <article className="panel data-card" key={offer.id}>
                  <p className="detail-kicker">
                    {statusLabel(offer.status)} ·{" "}
                    {formatDirectDonationUpgradeRedirectPercentage(
                      offer.redirect_basis_points,
                    )}{" "}
                    redirect
                  </p>
                  <h3>{offerTitle(offer)}</h3>
                  <p>
                    Without a match: {formatDirectDonationUpgradeUsd(
                      offer.creator_amount_cents,
                    )}{" "}
                    to {offer.original_recipient.name}.
                  </p>
                  <p>
                    With a match: {describeDirectDonationUpgradeRetainedLeg(
                      offer.retained_amount_cents,
                      offer.original_recipient.name,
                    )};{" "}
                    {formatDirectDonationUpgradeUsd(
                      offer.redirected_amount_cents,
                    )}{" "}
                    moves to {offer.upgraded_recipient.name}; the matcher adds{" "}
                    {formatDirectDonationUpgradeUsd(
                      offer.matcher_amount_cents,
                    )}{" "}
                    there.
                  </p>
                  <p>
                    Match by{" "}
                    <DirectUpgradeLocalDateTime
                      value={offer.match_deadline_at}
                    />
                  </p>
                  {offer.status === "open" && !counterofferWindowOpen ? (
                    <p className="field-note" role="status">
                      The matching deadline has passed. This offer is awaiting
                      its lifecycle update and cannot be accepted or negotiated.
                    </p>
                  ) : null}
                  {offer.status === "matched" && !joinWindowOpen ? (
                    <p className="field-note" role="status">
                      The backup-matcher window has closed.
                    </p>
                  ) : null}
                  <p className="field-note">
                    {offer.matcher_count} matcher commitment
                    {offer.matcher_count === 1 ? "" : "s"} ·{" "}
                    Counteroffers are private
                  </p>
                  <div className="form-actions">
                    <Link
                      className="button button-secondary"
                      href={`/donation-upgrades/${offer.id}`}
                    >
                      View or negotiate
                    </Link>
                    {ownOffer?.status === "open" ? (
                      <form action={cancelDirectDonationUpgradeOfferAction}>
                        <input
                          name="offer_id"
                          type="hidden"
                          value={offer.id}
                        />
                        <button
                          className="button button-secondary"
                          type="submit"
                        >
                          Cancel unmatched offer
                        </button>
                      </form>
                    ) : candidate ? (
                      candidate.status === "backup" ? (
                        <form
                          action={withdrawDirectDonationUpgradeBackupAction}
                        >
                          <input
                            name="offer_id"
                            type="hidden"
                            value={offer.id}
                          />
                          <button
                            className="button button-secondary"
                            type="submit"
                          >
                            Withdraw backup commitment
                          </button>
                        </form>
                      ) : (
                        <span className="badge">
                          Your status: {statusLabel(candidate.status)}
                        </span>
                      )
                    ) : !ownOffer && joinWindowOpen ? (
                      <form
                        action={joinDirectDonationUpgradeOfferAction}
                        className="form-stack"
                      >
                        <input
                          name="offer_id"
                          type="hidden"
                          value={offer.id}
                        />
                        {proposal?.status === "pending" ? (
                          <span className="badge">
                            Your counteroffer is pending
                          </span>
                        ) : null}
                        <label className="check-row">
                          <input
                            name="matcher_commitment"
                            type="checkbox"
                            required
                          />
                          <span>
                            If selected, I will donate exactly{" "}
                            {formatDirectDonationUpgradeUsd(
                              offer.matcher_amount_cents,
                            )}{" "}
                            directly to {offer.upgraded_recipient.name} within
                            seven days under the current published terms.
                          </span>
                        </label>
                        <button
                          className="button button-primary"
                          type="submit"
                        >
                          {offer.status === "open"
                            ? "Accept current terms"
                            : "Join as backup"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!pageData.publicOffers.length ? (
              <article className="panel data-card">
                <h3>No open Donation Upgrades</h3>
                <p>Publish the first direct, verified commitment above.</p>
              </article>
            ) : null}
          </div>
        </section>

        <section
          className="section section-white"
          aria-labelledby="your-upgrades-heading"
        >
          <SectionHeader
            eyebrow="Your activity"
            id="your-upgrades-heading"
            title="Commitments, counteroffers, and direct donation obligations."
          >
            Browser returns, screenshots, and self-attestation do not complete
            an obligation. Moral Trade waits for the exact Every.org partner
            webhook for each donation leg.
          </SectionHeader>
          <div className="data-grid">
            {pageData.viewerObligations.map((obligation) => (
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
                  <p className="field-note">
                    Verified gross{" "}
                    {formatDirectDonationUpgradeUsd(
                      obligation.provider_gross_amount_cents ?? 0,
                    )}
                    ; verified net{" "}
                    {formatDirectDonationUpgradeUsd(
                      obligation.provider_net_amount_cents ?? 0,
                    )}
                    .
                  </p>
                ) : null}
                <div className="form-actions">
                  <Link
                    className="button button-secondary"
                    href={`/donation-upgrades/${obligation.offer_id}`}
                  >
                    View commitment
                  </Link>
                  {["pending", "checkout_started"].includes(
                    obligation.status,
                  ) ? (
                    <form action={startDirectDonationUpgradeCheckoutAction}>
                      <input
                        name="offer_id"
                        type="hidden"
                        value={obligation.offer_id}
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
                </div>
              </article>
            ))}
            {[...activityByOffer.entries()]
              .filter(([offerId]) => !viewerObligationByOfferId.has(offerId))
              .map(([offerId, activity]) => (
                <article
                  className="panel data-card"
                  key={`activity:${offerId}`}
                >
                  <p className="detail-kicker">
                    {activity.offer
                      ? "Creator"
                      : activity.candidate
                        ? "Matcher"
                        : "Counteroffer"}{" "}
                    ·{" "}
                    {statusLabel(
                      activity.offer?.status ??
                        activity.candidate?.status ??
                        activity.proposal?.status,
                    )}
                  </p>
                  <h3>Donation Upgrade commitment</h3>
                  <p className="field-note">
                    No direct donation obligation is currently due from you.
                  </p>
                  <Link
                    className="button button-secondary"
                    href={`/donation-upgrades/${offerId}`}
                  >
                    View commitment
                  </Link>
                </article>
              ))}
            {!pageData.viewerObligations.length && !activityByOffer.size ? (
              <article className="panel data-card">
                <h3>No Donation Upgrade activity yet</h3>
                <p>
                  Your created, negotiated, matched, backup, and verified
                  commitments appear here.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        <section
          className="section section-subtle"
          aria-labelledby="direct-flow-heading"
        >
          <SectionHeader
            eyebrow="Direct verified rail"
            id="direct-flow-heading"
            title="A complete split and bargaining flow without Moral Trade holding money."
          />
          <div className="step-card-grid">
            <StepCard index={1} title="Commit without a payment method.">
              Freeze the baseline, total amount, split, recipients, deadline,
              and privacy setting.
            </StepCard>
            <StepCard index={2} title="Accept or counteroffer.">
              A matcher may accept the exact terms or propose a different
              redirect percentage and added amount. Acceptance creates a new
              immutable revision.
            </StepCard>
            <StepCard index={3} title="Fix the branch and fulfill directly.">
              A partial match creates separate retained, redirected, and
              matcher donation legs. No match creates the original full
              donation.
            </StepCard>
            <StepCard index={4} title="Verify before awarding impact.">
              Exact provider confirmation records gross, net, incremental, and
              redirected amounts for each leg.
            </StepCard>
          </div>
          <p className="field-note">
            The separate managed automatic-payment rail remains unavailable
            until its legal and payment operator exists. Existing direct
            commitments are never silently converted into automatic charges.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
