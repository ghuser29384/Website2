# Release classification and production evidence

This policy separates three questions that are easy to conflate:

1. **Was the repository failure fixed?**
2. **Was the fix merged into `main`?**
3. **Did production need a new runtime release, and was that release verified?**

A green repository check does not by itself prove that production changed. Conversely, a Vercel deployment marked `READY` does not prove that a production deployment was necessary for a test-only repair.

## 1. Classify the exact diff before choosing a release procedure

Select exactly one classification for every pull request.

### Runtime-affecting

Use this classification when the diff can change what production builds, serves, stores, authorizes, charges, displays, or executes. Examples include:

- application source under `src/`;
- browser-served assets under `public/`;
- Supabase migrations, RLS policies, generated database types, or data backfills;
- dependencies or lockfiles that can change the production artifact;
- Next.js, Vercel, build, routing, cron, environment, webhook, authentication, payment, or deployment configuration;
- scripts invoked by production builds or runtime jobs;
- any change whose effect on the generated artifact has not been proven to be zero.

Runtime-affecting changes require the proportionate release gates, an exact deployment tied to the merged commit, and post-release verification of the affected behavior.

### Repository-only

Use this classification only when the diff is proven not to alter the production artifact or runtime state. Examples include:

- tests and test fixtures that production does not import;
- CI workflow changes;
- documentation and repository guidance;
- comments or formatting with no generated-artifact change;
- type-only changes that are erased and have been checked not to change emitted or bundled code.

Repository-only changes should be merged after their repository gates pass. They do **not** justify a special production hotfix or manual Vercel promotion by themselves.

A merge to `main` may still trigger the ordinary Vercel production pipeline. That incidental deployment must not be described as necessary to fix production. Report it as an automatic main-branch deployment, if relevant.

### Mixed or uncertain

If a pull request contains both runtime-affecting and repository-only changes, or if its production effect is uncertain, classify it as runtime-affecting. Do not use a test-only label to avoid runtime release gates.

## 2. Choose the release procedure from the classification

### Runtime-affecting procedure

Before merge:

1. Run focused tests for the affected mechanism.
2. Run the applicable absolute gates: repository tests, ESLint, TypeScript, production build, migration or SQL checks, and rendered browser checks.
3. Inspect the exact diff and confirm that unrelated changes are excluded.
4. Verify a preview or exact candidate deployment when the affected behavior depends on rendering, authentication, data, payments, jobs, or environment configuration.

After merge:

1. Identify the exact merged commit.
2. Verify the Vercel deployment for that commit is `READY`, targets production, and owns the intended production aliases.
3. Smoke-test the changed production behavior on canonical URLs.
4. Inspect relevant runtime logs and error clusters.
5. Report unresolved risks and any verification boundary.

### Repository-only procedure

Before merge:

1. Run the focused repository check that previously failed.
2. Run any broader repository gates needed to show the repair is not hiding another failure.
3. Confirm from the exact diff that production code, runtime assets, database state, dependencies, and deployment configuration are unchanged.

After merge:

1. Verify that the pull request was merged and the exact repository check is green on the merged commit.
2. Do not manually promote a preview solely for this change.
3. Do not describe the repair as a production hotfix or say that production behavior was fixed unless separate runtime evidence establishes an actual production defect and correction.
4. If Vercel auto-deploys `main`, distinguish that ordinary deployment from a necessary release action.

## 3. Evidence required for common claims

| Claim | Minimum evidence |
| --- | --- |
| “The repository failure is fixed” | The exact failing check passes on the exact candidate or merged commit. |
| “The change is merged” | The pull request is merged and the resulting commit is present on `main`. |
| “The change is deployed” | A deployment for the exact commit is `READY`, targets production, and has the intended production aliases. |
| “The production defect is fixed” | The change is runtime-affecting, the exact production deployment is identified, and the affected canonical behavior is verified after deployment. |
| “Production is healthy” | Relevant post-release route checks and runtime logs show no unresolved defect within the stated inspection window. |

Never infer one claim from evidence that establishes only another.

## 4. Required reporting language

Use precise status statements:

- **Repository-only repair:** “The stale test or CI failure is fixed and merged. No manual production promotion was required.”
- **Runtime release:** “The runtime change is merged, the exact commit is deployed to production, and the affected behavior passed the listed smoke tests.”
- **Automatic deployment of a repository-only change:** “Vercel automatically deployed the new `main` commit, but the repository-only repair did not require a production hotfix.”
- **Incomplete evidence:** “The repository check passes, but production behavior has not been verified.”

Avoid these overstatements unless the stronger evidence exists:

- “fixed in production” for a test-only failure;
- “promoted” when only a merge occurred;
- “all gates passed” when only focused checks ran;
- “no runtime errors” without a stated project, deployment, and inspection window;
- “safe” or “live” based only on a `READY` deployment.

## 5. Rollback policy

Do not roll back merely because a repository-only change was unnecessarily included in an automatic deployment. Roll back when there is evidence of a runtime regression, unsafe configuration, data-integrity risk, authorization failure, payment risk, or another material production defect.

## 6. Reference example

A stale test that asserts one exact quotation or string-concatenation style, while the browser loader already behaves correctly, is a repository-only failure. The appropriate action is to replace the brittle assertion with a semantic test, merge after repository gates pass, and avoid presenting the repair as a production hotfix. If `main` auto-deploys afterward, that deployment is ordinary release infrastructure behavior rather than evidence that production needed the test repair.
