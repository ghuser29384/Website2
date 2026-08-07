# PR #212 institutional MFA stable-state QA contract

The authenticated institutional QA flow must verify the durable postcondition of MFA verification rather than a transient server-action message.

## Stable postcondition

After submitting the current TOTP code, the account-security panel refreshes and renders:

```text
AAL: aal2
```

The Playwright driver therefore waits for that exact rendered state. It must not wait for the short-lived `MFA verified for this session.` action result, which can disappear during `router.refresh()`.

## Scope

This contract changes no MFA policy or authorization rule. Server actions, Supabase AAL checks, exact organization/program authority, personal-capacity isolation, and all downstream institutional authorization gates remain authoritative.

The document exists to make the browser-test postcondition reviewable and to trigger the durable exact-head isolated-QA workflow after the same contract was encoded in source tests.
