# PR #212 institutional membership profile embed

`institutional_memberships` has two foreign keys to `profiles`: the member's `profile_id` and the inviter's `invited_by` value. PostgREST therefore requires the organization deal loader to name the member relationship explicitly:

```text
profiles:profiles!institutional_memberships_profile_id_fkey(id,display_name,email)
```

The unqualified `profiles(...)` embed is rejected as ambiguous and can prevent the organization deal workspace from rendering. A source-contract test now rejects that ambiguous form and preserves the exact member-profile relationship.
