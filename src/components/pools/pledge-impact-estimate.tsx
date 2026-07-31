"use client";

import { ArrowRight, Info, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import {
  MPGF_PLEDGE_IMPACT_EXPERIMENT_LABEL,
  calculatePledgeImpactMechanicalEffect,
  getPledgeImpactCampaignId,
  getPledgeImpactPoolState,
  type PledgeImpactApiResponse,
  type PledgeImpactAvailableEstimate,
  type PledgeImpactPoolPublicKey,
} from "@/lib/mpgf/pledge-impact";

import styles from "./threshold-radar.module.css";

interface PledgeImpactEstimateProps {
  pledgeAmountDollars: number;
  poolPublicKey: PledgeImpactPoolPublicKey;
  onApplyRecommendation: (amountDollars: number) => void;
}

const dollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDollars(cents: number) {
  return dollarFormatter.format(cents / 100);
}

function formatProbability(basisPoints: number) {
  const percentage = basisPoints / 100;
  return `${percentage.toFixed(percentage >= 10 ? 1 : 2)}%`;
}

function formatChange(basisPoints: number) {
  const percentagePoints = basisPoints / 100;
  return `+${percentagePoints.toFixed(percentagePoints >= 1 ? 1 : 2)} pp`;
}

function PledgeImpactCalculationDialog({
  estimate,
  onClose,
}: {
  estimate: PledgeImpactAvailableEstimate;
  onClose: () => void;
}) {
  const firstThreshold = estimate.thresholds[0];
  return (
    <div className={styles.impactDialogBackdrop} data-testid="pledge-impact-dialog-backdrop">
      <section
        aria-labelledby="pledge-impact-dialog-title"
        aria-modal="true"
        className={styles.impactDialog}
        data-testid="pledge-impact-dialog"
        role="dialog"
      >
        <header>
          <div>
            <span className={styles.experimentalLabel}>{MPGF_PLEDGE_IMPACT_EXPERIMENT_LABEL}</span>
            <h2 id="pledge-impact-dialog-title">How this is calculated</h2>
          </div>
          <button aria-label="Close calculation" onClick={onClose} type="button">
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className={styles.calculationSections}>
          <section>
            <h3>1. Direct threshold effect</h3>
            <p>
              The model compares the pool with and without this pledge while holding downstream
              behavior fixed. For the next threshold, the estimate moves from {formatProbability(firstThreshold.probabilityWithoutPledgeBps)} to {formatProbability(firstThreshold.probabilityWithPledgeBps)}.
            </p>
          </section>
          <section>
            <h3>2. Follow-on contribution effect</h3>
            <p>
              {estimate.followOnEffect.included
                ? `Causally supported follow-on contributions are included using ${estimate.followOnEffect.evidenceType.replace("_", " ")} evidence.`
                : "Follow-on contributions are not included because no qualifying causal evidence has been released for this pool type."}
            </p>
          </section>
          <section>
            <h3>3. Settlement adjustment</h3>
            <p>
              Expected payment failures, expired authorizations, withdrawals, and other collection
              risks change the funding estimate by {formatDollars(estimate.decomposition.settlementAdjustmentCents)}.
            </p>
          </section>
          <section>
            <h3>4. Timing effect</h3>
            <p>
              Earlier activation contributes {formatDollars(estimate.decomposition.timingEffectCents)} only where the timing change is expected to preserve or attract settled funding.
            </p>
          </section>
          <section>
            <h3>5. Credit allocation</h3>
            <p>
              Shapley-style allocated credit is {formatDollars(estimate.allocatedFundingCredit.estimateCents)}. It is designed to add up across contributors and is not a literal causal estimate. Individual causal estimates can overlap.
            </p>
          </section>
          <section>
            <h3>6. Uncertainty and model performance</h3>
            <p>
              The 90% range for additional funding from others is {formatDollars(estimate.additionalFundingFromOthers.lower90Cents)}–{formatDollars(estimate.additionalFundingFromOthers.upper90Cents)}. Model {estimate.modelVersion} was evaluated on {estimate.modelPerformance.sampleSize.toLocaleString("en-US")} observations; reported calibration error is {formatProbability(estimate.modelPerformance.calibrationErrorBps)}.
            </p>
          </section>
        </div>

        <footer>
          Forecast {estimate.forecastVersion} · released {new Date(estimate.releasedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </footer>
      </section>
    </div>
  );
}

export function PledgeImpactEstimate({
  onApplyRecommendation,
  pledgeAmountDollars,
  poolPublicKey,
}: PledgeImpactEstimateProps) {
  const campaignId = getPledgeImpactCampaignId(poolPublicKey);
  const pledgeCents = Math.max(0, Math.round(pledgeAmountDollars * 100));
  const requestKey = `${poolPublicKey}:${campaignId}:${pledgeCents}`;
  const [result, setResult] = useState<{
    requestKey: string;
    response: PledgeImpactApiResponse;
  } | null>(null);
  const [calculationRequestKey, setCalculationRequestKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      pool: poolPublicKey,
      campaign: campaignId,
      pledgeCents: String(pledgeCents),
    });
    fetch(`/api/mpgf/pledge-impact?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (request) => {
        if (!request.ok) throw new Error(`Forecast request returned ${request.status}`);
        return request.json() as Promise<PledgeImpactApiResponse>;
      })
      .then((payload) => setResult({ requestKey, response: payload }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({
          requestKey,
          response: {
            status: "unavailable",
            experimental: true,
            poolPublicKey,
            campaignId,
            pledgeCents,
            reason: "service_unavailable",
            message:
              "The forecast service is temporarily unavailable. Only the mechanical gap change is shown.",
            mechanicalEffect: calculatePledgeImpactMechanicalEffect(
              getPledgeImpactPoolState(poolPublicKey),
              pledgeCents,
            ),
          },
        });
      });
    return () => controller.abort();
  }, [campaignId, pledgeCents, poolPublicKey, requestKey]);

  const response = result?.requestKey === requestKey ? result.response : null;
  const loading = response === null;
  const available = response?.status === "available" ? response : null;
  const unavailable = response?.status === "unavailable" ? response : null;
  const recommendation = available?.recommendation ?? null;
  const recommendationIsDifferent = Boolean(
    recommendation && recommendation.pledgeCents !== pledgeCents,
  );

  return (
    <section
      aria-busy={loading}
      aria-live="polite"
      className={styles.impactEstimate}
      data-testid="pledge-impact-estimate"
    >
      <header className={styles.impactEstimateHeader}>
        <span className={styles.experimentalLabel}>{MPGF_PLEDGE_IMPACT_EXPERIMENT_LABEL}</span>
        {available ? (
          <span>
            Updated {new Date(available.releasedAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </header>

      {loading && !response ? (
        <div className={styles.impactLoading} data-testid="pledge-impact-loading">
          Calculating from the latest released pool forecast…
        </div>
      ) : null}

      {available ? (
        <>
          <div className={styles.impactPrimaryMetric}>
            <div>
              <span>Estimated additional funding from others</span>
              <strong data-testid="pledge-impact-additional-funding">
                {formatDollars(available.additionalFundingFromOthers.estimateCents)}
              </strong>
              <small>
                90% range {formatDollars(available.additionalFundingFromOthers.lower90Cents)}–{formatDollars(available.additionalFundingFromOthers.upper90Cents)}
              </small>
            </div>
            <div>
              <strong data-testid="pledge-impact-multiplier">{available.fundingMultiplier.toFixed(1)}×</strong>
              <span>per $1 pledged</span>
            </div>
          </div>

          <div className={styles.impactSecondaryMetrics}>
            <div>
              <span>Estimated change in pass probability</span>
              <strong data-testid="pledge-impact-pass-probability">
                {formatProbability(available.thresholds[0].probabilityWithoutPledgeBps)} → {formatProbability(available.thresholds[0].probabilityWithPledgeBps)}
              </strong>
              <small>{formatChange(available.thresholds[0].probabilityWithPledgeBps - available.thresholds[0].probabilityWithoutPledgeBps)}</small>
            </div>
            <div>
              <span>If the threshold is missed</span>
              <strong data-testid="pledge-impact-failure-bonus">
                {available.failureBonusConditionalOnFailure
                  ? `${formatDollars(available.failureBonusConditionalOnFailure.projectedCents)} projected bonus`
                  : "No failure bonus released"}
              </strong>
              <small>Conditional on failure, not an expected return</small>
            </div>
          </div>

          <div className={styles.impactEstimateActions}>
            <button
              data-testid="pledge-impact-method-button"
              onClick={() => setCalculationRequestKey(requestKey)}
              type="button"
            >
              <Info aria-hidden="true" size={17} /> How this is calculated
            </button>
            {recommendationIsDifferent && recommendation ? (
              <button
                data-testid="pledge-impact-recommendation"
                onClick={() => onApplyRecommendation(recommendation.pledgeCents / 100)}
                type="button"
              >
                Use suggested {formatDollars(recommendation.pledgeCents)} <ArrowRight aria-hidden="true" size={15} />
              </button>
            ) : null}
          </div>
        </>
      ) : unavailable ? (
        <div className={styles.impactUnavailable} data-testid={`pledge-impact-unavailable-${unavailable.reason}`}>
          <strong>Forecast unavailable</strong>
          <p>{unavailable.message}</p>
          <span>
            Mechanical effect: {formatDollars(unavailable.mechanicalEffect.remainingAfterPledgeCents)} would remain, and this pledge closes {(unavailable.mechanicalEffect.shareOfCurrentGapBps / 100).toFixed(2)}% of the current gap.
          </span>
        </div>
      ) : null}

      <p className={styles.impactEstimateDisclaimer}>
        The causal estimate may overlap with other contributors’ estimates. Moving the slider does not save a pledge or authorize payment.
      </p>

      {calculationRequestKey === requestKey && available ? (
        <PledgeImpactCalculationDialog
          estimate={available}
          onClose={() => setCalculationRequestKey(null)}
        />
      ) : null}
    </section>
  );
}
