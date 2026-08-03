import assert from "node:assert/strict";
import test from "node:test";

import {
  permitsCoActStructure,
  permitsCoFundAllocation,
  permitsGroupContributionMode,
  readGroupContributionProposalFlags,
} from "./group-contribution-flags";

test("proposal-only group modes default on while live execution remains outside this module", () => {
  const flags = readGroupContributionProposalFlags({});
  assert.equal(permitsGroupContributionMode(flags, "co-act"), true);
  assert.equal(permitsGroupContributionMode(flags, "co-fund"), true);
});

test("each optional subtype can fail closed independently", () => {
  const flags = readGroupContributionProposalFlags({
    NEXT_PUBLIC_MORAL_TRADE_CO_ACT_COMPLEMENTARY_ROLES: "false",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_FLEXIBLE: "0",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_CUSTOM_SPLIT: "disabled",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_MATCHING: "no",
  });

  assert.equal(permitsCoActStructure(flags, "same-action"), true);
  assert.equal(permitsCoActStructure(flags, "complementary-roles"), false);
  assert.equal(permitsCoFundAllocation(flags, "equal-share"), true);
  assert.equal(permitsCoFundAllocation(flags, "flexible-contribution"), false);
  assert.equal(permitsCoFundAllocation(flags, "custom-split"), false);
  assert.equal(permitsCoFundAllocation(flags, "matching-pledge"), false);
});

test("mode flags can disable one mechanism without disabling the other", () => {
  const flags = readGroupContributionProposalFlags({
    NEXT_PUBLIC_MORAL_TRADE_CO_ACT_PROPOSALS: "off",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_PROPOSALS: "on",
  });
  assert.equal(permitsGroupContributionMode(flags, "co-act"), false);
  assert.equal(permitsGroupContributionMode(flags, "co-fund"), true);
});

test("malformed explicit feature-flag values fail closed", () => {
  const flags = readGroupContributionProposalFlags({
    NEXT_PUBLIC_MORAL_TRADE_CO_ACT_PROPOSALS: "maybe",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_PROPOSALS: "unexpected",
    NEXT_PUBLIC_MORAL_TRADE_CO_ACT_COMPLEMENTARY_ROLES: "2",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_FLEXIBLE: "enable-ish",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_CUSTOM_SPLIT: "unknown",
    NEXT_PUBLIC_MORAL_TRADE_CO_FUND_MATCHING: "perhaps",
  });

  assert.equal(permitsGroupContributionMode(flags, "co-act"), false);
  assert.equal(permitsGroupContributionMode(flags, "co-fund"), false);
  assert.equal(permitsCoActStructure(flags, "complementary-roles"), false);
  assert.equal(permitsCoFundAllocation(flags, "flexible-contribution"), false);
  assert.equal(permitsCoFundAllocation(flags, "custom-split"), false);
  assert.equal(permitsCoFundAllocation(flags, "matching-pledge"), false);
});
