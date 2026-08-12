import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("targeted fidelity fixes load between the canonical system and final remediation", () => {
  const layout = read("src/app/layout.tsx");
  const canonicalImport = 'import "./canonical-visual-system.css";';
  const fidelityImport = 'import "./canonical-visual-fidelity-fixes.css";';
  const remediationImport = 'import "./canonical-visual-system-remediation.css";';

  assert.match(layout, /import "\.\/canonical-visual-fidelity-fixes\.css";/);
  assert.ok(layout.indexOf(canonicalImport) < layout.indexOf(fidelityImport));
  assert.ok(layout.indexOf(fidelityImport) < layout.indexOf(remediationImport));
});

test("fidelity repairs remain narrowly scoped to the two audited defects", () => {
  const styles = read("src/app/canonical-visual-fidelity-fixes.css");

  assert.match(styles, /body:has\(\.growth-start-section\) \.growth-progress-card/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /\.growth-progress-stat[\s\S]*grid-template-columns:\s*2\.25rem minmax\(0, 1fr\) auto/);
  assert.match(styles, /\[data-mt-surface="complete-profile"\] > button\[aria-haspopup="dialog"\]/);
  assert.match(styles, /right:\s*232px\s*!important/);
  assert.equal(styles.includes('data-mt-surface="auth"'), false);
});
