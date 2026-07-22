import Link from "next/link";

import { formatMode } from "@/lib/offers";

import { WORKED_EXAMPLE } from "./offers-market-data";
import styles from "./offers-market.module.css";

export function OffersMarketSecondarySections() {
  return (
    <>
      <section className="mt-product-section" aria-labelledby="round-process-heading">
        <div className="mt-product-section-head">
          <div>
            <p className="mt-product-kicker">Operator-assisted clearing</p>
            <h2 id="round-process-heading">A real weekly rhythm without simulated activity</h2>
          </div>
          <p>
            The round organizes review and introductions. It does not create a commitment,
            expose private contact details, or guarantee compatibility.
          </p>
        </div>
        <div className={styles.roundSteps}>
          <article>
            <span>01</span>
            <h3>Submit or revise</h3>
            <p>
              Publish a bounded proposal at any time. Changes made before Thursday at
              17:00 UTC enter that week&apos;s review set.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Operator review</h3>
            <p>
              Terms, evidence expectations, safety boundaries, and plausible compatibility
              are checked before any introduction.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Monday introduction</h3>
            <p>
              Compatible parties are invited to consent. Either party may decline, revise
              terms, or enter the dealroom to negotiate.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-product-section is-white" aria-labelledby="outcomes-heading">
        <div className="mt-product-section-head">
          <div>
            <p className="mt-product-kicker">Outcomes</p>
            <h2 id="outcomes-heading">Completed agreements and worked examples</h2>
          </div>
          <p>
            Live outcomes stay separate from educational examples. No example is counted as
            a participant, agreement, completion, or evidence record.
          </p>
        </div>
        <div className={styles.outcomeGrid}>
          <article className={styles.emptyOutcome}>
            <span className={styles.emptyLabel}>No published completions</span>
            <div>
              <h3>No completed agreement is published here yet.</h3>
              <p>
                Completed trades and accepted evidence will appear only after the relevant
                agreement, review state, and participant disclosure are ready for public
                presentation.
              </p>
            </div>
          </article>

          {WORKED_EXAMPLE ? (
            <article className={styles.workedExample}>
              <span className={styles.exampleLabel}>
                Worked example · not live · not completed
              </span>
              <div>
                <p className="mt-market-eyebrow">{formatMode(WORKED_EXAMPLE.mode)}</p>
                <h3>
                  {WORKED_EXAMPLE.offeredCause} for {WORKED_EXAMPLE.requestedCause}
                </h3>
                <p>
                  This example demonstrates explicit reciprocal terms and evidence boundaries.
                  It is not marketplace activity or proof of a completed trade.
                </p>
              </div>
              <dl className={styles.exampleTerms}>
                <div>
                  <dt>Example offer</dt>
                  <dd>{WORKED_EXAMPLE.offerAction}</dd>
                </div>
                <div>
                  <dt>Example request</dt>
                  <dd>{WORKED_EXAMPLE.requestAction}</dd>
                </div>
              </dl>
              <div className={styles.exampleActions}>
                <Link
                  className="button button-primary button-mini"
                  href={`/offers/examples/${WORKED_EXAMPLE.id}`}
                >
                  Inspect worked example
                </Link>
                <Link className="button button-secondary button-mini" href="/worked-examples">
                  View all examples
                </Link>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="mt-product-section" aria-labelledby="other-routes-heading">
        <div className="mt-product-section-head">
          <div>
            <p className="mt-product-kicker">Other live routes</p>
            <h2 id="other-routes-heading">Coordinate without a bilateral listing</h2>
          </div>
          <p>
            Use an offset, conditional pool, or consent-gated introduction when a standard
            public proposal is not the right structure.
          </p>
        </div>
        <div className="mt-pool-link-grid">
          <Link className="mt-pool-link-card" href="/offsets">
            <div>
              <p className="mt-market-eyebrow">Opposed donations</p>
              <h3>Donation offsets</h3>
            </div>
            <p>
              Redirect matched planned donations toward a destination both participants
              prefer.
            </p>
            <span>Open offsets ↗</span>
          </Link>
          <Link className="mt-pool-link-card" href="/pools">
            <div>
              <p className="mt-market-eyebrow">Conditional funding</p>
              <h3>Funding pools</h3>
            </div>
            <p>
              Review maximum exposure, threshold, deadline, recipient, and failure behavior.
            </p>
            <span>Open pools ↗</span>
          </Link>
          <Link className="mt-pool-link-card" href="/background-networking">
            <div>
              <p className="mt-market-eyebrow">Private matching</p>
              <h3>Consent-gated introductions</h3>
            </div>
            <p>
              Share a broad preview without publishing exact wishes or contact details.
            </p>
            <span>Request matching ↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
