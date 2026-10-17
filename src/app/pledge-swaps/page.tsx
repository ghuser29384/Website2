import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, IconMark } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./pledge-swaps.module.css";

export const metadata: Metadata = {
  title: "Pledge swaps",
  description:
    "Make a clear two-way pledge: each person commits to one action, both approve the same terms, and nothing begins before final confirmation.",
  alternates: {
    canonical: "/pledge-swaps",
  },
  openGraph: {
    title: "Pledge swaps",
    description:
      "Turn different priorities into a voluntary exchange with clear actions, lightweight evidence, a fixed duration, and explicit exit rules.",
    url: getAbsoluteUrl("/pledge-swaps"),
    type: "website",
  },
};

const DECISIONS = [
  {
    index: "01",
    icon: "checklist",
    title: "Your action",
    detail: "Say what you will do in plain language, including scope and exclusions.",
  },
  {
    index: "02",
    icon: "swap",
    title: "Their action",
    detail: "Name the reciprocal promise you want in return.",
  },
  {
    index: "03",
    icon: "evidence",
    title: "How to check",
    detail: "Choose a check-in, private artifact, or optional witness.",
  },
  {
    index: "04",
    icon: "lock",
    title: "When it ends",
    detail: "Set the duration, start condition, and exit rule.",
  },
] as const;

const PROCESS = [
  {
    index: "01",
    icon: "checklist",
    title: "Write the two promises",
    detail: "Describe what you will do and what you want the other person to do.",
  },
  {
    index: "02",
    icon: "tune",
    title: "Set the boundaries",
    detail: "Add duration, evidence, and an exit rule. Keep evidence proportional to the action.",
  },
  {
    index: "03",
    icon: "review",
    title: "Review the same proposal",
    detail: "A match candidate is still only a suggestion. Safety, privacy, and authenticity are checked before reliance.",
  },
  {
    index: "04",
    icon: "lock",
    title: "Both confirm, then begin",
    detail: "The terms are frozen. Each person gives a fresh final confirmation before the start date.",
  },
] as const;

const EVIDENCE_OPTIONS = [
  {
    icon: "checklist",
    title: "Simple check-in",
    detail: "A dated declaration or periodic progress note.",
    label: "Good default",
  },
  {
    icon: "evidence",
    title: "Private artifact",
    detail: "A redacted receipt, log, or photo visible only to authorized reviewers.",
    label: "When needed",
  },
  {
    icon: "hands",
    title: "Trusted witness",
    detail: "An optional private statement from someone with direct knowledge.",
    label: "Optional",
  },
] as const;

const STATES = [
  {
    title: "Candidate",
    detail: "Two pledges appear compatible.",
    status: "No obligation",
  },
  {
    title: "Review",
    detail: "Terms, evidence, safety, and privacy are checked.",
    status: "Still editable",
  },
  {
    title: "Confirm",
    detail: "The exact proposal is frozen and shown to both people.",
    status: "Fresh approval",
  },
  {
    title: "Active",
    detail: "The swap begins only after both confirmations.",
    status: "Reliance begins",
  },
] as const;

const SAFETY_BOUNDARIES = [
  {
    index: "01",
    title: "Voluntary",
    detail: "Either person may decline a proposal without an outside penalty.",
  },
  {
    index: "02",
    title: "No hidden leverage",
    detail: "No intimidation, private-information threats, or reputational pressure.",
  },
  {
    index: "03",
    title: "Privacy first",
    detail: "Share the minimum evidence needed, privately by default.",
  },
  {
    index: "04",
    title: "Review before trust",
    detail: "Published terms are not enough; reliance requires review and confirmation.",
  },
] as const;

function SectionIntro({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <div className={styles.sectionIntro}>
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

function SwapArrow() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 8h13" />
      <path d="m13 4 4 4-4 4" />
      <path d="M20 16H7" />
      <path d="m11 12-4 4 4 4" />
    </svg>
  );
}

export default async function PledgeSwapsPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const createHref = isAuthenticated
    ? "/offers/new?mode=pledge"
    : "/signup?returnTo=/offers/new%3Fmode%3Dpledge";

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
        <Breadcrumbs items={[{ href: "/pledge-swaps", label: "Pledge swaps" }]} />
      </header>

      <main className={`mt-product-main ${styles.main}`} data-mt-surface="pledge-swaps" id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="pledge-swaps-heading">
          <div className={styles.heroCopy}>
            <h1 id="pledge-swaps-heading">Make a promise. Get a promise you value.</h1>
            <p className={styles.heroText}>
              A pledge swap is a simple two-way agreement: you commit to one action, another
              person commits to another, and both of you approve the same terms before anything
              starts.
            </p>
            <div className={styles.actions}>
              <Link className="button button-primary" href="/offers?mode=pledge">
                Browse pledge swaps
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create a pledge swap
              </Link>
            </div>
            <p className={styles.heroNote}>
              No match, no obligation. Both sides confirm before the swap begins.
            </p>
          </div>

          <aside className={styles.heroExample} aria-label="Illustrative pledge swap">
            <div className={styles.exampleHeader}>
              <span>Illustrative example</span>
              <strong>Not an active deal</strong>
            </div>

            <div className={styles.swapCard}>
              <div className={`${styles.promise} ${styles.promiseA}`}>
                <span className={styles.avatar} aria-hidden="true">
                  A
                </span>
                <div>
                  <small>Person A pledges</small>
                  <strong>Go meat-free for 30 days.</strong>
                  <p>Weekly private check-in.</p>
                </div>
              </div>

              <div className={styles.swapBridge}>
                <SwapArrow />
                <span>in exchange for</span>
              </div>

              <div className={`${styles.promise} ${styles.promiseB}`}>
                <span className={styles.avatar} aria-hidden="true">
                  B
                </span>
                <div>
                  <small>Person B pledges</small>
                  <strong>Donate $100 to global health.</strong>
                  <p>Redacted receipt, shared privately.</p>
                </div>
              </div>
            </div>

            <dl className={styles.exampleTerms}>
              <div>
                <dt>Duration</dt>
                <dd>30 days</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>Lightweight and private</dd>
              </div>
              <div>
                <dt>Start</dt>
                <dd>After both confirm</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className={styles.definition} aria-label="Pledge swap definition">
          <p>A pledge swap, in one line</p>
          <blockquote>
            <span>“I’ll do this”</span> if <span>“you do that.”</span>
          </blockquote>
        </section>

        <section className={styles.section} aria-labelledby="decisions-heading">
          <SectionIntro id="decisions-heading" title="One agreement. Four decisions.">
            Everything important is visible before anyone relies on the swap. The goal is not
            paperwork. It is a shared understanding of exactly what each person is agreeing to.
          </SectionIntro>

          <div className={styles.decisionGrid}>
            {DECISIONS.map((decision) => (
              <article className={styles.decision} key={decision.index}>
                <div className={styles.decisionTop}>
                  <span>{decision.index}</span>
                  <IconMark name={decision.icon} />
                </div>
                <h3>{decision.title}</h3>
                <p>{decision.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.exampleSection}`} aria-labelledby="example-heading">
          <SectionIntro id="example-heading" title="Different priorities can still make a good trade.">
            Each person takes on an action that matters more to the other person than it costs
            them to do. Both can prefer the swap to the no-deal default.
          </SectionIntro>

          <div className={styles.priorityExample}>
            <article className={`${styles.priorityPerson} ${styles.priorityPersonA}`}>
              <div>
                <p>Person A cares most about</p>
                <h3>Animal welfare</h3>
              </div>
              <div className={styles.priorityCommitment}>
                <span>Person A agrees to</span>
                <strong>Support Person B&apos;s global-health priority with a donation.</strong>
              </div>
            </article>

            <div className={styles.prioritySwap} aria-hidden="true">
              <SwapArrow />
            </div>

            <article className={`${styles.priorityPerson} ${styles.priorityPersonB}`}>
              <div>
                <p>Person B cares most about</p>
                <h3>Global health</h3>
              </div>
              <div className={styles.priorityCommitment}>
                <span>Person B agrees to</span>
                <strong>Support Person A&apos;s animal-welfare priority with a diet change.</strong>
              </div>
            </article>
          </div>

          <p className={styles.exampleCaption}>
            <span aria-hidden="true">✓</span>
            The swap does not require either person to adopt the other&apos;s worldview. It only
            requires a voluntary exchange both prefer to no deal.
          </p>
        </section>

        <section className={`${styles.section} ${styles.processSection}`} aria-labelledby="process-heading">
          <SectionIntro id="process-heading" title="From idea to active swap.">
            At each step, the page should answer one question. Nothing becomes reliance-bearing
            until the exact proposal is frozen and both people confirm it again.
          </SectionIntro>

          <ol className={styles.processList}>
            {PROCESS.map((step) => (
              <li key={step.index}>
                <span className={styles.processNumber}>{step.index}</span>
                <span className={styles.processIcon}>
                  <IconMark name={step.icon} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="evidence-heading">
          <div className={styles.evidenceLayout}>
            <div className={styles.evidenceIntro}>
              <h2 id="evidence-heading">Evidence should be as light as possible.</h2>
              <p>
                Use the least intrusive evidence that makes the promise reviewable. Evidence
                supports an action claim; it is not a moral score or a guarantee.
              </p>
            </div>

            <div className={styles.evidenceOptions}>
              {EVIDENCE_OPTIONS.map((option) => (
                <article className={styles.evidenceOption} key={option.title}>
                  <IconMark name={option.icon} />
                  <div>
                    <h3>{option.title}</h3>
                    <p>{option.detail}</p>
                  </div>
                  <small>{option.label}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.statesSection}`} aria-labelledby="states-heading">
          <SectionIntro id="states-heading" title="A suggested match is not a deal.">
            The status should always tell people what they may safely rely on. Before final
            confirmation, either person can walk away without creating an obligation.
          </SectionIntro>

          <ol className={styles.stateTimeline}>
            {STATES.map((state, index) => (
              <li className={index === STATES.length - 1 ? styles.activeState : undefined} key={state.title}>
                <span className={styles.stateDot} aria-hidden="true" />
                <h3>{state.title}</h3>
                <p>{state.detail}</p>
                <strong>{state.status}</strong>
              </li>
            ))}
          </ol>

          <details className={styles.reviewDetails}>
            <summary>
              What does review check?
              <span aria-hidden="true">+</span>
            </summary>
            <div>
              <article>
                <strong>Voluntary and safe</strong>
                <p>No threats, hidden leverage, vulnerable-person pressure, or hazardous asks.</p>
              </article>
              <article>
                <strong>Truthful and authorized</strong>
                <p>Each person binds only their own actions and supplies proportionate evidence.</p>
              </article>
              <article>
                <strong>Private and change-controlled</strong>
                <p>
                  Only necessary information is shared. Material changes require a new proposal
                  and renewed confirmation.
                </p>
              </article>
            </div>
          </details>
        </section>

        <section className={styles.safety} aria-labelledby="safety-heading">
          <div className={styles.safetyIntro}>
            <h2 id="safety-heading">Trades, not pressure campaigns.</h2>
            <p>
              The design centers autonomy, narrow evidence, and explicit exit rules. A swap should
              create a voluntary gain, not a new way to coerce someone.
            </p>
          </div>

          <div className={styles.safetyGrid}>
            {SAFETY_BOUNDARIES.map((boundary) => (
              <article key={boundary.index}>
                <span>{boundary.index}</span>
                <h3>{boundary.title}</h3>
                <p>{boundary.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="pledge-cta-heading">
          <h2 id="pledge-cta-heading">Ready to turn a difference into a deal?</h2>
          <div className={styles.actions}>
            <Link className="button button-primary" href="/offers?mode=pledge">
              Browse pledge swaps
            </Link>
            <Link className="button button-secondary" href={createHref}>
              Create a pledge swap
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
