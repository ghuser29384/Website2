"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ChangeEvent, type MouseEvent } from "react";

import styles from "./complete-profile-connections.module.css";

export type XConnectorAvailabilityReason =
  | "ready"
  | "disabled"
  | "missing_credentials"
  | "secure_storage_unavailable"
  | "supabase_unavailable"
  | "invalid_redirect_uri";

export interface CompleteProfileXConnectionSummary {
  accessStatus: string;
  connected: boolean;
  retentionExpiresAt: string | null;
  username: string;
}

interface CompleteProfileConnectionsProps {
  feedback: { text: string; tone: "error" | "success" } | null;
  initialOpen: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  returnTo: string;
  signupHref: string;
  xAvailabilityReason: XConnectorAvailabilityReason;
  xConnection: CompleteProfileXConnectionSummary;
  xEnabled: boolean;
}

const X_START_PATH = "/api/profile-sources/x/start";
const X_DISCONNECT_PATH = "/api/profile-sources/x/disconnect";
const X_CONSENT_VALUE = "priority-suggestions";

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m4.5 4.5 11 11M15.5 4.5l-11 11" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <rect height="9" rx="1" width="12" x="4" y="8" />
      <path d="M7 8V5.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function formatRetentionDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Needs review";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function getUnavailableReason(reason: XConnectorAvailabilityReason) {
  if (reason === "missing_credentials") {
    return "The approved X Web App credentials have not been configured.";
  }
  if (reason === "secure_storage_unavailable") {
    return "Encrypted token storage is unavailable, so the connection fails closed.";
  }
  if (reason === "supabase_unavailable") {
    return "Account storage is unavailable on this deployment.";
  }
  if (reason === "invalid_redirect_uri") {
    return "The X callback URL does not match the supported Moral Trade route.";
  }

  return "The production X connection has not been enabled.";
}

function SourceMark({ children, tone }: { children: string; tone: string }) {
  return (
    <span aria-hidden="true" className={styles.sourceMark} data-tone={tone}>
      {children}
    </span>
  );
}

export function CompleteProfileConnections({
  feedback,
  initialOpen,
  isAuthenticated,
  loginHref,
  returnTo,
  signupHref,
  xAvailabilityReason,
  xConnection,
  xEnabled,
}: CompleteProfileConnectionsProps) {
  const [open, setOpen] = useState(initialOpen);
  const [xConsent, setXConsent] = useState(false);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!initialOpen) return;

    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [initialOpen]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const xNeedsReconnect =
    !xConnection.connected &&
    (xConnection.accessStatus === "expired" || xConnection.accessStatus === "needs_review");

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span>Sources</span>
        <small aria-hidden="true">3</small>
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
          role="presentation"
        >
          <section
            aria-describedby={descriptionId}
            aria-labelledby={headingId}
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
          >
            <header className={styles.dialogHeader}>
              <div>
                <span>Optional account sources</span>
                <h2 id={headingId}>Choose what may inform private suggestions.</h2>
                <p id={descriptionId}>
                  Connected activity may propose edits for you to review. It can never move a spark,
                  change your 100-spark total, publish your profile, or contact another person.
                </p>
              </div>
              <button
                aria-label="Close account sources"
                autoFocus
                className={styles.closeButton}
                onClick={() => setOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
            </header>

            <div className={styles.boundaryBar}>
              <LockIcon />
              <p>
                Moral Trade stores only the permission and reviewed summaries allowed by each
                connection. Raw external activity is not part of your public profile.
              </p>
            </div>

            {feedback ? (
              <div
                aria-live={feedback.tone === "error" ? "assertive" : "polite"}
                className={styles.feedback}
                data-tone={feedback.tone}
                role={feedback.tone === "error" ? "alert" : "status"}
              >
                {feedback.text}
              </div>
            ) : null}

            <div className={styles.sourceList}>
              <article className={styles.sourceRow}>
                <SourceMark tone="moral-trade">MT</SourceMark>
                <div className={styles.sourceCopy}>
                  <div className={styles.sourceHeading}>
                    <h3>Moral Trade activity</h3>
                    <span className={styles.status} data-tone="included">
                      Included by default
                    </span>
                  </div>
                  <p>
                    Uses only your activity and profile inside Moral Trade. You can later pause or
                    clear learned recommendation signals in your data controls.
                  </p>
                </div>
              </article>

              <article className={styles.sourceRow}>
                <SourceMark tone="ea">EA</SourceMark>
                <div className={styles.sourceCopy}>
                  <div className={styles.sourceHeading}>
                    <h3>Effective Altruism Forum</h3>
                    <span className={styles.status}>Unavailable</span>
                  </div>
                  <p>
                    No supported private reading-history authorization is available for this use.
                    No simulated Connect button is shown.
                  </p>
                </div>
              </article>

              <article className={styles.sourceRow}>
                <SourceMark tone="substack">S</SourceMark>
                <div className={styles.sourceCopy}>
                  <div className={styles.sourceHeading}>
                    <h3>Substack</h3>
                    <span className={styles.status}>Unavailable</span>
                  </div>
                  <p>
                    Substack does not provide a supported reader-history connection for this use.
                    Publication-admin tooling is not treated as reader consent.
                  </p>
                </div>
              </article>

              <article className={`${styles.sourceRow} ${styles.xRow}`}>
                <SourceMark tone="x">X</SourceMark>
                <div className={styles.sourceCopy}>
                  <div className={styles.sourceHeading}>
                    <h3>X</h3>
                    <span
                      className={styles.status}
                      data-tone={xConnection.connected ? "connected" : xEnabled ? "ready" : undefined}
                    >
                      {xConnection.connected
                        ? "Connected"
                        : xNeedsReconnect
                          ? "Reconnect required"
                          : xEnabled
                            ? "Ready to connect"
                            : "Not enabled"}
                    </span>
                  </div>
                  <p>
                    Read-only permission covers likes, bookmarks, and follow relationships. It does
                    not include direct messages, posting, email, or general viewed-post history.
                  </p>

                  {xConnection.connected ? (
                    <div className={styles.connectionPanel}>
                      <div className={styles.connectionFacts}>
                        <div>
                          <span>Account</span>
                          <strong>@{xConnection.username || "connected"}</strong>
                        </div>
                        <div>
                          <span>Moral Trade review date</span>
                          <strong>{formatRetentionDate(xConnection.retentionExpiresAt)}</strong>
                        </div>
                      </div>
                      <p>
                        The account identity is connected. No X activity has been imported or applied
                        to your sparks.
                      </p>
                      <form action={X_DISCONNECT_PATH} method="post">
                        <input name="return_to" type="hidden" value={returnTo} />
                        <button className={styles.secondaryAction} type="submit">
                          Disconnect X
                        </button>
                      </form>
                    </div>
                  ) : xEnabled && isAuthenticated ? (
                    <form action={X_START_PATH} className={styles.connectPanel} method="post">
                      <input name="return_to" type="hidden" value={returnTo} />
                      <label className={styles.consentLine}>
                        <input
                          checked={xConsent}
                          name="consent"
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setXConsent(event.target.checked)
                          }
                          required
                          type="checkbox"
                          value={X_CONSENT_VALUE}
                        />
                        <span>
                          Authorize this read-only connection for private profile suggestions. No X
                          activity is imported at connection time, and every spark edit still requires
                          my confirmation.
                        </span>
                      </label>
                      <button className={styles.primaryAction} disabled={!xConsent} type="submit">
                        Connect X
                      </button>
                    </form>
                  ) : xEnabled ? (
                    <div className={styles.accountGate}>
                      <p>Sign in before connecting an external account to this private profile.</p>
                      <div>
                        <Link className={styles.primaryLink} href={loginHref}>
                          Sign in
                        </Link>
                        <Link className={styles.secondaryLink} href={signupHref}>
                          Create account
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.unavailableNote}>
                      <strong>Connection unavailable</strong>
                      <p>{getUnavailableReason(xAvailabilityReason)}</p>
                    </div>
                  )}
                </div>
              </article>
            </div>

            <footer className={styles.dialogFooter}>
              <div>
                <strong>Separate from your allocation</strong>
                <p>
                  External sources may help surface priorities you overlooked. Your confirmed
                  100-spark profile remains the only allocation used for matching.
                </p>
              </div>
              <button className={styles.doneButton} onClick={() => setOpen(false)} type="button">
                Done
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
