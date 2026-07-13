# Codex Implementation Spec: Consent-Gated Background Delegate for Moral Trade

## Source priorities

Prioritize the Forethought background-networking design sketch and Moral Trade’s current public Background Networking contracts:

- Forethought: [Design sketches: defense-favoured coordination tech — Background networking](https://www.forethought.org/research/design-sketches-defense-favoured-coordination-tech#background-networking)
- Moral Trade: [Background networking](https://www.moraltrade.org/background-networking)
- Moral Trade: [Match signal contract](https://www.moraltrade.org/api/moral-trade/match-signal/contract)
- Moral Trade: [Private overlap contract](https://www.moraltrade.org/api/moral-trade/private-overlap/contract)

## Revision 20 improvements

This revision keeps the core mechanism from `bg networking19.md` but tightens four remaining failure modes with high expected value and low downside:

- Preserve revision 19’s explicit **delegate authorization**, default cohort/matchmaker scoping, Moral Trade factor-code compatibility, prohibited-coordination blockers, and provenance/prompt-injection tests.
- Add **stale-brief invalidation**: opportunity briefs must snapshot the authorization, profile version, source-summary dependencies, candidate discoverability state, and expiry window; stale briefs lose all actions until recomputed.
- Add **probe-resistant helper runs**: delegate runs must enforce a minimum eligible-pool floor, dedupe repeated candidate exposure, bucket all visible counts, and block profile/query variants that would turn the system into an enumeration oracle.
- Add **uncertainty gating**: unconfirmed interview outputs or source-derived uncertainty flags may explain missing context, but may not add positive matching weight until explicitly confirmed by the participant.
- Add **participant-visible redacted delegate receipts** for runs, stale transitions, opportunity creation, and intro-request creation, without storing raw source text, exact wishes, exact candidate identity, private cohort membership, or message content in telemetry.

## Exact best concrete mechanism

Build a **Consent-Gated Background Delegate that creates privacy-safe opportunity briefs**.

Credence in this as the right first mechanism for Moral Trade: **0.76**.

Do **not** make live private-feed scraping, autonomous outreach, or production private-set-intersection the first build. Forethought’s background-networking section describes a “matchmaking marketplace” of attentive personalized helpers that look for promising connections and notify principals, with passive source access and proactive wish injection as possible inputs. It also flags privacy, surveillance, harassment, exploitation, and collusion as central design risks.

Moral Trade’s current public implementation already emphasizes broad previews first, consent before detail, no autonomous outreach, deterministic matching, no private-feed mining, minimal telemetry, anti-enumeration budgets, and default-off higher-power lanes.

The exact mechanism is:

> **A user-approved delegate profile + reviewed source summaries + deterministic broad-preview matching + generic opportunity briefs + mutual-consent intro requests.**

## Operational flow

1. A participant opts into Background Networking.
2. The participant creates an explicit **delegate authorization** that states what the background helper may use, where it may search, how often it may run, how many briefs it may create, the minimum confidence band, and when the authorization expires.
3. The participant creates a **structured wish profile** through explicit fields and, where enabled, a fluent but schema-bound interview.
4. The participant may add **manual or imported source summaries**, but raw feeds are not continuously searched, stored in analytics, or used directly for matching.
5. The system converts only user-approved wishes and source summaries into **broad matching signals**:
   - cause areas
   - offers
   - asks
   - capabilities
   - constraints
   - verification preferences
   - coarse availability
   - privacy stage
   - exclusions
6. A background helper job periodically searches the wish registry using only those broad signals and only inside the participant-approved authorization scope. By default, that scope should be a specific cohort, pilot pack, partner-approved audience, or existing matchmaker workflow rather than the whole registry.
7. Before scoring, the helper applies an anti-probing floor: the authorized search pool must be broad enough, repeated candidate exposure must be deduped, and visible count outputs must be bucketed rather than exact.
8. If it finds a high-confidence broad match that passes privacy, safety, anti-enumeration, anti-collusion, cohort-scope, dependency-validity, and uncertainty-gating checks, it creates an **opportunity brief** with:
   - reason codes
   - confidence band
   - visible redactions
   - blockers
   - source/provenance surfaces
   - dependency snapshots
   - redacted delegate receipt id
   - next-step options
9. Notifications are generic. They never include exact wishes, source notes, contact details, private constraints, or counterparty-specific sensitive content.
10. The participant can dismiss, defer, report, or request an introduction.
11. Every display or action revalidates the brief’s dependency snapshot; if an authorization, profile scope, source summary, candidate discoverability state, cohort boundary, or expiry window has changed, the brief becomes stale and cannot advance to an intro request.
12. Only after mutual consent and operator review can field-level grants disclose more detail.

This matches Forethought’s “helpers in the background + wish profiling + semi-private registry” design while preserving Moral Trade’s safety posture. The default adoption path is niche/community-first, not a global unscoped matching graph.

---

# Instruction for Codex GPT-5.5-xHigh

You are Codex GPT-5.5-xHigh working in the Moral Trade repository.

## Goal

Build the exact best concrete Background Networking mechanism for Moral Trade: a **Consent-Gated Background Delegate** that turns user-approved wish profiles and reviewed source summaries into privacy-safe opportunity briefs, then routes interested users into mutual-consent, operator-reviewed introductions.

This is **not**:

- a scraping feature
- an autonomous outreach feature
- an engagement recommender
- a global moral-ranking system
- a production private-overlap cryptography feature

## Core mechanism

Implement a background delegate loop with this invariant-preserving flow:

1. Participant opts into Background Networking.
2. Participant grants a time-bounded delegate authorization covering allowed surfaces, audience/cohort scope, run budget, maximum briefs, minimum confidence band, and revocation controls.
3. Participant creates or updates a structured wish profile through explicit fields and, where enabled, a schema-bound fluent interview.
4. Participant may add a manual or imported source summary. Raw private feeds must not be continuously ingested, searched, copied into analytics, or used directly for matching.
5. Only participant-approved broad signals become match inputs.
6. A deterministic background helper run searches broad wish-registry previews and approved broad profile signals within the active authorization scope.
7. The helper run enforces a minimum eligible-pool floor, repeated-candidate dedupe, count bucketing, and query/profile-variant anti-probing controls before scoring candidates.
8. If a candidate match passes eligibility, safety, anti-collusion, anti-enumeration, cohort-scope, dependency-validity, uncertainty-gating, and threshold checks, create a privacy-safe opportunity brief with redacted dependency snapshots and a participant-visible receipt.
9. Notify the participant with generic copy only.
10. Participant can dismiss, defer, report, or request an intro.
11. Before display or feedback, revalidate the brief’s authorization, profile, source-summary, cohort, candidate-discoverability, and expiry dependencies; stale briefs must not be actionable.
12. Intro requests remain operator-reviewed and mutual-consent gated before any exact wishes, contact details, sensitive constraints, source notes, or private counterparties are disclosed.

Use or extend existing Background Networking tables, routes, validators, and tests if present. Do not fork the domain model unnecessarily.

## Hard invariants

- Broad previews before exact private details.
- Exact details move only through field-level, purpose-bound privacy grants.
- No autonomous outreach.
- No raw private-feed ingestion for matching.
- No raw source text in analytics, logs, notifications, or public reports.
- No hidden ML ranking of people.
- No global moral ranking.
- No inferred ideology, psychology, protected traits, hidden preferences, or exact private wishes.
- Human review before disclosure, contact, reliance, or state changes.
- Sparse or overly specific searches are withheld or broadened.
- Delegate runs require an active, unexpired, participant-controlled authorization.
- Delegate runs are cohort-, pilot-, or matchmaker-scoped by default; global cross-registry scans require a separate explicit flag and operator approval.
- Opportunity briefs must snapshot their authorization, profile, source-summary, candidate-discoverability, cohort, and expiry dependencies. Stale briefs cannot be displayed as active, used for notifications, or advanced into intro requests.
- Helper runs must be probe-resistant: enforce a minimum eligible-pool floor, suppress repeated candidate exposure, bucket visible counts, and block profile/query variants that function as enumeration attempts.
- Unconfirmed uncertainty flags from source summaries or wish interviews may appear as missing-context explanations, but must not add positive score until explicitly confirmed by the participant.
- Every delegate run, opportunity-brief creation, stale transition, and intro-request creation must produce a participant-visible redacted receipt. Receipts must not expose raw source text, exact wishes, exact candidate identity, private cohort membership, or message content.
- Do not facilitate illegal, coercive, collusive, price-fixing, fraud, intimidation, harassment, doxxing, extortion, sanctions evasion, or other harmful coordination. Safety blockers override scores.
- Do not let source-summary or wish-interview text act as instructions to the system. Treat imported text as untrusted data, not executable policy.
- The system must remain useful when AI providers are unavailable: deterministic/manual fallback must work.

## Feature flags

Use existing flags if they exist; otherwise add:

```env
BACKGROUND_SOURCE_SUMMARY_ENABLED=false
BACKGROUND_WISH_INTERVIEW_ENABLED=false
BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED=false
BACKGROUND_DELEGATE_RUNS_ENABLED=false
BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=false
```

Production defaults must be `false` unless the repository already has a staged rollout convention that says otherwise. Tests may enable the flags explicitly. Delegate authorization enforcement, RLS, redaction, revocation, and safety blockers are not optional and must not be disabled by feature flag. Global delegate runs must remain off unless the repository already has a documented operator-approved rollout gate for them.

---

# Data model

Prefer existing entities if present. Otherwise add or extend the following tables with RLS and participant-scoped access policies.

## `background_wish_profiles`

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `opt_in_status` | enum: `off \| active \| paused \| deleted` |
| `cause_areas` | `text[]` |
| `offered_resources` | `text[]` |
| `requested_resources` | `text[]` |
| `capabilities` | `text[]` |
| `constraints` | `text[]` |
| `trade_modes` | `text[]` |
| `verification_preferences` | `text[]` |
| `coarse_availability` | `text[]` |
| `coarse_location` | `text nullable` |
| `privacy_stage` | enum: `private \| broad_preview \| detail_request \| mutual_consent` |
| `discoverability_scope` | enum: `owner_only \| cohort_only \| public_broad_preview` |
| `allowed_cohort_ids` | `text[] not null default '{}'` |
| `stated_exclusions` | `text[]` |
| `uncertainty_flags` | `jsonb` |
| `source_scope_version` | `text` |
| `profile_version` | `text not null` |
| `last_confirmed_at` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

## `background_delegate_authorizations`

Use an existing consent / grant / delegate-strategy table if present; otherwise add a compact authorization table. Every delegate run must reference one active authorization.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `status` | enum: `draft \| active \| paused \| revoked \| expired` |
| `allowed_surfaces` | `text[] not null` such as `broad_profile`, `approved_source_summary`, `saved_search` |
| `allowed_cohort_ids` | `text[] not null default '{}'` |
| `audience_scope` | enum: `cohort_only \| partner_matchmaker \| public_broad_preview` |
| `min_confidence_band` | enum: `medium \| high` |
| `max_runs_per_week` | `integer not null` |
| `max_briefs_per_week` | `integer not null` |
| `max_candidates_per_run` | `integer not null` |
| `expires_at` | `timestamptz not null` |
| `revoked_at` | `timestamptz nullable` |
| `authorization_version` | `text not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

Requirements:

- `audience_scope` defaults to `cohort_only` or the repository’s safest equivalent.
- `public_broad_preview` authorization is allowed only if `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and an operator-approved rollout gate exists.
- Revoked or expired authorizations must cancel pending delegate runs, prevent future opportunity creation, and mark dependent active briefs as `stale`.

## `background_source_summaries`

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `source_kind` | enum: `manual_note \| public_url \| file_export \| chatbot_export \| email_export \| calendar_export \| other` |
| `status` | enum: `draft \| pending_review \| approved \| rejected \| expired \| revoked` |
| `summary_ciphertext` | `bytea not null` |
| `summary_key_version` | `integer not null` |
| `allowed_field_keys` | `text[] not null` |
| `derived_broad_tags` | `text[] not null default '{}'` |
| `confirmed_broad_tags` | `text[] not null default '{}'` |
| `uncertainty_flags` | `jsonb not null default '[]'` |
| `source_summary_version` | `text not null` |
| `provenance_label` | enum: `manual_user_text \| explicit_export \| public_url_summary \| imported_summary` |
| `retention_expires_at` | `timestamptz not null` |
| `raw_ingestion_allowed` | `boolean not null default false` |
| `ai_shadow_allowed` | `boolean not null default false` |
| `created_at` | `timestamptz` |
| `approved_at` | `timestamptz nullable` |
| `revoked_at` | `timestamptz nullable` |

Constraint:

- `raw_ingestion_allowed` must default to `false`.
- `raw_ingestion_allowed` must not be user-flippable from ordinary UI.

## `background_delegate_runs`

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `delegate_authorization_id` | `uuid not null` referencing the active authorization or existing grant equivalent |
| `trigger_kind` | enum: `saved_search \| profile_update \| approved_source_summary \| scheduled_digest \| manual_scan` |
| `state` | enum: `queued \| running \| retry \| done \| failed \| cancelled` |
| `query_fingerprint` | `text not null` |
| `cohort_scope_id` | `text nullable` |
| `allowed_surfaces_snapshot` | `text[] not null` |
| `max_candidates` | `integer not null` |
| `eligible_pool_size_bucket` | enum: `withheld \| 5_to_9 \| 10_to_24 \| 25_plus` |
| `anti_probe_state` | enum: `clear \| broadened \| withheld \| blocked` |
| `receipt_id` | `uuid nullable` |
| `attempts` | `integer not null default 0` |
| `next_run_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

## `background_opportunity_briefs`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `candidate_profile_id` | `uuid not null` |
| `delegate_run_id` | `uuid nullable` |
| `delegate_authorization_id` | `uuid not null` |
| `cohort_scope_id` | `text nullable` |
| `status` | enum: `new \| viewed \| dismissed \| deferred \| reported \| intro_requested \| closed` |
| `confidence_band` | enum: `low \| medium \| high` |
| `visible_headline` | `text not null` |
| `factor_codes` | `text[] not null` |
| `blocker_codes` | `text[] not null default '{}'` |
| `safety_blocker_codes` | `text[] not null default '{}'` |
| `redacted_fields` | `text[] not null` |
| `visible_counts` | `jsonb not null` with bucketed values only |
| `explanation_version` | `text not null` |
| `source_scope_version` | `text not null` |
| `profile_version_snapshot` | `text not null` |
| `authorization_version_snapshot` | `text not null` |
| `source_summary_ids_snapshot` | `uuid[] not null default '{}'` |
| `source_summary_versions_snapshot` | `jsonb not null default '{}'` |
| `candidate_discoverability_snapshot` | `text not null` |
| `dependency_state` | enum: `valid \| stale \| closed` |
| `brief_expires_at` | `timestamptz not null` |
| `eligible_pool_size_bucket` | enum: `withheld \| 5_to_9 \| 10_to_24 \| 25_plus` |
| `candidate_key_hash` | `text not null` |
| `receipt_id` | `uuid nullable` |
| `cooloff_until` | `timestamptz nullable` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

## `background_opportunity_feedback`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `opportunity_brief_id` | `uuid not null` |
| `decision` | enum: `interested \| dismissed \| maybe_later \| report` |
| `reason_code` | `text nullable` |
| `free_text_ciphertext` | `bytea nullable` |
| `free_text_key_version` | `integer nullable` |
| `created_at` | `timestamptz` |

## `background_intro_requests`

Use an existing table if present; otherwise add:

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `requester_id` | `uuid not null` |
| `counterparty_profile_id` | `uuid not null` |
| `opportunity_brief_id` | `uuid nullable` |
| `state` | enum: `requested \| operator_review \| counterparty_pending \| mutual_consent \| approved_contact \| declined \| appealed \| closed` |
| `requested_disclosure_fields` | `text[] not null` |
| `purpose` | `text not null` |
| `source_brief_dependency_state` | enum: `valid \| stale_blocked` |
| `receipt_id` | `uuid nullable` |
| `expires_at` | `timestamptz not null` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |

## `background_delegate_receipts`

Use an existing transparency-receipt or audit-event table if present; otherwise add a compact participant-visible receipt table. This table is for redacted accountability, not analytics export.

| Field | Type / constraint |
|---|---|
| `id` | `uuid primary key` |
| `participant_id` | `uuid not null` |
| `event_kind` | enum: `delegate_run_created \| opportunity_brief_created \| opportunity_brief_marked_stale \| intro_request_created` |
| `delegate_authorization_id` | `uuid nullable` |
| `delegate_run_id` | `uuid nullable` |
| `opportunity_brief_id` | `uuid nullable` |
| `redacted_payload` | `jsonb not null` |
| `prev_hash` | `text nullable` |
| `entry_hash` | `text not null` |
| `created_at` | `timestamptz` |

Receipt payload requirements:

- Include broad surfaces used, authorization scope type, confidence band, factor-code counts, blocker-code counts, dependency-state label, and visible count buckets.
- Exclude raw source text, exact wishes, contact details, exact candidate identity, exact private cohort membership, prompts, message text, free-text reports, and private notes.
- If the repository already has local transparency receipts, extend that mechanism rather than creating a parallel ledger.


---

# APIs

Prefer existing paths if already implemented. Otherwise implement the following.

## `POST /api/background/delegate-authorizations`

Auth required.

Creates or updates the participant’s standing authorization for a background delegate.

Requirements:

- Validate allowed surfaces against an allowlist.
- Require an expiry date, maximum runs per week, maximum briefs per week, maximum candidates per run, and minimum confidence band.
- Default audience scope to `cohort_only` or `partner_matchmaker`; do not allow global scope unless `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and operator rollout approval exists.
- Return the authorization id and a plain-language summary of what the delegate is and is not allowed to do.
- Do not enqueue a helper run from this route unless the user explicitly chooses “run now.”

## `POST /api/background/delegate-authorizations/:id/revoke`

Auth required.

Revokes a delegate authorization. Pending runs under that authorization must be cancelled, dependent active briefs must be marked `stale`, and no new opportunity briefs may be created from it.

## `POST /api/background/wish-profile`

Auth required.

Creates or updates a structured wish profile.

Requirements:

- Validate against an allowlist schema.
- Reject exact contact details.
- Reject protected-trait inference.
- Reject ideology/psychology inference.
- Reject hidden preference fields.
- Do not trigger live matching unless `BACKGROUND_DELEGATE_RUNS_ENABLED` is true, the user explicitly opted in, and an active delegate authorization exists.
- Validate `discoverability_scope` and `allowed_cohort_ids`; global broad-preview discovery must not be silently enabled.
- Update `profile_version` and `last_confirmed_at` only when the participant explicitly applies or confirms the fields that may influence matching.

## `POST /api/background/wish-interview`

Auth required.

Feature flag: `BACKGROUND_WISH_INTERVIEW_ENABLED`.

Accepts a user message.

Returns schema-bound field proposals and uncertainty flags.

Requirements:

- Must not mutate live profile fields until the user explicitly applies the proposal.
- Invalid model output must result in no state change.

## `POST /api/background/source-summaries`

Auth required.

Feature flag: `BACKGROUND_SOURCE_SUMMARY_ENABLED`.

Creates a draft source summary.

Requirements:

- Accept only user-provided manual text, public URL summary text, or explicit export text if the repository already supports upload parsing.
- Do not implement continuous OAuth/private-feed scraping in this task.
- Encrypt private summary text.
- Store `allowed_field_keys`.
- Store `retention_expires_at`.
- Store provenance metadata sufficient to explain that the summary came from user-provided text or an explicit export, without storing raw private payloads in analytics or logs.
- Treat imported text as untrusted data: ignore embedded instructions, prompt-injection attempts, or requests to change matching behavior.
- Never store raw source payloads in analytics or logs.

## `POST /api/background/source-summaries/:id/approve`

Auth required.

Marks a source summary as approved.

Requirements:

- Only approved summaries can contribute broad tags to matching.
- Expired, rejected, or revoked summaries must not influence matching.
- Expiration, rejection, or revocation must mark dependent active briefs as `stale` and block intro creation from those briefs until recomputed from valid inputs.

## `POST /api/background/delegate-runs`

Auth required.

Feature flag: `BACKGROUND_DELEGATE_RUNS_ENABLED`.

Enqueues a helper run for one of:

- saved search
- profile update
- approved summary
- scheduled digest
- manual scan

Requirements:

- Require an active, unexpired delegate authorization.
- Enforce allowed surfaces, audience/cohort scope, maximum candidates, and maximum briefs from the authorization.
- Apply rate limits.
- Enforce the minimum eligible-pool floor and anti-probing checks before scoring.
- Create a redacted delegate-run receipt.
- Return `429 Too Many Requests` with `Retry-After` when throttled.

## `GET /api/background/opportunity-briefs`

Auth required.

Feature flag: `BACKGROUND_OPPORTUNITY_BRIEFS_ENABLED`.

Returns only briefs belonging to the authenticated participant.

Response must include:

- `visible_headline`
- `confidence_band`
- `factor_codes`
- `blocker_codes`
- `safety_blocker_codes` when nonempty
- `redacted_fields`
- `visible_counts`
- scanned surfaces/provenance labels such as `broad_profile`, `approved_source_summary`, or `saved_search`
- authorization scope summary
- dependency-state label
- receipt id for the redacted delegate receipt
- allowed actions

Response must not include:

- exact wishes
- source notes
- contact details
- sensitive constraints
- raw profile notes
- protected traits
- ideology/psychology inferences
- private messages
- hidden preferences
- exact candidate identity before the relevant disclosure stage

## `POST /api/background/opportunity-briefs/:id/feedback`

Auth required.

Accepts:

- `interested`
- `dismissed`
- `maybe_later`
- `report`

Requirements:

- Revalidate the opportunity brief’s authorization, profile-version, source-summary, candidate-discoverability, cohort-scope, and expiry dependencies before accepting feedback.
- If the brief is stale, return a non-destructive `409` or equivalent stale-state response with no disclosure and no intro request.
- If `interested` and the brief remains valid, create or advance an intro request, but do not disclose counterparty details.
- Create a redacted receipt for `intro_request_created`.

## `POST /api/background/intro-requests`

Auth required.

Creates a reviewed introduction request.

Requirements:

- Operator queue remains required.
- Contact disclosure requires mutual consent.
- Contact disclosure requires step-up auth if the existing system has step-up auth.
- Intro requests from stale opportunity briefs must be rejected without disclosure.
- Counterparty-facing notification or contact may occur only after operator review determines the request is eligible for the relevant consent step.

## `GET /api/background/delegate-receipts`

Auth required.

Returns participant-visible, redacted receipts for delegate runs, opportunity-brief creation, stale transitions, and intro-request creation.

Requirements:

- Return only receipts owned by the authenticated participant.
- Do not expose raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, or private notes.
- Provide enough redacted information for the user to understand why a delegate run or opportunity brief exists and which authorization scope it used.

---

# Matching algorithm

Implement deterministic matching only. The delegate may create an opportunity brief but must not rank people globally or mutate disclosure state.

## Eligibility preconditions

All of the following must hold:

- `participant.opt_in_status == active`.
- A referenced delegate authorization is active, unexpired, unrevoked, and owned by the participant.
- The run stays inside the authorization’s allowed surfaces, audience/cohort scope, maximum candidates, maximum briefs, and minimum confidence band.
- The participant's profile version is current and `last_confirmed_at` is inside the repository-defined freshness window, unless the participant has explicitly marked the relevant fields current for this run.
- The authorized search pool passes the repository-defined minimum eligible-pool floor before candidate scoring. Use a default floor of at least 5 eligible broad-preview candidates unless the repository already has a stricter anti-enumeration constant.
- Candidate profile is currently discoverable at `broad_preview` or compatible privacy stage.
- Candidate is inside the authorized cohort, partner-matchmaker scope, or public-broad-preview scope explicitly allowed for this run.
- Candidate is not the same participant.
- No stated exclusion conflict.
- No safety/prohibited-pattern blocker.
- No prohibited-coordination blocker, including collusion, price-fixing, fraud, harassment, intimidation, doxxing, extortion, sanctions evasion, or coercion.
- No sparse-search or anti-enumeration blocker.
- Privacy stages are compatible.
- Both sides’ broad signals are within retention and revocation constraints.
- Any source-summary or interview-derived field used for positive scoring is explicitly confirmed, not merely uncertain or machine-proposed.
- The candidate has not been repeatedly surfaced to this participant through materially equivalent query/profile variants beyond the repository’s dedupe window.
- Candidate is not within a cool-off window from prior dismissal, report, or operator block.

## Factor codes

Use only approved public factor-code strings from the repository’s match-signal contract unless this task also updates that contract and all validator tests. The current public-compatible baseline is:

- `cause_area_overlap`
- `cause_area_complementarity`
- `trade_mode_compatible`
- `verification_preference_compatible`
- `location_constraint_satisfied`
- `privacy_safe_preview`
- `privacy_stage_compatible`
- `stated_exclusions_clear`
- `human_review_required`

Internal scoring may use additional local components such as offer/ask complementarity, availability compatibility, profile completeness, or source-summary provenance, but do not emit new public factor-code strings such as `offer_ask_complementarity`, `availability_compatible`, or `coarse_location_compatible` unless the contract allowlist and tests are updated in the same change.

## Score function

Use this only to create local opportunity briefs. Never expose this as a public person ranking.

```text
score =
  25 * causeAreaOverlap01
+ 25 * offerAskComplementarity01
+ 15 * tradeModeCompatible01
+ 10 * verificationCompatible01
+ 10 * availabilityCompatible01
+  5 * coarseLocationCompatible01
+ 10 * profileCompleteness01
- 40 * anySoftSafetyConcern01
-100 * anyHardBlocker01
```

Where `anyHardBlocker01` must include prohibited-coordination blockers, authorization-scope violations, privacy-stage violations, sparse-search or minimum-pool blockers, repeated-probe blockers, stale dependency snapshots, revoked-source influence, unconfirmed uncertainty driving positive score, and safety/operator blocks. A hard blocker must suppress opportunity creation regardless of score.

## Bands

| Band | Rule |
|---|---|
| `high` | `score >= 70` and no blocker |
| `medium` | `score >= 50` and no blocker |
| `low` | `score >= 35` and no blocker |
| `blocked` | any hard blocker |

Create opportunity briefs only for `medium` or `high` matches unless the user explicitly requests manual scan diagnostics. Do not notify for `low` matches by default.

---

# Opportunity brief content

Each brief must show:

- generic headline
- confidence band
- reason/factor codes
- visible counts bucketed by policy, not exact values where sensitive or sparse
- redacted fields list
- scanned surfaces, such as:
  - `broad_profile`
  - `approved_source_summary`
  - `saved_search`
- blockers or review gates
- authorization scope summary, such as cohort or partner-matchmaker scope
- dependency-state summary, such as `valid`, `stale`, or `recompute_required`
- redacted receipt id
- safety status, limited to coarse safe/blocked/review-required labels
- available actions:
  - dismiss
  - maybe later
  - report
  - request intro

Each brief must never show:

- exact private wishes
- contact details
- sensitive constraints
- raw profile notes
- raw source notes
- protected traits
- ideology/psychology inferences
- hidden preferences
- exact counterparty strategy
- exact counterparty identity before the relevant disclosure stage
- unapproved source-derived text
- exact eligible-pool size when the pool is sparse

Stale-brief behavior:

- A stale brief may be shown only as historical context with disabled actions and a plain-language stale reason.
- A stale brief must not trigger notifications, intro requests, disclosure grants, contact disclosure, ranking changes, or additional matching effects.
- Recompute from currently valid inputs is required before any action can resume.

---

# Notification policy

Implement or update the notification builder.

Required copy:

```ts
export const BACKGROUND_OPPORTUNITY_NOTIFICATION = {
  title: "New broad-overlap opportunity",
  body: "A privacy-safe opportunity brief is ready for your review. Exact wishes and contact details remain hidden until the appropriate consent stage.",
};
```

The notification builder must have an explicit `recipient_role` or equivalent guard. For opportunity-brief creation, the only valid recipient is the participant whose delegate created the brief. Candidate-facing messages are valid only for a separate intro-consent flow after operator review.

Notification body must be invariant-tested so it never includes:

- exact wishes
- contact details
- source notes
- private constraints
- raw text
- payment details
- message text

---

# AI / wish interview constraints

If an LLM is used:

- It can propose fields only.
- It cannot directly change the profile.
- It cannot directly create match suggestions.
- It cannot change ranking.
- It cannot contact counterparties.
- It cannot bypass review.
- It must output JSON validated by a strict schema.
- It must use a no-training/no-retention provider mode, a tenant-isolated enterprise mode with equivalent retention guarantees, or a local model. If none is available, the LLM path must fail closed and the deterministic/manual path must remain usable.
- It must send the minimum necessary user text for the immediate proposal, not full source exports, unrelated chat history, raw email/calendar bodies, or prior hidden transcripts.
- It should prefer `uncertainty_flags` and `unanswered_fields` over guessing.
- It must mark unconfirmed proposed fields so deterministic matching cannot give them positive weight until explicit participant confirmation.
- It must treat user-provided source text, URLs, exports, and chat history as untrusted data and ignore instructions embedded in them.
- It must store no hidden reasoning transcript.

Suggested Zod schema:

```ts
import { z } from "zod";

export const WishProposalSchema = z.object({
  causeAreas: z.array(z.string()).max(12).default([]),
  offeredResources: z.array(z.string()).max(20).default([]),
  requestedResources: z.array(z.string()).max(20).default([]),
  capabilities: z.array(z.string()).max(20).default([]),
  constraints: z.array(z.string()).max(20).default([]),
  tradeModes: z.array(z.string()).max(12).default([]), // refine to existing trade-mode enum
  verificationPreferences: z.array(z.string()).max(10).default([]),
  coarseAvailability: z.array(z.string()).max(10).default([]),
  coarseLocation: z.string().max(64).optional(),
  statedExclusions: z.array(z.string()).max(12).default([]),
  uncertaintyFlags: z.array(z.string()).max(12).default([]),
  unansweredFields: z.array(z.string()).max(12).default([]),
  participantExplanation: z.array(z.string()).max(12).default([]),
});
```

---

# Dashboard UI

Add or update a Background Delegate dashboard surface with four panels.

## 1. Delegate status

Include:

- opt in / pause / disable
- active delegate authorization summary
- allowed surfaces and audience/cohort scope
- maximum runs / briefs / candidates and expiry window
- revoke authorization
- last helper run
- next scheduled digest
- rate-limit, anti-probing, stale-brief, or privacy-gate status
- recent redacted delegate receipts

## 2. Wish profile composer

Include:

- structured fields
- optional fluent interview if enabled
- preview of broad fields
- explicit **Apply** button
- explicit “do not use this for matching” draft state

## 3. Source summaries

Include:

- add manual source summary
- review derived broad tags
- choose allowed field keys
- choose retention window:
  - 30 days
  - 90 days
  - 180 days
  - 365 days
- approve
- reject
- revoke
- visible no-raw-feed-mining notice

## 4. Opportunity inbox

Include:

- list opportunity briefs
- confidence band and factor codes
- redacted fields
- dependency-state label and stale-recompute notice when relevant
- receipt id / receipt detail link
- dismiss
- maybe later
- report
- request intro
- explanation that a suggestion is not an introduction

---

# Accessibility

All dashboard flows must be keyboard navigable and screen-reader labelled:

- opt-in toggle
- delegate authorization controls
- cohort/audience-scope controls
- source-retention controls
- approve/reject buttons
- opportunity actions
- redaction notices
- consent dialogs
- deletion/revocation controls
- stale-brief notices and recompute controls
- delegate receipt history

---

# Telemetry

Only record aggregate, privacy-safe event metadata.

## Allowed event names

- `background_delegate_authorization_created`
- `background_delegate_authorization_revoked`
- `background_delegate_run_created`
- `background_delegate_run_withheld_for_minimum_pool`
- `background_opportunity_brief_created`
- `background_opportunity_brief_marked_stale`
- `background_opportunity_brief_viewed`
- `background_opportunity_feedback_submitted`
- `background_intro_request_created`
- `background_source_summary_approved`
- `background_source_summary_revoked`
- `background_safety_blocker_triggered`

## Allowed metadata

- coarse route family
- stage
- confidence band
- factor-code counts
- blocker-code counts
- feature flag state
- authorization state
- broad audience-scope type, not exact private cohort membership if sensitive
- latency bucket
- outcome state
- dependency-state label
- eligible-pool-size bucket, never exact sparse pool size

## Forbidden telemetry

- exact wishes
- raw search text
- source notes
- private constraints
- contact details
- emails
- prompts
- message text
- raw receipt payloads
- receipt hashes when linkable to private events outside participant-facing receipt UI
- exact private cohort membership when sensitive
- counterparty-specific sensitive details

---

# Testing requirements

Add or update tests. At minimum:

## `background-delegate-authorizations.test.ts`

Verify:

- delegate runs require an active, unexpired authorization
- revoked or expired authorizations cancel pending runs and prevent new briefs
- global cross-registry scope is rejected unless `BACKGROUND_GLOBAL_DELEGATE_RUNS_ENABLED=true` and operator rollout approval exists
- run budgets, brief budgets, candidate limits, and minimum confidence bands are enforced
- authorization summaries are understandable and do not expose private source text
- revocation marks dependent active briefs stale and disables actions

## `background-delegate-matching.test.ts`

Verify:

- creates opportunity only when eligibility passes
- high/medium/low/blocked bands are deterministic
- no profile with privacy conflict is matched
- stated exclusions block suggestions
- exact wish fields are not returned
- public factor codes match the repository’s match-signal contract allowlist
- authorization-scope violations and prohibited-coordination blockers suppress brief creation
- minimum eligible-pool failure and repeated-probe detection suppress brief creation
- unconfirmed uncertainty flags cannot add positive score

## `background-source-summaries.test.ts`

Verify:

- `raw_ingestion_allowed` defaults false
- approved summary can influence only allowed broad fields
- rejected, expired, or revoked summary cannot influence matching
- source summary ciphertext/version fields are required
- analytics receives no raw source text
- prompt-injection text inside a source summary cannot alter matching policy, feature flags, or disclosure behavior
- source summary revocation or expiry marks dependent active briefs stale and blocks intro creation until recompute

## `background-wish-interview.test.ts`

Verify:

- model proposal cannot mutate live profile before explicit apply
- invalid output causes no state change
- protected-trait, ideology, psychology, and hidden-preference fields are rejected
- uncertainty flags are preserved
- unconfirmed proposed fields are stored as draft/uncertain and cannot add positive matching weight
- prompt-injection attempts in user messages or imported context cannot bypass schemas, mutate live state, or alter ranking
- LLM calls use no-training/no-retention, tenant-isolated equivalent, or local-model mode; otherwise the LLM path fails closed
- LLM calls send only the minimum necessary text and never full raw source exports or unrelated chat history

## `background-opportunity-briefs.test.ts`

Verify:

- response excludes exact wishes, contact details, source notes, sensitive constraints, raw notes, protected traits, and ideology/psychology inferences
- brief contains factor codes, redacted fields, confidence band, and allowed actions
- feedback `interested` creates intro request without contact disclosure
- candidate exact identity and exact private wishes remain hidden until the relevant consent stage
- stale briefs are returned only with disabled actions or are withheld; feedback on stale briefs cannot create intro requests
- visible counts are bucketed and sparse exact pool sizes are never returned

## `background-brief-staleness.test.ts`

Verify:

- changing authorization status, profile version, source-summary status, candidate discoverability, cohort scope, or brief expiry marks dependent active briefs stale
- stale briefs do not trigger notifications, intro requests, disclosure grants, contact disclosure, or ranking changes
- stale-state responses are non-destructive and reveal no new counterparty details
- recompute creates a new brief only from currently valid dependencies and emits a new receipt

## `background-notification-policy.test.ts`

Verify:

- notification copy is generic
- notification suppresses exact wishes, contact details, source notes, private constraints, and message text
- unsafe email outbox rows cannot be sent
- opportunity-brief creation cannot enqueue candidate-facing notifications
- candidate-facing notification is possible only through an intro-consent flow after operator review

## `background-rate-limit.test.ts`

Verify:

- helper-run creation is rate limited
- `429` includes `Retry-After`
- retries use capped exponential backoff with jitter if there are workers

## `background-anti-probing.test.ts`

Verify:

- delegate runs below the minimum eligible-pool floor are withheld or broadened
- materially equivalent query/profile variants cannot repeatedly test for the same candidate
- visible count outputs are bucketed and never expose sparse exact counts
- anti-probing blockers override otherwise high scores

## `background-privacy-controls.test.ts`

Verify:

- RLS prevents cross-participant reads
- deletion removes background-layer records except redacted/anonymized audit records where policy permits
- revocation stops future source influence and future helper runs
- delegate authorization revocation stops pending and future runs under that authorization
- stale dependency snapshots suppress active brief display, notifications, feedback advancement, and intro creation

## `background-delegate-receipts.test.ts`

Verify:

- delegate runs, opportunity-brief creation, stale transitions, and intro-request creation create redacted receipts
- receipts are participant-scoped under RLS
- receipt payloads exclude raw source text, exact wishes, exact candidate identity, private cohort membership, prompts, message text, and private notes
- receipt hashes or sequence values cannot be used through telemetry to infer private events outside the participant-facing receipt UI

## `background-cohort-scoping.test.ts`

Verify:

- cohort-only authorizations search only profiles in the allowed cohort or pilot scope
- partner-matchmaker authorizations respect the partner-approved audience boundary
- public-broad-preview runs require the global delegate flag and operator rollout approval
- opportunity briefs include only broad scope labels, not sensitive cohort membership details

## `background-rollout-gates.test.ts`

Verify:

- production defaults keep higher-power lanes off
- promotion is blocked when privacy incidents, prompt-injection bypasses, unsafe notifications, accessibility failures, queue-health failures, or rollback-test failures are present
- candidate-facing notification from mere scan or brief creation blocks promotion
- global cross-registry delegate runs remain blocked unless the explicit global flag and operator approval gate are both present

## `background-accessibility.test.ts` or existing route smoke

Verify:

- opportunity inbox, source review, wish profile apply, and consent controls have accessible names
- keyboard path can complete dismiss, report, and request-intro actions

---

# Commands

Run the repository’s canonical checks. Include at least:

```bash
npm run lint
npm run build
node --import tsx --test \
  src/lib/background-networking.test.ts \
  src/lib/background-delegate-authorizations.test.ts \
  src/lib/background-anti-probing.test.ts \
  src/lib/background-brief-staleness.test.ts \
  src/lib/background-delegate-receipts.test.ts \
  src/lib/background-rollout-gates.test.ts \
  src/lib/background-cohort-scoping.test.ts \
  src/lib/background-notification-policy.test.ts \
  src/lib/background-notifications.test.ts \
  src/lib/background-privacy-controls.test.ts \
  src/lib/background-explanations.test.ts \
  src/lib/background-opportunity-briefs.test.ts \
  src/lib/wish-registry.test.ts \
  src/lib/public-route-smoke.test.ts
```

Also run any newly added tests.

---

# Rollout and promotion gates

Keep all higher-power paths behind staged rollout gates.

Default sequence:

1. Internal/staff profiles only.
2. Tiny consenting cohort.
3. One partner-reviewed pilot pack or existing matchmaker workflow.
4. Broader cohort rollout only after documented promotion-gate review.

Promotion from one stage to the next requires:

- zero known privacy leakage incidents
- zero prompt-injection bypasses that mutate state, disclosure, ranking, feature flags, or authorization scope
- zero unsafe notification sends, including candidate-facing notification from mere scan/brief creation
- no material increase in false-match, report, or operator-overrule rates compared with the pilot baseline
- successful keyboard and screen-reader pass for delegate authorization, source-summary review, opportunity inbox, receipt log, and intro-request flows
- healthy queue latency and no retry-storm behavior
- documented rollback plan and tested revocation/deletion path

If any gate fails, pause promotion, preserve participant revocation paths, and keep existing opportunity briefs available only as redacted, participant-owned records.

---

# Documentation updates

Update:

- `/background-networking`
- `/wish-registry` if broad-preview behavior changes
- `/moral-trade/technical-spec`
- `/measurement` if events are added
- any public contract JSON or validator-backed route that describes background networking

Documentation must state:

- Background Delegate creates opportunity briefs, not introductions.
- Delegate runs require participant-controlled authorization, budget, expiry, and revocation.
- Opportunity briefs snapshot dependencies and become non-actionable when the authorization, source summary, profile version, candidate discoverability, cohort scope, or expiry state becomes stale.
- Candidates are not notified or exposed to requester interest by mere scan, shortlist, or brief creation.
- Default rollout is cohort-, pilot-, or matchmaker-scoped; global cross-registry delegate runs are disabled unless separately reviewed.
- Promotion beyond staff/internal scope requires documented promotion-gate checks and rollback paths.
- There is no autonomous outreach.
- There is no raw private-feed mining.
- Exact details require consent grants.
- AI proposals are schema-bound and review-only before apply.
- LLM-assisted paths use no-training/no-retention or local/tenant-isolated equivalent modes and fail closed when those guarantees are unavailable.
- Source summaries are approved, revocable, and retention-bound.
- Helper runs are probe-resistant: minimum eligible-pool floors, dedupe windows, and count bucketing prevent enumeration.
- Redacted delegate receipts explain participant-visible run/brief/intro events without exposing private data.
- Private-overlap computation remains design-only unless a separate crypto/privacy review has already been completed in the repository.

---

# Definition of done

The build is complete only when:

- Users can opt into a Background Delegate.
- Users can create, inspect, limit, and revoke a delegate authorization with surfaces, scope, budgets, confidence threshold, and expiry.
- Users can create/apply a structured wish profile.
- Users can approve/revoke source summaries with retention and allowed-field controls.
- Delegate runs generate deterministic privacy-safe opportunity briefs only within active authorization and cohort/matchmaker scope.
- Opportunity briefs snapshot authorization, profile, source-summary, candidate-discoverability, cohort, and expiry dependencies.
- Stale briefs cannot notify, advance to intro requests, create disclosure grants, or otherwise remain actionable.
- Prohibited-coordination, anti-enumeration, anti-probing, uncertainty-gating, privacy-stage, revocation, and safety blockers suppress opportunity creation regardless of score.
- Opportunity notifications are generic and go only to the participant whose delegate created the brief.
- Candidate-facing notification or requester-interest exposure cannot occur before intro-request, operator-review, and mutual-consent gates.
- Every delegate run, brief creation, stale transition, and intro-request creation has a participant-visible redacted receipt.
- Interested feedback creates an intro request without disclosure.
- Operator review and mutual consent remain required before contact or exact-wish disclosure.
- All private tables are RLS-protected.
- All sensitive text is encrypted or stored using the repository’s existing sensitive-field convention.
- LLM-assisted paths meet the no-training/no-retention or local/tenant-isolated-equivalent constraint, minimize input text, and fail closed when unavailable.
- Rollout gates block promotion when privacy, prompt-injection, unsafe-notification, accessibility, queue-health, or rollback tests fail.
- All tests pass.
- Public docs and contract routes accurately reflect the behavior.

---

# Explicit non-goal: production private-overlap crypto

Build the delegate/opportunity-brief loop now. Do **not** build production private-overlap crypto in this task.

Moral Trade’s public private-overlap gate says private overlap is design-only, live endpoints are blocked pending cryptographic review, and future storage should be blinded-token-only with raw/canonical tags forbidden.

Forethought itself treats the privacy/surveillance/collusion tradeoff as unresolved and important. The safer concrete mechanism is therefore to generate reviewable opportunity briefs from approved broad signals, within explicit delegate authorizations and scoped pilot communities, rather than expose richer hidden matching infrastructure immediately.
