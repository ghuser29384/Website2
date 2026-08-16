import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = [
  "supabase/migrations/20260816141500_compact_authoritative_outflow_ledger_v1.sql",
  "supabase/migrations/20260816141501_compact_authoritative_outflow_freeze_v1.sql",
]
  .map((path) => readFileSync(join(root, path), "utf8"))
  .join("\n");
const document = readFileSync(
  join(root, "docs/mpgf/compact-authoritative-outflow-ledger-v1.md"),
  "utf8",
);
const component = readFileSync(
  join(root, "src/components/mpgf/mpgf-public-goods-compacts.tsx"),
  "utf8",
);

function functionBody(name: string) {
  const marker = `create or replace function ${name}`;
  const start = migration.indexOf(marker);
  assert.notEqual(start, -1, `Missing ${name}`);
  const end = migration.indexOf("$function$;", start);
  assert.notEqual(end, -1, `Unterminated ${name}`);
  return migration.slice(start, end + "$function$;".length);
}

const recordEvent = functionBody(
  "moral_trade_private.record_compact_outflow_event_v1",
);
const freezeCoverage = functionBody(
  "moral_trade_private.freeze_compact_outflow_coverage_v1",
);
const freezeFinancial = functionBody(
  "public.freeze_mpgf_public_goods_financial_cycle_v2",
);

test("extends the existing Compact outflow authority rather than creating a competing public ledger", () => {
  assert.match(document, /does not create a second public ledger/i);
  assert.doesNotMatch(migration, /create table[^;]+public\.compact_authoritative/i);
  assert.match(
    migration,
    /references public\.mpgf_public_goods_outflow_coverage_snapshots/i,
  );
  assert.match(
    migration,
    /references public\.mpgf_public_goods_outflow_observations/i,
  );
});

test("records immutable provenance and explicit supersession", () => {
  assert.match(migration, /source_sequence bigint not null/i);
  assert.match(migration, /supersedes_observation_id uuid unique/i);
  assert.match(migration, /canonical_event_hash text not null unique/i);
  assert.match(recordEvent, /status', 'replayed'/i);
  assert.match(
    recordEvent,
    /must explicitly supersede the current canonical event/i,
  );
  assert.match(
    migration,
    /Compact outflow authority history is append-only/i,
  );
});

test("coverage authority distinguishes complete and fail-closed states", () => {
  for (const state of [
    "unavailable",
    "incomplete",
    "provisional",
    "complete",
    "superseded",
    "invalidated",
  ]) {
    assert.match(migration, new RegExp(`'${state}'`, "i"));
  }
  assert.match(freezeCoverage, /unresolved_count <> 0/i);
  assert.match(freezeCoverage, /batch_meta\.currency <> 'USD'/i);
  assert.match(freezeCoverage, /authority_capability <> 'complete'/i);
  assert.match(freezeCoverage, /production' and event_meta\.is_synthetic/i);
  assert.match(document, /absence of rows alone is never treated as proof of zero/i);
});

test("net eligible outflow excludes non-money and non-authoritative cases", () => {
  assert.match(freezeFinancial, /direction = 'outgoing'/i);
  assert.match(freezeFinancial, /payment_kind = 'moral_trade_payment'/i);
  assert.match(freezeFinancial, /settlement_status = 'settled'/i);
  assert.match(
    freezeFinancial,
    /gross_settled_cents[\s\S]*refunded_cents[\s\S]*reversed_cents[\s\S]*chargeback_cents/i,
  );
  for (const excluded of [
    "compact_contribution",
    "wallet_funding",
    "deposit",
    "escrow",
    "incoming",
    "internal",
    "pending",
    "failed",
  ]) {
    assert.match(document, new RegExp(excluded.replaceAll("_", "[ _-]"), "i"));
  }
});

test("money arithmetic and downstream authority remain disabled", () => {
  assert.match(freezeFinancial, /eligible_total_bigint \/ 10/i);
  assert.match(freezeFinancial, /'moneyMoved', false/i);
  assert.match(freezeFinancial, /'paymentMandateCreated', false/i);
  assert.doesNotMatch(
    migration,
    /insert into public\.(?:conditional_payment|mpgf_payment|agreement_payments)/i,
  );
  assert.doesNotMatch(migration, /activation_execution_enabled\s*=\s*true/i);
  assert.match(component, /shadow calculated 10% amount/i);
  assert.match(component, /not a charge, collection, legal debt, mandate, or settlement/i);
});

test("private tables and operator functions are not browser capabilities", () => {
  assert.match(
    migration,
    /revoke all on schema moral_trade_private from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /AAL2 administrator or workflow service authority is required/i,
  );
  assert.match(
    migration,
    /grant execute on function moral_trade_private\.compact_outflow_ingest_batch_v1[\s\S]*to authenticated, service_role/i,
  );
  assert.doesNotMatch(
    migration,
    /grant (?:select|insert|update|delete|all) on[^;]+to authenticated/i,
  );
  assert.doesNotMatch(migration, /service_role[^\n]+(?:process\.env|createServiceClient)/i);
});

test("source-of-truth map names every required mechanism class", () => {
  for (const term of [
    "Core two-party trade",
    "Donation Redirect",
    "Co-Fund",
    "DAC / threshold pools",
    "Wallet",
    "Stripe / Every.org",
    "Compact contributions",
  ]) {
    assert.match(document, new RegExp(term.replaceAll("/", "\\/"), "i"));
  }
});
