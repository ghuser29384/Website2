import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("the Card Stack requires public-evidence certification before submission", () => {
  const workbench = source("src/components/core-trade/trade-draft-workbench.tsx");
  const action = source("src/app/core-trade-actions.ts");

  assert.match(workbench, /publicEvidenceCertification: boolean/);
  assert.match(workbench, /name="public_evidence_certification"/);
  assert.match(workbench, /!values\.publicEvidenceCertification/);
  assert.match(workbench, /evidence submitted under an active agreement is public by default/i);
  assert.match(action, /readCheckbox\(formData, "public_evidence_certification"\)/);
});

test("evidence submission requires a certified public-safe copy", () => {
  const action = source("src/app/core-trade-actions.ts");
  const agreement = source("src/app/trade-agreements/[agreementId]/page.tsx");

  assert.match(action, /readCheckbox\(formData, "public_safe_copy"\)/);
  assert.match(action, /public_visibility: "public"/);
  assert.match(action, /public_storage_path:/);
  assert.match(action, /public_redaction_note:/);
  assert.match(agreement, /name="public_safe_copy" required/);
  assert.match(agreement, /Review evidence/);
  assert.match(agreement, /immersive evidence viewer/);
  assert.match(agreement, /Visibility:/);
  assert.match(agreement, /Redaction:/);
});

test("the schema is public by default and keeps explicit safety and redaction states", () => {
  const migration = source("supabase/migrations/20260718130000_public_trade_evidence.sql");

  assert.match(migration, /public_evidence_enabled boolean not null default true/);
  assert.match(migration, /public_visibility in \('public', 'withheld_safety'\)/);
  assert.match(migration, /redaction_status in \('pending_review', 'not_required', 'redacted', 'withheld'\)/);
  assert.match(migration, /initialize_public_trade_evidence_trigger/);
  assert.match(migration, /touch_public_evidence_record_trigger/);
});

test("the Evidence Desk contains the Proof Timeline as an interactive layer", () => {
  const page = source("src/app/evidence/[[...recordId]]/page.tsx");
  const stage = source("src/components/evidence/evidence-stage.tsx");
  const evidenceSurface = `${page}\n${stage}`;

  assert.match(evidenceSurface, /data-pe-desk/);
  assert.match(evidenceSurface, /data-pe-timeline-toggle/);
  assert.match(evidenceSurface, /data-pe-timeline/);
  assert.match(evidenceSurface, /data-pe-open-evidence/);
  assert.match(evidenceSurface, /data-pe-select/);
  assert.match(evidenceSurface, /setTimelineOpen\(false\)/);
  assert.match(evidenceSurface, /Illustrative record — the people, evidence, and review state below are examples/);
});

test("participant evidence decisions stay scoped, confirmed, and inside the review window", () => {
  const action = source("src/app/core-trade-actions.ts");
  const stage = source("src/components/evidence/evidence-stage.tsx");

  assert.match(action, /safeInternalPath\(\s*read\(formData, "return_to"\)/);
  assert.match(action, /reviewWindowEndsAt <= Date\.now\(\)/);
  assert.match(stage, /acceptDialogRef\.current\?\.showModal\(\)/);
  assert.match(stage, /Accepting records your participant review/);
  assert.match(stage, /name="return_to"/);
  assert.match(stage, /styles\.verdictSubmitted/);
  assert.match(stage, /This screen records review decisions; it does not itself hold or release funds/);
});
