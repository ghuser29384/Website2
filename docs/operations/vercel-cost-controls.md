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

The cleanup deliberately disconnects rather than deletes `website2`. Its
existing custom domains remain attached to their current deployment, avoiding
an accidental domain outage. Move or retire those domains in a separate,
explicit domain migration after deciding which brand names should remain live.

The six deletion targets are hard-coded by both project ID and name. Deletion
fails closed if a project has a custom domain or its identity has changed.

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

Set a notification-oriented monthly on-demand spend amount of **$40** initially:

- 50% (`$20`): email and SMS warning;
- 75% (`$30`): email and SMS escalation;
- 100% (`$40`): urgent email/SMS and operational review.

Do **not** configure the spend amount to pause production. Automatic Git and
preview deployments are already structurally disabled, so a cost anomaly
should trigger investigation rather than take the public website offline.
Raise the amount only after inspecting the resource-level usage breakdown.

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
