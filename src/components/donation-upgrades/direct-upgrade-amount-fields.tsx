"use client";

import { useMemo, useState } from "react";

import {
  calculateDirectDonationUpgradeSplit,
  formatDirectDonationUpgradeUsdValue,
  formatDirectDonationUpgradeRedirectPercentage,
  parseDirectDonationUpgradeRedirectPercentage,
  parseDirectDonationUpgradeUsdValue,
} from "@/lib/direct-donation-upgrade-split";

function useSplitPreview(creatorAmount: string, redirectPercentage: string) {
  return useMemo(() => {
    const creatorAmountCents = parseDirectDonationUpgradeUsdValue(creatorAmount);
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
  const [rangeBasisPoints, setRangeBasisPoints] = useState(
    () =>
      parseDirectDonationUpgradeRedirectPercentage(defaultRedirectPercentage) ??
      10_000,
  );
  const preview = useSplitPreview(creatorAmount, redirectPercentage);
  const creatorAmountInvalid =
    parseDirectDonationUpgradeUsdValue(creatorAmount) === null;
  const matcherAmountCents = parseDirectDonationUpgradeUsdValue(matcherAmount);
  const matcherAmountInvalid = matcherAmountCents === null;
  const redirectInvalid =
    parseDirectDonationUpgradeRedirectPercentage(redirectPercentage) === null;

  function updateRedirectPercentage(value: string) {
    setRedirectPercentage(value);
    const parsed = parseDirectDonationUpgradeRedirectPercentage(value);
    if (parsed !== null) setRangeBasisPoints(parsed);
  }

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
            aria-invalid={creatorAmountInvalid || undefined}
            aria-describedby="direct-upgrade-split-guidance"
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
            aria-invalid={matcherAmountInvalid || undefined}
            aria-describedby="direct-upgrade-split-guidance"
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
            onChange={(event) => updateRedirectPercentage(event.target.value)}
            aria-invalid={redirectInvalid || undefined}
            aria-describedby="direct-upgrade-split-guidance"
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
          onChange={(event) => updateRedirectPercentage(event.target.value)}
        />
        {preview.split ? (
          <dl className="detail-grid" aria-live="polite">
            <div>
              <dt>Stays with the original recipient</dt>
              <dd>
                {preview.split.retainedAmountCents === 0
                  ? "$0.00 — no retained obligation"
                  : formatDirectDonationUpgradeUsdValue(
                      preview.split.retainedAmountCents,
                    )}
              </dd>
            </div>
            <div>
              <dt>Moves to the upgraded recipient</dt>
              <dd>
                {formatDirectDonationUpgradeUsdValue(
                  preview.split.redirectedAmountCents,
                )}
              </dd>
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
                {matcherAmountCents === null
                  ? "Enter an amount"
                  : formatDirectDonationUpgradeUsdValue(matcherAmountCents)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="field-note" role="status">
            {preview.error}
          </p>
        )}
        <p className="field-note" id="direct-upgrade-split-guidance">
          The redirected and matcher donations must each be at least $1.00. The retained creator
          leg must be $0.00 or at least $1.00; at 100%, no retained obligation is created.
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
  const [rangeBasisPoints, setRangeBasisPoints] = useState(
    defaultRedirectBasisPoints,
  );
  const preview = useSplitPreview(creatorAmount, redirectPercentage);
  const matcherAmountCents = parseDirectDonationUpgradeUsdValue(matcherAmount);
  const redirectInvalid =
    parseDirectDonationUpgradeRedirectPercentage(redirectPercentage) === null;

  function updateRedirectPercentage(value: string) {
    setRedirectPercentage(value);
    const parsed = parseDirectDonationUpgradeRedirectPercentage(value);
    if (parsed !== null) setRangeBasisPoints(parsed);
  }

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
            onChange={(event) => updateRedirectPercentage(event.target.value)}
            aria-invalid={redirectInvalid || undefined}
            aria-describedby="direct-upgrade-proposal-summary"
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
            aria-invalid={matcherAmountCents === null || undefined}
            aria-describedby="direct-upgrade-proposal-summary"
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
        onChange={(event) => updateRedirectPercentage(event.target.value)}
      />
      {preview.split && matcherAmountCents !== null ? (
        <p
          className="field-note"
          id="direct-upgrade-proposal-summary"
          aria-live="polite"
        >
          Proposed matched branch:{" "}
          {preview.split.retainedAmountCents === 0
            ? "no retained creator obligation"
            : `${formatDirectDonationUpgradeUsdValue(
                preview.split.retainedAmountCents,
              )} stays with the original recipient`}
          ;{" "}
          {formatDirectDonationUpgradeUsdValue(
            preview.split.redirectedAmountCents,
          )}{" "}
          moves to the upgraded recipient; you add{" "}
          {formatDirectDonationUpgradeUsdValue(matcherAmountCents)}.
        </p>
      ) : (
        <p
          className="field-note"
          id="direct-upgrade-proposal-summary"
          role="status"
        >
          {preview.error || "Enter a valid matcher amount."}
        </p>
      )}
    </div>
  );
}
