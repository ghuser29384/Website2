import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260806143000_mpgf_pool_publication_materialization.sql",
  "utf8",
);
const regression = readFileSync(
  "supabase/tests/mpgf_pool_publication_materialization.sql",
  "utf8",
);

function assertIncludesAll(source: string, fragments: string[]) {
  for (const fragment of fragments) {
    assert.ok(source.includes(fragment), `Expected source to include: ${fragment}`);
  }
}

test("publication materializes only an approved frozen proposal into the canonical campaign table", () => {
  assertIncludesAll(migration, [
    "create or replace function public.mpgf_publish_pool_proposal(",
    "add column if not exists pool_proposal_id uuid",
    "add column if not exists threshold_visibility public.mpgf_threshold_visibility",
    "add column if not exists progress_visibility public.mpgf_progress_visibility",
    "add column if not exists first_accepted_pledge_at timestamptz",
    "proposal_row.status <> 'approved_as_candidate'",
    "proposal_row.approved_terms_version <> proposal_row.terms_version",
    "current_hash <> proposal_row.operative_terms_sha256",
    "from public.mpgf_pool_proposal_versions as proposal_version",
    "create_review_status <> 'approved'",
    "proposal_row.public_goods_threshold_supporters is null",
    "proposal_row.public_goods_deadline_at > round_row.ends_at",
    "round_row.status not in ('scheduled', 'open')",
    "match_pool.status = 'active'",
    "proposal_row.public_goods_payout_method is null",
    "insert into public.mpgf_public_goods_campaigns",
    "pool_proposal_id",
    "published_terms_version",
    "published_terms_sha256",
    "publicationMode', 'non_custodial_no_payment_execution'",
  ]);
});

test("publication is service-only, idempotent, and leaves immutable public evidence", () => {
  assertIncludesAll(migration, [
    "perform pg_advisory_xact_lock",
    "where campaign.pool_proposal_id = proposal_row.id",
    "This proposal was already materialized with different publication terms.",
    "create unique index if not exists mpgf_public_goods_campaigns_one_per_pool_proposal_idx",
    "create or replace function public.mpgf_guard_published_pool_campaign()",
    "Published MPGF campaign identity and operative terms are immutable.",
    "'pool_published'",
    "revoke all on function public.mpgf_publish_pool_proposal(uuid, text, text, uuid, text)",
    "grant execute on function public.mpgf_publish_pool_proposal(uuid, text, text, uuid, text)",
    "to service_role",
  ]);
});

test("publication does not create a pledge or payment object", () => {
  for (const forbidden of [
    "insert into public.mpgf_public_goods_pledges",
    "insert into public.mpgf_pledges",
    "insert into public.mpgf_pledge_intents",
    "insert into public.mpgf_conditional_pledges",
    "insert into public.mpgf_payment_intents",
  ]) {
    assert.equal(migration.includes(forbidden), false, `Publication migration must not contain: ${forbidden}`);
  }
});

test("transactional regression covers authorization, malformed state, visibility, idempotency, immutability, and no payments", () => {
  assertIncludesAll(regression, [
    "has_function_privilege(",
    "'authenticated',",
    "Unauthorized publisher unexpectedly succeeded.",
    "Draft proposal unexpectedly published.",
    "Incomplete proposal unexpectedly published.",
    "Expired proposal unexpectedly published.",
    "Published campaign was not visible to the anonymous role.",
    "Idempotent publication created duplicate campaigns or events.",
    "Published campaign operative terms unexpectedly changed.",
    "Published campaign unexpectedly deleted.",
    "Publication unexpectedly created a pledge or payment intent.",
    "rollback;",
  ]);
});
