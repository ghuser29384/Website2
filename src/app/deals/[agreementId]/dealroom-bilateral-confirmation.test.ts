import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const dealroom = readFileSync(
  path.join(repoRoot, "src/app/deals/[agreementId]/dealroom-main-sections.tsx"),
  "utf8",
);
const coreActions = readFileSync(
  path.join(repoRoot, "src/app/core-trade-actions-base.ts"),
  "utf8",
);
const migration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260727043000_allow_closed_marketplace_offer_bilateral_confirmation.sql",
  ),
  "utf8",
);
const sqlRegression = readFileSync(
  path.join(repoRoot, "supabase/tests/marketplace_bilateral_confirmation.sql"),
  "utf8",
);

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("dealroom confirms the exact frozen version through the canonical action", () => {
  assert.match(dealroom, /confirmAgreementVersionAction/);
  assert.match(dealroom, /name="agreement_version_id"/);
  assert.match(dealroom, /const currentVersionId =/);
  assert.match(dealroom, /value=\{currentVersionId\}/);
  assert.match(dealroom, /name="return_to"/);
  assert.match(dealroom, /name="terms_reviewed"/);
  assert.match(dealroom, /Confirm current frozen version/);
  assert.doesNotMatch(dealroom, /updateAgreementStatusAction/);
  assert.doesNotMatch(dealroom, /Record confirmation and activate/);
});

test("canonical confirmation action can return to the private dealroom", () => {
  const action = between(
    coreActions,
    "export async function confirmAgreementVersionAction",
    "export async function proposeAgreementAmendmentAction",
  );
  assert.match(action, /safeInternalPath\([\s\S]*read\(formData, "return_to"\)/);
  assert.match(action, /confirm_agreement_version_v2/);
  assert.match(action, /revalidatePath\(`\/deals\/\$\{agreementId\}`\)/);
});

test("database repair allows only accepted closed marketplace agreements", () => {
  assert.match(migration, /offer_row\.status::text = 'matched'/);
  assert.match(migration, /offer_row\.workflow_status = 'closed'/);
  assert.match(migration, /interest_row\.status::text = 'accepted'/);
  assert.match(migration, /guest_interest_row\.status::text = 'accepted'/);
  assert.match(migration, /count\(distinct c\.user_id\)/);
});

test("SQL regression distinguishes duplicate and distinct confirmations", () => {
  assert.match(sqlRegression, /duplicate confirmation by one participant/i);
  assert.match(sqlRegression, /confirmation_count <> 1/);
  assert.match(sqlRegression, /confirmation_count <> 2/);
  assert.match(sqlRegression, /agreement_state <> 'active'/);
  assert.match(sqlRegression, /rollback;/);
});
