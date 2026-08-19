# Resource-specific 100-Sparks contract

## Release boundary

This phase is runtime-affecting and migration-dependent. The migration is source-only in this pull
request. Do not merge, deploy, apply the migration to production, or change production data without
separate owner review and non-production database/browser validation.

## State ownership

- `cohort_onboarding_profiles.priority_allocations` remains the canonical general allocation and
  keeps its current downstream meaning.
- `profile_priority_resource_allocations` stores explicit private overrides for `money`,
  `ordinary_action`, `skilled_work`, and `career`.
- A missing resource row means inheritance. The system never writes synthetic copies for inherited
  allocations.
- `replace_profile_priority_allocations_v1` validates and replaces the general allocation plus the
  complete explicit override set in one database transaction. Removing an override therefore
  deletes its row instead of retaining hidden stale state.
- All vectors are owner-only under RLS. They are not public profile fields and must not be included
  in counterparty, analytics, logging, or error payloads.

## Current producers and consumers

| Surface | Current behavior after this phase |
| --- | --- |
| Complete Profile action | Continues to create or replace only the general allocation. With no override rows, every resource inherits it. |
| Profile priorities page | Loads the general allocation and owner-visible explicit overrides. Shows one editor at a time. |
| Profile priorities action | Atomically saves the general allocation and the exact explicit override set. |
| Profile synthesis, wish profile, and Now saved search | Continue to derive broad causes from the general allocation only. |
| `/api/live-now` and current feed ranking | Continue to read `cohort_onboarding_profiles.priority_allocations`; no resource-aware ranking cutover occurs in this phase. |
| Typed opportunity resolver | Maps donation/funding/payer opportunities to money, behavioral commitments to ordinary actions, skilled contributions to skilled work, and career/long-duration projects to career; it falls back to general when no override applies. It is additive and is not wired into live ranking yet. |

## PR #661 compatibility

PR #661 owns the account-activation route work around `/`, `/walkthrough`, `/complete-profile`, and
`/feed`. This phase does not change those routes, signup/login defaults, activation status, or the
Complete Profile success destination. The existing `/profile/priorities` default return remains
`/feed`, and Complete Profile continues to write the general vector that both branches expect.

## Exact follow-up before resource-aware ranking

1. Establish one canonical opportunity resource-type producer for every live Feed/Discover
   opportunity rather than inferring resource type independently in consumers.
2. Enumerate and test every ranking, matching, saved-search, notification, and job consumer against
   that producer.
3. Load overrides only in authenticated private computation, invoke
   `resolveProfilePriorityAllocationForOpportunity`, and return explanations or scores without
   returning complete vectors to counterparties or public payloads.
4. Run non-production migration/RLS tests plus authenticated synthetic desktop/mobile lifecycle
   tests, prove zero synthetic residue, and obtain a separate owner decision before any ranking
   cutover.
