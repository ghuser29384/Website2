# Vercel cost controls

## Objective

Preserve the complete Moral Trade release standard while removing Vercel as a
high-frequency duplicate CI system.

The authoritative deployment project is:

- project: `moraltrade-site`
- project ID: `prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7`
- production branch: `main`
- optional release-preview branch: `release/vercel-preview`

The repository disables automatic Vercel Git deployments. A release is created
only through `.github/workflows/vercel-release.yml`, after the complete test,
lint, TypeScript, production-build, and Playwright gates pass. The workflow
builds the Vercel artifact on GitHub Actions compute and uploads it with
`vercel deploy --prebuilt`, so Vercel does not repeat the application build.

## Required GitHub secret

Create a Vercel access token with access to the `ellen-s` team and add it to the
repository's Actions secrets as `VERCEL_TOKEN`. Never commit or paste the token
into an issue, pull request, workflow input, build log, or chat.

## One-time account cleanup

1. Run **Vercel administrative cost controls** in `audit` mode.
2. Inspect the redacted artifact.
3. Run it again in `apply` mode with confirmation
   `APPLY-VERCEL-COST-CONTROLS`.
4. Keep these defaults enabled:
   - disconnect `website2` from GitHub;
   - delete the six allowlisted, domainless one-use test projects;
   - apply Standard builds;
   - disable elastic/on-demand build concurrency;
   - serialize the build queue.
5. Enable `resume_production` only after the team budget permits service to
   resume.

The `website2` disconnect is idempotent. If the audit proves that its Git link
is already absent, the workflow performs no disconnect mutation and still
verifies the disconnected state.

The cleanup deliberately disconnects rather than deletes `website2`. Its
existing custom domains remain attached to their current deployment, avoiding
an accidental domain outage. Move or retire those domains in a separate,
explicit domain migration after deciding which brand names should remain live.

The six deletion targets are hard-coded by both project ID and name. Deletion
fails closed if a project has a custom domain or its identity has changed.

## Billing-blocked recovery

When the canonical domain returns HTTP 402 with `DEPLOYMENT_DISABLED`, first
confirm whether Vercel reports `resource_creation_blocked` because of an overdue
balance. Repository safeguards can still be prepared while billing is blocked,
but Vercel may reject project PATCH, unpause, and other account mutations until
the balance and payment method are resolved.

Before payment:

1. Keep automatic Vercel Git deployments disabled.
2. Confirm that `website2` is disconnected and the six obsolete projects are
   absent.
3. Record the last known-good production deployment and its immutable Git SHA.
4. Do not create extra preview or production builds merely to test whether the
   billing block has cleared.

After payment has cleared:

1. Run **Vercel administrative cost controls** in `audit` mode and inspect the
   artifact.
2. Run it in `apply` mode with confirmation
   `APPLY-VERCEL-COST-CONTROLS`, keeping `disconnect_website2` and
   `delete_obsolete_projects` enabled and setting `resume_production` to true.
3. The workflow must verify all of the following before it succeeds:
   - the canonical project reports `live: true`;
   - Standard builds are active;
   - paid elastic concurrency is disabled;
   - the build queue is serialized;
   - `website2` remains Git-disconnected;
   - all six obsolete projects remain absent;
   - the canonical root and Commitments Portfolio, Ledger, Completed, and
     Calendar routes return HTTP 200;
   - all Commitments routes render the expected signed-out privacy state and
     resolve to one production deployment ID.
4. Inspect `vercel-cost-controls-*.json` and
   `vercel-production-smoke.json` before reporting restoration complete.
5. Perform a separate post-release runtime-log and 5xx review. The workflow's
   HTTP smoke is necessary, but it does not replace the runtime-log audit.

A successful unpause API response alone is not sufficient evidence of service
restoration.

## Release process

### Production

1. Merge only a repository-gated candidate into `main`.
2. Record the immutable 40-character `main` SHA.
3. Run **Gated Vercel release** with:
   - target: `production`
   - ref: `main`
   - expected SHA: the recorded SHA
4. Verify the deployment URL and production domains.

### Release preview

1. Fast-forward `release/vercel-preview` to the exact candidate SHA.
2. Run **Gated Vercel release** with:
   - target: `preview`
   - ref: `release/vercel-preview`
   - expected SHA: the recorded SHA
3. Review the single resulting preview.

Ordinary feature, repair, QA, documentation, and workflow branches are tested
in GitHub Actions only and receive no Vercel deployment.

## Spend management

Vercel's supported configuration path for the team spend amount is the team
dashboard. It currently documents no supported REST API or CLI command for
creating or updating this team-level amount. An Owner or Billing-role user must
open **Team Settings → Billing → Spend Management** and configure it there.

Set a notification-oriented monthly on-demand spend amount of **$40** initially:

- 50% (`$20`): web and email warning;
- 75% (`$30`): web and email escalation;
- 100% (`$40`): urgent web and email alert, optional SMS alert, and operational
  review.

Vercel supports SMS for the 100% threshold only. Each Owner or Billing-role user
must configure their own notification channels under **My Notifications**.

Do **not** enable **Pause production deployment** for this spend amount.
Automatic Git deployments and ordinary preview deployments are already
structurally disabled, so a cost anomaly should trigger investigation rather
than take the public website offline. An optional spend-management webhook may
notify operators or invoke additional non-production suppression, but it must
not pause the canonical production project. Raise the amount only after
inspecting the resource-level usage breakdown.

## Observability and add-ons

Do not remove quality-bearing production observability merely to save a small
amount. The dominant cost was build CPU, not runtime analytics. Deleting the
obsolete test projects removes any project-level configuration attached to
those projects. Review the canonical project's remaining add-ons in the audit
artifact and disable only items that are both paid and unused.

## Rollback

If the controlled release workflow fails:

- do not re-enable automatic Git deployments;
- repair the candidate and rerun GitHub gates;
- deploy the previous known-good prebuilt artifact or use Vercel's production
  rollback controls.

If `website2` was disconnected unintentionally, reconnect it only after
confirming which custom domains depend on it. Do not reconnect it merely to
obtain previews; use the designated release-preview branch instead.

## Monthly review

At the end of each billing cycle, record:

- Build CPU Minutes and cost;
- number of Vercel deployments;
- number of production releases;
- runtime compute, transfer, and observability cost;
- whether any project other than `moraltrade-site` is connected to `Website2`.

A normal month should have approximately one Vercel build/upload per approved
release, not one or two builds per Git commit.
