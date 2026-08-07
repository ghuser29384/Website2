import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const qaScript = readFileSync(".github/scripts/institutional-trade-qa-e2e.mjs", "utf8");
const accountSecurityPanel = readFileSync(
  "src/components/dashboard/background-account-security-panel.tsx",
  "utf8",
);

test("institutional MFA QA waits for the stable rendered AAL2 session state", () => {
  assert.match(
    qaScript,
    /panel\.getByText\("AAL: aal2", \{ exact: true \}\)\.waitFor/,
  );
  assert.doesNotMatch(
    qaScript,
    /getByText\("MFA verified for this session\."\)\.waitFor/,
  );
  assert.match(accountSecurityPanel, /AAL:\s*\{initialSummary\.currentLevel\}/);
  assert.match(accountSecurityPanel, /router\.refresh\(\)/);
});
