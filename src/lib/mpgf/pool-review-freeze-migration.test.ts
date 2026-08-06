import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260806110000_mpgf_pool_review_freeze.sql";
const regressionPath = "supabase/tests/mpgf_pool_review_freeze.sql";
const migration = readFileSync(migrationPath, "utf8");
const regression = readFileSync(regressionPath, "utf8");

function includesAll(source: string, fragments: string[]) {
  for (const fragment of fragments) {
    assert.match(source, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

test("pool review migration installs reviewer authorization, versions, and append-only events", () => {
  includesAll(migration, [
    "create table if not exists public.mpgf_pool_reviewers",
    "create table if not exists public.mpgf_pool_proposal_versions",
    "create table if not exists public.mpgf_pool_lifecycle_events",
    "MPGF pool lifecycle versions and events are append-only",
    "grant all on public.mpgf_pool_reviewers to service_role",
  ]);
});

test("review transitions are service-only and approval freezes the reviewed hash", () => {
  includesAll(migration, [
    "create or replace function public.mpgf_begin_pool_proposal_review",
    "create or replace function public.mpgf_request_pool_proposal_changes",
    "create or replace function public.mpgf_reject_pool_proposal",
    "create or replace function public.mpgf_approve_and_freeze_pool_proposal",
    "recorded_hash <> current_hash",
    "from public.mpgf_pool_proposal_versions as proposal_version",
    "proposal_version.terms_sha256",
    "approved_terms_version = proposal_row.terms_version",
    "status = 'approved_as_candidate'",
    "terms_locked_at = timezone('utc', now())",
    "- 'approved_terms_version'",
    "- 'operative_terms_sha256'",
    "- 'terms_locked_at'",
    "review_status = 'approved'",
    "security invoker",
    "current_user not in ('anon', 'authenticated')",
    "Pool review state may change only through an authorized lifecycle function",
    "Pool proposal terms are immutable after review begins",
    "grant update on public.mpgf_pool_proposals to authenticated",
  ]);
});

test("material revisions use a linked successor proposal and a higher terms version", () => {
  includesAll(migration, [
    "create or replace function public.mpgf_link_pool_proposal_revision",
    "prior_row.status <> 'changes_requested'",
    "supersedes_proposal_id = p_prior_proposal_id",
    "terms_version = prior_row.terms_version + 1",
    "'revision_submitted'",
  ]);
});

test("transactional regression covers self-approval, drift, freezing, and append-only evidence", () => {
  includesAll(regression, [
    "Creator unexpectedly changed pool review status",
    "Creator unexpectedly forged the first-pledge latch",
    "Unauthorized review unexpectedly succeeded",
    "Self review unexpectedly succeeded",
    "Under-review proposal unexpectedly changed",
    "Drifted linked terms unexpectedly approved",
    "Frozen proposal unexpectedly changed",
    "Lifecycle audit event unexpectedly deleted",
    "rollback;",
  ]);
});
