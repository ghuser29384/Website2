import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const qaScript = readFileSync(".github/scripts/institutional-trade-qa-e2e.mjs", "utf8");
const accountSecurityPanel = readFileSync(
  "src/components/dashboard/background-account-security-panel.tsx",
  "utf8",
);

test("institutional MFA QA verifies the persisted AAL2 session after a completed action", () => {
  assert.match(qaScript, /page\.waitForResponse/);
  assert.match(qaScript, /actionResponse\.finished\(\)/);
  assert.match(qaScript, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(qaScript, /mfa-\$\{user\.role\}-verification\.json/);
  assert.doesNotMatch(
    qaScript,
    /getByText\("MFA verified for this session\."\)\.waitFor/,
  );
  assert.match(
    accountSecurityPanel,
    /useActionState\(\s*verifyBackgroundNetworkingMfaAction/,
  );
  assert.match(accountSecurityPanel, /initialSummary\?\.session\.currentAal/);
  assert.match(accountSecurityPanel, /router\.refresh\(\)/);
});