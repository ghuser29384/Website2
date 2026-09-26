import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260811170500_evidence_credibility_shadow_capture_queue.sql",
  ),
  "utf8",
);
const actions = readFileSync(
  join(root, "src/app/evidence-credibility-capture-actions.ts"),
  "utf8",
);
const page = readFileSync(
  join(root, "src/app/admin/evidence-calibration/page.tsx"),
  "utf8",
);
const document = readFileSync(
  join(root, "docs/moral-trade/evidence-credibility-capture-queue-v1.md"),
  "utf8",
);

test("capture records are private, append-only, and rationale-bound", () => {
  assert.match(
    migration,
    /create table if not exists public\.trade_shadow_capture_records/i,
  );
  assert.match(
    migration,
    /num_nonnulls\(evidence_decision_id, settlement_decision_id\) = 1/i,
  );
  assert.match(
    migration,
    /trade_shadow_capture_records_append_only[\s\S]*reject_credibility_shadow_history_mutation/i,
  );
  assert.match(
    migration,
    /alter table public\.trade_shadow_capture_records enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.trade_shadow_capture_records[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /private_rationale_hash ~ '\^\[0-9a-f\]\{64\}\$'/i,
  );
  assert.match(
    migration,
    /immutable private rationale for this capture differs from the existing record/i,
  );
});

test("every private surface requires an AAL2 administrator and fail-closed controls", () => {
  assert.match(
    migration,
    /current_actor_has_trade_role\('administrator'\)/i,
  );
  assert.match(
    migration,
    /Shadow capture requires an AAL2 Moral Trade administrator\./i,
  );
  assert.match(
    migration,
    /control\.mode = 'shadow'[\s\S]*not control\.milestone_cutover_enabled[\s\S]*not control\.public_effects_enabled[\s\S]*not control\.ranking_effects_enabled[\s\S]*not control\.eligibility_effects_enabled/i,
  );
  assert.match(page, /verifiedTotpCount >= 1/i);
  assert.match(page, /security\.currentLevel === "aal2"/i);
  assert.match(page, /robots: \{ index: false, follow: false \}/i);
});

test("queue discovery includes only terminal facts or explicit canonical supersession", () => {
  assert.match(
    migration,
    /review\.is_final[\s\S]*review\.finalized_at is not null/i,
  );
  assert.match(
    migration,
    /payout\.is_final[\s\S]*payout\.status in \('not_due', 'confirmed', 'adjudicated_paid', 'still_due'\)/i,
  );
  assert.match(
    migration,
    /current_decision\.review_id is distinct from review\.id/i,
  );
  assert.match(
    migration,
    /current_decision\.payment_review_decision_id[\s\S]*is distinct from payment_decision\.id/i,
  );
  assert.match(
    migration,
    /milestone\.status = 'replacement_due'[\s\S]*replacement_deadline_at <= now\(\)/i,
  );
  assert.match(
    migration,
    /agreement\.lifecycle_status in \('cancelled', 'disputed', 'expired'\)/i,
  );
  assert.doesNotMatch(
    migration,
    /select[\s\S]{0,300}(?:storage_path|evidence_url|attestation)[\s\S]{0,300}returns table/i,
  );
});

test("capture wrappers derive adjudication and delegate to append-only shadow RPCs", () => {
  assert.match(
    migration,
    /review_row\.review_kind = 'appeal' then 'appeal_review_final'[\s\S]*else 'neutral_review_final'/i,
  );
  assert.match(
    migration,
    /payout_row\.status = 'confirmed' then 'bilateral_confirmed'[\s\S]*else 'platform_established'/i,
  );
  assert.match(
    migration,
    /result := public\.record_trade_evidence_decision_v1\(/i,
  );
  assert.match(
    migration,
    /result := public\.record_trade_settlement_shadow_decision_v1\(/i,
  );
  assert.match(
    migration,
    /on conflict \(evidence_decision_id\) do nothing/i,
  );
  assert.match(
    migration,
    /on conflict \(settlement_decision_id\) do nothing/i,
  );
  assert.match(
    migration,
    /'shadowOnly', true/i,
  );
});

test("the operator form preserves separate factual, confidence, provenance, and conduct axes", () => {
  for (const field of [
    "decision_confidence_band",
    "primary_provenance_class",
    "provider_authentication_status",
    "provider_authentication_ref",
    "contradiction_status",
    "integrity_finding",
    "responsiveness_finding",
    "dispute_conduct_finding",
    "finality_reason",
    "private_rationale",
  ]) {
    assert.match(page, new RegExp(`name="${field}"`));
  }
  assert.match(page, /Frozen evidence rule/i);
  assert.match(page, /No-trade baseline/i);
  assert.match(page, /Supersession required/i);
  assert.match(actions, /record_trade_evidence_shadow_capture_v1/i);
  assert.match(actions, /record_trade_settlement_shadow_capture_v1/i);
});

test("this tranche cannot activate credibility or infer additionality", () => {
  assert.doesNotMatch(
    migration,
    /update public\.credibility_shadow_controls/i,
  );
  assert.doesNotMatch(
    migration,
    /insert into public\.credibility_events/i,
  );
  assert.doesNotMatch(
    migration,
    /insert into public\.credibility_restrictions/i,
  );
  assert.doesNotMatch(
    migration,
    /additionality_status\s*=\s*'(?:verified|additional|causal)'/i,
  );
  assert.match(
    document,
    /No public, ranking, exposure, safeguard, eligibility, restriction, payment-custody, or additionality effect/i,
  );
});
