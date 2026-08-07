import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const qaScript = readFileSync(".github/scripts/institutional-trade-qa-e2e.mjs", "utf8");
const institutionalData = readFileSync("src/lib/institutional-data.ts", "utf8");

const verifierRoute =
  "`${baseUrl}/institutions/individual/deals/${value.deal.id}`";

test("independent verifier browser checks use the independent deal route", () => {
  const routeUses = qaScript.split(verifierRoute).length - 1;
  assert.equal(
    routeUses,
    2,
    "The verifier must use the independent deal route both before and after accepting the assignment.",
  );
  assert.match(
    qaScript,
    /Invited verifier has no confidential access before acceptance/,
  );
  assert.match(
    qaScript,
    /Named verifier acceptance atomically grants confidential access/,
  );
});

test("the independent loader grants access only after verifier acceptance", () => {
  assert.match(
    institutionalData,
    /institutional_verifier_assignments[\s\S]*?\.eq\("status", "accepted"\)\.maybeSingle\(\)/,
  );
  assert.match(
    institutionalData,
    /if \(!personalParty && deal\.lead_profile_id !== profileId && !acceptedVerifier\) return null;/,
  );
});

test("the organization deal loader remains membership-gated", () => {
  assert.match(
    institutionalData,
    /institutional_memberships[\s\S]*?\.eq\("organization_id", organizationId\)[\s\S]*?\.eq\("profile_id", viewerProfileId\)[\s\S]*?\.eq\("status", "active"\)\.maybeSingle\(\)/,
  );
});
