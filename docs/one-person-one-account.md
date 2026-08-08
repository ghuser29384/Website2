# One natural person, one canonical Moral Trade account

Status: implemented behind disabled release gates. This document is an operational specification, not a statement that identity verification is live in production.

Policy version: `one-natural-person-one-canonical-account-v1-2026-07-31`

## Product contract

Moral Trade permits one canonical person account for each natural person. A person may attach multiple authentication credentials to that account. Public identity may remain pseudonymous.

A visitor may browse and keep local/private guest drafts before verification. A persistent person account may be created only after a third-party document and liveness result, or a materially equivalent authorized manual review, establishes:

- a current identity-verification result;
- an eligible age band;
- a high-confidence human deduplication result;
- one or more stable opaque provider references;
- a provider raw-data deletion deadline; and
- no existing canonical or tombstoned identity subject requiring recovery.

The protected identity layer is not a public legal-name directory. It exists to enforce human uniqueness, recovery, age capabilities, guardian consent, cooldowns, and account consolidation.

## Privacy boundary

Moral Trade must never receive or persist:

- raw identity documents;
- selfies or liveness videos;
- full document numbers;
- reusable biometric templates;
- provider face images;
- public legal names for ordinary account creation; or
- provider payloads containing those materials.

The application stores only normalized results, timestamps, assurance metadata, event fingerprints, and versioned HMAC tokens derived from opaque provider references. A plain hash of a document number is not sufficient because the source space is enumerable.

Provider webhook bodies are accepted only through the signed adapter, bounded to 64 KiB, verified against an exact timestamp/body HMAC, normalized, and discarded. The body is not logged. The database stores an event payload hash, not the payload.

Provider-controlled raw data should be deleted within 30 days of a final decision. A contractual hard maximum of 90 days applies. The admin queue exposes overdue deletion confirmations without exposing the underlying raw data.

## Database model

The migration creates a non-exposed `moral_trade_private` schema. Browser roles receive no schema usage and no direct table privileges.

Key records:

- `identity_subjects`: one protected human identity subject, optionally bound to one canonical profile;
- `identity_dedupe_keys`: globally unique, versioned HMAC tokens retained after closure;
- `preaccount_verification_sessions`: opaque, expiring registration, existing-account verification, or recovery sessions;
- `person_registration_grants`: short-lived, one-use grants that authorize exactly one new auth user;
- `person_accounts`: capability state for each Supabase auth user;
- `preaccount_guardian_consents` and `guardian_relationships`: separately verified, scoped guardian authority;
- `identity_verification_events`: append-only normalized provider events and deletion deadlines;
- `identity_duplicate_cases`, `account_recovery_cases`, and `account_merge_cases`: private review records;
- `person_account_aliases`: immutable historical profile-to-canonical-profile resolution;
- `identity_tombstones`: anti-recreation records retained after closure;
- `account_security_events` and `account_cooldowns`: append-only security history and recovery cooldowns.

The existing `profiles.id` remains the canonical person identifier. The implementation does not introduce another universal person ID across the application’s existing foreign-key graph.

## Registration sequence

1. The visitor starts a pre-account verification session.
2. The server writes only an opaque session ID, retrieval-token hash, and optional pending registration-token hash.
3. The provider receives opaque references and a return URL.
4. A signed provider result is normalized by the application.
5. PostgreSQL serializes deduplication-key claims with advisory locks.
6. A new adult identity subject receives one short-lived registration grant.
7. A new minor identity subject enters `guardian_required`; no grant exists until approved guardian consent is recorded.
8. Any existing, closed, concurrent, or disputed match enters recovery/duplicate review; no second grant is issued.
9. The user enters an email and password only after the grant is ready.
10. The grant is bound to a normalized email HMAC.
11. The Supabase Before User Created hook validates and reserves the grant.
12. An `AFTER INSERT` trigger consumes the grant, binds the subject to the new auth user, creates the authoritative person-account row, and imports the approved guardian relationship where applicable.
13. Guest drafts may then be imported to the canonical profile by the existing onboarding flow.

The same grant cannot authorize two users. Database constraints and row locks protect against concurrent sign-up attempts.

## Supabase Auth configuration

The SQL migration creates the hook functions but does not change hosted Supabase Auth configuration. Configure these only after isolated QA passes.

### Before User Created hook

Set the Before User Created hook to:

```text
pg-functions://postgres/public/one_person_before_user_created_hook
```

The hook reads only the registration-grant ID and token supplied through `user_metadata`. It rejects creation when registration enforcement is enabled and the grant is missing, expired, already reserved, bound to another email, or tied to a subject that already has a canonical account.

### Custom Access Token hook

Optionally set the Custom Access Token hook to:

```text
pg-functions://postgres/public/one_person_custom_access_token_hook
```

The hook adds non-sensitive capability claims such as account kind, verification state, age class, guardian-consent state, and canonical profile ID. Database authorization must still query the authoritative tables; JWT claims are an optimization and presentation aid, not the sole authorization boundary.

### Manual OAuth identity linking

Enable Supabase manual identity linking only after the account-security page passes authenticated testing. Linking must be initiated while signed in to the canonical account. Unlinking requires at least two identities and a session authenticated within the previous ten minutes.

OAuth sign-up remains blocked when registration enforcement is active. Additional OAuth credentials are linked after the canonical account exists.

## Provider adapter contract

Production provider mode is `signed_webhook`. The provider URL template must contain `{session_id}` and may contain `{provider_session_ref}` and `{return_url}`.

The webhook endpoint is:

```text
POST /api/identity/provider
```

Required headers:

```text
x-moraltrade-timestamp: <unix seconds>
x-moraltrade-signature: sha256=<hex HMAC-SHA256(timestamp + "." + exact body)>
```

Normalized JSON fields:

```json
{
  "eventId": "provider event identifier",
  "sessionId": "Moral Trade verification session UUID",
  "providerSessionReference": "opaque provider session reference",
  "result": "verified | rejected | needs_review",
  "assuranceTier": "document_liveness | manual_equivalent",
  "ageClass": "adult | minor_13_17 | under_13 | unknown",
  "dedupeReferences": [
    {
      "namespace": "provider_subject | government_document | biometric_duplicate_cluster | manual_equivalent",
      "reference": "opaque stable reference"
    }
  ],
  "duplicateCheckResult": "clear | potential_duplicate | confirmed_duplicate",
  "verifiedAt": "ISO-8601 timestamp",
  "expiresAt": "optional ISO-8601 timestamp",
  "rawDataDeletionDueAt": "ISO-8601 timestamp"
}
```

A verified result must contain at least one stable deduplication reference. A provider may not downgrade a confirmed duplicate to a new person through retry order. Provider event IDs are HMACed and unique, so replay is idempotent.

## Existing accounts

Migration-time backfill creates `person_accounts` rows for existing auth users with:

```text
verification_status = legacy_unverified
```

While participation enforcement is disabled, behavior remains unchanged. After controlled enablement, legacy accounts retain:

- sign-in;
- browsing;
- their private drafts;
- profile editing;
- private record access; and
- export and recovery.

They must verify before publishing, matching, messaging, voting, making or accepting agreements, contributing, using payment or payout paths, controlling organizations, independently verifying evidence, or signing high-risk collective commitments.

## Capabilities

All consequential application actions must call the central capability decision before any service-role write. Direct authenticated writes receive restrictive RLS policies that call the same decision.

Low-risk capabilities:

```text
browse
private_draft
profile_edit
data_export
identity_recovery
```

High-risk capabilities receive the seven-day recovery cooldown:

```text
agreement
contribute
financial
payout
receive_funds
organization_control
independent_verification
collective_high_risk
```

Other consequential capabilities receive the ordinary 72-hour recovery cooldown.

## Minors and guardians

A person aged 13–17 must complete their own identity and liveness check. A separately verified adult guardian must have:

- a distinct canonical account;
- current adult verification;
- verified authority or relationship;
- a scoped consent record with an expiry; and
- no unresolved duplicate, closure, ban, or recovery state.

Guardian consent grants no access to the minor’s private profile, messages, drafts, evidence, or matching information.

A guardian-consented minor may use basic participation features, but cannot use:

- agreements or other binding commitments;
- contributions, payments, payouts, or receiving funds;
- organization control;
- independent verification; or
- high-risk collective commitments.

At adulthood, the account should enter a controlled reverification and adult re-consent process before restrictions are lifted. The v1 schema records the age class but does not infer a birthday from raw document data.

People under 13 are not issued an account grant.

## Recovery

A recovery verification must resolve to an existing identity subject. It cannot create a new subject or a new registration grant.

Authorized completion:

- re-establishes a replacement login credential independently;
- revokes active Supabase sessions and refresh tokens;
- records a 72-hour ordinary cooldown;
- records a seven-day high-risk cooldown;
- restores the existing canonical account to `recovery_cooldown`; and
- records append-only security events.

Support email, SMS, or an operator assertion alone cannot replace the identity check.

## Duplicate consolidation

Duplicate accounts are consolidated logically, not deleted through the current foreign-key cascade graph.

The merge workflow:

1. freezes the duplicate account in `duplicate_review`;
2. computes a dry-run inventory of every foreign key referencing `profiles`;
3. identifies tables where both profiles control sensitive records;
4. records a conflict summary;
5. requires independent approval; contested cases require two approvals;
6. requires authentication credentials to be reconciled to the canonical Supabase user outside the SQL merge;
7. creates a durable alias from the duplicate profile ID to the canonical profile ID;
8. marks the duplicate identity subject as merged and keeps its dedupe keys;
9. revokes duplicate sessions and bans the duplicate auth user from signing in; and
10. preserves all original actor IDs and immutable history.

The merge does not rewrite signed agreements, evidence, payments, votes, moderation history, or audit events. Read models should resolve historical profile IDs through `resolve_canonical_person_profile_v1`.

The dry run blocks automatic execution when both profiles own sensitive records requiring subsystem-specific reconciliation.

## Closure

Closure is a logical security state. The application must not delete `auth.users` or `profiles` as part of ordinary closure.

Closure:

- revokes sessions and refresh tokens;
- disables login;
- records a dedupe tombstone;
- retains identity dedupe keys;
- preserves obligations, evidence, payments, and audit history; and
- routes later identity matches to recovery of the closed canonical account.

Legal erasure is a separate reviewed process and must prove that protected obligations and referential-integrity requirements are satisfied.

## Release gates

The database release gate starts with both switches off:

```text
registration_enforcement_enabled = false
participation_enforcement_enabled = false
```

The application environment gates also default to false. Enabling either layer without the other is not sufficient to make a truthful release claim.

Recommended rollout:

1. Apply migration to isolated QA.
2. Configure `qa_mock` with independent QA-only keys.
3. Run SQL regression and authenticated browser tests, including concurrency and cleanup.
4. Configure a signed provider in protected Preview with a Preview-only dedupe key and webhook secret.
5. Run provider replay, reordering, timeout, and deletion-retention tests.
6. Configure the Supabase Before User Created hook in Preview.
7. Enable registration enforcement in Preview.
8. Test adult, minor, guardian, duplicate, recovery, closure, and multi-credential paths.
9. Apply the reviewed migration to production while gates remain off.
10. Configure the production provider and Auth hooks.
11. Enable registration enforcement first.
12. Verify no unverified account can be created and no verified user is blocked incorrectly.
13. Introduce participation enforcement in a separately monitored release after existing-user verification communications and support operations are ready.

Rollback:

- turn off application participation and registration gates;
- turn off the database release gates;
- remove the hosted Auth hook configuration if account creation must be restored;
- do not drop identity tables or dedupe tombstones during an incident;
- preserve audit records and investigate before re-enabling.

## QA-only adapter

`POST /api/identity/qa/complete` exists only when:

```text
VERCEL_ENV != production
ONE_PERSON_ACCOUNT_PROVIDER_MODE=qa_mock
ONE_PERSON_ACCOUNT_QA_SECRET=<at least 32 characters>
ONE_PERSON_ACCOUNT_DEDUPE_KEY=<at least 32 characters>
```

It requires a bearer secret and accepts only an opaque QA subject reference. It is rejected with a 404 in Vercel Production. Synthetic QA accounts must be labeled and removed after each run.

## Mandatory acceptance tests

- two concurrent registrations for the same person create at most one canonical account;
- provider webhook replay and retry are idempotent;
- provider event reordering cannot replace a confirmed duplicate with a clean result;
- different emails or OAuth providers for the same human enter recovery;
- shared IP, device, household, school, or address signals do not independently create a hard duplicate decision;
- a closed person cannot create a clean second account;
- contested duplicate review reveals no other account details;
- a guardian receives no access to minor-private data;
- a minor cannot reach prohibited capabilities through direct RPCs or service actions;
- recovery revokes sessions and applies both cooldowns;
- merge dry-run preserves every historical record and blocks ambiguous dual ownership;
- no normal closure or merge deletes the canonical history graph;
- public profile projection contains no provider or identity-deduplication data;
- raw identity media and full document numbers never appear in application storage or logs;
- deletion deadlines are monitored at 30 days and escalated before 90 days;
- service and synthetic accounts cannot exercise human capabilities; and
- synthetic QA residue is zero after cleanup.
