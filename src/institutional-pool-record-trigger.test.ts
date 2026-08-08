import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const patch = readFileSync(
  "supabase/migrations/20260731173000_fix_institutional_pool_record_status_access.sql",
  "utf8",
);

test("shared institutional pool trigger reads optional status through a record-safe projection", () => {
  assert.match(patch, /create or replace function public\.institutional_validate_pool_record\(\)/i);
  assert.match(patch, /to_jsonb\(new\)->>'status'/i);
  assert.doesNotMatch(
    patch,
    /tg_table_name\s*=\s*'institutional_pool_(?:contributions|anchors|underwritings)'\s+and\s+new\.status/i,
  );
  assert.match(
    patch,
    /elsif tg_table_name='institutional_pool_votes'[\s\S]*Pool vote requires valid exact-scope pool approval authority/i,
  );
});
