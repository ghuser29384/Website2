"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ContributionCadence = "one_time" | "monthly";

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
  checkoutUrl?: string;
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

export function MpgfContributionModal({
  campaigns,
  perDonorCapCents,
  realMoneyReady,
  roundId,
  sponsorPoolCents,
  viewerPresent,
}: MpgfContributionModalProps) {
  const [open, setOpen] = useState(false);
  const [cadence, setCadence] = useState<ContributionCadence>("one_time");
  const [oneTimeDollars, setOneTimeDollars] = useState(25);
  const [monthlyDollars, setMonthlyDollars] = useState(15);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.campaignId ?? "");
  const [countForMatching, setCountForMatching] = useState(true);
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Choose a one-time campaign gift or a monthly sponsor-pool sustainer.",
  );

  const selectedCampaign =
    cadence === "one_time" ? campaigns.find((campaign) => campaign.campaignId === campaignId) : undefined;
  const activeAmountCents = amountToCents(cadence === "monthly" ? monthlyDollars : oneTimeDollars);
  const countedCents = countForMatching && cadence === "one_time" ? Math.min(activeAmountCents, perDonorCapCents) : 0;
  const endpoint =
    cadence === "monthly"
      ? "/api/mpgf/contributions/subscription-session"
      : "/api/mpgf/contributions/checkout-session";
  const modalDescription =
    "One-time gifts can target an approved campaign and count up to the donor cap after identity checks. " +
    "Monthly sustainers refill the sponsor pool and do not let sponsors micromanage allocations after a round opens.";

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

  async function startCheckout() {
    if (!viewerPresent) {
      setStatusMessage("Sign in before creating an MPGF Checkout session.");
      return;
    }

    if (!realMoneyReady) {
      setStatusMessage("Integrated checkout is still gated; manual external-payment evidence remains available.");
      return;
    }

    if (activeAmountCents < 100) {
      setStatusMessage("Contribution amount must be at least $1.");
      return;
    }

    setPending(true);
    setStatusMessage("Preparing checkout.");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCents: activeAmountCents,
          campaignId: cadence === "one_time" ? campaignId : null,
          countForMatching: cadence === "one_time" && countForMatching,
          perDonorCapCents,
          roundId,
          sponsorPoolContribution: cadence === "monthly",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as CheckoutResponse;

      setStatusMessage(result.message ?? result.error ?? "Checkout session response received.");

      if (result.checkoutUrl) {
        assignBrowserLocation(result.checkoutUrl);
        return;
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create checkout session.");
    }

    setPending(false);
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

            <div className="mpgf-segmented-control" role="group" aria-label="Contribution cadence">
              <button
                aria-pressed={cadence === "one_time"}
                type="button"
                onClick={() => setCadence("one_time")}
              >
                One-time contribution
              </button>
              <button
                aria-pressed={cadence === "monthly"}
                type="button"
                onClick={() => setCadence("monthly")}
              >
                Monthly sponsor-pool sustainer
              </button>
            </div>

            <div className="mpgf-modal-grid">
              <div className="mpgf-form-grid">
                {cadence === "one_time" ? (
                  <label>
                    One-time contribution
                    <span className="mpgf-money-input">
                      <span>$</span>
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={oneTimeDollars}
                        onChange={(event) => setOneTimeDollars(Number(event.currentTarget.value))}
                      />
                    </span>
                  </label>
                ) : (
                  <label>
                    Monthly sponsor-pool sustainer
                    <span className="mpgf-money-input">
                      <span>$</span>
                      <input
                        min="1"
                        step="1"
                        type="number"
                        value={monthlyDollars}
                        onChange={(event) => setMonthlyDollars(Number(event.currentTarget.value))}
                      />
                    </span>
                  </label>
                )}

                <label>
                  Optional campaign gift
                  <select
                    disabled={cadence === "monthly"}
                    value={cadence === "monthly" ? "" : campaignId}
                    onChange={(event) => setCampaignId(event.currentTarget.value)}
                  >
                    <option value="">Sponsor pool only</option>
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
                    disabled={cadence === "monthly"}
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
                <h3>Receipts and refunds</h3>
                <p>
                  Checkout receipts come from the payment or fiscal partner. Refunds before round
                  close back out counted support; later refunds create a reconciliation task.
                </p>
              </div>
              <div>
                <h3>Verification and identity</h3>
                <p>
                  Matching weight uses identity confidence only. Unverified gifts can still be
                  routed, but hidden moral scores never increase donor influence.
                </p>
              </div>
            </div>

            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={pending || activeAmountCents < 100 || !viewerPresent || !realMoneyReady}
                type="button"
                onClick={startCheckout}
              >
                {cadence === "monthly" ? "Start monthly" : "Continue to checkout"}
              </button>
              <Link className="button button-secondary" href="/mpgf/contribute">
                Use manual evidence
              </Link>
            </div>
            <p className="mpgf-small" role="status">
              {statusMessage}
            </p>
            {!viewerPresent ? (
              <Link className="inline-link" href={`/login?returnTo=/mpgf/rounds/${roundId}`}>
                Sign in before creating a checkout session.
              </Link>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
