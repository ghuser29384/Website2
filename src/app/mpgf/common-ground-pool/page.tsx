import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { COMMON_GROUND_POOL_ROUTE } from "@/lib/mpgf/common-ground-pool";
import { demoMpgfAssuranceRound } from "@/lib/mpgf/data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { CommonGroundPoolBuilder } from "./common-ground-pool-builder";
import styles from "./common-ground-pool.module.css";

export const metadata: Metadata = {
  title: "Common Ground Pool | Moral Trade",
  description:
    "Build a no-capture proposal that shifts part of several priority budgets into one shared project while leaving every participant better off by their own estimate.",
  alternates: {
    canonical: COMMON_GROUND_POOL_ROUTE,
  },
  openGraph: {
    title: "Common Ground Pool | Moral Trade",
    description:
      "Coordinate a shared project across participants with different priorities, explicit defaults, private value estimates, and a mutually preferred cost split.",
    type: "website",
    url: getAbsoluteUrl(COMMON_GROUND_POOL_ROUTE),
  },
};

export const dynamic = "force-dynamic";

export default async function CommonGroundPoolPage() {
  const viewer = await getViewer();
  const currentRoundHref = `/mpgf/rounds/${demoMpgfAssuranceRound.id}`;

  return (
    <div className={styles.pageShell}>
      <header className={styles.hero}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <div className={styles.heroInner}>
          <Breadcrumbs
            items={[
              { href: "/mpgf", label: "Public Goods Fund" },
              { href: COMMON_GROUND_POOL_ROUTE, label: "Common Ground Pool" },
            ]}
          />
          <div className={styles.heroGrid}>
            <section className={styles.heroCopy}>
              <h1>Common Ground Pool</h1>
              <p>
                Fund one shared project across people with different priorities. Each participant
                keeps part of their own priority budget, contributes part to the shared project, and
                accepts only a split they prefer to acting alone.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryLink} href="#build-pool">
                  Build a pool proposal
                </a>
                <Link className={styles.secondaryLink} href={`${currentRoundHref}#common-ground-budget-preview`}>
                  Build your Common Ground Budget
                </Link>
              </div>
            </section>

            <aside className={styles.workedExample} aria-label="Worked Common Ground Pool example">
              <span>Worked example</span>
              <h2>Two $10,000 budgets, one shared project</h2>
              <div className={styles.exampleFlow}>
                <div>
                  <span>Animal-welfare funder contributes</span>
                  <strong>$5,000</strong>
                </div>
                <div>
                  <span>Long-term-future funder contributes</span>
                  <strong>$5,000</strong>
                </div>
                <div>
                  <span>Shared project receives</span>
                  <strong>$10,000</strong>
                </div>
                <div>
                  <span>Each retains for their own priority</span>
                  <strong>$5,000</strong>
                </div>
              </div>
              <p className={styles.exampleEquation}>
                If each privately values the shared project at 60 cents per dollar, each gets
                $5,000 of default-project value + $6,000 of shared-project value = $11,000 by their
                own estimate.
              </p>
            </aside>
          </div>
        </div>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <section id="build-pool" aria-labelledby="build-pool-heading">
          <div className={styles.sectionIntro}>
            <h2 id="build-pool-heading">Find a split that works by every participant&apos;s lights.</h2>
            <p>
              This browser-only builder tests the arithmetic and produces shareable draft terms. It
              does not save private valuations, create a commitment, or move money.
            </p>
          </div>
          <CommonGroundPoolBuilder />
        </section>

        <section className={styles.explanationSection} aria-labelledby="how-the-pool-works-heading">
          <h2 id="how-the-pool-works-heading">What the calculation means</h2>
          <p>
            A Common Ground Pool treats each participant&apos;s stated no-pool allocation as the
            baseline. The shared project works only when the participants&apos; combined value for it
            exceeds its full cost and the proposed cost share stays below each participant&apos;s own
            value share.
          </p>
          <div className={styles.explanationGrid}>
            <article className={styles.explanationItem}>
              <h3>1. Record the default</h3>
              <p>
                State what each participant controls and would otherwise fund. This is the comparison
                point for determining whether the pool creates a real gain.
              </p>
            </article>
            <article className={styles.explanationItem}>
              <h3>2. Estimate value privately</h3>
              <p>
                Each participant estimates how much one dollar to the shared project is worth relative
                to one dollar to their own default. These estimates stay local to the browser.
              </p>
            </article>
            <article className={styles.explanationItem}>
              <h3>3. Split the cost</h3>
              <p>
                The balanced suggestion allocates the target so that every contributor pays less than
                the value they receive. A manual split must pass the same tests.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.safetyBand} aria-labelledby="pool-boundaries-heading">
          <h2 id="pool-boundaries-heading">Before a draft could become binding</h2>
          <p>
            A favorable calculation is necessary but not sufficient. Any later commitment path must
            separately establish additionality, authority, project eligibility, externalities, exact
            consent, and payment readiness.
          </p>
          <div className={styles.safetyGrid}>
            <article>
              <h3>Genuine counterfactuals</h3>
              <p>
                Participants may not manufacture, inflate, or strategically worsen a default in order
                to obtain a better bargain.
              </p>
            </article>
            <article>
              <h3>No threats or harmful leverage</h3>
              <p>
                Threatening harm, withholding a safety action, or creating a bad outcome to extract a
                contribution is not an eligible pool proposal.
              </p>
            </article>
            <article>
              <h3>Independent project review</h3>
              <p>
                The shared project must have a reviewed recipient, lawful scope, evidence plan, and no
                disqualifying effects on people outside the agreement.
              </p>
            </article>
            <article>
              <h3>Frozen, unanimous terms</h3>
              <p>
                Every participant must accept the same project, target, contribution split, fallback,
                deadline, and review terms before any later authorization can be requested.
              </p>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
