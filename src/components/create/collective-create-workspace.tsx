import Link from "next/link";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import { CollectiveCommitmentForm } from "@/components/collective-commitments/collective-commitment-form";
import collectiveStyles from "@/components/collective-commitments/collective-commitments.module.css";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  collectiveCredentialIsCurrent,
  COLLECTIVE_PROPOSITION_TYPE_META,
  type CollectiveCommitmentSummary,
  type CollectiveIdentityCredential,
} from "@/lib/collective-commitments/types";

import styles from "./collective-create-workspace.module.css";

function statusClass(status: string) {
  if (status === "active") return `${collectiveStyles.status} ${collectiveStyles.statusActive}`;
  if (status === "expired") return `${collectiveStyles.status} ${collectiveStyles.statusExpired}`;
  if (status === "activating") {
    return `${collectiveStyles.status} ${collectiveStyles.statusActivating}`;
  }
  return collectiveStyles.status;
}

function CreateHeader() {
  return (
    <header className={styles.topbar}>
      <Link aria-label="Moral Trade, home" className={styles.brand} href="/">
        <MoralTradeWordmark />
      </Link>
      <nav aria-label="Create modes" className={styles.modeNav}>
        <Link href="/trades/new">Trade or request</Link>
        <span aria-current="page">Collective commitment</span>
      </nav>
      <Link className={styles.backLink} href="/">
        Back to Feed
      </Link>
    </header>
  );
}

export function CollectiveCreateSignInGate({ returnTo }: { returnTo: string }) {
  const encodedReturnTo = encodeURIComponent(returnTo);
  return (
    <div className={styles.page}>
      <CreateHeader />
      <main className={styles.signInMain} id="main-content" tabIndex={-1}>
        <section className={styles.signInCard}>
          <p className={styles.eyebrow}>Create · collective commitment</p>
          <h1>Sign in to create a collective commitment.</h1>
          <p>
            Signers use verified real identities. Their names remain private until the exact
            threshold is reached, when the complete qualifying set is published together.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href={`/login?method=email&returnTo=${encodedReturnTo}`}>
              Sign in
            </Link>
            <Link className={styles.secondaryButton} href={`/signup?method=email&returnTo=${encodedReturnTo}`}>
              Create account
            </Link>
            <Link className={styles.textLink} href="/trades/new">
              Return to Create
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export function CollectiveCreateWorkspace({
  cause,
  commitments,
  credential,
  enabled,
  minimumDeadlineMinutes,
}: {
  cause?: string;
  commitments: CollectiveCommitmentSummary[];
  credential: CollectiveIdentityCredential | null;
  enabled: boolean;
  minimumDeadlineMinutes: number;
}) {
  const credentialCurrent = Boolean(
    credential && collectiveCredentialIsCurrent(credential),
  );

  return (
    <div className={styles.page}>
      <CreateHeader />
      <main className={styles.workspace} id="main-content" tabIndex={-1}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Create · collective commitment</p>
            <h1>Commit privately. Reveal together.</h1>
            <p className={styles.lede}>
              Freeze one proposition, let qualified people sign privately, and publish every
              verified real name together only when the exact threshold is reached.
            </p>
            {cause ? (
              <div className={styles.causeContext}>
                <span>Selected cause</span>
                <strong>{cause}</strong>
                <small>The proposition below remains fully editable and controls the final terms.</small>
              </div>
            ) : null}
          </div>
          <aside className={styles.mechanism}>
            <strong>Threshold publication—not anonymous endorsement</strong>
            <dl>
              <div><dt>Before threshold</dt><dd>Only the qualifying signer count is public.</dd></div>
              <div><dt>At threshold</dt><dd>The complete verified-name set is published atomically.</dd></div>
              <div><dt>If unmet</dt><dd>Encrypted signatures and the per-commitment key are erased.</dd></div>
            </dl>
          </aside>
        </section>

        {!enabled ? (
          <section className={styles.disabledPanel}>
            <h2>Collective commitments are not enabled in this environment.</h2>
            <p>
              No proposition or signature can be created until the encrypted identity-threshold
              service is configured for this environment.
            </p>
          </section>
        ) : (
          <>
            <div className={styles.creationGrid}>
              <section className={styles.formPanel} id="collective-commitment-form">
                <header className={styles.sectionHeader}>
                  <div>
                    <span>Frozen terms</span>
                    <h2>Create a collective commitment</h2>
                  </div>
                  <p>
                    Proposition, eligibility, threshold, deadline, and risk terms cannot be
                    weakened after creation.
                  </p>
                </header>
                <CollectiveCommitmentForm minimumDeadlineMinutes={minimumDeadlineMinutes} />
              </section>

              <aside className={styles.identityPanel} id="collective-identity">
                <p className={styles.eyebrow}>Identity</p>
                <h2>One verified human. One qualifying signature.</h2>
                <p>
                  A current operator-approved real-name and human-uniqueness credential is
                  required to sign. Affiliation remains optional.
                </p>
                {credential ? (
                  <dl className={styles.identityFacts}>
                    <div><dt>Status</dt><dd>{credentialCurrent ? "Current" : credential.status}</dd></div>
                    <div><dt>Verified real name</dt><dd>{credential.verifiedRealName}</dd></div>
                    <div><dt>Verified affiliation</dt><dd>{credential.verifiedAffiliation || "None"}</dd></div>
                    <div><dt>Uniqueness check</dt><dd>{credential.duplicateCheckResult}</dd></div>
                    <div><dt>Assurance tier</dt><dd>{credential.assuranceTier}</dd></div>
                    <div><dt>Expires</dt><dd><LocalDateTime fallback="Date unavailable" value={credential.expiresAt} /></dd></div>
                  </dl>
                ) : (
                  <div className={styles.identityEmpty}>
                    <strong>No collective-commitment credential is recorded.</strong>
                    <p>Verification is operator-reviewed. Contact support to begin review.</p>
                    <Link href="/contact">Contact support</Link>
                  </div>
                )}
                <p className={styles.securityNote}>
                  Moral Trade stores the credential result, not raw identity documents, in this
                  feature. It does not guarantee anonymity or safety after publication.
                </p>
              </aside>
            </div>

            <section className={styles.commitmentSection} id="collective-commitments-list">
              <header className={styles.sectionHeader}>
                <div>
                  <span>Existing records</span>
                  <h2>Open and completed commitments</h2>
                </div>
                <p>Open records show qualifying counts but no pre-threshold signer identities.</p>
              </header>

              {commitments.length ? (
                <div className={styles.commitmentList}>
                  {commitments.map((commitment) => (
                    <article className={styles.commitmentCard} key={commitment.id}>
                      <div className={styles.cardCopy}>
                        <span className={statusClass(commitment.status)}>{commitment.status}</span>
                        <h3>{commitment.title}</h3>
                        <p>{commitment.propositionText}</p>
                        <Link href={`/collective-commitments/${commitment.id}`}>
                          Review exact terms →
                        </Link>
                      </div>
                      <dl className={styles.cardFacts}>
                        <div><dt>Type</dt><dd>{COLLECTIVE_PROPOSITION_TYPE_META[commitment.propositionType].label}</dd></div>
                        <div><dt>Verified signers</dt><dd>{commitment.qualifyingSignerCount} / {commitment.thresholdCount}</dd></div>
                        <div><dt>Creator</dt><dd>{commitment.creatorDisplayName}</dd></div>
                        <div><dt>Deadline</dt><dd><LocalDateTime fallback="Date unavailable" value={commitment.deadlineAt} /></dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <h3>No collective commitments yet.</h3>
                  <p>Create the first frozen proposition above. No participants or counts are fabricated.</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
