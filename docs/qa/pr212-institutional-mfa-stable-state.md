# PR #212 institutional MFA stable-state QA contract

The authenticated institutional QA flow must verify the durable postcondition of MFA verification rather than a transient server-action message.

## Stable postcondition

After submitting the current TOTP code, the Playwright driver must:

1. observe the completed `POST /dashboard` server-action response;
2. verify that the response transport completed successfully;
3. hard-reload the dashboard; and
4. confirm that the reloaded account-security panel renders an `aal2` session, through either the `Session level` or `AAL` field.

The driver must not wait for the short-lived `MFA verified for this session.` action result. That message can disappear during `router.refresh()` and does not independently prove that the browser retained the refreshed AAL2 session.

If the durable postcondition is absent, the retained QA evidence includes the initial, post-action, and post-reload panel text; the server-action response status; redacted cookie metadata that excludes cookie values; and a failure screenshot. This distinguishes an action failure, session-persistence failure, stale render, or selector failure without exposing authentication credentials.

## Scope

This contract changes no MFA policy or authorization rule. Server actions, Supabase AAL checks, exact organization/program authority, personal-capacity isolation, and all downstream institutional authorization gates remain authoritative.

The document makes the browser-test postcondition reviewable and triggers the durable exact-head isolated-QA workflow after the same contract was encoded in source tests.