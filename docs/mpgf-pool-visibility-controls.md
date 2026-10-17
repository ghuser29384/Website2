# MPGF pool visibility controls

## Contract

Every production pool has two explicit visibility fields:

- `threshold_visibility`: `public_exact` only. Exact threshold amounts are material contract terms and remain visible to prospective contributors.
- `progress_visibility`: one of `exact_amount`, `progress_range`, `threshold_status_only`, or `sealed_progress`.

The default reporting posture is:

```text
threshold_visibility = public_exact
progress_visibility = exact_amount
```

## Transparency order

The database ranks the four progress modes from least to most transparent:

1. `sealed_progress`
2. `threshold_status_only`
3. `progress_range`
4. `exact_amount`

Before the first accepted pledge, a creator may choose any progress mode. Once the first accepted pledge is recorded, the mode may stay unchanged or move upward in this ordering. It may never move downward.

## Accepted-pledge latch

`first_accepted_pledge_at` is an immutable historical latch.

For the currently deployed `mpgf_pledges` path, acceptance means:

```sql
status in ('pledged', 'converted_to_payment_intent')
```

For environments with the verified public-goods campaign schema, acceptance means:

```sql
eligibility_state = 'eligible'
and status in ('pledged', 'captured')
```

A later cancellation, void, expiry, or refund does not clear the latch. This prevents a creator from accepting a pledge, cancelling or losing it, and then concealing information from later contributors.

The latch trigger is `SECURITY DEFINER` with a fixed `search_path`. This is required because a contributor ordinarily cannot update the creator-owned pool row under RLS. Direct execution is revoked from `public`, `anon`, and `authenticated`; the function is used only by its trigger.

## Schema compatibility

The migration supports both repository states:

- the currently deployed production schema, where `mpgf_pool_proposals` is the durable pool record and `mpgf_pledges.pool_proposal_id` links a pledge to it;
- environments that already have `mpgf_public_goods_campaigns` and `mpgf_public_goods_pledges`, where equivalent visibility columns and latches are applied to campaign records and propagated to linked proposals.

## Verification

Apply the migration in QA, then run:

```text
supabase/tests/mpgf_pool_visibility_controls.sql
```

The transactional test verifies:

- the threshold enum has exactly one value;
- the progress enum has exactly four values;
- the default is public exact thresholds plus exact funding progress;
- a non-owner authenticated contributor can create an accepted pledge without bypassing pool RLS;
- acceptance latches the pool;
- post-acceptance transparency upgrades are allowed;
- post-acceptance transparency downgrades are rejected;
- cancellation does not release the lock;
- the latch itself cannot be cleared.

## Release baseline

The Node 24 baseline run on the then-current `main` commit and the first release-candidate run produced the same result: 727 passing tests and 54 failing repository assertions. This established that the failures were not introduced by the visibility migration. The release candidate repairs those stale assertions and related deterministic-build contracts rather than waiving the full-suite gate. Production promotion still requires the exact candidate head to pass the full test, lint, build, whitespace, preview, and authenticated browser gates.

## Rollback posture

Do not drop the enum columns or erase `first_accepted_pledge_at` during an incident. That would destroy contributor-relevant history.

For an emergency write-path rollback:

1. Pause pool-visibility edits.
2. Disable the application control that initiates visibility changes.
3. Preserve all visibility columns and latch timestamps.
4. Investigate under a transaction or database branch.
5. Reapply the trigger definitions after correction.

Dropping the monotonicity triggers is not an ordinary rollback because it weakens an accepted contributor contract. It requires an explicit incident decision and a compensating database audit before writes resume.
