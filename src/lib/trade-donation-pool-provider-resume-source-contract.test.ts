import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814033000_resume_trade_donation_pool_bundle_checkout.sql",
  "utf8",
);
const adminPage = readFileSync(
  "src/app/admin/trade-donation-pools/page.tsx",
  "utf8",
);

test("an already-started Every.org bundle reuses its immutable partner donation ID", () => {
  assert.match(migration, /if bundle_row\.status = 'checkout_started' then/);
  assert.match(
    migration,
    /length\(trim\(coalesce\(bundle_row\.partner_donation_id, ''\)\)\) = 0/,
  );
  assert.match(
    migration,
    /failure_code = 'provider_checkout_identity_missing'[\s\S]*?returning \* into bundle_row;[\s\S]*?return to_jsonb\(bundle_row\);/,
  );

  const resumeBranch = migration.indexOf("bundle_row.status = 'checkout_started'");
  const callerIdValidation = migration.indexOf(
    "length(trim(coalesce(p_partner_donation_id, ''))) = 0",
  );
  const newIdentityWrite = migration.indexOf("partner_donation_id = p_partner_donation_id");
  assert.ok(resumeBranch >= 0);
  assert.ok(callerIdValidation > resumeBranch);
  assert.ok(newIdentityWrite > callerIdValidation);

  assert.match(
    migration,
    /revoke all on function public\.start_trade_donation_pool_bundle_checkout\(uuid, uuid, text\)[\s\S]*?from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.start_trade_donation_pool_bundle_checkout\(uuid, uuid, text\)[\s\S]*?to service_role/,
  );
});

test("provider-integrity failures persist needs-review state instead of rolling it back", () => {
  assert.match(
    migration,
    /if invalid_component_count > 0 then[\s\S]*?status = 'needs_review'[\s\S]*?returning \* into bundle_row;[\s\S]*?return to_jsonb\(bundle_row\);/,
  );

  for (const branchStart of [
    migration.indexOf("failure_code = 'provider_checkout_identity_missing'"),
    migration.indexOf("failure_code = 'component_invalid_before_checkout'"),
  ]) {
    const branchReturn = migration.indexOf("return to_jsonb(bundle_row);", branchStart);
    assert.ok(branchStart >= 0 && branchReturn > branchStart);
    assert.equal(
      migration.slice(branchStart, branchReturn).includes("raise exception"),
      false,
    );
  }
});

test("the operator screen exposes both initial and resumed provider checkout", () => {
  assert.match(
    adminPage,
    /\["frozen", "checkout_started"\]\.includes\(bundle\.status\)/,
  );
  assert.match(adminPage, /Resume Every\.org checkout/);
  assert.match(adminPage, /Resuming Every\.org\.\.\./);
  assert.match(adminPage, /immutable partner donation ID/);
});
