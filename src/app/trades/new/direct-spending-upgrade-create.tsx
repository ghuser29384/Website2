import Link from "next/link";

import {
  cancelDirectSpendingUpgradeOfferAction,
  createDirectSpendingUpgradeOfferAction,
  joinDirectSpendingUpgradeOfferAction,
  startDirectSpendingUpgradeCheckoutAction,
} from "@/app/direct-spending-upgrade-actions";
import { DirectSpendingUpgradeAmountFields } from "@/components/donation-upgrades/direct-spending-upgrade-amount-fields";
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
import {
  DIRECT_DONATION_UPGRADE_DEFAULT_MATCH_DAYS,
  DIRECT_DONATION_UPGRADE_MAX_MATCH_DAYS,
  formatDirectDonationUpgradeUsd,
} from "@/lib/direct-donation-upgrade";
import {
  getDirectSpendingUpgradeConfig,
  type DirectSpendingUpgradeCategory,
} from "@/lib/direct-spending-upgrade";
import { loadDirectSpendingUpgradePageData } from "@/lib/direct-spending-upgrade-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const ROOT_PATH = "/trades/new?structure=conditional-donation&rail=direct";
const SPENDING_PATH = `${ROOT_PATH}&baseline=nonessential-spending`;
const PLANNED_PATH = `${ROOT_PATH}&baseline=planned-donation`;

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

function categoryLabel(category: DirectSpendingUpgradeCategory) {
  switch (category) {
    case "recurring_subscription":
      return "Optional subscription or automatic renewal";
    case "cancellable_reservation_or_service":
      return "Cancellable optional reservation or service";
    case "pending_order_or_upgrade":
      return "Pending optional order, product upgrade, or service upgrade";
  }
}

function plannedActionLabel(value: string) {
  return value.replaceAll("_", " ");
}

async function loadRenderClockMs() {
  return Date.now();
}

export function DirectDonationUpgradeBaselineChoice({
  viewerName,
}: {
  viewerName: string;
}) {
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
            { href: ROOT_PATH, label: "Donation Upgrade" },
          ]}
        />
        <PageHero
          eyebrow="Create · Donation Upgrade"
          title="What was this money otherwise going to be used for?"
          description={`Choose the factual baseline first, ${viewerName}. Planned donations and optional spending use different frozen terms, evidence, obligations, and impact accounting.`}
          actions={
            <Link className="button button-secondary" href="/donation-upgrades">
              Browse Donation Upgrades
            </Link>
          }
        />
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="baseline-choice-heading">
          <SectionHeader
            eyebrow="Baseline source"
            id="baseline-choice-heading"
            title="Choose the statement that was already true before this offer."
          >
            This choice is structural, not cosmetic. It prevents an optional
            purchase from being represented as a donation that had a fictional
            original nonprofit recipient.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <p className="detail-kicker">Planned donation</p>
              <h3>I was already going to donate this money.</h3>
              <p>
                Keep the existing Donation Upgrade flow: freeze the original
                nonprofit, upgraded nonprofit, full baseline donation, split,
                and matcher amount.
              </p>
              <Link className="button button-primary" href={PLANNED_PATH}>
                Continue with a planned donation
              </Link>
            </article>
            <article className="panel concept-card">
              <p className="detail-kicker">Spending Upgrade subtype</p>
              <h3>I was going to make an optional purchase or renewal.</h3>
              <p>
                Freeze a private prospective spending baseline. If it is
                reviewed and matched, you and the matcher each donate directly
                to the same nonprofit. If it is not matched, no donation or
                purchase obligation is created.
              </p>
              <Link className="button button-primary" href={SPENDING_PATH}>
                Continue with optional spending
              </Link>
            </article>
          </div>
          <p className="field-note">
            Spending Upgrade excludes food and hydration, health and disability
            support, housing and utilities, insurance, essential transport,
            required education or work costs, debts and legal obligations,
            dependent or pet care, safety spending, and donations financed by
            BNPL, cash advances, payday loans, or new credit-card debt.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export async function DirectSpendingUpgradeCreate({
  params,
  viewerId,
}: {
  params: Record<string, string | string[] | undefined>;
  viewerId: string;
}) {
  const config = getDirectSpendingUpgradeConfig();
  const formMessage = getFormMessage(params);
  const now = await loadRenderClockMs();
  const pageData = config.donationUpgrade.environment
    ? await loadDirectSpendingUpgradePageData({
        viewerId,
        environment: config.donationUpgrade.environment,
      })
    : {
        publicOffers: [],
        creatorOffers: [],
        viewerCandidates: [],
        viewerObligations: [],
        viewerProposals: [],
      };
  const ownOfferIds = new Set(
    pageData.creatorOffers.map((offer) => String(offer.id)),
  );
  const candidateOfferIds = new Set(
    pageData.viewerCandidates.map((candidate) => String(candidate.offer_id)),
  );

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
            { href: ROOT_PATH, label: "Donation Upgrade" },
            { href: SPENDING_PATH, label: "Spending Upgrade" },
          ]}
        />
        <PageHero
          eyebrow="Donation Upgrade · Spending subtype"
          title="Turn verified optional spending into two direct donations."
          description="Freeze a prospective nonessential expense privately. After scoped baseline review and a match, you donate the released amount directly to the selected nonprofit and the matcher makes a separate direct donation there. Cancellation evidence and donation completion are verified separately."
          actions={
            <>
              <Link className="button button-secondary" href={ROOT_PATH}>
                Change baseline source
              </Link>
              <Link className="button button-secondary" href="/donation-upgrades">
                Browse all Donation Upgrades
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
            <strong>Spending Upgrade is fail-closed.</strong>{" "}
            {config.blockers[0] ?? "The direct Every.org rail is unavailable."}
            {" "}No baseline, checkout, donation obligation, or credit can be
            created from this page.
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="create-spending-heading">
          <SectionHeader
            eyebrow="Private prospective baseline"
            id="create-spending-heading"
            title="Freeze the optional expense before it is cancelled or reduced."
          >
            Merchant, order, billing, and evidence details are owner-private and
            absent from the public projection. A compatible scoped reviewer
            must accept the baseline before an offer can open. The reviewer is
            not the donation-verification authority.
          </SectionHeader>
          <form action={createDirectSpendingUpgradeOfferAction} className="panel form-stack">
            <div className="form-grid">
              <label>
                Allowed expense type
                <select name="category" defaultValue="" required>
                  <option value="" disabled>
                    Choose one allowed type
                  </option>
                  <option value="recurring_subscription">
                    Optional subscription or automatic renewal
                  </option>
                  <option value="cancellable_reservation_or_service">
                    Cancellable optional reservation or service
                  </option>
                  <option value="pending_order_or_upgrade">
                    Pending optional order, product upgrade, or service upgrade
                  </option>
                </select>
              </label>
              <label>
                Planned change after matching
                <select name="planned_action" defaultValue="cancel" required>
                  <option value="cancel">Cancel</option>
                  <option value="reduce">Reduce</option>
                  <option value="downgrade">Downgrade</option>
                </select>
              </label>
            </div>

            <DirectSpendingUpgradeAmountFields />

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
                <select name="privacy_mode" defaultValue="private_until_completed" required>
                  <option value="private_until_completed">
                    Hide identities until successful completion
                  </option>
                  <option value="public">Public after baseline acceptance</option>
                </select>
                <span className="field-note">
                  Merchant and evidence details stay private in both modes.
                </span>
              </label>
            </div>

            <EveryOrgNonprofitSelector
              inputName="upgraded_recipient_identifier"
              label="High-impact nonprofit for both direct donations"
              description="If matched, your released amount and the matcher's independent donation go directly to this same Every.org recipient. There is no fictional original charity."
              defaultQuery="GiveWell Top Charities Fund"
              placeholder="Search GiveWell Top Charities Fund"
            />

            <div className="form-grid">
              <label>
                Private merchant or service label
                <input
                  autoComplete="off"
                  maxLength={180}
                  minLength={2}
                  name="private_merchant_label"
                  placeholder="Visible only in the private evidence record"
                  required
                />
              </label>
              <label>
                Optional private order or billing reference
                <input
                  autoComplete="off"
                  maxLength={500}
                  name="private_reference"
                  placeholder="Do not enter passwords or full payment details"
                />
              </label>
            </div>
            <label>
              Private description of the prospective expense
              <textarea
                maxLength={1200}
                minLength={20}
                name="private_description"
                placeholder="Describe the optional renewal, cancellable service, pending order, or upgrade and why it was genuinely planned before this offer."
                required
                rows={4}
              />
              <span className="field-note">
                This is reviewed as a prospective counterfactual baseline. It
                is never shown in the public directory.
              </span>
            </label>

            <details className="panel">
              <summary>Excluded expenses — read before attesting</summary>
              <p>
                Do not use Spending Upgrade for food, meals, nutrition or
                hydration; medication, medical, mental-health, dental,
                reproductive-health or disability support; housing, utilities,
                insurance, essential household goods or transport; required
                education or work costs; debt, tax, fine, legal or support
                obligations; child, elder, dependent or pet care; safety-related
                spending; or any donation funded by BNPL, a cash advance, a
                payday loan, or new credit-card debt.
              </p>
            </details>
            <label className="check-row">
              <input name="excluded_categories_confirmed" type="checkbox" required />
              <span>
                None of the excluded essential, care, safety, debt, or harmful
                categories applies.
              </span>
            </label>
            <label className="check-row">
              <input name="nonessential_attested" type="checkbox" required />
              <span>This expense is genuinely optional and nonessential.</span>
            </label>
            <label className="check-row">
              <input name="no_material_harm_attested" type="checkbox" required />
              <span>
                Cancelling or reducing it will not create a material health,
                safety, care, housing, work, education, or legal risk.
              </span>
            </label>
            <label className="check-row">
              <input name="preexisting_plan_attested" type="checkbox" required />
              <span>
                I genuinely planned this expense before creating the offer.
              </span>
            </label>
            <label className="check-row">
              <input name="not_already_cancelled_attested" type="checkbox" required />
              <span>
                I have not already cancelled, abandoned, downgraded, or reduced
                it.
              </span>
            </label>
            <label className="check-row">
              <input name="available_funds_attested" type="checkbox" required />
              <span>
                The donation would use currently available funds, not BNPL,
                cash advances, payday lending, or new credit-card debt.
              </span>
            </label>
            <label className="check-row">
              <input name="not_otherwise_donating_attested" type="checkbox" required />
              <span>
                Without a match I was going to spend this money, not donate it.
              </span>
            </label>

            <button
              className="button button-primary"
              disabled={!config.readyForCommitments}
              type="submit"
            >
              Freeze private baseline for review
            </button>
            <p className="field-note">
              No match means no donation obligation, no Every.org checkout, no
              requirement to complete the original purchase, and no impact
              credit. Matching creates only two direct donations; Moral Trade
              never receives, combines, splits, transfers, or re-donates funds
              and never pays the creator.
            </p>
          </form>
        </section>

        <section className="section section-subtle" aria-labelledby="open-spending-heading">
          <SectionHeader
            eyebrow="Open and matched"
            id="open-spending-heading"
            title="Review public-safe terms without exposing the private purchase."
          >
            Public cards show only the allowed category, exact amounts,
            nonprofit, deadline, and coarse review state. Merchant names,
            order numbers, bills, and cancellation proof remain private.
          </SectionHeader>
          <div className="data-grid">
            {pageData.publicOffers.map((offer) => {
              const isOwn = ownOfferIds.has(offer.id);
              const hasCandidate = candidateOfferIds.has(offer.id);
              return (
                <article className="panel data-card" key={offer.id}>
                  <p className="detail-kicker">
                    Spending subtype · {statusLabel(offer.status)}
                  </p>
                  <h3>
                    Convert {formatDirectDonationUpgradeUsd(
                      offer.creator_diversion_amount_cents,
                    )} and add {formatDirectDonationUpgradeUsd(
                      offer.matcher_amount_cents,
                    )} for {offer.upgraded_recipient.name}
                  </h3>
                  <p>
                    Private baseline category: {categoryLabel(offer.category)};
                    planned action: {plannedActionLabel(offer.planned_action)}.
                  </p>
                  <p>
                    No match: no donation or purchase obligation. Match: creator
                    and matcher make two separate direct donations to the same
                    recipient.
                  </p>
                  <dl className="detail-grid">
                    <div>
                      <dt>Prospective spend</dt>
                      <dd>{formatDirectDonationUpgradeUsd(offer.planned_spend_amount_cents)}</dd>
                    </div>
                    <div>
                      <dt>Spending remainder</dt>
                      <dd>{formatDirectDonationUpgradeUsd(offer.retained_spending_amount_cents)}</dd>
                    </div>
                    <div>
                      <dt>Baseline review</dt>
                      <dd>{statusLabel(offer.baseline_review_status)}</dd>
                    </div>
                    <div>
                      <dt>Spending-change review</dt>
                      <dd>{statusLabel(offer.spending_change_review_status ?? "not submitted")}</dd>
                    </div>
                    <div>
                      <dt>Match by</dt>
                      <dd><DirectUpgradeLocalDateTime value={offer.match_deadline_at} /></dd>
                    </div>
                    <div>
                      <dt>Converted-spending credit</dt>
                      <dd>{formatDirectDonationUpgradeUsd(offer.converted_spending_gross_amount_cents)}</dd>
                    </div>
                  </dl>
                  <div className="form-actions">
                    <Link
                      className="button button-secondary"
                      href={`/donation-upgrades/spending/${offer.id}`}
                    >
                      View exact Spending Upgrade terms
                    </Link>
                    {!isOwn && !hasCandidate && offer.status === "open" ? (
                      <form action={joinDirectSpendingUpgradeOfferAction} className="form-stack">
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <label className="check-row">
                          <input name="matcher_commitment" type="checkbox" required />
                          <span>
                            If selected, I will donate exactly {formatDirectDonationUpgradeUsd(
                              offer.matcher_amount_cents,
                            )} directly to {offer.upgraded_recipient.name}. I do
                            not receive or control the creator&apos;s donation.
                          </span>
                        </label>
                        <button className="button button-primary" type="submit">
                          Match with a separate direct donation
                        </button>
                      </form>
                    ) : isOwn && ["open", "review_required"].includes(offer.status) ? (
                      <form action={cancelDirectSpendingUpgradeOfferAction}>
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <button className="button button-secondary" type="submit">
                          Cancel unmatched offer
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!pageData.publicOffers.length ? (
              <article className="panel data-card">
                <h3>No reviewed Spending Upgrades are listed</h3>
                <p>
                  A newly frozen baseline remains private and review required;
                  it does not appear here until accepted.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="spending-activity-heading">
          <SectionHeader
            eyebrow="Your activity"
            id="spending-activity-heading"
            title="Donation fulfillment and spending evidence stay separate."
          >
            Every.org&apos;s exact partner webhook is the sole authority for a
            donation. A scoped private evidence decision separately determines
            whether creator credit may be described as converted spending.
          </SectionHeader>
          <div className="data-grid">
            {pageData.viewerObligations.map((obligation) => (
              <article className="panel data-card" key={obligation.id}>
                <p className="detail-kicker">
                  {statusLabel(obligation.obligation_kind)} · {statusLabel(obligation.status)}
                </p>
                <h3>
                  {formatDirectDonationUpgradeUsd(obligation.expected_amount_cents)} to{" "}
                  {obligation.expected_recipient.name}
                </h3>
                <p>
                  Due <DirectUpgradeLocalDateTime value={obligation.due_at} />.
                </p>
                {obligation.obligation_kind === "creator_converted_spending" ? (
                  <p className="field-note">
                    Provider verification proves only the donation. Converted-
                    spending credit also requires accepted private cancellation
                    or reduction evidence.
                  </p>
                ) : (
                  <p className="field-note">
                    This independent matcher donation is recorded as incremental
                    when the provider verifies it, even if creator evidence later
                    fails review.
                  </p>
                )}
                <div className="form-actions">
                  <Link
                    className="button button-secondary"
                    href={`/donation-upgrades/spending/${obligation.offer_id}`}
                  >
                    View commitment
                  </Link>
                  {["pending", "checkout_started"].includes(obligation.status) ? (
                    <form action={startDirectSpendingUpgradeCheckoutAction}>
                      <input name="offer_id" type="hidden" value={obligation.offer_id} />
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
                </div>
              </article>
            ))}
            {pageData.creatorOffers
              .filter(
                (offer) =>
                  !pageData.viewerObligations.some(
                    (obligation) => obligation.offer_id === offer.id,
                  ),
              )
              .map((offer) => (
                <article className="panel data-card" key={`creator:${offer.id}`}>
                  <p className="detail-kicker">Creator · {statusLabel(offer.status)}</p>
                  <h3>Private Spending Upgrade baseline</h3>
                  <p className="field-note">
                    No direct donation obligation is due while this offer is
                    review required, open, expired, or cancelled without a match.
                  </p>
                  <Link
                    className="button button-secondary"
                    href={`/donation-upgrades/spending/${offer.id}`}
                  >
                    View private status
                  </Link>
                </article>
              ))}
            {!pageData.viewerObligations.length && !pageData.creatorOffers.length ? (
              <article className="panel data-card">
                <h3>No Spending Upgrade activity yet</h3>
                <p>Your private baselines and any direct donation obligations appear here.</p>
              </article>
            ) : null}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="spending-flow-heading">
          <SectionHeader
            eyebrow="Verification boundary"
            id="spending-flow-heading"
            title="Three separate facts; no causal shortcut."
          />
          <div className="step-card-grid">
            <StepCard index={1} title="Review the prospective baseline privately.">
              If compatible reviewer authority is unavailable, the baseline
              stays review required and cannot open for matching.
            </StepCard>
            <StepCard index={2} title="Match into two direct donations only.">
              The creator donates the released amount and the matcher donates
              independently to the same nonprofit. Moral Trade never takes custody.
            </StepCard>
            <StepCard index={3} title="Verify donations through Every.org.">
              Browser returns, screenshots, and self-attestation do not prove a
              donation; only the exact partner webhook does.
            </StepCard>
            <StepCard index={4} title="Review cancellation or reduction separately.">
              Creator converted-spending credit is minted once only when both
              the creator donation and private spending-change evidence pass.
            </StepCard>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
