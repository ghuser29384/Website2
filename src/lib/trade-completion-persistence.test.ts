import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

import { persistTradeCompletionConfirmation } from "./trade-completion-persistence";

function fixture() {
  const agreement = {
    id: "agreement", proposer_id: "proposer", responder_id: "responder",
    status: "active", lifecycle_status: "active", completed_at: null as string | null,
  };
  const state = {
    agreement,
    confirmations: new Set<string>(),
    evidence: 1,
    fail: "",
    race: "",
    missingCount: false,
    failReread: false,
    calls: [] as string[],
    updates: 0,
  };
  const client = createClient("https://fixture.invalid", "fixture-key", {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const table = url.pathname.split("/").at(-1);
        const method = init?.method ?? "GET";
        const call = `${method}:${table}`;
        state.calls.push(call);
        if (state.fail === call) {
          return new Response(JSON.stringify({ message: "Simulated persistence failure" }), { status: 500 });
        }
        if (table === "agreements" && method === "GET") {
          if (!url.searchParams.has("or") && state.failReread) return new Response(null, { status: 500 });
          if (!url.searchParams.has("or") && state.race === "missing") return Response.json([]);
          const participant = url.searchParams.get("or");
          const visible = !participant || participant.includes(`.eq.${agreement.proposer_id}`) || participant.includes(`.eq.${agreement.responder_id}`);
          return Response.json(visible ? [agreement] : []);
        }
        if (table === "trade_evidence_items" && method === "HEAD") {
          return new Response(null, { headers: { "content-range": `*/${state.evidence}` } });
        }
        if (table === "trade_completion_confirmations" && method === "POST") {
          assert.equal(url.searchParams.get("on_conflict"), "agreement_id,user_id");
          const row = JSON.parse(String(init?.body));
          state.confirmations.add(row.user_id);
          return new Response(null, { status: 201 });
        }
        if (table === "trade_completion_confirmations" && method === "HEAD") {
          assert.equal(url.searchParams.get("user_id"), "in.(proposer,responder)");
          if (state.missingCount) return new Response(null);
          const count = [...state.confirmations].filter(id => ["proposer", "responder"].includes(id)).length;
          return new Response(null, { headers: { "content-range": `*/${count}` } });
        }
        if (table === "agreements" && method === "PATCH") {
          assert.equal(url.searchParams.get("lifecycle_status"), "in.(active,evidence_due)");
          if (state.race) {
            agreement.lifecycle_status = state.race;
            if (state.race === "completed") {
              agreement.status = "completed";
              agreement.completed_at = "2026-09-30T12:00:00.000Z";
            }
            return Response.json([]);
          }
          Object.assign(agreement, JSON.parse(String(init?.body)));
          state.updates += 1;
          return Response.json([{ id: agreement.id }]);
        }
        throw new Error(`Unexpected request: ${call}`);
      },
    },
  });
  return { state, run: (user = "proposer") => persistTradeCompletionConfirmation(client, "agreement", user) };
}

test("first confirmation is persisted without prematurely completing the agreement", async () => {
  const { state, run } = fixture();
  assert.equal((await run()).completed, false);
  assert.deepEqual([...state.confirmations], ["proposer"]);
  assert.equal(state.updates, 0);
});

test("two distinct participants complete after both writes succeed; completed retries preserve the timestamp", async () => {
  const { state, run } = fixture();
  await run();
  assert.equal((await run("responder")).completed, true);
  assert.equal(state.updates, 1);
  const completedAt = state.agreement.completed_at;
  assert.ok(completedAt);
  assert.equal((await run("responder")).alreadyCompleted, true);
  assert.equal(state.agreement.completed_at, completedAt);
  assert.equal(state.updates, 1);
});

test("repeated first-party confirmation and unrelated rows do not count as bilateral completion", async () => {
  const { state, run } = fixture();
  state.confirmations.add("outsider");
  await run();
  assert.equal((await run()).completed, false);
  assert.equal(state.updates, 0);
});

for (const failure of ["GET:agreements", "HEAD:trade_evidence_items", "POST:trade_completion_confirmations", "HEAD:trade_completion_confirmations", "PATCH:agreements"]) {
  test(`${failure} failure rejects before success effects; retry recovers without duplicate confirmations`, async () => {
    const { state, run } = fixture();
    state.confirmations.add("responder");
    state.fail = failure;
    let successEffects = 0;
    await assert.rejects(async () => {
      await run();
      successEffects += 1;
    });
    assert.equal(successEffects, 0);
    assert.equal(state.updates, 0);
    if (["GET:agreements", "HEAD:trade_evidence_items", "POST:trade_completion_confirmations"].includes(failure)) {
      assert.equal(state.confirmations.has("proposer"), false);
    }
    state.fail = "";
    assert.equal((await run()).completed, true);
    assert.equal(state.confirmations.size, 2);
    assert.equal(state.updates, 1);
  });
}

test("a concurrent completion succeeds without overwriting its timestamp", async () => {
  const { state, run } = fixture();
  state.confirmations.add("responder");
  state.race = "completed";
  assert.equal((await run()).completed, true);
  assert.equal(state.agreement.completed_at, "2026-09-30T12:00:00.000Z");
  assert.equal(state.updates, 0);
});

for (const race of ["disputed", "cancelled", "active", "missing"]) {
  test(`a concurrent ${race} state fails closed`, async () => {
    const { state, run } = fixture();
    state.confirmations.add("responder");
    state.race = race;
    await assert.rejects(run(), /could not be saved/);
    assert.equal(state.updates, 0);
  });
}

test("missing accepted evidence or a nonparticipant cannot persist a confirmation", async () => {
  const { state, run } = fixture();
  await assert.rejects(run("outsider"), /Agreement not found/);
  state.evidence = 0;
  await assert.rejects(run(), /evidence item must be accepted/);
  assert.equal(state.confirmations.size, 0);
});

test("completion action awaits checked persistence before event, notification, and success effects", () => {
  const source = readFileSync(new URL("../app/core-trade-actions-base.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export async function confirmTradeCompletionAction"), source.indexOf("export async function requestAgreementExitAction"));
  const persisted = action.indexOf("await persistTradeCompletionConfirmation(");
  assert.ok(persisted >= 0);
  for (const effect of ["recordCoreEvent(", "queuePrivateNotification(", "revalidatePath(", 'redirectWithMessage(returnTo, "message"']) {
    assert.ok(action.indexOf(effect) > persisted, effect);
  }
  assert.match(action, /if \(completed\)/);
  assert.doesNotMatch(action, /supabase\s*\.from\(/);
});


test("a missing confirmation count fails closed", async () => {
  const { state, run } = fixture();
  state.confirmations.add("responder");
  state.missingCount = true;
  await assert.rejects(run(), /could not be verified/);
  assert.equal(state.updates, 0);
});

test("a failed reread after a zero-row update fails closed", async () => {
  const { state, run } = fixture();
  state.confirmations.add("responder");
  state.race = "completed";
  state.failReread = true;
  await assert.rejects(run());
  assert.equal(state.updates, 0);
});

test("an already-completed response exits before legacy completion side effects", () => {
  const source = readFileSync(new URL("../app/core-trade-actions-base.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export async function confirmTradeCompletionAction"), source.indexOf("export async function requestAgreementExitAction"));
  const retryBranch = action.slice(action.indexOf("if (alreadyCompleted)"), action.indexOf("const counterpartId"));
  assert.match(retryBranch, /redirectWithMessage\(returnTo, "message", "This agreement is already completed/);
  assert.doesNotMatch(retryBranch, /recordCoreEvent|queuePrivateNotification/);
});
