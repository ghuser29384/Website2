# MoralTrade QA environment

This runbook creates and operates the isolated database used to validate marketplace and dealroom changes without exposing production data or giving Preview code access to the production service-role key.

## Fixed environment boundary

| Purpose | Project | Ref |
| --- | --- | --- |
| Production source, schema only | Existing production project | `jnpoxvalyjtdghnperyu` |
| Isolated QA target | `MoralTrade QA` | `hvmxfjjbdcgjjudmthdz` |
| Vercel Preview branch | PR #158 branch | `agent/dynamic-marketplace-clearing-rounds` |

The bootstrap scripts reject other project refs. They do not copy application rows, Auth users, sessions, identities, Storage objects, Vault secrets, provider credentials, payment identifiers, messages, evidence, or personal data.

## Required local or Codex capabilities

Use a trusted browser-enabled Codex session or a controlled administrator workstation. Do not paste any of the following credentials into a PR, chat message, shell history, build log, or committed file.

Required commands:

- `supabase`
- `psql`
- Node.js and the repository dependencies
- `npx` for Vercel CLI configuration

Required secret environment variables:

```text
PROD_SUPABASE_DB_URL
QA_SUPABASE_DB_URL
QA_SUPABASE_SERVICE_ROLE_KEY
QA_TEST_PASSWORD
VERCEL_TOKEN
```

Required non-secret environment variables:

```text
QA_SUPABASE_URL=https://hvmxfjjbdcgjjudmthdz.supabase.co
QA_SUPABASE_PUBLISHABLE_KEY=<publishable key for MoralTrade QA>
```

`QA_TEST_PASSWORD` must be at least 14 characters. It is shared by two disposable QA-only accounts and must not be reused elsewhere.

## 1. Bootstrap the schema and synthetic fixture

From a clean checkout of PR #158:

```bash
npm ci
export QA_BASELINE_ARTIFACT_DIR="$PWD/.qa-baseline-artifact"
bash scripts/bootstrap-moraltrade-qa-schema.sh
```

The script performs these checks and operations:

1. Refuses any source other than production ref `jnpoxvalyjtdghnperyu`.
2. Refuses any target other than QA ref `hvmxfjjbdcgjjudmthdz`.
3. Refuses to overwrite a target that already contains public application tables or Auth users.
4. Uses `supabase db dump` to export the application schema without production rows.
5. Exports migration history separately.
6. Restores the application schema into the empty QA project.
7. Recreates the private `trade-evidence` bucket metadata and its one custom read policy, without Storage objects.
8. Compares production and QA tables, views, materialized views, enums, functions, and RLS policies by name.
9. Verifies required marketplace, agreement, email, and core-trade tables.
10. Verifies that no production profiles, offers, Auth users, or Storage objects were copied.
11. Creates two synthetic, email-confirmed QA accounts and one reversible, non-financial open proposal.
12. Writes a reviewable schema baseline artifact when `QA_BASELINE_ARTIFACT_DIR` is set.

Synthetic accounts:

```text
qa-market-owner@example.com
qa-market-responder@example.com
```

The password is the private value supplied through `QA_TEST_PASSWORD`.

The deterministic proposal ID is:

```text
10000000-0000-4000-8000-000000000158
```

The fixture contains no payment, donation, real beneficiary, sensitive evidence, or real-world obligation.

## 2. Review and retain the reproducible baseline

Before committing a generated baseline:

```bash
sha256sum -c .qa-baseline-artifact/SHA256SUMS
rg -n "(password|service[_-]?role|secret|private[_-]?key|access[_-]?token)" \
  .qa-baseline-artifact/production-baseline.sql
```

Review all matches. SQL identifiers containing words such as `secret` are not automatically credentials; hard-coded credential values are prohibited.

After review, retain the baseline outside `supabase/migrations/`:

```text
supabase/baseline/production-baseline.sql
supabase/baseline/production-manifest.txt
supabase/baseline/SHA256SUMS
```

Do not place the snapshot directly into `supabase/migrations/`. Production already contains the represented schema, so an automatically replayed baseline could attempt to recreate live objects. The baseline is the documented starting snapshot for a fresh environment; subsequent repository migrations remain incremental.

## 3. Configure branch-scoped Vercel Preview variables

Run:

```bash
bash scripts/configure-moraltrade-qa-vercel.sh
```

The script configures these variables for **Preview only**, restricted to branch `agent/dynamic-marketplace-clearing-rounds`, in both Vercel projects `website2` and `moraltrade-site`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

It does not modify Production or Development variables. Trigger fresh preview deployments after configuration because existing deployments keep their previous environment snapshot.

## 4. Browser validation

Use desktop `1440 × 900` and mobile `390 × 844` viewports. The Browser plugin is preferred; otherwise use Playwright.

### Public marketplace

- Open `/offers?view=live`.
- Confirm participant-level offer menus render.
- Confirm smart search, hard constraints, sorting, selectors, and participant pagination work.
- Confirm the weekly Thursday cutoff and Monday introduction copy does not promise a match.
- Confirm no worked example is counted as live activity.

### Question flow

- Sign in as `qa-market-responder@example.com`.
- Open `/offers/10000000-0000-4000-8000-000000000158/question`.
- Post one clearly labelled QA question.
- Confirm a pending state appears.
- Confirm the page returns to the question thread, shows a success message, clears the form, and displays the new question.
- Confirm empty-thread copy is absent once a question exists.

### Save and counteroffer

- Save the deterministic proposal and verify pending and persisted states.
- Remove it and verify the reverse state.
- Open Counteroffer.
- Confirm the source proposal remains identified and its offered/requested roles are visibly reversed.
- Confirm an offset counteroffer never silently copies financial amounts.

### Two-account commitment and dealroom

1. As the responder, submit interest in the deterministic proposal.
2. Sign out and sign in as `qa-market-owner@example.com`.
3. Accept the pending response.
4. Confirm the request does not return HTTP 500.
5. Confirm an agreement is created and `/commitments` links to `/deals/{agreementId}`.
6. Open the dealroom and verify side-by-side commitments, lifecycle state, term editing, term diff, counteroffer history, and status controls.
7. Confirm evidence, review, and payment modules remain absent until corresponding real QA records exist.
8. Do not create payments, donations, sensitive evidence, or irreversible external actions.

### Runtime logs

For both Vercel projects, verify the tested deployment does not emit:

```text
Missing SUPABASE_SERVICE_ROLE_KEY
permission denied for table email_outbox
```

Explain or fix all application-origin 4xx/5xx responses and console errors before merge.

## 5. Merge and cleanup gates

Merge PR #158 only when all of the following are true:

- GitHub reports the PR mergeable.
- Both Vercel checks are green for the exact tested head SHA.
- Desktop and mobile browser QA pass.
- The complete two-account agreement and dealroom flow passes.
- Runtime logs show no missing credential or email-outbox permission failure.
- No unresolved PR review threads remain.

After the isolated QA environment and baseline are verified, delete the obsolete empty Supabase branch `launch-verify-harden-20260723` (`luwtqmqhlswgvnbgxtaa`). Do not delete the long-lived `MoralTrade QA` project unless the recurring project is intentionally retired.
