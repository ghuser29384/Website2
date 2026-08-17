import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionSource = readFileSync("src/app/trade-donation-actions-base.ts", "utf8");
const privilegeMigration = readFileSync(
  "supabase/migrations/20260817113000_authenticate_trade_donation_confirmation_caller.sql",
  "utf8",
);
const privacyCutover = readFileSync(
  "supabase/migrations/20260729165533_evidence_weighted_privacy_authorization_cutover.sql",
  "utf8",
);

function donationConfirmationAction() {
  const start = actionSource.indexOf(
    "export async function confirmDonationAwareAgreementVersionAction",
  );
  const end = actionSource.indexOf(
    "export async function confirmDonationAwareTradeCompletionAction",
    start,
  );
  assert.ok(start >= 0 && end > start, "Donation-backed confirmation action was not found.");
  return actionSource.slice(start, end);
}

test("donation-backed confirmation uses the cookie-bound authenticated client", () => {
  const action = donationConfirmationAction();
  const viewerIndex = action.indexOf("const viewer = await requireViewer(returnTo);");
  const clientIndex = action.indexOf("const supabase = (await createClient()) as any;");

  assert.ok(viewerIndex >= 0, "The action must authenticate the viewer first.");
  assert.ok(clientIndex > viewerIndex, "The authenticated client must be created after requireViewer.");
  assert.doesNotMatch(action, /createServiceClient\(\)/);
  assert.match(action, /p_actor_id:\s*viewer\.authUser\.id/);
  assert.match(action, /confirm_trade_donation_version_v2/);
});

test("ordinary non-donation confirmation retains the established base action", () => {
  const action = donationConfirmationAction();
  assert.match(
    action,
    /if\s*\(!context\?\.term\)\s*\{[\s\S]*?return confirmBaseAgreementVersionAction\(formData\);[\s\S]*?\}/,
  );
});

test("the forward-only migration exposes confirmation only to authenticated callers", () => {
  assert.match(
    privilegeMigration,
    /revoke all on function public\.confirm_trade_donation_version_v2\(\s*uuid,\s*uuid,\s*uuid\s*\) from public,\s*anon,\s*authenticated,\s*service_role;/i,
  );
  assert.match(
    privilegeMigration,
    /grant execute on function public\.confirm_trade_donation_version_v2\(\s*uuid,\s*uuid,\s*uuid\s*\) to authenticated;/i,
  );
  assert.doesNotMatch(
    privilegeMigration,
    /grant execute on function public\.confirm_trade_donation_version_v2[\s\S]*to service_role/i,
  );
});

test("the participant-binding trigger remains fail-closed on absent or mismatched auth identity", () => {
  assert.match(
    privacyCutover,
    /if auth\.uid\(\) is null or new\.user_id is distinct from auth\.uid\(\) then\s*raise exception 'A confirmation must belong to the authenticated participant\.'/i,
  );
  assert.doesNotMatch(privacyCutover, /set_config\([^)]*request\.jwt\.claims/i);
});
