import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260812043000_evidence_credibility_calibration_export_v1.sql",
  ),
  "utf8",
);
const actions = readFileSync(
  join(root, "src/app/evidence-credibility-export-actions.ts"),
  "utf8",
);
const page = readFileSync(
  join(root, "src/app/admin/evidence-calibration/exports/page.tsx"),
  "utf8",
);
const route = readFileSync(
  join(
    root,
    "src/app/api/admin/evidence-calibration/exports/[exportId]/route.ts",
  ),
  "utf8",
);
const document = readFileSync(
  join(root, "docs/moral-trade/evidence-credibility-calibration-export-v1.md"),
  "utf8",
);
const workflow = readFileSync(
  join(root, ".github/workflows/evidence-credibility-calibration-export-qa.yml"),
  "utf8",
);

function functionBody(name: string) {
  const marker = `create or replace function ${name}`;
  const start = migration.indexOf(marker);
  assert.notEqual(start, -1, `Missing ${name}`);
  const end = migration.indexOf("$function$;", start);
  assert.notEqual(end, -1, `Unterminated ${name}`);
  return migration.slice(start, end + "$function$;".length);
}

const createExport = functionBody(
  "public.create_evidence_credibility_calibration_export_v1",
);
const manifestProjection = functionBody(
  "public.get_evidence_credibility_calibration_export_manifest_v1",
);
const rowProjection = functionBody(
  "public.list_evidence_credibility_calibration_export_rows_v1",
);
const observationStart = createExport.indexOf("'schemaVersion'");
const observationEnd = createExport.indexOf(") as observation", observationStart);
assert.ok(observationStart >= 0 && observationEnd > observationStart);
const observationPayload = createExport.slice(observationStart, observationEnd);

test("export storage is append-only, private, and AAL2-admin mediated", () => {
  for (const table of [
    "evidence_credibility_calibration_exports",
    "evidence_credibility_calibration_export_rows",
  ]) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${table}`, "i"),
    );
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on table public\\.${table}[\\s\\S]*anon, authenticated`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `${table}_append_only[\\s\\S]*reject_credibility_shadow_history_mutation`,
        "i",
      ),
    );
  }
  assert.match(createExport, /require_calibration_audit_administrator\(\)/i);
  assert.match(manifestProjection, /require_calibration_audit_administrator\(\)/i);
  assert.match(rowProjection, /require_calibration_audit_administrator\(\)/i);
  assert.match(page, /currentLevel === "aal2"/i);
  assert.match(page, /robots: \{ index: false, follow: false \}/i);
});

test("creation is preregistered, cutoff-bound, and immutable by request key", () => {
  assert.match(createExport, /analysis-plan version is required before export/i);
  assert.match(
    createExport,
    /p_analysis_plan_hash !~ '\^\[0-9a-f\]\{64\}\$'/i,
  );
  assert.match(createExport, /p_source_cutoff_at > now\(\)/i);
  assert.match(
    createExport,
    /where export_record\.source_key = btrim\(p_source_key\)/i,
  );
  assert.match(
    createExport,
    /immutable calibration-export request differs from this request/i,
  );
  assert.match(actions, /preregistered_acknowledgement/i);
  assert.match(actions, /randomBytes\(32\)\.toString\("hex"\)/i);
  assert.match(
    actions,
    /admin-export:\$\{planHash\}:\$\{cutoff\.toISOString\(\)\}/i,
  );
  assert.match(page, /Commit the analysis plan before freezing the data/i);
});

test("the PostgreSQL-safe observation payload remains complete", () => {
  assert.equal(
    (observationPayload.match(/jsonb_build_object\(/g) ?? []).length,
    4,
    "The observation must stay split across four JSONB builders, below PostgreSQL's 100-argument function limit.",
  );
  assert.equal(
    (observationPayload.match(/\)\s*\|\|\s*jsonb_build_object\(/g) ?? [])
      .length,
    3,
  );

  for (const key of [
    "modelVersion",
    "originalStatus",
    "originalOutcome",
    "originalConfidenceBand",
    "originalProvenanceClass",
    "originalAdjudicationClass",
    "samplingStratum",
    "inclusionProbability",
    "samplingRandomUnit",
    "sourcePathway",
    "recencyWeightAtDecision",
    "counterpartySequenceAtDecision",
    "contextSimilarity",
    "stakeWeight",
    "predictionSnapshotHash",
    "finalStatus",
    "finalOutcome",
    "materiallyUpheld",
    "absoluteError",
    "labelHash",
  ]) {
    assert.match(observationPayload, new RegExp(`'${key}'`, "i"));
  }
  assert.match(
    observationPayload,
    /when tokenized\.original_status = 'eligible' then round[\s\S]*else null/i,
  );
  assert.match(
    createExport,
    /independent_label\.completed_at <= p_source_cutoff_at/i,
  );
  assert.match(createExport, /successor\.finalized_at <= p_source_cutoff_at/i);
});

test("raw identity, evidence, rationale, provider, payment, and stake fields are absent", () => {
  const forbiddenKeys = [
    "profileId",
    "agreementId",
    "milestoneId",
    "evidenceDecisionId",
    "settlementDecisionId",
    "assignmentId",
    "reviewerId",
    "samplingRunId",
    "storagePath",
    "evidenceUrl",
    "attestation",
    "privateRationale",
    "providerAuthenticationRef",
    "receiptId",
    "amountCents",
    "currency",
    "provider",
    "stakeUnits",
  ];
  for (const key of forbiddenKeys) {
    assert.doesNotMatch(observationPayload, new RegExp(`'${key}'`, "i"));
  }
  assert.doesNotMatch(createExport, /private_rationale/i);
  assert.doesNotMatch(
    createExport,
    /receipt_storage_path|storage_path|evidence_url|attestation/i,
  );
  assert.match(observationPayload, /'additionalityStatus', 'not_evaluated'/i);
  assert.match(document, /pseudonymization, not public anonymization/i);
});

test("domain-separated HMAC tokens preserve only private grouping structure", () => {
  assert.match(
    migration,
    /calibration_export_token_v1[\s\S]*extensions\.hmac[\s\S]*'sha256'/i,
  );
  for (const domain of [
    "observation",
    "agreement",
    "decision_chain",
    "subject",
    "counterparty",
    "participant_pair",
    "original_reviewer",
    "audit_reviewer",
    "sampling_run",
  ]) {
    assert.match(createExport, new RegExp(`'${domain}'`, "i"));
  }
  assert.match(migration, /pseudonymization_key_commitment/i);
  assert.doesNotMatch(
    migration,
    /pseudonymization_secret\s+text\s+not null/i,
  );
});

test("row and manifest integrity are cryptographically bound", () => {
  assert.match(
    createExport,
    /extensions\.digest\([\s\S]*payloads\.observation::text[\s\S]*'sha256'/i,
  );
  assert.match(
    createExport,
    /string_agg\(inserted\.row_hash, '\|' order by inserted\.row_number\)/i,
  );
  assert.match(createExport, /'rowsDigest', rows_digest_value/i);
  assert.match(createExport, /'analysisPlanHash', p_analysis_plan_hash/i);
  assert.match(createExport, /'rawEvidenceIncluded', false/i);
  assert.match(createExport, /'rawIdentityIncluded', false/i);
  assert.match(createExport, /'exactPaymentDataIncluded', false/i);
});

test("download authorization precedes streaming and never escalates to service role", () => {
  const userIndex = route.indexOf("supabase.auth.getUser()");
  const manifestIndex = route.indexOf(
    "get_evidence_credibility_calibration_export_manifest_v1",
  );
  const streamIndex = route.indexOf("new ReadableStream");
  assert.ok(userIndex >= 0);
  assert.ok(manifestIndex > userIndex);
  assert.ok(streamIndex > manifestIndex);
  assert.doesNotMatch(route, /createServiceClient/i);
  assert.match(route, /application\/x-ndjson; charset=utf-8/i);
  assert.match(route, /Cache-Control": "no-store, private, max-age=0/i);
  assert.match(route, /Content-Disposition/i);
  assert.match(route, /emitted !== expectedRows/i);
});

test("the tranche remains shadow-only and exact-head QA is fail-closed", () => {
  assert.doesNotMatch(migration, /update public\.credibility_shadow_controls/i);
  assert.doesNotMatch(migration, /insert into public\.credibility_events/i);
  assert.doesNotMatch(
    migration,
    /insert into public\.credibility_restrictions/i,
  );
  assert.doesNotMatch(
    migration,
    /fit_(?:model|weights)|isotonic|beta_regression/i,
  );
  assert.doesNotMatch(
    `${migration}\n${actions}\n${page}\n${route}`,
    /jnpoxvalyjtdghnperyu/i,
  );
  assert.match(
    document,
    /does not authorize or perform:[\s\S]*production migration or deployment/i,
  );
  assert.match(
    workflow,
    /STACK_BASE_SHA: 8389a7e362d455b392b0710dca4bc8102661ce1b/i,
  );
  assert.match(workflow, /exact durable scope and shadow boundary/i);
  assert.match(workflow, /Run calibration-export source contract/i);
  assert.match(workflow, /Prove zero residue and active-pipeline isolation/i);
  assert.doesNotMatch(workflow, /^\s*!\s+grep/gm);
});
