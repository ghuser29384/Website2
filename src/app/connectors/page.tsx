import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  getTradeDonationProviderConfig,
  TRADE_DONATION_TARGETS,
} from "@/lib/trade-donation";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./connectors.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Connectors",
  description:
    "Inspect Moral Trade payment and research-source connectors, their verification boundaries, and their launch state.",
};

export default async function ConnectorsPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const provider = getTradeDonationProviderConfig();

  return (
    <div className="page-shell marketplace-product-shell">
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showSearch={false}
          showLogout={isAuthenticated}
        />
      </header>
      <main className={styles.page} data-mt-surface="connectors" id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Connector registry</p>
            <h1>External capabilities, with explicit trust boundaries.</h1>
            <p className={styles.lead}>
              Connectors make an external action easier to complete or verify. They do not turn a
              cited organization into a Moral Trade partner, reviewer, guarantor, or endorser.
            </p>
          </div>
          <dl className={styles.heroFacts}>
            <div><dt>Money custody</dt><dd>External provider</dd></div>
            <div><dt>Donation activation</dt><dd>Verified webhook</dd></div>
            <div><dt>Research labels</dt><dd>Source provenance</dd></div>
            <div><dt>Partnership claims</dt><dd>None</dd></div>
          </dl>
        </section>

        <section className={styles.registry} aria-labelledby="operational-connectors-heading">
          <div className={styles.sectionHeading}>
            <p>Operational connector</p>
            <h2 id="operational-connectors-heading">Every.org pledge-donation checkout</h2>
          </div>
          <article className={styles.connectorCard}>
            <div className={styles.connectorSummary}>
              <div className={`${styles.status} ${provider.ready ? styles.ready : styles.blocked}`}>
                <span />
                {provider.ready ? "Launch ready" : "Fail-closed"}
              </div>
              <h3>Donation first, action second.</h3>
              <p>
                After both participants confirm the same frozen agreement version, the named payer
                completes a one-time gift on Every.org. Moral Trade activates the reciprocal action
                only after the partner webhook matches the exact amount, currency, frequency,
                recipient, signed metadata, and unique charge.
              </p>
            </div>
            <dl className={styles.boundaries}>
              <div><dt>Environment</dt><dd>{provider.environment}</dd></div>
              <div><dt>Platform custody</dt><dd>None</dd></div>
              <div><dt>Screenshot accepted</dt><dd>No</dd></div>
              <div><dt>Donor PII persisted</dt><dd>No</dd></div>
              <div><dt>Current blocker</dt><dd>{provider.ready ? "None" : provider.blockers[0] ?? "Configuration incomplete"}</dd></div>
            </dl>
          </article>

          <div className={styles.targets}>
            {TRADE_DONATION_TARGETS.map((target) => (
              <article key={target.id}>
                <div>
                  <p>{target.causeArea}</p>
                  <h3>{target.shortName}</h3>
                </div>
                <p>{target.description}</p>
                <small className={styles.checkedAt}>Source checked {target.evidenceCheckedAt}</small>
                <div className={styles.targetLinks}>
                  <a href={`https://www.every.org/${target.everyOrgSlug}`} rel="noreferrer" target="_blank">
                    Every.org recipient
                  </a>
                  <a href={target.evidenceSourceUrl} rel="noreferrer" target="_blank">
                    {target.evidenceSourceLabel}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.registry} aria-labelledby="research-connectors-heading">
          <div className={styles.sectionHeading}>
            <p>Research-source connectors</p>
            <h2 id="research-connectors-heading">Credibility through traceable claims, not borrowed logos.</h2>
          </div>
          <div className={styles.sourceGrid}>
            <article>
              <span>GiveWell</span>
              <h3>Donation-research provenance</h3>
              <p>
                A destination may link to GiveWell&apos;s current public analysis or fund methodology.
                Moral Trade should show the source, retrieval date, and destination snapshot. The
                label must not say “approved by GiveWell” unless GiveWell gives written permission.
              </p>
              <a href="https://www.givewell.org/top-charities-fund" rel="noreferrer" target="_blank">
                Open source methodology
              </a>
            </article>
            <article>
              <span>Forethought</span>
              <h3>Moral-trade research provenance</h3>
              <p>
                Moral Trade can cite the public papers that motivate trade, compromise, and moral
                public-goods mechanisms. Citation establishes intellectual provenance; it is not an
                institutional review of the product.
              </p>
              <a href="https://www.forethought.org/research" rel="noreferrer" target="_blank">
                Open research index
              </a>
            </article>
          </div>
        </section>

        <section className={styles.guardrail}>
          <div>
            <p className={styles.kicker}>Public claim policy</p>
            <h2>Never convert technical integration into an endorsement claim.</h2>
          </div>
          <p>
            “Donation processed through Every.org” and “research source: GiveWell” are auditable
            statements. “Official GiveWell connector,” “Forethought verified,” or “partnered with”
            require a signed relationship and explicit permission to use that wording and branding.
          </p>
          <Link className="button button-primary" href="/pledge-swaps">
            Return to pledge swaps
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
