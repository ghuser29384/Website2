# Common Ground Pool

## Product name

**Common Ground Pool** is the participant-facing name for a moral-public-goods trade in which people with different priority budgets redirect part of those budgets to one shared project.

The existing **Common Ground Budget** remains the individual participant's bounded budget and conditional project-allocation object. A Common Ground Pool is the multi-participant proposal those budgets may jointly support.

## Public route

- Route: `/mpgf/common-ground-pool`
- Surface: public interactive proposal builder
- Runtime behavior: browser-local calculation only
- Persistence: none
- Payment capture: disabled
- Binding commitments: none

The Public Goods Fund hub links to this route as its primary proposal-building entry point. The page links back to the current round's Common Ground Budget builder for participant-level setup.

## Worked example

The default fixture reproduces the two-participant example:

- an animal-welfare funder controls a $10,000 default budget;
- a long-term-future funder controls a $10,000 default budget;
- each privately values a dollar to the shared project at 60% of a dollar to their own default;
- the shared project requires $10,000;
- the balanced split recommends $5,000 from each participant;
- each retains $5,000 for their own default;
- each privately values the shared project at $6,000;
- each therefore receives $11,000 of equivalent value, a $1,000 gain relative to acting alone.

## Calculation

For participant `i`:

- `v_i` is the private value of one dollar to the shared project relative to one dollar to the participant's default;
- `s_i` is the participant's share of the shared project's total cost;
- the participant's gain relative to the default is `(v_i - s_i) * target`.

A positive-sum pool is possible only when:

- all contributions sum exactly to the shared target;
- no contribution exceeds the participant's controlled budget;
- every participant has `s_i < v_i`;
- the combined private value shares exceed 100% of the shared cost.

The balanced suggestion solves `sum(max(0, v_i - lambda)) = 1`. This equalizes the surplus margin `v_i - s_i` among participants with positive cost shares where possible. Integer-cent contributions use largest-remainder allocation so the result always sums exactly to the target.

The user can instead enter a manual split. Manual splits pass through the same target, budget, and participant-gain checks.

## Privacy and copied terms

Private value estimates:

- remain in React state in the current browser tab;
- are not sent to a server;
- are not persisted;
- are omitted from copied proposal terms.

Copied terms include only the shared project, target, participant contribution, retained default amount, unanimous frozen-term condition, and the no-capture boundary.

## Counterfactual and safety boundaries

The calculation does not establish that a proposal is safe, additional, or eligible. A later binding workflow must separately reject:

- manufactured or inflated no-pool defaults;
- threats, coercion, harmful leverage, or withholding safety actions;
- projects without reviewed recipients, lawful scope, or adequate evidence;
- proposals with disqualifying effects on non-participants;
- unsupported claims of representative authority;
- stale, incomplete, or non-unanimous terms;
- incomplete payment, authorization, custody, or settlement readiness.

## Files

- `src/lib/mpgf/common-ground-pool.ts`: calculation, validation, terms export, and public constants.
- `src/lib/mpgf/common-ground-pool.test.ts`: exact worked-example, split, privacy, route, and responsive-source regressions.
- `src/app/mpgf/common-ground-pool/page.tsx`: public page and explanatory boundaries.
- `src/app/mpgf/common-ground-pool/common-ground-pool-builder.tsx`: interactive local proposal editor.
- `src/app/mpgf/common-ground-pool/common-ground-pool.module.css`: route-local responsive design system.

## Release posture

This implementation is intentionally no-capture. It must not be described as creating a pledge, donation, authorization, hold, escrow, custody event, or binding agreement. A future server-backed pilot requires a separately reviewed schema, exact frozen-term confirmations, participant authority checks, project review, adversarial browser testing, and payment-provider gates.
