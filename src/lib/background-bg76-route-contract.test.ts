import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const BG76_ROUTE_FILES = [
  "src/app/api/background/admin-safety-actions/route.ts",
  "src/app/api/background/backup-retention-manifests/route.ts",
  "src/app/api/background/candidate-exposure/route.ts",
  "src/app/api/background/claim-assurance-records/route.ts",
  "src/app/api/background/data-exports/[id]/route.ts",
  "src/app/api/background/data-exports/route.ts",
  "src/app/api/background/delegate-authorizations/[id]/revoke/route.ts",
  "src/app/api/background/delegate-authorizations/route.ts",
  "src/app/api/background/delegate-receipts/route.ts",
  "src/app/api/background/delegate-runs/route.ts",
  "src/app/api/background/delegate-tool-capabilities/route.ts",
  "src/app/api/background/disclosure-grants/route.ts",
  "src/app/api/background/emergency-controls/route.ts",
  "src/app/api/background/federation-bridge-grants/route.ts",
  "src/app/api/background/high-impact-change-approvals/route.ts",
  "src/app/api/background/participant-correction-requests/route.ts",
  "src/app/api/background/pairwise-safety-preferences/route.ts",
  "src/app/api/background/pilot-evaluation-reviews/route.ts",
  "src/app/api/background/power-asymmetry-reviews/route.ts",
  "src/app/api/background/privacy-freeze/route.ts",
  "src/app/api/background/retention-holds/route.ts",
  "src/app/api/background/reviewer-conflict-recusal-records/route.ts",
  "src/app/api/background/runtime-safety-tripwires/route.ts",
  "src/app/api/background/subject-identity/route.ts",
  "src/app/api/background/wish-interview/route.ts",
  "src/app/api/background/wish-profile/route.ts",
] as const;

const COMPATIBILITY_ROUTE_FILES = BG76_ROUTE_FILES.filter(
  (file) =>
    ![
      "src/app/api/background/claim-assurance-records/route.ts",
      "src/app/api/background/pairwise-safety-preferences/route.ts",
      "src/app/api/background/subject-identity/route.ts",
    ].includes(file),
);

test("bg76 named background route surfaces exist and are dynamic node handlers", () => {
  for (const file of BG76_ROUTE_FILES) {
    assert.equal(existsSync(file), true, `${file} should exist`);
    const source = readFileSync(file, "utf8");

    assert.match(source, /runtime = "nodejs"/, `${file} should use node runtime`);
    assert.match(source, /dynamic = "force-dynamic"/, `${file} should avoid static caching`);
  }
});

test("bg76 compatibility control routes share a fail-closed redacted route helper", () => {
  const helperSource = readFileSync("src/lib/background-control-route.ts", "utf8");

  assert.match(helperSource, /Authentication required/);
  assert.match(helperSource, /Operator authorization required/);
  assert.match(helperSource, /takeMoralTradeApiRateLimitSlot/);
  assert.match(helperSource, /private, no-store/);
  assert.match(helperSource, /sideEffectsPerformed: false/);
  assert.match(helperSource, /privateDetailsReturned: false/);
  assert.doesNotMatch(
    helperSource,
    /candidate(?:Id|_id)|counterparty(?:Id|_id)|raw|exact_target|debug|abuse_heuristic/,
  );

  for (const file of COMPATIBILITY_ROUTE_FILES) {
    const source = readFileSync(file, "utf8");

    assert.match(source, /buildBackgroundControlRouteHandler/);
    assert.doesNotMatch(source, /NextResponse\.json/);
    assert.doesNotMatch(source, /from\("background_opportunity_briefs"\)|select\("\*"\)/);
  }
});
