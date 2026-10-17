import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as setup from "./profile-setup";
import * as drafts from "./profile-setup-draft";
import { prepareRecordSensitiveTextFields, decryptBackgroundSensitiveText, isEncryptedBackgroundText, BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER, BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE, BACKGROUND_FIELD_ENCRYPTION_VERSION } from "./background-field-encryption";

// Execute the actual server action with synthetic identity/storage boundaries.
// No Supabase client, network, server credential, or production record is used.
const javascript = ts.transpileModule(readFileSync("src/app/complete-profile/actions.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
class RedirectResult extends Error { constructor(readonly location: string) { super(location); } }
type Row = Record<string, unknown>;
interface Options { encrypted?: boolean; readError?: boolean; concurrent?: boolean; existing?: Row | null; fallback?: boolean; }
function fixture(options: Options = {}) {
  const calls: Array<{ table: string; operation: string; filters: Row; payload?: Row }> = [];
  const revised: string[] = [];
  let ensured = 0;
  const profile: Row = { id: "member-a", display_name: "Before", username: "member-a" };
  let wish: Row | null = options.existing === undefined ? {
    profile_id: "member-a", updated_at: "2026-09-01T00:00:00Z",
    sensitive_encryption_version: BACKGROUND_FIELD_ENCRYPTION_VERSION,
    sensitive_ciphertexts: { verification_preferences: "existing-independent-ciphertext" },
    privacy_stage: "strict", is_discoverable: false, background_search_enabled: false,
  } : options.existing;
  const client = { from(table: string) {
    let operation = "select"; let payload: Row | undefined; const filters: Row = {};
    function execute() {
      calls.push({ table, operation, filters: { ...filters }, payload });
      if (operation === "select") return { data: wish ? structuredClone(wish) : null, error: options.readError ? { code: "unavailable" } : null };
      if (table === "profiles") {
        assert.equal(filters.id, "member-a"); Object.assign(profile, payload);
        if (options.concurrent && wish) wish.updated_at = "2026-09-02T00:00:00Z";
        return { error: null, data: null };
      }
      assert.equal(table, "wish_profiles");
      if (operation === "update") {
        assert.equal(filters.profile_id, "member-a");
        if (filters.updated_at !== wish?.updated_at) return { error: null, data: [] };
        Object.assign(wish!, payload);
      } else {
        assert.equal(payload?.profile_id, "member-a"); assert.equal(wish, null); wish = { ...payload };
      }
      return { error: null, data: [{ profile_id: "member-a" }] };
    }
    const query = {
      select(_columns: string) { return query; },
      update(value: Row) { operation = "update"; payload = value; return query; },
      insert(value: Row) { operation = "insert"; payload = value; return query; },
      eq(key: string, value: unknown) { filters[key] = value; return query; },
      maybeSingle: async () => execute(),
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) { return Promise.resolve(execute()).then(resolve, reject); },
    };
    return query;
  } };
  const modules: Record<string, unknown> = {
    "next/cache": { revalidatePath: (path: string) => revised.push(path) },
    "next/navigation": { redirect: (path: string) => { throw new RedirectResult(path); } },
    "@/lib/app-data": {
      requireViewer: async () => ({ authUser: { id: "member-a" }, profileStatus: options.fallback ? "fallback" : "loaded" }),
      ensureAccountRowsForUser: async () => { ensured += 1; },
    },
    "@/lib/background-field-encryption": {
      hasBackgroundFieldEncryptionKey: () => options.encrypted !== false,
      prepareRecordSensitiveTextFields, decryptBackgroundSensitiveText, isEncryptedBackgroundText,
      BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER, BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
    },
    "@/lib/profile-setup-draft": drafts,
    "@/lib/profile-setup": setup,
    "@/lib/paths": { getSafeInternalPath: (path: string, fallback: string) => path.startsWith("/") && !path.startsWith("//") ? path : fallback },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/supabase/config": { hasSupabaseEnv: () => true },
  };
  const exports: { completeWalkthroughProfileAction?: (form: FormData) => Promise<void> } = {};
  runInNewContext(javascript, { exports, URL, require(name: string) { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; } });
  const form = new FormData();
  for (const [key, value] of Object.entries({ profile_setup_version: "2", profile_owner_id: "member-a", display_name: "Member A", username: "member-a", return_to: "/complete-profile", success_to: "/discover" })) form.set(key, value);
  return { form, calls, revised, profile, get wish() { return wish; }, get ensured() { return ensured; },
    async submit() { try { await exports.completeWalkthroughProfileAction!(form); } catch (error) { if (error instanceof RedirectResult) return new URL(error.location, "https://example.invalid"); throw error; } throw new Error("Expected redirect"); } };
}

test("the actual action rejects another account and legacy forms before any storage operation", async () => {
  for (const [key, value] of [["profile_owner_id", "member-b"], ["profile_setup_version", "1"]]) {
    const f = fixture(); f.form.set(key, value); const result = await f.submit();
    assert.match(result.searchParams.get("error")!, /form changed/); assert.deepEqual(f.calls, []); assert.equal(f.ensured, 0);
  }
});
test("skipping private preferences saves identity without reading or rewriting private records", async () => {
  const f = fixture(); const before = structuredClone(f.wish); f.form.set("outcomes", "Unselected private note");
  const result = await f.submit(); assert.equal(result.pathname, "/discover");
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].table, "profiles"); assert.deepEqual(f.wish, before);
});
test("missing encryption, failed private reads, and unavailable profiles fail closed", async () => {
  for (const options of [{ encrypted: false }, { readError: true }, { fallback: true }]) {
    const f = fixture(options); f.form.set("save_preferences", "on"); f.form.set("outcomes", "My private outcome");
    const previous = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
    process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    try { assert.ok((await f.submit()).searchParams.has("error")); assert.ok(f.calls.every((c) => c.operation === "select")); }
    finally { if (previous === undefined) delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY; else process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previous; }
  }
});
test("selected notes are encrypted and merged without broadening consent or erasing other ciphertexts", async () => {
  const previous = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const f = fixture(); f.form.set("save_preferences", "on"); f.form.set("outcomes", "Local cultural preservation");
    assert.equal((await f.submit()).pathname, "/discover");
    const ciphertexts = f.wish!.sensitive_ciphertexts as Record<string, string>;
    assert.equal(ciphertexts.verification_preferences, "existing-independent-ciphertext");
    assert.equal(decryptBackgroundSensitiveText(ciphertexts.uncertainty_notes, "uncertainty_notes"), "User-stated outcomes: Local cultural preservation");
    assert.notEqual(f.wish!.uncertainty_notes, "User-stated outcomes: Local cultural preservation");
    assert.equal(f.wish!.privacy_stage, "strict"); assert.equal(f.wish!.is_discoverable, false);
    assert.ok(f.calls.every((c) => ["profiles", "wish_profiles"].includes(c.table)));
  } finally { if (previous === undefined) delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY; else process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previous; }
});
test("a competing private update is not overwritten by the actual action", async () => {
  const previous = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const f = fixture({ concurrent: true }); const ciphertexts = structuredClone(f.wish!.sensitive_ciphertexts);
    f.form.set("save_preferences", "on"); f.form.set("capabilities", "Translation");
    assert.match((await f.submit()).searchParams.get("error")!, /changed elsewhere/);
    assert.deepEqual(f.wish!.sensitive_ciphertexts, ciphertexts);
    assert.equal(f.profile.display_name, "Member A");
  } finally { if (previous === undefined) delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY; else process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previous; }
});

test("additional matching notes cannot erase existing constraints", async () => {
  const previous = process.env.BACKGROUND_FIELD_ENCRYPTION_KEY;
  process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const prior = prepareRecordSensitiveTextFields({ constraints: "Existing safety limit" });
    const f = fixture({ existing: { profile_id: "member-a", updated_at: "2026-09-01T00:00:00Z",
      ...prior.plaintextFields, sensitive_ciphertexts: prior.ciphertexts, sensitive_encryption_version: prior.version } });
    f.form.set("save_preferences", "on"); f.form.set("limits", "No travel");
    assert.equal((await f.submit()).pathname, "/discover");
    const ciphertexts = f.wish!.sensitive_ciphertexts as Record<string, string>;
    assert.equal(decryptBackgroundSensitiveText(ciphertexts.constraints, "constraints"), "Existing safety limit\n\nNo travel");
  } finally { if (previous === undefined) delete process.env.BACKGROUND_FIELD_ENCRYPTION_KEY; else process.env.BACKGROUND_FIELD_ENCRYPTION_KEY = previous; }
});
