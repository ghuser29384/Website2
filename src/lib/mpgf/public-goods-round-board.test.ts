import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { demoMpgfPublicGoodsCampaigns } from "@/lib/mpgf/data";
import { allocateMpgfAssuranceRound } from "@/lib/mpgf/mechanism";
import {
  buildMpgfRoundBoardCards,
  MPGF_ROUND_BOARD_SCHEMA_VERSION,
} from "@/lib/mpgf/public-goods-round-board";

test("MPGF round board exposes threshold, match, stance, allocation, and action fields", () => {
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
  assert.ok(cards.every((card) => card.yourStanceLabel.length > 0));
  assert.ok(cards.every((card) => card.pivotalActionLabel.length > 0));
  assert.ok(cards.every((card) => card.inviteActionLabel.length > 0));

  const cleared = cards.find((card) => card.status === "cleared");
  assert.ok(cleared);
  assert.ok(cleared.directCountedCents > 0);
  assert.ok(cleared.baseMatchUnlockedCents > 0);
  assert.ok(cleared.projectedBonusMaxCents >= cleared.projectedBonusMinCents);

  const nearThreshold = cards.find((card) => card.status === "near_threshold");
  assert.ok(nearThreshold);
  assert.equal(nearThreshold.pivotalActionLabel, "Add $5");
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
  assert.match(component, /Your stance/);
  assert.match(component, /Your projected allocation/);
  assert.match(component, /Pivotal action:/);
  assert.match(helper, /Copy user-initiated invite link/);
});
