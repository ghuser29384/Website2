import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [lintPath] = process.argv.slice(2);

if (!lintPath) {
  throw new Error(
    "Usage: node scripts/verify-mpgf-public-goods-compacts-db-lint.mjs <supabase-db-lint.log>",
  );
}

const raw = readFileSync(lintPath, "utf8");
const jsonStart = raw.indexOf("[\n");
const jsonEnd = raw.lastIndexOf("\n]");
assert.notEqual(jsonStart, -1, "Supabase database lint did not emit a JSON report.");
assert.notEqual(jsonEnd, -1, "Supabase database lint JSON report was incomplete.");
const findings = JSON.parse(raw.slice(jsonStart, jsonEnd + 2));
assert.ok(Array.isArray(findings), "Supabase database lint report must be an array.");

const compactFunctions = new Set([
  "public.get_mpgf_public_goods_compacts_v2_state",
  "public.join_mpgf_public_goods_compact_v2",
  "public.set_mpgf_public_goods_compact_allocation_v2",
  "public.request_mpgf_public_goods_compact_exit_v2",
  "public.set_mpgf_public_goods_compact_delegation_v2",
  "public.clear_mpgf_public_goods_compact_delegation_v2",
  "public.freeze_mpgf_public_goods_financial_cycle_v2",
  "public.freeze_mpgf_public_goods_readiness_v2",
  "public.freeze_mpgf_public_goods_voting_v2",
  "public.freeze_mpgf_public_goods_delegations_v2",
  "public.mpgf_public_goods_cycle_bounds_v2",
  "public.mpgf_public_goods_hash_v2",
  "public.mpgf_public_goods_idempotency_replay_v2",
]);

const allowedHistoricalErrors = new Map([
  [
    "public.reserve_background_candidate_exposure",
    { sqlState: "42702", message: 'column reference "budget_state" is ambiguous' },
  ],
  [
    "public.moral_trade_feed_create_deliver_service",
    {
      sqlState: "42703",
      message: 'column "submission_key" of relation "trade_counterproposals" does not exist',
    },
  ],
]);

const errorFindings = findings.flatMap((finding) =>
  (finding.issues ?? [])
    .filter((issue) => issue.level === "error")
    .map((issue) => ({ function: finding.function, ...issue })),
);
const compactErrors = errorFindings.filter((finding) =>
  compactFunctions.has(finding.function),
);
assert.deepEqual(compactErrors, [], "Compact v2 database functions have lint errors.");

const historicalErrors = errorFindings.filter(
  (finding) => !compactFunctions.has(finding.function),
);
assert.equal(
  historicalErrors.length,
  allowedHistoricalErrors.size,
  "The production-compatible historical chain has an unexpected database lint error count.",
);
for (const finding of historicalErrors) {
  const expected = allowedHistoricalErrors.get(finding.function);
  assert.ok(expected, `Unexpected historical database lint error in ${finding.function}.`);
  assert.equal(finding.sqlState, expected.sqlState);
  assert.equal(finding.message, expected.message);
}

const compactFindings = findings.filter((finding) =>
  compactFunctions.has(finding.function),
);
console.log(
  JSON.stringify(
    {
      totalFunctionFindings: findings.length,
      totalErrors: errorFindings.length,
      allowedHistoricalErrors: historicalErrors.map((finding) => ({
        function: finding.function,
        message: finding.message,
        sqlState: finding.sqlState,
      })),
      compactFunctionFindings: compactFindings,
      compactErrors: compactErrors.length,
    },
    null,
    2,
  ),
);
