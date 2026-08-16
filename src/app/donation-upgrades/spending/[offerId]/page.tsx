import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  acceptDirectSpendingUpgradeProposalAction,
  cancelDirectSpendingUpgradeOfferAction,
  joinDirectSpendingUpgradeOfferAction,
  proposeDirectSpendingUpgradeTermsAction,
  startDirectSpendingUpgradeCheckoutAction,
  submitDirectSpendingUpgradeEvidenceAction,
} from "@/app/direct-spending-upgrade-actions";
import { DirectUpgradeLocalDateTime } from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  PageHero,
  SectionHeader,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { formatDirectDonationUpgradeUsd } from "@/lib/direct-donation-upgrade";
import {
  getDirectSpendingUpgradeConfig,
  type DirectSpendingUpgradeCategory,
} from "@/lib/direct-spending-upgrade";
import { loadDirectSpendingUpgradeDetail } from "@/lib/direct-spending-upgrade-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Spending Upgrade · Donation Upgrade",
  robots: { index: true, follow: true },
};

interface PageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusLabel(value: unknown) {
  return String(value ?? "not submitted").replaceAll("_", " ");
}

function categoryLabel(category: DirectSpendingUpgradeCategory | undefined) {
  switch (category) {
    case "recurring_subscription":
      return "Optional subscription or automatic renewal";
    case "cancellable_reservation_or_service":
      return "Cancellable optional reservation or service";
    case "pending_order_or_upgrade":
      return "Pending optional order, product upgrade, or service upgrade";
    default:
      return "Private nonessential spending baseline";
  }
}

async function loadRenderClockMs() {
  return Date.now();
}

export default async function SpendingUpgradeDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ offerId }, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const config = getDirectSpendingUpgradeConfig();
  if (!config.requestedEnabled || !config.donationUpgrade.environment) notFound();
  const detail = await loadDirectSpendingUpgradeDetail({
    offerId,
    viewerId: viewer?.authUser.id ?? null,
    environment: config.donationUpgrade.environment,
  });
  const renderClockMs = await loadRenderClockMs();
  if (!detail.publicOffer && !detail.offer) notFound();
  const formMessage = getFormMessage(resolvedSearchParams);
  const publicOffer = detail.publicOffer;
  const offer = detail.offer;
  const baseline = detail.baseline;
  const viewerId = viewer?.authUser.id ?? null;
  const isCreator = Boolean(offer && viewerId === offer.creator_profile_id);
  const viewerCandidate = detail.candidates.find(
    (candidate) => candidate.profile_id === viewerId,
  );
  const creatorDonation = detail.obligations.find(
    (obligation) => obligation.obligation_kind === "creator_converted_spending",
  );
  const matcherDonation = detail.obligations.find(
    (obligation) => obligation.obligation_kind === "matcher_incremental",
  );
  const viewerObligations = detail.obligations.filter(
    (obligation) => obligation.participant_profile_id === viewerId,
  );
  const plannedSpendAmount =
    publicOffer?.planned_spend_amount_cents ??
    baseline?.planned_spend_amount_cents ??
    (offer
      ? offer.creator_diversion_amount_cents + offer.retained_spending_amount_cents
      : 0);
  const creatorAmount =
    publicOffer?.creator_diversion_amount_cents ??
    offer?.creator_diversion_amount_cents ??
    0;
  const retainedAmount =
    publicOffer?.retained_spending_amount_cents ??
    offer?.retained_spending_amount_cents ??
    0;
  const matcherAmount =
    publicOffer?.matcher_amount_cents ?? offer?.matcher_amount_cents ?? 0;
  const upgradedRecipient =
    publicOffer?.upgraded_recipient ?? offer?.upgraded_recipient;
  const offerStatus = publicOffer?.status ?? offer?.status ?? "review_required";
  const baselineReview =
    publicOffer?.baseline_review_status ?? baseline?.review_status ?? "review_required";
  const spendingReview =
    publicOffer?.spending_change_review_status ??
    offer?.spending_change_review_status ??
    null;
  const matchDeadline =
    publicOffer?.match_deadline_at ?? offer?.match_deadline_at ?? "";
  const termsHash = publicOffer?.terms_hash ?? offer?.terms_hash ?? "";
  const canJoin = Boolean(
    viewer &&
      publicOffer?.status === "open" &&
      !isCreator &&
      !viewerCandidate &&
      Date.parse(publicOffer.match_deadline_at) > renderClockMs,
  );
  const canPropose = canJoin;
  const pendingProposals = isCreator
    ? detail.proposals.filter((proposal) => proposal.status === "pending")
    : [];
  const convertedCredit = detail.impactCredits.find(
    (credit) =>
      credit.credit_kind === "converted_spending" &&
      creatorDonation?.status === "verified" &&
      spendingReview === "accepted",
  );
  const matcherCredit = detail.impactCredits.find(
    (credit) =>
      credit.credit_kind === "matcher_incremental" &&
      matcherDonation?.status === "verified",
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
              href: `/donation-upgrades/spending/${offerId}`,
              label: "Spending subtype",
            },
          ]}
        />
        <PageHero
          eyebrow={`Donation Upgrade · Spending subtype · ${statusLabel(offerStatus)}`}
          title={`Convert ${formatDirectDonationUpgradeUsd(
            creatorAmount,
          )} and add ${formatDirectDonationUpgradeUsd(matcherAmount)} for ${
            upgradedRecipient?.name ?? "the frozen nonprofit"
          }`}
          description="No match creates no donation or purchase obligation. After a match, the creator and matcher make two separate direct donations to the same nonprofit. Donation verification and private spending-change review remain distinct."
          actions={
            <>
              <Link className="button button-secondary" href="/donation-upgrades">
                Back to directory
              </Link>
              <Link
                className="button button-secondary"
                href="/trades/new?structure=conditional-donation&rail=direct&baseline=nonessential-spending"
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
          <div className="status-banner status-banner-error" role="status">
            {config.blockers[0] ?? "Spending Upgrade is unavailable."}
          </div>
        ) : null}
        {baselineReview !== "accepted" ? (
          <div className="status-banner" role="status">
            <strong>Baseline review required.</strong> This private prospective
            spending record is not open for matching. If no explicitly scoped,
            compatible reviewer authority is available, it stays review
            required; Moral Trade does not substitute an ordinary administrator
            or claim independent verification.
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="spending-terms-heading">
          <SectionHeader
            eyebrow="Frozen subtype terms"
            id="spending-terms-heading"
            title="The private purchase is not a fictional original donation."
          >
            Only the category and exact public-safe amounts are shown. Merchant,
            account, order, billing, baseline evidence, and cancellation proof
            do not appear in this projection.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>If nobody matches</h3>
              <p>
                No donation obligation, checkout, spending requirement, purchase
                completion, or impact credit is created. The creator remains free
                to cancel or change the optional purchase.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>If someone matches</h3>
              <p>
                The creator donates {formatDirectDonationUpgradeUsd(creatorAmount)}
                {" "}directly to {upgradedRecipient?.name}. The matcher separately
                donates {formatDirectDonationUpgradeUsd(matcherAmount)} there.
                Moral Trade never receives or redistributes either donation.
              </p>
              {upgradedRecipient ? (
                <a href={upgradedRecipient.profileUrl} rel="noreferrer" target="_blank">
                  Verify the Every.org recipient
                </a>
              ) : null}
            </article>
            <article className="panel concept-card">
              <h3>What may count as impact</h3>
              <p>
                The matcher donation may be recorded as verified incremental
                giving when Every.org confirms it. Creator converted-spending
                credit requires both creator donation confirmation and accepted
                private cancellation or reduction evidence.
              </p>
            </article>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Allowed baseline category</dt>
              <dd>{categoryLabel(publicOffer?.category ?? baseline?.category)}</dd>
            </div>
            <div>
              <dt>Planned change</dt>
              <dd>{statusLabel(publicOffer?.planned_action ?? baseline?.planned_action)}</dd>
            </div>
            <div>
              <dt>Prospective optional spend</dt>
              <dd>{formatDirectDonationUpgradeUsd(plannedSpendAmount)}</dd>
            </div>
            <div>
              <dt>Creator direct donation if matched</dt>
              <dd>{formatDirectDonationUpgradeUsd(creatorAmount)}</dd>
            </div>
            <div>
              <dt>Unconverted spending remainder</dt>
              <dd>{formatDirectDonationUpgradeUsd(retainedAmount)}</dd>
            </div>
            <div>
              <dt>Matcher separate donation</dt>
              <dd>{formatDirectDonationUpgradeUsd(matcherAmount)}</dd>
            </div>
            <div>
              <dt>Baseline review</dt>
              <dd>{statusLabel(baselineReview)}</dd>
            </div>
            <div>
              <dt>Spending-change review</dt>
              <dd>{statusLabel(spendingReview)}</dd>
            </div>
            <div>
              <dt>Match deadline</dt>
              <dd>
                {matchDeadline ? <DirectUpgradeLocalDateTime value={matchDeadline} /> : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Subtype terms hash</dt>
              <dd>{termsHash.slice(0, 24)}…</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="spending-match-heading">
          <SectionHeader
            eyebrow="Matching and counteroffers"
            id="spending-match-heading"
            title="Commit only to the matcher donation you control."
          >
            A matcher never receives the creator&apos;s funds and never pays the
            creator. Accepting current terms atomically creates one creator and
            one matcher direct-donation obligation.
          </SectionHeader>
          <div className="data-grid">
            {canJoin ? (
              <article className="panel data-card">
                <h3>Accept current exact terms</h3>
                <form action={joinDirectSpendingUpgradeOfferAction} className="form-stack">
                  <input name="offer_id" type="hidden" value={offerId} />
                  <label className="check-row">
                    <input name="matcher_commitment" type="checkbox" required />
                    <span>
                      If selected, I will donate exactly {formatDirectDonationUpgradeUsd(
                        matcherAmount,
                      )} directly to {upgradedRecipient?.name}. I do not verify
                      the creator&apos;s spending claim.
                    </span>
                  </label>
                  <button className="button button-primary" type="submit">
                    Match with a separate direct donation
                  </button>
                </form>
              </article>
            ) : null}
            {canPropose ? (
              <article className="panel data-card">
                <h3>Propose different donation amounts</h3>
                <form action={proposeDirectSpendingUpgradeTermsAction} className="form-stack">
                  <input name="offer_id" type="hidden" value={offerId} />
                  <div className="form-grid">
                    <label>
                      Creator direct donation
                      <input
                        max={(plannedSpendAmount / 100).toFixed(2)}
                        min="1"
                        name="creator_diversion_amount"
                        required
                        step="0.01"
                        type="number"
                        defaultValue={(creatorAmount / 100).toFixed(2)}
                      />
                    </label>
                    <label>
                      Matcher direct donation
                      <input
                        max="50000"
                        min="1"
                        name="matcher_amount"
                        required
                        step="0.01"
                        type="number"
                        defaultValue={(matcherAmount / 100).toFixed(2)}
                      />
                    </label>
                  </div>
                  <label>
                    Private message to creator
                    <textarea maxLength={600} name="message" rows={3} />
                  </label>
                  <label className="check-row">
                    <input name="proposal_commitment" type="checkbox" required />
                    <span>
                      If the creator accepts before the deadline, I commit to
                      the exact proposed matcher donation.
                    </span>
                  </label>
                  <button className="button button-secondary" type="submit">
                    Send binding counteroffer
                  </button>
                </form>
              </article>
            ) : null}
            {pendingProposals.map((proposal) => (
              <article className="panel data-card" key={proposal.id}>
                <p className="detail-kicker">Pending private counteroffer</p>
                <h3>
                  Creator {formatDirectDonationUpgradeUsd(
                    proposal.proposed_creator_diversion_amount_cents,
                  )}; matcher {formatDirectDonationUpgradeUsd(
                    proposal.proposed_matcher_amount_cents,
                  )}
                </h3>
                <p>{proposal.message || "No private message."}</p>
                <form action={acceptDirectSpendingUpgradeProposalAction} className="form-stack">
                  <input name="offer_id" type="hidden" value={offerId} />
                  <input name="proposal_id" type="hidden" value={proposal.id} />
                  <label className="check-row">
                    <input name="accept_proposal_commitment" type="checkbox" required />
                    <span>
                      Accept as a new immutable revision and create exactly the
                      two displayed direct-donation obligations.
                    </span>
                  </label>
                  <button className="button button-primary" type="submit">
                    Accept counteroffer and match
                  </button>
                </form>
              </article>
            ))}
            {!canJoin && !canPropose && !pendingProposals.length ? (
              <article className="panel data-card">
                <h3>No matching action is available</h3>
                <p>
                  The offer may be awaiting baseline review, already matched,
                  past its deadline, or visible to its creator.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        {detail.isParticipant ? (
          <section className="section section-white" aria-labelledby="spending-fulfilment-heading">
            <SectionHeader
              eyebrow="Participant-only status"
              id="spending-fulfilment-heading"
              title="Two donation records and one separate evidence decision."
            >
              Provider fields below are reduced to status and verified amounts.
              Partner IDs, charge hashes, payload hashes, merchant records, and
              evidence contents are not rendered.
            </SectionHeader>
            <div className="data-grid">
              {detail.obligations.map((obligation) => (
                <article className="panel data-card" key={obligation.id}>
                  <p className="detail-kicker">
                    {statusLabel(obligation.obligation_kind)} · {statusLabel(obligation.status)}
                  </p>
                  <h3>
                    {formatDirectDonationUpgradeUsd(obligation.expected_amount_cents)} to{" "}
                    {obligation.expected_recipient.name}
                  </h3>
                  <p>
                    Every.org status: {statusLabel(obligation.status)}. Verified
                    gross {formatDirectDonationUpgradeUsd(
                      obligation.provider_gross_amount_cents ?? 0,
                    )}; net {formatDirectDonationUpgradeUsd(
                      obligation.provider_net_amount_cents ?? 0,
                    )}.
                  </p>
                  {viewerObligations.some((row) => row.id === obligation.id) &&
                  ["pending", "checkout_started"].includes(obligation.status) ? (
                    <form action={startDirectSpendingUpgradeCheckoutAction}>
                      <input name="offer_id" type="hidden" value={offerId} />
                      <input name="obligation_id" type="hidden" value={obligation.id} />
                      <button
                        className="button button-primary"
                        disabled={!config.readyForCheckout}
                        type="submit"
                      >
                        Donate directly through Every.org
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
              {!detail.obligations.length ? (
                <article className="panel data-card">
                  <h3>No donation obligations exist</h3>
                  <p>
                    This is expected before matching and after an unmatched
                    cancellation or expiry.
                  </p>
                </article>
              ) : null}
            </div>

            {isCreator && ["matched", "needs_review"].includes(offerStatus) ? (
              <form action={submitDirectSpendingUpgradeEvidenceAction} className="panel form-stack">
                <h3>Submit private cancellation or reduction evidence</h3>
                <p className="field-note">
                  This evidence cannot verify either donation. It is reviewed
                  only to decide whether an already provider-verified creator
                  donation may receive converted-spending credit.
                </p>
                <label>
                  Evidence type
                  <select name="change_kind" defaultValue="" required>
                    <option value="" disabled>Choose one</option>
                    <option value="subscription_cancelled">Subscription cancelled</option>
                    <option value="reservation_or_service_cancelled">Reservation or service cancelled</option>
                    <option value="order_cancelled_or_reduced">Order cancelled or reduced</option>
                    <option value="upgrade_downgraded">Upgrade downgraded</option>
                  </select>
                </label>
                <label>
                  Private description
                  <textarea
                    maxLength={1200}
                    minLength={20}
                    name="private_change_description"
                    placeholder="Describe what changed and what the private record demonstrates."
                    required
                    rows={4}
                  />
                </label>
                <label>
                  Optional private cancellation reference
                  <input
                    autoComplete="off"
                    maxLength={500}
                    name="private_change_reference"
                  />
                </label>
                <label className="check-row">
                  <input name="privacy_acknowledged" type="checkbox" required />
                  <span>
                    I omitted passwords, full payment details, health data, and
                    unrelated personal information. This record is private and
                    will not be published.
                  </span>
                </label>
                <input name="offer_id" type="hidden" value={offerId} />
                <button className="button button-primary" type="submit">
                  Submit private evidence for scoped review
                </button>
              </form>
            ) : null}

            <dl className="detail-grid">
              <div>
                <dt>Creator donation</dt>
                <dd>{statusLabel(creatorDonation?.status ?? "not created")}</dd>
              </div>
              <div>
                <dt>Spending-change evidence</dt>
                <dd>{statusLabel(spendingReview)}</dd>
              </div>
              <div>
                <dt>Creator converted-spending credit</dt>
                <dd>
                  {convertedCredit
                    ? formatDirectDonationUpgradeUsd(
                        convertedCredit.converted_spending_gross_amount_cents,
                      )
                    : "None"}
                </dd>
              </div>
              <div>
                <dt>Matcher donation</dt>
                <dd>{statusLabel(matcherDonation?.status ?? "not created")}</dd>
              </div>
              <div>
                <dt>Matcher incremental credit</dt>
                <dd>
                  {matcherCredit
                    ? formatDirectDonationUpgradeUsd(
                        matcherCredit.incremental_gross_amount_cents,
                      )
                    : "None"}
                </dd>
              </div>
              <div>
                <dt>Whole offer</dt>
                <dd>{statusLabel(offerStatus)}</dd>
              </div>
            </dl>
            {isCreator && ["open", "review_required"].includes(offerStatus) ? (
              <form action={cancelDirectSpendingUpgradeOfferAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <button className="button button-secondary" type="submit">
                  Cancel unmatched Spending Upgrade
                </button>
              </form>
            ) : null}
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
