import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const institutionalData = readFileSync("src/lib/institutional-data.ts", "utf8");

const exactMembershipEmbed =
  '.select("*,profiles:profiles!institutional_memberships_profile_id_fkey(id,display_name,email)")';

test("organization deal membership profiles use the exact profile_id foreign key", () => {
  assert.match(institutionalData, /institutional_memberships[\s\S]*?institutional_memberships_profile_id_fkey/);
  assert.ok(
    institutionalData.includes(exactMembershipEmbed),
    "The organization deal loader must disambiguate the member profile from the inviter profile.",
  );
  assert.ok(
    !institutionalData.includes('.select("*,profiles(id,display_name,email)")'),
    "The ambiguous membership profile embed must not return.",
  );
});
