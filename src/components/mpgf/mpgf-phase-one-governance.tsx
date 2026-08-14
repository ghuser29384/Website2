"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  MpgfPhaseOneGovernanceState,
  MpgfPhaseOneParticipantState,
} from "@/lib/mpgf/phase-one-governance";

interface MpgfPhaseOneGovernanceProps {
  governance: MpgfPhaseOneGovernanceState;
  participant: MpgfPhaseOneParticipantState | null;
  viewerPresent: boolean;
}

interface MutationResponse {
  ok?: boolean;
  error?: string;
  externalCheckoutUrl?: string;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatUsd(cents: number) {
  return usdFormatter.format(cents / 100);
}

function creditPerSelectionLabel(selectionCount: number) {
  if (!Number.isSafeInteger(selectionCount) || selectionCount <= 0) {
    return "Select at least one project";
  }

  return `${(100 / selectionCount).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}% of one voting credit per selected project`;
}

function applyBasisPoints(cents: number, basisPoints: number) {
  const quotient = Math.floor(cents / 10_000);
  const remainder = cents % 10_000;

  return (
    quotient * basisPoints +
    Math.floor((remainder * basisPoints) / 10_000)
  );
}

function parseUsdToCents(value: string) {
  const trimmed = value.trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a positive dollar amount with at most two decimals.");
  }

  const [dollars, fractional = ""] = trimmed.split(".");
  const cents =
    Number.parseInt(dollars, 10) * 100 +
    Number.parseInt(fractional.padEnd(2, "0") || "0", 10);

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error("Enter a positive dollar amount.");
  }

  return cents;
}

function idempotencyKey(scope: string) {
  return `mpgf.phase-one.${scope}.${crypto.randomUUID()}`;
}

async function mutationRequest(
  path: string,
  body: Record<string, unknown>,
  method = "POST",
) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as MutationResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "The MPGF request could not be completed.");
  }

  return result;
}

function initialCheckoutAmounts(
  governance: MpgfPhaseOneGovernanceState,
  participant: MpgfPhaseOneParticipantState | null,
) {
  const pledgeCents =
    participant?.pledge?.status === "confirmed"
      ? participant.pledge.amountCents
      : 0;

  return Object.fromEntries(
    (governance.results?.projectShares ?? []).map((share) => {
      const suggestedCents = applyBasisPoints(
        pledgeCents,
        share.advisoryShareBps,
      );

      return [
        share.projectId,
        suggestedCents > 0 ? (suggestedCents / 100).toFixed(2) : "",
      ];
    }),
  );
}

export function MpgfPhaseOneGovernance({
  governance,
  participant,
  viewerPresent,
}: MpgfPhaseOneGovernanceProps) {
  const router = useRouter();
  const round = governance.round;
  const [pledgeAmount, setPledgeAmount] = useState(
    participant?.pledge?.status === "confirmed"
      ? (participant.pledge.amountCents / 100).toFixed(2)
      : "",
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    participant?.ballot?.selectedProjectIds ?? [],
  );
  const [checkoutAmounts, setCheckoutAmounts] = useState<
    Record<string, string>
  >(() => initialCheckoutAmounts(governance, participant));
  const [handoffAcknowledged, setHandoffAcknowledged] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "No action on this page moves money or confirms a payment.",
  );

  async function runAction(
    action: string,
    callback: () => Promise<MutationResponse>,
    successMessage: string,
  ) {
    setPendingAction(action);
    setStatusMessage("Saving the durable MPGF record.");

    try {
      const result = await callback();
      setStatusMessage(successMessage);
      router.refresh();
      return result;
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "The MPGF request could not be completed.",
      );
      return null;
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmPledge() {
    if (!round) {
      return;
    }

    let amountCents: number;

    try {
      amountCents = parseUsdToCents(pledgeAmount);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Enter a valid pledge amount.",
      );
      return;
    }

    await runAction(
      "pledge",
      () =>
        mutationRequest("/api/mpgf/governance/pledges", {
          roundId: round.id,
          amountCents,
          idempotencyKey: idempotencyKey("pledge"),
        }),
      `Saved a ${formatUsd(amountCents)} noncustodial pledge. No money moved.`,
    );
  }

  async function cancelPledge() {
    if (!round) {
      return;
    }

    await runAction(
      "cancel-pledge",
      () =>
        mutationRequest(
          "/api/mpgf/governance/pledges",
          {
            roundId: round.id,
            idempotencyKey: idempotencyKey("cancel-pledge"),
          },
          "DELETE",
        ),
      "Cancelled the pledge before the electorate was frozen. No money moved.",
    );
  }

  async function submitBallot() {
    if (!round) {
      return;
    }

    await runAction(
      "ballot",
      () =>
        mutationRequest("/api/mpgf/governance/ballots", {
          roundId: round.id,
          projectIds: selectedProjectIds,
          idempotencyKey: idempotencyKey("ballot"),
        }),
      "Saved your equal-credit approval ballot. Pledge amount did not affect its weight.",
    );
  }

  async function confirmCheckoutHandoff(projectId: string) {
    if (!round || !governance.results?.resultHash) {
      return;
    }

    let amountCents: number;

    try {
      amountCents = parseUsdToCents(checkoutAmounts[projectId] ?? "");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Enter a valid external checkout amount.",
      );
      return;
    }

    const result = await runAction(
      `checkout-${projectId}`,
      () =>
        mutationRequest("/api/mpgf/governance/checkout-handoffs", {
          roundId: round.id,
          projectId,
          amountCents,
          resultHash: governance.results?.resultHash,
          idempotencyKey: idempotencyKey(`checkout-${projectId}`),
        }),
      `Recorded your ${formatUsd(amountCents)} external-checkout handoff. Moral Trade has not confirmed a payment.`,
    );

    if (!result?.externalCheckoutUrl) {
      return;
    }

    let destination: URL;

    try {
      destination = new URL(result.externalCheckoutUrl);
    } catch {
      setStatusMessage("The reviewed external checkout destination was invalid.");
      return;
    }

    if (destination.protocol !== "https:") {
      setStatusMessage("The reviewed external checkout destination was invalid.");
      return;
    }

    window.location.assign(destination.toString());
  }

  if (!governance.available) {
    return (
      <section className="mpgf-panel mpgf-panel-primary" id="phase-one-governance">
        <p className="eyebrow">Phase-one allocation</p>
        <h2>No simulated ballot is being shown</h2>
        <p>
          {governance.unavailableReason ??
            "The durable governance contract is unavailable."}
        </p>
        <p>
          Legacy examples remain below as documentation, not participant activity.
        </p>
      </section>
    );
  }

  if (!round) {
    return (
      <section className="mpgf-panel mpgf-panel-primary" id="phase-one-governance">
        <p className="eyebrow">Phase-one allocation</p>
        <h2>No reviewed allocation round is open</h2>
        <p>
          There are no durable phase-one projects, pledges, or ballots to display.
          Demo projects are not promoted as live opportunities.
        </p>
        <ul className="mpgf-check-list">
          <li>One voting credit per confirmed pledger.</li>
          <li>The credit is split equally across selected approved projects.</li>
          <li>At least 50% of the frozen electorate must submit a ballot.</li>
          <li>Published results are advisory and cannot move money.</li>
        </ul>
      </section>
    );
  }

  const projectById = new Map(
    governance.projects.map((project) => [project.id, project]),
  );
  const existingHandoffByProjectId = new Map(
    (participant?.checkoutHandoffs ?? []).map((handoff) => [
      handoff.projectId,
      handoff,
    ]),
  );
  const pledgeOpen = round.status === "pledge_open";
  const ballotOpen = round.status === "ballot_open";
  const resultsPublished =
    round.status === "results_published" || round.status === "closed";
  const checkoutAvailable =
    resultsPublished &&
    governance.results?.quorumMet === true &&
    Boolean(governance.results.resultHash) &&
    participant?.pledge?.status === "confirmed" &&
    participant.eligibleToVote;

  return (
    <section className="mpgf-panel mpgf-panel-primary" id="phase-one-governance">
      <div>
        <p className="eyebrow">Durable phase-one allocation</p>
        <h2>{round.title}</h2>
      </div>

      <dl className="mpgf-summary-grid">
        <div>
          <dt>Round status</dt>
          <dd>{statusLabel(round.status)}</dd>
        </div>
        <div>
          <dt>Governance weight</dt>
          <dd>one voting credit per confirmed pledger</dd>
        </div>
        <div>
          <dt>Quorum</dt>
          <dd>50% of the frozen electorate</dd>
        </div>
        <div>
          <dt>Result effect</dt>
          <dd>advisory only</dd>
        </div>
      </dl>

      <div className="notice-card">
        <strong>No custody or payment claim</strong>
        <span>
          A pledge records intent. A ballot records advice. A checkout handoff
          opens a reviewed external destination. None of these records proves
          that money moved.
        </span>
      </div>

      {pledgeOpen ? (
        viewerPresent ? (
          <div className="mpgf-form-grid">
            <label>
              Noncustodial pledge amount (USD)
              <input
                inputMode="decimal"
                placeholder="25.00"
                value={pledgeAmount}
                onChange={(event) => setPledgeAmount(event.currentTarget.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="button button-primary"
                disabled={pendingAction !== null}
                type="button"
                onClick={() => void confirmPledge()}
              >
                {participant?.pledge?.status === "confirmed"
                  ? "Update pledge (no charge)"
                  : "Confirm pledge (no charge)"}
              </button>
              {participant?.pledge?.status === "confirmed" ? (
                <button
                  className="button button-secondary"
                  disabled={pendingAction !== null}
                  type="button"
                  onClick={() => void cancelPledge()}
                >
                  Cancel pledge
                </button>
              ) : null}
            </div>
            <p>
              Pledge amount is private and never changes governance weight.
            </p>
          </div>
        ) : (
          <p>
            <Link
              className="inline-link"
              href="/login?returnTo=/mpgf/governance"
            >
              Sign in
            </Link>{" "}
            to record a noncustodial pledge.
          </p>
        )
      ) : null}

      {ballotOpen ? (
        !viewerPresent ? (
          <p>
            <Link
              className="inline-link"
              href="/login?returnTo=/mpgf/governance"
            >
              Sign in
            </Link>{" "}
            to check whether your confirmed pledge is in the frozen electorate.
          </p>
        ) : participant?.eligibleToVote ? (
          <fieldset className="mpgf-form-grid">
            <legend>Approve one or more reviewed projects</legend>
            {governance.projects.map((project) => (
              <label className="checkbox-row" key={project.id}>
                <input
                  checked={selectedProjectIds.includes(project.id)}
                  type="checkbox"
                  onChange={(event) => {
                    setSelectedProjectIds((current) =>
                      event.currentTarget.checked
                        ? [...current, project.id]
                        : current.filter(
                            (projectId) => projectId !== project.id,
                          ),
                    );
                  }}
                />
                <span>
                  <strong>{project.title}</strong>
                  <br />
                  {project.summary}
                </span>
              </label>
            ))}
            <p>
              {creditPerSelectionLabel(selectedProjectIds.length)}
              . Your pledge amount is not read by the tally.
            </p>
            <button
              className="button button-primary"
              disabled={
                pendingAction !== null || selectedProjectIds.length === 0
              }
              type="button"
              onClick={() => void submitBallot()}
            >
              {participant.ballot ? "Update ballot" : "Submit ballot"}
            </button>
          </fieldset>
        ) : (
          <p>
            Voting is limited to confirmed pledgers captured when this ballot
            opened. The electorate cannot be expanded during voting.
          </p>
        )
      ) : null}

      {governance.results ? (
        <>
          <div className="mpgf-kpi-grid" aria-label="Phase-one ballot result">
            <div className="mpgf-kpi">
              <span>Eligible pledgers</span>
              <strong>{governance.results.eligiblePledgerCount}</strong>
            </div>
            <div className="mpgf-kpi">
              <span>Submitted ballots</span>
              <strong>{governance.results.submittedBallotCount}</strong>
            </div>
            <div className="mpgf-kpi">
              <span>Required for quorum</span>
              <strong>{governance.results.quorumRequiredCount}</strong>
            </div>
            <div className="mpgf-kpi">
              <span>Quorum</span>
              <strong>{governance.results.quorumMet ? "met" : "not met"}</strong>
            </div>
          </div>

          {governance.results.quorumMet ? (
            <div className="mpgf-table" aria-label="Advisory project shares">
              <div className="mpgf-table-row mpgf-table-head">
                <span>Reviewed project</span>
                <span>Equal-credit score</span>
                <span>Advisory share</span>
              </div>
              {governance.results.projectShares.map((share) => (
                <div className="mpgf-table-row" key={share.projectId}>
                  <span>
                    {projectById.get(share.projectId)?.title ?? share.title}
                  </span>
                  <span>{share.creditScore}</span>
                  <span>
                    {(share.advisoryShareBps / 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>
              Quorum was not met. No advisory allocation or external checkout
              handoff is available for this round.
            </p>
          )}
        </>
      ) : null}

      {checkoutAvailable ? (
        <div className="mpgf-form-grid">
          <h3>Confirm your own external checkout handoff</h3>
          <p>
            Suggested amounts follow the advisory shares. You may change them;
            combined confirmations cannot exceed your private pledge.
          </p>
          <label className="checkbox-row">
            <input
              checked={handoffAcknowledged}
              type="checkbox"
              onChange={(event) =>
                setHandoffAcknowledged(event.currentTarget.checked)
              }
            />
            <span>
              I understand this records a handoff and opens an external site. It
              does not prove or record a payment.
            </span>
          </label>

          {governance.results?.projectShares.map((share) => {
            const project = projectById.get(share.projectId);
            const existingHandoff = existingHandoffByProjectId.get(
              share.projectId,
            );

            if (!project) {
              return null;
            }

            return (
              <div className="notice-card" key={project.id}>
                <strong>{project.title}</strong>
                <span>
                  Advisory share: {(share.advisoryShareBps / 100).toFixed(2)}%.
                  {existingHandoff
                    ? ` Previous handoff: ${formatUsd(existingHandoff.amountCents)}; payment not verified.`
                    : ""}
                </span>
                <label>
                  Amount to take to external checkout (USD)
                  <input
                    inputMode="decimal"
                    value={checkoutAmounts[project.id] ?? ""}
                    onChange={(event) =>
                      setCheckoutAmounts((current) => ({
                        ...current,
                        [project.id]: event.currentTarget.value,
                      }))
                    }
                  />
                </label>
                <button
                  className="button button-secondary"
                  disabled={
                    !handoffAcknowledged ||
                    pendingAction !== null ||
                    !project.checkoutAvailable
                  }
                  type="button"
                  onClick={() => void confirmCheckoutHandoff(project.id)}
                >
                  {project.checkoutAvailable
                    ? "Confirm handoff and open external checkout"
                    : "External checkout paused"}
                </button>
              </div>
            );
          })}
        </div>
      ) : resultsPublished &&
        governance.results?.quorumMet &&
        viewerPresent ? (
        <p>
          External checkout handoffs require a confirmed pledge in the frozen
          electorate. No payment has been initiated.
        </p>
      ) : null}

      <p aria-live="polite" className="mpgf-confirmation" role="status">
        {statusMessage}
      </p>

      {governance.results?.resultHash ? (
        <p>
          Published result hash:{" "}
          <code>{governance.results.resultHash.slice(0, 18)}…</code>
        </p>
      ) : null}
    </section>
  );
}
