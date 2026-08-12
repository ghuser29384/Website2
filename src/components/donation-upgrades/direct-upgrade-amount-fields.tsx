"use client";

import { useMemo, useState } from "react";

import {
  calculateDirectDonationUpgradeSplit,
  formatDirectDonationUpgradeRedirectPercentage,
  parseDirectDonationUpgradeRedirectPercentage,
} from "@/lib/direct-donation-upgrade-split";

function parseUsdToCents(value: string) {
  const match = /^(0|[1-9]\d*)(?:\.(\d{0,2}))?$/.exec(value.trim());
  if (!match) return null;
  const dollars = Number(match[1]);
  if (!Number.isSafeInteger(dollars)) return null;
  const cents = dollars * 100 + Number(String(match[2] ?? "").padEnd(2, "0") || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function useSplitPreview(creatorAmount: string, redirectPercentage: string) {
  return useMemo(() => {
    const creatorAmountCents = parseUsdToCents(creatorAmount);
    const redirectBasisPoints = parseDirectDonationUpgradeRedirectPercentage(
      redirectPercentage,
    );
    if (creatorAmountCents === null || redirectBasisPoints === null) {
      return { split: null, error: "Enter a valid planned amount and redirect percentage." };
    }
    try {
      return {
        split: calculateDirectDonationUpgradeSplit(
          creatorAmountCents,
          redirectBasisPoints,
        ),
        error: "",
      };
    } catch (error) {
      return {
        split: null,
        error: error instanceof Error ? error.message : "The split is invalid.",
      };
    }
  }, [creatorAmount, redirectPercentage]);
}

export function DirectUpgradeAmountFields({
  defaultCreatorAmount = "10.00",
  defaultRedirectPercentage = "100",
  defaultMatcherAmount = "10.00",
}: {
  defaultCreatorAmount?: string;
  defaultRedirectPercentage?: string;
  defaultMatcherAmount?: string;
}) {
  const [creatorAmount, setCreatorAmount] = useState(defaultCreatorAmount);
  const [redirectPercentage, setRedirectPercentage] = useState(
    defaultRedirectPercentage,
  );
  const [matcherAmount, setMatcherAmount] = useState(defaultMatcherAmount);
  const preview = useSplitPreview(creatorAmount, redirectPercentage);
  const rangeBasisPoints =
    parseDirectDonationUpgradeRedirectPercentage(redirectPercentage) ?? 10_000;

  return (
    <div className="form-stack">
      <div className="form-grid">
        <label>
          Your planned donation
          <input
            name="creator_amount"
            type="number"
            min="1.00"
            max="50000.00"
            step="0.01"
            value={creatorAmount}
            onChange={(event) => setCreatorAmount(event.target.value)}
            required
          />
        </label>
        <label>
          Amount someone adds
          <input
            name="matcher_amount"
            type="number"
            min="1.00"
            max="50000.00"
            step="0.01"
            value={matcherAmount}
            onChange={(event) => setMatcherAmount(event.target.value)}
            required
          />
        </label>
      </div>

      <fieldset className="panel form-stack">
        <legend>How much of your planned donation moves?</legend>
        <label>
          Redirect percentage
          <input
            name="redirect_percentage"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={redirectPercentage}
            onChange={(event) => setRedirectPercentage(event.target.value)}
            required
          />
        </label>
        <input
          aria-label="Redirect percentage slider"
          type="range"
          min="0.01"
          max="100"
          step="0.01"
          value={rangeBasisPoints / 100}
          onChange={(event) => setRedirectPercentage(event.target.value)}
        />
        {preview.split ? (
          <div className="detail-grid" aria-live="polite">
            <div>
              <dt>Stays with the original recipient</dt>
              <dd>{formatUsd(preview.split.retainedAmountCents)}</dd>
            </div>
            <div>
              <dt>Moves to the upgraded recipient</dt>
              <dd>{formatUsd(preview.split.redirectedAmountCents)}</dd>
            </div>
            <div>
              <dt>Redirected share</dt>
              <dd>
                {formatDirectDonationUpgradeRedirectPercentage(
                  preview.split.redirectBasisPoints,
                )}
              </dd>
            </div>
            <div>
              <dt>Matcher adds</dt>
              <dd>
                {parseUsdToCents(matcherAmount) === null
                  ? "Enter an amount"
                  : formatUsd(parseUsdToCents(matcherAmount) ?? 0)}
              </dd>
            </div>
          </div>
        ) : (
          <p className="field-note" role="status">
            {preview.error}
          </p>
        )}
        <p className="field-note">
          Each direct donation leg must be either $0.00 or at least $1.00. A 100% redirect remains
          available.
        </p>
      </fieldset>
    </div>
  );
}

export function DirectUpgradeProposalFields({
  creatorAmountCents,
  defaultRedirectBasisPoints,
  defaultMatcherAmountCents,
}: {
  creatorAmountCents: number;
  defaultRedirectBasisPoints: number;
  defaultMatcherAmountCents: number;
}) {
  const creatorAmount = (creatorAmountCents / 100).toFixed(2);
  const [redirectPercentage, setRedirectPercentage] = useState(
    (defaultRedirectBasisPoints / 100).toFixed(
      defaultRedirectBasisPoints % 100 === 0 ? 0 : 2,
    ),
  );
  const [matcherAmount, setMatcherAmount] = useState(
    (defaultMatcherAmountCents / 100).toFixed(2),
  );
  const preview = useSplitPreview(creatorAmount, redirectPercentage);
  const rangeBasisPoints =
    parseDirectDonationUpgradeRedirectPercentage(redirectPercentage) ??
    defaultRedirectBasisPoints;

  return (
    <div className="form-stack">
      <div className="form-grid">
        <label>
          Proposed redirect percentage
          <input
            name="proposed_redirect_percentage"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={redirectPercentage}
            onChange={(event) => setRedirectPercentage(event.target.value)}
            required
          />
        </label>
        <label>
          Amount you would add
          <input
            name="proposed_matcher_amount"
            type="number"
            min="1.00"
            max="50000.00"
            step="0.01"
            value={matcherAmount}
            onChange={(event) => setMatcherAmount(event.target.value)}
            required
          />
        </label>
      </div>
      <input
        aria-label="Proposed redirect percentage slider"
        type="range"
        min="0.01"
        max="100"
        step="0.01"
        value={rangeBasisPoints / 100}
        onChange={(event) => setRedirectPercentage(event.target.value)}
      />
      {preview.split ? (
        <p className="field-note" aria-live="polite">
          Proposed matched branch: {formatUsd(preview.split.retainedAmountCents)} stays with the
          original recipient; {formatUsd(preview.split.redirectedAmountCents)} moves to the upgraded
          recipient; you add {formatUsd(parseUsdToCents(matcherAmount) ?? 0)}.
        </p>
      ) : (
        <p className="field-note" role="status">
          {preview.error}
        </p>
      )}
    </div>
  );
}
