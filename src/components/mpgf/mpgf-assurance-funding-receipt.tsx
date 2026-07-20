"use client";

import { useState } from "react";

import {
  ASSURANCE_FUNDING_RECEIPT_BOUNDARY,
  ASSURANCE_FUNDING_SCENARIO_TARGET_CENTS,
  calculateAssuranceFundingReceipt,
  parseAssurancePledgeDollars,
  parseAssuranceProbabilityPercent,
} from "@/lib/mpgf/assurance-funding-receipt";

import styles from "./mpgf-assurance-funding-receipt.module.css";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currencyPerDollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatCents(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function formatExpectedMicroUsd(microUsd: number) {
  if (microUsd > 0 && microUsd < 10_000) return "less than $0.01";
  return currencyFormatter.format(microUsd / 1_000_000);
}

function formatPerDollar(value: number) {
  if (value > 0 && value < 0.01) return "less than $0.01";
  return currencyPerDollarFormatter.format(value);
}

export function MpgfAssuranceFundingReceipt() {
  const [pledgeInput, setPledgeInput] = useState("100");
  const [probabilityInput, setProbabilityInput] = useState("20");
  const pledgeCents = parseAssurancePledgeDollars(pledgeInput);
  const decisiveProbabilityBasisPoints = parseAssuranceProbabilityPercent(probabilityInput);
  const pledgeInvalid =
    pledgeCents === null ||
    pledgeCents < 100 ||
    pledgeCents > ASSURANCE_FUNDING_SCENARIO_TARGET_CENTS;
  const probabilityInvalid = decisiveProbabilityBasisPoints === null;
  const result = calculateAssuranceFundingReceipt({
    pledgeCents: pledgeCents ?? Number.NaN,
    decisiveProbabilityBasisPoints: decisiveProbabilityBasisPoints ?? Number.NaN,
  });

  return (
    <div className={styles.calculator} aria-label="Assurance funding estimate">
      <div className={styles.controls}>
        <label className={styles.field}>
          <span>Your possible net pledge</span>
          <span className={styles.inputShell}>
            <span aria-hidden="true">$</span>
            <input
              aria-describedby="assurance-pledge-help"
              aria-invalid={pledgeInvalid}
              inputMode="decimal"
              max="1000"
              min="1"
              onChange={(event) => setPledgeInput(event.target.value)}
              step="0.01"
              type="number"
              value={pledgeInput}
            />
          </span>
          <small id="assurance-pledge-help">Net amount counted toward this $1,000 scenario.</small>
        </label>

        <label className={styles.field}>
          <span>Your estimated chance this pledge would be decisive (%)</span>
          <span className={styles.inputShell}>
            <input
              aria-describedby="assurance-probability-help"
              aria-invalid={probabilityInvalid}
              inputMode="decimal"
              max="100"
              min="0"
              onChange={(event) => setProbabilityInput(event.target.value)}
              step="0.01"
              type="number"
              value={probabilityInput}
            />
            <span aria-hidden="true">%</span>
          </span>
          <small id="assurance-probability-help">Probability entered by you, from 0% to 100%.</small>
        </label>
      </div>

      <div className={styles.context}>
        <span className={styles.badge}>Scenario pool target: $1,000</span>
        <p>Decisive means the pool would clear with this pledge and would not clear without it.</p>
      </div>

      {result.ok ? (
        <div className={styles.result} aria-live="polite">
          <div className={styles.metrics}>
            <article className={`${styles.metric} ${styles.metricPrimary}`}>
              <p className={styles.metricLabel}>Expected other funding per $1 pledged</p>
              <output className={styles.metricValue}>
                {formatPerDollar(result.expectedOtherFundingPerPledgeDollarUsd)}
              </output>
              <p>from other valid pledges per $1 of your proposed net pledge</p>
            </article>

            <article className={styles.metric}>
              <p className={styles.metricLabel}>Pool funding if decisive</p>
              <output className={styles.metricValue}>
                {formatCents(result.scenarioPoolTargetCents)}
              </output>
              <p>
                {formatCents(result.otherFundingIfDecisiveCents)} from other valid pledges + your
                proposed {formatCents(result.pledgeCents)}
              </p>
            </article>
          </div>

          <div className={styles.conclusion} role="status">
            <strong>
              {formatExpectedMicroUsd(result.expectedOtherFundingMicroUsd)} expected from other
              valid pledges.
            </strong>
            <p>
              Your {percentFormatter.format(result.decisiveProbabilityBasisPoints / 100)}% estimate
              × ({formatCents(result.scenarioPoolTargetCents)} target −{" "}
              {formatCents(result.pledgeCents)} proposed net pledge). This excludes your proposed{" "}
              {formatCents(result.pledgeCents)} net pledge.
            </p>
            <p>Funding estimate, not an impact guarantee.</p>
          </div>
        </div>
      ) : (
        <p className={styles.error} role="alert">
          {result.error}
        </p>
      )}

      <p className={styles.boundary}>{ASSURANCE_FUNDING_RECEIPT_BOUNDARY}</p>
    </div>
  );
}
