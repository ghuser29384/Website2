import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

import type { CommitmentCartItem, CommitmentOffer } from "./commitments-offer-data";
import type { CommitmentsPortfolioData } from "./commitments-portfolio";

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };
interface Read {
  table: string;
  columns: string;
  filters: Array<[string, string, unknown]>;
  order?: [string, { ascending: boolean }];
  limit?: number;
}

function compile(path: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(path, "utf8");
  const { outputText } = transpileModule(source, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: path,
  });
  const module = { exports: {} };
  const requireDependency = (name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `unexpected runtime dependency: ${name}`);
    return dependencies[name];
  };
  // Execute the actual loader with inert I/O; never import a live database client.
  new Function("require", "module", "exports", outputText)(requireDependency, module, module.exports);
  return module.exports;
}

function harness(reply: (query: Read) => Result | Promise<Result>, configured = true) {
  const reads: Read[] = [];
  let clients = 0;
  class Query implements PromiseLike<Result> {
    readonly query: Read;
    constructor(table: string) { this.query = { table, columns: "", filters: [] }; }
    select(columns: string) { this.query.columns = columns; return this; }
    eq(column: string, value: unknown) { this.query.filters.push(["eq", column, value]); return this; }
    in(column: string, values: unknown[]) { this.query.filters.push(["in", column, values]); return this; }
    or(value: string) { this.query.filters.push(["or", "", value]); return this; }
    order(column: string, options: { ascending: boolean }) { this.query.order = [column, options]; return this; }
    limit(limit: number) { this.query.limit = limit; return this; }
    then<TResult1 = Result, TResult2 = never>(
      onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      reads.push(this.query);
      return Promise.resolve().then(() => reply(this.query)).then(onfulfilled, onrejected);
    }
  }
  const client = { from: (table: string) => new Query(table) };
  const server = { createClient: async () => { clients += 1; return client; } };
  const subject = compile("src/lib/commitments-offer-data.ts", {
    "@/lib/supabase/config": { hasSupabaseEnv: () => configured },
    "@/lib/supabase/server": server,
  }) as {
    listCommitmentOpenOffers: (id: string) => Promise<CommitmentOffer[]>;
    listCommitmentCartItems: (id: string) => Promise<CommitmentCartItem[]>;
  };
  return { subject, reads, server, clients: () => clients };
}

const ok = (data: Row[] = []): Result => ({ data, error: null });
const failed = (message: string): Result => ({ data: null, error: { message } });
const offer = (id: string): Row => ({
  id, created_at: "2026-09-20T00:00:00Z", offered_cause: "Education", requested_cause: "Health",
  offer_action: "Volunteer", request_action: "Donate $12.50", notes: "", discount_note: null,
  compromise_cause: null, mode: "swap",
});
const cart = (id: string): Row => ({ offer_id: id, created_at: "2026-09-21T00:00:00Z" });

test("unconfigured environment performs no reads", async () => {
  const h = harness(() => { throw new Error("unexpected read"); }, false);
  assert.deepEqual(await h.subject.listCommitmentOpenOffers("viewer"), []);
  assert.deepEqual(await h.subject.listCommitmentCartItems("viewer"), []);
  assert.equal(h.clients(), 0);
});

test("open offers use one narrowly selected, owner-scoped read with existing ordering", async () => {
  const h = harness(() => ok([offer("owned")]));
  const result = await h.subject.listCommitmentOpenOffers("viewer");
  assert.equal(result[0].id, "owned");
  assert.equal(h.reads.length, 1);
  assert.equal(h.reads[0].table, "offers");
  assert.deepEqual(h.reads[0].filters, [["eq", "owner_id", "viewer"], ["eq", "status", "open"]]);
  assert.deepEqual(h.reads[0].order, ["created_at", { ascending: false }]);
  assert.equal(h.reads[0].limit, undefined, "do not introduce silent truncation");
  assert.deepEqual(h.reads[0].columns.split(",").sort(), Object.keys(offer("owned")).sort());
});

test("empty cart stops after its user-scoped, 100-row read", async () => {
  const h = harness(() => ok());
  assert.deepEqual(await h.subject.listCommitmentCartItems("viewer"), []);
  assert.deepEqual(h.reads, [{
    table: "offer_carts", columns: "offer_id,created_at", filters: [["eq", "user_id", "viewer"]],
    order: ["created_at", { ascending: false }], limit: 100,
  }]);
});

test("cart preserves order, missing offers and offset amounts without card hydration", async () => {
  const h = harness((q) => q.table === "offer_carts" ? ok([cart("b"), cart("missing"), cart("a")])
    : q.table === "offers" ? ok([offer("a"), offer("b")])
    : q.table === "donation_offset_offers" ? ok([{ offer_id: "b", requested_matching_amount_cents: 5000 }])
    : failed(`unexpected table: ${q.table}`));
  const result = await h.subject.listCommitmentCartItems("viewer");
  assert.deepEqual(result.map((r) => r.offer?.id ?? null), ["b", null, "a"]);
  assert.equal(result[0].offer?.donationOffset?.requested_matching_amount_cents, 5000);
  assert.equal(result[2].offer?.donationOffset, null);
  assert.equal(result[0].addedAt, "2026-09-21T00:00:00Z");
  assert.equal(h.reads.length, 3);
  assert.deepEqual(h.reads[1].filters, [["in", "id", ["b", "missing", "a"]]]);
  assert.deepEqual(h.reads[2].filters, [["in", "offer_id", ["b", "missing", "a"]]]);
  assert.equal(h.reads[2].columns, "offer_id,requested_matching_amount_cents");
});

test("cart child queries start in parallel, not in a waterfall", async () => {
  let resolveOffers!: (value: Result) => void;
  let resolveOffsets!: (value: Result) => void;
  const offers = new Promise<Result>((resolve) => { resolveOffers = resolve; });
  const offsets = new Promise<Result>((resolve) => { resolveOffsets = resolve; });
  const h = harness((q) => q.table === "offer_carts" ? ok([cart("a")]) : q.table === "offers" ? offers : offsets);
  const pending = h.subject.listCommitmentCartItems("viewer");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(h.reads.map((q) => q.table), ["offer_carts", "offers", "donation_offset_offers"]);
  resolveOffers(ok([offer("a")]));
  resolveOffsets(ok());
  assert.equal((await pending).length, 1);
});

test("duplicate cart IDs are fetched once but existing row-count semantics are preserved", async () => {
  const h = harness((q) => q.table === "offer_carts" ? ok([cart("a"), cart("a")])
    : q.table === "offers" ? ok([offer("a")]) : ok());
  assert.equal((await h.subject.listCommitmentCartItems("viewer")).length, 2);
  assert.deepEqual(h.reads[1].filters, [["in", "id", ["a"]]]);
});

for (const table of ["offer_carts", "offers", "donation_offset_offers"]) {
  test(`cart ${table} failures propagate instead of fabricating a projection`, async () => {
    const h = harness((q) => q.table === table ? failed("read denied")
      : q.table === "offer_carts" ? ok([cart("a")]) : ok());
    await assert.rejects(h.subject.listCommitmentCartItems("viewer"), /read denied/);
  });
}

test("open-offer failures propagate", async () => {
  const h = harness(() => failed("read denied"));
  await assert.rejects(h.subject.listCommitmentOpenOffers("viewer"), /read denied/);
});

test("concurrent viewers do not share results or an application-level cache", async () => {
  const h = harness((q) => ok([offer(String(q.filters.find((f) => f[1] === "owner_id")?.[2]))]));
  const [a, b] = await Promise.all([
    h.subject.listCommitmentOpenOffers("viewer-a"), h.subject.listCommitmentOpenOffers("viewer-b"),
  ]);
  assert.equal(a[0].id, "viewer-a");
  assert.equal(b[0].id, "viewer-b");
  assert.equal(h.clients(), 2);
});

function portfolio(h: ReturnType<typeof harness>) {
  return compile("src/lib/commitments-portfolio.ts", {
    "@/lib/app-data": { listAgreementsForUser: async () => [] },
    "@/lib/commitments-offer-data": h.subject,
    "@/lib/mpgf/data": { demoMpgfPublicGoodsCampaigns: [] },
    "@/lib/mpgf/persistence": { loadMpgfParticipantState: async () => ({ publicGoodsPledges: [], warnings: [] }) },
    "@/lib/mpgf/public-goods-contribution-ledger": { buildMpgfContributionProofLedger: () => ({ rows: [] }) },
    "@/lib/supabase/server": h.server,
  }) as { loadCommitmentsPortfolioData: (input: { userId: string; displayName: string; now: Date }) => Promise<CommitmentsPortfolioData> };
}

test("portfolio preserves offset precedence, text-money fallback and non-binding open offers", async () => {
  const h = harness((q) => q.table === "offer_carts" ? ok([cart("a"), cart("b"), cart("missing")])
    : q.table === "offers" ? ok([offer("a"), { ...offer("b"), mode: "offset" }])
    : q.table === "donation_offset_offers" ? ok([{ offer_id: "b", requested_matching_amount_cents: 5000 }])
    : q.table === "donation_offset_matches" ? ok() : failed("unexpected table"));
  const data = await portfolio(h).loadCommitmentsPortfolioData({ userId: "viewer", displayName: "Member", now: new Date("2026-09-25T00:00:00Z") });
  assert.equal(data.cartProjection.itemCount, 3);
  assert.equal(data.cartProjection.projectedCounterpartyActions, 2);
  assert.deepEqual(data.cartProjection.projectedAdditionalResources, [{ kind: "money", value: 6250, currency: "USD" }]);
  assert.match(data.cartProjection.assumption, /not an expected-value estimate/);
  assert.equal(data.records.length, 0, "open offers must not become commitments");
  assert.equal(data.openOffers.length, 2);
  assert.equal(data.openOffers[1].mechanism, "Redirect");
  assert.equal(data.openOffers[0].inCart, true);
  assert.deepEqual(data.warnings, []);
});

test("portfolio retains a source warning if offset projection data fails", async () => {
  const h = harness((q) => q.table === "offer_carts" ? ok([cart("a")])
    : q.table === "donation_offset_offers" ? failed("offset unavailable") : ok());
  const data = await portfolio(h).loadCommitmentsPortfolioData({ userId: "viewer", displayName: "Member", now: new Date("2026-09-25T00:00:00Z") });
  assert.ok(data.warnings.includes("Cart: offset unavailable"));
});
