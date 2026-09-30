import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readPublicOutcomeAvailability } from "./public-outcome-availability";

const outcome = { actionCategory: "volunteering", lifecycleStatus: "graded", confidenceBand: 100,
  completionFraction: 1, payoutPercentage: 0, date: "2026-09-28" };

async function execute(data: unknown, error: unknown = null, throwing = false) {
  const calls: unknown[] = [];
  const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
  const modules: Record<string, unknown> = {
    "@supabase/supabase-js": { createClient: (url: string, key: string, options: unknown) => {
      calls.push({ url, key, options: plain(options) });
      return { rpc: (name: string, args: unknown) => {
        calls.push({ name, args: plain(args) });
        return { abortSignal: (signal: AbortSignal) => {
          assert.ok(signal instanceof AbortSignal);
          if (throwing) throw new Error("fixture transport unavailable");
          return Promise.resolve({ data, error });
        } };
      } };
    } },
    "next/server": { NextResponse: { json: (body: unknown, options: unknown) => plain({ body, options }) } },
    "@/lib/public-outcome-availability": { readPublicOutcomeAvailability },
    "@/lib/supabase/config": { getSupabaseEnv: () => ({ url: "http://127.0.0.1:54331", publishableKey: "public-fixture" }) },
  };
  const compiled = ts.transpileModule(readFileSync("src/app/api/navigation/evidence/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports: { GET?: () => Promise<{ body: { available: boolean }; options: { headers: Record<string, string> } }> } = {};
  vm.runInNewContext(compiled.outputText, { exports, AbortSignal, require: (name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unreviewed dependency: ${name}`);
    return modules[name];
  } });
  assert.ok(exports.GET);
  return { calls, response: await exports.GET() };
}

test("actual GET executes only the anonymous bounded projection and publishes a boolean", async () => {
  const { calls, response } = await execute({ records: [outcome] });
  assert.deepEqual(calls, [
    { url: "http://127.0.0.1:54331", key: "public-fixture", options: {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    } },
    { name: "list_public_moral_trade_outcomes_v2", args: { p_limit: 1, p_offset: 0 } },
  ]);
  assert.deepEqual(response.body, { available: true });
  assert.equal(response.options.headers["Cache-Control"], "no-store");
});

test("actual GET never leaks backend records or errors and hides empty/malformed/failed reads", async () => {
  for (const [data, error, throwing] of [
    [{ records: [] }, null, false],
    [{ totalRecords: 10 }, null, false],
    [{ records: [{ ...outcome, participantId: "private-fixture" }] }, null, false],
    [{ records: [outcome] }, { message: "private backend detail" }, false],
    [null, null, true],
  ] as const) {
    const { response } = await execute(data, error, throwing);
    assert.deepEqual(response.body, { available: false });
    assert.equal(response.options.headers["Cache-Control"], "no-store");
  }
});
