import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { CHARITY_LINK_MODE, getEligibleCharityLinks } from "@/lib/charity-links";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const description =
  "Find registered charities with reviewed links to their own donation pages. These donations do not fund Moral Trade itself.";

export const metadata: Metadata = {
  title: "Donate to a charity",
  description,
  alternates: { canonical: "/donate" },
  openGraph: {
    title: "Donate on a charity’s own website",
    description,
    url: getAbsoluteUrl("/donate"),
    type: "website",
  },
};

// Re-evaluate the manual-review expiry on every request. No URL parameter,
// return from another website, or claimed payment can change donation state.
export const dynamic = "force-dynamic";

export default async function DonatePage() {
  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const charities = getEligibleCharityLinks();

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Charity links · independent gifts</p>
            <h1>Donate on a charity’s own website.</h1>
            <p className="hero-text">
              Choose a registered charity and open its official donation page. No Moral Trade
              account, saved card, or receiving-account setup is needed for this path.
            </p>
            <p className="hero-followup">
              Moral Trade does not collect your donation or add a platform fee. The charity&apos;s
              own page explains its payment options, any processing fees, receipts, and terms.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#direct-routes">Choose a charity</a>
              <a className="button button-secondary" href="#review-policy">What we check</a>
            </div>
            <ul className="hero-signals" aria-label="Donation trust notes">
              <li>Official charity pages</li>
              <li>No Moral Trade custody</li>
              <li>No Moral Trade platform fee</li>
              <li>No donation confirmation here</li>
            </ul>
          </section>
          <aside className="hero-panel panel" aria-labelledby="independent-gift-heading">
            <p className="eyebrow">Before you donate</p>
            <h2 id="independent-gift-heading">An independent gift</h2>
            <p>
              This directory does not enforce a conditional donation, escrow, refund, matching
              payment, or failure bonus. A gift made through these links cannot automatically
              complete a trade, satisfy a DAC or funding threshold, or earn a reward.
            </p>
            <p>
              Opening a link or returning here is not proof of payment. Moral Trade does not
              verify donations made through this directory or issue tax receipts.
            </p>
          </aside>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} data-donation-mode={CHARITY_LINK_MODE}>
        <section className="section section-white" id="direct-routes" aria-labelledby="charities-heading">
          <div className="section-head">
            <p className="eyebrow">Registered charities</p>
            <h2 id="charities-heading">Choose an official donation page</h2>
            <p>
              Each listing includes the legal entity, registration source, and date its official
              link was checked. Registration review is not a rating of impact, an endorsement,
              or a guarantee of tax deductibility in your country.
            </p>
          </div>
          {charities.length ? (
            <div className="data-grid donate-card-grid">
              {charities.map((charity) => (
                <article key={charity.id} className="panel data-card donate-card" data-charity-id={charity.id}>
                  <div className="clean-stack">
                    <p className="detail-kicker">{charity.causeArea}</p>
                    <h3>{charity.legalName}</h3>
                    <p className="route-text">{charity.summary}</p>
                    <p>
                      {charity.registration.authority} · Charity {charity.registration.number}
                      <br />Registered in {charity.registration.jurisdiction}
                    </p>
                    <p className="donate-card-note">
                      Registration and official link checked <time dateTime={charity.review.checkedOn}>{charity.review.checkedOn}</time>.
                      {" "}Review expires <time dateTime={charity.review.expiresOn}>{charity.review.expiresOn}</time> (UTC).
                    </p>
                    <p className="route-text">{charity.review.recipientNote}</p>
                    <p className="route-text">Destination: {new URL(charity.donationUrl).hostname}</p>
                    <div className="offer-actions">
                      <a
                        className="button button-primary"
                        href={charity.donationUrl}
                        data-donation-mode={CHARITY_LINK_MODE}
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        target="_blank"
                        aria-label={`Open ${charity.legalName} donation page (new tab)`}
                      >
                        Open charity donation page ↗
                      </a>
                      <a className="text-button" href={charity.registration.sourceUrl} rel="noopener noreferrer" target="_blank">
                        View registration record ↗
                      </a>
                      <a className="text-button" href={charity.review.ownershipSourceUrl} rel="noopener noreferrer" target="_blank">
                        View official source ↗
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel data-card data-card-wide" role="status">
              <h3>No reviewed charity links are available right now</h3>
              <p>Listings are hidden when their review expires or is incomplete. No payment has been requested or recorded.</p>
            </div>
          )}
        </section>
        <section className="section section-subtle" id="review-policy" aria-labelledby="review-policy-heading">
          <div className="section-head">
            <p className="eyebrow">Review boundaries</p>
            <h2 id="review-policy-heading">What we check, and what stays with the charity</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              <li>We manually match the charity&apos;s legal identity to a public registration record and check that its official website links to the donation page.</li>
              <li>Only reviewed links are listed. Suggestions, personal payees, and unverified projects are not automatically approved.</li>
              <li>Links expire from this directory after their review date unless reviewed again. A charity may change its website between checks.</li>
              <li>Check the recipient, currency, fees, recurring-payment choice, receipt rules, and refund policy on the charity&apos;s site before paying.</li>
              <li>Page views, performance, and link-click activity may be measured here, subject to your analytics preference. No donation amount or completion is recorded by this path.</li>
            </ul>
            <p>
              These donations do not fund Moral Trade itself. Existing conditional-payment and
              public-goods workflows are separate; they do not receive payment evidence from this directory.
            </p>
            <Link className="text-button" href="/contact">Report an incorrect or changed charity link</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
