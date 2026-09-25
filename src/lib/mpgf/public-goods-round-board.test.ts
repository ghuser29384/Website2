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
      ["Needs more support", "Progress not disclosed", "Review pending", "Closed; final audit available"].includes(
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
  assert.equal(nearThreshold.sealedProgressLabel, "Progress not disclosed");
  assert.equal(nearThreshold.yourChoiceLabel, "Fund if different-view support joins");
  assert.equal(nearThreshold.yourMaximumCents, 500);
  assert.equal(nearThreshold.pivotalActionLabel, "Preview $5 budget");
  assert.equal(nearThreshold.inviteActionLabel, "Copy user-initiated invite link");
  assert.equal(nearThreshold.projectedAllocationCents, 500);
});

test("MPGF hub keeps the demonstration round out of the default funding path", () => {
  const page = readFileSync("src/app/mpgf/page.tsx", "utf8");
  const helper = readFileSync("src/lib/mpgf/public-goods-round-board.ts", "utf8");

  assert.match(page, /title: "Example round"/);
  assert.match(page, /It is not a current live round/);
  assert.match(page, /Browse candidate pools/);
  assert.match(page, /Open educational assurance calculator/);
  assert.equal(page.includes("Open current round"), false);
  assert.equal(page.includes("Build a Common Ground Budget"), false);

  assert.match(helper, /Progress not disclosed/);
  assert.match(helper, /Needs more support/);
  assert.match(helper, /Review pending/);
  assert.match(helper, /Closed; final audit available/);
});
