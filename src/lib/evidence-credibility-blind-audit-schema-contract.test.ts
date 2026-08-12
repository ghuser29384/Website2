import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260812022000_evidence_credibility_blind_audit_v1.sql",
  ),
  "utf8",
);
const actions = readFileSync(
  join(root, "src/app/evidence-credibility-audit-actions.ts"),
  "utf8",
);
const adminPage = readFileSync(
  join(root, "src/app/admin/evidence-calibration/audits/page.tsx"),
  "utf8",
);
const reviewerPage = readFileSync(
  join(root, "src/app/review/evidence-calibration/page.tsx"),
  "utf8",
);
const fileRoute = readFileSync(
  join(root, "src/app/api/review/evidence-calibration/file/route.ts"),
  "utf8",
);
const document = readFileSync(
  join(root, "docs/moral-trade/evidence-credibility-blind-audit-v1.md"),
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

const reviewerProjection = functionBody(
  "public.list_my_evidence_credibility_calibration_audits_v1",
);
const labelFunction = functionBody(
  "public.record_evidence_credibility_calibration_label_v1",
);

test("sampling runs and draws are immutable, reproducible, and probability-complete", () => {
  for (const table of [
    "evidence_credibility_calibration_sampling_runs",
    "evidence_credibility_calibration_draws",
    "evidence_credibility_calibration_audit_assignments",
    "evidence_credibility_calibration_assignment_events",
    "evidence_credibility_calibration_labels",
  ]) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${table}`, "i"),
    );
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
  }

  assert.match(migration, /seed_material ~ '\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(migration, /seed_commitment ~ '\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(
    migration,
    /selected = \(random_unit < inclusion_probability\)/i,
  );
  assert.match(
    migration,
    /calibration_random_unit_v1[\s\S]*extensions\.digest[\s\S]*'sha256'/i,
  );
  assert.match(
    migration,
    /mandatory_deliberate_fabrication[\s\S]*mandatory_administrative_correction[\s\S]*mandatory_zero_confidence_or_review_required/i,
  );
  assert.match(migration, /else p_random_floor end/i);
  assert.match(migration, /snapshot_hash ~ '\^\[0-9a-f\]\{64\}\$'/i);
});

test("every audit surface is AAL2-gated and active effects remain fail-closed", () => {
  assert.match(
    migration,
    /current_actor_has_trade_role\('administrator'\)/i,
  );
  assert.match(migration, /current_actor_has_trade_role\('reviewer'\)/i);
  assert.match(
    migration,
    /control\.mode = 'shadow'[\s\S]*not control\.milestone_cutover_enabled[\s\S]*not control\.public_effects_enabled[\s\S]*not control\.ranking_effects_enabled[\s\S]*not control\.eligibility_effects_enabled/i,
  );
  assert.match(adminPage, /currentLevel === "aal2"/i);
  assert.match(reviewerPage, /currentLevel === "aal2"/i);
  assert.match(adminPage, /robots: \{ index: false, follow: false \}/i);
  assert.match(reviewerPage, /robots: \{ index: false, follow: false \}/i);
  assert.doesNotMatch(migration, /update public\.credibility_shadow_controls/i);
  assert.doesNotMatch(migration, /insert into public\.credibility_events/i);
  assert.doesNotMatch(migration, /insert into public\.credibility_restrictions/i);
});

test("assignment excludes the original reviewer and both parties", () => {
  assert.match(
    migration,
    /p_reviewer_id in \([\s\S]*draw_row\.subject_profile_id[\s\S]*draw_row\.counterparty_profile_id[\s\S]*draw_row\.original_reviewer_id[\s\S]*\)/i,
  );
  assert.match(
    migration,
    /The calibration reviewer must be independent of the original reviewer and parties\./i,
  );
  assert.match(
    migration,
    /reviewer_grant\.role = 'reviewer'[\s\S]*reviewer_grant\.active[\s\S]*reviewer_grant\.revoked_at is null/i,
  );
  assert.match(adminPage, /excluded_reviewer_ids/i);
  assert.match(actions, /assign_evidence_credibility_calibration_audit_v1/i);
});

test("the reviewer projection omits every forbidden prior-judgment field", () => {
  const forbiddenEverywhere = [
    "original_outcome",
    "original_confidence_band",
    "original_provenance_class",
    "provenance_weight",
    "decision_confidence_weight",
    "subject_profile_id",
    "counterparty_profile_id",
    "original_reviewer_id",
    "weighted_success",
    "weighted_failure",
    "selected_reason",
    "inclusion_probability",
    "sampling_stratum",
  ];

  for (const field of forbiddenEverywhere) {
    assert.doesNotMatch(reviewerProjection, new RegExp(field, "i"));
    assert.doesNotMatch(reviewerPage, new RegExp(field, "i"));
  }

  assert.doesNotMatch(reviewerProjection, /private_rationale/i);
  assert.match(reviewerPage, /name="private_rationale"/i);
  assert.match(
    reviewerPage,
    /Explain the evidence-to-conclusion path without referring to any hidden original decision/i,
  );
  assert.match(reviewerProjection, /'AUD-' \|\| upper/i);
  assert.match(reviewerProjection, /milestone\.evidence_rule/i);
  assert.match(reviewerProjection, /version\.no_trade_baseline/i);
  assert.match(reviewerProjection, /evidence_items jsonb/i);
  assert.match(reviewerProjection, /payment_receipt jsonb/i);
  assert.match(reviewerPage, /Review the evidence, not the prior judgment/i);
});

test("private file delivery authorizes first and never reveals a storage path", () => {
  const permissionIndex = fileRoute.indexOf(
    "can_access_my_evidence_credibility_calibration_file_v1",
  );
  const serviceIndex = fileRoute.indexOf("createServiceClient()");
  const downloadIndex = fileRoute.indexOf(".download(storagePath)");

  assert.ok(permissionIndex >= 0, "Missing reviewer-bound file authorization");
  assert.ok(serviceIndex > permissionIndex, "Service client was created before authorization");
  assert.ok(downloadIndex > serviceIndex, "Storage download preceded service lookup");
  assert.match(fileRoute, /Cache-Control": "no-store, private/i);
  assert.match(fileRoute, /X-Content-Type-Options": "nosniff"/i);
  assert.doesNotMatch(fileRoute, /NextResponse\.json\([\s\S]{0,200}storagePath/i);
  assert.match(
    migration,
    /can_access_my_evidence_credibility_calibration_file_v1/i,
  );
});

test("independent labels preserve continuous error and validate target-specific vocabularies", () => {
  assert.match(
    migration,
    /absolute_error_value := case[\s\S]*abs\(draw_row\.original_outcome - p_final_outcome\)/i,
  );
  assert.match(
    migration,
    /abs\(draw_row\.original_outcome - p_final_outcome\) <= 0\.05/i,
  );
  assert.match(migration, /materially_upheld boolean not null/i);
  assert.match(migration, /label_hash ~ '\^\[0-9a-f\]\{64\}\$'/i);
  assert.match(
    migration,
    /evidence_credibility_calibration_labels_finality_check/i,
  );
  assert.match(
    migration,
    /evidence_credibility_calibration_labels_integrity_check/i,
  );
  assert.match(
    labelFunction,
    /Choose a permitted independent evidence finality\./i,
  );
  assert.match(
    labelFunction,
    /Choose a permitted independent settlement finality\./i,
  );
  assert.match(
    labelFunction,
    /Settlement labels must leave evidence-conduct findings not applicable\./i,
  );
  assert.match(actions, /record_evidence_credibility_calibration_label_v1/i);
  assert.match(reviewerPage, /name="final_outcome"/i);
  assert.match(reviewerPage, /name="private_rationale"/i);
  assert.match(reviewerPage, /name="blinding_complete"/i);
});

test("history is append-only and every trigger is idempotently replaced", () => {
  for (const suffix of [
    "sampling_runs",
    "draws",
    "assignments",
    "assignment_events",
    "labels",
  ]) {
    const trigger = `evidence_credibility_calibration_${suffix}_append_only`;
    assert.match(
      migration,
      new RegExp(`drop trigger if exists ${trigger}`, "i"),
    );
    assert.match(
      migration,
      new RegExp(
        `create trigger ${trigger}[\\s\\S]*reject_credibility_shadow_history_mutation`,
        "i",
      ),
    );
  }
});

test("Tranche B does not silently implement export, fitting, activation, or additionality", () => {
  assert.doesNotMatch(migration, /calibration_export/i);
  assert.doesNotMatch(migration, /fit_(?:model|weights)|isotonic|beta_regression/i);
  assert.doesNotMatch(migration, /additionality_status\s*=\s*'(?:verified|additional|causal)'/i);
  assert.match(
    document,
    /Tranche C de-identified export remains a separate future implementation/i,
  );
  assert.match(
    document,
    /does not authorize or perform:[\s\S]*public credibility changes/i,
  );
  assert.match(document, /production migration or deployment/i);
  assert.doesNotMatch(
    `${migration}\n${actions}\n${adminPage}\n${reviewerPage}\n${fileRoute}`,
    /jnpoxvalyjtdghnperyu/i,
  );
});
