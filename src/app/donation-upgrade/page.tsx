import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import {
  DonationUpgradeCampaignLink,
  DonationUpgradeCampaignTracker,
} from "./campaign-analytics";
import styles from "./donation-upgrade.module.css";

const campaignVariant = "changes_where" as const;
const createHref =
  "/trades/new?structure=conditional-donation&utm_source=billboard&utm_medium=out_of_home&utm_campaign=donation_upgrade_2026&utm_content=changes_where";

const description = truncateDescription(
  "Donation Upgrade lets one new donation add money and redirect a genuine planned donation to a reviewed destination, while preserving the original donation if no match appears.",
);

export const metadata: Metadata = {
  title: "Donation Upgrade",
  description,
  alternates: { canonical: "/donation-upgrade" },
  openGraph: {
    title: "Donation Upgrade: the second donation changes where the first goes",
    description,
    type: "website",
    url: getAbsoluteUrl("/donation-upgrade"),
  },
  twitter: {
    card: "summary",
    title: "Donation Upgrade",
    description,
  },
};

function DonationUpgradeDiagram() {
  return (
    <svg
      aria-labelledby="donation-upgrade-diagram-title donation-upgrade-diagram-description"
      className={styles.diagram}
      role="img"
      viewBox="0 0 760 470"
    >
      <title id="donation-upgrade-diagram-title">How a Donation Upgrade changes the outcome</title>
      <desc id="donation-upgrade-diagram-description">
        One black ten-dollar planned donation and one new blue ten-dollar donation meet at a
        junction. Two blue ten-dollar donations continue to the reviewed destination. A faint
        fallback path shows the original ten dollars proceeding alone when no match appears.
      </desc>
      <defs>
        <linearGradient id="du-blue" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6d86ff" />
          <stop offset="0.55" stopColor="#3658f5" />
          <stop offset="1" stopColor="#1736b8" />
        </linearGradient>
        <filter id="du-shadow" height="180%" width="180%" x="-40%" y="-40%">
          <feDropShadow dx="0" dy="8" floodColor="#111827" floodOpacity="0.22" stdDeviation="8" />
        </filter>
      </defs>

      <path className={styles.plannedTrack} d="M35 246H355" />
      <path className={styles.newTrack} d="M213 397L377 253" />
      <path className={styles.upgradedTrack} d="M390 232C454 232 459 174 522 174H694" />
      <path className={styles.upgradedTrack} d="M390 274C455 274 459 287 522 287H694" />
      <path className={styles.fallbackTrack} d="M390 307C478 338 567 360 690 369" />

      <g filter="url(#du-shadow)">
        <rect className={styles.plannedTile} height="76" rx="8" width="108" x="92" y="208" />
        <text className={styles.tileAmount} textAnchor="middle" x="146" y="257">$10</text>
        <text className={styles.tileCaption} textAnchor="middle" x="146" y="315">already planned</text>
      </g>

      <g filter="url(#du-shadow)">
        <rect fill="url(#du-blue)" height="76" rx="8" width="108" x="159" y="348" />
        <text className={styles.tileAmount} textAnchor="middle" x="213" y="397">$10</text>
        <text className={styles.newCaption} textAnchor="middle" x="213" y="452">new</text>
      </g>

      <g filter="url(#du-shadow)">
        <rect fill="url(#du-blue)" height="82" rx="10" width="82" x="350" y="212" />
      </g>

      <g filter="url(#du-shadow)">
        <rect fill="url(#du-blue)" height="72" rx="8" width="104" x="520" y="138" />
        <rect fill="url(#du-blue)" height="72" rx="8" width="104" x="520" y="251" />
        <text className={styles.tileAmount} textAnchor="middle" x="572" y="184">$10</text>
        <text className={styles.tileAmount} textAnchor="middle" x="572" y="297">$10</text>
      </g>

      <path className={styles.outputBracket} d="M642 138h18v185h-18" />
      <text className={styles.outputAmount} x="680" y="220">$20</text>
      <text className={styles.outputLabel} x="680" y="253">reviewed destination</text>

      <g opacity="0.32">
        <rect className={styles.plannedTile} height="62" rx="7" width="88" x="533" y="337" />
        <text className={styles.fallbackAmount} textAnchor="middle" x="577" y="377">$10</text>
      </g>
      <text className={styles.fallbackLabel} textAnchor="end" x="716" y="424">
        No match: original $10 proceeds
      </text>
    </svg>
  );
}

const verificationItems = [
  {
    title: "A real baseline",
    detail:
      "The creator records a genuine donation plan and the charity that receives it if nobody matches.",
  },
  {
    title: "A genuinely new match",
    detail:
      "The matcher separately authorizes new money. The matched branch uses two linked donations, not one pooled payment.",
  },
  {
    title: "A fixed deadline and fallback",
    detail:
      "The offer states when matching closes and what happens if the matched branch does not complete.",
  },
  {
    title: "Receipts before credit",
    detail:
      "Completion evidence is reviewed before the platform awards estimated impact credit.",
  },
] as const;

export default async function DonationUpgradePage() {
  const viewer = await getViewer();
  const authenticated = Boolean(viewer);

  return (
    <div className="page-shell">
      <DonationUpgradeCampaignTracker variant={campaignVariant} />

      <header className={styles.hero}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(authenticated)}
          {...getTopbarActions(authenticated)}
          showLogout={authenticated}
        />

        <div className={styles.heroInner}>
          <section className={styles.heroCopy}>
            <p className="eyebrow">Donation Upgrade</p>
            <h1>The second $10 changes where the first goes.</h1>
            <p className={styles.heroText}>
              A genuine $10 donation plan stays as the fallback. When another donor adds $10
              before the deadline, the original $10 and the new $10 become two linked, verified
              donations to the reviewed destination.
            </p>
            <div className="hero-actions">
              <DonationUpgradeCampaignLink
                className="button button-primary"
                href={createHref}
                variant={campaignVariant}
              >
                Create a Donation Upgrade
              </DonationUpgradeCampaignLink>
              <Link
                className="button button-secondary"
                href="/trades/new?structure=conditional-donation#open-conditional-heading"
              >
                See open upgrades
              </Link>
            </div>
          </section>

          <div className={styles.diagramShell}>
            <DonationUpgradeDiagram />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="donation-upgrade-outcomes">
          <div className="section-head">
            <p className="eyebrow">The counterfactual</p>
            <h2 id="donation-upgrade-outcomes">The original gift does not disappear.</h2>
            <p>
              Matching changes the destination of the planned donation and adds new funding. If
              nobody matches, the original donation still follows the recorded fallback plan.
            </p>
          </div>

          <div className={styles.outcomeGrid}>
            <article className={styles.outcomeCard}>
              <p className="detail-kicker">Without a match</p>
              <div className={styles.outcomeEquation}>
                <span className={styles.blackToken}>$10</span>
                <span aria-hidden="true">→</span>
                <span>original charity</span>
              </div>
              <p>The planned donation proceeds after the deadline.</p>
            </article>
            <article className={`${styles.outcomeCard} ${styles.outcomeCardActive}`}>
              <p className="detail-kicker">With a match</p>
              <div className={styles.outcomeEquation}>
                <span className={styles.blackToken}>$10</span>
                <span aria-hidden="true">+</span>
                <span className={styles.blueToken}>$10</span>
                <span aria-hidden="true">→</span>
                <span className={styles.bluePair}>$20</span>
              </div>
              <p>Two separate, linked donations reach the reviewed destination.</p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="donation-upgrade-verification">
          <div className="section-head">
            <p className="eyebrow">Counterfactual trust</p>
            <h2 id="donation-upgrade-verification">What the platform records and verifies</h2>
          </div>
          <div className={styles.verificationGrid}>
            {verificationItems.map((item, index) => (
              <article className="panel data-card" key={item.title}>
                <p className="detail-kicker">0{index + 1}</p>
                <h3>{item.title}</h3>
                <p className="route-text">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="donation-upgrade-credit">
          <div className={styles.creditGrid}>
            <div className="section-head">
              <p className="eyebrow">Impact credit</p>
              <h2 id="donation-upgrade-credit">Credit the change, not a slogan.</h2>
              <p>
                The transaction-level change is $10 of new funding plus a change in where a
                genuine planned $10 goes. That does not, by itself, establish twice the welfare
                impact. Any impact estimate must use the destinations, evidence, and stated model.
              </p>
            </div>
            <aside className={styles.notClaim}>
              <p className="detail-kicker">What this page does not claim</p>
              <strong>Not “every dollar doubles.”</strong>
              <span>
                Donation Upgrade describes a conditional funding and redirection mechanism, not a
                universal cost-effectiveness multiplier.
              </span>
            </aside>
          </div>
        </section>

        <section className={`section section-subtle ${styles.finalCta}`}>
          <div>
            <p className="eyebrow">Start with the fallback</p>
            <h2>Record what happens with and without the match.</h2>
          </div>
          <DonationUpgradeCampaignLink
            className="button button-primary"
            href={createHref}
            variant={campaignVariant}
          >
            Create a Donation Upgrade
          </DonationUpgradeCampaignLink>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
