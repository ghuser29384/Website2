import Link from "next/link";

import styles from "./pool-section.module.css";

const poolSteps = [
  { number: "1", title: "Set your cap" },
  { number: "2", title: "People join" },
  { number: "3", title: "Threshold unlocks" },
] as const;

const joinedPledges = 8;
const pledgeTarget = 12;
const pledgeProgress = Math.round((joinedPledges / pledgeTarget) * 100);

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" />
      <rect height="10" rx="2" width="15" x="4.5" y="10" />
      <path d="M12 14.25v2.5" />
    </svg>
  );
}

export function PoolSection() {
  return (
    <section
      className={["mt-product-section", styles.section].join(" ")}
      aria-labelledby="pool-heading"
    >
      <div className={["mt-feature-split", styles.layout].join(" ")}>
        <div className={["mt-feature-copy", styles.copy].join(" ")}>
          <p className="mt-product-kicker">Pool</p>
          <h2 id="pool-heading">Pledge now. Fund only when the pool fills.</h2>
          <p className={styles.intro}>Set your maximum. Nothing settles before the threshold.</p>

          <ol className={styles.steps} aria-label="How a conditional pool works">
            {poolSteps.map((step) => (
              <li className={styles.step} key={step.number}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.number}
                </span>
                <strong>{step.title}</strong>
              </li>
            ))}
          </ol>

          <div className={["mt-product-actions", styles.actions].join(" ")}>
            <Link className="button button-primary" href="/pools">
              Explore pools
            </Link>
            <Link className={styles.learnLink} href="/mpgf">
              See how pools work <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className={["mt-feature-visual", styles.visual].join(" ")}>
          <figure className={styles.poolCard}>
            <div className={styles.cardHeader}>
              <span>Conditional pool</span>
              <span className={styles.openState}>Open</span>
            </div>

            <div className={styles.progressSummary}>
              <div>
                <strong>
                  {joinedPledges} <span>of {pledgeTarget}</span>
                </strong>
                <p>people joined</p>
              </div>
              <span className={styles.progressPercent}>{pledgeProgress}%</span>
            </div>

            <div
              className={styles.pledgeGrid}
              role="progressbar"
              aria-label={`${joinedPledges} of ${pledgeTarget} pledges joined`}
              aria-valuemax={pledgeTarget}
              aria-valuemin={0}
              aria-valuenow={joinedPledges}
            >
              {Array.from({ length: pledgeTarget }, (_, index) => (
                <span
                  className={index < joinedPledges ? styles.isJoined : undefined}
                  key={index}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div className={styles.unlockRow}>
              <span className={styles.lockMark}>
                <LockIcon />
              </span>
              <div>
                <strong>{pledgeTarget - joinedPledges} more to unlock</strong>
                <span>Funding waits for the threshold.</span>
              </div>
            </div>

            <dl className={styles.poolRules}>
              <div>
                <dt>Your maximum</dt>
                <dd>$50</dd>
              </div>
              <div>
                <dt>Below target</dt>
                <dd>No settlement</dd>
              </div>
            </dl>

            <figcaption>Each participant keeps a clear cap.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
