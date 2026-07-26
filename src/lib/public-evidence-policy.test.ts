import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("the Card Stack requires public-evidence certification before submission", () => {
  const workbench = source("src/components/core-trade/trade-draft-workbench.tsx");
  const action = source("src/app/core-trade-actions-base.ts");

  assert.match(workbench, /publicEvidenceCertification: boolean/);
  assert.match(workbench, /name="public_evidence_certification"/);
  assert.match(workbench, /!values\.publicEvidenceCertification/);
  assert.match(workbench, /evidence submitted under an active agreement is public by default/i);
  assert.match(action, /readCheckbox\(formData, "public_evidence_certification"\)/);
});

test("evidence submission requires a certified public-safe copy", () => {
  const action = source("src/app/core-trade-actions-base.ts");
  const agreement = source("src/app/trade-agreements/[agreementId]/page.tsx");

  assert.match(action, /readCheckbox\(formData, "public_safe_copy"\)/);
  assert.match(action, /public_visibility: "public"/);
  assert.match(action, /public_storage_path:/);
  assert.match(action, /public_redaction_note:/);
  assert.match(agreement, /name="public_safe_copy" required/);
  assert.match(agreement, /Review evidence/);
  assert.match(agreement, /evidence (?:viewer|dossier)/i);
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

test("the evidence dossier exposes section tabs, artifact controls, and privacy details", () => {
  const page = source("src/app/evidence/[[...recordId]]/page.tsx");
  const stage = source("src/components/evidence/evidence-stage.tsx");
  const evidenceSurface = `${page}\n${stage}`;

  assert.match(evidenceSurface, /data-stage-evidence-viewer/);
  assert.match(evidenceSurface, /role="tablist"/);
  assert.match(evidenceSurface, /role="tab"/);
  assert.match(evidenceSurface, /\{ id: "evidence", label: "Evidence" \}/);
  assert.match(evidenceSurface, /\{ id: "terms", label: "Trade terms" \}/);
  assert.match(evidenceSurface, /\{ id: "verification", label: "Verification" \}/);
  assert.match(evidenceSurface, /data-stage-artifact/);
  assert.match(evidenceSurface, /aria-pressed=/);
  assert.match(evidenceSurface, /Privacy details/);
  assert.match(evidenceSurface, /Illustrative record — the people, evidence, and review state below are examples/);
  assert.match(stage, /LocalDateTime/);
  assert.doesNotMatch(stage, /new Intl\.DateTimeFormat/);
});

test("the global directory is evidence-driven while direct trade dossiers can await submission", () => {
  const page = source("src/app/evidence/[[...recordId]]/page.tsx");
  const hydrateStart = page.indexOf("async function hydratePublic");
  const hydrateEnd = page.indexOf("async function listRecords", hydrateStart);
  const hydrate = page.slice(hydrateStart, hydrateEnd);
  const directoryStart = page.indexOf("async function listRecords");
  const directoryEnd = page.indexOf("async function getRecord", directoryStart);
  const directory = page.slice(directoryStart, directoryEnd);

  assert.ok(hydrateStart >= 0 && hydrateEnd > hydrateStart, "could not locate the evidence hydrator");
  assert.match(hydrate, /const rawEvidence = byAgreement\.get\(id\) \?\? \[\]/);
  assert.match(hydrate, /records\.push/);
  assert.ok(directoryStart >= 0 && directoryEnd > directoryStart, "could not locate the evidence directory query");
  assert.match(directory, /list_public_moral_trade_evidence_v1/);
  assert.match(directory, /hydratePublic/);
  assert.match(directory, /p_limit: DIRECTORY_PAGE_SIZE/);
  assert.match(directory, /p_offset: from/);
  assert.doesNotMatch(directory, /\.limit\(50\)/);
  assert.doesNotMatch(hydrate, /from\("trade_evidence_items"\)\.select\("\*"\)/);
  assert.doesNotMatch(page, /createServiceClient/);
  assert.match(page, /No evidence has been submitted yet\./);
  assert.match(page, /Evidence could not be loaded\./);
});

test("the Evidence directory uses the shared product language without confusing state colors", () => {
  const page = source("src/app/evidence/[[...recordId]]/page.tsx");
  const directoryStyles = source(
    "src/app/evidence/[[...recordId]]/evidence-directory.module.css",
  );
  const dossierStyles = source("src/components/evidence/evidence-stage.module.css");

  assert.match(page, /data-testid="evidence-product-shell"/);
  assert.match(page, /aria-label="Evidence sections"/);
  assert.match(page, /<form action="\/evidence" method="get">/);
  assert.match(page, /aria-labelledby=\{titleId\}/);
  assert.match(page, /Interface guide · no live data/);
  assert.match(page, /showSearch/);
  assert.doesNotMatch(page, /showSearch=\{false\}/);
  assert.match(directoryStyles, /--ledger-paper: var\(--bg\)/);
  assert.match(directoryStyles, /--ledger-blue: var\(--accent\)/);
  assert.match(directoryStyles, /font-family: var\(--font-heading\)/);
  assert.match(directoryStyles, /font-family: var\(--font-mono\)/);
  assert.match(directoryStyles, /outline: 2px solid var\(--ledger-blue\)/);
  assert.match(dossierStyles, /--evidence-accent: var\(--accent\)/);
  assert.match(page, /label: "Participant accepted"/);
  assert.match(
    source("src/components/evidence/evidence-stage.tsx"),
    /const allAccepted = record\.evidence\.length > 0 && acceptedCount === record\.evidence\.length/,
  );
  assert.match(dossierStyles, /\.statusChallenged[\s\S]*var\(--evidence-red\)/);
  assert.match(dossierStyles, /\.tabs \.activeTab::after \{\s*background: var\(--evidence-accent\)/);
  assert.match(dossierStyles, /\.timelineAccepted \.timelineMarker[\s\S]*var\(--evidence-green\)/);
  assert.match(dossierStyles, /\.timelineChallenged \.timelineMarker[\s\S]*var\(--evidence-red\)/);
});

test("the public evidence read contract projects only approved fields and gates stored files", () => {
  const migration = source(
    "supabase/migrations/20260722104500_public_evidence_read_contract.sql",
  );

  assert.match(migration, /get_public_moral_trade_evidence_v1/);
  assert.match(migration, /list_public_moral_trade_evidence_v1/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /a\.public_evidence_enabled is true/);
  assert.match(migration, /e\.public_visibility = 'public'/);
  assert.match(migration, /e\.public_published_at is not null/);
  assert.match(migration, /e\.redaction_status in \('redacted', 'not_required'\)/);
  assert.match(migration, /e\.public_storage_path = target_object_name/);
  assert.match(migration, /grant execute on function public\.get_public_moral_trade_evidence_v1\(uuid\) to anon, authenticated/);
  assert.match(migration, /limit least\(greatest\(coalesce\(p_limit, 24\), 1\), 50\)/);
  assert.doesNotMatch(
    migration.slice(
      migration.indexOf("create or replace function public.get_public_moral_trade_evidence_v1"),
      migration.indexOf("comment on function public.get_public_moral_trade_evidence_v1"),
    ),
    /e\.(storage_path|evidence_url|attestation|challenge_reason)/,
  );
  assert.doesNotMatch(migration, /public_summary[^\n]+attestation/);
});

test("participant evidence decisions stay scoped, confirmed, and inside the review window", () => {
  const action = source("src/app/core-trade-actions-base.ts");
  const stage = source("src/components/evidence/evidence-stage.tsx");

  assert.match(action, /safeInternalPath\(\s*read\(formData, "return_to"\)/);
  assert.match(action, /reviewWindowEndsAt <= Date\.now\(\)/);
  assert.match(stage, /acceptDialogRef\.current\?\.showModal\(\)/);
  assert.match(stage, /Accepting records your participant review/);
  assert.match(stage, /name="return_to"/);
  assert.match(stage, /this screen does not itself move money/i);
});
