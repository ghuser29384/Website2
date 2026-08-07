import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cancelDirectDonationUpgradeOfferAction,
  joinDirectDonationUpgradeOfferAction,
  startDirectDonationUpgradeCheckoutAction,
  withdrawDirectDonationUpgradeBackupAction,
} from "@/app/direct-donation-upgrade-actions";
import { DirectUpgradeLocalDateTime } from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, SectionHeader } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
  type DirectDonationUpgradeCandidateRow,
  type DirectDonationUpgradeObligationRow,
} from "@/lib/direct-donation-upgrade";
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

function profileName(candidate: Record<string, unknown>) {
  const profile = candidate.profile;
  if (Array.isArray(profile)) return String((profile[0] as any)?.display_name ?? "Participant");
  return String((profile as any)?.display_name ?? "Participant");
}

export default async function DonationUpgradeDetailPage({ params, searchParams }: PageProps) {
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
  const displayOffer = detail.offer ?? publicOffer!;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewerId = viewer?.authUser.id ?? null;
  const viewerCandidate = (detail.candidates as Array<DirectDonationUpgradeCandidateRow & Record<string, unknown>>)
    .find((candidate) => String(candidate.profile_id) === viewerId);
  const viewerObligations = (detail.obligations as DirectDonationUpgradeObligationRow[])
    .filter((obligation) => obligation.participant_profile_id === viewerId);
  const isCreator = Boolean(detail.offer && viewerId === detail.offer.creator_profile_id);
  const canJoin = Boolean(
    viewer &&
      !detail.isParticipant &&
      ["open", "matched"].includes(String(displayOffer.status)),
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
            { href: `/donation-upgrades/${offerId}`, label: "Exact commitment" },
          ]}
        />
        <PageHero
          eyebrow={`Donation Upgrade · ${statusLabel(displayOffer.status)}`}
          title={`${formatDirectDonationUpgradeUsd(
            displayOffer.creator_amount_cents + displayOffer.matcher_amount_cents,
          )} for ${displayOffer.upgraded_recipient.name}`}
          description={`Without a match, the creator commits ${formatDirectDonationUpgradeUsd(
            displayOffer.creator_amount_cents,
          )} to ${displayOffer.original_recipient.name}. With a match, the creator and matcher make separate direct donations to ${displayOffer.upgraded_recipient.name}.`}
          actions={
            <>
              <Link className="button button-secondary" href="/donation-upgrades">
                Back to directory
              </Link>
              <Link
                className="button button-secondary"
                href="/trades/new?structure=conditional-donation"
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
            className={`status-banner ${formMessage.tone === "error" ? "status-banner-error" : ""}`}
            role="status"
          >
            {formMessage.text}
          </div>
        ) : null}
        {!config.readyForCommitments ? (
          <div className="status-banner status-banner-error" role="status">
            {config.blockers[0] ?? "The direct donation rail is unavailable."}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="frozen-terms-heading">
          <SectionHeader
            eyebrow="Frozen terms"
            id="frozen-terms-heading"
            title="The branch, recipients, and amounts cannot change after publication."
          />
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>If nobody matches</h3>
              <p>
                The creator donates {formatDirectDonationUpgradeUsd(displayOffer.creator_amount_cents)}
                {" "}directly to {displayOffer.original_recipient.name}.
              </p>
              <a href={displayOffer.original_recipient.profileUrl} rel="noreferrer" target="_blank">
                Verify Every.org recipient
              </a>
            </article>
            <article className="panel concept-card">
              <h3>If someone matches</h3>
              <p>
                The creator donates {formatDirectDonationUpgradeUsd(displayOffer.creator_amount_cents)}
                {" "}and the matcher donates {formatDirectDonationUpgradeUsd(displayOffer.matcher_amount_cents)}
                {" "}directly to {displayOffer.upgraded_recipient.name}.
              </p>
              <a href={displayOffer.upgraded_recipient.profileUrl} rel="noreferrer" target="_blank">
                Verify Every.org recipient
              </a>
            </article>
            <article className="panel concept-card">
              <h3>Timing and visibility</h3>
              <p>
                Match by <DirectUpgradeLocalDateTime value={displayOffer.match_deadline_at} />.
              </p>
              <p>
                Identities: {displayOffer.privacy_mode === "public" ? "public" : "hidden until successful completion"}.
              </p>
            </article>
          </div>
          <dl className="detail-grid">
            <div><dt>Terms hash</dt><dd>{String(displayOffer.terms_hash).slice(0, 24)}…</dd></div>
            <div><dt>Branch</dt><dd>{statusLabel(displayOffer.selected_branch ?? "not selected")}</dd></div>
            <div><dt>Creator</dt><dd>{publicOffer?.creator_display_name ?? (isCreator ? viewer?.displayName : "Hidden")}</dd></div>
            <div><dt>Matcher</dt><dd>{publicOffer?.matcher_display_name ?? "None or hidden"}</dd></div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="join-upgrade-heading">
          <SectionHeader
            eyebrow="Matching"
            id="join-upgrade-heading"
            title="Primary first, backups after the branch is selected."
          >
            No payment method is collected when someone joins. A promoted matcher receives a new
            seven-day direct donation obligation.
          </SectionHeader>
          <div className="panel form-stack">
            {isCreator && displayOffer.status === "open" ? (
              <form action={cancelDirectDonationUpgradeOfferAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <button className="button button-secondary" type="submit">
                  Cancel unmatched offer
                </button>
              </form>
            ) : null}
            {viewerCandidate?.status === "backup" ? (
              <form action={withdrawDirectDonationUpgradeBackupAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <button className="button button-secondary" type="submit">
                  Withdraw backup commitment
                </button>
              </form>
            ) : null}
            {viewerCandidate ? (
              <p className="field-note">Your matcher status: {statusLabel(viewerCandidate.status)}.</p>
            ) : null}
            {canJoin ? (
              <form action={joinDirectDonationUpgradeOfferAction} className="form-stack">
                <input name="offer_id" type="hidden" value={offerId} />
                <label className="check-row">
                  <input name="matcher_commitment" type="checkbox" required />
                  <span>
                    If selected, I will donate exactly{" "}
                    {formatDirectDonationUpgradeUsd(displayOffer.matcher_amount_cents)} directly to{" "}
                    {displayOffer.upgraded_recipient.name} within seven days. I understand that
                    browser returns and screenshots do not count as fulfillment.
                  </span>
                </label>
                <button className="button button-primary" type="submit">
                  {displayOffer.status === "open" ? "Become primary matcher" : "Join as backup"}
                </button>
              </form>
            ) : !viewer && ["open", "matched"].includes(String(displayOffer.status)) ? (
              <Link
                className="button button-primary"
                href={`/login?next=${encodeURIComponent(`/donation-upgrades/${offerId}`)}`}
              >
                Sign in to match
              </Link>
            ) : null}
            {!canJoin && viewer && !detail.isParticipant ? (
              <p className="field-note">This commitment is no longer accepting matchers.</p>
            ) : null}
          </div>
        </section>

        {detail.isParticipant ? (
          <section className="section section-white" aria-labelledby="participant-record-heading">
            <SectionHeader
              eyebrow="Participant record"
              id="participant-record-heading"
              title="Private obligations and fulfillment states."
            >
              This section is visible only to the creator, selected matcher, and backup matchers.
            </SectionHeader>
            <div className="data-grid">
              {viewerObligations.map((obligation) => (
                <article className="panel data-card" key={obligation.id}>
                  <p className="detail-kicker">
                    Your {obligation.participant_role} obligation · {statusLabel(obligation.status)}
                  </p>
                  <h3>
                    {formatDirectDonationUpgradeUsd(obligation.expected_amount_cents)} to{" "}
                    {obligation.expected_recipient.name}
                  </h3>
                  <p>Due <DirectUpgradeLocalDateTime value={obligation.due_at} /></p>
                  {obligation.status === "verified" ? (
                    <dl className="detail-grid">
                      <div>
                        <dt>Verified gross</dt>
                        <dd>{formatDirectDonationUpgradeUsd(obligation.provider_gross_amount_cents ?? 0)}</dd>
                      </div>
                      <div>
                        <dt>Verified net</dt>
                        <dd>{formatDirectDonationUpgradeUsd(obligation.provider_net_amount_cents ?? 0)}</dd>
                      </div>
                      <div>
                        <dt>Provider date</dt>
                        <dd>{obligation.provider_donation_date ? <DirectUpgradeLocalDateTime value={obligation.provider_donation_date} /> : "Unavailable"}</dd>
                      </div>
                      <div>
                        <dt>Payment method</dt>
                        <dd>{obligation.provider_payment_method || "Not recorded"}</dd>
                      </div>
                    </dl>
                  ) : null}
                  {["pending", "checkout_started"].includes(obligation.status) ? (
                    <form action={startDirectDonationUpgradeCheckoutAction}>
                      <input name="offer_id" type="hidden" value={offerId} />
                      <input name="obligation_id" type="hidden" value={obligation.id} />
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
                    <p className="field-note">{obligation.failure_message}</p>
                  ) : null}
                </article>
              ))}
              {!viewerObligations.length ? (
                <article className="panel data-card">
                  <h3>No direct donation is currently due from you</h3>
                  <p>Your commitment remains recorded as {statusLabel(viewerCandidate?.status ?? displayOffer.status)}.</p>
                </article>
              ) : null}
            </div>

            <div className="data-grid">
              {(detail.candidates as Array<DirectDonationUpgradeCandidateRow & Record<string, unknown>>).map((candidate) => (
                <article className="panel data-card" key={candidate.id}>
                  <p className="detail-kicker">Matcher rank {candidate.rank}</p>
                  <h3>{profileName(candidate)}</h3>
                  <p>{statusLabel(candidate.status)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="section section-subtle" aria-labelledby="verified-impact-heading">
          <SectionHeader
            eyebrow="Verified impact"
            id="verified-impact-heading"
            title="Gross, net, incremental, and redirected value stay separate."
          />
          <div className="pilot-metric-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Verified obligations</p>
              <h2>{publicOffer?.verified_obligation_count ?? 0}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Verified gross</p>
              <h2>{formatDirectDonationUpgradeUsd(publicOffer?.verified_gross_amount_cents ?? 0)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Verified net</p>
              <h2>{formatDirectDonationUpgradeUsd(publicOffer?.verified_net_amount_cents ?? 0)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Incremental net</p>
              <h2>{formatDirectDonationUpgradeUsd(publicOffer?.incremental_net_amount_cents ?? 0)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Redirected net</p>
              <h2>{formatDirectDonationUpgradeUsd(publicOffer?.redirected_net_amount_cents ?? 0)}</h2>
            </article>
          </div>
          <p className="field-note">
            The creator’s original amount is not counted as incremental. In the matched branch it
            may be counted as redirected, while the matcher’s verified net amount is incremental.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
