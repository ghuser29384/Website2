import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { allocateMpgfAssuranceRound } from "@/lib/mpgf/mechanism";
import {
  buildMpgfRoundBoardCards,
  MPGF_ROUND_BOARD_SCHEMA_VERSION,
} from "@/lib/mpgf/public-goods-round-board";

test("MPGF round board exposes threshold, match, choice, maximum, and action fields", () => {
  const cards = buildMpgfRoundBoardCards({
    allocation: allocateMpgfAssuranceRound(),
    campaigns: demoMpgfPublicGoodsCampaigns,
    viewerPresent: true,
  });

  assert.equal(cards.length, demoMpgfPublicGoodsCampaigns.length);
  assert.ok(cards.every((card) => card.schemaVersion === MPGF_ROUND_BOARD_SCHEMA_VERSION));
  assert.ok(cards.every((card) => card.thresholdAmountCents > 0));
  assert.ok(cards.every((card) => card.thresholdSupporters > 0));
  assert.ok(cards.every((card) => card.activeClusterCount > 0));
  assert.ok(
    cards.every((card) =>
      ["Needs more support", "Likely near threshold", "Review pending", "Closed; final audit available"].includes(
        card.sealedProgressLabel,
      ),
    ),
  );
  assert.ok(cards.every((card) => card.yourChoiceLabel.length > 0));
  assert.ok(cards.every((card) => card.yourStanceLabel === card.yourChoiceLabel));
  assert.ok(cards.every((card) => card.yourMaximumCents >= 0));
  assert.ok(cards.every((card) => card.pivotalActionLabel.length > 0));
  assert.ok(cards.every((card) => card.inviteActionLabel.length > 0));

  const cleared = cards.find((card) => card.status === "cleared");
  assert.ok(cleared);
  assert.equal(cleared.sealedProgressLabel, "Closed; final audit available");
  assert.ok(cleared.directCountedCents > 0);
  assert.ok(cleared.baseMatchUnlockedCents > 0);
  assert.ok(cleared.projectedBonusMaxCents >= cleared.projectedBonusMinCents);

  const nearThreshold = cards.find((card) => card.status === "near_threshold");
  assert.ok(nearThreshold);
  assert.equal(nearThreshold.sealedProgressLabel, "Likely near threshold");
  assert.equal(nearThreshold.yourChoiceLabel, "Fund if different-view support joins");
  assert.equal(nearThreshold.yourMaximumCents, 500);
  assert.equal(nearThreshold.pivotalActionLabel, "Preview $5 budget");
  assert.equal(nearThreshold.inviteActionLabel, "Copy user-initiated invite link");
  assert.equal(nearThreshold.projectedAllocationCents, 500);
});

test("MPGF hub renders the moraltrade60 round board surface", () => {
  const page = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const component = readFileSync("src/components/mpgf/mpgf-round-board.tsx", "utf8");
  const helper = readFileSync("src/lib/mpgf/public-goods-round-board.ts", "utf8");

  assert.match(page, /MpgfRoundBoard/);
  assert.match(page, /buildMpgfRoundBoardCards/);
  assert.match(page, /href="#round-board"/);
  assert.match(component, /Live rounds/);
  assert.match(component, /Round board and budget router/);
  assert.match(component, /Exact\s+threshold progress, supporter counts, active-cluster counts/);
  assert.match(component, /Public exact aggregates appear only\s+after close in final reports or audit bundles/);
  assert.match(component, /Deployment mode: capped pilot/);
  assert.match(component, /participant limits/);
  assert.match(component, /Sealed before close/);
  assert.match(component, /Qualitative progress/);
  assert.match(component, /card\.sealedProgressLabel/);
  assert.match(component, /Your choice/);
  assert.match(component, /card\.yourChoiceLabel/);
  assert.match(component, /Your maximum/);
  assert.match(component, /card\.yourMaximumCents/);
  assert.match(component, /Possible bonus match if gates pass/);
  assert.equal(component.includes("Your projected allocation"), false);
  assert.equal(component.includes("Projected bonus match"), false);
  assert.match(component, /Pivotal action:/);
  assert.equal(component.includes("{formatUsd(card.directCountedCents)}"), false);
  assert.equal(component.includes("{card.verifiedSupporterCount}/{card.thresholdSupporters}"), false);
  assert.match(helper, /Copy user-initiated invite link/);
  assert.match(helper, /getMpgfCrecPlainLanguageLabelForStance\("weak"\)/);
  assert.match(helper, /Preview \$5 budget/);
  assert.equal(helper.includes("weak common-ground preview"), false);
  assert.match(helper, /Likely near threshold/);
  assert.match(helper, /Needs more support/);
  assert.match(helper, /Review pending/);
  assert.match(helper, /Closed; final audit available/);
});
