import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  assertDonationCancellationCapability,
  getDonationCancellationDeploymentEnvironment,
  getDonationCancellationMarkets,
  getDonationCancellationRecipients,
  getDonationCancellationRoundBySlug,
  getDonationCancellationRounds,
  paymentModeCopy,
  runDonationCancellationCopyPreflight,
  simulateDonationCancellationRegistration,
} from "@/lib/moral-trade/donation-cancellation-clearinghouse";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { DonationCancellationNonMvpNotice } from "../../non-mvp-notice";

interface RegisterPageProps {
  params: Promise<{ roundSlug: string }>;
}

export function generateStaticParams() {
  return getDonationCancellationRounds({ environment: "production" }).map((round) => ({
    roundSlug: round.slug,
  }));
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { roundSlug } = await params;
  const round = getDonationCancellationRoundBySlug(roundSlug);

  if (!round) {
    return { title: "Donation clearinghouse registration unavailable" };
  }

  return {
    alternates: {
      canonical: `/donation-cancellation/${round.slug}/register`,
    },
    description:
      "Status: non-MVP labs/research mechanism. Production registration, payment authorization, capture, routing, and settlement are disabled.",
    openGraph: {
      description: "Donation Cancellation Clearinghouse registration is not part of the current CGPP MVP.",
      title: "Donation clearinghouse registration unavailable",
      type: "article",
      url: getAbsoluteUrl(`/donation-cancellation/${round.slug}/register`),
    },
    title: "Donation clearinghouse registration unavailable",
  };
}

function formatMinor(amountMinor: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountMinor / 100);
}

export default async function DonationCancellationRegisterPage({ params }: RegisterPageProps) {
  const { roundSlug } = await params;
  const publicDecision = assertDonationCancellationCapability(
    "register_intended_donation",
    { role: "public" },
    getDonationCancellationDeploymentEnvironment(),
    {
      featureEnabled: false,
      labsEnabled: false,
    },
  );

  if (!publicDecision.ok) {
    return <DonationCancellationNonMvpNotice decision={publicDecision} title="Donation Cancellation Clearinghouse registration is not currently available." />;
  }

  const round = getDonationCancellationRoundBySlug(roundSlug);

  if (!round) {
    notFound();
  }

  const recipients = getDonationCancellationRecipients();
  const markets = getDonationCancellationMarkets();
  const approvedRecipients = recipients.filter((recipient) => recipient.reviewState === "approved" && recipient.paymentRouteState === "verified");
  const simulated = simulateDonationCancellationRegistration({
    acceptableRedirectRecipientIds: ["global-poverty-charity", "animal-welfare-charity"],
    currency: round.currency,
    environment: "development",
    grossAmountMinor: 10_000,
    intendedRecipientId: "fictional-watershed-restoration-a",
    markets,
    paymentMode: round.paymentMode,
    featureEnabled: true,
    priorityWeights: { animal_welfare: 10, global_health: 90 },
    recipients,
    redirectConsentMode: "preconsented_allowed_list",
    round,
    unacceptableRedirectRecipientIds: ["route-blocked-health-charity"],
    userId: "demo-registering-user",
  });
  const consentCopy =
    "You are making a payment-backed intended donation. Your money will go either to your original intended recipient or, for matched opposed amounts, to a mutually acceptable redirect recipient under your frozen preferences. If no compatible opposed donation is found, your money goes to your original intended recipient.";
  const copyPreflight = runDonationCancellationCopyPreflight(consentCopy);

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/donation-cancellation", label: "Cancel opposed donations" },
            { href: `/donation-cancellation/${round.slug}`, label: round.title },
            { href: `/donation-cancellation/${round.slug}/register`, label: "Register" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="register-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Registration flow</p>
            <h1 id="register-heading">Intended donation, priorities, review and payment.</h1>
            <p>
              This route renders the full registration contract and a deterministic development
              simulation. It does not submit production payment or create durable user records until
              the backend gates are connected.
            </p>
          </div>

          <div className="step-card-grid">
            <article className="panel step-card">
              <span className="step-index">01</span>
              <h3>Intended donation</h3>
              <p>
                You are registering a real intended donation. If no compatible opposed donation is
                found, this amount will be routed to your selected recipient.
              </p>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Recipient</dt>
                  <dd>Fictional Watershed Restoration A</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatMinor(10_000, round.currency)}</dd>
                </div>
                <div>
                  <dt>Detected market</dt>
                  <dd>Fictional watershed demo opposition</dd>
                </div>
              </dl>
            </article>

            <article className="panel step-card">
              <span className="step-index">02</span>
              <h3>Moral priorities and redirect preferences</h3>
              <p>
                These priorities are private by default. They are used to suggest redirect
                recipients. They are not a moral score, ranking, or public identity label.
              </p>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Visibility</dt>
                  <dd>aggregate_only</dd>
                </div>
                <div>
                  <dt>Accepted redirects</dt>
                  <dd>Global poverty charity, Animal welfare charity</dd>
                </div>
                <div>
                  <dt>Consent mode</dt>
                  <dd>Automatically redirect matched funds if accepted</dd>
                </div>
              </dl>
            </article>

            <article className="panel step-card">
              <span className="step-index">03</span>
              <h3>Final review and payment</h3>
              <p>{consentCopy}</p>
              <dl className="mpgf-summary-grid">
                <div>
                  <dt>Gross amount</dt>
                  <dd>{formatMinor(10_000, round.currency)}</dd>
                </div>
                <div>
                  <dt>Estimated fee</dt>
                  <dd>{formatMinor(0, round.currency)}</dd>
                </div>
                <div>
                  <dt>Estimated net</dt>
                  <dd>{formatMinor(10_000, round.currency)}</dd>
                </div>
                <div>
                  <dt>Fallback</dt>
                  <dd>Original intended destination</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="simulation-heading">
          <SectionHeader eyebrow="Development simulation" id="simulation-heading" title="Payment wording follows the actual configured mode.">
            {paymentModeCopy(round.paymentMode)}
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Registration state</p>
              <h3>{simulated.registration?.registrationState ?? "blocked"}</h3>
              <p>{simulated.ok ? "Development registration is eligible for matching." : simulated.blockers.join(", ")}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Payment state</p>
              <h3>{simulated.registration?.paymentState ?? "not confirmed"}</h3>
              <p>Production behavior remains fail-closed without provider authorization or compliant captured-funds support.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Copy preflight</p>
              <h3>{copyPreflight.status}</h3>
              <p>{copyPreflight.blockers.length ? copyPreflight.blockers.join(", ") : "No prohibited payment or moral-score language found."}</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="approved-heading">
          <SectionHeader eyebrow="Approved choices" id="approved-heading" title="Recipient choices are reviewed before registration.">
            If an intended recipient is not approved, the user may submit it for review, but cannot
            pay or register until approval and route verification are complete.
          </SectionHeader>
          <div className="data-grid">
            {approvedRecipients.slice(0, 4).map((recipient) => (
              <article className="panel data-card" key={recipient.id}>
                <p className="detail-kicker">{recipient.recipientType}</p>
                <h3>{recipient.name}</h3>
                <p>{recipient.publicDescription}</p>
              </article>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="button button-secondary" href={`/donation-cancellation/${round.slug}`}>
              Back to round
            </Link>
            <Link className="button button-secondary" href="/account/donation-cancellations">
              View dashboard states
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
