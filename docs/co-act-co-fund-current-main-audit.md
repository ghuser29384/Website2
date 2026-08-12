# Co-Act and Co-Fund current-main reconstruction audit

Date: 2026-08-03

Reconstruction base: `main` at `92cb9d1eb08f9784be0353dd920c0784984e9a22`

Historical implementation reference: draft PR #420 at `4d2147a940314c0cd4874d87c18c2907a4637108`

This audit records the semantic delta used to reconstruct the proposal-only Co-Act and Co-Fund work on current `main`. It is not evidence that the feature is deployed or executable.

## Current-main architecture that remains authoritative

- `/trades/new` renders the existing same-origin Create `srcDoc` iframe through `CreateInterfaceFrame`.
- `POST /api/create/publish` is the authoritative proposal-validation and private review-record write path.
- Standalone Co-Fund creation is represented by `poolTerms.commonGround` and remains the canonical standalone Co-Fund model.
- Existing Create proposals remain private and non-binding until their separate review and confirmation gates pass.
- No client field may activate a group, authorize or move money, publish identities, award verified impact, or mutate participant credibility.

## Historical changes retained

The reconstruction retains the parts of PR #420 that remain additive to current `main`:

- Co-Act and offer-linked Co-Fund structured proposal terms;
- feature-gated same-action/complementary-role and allocation subtypes;
- participant, eligibility, visibility, additionality, evidence, reward, attrition, redistribution, fallback, recurring, currency, and confirmation terms;
- canonical server validation against server-derived offer option keys and contribution kinds;
- fail-closed rejection of unknown, private-value, and executable-authority fields;
- private proposal-review persistence through the authoritative Create write;
- deterministic review summaries, local draft save/resume, focused contracts, and rendered browser coverage;
- explicit proposal-only copy and receipt semantics.

## Historical changes adapted

### Offer-linked Co-Fund versus standalone Co-Fund

The old branch treated `groupContributionTerms` as a general envelope for Co-Act and Co-Fund option modifiers. Current `main` also has a standalone Co-Fund entry surface using `poolTerms.commonGround`.

The reconstructed contract therefore makes the distinction explicit:

- `poolTerms.commonGround` remains authoritative for standalone Co-Fund creation;
- offer-linked Co-Fund terms remain a private modifier on one reciprocal trade option;
- the proposal flow creates neither a second standalone pool nor a parallel payment mechanism;
- a later activation service must reconcile both entry surfaces into shared authoritative group-agreement and funding contracts.

### Participant ceiling

The accepted product decision set a universal limit of 100. Current `main` still enforced 2–8 participants on the standalone Co-Fund entry surface. The reconstruction aligns both the public Create UI and server validation to 2–100 and adds 100/101 boundary tests.

### Shadow-DOM interaction lifecycle

The prior rendered test failed because changing mode replaced the Shadow DOM subtree containing the button while the click was still being dispatched. The reconstruction uses one stable Shadow host and shell for the lifetime of an option:

- the mode controls stay attached;
- only the panel slot is replaced;
- listeners are delegated from the stable Shadow root;
- state is persisted before rendering;
- panel replacement is deferred until the current event completes;
- cross-realm event-target guards avoid `instanceof` checks against the parent realm.

This removes the separate capture/replay interaction-stability patch.

## Historical changes discarded

The reconstruction intentionally does not carry forward:

- temporary source-export, materialization, hardening, finalizer, or integration-controller workflows;
- temporary payload chunks and generated working-tree artifacts;
- the standalone interaction-stability capture/replay module and its timing-specific workarounds;
- the unused alternate FormData adapter; the current Create publish contract is authoritative JSON;
- merge commits used only to keep the historical branch synchronized;
- any claim that the historical preview, build, or production state verifies the reconstructed candidate.

## Release boundary

This candidate remains runtime-affecting but proposal-only. Before it can leave draft, the exact reconstructed head must pass focused contracts, the complete repository suite, ESLint, TypeScript, the production build, rendered desktop/mobile tests, exact-diff review, and exact-head preview inspection. After merge, production claims require identification of the exact canonical deployment, canonical-route smoke tests, and runtime-log inspection.
