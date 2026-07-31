## Summary

Describe the behavior or repository condition changed by this pull request.

## Source of truth

Link the issue, specification, user decision, incident, failing run, or other exact source that defines success.

## Release classification

Select **exactly one**. See [`docs/release-policy.md`](../docs/release-policy.md).

- [ ] **Runtime-affecting** — can change what production builds, serves, stores, authorizes, charges, displays, or executes
- [ ] **Repository-only** — proven not to change the production artifact or runtime state
- [ ] **Mixed or uncertain** — treat as runtime-affecting

### Classification evidence

Explain why the selected classification is correct. For repository-only changes, state how you verified that production source, public assets, migrations, dependencies, and deployment configuration are unchanged.

## Release disposition

Select the applicable procedure.

- [ ] Explicit production release and post-release smoke test required
- [ ] Merge after repository gates; no manual production promotion required
- [ ] Ordinary automatic `main` deployment may occur, but it is not necessary to fix production
- [ ] Do not merge or deploy yet; blockers remain

## Verification

List the exact commands, workflow runs, rendered checks, migration checks, and runtime evidence used. Distinguish focused checks from complete repository gates.

- [ ] Focused tests passed
- [ ] Repository tests passed, or an exact-base differential policy is documented
- [ ] ESLint passed
- [ ] TypeScript passed
- [ ] Production build passed
- [ ] Rendered desktop/mobile checks passed when user-visible behavior changed
- [ ] Database, authorization, payment, job, or environment checks passed when applicable
- [ ] Exact diff inspected for unrelated changes

## Production evidence

Complete this section only for runtime-affecting changes or when reporting an automatic deployment.

- Merged commit:
- Vercel deployment:
- Target and aliases:
- Canonical URLs checked:
- Runtime-log inspection window:
- Remaining risks or verification limits:

Do not claim “fixed in production,” “promoted,” “all gates passed,” or “production is healthy” unless the corresponding evidence in the release policy is present.
