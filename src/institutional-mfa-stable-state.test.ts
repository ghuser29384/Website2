import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const qaScript = readFileSync(".github/scripts/institutional-trade-qa-e2e.mjs", "utf8");
const accountSecurityPanel = readFileSync(
  "src/components/dashboard/background-account-security-panel.tsx",
  "utf8",
);

test("institutional MFA QA bounds response settling before verifying persisted AAL2", () => {
  assert.match(qaScript, /page\.waitForResponse/);
  assert.match(qaScript, /authCookieSignature/);
  assert.match(qaScript, /authCookieChanged/);
  assert.match(qaScript, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(qaScript, /mfa-\$\{user\.role\}-verification\.json/);
  assert.doesNotMatch(qaScript, /actionResponse\.finished\(\)/);
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