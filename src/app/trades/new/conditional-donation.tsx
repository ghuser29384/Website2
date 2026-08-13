import Link from "next/link";

import {
  cancelConditionalRedirectOfferAction,
  createConditionalRedirectOfferAction,
  joinConditionalRedirectOfferAction,
  reauthorizeConditionalRedirectAction,
  withdrawConditionalRedirectCandidateAction,
} from "@/app/donation-offsets/conditional/actions";
import {
  DeadlineField,
  LocalDateTime,
} from "@/app/donation-offsets/conditional/deadline-field";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, SectionHeader } from "@/components/ui/page-primitives";
import { requireViewer } from "@/lib/app-data";
import {
  CONDITIONAL_REDIRECT_DEFAULT_DEADLINE_MS,
  CONDITIONAL_REDIRECT_MAX_DEADLINE_MS,
  CONDITIONAL_REDIRECT_MIN_DEADLINE_MS,
} from "@/lib/payments/conditional-redirect";
import { loadConditionalRedirectPageData } from "@/lib/payments/conditional-redirect-page-data";
import { getConditionalPaymentReadiness } from "@/lib/payments/conditional-readiness";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function statusLabel(status: unknown) {
  return String(status ?? "unknown").replaceAll("_", " ");
}

async function loadRequestTime() {
  return Date.now();
}

export async function ConditionalDonationCreate({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const viewer = await requireViewer("/trades/new?structure=conditional-donation");
  const error = queryValue(params.error);
  const setup = queryValue(params.setup);
  const change = queryValue(params.change);
  const readiness = await getConditionalPaymentReadiness();
  const now = await loadRequestTime();
  const nowIso = new Date(now).toISOString();
  const pageData = await loadConditionalRedirectPageData({
    livemode: readiness.livemode,
    nowIso,
    viewerId: viewer.authUser.id,
  });
  const destinationRows = pageData.destinations;
  const offerRows = pageData.offers;
  const creatorOfferRows = pageData.creatorOffers;
  const candidateRows = pageData.viewerCandidates;
  const candidateByOfferId = new Map(
    candidateRows.map((candidate) => [String(candidate.offer_id), candidate]),
  );
  const legByOfferId = new Map(
    pageData.settlementLegs.map((leg) => [
      String(leg.offer_id),
      leg,
    ]),
  );
  const commitmentByOfferId = new Map<string, Record<string, any>>();
  for (const offer of creatorOfferRows) {
    commitmentByOfferId.set(String(offer.id), { ...offer, viewerRole: "creator" });
  }
  for (const candidate of candidateRows) {
    const offer = Array.isArray(candidate.offer) ? candidate.offer[0] : candidate.offer;
    if (offer && !commitmentByOfferId.has(String(offer.id))) {
      commitmentByOfferId.set(String(offer.id), {
        ...offer,
        viewerRole: "matcher",
        viewerCandidate: candidate,
      });
    }
  }
  const commitments = [...commitmentByOfferId.values()]
    .sort(
      (left, right) =>
        Date.parse(String(right.created_at)) - Date.parse(String(left.created_at)),
    )
    .slice(0, 12);

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
            {
              href: "/trades/new?structure=conditional-donation",
              label: "Donation Upgrade",
            },
          ]}
        />
        <PageHero
          eyebrow={
            readiness.mode === "live"
              ? "Create · Live Donation Upgrade"
              : "Create · Donation Upgrade"
          }
          title="Redirect your donation when someone adds to it."
          description="Authorize your original donation first. If an eligible matcher authorizes the added amount before your deadline, both linked donations go to the matched charity. Otherwise your original donation goes to your fallback charity."
          actions={
            <>
              <Link className="button button-secondary" href="/trades/new">
                Back to Create
              </Link>
              <Link className="button button-secondary" href="/donation-offsets/payments">
                Payment workspace
              </Link>
            </>
          }
        />
      </header>
      <main id="main-content" tabIndex={-1}>
        {!pageData.available ? (
          <div className="status-banner status-banner-error" role="status">
            Donation Upgrade authorizations are temporarily unavailable. No payment
            authorization can be created or charged from this page. Please try again later.
          </div>
        ) : null}
        {error ? <div className="status-banner status-banner-error">{error}</div> : null}
        {setup === "success" ? (
          <div className="status-banner">
            Authorization received. The signed Stripe webhook will confirm and publish the offer.
          </div>
        ) : null}
        {setup === "cancelled" ? (
          <div className="status-banner">Stripe authorization was cancelled. No charge was made.</div>
        ) : null}
        {change === "cancelled" ? (
          <div className="status-banner">The offer and its unused authorizations were cancelled.</div>
        ) : null}
        {change === "withdrawn" ? (
          <div className="status-banner">Your matcher authorization was withdrawn before settlement.</div>
        ) : null}

        <section className="section section-white" aria-labelledby="create-conditional-heading">
          <SectionHeader
            eyebrow="Create"
            id="create-conditional-heading"
            title="What will happen with and without a match?"
          />
          <form action={createConditionalRedirectOfferAction} className="panel form-stack">
            <div className="form-grid">
              <label>
                Your planned donation
                <input name="creator_amount" type="number" min="0.50" step="0.01" defaultValue="10.00" required />
              </label>
              <label>
                Amount someone adds
                <input name="matcher_amount" type="number" min="0.50" step="0.01" defaultValue="5.00" required />
              </label>
              <label>
                If nobody matches
                <select name="fallback_destination_id" required defaultValue="">
                  <option value="" disabled>Choose the original charity</option>
                  {destinationRows.map((destination) => (
                    <option key={destination.id} value={destination.id}>{destination.display_name}</option>
                  ))}
                </select>
              </label>
              <label>
                If someone matches
                <select name="matched_destination_id" required defaultValue="">
                  <option value="" disabled>Choose the matched charity</option>
                  {destinationRows.map((destination) => (
                    <option key={destination.id} value={destination.id}>{destination.display_name}</option>
                  ))}
                </select>
              </label>
              <DeadlineField
                defaultValueIso={new Date(
                  now + CONDITIONAL_REDIRECT_DEFAULT_DEADLINE_MS,
                ).toISOString()}
                maximumIso={new Date(
                  now + CONDITIONAL_REDIRECT_MAX_DEADLINE_MS,
                ).toISOString()}
                minimumIso={new Date(
                  now + CONDITIONAL_REDIRECT_MIN_DEADLINE_MS,
                ).toISOString()}
              />
            </div>
            <label className="check-row">
              <input name="consent" type="checkbox" required />
              <span>I authorize the stated future charge. No money is held now. If the matched branch cannot complete, successful charges are refunded; a definitive decline requires my action.</span>
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={!pageData.available || !readiness.canCreateMandates}
            >
              Authorize and publish
            </button>
          </form>
        </section>

        <section className="section section-subtle" aria-labelledby="open-conditional-heading">
          <SectionHeader eyebrow="Open" id="open-conditional-heading" title="Add money to unlock a redirect" />
          <div className="data-grid">
            {offerRows.map((offer) => {
              const sameCharity = offer.offer_kind === "matching_donation";
              const viewerCandidate = candidateByOfferId.get(String(offer.id));
              return (
                <article className="panel data-card" key={offer.id}>
                  <p className="detail-kicker">{sameCharity ? "Matching donation" : "Donation redirect"}</p>
                  <h3>
                    Add {money(Number(offer.matcher_amount_cents))} to unlock{" "}
                    {money(Number(offer.creator_amount_cents) + Number(offer.matcher_amount_cents))}
                  </h3>
                  <p>
                    {sameCharity
                      ? `Two separate, linked donations go to ${offer.matched?.display_name}.`
                      : `${money(Number(offer.creator_amount_cents))} moves from ${offer.fallback?.display_name} and the combined amount goes to ${offer.matched?.display_name}.`}
                  </p>
                  <p>
                    Deadline: <LocalDateTime value={String(offer.deadline_at)} />
                  </p>
                  {String(offer.creator_profile_id) === viewer.authUser.id ? (
                    <div className="form-stack">
                      <p className="field-note">This is your offer. You may revoke it before arbitration begins.</p>
                      <form action={cancelConditionalRedirectOfferAction}>
                        <input type="hidden" name="offer_id" value={offer.id} />
                        <button className="button button-secondary" type="submit">
                          Cancel offer
                        </button>
                      </form>
                    </div>
                  ) : viewerCandidate &&
                    ["setup_pending", "eligible", "backup"].includes(
                      String(viewerCandidate.status),
                    ) ? (
                    <div className="form-stack">
                      <p className="field-note">
                        Your authorization is {statusLabel(viewerCandidate.status)}. It can
                        be charged only if it wins or is promoted as the next eligible backup.
                      </p>
                      <form action={withdrawConditionalRedirectCandidateAction}>
                        <input type="hidden" name="offer_id" value={offer.id} />
                        <button className="button button-secondary" type="submit">
                          Withdraw authorization
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={joinConditionalRedirectOfferAction} className="form-stack">
                      <input type="hidden" name="offer_id" value={offer.id} />
                      <label className="check-row">
                        <input name="consent" type="checkbox" required />
                        <span>
                          I authorize this future charge. If an earlier matcher wins, my
                          authorization may remain as a backup and can be charged only if I
                          am promoted after that matcher fails.
                        </span>
                      </label>
                      <button className="button button-primary" type="submit">
                        Authorize {money(Number(offer.matcher_amount_cents))}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
            {!offerRows.length ? <p>No Donation Upgrades are open yet.</p> : null}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="your-conditional-heading">
          <SectionHeader
            eyebrow="Your activity"
            id="your-conditional-heading"
            title="Authorizations, recovery, and receipts"
          >
            A definitive decline always requires your explicit action. Successful charges
            remain separate by donor, including when both donations go to the same charity.
          </SectionHeader>
          <div className="data-grid">
            {commitments.map((offer) => {
              const viewerCandidate =
                offer.viewerCandidate ?? candidateByOfferId.get(String(offer.id));
              const isCreator = offer.viewerRole === "creator";
              const viewerMustRecover =
                (offer.status === "creator_recovery" &&
                  isCreator &&
                  String(offer.creator_profile_id) === viewer.authUser.id) ||
                (offer.status === "matcher_recovery" &&
                  !isCreator &&
                  String(offer.winning_candidate_id) ===
                    String(viewerCandidate?.id) &&
                  viewerCandidate?.status === "recovery");
              const leg = legByOfferId.get(String(offer.id));
              return (
                <article className="panel data-card" key={`commitment:${offer.id}`}>
                  <p className="detail-kicker">
                    {isCreator ? "Creator" : "Matcher"} · {statusLabel(offer.status)}
                  </p>
                  <h3>
                    {offer.offer_kind === "matching_donation"
                      ? `${money(Number(offer.creator_amount_cents) + Number(offer.matcher_amount_cents))} linked match`
                      : `${money(Number(offer.creator_amount_cents))} redirect + ${money(Number(offer.matcher_amount_cents))} add-on`}
                  </h3>
                  <p>
                    {offer.fallback?.display_name} → {offer.matched?.display_name}
                  </p>
                  {offer.recovery_ends_at ? (
                    <p>
                      Recovery closes:{" "}
                      <LocalDateTime value={String(offer.recovery_ends_at)} />
                    </p>
                  ) : null}
                  {viewerMustRecover ? (
                    <form action={reauthorizeConditionalRedirectAction} className="form-stack">
                      <input type="hidden" name="offer_id" value={offer.id} />
                      <label className="check-row">
                        <input name="consent" type="checkbox" required />
                        <span>
                          I explicitly replace my failed authorization for the same frozen
                          amount and terms.
                        </span>
                      </label>
                      <button className="button button-primary" type="submit">
                        Restore authorization
                      </button>
                    </form>
                  ) : null}
                  {leg?.receipt_url ? (
                    <a
                      className="button button-secondary"
                      href={String(leg.receipt_url)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View Stripe payment receipt
                    </a>
                  ) : null}
                  {leg ? (
                    <p className="field-note">
                      Your {money(Number(leg.amount_cents))} leg is{" "}
                      {statusLabel(leg.status)}. This receipt does not determine tax
                      deductibility.
                    </p>
                  ) : null}
                </article>
              );
            })}
            {!commitments.length ? <p>You have no Donation Upgrade authorizations yet.</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
