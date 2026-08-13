# Account activation routing contract

This contract records the first implementation slice of the approved Moral Trade route consolidation.

## Canonical account sequence

1. A signed-out visitor who opens `/` goes to `/discover`.
2. A newly created account goes to `/walkthrough`.
3. A completed walkthrough with a saved profile draft resumes at `/complete-profile` for the private 100-Sparks allocation.
4. Saving 100 Sparks completes account setup and goes to `/feed`.
5. A returning account with completed setup goes directly to `/feed`.

The root route must not infer that an account is new merely because a browser lacks a cookie. Persisted completion overrides stale walkthrough cookies. During the static-to-Next walkthrough migration, the existing walkthrough cookies remain a same-device recovery signal for unfinished setup; an authenticated account with neither persisted nor local setup state is treated as returning.

## Phase-one route behavior

| State | Destination |
| --- | --- |
| Signed out | `/discover` |
| Authenticated; setup `completed` | `/feed` |
| Authenticated; walkthrough draft present | `/complete-profile` |
| Authenticated; setup `started` | `/walkthrough` |
| Authenticated; walkthrough seen locally but no draft | `/walkthrough` |
| Authenticated; no setup signals | `/feed` |

Authentication defaults are mode-specific:

- Signup: `/walkthrough`
- Login: `/feed`

The 100-Sparks page defaults to `/feed` after a successful save.

## Follow-up required before the activation project is complete

The currently released walkthrough is still served by the static rewrite. A separate pull request must:

- port the released walkthrough profile-draft behavior into the Next.js walkthrough;
- persist an account-backed `started` state when a new account enters the walkthrough;
- redirect completed accounts away from a directly opened `/walkthrough` URL;
- remove the `/walkthrough` static rewrite only after rendered desktop/mobile parity and draft-resume tests pass;
- update remaining legacy server-action fallback copy and remove `/onboarding` only after no active flow depends on it.

This phase intentionally does not alter trade safety, evidence, baseline, payment, or agreement semantics.
