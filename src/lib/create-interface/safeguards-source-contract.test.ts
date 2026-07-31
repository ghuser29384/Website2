import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { integrateCommonGroundCreateSource } from "./common-ground-integration";
import { integrateCreateSafeguardsSource } from "./safeguards-integration";

const rawHtml = readFileSync("public/moral-trade-create/index.html", "utf8");
const commonGroundHtml = integrateCommonGroundCreateSource(rawHtml);
const safeguardedHtml = integrateCreateSafeguardsSource(commonGroundHtml);
const frame = readFileSync(
  "src/components/create/create-interface-frame.tsx",
  "utf8",
);
const safeguardsScript = readFileSync(
  "public/moral-trade-create/safeguards.js",
  "utf8",
);
const route = readFileSync("src/app/api/create/publish/route.ts", "utf8");
const canonicalPersistence = readFileSync(
  "src/lib/create-interface/persistence.ts",
  "utf8",
);
const safeguardsPersistence = readFileSync(
  "src/lib/create-interface/safeguards-persistence.ts",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20260730082500_create_contextual_safeguards.sql",
  "utf8",
);

function occurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

test("Create composes Co-Fund first and then injects one contextual safeguard block", () => {
  assert.match(frame, /integrateCommonGroundCreateSource/);
  assert.match(frame, /integrateCreateSafeguardsSource/);
  assert.match(
    frame,
    /integrateCreateSafeguardsSource\([\s\S]*integrateCommonGroundCreateSource/,
  );
  assert.equal(occurrences(safeguardedHtml, "data-create-safeguards-v1"), 1);
  assert.equal(
    occurrences(safeguardedHtml, "/moral-trade-create/safeguards.css"),
    1,
  );
  assert.equal(
    occurrences(safeguardedHtml, "/moral-trade-create/safeguards.js"),
    1,
  );
  assert.match(safeguardedHtml, /What happens without this proposal\?/);
  assert.match(
    safeguardedHtml,
    /No harm or costly baseline was manufactured or escalated/,
  );
  assert.match(
    safeguardedHtml,
    /Could someone outside the proposal bear a material cost\?/,
  );
  assert.match(safeguardedHtml, /acting only in my individual capacity/);
});

test("the browser blocks incomplete safeguards and attaches the reviewed values to the payload", () => {
  assert.match(safeguardsScript, /safeguards: readSafeguards\(\)/);
  assert.match(safeguardsScript, /noManufacturedLeverage/);
  assert.match(safeguardsScript, /affectedPartyStatus/);
  assert.match(safeguardsScript, /capacity: fields\.individualCapacity\.checked/);
  assert.match(
    safeguardsScript,
    /If no proposal is accepted, neither party incurs an obligation\./,
  );
  assert.match(safeguardsScript, /event\.stopImmediatePropagation\(\)/);
  assert.match(safeguardsScript, /publishButton\.disabled = true/);
  assert.doesNotMatch(safeguardsScript, /moral_trade_create_submit_service_v2/);
  assert.doesNotThrow(() => new Function(safeguardsScript));
});

test("the safeguarded API keeps canonical Co-Fund persistence unchanged and calls the isolated v2 adapter", () => {
  assert.match(route, /validateCreatePayloadWithSafeguards/);
  assert.match(route, /persistCreateSubmissionWithSafeguards/);
  assert.match(route, /createServiceClient/);
  assert.match(route, /actorId: viewer\.authUser\.id/);

  assert.match(
    canonicalPersistence,
    /\.rpc\("moral_trade_create_submit_service" as never/,
  );
  assert.doesNotMatch(
    canonicalPersistence,
    /moral_trade_create_submit_service_v2/,
  );
  assert.match(
    safeguardsPersistence,
    /\.rpc\([\s\S]*"moral_trade_create_submit_service_v2" as never/,
  );
  assert.match(safeguardsPersistence, /ValidatedCreatePayloadWithSafeguards/);
  assert.match(safeguardsPersistence, /p_source_payload: toJson\(validated\.source\)/);
  assert.match(safeguardsPersistence, /Co-Fund proposal/);
});

test("the database wrapper validates safeguards atomically and is executable only by service_role", () => {
  assert.match(migration, /^begin;/m);
  assert.match(
    migration,
    /create or replace function public\.moral_trade_create_submit_service_v2/,
  );
  assert.match(migration, /language plpgsql[\s\S]*security definer/);
  assert.match(
    migration,
    /from public\.moral_trade_create_submit_service\([\s\S]*p_target_fields[\s\S]*\);/,
  );
  assert.match(migration, /noManufacturedLeverage/);
  assert.match(migration, /affectedPartyStatus/);
  assert.match(migration, /capacity[\s\S]*individual/);
  assert.match(migration, /set[\s\S]*no_trade_baseline = baseline_value/);
  assert.match(
    migration,
    /revoke all on function public\.moral_trade_create_submit_service_v2[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    migration,
    /grant execute on function public\.moral_trade_create_submit_service_v2[\s\S]*to service_role/,
  );
  assert.match(migration, /commit;$/m);
});
