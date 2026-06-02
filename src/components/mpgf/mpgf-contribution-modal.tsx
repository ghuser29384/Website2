"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ContributionMode = "fast_route" | "saved_commitment" | "manual_proof_fallback";

export interface MpgfContributionModalCampaign {
  campaignId: string;
  title: string;
  directEligibleCents: number;
  countedForMatchCents: number;
  verifiedDonorCount: number;
  thresholdDonors: number;
  thresholdAmountCents: number;
  thresholdPassed: boolean;
  matchEstimateCents: number;
}

interface MpgfContributionModalProps {
  campaigns: MpgfContributionModalCampaign[];
  perDonorCapCents: number;
  realMoneyReady: boolean;
  roundId: string;
  sponsorPoolCents: number;
  viewerPresent: boolean;
}

interface CheckoutResponse {
  ok?: boolean;
  donateLink?: {
    href?: string;
  };
  nextAction?: string;
  message?: string;
  error?: string;
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function amountToCents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

function assignBrowserLocation(url: string) {
  (globalThis as unknown as { location?: { assign: (target: string) => void } }).location?.assign(url);
}

function recordContributionRouteFunnelEvent(mode: ContributionMode) {
  const payload = JSON.stringify({
    eventType: mode === "manual_proof_fallback" ? "evidence_submission_started" : "donation_route_clicked",
    path: globalThis.location?.pathname ?? "/mpgf/rounds",
    metadata: {
      targetKind: "mpgf_public_good",
      mode,
      stage: "mpgf_contribution_route",
      step: mode,
    },
  });

  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/funnel-events", new Blob([payload], { type: "application/json" }));
    return;
  }

  void fetch("/api/funnel-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

function payloadMessage(payload: CheckoutResponse, fallback: string) {
  if (payload.error?.trim()) {
    return payload.error;
  }

  if (payload.message?.trim()) {
    return payload.message;
  }

  if (payload.nextAction?.trim()) {
    return payload.nextAction.replaceAll("_", " ");
  }

  return fallback;
}

export function MpgfContributionModal({
  campaigns,
  perDonorCapCents,
  realMoneyReady,
  roundId,
  sponsorPoolCents,
  viewerPresent,
}: MpgfContributionModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ContributionMode>("fast_route");
  const [amountDollars, setAmountDollars] = useState(25);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.campaignId ?? "");
  const [countForMatching, setCountForMatching] = useState(true);
  const [futureUseConsentAccepted, setFutureUseConsentAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Use the Every.org fast route first; saved commitments and manual proof remain available when needed.",
  );

  const selectedCampaign = campaigns.find((campaign) => campaign.campaignId === campaignId);
  const activeAmountCents = amountToCents(amountDollars);
  const countedCents =
    countForMatching && mode !== "manual_proof_fallback" ? Math.min(activeAmountCents, perDonorCapCents) : 0;
  const projectedDirectCents = selectedCampaign ? selectedCampaign.directEligibleCents + activeAmountCents : 0;
  const projectedVerifiedSupporters = selectedCampaign
    ? Math.min(
        selectedCampaign.thresholdDonors,
        selectedCampaign.verifiedDonorCount + (activeAmountCents >= 100 ? 1 : 0),
      )
    : 0;
  const thresholdGapAfterCents = selectedCampaign
    ? Math.max(0, selectedCampaign.thresholdAmountCents - projectedDirectCents)
    : 0;
  const supporterGapAfter = selectedCampaign
    ? Math.max(0, selectedCampaign.thresholdDonors - projectedVerifiedSupporters)
    : 0;
  const projectedThresholdCleared = selectedCampaign
    ? selectedCampaign.thresholdPassed || (thresholdGapAfterCents === 0 && supporterGapAfter === 0)
    : false;
  const modalDescription =
    "Fast-route gifts open Every.org and stay pending until webhook import. Saved commitments use Stripe SetupIntent first. Manual proof is the fallback when integrations cannot import.";
  const modeSummary = {
    fast_route: {
      actionLabel: "Open Every.org fast route",
      route: "Every.org Donate Link",
      state: "pending webhook import",
    },
    saved_commitment: {
      actionLabel: "Save Stripe commitment",
      route: "Stripe SetupIntent first",
      state: "saved, not charged",
    },
    manual_proof_fallback: {
      actionLabel: "Open manual proof fallback",
      route: "reviewed manual evidence",
      state: "fallback review",
    },
  } satisfies Record<ContributionMode, { actionLabel: string; route: string; state: string }>;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function startFastRoute() {
    if (!selectedCampaign) {
      setStatusMessage("Choose a campaign before opening the Every.org fast route.");
      return;
    }

    if (activeAmountCents < 100) {
      setStatusMessage("Contribution amount must be at least $1.");
      return;
    }

    setPending(true);
    setStatusMessage("Preparing Every.org Donate Link.");

    try {
      const response = await fetch("/api/mpgf/every-org/donate-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCents: activeAmountCents,
          campaignId,
          roundId,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as CheckoutResponse;
      const donateHref = result.donateLink?.href;

      setStatusMessage(
        payloadMessage(result, "Every.org Donate Link response received; webhook review is still required."),
      );

      if (response.ok && donateHref) {
        assignBrowserLocation(donateHref);
        return;
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create Every.org Donate Link.");
    }

    setPending(false);
  }

  async function saveCommitment() {
    if (!viewerPresent) {
      setStatusMessage("Sign in before saving a Stripe SetupIntent commitment.");
      return;
    }

    if (!selectedCampaign) {
      setStatusMessage("Choose a campaign before saving a conditional commitment.");
      return;
    }

    if (activeAmountCents < 100) {
      setStatusMessage("Contribution amount must be at least $1.");
      return;
    }

    if (!futureUseConsentAccepted) {
      setStatusMessage("Accept future-use consent before saving a Stripe commitment.");
      return;
    }

    setPending(true);
    setStatusMessage("Saving SetupIntent-first commitment.");

    try {
      const response = await fetch("/api/mpgf/stripe/setup-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCents: activeAmountCents,
          campaignId,
          explicitFutureUseConsent: futureUseConsentAccepted,
          roundId,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as CheckoutResponse;

      setStatusMessage(
        response.ok
          ? payloadMessage(result, "SetupIntent saved. Webhook review is still required before counting.")
          : payloadMessage(result, "Could not save a Stripe SetupIntent commitment."),
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save a Stripe SetupIntent commitment.");
    }

    setPending(false);
  }

  function handlePrimaryAction() {
    recordContributionRouteFunnelEvent(mode);

    if (mode === "fast_route") {
      void startFastRoute();
      return;
    }

    if (mode === "saved_commitment") {
      void saveCommitment();
      return;
    }

    assignBrowserLocation(`/mpgf/contribute?campaignId=${encodeURIComponent(campaignId)}#manual-proof-fallback`);
  }

  return (
    <>
      <button className="button button-primary" type="button" onClick={() => setOpen(true)}>
        Contribute to round
      </button>
      {open ? (
        <div className="mpgf-modal-backdrop">
          <section
            aria-describedby="mpgf-contribution-modal-description"
            aria-labelledby="mpgf-contribution-modal-title"
            aria-modal="true"
            className="mpgf-modal"
            role="dialog"
          >
            <header className="mpgf-modal-header">
              <div>
                <p className="eyebrow">Round contribution</p>
                <h2 id="mpgf-contribution-modal-title">Choose how this gift enters the round</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>

            <p className="mpgf-small" id="mpgf-contribution-modal-description">
              {modalDescription}
            </p>

            <div className="mpgf-segmented-control" role="group" aria-label="Contribution route">
              <button
                aria-pressed={mode === "fast_route"}
                type="button"
                onClick={() => setMode("fast_route")}
              >
                1. Fast route
              </button>
              <button
                aria-pressed={mode === "saved_commitment"}
                type="button"
                onClick={() => setMode("saved_commitment")}
              >
                2. Saved commitment
              </button>
              <button
                aria-pressed={mode === "manual_proof_fallback"}
                type="button"
                onClick={() => setMode("manual_proof_fallback")}
              >
                3. Manual proof fallback
              </button>
            </div>

            <div className="mpgf-modal-grid">
              <div className="mpgf-form-grid">
                <label>
                  Contribution amount
                  <span className="mpgf-money-input">
                    <span>$</span>
                    <input
                      min="1"
                      step="1"
                      type="number"
                      value={amountDollars}
                      onChange={(event) => setAmountDollars(Number(event.currentTarget.value))}
                    />
                  </span>
                </label>

                <label>
                  Campaign
                  <select
                    value={campaignId}
                    onChange={(event) => setCampaignId(event.currentTarget.value)}
                  >
                    {campaigns.map((campaign) => (
                      <option key={campaign.campaignId} value={campaign.campaignId}>
                        {campaign.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkbox-label">
                  <input
                    checked={countForMatching}
                    disabled={mode === "manual_proof_fallback"}
                    type="checkbox"
                    onChange={(event) => setCountForMatching(event.currentTarget.checked)}
                  />
                  <span>Count my gift for matching up to cap</span>
                </label>
              </div>

              <dl className="mpgf-summary-grid mpgf-modal-summary">
                <div>
                  <dt>Full gift</dt>
                  <dd>{formatUsd(activeAmountCents)}</dd>
                </div>
                <div>
                  <dt>Counted for matching</dt>
                  <dd>{formatUsd(countedCents)}</dd>
                </div>
                <div>
                  <dt>Per-donor cap</dt>
                  <dd>{formatUsd(perDonorCapCents)}</dd>
                </div>
                <div>
                  <dt>Sponsor pool</dt>
                  <dd>{formatUsd(sponsorPoolCents)}</dd>
                </div>
                <div>
                  <dt>Selected campaign</dt>
                  <dd>{selectedCampaign?.title ?? "Sponsor pool only"}</dd>
                </div>
                <div>
                  <dt>Estimated match</dt>
                  <dd>{formatUsd(selectedCampaign?.matchEstimateCents ?? 0)}</dd>
                </div>
                <div>
                  <dt>Campaign progress</dt>
                  <dd>
                    {selectedCampaign
                      ? `${formatUsd(selectedCampaign.directEligibleCents)} direct; ${formatUsd(
                          selectedCampaign.countedForMatchCents,
                        )} counted`
                      : "Common pool"}
                  </dd>
                </div>
                <div>
                  <dt>If verified</dt>
                  <dd>
                    {selectedCampaign
                      ? `${formatUsd(projectedDirectCents)} direct; ${projectedVerifiedSupporters}/${
                          selectedCampaign.thresholdDonors
                        } supporters`
                      : "Choose a campaign"}
                  </dd>
                </div>
                <div>
                  <dt>Unlock gap after route</dt>
                  <dd>
                    {selectedCampaign
                      ? projectedThresholdCleared
                        ? "threshold would clear after provider import or evidence review"
                        : `${formatUsd(thresholdGapAfterCents)} and ${supporterGapAfter} supporter${
                            supporterGapAfter === 1 ? "" : "s"
                          } still needed`
                      : "Choose a campaign"}
                  </dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{modeSummary[mode].route}</dd>
                </div>
                <div>
                  <dt>Counting state</dt>
                  <dd>{modeSummary[mode].state}</dd>
                </div>
                <div>
                  <dt>Threshold</dt>
                  <dd>
                    {selectedCampaign
                      ? `${selectedCampaign.thresholdPassed ? "passed" : "pending"}; ${
                          selectedCampaign.verifiedDonorCount
                        }/${selectedCampaign.thresholdDonors} donors; ${formatUsd(
                          selectedCampaign.thresholdAmountCents,
                        )}`
                      : "Not campaign-specific"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mpgf-modal-note-grid">
              <div>
                <h3>Fast route first</h3>
                <p>
                  Every.org returns to a pending state. Only partner webhook import and MPGF review
                  can make the contribution count.
                </p>
              </div>
              <div>
                <h3>Saved commitment</h3>
                <p>
                  Stripe saves the payment method with future-use consent; PaymentIntent creation
                  waits for threshold, review, and challenge gates.
                </p>
              </div>
            </div>

            {mode === "saved_commitment" ? (
              <label className="checkbox-label">
                <input
                  checked={futureUseConsentAccepted}
                  type="checkbox"
                  onChange={(event) => setFutureUseConsentAccepted(event.currentTarget.checked)}
                />
                <span>
                  I consent to save this payment method for one future MPGF charge only after
                  threshold, review, challenge, and parameter-lock gates clear.
                </span>
              </label>
            ) : null}

            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={
                  pending ||
                  activeAmountCents < 100 ||
                  !campaignId ||
                  (mode === "saved_commitment" && (!viewerPresent || !futureUseConsentAccepted))
                }
                type="button"
                onClick={handlePrimaryAction}
              >
                {modeSummary[mode].actionLabel}
              </button>
              <Link className="button button-secondary" href="/mpgf/contribute">
                Full contribution console
              </Link>
            </div>
            <p className="mpgf-small" role="status">
              {statusMessage} {realMoneyReady ? "Integrated provider gates are ready." : "Integrated provider gates remain planned."}
            </p>
            {!viewerPresent && mode === "saved_commitment" ? (
              <Link className="inline-link" href={`/login?returnTo=/mpgf/rounds/${roundId}`}>
                Sign in before saving a Stripe commitment.
              </Link>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
