import assert from "node:assert/strict";
import test from "node:test";

import {
  computeMpgfPhaseOneAdvisoryResults,
  getMpgfPhaseOneCreditPerSelectionLabel,
  getMpgfPhaseOneQuorumRequiredCount,
} from "./phase-one-governance-policy";

test("phase-one quorum requires at least half of the frozen electorate", () => {
  assert.equal(getMpgfPhaseOneQuorumRequiredCount(0), 0);
  assert.equal(getMpgfPhaseOneQuorumRequiredCount(1), 1);
  assert.equal(getMpgfPhaseOneQuorumRequiredCount(2), 1);
  assert.equal(getMpgfPhaseOneQuorumRequiredCount(3), 2);
  assert.equal(getMpgfPhaseOneQuorumRequiredCount(4), 2);
  assert.equal(getMpgfPhaseOneQuorumRequiredCount(5), 3);
});

test("each pledger contributes one credit split equally across approvals", () => {
  const result = computeMpgfPhaseOneAdvisoryResults({
    eligiblePledgerCount: 2,
    projectIds: ["project-a", "project-b", "project-c"],
    ballots: [
      {
        voterId: "voter-a",
        selectedProjectIds: ["project-a", "project-b"],
      },
      {
        voterId: "voter-b",
        selectedProjectIds: ["project-a"],
      },
    ],
  });

  assert.equal(result.quorumMet, true);
  assert.deepEqual(
    result.projectShares.map((share) => [
      share.projectId,
      share.creditNumerator,
      share.creditDenominator,
      share.advisoryShareBps,
    ]),
    [
      ["project-a", "3", "2", 7_500],
      ["project-b", "1", "2", 2_500],
      ["project-c", "0", "1", 0],
    ],
  );
});

test("pledge amount cannot influence equal-credit results", () => {
  const lowAndHighPledges = [
    {
      voterId: "voter-a",
      selectedProjectIds: ["project-a"],
      pledgeAmountCents: 100,
    },
    {
      voterId: "voter-b",
      selectedProjectIds: ["project-b"],
      pledgeAmountCents: 1_000_000,
    },
  ];
  const swappedPledges = [
    {
      voterId: "voter-a",
      selectedProjectIds: ["project-a"],
      pledgeAmountCents: 1_000_000,
    },
    {
      voterId: "voter-b",
      selectedProjectIds: ["project-b"],
      pledgeAmountCents: 100,
    },
  ];

  const first = computeMpgfPhaseOneAdvisoryResults({
    ballots: lowAndHighPledges,
    eligiblePledgerCount: 2,
    projectIds: ["project-a", "project-b"],
  });
  const second = computeMpgfPhaseOneAdvisoryResults({
    ballots: swappedPledges,
    eligiblePledgerCount: 2,
    projectIds: ["project-a", "project-b"],
  });

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.projectShares.map((share) => share.advisoryShareBps),
    [5_000, 5_000],
  );
});

test("largest-remainder rounding is deterministic and totals 100 percent", () => {
  const result = computeMpgfPhaseOneAdvisoryResults({
    ballots: [
      {
        voterId: "voter-a",
        selectedProjectIds: ["project-a", "project-b", "project-c"],
      },
    ],
    eligiblePledgerCount: 1,
    projectIds: ["project-c", "project-b", "project-a"],
  });

  assert.deepEqual(
    result.projectShares.map((share) => [
      share.projectId,
      share.advisoryShareBps,
    ]),
    [
      ["project-a", 3_334],
      ["project-b", 3_333],
      ["project-c", 3_333],
    ],
  );
  assert.equal(
    result.projectShares.reduce(
      (sum, share) => sum + share.advisoryShareBps,
      0,
    ),
    10_000,
  );
});

test("zero electorate and sub-quorum rounds never publish advisory shares", () => {
  const empty = computeMpgfPhaseOneAdvisoryResults({
    ballots: [],
    eligiblePledgerCount: 0,
    projectIds: ["project-a"],
  });
  const belowQuorum = computeMpgfPhaseOneAdvisoryResults({
    ballots: [
      {
        voterId: "voter-a",
        selectedProjectIds: ["project-a"],
      },
    ],
    eligiblePledgerCount: 3,
    projectIds: ["project-a"],
  });

  assert.equal(empty.quorumMet, false);
  assert.deepEqual(empty.projectShares, []);
  assert.equal(belowQuorum.quorumRequiredCount, 2);
  assert.equal(belowQuorum.quorumMet, false);
  assert.deepEqual(belowQuorum.projectShares, []);
});

test("ballots reject duplicate voters and invalid selections", () => {
  assert.throws(
    () =>
      computeMpgfPhaseOneAdvisoryResults({
        ballots: [
          { voterId: "voter-a", selectedProjectIds: ["project-a"] },
          { voterId: "voter-a", selectedProjectIds: ["project-b"] },
        ],
        eligiblePledgerCount: 2,
        projectIds: ["project-a", "project-b"],
      }),
    /at most one ballot/,
  );

  assert.throws(
    () =>
      computeMpgfPhaseOneAdvisoryResults({
        ballots: [
          {
            voterId: "voter-a",
            selectedProjectIds: ["project-a", "project-a"],
          },
        ],
        eligiblePledgerCount: 1,
        projectIds: ["project-a"],
      }),
    /unique projects/,
  );

  assert.throws(
    () =>
      computeMpgfPhaseOneAdvisoryResults({
        ballots: [
          { voterId: "voter-a", selectedProjectIds: ["unknown-project"] },
        ],
        eligiblePledgerCount: 1,
        projectIds: ["project-a"],
      }),
    /frozen candidate set/,
  );
});

test("selection copy states the equal split plainly", () => {
  assert.equal(
    getMpgfPhaseOneCreditPerSelectionLabel(1),
    "100% of one voting credit per selected project",
  );
  assert.equal(
    getMpgfPhaseOneCreditPerSelectionLabel(4),
    "25% of one voting credit per selected project",
  );
  assert.equal(
    getMpgfPhaseOneCreditPerSelectionLabel(0),
    "Select at least one project",
  );
});
