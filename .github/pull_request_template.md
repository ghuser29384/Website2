## Summary

Describe the behavior or repository condition changed by this pull request.

## Source of truth

Link the issue, specification, user decision, incident, failing run, or other exact source that defines success.

## Release classification

Select **exactly one**. See the [release classification and production evidence policy](https://github.com/ghuser29384/Website2/blob/main/docs/release-policy.md).

- [ ] **Runtime-affecting** — can change what production builds, serves, stores, authorizes, charges, displays, or executes
- [ ] **Repository-only** — proven not to change the production artifact or runtime state
- [ ] **Mixed or uncertain** — treat as runtime-affecting

### Classification evidence

Explain why the selected classification is correct. For repository-only changes, state how you verified that production source, public assets, migrations, dependencies, and deployment configuration are unchanged.

## Release disposition

Select a compatible procedure. A blocked change must select only the blocked option. A repository-only change may select both the merge-without-manual-promotion and ordinary-automatic-deployment options.

- [ ] **Explicit production release and post-release smoke test required**
- [ ] **Merge after repository gates; no manual production promotion required**
- [ ] **Ordinary automatic `main` deployment may occur, but it is not necessary to fix production**
- [ ] **Do not merge or deploy yet; blockers remain**

### Deployment and post-release procedure

Runtime-affecting and mixed changes must complete both fields, even while blocked. Repository-only changes may state that they are not applicable.

- Deployment target / plan:
- Post-release verification plan:

## Verification

Mark only checks that have actually run. Leave non-applicable checks unchecked and explain that boundary under “Checks actually run.”

- [ ] **Focused tests passed**
- [ ] **Repository tests passed, or an exact-base differential policy is documented**
- [ ] **ESLint passed**
- [ ] **TypeScript passed**
- [ ] **Production build passed**
- [ ] **Rendered desktop/mobile checks passed when user-visible behavior changed**
- [ ] **Database, authorization, payment, job, or environment checks passed when applicable**
- [ ] **Exact diff inspected for unrelated changes**

### Checks actually run

List exact commands and GitHub Actions run URLs. Distinguish focused checks from broader gates and identify anything not run.

## Production evidence

Complete these fields only after a runtime-affecting or mixed change is actually deployed or reported as fixed in production. Repository-only changes must not make production-fix claims.

- Merged commit:
- Vercel deployment:
- Target and aliases:
- Canonical URLs checked:
- Runtime-log inspection window:
- Remaining risks or verification limits:

Do not claim “fixed in production,” “promoted,” “all gates passed,” or “production is healthy” unless the corresponding evidence in the release policy is present.
