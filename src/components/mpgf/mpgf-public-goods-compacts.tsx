"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  calculateMpgfPublicGoodsCompactActivationProgress,
  calculateMpgfPublicGoodsCompactContributionCents,
  parseMpgfPublicGoodsCompactSpendingToCents,
  type MpgfPublicGoodsCompactState,
  type MpgfPublicGoodsCompactsState,
} from "@/lib/mpgf/public-goods-compacts";

import styles from "./mpgf-public-goods-compacts.module.css";

interface MpgfPublicGoodsCompactsProps {
  state: MpgfPublicGoodsCompactsState;
  viewerPresent: boolean;
}

interface MutationResponse {
  ok?: boolean;
  error?: string;
  membershipStatus?: string;
  scheduledMonthlyContributionCents?: number;
  revokedImmediately?: boolean;
  exitEffectiveAt?: string | null;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatUsd(cents: number) {
  return usdFormatter.format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function bindingStatusLabel(status: string) {
  switch (status) {
    case "pending_activation":
      return "Not binding while recruiting";
    case "active":
      return "Bound after activation under frozen terms";
    case "exit_notice":
      return "Bound until the prospective exit takes effect";
    case "revoked":
      return "Revoked before activation; not binding";
    case "exited":
      return "Prospective exit effective; no longer binding";
    default:
      return "Binding state unavailable";
  }
}

function idempotencyKey(scope: string) {
  return `mpgf.compact.${scope}.${crypto.randomUUID()}`;
}

async function mutationRequest(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body: Record<string, unknown>,
) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as MutationResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "The compact request could not be completed.");
  }

  return result;
}

function CharterTerms({ compact }: { compact: MpgfPublicGoodsCompactState }) {
  return (
    <dl className={styles.terms}>
      <div>
        <dt>Contribution</dt>
        <dd>1% of self-declared eligible monthly spending</dd>
      </div>
      <div>
        <dt>Monthly cap</dt>
        <dd>$10</dd>
      </div>
      <div>
        <dt>Activation</dt>
        <dd>{compact.terms.activationThresholdMembers.toLocaleString()} accepted members</dd>
      </div>
      <div>
        <dt>Minimum term</dt>
        <dd>{compact.terms.minimumTermMonths} months after activation</dd>
      </div>
      <div>
        <dt>Exit notice</dt>
        <dd>{compact.terms.exitNoticeDays} days, no earlier than term end</dd>
      </div>
      <div>
        <dt>Project selection</dt>
        <dd>{compact.terms.projectSelectionRule}</dd>
      </div>
      <div>
        <dt>Audit rule</dt>
        <dd>{compact.terms.auditRule}</dd>
      </div>
      <div>
        <dt>Project opt-out</dt>
        <dd>{compact.terms.noProjectOptOutRule}</dd>
      </div>
    </dl>
  );
}

function ActivationProgress({ compact }: { compact: MpgfPublicGoodsCompactState }) {
  if (!compact.memberCountAvailable || compact.acceptedMemberCount === null) {
    return (
      <p className={styles.muted} data-testid={`member-count-${compact.publicKey}`}>
        Durable accepted-member count unavailable
      </p>
    );
  }

  const progress = calculateMpgfPublicGoodsCompactActivationProgress(
    compact.acceptedMemberCount,
    compact.terms.activationThresholdMembers,
  );

  return (
    <div className={styles.progress} data-testid={`member-count-${compact.publicKey}`}>
      <div className={styles.progressLabel}>
        <span>{progress.acceptedMemberCount.toLocaleString()} accepted members</span>
        <span>{(progress.progressBps / 100).toFixed(1)}%</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`${compact.title} activation progress`}
        aria-valuemin={0}
        aria-valuemax={progress.activationThreshold}
        aria-valuenow={Math.min(progress.acceptedMemberCount, progress.activationThreshold)}
      >
        <span style={{ width: `${progress.progressBps / 100}%` }} />
      </div>
    </div>
  );
}

export function MpgfPublicGoodsCompacts({
  state,
  viewerPresent,
}: MpgfPublicGoodsCompactsProps) {
  const router = useRouter();
  const [selectedPublicKey, setSelectedPublicKey] = useState(
    state.compacts.find((compact) => compact.membership)?.publicKey ??
      state.compacts[0]?.publicKey ??
      "",
  );
  const [spendingDollars, setSpendingDollars] = useState("");
  const [acknowledgements, setAcknowledgements] = useState({
    voluntary: false,
    constitution: false,
    binding: false,
    noPayment: false,
  });
  const [delegateeMembershipId, setDelegateeMembershipId] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "No action on this page moves money or creates a payment mandate.",
  );

  const selectedCompact =
    state.compacts.find((compact) => compact.publicKey === selectedPublicKey) ??
    state.compacts[0] ??
    null;

  const contributionPreview = useMemo(() => {
    if (!spendingDollars.trim()) {
      return { cents: 0, error: null };
    }

    try {
      const spendingCents =
        parseMpgfPublicGoodsCompactSpendingToCents(spendingDollars);
      return {
        cents:
          calculateMpgfPublicGoodsCompactContributionCents(spendingCents),
        error: null,
      };
    } catch (error) {
      return {
        cents: 0,
        error: error instanceof Error ? error.message : "Enter a valid amount.",
      };
    }
  }, [spendingDollars]);

  const allAcknowledged = Object.values(acknowledgements).every(Boolean);

  async function runAction(
    action: string,
    callback: () => Promise<MutationResponse>,
    success: (result: MutationResponse) => string,
  ) {
    setPendingAction(action);
    setStatusMessage("Saving the durable compact record. No money is moving.");

    try {
      const result = await callback();
      setStatusMessage(success(result));
      router.refresh();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "The compact request could not be completed.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function acceptCompact() {
    if (!selectedCompact || contributionPreview.error || !spendingDollars.trim()) {
      setStatusMessage(
        contributionPreview.error ?? "Enter self-declared eligible monthly spending.",
      );
      return;
    }

    if (!allAcknowledged) {
      setStatusMessage("Complete every constitutional acknowledgement before accepting.");
      return;
    }

    const spendingCents =
      parseMpgfPublicGoodsCompactSpendingToCents(spendingDollars);

    await runAction(
      "accept",
      () =>
        mutationRequest("/api/mpgf/compacts/membership", "POST", {
          compactPublicKey: selectedCompact.publicKey,
          constitutionVersion: selectedCompact.constitutionVersion,
          acknowledgements: {
            voluntaryChoice: acknowledgements.voluntary,
            exactConstitution: acknowledgements.constitution,
            activationAndNoProjectOptOut: acknowledgements.binding,
            noPaymentMandate: acknowledgements.noPayment,
          },
          declaredEligibleMonthlySpendingCents: spendingCents,
          idempotencyKey: idempotencyKey("join"),
        }),
      (result) =>
        `Accepted ${selectedCompact.title}. Scheduled amount ${formatUsd(
          result.scheduledMonthlyContributionCents ?? contributionPreview.cents,
        )}; no money moved and no payment mandate was created.`,
    );
  }

  async function requestExit() {
    if (!selectedCompact) {
      return;
    }

    await runAction(
      "exit",
      () =>
        mutationRequest("/api/mpgf/compacts/membership", "DELETE", {
          compactPublicKey: selectedCompact.publicKey,
          idempotencyKey: idempotencyKey("exit"),
        }),
      (result) =>
        result.revokedImmediately
          ? `Revoked ${selectedCompact.title} acceptance while it is recruiting. No money moved.`
          : `Recorded prospective exit from ${selectedCompact.title}, effective ${formatDate(
              result.exitEffectiveAt ?? null,
            )}. No money moved.`,
    );
  }

  async function setDelegation() {
    if (!selectedCompact?.allocationElectorate.key) {
      return;
    }

    await runAction(
      "delegate",
      () =>
        mutationRequest("/api/mpgf/compacts/delegation", "PUT", {
          compactPublicKey: selectedCompact.publicKey,
          electorateKey: selectedCompact.allocationElectorate.key,
          delegateeMembershipId,
          idempotencyKey: idempotencyKey("delegate"),
        }),
      () =>
        "Saved the revocable voting-credit delegation. Membership, money, and reputation did not transfer.",
    );
  }

  async function clearDelegation() {
    if (!selectedCompact?.allocationElectorate.key) {
      return;
    }

    await runAction(
      "clear-delegation",
      () =>
        mutationRequest("/api/mpgf/compacts/delegation", "DELETE", {
          compactPublicKey: selectedCompact.publicKey,
          electorateKey: selectedCompact.allocationElectorate.key,
          idempotencyKey: idempotencyKey("clear-delegation"),
        }),
      () => "Revoked the voting-credit delegation. No money or membership moved.",
    );
  }

  return (
    <>
      <div className={styles.boundaryStrip} aria-label="Compact boundaries">
        <div className={styles.boundaryItem}>
          <strong>Voluntary, not government taxation</strong>
          <span>
            Moral Trade has no government taxing authority. Nobody is randomly assigned.
          </span>
        </div>
        <div className={styles.boundaryItem}>
          <strong>Marketplace stays untaxed</strong>
          <span>
            The ordinary Moral Trade marketplace is outside every compact contribution base.
          </span>
        </div>
        <div className={styles.boundaryItem}>
          <strong>No payment mandate</strong>
          <span>
            Joining, voting, delegating, or requesting exit never moves money or creates a charge.
          </span>
        </div>
      </div>

      {!state.available ? (
        <p className={styles.unavailable} role="status" data-testid="compact-unavailable">
          <strong>Live membership state unavailable.</strong> {state.unavailableReason}
        </p>
      ) : null}

      <div className={styles.charterGrid}>
        {state.compacts.map((compact) => (
          <article
            className={`${styles.charterCard} ${
              compact.publicKey === selectedCompact?.publicKey
                ? styles.charterCardSelected
                : ""
            }`}
            key={compact.publicKey}
            data-testid={`compact-${compact.publicKey}`}
          >
            <div className={styles.charterHeader}>
              <h3>{compact.title}</h3>
              <span>{statusLabel(compact.status)}</span>
            </div>
            <p>{compact.summary}</p>
            <ActivationProgress compact={compact} />
            <CharterTerms compact={compact} />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setSelectedPublicKey(compact.publicKey)}
              aria-pressed={compact.publicKey === selectedCompact?.publicKey}
            >
              {compact.publicKey === selectedCompact?.publicKey
                ? "Selected compact"
                : `Select ${compact.title}`}
            </button>
          </article>
        ))}
      </div>

      {selectedCompact ? (
        <div className={styles.workspaceGrid}>
          <section className={styles.workspace} aria-labelledby="compact-workspace-heading">
            <p className="eyebrow">Your voluntary acceptance</p>
            <h3 id="compact-workspace-heading">{selectedCompact.title}</h3>

            {selectedCompact.membership &&
            selectedCompact.membership.status !== "revoked" ? (
              <div className={styles.membershipSummary}>
                <div className={styles.charterHeader}>
                  <h4>Durable membership state</h4>
                  <span className={styles.statusBadge}>
                    {statusLabel(selectedCompact.membership.status)}
                  </span>
                </div>
                <div className={styles.statusGrid}>
                  <div>
                    <span>Accepted constitution</span>
                    <strong>{selectedCompact.membership.constitutionVersionAccepted}</strong>
                  </div>
                  <div>
                    <span>Scheduled monthly amount</span>
                    <strong>
                      {formatUsd(
                        selectedCompact.membership.scheduledMonthlyContributionCents,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Binding status</span>
                    <strong>
                      {bindingStatusLabel(selectedCompact.membership.status)}
                    </strong>
                  </div>
                  <div>
                    <span>Effective exit</span>
                    <strong>
                      {formatDate(selectedCompact.membership.exitEffectiveAt)}
                    </strong>
                  </div>
                </div>
                <p>
                  This record is not a charge, payment mandate, receipt, escrow balance, or
                  tax-deductibility claim.
                </p>
                {selectedCompact.membership.status === "pending_activation" ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={requestExit}
                    disabled={pendingAction !== null}
                  >
                    Revoke acceptance now
                  </button>
                ) : null}
                {selectedCompact.membership.status === "active" ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={requestExit}
                    disabled={pendingAction !== null}
                  >
                    Request prospective exit
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {selectedCompact.membership?.status === "revoked" ? (
                  <p className={styles.statusMessage}>
                    Your earlier recruiting acceptance was revoked and is not binding. You may
                    explicitly accept the current constitution again.
                  </p>
                ) : null}
                <div className={styles.field}>
                  <label htmlFor="eligible-spending">
                    Self-declared eligible monthly spending (USD)
                  </label>
                  <input
                    id="eligible-spending"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={spendingDollars}
                    onChange={(event) => setSpendingDollars(event.target.value)}
                    disabled={!viewerPresent || !state.available}
                  />
                  <span className={styles.fieldHint}>
                    Private after acceptance. It never includes ordinary Moral Trade marketplace
                    transactions automatically.
                  </span>
                </div>
                <div className={styles.preview} data-testid="compact-contribution-preview">
                  <span>1% preview, capped at $10 per month</span>
                  <strong>{formatUsd(contributionPreview.cents)}</strong>
                </div>
                {contributionPreview.error ? (
                  <p className={styles.statusMessage}>{contributionPreview.error}</p>
                ) : null}
                <fieldset className={styles.acknowledgements}>
                  <legend>Explicit constitutional acknowledgements</legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={acknowledgements.voluntary}
                      onChange={(event) =>
                        setAcknowledgements((current) => ({
                          ...current,
                          voluntary: event.target.checked,
                        }))
                      }
                      disabled={!viewerPresent || !state.available}
                    />
                    I voluntarily choose this cause-specific compact; I was not assigned to it.
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={acknowledgements.constitution}
                      onChange={(event) =>
                        setAcknowledgements((current) => ({
                          ...current,
                          constitution: event.target.checked,
                        }))
                      }
                      disabled={!viewerPresent || !state.available}
                    />
                    I accept constitution version {selectedCompact.constitutionVersion} and its
                    published 1%, $10 cap, 5,000-member threshold, term, exit, voting, audit, and
                    minority-protection rules.
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={acknowledgements.binding}
                      onChange={(event) =>
                        setAcknowledgements((current) => ({
                          ...current,
                          binding: event.target.checked,
                        }))
                      }
                      disabled={!viewerPresent || !state.available}
                    />
                    I understand acceptance is revocable while recruiting, becomes binding only
                    after activation, and then permits no project-by-project refusal.
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={acknowledgements.noPayment}
                      onChange={(event) =>
                        setAcknowledgements((current) => ({
                          ...current,
                          noPayment: event.target.checked,
                        }))
                      }
                      disabled={!viewerPresent || !state.available}
                    />
                    I understand this acceptance does not move money or create a payment mandate,
                    and automatic collection is disabled.
                  </label>
                </fieldset>
                <div className={styles.actions}>
                  {viewerPresent ? (
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={acceptCompact}
                      disabled={
                        !state.available ||
                        pendingAction !== null ||
                        !allAcknowledged ||
                        !spendingDollars.trim() ||
                        Boolean(contributionPreview.error)
                      }
                    >
                      Accept constitution and join
                    </button>
                  ) : (
                    <Link
                      className="button button-primary"
                      href="/login?returnTo=/mpgf/compacts"
                    >
                      Sign in to accept
                    </Link>
                  )}
                </div>
              </>
            )}

            <p className={styles.statusMessage} role="status" aria-live="polite">
              {statusMessage}
            </p>
          </section>

          <aside className={styles.safetyPanel} aria-labelledby="compact-safety-heading">
            <p className="eyebrow">Collection and governance state</p>
            <h3 id="compact-safety-heading">Constitutional duties, no collection rail</h3>
            <ul className={styles.safetyList}>
              <li>
                <strong>Before activation:</strong> acceptance is immediately revocable and not
                binding.
              </li>
              <li>
                <strong>At 5,000 acceptances:</strong> activation freezes the constitutional
                version and starts the 12-month term atomically.
              </li>
              <li>
                <strong>After activation:</strong> exit is prospective after the later of term end
                or 30 days&apos; notice. Individual project refusal is unavailable.
              </li>
              <li>
                <strong>Automatic collection:</strong> disabled pending legal, fiscal-sponsor or
                provider, donor-of-record, receipt, custody, sanctions, and production-release
                gates.
              </li>
            </ul>

            {selectedCompact.membership?.status === "active" &&
            selectedCompact.allocationElectorate.active &&
            selectedCompact.allocationElectorate.key ? (
              <div className={styles.workspace}>
                <h4>Active allocation electorate</h4>
                <p>
                  Delegate one voting credit to another active member of this compact. Delegation
                  is revocable and transfers no membership, money, or reputation.
                </p>
                <div className={styles.field}>
                  <label htmlFor="delegatee-membership-id">Delegate membership ID</label>
                  <input
                    id="delegatee-membership-id"
                    type="text"
                    value={delegateeMembershipId}
                    onChange={(event) => setDelegateeMembershipId(event.target.value)}
                    placeholder="00000000-0000-4000-8000-000000000000"
                  />
                </div>
                <div className={styles.actions}>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={setDelegation}
                    disabled={!delegateeMembershipId || pendingAction !== null}
                  >
                    Set revocable delegation
                  </button>
                  {selectedCompact.delegation ? (
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={clearDelegation}
                      disabled={pendingAction !== null}
                    >
                      Revoke delegation
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p data-testid="no-active-compact-ballot">
                No compact allocation electorate is active. No ballot or delegation target is
                being fabricated.
              </p>
            )}
          </aside>
        </div>
      ) : null}
    </>
  );
}
