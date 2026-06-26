import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { mpgfGatesForAdminSection, type MpgfProductionGate } from "@/lib/mpgf/control-plane";
import { mpgfAdminSections } from "@/lib/mpgf/data";
import {
  getMpgfPublicGoodsAdminConsole,
  getMpgfPublicGoodsAdminConsoles,
  validateMpgfPublicGoodsAdminConsoles,
} from "@/lib/mpgf/public-goods-admin-consoles";

test("MPGF section 16 admin consoles are registered and privacy-safe", () => {
  const consoles = getMpgfPublicGoodsAdminConsoles();
  const validation = validateMpgfPublicGoodsAdminConsoles();

  assert.equal(validation.passed, true);
  assert.equal(validation.missingLabels.length, 0);
  assert.equal(validation.consoleCount, 5);
  assert.equal(validation.requiredLabelCount, 36);
  assert.equal(validation.createsLiveAuthority, false);
  assert.equal(validation.requiresMfaAdminGate, true);
  assert.equal(validation.privacySafeOperatorView, true);
  assert.ok(consoles.every((consoleItem) => mpgfAdminSections.includes(consoleItem.key)));
  assert.ok(consoles.every((consoleItem) => consoleItem.adminHref === `/mpgf/admin/${consoleItem.key}`));
  assert.ok(consoles.every((consoleItem) => consoleItem.requiresMfaAdminGate));
  assert.ok(consoles.every((consoleItem) => consoleItem.createsLiveAuthority === false));
  assert.ok(consoles.every((consoleItem) => consoleItem.privacySafeOperatorView));

  for (const key of ["registry", "round", "safety", "sybil-collusion", "sponsor-governance"]) {
    assert.ok(getMpgfPublicGoodsAdminConsole(key));
  }
});

test("MPGF section 16 console labels are rendered by the admin surfaces", () => {
  const registry = getMpgfPublicGoodsAdminConsole("registry");
  const round = getMpgfPublicGoodsAdminConsole("round");
  const safety = getMpgfPublicGoodsAdminConsole("safety");
  const sybil = getMpgfPublicGoodsAdminConsole("sybil-collusion");
  const sponsor = getMpgfPublicGoodsAdminConsole("sponsor-governance");
  const adminIndex = readFileSync("src/app/mpgf/admin/page.tsx", "utf8");
  const adminSection = readFileSync("src/app/mpgf/admin/[section]/page.tsx", "utf8");
  const dataSource = readFileSync("src/lib/mpgf/data.ts", "utf8");
  const controlPlaneSource = readFileSync("src/lib/mpgf/control-plane.ts", "utf8");

  assert.ok(registry);
  assert.ok(round);
  assert.ok(safety);
  assert.ok(sybil);
  assert.ok(sponsor);
  assert.match(adminIndex, /Operator console coverage/);
  assert.match(adminIndex, /getMpgfPublicGoodsAdminConsoles/);
  assert.match(adminSection, /getMpgfPublicGoodsAdminConsole/);
  assert.match(adminSection, /cannot create a\s+pledge, infer allocatable project stances, authorize payment, release funds/);
  assert.match(dataSource, /"registry"/);
  assert.match(dataSource, /"round"/);
  assert.match(dataSource, /"safety"/);
  assert.match(dataSource, /"sybil-collusion"/);
  assert.match(dataSource, /"sponsor-governance"/);
  assert.match(controlPlaneSource, /registry: \["payout_compliance", "governance"\]/);
  assert.match(controlPlaneSource, /"sybil-collusion": \["governance", "exact_pilot"\]/);

  assert.ok(registry.rows.some((row) => row.label === "Recipient legal status"));
  assert.ok(registry.rows.some((row) => row.label === "Fiscal host"));
  assert.ok(registry.rows.some((row) => row.label === "Destination proof"));
  assert.ok(registry.rows.some((row) => row.label === "Allowed uses"));
  assert.ok(registry.rows.some((row) => row.label === "Milestone schedule"));
  assert.ok(registry.rows.some((row) => row.label === "Receipt requirements"));

  assert.ok(round.rows.some((row) => row.label === "Round status"));
  assert.ok(round.rows.some((row) => row.label === "Sponsor pool"));
  assert.ok(round.rows.some((row) => row.label === "Base match pool"));
  assert.ok(round.rows.some((row) => row.label === "Bonus pool"));
  assert.ok(round.rows.some((row) => row.label === "Failure pool"));
  assert.ok(round.rows.some((row) => row.label === "Success-reward pool"));
  assert.ok(round.rows.some((row) => row.label === "Coordination-credit / impact-certificate policy"));
  assert.ok(round.rows.some((row) => row.label === "Sealed-pledge disclosure mode"));
  assert.ok(round.rows.some((row) => row.label === "Threshold settings"));
  assert.ok(round.rows.some((row) => row.label === "Clearance simulation"));
  assert.ok(round.rows.some((row) => row.label === "Calculation hash"));

  assert.ok(safety.rows.some((row) => row.label === "Anti-threat blockers"));
  assert.ok(safety.rows.some((row) => row.label === "Externality review"));
  assert.ok(safety.rows.some((row) => row.label === "Dissent pressure"));
  assert.ok(safety.rows.some((row) => row.label === "Challenge state"));
  assert.ok(safety.rows.some((row) => row.label === "Appeal state"));
  assert.ok(safety.rows.some((row) => row.label === "Privacy incidents"));

  assert.ok(sybil.rows.some((row) => row.label === "Duplicate identity flags"));
  assert.ok(sybil.rows.some((row) => row.label === "Linked-account and same-control clusters"));
  assert.ok(sybil.rows.some((row) => row.label === "Suspicious cluster patterns"));
  assert.ok(sybil.rows.some((row) => row.label === "Donor splitting"));
  assert.ok(sybil.rows.some((row) => row.label === "Payment-method anomalies"));
  assert.ok(sybil.rows.some((row) => row.label === "Counterparty-volume exclusions"));
  assert.ok(sybil.rows.some((row) => row.label === "Post-round adjustment log"));

  assert.ok(sponsor.rows.some((row) => row.label === "Sponsor commitment state"));
  assert.ok(sponsor.rows.some((row) => row.label === "Funded / escrowed / contractually committed amount"));
  assert.ok(sponsor.rows.some((row) => row.label === "Rulebook hash and parameter-freeze timestamp"));
  assert.ok(sponsor.rows.some((row) => row.label === "Sponsor-recipient-reviewer-proposer conflicts"));
  assert.ok(sponsor.rows.some((row) => row.label === "Safety freeze / cancellation events"));
  assert.ok(sponsor.rows.some((row) => row.label === "Public exception reports"));
});

test("MPGF section 16 console routes have production gate mappings", () => {
  const fakeGates: MpgfProductionGate[] = [
    { area: "governance", key: "governance", label: "Governance", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "payout_compliance", key: "payout", label: "Payout", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "exact_pilot", key: "pilot", label: "Pilot", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "solver", key: "solver", label: "Solver", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
    { area: "real_money", key: "real-money", label: "Real money", status: "pending_review", summary: "", blockers: [], evidencePaths: [], acceptanceCriteria: [] },
  ];

  assert.deepEqual(
    mpgfGatesForAdminSection("registry", [...fakeGates]).map((gate) => gate.area),
    ["governance", "payout_compliance"],
  );
  assert.deepEqual(
    mpgfGatesForAdminSection("round", [...fakeGates]).map((gate) => gate.area),
    ["governance", "exact_pilot", "solver"],
  );
  assert.deepEqual(
    mpgfGatesForAdminSection("safety", [...fakeGates]).map((gate) => gate.area),
    ["governance", "exact_pilot"],
  );
  assert.deepEqual(
    mpgfGatesForAdminSection("sybil-collusion", [...fakeGates]).map((gate) => gate.area),
    ["governance", "exact_pilot"],
  );
  assert.deepEqual(
    mpgfGatesForAdminSection("sponsor-governance", [...fakeGates]).map((gate) => gate.area),
    ["governance", "real_money"],
  );
});
